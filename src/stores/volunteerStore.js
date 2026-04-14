import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useCardStore } from './cardStore'

export const CIVIC_DUTIES = [
  { id: 'beach_cleanup',   name: 'Καθαρισμός Παραλίας', icon: '🏖️', filotimo: 8,  happiness: 5, energyCost: 30, description: 'Μάζεψε σκουπίδια από την παραλία.' },
  { id: 'food_drive',      name: 'Συλλογή Τροφίμων',    icon: '🥫', filotimo: 10, happiness: 5, energyCost: 30, description: 'Μοίρασε τρόφιμα σε οικογένειες που έχουν ανάγκη.' },
  { id: 'tree_planting',   name: 'Φύτεμα Δέντρων',      icon: '🌳', filotimo: 6,  happiness: 8, energyCost: 30, description: 'Φύτεψε δέντρα στην πόλη.' },
  { id: 'elderly_help',    name: 'Βοήθεια Ηλικιωμένων', icon: '👴', filotimo: 7,  happiness: 6, energyCost: 30, description: 'Βοήθησε ηλικιωμένους με τις καθημερινές τους ανάγκες.' },
  { id: 'graffiti_clean',  name: 'Καθαρισμός Γκράφιτι', icon: '🖌️', filotimo: 5,  happiness: 4, energyCost: 30, description: 'Καθάρισε γκράφιτι από δημόσιους χώρους.' },
]

const CHARITY_COST = 1000
const CHARITY_FILOTIMO = 10

export const useVolunteerStore = defineStore('volunteer', {
  state: () => ({
    // { dutyId: lastTimestamp }
    lastDutyTime: {},
    totalDutiesCompleted: 0,
    totalDonated: 0,
  }),

  getters: {
    canDoDuty() {
      return (dutyId) => {
        const last = this.lastDutyTime[dutyId]
        if (!last) return true
        // 1 hour cooldown per duty
        return Date.now() - last >= 60 * 60 * 1000
      }
    },

    dutyCooldownRemaining() {
      return (dutyId) => {
        const last = this.lastDutyTime[dutyId]
        if (!last) return 0
        return Math.max(0, 60 * 60 * 1000 - (Date.now() - last))
      }
    },
  },

  actions: {
    performDuty(dutyId) {
      const duty = CIVIC_DUTIES.find(d => d.id === dutyId)
      if (!duty) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (!this.canDoDuty(dutyId)) {
        gameStore.addNotification('Αυτή η εθελοντική δράση είναι σε cooldown!', 'warning')
        return false
      }
      if (player.resources.energy.current < duty.energyCost) {
        gameStore.addNotification(`Χρειάζεσαι ${duty.energyCost} Ενέργεια!`, 'danger')
        return false
      }

      player.modifyResource('energy', -duty.energyCost)

      const filotimoGain = Math.round(duty.filotimo * useCardStore().filotimoBonus)
      player.addFilotimoRaw(filotimoGain)
      player.modifyResource('happiness', duty.happiness)

      this.lastDutyTime[dutyId] = Date.now()
      this.totalDutiesCompleted++

      gameStore.addNotification(`${duty.icon} ${duty.name}: +${filotimoGain} Φιλότιμο, +${duty.happiness} Κέφι!`, 'success')
      player.logActivity(`${duty.icon} Εθελοντισμός: ${duty.name} +${filotimoGain} Φιλότιμο`, 'info')
      gameStore.saveGame()
      return true
    },

    donate() {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (player.cash < CHARITY_COST) {
        gameStore.addNotification(`Χρειάζεσαι €${CHARITY_COST} για δωρεά!`, 'danger')
        return false
      }

      player.removeCash(CHARITY_COST)
      const filotimoGain = Math.round(CHARITY_FILOTIMO * useCardStore().filotimoBonus)
      player.addFilotimoRaw(filotimoGain)
      this.totalDonated += CHARITY_COST

      gameStore.addNotification(`❤️ Δωρεά €${CHARITY_COST}: +${filotimoGain} Φιλότιμο!`, 'success')
      player.logActivity(`❤️ Φιλανθρωπία: -€${CHARITY_COST} +${filotimoGain} Φιλότιμο`, 'cash')
      gameStore.saveGame()
      return true
    },

    getSerializable() {
      return {
        lastDutyTime: { ...this.lastDutyTime },
        totalDutiesCompleted: this.totalDutiesCompleted,
        totalDonated: this.totalDonated,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.lastDutyTime) this.lastDutyTime = { ...data.lastDutyTime }
      if (data.totalDutiesCompleted !== undefined) this.totalDutiesCompleted = data.totalDutiesCompleted
      if (data.totalDonated !== undefined) this.totalDonated = data.totalDonated
    },
  },
})

export { CHARITY_COST, CHARITY_FILOTIMO }
