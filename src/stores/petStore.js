import { defineStore } from 'pinia'
import { petDefinitions, getPetDefinition, getPetBonusMultiplier, trainingXpForLevel } from '../data/pets'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

const FEED_INTERVAL_MS = 24 * 60 * 60 * 1000  // 24 hours
const ABANDON_MS = 48 * 60 * 60 * 1000        // 48 hours without feeding → pet leaves
const TRAIN_COOLDOWN_MS = 4 * 60 * 60 * 1000  // 4 hours between training
const HAPPINESS_DECAY_INTERVAL = 6 * 60 * 60 * 1000 // happiness drops every 6h without play

export const usePetStore = defineStore('pet', {
  state: () => ({
    // All owned pets: { petId, level, trainingXp, happiness, lastFed, lastTrained, lastPlayed }
    ownedPets: [],
    // Currently active pet id (only 1 active at a time)
    activePetId: null,
    lastPetTick: 0,
  }),

  getters: {
    activePet() {
      if (!this.activePetId) return null
      return this.ownedPets.find(p => p.petId === this.activePetId) || null
    },

    activePetDef() {
      if (!this.activePetId) return null
      return getPetDefinition(this.activePetId)
    },

    hasPet() {
      return this.ownedPets.length > 0
    },

    /**
     * Get the bonus multiplier for a specific bonus type from the active pet.
     * Returns 1.0 if no active pet or pet doesn't provide this bonus.
     */
    bonusFor() {
      return (bonusType) => {
        const pet = this.activePet
        if (!pet) return 1.0
        const def = getPetDefinition(pet.petId)
        if (!def || def.bonusType !== bonusType) return 1.0
        if (pet.happiness <= 0) return 1.0 // unhappy pet gives no bonus
        return getPetBonusMultiplier(def, pet.level)
      }
    },

    /** Convenience getters for each bonus type */
    crimeSuccessBonus()  { return this.bonusFor('crimeSuccess') },
    casinoLuckBonus()    { return this.bonusFor('casinoLuck') },
    combatDamageBonus()  { return this.bonusFor('combatDamage') },
    sellPriceBonus()     { return this.bonusFor('sellPrice') },
    jailReductionBonus() { return this.bonusFor('jailReduction') },
    eduSpeedBonus()      { return this.bonusFor('eduSpeed') },
    xpBoostBonus()       { return this.bonusFor('xpBoost') },
    gymGainBonus()       { return this.bonusFor('gymGain') },
  },

  actions: {
    /**
     * Buy a new pet.
     */
    buyPet(petId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const def = getPetDefinition(petId)
      if (!def) return false

      if (player.level < def.requiredLevel) {
        gameStore.addNotification(`Χρειάζεσαι Level ${def.requiredLevel}!`, 'danger')
        return false
      }

      if (this.ownedPets.find(p => p.petId === petId)) {
        gameStore.addNotification('Έχεις ήδη αυτό το κατοικίδιο!', 'warning')
        return false
      }

      if (player.cash < def.buyPrice) {
        gameStore.addNotification(`Χρειάζεσαι €${def.buyPrice}!`, 'danger')
        return false
      }

      player.removeCash(def.buyPrice)

      const now = Date.now()
      this.ownedPets.push({
        petId,
        level: 1,
        trainingXp: 0,
        happiness: 100,
        lastFed: now,
        lastTrained: 0,
        lastPlayed: now,
      })

      // Auto-activate if no active pet
      if (!this.activePetId) {
        this.activePetId = petId
      }

      gameStore.addNotification(`Απέκτησες: ${def.icon} ${def.name}!`, 'success')
      player.logActivity(`🐾 Νέο κατοικίδιο: ${def.name}`, 'info')
      gameStore.saveGame()
      return true
    },

    /**
     * Feed the active pet (costs cash).
     */
    feedPet(petId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const pet = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false

      const def = getPetDefinition(petId)
      if (!def) return false

      if (player.cash < def.feedCost) {
        gameStore.addNotification(`Χρειάζεσαι €${def.feedCost} για τροφή!`, 'danger')
        return false
      }

      player.removeCash(def.feedCost)
      pet.lastFed = Date.now()
      pet.happiness = Math.min(100, pet.happiness + 20)

      gameStore.addNotification(`${def.icon} Τάισες τ${def.name === 'Γάτα' || def.name === 'Σαύρα' || def.name === 'Χελώνα' ? 'η' : 'ο'}ν ${def.name}! (-€${def.feedCost})`, 'success')
      gameStore.saveGame()
      return true
    },

    /**
     * Play with pet (+happiness).
     */
    playWithPet(petId) {
      const gameStore = useGameStore()
      const pet = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false

      const def = getPetDefinition(petId)
      pet.happiness = Math.min(100, pet.happiness + 30)
      pet.lastPlayed = Date.now()

      gameStore.addNotification(`${def.icon} Έπαιξες με τ${def.name === 'Γάτα' || def.name === 'Σαύρα' || def.name === 'Χελώνα' ? 'η' : 'ο'}ν ${def.name}! +30 Χαρά`, 'success')
      gameStore.saveGame()
      return true
    },

    /**
     * Train pet (gives XP toward next level, has cooldown).
     */
    trainPet(petId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const pet = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false

      const def = getPetDefinition(petId)
      if (!def) return false

      if (pet.level >= def.maxLevel) {
        gameStore.addNotification('Το κατοικίδιο είναι max level!', 'warning')
        return false
      }

      const now = Date.now()
      if (pet.lastTrained && now - pet.lastTrained < TRAIN_COOLDOWN_MS) {
        const remaining = Math.ceil((TRAIN_COOLDOWN_MS - (now - pet.lastTrained)) / 60000)
        gameStore.addNotification(`Εκπαίδευση ξανά σε ${remaining} λεπτά!`, 'warning')
        return false
      }

      const energyCost = 10
      if (player.resources.energy.current < energyCost) {
        gameStore.addNotification('Δεν έχεις αρκετή ενέργεια!', 'danger')
        return false
      }

      player.resources.energy.current -= energyCost
      pet.lastTrained = now

      const xpGain = 10 + Math.floor(Math.random() * 10)
      pet.trainingXp += xpGain

      const needed = trainingXpForLevel(pet.level)
      if (pet.trainingXp >= needed) {
        pet.trainingXp -= needed
        pet.level++
        const mult = getPetBonusMultiplier(def, pet.level)
        const bonusPercent = ((mult - 1) * 100).toFixed(0)
        gameStore.addNotification(`${def.icon} ${def.name} ανέβηκε Level ${pet.level}! ${def.bonusLabel}: +${bonusPercent}%`, 'success')
        player.logActivity(`🐾 ${def.name} → Level ${pet.level}`, 'xp')
      } else {
        gameStore.addNotification(`${def.icon} Εκπαίδευση: +${xpGain} XP (${pet.trainingXp}/${needed})`, 'info')
      }

      gameStore.saveGame()
      return true
    },

    /**
     * Set the active pet.
     */
    setActivePet(petId) {
      const gameStore = useGameStore()
      if (petId && !this.ownedPets.find(p => p.petId === petId)) return false
      this.activePetId = petId
      if (petId) {
        const def = getPetDefinition(petId)
        gameStore.addNotification(`${def.icon} ${def.name} είναι τώρα ενεργό!`, 'info')
      }
      gameStore.saveGame()
      return true
    },

    /**
     * Called periodically — checks hunger, happiness decay, abandonment.
     */
    tickPets() {
      const now = Date.now()
      // Only tick every 5 minutes (called from rAF game loop)
      if (now - this.lastPetTick < 5 * 60 * 1000) return
      this.lastPetTick = now

      const gameStore = useGameStore()
      const player = usePlayerStore()
      let changed = false

      for (let i = this.ownedPets.length - 1; i >= 0; i--) {
        const pet = this.ownedPets[i]
        const def = getPetDefinition(pet.petId)

        // Happiness decay if not played with recently
        if (now - pet.lastPlayed > HAPPINESS_DECAY_INTERVAL) {
          const decayPeriods = Math.floor((now - pet.lastPlayed) / HAPPINESS_DECAY_INTERVAL)
          const newHappiness = Math.max(0, pet.happiness - decayPeriods * 5)
          if (newHappiness !== pet.happiness) {
            pet.happiness = newHappiness
            changed = true
          }
        }

        // Abandonment check — if not fed for 48h
        if (now - pet.lastFed > ABANDON_MS) {
          const name = def?.name || pet.petId
          const icon = def?.icon || '🐾'
          gameStore.addNotification(`${icon} ${name} έφυγε! Δεν τ${name === 'Γάτα' || name === 'Σαύρα' || name === 'Χελώνα' ? 'η' : 'ο'}ν τάιζες...`, 'danger')
          player.logActivity(`🐾 ${name} εγκατέλειψε τον παίκτη`, 'danger')

          if (this.activePetId === pet.petId) {
            this.activePetId = null
          }
          this.ownedPets.splice(i, 1)
          changed = true
        }
      }

      if (changed) {
        gameStore.saveGame()
      }
    },

    /**
     * Check if a pet needs feeding (warning at 20h).
     */
    petNeedsFeeding(petId) {
      const pet = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false
      return Date.now() - pet.lastFed > (FEED_INTERVAL_MS - 4 * 60 * 60 * 1000)
    },

    /**
     * Time until pet can be trained again.
     */
    trainCooldownRemaining(petId) {
      const pet = this.ownedPets.find(p => p.petId === petId)
      if (!pet || !pet.lastTrained) return 0
      return Math.max(0, TRAIN_COOLDOWN_MS - (Date.now() - pet.lastTrained))
    },

    getSerializable() {
      return {
        ownedPets: this.ownedPets.map(p => ({ ...p })),
        activePetId: this.activePetId,
      }
    },

    hydrate(data) {
      if (!data) return
      if (Array.isArray(data.ownedPets)) this.ownedPets = data.ownedPets.map(p => ({ ...p }))
      if (data.activePetId !== undefined) this.activePetId = data.activePetId
    },
  },
})
