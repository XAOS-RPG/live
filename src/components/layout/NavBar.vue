<template>
  <nav :class="vertical ? 'nav-vertical' : 'nav-horizontal'">
    <router-link
      v-for="item in mainItems"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :class="{ active: isRouteActive(item.to) }"
    >
      <span class="nav-icon-wrap">
        <span class="nav-icon">{{ item.icon }}</span>
        <span v-if="item.hubBadge && hubUnread" class="nav-badge-dot" aria-hidden="true" />
      </span>
      <span class="nav-label">{{ item.label }}</span>
    </router-link>

    <!-- More menu (mobile only) -->
    <div v-if="!vertical" class="nav-item more-toggle" :class="{ active: showMore }" @click="showMore = !showMore">
      <span class="nav-icon">···</span>
      <span class="nav-label">Άλλα</span>
    </div>

    <!-- Extra items (sidebar only — mobile uses overlay popup) -->
    <template v-if="vertical">
      <router-link
        v-for="item in extraItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isRouteActive(item.to) }"
      >
        <span class="nav-icon-wrap">
          <span class="nav-icon">{{ item.icon }}</span>
          <span v-if="item.hubBadge && hubUnread" class="nav-badge-dot" aria-hidden="true" />
        </span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </template>
  </nav>

  <!-- Mobile more dropdown overlay -->
  <Teleport to="body">
    <div v-if="showMore && !vertical" class="more-overlay" @click="showMore = false">
      <div class="more-menu" @click.stop>
        <router-link
          v-for="item in extraItems"
          :key="item.to"
          :to="item.to"
          class="more-item"
          @click="showMore = false"
        >
          <span class="more-item-icon">{{ item.icon }}</span>
          <span class="more-item-label">{{ item.label }}</span>
        </router-link>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useEventsHubStore } from '../../stores/eventsHubStore'

defineProps({
  vertical: Boolean
})

const route = useRoute()
const showMore = ref(false)
const eventsHub = useEventsHubStore()
const hubUnread = computed(() => eventsHub.hubUnread)

const mainItems = [
  { to: '/', icon: '🏠', label: 'Αρχική' },
  { to: '/crimes', icon: '🎭', label: 'Εγκλήματα' },
  { to: '/gym', icon: '💪', label: 'Γυμναστήριο' },
  { to: '/combat', icon: '⚔️', label: 'Μάχη' },
  { to: '/events-hub', icon: '📡', label: 'Events Hub', hubBadge: true },
]

const extraItems = [
  { to: '/daily', icon: '📅', label: 'Bonus' },
  { to: '/missions', icon: '📋', label: 'Αποστολές' },
  { to: '/achievements', icon: '🏆', label: 'Επιτεύγματα' },
  { to: '/leaderboard', icon: '🏅', label: 'Κατάταξη' },
  { to: '/faction', icon: '🏴', label: 'Συμμορία' },
  { to: '/travel', icon: '✈️', label: 'Ταξίδι' },
  { to: '/education', icon: '🎓', label: 'Εκπαίδευση' },
  { to: '/casino', icon: '🎲', label: 'Τυχερά' },
  { to: '/stocks', icon: '📈', label: 'Χρηματιστήριο' },
  { to: '/job', icon: '💼', label: 'Δουλειά' },
  { to: '/property', icon: '🏘️', label: 'Ακίνητα' },
  { to: '/inventory', icon: '🎒', label: 'Τσέπη' },
  { to: '/kontres', icon: '🏎️', label: 'Κόντρες' },
  { to: '/shop', icon: '🛒', label: 'Κατάστημα' },
  { to: '/bounties', icon: '🎯', label: 'Συμβόλαια' },
  { to: '/bazaar', icon: '🏪', label: 'Παζάρι' },
  { to: '/company', icon: '🏢', label: 'Εταιρεία' },
  { to: '/profile', icon: '👤', label: 'Προφίλ' },
  { to: '/settings', icon: '⚙️', label: 'Ρυθμίσεις' },
]

function isRouteActive(path) {
  if (path === '/events-hub') {
    return route.path === '/events-hub' || route.path === '/newspaper'
  }
  return route.path === path
}
</script>

<style scoped>
/* === Horizontal (bottom nav mobile) === */
.nav-horizontal {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 100%;
  padding: 0 var(--space-xs);
}

.nav-horizontal .nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--space-xs);
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.nav-horizontal .nav-item.active {
  color: var(--color-accent);
}

.nav-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-horizontal .nav-icon {
  font-size: 20px;
  line-height: 1;
}

.nav-badge-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e53935;
  box-shadow: 0 0 0 2px var(--bg-surface, #1a1a2e);
}

.nav-horizontal .nav-label {
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

/* === Vertical (sidebar desktop) === */
.nav-vertical {
  display: flex;
  flex-direction: column;
  padding: var(--space-md) 0;
  width: 100%;
}

.nav-vertical .nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  border-left: 3px solid transparent;
}

.nav-vertical .nav-item:hover {
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

.nav-vertical .nav-item.active {
  color: var(--color-accent);
  border-left-color: var(--color-accent);
  background: rgba(79, 195, 247, 0.05);
}

.nav-vertical .nav-icon-wrap {
  width: 24px;
  justify-content: center;
}

.nav-vertical .nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.nav-vertical .nav-badge-dot {
  right: -2px;
}

.nav-vertical .nav-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

/* === More overlay (mobile) === */
.more-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  padding-bottom: calc(var(--nav-bar-height) + var(--space-sm));
}

.more-menu {
  width: 100%;
  max-height: 65vh;
  overflow-y: auto;
  background: var(--bg-surface-overlay);
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  padding: var(--space-md);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.more-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-xs);
  color: var(--text-primary);
  text-decoration: none;
  border-radius: var(--border-radius-md);
  transition: background var(--transition-fast);
  text-align: center;
  min-height: 60px;
}

.more-item:hover {
  background: var(--bg-surface-raised);
}

.more-item-icon {
  font-size: 26px;
  line-height: 1;
}

.more-item-label {
  font-size: 10px;
  line-height: 1.2;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.more-toggle {
  position: relative;
}
</style>
