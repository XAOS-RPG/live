<template>
  <div class="jail-page">
    <div class="jail-header">
      <span class="jail-icon">🔒</span>
      <h2>Φυλακή</h2>
    </div>

    <!-- Own jail status -->
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
        <button class="btn btn-primary btn-block" :disabled="!canEscape" @click="tryEscape">
          🏃 Απόπειρα Απόδρασης ({{ Math.floor(escapeChance * 100) }}%)
        </button>
        <button class="btn btn-outline btn-block" :disabled="player.cash < bribeCost" @click="payBribe">
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

    <!-- ── Bust / Bail section ─────────────────────────────────────────── -->
    <div class="card bust-section">
      <div class="bust-header-row">
        <h3 class="bust-title">🔓 Παίκτες στη Φυλακή</h3>
        <button class="btn btn-sm btn-outline" @click="loadJailed" :disabled="loadingJailed">
          {{ loadingJailed ? '...' : '🔄' }}
        </button>
      </div>
      <p class="text-muted bust-desc">
        Βοήθησε άλλους παίκτες να βγουν — ή πλήρωσε εγγύηση για αυτούς.
      </p>
      <div class="bust-meson text-muted">Μέσον σου: <strong class="text-accent">{{ player.meson }}</strong></div>

      <Transition name="fade">
        <div v-if="bustMessage" class="bust-result" :class="bustSuccess ? 'result-success' : 'result-fail'">
          {{ bustMessage }}
        </div>
      </Transition>

      <!-- Dice roll overlay for escape assist -->
      <div v-if="diceTarget" class="dice-overlay card">
        <p class="text-muted" style="font-size:var(--font-size-sm)">
          Βοήθεια απόδρασης για <strong>{{ diceTarget.nickname }}</strong> — χρειάζεσαι <strong>5 ή 6</strong>!
        </p>
        <div class="dice-display" :class="{ rolling: diceRolling }">{{ diceRolling ? '🎲' : diceFace }}</div>
        <button v-if="!diceRolling && diceFace === '🎲'" class="btn btn-primary" @click="rollDice">Ρίξε το Ζάρι!</button>
        <button v-if="!diceRolling && diceFace !== '🎲'" class="btn btn-outline mt-sm" @click="closeDice">Κλείσιμο</button>
      </div>

      <div v-if="loadingJailed" class="text-muted text-center" style="font-size:var(--font-size-sm)">Φόρτωση...</div>

      <div class="jailed-list">
        <!-- Real players from Supabase -->
        <div v-for="p in jailedPlayers" :key="p.id" class="jailed-row">
          <span class="jailed-icon">👤</span>
          <div class="jailed-info">
            <strong>{{ p.nickname }}</strong>
            <span class="text-muted" style="font-size:var(--font-size-xs)">Επ. {{ p.level }} · {{ formatTime(p.remaining) }} απομένουν</span>
          </div>
          <div class="jailed-actions">
            <button
              class="btn btn-sm btn-warning"
              :disabled="player.cash < bailCost(p) || actedIds.includes(p.id)"
              @click="bailOut(p)"
              :title="`Πλήρωσε €${bailCost(p).toLocaleString('el-GR')} εγγύηση`"
            >
              💰 €{{ bailCost(p).toLocaleString('el-GR') }}
            </button>
            <button
              class="btn btn-sm btn-primary"
              :disabled="player.meson < 5 || actedIds.includes(p.id)"
              @click="startEscapeAssist(p)"
              :title="`Ξόδεψε 5 Μέσον, ρίξε ζάρι (5-6 = επιτυχία)`"
            >
              🎲 5 Μέσον
            </button>
          </div>
        </div>

        <!-- Fake users fallback -->
        <div v-for="u in jailedFakeUsers" :key="u.id" class="jailed-row">
          <span class="jailed-icon">{{ u.icon }}</span>
          <div class="jailed-info">
            <strong>{{ u.nickname }}</strong>
            <span class="text-muted" style="font-size:var(--font-size-xs)">Επ. {{ u.level }} · {{ u.location }}</span>
          </div>
          <div class="jailed-actions">
            <button
              class="btn btn-sm btn-primary"
              :disabled="player.meson < 5 || bustedIds.includes(u.id)"
              @click="bustFake(u)"
            >
              {{ bustedIds.includes(u.id) ? '✔ Βγήκε' : '🔓 5 Μέσον' }}
            </button>
          </div>
        </div>

        <div v-if="!loadingJailed && jailedPlayers.length === 0 && jailedFakeUsers.length === 0" class="text-muted text-center" style="font-size:var(--font-size-sm)">
          Κανείς δεν είναι στη φυλακή αυτή τη στιγμή.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'
