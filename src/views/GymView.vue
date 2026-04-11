<template>
  <div class="gym-page">
    <h2 class="page-title">💪 Γυμναστήριο</h2>

    <!-- Current Gym -->
    <div class="card gym-info">
      <div class="gym-header">
        <span class="gym-icon">{{ currentGym.icon }}</span>
        <div>
          <strong>{{ currentGym.name }}</strong>
          <p class="text-muted" style="font-size: var(--font-size-xs)">{{ currentGym.description }}</p>
        </div>
      </div>
      <div v-if="nextGym" class="next-gym mt-sm">
        <div class="flex flex-between" style="font-size: var(--font-size-xs)">
          <span class="text-muted">Επόμενο: {{ nextGym.name }}</span>
          <span class="text-accent text-mono">{{ player.totalStats.toFixed(1) }}/{{ nextGym.requirements.totalStats }}</span>
        </div>
        <div class="bar-track" style="background: var(--bg-surface-raised); margin-top: 4px;">
          <div class="bar-fill" :style="{
            width: Math.min(100, (player.totalStats / nextGym.requirements.totalStats) * 100) + '%',
            background: 'var(--color-accent)'
          }" />
        </div>
      </div>
    </div>

    <!-- Happiness Multiplier -->
    <div class="card multiplier-card">
      <span class="text-muted">Πολλαπλασιαστής Κέφι</span>
      <span class="text-mono" :class="player.happinessMultiplier > 1.2 ? 'text-success' : 'text-warning'">
        x{{ player.happinessMultiplier.toFixed(2) }}
      </span>
    </div>

    <!-- Active gym training -->
    <div v-if="player.activeActivity && player.activeActivity.type === 'gym'" class="card activity-card">
      <div class="activity-header">
        <span class="activity-icon">{{ player.activeActivity.icon }}</span>
        <div>
          <strong>{{ player.activeActivity.label }}</strong>
          <p class="text-muted" style="font-size: var(--font-size-xs)">Προπόνηση σε εξέλιξη...</p>
        </div>
      </div>
      <div class="activity-progress-track">
        <div class="activity-progress-fill" :style="{ width: (player.activityProgress * 100) + '%' }" />
      </div>
      <div class="activity-time text-mono text-accent">
        {{ formatTime(player.activityTimeRemaining) }}
      </div>
    </div>

    <!-- Busy with non-gym activity -->
    <div v-else-if="player.activeActivity" class="card busy-card">
      <p class="text-muted">Είσαι απασχολημένος με: <strong>{{ player.activeActivity.label }}</strong></p>
      <p class="text-mono text-accent">{{ formatTime(player.activityTimeRemaining) }}</p>
    </div>

    <!-- Pending result — player must roll the dice -->
    <div v-else-if="player.pendingResult && player.pendingResult.type === 'gym'" class="card roll-prompt-card">
      <div class="roll-prompt-header">
        <span style="font-size: 28px">{{ player.pendingResult.icon }}</span>
        <div>
          <strong>{{ player.pendingResult.label }}</strong>
          <p class="text-muted" style="font-size: var(--font-size-xs)">Η προπόνηση τελείωσε — ρίξε το ζάρι!</p>
        </div>
      </div>
      <button class="btn-roll-dice" @click="openDice">
        🎲 Ρίξε το Ζάρι!
      </button>
    </div>

    <!-- Stat tabs -->
    <div v-if="!player.activeActivity" class="stat-tabs">
      <button
        v-for="stat in statDefs"
        :key="stat.key"
        class="stat-tab"
        :class="{ active: selectedStat === stat.key }"
        @click="selectedStat = stat.key"
      >
        <span>{{ stat.icon }}</span>
        <span class="stat-tab-label">{{ stat.label }}</span>
        <span class="stat-tab-value text-mono">{{ player.stats[stat.key].toFixed(1) }}</span>
      </button>
    </div>

    <!-- Exercises for selected stat -->
    <div v-if="!player.activeActivity" class="exercise-list">
      <div
        v-for="ex in currentExercises"
        :key="ex.id"
        class="card exercise-card"
        :class="{ locked: ex.level > player.level, disabled: !canDoExercise(ex) }"
        @click="startExercise(ex)"
      >
        <div class="exercise-header">
          <span class="exercise-icon">{{ ex.icon }}</span>
          <div class="exercise-info">
            <strong>{{ ex.name }}</strong>
            <div class="exercise-meta">
              <span class="badge badge-info">{{ ex.energyCost }} ⚡</span>
              <span class="badge badge-muted">{{ formatDuration(ex.duration) }}</span>
              <span class="badge badge-accent">x{{ ex.multiplier }}</span>
            </div>
          </div>
        </div>
        <div v-if="ex.level > player.level" class="exercise-lock">
          🔒 Επίπεδο {{ ex.level }}
        </div>
      </div>
    </div>

    <!-- Dice Roll Animation -->
    <DiceRoll
      :visible="showDice"
      :result="diceResult"
      @dismiss="onDiceDismiss"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'
