<template>
  <div class="keno-game">
    <div class="keno-info">
      <span>Επιλεγμένα: <strong>{{ selected.size }}/10</strong></span>
      <span class="text-muted" style="font-size:var(--font-size-xs)">Διάλεξε 1-10 αριθμούς (1-80)</span>
    </div>

    <!-- Number grid -->
    <div class="keno-grid">
      <div
        v-for="n in 80"
        :key="n"
        class="keno-num"
        :class="{
          'knum-selected': selected.has(n),
          'knum-drawn':    drawn.has(n) && !selected.has(n),
          'knum-match':    drawn.has(n) && selected.has(n),
          'knum-miss':     phase === 'result' && selected.has(n) && !drawn.has(n),
        }"
        @click="toggleNumber(n)"
      >{{ n }}</div>
    </div>

    <!-- Bet + draw -->
    <div class="keno-controls">
      <div class="bet-row">
        <button class="btn btn-sm btn-outline" @click="adjustBet(-10)">-10</button>
        <div class="bet-display">€{{ bet }}</div>
        <button class="btn btn-sm btn-outline" @click="adjustBet(10)">+10</button>
      </div>
      <div class="action-row">
        <button class="btn btn-sm btn-outline" @click="clearSelection">Καθαρισμός</button>
        <button class="btn-draw" @click="draw" :disabled="!canDraw">
          {{ phase === 'drawing' ? 'Κλήρωση...' : '🎯 Κλήρωσε!' }}
        </button>
      </div>
    </div>

    <!-- Result -->
    <div v-if="phase === 'result'" class="keno-result">
      <div class="match-info">
        <span>{{ matchCount }} / {{ selected.size }} επιτυχίες</span>
      </div>
      <div class="result-line" :class="winAmount > 0 ? 'line-win' : 'line-lose'">
        {{ winAmount > 0 ? `+€${winAmount.toLocaleString('el-GR')}` : 'Αποτυχία' }}
      </div>
      <button class="btn btn-sm btn-outline" @click="resetGame">Νέο παιχνίδι</button>
    </div>

    <!-- Payout table -->
    <details class="payout-details">
      <summary class="text-muted">Πίνακας κερδών</summary>
      <div class="keno-payout-grid">
        <div class="kp-header">Αριθ.</div>
        <div class="kp-header">Επιτυχίες → Κέρδος</div>
        <template v-for="(row, picks) in PAYOUT_TABLE" :key="picks">
          <div class="kp-cell">{{ picks }}</div>
          <div class="kp-cell kp-rates">
            <span v-for="(mult, hits) in row" :key="hits" class="kp-rate" :class="mult > 1 ? 'rate-win' : ''">
              {{ hits }}→×{{ mult }}
            </span>
          </div>
        </template>
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useCasinoStore } from '../../stores/casinoStore'

const player = usePlayerStore()
const casino = useCasinoStore()

// Payout table: picks → { hits: multiplier }
const PAYOUT_TABLE = {
  1:  { 1: 3 },
  2:  { 2: 12 },
  3:  { 2: 2,  3: 30 },
  4:  { 2: 1,  3: 5,  4: 80 },
  5:  { 3: 3,  4: 15, 5: 200 },
  6:  { 3: 2,  4: 8,  5: 60,  6: 500 },
  7:  { 4: 5,  5: 25, 6: 150, 7: 2000 },
  8:  { 5: 12, 6: 75, 7: 600, 8: 5000 },
  9:  { 6: 40, 7: 300, 8: 2500, 9: 10000 },
  10: { 6: 20, 7: 150, 8: 1000, 9: 5000, 10: 50000 },
}

const MIN_BET = 10
const MAX_BET = 500

const bet = ref(10)
const selected = ref(new Set())
const drawn = ref(new Set())
const phase = ref('picking')  // picking | drawing | result
const matchCount = ref(0)
const winAmount = ref(0)

const canDraw = computed(() =>
  phase.value === 'picking' && selected.value.size >= 1 && player.cash >= bet.value && !player.isIncapacitated
)

function adjustBet(delta) {
  bet.value = Math.max(MIN_BET, Math.min(MAX_BET, bet.value + delta))
}

function toggleNumber(n) {
  if (phase.value !== 'picking') return
  if (selected.value.has(n)) {
    selected.value = new Set([...selected.value].filter(x => x !== n))
  } else if (selected.value.size < 10) {
    selected.value = new Set([...selected.value, n])
  }
}

