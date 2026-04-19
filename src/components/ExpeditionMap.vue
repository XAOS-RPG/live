<template>
  <div class="expedition-map" :style="{ background: district.color }">
    <svg
      :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
      preserveAspectRatio="xMidYMid meet"
      class="map-svg"
    >
      <!-- Subtle street grid -->
      <g class="grid">
        <line v-for="x in vGrid" :key="`v${x}`" :x1="x" :y1="0" :x2="x" :y2="VIEW_H" />
        <line v-for="y in hGrid" :key="`h${y}`" :x1="0" :y1="y" :x2="VIEW_W" :y2="y" />
      </g>

      <!-- District boundary glow -->
      <rect
        :x="8" :y="8"
        :width="VIEW_W - 16" :height="VIEW_H - 16"
        rx="12"
        class="district-border"
        :style="{ stroke: district.accent }"
      />

      <!-- Edges -->
      <g class="edges">
        <line
          v-for="(e, idx) in district.edges"
          :key="`e${idx}`"
          :x1="nodeById(e[0]).x"
          :y1="nodeById(e[0]).y"
          :x2="nodeById(e[1]).x"
          :y2="nodeById(e[1]).y"
          class="edge"
          :class="{ 'edge-route': isEdgeInRoute(e) }"
        />
      </g>

      <!-- Route line -->
      <polyline
        v-if="routeCoords.length >= 2"
        :points="routePoints"
        class="route-line"
      />

      <!-- Nodes -->
      <g
        v-for="n in district.nodes"
        :key="n.id"
        class="node-g"
        :class="nodeClass(n)"
        @click="onNodeClick(n)"
      >
        <circle
          :cx="n.x"
          :cy="n.y"
          :r="NODE_R"
          class="node-circle"
        />
        <text
          :x="n.x"
          :y="n.y + 5"
          class="node-icon"
          text-anchor="middle"
        >{{ n.icon }}</text>
        <!-- Hot node star -->
        <text
          v-if="hotNodeIds.includes(n.id)"
          :x="n.x + NODE_R - 2"
          :y="n.y - NODE_R + 4"
          class="node-badge hot-badge"
          text-anchor="middle"
        >⭐</text>
        <!-- Marked node -->
        <text
          v-if="markedNodeIds.includes(n.id)"
          :x="n.x - NODE_R + 2"
          :y="n.y - NODE_R + 4"
          class="node-badge mark-badge"
          text-anchor="middle"
        >📌</text>
        <!-- Route step number -->
        <circle
          v-if="routeStepFor(n.id) != null"
          :cx="n.x + NODE_R - 3"
          :cy="n.y + NODE_R - 3"
          r="9"
          class="step-bubble"
        />
        <text
          v-if="routeStepFor(n.id) != null"
          :x="n.x + NODE_R - 3"
          :y="n.y + NODE_R"
          text-anchor="middle"
          class="step-number"
        >{{ routeStepFor(n.id) }}</text>
        <!-- Current position pulse (during run) -->
        <circle
          v-if="currentNodeId === n.id"
          :cx="n.x"
          :cy="n.y"
          :r="NODE_R + 4"
          class="current-ring"
        />
      </g>

      <!-- Node labels -->
      <g class="labels">
        <text
          v-for="n in district.nodes"
          :key="`lbl-${n.id}`"
          :x="n.x"
          :y="n.y + NODE_R + 14"
          text-anchor="middle"
          class="node-label"
        >{{ n.name }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getNode, areNodesConnected } from '../data/expeditions'

const props = defineProps({
  district:        { type: Object, required: true },
  route:           { type: Array, default: () => [] },
  currentNodeId:   { type: String, default: null },
  hotNodeIds:      { type: Array, default: () => [] },
  markedNodeIds:   { type: Array, default: () => [] },
  exploredNodeIds: { type: Array, default: () => [] },
  mode:            { type: String, default: 'plan' }, // 'plan' | 'run' | 'locked'
})

const emit = defineEmits(['node-click'])

const VIEW_W = 340
const VIEW_H = 480
const NODE_R = 22

const vGrid = [60, 120, 180, 240, 300]
const hGrid = [60, 120, 180, 240, 300, 360, 420]

function nodeById(id) {
  return props.district.nodes.find(n => n.id === id) || { x: 0, y: 0 }
}

const routeCoords = computed(() => props.route.map(id => nodeById(id)))

