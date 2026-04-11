import { defineStore } from 'pinia'
import { getJobById } from '../data/jobs'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { WORK_COOLDOWN_MS } from '../data/constants'

export const useJobStore = defineStore('job', {
  state: () => ({
    currentJobId: null,
    workStats: 0,
    lastWorked: null,
  }),

  getters: {
    currentJob() {
      if (!this.currentJobId) return null
      return getJobById(this.currentJobId)
    },

    currentRank() {
      const job = this.currentJob
      if (!job) return null
      let rank = job.ranks[0]
      for (const r of job.ranks) {
        if (this.workStats >= r.workStatsRequired) rank = r
      }
      return rank
    },

    nextRank() {
      const job = this.currentJob
      if (!job) return null
      for (const r of job.ranks) {
        if (this.workStats < r.workStatsRequired) return r
      }
      return null
    },

    canWork() {
      if (!this.currentJobId) return false
      if (!this.lastWorked) return true
      return Date.now() - this.lastWorked >= WORK_COOLDOWN_MS
    },

    timeUntilWork() {
      if (!this.lastWorked) return 0
      return Math.max(0, WORK_COOLDOWN_MS - (Date.now() - this.lastWorked))
    },

    currentSalary() {
      const job = this.currentJob
      const rank = this.currentRank
      if (!job || !rank) return 0
      return Math.floor(job.baseSalary * rank.salaryMultiplier)
    },
  },

  actions: {
    applyForJob(jobId) {
      const job = getJobById(jobId)
      if (!job) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (player.level < job.requirements.level) {
        gameStore.addNotification(`Χρειάζεσαι επίπεδο ${job.requirements.level}!`, 'danger')
        return false
      }
      if (player.filotimo < job.requirements.filotimo) {
        gameStore.addNotification(`Χρειάζεσαι ${job.requirements.filotimo} Φιλότιμο!`, 'danger')
        return false
      }

      this.currentJobId = jobId
      this.workStats = 0
      this.lastWorked = null
      gameStore.addNotification(`Προσλήφθηκες: ${job.name}!`, 'success')
      player.logActivity(`💼 Νέα δουλειά: ${job.name}`, 'info')
      gameStore.saveGame()
      return true
    },

    work() {
      if (!this.canWork) return false

      const job = this.currentJob
      if (!job) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (player.isIncapacitated) {
        gameStore.addNotification('Δεν μπορείς να δουλέψεις τώρα!', 'danger')
        return false
      }

      // Earn salary
      const salary = this.currentSalary
      player.addCash(salary)

      // Gain work stats
      this.workStats += 1

      // Gain battle stat bonuses
      for (const [stat, gain] of Object.entries(job.statBonuses)) {
        player.trainStat(stat, gain)
      }

      // Apply passive bonus
      if (job.passiveBonus) {
        switch (job.passiveBonus.type) {
          case 'happiness':
            player.modifyResource('happiness', job.passiveBonus.value)
            break
          case 'filotimo':
            player.addFilotimo(job.passiveBonus.value)
            break
          case 'meson':
            player.addMeson(job.passiveBonus.value)
            break
        }
      }

      this.lastWorked = Date.now()

      player.logActivity(`💼 ${job.name}: +€${salary}`, 'cash')
      gameStore.addNotification(`Δούλεψες! +€${salary}`, 'cash')
      gameStore.saveGame()
      return true
    },

    quitJob() {
      const gameStore = useGameStore()
      const player = usePlayerStore()
      const jobName = this.currentJob?.name || 'δουλειά'
      this.currentJobId = null
      this.workStats = 0
      this.lastWorked = null
      player.logActivity(`💼 Παραιτήθηκε από ${jobName}`, 'info')
      gameStore.addNotification('Παραιτήθηκες!', 'warning')
      gameStore.saveGame()
    },

    getSerializable() {
      return {
        currentJobId: this.currentJobId,
        workStats: this.workStats,
        lastWorked: this.lastWorked,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.currentJobId !== undefined) this.currentJobId = data.currentJobId
      if (data.workStats !== undefined) this.workStats = data.workStats
      if (data.lastWorked !== undefined) this.lastWorked = data.lastWorked
    },
  }
})
