import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

// ─── Card Definitions ──────────────────────────────────────────────────────────
export const CARDS = [
  // ═══ COMMON ═══
  {
    id: 'bravos',
    name: 'Ο Μπράβος',
    icon: '🥊',
    rarity: 'common',
    description: 'Επαγγελματίας μπράβος στην υπηρεσία σου. Σε κάνει πιο δυνατό.',
    buff: { type: 'gymGain', stat: 'strength', value: 0.02 },
    buffLabel: '+2% κέρδος Δύναμης στο γυμναστήριο',
  },
  {
    id: 'kleeftis',
    name: 'Ο Κλέφτης',
    icon: '🤏',
    rarity: 'common',
    description: 'Ξέρει πού ακριβώς βρίσκονται τα χρήματα.',
    buff: { type: 'crimeCash', value: 0.03 },
    buffLabel: '+3% κέρδη μετρητών από Εγκλήματα',
  },
  {
    id: 'marathonodromos',
    name: 'Ο Μαραθωνοδρόμος',
    icon: '🏃',
    rarity: 'common',
    description: 'Πρωταθλητής αντοχής. Σε κάνει πιο γρήγορο.',
    buff: { type: 'gymGain', stat: 'speed', value: 0.02 },
    buffLabel: '+2% κέρδος Ταχύτητας στο γυμναστήριο',
  },
  {
    id: 'geitonas',
    name: 'Ο Καλός Γείτονας',
    icon: '🏘️',
    rarity: 'common',
    description: 'Σε κρατά ήρεμο. Αυξάνει το μέγιστο Κέφι σου.',
    buff: { type: 'happinessMax', value: 10 },
    buffLabel: '+10 μέγιστο Κέφι',
  },
  {
    id: 'palaistis',
    name: 'Ο Παλαιστής',
    icon: '🤼',
    rarity: 'common',
    description: 'Παλαιστής με χρόνια εμπειρία. Σε κάνει πιο άνθεκτικό.',
    buff: { type: 'gymGain', stat: 'defense', value: 0.02 },
    buffLabel: '+2% κέρδος Άμυνας στο γυμναστήριο',
  },

  // ═══ RARE ═══
  {
    id: 'lathremporios',
    name: 'Ο Λαθρέμπορος',
    icon: '🚬',
    rarity: 'rare',
    description: 'Γνωρίζει τις πιο γρήγορες και φτηνές διαδρομές στη χώρα.',
    buff: { type: 'travel', timeMult: 0.95, costMult: 0.95 },
    buffLabel: '-5% χρόνος και -5% κόστος ταξιδιού',
  },
  {
    id: 'egkefalos',
    name: 'Ο Εγκέφαλος',
    icon: '🧠',
    rarity: 'rare',
    description: 'Σχεδιάζει τέλεια κάθε κίνηση. Μαθαίνεις πιο γρήγορα.',
    buff: { type: 'xpGain', value: 0.04 },
    buffLabel: '+4% κέρδος XP',
  },
  {
    id: 'ermis',
    name: 'Ο Ερμής',
    icon: '⚡',
    rarity: 'rare',
    description: 'Αγγελιοφόρος των θεών — κυριολεκτικά πετάει. Βελτιώνει όλα σου τα stats.',
    buff: { type: 'gymGainAll', value: 0.04 },
    buffLabel: '+4% κέρδος σε όλα τα stats γυμναστηρίου',
  },
  {
    id: 'somatofylakas',
    name: 'Ο Σωματοφύλακας',
    icon: '🛡️',
    rarity: 'rare',
    description: 'Κανείς δεν περνά χωρίς άδεια. Εξαιρετικά αποδοτικός.',
    buff: { type: 'crimeCash', value: 0.06 },
    buffLabel: '+6% κέρδη μετρητών από Εγκλήματα',
  },
  {
    id: 'dexios',
    name: 'Ο Δέξιος',
    icon: '🎯',
    rarity: 'rare',
    description: 'Επιδέξιος σαν λύκος. Σε βοηθά να γίνεις καλύτερος σε κάθε κίνηση.',
    buff: { type: 'gymGain', stat: 'dexterity', value: 0.03 },
    buffLabel: '+3% κέρδος Επιδεξιότητας στο γυμναστήριο',
  },

  // ═══ LEGENDARY ═══
  {
    id: 'nonos',
    name: 'Ο Νονός',
    icon: '🎩',
    rarity: 'legendary',
    description: 'Ο άντρας που λύνει όλα τα προβλήματα πριν γίνουν. Δίνει παγκόσμια ευθυγράμμιση.',
    buff: { type: 'crimeSuccess', value: 0.10 },
    buffLabel: '+10% επιτυχία Εγκλήματος (παγκόσμια)',
  },
  {
    id: 'moira',
    name: 'Η Μοίρα',
    icon: '🌀',
    rarity: 'legendary',
    description: 'Ελέγχει το πεπρωμένο — και τα κέρδη σου.',
    buff: { type: 'crimeCash', value: 0.15 },
    buffLabel: '+15% κέρδη μετρητών από Εγκλήματα',
  },
  {
    id: 'olympionikas',
    name: 'Ο Ολυμπιονίκης',
    icon: '🥇',
    rarity: 'legendary',
    description: 'Πρωταθλητής Ολυμπιακών Αγώνων — πηγή έμπνευσης για κάθε προπόνηση.',
    buff: { type: 'gymGainAll', value: 0.08 },
    buffLabel: '+8% κέρδος σε όλα τα stats γυμναστηρίου',
  },
  {
    id: 'athanatos',
    name: 'Ο Αθάνατος',
    icon: '⚗️',
    rarity: 'legendary',
    description: 'Δεν πεθαίνει ποτέ. Σε κάνει πιο ανθεκτικό από ποτέ.',
    buff: { type: 'hpMax', value: 20 },
    buffLabel: '+20 μέγιστα HP',
  },
]

