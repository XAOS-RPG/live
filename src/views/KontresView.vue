<template>
  <div class="kontres-page">
    <h2 class="page-title">🏎️ Κόντρες</h2>

    <div class="tab-bar">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <template v-if="activeTab === 'garage'">
      <div v-if="racing.ownedCars.length === 0" class="empty-state card">
        <span class="empty-icon">🚗</span>
        <p>Δεν έχεις κανένα αυτοκίνητο ακόμα.</p>
        <button class="btn btn-primary" @click="activeTab = 'dealer'">
          Πήγαινε στη Μάντρα →
        </button>
      </div>

      <div v-else class="car-grid">
        <div
          v-for="car in racing.ownedCars"
          :key="car.id"
          class="card car-card"
          :class="{ 'car-active': car.id === racing.activeCarId }"
        >
          <div class="car-header">
            <span class="car-icon">{{ car.icon }}</span>
            <div class="car-title">
              <strong>{{ car.name }}</strong>
              <span v-if="car.id === racing.activeCarId" class="badge badge-success active-badge">
                ✓ Ενεργό
              </span>
            </div>
          </div>

          <p class="car-desc text-muted">{{ car.description }}</p>

          <div class="stat-bars">
            <div v-for="(val, key) in car.stats" :key="key" class="stat-row">
              <span class="stat-label">{{ STAT_LABELS[key] }}</span>
              <div class="stat-track">
                <div
                  class="stat-fill"
                  :class="`stat-${key}`"
                  :style="{ width: effectiveStat(car.id, key) + '%' }"
                />
              </div>
              <span class="stat-val text-mono">
                {{ effectiveStat(car.id, key) }}
                <span v-if="upgradeBonus(car.id, key) > 0" class="stat-bonus">
                  (+{{ upgradeBonus(car.id, key) }})
                </span>
              </span>
            </div>
          </div>

          <button
            v-if="car.id !== racing.activeCarId"
            class="btn btn-secondary btn-full"
            @click="racing.setActiveCar(car.id)"
          >
            🔑 Ορισμός ως Ενεργό
          </button>
        </div>
      </div>
    </template>

    <template v-else-if="activeTab === 'dealer'">
      <p class="section-hint text-muted">Αγόρασε αυτοκίνητο — θα προστεθεί στο Γκαράζ σου.</p>

      <div class="dealer-list">
        <div
          v-for="car in CAR_CATALOG"
          :key="car.id"
          class="card dealer-card"
          :class="{ 'dealer-owned': racing.hasCar(car.id) }"
        >
          <div class="dealer-top">
            <span class="car-icon">{{ car.icon }}</span>
            <div class="dealer-info">
              <strong>{{ car.name }}</strong>
              <p class="car-desc text-muted">{{ car.description }}</p>
            </div>
            <div class="dealer-price">
              <span class="price-tag text-mono">€{{ car.price.toLocaleString('el-GR') }}</span>
            </div>
          </div>

          <div class="stat-bars">
            <div v-for="(val, key) in car.stats" :key="key" class="stat-row">
              <span class="stat-label">{{ STAT_LABELS[key] }}</span>
              <div class="stat-track">
                <div class="stat-fill" :class="`stat-${key}`" :style="{ width: val + '%' }" />
              </div>
              <span class="stat-val text-mono">{{ val }}</span>
            </div>
          </div>

          <div class="dealer-action">
            <span v-if="racing.hasCar(car.id)" class="badge badge-success">✓ Αγοράστηκε</span>
            <button
              v-else
              class="btn btn-primary btn-full"
              :disabled="player.cash < car.price"
              @click="handleBuyCar(car.id)"
            >
              {{ player.cash < car.price ? '💸 Λίγα χρήματα' : `🛒 Αγορά €${car.price.toLocaleString('el-GR')}` }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="activeTab === 'upgrades'">
      <div v-if="!racing.activeCar" class="empty-state card">
        <span class="empty-icon">⚙️</span>
        <p>Δεν έχεις ενεργό αυτοκίνητο.</p>
        <button class="btn btn-primary" @click="activeTab = 'dealer'">Αγόρασε αυτοκίνητο →</button>
      </div>

      <template v-else>
        <div class="card active-car-banner">
          <span class="car-icon">{{ racing.activeCar.icon }}</span>
          <div>
            <strong>{{ racing.activeCar.name }}</strong>
            <div class="text-muted" style="font-size:var(--font-size-xs)">Ενεργό αυτοκίνητο</div>
          </div>
        </div>

        <div class="card nitro-card">
          <div class="nitro-row">
            <span class="nitro-icon">💨</span>
            <div class="nitro-info">
              <strong>Nitro</strong>
              <div class="text-muted" style="font-size:var(--font-size-xs)">
                Αναλώσιμο — {{ NITRO_CONFIG.usesPerPurchase }} χρήσεις / φιάλα
              </div>
            </div>
            <div class="nitro-count">
              <span class="text-mono nitro-num">{{ racing.nitroCount }}</span>
              <span class="text-muted" style="font-size:var(--font-size-xs)">χρήσεις</span>
            </div>
          </div>
          <button
            class="btn btn-primary btn-full"
            :disabled="player.cash < NITRO_CONFIG.cost"
            @click="handleBuyNitro"
          >
            {{ player.cash < NITRO_CONFIG.cost
              ? '💸 Λίγα χρήματα'
              : `Αγορά ${NITRO_CONFIG.usesPerPurchase} χρήσεων Nitro — €${NITRO_CONFIG.cost.toLocaleString('el-GR')}`
            }}
          </button>
        </div>

        <p class="section-hint text-muted">Αναβαθμίσεις για {{ racing.activeCar.name }}:</p>

        <div class="upgrades-list">
          <div v-for="upg in UPGRADES_CATALOG" :key="upg.id" class="card upgrade-card">
            <div class="upg-header">
              <span class="upg-icon">{{ upg.icon }}</span>
              <div class="upg-title">
                <strong>{{ upg.name }}</strong>
                <span class="text-muted" style="font-size:var(--font-size-xs)">{{ upg.description }}</span>
              </div>
              <span v-if="currentUpgradeLevel(upg.id) >= upg.maxLevel" class="badge badge-warning">MAX</span>
              <span v-else class="upg-cost text-mono">€{{ nextUpgradeCost(upg).toLocaleString('el-GR') }}</span>
            </div>

            <div class="level-pips">
              <div v-for="n in upg.maxLevel" :key="n" class="pip" :class="{ 'pip-filled': n <= currentUpgradeLevel(upg.id) }" />
              <span class="level-label text-muted">Επ. {{ currentUpgradeLevel(upg.id) }}/{{ upg.maxLevel }}</span>
            </div>

            <button
              v-if="currentUpgradeLevel(upg.id) < upg.maxLevel"
              class="btn btn-secondary btn-full"
              :disabled="player.cash < nextUpgradeCost(upg)"
              @click="handleBuyUpgrade(upg.id)"
            >
              {{ player.cash < nextUpgradeCost(upg)
                ? '💸 Λίγα χρήματα'
                : `⬆️ Αναβάθμιση — €${nextUpgradeCost(upg).toLocaleString('el-GR')}`
              }}
            </button>
          </div>
        </div>
      </template>
    </template>

    <template v-else-if="activeTab === 'race'">
      <div v-if="!racing.activeCar" class="empty-state card">
        <span class="empty-icon">🏎️</span>
        <p>Πρέπει να αγοράσεις και να επιλέξεις ένα αυτοκίνητο πρώτα!</p>
        <button class="btn btn-primary" @click="activeTab = 'dealer'">Μάντρα Αυτοκινήτων →</button>
      </div>

      <div v-else-if="raceState === 'idle'" class="opponents-list">
        <div class="card active-car-banner mb-3">
          <span class="car-icon">{{ racing.activeCar.icon }}</span>
          <div>
            <strong>Έτοιμος για κόντρα!</strong>
            <div class="text-muted" style="font-size:var(--font-size-xs)">Όχημα: {{ racing.activeCar.name }}</div>
          </div>
        </div>

        <p class="section-hint text-muted">Επίλεξε αντίπαλο:</p>
        <div v-for="npc in NPCs" :key="npc.id" class="card npc-card">
          <div class="npc-info">
            <strong>{{ npc.name }}</strong>
            <span :class="'badge difficulty-' + npc.difficultyEn">{{ npc.difficulty }}</span>
          </div>
          <button class="btn btn-primary" @click="startRace(npc)">Κόντρα! 🏁</button>
        </div>
      </div>

      <div v-else class="race-arena card">
        <div class="race-header">
          <div class="racer-tag">
            <span class="dot player-dot-ui"></span> Εσύ <span class="text-mono">{{ Math.floor(playerProgress) }}%</span>
          </div>
          <div class="racer-tag">
            <span class="dot npc-dot-ui"></span> {{ currentNpc.name }} <span class="text-mono">{{ Math.floor(npcProgress) }}%</span>
          </div>
        </div>

        <div class="track-container">
          <svg viewBox="0 0 300 200" class="minimap">
            <path id="raceTrack" ref="raceTrackPath" 
                  d="M 50 50 L 250 50 A 40 40 0 0 1 290 90 L 290 110 A 40 40 0 0 1 250 150 L 50 150 A 40 40 0 0 1 10 110 L 10 90 A 40 40 0 0 1 50 50 Z" 
                  fill="none" stroke="#2c3e50" stroke-width="20" />
            
            <path d="M 50 40 L 50 60" stroke="#fff" stroke-width="2" stroke-dasharray="4" />
            
            <circle :cx="playerPos.x" :cy="playerPos.y" r="6" fill="#2ecc71" class="racer-dot" />
            <circle :cx="npcPos.x" :cy="npcPos.y" r="6" fill="#e74c3c" class="racer-dot" />
            
            <circle v-if="isNitroActive" :cx="playerPos.x" :cy="playerPos.y" r="12" fill="none" stroke="#3498db" stroke-width="2" class="nitro-pulse" />
          </svg>
        </div>

        <div class="race-controls">
          <button
            class="btn btn-nitro btn-full"
            :disabled="racing.nitroCount <= 0 || isNitroActive || raceState === 'finished'"
            @click="useNitro"
          >
             🔥 ΧΡΗΣΗ NITRO (Απομένουν: {{ racing.nitroCount }})
          </button>
        </div>

        <div v-if="raceState === 'finished'" class="race-result text-center mt-3">
          <h3 :class="raceWinner === 'player' ? 'text-success' : 'text-danger'">
            {{ raceWinner === 'player' ? '🏆 ΚΕΡΔΙΣΕΣ!' : '💀 ΕΧΑΣΕΣ!' }}
          </h3>
          <p v-if="raceWinner === 'player'" class="text-muted">Πήρες €{{ currentNpc.prize }}</p>
          <button class="btn btn-secondary mt-2" @click="raceState = 'idle'">Επιστροφή</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'
import { useRacingStore } from '../stores/racingStore'
import {
  CAR_CATALOG,
  UPGRADES_CATALOG,
  NITRO_CONFIG,
  upgradeCost,
  getUpgradeById,
} from '../data/racing'

const player = usePlayerStore()
const gameStore = useGameStore()
const racing = useRacingStore()

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'garage',   icon: '🏠', label: 'Γκαράζ'     },
  { id: 'dealer',   icon: '🏪', label: 'Μάντρα'      },
  { id: 'upgrades', icon: '⚙️', label: 'Βελτιώσεις'  },
  { id: 'race',     icon: '🏁', label: 'Κόντρα'      },
]
const activeTab = ref('garage')

