<template>
  <div class="combat-page">

    <!-- ===== MODE SELECT ===== -->
    <template v-if="screen === 'mode'">
      <h2 class="page-title">⚔️ Μάχη</h2>

      <!-- Stats bar -->
      <div class="card stats-row">
        <div class="stat-pair">
          <span class="text-muted">Νίκες</span>
          <span class="text-mono text-success">{{ combatStore.combatStats.wins }}</span>
        </div>
        <div class="stat-pair">
          <span class="text-muted">Ήττες</span>
          <span class="text-mono text-danger">{{ combatStore.combatStats.losses }}</span>
        </div>
        <div class="stat-pair">
          <span class="text-muted">Win Rate</span>
          <span class="text-mono text-accent">{{ combatStore.combatStats.winRate }}%</span>
        </div>
        <button class="btn btn-sm btn-outline equip-btn" @click="showEquipPopup = true">
          🛡️ Εξοπλισμός
        </button>
      </div>

      <div class="mode-grid">
        <div class="card mode-card" @click="selectMode('solo')">
          <span class="mode-icon">🤺</span>
          <span class="mode-title">Solo</span>
          <span class="mode-desc">Πολέμα NPCs με αυξανόμενη δυσκολία</span>
        </div>
        <div class="card mode-card" @click="selectMode('pvp')">
          <span class="mode-icon">🆚</span>
          <span class="mode-title">PVP</span>
          <span class="mode-desc">Επίθεση σε άλλους παίκτες</span>
        </div>
      </div>
    </template>

    <!-- ===== OPPONENT SELECT ===== -->
    <template v-else-if="screen === 'select'">
      <div class="select-header">
        <button class="btn btn-sm btn-outline" @click="screen = 'mode'">← Πίσω</button>
        <h2 class="page-title" style="margin:0">{{ mode === 'solo' ? '🤺 Solo' : '🆚 PVP' }}</h2>
      </div>

      <!-- SOLO opponent list -->
      <template v-if="mode === 'solo'">
        <div v-for="diff in difficulties" :key="diff.key" class="tier-section">
          <h3 class="tier-title"><span :class="'badge ' + diff.color">{{ diff.label }}</span></h3>
          <div class="opp-list">
            <div
              v-for="npc in getNpcsByDiff(diff.key)"
              :key="npc.id"
              class="card opp-card"
              :class="{ disabled: !canFight(npc) }"
              @click="startFight(npc)"
            >
              <div class="opp-top">
                <span class="opp-icon">{{ npc.icon }}</span>
                <div class="opp-info">
                  <strong>{{ npc.name }}</strong>
                  <p class="text-muted opp-desc">{{ npc.description }}</p>
                </div>
              </div>
              <div class="opp-stats">
                <span class="opp-stat" title="Strength">STR {{ Math.round(npc.stats.strength) }}</span>
                <span class="opp-stat" title="Speed">SPD {{ Math.round(npc.stats.speed) }}</span>
                <span class="opp-stat" title="Dexterity">DEX {{ Math.round(npc.stats.dexterity) }}</span>
                <span class="opp-stat" title="Defense">DEF {{ Math.round(npc.stats.defense) }}</span>
                <span class="opp-stat opp-hp" title="HP">HP {{ npc.hp }}</span>
              </div>
              <div class="opp-meta">
                <span class="badge badge-info">Επ. {{ npc.level }}</span>
                <span class="text-muted text-mono opp-cash">€{{ npc.rewards.cashMin }}-{{ npc.rewards.cashMax }}</span>
                <span class="badge badge-success opp-energy">{{ npc.energyCost }} ⚡</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- PVP opponent list -->
      <template v-else>
        <div class="card pvp-notice text-muted">
          ⚠️ Επίθεση σε παίκτες — κλέβεις χρήματά τους αν κερδίσεις
        </div>
        <div v-for="tier in pvpTiers" :key="tier.key" class="tier-section">
          <h3 class="tier-title"><span :class="'badge ' + tier.color">{{ tier.label }}</span></h3>
          <div class="opp-list">
            <div
              v-for="user in getUsersByTier(tier.key)"
              :key="user.id"
              class="card opp-card pvp-card"
              :class="{ disabled: !canFight(user) }"
              @click="startFight(user)"
            >
              <div class="opp-top">
                <span class="opp-icon">{{ user.icon }}</span>
                <div class="opp-info">
                  <strong class="pvp-nick">{{ user.nickname }}</strong>
                  <div class="pvp-sub">
                    <span class="text-muted" style="font-size:var(--font-size-xs)">📍 {{ user.location }}</span>
                    <span class="text-muted" style="font-size:var(--font-size-xs)">🕐 {{ user.lastSeen }}</span>
                  </div>
                </div>
              </div>
              <div class="opp-stats">
                <span class="opp-stat" title="Strength">STR {{ Math.round(user.stats.strength) }}</span>
                <span class="opp-stat" title="Speed">SPD {{ Math.round(user.stats.speed) }}</span>
                <span class="opp-stat" title="Dexterity">DEX {{ Math.round(user.stats.dexterity) }}</span>
                <span class="opp-stat" title="Defense">DEF {{ Math.round(user.stats.defense) }}</span>
                <span class="opp-stat opp-hp" title="HP">HP {{ user.hp }}</span>
              </div>
              <div class="opp-meta">
                <span class="badge badge-info">Επ. {{ user.level }}</span>
                <span class="text-muted text-mono opp-cash">€{{ user.rewards.cashMin }}-{{ user.rewards.cashMax }}</span>
                <span class="badge badge-success opp-energy">{{ user.energyCost }} ⚡</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ===== COMBAT ARENA ===== -->
    <CombatArena
      v-else-if="screen === 'fight'"
      :opponent="selectedOpponent"
      :is-pvp="mode === 'pvp'"
      @fight-end="onFightEnd"
      @fight-flee="onFightFlee"
    />

    <BattleEquipPopup :open="showEquipPopup" @close="showEquipPopup = false" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/playerStore'
