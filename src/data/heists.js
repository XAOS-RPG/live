export const HEIST_TARGETS = [
  {
    id: 'national_bank',
    name: 'Εθνική Τράπεζα',
    icon: '🏦',
    description: 'Η μεγαλύτερη τράπεζα της χώρας. Το vault είναι γεμάτο, αλλά η ασφάλεια είναι σκληρή.',
    requiredLevel: 15,
    minTotalRoll: 9,
    payoutDirtyMin: 50000,
    payoutDirtyMax: 150000,
    payoutKevlar: 2,
    cooldownMs: 48 * 60 * 60 * 1000,
  },
  {
    id: 'acropolis_museum',
    name: 'Μουσείο Ακρόπολης',
    icon: '🏛️',
    description: 'Ανεκτίμητα αρχαία εκθέματα. Πούλα τα στη μαύρη αγορά για τεράστια κέρδη.',
    requiredLevel: 20,
    minTotalRoll: 12,
    payoutDirtyMin: 80000,
    payoutDirtyMax: 250000,
    payoutKevlar: 5,
    cooldownMs: 72 * 60 * 60 * 1000,
  },
]

export const HEIST_ROLES = [
  {
    id: 'hacker',
    name: 'Χάκερ',
    icon: '💻',
    description: 'Απενεργοποιεί τα συστήματα ασφαλείας και τις κάμερες.',
  },
  {
    id: 'executor',
    name: 'Εκτελεστής',
    icon: '🔫',
    description: 'Εξουδετερώνει τους φρουρούς και ανοίγει το δρόμο.',
  },
  {
    id: 'businessman',
    name: 'Επιχειρηματίας',
    icon: '💼',
    description: 'Ξεπλένει και διακινεί τα κλεμμένα χρήματα.',
  },
]

export function getHeistTargetById(id) {
  return HEIST_TARGETS.find(t => t.id === id) ?? null
}

export function getHeistRoleById(id) {
  return HEIST_ROLES.find(r => r.id === id) ?? null
}
