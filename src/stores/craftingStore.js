import { defineStore } from 'pinia'
import { recipes, getRecipeById, getDefaultRecipes, diceToMultiplier } from '../data/recipes'
import { getItemById } from '../data/items'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'

export const useCraftingStore = defineStore('crafting', {
  state: () => ({
    discoveredRecipes: [],
    craftingXp: 0,
    totalCrafted: 0,
    // Tracks dice multiplier for each crafted item slot: { inventoryIndex → multiplier }
    // We store per-itemId the last roll multiplier (overwritten each craft)
    craftedBuffs: {}, // { itemId: multiplier }
  }),

  getters: {
    knownRecipes() {
      return this.discoveredRecipes.map(id => getRecipeById(id)).filter(Boolean)
    },
    undiscoveredCount() {
      return recipes.length - this.discoveredRecipes.length
    },
  },

  actions: {
    initDefaults() {
      for (const id of getDefaultRecipes()) {
        if (!this.discoveredRecipes.includes(id)) this.discoveredRecipes.push(id)
      }
    },

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

    startCrafting(recipeId) {
      const recipe = getRecipeById(recipeId)
      if (!recipe) return { started: false, message: 'Άγνωστη συνταγή!' }

      const player = usePlayerStore()
      const inventory = useInventoryStore()

      if (!player.canAct) return { started: false, message: 'Δεν μπορείς να κάνεις κάτι τώρα!' }
      if (player.level < recipe.levelRequired) return { started: false, message: `Χρειάζεσαι Level ${recipe.levelRequired}!` }
      if (!this.discoveredRecipes.includes(recipeId)) return { started: false, message: 'Δεν ξέρεις αυτή τη συνταγή!' }

      for (const ing of recipe.ingredients) {
        const owned = inventory.items.find(i => i.itemId === ing.itemId)
        if (!owned || owned.quantity < ing.quantity) {
          const item = getItemById(ing.itemId)
          return { started: false, message: `Λείπει: ${item?.name || ing.itemId} ×${ing.quantity}` }
        }
      }

      // Pre-roll d6 for quality multiplier
      const roll = Math.floor(Math.random() * 6) + 1
      const multiplier = diceToMultiplier(roll)

      for (const ing of recipe.ingredients) inventory.removeItem(ing.itemId, ing.quantity)

      player.startActivity({
        type: 'crafting',
        id: recipeId,
        label: recipe.name,
        icon: recipe.icon,
        duration: recipe.craftTime,
        preRolled: { success: true, roll, targetRoll: 1, recipeId, multiplier },
      })

      useGameStore().saveGame()
      return { started: true }
    },

    completeCrafting(result) {
      const recipe = getRecipeById(result.recipeId || result.id)
      if (!recipe) return

      const player = usePlayerStore()
      const inventory = useInventoryStore()
      const gameStore = useGameStore()

      const roll = result.roll ?? 1
      const multiplier = result.multiplier ?? diceToMultiplier(roll)

      inventory.addItem(recipe.result.itemId, recipe.result.quantity)

      // Store the multiplier for this item type
      this.craftedBuffs[recipe.result.itemId] = parseFloat(multiplier.toFixed(2))

      this.craftingXp += recipe.xpReward
      this.totalCrafted++
      player.addXP(recipe.xpReward)

      const resultItem = getItemById(recipe.result.itemId)
      const resultName = resultItem?.name || recipe.result.itemId
      const rollLabel = roll === 6 ? '🌟 Τέλειο!' : roll === 1 ? '😞 Αδύναμο' : `×${multiplier.toFixed(2)}`

      gameStore.addNotification(`🔨 ${resultName} — Ζάρι: ${roll} (${rollLabel})`, 'success')
      player.logActivity(`🔨 Κατασκευή: ${recipe.name} → ${resultName} ×${multiplier.toFixed(2)}`, 'info')
      gameStore.saveGame()
    },

    /** Returns the stored dice multiplier for a crafted item (default 1.0 for non-crafted) */
    getItemMultiplier(itemId) {
      return this.craftedBuffs[itemId] ?? 1.0
    },

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

    tryRandomDiscovery() {
      const undiscovered = recipes.filter(r => !this.discoveredRecipes.includes(r.id))
      if (!undiscovered.length || Math.random() > 0.10) return false
      return this.discoverRecipe(undiscovered[Math.floor(Math.random() * undiscovered.length)].id)
    },

    getSerializable() {
      return {
        discoveredRecipes: [...this.discoveredRecipes],
        craftingXp: this.craftingXp,
        totalCrafted: this.totalCrafted,
        craftedBuffs: { ...this.craftedBuffs },
      }
    },

    hydrate(data) {
      if (!data) return
      if (Array.isArray(data.discoveredRecipes)) this.discoveredRecipes = [...data.discoveredRecipes]
      if (data.craftingXp !== undefined) this.craftingXp = data.craftingXp
      if (data.totalCrafted !== undefined) this.totalCrafted = data.totalCrafted
      if (data.craftedBuffs) this.craftedBuffs = { ...data.craftedBuffs }
    },
  },
})
