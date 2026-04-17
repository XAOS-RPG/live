<template>
  <div class="faction-page">
    <h2 class="page-title">🏴 Συμμορία</h2>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button :class="['tab-btn', tab === 'faction' ? 'active' : '']" @click="tab = 'faction'">🏴 Συμμορία</button>
      <button :class="['tab-btn', tab === 'fortress' ? 'active' : '']" @click="tab = 'fortress'">🔍 Ψάξε</button>
    </div>

    <!-- ===== TAB: ΣΥΜΜΟΡΙΑ ===== -->
    <template v-if="tab === 'faction'">
      <!-- Current faction info -->
      <template v-if="factionStore.faction">
        <div class="card current-faction" :style="{ borderLeftColor: factionStore.faction.color }">
          <div class="cf-header">
            <span class="cf-icon">{{ factionStore.faction.icon }}</span>
            <div class="cf-info">
              <strong :style="{ color: factionStore.faction.color }">{{ factionStore.faction.name }}</strong>
              <span class="text-muted cf-sub">{{ factionStore.rankTitle }} — Συνεισφορά: {{ factionStore.contribution }}</span>
            </div>
          </div>
          <p class="text-muted cf-desc">{{ factionStore.faction.description }}</p>
          <div class="cf-bonus">
            <span class="badge badge-success">{{ factionStore.faction.bonus.label }}</span>
            <span class="text-muted cf-leader">Αρχηγός: {{ factionStore.faction.leader }}</span>
          </div>
          <div class="cf-stats">
            <span class="text-muted">Μέλη: {{ factionStore.faction.members }}</span>
            <span class="text-muted">Ένταξη: {{ joinedAgo }}</span>
          </div>
          <button class="btn btn-sm btn-outline btn-danger-outline" @click="showLeaveConfirm = true">
            Αποχώρηση
          </button>
          <div v-if="showLeaveConfirm" class="leave-confirm">
            <span class="text-muted">Σίγουρα;</span>
            <button class="btn btn-sm btn-danger" @click="leave">Ναι</button>
            <button class="btn btn-sm btn-outline" @click="showLeaveConfirm = false">Όχι</button>
          </div>
        </div>
      </template>

      <!-- Faction list -->
      <template v-else>
        <div class="card text-muted text-center join-hint">
          Διάλεξε μια συμμορία για να πάρεις bonus stats!
        </div>
        <div class="faction-list">
          <div
            v-for="faction in factions"
            :key="faction.id"
            class="card faction-card"
            :style="{ borderLeftColor: faction.color }"
          >
            <div class="fc-header">
              <span class="fc-icon">{{ faction.icon }}</span>
              <div class="fc-info">
                <strong :style="{ color: faction.color }">{{ faction.name }}</strong>
                <p class="text-muted fc-desc">{{ faction.description }}</p>
              </div>
            </div>
            <div class="fc-details">
              <span class="badge badge-success">{{ faction.bonus.label }}</span>
              <span class="text-muted fc-members">{{ faction.members }} μέλη</span>
              <span class="text-muted fc-leader">Αρχηγός: {{ faction.leader }}</span>
            </div>
            <div class="fc-req">
              <span class="text-muted">Απαιτήσεις:</span>
              <span class="badge" :class="player.level >= faction.requirement.level ? 'badge-success' : 'badge-danger'">
                Επ. {{ faction.requirement.level }}
              </span>
              <span class="badge" :class="player.filotimo >= faction.requirement.filotimo ? 'badge-success' : 'badge-danger'">
                {{ faction.requirement.filotimo }} Φιλότιμο
              </span>
            </div>
            <button
              class="btn btn-sm btn-primary"
              :disabled="player.level < faction.requirement.level || player.filotimo < faction.requirement.filotimo"
              @click="factionStore.joinFaction(faction.id)"
            >
              Εγγραφή
            </button>
          </div>
        </div>
      </template>
    </template>

    <!-- ===== TAB: ΟΧΥΡΟ ===== -->
    <template v-else>
      <!-- No faction guard -->
      <div v-if="!factionStore.currentFaction" class="card no-faction">
        <span style="font-size: 48px">🏴</span>
        <p>Δεν είσαι μέλος καμίας Συμμορίας.</p>
        <button class="btn btn-primary" @click="tab = 'faction'">Βρες Συμμορία</button>
      </div>

      <template v-else>
        <!-- Header -->
        <div class="card faction-header-card">
          <div class="faction-identity">
            <span class="faction-icon">🏴</span>
            <div>
              <div class="faction-name">{{ factionStore.faction?.name }}</div>
              <div class="faction-rank-row">
                <span class="rank-badge" :class="`rank-${factionStore.rank}`">{{ factionStore.rankTitle }}</span>
                <span class="text-muted" style="font-size: 11px">{{ factionStore.contribution }} Συνεισφορά</span>
              </div>
            </div>
          </div>
          <div v-if="hasAnyFortress" class="active-buffs-mini">
            <span v-if="factionStore.fortressLevels.gym > 0" class="active-buff-tag">
              🏋️ Γυμναστήριο +{{ Math.floor((factionStore.fortressGymBonus - 1) * 100) }}%
            </span>
            <span v-if="factionStore.fortressLevels.accounting > 0" class="active-buff-tag">
              📊 Εταιρεία +{{ Math.floor((factionStore.fortressAccountingBonus - 1) * 100) }}%
            </span>
            <span v-if="factionStore.fortressLevels.ops > 0" class="active-buff-tag">
              🎯 Εγκλήματα +{{ factionStore.fortressLevels.ops }}%
            </span>
          </div>
        </div>

        <!-- Vault -->
        <section class="section-heading">🏦 Θησαυροφυλάκιο Συμμορίας</section>
        <div class="card vault-card">
          <div class="vault-balance-row">
            <span class="vault-label">Υπόλοιπο</span>
            <span class="vault-amount text-mono text-success">€{{ factionStore.vault.toLocaleString() }}</span>
          </div>
          <p class="text-muted vault-desc">Τα μέλη δωρίζουν μετρητά. Αξιωματικοί και Αρχηγοί τα χρησιμοποιούν για αναβαθμίσεις.</p>
          <div class="donate-form">
            <div class="donate-input-row">
              <input
                v-model.number="donateAmount"
                type="number"
                min="1"
                :max="player.cash"
                placeholder="Ποσό δωρεάς…"
                class="donate-input"
              />
              <button class="btn btn-success donate-btn" :disabled="!canDonate" @click="donateCash">
                💶 Δωρεά
              </button>
            </div>
            <div class="donate-presets">
              <button
                v-for="preset in donatePresets"
                :key="preset"
                class="preset-btn"
                :disabled="player.cash < preset"
                @click="donateAmount = preset"
              >
                €{{ preset.toLocaleString() }}
              </button>
            </div>
          </div>
        </div>

        <!-- Buildings -->
        <section class="section-heading">🧱 Κτίρια Οχυρού</section>
        <div v-if="!factionStore.canUpgradeFortress" class="upgrade-locked-notice text-muted">
          🔒 Μόνο Αξιωματικοί και Αρχηγοί αναβαθμίζουν. Χρειάζεσαι 500 Συνεισφορά για Αξιωματικός.
        </div>
        <div class="buildings-grid">
          <div
            v-for="(building, bKey) in FORTRESS_BUILDINGS"
            :key="bKey"
            class="building-card"
            :class="{ maxed: isMaxLevel(bKey) }"
          >
            <div class="building-header">
              <span class="building-icon">{{ building.icon }}</span>
              <div>
                <div class="building-name">{{ building.name }}</div>
                <div class="building-level-row">
                  <span class="level-badge" :class="isMaxLevel(bKey) ? 'level-max' : 'level-normal'">
                    {{ isMaxLevel(bKey) ? 'MAX' : `Επίπεδο ${factionStore.fortressLevels[bKey]}` }}
                  </span>
                </div>
              </div>
            </div>
            <p class="building-desc text-muted">{{ building.description }}</p>
            <div class="level-bar-track">
              <div class="level-bar-fill" :style="{ width: (factionStore.fortressLevels[bKey] / building.maxLevel * 100) + '%' }" />
              <span class="level-bar-label">{{ factionStore.fortressLevels[bKey] }}/{{ building.maxLevel }}</span>
            </div>
            <div v-if="factionStore.fortressLevels[bKey] > 0" class="building-buff-active">
              <span class="buff-active-label">✅ Ενεργό:</span>
              <span class="buff-active-value">{{ buildingActiveBuff(bKey) }}</span>
            </div>
            <div v-if="!isMaxLevel(bKey)" class="building-next-level">
              <span class="next-label">→ Επίπεδο {{ factionStore.fortressLevels[bKey] + 1 }}:</span>
              <span class="next-value">{{ buildingNextBuff(bKey) }}</span>
            </div>
            <div class="building-footer">
              <template v-if="!isMaxLevel(bKey)">
                <div class="upgrade-cost-row">
                  <span class="text-muted" style="font-size: 11px">Κόστος:</span>
                  <span class="upgrade-cost text-mono" :class="factionStore.vault >= upgradeCost(bKey) ? 'text-success' : 'text-danger'">
                    €{{ upgradeCost(bKey).toLocaleString() }}
                  </span>
                </div>
                <button
                  class="btn-upgrade"
                  :disabled="!factionStore.canUpgradeFortress || factionStore.vault < upgradeCost(bKey)"
                  @click="upgradeBuilding(bKey)"
                >
                  ⬆ Αναβάθμιση
                </button>
              </template>
              <div v-else class="maxed-label">🏆 Μέγιστο Επίπεδο!</div>
            </div>
          </div>
        </div>

        <!-- Player buff summary -->
        <section class="section-heading">📋 Τρέχοντα Bonus για Εσένα</section>
        <div class="card player-buffs-card">
          <div class="player-buff-row" :class="{ inactive: factionStore.fortressLevels.gym === 0 }">
            <span class="pbuff-icon">🏋️</span>
            <span class="pbuff-label">Πολλαπλασιαστής Γυμναστηρίου</span>
            <span class="pbuff-value text-mono" :class="factionStore.fortressLevels.gym > 0 ? 'text-success' : 'text-muted'">
              {{ factionStore.fortressLevels.gym > 0 ? `+${((factionStore.fortressGymBonus - 1) * 100).toFixed(0)}%` : '—' }}
            </span>
          </div>
          <div class="player-buff-row" :class="{ inactive: factionStore.fortressLevels.accounting === 0 }">
            <span class="pbuff-icon">📊</span>
            <span class="pbuff-label">Παθητικό Εισόδημα Εταιρείας</span>
            <span class="pbuff-value text-mono" :class="factionStore.fortressLevels.accounting > 0 ? 'text-success' : 'text-muted'">
              {{ factionStore.fortressLevels.accounting > 0 ? `+${((factionStore.fortressAccountingBonus - 1) * 100).toFixed(0)}%` : '—' }}
            </span>
          </div>
          <div class="player-buff-row" :class="{ inactive: factionStore.fortressLevels.ops === 0 }">
            <span class="pbuff-icon">🎯</span>
            <span class="pbuff-label">Επιτυχία Εγκλήματος</span>
            <span class="pbuff-value text-mono" :class="factionStore.fortressLevels.ops > 0 ? 'text-success' : 'text-muted'">
              {{ factionStore.fortressLevels.ops > 0 ? `+${(factionStore.fortressCrimeSuccessBonus * 100).toFixed(0)}%` : '—' }}
            </span>
          </div>
          <div class="player-buff-row" :class="{ inactive: factionStore.fortressLevels.ops === 0 }">
            <span class="pbuff-icon">⚡</span>
            <span class="pbuff-label">Μέγιστο Θράσος</span>
            <span class="pbuff-value text-mono" :class="factionStore.fortressLevels.ops > 0 ? 'text-success' : 'text-muted'">
              {{ factionStore.fortressLevels.ops > 0 ? `+${factionStore.fortressNerveBonus}` : '—' }}
            </span>
          </div>
          <div class="player-buff-row" :class="{ inactive: factionStore.fortressLevels.pantopoleio === 0 }">
            <span class="pbuff-icon">🏪</span>
            <span class="pbuff-label">Φιλότιμο/ημέρα</span>
            <span class="pbuff-value text-mono" :class="factionStore.fortressLevels.pantopoleio > 0 ? 'text-success' : 'text-muted'">
              {{ factionStore.fortressLevels.pantopoleio > 0 ? `+${factionStore.fortressPantopoleioFilotimo}` : '—' }}
            </span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useFactionStore, FORTRESS_BUILDINGS, fortressUpgradeCost } from '../stores/factionStore'
