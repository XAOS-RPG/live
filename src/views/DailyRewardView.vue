<template>
  <div class="daily-page">
    <div class="top-status-bar card">
      <div class="balance-info">
        <span class="currency-icon">💰</span>
        <span class="balance-val text-mono text-success">{{ player.cash.toLocaleString('el-GR') }}</span>
      </div>
      <div class="streak-info-top">
        <span class="streak-title text-muted">Τρέχον Σερί</span>
        <div class="streak-badge">
          <span class="streak-num text-accent text-mono">{{ dailyStore.currentStreak }}</span>
          <span class="streak-unit">ΜΕΡΕΣ</span>
        </div>
      </div>
    </div>

    <div v-if="!dailyStore.canClaim && simulatedMissedDays === 0" class="card text-center text-muted claimed-msg mt-3">
      ✅ Πήρες το bonus σου σήμερα! Έλα πάλι αύριο.
    </div>

    <div class="scroller-wrapper mt-3">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }" />
      </div>

      <div class="reward-scroller" ref="scrollerRef" @scroll="handleManualScroll">
        <div
          v-for="(reward, index) in generatedRewards"
          :key="index"
          class="reward-day-item"
          :ref="el => setCardRef(el, index)"
          :class="{
            'is-today': index === currentDayIndex && dailyStore.canClaim,
            'is-claimed': index < currentDayIndex || (index === currentDayIndex && !dailyStore.canClaim),
            'is-future': index > currentDayIndex,
            'is-milestone': (index + 1) % 7 === 0 // Κάθε 7 μέρες
          }"
          @click="handleCardClick(index)"
        >
          <div class="card reward-card-ali">
            <div class="reward-header">
              <span class="day-num">ΗΜΕΡΑ {{ index + 1 }}</span>
              <span v-if="index < currentDayIndex || (index === currentDayIndex && !dailyStore.canClaim)" class="check-icon">✓</span>
            </div>

            <div class="reward-main">
              <span class="reward-icon">{{ getIcon(index) }}</span>
              <div class="reward-text">
                <span class="reward-primary">{{ reward.primary }}</span>
                <span v-if="reward.secondary" class="reward-secondary text-muted">{{ reward.secondary }}</span>
              </div>
            </div>

            <div v-if="index === currentDayIndex && dailyStore.canClaim" class="claim-overlay">
              <span>ΠΑΤΑ</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCoinAnimation" class="coin-animation-overlay">
      <div class="coin c1">💰</div>
      <div class="coin c2">💶</div>
      <div class="coin c3">💰</div>
      <div class="coin c4">💎</div>
      <div class="coin c5">💰</div>
    </div>

    <Transition name="fade">
      <div v-if="showRecoveryModal" class="overlay">
        <div class="modal-card card">
          <h3 class="text-warning">⚠️ Έχασες {{ simulatedMissedDays }} {{ simulatedMissedDays === 1 ? 'μέρα' : 'μέρες' }}!</h3>
          
          <template v-if="simulatedMissedDays <= 2">
            <p class="text-muted text-center">Το σερί σου θα μηδενιστεί. Θέλεις να δεις μια διαφήμιση για να σώσεις το σερί σου και να πάρεις τα χαμένα δώρα;</p>
            <div class="modal-actions">
              <button class="btn btn-primary btn-full" @click="startAd">📺 Δες Διαφήμιση για Σωτηρία</button>
              <button class="btn btn-secondary btn-full" @click="resetStreak">🔄 Ξεκίνα από την Αρχή</button>
            </div>
          </template>
          
          <template v-else>
            <p class="text-muted text-center">Έλειπες για πάρα πολύ καιρό. Το σερί σου δυστυχώς χάθηκε!</p>
            <div class="modal-actions">
              <button class="btn btn-secondary btn-full" @click="resetStreak">ΟΚ 😢</button>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="isWatchingAd" class="ad-overlay">
        <div class="ad-timer">
          <span v-if="adCountdown > 0">Ανταμοιβή σε {{ adCountdown }}...</span>
          <button v-else class="close-ad-btn" @click="finishAd">❌</button>
        </div>
        
        <div class="ad-content ad-enter-active">
          <div class="ad-sponsor">ΧΟΡΗΓΟΥΜΕΝΟ</div>
          <div class="ad-icon">{{ currentAd.icon }}</div>
          <h2 class="ad-title">{{ currentAd.title }}</h2>
          <p class="ad-text">{{ currentAd.text }}</p>
          <div class="ad-progress-bar"><div class="ad-progress-fill" :style="{ width: (adCountdown/5)*100 + '%' }"></div></div>
        </div>
      </div>
    </Transition>

    <div class="dev-panel card mt-4" style="border:1px dashed red; opacity: 0.7;">
      <small class="text-muted">🛠️ DEV PANEL (Για τεστ missed days):</small><br>
      <button class="btn btn-sm" @click="simulatedMissedDays = 1; showRecoveryModal = true">Test 1 Missed</button>
      <button class="btn btn-sm" @click="simulatedMissedDays = 3; showRecoveryModal = true">Test 3 Missed</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useDailyRewardStore } from '../stores/dailyRewardStore'
