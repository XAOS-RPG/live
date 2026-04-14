<template>
  <div class="fortress-page">
    <h2 class="page-title">🏰 Οχυρό Συμμορίας</h2>

    <!-- No faction guard -->
    <div v-if="!faction.currentFaction" class="card no-faction">
      <span style="font-size: 48px">🏴</span>
      <p>Δεν είσαι μέλος καμίας Συμμορίας.</p>
      <router-link to="/faction" class="btn btn-primary">Βρες Συμμορία</router-link>
    </div>

    <template v-else>
      <!-- ─── Header / Faction identity ──────────────────────────────── -->
      <div class="card faction-header-card">
        <div class="faction-identity">
          <span class="faction-icon">🏴</span>
          <div>
            <div class="faction-name">{{ faction.faction?.name }}</div>
            <div class="faction-rank-row">
              <span class="rank-badge" :class="`rank-${faction.rank}`">{{ faction.rankTitle }}</span>
              <span class="text-muted" style="font-size: 11px">{{ faction.contribution }} Συνεισφορά</span>
            </div>
          </div>
        </div>

        <!-- Active fortress buffs summary -->
        <div v-if="hasAnyFortress" class="active-buffs-mini">
          <span v-if="faction.fortressLevels.gym > 0" class="active-buff-tag">
            🏋️ Γυμναστήριο +{{ (faction.fortressGymBonus - 1) * 100 | 0 }}%
          </span>
          <span v-if="faction.fortressLevels.accounting > 0" class="active-buff-tag">
            📊 Εταιρεία +{{ (faction.fortressAccountingBonus - 1) * 100 | 0 }}%
          </span>
          <span v-if="faction.fortressLevels.ops > 0" class="active-buff-tag">
            🎯 Θράσος +{{ faction.fortressNerveBonus }} | Εγκλήματα +{{ faction.fortressLevels.ops }}%
          </span>
        </div>
      </div>

      <!-- ─── Vault Section ──────────────────────────────────────────── -->
      <section class="section-heading">🏦 Θησαυροφυλάκιο Συμμορίας</section>
      <div class="card vault-card">
        <div class="vault-balance-row">
          <span class="vault-label">Υπόλοιπο Θησαυροφυλακίου</span>
          <span class="vault-amount text-mono text-success">€{{ faction.vault.toLocaleString() }}</span>
        </div>
        <p class="text-muted vault-desc">
          Τα μέλη δωρίζουν μετρητά στο Θησαυροφυλάκιο. Αξιωματικοί και Αρχηγοί μπορούν να χρησιμοποιήσουν αυτά τα κεφάλαια για αναβαθμίσεις του Οχυρού.
        </p>

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
            <button
              class="btn btn-success donate-btn"
              :disabled="!canDonate"
              @click="donateCash"
            >
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

      <!-- ─── Fortress Buildings ────────────────────────────────────── -->
      <section class="section-heading">🧱 Κτίρια Οχυρού</section>

      <div
        v-if="!faction.canUpgradeFortress"
        class="upgrade-locked-notice text-muted"
      >
        🔒 Μόνο Αξιωματικοί και Αρχηγοί μπορούν να αναβαθμίσουν κτίρια. Χρειάζεσαι 500 Συνεισφορά για Αξιωματικός.
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
                  {{ isMaxLevel(bKey) ? 'MAX' : `Επίπεδο ${faction.fortressLevels[bKey]}` }}
                </span>
              </div>
            </div>
          </div>

          <p class="building-desc text-muted">{{ building.description }}</p>

          <!-- Level bar -->
          <div class="level-bar-track">
            <div
              class="level-bar-fill"
              :style="{ width: (faction.fortressLevels[bKey] / building.maxLevel * 100) + '%' }"
            />
            <span class="level-bar-label">{{ faction.fortressLevels[bKey] }}/{{ building.maxLevel }}</span>
          </div>

          <!-- Current buff active -->
          <div v-if="faction.fortressLevels[bKey] > 0" class="building-buff-active">
            <span class="buff-active-label">✅ Ενεργό:</span>
            <span class="buff-active-value">{{ buildingActiveBuff(bKey) }}</span>
          </div>

          <!-- Next level preview -->
          <div v-if="!isMaxLevel(bKey)" class="building-next-level">
            <span class="next-label">→ Επίπεδο {{ faction.fortressLevels[bKey] + 1 }}:</span>
            <span class="next-value">{{ buildingNextBuff(bKey) }}</span>
          </div>

          <!-- Upgrade button + cost -->
          <div class="building-footer">
            <template v-if="!isMaxLevel(bKey)">
              <div class="upgrade-cost-row">
                <span class="text-muted" style="font-size: 11px">Κόστος Αναβάθμισης:</span>
                <span class="upgrade-cost text-mono" :class="faction.vault >= upgradeCost(bKey) ? 'text-success' : 'text-danger'">
                  €{{ upgradeCost(bKey).toLocaleString() }}
                </span>
              </div>
              <button
                class="btn-upgrade"
                :disabled="!faction.canUpgradeFortress || faction.vault < upgradeCost(bKey)"
                @click="upgradeBuilding(bKey)"
              >
                ⬆ Αναβάθμιση
              </button>
            </template>
            <div v-else class="maxed-label">🏆 Μέγιστο Επίπεδο!</div>
          </div>
        </div>
      </div>

      <!-- ─── Player buff summary ───────────────────────────────────── -->
      <section class="section-heading">📋 Τρέχοντα Bonus για Εσένα</section>
      <div class="card player-buffs-card">
        <div class="player-buff-row" :class="{ inactive: faction.fortressLevels.gym === 0 }">
          <span class="pbuff-icon">🏋️</span>
          <span class="pbuff-label">Πολλαπλασιαστής Γυμναστηρίου</span>
          <span class="pbuff-value text-mono" :class="faction.fortressLevels.gym > 0 ? 'text-success' : 'text-muted'">
            {{ faction.fortressLevels.gym > 0 ? `+${((faction.fortressGymBonus - 1) * 100).toFixed(0)}%` : '—' }}
          </span>
        </div>
        <div class="player-buff-row" :class="{ inactive: faction.fortressLevels.accounting === 0 }">
          <span class="pbuff-icon">📊</span>
          <span class="pbuff-label">Παθητικό Εισόδημα Εταιρείας</span>
          <span class="pbuff-value text-mono" :class="faction.fortressLevels.accounting > 0 ? 'text-success' : 'text-muted'">
            {{ faction.fortressLevels.accounting > 0 ? `+${((faction.fortressAccountingBonus - 1) * 100).toFixed(0)}%` : '—' }}
          </span>
        </div>
        <div class="player-buff-row" :class="{ inactive: faction.fortressLevels.ops === 0 }">
          <span class="pbuff-icon">🎯</span>
          <span class="pbuff-label">Επιτυχία Εγκλήματος</span>
          <span class="pbuff-value text-mono" :class="faction.fortressLevels.ops > 0 ? 'text-success' : 'text-muted'">
            {{ faction.fortressLevels.ops > 0 ? `+${(faction.fortressCrimeSuccessBonus * 100).toFixed(0)}%` : '—' }}
          </span>
        </div>
        <div class="player-buff-row" :class="{ inactive: faction.fortressLevels.ops === 0 }">
          <span class="pbuff-icon">⚡</span>
          <span class="pbuff-label">Μέγιστο Θράσος</span>
          <span class="pbuff-value text-mono" :class="faction.fortressLevels.ops > 0 ? 'text-success' : 'text-muted'">
            {{ faction.fortressLevels.ops > 0 ? `+${faction.fortressNerveBonus}` : '—' }}
          </span>
        </div>
        <div class="player-buff-row" :class="{ inactive: faction.fortressLevels.pantopoleio === 0 }">
          <span class="pbuff-icon">🏪</span>
          <span class="pbuff-label">Φιλότιμο/ημέρα</span>
          <span class="pbuff-value text-mono" :class="faction.fortressLevels.pantopoleio > 0 ? 'text-success' : 'text-muted'">
            {{ faction.fortressLevels.pantopoleio > 0 ? `+${faction.fortressPantopoleioFilotimo}` : '—' }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFactionStore, FORTRESS_BUILDINGS, fortressUpgradeCost } from '../stores/factionStore'
