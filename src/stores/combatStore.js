import { defineStore } from 'pinia'
import {
  STAMINA_ATTACK_COST, STAMINA_REST_REGEN,
  calculateCombatDamage, calculateHitChance,
  ABILITY_DEFS, getAbilityStaminaCost,
} from '../engine/formulas'
import { usePetStore } from './petStore'
import { useCraftingStore } from './craftingStore'

// Status effect tick constants
const STATUS_DEFS = {
  burn:  { dmgPerTurn: 6, turns: 3 },
  bleed: { dmgPerTurn: 4, turns: 4 },
  stun:  { turns: 1 },
}

/** Apply on-hit status effect from a crafted weapon */
function applyWeaponStatus(s, weapon, turn) {
  if (!weapon?.statusEffect) return []
  const def = STATUS_DEFS[weapon.statusEffect]
  if (!def) return []
  // 40% chance to proc per hit
  if (Math.random() > 0.40) return []
  const effect = weapon.statusEffect
  if (effect === 'stun') {
    s.npcStatuses.stun = { turns: def.turns }
  } else {
    s.npcStatuses[effect] = { dmg: def.dmgPerTurn, turns: def.turns }
  }
  return [{ turn, actor: 'player', action: 'status', status: effect }]
}

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
        npcStatuses: {},   // { burn: {dmg,turns}, bleed: {dmg,turns}, stun: {turns}, poison: {dmg,turns} }
        npcDefDebuff: 0,
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

      // --- Tick NPC DoT statuses at start of turn (poison, burn, bleed) ---
      for (const effect of ['poison', 'burn', 'bleed']) {
        const st = s.npcStatuses[effect]
        if (st?.turns > 0) {
          s.nHP = Math.max(0, s.nHP - st.dmg)
          entries.push({ turn: s.turn, actor: 'npc', action: effect, damage: st.dmg })
          st.turns--
          if (s.nHP <= 0) { s.over = true; s.winner = 'player'; s.log.push(...entries); return entries }
        }
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
          const craftMultiplier = playerWeapon ? useCraftingStore().getItemMultiplier(playerWeapon.id) : 1.0
          const rawDmg = Math.floor(calculateCombatDamage(pStats, effNpcDef, playerWeapon) * usePetStore().combatDamageBonus * craftMultiplier)
          const dmg = rawDmg
          s.nHP = Math.max(0, s.nHP - dmg)
          entries.push({ turn: s.turn, actor: 'player', action: 'hit', damage: dmg })
          // Status effect proc
          entries.push(...applyWeaponStatus(s, playerWeapon, s.turn))
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
