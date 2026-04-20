<template>
  <div class="newspaper-page">
    <h2 class="page-title">📡 Events Hub</h2>
    <p class="page-sub text-muted">Νέα, στατιστικά και τυχαία συμβάντα στην πόλη.</p>

    <!-- Weekly Event Banner -->
    <div v-if="weeklyEvent.activeEvent" class="card weekly-event-banner" :style="{ borderColor: weeklyEvent.activeEvent.color }">
      <div class="weekly-event-row">
        <span class="weekly-event-icon">{{ weeklyEvent.activeEvent.icon }}</span>
        <div class="weekly-event-info">
          <strong class="weekly-event-name" :style="{ color: weeklyEvent.activeEvent.color }">
            {{ weeklyEvent.activeEvent.name }}
          </strong>
          <p class="weekly-event-desc">{{ weeklyEvent.activeEvent.description }}</p>
        </div>
        <div class="weekly-event-timer">
          <span class="weekly-event-days">{{ weeklyEvent.daysLeft }}d</span>
          <span class="text-muted" style="font-size: 10px;">απομένουν</span>
        </div>
      </div>
    </div>

    <div v-if="eventsHub.hubUnread" class="card read-banner">
      <div class="read-banner-row">
        <span class="read-banner-icon">🔔</span>
        <p class="read-banner-text">Υπάρχουν νέα ή συμβάντα που δεν έχεις σημειώσει ως διαβασμένα.</p>
        <button type="button" class="btn btn-sm btn-primary" @click="markRead">Διαβάστηκε</button>
      </div>
    </div>

    <!-- Tab bar -->
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

    <!-- City exploration -->
    <template v-if="activeTab === 'city'">
      <div class="card city-intro">
        <h3 class="city-intro-title">🚶 Τυχαία συμβάντα στην πόλη</h3>
        <p class="text-muted city-intro-body">
          Κάθε φορά που αλλάζεις σελίδα στο παιχνίδι, υπάρχει <strong>5% πιθανότητα</strong> να συμβεί κάτι στον δρόμο:
          λεφτά, μικροατυχήματα, ευρήματα στα σκουπίδια και άλλα. (Έως ένα συμβάν ανά ~30 δευτ.)
        </p>
      </div>
      <div v-if="!eventsHub.explorationLog.length" class="card text-center text-muted">
        Δεν έχεις ακόμα καταγεγραμμένα συμβάντα. Συνέχισε να περιηγείσαι — η πόλη κρύβει εκπλήξεις.
      </div>
      <div
        v-for="entry in eventsHub.explorationLog"
        :key="entry.id"
        class="card explore-card"
        :class="'kind-' + entry.kind"
      >
        <div class="explore-head">
          <span class="explore-icon">{{ entry.icon }}</span>
          <div>
            <strong class="explore-title">{{ entry.title }}</strong>
            <p class="explore-msg">{{ entry.message }}</p>
            <p v-if="entry.detail" class="explore-detail text-muted">{{ entry.detail }}</p>
          </div>
        </div>
        <span class="explore-time text-muted">{{ formatAgo(entry.ts) }}</span>
      </div>
    </template>

    <!-- World News -->
    <template v-if="activeTab === 'world'">
      <div v-if="!worldNewsList.length" class="card text-center text-muted">
        Δεν υπάρχουν ακόμα νέα στον κόσμο. Παίξε και δημιούργησε ιστορίες!
      </div>
      <div class="card news-card" v-for="article in worldNewsList" :key="article.id">
        <div class="news-header">
          <span class="news-category" :class="'cat-' + article.category">{{ article.categoryLabel }}</span>
          <span class="news-time text-muted">{{ article.timeAgo }}</span>
        </div>
        <p class="news-title">{{ article.title }}</p>
        <p class="news-body text-muted">{{ article.body }}</p>
      </div>
    </template>

    <!-- Player Activity Log -->
    <template v-if="activeTab === 'personal'">
      <div v-if="!player.activityLog.length" class="card text-center text-muted">
        Καμία δραστηριότητα ακόμα. Ξεκίνα εγκλήματα, μάχες ή γυμναστήριο!
      </div>
      <div
        v-for="(entry, i) in player.activityLog.slice(0, 30)"
        :key="i"
        class="card activity-card"
      >
        <div class="act-content">
          <span class="act-msg">{{ entry.message }}</span>
          <span class="act-time text-muted">{{ formatAgo(entry.timestamp) }}</span>
        </div>
      </div>
    </template>

    <!-- Server Stats -->
    <template v-if="activeTab === 'stats'">
      <div class="stats-grid">
        <div class="card stat-tile">
          <span class="stat-icon">👥</span>
          <span class="stat-val">{{ serverStats.onlinePlayers }}</span>
          <span class="stat-lbl text-muted">Online</span>
        </div>
        <div class="card stat-tile">
          <span class="stat-icon">⚔️</span>
          <span class="stat-val">{{ serverStats.battlesToday }}</span>
          <span class="stat-lbl text-muted">Μάχες σήμερα</span>
        </div>
        <div class="card stat-tile">
          <span class="stat-icon">🎭</span>
          <span class="stat-val">{{ serverStats.crimesToday }}</span>
          <span class="stat-lbl text-muted">Εγκλήματα</span>
        </div>
        <div class="card stat-tile">
          <span class="stat-icon">💰</span>
          <span class="stat-val">€{{ serverStats.moneyCirculated }}</span>
          <span class="stat-lbl text-muted">Σε κυκλοφορία</span>
        </div>
      </div>

      <div class="card">
        <h4 class="section-title">🏆 Top Παίκτες Σήμερα</h4>
        <div class="top-list">
          <div v-for="(entry, i) in topPlayers" :key="entry.id" class="top-row">
            <span class="top-rank" :class="rankClass(i)">{{ i + 1 }}</span>
            <span class="top-icon">{{ entry.icon }}</span>
            <span class="top-name">{{ entry.name }}</span>
            <span class="top-val text-muted text-mono">{{ entry.stat }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useEventsHubStore } from '../stores/eventsHubStore'
