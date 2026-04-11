import { defineStore } from 'pinia'
import { pickWeightedCityEvent } from '../data/cityExplorationEvents'
import { getItemById } from '../data/items'
import { usePlayerStore } from './playerStore'
import { useInventoryStore } from './inventoryStore'
import { useGameStore } from './gameStore'

const LOG_MAX = 40
const EXPLORATION_COOLDOWN_MS = 30_000

let idSeq = 1

export const useEventsHubStore = defineStore('eventsHub', {
  state: () => ({
    hubUnread: false,
    explorationLog: [],
    lastExplorationAt: null,
  }),

  actions: {
    /**
     * Κλήση μετά από αλλαγή σελίδας: 5% πιθανότητα τυχαίου συμβάντος πόλης.
     */
    maybeTriggerExplorationOnNavigate(toPath, fromPath) {
      if (toPath === fromPath) return
      if (toPath === '/create') return

      const gameStore = useGameStore()
      if (!gameStore.initialized) return

      const player = usePlayerStore()
      if (!player.name) return
      if (player.isIncapacitated) return
      if (player.activeActivity || player.pendingResult) return

      if (this.lastExplorationAt != null && Date.now() - this.lastExplorationAt < EXPLORATION_COOLDOWN_MS) {
        return
      }

      if (Math.random() >= 0.05) return

      const def = pickWeightedCityEvent()
      this.lastExplorationAt = Date.now()

      const game = useGameStore()
      const inventory = useInventoryStore()

      let detail = ''
      let finalMessage = def.message
      let entryKind = 'neutral'

      if (def.effect === 'cash') {
        const amt = def.amount
        if (amt >= 0) {
          player.addCash(amt)
          player.logActivity(`🚶 Πόλη: +€${amt}`, 'cash')
        } else {
          player.removeCash(-amt)
          player.logActivity(`🚶 Πόλη: ${amt}€`, 'danger')
        }
        game.addNotification(finalMessage, amt >= 0 ? 'success' : 'warning')
        entryKind = amt >= 0 ? 'good' : 'bad'
      } else if (def.effect === 'hp') {
        player.modifyResource('hp', def.amount)
        if (player.resources.hp.current < 1) player.resources.hp.current = 1
        game.addNotification(finalMessage, 'danger')
        player.logActivity(`🚶 Πόλη: ${def.message}`, 'danger')
        entryKind = 'bad'
      } else if (def.effect === 'happiness') {
        player.modifyResource('happiness', def.amount)
        game.addNotification(finalMessage, 'info')
        player.logActivity(`🚶 Πόλη: +Κέφι`, 'info')
        entryKind = 'good'
      } else if (def.effect === 'item' && def.itemId) {
        const addResult = inventory.addItem(def.itemId, 1)
        const item = getItemById(def.itemId)
        if (addResult?.ok === false) {
          finalMessage = `${def.message} Η τσέπη σου είναι γεμάτη — το άφησες πίσω.`
          detail = '(Δεν χώρεψε στην τσέπη)'
          game.addNotification(finalMessage, 'warning')
          entryKind = 'bad'
        } else {
          finalMessage = `${def.message} (+1 ${item?.name || def.itemId})`
          game.addNotification(finalMessage, 'success')
          player.logActivity(`🚶 Πόλη: εύρημα ${item?.name || def.itemId}`, 'info')
          entryKind = 'loot'
        }
      }

      const entry = {
        id: `ex_${Date.now()}_${idSeq++}`,
        ts: Date.now(),
        icon: def.icon,
        title: def.title,
        message: finalMessage,
        detail,
        kind: entryKind,
      }

      this.explorationLog.unshift(entry)
      if (this.explorationLog.length > LOG_MAX) this.explorationLog.pop()

      this.hubUnread = true
      game.saveGame()
    },

    markHubRead() {
      this.hubUnread = false
      useGameStore().saveGame()
    },

    getSerializable() {
      return {
        hubUnread: this.hubUnread,
        explorationLog: this.explorationLog.map(e => ({ ...e })),
        lastExplorationAt: this.lastExplorationAt,
      }
    },

    hydrate(data) {
      if (!data) return
      if (typeof data.hubUnread === 'boolean') this.hubUnread = data.hubUnread
      if (Array.isArray(data.explorationLog)) this.explorationLog = data.explorationLog.map(e => ({ ...e }))
      if (data.lastExplorationAt != null) this.lastExplorationAt = data.lastExplorationAt
    },
  },
})
