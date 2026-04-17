<template>
  <div class="heist-page">
    <h2 class="page-title">🔫 Ριφιφί</h2>

    <!-- Top-level tabs -->
    <div class="tab-bar" style="margin-bottom: 1rem">
      <button :class="['tab-btn', mainTab === 'team' ? 'active' : '']" @click="mainTab = 'team'">🔫 Ομαδικό Ριφιφί</button>
      <button :class="['tab-btn', mainTab === 'boss' ? 'active' : '']" @click="mainTab = 'boss'">🏦 World Boss</button>
    </div>

    <!-- ===== WORLD BOSS TAB ===== -->
    <template v-if="mainTab === 'boss'">
      <WorldBoss />
    </template>

    <!-- ===== TEAM HEIST TAB ===== -->
    <template v-else>

    <!-- Active lobby -->
    <template v-if="heistStore.isInLobby && heistStore.lobby">
      <div class="card lobby-card">
        <div class="lobby-header">
          <span class="lobby-target-icon">{{ currentTarget?.icon }}</span>
          <div>
            <strong>{{ currentTarget?.name }}</strong>
            <span class="badge" :class="statusBadgeClass">{{ statusLabel }}</span>
          </div>
          <button class="btn btn-sm btn-outline btn-danger-outline" @click="leave" style="margin-left:auto">
            Αποχώρηση
          </button>
        </div>

        <!-- Member list -->
        <div class="members-grid">
          <div v-for="role in HEIST_ROLES" :key="role.id" class="role-slot" :class="{ filled: memberInRole(role.id) }">
            <span class="role-icon">{{ role.icon }}</span>
            <div class="role-info">
              <span class="role-name">{{ role.name }}</span>
              <span v-if="memberInRole(role.id)" class="role-player">{{ memberInRole(role.id).username }}</span>
              <span v-else class="text-muted">Κενό</span>
            </div>
            <span v-if="memberInRole(role.id)?.roll != null" class="role-roll">🎲{{ memberInRole(role.id).roll }}</span>
          </div>
        </div>

        <!-- Waiting state -->
        <div v-if="heistStore.lobby.status === 'waiting'" class="lobby-actions">
          <span v-if="!heistStore.lobbyFull" class="text-muted">Αναμονή για {{ 3 - heistStore.lobby.members.length }} ακόμα μέλη...</span>
          <button
            v-if="heistStore.isLeader && heistStore.lobbyFull"
            class="btn btn-primary"
            @click="start"
          >
            🚨 Ξεκίνα Ριφιφί!
          </button>
        </div>

        <!-- Active/rolling state -->
        <div v-if="heistStore.lobby.status === 'active'" class="lobby-rolling">
          <div class="rolling-info">🎲 Ρίξε τα ζάρια — αποτελέσματα σε εξέλιξη...</div>
          <div class="roll-display">
            <span v-for="m in heistStore.lobby.members" :key="m.userId" class="player-roll">
              {{ m.username }}: <strong>{{ m.roll ?? '?' }}</strong>
            </span>
          </div>
          <div v-if="totalRoll > 0" class="total-roll">
            Σύνολο: <strong>{{ totalRoll }}/18</strong>
          </div>
        </div>

        <!-- Completed/failed state -->
        <div v-if="heistStore.lobby.status === 'completed' || heistStore.lobby.status === 'failed'" class="lobby-result" :class="heistStore.lobby.status">
          <span v-if="heistStore.lobby.status === 'completed'">🎉 Ριφιφί επιτυχές!</span>
          <span v-else>💀 Ριφιφί απέτυχε!</span>
        </div>
      </div>
    </template>

    <!-- Tabs: Browse / Create -->
    <template v-else>
      <div class="tab-bar">
        <button :class="['tab-btn', tab === 'browse' ? 'active' : '']" @click="tab = 'browse'">🔍 Αναζήτηση</button>
        <button :class="['tab-btn', tab === 'create' ? 'active' : '']" @click="tab = 'create'">➕ Δημιουργία</button>
        <button :class="['tab-btn', tab === 'history' ? 'active' : '']" @click="tab = 'history'">📜 Ιστορικό</button>
      </div>

      <!-- Browse tab -->
      <div v-if="tab === 'browse'">
        <div class="card text-center" style="margin-bottom: 1rem">
          <button class="btn btn-sm btn-outline" @click="heistStore.fetchPublicLobbies()">🔄 Ανανέωση</button>
        </div>
        <div v-if="heistStore.publicLobbies.length === 0" class="card text-center text-muted">
          Δεν υπάρχουν ανοιχτά lobbies.
        </div>
        <div v-for="lobby in heistStore.publicLobbies" :key="lobby.id" class="card lobby-row">
          <div class="lr-header">
            <span>{{ targetById(lobby.targetId)?.icon }} {{ targetById(lobby.targetId)?.name }}</span>
            <span class="text-muted lr-slots">{{ lobby.members.length }}/3 μέλη</span>
          </div>
          <div class="lr-roles">
            <span v-for="role in HEIST_ROLES" :key="role.id" class="role-pill" :class="{ taken: roleInLobby(lobby, role.id) }">
              {{ role.icon }} {{ role.name }}
            </span>
          </div>
          <div class="lr-actions">
            <button
              v-for="role in HEIST_ROLES.filter(r => !roleInLobby(lobby, r.id))"
              :key="role.id"
              class="btn btn-sm btn-outline"
              :disabled="!canJoin(lobby.targetId)"
              @click="join(lobby.id, role.id)"
            >
              {{ role.icon }} Μπες ως {{ role.name }}
            </button>
          </div>
          <div v-if="!canJoin(lobby.targetId)" class="text-muted" style="font-size:0.75rem">
            {{ joinBlockedReason(lobby.targetId) }}
          </div>
        </div>
      </div>

      <!-- Create tab -->
      <div v-if="tab === 'create'">
        <div v-for="target in HEIST_TARGETS" :key="target.id" class="card heist-target-card">
          <div class="ht-header">
            <span class="ht-icon">{{ target.icon }}</span>
            <div class="ht-info">
              <strong>{{ target.name }}</strong>
              <p class="text-muted ht-desc">{{ target.description }}</p>
            </div>
          </div>
          <div class="ht-stats">
            <span>Επίπεδο: {{ target.requiredLevel }}+</span>
            <span>Ζάρια: {{ target.minTotalRoll }}+/18</span>
            <span>Βρώμικα: €{{ target.payoutDirtyMin.toLocaleString() }}–€{{ target.payoutDirtyMax.toLocaleString() }}</span>
            <span>Κέβλαρ: x{{ target.payoutKevlar }}</span>
          </div>
          <div v-if="heistStore.cooldownRemaining(target.id) > 0" class="text-muted" style="font-size:0.8rem">
            Cooldown: {{ formatMs(heistStore.cooldownRemaining(target.id)) }}
          </div>
          <div v-else class="ht-roles">
            <span class="text-muted" style="font-size:0.8rem">Επίλεξε ρόλο:</span>
            <div class="role-buttons">
              <button
                v-for="role in HEIST_ROLES"
                :key="role.id"
                class="btn btn-sm btn-outline"
                :disabled="!heistStore.canJoinHeist(target.id)"
                @click="create(target.id, role.id)"
              >
                {{ role.icon }} {{ role.name }}
              </button>
            </div>
          </div>
          <div v-if="!heistStore.canJoinHeist(target.id)" class="text-muted" style="font-size:0.75rem">
            {{ joinBlockedReason(target.id) }}
          </div>
        </div>
      </div>

      <!-- History tab -->
      <div v-if="tab === 'history'">
        <div v-if="heistStore.heistHistory.length === 0" class="card text-center text-muted">
          Δεν έχεις ακόμα ιστορικό ριφιφί.
        </div>
        <div v-for="(h, i) in heistStore.heistHistory" :key="i" class="card history-row" :class="h.outcome">
          <span>{{ targetById(h.targetId)?.icon }} {{ targetById(h.targetId)?.name }}</span>
          <span :class="h.outcome === 'success' ? 'text-success' : 'text-danger'">
            {{ h.outcome === 'success' ? '✅ Επιτυχία' : '❌ Αποτυχία' }}
          </span>
          <span class="text-muted">Ζάρια: {{ h.totalRoll }}</span>
          <span v-if="h.payoutDirty > 0">€{{ h.payoutDirty.toLocaleString() }} βρώμικα</span>
        </div>
      </div>
    </template>
    <!-- end team heist -->
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useHeistStore } from '../stores/heistStore'
import { HEIST_TARGETS, HEIST_ROLES, getHeistTargetById } from '../data/heists'
import { usePlayerStore } from '../stores/playerStore'
import WorldBoss from '../components/WorldBoss.vue'

