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
        <div class="toast-progress"></div>
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
  max-width: 380px;
  pointer-events: none;
}

.toast {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  padding-bottom: calc(var(--space-sm) + 3px);
  border-radius: var(--border-radius-md);
  background: var(--bg-surface-overlay, #1e1e2e);
  border: 1px solid var(--border-color);
  font-size: var(--font-size-sm);
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  overflow: hidden;
}

.toast-icon {
  font-size: var(--font-size-md);
  flex-shrink: 0;
  line-height: 1;
}

.toast-message {
  flex: 1;
  min-width: 0;
  line-height: 1.35;
}

/* Progress bar that drains over 4s */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
  animation: drainProgress 4s linear forwards;
  transform-origin: left;
}

@keyframes drainProgress {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

.toast-success { border-left: 3px solid var(--color-success); }
.toast-success .toast-progress { background: var(--color-success); }

.toast-danger { border-left: 3px solid var(--color-danger); }
.toast-danger .toast-progress { background: var(--color-danger); }

.toast-warning { border-left: 3px solid var(--color-warning); }
.toast-warning .toast-progress { background: var(--color-warning); }

.toast-info { border-left: 3px solid var(--color-info, #3498db); }
.toast-info .toast-progress { background: var(--color-info, #3498db); }

.toast-cash { border-left: 3px solid var(--color-success); }
.toast-cash .toast-progress { background: var(--color-success); }

.toast-xp { border-left: 3px solid var(--color-accent); }
.toast-xp .toast-progress { background: var(--color-accent); }

.toast-crime { border-left: 3px solid var(--color-nerve, #e67e22); }
.toast-crime .toast-progress { background: var(--color-nerve, #e67e22); }

.toast-combat { border-left: 3px solid var(--color-danger); }
.toast-combat .toast-progress { background: var(--color-danger); }

.toast-jail { border-left: 3px solid var(--color-warning); }
.toast-jail .toast-progress { background: var(--color-warning); }

.toast-hospital { border-left: 3px solid var(--color-danger); }
.toast-hospital .toast-progress { background: var(--color-danger); }

/* TransitionGroup */
.toast-list-enter-active {
  animation: toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.toast-list-leave-active {
  animation: toastOut 0.2s ease forwards;
  pointer-events: none;
}
.toast-list-move {
  transition: transform 0.25s ease;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes toastOut {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.9) translateY(-6px); }
}
</style>
