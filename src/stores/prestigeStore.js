import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { usePropertyStore } from './propertyStore'
import { useJobStore } from './jobStore'
import { useCrimeStore } from './crimeStore'
import { useSmugglingStore } from './smugglingStore'
import { useLoanStore } from './loanStore'
import { useCraftingStore } from './craftingStore'

const MIN_PRESTIGE_LEVEL = 30

/**
 * Prestige bonuses per tier.
 * Each prestige level grants permanent bonuses.
 */
const PRESTIGE_BONUSES = [
  { level: 1,  label: '+5% σε όλα τα stats',           statBonus: 0.05 },
  { level: 2,  label: '+10% κέρδη μετρητών',            cashBonus: 0.10 },
  { level: 3,  label: 'Ξεκινάς με €5.000',              startingCash: 5000 },
  { level: 5,  label: '+15% XP σε όλα',                 xpBonus: 0.15 },
  { level: 7,  label: '+20% gym gains',                  gymBonus: 0.20 },
  { level: 10, label: 'Θρυλική Φήμη',                    legendary: true },
]

export function getPrestigeBonuses(prestigeLevel) {
  return PRESTIGE_BONUSES.filter(b => b.level <= prestigeLevel)
}

export const usePrestigeStore = defineStore('prestige', {
  state: () => ({
    prestigeLevel: 0,
    totalPrestiges: 0,
    fastestPrestige: null, // ms from creation to prestige
  }),

  getters: {
    canPrestige() {
      const player = usePlayerStore()
      return player.level >= MIN_PRESTIGE_LEVEL
    },

    nextPrestigeBonusLabel() {
      const next = PRESTIGE_BONUSES.find(b => b.level > this.prestigeLevel)
      return next ? `Prestige ${next.level}: ${next.label}` : 'Όλα τα bonuses ξεκλειδωμένα!'
    },

    /** Permanent stat multiplier (1.0 + 0.05 per prestige, up to matching tiers). */
    statMultiplier() {
      const bonuses = getPrestigeBonuses(this.prestigeLevel)
      let mult = 1.0
      for (const b of bonuses) {
        if (b.statBonus) mult += b.statBonus
      }
      return mult
    },

    /** Permanent cash earning multiplier. */
    cashMultiplier() {
      const bonuses = getPrestigeBonuses(this.prestigeLevel)
      let mult = 1.0
      for (const b of bonuses) {
        if (b.cashBonus) mult += b.cashBonus
      }
      return mult
    },

    /** Permanent XP multiplier. */
    xpMultiplier() {
      const bonuses = getPrestigeBonuses(this.prestigeLevel)
      let mult = 1.0
      for (const b of bonuses) {
        if (b.xpBonus) mult += b.xpBonus
      }
      return mult
    },

    /** Permanent gym multiplier. */
    gymMultiplier() {
      const bonuses = getPrestigeBonuses(this.prestigeLevel)
      let mult = 1.0
      for (const b of bonuses) {
        if (b.gymBonus) mult += b.gymBonus
      }
      return mult
    },

    /** Starting cash for new prestige. */
    startingCash() {
      const bonuses = getPrestigeBonuses(this.prestigeLevel)
      let cash = 500
      for (const b of bonuses) {
        if (b.startingCash) cash = Math.max(cash, b.startingCash)
      }
      return cash
    },

    isLegendary() {
      return this.prestigeLevel >= 10
    },

    activeBonuses() {
      return getPrestigeBonuses(this.prestigeLevel)
    },

    allBonuses() {
      return PRESTIGE_BONUSES
    },

    minLevel() {
      return MIN_PRESTIGE_LEVEL
    },
  },

  actions: {
    /**
     * Perform prestige — reset progress, keep permanent bonuses.
     */
    doPrestige() {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (player.level < MIN_PRESTIGE_LEVEL) {
        gameStore.addNotification(`Χρειάζεσαι Level ${MIN_PRESTIGE_LEVEL}!`, 'danger')
        return false
      }

      // Track speed
      const elapsed = Date.now() - player.createdAt
      if (!this.fastestPrestige || elapsed < this.fastestPrestige) {
        this.fastestPrestige = elapsed
      }

      // Increment prestige
      this.prestigeLevel++
      this.totalPrestiges++

      // Reset player
      const startCash = this.startingCash
      player.name = player.name // keep name
      player.level = 1
      player.xp = 0
      player.stats = { strength: 5, speed: 5, dexterity: 5, defense: 5 }
      player.resources.hp = { current: 100, max: 100 }
      player.resources.energy = { current: 150, max: 150 }
      player.resources.nerve = { current: 30, max: 30 }
      player.resources.happiness = { current: 100, max: 250 }
      player.resources.stamina = { current: 100, max: 100 }
      player.cash = startCash
      player.bank = 0
      player.vault = 0
      player.filotimo = 50
      player.meson = 0
      player.crimeXP = 0
      player.status = 'free'
      player.statusTimerEnd = null
      player.activeActivity = null
      player.pendingResult = null
      player.abilityPoints = 0
      player.unlockedAbilities = {}
      player.equippedAbilities = []
      player.createdAt = Date.now()
      player.lastTick = Date.now()

      // Reset inventory (keep nothing)
      const inventory = useInventoryStore()
      inventory.items = []
      inventory.equipped = { weapon: null, armor: null }

      // Reset property
      const property = usePropertyStore()
      property.ownedProperties = []
      property.activePropertyId = null
      property.grantPatriko()

      // Reset job
      const job = useJobStore()
      job.currentJob = null
      job.lastPayday = null

      // Reset crime stats
      const crime = useCrimeStore()
      crime.crimeAttempts = {}

      // Reset smuggling
      const smuggling = useSmugglingStore()
      smuggling.cargo = []
      smuggling.totalSmugglingRuns = 0
      smuggling.successfulRuns = 0
      smuggling.totalProfit = 0

      // Clear any loan
      const loan = useLoanStore()
      loan.activeLoan = null

      // Keep crafting recipes (prestige reward)
      // Keep pet (prestige reward)
      // Keep achievements (prestige reward)

      gameStore.addNotification(`🌟 Αναγέννηση ${this.prestigeLevel}! Permanent bonuses ενεργοποιήθηκαν!`, 'success')
      player.logActivity(`🌟 PRESTIGE ${this.prestigeLevel}!`, 'xp')
      gameStore.saveGame()
      return true
    },

    getSerializable() {
      return {
        prestigeLevel: this.prestigeLevel,
        totalPrestiges: this.totalPrestiges,
        fastestPrestige: this.fastestPrestige,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.prestigeLevel !== undefined) this.prestigeLevel = data.prestigeLevel
      if (data.totalPrestiges !== undefined) this.totalPrestiges = data.totalPrestiges
      if (data.fastestPrestige !== undefined) this.fastestPrestige = data.fastestPrestige
    },
  },
})