import { useWeeklyEventStore } from '../stores/weeklyEventStore'
import { supabase } from '../lib/supabaseClient'

const player = usePlayerStore()
const eventsHub = useEventsHubStore()
const weeklyEvent = useWeeklyEventStore()
const activeTab = ref('city')

const realTopPlayers = ref([])
const loadingTopPlayers = ref(false)
const worldNewsList = ref([])

const tabs = [
  { key: 'city', icon: '🚶', label: 'Πόλη' },
  { key: 'world', icon: '🌍', label: 'Νέα Κόσμου' },
  { key: 'personal', icon: '👤', label: 'Το Ιστορικό μου' },
  { key: 'stats', icon: '📊', label: 'Στατιστικά' },
]

function markRead() {
  eventsHub.markHubRead()
}

async function loadWorldNews() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const news = []

    // Fetch neighborhood attacks
    const { data: attacks } = await supabase
      .from('neighborhood_attack_log')
      .select('attacker_username, damage_dealt, captured, attacked_at')
      .gte('attacked_at', oneDayAgo)
      .order('attacked_at', { ascending: false })
      .limit(20)

    if (attacks && attacks.length > 0) {
      for (const attack of attacks.slice(0, 3)) {
        const timeAgo = formatAgo(new Date(attack.attacked_at).getTime())
        if (attack.captured) {
          news.push({
            id: `attack-${attack.attacked_at}`,
            category: 'battle',
            categoryLabel: '⚔️ Κατάκτηση',
            title: `${attack.attacker_username} κατέκτησε γειτονιά!`,
            body: `Ο παίκτης ${attack.attacker_username} ανέλαβε τον έλεγχο μιας γειτονιάς μετά από επίθεση που προκάλεσε ${attack.damage_dealt} ζημιά.`,
            timeAgo,
          })
        } else {
          news.push({
            id: `attack-dmg-${attack.attacked_at}`,
            category: 'battle',
            categoryLabel: '⚔️ Μάχη',
            title: `${attack.attacker_username} επιτέθηκε σε γειτονιά`,
            body: `Ο παίκτης ${attack.attacker_username} επιτέθηκε και προκάλεσε ${attack.damage_dealt} ζημιά στην Επιρροή.`,
            timeAgo,
          })
        }
      }
    }

    // Fetch players in jail/hospital
    const { data: jailedPlayers } = await supabase
      .from('profiles')
      .select('username, status, status_timer_end, updated_at')
      .in('status', ['jail', 'hospital'])
      .gte('updated_at', oneDayAgo)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (jailedPlayers && jailedPlayers.length > 0) {
      for (const player of jailedPlayers.slice(0, 3)) {
        const timeAgo = formatAgo(new Date(player.updated_at).getTime())
        if (player.status === 'jail') {
          news.push({
            id: `jail-${player.username}-${player.updated_at}`,
            category: 'crime',
            categoryLabel: '🔒 Φυλακή',
            title: `${player.username} συνελήφθη!`,
            body: `Ο παίκτης ${player.username} εισήχθη στη φυλακή κατά τη διάρκεια επικίνδυνης δραστηριότητας.`,
            timeAgo,
          })
        } else {
          news.push({
            id: `hospital-${player.username}-${player.updated_at}`,
            category: 'level',
            categoryLabel: '🏥 Νοσοκομείο',
            title: `${player.username} εισήχθη στο νοσοκομείο!`,
            body: `Ο παίκτης ${player.username} χρειάστηκε ιατρική περίθαλψη και εισήχθη στο νοσοκομείο.`,
            timeAgo,
          })
        }
      }
    }

    // Fetch completed heists (from heist_lobbies with status 'completed')
    const { data: completedHeists } = await supabase
      .from('heist_lobbies')
      .select('id, target_id, status, updated_at, members')
      .eq('status', 'completed')
      .gte('updated_at', oneDayAgo)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (completedHeists && completedHeists.length > 0) {
      for (const heist of completedHeists.slice(0, 2)) {
        const timeAgo = formatAgo(new Date(heist.updated_at).getTime())
        const memberNames = heist.members ? heist.members.map(m => m.username).join(', ') : 'Unknown'
        const targetNames = ['Τράπεζα', 'Αρχαιολογικό Μουσείο', 'Κοσμημάτων κατάστημα']
        const targetName = targetNames[heist.target_id % targetNames.length] || 'Στόχος'

        news.push({
          id: `heist-${heist.id}`,
          category: 'crime',
          categoryLabel: '🔫 Ριφιφί',
          title: `${memberNames} εκτέλεσαν επιτυχές ριφιφί!`,
          body: `Μια ομάδα παικτών εκτέλεσε επιτυχές ριφιφί στο ${targetName} και έφυγε με πολύτιμα λύτρα.`,
          timeAgo,
        })
      }
    }

    // Sort by time (newest first)
    worldNewsList.value = news.sort((a, b) => {
      const timeA = parseInt(a.id.split('-').pop() || '0')
      const timeB = parseInt(b.id.split('-').pop() || '0')
      return timeB - timeA
    }).slice(0, 10)
  } catch (e) {
    console.error('Failed to load world news:', e)
  }
}