import { useGameStore } from '../stores/gameStore'
import { FAKE_ADS } from '../data/fakeAds'

const player = usePlayerStore()
const dailyStore = useDailyRewardStore()
const gameStore = useGameStore()

// --- Scroller Refs για Auto-focus ---
const scrollerRef = ref(null)
const cardRefs = ref({})
function setCardRef(el, index) { if (el) cardRefs.value[index] = el; }

// Το index της σημερινής μέρας (0-99)
const currentDayIndex = computed(() => dailyStore.currentStreak)

// % Προόδου για τη γραμμή πίσω από τις κάρτες
const progressPercentage = computed(() => (dailyStore.currentStreak / 100) * 100)

// --- Δημιουργία 100 Ημερών Ανταμοιβών (Mock Data) ---
// Επειδή δεν έχουμε αρχείο για 100 μέρες, τις παράγουμε δυναμικά με λογική
const generatedRewards = computed(() => {
  const rewards = [];
  for (let i = 1; i <= 100; i++) {
    let primary = '';
    let secondary = '';
    
    // Milestones (Κάθε 7 μέρες) - Super Box
    if (i % 7 === 0) {
      primary = `€${(i * 1000).toLocaleString('el-GR')}`;
      secondary = `+${i * 2} Ενέργεια & Στατιστικά`;
    } 
    // Δεκάδες
    else if (i % 10 === 0) {
      primary = `€${(i * 500).toLocaleString('el-GR')}`;
      secondary = '+5 Stamina';
    }
    // Κανονικές μέρες - Μόνο Χρήματα
    else {
      primary = `€${(i * 100).toLocaleString('el-GR')}`;
    }

    rewards.push({ day: i, primary, secondary });
  }
  return rewards;
});

function getIcon(index) {
  const day = index + 1;
  if (day === 100) return '🏆'; // Grand Prize
  if (day % 7 === 0) return '🎁'; // Super Box
  if (day % 10 === 0) return '💼'; // Stat Box
  return '💰'; // Normal coin
}

// --- Auto-Focus (Smooth Scroll) στο Mounted ---
onMounted(async () => {
  await nextTick(); // Περιμένουμε να γίνει render το DOM
  focusOnToday(false); // Άμεσο focus χωρίς smooth scroll στο πρώτο load
});

onUnmounted(() => {
  if (adTimer) {
    clearInterval(adTimer);
    adTimer = null;
  }
});

