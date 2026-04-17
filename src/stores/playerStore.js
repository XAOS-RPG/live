import { defineStore } from 'pinia'
import { RESOURCE_DEFAULTS, REGEN_RATES, FILOTIMO_MAX, MESON_MAX, ACTIVITY_LOG_MAX } from '../data/constants'
import { useGameStore } from './gameStore'
import { useWeeklyEventStore } from './weeklyEventStore'
import { usePetStore } from './petStore'
import { usePrestigeStore } from './prestigeStore'
import { useFactionStore } from './factionStore'
import { useCardStore } from './cardStore'

// Lazy import to avoid circular deps — resolved at call time
function getClassStore() {
  const { useClassStore } = require('./classStore')
  return useClassStore()
}

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
      stamina:   { current: 100,                              max: 100 },
    },

    regenAccumulators: {
      hp: 0,
      energy: 0,
      nerve: 0,
      happiness: 0,
    },

    abilityPoints: 0,
    unlockedAbilities: {},
    equippedAbilities: [], // max 3 ability ids


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

    // Medical Badge from blood donation: { expiresAt: timestamp } or null
    medicalBadge: null,

    // Blood donation cooldown (ms timestamp of last donation)
    bloodDonationLast: 0,

    // Μέσον ability cooldowns: { tilefonoApsila: timestamp | null }
    mesonAbilityCooldowns: { tilefonoApsila: null },

    // PvP immunity granted by Τηλέφωνο από Ψηλά (ms timestamp when it ends)
    pvpImmunityEndsAt: null,
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

    /** Nerve max including faction fortress ops bonus (+1 per level) */
    effectiveNerveMax() {
      return this.resources.nerve.max + useFactionStore().fortressNerveBonus
    },

    /** HP max including equipped card hpMax buff */
    effectiveHpMax() {
      return this.resources.hp.max + useCardStore().hpMaxBonus
    },

    /** Happiness max including equipped card happinessMax buff */
    effectiveHappinessMax() {
      return this.resources.happiness.max + useCardStore().happinessMaxBonus
    },

    /** 10% Market discount when filotimo >= 100 */
    highFilotimoDiscount() {
      return this.filotimo >= 100 ? 0.10 : 0
    },

    /** Access to Μαυραγορίτης exclusive contracts when filotimo is 0 */
    hasLowFilotimo() {
      return this.filotimo === 0
    },

    /** True while PvP immunity from Τηλέφωνο από Ψηλά is active */
    isPvpImmune() {
      return !!(this.pvpImmunityEndsAt && this.pvpImmunityEndsAt > Date.now())
    },

    /** ms remaining until Τηλέφωνο από Ψηλά can be used again (0 = ready) */
    tilefonoCooldownRemaining() {
      const last = this.mesonAbilityCooldowns?.tilefonoApsila
      if (!last) return 0
      return Math.max(0, last + 24 * 60 * 60 * 1000 - Date.now())
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
      this.resources.stamina = { current: 100, max: 100 }
      this.abilityPoints = 0
      this.unlockedAbilities = {}
      this.equippedAbilities = []
      this.activeActivity = null
      this.pendingResult = null
    },

    addXP(amount) {
      // Apply weekly event XP multiplier, pet, prestige, and card bonuses
      const weeklyEvent = useWeeklyEventStore()
      amount = Math.floor(amount * weeklyEvent.xpMultiplier * usePetStore().xpBoostBonus * usePrestigeStore().xpMultiplier * useCardStore().xpGainBonus)
      this.xp += amount
      while (this.xp >= this.xpToNextLevel) {
        this.xp -= this.xpToNextLevel
        this.level++
        // Increase HP max by 5 per level
        this.resources.hp.max += 5
        this.resources.hp.current = this.resources.hp.max
        this.abilityPoints++
        this.logActivity(`Ανέβηκες Επίπεδο ${this.level}! +1 Ability Point`, 'xp')
        getClassStore().checkSpecializationUnlock()
      }
    },

    addCash(amount) {
      this.cash += Math.floor(amount * usePrestigeStore().cashMultiplier)
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
      // Pet snake reduces jail time
      if (status === 'jail') {
        const petReduction = usePetStore().jailReductionBonus
        // jailReductionBonus returns e.g. 1.03 for +3%, we invert: 1/1.03 ≈ 0.97
        durationMs = Math.floor(durationMs / petReduction)
      }
      this.status = status
      this.statusTimerEnd = Date.now() + durationMs
    },

    clearStatus() {
      this.status = 'free'
      this.statusTimerEnd = null
    },

    /** Raw filotimo change — no multiplier (used internally for penalties) */
    addFilotimoRaw(amount) {
      this.filotimo = Math.min(FILOTIMO_MAX, Math.max(0, this.filotimo + amount))
    },

    /** Filotimo gain with Ευεργέτης card multiplier applied (positive amounts only) */
    addFilotimo(amount) {
      if (amount > 0) {
        amount = Math.round(amount * useCardStore().filotimoBonus)
      }
      this.filotimo = Math.min(FILOTIMO_MAX, Math.max(0, this.filotimo + amount))
    },

    /** Grant the Medical Badge buff for 24 hours */
    grantMedicalBadge() {
      this.medicalBadge = { expiresAt: Date.now() + 24 * 60 * 60 * 1000 }
    },

    /** Returns true if Medical Badge is currently active */
    get hasMedicalBadge() {
      return !!(this.medicalBadge && this.medicalBadge.expiresAt > Date.now())
    },

    addMeson(amount) {
      this.meson = Math.min(MESON_MAX, Math.max(0, this.meson + amount))
    },

    /**
     * Spend Μέσον for an ability. Returns false if not enough.
     */
    spendMeson(cost, reason = '') {
      if (this.meson < cost) return false
      this.meson -= cost
      if (reason) this.logActivity(`📞 Μέσον -${cost}${reason ? ': ' + reason : ''}`, 'info')
      return true
    },

    /**
     * Spend Φιλότιμο explicitly (for future spendable filotimo mechanics).
     */
    spendFilotimo(amount, reason = '') {
      if (amount <= 0 || this.filotimo < amount) return false
      this.addFilotimoRaw(-amount)
      if (reason) this.logActivity(`🏛️ Φιλότιμο -${amount}: ${reason}`, 'info')
      return true
    },

    /**
     * Τηλέφωνο από Ψηλά — spend 10 Μέσον to:
     *   A) Clear jail status instantly (if in jail)
     *   B) Grant 10-minute PvP immunity (if free)
     * Cooldown: 24 hours.
     */
    useTilefonoApsila() {
      if (this.tilefonoCooldownRemaining > 0) {
        return { success: false, reason: 'cooldown' }
      }
      if (!this.spendMeson(10, 'Τηλέφωνο από Ψηλά')) {
        return { success: false, reason: 'no_meson' }
      }
      this.mesonAbilityCooldowns.tilefonoApsila = Date.now()

      if (this.status === 'jail') {
        this.clearStatus()
        this.logActivity('📞 Τηλέφωνο από Ψηλά — αποφυλακίστηκες!', 'success')
        useGameStore().addNotification('Ελευθερώθηκες από τη Φυλακή!', 'success')
        useGameStore().saveGame({ immediate: true })
        return { success: true, effect: 'jail_cleared' }
      }

      this.pvpImmunityEndsAt = Date.now() + 10 * 60 * 1000
      this.logActivity('📞 Τηλέφωνο από Ψηλά — 10λεπτη Ασυλία από PvP!', 'success')
      useGameStore().addNotification('Έχεις 10 λεπτά Ασυλία από PvP επιθέσεις!', 'success')
      useGameStore().saveGame({ immediate: true })
      return { success: true, effect: 'pvp_immunity' }
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
      const weeklyEvent = useWeeklyEventStore()
      for (const [key, rate] of Object.entries(REGEN_RATES)) {
        const res = this.resources[key]
        if (!res) continue

        // Effective max — nerve and happiness can be boosted by fortress/cards
        const effectiveMax = key === 'nerve'
          ? this.effectiveNerveMax
          : key === 'happiness'
            ? this.effectiveHappinessMax
            : res.max

        // Calculate how much to accumulate
        let regenPerMs = rate.amount / rate.intervalMs
        // Apply weekly event happiness decay modifier
        if (key === 'happiness' && rate.amount < 0) {
          regenPerMs *= weeklyEvent.happinessDecayMultiplier
        }
        this.regenAccumulators[key] += deltaMs * regenPerMs

        if (rate.amount > 0) {
          // Positive regen (hp, energy, nerve)
          if (this.regenAccumulators[key] >= 1) {
            const gain = Math.floor(this.regenAccumulators[key])
            this.regenAccumulators[key] -= gain
            res.current = Math.min(effectiveMax, res.current + gain)
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

      // Clear expired PvP immunity
      if (this.pvpImmunityEndsAt && Date.now() >= this.pvpImmunityEndsAt) {
        this.pvpImmunityEndsAt = null
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
          stamina: { ...this.resources.stamina },
        },
        abilityPoints: this.abilityPoints,
        unlockedAbilities: { ...this.unlockedAbilities },
        equippedAbilities: [...this.equippedAbilities],
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
        medicalBadge: this.medicalBadge ? { ...this.medicalBadge } : null,
        bloodDonationLast: this.bloodDonationLast,
        mesonAbilityCooldowns: { ...this.mesonAbilityCooldowns },
        pvpImmunityEndsAt: this.pvpImmunityEndsAt,
      }
    },

    hydrate(data) {
      if (!data) return
      Object.keys(data).forEach(key => {
        if (key === 'stats') {
          Object.assign(this.stats, data.stats)
        } else if (key === 'resources') {
          for (const rKey of ['hp', 'energy', 'nerve', 'happiness', 'stamina']) {
            if (data.resources[rKey]) {
              if (!this.resources[rKey]) this.resources[rKey] = { current: 100, max: 100 }
              Object.assign(this.resources[rKey], data.resources[rKey])
            }
          }
        } else if (key === 'regenAccumulators') {
          Object.assign(this.regenAccumulators, data.regenAccumulators)
        } else if (key === 'medicalBadge') {
          this.medicalBadge = data.medicalBadge || null
        } else if (key === 'mesonAbilityCooldowns') {
          Object.assign(this.mesonAbilityCooldowns, data.mesonAbilityCooldowns || {})
        } else if (this.$state.hasOwnProperty(key)) {
          this[key] = data[key]
        }
      })
    },

    hydrateFromProfile(profile) {
      // Convert Supabase profile schema to local player state
      if (!profile) return
      this.name = profile.name || ''
      this.gender = profile.gender || 'male'
      this.level = profile.level || 1
      this.xp = profile.xp || 0
      this.cash = profile.cash || 500
      this.bank = profile.bank || 0
      this.vault = profile.vault || 0
      this.filotimo = profile.filotimo || 50
      this.meson = profile.meson || 0
      this.crimeXP = profile.crime_xp || 0
      this.status = profile.status || 'free'
      this.statusTimerEnd = profile.status_timer_end ? new Date(profile.status_timer_end).getTime() : null
      if (profile.stats) {
        Object.assign(this.stats, profile.stats)
      }
      if (profile.resources) {
        for (const rKey of ['hp', 'energy', 'nerve', 'happiness']) {
          if (profile.resources[rKey]) {
            Object.assign(this.resources[rKey], profile.resources[rKey])
          }
        }
      }
      // Note: regenAccumulators, activityLog, activeActivity, pendingResult are local-only
    },

  }
})
