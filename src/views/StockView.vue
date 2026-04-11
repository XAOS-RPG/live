<template>
  <div class="stock-page">
    <h2 class="page-title">📈 Χρηματιστήριο</h2>

    <!-- Portfolio summary -->
    <div class="card portfolio-summary">
      <div class="summary-row">
        <div class="summary-item">
          <span class="text-muted">Αξία Χαρτοφυλακίου</span>
          <span class="text-mono text-accent">€{{ formatCash(stockStore.portfolioValue) }}</span>
        </div>
        <div class="summary-item">
          <span class="text-muted">Κέρδη / Ζημίες</span>
          <span class="text-mono" :class="stockStore.portfolioProfit >= 0 ? 'text-success' : 'text-danger'">
            {{ stockStore.portfolioProfit >= 0 ? '+' : '' }}€{{ formatCash(stockStore.portfolioProfit) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Stock list -->
    <div class="stock-list">
      <div v-for="stock in stocks" :key="stock.id" class="card stock-card">
        <div class="stock-header">
          <span class="stock-icon">{{ stock.icon }}</span>
          <div class="stock-info">
            <div class="stock-name-row">
              <strong>{{ stock.ticker }}</strong>
              <span class="stock-sector text-muted">{{ stock.sector }}</span>
            </div>
            <span class="stock-fullname text-muted">{{ stock.name }}</span>
          </div>
          <div class="stock-price-col">
            <span class="stock-price text-mono">€{{ stockStore.getCurrentPrice(stock.id).toFixed(2) }}</span>
            <span class="stock-change text-mono" :class="priceChangeClass(stock.id)">
              {{ priceChangeText(stock.id) }}
            </span>
          </div>
        </div>

        <!-- Mini price chart -->
        <div class="mini-chart">
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" class="chart-svg">
            <polyline
              :points="getChartPoints(stock.id)"
              fill="none"
              :stroke="priceChange(stock.id) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'"
              stroke-width="1.5"
            />
          </svg>
        </div>

        <!-- Holdings -->
        <div v-if="stockStore.getShares(stock.id) > 0" class="holdings">
          <span class="text-muted" style="font-size: var(--font-size-xs)">
            Κατέχεις: <strong class="text-accent">{{ stockStore.getShares(stock.id) }}</strong> μτχ
            (Μ.Ο. €{{ stockStore.getAvgPrice(stock.id).toFixed(2) }})
          </span>
        </div>

        <!-- Trade controls -->
        <div class="trade-controls">
          <div class="qty-row">
            <button class="btn btn-sm btn-outline" @click="adjustQty(stock.id, -10)">-10</button>
            <button class="btn btn-sm btn-outline" @click="adjustQty(stock.id, -1)">-1</button>
            <input
              type="number"
              class="qty-input"
              min="1"
              v-model.number="quantities[stock.id]"
            />
            <button class="btn btn-sm btn-outline" @click="adjustQty(stock.id, 1)">+1</button>
            <button class="btn btn-sm btn-outline" @click="adjustQty(stock.id, 10)">+10</button>
          </div>
          <div class="trade-cost text-muted" style="font-size: var(--font-size-xs); text-align: center;">
            Κόστος: €{{ formatCash(Math.ceil(stockStore.getCurrentPrice(stock.id) * (quantities[stock.id] || 1))) }}
          </div>
          <div class="trade-buttons">
            <button
              class="btn btn-sm btn-success"
              :disabled="!canBuy(stock.id)"
              @click="buy(stock.id)"
            >
              Αγορά
            </button>
            <button
              class="btn btn-sm btn-danger"
              :disabled="!canSell(stock.id)"
              @click="sell(stock.id)"
            >
              Πώληση
            </button>
          </div>
        </div>

        <!-- Dividend info -->
        <div class="dividend-info">
          <span class="text-muted" style="font-size: 10px">
            Μέρισμα: {{ (stock.dividendRate * 100).toFixed(1) }}% / 15λ
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useStockStore } from '../stores/stockStore'
import { useGameStore } from '../stores/gameStore'
import { stocks } from '../data/stocks'

const player = usePlayerStore()
const stockStore = useStockStore()
const gameStore = useGameStore()

// Initialize quantities
const quantities = reactive({})
for (const stock of stocks) {
  quantities[stock.id] = 1
}

function adjustQty(stockId, delta) {
  const current = quantities[stockId] || 1
  quantities[stockId] = Math.max(1, current + delta)
}

function canBuy(stockId) {
  const price = stockStore.getCurrentPrice(stockId)
  const qty = quantities[stockId] || 1
  return player.cash >= Math.ceil(price * qty)
}

function canSell(stockId) {
  const qty = quantities[stockId] || 1
  return stockStore.getShares(stockId) >= qty
}

function buy(stockId) {
  const qty = quantities[stockId] || 1
  const result = stockStore.buyStock(stockId, qty)
  if (!result.success) {
    gameStore.addNotification(result.message, 'danger')
  }
}

function sell(stockId) {
  const qty = quantities[stockId] || 1
  const result = stockStore.sellStock(stockId, qty)
  if (!result.success) {
    gameStore.addNotification(result.message, 'danger')
  }
}

function priceChange(stockId) {
  const history = stockStore.priceHistory[stockId]
  if (!history || history.length < 2) return 0
  return history[history.length - 1] - history[history.length - 2]
}

function priceChangeClass(stockId) {
  const change = priceChange(stockId)
  if (change > 0) return 'text-success'
  if (change < 0) return 'text-danger'
  return 'text-muted'
}

function priceChangeText(stockId) {
  const change = priceChange(stockId)
  const current = stockStore.getCurrentPrice(stockId)
  const pct = current > 0 ? ((change / current) * 100).toFixed(1) : '0.0'
  if (change > 0) return `+${pct}%`
  if (change < 0) return `${pct}%`
  return '0.0%'
}

function getChartPoints(stockId) {
  const history = stockStore.priceHistory[stockId] || []
  if (history.length < 2) return '0,20 200,20'
  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1
  return history.map((p, i) => {
    const x = (i / (history.length - 1)) * 200
    const y = 38 - ((p - min) / range) * 36
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function formatCash(amount) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(amount))
}
</script>

<style scoped>
.stock-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title {
  font-size: var(--font-size-2xl);
}

.portfolio-summary .summary-row {
  display: flex;
  justify-content: space-around;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-sm);
}

.stock-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.stock-card {
  transition: all var(--transition-fast);
}

.stock-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.stock-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.stock-info {
  flex: 1;
  min-width: 0;
}

.stock-name-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.stock-name-row strong {
  font-size: var(--font-size-sm);
}

.stock-sector {
  font-size: var(--font-size-xs);
}

.stock-fullname {
  font-size: var(--font-size-xs);
  display: block;
}

.stock-price-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.stock-price {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
}

.stock-change {
  font-size: var(--font-size-xs);
}

.mini-chart {
  height: 40px;
  margin: var(--space-xs) 0;
}

.chart-svg {
  width: 100%;
  height: 100%;
}

.holdings {
  margin-bottom: var(--space-xs);
}

.trade-controls {
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.qty-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.qty-input {
  flex: 1;
  text-align: center;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  padding: var(--space-xs);
  min-width: 0;
}

.qty-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.qty-input::-webkit-inner-spin-button,
.qty-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.qty-input[type="number"] {
  -moz-appearance: textfield;
}

.trade-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs);
}

.btn-success {
  background: var(--color-success);
  color: #fff;
  border: none;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
}

.btn-success:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-danger {
  background: var(--color-danger);
  color: #fff;
  border: none;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
}

.btn-danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dividend-info {
  margin-top: var(--space-xs);
  text-align: right;
}
</style>
