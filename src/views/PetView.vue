<template>
  <div class="pet-page">
    <h2 class="page-title">🐾 Κατοικίδια</h2>

    <!-- Main tabs -->
    <div class="main-tabs">
      <button class="main-tab" :class="{ active: mainTab === 'pets' }" @click="mainTab = 'pets'">🐾 Κατοικίδια</button>
      <button class="main-tab" :class="{ active: mainTab === 'shop' }" @click="mainTab = 'shop'">🏪 Petshop</button>
    </div>

    <!-- ── ΚΑΤΟΙΚΙΔΙΑ TAB ── -->
    <template v-if="mainTab === 'pets'">
      <div v-if="petStore.ownedPets.length === 0" class="card text-center text-muted" style="padding:var(--space-lg)">
        <div style="font-size:3rem;margin-bottom:var(--space-sm)">🐾</div>
        <p>Δεν έχεις κατοικίδια ακόμα.</p>
        <button class="btn btn-primary mt-sm" @click="mainTab = 'shop'">Πήγαινε στο Petshop</button>
      </div>

      <div v-else class="pets-grid">
        <div
          v-for="pet in petsWithDefs"
          :key="pet.petId"
          class="pet-card"
          :class="petMoodClass(pet)"
          @click="openPetCard(pet.petId)"
        >
          <div class="pet-card-avatar">
            <span class="pet-card-emoji">{{ pet.def.icon }}</span>
            <span class="pet-card-mood">{{ petMoodEmoji(pet) }}</span>
          </div>
          <div class="pet-card-name">{{ pet.def.name }}</div>
          <div class="pet-card-level text-muted">Lv.{{ pet.level }}/{{ pet.def.maxLevel }}</div>
          <div class="pet-card-bars">
            <div class="pet-mini-bar" title="Χαρά">
              <span style="font-size:9px">😊</span>
              <div class="mini-track"><div class="mini-fill" :style="{ width: pet.happiness + '%', background: barColor(pet.happiness) }" /></div>
            </div>
            <div class="pet-mini-bar" title="Τροφή">
              <span style="font-size:9px">🍖</span>
              <div class="mini-track"><div class="mini-fill" :style="{ width: (pet.food ?? 100) + '%', background: barColor(pet.food ?? 100) }" /></div>
            </div>
          </div>
          <div class="pet-card-bonus">{{ pet.def.bonusLabel }}: +{{ petBonusPct(pet) }}%</div>
          <div v-if="petStore.petNeedsFeeding(pet.petId)" class="pet-hunger-warn">🍖 Πεινάει!</div>
        </div>
      </div>
    </template>

    <!-- ── PETSHOP TAB ── -->
    <template v-else>
      <div class="shop-tabs">
        <button class="shop-tab" :class="{ active: shopTab === 'animals' }" @click="shopTab = 'animals'">🐕 Μαγαζί</button>
        <button class="shop-tab" :class="{ active: shopTab === 'toys' }"    @click="shopTab = 'toys'">🎾 Παιχνίδια</button>
        <button class="shop-tab" :class="{ active: shopTab === 'food' }"    @click="shopTab = 'food'">🍖 Τροφή</button>
      </div>

      <!-- Μαγαζί -->
      <div v-if="shopTab === 'animals'" class="card">
        <h3 class="section-title">🐕 Αγορά Κατοικιδίου</h3>
        <div v-for="def in availablePets" :key="def.id" class="shop-row">
          <span class="shop-icon">{{ def.icon }}</span>
          <div class="shop-info">
            <strong>{{ def.name }}</strong>
            <span class="text-muted" style="font-size:10px">{{ def.description }}</span>
            <span class="text-muted" style="font-size:10px">
              {{ def.bonusLabel }}: +{{ (def.bonusPerLevel * 100).toFixed(0) }}%/lv
              <span v-if="['stray_dog','pitbull','cat'].includes(def.id)"> · 🦮 Βόλτα</span>
            </span>
          </div>
          <div class="shop-actions">
            <span class="shop-price text-mono">€{{ def.buyPrice }}</span>
            <button v-if="isOwned(def.id)" class="btn btn-xs" disabled style="opacity:.5">Αποκτήθηκε</button>
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

      <!-- Παιχνίδια -->
      <div v-else-if="shopTab === 'toys'" class="card">
        <h3 class="section-title">🎾 Παιχνίδια</h3>
        <p class="text-muted" style="font-size:11px;margin-bottom:var(--space-sm)">
          Κάθε παιχνίδι αντέχει {{ TOY_MAX_USES }} χρήσεις. Αποθηκεύεται στο ενεργό σπίτι.
        </p>
        <div v-if="!propertyStore.activeInstance" class="warning-bar warn-food" style="margin-bottom:var(--space-sm)">
          ⚠️ Χρειάζεσαι ενεργό σπίτι για να αγοράσεις αντικείμενα!
        </div>
        <div v-for="toy in petToys" :key="toy.id" class="shop-row">
          <span class="shop-icon">{{ toy.icon }}</span>
          <div class="shop-info">
            <strong>{{ toy.name }}</strong>
            <span class="text-muted" style="font-size:10px">
              {{ getPetDefById(toy.petId)?.icon }} {{ getPetDefById(toy.petId)?.name }} · {{ TOY_MAX_USES }} χρήσεις
            </span>
            <span v-if="activeStashQty(toy.id) > 0" class="stash-info">
              🏠 Στο σπίτι: {{ activeStashQty(toy.id) }} · Χρήσεις: {{ petStore.toyUsesFor(toy.id) }}
            </span>
          </div>
          <div class="shop-actions">
            <span class="shop-price text-mono">€{{ toy.buyPrice }}</span>
            <button
              class="btn btn-xs btn-primary"
              :disabled="!propertyStore.activeInstance || player.cash < toy.buyPrice"
              @click="petStore.buyPetItem(toy.id)"
            >
              Αγορά
            </button>
          </div>
        </div>
      </div>

      <!-- Τροφή -->
      <div v-else-if="shopTab === 'food'" class="card">
        <h3 class="section-title">🍖 Τροφή</h3>
        <p class="text-muted" style="font-size:11px;margin-bottom:var(--space-sm)">
          Η τροφή αποθηκεύεται στο ενεργό σπίτι και χρησιμοποιείται αυτόματα κατά το τάισμα.
        </p>
        <div v-if="!propertyStore.activeInstance" class="warning-bar warn-food" style="margin-bottom:var(--space-sm)">
          ⚠️ Χρειάζεσαι ενεργό σπίτι για να αγοράσεις αντικείμενα!
        </div>
        <div v-for="food in petFoods" :key="food.id" class="shop-row">
          <span class="shop-icon">{{ food.icon }}</span>
          <div class="shop-info">
            <strong>{{ food.name }}</strong>
            <span class="text-muted" style="font-size:10px">
              {{ getPetDefById(food.petId)?.icon }} {{ getPetDefById(food.petId)?.name }}
            </span>
            <span v-if="activeStashQty(food.id) > 0" class="stash-info">
              🏠 Στο σπίτι: {{ activeStashQty(food.id) }}
            </span>
          </div>
          <div class="shop-actions">
            <span class="shop-price text-mono">€{{ food.buyPrice }}</span>
            <button
              class="btn btn-xs btn-success"
              :disabled="!propertyStore.activeInstance || player.cash < food.buyPrice"
              @click="petStore.buyPetItem(food.id)"
            >
              Αγορά
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── PET CARD MODAL ── -->
    <Teleport to="body">
      <div v-if="selectedPetId" class="pet-modal-overlay" @click.self="selectedPetId = null">
        <div class="pet-modal-card" v-if="selectedPet && selectedPetDef">

          <!-- Close -->
          <button class="modal-close" @click="selectedPetId = null">✕</button>

          <!-- Header -->
          <div class="pet-header">
            <div class="pet-avatar" :class="petMoodClass(selectedPet)">
              <span class="pet-emoji">{{ selectedPetDef.icon }}</span>
              <span class="pet-mood-bubble">{{ petMoodEmoji(selectedPet) }}</span>
            </div>
            <div class="pet-header-info">
              <div class="pet-name-row">
                <strong class="pet-name">{{ selectedPetDef.name }}</strong>
              </div>
              <div class="pet-level-row">
                <span class="text-muted" style="font-size:11px">Level {{ selectedPet.level }}/{{ selectedPetDef.maxLevel }}</span>
                <span class="bonus-chip">{{ selectedPetDef.bonusLabel }}: +{{ petBonusPct(selectedPet) }}%</span>
              </div>
            </div>
          </div>

          <!-- Stats grid 2x2 -->
          <div class="stats-grid">
            <div class="stat-block">
              <div class="stat-label-row">
                <span>😊 Χαρά</span>
                <span class="stat-val" :class="valColor(selectedPet.happiness)">{{ selectedPet.happiness }}/100</span>
              </div>
              <div class="bar-track"><div class="bar-fill" :style="{ width: selectedPet.happiness + '%', background: barColor(selectedPet.happiness) }" /></div>
            </div>
            <div class="stat-block">
              <div class="stat-label-row">
                <span>⭐ XP</span>
                <span class="stat-val text-accent" v-if="selectedPet.level < selectedPetDef.maxLevel">{{ selectedPet.trainingXp }}/{{ trainingXpNeeded }}</span>
                <span class="stat-val" v-else style="color:#f1c40f">MAX</span>
              </div>
              <div class="bar-track"><div class="bar-fill" :style="{ width: xpProgress + '%', background: 'var(--color-accent)' }" /></div>
            </div>
            <div class="stat-block">
              <div class="stat-label-row">
                <span>🍖 Τροφή</span>
                <span class="stat-val" :class="valColor(selectedPet.food ?? 100)">{{ selectedPet.food ?? 100 }}/100</span>
              </div>
              <div class="bar-track"><div class="bar-fill" :style="{ width: (selectedPet.food ?? 100) + '%', background: barColor(selectedPet.food ?? 100) }" /></div>
            </div>
            <div class="stat-block">
              <div class="stat-label-row">
                <span>🛁 Καθαριότητα</span>
                <span class="stat-val" :class="valColor(selectedPet.cleanliness ?? 100)">{{ selectedPet.cleanliness ?? 100 }}/100</span>
              </div>
              <div class="bar-track"><div class="bar-fill" :style="{ width: (selectedPet.cleanliness ?? 100) + '%', background: barColor(selectedPet.cleanliness ?? 100) }" /></div>
            </div>
          </div>

          <!-- Warnings -->
          <div v-if="petStore.petNeedsFeeding(selectedPetId)" class="warning-bar warn-food">
            🍖 Πεινάει! Τάισέ το πριν φύγει!
          </div>
          <div v-if="(selectedPet.cleanliness ?? 100) < 25" class="warning-bar warn-dirty">
            🛁 Είναι βρώμικο! Κάνε μπάνιο!
          </div>

          <!-- Food/Toy stash info -->
          <div class="stash-status-row">
            <span class="stash-badge" :class="hasFoodInStash ? 'badge-ok' : 'badge-warn'">
              {{ selectedPetDef.icon }} Τροφή: {{ activeStashQty(selectedPetDef.foodItemId) }}
            </span>
            <span class="stash-badge" :class="hasToyInStash ? 'badge-ok' : 'badge-warn'">
              🎾 Παιχνίδι: {{ petStore.toyUsesFor(selectedPetDef.toyItemId) }} χρήσεις
            </span>
          </div>

          <!-- Walk find result -->
          <div v-if="petStore.lastWalkFind && petStore.lastWalkFind.petId === selectedPetId" class="walk-find-card" :class="petStore.lastWalkFind.isJunk ? 'find-junk' : 'find-good'">
            <span class="find-icon">{{ petStore.lastWalkFind.itemIcon }}</span>
            <div class="find-text">
              <strong v-if="!petStore.lastWalkFind.isJunk">Βρήκε: {{ petStore.lastWalkFind.itemName }}</strong>
              <strong v-else>Έφερε: {{ petStore.lastWalkFind.itemName }}</strong>
              <span class="text-muted" style="font-size:10px">{{ petStore.lastWalkFind.isJunk ? 'Πετάχτηκε...' : 'Αποθηκεύτηκε στο σπίτι' }}</span>
            </div>
            <button class="find-dismiss" @click="petStore.lastWalkFind = null">✕</button>
          </div>

          <!-- Cat scratch warning -->
          <div v-if="selectedPetId === 'cat'" class="warning-bar warn-scratch">
            😾 Προσοχή: 50% πιθανότητα να σε γρατζουνίσει κατά το παιχνίδι! (-5 HP)
          </div>

          <!-- Actions -->
          <div class="actions-grid">
            <button class="act-btn act-feed" @click="petStore.feedPet(selectedPetId)">
              <span class="act-icon">🍖</span>
              <span class="act-label">Τάισε</span>
              <span class="act-sub">{{ activeStashQty(selectedPetDef.foodItemId) > 0 ? activeStashQty(selectedPetDef.foodItemId) + ' στο σπίτι' : 'Δεν έχεις τροφή' }}</span>
            </button>

            <button class="act-btn act-play" @click="petStore.playWithPet(selectedPetId)">
              <span class="act-icon">🎾</span>
              <span class="act-label">Παίξε</span>
              <span class="act-sub">
                {{ hasToyInStash ? petStore.toyUsesFor(selectedPetDef.toyItemId) + ' χρήσεις' : 'Δεν έχεις παιχνίδι' }}
              </span>
            </button>

            <button
              class="act-btn act-walk"
              :disabled="!petStore.isWalkable(selectedPetId) || walkCooldown > 0"
              @click="petStore.walkPet(selectedPetId)"
            >
              <span class="act-icon">🦮</span>
              <span class="act-label">Βόλτα</span>
              <span class="act-sub">{{ walkCooldown > 0 ? formatCd(walkCooldown) : petStore.isWalkable(selectedPetId) ? 'Βρίσκει αντικ.' : 'Δ/Υ' }}</span>
            </button>

            <button
              class="act-btn act-bath"
              :disabled="bathCooldown > 0"
              @click="petStore.bathPet(selectedPetId)"
            >
              <span class="act-icon">🛁</span>
              <span class="act-label">Μπάνιο</span>
              <span class="act-sub">{{ bathCooldown > 0 ? formatCd(bathCooldown) : '+Καθαριότητα' }}</span>
            </button>

            <button
              class="act-btn act-train"
              :disabled="trainCooldown > 0 || selectedPet.level >= selectedPetDef.maxLevel"
              @click="petStore.trainPet(selectedPetId)"
            >
              <span class="act-icon">📚</span>
              <span class="act-label">Εκπαίδευση</span>
              <span class="act-sub">{{ selectedPet.level >= selectedPetDef.maxLevel ? 'MAX' : trainCooldown > 0 ? formatCd(trainCooldown) : '-10 Ενέργεια' }}</span>
            </button>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { usePetStore } from '../stores/petStore'
