import { defineStore } from 'pinia'
import {
  EXPEDITION_CONSTS,
  EXPEDITION_DISTRICTS,
  EXPEDITION_EVENTS,
  BASE_EVENT_WEIGHTS,
  DISTRICT_MODIFIERS,
  getDistrict,
  getNode,
  getNodeNeighbors,
  areNodesConnected,
  getEventById,
  getModifier,
} from '../data/expeditions'
import { usePlayerStore } from './playerStore'
import { useInventoryStore } from './inventoryStore'
import { useGameStore } from './gameStore'
import { useNeighborhoodStore } from './neighborhoodStore'

const MS_PER_HOUR = 60 * 60 * 1000

function todayKey() {
  const now = new Date()
  // Rollover at ~3am local — subtract rollover hour so 00:00-02:59 counts as prev day
  const rolled = new Date(now.getTime() - EXPEDITION_CONSTS.DAILY_ROLLOVER_HOUR_UTC * MS_PER_HOUR)
  return `${rolled.getUTCFullYear()}-${rolled.getUTCMonth()}-${rolled.getUTCDate()}`
}

function pickWeighted(pool) {
  const total = pool.reduce((s, e) => s + (e.weight || 0), 0)
  if (total <= 0) return pool[0] || null
  let r = Math.random() * total
  for (const e of pool) {
    r -= (e.weight || 0)
    if (r <= 0) return e
  }
  return pool[pool.length - 1]
}

function pickFromItemPool(pool) {
  if (!Array.isArray(pool) || pool.length === 0) return null
  const choice = pool[Math.floor(Math.random() * pool.length)]
  if (typeof choice === 'string') return { id: choice, qty: 1 }
  if (!choice?.id) return null
  return { id: choice.id, qty: choice.qty ?? 1 }
}

function getExpeditionBonusItemPool(eventId, outcome = {}) {
  if (eventId === 'stash_find' && outcome.cash >= 200) {
    return ['mat_fuel', 'mat_iron', 'mat_wood', 'mat_fabric', 'mat_chemicals']
  }
  if (eventId === 'locked_crate' && outcome.item?.id === 'mat_iron') {
    return ['mat_wood', 'mat_fuel']
  }
  if (eventId === 'locked_crate' && outcome.item?.id === 'jewelry') {
    return ['mat_electronics', 'mat_electronics', 'mat_battery', 'mat_iron']
  }
  if (eventId === 'smuggler_drop' && outcome.item?.id === 'cigarettes') {
    return ['mat_fuel', 'mat_fuel', 'mat_chemicals', 'mat_chemicals', 'mat_electronics']
  }
  if (eventId === 'hidden_door' && outcome.item?.id === 'jewelry') {
    return ['mat_kevlar', 'mat_electronics', 'mat_iron', 'mat_fuel']
  }
  return null
}

function newDistrictState() {
  return {
    heat: 0,
    lastHeatTickAt: Date.now(),
    lastRunAt: 0,
    runsToday: 0,
    modifierId: null,
    hotNodeIds: [],
    exploredNodeIds: [],   // lifetime nodes visited
    markedNodeIds: [],     // player-marked via discovery events
  }
}

