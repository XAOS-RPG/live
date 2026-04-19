/**
 * Εξόρμηση — Route-planning exploration system.
 *
 * Player picks a district, plans a route through connected nodes from an
 * entry point, then executes the route node-by-node. Each node may trigger
 * an event with a mid-run decision (fight / bypass / flee / bribe / accept).
 *
 * V1: 3 districts, 15 nodes total, 20 decision events.
 * Integrates with Κυριαρχία (owning the neighborhood = safer), Player
 * resources (HP/energy/stamina/nerve/cash), Inventory, Filotimo/Meson.
 */

export const EXPEDITION_CONSTS = {
  BASE_MAX_NODES: 3,
  LEVEL_NODE_BONUS_DIVISOR: 3,     // +1 max node per 3 levels
  HARD_MAX_NODES: 8,               // absolute cap for V1
  ENERGY_PER_NODE: 5,              // energy cost per node traversed
  DISTRICT_COOLDOWN_MS: 4 * 60 * 60 * 1000,  // 4h cooldown per district after run
  HEAT_INCREASE_PER_RUN: 15,
  HEAT_DECAY_PER_HOUR: 10,
  HEAT_WARM_THRESHOLD: 31,
  HEAT_HOT_THRESHOLD: 61,
  HEAT_MAX: 100,
  DAILY_ROLLOVER_HOUR_UTC: 1,      // ~3am Athens time
  DIMINISHING: [1.0, 0.7, 0.4, 0.2, 0.0],  // reward mult by run-count-today in district
  OWN_NEIGHBORHOOD_REWARD_MULT: 1.15,
  OWN_NEIGHBORHOOD_AMBUSH_MULT: 0.5,
  HOT_NODE_REWARD_MULT: 1.5,
  HOT_NODES_PER_DISTRICT: 2,
}

/**
 * Districts. Each has a self-contained map — 5 nodes on a local coordinate
 * grid (viewBox 0-340 × 0-480). The entry node is where the route starts.
 *
 * neighborhoodId links to the Κυριαρχία system — if the player owns that
 * neighborhood, they get safer runs and better rewards in that district.
 *
 * eventBias: weight multipliers applied when picking events on this district.
 */