function switchTab(tabId) {
  // Cancel race frame if we leave the race tab
  if (activeTab.value === 'race' && raceState.value === 'racing') {
    cancelAnimationFrame(raceFrame)
    raceState.value = 'idle'
  }
  activeTab.value = tabId
}

// ── Helpers ────────────────────────────────────────────────────────────────
const STAT_LABELS = { speed: 'Ταχύτητα', acceleration: 'Επιτάχυνση', handling: 'Χειρισμός' }

function effectiveStat(carId, statKey) {
  const car = CAR_CATALOG.find(c => c.id === carId)
  if (!car) return 0
  const upgrades = racing.carUpgrades[carId] ?? {}
  let val = car.stats[statKey] ?? 0
  for (const upg of UPGRADES_CATALOG) {
    if (upg.stat === statKey) {
      val += upg.bonusPerLevel * (upgrades[upg.id] ?? 0)
    }
  }
  return Math.min(100, val)
}

function upgradeBonus(carId, statKey) {
  const upgrades = racing.carUpgrades[carId] ?? {}
  let bonus = 0
  for (const upg of UPGRADES_CATALOG) {
    if (upg.stat === statKey) {
      bonus += upg.bonusPerLevel * (upgrades[upg.id] ?? 0)
    }
  }
  return bonus
}

