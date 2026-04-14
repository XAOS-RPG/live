<template>
  <div class="prestige-page">
    <h2 class="page-title">🌟 Αναγέννηση</h2>
    <p class="page-sub text-muted">Κάνε reset για permanent bonuses. Κράτα pets, recipes, achievements.</p>

    <!-- Current prestige info -->
    <div class="card prestige-card">
      <div class="prestige-header">
        <span class="prestige-level">{{ prestige.prestigeLevel }}</span>
        <div>
          <strong>Prestige Level</strong>
          <span class="text-muted" style="font-size: 10px; display: block;">
            {{ prestige.totalPrestiges }} συνολικές αναγεννήσεις
          </span>
        </div>
        <span v-if="prestige.isLegendary" class="legendary-badge">ΘΡΥΛΙΚΟΣ</span>
      </div>

      <!-- Player level requirement -->
      <div class="stat-block">
        <div class="stat-label">
          <span>📊 Πρόοδος προς Prestige</span>
          <span class="text-mono">Lv.{{ player.level }}/{{ prestige.minLevel }}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" :style="{
            width: Math.min(100, (player.level / prestige.minLevel) * 100) + '%',
            background: prestige.canPrestige ? 'var(--color-success)' : 'var(--color-accent)'
          }" />
        </div>
      </div>

      <!-- Prestige button -->
      <button
        v-if="!showConfirm"
        class="btn btn-lg btn-prestige"
        :disabled="!prestige.canPrestige"
        @click="showConfirm = true"
      >
        🌟 Αναγέννηση
      </button>

      <!-- Confirmation -->
      <div v-if="showConfirm" class="confirm-box">
        <p class="text-danger" style="font-size: 12px; font-weight: bold;">
          ⚠️ Θα χάσεις: Level, Stats, Χρήματα, Items, Ακίνητα, Δουλειά
        </p>
        <p class="text-success" style="font-size: 12px;">
          ✅ Κρατάς: Pets, Recipes, Achievements, Prestige Bonuses
        </p>
        <div class="confirm-actions">
          <button class="btn btn-sm btn-muted" @click="showConfirm = false">Ακύρωση</button>
          <button class="btn btn-sm btn-danger" @click="doPrestige">Επιβεβαίωση Αναγέννησης</button>
        </div>
      </div>
    </div>

    <!-- Active bonuses -->
    <div class="card">
      <h3 class="section-title">✨ Ενεργά Bonuses</h3>
      <div v-if="prestige.activeBonuses.length === 0" class="text-muted text-center" style="padding: var(--space-md); font-size: 11px;">
        Κανένα bonus ακόμα. Κάνε την πρώτη σου Αναγέννηση!
      </div>
      <div v-for="bonus in prestige.activeBonuses" :key="bonus.level" class="bonus-row active">
        <span class="bonus-level">P{{ bonus.level }}</span>
        <span>{{ bonus.label }}</span>
        <span class="text-success">✓</span>
      </div>
    </div>

    <!-- All bonus tiers -->
    <div class="card">
      <h3 class="section-title">📋 Όλα τα Prestige Bonuses</h3>
      <div v-for="bonus in prestige.allBonuses" :key="bonus.level" class="bonus-row" :class="{ active: bonus.level <= prestige.prestigeLevel }">
        <span class="bonus-level" :class="{ unlocked: bonus.level <= prestige.prestigeLevel }">P{{ bonus.level }}</span>
        <span :class="bonus.level <= prestige.prestigeLevel ? '' : 'text-muted'">{{ bonus.label }}</span>
        <span v-if="bonus.level <= prestige.prestigeLevel" class="text-success">✓</span>
        <span v-else class="text-muted">🔒</span>
      </div>
    </div>

    <!-- What resets -->
    <div class="card">
      <h3 class="section-title">🔄 Τι γίνεται Reset</h3>
      <div class="reset-grid">
        <div class="reset-item lost">
          <strong>Χάνεις</strong>
          <ul>
            <li>Level & XP</li>
            <li>Stats (STR/SPD/DEX/DEF)</li>
            <li>Cash, Bank, Vault</li>
            <li>Items & Equipment</li>
            <li>Properties</li>
            <li>Job</li>
            <li>Crime XP</li>
            <li>Smuggling cargo</li>
            <li>Active loan</li>
          </ul>
        </div>
        <div class="reset-item kept">
          <strong>Κρατάς</strong>
          <ul>
            <li>Prestige bonuses</li>
            <li>Κατοικίδια</li>
            <li>Crafting recipes</li>
            <li>Achievements</li>
            <li>Αρχείο missions</li>
            <li>Faction membership</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Speed record -->
    <div v-if="prestige.fastestPrestige" class="card">
      <h3 class="section-title">🏆 Ρεκόρ</h3>
      <div class="stat-row">
        <span class="text-muted">Ταχύτερο Prestige:</span>
        <span class="text-mono">{{ formatDuration(prestige.fastestPrestige) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/playerStore'
import { usePrestigeStore } from '../stores/prestigeStore'

const router = useRouter()
const player = usePlayerStore()
const prestige = usePrestigeStore()
const showConfirm = ref(false)

function doPrestige() {
  const success = prestige.doPrestige()
  showConfirm.value = false
  if (success) {
    router.push('/')
  }
}

function formatDuration(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const mins = Math.floor((ms % (60 * 60 * 1000)) / 60000)
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}μ ${hours % 24}ω`
  }
  return `${hours}ω ${mins}λ`
}
</script>

<style scoped>
.prestige-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); margin-bottom: 2px; }
.page-sub { font-size: var(--font-size-xs); margin: 0 0 var(--space-sm); }

.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.prestige-card {
  border-left: 3px solid gold;
  text-align: center;
}

.prestige-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  justify-content: center;
  margin-bottom: var(--space-md);
}

.prestige-level {
  font-size: 2rem;
  font-weight: bold;
  color: gold;
  background: rgba(255, 215, 0, 0.1);
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid gold;
}

.legendary-badge {
  font-size: 9px;
  background: gold;
  color: #000;
  padding: 2px 8px;
  border-radius: var(--border-radius-sm);
  font-weight: bold;
  letter-spacing: 1px;
}

.stat-block { margin-bottom: var(--space-md); text-align: left; }

.stat-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 2px;
}

.bar-track {
  height: 8px;
  background: var(--bg-surface-raised);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.btn-prestige {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #000;
  font-weight: bold;
  font-size: var(--font-size-md);
  padding: var(--space-sm) var(--space-lg);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  width: 100%;
}
.btn-prestige:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-lg {
  padding: var(--space-sm) var(--space-lg);
  font-size: var(--font-size-md);
}

.confirm-box {
  margin-top: var(--space-sm);
  padding: var(--space-sm);
  border: 1px solid var(--color-danger);
  border-radius: var(--border-radius-md);
  text-align: left;
}

.confirm-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-sm);
}

.btn-muted {
  opacity: 0.6;
  background: var(--bg-surface-raised);
}

.bonus-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-color);
}
.bonus-row:last-child { border-bottom: none; }
.bonus-row.active { color: var(--text-primary); }

.bonus-level {
  font-size: 10px;
  font-weight: bold;
  min-width: 28px;
  text-align: center;
  padding: 2px 4px;
  border-radius: var(--border-radius-sm);
  background: var(--bg-surface-raised);
  color: var(--text-muted);
}
.bonus-level.unlocked {
  background: rgba(255, 215, 0, 0.2);
  color: gold;
}

.reset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.reset-item {
  font-size: 11px;
}
.reset-item ul {
  margin: 4px 0 0;
  padding-left: 16px;
}
.reset-item li { margin-bottom: 2px; }
.reset-item.lost { color: var(--color-danger); }
.reset-item.kept { color: var(--color-success); }

.text-success { color: var(--color-success); }
.text-danger { color: var(--color-danger); }

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-color);
}
.stat-row:last-child { border-bottom: none; }
</style>