export const EXPEDITION_DISTRICTS = [
  {
    id: 'piraeus',
    name: 'Πειραιάς',
    icon: '⚓',
    color: '#1a2744',
    accent: '#4d6fa3',
    description: 'Λιμάνι, αποβάθρες, λαθραία εμπορεύματα. Τα καλύτερα λάφυρα, οι σκληρότερες συνέπειες.',
    neighborhoodId: 'piraeus',
    entryNodeId: 'p1',
    eventBias: { ambush: 1.0, opportunity: 1.2, contact: 1.1, danger: 1.0, discovery: 0.9 },
    nodes: [
      { id: 'p1', name: 'Είσοδος Λιμανιού', icon: '🚧', x: 50,  y: 430, depth: 0 },
      { id: 'p2', name: 'Αποβάθρα',          icon: '⚓', x: 120, y: 370, depth: 1 },
      { id: 'p3', name: 'Αποθήκες Cargo',    icon: '📦', x: 220, y: 340, depth: 2 },
      { id: 'p4', name: 'Νυχτερινός Μώλος',  icon: '🌙', x: 80,  y: 260, depth: 2 },
      { id: 'p5', name: 'Σκοτεινή Στοά',     icon: '🕳️', x: 200, y: 180, depth: 3 },
    ],
    edges: [
      ['p1','p2'], ['p2','p3'], ['p2','p4'], ['p3','p5'], ['p4','p5'], ['p3','p4'],
    ],
  },
  {
    id: 'omonoia',
    name: 'Ομόνοια',
    icon: '🎲',
    color: '#2d1f1f',
    accent: '#a37a4d',
    description: 'Η σκληρή καρδιά της Αθήνας. Contacts, σπάνιες ευκαιρίες, αστάθεια.',
    neighborhoodId: 'omonoia',
    entryNodeId: 'o1',
    eventBias: { ambush: 0.9, opportunity: 1.0, contact: 1.4, danger: 1.1, discovery: 1.0 },
    nodes: [
      { id: 'o1', name: 'Πλατεία Ομονοίας',   icon: '⛲', x: 170, y: 420, depth: 0 },
      { id: 'o2', name: 'Στοά Εμπόρων',       icon: '🏛️', x: 90,  y: 340, depth: 1 },
      { id: 'o3', name: 'Περίπτερο 24/7',     icon: '🏪', x: 250, y: 340, depth: 1 },
      { id: 'o4', name: 'Μεταξουργείο Corner', icon: '💊', x: 150, y: 220, depth: 2 },
      { id: 'o5', name: 'Σιδηροδρομικός',     icon: '🚇', x: 250, y: 170, depth: 3 },
    ],
    edges: [
      ['o1','o2'], ['o1','o3'], ['o2','o4'], ['o3','o4'], ['o4','o5'], ['o3','o5'],
    ],
  },
  {
    id: 'aigaleo',
    name: 'Αιγάλεω',
    icon: '⚙️',
    color: '#2d2a1a',
    accent: '#a39a4d',
    description: 'Βιομηχανική ζώνη. Σκληρές γειτονιές, πρωτογενές χάος, χειροπιαστά έπαθλα.',
    neighborhoodId: 'aigaleo',
    entryNodeId: 'a1',
    eventBias: { ambush: 1.3, opportunity: 0.9, contact: 0.8, danger: 1.2, discovery: 0.9 },
    nodes: [
      { id: 'a1', name: 'Είσοδος Αιγάλεω',    icon: '🚗', x: 60,  y: 430, depth: 0 },
      { id: 'a2', name: 'Παλιό Εργοστάσιο',   icon: '🏭', x: 170, y: 380, depth: 1 },
      { id: 'a3', name: 'Συνεργείο',          icon: '🔧', x: 270, y: 340, depth: 2 },
      { id: 'a4', name: 'Γήπεδο 5x5',         icon: '🥅', x: 110, y: 240, depth: 2 },
      { id: 'a5', name: 'Αδιέξοδο',           icon: '🚧', x: 240, y: 180, depth: 3 },
    ],
    edges: [
      ['a1','a2'], ['a2','a3'], ['a2','a4'], ['a3','a5'], ['a4','a5'], ['a3','a4'],
    ],
  },
]

export function getDistrict(id) {
  return EXPEDITION_DISTRICTS.find(d => d.id === id) || null
}

export function getNode(districtId, nodeId) {
  const d = getDistrict(districtId)
  return d ? d.nodes.find(n => n.id === nodeId) || null : null
}

export function areNodesConnected(districtId, aId, bId) {
  const d = getDistrict(districtId)
  if (!d) return false
  return d.edges.some(([x, y]) => (x === aId && y === bId) || (x === bId && y === aId))
}

export function getNodeNeighbors(districtId, nodeId) {
  const d = getDistrict(districtId)
  if (!d) return []
  const out = new Set()
  for (const [x, y] of d.edges) {
    if (x === nodeId) out.add(y)
    if (y === nodeId) out.add(x)
  }
  return Array.from(out)
}

/**
 * Event categories. Used to weight daily modifiers and district bias.
 */
export const EVENT_CATEGORIES = ['ambush', 'opportunity', 'contact', 'danger', 'discovery', 'empty']

/**
 * Daily district modifiers — one is randomly chosen per district per day.
 * These tilt the event weighting and create day-to-day variation.
 */
