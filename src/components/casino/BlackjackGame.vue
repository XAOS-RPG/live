<template>
  <div class="bj-game">
    <!-- Betting phase -->
    <div v-if="phase === 'betting'" class="betting-phase">
      <p class="text-muted">Βάλε το στοίχημά σου και μοίρασε.</p>
      <div class="bet-row">
        <button class="btn btn-sm btn-outline" @click="adjustBet(-50)">-50</button>
        <button class="btn btn-sm btn-outline" @click="adjustBet(-10)">-10</button>
        <div class="bet-display">€{{ bet }}</div>
        <button class="btn btn-sm btn-outline" @click="adjustBet(10)">+10</button>
        <button class="btn btn-sm btn-outline" @click="adjustBet(50)">+50</button>
      </div>
      <button class="btn btn-primary btn-block" @click="deal" :disabled="!canDeal">
        🃏 Μοίρασε!
      </button>
    </div>

    <!-- Playing phase -->
    <div v-else class="play-phase">
      <!-- Dealer hand -->
      <div class="hand-section">
        <div class="hand-label">Dealer
          <span class="hand-total">{{ phase === 'dealer_turn' || phase === 'result' ? dealerTotal : '?' }}</span>
        </div>
        <div class="cards-row">
          <div v-for="(card, i) in dealerHand" :key="i" class="card-tile"
               :class="{ 'card-hidden': i === 1 && phase === 'player_turn', [`suit-${card.suit}`]: true }">
            <span v-if="i === 1 && phase === 'player_turn'" class="card-back">🂠</span>
            <template v-else>
              <span class="card-rank">{{ card.rank }}</span>
              <span class="card-suit">{{ card.suitIcon }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Player hand -->
      <div class="hand-section">
        <div class="hand-label">Εσύ
          <span class="hand-total" :class="{ 'total-bust': playerTotal > 21 }">{{ playerTotal }}</span>
        </div>
        <div class="cards-row">
          <div v-for="(card, i) in playerHand" :key="i" class="card-tile" :class="`suit-${card.suit}`">
            <span class="card-rank">{{ card.rank }}</span>
            <span class="card-suit">{{ card.suitIcon }}</span>
          </div>
        </div>
      </div>

      <!-- Result -->
      <div v-if="phase === 'result'" class="bj-result" :class="outcomeClass">
        <strong>{{ outcomeText }}</strong>
        <span class="outcome-cash">{{ outcomeCash }}</span>
      </div>

      <!-- Actions -->
      <div v-if="phase === 'player_turn'" class="action-buttons">
        <button class="btn btn-outline" @click="hit">Χτύπα</button>
        <button class="btn btn-outline" @click="stand">Σταμάτα</button>
        <button v-if="playerHand.length === 2" class="btn btn-outline" @click="doubleDown"
                :disabled="player.cash < bet">Διπλό</button>
      </div>

      <button v-if="phase === 'result'" class="btn btn-primary btn-block" @click="resetGame">
        Νέο Παιχνίδι
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useCasinoStore } from '../../stores/casinoStore'

const player = usePlayerStore()
const casino = useCasinoStore()

const SUITS = [
  { id: 'spades',   icon: '♠' },
  { id: 'hearts',   icon: '♥' },
  { id: 'diamonds', icon: '♦' },
  { id: 'clubs',    icon: '♣' },
]
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']

function cardValue(rank) {
  if (['J','Q','K'].includes(rank)) return 10
  if (rank === 'A') return 11
  return parseInt(rank)
}

function handTotal(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c.rank), 0)
  let aces = hand.filter(c => c.rank === 'A').length
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

function makeCard(rank, suit) {
  return { rank, suit: suit.id, suitIcon: suit.icon }
}

let deck = []

function buildDeck() {
  deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(rank, suit))
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
}

function drawCard() {
  if (deck.length < 10) buildDeck()
  return deck.pop()
}

const MIN_BET = 10
const MAX_BET = 2000

const bet = ref(20)
const phase = ref('betting')  // betting | player_turn | dealer_turn | result
const playerHand = ref([])
const dealerHand = ref([])
const outcome = ref(null) // 'win' | 'lose' | 'push' | 'blackjack'
const winAmount = ref(0)

const playerTotal = computed(() => handTotal(playerHand.value))
const dealerTotal = computed(() => handTotal(dealerHand.value))

const outcomeClass = computed(() => ({
  'outcome-win': outcome.value === 'win' || outcome.value === 'blackjack',
  'outcome-push': outcome.value === 'push',
  'outcome-lose': outcome.value === 'lose',
}))
const outcomeText = computed(() => ({
  win: 'Κέρδισες!', blackjack: 'BLACKJACK! 🎉', push: 'Ισοπαλία', lose: 'Έχασες',
}[outcome.value] || ''))

const outcomeCash = computed(() => {
  if (outcome.value === 'win') return `+€${winAmount.value}`
  if (outcome.value === 'blackjack') return `+€${winAmount.value}`
  if (outcome.value === 'push') return `±€0`
  return `-€${bet.value}`
})