import { calculateEscapeChance, calculateBribeCost } from '../engine/formulas'
import { ESCAPE_COOLDOWN_MS } from '../data/constants'
import { fakeUsers } from '../data/fakeUsers'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../stores/authStore'

const player = usePlayerStore()
const gameStore = useGameStore()
const auth = useAuthStore()

// ── Own escape ────────────────────────────────────────────────────────────────
const escapeMessage = ref('')
const escapeSuccess = ref(false)
const lastEscapeAttempt = ref(0)

const remaining = computed(() => player.statusTimeRemaining)
const timerProgress = computed(() => {
  if (!player.statusTimerEnd) return 0
  const total = player.statusTimerEnd - (player.statusTimerEnd - remaining.value)
  return remaining.value > 0 ? (remaining.value / Math.max(1, total - Date.now() + remaining.value)) * 100 : 0
})
const canEscape = computed(() => Date.now() - lastEscapeAttempt.value >= ESCAPE_COOLDOWN_MS)
const escapeChance = computed(() => calculateEscapeChance(remaining.value, player.stats.dexterity, player.meson))
const bribeCost = computed(() => calculateBribeCost(remaining.value))

function tryEscape() {
  if (!canEscape.value) return
  lastEscapeAttempt.value = Date.now()
  const success = Math.random() < escapeChance.value
  if (success) {
    player.clearStatus()
    escapeMessage.value = 'Απέδρασες! 🏃♂️'
    escapeSuccess.value = true
    player.logActivity('Απέδρασε από τη φυλακή!', 'success')
    gameStore.addNotification('Απέδρασες από τη φυλακή!', 'success')
    player.addMeson(1)
  } else {
    if (player.statusTimerEnd) player.statusTimerEnd += 60000
    escapeMessage.value = 'Αποτυχημένη απόδραση! +1 λεπτό ποινή.'
    escapeSuccess.value = false
    player.logActivity('Αποτυχημένη απόδραση — +1 λεπτό', 'danger')
    gameStore.addNotification('Αποτυχημένη απόδραση!', 'danger')
  }
  gameStore.saveGame()
  setTimeout(() => { escapeMessage.value = '' }, 3000)
}

function payBribe() {
  const cost = bribeCost.value
  if (player.cash < cost) return
  player.removeCash(cost)
  player.clearStatus()
  player.addFilotimoRaw(-5)
  player.logActivity(`Πλήρωσε φακελάκι €${cost} για αποφυλάκιση`, 'cash')
  gameStore.addNotification(`Φακελάκι €${cost} — Ελεύθερος!`, 'warning')
  gameStore.saveGame()
}

// ── Real jailed players ───────────────────────────────────────────────────────
const jailedPlayers = ref([])
const loadingJailed = ref(false)
const actedIds = ref([])
const bustMessage = ref('')
const bustSuccess = ref(false)

async function loadJailed() {
  if (!auth.user) return
  loadingJailed.value = true
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, name, level, status, status_timer_end')
      .eq('status', 'jail')
      .neq('id', auth.user.id)
      .limit(10)
    jailedPlayers.value = (data || []).map(p => ({
      id: p.id,
      nickname: p.username || p.name || 'Άγνωστος',
      level: p.level ?? 1,
      remaining: p.status_timer_end ? Math.max(0, new Date(p.status_timer_end).getTime() - Date.now()) : 0,
    }))
  } catch (e) {
    console.error(e)
  } finally {
    loadingJailed.value = false
  }
}

// Bail cost = 10% of remaining seconds as euros, min €100
function bailCost(p) {
  return Math.max(100, Math.floor(p.remaining / 1000 * 0.1))
}

async function bailOut(p) {
  const cost = bailCost(p)
  if (player.cash < cost || actedIds.value.includes(p.id)) return
  player.removeCash(cost)
  actedIds.value.push(p.id)
  // Mark player as free in Supabase
  await supabase.from('profiles').update({ status: 'free', status_timer_end: null }).eq('id', p.id)
  bustMessage.value = `Πλήρωσες €${cost.toLocaleString('el-GR')} εγγύηση για τον ${p.nickname}!`
  bustSuccess.value = true
  player.logActivity(`💰 Εγγύηση για ${p.nickname}: -€${cost.toLocaleString('el-GR')}`, 'cash')
  gameStore.addNotification(`${p.nickname} αποφυλακίστηκε με εγγύηση!`, 'success')
  gameStore.saveGame()
  setTimeout(() => { bustMessage.value = '' }, 3000)
}

