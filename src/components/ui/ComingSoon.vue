<template>
  <div class="coming-soon-page">
    <div class="cs-header">
      <span class="cs-icon">{{ icon }}</span>
      <h2>{{ title }}</h2>
    </div>
    <div class="card cs-card">
      <div class="cs-badge">🚧 Σύντομα Διαθέσιμο</div>
      <p class="cs-desc">{{ description }}</p>
      <div v-if="features.length" class="cs-features">
        <div v-for="(feat, i) in features" :key="i" class="cs-feature">
          <span class="cs-feat-icon">{{ feat.icon }}</span>
          <span class="cs-feat-text">{{ feat.text }}</span>
        </div>
      </div>
      <router-link to="/" class="btn btn-primary btn-sm cs-back">← Πίσω στην Αρχική</router-link>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '🔧' },
  title: { type: String, default: 'Σύντομα' },
  description: { type: String, default: 'Αυτή η λειτουργία θα είναι σύντομα διαθέσιμη!' },
  features: { type: Array, default: () => [] }
})
</script>

<style scoped>
.coming-soon-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.cs-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.cs-icon { font-size: 32px; }

.cs-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  align-items: center;
  text-align: center;
  padding: var(--space-xl) var(--space-lg);
}

.cs-badge {
  display: inline-block;
  background: var(--bg-surface-raised);
  border: 1px solid var(--color-warning);
  color: var(--color-warning);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.cs-desc {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  max-width: 320px;
  line-height: 1.5;
  margin: 0;
}

.cs-features {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
  max-width: 300px;
}

.cs-feature {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface-raised);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
}

.cs-feat-icon { font-size: 18px; flex-shrink: 0; }
.cs-feat-text { color: var(--text-secondary); text-align: left; }

.cs-back { margin-top: var(--space-sm); }
</style>
