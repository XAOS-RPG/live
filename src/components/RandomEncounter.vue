<template>
  <Transition name="encounter-fade">
    <div v-if="encounter" class="encounter-overlay" @click.self="ignore">
      <div class="encounter-box card">
        <div class="encounter-icon">{{ encounter.icon }}</div>
        <h3 class="encounter-title">{{ encounter.title }}</h3>
        <p class="text-muted encounter-desc">{{ encounter.description }}</p>

        <div class="encounter-choices">
          <button class="btn btn-success choice-btn" @click="choose('help')">
            <span>{{ encounter.helpLabel }}</span>
            <span class="choice-reward text-success">-5 ⚡ · +{{ helpFilotimo }} Φιλότιμο · +{{ encounter.helpHappiness }} Κέφι</span>
          </button>
          <button class="btn btn-outline choice-btn" @click="choose('ignore')">
            <span>Αγνόησε</span>
            <span class="choice-reward text-muted">Καμία επίδραση</span>
          </button>
          <button class="btn btn-danger choice-btn" @click="choose('steal')">
            <span>{{ encounter.stealLabel }}</span>
            <span class="choice-reward text-danger">+€{{ encounter.stealCash }} · -10 Φιλότιμο</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useEncounterStore } from '../stores/encounterStore'
import { useCardStore } from '../stores/cardStore'

const encounterStore = useEncounterStore()
const cardStore = useCardStore()

const encounter = computed(() => encounterStore.current)
const helpFilotimo = computed(() =>
  encounter.value ? Math.round(encounter.value.helpFilotimo * cardStore.filotimoBonus) : 0
)

function choose(choice) {
  encounterStore.resolve(choice)
}

function ignore() {
  encounterStore.resolve('ignore')
}
</script>

<style scoped>
.encounter-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 8000;
  padding: var(--space-md);
  backdrop-filter: blur(3px);
}

.encounter-box {
  max-width: 420px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  text-align: center;
  padding: var(--space-xl);
  border: 2px solid rgba(255,215,0,0.3);
}

.encounter-icon { font-size: 4rem; line-height: 1; }
.encounter-title { margin: 0; font-size: var(--font-size-lg); }
.encounter-desc { margin: 0; font-size: var(--font-size-sm); line-height: 1.5; }

.encounter-choices {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
}

.choice-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm) var(--space-md);
}

.choice-reward {
  font-size: var(--font-size-xs);
  font-weight: normal;
}

.encounter-fade-enter-active, .encounter-fade-leave-active { transition: opacity 0.3s; }
.encounter-fade-enter-from, .encounter-fade-leave-to { opacity: 0; }
</style>
