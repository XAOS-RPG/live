import { defineStore } from 'pinia'

export const useCombatStore = defineStore('combat', {
  state: () => ({
    combatHistory: [],
  }),

  getters: {
    combatStats() {
      const wins = this.combatHistory.filter(h => h.won).length
      const total = this.combatHistory.length
      return {
        wins,
        losses: total - wins,
        total,
        winRate: total > 0 ? (wins / total * 100).toFixed(1) : '0',
      }
    },
  },

  actions: {
    recordHistory({ opponentId, isPvp, won }) {
      this.combatHistory.push({
        opponentId,
        isPvp: isPvp || false,
        won,
        timestamp: Date.now(),
      })
      if (this.combatHistory.length > 100) {
        this.combatHistory = this.combatHistory.slice(-100)
      }
    },

    getSerializable() {
      return {
        combatHistory: this.combatHistory.slice(-100),
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.combatHistory) this.combatHistory = data.combatHistory
    },
  },
})
