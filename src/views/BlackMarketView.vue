<template>
  <div class="bm-view">
    <h1 class="page-title">🕵️ Μαυραγορίτης</h1>

    <!-- Dirty money balance -->
    <div class="dirty-balance card">
      <span class="dirty-icon">💰</span>
      <div class="dirty-info">
        <span class="dirty-label">Βρώμικα Χρήματα</span>
        <span class="dirty-amount">€{{ fmt(eliteStore.dirtyMoney) }}</span>
      </div>
      <div class="dirty-hint">Κέρδισέ τα μέσω λαθρεμπορίου</div>
    </div>

    <!-- Dealer location status -->
    <div class="location-card card" :class="{ active: dealerStore.isPresent }">
      <div class="location-header">
        <span class="location-icon">{{ dealerStore.isPresent ? '🟢' : '🔴' }}</span>
        <div class="location-info">
          <span class="location-title">
            {{ dealerStore.isPresent ? 'Ο Μαυραγορίτης βρίσκεται στη' : 'Ο Μαυραγορίτης απουσιάζει' }}
          </span>
          <span v-if="dealerStore.isPresent" class="location-city">
            {{ cityName(dealerStore.city) }}
          </span>
        </div>
      </div>

      <div v-if="dealerStore.isPresent" class="location-footer">
        <div class="spawn-timer">
          <span class="spawn-label">Φεύγει σε:</span>
          <span class="spawn-countdown" :class="{ urgent: dealerStore.timeUntilNextSpawn < 1_800_000 }">
            {{ formatTime(dealerStore.timeUntilNextSpawn) }}
          </span>
        </div>
        <div v-if="!dealerStore.isHere" class="wrong-city-note">
          <span>✈️ Πρέπει να ταξιδέψεις στη {{ cityName(dealerStore.city) }}</span>
          <router-link to="/travel" class="travel-link btn btn-sm">Ταξίδι →</router-link>
        </div>
        <div v-else class="here-note">
          ✅ Βρίσκεσαι στη σωστή πόλη!
        </div>
      </div>

      <div v-if="!dealerStore.isPresent" class="spawn-timer">
        <span class="spawn-label">Επόμενη εμφάνιση σε:</span>
        <span class="spawn-countdown">{{ formatTime(dealerStore.timeUntilNextSpawn) }}</span>
      </div>
    </div>

    <!-- Catalog -->
    <div class="catalog-section">
      <h2 class="section-title">Διαθέσιμα Προϊόντα</h2>
      <p class="catalog-note">
        Ο Μαυραγορίτης δέχεται <strong>μόνο Βρώμικα Χρήματα</strong>. Εξαντλείται εντός 8 ωρών.
      </p>

      <div class="catalog-grid">
        <div
          v-for="entry in dealerStore.catalogWithStock"
          :key="entry.itemId"
          class="catalog-card"
          :class="[entry.item?.rarity, { soldout: entry.remaining === 0 }]"
        >
          <div class="catalog-icon">{{ entry.item?.icon ?? '📦' }}</div>
          <div class="catalog-info">
            <span class="catalog-name">{{ entry.item?.name ?? entry.itemId }}</span>
            <span class="catalog-desc">{{ entry.item?.description }}</span>
            <div class="catalog-stats" v-if="entry.item">
              <span v-if="entry.item.damage"  class="stat-chip">⚔️ {{ entry.item.damage }}</span>
              <span v-if="entry.item.defense" class="stat-chip">🛡️ {{ entry.item.defense }}</span>
              <span v-if="entry.item.healAmount" class="stat-chip">❤️ +{{ entry.item.healAmount }}</span>
              <span v-if="entry.item.energyBoost" class="stat-chip">⚡ +{{ entry.item.energyBoost }}</span>
            </div>
          </div>

          <div class="catalog-footer">
            <div class="stock-bar">
              <div class="stock-fill" :style="{ width: stockPercent(entry) + '%' }" />
            </div>
            <div class="stock-label">
              {{ entry.remaining }} / {{ entry.stockPerSpawn }} διαθέσιμα
            </div>
            <div class="catalog-price">
              <span class="price-icon">💰</span>
              <span class="price-amount">€{{ fmt(entry.dirtyPrice) }}</span>
              <span class="price-type">βρώμικα</span>
            </div>
            <button
              class="btn btn-buy"
              :disabled="!canBuy(entry)"
              @click="buy(entry.itemId)"
            >
              <template v-if="entry.remaining === 0">Εξαντλήθηκε</template>
              <template v-else-if="!dealerStore.isPresent">Απών</template>
              <template v-else-if="!dealerStore.isHere">Λάθος πόλη</template>
              <template v-else-if="eliteStore.dirtyMoney < entry.dirtyPrice">Ανεπαρκή κεφάλαια</template>
              <template v-else>Αγορά</template>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Info panel -->
    <div class="info-card card">
      <h3 class="info-title">Πώς λειτουργεί;</h3>
      <ul class="info-list">
        <li>🕵️ Ο Μαυραγορίτης εμφανίζεται κάθε <strong>8 ώρες</strong> σε τυχαία πόλη.</li>
        <li>💰 Αποδέχεται μόνο <strong>Βρώμικα Χρήματα</strong> — κέρδισέ τα από το Λαθρεμπόριο.</li>
        <li>📦 Το συνολικό απόθεμα ανά κύκλο είναι <strong>20 αντικείμενα</strong>.</li>
        <li>✈️ Πρέπει να βρίσκεσαι στην <strong>ίδια πόλη</strong> για να αγοράσεις.</li>
        <li>🏦 Τα Βρώμικα Χρήματα μπορούν να ξεπλυθούν μέσω της Εταιρείας.</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useDealerStore, cityName } from '../stores/dealerStore'
