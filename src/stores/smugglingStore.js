import { defineStore } from 'pinia'
import { contrabandGoods, getContrabandPrice, calculateCheckpointChance } from '../data/contraband'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useTravelStore } from './travelStore'

const JAIL_BASE_MS = 60 * 60 * 1000 // 1 hour base jail time

export const useSmugglingStore = defineStore('smuggling', {
  state: () => ({
    // Player's contraband cargo: [{ goodId, quantity, boughtAt (price per unit), boughtInCity }]
    cargo: [],
    maxCargoSlots: 10,
    totalSmugglingRuns: 0,
    successfulRuns: 0,
    totalProfit: 0,
    lastBusted: null,
  }),

  getters: {
    cargoWeight() {
      return this.cargo.reduce((sum, c) => {
        const good = contrabandGoods.find(g => g.id === c.goodId)
        return sum + (good?.weight || 1) * c.quantity
      }, 0)
    },

    cargoSlotsFree() {
      return Math.max(0, this.maxCargoSlots - this.cargoWeight)
    },

    hasCargo() {
      return this.cargo.length > 0
    },

    checkpointRisk() {
      const cargoForCalc = this.cargo.map(c => {
        const good = contrabandGoods.find(g => g.id === c.goodId)
        return { rarity: good?.rarity || 'common', quantity: c.quantity }
      })
      return calculateCheckpointChance(cargoForCalc)
    },
  },

  actions: {
    /**
     * Buy contraband in the current city.
     */
    buyContraband(goodId, quantity = 1) {
      const good = contrabandGoods.find(g => g.id === goodId)
      if (!good) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const travelStore = useTravelStore()
      const cityId = travelStore.currentLocation

      // Check cargo capacity
      const neededSlots = good.weight * quantity
      if (neededSlots > this.cargoSlotsFree) {
        gameStore.addNotification('Δεν χωράει άλλο εμπόρευμα!', 'danger')
        return false
      }

      const pricePerUnit = getContrabandPrice(good, cityId)
      const totalCost = pricePerUnit * quantity

      if (player.cash < totalCost) {
        gameStore.addNotification('Δεν έχεις αρκετά χρήματα!', 'danger')
        return false
      }

      player.removeCash(totalCost)

      // Stack with existing cargo of same type
      const existing = this.cargo.find(c => c.goodId === goodId)
      if (existing) {
        // Average the buy price
        const totalQty = existing.quantity + quantity
        existing.boughtAt = Math.floor((existing.boughtAt * existing.quantity + pricePerUnit * quantity) / totalQty)
        existing.quantity = totalQty
      } else {
        this.cargo.push({
          goodId,
          quantity,
          boughtAt: pricePerUnit,
          boughtInCity: cityId,
        })
      }

      gameStore.addNotification(`Αγόρασες ${quantity}x ${good.name} για €${totalCost}`, 'info')
      player.logActivity(`🚬 Αγορά λαθραίων: ${good.name} x${quantity}`, 'info')
      gameStore.saveGame()
      return true
    },

    /**
     * Sell contraband in the current city.
     */
    sellContraband(goodId, quantity = 1) {
      const good = contrabandGoods.find(g => g.id === goodId)
      if (!good) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const travelStore = useTravelStore()
      const cityId = travelStore.currentLocation

      const cargoEntry = this.cargo.find(c => c.goodId === goodId)
      if (!cargoEntry || cargoEntry.quantity < quantity) {
        gameStore.addNotification('Δεν έχεις τόση ποσότητα!', 'danger')
        return false
      }

      const pricePerUnit = getContrabandPrice(good, cityId)
      const totalRevenue = pricePerUnit * quantity
      const profit = totalRevenue - (cargoEntry.boughtAt * quantity)

      player.addCash(totalRevenue)
      cargoEntry.quantity -= quantity
      if (cargoEntry.quantity <= 0) {
        this.cargo = this.cargo.filter(c => c.goodId !== goodId)
      }

      this.totalProfit += profit
      this.successfulRuns++

      const profitText = profit >= 0 ? `+€${profit}` : `-€${Math.abs(profit)}`
      gameStore.addNotification(`Πούλησες ${quantity}x ${good.name} για €${totalRevenue} (${profitText})`, profit >= 0 ? 'cash' : 'warning')
      player.logActivity(`🚬 Πώληση λαθραίων: ${good.name} x${quantity} (${profitText})`, 'cash')
      gameStore.saveGame()
      return true
    },

    /**
     * Called when travel completes — police checkpoint check.
     * Returns true if player was busted.
     */
    checkPoliceCheckpoint() {
      if (!this.hasCargo) return false

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const chance = this.checkpointRisk

      this.totalSmugglingRuns++

      if (Math.random() < chance) {
        // BUSTED
        const lostItems = this.cargo.map(c => {
          const good = contrabandGoods.find(g => g.id === c.goodId)
          return `${c.quantity}x ${good?.name || c.goodId}`
        }).join(', ')

        // Calculate fine
        const cargoValue = this.cargo.reduce((sum, c) => {
          const good = contrabandGoods.find(g => g.id === c.goodId)
          return sum + (good?.basePrice || 0) * c.quantity
        }, 0)
        const fine = Math.floor(cargoValue * 0.5)

        // Lose all cargo
        this.cargo = []

        // Pay fine
        player.removeCash(fine)

        // Jail time scales with cargo value
        const jailMultiplier = Math.min(6, 1 + Math.floor(cargoValue / 5000))
        const jailTime = JAIL_BASE_MS * jailMultiplier
        player.setStatus('jail', jailTime)

        this.lastBusted = Date.now()

        const jailMinutes = Math.floor(jailTime / 60000)
        gameStore.addNotification(`🚨 Σε έπιασαν! Χάθηκαν: ${lostItems}. Πρόστιμο €${fine}. Φυλακή ${jailMinutes} λεπτά.`, 'danger')
        player.logActivity(`🚨 Λαθρεμπόριο: Σύλληψη! -€${fine}, φυλακή ${jailMinutes}λ`, 'danger')
        gameStore.saveGame()
        return true
      }

      return false
    },

    /**
     * Drop all cargo (panic dump).
     */
    dropAllCargo() {
      const gameStore = useGameStore()
      const player = usePlayerStore()
      if (!this.hasCargo) return

      this.cargo = []
      gameStore.addNotification('Πέταξες όλο το εμπόρευμα!', 'warning')
      player.logActivity('🚬 Πέταξε λαθραίο εμπόρευμα', 'warning')
      gameStore.saveGame()
    },

    getSerializable() {
      return {
        cargo: this.cargo.map(c => ({ ...c })),
        maxCargoSlots: this.maxCargoSlots,
        totalSmugglingRuns: this.totalSmugglingRuns,
        successfulRuns: this.successfulRuns,
        totalProfit: this.totalProfit,
        lastBusted: this.lastBusted,
      }
    },

    hydrate(data) {
      if (!data) return
      if (Array.isArray(data.cargo)) this.cargo = data.cargo.map(c => ({ ...c }))
      if (data.maxCargoSlots !== undefined) this.maxCargoSlots = data.maxCargoSlots
      if (data.totalSmugglingRuns !== undefined) this.totalSmugglingRuns = data.totalSmugglingRuns
      if (data.successfulRuns !== undefined) this.successfulRuns = data.successfulRuns
      if (data.totalProfit !== undefined) this.totalProfit = data.totalProfit
      if (data.lastBusted !== undefined) this.lastBusted = data.lastBusted
    },
  },
})
