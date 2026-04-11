import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

export const useCasinoStore = defineStore('casino', {
  state: () => ({
    stats: {
      gamesPlayed: 0,
      totalWon: 0,
      totalLost: 0,
    },
  }),

  getters: {
    netProfit() {
      return this.stats.totalWon - this.stats.totalLost
    },
  },

  actions: {
    /**
     * Call after any game round is resolved.
     * betAmount: what was wagered, winAmount: gross winnings (0 if lost)
     */
    recordResult(betAmount, winAmount) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      this.stats.gamesPlayed++
      if (winAmount > 0) {
        this.stats.totalWon += winAmount
        player.addCash(winAmount)
        gameStore.addNotification(`+€${winAmount.toLocaleString('el-GR')} κέρδος!`, 'success')
      } else {
        this.stats.totalLost += betAmount
      }
      gameStore.saveGame()
    },

    placeBet(amount) {
      const player = usePlayerStore()
      if (player.cash < amount) return false
      player.removeCash(amount)
      return true
    },

    getSerializable() {
      return { stats: { ...this.stats } }
    },

    hydrate(data) {
      if (!data) return
      if (data.stats) Object.assign(this.stats, data.stats)
    },
  },
})
