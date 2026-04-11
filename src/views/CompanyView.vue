<template>
  <div class="company-page">
    <h2 class="page-title">🏢 Εταιρεία</h2>

    <!-- No company yet -->
    <template v-if="!company.company">
      <div class="card text-muted" style="text-align:center; font-size:var(--font-size-sm);">
        Ίδρυσε επιχείρηση για παθητικό εισόδημα. Απαιτείται επίπεδο 5.
      </div>

      <div v-if="player.level < 5" class="card text-center text-muted">
        🔒 Χρειάζεσαι επίπεδο 5 για να ιδρύσεις εταιρεία. (Τώρα: Επ. {{ player.level }})
      </div>

      <template v-else>
        <div
          v-for="type in companyTypes"
          :key="type.id"
          class="card company-type-card"
        >
          <div class="ct-header">
            <span class="ct-icon">{{ type.icon }}</span>
            <div class="ct-info">
              <strong>{{ type.name }}</strong>
              <p class="text-muted ct-desc">{{ type.description }}</p>
            </div>
          </div>
          <div class="ct-stats">
            <span class="badge badge-info">💰 €{{ type.baseIncomePerHour }}/ώρα (Επ.1)</span>
            <span class="badge badge-warning">Κόστος: €{{ formatCash(type.foundingCost) }}</span>
          </div>
          <button
            class="btn btn-sm btn-primary btn-block"
            :disabled="player.cash < type.foundingCost"
            @click="found(type.id)"
          >
            {{ player.cash >= type.foundingCost ? `Ίδρυσε — €${formatCash(type.foundingCost)}` : 'Ανεπαρκή Κεφάλαια' }}
          </button>
        </div>
      </template>
    </template>

    <!-- Has company -->
    <template v-else>
      <!-- Company header -->
      <div class="card company-header-card">
        <div class="ch-top">
          <span class="ch-icon">{{ company.company.icon }}</span>
          <div class="ch-info">
            <strong class="ch-name">{{ company.company.name }}</strong>
            <span class="text-muted ch-sub">Επίπεδο {{ company.company.level }} · {{ company.company.employees }} υπάλληλοι</span>
          </div>
          <div class="ch-badges">
            <span class="badge badge-success">€{{ formatCash(company.incomePerHour) }}/ώρα</span>
          </div>
        </div>

        <!-- Income collect -->
        <div class="income-section">
          <div class="income-label text-muted">Εκκρεμή Έσοδα</div>
          <div class="income-amount text-mono text-success">€{{ formatCash(company.pendingIncome) }}</div>
          <button
            class="btn btn-success btn-block"
            :disabled="company.pendingIncome <= 0"
            @click="collect"
          >
            💰 Είσπραξε
          </button>
        </div>

        <div class="ch-total text-muted">
          Συνολικά κέρδη: <span class="text-mono">€{{ formatCash(company.company.totalEarned) }}</span>
        </div>
      </div>

      <!-- Employees -->
      <div class="card">
        <h4 class="section-title">👷 Υπάλληλοι</h4>
        <div class="emp-row">
          <span class="text-muted">{{ company.company.employees }} / {{ company.maxEmployees }}</span>
          <div class="emp-btns">
            <button
              class="btn btn-sm btn-primary"
              :disabled="company.company.employees >= company.maxEmployees || player.cash < EMPLOYEE_COST"
              @click="hire"
            >
              + Πρόσληψη (€{{ formatCash(EMPLOYEE_COST) }})
            </button>
            <button
              class="btn btn-sm btn-outline btn-danger-outline"
              :disabled="company.company.employees <= 0"
              @click="fire"
            >
              − Απόλυση
            </button>
          </div>
        </div>
        <p class="text-muted emp-note">Κάθε υπάλληλος δίνει +10% στα έσοδα. Μέγ.: {{ company.maxEmployees }}</p>
      </div>

      <!-- Upgrade -->
      <div class="card">
        <h4 class="section-title">⬆️ Αναβάθμιση</h4>
        <template v-if="!company.isMaxLevel">
          <div class="upgrade-row">
            <div>
              <p class="text-muted" style="margin:0; font-size:var(--font-size-xs)">
                Επ. {{ company.company.level }} → Επ. {{ company.company.level + 1 }}
              </p>
              <p class="text-muted" style="margin:0; font-size:var(--font-size-xs)">
                Νέα εισοδηματική ισχύς: ×{{ company.company.level + 1 }}
              </p>
            </div>
            <button
              class="btn btn-sm btn-primary"
              :disabled="player.cash < company.levelUpCost"
              @click="upgrade"
            >
              Αναβάθμιση — €{{ formatCash(company.levelUpCost) }}
            </button>
          </div>
        </template>
        <template v-else>
          <p class="text-muted" style="text-align:center; font-size:var(--font-size-sm)">
            Μέγιστο επίπεδο επιτεύχθηκε! 🏆
          </p>
        </template>
      </div>

      <!-- Dissolve -->
      <div class="card">
        <h4 class="section-title">⚠️ Κλείσιμο Επιχείρησης</h4>
        <button
          v-if="!showDissolve"
          class="btn btn-sm btn-outline btn-danger-outline"
          @click="showDissolve = true"
        >
          Κλείσιμο εταιρείας
        </button>
        <div v-else class="dissolve-confirm">
          <span class="text-muted" style="font-size:var(--font-size-xs)">Χάνεις την εταιρεία μόνιμα. Σίγουρα;</span>
          <button class="btn btn-sm btn-danger" @click="dissolve">Ναι, Κλείσιμο</button>
          <button class="btn btn-sm btn-outline" @click="showDissolve = false">Όχι</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCompanyStore, COMPANY_TYPES, EMPLOYEE_COST } from '../stores/companyStore'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'

