import { computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useEventsHubStore } from '../stores/eventsHubStore'
import { useDailyRewardStore } from '../stores/dailyRewardStore'
import { useMissionStore } from '../stores/missionStore'
import { useAchievementStore } from '../stores/achievementStore'
import { useBazaarStore } from '../stores/bazaarStore'
import { useJobStore } from '../stores/jobStore'
import { useCompanyStore } from '../stores/companyStore'

export function useNavBadges() {
  const player       = usePlayerStore()
  const eventsHub    = useEventsHubStore()
  const daily        = useDailyRewardStore()
  const missions     = useMissionStore()
  const achievements = useAchievementStore()
  const bazaar       = useBazaarStore()
  const job          = useJobStore()
  const company      = useCompanyStore()

  const dailyBadge        = computed(() => daily.canClaim)
  const missionsBadge     = computed(() => missions.completedUnclaimed > 0)
  const achievementsBadge = computed(() => achievements.unclaimedCount > 0)
  const masteriesBadge    = computed(() => player.abilityPoints > 0)
  const eventsHubBadge    = computed(() => eventsHub.hubUnread)
  const bazaarBadge       = computed(() => bazaar.pendingSales.length > 0)
  const jobBadge          = computed(() => job.canWork)
  const companyBadge      = computed(() => company.pendingIncome >= 1)

  // Home dot = any of the "claim" badges
  const homeBadge = computed(() =>
    dailyBadge.value ||
    missionsBadge.value ||
    achievementsBadge.value ||
    masteriesBadge.value ||
    bazaarBadge.value ||
    jobBadge.value ||
    companyBadge.value
  )

  return {
    home:         homeBadge,
    eventsHub:    eventsHubBadge,
    daily:        dailyBadge,
    missions:     missionsBadge,
    achievements: achievementsBadge,
    masteries:    masteriesBadge,
    bazaar:       bazaarBadge,
    job:          jobBadge,
    company:      companyBadge,
  }
}