import { useCombatStore } from '../stores/combatStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useGameStore } from '../stores/gameStore'
import { useMissionStore } from '../stores/missionStore'
import { useAchievementStore } from '../stores/achievementStore'
import { useFactionStore } from '../stores/factionStore'
import { npcs, difficultyLabels } from '../data/npcs'
import { fakeUsers, pvpTierLabels } from '../data/fakeUsers'
import { calculateHospitalTime } from '../engine/formulas'
import CombatArena from '../components/combat/CombatArena.vue'
import BattleEquipPopup from '../components/combat/BattleEquipPopup.vue'
import {
  persistCombatSession,
  clearCombatSession,
  readCombatSession,
  markCombatInterrupted,
  consumeCombatInterruptedFlag,
} from '../utils/combatSession'

const player = usePlayerStore()
const combatStore = useCombatStore()
const inventory = useInventoryStore()
const gameStore = useGameStore()
const missionStore = useMissionStore()
const achievementStore = useAchievementStore()
const factionStore = useFactionStore()
const router = useRouter()

const screen = ref('mode')  // mode | select | fight
const mode = ref('solo')    // solo | pvp
const selectedOpponent = ref(null)
const showEquipPopup = ref(false)

const DEFEAT_CASH_FRACTION = 0.03

function onBeforeUnloadHandler() {
  if (screen.value === 'fight' && selectedOpponent.value) {
    markCombatInterrupted()
  }
}

function snapshotCombatSession() {
  const o = selectedOpponent.value
  if (!o) return
  persistCombatSession({
    mode: mode.value,
    isPvp: mode.value === 'pvp',
    opponentId: o.id,
    opponentLevel: o.level,
    opponentDifficulty: o.difficulty ?? null,
    opponentName: o.nickname || o.name,
    energyCost: o.energyCost,
  })
}

/** Normal ήττα / refresh mid-fight: νοσοκομείο + 3% μετρητά (αν έχει). */
function applyCombatDefeat(pending, reason = 'fight') {
  const cashLost = takeDefeatCashLoss()

  player.resources.hp.current = 0
  const hospitalTime = calculateHospitalTime(0, player.resources.hp.max, pending.opponentLevel)
  player.setStatus('hospital', hospitalTime)

  const label = reason === 'reload' ? 'Έκλεισες τη μάχη (refresh) — ' : ''
  player.logActivity(
    `⚔️ ${pending.isPvp ? 'PVP ' : ''}Ήττα vs ${pending.opponentName} — Νοσοκομείο${cashLost ? ` · -€${cashLost}` : ''}`,
    'danger'
  )
  let msg = `${label}Ήττα! Νοσοκομείο…`
  if (cashLost > 0) msg += ` Έχασες €${cashLost} (3%).`
  gameStore.addNotification(msg, 'hospital')

  combatStore.recordHistory({
    opponentId: pending.opponentId,
    isPvp: pending.isPvp,
    won: false,
  })

  gameStore.saveGame()
  setTimeout(() => router.push('/hospital'), 400)
}

