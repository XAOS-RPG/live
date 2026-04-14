<template>
  <div class="daily-page">

    <!-- Header -->
    <div class="top-status-bar card">
      <div class="balance-info">
        <span>💰</span>
        <span class="text-mono text-success">{{ player.cash.toLocaleString('el-GR') }}</span>
      </div>
      <div class="streak-info-top">
        <span class="streak-title text-muted">Σερί</span>
        <div class="streak-badge">
          <span class="streak-num text-accent text-mono">{{ dailyStore.currentStreak }}</span>
          <span class="streak-unit">ΜΕΡΕΣ</span>
        </div>
      </div>
    </div>

    <!-- Already claimed -->
    <div v-if="!dailyStore.canClaim && phase === 'idle'" class="card text-center claimed-msg">
      ✅ Πήρες το κουτί σου σήμερα! Έλα πάλι αύριο.
    </div>

    <!-- ── Crate UI ── -->
    <div class="crate-area card" v-if="dailyStore.canClaim || phase !== 'idle'">

      <!-- IDLE: crate waiting to be opened -->
      <div v-if="phase === 'idle'" class="crate-idle" @click="openCrate">
        <div class="crate-box" :class="{ 'crate-shake': shaking }">📦</div>
        <p class="crate-label">Κουτί του Δρόμου</p>
        <p class="text-muted crate-sub">Πάτα για να ανοίξεις!</p>
        <div class="tier-odds">
          <span v-for="(t, key) in CRATE_TIERS" :key="key" class="tier-pill" :style="{ borderColor: t.color, color: t.color }">
            {{ t.label }} {{ Math.round(t.chance * 100) }}%
          </span>
        </div>
      </div>

      <!-- OPENING: spinning animation -->
      <div v-else-if="phase === 'opening'" class="crate-opening">
        <div class="spin-box">📦</div>
        <p class="text-muted">Ανοίγει...</p>
      </div>

      <!-- REVEAL: show the item -->
      <div v-else-if="phase === 'reveal' && result" class="crate-reveal" :class="`tier-${result.tier}`">
        <div class="reveal-glow" :style="{ '--glow': CRATE_TIERS[result.tier].color }"></div>
        <div class="reveal-tier-badge" :style="{ background: CRATE_TIERS[result.tier].color }">
          {{ CRATE_TIERS[result.tier].label.toUpperCase() }}
        </div>
        <div class="reveal-icon">{{ result.icon }}</div>
        <div class="reveal-name">{{ result.name }}</div>
        <div class="reveal-extras">
          <span class="text-success">+€{{ result.cash.toLocaleString('el-GR') }}</span>
          <span class="text-muted"> · Σερί {{ result.streak + 1 }} μέρες</span>
        </div>
        <button class="btn btn-primary mt-sm" @click="phase = 'idle'">Κλείσιμο</button>
      </div>

    </div>

    <!-- Streak bonus info -->
    <div class="card streak-bonus-info">
      <p class="text-muted" style="font-size:var(--font-size-xs); margin:0;">
        💡 Bonus μετρητά ανά σερί: +€50 ανά μέρα (έως +€1.500 στις 30 μέρες)
      </p>
    </div>

    <!-- Recovery modal (missed days) -->
    <Transition name="fade">
      <div v-if="showRecoveryModal" class="overlay">
        <div class="modal-card card">
          <h3 class="text-warning">⚠️ Έχασες {{ simulatedMissedDays }} {{ simulatedMissedDays === 1 ? 'μέρα' : 'μέρες' }}!</h3>
          <template v-if="simulatedMissedDays <= 2">
            <p class="text-muted text-center">Το σερί σου θα μηδενιστεί. Θέλεις να δεις μια διαφήμιση για να το σώσεις;</p>
            <div class="modal-actions">
              <button class="btn btn-primary btn-full" @click="startAd">📺 Δες Διαφήμιση</button>
              <button class="btn btn-outline btn-full" @click="resetStreak">🔄 Ξεκίνα από Αρχή</button>
            </div>
          </template>
          <template v-else>
            <p class="text-muted text-center">Έλειπες πολύ καιρό. Το σερί χάθηκε!</p>
            <div class="modal-actions">
              <button class="btn btn-outline btn-full" @click="resetStreak">ΟΚ 😢</button>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <!-- Fake ad overlay -->
    <Transition name="fade">
      <div v-if="isWatchingAd" class="ad-overlay">
        <div class="ad-timer">
          <span v-if="adCountdown > 0">Ανταμοιβή σε {{ adCountdown }}...</span>
          <button v-else class="close-ad-btn" @click="finishAd">❌</button>
        </div>
        <div class="ad-content">
          <div class="ad-sponsor">ΧΟΡΗΓΟΥΜΕΝΟ</div>
          <div class="ad-icon">{{ currentAd.icon }}</div>
          <h2 class="ad-title">{{ currentAd.title }}</h2>
          <p class="ad-text">{{ currentAd.text }}</p>
          <div class="ad-progress-bar">
            <div class="ad-progress-fill" :style="{ width: (adCountdown / 5) * 100 + '%' }"></div>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useDailyRewardStore, CRATE_TIERS } from '../stores/dailyRewardStore'