function clearSelection() {
  if (phase.value !== 'picking') return
  selected.value = new Set()
}

function draw() {
  if (!canDraw.value) return
  casino.placeBet(bet.value)
  phase.value = 'drawing'
  drawn.value = new Set()

  // Draw 20 unique numbers from 1-80
  const pool = Array.from({ length: 80 }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const drawnNums = pool.slice(0, 20)

  // Animate drawing numbers one by one
  let idx = 0
  const interval = setInterval(() => {
    drawn.value = new Set([...drawn.value, drawnNums[idx]])
    idx++
    if (idx >= 20) {
      clearInterval(interval)
      // Calculate result
      const picks = selected.value.size
      const matches = drawnNums.filter(n => selected.value.has(n)).length
      matchCount.value = matches

      const payoutRow = PAYOUT_TABLE[picks] || {}
      const mult = payoutRow[matches] ?? 0
      winAmount.value = mult > 0 ? bet.value * mult : 0

      casino.recordResult(bet.value, winAmount.value)
      phase.value = 'result'
    }
  }, 80)
}

function resetGame() {
  phase.value = 'picking'
  selected.value = new Set()
  drawn.value = new Set()
  matchCount.value = 0
  winAmount.value = 0
}
</script>

<style scoped>
.keno-game { display: flex; flex-direction: column; gap: var(--space-md); }

.keno-info {
  display: flex; align-items: center; justify-content: space-between;
  font-size: var(--font-size-sm);
}

.keno-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 3px;
}

.keno-num {
  aspect-ratio: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px;
  font-family: var(--font-family-mono);
  font-weight: var(--font-weight-bold);
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface-raised);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.keno-num:hover:not(.knum-selected) { border-color: var(--color-accent); }

.knum-selected { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.knum-drawn    { background: rgba(100,100,100,0.4); color: var(--text-secondary); }
.knum-match    { background: var(--color-success); color: #fff; border-color: var(--color-success);
                 animation: matchPop 0.4s ease; }
.knum-miss     { background: rgba(231,76,60,0.2); border-color: rgba(231,76,60,0.5); }

@keyframes matchPop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.keno-controls { display: flex; flex-direction: column; gap: var(--space-sm); }
.bet-row       { display: flex; align-items: center; gap: var(--space-xs); justify-content: center; }
.bet-display   { min-width: 56px; text-align: center; font-family: var(--font-family-mono); font-weight: var(--font-weight-bold); }
.action-row    { display: flex; gap: var(--space-sm); }

.btn-draw {
  flex: 1;
  padding: var(--space-sm);
  background: var(--color-accent);
  color: #fff;
  border: none; border-radius: var(--border-radius-md);
  font-size: var(--font-size-md); font-weight: var(--font-weight-bold);
  cursor: pointer; transition: all var(--transition-fast);
}
.btn-draw:hover:not(:disabled) { opacity: 0.9; }
.btn-draw:disabled { opacity: 0.4; cursor: not-allowed; }

.keno-result {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm); padding: var(--space-md);
  background: var(--bg-surface-raised); border-radius: var(--border-radius-md);
}
.match-info { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); }
.result-line {
  font-size: var(--font-size-xl); font-weight: var(--font-weight-bold);
  padding: var(--space-xs) var(--space-lg);
  border-radius: var(--border-radius-md);
}
.line-win  { background: rgba(46,204,113,0.15); color: var(--color-success); }
.line-lose { background: rgba(231,76,60,0.12);  color: var(--color-danger); }

/* Payout table */
.payout-details summary { cursor: pointer; font-size: var(--font-size-sm); text-align: center; list-style: none; }
.keno-payout-grid {
  display: grid; grid-template-columns: auto 1fr;
  gap: 3px; margin-top: var(--space-sm);
}
.kp-header { font-weight: var(--font-weight-bold); font-size: var(--font-size-xs); color: var(--text-secondary); padding: 2px 4px; }
.kp-cell   { font-size: var(--font-size-xs); padding: 2px 4px; }
.kp-rates  { display: flex; flex-wrap: wrap; gap: 4px; }
.kp-rate   { padding: 1px 6px; border-radius: var(--border-radius-full); background: var(--bg-surface-raised); }
.rate-win  { background: rgba(46,204,113,0.15); color: var(--color-success); }
</style>
