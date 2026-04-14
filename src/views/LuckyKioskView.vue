<template>
  <div class="kiosk-page">
    <h2 class="page-title">🎰 Τυχερό Περίπτερο</h2>

    <!-- Active buff preview -->
    <div v-if="cardStore.equippedCards.length > 0" class="card buff-preview">
      <div class="buff-preview-title">⚡ Ενεργά Buffs</div>
      <div class="equipped-buff-list">
        <span
          v-for="def in cardStore.equippedCardDefs"
          :key="def.id"
          class="buff-chip"
          :style="{ color: RARITY_META[def.rarity].color, borderColor: RARITY_META[def.rarity].color + '55' }"
        >
          {{ def.icon }} {{ def.buffLabel }}
        </span>
      </div>
    </div>

    <!-- ─── Pack Shop ─────────────────────────────────────────────── -->
    <section class="section-heading">🛒 Αγορά Πακέτων</section>
    <div class="pack-grid">
      <div
        v-for="pack in PACKS"
        :key="pack.id"
        class="pack-card"
        :style="{ '--glow': pack.glowColor }"
      >
        <div class="pack-icon">{{ pack.icon }}</div>
        <div class="pack-name">{{ pack.name }}</div>
        <p class="pack-desc text-muted">{{ pack.description }}</p>

        <!-- Rarity odds breakdown -->
        <div class="rarity-odds">
          <span v-if="pack.rarityWeights.legendary > 0" class="odds-chip legendary">
            👑 {{ (pack.rarityWeights.legendary * 100).toFixed(0) }}% Θρυλική
          </span>
          <span class="odds-chip rare">
            💜 {{ (pack.rarityWeights.rare * 100).toFixed(0) }}% Σπάνια
          </span>
          <span v-if="pack.rarityWeights.common > 0" class="odds-chip common">
            ⬜ {{ (pack.rarityWeights.common * 100).toFixed(0) }}% Κοινή
          </span>
        </div>

        <div class="pack-actions">
          <button
            class="btn-pack btn-pack-cash"
            :disabled="player.cash < pack.cashCost"
            @click="buyPack(pack.id, 'cash')"
          >
            💶 €{{ pack.cashCost.toLocaleString() }}
          </button>
          <button
            class="btn-pack btn-pack-filotimo"
            :disabled="player.filotimo < pack.filotimoCost"
            @click="buyPack(pack.id, 'filotimo')"
          >
            🌟 {{ pack.filotimoCost }} Φιλότιμο
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Pack Open Animation ──────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="openAnimation.active" class="pack-overlay" @click.self="closeAnimation">
        <div class="pack-reveal-box">
          <div class="pack-reveal-title">🎊 Ανοίγεις {{ openAnimation.packName }}…</div>
          <div class="pack-reveal-cards">
            <div
              v-for="(card, i) in openAnimation.cards"
              :key="i"
              class="reveal-card"
              :class="{ 'revealed': openAnimation.revealedCount > i }"
              :style="{ '--rarity-color': RARITY_META[card.rarity].color, '--rarity-bg': RARITY_META[card.rarity].bg, animationDelay: `${i * 280}ms` }"
              @click="revealCard(i)"
            >
              <template v-if="openAnimation.revealedCount > i">
                <div class="reveal-card-icon">{{ card.icon }}</div>
                <div class="reveal-card-name">{{ card.name }}</div>
                <div class="reveal-card-rarity" :style="{ color: RARITY_META[card.rarity].color }">
                  {{ RARITY_META[card.rarity].label }}
                </div>
                <div class="reveal-card-buff text-muted">{{ card.buffLabel }}</div>
              </template>
              <template v-else>
                <div class="reveal-card-back">🎴</div>
                <div class="reveal-card-tap text-muted">Πάτα για αποκάλυψη</div>
              </template>
            </div>
          </div>

          <div v-if="openAnimation.allRevealed" class="reveal-done">
            <button class="btn btn-primary" @click="closeAnimation">✅ Κλείσιμο</button>
          </div>
          <div v-else class="reveal-hint text-muted">
            Πάτα κάθε κάρτα για να δεις τι κέρδισες!
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Card Equip Slots ──────────────────────────────────────── -->
    <section class="section-heading">🎮 Εξοπλισμένες Κάρτες (max 3)</section>
    <div class="equip-slots">
      <div
        v-for="i in 3"
        :key="i"
        class="equip-slot"
        :class="{ filled: cardStore.equippedCards[i - 1] }"
      >
        <template v-if="cardStore.equippedCards[i - 1]">
          <div class="slot-card-content" :style="{ '--rarity-color': equippedDefs[i-1] ? RARITY_META[equippedDefs[i-1].rarity].color : '#fff' }">
            <span class="slot-icon">{{ equippedDefs[i-1]?.icon }}</span>
            <span class="slot-name">{{ equippedDefs[i-1]?.name }}</span>
            <span class="slot-buff text-muted">{{ equippedDefs[i-1]?.buffLabel }}</span>
            <button class="btn-unequip" @click="unequipCard(cardStore.equippedCards[i-1])">✕ Αφαίρεση</button>
          </div>
        </template>
        <template v-else>
          <span class="slot-empty-icon">🎴</span>
          <span class="slot-empty-label text-muted">Κενή Θέση</span>
        </template>
      </div>
    </div>

    <!-- ─── Owned Cards Collection ───────────────────────────────── -->
    <section class="section-heading">
      🃏 Συλλογή ({{ cardStore.ownedCards.length > 0 ? cardStore.ownedCards.reduce((s,e)=>s+e.quantity,0) : 0 }} κάρτες)
    </section>

    <!-- Rarity filter tabs -->
    <div class="filter-tabs">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        class="filter-tab"
        :class="{ active: activeFilter === tab.key }"
        @click="activeFilter = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="filteredOwnedCards.length === 0" class="empty-collection text-muted">
      <span style="font-size: 40px">📭</span>
      <p>Δεν έχεις κάρτες ακόμα. Αγόρασε ένα πακέτο!</p>
    </div>

    <div class="collection-grid">
      <div
        v-for="entry in filteredOwnedCards"
        :key="entry.cardId"
        class="collection-card"
        :class="{ equipped: cardStore.equippedCards.includes(entry.cardId) }"
        :style="{ '--rarity-color': RARITY_META[getCard(entry.cardId).rarity].color, '--rarity-bg': RARITY_META[getCard(entry.cardId).rarity].bg }"
      >
        <div class="cc-top">
          <span class="cc-icon">{{ getCard(entry.cardId)?.icon }}</span>
          <span class="cc-qty">×{{ entry.quantity }}</span>
        </div>
        <div class="cc-name">{{ getCard(entry.cardId)?.name }}</div>
        <div class="cc-rarity" :style="{ color: RARITY_META[getCard(entry.cardId).rarity].color }">
          {{ RARITY_META[getCard(entry.cardId).rarity].label }}
        </div>
        <div class="cc-buff text-muted">{{ getCard(entry.cardId)?.buffLabel }}</div>
        <div class="cc-desc text-muted" style="font-size: 10px; margin-top: 2px;">{{ getCard(entry.cardId)?.description }}</div>

        <div class="cc-actions">
          <button
            v-if="!cardStore.equippedCards.includes(entry.cardId)"
            class="btn-equip"
            :disabled="cardStore.equippedCards.length >= 3"
            @click="equipCard(entry.cardId)"
          >
            ⚡ Εξοπλισμός
          </button>
          <button
            v-else
            class="btn-unequip"
            @click="unequipCard(entry.cardId)"
          >
            ✕ Αφαίρεση
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Statistics ────────────────────────────────────────────── -->
    <div v-if="cardStore.openedPacks > 0" class="card stats-card">
      <div class="stats-row">
        <span class="text-muted">Πακέτα Ανοιγμένα</span>
        <span class="text-mono text-accent">{{ cardStore.openedPacks }}</span>
      </div>
      <div class="stats-row">
        <span class="text-muted">Μοναδικές Κάρτες</span>
        <span class="text-mono text-accent">{{ cardStore.ownedCards.length }} / {{ CARDS.length }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCardStore, PACKS, CARDS, RARITY_META, getCardById } from '../stores/cardStore'
