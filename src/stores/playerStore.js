import { defineStore } from 'pinia'
import { RESOURCE_DEFAULTS, REGEN_RATES, FILOTIMO_MAX, MESON_MAX, ACTIVITY_LOG_MAX } from '../data/constants'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    name: '',
    gender: 'male', // Το φύλο του παίκτη (male/female)
    level: 1,
    xp: 0,

    stats: {
      strength: 5,
      speed: 5,
      dexterity: 5,
      defense: 5,
    },

    resources: {
      hp:        { current: RESOURCE_DEFAULTS.hp.max,        max: RESOURCE_DEFAULTS.hp.max },
      energy:    { current: RESOURCE_DEFAULTS.energy.max,    max: RESOURCE_DEFAULTS.energy.max },
      nerve:     { current: RESOURCE_DEFAULTS.nerve.max,     max: RESOURCE_DEFAULTS.nerve.max },
      happiness: { current: 100,                              max: RESOURCE_DEFAULTS.happiness.max },
    },

    regenAccumulators: {
      hp: 0,
      energy: 0,
      nerve: 0,
      happiness: 0,
    },

    cash: 500,
    bank: 0,
    vault: 0,

    filotimo: 50,
    meson: 0,

    crimeXP: 0,

    status: 'free',        // 'free' | 'hospital' | 'jail'
    statusTimerEnd: null,

    // Activity system: player can do one thing at a time
    // { type: 'crime'|'gym', id, label, icon, startTime, duration, preRolled: {...} }
    activeActivity: null,
    // Holds result after activity completes, until dice animation finishes
    // { type, success, roll, targetRoll, rewards, ... }
    pendingResult: null,

    lastTick: Date.now(),
    createdAt: Date.now(),

    activityLog: [],
  }),

  getters: {
    totalStats() {
      return this.stats.strength + this.stats.speed + this.stats.dexterity + this.stats.defense
    },

    isIncapacitated() {
      return this.status !== 'free'
    },

    xpToNextLevel() {
      return Math.floor(100 * Math.pow(1.2, this.level - 1))
    },

    xpProgress() {
      return this.xp / this.xpToNextLevel
    },

    statusTimeRemaining() {
      if (!this.statusTimerEnd) return 0
      // Reference lastTick so this getter recomputes every game loop frame
      return Math.max(0, this.statusTimerEnd - this.lastTick)
    },

    isBusy() {
      return this.activeActivity !== null
    },

    canAct() {
      return this.status === 'free' && !this.activeActivity && !this.pendingResult
    },

    /** Πολλαπλασιαστής χρόνου για την τρέχουσα δραστηριότητα (1 = κανονικά, 3 = γρήγορα). */
    activityTimeScale() {
      if (!this.activeActivity) return 1
      const s = Number(this.activeActivity.timeScale)
      return Number.isFinite(s) && s >= 1 ? s : 1
    },

    activityTimeRemaining() {
      if (!this.activeActivity) return 0
      // Reference lastTick so this getter recomputes every game loop frame
      const scale = this.activityTimeScale
      const elapsed = (this.lastTick - this.activeActivity.startTime) * scale
      return Math.max(0, this.activeActivity.duration - elapsed)
    },

    activityProgress() {
      if (!this.activeActivity) return 0
      const scale = this.activityTimeScale
      const elapsed = (this.lastTick - this.activeActivity.startTime) * scale
      return Math.min(1, elapsed / this.activeActivity.duration)
    },

    happinessMultiplier() {
      return 1 + (this.resources.happiness.current / Math.max(1, this.resources.happiness.max)) * 0.5
    },

    rankTitle() {
      const titles = [
        { level: 1, title: 'Αρχάριος' },
        { level: 3, title: 'Αδαής' },
        { level: 5, title: 'Μαθητευόμενος' },
        { level: 8, title: 'Ικανός' },
        { level: 12, title: 'Έμπειρος' },
        { level: 16, title: 'Επαγγελματίας' },
        { level: 20, title: 'Επικίνδυνος' },
        { level: 25, title: 'Τρομερός' },
        { level: 30, title: 'Θρυλικός' },
      ]
      let rank = titles[0].title
      for (const t of titles) {
        if (this.level >= t.level) rank = t.title
      }
      return rank
    },
  },

  actions: {
    initializeCharacter(name, gender, statAllocation) {
      this.name = name
      this.gender = gender
      this.stats.strength = statAllocation.strength
      this.stats.speed = statAllocation.speed
      this.stats.dexterity = statAllocation.dexterity
      this.stats.defense = statAllocation.defense
      this.resources.hp.current = this.resources.hp.max
      this.resources.energy.current = this.resources.energy.max
      this.resources.nerve.current = this.resources.nerve.max
      this.resources.happiness.current = 100
      this.cash = 500
      this.filotimo = 50
      this.meson = 0
      this.crimeXP = 0
      this.level = 1
      this.xp = 0
      this.status = 'free'
      this.statusTimerEnd = null
      this.lastTick = Date.now()
      this.createdAt = Date.now()
      this.activityLog = []
      this.regenAccumulators = { hp: 0, energy: 0, nerve: 0, happiness: 0 }
      this.activeActivity = null
      this.pendingResult = null
    },

    addXP(amount) {
      this.xp += amount
      while (this.xp >= this.xpToNextLevel) {
        this.xp -= this.xpToNextLevel
        this.level++
        // Increase HP max by 5 per level
        this.resources.hp.max += 5
        this.resources.hp.current = this.resources.hp.max
        this.logActivity(`Ανέβηκες Επίπεδο ${this.level}!`, 'xp')
      }
    },

    addCash(amount) {
      this.cash += amount
    },

    removeCash(amount) {
      this.cash = Math.max(0, this.cash - amount)
    },

    /** Για δοκιμές: ορίζει άμεσα τα μετρητά (>= 0). */
    setCash(amount) {
      const n = Number(amount)
      if (!Number.isFinite(n)) return
      this.cash = Math.max(0, Math.min(Math.floor(n), Number.MAX_SAFE_INTEGER))
    },

    modifyResource(type, amount) {
      const res = this.resources[type]
      if (!res) return
      res.current = Math.min(res.max, Math.max(0, Math.floor(res.current + amount)))
    },

    trainStat(statName, gain) {
      if (this.stats[statName] !== undefined) {
        this.stats[statName] += gain
      }
    },

    setStatus(status, durationMs) {
      this.status = status
      this.statusTimerEnd = Date.now() + durationMs
    },

    clearStatus() {
      this.status = 'free'
      this.statusTimerEnd = null
    },

    addFilotimo(amount) {
      this.filotimo = Math.min(FILOTIMO_MAX, Math.max(0, this.filotimo + amount))
    },

    addMeson(amount) {
      this.meson = Math.min(MESON_MAX, Math.max(0, this.meson + amount))
    },

    addCrimeXP(amount) {
      this.crimeXP += amount
    },

    startActivity(activity) {
      // activity: { type, id, label, icon, startTime, duration, preRolled, timeScale? }
      this.activeActivity = {
        ...activity,
        startTime: Date.now(),
        timeScale: activity.timeScale != null ? Math.max(1, Number(activity.timeScale) || 1) : 1,
      }
      this.pendingResult = null
    },

    /** Ενεργοποίηση x3 μόνο (δεν γυρνάει ποτέ σε κανονική ροή μέχρι να τελειώσει το task). */
    enableActivityFastForward() {
      if (!this.activeActivity || this.pendingResult) return
      const cur = Number(this.activeActivity.timeScale) || 1
      if (cur >= 3) return
      this.activeActivity.timeScale = 3
    },

    resolveActivity() {
      if (!this.activeActivity) return null
      const activity = this.activeActivity
      const result = {
        type: activity.type,
        id: activity.id,
        label: activity.label,
        icon: activity.icon,
        ...activity.preRolled,
      }
      this.pendingResult = result
      this.activeActivity = null
      return result
    },

    clearPendingResult() {
      this.pendingResult = null
    },

    logActivity(message, type = 'info') {
      this.activityLog.unshift({
        message,
        type,
        timestamp: Date.now()
      })
      if (this.activityLog.length > ACTIVITY_LOG_MAX) {
        this.activityLog.pop()
      }
    },

    tickRegen(deltaMs) {
      // Check hospital/jail timer
      if (this.status !== 'free' && this.statusTimerEnd) {
        if (Date.now() >= this.statusTimerEnd) {
          const was = this.status
          this.clearStatus()
          if (was === 'hospital') {
            this.resources.hp.current = Math.max(1, Math.floor(this.resources.hp.max * 0.5))
          }
        }
      }

      // Check if active activity timer has expired (timeScale = «fast forward» μόνο για αυτό το task)
      if (this.activeActivity && !this.pendingResult) {
        const scale = Number(this.activeActivity.timeScale)
        const timeScale = Number.isFinite(scale) && scale >= 1 ? scale : 1
        const elapsed = (Date.now() - this.activeActivity.startTime) * timeScale
        if (elapsed >= this.activeActivity.duration) {
          this.resolveActivity()
        }
      }

      // Regen resources
      for (const [key, rate] of Object.entries(REGEN_RATES)) {
        const res = this.resources[key]
        if (!res) continue

        // Calculate how much to accumulate
        const regenPerMs = rate.amount / rate.intervalMs
        this.regenAccumulators[key] += deltaMs * regenPerMs

        if (rate.amount > 0) {
          // Positive regen (hp, energy, nerve)
          if (this.regenAccumulators[key] >= 1) {
            const gain = Math.floor(this.regenAccumulators[key])
            this.regenAccumulators[key] -= gain
            res.current = Math.min(res.max, res.current + gain)
          }
        } else {
          // Decay (happiness)
          if (this.regenAccumulators[key] <= -1) {
            const loss = Math.floor(Math.abs(this.regenAccumulators[key]))
            this.regenAccumulators[key] += loss
            res.current = Math.max(0, res.current - loss)
          }
        }
      }

      this.lastTick = Date.now()
    },

    getSerializable() {
      return {
        name: this.name,
        gender: this.gender,
        level: this.level,
        xp: this.xp,
        stats: { ...this.stats },
        resources: {
          hp: { ...this.resources.hp },
          energy: { ...this.resources.energy },
          nerve: { ...this.resources.nerve },
          happiness: { ...this.resources.happiness },
        },
        regenAccumulators: { ...this.regenAccumulators },
        cash: this.cash,
        bank: this.bank,
        vault: this.vault,
        filotimo: this.filotimo,
        meson: this.meson,
        crimeXP: this.crimeXP,
        status: this.status,
        statusTimerEnd: this.statusTimerEnd,
        activeActivity: this.activeActivity ? { ...this.activeActivity } : null,
        pendingResult: this.pendingResult ? { ...this.pendingResult } : null,
        lastTick: this.lastTick,
        createdAt: this.createdAt,
        activityLog: [...this.activityLog],
      }
    },

    hydrate(data) {
      if (!data) return
      Object.keys(data).forEach(key => {
        if (key === 'stats') {
          Object.assign(this.stats, data.stats)
        } else if (key === 'resources') {
          for (const rKey of ['hp', 'energy', 'nerve', 'happiness']) {
            if (data.resources[rKey]) {
              Object.assign(this.resources[rKey], data.resources[rKey])
            }
          }
        } else if (key === 'regenAccumulators') {
          Object.assign(this.regenAccumulators, data.regenAccumulators)
        } else if (this.$state.hasOwnProperty(key)) {
          this[key] = data[key]
        }
      })
    },
  }
})
