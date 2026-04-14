<template>
  <div class="pet-page">
    <h2 class="page-title">🐾 Κατοικίδια</h2>
    <p class="page-sub text-muted">Απόκτησε κατοικίδια, φρόντισέ τα, και πάρε bonuses.</p>

    <!-- Active pet card -->
    <div v-if="activePet" class="card active-pet-card">
      <div class="active-pet-header">
        <span class="active-pet-icon">{{ activePetDef.icon }}</span>
        <div class="active-pet-info">
          <strong>{{ activePetDef.name }}</strong>
          <span class="text-muted" style="font-size: 10px;">Level {{ activePet.level }}/{{ activePetDef.maxLevel }}</span>
        </div>
        <span class="active-badge">Ενεργό</span>
      </div>

      <!-- Happiness bar -->
      <div class="stat-block">
        <div class="stat-label">
          <span>😊 Χαρά</span>
          <span class="text-mono">{{ activePet.happiness }}/100</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: activePet.happiness + '%', background: happinessColor }" />
        </div>
      </div>

      <!-- XP bar -->
      <div v-if="activePet.level < activePetDef.maxLevel" class="stat-block">
        <div class="stat-label">
          <span>⭐ XP</span>
          <span class="text-mono">{{ activePet.trainingXp }}/{{ trainingXpNeeded }}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: xpProgress + '%', background: 'var(--color-accent)' }" />
        </div>
      </div>
      <div v-else class="text-muted" style="font-size: 10px; text-align: center; padding: 4px 0;">
        ✨ MAX LEVEL
      </div>

      <!-- Bonus display -->
      <div class="bonus-display">
        <span class="text-muted">{{ activePetDef.bonusLabel }}:</span>
        <span class="text-success text-mono">+{{ bonusPercent }}%</span>
      </div>

      <!-- Hunger warning -->
      <div v-if="petStore.petNeedsFeeding(activePet.petId)" class="hunger-warning">
        ⚠️ Πεινάει! Τάισέ το πριν φύγει!
      </div>

      <!-- Action buttons -->
      <div class="pet-actions">
        <button class="btn btn-sm btn-success" @click="petStore.feedPet(activePet.petId)">
          🍖 Τάισε (€{{ activePetDef.feedCost }})
        </button>
        <button class="btn btn-sm btn-primary" @click="petStore.playWithPet(activePet.petId)">
          🎾 Παίξε
        </button>
        <button
          class="btn btn-sm btn-warning"
          :disabled="trainCooldown > 0 || activePet.level >= activePetDef.maxLevel"
          @click="petStore.trainPet(activePet.petId)"
        >
          📚 Εκπαίδευσε
          <span v-if="trainCooldown > 0" style="font-size: 9px;">({{ formatCooldown(trainCooldown) }})</span>
        </button>
      </div>
    </div>

    <div v-else-if="petStore.hasPet" class="card text-center" style="padding: var(--space-md);">
      <p class="text-muted">Δεν έχεις ενεργό κατοικίδιο. Επίλεξε ένα παρακάτω.</p>
    </div>

    <!-- Owned pets -->
    <div v-if="petStore.ownedPets.length > 0" class="card">
      <h3 class="section-title">📋 Τα Κατοικίδιά σου</h3>
      <div v-for="pet in ownedPetsWithDef" :key="pet.petId" class="pet-row">
        <span class="pet-row-icon">{{ pet.def.icon }}</span>
        <div class="pet-row-info">
          <strong>{{ pet.def.name }}</strong>
          <span class="text-muted" style="font-size: 10px;">
            Lv.{{ pet.level }} · {{ pet.def.bonusLabel }}: +{{ ((getPetBonusMultiplier(pet.def, pet.level) - 1) * 100).toFixed(0) }}%
          </span>
        </div>
        <div class="pet-row-actions">
          <span v-if="pet.petId === petStore.activePetId" class="active-tag">✓</span>
          <button
            v-else
            class="btn btn-xs btn-primary"
            @click="petStore.setActivePet(pet.petId)"
          >
            Ενεργοποίηση
          </button>
        </div>
      </div>
    </div>

    <!-- Pet shop -->
    <div class="card">
      <h3 class="section-title">🏪 Κατάστημα Κατοικιδίων</h3>
      <div v-for="def in availablePets" :key="def.id" class="shop-row">
        <span class="shop-icon">{{ def.icon }}</span>
        <div class="shop-info">
          <strong>{{ def.name }}</strong>
          <span class="text-muted" style="font-size: 10px;">
            {{ def.description }}
          </span>
          <span class="text-muted" style="font-size: 10px;">
            {{ def.bonusLabel }}: +{{ (def.bonusPerLevel * 100).toFixed(0) }}%/lv · Τροφή: €{{ def.feedCost }}/ημ
          </span>
        </div>
        <div class="shop-actions">
          <span class="shop-price text-mono">€{{ def.buyPrice }}</span>
          <button
            v-if="isOwned(def.id)"
            class="btn btn-xs btn-muted"
            disabled
          >
            Αποκτήθηκε
          </button>
          <button
            v-else
            class="btn btn-xs btn-success"
            :disabled="player.cash < def.buyPrice || player.level < def.requiredLevel"
            @click="petStore.buyPet(def.id)"
          >
            {{ player.level < def.requiredLevel ? `Lv.${def.requiredLevel}` : 'Αγορά' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bonus reference -->
    <div class="card">
      <h3 class="section-title">📊 Bonuses Κατοικιδίων</h3>
      <div v-for="def in allPetDefs" :key="def.id" class="stat-row">
        <span>{{ def.icon }} {{ def.name }}</span>
        <span class="text-muted">{{ def.bonusLabel }}: +{{ (def.bonusPerLevel * 100).toFixed(0) }}%/lv</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { usePetStore } from '../stores/petStore'
import { petDefinitions, getPetBonusMultiplier, trainingXpForLevel } from '../data/pets'

const player = usePlayerStore()
const petStore = usePetStore()

const allPetDefs = petDefinitions

const activePet = computed(() => petStore.activePet)
const activePetDef = computed(() => petStore.activePetDef)

const trainingXpNeeded = computed(() => {
  if (!activePet.value) return 0
  return trainingXpForLevel(activePet.value.level)
})

const xpProgress = computed(() => {
  if (!activePet.value || !trainingXpNeeded.value) return 0
  return Math.min(100, (activePet.value.trainingXp / trainingXpNeeded.value) * 100)
})

const bonusPercent = computed(() => {
  if (!activePet.value || !activePetDef.value) return 0
  return ((getPetBonusMultiplier(activePetDef.value, activePet.value.level) - 1) * 100).toFixed(0)
})

const happinessColor = computed(() => {
  if (!activePet.value) return 'var(--color-success)'
  const h = activePet.value.happiness
  if (h > 60) return 'var(--color-success)'
  if (h > 30) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

const trainCooldown = computed(() => {
  if (!activePet.value) return 0
  return petStore.trainCooldownRemaining(activePet.value.petId)
})

const ownedPetsWithDef = computed(() =>
  petStore.ownedPets.map(p => ({
    ...p,
    def: petDefinitions.find(d => d.id === p.petId) || { name: p.petId, icon: '🐾', bonusLabel: '?', bonusPerLevel: 0 },
  }))
)

const availablePets = computed(() =>
  petDefinitions.slice().sort((a, b) => a.requiredLevel - b.requiredLevel)
)

function isOwned(petId) {
  return petStore.ownedPets.some(p => p.petId === petId)
}

function formatCooldown(ms) {
  const mins = Math.ceil(ms / 60000)
  if (mins >= 60) return `${Math.floor(mins / 60)}ω ${mins % 60}λ`
  return `${mins}λ`
}
</script>

<style scoped>
.pet-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); margin-bottom: 2px; }
.page-sub { font-size: var(--font-size-xs); margin: 0 0 var(--space-sm); }

.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.active-pet-card { border-left: 3px solid var(--color-accent); }

.active-pet-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.active-pet-icon { font-size: 2rem; }

.active-pet-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
}

.active-badge {
  font-size: 10px;
  background: var(--color-accent);
  color: var(--bg-surface);
  padding: 2px 8px;
  border-radius: var(--border-radius-sm);
  font-weight: var(--font-weight-bold);
}

.stat-block { margin-bottom: var(--space-xs); }

.stat-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 2px;
}

