<template>
  <div class="pet-page">
    <h2 class="page-title">🐾 Κατοικίδια</h2>
    <p class="page-sub text-muted">Φρόντισε το κατοικίδιό σου και πάρε bonuses.</p>

    <!-- ── ACTIVE PET CARD ── -->
    <div v-if="activePet" class="card active-pet-card">

      <!-- Header -->
      <div class="pet-header">
        <div class="pet-avatar" :class="petMoodClass">
          <span class="pet-emoji">{{ activePetDef.icon }}</span>
          <span class="pet-mood-bubble">{{ petMoodEmoji }}</span>
        </div>
        <div class="pet-header-info">
          <div class="pet-name-row">
            <strong class="pet-name">{{ activePetDef.name }}</strong>
            <span class="active-badge">Ενεργό</span>
          </div>
          <div class="pet-level-row">
            <span class="text-muted" style="font-size:11px">Level {{ activePet.level }}/{{ activePetDef.maxLevel }}</span>
            <span class="bonus-chip">{{ activePetDef.bonusLabel }}: +{{ bonusPercent }}%</span>
          </div>
        </div>
      </div>

      <!-- Status bars — 2x2 grid -->
      <div class="stats-grid">
        <!-- Happiness -->
        <div class="stat-block">
          <div class="stat-label-row">
            <span>😊 Χαρά</span>
            <span class="stat-val" :class="valColor(activePet.happiness)">{{ activePet.happiness }}/100</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: activePet.happiness + '%', background: barColor(activePet.happiness) }" />
          </div>
        </div>

        <!-- XP -->
        <div class="stat-block">
          <div class="stat-label-row">
            <span>⭐ XP</span>
            <span class="stat-val text-accent" v-if="activePet.level < activePetDef.maxLevel">{{ activePet.trainingXp }}/{{ trainingXpNeeded }}</span>
            <span class="stat-val" v-else style="color:#f1c40f">MAX</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: xpProgress + '%', background: 'var(--color-accent)' }" />
          </div>
        </div>

        <!-- Food -->
        <div class="stat-block">
          <div class="stat-label-row">
            <span>🍖 Τροφή</span>
            <span class="stat-val" :class="valColor(activePet.food ?? 100)">{{ activePet.food ?? 100 }}/100</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: (activePet.food ?? 100) + '%', background: barColor(activePet.food ?? 100) }" />
          </div>
        </div>

        <!-- Cleanliness -->
        <div class="stat-block">
          <div class="stat-label-row">
            <span>🛁 Καθαριότητα</span>
            <span class="stat-val" :class="valColor(activePet.cleanliness ?? 100)">{{ activePet.cleanliness ?? 100 }}/100</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: (activePet.cleanliness ?? 100) + '%', background: barColor(activePet.cleanliness ?? 100) }" />
          </div>
        </div>
      </div>

      <!-- Warnings -->
      <div v-if="petStore.petNeedsFeeding(activePet.petId)" class="warning-bar warn-food">
        🍖 Πεινάει! Τάισέ το πριν φύγει!
      </div>
      <div v-if="(activePet.cleanliness ?? 100) < 25" class="warning-bar warn-dirty">
        🛁 Είναι βρώμικο! Κάνε μπάνιο!
      </div>

      <!-- Walk find result -->
      <div v-if="petStore.lastWalkFind && petStore.lastWalkFind.petId === activePet.petId" class="walk-find-card" :class="petStore.lastWalkFind.isJunk ? 'find-junk' : 'find-good'">
        <span class="find-icon">{{ petStore.lastWalkFind.itemIcon }}</span>
        <div class="find-text">
          <strong v-if="!petStore.lastWalkFind.isJunk">Βρήκε: {{ petStore.lastWalkFind.itemName }}</strong>
          <strong v-else>Έφερε: {{ petStore.lastWalkFind.itemName }}</strong>
          <span class="text-muted" style="font-size:10px">{{ petStore.lastWalkFind.isJunk ? 'Πετάχτηκε...' : 'Προστέθηκε στην τσέπη σου' }}</span>
        </div>
        <button class="find-dismiss" @click="petStore.lastWalkFind = null">✕</button>
      </div>

      <!-- Action buttons -->
      <div class="actions-grid">
        <button class="act-btn act-feed" @click="petStore.feedPet(activePet.petId)">
          <span class="act-icon">🍖</span>
          <span class="act-label">Τάισε</span>
          <span class="act-sub">€{{ activePetDef.feedCost }}</span>
        </button>

        <button class="act-btn act-play" @click="petStore.playWithPet(activePet.petId)">
          <span class="act-icon">🎾</span>
          <span class="act-label">Παίξε</span>
          <span class="act-sub">+30 Χαρά</span>
        </button>

        <button
          class="act-btn act-walk"
          :disabled="!petStore.isWalkable(activePet.petId) || walkCooldown > 0"
          @click="petStore.walkPet(activePet.petId)"
        >
          <span class="act-icon">🦮</span>
          <span class="act-label">Βόλτα</span>
          <span class="act-sub">{{ walkCooldown > 0 ? formatCd(walkCooldown) : petStore.isWalkable(activePet.petId) ? 'Βρίσκει αντικ.' : 'Δ/Υ' }}</span>
        </button>

        <button
          class="act-btn act-bath"
          :disabled="bathCooldown > 0"
          @click="petStore.bathPet(activePet.petId)"
        >
          <span class="act-icon">🛁</span>
          <span class="act-label">Μπάνιο</span>
          <span class="act-sub">{{ bathCooldown > 0 ? formatCd(bathCooldown) : '+Καθαριότητα' }}</span>
        </button>

        <button
          class="act-btn act-train"
          :disabled="trainCooldown > 0 || activePet.level >= activePetDef.maxLevel"
          @click="petStore.trainPet(activePet.petId)"
        >
          <span class="act-icon">📚</span>
          <span class="act-label">Εκπαίδευση</span>
          <span class="act-sub">{{ activePet.level >= activePetDef.maxLevel ? 'MAX' : trainCooldown > 0 ? formatCd(trainCooldown) : '-10 Ενέργεια' }}</span>
        </button>
      </div>
    </div>

    <div v-else-if="petStore.hasPet" class="card text-center text-muted" style="padding:var(--space-md)">
      Δεν έχεις ενεργό κατοικίδιο. Επίλεξε ένα παρακάτω.
    </div>

    <!-- ── OWNED PETS ── -->
    <div v-if="petStore.ownedPets.length > 0" class="card">
      <h3 class="section-title">📋 Τα Κατοικίδιά σου</h3>
      <div v-for="pet in ownedPetsWithDef" :key="pet.petId" class="pet-row">
        <span class="pet-row-icon">{{ pet.def.icon }}</span>
        <div class="pet-row-info">
          <strong>{{ pet.def.name }}</strong>
          <span class="text-muted" style="font-size:10px">
            Lv.{{ pet.level }} · {{ pet.def.bonusLabel }}: +{{ ((getPetBonusMultiplier(pet.def, pet.level) - 1) * 100).toFixed(0) }}%
          </span>
        </div>
        <div class="pet-row-bars">
          <div class="mini-bar-wrap" title="Τροφή">
            <span style="font-size:9px">🍖</span>
            <div class="mini-bar-track"><div class="mini-bar-fill" :style="{ width: (pet.food ?? 100) + '%', background: barColor(pet.food ?? 100) }" /></div>
          </div>
          <div class="mini-bar-wrap" title="Καθαριότητα">
            <span style="font-size:9px">🛁</span>
            <div class="mini-bar-track"><div class="mini-bar-fill" :style="{ width: (pet.cleanliness ?? 100) + '%', background: barColor(pet.cleanliness ?? 100) }" /></div>
          </div>
        </div>
        <div class="pet-row-actions">
          <span v-if="pet.petId === petStore.activePetId" class="active-tag">✓</span>
          <button v-else class="btn btn-xs btn-primary" @click="petStore.setActivePet(pet.petId)">Ενεργοποίηση</button>
        </div>
      </div>
    </div>

    <!-- ── PET SHOP ── -->
    <div class="card">
      <h3 class="section-title">🏪 Κατάστημα Κατοικιδίων</h3>
      <div v-for="def in availablePets" :key="def.id" class="shop-row">
        <span class="shop-icon">{{ def.icon }}</span>
        <div class="shop-info">
          <strong>{{ def.name }}</strong>
          <span class="text-muted" style="font-size:10px">{{ def.description }}</span>
          <span class="text-muted" style="font-size:10px">
            {{ def.bonusLabel }}: +{{ (def.bonusPerLevel * 100).toFixed(0) }}%/lv · Τροφή: €{{ def.feedCost }}/φορά
            <span v-if="WALKABLE_PETS.includes(def.id)"> · 🦮 Βόλτα</span>
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

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { usePetStore } from '../stores/petStore'
import { petDefinitions, getPetBonusMultiplier, trainingXpForLevel } from '../data/pets'

