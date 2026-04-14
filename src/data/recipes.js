/**
 * Κατασκευές & Πατέντες — 10 recipes using 8 base materials.
 * diceMultiplier: roll 1 = ×1.0, roll 6 = ×2.0 (linear: multiplier = 1 + (roll-1)/5)
 * All recipes are known from the start (no discovery system needed).
 */

export const recipes = [
  {
    id: 'molotov',
    name: 'Μολότοφ',
    icon: '🔥',
    category: 'weapon',
    ingredients: [
      { itemId: 'mat_fuel',    quantity: 1 },
      { itemId: 'mat_fabric',  quantity: 1 },
    ],
    result: { itemId: 'craft_molotov', quantity: 1 },
    craftTime: 10 * 60 * 1000,
    xpReward: 15,
    levelRequired: 1,
  },
  {
    id: 'diy_knife',
    name: 'Αυτοσχέδιο Μαχαίρι',
    icon: '🗡️',
    category: 'weapon',
    ingredients: [
      { itemId: 'mat_iron', quantity: 1 },
      { itemId: 'mat_wood', quantity: 1 },
    ],
    result: { itemId: 'craft_knife', quantity: 1 },
    craftTime: 10 * 60 * 1000,
    xpReward: 12,
    levelRequired: 1,
  },
  {
    id: 'reinforced_shirt',
    name: 'Ενισχυμένη Μπλούζα',
    icon: '👕',
    category: 'armor',
    ingredients: [
      { itemId: 'mat_fabric', quantity: 2 },
      { itemId: 'mat_iron',   quantity: 1 },
    ],
    result: { itemId: 'craft_shirt', quantity: 1 },
    craftTime: 20 * 60 * 1000,
    xpReward: 18,
    levelRequired: 1,
  },
  {
    id: 'zapper',
    name: 'Zapper',
    icon: '⚡',
    category: 'weapon',
    ingredients: [
      { itemId: 'mat_electronics', quantity: 1 },
      { itemId: 'mat_battery',     quantity: 1 },
    ],
    result: { itemId: 'craft_zapper', quantity: 1 },
    craftTime: 30 * 60 * 1000,
    xpReward: 25,
    levelRequired: 1,
  },
  {
    id: 'modded_bat',
    name: 'Τροποποιημένο Ρόπαλο',
    icon: '🏏',
    category: 'weapon',
    ingredients: [
      { itemId: 'mat_wood', quantity: 2 },
      { itemId: 'mat_iron', quantity: 1 },
    ],
    result: { itemId: 'craft_bat', quantity: 1 },
    craftTime: 20 * 60 * 1000,
    xpReward: 20,
    levelRequired: 1,
  },
  {
    id: 'kevlar_vest',
    name: 'Γιλέκο Κέβλαρ',
    icon: '🦺',
    category: 'armor',
    ingredients: [
      { itemId: 'mat_kevlar', quantity: 2 },
      { itemId: 'mat_fabric', quantity: 1 },
    ],
    result: { itemId: 'craft_kevlar_vest', quantity: 1 },
    craftTime: 60 * 60 * 1000,
    xpReward: 60,
    levelRequired: 2,
  },
  {
    id: 'chem_bomb',
    name: 'Χημική Βόμβα',
    icon: '💀',
    category: 'weapon',
    ingredients: [
      { itemId: 'mat_chemicals', quantity: 2 },
      { itemId: 'mat_fuel',      quantity: 1 },
    ],
    result: { itemId: 'craft_chem_bomb', quantity: 1 },
    craftTime: 45 * 60 * 1000,
    xpReward: 40,
    levelRequired: 3,
  },
  {
    id: 'knuckles',
    name: 'Σιδηρογροθιά',
    icon: '🤜',
    category: 'weapon',
    ingredients: [
      { itemId: 'mat_iron', quantity: 2 },
    ],
    result: { itemId: 'craft_knuckles', quantity: 1 },
    craftTime: 15 * 60 * 1000,
    xpReward: 15,
    levelRequired: 1,
  },
  {
    id: 'elec_blade',
    name: 'Ηλεκτρική Λεπίδα',
    icon: '⚔️',
    category: 'weapon',
    ingredients: [
      { itemId: 'mat_iron',        quantity: 1 },
      { itemId: 'mat_electronics', quantity: 1 },
    ],
    result: { itemId: 'craft_elec_blade', quantity: 1 },
    craftTime: 90 * 60 * 1000,
    xpReward: 55,
    levelRequired: 3,
  },
  {
    id: 'mil_helmet',
    name: 'Στρατιωτικό Κράνος',
    icon: '⛑️',
    category: 'armor',
    ingredients: [
      { itemId: 'mat_kevlar', quantity: 1 },
      { itemId: 'mat_iron',   quantity: 2 },
    ],
    result: { itemId: 'craft_helmet', quantity: 1 },
    craftTime: 2 * 60 * 60 * 1000,
    xpReward: 80,
    levelRequired: 2,
  },
]

export function getRecipeById(id) {
  return recipes.find(r => r.id === id) || null
}

export function getDefaultRecipes() {
  return recipes.map(r => r.id)
}

/** roll 1→×1.0, roll 6→×2.0, linear */
export function diceToMultiplier(roll) {
  return parseFloat((1 + (roll - 1) / 5).toFixed(2))
}
