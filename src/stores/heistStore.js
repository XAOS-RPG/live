import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { HEIST_TARGETS, HEIST_ROLES, getHeistTargetById } from '../data/heists'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useEliteStore } from './eliteStore'
import { useInventoryStore } from './inventoryStore'

export const useHeistStore = defineStore('heist', {
  state: () => ({
    activeLobbyId: null,
    myRole: null,
    lobby: null,       // { id, targetId, status, leaderId, members: [] }
    publicLobbies: [], // waiting lobbies for browse
    heistHistory: [],  // [{ targetId, outcome, payoutDirty, payoutKevlar, completedAt }]
    heistCooldowns: {}, // { targetId: lastCompletedAt }
    _channel: null,    // not serialized
  }),

  getters: {
    isInLobby: (state) => !!state.activeLobbyId,

    lobbyFull: (state) => {
      if (!state.lobby?.members) return false
      const roles = state.lobby.members.map(m => m.role)
      return HEIST_ROLES.every(r => roles.includes(r.id))
    },

    takenRoles: (state) => {
      return (state.lobby?.members || []).map(m => m.role)
    },

    canJoinHeist: (state) => (targetId) => {
      if (state.activeLobbyId) return false
      const target = getHeistTargetById(targetId)
      if (!target) return false
      const player = usePlayerStore()
      if (player.level < target.requiredLevel) return false
      const lastDone = state.heistCooldowns[targetId]
      if (lastDone && Date.now() - lastDone < target.cooldownMs) return false
      return true
    },

    cooldownRemaining: (state) => (targetId) => {
      const target = getHeistTargetById(targetId)
      const last = state.heistCooldowns[targetId]
      if (!target || !last) return 0
      return Math.max(0, last + target.cooldownMs - Date.now())
    },

    isLeader: (state) => {
      if (!state.lobby) return false
      const player = usePlayerStore()
      const { useAuthStore } = require('./authStore')
      return state.lobby.leaderId === useAuthStore().user?.id
    },
  },

  actions: {
    async fetchPublicLobbies() {
      try {
        const { data, error } = await supabase
          .from('heist_lobbies')
          .select('*, heist_members(*)')
          .eq('status', 'waiting')
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        this.publicLobbies = (data || []).map(row => ({
          id: row.id,
          targetId: row.target_id,
          status: row.status,
          leaderId: row.leader_id,
          members: (row.heist_members || []).map(m => ({
            userId: m.user_id,
            username: m.username,
            role: m.role,
            roll: m.roll,
          })),
        }))
      } catch (e) {
        console.error('Fetch lobbies failed:', e)
      }
    },

    async createLobby(targetId, role) {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (!this.canJoinHeist(targetId)) {
        const target = getHeistTargetById(targetId)
        if (player.level < (target?.requiredLevel ?? 0)) {
          gameStore.addNotification(`Χρειάζεσαι Επίπεδο ${target?.requiredLevel} για αυτή τη ληστεία!`, 'danger')
        } else {
          gameStore.addNotification('Είσαι σε cooldown ή ήδη σε lobby.', 'danger')
        }
        return false
      }

      const { useAuthStore } = require('./authStore')
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) return false

      const target = getHeistTargetById(targetId)
      const now = Date.now()

      try {
        const { data: lobbyRow, error: lobbyError } = await supabase
          .from('heist_lobbies')
          .insert({
            target_id: targetId,
            status: 'waiting',
            leader_id: userId,
            created_at: now,
          })
          .select()
          .single()

        if (lobbyError) throw lobbyError

        await supabase.from('heist_members').insert({
          lobby_id: lobbyRow.id,
          user_id: userId,
          username: player.name,
          role,
          joined_at: now,
        })

        this.activeLobbyId = lobbyRow.id
        this.myRole = role
        this.lobby = {
          id: lobbyRow.id,
          targetId,
          status: 'waiting',
          leaderId: userId,
          members: [{ userId, username: player.name, role, roll: null }],
        }

        this._subscribeLobby(lobbyRow.id)
        gameStore.addNotification(`🔫 Lobby δημιουργήθηκε για ${target?.name}!`, 'success')
        player.logActivity(`🔫 Δημιούργησε lobby ριφιφί: ${target?.name}`, 'info')
        return true
      } catch (e) {
        console.error('Create lobby failed:', e)
        gameStore.addNotification('Σφάλμα στη δημιουργία lobby.', 'danger')
        return false
      }
    },

    async joinLobby(lobbyId, role) {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (this.activeLobbyId) {
        gameStore.addNotification('Είσαι ήδη σε lobby!', 'danger')
        return false
      }
      if (this.takenRoles.includes(role)) {
        gameStore.addNotification('Αυτός ο ρόλος είναι ήδη κατειλημμένος!', 'danger')
        return false
      }

      const { useAuthStore } = require('./authStore')
      const userId = useAuthStore().user?.id
      if (!userId) return false

      try {
        const { data: lobbyRow, error: fetchError } = await supabase
          .from('heist_lobbies')
          .select('*, heist_members(*)')
          .eq('id', lobbyId)
          .single()

        if (fetchError) throw fetchError
        if (lobbyRow.status !== 'waiting') {
          gameStore.addNotification('Το lobby δεν δέχεται πλέον μέλη.', 'danger')
          return false
        }

        await supabase.from('heist_members').insert({
          lobby_id: lobbyId,
          user_id: userId,
          username: player.name,
          role,
          joined_at: Date.now(),
        })

        this.activeLobbyId = lobbyId
        this.myRole = role
        this.lobby = {
          id: lobbyRow.id,
          targetId: lobbyRow.target_id,
          status: lobbyRow.status,
          leaderId: lobbyRow.leader_id,
          members: [
            ...(lobbyRow.heist_members || []).map(m => ({
              userId: m.user_id, username: m.username, role: m.role, roll: m.roll,
            })),
            { userId, username: player.name, role, roll: null },
          ],
        }

        this._subscribeLobby(lobbyId)
        gameStore.addNotification('✅ Μπήκες στο lobby!', 'success')
        return true
      } catch (e) {
        console.error('Join lobby failed:', e)
        return false
      }
    },

    async leaveLobby() {
      if (!this.activeLobbyId) return

      const { useAuthStore } = require('./authStore')
      const userId = useAuthStore().user?.id

      try {
        await supabase
          .from('heist_members')
          .delete()
          .eq('lobby_id', this.activeLobbyId)
          .eq('user_id', userId)

        // If leader and others remain, delete entire lobby (simplest approach)
        if (this.lobby?.leaderId === userId) {
          await supabase.from('heist_lobbies').delete().eq('id', this.activeLobbyId)
        }

        this._unsubscribeLobby()
        this.activeLobbyId = null
        this.myRole = null
        this.lobby = null
        useGameStore().addNotification('Αποχώρησες από το lobby.', 'info')
      } catch (e) {
        console.error('Leave lobby failed:', e)
      }
    },

    async startHeist() {
      if (!this.isLeader || !this.lobbyFull) return false

      try {
        await supabase
          .from('heist_lobbies')
          .update({ status: 'active', starts_at: Date.now() })
          .eq('id', this.activeLobbyId)

        return true
      } catch (e) {
        console.error('Start heist failed:', e)
        return false
      }
    },

    async submitRoll() {
      if (!this.activeLobbyId || !this.myRole) return

      const { useAuthStore } = require('./authStore')
      const userId = useAuthStore().user?.id
      const roll = Math.floor(Math.random() * 6) + 1

      try {
        await supabase
          .from('heist_members')
          .update({ roll })
          .eq('lobby_id', this.activeLobbyId)
          .eq('user_id', userId)

        // Update local state
        if (this.lobby) {
          const member = this.lobby.members.find(m => m.userId === userId)
          if (member) member.roll = roll
        }

        // If leader and all rolls are in, resolve
        if (this.isLeader) {
          const allRolled = this.lobby?.members.every(m => m.roll !== null && m.roll !== undefined)
          if (allRolled) await this._resolveHeist()
        }
      } catch (e) {
        console.error('Submit roll failed:', e)
      }
    },

    async _resolveHeist() {
      if (!this.activeLobbyId || !this.lobby) return

      const target = getHeistTargetById(this.lobby.targetId)
      if (!target) return

      const totalRoll = (this.lobby.members || []).reduce((sum, m) => sum + (m.roll || 0), 0)
      const success = totalRoll >= target.minTotalRoll

      let payoutDirty = 0
      let payoutKevlar = 0

      if (success) {
        payoutDirty = Math.floor(
          target.payoutDirtyMin + Math.random() * (target.payoutDirtyMax - target.payoutDirtyMin)
        )
        payoutKevlar = target.payoutKevlar
      }

      try {
        await supabase
          .from('heist_lobbies')
          .update({
            status: success ? 'completed' : 'failed',
            completed_at: Date.now(),
            total_roll: totalRoll,
            payout_dirty: payoutDirty,
            payout_kevlar: payoutKevlar,
          })
          .eq('id', this.activeLobbyId)
      } catch (e) {
        console.error('Resolve heist failed:', e)
      }
    },

    _applyHeistRewards(lobby) {
      const target = getHeistTargetById(lobby.targetId)
      const gameStore = useGameStore()
      const player = usePlayerStore()

      if (lobby.status === 'completed' && lobby.payout_dirty > 0) {
        const myShare = Math.floor(lobby.payout_dirty / 3)
        useEliteStore().addDirtyMoney(myShare)

        const invStore = useInventoryStore()
        for (let i = 0; i < (lobby.payout_kevlar || 0); i++) {
          invStore.addItem('mat_kevlar', 1)
        }

        this.heistHistory.unshift({
          targetId: lobby.target_id,
          outcome: 'success',
          payoutDirty: myShare,
          payoutKevlar: lobby.payout_kevlar || 0,
          totalRoll: lobby.total_roll,
          completedAt: Date.now(),
        })
        this.heistCooldowns[lobby.target_id] = Date.now()

        gameStore.addNotification(
          `🎉 Ριφιφί επιτυχές! +€${myShare} βρώμικα, +${lobby.payout_kevlar} Κέβλαρ!`,
          'cash'
        )
        player.logActivity(
          `🏦 Ριφιφί: ${target?.name} — +€${myShare} βρώμικα, +${lobby.payout_kevlar} Κέβλαρ`,
          'cash'
        )
      } else {
        this.heistHistory.unshift({
          targetId: lobby.target_id,
          outcome: 'failure',
          payoutDirty: 0,
          payoutKevlar: 0,
          totalRoll: lobby.total_roll,
          completedAt: Date.now(),
        })
        this.heistCooldowns[lobby.target_id] = Date.now()

        gameStore.addNotification(
          `💀 Ριφιφί απέτυχε! Ζάρια: ${lobby.total_roll}/18 — χρειαζόσαστε ${target?.minTotalRoll}+`,
          'danger'
        )
        player.logActivity(`🏦 Ριφιφί: ${target?.name} — ΑΠΟΤΥΧΙΑ (${lobby.total_roll})`, 'danger')
      }

      gameStore.saveGame()
    },

    _subscribeLobby(lobbyId) {
      if (this._channel) {
        supabase.removeChannel(this._channel)
        this._channel = null
      }

      this._channel = supabase
        .channel(`heist_${lobbyId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'heist_members', filter: `lobby_id=eq.${lobbyId}` },
          (payload) => {
            if (!this.lobby) return
            const row = payload.new
            if (!row) return

            const member = this.lobby.members.find(m => m.userId === row.user_id)
            if (member) {
              member.role = row.role
              member.roll = row.roll
            } else if (payload.eventType === 'INSERT') {
              this.lobby.members.push({
                userId: row.user_id,
                username: row.username,
                role: row.role,
                roll: row.roll,
              })
            }

            // Auto-resolve: all rolls submitted + not leader (leader already resolved)
            if (!this.isLeader && this.lobby.status === 'active') {
              const allRolled = this.lobby.members.every(m => m.roll !== null && m.roll !== undefined)
              if (allRolled) {
                // Fetch final lobby state to apply rewards
                supabase
                  .from('heist_lobbies')
                  .select('*')
                  .eq('id', lobbyId)
                  .single()
                  .then(({ data }) => {
                    if (data && (data.status === 'completed' || data.status === 'failed')) {
                      this._applyHeistRewards(data)
                      this._cleanupAfterHeist()
                    }
                  })
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'heist_lobbies', filter: `id=eq.${lobbyId}` },
          (payload) => {
            const row = payload.new
            if (!row || !this.lobby) return

            const prevStatus = this.lobby.status
            this.lobby.status = row.status

            if (row.status === 'active' && prevStatus === 'waiting') {
              useGameStore().addNotification('🎲 Ριφιφί ξεκίνησε! Ρίξε τα ζάρια!', 'warning')
              // Auto-submit roll
              this.submitRoll()
            }

            if ((row.status === 'completed' || row.status === 'failed') && prevStatus === 'active') {
              this._applyHeistRewards(row)
              this._cleanupAfterHeist()
            }
          }
        )
        .subscribe()
    },

    _unsubscribeLobby() {
      if (this._channel) {
        supabase.removeChannel(this._channel)
        this._channel = null
      }
    },

    _cleanupAfterHeist() {
      this._unsubscribeLobby()
      this.activeLobbyId = null
      this.myRole = null
      this.lobby = null
    },

    getSerializable() {
      return {
        heistHistory: this.heistHistory.slice(0, 50),
        heistCooldowns: { ...this.heistCooldowns },
      }
    },

    hydrate(data) {
      if (!data) return
      if (Array.isArray(data.heistHistory)) this.heistHistory = data.heistHistory
      if (data.heistCooldowns) Object.assign(this.heistCooldowns, data.heistCooldowns)
    },
  },
})
