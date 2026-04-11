/**
 * Casino games — ΟΠΑΠ-style betting.
 * Each game has a min/max bet, house edge, and payout structure.
 */

export const casinoGames = [
  {
    id: 'coin_flip',
    name: 'Κορώνα-Γράμματα',
    description: 'Κλασικό coin flip. Διπλασίασε ή χάσε.',
    icon: '🪙',
    minBet: 10,
    maxBet: 10000,
    payout: 2.0,       // win = bet * payout
    winChance: 0.48,    // slight house edge
  },
  {
    id: 'dice_high',
    name: 'Ζάρι (Ψηλά)',
    description: 'Ρίξε ζάρι. Πάνω από 50 κερδίζεις x1.9.',
    icon: '🎲',
    minBet: 10,
    maxBet: 20000,
    payout: 1.9,
    winChance: 0.50,
  },
  {
    id: 'dice_lucky',
    name: 'Τυχερό Ζάρι',
    description: 'Ρίξε ζάρι. Πάνω από 75 κερδίζεις x3.5.',
    icon: '🎯',
    minBet: 50,
    maxBet: 50000,
    payout: 3.5,
    winChance: 0.25,
  },
  {
    id: 'number_guess',
    name: 'Μάντεψε τον Αριθμό',
    description: 'Διάλεξε 1-10. Αν πετύχεις, x8.',
    icon: '🔢',
    minBet: 20,
    maxBet: 5000,
    payout: 8.0,
    winChance: 0.10,    // 1/10
    requiresChoice: true,
    choiceRange: [1, 10],
  },
  {
    id: 'proto',
    name: 'ΠΡΟΤΟ',
    description: 'Διάλεξε αριθμό 1-100. Jackpot x50!',
    icon: '💎',
    minBet: 100,
    maxBet: 2000,
    payout: 50.0,
    winChance: 0.01,    // 1/100
    requiresChoice: true,
    choiceRange: [1, 100],
  },
]

export function getCasinoGameById(id) {
  return casinoGames.find(g => g.id === id) || null
}
