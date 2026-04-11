import { defineStore } from 'pinia'
import { fakeUsers } from '../data/fakeUsers'

// Initial fake bounties pre-populated in the world
const INITIAL_BOUNTIES = [
  {
    id: 'b_init_1',
    targetId: 'fuser_9',
    targetName: 'GR_Enforcer',
    targetIcon: '🔥',
    targetLevel: 14,
    targetStats: { strength: 45, speed: 35, dexterity: 32, defense: 38 },
    targetHp: 350,
    reward: 1500,
    placedBy: 'AthensStreet99',
    placedByIcon: '🗡️',
    isPlayerBounty: false,
    placedAt: Date.now() - 2 * 3600000,
    expiresAt: Date.now() + 46 * 3600000,
    energyCost: 30,
  },
  {
    id: 'b_init_2',
    targetId: 'fuser_6',
    targetName: 'AthensStreet99',
    targetIcon: '🗡️',
    targetLevel: 8,
    targetStats: { strength: 20, speed: 17, dexterity: 16, defense: 14 },
    targetHp: 170,
    reward: 600,
    placedBy: 'VangelisFury',
    placedByIcon: '😡',
    isPlayerBounty: false,
    placedAt: Date.now() - 5 * 3600000,
    expiresAt: Date.now() + 43 * 3600000,
    energyCost: 25,
  },
  {
    id: 'b_init_3',
    targetId: 'fuser_11',
    targetName: 'ShadowNikos',
    targetIcon: '🥷',
    targetLevel: 18,
    targetStats: { strength: 68, speed: 55, dexterity: 60, defense: 52 },
    targetHp: 480,
    reward: 3000,
    placedBy: 'GR_Enforcer',
    placedByIcon: '🔥',
    isPlayerBounty: false,
    placedAt: Date.now() - 1 * 3600000,
    expiresAt: Date.now() + 47 * 3600000,
    energyCost: 35,
  },
  {
    id: 'b_init_4',
    targetId: 'fuser_3',
    targetName: 'ThessKing',
    targetIcon: '🧢',
    targetLevel: 4,
    targetStats: { strength: 9, speed: 8, dexterity: 8, defense: 7 },
    targetHp: 95,
    reward: 200,
    placedBy: 'gr_nikos',
    placedByIcon: '🙂',
    isPlayerBounty: false,
    placedAt: Date.now() - 8 * 3600000,
    expiresAt: Date.now() + 40 * 3600000,
    energyCost: 20,
  },
  {
    id: 'b_init_5',
    targetId: 'fuser_7',
    targetName: 'Σπύρος_Underground',
    targetIcon: '🧤',
    targetLevel: 9,
    targetStats: { strength: 22, speed: 19, dexterity: 18, defense: 16 },
    targetHp: 190,
    reward: 800,
    placedBy: 'xXDimitrisXx',
    placedByIcon: '💪',
    isPlayerBounty: false,
    placedAt: Date.now() - 3 * 3600000,
    expiresAt: Date.now() + 45 * 3600000,
    energyCost: 25,
  },
]

export const useBountyStore = defineStore('bounty', {
  state: () => ({
    bounties: INITIAL_BOUNTIES.map(b => ({ ...b })),
    nextId: 100,
    huntResults: [], // recent hunt outcomes { bountyId, won, reward, timestamp }
  }),

  getters: {
    activeBounties(state) {
      const now = Date.now()
      return state.bounties.filter(b => b.expiresAt > now)
    },

    playerBounties(state) {
      return state.bounties.filter(b => b.isPlayerBounty)
    },
  },

  actions: {
    placeBounty(target, reward, playerName, playerIcon) {
      if (reward < 100) return false
      const existing = this.bounties.find(b => b.targetId === target.id && b.isPlayerBounty)
      if (existing) return false // already placed one on this target

      this.bounties.push({
        id: `b_p_${this.nextId++}`,
        targetId: target.id,
        targetName: target.nickname,
        targetIcon: target.icon,
        targetLevel: target.level,
        targetStats: { ...target.stats },
        targetHp: target.hp,
        reward,
        placedBy: playerName,
        placedByIcon: playerIcon,
        isPlayerBounty: true,
        placedAt: Date.now(),
        expiresAt: Date.now() + 48 * 3600000,
        energyCost: 25,
      })
      return true
    },

    cancelPlayerBounty(id) {
      const idx = this.bounties.findIndex(b => b.id === id && b.isPlayerBounty)
      if (idx !== -1) {
        const bounty = this.bounties[idx]
        this.bounties.splice(idx, 1)
        return bounty.reward // refund
      }
      return 0
    },

    huntBounty(bountyId, playerStats, playerHp) {
      const bounty = this.bounties.find(b => b.id === bountyId)
      if (!bounty) return null

      const playerPower = playerStats.strength + playerStats.dexterity + playerStats.speed
      const targetPower = bounty.targetStats.strength + bounty.targetStats.dexterity + bounty.targetStats.speed
      const successChance = Math.min(0.9, Math.max(0.1, playerPower / (playerPower + targetPower)))
      const won = Math.random() < successChance

      const result = {
        bountyId,
        targetName: bounty.targetName,
        won,
        reward: won ? bounty.reward : 0,
        hpLost: won ? Math.floor(playerHp * 0.1) : Math.floor(playerHp * 0.25),
        timestamp: Date.now(),
      }

      if (won) {
        const idx = this.bounties.findIndex(b => b.id === bountyId)
        if (idx !== -1) this.bounties.splice(idx, 1)
      }

      this.huntResults.unshift(result)
      if (this.huntResults.length > 10) this.huntResults.pop()

      return result
    },

    getSerializable() {
      return {
        bounties: this.bounties.map(b => ({ ...b })),
        nextId: this.nextId,
        huntResults: this.huntResults.map(r => ({ ...r })),
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.bounties) this.bounties = data.bounties
      if (data.nextId) this.nextId = data.nextId
      if (data.huntResults) this.huntResults = data.huntResults
    },
  },
})
