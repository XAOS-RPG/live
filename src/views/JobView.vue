<template>
  <div class="job-page">
    <h2 class="page-title">💼 Δουλειά</h2>

    <!-- Current job -->
    <div v-if="jobStore.currentJob" class="card current-job">
      <div class="job-header">
        <span class="job-icon">{{ jobStore.currentJob.icon }}</span>
        <div>
          <strong>{{ jobStore.currentJob.name }}</strong>
          <p class="text-accent" style="font-size: var(--font-size-sm)">{{ jobStore.currentRank?.name }}</p>
        </div>
        <div class="text-right">
          <div class="text-success text-mono font-bold">€{{ jobStore.currentSalary }}</div>
          <div class="text-muted" style="font-size: var(--font-size-xs)">/ εργασία</div>
        </div>
      </div>

      <!-- Rank progress -->
      <div v-if="jobStore.nextRank" class="rank-progress mt-sm">
        <div class="flex flex-between" style="font-size: var(--font-size-xs)">
          <span class="text-muted">Επόμενη θέση: {{ jobStore.nextRank.name }}</span>
          <span class="text-mono">{{ jobStore.workStats }}/{{ jobStore.nextRank.workStatsRequired }}</span>
        </div>
        <div class="bar-track mt-xs" style="background: var(--bg-surface-raised)">
          <div class="bar-fill" :style="{
            width: (jobStore.workStats / jobStore.nextRank.workStatsRequired * 100) + '%',
            background: 'var(--color-accent)'
          }" />
        </div>
      </div>
      <div v-else class="text-success mt-sm" style="font-size: var(--font-size-sm)">
        ✓ Μέγιστη θέση!
      </div>

      <!-- Bonus info -->
      <div class="bonus-info mt-sm text-muted" style="font-size: var(--font-size-xs)">
        🎁 {{ jobStore.currentJob.passiveBonus.desc }}
      </div>

      <!-- Actions -->
      <div class="job-actions mt-md">
        <button
          class="btn btn-primary btn-block"
          :disabled="!jobStore.canWork || player.isIncapacitated"
          @click="jobStore.work()"
        >
          {{ jobStore.canWork ? '🔨 Δούλεψε' : `⏰ ${formatTime(jobStore.timeUntilWork)}` }}
        </button>
        <button class="btn btn-outline btn-sm" @click="confirmQuit">Παραίτηση</button>
      </div>
    </div>

    <!-- Job listings -->
    <div v-else>
      <p class="text-muted mb-md">Δεν έχεις δουλειά. Επίλεξε μια:</p>
      <div class="job-list">
        <div v-for="job in allJobs" :key="job.id" class="card job-card">
          <div class="job-header">
            <span class="job-icon">{{ job.icon }}</span>
            <div class="job-info">
              <strong>{{ job.name }}</strong>
              <p class="text-muted" style="font-size: var(--font-size-xs)">{{ job.description }}</p>
            </div>
          </div>
          <div class="job-details">
            <span class="badge badge-success">€{{ job.baseSalary }}/εργ.</span>
            <span class="badge badge-info">Επ. {{ job.requirements.level }}+</span>
            <span v-if="job.requirements.filotimo > 0" class="badge badge-warning">
              Φιλ. {{ job.requirements.filotimo }}+
            </span>
          </div>
          <div class="text-muted mt-xs" style="font-size: var(--font-size-xs)">
            🎁 {{ job.passiveBonus.desc }}
          </div>
          <button
            class="btn btn-primary btn-sm mt-sm"
            :disabled="!canApply(job)"
            @click="jobStore.applyForJob(job.id)"
          >
            Αίτηση
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../stores/playerStore'
import { useJobStore } from '../stores/jobStore'
import { jobs } from '../data/jobs'

const player = usePlayerStore()
const jobStore = useJobStore()
const allJobs = jobs

function canApply(job) {
  return player.level >= job.requirements.level && player.filotimo >= job.requirements.filotimo
}

function confirmQuit() {
  if (confirm('Σίγουρα θέλεις να παραιτηθείς; Θα χάσεις την πρόοδο στη θέση.')) {
    jobStore.quitJob()
  }
}

function formatTime(ms) {
  if (ms <= 0) return 'Έτοιμο!'
  const hours = Math.floor(ms / 3600000)
  const min = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `${hours}ω ${min}λ`
  return `${min}λ`
}
</script>

<style scoped>
.job-page { display: flex; flex-direction: column; gap: var(--space-md); }
.page-title { font-size: var(--font-size-2xl); }

.job-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.job-icon { font-size: 32px; flex-shrink: 0; }
.job-info { flex: 1; min-width: 0; }

.bar-track { height: 6px; border-radius: var(--border-radius-full); overflow: hidden; }
.bar-fill { height: 100%; border-radius: var(--border-radius-full); transition: width 0.5s; }

.job-actions { display: flex; flex-direction: column; gap: var(--space-sm); align-items: flex-start; }

.job-list { display: flex; flex-direction: column; gap: var(--space-sm); }

.job-card { transition: all var(--transition-fast); }

.job-details { display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-top: var(--space-xs); }
</style>