import { usePropertyStore } from '../stores/propertyStore'
import { petDefinitions, getPetBonusMultiplier, trainingXpForLevel } from '../data/pets'
import { PET_TOYS, PET_FOODS } from '../data/items'

const TOY_MAX_USES = 20

const player        = usePlayerStore()
const petStore      = usePetStore()
const propertyStore = usePropertyStore()

const mainTab      = ref('pets')
const shopTab      = ref('animals')
const selectedPetId = ref(null)

const petToys  = PET_TOYS
const petFoods = PET_FOODS

function getPetDefById(petId) {
  return petDefinitions.find(d => d.id === petId) || null
}

const petsWithDefs = computed(() =>
  petStore.ownedPets.map(p => ({
    ...p,
    def: petDefinitions.find(d => d.id === p.petId) || { name: p.petId, icon: '🐾', bonusLabel: '?', bonusPerLevel: 0, maxLevel: 10 },
  }))
)

const availablePets = computed(() =>
  petDefinitions.slice().sort((a, b) => a.requiredLevel - b.requiredLevel)
)

function isOwned(petId) { return petStore.ownedPets.some(p => p.petId === petId) }

function openPetCard(petId) {
  selectedPetId.value = petId
  petStore.setActivePet(petId)
}

// Selected pet modal computed
const selectedPet    = computed(() => petStore.ownedPets.find(p => p.petId === selectedPetId.value) || null)
const selectedPetDef = computed(() => selectedPetId.value ? petDefinitions.find(d => d.id === selectedPetId.value) || null : null)

