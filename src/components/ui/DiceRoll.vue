<template>
  <transition name="fade">
    <div class="dice-overlay" v-if="visible">
      <div class="dice-container">
        <!-- Header -->
        <div class="dice-header">
          <span class="dice-header-icon">{{ result?.icon || '🎲' }}</span>
          <span class="dice-header-label">{{ result?.label }}</span>
        </div>

        <!-- Check mode: pip scale with target -->
        <template v-if="mode === 'check'">
          <div class="dice-target">
            Χρειάζεσαι <strong class="text-accent">{{ result?.targetRoll }}+</strong> για επιτυχία
          </div>
          <div class="pip-scale">
            <div
              v-for="n in 6"
              :key="n"
              class="pip-box"
              :class="{
                'pip-win': n >= (result?.targetRoll ?? 7),
                'pip-lose': n < (result?.targetRoll ?? 7),
                'pip-landed': phase === 'result' && n === result?.roll,
              }"
            >{{ n }}</div>
          </div>
        </template>

        <!-- Multiplier mode: multiplier reference table -->
        <template v-else>
          <div class="dice-target">Ρίξε το ζάρι — καλύτερη ρίψη, μεγαλύτερο κέρδος!</div>
          <div class="mult-table">
            <div
              v-for="[face, mult] in Object.entries(GYM_MULTIPLIERS)"
              :key="face"
              class="mult-cell"
              :class="{
                'mult-landed': phase === 'result' && Number(face) === result?.roll,
                'mult-low': mult < 1,
                'mult-high': mult >= 1.5,
              }"
            >
              <span class="mult-face">{{ face }}</span>
              <span class="mult-val">x{{ mult }}</span>
            </div>
          </div>
        </template>

        <!-- 3D Die -->
        <div class="die-scene">
          <div
            class="die"
            :class="{
              'die-rolling': phase === 'rolling',
              'die-success': phase === 'result' && (mode === 'multiplier' || result?.success),
              'die-fail': phase === 'result' && mode === 'check' && !result?.success,
            }"
          >
            <div
              v-for="(dot, i) in DOT_POSITIONS[displayFace]"
              :key="i"
              class="dot"
              :style="{ left: dot[0] + '%', top: dot[1] + '%' }"
            />
          </div>
        </div>

        <!-- Stop button -->
        <div v-if="phase === 'rolling'" class="stop-area">
          <button class="btn-stop" @click="stopDie">
            <span class="stop-icon">✋</span>
            <span>Σταμάτα!</span>
          </button>
          <p class="stop-hint">Πάτα για να σταματήσεις το ζάρι</p>
        </div>

        <!-- Result -->
        <transition name="slide-up">
          <div v-if="phase === 'result'" class="dice-result">
            <!-- Check mode: success/fail -->
            <template v-if="mode === 'check'">
              <div class="result-badge" :class="result?.success ? 'badge-success' : 'badge-danger'">
                {{ result?.success ? 'Επιτυχία!' : 'Αποτυχία!' }}
              </div>
            </template>
            <!-- Multiplier mode: show the multiplier -->
            <template v-else>
              <div class="result-badge" :class="result?.multiplier >= 1 ? 'badge-success' : 'badge-warning'">
                x{{ result?.multiplier }} — {{ multLabel }}
              </div>
            </template>

            <div v-if="rewardLines.length" class="dice-rewards">
              <div v-for="(reward, i) in rewardLines" :key="i" class="reward-line">
                <span class="reward-icon">{{ reward.icon }}</span>
                <span>{{ reward.text }}</span>
              </div>
            </div>

            <div v-if="result?.consequence && (mode !== 'check' || !result?.success)" class="dice-consequence">
              {{ result.consequence }}
            </div>

            <button class="btn btn-primary mt-sm" @click="dismiss">Συνέχεια</button>
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'