import { getAvailableGym, getNextGym } from '../data/gyms'
import { getExercisesForStat } from '../data/exercises'
import { calculateStatGain } from '../engine/formulas'
import { useTravelStore } from '../stores/travelStore'
import { useMissionStore } from '../stores/missionStore'
import DiceRoll from '../components/ui/DiceRoll.vue'

const player = usePlayerStore()
const gameStore = useGameStore()
const missionStore = useMissionStore()
const travelStore = useTravelStore()

const selectedStat = ref('strength')
const showDice = ref(false)
const diceResult = ref(null)

const statDefs = [
  { key: 'strength', label: 'Δύναμη', icon: '💪' },
  { key: 'speed', label: 'Ταχύτητα', icon: '⚡' },
  { key: 'dexterity', label: 'Επιδεξιότητα', icon: '🎯' },
  { key: 'defense', label: 'Άμυνα', icon: '🛡️' },
]

const currentGym = computed(() => getAvailableGym(player.totalStats))
const nextGym = computed(() => getNextGym(player.totalStats))

const currentExercises = computed(() => {
  return getExercisesForStat(selectedStat.value)
})

function canDoExercise(ex) {
  return player.canAct
    && player.level >= ex.level
    && player.resources.energy.current >= ex.energyCost
}

// Dice multipliers for gym: roll 1-6 → stat gain multiplier
const GYM_MULTIPLIERS = { 1: 0.5, 2: 0.8, 3: 1.0, 4: 1.3, 5: 1.5, 6: 2.0 }

