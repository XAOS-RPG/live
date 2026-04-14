<template>
  <div class="loan-page">
    <h2 class="page-title">🦈 Τοκογλύφος</h2>
    <p class="page-sub text-muted">Δανείσου γρήγορα, αλλά πρόσεχε — οι τόκοι τρέχουν.</p>

    <!-- Active loan -->
    <div v-if="loanStore.hasLoan" class="card loan-active-card">
      <h3 class="section-title">📋 Ενεργό Δάνειο</h3>
      <div class="stat-row">
        <span class="text-muted">Αρχικό ποσό:</span>
        <span class="text-mono">€{{ loanStore.activeLoan.amount }}</span>
      </div>
      <div class="stat-row">
        <span class="text-muted">Τόκος ημέρας:</span>
        <span class="text-mono text-danger">{{ (loanStore.activeLoan.interestRate * 100).toFixed(0) }}%</span>
      </div>
      <div class="stat-row">
        <span class="text-muted">Τόκοι που μαζεύτηκαν:</span>
        <span class="text-mono text-danger">€{{ loanStore.activeLoan.interestAccrued }}</span>
      </div>
      <div class="stat-row">
        <span class="text-muted">Συνολικό χρέος:</span>
        <span class="text-mono text-danger" style="font-size: 16px; font-weight: bold;">€{{ loanStore.currentDebt }}</span>
      </div>
      <div class="stat-row">
        <span class="text-muted">Ημέρες:</span>
        <span class="text-mono" :class="loanStore.isOverdue ? 'text-danger' : ''">{{ loanStore.daysSinceLoan }}</span>
      </div>

      <!-- Warnings -->
      <div v-if="loanStore.isCritical" class="loan-warning critical">
        💀 ΚΡΙΤΙΚΟ! Ο τοκογλύφος κατασχέτει τα περιουσιακά σου!
      </div>
      <div v-else-if="loanStore.isOverdue" class="loan-warning overdue">
        ⚠️ Καθυστέρηση! Μπράβοι θα σε βρουν σύντομα...
      </div>

      <!-- Repay -->
      <div class="repay-section">
        <div class="repay-buttons">
          <button class="btn btn-sm btn-success" :disabled="player.cash <= 0" @click="repay(Math.min(player.cash, loanStore.currentDebt))">
            Ξεπλήρωσε Όλα (€{{ Math.min(player.cash, loanStore.currentDebt) }})
          </button>
          <button v-if="loanStore.currentDebt > 1000" class="btn btn-sm btn-primary" :disabled="player.cash < 1000" @click="repay(1000)">
            Πλήρωσε €1.000
          </button>
          <button v-if="loanStore.currentDebt > 5000" class="btn btn-sm btn-primary" :disabled="player.cash < 5000" @click="repay(5000)">
            Πλήρωσε €5.000
          </button>
        </div>
      </div>
    </div>

    <!-- Take a loan -->
    <div v-if="!loanStore.hasLoan" class="card">
      <h3 class="section-title">💰 Πάρε Δάνειο</h3>
      <p class="text-muted" style="font-size: 10px; margin-bottom: var(--space-sm);">
        Ο τόκος χρεώνεται κάθε μέρα. Αν δεν πληρώσεις σε 3 ημέρες, έρχονται μπράβοι.
        Σε 7 ημέρες, κατάσχεση μετρητών.
      </p>

      <div v-for="tier in loanStore.availableTiers" :key="tier.id" class="tier-row">
        <div class="tier-info">
          <strong>{{ tier.label }} Δάνειο</strong>
          <span class="text-muted" style="font-size: 10px;">
            Μέχρι €{{ tier.maxAmount.toLocaleString() }} · Τόκος {{ (tier.interestRate * 100).toFixed(0) }}%/ημέρα
            · Level {{ tier.requiredLevel }}+
          </span>
        </div>
        <div class="tier-actions">
          <button class="btn btn-xs btn-warning" @click="openLoanModal(tier)">Δανείσου</button>
        </div>
      </div>

      <div v-if="lockedTiers.length > 0" style="margin-top: var(--space-sm);">
        <div v-for="tier in lockedTiers" :key="tier.id" class="tier-row locked">
          <div class="tier-info">
            <strong class="text-muted">{{ tier.label }} Δάνειο</strong>
            <span class="text-muted" style="font-size: 10px;">
              🔒 Level {{ tier.requiredLevel }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loan modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click="showModal = false">
        <div class="modal-box" @click.stop>
          <h3>{{ selectedTier?.label }} Δάνειο</h3>
          <p class="text-muted" style="font-size: 11px;">
            Τόκος: {{ ((selectedTier?.interestRate || 0) * 100).toFixed(0) }}% ανά ημέρα
          </p>
          <div class="modal-input-row">
            <label class="text-muted" style="font-size: 11px;">Ποσό (€):</label>
            <input v-model.number="loanAmount" type="number" class="modal-input" :min="100" :max="selectedTier?.maxAmount" step="100" />
          </div>
          <div v-if="loanAmount > 0" class="text-muted" style="font-size: 10px; margin-top: 4px;">
            Ημερήσιος τόκος: €{{ Math.floor(loanAmount * (selectedTier?.interestRate || 0)) }}
          </div>
          <div class="modal-actions">
            <button class="btn btn-sm btn-muted" @click="showModal = false">Ακύρωση</button>
            <button class="btn btn-sm btn-warning" :disabled="loanAmount < 100" @click="confirmLoan">Δανείσου €{{ loanAmount }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Stats -->
    <div class="card">
      <h3 class="section-title">📈 Ιστορικό</h3>
      <div class="stat-row">
        <span class="text-muted">Συνολικά δανεισμένα:</span>
        <span class="text-mono">€{{ loanStore.totalBorrowed }}</span>
      </div>
      <div class="stat-row">
        <span class="text-muted">Συνολικά αποπληρωμένα:</span>
        <span class="text-mono">€{{ loanStore.totalRepaid }}</span>
      </div>
      <div class="stat-row">
        <span class="text-muted">Φορές αθέτησης:</span>
        <span class="text-mono" :class="loanStore.timesDefaulted > 0 ? 'text-danger' : ''">{{ loanStore.timesDefaulted }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useLoanStore, LOAN_TIERS } from '../stores/loanStore'

const player = usePlayerStore()
const loanStore = useLoanStore()

const showModal = ref(false)
const selectedTier = ref(null)
const loanAmount = ref(1000)

const lockedTiers = computed(() =>
  LOAN_TIERS.filter(t => player.level < t.requiredLevel)
)

function openLoanModal(tier) {
  selectedTier.value = tier
  loanAmount.value = Math.min(tier.maxAmount, 1000)
  showModal.value = true
}

function confirmLoan() {
  if (!selectedTier.value) return
  loanStore.takeLoan(selectedTier.value.id, loanAmount.value)
  showModal.value = false
}

function repay(amount) {
  loanStore.repayLoan(amount)
}
</script>

<style scoped>
.loan-page {
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

.loan-active-card { border-left: 3px solid var(--color-danger); }

.loan-warning {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-sm);
  font-size: 11px;
  text-align: center;
  margin: var(--space-sm) 0;
  animation: pulse-warning 2s ease infinite;
}
.loan-warning.overdue {
  background: rgba(255, 152, 0, 0.15);
  color: var(--color-warning);
}
.loan-warning.critical {
  background: rgba(229, 57, 53, 0.15);
  color: var(--color-danger);
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.repay-section { margin-top: var(--space-sm); }

.repay-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.tier-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-color);
}
.tier-row:last-child { border-bottom: none; }
.tier-row.locked { opacity: 0.5; }

.tier-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
}

.tier-actions { flex-shrink: 0; }

.btn-xs {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: var(--border-radius-sm);
}

.btn-muted {
  opacity: 0.6;
  background: var(--bg-surface-raised);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-color);
}
.stat-row:last-child { border-bottom: none; }

.text-success { color: var(--color-success); }
.text-danger { color: var(--color-danger); }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
}

.modal-box {
  background: var(--bg-surface-overlay);
  border-radius: var(--border-radius-lg);
  padding: var(--space-lg);
  width: 100%;
  max-width: 360px;
}

.modal-input-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: var(--space-sm);
}

.modal-input {
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-sm);
  font-family: var(--font-mono);
  width: 100%;
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-md);
}
</style>
