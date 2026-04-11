export const npcs = [
  // === EASY ===
  { id: 'crook_1', name: 'Μικροαπατεώνας', description: 'Ένας μικροκλέφτης του Μοναστηρακίου.', level: 1, stats: { strength: 4, speed: 3, dexterity: 5, defense: 2 }, hp: 60, equippedWeapon: null, equippedArmor: null, rewards: { cashMin: 15, cashMax: 60, xp: 8 }, possibleItemDrops: [{ itemId: 'lighter', chance: 0.1 }], difficulty: 'easy', energyCost: 25, icon: '🤡' },
  { id: 'crook_2', name: 'Ζητιάνος', description: 'Ένας επιθετικός ζητιάνος στην Ομόνοια.', level: 2, stats: { strength: 5, speed: 4, dexterity: 3, defense: 3 }, hp: 70, equippedWeapon: null, equippedArmor: null, rewards: { cashMin: 20, cashMax: 75, xp: 10 }, possibleItemDrops: [{ itemId: 'cigarettes', chance: 0.12 }], difficulty: 'easy', energyCost: 25, icon: '😤' },
  { id: 'crook_3', name: 'Ψιλικατζής Απατεώνας', description: 'Πουλάει μαϊμού προϊόντα στο Ψυρρή.', level: 3, stats: { strength: 6, speed: 5, dexterity: 6, defense: 3 }, hp: 80, equippedWeapon: null, equippedArmor: null, rewards: { cashMin: 25, cashMax: 90, xp: 12 }, possibleItemDrops: [{ itemId: 'sunglasses', chance: 0.08 }], difficulty: 'easy', energyCost: 25, icon: '🕶️' },

  // === MEDIUM ===
  { id: 'thief_1', name: 'Κλέφτης Πειραιά', description: 'Ένας κλέφτης που δρα στο λιμάνι.', level: 5, stats: { strength: 10, speed: 12, dexterity: 14, defense: 6 }, hp: 120, equippedWeapon: 'switchblade', equippedArmor: null, rewards: { cashMin: 60, cashMax: 200, xp: 20 }, possibleItemDrops: [{ itemId: 'switchblade', chance: 0.05 }, { itemId: 'watch_cheap', chance: 0.08 }], difficulty: 'medium', energyCost: 25, icon: '🗡️' },
  { id: 'thief_2', name: 'Πορτοφολάς Τουριστών', description: 'Εξειδικεύεται σε τουρίστες στην Πλάκα.', level: 6, stats: { strength: 8, speed: 15, dexterity: 18, defense: 5 }, hp: 100, equippedWeapon: null, equippedArmor: null, rewards: { cashMin: 50, cashMax: 180, xp: 18 }, possibleItemDrops: [{ itemId: 'watch_cheap', chance: 0.1 }], difficulty: 'medium', energyCost: 25, icon: '👛' },
  { id: 'thief_3', name: 'Διαρρήκτης', description: 'Μπαίνει σε σπίτια στο Κολωνάκι.', level: 7, stats: { strength: 12, speed: 10, dexterity: 16, defense: 8 }, hp: 130, equippedWeapon: 'switchblade', equippedArmor: 'leather_jacket', rewards: { cashMin: 80, cashMax: 250, xp: 25 }, possibleItemDrops: [{ itemId: 'jewelry', chance: 0.04 }], difficulty: 'medium', energyCost: 25, icon: '🏠' },

  // === HARD ===
  { id: 'bully_1', name: 'Νταής Εξαρχείων', description: 'Ένας σκληρός τύπος από τα Εξάρχεια.', level: 10, stats: { strength: 25, speed: 15, dexterity: 12, defense: 20 }, hp: 200, equippedWeapon: 'bat', equippedArmor: 'leather_jacket', rewards: { cashMin: 150, cashMax: 500, xp: 40 }, possibleItemDrops: [{ itemId: 'bat', chance: 0.06 }, { itemId: 'hash', chance: 0.04 }], difficulty: 'hard', energyCost: 25, icon: '👊' },
  { id: 'bully_2', name: 'Χούλιγκαν', description: 'Οπαδός ομάδας, πάντα έτοιμος για καυγά.', level: 11, stats: { strength: 28, speed: 18, dexterity: 10, defense: 22 }, hp: 220, equippedWeapon: 'bat', equippedArmor: 'leather_jacket', rewards: { cashMin: 180, cashMax: 550, xp: 45 }, possibleItemDrops: [{ itemId: 'alcohol', chance: 0.08 }], difficulty: 'hard', energyCost: 25, icon: '⚽' },
  { id: 'bully_3', name: 'Μπράβος Μπουζουκιών', description: 'Μπράβος σε νυχτερινό κέντρο στο Γκάζι.', level: 12, stats: { strength: 30, speed: 16, dexterity: 14, defense: 25 }, hp: 250, equippedWeapon: 'axe', equippedArmor: 'vest_light', rewards: { cashMin: 200, cashMax: 600, xp: 50 }, possibleItemDrops: [{ itemId: 'vest_light', chance: 0.03 }], difficulty: 'hard', energyCost: 25, icon: '🎵' },

  // === VERY HARD ===
  { id: 'mafioso_1', name: 'Μαφιόζος Πειραιά', description: 'Μέλος οργανωμένου εγκλήματος στον Πειραιά.', level: 15, stats: { strength: 45, speed: 30, dexterity: 35, defense: 40 }, hp: 400, equippedWeapon: 'pistol_small', equippedArmor: 'vest_medium', rewards: { cashMin: 400, cashMax: 1500, xp: 80 }, possibleItemDrops: [{ itemId: 'pistol_small', chance: 0.04 }, { itemId: 'cocaine', chance: 0.03 }], difficulty: 'very_hard', energyCost: 25, icon: '🤵' },
  { id: 'mafioso_2', name: 'Βαλκάνιος Λαθρέμπορος', description: 'Λαθρέμπορος από τα βαλκανικά δίκτυα.', level: 16, stats: { strength: 50, speed: 35, dexterity: 30, defense: 45 }, hp: 450, equippedWeapon: 'shotgun', equippedArmor: 'vest_medium', rewards: { cashMin: 500, cashMax: 2000, xp: 90 }, possibleItemDrops: [{ itemId: 'shotgun', chance: 0.03 }], difficulty: 'very_hard', energyCost: 25, icon: '🔫' },
  { id: 'mafioso_3', name: 'Ναρκέμπορος', description: 'Μεγάλος ναρκέμπορος. Εξαιρετικά επικίνδυνος.', level: 18, stats: { strength: 55, speed: 40, dexterity: 38, defense: 50 }, hp: 500, equippedWeapon: 'uzi', equippedArmor: 'vest_heavy', rewards: { cashMin: 600, cashMax: 2500, xp: 100 }, possibleItemDrops: [{ itemId: 'uzi', chance: 0.02 }, { itemId: 'cocaine', chance: 0.05 }], difficulty: 'very_hard', energyCost: 25, icon: '💀' },

  // === BOSS ===
  { id: 'boss_1', name: 'Αρχηγός Συμμορίας', description: 'Ο αρχηγός μιας τοπικής συμμορίας. Ακραίος κίνδυνος.', level: 20, stats: { strength: 80, speed: 55, dexterity: 50, defense: 70 }, hp: 800, equippedWeapon: 'ak47', equippedArmor: 'vest_heavy', rewards: { cashMin: 1500, cashMax: 5000, xp: 200 }, possibleItemDrops: [{ itemId: 'ak47', chance: 0.02 }, { itemId: 'full_armor', chance: 0.01 }], difficulty: 'boss', energyCost: 25, icon: '👑' },
  { id: 'boss_2', name: 'Ο Νονός', description: 'Ο αρχηγός του υποκόσμου. Ζωντανός θρύλος.', level: 25, stats: { strength: 120, speed: 80, dexterity: 75, defense: 100 }, hp: 1200, equippedWeapon: 'ak47', equippedArmor: 'full_armor', rewards: { cashMin: 3000, cashMax: 10000, xp: 500 }, possibleItemDrops: [{ itemId: 'ancient_vase', chance: 0.02 }], difficulty: 'boss', energyCost: 25, icon: '🏛️' },
]

export function getNpcById(id) {
  return npcs.find(n => n.id === id)
}

export function getNpcsByDifficulty(difficulty) {
  return npcs.filter(n => n.difficulty === difficulty)
}

export const difficultyLabels = {
  easy: { label: 'Εύκολο', color: 'badge-success' },
  medium: { label: 'Μέτριο', color: 'badge-info' },
  hard: { label: 'Δύσκολο', color: 'badge-warning' },
  very_hard: { label: 'Πολύ Δύσκολο', color: 'badge-danger' },
  boss: { label: 'Αρχηγός', color: 'badge-purple' },
}
