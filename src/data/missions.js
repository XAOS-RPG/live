/**
 * Daily missions — reset daily; player holds up to 3 random picks.
 * Story missions — linear chain with NPC dialogue and unlock rewards.
 */

/** @typedef {{ type: string, target?: string|null, count: number }} StoryObjective */
/** @typedef {{ level?: number, previousMissionId?: string|null }} StoryRequirements */
/** @typedef {{ cash?: number, xp?: number, item?: string|null, unlockFeature?: string|null }} StoryRewards */

/** Recurring daily task templates (same shape as before for compatibility). */
export const DAILY_MISSIONS = [
  // Combat missions
  { id: 'kill_easy_3', type: 'combat', title: 'Εκκαθάριση Δρόμων', description: 'Νίκησε 3 εύκολους αντιπάλους', icon: '🤡', target: 3, difficulty: 'easy', rewardCash: 300, rewardXP: 30 },
  { id: 'kill_easy_5', type: 'combat', title: 'Καθαρισμός Γειτονιάς', description: 'Νίκησε 5 εύκολους αντιπάλους', icon: '🧹', target: 5, difficulty: 'easy', rewardCash: 600, rewardXP: 60 },
  { id: 'kill_medium_3', type: 'combat', title: 'Κυνήγι Κλεφτών', description: 'Νίκησε 3 μέτριους αντιπάλους', icon: '🗡️', target: 3, difficulty: 'medium', rewardCash: 800, rewardXP: 80 },
  { id: 'kill_hard_2', type: 'combat', title: 'Αντιμετώπιση Νταήδων', description: 'Νίκησε 2 δύσκολους αντιπάλους', icon: '👊', target: 2, difficulty: 'hard', rewardCash: 1500, rewardXP: 120 },
  { id: 'kill_vhard_1', type: 'combat', title: 'Εξόντωση Μαφιόζου', description: 'Νίκησε 1 πολύ δύσκολο αντίπαλο', icon: '🤵', target: 1, difficulty: 'very_hard', rewardCash: 2500, rewardXP: 200 },
  { id: 'kill_any_5', type: 'combat_any', title: 'Μαχητής της Ημέρας', description: 'Κέρδισε 5 μάχες (οποιεσδήποτε)', icon: '⚔️', target: 5, rewardCash: 1000, rewardXP: 100 },
  { id: 'pvp_win_2', type: 'pvp', title: 'Κυνηγός Παικτών', description: 'Κέρδισε 2 PVP μάχες', icon: '🆚', target: 2, rewardCash: 1500, rewardXP: 150 },

  // Crime missions
  { id: 'crimes_3', type: 'crime', title: 'Μικροεγκληματίας', description: 'Κάνε 3 εγκλήματα', icon: '🎭', target: 3, rewardCash: 500, rewardXP: 50 },
  { id: 'crimes_5', type: 'crime', title: 'Εγκληματική Δραστηριότητα', description: 'Κάνε 5 εγκλήματα', icon: '🔪', target: 5, rewardCash: 1000, rewardXP: 100 },
  { id: 'crimes_success_3', type: 'crime_success', title: 'Τέλειο Έγκλημα', description: 'Πέτυχε 3 εγκλήματα στη σειρά', icon: '🎯', target: 3, rewardCash: 1200, rewardXP: 80 },

  // Training missions
  { id: 'gym_3', type: 'gym', title: 'Προπόνηση', description: 'Κάνε 3 προπονήσεις', icon: '💪', target: 3, rewardCash: 400, rewardXP: 60 },
  { id: 'gym_5', type: 'gym', title: 'Σκληρή Δουλειά', description: 'Κάνε 5 προπονήσεις', icon: '🏋️', target: 5, rewardCash: 800, rewardXP: 100 },

  // Mixed missions
  { id: 'earn_2000', type: 'earn', title: 'Κυνηγός Χρημάτων', description: 'Κέρδισε €2.000 σήμερα', icon: '💵', target: 2000, rewardCash: 500, rewardXP: 50 },
  { id: 'earn_5000', type: 'earn', title: 'Μεγάλο Κέρδος', description: 'Κέρδισε €5.000 σήμερα', icon: '💰', target: 5000, rewardCash: 1000, rewardXP: 100 },
]