import { usePlayerStore } from '../stores/playerStore'

const cardStore = useCardStore()
const player = usePlayerStore()

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
const filterTabs = [
  { key: 'all', label: 'Όλες' },
  { key: 'common', label: '⬜ Κοινές' },
  { key: 'rare', label: '💜 Σπάνιες' },
  { key: 'legendary', label: '👑 Θρυλικές' },
]
const activeFilter = ref('all')

const filteredOwnedCards = computed(() => {
  if (activeFilter.value === 'all') return cardStore.ownedCards
  return cardStore.ownedCards.filter(e => {
    const card = getCardById(e.cardId)
    return card && card.rarity === activeFilter.value
  })
})

const equippedDefs = computed(() =>
  cardStore.equippedCards.map(id => getCardById(id))
)

function getCard(id) {
  return getCardById(id)
}

// ─── Pack Open Animation ──────────────────────────────────────────────────────
const openAnimation = ref({
  active: false,
  packName: '',
  cards: [],
  revealedCount: 0,
  allRevealed: false,
})

function buyPack(packId, currency) {
  const result = cardStore.buyPack(packId, currency)
  if (!result.success) return

  const pack = PACKS.find(p => p.id === packId)
  openAnimation.value = {
    active: true,
    packName: pack.name,
    cards: result.cards,
    revealedCount: 0,
    allRevealed: false,
  }
}

