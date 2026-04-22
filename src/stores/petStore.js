import { defineStore } from 'pinia'
import { petDefinitions, getPetDefinition, getPetBonusMultiplier, trainingXpForLevel } from '../data/pets'
import { PET_TOYS, PET_FOODS } from '../data/items'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { usePropertyStore } from './propertyStore'
import { useInventoryStore } from './inventoryStore'
import { useEventsHubStore } from './eventsHubStore'

const ABANDON_MS          = 48 * 60 * 60 * 1000
const TRAIN_COOLDOWN_MS   = 4  * 60 * 60 * 1000
const WALK_COOLDOWN_MS    = 2  * 60 * 60 * 1000
const BATH_COOLDOWN_MS    = 12 * 60 * 60 * 1000
const HAPPINESS_DECAY_MS  = 6  * 60 * 60 * 1000  // -5 happiness every 6h
const FOOD_DECAY_MS       = 8  * 60 * 60 * 1000  // -20 food every 8h
const CLEAN_DECAY_MS      = 10 * 60 * 60 * 1000  // -15 cleanliness every 10h

const TOY_MAX_USES = 20
const WALK_NO_FIND_WEIGHT = 0.55

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

const CAT_WALK_FINDS = [
  { itemId: 'dead_bird',   name: 'Νεκρό Πουλί',  icon: '🐦', chance: 0.35, isJunk: true },
  { itemId: 'dead_lizard', name: 'Νεκρή Σαύρα',  icon: '🦎', chance: 0.30, isJunk: true },
  { itemId: 'cigarettes',  name: 'Τσιγάρα',      icon: '🚬', chance: 0.15 },
  { itemId: 'bandage',     name: 'Γάζες',        icon: '🩹', chance: 0.10 },
  { itemId: 'mat_fabric',  name: 'Ύφασμα',       icon: '🧵', chance: 0.08 },
  { itemId: 'chewing_gum', name: 'Τσίχλα',       icon: '🍬', chance: 0.20 },
  { itemId: 'water',       name: 'Νερό',         icon: '💧', chance: 0.15 },
]

const WALK_FINDS_DOG_V2 = [
  { itemId: 'bandages', name: 'Γάζες', icon: '🩹', chance: 0.18 },
  { itemId: 'painkillers', name: 'Παυσίπονα', icon: '💊', chance: 0.12 },
  { itemId: 'water_bottle', name: 'Νερό', icon: '💧', chance: 0.16 },
  { itemId: 'toast_bag', name: 'Τοστ', icon: '🥪', chance: 0.12 },
  { itemId: 'chocolate', name: 'Σοκολάτα', icon: '🍫', chance: 0.10 },
  { itemId: 'cigarettes', name: 'Τσιγάρα', icon: '🚬', chance: 0.10 },
  { itemId: 'mat_iron', name: 'Σίδερο', icon: '🔩', chance: 0.18 },
  { itemId: 'mat_wood', name: 'Ξύλο', icon: '🪵', chance: 0.16 },
  { itemId: 'mat_fabric', name: 'Ύφασμα', icon: '🧵', chance: 0.12 },
  { itemId: 'mat_battery', name: 'Μπαταρία', icon: '🔋', chance: 0.10 },
  { itemId: 'mat_fuel', name: 'Βενζίνη', icon: '⛽', chance: 0.12 },
  { itemId: 'mat_electronics', name: 'Ηλεκτρονικά', icon: '🔌', chance: 0.08 },
  { itemId: 'mat_chemicals', name: 'Χημικά', icon: '🧪', chance: 0.07 },
  { itemId: 'first_aid', name: 'Κιτ Πρώτων Βοηθειών', icon: '🏥', chance: 0.04 },
]