// Funny Greek injury messages per exercise, shown on rolls 1–3
const INJURY_MESSAGES = {
  pushups:     ['Γλύστρησες και χτύπησες το πηγούνι σου στο πάτωμα.', 'Σπάλτηκε ο καρπός σου!', 'Τράβηξες μυ στο στήθος.'],
  dumbbells:   ['Τα βαράκια σου έπεσαν στο πόδι!', 'Τράβηξες μυ στον ώμο.', 'Ο αγκώνας σου έκλεισε με τραγικό τρόπο.'],
  barbell:     ['Η μπάρα γλύστρησε και χτύπησε στο πάτωμα μπροστά σε όλους.', 'Θλάση στη μέση. Εντυπωσιακό.', 'Έπεσες κάτω με τη μπάρα — το γυμναστήριο χειροκρότησε.'],
  deadlift:    ['Η μέση σου είπε «τελείωσα» και κόλλησε.', 'Θλάση οπίσθιου μηριαίου. Ο εκπαιδευτής κάλεσε ασθενοφόρο.', 'Το βάρος σε πήρε μαζί του.'],
  olympic:     ['Η μπάρα έπεσε και τίναξε 3 άτομα!', 'Θλάση σε μυ που δεν ήξερες ότι υπήρχε.', 'Ολόκληρο το γυμναστήριο κοιτούσε βουβό.'],
  jogging:     ['Πάτησες κάτι ύποπτο στον δρόμο.', 'Έπεσες και γδάρθηκες σαν παιδάκι.', 'Κράμπα στο μέσο του τρεξίματος — εμπρός!'],
  treadmill:   ['Έπεσες από τον διάδρομο μπροστά σε όλους!', 'Ο διάδρομος σε εκτόξευσε στον τοίχο.', 'Στράμπουλιξες και πέταξες το νερό σου παντού.'],
  sprints:     ['Κράμπα στη γάμπα! Βγάλε παπούτσι αμέσως.', 'Το γόνατό σου αρνήθηκε να συνεργαστεί.', 'Τράβηξες ισχιακό — τώρα περπατάς σαν πάπια.'],
  intervals:   ['Ζαλίστηκες και κάθισες στο πάτωμα.', 'Υπεραερισμός. Χρειάστηκες σακούλα.', 'Κατέρρευσες μετά την πρώτη επανάληψη.'],
  plyometrics: ['Προσγειώθηκες άσχημα και στράμπουλιξες.', 'Πήδηξες και χτύπησες το κεφάλι στο ταβάνι.', 'Θλάση τετρακεφάλου — ωραία.'],
  stretching:  ['Τεντώθηκες πολύ και κόλλησες στη θέση.', 'Κράμπα ενώ έκανες stretching. Ειρωνεία.', 'Δεν μπορείς να σηκωθείς από το πάτωμα.'],
  jumprope:    ['Μπλέχτηκες στο σχοινί και έπεσες.', 'Χτύπησες τον εαυτό σου με το σχοινί στο πρόσωπο.', 'Σκόνταψες και κατέστρεψες το αξιοπρεπές σου.'],
  boxing:      ['Χτύπησες τον εαυτό σου κατά λάθος.', 'Το γάντι σου πέταξε και χτύπησε άλλον.', 'Έχασες την ισορροπία σου και έπεσες στον σάκο.'],
  mma_bag:     ['Ο σάκος γύρισε και σε χτύπησε στο πρόσωπο.', 'Έσπασε το κρέμασμα και έπεσε ο σάκος πάνω σου.', 'Χάλασε ο καρπός σου — ενδιαφέρον γύρισμα.'],
  parkour:     ['Έπεσες από 2 μέτρα ύψος.', 'Γδάρθηκες σε τοίχο όπως αρχάριος.', 'Το κοινό σε χλεύασε καθώς αστόχησες εντελώς.'],
  plank:       ['Έπεσες μπρούμυτα ενώ έκανες πλάνκα.', 'Κράμπα στον κοιλιακό μυ.', 'Έμεινες κολλημένος στη θέση 20 λεπτά.'],
  core:        ['Πόνεσε η μέση ενώ έκανες sit-up.', 'Χτύπησες το κεφάλι σου στο πάτωμα.', 'Κράμπα εν μέσω επανάληψης — εντυπωσιακό.'],
  wrestling:   ['Ο αντίπαλος σε πέταξε στο στρώμα.', 'Έσπασε η φόρμα σου σε επικαιρότητα.', 'Στραμπούλιξε ο αστράγαλος.'],
  spartan:     ['Η ασπίδα σου έπεσε πάνω στο πόδι σου.', 'Χτύπησες συμπαίκτη κατά λάθος.', 'Θλάση ώμου από υπερβολική σπαρτιατική δύναμη.'],
  pali:        ['Ο αντίπαλος σε έριξε με μια μόνο κίνηση.', 'Πιάστηκε ο αυχένας σου.', 'Τράβηξες μυ στην πλάτη — αρχαία τεχνική αποτυχίας.'],
}

function getInjuryMessage(exerciseId) {
  const msgs = INJURY_MESSAGES[exerciseId]
  if (!msgs) return 'Τραυματίστηκες.'
  return msgs[Math.floor(Math.random() * msgs.length)]
}

