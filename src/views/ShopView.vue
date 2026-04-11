<template>
  <div class="shop-page">

    <!-- Mode selector -->
    <div class="shop-mode-bar">
      <button
        class="mode-btn"
        :class="{ active: mode === 'market' }"
        @click="mode = 'market'"
      >
        🛒 Μαρκετ
      </button>
      <button
        class="mode-btn black"
        :class="{ active: mode === 'black' }"
        @click="mode = 'black'"
      >
        🖤 Μαύρη Αγορά
      </button>
    </div>

    <!-- ===== MARKET ===== -->
    <template v-if="mode === 'market'">
      <div class="shop-header market-header">
        <h2 class="page-title">🛒 Μαρκετ</h2>
        <span class="cash-badge text-mono">€{{ formatCash(player.cash) }}</span>
      </div>

      <div class="category-bar">
        <button
          v-for="cat in marketCategories"
          :key="cat.key"
          class="cat-btn"
          :class="{ active: marketCat === cat.key }"
          @click="marketCat = cat.key"
        >{{ cat.label }}</button>
      </div>

      <div class="item-list">
        <div v-for="item in filteredMarketItems" :key="item.id" class="card item-card">
          <div class="item-left">
            <span class="item-icon">{{ item.icon }}</span>
            <div class="item-info">
              <strong :class="'rarity-' + item.rarity">{{ item.name }}</strong>
              <p class="text-muted item-desc">{{ item.description }}</p>
              <div class="item-stats">
                <span v-if="item.defense" class="badge badge-info">DEF {{ item.defense }}</span>
                <span v-if="item.healAmount" class="badge badge-success">HP +{{ item.healAmount }}</span>
                <span v-if="item.energyBoost" class="badge badge-warning">EN +{{ item.energyBoost }}</span>
                <span v-if="item.hospitalReduction" class="badge badge-info">Νοσ. -{{ item.hospitalReduction / 60000 }}λ</span>
                <span v-if="item.levelRequired > 1" class="badge badge-outline">Επ. {{ item.levelRequired }}+</span>
              </div>
            </div>
          </div>
          <button
            class="btn btn-sm btn-primary"
            :disabled="player.cash < item.buyPrice || player.level < item.levelRequired"
            @click="buy(item)"
          >
            €{{ formatCash(item.buyPrice) }}
          </button>
        </div>
        <div v-if="!filteredMarketItems.length" class="empty-state text-muted text-center">
          Δεν υπάρχουν διαθέσιμα αντικείμενα.
        </div>
      </div>
    </template>

    <!-- ===== BLACK MARKET ===== -->
    <template v-else>
      <div class="shop-header black-header">
        <h2 class="page-title black-title">🖤 Μαύρη Αγορά</h2>
        <span class="cash-badge text-mono">€{{ formatCash(player.cash) }}</span>
      </div>

      <div class="card black-notice">
        ⚠️ Παράνομα αντικείμενα. Χρήση με δική σου ευθύνη.
      </div>

      <div class="category-bar">
        <button
          v-for="cat in blackCategories"
          :key="cat.key"
          class="cat-btn cat-btn-black"
          :class="{ active: blackCat === cat.key }"
          @click="blackCat = cat.key"
        >{{ cat.label }}</button>
      </div>

      <div class="item-list">
        <div v-for="item in filteredBlackItems" :key="item.id" class="card item-card black-card">
          <div class="item-left">
            <span class="item-icon">{{ item.icon }}</span>
            <div class="item-info">
              <strong :class="'rarity-' + item.rarity">{{ item.name }}</strong>
              <p class="text-muted item-desc">{{ item.description }}</p>
              <div class="item-stats">
                <span v-if="item.damage" class="badge badge-danger">DMG {{ item.damage }}</span>
                <span v-if="item.accuracy" class="badge badge-info">ACC {{ Math.round(item.accuracy * 100) }}%</span>
                <span v-if="item.happinessBoost" class="badge badge-warning">Κέφι +{{ item.happinessBoost }}</span>
                <span v-if="item.energyBoost" class="badge badge-warning">EN +{{ item.energyBoost }}</span>
                <span v-if="item.strengthBoost" class="badge badge-danger">STR +{{ item.strengthBoost }}</span>
                <span v-if="item.levelRequired > 1" class="badge badge-outline">Επ. {{ item.levelRequired }}+</span>
              </div>
            </div>
          </div>
          <button
            class="btn btn-sm btn-danger"
            :disabled="player.cash < item.buyPrice || player.level < item.levelRequired"
            @click="buy(item)"
          >
            €{{ formatCash(item.buyPrice) }}
          </button>
        </div>
        <div v-if="!filteredBlackItems.length" class="empty-state text-muted text-center">
          Δεν υπάρχουν διαθέσιμα αντικείμενα.
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { getBuyableItems } from '../data/items'