function currentUpgradeLevel(upgradeId) { return racing.activeCarUpgrades[upgradeId] ?? 0 }
function nextUpgradeCost(upg) { return upgradeCost(upg, currentUpgradeLevel(upg.id)) }

function handleBuyCar(carId) {
  const result = racing.buyCar(carId)
  if (!result.ok) gameStore.addNotification(result.message, 'danger')
  else gameStore.addNotification(`🚗 Αγόρασες νέο όχημα!`, 'success')
}

function handleBuyNitro() {
  const result = racing.buyNitro()
  if (!result.ok) gameStore.addNotification(result.message, 'danger')
}

function handleBuyUpgrade(upgradeId) {
  const result = racing.buyUpgrade(upgradeId)
  if (!result.ok) gameStore.addNotification(result.message, 'danger')
  else gameStore.addNotification(`⚙️ Αναβάθμιση επιτυχής!`, 'success')
}


// ══════════════════════════════════════════════════════════════════════════
// ── ΣΥΣΤΗΜΑ ΑΓΩΝΩΝ (RACING LOGIC) ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

const raceState = ref('idle') // 'idle', 'racing', 'finished'
const currentNpc = ref(null)
const playerProgress = ref(0)
const npcProgress = ref(0)

// Οι αρχικές συντεταγμένες είναι κοντά στη γραμμή εκκίνησης
const playerPos = ref({ x: 50, y: 46 })
const npcPos = ref({ x: 50, y: 54 })

