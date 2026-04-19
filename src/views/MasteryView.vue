<template>
  <div class="mastery-page">

    <!-- Header -->
    <div class="mastery-header">
      <div>
        <h2 class="mastery-title">🌳 Δέντρο Ικανοτήτων</h2>
        <p class="mastery-sub text-muted">Ξόδεψε Ability Points για να ξεκλειδώσεις ικανότητες</p>
      </div>
      <div class="points-pill">
        <span class="points-icon">⭐</span>
        <span class="points-num">{{ player.abilityPoints }}</span>
        <span class="points-lbl">pts</span>
      </div>
    </div>

    <!-- Equipped slots -->
    <div class="equipped-section">
      <div class="equipped-label">Εξοπλισμένες ικανότητες ({{ player.equippedAbilities.length }}/3)</div>
      <div class="equipped-slots">
        <div
          v-for="i in 3"
          :key="i"
          class="eq-slot"
          :class="{ filled: player.equippedAbilities[i-1] }"
        >
          <template v-if="player.equippedAbilities[i-1]">
            <span class="eq-slot-icon">{{ abilityById(player.equippedAbilities[i-1])?.icon }}</span>
            <span class="eq-slot-name">{{ abilityById(player.equippedAbilities[i-1])?.name }}</span>
            <button class="eq-remove" @click="unequip(player.equippedAbilities[i-1])">✕</button>
          </template>
          <span v-else class="eq-empty-label">Κενό</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      <button
        v-for="col in columns"
        :key="col.id"
        class="tab-btn"
        :class="['tab-' + col.id, { active: activeTab === col.id }]"
        @click="activeTab = col.id"
      >
        <span class="tab-icon">{{ col.icon }}</span>
        <span class="tab-label">{{ col.label }}</span>
        <span class="tab-count">{{ unlockedCount(col) }}/{{ col.nodes.length }}</span>
      </button>
    </div>

    <!-- Active tab panel -->
    <template v-for="col in columns" :key="col.id">
      <div v-if="activeTab === col.id" class="branch-nodes tab-panel">
        <template v-for="(node, idx) in col.nodes" :key="node.id">

          <div
            v-if="idx > 0"
            class="connector"
            :class="{
              'connector-active': isUnlocked(col.nodes[idx-1].id),
              'connector-locked': !isUnlocked(col.nodes[idx-1].id),
            }"
          ></div>

          <div
            class="node-card"
            :class="{
              'node-unlocked': isUnlocked(node.id),
              'node-available': canUnlock(node),
              'node-locked': !isUnlocked(node.id) && !canUnlock(node),
              'node-equipped': isEquipped(node.id),
              ['node-theme-' + col.id]: true,
            }"
            @click="handleNodeClick(node)"
          >
            <div class="node-top">
              <span class="node-icon">{{ node.icon }}</span>
              <div class="node-badges">
                <span class="node-type-badge" :class="node.active ? 'badge-active' : 'badge-passive'">
                  {{ node.active ? 'Ενεργό' : 'Παθητικό' }}
                </span>
                <span v-if="isEquipped(node.id)" class="node-type-badge badge-equipped">⚔️ Εξοπλ.</span>
              </div>
            </div>
            <div class="node-name">{{ node.name }}</div>
            <div class="node-desc">{{ node.desc }}</div>

            <div class="node-action">
              <template v-if="isUnlocked(node.id)">
                <button
                  v-if="node.active"
                  class="node-btn"
                  :class="isEquipped(node.id) ? 'btn-unequip' : 'btn-equip'"
                  @click.stop="toggleEquip(node.id)"
                >
                  {{ isEquipped(node.id) ? '− Αφαίρεση' : '+ Εξόπλισε' }}
                </button>
                <span v-else class="node-passive-label">✅ Ενεργό</span>
              </template>
              <button v-else-if="canUnlock(node)" class="node-btn btn-unlock" @click.stop="unlock(node)">
                🔓 Ξεκλείδωσε (1pt)
              </button>
              <span v-else class="node-locked-label">🔒 {{ node.requires ? 'Απαιτεί: ' + (abilityById(node.requires)?.name ?? node.requires) : 'Κλειδωμένο' }}</span>
            </div>
          </div>

        </template>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'

const player = usePlayerStore()
const game   = useGameStore()

const activeTab = ref('offense')

