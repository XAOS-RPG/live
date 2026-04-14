import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useCompanyStore } from './companyStore'

export const ELITE_MIN_LEVEL = 30

// ── Shadow Control ──────────────────────────────────────────────────────────
export const HENCHMAN_TYPES = [
  { id: 'petty',    label: 'Μικροκλέφτης', icon: '🥷', hireCost: 5000,  crimeId: 'shoplifting',  intervalMs: 5 * 60 * 1000,  cashPerRun: 40,   xpPerRun: 2  },
  { id: 'thief',    label: 'Κλέφτης',      icon: '🦹', hireCost: 15000, crimeId: 'pickpocketing', intervalMs: 8 * 60 * 1000,  cashPerRun: 120,  xpPerRun: 5  },
  { id: 'enforcer', label: 'Εκτελεστής',   icon: '💀', hireCost: 40000, crimeId: 'robbery',       intervalMs: 15 * 60 * 1000, cashPerRun: 500,  xpPerRun: 15 },
]
const MAX_HENCHMEN = 5

// ── Networking Tree ──────────────────────────────────────────────────────────
export const NETWORK_PERKS = [
  { id: 'amnesty',        label: 'Αμνηστία',          icon: '⚖️',  desc: '-25% πιθανότητα φυλακής',         mesonCost: 20, requires: null },
  { id: 'street_info',    label: 'Πληροφορίες Δρόμου', icon: '👂',  desc: '+15% επιτυχία εγκλημάτων',        mesonCost: 15, requires: null },
  { id: 'insider_trading',label: 'Insider Trading',    icon: '📊',  desc: 'Preview μετοχών 15 λεπτά νωρίς',  mesonCost: 35, requires: 'street_info' },
  { id: 'ghost',          label: 'Φάντασμα',           icon: '👻',  desc: '-40% χρόνος φυλακής',             mesonCost: 30, requires: 'amnesty' },
  { id: 'fixer',          label: 'Διορθωτής',          icon: '🔧',  desc: '+20% κέρδη από εγκλήματα',        mesonCost: 50, requires: 'insider_trading' },
]

// ── Political Influence ──────────────────────────────────────────────────────
export const CITY_INFLUENCE = [
  { cityId: 'athens',       label: 'Αθήνα',        icon: '🏛️', filotimoCost: 100, cashCost: 50000,  taxRate: 0.02 },
  { cityId: 'thessaloniki', label: 'Θεσσαλονίκη',  icon: '🌊', filotimoCost: 80,  cashCost: 35000,  taxRate: 0.025 },
  { cityId: 'mykonos',      label: 'Μύκονος',      icon: '🏖️', filotimoCost: 60,  cashCost: 25000,  taxRate: 0.03 },
  { cityId: 'heraklion',    label: 'Ηράκλειο',     icon: '🏺', filotimoCost: 50,  cashCost: 20000,  taxRate: 0.02 },
  { cityId: 'santorini',    label: 'Σαντορίνη',    icon: '🌅', filotimoCost: 55,  cashCost: 22000,  taxRate: 0.025 },
  { cityId: 'patras',       label: 'Πάτρα',        icon: '🎭', filotimoCost: 40,  cashCost: 15000,  taxRate: 0.015 },
  { cityId: 'corfu',        label: 'Κέρκυρα',      icon: '⛵', filotimoCost: 45,  cashCost: 18000,  taxRate: 0.02 },
]
const INFLUENCE_TICK_MS = 60 * 60 * 1000 // 1 hour