const WALKABLE_PETS = ['stray_dog', 'pitbull', 'cat']

const player   = usePlayerStore()
const petStore = usePetStore()

const activePet    = computed(() => petStore.activePet)
const activePetDef = computed(() => petStore.activePetDef)

const trainingXpNeeded = computed(() => activePet.value ? trainingXpForLevel(activePet.value.level) : 0)
const xpProgress       = computed(() => {
  if (!activePet.value || !trainingXpNeeded.value) return 0
  return Math.min(100, (activePet.value.trainingXp / trainingXpNeeded.value) * 100)
})
const bonusPercent = computed(() => {
  if (!activePet.value || !activePetDef.value) return 0
  return ((getPetBonusMultiplier(activePetDef.value, activePet.value.level) - 1) * 100).toFixed(0)
})

const walkCooldown  = computed(() => activePet.value ? petStore.walkCooldownRemaining(activePet.value.petId) : 0)
const bathCooldown  = computed(() => activePet.value ? petStore.bathCooldownRemaining(activePet.value.petId) : 0)
const trainCooldown = computed(() => activePet.value ? petStore.trainCooldownRemaining(activePet.value.petId) : 0)

const petMoodClass = computed(() => {
  if (!activePet.value) return ''
  const h = activePet.value.happiness
  if (h > 70) return 'mood-happy'
  if (h > 35) return 'mood-neutral'
  return 'mood-sad'
})

