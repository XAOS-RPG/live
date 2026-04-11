import { defineStore } from 'pinia'
import { getFactionById } from '../data/factions'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

export const useFactionStore = defineStore('faction', {
  state: () => ({
    currentFaction: null,  // faction id or null
    joinedAt: null,        // timestamp
    contribution: 0,       // total contribution to faction (from wins)
    rank: 'member',        // 'member' | 'veteran' | 'officer' | 'leader'
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
  },

  actions: {
    joinFaction(factionId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const faction = getFactionById(factionId)

      if (!faction) return false
      if (this.currentFaction) return false // already in a faction

      // Check requirements
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
      // Auto-promote based on contribution
      this.rank = this.contributionRank
    },

    // Returns stat bonuses from faction membership
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

    getSerializable() {
      return {
        currentFaction: this.currentFaction,
        joinedAt: this.joinedAt,
        contribution: this.contribution,
        rank: this.rank,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.currentFaction !== undefined) this.currentFaction = data.currentFaction
      if (data.joinedAt !== undefined) this.joinedAt = data.joinedAt
      if (data.contribution !== undefined) this.contribution = data.contribution
      if (data.rank !== undefined) this.rank = data.rank
    },
  },
})
