import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useCardStore } from './cardStore'

const ENCOUNTERS = [
  {
    id: 'elderly',
    icon: '👴',
    title: 'Ηλικιωμένος στον δρόμο',
    description: 'Ένας ηλικιωμένος έχει πέσει και χρειάζεται βοήθεια. Τι κάνεις;',
    helpLabel: 'Βοήθησέ τον',
    helpFilotimo: 3,
    helpHappiness: 5,
    stealLabel: 'Κλέψε το πορτοφόλι του',
    stealCash: 50,
  },
  {
    id: 'lost_wallet',
    icon: '👛',
    title: 'Χαμένο πορτοφόλι',
    description: 'Βρίσκεις ένα πορτοφόλι με €50 και ταυτότητα. Τι κάνεις;',
    helpLabel: 'Επέστρεψέ το',
    helpFilotimo: 4,
    helpHappiness: 3,
    stealLabel: 'Κράτα τα χρήματα',
    stealCash: 50,
  },
  {
    id: 'stray_dog',
    icon: '🐕',
    title: 'Αδέσποτο σκυλί',
    description: 'Ένα αδέσποτο σκυλί είναι τραυματισμένο. Τι κάνεις;',
    helpLabel: 'Πήγαινέ το στον κτηνίατρο',
    helpFilotimo: 3,
    helpHappiness: 8,
    stealLabel: 'Αγνόησέ το και πάρε τα τρόφιμά του',
    stealCash: 30,
  },
  {
    id: 'fire',
    icon: '🔥',
    title: 'Φωτιά σε κάδο',
    description: 'Ένας κάδος σκουπιδιών έχει πάρει φωτιά κοντά σε κατοικίες.',
    helpLabel: 'Σβήσε τη φωτιά',
    helpFilotimo: 5,
    helpHappiness: 4,
    stealLabel: 'Εκμεταλλεύσου τη σύγχυση για κλοπή',
    stealCash: 80,
  },
  {
    id: 'beggar',
    icon: '🙏',
    title: 'Άστεγος στον δρόμο',
    description: 'Ένας άστεγος σε παρακαλά για λίγα χρήματα για φαγητό.',
    helpLabel: 'Δώσε του χρήματα',
    helpFilotimo: 3,
    helpHappiness: 6,
    stealLabel: 'Πάρε τα λίγα πράγματά του',
    stealCash: 20,
  },
]

export const ENCOUNTER_CHANCE = 0.05

export const useEncounterStore = defineStore('encounter', {
  state: () => ({
    current: null,  // active encounter object or null
  }),

  actions: {
    /** Call after crime or gym completion — 5% chance to trigger */
    maybetrigger() {
      if (this.current) return
      if (Math.random() >= ENCOUNTER_CHANCE) return
      const enc = ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)]
      this.current = enc
    },

    resolve(choice) {
      if (!this.current) return
      const enc = this.current
      this.current = null

      const player = usePlayerStore()
      const gameStore = useGameStore()
      const cardStore = useCardStore()

      if (choice === 'help') {
        if (player.resources.energy.current < 5) {
          gameStore.addNotification('Δεν έχεις αρκετή ενέργεια!', 'danger')
          return
        }
        player.modifyResource('energy', -5)
        const filotimoGain = Math.round(enc.helpFilotimo * cardStore.filotimoBonus)
        player.addFilotimoRaw(filotimoGain)
        player.modifyResource('happiness', enc.helpHappiness)
        gameStore.addNotification(`${enc.icon} Βοήθησες! +${filotimoGain} Φιλότιμο`, 'success')
        player.logActivity(`${enc.icon} Τυχαία Συνάντηση: ${enc.title} +${filotimoGain} Φιλότιμο`, 'info')
      } else if (choice === 'steal') {
        player.addCash(enc.stealCash)
        player.addFilotimoRaw(-10)
        gameStore.addNotification(`${enc.icon} Έκλεψες +€${enc.stealCash} -10 Φιλότιμο`, 'danger')
        player.logActivity(`${enc.icon} Τυχαία Συνάντηση: Κλοπή +€${enc.stealCash}`, 'danger')
      }
      // 'ignore' — no effect, no log

      gameStore.saveGame()
    },
  },
})
