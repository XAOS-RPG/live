<template>
  <div class="settings-page">
    <h2 class="page-title">⚙️ Ρυθμίσεις</h2>

    <div class="card">
      <h3 class="card-title">Αποθήκευση</h3>
      <div class="settings-actions">
        <button class="btn btn-primary btn-block" @click="gameStore.saveGame()">
          💾 Αποθήκευση Τώρα
        </button>
        <p v-if="gameStore.lastSaveTimestamp" class="text-muted text-center" style="font-size: var(--font-size-xs)">
          Τελευταία αποθήκευση: {{ formatDate(gameStore.lastSaveTimestamp) }}
        </p>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Εξαγωγή / Εισαγωγή</h3>
      <div class="settings-actions">
        <button class="btn btn-outline btn-block" @click="gameStore.exportSave()">
          📤 Εξαγωγή Save (JSON)
        </button>
        <div class="import-section">
          <label class="btn btn-outline btn-block import-label">
            📥 Εισαγωγή Save
            <input type="file" accept=".json" @change="handleImport" class="file-input" />
          </label>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title text-danger">Επικίνδυνη Ζώνη</h3>
      <div class="settings-actions">
        <button class="btn btn-danger btn-block" @click="confirmDelete">
          🗑️ Διαγραφή Αποθήκευσης
        </button>
        <p class="text-muted text-center" style="font-size: var(--font-size-xs)">
          Αυτό θα διαγράψει μόνιμα όλη την πρόοδό σου!
        </p>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Πληροφορίες</h3>
      <div class="info-list">
        <div class="info-row">
          <span class="text-muted">Έκδοση</span>
          <span>v{{ gameStore.gameVersion }}</span>
        </div>
        <div class="info-row">
          <span class="text-muted">Χαρακτήρας</span>
          <span>{{ player.name }}</span>
        </div>
        <div class="info-row">
          <span class="text-muted">Ηλικί��</span>
          <span>{{ formatAge() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'
import { useRouter } from 'vue-router'

const gameStore = useGameStore()
const player = usePlayerStore()
const router = useRouter()

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('el-GR')
}

function formatAge() {
  const days = Math.floor((Date.now() - player.createdAt) / 86400000)
  if (days === 0) return 'Σήμερα'
  return `${days} ημέρ${days === 1 ? 'α' : 'ες'}`
}

function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const success = gameStore.importSave(e.target.result)
    if (success) {
      router.push('/')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

function confirmDelete() {
  if (confirm('Είσαι σίγουρος; Θα χάσεις ΟΛΗ την πρόοδό σου!')) {
    gameStore.deleteSave()
    router.push('/create')
  }
}
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title {
  font-size: var(--font-size-2xl);
  margin-bottom: var(--space-sm);
}

.settings-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.file-input {
  display: none;
}

.import-label {
  cursor: pointer;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}
</style>