.bar-track {
  height: 6px;
  background: var(--bg-surface-raised);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.bonus-display {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  padding: var(--space-xs) 0;
  border-top: 1px solid var(--border-color);
  margin-top: var(--space-xs);
}

.hunger-warning {
  background: rgba(255, 152, 0, 0.15);
  color: var(--color-warning);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-sm);
  font-size: 11px;
  text-align: center;
  margin: var(--space-xs) 0;
  animation: pulse-warning 2s ease infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.pet-actions {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  flex-wrap: wrap;
}

.pet-row, .shop-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-color);
}
.pet-row:last-child, .shop-row:last-child { border-bottom: none; }

.pet-row-icon, .shop-icon { font-size: 1.5rem; flex-shrink: 0; }

.pet-row-info, .shop-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
}

.pet-row-actions, .shop-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.active-tag {
  color: var(--color-success);
  font-weight: var(--font-weight-bold);
  font-size: 14px;
}

.shop-price {
  font-size: var(--font-size-sm);
  min-width: 50px;
  text-align: right;
}

.btn-muted {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-xs {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: var(--border-radius-sm);
}

.text-success { color: var(--color-success); }
.text-danger { color: var(--color-danger); }
.text-warning { color: var(--color-warning); }

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-color);
}
.stat-row:last-child { border-bottom: none; }
</style>
