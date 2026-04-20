import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useFactionStore } from './factionStore'
import { useEventsHubStore } from './eventsHubStore'
import { neighborhoods, getNeighborhoodById } from '../data/neighborhoods'
import { calculateInfluenceDamage, calculateFilotimoAttackPenalty } from '../engine/formulas'

// ── Concept ──────────────────────────────────────────────────────────────────
// "Επιρροή" (Influence) = how strongly the owner controls the neighborhood.
// Attacks erode it (intimidation, street fights). When it hits 0 the owner
// loses control. The owner can boost it by spending money on bribes,
// advertising, hiring guards, or running a ΚΕΠ permit run.
//
// Note: the DB still stores this as `wall_hp` (legacy column name) — we map
// it to `influence` everywhere in the app.

// ── Constants ────────────────────────────────────────────────────────────────
const NEIGHBORHOOD_IDS     = neighborhoods.map(n => n.id)
const MAX_OWNED            = 3
const ATTACK_NERVE_COST    = 8
const ATTACK_COOLDOWN_MS   = 2 * 60 * 60 * 1000    // 2 hours per neighborhood

// Influence-boost actions (replace the old free-form repair input)
const BRIBE_COST           = 500
const BRIBE_BOOST          = 100
const ADVERT_COST          = 2500
const ADVERT_BOOST          = 600
const ADVERT_COOLDOWN_MS   = 60 * 60 * 1000        // 1 hour
const GUARDS_COST          = 10000
const GUARDS_BOOST         = 2500
const GUARDS_COOLDOWN_MS   = 4 * 60 * 60 * 1000    // 4 hours

const KEP_NERVE_COST       = 3
const KEP_CASH_COST        = 200
const KEP_INFLUENCE_BOOST  = 500                    // was 50 wall HP
const KEP_COOLDOWN_MS      = 6 * 60 * 60 * 1000    // 6 hours

const INACTIVITY_MS        = 7 * 24 * 60 * 60 * 1000 // 7 days → neutral
const COALITION_THRESHOLD  = 3                      // unique attackers in 24h for bonus
const COALITION_BONUS      = 0.15                   // +15% influence damage
const RETALIATION_BONUS    = 0.25                   // +25% damage if retaliation active
const RETALIATION_MS       = 48 * 60 * 60 * 1000   // 48 hours
const DISREPUTABLE_MS      = 2 * 60 * 60 * 1000    // 2 hours
const SPREAD_PENALTY       = 0.05                   // -5% influence max per extra territory
const FACTION_INFLUENCE_BONUS = 0.10                // +10% influence max if owner in a faction
// Exponential maintenance cost per territory slot
const MAINTENANCE_COSTS    = [500, 1000, 2500]
const CAPTURE_INFLUENCE_FRACTION = 0.30             // new capture starts at 30% influence

// Public read-only constants for the view
export const NEIGHBORHOOD_BOOSTS = {
  bribe:   { cost: BRIBE_COST,   boost: BRIBE_BOOST,   nerve: 0,                cooldownMs: 0,                  icon: '🤝', label: 'Δωροδοκίες (Φακελάκι)',   desc: 'Φακελάκια σε μπάτσους και ντόπιους — γρήγορη μικρή ενίσχυση.' },
  advert:  { cost: ADVERT_COST,  boost: ADVERT_BOOST,  nerve: 0,                cooldownMs: ADVERT_COOLDOWN_MS, icon: '📢', label: 'Διαφήμιση Παρουσίας',     desc: 'Γκράφιτι, αφίσες και αντιπρόσωποι σε κάθε γωνία.' },
  guards:  { cost: GUARDS_COST,  boost: GUARDS_BOOST,  nerve: 0,                cooldownMs: GUARDS_COOLDOWN_MS, icon: '🛡️', label: 'Πρόσληψη Φρουρών',         desc: 'Μάζεψε μπράβους — επιβολή στη γειτονιά.' },
  kep:     { cost: KEP_CASH_COST, boost: KEP_INFLUENCE_BOOST, nerve: KEP_NERVE_COST, cooldownMs: KEP_COOLDOWN_MS, icon: '📋', label: 'ΚΕΠ Αδειοδότηση',         desc: 'Πάμε ΚΕΠ για άδεια λειτουργίας — η γραφειοκρατία βοηθάει.' },
}
export const ATTACK_NERVE_COST_PUBLIC = ATTACK_NERVE_COST
export const NEIGHBORHOOD_MAX_OWNED   = MAX_OWNED

