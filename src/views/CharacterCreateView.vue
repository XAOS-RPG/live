<template>
  <div class="create-page">
    <div class="create-header">
      <h1 class="game-title">ΧΑΟΣ</h1>
      <p class="game-subtitle">Δρόμοι χωρίς κανόνες. Ζωή χωρίς όρια.</p>
    </div>

    <div class="card create-card">
      <h2 class="card-title">Δημιουργία Χαρακτήρα</h2>

      <div class="form-group">
        <label class="form-label">Όνομα</label>
        <input
          v-model="name"
          class="input"
          placeholder="Το ψευδώνυμό σου στους δρόμους..."
          maxlength="20"
          @keyup.enter="create"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Φύλο</label>
        <div class="gender-options">
          <label class="gender-radio" :class="{ active: gender === 'male' }">
            <input type="radio" value="male" v-model="gender" hidden />
            👨 Άντρας
          </label>
          <label class="gender-radio" :class="{ active: gender === 'female' }">
            <input type="radio" value="female" v-model="gender" hidden />
            👩 Γυναίκα
          </label>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-header">
          <label class="form-label">Κατανομή Στατιστικών</label>
          <span class="points-remaining" :class="{ 'text-danger': remaining < 0, 'text-success': remaining === 0 }">
            Πόντοι: {{ remaining }}
          </span>
        </div>

        <div class="stat-allocators">
          <div v-for="stat in statList" :key="stat.key" class="stat-row">
            <div class="stat-info">
              <span class="stat-icon">{{ stat.icon }}</span>
              <span class="stat-name">{{ stat.label }}</span>
            </div>
            <div class="stat-controls">
              <button class="btn btn-sm btn-outline" @click="decrease(stat.key)" :disabled="allocation[stat.key] <= 1">−</button>
              <span class="stat-value text-mono">{{ allocation[stat.key] }}</span>
              <button class="btn btn-sm btn-outline" @click="increase(stat.key)" :disabled="remaining <= 0 || allocation[stat.key] >= 10">+</button>
            </div>
          </div>
        </div>
      </div>

      <p class="stat-hint text-muted">
        💡 Δύναμη = ζημιά σε μάχη · Ταχύτητα = ποιος χτυπάει πρώτος · Επιδεξιότητα = εύστοχη κλοπή · Άμυνα = αντοχή
      </p>

      <button
        class="btn btn-primary btn-lg btn-block"
        :disabled="!canCreate"
        @click="create"
      >
        Ξεκίνα το Χάος
      </button>

      <p v-if="error" class="text-danger text-center mt-sm">{{ error }}</p>
    </div>

    <p class="version-text text-muted text-center">v0.1.0 Beta — Phase 1</p>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'
import { STAT_POINTS_AT_CREATION } from '../data/constants'

const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()

const name = ref('')
const gender = ref('male') // Default επιλογή
const error = ref('')
const allocation = reactive({
  strength: 3,
  speed: 3,
  dexterity: 3,
  defense: 1,
})

const statList = [
  { key: 'strength', label: 'Δύναμη', icon: '💪' },
  { key: 'speed', label: 'Ταχύτητα', icon: '⚡' },
  { key: 'dexterity', label: 'Επιδεξιότητα', icon: '🎯' },
  { key: 'defense', label: 'Άμυνα', icon: '🛡️' },
]

const totalAllocated = computed(() =>
  allocation.strength + allocation.speed + allocation.dexterity + allocation.defense
)

const remaining = computed(() => STAT_POINTS_AT_CREATION - totalAllocated.value)

const canCreate = computed(() =>
  name.value.trim().length >= 2 && remaining.value === 0
)

function increase(stat) {
  if (remaining.value > 0 && allocation[stat] < 10) { allocation[stat]++ }
}

function decrease(stat) {
  if (allocation[stat] > 1) { allocation[stat]-- }
}

function create() {
  if (!canCreate.value) {
    error.value = remaining.value !== 0
      ? 'Κατανέμησε όλους τους πόντους!'
      : 'Πληκτρολόγησε ένα όνομα (τουλάχιστον 2 χαρακτήρες)'
    return
  }

  // Στέλνουμε ΚΑΙ το φύλο στο Store
  playerStore.initializeCharacter(name.value.trim(), gender.value, { ...allocation })
  gameStore.setInitialized()
  gameStore.startGameLoop()
  gameStore.addNotification(`Καλώς ήρθες, ${name.value.trim()}! Το χάος ξεκίνησε.`, 'success')
  playerStore.logActivity('Δημιουργήθηκε ο χαρακτήρας', 'info')
  router.push('/')
}
</script>

<style scoped>
/* Κράτησε το ίδιο CSS που είχες, απλά πρόσθεσε αυτό το κομμάτι για τα radio buttons: */
.gender-options {
  display: flex;
  gap: var(--space-sm);
}
.gender-radio {
  flex: 1;
  text-align: center;
  padding: var(--space-sm);
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.gender-radio.active {
  background: rgba(79, 195, 247, 0.15);
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: bold;
}
/* ... Το υπόλοιπο CSS σου ... */
.create-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: var(--space-lg); }
.create-header { text-align: center; margin-bottom: var(--space-xl); }
.game-title { font-size: 3rem; font-weight: 900; letter-spacing: 8px; color: var(--color-accent); text-shadow: 0 0 30px rgba(79, 195, 247, 0.3); }
.game-subtitle { color: var(--text-secondary); font-size: var(--font-size-sm); margin-top: var(--space-xs); font-style: italic; }
.create-card { width: 100%; max-width: 420px; }
.form-group { margin-bottom: var(--space-lg); }
.form-label { display: block; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--text-secondary); margin-bottom: var(--space-xs); }
.stats-section { margin-bottom: var(--space-lg); }
.stats-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm); }
.points-remaining { font-family: var(--font-family-mono); font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); }
.stat-allocators { display: flex; flex-direction: column; gap: var(--space-sm); }
.stat-row { display: flex; align-items: center; justify-content: space-between; padding: var(--space-sm); background: var(--bg-surface-raised); border-radius: var(--border-radius-md); }
.stat-info { display: flex; align-items: center; gap: var(--space-sm); }
.stat-icon { font-size: 18px; }
.stat-name { font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); }
.stat-controls { display: flex; align-items: center; gap: var(--space-sm); }
.stat-value { width: 24px; text-align: center; font-weight: var(--font-weight-bold); font-size: var(--font-size-lg); color: var(--color-accent); }
.stat-hint { font-size: var(--font-size-xs); margin-bottom: var(--space-lg); line-height: 1.6; }
.version-text { margin-top: var(--space-lg); font-size: var(--font-size-xs); }
</style>
