import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import {
  CAR_CATALOG,
  UPGRADES_CATALOG,
  NITRO_CONFIG,
  getCarById,
  getUpgradeById,
  upgradeCost,
} from '../data/racing'

/** Default blank upgrade record for a freshly owned car. */
function blankUpgrades() {
  return { engine: 0, brakes: 0, suspension: 0, turbo: 0 }
}

export const useRacingStore = defineStore('racing', {
  state: () => ({
    ownedCarIds: [],    // array of car IDs the player has bought
    activeCarId: null,  // currently selected car for races
    nitroCount: 0,      // consumable nitro uses remaining
    // { [carId]: { engine: 0-3, brakes: 0-3, suspension: 0-3, turbo: 0-2 } }
    carUpgrades: {},
  }),

  getters: {
    ownedCars(state) {
      return state.ownedCarIds.map(id => getCarById(id)).filter(Boolean)
    },

    activeCar(state) {
      if (!state.activeCarId) return null
      return getCarById(state.activeCarId)
    },

    /** Effective stats of the active car after applying upgrades. */
    activeCarStats(state) {
      const car = getCarById(state.activeCarId)
      if (!car) return null

      const upgrades = state.carUpgrades[state.activeCarId] ?? blankUpgrades()
      const stats = { ...car.stats }

      for (const upg of UPGRADES_CATALOG) {
        const level = upgrades[upg.id] ?? 0
        if (level > 0) {
          stats[upg.stat] = Math.min(100, stats[upg.stat] + upg.bonusPerLevel * level)
        }
      }
      return stats
    },

    /** Upgrades map for the active car. */
    activeCarUpgrades(state) {
      if (!state.activeCarId) return blankUpgrades()
      return state.carUpgrades[state.activeCarId] ?? blankUpgrades()
    },

    hasCar: (state) => (carId) => state.ownedCarIds.includes(carId),
  },

  actions: {
    /**
     * Purchase a car from the catalog.
     * Returns { ok: true } or { ok: false, message }
     */
    buyCar(carId) {
      const car = getCarById(carId)
      if (!car) return { ok: false, message: 'Άγνωστο αυτοκίνητο.' }
      if (this.ownedCarIds.includes(carId)) return { ok: false, message: 'Το έχεις ήδη!' }

      const player = usePlayerStore()
      if (player.cash < car.price) {
        return { ok: false, message: 'Δεν έχεις αρκετά χρήματα!' }
      }

      player.removeCash(car.price)
      this.ownedCarIds.push(carId)
      this.carUpgrades[carId] = blankUpgrades()

      // Auto-activate if it's the first car
      if (!this.activeCarId) this.activeCarId = carId

      player.logActivity(`🏎️ Αγορά: ${car.name}`, 'success')
      useGameStore().saveGame()
      return { ok: true }
    },

    /** Set a car as the active/racing car. */
    setActiveCar(carId) {
      if (!this.ownedCarIds.includes(carId)) return
      this.activeCarId = carId
    },

    /**
     * Buy NITRO_CONFIG.usesPerPurchase uses of nitro.
     * Returns { ok: true } or { ok: false, message }
     */
    buyNitro() {
      const player = usePlayerStore()
      if (player.cash < NITRO_CONFIG.cost) {
        return { ok: false, message: 'Δεν έχεις αρκετά χρήματα!' }
      }
      player.removeCash(NITRO_CONFIG.cost)
      this.nitroCount += NITRO_CONFIG.usesPerPurchase
      player.logActivity(`💨 Αγορά ${NITRO_CONFIG.usesPerPurchase} Nitro`, 'success')
      useGameStore().saveGame()
      return { ok: true }
    },

    /**
     * Upgrade a system on the active car.
     * Returns { ok: true } or { ok: false, message }
     */
    buyUpgrade(upgradeId) {
      if (!this.activeCarId) return { ok: false, message: 'Δεν έχεις ενεργό αυτοκίνητο!' }

      const upg = getUpgradeById(upgradeId)
      if (!upg) return { ok: false, message: 'Άγνωστη αναβάθμιση.' }

      const current = this.activeCarUpgrades[upgradeId] ?? 0
      if (current >= upg.maxLevel) {
        return { ok: false, message: 'Έφτασες το μέγιστο επίπεδο!' }
      }

      const cost = upgradeCost(upg, current)
      const player = usePlayerStore()
      if (player.cash < cost) {
        return { ok: false, message: 'Δεν έχεις αρκετά χρήματα!' }
      }

      player.removeCash(cost)

      if (!this.carUpgrades[this.activeCarId]) {
        this.carUpgrades[this.activeCarId] = blankUpgrades()
      }
      this.carUpgrades[this.activeCarId][upgradeId]++

      const car = getCarById(this.activeCarId)
      player.logActivity(`⚙️ Αναβάθμιση: ${upg.name} → Επ. ${this.carUpgrades[this.activeCarId][upgradeId]}`, 'success')
      useGameStore().saveGame()
      return { ok: true }
    },

    // ── Persistence ────────────────────────────────────────────────────────
    getSerializable() {
      return {
        ownedCarIds: [...this.ownedCarIds],
        activeCarId: this.activeCarId,
        nitroCount: this.nitroCount,
        carUpgrades: JSON.parse(JSON.stringify(this.carUpgrades)),
      }
    },

    hydrate(data) {
      if (!data) return
      if (Array.isArray(data.ownedCarIds)) this.ownedCarIds = data.ownedCarIds
      if (data.activeCarId !== undefined) this.activeCarId = data.activeCarId
      if (typeof data.nitroCount === 'number') this.nitroCount = data.nitroCount
      if (data.carUpgrades) this.carUpgrades = data.carUpgrades
    },
  },
})
