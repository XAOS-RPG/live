import { defineStore } from 'pinia'
import { recipes, getRecipeById, getDefaultRecipes } from '../data/recipes'
import { getItemById } from '../data/items'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'

export const useCraftingStore = defineStore('crafting', {
  state: () => ({
    discoveredRecipes: [], // recipe IDs the player knows
    craftingXp: 0,
    totalCrafted: 0,
  }),

  getters: {
    knownRecipes() {
      return this.discoveredRecipes
        .map(id => getRecipeById(id))
        .filter(Boolean)
    },

    undiscoveredCount() {
      return recipes.length - this.discoveredRecipes.length
    },
  },

  actions: {
    /**
     * Initialize default recipes for new players.
     */
    initDefaults() {
      const defaults = getDefaultRecipes()
      for (const id of defaults) {
        if (!this.discoveredRecipes.includes(id)) {
          this.discoveredRecipes.push(id)
        }
      }
    },

    /**
     * Check if the player has all required ingredients.
     */
    canCraft(recipeId) {
      const recipe = getRecipeById(recipeId)
      if (!recipe) return false

      const player = usePlayerStore()
      if (player.level < recipe.levelRequired) return false
      if (!this.discoveredRecipes.includes(recipeId)) return false

      const inventory = useInventoryStore()
      for (const ing of recipe.ingredients) {
        const owned = inventory.items.find(i => i.itemId === ing.itemId)
        if (!owned || owned.quantity < ing.quantity) return false
      }
      return true
    },

    /**
     * Start crafting — consumes ingredients, starts activity timer.
     */
    startCrafting(recipeId) {
      const recipe = getRecipeById(recipeId)
      if (!recipe) return { started: false, message: 'Άγνωστη συνταγή!' }

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const inventory = useInventoryStore()

      if (!player.canAct) {
        return { started: false, message: 'Δεν μπορείς να κάνεις κάτι τώρα!' }
      }

      if (player.level < recipe.levelRequired) {
        return { started: false, message: `Χρειάζεσαι Level ${recipe.levelRequired}!` }
      }

      if (!this.discoveredRecipes.includes(recipeId)) {
        return { started: false, message: 'Δεν ξέρεις αυτή τη συνταγή!' }
      }

      // Check ingredients
      for (const ing of recipe.ingredients) {
        const owned = inventory.items.find(i => i.itemId === ing.itemId)
        if (!owned || owned.quantity < ing.quantity) {
          const item = getItemById(ing.itemId)
          return { started: false, message: `Λείπει: ${item?.name || ing.itemId} x${ing.quantity}` }
        }
      }

      // Consume ingredients
      for (const ing of recipe.ingredients) {
        inventory.removeItem(ing.itemId, ing.quantity)
      }

      // Start activity
      player.startActivity({
        type: 'crafting',
        id: recipeId,
        label: recipe.name,
        icon: recipe.icon,
        duration: recipe.craftTime,
        preRolled: {
          success: true,
          roll: 1,
          targetRoll: 100,
          recipeId,
        },
      })

      gameStore.saveGame()
      return { started: true }
    },

    /**
     * Called when crafting activity completes.
     */
    completeCrafting(recipeId) {
      const recipe = getRecipeById(recipeId)
      if (!recipe) return

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const inventory = useInventoryStore()

      // Give result items
      inventory.addItem(recipe.result.itemId, recipe.result.quantity)

      // XP
      this.craftingXp += recipe.xpReward
      this.totalCrafted++
      player.addXP(recipe.xpReward)

      const resultItem = getItemById(recipe.result.itemId)
      const resultName = resultItem?.name || recipe.result.itemId

      gameStore.addNotification(`🔨 Έφτιαξες: ${resultName} x${recipe.result.quantity}!`, 'success')
      player.logActivity(`🔨 Crafting: ${recipe.name} → ${resultName} x${recipe.result.quantity}`, 'info')
      gameStore.saveGame()
    },

    /**
     * Discover a new recipe (from events, crimes, etc.).
     */
    discoverRecipe(recipeId) {
      if (this.discoveredRecipes.includes(recipeId)) return false
      const recipe = getRecipeById(recipeId)
      if (!recipe) return false

      this.discoveredRecipes.push(recipeId)
      const gameStore = useGameStore()
      gameStore.addNotification(`📜 Νέα Συνταγή: ${recipe.name}!`, 'success')
      usePlayerStore().logActivity(`📜 Ανακάλυψες συνταγή: ${recipe.name}`, 'info')
      gameStore.saveGame()
      return true
    },

    /**
     * Try to discover a random undiscovered recipe (chance-based).
     */
    tryRandomDiscovery() {
      const undiscovered = recipes.filter(r => !this.discoveredRecipes.includes(r.id))
      if (undiscovered.length === 0) return false

      // 10% chance per attempt
      if (Math.random() > 0.10) return false

      const recipe = undiscovered[Math.floor(Math.random() * undiscovered.length)]
      return this.discoverRecipe(recipe.id)
    },

    getSerializable() {
      return {
        discoveredRecipes: [...this.discoveredRecipes],
        craftingXp: this.craftingXp,
        totalCrafted: this.totalCrafted,
      }
    },

    hydrate(data) {
      if (!data) return
      if (Array.isArray(data.discoveredRecipes)) this.discoveredRecipes = [...data.discoveredRecipes]
      if (data.craftingXp !== undefined) this.craftingXp = data.craftingXp
      if (data.totalCrafted !== undefined) this.totalCrafted = data.totalCrafted
    },
  },
})
