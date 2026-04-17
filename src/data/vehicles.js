export const VEHICLES = [
  {
    id: 'papaki',
    name: 'Παπάκι',
    icon: '🛵',
    description: 'Γρήγορο αλλά μικρό. Ιδανικό για ελαφρύ φορτίο.',
    price: 0,
    cargoBonus: 0,
    avoidance: 0.10,
    unlockLevel: 1,
    isDefault: true,
  },
  {
    id: 'van',
    name: 'Βαν',
    icon: '🚐',
    description: 'Μέτρια χωρητικότητα, καλή απόκρυση από τα μπλόκα.',
    price: 15000,
    cargoBonus: 5,
    avoidance: 0.20,
    unlockLevel: 5,
  },
  {
    id: 'truck',
    name: 'Φορτηγό',
    icon: '🚛',
    description: 'Τεράστια χωρητικότητα. Δύσκολο να κρυφτεί από την αστυνομία.',
    price: 50000,
    cargoBonus: 15,
    avoidance: 0.10,
    unlockLevel: 10,
  },
  {
    id: 'speedboat',
    name: 'Ταχύπλοο',
    icon: '🚤',
    description: 'Θαλάσσιες διαδρομές μόνο. Σχεδόν αόρατο από την ακτοφυλακή.',
    price: 80000,
    cargoBonus: 8,
    avoidance: 0.45,
    unlockLevel: 15,
    seaOnly: true,
  },
]

export const SEA_ROUTE_CITIES = ['heraklion', 'mykonos', 'santorini', 'corfu']

export function getVehicleById(id) {
  return VEHICLES.find(v => v.id === id) ?? null
}
