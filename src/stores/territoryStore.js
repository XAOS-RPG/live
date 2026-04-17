import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useFactionStore } from './factionStore'

const CITY_IDS = ['athens', 'thessaloniki', 'patras', 'heraklion', 'mykonos', 'santorini', 'corfu']
const SIEGE_DURATION_MS = 30 * 60 * 1000     // 30 minutes
const SIEGE_COOLDOWN_MS = 48 * 60 * 60 * 1000 // 48 hours between sieges
const TAX_RATE = 0.02

function makeEmptyTerritory() {
  return Object.fromEntries(
    CITY_IDS.map(id => [id, { factionId: '', capturedAt: 0, siegeEndsAt: null, siegeAttackerFaction: null }])
  )
}

export const useTerritoryStore = defineStore('territory', {
  state: () => ({
    territories: makeEmptyTerritory(),
    myParticipation: {},   // { cityId: 'attacker' | 'defender' | null }
    pendingTaxDeposit: 0,
    lastFetched: 0,
    _channel: null,        // realtime channel handle (not serialized)
  }),

  getters: {
    controlledByMyFaction: (state) => (cityId) => {
      const faction = useFactionStore()
      return !!(faction.currentFaction && state.territories[cityId]?.factionId === faction.currentFaction)
    },

    controlledByAnyFaction: (state) => (cityId) => {
      return !!(state.territories[cityId]?.factionId)
    },

    controllingFaction: (state) => (cityId) => {
      return state.territories[cityId]?.factionId || null
    },

    siegeActive: (state) => (cityId) => {
      const t = state.territories[cityId]
      return !!(t?.siegeEndsAt && t.siegeEndsAt > Date.now())
    },

    siegeTimeRemaining: (state) => (cityId) => {
      const t = state.territories[cityId]
      if (!t?.siegeEndsAt) return 0
      return Math.max(0, t.siegeEndsAt - Date.now())
    },

    siegeCooldownRemaining: (state) => (cityId) => {
      const t = state.territories[cityId]
      if (!t?.capturedAt) return 0
      return Math.max(0, t.capturedAt + SIEGE_COOLDOWN_MS - Date.now())
    },

    taxRateForCity: (state) => (cityId) => {
      return state.territories[cityId]?.factionId ? TAX_RATE : 0
    },

    canInitiateSiege: (state) => (cityId) => {
      const faction = useFactionStore()
      const t = state.territories[cityId]
      if (!faction.currentFaction) return false
      if (!['officer', 'leader'].includes(faction.rank)) return false
      if (t?.factionId === faction.currentFaction) return false // already own it
      if (t?.siegeEndsAt && t.siegeEndsAt > Date.now()) return false // siege in progress
      if (t?.capturedAt && t.capturedAt + SIEGE_COOLDOWN_MS > Date.now()) return false
      return true
    },
  },

  actions: {
    async fetchTerritories() {
      try {
        const { data, error } = await supabase
          .from('territory_control')
          .select('*')
        if (error) throw error
        for (const row of data) {
          if (CITY_IDS.includes(row.city_id)) {
            this.territories[row.city_id] = {
              factionId: row.faction_id || '',
              capturedAt: row.captured_at || 0,
              siegeEndsAt: row.siege_ends_at || null,
              siegeAttackerFaction: row.siege_attacker_faction || null,
            }
          }
        }
        this.lastFetched = Date.now()
      } catch (e) {
        console.error('Territory fetch failed:', e)
      }
    },

    subscribeRealtime() {
      if (this._channel) {
        supabase.removeChannel(this._channel)
        this._channel = null
      }

      this._channel = supabase
        .channel('territory_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'territory_control' },
          (payload) => {
            const row = payload.new || payload.old
            if (!row || !CITY_IDS.includes(row.city_id)) return

            const prev = this.territories[row.city_id]
            const newFactionId = row.faction_id || ''

            this.territories[row.city_id] = {
              factionId: newFactionId,
              capturedAt: row.captured_at || 0,
              siegeEndsAt: row.siege_ends_at || null,
              siegeAttackerFaction: row.siege_attacker_faction || null,
            }

            const gameStore = useGameStore()
            const factionStore = useFactionStore()

            // Notify on faction change
            if (prev.factionId !== newFactionId) {
              if (newFactionId && newFactionId === factionStore.currentFaction) {
                gameStore.addNotification(`🏆 Η φατρία σου κατέλαβε πόλη!`, 'success')
              } else if (prev.factionId === factionStore.currentFaction) {
                gameStore.addNotification(`⚔️ Χάσατε μια πόλη!`, 'danger')
              }
            }
          }
        )
        .subscribe()
    },

    unsubscribeRealtime() {
      if (this._channel) {
        supabase.removeChannel(this._channel)
        this._channel = null
      }
    },

    async initiateSiege(cityId) {
      const player = usePlayerStore()
      const factionStore = useFactionStore()
      const gameStore = useGameStore()

      if (!this.canInitiateSiege(cityId)) {
        gameStore.addNotification('Δεν μπορείς να ξεκινήσεις πολιορκία τώρα.', 'danger')
        return false
      }

      const siegeEndsAt = Date.now() + SIEGE_DURATION_MS

      try {
        const { error: updateError } = await supabase
          .from('territory_control')
          .update({
            siege_ends_at: siegeEndsAt,
            siege_attacker_faction: factionStore.currentFaction,
            updated_at: new Date().toISOString(),
          })
          .eq('city_id', cityId)

        if (updateError) throw updateError

        await supabase.from('siege_participants').insert({
          siege_city_id: cityId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          faction_id: factionStore.currentFaction,
          side: 'attacker',
          str_contribution: player.stats.strength,
          def_contribution: player.stats.defense,
          joined_at: Date.now(),
        })

        this.myParticipation[cityId] = 'attacker'
        this.territories[cityId].siegeEndsAt = siegeEndsAt
        this.territories[cityId].siegeAttackerFaction = factionStore.currentFaction

        gameStore.addNotification('⚔️ Πολιορκία ξεκίνησε! 30 λεπτά για τη νίκη.', 'warning')
        player.logActivity(`⚔️ Ξεκίνησε Πολιορκία σε ${cityId}`, 'warning')
        gameStore.saveGame()
        return true
      } catch (e) {
        console.error('Initiate siege failed:', e)
        gameStore.addNotification('Σφάλμα κατά την εκκίνηση πολιορκίας.', 'danger')
        return false
      }
    },

    async joinSiege(cityId, side) {
      const player = usePlayerStore()
      const factionStore = useFactionStore()
      const gameStore = useGameStore()

      const territory = this.territories[cityId]
      if (!territory?.siegeEndsAt || territory.siegeEndsAt <= Date.now()) {
        gameStore.addNotification('Δεν υπάρχει ενεργή πολιορκία.', 'danger')
        return false
      }

      const myFactionId = factionStore.currentFaction
      if (side === 'attacker' && territory.siegeAttackerFaction !== myFactionId) {
        gameStore.addNotification('Δεν είσαι στην επιτιθέμενη φατρία.', 'danger')
        return false
      }
      if (side === 'defender' && territory.factionId !== myFactionId) {
        gameStore.addNotification('Δεν ελέγχεις αυτή την πόλη.', 'danger')
        return false
      }

      try {
        await supabase.from('siege_participants').insert({
          siege_city_id: cityId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          faction_id: myFactionId,
          side,
          str_contribution: player.stats.strength,
          def_contribution: player.stats.defense,
          joined_at: Date.now(),
        })

        this.myParticipation[cityId] = side
        const label = side === 'attacker' ? 'Επιτιθέμενος' : 'Αμυνόμενος'
        gameStore.addNotification(`✅ Μπήκες στην πολιορκία ως ${label}.`, 'success')
        return true
      } catch (e) {
        console.error('Join siege failed:', e)
        return false
      }
    },

    async resolveSiege(cityId) {
      const gameStore = useGameStore()
      const territory = this.territories[cityId]
      if (!territory?.siegeEndsAt || territory.siegeEndsAt > Date.now()) return

      try {
        const { data: participants, error } = await supabase
          .from('siege_participants')
          .select('*')
          .eq('siege_city_id', cityId)

        if (error) throw error

        let attackerPower = 0
        let defenderPower = 0
        for (const p of participants) {
          if (p.side === 'attacker') attackerPower += p.str_contribution + p.def_contribution
          else defenderPower += p.str_contribution + p.def_contribution
        }

        const attackerWins = attackerPower > defenderPower
        const newFactionId = attackerWins
          ? (territory.siegeAttackerFaction || '')
          : (territory.factionId || '')

        await supabase
          .from('territory_control')
          .update({
            faction_id: newFactionId,
            captured_at: Date.now(),
            siege_ends_at: null,
            siege_attacker_faction: null,
            updated_at: new Date().toISOString(),
          })
          .eq('city_id', cityId)

        // Clean up participants
        await supabase.from('siege_participants').delete().eq('siege_city_id', cityId)

        this.territories[cityId] = {
          factionId: newFactionId,
          capturedAt: Date.now(),
          siegeEndsAt: null,
          siegeAttackerFaction: null,
        }

        delete this.myParticipation[cityId]

        const factionStore = useFactionStore()
        if (newFactionId === factionStore.currentFaction) {
          gameStore.addNotification(`🏆 Η φατρία σου κέρδισε την πολιορκία!`, 'success')
        }
      } catch (e) {
        console.error('Resolve siege failed:', e)
      }
    },

    /**
     * Calculate the 2% territory tax on a purchase/travel in a city.
     * Deposits the tax into the controlling faction's vault.
     * Returns the tax amount.
     */
    calculateTaxOnPurchase(cityId, amount) {
      const territory = this.territories[cityId]
      if (!territory?.factionId) return 0

      const tax = Math.floor(amount * TAX_RATE)
      if (tax <= 0) return 0

      const factionStore = useFactionStore()
      if (territory.factionId === factionStore.currentFaction) {
        // Tax goes to our faction vault
        factionStore.vault += tax
        this.pendingTaxDeposit += tax
      }

      return tax
    },

    checkActiveSieges() {
      for (const cityId of CITY_IDS) {
        const t = this.territories[cityId]
        if (t?.siegeEndsAt && t.siegeEndsAt <= Date.now()) {
          this.resolveSiege(cityId)
        }
      }
    },

    getSerializable() {
      return {
        myParticipation: { ...this.myParticipation },
        pendingTaxDeposit: this.pendingTaxDeposit,
        lastFetched: this.lastFetched,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.myParticipation) Object.assign(this.myParticipation, data.myParticipation)
      if (data.pendingTaxDeposit !== undefined) this.pendingTaxDeposit = data.pendingTaxDeposit
      if (data.lastFetched !== undefined) this.lastFetched = data.lastFetched
    },
  },
})