// ── Legal Fronts ─────────────────────────────────────────────────────────────
export const STATUS_SYMBOLS = [
  { id: 'golden_watch',   label: 'Χρυσό Ρολόι',      icon: '⌚', cleanCost: 50000,  buff: { crimeReward: 0.10 } },
  { id: 'armored_car',    label: 'Θωρακισμένο Αμάξι', icon: '🚗', cleanCost: 120000, buff: { jailReduction: 0.20 } },
  { id: 'private_island', label: 'Ιδιωτικό Νησί',     icon: '🏝️', cleanCost: 300000, buff: { allStats: 0.10 } },
  { id: 'penthouse',      label: 'Penthouse',          icon: '🏙️', cleanCost: 200000, buff: { gymGains: 0.15 } },
  { id: 'yacht',          label: 'Γιοτ',               icon: '⛴️', cleanCost: 500000, buff: { xpBonus: 0.20 } },
]
const LAUNDER_RATE = 0.70 // dirty → clean at 70%

export const useEliteStore = defineStore('elite', {
  state: () => ({
    unlocked: false,

    // Shadow Control
    henchmen: [],          // [{ typeId, hiredAt, lastRunAt }]
    shadowIncome: 0,       // lifetime cash earned by henchmen
    shadowXP: 0,

    // Networking Tree
    unlockedPerks: [],     // perk ids

    // Political Influence
    cityInfluence: {},     // { cityId: true }
    influenceAccumulator: {}, // { cityId: ms accumulated }
    totalInfluenceTax: 0,

    // Legal Fronts
    dirtyMoney: 0,
    cleanMoney: 0,
    ownedSymbols: [],      // status symbol ids
  }),

  getters: {
    canUnlock() {
      return usePlayerStore().level >= ELITE_MIN_LEVEL
    },

    activeHenchmen(state) {
      return state.henchmen.map(h => ({
        ...h,
        def: HENCHMAN_TYPES.find(t => t.id === h.typeId),
      }))
    },

    henchmanSlotsFull(state) {
      return state.henchmen.length >= MAX_HENCHMEN
    },

    isPerkUnlocked: (state) => (id) => state.unlockedPerks.includes(id),

    hasCityInfluence: (state) => (cityId) => !!state.cityInfluence[cityId],

    hasSymbol: (state) => (id) => state.ownedSymbols.includes(id),

    // Aggregated buffs from status symbols
    symbolBuffs(state) {
      const buffs = { crimeReward: 0, jailReduction: 0, allStats: 0, gymGains: 0, xpBonus: 0 }
      for (const id of state.ownedSymbols) {
        const sym = STATUS_SYMBOLS.find(s => s.id === id)
        if (!sym) continue
        for (const [k, v] of Object.entries(sym.buff)) buffs[k] += v
      }
      return buffs
    },

    // Networking perk helpers
    jailChanceReduction(state) {
      return state.unlockedPerks.includes('amnesty') ? 0.25 : 0
    },
    jailTimeReduction(state) {
      let r = 0
      if (state.unlockedPerks.includes('ghost')) r += 0.40
      return r
    },
    crimeSuccessBonus(state) {
      return state.unlockedPerks.includes('street_info') ? 0.15 : 0
    },
    crimeRewardBonus(state) {
      let b = 0
      if (state.unlockedPerks.includes('fixer')) b += 0.20
      b += (state.ownedSymbols.includes('golden_watch') ? STATUS_SYMBOLS.find(s => s.id === 'golden_watch').buff.crimeReward : 0)
      return b
    },
    gymGainsBonus(state) {
      return state.ownedSymbols.includes('penthouse') ? STATUS_SYMBOLS.find(s => s.id === 'penthouse').buff.gymGains : 0
    },
    xpBonusMultiplier(state) {
      return 1 + (state.ownedSymbols.includes('yacht') ? STATUS_SYMBOLS.find(s => s.id === 'yacht').buff.xpBonus : 0)
    },
    allStatsBonus(state) {
      return state.ownedSymbols.includes('private_island') ? STATUS_SYMBOLS.find(s => s.id === 'private_island').buff.allStats : 0
    },

    insiderTradingActive(state) {
      return state.unlockedPerks.includes('insider_trading')
    },
  },

  actions: {
    unlock() {
      if (!this.canUnlock) return false
      this.unlocked = true
      useGameStore().addNotification('🌟 Elite Ascension ξεκλειδώθηκε!', 'success')
      useGameStore().saveGame()
      return true
    },

    // ── Shadow Control ──────────────────────────────────────────────────────
    hireHenchman(typeId) {
      if (!this.unlocked || this.henchmanSlotsFull) return false
      const def = HENCHMAN_TYPES.find(t => t.id === typeId)
      if (!def) return false
      const player = usePlayerStore()
      if (player.cash < def.hireCost) {
        useGameStore().addNotification('Δεν έχεις αρκετά χρήματα!', 'danger')
        return false
      }
      player.removeCash(def.hireCost)
      this.henchmen.push({ typeId, hiredAt: Date.now(), lastRunAt: Date.now() })
      useGameStore().addNotification(`${def.icon} ${def.label} προσλήφθηκε!`, 'success')
      useGameStore().saveGame()
      return true
    },

    fireHenchman(index) {
      if (index < 0 || index >= this.henchmen.length) return
      const h = this.henchmen[index]
      const def = HENCHMAN_TYPES.find(t => t.id === h.typeId)
      this.henchmen.splice(index, 1)
      useGameStore().addNotification(`${def?.icon} Απολύθηκε.`, 'warning')
      useGameStore().saveGame()
    },

    tickHenchmen(nowMs) {
      if (!this.unlocked || !this.henchmen.length) return
      const player = usePlayerStore()
      let totalCash = 0, totalXP = 0
      for (const h of this.henchmen) {
        const def = HENCHMAN_TYPES.find(t => t.id === h.typeId)
        if (!def) continue
        const elapsed = nowMs - (h.lastRunAt || nowMs)
        const runs = Math.floor(elapsed / def.intervalMs)
        if (runs > 0) {
          h.lastRunAt = (h.lastRunAt || nowMs) + runs * def.intervalMs
          totalCash += def.cashPerRun * runs
          totalXP += def.xpPerRun * runs
        }
      }
      if (totalCash > 0) {
        player.addCash(totalCash)
        player.addXP(totalXP)
        this.shadowIncome += totalCash
        this.shadowXP += totalXP
      }
    },

    // ── Networking Tree ─────────────────────────────────────────────────────
    unlockPerk(perkId) {
      if (!this.unlocked) return false
      const perk = NETWORK_PERKS.find(p => p.id === perkId)
      if (!perk || this.unlockedPerks.includes(perkId)) return false
      if (perk.requires && !this.unlockedPerks.includes(perk.requires)) {
        useGameStore().addNotification('Ξεκλείδωσε πρώτα το προαπαιτούμενο!', 'danger')
        return false
      }
      const player = usePlayerStore()
      if (player.meson < perk.mesonCost) {
        useGameStore().addNotification('Δεν έχεις αρκετό Μέσον!', 'danger')
        return false
      }
      player.addMeson(-perk.mesonCost)
      this.unlockedPerks.push(perkId)
      useGameStore().addNotification(`${perk.icon} ${perk.label} ξεκλειδώθηκε!`, 'success')
      useGameStore().saveGame()
      return true
    },

    // ── Political Influence ─────────────────────────────────────────────────
    buyInfluence(cityId) {
      if (!this.unlocked) return false
      if (this.cityInfluence[cityId]) return false
      const def = CITY_INFLUENCE.find(c => c.cityId === cityId)
      if (!def) return false
      const player = usePlayerStore()
      if (player.filotimo < def.filotimoCost || player.cash < def.cashCost) {
        useGameStore().addNotification('Δεν έχεις αρκετά Φιλότιμο ή χρήματα!', 'danger')
        return false
      }
      player.addFilotimo(-def.filotimoCost)
      player.removeCash(def.cashCost)
      this.cityInfluence[cityId] = true
      this.influenceAccumulator[cityId] = 0
      useGameStore().addNotification(`${def.icon} Επιρροή στην ${def.label}!`, 'success')
      useGameStore().saveGame()
      return true
    },

    tickInfluence(deltaMs) {
      if (!this.unlocked) return
      const player = usePlayerStore()
      let totalTax = 0
      for (const [cityId, owned] of Object.entries(this.cityInfluence)) {
        if (!owned) continue
        const def = CITY_INFLUENCE.find(c => c.cityId === cityId)
        if (!def) continue
        this.influenceAccumulator[cityId] = (this.influenceAccumulator[cityId] || 0) + deltaMs
        const ticks = Math.floor(this.influenceAccumulator[cityId] / INFLUENCE_TICK_MS)
        if (ticks > 0) {
          this.influenceAccumulator[cityId] -= ticks * INFLUENCE_TICK_MS
          // Base tax: company income * taxRate (or flat 500/tick if no company)
          const company = useCompanyStore()
          const base = company.incomePerHour > 0 ? company.incomePerHour : 500
          const tax = Math.floor(base * def.taxRate * ticks)
          totalTax += tax
        }
      }
      if (totalTax > 0) {
        player.addCash(totalTax)
        this.totalInfluenceTax += totalTax
      }
    },

    // ── Legal Fronts ────────────────────────────────────────────────────────
    addDirtyMoney(amount) {
      this.dirtyMoney += Math.floor(amount)
    },

    launderMoney(amount) {
      if (!this.unlocked) return false
      const company = useCompanyStore()
      if (!company.company) {
        useGameStore().addNotification('Χρειάζεσαι εταιρεία για ξέπλυμα!', 'danger')
        return false
      }
      const actual = Math.min(amount, this.dirtyMoney)
      if (actual <= 0) return false
      const clean = Math.floor(actual * LAUNDER_RATE)
      this.dirtyMoney -= actual
      this.cleanMoney += clean
      useGameStore().addNotification(`💸 Ξεπλύθηκαν €${actual.toLocaleString()} → €${clean.toLocaleString()} καθαρά`, 'success')
      useGameStore().saveGame()
      return true
    },

    buyStatusSymbol(symbolId) {
      if (!this.unlocked) return false
      if (this.ownedSymbols.includes(symbolId)) return false
      const sym = STATUS_SYMBOLS.find(s => s.id === symbolId)
      if (!sym) return false
      if (this.cleanMoney < sym.cleanCost) {
        useGameStore().addNotification('Δεν έχεις αρκετά καθαρά χρήματα!', 'danger')
        return false
      }
      this.cleanMoney -= sym.cleanCost
      this.ownedSymbols.push(symbolId)
      useGameStore().addNotification(`${sym.icon} ${sym.label} αποκτήθηκε!`, 'success')
      useGameStore().saveGame()
      return true
    },

    // ── Persistence ─────────────────────────────────────────────────────────
    getSerializable() {
      return {
        unlocked: this.unlocked,
        henchmen: this.henchmen.map(h => ({ ...h })),
        shadowIncome: this.shadowIncome,
        shadowXP: this.shadowXP,
        unlockedPerks: [...this.unlockedPerks],
        cityInfluence: { ...this.cityInfluence },
        influenceAccumulator: { ...this.influenceAccumulator },
        totalInfluenceTax: this.totalInfluenceTax,
        dirtyMoney: this.dirtyMoney,
        cleanMoney: this.cleanMoney,
        ownedSymbols: [...this.ownedSymbols],
      }
    },

    hydrate(data) {
      if (!data) return
      const keys = ['unlocked', 'shadowIncome', 'shadowXP', 'totalInfluenceTax', 'dirtyMoney', 'cleanMoney']
      for (const k of keys) if (data[k] !== undefined) this[k] = data[k]
      if (Array.isArray(data.henchmen)) this.henchmen = data.henchmen
      if (Array.isArray(data.unlockedPerks)) this.unlockedPerks = data.unlockedPerks
      if (data.cityInfluence) this.cityInfluence = { ...data.cityInfluence }
      if (data.influenceAccumulator) this.influenceAccumulator = { ...data.influenceAccumulator }
      if (Array.isArray(data.ownedSymbols)) this.ownedSymbols = data.ownedSymbols
    },
  },
})
