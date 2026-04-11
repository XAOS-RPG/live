import { defineStore } from 'pinia'
import { crimes, getCrimeById } from '../data/crimes'
import { calculateCrimeSuccess, calculateCrimeReward, calculateJailTime, rollItemDrop, rollD6 } from '../engine/formulas'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { getItemById } from '../data/items'
import { useTravelStore } from './travelStore'
import { useMissionStore } from './missionStore'
import { useAchievementStore } from './achievementStore'

export const useCrimeStore = defineStore('crime', {
  state: () => ({
    crimeAttempts: {},  // { crimeId: { total, successes } }
  }),

  getters: {
    availableCrimes() {
      const player = usePlayerStore()
      return crimes.filter(c => player.crimeXP >= c.requiredCrimeXP)
    },

    lockedCrimes() {
      const player = usePlayerStore()
      return crimes.filter(c => player.crimeXP < c.requiredCrimeXP)
    },

    getCrimeSuccessRate() {
      return (crimeId, variantId = null) => {
        const crime = getCrimeById(crimeId)
        if (!crime) return 0
        const player = usePlayerStore()
        const effective = resolveVariant(crime, variantId)
        return calculateCrimeSuccess(effective, player.stats, player.crimeXP, player.filotimo)
      }
    },
  },

  actions: {
    /**
     * Start a crime — deducts nerve, pre-rolls result, starts activity timer.
     * variantId: for crimes with variants (e.g. shoplifting 'item' or 'cash')
     * Returns { started: true } or { started: false, message }
     */
    startCrime(crimeId, variantId = null) {
      const crime = getCrimeById(crimeId)
      if (!crime) return { started: false, message: 'Άγνωστο έγκλημα' }

      // If crime has variants, a variantId is required
      if (crime.variants && !variantId) {
        return { started: false, message: 'Διάλεξε τρόπο εκτέλεσης.' }
      }

      const effective = resolveVariant(crime, variantId)

      const player = usePlayerStore()

      if (!player.canAct) {
        return { started: false, message: 'Δεν μπορείς να κάνεις κάτι τώρα!' }
      }

      if (player.resources.nerve.current < crime.nerveCost) {
        return { started: false, message: 'Δεν έχεις αρκετό Θράσος!' }
      }

      // Spend nerve
      player.modifyResource('nerve', -crime.nerveCost)

      // Track attempts
      if (!this.crimeAttempts[crimeId]) {
        this.crimeAttempts[crimeId] = { total: 0, successes: 0 }
      }
      this.crimeAttempts[crimeId].total++

      // Pre-roll result at start (prevents save-scumming)
      const successRate = calculateCrimeSuccess(effective, player.stats, player.crimeXP, player.filotimo)
      const { roll, targetRoll, success: succeeded } = rollD6(successRate)

      const preRolled = { success: succeeded, roll, targetRoll, successRate, variantId }

      if (succeeded) {
        const reward = calculateCrimeReward(effective)
        const travelStore = useTravelStore()
        const locationCash = Math.floor(reward.cash * travelStore.crimeRewardMultiplier)

        // Guaranteed item pool (e.g. shoplifting 'item' variant) or random drop
        let droppedItemId = null
        if (effective.guaranteedItemPool?.length) {
          const pool = effective.guaranteedItemPool
          droppedItemId = pool[Math.floor(Math.random() * pool.length)]
        } else {
          droppedItemId = rollItemDrop(effective.possibleItemDrops)
        }

        preRolled.rewards = {
          cash: locationCash,
          crimeXP: reward.crimeXP,
          xp: reward.xp,
          filotimoChange: crime.filotimoChange,
          droppedItemId,
        }
      } else {
        const jailChance = effective.jailChance ?? crime.failure.jailChance
        const goToJail = Math.random() < jailChance
        preRolled.jailed = goToJail
        if (goToJail) {
          preRolled.jailTime = calculateJailTime(crime)
        }
      }

      // Build label — for variant crimes include the variant label
      const variant = variantId && crime.variants ? crime.variants.find(v => v.id === variantId) : null
      const label = variant ? `${crime.name} — ${variant.label}` : crime.name

      // Start activity timer
      player.startActivity({
        type: 'crime',
        id: crimeId,
        label,
        icon: crime.icon,
        duration: crime.duration,
        preRolled,
      })

      const gameStore = useGameStore()
      gameStore.saveGame()

      return { started: true }
    },

    /**
     * Called when crime activity resolves (timer expired, dice shown).
     * Applies rewards/penalties from the pre-rolled result.
     */
    applyCrimeResult(result) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const crime = getCrimeById(result.id)

      if (result.success) {
        const r = result.rewards
        if (this.crimeAttempts[result.id]) {
          this.crimeAttempts[result.id].successes++
        }
        player.addCash(r.cash)
        player.addCrimeXP(r.crimeXP)
        player.addXP(r.xp)
        player.addFilotimo(r.filotimoChange)

        if (r.droppedItemId) {
          const inventoryStore = useInventoryStore()
          inventoryStore.addItem(r.droppedItemId, 1)
          const item = getItemById(r.droppedItemId)
          const itemName = item ? item.name : r.droppedItemId
          player.logActivity(`${result.icon} ${result.label}: ${itemName}`, 'crime')
          gameStore.addNotification(`${result.label}: ${itemName}!`, 'success')
        } else {
          player.logActivity(`${result.icon} ${result.label}: +€${r.cash}`, 'crime')
          if (r.cash > 0) {
            gameStore.addNotification(`${result.label}: +€${r.cash}`, 'success')
          } else {
            gameStore.addNotification(`${result.label}: Επιτυχία!`, 'success')
          }
        }
      } else {
        if (result.jailed) {
          player.setStatus('jail', result.jailTime)
          player.logActivity(`${result.icon} ${result.label}: Αποτυχία — Φυλακή!`, 'jail')
          gameStore.addNotification(`Σε έπιασαν! Φυλακή για ${formatTime(result.jailTime)}`, 'jail')
        } else {
          player.logActivity(`${result.icon} ${result.label}: Αποτυχία`, 'danger')
          gameStore.addNotification(`${result.label}: Αποτυχία!`, 'danger')
        }
      }

      // Track missions & achievements
      const missionStore = useMissionStore()
      missionStore.updateProgress('crime', 1, { success: result.success })
      if (result.success && result.rewards?.cash) {
        missionStore.updateProgress('earn', result.rewards.cash)
      }
      useAchievementStore().checkAchievements()

      gameStore.saveGame()
    },

    getSerializable() {
      return {
        crimeAttempts: { ...this.crimeAttempts },
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.crimeAttempts) this.crimeAttempts = { ...data.crimeAttempts }
    },
  }
})

/** Merge a crime with a specific variant's overrides */
function resolveVariant(crime, variantId) {
  if (!variantId || !crime.variants) return crime
  const variant = crime.variants.find(v => v.id === variantId)
  if (!variant) return crime
  return { ...crime, ...variant }
}

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