export function getCardById(id) {
  return CARDS.find(c => c.id === id) || null
}

// ─── Pack Definitions ──────────────────────────────────────────────────────────
export const PACKS = [
  {
    id: 'basic',
    name: 'Βασικό Πακέτο',
    icon: '📦',
    description: '3 κάρτες. Κυρίως Κοινές με μικρή πιθανότητα για Σπάνια ή Θρυλική.',
    cashCost: 500,
    filotimoCost: 30,
    cardCount: 3,
    rarityWeights: { legendary: 0.01, rare: 0.19, common: 0.80 },
    glowColor: '#4fc3f7',
  },
  {
    id: 'rare',
    name: 'Σπάνιο Πακέτο',
    icon: '🎁',
    description: '3 κάρτες. Κυρίως Σπάνιες με καλή πιθανότητα για Θρυλική.',
    cashCost: 2000,
    filotimoCost: 80,
    cardCount: 3,
    rarityWeights: { legendary: 0.10, rare: 0.60, common: 0.30 },
    glowColor: '#ab47bc',
  },
  {
    id: 'legendary',
    name: 'Θρυλικό Πακέτο',
    icon: '👑',
    description: '3 κάρτες. Μόνο Σπάνιες και Θρυλικές — χωρίς Κοινές.',
    cashCost: 8000,
    filotimoCost: 150,
    cardCount: 3,
    rarityWeights: { legendary: 0.50, rare: 0.50, common: 0.00 },
    glowColor: '#ffd700',
  },
]

export function getPackById(id) {
  return PACKS.find(p => p.id === id) || null
}

// ─── Rarity Metadata ──────────────────────────────────────────────────────────
export const RARITY_META = {
  common:    { label: 'Κοινή',    color: '#90a4ae', bg: 'rgba(144,164,174,0.15)' },
  rare:      { label: 'Σπάνια',   color: '#ab47bc', bg: 'rgba(171,71,188,0.15)'  },
  legendary: { label: 'Θρυλική', color: '#ffd700', bg: 'rgba(255,215,0,0.12)'   },
}

// ─── Internal helpers ─────────────────────────────────────────────────────────
function rollRarity(weights) {
  const r = Math.random()
  if (r < weights.legendary) return 'legendary'
  if (r < weights.legendary + weights.rare) return 'rare'
  return 'common'
}