import { usePlayerStore } from '../stores/playerStore'

const faction = useFactionStore()
const player = usePlayerStore()

const donateAmount = ref(null)
const donatePresets = [500, 1000, 5000, 10000]

const canDonate = computed(() =>
  donateAmount.value > 0 && player.cash >= donateAmount.value && faction.currentFaction
)

function donateCash() {
  if (!canDonate.value) return
  faction.donateToVault(donateAmount.value)
  donateAmount.value = null
}

function isMaxLevel(bKey) {
  return faction.fortressLevels[bKey] >= FORTRESS_BUILDINGS[bKey].maxLevel
}

function upgradeCost(bKey) {
  return fortressUpgradeCost(bKey, faction.fortressLevels[bKey])
}

function upgradeBuilding(bKey) {
  faction.upgradeFortressBuilding(bKey)
}

const hasAnyFortress = computed(() =>
  Object.values(faction.fortressLevels).some(v => v > 0)
)

function buildingActiveBuff(bKey) {
  const lvl = faction.fortressLevels[bKey]
  if (bKey === 'gym') return `+${lvl * 2}% πολλαπλασιαστής Γυμναστηρίου`
  if (bKey === 'accounting') return `+${lvl * 2}% παθητικό εισόδημα Εταιρείας`
  if (bKey === 'ops') return `+${lvl} μέγ. Θράσος, +${lvl}% επιτυχία Εγκλήματος`
  if (bKey === 'pantopoleio') return `+${lvl * 2} Φιλότιμο/ημέρα`
  return ''
}