const heistStore = useHeistStore()
const player = usePlayerStore()
const mainTab = ref('team')
const tab = ref('browse')

const currentTarget = computed(() => getHeistTargetById(heistStore.lobby?.targetId))

const statusLabel = computed(() => {
  const map = { waiting: 'Αναμονή', active: 'Ενεργό', completed: 'Ολοκληρώθηκε', failed: 'Απέτυχε' }
  return map[heistStore.lobby?.status] ?? ''
})

const statusBadgeClass = computed(() => {
  const map = { waiting: 'badge-info', active: 'badge-warning', completed: 'badge-success', failed: 'badge-danger' }
  return map[heistStore.lobby?.status] ?? ''
})

const totalRoll = computed(() =>
  (heistStore.lobby?.members || []).reduce((s, m) => s + (m.roll ?? 0), 0)
)

function memberInRole(roleId) {
  return (heistStore.lobby?.members || []).find(m => m.role === roleId)
}

function targetById(id) { return getHeistTargetById(id) }

function roleInLobby(lobby, roleId) {
  return (lobby.members || []).some(m => m.role === roleId)
}

function canJoin(targetId) {
  return heistStore.canJoinHeist(targetId)
}

function joinBlockedReason(targetId) {
  const target = getHeistTargetById(targetId)
  if (!target) return ''
  if (player.level < target.requiredLevel) return `Χρειάζεσαι Επίπεδο ${target.requiredLevel}`
  if (heistStore.cooldownRemaining(targetId) > 0) return `Cooldown: ${formatMs(heistStore.cooldownRemaining(targetId))}`
  return ''
}

