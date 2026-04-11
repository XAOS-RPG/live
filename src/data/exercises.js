/**
 * Gym exercises per stat, unlocking by player level.
 * Each exercise has a duration (time-based) and gain multiplier.
 * Actual stat gain = gym.baseStatGain * exercise.multiplier * happinessMultiplier * variance
 */

export const exercises = {
  strength: [
    { id: 'pushups',     name: 'Κάμψεις',           icon: '🫸', level: 1,  duration: 30000,  multiplier: 1.0, energyCost: 5 },
    { id: 'dumbbells',   name: 'Βαράκια',            icon: '🏋️', level: 3,  duration: 60000,  multiplier: 1.5, energyCost: 8 },
    { id: 'barbell',     name: 'Μπάρα',              icon: '🏗️', level: 8,  duration: 120000, multiplier: 2.2, energyCost: 12 },
    { id: 'deadlift',    name: 'Deadlift',           icon: '💀', level: 15, duration: 180000, multiplier: 3.0, energyCost: 18 },
    { id: 'olympic',     name: 'Ολυμπιακή Άρση',     icon: '🥇', level: 22, duration: 300000, multiplier: 4.5, energyCost: 25 },
  ],
  speed: [
    { id: 'jogging',     name: 'Τρέξιμο',            icon: '🏃', level: 1,  duration: 30000,  multiplier: 1.0, energyCost: 5 },
    { id: 'treadmill',   name: 'Διάδρομος',           icon: '🏃‍♂️', level: 3,  duration: 60000,  multiplier: 1.5, energyCost: 8 },
    { id: 'sprints',     name: 'Σπριντ',             icon: '⚡', level: 8,  duration: 120000, multiplier: 2.2, energyCost: 12 },
    { id: 'intervals',   name: 'Interval Training',  icon: '📈', level: 15, duration: 180000, multiplier: 3.0, energyCost: 18 },
    { id: 'plyometrics', name: 'Πλειομετρικά',       icon: '🦘', level: 22, duration: 300000, multiplier: 4.5, energyCost: 25 },
  ],
  dexterity: [
    { id: 'stretching',  name: 'Stretching',         icon: '🤸', level: 1,  duration: 30000,  multiplier: 1.0, energyCost: 5 },
    { id: 'jumprope',    name: 'Σχοινάκι',           icon: '🪢', level: 3,  duration: 60000,  multiplier: 1.5, energyCost: 8 },
    { id: 'boxing',      name: 'Πυγμαχία',           icon: '🥊', level: 8,  duration: 120000, multiplier: 2.2, energyCost: 12 },
    { id: 'mma_bag',     name: 'Σάκος MMA',          icon: '🥋', level: 15, duration: 180000, multiplier: 3.0, energyCost: 18 },
    { id: 'parkour',     name: 'Parkour',            icon: '🏙️', level: 22, duration: 300000, multiplier: 4.5, energyCost: 25 },
  ],
  defense: [
    { id: 'plank',       name: 'Πλάνκα',             icon: '🧘', level: 1,  duration: 30000,  multiplier: 1.0, energyCost: 5 },
    { id: 'core',        name: 'Core Workout',       icon: '🔥', level: 3,  duration: 60000,  multiplier: 1.5, energyCost: 8 },
    { id: 'wrestling',   name: 'Wrestling',          icon: '🤼', level: 8,  duration: 120000, multiplier: 2.2, energyCost: 12 },
    { id: 'spartan',     name: 'Σπαρτιατική Ασπίδα', icon: '🛡️', level: 15, duration: 180000, multiplier: 3.0, energyCost: 18 },
    { id: 'pali',        name: 'Ελληνορωμαϊκή Πάλη', icon: '⚔️', level: 22, duration: 300000, multiplier: 4.5, energyCost: 25 },
  ],
}

export function getExercisesForStat(stat) {
  return exercises[stat] || []
}

export function getExerciseById(stat, exerciseId) {
  const list = exercises[stat]
  if (!list) return null
  return list.find(e => e.id === exerciseId) || null
}
