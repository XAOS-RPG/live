<template>
  <div class="workshop-page">
    <h2 class="page-title">🔨 Εργαστήριο</h2>
    <p class="page-sub text-muted">Συνδύασε αντικείμενα για να φτιάξεις σπάνιο εξοπλισμό.</p>

    <!-- Active crafting -->
    <div v-if="isCrafting" class="card crafting-active-card">
      <div class="crafting-header">
        <span style="font-size: 2rem;">{{ player.activeActivity.icon }}</span>
        <div>
          <strong>{{ player.activeActivity.label }}</strong>
          <span class="text-muted" style="font-size: 10px; display: block;">Κατασκευάζεται...</span>
        </div>
      </div>
      <div class="bar-track" style="margin-top: 8px;">
        <div class="bar-fill" :style="{ width: (player.activityProgress * 100) + '%', background: 'var(--color-accent)' }" />
      </div>
      <span class="text-muted" style="font-size: 10px;">{{ formatTime(player.activityTimeRemaining) }}</span>
    </div>

    <!-- Stats -->
    <div class="card">
      <div class="stat-row">
        <span class="text-muted">Crafting XP:</span>
        <span class="text-mono">{{ crafting.craftingXp }}</span>
      </div>
      <div class="stat-row">
        <span class="text-muted">Αντικείμενα κατασκευασμένα:</span>
        <span class="text-mono">{{ crafting.totalCrafted }}</span>
      </div>
      <div class="stat-row">
        <span class="text-muted">Γνωστές συνταγές:</span>
        <span class="text-mono">{{ crafting.discoveredRecipes.length }}/{{ totalRecipes }}</span>
      </div>
    </div>

    <!-- Recipe list -->
    <div class="card">
      <h3 class="section-title">📜 Συνταγές</h3>
      <div v-if="crafting.knownRecipes.length === 0" class="text-muted text-center" style="padding: var(--space-md);">
        Δεν ξέρεις καμία συνταγή ακόμα.
      </div>
      <div v-for="recipe in recipesWithStatus" :key="recipe.id" class="recipe-row">
        <span class="recipe-icon">{{ recipe.icon }}</span>
        <div class="recipe-info">
          <strong>{{ recipe.name }}</strong>
          <div class="recipe-ingredients">
            <span v-for="ing in recipe.ingredientDetails" :key="ing.itemId" class="ingredient"
              :class="{ 'ingredient-missing': !ing.hasEnough }">
              {{ ing.icon }} {{ ing.name }} x{{ ing.quantity }}
              <span class="text-muted">({{ ing.owned }}/{{ ing.quantity }})</span>
            </span>
          </div>
          <div class="recipe-result text-muted" style="font-size: 10px;">
            → {{ recipe.resultIcon }} {{ recipe.resultName }} x{{ recipe.result.quantity }}
            · {{ formatTime(recipe.craftTime) }}
            · +{{ recipe.xpReward }} XP
          </div>
        </div>
        <div class="recipe-actions">
          <button
            class="btn btn-sm btn-success"
            :disabled="!recipe.canCraft || !player.canAct"
            @click="startCraft(recipe.id)"
          >
            Φτιάξε
          </button>
        </div>
      </div>
    </div>

    <!-- Undiscovered hint -->
    <div v-if="crafting.undiscoveredCount > 0" class="card text-center" style="padding: var(--space-md);">
      <p class="text-muted" style="font-size: 11px;">
        🔍 {{ crafting.undiscoveredCount }} ακόμα συνταγές περιμένουν να ανακαλυφθούν...
        <br>Κάνε εγκλήματα, πολέμα, ή εξερεύνα για να τις βρεις!
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useCraftingStore } from '../stores/craftingStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { getItemById } from '../data/items'
import { recipes } from '../data/recipes'

const player = usePlayerStore()
const crafting = useCraftingStore()
const inventory = useInventoryStore()

const totalRecipes = recipes.length

const isCrafting = computed(() =>
  player.activeActivity?.type === 'crafting'
)

const recipesWithStatus = computed(() =>
  crafting.knownRecipes.map(recipe => {
    const ingredientDetails = recipe.ingredients.map(ing => {
      const item = getItemById(ing.itemId)
      const owned = inventory.items.find(i => i.itemId === ing.itemId)?.quantity || 0
      return {
        itemId: ing.itemId,
        name: item?.name || ing.itemId,
        icon: item?.icon || '❓',
        quantity: ing.quantity,
        owned,
        hasEnough: owned >= ing.quantity,
      }
    })

    const resultItem = getItemById(recipe.result.itemId)

    return {
      ...recipe,
      ingredientDetails,
      resultName: resultItem?.name || recipe.result.itemId,
      resultIcon: resultItem?.icon || '❓',
      canCraft: crafting.canCraft(recipe.id),
    }
  })
)

function startCraft(recipeId) {
  crafting.startCrafting(recipeId)
}

// Auto-complete crafting when pendingResult arrives
watch(() => player.pendingResult, (result) => {
  if (result && result.type === 'crafting') {
    crafting.completeCrafting(result.recipeId)
    player.clearPendingResult()
  }
}, { immediate: true })

function formatTime(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min >= 60) {
    const hr = Math.floor(min / 60)
    const m = min % 60
    return `${hr}ω ${m}λ`
  }
  return `${min}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.workshop-page {
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

.crafting-active-card { border-left: 3px solid var(--color-accent); }

.crafting-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
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

.recipe-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-color);
}
.recipe-row:last-child { border-bottom: none; }

.recipe-icon { font-size: 1.5rem; flex-shrink: 0; margin-top: 2px; }

.recipe-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-sm);
}

.recipe-ingredients {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ingredient {
  font-size: 10px;
  background: var(--bg-surface-raised);
  padding: 1px 6px;
  border-radius: var(--border-radius-sm);
  white-space: nowrap;
}

.ingredient-missing {
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  background: rgba(229, 57, 53, 0.1);
}

.recipe-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-color);
}
.stat-row:last-child { border-bottom: none; }
</style>
