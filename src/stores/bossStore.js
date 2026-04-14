import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { useAchievementStore } from './achievementStore'
import { useClassStore } from './classStore'
import { calculateCombatDamage } from '../engine/formulas'

const BOSS_DEF = {
  id: 'world_boss_trapeza',
  name: 'Επιδρομή στην Κεντρική Τράπεζα',
  icon: '🏦',
  maxHp: 1_000_000,
  stats: { strength: 80, speed: 40, dexterity: 30, defense: 60 },
}

const REWARD_POOL_CASH = 5_000_000
const REWARD_MATERIALS = [
  { id: 'mat_iron',        qty: 5 },
  { id: 'mat_electronics', qty: 3 },
  { id: 'mat_kevlar',      qty: 2 },
]
const ENERGY_COST = 25
const TOP_DAMAGER_BONUS_CASH = 500_000
const TOP_DAMAGER_BONUS_MATERIALS = [{ id: 'mat_kevlar', qty: 5 }]

export const useBossStore = defineStore('boss', {
  state: () => ({
    active: false,
    bossHp: BOSS_DEF.maxHp,
    defeated: false,
    startedAt: null,
    // { [playerName]: { damage, rewarded } }
    contributions: {},
    // local player's reward info after boss dies
    myReward: null,
    isTopDamager: false,
  }),

  getters: {
    bossHpPercent(state) {
      return Math.max(0, (state.bossHp / BOSS_DEF.maxHp) * 100)
    },

    sortedContributors(state) {
      return Object.entries(state.contributions)
        .map(([name, v]) => ({ name, damage: v.damage }))
        .sort((a, b) => b.damage - a.damage)
    },

    myDamage(state) {
      const player = usePlayerStore()
      return state.contributions[player.name]?.damage ?? 0
    },

    totalDamageDealt(state) {
      return Object.values(state.contributions).reduce((s, v) => s + v.damage, 0)
    },

    canAttack(state) {
      const player = usePlayerStore()
      return state.active && !state.defeated && player.resources.energy.current >= ENERGY_COST && player.status === 'free'
    },

    boss() { return BOSS_DEF },
    energyCost() { return ENERGY_COST },
  },

  actions: {
    startRaid() {
      if (this.active) return
      this.active = true
      this.bossHp = BOSS_DEF.maxHp
      this.defeated = false
      this.startedAt = Date.now()
      this.contributions = {}
      this.myReward = null
      this.isTopDamager = false
      useGameStore().addNotification(`⚔️ ${BOSS_DEF.name} ξεκίνησε!`, 'danger')
    },

    attack() {
      if (!this.canAttack) return null
      const player = usePlayerStore()
      const classStore = useClassStore()

      player.modifyResource('energy', -ENERGY_COST)

      // Calculate raw damage using player stats vs boss stats
      const rawDmg = calculateCombatDamage(player.stats, BOSS_DEF.stats, null)
      // Apply Εκτελεστής bonus
      const dmg = Math.max(1, Math.floor(rawDmg * classStore.combatBonus))

      this.bossHp = Math.max(0, this.bossHp - dmg)

      // Track contribution
      if (!this.contributions[player.name]) {
        this.contributions[player.name] = { damage: 0 }
      }
      this.contributions[player.name].damage += dmg

      if (this.bossHp <= 0) {
        this._defeatBoss()
      }

      useGameStore().saveGame()
      return dmg
    },

    _defeatBoss() {
      this.defeated = true
      this.active = false

      const player = usePlayerStore()
      const inventoryStore = useInventoryStore()
      const gameStore = useGameStore()

      const totalDmg = this.totalDamageDealt || 1
      const myDmg = this.contributions[player.name]?.damage ?? 0
      const ratio = myDmg / totalDmg

      // Proportional cash reward
      const cashReward = Math.floor(REWARD_POOL_CASH * ratio)
      player.addCash(cashReward)

      // Proportional materials (at least 1 of each if contributed)
      const matsGiven = []
      if (myDmg > 0) {
        for (const mat of REWARD_MATERIALS) {
          const qty = Math.max(1, Math.round(mat.qty * ratio * 10))
          inventoryStore.addItem(mat.id, qty)
          matsGiven.push({ id: mat.id, qty })
        }
      }

      // Top damager check
      const sorted = this.sortedContributors
      const isTop = sorted.length > 0 && sorted[0].name === player.name
      this.isTopDamager = isTop

      if (isTop) {
        player.addCash(TOP_DAMAGER_BONUS_CASH)
        for (const mat of TOP_DAMAGER_BONUS_MATERIALS) {
          inventoryStore.addItem(mat.id, mat.qty)
        }
        // Grant achievement
        useAchievementStore().unlockBossAchievement?.()
        gameStore.addNotification(`👑 Top Damager! +€${TOP_DAMAGER_BONUS_CASH.toLocaleString('el-GR')} bonus!`, 'success')
        player.logActivity(`👑 Top Damager στο ${BOSS_DEF.name}! +€${TOP_DAMAGER_BONUS_CASH.toLocaleString('el-GR')}`, 'xp')
      }

      this.myReward = { cash: cashReward + (isTop ? TOP_DAMAGER_BONUS_CASH : 0), materials: matsGiven, isTop }

      gameStore.addNotification(`🏦 ${BOSS_DEF.name} νικήθηκε! +€${cashReward.toLocaleString('el-GR')}`, 'success')
      player.logActivity(`🏦 ${BOSS_DEF.name} νικήθηκε! +€${cashReward.toLocaleString('el-GR')}`, 'cash')
      player.addXP(5000)
      gameStore.saveGame()
    },

    getSerializable() {
      return {
        active: this.active,
        bossHp: this.bossHp,
        defeated: this.defeated,
        startedAt: this.startedAt,
        contributions: { ...this.contributions },
        myReward: this.myReward,
        isTopDamager: this.isTopDamager,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.active !== undefined) this.active = data.active
      if (data.bossHp !== undefined) this.bossHp = data.bossHp
      if (data.defeated !== undefined) this.defeated = data.defeated
      if (data.startedAt !== undefined) this.startedAt = data.startedAt
      if (data.contributions) this.contributions = { ...data.contributions }
      if (data.myReward !== undefined) this.myReward = data.myReward
      if (data.isTopDamager !== undefined) this.isTopDamager = data.isTopDamager
    },
  },
})
