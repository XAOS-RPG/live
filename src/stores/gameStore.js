import { defineStore } from 'pinia'
import { SAVE_KEY, AUTO_SAVE_INTERVAL_MS, MAX_OFFLINE_MS, CLOUD_SAVE_DEBOUNCE_MS } from '../data/constants'
import { supabase } from '../lib/supabaseClient'
import { usePlayerStore } from './playerStore'
import { useAuthStore } from './authStore'
import { useCrimeStore } from './crimeStore'
import { useInventoryStore } from './inventoryStore'
import { useCombatStore } from './combatStore'
import { useJobStore } from './jobStore'
import { usePropertyStore } from './propertyStore'
import { useTravelStore } from './travelStore'
import { useEducationStore } from './educationStore'
import { useCasinoStore } from './casinoStore'
import { useStockStore } from './stockStore'
import { useDailyRewardStore } from './dailyRewardStore'
import { useAchievementStore } from './achievementStore'
import { useMissionStore } from './missionStore'
import { useFactionStore } from './factionStore'
import { useBazaarStore } from './bazaarStore'
import { useCompanyStore } from './companyStore'
import { useBountyStore } from './bountyStore'
import { useRacingStore } from './racingStore'
import { useEventsHubStore } from './eventsHubStore'
import { useWeeklyEventStore } from './weeklyEventStore'
import { useSmugglingStore } from './smugglingStore'
import { usePetStore } from './petStore'
import { useCraftingStore } from './craftingStore'
import { useLoanStore } from './loanStore'
import { usePrestigeStore } from './prestigeStore'
import { useEliteStore } from './eliteStore'
import { useCardStore } from './cardStore'
import { useAuctionStore } from './auctionStore'
import { useDealerStore } from './dealerStore'
import { useClassStore } from './classStore'
import { useBossStore } from './bossStore'
import { useVolunteerStore } from './volunteerStore'
import { useEncounterStore } from './encounterStore'
import { useTerritoryStore } from './territoryStore'
import { useHeistStore } from './heistStore'
import { useNeighborhoodStore } from './neighborhoodStore'

let toastId = 0
let _saveTimer = null