function buildingNextBuff(bKey) {
  const nextLvl = faction.fortressLevels[bKey] + 1
  if (bKey === 'gym') return `+${nextLvl * 2}% πολλαπλασιαστής Γυμναστηρίου`
  if (bKey === 'accounting') return `+${nextLvl * 2}% παθητικό εισόδημα Εταιρείας`
  if (bKey === 'ops') return `+${nextLvl} μέγ. Θράσος, +${nextLvl}% επιτυχία Εγκλήματος`
  if (bKey === 'pantopoleio') return `+${nextLvl * 2} Φιλότιμο/ημέρα`
  return ''
}
</script>

<style scoped>
.fortress-page { padding: var(--space-md); max-width: 900px; margin: 0 auto; }

.section-heading {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-secondary);
  margin: var(--space-lg) 0 var(--space-sm);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

/* ── No faction ─────────────────────────────────────────────────────────── */
.no-faction {
  text-align: center;
  padding: var(--space-xl);
  display: flex; flex-direction: column; align-items: center; gap: var(--space-md);
}

/* ── Faction header ──────────────────────────────────────────────────────── */
.faction-header-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.faction-identity { display: flex; align-items: center; gap: var(--space-md); }
.faction-icon { font-size: 36px; }
.faction-name { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); }
.faction-rank-row { display: flex; align-items: center; gap: var(--space-sm); margin-top: 2px; }