const columns = [
  {
    id: 'offense',
    label: 'Βία',
    icon: '⚔️',
    nodes: [
      { id: 'vape',        tier: 0, requires: null,          active: true,  icon: '💨', name: 'Vape',                  desc: 'Κοστίζει 5 Stamina · Θεραπεύει 20% μέγ. HP' },
      { id: 'ftysimo',     tier: 1, requires: 'vape',        active: true,  icon: '🫦', name: 'Φτύσιμο',               desc: 'Κοστίζει 2 Stamina · Δηλητηριάζει (5 ζημιά/γύρο × 3)' },
      { id: 'berserker',   tier: 2, requires: 'ftysimo',     active: false, icon: '🔥', name: 'Μανία',                 desc: 'Παθητικό · +15% ζημιά όταν HP < 30%' },
      { id: 'adrenaline',  tier: 3, requires: 'berserker',   active: true,  icon: '⚡', name: 'Αδρεναλίνη',            desc: 'Κοστίζει 12 Stamina · +30% ζημιά στο επόμενο χτύπημα' },
      { id: 'crit_eye',    tier: 4, requires: 'adrenaline',  active: false, icon: '🎯', name: 'Κριτικό Μάτι',          desc: 'Παθητικό · +10% πιθανότητα κριτικού (2× ζημιά)' },
      { id: 'bloodthirst', tier: 5, requires: 'crit_eye',    active: false, icon: '🩸', name: 'Αιματοδίψης',           desc: 'Παθητικό · Κάθε νίκη αποκαθιστά 15 HP' },
      { id: 'iron_fist',   tier: 6, requires: 'bloodthirst', active: true,  icon: '✊', name: 'Σιδερένια Γροθιά',      desc: 'Κοστίζει 15 Stamina · Αγνοεί την άμυνα του αντιπάλου' },
      { id: 'executioner', tier: 7, requires: 'iron_fist',   active: false, icon: '🗡️', name: 'Εκτελεστής',            desc: 'Παθητικό · +25% ζημιά σε αντιπάλους με HP < 25%' },
      { id: 'war_cry',     tier: 8, requires: 'executioner', active: true,  icon: '📣', name: 'Πολεμική Κραυγή',       desc: 'Κοστίζει 20 Stamina · Stun αντιπάλου για 1 γύρο' },
      { id: 'death_blow',  tier: 9, requires: 'war_cry',     active: false, icon: '💀', name: 'Θανατηφόρο Χτύπημα',   desc: 'Παθητικό · 15% πιθανότητα άμεσης νοκ-άουτ' },
    ],
  },
  {
    id: 'defense',
    label: 'Αντοχή',
    icon: '🛡️',
    nodes: [
      { id: 'kolodaktylo',   tier: 0, requires: null,              active: true,  icon: '🖕', name: 'Κωλοδάχτυλο',       desc: 'Κοστίζει 8 Stamina · Μειώνει άμυνα αντιπάλου −15%' },
      { id: 'klotsia',       tier: 1, requires: 'kolodaktylo',     active: true,  icon: '🦵', name: 'Κλωτσιά',           desc: 'Κοστίζει 80% Stamina · Τεράστια ζημιά + Stun' },
      { id: 'iron_will',     tier: 2, requires: 'klotsia',         active: false, icon: '⚙️', name: 'Σιδερένια Θέληση', desc: 'Παθητικό · Επιβιώνεις με 1 HP μία φορά ανά μάχη' },
      { id: 'block',         tier: 3, requires: 'iron_will',       active: true,  icon: '🛑', name: 'Μπλοκάρισμα',       desc: 'Κοστίζει 10 Stamina · Μειώνει το επόμενο χτύπημα κατά 60%' },
      { id: 'thick_skin',    tier: 4, requires: 'block',           active: false, icon: '🦏', name: 'Σκληρό Δέρμα',      desc: 'Παθητικό · −10% σε όλη τη ζημιά που δέχεσαι' },
      { id: 'endurance_up',  tier: 5, requires: 'thick_skin',      active: false, icon: '💪', name: 'Σιδερένιο Κορμί',   desc: 'Παθητικό · +25 μέγιστα HP' },
      { id: 'antidote',      tier: 6, requires: 'endurance_up',    active: false, icon: '🧪', name: 'Ανοσία',             desc: 'Παθητικό · Ανοσία στη δηλητηρίαση' },
      { id: 'fortress',      tier: 7, requires: 'antidote',        active: true,  icon: '🏰', name: 'Φρούριο',            desc: 'Κοστίζει 25 Stamina · +40% άμυνα για 2 γύρους' },
      { id: 'resilience',    tier: 8, requires: 'fortress',        active: false, icon: '♻️', name: 'Ανάκαμψη',           desc: 'Παθητικό · +5 HP ανά 30s εκτός μάχης' },
      { id: 'unbreakable',   tier: 9, requires: 'resilience',      active: false, icon: '💎', name: 'Αδάμαντας',          desc: 'Παθητικό · 15% πιθανότητα να μηδενιστεί οποιοδήποτε χτύπημα' },
    ],
  },
  {
    id: 'utility',
    label: 'Πονηριά',
    icon: '🃏',
    nodes: [
      { id: 'second_wind',   tier: 0, requires: null,              active: false, icon: '💨', name: 'Δεύτερη Ανάσα',    desc: 'Παθητικό · Ανάσα αναπληρώνει +10 επιπλέον Stamina' },
      { id: 'pickpocket',    tier: 1, requires: 'second_wind',     active: false, icon: '🤏', name: 'Τσιμπολόγος',      desc: 'Παθητικό · +10% χρήματα από νίκες σε μάχη' },
      { id: 'ghost',         tier: 2, requires: 'pickpocket',      active: false, icon: '👻', name: 'Φάντασμα',         desc: 'Παθητικό · +5% αποφυγή χτυπημάτων' },
      { id: 'smooth_talker', tier: 3, requires: 'ghost',           active: false, icon: '🗣️', name: 'Γλυκόλαλος',       desc: 'Παθητικό · Εξόρμηση: +1 επιλογή διαπραγμάτευσης σε events' },
      { id: 'contacts',      tier: 4, requires: 'smooth_talker',   active: false, icon: '📞', name: 'Δίκτυο Επαφών',    desc: 'Παθητικό · +10% Crime XP από όλα τα εγκλήματα' },
      { id: 'shadowstep',    tier: 5, requires: 'contacts',        active: true,  icon: '🌑', name: 'Σκιά',             desc: 'Κοστίζει 15 Stamina · Αποφύγε όλα τα χτυπήματα για 1 γύρο' },
      { id: 'opportunist',   tier: 6, requires: 'shadowstep',      active: false, icon: '⭐', name: 'Ευκαιριστής',      desc: 'Παθητικό · Hot nodes στην Εξόρμηση δίνουν 2× rewards' },
      { id: 'moneybags',     tier: 7, requires: 'opportunist',     active: false, icon: '💰', name: 'Μεγαλέμπορος',    desc: 'Παθητικό · +15% μετρητά από κάθε πηγή' },
      { id: 'long_arm',      tier: 8, requires: 'moneybags',       active: false, icon: '🤝', name: 'Μακρύ Χέρι',      desc: 'Παθητικό · Πιθανότητα φυλάκισης −25%' },
      { id: 'untouchable',   tier: 9, requires: 'long_arm',        active: false, icon: '🎩', name: 'Άθικτος',          desc: 'Παθητικό · 20% να αποφύγεις σύλληψη σε αποτυχία εγκλήματος' },
    ],
  },
]