function focusOnToday(smooth = true) {
  const scroller = scrollerRef.value;
  const todayCard = cardRefs.value[currentDayIndex.value];
  
  if (scroller && todayCard) {
    // Υπολογισμός θέσης για κεντράρισμα
    const scrollerWidth = scroller.offsetWidth;
    const cardWidth = todayCard.offsetWidth;
    const cardOffset = todayCard.offsetLeft;
    
    const targetScroll = cardOffset - (scrollerWidth / 2) + (cardWidth / 2);
    
    scroller.scrollTo({
      left: targetScroll,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
}

let userIsScrolling = false;
let scrollTimer = null;
function handleManualScroll() {
  userIsScrolling = true;
  clearTimeout(scrollTimer);
  // Αν σταματήσει να σκρολάρει για 5 δευτερόλεπτα, θεωρούμε ότι είναι idle
  scrollTimer = setTimeout(() => { userIsScrolling = false; }, 5000);
}

// --- Λογική Χαμένων Ημερών (Recovery Logic) ---
const simulatedMissedDays = ref(0); 
const showRecoveryModal = ref(false);

const showCoinAnimation = ref(false); // Για το claim effect

function handleCardClick(index) {
  // Επιτρέπεται κλικ ΜΟΝΟ στην τρέχουσα διαθέσιμη μέρα
  if (index !== currentDayIndex.value || !dailyStore.canClaim) return;

  // Έλεγχος αν υπάρχουν χαμένες μέρες (αντικατέστησέ το με έλεγχο από το store αργότερα)
  if (simulatedMissedDays.value > 0) {
    showRecoveryModal.value = true
    return
  }

  // Κανονικό Claim
  processClaim();
}

function processClaim() {
  const reward = dailyStore.claimReward(); // Εδώ καλείται το store (πρέπει να δίνει χρήματα)
  if (reward) {
    // Ενεργοποίηση animation
    showCoinAnimation.value = true;
    
    gameStore.addNotification(`Πήρες την ανταμοιβή της Ημέρας ${dailyStore.streakDay}!`, 'success');
    gameStore.saveGame();
    
    // Απενεργοποίηση animation μετά από 1.5 δευτερόλεπτο
    setTimeout(() => { showCoinAnimation.value = false; }, 1500);
  }
}

function resetStreak() {
  showRecoveryModal.value = false;
  simulatedMissedDays.value = 0;
  dailyStore.currentStreak = 0; // Προσοχή: Καλύτερα να υπάρχει action στο store γι'αυτό
  dailyStore.canClaim = true; 
  gameStore.addNotification('Το σερί σου μηδενίστηκε. Ξεκινάς από την Ημέρα 1.', 'warning');
  gameStore.saveGame();
  
  // Κάνουμε focus στην Ημέρα 1
  nextTick(() => focusOnToday(true));
}

// --- Fake Advertisement System (Από προηγούμενο) ---
const isWatchingAd = ref(false);
const adCountdown = ref(5);
let adTimer = null;

const currentAd = ref(FAKE_ADS[0]);

function startAd() {
  showRecoveryModal.value = false;
  if (adTimer) {
    clearInterval(adTimer);
    adTimer = null;
  }
  currentAd.value = FAKE_ADS[Math.floor(Math.random() * FAKE_ADS.length)];
  isWatchingAd.value = true;
  adCountdown.value = 5;

  adTimer = setInterval(() => {
    adCountdown.value--;
    if (adCountdown.value <= 0) {
      clearInterval(adTimer);
      adTimer = null;
    }
  }, 1000);
}

function finishAd() {
  if (adTimer) {
    clearInterval(adTimer);
    adTimer = null;
  }
  isWatchingAd.value = false;
  simulatedMissedDays.value = 0; // Τον "συγχωρούμε"
  gameStore.addNotification('📺 Το σερί σου σώθηκε! Πατά πάνω στη μέρα για να πάρεις τα δώρα.', 'success');
  gameStore.saveGame();
}
</script>

<style scoped>
.daily-page {
  display: flex;
  flex-direction: column;
  padding-bottom: var(--space-xl);
  overflow: hidden; /* Για να μην έχει scroll όλη η σελίδα */
}

.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }

/* ── Header Στατιστικών ── */
.top-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
}

.balance-info {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: rgba(0,0,0,0.3);
  padding: 6px 12px;
  border-radius: var(--border-radius-full);
}
.currency-icon { font-size: var(--font-size-lg); }
.balance-val { font-size: var(--font-size-lg); font-weight: bold; }

.streak-info-top {
  text-align: right;
}
.streak-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
.streak-badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.streak-num { font-size: var(--font-size-3xl); font-weight: 900; line-height: 1; }
.streak-unit { font-size: 10px; color: var(--text-secondary); }

.claimed-msg {
  padding: var(--space-md);
  font-size: var(--font-size-sm);
  background: rgba(46, 204, 113, 0.12);
  border: 1px solid rgba(46, 204, 113, 0.4);
}

/* ── Scroller Wrapper & Progress Track ── */
.scroller-wrapper {
  position: relative;
  padding: 10px 0;
}

/* Γραμμή προόδου πίσω από τις κάρτες */
.progress-track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 6px;
  background: rgba(255,255,255,0.05);
  transform: translateY(-50%);
  z-index: 1;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success) 0%, var(--color-accent) 100%);
  border-radius: var(--border-radius-full);
  transition: width 0.5s ease-out;
}

/* ── Οριζόντιος "Μαγνητικός" Scroller ── */
.reward-scroller {
  display: flex;
  overflow-x: auto; /* Επιτρέπουμε το οριζόντιο σκρολ */
  scroll-behavior: smooth; /* Για JS smooth scroll */
  
  /* CSS Scroll Snapping - Μαγνητικό εφέ */
  scroll-snap-type: x mandatory; 
  -webkit-overflow-scrolling: touch; /* Ομαλό σκρολ σε iOS */
  
  gap: var(--space-md);
  padding: 20px 50%; /* Padding στις άκρες για να κεντράρονται η πρώτη και η τελευταία μέρα */
  z-index: 2;
  position: relative;
}

