<template>
  <div class="profile-page">
    <h2 class="page-title">👤 Προφίλ</h2>

    <!-- Identity -->
    <div class="card">
      <div class="profile-header">
        <div class="avatar">{{ player.name.charAt(0).toUpperCase() }}</div>
        <div>
          <h3>{{ player.name }}</h3>
          <span class="badge badge-info">{{ player.rankTitle }}</span>
          <span class="text-muted"> · Επίπεδο {{ player.level }}</span>
        </div>
      </div>
      <div class="xp-section mt-sm">
        <div class="flex flex-between" style="font-size: var(--font-size-xs)">
          <span class="text-muted">XP</span>
          <span class="text-mono">{{ player.xp }} / {{ player.xpToNextLevel }}</span>
        </div>
        <div class="bar-track" style="background: var(--bg-surface-raised)">
          <div class="bar-fill" :style="{ width: (player.xpProgress * 100) + '%', background: 'var(--color-accent)' }" />
        </div>
      </div>
      <div class="profile-meta mt-sm text-muted" style="font-size: var(--font-size-xs)">
        Ηλικία: {{ formatAge() }} · Δημιουργήθηκε: {{ formatDate(player.createdAt) }}
      </div>
    </div>

    <!-- Battle Stats -->
    <div class="card">
      <h3 class="card-title">Μαχητικά Στατιστικά</h3>
      <div class="stats-grid">
        <div v-for="stat in battleStats" :key="stat.key" class="stat-item">
          <span class="stat-icon">{{ stat.icon }}</span>
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value text-mono text-accent">{{ player.stats[stat.key].toFixed(2) }}</span>
        </div>
      </div>
      <div class="stat-item mt-sm" style="border-top: 1px solid var(--border-color); padding-top: var(--space-sm)">
        <span class="stat-icon">📊</span>
        <span class="stat-label"><strong>Σύνολο</strong></span>
        <span class="stat-value text-mono text-accent"><strong>{{ player.totalStats.toFixed(2) }}</strong></span>
      </div>
    </div>

    <!-- Greek Mechanics -->
    <div class="card">
      <h3 class="card-title">Ελληνικά Χαρακτηριστικά</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-icon">⚖️</span>
          <span class="stat-label">Φιλότιμο</span>
          <span class="stat-value text-mono">{{ player.filotimo }}/1000</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🤝</span>
          <span class="stat-label">Μέσον</span>
          <span class="stat-value text-mono">{{ player.meson }}/100</span>
        </div>
      </div>
      <p class="text-muted mt-sm" style="font-size: var(--font-size-xs)">
        Φιλότιμο: Επηρεάζει εγκλήματα υψηλού tier, προαγωγές. Μέσον: Βοηθάει στην απόδραση & ειδικές ενέργειες.
      </p>
    </div>

    <!-- Economy -->
    <div class="card">
      <h3 class="card-title">Οικονομικά</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-icon">💰</span>
          <span class="stat-label">Μετρητά</span>
          <span class="stat-value text-mono text-success">€{{ formatCash(player.cash) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🔐</span>
          <span class="stat-label">Χρηματοκιβώτιο</span>
          <span class="stat-value text-mono">€{{ formatCash(propertyStore.vaultCash) }}</span>
        </div>
      </div>
    </div>

    <!-- Combat Record -->
    <div class="card">
      <h3 class="card-title">Ιστορικό Μάχης</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-icon">⚔️</span>
          <span class="stat-label">Μάχες</span>
          <span class="stat-value text-mono">{{ combatStore.combatStats.total }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🏆</span>
          <span class="stat-label">Νίκες</span>
          <span class="stat-value text-mono text-success">{{ combatStore.combatStats.wins }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💀</span>
          <span class="stat-label">Ήττες</span>
          <span class="stat-value text-mono text-danger">{{ combatStore.combatStats.losses }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">📈</span>
          <span class="stat-label">Win Rate</span>
          <span class="stat-value text-mono text-accent">{{ combatStore.combatStats.winRate }}%</span>
        </div>
      </div>
    </div>

    <!-- Crime Stats -->
    <div class="card">
      <h3 class="card-title">Εγκληματικό Ρεκόρ</h3>
      <div class="stat-item">
        <span class="stat-icon">🎭</span>
        <span class="stat-label">Εγκληματική XP</span>
        <span class="stat-value text-mono text-accent">{{ player.crimeXP }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../stores/playerStore'
import { usePropertyStore } from '../stores/propertyStore'
import { useCombatStore } from '../stores/combatStore'

const player = usePlayerStore()
const propertyStore = usePropertyStore()
const combatStore = useCombatStore()

const battleStats = [
  { key: 'strength', label: 'Δύναμη', icon: '💪' },
  { key: 'speed', label: 'Ταχύτητα', icon: '⚡' },
  { key: 'dexterity', label: 'Επιδεξιότητα', icon: '🎯' },
  { key: 'defense', label: 'Άμυνα', icon: '🛡️' },
]

function formatCash(amount) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(amount))
}

function formatAge() {
  const days = Math.floor((Date.now() - player.createdAt) / 86400000)
  if (days === 0) return 'Σήμερα'
  return `${days} ημέρ${days === 1 ? 'α' : 'ες'}`
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('el-GR')
}
</script>

<style scoped>
.profile-page { display: flex; flex-direction: column; gap: var(--space-md); }
.page-title { font-size: var(--font-size-2xl); }

.profile-header { display: flex; align-items: center; gap: var(--space-md); }

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-on-primary);
  flex-shrink: 0;
}

.bar-track { height: 6px; border-radius: var(--border-radius-full); overflow: hidden; }
.bar-fill { height: 100%; border-radius: var(--border-radius-full); transition: width 0.5s; }

.stats-grid { display: flex; flex-direction: column; gap: var(--space-xs); }

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
}

.stat-icon { width: 24px; text-align: center; flex-shrink: 0; }
.stat-label { flex: 1; font-size: var(--font-size-sm); color: var(--text-secondary); }
.stat-value { font-weight: var(--font-weight-bold); }
</style>
