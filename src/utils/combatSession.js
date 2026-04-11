/** Session flags for combat: refresh/tab close while fighting counts as defeat. */

export const COMBAT_SESSION_KEY = 'greekTorn_combat_active'
export const COMBAT_INTERRUPT_KEY = 'greekTorn_combat_beforeunload'

/**
 * @param {{ mode: string, isPvp: boolean, opponentId: string|number, opponentLevel: number, opponentDifficulty: string|null, opponentName: string, energyCost: number }} payload
 */
export function persistCombatSession(payload) {
  sessionStorage.setItem(COMBAT_SESSION_KEY, JSON.stringify(payload))
}

export function clearCombatSession() {
  sessionStorage.removeItem(COMBAT_SESSION_KEY)
  sessionStorage.removeItem(COMBAT_INTERRUPT_KEY)
}

export function readCombatSession() {
  try {
    const r = sessionStorage.getItem(COMBAT_SESSION_KEY)
    return r ? JSON.parse(r) : null
  } catch {
    return null
  }
}

export function markCombatInterrupted() {
  sessionStorage.setItem(COMBAT_INTERRUPT_KEY, '1')
}

/** Διαβάζει και καθαρίζει τη σημαία refresh/κλεισίματος καρτέλας. */
export function consumeCombatInterruptedFlag() {
  const v = sessionStorage.getItem(COMBAT_INTERRUPT_KEY) === '1'
  sessionStorage.removeItem(COMBAT_INTERRUPT_KEY)
  return v
}