const allNodes   = columns.flatMap(c => c.nodes)
const abilityById = (id) => allNodes.find(n => n.id === id)

const isUnlocked = (id) => !!player.unlockedAbilities[id]
const isEquipped  = (id) => player.equippedAbilities.includes(id)

const unlockedCount = (col) => col.nodes.filter(n => isUnlocked(n.id)).length

const canUnlock = (node) => {
  if (isUnlocked(node.id)) return false
  if (player.abilityPoints < 1) return false
  if (node.requires && !isUnlocked(node.requires)) return false
  return true
}

function unlock(node) {
  if (!canUnlock(node)) return
  player.unlockedAbilities[node.id] = true
  player.abilityPoints--
  game.addNotification(`${node.icon} ${node.name} ξεκλειδώθηκε!`, 'success')
}

function toggleEquip(id) {
  if (isEquipped(id)) {
    player.equippedAbilities = player.equippedAbilities.filter(x => x !== id)
  } else {
    if (player.equippedAbilities.length >= 3) {
      game.addNotification('Μπορείς να εξοπλίσεις έως 3 ικανότητες!', 'warning')
      return
    }
    player.equippedAbilities = [...player.equippedAbilities, id]
  }
}

function unequip(id) {
  player.equippedAbilities = player.equippedAbilities.filter(x => x !== id)
}

function handleNodeClick(node) {
  if (isUnlocked(node.id) && node.active) toggleEquip(node.id)
  else if (canUnlock(node)) unlock(node)
}
</script>

<style scoped>
.mastery-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 640px;
  margin: 0 auto;
}

/* ── Header ── */
.mastery-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}
.mastery-title { margin: 0; font-size: var(--font-size-xl); }
.mastery-sub   { margin: 4px 0 0; font-size: var(--font-size-xs); }

.points-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, rgba(241,196,15,0.15), rgba(241,196,15,0.05));
  border: 1px solid rgba(241,196,15,0.5);
  border-radius: var(--border-radius-full);
  padding: var(--space-xs) var(--space-md);
  flex-shrink: 0;
}
.points-icon { font-size: 1.1rem; }
.points-num  { font-size: var(--font-size-xl); font-weight: 900; color: #f1c40f; font-family: var(--font-family-mono); }
.points-lbl  { font-size: var(--font-size-xs); color: var(--text-secondary); }

/* ── Equipped slots ── */
.equipped-section {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--space-md);
}
.equipped-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--space-sm);
}
.equipped-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}
.eq-slot {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  border: 1px dashed var(--border-color);
  background: var(--bg-base);
  min-height: 44px;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}
