<template>
  <div class="missions-page">
    <h2 class="page-title">📋 Αποστολές</h2>

    <div class="card missions-header">
      <div class="missions-info">
        <span class="text-muted">Ολοκληρωμένες (σύνολο)</span>
        <span class="text-mono text-success">{{ missionStore.totalCompleted }}</span>
      </div>
      <div class="missions-info">
        <span class="text-muted">Σήμερα (καθημερινά)</span>
        <span class="text-mono">{{ completedToday }} / {{ missionStore.activeDailyMissions.length }}</span>
      </div>
    </div>

    <!-- Story -->
    <section class="mission-section">
      <h3 class="section-title">Αποστολές Ιστορίας</h3>

      <div v-if="!storyCard" class="card story-empty text-muted text-center">
        <template v-if="storyFinished">
          <span class="story-empty-icon">🏛️</span>
          <p>Ολοκλήρωσες την αλυσίδα του Δασκάλου. Η πόλη περιμένει το επόμενο σου κεφάλαιο.</p>
        </template>
        <template v-else>
          Φόρτωση ιστορίας…
        </template>
      </div>

      <div
        v-else
        class="card story-card"
        :class="{
          'story-ready': storyCard.completed && !storyCard.claimed,
          'story-done': storyCard.claimed,
        }"
      >
        <div class="story-npc-row">
          <div class="npc-avatar" aria-hidden="true">{{ storyCard.npcIcon }}</div>
          <div class="npc-meta">
            <span class="npc-name">{{ storyCard.npcName }}</span>
            <span class="story-chip">Ιστορία</span>
          </div>
        </div>

        <div class="dialogue-bubble">
          <p class="dialogue-text">{{ storyCard.flavorText }}</p>
        </div>

        <div class="story-body">
          <strong class="story-mission-title">{{ storyCard.title }}</strong>
          <p class="text-muted story-objective-line">{{ storyObjectiveLabel(storyCard) }}</p>

          <div class="mission-progress">
            <div class="progress-track">
              <div
                class="progress-fill"
                :class="{ 'fill-done': storyCard.completed, 'fill-pulse': storyCard.completed && !storyCard.claimed }"
                :style="{ width: storyProgressPercent(storyCard) + '%' }"
              />
            </div>
            <span class="progress-text text-mono">
              {{ Math.min(storyCard.progress || 0, storyCard.objective?.count || 0) }}
              /
              {{ storyCard.objective?.count || 0 }}
            </span>
          </div>

          <div class="mission-rewards" v-if="storyRewardsLine(storyCard)">
            <span v-for="(b, i) in storyRewardBadges(storyCard)" :key="i" class="badge" :class="b.class">{{ b.text }}</span>
          </div>

          <div class="story-actions">
            <button
              v-if="storyCard.completed && !storyCard.claimed"
              type="button"
              class="btn btn-success claim-btn"
              @click="missionStore.claimReward(storyCard.id, true)"
            >
              Πάρε την ανταμοιβή
            </button>
            <span v-else-if="storyCard.claimed" class="badge badge-info">Ολοκληρώθηκε</span>
            <span v-else class="text-muted text-xs hint">Ολοκλήρωσε τον στόχο για να ξεκλειδώσεις την ανταμοιβή.</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Dailies -->
    <section class="mission-section">
      <h3 class="section-title">Καθημερινά Καθήκοντα</h3>

      <div v-if="missionStore.activeDailyMissions.length === 0" class="card text-center text-muted">
        Δεν υπάρχουν καθημερινές αποστολές. Θα ανανεωθούν αύριο!
      </div>

      <div class="mission-list">
        <div
          v-for="mission in missionStore.activeDailyMissions"
          :key="mission.id"
          class="card mission-card"
          :class="{
            completed: mission.completed,
            claimed: mission.claimed,
            'mission-ready': mission.completed && !mission.claimed,
          }"
        >
          <div class="mission-icon">{{ mission.icon }}</div>
          <div class="mission-info">
            <strong>{{ mission.title }}</strong>
            <p class="text-muted mission-desc">{{ mission.description }}</p>

            <div class="mission-progress">
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :class="{ 'fill-done': mission.completed, 'fill-pulse': mission.completed && !mission.claimed }"
                  :style="{ width: progressPercent(mission) + '%' }"
                />
              </div>
              <span class="progress-text text-mono">
                {{ Math.min(mission.progress, mission.target) }} / {{ mission.target }}
              </span>
            </div>

            <div class="mission-rewards">
              <span class="badge badge-success">€{{ mission.rewardCash }}</span>
              <span class="badge badge-info">{{ mission.rewardXP }} XP</span>
            </div>
          </div>
          <div class="mission-action">
            <button
              v-if="mission.completed && !mission.claimed"
              type="button"
              class="btn btn-sm btn-success claim-btn"
              @click="missionStore.claimReward(mission.id, false)"
            >
              Πάρε
            </button>
            <span v-else-if="mission.claimed" class="badge badge-info">✅</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMissionStore } from '../stores/missionStore'

const missionStore = useMissionStore()

const completedToday = computed(() =>
  missionStore.activeDailyMissions.filter(m => m.completed).length
)

const storyCard = computed(() => missionStore.activeStoryMission)

