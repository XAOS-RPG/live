import { defineStore } from 'pinia'
import { DAILY_MISSIONS, STORY_MISSIONS, getRandomMissions } from '../data/missions'
import { getItemById } from '../data/items'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'

const FEATURE_LABELS = {
  black_market: 'Πρόσβαση στο Μαύρο Χρηματιστήριο',
}

function cloneStoryTemplate(m) {
  return {
    id: m.id,
    title: m.title,
    npcName: m.npcName,
    npcIcon: m.npcIcon,
    flavorText: m.flavorText,
    objective: { ...m.objective },
    requirements: m.requirements ? { ...m.requirements } : {},
    rewards: m.rewards ? { ...m.rewards } : {},
  }
}

export const useMissionStore = defineStore('mission', {
  state: () => ({
    activeDailyMissions: [],
    lastRefreshDate: null,
    totalCompleted: 0,

    completedStoryMissionIds: [],
    /** Runtime story mission (template fields + progress + flags) */
    activeStoryMission: null,
    unlockedFeatures: [],
  }),

  getters: {
    todayStr() {
      return new Date().toISOString().split('T')[0]
    },
    needsRefresh() {
      return this.lastRefreshDate !== this.todayStr
    },
    completedUnclaimed() {
      const daily = this.activeDailyMissions.filter(m => m.completed && !m.claimed).length
      const story =
        this.activeStoryMission && this.activeStoryMission.completed && !this.activeStoryMission.claimed
          ? 1
          : 0
      return daily + story
    },

    /** Next story step the player can work toward (template from data). */
    availableStoryMission() {
      const player = usePlayerStore()
      for (const m of STORY_MISSIONS) {
        if (this.completedStoryMissionIds.includes(m.id)) continue
        const req = m.requirements || {}
        const minLevel = req.level ?? 1
        if (player.level < minLevel) continue
        const prev = req.previousMissionId
        if (prev && !this.completedStoryMissionIds.includes(prev)) continue
        return m
      }
      return null
    },

    isFeatureUnlocked: state => featureName => state.unlockedFeatures.includes(featureName),
  },

  actions: {
    /**
     * Picks the next qualified story mission and materializes it in `activeStoryMission`.
     * Does not replace an active mission that is still in progress or ready to claim.
     */
    startNextStoryMission() {
      if (this.activeStoryMission && !this.activeStoryMission.claimed) {
        return
      }

      const next = this.availableStoryMission
      if (!next) {
        this.activeStoryMission = null
        return
      }

      this.activeStoryMission = {
        ...cloneStoryTemplate(next),
        progress: 0,
        completed: false,
        claimed: false,
      }
    },

    /**
     * @param {string} type - 'combat' | 'crime' | 'gym' | 'earn' | 'travel' | ...
     * @param {number} [count=1]
     * @param {object} [meta] - e.g. { difficulty, isPvp, success } for combat/crime
     */
    updateProgress(type, count = 1, meta = {}) {
      for (const mission of this.activeDailyMissions) {
        if (mission.claimed || mission.completed) continue
        this._applyDailyProgress(mission, type, count, meta)
        if (mission.progress >= mission.target) mission.completed = true
      }

      const sm = this.activeStoryMission
      if (sm && !sm.claimed && !sm.completed) {
        const obj = sm.objective
        if (obj && obj.type === type) {
          const add = Math.max(0, Number(count) || 0)
          sm.progress = Math.min(obj.count, (sm.progress || 0) + add)
          if (sm.progress >= obj.count) sm.completed = true
        }
      }
    },

    _applyDailyProgress(mission, type, count, meta) {
      if (mission.type === 'combat') {
        if (type !== 'combat') return
        if (mission.difficulty !== meta.difficulty) return
        mission.progress++
        return
      }
      if (mission.type === 'combat_any') {
        if (type !== 'combat') return
        mission.progress++
        return
      }
      if (mission.type === 'pvp') {
        if (type !== 'combat' || !meta.isPvp) return
        mission.progress++
        return
      }
      if (mission.type === 'crime') {
        if (type !== 'crime') return
        mission.progress++
        return
      }
      if (mission.type === 'crime_success') {
        if (type !== 'crime') return
        if (meta.success) mission.progress++
        else mission.progress = 0
        return
      }
      if (mission.type === 'gym') {
        if (type !== 'gym') return
        mission.progress++
        return
      }
      if (mission.type === 'earn') {
        if (type !== 'earn') return
        mission.progress += count
      }
    },

    refreshMissions() {
      if (!this.needsRefresh && this.activeDailyMissions.length > 0) return

      const templates = getRandomMissions(3)
      this.activeDailyMissions = templates.map(t => ({
        ...t,
        progress: 0,
        completed: false,
        claimed: false,
      }))
      this.lastRefreshDate = this.todayStr
    },

    /**
     * @param {string} missionId
     * @param {boolean} isStory
     */
    claimReward(missionId, isStory = false) {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (!isStory) {
        const mission = this.activeDailyMissions.find(m => m.id === missionId)
        if (!mission || !mission.completed || mission.claimed) return false

        player.addCash(mission.rewardCash)
        player.addXP(mission.rewardXP)
        mission.claimed = true
        this.totalCompleted++

        gameStore.addNotification(
          `Αποστολή "${mission.title}": +€${mission.rewardCash} +${mission.rewardXP}XP`,
          'success'
        )
        player.logActivity(`📋 ${mission.title}: +€${mission.rewardCash}`, 'cash')
        gameStore.saveGame()
        return true
      }

      const sm = this.activeStoryMission
      if (!sm || sm.id !== missionId || !sm.completed || sm.claimed) return false

      const rw = sm.rewards || {}
      if (rw.cash) player.addCash(rw.cash)
      if (rw.xp) player.addXP(rw.xp)

      if (rw.item) {
        const inventoryStore = useInventoryStore()
        inventoryStore.addItem(rw.item, 1)
        const item = getItemById(rw.item)
        const itemName = item ? item.name : rw.item
        gameStore.addNotification(`Λάβες αντικείμενο: ${itemName}`, 'success')
      }

      if (rw.unlockFeature) {
        if (!this.unlockedFeatures.includes(rw.unlockFeature)) {
          this.unlockedFeatures.push(rw.unlockFeature)
        }
        const label = FEATURE_LABELS[rw.unlockFeature] || rw.unlockFeature
        gameStore.addNotification(`Ξεκλειδώθηκε: ${label}`, 'success')
      }

      gameStore.addNotification(`Ιστορία: «${sm.title}» ολοκληρώθηκε!`, 'success')
      player.logActivity(`📜 ${sm.title}: ολοκληρώθηκε`, 'xp')

      sm.claimed = true
      this.completedStoryMissionIds.push(sm.id)
      this.totalCompleted++

      this.activeStoryMission = null
      this.startNextStoryMission()

      gameStore.saveGame()
      return true
    },

    // ── Legacy helpers (delegate to updateProgress) ──────────────────────

    onCombatWin(_opponentId, difficulty, isPvp) {
      this.updateProgress('combat', 1, { difficulty, isPvp: !!isPvp })
    },

    onCrimeComplete(success) {
      this.updateProgress('crime', 1, { success: !!success })
    },

    onGymTrain() {
      this.updateProgress('gym', 1)
    },

    onEarnCash(amount) {
      this.updateProgress('earn', amount)
    },

    /** @deprecated Use claimReward(mission.id, false) */
    claimMission(index) {
      const mission = this.activeDailyMissions[index]
      if (!mission) return false
      return this.claimReward(mission.id, false)
    },

    getSerializable() {
      return {
        activeDailyMissions: this.activeDailyMissions.map(m => ({ ...m })),
        lastRefreshDate: this.lastRefreshDate,
        totalCompleted: this.totalCompleted,
        completedStoryMissionIds: [...this.completedStoryMissionIds],
        activeStoryMission: this.activeStoryMission ? { ...this.activeStoryMission } : null,
        unlockedFeatures: [...this.unlockedFeatures],
      }
    },

    hydrate(data) {
      if (!data) return

      if (data.activeMissions && !data.activeDailyMissions) {
        data.activeDailyMissions = data.activeMissions
      }

      if (data.activeDailyMissions) {
        this.activeDailyMissions = data.activeDailyMissions.map(m => ({ ...m }))
      }
      if (data.lastRefreshDate !== undefined) this.lastRefreshDate = data.lastRefreshDate
      if (data.totalCompleted !== undefined) this.totalCompleted = data.totalCompleted

      if (data.completedStoryMissionIds) {
        this.completedStoryMissionIds = [...data.completedStoryMissionIds]
      }
      if (data.unlockedFeatures) {
        this.unlockedFeatures = [...data.unlockedFeatures]
      }
      if (data.activeStoryMission) {
        this.activeStoryMission = { ...data.activeStoryMission }
      }

      this.startNextStoryMission()
    },
  },
})
