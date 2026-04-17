import { defineStore } from 'pinia'
import { getItemById } from '../data/items'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useWeeklyEventStore } from './weeklyEventStore'
import { usePetStore } from './petStore'
import { useTerritoryStore } from './territoryStore'
import { useTravelStore } from './travelStore'

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    items: [],         // [{ itemId, quantity }]
    equipped: {
      weapon: null,    // itemId or null
      armor: null,     // itemId or null
    },
    maxSlots: 20,
    pinkbullToday: 0,
    pinkbullDayKey: '',
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
        // Medical Badge: +20% to all heal amounts
        const badgeMult = player.hasMedicalBadge ? 1.20 : 1.0
        if (item.id === 'pinkbull') {
          const todayKey = new Date().toDateString()
          if (this.pinkbullDayKey !== todayKey) {
            this.pinkbullDayKey = todayKey
            this.pinkbullToday = 0
          }
          this.pinkbullToday++
          player.modifyResource('energy', item.energyBoost)
          this.removeItem(itemId, 1)
          gameStore.addNotification(`🩷 Pink Bull! +${item.energyBoost} Ενέργεια`, 'success')
          player.logActivity(`🩷 Pink Bull +${item.energyBoost} Ενέργεια`, 'info')
          if (this.pinkbullToday > 2) {
            const overdoseChance = (this.pinkbullToday - 2) * 0.02
            if (Math.random() < overdoseChance) {
              player.setStatus('hospital', 30 * 60 * 1000)
              gameStore.addNotification('💔 Υπερένταση από Pink Bull! Νοσοκομείο 30 λεπτά!', 'danger')
              player.logActivity('💔 Υπερένταση Pink Bull → Νοσοκομείο', 'danger')
            }
          }
          return true
        }
        if (item.healAmount) {
          player.modifyResource('hp', Math.floor(item.healAmount * badgeMult))
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
        if (item.strengthBoost) {
          player.trainStat('strength', item.strengthBoost)
        }
        this.removeItem(itemId, 1)
        const parts = []
        if (item.happinessBoost) parts.push(`+${item.happinessBoost} Κέφι`)
        if (item.strengthBoost) parts.push(`+${item.strengthBoost} Δύναμη`)
        const detail = parts.length ? ` (${parts.join(', ')})` : ''
        gameStore.addNotification(`Χρησιμοποίησες ${item.name}${detail}`, 'info')
        player.logActivity(`${item.icon} ${item.name}${detail}`, 'info')
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
      const total = Math.floor(item.sellPrice * quantity * usePetStore().sellPriceBonus)

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
      const weeklyEvent = useWeeklyEventStore()

      // Filotimo 10% discount at Μαρκετ when filotimo >= 100
      const filotimoDiscount = player.highFilotimoDiscount
      const total = Math.floor(item.buyPrice * quantity * weeklyEvent.shopPriceMultiplier * (1 - filotimoDiscount))

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

      // Territory Φόρος: 2% tax on market purchase in controlled city
      const cityId = useTravelStore().currentLocation
      const tax = useTerritoryStore().calculateTaxOnPurchase(cityId, total)
      if (tax > 0) {
        player.logActivity(`🏛️ Φόρος Αγοράς: €${tax}`, 'warning')
      }

      const discountNote = filotimoDiscount > 0 ? ` (-${Math.round(filotimoDiscount * 100)}% Φιλότιμο)` : ''
      gameStore.addNotification(`Αγόρασες ${item.name} x${quantity}${discountNote}`, 'success')
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
        pinkbullToday: this.pinkbullToday,
        pinkbullDayKey: this.pinkbullDayKey,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.items) this.items = data.items.map(i => ({ ...i }))
      if (data.equipped) Object.assign(this.equipped, data.equipped)
      if (data.pinkbullDayKey !== undefined) this.pinkbullDayKey = data.pinkbullDayKey
      if (data.pinkbullToday !== undefined) this.pinkbullToday = data.pinkbullToday
    },
  }
})
