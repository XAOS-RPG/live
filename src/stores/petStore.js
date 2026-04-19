import { defineStore } from 'pinia'
import { petDefinitions, getPetDefinition, getPetBonusMultiplier, trainingXpForLevel } from '../data/pets'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'

const ABANDON_MS          = 48 * 60 * 60 * 1000
const TRAIN_COOLDOWN_MS   = 4  * 60 * 60 * 1000
const WALK_COOLDOWN_MS    = 2  * 60 * 60 * 1000
const BATH_COOLDOWN_MS    = 12 * 60 * 60 * 1000
const HAPPINESS_DECAY_MS  = 6  * 60 * 60 * 1000  // -5 happiness every 6h
const FOOD_DECAY_MS       = 8  * 60 * 60 * 1000  // -20 food every 8h
const CLEAN_DECAY_MS      = 10 * 60 * 60 * 1000  // -15 cleanliness every 10h

// Items dogs can find on walks (Nintendogs-style)
const DOG_WALK_FINDS = [
  { itemId: 'bandage',       name: 'Γάζες',                  icon: '🩹', chance: 0.30 },
  { itemId: 'painkillers',   name: 'Παυσίπονα',              icon: '💊', chance: 0.20 },
  { itemId: 'water',         name: 'Νερό',                   icon: '💧', chance: 0.25 },
  { itemId: 'mat_iron',      name: 'Σίδερο',                 icon: '🔩', chance: 0.15 },
  { itemId: 'mat_wood',      name: 'Ξύλο',                   icon: '🪵', chance: 0.15 },
  { itemId: 'cigarettes',    name: 'Τσιγάρα',                icon: '🚬', chance: 0.20 },
  { itemId: 'toast',         name: 'Τοστ',                   icon: '🍞', chance: 0.25 },
  { itemId: 'mat_battery',   name: 'Μπαταρία',               icon: '🔋', chance: 0.08 },
  { itemId: 'first_aid_kit', name: 'Κιτ Πρώτων Βοηθειών',   icon: '🧰', chance: 0.05 },
  { itemId: 'mat_fabric',    name: 'Ύφασμα',                 icon: '🧵', chance: 0.10 },
  { itemId: 'chocolate',     name: 'Σοκολάτα',               icon: '🍫', chance: 0.12 },
]

// Items cats bring home
const CAT_WALK_FINDS = [
  { itemId: 'dead_bird',   name: 'Νεκρό Πουλί',  icon: '🐦', chance: 0.35, isJunk: true },
  { itemId: 'dead_lizard', name: 'Νεκρή Σαύρα',  icon: '🦎', chance: 0.30, isJunk: true },
  { itemId: 'cigarettes',  name: 'Τσιγάρα',      icon: '🚬', chance: 0.15 },
  { itemId: 'bandage',     name: 'Γάζες',        icon: '🩹', chance: 0.10 },
  { itemId: 'mat_fabric',  name: 'Ύφασμα',       icon: '🧵', chance: 0.08 },
  { itemId: 'chewing_gum', name: 'Τσίχλα',       icon: '🍬', chance: 0.20 },
  { itemId: 'water',       name: 'Νερό',         icon: '💧', chance: 0.15 },
]

const WALKABLE_PETS = ['stray_dog', 'pitbull', 'cat']

function pickWalkFind(table) {
  const roll = Math.random()
  let cumulative = 0
  for (const entry of table) {
    cumulative += entry.chance
    if (roll < cumulative) return entry
  }
  return null
}