function rollCardFromRarity(rarity) {
  const pool = CARDS.filter(c => c.rarity === rarity)
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useCardStore = defineStore('card', {
  state: () => ({
    // [{ cardId: string, quantity: number }]
    ownedCards: [],
    // Up to 3 card ids — active buffs
    equippedCards: [],
    openedPacks: 0,
  }),

  getters: {
    ownedCardMap(state) {
      const map = {}
      for (const entry of state.ownedCards) {
        map[entry.cardId] = (map[entry.cardId] || 0) + entry.quantity
      }
      return map
    },

    equippedCardDefs(state) {
      return state.equippedCards.map(id => getCardById(id)).filter(Boolean)
    },

    // ── Crime buffs ─────────────────────────────────────────────────────────
    crimeSuccessBonus() {
      let total = 0
      for (const card of this.equippedCardDefs) {
        if (card.buff.type === 'crimeSuccess') total += card.buff.value
      }
      return 1 + total
    },

    crimeCashBonus() {
      let total = 0
      for (const card of this.equippedCardDefs) {
        if (card.buff.type === 'crimeCash') total += card.buff.value
      }
      return 1 + total
    },

    // ── Gym buffs ───────────────────────────────────────────────────────────
    // All-stat gym multiplier (gymGainAll cards)
    gymGainBonus() {
      let total = 0
      for (const card of this.equippedCardDefs) {
        if (card.buff.type === 'gymGainAll') total += card.buff.value
      }
      return 1 + total
    },

    // Stat-specific gym multiplier — call as cardStore.gymGainStatBonus('strength')
    gymGainStatBonus() {
      return (statKey) => {
        let total = 0
        for (const card of this.equippedCardDefs) {
          if (card.buff.type === 'gymGain' && card.buff.stat === statKey) total += card.buff.value
        }
        return 1 + total
      }
    },

    // ── Travel buffs ────────────────────────────────────────────────────────
    travelTimeMultiplier() {
      let mult = 1
      for (const card of this.equippedCardDefs) {
        if (card.buff.type === 'travel') mult *= card.buff.timeMult
      }
      return mult
    },

    travelCostMultiplier() {
      let mult = 1
      for (const card of this.equippedCardDefs) {
        if (card.buff.type === 'travel') mult *= card.buff.costMult
      }
      return mult
    },

    // ── XP buff ─────────────────────────────────────────────────────────────
    xpGainBonus() {
      let total = 0
      for (const card of this.equippedCardDefs) {
        if (card.buff.type === 'xpGain') total += card.buff.value
      }
      return 1 + total
    },

    // ── Flat bonuses ─────────────────────────────────────────────────────────
    hpMaxBonus() {
      let total = 0
      for (const card of this.equippedCardDefs) {
        if (card.buff.type === 'hpMax') total += card.buff.value
      }
      return total
    },

    happinessMaxBonus() {
      let total = 0
      for (const card of this.equippedCardDefs) {
        if (card.buff.type === 'happinessMax') total += card.buff.value
      }
      return total
    },
  },

  actions: {
    // ── Pack opening ─────────────────────────────────────────────────────────
    _openPack(packId) {
      const pack = getPackById(packId)
      if (!pack) return []
      const drawn = []
      for (let i = 0; i < pack.cardCount; i++) {
        const rarity = rollRarity(pack.rarityWeights)
        const card = rollCardFromRarity(rarity)
        if (card) {
          drawn.push(card)
          this._addCard(card.id)
        }
      }
      this.openedPacks++
      return drawn
    },

    buyPack(packId, currency = 'cash') {
      const pack = getPackById(packId)
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (!pack) return { success: false, message: 'Άγνωστο πακέτο' }

      if (currency === 'filotimo') {
        if (player.filotimo < pack.filotimoCost) {
          gameStore.addNotification(`Χρειάζεσαι ${pack.filotimoCost} Φιλότιμο!`, 'danger')
          return { success: false, message: 'Ανεπαρκές Φιλότιμο' }
        }
        player.addFilotimo(-pack.filotimoCost)
      } else {
        if (player.cash < pack.cashCost) {
          gameStore.addNotification(`Χρειάζεσαι €${pack.cashCost.toLocaleString()}!`, 'danger')
          return { success: false, message: 'Ανεπαρκά μετρητά' }
        }
        player.removeCash(pack.cashCost)
      }

      const drawnCards = this._openPack(packId)
      gameStore.saveGame()
      return { success: true, cards: drawnCards }
    },

    // ── Card ownership ────────────────────────────────────────────────────────
    _addCard(cardId) {
      const existing = this.ownedCards.find(e => e.cardId === cardId)
      if (existing) {
        existing.quantity++
      } else {
        this.ownedCards.push({ cardId, quantity: 1 })
      }
    },

    // ── Equip / Unequip ───────────────────────────────────────────────────────
    equipCard(cardId) {
      if (this.equippedCards.includes(cardId)) return
      if (this.equippedCards.length >= 3) return
      const owned = this.ownedCards.find(e => e.cardId === cardId)
      if (!owned || owned.quantity === 0) return
      this.equippedCards.push(cardId)
      useGameStore().saveGame()
    },

    unequipCard(cardId) {
      this.equippedCards = this.equippedCards.filter(id => id !== cardId)
      useGameStore().saveGame()
    },

    // ── Persistence ───────────────────────────────────────────────────────────
    getSerializable() {
      return {
        ownedCards: this.ownedCards.map(e => ({ ...e })),
        equippedCards: [...this.equippedCards],
        openedPacks: this.openedPacks,
      }
    },

    hydrate(data) {
      if (!data) return
      if (Array.isArray(data.ownedCards)) this.ownedCards = data.ownedCards.map(e => ({ ...e }))
      if (Array.isArray(data.equippedCards)) this.equippedCards = [...data.equippedCards]
      if (data.openedPacks !== undefined) this.openedPacks = data.openedPacks
    },
  },
})
