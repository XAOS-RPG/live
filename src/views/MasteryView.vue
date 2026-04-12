<template>
  <div class="mastery-view">
    <div class="mastery-header">
      <h2>🌳 Δέντρο Ικανοτήτων — Βία</h2>
      <div class="points-badge">
        <span>Διαθέσιμοι Πόντοι:</span>
        <strong>{{ player.abilityPoints }}</strong>
      </div>
    </div>

    <div class="equipped-bar">
      <span class="eq-label">Εξοπλισμένες ({{ player.equippedAbilities.length }}/2):</span>
      <span v-for="id in player.equippedAbilities" :key="id" class="eq-chip">
        {{ abilityById(id)?.icon }} {{ abilityById(id)?.name }}
        <button class="eq-remove" @click="unequip(id)">✕</button>
      </span>
      <span v-if="player.equippedAbilities.length === 0" class="eq-empty">Καμία</span>
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
              equipped: isEquipped(node.id),
            }"
          >
            <span class="node-icon">{{ node.icon }}</span>
            <span class="node-name">{{ node.name }}</span>
            <span class="node-desc">{{ node.desc }}</span>

            <template v-if="isUnlocked(node.id)">
              <button
                v-if="node.active"
                class="equip-btn"
                :class="isEquipped(node.id) ? 'equip-btn-on' : 'equip-btn-off'"
                @click="toggleEquip(node.id)"
              >
                {{ isEquipped(node.id) ? '⚔️ Εξοπλισμένο' : '+ Εξόπλισε' }}
              </button>
              <span v-else class="node-status">✅ Παθητικό</span>
            </template>
            <button v-else-if="canUnlock(node)" class="unlock-btn" @click="unlock(node)">🔓 1pt</button>
            <span v-else class="node-status locked-icon">🔒</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../stores/playerStore'

const player = usePlayerStore()

const columns = [
  {
    id: 'offense',
    label: 'Βία',
    icon: '⚔️',
    nodes: [
      { id: 'vape',        tier: 0, requires: null,      active: true,  icon: '💨', name: 'Vape',              desc: 'Κοστίζει 5 Stamina · Θεραπεύει 20% μέγ. HP' },
      { id: 'ftysimo',     tier: 1, requires: 'vape',    active: true,  icon: '🫦', name: 'Φτύσιμο',           desc: 'Κοστίζει 2 Stamina · Δηλητηριάζει τον αντίπαλο (5 ζημιά/γύρο × 3)' },
      { id: 'berserker',   tier: 2, requires: 'ftysimo', active: false, icon: '🔥', name: 'Μανία',             desc: 'Παθητικό · +15% ζημιά όταν HP < 30%' },
    ],
  },
  {
    id: 'defense',
    label: 'Αντοχή',
    icon: '🛡️',
    nodes: [
      { id: 'kolodaktylo', tier: 0, requires: null,            active: true,  icon: '🖕', name: 'Κωλοδάχτυλο',    desc: 'Κοστίζει 8 Stamina · Μειώνει άμυνα αντιπάλου κατά 15%' },
      { id: 'klotsia',     tier: 1, requires: 'kolodaktylo',   active: true,  icon: '🦵', name: 'Κλωτσιά στα @@', desc: 'Κοστίζει 80% μέγ. Stamina · Τεράστια ζημιά + Stun (παράλειψη γύρου)' },
      { id: 'iron_will',   tier: 2, requires: 'klotsia',       active: false, icon: '⚙️', name: 'Σιδερένια Θέληση', desc: 'Παθητικό · Επιβιώνεις με 1 HP μία φορά ανά μάχη' },
    ],
  },
  {
    id: 'utility',
    label: 'Πονηριά',
    icon: '🃏',
    nodes: [
      { id: 'second_wind', tier: 0, requires: null,           active: false, icon: '💨', name: 'Δεύτερη Ανάσα', desc: 'Παθητικό · Ανάσα αναπληρώνει +10 επιπλέον Stamina' },
      { id: 'pickpocket',  tier: 1, requires: 'second_wind',  active: false, icon: '🤏', name: 'Τσιμπολόγος',   desc: 'Παθητικό · +10% χρήματα από νίκες' },
      { id: 'ghost',       tier: 2, requires: 'pickpocket',   active: false, icon: '👻', name: 'Φάντασμα',      desc: 'Παθητικό · +5% αποφυγή χτυπημάτων' },
    ],
  },
]