export const usePetStore = defineStore('pet', {
  state: () => ({
    ownedPets: [],   // { petId, level, trainingXp, happiness, food, cleanliness, lastFed, lastTrained, lastPlayed, lastWalked, lastBathed }
    activePetId: null,
    lastPetTick: 0,
    lastWalkFind: null,  // { petId, itemId, itemName, itemIcon, isJunk, ts } — shown in UI
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

    hasPet() { return this.ownedPets.length > 0 },

    isWalkable() {
      return (petId) => WALKABLE_PETS.includes(petId)
    },

    bonusFor() {
      return (bonusType) => {
        const pet = this.activePet
        if (!pet) return 1.0
        const def = getPetDefinition(pet.petId)
        if (!def || def.bonusType !== bonusType) return 1.0
        if (pet.happiness <= 0) return 1.0
        return getPetBonusMultiplier(def, pet.level)
      }
    },

    crimeSuccessBonus()  { return this.bonusFor('crimeSuccess') },
    casinoLuckBonus()    { return this.bonusFor('casinoLuck') },
    combatDamageBonus()  { return this.bonusFor('combatDamage') },
    sellPriceBonus()     { return this.bonusFor('sellPrice') },
    jailReductionBonus() { return this.bonusFor('jailReduction') },
    eduSpeedBonus()      { return this.bonusFor('eduSpeed') },
    xpBoostBonus()       { return this.bonusFor('xpBoost') },
    gymGainBonus()       { return this.bonusFor('gymGain') },

    walkCooldownRemaining() {
      return (petId) => {
        const pet = this.ownedPets.find(p => p.petId === petId)
        if (!pet || !pet.lastWalked) return 0
        return Math.max(0, WALK_COOLDOWN_MS - (Date.now() - pet.lastWalked))
      }
    },

    bathCooldownRemaining() {
      return (petId) => {
        const pet = this.ownedPets.find(p => p.petId === petId)
        if (!pet || !pet.lastBathed) return 0
        return Math.max(0, BATH_COOLDOWN_MS - (Date.now() - pet.lastBathed))
      }
    },

    trainCooldownRemaining() {
      return (petId) => {
        const pet = this.ownedPets.find(p => p.petId === petId)
        if (!pet || !pet.lastTrained) return 0
        return Math.max(0, TRAIN_COOLDOWN_MS - (Date.now() - pet.lastTrained))
      }
    },

    petNeedsFeeding() {
      return (petId) => {
        const pet = this.ownedPets.find(p => p.petId === petId)
        if (!pet) return false
        return (pet.food ?? 100) < 25
      }
    },
  },

  actions: {
    _ensureStats(pet) {
      if (pet.food        === undefined) pet.food        = 100
      if (pet.cleanliness === undefined) pet.cleanliness = 100
      if (pet.lastWalked  === undefined) pet.lastWalked  = 0
      if (pet.lastBathed  === undefined) pet.lastBathed  = 0
    },

    buyPet(petId) {
      const player    = usePlayerStore()
      const gameStore = useGameStore()
      const def       = getPetDefinition(petId)
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
        food: 100,
        cleanliness: 100,
        lastFed: now,
        lastTrained: 0,
        lastPlayed: now,
        lastWalked: 0,
        lastBathed: now,
      })

      if (!this.activePetId) this.activePetId = petId

      gameStore.addNotification(`Απέκτησες: ${def.icon} ${def.name}!`, 'success')
      player.logActivity(`🐾 Νέο κατοικίδιο: ${def.name}`, 'info')
      gameStore.saveGame()
      return true
    },

    feedPet(petId) {
      const player    = usePlayerStore()
      const gameStore = useGameStore()
      const pet       = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false
      this._ensureStats(pet)

      const def = getPetDefinition(petId)
      if (!def) return false

      if (player.cash < def.feedCost) {
        gameStore.addNotification(`Χρειάζεσαι €${def.feedCost} για τροφή!`, 'danger')
        return false
      }

      player.removeCash(def.feedCost)
      pet.lastFed    = Date.now()
      pet.food       = Math.min(100, (pet.food ?? 0) + 50)
      pet.happiness  = Math.min(100, pet.happiness + 10)

      gameStore.addNotification(`${def.icon} Τάισες το ${def.name}! +50 Τροφή (-€${def.feedCost})`, 'success')
      gameStore.saveGame()
      return true
    },

    playWithPet(petId) {
      const player    = usePlayerStore()
      const gameStore = useGameStore()
      const pet       = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false
      this._ensureStats(pet)

      const def = getPetDefinition(petId)

      if (player.resources.energy.current < 5) {
        gameStore.addNotification('Δεν έχεις αρκετή ενέργεια! (5 απαιτείται)', 'danger')
        return false
      }

      player.modifyResource('energy', -5)
      pet.happiness  = Math.min(100, pet.happiness + 5)
      pet.lastPlayed = Date.now()

      gameStore.addNotification(`${def.icon} Έπαιξες με το ${def.name}! +5 Χαρά (-5 Ενέργεια)`, 'success')
      gameStore.saveGame()
      return true
    },

    bathPet(petId) {
      const player    = usePlayerStore()
      const gameStore = useGameStore()
      const pet       = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false
      this._ensureStats(pet)

      const def = getPetDefinition(petId)
      const now = Date.now()

      if (pet.lastBathed && now - pet.lastBathed < BATH_COOLDOWN_MS) {
        const h = Math.ceil((BATH_COOLDOWN_MS - (now - pet.lastBathed)) / 3600000)
        gameStore.addNotification(`Μπάνιο ξανά σε ${h}ω!`, 'warning')
        return false
      }

      if (player.resources.energy.current < 10) {
        gameStore.addNotification('Δεν έχεις αρκετή ενέργεια! (10 απαιτείται)', 'danger')
        return false
      }

      player.modifyResource('energy', -10)
      pet.cleanliness = 100
      pet.happiness   = Math.min(100, pet.happiness + 15)
      pet.lastBathed  = now

      gameStore.addNotification(`🛁 Έκανες μπάνιο το ${def.icon} ${def.name}! +15 Χαρά (-10 Ενέργεια)`, 'success')
      gameStore.saveGame()
      return true
    },

    walkPet(petId) {
      const player    = usePlayerStore()
      const gameStore = useGameStore()
      const inv       = useInventoryStore()
      const pet       = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false
      this._ensureStats(pet)

      const def = getPetDefinition(petId)
      if (!WALKABLE_PETS.includes(petId)) {
        gameStore.addNotification('Αυτό το κατοικίδιο δεν βγαίνει βόλτα!', 'warning')
        return false
      }

      const now = Date.now()
      if (pet.lastWalked && now - pet.lastWalked < WALK_COOLDOWN_MS) {
        const m = Math.ceil((WALK_COOLDOWN_MS - (now - pet.lastWalked)) / 60000)
        gameStore.addNotification(`Βόλτα ξανά σε ${m} λεπτά!`, 'warning')
        return false
      }

      if (player.resources.energy.current < 15) {
        gameStore.addNotification('Δεν έχεις αρκετή ενέργεια! (15 απαιτείται)', 'danger')
        return false
      }

      if ((pet.food ?? 100) < 15) {
        gameStore.addNotification('Το κατοικίδιο δεν έχει αρκετή τροφή! (15 απαιτείται)', 'danger')
        return false
      }

      // Walk effects
      player.modifyResource('energy', -15)
      pet.food        = Math.max(0, (pet.food ?? 100) - 15)
      pet.lastWalked  = now
      pet.happiness   = Math.min(100, pet.happiness + 25)
      pet.cleanliness = Math.max(0, (pet.cleanliness ?? 100) - 20)  // gets dirty
      pet.lastPlayed  = now

      // Find an item
      const table = petId === 'cat' ? CAT_WALK_FINDS : DOG_WALK_FINDS
      const found = pickWalkFind(table)

      if (found) {
        this.lastWalkFind = {
          petId,
          itemId:   found.itemId,
          itemName: found.name,
          itemIcon: found.icon,
          isJunk:   found.isJunk || false,
          ts:       now,
        }

        if (!found.isJunk) {
          inv.addItem(found.itemId, 1)
          gameStore.addNotification(`${def.icon} Βόλτα! Βρήκε: ${found.icon} ${found.name}`, 'success')
          player.logActivity(`🐾 ${def.name} βρήκε ${found.name} στη βόλτα`, 'info')
        } else {
          // Cat brings junk — still logs it, no inventory
          gameStore.addNotification(`${def.icon} Η γάτα έφερε ${found.icon} ${found.name}... ευχαριστώ?`, 'warning')
          player.logActivity(`🐾 ${def.name} έφερε ${found.name} σπίτι`, 'info')
        }
      } else {
        gameStore.addNotification(`${def.icon} Ωραία βόλτα! +25 Χαρά (-15 Ενέργεια, -15 Τροφή)`, 'success')
      }

      gameStore.saveGame()
      return { found }
    },

    trainPet(petId) {
      const player    = usePlayerStore()
      const gameStore = useGameStore()
      const pet       = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false

      const def = getPetDefinition(petId)
      if (!def) return false

      if (pet.level >= def.maxLevel) {
        gameStore.addNotification('Το κατοικίδιο είναι max level!', 'warning')
        return false
      }

      const now = Date.now()
      if (pet.lastTrained && now - pet.lastTrained < TRAIN_COOLDOWN_MS) {
        const m = Math.ceil((TRAIN_COOLDOWN_MS - (now - pet.lastTrained)) / 60000)
        gameStore.addNotification(`Εκπαίδευση ξανά σε ${m} λεπτά!`, 'warning')
        return false
      }

      if (player.resources.energy.current < 10) {
        gameStore.addNotification('Δεν έχεις αρκετή ενέργεια!', 'danger')
        return false
      }

      player.resources.energy.current -= 10
      pet.lastTrained = now

      const xpGain = 10 + Math.floor(Math.random() * 10)
      pet.trainingXp += xpGain

      const needed = trainingXpForLevel(pet.level)
      if (pet.trainingXp >= needed) {
        pet.trainingXp -= needed
        pet.level++
        const pct = ((getPetBonusMultiplier(def, pet.level) - 1) * 100).toFixed(0)
        gameStore.addNotification(`${def.icon} ${def.name} → Level ${pet.level}! ${def.bonusLabel}: +${pct}%`, 'success')
        player.logActivity(`🐾 ${def.name} → Level ${pet.level}`, 'xp')
      } else {
        gameStore.addNotification(`${def.icon} Εκπαίδευση: +${xpGain} XP (${pet.trainingXp}/${needed})`, 'info')
      }

      gameStore.saveGame()
      return true
    },

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

    tickPets() {
      const now = Date.now()
      if (now - this.lastPetTick < 5 * 60 * 1000) return
      this.lastPetTick = now

      const gameStore = useGameStore()
      const player    = usePlayerStore()
      let changed     = false

      for (let i = this.ownedPets.length - 1; i >= 0; i--) {
        const pet = this.ownedPets[i]
        const def = getPetDefinition(pet.petId)
        this._ensureStats(pet)

        // Happiness decay
        if (now - pet.lastPlayed > HAPPINESS_DECAY_MS) {
          const periods = Math.floor((now - pet.lastPlayed) / HAPPINESS_DECAY_MS)
          pet.happiness = Math.max(0, pet.happiness - periods * 5)
          changed = true
        }

        // Food decay
        const foodPeriods = Math.floor((now - pet.lastFed) / FOOD_DECAY_MS)
        if (foodPeriods > 0) {
          pet.food = Math.max(0, (pet.food ?? 100) - foodPeriods * 20)
          changed = true
        }

        // Cleanliness decay (only for walkable pets)
        if (WALKABLE_PETS.includes(pet.petId) && pet.lastBathed) {
          const cleanPeriods = Math.floor((now - pet.lastBathed) / CLEAN_DECAY_MS)
          if (cleanPeriods > 0) {
            pet.cleanliness = Math.max(0, (pet.cleanliness ?? 100) - cleanPeriods * 15)
            changed = true
          }
        }

        // Abandonment — not fed for 48h
        if (now - pet.lastFed > ABANDON_MS) {
          const name = def?.name || pet.petId
          const icon = def?.icon || '🐾'
          gameStore.addNotification(`${icon} ${name} έφυγε! Δεν το τάιζες...`, 'danger')
          player.logActivity(`🐾 ${name} εγκατέλειψε τον παίκτη`, 'danger')
          if (this.activePetId === pet.petId) this.activePetId = null
          this.ownedPets.splice(i, 1)
          changed = true
        }
      }

      if (changed) gameStore.saveGame()
    },

    getSerializable() {
      return {
        ownedPets:    this.ownedPets.map(p => ({ ...p })),
        activePetId:  this.activePetId,
        lastWalkFind: this.lastWalkFind,
      }
    },

    hydrate(data) {
      if (!data) return
      if (Array.isArray(data.ownedPets)) {
        this.ownedPets = data.ownedPets.map(p => ({ ...p }))
        this.ownedPets.forEach(p => this._ensureStats(p))
      }
      if (data.activePetId  !== undefined) this.activePetId  = data.activePetId
      if (data.lastWalkFind !== undefined) this.lastWalkFind = data.lastWalkFind
    },
  },
})
