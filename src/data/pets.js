/**
 * Pet definitions for the pet system.
 * Each pet provides a unique passive bonus that scales with level.
 * Pets need daily feeding or they leave.
 */

export const petDefinitions = [
  {
    id: 'stray_dog',
    name: 'Σκύλος Δρόμου',
    icon: '🐕',
    description: 'Πιστός σύντροφος. Σε βοηθάει στα εγκλήματα.',
    rarity: 'common',
    buyPrice: 500,
    feedCost: 20,
    bonusType: 'crimeSuccess',
    bonusLabel: 'Επιτυχία Εγκλημάτων',
    bonusPerLevel: 0.02,   // +2% per level
    maxLevel: 10,
    requiredLevel: 1,
  },
  {
    id: 'cat',
    name: 'Γάτα',
    icon: '🐈',
    description: 'Τυχερή γάτα. Φέρνει τύχη στο καζίνο.',
    rarity: 'common',
    buyPrice: 300,
    feedCost: 15,
    bonusType: 'casinoLuck',
    bonusLabel: 'Τύχη Καζίνο',
    bonusPerLevel: 0.01,   // +1% per level
    maxLevel: 10,
    requiredLevel: 1,
  },
  {
    id: 'pitbull',
    name: 'Πίτμπουλ',
    icon: '🐕‍🦺',
    description: 'Τρομακτικός σκύλος. Αυξάνει τη ζημιά σε μάχη.',
    rarity: 'uncommon',
    buyPrice: 2000,
    feedCost: 40,
    bonusType: 'combatDamage',
    bonusLabel: 'Ζημιά Μάχης',
    bonusPerLevel: 0.03,   // +3% per level
    maxLevel: 10,
    requiredLevel: 5,
  },
  {
    id: 'parrot',
    name: 'Παπαγάλος',
    icon: '🦜',
    description: 'Μιλάει πολύ. Σε βοηθάει στις πωλήσεις.',
    rarity: 'uncommon',
    buyPrice: 1500,
    feedCost: 25,
    bonusType: 'sellPrice',
    bonusLabel: 'Τιμή Πώλησης',
    bonusPerLevel: 0.02,   // +2% per level
    maxLevel: 10,
    requiredLevel: 3,
  },
  {
    id: 'snake',
    name: 'Φίδι',
    icon: '🐍',
    description: 'Εξωτικό φίδι. Εκφοβίζει — μειώνει χρόνο φυλακής.',
    rarity: 'rare',
    buyPrice: 3000,
    feedCost: 30,
    bonusType: 'jailReduction',
    bonusLabel: 'Μείωση Φυλακής',
    bonusPerLevel: 0.03,   // -3% per level
    maxLevel: 10,
    requiredLevel: 8,
  },
  {
    id: 'lizard',
    name: 'Σαύρα',
    icon: '🦎',
    description: 'Γρήγορη σαύρα. Βελτιώνει την ταχύτητα εκπαίδευσης.',
    rarity: 'uncommon',
    buyPrice: 1000,
    feedCost: 15,
    bonusType: 'eduSpeed',
    bonusLabel: 'Ταχύτητα Εκπαίδευσης',
    bonusPerLevel: 0.02,   // +2% per level
    maxLevel: 10,
    requiredLevel: 3,
  },
  {
    id: 'falcon',
    name: 'Γεράκι',
    icon: '🦅',
    description: 'Αρπακτικό πτηνό. Αυξάνει XP σε όλα.',
    rarity: 'rare',
    buyPrice: 5000,
    feedCost: 50,
    bonusType: 'xpBoost',
    bonusLabel: 'Bonus XP',
    bonusPerLevel: 0.02,   // +2% per level
    maxLevel: 10,
    requiredLevel: 10,
  },
  {
    id: 'turtle',
    name: 'Χελώνα',
    icon: '🐢',
    description: 'Αργή αλλά σταθερή. Αυξάνει τα gym gains.',
    rarity: 'common',
    buyPrice: 400,
    feedCost: 10,
    bonusType: 'gymGain',
    bonusLabel: 'Gym Gains',
    bonusPerLevel: 0.02,   // +2% per level
    maxLevel: 10,
    requiredLevel: 1,
  },
]

export function getPetDefinition(petId) {
  return petDefinitions.find(p => p.id === petId) || null
}

/**
 * Get the bonus multiplier for a pet at a given level.
 * Returns 1.0 + (bonusPerLevel * level), or 1.0 if inactive.
 */
export function getPetBonusMultiplier(petDef, level) {
  if (!petDef || level <= 0) return 1.0
  return 1.0 + petDef.bonusPerLevel * level
}

/**
 * Training XP needed for next level.
 */
export function trainingXpForLevel(level) {
  return Math.floor(50 * Math.pow(1.4, level - 1))
}
