<template>
  <div class="volunteer-page">
    <h2 class="page-title">🤝 Εθελοντισμός</h2>

    <!-- Charity Donation -->
    <div class="card charity-card">
      <div class="charity-header">
        <span style="font-size:2rem">❤️</span>
        <div>
          <strong>Φιλανθρωπική Δωρεά</strong>
          <p class="text-muted" style="margin:0; font-size:var(--font-size-xs)">
            Δώρισε €{{ CHARITY_COST.toLocaleString('el-GR') }} και κέρδισε +{{ Math.round(CHARITY_FILOTIMO * cardStore.filotimoBonus) }} Φιλότιμο αμέσως.
          </p>
        </div>
      </div>
      <button
        class="btn btn-primary"
        :disabled="player.cash < CHARITY_COST"
        @click="volunteerStore.donate()"
      >
        ❤️ Δωρεά €{{ CHARITY_COST.toLocaleString('el-GR') }}
      </button>
    </div>

    <!-- Civic Duties -->
    <h3 class="section-label">🏙️ Κοινωνικές Δράσεις</h3>
    <div class="duty-list">
      <div v-for="duty in CIVIC_DUTIES" :key="duty.id" class="card duty-card">
        <div class="duty-header">
          <span class="duty-icon">{{ duty.icon }}</span>
          <div class="duty-info">
            <strong>{{ duty.name }}</strong>
            <p class="text-muted duty-desc">{{ duty.description }}</p>
          </div>
        </div>

        <div class="duty-rewards">
          <span class="badge badge-info">⚡ -{{ duty.energyCost }}</span>
          <span class="badge badge-success">+{{ Math.round(duty.filotimo * cardStore.filotimoBonus) }} Φιλότιμο</span>
          <span class="badge badge-warning">+{{ duty.happiness }} Κέφι</span>
        </div>

        <div v-if="!volunteerStore.canDoDuty(duty.id)" class="cooldown-bar">
          <div class="cooldown-fill" :style="{ width: cooldownPct(duty.id) + '%' }"></div>
          <span class="cooldown-label text-muted">{{ formatTime(volunteerStore.dutyCooldownRemaining(duty.id)) }}</span>
        </div>

        <button
          class="btn btn-sm btn-outline mt-xs"
          :disabled="!volunteerStore.canDoDuty(duty.id) || player.resources.energy.current < duty.energyCost"
          @click="volunteerStore.performDuty(duty.id)"
        >
          {{ volunteerStore.canDoDuty(duty.id) ? 'Εκτέλεση' : 'Cooldown' }}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="card stats-card">
      <div class="stat-row">
        <span class="text-muted">Δράσεις που ολοκληρώθηκαν</span>
        <strong class="text-mono">{{ volunteerStore.totalDutiesCompleted }}</strong>
      </div>
      <div class="stat-row">
        <span class="text-muted">Συνολικές δωρεές</span>
        <strong class="text-mono text-success">€{{ volunteerStore.totalDonated.toLocaleString('el-GR') }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../stores/playerStore'
import { useVolunteerStore, CIVIC_DUTIES, CHARITY_COST, CHARITY_FILOTIMO } from '../stores/volunteerStore'
import { useCardStore } from '../stores/cardStore'

const player = usePlayerStore()
const volunteerStore = useVolunteerStore()
const cardStore = useCardStore()

function cooldownPct(dutyId) {
  const remaining = volunteerStore.dutyCooldownRemaining(dutyId)
  return Math.round((remaining / (60 * 60 * 1000)) * 100)
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
.volunteer-page { display: flex; flex-direction: column; gap: var(--space-md); }

.charity-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border-left: 3px solid #e74c3c;
}
.charity-header { display: flex; align-items: center; gap: var(--space-md); }

.section-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.duty-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.duty-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.duty-header { display: flex; align-items: flex-start; gap: var(--space-sm); }
.duty-icon { font-size: 2rem; flex-shrink: 0; }
.duty-desc { margin: 0; font-size: var(--font-size-xs); line-height: 1.4; }
.duty-rewards { display: flex; gap: var(--space-xs); flex-wrap: wrap; }

.cooldown-bar {
  position: relative;
  height: 6px;
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-full);
  overflow: visible;
}
.cooldown-fill {
  height: 100%;
  background: var(--color-warning, #f39c12);
  border-radius: var(--border-radius-full);
  transition: width 1s linear;
}
.cooldown-label {
  font-size: var(--font-size-xs);
  margin-top: 2px;
  display: block;
}

.stats-card { display: flex; flex-direction: column; gap: var(--space-xs); }
.stat-row { display: flex; justify-content: space-between; font-size: var(--font-size-sm); }

.mt-xs { margin-top: var(--space-xs); }
</style>