import { useGameStore } from '../stores/gameStore'
import { FAKE_ADS } from '../data/fakeAds'

const player = usePlayerStore()
const dailyStore = useDailyRewardStore()
const gameStore = useGameStore()

// ── Crate state ──────────────────────────────────────────────────────────────
const phase = ref('idle')   // 'idle' | 'opening' | 'reveal'
const result = ref(null)
const shaking = ref(false)

function openCrate() {
  if (!dailyStore.canClaim) return
  if (simulatedMissedDays.value > 0) { showRecoveryModal.value = true; return }

  // Shake the box first
  shaking.value = true
  setTimeout(() => { shaking.value = false }, 400)

  phase.value = 'opening'
  setTimeout(() => {
    const reward = dailyStore.claimReward()
    if (reward) {
      result.value = reward
      phase.value = 'reveal'
    } else {
      phase.value = 'idle'
    }
  }, 1200)
}

// ── Recovery / missed days ───────────────────────────────────────────────────
const simulatedMissedDays = ref(0)
const showRecoveryModal = ref(false)

function resetStreak() {
  showRecoveryModal.value = false
  simulatedMissedDays.value = 0
  dailyStore.currentStreak = 0
  gameStore.addNotification('Το σερί μηδενίστηκε. Ξεκινάς από την Ημέρα 1.', 'warning')
  gameStore.saveGame()
}

// ── Fake ad ──────────────────────────────────────────────────────────────────
const isWatchingAd = ref(false)
const adCountdown = ref(5)
const currentAd = ref(FAKE_ADS[0])
let adTimer = null

function startAd() {
  showRecoveryModal.value = false
  currentAd.value = FAKE_ADS[Math.floor(Math.random() * FAKE_ADS.length)]
  isWatchingAd.value = true
  adCountdown.value = 5
  adTimer = setInterval(() => {
    adCountdown.value--
    if (adCountdown.value <= 0) { clearInterval(adTimer); adTimer = null }
  }, 1000)
}

function finishAd() {
  clearInterval(adTimer); adTimer = null
  isWatchingAd.value = false
  simulatedMissedDays.value = 0
  gameStore.addNotification('📺 Σερί σώθηκε! Άνοιξε το κουτί σου.', 'success')
}

onUnmounted(() => { if (adTimer) clearInterval(adTimer) })
</script>

<style scoped>
.daily-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* ── Header ── */
.top-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.balance-info {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: rgba(0,0,0,0.3);
  padding: 6px 12px;
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-lg);
  font-weight: bold;
}
.streak-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
.streak-badge { display: flex; align-items: baseline; gap: 4px; }
.streak-num { font-size: var(--font-size-3xl); font-weight: 900; line-height: 1; }
.streak-unit { font-size: 10px; color: var(--text-secondary); }

.claimed-msg {
  padding: var(--space-md);
  font-size: var(--font-size-sm);
  background: rgba(46, 204, 113, 0.12);
  border: 1px solid rgba(46, 204, 113, 0.4);
}