const trainingXpNeeded = computed(() => selectedPet.value ? trainingXpForLevel(selectedPet.value.level) : 0)
const xpProgress = computed(() => {
  if (!selectedPet.value || !trainingXpNeeded.value) return 0
  return Math.min(100, (selectedPet.value.trainingXp / trainingXpNeeded.value) * 100)
})

const walkCooldown  = computed(() => selectedPetId.value ? petStore.walkCooldownRemaining(selectedPetId.value) : 0)
const bathCooldown  = computed(() => selectedPetId.value ? petStore.bathCooldownRemaining(selectedPetId.value) : 0)
const trainCooldown = computed(() => selectedPetId.value ? petStore.trainCooldownRemaining(selectedPetId.value) : 0)

const hasFoodInStash = computed(() => {
  if (!selectedPetDef.value || !propertyStore.activeInstance) return false
  return (propertyStore.activeInstance.stash[selectedPetDef.value.foodItemId] || 0) > 0
})

const hasToyInStash = computed(() => {
  if (!selectedPetDef.value) return false
  return petStore.toyUsesFor(selectedPetDef.value.toyItemId) > 0
})

function activeStashQty(itemId) {
  if (!propertyStore.activeInstance || !itemId) return 0
  return propertyStore.activeInstance.stash[itemId] || 0
}