const storyFinished = computed(() => {
  const next = missionStore.availableStoryMission
  return !next && !missionStore.activeStoryMission
})

function progressPercent(mission) {
  if (mission.target === 0) return 100
  return Math.min(100, Math.round((mission.progress / mission.target) * 100))
}

function storyProgressPercent(m) {
  const n = m.objective?.count ?? 0
  if (!n) return 100
  return Math.min(100, Math.round(((m.progress || 0) / n) * 100))
}

function storyObjectiveLabel(m) {
  const t = m.objective?.type
  if (t === 'gym') return 'Στόχος: Ολοκλήρωσε προπονήσεις στο γυμναστήριο.'
  if (t === 'crime') return 'Στόχος: Εκτέλεσε εγκλήματα (οποιοδήποτε αποτέλεσμα μετράει).'
  if (t === 'travel') return 'Στόχος: Ολοκλήρωσε επιτυχημένο ταξίδι σε νέο προορισμό.'
  return 'Στόχος: Ακολούθησε τις οδηγίες του Δασκάλου.'
}

function storyRewardsLine(m) {
  const r = m.rewards
  if (!r) return false
  return !!(r.cash || r.xp || r.item || r.unlockFeature)
}

function storyRewardBadges(m) {
  const r = m.rewards || {}
  const out = []
  if (r.cash) out.push({ text: `€${r.cash}`, class: 'badge-success' })
  if (r.xp) out.push({ text: `${r.xp} XP`, class: 'badge-info' })
  if (r.unlockFeature) out.push({ text: 'Ξεκλείδωμα λειτουργίας', class: 'badge-accent' })
  return out
}
</script>

<style scoped>
.missions-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title {
  font-size: var(--font-size-2xl);
}

.missions-header {
  display: flex;
  justify-content: space-around;
}

.missions-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-sm);
}

.mission-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section-title {
  font-size: var(--font-size-md);
  margin: 0;
  letter-spacing: 0.02em;
}

.story-empty {
  padding: var(--space-lg);
}

.story-empty-icon {
  display: block;
  font-size: 36px;
  margin-bottom: var(--space-sm);
}

.story-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition:
    box-shadow 0.35s ease,
    border-color 0.35s ease,
    transform 0.35s ease;
}

.story-card.story-ready {
  border-color: var(--color-success);
  box-shadow: 0 0 0 1px rgba(46, 160, 67, 0.35), 0 8px 28px rgba(0, 0, 0, 0.18);
  animation: story-glow 2.2s ease-in-out infinite;
}

.story-card.story-done {
  opacity: 0.75;
}

@keyframes story-glow {
  0%,
  100% {
    box-shadow: 0 0 0 1px rgba(46, 160, 67, 0.35), 0 6px 20px rgba(0, 0, 0, 0.12);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(46, 160, 67, 0.55), 0 10px 32px rgba(46, 160, 67, 0.2);
  }
}

.story-npc-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.npc-avatar {
  width: 52px;
  height: 52px;
  border-radius: var(--border-radius-full);
  background: var(--bg-surface-raised);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
  border: 2px solid var(--border-color);
}

.npc-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.npc-name {
  font-weight: 700;
  font-size: var(--font-size-sm);
}

.story-chip {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dialogue-bubble {
  position: relative;
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-color);
}

.dialogue-bubble::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 24px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid var(--border-color);
}

.dialogue-text {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.story-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.story-mission-title {
  font-size: var(--font-size-sm);
}

.story-objective-line {
  font-size: var(--font-size-xs);
  margin: 0 0 var(--space-xs);
}

.text-xs {
  font-size: var(--font-size-xs);
}

.hint {
  line-height: 1.35;
}

.story-actions {
  margin-top: var(--space-xs);
}

.mission-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.mission-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  transition: all var(--transition-fast);
}

.mission-card.completed {
  border-color: var(--color-success);
}

.mission-card.claimed {
  opacity: 0.6;
  border-color: var(--border-color);
}

.mission-card.mission-ready {
  animation: mission-pop 0.6s ease;
  border-color: var(--color-success);
  box-shadow: 0 4px 18px rgba(46, 160, 67, 0.15);
}

@keyframes mission-pop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.01);
  }
  100% {
    transform: scale(1);
  }
}

.mission-icon {
  font-size: 28px;
  flex-shrink: 0;
  padding-top: 2px;
}

.mission-info {
  flex: 1;
  min-width: 0;
}

.mission-info strong {
  font-size: var(--font-size-sm);
}

.mission-desc {
  font-size: var(--font-size-xs);
  margin: 2px 0 var(--space-xs);
}

.mission-progress {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.progress-track {
  flex: 1;
  height: 8px;
  background: var(--bg-surface);
  border-radius: var(--border-radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--border-radius-full);
  transition: width var(--transition-normal);
}

.progress-fill.fill-done {
  background: var(--color-success);
}

.progress-fill.fill-pulse {
  animation: bar-shine 1.4s ease-in-out infinite;
}

@keyframes bar-shine {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.15);
  }
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.mission-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.mission-action {
  flex-shrink: 0;
  padding-top: var(--space-xs);
}

.claim-btn {
  animation: claim-pulse 1.8s ease-in-out infinite;
}

@keyframes claim-pulse {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-1px);
  }
}
</style>
