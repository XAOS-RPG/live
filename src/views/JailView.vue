<template>
  <div class="jail-page">
    <div class="jail-header">
      <span class="jail-icon">🔒</span>
      <h2>Φυλακή</h2>
    </div>

    <div v-if="player.status === 'jail'" class="card jail-card">
      <div class="timer-section">
        <div class="timer-label text-muted">Χρόνος που απομένει</div>
        <div class="timer-value text-mono">{{ formatTime(remaining) }}</div>
        <div class="timer-bar">
          <div class="bar-track" style="background: var(--color-warning); opacity: 0.2">
            <div class="bar-fill" :style="{ width: timerProgress + '%', background: 'var(--color-warning)' }" />
          </div>
        </div>
      </div>

      <div class="jail-actions">
        <button
          class="btn btn-primary btn-block"
          :disabled="!canEscape"
          @click="tryEscape"
        >
          🏃 Απόπειρα Απόδρασης ({{ Math.floor(escapeChance * 100) }}%)
        </button>

        <button
          class="btn btn-outline btn-block"
          :disabled="player.cash < bribeCost"
          @click="payBribe"
        >
          💰 Φακελάκι (€{{ formatCash(bribeCost) }})
        </button>
      </div>

      <Transition name="fade">
        <div v-if="escapeMessage" class="card mt-sm" :class="escapeSuccess ? 'result-success' : 'result-fail'">
          <p>{{ escapeMessage }}</p>
        </div>
      </Transition>
    </div>

    <div v-else class="card text-center">
      <p>Είσαι ελεύθερος! 🎉</p>
      <router-link to="/" class="btn btn-primary mt-md">Πίσω στην Αρχική</router-link>
    </div>

    <!-- Bust system -->
    <div class="card bust-section">
      <h3 class="bust-title">🔓 Αποφυλάκιση Άλλων</h3>
      <p class="text-muted bust-desc">
        Ξόδεψε 5 Μέσον για να αποφυλακίσεις έναν παίκτη. Κερδίζεις +10 Φιλότιμο.
      </p>
      <div class="bust-meson text-muted">Μέσον σου: <strong class="text-accent">{{ player.meson }}</strong></div>

      <Transition name="fade">
        <div v-if="bustMessage" class="bust-result" :class="bustSuccess ? 'result-success' : 'result-fail'">
          {{ bustMessage }}
        </div>
      </Transition>

      <div class="jailed-list">
        <div v-for="jailedUser in jailedFakeUsers" :key="jailedUser.id" class="jailed-row">
          <span class="jailed-icon">{{ jailedUser.icon }}</span>
          <div class="jailed-info">
            <strong>{{ jailedUser.nickname }}</strong>
            <span class="text-muted" style="font-size:var(--font-size-xs);">Επ. {{ jailedUser.level }} · {{ jailedUser.location }}</span>
          </div>
          <button
            class="btn btn-sm btn-primary"
            :disabled="player.meson < 5 || bustedIds.includes(jailedUser.id)"
            @click="bustPlayer(jailedUser)"
          >
            {{ bustedIds.includes(jailedUser.id) ? '✔ Αποφυλακίστηκε' : '🔓 Bust (5 Μέσον)' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'
import { calculateEscapeChance, calculateBribeCost } from '../engine/formulas'
import { ESCAPE_COOLDOWN_MS } from '../data/constants'
import { fakeUsers } from '../data/fakeUsers'

const player = usePlayerStore()
const gameStore = useGameStore()

const escapeMessage = ref('')
const escapeSuccess = ref(false)
const lastEscapeAttempt = ref(0)

// Bust system
const bustedIds = ref([])
const bustMessage = ref('')
const bustSuccess = ref(false)

// Pick 4 fake users as "jailed" — deterministic selection
const jailedFakeUsers = fakeUsers.filter((_, i) => i % 3 === 1).slice(0, 4)

function bustPlayer(user) {
  if (player.meson < 5 || bustedIds.value.includes(user.id)) return
  player.addMeson(-5)
  player.addFilotimo(10)
  bustedIds.value.push(user.id)
  bustMessage.value = `Αποφυλάκισες τον ${user.nickname}! +10 Φιλότιμο`
  bustSuccess.value = true
  player.logActivity(`🔓 Αποφυλάκωσε τον ${user.nickname} (+10 Φιλότιμο, -5 Μέσον)`, 'success')
  gameStore.addNotification(`${user.nickname} αποφυλακίστηκε! +10 Φιλότιμο`, 'success')
  gameStore.saveGame()
  setTimeout(() => { bustMessage.value = '' }, 3000)
}

const remaining = computed(() => player.statusTimeRemaining)

const timerProgress = computed(() => {
  if (!player.statusTimerEnd) return 0
  const total = player.statusTimerEnd - (player.statusTimerEnd - remaining.value)
  return remaining.value > 0 ? (remaining.value / Math.max(1, total - Date.now() + remaining.value)) * 100 : 0
})

const canEscape = computed(() => {
  return Date.now() - lastEscapeAttempt.value >= ESCAPE_COOLDOWN_MS
})

const escapeChance = computed(() => {
  return calculateEscapeChance(remaining.value, player.stats.dexterity, player.meson)
})

const bribeCost = computed(() => {
  return calculateBribeCost(remaining.value)
})

function tryEscape() {
  if (!canEscape.value) return

  lastEscapeAttempt.value = Date.now()
  const chance = escapeChance.value
  const success = Math.random() < chance

  if (success) {
    player.clearStatus()
    escapeMessage.value = 'Απέδρασες! 🏃‍♂️'
    escapeSuccess.value = true
    player.logActivity('Απέδρασε από τη φυλακή!', 'success')
    gameStore.addNotification('Απέδρασες από τη φυλακή!', 'success')
    player.addMeson(1) // Gain connections from the experience
  } else {
    // Failed escape adds time
    const addedTime = 60000 // 1 minute penalty
    if (player.statusTimerEnd) {
      player.statusTimerEnd += addedTime
    }
    escapeMessage.value = 'Αποτυχημένη απόδραση! +1 λεπτό ποινή.'
    escapeSuccess.value = false
    player.logActivity('Αποτυχημένη απόδραση — +1 λεπτό', 'danger')
    gameStore.addNotification('Αποτυχημένη απόδραση!', 'danger')
  }

  gameStore.saveGame()

  setTimeout(() => {
    escapeMessage.value = ''
  }, 3000)
}

function payBribe() {
  const cost = bribeCost.value
  if (player.cash < cost) return

  player.removeCash(cost)
  player.clearStatus()
  player.addFilotimo(-5) // Bribing reduces honor
  player.logActivity(`Πλήρωσε φακελάκι €${cost} για αποφυλάκιση`, 'cash')
  gameStore.addNotification(`Φακελάκι €${cost} — Ελεύθερος!`, 'warning')
  gameStore.saveGame()
}

function formatTime(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatCash(amount) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(amount))
}
</script>

<style scoped>
.jail-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.jail-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.jail-icon {
  font-size: 32px;
}

.timer-section {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.timer-label {
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-xs);
}

.timer-value {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-warning);
  margin-bottom: var(--space-sm);
}

.timer-bar .bar-track {
  height: 6px;
  border-radius: var(--border-radius-full);
  overflow: hidden;
}

.timer-bar .bar-fill {
  height: 100%;
  border-radius: var(--border-radius-full);
  transition: width 1s linear;
}

.jail-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.result-success {
  border-left: 3px solid var(--color-success);
  color: var(--color-success);
}

.result-fail {
  border-left: 3px solid var(--color-danger);
  color: var(--color-danger);
}

/* Bust section */
.bust-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.bust-title { font-size: var(--font-size-md); margin: 0; }
.bust-desc  { font-size: var(--font-size-xs); margin: 0; }
.bust-meson { font-size: var(--font-size-sm); }

.bust-result {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
}

.result-success {
  border-left: 3px solid var(--color-success);
  color: var(--color-success);
}

.result-fail {
  border-left: 3px solid var(--color-danger);
  color: var(--color-danger);
}

.jailed-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.jailed-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
}

.jailed-icon { font-size: 22px; flex-shrink: 0; }

.jailed-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-sm);
}

/* Fade transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
