<template>
  <div class="achievements-page">
    <div class="page-header-row">
      <h2 class="page-title">🏆 Επιτεύγματα</h2>
      <button
        type="button"
        class="btn btn-sm btn-success claim-all-btn"
        :disabled="achievementStore.unclaimedCount === 0"
        @click="achievementStore.claimAllUnclaimed()"
      >
        Πάρτα όλα
      </button>
    </div>

    <div class="card progress-bar-card">
      <div class="progress-info">
        <span>{{ achievementStore.unlockedCount }} / {{ achievementStore.totalCount }}</span>
        <span class="text-muted">{{ progressPercent }}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- Category tabs -->
    <div class="tab-bar">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="tab-btn"
        :class="{ active: activeTab === cat.key }"
        @click="activeTab = cat.key"
      >
        {{ cat.icon }} {{ cat.label }}
      </button>
    </div>

    <div class="achievement-list">
      <div
        v-for="ach in filteredAchievements"
        :key="ach.id"
        class="card achievement-card"
        :class="{
          unlocked: achievementStore.unlockedSet.has(ach.id),
          claimed: achievementStore.claimedSet.has(ach.id)
        }"
      >
        <div class="ach-icon">{{ ach.icon }}</div>
        <div class="ach-info">
          <strong>{{ ach.name }}</strong>
          <p class="text-muted ach-desc">{{ ach.description }}</p>
          <span class="badge badge-success ach-reward">€{{ ach.reward.cash }}</span>
        </div>
        <div class="ach-status">
          <button
            v-if="achievementStore.unlockedSet.has(ach.id) && !achievementStore.claimedSet.has(ach.id)"
            class="btn btn-sm btn-success"
            @click="achievementStore.claimReward(ach.id)"
          >
            Πάρε
          </button>
          <span v-else-if="achievementStore.claimedSet.has(ach.id)" class="badge badge-info">✅</span>
          <span v-else class="ach-locked">🔒</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAchievementStore } from '../stores/achievementStore'
import { achievements, achievementCategories } from '../data/achievements'

const achievementStore = useAchievementStore()
const activeTab = ref('combat')

const categories = [
  { key: 'all', label: 'Όλα', icon: '📋' },
  ...achievementCategories,
]

const filteredAchievements = computed(() => {
  if (activeTab.value === 'all') return achievements
  return achievements.filter(a => a.category === activeTab.value)
})

const progressPercent = computed(() => {
  if (achievementStore.totalCount === 0) return 0
  return Math.round(achievementStore.unlockedCount / achievementStore.totalCount * 100)
})
</script>

<style scoped>
.achievements-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.page-title {
  font-size: var(--font-size-2xl);
  margin: 0;
}

.claim-all-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.progress-bar-card { padding: var(--space-sm) var(--space-md); }

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-xs);
}

.progress-track {
  height: 8px;
  background: var(--bg-surface);
  border-radius: var(--border-radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-success));
  border-radius: var(--border-radius-full);
  transition: width var(--transition-normal);
}

.tab-bar {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-xs);
}

.tab-btn {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  border-radius: var(--border-radius-md);
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.tab-btn.active {
  background: var(--color-primary);
  color: var(--text-on-primary);
}

.tab-btn:hover:not(.active) {
  background: var(--bg-surface-raised);
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  opacity: 0.6;
  transition: all var(--transition-fast);
}

.achievement-card.unlocked {
  opacity: 1;
  border-color: var(--color-success);
}

.achievement-card.claimed {
  opacity: 0.8;
  border-color: var(--border-color);
}

.ach-icon { font-size: 28px; flex-shrink: 0; }

.ach-info { flex: 1; min-width: 0; }
.ach-info strong { font-size: var(--font-size-sm); }
.ach-desc { font-size: var(--font-size-xs); margin: 2px 0; }
.ach-reward { font-size: 10px; }

.ach-status { flex-shrink: 0; }
.ach-locked { font-size: 20px; opacity: 0.4; }
</style>
