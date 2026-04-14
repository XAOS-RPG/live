/**
 * Crafting recipes for the Workshop system.
 * Each recipe requires specific items and produces a result.
 * Some recipes are discovered, others are known from the start.
 */

export const recipes = [
  // === Weapons ===
  {
    id: 'makeshift_knife',
    name: 'Αυτοσχέδιο Μαχαίρι',
    icon: '🔪',
    category: 'weapon',
    ingredients: [
      { itemId: 'lighter', quantity: 1 },
      { itemId: 'watch_cheap', quantity: 1 },
    ],
    result: { itemId: 'switchblade', quantity: 1 },
    craftTime: 10 * 60 * 1000, // 10 min
    xpReward: 15,
    levelRequired: 1,
    discoveredByDefault: true,
  },
  {
    id: 'reinforced_bat',
    name: 'Ενισχυμένο Ρόπαλο',
    icon: '🏏',
    category: 'weapon',
    ingredients: [
      { itemId: 'bat', quantity: 1 },
      { itemId: 'car_radio', quantity: 1 },
    ],
    result: { itemId: 'axe', quantity: 1 },
    craftTime: 20 * 60 * 1000, // 20 min
    xpReward: 25,
    levelRequired: 3,
    discoveredByDefault: true,
  },

  // === Armor ===
  {
    id: 'armored_jacket',
    name: 'Θωρακισμένο Μπουφάν',
    icon: '🧥',
    category: 'armor',
    ingredients: [
      { itemId: 'leather_jacket', quantity: 1 },
      { itemId: 'vest_light', quantity: 1 },
    ],
    result: { itemId: 'vest_medium', quantity: 1 },
    craftTime: 30 * 60 * 1000, // 30 min
    xpReward: 40,
    levelRequired: 5,
    discoveredByDefault: true,
  },
  {
    id: 'heavy_armor',
    name: 'Βαριά Θωράκιση',
    icon: '🛡️',
    category: 'armor',
    ingredients: [
      { itemId: 'vest_medium', quantity: 2 },
      { itemId: 'surgical_kit', quantity: 1 },
    ],
    result: { itemId: 'vest_heavy', quantity: 1 },
    craftTime: 2 * 60 * 60 * 1000, // 2 hours
    xpReward: 80,
    levelRequired: 10,
    discoveredByDefault: false,
  },

  // === Medical ===
  {
    id: 'field_medkit',
    name: 'Κιτ Πεδίου',
    icon: '🏥',
    category: 'medical',
    ingredients: [
      { itemId: 'bandages', quantity: 3 },
      { itemId: 'painkillers', quantity: 2 },
    ],
    result: { itemId: 'first_aid', quantity: 2 },
    craftTime: 15 * 60 * 1000, // 15 min
    xpReward: 20,
    levelRequired: 1,
    discoveredByDefault: true,
  },
  {
    id: 'adrenaline_shot',
    name: 'Σύριγγα Αδρεναλίνης',
    icon: '💉',
    category: 'medical',
    ingredients: [
      { itemId: 'surgical_kit', quantity: 1 },
      { itemId: 'cocaine', quantity: 1 },
    ],
    result: { itemId: 'adrenaline', quantity: 2 },
    craftTime: 45 * 60 * 1000, // 45 min
    xpReward: 50,
    levelRequired: 8,
    discoveredByDefault: false,
  },

  // === Drugs / Boosters ===
  {
    id: 'party_mix',
    name: 'Πάρτι Μίξ',
    icon: '🎉',
    category: 'booster',
    ingredients: [
      { itemId: 'alcohol', quantity: 2 },
      { itemId: 'hash', quantity: 1 },
    ],
    result: { itemId: 'cocaine', quantity: 1 },
    craftTime: 30 * 60 * 1000, // 30 min
    xpReward: 35,
    levelRequired: 5,
    discoveredByDefault: false,
  },
  {
    id: 'super_steroids',
    name: 'Τούρμπο Στεροειδή',
    icon: '💪',
    category: 'booster',
    ingredients: [
      { itemId: 'steroids', quantity: 2 },
      { itemId: 'adrenaline', quantity: 1 },
    ],
    result: { itemId: 'steroids', quantity: 4 },
    craftTime: 60 * 60 * 1000, // 1 hour
    xpReward: 60,
    levelRequired: 10,
    discoveredByDefault: false,
  },

  // === Valuables ===
  {
    id: 'fake_jewelry',
    name: 'Ψεύτικα Κοσμήματα',
    icon: '💍',
    category: 'misc',
    ingredients: [
      { itemId: 'lighter', quantity: 2 },
      { itemId: 'sunglasses', quantity: 2 },
    ],
    result: { itemId: 'jewelry', quantity: 1 },
    craftTime: 20 * 60 * 1000, // 20 min
    xpReward: 25,
    levelRequired: 3,
    discoveredByDefault: true,
  },
  {
    id: 'laptop_upgrade',
    name: 'Αναβάθμιση Laptop',
    icon: '💻',
    category: 'misc',
    ingredients: [
      { itemId: 'laptop', quantity: 1 },
      { itemId: 'car_radio', quantity: 2 },
    ],
    result: { itemId: 'laptop', quantity: 2 },
    craftTime: 25 * 60 * 1000, // 25 min
    xpReward: 30,
    levelRequired: 3,
    discoveredByDefault: true,
  },
]

export function getRecipeById(id) {
  return recipes.find(r => r.id === id) || null
}

export function getDefaultRecipes() {
  return recipes.filter(r => r.discoveredByDefault).map(r => r.id)
}
