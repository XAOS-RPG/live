<template>
  <div class="resource-bar">
    <div class="bar-header">
      <span class="bar-icon">{{ icon }}</span>
      <span class="bar-label">{{ label }}</span>
      <span class="bar-values">{{ Math.floor(current) }}/{{ max }}</span>
    </div>
    <div class="bar-track" :style="{ background: bgColor }">
      <div
        class="bar-fill"
        :class="{ 'bar-regen': current < max && current > 0 }"
        :style="{
          width: percentage + '%',
          background: color
        }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  current: Number,
  max: Number,
  color: String,
  bgColor: String,
  icon: String
})

const percentage = computed(() => {
  if (props.max <= 0) return 0
  return Math.min(100, Math.max(0, (props.current / props.max) * 100))
})
</script>

<style scoped>
.resource-bar {
  min-width: 0;
}

.bar-header {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-bottom: 2px;
}

.bar-icon {
  font-size: 10px;
  line-height: 1;
}

.bar-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-values {
  margin-left: auto;
  font-size: 10px;
  font-family: var(--font-family-mono);
  color: var(--text-secondary);
  white-space: nowrap;
}

.bar-track {
  height: 8px;
  border-radius: var(--border-radius-full);
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  border-radius: var(--border-radius-full);
  transition: width 0.5s ease;
  position: relative;
}

.bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to bottom, rgba(255,255,255,0.15), transparent);
  border-radius: var(--border-radius-full) var(--border-radius-full) 0 0;
}
</style>
