<template>
  <div class="slots-game">
    <!-- Reels -->
    <div class="reels-wrap">
      <div class="payline-line" />
      <div class="reels">
        <div v-for="(reel, ri) in displayReels" :key="ri" class="reel">
          <div
            v-for="(sym, si) in reel"
            :key="si"
            class="reel-sym"
            :class="{
              'sym-payline': si === 1,
              'sym-spinning': reelSpinning[ri],
              'sym-win': !reelSpinning[ri] && result?.win && si === 1,
            }"
          >{{ sym.icon }}</div>
        </div>
      </div>
    </div>

    <!-- Result banner -->
    <div v-if="result && !isAnimating" class="result-banner" :class="result.win ? 'banner-win' : 'banner-lose'">
      {{ result.win ? `+€${result.winAmount.toLocaleString('el-GR')} (×${result.symbol.mult})` : 'Αποτυχία...' }}
    </div>
    <div v-else-if="isAnimating" class="result-banner banner-spin">Στρίβει...</div>
    <div v-else class="result-banner banner-idle">Πάτα Στρίψε για να παίξεις!</div>

    <!-- Bet controls -->
    <div class="bet-row">
      <button class="btn btn-sm btn-outline" @click="adjustBet(-50)" :disabled="isAnimating">-50</button>
      <button class="btn btn-sm btn-outline" @click="adjustBet(-10)" :disabled="isAnimating">-10</button>
      <div class="bet-display">€{{ bet }}</div>
      <button class="btn btn-sm btn-outline" @click="adjustBet(10)" :disabled="isAnimating">+10</button>
      <button class="btn btn-sm btn-outline" @click="adjustBet(50)" :disabled="isAnimating">+50</button>
    </div>

    <button class="btn-spin" @click="spin" :disabled="!canSpin">
      {{ isAnimating ? '⏳' : '🎰 Στρίψε!' }}
    </button>

    <!-- Payout table -->
    <details class="payout-details">
      <summary class="text-muted">Πίνακας κερδών</summary>
      <div class="payout-table">
        <div v-for="sym in SYMBOLS" :key="sym.id" class="payout-row">
          <span>{{ sym.icon }}{{ sym.icon }}{{ sym.icon }}</span>
          <span class="text-mono text-accent">×{{ sym.mult }}</span>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useCasinoStore } from '../../stores/casinoStore'

const player = usePlayerStore()
const casino = useCasinoStore()

const SYMBOLS = [
  { id: 'cherry',  icon: '🍒', mult: 5,   weight: 35 },
  { id: 'lemon',   icon: '🍋', mult: 8,   weight: 25 },
  { id: 'orange',  icon: '🍊', mult: 12,  weight: 18 },
  { id: 'grape',   icon: '🍇', mult: 20,  weight: 10 },
  { id: 'bell',    icon: '🔔', mult: 40,  weight: 6  },
  { id: 'star',    icon: '⭐', mult: 80,  weight: 3  },
  { id: 'diamond', icon: '💎', mult: 200, weight: 2  },
  { id: 'seven',   icon: '7️⃣', mult: 777, weight: 1  },
]
const TOTAL_WEIGHT = SYMBOLS.reduce((s, sym) => s + sym.weight, 0)

function pickSymbol() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const sym of SYMBOLS) {
    r -= sym.weight
    if (r <= 0) return sym
  }
  return SYMBOLS[0]
}

const MIN_BET = 10
const MAX_BET = 1000