function petMoodClass(pet) {
  const h = pet.happiness
  if (h > 70) return 'mood-happy'
  if (h > 35) return 'mood-neutral'
  return 'mood-sad'
}

function petMoodEmoji(pet) {
  const h = pet.happiness
  if (h > 70) return '😄'
  if (h > 35) return '😐'
  return '😢'
}

function petBonusPct(pet) {
  const def = petDefinitions.find(d => d.id === pet.petId)
  if (!def) return 0
  return ((getPetBonusMultiplier(def, pet.level) - 1) * 100).toFixed(0)
}

function barColor(val) {
  if (val > 60) return 'var(--color-success, #27ae60)'
  if (val > 30) return 'var(--color-warning, #e67e22)'
  return 'var(--color-danger, #e74c3c)'
}

function valColor(val) {
  if (val > 60) return 'text-success'
  if (val > 30) return 'text-warning'
  return 'text-danger'
}

function formatCd(ms) {
  const m = Math.ceil(ms / 60000)
  if (m >= 60) return `${Math.floor(m / 60)}ω${m % 60 ? (m % 60) + 'λ' : ''}`
  return `${m}λ`
}
</script>

<style scoped>
.pet-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); margin-bottom: 2px; }

/* ── Main tabs ── */
.main-tabs {
  display: flex;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0;
}
.main-tab {
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  margin-bottom: -1px;
}
.main-tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
.main-tab:hover:not(.active) { color: var(--text-primary); }

