<template>
  <div class="bounty-page">
    <h2 class="page-title">🎯 Συμβόλαια Θανάτου</h2>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: tab === 'list' }" @click="tab = 'list'">📋 Ενεργά</button>
      <button class="tab-btn" :class="{ active: tab === 'place' }" @click="tab = 'place'">➕ Τοποθέτηση</button>
      <button class="tab-btn" :class="{ active: tab === 'mine' }" @click="tab = 'mine'">
        👤 Δικά μου
        <span v-if="bountyStore.playerBounties.length" class="count-badge">{{ bountyStore.playerBounties.length }}</span>
      </button>
    </div>

    <!-- Info bar -->
    <div class="card info-bar text-muted">
      <span>⚡ {{ player.resources.energy.current }}/{{ player.resources.energy.max }}</span>
      <span>💰 €{{ formatCash(player.cash) }}</span>
      <span>🏅 {{ player.filotimo }} Φιλότιμο</span>
    </div>

    <!-- Hunt result notification -->
    <Transition name="fade">
      <div v-if="huntResult" class="card" :class="huntResult.won ? 'result-success' : 'result-fail'">
        <template v-if="huntResult.won">
          ✅ Νίκη! Εξουδετέρωσες τον {{ huntResult.targetName }} και εισέπραξες €{{ formatCash(huntResult.reward) }}! +2 Φιλότιμο
        </template>
        <template v-else>
          ❌ Αποτυχία! Ο {{ huntResult.targetName }} ήταν πολύ δυνατός. Έχασες {{ huntResult.hpLost }} HP.
        </template>
      </div>
    </Transition>

    <!-- ACTIVE BOUNTIES -->
    <template v-if="tab === 'list'">
      <div v-if="!bountyStore.activeBounties.length" class="card text-center text-muted">
        Δεν υπάρχουν ενεργά συμβόλαια αυτή τη στιγμή.
      </div>

      <div
        v-for="bounty in bountyStore.activeBounties"
        :key="bounty.id"
        class="card bounty-card"
        :class="{ 'player-bounty': bounty.isPlayerBounty }"
      >
        <div class="bounty-top">
          <span class="bounty-icon">{{ bounty.targetIcon }}</span>
          <div class="bounty-info">
            <strong class="bounty-name">{{ bounty.targetName }}</strong>
            <span class="text-muted bounty-sub">Επ. {{ bounty.targetLevel }}</span>
            <div class="bounty-stats">
              <span class="opp-stat">STR {{ bounty.targetStats.strength }}</span>
              <span class="opp-stat">SPD {{ bounty.targetStats.speed }}</span>
              <span class="opp-stat">DEX {{ bounty.targetStats.dexterity }}</span>
              <span class="opp-stat">DEF {{ bounty.targetStats.defense }}</span>
            </div>
          </div>
          <div class="bounty-reward">
            <span class="reward-amount text-success text-mono">€{{ formatCash(bounty.reward) }}</span>
            <span class="text-muted reward-by">από {{ bounty.placedByIcon }} {{ bounty.placedBy }}</span>
          </div>
        </div>

        <div class="bounty-footer">
          <span class="text-muted expiry">⏰ {{ formatExpiry(bounty.expiresAt) }}</span>
          <button
            class="btn btn-sm btn-danger"
            :disabled="!canHunt(bounty)"
            @click="hunt(bounty)"
          >
            🔫 Κυνήγι ({{ bounty.energyCost }}⚡)
          </button>
        </div>

        <div v-if="!canHunt(bounty)" class="text-muted cant-hunt">
          <span v-if="player.resources.energy.current < bounty.energyCost">Ανεπαρκής ενέργεια</span>
          <span v-else-if="player.isIncapacitated">Δεν μπορείς να κυνηγάς ενώ είσαι ανήμπορος</span>
        </div>
      </div>
    </template>

    <!-- PLACE BOUNTY -->
    <template v-else-if="tab === 'place'">
      <div class="card text-muted" style="font-size:var(--font-size-xs); text-align:center;">
        Βάλε κεφαλή σε παίκτη. Ελάχιστο ποσό: €100. Ισχύει 48 ώρες.
      </div>

      <div v-if="selectedTarget" class="card place-form">
        <div class="pf-target">
          <span class="pf-icon">{{ selectedTarget.icon }}</span>
          <div>
            <strong>{{ selectedTarget.nickname }}</strong>
            <span class="text-muted" style="font-size:var(--font-size-xs); display:block;">Επ. {{ selectedTarget.level }}</span>
          </div>
          <button class="btn btn-sm btn-outline" @click="selectedTarget = null">✕ Αλλαγή</button>
        </div>
        <div class="pf-amount">
          <label class="text-muted" style="font-size:var(--font-size-xs);">Ποσό Συμβολαίου (€)</label>
          <input
            v-model.number="bountyAmount"
            type="number"
            min="100"
            :max="player.cash"
            class="input-field"
            placeholder="Ελάχιστο €100"
          />
        </div>
        <button
          class="btn btn-danger btn-block"
          :disabled="bountyAmount < 100 || player.cash < bountyAmount"
          @click="placeBounty"
        >
          🎯 Τοποθέτηση Συμβολαίου — €{{ formatCash(bountyAmount) }}
        </button>
      </div>

      <template v-else>
        <div class="card text-muted" style="font-size:var(--font-size-xs);">Επίλεξε στόχο:</div>
        <div
          v-for="user in availableTargets"
          :key="user.id"
          class="card target-card"
          @click="selectedTarget = user"
        >
          <span class="target-icon">{{ user.icon }}</span>
          <div class="target-info">
            <strong>{{ user.nickname }}</strong>
            <span class="text-muted" style="font-size:var(--font-size-xs);">Επ. {{ user.level }} · {{ user.location }}</span>
          </div>
          <span class="badge badge-info">Επ. {{ user.level }}</span>
        </div>
      </template>
    </template>

    <!-- MY BOUNTIES -->
    <template v-else>
      <div v-if="!bountyStore.playerBounties.length" class="card text-center text-muted">
        Δεν έχεις τοποθετήσει κανένα συμβόλαιο.
      </div>

      <div
        v-for="bounty in bountyStore.playerBounties"
        :key="bounty.id"
        class="card bounty-card player-bounty"
      >
        <div class="bounty-top">
          <span class="bounty-icon">{{ bounty.targetIcon }}</span>
          <div class="bounty-info">
            <strong class="bounty-name">{{ bounty.targetName }}</strong>
            <span class="text-muted bounty-sub">Επ. {{ bounty.targetLevel }}</span>
          </div>
          <div class="bounty-reward">
            <span class="reward-amount text-success text-mono">€{{ formatCash(bounty.reward) }}</span>
          </div>
        </div>
        <div class="bounty-footer">
          <span class="text-muted expiry">⏰ {{ formatExpiry(bounty.expiresAt) }}</span>
          <button class="btn btn-sm btn-outline" @click="cancelBounty(bounty.id)">
            Ακύρωση (+€{{ formatCash(bounty.reward) }})
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useBountyStore } from '../stores/bountyStore'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'
import { fakeUsers } from '../data/fakeUsers'

