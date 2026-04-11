<template>
  <div class="edu-page">
    <h2 class="page-title">🎓 Πανεπιστήμιο</h2>

    <!-- Active study -->
    <div v-if="player.activeActivity && player.activeActivity.type === 'education'" class="card activity-card">
      <div class="activity-header">
        <span class="activity-icon">{{ player.activeActivity.icon }}</span>
        <div>
          <strong>{{ player.activeActivity.label }}</strong>
          <p class="text-muted" style="font-size: var(--font-size-xs)">Μελετάς...</p>
        </div>
      </div>
      <div class="activity-progress-track">
        <div class="activity-progress-fill" :style="{ width: (player.activityProgress * 100) + '%' }" />
      </div>
      <div class="activity-time text-mono text-accent">
        {{ formatTime(player.activityTimeRemaining) }}
      </div>
    </div>

    <!-- Busy with other activity -->
    <div v-else-if="player.activeActivity" class="card busy-card">
      <p class="text-muted">Είσαι απασχολημένος με: <strong>{{ player.activeActivity.label }}</strong></p>
      <p class="text-mono text-accent">{{ formatTime(player.activityTimeRemaining) }}</p>
    </div>

    <!-- Accumulated bonuses -->
    <div v-if="educationStore.completedCourses.length > 0" class="card bonuses-card">
      <h3 class="card-title">Πτυχία & Μπόνους</h3>
      <div class="bonus-list">
        <span v-if="bonuses.crimeSuccessBonus" class="badge badge-success">+{{ (bonuses.crimeSuccessBonus * 100).toFixed(0) }}% Επιτυχία Εγκλ.</span>
        <span v-if="bonuses.crimeRewardBonus" class="badge badge-success">+{{ (bonuses.crimeRewardBonus * 100).toFixed(0) }}% Κέρδη Εγκλ.</span>
        <span v-if="bonuses.jailTimeReduction" class="badge badge-info">-{{ (bonuses.jailTimeReduction * 100).toFixed(0) }}% Χρόνος Φυλακής</span>
        <span v-if="bonuses.hospitalTimeReduction" class="badge badge-info">-{{ (bonuses.hospitalTimeReduction * 100).toFixed(0) }}% Χρόνος Νοσοκ.</span>
        <span v-if="bonuses.escapeBonus" class="badge badge-warning">+{{ (bonuses.escapeBonus * 100).toFixed(0) }}% Απόδραση</span>
        <span v-if="bonuses.gymBonus" class="badge badge-success">+{{ (bonuses.gymBonus * 100).toFixed(0) }}% Γυμναστική</span>
        <span v-if="bonuses.salaryBonus" class="badge badge-success">+{{ (bonuses.salaryBonus * 100).toFixed(0) }}% Μισθός</span>
      </div>
    </div>

    <!-- Category tabs -->
    <div v-if="!player.activeActivity" class="category-tabs">
      <button
        v-for="cat in courseCategories"
        :key="cat.id"
        class="cat-tab"
        :class="{ active: selectedCategory === cat.id }"
        @click="selectedCategory = cat.id"
      >
        <span>{{ cat.icon }}</span>
        <span class="cat-label">{{ cat.name }}</span>
      </button>
    </div>

    <!-- Courses -->
    <div v-if="!player.activeActivity" class="course-list">
      <div
        v-for="course in filteredCourses"
        :key="course.id"
        class="card course-card"
        :class="{
          completed: educationStore.isCompleted(course.id),
          locked: !educationStore.canTakeCourse(course) && !educationStore.isCompleted(course.id),
        }"
        @click="startCourse(course)"
      >
        <div class="course-header">
          <span class="course-icon">{{ course.icon }}</span>
          <div class="course-info">
            <strong>{{ course.name }}</strong>
            <p class="course-desc text-muted">{{ course.description }}</p>
          </div>
          <span v-if="educationStore.isCompleted(course.id)" class="completed-badge">✓</span>
        </div>
        <div class="course-meta">
          <span class="badge badge-muted">{{ formatDuration(course.duration) }}</span>
          <span class="badge badge-warning">€{{ course.cost.toLocaleString('el-GR') }}</span>
          <span v-if="course.levelRequired > 1" class="badge badge-info">Επ. {{ course.levelRequired }}</span>
          <span v-if="course.prerequisite && !educationStore.isCompleted(course.prerequisite)" class="badge badge-danger">
            Προαπαιτούμενο
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useEducationStore } from '../stores/educationStore'
import { useGameStore } from '../stores/gameStore'
import { courseCategories, getCoursesByCategory } from '../data/courses'

const player = usePlayerStore()
const educationStore = useEducationStore()
const gameStore = useGameStore()

const selectedCategory = ref('it')

const bonuses = computed(() => educationStore.accumulatedBonuses)

const filteredCourses = computed(() => {
  return getCoursesByCategory(selectedCategory.value)
})

function startCourse(course) {
  if (educationStore.isCompleted(course.id)) return
  if (!educationStore.canTakeCourse(course)) return

  const result = educationStore.startCourse(course.id)
  if (!result.started) {
    gameStore.addNotification(result.message, 'danger')
  }
}

// Watch for education completion
watch(() => player.pendingResult, (result) => {
  if (result && result.type === 'education') {
    educationStore.completeCourse(result.courseId)
    player.clearPendingResult()
  }
}, { immediate: true })

function formatTime(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatDuration(ms) {
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}δ`
  const min = Math.floor(totalSec / 60)
  return `${min} λεπτ${min === 1 ? 'ό' : 'ά'}`
}
</script>

<style scoped>
.edu-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title {
  font-size: var(--font-size-2xl);
}

.bonuses-card .bonus-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

/* Category tabs */
.category-tabs {
  display: flex;
  gap: var(--space-xs);
  overflow-x: auto;
  padding-bottom: var(--space-xs);
}

.cat-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  flex-shrink: 0;
}

.cat-tab:hover {
  background: var(--bg-surface-raised);
}

.cat-tab.active {
  border-color: var(--color-accent);
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

.cat-label {
  font-size: var(--font-size-xs);
}

/* Course list */
.course-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.course-card {
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.course-card:hover:not(.locked):not(.completed) {
  background: var(--bg-surface-raised);
  transform: translateX(2px);
}

.course-card.completed {
  opacity: 0.6;
  cursor: default;
  border-left: 3px solid var(--color-success);
}

.course-card.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.course-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.course-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.course-info {
  flex: 1;
  min-width: 0;
}

.course-info strong {
  font-size: var(--font-size-sm);
  display: block;
}

.course-desc {
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.completed-badge {
  font-size: var(--font-size-lg);
  color: var(--color-success);
  font-weight: var(--font-weight-bold);
}

.course-meta {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.badge-muted {
  background: var(--bg-surface-raised);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
}

/* Activity in progress */
.activity-card {
  border-left: 3px solid var(--color-accent);
}

.activity-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.activity-icon {
  font-size: 24px;
}

.activity-progress-track {
  height: 6px;
  background: var(--bg-base);
  border-radius: var(--border-radius-full);
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.activity-progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--border-radius-full);
  transition: width 0.5s linear;
}

.activity-time {
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.busy-card {
  text-align: center;
  opacity: 0.7;
}
</style>
