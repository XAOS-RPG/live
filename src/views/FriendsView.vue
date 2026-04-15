<template>
  <div class="friends-page">
    <h2 class="page-title">👥 Φίλοι</h2>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: tab === 'friends' }" @click="tab = 'friends'">
        👥 Φίλοι
        <span v-if="store.friends.length" class="count-badge">{{ store.friends.length }}</span>
      </button>
      <button class="tab-btn" :class="{ active: tab === 'incoming' }" @click="tab = 'incoming'">
        📩 Αιτήματα
        <span v-if="store.incoming.length" class="count-badge pending-badge">{{ store.incoming.length }}</span>
      </button>
      <button class="tab-btn" :class="{ active: tab === 'outgoing' }" @click="tab = 'outgoing'">
        📤 Σταλμένα
        <span v-if="store.outgoing.length" class="count-badge">{{ store.outgoing.length }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="card text-center text-muted">Φόρτωση...</div>

    <!-- Error -->
    <div v-else-if="store.error" class="card text-center" style="color:var(--color-danger)">
      ⚠️ {{ store.error }}
    </div>

    <template v-else>

      <!-- ── ACCEPTED FRIENDS ── -->
      <template v-if="tab === 'friends'">
        <div v-if="!store.friends.length" class="card text-center text-muted">
          Δεν έχεις φίλους ακόμα. Στείλε αίτημα από την Κατάταξη ή τα Συμβόλαια!
        </div>
        <div v-for="row in store.friends" :key="row.id" class="card friend-card">
          <div class="friend-info" style="cursor:pointer" @click="router.push(`/player/${friendId(row)}`)">
            <span class="friend-icon">👤</span>
            <div class="friend-meta">
              <strong class="clickable-name">{{ friendName(row) }}</strong>
              <span class="text-muted sub">Επ. {{ friendLevel(row) }}</span>
            </div>
          </div>
          <button
            class="btn btn-sm btn-outline danger-btn"
            :disabled="busy === row.id"
            @click="remove(row)"
          >
            {{ busy === row.id ? '...' : '✕ Αφαίρεση' }}
          </button>
        </div>
      </template>

      <!-- ── INCOMING REQUESTS ── -->
      <template v-else-if="tab === 'incoming'">
        <div v-if="!store.incoming.length" class="card text-center text-muted">
          Δεν υπάρχουν εκκρεμή αιτήματα.
        </div>
        <div v-for="row in store.incoming" :key="row.id" class="card friend-card">
          <div class="friend-info">
            <span class="friend-icon">👤</span>
            <div class="friend-meta">
              <strong>{{ row.requester_username }}</strong>
              <span class="text-muted sub">Επ. {{ row.requester_level }} · θέλει να γίνει φίλος</span>
            </div>
          </div>
          <div class="req-actions">
            <button
              class="btn btn-sm btn-success"
              :disabled="busy === row.id"
              @click="accept(row)"
            >✓ Αποδοχή</button>
            <button
              class="btn btn-sm btn-outline"
              :disabled="busy === row.id"
              @click="decline(row)"
            >✕</button>
          </div>
        </div>
      </template>

      <!-- ── OUTGOING REQUESTS ── -->
      <template v-else>
        <div v-if="!store.outgoing.length" class="card text-center text-muted">
          Δεν έχεις στείλει αιτήματα.
        </div>
        <div v-for="row in store.outgoing" :key="row.id" class="card friend-card">
          <div class="friend-info">
            <span class="friend-icon">👤</span>
            <div class="friend-meta">
              <strong>{{ row.recipient_username }}</strong>
              <span class="text-muted sub">Επ. {{ row.recipient_level }} · αναμένει απάντηση</span>
            </div>
          </div>
          <button
            class="btn btn-sm btn-outline"
            :disabled="busy === row.id"
            @click="cancel(row)"
          >
            {{ busy === row.id ? '...' : 'Ακύρωση' }}
          </button>
        </div>
      </template>

    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFriendStore } from '../stores/friendStore'
import { useGameStore } from '../stores/gameStore'

const store    = useFriendStore()
const auth     = useAuthStore()
const game     = useGameStore()
const router   = useRouter()
const tab      = ref('friends')
const busy     = ref(null)

onMounted(() => store.fetchFriends())

function friendId(row) {
  const me = auth.user?.id
  return row.user_id === me ? row.friend_id : row.user_id
}

function friendName(row) {
  const me = auth.user?.id
  if (row.user_id === me) return row.recipient_username
  return row.requester_username
}
function friendLevel(row) {
  const me = auth.user?.id
  if (row.user_id === me) return row.recipient_level
  return row.requester_level
}

async function accept(row) {
  busy.value = row.id
  const res = await store.acceptRequest(row.id)
  busy.value = null
  game.addNotification(res.ok ? 'Αίτημα αποδεκτό!' : res.message, res.ok ? 'success' : 'danger')
  if (res.ok) tab.value = 'friends'
}

async function decline(row) {
  busy.value = row.id
  const res = await store.declineRequest(row.id)
  busy.value = null
  game.addNotification(res.ok ? 'Αίτημα απορρίφθηκε.' : res.message, res.ok ? 'info' : 'danger')
}

async function cancel(row) {
  busy.value = row.id
  const res = await store.declineRequest(row.id)
  busy.value = null
  game.addNotification(res.ok ? 'Αίτημα ακυρώθηκε.' : res.message, res.ok ? 'info' : 'danger')
}

async function remove(row) {
  busy.value = row.id
  const res = await store.removeFriend(row.id)
  busy.value = null
  game.addNotification(res.ok ? 'Αφαιρέθηκε από τους φίλους.' : res.message, res.ok ? 'info' : 'danger')
}
</script>

<style scoped>
.friends-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); }

.tab-bar {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tab-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--bg-base);
}
.tab-btn:hover:not(.active) { background: var(--bg-surface-raised); }

.count-badge {
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-full);
  padding: 0 6px;
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  min-width: 18px;
  text-align: center;
}
.pending-badge {
  background: var(--color-danger);
  color: #fff;
}

.friend-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
}

.friend-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.friend-icon { font-size: 26px; flex-shrink: 0; }

.friend-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.friend-meta strong { font-size: var(--font-size-sm); }
.sub { font-size: var(--font-size-xs); }

.req-actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.clickable-name {
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.clickable-name:hover { color: var(--color-accent); }

.danger-btn { border-color: rgba(231,76,60,0.35); }
.danger-btn:hover { border-color: var(--color-danger); color: var(--color-danger); }

.btn-success {
  background: var(--color-success, #27ae60);
  border-color: var(--color-success, #27ae60);
  color: #fff;
}
.btn-success:hover { opacity: 0.85; }
</style>