export const DISTRICT_MODIFIERS = [
  {
    id: 'quiet',
    label: 'Ήσυχη μέρα',
    icon: '🌤️',
    description: 'Λιγότερα επεισόδια, αλλά και λιγότερες ευκαιρίες.',
    weightMult: { ambush: 0.6, danger: 0.6, opportunity: 0.8, empty: 2.0 },
    rewardMult: 0.9,
  },
  {
    id: 'police_heavy',
    label: 'Μπλόκα παντού',
    icon: '🚓',
    description: 'Η αστυνομία έχει στήσει περιπολίες. Προσοχή.',
    weightMult: { danger: 2.0, ambush: 0.8, opportunity: 0.9 },
    rewardMult: 1.0,
  },
  {
    id: 'market_day',
    label: 'Ζωντανή πιάτσα',
    icon: '🛒',
    description: 'Έμποροι και επαφές κυκλοφορούν περισσότερο σήμερα.',
    weightMult: { contact: 2.0, opportunity: 1.3, ambush: 0.8 },
    rewardMult: 1.1,
  },
  {
    id: 'gang_war',
    label: 'Κόντρες συμμοριών',
    icon: '🔥',
    description: 'Περισσότερες ενέδρες αλλά και μεγαλύτερα λάφυρα.',
    weightMult: { ambush: 2.2, danger: 1.3, contact: 0.7 },
    rewardMult: 1.3,
  },
  {
    id: 'lucky',
    label: 'Τυχερή μέρα',
    icon: '🍀',
    description: 'Κάτι μυρίζει καλά σήμερα.',
    weightMult: { opportunity: 1.8, discovery: 1.5, ambush: 0.7 },
    rewardMult: 1.2,
  },
  {
    id: 'heatwave',
    label: 'Καύσωνας',
    icon: '🥵',
    description: 'Η κούραση έρχεται γρήγορα — κάθε βήμα κοστίζει περισσότερο.',
    weightMult: {},
    rewardMult: 1.0,
    extraEnergyPerNode: 2,
  },
]

export function getModifier(id) {
  return DISTRICT_MODIFIERS.find(m => m.id === id) || null
}

/**
 * Events. Each event has a category, a prompt, and 2-4 choices with outcomes.
 *
 * Outcome keys are applied by the store:
 *   hp, energy, nerve, stamina, happiness: modifyResource
 *   cash: positive = addCash, negative = removeCash
 *   xp: addXP
 *   crimeXp: addCrimeXP
 *   filotimo: addFilotimoRaw
 *   meson: addMeson
 *   heat: adds to district heat
 *   item: { id, qty } adds to inventory
 *   endRun: boolean — ends the expedition immediately (retreat)
 *
 * Requires (optional):
 *   cash/hp/energy/nerve/stamina: minimum current value
 *   filotimo: minimum
 *
 * roll (optional): { stat, dc } — player must pass a stat check for success outcome.
 *   If fail, the altOutcome is applied instead.
 */
