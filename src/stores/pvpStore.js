import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { usePlayerStore } from './playerStore'
import { useAuthStore } from './authStore'
import { calculateCombatDamage, calculateHitChance } from '../engine/formulas'

const CASH_STEAL_FRACTION = 0.03
const MAX_TURNS = 30

/** Simulate a full fight between attacker and defender stats, returns { won, turns } */
function simulateFight(atkStats, atkHP, defStats, defHP) {
  let pHP = atkHP
  let nHP = defHP
  let turns = 0

  while (pHP > 0 && nHP > 0 && turns < MAX_TURNS) {
    turns++
    // Player attacks
    if (Math.random() < calculateHitChance(atkStats, defStats, null)) {
      nHP -= Math.max(1, Math.floor(calculateCombatDamage(atkStats, defStats, null)))
    }
    if (nHP <= 0) break
    // Defender attacks back
    if (Math.random() < calculateHitChance(defStats, atkStats, null)) {
      pHP -= Math.max(1, Math.floor(calculateCombatDamage(defStats, atkStats, null)))
    }
  }

  return { won: pHP > 0, playerHPRemaining: Math.max(0, pHP) }
}

export const usePvpStore = defineStore('pvp', {
  state: () => ({
    targets: [],       // real players fetched from Supabase
    loading: false,
    lastFetch: 0,
    attackLogs: [],    // recent attacks on/by this player
  }),

  actions: {
    /** Fetch real players near the current player's level */
    async fetchTargets() {
      const player = usePlayerStore()
      const auth = useAuthStore()
      if (!auth.user) return

      this.loading = true
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, save_data')
          .neq('id', auth.user.id)
          .not('save_data', 'is', null)
          .limit(50)

        if (error) throw error

        const levelMin = Math.max(1, player.level - 8)
        const levelMax = player.level + 8

        this.targets = (data || [])
          .map(p => this._mapProfile(p))
          .filter(p => p.level >= levelMin && p.level <= levelMax)
          .slice(0, 20)

        this.lastFetch = Date.now()
      } catch (e) {
        console.error('PVP fetch error:', e)
      } finally {
        this.loading = false
      }
    },

    /** Map a Supabase profile row to a combat-ready target object */
    _mapProfile(profile) {
      const sd = profile.save_data ?? {}
      // save_data stores everything under stores.player
      const p = sd.stores?.player ?? sd
      const level = p.level ?? 1
      const hp = p.resources?.hp?.current ?? 100
      const hpMax = p.resources?.hp?.max ?? 100
      const stats = p.stats ?? { strength: 5, speed: 5, dexterity: 5, defense: 5 }
      const status = p.status ?? 'free'
      const timerEnd = p.statusTimerEnd ?? null
      const isActuallyFree = status === 'free' || (timerEnd && Date.now() > new Date(timerEnd).getTime())
      return {
        id: profile.id,
        nickname: profile.username || 'Άγνωστος',
        level,
        stats,
        hp: Math.max(1, hp),
        hpMax,
        status,
        available: isActuallyFree,
        energyCost: 25,
        rewards: {
          cashMin: 0,
          cashMax: 0,
          xp: Math.floor(10 * level * 0.8),
        },
        isReal: true,
        icon: '👤',
        location: '—',
        lastSeen: 'online',
      }
    },

    /** Execute a PVP attack against a real player */
    async attack(targetId) {
      const player = usePlayerStore()
      const auth = useAuthStore()
      if (!auth.user) return null

      const target = this.targets.find(t => t.id === targetId)
      if (!target) return null

      // Re-fetch target's current cash (to calculate steal amount)
      const { data: fresh } = await supabase
        .from('profiles')
        .select('save_data')
        .eq('id', targetId)
        .single()

      const freshSd = fresh?.save_data ?? {}
      const freshP = freshSd.stores?.player ?? freshSd
      const freshStatus = freshP.status ?? 'free'
      const freshTimerEnd = freshP.statusTimerEnd ?? null
      const isFree = freshStatus === 'free' || (freshTimerEnd && Date.now() > new Date(freshTimerEnd).getTime())

      if (!fresh || !isFree) {
        return { aborted: true, reason: 'Ο παίκτης δεν είναι διαθέσιμος αυτή τη στιγμή.' }
      }

      // Check PvP immunity from Τηλέφωνο από Ψηλά
      const targetImmunityEnd = freshP.pvpImmunityEndsAt ?? null
      if (targetImmunityEnd && targetImmunityEnd > Date.now()) {
        return { aborted: true, reason: 'Ο παίκτης έχει Ασυλία από Τηλέφωνο από Ψηλά!' }
      }

      const defStats = freshP.stats ?? target.stats
      const defHP = freshP.resources?.hp?.current ?? target.hp
      const defCash = freshP.cash ?? 0

      const result = simulateFight(
        player.stats,
        player.resources.hp.current,
        defStats,
        defHP
      )

      const cashStolen = result.won ? Math.floor(defCash * CASH_STEAL_FRACTION) : 0
      const xpReward = result.won ? target.rewards.xp : Math.floor(target.rewards.xp * 0.2)

      // Write result to Supabase (deduct cash from defender + insert log)
      const { error } = await supabase.rpc('pvp_apply_result', {
        p_attacker_id: auth.user.id,
        p_defender_id: targetId,
        p_cash_stolen: cashStolen,
        p_attacker_won: result.won,
      })

      if (error) console.error('pvp_apply_result error:', error)

      return {
        won: result.won,
        playerHPRemaining: result.playerHPRemaining,
        cashReward: cashStolen,
        xpReward,
        opponentName: target.nickname,
        opponentId: targetId,
        isPvp: true,
      }
    },

    /** Fetch recent attack logs for the current player */
    async fetchAttackLogs() {
      const auth = useAuthStore()
      if (!auth.user) return

      const { data, error } = await supabase
        .from('attack_logs')
        .select(`
          id, result, cash_stolen, created_at,
          attacker:attacker_id ( username ),
          defender:defender_id ( username )
        `)
        .or(`attacker_id.eq.${auth.user.id},defender_id.eq.${auth.user.id}`)
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error) this.attackLogs = data || []
    },
  },
})
