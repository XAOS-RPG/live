export const gyms = [
  {
    id: 'neighborhood',
    name: 'Γυμναστήριο Γειτονιάς',
    description: 'Ένα μικρό γυμναστήριο με βασικό εξοπλισμό.',
    icon: '🏋️',
    energyCostPerTrain: 5,
    baseStatGain: 0.3,
    happinessMultiplier: true,
    tier: 1,
    requirements: { totalStats: 0 },
  },
  {
    id: 'municipal',
    name: 'Δημοτικό Γυμναστήριο',
    description: 'Καλύτερα μηχανήματα, περισσότεροι χώροι.',
    icon: '🏟���',
    energyCostPerTrain: 5,
    baseStatGain: 0.6,
    happinessMultiplier: true,
    tier: 2,
    requirements: { totalStats: 50 },
  },
  {
    id: 'olympic',
    name: 'Ολυμπιακό Γυμναστήριο',
    description: 'Εξοπλισμός ολυμπιακών προδιαγραφών.',
    icon: '🥇',
    energyCostPerTrain: 5,
    baseStatGain: 1.0,
    happinessMultiplier: true,
    tier: 3,
    requirements: { totalStats: 200 },
  },
  {
    id: 'spartan',
    name: 'Σπαρτιατικό Γυμναστήριο',
    description: 'Μόνο για τους πιο σκληρούς. Αρχαία σπαρτιατική μέθοδος.',
    icon: '⚔️',
    energyCostPerTrain: 5,
    baseStatGain: 1.6,
    happinessMultiplier: true,
    tier: 4,
    requirements: { totalStats: 500 },
  },
]

export function getAvailableGym(totalStats) {
  let best = gyms[0]
  for (const gym of gyms) {
    if (totalStats >= gym.requirements.totalStats) {
      best = gym
    }
  }
  return best
}

export function getNextGym(totalStats) {
  for (const gym of gyms) {
    if (totalStats < gym.requirements.totalStats) {
      return gym
    }
  }
  return null
}