// Flat map for quick lookup
const allNodes = columns.flatMap(c => c.nodes)
const abilityById = (id) => allNodes.find(n => n.id === id)

const isUnlocked = (id) => !!player.unlockedAbilities[id]
const isEquipped = (id) => player.equippedAbilities.includes(id)

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

const toggleEquip = (id) => {
  if (isEquipped(id)) {
    player.equippedAbilities = player.equippedAbilities.filter(x => x !== id)
  } else {
    if (player.equippedAbilities.length >= 2) return
    player.equippedAbilities = [...player.equippedAbilities, id]
  }
}

const unequip = (id) => {
  player.equippedAbilities = player.equippedAbilities.filter(x => x !== id)
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
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.mastery-header h2 { margin: 0; font-size: var(--font-size-lg); }

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
.points-badge strong { color: var(--color-accent); font-size: var(--font-size-lg); }

.equipped-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--space-lg);
  font-size: var(--font-size-sm);
}
.eq-label { color: var(--text-secondary); margin-right: var(--space-xs); }
.eq-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(79,195,247,0.12);
  border: 1px solid var(--color-accent);
  border-radius: var(--border-radius-full);
  padding: 2px 10px;
  font-size: var(--font-size-xs);
}
.eq-remove {
  background: none; border: none; cursor: pointer;
  color: var(--text-secondary); font-size: 10px; padding: 0 2px;
}
.eq-remove:hover { color: var(--color-danger); }
.eq-empty { color: var(--text-secondary); font-style: italic; }

.tree-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}
@media (max-width: 600px) { .tree-grid { grid-template-columns: 1fr; } }

.tree-column { display: flex; flex-direction: column; gap: var(--space-sm); }

.col-header {
  text-align: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-md);
  padding: var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  border-bottom: 2px solid var(--color-accent);
}

.nodes { display: flex; flex-direction: column; gap: var(--space-sm); }

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
}
.node.available { border-color: var(--color-accent); background: rgba(79,195,247,0.05); }
.node.unlocked  { border-color: var(--color-success, #4caf50); background: rgba(76,175,80,0.08); }
.node.equipped  { border-color: #f1c40f; background: rgba(241,196,15,0.08); }
.node.locked    { opacity: 0.45; }

.node-icon { font-size: 28px; line-height: 1; }
.node-name { font-weight: var(--font-weight-bold); font-size: var(--font-size-sm); }
.node-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.3; }
.node-status { font-size: 11px; margin-top: 2px; }
.locked-icon { opacity: 0.6; }

.unlock-btn {
  margin-top: 4px;
  padding: 3px 10px;
  font-size: 11px;
  background: rgba(79,195,247,0.1);
  border: 1px solid var(--color-accent);
  border-radius: var(--border-radius-full);
  color: var(--color-accent);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.unlock-btn:hover { background: rgba(79,195,247,0.22); }

.equip-btn {
  margin-top: 4px;
  padding: 3px 10px;
  font-size: 11px;
  border-radius: var(--border-radius-full);
  cursor: pointer;
  transition: background var(--transition-fast);
  border: 1px solid;
}
.equip-btn-off {
  background: rgba(76,175,80,0.1);
  border-color: var(--color-success, #4caf50);
  color: var(--color-success, #4caf50);
}
.equip-btn-off:hover { background: rgba(76,175,80,0.22); }
.equip-btn-on {
  background: rgba(241,196,15,0.15);
  border-color: #f1c40f;
  color: #f1c40f;
}
.equip-btn-on:hover { background: rgba(241,196,15,0.28); }
</style>
