<template>
  <div class="bazaar-page">
    <h2 class="page-title">🏪 Παζάρι</h2>

    <!-- Tabs -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: tab === 'buy' }" @click="tab = 'buy'">🛒 Αγορά</button>
      <button class="tab-btn" :class="{ active: tab === 'sell' }" @click="tab = 'sell'">📦 Πώληση</button>
      <button class="tab-btn" :class="{ active: tab === 'my' }" @click="tab = 'my'">
        📋 Οι Αγγελίες μου
        <span v-if="readyToCollect.length" class="badge badge-success ml-xs">{{ readyToCollect.length }}</span>
      </button>
    </div>

    <!-- BUY tab -->
    <template v-if="tab === 'buy'">
      <div class="card text-muted filter-row">
        <span class="filter-label">Φίλτρο:</span>
        <button
          v-for="f in filters"
          :key="f.key"
          class="filter-btn"
          :class="{ active: buyFilter === f.key }"
          @click="buyFilter = f.key"
        >{{ f.label }}</button>
      </div>

      <div v-if="!filteredFakeListings.length" class="card text-center text-muted">
        Δεν υπάρχουν διαθέσιμα αντικείμενα στη συγκεκριμένη κατηγορία.
      </div>

      <div
        v-for="listing in filteredFakeListings"
        :key="listing.id"
        class="card listing-card"
      >
        <div class="listing-top">
          <span class="listing-icon">{{ listing.itemIcon }}</span>
          <div class="listing-info">
            <strong :class="'rarity-' + listing.itemRarity">{{ listing.itemName }}</strong>
            <span class="text-muted listing-seller">{{ listing.sellerIcon }} {{ listing.sellerName }}</span>
          </div>
          <div class="listing-right">
            <span class="listing-price text-mono text-success">€{{ listing.price }}</span>
            <span class="text-muted listing-qty">x{{ listing.quantity }}</span>
          </div>
        </div>
        <button
          class="btn btn-sm btn-primary btn-block"
          :disabled="player.cash < listing.price"
          @click="buyListing(listing)"
        >
          {{ player.cash >= listing.price ? 'Αγορά' : 'Ανεπαρκή Κεφάλαια' }}
        </button>
      </div>
    </template>

    <!-- SELL tab -->
    <template v-else-if="tab === 'sell'">
      <div class="card text-muted" style="font-size: var(--font-size-xs); text-align: center;">
        Αντικείμενα που βάζεις προς πώληση αγοράζονται αυτόματα σε λίγα λεπτά. Μέγιστο 5 αγγελίες ταυτόχρονα.
      </div>

      <div v-if="!sellableItems.length" class="card text-center text-muted">
        Δεν έχεις αντικείμενα για πώληση στο παζάρι.<br>
        <router-link to="/inventory" class="btn btn-sm btn-outline mt-sm">Πήγαινε στο Κατάστημα</router-link>
      </div>

      <div
        v-for="entry in sellableItems"
        :key="entry.itemId"
        class="card listing-card"
      >
        <div class="listing-top">
          <span class="listing-icon">{{ entry.data.icon }}</span>
          <div class="listing-info">
            <strong :class="'rarity-' + entry.data.rarity">{{ entry.data.name }}</strong>
            <span class="text-muted listing-qty-text">x{{ entry.quantity }} στο αποθηκευτικό χώρο</span>
          </div>
          <div class="listing-right">
            <span class="text-muted listing-price">Τιμή: €{{ suggestedPrice(entry.data) }}</span>
          </div>
        </div>
        <button
          class="btn btn-sm btn-success btn-block"
          :disabled="activeListingsCount >= 5"
          @click="postItem(entry)"
        >
          {{ activeListingsCount >= 5 ? 'Γεμάτες Αγγελίες (5/5)' : `Πώληση για €${suggestedPrice(entry.data)}` }}
        </button>
      </div>
    </template>

    <!-- MY LISTINGS tab -->
    <template v-else>
      <div v-if="!bazaar.myListings.length" class="card text-center text-muted">
        Δεν έχεις ενεργές αγγελίες. Πήγαινε στην καρτέλα Πώληση!
      </div>

      <div
        v-for="listing in bazaar.myListings"
        :key="listing.id"
        class="card listing-card"
        :class="{ 'listing-sold': listing.collected }"
      >
        <div class="listing-top">
          <span class="listing-icon">{{ listing.itemIcon }}</span>
          <div class="listing-info">
            <strong>{{ listing.itemName }}</strong>
            <span class="text-muted listing-qty-text">x{{ listing.quantity }}</span>
          </div>
          <div class="listing-right">
            <span class="listing-price text-mono text-success">€{{ listing.price * listing.quantity }}</span>
          </div>
        </div>
        <div class="listing-status">
          <template v-if="listing.collected">
            <span class="badge badge-success">✔ Πουλήθηκε</span>
          </template>
          <template v-else-if="isReadyToCollect(listing)">
            <button class="btn btn-sm btn-success" @click="collectSale(listing.id)">
              💰 Είσπραξε €{{ listing.price * listing.quantity }}
            </button>
          </template>
          <template v-else>
            <span class="badge badge-warning">⏳ Αναμονή αγοραστή…</span>
            <button class="btn btn-sm btn-outline" @click="cancelListing(listing.id)">Ακύρωση</button>
          </template>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBazaarStore } from '../stores/bazaarStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'

