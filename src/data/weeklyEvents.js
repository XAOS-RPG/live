/**
 * Weekly rotating events.
 * Active event is determined by week number (ISO week) so all players see the same event.
 */
export const weeklyEvents = [
  {
    id: 'double_xp',
    name: 'Διπλή Εμπειρία',
    description: 'Όλα τα XP x2 αυτή τη βδομάδα!',
    icon: '⭐',
    color: '#FFD700',
    modifiers: { xpMultiplier: 2.0 },
  },
  {
    id: 'police_operation',
    name: 'Αστυνομική Επιχείρηση',
    description: 'Τα εγκλήματα είναι πιο δύσκολα αλλά αποδίδουν διπλάσια!',
    icon: '🚨',
    color: '#FF4444',
    modifiers: { crimeSuccessMultiplier: 0.8, crimeRewardMultiplier: 2.0 },
  },
  {
    id: 'sale_season',
    name: 'Εκπτώσεις',
    description: 'Τιμές καταστημάτων -30%!',
    icon: '🏷️',
    color: '#4CAF50',
    modifiers: { shopPriceMultiplier: 0.7 },
  },
  {
    id: 'blood_moon',
    name: 'Blood Moon',
    description: 'Combat rewards x3 και μειωμένος χρόνος νοσοκομείου!',
    icon: '🌑',
    color: '#B71C1C',
    modifiers: { combatRewardMultiplier: 3.0, hospitalTimeMultiplier: 0.5 },
  },
  {
    id: 'city_festival',
    name: 'Φεστιβάλ Πόλης',
    description: 'Μια τυχερή πόλη δίνει +50% σε όλα!',
    icon: '🎉',
    color: '#E040FB',
    modifiers: { festivalCityBonus: 1.5 },
  },
  {
    id: 'stock_crash',
    name: 'Κρίση Χρηματιστηρίου',
    description: 'Η μεταβλητότητα x3 — μεγάλες ευκαιρίες ή καταστροφή!',
    icon: '📉',
    color: '#FF5722',
    modifiers: { stockVolatilityMultiplier: 3.0 },
  },
  {
    id: 'rare_hunt',
    name: 'Κυνήγι Σπάνιων',
    description: 'Τριπλάσιο chance για item drop από εγκλήματα!',
    icon: '💎',
    color: '#9C27B0',
    modifiers: { itemDropMultiplier: 3.0 },
  },
  {
    id: 'gym_rush',
    name: 'Gym Rush',
    description: 'Τα gains στο γυμναστήριο x2 αυτή τη βδομάδα!',
    icon: '🏋️',
    color: '#2196F3',
    modifiers: { gymGainMultiplier: 2.0 },
  },
  {
    id: 'happy_days',
    name: 'Happy Days',
    description: 'Το Κέφι δεν πέφτει αυτή τη βδομάδα! Party mode!',
    icon: '🎊',
    color: '#FFAB00',
    modifiers: { happinessDecayMultiplier: 0.0 },
  },
]

/**
 * Returns the ISO week number for a given date.
 */
export function getISOWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

/**
 * Get the deterministic weekly event for a given week.
 * Uses year + week number so the same week always shows the same event.
 */
export function getEventForWeek(date = new Date()) {
  const week = getISOWeekNumber(date)
  const year = date.getFullYear()
  const index = (year * 53 + week) % weeklyEvents.length
  return weeklyEvents[index]
}

/**
 * Get end of current ISO week (Sunday 23:59:59 UTC+3 Greece time).
 */
export function getWeekEndTimestamp(date = new Date()) {
  const d = new Date(date)
  const dayOfWeek = d.getDay() // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
  d.setDate(d.getDate() + daysUntilSunday)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/**
 * Get a deterministic "festival city" for the week.
 */
const CITY_IDS = ['athens', 'thessaloniki', 'patras', 'heraklion', 'mykonos', 'santorini', 'corfu']

export function getFestivalCity(date = new Date()) {
  const week = getISOWeekNumber(date)
  const year = date.getFullYear()
  return CITY_IDS[(year * 53 + week) % CITY_IDS.length]
}