export const EXPEDITION_EVENTS = [
  {
    id: 'ambush_light',
    category: 'ambush',
    icon: '🔪',
    title: 'Μαχαιροβγάλτες',
    prompt: 'Δύο τύποι σου βγαίνουν μπροστά. «Τι έχεις πάνω σου;»',
    choices: [
      { key: 'fight', label: '💥 Πάλεψε', requires: { hp: 25 },
        outcome: { hp: -15, cash: 120, xp: 20, crimeXp: 10, heat: 5 } },
      { key: 'flee',  label: '🏃 Τρέξε',   requires: { stamina: 15 },
        outcome: { stamina: -15, heat: 3 } },
      { key: 'pay',   label: '💸 Πλήρωσε', requires: { cash: 40 },
        outcome: { cash: -40, filotimo: -1 } },
    ],
  },
  {
    id: 'ambush_heavy',
    category: 'ambush',
    icon: '🥊',
    title: 'Συμμορία',
    prompt: 'Τέσσερις κλείνουν τον δρόμο. Δεν φαίνονται φιλικοί.',
    choices: [
      { key: 'fight',  label: '⚔️ Επίθεση',   requires: { hp: 50 },
        outcome: { hp: -35, cash: 300, xp: 45, crimeXp: 20, item: { id: 'kitchen_knife', qty: 1 }, heat: 10 } },
      { key: 'bypass', label: '↪️ Παράκαμψη (+1 βήμα)',
        outcome: { energy: -5, __extraNode: true } },
      { key: 'retreat', label: '🚪 Εγκατάλειψε', outcome: { endRun: true } },
    ],
  },
  {
    id: 'rival_duel',
    category: 'ambush',
    icon: '⚔️',
    title: 'Πρόκληση',
    prompt: 'Ένας τύπος σε κοιτάζει στα μάτια. «Ξέρεις ποιος είμαι;»',
    choices: [
      { key: 'duel',   label: '👊 Μονομαχία',  requires: { hp: 30, nerve: 3 },
        outcome: { hp: -20, nerve: -3, xp: 35, cash: 180, crimeXp: 15 } },
      { key: 'talk',   label: '🗣️ Κατευνάστον',
        outcome: { happiness: -5, filotimo: 1 } },
      { key: 'flee',   label: '🏃 Στρίψε',     requires: { stamina: 20 },
        outcome: { stamina: -20 } },
    ],
  },

  {
    id: 'stash_find',
    category: 'opportunity',
    icon: '💼',
    title: 'Κρυμμένο Στέκι',
    prompt: 'Μια πόρτα μισάνοιχτη — κάποιος άφησε πίσω πράγματα βιαστικά.',
    choices: [
      { key: 'take_all',  label: '🤲 Πάρε τα όλα',
        outcome: { cash: 200, item: { id: 'cigarettes', qty: 2 }, heat: 8 } },
      { key: 'take_half', label: '✋ Πάρε μόνο τα λεφτά',
        outcome: { cash: 120, heat: 3 } },
      { key: 'leave',     label: '🚶 Άφησέ τα',
        outcome: { filotimo: 2 } },
    ],
  },
  {
    id: 'lucky_find',
    category: 'opportunity',
    icon: '💶',
    title: 'Τυχερή Εύρεση',
    prompt: 'Κάτι λάμπει στο χώμα. Σκύβεις και κοιτάς.',
    choices: [
      { key: 'grab', label: '👌 Πάρε', outcome: { cash: 60, xp: 5 } },
    ],
    autoResolve: true,
  },
  {
    id: 'locked_crate',
    category: 'opportunity',
    icon: '📦',
    title: 'Κλειδωμένο Κιβώτιο',
    prompt: 'Ένα μεταλλικό κιβώτιο πεταμένο στον δρόμο. Λουκέτο.',
    choices: [
      { key: 'force',  label: '💪 Σπάσ\' το', requires: { stamina: 10 },
        roll: { stat: 'strength', dc: 6 },
        outcome: { stamina: -10, cash: 250, item: { id: 'mat_iron', qty: 2 }, xp: 20 },
        altOutcome: { stamina: -10, hp: -5 } },
      { key: 'skilled', label: '🔧 Άνοιξέ το με τέχνη', requires: { energy: 8 },
        roll: { stat: 'dexterity', dc: 7 },
        outcome: { energy: -8, cash: 280, xp: 25, item: { id: 'jewelry', qty: 1 } },
        altOutcome: { energy: -8 } },
      { key: 'leave',   label: '🚶 Άφησέ το', outcome: {} },
    ],
  },
  {
    id: 'smuggler_drop',
    category: 'opportunity',
    icon: '🚬',
    title: 'Ανέγγιχτο Πακέτο',
    prompt: 'Ένα πακέτο τυλιγμένο σε μουσαμά, κρυμμένο κάτω από έναν κάδο.',
    choices: [
      { key: 'grab',  label: '🫴 Πάρ\' το',
        outcome: { item: { id: 'cigarettes', qty: 4 }, crimeXp: 15, heat: 10 } },
      { key: 'snitch', label: '📞 Πες το στους μπάτσους',
        outcome: { cash: 80, filotimo: 3, heat: -5 } },
      { key: 'leave',  label: '🙈 Ξέχνα το', outcome: {} },
    ],
    districtBias: { piraeus: 1.5 },
  },

  {
    id: 'shady_contact',
    category: 'contact',
    icon: '👤',
    title: 'Σκιώδης Επαφή',
    prompt: 'Ένας άντρας με κουκούλα σου γνέφει από τη σκοτεινή πλευρά του δρόμου.',
    choices: [
      { key: 'help',   label: '🤝 Κάνε του χάρη', requires: { energy: 10 },
        outcome: { energy: -10, meson: 2, filotimo: 1 } },
      { key: 'pay',    label: '💰 Πλήρωσε για πληροφορία', requires: { cash: 100 },
        outcome: { cash: -100, crimeXp: 20, __revealHotNode: true } },
      { key: 'walk',   label: '🚶 Αγνόησέ τον', outcome: {} },
    ],
  },
  {
    id: 'junkie_beggar',
    category: 'contact',
    icon: '🥀',
    title: 'Ζητιάνος',
    prompt: 'Ένας άντρας σκυμμένος σου ζητά βοήθεια.',
    choices: [
      { key: 'give',    label: '💵 Δώσ\' του 20€', requires: { cash: 20 },
        outcome: { cash: -20, filotimo: 3 } },
      { key: 'take',    label: '😈 Πάρε του ό,τι έχει',
        outcome: { cash: 15, filotimo: -5, item: { id: 'chewing_gum', qty: 1 } } },
      { key: 'ignore',  label: '🚶 Προσπέρνα', outcome: {} },
    ],
  },
  {
    id: 'merchant_blackmarket',
    category: 'contact',
    icon: '🧳',
    title: 'Μαυραγορίτης',
    prompt: 'Ανοίγει μια βαλίτσα γεμάτη πράγματα. «Τιμή φίλου».',
    choices: [
      { key: 'buy_weapon',  label: '🔪 Αγόρασε Μαχαίρι (-250€)', requires: { cash: 250 },
        outcome: { cash: -250, item: { id: 'kitchen_knife', qty: 1 } } },
      { key: 'buy_meds',    label: '💊 Αγόρασε Φάρμακα (-80€)', requires: { cash: 80 },
        outcome: { cash: -80, item: { id: 'painkillers', qty: 3 } } },
      { key: 'sell_info',   label: '🗣️ Πούλα του πληροφορία',
        outcome: { cash: 75, filotimo: -2 } },
      { key: 'leave',       label: '🚶 Αποχώρηση', outcome: {} },
    ],
  },
  {
    id: 'old_friend',
    category: 'contact',
    icon: '🤝',
    title: 'Παλιός Γνωστός',
    prompt: 'Κάποιος σε φωνάζει από μακριά — παλιός σύντροφος που δεν τον είχες δει καιρό.',
    choices: [
      { key: 'catch_up', label: '☕ Ένα τσιγάρο μαζί',
        outcome: { happiness: 15, filotimo: 2, meson: 1 } },
      { key: 'business', label: '💼 Κάνε δουλειά',
        outcome: { cash: 100, crimeXp: 10, happiness: 5 } },
      { key: 'walk',     label: '🚶 Δεν έχεις χρόνο', outcome: { filotimo: -1 } },
    ],
  },

  {
    id: 'cop_patrol',
    category: 'danger',
    icon: '🚓',
    title: 'Περιπολία',
    prompt: 'Δύο μπάτσοι πλησιάζουν. Σε έχουν δει.',
    choices: [
      { key: 'hide',  label: '🫥 Κρύψου', requires: { nerve: 3 },
        outcome: { nerve: -3, __extraNode: true } },
      { key: 'walk',  label: '😎 Πέρνα ψύχραιμα',
        roll: { stat: 'speed', dc: 7 },
        outcome: { nerve: -2 },
        altOutcome: { nerve: -4, cash: -50, heat: 10 } },
      { key: 'run',   label: '🏃 Τρέξε', requires: { stamina: 25 },
        outcome: { stamina: -25, heat: 15 } },
    ],
  },
  {
    id: 'police_checkpoint',
    category: 'danger',
    icon: '🚧',
    title: 'Μπλόκο',
    prompt: 'Έστησαν έλεγχο στο δρόμο. Γυρισμός αδύνατος.',
    choices: [
      { key: 'bribe',  label: '💰 Μίζα 80€', requires: { cash: 80 },
        outcome: { cash: -80, filotimo: -1 } },
      { key: 'persuade', label: '🗣️ Πείσ\' τους', requires: { nerve: 4 },
        roll: { stat: 'speed', dc: 8 },
        outcome: { nerve: -4, xp: 15 },
        altOutcome: { nerve: -4, cash: -150, heat: 10 } },
      { key: 'detour', label: '↩️ Παράκαμψη (+2 βήματα)',
        outcome: { energy: -8, __extraNode: 2 } },
    ],
  },
  {
    id: 'stray_dogs',
    category: 'danger',
    icon: '🐕',
    title: 'Αδέσποτα',
    prompt: 'Τρία σκυλιά γρυλίζουν. Δεν δείχνουν διάθεση να υποχωρήσουν.',
    choices: [
      { key: 'fight',   label: '💢 Αντιμετώπισέ τα', requires: { hp: 20 },
        outcome: { hp: -12, xp: 10 } },
      { key: 'feed',    label: '🍞 Δώσε τους φαΐ', requires: { item: 'toast_bag' },
        outcome: { item: { id: 'toast_bag', qty: -1 }, filotimo: 2 } },
      { key: 'avoid',   label: '🚶 Κάνε κύκλο',
        outcome: { stamina: -8 } },
    ],
  },

  {
    id: 'hidden_door',
    category: 'discovery',
    icon: '🚪',
    title: 'Κρυφή Πόρτα',
    prompt: 'Πίσω από σκουπίδια, μια παλιά πόρτα μισάνοιχτη. Μυρίζει υγρασία.',
    choices: [
      { key: 'enter',  label: '🔦 Μπες μέσα', requires: { energy: 12 },
        outcome: { energy: -12, cash: 400, crimeXp: 30, xp: 30, item: { id: 'jewelry', qty: 1 } } },
      { key: 'mark',   label: '✏️ Σημάδεψε για αργότερα',
        outcome: { __markNode: true } },
      { key: 'leave',  label: '🚶 Άφησέ το', outcome: {} },
    ],
  },
  {
    id: 'rooftop_view',
    category: 'discovery',
    icon: '🏙️',
    title: 'Ταράτσα',
    prompt: 'Μια σκάλα οδηγεί πάνω. Ολόκληρη η γειτονιά απλώνεται μπροστά σου.',
    choices: [
      { key: 'scout', label: '🔭 Παρατήρησε',
        outcome: { xp: 15, happiness: 10, __revealHotNode: true } },
      { key: 'rest',  label: '😮‍💨 Ξεκουράσου',
        outcome: { energy: 15, happiness: 8 } },
    ],
    autoResolve: false,
  },
  {
    id: 'graffiti_wall',
    category: 'discovery',
    icon: '🎨',
    title: 'Τοιχογραφία',
    prompt: 'Ένα γιγάντιο γκράφιτι. Κάτι κρυφό γράφει στη γωνία.',
    choices: [
      { key: 'read',  label: '👀 Διάβασέ το',
        outcome: { crimeXp: 15, filotimo: 1, meson: 1 } },
      { key: 'add',   label: '🖌️ Πρόσθεσε το tag σου', requires: { nerve: 2 },
        outcome: { nerve: -2, happiness: 5, heat: 3 } },
    ],
  },

  {
    id: 'empty_street',
    category: 'empty',
    icon: '🌆',
    title: 'Ήσυχο πέρασμα',
    prompt: 'Τίποτα αξιοσημείωτο εδώ. Μόνο σκιές.',
    choices: [
      { key: 'continue', label: '➡️ Συνέχισε', outcome: { happiness: -1 } },
    ],
    autoResolve: true,
  },
]

export function getEventById(id) {
  return EXPEDITION_EVENTS.find(e => e.id === id) || null
}

/**
 * Base event weights per category — used when no modifier is active.
 * Empty events are a floor — without them every node would be eventful and
 * resolution would feel exhausting.
 */
export const BASE_EVENT_WEIGHTS = {
  ambush: 18,
  opportunity: 22,
  contact: 18,
  danger: 14,
  discovery: 8,
  empty: 20,
}