const serverStats = {
  onlinePlayers: 38,
  battlesToday: 127,
  crimesToday: 341,
  moneyCirculated: '2.4M',
}

async function loadTopPlayers() {
  loadingTopPlayers.value = true
  try {
    // Fetch top 4 players by level
    const { data } = await supabase
      .from('profiles')
      .select('id, username, level')
      .order('level', { ascending: false })
      .limit(4)

    const dbPlayers = (data || []).map(p => ({
      id: p.id,
      icon: '👤',
      name: p.username || 'Unknown',
      stat: `Επ. ${p.level}`,
    }))

    const me = { id: 'player', icon: '😎', name: player.name || 'Εσύ', stat: `Επ. ${player.level}` }
    realTopPlayers.value = [me, ...dbPlayers]
      .sort((a, b) => parseInt(b.stat.replace('Επ. ', '')) - parseInt(a.stat.replace('Επ. ', '')))
      .slice(0, 5)
  } catch (e) {
    console.error('Failed to load top players:', e)
  } finally {
    loadingTopPlayers.value = false
  }
}

const topPlayers = computed(() => realTopPlayers.value)

function rankClass(i) {
  if (i === 0) return 'rank-gold'
  if (i === 1) return 'rank-silver'
  if (i === 2) return 'rank-bronze'
  return ''
}

