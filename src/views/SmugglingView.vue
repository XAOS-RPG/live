<template>
  <div class="smuggling-page">
    <h2 class="page-title">🚬 Λαθρεμπόριο</h2>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button :class="['tab-btn', tab === 'smuggling' ? 'active' : '']" @click="tab = 'smuggling'">🚬 Λαθρεμπόριο</button>
      <button :class="['tab-btn', tab === 'dealer' ? 'active dealer-tab' : 'dealer-tab']" @click="tab = 'dealer'">🕵️ Μαυραγορίτης</button>
    </div>

    <!-- ===== TAB: ΛΑΘΡΕΜΠΟΡΙΟ ===== -->
    <template v-if="tab === 'smuggling'">
      <p class="page-sub text-muted">Αγόρασε φθηνά, πούλα ακριβά. Αλλά πρόσεχε τους μπάτσους.</p>

      <!-- Risk meter -->
      <div v-if="smuggling.hasCargo" class="card risk-card">
        <div class="risk-header">
          <span>🚨 Κίνδυνος Σύλληψης</span>
          <span class="text-mono" :class="riskClass">{{ (smuggling.checkpointRisk * 100).toFixed(0) }}%</span>
        </div>
        <div class="bar-track" style="background: var(--bg-surface-raised); margin-top: 6px;">
          <div class="bar-fill" :style="{ width: (smuggling.checkpointRisk * 100) + '%', background: riskColor }" />
        </div>
        <p class="text-muted" style="font-size: 10px; margin-top: 4px;">
          Κάθε ταξίδι με εμπόρευμα ελέγχεται. Περισσότερο/σπανιότερο φορτίο = μεγαλύτερος κίνδυνος.
        </p>
        <button class="btn btn-sm btn-danger mt-sm" @click="smuggling.dropAllCargo()">
          Πέταξε Όλο το Φορτίο
        </button>
      </div>

      <!-- Vehicles -->
      <div class="card">
        <h3 class="section-title">🚗 Μεταφορικά Μέσα</h3>
        <div class="vehicle-equipped">
          <span class="ve-icon">{{ smuggling.equippedVehicleData.icon }}</span>
          <div class="ve-info">
            <strong>{{ smuggling.equippedVehicleData.name }}</strong>
            <span class="text-muted" style="font-size:11px;">
              Αποφυγή: {{ (smuggling.equippedVehicleData.avoidance * 100).toFixed(0) }}%
              · Slots: {{ smuggling.effectiveMaxCargoSlots }}
            </span>
          </div>
        </div>
        <div class="vehicle-list">
          <div
            v-for="vehicle in VEHICLES"
            :key="vehicle.id"
            class="vehicle-row"
            :class="{ equipped: smuggling.equippedVehicle === vehicle.id, locked: !smuggling.ownedVehicles.includes(vehicle.id) }"
          >
            <span class="vr-icon">{{ vehicle.icon }}</span>
            <div class="vr-info">
              <strong>{{ vehicle.name }}</strong>
              <span class="text-muted" style="font-size:10px;">{{ vehicle.description }}</span>
              <div class="vr-stats">
                <span>Αποφυγή {{ (vehicle.avoidance * 100).toFixed(0) }}%</span>
                <span>+{{ vehicle.cargoBonus }} slots</span>
                <span v-if="vehicle.seaOnly" class="badge badge-info">Νησιά Μόνο</span>
              </div>
            </div>
            <div class="vr-actions">
              <span v-if="smuggling.equippedVehicle === vehicle.id" class="badge badge-success">Εξοπλισμένο</span>
              <button
                v-else-if="smuggling.ownedVehicles.includes(vehicle.id)"
                class="btn btn-xs btn-outline"
                @click="smuggling.equipVehicle(vehicle.id)"
              >Εξόπλισε</button>
              <button
                v-else-if="player.level >= vehicle.unlockLevel"
                class="btn btn-xs btn-primary"
                :disabled="player.cash < vehicle.price"
                @click="smuggling.buyVehicle(vehicle.id)"
              >
                €{{ vehicle.price.toLocaleString() }}
              </button>
              <span v-else class="text-muted" style="font-size:11px;">Lvl {{ vehicle.unlockLevel }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Cargo -->
      <div class="card">
        <h3 class="section-title">📦 Το Φορτίο σου ({{ smuggling.cargoWeight }}/{{ smuggling.effectiveMaxCargoSlots }} slots)</h3>
        <div v-if="!smuggling.hasCargo" class="text-muted text-center" style="padding: var(--space-md);">
          Δεν κουβαλάς τίποτα. Αγόρασε εμπόρευμα παρακάτω.
        </div>
        <div v-for="item in cargoWithPrices" :key="item.goodId" class="cargo-row">
          <span class="cargo-icon">{{ item.icon }}</span>
          <div class="cargo-info">
            <strong>{{ item.name }}</strong>
            <span class="text-muted" style="font-size: 10px;">
              x{{ item.quantity }} · Αγορά: €{{ item.boughtAt }}/τεμ
            </span>
          </div>
          <div class="cargo-actions">
            <span class="cargo-sell-price" :class="item.profit >= 0 ? 'text-success' : 'text-danger'">
              €{{ item.currentPrice }}/τεμ
            </span>
            <button class="btn btn-xs btn-primary" @click="sell(item.goodId, 1)">Πούλα 1</button>
            <button v-if="item.quantity > 1" class="btn btn-xs btn-primary" @click="sell(item.goodId, item.quantity)">Όλα</button>
          </div>
        </div>
      </div>

      <!-- Market -->
      <div class="card">
        <h3 class="section-title">🏪 Αγορά Λαθραίων — {{ currentCityName }}</h3>
        <p class="text-muted" style="font-size: 10px;">Οι τιμές αλλάζουν κάθε ~4 ώρες. Ταξίδεψε σε άλλη πόλη για να πουλήσεις ακριβότερα.</p>
        <div v-for="good in marketGoods" :key="good.id" class="market-row">
          <span class="market-icon">{{ good.icon }}</span>
          <div class="market-info">
            <strong>{{ good.name }}</strong>
            <span class="text-muted" style="font-size: 10px;">
              {{ good.rarity }} · {{ good.weight }} slot{{ good.weight > 1 ? 's' : '' }}
            </span>
          </div>
          <div class="market-actions">
            <span class="market-price text-mono">€{{ good.currentPrice }}</span>
            <button
              class="btn btn-xs btn-success"
              :disabled="player.cash < good.currentPrice || smuggling.cargoSlotsFree < good.weight"
              @click="buy(good.id, 1)"
            >
              Αγορά
            </button>
          </div>
        </div>
      </div>

      <!-- Price table -->
      <div class="card">
        <h3 class="section-title">📊 Τιμές ανά Πόλη</h3>
        <div class="price-table-wrap">
          <table class="price-table">
            <thead>
              <tr>
                <th>Εμπόρευμα</th>
                <th v-for="city in allCities" :key="city.id">{{ city.icon }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="good in marketGoods" :key="good.id">
                <td class="price-good-name">{{ good.icon }} {{ good.name }}</td>
                <td
                  v-for="city in allCities"
                  :key="city.id"
                  class="text-mono"
                  :class="priceClass(good, city.id)"
                >
                  €{{ getCityPrice(good, city.id) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Stats -->
      <div class="card">
        <h3 class="section-title">📈 Στατιστικά</h3>
        <div class="stat-row">
          <span class="text-muted">Ταξίδια με φορτίο:</span>
          <span class="text-mono">{{ smuggling.totalSmugglingRuns }}</span>
        </div>
        <div class="stat-row">
          <span class="text-muted">Επιτυχημένες πωλήσεις:</span>
          <span class="text-mono">{{ smuggling.successfulRuns }}</span>
        </div>
        <div class="stat-row">
          <span class="text-muted">Συνολικό κέρδος:</span>
          <span class="text-mono" :class="smuggling.totalProfit >= 0 ? 'text-success' : 'text-danger'">
            €{{ smuggling.totalProfit }}
          </span>
        </div>
      </div>
    </template>

    <!-- ===== TAB: ΜΑΥΡΑΓΟΡΙΤΗΣ ===== -->
    <template v-else>
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
            <span v-if="dealerStore.isPresent" class="location-city">{{ cityName(dealerStore.city) }}</span>
          </div>
        </div>
        <div v-if="dealerStore.isPresent" class="location-footer">
          <div class="spawn-timer">
            <span class="spawn-label">Φεύγει σε:</span>
            <span class="spawn-countdown" :class="{ urgent: dealerStore.timeUntilNextSpawn < 1_800_000 }">
              {{ formatDealerTime(dealerStore.timeUntilNextSpawn) }}
            </span>
          </div>
          <div v-if="!dealerStore.isHere" class="wrong-city-note">
            <span>✈️ Πρέπει να ταξιδέψεις στη {{ cityName(dealerStore.city) }}</span>
            <router-link to="/travel" class="btn btn-sm travel-link">Ταξίδι →</router-link>
          </div>
          <div v-else class="here-note">✅ Βρίσκεσαι στη σωστή πόλη!</div>
        </div>
        <div v-if="!dealerStore.isPresent" class="spawn-timer">
          <span class="spawn-label">Επόμενη εμφάνιση σε:</span>
          <span class="spawn-countdown">{{ formatDealerTime(dealerStore.timeUntilNextSpawn) }}</span>
        </div>
      </div>

      <!-- Catalog -->
      <div class="catalog-section">
        <h2 class="section-title-lg">Διαθέσιμα Προϊόντα</h2>
        <p class="text-muted" style="font-size: var(--font-size-sm); margin: 0;">
          Δέχεται <strong>μόνο Βρώμικα Χρήματα</strong>. Εξαντλείται εντός 8 ωρών.
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
                <span v-if="entry.item.damage"    class="stat-chip">⚔️ {{ entry.item.damage }}</span>
                <span v-if="entry.item.defense"   class="stat-chip">🛡️ {{ entry.item.defense }}</span>
                <span v-if="entry.item.healAmount" class="stat-chip">❤️ +{{ entry.item.healAmount }}</span>
                <span v-if="entry.item.energyBoost" class="stat-chip">⚡ +{{ entry.item.energyBoost }}</span>
              </div>
            </div>
            <div class="catalog-footer">
              <div class="stock-bar">
                <div class="stock-fill" :style="{ width: stockPercent(entry) + '%' }" />
              </div>
              <div class="stock-label">{{ entry.remaining }} / {{ entry.stockPerSpawn }} διαθέσιμα</div>
              <div class="catalog-price">
                <span class="price-icon">💰</span>
                <span class="price-amount">€{{ fmt(entry.dirtyPrice) }}</span>
                <span class="price-type">βρώμικα</span>
              </div>
              <button class="btn-buy" :disabled="!canBuy(entry)" @click="buyDealer(entry.itemId)">
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

      <!-- Info -->
      <div class="info-card card">
        <h3 class="info-title">Πώς λειτουργεί;</h3>
        <ul class="info-list">
          <li>🕵️ Εμφανίζεται κάθε <strong>8 ώρες</strong> σε τυχαία πόλη.</li>
          <li>💰 Αποδέχεται μόνο <strong>Βρώμικα Χρήματα</strong> — κέρδισέ τα από Λαθρεμπόριο.</li>
          <li>📦 Συνολικό απόθεμα ανά κύκλο: <strong>20 αντικείμενα</strong>.</li>
          <li>✈️ Πρέπει να βρίσκεσαι στην <strong>ίδια πόλη</strong> για να αγοράσεις.</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useSmugglingStore } from '../stores/smugglingStore'
import { useTravelStore } from '../stores/travelStore'
import { useDealerStore, cityName } from '../stores/dealerStore'
import { useEliteStore } from '../stores/eliteStore'
import { contrabandGoods, getContrabandPrice } from '../data/contraband'
import { locations } from '../data/locations'
import { VEHICLES } from '../data/vehicles'

const player = usePlayerStore()
const smuggling = useSmugglingStore()
const travelStore = useTravelStore()
const dealerStore = useDealerStore()
const eliteStore = useEliteStore()

const tab = ref('smuggling')

dealerStore.initDealer()

// Countdown tick for dealer
const now = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(timer))

// ── Smuggling ──────────────────────────────────────────────────────────────
const allCities = locations
const currentCityName = computed(() => {
  const loc = locations.find(l => l.id === travelStore.currentLocation)
  return loc?.name || travelStore.currentLocation
})

const marketGoods = computed(() =>
  contrabandGoods.map(g => ({
    ...g,
    currentPrice: getContrabandPrice(g, travelStore.currentLocation),
  }))
)

const cargoWithPrices = computed(() =>
  smuggling.cargo.map(c => {
    const good = contrabandGoods.find(g => g.id === c.goodId)
    const currentPrice = good ? getContrabandPrice(good, travelStore.currentLocation) : 0
    return { ...c, name: good?.name || c.goodId, icon: good?.icon || '📦', currentPrice, profit: currentPrice - c.boughtAt }
  })
)

const riskClass = computed(() => {
  const r = smuggling.checkpointRisk
  if (r < 0.15) return 'text-success'
  if (r < 0.35) return 'text-warning'
  return 'text-danger'
})

const riskColor = computed(() => {
  const r = smuggling.checkpointRisk
  if (r < 0.15) return 'var(--color-success)'
  if (r < 0.35) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

function buy(goodId, qty) { smuggling.buyContraband(goodId, qty) }
function sell(goodId, qty) { smuggling.sellContraband(goodId, qty) }
function getCityPrice(good, cityId) { return getContrabandPrice(good, cityId) }

function priceClass(good, cityId) {
  const price = getContrabandPrice(good, cityId)
  const currentPrice = getContrabandPrice(good, travelStore.currentLocation)
  if (price > currentPrice * 1.15) return 'price-high'
  if (price < currentPrice * 0.85) return 'price-low'
  return ''
}

// ── Dealer ─────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(n ?? 0))
}

function formatDealerTime(ms) {
  if (ms <= 0) return '—'
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}ω ${m}λ`
  if (m > 0) return `${m}λ ${s.toString().padStart(2, '0')}δ`
  return `${s}δ`
}

function stockPercent(entry) {
  if (!entry.stockPerSpawn) return 0
  return Math.round((entry.remaining / entry.stockPerSpawn) * 100)
}

function canBuy(entry) {
  if (!dealerStore.isPresent || !dealerStore.isHere) return false
  if (entry.remaining <= 0) return false
  if (eliteStore.dirtyMoney < entry.dirtyPrice) return false
  return true
}

function buyDealer(itemId) {
  const res = dealerStore.buyItem(itemId)
  if (!res.ok) alert(res.message)
}
</script>

<style scoped>
.smuggling-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); margin-bottom: 2px; }
.page-sub { font-size: var(--font-size-xs); margin: 0 0 var(--space-sm); }

/* Tabs */
.tab-bar { display: flex; gap: var(--space-xs); }
.tab-btn {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}
.tab-btn.active { background: var(--color-accent); border-color: var(--color-accent); color: var(--bg-base); }
.tab-btn.dealer-tab.active { background: #c62828; border-color: #c62828; color: #fff; }
.tab-btn.dealer-tab:not(.active):hover { border-color: #c62828; color: #c62828; }

.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}
.section-title-lg { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--text-primary); margin: 0; }

/* Risk */
.risk-card { border-left: 3px solid var(--color-danger); }
.risk-header { display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); }

/* Cargo / Market */
.cargo-row, .market-row { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) 0; border-bottom: 1px solid var(--border-color); }
.cargo-row:last-child, .market-row:last-child { border-bottom: none; }
.cargo-icon, .market-icon { font-size: 1.5rem; flex-shrink: 0; }
.cargo-info, .market-info { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: var(--font-size-sm); }
.cargo-actions, .market-actions { display: flex; align-items: center; gap: var(--space-xs); flex-shrink: 0; }
.cargo-sell-price, .market-price { font-size: var(--font-size-sm); min-width: 50px; text-align: right; }

/* Price table */
.price-table-wrap { overflow-x: auto; }
.price-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.price-table th, .price-table td { padding: 4px 6px; text-align: center; border-bottom: 1px solid var(--border-color); }
.price-table th { font-weight: var(--font-weight-bold); color: var(--text-secondary); font-size: 10px; }
.price-good-name { text-align: left !important; white-space: nowrap; }
.price-high { color: var(--color-success); font-weight: var(--font-weight-bold); }
.price-low { color: var(--color-danger); }

/* Stats */
.stat-row { display: flex; justify-content: space-between; padding: var(--space-xs) 0; font-size: var(--font-size-sm); border-bottom: 1px solid var(--border-color); }
.stat-row:last-child { border-bottom: none; }

/* Vehicles */
.vehicle-equipped { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: var(--bg-surface-raised); border-radius: 8px; margin-bottom: 1rem; }
.ve-icon { font-size: 1.75rem; }
.ve-info { display: flex; flex-direction: column; gap: 2px; }
.vehicle-list { display: flex; flex-direction: column; gap: 0.5rem; }
.vehicle-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 8px; opacity: 0.7; }
.vehicle-row.equipped { border-color: #4CAF50; opacity: 1; }
.vehicle-row.locked { opacity: 0.4; }
.vr-icon { font-size: 1.5rem; }
.vr-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.vr-stats { display: flex; gap: 0.75rem; font-size: 0.75rem; color: var(--text-muted); }
.vr-actions { display: flex; align-items: center; }
.btn-xs { padding: 2px 8px; font-size: 11px; border-radius: var(--border-radius-sm); }

/* Dealer */
.dirty-balance { display: flex; align-items: center; gap: var(--space-md); background: rgba(255,160,0,0.07); border-color: rgba(255,160,0,0.3); }
.dirty-icon { font-size: 32px; }
.dirty-info { display: flex; flex-direction: column; gap: 2px; }
.dirty-label { font-size: var(--font-size-sm); color: var(--text-secondary); }
.dirty-amount { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: #ffa726; font-family: var(--font-family-mono); }
.dirty-hint { margin-left: auto; font-size: 11px; color: var(--text-secondary); text-align: right; max-width: 120px; }

.location-card { display: flex; flex-direction: column; gap: var(--space-sm); border-color: rgba(239,68,68,0.4); }
.location-card.active { border-color: rgba(76,175,80,0.5); background: rgba(76,175,80,0.04); }
.location-header { display: flex; align-items: center; gap: var(--space-md); }
.location-icon { font-size: 20px; }
.location-info { display: flex; flex-direction: column; gap: 2px; }
.location-title { font-weight: var(--font-weight-medium); }
.location-city { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: #4fc3f7; }
.location-footer { display: flex; flex-direction: column; gap: var(--space-sm); border-top: 1px solid var(--border-color); padding-top: var(--space-sm); }
.spawn-timer { display: flex; align-items: center; gap: var(--space-sm); font-size: var(--font-size-sm); }
.spawn-label { color: var(--text-secondary); }
.spawn-countdown { font-family: var(--font-family-mono); font-weight: var(--font-weight-bold); }
.spawn-countdown.urgent { color: #ef4444; animation: urgentPulse 1s ease infinite; }
@keyframes urgentPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.wrong-city-note { display: flex; align-items: center; justify-content: space-between; font-size: var(--font-size-sm); color: #ffa726; background: rgba(255,160,0,0.08); border-radius: var(--border-radius-md); padding: var(--space-sm) var(--space-md); }
.here-note { font-size: var(--font-size-sm); color: var(--color-success); font-weight: var(--font-weight-medium); }
.travel-link { text-decoration: none; background: #ffa726; color: #000; font-weight: var(--font-weight-bold); }

.catalog-section { display: flex; flex-direction: column; gap: var(--space-sm); }
.catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-md); }
.catalog-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); }
.catalog-card.rare      { border-color: rgba(79,195,247,0.4); }
.catalog-card.epic      { border-color: rgba(171,71,188,0.4); }
.catalog-card.legendary { border-color: rgba(255,215,0,0.4); }
.catalog-card.soldout   { opacity: 0.5; }
.catalog-icon { font-size: 40px; text-align: center; }
.catalog-info { display: flex; flex-direction: column; gap: var(--space-xs); }
.catalog-name { font-weight: var(--font-weight-bold); font-size: var(--font-size-md); }
.catalog-desc { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.4; }
.catalog-stats { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
.stat-chip { background: var(--bg-surface-raised); border-radius: 999px; padding: 2px 8px; font-size: 11px; }
.catalog-footer { display: flex; flex-direction: column; gap: var(--space-xs); border-top: 1px solid var(--border-color); padding-top: var(--space-sm); margin-top: auto; }
.stock-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.stock-fill { height: 100%; background: #4caf50; border-radius: 2px; transition: width 0.3s ease; }
.stock-label { font-size: 11px; color: var(--text-secondary); text-align: right; }
.catalog-price { display: flex; align-items: center; gap: 4px; font-size: var(--font-size-md); }
.price-icon { font-size: 16px; }
.price-amount { font-weight: var(--font-weight-bold); color: #ffa726; font-family: var(--font-family-mono); }
.price-type { font-size: 11px; color: var(--text-secondary); }
.btn-buy { width: 100%; padding: var(--space-sm); background: rgba(255,160,0,0.15); border: 1px solid rgba(255,160,0,0.5); border-radius: var(--border-radius-md); color: #ffa726; font-weight: var(--font-weight-bold); cursor: pointer; font-size: var(--font-size-sm); transition: all var(--transition-fast); }
.btn-buy:hover:not(:disabled) { background: rgba(255,160,0,0.25); }
.btn-buy:disabled { opacity: 0.4; cursor: not-allowed; }

.info-card { background: rgba(79,195,247,0.04); border-color: rgba(79,195,247,0.2); }
.info-title { font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-sm); }
.info-list { margin: 0; padding: 0 0 0 var(--space-md); display: flex; flex-direction: column; gap: var(--space-xs); font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5; }

.text-success { color: var(--color-success); }
.text-danger { color: var(--color-danger); }
.text-warning { color: var(--color-warning); }
</style>
