export const jobs = [
  {
    id: 'army', name: 'Στρατός', description: 'Υπηρετείς στον Ελληνικό Στρατό.', icon: '🎖️',
    baseSalary: 150,
    statBonuses: { strength: 0.3, defense: 0.2 },
    passiveBonus: { type: 'nerve_max', value: 2, desc: '+2 Μέγ. Θράσος' },
    requirements: { level: 1, filotimo: 0 },
    ranks: [
      { name: 'Φαντάρος', workStatsRequired: 0, salaryMultiplier: 1.0 },
      { name: 'Δεκανέας', workStatsRequired: 10, salaryMultiplier: 1.3 },
      { name: 'Λοχίας', workStatsRequired: 30, salaryMultiplier: 1.7 },
      { name: 'Ανθυπολοχαγός', workStatsRequired: 60, salaryMultiplier: 2.2 },
      { name: 'Λοχαγός', workStatsRequired: 100, salaryMultiplier: 3.0 },
    ],
  },
  {
    id: 'police', name: 'Αστυνομία', description: 'Υπηρετείς στην Ελληνική Αστυνομία.', icon: '👮',
    baseSalary: 180,
    statBonuses: { speed: 0.2, dexterity: 0.2 },
    passiveBonus: { type: 'filotimo', value: 1, desc: '+1 Φιλότιμο/εργασία' },
    requirements: { level: 3, filotimo: 30 },
    ranks: [
      { name: 'Αστυφύλακας', workStatsRequired: 0, salaryMultiplier: 1.0 },
      { name: 'Υπαρχιφύλακας', workStatsRequired: 15, salaryMultiplier: 1.3 },
      { name: 'Ενωματάρχης', workStatsRequired: 40, salaryMultiplier: 1.7 },
      { name: 'Ανθυπαστυνόμος', workStatsRequired: 80, salaryMultiplier: 2.2 },
      { name: 'Αστυνόμος', workStatsRequired: 130, salaryMultiplier: 3.0 },
    ],
  },
  {
    id: 'hospital_job', name: 'Νοσοκομείο', description: 'Εργάζεσαι στο νοσοκομείο.', icon: '🏥',
    baseSalary: 200,
    statBonuses: { dexterity: 0.3 },
    passiveBonus: { type: 'hp_regen', value: 1, desc: 'Ταχύτερη ανάρρωση' },
    requirements: { level: 5, filotimo: 20 },
    ranks: [
      { name: 'Τραυματιοφορέας', workStatsRequired: 0, salaryMultiplier: 1.0 },
      { name: 'Νοσηλευτής', workStatsRequired: 20, salaryMultiplier: 1.4 },
      { name: 'Βοηθός Ιατρού', workStatsRequired: 50, salaryMultiplier: 1.8 },
      { name: 'Ιατρός', workStatsRequired: 100, salaryMultiplier: 2.5 },
      { name: 'Διευθυντής Κλινικής', workStatsRequired: 160, salaryMultiplier: 3.5 },
    ],
  },
  {
    id: 'restaurant', name: 'Εστιατόριο', description: 'Δουλεύεις σε ταβέρνα στην Πλάκα.', icon: '🍽️',
    baseSalary: 120,
    statBonuses: { speed: 0.3 },
    passiveBonus: { type: 'happiness', value: 5, desc: '+5 Κέφι/εργασία' },
    requirements: { level: 1, filotimo: 0 },
    ranks: [
      { name: 'Λαντζέρης', workStatsRequired: 0, salaryMultiplier: 1.0 },
      { name: 'Σερβιτόρος', workStatsRequired: 10, salaryMultiplier: 1.3 },
      { name: 'Μάγειρας', workStatsRequired: 30, salaryMultiplier: 1.6 },
      { name: 'Σεφ', workStatsRequired: 70, salaryMultiplier: 2.2 },
      { name: 'Ιδιοκτήτης', workStatsRequired: 120, salaryMultiplier: 3.0 },
    ],
  },
  {
    id: 'shipping', name: 'Ναυτιλιακή', description: 'Δουλεύεις σε ναυτιλιακή στον Πειραιά.', icon: '🚢',
    baseSalary: 250,
    statBonuses: { strength: 0.2, defense: 0.2 },
    passiveBonus: { type: 'meson', value: 1, desc: '+1 Μέσον/εργασία' },
    requirements: { level: 8, filotimo: 0 },
    ranks: [
      { name: 'Εργάτης Λιμανιού', workStatsRequired: 0, salaryMultiplier: 1.0 },
      { name: 'Ναύτης', workStatsRequired: 20, salaryMultiplier: 1.3 },
      { name: 'Αξιωματικός', workStatsRequired: 50, salaryMultiplier: 1.8 },
      { name: 'Πλοίαρχος', workStatsRequired: 100, salaryMultiplier: 2.5 },
      { name: 'Εφοπλιστής', workStatsRequired: 180, salaryMultiplier: 4.0 },
    ],
  },
  {
    id: 'farming', name: 'Αγροτικά', description: 'Δουλεύεις σε ελαιώνες στην Κρήτη.', icon: '🫒',
    baseSalary: 100,
    statBonuses: { strength: 0.4 },
    passiveBonus: { type: 'energy_max', value: 5, desc: '+5 Μέγ. Ενέργεια' },
    requirements: { level: 1, filotimo: 0 },
    ranks: [
      { name: 'Εργάτης', workStatsRequired: 0, salaryMultiplier: 1.0 },
      { name: 'Μαζευτής', workStatsRequired: 10, salaryMultiplier: 1.2 },
      { name: 'Ελαιοπαραγωγός', workStatsRequired: 35, salaryMultiplier: 1.6 },
      { name: 'Αγρότης', workStatsRequired: 75, salaryMultiplier: 2.0 },
      { name: 'Γαιοκτήμονας', workStatsRequired: 130, salaryMultiplier: 3.0 },
    ],
  },
  {
    id: 'tourism', name: 'Τουρισμός', description: 'Εργάζεσαι στον τουρισμό στη Μύκονο.', icon: '🏖️',
    baseSalary: 160,
    statBonuses: { dexterity: 0.2, speed: 0.1 },
    passiveBonus: { type: 'cash_bonus', value: 10, desc: '+10% μπόνους μισθού' },
    requirements: { level: 3, filotimo: 10 },
    ranks: [
      { name: 'Καθαριστής', workStatsRequired: 0, salaryMultiplier: 1.0 },
      { name: 'Ρεσεψιονίστ', workStatsRequired: 12, salaryMultiplier: 1.3 },
      { name: 'Ξεναγός', workStatsRequired: 35, salaryMultiplier: 1.7 },
      { name: 'Μάνατζερ Ξενοδοχείου', workStatsRequired: 80, salaryMultiplier: 2.3 },
      { name: 'Ιδιοκτήτης Resort', workStatsRequired: 140, salaryMultiplier: 3.5 },
    ],
  },
]

export function getJobById(id) {
  return jobs.find(j => j.id === id)
}
