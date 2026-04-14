import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

export const SPECIALIZATIONS = {
  ektelestis: {
    id: 'ektelestis',
    name: 'Εκτελεστής',
    icon: '🗡️',
    description: 'Παθητικό: +10% σε όλη τη ζημιά μάχης και άμυνα.',
    type: 'passive',
  },
  xaker: {
    id: 'xaker',
    name: 'Χάκερ',
    icon: '💻',
    description: 'Ενεργό: Ολοκλήρωσε άμεσα οποιοδήποτε ενεργό έγκλημα. Cooldown 24 ώρες.',
    type: 'active',
    cooldownMs: 24 * 60 * 60 * 1000,
  },
  epixeirimaties: {
    id: 'epixeirimaties',
    name: 'Επιχειρηματίας',
    icon: '💼',
    description: 'Παθητικό: +10% σε παθητικό εισόδημα εταιρείας και μερίσματα μετοχών.',
    type: 'passive',
  },
}

export const useClassStore = defineStore('class', {
  state: () => ({
    specialization: null,       // null | 'ektelestis' | 'xaker' | 'epixeirimaties'
    xakerLastUsed: null,        // timestamp ms
    showChoiceModal: false,
  }),

  getters: {
    spec(state) {
      return state.specialization ? SPECIALIZATIONS[state.specialization] : null
    },

    isEktelestis(state) { return state.specialization === 'ektelestis' },
    isXaker(state)      { return state.specialization === 'xaker' },
    isEpixeirimaties(state) { return state.specialization === 'epixeirimaties' },

    /** Multiplier applied to combat damage and defense (Εκτελεστής) */
    combatBonus(state) { return state.specialization === 'ektelestis' ? 1.10 : 1.0 },

    /** Multiplier applied to company income and stock dividends (Επιχειρηματίας) */
    businessBonus(state) { return state.specialization === 'epixeirimaties' ? 1.10 : 1.0 },

    xakerCooldownRemaining(state) {
      if (!state.xakerLastUsed) return 0
      const elapsed = Date.now() - state.xakerLastUsed
      return Math.max(0, SPECIALIZATIONS.xaker.cooldownMs - elapsed)
    },

    canUseXaker() {
      return this.isXaker && this.xakerCooldownRemaining === 0
    },
  },

  actions: {
    /** Called when player reaches level 3 and has no specialization yet */
    checkSpecializationUnlock() {
      const player = usePlayerStore()
      if (!this.specialization && player.level >= 3) {
        this.showChoiceModal = true
      }
    },

    choose(specId) {
      if (this.specialization) return // already chosen — permanent
      if (!SPECIALIZATIONS[specId]) return
      this.specialization = specId
      this.showChoiceModal = false
      const gameStore = useGameStore()
      gameStore.addNotification(`Ειδικότητα: ${SPECIALIZATIONS[specId].name} επιλέχθηκε!`, 'success')
      gameStore.saveGame()
    },

    /** Χάκερ active skill — instantly completes the active crime timer */
    useXakerSkill() {
      if (!this.canUseXaker) return false
      const player = usePlayerStore()
      if (!player.activeActivity || player.activeActivity.type !== 'crime') return false
      // Force the activity to appear expired by setting timeScale to a huge number
      player.activeActivity.timeScale = 999999
      this.xakerLastUsed = Date.now()
      useGameStore().addNotification('💻 Χάκερ: Έγκλημα ολοκληρώθηκε άμεσα!', 'success')
      return true
    },

    getSerializable() {
      return {
        specialization: this.specialization,
        xakerLastUsed: this.xakerLastUsed,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.specialization !== undefined) this.specialization = data.specialization
      if (data.xakerLastUsed !== undefined) this.xakerLastUsed = data.xakerLastUsed
    },
  },
})
