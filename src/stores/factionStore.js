import { defineStore } from 'pinia'
import { getFactionById } from '../data/factions'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

// ─── Fortress Building Definitions ────────────────────────────────────────────
export const FORTRESS_BUILDINGS = {
  gym: {
    id: 'gym',
    name: 'Κρυφό Γυμναστήριο',
    icon: '🏋️',
    description: 'Μυστικό γυμναστήριο εξοπλισμένο με κλεμμένα αλτήρες. Αυξάνει τα κέρδη γυμναστηρίου για όλα τα μέλη.',
    buffLabel: '+2% πολλαπλασιαστής Γυμναστηρίου ανά επίπεδο',
    baseCost: 5_000,
    maxLevel: 10,
  },
  accounting: {
    id: 'accounting',
    name: 'Υπόγειο Λογιστήριο',
    icon: '📊',
    description: 'Παράνομο λογιστήριο στο υπόγειο της βάσης. Ξεπλένει χρήμα και αυξάνει εισοδήματα εταιρειών.',
    buffLabel: '+2% παθητικό εισόδημα Εταιρείας ανά επίπεδο',
    baseCost: 8_000,
    maxLevel: 10,
  },
  ops: {
    id: 'ops',
    name: 'Κέντρο Επιχειρήσεων',
    icon: '🎯',
    description: 'Επιχειρησιακό κέντρο με χάρτες και scanner αστυνομίας. Αυξάνει Θράσος και επιτυχία εγκλημάτων.',
    buffLabel: '+1 μέγ. Θράσος και +1% επιτυχία Εγκλήματος ανά επίπεδο',
    baseCost: 10_000,
    maxLevel: 10,
  },
  pantopoleio: {
    id: 'pantopoleio',
    name: 'Κοινωνικό Παντοπωλείο',
    icon: '🏪',
    description: 'Παντοπωλείο για οικογένειες που έχουν ανάγκη. Ανεβάζει το Φιλότιμο όλων των μελών κάθε μέρα.',
    buffLabel: '+2 Φιλότιμο/ημέρα ανά επίπεδο για όλα τα μέλη',
    baseCost: 12_000,
    maxLevel: 10,
  },
}

/**
 * Cost to upgrade a building FROM currentLevel → currentLevel+1.
 * Formula: baseCost * (nextLevel)^2
 */
export function fortressUpgradeCost(buildingId, currentLevel) {
  const building = FORTRESS_BUILDINGS[buildingId]
  if (!building) return Infinity
  const nextLevel = currentLevel + 1
  return building.baseCost * nextLevel * nextLevel
}

