<template>
  <div class="travel-page">
    <h2 class="page-title">✈️ Ταξίδι</h2>

    <!-- Current Location -->
    <div class="card current-location">
      <div class="location-header">
        <span class="location-icon-large">{{ travelStore.currentLocationData.icon }}</span>
        <div>
          <h3>{{ travelStore.currentLocationData.name }}</h3>
          <p class="text-muted" style="font-size: var(--font-size-xs)">{{ travelStore.currentLocationData.description }}</p>
        </div>
      </div>
      <div class="location-bonuses mt-sm">
        <span v-if="travelStore.crimeRewardMultiplier !== 1" class="badge" :class="travelStore.crimeRewardMultiplier > 1 ? 'badge-success' : 'badge-danger'">
          Έγκλημα {{ formatBonus(travelStore.crimeRewardMultiplier) }}
        </span>
        <span v-if="travelStore.shopDiscountMultiplier !== 1" class="badge" :class="travelStore.shopDiscountMultiplier < 1 ? 'badge-success' : 'badge-danger'">
          Τιμές {{ formatBonus(travelStore.shopDiscountMultiplier) }}
        </span>
        <span v-if="travelStore.gymBoostMultiplier !== 1" class="badge" :class="travelStore.gymBoostMultiplier > 1 ? 'badge-success' : 'badge-danger'">
          Γυμναστική {{ formatBonus(travelStore.gymBoostMultiplier) }}
        </span>
      </div>
    </div>

    <!-- Traveling in progress -->
    <div v-if="player.activeActivity && player.activeActivity.type === 'travel'" class="card activity-card">
      <div class="activity-header">
        <span class="activity-icon">{{ player.activeActivity.icon }}</span>
        <div>
          <strong>{{ player.activeActivity.label }}</strong>
          <p class="text-muted" style="font-size: var(--font-size-xs)">Ταξιδεύεις...</p>
        </div>
      </div>
      <div class="activity-progress-track">
        <div class="activity-progress-fill" :style="{ width: (player.activityProgress * 100) + '%' }" />
      </div>
      <div class="activity-time text-mono text-accent">
        {{ formatTime(player.activityTimeRemaining) }}
      </div>
    </div>

    <!-- Busy with other activity -->
    <div v-else-if="player.activeActivity" class="card busy-card">
      <p class="text-muted">Είσαι απασχολημένος με: <strong>{{ player.activeActivity.label }}</strong></p>
      <p class="text-mono text-accent">{{ formatTime(player.activityTimeRemaining) }}</p>
    </div>

    <!-- Destinations -->
    <div v-if="!player.activeActivity" class="destinations">
      <h3 class="section-title">Προορισμοί</h3>
      <div class="destination-list">
        <div v-for="dest in travelStore.availableDestinations" :key="dest.id">

          <!-- Destination card -->
          <div
            class="card destination-card"
            :class="{
              disabled: !player.canAct,
              selected: selectedDest?.id === dest.id
            }"
            @click="selectDest(dest)"
          >
            <div class="dest-header">
              <span class="dest-icon">{{ dest.icon }}</span>
              <div class="dest-info">
                <strong>{{ dest.name }}</strong>
                <p class="text-muted dest-desc">{{ dest.description }}</p>
              </div>
              <span class="dest-arrow" :class="{ open: selectedDest?.id === dest.id }">›</span>
            </div>
            <div class="dest-meta">
              <div class="dest-times">
                <span class="badge badge-muted">🚆 {{ formatDuration(getTravelTime(dest.id)) }}</span>
                <span class="badge badge-muted">✈️ {{ formatDuration(Math.floor(getTravelTime(dest.id) / 2)) }}</span>
              </div>
              <div class="dest-bonuses">
                <span v-if="dest.bonuses.crimeReward !== 1" class="mini-badge" :class="dest.bonuses.crimeReward > 1 ? 'positive' : 'negative'">
                  🎭 {{ formatBonus(dest.bonuses.crimeReward) }}
                </span>
                <span v-if="dest.bonuses.shopDiscount !== 1" class="mini-badge" :class="dest.bonuses.shopDiscount < 1 ? 'positive' : 'negative'">
                  🛒 {{ formatBonus(dest.bonuses.shopDiscount) }}
                </span>
                <span v-if="dest.bonuses.gymBoost !== 1" class="mini-badge" :class="dest.bonuses.gymBoost > 1 ? 'positive' : 'negative'">
                  💪 {{ formatBonus(dest.bonuses.gymBoost) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Transport selection (inline, expands under the card) -->
          <Transition name="expand">
            <div v-if="selectedDest?.id === dest.id" class="transport-panel">
              <p class="transport-title text-muted">Πώς θέλεις να ταξιδέψεις;</p>
              <div class="transport-grid">

                <!-- Train -->
                <button
                  class="transport-btn train-btn"
                  :disabled="player.cash < trainCost(dest.id)"
                  @click.stop="travel(dest, 'train')"
                >
                  <span class="tb-icon">🚆</span>
                  <span class="tb-label">Τρένο</span>
                  <span class="tb-time">{{ formatDuration(getTravelTime(dest.id)) }}</span>
                  <span class="tb-cost">€{{ formatCash(trainCost(dest.id)) }}</span>
                  <span v-if="player.cash < trainCost(dest.id)" class="tb-locked text-danger">Ανεπαρκή κεφάλαια</span>
                </button>

                <!-- Plane -->
                <button
                  class="transport-btn plane-btn"
                  :disabled="player.cash < planeCost(dest.id)"
                  @click.stop="travel(dest, 'plane')"
                >
                  <span class="tb-icon">✈️</span>
                  <span class="tb-label">Αεροπλάνο</span>
                  <span class="tb-time">{{ formatDuration(Math.floor(getTravelTime(dest.id) / 2)) }}</span>
                  <span class="tb-cost">€{{ formatCash(planeCost(dest.id)) }}</span>
                  <span v-if="player.cash < planeCost(dest.id)" class="tb-locked text-danger">Ανεπαρκή κεφάλαια</span>
                </button>

              </div>
              <p class="transport-warning text-muted">
                ⚠️ Υπάρχει πιθανότητα ατυχήματος — ρίξε ζάρι 2+ για να φτάσεις σώος.
              </p>
            </div>
          </Transition>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useTravelStore, calculateTravelCost } from '../stores/travelStore'
import { useGameStore } from '../stores/gameStore'
import { getTravelTime as _getTravelTime } from '../data/locations'

const player = usePlayerStore()
const travelStore = useTravelStore()
const gameStore = useGameStore()

const selectedDest = ref(null)

function getTravelTime(destId) {
  return _getTravelTime(travelStore.currentLocation, destId)
}

function trainCost(destId) {
  return calculateTravelCost(getTravelTime(destId), 'train')
}

function planeCost(destId) {
  return calculateTravelCost(getTravelTime(destId), 'plane')
}

function selectDest(dest) {
  if (!player.canAct) return
  selectedDest.value = selectedDest.value?.id === dest.id ? null : dest
}

function travel(dest, mode) {
  const result = travelStore.startTravel(dest.id, mode)
  if (!result.started) {
    gameStore.addNotification(result.message, 'danger')
    return
  }
  selectedDest.value = null
}

function formatTime(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatDuration(ms) {
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}δ`
  const min = Math.floor(totalSec / 60)
  return `${min} λεπτ${min === 1 ? 'ό' : 'ά'}`
}

function formatBonus(multiplier) {
  const pct = Math.round((multiplier - 1) * 100)
  if (pct > 0) return `+${pct}%`
  if (pct < 0) return `${pct}%`
  return '0%'
}

function formatCash(n) {
  return new Intl.NumberFormat('el-GR').format(n)
}
</script>

<style scoped>
.travel-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); }

.section-title {
  font-size: var(--font-size-lg);
  margin-bottom: var(--space-sm);
}

.current-location { border-left: 3px solid var(--color-primary); }

.location-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.location-icon-large { font-size: 36px; }

.location-bonuses {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

/* Destination list */
.destination-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.destination-card {
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.destination-card.selected {
  border-color: var(--color-accent);
  background: var(--bg-surface-raised);
}

.destination-card:hover:not(.disabled):not(.selected) {
  background: var(--bg-surface-raised);
  transform: translateX(2px);
}

.destination-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dest-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.dest-icon { font-size: 28px; flex-shrink: 0; }

.dest-info {
  flex: 1;
  min-width: 0;
}

.dest-info strong { font-size: var(--font-size-sm); }
.dest-desc { font-size: var(--font-size-xs); line-height: 1.4; }

.dest-arrow {
  font-size: 20px;
  color: var(--text-secondary);
  transition: transform var(--transition-fast);
  flex-shrink: 0;
  line-height: 1;
}
.dest-arrow.open { transform: rotate(90deg); color: var(--color-accent); }

.dest-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.dest-times { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
.dest-bonuses { display: flex; gap: var(--space-xs); flex-wrap: wrap; }

.badge-muted {
  background: var(--bg-surface-raised);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
}

.mini-badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
}
.mini-badge.positive { background: rgba(46,204,113,0.15); color: var(--color-success); }
.mini-badge.negative { background: rgba(231,76,60,0.15); color: var(--color-danger); }

/* Transport panel */
.transport-panel {
  background: var(--bg-surface-raised);
  border: 1px solid var(--color-accent);
  border-top: none;
  border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.transport-title {
  font-size: var(--font-size-xs);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.transport-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.transport-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: var(--space-sm) var(--space-xs);
  border-radius: var(--border-radius-md);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--bg-surface);
}

.transport-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.train-btn {
  border-color: var(--color-accent);
}
.train-btn:not(:disabled):hover {
  background: rgba(79,195,247,0.1);
}

.plane-btn {
  border-color: var(--color-warning);
}
.plane-btn:not(:disabled):hover {
  background: rgba(243,156,18,0.1);
}

.tb-icon  { font-size: 28px; }
.tb-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); }
.tb-time  { font-size: var(--font-size-xs); color: var(--text-secondary); }
.tb-cost  { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--color-success); font-family: var(--font-family-mono); }
.tb-locked { font-size: 9px; text-align: center; }

.transport-warning {
  font-size: var(--font-size-xs);
  text-align: center;
  margin: 0;
}

/* Activity in progress */
.activity-card { border-left: 3px solid var(--color-accent); }

.activity-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.activity-icon { font-size: 24px; }

.activity-progress-track {
  height: 6px;
  background: var(--bg-base);
  border-radius: var(--border-radius-full);
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.activity-progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--border-radius-full);
  transition: width 0.5s linear;
}

.activity-time {
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.busy-card { text-align: center; opacity: 0.7; }

/* Expand transition */
.expand-enter-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 300px;
}

.mt-sm { margin-top: var(--space-sm); }
</style>
