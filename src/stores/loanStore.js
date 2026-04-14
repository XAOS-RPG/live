import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

const DAY_MS = 24 * 60 * 60 * 1000

// Loan tiers
const LOAN_TIERS = [
  { id: 'small',   label: 'Μικρό',   maxAmount: 5000,   interestRate: 0.10, requiredLevel: 1 },
  { id: 'medium',  label: 'Μεσαίο',  maxAmount: 25000,  interestRate: 0.15, requiredLevel: 5 },
  { id: 'large',   label: 'Μεγάλο',  maxAmount: 100000, interestRate: 0.20, requiredLevel: 10 },
  { id: 'massive', label: 'Τεράστιο', maxAmount: 500000, interestRate: 0.25, requiredLevel: 18 },
]

const THREAT_DAY = 3   // Day when thugs attack
const SEIZE_DAY = 7    // Day when assets are seized

export { LOAN_TIERS }

export const useLoanStore = defineStore('loan', {
  state: () => ({
    // Active loan: { amount, interestRate, takenAt, tierId, totalOwed }
    activeLoan: null,
    totalBorrowed: 0,
    totalRepaid: 0,
    timesDefaulted: 0,
    lastDailyCheck: null,
  }),

  getters: {
    hasLoan() {
      return this.activeLoan !== null
    },

    currentDebt() {
      if (!this.activeLoan) return 0
      return this.activeLoan.totalOwed
    },

    daysSinceLoan() {
      if (!this.activeLoan) return 0
      return Math.floor((Date.now() - this.activeLoan.takenAt) / DAY_MS)
    },

    isOverdue() {
      return this.daysSinceLoan >= THREAT_DAY
    },

    isCritical() {
      return this.daysSinceLoan >= SEIZE_DAY
    },

    availableTiers() {
      const player = usePlayerStore()
      return LOAN_TIERS.filter(t => player.level >= t.requiredLevel)
    },
  },

  actions: {
    /**
     * Take a loan.
     */
    takeLoan(tierId, amount) {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (this.activeLoan) {
        gameStore.addNotification('Έχεις ήδη ενεργό δάνειο! Ξεπλήρωσέ το πρώτα.', 'danger')
        return false
      }

      const tier = LOAN_TIERS.find(t => t.id === tierId)
      if (!tier) return false

      if (player.level < tier.requiredLevel) {
        gameStore.addNotification(`Χρειάζεσαι Level ${tier.requiredLevel}!`, 'danger')
        return false
      }

      if (amount <= 0 || amount > tier.maxAmount) {
        gameStore.addNotification(`Ποσό: €1 - €${tier.maxAmount}`, 'danger')
        return false
      }

      this.activeLoan = {
        tierId,
        amount,
        interestRate: tier.interestRate,
        takenAt: Date.now(),
        totalOwed: amount,
        interestAccrued: 0,
        threatSent: false,
        seized: false,
      }

      player.addCash(amount)
      this.totalBorrowed += amount

      gameStore.addNotification(`💰 Δανείστηκες €${amount} (τόκος ${(tier.interestRate * 100).toFixed(0)}%/ημέρα)`, 'cash')
      player.logActivity(`🦈 Δάνειο: +€${amount}`, 'cash')
      gameStore.saveGame()
      return true
    },

    /**
     * Repay part or all of the loan.
     */
    repayLoan(amount) {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (!this.activeLoan) return false

      amount = Math.min(amount, this.activeLoan.totalOwed, player.cash)
      if (amount <= 0) {
        gameStore.addNotification('Δεν έχεις αρκετά χρήματα!', 'danger')
        return false
      }

      player.removeCash(amount)
      this.activeLoan.totalOwed -= amount
      this.totalRepaid += amount

      if (this.activeLoan.totalOwed <= 0) {
        this.activeLoan = null
        gameStore.addNotification('✅ Ξεπλήρωσες το δάνειο!', 'success')
        player.logActivity('🦈 Δάνειο ξεπληρώθηκε!', 'success')
      } else {
        gameStore.addNotification(`Πλήρωσες €${amount}. Υπόλοιπο: €${this.activeLoan.totalOwed}`, 'info')
      }

      gameStore.saveGame()
      return true
    },

    /**
     * Daily check — accrue interest, send threats, seize assets.
     * Called from game loop (throttled to once per day).
     */
    dailyLoanCheck() {
      if (!this.activeLoan) return

      const now = Date.now()
      // Only run once per day
      if (this.lastDailyCheck && now - this.lastDailyCheck < DAY_MS) return
      this.lastDailyCheck = now

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const days = this.daysSinceLoan

      // Accrue daily interest
      const interest = Math.floor(this.activeLoan.amount * this.activeLoan.interestRate)
      this.activeLoan.totalOwed += interest
      this.activeLoan.interestAccrued += interest

      // Day 3+: thugs attack
      if (days >= THREAT_DAY && !this.activeLoan.threatSent) {
        this.activeLoan.threatSent = true
        const hpLoss = Math.floor(player.resources.hp.max * 0.3)
        player.resources.hp.current = Math.max(1, player.resources.hp.current - hpLoss)
        player.setStatus('hospital', 15 * 60 * 1000) // 15 min hospital

        gameStore.addNotification(`🦈 Ο τοκογλύφος έστειλε μπράβους! -${hpLoss} HP, νοσοκομείο 15λ.`, 'danger')
        player.logActivity(`🦈 Μπράβοι τοκογλύφου: -${hpLoss} HP`, 'danger')
      }

      // Day 7+: seize cash
      if (days >= SEIZE_DAY && !this.activeLoan.seized) {
        this.activeLoan.seized = true
        const seized = Math.min(player.cash, Math.floor(this.activeLoan.totalOwed * 0.5))
        if (seized > 0) {
          player.removeCash(seized)
          this.activeLoan.totalOwed -= seized
          gameStore.addNotification(`🦈 Ο τοκογλύφος κατέσχεσε €${seized} από τα μετρητά σου!`, 'danger')
          player.logActivity(`🦈 Κατάσχεση: -€${seized}`, 'danger')
        }
        this.timesDefaulted++
      }

      gameStore.saveGame()
    },

    getSerializable() {
      return {
        activeLoan: this.activeLoan ? { ...this.activeLoan } : null,
        totalBorrowed: this.totalBorrowed,
        totalRepaid: this.totalRepaid,
        timesDefaulted: this.timesDefaulted,
        lastDailyCheck: this.lastDailyCheck,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.activeLoan) this.activeLoan = { ...data.activeLoan }
      if (data.totalBorrowed !== undefined) this.totalBorrowed = data.totalBorrowed
      if (data.totalRepaid !== undefined) this.totalRepaid = data.totalRepaid
      if (data.timesDefaulted !== undefined) this.timesDefaulted = data.timesDefaulted
      if (data.lastDailyCheck !== undefined) this.lastDailyCheck = data.lastDailyCheck
    },
  },
})