const canDeal = computed(() => player.cash >= bet.value && !player.isIncapacitated)

function adjustBet(delta) {
  bet.value = Math.max(MIN_BET, Math.min(MAX_BET, bet.value + delta))
}

function deal() {
  if (!canDeal.value) return
  casino.placeBet(bet.value)
  buildDeck()
  playerHand.value = [drawCard(), drawCard()]
  dealerHand.value = [drawCard(), drawCard()]
  outcome.value = null
  winAmount.value = 0

  // Check for natural blackjack
  if (playerTotal.value === 21) {
    if (dealerTotal.value === 21) {
      endGame('push')
    } else {
      endGame('blackjack')
    }
  } else {
    phase.value = 'player_turn'
  }
}

function hit() {
  playerHand.value.push(drawCard())
  if (playerTotal.value > 21) {
    endGame('lose')
  }
}

function stand() {
  runDealer()
}

function doubleDown() {
  if (player.cash < bet.value) return
  casino.placeBet(bet.value)
  bet.value = bet.value * 2
  playerHand.value.push(drawCard())
  if (playerTotal.value > 21) {
    endGame('lose')
  } else {
    runDealer()
  }
}

function runDealer() {
  phase.value = 'dealer_turn'
  // Dealer hits until 17+
  while (dealerTotal.value < 17) {
    dealerHand.value.push(drawCard())
  }
  const pt = playerTotal.value
  const dt = dealerTotal.value
  if (dt > 21 || pt > dt) endGame('win')
  else if (pt === dt) endGame('push')
  else endGame('lose')
}

function endGame(result) {
  outcome.value = result
  phase.value = 'result'

  if (result === 'win') {
    winAmount.value = bet.value * 2
    casino.recordResult(bet.value, winAmount.value)
  } else if (result === 'blackjack') {
    winAmount.value = Math.floor(bet.value * 2.5)
    casino.recordResult(bet.value, winAmount.value)
  } else if (result === 'push') {
    // Return stake
    player.addCash(bet.value)
    casino.recordResult(0, 0)
  } else {
    casino.recordResult(bet.value, 0)
  }
}

function resetGame() {
  phase.value = 'betting'
  playerHand.value = []
  dealerHand.value = []
  outcome.value = null
  winAmount.value = 0
  bet.value = Math.min(bet.value, player.cash) || MIN_BET
}
</script>

<style scoped>
.bj-game { display: flex; flex-direction: column; gap: var(--space-md); }

.bet-row {
  display: flex; align-items: center; gap: var(--space-xs);
  justify-content: center; margin-bottom: var(--space-sm);
}
.bet-display {
  min-width: 64px; text-align: center;
  font-family: var(--font-family-mono); font-weight: var(--font-weight-bold); font-size: var(--font-size-lg);
}

.play-phase { display: flex; flex-direction: column; gap: var(--space-md); }

.hand-section { display: flex; flex-direction: column; gap: var(--space-sm); }

.hand-label {
  display: flex; align-items: center; gap: var(--space-sm);
  font-size: var(--font-size-sm); color: var(--text-secondary); font-weight: var(--font-weight-bold);
}
.hand-total {
  background: var(--bg-surface-raised); border-radius: var(--border-radius-sm);
  padding: 1px 8px; font-family: var(--font-family-mono); color: var(--text-primary);
}
.total-bust { color: var(--color-danger); }

.cards-row { display: flex; flex-wrap: wrap; gap: var(--space-sm); }

.card-tile {
  width: 56px; height: 80px;
  border-radius: var(--border-radius-md);
  border: 2px solid var(--border-color);
  background: #fff;
  display: flex; flex-direction: column; align-items: flex-start;
  justify-content: flex-start;
  padding: 4px;
  position: relative;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.card-rank { font-size: 1.1rem; font-weight: bold; line-height: 1; }
.card-suit { font-size: 1.4rem; position: absolute; bottom: 4px; right: 4px; }
.card-back { font-size: 2.5rem; }

.suit-spades   .card-rank, .suit-spades   .card-suit { color: #111; }
.suit-clubs    .card-rank, .suit-clubs    .card-suit { color: #111; }
.suit-hearts   .card-rank, .suit-hearts   .card-suit { color: #c0392b; }
.suit-diamonds .card-rank, .suit-diamonds .card-suit { color: #c0392b; }

.card-hidden { background: #1a3a6a; border-color: #2a5aaa; }

.bj-result {
  text-align: center;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  display: flex; flex-direction: column; gap: 4px;
  font-size: var(--font-size-xl); font-weight: var(--font-weight-bold);
}
.outcome-win  { background: rgba(46,204,113,0.15); color: var(--color-success); }
.outcome-lose { background: rgba(231,76,60,0.15);  color: var(--color-danger); }
.outcome-push { background: var(--bg-surface-raised); color: var(--text-secondary); }

.outcome-cash { font-size: var(--font-size-md); }

.action-buttons { display: flex; gap: var(--space-sm); }
.action-buttons .btn { flex: 1; }
</style>
