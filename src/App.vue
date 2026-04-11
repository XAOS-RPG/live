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
import StatusBar from './components/layout/StatusBar.vue'
import NavBar from './components/layout/NavBar.vue'
import ToastNotification from './components/ui/ToastNotification.vue'
import DiceRoll from './components/ui/DiceRoll.vue'

const gameStore = useGameStore()
const player = usePlayerStore()
const travelStore = useTravelStore()
const router = useRouter()

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
onMounted(() => {
  gameStore.init()
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
</style>
