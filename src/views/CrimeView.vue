<template>
  <div class="crime-page">
    <h2 class="page-title">🎭 Εγκλήματα</h2>
    <div class="crime-xp-bar card">
      <div class="flex flex-between">
        <span class="text-muted">Εγκληματική Εμπειρία</span>
        <span class="text-mono text-accent">{{ player.crimeXP }} XP</span>
      </div>
    </div>

    <!-- Active crime in progress -->
    <div v-if="player.activeActivity && player.activeActivity.type === 'crime'" class="card activity-card">
      <div class="activity-header">
        <span class="activity-icon">{{ player.activeActivity.icon }}</span>
        <div>
          <strong>{{ player.activeActivity.label }}</strong>
          <p class="text-muted" style="font-size: var(--font-size-xs)">Σε εξέλιξη...</p>
        </div>
      </div>
      <div class="activity-progress-track">
        <div class="activity-progress-fill" :style="{ width: (player.activityProgress * 100) + '%' }" />
      </div>
      <div class="activity-time text-mono text-accent">
        {{ formatTime(player.activityTimeRemaining) }}
      </div>
    </div>

    <!-- Busy with non-crime activity -->
    <div v-else-if="player.activeActivity" class="card busy-card">
      <p class="text-muted">Είσαι απασχολημένος με: <strong>{{ player.activeActivity.label }}</strong></p>
      <p class="text-mono text-accent">{{ formatTime(player.activityTimeRemaining) }}</p>
    </div>

    <!-- Pending result — player must roll the dice -->
    <div v-else-if="player.pendingResult && player.pendingResult.type === 'crime'" class="card roll-prompt-card">
      <div class="roll-prompt-header">
        <span style="font-size: 28px">{{ player.pendingResult.icon }}</span>
        <div>
          <strong>{{ player.pendingResult.label }}</strong>
          <p class="text-muted" style="font-size: var(--font-size-xs)">Ολοκληρώθηκε — ρίξε το ζάρι!</p>
        </div>
      </div>
      <button class="btn-roll-dice" @click="openDice">
        🎲 Ρίξε το Ζάρι!
      </button>
    </div>

    <!-- Available crimes -->
    <div v-if="!player.activeActivity && !player.pendingResult" class="crime-list">
      <div
        v-for="crime in crimeStore.availableCrimes"
        :key="crime.id"
        class="card crime-card"
        :class="{ disabled: !canDoCrime(crime), 'has-variants': crime.variants }"
        @click="!crime.variants && doCrime(crime)"
      >
        <div class="crime-header">
          <span class="crime-icon">{{ crime.icon }}</span>
          <div class="crime-info">
            <strong class="crime-name">{{ crime.name }}</strong>
            <p class="crime-desc text-muted">{{ crime.description }}</p>
          </div>
        </div>

        <!-- Normal crime stats (no variants) -->
        <div v-if="!crime.variants" class="crime-stats">
          <span class="badge badge-purple">{{ crime.nerveCost }} Θράσος</span>
          <span class="badge" :class="successBadgeClass(crime)">
            {{ Math.floor(crimeStore.getCrimeSuccessRate(crime.id) * 100) }}%
          </span>
          <span class="text-muted text-mono" style="font-size: var(--font-size-xs)">
            €{{ crime.rewards.cashMin }}-{{ crime.rewards.cashMax }}
          </span>
          <span class="badge badge-muted">{{ formatDuration(crime.duration) }}</span>
        </div>

        <!-- Variant crime: two option buttons -->
        <div v-else class="variant-section">
          <div class="variant-meta">
            <span class="badge badge-purple">{{ crime.nerveCost }} Θράσος</span>
            <span class="badge badge-muted">{{ formatDuration(crime.duration) }}</span>
          </div>
          <div class="variant-buttons">
            <button
              v-for="v in crime.variants"
              :key="v.id"
              class="btn-variant"
              :class="{ 'variant-disabled': !canDoCrime(crime) }"
              @click.stop="doCrime(crime, v.id)"
              :disabled="!canDoCrime(crime)"
            >
              <div class="variant-top">
                <span class="variant-label">{{ v.label }}</span>
                <span class="badge" :class="variantBadgeClass(crime, v)">
                  {{ Math.floor(crimeStore.getCrimeSuccessRate(crime.id, v.id) * 100) }}%
                </span>
              </div>
              <p class="variant-desc">{{ v.description }}</p>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Locked crimes -->
    <div v-if="crimeStore.lockedCrimes.length > 0 && !player.activeActivity && !player.pendingResult" class="locked-section">
      <h3 class="text-muted mt-lg mb-sm">🔒 Κλειδωμένα</h3>
      <div class="crime-list">
        <div
          v-for="crime in crimeStore.lockedCrimes"
          :key="crime.id"
          class="card crime-card locked"
        >
          <div class="crime-header">
            <span class="crime-icon" style="opacity: 0.4">{{ crime.icon }}</span>
            <div class="crime-info">
              <strong class="crime-name" style="opacity: 0.5">{{ crime.name }}</strong>
              <p class="text-muted" style="font-size: var(--font-size-xs)">
                Απαιτεί {{ crime.requiredCrimeXP }} Crime XP
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dice Roll Animation -->
    <DiceRoll
      :visible="showDice"
      :result="diceResult"
      @dismiss="onDiceDismiss"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/playerStore'