const company = useCompanyStore()
const player = usePlayerStore()
const gameStore = useGameStore()

const companyTypes = COMPANY_TYPES
const showDissolve = ref(false)

function formatCash(n) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(n))
}

function found(typeId) {
  const cost = company.foundCompany(typeId, player.cash)
  if (cost) {
    player.removeCash(cost)
    gameStore.addNotification(`Ίδρυσες ${company.company.name}! 🏢`, 'success')
    gameStore.saveGame()
  }
}

function collect() {
  const earned = company.collectIncome()
  if (earned > 0) {
    player.addCash(earned)
    gameStore.addNotification(`Εισέπραξες €${formatCash(earned)} από την εταιρεία!`, 'success')
    gameStore.saveGame()
  }
}

function hire() {
  const cost = company.hireEmployee(player.cash)
  if (cost) {
    player.removeCash(cost)
    gameStore.addNotification('Προσέλαβες υπάλληλο!', 'success')
    gameStore.saveGame()
  }
}

function fire() {
  company.fireEmployee()
  gameStore.addNotification('Απέλυσες υπάλληλο.', 'warning')
  gameStore.saveGame()
}

function upgrade() {
  const cost = company.levelUp(player.cash)
  if (cost) {
    player.removeCash(cost)
    gameStore.addNotification(`Αναβαθμίστηκε σε Επ. ${company.company.level}!`, 'success')
    gameStore.saveGame()
  }
}

function dissolve() {
  company.company = null
  showDissolve.value = false
  gameStore.addNotification('Η εταιρεία έκλεισε.', 'warning')
  gameStore.saveGame()
}
</script>

<style scoped>
.company-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); }

/* Company type selection */
.company-type-card { display: flex; flex-direction: column; gap: var(--space-sm); }

.ct-header { display: flex; align-items: flex-start; gap: var(--space-sm); }
.ct-icon   { font-size: 32px; flex-shrink: 0; }
.ct-info   { flex: 1; }
.ct-info strong { font-size: var(--font-size-sm); }
.ct-desc   { font-size: var(--font-size-xs); margin: 2px 0 0 0; }

.ct-stats { display: flex; gap: var(--space-xs); flex-wrap: wrap; }

.btn-block { width: 100%; }

/* Company header */
.company-header-card { display: flex; flex-direction: column; gap: var(--space-md); }

.ch-top {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.ch-icon { font-size: 40px; flex-shrink: 0; }
.ch-info { flex: 1; }
.ch-name { font-size: var(--font-size-lg); }
.ch-sub  { font-size: var(--font-size-xs); display: block; margin-top: 2px; }
.ch-badges { flex-shrink: 0; }
.ch-total { font-size: var(--font-size-xs); text-align: center; }

/* Income */
.income-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  text-align: center;
}

.income-label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.5px; }
.income-amount { font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); }

/* Employees */
.section-title {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin: 0 0 var(--space-sm) 0;
}

.emp-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.emp-btns { display: flex; gap: var(--space-xs); flex-wrap: wrap; }

.emp-note { font-size: var(--font-size-xs); margin: var(--space-xs) 0 0 0; }

/* Upgrade */
.upgrade-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

/* Dissolve */
.dissolve-confirm {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.btn-danger-outline {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
</style>
