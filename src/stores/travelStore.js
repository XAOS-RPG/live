import { defineStore } from 'pinia'
import { locations, getLocationById, getTravelTime } from '../data/locations'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useMissionStore } from './missionStore'

// Cost per minute of train travel (€)
const COST_PER_MINUTE = 25

export function calculateTravelCost(travelTimeMs, mode) {
  const minutes = Math.ceil(travelTimeMs / 60000)
  const base = Math.max(50, minutes * COST_PER_MINUTE)
  return mode === 'plane' ? base * 2 : base
}

// Hospital durations on failure (ms)
const HOSPITAL_MS = {
  train: 10 * 60 * 1000,   // 10 minutes
  plane: 30 * 60 * 1000,   // 30 minutes
}

export const useTravelStore = defineStore('travel', {
  state: () => ({
    currentLocation: 'athens',
  }),

  getters: {
    currentLocationData() {
      return getLocationById(this.currentLocation) || locations[0]
    },

    availableDestinations() {
      return locations.filter(l => l.id !== this.currentLocation)
    },

    isTraveling() {
      const player = usePlayerStore()
      return player.activeActivity?.type === 'travel'
    },

    crimeRewardMultiplier() {
      return this.currentLocationData.bonuses.crimeReward
    },

    shopDiscountMultiplier() {
      return this.currentLocationData.bonuses.shopDiscount
    },

    gymBoostMultiplier() {
      return this.currentLocationData.bonuses.gymBoost
    },
  },

  actions: {
    /**
     * @param {string} destinationId
     * @param {'train'|'plane'} mode
     */
    startTravel(destinationId, mode = 'train') {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (!player.canAct) {
        return { started: false, message: 'Δεν μπορείς να ταξιδέψεις τώρα!' }
      }

      const destination = getLocationById(destinationId)
      if (!destination) {
        return { started: false, message: 'Άγνωστος προορισμός' }
      }

      if (destinationId === this.currentLocation) {
        return { started: false, message: 'Είσαι ήδη εδώ!' }
      }

      const baseTravelTime = getTravelTime(this.currentLocation, destinationId)
      const duration = mode === 'plane' ? Math.floor(baseTravelTime / 2) : baseTravelTime
      const cost = calculateTravelCost(baseTravelTime, mode)

      if (player.cash < cost) {
        return { started: false, message: `Χρειάζεσαι €${cost} για το εισιτήριο!` }
      }

      // Pre-roll the dice (1 = failure, 2–6 = success)
      const roll = Math.floor(Math.random() * 6) + 1
      const success = roll >= 2

      const consequence = mode === 'train'
        ? '🚆 Το τρένο εκτροχιάστηκε! Νοσοκομείο 10 λεπτά.'
        : '✈️ Αναγκαστική προσγείωση στη θάλασσα! Νοσοκομείο 30 λεπτά.'

      const modeIcon = mode === 'plane' ? '✈️' : '🚆'
      const modeLabel = mode === 'plane' ? 'Αεροπλάνο' : 'Τρένο'

      player.removeCash(cost)

      player.startActivity({
        type: 'travel',
        id: destinationId,
        label: `${modeLabel} → ${destination.name}`,
        icon: modeIcon,
        duration,
        preRolled: {
          success,
          roll,
          targetRoll: 2,
          destinationId,
          mode,
          consequence: success ? null : consequence,
          hospitalMs: success ? 0 : HOSPITAL_MS[mode],
        },
      })

      gameStore.saveGame()
      return { started: true, cost }
    },

    arriveAtDestination(destinationId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const destination = getLocationById(destinationId)

      this.currentLocation = destinationId
      const name = destination ? destination.name : destinationId

      player.logActivity(`✈️ Έφτασες: ${name}`, 'info')
      gameStore.addNotification(`Καλώς ήρθες στ${getArticle(name)} ${name}!`, 'success')
      useMissionStore().updateProgress('travel', 1)
      gameStore.saveGame()
    },

    handleTravelFailure(mode) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const hospitalMs = HOSPITAL_MS[mode] ?? HOSPITAL_MS.train

      player.setStatus('hospital', hospitalMs)
      player.resources.hp.current = Math.max(1, Math.floor(player.resources.hp.max * 0.3))

      const msg = mode === 'plane'
        ? '✈️ Το αεροπλάνο έπεσε στη θάλασσα! Νοσοκομείο 30 λεπτά.'
        : '🚆 Εκτροχιασμός! Νοσοκομείο 10 λεπτά.'

      player.logActivity(msg, 'danger')
      gameStore.addNotification(mode === 'plane' ? 'Ατύχημα αεροπλάνου! 30λ νοσοκομείο.' : 'Εκτροχιασμός! 10λ νοσοκομείο.', 'danger')
      gameStore.saveGame()
    },

    getSerializable() {
      return {
        currentLocation: this.currentLocation,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.currentLocation) this.currentLocation = data.currentLocation
    },
  },
})

function getArticle(name) {
  const feminineStarts = ['Α', 'Θ', 'Π', 'Κ', 'Σ', 'Μ']
  if (feminineStarts.includes(name.charAt(0))) return 'ην'
  return 'ο'
}
