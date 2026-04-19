/**
 * Athens neighborhoods for the Κυριαρχία στις Γειτονιές system.
 * Each neighborhood can be owned by one player and grants the owner unique bonuses.
 *
 * influenceBaseMax = the max "Επιρροή" (Influence/control) the owner has over the
 * neighborhood. Attacks erode it. When it hits 0, the owner loses control.
 */

export const neighborhoods = [
  {
    id: 'korydallos',
    name: 'Κορυδαλλός',
    icon: '⛓️',
    description: 'Έδρα των Φυλακών Κορυδαλλού. Εδώ κρύβεται η τέχνη της αποφυλάκισης.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'prison',
      label: '-20% χρόνος Φυλακής, +25% ταχύτητα Bust',
      jailTimeReduction: 0.20,
      bustBonus: 0.25,
    },
  },
  {
    id: 'piraeus',
    name: 'Πειραιάς',
    icon: '⚓',
    description: 'Το μεγαλύτερο λιμάνι. Λαθρεμπόριο χωρίς σύνορα.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'smuggling',
      label: '-20% ρίσκο σύλληψης στο Λαθρεμπόριο',
      smugglingRiskReduction: 0.20,
    },
  },
  {
    id: 'keratsini',
    name: 'Κερατσίνι',
    icon: '🏭',
    description: 'Βιομηχανική ζώνη. Φθηνά υλικά, γρήγορη κατασκευή.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'crafting',
      label: '-15% κόστος Crafting',
      craftingCostReduction: 0.15,
    },
  },
  {
    id: 'glyfada',
    name: 'Γλυφάδα',
    icon: '🏖️',
    description: 'Βίλες και clean money. Παθητικό εισόδημα από την αστή ζωή.',
    influenceBaseMax: 1200,
    bonus: {
      type: 'income',
      label: '+200 €/ώρα παθητικό εισόδημα',
      incomePerHour: 200,
    },
  },
  {
    id: 'kifisia',
    name: 'Κηφισιά',
    icon: '💎',
    description: 'Το πιο ακριβό προάστιο. Λεφτά κάνουν λεφτά.',
    influenceBaseMax: 1200,
    bonus: {
      type: 'income',
      label: '+300 €/ώρα παθητικό εισόδημα',
      incomePerHour: 300,
    },
  },
  {
    id: 'omonoia',
    name: 'Ομόνοια',
    icon: '🎲',
    description: 'Η σκληρή καρδιά της Αθήνας. Σπάνια αντικείμενα κυκλοφορούν εδώ.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'drops',
      label: '+30% drop rate σπάνιων αντικειμένων',
      dropRateBonus: 0.30,
    },
  },
  {
    id: 'nikaia',
    name: 'Νίκαια',
    icon: '🔧',
    description: 'Εργατική περιοχή. Σπίτι μαστόρων και τεχνιτών.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'crafting',
      label: '-15% χρόνος Crafting',
      craftingTimeReduction: 0.15,
    },
  },
  {
    id: 'aigaleo',
    name: 'Αιγάλεω',
    icon: '⚙️',
    description: 'Βιομηχανικό κέντρο. Αγοράζεις όπλα σαν σούπερ μάρκετ.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'weapons',
      label: '-10% τιμή όπλων στο κατάστημα',
      weaponDiscountPercent: 0.10,
    },
  },
  {
    id: 'exarcheia',
    name: 'Εξάρχεια',
    icon: '✊',
    description: 'Αναρχική καρδιά. Η αστυνομία αποφεύγει να μπει.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'crime',
      label: '+5% επιτυχία Εγκλήματος, -25% ανίχνευση αστυνομίας',
      crimeSuccessBonus: 0.05,
      policeDetectionReduction: 0.25,
    },
  },
  {
    id: 'monastiraki',
    name: 'Μοναστηράκι',
    icon: '🧿',
    description: 'Παζάρι τουριστών. Πουλάς τα πάντα ακριβά.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'market',
      label: '+20% τιμή πώλησης αντικειμένων',
      sellPriceBonus: 0.20,
    },
  },
  {
    id: 'kolonos',
    name: 'Κολωνός',
    icon: '🗡️',
    description: 'Σκληρή γειτονιά. Εδώ μεγαλώνουν οι καλύτεροι εγκληματίες.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'crime',
      label: '+15% επιτυχία Εγκλήματος',
      crimeSuccessBonus: 0.15,
    },
  },
  {
    id: 'metaxourgio',
    name: 'Μεταξουργείο',
    icon: '💊',
    description: 'Υπόγεια αγορά. Τα ανώτερα εγκλήματα αποδίδουν περισσότερο.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'crime',
      label: '+20% ανταμοιβή Εγκλήματος Tier 4+',
      highTierCrimeBonus: 0.20,
    },
  },
  {
    id: 'kypseli',
    name: 'Κυψέλη',
    icon: '🐝',
    description: 'Πολυπολιτισμική γειτονιά. Μαθαίνεις γρήγορα εδώ.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'xp',
      label: '+10% XP εγκλήματος',
      crimeXpBonus: 0.10,
    },
  },
  {
    id: 'vyronas',
    name: 'Βύρωνας',
    icon: '🏋️',
    description: 'Γειτονιά των αθλητών. Το γυμναστήριο αποδίδει καλύτερα.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'gym',
      label: '+10% κέρδη Γυμναστηρίου',
      gymGainBonus: 0.10,
    },
  },
  {
    id: 'pagkrati',
    name: 'Παγκράτι',
    icon: '🏥',
    description: 'Ιστορική περιοχή κοντά σε νοσοκομεία. Ανάρρωση πιο γρήγορα.',
    influenceBaseMax: 1000,
    bonus: {
      type: 'hospital',
      label: '-15% χρόνος Νοσοκομείου',
      hospitalTimeReduction: 0.15,
    },
  },
]

export function getNeighborhoodById(id) {
  return neighborhoods.find(n => n.id === id) || null
}
