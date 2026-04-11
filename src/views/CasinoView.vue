<template>
  <div class="casino-page">
    <h2 class="page-title">🎲 Τυχερά Παιχνίδια</h2>

    <!-- Stats bar -->
    <div class="card stats-row">
      <div class="stat-pair">
        <span class="text-muted">Παιχνίδια</span>
        <span class="text-mono">{{ casinoStore.stats.gamesPlayed }}</span>
      </div>
      <div class="stat-pair">
        <span class="text-muted">Κέρδη/Ζημίες</span>
        <span class="text-mono" :class="casinoStore.netProfit >= 0 ? 'text-success' : 'text-danger'">
          {{ casinoStore.netProfit >= 0 ? '+' : '' }}€{{ casinoStore.netProfit.toLocaleString('el-GR') }}
        </span>
      </div>
      <div class="stat-pair">
        <span class="text-muted">Χρήματα</span>
        <span class="text-mono text-accent">€{{ player.cash.toLocaleString('el-GR') }}</span>
      </div>
    </div>

    <!-- Game selector tabs -->
    <div class="game-tabs">
      <button
        v-for="game in games"
        :key="game.id"
        class="game-tab"
        :class="{ active: activeGame === game.id }"
        @click="activeGame = game.id"
      >
        <span class="tab-icon">{{ game.icon }}</span>
        <span class="tab-label">{{ game.label }}</span>
      </button>
    </div>

    <!-- Active game -->
    <div class="game-area card">
      <div class="game-title">
        <span>{{ currentGame.icon }} {{ currentGame.label }}</span>
        <span class="text-muted" style="font-size:var(--font-size-xs)">{{ currentGame.description }}</span>
      </div>

      <SlotsGame     v-if="activeGame === 'slots'"     />
      <BlackjackGame v-else-if="activeGame === 'blackjack'" />
      <KenoGame      v-else-if="activeGame === 'keno'" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useCasinoStore } from '../stores/casinoStore'
import SlotsGame from '../components/casino/SlotsGame.vue'
import BlackjackGame from '../components/casino/BlackjackGame.vue'
import KenoGame from '../components/casino/KenoGame.vue'

const player = usePlayerStore()
const casinoStore = useCasinoStore()

const games = [
  { id: 'slots',     icon: '🎰', label: 'Φρουτάκια', description: '3 τροχοί — ταιριάξτε 3 ίδια σύμβολα στη μεσαία γραμμή' },
  { id: 'blackjack', icon: '🃏', label: 'Black Jack', description: 'Φτάστε στο 21 χωρίς να ξεπεράσετε — κερδίστε τον dealer' },
  { id: 'keno',      icon: '🎯', label: 'Κίνο',       description: 'Διαλέξτε 1-10 αριθμούς και κερδίστε όσο περισσότεροι βγουν' },
]

const activeGame = ref('slots')
const currentGame = computed(() => games.find(g => g.id === activeGame.value))
</script>

<style scoped>
.casino-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); }

.stats-row {
  display: flex;
  justify-content: space-around;
}

.stat-pair {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-sm);
}

/* Game tabs */
.game-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
}

.game-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm) var(--space-xs);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
}

.game-tab:hover { background: var(--bg-surface-raised); }

.game-tab.active {
  border-color: var(--color-accent);
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

.tab-icon { font-size: 22px; }
.tab-label { font-size: 10px; font-weight: var(--font-weight-medium); white-space: nowrap; }

/* Game area */
.game-area { display: flex; flex-direction: column; gap: var(--space-md); }

.game-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border-color);
}
</style>