.rank-badge {
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  padding: 2px 8px;
  border-radius: 999px;
}
.rank-member   { background: rgba(144,164,174,0.15); color: #90a4ae; }
.rank-veteran  { background: rgba(100,181,246,0.15); color: #64b5f6; }
.rank-officer  { background: rgba(171,71,188,0.15); color: #ce93d8; }
.rank-leader   { background: rgba(255,215,0,0.15); color: #ffd700; }

.active-buffs-mini { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
.active-buff-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: var(--border-radius-sm);
  background: rgba(76,175,80,0.15);
  color: #a5d6a7;
  border: 1px solid rgba(76,175,80,0.25);
}

/* ── Vault ───────────────────────────────────────────────────────────────── */
.vault-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.vault-balance-row { display: flex; justify-content: space-between; align-items: center; }
.vault-label { font-weight: var(--font-weight-bold); }
.vault-amount { font-size: var(--font-size-lg); }
.vault-desc { font-size: 12px; line-height: 1.5; }

.donate-form { display: flex; flex-direction: column; gap: var(--space-xs); }
.donate-input-row { display: flex; gap: var(--space-sm); }
.donate-input {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(255,255,255,0.15);
  background: var(--bg-surface-raised);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}
.donate-input:focus { outline: none; border-color: var(--color-accent); }
.donate-btn { white-space: nowrap; }

.donate-presets { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
.preset-btn {
  padding: 4px 12px;
  border-radius: var(--border-radius-sm);
  border: 1px solid rgba(255,255,255,0.12);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.preset-btn:not(:disabled):hover { border-color: var(--color-accent); color: var(--color-accent); }
.preset-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── Buildings ───────────────────────────────────────────────────────────── */
.upgrade-locked-notice {
  font-size: 12px;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  background: rgba(255,152,0,0.08);
  border: 1px solid rgba(255,152,0,0.2);
  color: #ffb74d;
  margin-bottom: var(--space-md);
}

.buildings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-md);
}

.building-card {
  background: var(--bg-surface);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--border-radius-lg);
  padding: var(--space-lg);
  display: flex; flex-direction: column; gap: var(--space-sm);
  transition: border-color var(--transition-fast);
}
.building-card.maxed { border-color: rgba(255,215,0,0.35); background: rgba(255,215,0,0.04); }

.building-header { display: flex; align-items: flex-start; gap: var(--space-sm); }
.building-icon { font-size: 32px; flex-shrink: 0; }
.building-name { font-size: var(--font-size-md); font-weight: var(--font-weight-bold); }

.level-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: var(--font-weight-bold);
}
.level-normal { background: rgba(79,195,247,0.15); color: #4fc3f7; }
.level-max    { background: rgba(255,215,0,0.2); color: #ffd700; }

.building-desc { font-size: 12px; line-height: 1.5; }

.level-bar-track {
  position: relative;
  height: 8px;
  background: var(--bg-surface-raised);
  border-radius: 4px;
  overflow: hidden;
}
.level-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), #ab47bc);
  border-radius: 4px;
  transition: width var(--transition-normal);
}
.level-bar-label {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 9px;
  color: rgba(255,255,255,0.7);
  font-weight: var(--font-weight-bold);
}

.building-buff-active {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  font-size: 12px;
}
.buff-active-label { color: #a5d6a7; font-weight: var(--font-weight-bold); }
.buff-active-value { color: var(--text-primary); }

.building-next-level {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  font-size: 11px;
}
.next-label { color: var(--text-secondary); }
.next-value { color: var(--color-accent); }

.building-footer { margin-top: auto; }
.upgrade-cost-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xs); }
.upgrade-cost { font-size: 14px; font-weight: var(--font-weight-bold); }

.btn-upgrade {
  width: 100%;
  padding: var(--space-sm);
  border-radius: var(--border-radius-md);
  border: none;
  background: linear-gradient(135deg, rgba(79,195,247,0.25), rgba(171,71,188,0.25));
  border: 1px solid rgba(79,195,247,0.35);
  color: var(--text-primary);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-upgrade:not(:disabled):hover { background: linear-gradient(135deg, rgba(79,195,247,0.4), rgba(171,71,188,0.4)); transform: scale(1.01); }
.btn-upgrade:disabled { opacity: 0.35; cursor: not-allowed; }

.maxed-label {
  text-align: center;
  font-weight: var(--font-weight-bold);
  color: #ffd700;
  font-size: var(--font-size-sm);
}

/* ── Player buff summary ─────────────────────────────────────────────────── */
.player-buffs-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.player-buff-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-sm);
  padding: var(--space-xs) 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.player-buff-row:last-child { border-bottom: none; }
.player-buff-row.inactive { opacity: 0.45; }
.pbuff-icon { width: 24px; text-align: center; }
.pbuff-label { flex: 1; }
.pbuff-value { font-weight: var(--font-weight-bold); }
</style>