/** @deprecated Use DAILY_MISSIONS */
export const missionTemplates = DAILY_MISSIONS

/**
 * Linear story chain — Ο Δάσκαλος introduces Gym, Crimes, and Travel.
 * Feature keys (unlockFeature) are checked via missionStore.isFeatureUnlocked.
 */
export const STORY_MISSIONS = [
  {
    id: 'story_daskalos_gym_1',
    title: 'Καλώς ήρθες στο παρκούρ της ζωής',
    npcName: 'Ο Δάσκαλος',
    npcIcon: '🧙‍♂️',
    flavorText:
      'Να μάθεις να περπατάς πριν κλέψεις. Πήγαινε στο γυμναστήριο — ένα σετ προπόνησης, για να δούμε αν είσαι σοβαρός.',
    objective: { type: 'gym', target: 'session', count: 1 },
    requirements: { level: 1, previousMissionId: null },
    rewards: { cash: 350, xp: 40, item: null, unlockFeature: null },
  },
  {
    id: 'story_daskalos_gym_2',
    title: 'Σίδερο και υπομονή',
    npcName: 'Ο Δάσκαλος',
    npcIcon: '🧙‍♂️',
    flavorText:
      'Μια φορά δεν φτάνει. Το σώμα θυμάται — κάνε ακόμα δύο προπονήσεις. Όταν κουράζεσαι, σκέψου ποιος θα σε κυνηγάει αν μείνεις αδύναμος.',
    objective: { type: 'gym', target: 'session', count: 2 },
    requirements: { level: 1, previousMissionId: 'story_daskalos_gym_1' },
    rewards: { cash: 600, xp: 55, item: null, unlockFeature: null },
  },
  {
    id: 'story_daskalos_crime_1',
    title: 'Η πόλη δεν κοιμάται',
    npcName: 'Ο Δάσκαλος',
    npcIcon: '🧙‍♂️',
    flavorText:
      'Τώρα που δεν λυγίζεις σαν χορταριασμένο σπαράγγι, δοκίμασε κάτι πιο… επιχειρηματικό. Ένα μικρό έγκλημα — όχι ηρωισμοί, δουλειά.',
    objective: { type: 'crime', target: 'any', count: 1 },
    requirements: { level: 1, previousMissionId: 'story_daskalos_gym_2' },
    rewards: { cash: 800, xp: 60, item: null, unlockFeature: null },
  },
  {
    id: 'story_daskalos_crime_2',
    title: 'Θράσος με μέτρο',
    npcName: 'Ο Δάσκαλος',
    npcIcon: '🧙‍♂️',
    flavorText:
      'Το Θράσος είναι νόμισμα: ξόδεψέ το σωστά. Ολοκλήρωσε δύο εγκλήματα — επιτυχία ή αποτυχία μετράει για το μάθημα, όχι για το ηθικό σου.',
    objective: { type: 'crime', target: 'any', count: 2 },
    requirements: { level: 1, previousMissionId: 'story_daskalos_crime_1' },
    rewards: { cash: 1200, xp: 90, item: null, unlockFeature: null },
  },
  {
    id: 'story_daskalos_travel_1',
    title: 'Φύγε από τη γειτονιά σου',
    npcName: 'Ο Δάσκαλος',
    npcIcon: '🧙‍♂️',
    flavorText:
      'Έμεινες πολύ στην ίδια πόλη — ο κόσμος είναι μεγαλύτερος. Ταξίδεψε σε άλλον προορισμό. Και αν βρεις «μαύρες» ευκαιρίες… θα σου ανοίξω την πόρτα.',
    objective: { type: 'travel', target: 'trip', count: 1 },
    requirements: { level: 1, previousMissionId: 'story_daskalos_crime_2' },
    rewards: {
      cash: 2500,
      xp: 200,
      item: null,
      unlockFeature: 'black_market',
    },
  },
]

export function getRandomMissions(count = 3) {
  const shuffled = [...DAILY_MISSIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
