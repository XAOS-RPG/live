import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useFactionStore } from './factionStore'
import { neighborhoods, getNeighborhoodById } from '../data/neighborhoods'
import { calculateWallDamage, calculateFilotimoAttackPenalty } from '../engine/formulas'

// ── Constants ────────────────────────────────────────────────────────────────
const NEIGHBORHOOD_IDS     = neighborhoods.map(n => n.id)
const MAX_OWNED            = 3
const ATTACK_NERVE_COST    = 8
const ATTACK_COOLDOWN_MS   = 2 * 60 * 60 * 1000    // 2 hours per neighborhood
const KEP_NERVE_COST       = 3
const KEP_CASH_COST        = 200
const KEP_WALL_REPAIR      = 50
const KEP_COOLDOWN_MS      = 6 * 60 * 60 * 1000    // 6 hours
const REPAIR_CASH_PER_HP   = 5                      // 5 cash per 1 wall HP
const INACTIVITY_MS        = 7 * 24 * 60 * 60 * 1000 // 7 days → neutral
const COALITION_THRESHOLD  = 3                      // unique attackers in 24h for bonus
const COALITION_BONUS      = 0.15                   // +15% wall damage
const RETALIATION_BONUS    = 0.25                   // +25% attack if retaliation active
const RETALIATION_MS       = 48 * 60 * 60 * 1000   // 48 hours
const DISREPUTABLE_MS      = 2 * 60 * 60 * 1000    // 2 hours
const SPREAD_PENALTY       = 0.05                   // -5% wall max HP per extra territory
const FACTION_WALL_BONUS   = 0.10                   // +10% wall max HP if owner in a faction
// Exponential maintenance cost per territory slot
const MAINTENANCE_COSTS    = [500, 1000, 2500]
const CAPTURE_WALL_FRACTION = 0.30                  // new capture starts at 30% wall HP

function makeEmptyNeighborhoods() {
  return Object.fromEntries(
    NEIGHBORHOOD_IDS.map(id => [id, {
      ownerId: null,
      ownerUsername: '',
      ownerLevel: 1,
      wallHp: getNeighborhoodById(id)?.wallBaseHp ?? 1000,
      capturedAt: 0,
      lastAttackedAt: 0,
      lastAttackerUsername: '',
      lastMaintenancePaidAt: 0,
      graffiti: '',
    }])
  )
}

