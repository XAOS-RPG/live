export const achievements = [
  // Combat
  { id: 'first_blood',     name: 'Πρώτο Αίμα',        icon: '🩸', description: 'Κέρδισε την πρώτη σου μάχη', category: 'combat', check: (s) => s.combat.wins >= 1, reward: { cash: 100 } },
  { id: 'fighter_10',      name: 'Μαχητής',            icon: '🥊', description: 'Κέρδισε 10 μάχες', category: 'combat', check: (s) => s.combat.wins >= 10, reward: { cash: 500 } },
  { id: 'fighter_50',      name: 'Πολεμιστής',         icon: '⚔️', description: 'Κέρδισε 50 μάχες', category: 'combat', check: (s) => s.combat.wins >= 50, reward: { cash: 2000 } },
  { id: 'fighter_100',     name: 'Θηριομάχος',         icon: '🏛️', description: 'Κέρδισε 100 μάχες', category: 'combat', check: (s) => s.combat.wins >= 100, reward: { cash: 5000 } },
  { id: 'pvp_first',       name: 'Πρώτη Επίθεση',     icon: '🆚', description: 'Κέρδισε μια PVP μάχη', category: 'combat', check: (s) => s.combat.pvpWins >= 1, reward: { cash: 200 } },
  { id: 'boss_slayer',     name: 'Σκοτωτής Αρχηγών',   icon: '👑', description: 'Νίκησε έναν Boss', category: 'combat', check: (s) => s.combat.bossWins >= 1, reward: { cash: 3000 } },

  // Crime
  { id: 'first_crime',     name: 'Πρώτο Έγκλημα',     icon: '🎭', description: 'Κάνε το πρώτο σου έγκλημα', category: 'crime', check: (s) => s.crime.totalCrimes >= 1, reward: { cash: 50 } },
  { id: 'criminal_25',     name: 'Εγκληματίας',        icon: '🔪', description: 'Ολοκλήρωσε 25 εγκλήματα', category: 'crime', check: (s) => s.crime.totalCrimes >= 25, reward: { cash: 1000 } },
  { id: 'criminal_100',    name: 'Κακοποιός',          icon: '💀', description: 'Ολοκλήρωσε 100 εγκλήματα', category: 'crime', check: (s) => s.crime.totalCrimes >= 100, reward: { cash: 5000 } },
  { id: 'heist_master',    name: 'Ληστής Τραπεζών',    icon: '🏦', description: 'Κάνε 10 ληστείες τράπεζας', category: 'crime', check: (s) => s.crime.bankRobberies >= 10, reward: { cash: 10000 } },

  // Level
  { id: 'level_5',         name: 'Αρχάριος+',          icon: '📈', description: 'Φτάσε επίπεδο 5', category: 'level', check: (s) => s.player.level >= 5, reward: { cash: 500 } },
  { id: 'level_10',        name: 'Δόκιμος',            icon: '📊', description: 'Φτάσε επίπεδο 10', category: 'level', check: (s) => s.player.level >= 10, reward: { cash: 2000 } },
  { id: 'level_15',        name: 'Ικανός',             icon: '🏅', description: 'Φτάσε επίπεδο 15', category: 'level', check: (s) => s.player.level >= 15, reward: { cash: 5000 } },
  { id: 'level_20',        name: 'Βετεράνος',          icon: '🎖️', description: 'Φτάσε επίπεδο 20', category: 'level', check: (s) => s.player.level >= 20, reward: { cash: 10000 } },
  { id: 'level_30',        name: 'Θρύλος',             icon: '🏆', description: 'Φτάσε επίπεδο 30', category: 'level', check: (s) => s.player.level >= 30, reward: { cash: 50000 } },

  // Wealth
  { id: 'cash_1k',         name: 'Πρώτα Λεφτά',       icon: '💵', description: 'Μάζεψε €1.000', category: 'wealth', check: (s) => s.player.totalWealth >= 1000, reward: { cash: 100 } },
  { id: 'cash_10k',        name: 'Εύπορος',            icon: '💰', description: 'Μάζεψε €10.000', category: 'wealth', check: (s) => s.player.totalWealth >= 10000, reward: { cash: 500 } },
  { id: 'cash_100k',       name: 'Πλούσιος',           icon: '🤑', description: 'Μάζεψε €100.000', category: 'wealth', check: (s) => s.player.totalWealth >= 100000, reward: { cash: 2000 } },
  { id: 'cash_1m',         name: 'Εκατομμυριούχος',    icon: '👑', description: 'Μάζεψε €1.000.000', category: 'wealth', check: (s) => s.player.totalWealth >= 1000000, reward: { cash: 10000 } },

  // Stats
  { id: 'stats_50',        name: 'Γυμνασμένος',        icon: '💪', description: 'Σύνολο stats 50+', category: 'stats', check: (s) => s.player.totalStats >= 50, reward: { cash: 500 } },
  { id: 'stats_100',       name: 'Δυνατός',            icon: '🦾', description: 'Σύνολο stats 100+', category: 'stats', check: (s) => s.player.totalStats >= 100, reward: { cash: 2000 } },
  { id: 'stats_200',       name: 'Υπεράνθρωπος',      icon: '⚡', description: 'Σύνολο stats 200+', category: 'stats', check: (s) => s.player.totalStats >= 200, reward: { cash: 5000 } },

  // Daily login
  { id: 'login_7',         name: 'Τακτικός',           icon: '📅', description: 'Σύνδεση 7 ημέρες σερί', category: 'misc', check: (s) => s.daily.maxStreak >= 7, reward: { cash: 1000 } },
  { id: 'login_30',        name: 'Αφοσιωμένος',        icon: '🗓️', description: 'Σύνδεση 30 ημέρες σερί', category: 'misc', check: (s) => s.daily.maxStreak >= 30, reward: { cash: 10000 } },

  // Misc
  { id: 'first_property',  name: 'Ιδιοκτήτης',        icon: '🏠', description: 'Αγόρασε το πρώτο σου ακίνητο', category: 'misc', check: (s) => s.property.owned >= 1, reward: { cash: 500 } },
  { id: 'educated',        name: 'Μορφωμένος',         icon: '🎓', description: 'Ολοκλήρωσε 3 μαθήματα', category: 'misc', check: (s) => s.education.completed >= 3, reward: { cash: 1000 } },
  { id: 'traveler',        name: 'Ταξιδιώτης',         icon: '✈️', description: 'Επισκέψου 5 πόλεις', category: 'misc', check: (s) => s.travel.citiesVisited >= 5, reward: { cash: 1500 } },
  { id: 'gambler',         name: 'Τζογαδόρος',         icon: '🎰', description: 'Παίξε 50 παρτίδες στο καζίνο', category: 'misc', check: (s) => s.casino.totalGames >= 50, reward: { cash: 2000 } },
]

export function getAchievementById(id) {
  return achievements.find(a => a.id === id)
}

export const achievementCategories = [
  { key: 'combat', label: 'Μάχη', icon: '⚔️' },
  { key: 'crime', label: 'Έγκλημα', icon: '🎭' },
  { key: 'level', label: 'Επίπεδο', icon: '📈' },
  { key: 'wealth', label: 'Πλούτος', icon: '💰' },
  { key: 'stats', label: 'Stats', icon: '💪' },
  { key: 'misc', label: 'Διάφορα', icon: '🏅' },
]
