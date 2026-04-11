/**
 * All game formulas in one place for easy balancing.
 */

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

export function resolveCombat(playerStats, playerHP, npc, playerWeapon, npcWeapon) {
  const log = []
  let pHP = playerHP
  let nHP = npc.hp
  let turn = 0
  const MAX_TURNS = 50

  const pStats = { strength: playerStats.strength, speed: playerStats.speed, dexterity: playerStats.dexterity, defense: playerStats.defense }
  const nStats = { strength: npc.stats.strength, speed: npc.stats.speed, dexterity: npc.stats.dexterity, defense: npc.stats.defense }

  while (pHP > 0 && nHP > 0 && turn < MAX_TURNS) {
    turn++
    const playerFirst = pStats.speed >= nStats.speed

    const attacks = playerFirst
      ? [{ type: 'player', atk: pStats, def: nStats, weapon: playerWeapon },
         { type: 'npc',    atk: nStats, def: pStats, weapon: npcWeapon }]
      : [{ type: 'npc',    atk: nStats, def: pStats, weapon: npcWeapon },
         { type: 'player', atk: pStats, def: nStats, weapon: playerWeapon }]

    for (const { type, atk, def, weapon } of attacks) {
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
