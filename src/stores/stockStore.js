import { defineStore } from 'pinia'
import { stocks, getStockById } from '../data/stocks'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

const PRICE_UPDATE_INTERVAL = 60000  // prices update every 60s
const DIVIDEND_INTERVAL = 900000     // dividends every 15 min

export const useStockStore = defineStore('stock', {
  state: () => ({
    // Current prices keyed by stock id
    prices: {},
    // Player portfolio: { stockId: { shares, avgBuyPrice } }
    portfolio: {},
    // Price history for mini charts (last 20 prices per stock)
    priceHistory: {},
    // Timestamps
    lastPriceUpdate: 0,
    lastDividend: 0,
  }),

  getters: {
    getCurrentPrice() {
      return (stockId) => this.prices[stockId] || getStockById(stockId)?.basePrice || 0
    },

    getShares() {
      return (stockId) => this.portfolio[stockId]?.shares || 0
    },

    getAvgPrice() {
      return (stockId) => this.portfolio[stockId]?.avgBuyPrice || 0
    },

    portfolioValue() {
      let total = 0
      for (const [stockId, holding] of Object.entries(this.portfolio)) {
        total += holding.shares * (this.prices[stockId] || 0)
      }
      return total
    },

    portfolioCost() {
      let total = 0
      for (const holding of Object.values(this.portfolio)) {
        total += holding.shares * holding.avgBuyPrice
      }
      return total
    },

    portfolioProfit() {
      return this.portfolioValue - this.portfolioCost
    },
  },

  actions: {
    initializePrices() {
      for (const stock of stocks) {
        if (!this.prices[stock.id]) {
          this.prices[stock.id] = stock.basePrice
        }
        if (!this.priceHistory[stock.id]) {
          this.priceHistory[stock.id] = [stock.basePrice]
        }
      }
    },

    /**
     * Called from the game loop to update prices periodically.
     */
    tickPrices() {
      const now = Date.now()

      // Update prices
      if (now - this.lastPriceUpdate >= PRICE_UPDATE_INTERVAL) {
        this.lastPriceUpdate = now
        for (const stock of stocks) {
          const current = this.prices[stock.id] || stock.basePrice
          // Random walk with mean reversion
          const meanReversion = (stock.basePrice - current) * 0.01
          const randomChange = (Math.random() - 0.5) * 2 * stock.volatility * current
          const newPrice = Math.max(0.10, current + randomChange + meanReversion)
          this.prices[stock.id] = Math.round(newPrice * 100) / 100

          // Update history (keep last 20)
          if (!this.priceHistory[stock.id]) this.priceHistory[stock.id] = []
          this.priceHistory[stock.id].push(this.prices[stock.id])
          if (this.priceHistory[stock.id].length > 20) {
            this.priceHistory[stock.id].shift()
          }
        }
      }

      // Pay dividends
      if (now - this.lastDividend >= DIVIDEND_INTERVAL) {
        this.lastDividend = now
        const player = usePlayerStore()
        let totalDividends = 0

        for (const stock of stocks) {
          const holding = this.portfolio[stock.id]
          if (!holding || holding.shares <= 0) continue
          const price = this.prices[stock.id] || stock.basePrice
          const dividend = Math.floor(holding.shares * price * stock.dividendRate)
          if (dividend > 0) {
            totalDividends += dividend
          }
        }

        if (totalDividends > 0) {
          player.addCash(totalDividends)
          player.logActivity(`📈 Μερίσματα: +€${totalDividends}`, 'info')
          const gameStore = useGameStore()
          gameStore.addNotification(`Μερίσματα: +€${totalDividends}`, 'success')
        }
      }
    },

    buyStock(stockId, quantity) {
      const stock = getStockById(stockId)
      if (!stock) return { success: false, message: 'Άγνωστη μετοχή' }

      const player = usePlayerStore()
      const price = this.prices[stockId] || stock.basePrice
      const totalCost = Math.ceil(price * quantity)

      if (player.cash < totalCost) {
        return { success: false, message: 'Δεν έχεις αρκετά χρήματα!' }
      }

      player.removeCash(totalCost)

      if (!this.portfolio[stockId]) {
        this.portfolio[stockId] = { shares: 0, avgBuyPrice: 0 }
      }

      const holding = this.portfolio[stockId]
      const totalShares = holding.shares + quantity
      holding.avgBuyPrice = ((holding.avgBuyPrice * holding.shares) + (price * quantity)) / totalShares
      holding.shares = totalShares

      player.logActivity(`📈 Αγορά ${quantity}x ${stock.ticker} @ €${price.toFixed(2)}`, 'info')
      const gameStore = useGameStore()
      gameStore.saveGame()

      return { success: true, totalCost }
    },

    sellStock(stockId, quantity) {
      const stock = getStockById(stockId)
      if (!stock) return { success: false, message: 'Άγνωστη μετοχή' }

      const holding = this.portfolio[stockId]
      if (!holding || holding.shares < quantity) {
        return { success: false, message: 'Δεν έχεις αρκετές μετοχές!' }
      }

      const price = this.prices[stockId] || stock.basePrice
      const totalRevenue = Math.floor(price * quantity)
      const player = usePlayerStore()

      player.addCash(totalRevenue)
      holding.shares -= quantity

      if (holding.shares <= 0) {
        delete this.portfolio[stockId]
      }

      player.logActivity(`📉 Πώληση ${quantity}x ${stock.ticker} @ €${price.toFixed(2)}`, 'info')
      const gameStore = useGameStore()
      gameStore.saveGame()

      return { success: true, totalRevenue }
    },

    getSerializable() {
      return {
        prices: { ...this.prices },
        portfolio: JSON.parse(JSON.stringify(this.portfolio)),
        priceHistory: JSON.parse(JSON.stringify(this.priceHistory)),
        lastPriceUpdate: this.lastPriceUpdate,
        lastDividend: this.lastDividend,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.prices) this.prices = { ...data.prices }
      if (data.portfolio) this.portfolio = JSON.parse(JSON.stringify(data.portfolio))
      if (data.priceHistory) this.priceHistory = JSON.parse(JSON.stringify(data.priceHistory))
      if (data.lastPriceUpdate) this.lastPriceUpdate = data.lastPriceUpdate
      if (data.lastDividend) this.lastDividend = data.lastDividend
      this.initializePrices()
    },
  },
})