// ── Escape assist with dice ───────────────────────────────────────────────────
const diceTarget = ref(null)
const diceRolling = ref(false)
const diceFace = ref('🎲')
const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅']

function startEscapeAssist(p) {
  if (player.meson < 5 || actedIds.value.includes(p.id)) return
  player.addMeson(-5)
  diceTarget.value = p
  diceRolling.value = false
  diceFace.value = '🎲'
}

function rollDice() {
  if (!diceTarget.value) return
  diceRolling.value = true
  diceFace.value = '🎲'

  // Animate
  let ticks = 0
  const interval = setInterval(() => {
    diceFace.value = DICE_FACES[Math.floor(Math.random() * 6)]
    ticks++
    if (ticks >= 10) {
      clearInterval(interval)
      const roll = Math.floor(Math.random() * 6) + 1
      diceFace.value = DICE_FACES[roll - 1]
      diceRolling.value = false
      applyEscapeResult(diceTarget.value, roll)
    }
  }, 120)
}

async function applyEscapeResult(p, roll) {
  const success = roll >= 5
  actedIds.value.push(p.id)

  if (success) {
    await supabase.from('profiles').update({ status: 'free', status_timer_end: null }).eq('id', p.id)
    player.addFilotimo(10)
    player.addMeson(1)
    bustMessage.value = `🎲 ${roll} — Επιτυχία! ${p.nickname} απέδρασε! +10 Φιλότιμο`
    bustSuccess.value = true
    player.logActivity(`🎲 Βοήθεια απόδρασης: ${p.nickname} (ζάρι ${roll}) +10 Φιλότιμο`, 'success')
    gameStore.addNotification(`${p.nickname} απέδρασε με τη βοήθειά σου!`, 'success')
  } else {
    bustMessage.value = `🎲 ${roll} — Αποτυχία! Χρειαζόσουν 5 ή 6.`
    bustSuccess.value = false
    gameStore.addNotification(`Αποτυχημένη απόδραση για ${p.nickname} (ζάρι ${roll})`, 'danger')
  }
  gameStore.saveGame()
  setTimeout(() => { bustMessage.value = '' }, 4000)
}

function closeDice() {
  diceTarget.value = null
  diceFace.value = '🎲'
}

// ── Fake users fallback ───────────────────────────────────────────────────────
const bustedIds = ref([])
const jailedFakeUsers = fakeUsers.filter((_, i) => i % 3 === 1).slice(0, 4)

function bustFake(user) {
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

onMounted(loadJailed)

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
.jail-page { display: flex; flex-direction: column; gap: var(--space-md); }
.jail-header { display: flex; align-items: center; gap: var(--space-sm); }
.jail-icon { font-size: 32px; }

.timer-section { text-align: center; margin-bottom: var(--space-lg); }
.timer-label { font-size: var(--font-size-sm); margin-bottom: var(--space-xs); }
.timer-value {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-warning);
  margin-bottom: var(--space-sm);
}
.timer-bar .bar-track { height: 6px; border-radius: var(--border-radius-full); overflow: hidden; }
.timer-bar .bar-fill { height: 100%; border-radius: var(--border-radius-full); transition: width 1s linear; }

.jail-actions { display: flex; flex-direction: column; gap: var(--space-sm); }
.btn-block { width: 100%; }

.result-success { border-left: 3px solid var(--color-success); color: var(--color-success); }
.result-fail    { border-left: 3px solid var(--color-danger);  color: var(--color-danger); }

/* Bust section */
.bust-section { display: flex; flex-direction: column; gap: var(--space-sm); }
.bust-header-row { display: flex; justify-content: space-between; align-items: center; }
.bust-title { font-size: var(--font-size-md); margin: 0; }
.bust-desc  { font-size: var(--font-size-xs); margin: 0; }
.bust-meson { font-size: var(--font-size-sm); }
.bust-result {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
}

.jailed-list { display: flex; flex-direction: column; gap: var(--space-xs); }
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
.jailed-actions { display: flex; gap: var(--space-xs); flex-shrink: 0; }

/* Dice overlay */
.dice-overlay {
  text-align: center;
  padding: var(--space-lg);
  border: 2px solid var(--color-accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}
.dice-display {
  font-size: 72px;
  line-height: 1;
  transition: transform 0.1s;
}
.dice-display.rolling {
  animation: diceShake 0.12s infinite;
}
@keyframes diceShake {
  0%,100% { transform: rotate(0deg) scale(1); }
  25%      { transform: rotate(-15deg) scale(1.1); }
  75%      { transform: rotate(15deg) scale(1.1); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
