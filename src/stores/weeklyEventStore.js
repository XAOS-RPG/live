import { defineStore } from 'pinia'
import { getEventForWeek, getWeekEndTimestamp, getFestivalCity, getISOWeekNumber } from '../data/weeklyEvents'

export const useWeeklyEventStore = defineStore('weeklyEvent', {
  state: () => ({
    activeEventId: null,
    activeWeek: null, // "YYYY-WW"
    festivalCityId: null,
    notifiedThisWeek: false,
  }),

  getters: {
    activeEvent() {
      const event = getEventForWeek()
      return event
    },

    festivalCity() {
      return getFestivalCity()
    },

    timeRemaining() {
      return Math.max(0, getWeekEndTimestamp() - Date.now())
    },

    daysLeft() {
      return Math.ceil(this.timeRemaining / (24 * 60 * 60 * 1000))
    },

    /**
     * Merged modifiers object for the current active event.
     * Other stores call this to check for active bonuses.
     */
    modifiers() {
      const event = this.activeEvent
      if (!event) return {}
      return { ...event.modifiers }
    },

    /** Convenience getters for specific modifiers (return 1.0 if not active). */
    xpMultiplier()             { return this.modifiers.xpMultiplier ?? 1.0 },
    crimeSuccessMultiplier()   { return this.modifiers.crimeSuccessMultiplier ?? 1.0 },
    crimeRewardMultiplier()    { return this.modifiers.crimeRewardMultiplier ?? 1.0 },
    shopPriceMultiplier()      { return this.modifiers.shopPriceMultiplier ?? 1.0 },
    combatRewardMultiplier()   { return this.modifiers.combatRewardMultiplier ?? 1.0 },
    hospitalTimeMultiplier()   { return this.modifiers.hospitalTimeMultiplier ?? 1.0 },
    stockVolatilityMultiplier(){ return this.modifiers.stockVolatilityMultiplier ?? 1.0 },
    itemDropMultiplier()       { return this.modifiers.itemDropMultiplier ?? 1.0 },
    gymGainMultiplier()        { return this.modifiers.gymGainMultiplier ?? 1.0 },
    happinessDecayMultiplier() { return this.modifiers.happinessDecayMultiplier ?? 1.0 },
    festivalCityBonus()        { return this.modifiers.festivalCityBonus ?? 1.0 },
  },

  actions: {
    /**
     * Called on game load and periodically — check if the week changed
     * and fire a notification for the new event.
     */
    checkWeeklyRotation() {
      const now = new Date()
      const weekKey = `${now.getFullYear()}-W${getISOWeekNumber(now)}`

      if (this.activeWeek !== weekKey) {
        this.activeWeek = weekKey
        this.activeEventId = this.activeEvent.id
        this.festivalCityId = getFestivalCity()
        this.notifiedThisWeek = false
      }
    },

    getSerializable() {
      return {
        activeEventId: this.activeEventId,
        activeWeek: this.activeWeek,
        festivalCityId: this.festivalCityId,
        notifiedThisWeek: this.notifiedThisWeek,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.activeEventId !== undefined) this.activeEventId = data.activeEventId
      if (data.activeWeek !== undefined) this.activeWeek = data.activeWeek
      if (data.festivalCityId !== undefined) this.festivalCityId = data.festivalCityId
      if (data.notifiedThisWeek !== undefined) this.notifiedThisWeek = data.notifiedThisWeek
    },
  },
})