function takeDefeatCashLoss() {
  if (player.cash <= 0) return 0
  const loss = Math.floor(player.cash * DEFEAT_CASH_FRACTION)
  if (loss <= 0) return 0
  player.removeCash(loss)
  return loss
}

function applyFleeCosts() {
  const n = player.resources.nerve
  const h = player.resources.happiness
  const nerveLoss = Math.floor(n.current * 0.25)
  const happyLoss = Math.floor(h.current * 0.25)
  if (nerveLoss > 0) player.modifyResource('nerve', -nerveLoss)
  if (happyLoss > 0) player.modifyResource('happiness', -happyLoss)
  return { nerveLoss, happyLoss }
}

watch(screen, s => {
  if (s === 'fight' && selectedOpponent.value) {
    snapshotCombatSession()
    window.addEventListener('beforeunload', onBeforeUnloadHandler)
  } else {
    window.removeEventListener('beforeunload', onBeforeUnloadHandler)
  }
})

onMounted(() => {
  const interrupted = consumeCombatInterruptedFlag()
  const pending = readCombatSession()
  if (pending && interrupted) {
    clearCombatSession()
    applyCombatDefeat(pending, 'reload')
  } else if (pending && !interrupted) {
    clearCombatSession()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnloadHandler)
})

const difficulties = [
  { key: 'easy',      ...difficultyLabels.easy },
  { key: 'medium',    ...difficultyLabels.medium },
  { key: 'hard',      ...difficultyLabels.hard },
  { key: 'very_hard', ...difficultyLabels.very_hard },
  { key: 'boss',      ...difficultyLabels.boss },
]

const pvpTiers = [
  { key: 'beginner', ...pvpTierLabels.beginner },
  { key: 'medium',   ...pvpTierLabels.medium },
  { key: 'advanced', ...pvpTierLabels.advanced },
  { key: 'elite',    ...pvpTierLabels.elite },
]

function getNpcsByDiff(d) { return npcs.filter(n => n.difficulty === d) }
function getUsersByTier(t) { return fakeUsers.filter(u => u.tier === t) }

function canFight(target) {
  return player.resources.energy.current >= target.energyCost && !player.isIncapacitated
}

function selectMode(m) {
  mode.value = m
  screen.value = 'select'
}

function startFight(opponent) {
  if (!canFight(opponent)) return
  // Spend energy now (before fight starts)
  player.modifyResource('energy', -opponent.energyCost)
  selectedOpponent.value = opponent
  screen.value = 'fight'
}

function onFightFlee() {
  const opp = selectedOpponent.value
  clearCombatSession()
  const { nerveLoss, happyLoss } = applyFleeCosts()

  combatStore.recordHistory({
    opponentId: opp?.id,
    isPvp: mode.value === 'pvp',
    won: false,
  })

  player.logActivity(
    `🏃 Έφυγες από τη μάχη vs ${opp?.nickname || opp?.name || '?'} (Θράσος -${nerveLoss}, Κέφι -${happyLoss})`,
    'warning'
  )
  gameStore.addNotification(
    "Βάλ'το στα πόδια! -" + nerveLoss + ' Θράσος, -' + happyLoss + ' Κέφι. Η ζωή σου έμεινε ίδια.',
    'warning'
  )

  selectedOpponent.value = null
  screen.value = 'select'
  gameStore.saveGame()
}

