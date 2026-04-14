import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useInventoryStore } from './inventoryStore'
import { useGameStore } from './gameStore'
import { usePropertyStore } from './propertyStore'

// ── Κουτί του Δρόμου — loot table ────────────────────────────────────────────
export const CRATE_TIERS = {
  common: {
    label: 'Κοινό', color: '#95a5a6', chance: 0.70,
    items: [
      { id: 'water_bottle',  name: 'Νερό',        icon: '💧' },
      { id: 'toast_bag',     name: 'Τοστ',        icon: '🥪' },
      { id: 'beer_can',      name: 'Μπύρα',       icon: '🍺' },
      { id: 'cigarettes',    name: 'Τσιγάρα',     icon: '🚬' },
      { id: 'bandages',      name: 'Γάζες',       icon: '🩹' },
      { id: 'chewing_gum',   name: 'Τσίχλα',      icon: '🫧' },
      { id: 'chocolate',     name: 'Σοκολάτα',    icon: '🍫' },
    ],
  },
  rare: {
    label: 'Σπάνιο', color: '#3498db', chance: 0.25,
    items: [
      { id: 'steroids',      name: 'Στεροειδή',   icon: '💪' },
      { id: 'cocaine',       name: 'Κοκαΐνη',     icon: '❄️' },
      { id: 'mat_iron',      name: 'Σίδερο',      icon: '🔩' },
      { id: 'painkillers',   name: 'Παυσίπονα',   icon: '💊' },
      { id: 'first_aid',     name: 'Κιτ Πρώτων Βοηθειών', icon: '🏥' },
      { id: 'switchblade',   name: 'Σουγιάς',     icon: '🗡️' },
    ],
  },
  legendary: {
    label: 'Θρυλικό', color: '#f39c12', chance: 0.05,
    items: [
      { id: 'adrenaline',    name: 'Αδρεναλίνη',  icon: '💉' },
      { id: 'mat_kevlar',    name: 'Κέβλαρ',      icon: '🛡️' },
      { id: 'ak47',          name: 'AK-47',        icon: '🔫' },
      { id: 'surgical_kit',  name: 'Χειρουργικό Κιτ', icon: '🏥' },
    ],
  },
}

export function rollCrate() {
  const r = Math.random()
  let tier
  if (r < CRATE_TIERS.legendary.chance) {
    tier = 'legendary'
  } else if (r < CRATE_TIERS.legendary.chance + CRATE_TIERS.rare.chance) {
    tier = 'rare'
  } else {
    tier = 'common'
  }
  const pool = CRATE_TIERS[tier].items
  const item = pool[Math.floor(Math.random() * pool.length)]
  return { tier, ...item }
}
// ─────────────────────────────────────────────────────────────────────────────

const AMBUSH_ATTACKERS = [
  'Άγνωστος μπράτσος',
  'Ρουφιάνος της γειτονιάς',
  'Χρεωμένος στο περίπτερο',
  'Φανατικός οπαδός',
  'Ξεχασμένος εχθρός από το παρελθόν',
  'Τύπος με κουκούλα',
  'Νυχτοφύλακας που μπέρδεψε τα πρόσωπα',
]

