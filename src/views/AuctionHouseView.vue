<template>
  <div class="auction-view">
    <h1 class="page-title">🏛️ Ζωντανή Δημοπρασία</h1>

    <!-- Outbid / won alerts -->
    <div v-if="auctionStore.pendingAlerts.length" class="alerts-bar">
      <div
        v-for="(alert, i) in auctionStore.pendingAlerts"
        :key="i"
        class="alert-pill"
        :class="alert.type"
        @click="auctionStore.dismissAlert(i)"
      >
        <span>{{ alert.message }}</span>
        <span class="alert-close">✕</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- ── BROWSE tab ────────────────────────────────────────────── -->
    <div v-if="activeTab === 'browse'" class="tab-content">
      <div v-if="!auctionStore.activeListings.length" class="empty-state">
        Δεν υπάρχουν ενεργές δημοπρασίες αυτή τη στιγμή.
      </div>
      <div class="listings-grid">
        <div
          v-for="listing in auctionStore.activeListings"
          :key="listing.id"
          class="listing-card"
          :class="listing.itemRarity"
        >
          <div class="listing-header">
            <span class="listing-icon">{{ listing.itemIcon }}</span>
            <div class="listing-meta">
              <span class="listing-name">{{ listing.itemName }}</span>
              <span class="rarity-badge" :class="listing.itemRarity">{{ rarityLabel(listing.itemRarity) }}</span>
            </div>
            <span v-if="listing.craftMultiplier" class="craft-badge">
              ×{{ listing.craftMultiplier.toFixed(2) }}
            </span>
          </div>

          <div class="listing-details">
            <div class="detail-row">
              <span class="detail-label">Πωλητής</span>
              <span class="detail-value">{{ listing.sellerName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Τρέχουσα</span>
              <span class="detail-value price">€{{ fmt(listing.currentBid) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Υψηλότερη</span>
              <span class="detail-value" :class="{ 'is-you': listing.highestBidderId === player.id }">
                {{ listing.highestBidderName ?? '—' }}
                <span v-if="listing.highestBidderId === player.id"> (Εσύ)</span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Λήγει</span>
              <span class="detail-value countdown" :class="{ urgent: timeLeft(listing) < 300_000 }">
                {{ formatCountdown(listing) }}
              </span>
            </div>
          </div>

          <div
            v-if="listing.sellerId !== player.id"
            class="bid-row"
          >
            <input
              v-model.number="bidDrafts[listing.id]"
              class="bid-input"
              type="number"
              :min="minNextBid(listing.currentBid)"
              :placeholder="`min €${fmt(minNextBid(listing.currentBid))}`"
            />
            <button
              class="btn btn-primary bid-btn"
              :disabled="!canBid(listing)"
              @click="submitBid(listing)"
            >
              Προσφορά
            </button>
          </div>
          <div v-else class="own-listing-note">Δική σου αγγελία</div>
        </div>
      </div>
    </div>

    <!-- ── LIST ITEM tab ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'list'" class="tab-content">
      <div class="list-form card">
        <h2 class="section-title">Καταχώρηση Αντικειμένου</h2>
        <p class="list-note">
          Προμήθεια καταχώρησης: <strong>5%</strong> του τιμής εκκίνησης (τουλάχιστον €50).<br>
          Μέγιστο {{ MAX_PLAYER_LISTINGS }} ενεργές αγγελίες.
        </p>

        <div class="form-group">
          <label class="form-label">Αντικείμενο</label>
          <select v-model="listForm.itemId" class="form-select">
            <option value="">— Επιλογή αντικειμένου —</option>
            <option
              v-for="entry in listableItems"
              :key="entry.itemId"
              :value="entry.itemId"
            >
              {{ entry.item?.icon }} {{ entry.item?.name ?? entry.itemId }}
              (×{{ entry.qty }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Τιμή εκκίνησης (€)</label>
          <input
            v-model.number="listForm.startBid"
            class="form-input"
            type="number"
            min="100"
            step="50"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Διάρκεια</label>
          <div class="duration-options">
            <button
              v-for="opt in durationOptions"
              :key="opt.h"
              class="duration-btn"
              :class="{ active: listForm.durationH === opt.h }"
              @click="listForm.durationH = opt.h"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="form-preview" v-if="listForm.itemId && listForm.startBid">
          <div class="preview-row">
            <span>Προμήθεια καταχώρησης</span>
            <span class="price-red">−€{{ fmt(listingFee) }}</span>
          </div>
        </div>

        <button
          class="btn btn-primary list-submit"
          :disabled="!canList"
          @click="submitListing"
        >
          Καταχώρηση →
        </button>

        <div v-if="listError" class="form-error">{{ listError }}</div>
      </div>
    </div>

    <!-- ── MY AUCTIONS tab ───────────────────────────────────────── -->
    <div v-if="activeTab === 'mine'" class="tab-content">
      <h2 class="section-title">Ενεργές Αγγελίες</h2>
      <div v-if="!auctionStore.myActiveListings.length" class="empty-state">
        Δεν έχεις ενεργές αγγελίες.
      </div>
      <div class="listings-grid">
        <div
          v-for="listing in auctionStore.myActiveListings"
          :key="listing.id"
          class="listing-card"
          :class="listing.itemRarity"
        >
          <div class="listing-header">
            <span class="listing-icon">{{ listing.itemIcon }}</span>
            <div class="listing-meta">
              <span class="listing-name">{{ listing.itemName }}</span>
            </div>
          </div>
          <div class="listing-details">
            <div class="detail-row">
              <span class="detail-label">Τρέχουσα</span>
              <span class="detail-value price">€{{ fmt(listing.currentBid) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Προσφορές</span>
              <span class="detail-value">{{ listing.bids.length }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Λήγει</span>
              <span class="detail-value countdown" :class="{ urgent: timeLeft(listing) < 300_000 }">
                {{ formatCountdown(listing) }}
              </span>
            </div>
          </div>
          <button
            v-if="listing.bids.length === 0"
            class="btn btn-danger cancel-btn"
            @click="cancelListing(listing)"
          >
            Ακύρωση
          </button>
        </div>
      </div>

      <h2 class="section-title mt">Ολοκληρωμένες Πωλήσεις</h2>
      <div v-if="!auctionStore.myEndedListings.length" class="empty-state">
        Δεν έχεις ολοκληρωμένες πωλήσεις.
      </div>
      <div class="listings-grid">
        <div
          v-for="listing in auctionStore.myEndedListings"
          :key="listing.id"
          class="listing-card ended"
          :class="listing.itemRarity"
        >
          <div class="listing-header">
            <span class="listing-icon">{{ listing.itemIcon }}</span>
            <div class="listing-meta">
              <span class="listing-name">{{ listing.itemName }}</span>
              <span class="ended-label">{{ listing.winnerId ? 'Πουλήθηκε' : 'Δεν πουλήθηκε' }}</span>
            </div>
          </div>
          <div class="listing-details" v-if="listing.winnerId">
            <div class="detail-row">
              <span class="detail-label">Τελική τιμή</span>
              <span class="detail-value price">€{{ fmt(listing.finalAmount) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Αγοραστής</span>
              <span class="detail-value">{{ listing.winnerName }}</span>
            </div>
          </div>
          <button
            v-if="listing.winnerId && !listing.sellerCollected && listing.sellerId === player.id"
            class="btn btn-success collect-btn"
            @click="collectSale(listing)"
          >
            Είσπραξη €{{ fmt(listing.finalAmount) }}
          </button>
          <div v-else-if="listing.sellerCollected" class="collected-note">✅ Εισπράχθηκε</div>
        </div>
      </div>
    </div>

    <!-- ── WON tab ───────────────────────────────────────────────── -->
    <div v-if="activeTab === 'won'" class="tab-content">
      <h2 class="section-title">Δημοπρασίες που Κέρδισες</h2>
      <div v-if="!auctionStore.wonListings.length" class="empty-state">
        Δεν έχεις κερδίσει καμία δημοπρασία ακόμη.
      </div>
      <div class="listings-grid">
        <div
          v-for="listing in auctionStore.wonListings"
          :key="listing.id"
          class="listing-card"
          :class="listing.itemRarity"
        >
          <div class="listing-header">
            <span class="listing-icon">{{ listing.itemIcon }}</span>
            <div class="listing-meta">
              <span class="listing-name">{{ listing.itemName }}</span>
              <span v-if="listing.craftMultiplier" class="craft-badge">×{{ listing.craftMultiplier.toFixed(2) }}</span>
            </div>
          </div>
          <div class="listing-details">
            <div class="detail-row">
              <span class="detail-label">Τελική τιμή</span>
              <span class="detail-value price">€{{ fmt(listing.finalAmount) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Πωλητής</span>
              <span class="detail-value">{{ listing.sellerName }}</span>
            </div>
          </div>
          <button
            v-if="!listing.winnerCollected"
            class="btn btn-success collect-btn"
            @click="collectWin(listing)"
          >
            Παραλαβή {{ listing.itemIcon }}
          </button>
          <div v-else class="collected-note">✅ Παρελήφθη</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useAuctionStore, minNextBid } from '../stores/auctionStore'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { getItemById } from '../data/items'

const MAX_PLAYER_LISTINGS = 5

const auctionStore   = useAuctionStore()
const player         = usePlayerStore()
const inventoryStore = useInventoryStore()

// Init if first visit
auctionStore.initAuction()

// ── Tabs ──────────────────────────────────────────────────────────────────
const activeTab = ref('browse')

const tabs = computed(() => [
  { id: 'browse', label: '🔍 Αγορά' },
  { id: 'list',   label: '📤 Καταχώρηση' },
  { id: 'mine',   label: `📦 Δικές μου${auctionStore.uncollectedSales ? ' (' + auctionStore.uncollectedSales + ')' : ''}` },
  { id: 'won',    label: `🏆 Κέρδισες${auctionStore.uncollectedWins ? ' (' + auctionStore.uncollectedWins + ')' : ''}` },
])

// ── Countdown timer refresh ───────────────────────────────────────────────
const now = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(timer))

function timeLeft(listing) {
  return Math.max(0, listing.expiresAt - now.value)
}

function formatCountdown(listing) {
  const ms = timeLeft(listing)
  if (ms <= 0) return 'Έληξε'
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}ω ${m}λ`
  if (m > 0) return `${m}λ ${s.toString().padStart(2,'0')}δ`
  return `${s}δ`
}

// ── Browse: bidding ───────────────────────────────────────────────────────
const bidDrafts = reactive({})

function canBid(listing) {
  const draft = bidDrafts[listing.id]
  if (!draft || draft < minNextBid(listing.currentBid)) return false
  if (player.cash < draft) return false
  if (listing.sellerId === player.id) return false
  return true
}

function submitBid(listing) {
  const amount = bidDrafts[listing.id]
  const res = auctionStore.placeBid(listing.id, amount)
  if (res.ok) {
    delete bidDrafts[listing.id]
  } else {
    alert(res.message)
  }
}

// ── List: form ────────────────────────────────────────────────────────────
const listForm = reactive({ itemId: '', startBid: 500, durationH: 12 })
const listError = ref('')

const durationOptions = [
  { h: 6,  label: '6ω' },
  { h: 12, label: '12ω' },
  { h: 24, label: '24ω' },
  { h: 48, label: '48ω' },
]

const listableItems = computed(() => {
  const result = []
  for (const [itemId, qty] of Object.entries(inventoryStore.items)) {
    if (qty > 0) {
      const item = getItemById(itemId)
      result.push({ itemId, qty, item })
    }
  }
  return result
})

const listingFee = computed(() =>
  listForm.startBid ? Math.max(50, Math.floor(listForm.startBid * 0.05)) : 0
)

const canList = computed(() =>
  listForm.itemId && listForm.startBid >= 100 && listForm.durationH > 0
)

function submitListing() {
  listError.value = ''
  const res = auctionStore.listItem({
    itemId:    listForm.itemId,
    startBid:  listForm.startBid,
    durationH: listForm.durationH,
  })
  if (res.ok) {
    listForm.itemId  = ''
    listForm.startBid = 500
    activeTab.value  = 'mine'
  } else {
    listError.value = res.message
  }
}

// ── My auctions ───────────────────────────────────────────────────────────
function cancelListing(listing) {
  const res = auctionStore.cancelListing(listing.id)
  if (!res.ok) alert(res.message)
}

function collectSale(listing) {
  auctionStore.collectSaleProceeds(listing.id)
}

// ── Won ───────────────────────────────────────────────────────────────────
function collectWin(listing) {
  auctionStore.collectWonItem(listing.id)
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(n ?? 0))
}

const RARITY_LABELS = {
  common: 'Κοινό', uncommon: 'Ασυνήθιστο', rare: 'Σπάνιο',
  epic: 'Επικό', legendary: 'Θρυλικό',
}
function rarityLabel(r) { return RARITY_LABELS[r] ?? r }
</script>

<style scoped>
.auction-view {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
}

/* Alerts */
.alerts-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.alert-pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.alert-pill.outbid { background: rgba(239,68,68,0.15); border: 1px solid #ef4444; color: #ef4444; }
.alert-pill.won    { background: rgba(76,175,80,0.15);  border: 1px solid #4caf50; color: #4caf50; }
.alert-pill.sold   { background: rgba(79,195,247,0.15); border: 1px solid var(--color-accent); color: var(--color-accent); }
.alert-close { font-size: 12px; opacity: 0.7; }

/* Tabs */
.tabs {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}
.tab-btn {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}
.tab-btn.active {
  background: var(--color-accent);
  color: #000;
  border-color: var(--color-accent);
  font-weight: var(--font-weight-bold);
}
.tab-badge {
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  font-size: 10px;
  padding: 1px 5px;
  font-weight: 700;
}

/* Listings */
.listings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}

.listing-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: border-color var(--transition-fast);
}
.listing-card.rare      { border-color: #4fc3f7; }
.listing-card.epic      { border-color: #ab47bc; }
.listing-card.legendary { border-color: #ffd700; }
.listing-card.ended     { opacity: 0.7; }

.listing-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.listing-icon { font-size: 28px; line-height: 1; }
.listing-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.listing-name {
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rarity-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 999px;
  width: fit-content;
}
.rarity-badge.common    { background: rgba(255,255,255,0.1); color: var(--text-secondary); }
.rarity-badge.uncommon  { background: rgba(76,175,80,0.2);  color: #66bb6a; }
.rarity-badge.rare      { background: rgba(79,195,247,0.2); color: #4fc3f7; }
.rarity-badge.epic      { background: rgba(171,71,188,0.2); color: #ce93d8; }
.rarity-badge.legendary { background: rgba(255,215,0,0.2);  color: #ffd700; }

.craft-badge {
  background: rgba(255,165,0,0.2);
  color: #ffa726;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  white-space: nowrap;
}

.listing-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}
.detail-label { color: var(--text-muted, var(--text-secondary)); }
.detail-value { color: var(--text-primary); }
.detail-value.price { color: var(--color-success); font-weight: var(--font-weight-bold); }
.detail-value.is-you { color: var(--color-accent); font-weight: var(--font-weight-bold); }
.detail-value.countdown { font-family: var(--font-family-mono); }
.detail-value.countdown.urgent { color: #ef4444; animation: urgentPulse 1s ease infinite; }

@keyframes urgentPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.bid-row {
  display: flex;
  gap: var(--space-xs);
}
.bid-input {
  flex: 1;
  padding: var(--space-sm);
  background: var(--bg-surface-raised, var(--bg-surface));
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  min-width: 0;
}
.bid-btn { white-space: nowrap; }

.own-listing-note, .collected-note {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  text-align: center;
  padding: var(--space-xs);
}
.collected-note { color: var(--color-success); }
.ended-label {
  font-size: 10px;
  color: var(--text-secondary);
}

.collect-btn, .cancel-btn {
  width: 100%;
}

/* List form */
.list-form.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 480px;
}
.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
}
.section-title.mt { margin-top: var(--space-lg); }
.list-note {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.form-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}
.form-select, .form-input {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface-raised, var(--bg-surface));
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}
.duration-options {
  display: flex;
  gap: var(--space-xs);
}
.duration-btn {
  flex: 1;
  padding: var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}
.duration-btn.active {
  background: rgba(79,195,247,0.15);
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: var(--font-weight-bold);
}
.form-preview {
  background: var(--bg-surface-raised, rgba(255,255,255,0.03));
  border-radius: var(--border-radius-md);
  padding: var(--space-sm) var(--space-md);
}
.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}
.price-red { color: #ef4444; font-weight: var(--font-weight-bold); }
.list-submit { align-self: flex-start; }
.form-error {
  color: #ef4444;
  font-size: var(--font-size-sm);
  padding: var(--space-sm);
  background: rgba(239,68,68,0.1);
  border-radius: var(--border-radius-md);
}

.empty-state {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  padding: var(--space-xl);
  text-align: center;
  background: var(--bg-surface);
  border-radius: var(--border-radius-lg);
  border: 1px dashed var(--border-color);
}

/* Buttons */
.btn {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border: none;
  transition: opacity var(--transition-fast);
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary { background: var(--color-accent); color: #000; }
.btn-success { background: var(--color-success); color: #000; }
.btn-danger  { background: var(--color-danger, #ef4444); color: #fff; }

.tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