/* ── Shop sub-tabs ── */
.shop-tabs {
  display: flex;
  gap: var(--space-xs);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: 3px;
}
.shop-tab {
  flex: 1;
  padding: var(--space-xs) var(--space-sm);
  background: none;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.shop-tab.active {
  background: var(--color-accent);
  color: var(--bg-base);
}
.shop-tab:hover:not(.active) { background: var(--bg-surface-raised); }

/* ── Pets grid ── */
.pets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--space-sm);
}

.pet-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--space-md) var(--space-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}
.pet-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

.mood-happy  { border-color: rgba(46,204,113,0.4); background: rgba(46,204,113,0.05); }
.mood-neutral{ border-color: rgba(241,196,15,0.35); background: rgba(241,196,15,0.04); }
.mood-sad    { border-color: rgba(231,76,60,0.4); background: rgba(231,76,60,0.05); }

.pet-card-avatar {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-surface-raised);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}
.pet-card-emoji { font-size: 2rem; }
.pet-card-mood {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.85rem;
  background: var(--bg-surface);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
}
.pet-card-name { font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); text-align: center; }
.pet-card-level { font-size: 9px; }
.pet-card-bars { width: 100%; display: flex; flex-direction: column; gap: 3px; margin-top: 2px; }
.pet-mini-bar { display: flex; align-items: center; gap: 3px; width: 100%; }
.mini-track { flex: 1; height: 4px; background: var(--bg-surface-raised); border-radius: 2px; overflow: hidden; }
.mini-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.pet-card-bonus { font-size: 9px; color: var(--color-success, #27ae60); text-align: center; }
.pet-hunger-warn {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 8px;
  background: rgba(230,126,34,0.9);
  color: #fff;
  border-radius: 4px;
  padding: 1px 4px;
}

/* ── Modal overlay ── */
.pet-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
}

.pet-modal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--space-md);
  width: 100%;
  max-width: 380px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.modal-close {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 16px;
  padding: 4px;
  line-height: 1;
}
.modal-close:hover { color: var(--color-danger); }