export const useGameStore = defineStore('game', {
  state: () => ({
    initialized: false,
    gameVersion: '0.1.0',
    notifications: [],
    lastSaveTimestamp: null,
    gameLoopId: null,
    saving: false,
  }),

  getters: {},

  actions: {
    init() {
      // Cloud-only: nothing to do here.
      // Auth flow (authStore.loadPlayerProfile) handles loading for authenticated users.
      // Unauthenticated users are redirected to /auth by the router.
    },

    setInitialized(skipSave = false) {
      this.initialized = true
      const stockStore = useStockStore()
      stockStore.initializePrices()
      useDailyRewardStore().checkDaily()
      const missionStore = useMissionStore()
      missionStore.refreshMissions()
      missionStore.startNextStoryMission()
      useCraftingStore().initDefaults()
      if (!skipSave) this.saveGame({ immediate: true })
    },

    /**
     * Schedule a cloud save. Debounced by CLOUD_SAVE_DEBOUNCE_MS.
     * Pass { immediate: true } (or legacy { awaitCloud: true }) for critical operations
     * (travel, purchases) that must be persisted before continuing.
     */
    saveGame({ immediate = false, awaitCloud = false } = {}) {
      const doImmediate = immediate || awaitCloud
      if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null }
      if (doImmediate) return this._flushSave()
      // Debounced: collapse rapid successive calls into one write
      return new Promise(resolve => {
        _saveTimer = setTimeout(async () => {
          _saveTimer = null
          resolve(await this._flushSave())
        }, CLOUD_SAVE_DEBOUNCE_MS)
      })
    },

    async _flushSave() {
      const authStore = useAuthStore()
      if (!authStore.user) return false
      if (this.saving) return false
      this.saving = true
      try {
        const saveData = this._buildSaveData()
        const { error } = await supabase
          .from('profiles')
          .update({ save_data: saveData })
          .eq('id', authStore.user.id)
        if (error) throw error
        this.lastSaveTimestamp = saveData.timestamp
        return true
      } catch (e) {
        console.error('Cloud save failed:', e)
        return false
      } finally {
        this.saving = false
      }
    },

    _buildSaveData() {
      const authStore = useAuthStore()
      return {
        version: 1,
        gameVersion: this.gameVersion,
        timestamp: Date.now(),
        userId: authStore.user?.id || null,
        stores: {
          player: usePlayerStore().getSerializable(),
          crime: useCrimeStore().getSerializable(),
          inventory: useInventoryStore().getSerializable(),
          combat: useCombatStore().getSerializable(),
          job: useJobStore().getSerializable(),
          property: usePropertyStore().getSerializable(),
          travel: useTravelStore().getSerializable(),
          education: useEducationStore().getSerializable(),
          casino: useCasinoStore().getSerializable(),
          stock: useStockStore().getSerializable(),
          dailyReward: useDailyRewardStore().getSerializable(),
          achievement: useAchievementStore().getSerializable(),
          mission: useMissionStore().getSerializable(),
          faction: useFactionStore().getSerializable(),
          bazaar: useBazaarStore().getSerializable(),
          company: useCompanyStore().getSerializable(),
          bounty: useBountyStore().getSerializable(),
          racing: useRacingStore().getSerializable(),
          eventsHub: useEventsHubStore().getSerializable(),
          weeklyEvent: useWeeklyEventStore().getSerializable(),
          smuggling: useSmugglingStore().getSerializable(),
          pet: usePetStore().getSerializable(),
          crafting: useCraftingStore().getSerializable(),
          loan: useLoanStore().getSerializable(),
          prestige: usePrestigeStore().getSerializable(),
          elite: useEliteStore().getSerializable(),
          card: useCardStore().getSerializable(),
          auction: useAuctionStore().getSerializable(),
          dealer: useDealerStore().getSerializable(),
          class: useClassStore().getSerializable(),
          boss: useBossStore().getSerializable(),
          volunteer: useVolunteerStore().getSerializable(),
          territory: useTerritoryStore().getSerializable(),
          heist: useHeistStore().getSerializable(),
          neighborhood: useNeighborhoodStore().getSerializable(),
        }
      }
    },

    /**
     * Load game state from Supabase cloud (the single source of truth).
     * Returns true if save data was found and hydrated, false for new accounts.
     */
    async loadGame() {
      const authStore = useAuthStore()
      if (!authStore.user) return false
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('save_data')
          .eq('id', authStore.user.id)
          .single()
        if (error) throw error

        // Clear any legacy localStorage game data
        try { localStorage.removeItem(SAVE_KEY) } catch {}

        const saveData = data?.save_data
        if (!saveData?.stores) return false // new account, no save yet

        this._hydrateStores(saveData.stores)

        // Offline progress
        const elapsed = Math.min(MAX_OFFLINE_MS, Date.now() - (saveData.timestamp || Date.now()))
        if (elapsed > 5000) usePlayerStore().tickRegen(elapsed)

        this.lastSaveTimestamp = saveData.timestamp

        // Daily systems
        useDailyRewardStore().checkDaily()
        useMissionStore().refreshMissions()
        useMissionStore().startNextStoryMission()
        useAchievementStore().checkAchievements()
        useWeeklyEventStore().checkWeeklyRotation()
        useLoanStore().dailyLoanCheck()
        useFactionStore().tickPantopoleio()

        // Territory Wars: fetch current ownership and subscribe to realtime
        useTerritoryStore().fetchTerritories().then(() => {
          useTerritoryStore().subscribeRealtime()
        })

        // Neighborhood Control: fetch and subscribe
        useNeighborhoodStore().fetchNeighborhoods().then(() => {
          useNeighborhoodStore().subscribeRealtime()
        })

        // Heist: re-subscribe if player was in an active lobby
        const heistStore = useHeistStore()
        if (heistStore.activeLobbyId) {
          heistStore._subscribeLobby(heistStore.activeLobbyId)
        }

        return true
      } catch (e) {
        console.error('Cloud load failed:', e)
        return false
      }
    },

    _hydrateStores(s) {
      if (s.player) usePlayerStore().hydrate(s.player)
      if (s.crime) useCrimeStore().hydrate(s.crime)
      if (s.inventory) useInventoryStore().hydrate(s.inventory)
      if (s.combat) useCombatStore().hydrate(s.combat)
      if (s.job) useJobStore().hydrate(s.job)
      if (s.property) usePropertyStore().hydrate(s.property)
      if (s.travel) useTravelStore().hydrate(s.travel)
      if (s.education) useEducationStore().hydrate(s.education)
      if (s.casino) useCasinoStore().hydrate(s.casino)
      const stockStore = useStockStore()
      if (s.stock) stockStore.hydrate(s.stock); else stockStore.initializePrices()
      if (s.dailyReward) useDailyRewardStore().hydrate(s.dailyReward)
      if (s.achievement) useAchievementStore().hydrate(s.achievement)
      if (s.mission) useMissionStore().hydrate(s.mission)
      if (s.faction) useFactionStore().hydrate(s.faction)
      if (s.bazaar) useBazaarStore().hydrate(s.bazaar)
      if (s.company) useCompanyStore().hydrate(s.company)
      if (s.bounty) useBountyStore().hydrate(s.bounty)
      if (s.racing) useRacingStore().hydrate(s.racing)
      if (s.eventsHub) useEventsHubStore().hydrate(s.eventsHub)
      if (s.weeklyEvent) useWeeklyEventStore().hydrate(s.weeklyEvent)
      if (s.smuggling) useSmugglingStore().hydrate(s.smuggling)
      if (s.pet) usePetStore().hydrate(s.pet)
      const craftingStore = useCraftingStore()
      if (s.crafting) craftingStore.hydrate(s.crafting)
      craftingStore.initDefaults()
      if (s.loan) useLoanStore().hydrate(s.loan)
      if (s.prestige) usePrestigeStore().hydrate(s.prestige)
      if (s.elite) useEliteStore().hydrate(s.elite)
      if (s.card) useCardStore().hydrate(s.card)
      if (s.auction) useAuctionStore().hydrate(s.auction)
      if (s.dealer) useDealerStore().hydrate(s.dealer)
      if (s.class) useClassStore().hydrate(s.class)
      if (s.boss) useBossStore().hydrate(s.boss)
      if (s.volunteer) useVolunteerStore().hydrate(s.volunteer)
      if (s.territory) useTerritoryStore().hydrate(s.territory)
      if (s.heist) useHeistStore().hydrate(s.heist)
      if (s.neighborhood) useNeighborhoodStore().hydrate(s.neighborhood)
    },

    async exportSave() {
      await this.saveGame({ immediate: true })
      try {
        const saveData = this._buildSaveData()
        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const date = new Date().toISOString().split('T')[0]
        a.href = url
        a.download = `chaos_save_${date}.json`
        a.click()
        URL.revokeObjectURL(url)
        this.addNotification('Αποθήκευση εξήχθη!', 'success')
      } catch (e) {
        this.addNotification('Σφάλμα κατά την εξαγωγή', 'danger')
      }
    },

    async deleteSave() {
      const authStore = useAuthStore()
      if (authStore.user) {
        await supabase.from('profiles').update({ save_data: null }).eq('id', authStore.user.id)
      }
      this.stopGameLoop()
      this.initialized = false
      usePlayerStore().$reset()
      this.addNotification('Η αποθήκευση διαγράφηκε', 'warning')
    },

    addNotification(message, type = 'info') {
      const id = ++toastId

      // Keep max 2 visible — drop the oldest if needed
      while (this.notifications.length >= 2) {
        this.notifications.shift()
      }

      this.notifications.push({ id, message, type, timestamp: Date.now() })

      // Auto-remove after 4 seconds
      setTimeout(() => {
        this.removeNotification(id)
      }, 4000)
    },

    removeNotification(id) {
      const idx = this.notifications.findIndex(n => n.id === id)
      if (idx !== -1) {
        this.notifications.splice(idx, 1)
      }
    },

    startGameLoop() {
      if (this.gameLoopId) return

      const playerStore = usePlayerStore()
      const stockStore = useStockStore()
      let lastSave = Date.now()

      // Flush pending debounced save when tab goes to background or is closed
      this._onVisHide = () => {
        if (document.hidden && this.initialized) {
          if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null }
          this._flushSave()
        }
      }
      document.addEventListener('visibilitychange', this._onVisHide)

      const tick = () => {
        const now = Date.now()
        const delta = Math.min(60000, now - playerStore.lastTick)

        if (delta > 0) {
          playerStore.tickRegen(delta)
        }

        // Update stock prices
        stockStore.tickPrices()

        // Bazaar RNG sell tick (every 15 min)
        useBazaarStore().tickBazaar()

        // Pet happiness decay / abandonment check
        usePetStore().tickPets()

        // Elite Ascension ticks
        const eliteStore = useEliteStore()
        eliteStore.tickHenchmen(now)
        eliteStore.tickInfluence(delta)

        // Neighborhood passive income (Γλυφάδα, Κηφισιά)
        useNeighborhoodStore().tickIncome(delta)

        // Auction expiry + NPC bidding
        useAuctionStore().tickAuctions(now)

        // Black market dealer spawn cycle
        useDealerStore().tickDealer(now)

        // Periodic cloud save (safety net for regen/tick-only changes)
        if (now - lastSave >= AUTO_SAVE_INTERVAL_MS) {
          this.saveGame()
          lastSave = now
        }

        this.gameLoopId = requestAnimationFrame(tick)
      }

      this.gameLoopId = requestAnimationFrame(tick)
    },

    stopGameLoop() {
      if (this.gameLoopId) {
        cancelAnimationFrame(this.gameLoopId)
        this.gameLoopId = null
      }
      if (this._onVisHide) {
        document.removeEventListener('visibilitychange', this._onVisHide)
        this._onVisHide = null
      }
    },
  }
})