export const useFactionStore = defineStore('faction', {
  state: () => ({
    currentFaction: null,  // faction id or null
    joinedAt: null,        // timestamp
    contribution: 0,       // total contribution (from wins etc.)
    rank: 'member',        // 'member' | 'veteran' | 'officer' | 'leader'

    // ── Faction Vault & Fortress ────────────────────────────────────────────
    vault: 0,              // shared cash pool donated by members
    fortressLevels: {
      gym: 0,
      accounting: 0,
      ops: 0,
      pantopoleio: 0,
    },
    lastPantopoleioTick: null,  // 'YYYY-MM-DD' string
  }),

  getters: {
    faction() {
      if (!this.currentFaction) return null
      return getFactionById(this.currentFaction)
    },

    factionBonus() {
      const f = this.faction
      if (!f) return null
      return f.bonus
    },

    rankTitle() {
      const titles = {
        member: 'Μέλος',
        veteran: 'Βετεράνος',
        officer: 'Αξιωματικός',
        leader: 'Αρχηγός',
      }
      return titles[this.rank] || 'Μέλος'
    },

    contributionRank() {
      if (this.contribution >= 500) return 'officer'
      if (this.contribution >= 100) return 'veteran'
      return 'member'
    },

    canUpgradeFortress() {
      return this.rank === 'leader' || this.rank === 'officer'
    },

    // ── Fortress buff getters ─────────────────────────────────────────────
    /** +2% gym gain multiplier per gym building level */
    fortressGymBonus() {
      return 1 + this.fortressLevels.gym * 0.02
    },

    /** +2% company passive income per accounting building level */
    fortressAccountingBonus() {
      return 1 + this.fortressLevels.accounting * 0.02
    },

    /** +1% crime success per ops building level (additive %, not multiplier) */
    fortressCrimeSuccessBonus() {
      return this.fortressLevels.ops * 0.01
    },

    /** +1 max Nerve per ops building level (flat integer) */
    fortressNerveBonus() {
      return this.fortressLevels.ops
    },

    /** Daily filotimo per member from Κοινωνικό Παντοπωλείο */
    fortressPantopoleioFilotimo() {
      return this.fortressLevels.pantopoleio * 2
    },

    // ── Per-building upgrade cost ─────────────────────────────────────────
    gymUpgradeCost() {
      return fortressUpgradeCost('gym', this.fortressLevels.gym)
    },
    accountingUpgradeCost() {
      return fortressUpgradeCost('accounting', this.fortressLevels.accounting)
    },
    pantopoleioUpgradeCost() {
      return fortressUpgradeCost('pantopoleio', this.fortressLevels.pantopoleio)
    },

    opsUpgradeCost() {
      return fortressUpgradeCost('ops', this.fortressLevels.ops)
    },
  },

  actions: {
    joinFaction(factionId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const faction = getFactionById(factionId)

      if (!faction) return false
      if (this.currentFaction) return false

      if (player.level < faction.requirement.level) {
        gameStore.addNotification(`Χρειάζεσαι επίπεδο ${faction.requirement.level}!`, 'danger')
        return false
      }
      if (player.filotimo < faction.requirement.filotimo) {
        gameStore.addNotification(`Χρειάζεσαι ${faction.requirement.filotimo} Φιλότιμο!`, 'danger')
        return false
      }

      this.currentFaction = factionId
      this.joinedAt = Date.now()
      this.contribution = 0
      this.rank = 'member'

      gameStore.addNotification(`Μπήκες στους ${faction.name}!`, 'success')
      player.logActivity(`🏴 Συμμορία: ${faction.name}`, 'info')
      gameStore.saveGame()
      return true
    },

    leaveFaction() {
      const gameStore = useGameStore()
      const player = usePlayerStore()

      if (!this.currentFaction) return false

      const name = this.faction?.name || 'Συμμορία'
      this.currentFaction = null
      this.joinedAt = null
      this.contribution = 0
      this.rank = 'member'

      gameStore.addNotification(`Αποχώρησες από ${name}`, 'warning')
      player.logActivity(`🏴 Αποχώρηση: ${name}`, 'info')
      gameStore.saveGame()
      return true
    },

    addContribution(amount = 1) {
      if (!this.currentFaction) return
      this.contribution += amount
      this.rank = this.contributionRank
    },

    // ── Vault actions ─────────────────────────────────────────────────────
    donateToVault(amount) {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (!this.currentFaction) {
        gameStore.addNotification('Δεν είσαι σε συμμορία!', 'danger')
        return false
      }

      const amt = Math.floor(amount)
      if (amt <= 0) return false

      if (player.cash < amt) {
        gameStore.addNotification('Δεν έχεις αρκετά μετρητά!', 'danger')
        return false
      }

      player.removeCash(amt)
      this.vault += amt
      this.addContribution(Math.floor(amt / 100)) // 1 contribution per €100 donated
      player.logActivity(`🏦 Δωρεά στο Θησαυροφυλάκιο: €${amt.toLocaleString()}`, 'info')
      gameStore.addNotification(`Δώρισες €${amt.toLocaleString()} στο Οχυρό!`, 'success')
      gameStore.saveGame()
      return true
    },

    upgradeFortressBuilding(buildingId) {
      const gameStore = useGameStore()
      const player = usePlayerStore()

      if (!this.currentFaction) {
        gameStore.addNotification('Δεν είσαι σε συμμορία!', 'danger')
        return false
      }

      if (!this.canUpgradeFortress) {
        gameStore.addNotification('Μόνο Αξιωματικοί και Αρχηγοί μπορούν να αναβαθμίσουν το Οχυρό!', 'danger')
        return false
      }

      const building = FORTRESS_BUILDINGS[buildingId]
      if (!building) return false

      const currentLevel = this.fortressLevels[buildingId]
      if (currentLevel >= building.maxLevel) {
        gameStore.addNotification(`${building.name} είναι ήδη στο μέγιστο επίπεδο!`, 'warning')
        return false
      }

      const cost = fortressUpgradeCost(buildingId, currentLevel)
      if (this.vault < cost) {
        gameStore.addNotification(`Χρειάζεσαι €${cost.toLocaleString()} στο Θησαυροφυλάκιο!`, 'danger')
        return false
      }

      this.vault -= cost
      this.fortressLevels[buildingId]++

      const newLevel = this.fortressLevels[buildingId]
      player.logActivity(`🏰 ${building.name} αναβαθμίστηκε σε Επίπεδο ${newLevel}!`, 'info')
      gameStore.addNotification(`${building.icon} ${building.name} → Επίπεδο ${newLevel}!`, 'success')
      gameStore.saveGame()
      return true
    },

    /** Called once per calendar day from gameStore daily tick */
    tickPantopoleio() {
      if (!this.currentFaction) return
      const level = this.fortressLevels.pantopoleio
      if (level <= 0) return
      const today = new Date().toISOString().split('T')[0]
      if (this.lastPantopoleioTick === today) return
      this.lastPantopoleioTick = today
      const gain = level * 2
      const player = usePlayerStore()
      player.addFilotimo(gain)
      useGameStore().addNotification(`🏪 Κοινωνικό Παντοπωλείο: +${gain} Φιλότιμο`, 'success')
    },

    // ── Stat bonuses from faction membership ─────────────────────────────
    getStatBonuses() {
      const f = this.faction
      if (!f) return {}
      if (f.bonus.type === 'all') {
        return {
          strength: f.bonus.value,
          speed: f.bonus.value,
          dexterity: f.bonus.value,
          defense: f.bonus.value,
        }
      }
      return { [f.bonus.type]: f.bonus.value }
    },

    // ── Persistence ───────────────────────────────────────────────────────
    getSerializable() {
      return {
        currentFaction: this.currentFaction,
        joinedAt: this.joinedAt,
        contribution: this.contribution,
        rank: this.rank,
        vault: this.vault,
        fortressLevels: { ...this.fortressLevels },
        lastPantopoleioTick: this.lastPantopoleioTick,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.currentFaction !== undefined) this.currentFaction = data.currentFaction
      if (data.joinedAt !== undefined) this.joinedAt = data.joinedAt
      if (data.contribution !== undefined) this.contribution = data.contribution
      if (data.rank !== undefined) this.rank = data.rank
      if (data.vault !== undefined) this.vault = data.vault
      if (data.fortressLevels) {
        this.fortressLevels.gym = data.fortressLevels.gym ?? 0
        this.fortressLevels.accounting = data.fortressLevels.accounting ?? 0
        this.fortressLevels.ops = data.fortressLevels.ops ?? 0
        this.fortressLevels.pantopoleio = data.fortressLevels.pantopoleio ?? 0
      }
      if (data.lastPantopoleioTick !== undefined) this.lastPantopoleioTick = data.lastPantopoleioTick
    },
  },
})
