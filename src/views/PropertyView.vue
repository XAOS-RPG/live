<template>
  <div class="property-page">
    <h2 class="page-title">🏘️ Ακίνητα</h2>
    <div class="tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'mine' }" @click="activeTab = 'mine'">Τα Ακίνητά μου</button>
      <button class="tab-btn" :class="{ active: activeTab === 'market' }" @click="activeTab = 'market'">Μεσιτικό Γραφείο</button>
    </div>

    <div v-if="activeTab === 'market'" class="property-list">
      <div v-for="prop in allProperties" :key="prop.id" class="card property-card">
        <div class="property-header">
          <span class="property-icon">{{ prop.icon }}</span>
          <div class="property-info">
            <strong>{{ getPropertyName(prop, travelStore.currentLocation) }}</strong>
            <p class="text-muted">{{ prop.description }}</p>
          </div>
        </div>
        <div class="property-stats">
          <span class="badge badge-warning">+{{ prop.happinessBonus }} Κέφι</span>
          <span class="badge badge-info">Επ. {{ prop.requirements.level }}+</span>
          <span class="badge badge-secondary">Αποθήκη {{ prop.itemCapacity }}</span>
          <span class="text-mono text-success">Αγορά: €{{ formatCash(prop.buyPrice) }}</span>
          <span class="text-mono text-info">Ενοίκιο: €{{ formatCash(prop.rentPrice) }}/ημ.</span>
        </div>
        <div class="actions">
          <button
            class="btn btn-sm btn-primary"
            :disabled="player.level < prop.requirements.level || player.cash < prop.buyPrice"
            @click="buyInCurrentLocation(prop.id)"
          >
            Αγορά
          </button>
          <button
            class="btn btn-sm btn-outline"
            :disabled="player.level < prop.requirements.level || player.cash < prop.rentPrice"
            @click="rentInCurrentLocation(prop.id)"
          >
            Ενοικίαση
          </button>
        </div>
      </div>
    </div>

    <div v-else class="property-list">
      <div v-if="!propertyStore.properties.length" class="card">
        <p class="text-muted">Δεν έχεις ακόμα ακίνητα. Πήγαινε στο Μεσιτικό Γραφείο.</p>
      </div>

      <div
        v-for="instance in propertyStore.properties"
        :key="instance.instanceId"
        class="card property-card"
        :class="{ active: propertyStore.activeInstanceId === instance.instanceId }"
      >
        <div class="property-header">
          <span class="property-icon">{{ propertyMeta(instance).icon }}</span>
          <div class="property-info">
            <strong>{{ propertyName(instance) }}</strong>
            <p class="text-muted">{{ propertyMeta(instance).description }}</p>
          </div>
          <div class="badges">
            <span v-if="instance.isRented" class="badge badge-info">Ενοικιαζόμενο</span>
            <span v-else class="badge badge-success">Ιδιόκτητο</span>
            <span v-if="propertyStore.activeInstanceId === instance.instanceId" class="badge badge-warning">Active</span>
          </div>
        </div>

        <div class="property-stats property-stats-grid">
          <div class="stat-chip">
            <span class="stat-chip-label">Χρηματοκιβώτιο</span>
            <span class="stat-chip-val text-mono">€{{ formatCash(instance.vaultCash) }} / €{{ formatCash(propertyMeta(instance).vaultCapacity) }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-chip-label">Τσέπη (μαζί σου)</span>
            <span class="stat-chip-val text-mono">{{ pocketUsed }} / {{ pocketMax }} τεμάχια</span>
          </div>
          <div class="stat-chip-pair">
            <div class="stat-chip">
              <span class="stat-chip-label">Αποθήκη στο σπίτι</span>
              <span class="stat-chip-val text-mono">{{ stashUsage(instance) }} / {{ propertyMeta(instance).itemCapacity }} πράγματα</span>
            </div>
            <div class="stat-chip">
              <span class="stat-chip-label">Πόλη</span>
              <span class="stat-chip-val">{{ locationName(instance.locationId) }}</span>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-sm btn-primary" @click="propertyStore.setActiveInstance(instance.instanceId)" :disabled="propertyStore.activeInstanceId === instance.instanceId">
            Μετακόμιση εδώ
          </button>
          <button v-if="instance.isRented" class="btn btn-sm btn-outline" @click="endLease(instance.instanceId)">Λήξη Ενοικίασης</button>
          <button v-else class="btn btn-sm btn-outline" @click="sellProperty(instance.instanceId, propertyMeta(instance).name)">
            Πώληση (75%)
          </button>
        </div>

        <div class="manage-panel">
          <p class="manage-intro">
            Εδώ ρυθμίζεις αυτό το σπίτι. Κάθε κουτί έχει <strong>έναν απλό σκοπό</strong> — διάβασε τον τίτλο και τη γραμμή από κάτω.
          </p>

          <!-- Λεφτά -->
          <section class="manage-block manage-block-money">
            <div class="manage-block-head">
              <span class="manage-emoji">💰</span>
              <div>
                <h3 class="manage-title">Λεφτά μέσα στο σπίτι</h3>
                <p class="manage-sub">
                  Βάζεις εδώ μετρητά για ασφάλεια (μέχρι το όριο του χρηματοκιβωτίου).
                  <strong>Κατάθεση</strong> = από την τσέπη σου → στο σπίτι.
                  <strong>Ανάληψη</strong> = από το σπίτι → πίσω στην τσέπη σου.
                </p>
              </div>
            </div>
            <div class="manage-steps">
              <label class="field-label" :for="'vault-amt-' + instance.instanceId">Πόσα ευρώ;</label>
              <div class="manage-actions-row">
                <input
                  :id="'vault-amt-' + instance.instanceId"
                  v-model.number="vaultInputs[instance.instanceId]"
                  type="number"
                  class="input input-grow"
                  min="1"
                  placeholder="π.χ. 1000"
                />
                <button type="button" class="btn btn-primary" @click="depositVault(instance.instanceId)">
                  ⬇️ Κατάθεση στο σπίτι
                </button>
                <button type="button" class="btn btn-outline" @click="withdrawVault(instance.instanceId)">
                  ⬆️ Ανάληψη στην τσέπη
                </button>
              </div>
            </div>
          </section>

          <!-- Πράγματα -->
          <section class="manage-block manage-block-stash">
            <div class="manage-block-head">
              <span class="manage-emoji">📦</span>
              <div>
                <h3 class="manage-title">Πράγματα: τσέπη ↔ αποθήκη</h3>
                <p class="manage-sub">
                  Η <strong>τσέπη</strong> είναι ό,τι κουβαλάς μαζί (μέχρι {{ pocketMax }} τεμάχια — τώρα {{ pocketUsed }}).
                  Η <strong>αποθήκη</strong> είναι ο χώρος μέσα σε αυτό το σπίτι (βλ. πάνω «Αποθήκη στο σπίτι»).
                </p>
              </div>
            </div>

            <div class="manage-subsection">
              <h4 class="step-label"><span class="step-num">1</span> Από την τσέπη → στην αποθήκη του σπιτιού</h4>
              <div class="manage-steps">
                <label class="field-label" :for="'stash-sel-' + instance.instanceId">Διάλεξε τι κρατάς στην τσέπη</label>
                <select :id="'stash-sel-' + instance.instanceId" v-model="stashItemInputs[instance.instanceId]" class="input input-full">
                  <option disabled value="">— Τι θέλεις να αφήσεις στο σπίτι; —</option>
                  <option v-for="it in pocketItems" :key="it.itemId" :value="it.itemId">
                    {{ itemLabel(it.itemId) }} (στην τσέπη: {{ it.quantity }})
                  </option>
                </select>
                <label class="field-label" :for="'stash-qty-' + instance.instanceId">Πόσα τεμάχια;</label>
                <div class="manage-actions-row">
                  <input
                    :id="'stash-qty-' + instance.instanceId"
                    v-model.number="stashQtyInputs[instance.instanceId]"
                    type="number"
                    class="input input-narrow"
                    min="1"
                    placeholder="αριθμός"
                  />
                  <button type="button" class="btn btn-primary btn-wide" @click="depositStash(instance.instanceId)">
                    Μετακίνηση στο σπίτι
                  </button>
                </div>
              </div>
            </div>

            <div class="manage-subsection">
              <h4 class="step-label"><span class="step-num">2</span> Από την αποθήκη → πίσω στην τσέπη</h4>
              <p v-if="!stashEntries(instance).length" class="empty-stash-msg text-muted">
                Δεν έχεις τίποτα αποθηκεμένο εδώ ακόμα. Χρησιμοποίησε το βήμα 1 πάνω.
              </p>
              <ul v-else class="stash-list-simple">
                <li v-for="entry in stashEntries(instance)" :key="`${instance.instanceId}_${entry.itemId}`" class="stash-card">
                  <div class="stash-card-info">
                    <span class="stash-card-name">{{ itemLabel(entry.itemId) }}</span>
                    <span class="stash-card-qty text-muted">Στο σπίτι: <strong>{{ entry.qty }}</strong></span>
                  </div>
                  <div class="stash-card-actions">
                    <label class="field-label sr-only" :for="'wd-qty-' + instance.instanceId + '-' + entry.itemId">Πόσα να πάρεις</label>
                    <input
                      :id="'wd-qty-' + instance.instanceId + '-' + entry.itemId"
                      v-model.number="withdrawQtyInputs[`${instance.instanceId}_${entry.itemId}`]"
                      type="number"
                      class="input input-narrow"
                      min="1"
                      :max="entry.qty"
                      placeholder="πόσα"
                    />
                    <button type="button" class="btn btn-outline btn-take" @click="withdrawStash(instance.instanceId, entry.itemId)">
                      Πάρε στην τσέπη
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-all"
                      @click="withdrawAllToPocket(instance.instanceId, entry.itemId, entry.qty)"
                    >
                      Όλα ({{ entry.qty }})
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <!-- Μεταφορική -->
          <section class="manage-block manage-block-move">
            <div class="manage-block-head">
              <span class="manage-emoji">🚚</span>
              <div>
                <h3 class="manage-title">Μετακόμιση πραγμάτων σε άλλο σπίτι</h3>
                <p class="manage-sub">
                  Μεταφέρει <strong>όλα</strong> όσα έχεις στην <strong>αποθήκη αυτού</strong> του σπιτιού προς άλλο δικό σου σπίτι.
                  Κόστος <strong>€500</strong>.
                  Ρίχνεις ζάρι: αν βγει <strong>1</strong>, χάνεις το <strong>25%</strong> των πραγμάτων που στέλνεις.
                </p>
              </div>
            </div>
            <div class="manage-steps">
              <label class="field-label" :for="'move-to-' + instance.instanceId">Ποιο σπίτι παίρνει τα πράγματα;</label>
              <div class="manage-actions-row">
                <select :id="'move-to-' + instance.instanceId" v-model="moveTargetByInstance[instance.instanceId]" class="input input-grow">
                  <option disabled value="">— Διάλεξε άλλο ακίνητο —</option>
                  <option v-for="other in otherInstances(instance.instanceId)" :key="other.instanceId" :value="other.instanceId">
                    {{ propertyName(other) }} ({{ locationName(other.locationId) }})
                  </option>
                </select>
                <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="!otherInstances(instance.instanceId).length"
                  @click="moveAllStash(instance.instanceId)"
                >
                  Στείλε με μεταφορική
                </button>
              </div>
              <p v-if="!otherInstances(instance.instanceId).length" class="text-muted manage-hint">
                Χρειάζεσαι τουλάχιστον δύο σπίτια για να εμφανιστεί προορισμός εδώ.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { usePropertyStore } from '../stores/propertyStore'
import { useTravelStore } from '../stores/travelStore'
import { useGameStore } from '../stores/gameStore'
import { getItemById } from '../data/items'
import { getLocationById } from '../data/locations'
import { getPropertyById, getPropertyName, properties } from '../data/properties'

const player = usePlayerStore()
const inventoryStore = useInventoryStore()
const propertyStore = usePropertyStore()
const travelStore = useTravelStore()
const gameStore = useGameStore()
const allProperties = properties
const activeTab = ref('mine')
const vaultInputs = ref({})
const stashItemInputs = ref({})
const stashQtyInputs = ref({})
const withdrawQtyInputs = ref({})
const moveTargetByInstance = ref({})

const pocketItems = computed(() => inventoryStore.items.filter(i => i.quantity > 0))

const pocketUsed = computed(() => inventoryStore.totalItems)
const pocketMax = computed(() => inventoryStore.maxSlots)

function propertyMeta(instance) {
  return getPropertyById(instance.propertyId) || {}
}

function propertyName(instance) {
  return getPropertyName(propertyMeta(instance), instance.locationId)
}

function locationName(locationId) {
  return getLocationById(locationId)?.name || locationId
}

function stashUsage(instance) {
  return propertyStore.getStashUsage(instance.instanceId)
}

function stashEntries(instance) {
  return Object.entries(instance.stash || {}).map(([itemId, qty]) => ({ itemId, qty }))
}

function itemLabel(itemId) {
  const item = getItemById(itemId)
  if (!item) return itemId
  return `${item.icon || ''} ${item.name}`.trim()
}

function buyInCurrentLocation(propertyId) {
  propertyStore.buyProperty(propertyId, travelStore.currentLocation)
}

function rentInCurrentLocation(propertyId) {
  propertyStore.rentProperty(propertyId, travelStore.currentLocation)
}

function sellProperty(instanceId, propertyNameLabel) {
  if (!confirm(`Σίγουρα θέλεις να πουλήσεις το "${propertyNameLabel}";`)) return
  propertyStore.sellProperty(instanceId)
}

function endLease(instanceId) {
  if (!confirm('Θέλεις σίγουρα να τερματίσεις την ενοικίαση; Θα χαθούν τα λεφτά στο χρηματοκιβώτιο και η αποθήκη αυτού του σπιτιού.')) return
  propertyStore.endLease(instanceId)
}

function depositVault(instanceId) {
  const amount = Number(vaultInputs.value[instanceId] || 0)
  if (!amount || amount <= 0) {
    gameStore.addNotification('Δώσε έγκυρο ποσό.', 'danger')
    return
  }
  if (propertyStore.depositToVault(instanceId, amount)) {
    vaultInputs.value[instanceId] = 0
  }
}

function withdrawVault(instanceId) {
  const amount = Number(vaultInputs.value[instanceId] || 0)
  if (!amount || amount <= 0) {
    gameStore.addNotification('Δώσε έγκυρο ποσό.', 'danger')
    return
  }
  if (propertyStore.withdrawFromVault(instanceId, amount)) {
    vaultInputs.value[instanceId] = 0
  }
}

function depositStash(instanceId) {
  const itemId = stashItemInputs.value[instanceId]
  const qty = Number(stashQtyInputs.value[instanceId] || 0)
  if (!itemId || qty <= 0) {
    gameStore.addNotification('Διάλεξε αντικείμενο από την τσέπη και βάλε ποσότητα μεγαλύτερη από 0.', 'danger')
    return
  }
  if (propertyStore.depositToStash(instanceId, itemId, qty)) {
    stashQtyInputs.value[instanceId] = 0
  }
}

function withdrawStash(instanceId, itemId) {
  const key = `${instanceId}_${itemId}`
  const qty = Number(withdrawQtyInputs.value[key] || 0)
  if (qty <= 0) {
    gameStore.addNotification('Δώσε έγκυρη ποσότητα.', 'danger')
    return
  }
  if (propertyStore.withdrawFromStash(instanceId, itemId, qty)) {
    withdrawQtyInputs.value[key] = 0
  }
}

function withdrawAllToPocket(instanceId, itemId, maxQty) {
  const key = `${instanceId}_${itemId}`
  withdrawQtyInputs.value[key] = maxQty
  withdrawStash(instanceId, itemId)
}

function otherInstances(instanceId) {
  return propertyStore.properties.filter(p => p.instanceId !== instanceId)
}

function moveAllStash(fromInstanceId) {
  const targetId = moveTargetByInstance.value[fromInstanceId]
  if (!targetId) {
    gameStore.addNotification('Επίλεξε ακίνητο προορισμού.', 'danger')
    return
  }
  const source = propertyStore.getInstanceById(fromInstanceId)
  if (!source) {
    gameStore.addNotification('Το ακίνητο προέλευσης δεν βρέθηκε.', 'danger')
    return
  }

  const moveObj = {}
  for (const [itemId, qty] of Object.entries(source.stash || {})) {
    if (qty > 0) moveObj[itemId] = qty
  }
  propertyStore.moveStash(fromInstanceId, targetId, moveObj)
}

function formatCash(amount) {
  return new Intl.NumberFormat('el-GR').format(Math.floor(amount))
}
</script>

<style scoped>
.property-page { display: flex; flex-direction: column; gap: var(--space-md); }
.page-title { font-size: var(--font-size-2xl); }
.tabs { display: flex; gap: var(--space-sm); }
.tab-btn { padding: 8px 12px; border: 1px solid var(--color-border); background: var(--color-surface-2); color: var(--color-text); border-radius: var(--radius-md); cursor: pointer; }
.tab-btn.active { border-color: var(--color-primary); background: var(--color-primary-soft); }

.property-header { display: flex; align-items: center; gap: var(--space-md); }
.property-icon { font-size: 32px; flex-shrink: 0; }
.property-info { flex: 1; min-width: 0; }
.property-info p { font-size: var(--font-size-xs); }

.property-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.property-card.active { border-color: var(--color-warning); }
.property-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.stat-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-sm);
  background: var(--bg-surface-raised, rgba(255, 255, 255, 0.04));
  border-radius: var(--border-radius-md, 8px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  font-size: var(--font-size-xs);
}

