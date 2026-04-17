<template>
  <div class="smuggling-page">
    <h2 class="page-title">🚬 Λαθρεμπόριο</h2>
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
            <span class="text-muted" style="font-size:10px;">
              {{ vehicle.description }}
            </span>
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
      <h3 class="section-title">📈 Στατιστικά Λαθρεμπορίου</h3>
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useSmugglingStore } from '../stores/smugglingStore'
import { useTravelStore } from '../stores/travelStore'
import { contrabandGoods, getContrabandPrice } from '../data/contraband'
import { locations } from '../data/locations'
import { VEHICLES } from '../data/vehicles'

const player = usePlayerStore()
const smuggling = useSmugglingStore()
const travelStore = useTravelStore()

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
    return {
      ...c,
      name: good?.name || c.goodId,
      icon: good?.icon || '📦',
      currentPrice,
      profit: currentPrice - c.boughtAt,
    }
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

function buy(goodId, qty) {
  smuggling.buyContraband(goodId, qty)
}

function sell(goodId, qty) {
  smuggling.sellContraband(goodId, qty)
}

function getCityPrice(good, cityId) {
  return getContrabandPrice(good, cityId)
}

function priceClass(good, cityId) {
  const price = getContrabandPrice(good, cityId)
  const currentPrice = getContrabandPrice(good, travelStore.currentLocation)
  if (price > currentPrice * 1.15) return 'price-high'
  if (price < currentPrice * 0.85) return 'price-low'
  return ''
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

.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.risk-card { border-left: 3px solid var(--color-danger); }

.risk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.cargo-row, .market-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-color);
}
.cargo-row:last-child, .market-row:last-child { border-bottom: none; }

.cargo-icon, .market-icon { font-size: 1.5rem; flex-shrink: 0; }

.cargo-info, .market-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
}

.cargo-actions, .market-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.cargo-sell-price, .market-price {
  font-size: var(--font-size-sm);
  min-width: 50px;
  text-align: right;
}

.text-success { color: var(--color-success); }
.text-danger { color: var(--color-danger); }
.text-warning { color: var(--color-warning); }

.btn-xs {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: var(--border-radius-sm);
}

.price-table-wrap {
  overflow-x: auto;
}

.price-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.price-table th, .price-table td {
  padding: 4px 6px;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
}

.price-table th {
  font-weight: var(--font-weight-bold);
  color: var(--text-secondary);
  font-size: 10px;
}

.price-good-name {
  text-align: left !important;
  white-space: nowrap;
}

.price-high { color: var(--color-success); font-weight: var(--font-weight-bold); }
.price-low { color: var(--color-danger); }

/* Vehicles */
.vehicle-equipped {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--bg-surface-raised);
  border-radius: 8px;
  margin-bottom: 1rem;
}
.ve-icon { font-size: 1.75rem; }
.ve-info { display: flex; flex-direction: column; gap: 2px; }

.vehicle-list { display: flex; flex-direction: column; gap: 0.5rem; }

.vehicle-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  opacity: 0.7;
}
.vehicle-row.equipped { border-color: #4CAF50; opacity: 1; }
.vehicle-row.locked { opacity: 0.4; }

.vr-icon { font-size: 1.5rem; }
.vr-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.vr-stats { display: flex; gap: 0.75rem; font-size: 0.75rem; color: var(--text-muted); }
.vr-actions { display: flex; align-items: center; }

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-color);
}
.stat-row:last-child { border-bottom: none; }
</style>