const bountyStore = useBountyStore()
const player = usePlayerStore()
const gameStore = useGameStore()

const tab = ref('list')
const selectedTarget = ref(null)
const bountyAmount = ref(100)
const huntResult = ref(null)

const availableTargets = fakeUsers

function formatCash(n) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(n))
}

function formatExpiry(ts) {
  const diff = ts - Date.now()
  if (diff <= 0) return 'Έληξε'
  const hrs = Math.floor(diff / 3600000)
  const min = Math.floor((diff % 3600000) / 60000)
  if (hrs > 0) return `${hrs}ω ${min}λ απομένει`
  return `${min} λεπτά απομένει`
}

function canHunt(bounty) {
  return player.resources.energy.current >= bounty.energyCost && !player.isIncapacitated
}

function hunt(bounty) {
  if (!canHunt(bounty)) return

  player.modifyResource('energy', -bounty.energyCost)
  const result = bountyStore.huntBounty(bounty.id, player.stats, player.resources.hp.current)
  if (!result) return

  huntResult.value = result

  if (result.won) {
    player.addCash(result.reward)
    player.addFilotimo(2)
    player.addMeson(1)
    player.logActivity(`🎯 Κυνήγι: Νίκη vs ${result.targetName} +€${result.reward}`, 'success')
    gameStore.addNotification(`Συμβόλαιο εκπληρώθηκε! +€${formatCash(result.reward)}`, 'success')
  } else {
    player.modifyResource('hp', -result.hpLost)
    player.logActivity(`🎯 Κυνήγι: Ήττα vs ${result.targetName} -${result.hpLost}HP`, 'danger')
    gameStore.addNotification(`Αποτυχημένο κυνήγι! -${result.hpLost} HP`, 'danger')
  }

  gameStore.saveGame()

  setTimeout(() => { huntResult.value = null }, 4000)
}

