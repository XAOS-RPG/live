import { defineStore } from 'pinia'
import { dailyRewards } from '../data/dailyRewards'
import { usePlayerStore } from './playerStore'
import { useInventoryStore } from './inventoryStore'
import { useGameStore } from './gameStore'
import { usePropertyStore } from './propertyStore'

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

    currentDay() {
      // Which day of the 7-day cycle (0-indexed into dailyRewards)
      return this.currentStreak % 7
    },

    nextReward() {
      return dailyRewards[this.currentDay]
    },

    streakDay() {
      return this.currentStreak % 7 + 1
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

      // Check if streak continues (claimed yesterday)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (this.lastClaimDate === yesterdayStr) {
        this.currentStreak++
      } else if (this.lastClaimDate !== null) {
        // Streak broken
        this.currentStreak = 0
      }

      const reward = dailyRewards[this.currentStreak % 7]

      // Give rewards
      if (reward.cash) player.addCash(reward.cash)
      if (reward.xp) player.addXP(reward.xp)
      if (reward.itemId) inventory.addItem(reward.itemId, 1)

      this.lastClaimDate = new Date().toISOString().split('T')[0]
      this.totalLogins++
      this.maxStreak = Math.max(this.maxStreak, this.currentStreak + 1)
      this.pendingReward = false

      gameStore.addNotification(`Ημερήσιο Bonus! ${reward.label}`, 'success')
      player.logActivity(`📅 Ημερήσιο Bonus: ${reward.label}`, 'cash')
      gameStore.saveGame()

      return reward
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