.eq-slot.filled {
  border-style: solid;
  border-color: rgba(241,196,15,0.4);
  background: rgba(241,196,15,0.06);
}
.eq-slot-icon { font-size: 1.2rem; flex-shrink: 0; }
.eq-slot-name { flex: 1; font-weight: var(--font-weight-bold); font-size: var(--font-size-xs); min-width: 0; }
.eq-remove {
  background: none; border: none; cursor: pointer;
  color: var(--text-secondary); font-size: 11px; padding: 2px 4px;
  border-radius: 4px; flex-shrink: 0;
}
.eq-remove:hover { color: var(--color-danger); background: rgba(231,76,60,0.1); }
.eq-empty-label { color: var(--text-secondary); font-size: var(--font-size-xs); font-style: italic; margin: auto; }

/* ── Tabs ── */
.tab-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
}

.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm) var(--space-xs);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
}
.tab-btn:hover { background: var(--bg-surface-raised); color: var(--text-primary); }

.tab-btn.active.tab-offense {
  border-color: rgba(231,76,60,0.5);
  background: rgba(231,76,60,0.08);
  color: #e74c3c;
}
.tab-btn.active.tab-defense {
  border-color: rgba(52,152,219,0.5);
  background: rgba(52,152,219,0.08);
  color: #3498db;
}
.tab-btn.active.tab-utility {
  border-color: rgba(155,89,182,0.5);
  background: rgba(155,89,182,0.08);
  color: #9b59b6;
}

.tab-icon  { font-size: 1.4rem; line-height: 1; }
.tab-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); }
.tab-count { font-size: 10px; color: var(--text-secondary); font-family: var(--font-family-mono); }
.tab-btn.active .tab-count { color: inherit; opacity: 0.7; }

/* ── Node list panel ── */
.tab-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

/* Connector between tiers */
.connector {
  height: 20px;
  width: 2px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.connector::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
}
.connector-active::before  { background: linear-gradient(180deg, rgba(46,204,113,0.6), rgba(46,204,113,0.2)); }
.connector-locked::before  { background: linear-gradient(180deg, rgba(127,140,141,0.3), rgba(127,140,141,0.1)); border-left: 2px dashed rgba(127,140,141,0.3); }

/* Node card */
.node-card {
  padding: var(--space-md);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.node-card:last-child { border-bottom: none; }
.node-card:hover:not(.node-locked) { background: var(--bg-surface-raised); }

.node-card.node-available { background: rgba(79,195,247,0.04); }
.node-card.node-available:hover { background: rgba(79,195,247,0.09); }
.node-card.node-unlocked  { background: rgba(46,204,113,0.05); }
.node-card.node-equipped  { background: rgba(241,196,15,0.07); }
.node-card.node-locked    { opacity: 0.45; cursor: default; }

.node-card.node-unlocked.node-theme-offense { background: rgba(231,76,60,0.06); }
.node-card.node-unlocked.node-theme-defense { background: rgba(52,152,219,0.06); }
.node-card.node-unlocked.node-theme-utility { background: rgba(155,89,182,0.06); }

.node-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
}
.node-icon { font-size: 1.6rem; line-height: 1; }
.node-badges { display: flex; gap: 4px; flex-wrap: wrap; }

.node-type-badge {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: var(--border-radius-full);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge-active   { background: rgba(231,76,60,0.15); color: #e74c3c; border: 1px solid rgba(231,76,60,0.3); }
.badge-passive  { background: rgba(52,152,219,0.15); color: #3498db; border: 1px solid rgba(52,152,219,0.3); }
.badge-equipped { background: rgba(241,196,15,0.2); color: #f1c40f; border: 1px solid rgba(241,196,15,0.4); }

.node-name { font-weight: var(--font-weight-bold); font-size: var(--font-size-sm); }
.node-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }

.node-action { margin-top: 4px; }

.node-btn {
  width: 100%;
  padding: 5px 10px;
  font-size: 11px;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
  transition: all var(--transition-fast);
  border: 1px solid;
}
.btn-unlock {
  background: rgba(79,195,247,0.1);
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.btn-unlock:hover { background: rgba(79,195,247,0.2); }
.btn-equip {
  background: rgba(46,204,113,0.1);
  border-color: #2ecc71;
  color: #2ecc71;
}
.btn-equip:hover { background: rgba(46,204,113,0.2); }
.btn-unequip {
  background: rgba(241,196,15,0.1);
  border-color: #f1c40f;
  color: #f1c40f;
}
.btn-unequip:hover { background: rgba(241,196,15,0.2); }

.node-passive-label { font-size: 11px; color: #2ecc71; }
.node-locked-label  { font-size: 11px; color: var(--text-secondary); }

@media (max-width: 480px) {
  .equipped-slots { grid-template-columns: 1fr; }
}
</style>