const WALK_FINDS_CAT_V2 = [
  { itemId: 'dead_bird', name: 'Νεκρό Πουλί', icon: '🐦', chance: 0.35, isJunk: true },
  { itemId: 'dead_lizard', name: 'Νεκρή Σαύρα', icon: '🦎', chance: 0.30, isJunk: true },
  { itemId: 'cigarettes', name: 'Τσιγάρα', icon: '🚬', chance: 0.10 },
  { itemId: 'bandages', name: 'Γάζες', icon: '🩹', chance: 0.08 },
  { itemId: 'mat_fabric', name: 'Ύφασμα', icon: '🧵', chance: 0.12 },
  { itemId: 'mat_iron', name: 'Σίδερο', icon: '🔩', chance: 0.08 },
  { itemId: 'mat_electronics', name: 'Ηλεκτρονικά', icon: '🔌', chance: 0.06 },
  { itemId: 'mat_fuel', name: 'Βενζίνη', icon: '⛽', chance: 0.05 },
  { itemId: 'chewing_gum', name: 'Τσίχλα', icon: '🫧', chance: 0.16 },
  { itemId: 'water_bottle', name: 'Νερό', icon: '💧', chance: 0.12 },
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

function pickWeightedWalkFind(table) {
  const total = table.reduce((sum, entry) => sum + (entry.chance || 0), WALK_NO_FIND_WEIGHT)
  let roll = Math.random() * total
  if (roll < WALK_NO_FIND_WEIGHT) return null
  roll -= WALK_NO_FIND_WEIGHT

  let cumulative = 0
  for (const entry of table) {
    cumulative += entry.chance || 0
    if (roll < cumulative) return entry
  }
  return null
}

function getActiveStash() {
  const propStore = usePropertyStore()
  return propStore.activeInstance
}

export const usePetStore = defineStore('pet', {
  state: () => ({
    ownedPets: [],   // { petId, level, trainingXp, happiness, food, cleanliness, lastFed, lastTrained, lastPlayed, lastWalked, lastBathed }
    activePetId: null,   // kept for backward compat; not used for bonuses
    lastPetTick: 0,
    lastWalkFind: null,  // { petId, itemId, itemName, itemIcon, isJunk, ts }
    toyUses: {},         // { [toyItemId]: remainingUses }
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

    // All owned pets with happiness > 0 contribute their bonus (multiplied together)
    bonusFor() {
      return (bonusType) => {
        let multiplier = 1.0
        for (const pet of this.ownedPets) {
          if (pet.happiness <= 0) continue
          const def = getPetDefinition(pet.petId)
          if (!def || def.bonusType !== bonusType) continue
          multiplier *= getPetBonusMultiplier(def, pet.level)
        }
        return multiplier
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

    toyUsesFor() {
      return (toyItemId) => this.toyUses[toyItemId] ?? 0
    },

    hasToyInStash() {
      return (toyItemId) => {
        const stash = getActiveStash()
        if (!stash) return false
        return (stash.stash[toyItemId] || 0) > 0
      }
    },

    hasFoodInStash() {
      return (foodItemId) => {
        const stash = getActiveStash()
        if (!stash) return false
        return (stash.stash[foodItemId] || 0) > 0
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

    _getActiveStashInstance() {
      const propStore = usePropertyStore()
      return propStore.activeInstance
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

    // Buy a pet toy or food item directly into home stash
    buyPetItem(itemId) {
      const player    = usePlayerStore()
      const gameStore = useGameStore()
      const propStore = usePropertyStore()

      const allPetItems = [...PET_TOYS, ...PET_FOODS]
      const itemDef = allPetItems.find(i => i.id === itemId)
      if (!itemDef) return false

      if (player.cash < itemDef.buyPrice) {
        gameStore.addNotification(`Χρειάζεσαι €${itemDef.buyPrice}!`, 'danger')
        return false
      }

      const instance = propStore.activeInstance
      if (!instance) {
        gameStore.addNotification('Χρειάζεσαι ενεργό σπίτι για να αποθηκεύσεις αντικείμενα!', 'danger')
        return false
      }

      const propData = propStore.activeProperty
      const used = Object.values(instance.stash || {}).reduce((s, q) => s + Number(q || 0), 0)
      if (used + 1 > (propData?.itemCapacity || 0)) {
        gameStore.addNotification('Η αποθήκη του σπιτιού είναι γεμάτη!', 'danger')
        return false
      }

      player.removeCash(itemDef.buyPrice)
      instance.stash[itemId] = (instance.stash[itemId] || 0) + 1

      // If it's a toy and uses aren't initialized, set them
      if (itemDef.type === 'pet_toy') {
        this.toyUses[itemId] = (this.toyUses[itemId] || 0) + TOY_MAX_USES
      }

      gameStore.addNotification(`${itemDef.icon} ${itemDef.name} αποθηκεύτηκε στο σπίτι!`, 'success')
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

      const instance = this._getActiveStashInstance()
      if (!instance) {
        gameStore.addNotification('Χρειάζεσαι ενεργό σπίτι! Αγόρασε τροφή από το Petshop.', 'danger')
        return false
      }

      const foodId = def.foodItemId
      const stashQty = instance.stash[foodId] || 0
      if (stashQty <= 0) {
        gameStore.addNotification(`Δεν έχεις ${def.icon === '🐈' ? 'γατοτροφή' : 'τροφή'} για το ${def.name}! Αγόρασε από το Petshop.`, 'warning')
        return false
      }

      // Consume 1 food from stash
      instance.stash[foodId]--
      if (instance.stash[foodId] <= 0) delete instance.stash[foodId]

      pet.lastFed    = Date.now()
      pet.food       = Math.min(100, (pet.food ?? 0) + 50)
      pet.happiness  = Math.min(100, pet.happiness + 10)

      gameStore.addNotification(`${def.icon} Τάισες το ${def.name}! +50 Τροφή`, 'success')
      gameStore.saveGame()
      return true
    },

    playWithPet(petId) {
      const player    = usePlayerStore()
      const gameStore = useGameStore()
      const evHub     = useEventsHubStore()
      const pet       = this.ownedPets.find(p => p.petId === petId)
      if (!pet) return false
      this._ensureStats(pet)

      const def = getPetDefinition(petId)

      if (player.resources.energy.current < 5) {
        gameStore.addNotification('Δεν έχεις αρκετή ενέργεια! (5 απαιτείται)', 'danger')
        return false
      }

      const instance = this._getActiveStashInstance()
      if (!instance) {
        gameStore.addNotification('Χρειάζεσαι ενεργό σπίτι! Αγόρασε παιχνίδι από το Petshop.', 'danger')
        return false
      }

      const toyId = def.toyItemId
      const stashQty = instance.stash[toyId] || 0

      if (stashQty <= 0 && (this.toyUses[toyId] || 0) <= 0) {
        gameStore.addNotification(`Δεν έχεις παιχνίδι για το ${def.name}! Αγόρασε από το Petshop.`, 'warning')
        return false
      }

      // Initialize uses if toy is in stash but uses not tracked
      if ((this.toyUses[toyId] || 0) <= 0 && stashQty > 0) {
        this.toyUses[toyId] = TOY_MAX_USES
      }

      player.modifyResource('energy', -5)
      pet.happiness  = Math.min(100, pet.happiness + 30)
      pet.lastPlayed = Date.now()

      // Consume toy use
      this.toyUses[toyId]--
      const usesLeft = this.toyUses[toyId]
      let toyBroken = false
      if (usesLeft <= 0) {
        // Toy used up — remove 1 from stash
        instance.stash[toyId] = Math.max(0, (instance.stash[toyId] || 1) - 1)
        if (instance.stash[toyId] <= 0) delete instance.stash[toyId]
        // If more in stash, refill uses for next one
        if ((instance.stash[toyId] || 0) > 0) {
          this.toyUses[toyId] = TOY_MAX_USES
        } else {
          this.toyUses[toyId] = 0
        }
        toyBroken = true
      }

      // Cat scratch: 50% chance
      if (petId === 'cat') {
        if (Math.random() < 0.5) {
          const scratchDmg = 5
          const hpBefore = player.resources.hp.current
          player.modifyResource('hp', -scratchDmg)
          const hpAfter = player.resources.hp.current

          gameStore.addNotification(`😾 Η γάτα σε γρατζούνισε! -${scratchDmg} HP`, 'danger')
          player.logActivity('😾 Η γάτα σε γρατζούνισε! -5 HP', 'danger')
          evHub.addEvent({
            icon: '😾',
            title: 'Γρατζουνιά Γάτας',
            message: `Η γάτα σου σε γρατζούνισε παίζοντας! -${scratchDmg} HP`,
            kind: 'danger',
          })

          // Check if player died from scratch
          if (hpAfter <= 0) {
            const hospitalMs = 10 * 60 * 1000 // 10 min
            player.setStatus('hospital', hospitalMs, 'Σε γρατζούνισε η γάτα σου!')
            player.resources.hp.current = 1
            gameStore.addNotification('💀 Πέθανες από τις γρατζουνιές! Νοσοκομείο 10 λεπτά!', 'danger')
            player.logActivity('💀 Νοσοκομείο: γρατζουνιές γάτας', 'danger')
          }
        }
      }

      let msg = `${def.icon} Έπαιξες με το ${def.name}! +30 Χαρά (-5 Ενέργεια)`
      if (toyBroken) msg += ' — Το παιχνίδι κατεστράφη!'
      else if (usesLeft > 0) msg += ` (${usesLeft} χρήσεις)`
      gameStore.addNotification(msg, 'success')
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
      const propStore = usePropertyStore()
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

      player.modifyResource('energy', -15)
      pet.food        = Math.max(0, (pet.food ?? 100) - 15)
      pet.lastWalked  = now
      pet.happiness   = Math.min(100, pet.happiness + 25)
      pet.cleanliness = Math.max(0, (pet.cleanliness ?? 100) - 20)
      pet.lastPlayed  = now

      const table = petId === 'cat' ? WALK_FINDS_CAT_V2 : WALK_FINDS_DOG_V2
      const found = pickWeightedWalkFind(table)

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
          // Add to home stash if possible, else to inventory
          const instance = this._getActiveStashInstance()
          if (instance) {
            const propData = propStore.activeProperty
            const used = Object.values(instance.stash || {}).reduce((s, q) => s + Number(q || 0), 0)
            if (used < (propData?.itemCapacity || 0)) {
              instance.stash[found.itemId] = (instance.stash[found.itemId] || 0) + 1
              gameStore.addNotification(`${def.icon} Βόλτα! Βρήκε: ${found.icon} ${found.name} (αποθηκεύτηκε στο σπίτι)`, 'success')
            } else {
              useInventoryStore().addItem(found.itemId, 1)
              gameStore.addNotification(`${def.icon} Βόλτα! Βρήκε: ${found.icon} ${found.name}`, 'success')
            }
          } else {
            useInventoryStore().addItem(found.itemId, 1)
            gameStore.addNotification(`${def.icon} Βόλτα! Βρήκε: ${found.icon} ${found.name}`, 'success')
          }
          player.logActivity(`🐾 ${def.name} βρήκε ${found.name} στη βόλτα`, 'info')
        } else {
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
        toyUses:      { ...this.toyUses },
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
      if (data.toyUses      !== undefined) this.toyUses      = { ...data.toyUses }
    },
  },
})