.stat-chip-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  min-width: 0;
}

@media (max-width: 360px) {
  .stat-chip-pair {
    grid-template-columns: 1fr;
  }
}

.stat-chip-label {
  color: var(--text-secondary, var(--text-muted));
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.stat-chip-val {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-word;
}

.actions { display: flex; gap: var(--space-sm); margin-top: var(--space-sm); flex-wrap: wrap; }
.badges { display: flex; gap: var(--space-xs); flex-wrap: wrap; }

.manage-panel {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.manage-intro {
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0;
  padding: var(--space-sm) var(--space-md);
  background: rgba(79, 195, 247, 0.08);
  border-radius: var(--border-radius-md, 8px);
  border-left: 4px solid var(--color-accent, #42a5f5);
}

.manage-block {
  padding: var(--space-md);
  border-radius: var(--border-radius-md, 10px);
  border: 1px solid var(--border-color);
  background: var(--bg-surface, var(--color-surface-2));
}

.manage-block-money { border-color: rgba(255, 193, 7, 0.4); }
.manage-block-stash { border-color: rgba(129, 199, 132, 0.45); }
.manage-block-move { border-color: rgba(239, 83, 80, 0.35); }

.manage-block-head {
  display: flex;
  gap: var(--space-md);
  align-items: flex-start;
  margin-bottom: var(--space-md);
}

.manage-emoji {
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
}

.manage-title {
  margin: 0 0 var(--space-xs);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.manage-sub {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.55;
  color: var(--text-secondary);
}

.manage-subsection {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px dashed var(--border-color);
}

.manage-subsection:first-of-type {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.step-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0 0 var(--space-sm);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: var(--color-accent, #42a5f5);
  color: var(--text-on-primary, #fff);
  font-size: 12px;
  font-weight: 800;
}

.manage-steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.field-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

.manage-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
}

.input-grow { flex: 1; min-width: 120px; }
.input-full { width: 100%; }
.input-narrow {
  width: 88px;
  min-width: 72px;
}

.btn-wide {
  flex: 1;
  min-width: 160px;
}

.btn-take {
  font-weight: 700;
}

.btn-ghost {
  background: transparent;
  border: 1px dashed var(--border-color);
  color: var(--text-secondary);
}

.btn-all {
  font-size: var(--font-size-xs);
}

.empty-stash-msg {
  margin: 0;
  padding: var(--space-sm);
  font-size: var(--font-size-sm);
}

.stash-list-simple {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.stash-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface-raised, rgba(0, 0, 0, 0.2));
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
}

@media (min-width: 520px) {
  .stash-card {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.stash-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stash-card-name {
  font-weight: 700;
  font-size: var(--font-size-sm);
}

.stash-card-qty {
  font-size: var(--font-size-xs);
}

.stash-card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
}

.manage-hint {
  margin: var(--space-xs) 0 0;
  font-size: var(--font-size-xs);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
