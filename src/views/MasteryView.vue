<template>
  <div class="mastery-view">
    <div class="mastery-header">
      <h2>🌳 Δέντρο Ικανοτήτων — Βία</h2>
      <div class="points-badge">
        <span>Διαθέσιμοι Πόντοι:</span>
        <strong>{{ player.abilityPoints }}</strong>
      </div>
    </div>

    <div class="tree-grid">
      <div v-for="col in columns" :key="col.id" class="tree-column">
        <div class="col-header">{{ col.icon }} {{ col.label }}</div>
        <div class="nodes">
          <div
            v-for="node in col.nodes"
            :key="node.id"
            class="node"
            :class="{
              unlocked: isUnlocked(node.id),
              available: canUnlock(node),
              locked: !isUnlocked(node.id) && !canUnlock(node),
            }"
            @click="unlock(node)"
          >
            <span class="node-icon">{{ node.icon }}</span>
            <span class="node-name">{{ node.name }}</span>
            <span class="node-desc">{{ node.desc }}</span>
            <span v-if="isUnlocked(node.id)" class="node-status">✅</span>
            <span v-else-if="canUnlock(node)" class="node-status">🔓 1pt</span>
            <span v-else class="node-status">🔒</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'

const player = usePlayerStore()

const columns = [
  {
    id: 'offense',
    label: 'Βία',
    icon: '⚔️',
    nodes: [
      { id: 'vape',        tier: 0, requires: null,    icon: '💨', name: 'Vape',        desc: '+5% ζημιά επίθεσης' },
      { id: 'ftysimo',     tier: 1, requires: 'vape',  icon: '🫦', name: 'Φτύσιμο',    desc: 'Αποπροσανατολίζει τον αντίπαλο (-10% hit chance)' },
      { id: 'berserker',   tier: 2, requires: 'ftysimo', icon: '🔥', name: 'Μανία',    desc: '+15% ζημιά όταν HP < 30%' },
    ],
  },
  {
    id: 'defense',
    label: 'Αντοχή',
    icon: '🛡️',
    nodes: [
      { id: 'kolodaktylo', tier: 0, requires: null,           icon: '🖕', name: 'Κωλοδάχτυλο', desc: 'Μειώνει εισερχόμενη ζημιά κατά 5%' },
      { id: 'thick_skin',  tier: 1, requires: 'kolodaktylo',  icon: '🦏', name: 'Χοντρόπετσος', desc: '+10 μέγ. HP' },
      { id: 'iron_will',   tier: 2, requires: 'thick_skin',   icon: '⚙️', name: 'Σιδερένια Θέληση', desc: 'Επιβιώνεις με 1 HP μία φορά ανά μάχη' },
    ],
  },
  {
    id: 'utility',
    label: 'Πονηριά',
    icon: '🃏',
    nodes: [
      { id: 'second_wind', tier: 0, requires: null,          icon: '💨', name: 'Δεύτερη Ανάσα', desc: 'Ανάσα αναπληρώνει +10 επιπλέον Stamina' },
      { id: 'pickpocket',  tier: 1, requires: 'second_wind', icon: '🤏', name: 'Τσιμπολόγος',   desc: '+10% χρήματα από νίκες' },
      { id: 'ghost',       tier: 2, requires: 'pickpocket',  icon: '👻', name: 'Φάντασμα',      desc: '+5% αποφυγή χτυπημάτων' },
    ],
  },
]

const isUnlocked = (id) => !!player.unlockedAbilities[id]

const canUnlock = (node) => {
  if (isUnlocked(node.id)) return false
  if (player.abilityPoints < 1) return false
  if (node.requires && !isUnlocked(node.requires)) return false
  return true
}

const unlock = (node) => {
  if (!canUnlock(node)) return
  player.unlockedAbilities[node.id] = true
  player.abilityPoints--
}
</script>

<style scoped>
.mastery-view {
  padding: var(--space-lg);
  max-width: 900px;
  margin: 0 auto;
}

.mastery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.mastery-header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.points-badge {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: var(--bg-surface-raised);
  border: 1px solid var(--color-accent);
  border-radius: var(--border-radius-md);
  padding: var(--space-xs) var(--space-md);
  font-size: var(--font-size-sm);
}

.points-badge strong {
  color: var(--color-accent);
  font-size: var(--font-size-lg);
}

.tree-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}

@media (max-width: 600px) {
  .tree-grid {
    grid-template-columns: 1fr;
  }
}

.tree-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.col-header {
  text-align: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-md);
  padding: var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  border-bottom: 2px solid var(--color-accent);
}

.nodes {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  text-align: center;
  transition: all var(--transition-fast);
  position: relative;
}

.node.available {
  border-color: var(--color-accent);
  cursor: pointer;
  background: rgba(79, 195, 247, 0.05);
}

.node.available:hover {
  background: rgba(79, 195, 247, 0.12);
  transform: translateY(-2px);
}

.node.unlocked {
  border-color: var(--color-success, #4caf50);
  background: rgba(76, 175, 80, 0.08);
}

.node.locked {
  opacity: 0.45;
  cursor: not-allowed;
}

.node-icon {
  font-size: 28px;
  line-height: 1;
}

.node-name {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
}

.node-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.3;
}

.node-status {
  font-size: 11px;
  margin-top: 2px;
}
</style>
