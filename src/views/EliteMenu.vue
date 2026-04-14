<template>
  <div class="elite-page">
    <div class="elite-header">
      <div class="elite-title-row">
        <span class="elite-crown">👑</span>
        <div>
          <h2 class="page-title">Elite Ascension</h2>
          <p class="page-sub text-muted">Level 2+ endgame — χωρίς reset, χωρίς απώλειες.</p>
        </div>
      </div>

      <!-- Locked state -->
      <div v-if="!elite.unlocked" class="lock-card card">
        <div class="lock-progress">
          <div class="stat-label">
            <span>📊 Πρόοδος</span>
            <span class="text-mono">Lv.{{ player.level }} / {{ ELITE_MIN_LEVEL }}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: Math.min(100, (player.level / ELITE_MIN_LEVEL) * 100) + '%' }" />
          </div>
        </div>
        <button class="btn btn-elite" :disabled="!elite.canUnlock" @click="elite.unlock()">
          👑 Ξεκλείδωσε Elite Ascension
        </button>
      </div>
    </div>

    <template v-if="elite.unlocked">
      <!-- Tabs -->
      <div class="tabs">
        <button v-for="t in tabs" :key="t.id" class="tab-btn" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <!-- ── Shadow Control ── -->
      <div v-if="activeTab === 'shadow'" class="tab-content">
        <div class="card">
          <h3 class="section-title">🥷 Shadow Control — Παθητικά Εγκλήματα</h3>
          <p class="text-muted hint">Οι βοηθοί σου κάνουν εγκλήματα αυτόματα. Κέρδη: €{{ elite.shadowIncome.toLocaleString() }}</p>

          <div class="henchman-list">
            <div v-for="(h, i) in elite.activeHenchmen" :key="i" class="henchman-row">
              <span class="h-icon">{{ h.def?.icon }}</span>
              <div class="h-info">
                <strong>{{ h.def?.label }}</strong>
                <span class="text-muted">€{{ h.def?.cashPerRun }}/{{ formatMs(h.def?.intervalMs) }}</span>
              </div>
              <button class="btn btn-xs btn-danger" @click="elite.fireHenchman(i)">Απόλυση</button>
            </div>
            <div v-if="!elite.henchmen.length" class="text-muted hint">Δεν έχεις βοηθούς ακόμα.</div>
          </div>

          <div v-if="!elite.henchmanSlotsFull" class="hire-grid">
            <div v-for="type in HENCHMAN_TYPES" :key="type.id" class="hire-card">
              <span class="h-icon">{{ type.icon }}</span>
              <strong>{{ type.label }}</strong>
              <span class="text-muted">€{{ type.cashPerRun }}/{{ formatMs(type.intervalMs) }}</span>
              <button class="btn btn-sm btn-primary" :disabled="player.cash < type.hireCost" @click="elite.hireHenchman(type.id)">
                Πρόσληψη €{{ type.hireCost.toLocaleString() }}
              </button>
            </div>
          </div>
          <p v-else class="text-muted hint">Μέγιστος αριθμός βοηθών ({{ elite.henchmen.length }}/5).</p>
        </div>
      </div>

      <!-- ── Networking Tree ── -->
      <div v-if="activeTab === 'network'" class="tab-content">
        <div class="card">
          <h3 class="section-title">🤝 Networking Tree</h3>
          <p class="text-muted hint">Ξόδεψε Μέσον για μόνιμα perks. Μέσον: <strong>{{ player.meson }}</strong></p>

          <div class="perk-list">
            <div v-for="perk in NETWORK_PERKS" :key="perk.id" class="perk-row" :class="{ unlocked: elite.isPerkUnlocked(perk.id), locked: perk.requires && !elite.isPerkUnlocked(perk.requires) }">
              <span class="perk-icon">{{ perk.icon }}</span>
              <div class="perk-info">
                <strong>{{ perk.label }}</strong>
                <span class="text-muted">{{ perk.desc }}</span>
                <span v-if="perk.requires" class="req-label">Απαιτεί: {{ NETWORK_PERKS.find(p => p.id === perk.requires)?.label }}</span>
              </div>
              <div class="perk-action">
                <span v-if="elite.isPerkUnlocked(perk.id)" class="text-success">✓ Ενεργό</span>
                <button
                  v-else
                  class="btn btn-sm btn-accent"
                  :disabled="(perk.requires && !elite.isPerkUnlocked(perk.requires)) || player.meson < perk.mesonCost"
                  @click="elite.unlockPerk(perk.id)"
                >
                  {{ perk.mesonCost }} Μέσον
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Political Influence ── -->
      <div v-if="activeTab === 'politics'" class="tab-content">
        <div class="card">
          <h3 class="section-title">🏛️ Political Influence</h3>
          <p class="text-muted hint">Αγόρασε επιρροή σε πόλεις για παθητικό φόρο. Συνολικά: €{{ elite.totalInfluenceTax.toLocaleString() }}</p>

          <div class="city-grid">
            <div v-for="city in CITY_INFLUENCE" :key="city.cityId" class="city-card" :class="{ owned: elite.hasCityInfluence(city.cityId) }">
              <span class="city-icon">{{ city.icon }}</span>
              <strong>{{ city.label }}</strong>
              <span class="text-muted">{{ (city.taxRate * 100).toFixed(1) }}% φόρος/ώρα</span>
              <span v-if="elite.hasCityInfluence(city.cityId)" class="text-success owned-badge">✓ Υπό Έλεγχο</span>
              <button
                v-else
                class="btn btn-sm btn-primary"
                :disabled="player.filotimo < city.filotimoCost || player.cash < city.cashCost"
                @click="elite.buyInfluence(city.cityId)"
              >
                {{ city.filotimoCost }}🏅 + €{{ city.cashCost.toLocaleString() }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Legal Fronts ── -->
      <div v-if="activeTab === 'fronts'" class="tab-content">
        <div class="card">
          <h3 class="section-title">🏦 Legal Fronts — Ξέπλυμα & Status</h3>

          <div class="money-row">
            <div class="money-block dirty">
              <span class="money-label">💰 Βρώμικα</span>
              <span class="money-val">€{{ elite.dirtyMoney.toLocaleString() }}</span>
            </div>
            <div class="money-block clean">
              <span class="money-label">✨ Καθαρά</span>
              <span class="money-val">€{{ elite.cleanMoney.toLocaleString() }}</span>
            </div>
          </div>

          <div class="launder-row">
            <input v-model.number="launderAmount" type="number" class="input-sm" placeholder="Ποσό..." min="1" :max="elite.dirtyMoney" />
            <button class="btn btn-sm btn-accent" :disabled="!launderAmount || launderAmount <= 0 || !companyStore.company" @click="doLaunder">
              Ξέπλυμα (70%)
            </button>
          </div>
          <p v-if="!companyStore.company" class="text-danger hint">Χρειάζεσαι εταιρεία για ξέπλυμα!</p>

          <h3 class="section-title" style="margin-top: var(--space-md)">🌟 Status Symbols</h3>
          <div class="symbol-list">
            <div v-for="sym in STATUS_SYMBOLS" :key="sym.id" class="symbol-row" :class="{ owned: elite.hasSymbol(sym.id) }">
              <span class="sym-icon">{{ sym.icon }}</span>
              <div class="sym-info">
                <strong>{{ sym.label }}</strong>
                <span class="text-muted">{{ formatBuff(sym.buff) }}</span>
              </div>
              <div class="sym-action">
                <span v-if="elite.hasSymbol(sym.id)" class="text-success">✓</span>
                <button
                  v-else
                  class="btn btn-sm btn-gold"
                  :disabled="elite.cleanMoney < sym.cleanCost"
                  @click="elite.buyStatusSymbol(sym.id)"
                >
                  €{{ sym.cleanCost.toLocaleString() }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useEliteStore, ELITE_MIN_LEVEL, HENCHMAN_TYPES, NETWORK_PERKS, CITY_INFLUENCE, STATUS_SYMBOLS } from '../stores/eliteStore'
import { useCompanyStore } from '../stores/companyStore'

const player = usePlayerStore()
const elite = useEliteStore()
const companyStore = useCompanyStore()

const activeTab = ref('shadow')
const launderAmount = ref(null)

const tabs = [
  { id: 'shadow',   icon: '🥷', label: 'Shadow' },
  { id: 'network',  icon: '🤝', label: 'Network' },
  { id: 'politics', icon: '🏛️', label: 'Πολιτική' },
  { id: 'fronts',   icon: '🏦', label: 'Fronts' },
]

function doLaunder() {
  if (!launderAmount.value) return
  elite.launderMoney(launderAmount.value)
  launderAmount.value = null
}

function formatMs(ms) {
  if (!ms) return ''
  const m = Math.floor(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}ω` : `${m}λ`
}

function formatBuff(buff) {
  return Object.entries(buff).map(([k, v]) => {
    const labels = { crimeReward: 'Κέρδη εγκλημάτων', jailReduction: 'Χρόνος φυλακής', allStats: 'Όλα τα stats', gymGains: 'Gym gains', xpBonus: 'XP' }
    const sign = k === 'jailReduction' ? '-' : '+'
    return `${sign}${(v * 100).toFixed(0)}% ${labels[k] || k}`
  }).join(', ')
}
</script>

<style scoped>
.elite-page { display: flex; flex-direction: column; gap: var(--space-md); }

.elite-header { display: flex; flex-direction: column; gap: var(--space-sm); }

.elite-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.elite-crown { font-size: 2rem; }
.page-title { font-size: var(--font-size-2xl); margin: 0; }
.page-sub { font-size: var(--font-size-xs); margin: 0; }

.lock-card { text-align: center; border-left: 3px solid gold; }

.lock-progress { margin-bottom: var(--space-md); text-align: left; }

.stat-label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }

.bar-track { height: 8px; background: var(--bg-surface-raised); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--color-accent); border-radius: 4px; transition: width 0.3s; }

.btn-elite {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #000;
  font-weight: bold;
  width: 100%;
  border: none;
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-size: var(--font-size-md);
}
.btn-elite:disabled { opacity: 0.4; cursor: not-allowed; }

.tabs {
  display: flex;
  gap: var(--space-xs);
  overflow-x: auto;
  padding-bottom: 2px;
}

.tab-btn {
  flex: 1;
  min-width: 70px;
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}
.tab-btn.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary-light);
}

.tab-content { display: flex; flex-direction: column; gap: var(--space-sm); }

.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin: 0 0 var(--space-sm);
}

.hint { font-size: 11px; margin: 0 0 var(--space-sm); }

/* Henchmen */
.henchman-list { display: flex; flex-direction: column; gap: var(--space-xs); margin-bottom: var(--space-sm); }

.henchman-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
}

.h-icon { font-size: 1.4rem; }
.h-info { flex: 1; display: flex; flex-direction: column; font-size: var(--font-size-sm); }

.hire-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.hire-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  text-align: center;
}

/* Perks */
.perk-list { display: flex; flex-direction: column; gap: var(--space-xs); }

.perk-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  border-left: 3px solid transparent;
  transition: border-color var(--transition-fast);
}
.perk-row.unlocked { border-left-color: var(--color-success); }
.perk-row.locked { opacity: 0.5; }

.perk-icon { font-size: 1.4rem; }
.perk-info { flex: 1; display: flex; flex-direction: column; font-size: var(--font-size-sm); }
.req-label { font-size: 10px; color: var(--color-warning); }
.perk-action { min-width: 80px; text-align: right; }

/* Cities */
.city-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.city-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  text-align: center;
  border: 1px solid var(--border-color);
  transition: border-color var(--transition-fast);
}
.city-card.owned { border-color: var(--color-success); }
.city-icon { font-size: 1.6rem; }
.owned-badge { font-size: 10px; }

/* Legal Fronts */
.money-row { display: flex; gap: var(--space-sm); margin-bottom: var(--space-sm); }

.money-block {
  flex: 1;
  padding: var(--space-sm);
  border-radius: var(--border-radius-md);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.money-block.dirty { background: rgba(229, 57, 53, 0.1); border: 1px solid rgba(229, 57, 53, 0.3); }
.money-block.clean { background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); }
.money-label { font-size: 10px; color: var(--text-secondary); }
.money-val { font-size: var(--font-size-lg); font-weight: bold; }

.launder-row { display: flex; gap: var(--space-sm); margin-bottom: var(--space-xs); }

.input-sm {
  flex: 1;
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.symbol-list { display: flex; flex-direction: column; gap: var(--space-xs); }

.symbol-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  border-left: 3px solid transparent;
}
.symbol-row.owned { border-left-color: gold; }

.sym-icon { font-size: 1.4rem; }
.sym-info { flex: 1; display: flex; flex-direction: column; font-size: var(--font-size-sm); }
.sym-action { min-width: 80px; text-align: right; }

.btn-gold {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #000;
  font-weight: bold;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 11px;
}
.btn-gold:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-accent {
  background: var(--color-accent-dark);
  color: #fff;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 11px;
}
.btn-accent:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-xs { padding: 2px 6px; font-size: 10px; }

.text-success { color: var(--color-success); }
.text-danger  { color: var(--color-danger); }
.text-muted   { color: var(--text-secondary); font-size: var(--font-size-xs); }
.text-mono    { font-family: var(--font-family-mono); font-size: 11px; }
</style>