function onFightEnd(result) {
  clearCombatSession()

  if (result.won) {
    player.addCash(result.cashReward)
    player.addXP(result.xpReward)
    player.resources.hp.current = result.playerHPRemaining
    player.addMeson(1)

    if (result.itemDropId) {
      inventory.addItem(result.itemDropId, 1)
    }

    player.logActivity(
      `⚔️ ${result.isPvp ? 'PVP' : ''} Νίκη vs ${result.opponentName}: +€${result.cashReward}`,
      'combat'
    )
    gameStore.addNotification(
      `${result.isPvp ? 'PVP ' : ''}Νίκη! +€${result.cashReward} +${result.xpReward}XP`,
      'success'
    )

    // Track missions & achievements
    missionStore.updateProgress('combat', 1, {
      difficulty: selectedOpponent.value.difficulty || null,
      isPvp: result.isPvp,
    })
    missionStore.updateProgress('earn', result.cashReward)
    factionStore.addContribution(1)
    achievementStore.checkAchievements()
  } else {
    const cashLost = takeDefeatCashLoss()
    player.resources.hp.current = 0
    const hospitalTime = calculateHospitalTime(0, player.resources.hp.max, selectedOpponent.value.level)
    player.setStatus('hospital', hospitalTime)

    player.logActivity(
      `⚔️ ${result.isPvp ? 'PVP' : ''} Ήττα vs ${result.opponentName} — Νοσοκομείο${cashLost ? ` · -€${cashLost}` : ''}`,
      'danger'
    )
    let loseMsg = 'Ήττα! Νοσοκομείο…'
    if (cashLost > 0) loseMsg += ` Έχασες €${cashLost} (3%).`
    gameStore.addNotification(loseMsg, 'hospital')
  }

  // Record history
  combatStore.recordHistory({
    opponentId: result.opponentId,
    isPvp: result.isPvp,
    won: result.won,
  })

  gameStore.saveGame()

  if (result.won) {
    screen.value = 'select'
  } else {
    setTimeout(() => router.push('/hospital'), 800)
  }
}
</script>

<style scoped>
.combat-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); }

.stats-row { display: flex; justify-content: space-around; align-items: center; }
.equip-btn { margin-left: auto; flex-shrink: 0; }
.stat-pair {
  display: flex; flex-direction: column;
  align-items: center; gap: 2px;
  font-size: var(--font-size-sm);
}

/* Mode select */
.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}
.mode-card:hover {
  background: var(--bg-surface-raised);
  transform: translateY(-2px);
  border-color: var(--color-accent);
}
.mode-icon { font-size: 3rem; }
.mode-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); }
.mode-desc { font-size: var(--font-size-xs); color: var(--text-secondary); }

/* Opponent select */
.select-header {
  display: flex; align-items: center; gap: var(--space-sm);
}

.tier-section { margin-bottom: var(--space-sm); }
.tier-title { margin-bottom: var(--space-sm); }

.opp-list { display: flex; flex-direction: column; gap: var(--space-sm); }

.opp-card {
  cursor: pointer;
  transition: all var(--transition-fast);
}
.opp-card:hover:not(.disabled) {
  background: var(--bg-surface-raised);
  transform: translateX(2px);
}
.opp-card.disabled { opacity: 0.5; cursor: not-allowed; }

.opp-top {
  display: flex; align-items: flex-start;
  gap: var(--space-sm); margin-bottom: var(--space-xs);
}
.opp-icon { font-size: 28px; flex-shrink: 0; }
.opp-info { flex: 1; min-width: 0; }
.opp-info strong { font-size: var(--font-size-sm); }
.opp-desc { font-size: var(--font-size-xs); margin: 0; }

.opp-meta {
  display: flex; align-items: center;
  gap: var(--space-sm); flex-wrap: wrap;
}
.opp-stats {
  display: flex; gap: var(--space-xs); flex-wrap: wrap;
  margin-bottom: var(--space-xs);
}
.opp-stat {
  font-size: 10px; font-family: var(--font-family-mono);
  color: var(--text-secondary); background: var(--bg-surface-raised);
  padding: 1px 5px; border-radius: var(--border-radius-sm);
}
.opp-hp { color: var(--color-danger); }
.opp-cash { font-size: var(--font-size-xs); }
.opp-energy { font-size: 10px; }

/* PVP */
.pvp-notice { padding: var(--space-sm); font-size: var(--font-size-xs); text-align: center; }
.pvp-card { border-left: 2px solid var(--color-accent); }
.pvp-nick { font-family: var(--font-family-mono); color: var(--color-accent); }
.pvp-sub { display: flex; gap: var(--space-sm); margin-top: 2px; flex-wrap: wrap; }
</style>
