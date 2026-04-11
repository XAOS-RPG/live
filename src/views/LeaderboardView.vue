<template>
  <div class="leaderboard-page">
    <h2 class="page-title">🏅 Κατάταξη</h2>

    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <div class="leaderboard-list">
      <div
        v-for="(entry, index) in currentLeaderboard"
        :key="entry.id"
        class="card lb-card"
        :class="{ 'is-player': entry.isPlayer }"
      >
        <div class="lb-rank" :class="rankClass(index)">{{ index + 1 }}</div>
        <div class="lb-icon">{{ entry.icon }}</div>
        <div class="lb-info">
          <strong :class="{ 'text-accent': entry.isPlayer }">{{ entry.name }}</strong>
          <span class="text-muted lb-sub">Επ. {{ entry.level }} — {{ entry.rankTitle }}</span>
        </div>
        <div class="lb-value text-mono">{{ formatValue(entry.value) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useCombatStore } from '../stores/combatStore'
import { fakeUsers } from '../data/fakeUsers'

const player = usePlayerStore()
const combatStore = useCombatStore()
const activeTab = ref('level')

const tabs = [
  { key: 'level', label: 'Επίπεδο', icon: '📈' },
  { key: 'wealth', label: 'Πλούτος', icon: '💰' },
  { key: 'stats', label: 'Stats', icon: '💪' },
  { key: 'winrate', label: 'Win Rate', icon: '⚔️' },
]

const rankTitles = [
  { level: 1, title: 'Αρχάριος' },
  { level: 3, title: 'Αδαής' },
  { level: 5, title: 'Μαθητευόμενος' },
  { level: 8, title: 'Ικανός' },
  { level: 12, title: 'Έμπειρος' },
  { level: 16, title: 'Επαγγελματίας' },
  { level: 20, title: 'Επικίνδυνος' },
  { level: 25, title: 'Τρομερός' },
  { level: 30, title: 'Θρυλικός' },
]

function getRankTitle(level) {
  let rank = rankTitles[0].title
  for (const t of rankTitles) {
    if (level >= t.level) rank = t.title
  }
  return rank
}

// Generate fake leaderboard entries from fakeUsers
function buildFakeEntries() {
  return fakeUsers.map(u => ({
    id: u.id,
    name: u.nickname,
    icon: u.icon,
    level: u.level,
    rankTitle: getRankTitle(u.level),
    stats: u.stats.strength + u.stats.speed + u.stats.dexterity + u.stats.defense,
    wealth: u.rewards.cashMax * (10 + u.level * 5) + Math.floor(Math.random() * 5000),
    winRate: Math.floor(40 + Math.random() * 55),
    isPlayer: false,
  }))
}

function buildPlayerEntry(valueKey) {
  const stats = combatStore.combatStats
  const values = {
    level: player.level,
    wealth: player.cash + player.bank + player.vault,
    stats: player.totalStats,
    winrate: parseFloat(stats.winRate) || 0,
  }
  return {
    id: 'player',
    name: player.name,
    icon: '👤',
    level: player.level,
    rankTitle: player.rankTitle,
    stats: player.totalStats,
    wealth: player.cash + player.bank + player.vault,
    winRate: parseFloat(stats.winRate) || 0,
    value: values[valueKey],
    isPlayer: true,
  }
}

const currentLeaderboard = computed(() => {
  const fakes = buildFakeEntries()
  const tab = activeTab.value

  const entries = fakes.map(f => {
    let value
    if (tab === 'level') value = f.level
    else if (tab === 'wealth') value = f.wealth
    else if (tab === 'stats') value = f.stats
    else if (tab === 'winrate') value = f.winRate
    return { ...f, value }
  })

  const playerEntry = buildPlayerEntry(tab)
  entries.push(playerEntry)

  entries.sort((a, b) => b.value - a.value)
  return entries.slice(0, 15)
})

function rankClass(index) {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

function formatValue(val) {
  if (activeTab.value === 'wealth') return '€' + val.toLocaleString('el-GR')
  if (activeTab.value === 'winrate') return val + '%'
  return val
}
</script>

<style scoped>
.leaderboard-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); }

.tab-bar {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-xs);
}

.tab-btn {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  border-radius: var(--border-radius-md);
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.tab-btn.active {
  background: var(--color-primary);
  color: var(--text-on-primary);
}

.tab-btn:hover:not(.active) {
  background: var(--bg-surface-raised);
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.lb-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  transition: all var(--transition-fast);
}

.lb-card.is-player {
  border-color: var(--color-accent);
  background: rgba(79, 195, 247, 0.06);
}

.lb-rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family-mono);
  color: var(--text-secondary);
  background: var(--bg-surface);
  border-radius: var(--border-radius-full);
  flex-shrink: 0;
}

.rank-gold { background: #FFD700; color: #000; }
.rank-silver { background: #C0C0C0; color: #000; }
.rank-bronze { background: #CD7F32; color: #000; }

.lb-icon { font-size: 22px; flex-shrink: 0; }

.lb-info { flex: 1; min-width: 0; }
.lb-info strong { font-size: var(--font-size-sm); }
.lb-sub { font-size: var(--font-size-xs); display: block; }

.lb-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent);
  flex-shrink: 0;
}
</style>