const petMoodEmoji = computed(() => {
  if (!activePet.value) return ''
  const h = activePet.value.happiness
  if (h > 70) return '😄'
  if (h > 35) return '😐'
  return '😢'
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

function isOwned(petId) { return petStore.ownedPets.some(p => p.petId === petId) }

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
.page-sub   { font-size: var(--font-size-xs); margin: 0 0 var(--space-sm); }

.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

/* ── Active pet card ── */
.active-pet-card { border-left: 3px solid var(--color-accent); }

.pet-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
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
  transition: background 0.3s;
}
.mood-happy  { background: rgba(46,204,113,0.15); border: 2px solid rgba(46,204,113,0.4); }
.mood-neutral{ background: rgba(241,196,15,0.12); border: 2px solid rgba(241,196,15,0.3); }
.mood-sad    { background: rgba(231,76,60,0.12);  border: 2px solid rgba(231,76,60,0.3); }

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

.pet-name-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: 4px;
}
.pet-name { font-size: var(--font-size-md); }

.active-badge {
  font-size: 9px;
  background: var(--color-accent);
  color: var(--bg-base);
  padding: 1px 7px;
  border-radius: var(--border-radius-full);
  font-weight: var(--font-weight-bold);
}

.pet-level-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.bonus-chip {
  font-size: 10px;
  background: rgba(46,204,113,0.12);
  border: 1px solid rgba(46,204,113,0.3);
  color: var(--color-success, #27ae60);
  padding: 1px 8px;
  border-radius: var(--border-radius-full);
}

/* ── Stats grid 2x2 ── */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
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

.bar-track {
  height: 7px;
  background: var(--bg-surface-raised);
  border-radius: 4px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

/* ── Warnings ── */
.warning-bar {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-sm);
  font-size: 11px;
  text-align: center;
  margin-bottom: var(--space-xs);
  animation: warnPulse 2s ease infinite;
}
.warn-food  { background: rgba(230,126,34,0.15); color: var(--color-warning, #e67e22); border: 1px solid rgba(230,126,34,0.3); }
.warn-dirty { background: rgba(52,152,219,0.12); color: #3498db; border: 1px solid rgba(52,152,219,0.3); }
@keyframes warnPulse { 0%,100% { opacity:1; } 50% { opacity:0.65; } }

/* ── Walk find ── */
.walk-find-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--space-xs);
  animation: slideIn 0.3s ease;
}
.find-good { background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.3); }
.find-junk { background: rgba(127,140,141,0.1); border: 1px solid rgba(127,140,141,0.3); }
@keyframes slideIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

.find-icon { font-size: 1.8rem; flex-shrink: 0; }
.find-text { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: var(--font-size-sm); }
.find-dismiss {
  background: none; border: none; cursor: pointer;
  color: var(--text-secondary); font-size: 12px; padding: 4px;
  flex-shrink: 0;
}
.find-dismiss:hover { color: var(--color-danger); }

/* ── Action buttons ── */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
  margin-top: var(--space-sm);
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
.act-sub   { font-size: 9px; color: var(--text-secondary); }

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

/* ── Owned pets list ── */
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

.pet-row-bars {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 60px;
  flex-shrink: 0;
}
.mini-bar-wrap { display: flex; align-items: center; gap: 3px; }
.mini-bar-track {
  flex: 1;
  height: 4px;
  background: var(--bg-surface-raised);
  border-radius: 2px;
  overflow: hidden;
}
.mini-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }

.pet-row-actions, .shop-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.active-tag { color: var(--color-success, #27ae60); font-weight: bold; font-size: 14px; }

.shop-price { font-size: var(--font-size-sm); min-width: 50px; text-align: right; }

.btn-xs { padding: 2px 8px; font-size: 11px; border-radius: var(--border-radius-sm); }
</style>
