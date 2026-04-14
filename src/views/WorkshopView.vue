<template>
  <div class="workshop-page">
    <h2 class="page-title">🔨 Κατασκευές & Πατέντες</h2>
    <p class="page-sub text-muted">Συνδύασε υλικά και φτιάξε εξοπλισμό. Το ζάρι καθορίζει την ποιότητα.</p>

    <!-- Active crafting -->
    <div v-if="isCrafting" class="card crafting-active-card">
      <div class="crafting-header">
        <span style="font-size: 2rem;">{{ player.activeActivity.icon }}</span>
        <div>
          <strong>{{ player.activeActivity.label }}</strong>
          <span class="text-muted" style="font-size: 10px; display: block;">Κατασκευάζεται...</span>
        </div>
      </div>
      <div class="bar-track">
        <div class="bar-fill" :style="{ width: (player.activityProgress * 100) + '%' }" />
      </div>
      <span class="text-muted" style="font-size: 10px;">{{ formatTime(player.activityTimeRemaining) }}</span>
    </div>

    <!-- Dice result -->
    <div v-if="lastRoll" class="card dice-result-card" :class="diceClass(lastRoll.roll)">
      <span class="dice-face">🎲 {{ lastRoll.roll }}</span>
      <div>
        <strong>{{ lastRoll.name }}</strong>
        <span class="text-muted" style="font-size: 11px; display: block;">
          Πολλαπλασιαστής: ×{{ lastRoll.multiplier.toFixed(2) }}
          {{ lastRoll.roll === 6 ? '🌟 Τέλειο!' : lastRoll.roll === 1 ? '😞 Αδύναμο' : '' }}
        </span>
      </div>
    </div>

    <!-- Stats -->
    <div class="card stats-row">
      <div class="stat-item">
        <span class="text-muted">XP</span>
        <span class="text-mono">{{ crafting.craftingXp }}</span>
      </div>
      <div class="stat-item">
        <span class="text-muted">Κατασκευές</span>
        <span class="text-mono">{{ crafting.totalCrafted }}</span>
      </div>
      <div class="stat-item">
        <span class="text-muted">Συνταγές</span>
        <span class="text-mono">{{ crafting.discoveredRecipes.length }}/{{ totalRecipes }}</span>
      </div>
    </div>

    <!-- Materials in inventory -->
    <div class="card">
      <h3 class="section-title">🧰 Υλικά στην Τσέπη</h3>
      <div class="materials-grid">
        <div v-for="mat in materialsOwned" :key="mat.id" class="mat-chip" :class="{ 'mat-zero': mat.qty === 0 }">
          <span>{{ mat.icon }}</span>
          <span>{{ mat.name }}</span>
          <span class="mat-qty">×{{ mat.qty }}</span>
        </div>
      </div>
      <p class="text-muted hint">Ύφασμα & Μπαταρία αγοράζονται από το Μαρκετ. Τα υπόλοιπα πέφτουν από εγκλήματα.</p>
    </div>

    <!-- Category filter -->
    <div class="cat-bar">
      <button v-for="c in categories" :key="c.key" class="cat-btn" :class="{ active: activeCat === c.key }" @click="activeCat = c.key">
        {{ c.label }}
      </button>
    </div>

    <!-- Recipe list -->
    <div class="card">
      <h3 class="section-title">📜 Συνταγές</h3>
      <div v-for="recipe in filteredRecipes" :key="recipe.id" class="recipe-row">
        <span class="recipe-icon">{{ recipe.icon }}</span>
        <div class="recipe-info">
          <strong>{{ recipe.name }}</strong>
          <div class="recipe-ingredients">
            <span
              v-for="ing in recipe.ingredientDetails"
              :key="ing.itemId"
              class="ingredient"
              :class="{ 'ingredient-missing': !ing.hasEnough }"
            >
              {{ ing.icon }} {{ ing.name }} ×{{ ing.quantity }}
              <span class="text-muted">({{ ing.owned }})</span>
            </span>
          </div>
          <div class="recipe-meta">
            <span class="badge-result">→ {{ recipe.resultIcon }} {{ recipe.resultName }}</span>
            <span class="text-muted">{{ formatTime(recipe.craftTime) }}</span>
            <span class="text-muted">+{{ recipe.xpReward }} XP</span>
            <span v-if="recipe.statusEffect" class="badge-status" :class="'status-' + recipe.statusEffect">
              {{ statusLabel(recipe.statusEffect) }}
            </span>
            <span v-if="crafting.craftedBuffs[recipe.result.itemId]" class="badge-mult">
              ×{{ crafting.craftedBuffs[recipe.result.itemId].toFixed(2) }}
            </span>
          </div>
        </div>
        <button
          class="btn btn-sm btn-success"
          :disabled="!recipe.canCraft || !player.canAct"
          @click="startCraft(recipe.id)"
        >
          Φτιάξε
        </button>
      </div>
      <div v-if="!filteredRecipes.length" class="text-muted hint text-center">Δεν υπάρχουν συνταγές σε αυτή την κατηγορία.</div>
    </div>

    <!-- Dice legend -->
    <div class="card dice-legend">
      <h3 class="section-title">🎲 Ζάρι Ποιότητας</h3>
      <div class="dice-grid">
        <div v-for="r in 6" :key="r" class="dice-cell" :class="diceClass(r)">
          <span class="dice-num">{{ r }}</span>
          <span class="dice-mult">×{{ diceToMultiplier(r).toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useCraftingStore } from '../stores/craftingStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { getItemById, CRAFTING_MATERIALS } from '../data/items'
import { recipes, diceToMultiplier } from '../data/recipes'

const player = usePlayerStore()
const crafting = useCraftingStore()
const inventory = useInventoryStore()

const totalRecipes = recipes.length
const activeCat = ref('all')
const lastRoll = ref(null)

const categories = [
  { key: 'all',    label: 'Όλα' },
  { key: 'weapon', label: '⚔️ Όπλα' },
  { key: 'armor',  label: '🛡️ Πανοπλία' },
]

const isCrafting = computed(() => player.activeActivity?.type === 'crafting')

const materialsOwned = computed(() =>
  CRAFTING_MATERIALS.map(mat => ({
    ...mat,
    qty: inventory.items.find(i => i.itemId === mat.id)?.quantity || 0,
  }))
)

const recipesWithStatus = computed(() =>
  crafting.knownRecipes.map(recipe => {
    const ingredientDetails = recipe.ingredients.map(ing => {
      const item = getItemById(ing.itemId)
      const owned = inventory.items.find(i => i.itemId === ing.itemId)?.quantity || 0
      return { itemId: ing.itemId, name: item?.name || ing.itemId, icon: item?.icon || '❓', quantity: ing.quantity, owned, hasEnough: owned >= ing.quantity }
    })
    const resultItem = getItemById(recipe.result.itemId)
    return {
      ...recipe,
      ingredientDetails,
      resultName: resultItem?.name || recipe.result.itemId,
      resultIcon: resultItem?.icon || '❓',
      statusEffect: resultItem?.statusEffect || null,
      canCraft: crafting.canCraft(recipe.id),
    }
  })
)

const filteredRecipes = computed(() => {
  if (activeCat.value === 'all') return recipesWithStatus.value
  return recipesWithStatus.value.filter(r => r.category === activeCat.value)
})

function startCraft(recipeId) {
  crafting.startCrafting(recipeId)
}

watch(() => player.pendingResult, (result) => {
  if (result?.type === 'crafting') {
    crafting.completeCrafting(result)
    lastRoll.value = {
      roll: result.roll,
      multiplier: result.multiplier ?? diceToMultiplier(result.roll),
      name: result.label,
    }
    player.clearPendingResult()
  }
}, { immediate: true })

function diceClass(roll) {
  if (roll <= 2) return 'dice-bad'
  if (roll <= 4) return 'dice-ok'
  return 'dice-good'
}

function statusLabel(effect) {
  return { burn: '🔥 Burn', stun: '⚡ Stun', bleed: '🩸 Bleed' }[effect] || effect
}

function formatTime(ms) {
  if (!ms || ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min >= 60) return `${Math.floor(min / 60)}ω ${min % 60}λ`
  return `${min}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.workshop-page { display: flex; flex-direction: column; gap: var(--space-md); }
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

.crafting-active-card { border-left: 3px solid var(--color-accent); }
.crafting-header { display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xs); }
.bar-track { height: 6px; background: var(--bg-surface-raised); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.bar-fill { height: 100%; background: var(--color-accent); border-radius: 3px; transition: width 0.3s; }

/* Dice result */
.dice-result-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  border-left: 3px solid var(--color-accent);
}
.dice-face { font-size: 1.8rem; }
.dice-bad  { border-left-color: var(--color-danger) !important; }
.dice-ok   { border-left-color: var(--color-warning) !important; }
.dice-good { border-left-color: var(--color-success) !important; }

/* Stats row */
.stats-row { display: flex; justify-content: space-around; }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: var(--font-size-sm); }

/* Materials */
.materials-grid { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-xs); }
.mat-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-full);
  font-size: 11px;
}
.mat-zero { opacity: 0.4; }
.mat-qty { font-weight: bold; color: var(--color-accent); }
.hint { font-size: 10px; margin: 4px 0 0; }

/* Category bar */
.cat-bar { display: flex; gap: var(--space-xs); }
.cat-btn {
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.cat-btn.active { background: var(--color-accent); border-color: var(--color-accent); color: var(--bg-base); }

/* Recipes */
.recipe-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-color);
}
.recipe-row:last-child { border-bottom: none; }
.recipe-icon { font-size: 1.5rem; flex-shrink: 0; margin-top: 2px; }
.recipe-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; font-size: var(--font-size-sm); }

.recipe-ingredients { display: flex; flex-wrap: wrap; gap: 4px; }
.ingredient {
  font-size: 10px;
  background: var(--bg-surface-raised);
  padding: 1px 6px;
  border-radius: var(--border-radius-sm);
}
.ingredient-missing { color: var(--color-danger); border: 1px solid var(--color-danger); background: rgba(229,57,53,0.1); }

.recipe-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 10px; }
.badge-result { color: var(--color-accent); font-weight: bold; }
.badge-status { padding: 1px 5px; border-radius: var(--border-radius-sm); font-size: 10px; font-weight: bold; }
.status-burn  { background: rgba(255,87,34,0.2); color: #ff5722; }
.status-stun  { background: rgba(255,193,7,0.2);  color: #ffc107; }
.status-bleed { background: rgba(229,57,53,0.2);  color: #e53935; }
.badge-mult { background: rgba(79,195,247,0.15); color: var(--color-accent); padding: 1px 5px; border-radius: var(--border-radius-sm); font-size: 10px; font-weight: bold; }

/* Dice legend */
.dice-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--space-xs); }
.dice-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xs);
  border-radius: var(--border-radius-md);
  background: var(--bg-surface-raised);
  font-size: 11px;
}
.dice-num { font-size: 1.1rem; font-weight: bold; }
.dice-mult { font-size: 10px; color: var(--text-secondary); }
.dice-cell.dice-bad  { border: 1px solid var(--color-danger); }
.dice-cell.dice-ok   { border: 1px solid var(--color-warning); }
.dice-cell.dice-good { border: 1px solid var(--color-success); }

.text-muted   { color: var(--text-secondary); }
.text-mono    { font-family: var(--font-family-mono); font-size: 11px; }
.text-center  { text-align: center; }
</style>
