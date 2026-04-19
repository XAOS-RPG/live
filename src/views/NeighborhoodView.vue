<template>
  <div class="neighborhoods-page">
    <h2 class="page-title">🏘️ Κυριαρχία στις Γειτονιές</h2>
    <p class="text-muted page-subtitle">
      Κατάλαβε γειτονιές της Αθήνας για μοναδικά bonuses. Μέγιστο {{ MAX_OWNED }} γειτονιές ανά παίκτη.
    </p>

    <!-- Status Bar -->
    <div class="status-bar card">
      <div class="status-item">
        <span class="status-label">Γειτονιές</span>
        <span class="status-value" :class="{ 'text-danger': ownedCount >= MAX_OWNED }">
          {{ ownedCount }} / {{ MAX_OWNED }}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">Ημερήσιο Χαράτσι</span>
        <span class="status-value">{{ ownedCount > 0 ? formatCash(nhStore.dailyMaintenanceCost) : '—' }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Παθητικό Εισόδημα</span>
        <span class="status-value text-success">
          {{ nhStore.myBonuses.incomePerHour > 0 ? `+${nhStore.myBonuses.incomePerHour}€/ώρα` : '—' }}
        </span>
      </div>
    </div>

    <!-- Retaliation Alert -->
    <div v-if="nhStore.retaliationActive" class="alert alert-warning">
      🔥 <strong>Αντίποινα ενεργά!</strong>
      +25% επίθεση κατά <strong>{{ nhStore.retaliationBonus.targetUsername }}</strong>
      — {{ formatMs(nhStore.retaliationBonus.endsAt - Date.now()) }} remaining
    </div>

    <!-- Disreputable Warning -->
    <div v-if="nhStore.isDisreputable" class="alert alert-danger">
      ☠️ <strong>Διαβόητος!</strong> -5% επιτυχία εγκλήματος για
      {{ formatMs(nhStore.disreputableUntil - Date.now()) }}
    </div>

    <!-- Neighborhoods Grid -->
    <div class="neighborhoods-grid">
      <div
        v-for="def in allNeighborhoods"
        :key="def.id"
        class="card neighborhood-card"
        :class="cardClass(def.id)"
      >
        <!-- Header -->
        <div class="nc-header">
          <span class="nc-icon">{{ def.icon }}</span>
          <div class="nc-info">
            <strong class="nc-name">{{ def.name }}</strong>
            <span class="nc-bonus-tag" :class="`bonus-${def.bonus.type}`">
              {{ def.bonus.label }}
            </span>
          </div>
        </div>

        <!-- Wall HP Bar -->
        <div class="nc-wall">
          <div class="wall-label">
            <span>🧱 Τοίχος</span>
            <span class="wall-hp-text">{{ getData(def.id).wallHp }} / {{ nhStore.effectiveWallMaxHp(def.id) }}</span>
          </div>
          <div class="wall-bar">
            <div
              class="wall-fill"
              :style="{ width: wallPercent(def.id) + '%' }"
              :class="wallColor(def.id)"
            />
          </div>
        </div>

        <!-- Owner Info -->
        <div class="nc-owner">
          <template v-if="getData(def.id).ownerId">
            <span class="owner-badge" :class="{ 'own-badge': isOwn(def.id) }">
              {{ isOwn(def.id) ? '👑 Δική σου' : `👤 ${getData(def.id).ownerUsername}` }}
            </span>
            <span class="owner-level text-muted">Lv{{ getData(def.id).ownerLevel }}</span>
          </template>
          <span v-else class="text-muted">Αδέσμευτη</span>
        </div>

        <!-- Graffiti -->
        <div v-if="getData(def.id).graffiti" class="nc-graffiti">
          🎨 <em>{{ getData(def.id).graffiti }}</em>
        </div>

        <!-- Last Attack Info -->
        <div v-if="getData(def.id).lastAttackedAt > 0" class="nc-last-attack text-muted">
          Τελευταία επίθεση: {{ getData(def.id).lastAttackerUsername }}
          — {{ timeAgo(getData(def.id).lastAttackedAt) }}
        </div>

        <!-- Actions: Owner -->
        <div v-if="isOwn(def.id)" class="nc-actions">
          <!-- Repair Wall -->
          <div class="repair-row">
            <input
              v-model.number="repairInputs[def.id]"
              type="number"
              class="input-sm"
              placeholder="€ επισκευής"
              min="5"
              :max="playerStore.cash"
            />
            <button
              class="btn btn-sm btn-outline"
              :disabled="!repairInputs[def.id] || repairInputs[def.id] < 5"
              @click="doRepair(def.id)"
            >🧱 Επισκευή</button>
          </div>

          <!-- ΚΕΠ -->
          <button
            class="btn btn-sm btn-outline kep-btn"
            :disabled="nhStore.kepCooldownRemaining(def.id) > 0"
            @click="doKep(def.id)"
            :title="`${KEP_NERVE_COST} Θράσος + ${KEP_CASH_COST}€ → +50 Τοίχος`"
          >
            📋 ΚΕΠ Αδειοδότηση
            <span v-if="nhStore.kepCooldownRemaining(def.id) > 0" class="cooldown-badge">
              {{ formatMs(nhStore.kepCooldownRemaining(def.id)) }}
            </span>
          </button>

          <!-- Graffiti -->
          <div class="graffiti-row">
            <input
              v-model="graffitiInputs[def.id]"
              type="text"
              class="input-sm"
              placeholder="Γκράφιτι (50 χαρ.)"
              maxlength="50"
            />
            <button
              class="btn btn-sm btn-outline"
              @click="doGraffiti(def.id)"
            >🎨</button>
          </div>
        </div>

        <!-- Actions: Attack / Claim -->
        <div v-else class="nc-actions">
          <!-- Claim empty -->
          <template v-if="!getData(def.id).ownerId">
            <button
              class="btn btn-sm btn-success"
              :disabled="!nhStore.canClaim(def.id).can"
              @click="doClaim(def.id)"
            >
              🏴 Κατάλαβε
            </button>
            <span v-if="!nhStore.canClaim(def.id).can" class="text-muted hint-text">
              {{ claimHint(def.id) }}
            </span>
          </template>

          <!-- Attack owned -->
          <template v-else>
            <button
              class="btn btn-sm btn-danger"
              :disabled="!nhStore.canAttack(def.id).can"
              @click="doAttack(def.id)"
            >
              ⚔️ Επίθεση
              <span v-if="nhStore.retaliationActive && nhStore.retaliationBonus?.targetId === getData(def.id).ownerId"
                class="retaliation-star">🔥</span>
            </button>
            <span v-if="nhStore.attackCooldownRemaining(def.id) > 0" class="cooldown-badge">
              {{ formatMs(nhStore.attackCooldownRemaining(def.id)) }}
            </span>
            <span v-else-if="!nhStore.canAttack(def.id).can" class="text-muted hint-text">
              {{ attackHint(def.id) }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <!-- My Bonuses Summary -->
    <div v-if="ownedCount > 0" class="card bonuses-summary">
      <h3 class="section-title">📊 Ενεργά Bonuses</h3>
      <div class="bonuses-grid">
        <template v-for="(val, key) in activeBonuses" :key="key">
          <div v-if="val > 0" class="bonus-row">
            <span class="bonus-key">{{ bonusLabel(key) }}</span>
            <span class="bonus-val text-success">{{ formatBonusVal(key, val) }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNeighborhoodStore } from '../stores/neighborhoodStore'
import { usePlayerStore } from '../stores/playerStore'
import { neighborhoods } from '../data/neighborhoods'

const nhStore     = useNeighborhoodStore()
const playerStore = usePlayerStore()

const MAX_OWNED    = 3
const KEP_NERVE_COST = 3
const KEP_CASH_COST  = 200

const allNeighborhoods = neighborhoods
const repairInputs  = ref({})
const graffitiInputs = ref({})

// ── Computed ──────────────────────────────────────────────────────────────────

const ownedCount = computed(() => nhStore.myNeighborhoods.length)

const activeBonuses = computed(() => {
  const b = nhStore.myBonuses
  return Object.fromEntries(Object.entries(b).filter(([, v]) => v > 0))
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function getData(nid) {
  return nhStore.neighborhoods[nid] ?? {
    ownerId: null, ownerUsername: '', ownerLevel: 1,
    wallHp: 1000, capturedAt: 0, lastAttackedAt: 0,
    lastAttackerUsername: '', graffiti: '',
  }
}

function isOwn(nid) {
  // compare via myNeighborhoods ids
  return nhStore.myNeighborhoods.some(n => n.id === nid)
}

function wallPercent(nid) {
  const n   = getData(nid)
  const max = nhStore.effectiveWallMaxHp(nid)
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, (n.wallHp / max) * 100))
}

function wallColor(nid) {
  const pct = wallPercent(nid)
  if (pct > 60) return 'wall-green'
  if (pct > 30) return 'wall-yellow'
  return 'wall-red'
}

function cardClass(nid) {
  const n = getData(nid)
  if (isOwn(nid)) return 'owned'
  if (n.ownerId) return 'enemy'
  return 'neutral'
}

function attackHint(nid) {
  const reason = nhStore.canAttack(nid).reason
  if (reason === 'no_nerve') return `Χρειάζεσαι ${8} Θράσος`
  if (reason === 'cooldown') return 'Σε cooldown'
  return ''
}

function claimHint(nid) {
  const reason = nhStore.canClaim(nid).reason
  if (reason === 'cap') return `Μέγιστο ${MAX_OWNED} γειτονιές`
  return ''
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d} μέρες πριν`
  if (h > 0) return `${h}ώρ πριν`
  if (m > 0) return `${m}λ πριν`
  return 'μόλις τώρα'
}

function formatMs(ms) {
  if (ms <= 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}ω ${m}λ`
  if (m > 0) return `${m}λ ${s}δ`
  return `${s}δ`
}

function formatCash(n) {
  return n.toLocaleString('el-GR') + '€'
}

const BONUS_LABELS = {
  jailTimeReduction:        '⛓️ Μείωση χρόνου Φυλακής',
  bustBonus:                '🔓 Ταχύτητα Bust',
  smugglingRiskReduction:   '🚢 Μείωση ρίσκου Λαθρεμπορίου',
  craftingCostReduction:    '🔧 Μείωση κόστους Crafting',
  craftingTimeReduction:    '⚡ Μείωση χρόνου Crafting',
  incomePerHour:            '💵 Παθητικό εισόδημα',
  dropRateBonus:            '🎲 Bonus drop rate',
  weaponDiscountPercent:    '🔫 Έκπτωση όπλων',
  crimeSuccessBonus:        '🕵️ Bonus επιτυχίας εγκλήματος',
  policeDetectionReduction: '🚔 Μείωση ανίχνευσης αστυνομίας',
  sellPriceBonus:           '🧿 Bonus τιμής πώλησης',
  highTierCrimeBonus:       '💊 Bonus Tier 4+ εγκλήματος',
  crimeXpBonus:             '🐝 Bonus XP εγκλήματος',
  gymGainBonus:             '🏋️ Bonus κερδών γυμναστηρίου',
  hospitalTimeReduction:    '🏥 Μείωση χρόνου νοσοκομείου',
}

function bonusLabel(key) {
  return BONUS_LABELS[key] ?? key
}

function formatBonusVal(key, val) {
  if (key === 'incomePerHour') return `+${val}€/ώρα`
  return `+${Math.round(val * 100)}%`
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function doClaim(nid) {
  await nhStore.claimEmpty(nid)
}

async function doAttack(nid) {
  await nhStore.attackNeighborhood(nid)
}

async function doRepair(nid) {
  const amount = repairInputs.value[nid]
  if (!amount || amount < 5) return
  const ok = await nhStore.repairWall(nid, amount)
  if (ok) repairInputs.value[nid] = null
}

async function doKep(nid) {
  await nhStore.kepAdeiodotisi(nid)
}

async function doGraffiti(nid) {
  const text = graffitiInputs.value[nid]
  if (!text) return
  await nhStore.setGraffiti(nid, text)
  graffitiInputs.value[nid] = ''
}
</script>

<style scoped>
.neighborhoods-page { padding-bottom: 2rem; }
.page-subtitle { margin-top: -0.5rem; margin-bottom: 1.5rem; font-size: 0.85rem; }

.status-bar {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
}
.status-item { display: flex; flex-direction: column; gap: 0.15rem; }
.status-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.status-value { font-size: 1rem; font-weight: 600; }

.alert {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.87rem;
}
.alert-warning { background: rgba(255,152,0,0.12); border: 1px solid #FF9800; color: #FF9800; }
.alert-danger  { background: rgba(229,57,53,0.12);  border: 1px solid #E53935; color: #E53935; }

.neighborhoods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.neighborhood-card {
  border-left: 4px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.neighborhood-card.owned  { border-left-color: #4CAF50; }
.neighborhood-card.enemy  { border-left-color: #E53935; }
.neighborhood-card.neutral { border-left-color: #666; }

.nc-header {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}
.nc-icon { font-size: 1.6rem; line-height: 1; }
.nc-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
.nc-name { font-size: 0.95rem; }
.nc-bonus-tag {
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 4px;
  display: inline-block;
  border: 1px solid currentColor;
  white-space: normal;
  line-height: 1.4;
}
.bonus-prison    { color: #9C27B0; }
.bonus-smuggling { color: #00BCD4; }
.bonus-crafting  { color: #FF9800; }
.bonus-income    { color: #4CAF50; }
.bonus-drops     { color: #E91E63; }
.bonus-weapons   { color: #607D8B; }
.bonus-crime     { color: #F44336; }
.bonus-market    { color: #2196F3; }
.bonus-xp        { color: #FFC107; }
.bonus-gym       { color: #8BC34A; }
.bonus-hospital  { color: #00E5FF; }

.nc-wall { display: flex; flex-direction: column; gap: 0.3rem; }
.wall-label { display: flex; justify-content: space-between; font-size: 0.78rem; }
.wall-hp-text { color: var(--text-muted); }
.wall-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}
.wall-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.wall-green  { background: #4CAF50; }
.wall-yellow { background: #FF9800; }
.wall-red    { background: #E53935; animation: pulse-red 1.5s infinite; }

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.nc-owner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
}
.owner-badge {
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  padding: 1px 6px;
}
.own-badge { background: rgba(76,175,80,0.15); color: #4CAF50; }
.owner-level { font-size: 0.72rem; }

.nc-graffiti {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
  border-left: 2px solid var(--border-color);
  padding-left: 0.5rem;
}

.nc-last-attack { font-size: 0.72rem; }

.nc-actions { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.25rem; }

.repair-row,
.graffiti-row {
  display: flex;
  gap: 0.4rem;
}
.input-sm {
  flex: 1;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
}
.input-sm:focus { outline: 1px solid var(--accent-color); }

.kep-btn { position: relative; font-size: 0.78rem; }

.cooldown-badge {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-left: 0.3rem;
}

.hint-text { font-size: 0.72rem; }

.retaliation-star { margin-left: 0.2rem; }

.bonuses-summary { margin-top: 0.5rem; }
.section-title { font-size: 0.9rem; margin-bottom: 0.75rem; font-weight: 600; }
.bonuses-grid { display: flex; flex-direction: column; gap: 0.35rem; }
.bonus-row { display: flex; justify-content: space-between; font-size: 0.82rem; }
.bonus-key { color: var(--text-muted); }
.bonus-val { font-weight: 600; }
</style>
