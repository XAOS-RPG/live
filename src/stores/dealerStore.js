import { defineStore } from 'pinia'
import { getItemById } from '../data/items'
import { usePlayerStore } from './playerStore'
import { useEliteStore } from './eliteStore'
import { useInventoryStore } from './inventoryStore'
import { useGameStore } from './gameStore'
import { useTravelStore } from './travelStore'

// ── Constants ────────────────────────────────────────────────────────────────
const SPAWN_INTERVAL_MS = 8 * 60 * 60 * 1000   // 8 hours
const SPAWN_CITIES = ['athens', 'thessaloniki', 'patras', 'heraklion', 'mykonos', 'santorini', 'corfu']

export const DEALER_CATALOG = [
  { itemId: 'craft_kevlar_vest', dirtyPrice: 3500, stockPerSpawn: 7,  label: 'Γιλέκο Κέβλαρ' },
  { itemId: 'adrenaline',        dirtyPrice: 2200, stockPerSpawn: 8,  label: 'Αδρεναλίνη' },
  { itemId: 'ak47',              dirtyPrice: 12000, stockPerSpawn: 5, label: 'AK-47' },
]
// Total stock per spawn = 7 + 8 + 5 = 20

function _pickCity(exclude = null) {
  const pool = exclude ? SPAWN_CITIES.filter(c => c !== exclude) : SPAWN_CITIES
  return pool[Math.floor(Math.random() * pool.length)]
}

export const useDealerStore = defineStore('dealer', {
  state: () => ({
    // Current spawn
    city: null,               // current city ID
    spawnedAt: 0,             // timestamp
    nextSpawnAt: 0,           // when dealer moves again
    // Stock for each catalog item (reset each spawn)
    stock: {},                // { itemId: remaining }
    // Purchases this spawn (for display)
    purchasedThisSpawn: {},   // { itemId: count }
    initialized: false,
  }),

  getters: {
    isPresent(state) {
      return state.city !== null && Date.now() < state.nextSpawnAt
    },
    isHere(state) {
      const travel = useTravelStore()
      return state.city !== null && travel.currentLocation === state.city && Date.now() < state.nextSpawnAt
    },
    timeUntilNextSpawn(state) {
      return Math.max(0, state.nextSpawnAt - Date.now())
    },
    catalogWithStock(state) {
      return DEALER_CATALOG.map(entry => ({
        ...entry,
        item:      getItemById(entry.itemId),
        remaining: state.stock[entry.itemId] ?? 0,
      }))
    },
  },

  actions: {
    initDealer() {
      if (this.initialized) return
      this.initialized = true
      this._spawn()
    },

    _spawn(prevCity = null) {
      const nowMs = Date.now()
      this.city       = _pickCity(prevCity)
      this.spawnedAt  = nowMs
      this.nextSpawnAt = nowMs + SPAWN_INTERVAL_MS

      // Reset stock
      this.stock = {}
      this.purchasedThisSpawn = {}
      for (const entry of DEALER_CATALOG) {
        this.stock[entry.itemId] = entry.stockPerSpawn
      }

      const gameStore = useGameStore()
      gameStore.addNotification(`🕵️ Ο Μαυραγορίτης εμφανίστηκε στη ${cityName(this.city)}!`, 'warning')
    },

    // ── Buy from dealer ──────────────────────────────────────────────────
    buyItem(itemId) {
      const player      = usePlayerStore()
      const eliteStore  = useEliteStore()
      const inventoryStore = useInventoryStore()
      const gameStore   = useGameStore()
      const travelStore = useTravelStore()

      if (!this.isPresent) {
        return { ok: false, message: 'Ο Μαυραγορίτης δεν είναι διαθέσιμος.' }
      }
      if (travelStore.currentLocation !== this.city) {
        return { ok: false, message: `Ο Μαυραγορίτης βρίσκεται στη ${cityName(this.city)}. Ταξίδεψε εκεί!` }
      }

      const entry = DEALER_CATALOG.find(e => e.itemId === itemId)
      if (!entry) return { ok: false, message: 'Άγνωστο αντικείμενο.' }

      const remaining = this.stock[itemId] ?? 0
      if (remaining <= 0) {
        return { ok: false, message: 'Εξαντλήθηκε το απόθεμα.' }
      }
      if (eliteStore.dirtyMoney < entry.dirtyPrice) {
        return { ok: false, message: `Χρειάζεσαι €${entry.dirtyPrice} Βρώμικα Χρήματα.` }
      }

      // Deduct dirty money
      eliteStore.dirtyMoney -= entry.dirtyPrice
      this.stock[itemId]--
      this.purchasedThisSpawn[itemId] = (this.purchasedThisSpawn[itemId] ?? 0) + 1

      // Give item
      inventoryStore.addItem(itemId, 1)

      const item = getItemById(itemId)
      const itemName = item?.name ?? itemId
      player.logActivity(`🕵️ Μαυραγορίτης: αγορά ${itemName} (€${entry.dirtyPrice} βρώμικα)`, 'crime')
      gameStore.addNotification(`${item?.icon ?? '📦'} ${itemName} αγοράστηκε από τον Μαυραγορίτη!`, 'success')
      gameStore.saveGame()
      return { ok: true }
    },

    // ── Game loop tick ───────────────────────────────────────────────────
    tickDealer(nowMs) {
      if (!this.initialized) return
      if (nowMs >= this.nextSpawnAt) {
        const oldCity = this.city
        this._spawn(oldCity)
        useGameStore().saveGame()
      }
    },

    // ── Persistence ──────────────────────────────────────────────────────
    getSerializable() {
      return {
        city:                this.city,
        spawnedAt:           this.spawnedAt,
        nextSpawnAt:         this.nextSpawnAt,
        stock:               { ...this.stock },
        purchasedThisSpawn:  { ...this.purchasedThisSpawn },
        initialized:         this.initialized,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.city !== undefined)               this.city               = data.city
      if (data.spawnedAt !== undefined)          this.spawnedAt          = data.spawnedAt
      if (data.nextSpawnAt !== undefined)        this.nextSpawnAt        = data.nextSpawnAt
      if (data.stock)                            this.stock              = { ...data.stock }
      if (data.purchasedThisSpawn)               this.purchasedThisSpawn = { ...data.purchasedThisSpawn }
      if (data.initialized !== undefined)        this.initialized        = data.initialized
    },
  },
})

export function cityName(cityId) {
  const NAMES = {
    athens:       'Αθήνα',
    thessaloniki: 'Θεσσαλονίκη',
    patras:       'Πάτρα',
    heraklion:    'Ηράκλειο',
    mykonos:      'Μύκονο',
    santorini:    'Σαντορίνη',
    corfu:        'Κέρκυρα',
  }
  return NAMES[cityId] ?? cityId
}
