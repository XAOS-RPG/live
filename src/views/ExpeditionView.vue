<template>
  <div class="expedition-page">
    <h2 class="page-title">🗺️ Εξόρμηση</h2>

    <!-- Help -->
    <details class="card help-card" v-if="!store.currentRun && !store.planningDistrictId">
      <summary>❓ Πώς λειτουργεί</summary>
      <ul class="help-list">
        <li>Διάλεξε <strong>γειτονιά</strong>, μετά σχεδίασε διαδρομή πατώντας γειτονικούς κόμβους.</li>
        <li>Κάθε βήμα κοστίζει <strong>{{ baseEnergyPerNode }} Ενέργεια</strong>. Σε κάθε κόμβο συμβαίνει κάτι — διάλεξε πως θα αντιδράσεις.</li>
        <li>Μπορείς πάντα να <strong>υποχωρήσεις</strong> — κρατάς ό,τι κέρδισες μέχρι εκεί.</li>
        <li>Κάθε μέρα η γειτονιά έχει διαφορετικό <strong>κλίμα</strong> (περιπολίες, πιάτσα, κόντρες) και <strong>hot nodes</strong> με καλύτερες ανταμοιβές.</li>
        <li>Η <strong>θερμότητα</strong> μαζεύεται με κάθε εξόρμηση και επιστρέφει τις συνέπειες πάνω σου.</li>
        <li>Αν <strong>κατέχεις</strong> τη γειτονιά (Κυριαρχία), η εξόρμηση είναι ασφαλέστερη και πιο προσοδοφόρα.</li>
      </ul>
    </details>

    <!-- Active run summary (finished) -->
    <div v-if="store.currentRun?.isFinished" class="card summary-card">
      <div class="summary-header">
        <span class="summary-icon">{{ store.currentRun.finishedReason === 'retreat' ? '🚪' : '🏁' }}</span>
        <div>
          <strong>{{ store.currentRun.finishedReason === 'retreat' ? 'Υποχώρηση' : 'Ολοκλήρωση' }} — {{ currentDistrict?.name }}</strong>
          <div class="text-muted">{{ store.currentRun.stepIndex }} σημεία που επισκέφθηκες</div>
        </div>
      </div>
      <div class="summary-totals">
        <div class="total-chip" :class="store.currentRun.totals.cash >= 0 ? 'gain' : 'loss'">
          💶 {{ formatSigned(store.currentRun.totals.cash) }}€
        </div>
        <div v-if="store.currentRun.totals.xp" class="total-chip gain">⭐ +{{ store.currentRun.totals.xp }} XP</div>
        <div v-if="store.currentRun.totals.crimeXp" class="total-chip gain">🎭 +{{ store.currentRun.totals.crimeXp }} CrimeXP</div>
        <div v-if="store.currentRun.totals.hp" class="total-chip" :class="store.currentRun.totals.hp >= 0 ? 'gain' : 'loss'">
          ❤️ {{ formatSigned(store.currentRun.totals.hp) }} HP
        </div>
        <div v-for="(it, idx) in store.currentRun.totals.items" :key="idx" class="total-chip gain">
          🎒 {{ it.qty > 0 ? `+${it.qty}` : it.qty }} {{ itemLabel(it.id) }}
        </div>
      </div>
      <div v-if="store.currentRun.log.length" class="summary-log">
        <div class="log-title">📜 Ιστορικό Διαδρομής</div>
        <ul>
          <li v-for="(e, idx) in store.currentRun.log" :key="idx">
            <span class="log-icon">{{ e.eventIcon || '·' }}</span>
            <span class="log-text">{{ e.eventTitle || e.note || '—' }}</span>
          </li>
        </ul>
      </div>
      <button class="btn btn-primary" @click="store.dismissFinishedRun()">Συνέχεια</button>
    </div>

    <!-- Active run (in-progress) -->
    <div v-else-if="store.currentRun" class="run-screen">
      <div class="run-header card">
        <div class="run-district">
          <span class="run-icon">{{ currentDistrict.icon }}</span>
          <strong>{{ currentDistrict.name }}</strong>
        </div>
        <div class="run-progress">
          Βήμα <strong>{{ store.currentRun.stepIndex }}</strong> / {{ store.currentRun.route.length - 1 }}
        </div>
      </div>

      <ExpeditionMap
        :district="currentDistrict"
        :route="store.currentRun.route"
        :current-node-id="currentNodeId"
        :hot-node-ids="districtState.hotNodeIds"
        :marked-node-ids="districtState.markedNodeIds"
        :explored-node-ids="districtState.exploredNodeIds"
        mode="run"
      />

      <!-- Pending event card -->
      <div v-if="currentEvent" class="card event-card">
        <div class="event-header">
          <span class="event-icon">{{ currentEvent.icon }}</span>
          <strong>{{ currentEvent.title }}</strong>
        </div>
        <p class="event-prompt">{{ currentEvent.prompt }}</p>
        <div class="choice-list">
          <button
            v-for="choice in currentEvent.choices"
            :key="choice.key"
            class="btn choice-btn"
            :class="{ 'choice-disabled': !canAffordChoice(choice) }"
            :disabled="!canAffordChoice(choice)"
            @click="onChoose(choice.key)"
          >
            <span class="choice-label">{{ choice.label }}</span>
            <span v-if="choice.requires" class="choice-req text-muted">
              {{ formatRequires(choice.requires) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Retreat button -->
      <button class="btn btn-outline retreat-btn" @click="onRetreat">
        🚪 Υποχώρηση (κράτα ό,τι κέρδισες)
      </button>
    </div>

    <!-- Planning -->
    <div v-else-if="store.planningDistrictId" class="plan-screen">
      <div class="plan-header card">
        <div class="plan-district">
          <span class="plan-icon">{{ currentDistrict.icon }}</span>
          <strong>{{ currentDistrict.name }}</strong>
          <button class="btn-link back-btn" @click="store.cancelPlanning()">
            ← Αλλαγή γειτονιάς
          </button>
        </div>
        <div class="plan-meta">
          <span class="meta-chip" :class="`heat-${heatTier}`">
            🔥 Θερμότητα: {{ store.effectiveHeat(store.planningDistrictId) }}
          </span>
          <span v-if="activeModifier" class="meta-chip modifier-chip" :title="activeModifier.description">
            {{ activeModifier.icon }} {{ activeModifier.label }}
          </span>
          <span v-if="ownsNeighborhood" class="meta-chip own-chip">
            👑 Κυριαρχία σου (+15% ανταμοιβή, -50% ενέδρες)
          </span>
        </div>
      </div>

      <ExpeditionMap
        :district="currentDistrict"
        :route="store.plannedRoute"
        :hot-node-ids="districtState.hotNodeIds"
        :marked-node-ids="districtState.markedNodeIds"
        :explored-node-ids="districtState.exploredNodeIds"
        mode="plan"
        @node-click="onNodeClick"
      />

      <div class="card plan-summary">
        <div class="plan-row">
          <span class="text-muted">Διαδρομή:</span>
          <strong>{{ store.plannedRoute.length }} / {{ store.maxRouteNodes }} σημεία</strong>
        </div>
        <div class="plan-row">
          <span class="text-muted">Κόστος Ενέργειας:</span>
          <strong :class="{ 'text-danger': energyCost > player.resources.energy.current }">
            {{ energyCost }} Ε
          </strong>
        </div>
        <div class="plan-row">
          <span class="text-muted">Hot nodes σήμερα:</span>
          <span>
            <span v-for="id in districtState.hotNodeIds" :key="id" class="hot-pill">
              ⭐ {{ nodeName(id) }}
            </span>
          </span>
        </div>

        <div class="plan-actions">
          <button
            class="btn btn-sm btn-outline"
            :disabled="store.plannedRoute.length <= 1"
            @click="store.removeLastRouteNode()"
          >
            − Αφαίρεση
          </button>
          <button
            class="btn btn-primary btn-start"
            :disabled="!canStart"
            @click="onStart"
          >
            🚀 Έναρξη Εξόρμησης
          </button>
        </div>
        <div v-if="startError" class="plan-error text-danger">{{ startError }}</div>
      </div>
    </div>

    <!-- District selection -->
    <div v-else class="district-select">
      <p class="text-muted page-subtitle">
        Σχεδίασε μια διαδρομή στα σοκάκια της Αθήνας. Κάθε κόμβος φέρνει επιλογή — δεν είσαι επιβάτης.
      </p>

      <div class="district-grid">
        <div
          v-for="d in EXPEDITION_DISTRICTS"
          :key="d.id"
          class="card district-card"
          :class="{ 'district-locked': !store.isDistrictAvailable(d.id) }"
          :style="{ borderLeftColor: d.accent }"
          @click="onPickDistrict(d.id)"
        >
          <div class="district-head">
            <span class="district-icon">{{ d.icon }}</span>
            <strong class="district-name">{{ d.name }}</strong>
          </div>
          <p class="district-desc text-muted">{{ d.description }}</p>

          <div class="district-meta">
            <span class="meta-chip" :class="`heat-${store.heatTier(d.id)}`" :title="`Θερμότητα: ${store.effectiveHeat(d.id)} / 100`">
              🔥 {{ store.effectiveHeat(d.id) }}
            </span>
            <span v-if="modifierFor(d.id)" class="meta-chip" :title="modifierFor(d.id).description">
              {{ modifierFor(d.id).icon }} {{ modifierFor(d.id).label }}
            </span>
            <span v-if="isOwn(d.id)" class="meta-chip own-chip">👑 Δική σου</span>
          </div>

          <div v-if="!store.isDistrictAvailable(d.id)" class="district-cooldown">
            ⏳ Cooldown: {{ formatMs(store.districtCooldownRemaining(d.id)) }}
          </div>
          <div v-else-if="diminishingFor(d.id) < 1" class="district-diminish text-muted">
            ⚠️ Επόμενη εξόρμηση εδώ: {{ Math.round(diminishingFor(d.id) * 100) }}% ανταμοιβή (ήδη έτρεξες σήμερα)
          </div>
          <div v-else class="district-ready text-success">✓ Έτοιμη</div>
        </div>
      </div>

      <div class="stats-card card">
        <div class="stat-row">
          <span class="text-muted">Μέγιστη διαδρομή:</span>
          <strong>{{ store.maxRouteNodes }} σημεία</strong>
          <span class="text-muted"> (Επίπεδο {{ player.level }})</span>
        </div>
        <div class="stat-row">
          <span class="text-muted">Σύνολο εξορμήσεων:</span>
          <strong>{{ store.totalRuns }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useExpeditionStore } from '../stores/expeditionStore'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
import {
  EXPEDITION_DISTRICTS,
  EXPEDITION_CONSTS,
  getDistrict,
  getNode,
  getEventById,
  getModifier,
} from '../data/expeditions'
import { getItemById } from '../data/items'
import ExpeditionMap from '../components/ExpeditionMap.vue'

const store = useExpeditionStore()
const player = usePlayerStore()
const inventory = useInventoryStore()

const startError = ref('')

onMounted(() => {
  store.ensureDailyRollover()
})

const baseEnergyPerNode = EXPEDITION_CONSTS.ENERGY_PER_NODE

const currentDistrict = computed(() => {
  const id = store.activeDistrictId
  return id ? getDistrict(id) : null
})

const districtState = computed(() => {
  if (!currentDistrict.value) return { hotNodeIds: [], markedNodeIds: [], exploredNodeIds: [] }
  return store.districtState(currentDistrict.value.id)
})

const currentNodeId = computed(() => {
  const r = store.currentRun
  if (!r) return null
  return r.route[r.stepIndex] || null
})

const currentEvent = computed(() => {
  const pe = store.currentRun?.pendingEvent
  return pe ? getEventById(pe.eventId) : null
})

const activeModifier = computed(() => {
  if (!store.planningDistrictId) return null
  const s = store.districts[store.planningDistrictId]
  return s ? getModifier(s.modifierId) : null
})

const heatTier = computed(() =>
  store.planningDistrictId ? store.heatTier(store.planningDistrictId) : 'cold'
)

const ownsNeighborhood = computed(() =>
  store.planningDistrictId ? store.ownsNeighborhood(store.planningDistrictId) : false
)

const energyCost = computed(() => {
  if (!store.planningDistrictId) return 0
  const nodesToTraverse = Math.max(0, store.plannedRoute.length - 1)
  return store.energyCostForRoute(store.planningDistrictId, nodesToTraverse)
})

const canStart = computed(() => {
  if (!store.planningDistrictId) return false
  if (store.plannedRoute.length < 2) return false
  if (player.resources.energy.current < energyCost.value) return false
  if (player.isIncapacitated) return false
  if (player.activeActivity) return false
  return true
})

function modifierFor(districtId) {
  const s = store.districts[districtId]
  return s ? getModifier(s.modifierId) : null
}

function diminishingFor(districtId) {
  return store.diminishingMultiplier(districtId)
}

function isOwn(districtId) {
  return store.ownsNeighborhood(districtId)
}

function onPickDistrict(districtId) {
  if (!store.isDistrictAvailable(districtId)) return
  store.startPlanning(districtId)
}

function onNodeClick(node) {
  if (store.plannedRoute.includes(node.id)) return
  store.addRouteNode(node.id)
}

function nodeName(nodeId) {
  return getNode(store.planningDistrictId, nodeId)?.name || nodeId
}

function onStart() {
  startError.value = ''
  const res = store.startRun()
  if (!res.ok) {
    const map = {
      route_too_short: 'Σχεδίασε τουλάχιστον 1 επιπλέον βήμα.',
      energy: `Δεν έχεις αρκετή Ενέργεια (χρειάζεσαι ${res.needed}).`,
      busy: 'Είσαι απασχολημένος/η σε άλλη δραστηριότητα.',
      incapacitated: 'Δεν μπορείς — είσαι σε νοσοκομείο/φυλακή.',
      cooldown: 'Η γειτονιά είναι σε cooldown.',
      no_plan: 'Δεν υπάρχει σχέδιο.',
    }
    startError.value = map[res.reason] || 'Κάτι πήγε στραβά.'
  }
}

function onRetreat() {
  if (confirm('Σίγουρα θες να υποχωρήσεις; Κρατάς ό,τι κέρδισες.')) {
    store.retreat()
  }
}

function onChoose(key) {
  store.resolveEventChoice(key)
}

function canAffordChoice(choice) {
  if (!choice.requires) return true
  for (const [k, v] of Object.entries(choice.requires)) {
    if (k === 'cash' && player.cash < v) return false
    if (k === 'hp' && player.resources.hp.current < v) return false
    if (k === 'energy' && player.resources.energy.current < v) return false
    if (k === 'stamina' && player.resources.stamina.current < v) return false
    if (k === 'nerve' && player.resources.nerve.current < v) return false
    if (k === 'filotimo' && player.filotimo < v) return false
    if (k === 'item' && !inventory.hasItem(v)) return false
  }
  return true
}

function formatRequires(req) {
  const parts = []
  if (req.cash) parts.push(`${req.cash}€`)
  if (req.hp) parts.push(`${req.hp} HP`)
  if (req.energy) parts.push(`${req.energy} Ε`)
  if (req.stamina) parts.push(`${req.stamina} Stamina`)
  if (req.nerve) parts.push(`${req.nerve} Θ`)
  if (req.filotimo) parts.push(`${req.filotimo} Φιλ.`)
  if (req.item) parts.push(itemLabel(req.item))
  return parts.length ? `(χρειάζεσαι: ${parts.join(', ')})` : ''
}

function itemLabel(id) {
  return getItemById(id)?.name || id
}

function formatSigned(n) {
  if (n > 0) return `+${n}`
  return String(n)
}

function formatMs(ms) {
  if (ms <= 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}ώ ${m}λ`
  return `${m}λ`
}
</script>

<style scoped>
.expedition-page {
  padding-bottom: 2rem;
}

.page-subtitle {
  margin-top: -0.5rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.help-card {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
}

.help-card summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  user-select: none;
}

.help-list {
  margin: 0.6rem 0 0 1.2rem;
  padding: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-muted, var(--text-secondary));
}

.help-list li { margin-bottom: 0.25rem; }

/* District selection */
.district-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media (min-width: 720px) {
  .district-grid { grid-template-columns: repeat(3, 1fr); }
}

.district-card {
  border-left: 4px solid var(--border-color);
  cursor: pointer;
  transition: transform 150ms ease, background 150ms ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.district-card:hover:not(.district-locked) {
  transform: translateY(-2px);
  background: rgba(255,255,255,0.02);
}

.district-locked {
  opacity: 0.55;
  cursor: not-allowed;
}

.district-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.district-icon { font-size: 1.6rem; }
.district-name { font-size: 1.05rem; }

.district-desc {
  font-size: 0.8rem;
  font-style: italic;
  line-height: 1.4;
  margin: 0;
}

.district-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.75rem;
}

.meta-chip {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
}

.heat-cold { color: #4FC3F7; }
.heat-warm { color: #FFA726; border-color: rgba(255,167,38,0.3); }
.heat-hot  { color: #E53935; border-color: rgba(229,57,53,0.3); animation: pulseHeat 2s ease infinite; }

.modifier-chip { color: #CE93D8; }
.own-chip      { color: #4CAF50; background: rgba(76,175,80,0.1); border-color: rgba(76,175,80,0.3); }

.district-cooldown, .district-diminish {
  font-size: 0.78rem;
  color: var(--color-warning);
}

.district-ready {
  font-size: 0.78rem;
}

/* Stats card */
.stats-card {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.stat-row { font-size: 0.85rem; }

/* Plan screen */
.plan-screen {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plan-header {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-district {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.plan-icon { font-size: 1.3rem; }

.back-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-link, var(--color-accent));
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
}

.plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.75rem;
}

.plan-summary {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.88rem;
  gap: 0.5rem;
}

.hot-pill {
  display: inline-block;
  padding: 1px 6px;
  font-size: 0.72rem;
  border-radius: 4px;
  background: rgba(255,179,0,0.12);
  color: #FFB300;
  margin-left: 0.25rem;
}

.plan-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.btn-start { flex: 1; font-weight: 600; }

.plan-error {
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

/* Run screen */
.run-screen {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.run-header {
  padding: 0.6rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.run-district {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.run-icon { font-size: 1.3rem; }

.run-progress {
  font-size: 0.85rem;
  color: var(--text-muted, var(--text-secondary));
}

/* Event card */
.event-card {
  padding: 1rem;
  border-left: 4px solid #ff6b35;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
}

.event-icon { font-size: 1.5rem; }

.event-prompt {
  margin: 0 0 0.75rem 0;
  font-style: italic;
  line-height: 1.5;
  font-size: 0.92rem;
}

.choice-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.choice-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
  padding: 0.6rem 0.8rem;
  background: var(--bg-surface-raised, rgba(255,255,255,0.05));
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
}

.choice-btn:not(:disabled):hover {
  background: rgba(255,107,53,0.08);
  border-color: #ff6b35;
}

.choice-btn.choice-disabled,
.choice-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.choice-label { font-weight: 600; }
.choice-req { font-size: 0.72rem; }

.retreat-btn {
  margin-top: 0.25rem;
  align-self: stretch;
}

/* Summary */
.summary-card {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.summary-icon { font-size: 1.8rem; }

.summary-totals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.total-chip {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 0.82rem;
  font-weight: 600;
  background: rgba(255,255,255,0.06);
}

.total-chip.gain { color: #4CAF50; background: rgba(76,175,80,0.12); }
.total-chip.loss { color: #E53935; background: rgba(229,57,53,0.12); }

.summary-log {
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}

.log-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, var(--text-secondary));
  margin-bottom: 0.3rem;
}

.summary-log ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.summary-log li {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.82rem;
}

.log-icon { font-size: 1rem; }

@keyframes pulseHeat {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
