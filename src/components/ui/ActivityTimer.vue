<template>
  <div class="activity-timer" v-if="player.activeActivity">
    <div class="activity-timer-main" @click="navigateToActivity">
      <div class="activity-info">
        <span class="activity-icon">{{ player.activeActivity.icon }}</span>
        <span class="activity-label">{{ player.activeActivity.label }}</span>
        <span v-if="player.activityTimeScale >= 3" class="ff-badge">x3</span>
        <span class="activity-time text-mono">{{ formatTime(player.activityTimeRemaining) }}</span>
      </div>
      <div class="activity-bar-track">
        <div
          class="activity-bar-fill"
          :class="{ 'is-fast': player.activityTimeScale >= 3 }"
          :style="{ width: (player.activityProgress * 100) + '%' }"
        />
      </div>
    </div>
    <button
      type="button"
      class="ff-btn"
      :class="{ active: player.activityTimeScale >= 3, 'is-locked': player.activityTimeScale >= 3 }"
      :disabled="player.activityTimeScale >= 3"
      title="Γρήγορη προώθηση x3 (μία φορά — μετά από χορηγούμενη διαφήμιση 5 δευτ.)"
      aria-label="Γρήγορη προώθηση χρόνου"
      @click.stop="onFastForwardClick"
    >
      >>
    </button>
  </div>

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="ffAdVisible" class="ff-ad-overlay">
        <div class="ff-ad-timer">
          <span v-if="ffAdCountdown > 0">Χορηγία: {{ ffAdCountdown }}…</span>
          <button v-else type="button" class="ff-close-ad-btn" @click="finishFastForwardAd">❌</button>
        </div>

        <div class="ff-ad-content">
          <div class="ff-ad-sponsor">ΧΟΡΗΓΟΥΜΕΝΟ</div>
          <div class="ff-ad-icon">{{ currentFfAd.icon }}</div>
          <h2 class="ff-ad-title">{{ currentFfAd.title }}</h2>
          <p class="ff-ad-text">{{ currentFfAd.text }}</p>
          <div class="ff-ad-progress-bar">
            <div class="ff-ad-progress-fill" :style="{ width: (ffAdCountdown / 5) * 100 + '%' }" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useRouter } from 'vue-router'
import { FAKE_ADS } from '../../data/fakeAds'

const player = usePlayerStore()
const router = useRouter()

const ffAdVisible = ref(false)
const ffAdCountdown = ref(5)
const currentFfAd = ref(FAKE_ADS[0])
let ffAdTimer = null

function clearFfTimer() {
  if (ffAdTimer) {
    clearInterval(ffAdTimer)
    ffAdTimer = null
  }
}

function onFastForwardClick() {
  if (!player.activeActivity || player.pendingResult) return
  if (player.activityTimeScale >= 3) return

  clearFfTimer()
  currentFfAd.value = FAKE_ADS[Math.floor(Math.random() * FAKE_ADS.length)]
  ffAdVisible.value = true
  ffAdCountdown.value = 5

  ffAdTimer = setInterval(() => {
    ffAdCountdown.value--
    if (ffAdCountdown.value <= 0) {
      clearFfTimer()
    }
  }, 1000)
}

function finishFastForwardAd() {
  clearFfTimer()
  ffAdVisible.value = false
  if (player.activeActivity && !player.pendingResult) {
    player.enableActivityFastForward()
  }
}

watch(
  () => player.activeActivity,
  (act) => {
    if (!act && ffAdVisible.value) {
      clearFfTimer()
      ffAdVisible.value = false
    }
  }
)

onUnmounted(() => {
  clearFfTimer()
})

function formatTime(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function navigateToActivity() {
  if (!player.activeActivity) return
  const type = player.activeActivity.type
  if (type === 'crime') router.push('/crimes')
  else if (type === 'gym') router.push('/gym')
  else if (type === 'travel') router.push('/travel')
  else if (type === 'education') router.push('/education')
}
</script>

<style scoped>
.activity-timer {
  display: flex;
  align-items: stretch;
  gap: var(--space-xs);
  background: var(--bg-surface-raised);
  border: 1px solid var(--color-accent);
  border-radius: var(--border-radius-md);
  padding: var(--space-xs) var(--space-xs) var(--space-xs) var(--space-sm);
}

.activity-timer-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.activity-timer-main:hover .activity-label {
  color: var(--color-accent);
}

.ff-btn {
  flex-shrink: 0;
  align-self: center;
  width: 2rem;
  min-height: 2.25rem;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--bg-base);
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.ff-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.ff-btn.active {
  background: rgba(76, 175, 80, 0.2);
  border-color: var(--color-success);
  color: var(--color-success);
}

.ff-btn.is-locked {
  cursor: default;
  opacity: 0.85;
}

.ff-badge {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 900;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--color-success);
  color: #fff;
}

.activity-info {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-xs);
  margin-bottom: 3px;
}

.activity-icon {
  flex-shrink: 0;
}

.activity-label {
  flex: 1;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-time {
  flex-shrink: 0;
  font-weight: var(--font-weight-bold);
  color: var(--color-accent);
}

.activity-bar-track {
  height: 3px;
  background: var(--bg-base);
  border-radius: var(--border-radius-full);
  overflow: hidden;
}

.activity-bar-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--border-radius-full);
  transition: width 0.3s linear;
}

.activity-bar-fill.is-fast {
  background: linear-gradient(90deg, var(--color-accent), var(--color-success));
}

/* —— Fake ad overlay (ίδιο στυλ με Daily Bonus) —— */
.ff-ad-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  z-index: 4000;
  backdrop-filter: blur(5px);
}

.ff-ad-timer {
  position: absolute;
  top: 30px;
  right: 30px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  color: #eee;
}

.ff-close-ad-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}

.ff-ad-content {
  text-align: center;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.ff-ad-sponsor {
  font-size: 10px;
  color: #666;
  letter-spacing: 2px;
}

.ff-ad-icon {
  font-size: 80px;
  line-height: 1;
}

.ff-ad-title {
  color: #f1c40f;
  margin: 0;
  font-size: var(--font-size-xl);
}

.ff-ad-text {
  color: #ccc;
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
}

.ff-ad-progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.ff-ad-progress-fill {
  height: 100%;
  background: var(--color-primary, #42a5f5);
  transition: width 0.1s linear;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