/* Απόκρυψη scrollbar */
.reward-scroller::-webkit-scrollbar { display: none; }
.reward-scroller { -ms-overflow-style: none; scrollbar-width: none; }

/* ── Item & Κάρτα (Compact style) ── */
.reward-day-item {
  flex: 0 0 130px; /* Σταθερό πλάτος για κάθε μέρα */
  width: 130px;
  scroll-snap-align: center; /* Κουμπώνει στο κέντρο της οθόνης */
  transition: transform 0.2s;
}

.reward-card-ali {
  height: 150px;
  display: flex;
  flex-direction: column;
  padding: var(--space-sm);
  border: 2px solid transparent;
  background: var(--bg-surface-raised);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Ειδικό στιλ για Milestones (Gift) */
.is-milestone .reward-card-ali {
  background: linear-gradient(180deg, rgba(230, 126, 34, 0.15) 0%, rgba(241, 196, 15, 0.05) 100%);
  border-color: rgba(241, 196, 15, 0.3);
}

/* Σήμερα (Έτοιμο για Claim) - Πάλσαρε με highlight */
.is-today {
  transform: scale(1.05);
}
.is-today .reward-card-ali {
  cursor: pointer;
  border-color: var(--color-accent);
  box-shadow: 0 0 20px rgba(79, 195, 247, 0.5);
  animation: pulse-border-ali 2s infinite;
}

/* Πάρθηκε - Grayscale */
.is-claimed .reward-card-ali {
  opacity: 0.5;
  filter: grayscale(100%);
}

/* Μελλοντικό */
.is-future .reward-card-ali {
  opacity: 0.7;
}

/* ── Περιεχόμενο Κάρτας ── */
.reward-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
}
.day-num {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: bold;
  letter-spacing: 0.5px;
}
.check-icon {
  color: var(--color-success);
  font-weight: bold;
}

.reward-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
}
.reward-icon { font-size: 40px; line-height: 1; }
.reward-primary {
  display: block;
  font-size: var(--font-size-md);
  font-weight: bold;
  color: var(--color-warning);
}
.reward-secondary {
  font-size: 9px;
  line-height: 1.2;
}

/* Overlay "ΠΑΤΑ" στην σημερινή κάρτα */
.claim-overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: var(--color-accent);
  color: white;
  text-align: center;
  font-size: 11px;
  font-weight: bold;
  padding: 4px;
}

@keyframes pulse-border-ali {
  0% { border-color: rgba(79, 195, 247, 0.6); box-shadow: 0 0 10px rgba(79, 195, 247, 0.3); }
  50% { border-color: rgba(79, 195, 247, 1); box-shadow: 0 0 25px rgba(79, 195, 247, 0.6); }
  100% { border-color: rgba(79, 195, 247, 0.6); box-shadow: 0 0 10px rgba(79, 195, 247, 0.3); }
}

/* ── Εφέ Νομισμάτων (Claim Animation) ── */
.coin-animation-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 2000;
  pointer-events: none; /* Δεν εμποδίζει τα κλικ */
}
.coin {
  position: absolute;
  font-size: 24px;
  opacity: 0;
  animation: fly-coin 1.5s ease-out forwards;
}

/* Διαφορετικές θέσεις εκκίνησης */
.c1 { left: 40%; bottom: 40%; animation-delay: 0s; }
.c2 { left: 50%; bottom: 35%; animation-delay: 0.1s; }
.c3 { left: 60%; bottom: 40%; animation-delay: 0.2s; }
.c4 { left: 45%; bottom: 45%; animation-delay: 0.3s; }
.c5 { left: 55%; bottom: 42%; animation-delay: 0.4s; }

@keyframes fly-coin {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
}

/* ── Overlays & Modals (Από προηγούμενο) ── */
.overlay, .ad-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(5px);
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
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}
.btn-full { width: 100%; justify-content: center; }

/* ── Ad Styling (Πιο refined) ── */
.ad-overlay {
  background: #000;
  flex-direction: column;
  padding: 30px;
}
.ad-timer {
  position: absolute;
  top: 30px;
  right: 30px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
}
.close-ad-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }

.ad-content {
  text-align: center;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}
.ad-sponsor { font-size: 10px; color: #666; letter-spacing: 2px; }
.ad-icon { font-size: 80px; }
.ad-title { color: #f1c40f; margin: 0; font-size: var(--font-size-xl); }
.ad-text { color: #ccc; font-size: 15px; line-height: 1.6; }

.ad-progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}
.ad-progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.1s linear;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
