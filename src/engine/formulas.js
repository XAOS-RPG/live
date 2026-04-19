export const STAMINA_ATTACK_COST = 10
export const STAMINA_REST_REGEN = 30

// ─── Active ability definitions ───────────────────────────────────────────────
export const ABILITY_DEFS = {
  vape: {
    id: 'vape', name: 'Vape', icon: '💨',
    staminaCost: 5,
    /** Heals player for 20% of their max HP */
    apply(s) {
      const heal = Math.floor(s.pMaxHP * 0.2)
      s.pHP = Math.min(s.pMaxHP, s.pHP + heal)
      return [{ turn: s.turn, actor: 'player', action: 'ability', abilityId: 'vape', heal }]
    },
  },
  ftysimo: {
    id: 'ftysimo', name: 'Φτύσιμο', icon: '🫦',
    staminaCost: 2,
    /** Applies Poison to NPC: 5 dmg/turn for 3 turns */
    apply(s) {
      s.npcStatuses.poison = { dmg: 5, turns: 3 }
      return [{ turn: s.turn, actor: 'player', action: 'ability', abilityId: 'ftysimo', status: 'poison' }]
    },
  },
  kolodaktylo: {
    id: 'kolodaktylo', name: 'Κωλοδάχτυλο', icon: '🖕',
    staminaCost: 8,
    /** Reduces NPC effective defense by 15% for the rest of the fight */
    apply(s) {
      s.npcDefDebuff = (s.npcDefDebuff || 0) + 0.15
      return [{ turn: s.turn, actor: 'player', action: 'ability', abilityId: 'kolodaktylo', defDebuff: 0.15 }]
    },
  },
  klotsia: {
    id: 'klotsia', name: 'Κλωτσιά στα @@', icon: '🦵',
    /** Costs 80% of player max stamina */
    staminaCostFn: (pStaminaMax) => Math.floor(pStaminaMax * 0.8),
    /** Huge damage + Stun (NPC skips next turn) */
    apply(s, pStats, playerWeapon) {
      const dmg = Math.floor((pStats.strength * 2.5) * (1 - (s.npcDefDebuff || 0)))
      s.nHP = Math.max(0, s.nHP - dmg)
      s.npcStatuses.stun = { turns: 1 }
      return [{ turn: s.turn, actor: 'player', action: 'ability', abilityId: 'klotsia', damage: dmg, status: 'stun' }]
    },
  },
}

/** Returns stamina cost for an ability given current session state */
export function getAbilityStaminaCost(abilityId, pStaminaMax) {
  const def = ABILITY_DEFS[abilityId]
  if (!def) return 0
  return def.staminaCostFn ? def.staminaCostFn(pStaminaMax) : def.staminaCost
}


export function calculateCrimeSuccess(crime, playerStats, crimeXP, filotimo) {
  const base = crime.baseSuccessRate
  const statBonus = (playerStats[crime.relevantStat] / 100) * crime.statWeight
  const xpBonus = (Math.log10(crimeXP + 1) / Math.log10(1001)) * crime.expWeight
  const filotimoPenalty = crime.tier >= 5 ? Math.max(0, (50 - filotimo) * 0.002) : 0
  return Math.min(0.98, Math.max(0.05, base + statBonus + xpBonus - filotimoPenalty))
}

export function calculateCrimeReward(crime) {
  const cash = crime.rewards.cashMin +
    Math.floor(Math.random() * (crime.rewards.cashMax - crime.rewards.cashMin + 1))
  return {
    cash,
    crimeXP: crime.rewards.crimeXP,
    xp: crime.rewards.xp,
  }
}

