<template>
  <div class="newspaper-page">
    <h2 class="page-title">📡 Events Hub</h2>
    <p class="page-sub text-muted">Νέα, στατιστικά και τυχαία συμβάντα στην πόλη.</p>

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
      <div class="card news-card" v-for="article in worldNews" :key="article.id">
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
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useEventsHubStore } from '../stores/eventsHubStore'
import { fakeUsers } from '../data/fakeUsers'

const player = usePlayerStore()
const eventsHub = useEventsHubStore()
const activeTab = ref('city')

const tabs = [
  { key: 'city', icon: '🚶', label: 'Πόλη' },
  { key: 'world', icon: '🌍', label: 'Νέα Κόσμου' },
  { key: 'personal', icon: '👤', label: 'Το Ιστορικό μου' },
  { key: 'stats', icon: '📊', label: 'Στατιστικά' },
]

function markRead() {
  eventsHub.markHubRead()
}

const worldNews = [
  {
    id: 1, category: 'battle', categoryLabel: '⚔️ Μάχη',
    title: 'GR_Enforcer κατατρόπωσε Σπύρος_Underground σε επική μάχη',
    body: 'Ο GR_Enforcer επιτέθηκε αιφνιδιαστικά στον Σπύρο_Underground στη συνοικία Κολωνός. Η μάχη διήρκεσε αρκετά λεπτά και κατέληξε σε νίκη του επιτιθέμενου.',
    timeAgo: '8 λεπτά πριν',
  },
  {
    id: 2, category: 'crime', categoryLabel: '🎭 Έγκλημα',
    title: 'VangelisFury συνελήφθη κατά τη διάρκεια ληστείας',
    body: 'Ο VangelisFury πιάστηκε επ\' αυτοφώρω να διαρρηγνύει κατάστημα ηλεκτρονικών στο κέντρο. Αναμένεται να βγει από τη φυλακή σε λίγη ώρα.',
    timeAgo: '22 λεπτά πριν',
  },
  {
    id: 3, category: 'level', categoryLabel: '📈 Επίπεδο',
    title: 'ShadowNikos έφτασε το επίπεδο 18!',
    body: 'Ο παίκτης ShadowNikos ανέβηκε στο επίπεδο 18 μετά από εντατική εκπαίδευση στο γυμναστήριο και επιτυχημένες αποστολές.',
    timeAgo: '45 λεπτά πριν',
  },
  {
    id: 4, category: 'battle', categoryLabel: '⚔️ Μάχη',
    title: 'Μεγάλη PVP συμπλοκή στη Θεσσαλονίκη',
    body: 'Τουλάχιστον 4 παίκτες ενεπλάκησαν σε σειρά PVP μαχών στην περιοχή της Θεσσαλονίκης. Νικητής αναδείχθηκε ο xXDimitrisXx.',
    timeAgo: '1 ώρα πριν',
  },
  {
    id: 5, category: 'economy', categoryLabel: '💰 Οικονομία',
    title: 'Εκτόξευση τιμών στο Παζάρι — σπάνια αντικείμενα εξαφανίστηκαν',
    body: 'Η ζήτηση για αλεξίσφαιρα γιλέκα και βαριά όπλα έχει φτάσει σε ιστορικά υψηλά. Οι έμποροι ζητούν έως 3x την κανονική τιμή.',
    timeAgo: '2 ώρες πριν',
  },
  {
    id: 6, category: 'crime', categoryLabel: '🎭 Έγκλημα',
    title: 'Κύκλωμα κλοπής αυτοκινήτων αποκαλύφθηκε στον Πειραιά',
    body: 'Αρκετοί παίκτες κατηγορούνται για οργανωμένη κλοπή αυτοκινήτων στο λιμάνι. Η αστυνομία εντάτιεψε τις περιπολίες.',
    timeAgo: '3 ώρες πριν',
  },
  {
    id: 7, category: 'faction', categoryLabel: '🏴 Συμμορία',
    title: 'Η Μαύρη Αγορά επεκτείνεται στο Ηράκλειο',
    body: 'Η φατρία "Μαύρη Αγορά" ανακοίνωσε επέκταση δραστηριοτήτων στην Κρήτη, προσφέροντας υψηλά bonus στα νέα μέλη.',
    timeAgo: '5 ώρες πριν',
  },
  {
    id: 8, category: 'level', categoryLabel: '📈 Επίπεδο',
    title: 'Κώστας_93 ξεπέρασε τα 100 εγκλήματα!',
    body: 'Ο Κώστας_93 έφτασε το ορόσημο των 100 επιτυχημένων εγκλημάτων και κέρδισε σπάνιο τίτλο "Ειδικός Εγκληματίας".',
    timeAgo: '7 ώρες πριν',
  },
  {
    id: 9, category: 'economy', categoryLabel: '💰 Οικονομία',
    title: 'Νέο ρεκόρ ημερήσιων συναλλαγών στο Παζάρι',
    body: 'Πάνω από €2.5 εκατ. άλλαξαν χέρια χθες μέσω του Παζαριού. Τα πιο δημοφιλή αντικείμενα ήταν τα αλεξίσφαιρα και τα ιατρικά kit.',
    timeAgo: '10 ώρες πριν',
  },
  {
    id: 10, category: 'battle', categoryLabel: '⚔️ Μάχη',
    title: 'MakisGR νίκησε τον βαρύ αντίπαλο "Γεράκι του Βορρά"',
    body: 'Σε μια μάχη που κράτησε πάνω από 10 γύρους, ο MakisGR κατόρθωσε να νικήσει έναν από τους πιο δύσκολους NPC αντιπάλους του παιχνιδιού.',
    timeAgo: '12 ώρες πριν',
  },
]

const serverStats = {
  onlinePlayers: 38,
  battlesToday: 127,
  crimesToday: 341,
  moneyCirculated: '2.4M',
}

const topPlayers = computed(() => {
  const users = fakeUsers.slice(0, 4).map(u => ({
    id: u.id, icon: u.icon, name: u.nickname, stat: `Επ. ${u.level}`,
  }))
  const me = { id: 'player', icon: '😎', name: player.name || 'Εσύ', stat: `Επ. ${player.level}` }
  return [me, ...users]
    .sort((a, b) => parseInt(b.stat.replace('Επ. ', '')) - parseInt(a.stat.replace('Επ. ', '')))
    .slice(0, 5)
})

function rankClass(i) {
  if (i === 0) return 'rank-gold'
  if (i === 1) return 'rank-silver'
  if (i === 2) return 'rank-bronze'
  return ''
}

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
</style>