/* ── Crate area ── */
.crate-area {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* IDLE */
.crate-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  user-select: none;
}
.crate-box {
  font-size: 96px;
  line-height: 1;
  transition: transform 0.1s;
  filter: drop-shadow(0 0 18px rgba(243,156,18,0.5));
}
.crate-box:hover { transform: scale(1.06); }
.crate-shake { animation: shake 0.4s ease; }
@keyframes shake {
  0%,100% { transform: translateX(0) rotate(0deg); }
  20%      { transform: translateX(-8px) rotate(-4deg); }
  40%      { transform: translateX(8px) rotate(4deg); }
  60%      { transform: translateX(-6px) rotate(-2deg); }
  80%      { transform: translateX(6px) rotate(2deg); }
}
.crate-label { font-size: var(--font-size-xl); font-weight: bold; margin: 0; }
.crate-sub { margin: 0; font-size: var(--font-size-sm); }
.tier-odds {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: var(--space-xs);
}
.tier-pill {
  border: 1px solid;
  border-radius: var(--border-radius-full);
  padding: 2px 10px;
  font-size: var(--font-size-xs);
  font-weight: bold;
}

/* OPENING */
.crate-opening {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}
.spin-box {
  font-size: 96px;
  animation: spin-open 1.2s ease-in-out forwards;
}
@keyframes spin-open {
  0%   { transform: scale(1) rotate(0deg);   opacity: 1; }
  50%  { transform: scale(1.3) rotate(180deg); opacity: 0.8; }
  100% { transform: scale(0) rotate(360deg); opacity: 0; }
}

/* REVEAL */
.crate-reveal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  position: relative;
  padding: var(--space-lg);
  text-align: center;
  animation: reveal-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
@keyframes reveal-pop {
  0%   { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}
.reveal-glow {
  position: absolute;
  inset: 0;
  border-radius: var(--border-radius-lg);
  background: radial-gradient(ellipse at center, color-mix(in srgb, var(--glow) 20%, transparent) 0%, transparent 70%);
  pointer-events: none;
}
.reveal-tier-badge {
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: bold;
  letter-spacing: 2px;
  padding: 3px 12px;
  border-radius: var(--border-radius-full);
}
.reveal-icon {
  font-size: 80px;
  line-height: 1;
  filter: drop-shadow(0 0 12px var(--glow, gold));
}
.reveal-name {
  font-size: var(--font-size-xl);
  font-weight: bold;
}
.reveal-extras {
  font-size: var(--font-size-sm);
}

/* Tier glow colours */
.tier-legendary .reveal-icon { filter: drop-shadow(0 0 20px #f39c12); }
.tier-rare      .reveal-icon { filter: drop-shadow(0 0 16px #3498db); }
.tier-common    .reveal-icon { filter: drop-shadow(0 0 8px  #95a5a6); }

.streak-bonus-info { padding: var(--space-sm) var(--space-md); }

/* ── Overlays ── */
.overlay, .ad-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(4px);
}
.modal-card {
  width: 90%;
  max-width: 400px;
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  text-align: center;
}
.modal-actions { display: flex; flex-direction: column; gap: var(--space-sm); }
.btn-full { width: 100%; justify-content: center; }

.ad-overlay { flex-direction: column; padding: 30px; background: #000; }
.ad-timer { position: absolute; top: 30px; right: 30px; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 20px; font-size: 14px; }
.close-ad-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
.ad-content { text-align: center; max-width: 320px; display: flex; flex-direction: column; align-items: center; gap: 15px; }
.ad-sponsor { font-size: 10px; color: #666; letter-spacing: 2px; }
.ad-icon { font-size: 80px; }
.ad-title { color: #f1c40f; margin: 0; font-size: var(--font-size-xl); }
.ad-text { color: #ccc; font-size: 15px; line-height: 1.6; }
.ad-progress-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.ad-progress-fill { height: 100%; background: var(--color-accent); transition: width 0.1s linear; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