export const useDailyRewardStore = defineStore('dailyReward', {
  state: () => ({
    lastClaimDate: null,   // 'YYYY-MM-DD' string
    currentStreak: 0,
    maxStreak: 0,
    totalLogins: 0,
    pendingReward: false,  // true when reward is available but not yet claimed
    /** Ημερομηνία (YYYY-MM-DD) που έγινε ήδη ο έλεγχος τυχαίας καθημερινής επίθεσης */
    lastAmbushCheckDate: null,
  }),

  getters: {
    canClaim() {
      const today = new Date().toISOString().split('T')[0]
      return this.lastClaimDate !== today
    },

    streakDay() {
      return this.currentStreak + 1
    },
  },

  actions: {
    checkDaily() {
      // Process daily rent/eviction cycle whenever daily systems refresh.
      usePropertyStore().checkDailyRent()
      this.rollDailyAmbush()
      if (this.canClaim) {
        this.pendingReward = true
      }
    },

    /**
     * Μία φορά ανά ημερολογιακή ημέρα: 10% τυχαία επίθεση (ζημιά HP ή νοσοκομείο).
     */
    rollDailyAmbush() {
      const today = new Date().toISOString().split('T')[0]
      if (this.lastAmbushCheckDate === today) return
      this.lastAmbushCheckDate = today

      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (player.isIncapacitated) return
      if (Math.random() >= 0.1) return

      const attacker = AMBUSH_ATTACKERS[Math.floor(Math.random() * AMBUSH_ATTACKERS.length)]

      if (Math.random() < 0.35) {
        const minutes = 12 + Math.floor(Math.random() * 14)
        const ms = minutes * 60 * 1000
        player.setStatus('hospital', ms)
        player.resources.hp.current = Math.max(1, Math.floor(player.resources.hp.max * (0.2 + Math.random() * 0.15)))
        gameStore.addNotification(
          `💀 Επίθεση! Κάποιος σε πρόλαβε στο δρόμο («${attacker}»). Σε έστειλαν νοσοκομείο (~${minutes}λ).`,
          'hospital'
        )
        player.logActivity(`🏥 Επίθεση: νοσοκομείο — ${attacker}`, 'danger')
      } else {
        const pct = 0.07 + Math.random() * 0.13
        const loss = Math.max(8, Math.floor(player.resources.hp.max * pct))
        player.modifyResource('hp', -loss)
        if (player.resources.hp.current < 1) player.resources.hp.current = 1
        gameStore.addNotification(
          `👊 Επίθεση! Ο/Η «${attacker}» σε χτύπησε. -${loss} HP.`,
          'danger'
        )
        player.logActivity(`👊 Επίθεση: -${loss} HP — ${attacker}`, 'danger')
      }

      gameStore.saveGame()
    },

    claimReward() {
      if (!this.canClaim) return false

      const player = usePlayerStore()
      const inventory = useInventoryStore()
      const gameStore = useGameStore()

      // Streak continuity check
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      if (this.lastClaimDate === yesterdayStr) {
        this.currentStreak++
      } else if (this.lastClaimDate !== null) {
        this.currentStreak = 0
      }

      // Roll the crate
      const drop = rollCrate()
      inventory.addItem(drop.id, 1)

      // Streak bonus cash (scales with streak)
      const streakBonus = Math.min(this.currentStreak, 30) * 50
      const baseCash = 100
      const totalCash = baseCash + streakBonus
      player.addCash(totalCash)
      player.addXP(20 + this.currentStreak * 2)

      this.lastClaimDate = new Date().toISOString().split('T')[0]
      this.totalLogins++
      this.maxStreak = Math.max(this.maxStreak, this.currentStreak + 1)
      this.pendingReward = false

      const tierLabel = CRATE_TIERS[drop.tier].label
      gameStore.addNotification(`📦 Κουτί του Δρόμου: ${drop.icon} ${drop.name} (${tierLabel})!`, 'success')
      player.logActivity(`📦 Κουτί Δρόμου: ${drop.icon} ${drop.name} [${tierLabel}] +€${totalCash}`, 'cash')
      gameStore.saveGame()

      return { ...drop, cash: totalCash, streak: this.currentStreak }
    },

    getSerializable() {
      return {
        lastClaimDate: this.lastClaimDate,
        currentStreak: this.currentStreak,
        maxStreak: this.maxStreak,
        totalLogins: this.totalLogins,
        lastAmbushCheckDate: this.lastAmbushCheckDate,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.lastClaimDate !== undefined) this.lastClaimDate = data.lastClaimDate
      if (data.currentStreak !== undefined) this.currentStreak = data.currentStreak
      if (data.maxStreak !== undefined) this.maxStreak = data.maxStreak
      if (data.totalLogins !== undefined) this.totalLogins = data.totalLogins
      if (data.lastAmbushCheckDate !== undefined) this.lastAmbushCheckDate = data.lastAmbushCheckDate
    },
  },
})
