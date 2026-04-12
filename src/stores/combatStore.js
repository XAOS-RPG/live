import { defineStore } from 'pinia'
import { STAMINA_ATTACK_COST, STAMINA_REST_REGEN, calculateCombatDamage, calculateHitChance } from '../engine/formulas'

export const useCombatStore = defineStore('combat', {
  state: () => ({
    combatHistory: [],
    // Active turn-based session state
    session: null, // { pHP, pStamina, nHP, npc, log, turn, over, winner }
  }),

  getters: {
    combatStats() {
      const wins = this.combatHistory.filter(h => h.won).length
      const total = this.combatHistory.length
      return {
        wins,
        losses: total - wins,
        total,
        winRate: total > 0 ? (wins / total * 100).toFixed(1) : '0',
      }
    },
  },

  actions: {
    recordHistory({ opponentId, isPvp, won }) {
      this.combatHistory.push({
        opponentId,
        isPvp: isPvp || false,
        won,
        timestamp: Date.now(),
      })
      if (this.combatHistory.length > 100) {
        this.combatHistory = this.combatHistory.slice(-100)
      }
    },

    /** Start a turn-based session. pStamina comes from playerStore.resources.stamina.current */
    startSession(pHP, pStamina, npc) {
      this.session = { pHP, pStamina, nHP: npc.hp, npc, log: [], turn: 0, over: false, winner: null }
    },

    /** Player attacks — costs STAMINA_ATTACK_COST. Returns log entries for this turn. */
    playerAttack(pStats, playerWeapon) {
      if (!this.session || this.session.over) return []
      if (this.session.pStamina < STAMINA_ATTACK_COST) return []
      return this._resolveTurn(pStats, playerWeapon, 'attack')
    },

    /** Player rests — skips attack, regens stamina. */
    playerRest(pStats, playerWeapon) {
      if (!this.session || this.session.over) return []
      return this._resolveTurn(pStats, playerWeapon, 'rest')
    },

    /** Stub: trigger an equipped active ability by id. */
    useAbility(abilityId, pStats, playerWeapon) {
      if (!this.session || this.session.over) return []
      // TODO: implement per-ability effects; for now treat as attack
      console.log(`[ability stub] ${abilityId} triggered`)
      return this._resolveTurn(pStats, playerWeapon, 'attack')
    },

    _resolveTurn(pStats, playerWeapon, playerAction) {
      const s = this.session
      const nStats = s.npc.stats
      const npcWeapon = s.npc.weapon || null
      s.turn++
      const entries = []

      if (playerAction === 'rest') {
        s.pStamina = Math.min(100, s.pStamina + STAMINA_REST_REGEN)
        entries.push({ turn: s.turn, actor: 'player', action: 'rest', staminaAfter: s.pStamina })
      } else {
        s.pStamina -= STAMINA_ATTACK_COST
        const hit = Math.random() < calculateHitChance(pStats, nStats, playerWeapon)
        if (hit) {
          const dmg = calculateCombatDamage(pStats, nStats, playerWeapon)
          s.nHP -= dmg
          entries.push({ turn: s.turn, actor: 'player', action: 'hit', damage: dmg })
        } else {
          entries.push({ turn: s.turn, actor: 'player', action: 'miss' })
        }
      }

      if (s.nHP > 0) {
        const hit = Math.random() < calculateHitChance(nStats, pStats, npcWeapon)
        if (hit) {
          const dmg = calculateCombatDamage(nStats, pStats, npcWeapon)
          s.pHP -= dmg
          entries.push({ turn: s.turn, actor: 'npc', action: 'hit', damage: dmg })
        } else {
          entries.push({ turn: s.turn, actor: 'npc', action: 'miss' })
        }
      }

      s.log.push(...entries)

      if (s.pHP <= 0 || s.nHP <= 0) {
        s.over = true
        s.winner = s.pHP > 0 ? 'player' : 'npc'
      }

      return entries
    },

    clearSession() {
      this.session = null
    },

    getSerializable() {
      return {
        combatHistory: this.combatHistory.slice(-100),
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.combatHistory) this.combatHistory = data.combatHistory
    },
  },
})