import { useCrimeStore } from '../stores/crimeStore'
import { useGameStore } from '../stores/gameStore'
import { getItemById } from '../data/items'
import DiceRoll from '../components/ui/DiceRoll.vue'

const player = usePlayerStore()
const crimeStore = useCrimeStore()
const gameStore = useGameStore()
const router = useRouter()

const showDice = ref(false)
const diceResult = ref(null)

function canDoCrime(crime) {
  return player.canAct && player.resources.nerve.current >= crime.nerveCost
}

function successBadgeClass(crime) {
  const rate = crimeStore.getCrimeSuccessRate(crime.id)
  if (rate >= 0.7) return 'badge-success'
  if (rate >= 0.4) return 'badge-warning'
  return 'badge-danger'
}

function variantBadgeClass(crime, variant) {
  const rate = crimeStore.getCrimeSuccessRate(crime.id, variant.id)
  if (rate >= 0.7) return 'badge-success'
  if (rate >= 0.4) return 'badge-warning'
  return 'badge-danger'
}

function doCrime(crime, variantId = null) {
  if (!canDoCrime(crime)) return
  const result = crimeStore.startCrime(crime.id, variantId)
  if (!result.started) {
    gameStore.addNotification(result.message, 'danger')
  }
}

// Player manually opens dice after timer completes
function openDice() {
  const result = player.pendingResult
  if (!result || result.type !== 'crime') return

  const rewards = result.success ? result.rewards : null
  let rewardDisplay = null
  let consequence = null

  if (result.success && rewards) {
    rewardDisplay = {
      cash: rewards.cash,
      xp: rewards.xp,
      crimeXP: rewards.crimeXP,
      filotimo: rewards.filotimoChange,
      items: [],
    }
    if (rewards.droppedItemId) {
      const item = getItemById(rewards.droppedItemId)
      rewardDisplay.items.push(item ? item.name : rewards.droppedItemId)
    }
  }

  if (!result.success) {
    consequence = result.jailed
      ? `Σε έπιασαν! Φυλακή για ${formatTime(result.jailTime)}`
      : 'Αποτυχία, αλλά ξέφυγες.'
  }

  diceResult.value = {
    success: result.success,
    roll: result.roll,
    targetRoll: result.targetRoll,
    label: result.label,
    icon: result.icon,
    rewards: rewardDisplay,
    consequence,
    _raw: result,
  }
  showDice.value = true
}

// Re-open dice if page is visited while pendingResult exists (e.g. navigated away and back)
watch(() => player.pendingResult, (result) => {
  if (!result || result.type !== 'crime') {
    showDice.value = false
    diceResult.value = null
  }
}, { immediate: false })

function onDiceDismiss() {
  showDice.value = false
  const raw = diceResult.value?._raw
  if (raw) {
    // Apply the pre-rolled result
    crimeStore.applyCrimeResult(raw)
    player.clearPendingResult()

    // Redirect to jail if jailed
    if (!raw.success && raw.jailed) {
      setTimeout(() => router.push('/jail'), 300)
    }
  }
  diceResult.value = null
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
</script>

<style scoped>
.crime-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title {
  font-size: var(--font-size-2xl);
}

.crime-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.crime-card {
  cursor: pointer;
  transition: all var(--transition-fast);
}

.crime-card:hover:not(.disabled):not(.locked) {
  background: var(--bg-surface-raised);
  transform: translateX(2px);
}

.crime-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.crime-card.locked {
  opacity: 0.4;
  cursor: default;
}

.crime-card.has-variants {
  cursor: default;
}

/* Variant section */
.variant-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.variant-meta {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.variant-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.btn-variant {
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: var(--space-sm);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
  color: var(--text-primary);
}

.btn-variant:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: var(--bg-base);
}

.btn-variant:disabled,
.btn-variant.variant-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.variant-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.variant-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.variant-desc {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.crime-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.crime-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.crime-info {
  flex: 1;
  min-width: 0;
}

.crime-name {
  font-size: var(--font-size-sm);
}

.crime-desc {
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.crime-stats {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.badge-muted {
  background: var(--bg-surface-raised);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
}

/* Roll dice prompt */
.roll-prompt-card {
  border-left: 3px solid var(--color-success);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.roll-prompt-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.btn-roll-dice {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-success);
  color: #fff;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.35);
  animation: rollPromptPulse 1.2s infinite;
}

.btn-roll-dice:hover {
  background: #27ae60;
  transform: scale(1.02);
}

@keyframes rollPromptPulse {
  0%, 100% { box-shadow: 0 4px 12px rgba(46, 204, 113, 0.35); }
  50%       { box-shadow: 0 4px 22px rgba(46, 204, 113, 0.65); }
}

/* Activity in progress */
.activity-card {
  border-left: 3px solid var(--color-accent);
}

.activity-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.activity-icon {
  font-size: 24px;
}

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

.busy-card {
  text-align: center;
  opacity: 0.7;
}
</style>