const raceWinner = ref(null)
const isNitroActive = ref(false)
const raceTrackPath = ref(null)

let raceFrame = null
let nitroTimer = null

// Λίστα με NPCs
const NPCs = [
  { id: 1, name: 'Κώστας_93', difficulty: 'Εύκολο', difficultyEn: 'easy', speed: 30, accel: 25, prize: 150 },
  { id: 2, name: 'gr_nikos', difficulty: 'Μέτριο', difficultyEn: 'medium', speed: 55, accel: 50, prize: 350 },
  { id: 3, name: 'MakisGR', difficulty: 'Δύσκολο', difficultyEn: 'hard', speed: 85, accel: 80, prize: 800 }
]

function startRace(npc) {
  currentNpc.value = npc
  playerProgress.value = 0
  npcProgress.value = 0
  raceState.value = 'racing'
  raceWinner.value = null
  isNitroActive.value = false
  
  let playerVel = 0
  let npcVel = 0
  
  // Φέρνουμε τα stats του παίκτη (κλίμακα 0.1 - 1.0 για ταχύτητα)
  const pMaxSpeed = Math.max(10, effectiveStat(racing.activeCarId, 'speed')) / 100
  const pAccel = Math.max(10, effectiveStat(racing.activeCarId, 'acceleration')) / 100
  
  // Stats του NPC
  const nMaxSpeed = npc.speed / 100
  const nAccel = npc.accel / 100
  
  let lastTime = performance.now()

  function loop(time) {
    if (raceState.value !== 'racing') return
    const dt = (time - lastTime) / 1000 // Δέλτα χρόνου σε δευτερόλεπτα
    lastTime = time

    // --- Φυσική (Απλοποιημένη) ---
    // Επιτάχυνση του παίκτη
    playerVel += pAccel * dt * 8
    if (playerVel > pMaxSpeed * 20) playerVel = pMaxSpeed * 20
    
    // Εφαρμογή Nitro
    let currentSpeed = playerVel
    if (isNitroActive.value) {
      currentSpeed *= 3.5 // 3.5x ταχύτητα όταν το νίτρο είναι ανοιχτό
    }

    // Επιτάχυνση NPC
    npcVel += nAccel * dt * 8
    if (npcVel > nMaxSpeed * 20) npcVel = nMaxSpeed * 20

    // Προσθήκη στην πρόοδο (100% είναι ο τερματισμός)
    playerProgress.value += currentSpeed * dt
    npcProgress.value += npcVel * dt

    // --- Ενημέρωση Θέσης στο SVG Minimap ---
    if (raceTrackPath.value) {
      const pathLength = raceTrackPath.value.getTotalLength()
      const pLen = Math.min((playerProgress.value / 100) * pathLength, pathLength)
      const nLen = Math.min((npcProgress.value / 100) * pathLength, pathLength)

      const pt1 = raceTrackPath.value.getPointAtLength(pLen)
      const pt2 = raceTrackPath.value.getPointAtLength(nLen)

      // Μετατοπίζουμε λίγο τις κουκκίδες ώστε να μην πέφτει η μία πάνω στην άλλη
      playerPos.value = { x: pt1.x, y: pt1.y - 4 } // Ο παίκτης στην εσωτερική λωρίδα
      npcPos.value = { x: pt2.x, y: pt2.y + 4 } // Ο NPC στην εξωτερική
    }

    // --- Έλεγχος Τερματισμού ---
    if (playerProgress.value >= 100 || npcProgress.value >= 100) {
      raceState.value = 'finished'
      playerProgress.value = Math.min(playerProgress.value, 100)
      npcProgress.value = Math.min(npcProgress.value, 100)
      
      raceWinner.value = playerProgress.value >= npcProgress.value ? 'player' : 'npc'
      
      if (raceWinner.value === 'player') {
        player.cash += currentNpc.value.prize // Δίνουμε το έπαθλο!
        gameStore.addNotification(`Κέρδισες την κόντρα και έλαβες €${currentNpc.value.prize}!`, 'success')
        gameStore.saveGame()
      } else {
        gameStore.addNotification(`Έχασες την κόντρα από τον ${currentNpc.value.name}.`, 'warning')
      }
      return
    }

    raceFrame = requestAnimationFrame(loop)
  }

  // Ξεκινάμε το animation loop
  raceFrame = requestAnimationFrame(loop)
}

