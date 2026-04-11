import { defineStore } from 'pinia'
import { getItemById } from '../data/items'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    items: [],         // [{ itemId, quantity }]
    equipped: {
      weapon: null,    // itemId or null
      armor: null,     // itemId or null
    },
    maxSlots: 20,
  }),

  getters: {
    equippedWeapon() {
      if (!this.equipped.weapon) return null
      return getItemById(this.equipped.weapon)
    },

    equippedArmor() {
      if (!this.equipped.armor) return null
      return getItemById(this.equipped.armor)
    },

    itemCount() {
      return this.items.reduce((sum, i) => sum + i.quantity, 0)
    },

    totalItems() {
      return this.items.reduce((sum, i) => sum + i.quantity, 0)
    },

    isFull() {
      return this.itemCount >= this.maxSlots
    },

    sortedItems() {
      const order = { weapon: 0, armor: 1, medical: 2, drug: 3, misc: 4 }
      return [...this.items]
        .map(i => ({ ...i, data: getItemById(i.itemId) }))
        .filter(i => i.data)
        .sort((a, b) => (order[a.data.type] ?? 5) - (order[b.data.type] ?? 5))
    },
  },

  actions: {
    addItem(itemId, quantity = 1) {
      if (quantity <= 0) {
        return { ok: false, message: 'Μη έγκυρη ποσότητα.' }
      }

      if (this.totalItems + quantity > this.maxSlots) {
        return { ok: false, message: `Η τσέπη σου είναι γεμάτη (όριο ${this.maxSlots} τεμάχια μαζί σου).` }
      }

      const existing = this.items.find(i => i.itemId === itemId)
      if (existing) {
        existing.quantity += quantity
      } else {
        this.items.push({ itemId, quantity })
      }
      return { ok: true, message: 'OK' }
    },

    removeItem(itemId, quantity = 1) {
      const existing = this.items.find(i => i.itemId === itemId)
      if (!existing) return false
      existing.quantity -= quantity
      if (existing.quantity <= 0) {
        this.items = this.items.filter(i => i.itemId !== itemId)
        // Unequip if removed
        if (this.equipped.weapon === itemId) this.equipped.weapon = null
        if (this.equipped.armor === itemId) this.equipped.armor = null
      }
      return true
    },

    equipItem(itemId) {
      const item = getItemById(itemId)
      if (!item) return
      const owned = this.items.find(i => i.itemId === itemId)
      if (!owned) return

      if (item.type === 'weapon') {
        this.equipped.weapon = itemId
      } else if (item.type === 'armor') {
        this.equipped.armor = itemId
      }
    },

    unequipItem(slot) {
      if (this.equipped[slot]) {
        this.equipped[slot] = null
      }
    },

    useItem(itemId) {
      const item = getItemById(itemId)
      if (!item) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const owned = this.items.find(i => i.itemId === itemId)
      if (!owned || owned.quantity <= 0) return false

      if (item.type === 'medical') {
        if (item.healAmount) {
          player.modifyResource('hp', item.healAmount)
        }
        if (item.energyBoost) {
          player.modifyResource('energy', item.energyBoost)
        }
        if (item.hospitalReduction && player.status === 'hospital' && player.statusTimerEnd) {
          player.statusTimerEnd = Math.max(Date.now(), player.statusTimerEnd - item.hospitalReduction)
        }
        this.removeItem(itemId, 1)
        gameStore.addNotification(`Χρησιμοποίησες ${item.name}`, 'success')
        player.logActivity(`💊 ${item.name}`, 'info')
        return true
      }

      if (item.type === 'drug') {
        if (item.happinessBoost) {
          player.modifyResource('happiness', item.happinessBoost)
        }
        if (item.energyBoost) {
          player.modifyResource('energy', item.energyBoost)
        }
        this.removeItem(itemId, 1)
        gameStore.addNotification(`Χρησιμοποίησες ${item.name} (+${item.happinessBoost || 0} Κέφι)`, 'info')
        player.logActivity(`${item.icon} ${item.name}`, 'info')
        return true
      }

      return false
    },

    sellItem(itemId, quantity = 1) {
      const item = getItemById(itemId)
      if (!item || item.sellPrice <= 0) return false

      const owned = this.items.find(i => i.itemId === itemId)
      if (!owned || owned.quantity < quantity) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const total = item.sellPrice * quantity

      this.removeItem(itemId, quantity)
      player.addCash(total)
      gameStore.addNotification(`Πούλησες ${item.name} x${quantity} για €${total}`, 'cash')
      player.logActivity(`💰 Πώληση ${item.name}: +€${total}`, 'cash')
      gameStore.saveGame()
      return true
    },

    buyItem(itemId, quantity = 1) {
      const item = getItemById(itemId)
      if (!item || item.buyPrice <= 0) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const total = item.buyPrice * quantity

      if (player.cash < total) {
        gameStore.addNotification('Δεν έχεις αρκετά χρήματα!', 'danger')
        return false
      }

      const addResult = this.addItem(itemId, quantity)
      if (addResult?.ok === false) {
        gameStore.addNotification(addResult.message, 'danger')
        return false
      }

      player.removeCash(total)
      gameStore.addNotification(`Αγόρασες ${item.name} x${quantity}`, 'success')
      gameStore.saveGame()
      return true
    },

    hasItem(itemId) {
      return this.items.some(i => i.itemId === itemId && i.quantity > 0)
    },

    getSerializable() {
      return {
        items: this.items.map(i => ({ ...i })),
        equipped: { ...this.equipped },
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.items) this.items = data.items.map(i => ({ ...i }))
      if (data.equipped) Object.assign(this.equipped, data.equipped)
    },
  }
})