import { useEliteStore } from '../stores/eliteStore'

const dealerStore = useDealerStore()
const eliteStore  = useEliteStore()

dealerStore.initDealer()

// Countdown refresh
const now = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(timer))

function formatTime(ms) {
  if (ms <= 0) return '—'
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}ω ${m}λ`
  if (m > 0) return `${m}λ ${s.toString().padStart(2,'0')}δ`
  return `${s}δ`
}

function fmt(n) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(n ?? 0))
}

function stockPercent(entry) {
  if (!entry.stockPerSpawn) return 0
  return Math.round((entry.remaining / entry.stockPerSpawn) * 100)
}

function canBuy(entry) {
  if (!dealerStore.isPresent) return false
  if (!dealerStore.isHere) return false
  if (entry.remaining <= 0) return false
  if (eliteStore.dirtyMoney < entry.dirtyPrice) return false
  return true
}

function buy(itemId) {
  const res = dealerStore.buyItem(itemId)
  if (!res.ok) alert(res.message)
}
</script>

<style scoped>
.bm-view {
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

/* Cards */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--space-md);
}

/* Dirty balance */
.dirty-balance {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  background: rgba(255, 160, 0, 0.07);
  border-color: rgba(255, 160, 0, 0.3);
}
.dirty-icon { font-size: 32px; line-height: 1; }
.dirty-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dirty-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}
.dirty-amount {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: #ffa726;
  font-family: var(--font-family-mono);
}
.dirty-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
  max-width: 120px;
}

/* Location card */
.location-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border-color: rgba(239,68,68,0.4);
}
.location-card.active {
  border-color: rgba(76,175,80,0.5);
  background: rgba(76,175,80,0.04);
}
.location-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
.location-icon { font-size: 20px; }
.location-info { display: flex; flex-direction: column; gap: 2px; }
.location-title { font-weight: var(--font-weight-medium); color: var(--text-primary); }
.location-city {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: #4fc3f7;
}
.location-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-sm);
}
.spawn-timer {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-sm);
}
.spawn-label { color: var(--text-secondary); }
.spawn-countdown {
  font-family: var(--font-family-mono);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}
.spawn-countdown.urgent { color: #ef4444; animation: urgentPulse 1s ease infinite; }

@keyframes urgentPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.wrong-city-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  color: #ffa726;
  background: rgba(255,160,0,0.08);
  border-radius: var(--border-radius-md);
  padding: var(--space-sm) var(--space-md);
}
.here-note {
  font-size: var(--font-size-sm);
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}
.travel-link {
  text-decoration: none;
}

/* Catalog */
.catalog-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
}
.catalog-note {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
}
.catalog-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: border-color var(--transition-fast);
}
.catalog-card.rare      { border-color: rgba(79,195,247,0.4); }
.catalog-card.epic      { border-color: rgba(171,71,188,0.4); }
.catalog-card.legendary { border-color: rgba(255,215,0,0.4); }
.catalog-card.soldout   { opacity: 0.5; }

.catalog-icon { font-size: 40px; text-align: center; }
.catalog-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.catalog-name {
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  font-size: var(--font-size-md);
}
.catalog-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.4;
}
.catalog-stats {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}
.stat-chip {
  background: var(--bg-surface-raised, rgba(255,255,255,0.06));
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--text-primary);
}

.catalog-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-sm);
  margin-top: auto;
}
.stock-bar {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}
.stock-fill {
  height: 100%;
  background: #4caf50;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.stock-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
}
.catalog-price {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-md);
}
.price-icon { font-size: 16px; }
.price-amount {
  font-weight: var(--font-weight-bold);
  color: #ffa726;
  font-family: var(--font-family-mono);
}
.price-type {
  font-size: 11px;
  color: var(--text-secondary);
}

.btn-buy {
  width: 100%;
  padding: var(--space-sm);
  background: rgba(255,160,0,0.15);
  border: 1px solid rgba(255,160,0,0.5);
  border-radius: var(--border-radius-md);
  color: #ffa726;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}
.btn-buy:hover:not(:disabled) {
  background: rgba(255,160,0,0.25);
}
.btn-buy:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Info */
.info-card {
  background: rgba(79,195,247,0.04);
  border-color: rgba(79,195,247,0.2);
}
.info-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--space-sm);
}
.info-list {
  margin: 0;
  padding: 0 0 0 var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Buttons */
.btn { cursor: pointer; border: none; }
.btn-sm {
  padding: 4px 10px;
  border-radius: var(--border-radius-md);
  font-size: 12px;
  background: #ffa726;
  color: #000;
  font-weight: var(--font-weight-bold);
}
</style>
