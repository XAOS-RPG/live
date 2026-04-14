import { defineStore } from 'pinia'
import {
  STAMINA_ATTACK_COST, STAMINA_REST_REGEN,
  calculateCombatDamage, calculateHitChance,
  ABILITY_DEFS, getAbilityStaminaCost,
} from '../engine/formulas'
import { usePetStore } from './petStore'

export const useCombatStore = defineStore('combat', {
  state: () => ({
    combatHistory: [],
    // { pHP, pStamina, pStaminaMax, pMaxHP, nHP, npc, log, turn, over, winner, npcStatuses, npcDefDebuff }
    session: null,
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
      this.combatHistory.push({ opponentId, isPvp: isPvp || false, won, timestamp: Date.now() })
      if (this.combatHistory.length > 100) this.combatHistory = this.combatHistory.slice(-100)
    },

    startSession(pHP, pMaxHP, pStamina, pStaminaMax, npc) {
      this.session = {
        pHP, pMaxHP,
        pStamina, pStaminaMax,
        nHP: npc.hp,
        npc,
        log: [], turn: 0, over: false, winner: null,
        npcStatuses: {},   // { poison: { dmg, turns }, stun: { turns } }
        npcDefDebuff: 0,   // cumulative fractional defense reduction
      }
    },

    playerAttack(pStats, playerWeapon) {
      if (!this.session || this.session.over) return []
      if (this.session.pStamina < STAMINA_ATTACK_COST) return []
      return this._resolveTurn(pStats, playerWeapon, 'attack', null)
    },

    playerRest(pStats, playerWeapon) {
      if (!this.session || this.session.over) return []
      return this._resolveTurn(pStats, playerWeapon, 'rest', null)
    },

    useAbility(abilityId, pStats, playerWeapon) {
      if (!this.session || this.session.over) return []
      const s = this.session
      const cost = getAbilityStaminaCost(abilityId, s.pStaminaMax)
      if (s.pStamina < cost) return []
      return this._resolveTurn(pStats, playerWeapon, 'ability', abilityId)
    },

    _resolveTurn(pStats, playerWeapon, playerAction, abilityId) {
      const s = this.session
      const nStats = s.npc.stats
      const npcWeapon = s.npc.weapon || null
      s.turn++
      const entries = []

      // --- Tick NPC poison at start of turn ---
      if (s.npcStatuses.poison?.turns > 0) {
        const pdmg = s.npcStatuses.poison.dmg
        s.nHP = Math.max(0, s.nHP - pdmg)
        entries.push({ turn: s.turn, actor: 'npc', action: 'poison', damage: pdmg })
        s.npcStatuses.poison.turns--
        if (s.nHP <= 0) { s.over = true; s.winner = 'player'; s.log.push(...entries); return entries }
      }

      // --- Player action ---
      if (playerAction === 'rest') {
        s.pStamina = Math.min(s.pStaminaMax, s.pStamina + STAMINA_REST_REGEN)
        entries.push({ turn: s.turn, actor: 'player', action: 'rest', staminaAfter: s.pStamina })

      } else if (playerAction === 'ability' && abilityId) {
        const def = ABILITY_DEFS[abilityId]
        if (def) {
          const cost = getAbilityStaminaCost(abilityId, s.pStaminaMax)
          s.pStamina = Math.max(0, s.pStamina - cost)
          const abilityEntries = def.apply(s, pStats, playerWeapon)
          entries.push(...abilityEntries)
          if (s.nHP <= 0) { s.over = true; s.winner = 'player'; s.log.push(...entries); return entries }
        }

      } else {
        // standard attack
        s.pStamina -= STAMINA_ATTACK_COST
        const effNpcDef = { ...nStats, defense: nStats.defense * (1 - s.npcDefDebuff) }
        const hit = Math.random() < calculateHitChance(pStats, effNpcDef, playerWeapon)
        if (hit) {
          const dmg = Math.floor(calculateCombatDamage(pStats, effNpcDef, playerWeapon) * usePetStore().combatDamageBonus)
          s.nHP = Math.max(0, s.nHP - dmg)
          entries.push({ turn: s.turn, actor: 'player', action: 'hit', damage: dmg })
          if (s.nHP <= 0) { s.over = true; s.winner = 'player'; s.log.push(...entries); return entries }
        } else {
          entries.push({ turn: s.turn, actor: 'player', action: 'miss' })
        }
      }

      // --- NPC action (skip if stunned) ---
      if (s.npcStatuses.stun?.turns > 0) {
        entries.push({ turn: s.turn, actor: 'npc', action: 'stunned' })
        s.npcStatuses.stun.turns--
      } else {
        const hit = Math.random() < calculateHitChance(nStats, pStats, npcWeapon)
        if (hit) {
          const dmg = calculateCombatDamage(nStats, pStats, npcWeapon)
          s.pHP = Math.max(0, s.pHP - dmg)
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
      return { combatHistory: this.combatHistory.slice(-100) }
    },

    hydrate(data) {
      if (!data) return
      if (data.combatHistory) this.combatHistory = data.combatHistory
    },
  },
})