const bazaar = useBazaarStore()
const inventory = useInventoryStore()
const player = usePlayerStore()
const gameStore = useGameStore()

const tab = ref('buy')
const buyFilter = ref('all')

const filters = [
  { key: 'all',     label: 'Όλα' },
  { key: 'weapon',  label: '⚔️ Όπλα' },
  { key: 'armor',   label: '🛡️ Πανοπλία' },
  { key: 'medical', label: '💊 Ιατρικά' },
  { key: 'drug',    label: '🌿 Ουσίες' },
  { key: 'misc',    label: '🎒 Λοιπά' },
]

const filteredFakeListings = computed(() => {
  const listings = bazaar.fakeListings
  if (buyFilter.value === 'all') return listings
  return listings.filter(l => l.itemType === buyFilter.value)
})

const sellableItems = computed(() =>
  inventory.sortedItems.filter(e => e.data.sellPrice > 0)
)

const activeListingsCount = computed(() =>
  bazaar.myListings.filter(l => !l.collected).length
)

const readyToCollect = computed(() =>
  bazaar.myListings.filter(l => !l.collected && isReadyToCollect(l))
)

function isReadyToCollect(listing) {
  return Date.now() - listing.postedAt >= 3 * 60 * 1000 // 3 minutes
}

function suggestedPrice(itemData) {
  return Math.ceil(itemData.sellPrice * 1.3)
}

function buyListing(listing) {
  if (player.cash < listing.price) return
  player.removeCash(listing.price)
  inventory.addItem(listing.itemId, listing.quantity)
  bazaar.buyFakeListing(listing.id)
  gameStore.addNotification(`Αγόρασες ${listing.itemName} για €${listing.price}`, 'success')
  gameStore.saveGame()
}

function postItem(entry) {
  if (activeListingsCount.value >= 5) return
  const price = suggestedPrice(entry.data)
  const ok = bazaar.postListing(entry.itemId, entry.data, price, 1)
  if (ok) {
    inventory.removeItem(entry.itemId, 1)
    gameStore.addNotification(`Έβαλες ${entry.data.name} στο Παζάρι για €${price}`, 'success')
    gameStore.saveGame()
    tab.value = 'my'
  }
}

function cancelListing(id) {
  const listing = bazaar.myListings.find(l => l.id === id)
  if (listing) {
    inventory.addItem(listing.itemId, listing.quantity)
  }
  bazaar.cancelListing(id)
  gameStore.saveGame()
}

function collectSale(id) {
  const earned = bazaar.collectSale(id)
  if (earned > 0) {
    player.addCash(earned)
    gameStore.addNotification(`Εισέπραξες €${earned} από το Παζάρι!`, 'success')
    gameStore.saveGame()
  }
}
</script>

<style scoped>
.bazaar-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); }

.tab-bar {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.tab-btn {
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.tab-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--bg-base);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
  padding: var(--space-xs) var(--space-sm);
}

.filter-label { font-size: var(--font-size-xs); }

.filter-btn {
  padding: 2px var(--space-xs);
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.filter-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.listing-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.listing-card.listing-sold { opacity: 0.5; }

.listing-top {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.listing-icon { font-size: 24px; flex-shrink: 0; }

.listing-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-sm);
}

.listing-seller, .listing-qty-text { font-size: var(--font-size-xs); }

.listing-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.listing-price { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); }
.listing-qty   { font-size: var(--font-size-xs); }

.listing-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.btn-block { width: 100%; }
.ml-xs { margin-left: var(--space-xs); }

.rarity-common    { color: var(--text-primary); }
.rarity-uncommon  { color: #4CAF50; }
.rarity-rare      { color: #42A5F5; }
.rarity-epic      { color: #AB47BC; }
.rarity-legendary { color: #FFB300; }
</style>
