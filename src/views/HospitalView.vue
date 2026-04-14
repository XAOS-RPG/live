<template>
  <div class="hospital-page">
    <div class="hospital-header">
      <span class="hospital-icon">🏥</span>
      <h2>Νοσοκομείο</h2>
    </div>

    <div v-if="player.status === 'hospital'" class="card hospital-card">
      <div class="timer-section">
        <div class="timer-label text-muted">Χρόνος νοσηλείας</div>
        <div class="timer-value text-mono">{{ formatTime(remaining) }}</div>
        <div class="timer-bar">
          <div class="bar-track" style="background: var(--color-danger); opacity: 0.2">
            <div class="bar-fill" :style="{ width: '100%', background: 'var(--color-danger)', opacity: 0.6 }" />
          </div>
        </div>
      </div>

      <p class="text-muted text-center" style="font-size: var(--font-size-sm)">
        Ξεκουράσου... Θα είσαι κομμάτια για λίγο.
      </p>

      <div v-if="medicalItems.length > 0" class="mt-md">
        <h3 class="card-title">Χρήση Ιατρικών</h3>
        <div class="medical-list">
          <div v-for="entry in medicalItems" :key="entry.itemId" class="medical-item">
            <span>{{ entry.data.icon }} {{ entry.data.name }} (x{{ entry.quantity }})</span>
            <button class="btn btn-sm btn-success" @click="useMedical(entry.itemId)">
              Χρήση
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card text-center">
      <p>Είσαι υγιής! 💪</p>
      <router-link to="/" class="btn btn-primary mt-md">Πίσω στην Αρχική</router-link>
    </div>

    <!-- Hospitalized players -->
    <div class="card hosp-section">
      <div class="hosp-header-row">
        <h3 class="hosp-title">🏥 Παίκτες στο Νοσοκομείο</h3>
        <button class="btn btn-sm btn-outline" @click="loadHospitalized" :disabled="loadingHosp">
          {{ loadingHosp ? '...' : '🔄' }}
        </button>
      </div>
      <div v-if="loadingHosp" class="text-muted text-center" style="font-size:var(--font-size-sm)">Φόρτωση...</div>
      <div class="hosp-list">
        <div v-for="p in hospPlayers" :key="p.id" class="hosp-row">
          <span style="font-size:22px">🩺</span>
          <div class="hosp-info">
            <strong>{{ p.nickname }}</strong>
            <span class="text-muted" style="font-size:var(--font-size-xs)">Επ. {{ p.level }} · Απομένουν {{ formatTime(p.remaining) }}</span>
          </div>
        </div>
        <div v-if="!loadingHosp && hospPlayers.length === 0" class="text-muted text-center" style="font-size:var(--font-size-sm)">
          Κανείς δεν είναι στο νοσοκομείο αυτή τη στιγμή.
        </div>
      </div>
    </div>

    <!-- Blood Donation — always visible -->
    <div class="card blood-donation-card">
      <div class="blood-header">
        <span style="font-size:2rem">🩸</span>
        <div>
          <strong>Αιμοδοσία</strong>
          <p class="text-muted" style="margin:0; font-size:var(--font-size-xs)">
            Κοστίζει 50 HP — δίνει +{{ filotimoGain }} Φιλότιμο και ενεργοποιεί το Medical Badge για 24ω (+20% HP από ιατρικά).
          </p>
        </div>
      </div>

      <div v-if="player.hasMedicalBadge" class="badge-active">
        🏥 Medical Badge ενεργό — {{ formatTime(badgeRemaining) }}
      </div>

      <p v-if="donationCooldownRemaining > 0" class="text-muted" style="font-size:var(--font-size-xs)">
        Cooldown: {{ formatTime(donationCooldownRemaining) }}
      </p>
      <p v-else-if="player.resources.hp.current <= 50" class="text-muted" style="font-size:var(--font-size-xs)">
        Χρειάζεσαι πάνω από 50 HP.
      </p>

      <button class="btn btn-danger" :disabled="!canDonate" @click="doBloodDonation">
        🩸 Αιμοδοσία (-50 HP)
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useGameStore } from '../stores/gameStore'
import { useCardStore } from '../stores/cardStore'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../stores/authStore'

