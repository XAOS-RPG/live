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

        <div class="player-cash">
          <span class="cash-icon">€</span>
          <span class="cash-amount">{{ formatCash(player.cash) }}</span>
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
          :max="player.effectiveNerveMax"
          color="var(--color-nerve)"
          bg-color="var(--color-nerve-bg)"
          icon="🎭"
        />
        <ResourceBar
          label="Κέφι"
          :current="player.resources.happiness.current"
          :max="player.effectiveHappinessMax"
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
import { computed } from 'vue'
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
  align-items: flex-start;
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
  font-size: 13px;
  line-height: 1.3;
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
