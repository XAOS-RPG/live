<template>
  <div class="modal-overlay">
    <div class="modal-box card">
      <h2 class="modal-title">⚡ Επίλεξε Ειδικότητα</h2>
      <p class="text-muted modal-subtitle">Επίπεδο 3 — Η επιλογή είναι <strong>μόνιμη</strong>.</p>

      <div class="spec-list">
        <button
          v-for="spec in specs"
          :key="spec.id"
          class="spec-card card"
          @click="classStore.choose(spec.id)"
        >
          <span class="spec-icon">{{ spec.icon }}</span>
          <div class="spec-info">
            <strong>{{ spec.name }}</strong>
            <p class="text-muted spec-desc">{{ spec.description }}</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useClassStore, SPECIALIZATIONS } from '../stores/classStore'

const classStore = useClassStore()
const specs = Object.values(SPECIALIZATIONS)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: var(--space-md);
}

.modal-box {
  max-width: 480px;
  width: 100%;
  padding: var(--space-lg);
}

.modal-title {
  text-align: center;
  margin-bottom: var(--space-xs);
}

.modal-subtitle {
  text-align: center;
  margin-bottom: var(--space-lg);
  font-size: var(--font-size-sm);
}

.spec-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.spec-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  cursor: pointer;
  text-align: left;
  border: 2px solid transparent;
  transition: border-color var(--transition-fast), background var(--transition-fast);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  width: 100%;
}

.spec-card:hover {
  border-color: var(--color-accent);
  background: var(--bg-surface);
}

.spec-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.spec-info strong {
  display: block;
  margin-bottom: 4px;
}

.spec-desc {
  margin: 0;
  font-size: var(--font-size-xs);
  line-height: 1.45;
}
</style>