function useNitro() {
  if (racing.nitroCount > 0 && !isNitroActive.value && raceState.value === 'racing') {
    racing.nitroCount--
    isNitroActive.value = true
    gameStore.saveGame() // Αποθήκευση για να μην χαθεί αν κάνει refresh
    
    // Σταματάμε το προηγούμενο timer αν υπήρχε
    clearTimeout(nitroTimer)
    
    // Το Nitro διαρκεί 3 δευτερόλεπτα
    nitroTimer = setTimeout(() => {
      isNitroActive.value = false
    }, 3000)
  }
}

// Καθαρίζουμε το animation frame αν το component καταστραφεί (αν αλλάξει σελίδα)
onUnmounted(() => {
  if (raceFrame) cancelAnimationFrame(raceFrame)
  if (nitroTimer) clearTimeout(nitroTimer)
})
</script>

<style scoped>
.kontres-page { display: flex; flex-direction: column; gap: var(--space-md); }
.page-title { font-size: var(--font-size-2xl); margin: 0; }

/* ── Tabs ── */
.tab-bar { display: flex; gap: 2px; background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: 4px; }
.tab-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-sm) var(--space-xs); background: transparent; border: none; border-radius: var(--border-radius-md); color: var(--text-secondary); font-size: var(--font-size-xs); font-family: var(--font-family); cursor: pointer; transition: background 0.2s; }
.tab-btn:hover { background: var(--bg-surface-raised); color: var(--text-primary); }
.tab-btn.active { background: var(--color-primary); color: var(--text-on-primary); }
.tab-icon { font-size: 18px; line-height: 1; }
.tab-label { font-weight: var(--font-weight-medium); white-space: nowrap; }

/* ── UI Elements ── */
.section-hint { margin: 0; font-size: var(--font-size-sm); }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-xl); text-align: center; color: var(--text-secondary); }
.empty-icon { font-size: 48px; }
.btn-full { width: 100%; justify-content: center; }
.mb-3 { margin-bottom: 1rem; }
.mt-3 { margin-top: 1rem; }
.mt-2 { margin-top: 0.5rem; }

