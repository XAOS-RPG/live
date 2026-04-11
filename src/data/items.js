export const items = [
  // === WEAPONS - Melee ===
  { id: 'kitchen_knife', name: 'Μαχαίρι Κουζίνας', type: 'weapon', subtype: 'melee', rarity: 'common', damage: 3, accuracy: 0.90, buyPrice: 50, sellPrice: 25, description: 'Ένα απλό μαχαίρι.', levelRequired: 1, icon: '🔪' },
  { id: 'bat', name: 'Ρόπαλο', type: 'weapon', subtype: 'melee', rarity: 'common', damage: 5, accuracy: 0.85, buyPrice: 100, sellPrice: 50, description: 'Ξύλινο ρόπαλο του μπέιζμπολ.', levelRequired: 1, icon: '🏏' },
  { id: 'switchblade', name: 'Σουγιάς', type: 'weapon', subtype: 'melee', rarity: 'uncommon', damage: 7, accuracy: 0.92, buyPrice: 200, sellPrice: 100, description: 'Αιχμηρός σουγιάς τσέπης.', levelRequired: 3, icon: '🗡️' },
  { id: 'axe', name: 'Τσεκούρι', type: 'weapon', subtype: 'melee', rarity: 'uncommon', damage: 10, accuracy: 0.80, buyPrice: 350, sellPrice: 175, description: 'Βαρύ τσεκούρι. Αργό αλλά θανατηφόρο.', levelRequired: 5, icon: '🪓' },
  // === WEAPONS - Ranged ===
  { id: 'pistol_small', name: 'Μικρό Πιστόλι', type: 'weapon', subtype: 'ranged', rarity: 'uncommon', damage: 12, accuracy: 0.75, buyPrice: 800, sellPrice: 400, description: 'Ένα μικρό πιστόλι .22 αγνώστου προελεύσεως.', levelRequired: 5, icon: '🔫' },
  { id: 'shotgun', name: 'Καραμπίνα', type: 'weapon', subtype: 'ranged', rarity: 'rare', damage: 18, accuracy: 0.70, buyPrice: 2000, sellPrice: 1000, description: 'Κυνηγετική καραμπίνα.', levelRequired: 8, icon: '🔫' },
  { id: 'uzi', name: 'Uzi', type: 'weapon', subtype: 'ranged', rarity: 'rare', damage: 15, accuracy: 0.65, buyPrice: 3500, sellPrice: 1750, description: 'Αυτόματο υποπολυβόλο.', levelRequired: 12, icon: '🔫' },
  { id: 'ak47', name: 'AK-47', type: 'weapon', subtype: 'ranged', rarity: 'epic', damage: 25, accuracy: 0.72, buyPrice: 8000, sellPrice: 4000, description: 'Το κλασικό Καλάσνικοφ. Φονικό.', levelRequired: 16, icon: '🔫' },

  // === ARMOR ===
  { id: 'leather_jacket', name: 'Δερμάτινο Μπουφάν', type: 'armor', rarity: 'common', defense: 3, buyPrice: 150, sellPrice: 75, description: 'Ένα σκληρό δερμάτινο μπουφάν.', levelRequired: 1, icon: '🧥' },
  { id: 'vest_light', name: 'Αλεξίσφαιρο Γιλέκο Ι', type: 'armor', rarity: 'uncommon', defense: 8, buyPrice: 500, sellPrice: 250, description: 'Ελαφρύ αλεξίσφαιρο γιλέκο.', levelRequired: 3, icon: '🦺' },
  { id: 'vest_medium', name: 'Αλεξίσφαιρο Γιλέκο ΙΙ', type: 'armor', rarity: 'rare', defense: 15, buyPrice: 1500, sellPrice: 750, description: 'Στρατιωτικής ποιότητας.', levelRequired: 8, icon: '🦺' },
  { id: 'vest_heavy', name: 'Αλεξίσφαιρο Γιλέκο ΙΙΙ', type: 'armor', rarity: 'epic', defense: 25, buyPrice: 5000, sellPrice: 2500, description: 'Βαρύ αλεξίσφαιρο. Ανθεκτικό σε πυρά.', levelRequired: 14, icon: '🦺' },
  { id: 'full_armor', name: 'Πλήρης Θωράκιση', type: 'armor', rarity: 'legendary', defense: 40, buyPrice: 15000, sellPrice: 7500, description: 'Πλήρης σωματική θωράκιση ειδικών δυνάμεων.', levelRequired: 20, icon: '🛡️' },

  // === MEDICAL ===
  { id: 'bandages', name: 'Γάζες', type: 'medical', rarity: 'common', healAmount: 10, buyPrice: 20, sellPrice: 10, description: 'Βασικές γάζες πρώτων βοηθειών.', levelRequired: 1, icon: '🩹' },
  { id: 'first_aid', name: 'Κιτ Πρώτων Βοηθειών', type: 'medical', rarity: 'uncommon', healAmount: 30, buyPrice: 100, sellPrice: 50, description: 'Πλήρες κιτ πρώτων βοηθειών.', levelRequired: 1, icon: '🏥' },
  { id: 'painkillers', name: 'Παυσίπονα', type: 'medical', rarity: 'common', healAmount: 15, hospitalReduction: 60000, buyPrice: 50, sellPrice: 25, description: 'Μειώνουν τον χρόνο νοσηλείας.', levelRequired: 1, icon: '💊' },
  { id: 'surgical_kit', name: 'Χειρουργικό Κιτ', type: 'medical', rarity: 'rare', healAmount: 60, hospitalReduction: 180000, buyPrice: 500, sellPrice: 250, description: 'Επαγγελματικό χειρουργικό κιτ.', levelRequired: 5, icon: '🏥' },
  { id: 'adrenaline', name: 'Αδρεναλίνη', type: 'medical', rarity: 'epic', healAmount: 100, energyBoost: 50, buyPrice: 1000, sellPrice: 500, description: 'Άμεση αδρεναλίνη. Γεμίζει ζωή και ενέργεια.', levelRequired: 8, icon: '💉' },

  // === DRUGS ===
  { id: 'cigarettes', name: 'Τσιγάρα', type: 'drug', rarity: 'common', happinessBoost: 5, buyPrice: 10, sellPrice: 5, description: 'Ένα πακέτο τσιγάρα.', levelRequired: 1, icon: '🚬' },
  { id: 'alcohol', name: 'Αλκοόλ', type: 'drug', rarity: 'common', happinessBoost: 15, buyPrice: 30, sellPrice: 15, description: 'Ένα μπουκάλι ούζο. Ανεβάζει το κέφι.', levelRequired: 1, icon: '🍺' },
  { id: 'hash', name: 'Χασίς', type: 'drug', rarity: 'uncommon', happinessBoost: 40, buyPrice: 100, sellPrice: 50, description: 'Μικρή ποσότητα χασίς. Μεγάλο κέφι.', levelRequired: 3, icon: '🌿' },
  { id: 'cocaine', name: 'Κοκαΐνη', type: 'drug', rarity: 'rare', happinessBoost: 80, energyBoost: 30, buyPrice: 500, sellPrice: 250, description: 'Κοκαΐνη. Τεράστιο boost σε κέφι και ενέργεια.', levelRequired: 8, icon: '❄️' },
  { id: 'steroids', name: 'Στεροειδή', type: 'drug', rarity: 'rare', happinessBoost: 20, strengthBoost: 2, buyPrice: 300, sellPrice: 150, description: 'Αναβολικά στεροειδή. Προσωρινό +2 δύναμη.', levelRequired: 5, icon: '💪' },

  // === KIOSK ITEMS (stolen from a περίπτερο — consumable) ===
  { id: 'chocolate', name: 'Σοκολάτα', type: 'drug', rarity: 'common', happinessBoost: 6, buyPrice: 0, sellPrice: 3, description: 'Μια σοκολάτα. +6 Κέφι.', levelRequired: 1, icon: '🍫' },
  { id: 'water_bottle', name: 'Νερό', type: 'medical', rarity: 'common', healAmount: 5, buyPrice: 0, sellPrice: 2, description: 'Ένα μπουκάλι νερό. +5 HP.', levelRequired: 1, icon: '💧' },
  { id: 'soda_can', name: 'Αναψυκτικό', type: 'drug', rarity: 'common', happinessBoost: 4, buyPrice: 0, sellPrice: 3, description: 'Ένα κουτί αναψυκτικό. +4 Κέφι.', levelRequired: 1, icon: '🥤' },
  { id: 'beer_can', name: 'Μπύρα', type: 'drug', rarity: 'common', happinessBoost: 10, buyPrice: 0, sellPrice: 5, description: 'Μια κρύα μπύρα. +10 Κέφι.', levelRequired: 1, icon: '🍺' },
  { id: 'toast_bag', name: 'Τοστ', type: 'medical', rarity: 'common', healAmount: 8, buyPrice: 0, sellPrice: 4, description: 'Ένα τοστ σε σελοφάν. +8 HP.', levelRequired: 1, icon: '🥪' },
  { id: 'chewing_gum', name: 'Τσίχλα', type: 'drug', rarity: 'common', happinessBoost: 2, buyPrice: 0, sellPrice: 1, description: 'Ένα πακετάκι τσίχλες. +2 Κέφι.', levelRequired: 1, icon: '🫧' },

  // === MISC / LOOT ===
  { id: 'lighter', name: 'Αναπτήρας', type: 'misc', rarity: 'common', buyPrice: 0, sellPrice: 5, description: 'Ένας φτηνός αναπτήρας.', levelRequired: 1, icon: '🔥' },
  { id: 'watch_cheap', name: 'Φτηνό Ρολόι', type: 'misc', rarity: 'common', buyPrice: 0, sellPrice: 30, description: 'Ένα ρολόι χεριού.', levelRequired: 1, icon: '⌚' },
  { id: 'car_radio', name: 'Ράδιο Αυτοκινήτου', type: 'misc', rarity: 'uncommon', buyPrice: 0, sellPrice: 80, description: 'Κλεμμένο ράδιο αυτοκινήτου.', levelRequired: 1, icon: '📻' },
  { id: 'sunglasses', name: 'Γυαλιά Ηλίου', type: 'misc', rarity: 'common', buyPrice: 0, sellPrice: 15, description: 'Γυαλιά ηλίου επώνυμα (μάλλον).', levelRequired: 1, icon: '🕶️' },
  { id: 'jewelry', name: 'Κοσμήματα', type: 'misc', rarity: 'rare', buyPrice: 0, sellPrice: 300, description: 'Κλεμμένα κοσμήματα. Αξίζουν λίγα.', levelRequired: 1, icon: '💍' },
  { id: 'laptop', name: 'Laptop', type: 'misc', rarity: 'uncommon', buyPrice: 0, sellPrice: 200, description: 'Ένα μεταχειρισμένο laptop.', levelRequired: 1, icon: '💻' },
  { id: 'cigarette_carton', name: 'Κούτα Τσιγάρα', type: 'misc', rarity: 'uncommon', buyPrice: 0, sellPrice: 150, description: 'Λαθραία κούτα τσιγάρα.', levelRequired: 1, icon: '📦' },
  { id: 'ancient_coin', name: 'Αρχαίο Νόμισμα', type: 'misc', rarity: 'epic', buyPrice: 0, sellPrice: 2000, description: 'Αρχαίο ελληνικό νόμισμα. Πολύτιμο στη μαύρη αγορά.', levelRequired: 1, icon: '🪙' },
  { id: 'ancient_vase', name: 'Αρχαίο Αγγείο', type: 'misc', rarity: 'legendary', buyPrice: 0, sellPrice: 5000, description: 'Αρχαίο ελληνικό αγγείο. Ανεκτίμητο.', levelRequired: 1, icon: '🏺' },
]

export function getItemById(id) {
  return items.find(i => i.id === id)
}

export function getItemsByType(type) {
  return items.filter(i => i.type === type)
}

export function getBuyableItems() {
  return items.filter(i => i.buyPrice > 0)
}
