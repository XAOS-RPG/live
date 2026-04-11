<template>
  <div class="toast-container">
    <TransitionGroup name="toast-list">
      <div
        v-for="toast in gameStore.notifications"
        :key="toast.id"
        class="toast"
        :class="'toast-' + toast.type"
        @click="gameStore.removeNotification(toast.id)"
      >
        <span class="toast-icon">{{ getIcon(toast.type) }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useGameStore } from '../../stores/gameStore'

const gameStore = useGameStore()

function getIcon(type) {
  const icons = {
    success: '✓',
    danger: '✗',
    warning: '⚠',
    info: 'ℹ',
    cash: '€',
    xp: '★',
    crime: '🎭',
    combat: '⚔️',
    jail: '🔒',
    hospital: '🏥'
  }
  return icons[type] || 'ℹ'
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: var(--space-md);
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: calc(100% - var(--space-lg) * 2);
  max-width: 400px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-md);
  background: var(--bg-surface-overlay);
  border: 1px solid var(--border-color);
  font-size: var(--font-size-sm);
  cursor: pointer;
  pointer-events: auto;
  box-shadow: var(--shadow-md);
}

.toast-icon {
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  min-width: 0;
}

.toast-success { border-left: 3px solid var(--color-success); }
.toast-danger { border-left: 3px solid var(--color-danger); }
.toast-warning { border-left: 3px solid var(--color-warning); }
.toast-info { border-left: 3px solid var(--color-info); }
.toast-cash { border-left: 3px solid var(--color-success); }
.toast-xp { border-left: 3px solid var(--color-accent); }
.toast-crime { border-left: 3px solid var(--color-nerve); }
.toast-combat { border-left: 3px solid var(--color-danger); }
.toast-jail { border-left: 3px solid var(--color-warning); }
.toast-hospital { border-left: 3px solid var(--color-danger); }

/* TransitionGroup animations */
.toast-list-enter-active {
  animation: toastIn var(--transition-normal) forwards;
}

.toast-list-leave-active {
  animation: toastOut var(--transition-fast) forwards;
}

.toast-list-move {
  transition: transform var(--transition-normal);
}
</style>