export const useNeighborhoodStore = defineStore('neighborhood', {
  state: () => ({
    neighborhoods: makeEmptyNeighborhoods(),
    attackCooldowns: {},    // { nid: timestampWhenCanAttackAgain }
    kepCooldowns: {},       // { nid: timestampWhenCanKEPAgain }
    lastMaintenanceCheck: 0,
    retaliationBonus: null, // { targetId, targetUsername, endsAt }
    disreputableUntil: null,
    incomeAccumulator: 0,   // ms accumulated for income tick
    myUserId: null,         // set from auth on fetchNeighborhoods, not serialized
    lastFetched: 0,
    _channel: null,
  }),

  getters: {
    myNeighborhoods: (state) => {
      if (!state.myUserId) return []
      return Object.entries(state.neighborhoods)
        .filter(([, n]) => n.ownerId && n.ownerId === state.myUserId)
        .map(([id, n]) => ({ id, ...n }))
    },

    // Spread penalty: 0 for 1 territory, -5% per extra
    spreadPenalty: (state) => {
      if (!state.myUserId) return 0
      const count = Object.values(state.neighborhoods)
        .filter(n => n.ownerId === state.myUserId).length
      return count <= 1 ? 0 : (count - 1) * SPREAD_PENALTY
    },

    effectiveWallMaxHp: (state) => (nid) => {
      const def = getNeighborhoodById(nid)
      if (!def) return 1000
      const n = state.neighborhoods[nid]
      const ownerId = n?.ownerId || null
      // Spread penalty based on how many territories THIS owner has
      const ownedCount = ownerId
        ? Object.values(state.neighborhoods).filter(x => x.ownerId === ownerId).length
        : 1
      const penalty = ownedCount <= 1 ? 0 : (ownedCount - 1) * SPREAD_PENALTY
      const isMyTerritory = !!(ownerId && ownerId === state.myUserId)
      const factionBonus = isMyTerritory && useFactionStore().currentFaction ? FACTION_WALL_BONUS : 0
      return Math.floor(def.wallBaseHp * (1 - penalty) * (1 + factionBonus))
    },

    dailyMaintenanceCost: (state) => {
      if (!state.myUserId) return 0
      const owned = Object.values(state.neighborhoods)
        .filter(n => n.ownerId === state.myUserId).length
      let total = 0
      for (let i = 0; i < owned; i++) total += (MAINTENANCE_COSTS[i] ?? 2500)
      return total
    },

    isDisreputable: (state) => {
      return !!(state.disreputableUntil && state.disreputableUntil > Date.now())
    },

    retaliationActive: (state) => {
      return !!(state.retaliationBonus && state.retaliationBonus.endsAt > Date.now())
    },

    canAttack: (state) => (nid) => {
      const n = state.neighborhoods[nid]
      if (!n || !n.ownerId) return { can: false, reason: 'empty' }
      if (state.myUserId && n.ownerId === state.myUserId) return { can: false, reason: 'own' }
      const player = usePlayerStore()
      if (player.resources.nerve.current < ATTACK_NERVE_COST) {
        return { can: false, reason: 'no_nerve' }
      }
      const cd = state.attackCooldowns[nid]
      if (cd && cd > Date.now()) return { can: false, reason: 'cooldown' }
      return { can: true }
    },

    canClaim: (state) => (nid) => {
      const n = state.neighborhoods[nid]
      if (!n || n.ownerId) return { can: false, reason: n?.ownerId ? 'owned' : 'unknown' }
      const owned = state.myUserId
        ? Object.values(state.neighborhoods).filter(x => x.ownerId === state.myUserId).length
        : 0
      if (owned >= MAX_OWNED) return { can: false, reason: 'cap' }
      return { can: true }
    },

    attackCooldownRemaining: (state) => (nid) => {
      const cd = state.attackCooldowns[nid]
      if (!cd) return 0
      return Math.max(0, cd - Date.now())
    },

    kepCooldownRemaining: (state) => (nid) => {
      const cd = state.kepCooldowns[nid]
      if (!cd) return 0
      return Math.max(0, cd - Date.now())
    },

    // Aggregated bonuses for the current player based on owned neighborhoods
    myBonuses: (state) => {
      if (!state.myUserId) return {
        jailTimeReduction: 0, bustBonus: 0, smugglingRiskReduction: 0,
        craftingCostReduction: 0, craftingTimeReduction: 0, incomePerHour: 0,
        dropRateBonus: 0, weaponDiscountPercent: 0, crimeSuccessBonus: 0,
        policeDetectionReduction: 0, sellPriceBonus: 0, highTierCrimeBonus: 0,
        crimeXpBonus: 0, gymGainBonus: 0, hospitalTimeReduction: 0,
      }
      const bonuses = {
        jailTimeReduction: 0,
        bustBonus: 0,
        smugglingRiskReduction: 0,
        craftingCostReduction: 0,
        craftingTimeReduction: 0,
        incomePerHour: 0,
        dropRateBonus: 0,
        weaponDiscountPercent: 0,
        crimeSuccessBonus: 0,
        policeDetectionReduction: 0,
        sellPriceBonus: 0,
        highTierCrimeBonus: 0,
        crimeXpBonus: 0,
        gymGainBonus: 0,
        hospitalTimeReduction: 0,
      }
      for (const [id, n] of Object.entries(state.neighborhoods)) {
        if (n.ownerId !== state.myUserId) continue
        const def = getNeighborhoodById(id)
        if (!def) continue
        for (const key of Object.keys(bonuses)) {
          if (def.bonus[key]) bonuses[key] += def.bonus[key]
        }
      }
      // Hard caps to prevent stacking abuse
      bonuses.crimeSuccessBonus = Math.min(bonuses.crimeSuccessBonus, 0.35)
      return bonuses
    },

  },

  actions: {
    async _resolveMyUserId() {
      const { data } = await supabase.auth.getUser()
      return data.user?.id || null
    },

    // ── Fetch & Realtime ─────────────────────────────────────────────────────

    async fetchNeighborhoods() {
      try {
        const { data, error } = await supabase
          .from('neighborhood_control')
          .select('*')

        if (error) throw error

        const myId = await this._resolveMyUserId()
        this.myUserId = myId

        for (const row of data) {
          if (!NEIGHBORHOOD_IDS.includes(row.neighborhood_id)) continue
          this.neighborhoods[row.neighborhood_id] = {
            ownerId: row.owner_id || null,
            ownerUsername: row.owner_username || '',
            ownerLevel: row.owner_level || 1,
            wallHp: row.wall_hp,
            capturedAt: row.captured_at || 0,
            lastAttackedAt: row.last_attacked_at || 0,
            lastAttackerUsername: row.last_attacker_username || '',
            lastMaintenancePaidAt: row.last_maintenance_paid_at || 0,
            graffiti: row.graffiti || '',
          }
        }

        this.lastFetched = Date.now()

        if (myId) {
          await this._checkInactivityExpiry(myId)
          await this._checkRetaliationGrant(myId)
          this._checkMaintenance(myId)
        }
      } catch (e) {
        console.error('Neighborhood fetch failed:', e)
      }
    },

    subscribeRealtime() {
      if (this._channel) {
        supabase.removeChannel(this._channel)
        this._channel = null
      }

      this._channel = supabase
        .channel('neighborhood_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'neighborhood_control' },
          async (payload) => {
            const row = payload.new || payload.old
            if (!row || !NEIGHBORHOOD_IDS.includes(row.neighborhood_id)) return

            const myId = await this._resolveMyUserId()
            const prev = this.neighborhoods[row.neighborhood_id]

            this.neighborhoods[row.neighborhood_id] = {
              ownerId: row.owner_id || null,
              ownerUsername: row.owner_username || '',
              ownerLevel: row.owner_level || 1,
              wallHp: row.wall_hp,
              capturedAt: row.captured_at || 0,
              lastAttackedAt: row.last_attacked_at || 0,
              lastAttackerUsername: row.last_attacker_username || '',
              lastMaintenancePaidAt: row.last_maintenance_paid_at || 0,
              graffiti: row.graffiti || '',
            }

            const gameStore = useGameStore()
            const def = getNeighborhoodById(row.neighborhood_id)

            // Notify: someone captured our neighborhood
            if (prev?.ownerId === myId && row.owner_id !== myId) {
              gameStore.addNotification(
                `⚔️ Έχασες τη γειτονιά ${def?.name ?? row.neighborhood_id}!`, 'danger'
              )
            }
            // Notify: we just captured
            if (row.owner_id === myId && prev?.ownerId !== myId) {
              gameStore.addNotification(
                `🏴 Κατέλαβες ${def?.name ?? row.neighborhood_id}!`, 'success'
              )
            }
            // Notify: our wall was attacked
            if (prev?.ownerId === myId && row.last_attacked_at > (prev?.lastAttackedAt ?? 0)) {
              gameStore.addNotification(
                `🧱 Ο Τοίχος της ${def?.name} δέχτηκε επίθεση! (${row.wall_hp} HP)`, 'warning'
              )
            }
          }
        )
        .subscribe()
    },

    unsubscribeRealtime() {
      if (this._channel) {
        supabase.removeChannel(this._channel)
        this._channel = null
      }
    },

    // ── Core Actions ─────────────────────────────────────────────────────────

    async claimEmpty(nid) {
      const check = this.canClaim(nid)
      if (!check.can) {
        const msgs = {
          owned: 'Η γειτονιά έχει ιδιοκτήτη.',
          cap: `Μπορείς να κατέχεις έως ${MAX_OWNED} γειτονιές.`,
        }
        useGameStore().addNotification(msgs[check.reason] ?? 'Δεν μπορείς.', 'danger')
        return false
      }

      const player = usePlayerStore()
      const myId   = await this._resolveMyUserId()
      const def    = getNeighborhoodById(nid)
      const wallHp = Math.floor((def?.wallBaseHp ?? 1000) * CAPTURE_WALL_FRACTION)

      try {
        const { error } = await supabase
          .from('neighborhood_control')
          .update({
            owner_id: myId,
            owner_username: player.name,
            owner_level: player.level,
            wall_hp: wallHp,
            captured_at: Date.now(),
            last_maintenance_paid_at: Date.now(),
            updated_at: new Date().toISOString(),
          })
          .eq('neighborhood_id', nid)
          .is('owner_id', null)

        if (error) throw error

        this.neighborhoods[nid] = {
          ...this.neighborhoods[nid],
          ownerId: myId,
          ownerUsername: player.name,
          ownerLevel: player.level,
          wallHp,
          capturedAt: Date.now(),
          lastMaintenancePaidAt: Date.now(),
        }

        player.logActivity(`🏴 Κατέλαβες τη γειτονιά ${def?.name}`, 'success')
        useGameStore().addNotification(`🏴 Κατέλαβες ${def?.name}!`, 'success')
        useGameStore().saveGame()
        return true
      } catch (e) {
        console.error('claimEmpty failed:', e)
        useGameStore().addNotification('Σφάλμα κατά την κατάληψη.', 'danger')
        return false
      }
    },

    async attackNeighborhood(nid) {
      const check = this.canAttack(nid)
      if (!check.can) {
        const msgs = {
          empty: 'Η γειτονιά είναι ελεύθερη — κατάλαβέ την!',
          own: 'Δεν μπορείς να επιτεθείς στη δική σου γειτονιά.',
          no_nerve: `Χρειάζεσαι ${ATTACK_NERVE_COST} Θράσος.`,
          cooldown: 'Cooldown — περίμενε λίγο πριν ξαναχτυπήσεις.',
        }
        useGameStore().addNotification(msgs[check.reason] ?? 'Δεν μπορείς.', 'danger')
        return false
      }

      const player  = usePlayerStore()
      const myId    = await this._resolveMyUserId()
      const n       = this.neighborhoods[nid]
      const def     = getNeighborhoodById(nid)
      const owned   = Object.values(this.neighborhoods).filter(x => x.ownerId === myId).length

      // Filotimo + Disreputable penalty for attacking much weaker players
      const { filotimoPenalty, disreputable } = calculateFilotimoAttackPenalty(
        player.level, n.ownerLevel
      )
      if (filotimoPenalty > 0) {
        player.addFilotimoRaw(-filotimoPenalty)
        player.logActivity(
          `📉 Φιλότιμο -${filotimoPenalty} — Άδικη επίθεση σε αδύναμο παίκτη`, 'warning'
        )
      }
      if (disreputable) {
        this.disreputableUntil = Date.now() + DISREPUTABLE_MS
        useGameStore().addNotification('Είσαι Διαβόητος για 2 ώρες (-5% επιτυχία εγκλήματος)!', 'warning')
      }

      // Check coalition bonus
      let damageMultiplier = 1
      try {
        const since24h = Date.now() - 24 * 60 * 60 * 1000
        const { data: logRows } = await supabase
          .from('neighborhood_attack_log')
          .select('attacker_id')
          .eq('neighborhood_id', nid)
          .gte('attacked_at', since24h)
          .neq('attacker_id', myId)
        const uniqueOthers = new Set((logRows ?? []).map(r => r.attacker_id)).size
        if (uniqueOthers >= COALITION_THRESHOLD - 1) {
          damageMultiplier = 1 + COALITION_BONUS
        }
      } catch (_) { /* non-critical, skip */ }

      // Retaliation: if retaliating against specific player, boost damage
      if (this.retaliationActive && this.retaliationBonus?.targetId === n.ownerId) {
        damageMultiplier += RETALIATION_BONUS
      }

      // Calculate damage
      const rawDamage = calculateWallDamage(player.stats)
      const damage    = Math.floor(rawDamage * damageMultiplier)
      const newWallHp = Math.max(0, n.wallHp - damage)
      const captured  = newWallHp <= 0

      // Deduct nerve immediately
      player.modifyResource('nerve', -ATTACK_NERVE_COST)
      // Set cooldown
      this.attackCooldowns[nid] = Date.now() + ATTACK_COOLDOWN_MS

      const now = Date.now()

      try {
        if (captured) {
          const maxHp = this.effectiveWallMaxHp(nid)
          const startHp = Math.floor((def?.wallBaseHp ?? 1000) * CAPTURE_WALL_FRACTION)

          // Cap owned count before capture
          if (owned >= MAX_OWNED) {
            useGameStore().addNotification(`Έφτασες το όριο ${MAX_OWNED} γειτονιών!`, 'danger')
            player.modifyResource('nerve', ATTACK_NERVE_COST) // refund
            return false
          }

          const { error } = await supabase
            .from('neighborhood_control')
            .update({
              owner_id: myId,
              owner_username: player.name,
              owner_level: player.level,
              wall_hp: startHp,
              captured_at: now,
              last_attacked_at: now,
              last_attacker_username: player.name,
              last_maintenance_paid_at: now,
              updated_at: new Date().toISOString(),
            })
            .eq('neighborhood_id', nid)

          if (error) throw error

          this.neighborhoods[nid] = {
            ...this.neighborhoods[nid],
            ownerId: myId,
            ownerUsername: player.name,
            ownerLevel: player.level,
            wallHp: startHp,
            capturedAt: now,
            lastAttackedAt: now,
            lastAttackerUsername: player.name,
            lastMaintenancePaidAt: now,
          }

          player.logActivity(`🏴 Κατέλαβες ${def?.name} μετά από ${damage} damage!`, 'success')
          useGameStore().addNotification(`🏴 Κατέλαβες ${def?.name}!`, 'success')
        } else {
          const { error } = await supabase
            .from('neighborhood_control')
            .update({
              wall_hp: newWallHp,
              last_attacked_at: now,
              last_attacker_username: player.name,
              updated_at: new Date().toISOString(),
            })
            .eq('neighborhood_id', nid)

          if (error) throw error

          this.neighborhoods[nid] = {
            ...this.neighborhoods[nid],
            wallHp: newWallHp,
            lastAttackedAt: now,
            lastAttackerUsername: player.name,
          }

          const coalitionNote = damageMultiplier > 1 ? ' (Coalition Bonus!)' : ''
          player.logActivity(
            `⚔️ Χτύπησες ${def?.name}: -${damage} Τοίχος${coalitionNote} (${newWallHp} HP)`, 'warning'
          )
          useGameStore().addNotification(`⚔️ -${damage} HP στον Τοίχο της ${def?.name}!`, 'info')
        }

        // Log the attack
        await supabase.from('neighborhood_attack_log').insert({
          neighborhood_id: nid,
          attacker_id: myId,
          attacker_username: player.name,
          defender_id: n.ownerId,
          damage_dealt: damage,
          wall_hp_after: newWallHp,
          captured,
          attacked_at: now,
        })

        // Clear retaliation if this was the target
        if (this.retaliationBonus?.targetId === n.ownerId) {
          this.retaliationBonus = null
        }

        useGameStore().saveGame()
        return true
      } catch (e) {
        console.error('attackNeighborhood failed:', e)
        useGameStore().addNotification('Σφάλμα κατά την επίθεση.', 'danger')
        return false
      }
    },

    async repairWall(nid, cashAmount) {
      const myId = await this._resolveMyUserId()
      const n    = this.neighborhoods[nid]
      if (!n || n.ownerId !== myId) {
        useGameStore().addNotification('Δεν είναι δική σου γειτονιά.', 'danger')
        return false
      }

      const player     = usePlayerStore()
      const cost       = Math.max(REPAIR_CASH_PER_HP, Math.floor(cashAmount))
      const repairHp   = Math.floor(cost / REPAIR_CASH_PER_HP)
      const maxHp      = this.effectiveWallMaxHp(nid)

      if (player.cash < cost) {
        useGameStore().addNotification('Δεν έχεις αρκετά χρήματα.', 'danger')
        return false
      }
      if (n.wallHp >= maxHp) {
        useGameStore().addNotification('Ο Τοίχος είναι ήδη στο μέγιστο.', 'info')
        return false
      }

      const newHp = Math.min(maxHp, n.wallHp + repairHp)
      player.removeCash(cost)

      try {
        const { error } = await supabase
          .from('neighborhood_control')
          .update({ wall_hp: newHp, updated_at: new Date().toISOString() })
          .eq('neighborhood_id', nid)

        if (error) throw error

        this.neighborhoods[nid].wallHp = newHp
        const def = getNeighborhoodById(nid)
        player.logActivity(
          `🧱 Επισκευή Τοίχου ${def?.name}: +${repairHp} HP (κόστος ${cost}€)`, 'info'
        )
        useGameStore().saveGame()
        return true
      } catch (e) {
        player.addCash(cost) // refund on error
        console.error('repairWall failed:', e)
        useGameStore().addNotification('Σφάλμα κατά την επισκευή.', 'danger')
        return false
      }
    },

    // ΚΕΠ Αδειοδότηση: Greek bureaucracy mini-game — 3 Nerve + 200 cash → +50 Wall HP
    async kepAdeiodotisi(nid) {
      const myId = await this._resolveMyUserId()
      const n    = this.neighborhoods[nid]
      if (!n || n.ownerId !== myId) {
        useGameStore().addNotification('Δεν είναι δική σου γειτονιά.', 'danger')
        return false
      }

      const cd = this.kepCooldowns[nid]
      if (cd && cd > Date.now()) {
        useGameStore().addNotification('Το ΚΕΠ είναι κλειστό... αύριο ίσως.', 'info')
        return false
      }

      const player = usePlayerStore()
      if (player.resources.nerve.current < KEP_NERVE_COST) {
        useGameStore().addNotification(`Χρειάζεσαι ${KEP_NERVE_COST} Θράσος για το ΚΕΠ.`, 'danger')
        return false
      }
      if (player.cash < KEP_CASH_COST) {
        useGameStore().addNotification(`Χρειάζεσαι ${KEP_CASH_COST}€ για τα παράβολα.`, 'danger')
        return false
      }

      const maxHp = this.effectiveWallMaxHp(nid)
      const newHp = Math.min(maxHp, n.wallHp + KEP_WALL_REPAIR)

      player.modifyResource('nerve', -KEP_NERVE_COST)
      player.removeCash(KEP_CASH_COST)
      this.kepCooldowns[nid] = Date.now() + KEP_COOLDOWN_MS

      try {
        const { error } = await supabase
          .from('neighborhood_control')
          .update({ wall_hp: newHp, updated_at: new Date().toISOString() })
          .eq('neighborhood_id', nid)

        if (error) throw error

        this.neighborhoods[nid].wallHp = newHp
        const def = getNeighborhoodById(nid)
        player.logActivity(
          `📋 ΚΕΠ Αδειοδότηση ${def?.name}: +${KEP_WALL_REPAIR} HP Τοίχου — Τελικά η γραφειοκρατία βοήθησε!`,
          'success'
        )
        useGameStore().addNotification(`📋 ΚΕΠ: +${KEP_WALL_REPAIR} Τοίχος!`, 'success')
        useGameStore().saveGame()
        return true
      } catch (e) {
        player.modifyResource('nerve', KEP_NERVE_COST)
        player.addCash(KEP_CASH_COST)
        console.error('kepAdeiodotisi failed:', e)
        return false
      }
    },

    async setGraffiti(nid, text) {
      const myId = await this._resolveMyUserId()
      const n    = this.neighborhoods[nid]
      if (!n || n.ownerId !== myId) return false

      const sanitized = String(text).slice(0, 50)
      try {
        const { error } = await supabase
          .from('neighborhood_control')
          .update({ graffiti: sanitized, updated_at: new Date().toISOString() })
          .eq('neighborhood_id', nid)

        if (error) throw error
        this.neighborhoods[nid].graffiti = sanitized
        useGameStore().saveGame()
        return true
      } catch (e) {
        console.error('setGraffiti failed:', e)
        return false
      }
    },

    // ── Passive Income Tick ───────────────────────────────────────────────────

    tickIncome(deltaMs) {
      const incomePerHour = this.myBonuses.incomePerHour
      if (incomePerHour <= 0) return

      this.incomeAccumulator += deltaMs
      const msPerHour = 3600000
      if (this.incomeAccumulator >= msPerHour) {
        const hours = Math.floor(this.incomeAccumulator / msPerHour)
        this.incomeAccumulator -= hours * msPerHour
        const earned = hours * incomePerHour
        const player = usePlayerStore()
        player.addCash(earned)
        player.logActivity(`💵 Παθητικό εισόδημα Γειτονιάς: +${earned}€`, 'success')
      }
    },

    // ── Internal Helpers ──────────────────────────────────────────────────────

    _checkMaintenance(myId) {
      const now = Date.now()
      const since = this.lastMaintenanceCheck
      if (since && now - since < 24 * 60 * 60 * 1000) return // already checked today

      const cost = this.dailyMaintenanceCost
      if (cost <= 0) {
        this.lastMaintenanceCheck = now
        return
      }

      const player = usePlayerStore()
      if (player.cash >= cost) {
        player.removeCash(cost)
        player.logActivity(`🏘️ Συντήρηση Γειτονιών: -${cost}€`, 'info')
        // Update maintenance timestamps in DB for owned neighborhoods
        const ownedIds = Object.entries(this.neighborhoods)
          .filter(([, n]) => n.ownerId === myId)
          .map(([id]) => id)
        for (const nid of ownedIds) {
          this.neighborhoods[nid].lastMaintenancePaidAt = now
        }
        supabase
          .from('neighborhood_control')
          .update({ last_maintenance_paid_at: now, updated_at: new Date().toISOString() })
          .in('neighborhood_id', ownedIds)
          .then(() => {})
      } else {
        useGameStore().addNotification(
          `⚠️ Δεν πλήρωσες Χαράτσι Γειτονιάς (${cost}€)! Ο Τοίχος αποδυναμώνεται.`, 'danger'
        )
      }
      this.lastMaintenanceCheck = now
    },

    async _checkInactivityExpiry(myId) {
      const now = Date.now()
      const expiredIds = []
      for (const [id, n] of Object.entries(this.neighborhoods)) {
        if (!n.ownerId) continue
        if (n.ownerId === myId) continue // don't expire our own
        const lastPaid = n.lastMaintenancePaidAt
        if (lastPaid && now - lastPaid > INACTIVITY_MS) {
          expiredIds.push(id)
        }
      }
      if (expiredIds.length === 0) return

      const def = getNeighborhoodById(expiredIds[0])
      try {
        await supabase
          .from('neighborhood_control')
          .update({
            owner_id: null,
            owner_username: '',
            wall_hp: 1000,
            captured_at: 0,
            last_maintenance_paid_at: 0,
            graffiti: '',
            updated_at: new Date().toISOString(),
          })
          .in('neighborhood_id', expiredIds)

        for (const id of expiredIds) {
          this.neighborhoods[id] = {
            ...this.neighborhoods[id],
            ownerId: null,
            ownerUsername: '',
            wallHp: getNeighborhoodById(id)?.wallBaseHp ?? 1000,
            capturedAt: 0,
            lastMaintenancePaidAt: 0,
            graffiti: '',
          }
        }
      } catch (e) {
        console.error('Inactivity expiry failed:', e)
      }
    },

    async _checkRetaliationGrant(myId) {
      if (!this.lastFetched) return
      const myNids = Object.entries(this.neighborhoods)
        .filter(([, n]) => n.ownerId === myId)
        .map(([id]) => id)
      if (myNids.length === 0) return

      try {
        const { data } = await supabase
          .from('neighborhood_attack_log')
          .select('attacker_id, attacker_username, attacked_at, neighborhood_id')
          .in('neighborhood_id', myNids)
          .gte('attacked_at', this.lastFetched)
          .neq('attacker_id', myId)
          .order('attacked_at', { ascending: false })
          .limit(1)

        if (data && data.length > 0) {
          const latest = data[0]
          this.retaliationBonus = {
            targetId: latest.attacker_id,
            targetUsername: latest.attacker_username,
            endsAt: Date.now() + RETALIATION_MS,
          }
          const def = getNeighborhoodById(latest.neighborhood_id)
          useGameStore().addNotification(
            `🔥 Αντίποινα! +25% επίθεση κατά ${latest.attacker_username} για 48ώρες`, 'warning'
          )
          usePlayerStore().logActivity(
            `🔥 Αντίποινα κατά ${latest.attacker_username} ενεργό (${def?.name})`, 'warning'
          )
        }
      } catch (e) {
        console.error('Retaliation check failed:', e)
      }
    },

    // ── Serialization ─────────────────────────────────────────────────────────

    getSerializable() {
      return {
        attackCooldowns: { ...this.attackCooldowns },
        kepCooldowns: { ...this.kepCooldowns },
        lastMaintenanceCheck: this.lastMaintenanceCheck,
        retaliationBonus: this.retaliationBonus ? { ...this.retaliationBonus } : null,
        disreputableUntil: this.disreputableUntil,
        incomeAccumulator: this.incomeAccumulator,
        lastFetched: this.lastFetched,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.attackCooldowns) Object.assign(this.attackCooldowns, data.attackCooldowns)
      if (data.kepCooldowns) Object.assign(this.kepCooldowns, data.kepCooldowns)
      if (data.lastMaintenanceCheck !== undefined) this.lastMaintenanceCheck = data.lastMaintenanceCheck
      if (data.retaliationBonus !== undefined) this.retaliationBonus = data.retaliationBonus
      if (data.disreputableUntil !== undefined) this.disreputableUntil = data.disreputableUntil
      if (data.incomeAccumulator !== undefined) this.incomeAccumulator = data.incomeAccumulator
      if (data.lastFetched !== undefined) this.lastFetched = data.lastFetched
    },
  },
})