const player = usePlayerStore()
const inventory = useInventoryStore()

const mode = ref('market')
const marketCat = ref('all')
const blackCat = ref('all')

const marketCategories = [
  { key: 'all', label: 'Όλα' },
  { key: 'armor', label: '🛡️ Πανοπλία' },
  { key: 'medical', label: '💊 Ιατρικά' },
]

const blackCategories = [
  { key: 'all', label: 'Όλα' },
  { key: 'weapon', label: '⚔️ Όπλα' },
  { key: 'drug', label: '🌿 Ουσίες' },
]

const allBuyable = getBuyableItems()

// Legal items: armor & medical
const marketItems = allBuyable.filter(i => i.type === 'armor' || i.type === 'medical')

// Illegal items: weapons & drugs
const blackItems = allBuyable.filter(i => i.type === 'weapon' || i.type === 'drug')

const filteredMarketItems = computed(() => {
  if (marketCat.value === 'all') return marketItems.sort((a, b) => a.buyPrice - b.buyPrice)
  return marketItems.filter(i => i.type === marketCat.value).sort((a, b) => a.buyPrice - b.buyPrice)
})

const filteredBlackItems = computed(() => {
  if (blackCat.value === 'all') return blackItems.sort((a, b) => a.buyPrice - b.buyPrice)
  return blackItems.filter(i => i.type === blackCat.value).sort((a, b) => a.buyPrice - b.buyPrice)
})

function formatCash(n) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(n))
}

function buy(item) {
  if (player.cash < item.buyPrice || player.level < item.levelRequired) return
  inventory.buyItem(item.id)
}
</script>

<style scoped>
.shop-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Mode selector */
.shop-mode-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs);
}

.mode-btn {
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.mode-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--bg-base);
}

.mode-btn.black.active {
  background: #c62828;
  border-color: #c62828;
  color: #fff;
}

.mode-btn.black:not(.active):hover {
  border-color: #c62828;
  color: #c62828;
}

/* Headers */
.shop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title { font-size: var(--font-size-2xl); margin: 0; }

.black-title { color: #ef5350; }

.cash-badge {
  font-size: var(--font-size-sm);
  background: var(--bg-surface-raised);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-full);
  color: var(--color-success);
  font-weight: var(--font-weight-bold);
}

/* Black market notice */
.black-notice {
  font-size: var(--font-size-xs);
  color: var(--color-warning);
  border-color: var(--color-warning);
  text-align: center;
  padding: var(--space-xs) var(--space-sm);
}

/* Category bar */
.category-bar {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.cat-btn {
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.cat-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--bg-base);
}

.cat-btn-black.active {
  background: #c62828;
  border-color: #c62828;
  color: #fff;
}

/* Items */
.item-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.black-card {
  border-left: 2px solid #c62828;
}

.item-left {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.item-icon { font-size: 26px; flex-shrink: 0; }

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-info strong { font-size: var(--font-size-sm); }
.item-desc { font-size: var(--font-size-xs); margin: 0; line-height: 1.3; }

.item-stats {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  margin-top: 2px;
}

.empty-state {
  padding: var(--space-xl);
  font-size: var(--font-size-sm);
}

/* Rarity colors */
.rarity-common    { color: var(--text-primary); }
.rarity-uncommon  { color: #4CAF50; }
.rarity-rare      { color: #42A5F5; }
.rarity-epic      { color: #AB47BC; }
.rarity-legendary { color: #FFB300; }

.badge-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 1px 5px;
  border-radius: var(--border-radius-sm);
  font-size: 10px;
}
</style>