const bet = ref(10)
const isAnimating = ref(false)
const reelSpinning = ref([false, false, false])
const displayReels = ref([
  [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
  [SYMBOLS[2], SYMBOLS[0], SYMBOLS[1]],
  [SYMBOLS[1], SYMBOLS[2], SYMBOLS[0]],
])
const result = ref(null)

let spinInterval = null
let timeouts = []

const canSpin = computed(() =>
  !isAnimating.value && !player.isIncapacitated && player.cash >= bet.value
)

function adjustBet(delta) {
  bet.value = Math.max(MIN_BET, Math.min(MAX_BET, bet.value + delta))
}

function spin() {
  if (!canSpin.value) return

  casino.placeBet(bet.value)
  result.value = null
  isAnimating.value = true
  reelSpinning.value = [true, true, true]

  // Pre-determine result
  const midSymbols = [pickSymbol(), pickSymbol(), pickSymbol()]
  const win = midSymbols[0].id === midSymbols[1].id && midSymbols[1].id === midSymbols[2].id
  const winAmount = win ? bet.value * midSymbols[0].mult : 0
  const finalReels = midSymbols.map(mid => [pickSymbol(), mid, pickSymbol()])

  // Animate spinning
  spinInterval = setInterval(() => {
    for (let ri = 0; ri < 3; ri++) {
      if (reelSpinning.value[ri]) {
        displayReels.value[ri] = [pickSymbol(), pickSymbol(), pickSymbol()]
      }
    }
  }, 80)

  function stopReel(ri, delay) {
    const t = setTimeout(() => {
      reelSpinning.value[ri] = false
      displayReels.value[ri] = finalReels[ri]
    }, delay)
    timeouts.push(t)
  }

  stopReel(0, 900)
  stopReel(1, 1400)
  const t = setTimeout(() => {
    reelSpinning.value[2] = false
    displayReels.value[2] = finalReels[2]
    clearInterval(spinInterval)
    spinInterval = null
    isAnimating.value = false
    result.value = { win, winAmount, symbol: midSymbols[0] }
    casino.recordResult(bet.value, winAmount)
  }, 1900)
  timeouts.push(t)
}

onBeforeUnmount(() => {
  if (spinInterval) clearInterval(spinInterval)
  timeouts.forEach(clearTimeout)
})
</script>

<style scoped>
.slots-game {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.reels-wrap {
  position: relative;
  background: #0d0d1a;
  border: 2px solid #3a3a5a;
  border-radius: var(--border-radius-lg);
  padding: var(--space-sm);
}

.payline-line {
  position: absolute;
  left: 0; right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 2px;
  background: rgba(255, 200, 0, 0.4);
  pointer-events: none;
}

.reels {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}

.reel {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reel-sym {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  border-radius: var(--border-radius-md);
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  transition: all 0.2s;
}

.reel-sym.sym-payline {
  background: #1e1e38;
  border-color: rgba(255, 200, 0, 0.3);
}

.reel-sym.sym-spinning {
  animation: symFlash 0.08s infinite;
}

.reel-sym.sym-win {
  background: rgba(255, 200, 0, 0.2);
  border-color: gold;
  box-shadow: 0 0 16px rgba(255, 200, 0, 0.6);
  animation: winPulse 0.6s ease;
}

@keyframes symFlash {
  0%   { opacity: 0.8; transform: scaleY(0.95); }
  50%  { opacity: 1;   transform: scaleY(1.05); }
  100% { opacity: 0.8; transform: scaleY(0.95); }
}

@keyframes winPulse {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.2); }
  70%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.result-banner {
  text-align: center;
  padding: var(--space-sm);
  border-radius: var(--border-radius-md);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
}
.banner-win  { background: rgba(46,204,113,0.15); color: var(--color-success); }
.banner-lose { background: rgba(231,76,60,0.12);  color: var(--color-danger);  }
.banner-spin { background: rgba(255,200,0,0.1);   color: gold; }
.banner-idle { background: var(--bg-surface-raised); color: var(--text-secondary); font-size: var(--font-size-sm); }

.bet-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  justify-content: center;
}

.bet-display {
  min-width: 64px;
  text-align: center;
  font-family: var(--font-family-mono);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
}

.btn-spin {
  width: 100%;
  padding: var(--space-sm);
  background: linear-gradient(135deg, #b8860b, #ffd700, #b8860b);
  color: #1a1a00;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 4px 12px rgba(255,200,0,0.3);
}
.btn-spin:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 4px 20px rgba(255,200,0,0.5); }
.btn-spin:disabled { opacity: 0.4; cursor: not-allowed; }

.payout-details summary {
  cursor: pointer;
  font-size: var(--font-size-sm);
  text-align: center;
  list-style: none;
}
.payout-table {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  margin-top: var(--space-sm);
}
.payout-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px var(--space-xs);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
}
</style>