/* Pet header inside modal */
.pet-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.pet-avatar {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mood-happy  .pet-avatar, .pet-avatar.mood-happy  { background: rgba(46,204,113,0.15); border: 2px solid rgba(46,204,113,0.4); }
.mood-neutral .pet-avatar, .pet-avatar.mood-neutral{ background: rgba(241,196,15,0.12); border: 2px solid rgba(241,196,15,0.3); }
.mood-sad    .pet-avatar, .pet-avatar.mood-sad    { background: rgba(231,76,60,0.12);  border: 2px solid rgba(231,76,60,0.3); }

.pet-emoji { font-size: 2.2rem; line-height: 1; }
.pet-mood-bubble {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 1rem;
  background: var(--bg-surface);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
}

.pet-header-info { flex: 1; min-width: 0; }
.pet-name-row { display: flex; align-items: center; gap: var(--space-xs); margin-bottom: 4px; }
.pet-name { font-size: var(--font-size-md); }
.pet-level-row { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.bonus-chip {
  font-size: 10px;
  background: rgba(46,204,113,0.12);
  border: 1px solid rgba(46,204,113,0.3);
  color: var(--color-success, #27ae60);
  padding: 1px 8px;
  border-radius: var(--border-radius-full);
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}
.stat-block {}
.stat-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 3px;
}
.stat-val { font-family: var(--font-family-mono); font-size: 10px; }
.text-accent  { color: var(--color-accent); }
.text-success { color: var(--color-success, #27ae60); }
.text-warning { color: var(--color-warning, #e67e22); }
.text-danger  { color: var(--color-danger, #e74c3c); }
.bar-track { height: 7px; background: var(--bg-surface-raised); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }

/* Warnings */
.warning-bar {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-sm);
  font-size: 11px;
  text-align: center;
  animation: warnPulse 2s ease infinite;
}
.warn-food   { background: rgba(230,126,34,0.15); color: var(--color-warning, #e67e22); border: 1px solid rgba(230,126,34,0.3); }
.warn-dirty  { background: rgba(52,152,219,0.12); color: #3498db; border: 1px solid rgba(52,152,219,0.3); }
.warn-scratch{ background: rgba(231,76,60,0.1); color: var(--color-danger, #e74c3c); border: 1px solid rgba(231,76,60,0.25); }
@keyframes warnPulse { 0%,100% { opacity:1; } 50% { opacity:0.65; } }

/* Stash status */
.stash-status-row {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}
.stash-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: var(--border-radius-full);
  border: 1px solid;
}
.badge-ok   { background: rgba(46,204,113,0.1); border-color: rgba(46,204,113,0.3); color: var(--color-success, #27ae60); }
.badge-warn { background: rgba(231,76,60,0.1); border-color: rgba(231,76,60,0.3); color: var(--color-danger, #e74c3c); }

/* Walk find */
.walk-find-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
}
.find-good { background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.3); }
.find-junk { background: rgba(127,140,141,0.1); border: 1px solid rgba(127,140,141,0.3); }
.find-icon { font-size: 1.8rem; flex-shrink: 0; }
.find-text { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: var(--font-size-sm); }
.find-dismiss { background: none; border: none; cursor: pointer; color: var(--text-secondary); font-size: 12px; padding: 4px; }
.find-dismiss:hover { color: var(--color-danger); }

/* Action buttons */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
}
.act-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm) var(--space-xs);
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-primary);
}
.act-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--color-accent); }
.act-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.act-icon  { font-size: 1.4rem; line-height: 1; }
.act-label { font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); }
.act-sub   { font-size: 9px; color: var(--text-secondary); text-align: center; }

.act-feed  { border-color: rgba(230,126,34,0.3); }
.act-feed:hover:not(:disabled)  { border-color: #e67e22; }
.act-play  { border-color: rgba(46,204,113,0.3); }
.act-play:hover:not(:disabled)  { border-color: #2ecc71; }
.act-walk  { border-color: rgba(79,195,247,0.3); }
.act-walk:hover:not(:disabled)  { border-color: var(--color-accent); }
.act-bath  { border-color: rgba(52,152,219,0.3); }
.act-bath:hover:not(:disabled)  { border-color: #3498db; }
.act-train { border-color: rgba(155,89,182,0.3); }
.act-train:hover:not(:disabled) { border-color: #9b59b6; }

/* Shop rows */
.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}
.shop-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-color);
}
.shop-row:last-child { border-bottom: none; }
.shop-icon { font-size: 1.5rem; flex-shrink: 0; }
.shop-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
}
.shop-actions { display: flex; align-items: center; gap: var(--space-xs); flex-shrink: 0; }
.shop-price { font-size: var(--font-size-sm); min-width: 50px; text-align: right; }
.stash-info { font-size: 9px; color: var(--color-accent); }

.btn-xs { padding: 2px 8px; font-size: 11px; border-radius: var(--border-radius-sm); }
.mt-sm { margin-top: var(--space-sm); }
</style>
