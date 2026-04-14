/**
 * Contraband goods for the smuggling system.
 * Each good has a base price and city-specific price multipliers.
 * Buy low in one city, sell high in another.
 * Prices fluctuate ±30% every 4 hours (deterministic via hour-of-day seed).
 */

export const contrabandGoods = [
  {
    id: 'cigarettes_bulk',
    name: 'Τσιγάρα (Χαρτώνι)',
    icon: '🚬',
    basePrice: 200,
    rarity: 'common',
    weight: 1, // inventory slots consumed
    // Higher multiplier = more expensive in that city (good to sell)
    cityPrices: {
      athens: 1.0,
      thessaloniki: 0.7,   // cheap — buy here
      patras: 1.1,
      heraklion: 1.3,      // expensive — sell here
      mykonos: 1.5,
      santorini: 1.4,
      corfu: 0.8,
    },
  },
  {
    id: 'hash_bulk',
    name: 'Χασίς (Πακέτο)',
    icon: '🌿',
    basePrice: 500,
    rarity: 'uncommon',
    weight: 1,
    cityPrices: {
      athens: 0.8,
      thessaloniki: 1.0,
      patras: 1.2,
      heraklion: 0.6,      // cheap — Crete grows
      mykonos: 1.8,         // expensive — party island
      santorini: 1.6,
      corfu: 1.3,
    },
  },
  {
    id: 'cocaine_brick',
    name: 'Κοκαΐνη (Τούβλο)',
    icon: '❄️',
    basePrice: 2000,
    rarity: 'rare',
    weight: 2,
    cityPrices: {
      athens: 1.0,
      thessaloniki: 1.1,
      patras: 0.7,          // port — cheap import
      heraklion: 1.4,
      mykonos: 2.0,         // highest demand
      santorini: 1.8,
      corfu: 0.8,           // port — cheap import
    },
  },
  {
    id: 'weapons_crate',
    name: 'Κιβώτιο Όπλων',
    icon: '📦',
    basePrice: 3000,
    rarity: 'rare',
    weight: 3,
    cityPrices: {
      athens: 0.9,
      thessaloniki: 0.7,    // military port — cheap
      patras: 1.2,
      heraklion: 1.5,
      mykonos: 1.3,
      santorini: 1.1,
      corfu: 1.6,           // island demand
    },
  },
  {
    id: 'counterfeit_euros',
    name: 'Πλαστά Ευρώ',
    icon: '💶',
    basePrice: 1000,
    rarity: 'uncommon',
    weight: 1,
    cityPrices: {
      athens: 0.6,          // production center — cheap
      thessaloniki: 1.2,
      patras: 1.3,
      heraklion: 1.5,
      mykonos: 1.0,
      santorini: 0.9,
      corfu: 1.4,
    },
  },
  {
    id: 'stolen_electronics',
    name: 'Κλεμμένα Ηλεκτρονικά',
    icon: '💻',
    basePrice: 800,
    rarity: 'common',
    weight: 2,
    cityPrices: {
      athens: 0.7,          // big city — cheap stolen goods
      thessaloniki: 0.8,
      patras: 1.3,
      heraklion: 1.4,
      mykonos: 1.6,
      santorini: 1.5,
      corfu: 1.2,
    },
  },
  {
    id: 'ancient_artifacts',
    name: 'Αρχαία Αντικείμενα',
    icon: '🏺',
    basePrice: 5000,
    rarity: 'epic',
    weight: 2,
    cityPrices: {
      athens: 1.8,          // museums pay top price
      thessaloniki: 1.3,
      patras: 0.9,
      heraklion: 0.5,       // abundant — cheap
      mykonos: 1.2,
      santorini: 0.6,       // archaeological sites — abundant
      corfu: 1.4,
    },
  },
]

/**
 * Get the current price of a contraband good in a city.
 * Prices fluctuate ±30% based on a 4-hour cycle.
 */
export function getContrabandPrice(good, cityId) {
  const base = good.basePrice * (good.cityPrices[cityId] ?? 1.0)
  // Deterministic fluctuation based on 4-hour window
  const fourHourBlock = Math.floor(Date.now() / (4 * 60 * 60 * 1000))
  const seed = hashCode(`${good.id}_${cityId}_${fourHourBlock}`)
  const fluctuation = 0.7 + (seededRandom(seed) * 0.6) // 0.7 to 1.3
  return Math.floor(base * fluctuation)
}

/**
 * Get all contraband prices for a specific city.
 */
export function getCityContrabandPrices(cityId) {
  return contrabandGoods.map(g => ({
    ...g,
    currentPrice: getContrabandPrice(g, cityId),
  }))
}

/**
 * Simple deterministic hash for seeding.
 */
function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Seeded pseudo-random (0-1).
 */
function seededRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/**
 * Police checkpoint chance based on quantity and rarity.
 */
const RARITY_RISK = { common: 0.05, uncommon: 0.10, rare: 0.15, epic: 0.25, legendary: 0.35 }

export function calculateCheckpointChance(cargo) {
  if (!cargo.length) return 0
  let totalRisk = 0
  for (const item of cargo) {
    const baseRisk = RARITY_RISK[item.rarity] ?? 0.05
    totalRisk += baseRisk * item.quantity
  }
  return Math.min(0.80, totalRisk) // cap at 80%
}