import { factions } from '../data/factions'

const player = usePlayerStore()
const factionStore = useFactionStore()

const tab = ref('faction')
const showLeaveConfirm = ref(false)
const donateAmount = ref(null)
const donatePresets = [500, 1000, 5000, 10000]

const joinedAgo = computed(() => {
  if (!factionStore.joinedAt) return ''
  const days = Math.floor((Date.now() - factionStore.joinedAt) / 86400000)
  if (days === 0) return 'Σήμερα'
  if (days === 1) return 'Χθες'
  return `${days} ημέρες πριν`
})

function leave() {
  factionStore.leaveFaction()
  showLeaveConfirm.value = false
}

const canDonate = computed(() =>
  donateAmount.value > 0 && player.cash >= donateAmount.value && factionStore.currentFaction
)

function donateCash() {
  if (!canDonate.value) return
  factionStore.donateToVault(donateAmount.value)
  donateAmount.value = null
}

const hasAnyFortress = computed(() =>
  Object.values(factionStore.fortressLevels).some(v => v > 0)
)

function isMaxLevel(bKey) {
  return factionStore.fortressLevels[bKey] >= FORTRESS_BUILDINGS[bKey].maxLevel
}

function upgradeCost(bKey) {
  return fortressUpgradeCost(bKey, factionStore.fortressLevels[bKey])
}