function revealCard(index) {
  const anim = openAnimation.value
  if (anim.revealedCount <= index) {
    anim.revealedCount = index + 1
    if (anim.revealedCount >= anim.cards.length) {
      setTimeout(() => { anim.allRevealed = true }, 300)
    }
  }
}

function closeAnimation() {
  openAnimation.value.active = false
}

// ─── Equip ────────────────────────────────────────────────────────────────────
function equipCard(cardId) {
  cardStore.equipCard(cardId)
}

function unequipCard(cardId) {
  cardStore.unequipCard(cardId)
}
</script>

<style scoped>
.kiosk-page { padding: var(--space-md); max-width: 900px; margin: 0 auto; }

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

/* ── Buff preview ─────────────────────────────────────────────────────────── */
.buff-preview { margin-bottom: var(--space-md); }
.buff-preview-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); margin-bottom: var(--space-xs); }
.equipped-buff-list { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
.buff-chip {
  font-size: 11px;
  padding: 3px 8px;
  border: 1px solid;
  border-radius: var(--border-radius-sm);
  background: rgba(255,255,255,0.04);
}

/* ── Pack grid ────────────────────────────────────────────────────────────── */
.pack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.pack-card {
  background: var(--bg-surface);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--border-radius-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  text-align: center;
  box-shadow: 0 0 16px -6px var(--glow);
  transition: box-shadow var(--transition-normal), transform var(--transition-fast);
}
.pack-card:hover {
  box-shadow: 0 0 28px -4px var(--glow);
  transform: translateY(-2px);
}

.pack-icon { font-size: 40px; line-height: 1; }
.pack-name { font-size: var(--font-size-md); font-weight: var(--font-weight-bold); }
.pack-desc { font-size: 11px; line-height: 1.4; }

.rarity-odds { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; margin: var(--space-xs) 0; }
.odds-chip {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
}
.odds-chip.legendary { background: rgba(255,215,0,0.15); color: #ffd700; }
.odds-chip.rare      { background: rgba(171,71,188,0.15); color: #ce93d8; }
.odds-chip.common    { background: rgba(144,164,174,0.12); color: #90a4ae; }

.pack-actions { display: flex; flex-direction: column; gap: var(--space-xs); margin-top: var(--space-sm); }

.btn-pack {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  border: none;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}
.btn-pack:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-pack:not(:disabled):hover { transform: scale(1.02); }

.btn-pack-cash { background: var(--color-success, #4caf50); color: #fff; }
.btn-pack-filotimo { background: rgba(255,215,0,0.18); color: #ffd700; border: 1px solid rgba(255,215,0,0.35); }

/* ── Pack overlay / reveal ────────────────────────────────────────────────── */
.pack-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.82);
  z-index: 1100;
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-md);
}
.pack-reveal-box {
  background: var(--bg-surface-overlay);
  border-radius: var(--border-radius-lg);
  padding: var(--space-xl);
  max-width: 520px;
  width: 100%;
  display: flex; flex-direction: column; align-items: center; gap: var(--space-md);
}
.pack-reveal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}
.pack-reveal-cards {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  justify-content: center;
}
.reveal-card {
  width: 130px;
  min-height: 170px;
  border-radius: var(--border-radius-lg);
  background: var(--bg-surface-raised);
  border: 2px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-sm);
  cursor: pointer;
  transition: transform var(--transition-normal), border-color var(--transition-normal), background var(--transition-normal);
  text-align: center;
}
.reveal-card.revealed {
  background: var(--rarity-bg);
  border-color: var(--rarity-color);
  box-shadow: 0 0 18px -4px var(--rarity-color);
  transform: scale(1.04);
  cursor: default;
}
.reveal-card-back { font-size: 40px; }
.reveal-card-tap { font-size: 11px; }
.reveal-card-icon { font-size: 36px; }
.reveal-card-name { font-size: 13px; font-weight: var(--font-weight-bold); }
.reveal-card-rarity { font-size: 11px; font-weight: var(--font-weight-bold); }
.reveal-card-buff { font-size: 10px; line-height: 1.3; }
.reveal-done { width: 100%; display: flex; justify-content: center; }
.reveal-hint { font-size: 12px; }

/* ── Equip slots ─────────────────────────────────────────────────────────── */
.equip-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}
.equip-slot {
  min-height: 110px;
  border-radius: var(--border-radius-lg);
  border: 2px dashed rgba(255,255,255,0.12);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-sm);
  text-align: center;
  transition: border-color var(--transition-fast);
}
.equip-slot.filled { border-style: solid; border-color: var(--rarity-color, #4fc3f7); background: var(--rarity-bg, transparent); }

.slot-card-content { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 100%; }
.slot-icon { font-size: 28px; }
.slot-name { font-size: 12px; font-weight: var(--font-weight-bold); color: var(--rarity-color); }
.slot-buff { font-size: 10px; line-height: 1.3; }
.slot-empty-icon { font-size: 28px; opacity: 0.3; }
.slot-empty-label { font-size: 11px; }

/* ── Filter tabs ─────────────────────────────────────────────────────────── */
.filter-tabs { display: flex; gap: var(--space-xs); margin-bottom: var(--space-md); flex-wrap: wrap; }
.filter-tab {
  padding: 5px 12px;
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.filter-tab.active { background: var(--color-accent); color: var(--bg-base); border-color: var(--color-accent); }
.filter-tab:not(.active):hover { border-color: rgba(255,255,255,0.25); color: var(--text-primary); }

/* ── Collection grid ─────────────────────────────────────────────────────── */
.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-md);
}
.empty-collection {
  text-align: center;
  padding: var(--space-xl) 0;
  display: flex; flex-direction: column; align-items: center; gap: var(--space-sm);
}

.collection-card {
  background: var(--rarity-bg);
  border: 1px solid color-mix(in srgb, var(--rarity-color) 30%, transparent);
  border-radius: var(--border-radius-lg);
  padding: var(--space-sm);
  display: flex; flex-direction: column; gap: 4px;
  text-align: center;
  transition: box-shadow var(--transition-fast), transform var(--transition-fast);
}
.collection-card.equipped {
  box-shadow: 0 0 14px -4px var(--rarity-color);
  transform: none;
}
.collection-card:hover { transform: translateY(-1px); }

.cc-top { display: flex; justify-content: space-between; align-items: flex-start; }
.cc-icon { font-size: 26px; }
.cc-qty { font-size: 11px; font-weight: var(--font-weight-bold); color: var(--text-secondary); background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 999px; }
.cc-name { font-size: 12px; font-weight: var(--font-weight-bold); text-align: left; }
.cc-rarity { font-size: 10px; font-weight: var(--font-weight-bold); text-align: left; }
.cc-buff { font-size: 10px; text-align: left; line-height: 1.3; }
.cc-desc { text-align: left; }

.cc-actions { margin-top: var(--space-xs); }
.btn-equip, .btn-unequip {
  width: 100%; padding: 4px 0;
  border-radius: var(--border-radius-sm);
  border: none; cursor: pointer;
  font-size: 11px; font-weight: var(--font-weight-bold);
  transition: opacity var(--transition-fast);
}
.btn-equip { background: var(--color-accent); color: var(--bg-base); }
.btn-equip:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-unequip { background: rgba(229,57,53,0.2); color: #ef9a9a; border: 1px solid rgba(229,57,53,0.4); }

/* ── Stats card ─────────────────────────────────────────────────────────── */
.stats-card { margin-top: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-xs); }
.stats-row { display: flex; justify-content: space-between; font-size: var(--font-size-sm); }
</style>
