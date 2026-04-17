<template>
  <div class="territory-page">
    <h2 class="page-title">⚔️ Σύστημα Κοινών</h2>
    <p class="text-muted page-subtitle">Φατρίες διεκδικούν τον έλεγχο των 7 πόλεων για να εισπράττουν Φόρο 2% στις αγορές και τα ταξίδια.</p>

    <div v-if="!factionStore.currentFaction" class="card text-center text-muted">
      Χρειάζεσαι φατρία για να συμμετέχεις στις Πολιορκίες.
    </div>

    <div class="territory-grid">
      <div
        v-for="(territory, cityId) in territoryStore.territories"
        :key="cityId"
        class="card territory-card"
        :class="{
          'owned': territory.factionId === factionStore.currentFaction,
          'enemy': territory.factionId && territory.factionId !== factionStore.currentFaction,
          'neutral': !territory.factionId,
          'siege-active': isSiegeActive(cityId),
        }"
      >
        <div class="tc-header">
          <span class="tc-city-icon">{{ cityIcon(cityId) }}</span>
          <div class="tc-info">
            <strong class="tc-city-name">{{ cityName(cityId) }}</strong>
            <span class="tc-faction-badge" :style="factionBadgeStyle(territory.factionId)">
              {{ territory.factionId ? factionLabel(territory.factionId) : 'Αδέσμευτη' }}
            </span>
          </div>
          <span v-if="territory.factionId" class="tc-tax-badge">2% Φόρος</span>
        </div>

        <!-- Siege in progress -->
        <div v-if="isSiegeActive(cityId)" class="tc-siege">
          <span class="siege-label">⚔️ Πολιορκία Ενεργή</span>
          <span class="siege-timer text-muted">{{ formatMs(territoryStore.siegeTimeRemaining(cityId)) }}</span>
          <div class="siege-attacker">
            Επίθεση από: <strong>{{ factionLabel(territory.siegeAttackerFaction) }}</strong>
          </div>
          <button
            v-if="canJoinSiege(cityId, 'attacker')"
            class="btn btn-sm btn-danger"
            @click="join(cityId, 'attacker')"
          >
            ⚔️ Επίθεση
          </button>
          <button
            v-if="canJoinSiege(cityId, 'defender')"
            class="btn btn-sm btn-outline"
            @click="join(cityId, 'defender')"
          >
            🛡️ Υπεράσπιση
          </button>
          <span v-if="myParticipation(cityId)" class="badge badge-success">
            {{ myParticipation(cityId) === 'attacker' ? '⚔️ Επιτιθέμενος' : '🛡️ Αμυνόμενος' }}
          </span>
        </div>

        <!-- No siege -->
        <div v-else class="tc-actions">
          <span v-if="siegeCooldown(cityId) > 0" class="text-muted cooldown-text">
            Cooldown: {{ formatMs(siegeCooldown(cityId)) }}
          </span>
          <button
            v-else-if="canInitiate(cityId)"
            class="btn btn-sm btn-danger"
            @click="initiate(cityId)"
          >
            ⚔️ Πολιορκία
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTerritoryStore } from '../stores/territoryStore'
import { useFactionStore } from '../stores/factionStore'
import { useGameStore } from '../stores/gameStore'
import { factions } from '../data/factions'
import { locations } from '../data/locations'

const territoryStore = useTerritoryStore()
const factionStore = useFactionStore()
const gameStore = useGameStore()

const cityIcons = {
  athens: '🏛️',
  thessaloniki: '🌊',
  patras: '🎭',
  heraklion: '🏺',
  mykonos: '🏖️',
  santorini: '🌅',
  corfu: '⛵',
}

const cityNames = {
  athens: 'Αθήνα',
  thessaloniki: 'Θεσσαλονίκη',
  patras: 'Πάτρα',
  heraklion: 'Ηράκλειο',
  mykonos: 'Μύκονος',
  santorini: 'Σαντορίνη',
  corfu: 'Κέρκυρα',
}

function cityIcon(id) { return cityIcons[id] ?? '🏙️' }
function cityName(id) { return cityNames[id] ?? id }

function factionLabel(factionId) {
  if (!factionId) return 'Αδέσμευτη'
  return factions.find(f => f.id === factionId)?.name ?? factionId
}

function factionBadgeStyle(factionId) {
  const color = factions.find(f => f.id === factionId)?.color
  return color ? { color, borderColor: color } : {}
}

function isSiegeActive(cityId) {
  return territoryStore.siegeActive(cityId)
}

function siegeCooldown(cityId) {
  return territoryStore.siegeCooldownRemaining(cityId)
}

function canInitiate(cityId) {
  return territoryStore.canInitiateSiege(cityId) && !!factionStore.currentFaction
}

function canJoinSiege(cityId, side) {
  const t = territoryStore.territories[cityId]
  if (!factionStore.currentFaction) return false
  if (territoryStore.myParticipation[cityId]) return false
  if (side === 'attacker') return t.siegeAttackerFaction === factionStore.currentFaction
  if (side === 'defender') return t.factionId === factionStore.currentFaction
  return false
}

function myParticipation(cityId) {
  return territoryStore.myParticipation[cityId] ?? null
}

async function initiate(cityId) {
  await territoryStore.initiateSiege(cityId)
}

async function join(cityId, side) {
  await territoryStore.joinSiege(cityId, side)
}

function formatMs(ms) {
  if (ms <= 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}ω ${m}λ`
  if (m > 0) return `${m}λ ${s}δ`
  return `${s}δ`
}
</script>

<style scoped>
.territory-page { padding-bottom: 2rem; }
.page-subtitle { margin-top: -0.5rem; margin-bottom: 1.5rem; font-size: 0.85rem; }

.territory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.territory-card {
  border-left: 4px solid var(--border-color);
  transition: border-color 0.2s;
}
.territory-card.owned { border-left-color: #4CAF50; }
.territory-card.enemy { border-left-color: #E53935; }
.territory-card.neutral { border-left-color: #666; }
.territory-card.siege-active { border-left-color: #FF9800; animation: pulse-border 2s infinite; }

@keyframes pulse-border {
  0%, 100% { border-left-color: #FF9800; }
  50% { border-left-color: #E53935; }
}

.tc-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.tc-city-icon { font-size: 1.75rem; }

.tc-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.tc-city-name { font-size: 1rem; }

.tc-faction-badge {
  font-size: 0.75rem;
  border: 1px solid #666;
  border-radius: 4px;
  padding: 1px 6px;
  display: inline-block;
  color: #aaa;
}

.tc-tax-badge {
  font-size: 0.7rem;
  background: rgba(255, 152, 0, 0.2);
  color: #FF9800;
  border-radius: 4px;
  padding: 2px 6px;
}

.tc-siege {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.siege-label { font-size: 0.85rem; font-weight: 600; color: #FF9800; }
.siege-timer { font-size: 0.8rem; }
.siege-attacker { width: 100%; font-size: 0.8rem; color: var(--text-muted); }

.tc-actions { padding-top: 0.5rem; }
.cooldown-text { font-size: 0.8rem; }
</style>
