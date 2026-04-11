<template>
  <header class="status-bar">
    <div class="status-bar-inner">
      <div class="status-top">
        <div class="player-info">
          <div class="level-box">{{ player.level }}</div>
          
          <div class="status-sentence">
            <span class="player-name">{{ article }} {{ player.name }}</span> 
            <span class="location-text">{{ locationPrefix }}</span> 
            <span class="dwelling-text" :class="{ 'is-homeless': !propertyStore.ownedProperty }">
              {{ dwellingText }}
            </span>
          </div>
        </div>

        <div
          class="player-cash"
          :class="{ 'is-editing': editingCash }"
          title="Κλικ για να ορίσεις μετρητά (δοκιμή)"
          @click="startEditCash"
        >
          <template v-if="!editingCash">
            <span class="cash-icon">€</span>
            <span class="cash-amount">{{ formatCash(player.cash) }}</span>
          </template>
          <template v-else>
            <span class="cash-icon">€</span>
            <input
              ref="cashInputRef"
              v-model="cashDraft"
              class="cash-input"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              @click.stop
              @keydown.enter.prevent="commitCashEdit"
              @keydown.esc.prevent="cancelCashEdit"
              @blur="commitCashEdit"
            />
          </template>
        </div>
      </div>
      
      <div class="status-bars">
        <ResourceBar
          label="Ζωή"
          :current="player.resources.hp.current"
          :max="player.resources.hp.max"
          color="var(--color-hp)"
          bg-color="var(--color-hp-bg)"
          icon="❤️"
        />
        <ResourceBar
          label="Ενέργεια"
          :current="player.resources.energy.current"
          :max="player.resources.energy.max"
          color="var(--color-energy)"
          bg-color="var(--color-energy-bg)"
          icon="⚡"
        />
        <ResourceBar
          label="Θράσος"
          :current="player.resources.nerve.current"
          :max="player.resources.nerve.max"
          color="var(--color-nerve)"
          bg-color="var(--color-nerve-bg)"
          icon="🎭"
        />
        <ResourceBar
          label="Κέφι"
          :current="player.resources.happiness.current"
          :max="player.resources.happiness.max"
          color="var(--color-happiness)"
          bg-color="var(--color-happiness-bg)"
          icon="😄"
        />
      </div>
      <ActivityTimer />
    </div>
  </header>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useTravelStore } from '../../stores/travelStore'
import { usePropertyStore } from '../../stores/propertyStore'
import ResourceBar from '../ui/ResourceBar.vue'
import ActivityTimer from '../ui/ActivityTimer.vue'

const player = usePlayerStore()
const travelStore = useTravelStore()
const propertyStore = usePropertyStore()

function formatCash(amount) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(amount))
}

const editingCash = ref(false)
const cashDraft = ref('')
const cashInputRef = ref(null)

function parseCashDraft(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return 0
  const n = parseInt(digits, 10)
  return Number.isFinite(n) ? Math.min(n, Number.MAX_SAFE_INTEGER) : 0
}

function startEditCash() {
  if (editingCash.value) return
  editingCash.value = true
  cashDraft.value = String(Math.floor(player.cash))
  nextTick(() => cashInputRef.value?.focus?.())
}

function commitCashEdit() {
  if (!editingCash.value) return
  player.setCash(parseCashDraft(cashDraft.value))
  editingCash.value = false
}

function cancelCashEdit() {
  if (!editingCash.value) return
  editingCash.value = false
}

// 1. Άρθρο (Ο/Η)
const article = computed(() => player.gender === 'female' ? 'Η' : 'Ο')

// 2. Σωστή γραμματική για πόλεις (σε/στον/στην/στο)
const LOCATION_GRAMMAR = {
  'athens': ' στην Αθήνα ',
  'thessaloniki': ' στη Θεσσαλονίκη ',
  'patras': ' στην Πάτρα ',
  'heraklion': ' στο Ηράκλειο ',
  'mykonos': ' στη Μύκονο ',
  'santorini': ' στη Σαντορίνη ',
  'corfu': ' στην Κέρκυρα '
}
const locationPrefix = computed(() => {
  return LOCATION_GRAMMAR[travelStore.currentLocation] || 'στην πόλη'
})

// 3. Σπίτι ή Άστεγος
const dwellingText = computed(() => {
  if (propertyStore.ownedProperty) {
    return `μένει σε ${propertyStore.ownedProperty.name}`
  } else {
    return player.gender === 'female' ? 'είναι άστεγη' : 'είναι άστεγος'
  }
})
</script>

<style scoped>
.status-bar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  padding: var(--space-sm) var(--space-md);
  z-index: var(--z-sticky);
  flex-shrink: 0;
}

.status-bar-inner {
  max-width: 800px;
  margin: 0 auto;
}

.status-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
  gap: var(--space-sm);
}

.player-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1; /* Για να σπρώχνει τα λεφτά δεξιά */
  min-width: 0; /* Προστασία για πολύ μεγάλα ονόματα σε κινητά */
}

/* Το νέο τετράγωνο του Level */
.level-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: rgba(79, 195, 247, 0.15); /* Απαλό χρώμα accent */
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  color: var(--color-accent);
  font-weight: 900;
  font-size: var(--font-size-sm);
  font-family: var(--font-family-mono);
  flex-shrink: 0;
}

/* Η νέα δυναμική πρόταση */
.status-sentence {
  font-size: 13px; /* Λίγο μικρότερο για να χωράει σε κινητά */
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
}

.player-name {
  font-weight: 800;
  color: var(--text-primary);
}

.is-homeless {
  color: var(--color-danger);
  font-weight: 600;
}

.player-cash {
  display: flex;
  align-items: center;
  gap: 2px;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-success);
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background 0.12s ease;
}

.player-cash:not(.is-editing):hover {
  background: rgba(76, 175, 80, 0.12);
}

.player-cash.is-editing {
  cursor: text;
}

.cash-input {
  width: 7.5rem;
  max-width: 32vw;
  padding: 1px 4px;
  border: 1px solid var(--color-success);
  border-radius: 3px;
  background: var(--bg-app, var(--bg-surface));
  color: var(--color-success);
  font: inherit;
  font-weight: var(--font-weight-bold);
}

.cash-icon {
  font-weight: var(--font-weight-bold);
}

.status-bars {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs);
}

/* Μικρές οθόνες κινητών: ρίχνουμε το font size αν χρειαστεί */
@media (max-width: 380px) {
  .status-sentence { font-size: 11px; }
}

@media (min-width: 768px) {
  .status-bars {
    grid-template-columns: repeat(4, 1fr);
  }
  .status-sentence { font-size: 14px; }
}
</style>