function startExercise(ex) {
  if (!canDoExercise(ex)) return

  const gym = currentGym.value

  // Deduct energy now
  player.modifyResource('energy', -ex.energyCost)

  // Pre-roll BASE stat gain (without dice multiplier — dice applies at reveal)
  const baseGain = calculateStatGain(
    gym,
    player.resources.happiness.current,
    player.resources.happiness.max
  )
  const baseGainWithExercise = baseGain * ex.multiplier * travelStore.gymBoostMultiplier

  // Pre-roll the d6 now (prevents save-scumming); player doesn't see it until they stop the die
  const roll = Math.floor(Math.random() * 6) + 1

  const statLabel = statDefs.find(s => s.key === selectedStat.value)?.label || selectedStat.value

  player.startActivity({
    type: 'gym',
    id: ex.id,
    label: ex.name,
    icon: ex.icon,
    duration: ex.duration,
    preRolled: {
      roll,
      rewards: {
        baseStatGain: baseGainWithExercise, // multiplier applied at reveal
        statName: statLabel,
        statKey: selectedStat.value,
      },
    },
  })

  gameStore.saveGame()
}

// Player manually opens dice after training completes
function openDice() {
  const result = player.pendingResult
  if (!result || result.type !== 'gym') return

  const roll = result.roll
  const mult = GYM_MULTIPLIERS[roll] ?? 1.0
  const finalGain = result.rewards.baseStatGain * mult

  diceResult.value = {
    mode: 'multiplier',
    roll,
    label: result.label,
    icon: result.icon,
    multiplier: mult,
    consequence: roll <= 3 ? getInjuryMessage(result.id) : null,
    rewards: {
      statGain: finalGain,
      statName: result.rewards.statName,
      statKey: result.rewards.statKey,
    },
  }
  showDice.value = true
}

function onDiceDismiss() {
  showDice.value = false
  const result = player.pendingResult
  if (result && result.type === 'gym') {
    // Use the final gain computed in openDice (with dice multiplier)
    const r = diceResult.value?.rewards
    if (r) {
      player.trainStat(r.statKey, r.statGain)
      player.logActivity(`💪 ${r.statName}: +${r.statGain.toFixed(3)}`, 'info')
      gameStore.addNotification(`${r.statName}: +${r.statGain.toFixed(3)}`, 'success')
      missionStore.updateProgress('gym', 1)
    }
    player.clearPendingResult()
    gameStore.saveGame()
  }
  diceResult.value = null
}

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
.gym-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title {
  font-size: var(--font-size-2xl);
}

.gym-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.gym-icon {
  font-size: 32px;
}

.bar-track {
  height: 6px;
  border-radius: var(--border-radius-full);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--border-radius-full);
  transition: width 0.5s ease;
}

.multiplier-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Stat tabs */
.stat-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-xs);
}

.stat-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm) var(--space-xs);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.stat-tab:hover {
  background: var(--bg-surface-raised);
}

.stat-tab.active {
  border-color: var(--color-accent);
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

.stat-tab-label {
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.stat-tab-value {
  font-size: var(--font-size-xs);
  color: var(--color-accent);
}

/* Exercise list */
.exercise-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.exercise-card {
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.exercise-card:hover:not(.locked):not(.disabled) {
  background: var(--bg-surface-raised);
  transform: translateX(2px);
}

.exercise-card.locked {
  opacity: 0.4;
  cursor: default;
}

.exercise-card.disabled:not(.locked) {
  opacity: 0.5;
  cursor: not-allowed;
}

.exercise-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.exercise-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.exercise-info {
  flex: 1;
}

.exercise-info strong {
  font-size: var(--font-size-sm);
  display: block;
  margin-bottom: 4px;
}

.exercise-meta {
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

.badge-accent {
  background: rgba(13, 94, 175, 0.15);
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
}

.exercise-lock {
  position: absolute;
  top: 50%;
  right: var(--space-md);
  transform: translateY(-50%);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* Roll dice prompt */
.roll-prompt-card {
  border-left: 3px solid var(--color-success);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.roll-prompt-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.btn-roll-dice {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-success);
  color: #fff;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.35);
  animation: rollPromptPulse 1.2s infinite;
}

.btn-roll-dice:hover {
  background: #27ae60;
  transform: scale(1.02);
}

@keyframes rollPromptPulse {
  0%, 100% { box-shadow: 0 4px 12px rgba(46, 204, 113, 0.35); }
  50%       { box-shadow: 0 4px 22px rgba(46, 204, 113, 0.65); }
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
