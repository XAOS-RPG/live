export const REGEN_RATES = {
  hp:        { amount: 1, intervalMs: 120000 },   // 1 per 2 min
  energy:    { amount: 5, intervalMs: 900000 },    // 5 per 15 min
  nerve:     { amount: 1, intervalMs: 300000 },    // 1 per 5 min
  happiness: { amount: -1, intervalMs: 600000 },   // -1 per 10 min (decay)
}

export const RESOURCE_DEFAULTS = {
  hp:        { max: 100 },
  energy:    { max: 150 },
  nerve:     { max: 30 },
  happiness: { max: 250 },
}

export const GYM_ENERGY_COST = 5
export const COMBAT_ENERGY_BASE = 25
export const WORK_COOLDOWN_MS = 86400000      // 24 hours
export const AUTO_SAVE_INTERVAL_MS = 30000    // 30 seconds
export const MAX_OFFLINE_MS = 86400000        // 24 hours
export const MAX_COMBAT_TURNS = 50
export const ESCAPE_COOLDOWN_MS = 60000       // 1 min between escape attempts
export const FILOTIMO_MAX = 1000
export const MESON_MAX = 100
export const ACTIVITY_LOG_MAX = 50
export const STAT_POINTS_AT_CREATION = 10
export const MIN_STAT = 1
export const MAX_STAT_CREATION = 10
export const STARTING_CASH = 500

export const SAVE_KEY = 'chaos_save_v1'
export const SAVE_VERSION = 1
