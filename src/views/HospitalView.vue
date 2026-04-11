<template>
  <div class="hospital-page">
    <div class="hospital-header">
      <span class="hospital-icon">🏥</span>
      <h2>Νοσοκομείο</h2>
    </div>

    <div v-if="player.status === 'hospital'" class="card hospital-card">
      <div class="timer-section">
        <div class="timer-label text-muted">Χρόνος νοσηλείας</div>
        <div class="timer-value text-mono">{{ formatTime(remaining) }}</div>
        <div class="timer-bar">
          <div class="bar-track" style="background: var(--color-danger); opacity: 0.2">
            <div class="bar-fill" :style="{ width: '100%', background: 'var(--color-danger)', opacity: 0.6 }" />
          </div>
        </div>
      </div>

      <p class="text-muted text-center" style="font-size: var(--font-size-sm)">
        Ξεκουράσου... Θα είσαι κομμάτια για λίγο.
      </p>

      <!-- Use medical items -->
      <div v-if="medicalItems.length > 0" class="mt-md">
        <h3 class="card-title">Χρήση Ιατρικών</h3>
        <div class="medical-list">
          <div v-for="entry in medicalItems" :key="entry.itemId" class="medical-item">
            <span>{{ entry.data.icon }} {{ entry.data.name }} (x{{ entry.quantity }})</span>
            <button class="btn btn-sm btn-success" @click="useMedical(entry.itemId)">
              Χρήση
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card text-center">
      <p>Είσαι υγιής! 💪</p>
      <router-link to="/" class="btn btn-primary mt-md">Πίσω στην Αρχική</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'

const player = usePlayerStore()
const inventory = useInventoryStore()

const remaining = computed(() => player.statusTimeRemaining)

const medicalItems = computed(() =>
  inventory.sortedItems.filter(i => i.data.type === 'medical')
)

function useMedical(itemId) {
  inventory.useItem(itemId)
}

function formatTime(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.hospital-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.hospital-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.hospital-icon { font-size: 32px; }

.timer-section { text-align: center; margin-bottom: var(--space-lg); }
.timer-label { font-size: var(--font-size-sm); margin-bottom: var(--space-xs); }
.timer-value {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-danger);
  margin-bottom: var(--space-sm);
}
.timer-bar .bar-track { height: 6px; border-radius: var(--border-radius-full); overflow: hidden; }
.timer-bar .bar-fill { height: 100%; border-radius: var(--border-radius-full); }

.medical-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.medical-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) 0;
  font-size: var(--font-size-sm);
}
</style>