async function create(targetId, role) {
  await heistStore.createLobby(targetId, role)
}

async function join(lobbyId, role) {
  await heistStore.joinLobby(lobbyId, role)
}

async function leave() {
  await heistStore.leaveLobby()
}

async function start() {
  await heistStore.startHeist()
}

function formatMs(ms) {
  if (ms <= 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}ω ${m}λ`
  return `${m}λ`
}
</script>

<style scoped>
.heist-page { padding-bottom: 2rem; }
.page-subtitle { margin-top: -0.5rem; margin-bottom: 1.5rem; font-size: 0.85rem; }

.tab-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.tab-btn { padding: 0.4rem 1rem; border-radius: 6px; border: 1px solid var(--border-color); background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.85rem; }
.tab-btn.active { background: var(--accent, #7c3aed); color: #fff; border-color: var(--accent, #7c3aed); }

.lobby-card { border-left: 4px solid #FF9800; }

.lobby-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.lobby-target-icon { font-size: 2rem; }

.members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }

.role-slot {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.5;
}
.role-slot.filled { opacity: 1; border-color: #4CAF50; }

.role-icon { font-size: 1.5rem; }
.role-info { flex: 1; display: flex; flex-direction: column; }
.role-name { font-size: 0.85rem; font-weight: 600; }
.role-player { font-size: 0.75rem; color: #4CAF50; }
.role-roll { font-size: 1rem; font-weight: bold; color: #FF9800; }

.lobby-actions { display: flex; align-items: center; gap: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color); }
.lobby-rolling { padding-top: 0.5rem; border-top: 1px solid var(--border-color); }
.rolling-info { font-size: 0.85rem; color: #FF9800; margin-bottom: 0.5rem; }
.roll-display { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.player-roll { font-size: 0.85rem; }
.total-roll { font-size: 1rem; }
.lobby-result { padding: 0.75rem; border-radius: 8px; font-size: 1rem; font-weight: 600; }
.lobby-result.completed { background: rgba(76, 175, 80, 0.15); color: #4CAF50; }
.lobby-result.failed { background: rgba(229, 57, 53, 0.15); color: #E53935; }

.lobby-row { margin-bottom: 0.75rem; }
.lr-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 600; }
.lr-slots { font-size: 0.8rem; }
.lr-roles { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.role-pill { font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; border: 1px solid #555; color: #aaa; }
.role-pill.taken { border-color: #E53935; color: #E53935; }
.lr-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.heist-target-card { margin-bottom: 1rem; }
.ht-header { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; }
.ht-icon { font-size: 2rem; }
.ht-desc { font-size: 0.8rem; margin: 0.2rem 0 0; }
.ht-stats { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem; }
.ht-roles { margin-top: 0.5rem; }
.role-buttons { display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }

.history-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; margin-bottom: 0.5rem; }
</style>