onMounted(async () => {
  await loadTopPlayers()
  await loadWorldNews()
})

function formatAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Μόλις τώρα'
  if (min < 60) return `${min} λεπτά πριν`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ώρ. πριν`
  return `${Math.floor(hr / 24)} μέρες πριν`
}
</script>

<style scoped>
.newspaper-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); margin-bottom: 2px; }
.page-sub { font-size: var(--font-size-xs); margin: 0 0 var(--space-sm); }

.read-banner {
  border: 1px solid var(--color-accent);
  background: rgba(79, 195, 247, 0.08);
}

.read-banner-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.read-banner-icon { font-size: 1.25rem; }
.read-banner-text {
  flex: 1;
  margin: 0;
  font-size: var(--font-size-sm);
  min-width: 0;
}

.city-intro-title { margin: 0 0 var(--space-xs); font-size: var(--font-size-md); }
.city-intro-body { margin: 0; font-size: var(--font-size-xs); line-height: 1.5; }

.explore-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.explore-head {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
}

.explore-icon { font-size: 1.75rem; line-height: 1; flex-shrink: 0; }
.explore-title { font-size: var(--font-size-sm); display: block; }
.explore-msg { margin: 4px 0 0; font-size: var(--font-size-sm); }
.explore-detail { margin: 4px 0 0; font-size: var(--font-size-xs); }
.explore-time { font-size: var(--font-size-xs); align-self: flex-end; }

.kind-bad { border-left: 3px solid var(--color-danger); }
.kind-good { border-left: 3px solid var(--color-success); }
.kind-loot { border-left: 3px solid #ab47bc; }
.kind-neutral { border-left: 3px solid var(--border-color); }

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
}

.tab-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--bg-base);
}

.news-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.news-category {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.cat-battle  { color: var(--color-danger); }
.cat-crime   { color: var(--color-warning); }
.cat-level   { color: var(--color-success); }
.cat-economy { color: var(--color-accent); }
.cat-faction { color: #AB47BC; }

.news-time  { font-size: var(--font-size-xs); }
.news-title { font-weight: var(--font-weight-bold); font-size: var(--font-size-sm); margin: 0; }
.news-body  { font-size: var(--font-size-xs); margin: 0; line-height: 1.5; }

.activity-card { padding: var(--space-sm); }
.act-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-sm);
}
.act-msg  { font-size: var(--font-size-sm); }
.act-time { font-size: var(--font-size-xs); white-space: nowrap; flex-shrink: 0; }

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.stat-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-md);
  text-align: center;
}

.stat-icon { font-size: 24px; }
.stat-val  { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); font-family: var(--font-family-mono); }
.stat-lbl  { font-size: var(--font-size-xs); }

.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-sm) 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.top-list { display: flex; flex-direction: column; gap: var(--space-xs); }

.top-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--border-color);
  font-size: var(--font-size-sm);
}
.top-row:last-child { border-bottom: none; }

.top-rank { min-width: 20px; font-weight: var(--font-weight-bold); font-size: var(--font-size-sm); }
.rank-gold   { color: #FFB300; }
.rank-silver { color: #9E9E9E; }
.rank-bronze { color: #8D6E63; }

.top-name { flex: 1; }
.top-val  { font-size: var(--font-size-xs); }

/* Weekly Event Banner */
.weekly-event-banner {
  border-left: 4px solid;
  background: rgba(255, 255, 255, 0.03);
  animation: eventGlow 3s ease-in-out infinite;
}

@keyframes eventGlow {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 12px rgba(255, 215, 0, 0.15); }
}

.weekly-event-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.weekly-event-icon {
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
}

.weekly-event-info {
  flex: 1;
  min-width: 0;
}

.weekly-event-name {
  font-size: var(--font-size-md);
  display: block;
}

.weekly-event-desc {
  margin: 2px 0 0;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.weekly-event-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.weekly-event-days {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family-mono);
  color: var(--color-accent);
}
</style>