// Dot positions [x%, y%] from top-left for each die face (1-6)
const DOT_POSITIONS = {
  1: [[50, 50]],
  2: [[30, 28], [70, 72]],
  3: [[30, 28], [50, 50], [70, 72]],
  4: [[30, 28], [70, 28], [30, 72], [70, 72]],
  5: [[30, 28], [70, 28], [50, 50], [30, 72], [70, 72]],
  6: [[30, 24], [70, 24], [30, 50], [70, 50], [30, 76], [70, 76]],
}

const GYM_MULTIPLIERS = { 1: 0.5, 2: 0.8, 3: 1.0, 4: 1.3, 5: 1.5, 6: 2.0 }

const MULT_LABELS = {
  0.5: 'Άσχημα...',
  0.8: 'Όχι και τόσο καλά',
  1.0: 'Κανονικά',
  1.3: 'Καλή προπόνηση!',
  1.5: 'Πολύ καλά!',
  2.0: 'Τέλεια προπόνηση!',
}

const props = defineProps({
  result: { type: Object, default: null },
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['dismiss'])

// mode derived from result prop
const mode = computed(() => props.result?.mode === 'multiplier' ? 'multiplier' : 'check')

const phase = ref('idle')   // 'idle' | 'rolling' | 'result'
const displayFace = ref(1)
let spinInterval = null

const multLabel = computed(() => MULT_LABELS[props.result?.multiplier] ?? '')

const rewardLines = computed(() => {
  if (!props.result?.rewards) return []
  const r = props.result.rewards
  const lines = []
  if (r.cash)     lines.push({ icon: '💰', text: `+€${r.cash.toLocaleString('el-GR')}` })
  if (r.xp)      lines.push({ icon: '⭐', text: `+${r.xp} XP` })
  if (r.crimeXP)  lines.push({ icon: '🎭', text: `+${r.crimeXP} Crime XP` })
  if (r.statGain) lines.push({ icon: '💪', text: `+${r.statGain.toFixed(2)} ${r.statName || ''}` })
  if (r.filotimo) lines.push({ icon: '⚖️', text: `${r.filotimo > 0 ? '+' : ''}${r.filotimo} Φιλότιμο` })
  if (r.items?.length) {
    for (const item of r.items) lines.push({ icon: '📦', text: item })
  }
  return lines
})

watch(() => props.visible, (val) => {
  if (val && props.result) {
    startRolling()
  } else {
    cleanup()
    phase.value = 'idle'
  }
}, { immediate: true })

function startRolling() {
  phase.value = 'rolling'
  displayFace.value = Math.floor(Math.random() * 6) + 1
  spinInterval = setInterval(() => {
    displayFace.value = Math.floor(Math.random() * 6) + 1
  }, 80)
}

function stopDie() {
  cleanup()
  displayFace.value = props.result.roll
  phase.value = 'result'
}

function dismiss() {
  cleanup()
  phase.value = 'idle'
  emit('dismiss')
}

function cleanup() {
  if (spinInterval) {
    clearInterval(spinInterval)
    spinInterval = null
  }
}

onBeforeUnmount(cleanup)
</script>

<style scoped>
/* Scrollable overlay so the Continue button is never cut off on small screens */
.dice-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  z-index: 1000;
  padding: var(--space-md);
  /* Push content to center vertically when there's room */
  padding-top: max(env(safe-area-inset-top, 0px), var(--space-lg));
  padding-bottom: max(env(safe-area-inset-bottom, 0px), var(--space-lg));
}

.dice-container {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--space-lg);
  max-width: 340px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  margin: auto; /* centers vertically when overlay has extra space */
}

.dice-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.dice-target {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* Pip scale (check mode) */
.pip-scale {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.pip-box {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family-mono);
  border-radius: var(--border-radius-sm);
  transition: all 0.3s;
}

.pip-box.pip-lose {
  background: rgba(231, 76, 60, 0.2);
  color: var(--color-danger);
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.pip-box.pip-win {
  background: rgba(46, 204, 113, 0.2);
  color: var(--color-success);
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.pip-box.pip-landed {
  outline: 2px solid var(--text-primary);
  transform: scale(1.2);
}

/* Multiplier table (gym mode) */
.mult-table {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  width: 100%;
}

.mult-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-xs);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-surface-raised);
  transition: all 0.3s;
}