function upgradeBuilding(bKey) {
  factionStore.upgradeFortressBuilding(bKey)
}

function buildingActiveBuff(bKey) {
  const lvl = factionStore.fortressLevels[bKey]
  if (bKey === 'gym') return `+${lvl * 2}% πολλαπλασιαστής Γυμναστηρίου`
  if (bKey === 'accounting') return `+${lvl * 2}% παθητικό εισόδημα Εταιρείας`
  if (bKey === 'ops') return `+${lvl} μέγ. Θράσος, +${lvl}% επιτυχία Εγκλήματος`
  if (bKey === 'pantopoleio') return `+${lvl * 2} Φιλότιμο/ημέρα`
  return ''
}

function buildingNextBuff(bKey) {
  const nextLvl = factionStore.fortressLevels[bKey] + 1
  if (bKey === 'gym') return `+${nextLvl * 2}% πολλαπλασιαστής Γυμναστηρίου`
  if (bKey === 'accounting') return `+${nextLvl * 2}% παθητικό εισόδημα Εταιρείας`
  if (bKey === 'ops') return `+${nextLvl} μέγ. Θράσος, +${nextLvl}% επιτυχία Εγκλήματος`
  if (bKey === 'pantopoleio') return `+${nextLvl * 2} Φιλότιμο/ημέρα`
  return ''
}
</script>

