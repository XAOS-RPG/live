<template>
  <div class="pub-profile-page">

    <!-- Loading -->
    <div v-if="loading" class="card text-center text-muted">
      ⏳ Φόρτωση προφίλ...
    </div>

    <!-- Not found -->
    <div v-else-if="!target" class="card text-center text-muted">
      ❌ Ο παίκτης δεν βρέθηκε.
    </div>

    <template v-else>

      <!-- ── Header card ── -->
      <div class="card profile-header">
        <div class="avatar">👤</div>
        <div class="header-info">
          <h2 class="username">{{ target.name || target.username }}</h2>
          <span class="text-muted sub">@{{ target.username }}</span>
          <div class="badges">
            <span class="badge badge-info">Επ. {{ target.level }}</span>
            <span class="badge badge-secondary">{{ rankTitle(target.level) }}</span>
            <span
              class="badge"
              :class="target.status === 'free' ? 'badge-success' : 'badge-danger'"
            >
              {{ statusLabel(target.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Stats card ── -->
      <div class="card stats-card">
        <div class="stats-title text-muted">Στατιστικά Μάχης</div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">STR</span>
            <span class="stat-val">{{ target.stats?.strength ?? '?' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">SPD</span>
            <span class="stat-val">{{ target.stats?.speed ?? '?' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">DEX</span>
            <span class="stat-val">{{ target.stats?.dexterity ?? '?' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">DEF</span>
            <span class="stat-val">{{ target.stats?.defense ?? '?' }}</span>
          </div>
        </div>
      </div>

      <!-- ── HP bar (public info) ── -->
      <div class="card hp-card">
        <div class="hp-label">
          <span>❤️ HP</span>
          <span class="text-muted">
            {{ target.resources?.hp?.current ?? '?' }} / {{ target.resources?.hp?.max ?? '?' }}
          </span>
        </div>
        <div class="hp-track">
          <div class="hp-fill" :class="hpClass" :style="{ width: hpPct + '%' }"></div>
        </div>
      </div>

      <!-- ── Action buttons ── -->
      <div class="action-row">

        <!-- Friend button -->
        <template v-if="!isSelf">
          <button
            v-if="friendRelation === 'accepted'"
            class="btn btn-outline friend-btn"
            disabled
          >
            ✅ Φίλος
          </button>
          <button
            v-else-if="friendRelation === 'pending_out'"
            class="btn btn-outline friend-btn"
            disabled
          >
            ⏳ Εκκρεμεί
          </button>
          <button
            v-else-if="friendRelation === 'pending_in'"
            class="btn btn-outline friend-btn"
            :disabled="friendBusy"
            @click="acceptFriend"
          >
            {{ friendBusy ? '...' : '✓ Αποδοχή φιλίας' }}
          </button>
          <button
            v-else
            class="btn btn-outline friend-btn"
            :disabled="friendBusy"
            @click="sendFriend"
          >
            {{ friendBusy ? '...' : '+ Φίλος' }}
          </button>
        </template>

        <!-- Attack button -->
        <button
          v-if="!isSelf"
          class="btn btn-danger attack-btn"
          :disabled="!canAttack"
          @click="initiateAttack"
        >
          ⚔️ Επίθεση
        </button>

      </div>

      <!-- Can't attack reason -->
      <div v-if="!isSelf && !canAttack" class="card text-center text-muted cant-reason">
        <span v-if="player.isIncapacitated">Δεν μπορείς να επιτεθείς ενώ είσαι στο νοσοκομείο ή φυλακή.</span>
        <span v-else-if="target.status !== 'free'">Ο στόχος δεν είναι διαθέσιμος ({{ statusLabel(target.status) }}).</span>
        <span v-else-if="player.resources.energy.current < ATTACK_ENERGY_COST">Χρειάζεσαι {{ ATTACK_ENERGY_COST }}⚡ ενέργεια.</span>
      </div>

      <!-- ── Recent combat log (own view) ── -->
      <div v-if="attackLogs.length" class="card log-card">
        <div class="log-title text-muted">Ιστορικό Μαχών</div>
        <div v-for="log in attackLogs" :key="log.id" class="log-row">
          <span class="log-icon">{{ logIcon(log) }}</span>
          <span class="log-text">{{ logText(log) }}</span>
          <span class="log-cash text-mono" :class="log.cash_stolen > 0 ? 'text-success' : 'text-muted'">
            {{ log.cash_stolen > 0 ? '+€' + log.cash_stolen.toLocaleString('el-GR') : '' }}
          </span>
          <span class="log-time text-muted">{{ timeAgo(log.created_at) }}</span>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../stores/authStore'
import { usePlayerStore } from '../stores/playerStore'
import { useFriendStore } from '../stores/friendStore'
import { useGameStore } from '../stores/gameStore'

const ATTACK_ENERGY_COST = 25

const route       = useRoute()
const auth        = useAuthStore()
const player      = usePlayerStore()
const friendStore = useFriendStore()
const game        = useGameStore()

const targetId  = route.params.id
const target    = ref(null)
const loading   = ref(true)
const attackLogs = ref([])
const friendBusy = ref(false)

// ── Derived ────────────────────────────────────────────────

const isSelf = computed(() => auth.user?.id === targetId)

const canAttack = computed(() => {
  if (!target.value || isSelf.value) return false
  if (player.isIncapacitated) return false
  if (target.value.status !== 'free') return false
  if (player.resources.energy.current < ATTACK_ENERGY_COST) return false
  return true
})

const hpPct = computed(() => {
  const hp = target.value?.resources?.hp
  if (!hp) return 0
  return Math.max(0, Math.min(100, (hp.current / hp.max) * 100))
})

const hpClass = computed(() => {
  if (hpPct.value > 60) return 'hp-hi'
  if (hpPct.value > 30) return 'hp-mid'
  return 'hp-lo'
})

// Determine the current friend relationship status with this target
const friendRelation = computed(() => {
  const me = auth.user?.id
  if (!me || !targetId) return null

  const accepted = friendStore.friends.find(r =>
    (r.user_id === me && r.friend_id === targetId) ||
    (r.user_id === targetId && r.friend_id === me)
  )
  if (accepted) return 'accepted'

  const outgoing = friendStore.outgoing.find(r => r.friend_id === targetId)
  if (outgoing) return 'pending_out'

  const incoming = friendStore.incoming.find(r => r.user_id === targetId)
  if (incoming) return { status: 'pending_in', id: incoming.id }

  return null
})

// ── Helpers ────────────────────────────────────────────────

const RANK_TITLES = [
  { level: 1,  title: 'Αρχάριος' },
  { level: 3,  title: 'Αδαής' },
  { level: 5,  title: 'Μαθητευόμενος' },
  { level: 8,  title: 'Ικανός' },
  { level: 12, title: 'Έμπειρος' },
  { level: 16, title: 'Επαγγελματίας' },
  { level: 20, title: 'Επικίνδυνος' },
  { level: 25, title: 'Τρομερός' },
  { level: 30, title: 'Θρυλικός' },
]

function rankTitle(level) {
  let t = RANK_TITLES[0].title
  for (const r of RANK_TITLES) { if (level >= r.level) t = r.title }
  return t
}

function statusLabel(s) {
  if (s === 'free')     return 'Ελεύθερος'
  if (s === 'hospital') return '🏥 Νοσοκομείο'
  if (s === 'jail')     return '🔒 Φυλακή'
  return s
}

function logIcon(log) {
  const me = auth.user?.id
  if (log.result === 'escaped') return '🏃'
  const iWon = (log.attacker_id === me && log.result === 'attacker_won') ||
               (log.defender_id === me && log.result === 'defender_won')
  return iWon ? '🏆' : '💀'
}

function logText(log) {
  const me = auth.user?.id
  const name = target.value?.name || target.value?.username || 'Άγνωστος'
  if (log.attacker_id === me) {
    if (log.result === 'attacker_won') return `Νίκη εναντίον ${name}`
    if (log.result === 'defender_won') return `Ήττα από ${name}`
    return `Δραπέτευσες από ${name}`
  }
  if (log.result === 'defender_won') return `Απέκρουσες επίθεση από ${name}`
  if (log.result === 'attacker_won') return `Ηττήθηκες από ${name}`
  return `${name} δραπέτευσε`
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'μόλις τώρα'
  if (m < 60) return `${m}λ πριν`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}ω πριν`
  return `${Math.floor(h / 24)}μ πριν`
}

// ── Data fetching ──────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    fetchTarget(),
    friendStore.fetchFriends(),
    fetchAttackLogs(),
  ])
  loading.value = false
})

async function fetchTarget() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, name, level, status, stats, resources')
    .eq('id', targetId)
    .single()

  if (error) {
    console.error('PublicProfileView: failed to fetch target', error)
    return
  }
  target.value = data
}

async function fetchAttackLogs() {
  const me = auth.user?.id
  if (!me) return

  const { data, error } = await supabase
    .from('attack_logs')
    .select('id, attacker_id, defender_id, result, cash_stolen, created_at')
    .or(`attacker_id.eq.${me},defender_id.eq.${me}`)
    .or(`attacker_id.eq.${targetId},defender_id.eq.${targetId}`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!error && data) {
    // Keep only rows that involve BOTH the current user and this target
    attackLogs.value = data.filter(r =>
      (r.attacker_id === me || r.defender_id === me) &&
      (r.attacker_id === targetId || r.defender_id === targetId)
    )
  }
}

// ── Actions ────────────────────────────────────────────────

async function sendFriend() {
  friendBusy.value = true
  const res = await friendStore.sendRequest(targetId)
  friendBusy.value = false
  game.addNotification(
    res.ok ? 'Αίτημα φιλίας στάλθηκε!' : res.message,
    res.ok ? 'success' : 'warning'
  )
}

async function acceptFriend() {
  const rel = friendRelation.value
  if (!rel || rel.status !== 'pending_in') return
  friendBusy.value = true
  const res = await friendStore.acceptRequest(rel.id)
  friendBusy.value = false
  game.addNotification(
    res.ok ? 'Αίτημα φιλίας αποδεκτό!' : res.message,
    res.ok ? 'success' : 'danger'
  )
}

function initiateAttack() {
  if (!canAttack.value) return
  // Full async PvP logic will be wired here in the next step.
  console.log('[PvP] Initiating attack on target:', targetId, target.value)
  game.addNotification(`Επίθεση σε ${target.value.name || target.value.username} — σύντομα διαθέσιμο!`, 'info')
}
</script>

<style scoped>
.pub-profile-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 600px;
  margin: 0 auto;
}

/* ── Header ── */
.profile-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
}

.avatar {
  font-size: 3.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.username {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.sub { font-size: var(--font-size-xs); }

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: 2px;
}

/* ── Stats ── */
.stats-card { padding: var(--space-md); }

.stats-title {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  padding: var(--space-sm) var(--space-xs);
}

.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  font-family: var(--font-family-mono);
}

.stat-val {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent);
}

/* ── HP bar ── */
.hp-card { padding: var(--space-sm) var(--space-md); }

.hp-label {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  margin-bottom: 4px;
}

.hp-track {
  height: 10px;
  background: var(--bg-surface-raised);
  border-radius: 5px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
}

.hp-hi  { background: linear-gradient(90deg, #27ae60, #2ecc71); }
.hp-mid { background: linear-gradient(90deg, #e67e22, #f39c12); }
.hp-lo  { background: linear-gradient(90deg, #c0392b, #e74c3c); }

/* ── Actions ── */
.action-row {
  display: flex;
  gap: var(--space-sm);
}

.friend-btn {
  flex: 1;
  border-color: rgba(79,195,247,0.4);
}
.friend-btn:hover:not(:disabled) { border-color: var(--color-accent); }

.attack-btn {
  flex: 1;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-md);
  letter-spacing: 0.03em;
}

.cant-reason {
  font-size: var(--font-size-xs);
  padding: var(--space-xs) var(--space-md);
}

/* ── Log ── */
.log-card { padding: var(--space-md); }

.log-title {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
}

.log-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--border-color);
  font-size: var(--font-size-xs);
}

.log-row:last-child { border-bottom: none; }

.log-icon { font-size: 16px; flex-shrink: 0; }
.log-text { flex: 1; min-width: 0; }
.log-cash { flex-shrink: 0; }
.log-time { flex-shrink: 0; color: var(--text-secondary); }
</style>