.mult-cell.mult-low {
  color: var(--color-danger);
  border-color: rgba(231, 76, 60, 0.3);
}

.mult-cell.mult-high {
  color: var(--color-success);
  border-color: rgba(46, 204, 113, 0.3);
}

.mult-cell.mult-landed {
  outline: 2px solid var(--text-primary);
  transform: scale(1.1);
  background: var(--bg-base);
}

.mult-face {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family-mono);
}

.mult-val {
  font-size: var(--font-size-xs);
  font-family: var(--font-family-mono);
}

/* Die */
.die-scene {
  perspective: 500px;
}

.die {
  width: 120px;
  height: 120px;
  position: relative;
  background: #1c1c2e;
  border: 3px solid #4a4a6a;
  border-radius: 20px;
  box-shadow:
    inset 0 2px 6px rgba(255,255,255,0.08),
    4px 6px 0 #0d0d1a,
    0 12px 24px rgba(0,0,0,0.6);
  transition: border-color 0.4s, box-shadow 0.4s;
  margin: 0 auto;
}

.die.die-rolling {
  animation: dieWobble 0.25s infinite;
  border-color: #5a5a8a;
}

.die.die-success {
  border-color: var(--color-success);
  box-shadow:
    4px 6px 0 #0d0d1a,
    0 0 30px rgba(46, 204, 113, 0.5);
  animation: successPop 0.5s ease;
}

.die.die-fail {
  border-color: var(--color-danger);
  box-shadow:
    4px 6px 0 #0d0d1a,
    0 0 30px rgba(231, 76, 60, 0.5);
  animation: failShake 0.5s ease;
}

.dot {
  position: absolute;
  width: 18px;
  height: 18px;
  background: #e8e8ff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

/* Stop button */
.stop-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.btn-stop {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-xl);
  background: var(--color-danger);
  color: #fff;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
  animation: stopPulse 1s infinite;
}

.btn-stop:hover {
  background: #c0392b;
  transform: scale(1.05);
}

.btn-stop:active {
  transform: scale(0.97);
}

.stop-icon {
  font-size: 1.4em;
}

.stop-hint {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin: 0;
}

/* Result section */
.dice-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
}

.result-badge {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  padding: var(--space-xs) var(--space-lg);
  border-radius: var(--border-radius-md);
}

.badge-success {
  background: rgba(46, 204, 113, 0.15);
  color: var(--color-success);
}

.badge-danger {
  background: rgba(231, 76, 60, 0.15);
  color: var(--color-danger);
}

.badge-warning {
  background: rgba(243, 156, 18, 0.15);
  color: var(--color-warning);
}

.dice-rewards {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
}

.reward-line {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-sm);
  padding: var(--space-xs);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-sm);
}

.reward-icon {
  flex-shrink: 0;
}

.dice-consequence {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  padding: var(--space-xs) var(--space-sm);
  background: rgba(231, 76, 60, 0.1);
  border-radius: var(--border-radius-sm);
  width: 100%;
}

/* Animations */
@keyframes dieWobble {
  0%   { transform: rotate(-6deg) scale(1.03); }
  25%  { transform: rotate(5deg)  scale(0.98); }
  50%  { transform: rotate(-4deg) scale(1.02); }
  75%  { transform: rotate(6deg)  scale(0.97); }
  100% { transform: rotate(-6deg) scale(1.03); }
}

@keyframes stopPulse {
  0%, 100% { box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4); }
  50%       { box-shadow: 0 4px 20px rgba(231, 76, 60, 0.7); }
}

@keyframes successPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.18); }
  70%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}

@keyframes failShake {
  0%, 100% { transform: translateX(0); }
  20%  { transform: translateX(-10px); }
  40%  { transform: translateX(10px); }
  60%  { transform: translateX(-7px); }
  80%  { transform: translateX(7px); }
}

/* Transitions */
.fade-enter-active { transition: opacity 0.2s; }
.fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active { transition: all 0.35s ease; }
.slide-up-enter-from   { opacity: 0; transform: translateY(14px); }
</style>
