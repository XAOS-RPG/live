<template>
  <div class="world-boss-page">
    <div class="card boss-header">
      <div class="boss-title-row">
        <span class="boss-icon">{{ boss.icon }}</span>
        <div>
          <h2>{{ boss.name }}</h2>
          <p class="text-muted" style="margin:0; font-size:var(--font-size-sm)">Παγκόσμια Επιδρομή — Συνεργαστείτε για να νικήσετε τον Boss!</p>
        </div>
      </div>

      <!-- Boss HP Bar -->
      <div class="hp-section">
        <div class="hp-label">
          <span>❤️ Boss HP</span>
          <span class="text-mono">{{ bossStore.bossHp.toLocaleString('el-GR') }} / {{ boss.maxHp.toLocaleString('el-GR') }}</span>
        </div>
        <div class="bar-track boss-bar-track">
          <div class="bar-fill boss-bar-fill" :style="{ width: bossStore.bossHpPercent + '%' }" />
        </div>
      </div>
    </div>

    <!-- Defeated reward panel -->
    <div v-if="bossStore.defeated && bossStore.myReward" class="card reward-panel">
      <h3 class="card-title">🎉 Ανταμοιβή</h3>
      <div v-if="bossStore.isTopDamager" class="top-damager-badge">👑 Top Damager!</div>
      <p>💰 +€{{ bossStore.myReward.cash.toLocaleString('el-GR') }}</p>
      <p v-for="m in bossStore.myReward.materials" :key="m.id">
        🎁 {{ m.id }} ×{{ m.qty }}
      </p>
      <p class="text-muted" style="font-size:var(--font-size-xs)">+5.000 XP</p>
    </div>

    <!-- Not started -->
    <div v-if="!bossStore.active && !bossStore.defeated" class="card text-center">
      <p class="text-muted">Δεν υπάρχει ενεργή επιδρομή.</p>
      <button class="btn btn-danger mt-sm" @click="bossStore.startRaid()">⚔️ Ξεκίνα Επιδρομή</button>
    </div>

    <!-- Active raid -->
    <template v-if="bossStore.active">
      <!-- Attack section -->
      <div class="card attack-section">
        <div class="attack-info">
          <div>
            <span class="text-muted">Ενέργεια: </span>
            <strong>{{ player.resources.energy.current }}</strong>
            <span class="text-muted"> / {{ player.resources.energy.max }}</span>
          </div>
          <div>
            <span class="text-muted">Κόστος επίθεσης: </span>
            <strong>{{ bossStore.energyCost }} ⚡</strong>
          </div>
          <div v-if="classStore.isEktelestis" class="spec-badge">
            🗡️ Εκτελεστής +10% ζημιά
          </div>
        </div>

        <button
          class="btn btn-danger btn-lg attack-btn"
          :disabled="!bossStore.canAttack"
          @click="doAttack"
        >
          ⚔️ Επίθεση
        </button>

        <div v-if="lastDmg !== null" class="last-dmg-flash">
          -{{ lastDmg.toLocaleString('el-GR') }} HP
        </div>

        <p v-if="!bossStore.canAttack && player.resources.energy.current < bossStore.energyCost" class="text-muted text-center" style="font-size:var(--font-size-xs)">
          Δεν έχεις αρκετή ενέργεια.
        </p>
      </div>

      <!-- My contribution -->
      <div class="card">
        <h3 class="card-title">Η συνεισφορά σου</h3>
        <p>⚔️ Ζημιά: <strong class="text-mono">{{ bossStore.myDamage.toLocaleString('el-GR') }}</strong></p>
        <p class="text-muted" style="font-size:var(--font-size-xs)">
          {{ mySharePercent }}% του συνολικού
        </p>
      </div>
    </template>

    <!-- Leaderboard -->
    <div v-if="bossStore.sortedContributors.length > 0" class="card">
      <h3 class="card-title">🏆 Πίνακας Ζημιάς</h3>
      <div class="contrib-list">
        <div
          v-for="(c, i) in bossStore.sortedContributors"
          :key="c.name"
          class="contrib-row"
          :class="{ 'contrib-me': c.name === player.name }"
        >
          <span class="contrib-rank">{{ i === 0 ? '👑' : `#${i + 1}` }}</span>
          <span class="contrib-name">{{ c.name }}</span>
          <span class="contrib-dmg text-mono">{{ c.damage.toLocaleString('el-GR') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBossStore } from '../stores/bossStore'
import { usePlayerStore } from '../stores/playerStore'
import { useClassStore } from '../stores/classStore'

const bossStore = useBossStore()
const player = usePlayerStore()
const classStore = useClassStore()
const boss = bossStore.boss

const lastDmg = ref(null)
let dmgTimer = null

function doAttack() {
  const dmg = bossStore.attack()
  if (dmg === null) return
  lastDmg.value = dmg
  clearTimeout(dmgTimer)
  dmgTimer = setTimeout(() => { lastDmg.value = null }, 1200)
}

const mySharePercent = computed(() => {
  const total = bossStore.totalDamageDealt
  if (!total) return '0.0'
  return ((bossStore.myDamage / total) * 100).toFixed(1)
})
</script>

<style scoped>
.world-boss-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.boss-header h2 {
  margin: 0 0 var(--space-xs);
  font-size: var(--font-size-lg);
}

.boss-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.boss-icon {
  font-size: 3rem;
  flex-shrink: 0;
}

.hp-section {
  margin-top: var(--space-sm);
}

.hp-label {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  margin-bottom: 4px;
}

.boss-bar-track {
  height: 18px;
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-full);
  overflow: hidden;
}

.boss-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #c0392b);
  border-radius: var(--border-radius-full);
  transition: width 0.4s ease;
}

.attack-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: center;
}

.attack-info {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  font-size: var(--font-size-sm);
  justify-content: center;
}

.attack-btn {
  min-width: 160px;
  font-size: var(--font-size-md);
  padding: var(--space-sm) var(--space-lg);
}

.last-dmg-flash {
  color: #e74c3c;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  animation: fadeUp 1.2s ease forwards;
}

@keyframes fadeUp {
  0%   { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}

.spec-badge {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
  border-radius: var(--border-radius-sm);
  padding: 2px 8px;
  font-size: var(--font-size-xs);
}

.reward-panel {
  border: 2px solid var(--color-success, #2ecc71);
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), var(--bg-surface));
}

.top-damager-badge {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: gold;
  margin-bottom: var(--space-sm);
}

.contrib-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.contrib-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
}

.contrib-me {
  background: rgba(var(--color-accent-rgb, 52, 152, 219), 0.15);
  font-weight: var(--font-weight-bold);
}

.contrib-rank {
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.contrib-name {
  flex: 1;
}

.contrib-dmg {
  color: #e74c3c;
}
</style>