const routePoints = computed(() =>
  routeCoords.value.map(c => `${c.x},${c.y}`).join(' ')
)

function isEdgeInRoute(edge) {
  for (let i = 0; i < props.route.length - 1; i++) {
    const a = props.route[i], b = props.route[i + 1]
    if ((edge[0] === a && edge[1] === b) || (edge[0] === b && edge[1] === a)) return true
  }
  return false
}

function routeStepFor(nodeId) {
  const idx = props.route.indexOf(nodeId)
  return idx >= 0 ? idx + 1 : null
}

function nodeClass(n) {
  const inRoute = props.route.includes(n.id)
  const isEntry = n.id === props.district.entryNodeId
  const last = props.route[props.route.length - 1]
  const canExtend = props.mode === 'plan' &&
    !inRoute &&
    props.route.length > 0 &&
    areNodesConnected(props.district.id, last, n.id)
  return {
    'node-in-route': inRoute,
    'node-entry': isEntry,
    'node-available': canExtend,
    'node-explored': props.exploredNodeIds.includes(n.id),
    'node-hot': props.hotNodeIds.includes(n.id),
    'node-current': props.currentNodeId === n.id,
  }
}

function onNodeClick(n) {
  if (props.mode !== 'plan') return
  emit('node-click', n)
}
</script>

<style scoped>
.expedition-map {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

.map-svg {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}

.grid line {
  stroke: rgba(255,255,255,0.04);
  stroke-width: 1;
}

.district-border {
  fill: none;
  stroke-width: 2;
  stroke-dasharray: 4 4;
  opacity: 0.25;
}

.edge {
  stroke: rgba(255,255,255,0.18);
  stroke-width: 2;
}

.edge-route {
  stroke: rgba(255,107,53,0.35);
  stroke-width: 3;
}

.route-line {
  fill: none;
  stroke: #ff6b35;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.85;
  filter: drop-shadow(0 0 3px rgba(255,107,53,0.6));
}

.node-g {
  cursor: default;
  transition: transform 150ms ease;
}

.node-g.node-available {
  cursor: pointer;
}

.node-g.node-available:hover {
  transform: scale(1.08);
  transform-origin: center;
  transform-box: fill-box;
}

.node-circle {
  fill: #1a1a2e;
  stroke: rgba(255,255,255,0.35);
  stroke-width: 2;
}

.node-explored .node-circle {
  stroke: rgba(255,255,255,0.6);
}

.node-entry .node-circle {
  stroke: #4FC3F7;
  stroke-width: 3;
  fill: #0a2a3e;
}

.node-available .node-circle {
  stroke: #ffd966;
  stroke-width: 2.5;
  stroke-dasharray: 3 3;
  animation: dashRotate 3s linear infinite;
}

.node-in-route .node-circle {
  fill: #ff6b35;
  stroke: #ffffff;
  stroke-width: 2.5;
}

.node-hot .node-circle {
  fill: #3a2a0a;
  stroke: #FFB300;
}

.node-hot.node-in-route .node-circle {
  fill: #ff6b35;
}

.node-current .node-circle {
  fill: #4CAF50;
  stroke: #ffffff;
  stroke-width: 3;
}

.current-ring {
  fill: none;
  stroke: #4CAF50;
  stroke-width: 2;
  opacity: 0.6;
  animation: pulseRing 1.6s ease-in-out infinite;
}

.node-icon {
  font-size: 20px;
  pointer-events: none;
  user-select: none;
}

.step-bubble {
  fill: #ff6b35;
  stroke: #ffffff;
  stroke-width: 1.5;
}

.step-number {
  font-size: 10px;
  font-weight: 700;
  fill: #ffffff;
  pointer-events: none;
  user-select: none;
}

.node-badge {
  font-size: 12px;
  pointer-events: none;
  user-select: none;
}

.node-label {
  fill: rgba(255,255,255,0.85);
  font-size: 10px;
  font-weight: 500;
  pointer-events: none;
  user-select: none;
  paint-order: stroke;
  stroke: rgba(0,0,0,0.7);
  stroke-width: 2.5;
  stroke-linejoin: round;
}

@keyframes dashRotate {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: 18; }
}

@keyframes pulseRing {
  0%, 100% { opacity: 0.6; r: 26; }
  50%      { opacity: 0.2; r: 32; }
}
</style>
