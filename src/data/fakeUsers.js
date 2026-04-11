// Fake PVP opponents that look like real players
// Used for the PVP combat tab — not real multiplayer

export const fakeUsers = [
  // === ΑΡΧΑΡΙΟΙ (Level 1-5) ===
  {
    id: 'fuser_1', nickname: 'Κώστας_93', icon: '😎',
    level: 2, location: 'Αθήνα', lastSeen: '3 λεπτά πριν',
    stats: { strength: 6, speed: 5, dexterity: 7, defense: 4 },
    hp: 75, equippedWeapon: null, equippedArmor: null,
    rewards: { cashMin: 15, cashMax: 60, xp: 8 },
    possibleItemDrops: [], energyCost: 25, tier: 'beginner',
  },
  {
    id: 'fuser_2', nickname: 'gr_nikos', icon: '🙂',
    level: 3, location: 'Πειραιάς', lastSeen: '12 λεπτά πριν',
    stats: { strength: 8, speed: 7, dexterity: 5, defense: 6 },
    hp: 85, equippedWeapon: null, equippedArmor: null,
    rewards: { cashMin: 20, cashMax: 80, xp: 10 },
    possibleItemDrops: [], energyCost: 25, tier: 'beginner',
  },
  {
    id: 'fuser_3', nickname: 'ThessKing', icon: '🧢',
    level: 4, location: 'Θεσσαλονίκη', lastSeen: '28 λεπτά πριν',
    stats: { strength: 9, speed: 8, dexterity: 8, defense: 7 },
    hp: 95, equippedWeapon: null, equippedArmor: null,
    rewards: { cashMin: 25, cashMax: 90, xp: 12 },
    possibleItemDrops: [{ itemId: 'lighter', chance: 0.08 }], energyCost: 25, tier: 'beginner',
  },
  {
    id: 'fuser_4', nickname: 'MakisGR', icon: '😤',
    level: 5, location: 'Αθήνα', lastSeen: '1 ώρα πριν',
    stats: { strength: 11, speed: 9, dexterity: 10, defense: 8 },
    hp: 110, equippedWeapon: null, equippedArmor: null,
    rewards: { cashMin: 30, cashMax: 110, xp: 15 },
    possibleItemDrops: [{ itemId: 'cigarettes', chance: 0.1 }], energyCost: 25, tier: 'beginner',
  },

  // === ΜΕΣΑΙΟΙ (Level 6-12) ===
  {
    id: 'fuser_5', nickname: 'VangelisFury', icon: '😡',
    level: 7, location: 'Πάτρα', lastSeen: '8 λεπτά πριν',
    stats: { strength: 18, speed: 15, dexterity: 14, defense: 12 },
    hp: 150, equippedWeapon: 'switchblade', equippedArmor: null,
    rewards: { cashMin: 70, cashMax: 220, xp: 22 },
    possibleItemDrops: [{ itemId: 'switchblade', chance: 0.04 }], energyCost: 25, tier: 'medium',
  },
  {
    id: 'fuser_6', nickname: 'AthensStreet99', icon: '🗡️',
    level: 8, location: 'Αθήνα', lastSeen: '45 λεπτά πριν',
    stats: { strength: 20, speed: 17, dexterity: 16, defense: 14 },
    hp: 170, equippedWeapon: null, equippedArmor: 'leather_jacket',
    rewards: { cashMin: 80, cashMax: 260, xp: 26 },
    possibleItemDrops: [{ itemId: 'watch_cheap', chance: 0.06 }], energyCost: 25, tier: 'medium',
  },
  {
    id: 'fuser_7', nickname: 'Σπύρος_Underground', icon: '🧤',
    level: 9, location: 'Ηράκλειο', lastSeen: '2 ώρες πριν',
    stats: { strength: 22, speed: 19, dexterity: 18, defense: 16 },
    hp: 190, equippedWeapon: 'bat', equippedArmor: null,
    rewards: { cashMin: 100, cashMax: 300, xp: 30 },
    possibleItemDrops: [{ itemId: 'bat', chance: 0.04 }], energyCost: 25, tier: 'medium',
  },
  {
    id: 'fuser_8', nickname: 'xXDimitrisXx', icon: '💪',
    level: 11, location: 'Θεσσαλονίκη', lastSeen: '17 λεπτά πριν',
    stats: { strength: 28, speed: 22, dexterity: 20, defense: 20 },
    hp: 220, equippedWeapon: 'bat', equippedArmor: 'leather_jacket',
    rewards: { cashMin: 130, cashMax: 400, xp: 38 },
    possibleItemDrops: [{ itemId: 'alcohol', chance: 0.07 }], energyCost: 25, tier: 'medium',
  },

  // === ΠΡΟΧΩΡΗΜΕΝΟΙ (Level 13-18) ===
  {
    id: 'fuser_9', nickname: 'GR_Enforcer', icon: '🔥',
    level: 14, location: 'Αθήνα', lastSeen: '5 λεπτά πριν',
    stats: { strength: 45, speed: 35, dexterity: 32, defense: 38 },
    hp: 350, equippedWeapon: 'pistol_small', equippedArmor: 'vest_light',
    rewards: { cashMin: 300, cashMax: 900, xp: 65 },
    possibleItemDrops: [{ itemId: 'cocaine', chance: 0.03 }], energyCost: 25, tier: 'advanced',
  },
  {
    id: 'fuser_10', nickname: 'PeiraiosWolf', icon: '🐺',
    level: 15, location: 'Πειραιάς', lastSeen: '33 λεπτά πριν',
    stats: { strength: 50, speed: 38, dexterity: 35, defense: 42 },
    hp: 380, equippedWeapon: 'shotgun', equippedArmor: 'vest_medium',
    rewards: { cashMin: 350, cashMax: 1100, xp: 75 },
    possibleItemDrops: [{ itemId: 'hash', chance: 0.04 }], energyCost: 25, tier: 'advanced',
  },
  {
    id: 'fuser_11', nickname: 'Ο_Αρης_666', icon: '☠️',
    level: 16, location: 'Αθήνα', lastSeen: '1 ώρα πριν',
    stats: { strength: 55, speed: 42, dexterity: 38, defense: 48 },
    hp: 420, equippedWeapon: 'uzi', equippedArmor: 'vest_medium',
    rewards: { cashMin: 400, cashMax: 1300, xp: 85 },
    possibleItemDrops: [{ itemId: 'cocaine', chance: 0.04 }], energyCost: 25, tier: 'advanced',
  },
  {
    id: 'fuser_12', nickname: 'Δράκος_Αθηνών', icon: '🐉',
    level: 18, location: 'Αθήνα', lastSeen: '4 ώρες πριν',
    stats: { strength: 65, speed: 50, dexterity: 45, defense: 58 },
    hp: 480, equippedWeapon: 'uzi', equippedArmor: 'vest_heavy',
    rewards: { cashMin: 500, cashMax: 1800, xp: 100 },
    possibleItemDrops: [{ itemId: 'jewelry', chance: 0.03 }], energyCost: 25, tier: 'advanced',
  },

  // === ELITE (Level 20+) ===
  {
    id: 'fuser_13', nickname: 'Kingpin_GR', icon: '👑',
    level: 22, location: 'Άγνωστη', lastSeen: '9 λεπτά πριν',
    stats: { strength: 90, speed: 65, dexterity: 60, defense: 80 },
    hp: 700, equippedWeapon: 'ak47', equippedArmor: 'vest_heavy',
    rewards: { cashMin: 800, cashMax: 3000, xp: 160 },
    possibleItemDrops: [{ itemId: 'ak47', chance: 0.02 }], energyCost: 25, tier: 'elite',
  },
  {
    id: 'fuser_14', nickname: 'OΝονος', icon: '🎩',
    level: 25, location: 'Άγνωστη', lastSeen: '2 ώρες πριν',
    stats: { strength: 110, speed: 80, dexterity: 75, defense: 100 },
    hp: 900, equippedWeapon: 'ak47', equippedArmor: 'full_armor',
    rewards: { cashMin: 1500, cashMax: 5000, xp: 280 },
    possibleItemDrops: [{ itemId: 'full_armor', chance: 0.01 }], energyCost: 25, tier: 'elite',
  },
]

export function getFakeUserById(id) {
  return fakeUsers.find(u => u.id === id)
}

export const pvpTierLabels = {
  beginner:  { label: 'Αρχάριοι',     color: 'badge-success' },
  medium:    { label: 'Μεσαίοι',      color: 'badge-info' },
  advanced:  { label: 'Προχωρημένοι', color: 'badge-warning' },
  elite:     { label: 'Elite',        color: 'badge-danger' },
}
