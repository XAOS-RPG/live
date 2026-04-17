<template>
  <div class="app-layout">
    <StatusBar v-if="gameStore.initialized" />
    <aside class="sidebar" v-if="gameStore.initialized">
      <NavBar :vertical="true" />
    </aside>
    <main class="main-content" :class="{ 'no-bars': !gameStore.initialized }">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <nav class="bottom-nav" v-if="gameStore.initialized">
      <NavBar :vertical="false" />
    </nav>
    <ToastNotification />

    <!-- Specialization choice modal (shows at level 3) -->
    <SpecializationModal v-if="classStore.showChoiceModal" />

    <!-- Random Encounter popup -->
    <RandomEncounter />

    <!-- Level-up popup -->
    <Transition name="levelup">
      <div v-if="levelUpData" class="levelup-overlay" @click="levelUpData = null">
        <div class="levelup-modal" @click.stop>
          <div class="levelup-burst">✨</div>
          <div class="levelup-title">LEVEL UP!</div>
          <div class="levelup-level">Επίπεδο {{ levelUpData.level }}</div>
          <div class="levelup-rank">{{ levelUpData.rank }}</div>
          <div class="levelup-perks">
            <div class="levelup-perk">❤️ +5 μέγ. HP</div>
            <div class="levelup-perk">⭐ +1 Ability Point</div>
            <div v-if="levelUpData.specUnlock" class="levelup-perk levelup-special">🎯 Ξεκλειδώθηκε Ειδικότητα!</div>
            <div v-if="levelUpData.eliteUnlock" class="levelup-perk levelup-special">👑 Elite Ascension ξεκλειδώθηκε!</div>
          </div>
          <button class="btn btn-primary" @click="levelUpData = null">Συνέχεια 🚀</button>
        </div>
      </div>
    </Transition>

    <!-- Global travel dice: shows on any page when a travel result is pending -->
    <DiceRoll
      :visible="travelDiceVisible"
      :result="travelDiceResult"
      @dismiss="onTravelDiceDismiss"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from './stores/gameStore'
import { usePlayerStore } from './stores/playerStore'
import { useTravelStore } from './stores/travelStore'
import { useClassStore } from './stores/classStore'
import StatusBar from './components/layout/StatusBar.vue'
import NavBar from './components/layout/NavBar.vue'
import ToastNotification from './components/ui/ToastNotification.vue'
import DiceRoll from './components/ui/DiceRoll.vue'
import SpecializationModal from './components/SpecializationModal.vue'
import RandomEncounter from './components/RandomEncounter.vue'

const gameStore = useGameStore()
const player = usePlayerStore()
const travelStore = useTravelStore()
const classStore = useClassStore()
const router = useRouter()

// ── Level-up popup ────────────────────────────────────────────────────────
const levelUpData = ref(null)
let lastLevel = player.level

watch(() => player.level, (newLevel) => {
  if (newLevel > lastLevel) {
    levelUpData.value = {
      level: newLevel,
      rank: player.rankTitle,
      specUnlock: newLevel === 3,
      eliteUnlock: newLevel === 30,
    }
  }
  lastLevel = newLevel
})

// ── Travel dice (global) ──────────────────────────────────────────────────
// Travel pending results must be resolved before anything else can happen.
// By watching here (App.vue), the dice shows on any page — it can never get stuck.
const travelDiceVisible = ref(false)
const travelDiceResult = ref(null)

watch(() => player.pendingResult, (result) => {
  if (!result || result.type !== 'travel') {
    travelDiceVisible.value = false
    return
  }
  travelDiceResult.value = {
    type: 'travel',
    mode: 'check',
    label: result.label || 'Ταξίδι',
    icon: result.mode === 'plane' ? '✈️' : '🚆',
    roll: result.roll,
    targetRoll: 2,
    success: result.success,
    consequence: result.consequence,
    destinationId: result.destinationId,
    travelMode: result.mode,
  }
  travelDiceVisible.value = true
}, { immediate: true })

function onTravelDiceDismiss() {
  const result = travelDiceResult.value
  travelDiceVisible.value = false
  travelDiceResult.value = null
  player.clearPendingResult()

  if (!result) return

  if (result.success) {
    travelStore.arriveAtDestination(result.destinationId)
  } else {
    travelStore.handleTravelFailure(result.travelMode)
    setTimeout(() => router.push('/hospital'), 600)
  }
  gameStore.saveGame()
}

// ── Game init ─────────────────────────────────────────────────────────────
// Auth + cloud load is handled by the router guard (beforeEach) via authStore.loadPlayerProfile().
// Nothing to do here for authenticated users.
onMounted(() => {
  // No-op: cloud-only system is initialized by router/authStore
})

watch(() => gameStore.initialized, (val) => {
  if (val) {
    gameStore.startGameLoop()
  } else {
    router.push('/create')
  }
}, { immediate: true })
</script>

<style scoped>
.app-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-md);
  padding-bottom: calc(var(--nav-bar-height) + var(--space-md));
}

.main-content.no-bars {
  padding-bottom: var(--space-md);
}

.sidebar {
  display: none;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-bar-height);
  background: var(--bg-surface);
  border-top: 1px solid var(--border-color);
  z-index: var(--z-sticky);
}

@media (min-width: 768px) {
  .app-layout {
    display: grid;
    grid-template-columns: var(--sidebar-width) 1fr;
    grid-template-rows: auto 1fr;
  }

  .status-bar-wrapper {
    grid-column: 1 / -1;
  }

  .sidebar {
    display: flex;
    grid-row: 2;
    grid-column: 1;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
  }

  .main-content {
    grid-row: 2;
    grid-column: 2;
    padding-bottom: var(--space-md);
    padding: var(--space-lg) var(--space-xl);
  }

  .bottom-nav {
    display: none;
  }
}

/* ===== LEVEL-UP POPUP ===== */
.levelup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.levelup-modal {
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border: 2px solid #f1c40f;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  text-align: center;
  max-width: 320px;
  width: 90%;
  box-shadow: 0 0 40px rgba(241,196,15,0.35), 0 0 80px rgba(241,196,15,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.levelup-burst {
  font-size: 3rem;
  animation: burstSpin 0.8s ease;
}
@keyframes burstSpin {
  0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
  60%  { transform: scale(1.3) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); }
}

.levelup-title {
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  background: linear-gradient(90deg, #f1c40f, #e67e22, #f1c40f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 2s linear infinite;
  background-size: 200%;
}
@keyframes shimmer {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.levelup-level {
  font-size: 3.5rem;
  font-weight: 900;
  color: #f1c40f;
  line-height: 1;
  text-shadow: 0 0 20px rgba(241,196,15,0.6);
}

.levelup-rank {
  font-size: 1rem;
  color: var(--text-secondary);
  font-style: italic;
}

.levelup-perks {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  margin: 0.5rem 0;
}

.levelup-perk {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  font-size: 0.9rem;
}

.levelup-special {
  border-color: rgba(241,196,15,0.4);
  background: rgba(241,196,15,0.08);
  color: #f1c40f;
  font-weight: bold;
}

.levelup-enter-active { animation: levelupIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.levelup-leave-active { animation: levelupOut 0.25s ease forwards; }
@keyframes levelupIn  { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
@keyframes levelupOut { from { opacity: 1; } to { opacity: 0; transform: scale(0.9); } }
</style>
