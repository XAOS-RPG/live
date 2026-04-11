import { defineStore } from 'pinia'
import { SAVE_KEY, SAVE_VERSION, AUTO_SAVE_INTERVAL_MS, MAX_OFFLINE_MS } from '../data/constants'
import { usePlayerStore } from './playerStore'
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

let toastId = 0

export const useGameStore = defineStore('game', {
  state: () => ({
    initialized: false,
    gameVersion: '0.1.0',
    saveVersion: SAVE_VERSION,
    notifications: [],
    lastSaveTimestamp: null,
    gameLoopId: null,
  }),

  getters: {
    hasSave() {
      try {
        return !!localStorage.getItem(SAVE_KEY)
      } catch {
        return false
      }
    },
  },

  actions: {
    init() {
      if (this.hasSave) {
        this.loadGame()
      }
    },

    setInitialized() {
      this.initialized = true
      const stockStore = useStockStore()
      stockStore.initializePrices()
      useDailyRewardStore().checkDaily()
      const missionStore = useMissionStore()
      missionStore.refreshMissions()
      missionStore.startNextStoryMission()
      this.saveGame()
    },

    saveGame() {
      try {
        const playerStore = usePlayerStore()

        const crimeStore = useCrimeStore()
        const inventoryStore = useInventoryStore()
        const combatStore = useCombatStore()

        const saveData = {
          version: SAVE_VERSION,
          gameVersion: this.gameVersion,
          timestamp: Date.now(),
          stores: {
            player: playerStore.getSerializable(),
            crime: crimeStore.getSerializable(),
            inventory: inventoryStore.getSerializable(),
            combat: combatStore.getSerializable(),
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
          }
        }

        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
        this.lastSaveTimestamp = Date.now()
        return true
      } catch (e) {
        console.error('Save failed:', e)
        return false
      }
    },

    loadGame() {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false

        const saveData = JSON.parse(raw)
        if (!saveData || saveData.version !== SAVE_VERSION) {
          console.warn('Save version mismatch')
          return false
        }

        const playerStore = usePlayerStore()

        const crimeStore = useCrimeStore()
        const inventoryStore = useInventoryStore()

        if (saveData.stores.player) {
          playerStore.hydrate(saveData.stores.player)
        }
        if (saveData.stores.crime) {
          crimeStore.hydrate(saveData.stores.crime)
        }
        if (saveData.stores.inventory) {
          inventoryStore.hydrate(saveData.stores.inventory)
        }
        const combatStore = useCombatStore()
        if (saveData.stores.combat) {
          combatStore.hydrate(saveData.stores.combat)
        }
        const jobStore = useJobStore()
        if (saveData.stores.job) {
          jobStore.hydrate(saveData.stores.job)
        }
        const propertyStore = usePropertyStore()
        if (saveData.stores.property) {
          propertyStore.hydrate(saveData.stores.property)
        }
        const travelStore = useTravelStore()
        if (saveData.stores.travel) {
          travelStore.hydrate(saveData.stores.travel)
        }
        const educationStore = useEducationStore()
        if (saveData.stores.education) {
          educationStore.hydrate(saveData.stores.education)
        }
        const casinoStore = useCasinoStore()
        if (saveData.stores.casino) {
          casinoStore.hydrate(saveData.stores.casino)
        }
        const stockStore = useStockStore()
        if (saveData.stores.stock) {
          stockStore.hydrate(saveData.stores.stock)
        } else {
          stockStore.initializePrices()
        }

        const dailyRewardStore = useDailyRewardStore()
        if (saveData.stores.dailyReward) {
          dailyRewardStore.hydrate(saveData.stores.dailyReward)
        }
        const achievementStore = useAchievementStore()
        if (saveData.stores.achievement) {
          achievementStore.hydrate(saveData.stores.achievement)
        }
        const missionStore = useMissionStore()
        if (saveData.stores.mission) {
          missionStore.hydrate(saveData.stores.mission)
        }
        const factionStore = useFactionStore()
        if (saveData.stores.faction) {
          factionStore.hydrate(saveData.stores.faction)
        }
        const bazaarStore = useBazaarStore()
        if (saveData.stores.bazaar) {
          bazaarStore.hydrate(saveData.stores.bazaar)
        }
        const companyStore = useCompanyStore()
        if (saveData.stores.company) {
          companyStore.hydrate(saveData.stores.company)
        }
        const bountyStore = useBountyStore()
        if (saveData.stores.bounty) {
          bountyStore.hydrate(saveData.stores.bounty)
        }
        const racingStore = useRacingStore()
        if (saveData.stores.racing) {
          racingStore.hydrate(saveData.stores.racing)
        }
        if (saveData.stores.eventsHub) {
          useEventsHubStore().hydrate(saveData.stores.eventsHub)
        }

        // Calculate offline progress
        const elapsed = Math.min(MAX_OFFLINE_MS, Date.now() - (saveData.timestamp || Date.now()))
        if (elapsed > 5000) { // Only if more than 5 seconds passed
          playerStore.tickRegen(elapsed)
        }

        this.initialized = true
        this.lastSaveTimestamp = saveData.timestamp

        // Check daily systems
        useDailyRewardStore().checkDaily()
        missionStore.refreshMissions()
        missionStore.startNextStoryMission()
        useAchievementStore().checkAchievements()

        return true
      } catch (e) {
        console.error('Load failed:', e)
        return false
      }
    },

    exportSave() {
      this.saveGame()
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return

        const blob = new Blob([raw], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const date = new Date().toISOString().split('T')[0]
        a.href = url
        a.download = `chaos_save_${date}.json`
        a.click()
        URL.revokeObjectURL(url)
        this.addNotification('Το αρχείο αποθήκευσης εξήχθη!', 'success')
      } catch (e) {
        this.addNotification('Σφάλμα κατά την εξαγωγή', 'danger')
      }
    },

    importSave(jsonString) {
      try {
        const data = JSON.parse(jsonString)
        if (!data || data.version !== SAVE_VERSION) {
          this.addNotification('Μη έγκυρο αρχείο αποθήκευσης', 'danger')
          return false
        }

        localStorage.setItem(SAVE_KEY, jsonString)
        this.loadGame()
        this.addNotification('Η αποθήκευση εισήχθη επιτυχώς!', 'success')
        return true
      } catch (e) {
        this.addNotification('Σφάλμα κατά την εισαγωγή', 'danger')
        return false
      }
    },

    deleteSave() {
      localStorage.removeItem(SAVE_KEY)
      this.initialized = false
      this.addNotification('Η αποθήκευση διαγράφηκε', 'warning')
    },

    addNotification(message, type = 'info') {
      const id = ++toastId
      this.notifications.push({ id, message, type, timestamp: Date.now() })

      // Auto-remove after 3 seconds
      setTimeout(() => {
        this.removeNotification(id)
      }, 3000)

      // Max 5 visible
      while (this.notifications.length > 5) {
        this.notifications.shift()
      }
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

      const tick = () => {
        const now = Date.now()
        const delta = Math.min(60000, now - playerStore.lastTick)

        if (delta > 0) {
          playerStore.tickRegen(delta)
        }

        // Update stock prices
        stockStore.tickPrices()

        // Auto-save
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
    },
  }
})