export const useExpeditionStore = defineStore('expedition', {
  state: () => ({
    // Per-district persistent state
    districts: {},       // { [districtId]: { heat, lastRunAt, runsToday, modifierId, hotNodeIds, exploredNodeIds, markedNodeIds, lastHeatTickAt } }
    dailyKey: null,      // rollover tracking

    // Planning state (client-only)
    planningDistrictId: null,
    plannedRoute: [],    // array of node ids

    // Active run
    currentRun: null,    // { districtId, route, stepIndex, pendingEvent, log[], totalsSoFar{}, energyPaid }

    // Stats
    totalRuns: 0,
    totalNodesVisited: 0,
  }),

  getters: {
    maxRouteNodes(state) {
      const player = usePlayerStore()
      const bonus = Math.floor(player.level / EXPEDITION_CONSTS.LEVEL_NODE_BONUS_DIVISOR)
      return Math.min(
        EXPEDITION_CONSTS.HARD_MAX_NODES,
        EXPEDITION_CONSTS.BASE_MAX_NODES + bonus
      )
    },

    districtState() {
      return (id) => {
        const s = this.districts[id]
        return s ? s : newDistrictState()
      }
    },

    districtCooldownRemaining() {
      return (id) => {
        const s = this.districtState(id)
        const ready = (s.lastRunAt || 0) + EXPEDITION_CONSTS.DISTRICT_COOLDOWN_MS
        return Math.max(0, ready - Date.now())
      }
    },

    isDistrictAvailable() {
      return (id) => this.districtCooldownRemaining(id) === 0
    },

    effectiveHeat() {
      return (id) => {
        const s = this.districtState(id)
        const elapsedMs = Math.max(0, Date.now() - (s.lastHeatTickAt || Date.now()))
        const decayed = (s.heat || 0) - (elapsedMs / MS_PER_HOUR) * EXPEDITION_CONSTS.HEAT_DECAY_PER_HOUR
        return Math.max(0, Math.min(EXPEDITION_CONSTS.HEAT_MAX, Math.round(decayed)))
      }
    },

    heatTier() {
      return (id) => {
        const h = this.effectiveHeat(id)
        if (h >= EXPEDITION_CONSTS.HEAT_HOT_THRESHOLD) return 'hot'
        if (h >= EXPEDITION_CONSTS.HEAT_WARM_THRESHOLD) return 'warm'
        return 'cold'
      }
    },

    // Reward multiplier from diminishing returns (by run count in district today)
    diminishingMultiplier() {
      return (id) => {
        const s = this.districtState(id)
        const idx = Math.min(s.runsToday || 0, EXPEDITION_CONSTS.DIMINISHING.length - 1)
        return EXPEDITION_CONSTS.DIMINISHING[idx]
      }
    },

    ownsNeighborhood() {
      return (districtId) => {
        const d = getDistrict(districtId)
        if (!d?.neighborhoodId) return false
        const nh = useNeighborhoodStore()
        const myId = nh.myUserId
        if (!myId) return false
        const entry = nh.neighborhoods?.[d.neighborhoodId]
        return !!(entry && entry.ownerId === myId)
      }
    },

    extraEnergyFromModifier() {
      return (districtId) => {
        const s = this.districtState(districtId)
        const mod = getModifier(s.modifierId)
        return mod?.extraEnergyPerNode || 0
      }
    },

    energyCostForRoute() {
      return (districtId, routeLen) => {
        const extra = this.extraEnergyFromModifier(districtId)
        return (EXPEDITION_CONSTS.ENERGY_PER_NODE + extra) * routeLen
      }
    },

    plannedRouteEnergyCost(state) {
      if (!state.planningDistrictId) return 0
      return this.energyCostForRoute(state.planningDistrictId, state.plannedRoute.length)
    },

    // The current "active" map the UI should show (planning or running)
    activeDistrictId(state) {
      return state.currentRun ? state.currentRun.districtId : state.planningDistrictId
    },

    currentStepNode(state) {
      if (!state.currentRun) return null
      const id = state.currentRun.route[state.currentRun.stepIndex]
      return id ? getNode(state.currentRun.districtId, id) : null
    },
  },

  actions: {
    // ─── Daily rollover ────────────────────────────────────────────────
    ensureDailyRollover() {
      const key = todayKey()
      if (this.dailyKey !== key) {
        this.dailyKey = key
        // Roll every district: new modifier, new hot nodes, reset runsToday
        for (const d of EXPEDITION_DISTRICTS) {
          if (!this.districts[d.id]) this.districts[d.id] = newDistrictState()
          const s = this.districts[d.id]
          s.runsToday = 0
          s.modifierId = DISTRICT_MODIFIERS[Math.floor(Math.random() * DISTRICT_MODIFIERS.length)].id
          // Hot nodes: pick N random non-entry nodes
          const candidates = d.nodes.filter(n => n.id !== d.entryNodeId).map(n => n.id)
          const hot = []
          const pool = [...candidates]
          for (let i = 0; i < EXPEDITION_CONSTS.HOT_NODES_PER_DISTRICT && pool.length; i++) {
            const idx = Math.floor(Math.random() * pool.length)
            hot.push(pool.splice(idx, 1)[0])
          }
          s.hotNodeIds = hot
        }
      }
      // Ensure every district has state (first-run init)
      for (const d of EXPEDITION_DISTRICTS) {
        if (!this.districts[d.id]) {
          this.districts[d.id] = newDistrictState()
          this.districts[d.id].modifierId = DISTRICT_MODIFIERS[Math.floor(Math.random() * DISTRICT_MODIFIERS.length)].id
          const candidates = d.nodes.filter(n => n.id !== d.entryNodeId).map(n => n.id)
          const pool = [...candidates]
          const hot = []
          for (let i = 0; i < EXPEDITION_CONSTS.HOT_NODES_PER_DISTRICT && pool.length; i++) {
            const idx = Math.floor(Math.random() * pool.length)
            hot.push(pool.splice(idx, 1)[0])
          }
          this.districts[d.id].hotNodeIds = hot
        }
      }
    },

    // ─── Planning ──────────────────────────────────────────────────────
    startPlanning(districtId) {
      this.ensureDailyRollover()
      if (!getDistrict(districtId)) return false
      if (this.currentRun) return false
      if (!this.isDistrictAvailable(districtId)) return false
      this.planningDistrictId = districtId
      // Route always starts with the entry node
      const d = getDistrict(districtId)
      this.plannedRoute = [d.entryNodeId]
      return true
    },

    cancelPlanning() {
      this.planningDistrictId = null
      this.plannedRoute = []
    },

    canExtendRouteTo(nodeId) {
      if (!this.planningDistrictId) return false
      if (this.plannedRoute.length >= this.maxRouteNodes) return false
      if (this.plannedRoute.includes(nodeId)) return false
      const last = this.plannedRoute[this.plannedRoute.length - 1]
      return areNodesConnected(this.planningDistrictId, last, nodeId)
    },

    addRouteNode(nodeId) {
      if (!this.canExtendRouteTo(nodeId)) return false
      this.plannedRoute.push(nodeId)
      return true
    },

    removeLastRouteNode() {
      // Can't remove the entry node
      if (this.plannedRoute.length <= 1) return false
      this.plannedRoute.pop()
      return true
    },

    // ─── Run execution ─────────────────────────────────────────────────
    startRun() {
      if (!this.planningDistrictId || this.currentRun) return { ok: false, reason: 'no_plan' }
      if (this.plannedRoute.length < 2) return { ok: false, reason: 'route_too_short' }

      const player = usePlayerStore()
      if (!player.canAct) return { ok: false, reason: 'busy' }
      if (player.status !== 'free') return { ok: false, reason: 'incapacitated' }

      const districtId = this.planningDistrictId
      if (!this.isDistrictAvailable(districtId)) return { ok: false, reason: 'cooldown' }

      // Energy cost is charged for all planned nodes except the entry (which is free)
      const nodesToTraverse = this.plannedRoute.length - 1
      const cost = this.energyCostForRoute(districtId, nodesToTraverse)
      if (player.resources.energy.current < cost) return { ok: false, reason: 'energy', needed: cost }

      player.modifyResource('energy', -cost)

      this.currentRun = {
        districtId,
        route: [...this.plannedRoute],
        stepIndex: 0,                    // 0 = entry node (auto-consumed, no event)
        pendingEvent: null,
        log: [],
        totals: { cash: 0, xp: 0, crimeXp: 0, hp: 0, items: [] },
        energyPaid: cost,
        startedAt: Date.now(),
      }

      // Mark entry as explored
      this._markExplored(districtId, this.plannedRoute[0])

      // Clear planning (the run takes over)
      this.planningDistrictId = null
      this.plannedRoute = []

      // Auto-advance past entry node (no event at entry)
      this._advanceStep()

      useGameStore().saveGame()
      return { ok: true }
    },

    _advanceStep() {
      if (!this.currentRun) return
      this.currentRun.stepIndex++
      if (this.currentRun.stepIndex >= this.currentRun.route.length) {
        this._finishRun('completed')
        return
      }
      const nodeId = this.currentRun.route[this.currentRun.stepIndex]
      this._markExplored(this.currentRun.districtId, nodeId)
      this.totalNodesVisited++

      // Pick an event for this node
      this.currentRun.pendingEvent = this._pickEventForNode(this.currentRun.districtId, nodeId)
    },

    _markExplored(districtId, nodeId) {
      const s = this.districts[districtId]
      if (!s) return
      if (!s.exploredNodeIds.includes(nodeId)) s.exploredNodeIds.push(nodeId)
    },

    _pickEventForNode(districtId, nodeId) {
      const d = getDistrict(districtId)
      const s = this.districts[districtId]
      const mod = getModifier(s.modifierId)
      const ownsHood = this.ownsNeighborhood(districtId)
      const heatTier = this.heatTier(districtId)

      // Build category weights
      const weights = { ...BASE_EVENT_WEIGHTS }
      if (d.eventBias) for (const k in d.eventBias) weights[k] = (weights[k] || 0) * d.eventBias[k]
      if (mod?.weightMult) for (const k in mod.weightMult) weights[k] = (weights[k] || 0) * mod.weightMult[k]
      // Heat tier tilts danger/ambush up, opportunity down
      if (heatTier === 'warm') { weights.danger *= 1.3; weights.ambush *= 1.2; weights.opportunity *= 0.9 }
      if (heatTier === 'hot') { weights.danger *= 1.8; weights.ambush *= 1.5; weights.opportunity *= 0.7 }
      // Territory ownership: fewer ambushes in your own district
      if (ownsHood) {
        weights.ambush *= EXPEDITION_CONSTS.OWN_NEIGHBORHOOD_AMBUSH_MULT
        weights.danger *= 0.8
      }

      // Pick category
      const categoryPool = Object.entries(weights)
        .filter(([, w]) => w > 0)
        .map(([cat, w]) => ({ cat, weight: w }))
      const chosenCat = pickWeighted(categoryPool)?.cat || 'empty'

      // Pick event in that category
      const candidates = EXPEDITION_EVENTS
        .filter(e => e.category === chosenCat)
        .map(e => {
          const bias = e.districtBias?.[districtId] || 1.0
          return { event: e, weight: 1 * bias }
        })
      if (!candidates.length) {
        return { eventId: 'empty_street', nodeId }
      }
      const chosenEvent = pickWeighted(candidates)?.event
      return { eventId: chosenEvent?.id || 'empty_street', nodeId }
    },

    resolveEventChoice(choiceKey) {
      if (!this.currentRun?.pendingEvent) return false
      const event = getEventById(this.currentRun.pendingEvent.eventId)
      if (!event) return false
      const choice = event.choices.find(c => c.key === choiceKey)
      if (!choice) return false

      // Check requires
      const player = usePlayerStore()
      const inventory = useInventoryStore()
      if (choice.requires) {
        for (const [k, v] of Object.entries(choice.requires)) {
          if (k === 'cash' && player.cash < v) return false
          if (k === 'hp' && player.resources.hp.current < v) return false
          if (k === 'energy' && player.resources.energy.current < v) return false
          if (k === 'stamina' && player.resources.stamina.current < v) return false
          if (k === 'nerve' && player.resources.nerve.current < v) return false
          if (k === 'filotimo' && player.filotimo < v) return false
          if (k === 'item' && !inventory.hasItem(v)) return false
        }
      }

      // Roll stat check if defined
      let outcome = choice.outcome || {}
      if (choice.roll) {
        const statVal = player.stats[choice.roll.stat] || 0
        const roll = Math.random() * 10 + statVal * 0.5
        const passed = roll >= (choice.roll.dc || 5)
        if (!passed && choice.altOutcome) outcome = choice.altOutcome
      }

      this._applyOutcome(outcome, event)

      // Clear event, advance
      const ended = !!outcome.endRun
      const extraNodes = outcome.__extraNode === true ? 1 : (typeof outcome.__extraNode === 'number' ? outcome.__extraNode : 0)

      this.currentRun.pendingEvent = null

      if (ended) {
        this._finishRun('retreat')
        return true
      }

      // Extra nodes: lengthen route if possible by re-appending last neighbor (simplistic)
      if (extraNodes > 0) {
        // Tag it in log — no need to actually extend; we just advance normally
        this.currentRun.log.push({
          nodeId: this.currentRun.pendingEvent?.nodeId || null,
          note: `+${extraNodes} βήμα${extraNodes > 1 ? 'τα' : ''} παράκαμψης`,
        })
      }

      this._advanceStep()
      useGameStore().saveGame()
      return true
    },

    _applyOutcome(outcome, event) {
      const player = usePlayerStore()
      const inventory = useInventoryStore()
      const districtId = this.currentRun.districtId
      const district = this.districts[districtId]
      const ownsHood = this.ownsNeighborhood(districtId)
      const mod = getModifier(district.modifierId)
      const diminish = this.diminishingMultiplier(districtId)
      const currentNodeId = this.currentRun.route[this.currentRun.stepIndex]
      const isHotNode = district.hotNodeIds.includes(currentNodeId)

      // Reward multiplier applies to cash/xp/crimeXp positive values
      let rewardMult = 1.0
      if (ownsHood) rewardMult *= EXPEDITION_CONSTS.OWN_NEIGHBORHOOD_REWARD_MULT
      if (mod?.rewardMult) rewardMult *= mod.rewardMult
      if (isHotNode) rewardMult *= EXPEDITION_CONSTS.HOT_NODE_REWARD_MULT
      rewardMult *= diminish

      const totals = this.currentRun.totals
      const logEntry = {
        nodeId: currentNodeId,
        eventTitle: event.title,
        eventIcon: event.icon,
        deltas: {},
      }

      // Resources
      for (const k of ['hp', 'energy', 'nerve', 'stamina', 'happiness']) {
        if (outcome[k] != null) {
          player.modifyResource(k, outcome[k])
          logEntry.deltas[k] = outcome[k]
          if (k === 'hp') totals.hp += outcome[k]
        }
      }

      // Cash
      if (outcome.cash != null) {
        const val = outcome.cash > 0 ? Math.round(outcome.cash * rewardMult) : outcome.cash
        if (val > 0) player.addCash(val)
        else if (val < 0) player.removeCash(-val)
        totals.cash += val
        logEntry.deltas.cash = val
      }

      // XP / crimeXp
      if (outcome.xp) {
        const val = Math.round(outcome.xp * rewardMult)
        player.addXP(val)
        totals.xp += val
        logEntry.deltas.xp = val
      }
      if (outcome.crimeXp) {
        const val = Math.round(outcome.crimeXp * rewardMult)
        player.addCrimeXP(val)
        totals.crimeXp += val
        logEntry.deltas.crimeXp = val
      }

      // Filotimo / meson
      if (outcome.filotimo) {
        player.addFilotimoRaw(outcome.filotimo)
        logEntry.deltas.filotimo = outcome.filotimo
      }
      if (outcome.meson) {
        player.addMeson(outcome.meson)
        logEntry.deltas.meson = outcome.meson
      }

      // Items
      if (outcome.item) {
        const { id, qty } = outcome.item
        if (qty > 0) {
          const res = inventory.addItem(id, qty)
          if (res.ok) {
            totals.items.push({ id, qty })
            logEntry.deltas.item = { id, qty }
          } else {
            logEntry.deltas.itemFailed = { id, qty, reason: res.message }
          }
        } else if (qty < 0) {
          inventory.removeItem(id, -qty)
          logEntry.deltas.item = { id, qty }
        }
      }

      const bonusPool = outcome.itemPool?.length ? outcome.itemPool : getExpeditionBonusItemPool(event.id, outcome)
      if (bonusPool?.length) {
        const rolledItem = pickFromItemPool(bonusPool)
        if (rolledItem) {
          const res = inventory.addItem(rolledItem.id, rolledItem.qty)
          if (res.ok) {
            totals.items.push({ id: rolledItem.id, qty: rolledItem.qty })
            logEntry.deltas.bonusItem = { id: rolledItem.id, qty: rolledItem.qty }
          } else {
            logEntry.deltas.bonusItemFailed = { id: rolledItem.id, qty: rolledItem.qty, reason: res.message }
          }
        }
      }

      // Heat change on the district
      if (outcome.heat != null) {
        this._syncHeat(districtId)
        district.heat = Math.max(0, Math.min(EXPEDITION_CONSTS.HEAT_MAX, district.heat + outcome.heat))
        district.lastHeatTickAt = Date.now()
      }

      // Special flags
      if (outcome.__markNode) {
        if (!district.markedNodeIds.includes(currentNodeId)) district.markedNodeIds.push(currentNodeId)
        logEntry.deltas.marked = true
      }
      if (outcome.__revealHotNode) {
        // Reveal/highlight a random hot node (flavor — UI reads from district state)
        logEntry.deltas.revealed = district.hotNodeIds[0] || null
      }

      this.currentRun.log.push(logEntry)
    },

    _syncHeat(districtId) {
      // Collapse computed decay into stored value
      const s = this.districts[districtId]
      if (!s) return
      s.heat = this.effectiveHeat(districtId)
      s.lastHeatTickAt = Date.now()
    },

    retreat() {
      if (!this.currentRun) return
      if (this.currentRun.pendingEvent) this.currentRun.pendingEvent = null
      this._finishRun('retreat')
    },

    _finishRun(reason = 'completed') {
      if (!this.currentRun) return
      const run = this.currentRun
      const districtId = run.districtId
      const d = getDistrict(districtId)
      const district = this.districts[districtId]

      // Update district state
      this._syncHeat(districtId)
      district.heat = Math.max(0, Math.min(EXPEDITION_CONSTS.HEAT_MAX, district.heat + EXPEDITION_CONSTS.HEAT_INCREASE_PER_RUN))
      district.lastHeatTickAt = Date.now()
      district.lastRunAt = Date.now()
      district.runsToday = (district.runsToday || 0) + 1

      this.totalRuns++

      // Log a summary message
      const player = usePlayerStore()
      const gotCash = run.totals.cash
      const nodesCleared = run.stepIndex
      const prefix = reason === 'retreat' ? '🚪 Υποχώρηση' : '🏁 Ολοκλήρωση'
      const cashTxt = gotCash >= 0 ? `+${gotCash}€` : `${gotCash}€`
      player.logActivity(`${prefix} από ${d.name} — ${nodesCleared} σημεία, ${cashTxt}`, reason === 'retreat' ? 'warning' : 'success')

      useGameStore().addNotification(
        `${prefix}: ${d.name}`,
        reason === 'retreat' ? 'warning' : 'success'
      )

      // Store a final run summary so the UI can render it
      this.currentRun = {
        ...run,
        pendingEvent: null,
        finishedReason: reason,
        finishedAt: Date.now(),
        isFinished: true,
      }

      useGameStore().saveGame({ immediate: true })
    },

    dismissFinishedRun() {
      if (this.currentRun?.isFinished) {
        this.currentRun = null
      }
    },

    // ─── Serialization ─────────────────────────────────────────────────
    getSerializable() {
      return {
        districts: JSON.parse(JSON.stringify(this.districts)),
        dailyKey: this.dailyKey,
        planningDistrictId: this.planningDistrictId,
        plannedRoute: [...this.plannedRoute],
        currentRun: this.currentRun ? JSON.parse(JSON.stringify(this.currentRun)) : null,
        totalRuns: this.totalRuns,
        totalNodesVisited: this.totalNodesVisited,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.districts) this.districts = data.districts
      if (data.dailyKey) this.dailyKey = data.dailyKey
      this.planningDistrictId = data.planningDistrictId || null
      this.plannedRoute = Array.isArray(data.plannedRoute) ? data.plannedRoute : []
      this.currentRun = data.currentRun || null
      this.totalRuns = data.totalRuns || 0
      this.totalNodesVisited = data.totalNodesVisited || 0
      // Roll daily if needed on load
      this.ensureDailyRollover()
    },
  },
})
