// ── Car Catalog ─────────────────────────────────────────────────────────────
// Stats are 0-100. They affect race performance in the upcoming race engine.
export const CAR_CATALOG = [
  {
    id: 'fiat_punto',
    name: 'Fiat Punto',
    icon: '🚗',
    price: 3500,
    stats: { speed: 35, acceleration: 38, handling: 42 },
    description: 'Μικρό αλλά σβέλτο για αρχή.',
  },
  {
    id: 'vw_golf',
    name: 'VW Golf GTI',
    icon: '🚙',
    price: 12000,
    stats: { speed: 54, acceleration: 57, handling: 60 },
    description: 'Γερμανική ακρίβεια στους ελληνικούς δρόμους.',
  },
  {
    id: 'honda_civic',
    name: 'Honda Civic Type-R',
    icon: '🚗',
    price: 20000,
    stats: { speed: 65, acceleration: 70, handling: 72 },
    description: 'VTEC απογειώνεται στα φανάρια!',
  },
  {
    id: 'bmw_m3',
    name: 'BMW M3',
    icon: '🏎️',
    price: 38000,
    stats: { speed: 78, acceleration: 74, handling: 80 },
    description: 'Η χαρά της οδήγησης — διάσημη για λόγο.',
  },
  {
    id: 'subaru_wrx',
    name: 'Subaru Impreza WRX STI',
    icon: '🏎️',
    price: 55000,
    stats: { speed: 84, acceleration: 82, handling: 77 },
    description: 'Turbo 4WD θηρίο. Νικάει σε κάθε στροφή.',
  },
  {
    id: 'ferrari_f355',
    name: 'Ferrari F355',
    icon: '🏎️',
    price: 130000,
    stats: { speed: 96, acceleration: 93, handling: 90 },
    description: 'Ιταλικό πάθος. Για όσους δεν χρειάζονται δεύτερα ευκαιρία.',
  },
]

// ── Upgrades Catalog ─────────────────────────────────────────────────────────
// Upgrades are per-car and stack. Cost scales per level: baseCost * (costMultiplier ^ level)
export const UPGRADES_CATALOG = [
  {
    id: 'engine',
    name: 'Αναβάθμιση Μηχανής',
    icon: '⚙️',
    stat: 'speed',
    bonusPerLevel: 10,
    maxLevel: 3,
    baseCost: 3000,
    costMultiplier: 1.8,
    description: '+10 Ταχύτητα ανά επίπεδο',
  },
  {
    id: 'brakes',
    name: 'Υψηλής Απόδοσης Φρένα',
    icon: '🛑',
    stat: 'handling',
    bonusPerLevel: 8,
    maxLevel: 3,
    baseCost: 2000,
    costMultiplier: 1.7,
    description: '+8 Χειρισμός ανά επίπεδο',
  },
  {
    id: 'suspension',
    name: 'Sport Ανάρτηση',
    icon: '🔧',
    stat: 'handling',
    bonusPerLevel: 10,
    maxLevel: 3,
    baseCost: 2500,
    costMultiplier: 1.7,
    description: '+10 Χειρισμός ανά επίπεδο',
  },
  {
    id: 'turbo',
    name: 'Τούρμπο Kit',
    icon: '💨',
    stat: 'acceleration',
    bonusPerLevel: 15,
    maxLevel: 2,
    baseCost: 5000,
    costMultiplier: 2.0,
    description: '+15 Επιτάχυνση ανά επίπεδο',
  },
]

// Nitro consumable config (not a per-car upgrade)
export const NITRO_CONFIG = {
  usesPerPurchase: 3,
  cost: 500,
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function getCarById(id) {
  return CAR_CATALOG.find(c => c.id === id) ?? null
}

export function getUpgradeById(id) {
  return UPGRADES_CATALOG.find(u => u.id === id) ?? null
}

/** Cost to buy the NEXT level of an upgrade (0-indexed current level). */
export function upgradeCost(upgrade, currentLevel) {
  return Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel))
}