/* ── Garage & Dealer ── */
.car-grid, .dealer-list { display: flex; flex-direction: column; gap: var(--space-md); }
.car-card { border-left: 3px solid transparent; transition: border-color 0.2s; }
.car-active { border-left-color: var(--color-success); }
.car-header, .dealer-top { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-sm); }
.car-icon { font-size: 32px; flex-shrink: 0; }
.car-title { flex: 1; display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.dealer-info { flex: 1; }
.dealer-price .price-tag { font-size: var(--font-size-lg); color: var(--color-warning); font-weight: var(--font-weight-bold); }
.car-desc { margin: 0 0 var(--space-sm); font-size: var(--font-size-xs); }
.dealer-owned { opacity: 0.65; }

/* ── Stat bars ── */
.stat-bars { display: flex; flex-direction: column; gap: 6px; margin-bottom: var(--space-sm); }
.stat-row { display: flex; align-items: center; gap: var(--space-sm); }
.stat-label { font-size: var(--font-size-xs); color: var(--text-secondary); min-width: 80px; }
.stat-track { flex: 1; height: 8px; background: var(--bg-base); border-radius: var(--border-radius-full); overflow: hidden; border: 1px solid var(--border-color); }
.stat-fill { height: 100%; border-radius: var(--border-radius-full); transition: width 0.3s; }
.stat-speed { background: #2980b9; }
.stat-acceleration { background: #e67e22; }
.stat-handling { background: #27ae60; }
.stat-val { font-size: var(--font-size-xs); min-width: 44px; text-align: right; color: var(--text-secondary); }
.stat-bonus { color: var(--color-success); font-size: var(--font-size-xs); }

/* ── Upgrades & Nitro ── */
.active-car-banner { display: flex; align-items: center; gap: var(--space-md); background: rgba(13,94,175,0.12); border-left: 3px solid var(--color-primary); }
.nitro-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.nitro-row { display: flex; align-items: center; gap: var(--space-md); }
.nitro-icon { font-size: 28px; }
.nitro-info { flex: 1; }
.nitro-count { text-align: right; }
.nitro-num { font-size: var(--font-size-2xl); color: var(--color-accent); display: block; }
.upgrades-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.upgrade-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.upg-header { display: flex; align-items: center; gap: var(--space-sm); }
.upg-icon { font-size: 24px; flex-shrink: 0; }
.upg-title { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.upg-cost { font-size: var(--font-size-sm); color: var(--color-warning); font-weight: bold; flex-shrink: 0; }
.level-pips { display: flex; align-items: center; gap: 6px; }
.pip { width: 28px; height: 8px; border-radius: var(--border-radius-full); background: var(--bg-base); border: 1px solid var(--border-color); }
.pip-filled { background: var(--color-primary); border-color: var(--color-primary-light); }
.level-label { font-size: var(--font-size-xs); margin-left: var(--space-xs); }

/* ── Racing ── */
.opponents-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.npc-card { display: flex; justify-content: space-between; align-items: center; }
.npc-info { display: flex; flex-direction: column; gap: 4px; }
.difficulty-easy { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
.difficulty-medium { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
.difficulty-hard { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }

.race-header { display: flex; justify-content: space-between; margin-bottom: 1rem; }
.racer-tag { display: flex; align-items: center; gap: 8px; font-weight: bold; background: var(--bg-base); padding: 4px 12px; border-radius: 20px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.player-dot-ui { background: #2ecc71; }
.npc-dot-ui { background: #e74c3c; }

.track-container { background: #1a1a1a; border-radius: 12px; padding: 10px; margin-bottom: 1rem; border: 2px solid #333; }
.minimap { width: 100%; height: auto; max-height: 250px; display: block; }
.racer-dot { transition: fill 0.2s; }

.btn-nitro { background: #e67e22; border-color: #d35400; color: white; font-weight: bold; font-size: 1.1rem; padding: 12px; }
.btn-nitro:not(:disabled):hover { background: #d35400; transform: scale(1.02); }

/* Animation for the Nitro pulse */
.nitro-pulse {
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.text-success { color: #2ecc71; }
.text-danger { color: #e74c3c; }
</style>
