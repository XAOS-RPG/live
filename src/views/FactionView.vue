<template>
  <div class="faction-page">
    <h2 class="page-title">🏴 Συμμορίες</h2>

    <!-- Current faction info -->
    <template v-if="factionStore.faction">
      <div class="card current-faction" :style="{ borderLeftColor: factionStore.faction.color }">
        <div class="cf-header">
          <span class="cf-icon">{{ factionStore.faction.icon }}</span>
          <div class="cf-info">
            <strong :style="{ color: factionStore.faction.color }">{{ factionStore.faction.name }}</strong>
            <span class="text-muted cf-sub">{{ factionStore.rankTitle }} — Συνεισφορά: {{ factionStore.contribution }}</span>
          </div>
        </div>
        <p class="text-muted cf-desc">{{ factionStore.faction.description }}</p>
        <div class="cf-bonus">
          <span class="badge badge-success">{{ factionStore.faction.bonus.label }}</span>
          <span class="text-muted cf-leader">Αρχηγός: {{ factionStore.faction.leader }}</span>
        </div>
        <div class="cf-stats">
          <span class="text-muted">Μέλη: {{ factionStore.faction.members }}</span>
          <span class="text-muted">Ένταξη: {{ joinedAgo }}</span>
        </div>
        <button class="btn btn-sm btn-outline btn-danger-outline" @click="showLeaveConfirm = true">
          Αποχώρηση
        </button>
        <div v-if="showLeaveConfirm" class="leave-confirm">
          <span class="text-muted">Σίγουρα;</span>
          <button class="btn btn-sm btn-danger" @click="leave">Ναι</button>
          <button class="btn btn-sm btn-outline" @click="showLeaveConfirm = false">Όχι</button>
        </div>
      </div>
    </template>

    <!-- Faction list -->
    <template v-else>
      <div class="card text-muted text-center join-hint">
        Διάλεξε μια συμμορία για να πάρεις bonus stats!
      </div>

      <div class="faction-list">
        <div
          v-for="faction in factions"
          :key="faction.id"
          class="card faction-card"
          :style="{ borderLeftColor: faction.color }"
        >
          <div class="fc-header">
            <span class="fc-icon">{{ faction.icon }}</span>
            <div class="fc-info">
              <strong :style="{ color: faction.color }">{{ faction.name }}</strong>
              <p class="text-muted fc-desc">{{ faction.description }}</p>
            </div>
          </div>
          <div class="fc-details">
            <span class="badge badge-success">{{ faction.bonus.label }}</span>
            <span class="text-muted fc-members">{{ faction.members }} μέλη</span>
            <span class="text-muted fc-leader">Αρχηγός: {{ faction.leader }}</span>
          </div>
          <div class="fc-req">
            <span class="text-muted">Απαιτήσεις:</span>
            <span class="badge" :class="player.level >= faction.requirement.level ? 'badge-success' : 'badge-danger'">
              Επ. {{ faction.requirement.level }}
            </span>
            <span class="badge" :class="player.filotimo >= faction.requirement.filotimo ? 'badge-success' : 'badge-danger'">
              {{ faction.requirement.filotimo }} Φιλότιμο
            </span>
          </div>
          <button
            class="btn btn-sm btn-primary"
            :disabled="player.level < faction.requirement.level || player.filotimo < faction.requirement.filotimo"
            @click="factionStore.joinFaction(faction.id)"
          >
            Εγγραφή
          </button>
        </div>
      </div>
    </template>

    <!-- Coming Soon sections -->
    <div class="card cs-section">
      <div class="cs-badge">🚧 Σύντομα</div>
      <h3 class="cs-title">⚔️ Πόλεμοι Συμμοριών</h3>
      <p class="text-muted cs-text">Κήρυξε πόλεμο σε αντίπαλες συμμορίες, κατάκτησε εδάφη και κέρδισε bonus πόρων!</p>
    </div>
    <div class="card cs-section">
      <div class="cs-badge">🚧 Σύντομα</div>
      <h3 class="cs-title">🎭 Οργανωμένο Έγκλημα</h3>
      <p class="text-muted cs-text">Συνεργάσου με τα μέλη της συμμορίας σου για μεγάλα χτυπήματα και τεράστια κέρδη!</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useFactionStore } from '../stores/factionStore'
import { factions } from '../data/factions'

const player = usePlayerStore()
const factionStore = useFactionStore()
const showLeaveConfirm = ref(false)

const joinedAgo = computed(() => {
  if (!factionStore.joinedAt) return ''
  const days = Math.floor((Date.now() - factionStore.joinedAt) / 86400000)
  if (days === 0) return 'Σήμερα'
  if (days === 1) return 'Χθες'
  return `${days} ημέρες πριν`
})

function leave() {
  factionStore.leaveFaction()
  showLeaveConfirm.value = false
}
</script>

<style scoped>
.faction-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); }

.join-hint { padding: var(--space-sm); font-size: var(--font-size-sm); }

/* Current faction */
.current-faction {
  border-left: 3px solid;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.cf-header { display: flex; align-items: center; gap: var(--space-sm); }
.cf-icon { font-size: 32px; }
.cf-info strong { font-size: var(--font-size-lg); }
.cf-sub { font-size: var(--font-size-xs); display: block; }
.cf-desc { font-size: var(--font-size-sm); margin: 0; }
.cf-bonus { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.cf-leader { font-size: var(--font-size-xs); }
.cf-stats { display: flex; gap: var(--space-md); font-size: var(--font-size-xs); }

.leave-confirm {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.btn-danger-outline {
  color: var(--color-danger);
  border-color: var(--color-danger);
  align-self: flex-start;
}

/* Faction list */
.faction-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.faction-card {
  border-left: 3px solid;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.fc-header { display: flex; align-items: flex-start; gap: var(--space-sm); }
.fc-icon { font-size: 28px; flex-shrink: 0; }
.fc-info { flex: 1; min-width: 0; }
.fc-info strong { font-size: var(--font-size-sm); }
.fc-desc { font-size: var(--font-size-xs); margin: 2px 0 0; }

.fc-details {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  font-size: var(--font-size-xs);
}

.fc-members { font-size: var(--font-size-xs); }
.fc-leader { font-size: var(--font-size-xs); }

.fc-req {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-xs);
}

/* Coming soon sections */
.cs-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: center;
  text-align: center;
  border: 1px dashed var(--color-warning);
  opacity: 0.7;
}

.cs-badge {
  display: inline-block;
  background: var(--bg-surface-raised);
  border: 1px solid var(--color-warning);
  color: var(--color-warning);
  padding: 2px var(--space-sm);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.cs-title { font-size: var(--font-size-sm); margin: 0; }
.cs-text { font-size: var(--font-size-xs); margin: 0; max-width: 280px; }
</style>