const player = usePlayerStore()
const inventory = useInventoryStore()
const gameStore = useGameStore()
const cardStore = useCardStore()
const auth = useAuthStore()

// ── Hospitalized players ─────────────────────────────────────────────────────────────────────────────
const hospPlayers = ref([])
const loadingHosp = ref(false)

async function loadHospitalized() {
  if (!auth.user) return
  loadingHosp.value = true
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, name, level, status, status_timer_end')
      .eq('status', 'hospital')
      .neq('id', auth.user.id)
      .limit(10)
    hospPlayers.value = (data || []).map(p => ({
      id: p.id,
      nickname: p.username || p.name || 'Αγνωστος',
      level: p.level ?? 1,
      remaining: p.status_timer_end ? Math.max(0, new Date(p.status_timer_end).getTime() - Date.now()) : 0,
    }))
  } catch (e) {
    console.error(e)
  } finally {
    loadingHosp.value = false
  }
}

onMounted(loadHospitalized)

const remaining = computed(() => player.statusTimeRemaining)
const medicalItems = computed(() => inventory.sortedItems.filter(i => i.data.type === 'medical'))

function useMedical(itemId) { inventory.useItem(itemId) }

// ── Blood Donation ────────────────────────────────────────────────────────────
const DONATION_COOLDOWN_MS = 24 * 60 * 60 * 1000
const lastDonation = ref(Number(localStorage.getItem('bloodDonationLast')) || 0)

const donationCooldownRemaining = computed(() =>
  Math.max(0, DONATION_COOLDOWN_MS - (Date.now() - lastDonation.value))
)

const canDonate = computed(() =>
  donationCooldownRemaining.value === 0 && player.resources.hp.current > 50
)

const filotimoGain = computed(() => Math.round(25 * cardStore.filotimoBonus))

const badgeRemaining = computed(() => {
  if (!player.medicalBadge) return 0
  return Math.max(0, player.medicalBadge.expiresAt - Date.now())
})

function doBloodDonation() {
  if (!canDonate.value) return
  player.modifyResource('hp', -50)
  player.addFilotimoRaw(filotimoGain.value)
  player.grantMedicalBadge()
  lastDonation.value = Date.now()
  localStorage.setItem('bloodDonationLast', String(lastDonation.value))
  gameStore.addNotification(`🩸 Αιμοδοσία: +${filotimoGain.value} Φιλότιμο, Medical Badge 24ω!`, 'success')
  player.logActivity(`🩸 Αιμοδοσία: +${filotimoGain.value} Φιλότιμο`, 'info')
  gameStore.saveGame()
}

function formatTime(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.hospital-page { display: flex; flex-direction: column; gap: var(--space-md); }
.hospital-header { display: flex; align-items: center; gap: var(--space-sm); }
.hospital-icon { font-size: 32px; }
.timer-section { text-align: center; margin-bottom: var(--space-lg); }
.timer-label { font-size: var(--font-size-sm); margin-bottom: var(--space-xs); }
.timer-value {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-danger);
  margin-bottom: var(--space-sm);
}
.timer-bar .bar-track { height: 6px; border-radius: var(--border-radius-full); overflow: hidden; }
.timer-bar .bar-fill { height: 100%; border-radius: var(--border-radius-full); }
.medical-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.medical-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) 0;
  font-size: var(--font-size-sm);
}
.blood-donation-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border-left: 3px solid #e74c3c;
}
.blood-header { display: flex; align-items: flex-start; gap: var(--space-md); }
.badge-active {
  font-size: var(--font-size-xs);
  color: #2ecc71;
  background: rgba(46,204,113,0.12);
  border: 1px solid rgba(46,204,113,0.3);
  border-radius: var(--border-radius-sm);
  padding: 4px 10px;
}

.hosp-section { display: flex; flex-direction: column; gap: var(--space-sm); }
.hosp-header-row { display: flex; justify-content: space-between; align-items: center; }
.hosp-title { font-size: var(--font-size-md); margin: 0; }
.hosp-list { display: flex; flex-direction: column; gap: var(--space-xs); }
.hosp-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
}
.hosp-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-sm);
}
</style>
