import { defineStore } from 'pinia'
import { getPropertyById } from '../data/properties'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'

const MOVING_SERVICE_FEE = 500
const DAY_MS = 24 * 60 * 60 * 1000

function safeNow() {
  return Date.now()
}

function createInstanceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `prop_${safeNow()}_${Math.random().toString(36).slice(2, 10)}`
}

function sumStashItems(stash = {}) {
  return Object.values(stash).reduce((sum, qty) => sum + Number(qty || 0), 0)
}

function rollD6() {
  return Math.floor(Math.random() * 6) + 1
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

export const usePropertyStore = defineStore('property', {
  state: () => ({
    properties: [],
    activeInstanceId: null,
    lastRentCheckAt: Date.now(),
  }),

  getters: {
    activeInstance() {
      return this.properties.find(p => p.instanceId === this.activeInstanceId) || null
    },

    activeProperty() {
      if (!this.activeInstance) return null
      return getPropertyById(this.activeInstance.propertyId) || null
    },

    happinessBonus() {
      return this.activeProperty?.happinessBonus || 0
    },

    vaultCapacity() {
      return this.activeProperty?.vaultCapacity || 0
    },

    vaultCash() {
      return this.activeInstance?.vaultCash || 0
    },

    // Backward-compatible aliases for old UI/logic.
    ownedProperty() {
      return this.activeProperty
    },

    ownedPropertyId() {
      return this.activeInstance?.propertyId || null
    },
  },

  actions: {
    getInstanceById(instanceId) {
      return this.properties.find(p => p.instanceId === instanceId) || null
    },

    getPropertyDataForInstance(instanceId) {
      const instance = this.getInstanceById(instanceId)
      if (!instance) return null
      const property = getPropertyById(instance.propertyId)
      if (!property) return null
      return { instance, property }
    },

    getStashUsage(instanceId) {
      const instance = this.getInstanceById(instanceId)
      if (!instance) return 0
      return sumStashItems(instance.stash)
    },

    ensureActiveInstance() {
      if (!this.properties.length) {
        this.activeInstanceId = null
        return
      }
      const exists = this.properties.some(p => p.instanceId === this.activeInstanceId)
      if (!exists) {
        this.activeInstanceId = this.properties[0].instanceId
      }
    },

    setActiveInstance(instanceId) {
      const gameStore = useGameStore()
      const instance = this.getInstanceById(instanceId)
      if (!instance) {
        gameStore.addNotification('Το ακίνητο δεν βρέθηκε.', 'danger')
        return false
      }
      this.activeInstanceId = instanceId
      gameStore.addNotification('Μετακόμισες στο νέο ακίνητο.', 'success')
      gameStore.saveGame()
      return true
    },

    buyProperty(propertyId, locationId) {
      const property = getPropertyById(propertyId)
      if (!property) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (player.level < property.requirements.level) {
        gameStore.addNotification(`Χρειάζεσαι Επίπεδο ${property.requirements.level}!`, 'danger')
        return false
      }

      if (!locationId) {
        gameStore.addNotification('Δεν βρέθηκε τοποθεσία αγοράς.', 'danger')
        return false
      }

      if (player.cash < property.buyPrice) {
        gameStore.addNotification('Δεν έχεις αρκετά χρήματα!', 'danger')
        return false
      }

      player.removeCash(property.buyPrice)
      const instance = {
        instanceId: createInstanceId(),
        propertyId,
        locationId,
        isRented: false,
        lastRentPaid: safeNow(),
        vaultCash: 0,
        stash: {},
      }
      this.properties.push(instance)
      this.activeInstanceId = instance.instanceId

      gameStore.addNotification(`Αγόρασες: ${property.name}!`, 'success')
      player.logActivity(`🏠 Αγορά ${property.name}`, 'cash')
      gameStore.saveGame()
      return true
    },

    rentProperty(propertyId, locationId) {
      const property = getPropertyById(propertyId)
      if (!property) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (player.level < property.requirements.level) {
        gameStore.addNotification(`Χρειάζεσαι Επίπεδο ${property.requirements.level}!`, 'danger')
        return false
      }

      if (!locationId) {
        gameStore.addNotification('Δεν βρέθηκε τοποθεσία ενοικίασης.', 'danger')
        return false
      }

      if (player.cash < property.rentPrice) {
        gameStore.addNotification('Δεν έχεις αρκετά χρήματα για το πρώτο ενοίκιο!', 'danger')
        return false
      }

      player.removeCash(property.rentPrice)
      const instance = {
        instanceId: createInstanceId(),
        propertyId,
        locationId,
        isRented: true,
        lastRentPaid: safeNow(),
        vaultCash: 0,
        stash: {},
      }
      this.properties.push(instance)
      this.activeInstanceId = instance.instanceId

      gameStore.addNotification(`Νοίκιασες: ${property.name}!`, 'success')
      player.logActivity(`🏘️ Ενοικίαση ${property.name}`, 'cash')
      gameStore.saveGame()
      return true
    },

    sellProperty(instanceId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const inventoryStore = useInventoryStore()

      const idx = this.properties.findIndex(p => p.instanceId === instanceId)
      if (idx === -1) {
        gameStore.addNotification('Το ακίνητο δεν βρέθηκε.', 'danger')
        return false
      }

      const instance = this.properties[idx]
      const property = getPropertyById(instance.propertyId)
      if (!property) {
        gameStore.addNotification('Άγνωστο ακίνητο.', 'danger')
        return false
      }

      const sellValue = Math.floor(property.buyPrice * 0.75)
      player.addCash(sellValue)
      if (instance.vaultCash > 0) {
        player.addCash(instance.vaultCash)
      }

      let movedToPocket = 0
      let lostItems = 0
      const stashEntries = Object.entries(instance.stash || {})
      for (const [itemId, qty] of stashEntries) {
        let remaining = Number(qty || 0)
        while (remaining > 0) {
          const addResult = inventoryStore.addItem(itemId, 1)
          if (addResult?.ok === false) {
            lostItems += remaining
            break
          }
          movedToPocket += 1
          remaining -= 1
        }
      }

      this.properties.splice(idx, 1)
      this.ensureActiveInstance()

      gameStore.addNotification(`Πούλησες ${property.name} για €${sellValue}`, 'cash')
      if (movedToPocket > 0) {
        gameStore.addNotification(`Μεταφέρθηκαν ${movedToPocket} αντικείμενα στην τσέπη σου.`, 'info')
      }
      if (lostItems > 0) {
        gameStore.addNotification(`Χάθηκαν ${lostItems} αντικείμενα λόγω περιορισμού τσέπης.`, 'warning')
      }
      player.logActivity(`🏠 Πώληση ${property.name}: +€${sellValue}`, 'cash')
      gameStore.saveGame()
      return true
    },

    endLease(instanceId, silent = false) {
      const gameStore = useGameStore()
      const player = usePlayerStore()
      const idx = this.properties.findIndex(p => p.instanceId === instanceId)
      if (idx === -1) return false

      const instance = this.properties[idx]
      if (!instance.isRented) {
        if (!silent) gameStore.addNotification('Το ακίνητο δεν είναι ενοικιαζόμενο.', 'danger')
        return false
      }

      const property = getPropertyById(instance.propertyId)
      this.properties.splice(idx, 1)
      this.ensureActiveInstance()

      if (!silent) {
        gameStore.addNotification(`Έληξε η μίσθωση για ${property?.name || 'το ακίνητο'}.`, 'warning')
        player.logActivity(`🏘️ Τέλος μίσθωσης ${property?.name || ''}`.trim(), 'warning')
        gameStore.saveGame()
      }
      return true
    },

    checkDailyRent() {
      const gameStore = useGameStore()
      const player = usePlayerStore()
      const now = safeNow()
      const elapsedDays = Math.floor((now - this.lastRentCheckAt) / DAY_MS)
      if (elapsedDays <= 0) return

      for (let day = 0; day < elapsedDays; day++) {
        const snapshot = [...this.properties]
        for (const instance of snapshot) {
          if (!instance.isRented) continue
          const property = getPropertyById(instance.propertyId)
          if (!property) continue

          if (instance.vaultCash >= property.rentPrice) {
            instance.vaultCash -= property.rentPrice
            instance.lastRentPaid = now
            gameStore.addNotification(`Πληρώθηκε ενοίκιο €${property.rentPrice} για ${property.name} (από θυρίδα).`, 'info')
          } else if (player.cash >= property.rentPrice) {
            player.removeCash(property.rentPrice)
            instance.lastRentPaid = now
            gameStore.addNotification(`Πληρώθηκε ενοίκιο €${property.rentPrice} για ${property.name} (από τσέπη).`, 'info')
          } else {
            this.endLease(instance.instanceId, true)
            gameStore.addNotification(`Έξωση από ${property.name}. Η θυρίδα και η αποθήκη χάθηκαν.`, 'danger')
            player.logActivity(`🚫 Έξωση από ${property.name}`, 'danger')
          }
        }
      }

      this.lastRentCheckAt = now
      gameStore.saveGame()
    },

    depositToVault(instanceId, amount) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const bundle = this.getPropertyDataForInstance(instanceId)
      if (!bundle) {
        gameStore.addNotification('Το ακίνητο δεν βρέθηκε.', 'danger')
        return false
      }

      const { instance, property } = bundle
      amount = Math.floor(Number(amount || 0))
      if (amount <= 0) {
        gameStore.addNotification('Μη έγκυρο ποσό.', 'danger')
        return false
      }

      const canDeposit = Math.min(amount, player.cash, property.vaultCapacity - instance.vaultCash)
      if (canDeposit <= 0) {
        gameStore.addNotification('Δεν υπάρχει διαθέσιμο υπόλοιπο ή χωρητικότητα.', 'danger')
        return false
      }

      amount = canDeposit
      player.removeCash(amount)
      instance.vaultCash += amount
      gameStore.addNotification(`Κατάθεση €${amount} στο χρηματοκιβώτιο`, 'info')
      gameStore.saveGame()
      return true
    },

    withdrawFromVault(instanceId, amount) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const instance = this.getInstanceById(instanceId)
      if (!instance) {
        gameStore.addNotification('Το ακίνητο δεν βρέθηκε.', 'danger')
        return false
      }

      amount = Math.floor(Number(amount || 0))
      if (amount <= 0) {
        gameStore.addNotification('Μη έγκυρο ποσό.', 'danger')
        return false
      }

      amount = Math.min(amount, instance.vaultCash)
      if (amount <= 0) {
        gameStore.addNotification('Δεν έχεις τόσα χρήματα στο χρηματοκιβώτιο.', 'danger')
        return false
      }

      instance.vaultCash -= amount
      player.addCash(amount)
      gameStore.addNotification(`Ανάληψη €${amount} από χρηματοκιβώτιο`, 'info')
      gameStore.saveGame()
      return true
    },

    depositToStash(instanceId, itemId, qty) {
      const gameStore = useGameStore()
      const inventoryStore = useInventoryStore()
      const bundle = this.getPropertyDataForInstance(instanceId)
      if (!bundle) {
        gameStore.addNotification('Το ακίνητο δεν βρέθηκε.', 'danger')
        return false
      }

      qty = Math.floor(Number(qty || 0))
      if (qty <= 0) {
        gameStore.addNotification('Μη έγκυρη ποσότητα.', 'danger')
        return false
      }

      const pocketEntry = inventoryStore.items.find(i => i.itemId === itemId)
      if (!pocketEntry || pocketEntry.quantity < qty) {
        gameStore.addNotification('Δεν έχεις τόσα αντικείμενα στην τσέπη.', 'danger')
        return false
      }

      const { instance, property } = bundle
      const used = sumStashItems(instance.stash)
      if (used + qty > property.itemCapacity) {
        gameStore.addNotification('Η αποθήκη του σπιτιού είναι γεμάτη.', 'danger')
        return false
      }

      const removed = inventoryStore.removeItem(itemId, qty)
      if (!removed) {
        gameStore.addNotification('Αποτυχία μεταφοράς από την τσέπη.', 'danger')
        return false
      }

      instance.stash[itemId] = (instance.stash[itemId] || 0) + qty
      gameStore.addNotification(`Μεταφέρθηκαν ${qty} αντικείμενα στην αποθήκη.`, 'success')
      gameStore.saveGame()
      return true
    },

    withdrawFromStash(instanceId, itemId, qty) {
      const gameStore = useGameStore()
      const inventoryStore = useInventoryStore()
      const instance = this.getInstanceById(instanceId)
      if (!instance) {
        gameStore.addNotification('Το ακίνητο δεν βρέθηκε.', 'danger')
        return false
      }

      qty = Math.floor(Number(qty || 0))
      if (qty <= 0) {
        gameStore.addNotification('Μη έγκυρη ποσότητα.', 'danger')
        return false
      }

      const available = Number(instance.stash[itemId] || 0)
      if (available < qty) {
        gameStore.addNotification('Δεν υπάρχουν τόσα αντικείμενα στην αποθήκη.', 'danger')
        return false
      }

      const pocketFree = inventoryStore.maxSlots - inventoryStore.totalItems
      if (qty > pocketFree) {
        gameStore.addNotification('Η τσέπη σου είναι γεμάτη — άδειασε λίγο χώρο.', 'danger')
        return false
      }

      const addResult = inventoryStore.addItem(itemId, qty)
      if (addResult?.ok === false) {
        gameStore.addNotification(addResult.message || 'Η τσέπη σου είναι γεμάτη.', 'danger')
        return false
      }

      instance.stash[itemId] = available - qty
      if (instance.stash[itemId] <= 0) delete instance.stash[itemId]
      gameStore.addNotification(`Πήρες ${qty} αντικείμενα από την αποθήκη.`, 'success')
      gameStore.saveGame()
      return true
    },

    moveStash(fromInstanceId, toInstanceId, itemsToMoveObj = {}) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const fromInstance = this.getInstanceById(fromInstanceId)
      const toBundle = this.getPropertyDataForInstance(toInstanceId)

      if (!fromInstance || !toBundle) {
        gameStore.addNotification('Λάθος ακίνητο μεταφοράς.', 'danger')
        return { ok: false }
      }
      if (fromInstanceId === toInstanceId) {
        gameStore.addNotification('Η προέλευση και ο προορισμός είναι ίδιο ακίνητο.', 'danger')
        return { ok: false }
      }
      if (player.cash < MOVING_SERVICE_FEE) {
        gameStore.addNotification('Δεν έχεις €500 για τη Μεταφορική.', 'danger')
        return { ok: false }
      }

      const requestedEntries = Object.entries(itemsToMoveObj)
        .map(([itemId, qty]) => [itemId, Math.floor(Number(qty || 0))])
        .filter(([, qty]) => qty > 0)

      if (!requestedEntries.length) {
        gameStore.addNotification('Δεν επέλεξες αντικείμενα για μεταφορά.', 'danger')
        return { ok: false }
      }

      for (const [itemId, qty] of requestedEntries) {
        if ((fromInstance.stash[itemId] || 0) < qty) {
          gameStore.addNotification('Δεν υπάρχουν αρκετά αντικείμενα στην αποθήκη προέλευσης.', 'danger')
          return { ok: false }
        }
      }

      const requestedTotal = requestedEntries.reduce((sum, [, qty]) => sum + qty, 0)
      const targetUsed = sumStashItems(toBundle.instance.stash)
      const targetFree = toBundle.property.itemCapacity - targetUsed
      if (requestedTotal > targetFree) {
        gameStore.addNotification('Η αποθήκη του σπιτιού είναι γεμάτη.', 'danger')
        return { ok: false }
      }

      player.removeCash(MOVING_SERVICE_FEE)
      const roll = rollD6()
      let movedTotal = 0
      let lostTotal = 0
      let lostByItem = {}

      if (roll === 1) {
        const pool = []
        for (const [itemId, qty] of requestedEntries) {
          for (let i = 0; i < qty; i++) pool.push(itemId)
        }
        shuffleInPlace(pool)
        const lossCount = Math.floor(pool.length * 0.25)
        lostByItem = pool.slice(0, lossCount).reduce((acc, itemId) => {
          acc[itemId] = (acc[itemId] || 0) + 1
          return acc
        }, {})
        lostTotal = lossCount
      }

      for (const [itemId, qty] of requestedEntries) {
        fromInstance.stash[itemId] -= qty
        if (fromInstance.stash[itemId] <= 0) delete fromInstance.stash[itemId]

        let finalQty = qty
        if (roll === 1) {
          const loss = lostByItem[itemId] || 0
          finalQty = qty - loss
        }

        if (finalQty > 0) {
          toBundle.instance.stash[itemId] = (toBundle.instance.stash[itemId] || 0) + finalQty
          movedTotal += finalQty
        }
      }

      if (roll === 1) {
        gameStore.addNotification(`Μεταφορική αποτυχία (ζάρι 1): μεταφέρθηκαν ${movedTotal}, χάθηκαν ${lostTotal}.`, 'warning')
      } else {
        gameStore.addNotification(`Μεταφορική επιτυχία (ζάρι ${roll}): μεταφέρθηκαν ${movedTotal} αντικείμενα.`, 'success')
      }
      gameStore.saveGame()
      return { ok: true, roll, movedTotal, lostTotal, fee: MOVING_SERVICE_FEE }
    },

    getSerializable() {
      return {
        properties: this.properties.map(p => ({
          instanceId: p.instanceId,
          propertyId: p.propertyId,
          locationId: p.locationId,
          isRented: !!p.isRented,
          lastRentPaid: p.lastRentPaid || safeNow(),
          vaultCash: Math.max(0, Number(p.vaultCash || 0)),
          stash: { ...(p.stash || {}) },
        })),
        activeInstanceId: this.activeInstanceId,
        lastRentCheckAt: this.lastRentCheckAt,
      }
    },

    hydrate(data) {
      if (!data) return

      // Backward migration from old save format.
      if (data.ownedPropertyId && !data.properties) {
        this.properties = [{
          instanceId: createInstanceId(),
          propertyId: data.ownedPropertyId,
          locationId: 'athens',
          isRented: false,
          lastRentPaid: safeNow(),
          vaultCash: Math.max(0, Number(data.vaultCash || 0)),
          stash: {},
        }]
        this.activeInstanceId = this.properties[0].instanceId
        this.lastRentCheckAt = safeNow()
        return
      }

      if (Array.isArray(data.properties)) {
        this.properties = data.properties.map(p => ({
          instanceId: p.instanceId || createInstanceId(),
          propertyId: p.propertyId,
          locationId: p.locationId || 'athens',
          isRented: !!p.isRented,
          lastRentPaid: p.lastRentPaid || safeNow(),
          vaultCash: Math.max(0, Number(p.vaultCash || 0)),
          stash: { ...(p.stash || {}) },
        }))
      }
      if (data.activeInstanceId !== undefined) this.activeInstanceId = data.activeInstanceId
      if (data.lastRentCheckAt !== undefined) this.lastRentCheckAt = data.lastRentCheckAt
      this.ensureActiveInstance()
    },
  }
})
