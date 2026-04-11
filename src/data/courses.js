/**
 * Education courses at Πανεπιστήμιο.
 * Each course takes real time and gives permanent bonuses on completion.
 * A course can only be completed once.
 */

export const courseCategories = [
  {
    id: 'it',
    name: 'Πληροφορική',
    icon: '💻',
    description: 'Αυξάνει ψηφιακές ικανότητες.',
  },
  {
    id: 'law',
    name: 'Νομική',
    icon: '⚖️',
    description: 'Γνώση του νόμου — για να τον σπάσεις καλύτερα.',
  },
  {
    id: 'medicine',
    name: 'Ιατρική',
    icon: '🏥',
    description: 'Αυξάνει HP και θεραπεία.',
  },
  {
    id: 'sports',
    name: 'Αθλητισμός',
    icon: '🏅',
    description: 'Βελτιώνει τη φυσική κατάσταση.',
  },
  {
    id: 'business',
    name: 'Επιχειρήσεις',
    icon: '📈',
    description: 'Αυξάνει κέρδη και εμπορικές δυνατότητες.',
  },
]

export const courses = [
  // IT
  {
    id: 'it_basics',
    category: 'it',
    name: 'Βασική Πληροφορική',
    description: '+2 Επιδεξιότητα',
    duration: 300000,    // 5 min
    levelRequired: 1,
    cost: 200,
    bonuses: { stat: 'dexterity', amount: 2 },
    icon: '💻',
  },
  {
    id: 'it_hacking',
    category: 'it',
    name: 'Εισαγωγή στο Hacking',
    description: '+3% επιτυχία εγκλημάτων',
    duration: 600000,    // 10 min
    levelRequired: 5,
    cost: 1000,
    bonuses: { crimeSuccessBonus: 0.03 },
    prerequisite: 'it_basics',
    icon: '🔓',
  },
  {
    id: 'it_advanced',
    category: 'it',
    name: 'Προχωρημένος Προγραμματισμός',
    description: '+5 Επιδεξιότητα',
    duration: 1200000,   // 20 min
    levelRequired: 12,
    cost: 5000,
    bonuses: { stat: 'dexterity', amount: 5 },
    prerequisite: 'it_hacking',
    icon: '🖥️',
  },

  // Law
  {
    id: 'law_basics',
    category: 'law',
    name: 'Εισαγωγή στο Δίκαιο',
    description: '-10% χρόνος φυλακής',
    duration: 300000,
    levelRequired: 2,
    cost: 300,
    bonuses: { jailTimeReduction: 0.10 },
    icon: '📜',
  },
  {
    id: 'law_criminal',
    category: 'law',
    name: 'Ποινικό Δίκαιο',
    description: '-20% χρόνος φυλακής',
    duration: 600000,
    levelRequired: 8,
    cost: 2000,
    bonuses: { jailTimeReduction: 0.20 },
    prerequisite: 'law_basics',
    icon: '⚖️',
  },
  {
    id: 'law_advanced',
    category: 'law',
    name: 'Δικηγόρος Ποινικολόγος',
    description: '+10% πιθανότητα απόδρασης',
    duration: 1200000,
    levelRequired: 15,
    cost: 8000,
    bonuses: { escapeBonus: 0.10 },
    prerequisite: 'law_criminal',
    icon: '🏛️',
  },

  // Medicine
  {
    id: 'med_first_aid',
    category: 'medicine',
    name: 'Πρώτες Βοήθειες',
    description: '+10 Max HP',
    duration: 300000,
    levelRequired: 1,
    cost: 250,
    bonuses: { maxHP: 10 },
    icon: '🩹',
  },
  {
    id: 'med_anatomy',
    category: 'medicine',
    name: 'Ανατομία',
    description: '+20 Max HP, -15% χρόνος νοσοκομείου',
    duration: 600000,
    levelRequired: 6,
    cost: 1500,
    bonuses: { maxHP: 20, hospitalTimeReduction: 0.15 },
    prerequisite: 'med_first_aid',
    icon: '🫀',
  },
  {
    id: 'med_surgery',
    category: 'medicine',
    name: 'Χειρουργική',
    description: '+3 Δύναμη, +30 Max HP',
    duration: 1200000,
    levelRequired: 14,
    cost: 10000,
    bonuses: { stat: 'strength', amount: 3, maxHP: 30 },
    prerequisite: 'med_anatomy',
    icon: '🏥',
  },

  // Sports
  {
    id: 'sports_basics',
    category: 'sports',
    name: 'Αθλητική Φυσιολογία',
    description: '+10% κέρδη γυμναστηρίου',
    duration: 300000,
    levelRequired: 1,
    cost: 200,
    bonuses: { gymBonus: 0.10 },
    icon: '🏃',
  },
  {
    id: 'sports_training',
    category: 'sports',
    name: 'Μεθοδολογία Προπόνησης',
    description: '+2 Ταχύτητα, +2 Δύναμη',
    duration: 600000,
    levelRequired: 7,
    cost: 1500,
    bonuses: { stats: { speed: 2, strength: 2 } },
    prerequisite: 'sports_basics',
    icon: '🏋️',
  },
  {
    id: 'sports_olympic',
    category: 'sports',
    name: 'Ολυμπιακή Προετοιμασία',
    description: '+20% κέρδη γυμναστηρίου, +3 σε κάθε stat',
    duration: 1200000,
    levelRequired: 18,
    cost: 12000,
    bonuses: { gymBonus: 0.20, stats: { strength: 3, speed: 3, dexterity: 3, defense: 3 } },
    prerequisite: 'sports_training',
    icon: '🥇',
  },

  // Business
  {
    id: 'biz_basics',
    category: 'business',
    name: 'Βασικά Οικονομικά',
    description: '+5% κέρδη εγκλημάτων',
    duration: 300000,
    levelRequired: 3,
    cost: 500,
    bonuses: { crimeRewardBonus: 0.05 },
    icon: '📊',
  },
  {
    id: 'biz_management',
    category: 'business',
    name: 'Διοίκηση Επιχειρήσεων',
    description: '+10% μισθός, +5 Μέσον',
    duration: 600000,
    levelRequired: 10,
    cost: 3000,
    bonuses: { salaryBonus: 0.10, meson: 5 },
    prerequisite: 'biz_basics',
    icon: '💼',
  },
  {
    id: 'biz_finance',
    category: 'business',
    name: 'Χρηματοοικονομικά',
    description: '+10% κέρδη εγκλημάτων, +10 Μέσον',
    duration: 1200000,
    levelRequired: 16,
    cost: 15000,
    bonuses: { crimeRewardBonus: 0.10, meson: 10 },
    prerequisite: 'biz_management',
    icon: '📈',
  },
]

export function getCourseById(id) {
  return courses.find(c => c.id === id) || null
}

export function getCoursesByCategory(categoryId) {
  return courses.filter(c => c.category === categoryId)
}