export function calculateJailTime(crime) {
  const min = crime.failure.jailTimeMin
  const max = crime.failure.jailTimeMax
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function rollItemDrop(possibleDrops) {
  for (const drop of possibleDrops) {
    if (Math.random() < drop.chance) {
      return drop.itemId
    }
  }
  return null
}

export function calculateCombatDamage(attacker, defender, attackerWeapon) {
  const baseDamage = attacker.strength * 0.8
  const weaponDamage = attackerWeapon ? attackerWeapon.damage : 0
  const rawDamage = baseDamage + weaponDamage
  const defenseReduction = 1 - (defender.defense / (defender.defense + 50))
  const variance = 0.9 + Math.random() * 0.2
  return Math.max(1, Math.floor(rawDamage * defenseReduction * variance))
}

export function calculateHitChance(attacker, defender, weapon) {
  const speedRatio = attacker.speed / Math.max(1, defender.speed)
  const baseHit = 0.5 + (speedRatio - 1) * 0.15
  const dexBonus = attacker.dexterity * 0.003
  const weaponAcc = weapon ? weapon.accuracy : 0.85
  return Math.min(0.95, Math.max(0.15, (baseHit + dexBonus) * weaponAcc))
}

export function resolveCombat(playerStats, playerHP, npc, playerWeapon, npcWeapon, playerStamina = 100) {
  const log = []
  let pHP = playerHP
  let nHP = npc.hp
  let pStamina = playerStamina
  let turn = 0
  const MAX_TURNS = 50
  const npcStatuses = {}
  let npcDefDebuff = 0

  const pStats = { strength: playerStats.strength, speed: playerStats.speed, dexterity: playerStats.dexterity, defense: playerStats.defense }
  const nStats = { strength: npc.stats.strength, speed: npc.stats.speed, dexterity: npc.stats.dexterity, defense: npc.stats.defense }

  while (pHP > 0 && nHP > 0 && turn < MAX_TURNS) {
    turn++

    // Tick NPC poison
    if (npcStatuses.poison?.turns > 0) {
      nHP = Math.max(0, nHP - npcStatuses.poison.dmg)
      log.push({ turn, actor: 'npc', action: 'poison', damage: npcStatuses.poison.dmg })
      npcStatuses.poison.turns--
      if (nHP <= 0) break
    }

    const playerFirst = pStats.speed >= nStats.speed
    const playerAction = pStamina >= STAMINA_ATTACK_COST ? 'attack' : 'rest'
    if (playerAction === 'rest') {
      pStamina = Math.min(100, pStamina + STAMINA_REST_REGEN)
      log.push({ turn, actor: 'player', action: 'rest', staminaAfter: pStamina })
    }

    const attacks = playerFirst
      ? [
          playerAction === 'attack' ? { type: 'player', atk: pStats, def: { ...nStats, defense: nStats.defense * (1 - npcDefDebuff) }, weapon: playerWeapon } : null,
          npcStatuses.stun?.turns > 0 ? null : { type: 'npc', atk: nStats, def: pStats, weapon: npcWeapon }
        ]
      : [
          npcStatuses.stun?.turns > 0 ? null : { type: 'npc', atk: nStats, def: pStats, weapon: npcWeapon },
          playerAction === 'attack' ? { type: 'player', atk: pStats, def: { ...nStats, defense: nStats.defense * (1 - npcDefDebuff) }, weapon: playerWeapon } : null,
        ]

    // Consume stun
    if (npcStatuses.stun?.turns > 0) {
      log.push({ turn, actor: 'npc', action: 'stunned' })
      npcStatuses.stun.turns--
    }

    for (const entry of attacks) {
      if (!entry) continue
      const { type, atk, def, weapon } = entry
      if (type === 'player') pStamina -= STAMINA_ATTACK_COST
      const hit = Math.random() < calculateHitChance(atk, def, weapon)
      if (hit) {
        const dmg = calculateCombatDamage(atk, def, weapon)
        if (type === 'player') nHP -= dmg
        else pHP -= dmg
        log.push({ turn, actor: type, action: 'hit', damage: dmg })
      } else {
        log.push({ turn, actor: type, action: 'miss' })
      }
      if (pHP <= 0 || nHP <= 0) break
    }
  }

  return {
    winner: pHP > 0 ? 'player' : 'npc',
    playerHPRemaining: Math.max(0, pHP),
    playerStaminaRemaining: Math.max(0, pStamina),
    npcHPRemaining: Math.max(0, nHP),
    turns: turn,
    log,
  }
}

export function calculateStatGain(gym, happiness, happinessMax) {
  const base = gym.baseStatGain
  const happinessMultiplier = gym.happinessMultiplier
    ? 1 + (happiness / Math.max(1, happinessMax)) * 0.5
    : 1
  const variance = 0.9 + Math.random() * 0.2
  return base * happinessMultiplier * variance
}

export function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.2, level - 1))
}

