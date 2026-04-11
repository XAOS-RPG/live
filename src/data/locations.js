/**
 * Greek locations for the travel system.
 * Each location has unique bonuses for crimes, items, NPCs.
 * Travel times are in milliseconds.
 */

export const locations = [
  {
    id: 'athens',
    name: 'Αθήνα',
    description: 'Η πρωτεύουσα. Κέντρο εγκλήματος και εμπορίου.',
    icon: '🏛️',
    isHub: true,
    travelTimeFrom: {},  // hub - base for all travel times
    bonuses: {
      crimeReward: 1.0,
      shopDiscount: 1.0,
      gymBoost: 1.0,
    },
    specialItems: [],
    color: '#0D5EAF',
  },
  {
    id: 'thessaloniki',
    name: 'Θεσσαλονίκη',
    description: 'Η συμπρωτεύουσα. Μεγάλο λιμάνι, λαθρεμπόριο.',
    icon: '🌊',
    isHub: false,
    travelTimeFrom: {
      athens: 300000,       // 5 min
      patras: 240000,       // 4 min
      heraklion: 420000,    // 7 min
      mykonos: 360000,      // 6 min
      santorini: 420000,    // 7 min
      corfu: 180000,        // 3 min
    },
    bonuses: {
      crimeReward: 1.1,     // +10% crime cash
      shopDiscount: 0.95,   // 5% cheaper shops
      gymBoost: 1.0,
    },
    specialItems: ['cigarette_carton'],
    color: '#E74C3C',
  },
  {
    id: 'patras',
    name: 'Πάτρα',
    description: 'Πύλη προς τη Δύση. Ναυτιλία και καρναβάλι.',
    icon: '🎭',
    isHub: false,
    travelTimeFrom: {
      athens: 120000,       // 2 min
      thessaloniki: 240000,
      heraklion: 360000,    // 6 min
      mykonos: 300000,      // 5 min
      santorini: 360000,
      corfu: 180000,
    },
    bonuses: {
      crimeReward: 0.9,
      shopDiscount: 0.90,   // 10% cheaper
      gymBoost: 1.0,
    },
    specialItems: [],
    color: '#2ECC71',
  },
  {
    id: 'heraklion',
    name: 'Ηράκλειο',
    description: 'Η Κρήτη. Σκληροί άνθρωποι, αρχαία μυστικά.',
    icon: '🏺',
    isHub: false,
    travelTimeFrom: {
      athens: 240000,       // 4 min
      thessaloniki: 420000,
      patras: 360000,
      mykonos: 180000,      // 3 min
      santorini: 120000,    // 2 min
      corfu: 480000,        // 8 min
    },
    bonuses: {
      crimeReward: 1.15,    // +15% crime cash (Κρήτη σκληρή)
      shopDiscount: 1.0,
      gymBoost: 1.2,        // +20% gym gains (Κρήτη δυνατή)
    },
    specialItems: ['ancient_coin', 'ancient_vase'],
    color: '#F39C12',
  },
  {
    id: 'mykonos',
    name: 'Μύκονος',
    description: 'Νησί χλιδής. Ακριβά πράγματα, μεγάλα κέρδη.',
    icon: '🏖️',
    isHub: false,
    travelTimeFrom: {
      athens: 180000,       // 3 min
      thessaloniki: 360000,
      patras: 300000,
      heraklion: 180000,
      santorini: 120000,    // 2 min
      corfu: 420000,
    },
    bonuses: {
      crimeReward: 1.25,    // +25% crime cash (tourists!)
      shopDiscount: 1.20,   // 20% more expensive
      gymBoost: 0.8,        // -20% gym (too much partying)
    },
    specialItems: ['jewelry', 'sunglasses'],
    color: '#9B59B6',
  },
  {
    id: 'santorini',
    name: 'Σαντορίνη',
    description: 'Ηφαιστειογενές νησί. Τουρισμός και μυστήριο.',
    icon: '🌅',
    isHub: false,
    travelTimeFrom: {
      athens: 240000,       // 4 min
      thessaloniki: 420000,
      patras: 360000,
      heraklion: 120000,
      mykonos: 120000,
      corfu: 480000,
    },
    bonuses: {
      crimeReward: 1.2,     // +20% crime cash
      shopDiscount: 1.15,   // 15% more expensive
      gymBoost: 0.9,
    },
    specialItems: [],
    color: '#E67E22',
  },
  {
    id: 'corfu',
    name: 'Κέρκυρα',
    description: 'Ιόνιο νησί. Βενετσιάνικη ατμόσφαιρα, λαθρεμπόριο θαλάσσιο.',
    icon: '⛵',
    isHub: false,
    travelTimeFrom: {
      athens: 240000,       // 4 min
      thessaloniki: 180000,
      patras: 180000,
      heraklion: 480000,
      mykonos: 420000,
      santorini: 480000,
    },
    bonuses: {
      crimeReward: 1.05,
      shopDiscount: 0.92,   // 8% cheaper
      gymBoost: 1.1,        // +10% gym
    },
    specialItems: ['cigarette_carton'],
    color: '#1ABC9C',
  },
]

export function getLocationById(id) {
  return locations.find(l => l.id === id) || null
}

export function getTravelTime(fromId, toId) {
  if (fromId === toId) return 0
  const to = getLocationById(toId)
  if (!to) return 0
  // Check direct from→to
  if (to.travelTimeFrom[fromId]) return to.travelTimeFrom[fromId]
  // Check reverse (symmetric)
  const from = getLocationById(fromId)
  if (from && from.travelTimeFrom[toId]) return from.travelTimeFrom[toId]
  // Default fallback
  return 300000 // 5 min
}
