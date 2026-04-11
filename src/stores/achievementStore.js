import { defineStore } from 'pinia'
import { achievements } from '../data/achievements'
import { usePlayerStore } from './playerStore'
import { useCombatStore } from './combatStore'
import { useGameStore } from './gameStore'
import { usePropertyStore } from './propertyStore'
import { useEducationStore } from './educationStore'
import { useCasinoStore } from './casinoStore'
import { useDailyRewardStore } from './dailyRewardStore'

export const useAchievementStore = defineStore('achievement', {
  state: () => ({
    unlocked: [],   // array of achievement ids
    claimed: [],    // array of achievement ids (reward collected)
  }),

  getters: {
    unlockedSet() {
      return new Set(this.unlocked)
    },
    claimedSet() {
      return new Set(this.claimed)
    },
    unlockedCount() {
      return this.unlocked.length
    },
    totalCount() {
      return achievements.length
    },
    unclaimedCount() {
      return this.unlocked.filter(id => !this.claimedSet.has(id)).length
    },
  },

  actions: {
    getSnapshot() {
      const player = usePlayerStore()
      const combat = useCombatStore()
      const propStore = usePropertyStore()
      const eduStore = useEducationStore()
      const casinoStore = useCasinoStore()
      const dailyStore = useDailyRewardStore()

      return {
        player: {
          level: player.level,
          totalStats: player.totalStats,
          totalWealth: player.cash + player.bank + player.vault,
        },
        combat: {
          wins: combat.combatHistory.filter(h => h.won).length,
          losses: combat.combatHistory.filter(h => !h.won).length,
          pvpWins: combat.combatHistory.filter(h => h.won && h.isPvp).length,
          bossWins: combat.combatHistory.filter(h => h.won && (h.opponentId === 'boss_1' || h.opponentId === 'boss_2')).length,
        },
        crime: {
          totalCrimes: player.crimeXP > 0 ? Math.max(1, Math.floor(player.crimeXP / 3)) : 0,
          bankRobberies: 0,
        },
        property: {
          owned: propStore.ownedPropertyId ? 1 : 0,
        },
        education: {
          completed: eduStore.completedCourses?.length || 0,
        },
        travel: {
          citiesVisited: 0,  // travelStore doesn't track visited cities yet
        },
        casino: {
          totalGames: casinoStore.stats?.gamesPlayed || 0,
        },
        daily: {
          maxStreak: dailyStore.maxStreak || 0,
        },
      }
    },

    checkAchievements() {
      const snapshot = this.getSnapshot()
      const gameStore = useGameStore()
      const player = usePlayerStore()
      let newUnlocks = 0

      for (const achievement of achievements) {
        if (this.unlockedSet.has(achievement.id)) continue

        try {
          if (achievement.check(snapshot)) {
            this.unlocked.push(achievement.id)
            newUnlocks++
            gameStore.addNotification(
              `🏆 Achievement: ${achievement.name}!`,
              'success'
            )
            player.logActivity(`🏆 ${achievement.name}: ${achievement.description}`, 'xp')
          }
        } catch {
          // Skip if check fails
        }
      }

      if (newUnlocks > 0) {
        gameStore.saveGame()
      }

      return newUnlocks
    },

    claimReward(achievementId) {
      if (!this.unlockedSet.has(achievementId)) return false
      if (this.claimedSet.has(achievementId)) return false

      const achievement = achievements.find(a => a.id === achievementId)
      if (!achievement) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (achievement.reward.cash) {
        player.addCash(achievement.reward.cash)
      }

      this.claimed.push(achievementId)
      gameStore.addNotification(
        `Έλαβες €${achievement.reward.cash} για "${achievement.name}"!`,
        'cash'
      )
      gameStore.saveGame()
      return true
    },

    /** Παίρνει με ένα κλικ όλα τα ξεκλείδωτα επιτεύγματα που δεν έχουν ήδη πληρωθεί. */
    claimAllUnclaimed() {
      const toClaim = this.unlocked.filter(id => !this.claimedSet.has(id))
      if (!toClaim.length) return 0

      const player = usePlayerStore()
      const gameStore = useGameStore()
      let total = 0

      for (const id of toClaim) {
        const achievement = achievements.find(a => a.id === id)
        if (!achievement) continue
        const cash = achievement.reward?.cash || 0
        if (cash) {
          total += cash
          player.addCash(cash)
        }
        this.claimed.push(id)
      }

      gameStore.addNotification(
        `Έλαβες συνολικά €${total.toLocaleString('el-GR')} από ${toClaim.length} επιτεύγματα!`,
        'cash'
      )
      player.logActivity(`🏆 Μαζική είσπραξη: +€${total} (${toClaim.length} επιτεύγματα)`, 'cash')
      gameStore.saveGame()
      return toClaim.length
    },

    getSerializable() {
      return {
        unlocked: [...this.unlocked],
        claimed: [...this.claimed],
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.unlocked) this.unlocked = [...data.unlocked]
      if (data.claimed) this.claimed = [...data.claimed]
    },
  },
})