function placeBounty() {
  if (!selectedTarget.value || bountyAmount.value < 100 || player.cash < bountyAmount.value) return
  const ok = bountyStore.placeBounty(selectedTarget.value, bountyAmount.value, player.name || 'Άγνωστος', '😎')
  if (ok) {
    player.removeCash(bountyAmount.value)
    gameStore.addNotification(`Συμβόλαιο τοποθετήθηκε σε ${selectedTarget.value.nickname}!`, 'success')
    gameStore.saveGame()
    selectedTarget.value = null
    bountyAmount.value = 100
    tab.value = 'mine'
  } else {
    gameStore.addNotification('Υπάρχει ήδη συμβόλαιο σε αυτόν τον στόχο.', 'warning')
  }
}

function cancelBounty(id) {
  const refund = bountyStore.cancelPlayerBounty(id)
  if (refund > 0) {
    player.addCash(refund)
    gameStore.addNotification(`Συμβόλαιο ακυρώθηκε. Επιστροφή €${formatCash(refund)}`, 'warning')
    gameStore.saveGame()
  }
}
</script>

<style scoped>
.bounty-page {
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
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  position: relative;
}

.tab-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--bg-base);
}

.count-badge {
  background: var(--color-danger);
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

.info-bar {
  display: flex;
  justify-content: space-around;
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-sm);
}

/* Hunt result */
.result-success {
  border-left: 3px solid var(--color-success);
  color: var(--color-success);
  font-size: var(--font-size-sm);
}
.result-fail {
  border-left: 3px solid var(--color-danger);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

/* Bounty cards */
.bounty-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.player-bounty {
  border-left: 2px solid var(--color-warning);
}

.bounty-top {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.bounty-icon { font-size: 28px; flex-shrink: 0; }

.bounty-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bounty-name { font-size: var(--font-size-sm); }
.bounty-sub  { font-size: var(--font-size-xs); }

.bounty-stats {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  margin-top: 2px;
}

.opp-stat {
  font-size: 10px;
  font-family: var(--font-family-mono);
  color: var(--text-secondary);
  background: var(--bg-surface-raised);
  padding: 1px 5px;
  border-radius: var(--border-radius-sm);
}

.bounty-reward {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.reward-amount { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); }
.reward-by     { font-size: 10px; }

.bounty-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.expiry { font-size: var(--font-size-xs); }
.cant-hunt { font-size: var(--font-size-xs); text-align: center; }

/* Place bounty */
.place-form { display: flex; flex-direction: column; gap: var(--space-sm); }

.pf-target {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.pf-icon { font-size: 28px; }

.pf-amount { display: flex; flex-direction: column; gap: var(--space-xs); }

.input-field {
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-sm);
  width: 100%;
}

.btn-block { width: 100%; }

/* Targets */
.target-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.target-card:hover {
  background: var(--bg-surface-raised);
  border-color: var(--color-accent);
}

.target-icon { font-size: 24px; flex-shrink: 0; }

.target-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-sm);
}

/* Fade transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