export function calculateHospitalTime(playerHP, playerMaxHP, npcLevel) {
  const hpRatio = 1 - (Math.max(0, playerHP) / playerMaxHP)
  const baseMinutes = 0.5 + hpRatio * 2
  const levelBonus = npcLevel * 0.25
  return Math.floor((baseMinutes + levelBonus) * 60 * 1000)
}

export function calculateEscapeChance(remainingTimeMs, dexterity, meson) {
  const timeFactor = Math.min(1, 60000 / Math.max(1, remainingTimeMs))
  const dexFactor = dexterity / (dexterity + 30)
  const mesonFactor = meson * 0.002
  return Math.min(0.50, Math.max(0.03, 0.1 + timeFactor * 0.2 + dexFactor * 0.15 + mesonFactor))
}

export function calculateBribeCost(remainingTimeMs) {
  const seconds = Math.ceil(remainingTimeMs / 1000)
  return Math.max(50, seconds)
}

/**
 * Calculate arrest risk for a smuggling run given vehicle and cargo.
 * The vehicle's avoidance stat reduces the base checkpoint chance.
 * @param {string} vehicleId - from VEHICLES data
 * @param {Array<{rarity: string, quantity: number}>} cargo
 * @returns {number} 0.01–0.80 probability of arrest
 */
export function calculateArrestRisk(vehicleId, cargo) {
  const { calculateCheckpointChance } = require('../data/contraband')
  const { getVehicleById } = require('../data/vehicles')
  const rawRisk = calculateCheckpointChance(cargo)
  const avoidance = getVehicleById(vehicleId)?.avoidance ?? 0
  return Math.max(0.01, Math.min(0.80, rawRisk * (1 - avoidance)))
}

/**
 * Convert a probability (0-1) to d6 dice values.
 * Returns { roll (1-6), targetRoll (1-6), success }.
 * High roll = success. "Φέρε targetRoll και πάνω" to win.
 * Actual success is determined by exact probability, then a matching d6 roll is picked.
 *
 * Probability → target mapping:
 *   ~100% → 1  (need 1+, basically always win)
 *   ~83%  → 2
 *   ~67%  → 3
 *   ~50%  → 4
 *   ~33%  → 5
 *   ~17%  → 6  (need to roll exactly 6)
 */
export function rollD6(successRate) {
  const success = Math.random() < successRate
  const target = Math.max(1, Math.min(6, 7 - Math.round(successRate * 6)))

  let roll
  if (success) {
    roll = target + Math.floor(Math.random() * (7 - target))
  } else {
    if (target <= 1) {
      roll = 1
    } else {
      roll = 1 + Math.floor(Math.random() * (target - 1))
    }
  }

  return { roll, targetRoll: target, success }
}

// ── Neighborhood Wall Mechanics ───────────────────────────────────────────────

/**
 * Damage dealt to a neighborhood wall per attack.
 * Based on attacker strength + dexterity with variance.
 */
export function calculateWallDamage(attackerStats) {
  const base     = (attackerStats.strength ?? 5) * 3
  const dexBonus = (attackerStats.dexterity ?? 5) * 0.5
  const variance = 0.85 + Math.random() * 0.30
  return Math.max(10, Math.floor((base + dexBonus) * variance))
}

/**
 * Filotimo penalty for attacking a much weaker neighborhood owner.
 * Returns { filotimoPenalty, disreputable }.
 */
export function calculateFilotimoAttackPenalty(attackerLevel, defenderLevel) {
  const diff = attackerLevel - defenderLevel
  if (diff > 30) return { filotimoPenalty: 10, disreputable: true }
  if (diff > 20) return { filotimoPenalty: 5, disreputable: false }
  return { filotimoPenalty: 0, disreputable: false }
}

/** @deprecated Use rollD6 instead */
export function rollD10(successRate) {
  const success = Math.random() < successRate
  const target = Math.max(1, Math.min(10, 11 - Math.round(successRate * 10)))
  let roll
  if (success) {
    roll = target + Math.floor(Math.random() * (11 - target))
  } else {
    roll = target <= 1 ? 1 : 1 + Math.floor(Math.random() * (target - 1))
  }
  return { roll, targetRoll: target, success }
}
