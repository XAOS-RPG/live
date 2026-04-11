/**
 * Τυχαία συμβάντα πόλης (City Exploration) — επιλογή με βάρη.
 * Τα αποτελέσματα εφαρμόζονται στο eventsHubStore.
 */
export const CITY_EXPLORATION_EVENT_DEFS = [
  {
    id: 'find_cash_20',
    weight: 22,
    icon: '💶',
    title: 'Κέρματα στο πεζοδρόμιο',
    message: 'Βρήκες 20€ στο δρόμο!',
    effect: 'cash',
    amount: 20,
  },
  {
    id: 'find_cash_5',
    weight: 14,
    icon: '🪙',
    title: 'Ψιλά στην τσέπη',
    message: 'Βρήκες 5€ που κάποιος άφησε πάνω σε παγκάκι.',
    effect: 'cash',
    amount: 5,
  },
  {
    id: 'dog_bite',
    weight: 18,
    icon: '🐕',
    title: 'Αγριοκούταβο',
    message: 'Ένας σκύλος σε δάγκωσε! (-5 HP)',
    effect: 'hp',
    amount: -5,
  },
  {
    id: 'rare_trash',
    weight: 8,
    icon: '🗑️',
    title: 'Θησαυρός στα σκουπίδια',
    message: 'Βρήκες κάτι σπάνιο στα σκουπίδια!',
    effect: 'item',
    itemId: 'jewelry',
  },
  {
    id: 'trash_bandages',
    weight: 12,
    icon: '🩹',
    title: 'Κουτί πρώτων βοηθειών',
    message: 'Σε έναν κάδο βρήκες γάζες που κάποιος πέταξε κατά λάθος.',
    effect: 'item',
    itemId: 'bandages',
  },
  {
    id: 'stumble',
    weight: 10,
    icon: '🤕',
    title: 'Σκόνταψες',
    message: 'Σκόνταψες σε πεζοδρόμιο που έχει σπάσει. (-2 HP)',
    effect: 'hp',
    amount: -2,
  },
  {
    id: 'busker',
    weight: 10,
    icon: '🎸',
    title: 'Κουδουνίζει η τσέπη',
    message: 'Ένας μουσικός στο δρόμο σου έβαλε κέφι. (+8 Κέφι)',
    effect: 'happiness',
    amount: 8,
  },
  {
    id: 'lottery_loss',
    weight: 6,
    icon: '🎫',
    title: 'Λαχείο express',
    message: 'Σου πούλησαν «σίγουρο» λαχείο για 10€. Ήταν άσπρο.',
    effect: 'cash',
    amount: -10,
  },
]

export function pickWeightedCityEvent() {
  const total = CITY_EXPLORATION_EVENT_DEFS.reduce((s, e) => s + e.weight, 0)
  let r = Math.random() * total
  for (const def of CITY_EXPLORATION_EVENT_DEFS) {
    r -= def.weight
    if (r <= 0) return { ...def }
  }
  return { ...CITY_EXPLORATION_EVENT_DEFS[CITY_EXPLORATION_EVENT_DEFS.length - 1] }
}