<style scoped>
.faction-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); }

/* Tabs */
.tab-bar { display: flex; gap: var(--space-xs); }
.tab-btn {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}
.tab-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--bg-base);
}

/* Current faction */
.join-hint { padding: var(--space-sm); font-size: var(--font-size-sm); }
.current-faction { border-left: 3px solid; display: flex; flex-direction: column; gap: var(--space-sm); }
.cf-header { display: flex; align-items: center; gap: var(--space-sm); }
.cf-icon { font-size: 32px; }
.cf-info strong { font-size: var(--font-size-lg); }
.cf-sub { font-size: var(--font-size-xs); display: block; }
.cf-desc { font-size: var(--font-size-sm); margin: 0; }
.cf-bonus { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.cf-leader { font-size: var(--font-size-xs); }
.cf-stats { display: flex; gap: var(--space-md); font-size: var(--font-size-xs); }
.leave-confirm { display: flex; align-items: center; gap: var(--space-sm); margin-top: var(--space-xs); }
.btn-danger-outline { color: var(--color-danger); border-color: var(--color-danger); align-self: flex-start; }

/* Faction list */
.faction-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.faction-card { border-left: 3px solid; display: flex; flex-direction: column; gap: var(--space-sm); }
.fc-header { display: flex; align-items: flex-start; gap: var(--space-sm); }
.fc-icon { font-size: 28px; flex-shrink: 0; }
.fc-info { flex: 1; min-width: 0; }
.fc-info strong { font-size: var(--font-size-sm); }
.fc-desc { font-size: var(--font-size-xs); margin: 2px 0 0; }
.fc-details { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; font-size: var(--font-size-xs); }
.fc-members { font-size: var(--font-size-xs); }
.fc-leader { font-size: var(--font-size-xs); }
.fc-req { display: flex; align-items: center; gap: var(--space-xs); font-size: var(--font-size-xs); }

/* Fortress */
.no-faction { text-align: center; padding: var(--space-xl); display: flex; flex-direction: column; align-items: center; gap: var(--space-md); }
.section-heading {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-secondary);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.faction-header-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.faction-identity { display: flex; align-items: center; gap: var(--space-md); }
.faction-icon { font-size: 36px; }
.faction-name { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); }
.faction-rank-row { display: flex; align-items: center; gap: var(--space-sm); margin-top: 2px; }
.rank-badge { font-size: 10px; font-weight: var(--font-weight-bold); padding: 2px 8px; border-radius: 999px; }
.rank-member   { background: rgba(144,164,174,0.15); color: #90a4ae; }
.rank-veteran  { background: rgba(100,181,246,0.15); color: #64b5f6; }
.rank-officer  { background: rgba(171,71,188,0.15); color: #ce93d8; }
.rank-leader   { background: rgba(255,215,0,0.15); color: #ffd700; }
.active-buffs-mini { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
.active-buff-tag { font-size: 11px; padding: 3px 8px; border-radius: var(--border-radius-sm); background: rgba(76,175,80,0.15); color: #a5d6a7; border: 1px solid rgba(76,175,80,0.25); }

.vault-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.vault-balance-row { display: flex; justify-content: space-between; align-items: center; }
.vault-label { font-weight: var(--font-weight-bold); }
.vault-amount { font-size: var(--font-size-lg); }
.vault-desc { font-size: 12px; line-height: 1.5; }
.donate-form { display: flex; flex-direction: column; gap: var(--space-xs); }
.donate-input-row { display: flex; gap: var(--space-sm); }
.donate-input { flex: 1; padding: var(--space-sm) var(--space-md); border-radius: var(--border-radius-md); border: 1px solid rgba(255,255,255,0.15); background: var(--bg-surface-raised); color: var(--text-primary); font-size: var(--font-size-sm); }
.donate-input:focus { outline: none; border-color: var(--color-accent); }
.donate-btn { white-space: nowrap; }
.donate-presets { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
.preset-btn { padding: 4px 12px; border-radius: var(--border-radius-sm); border: 1px solid rgba(255,255,255,0.12); background: transparent; color: var(--text-secondary); font-size: 12px; cursor: pointer; transition: all var(--transition-fast); }
.preset-btn:not(:disabled):hover { border-color: var(--color-accent); color: var(--color-accent); }
.preset-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.upgrade-locked-notice { font-size: 12px; padding: var(--space-sm) var(--space-md); border-radius: var(--border-radius-md); background: rgba(255,152,0,0.08); border: 1px solid rgba(255,152,0,0.2); color: #ffb74d; }
.buildings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-md); }
.building-card { background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--border-radius-lg); padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-sm); transition: border-color var(--transition-fast); }
.building-card.maxed { border-color: rgba(255,215,0,0.35); background: rgba(255,215,0,0.04); }
.building-header { display: flex; align-items: flex-start; gap: var(--space-sm); }
.building-icon { font-size: 32px; flex-shrink: 0; }
.building-name { font-size: var(--font-size-md); font-weight: var(--font-weight-bold); }
.level-badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; font-weight: var(--font-weight-bold); }
.level-normal { background: rgba(79,195,247,0.15); color: #4fc3f7; }
.level-max    { background: rgba(255,215,0,0.2); color: #ffd700; }
.building-desc { font-size: 12px; line-height: 1.5; }
.level-bar-track { position: relative; height: 8px; background: var(--bg-surface-raised); border-radius: 4px; overflow: hidden; }
.level-bar-fill { height: 100%; background: linear-gradient(90deg, var(--color-accent), #ab47bc); border-radius: 4px; transition: width var(--transition-normal); }
.level-bar-label { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 9px; color: rgba(255,255,255,0.7); font-weight: var(--font-weight-bold); }
.building-buff-active { display: flex; gap: var(--space-xs); align-items: center; font-size: 12px; }
.buff-active-label { color: #a5d6a7; font-weight: var(--font-weight-bold); }
.building-next-level { display: flex; gap: var(--space-xs); align-items: center; font-size: 11px; }
.next-label { color: var(--text-secondary); }
.next-value { color: var(--color-accent); }
.building-footer { margin-top: auto; }
.upgrade-cost-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xs); }
.upgrade-cost { font-size: 14px; font-weight: var(--font-weight-bold); }
.btn-upgrade { width: 100%; padding: var(--space-sm); border-radius: var(--border-radius-md); border: 1px solid rgba(79,195,247,0.35); background: linear-gradient(135deg, rgba(79,195,247,0.25), rgba(171,71,188,0.25)); color: var(--text-primary); font-weight: var(--font-weight-bold); font-size: var(--font-size-sm); cursor: pointer; transition: all var(--transition-fast); }
.btn-upgrade:not(:disabled):hover { background: linear-gradient(135deg, rgba(79,195,247,0.4), rgba(171,71,188,0.4)); }
.btn-upgrade:disabled { opacity: 0.35; cursor: not-allowed; }
.maxed-label { text-align: center; font-weight: var(--font-weight-bold); color: #ffd700; font-size: var(--font-size-sm); }

.player-buffs-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.player-buff-row { display: flex; align-items: center; gap: var(--space-sm); font-size: var(--font-size-sm); padding: var(--space-xs) 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.player-buff-row:last-child { border-bottom: none; }
.player-buff-row.inactive { opacity: 0.45; }
.pbuff-icon { width: 24px; text-align: center; }
.pbuff-label { flex: 1; }
.pbuff-value { font-weight: var(--font-weight-bold); }
</style>