function makeEmptyNeighborhoods() {
  return Object.fromEntries(
    NEIGHBORHOOD_IDS.map(id => [id, {
      ownerId: null,
      ownerUsername: '',
      ownerLevel: 1,
      influence: getNeighborhoodById(id)?.influenceBaseMax ?? 1000,
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
    boostCooldowns: {},     // { nid: { advert, guards, kep } }
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

    effectiveInfluenceMax: (state) => (nid) => {
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
      const factionBonus = isMyTerritory && useFactionStore().currentFaction ? FACTION_INFLUENCE_BONUS : 0
      return Math.floor(def.influenceBaseMax * (1 - penalty) * (1 + factionBonus))
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

    boostCooldownRemaining: (state) => (nid, boostKey) => {
      const cd = state.boostCooldowns[nid]?.[boostKey]
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
            influence: row.wall_hp,
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
              influence: row.wall_hp,
              capturedAt: row.captured_at || 0,
              lastAttackedAt: row.last_attacked_at || 0,
              lastAttackerUsername: row.last_attacker_username || '',
              lastMaintenancePaidAt: row.last_maintenance_paid_at || 0,
              graffiti: row.graffiti || '',
            }

            const gameStore = useGameStore()
            const def = getNeighborhoodById(row.neighborhood_id)

            // Notify: someone took our neighborhood
            if (prev?.ownerId === myId && row.owner_id !== myId) {
              gameStore.addNotification(
                `⚔️ Έχασες τον έλεγχο της ${def?.name ?? row.neighborhood_id}!`, 'danger'
              )
            }
            // Notify: we just captured
            if (row.owner_id === myId && prev?.ownerId !== myId) {
              gameStore.addNotification(
                `🏴 Ανέλαβες τη γειτονιά ${def?.name ?? row.neighborhood_id}!`, 'success'
              )
            }
            // Notify: our influence took a hit
            if (prev?.ownerId === myId && row.last_attacked_at > (prev?.lastAttackedAt ?? 0)) {
              gameStore.addNotification(
                `💢 Η Επιρροή σου στην ${def?.name} δέχεται πίεση! (${row.wall_hp} Επιρροή)`, 'warning'
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
          owned: 'Η γειτονιά έχει ήδη ιδιοκτήτη.',
          cap: `Μπορείς να ελέγχεις έως ${MAX_OWNED} γειτονιές.`,
        }
        useGameStore().addNotification(msgs[check.reason] ?? 'Δεν μπορείς.', 'danger')
        return false
      }

      const player    = usePlayerStore()
      const myId      = await this._resolveMyUserId()
      const def       = getNeighborhoodById(nid)
      const influence = Math.floor((def?.influenceBaseMax ?? 1000) * CAPTURE_INFLUENCE_FRACTION)

      try {
        const { error } = await supabase
          .from('neighborhood_control')
          .update({
            owner_id: myId,
            owner_username: player.name,
            owner_level: player.level,
            wall_hp: influence,
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
          influence,
          capturedAt: Date.now(),
          lastMaintenancePaidAt: Date.now(),
        }

        player.logActivity(`🏴 Ανέλαβες την αδέσμευτη γειτονιά ${def?.name}`, 'success')
        useGameStore().addNotification(
          `🏴 Ανέλαβες ${def?.name}! Ξεκινάς με ${influence} Επιρροή.`,
          'success'
        )
        useGameStore().saveGame()
        return true
      } catch (e) {
        console.error('claimEmpty failed:', e)
        useGameStore().addNotification('Σφάλμα κατά την ανάληψη.', 'danger')
        return false
      }
    },

    async attackNeighborhood(nid) {
      const check = this.canAttack(nid)
      if (!check.can) {
        const msgs = {
          empty: 'Η γειτονιά είναι ελεύθερη — ανάλαβέ την!',
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

      // Calculate influence damage
      const rawDamage    = calculateInfluenceDamage(player.stats)
      const damage       = Math.floor(rawDamage * damageMultiplier)
      const newInfluence = Math.max(0, n.influence - damage)
      const captured     = newInfluence <= 0

      // Deduct nerve immediately
      player.modifyResource('nerve', -ATTACK_NERVE_COST)
      // Set cooldown
      this.attackCooldowns[nid] = Date.now() + ATTACK_COOLDOWN_MS

      const now = Date.now()

      try {
        if (captured) {
          const startInfluence = Math.floor((def?.influenceBaseMax ?? 1000) * CAPTURE_INFLUENCE_FRACTION)

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
              wall_hp: startInfluence,
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
            influence: startInfluence,
            capturedAt: now,
            lastAttackedAt: now,
            lastAttackerUsername: player.name,
            lastMaintenancePaidAt: now,
          }

          player.logActivity(`🏴 Πήρες τον έλεγχο της ${def?.name} με ${damage} ζημιά Επιρροής!`, 'success')
          useGameStore().addNotification(`🏴 Πήρες τον έλεγχο της ${def?.name}!`, 'success')
        } else {
          const { error } = await supabase
            .from('neighborhood_control')
            .update({
              wall_hp: newInfluence,
              last_attacked_at: now,
              last_attacker_username: player.name,
              updated_at: new Date().toISOString(),
            })
            .eq('neighborhood_id', nid)

          if (error) throw error

          this.neighborhoods[nid] = {
            ...this.neighborhoods[nid],
            influence: newInfluence,
            lastAttackedAt: now,
            lastAttackerUsername: player.name,
          }

          const coalitionNote = damageMultiplier > 1 ? ' (Πολιορκία!)' : ''
          player.logActivity(
            `⚔️ Χτύπησες ${def?.name}: -${damage} Επιρροή${coalitionNote} (${newInfluence}/${this.effectiveInfluenceMax(nid)})`, 'warning'
          )
          useGameStore().addNotification(`⚔️ -${damage} Επιρροή στην ${def?.name}!`, 'info')
        }

        // Log the attack
        await supabase.from('neighborhood_attack_log').insert({
          neighborhood_id: nid,
          attacker_id: myId,
          attacker_username: player.name,
          defender_id: n.ownerId,
          damage_dealt: damage,
          wall_hp_after: newInfluence,
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

    /**
     * Boost influence in an owned neighborhood using one of the preset actions:
     *   'bribe'  → cheap instant boost
     *   'advert' → mid-tier boost (1h cooldown)
     *   'guards' → heavy boost (4h cooldown)
     *   'kep'    → uses Nerve, 6h cooldown
     */
    async boostInfluence(nid, boostKey) {
      const cfg = NEIGHBORHOOD_BOOSTS[boostKey]
      if (!cfg) return false

      const myId = await this._resolveMyUserId()
      const n    = this.neighborhoods[nid]
      if (!n || n.ownerId !== myId) {
        useGameStore().addNotification('Δεν είναι δική σου γειτονιά.', 'danger')
        return false
      }

      // Cooldown check
      const cdRemaining = this.boostCooldownRemaining(nid, boostKey)
      if (cdRemaining > 0) {
        useGameStore().addNotification(`${cfg.icon} ${cfg.label}: σε αναμονή.`, 'info')
        return false
      }

      const player = usePlayerStore()
      if (cfg.nerve > 0 && player.resources.nerve.current < cfg.nerve) {
        useGameStore().addNotification(`Χρειάζεσαι ${cfg.nerve} Θράσος.`, 'danger')
        return false
      }
      if (player.cash < cfg.cost) {
        useGameStore().addNotification(`Χρειάζεσαι ${cfg.cost}€.`, 'danger')
        return false
      }

      const maxInfluence = this.effectiveInfluenceMax(nid)
      if (n.influence >= maxInfluence) {
        useGameStore().addNotification('Η Επιρροή σου είναι ήδη στο μέγιστο.', 'info')
        return false
      }

      const newInfluence = Math.min(maxInfluence, n.influence + cfg.boost)
      const actualGain   = newInfluence - n.influence

      // Charge resources
      player.removeCash(cfg.cost)
      if (cfg.nerve > 0) player.modifyResource('nerve', -cfg.nerve)

      // Set cooldown
      if (cfg.cooldownMs > 0) {
        if (!this.boostCooldowns[nid]) this.boostCooldowns[nid] = {}
        this.boostCooldowns[nid][boostKey] = Date.now() + cfg.cooldownMs
      }

      try {
        const { error } = await supabase
          .from('neighborhood_control')
          .update({ wall_hp: newInfluence, updated_at: new Date().toISOString() })
          .eq('neighborhood_id', nid)

        if (error) throw error

        this.neighborhoods[nid].influence = newInfluence
        const def = getNeighborhoodById(nid)
        player.logActivity(
          `${cfg.icon} ${cfg.label} ${def?.name}: +${actualGain} Επιρροή (-${cfg.cost}€${cfg.nerve > 0 ? `, -${cfg.nerve} Θράσος` : ''})`,
          'success'
        )
        useGameStore().addNotification(`${cfg.icon} +${actualGain} Επιρροή στην ${def?.name}!`, 'success')
        useGameStore().saveGame()
        return true
      } catch (e) {
        // Refund on error
        player.addCash(cfg.cost)
        if (cfg.nerve > 0) player.modifyResource('nerve', cfg.nerve)
        if (this.boostCooldowns[nid]) delete this.boostCooldowns[nid][boostKey]
        console.error('boostInfluence failed:', e)
        useGameStore().addNotification('Σφάλμα κατά την ενίσχυση.', 'danger')
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
      const msPer6Hours = 6 * 3600000
      if (this.incomeAccumulator >= msPer6Hours) {
        const ticks = Math.floor(this.incomeAccumulator / msPer6Hours)
        this.incomeAccumulator -= ticks * msPer6Hours
        const earned = ticks * incomePerHour
        const player = usePlayerStore()
        player.addCash(earned)
        player.logActivity(`💵 Παθητικό εισόδημα Γειτονιάς: +${earned}€`, 'success')
        useEventsHubStore().addEvent({
          icon: '💵',
          title: 'Παθητικό Εισόδημα',
          message: `Έλαβες +${earned}€ από τις γειτονιές σου.`,
          kind: 'good',
        })
        useGameStore().saveGame()
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
      const eventsHub = useEventsHubStore()
      if (player.cash >= cost) {
        player.removeCash(cost)
        player.logActivity(`🏘️ Συντήρηση Γειτονιών: -${cost}€`, 'info')
        eventsHub.addEvent({
          icon: '🏘️',
          title: 'Ημερήσιο Χαράτσι',
          message: `Πλήρωσες ${cost}€ συντήρηση για τις γειτονιές σου.`,
          kind: 'neutral',
        })
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
          `⚠️ Δεν πλήρωσες Χαράτσι Γειτονιάς (${cost}€)! Η Επιρροή σου εξασθενεί.`, 'danger'
        )
        eventsHub.addEvent({
          icon: '⚠️',
          title: 'Χαράτσι Απλήρωτο',
          message: `Δεν είχες αρκετά χρήματα για χαράτσι γειτονιάς (${cost}€)!`,
          kind: 'bad',
        })
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

      try {
        // Reset each expired neighborhood to its base influence (varies per def)
        for (const id of expiredIds) {
          const def = getNeighborhoodById(id)
          const baseInfluence = def?.influenceBaseMax ?? 1000
          await supabase
            .from('neighborhood_control')
            .update({
              owner_id: null,
              owner_username: '',
              wall_hp: baseInfluence,
              captured_at: 0,
              last_maintenance_paid_at: 0,
              graffiti: '',
              updated_at: new Date().toISOString(),
            })
            .eq('neighborhood_id', id)

          this.neighborhoods[id] = {
            ...this.neighborhoods[id],
            ownerId: null,
            ownerUsername: '',
            influence: baseInfluence,
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
        boostCooldowns: JSON.parse(JSON.stringify(this.boostCooldowns)),
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
      if (data.boostCooldowns) Object.assign(this.boostCooldowns, data.boostCooldowns)
      // Backwards-compat: old saves used kepCooldowns map directly
      if (data.kepCooldowns) {
        for (const [nid, ts] of Object.entries(data.kepCooldowns)) {
          if (!this.boostCooldowns[nid]) this.boostCooldowns[nid] = {}
          this.boostCooldowns[nid].kep = ts
        }
      }
      if (data.lastMaintenanceCheck !== undefined) this.lastMaintenanceCheck = data.lastMaintenanceCheck
      if (data.retaliationBonus !== undefined) this.retaliationBonus = data.retaliationBonus
      if (data.disreputableUntil !== undefined) this.disreputableUntil = data.disreputableUntil
      if (data.incomeAccumulator !== undefined) this.incomeAccumulator = data.incomeAccumulator
      if (data.lastFetched !== undefined) this.lastFetched = data.lastFetched
    },
  },
})
