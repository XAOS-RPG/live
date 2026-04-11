<template>
  <div class="arena" :class="{ 'arena-shake': shaking }">

    <div v-if="phase !== 'result'" class="flee-bar">
      <button type="button" class="btn btn-sm btn-outline flee-btn" @click="flee">
        🏃 Βάλ'το στα πόδια
      </button>
      <span class="flee-hint text-muted">-25% Θράσος &amp; Κέφι · χωρίς απώλεια HP</span>
    </div>

    <!-- ===== INTRO VS SCREEN ===== -->
    <div v-if="phase === 'intro'" class="intro">
      <div class="intro-fighter">
        <span class="intro-icon">😎</span>
        <span class="intro-name">{{ playerName }}</span>
        <span class="intro-lvl">Επ. {{ playerLevel }}</span>
      </div>
      <div class="intro-vs">VS</div>
      <div class="intro-fighter">
        <span class="intro-icon">{{ opponent.icon }}</span>
        <span class="intro-name">{{ oppName }}</span>
        <span class="intro-lvl">Επ. {{ opponent.level }}</span>
      </div>
    </div>

    <!-- ===== BATTLE UI ===== -->
    <template v-if="phase !== 'intro'">

      <!-- Turn bar -->
      <div class="turn-bar">
        <span class="turn-num">Γύρος {{ turn }}</span>
        <span v-if="phase === 'player_turn'" class="turn-you">Η σειρά σου!</span>
        <span v-else-if="phase === 'animating'" class="turn-wait">⚔️</span>
      </div>

      <!-- Enemy info -->
      <div class="info-bar enemy-color">
        <div class="info-top">
          <span>{{ opponent.icon }} {{ oppName }}</span>
          <span class="lvl-badge">Επ.{{ opponent.level }}</span>
        </div>
        <div class="hp-row">
          <div class="hp-track"><div class="hp-fill" :class="hpCls(eHpPct)" :style="{ width: eHpPct + '%' }"></div></div>
          <span class="hp-num">{{ eHP }}/{{ eMaxHP }}</span>
        </div>
      </div>

      <!-- ===== BATTLEFIELD ===== -->
      <div class="battlefield">
        <!-- Player stickman -->
        <div class="fig player-fig" :class="pAnim">
          <svg viewBox="0 0 80 120" class="stick"><circle cx="40" cy="18" r="12"/><circle cx="47" cy="16" r="2" class="eye"/><line x1="40" y1="30" x2="40" y2="68"/><line x1="40" y1="44" x2="22" y2="60"/><line x1="40" y1="44" x2="58" y2="52"/><line x1="40" y1="68" x2="28" y2="100"/><line x1="40" y1="68" x2="52" y2="100"/><line v-if="pWeapon" x1="58" y1="52" x2="76" y2="34" class="wpn"/></svg>
          <div v-if="pGuard" class="shield-icon">🛡️</div>
        </div>

        <!-- Damage popups -->
        <div v-for="d in popups" :key="d.id" class="popup" :class="d.cls" :style="{ left: d.x+'%', top: d.y+'%' }">{{ d.text }}</div>

        <!-- Flash label -->
        <div v-if="flash" class="flash-label">{{ flash }}</div>

        <!-- Enemy stickman -->
        <div class="fig enemy-fig" :class="eAnim">
          <svg viewBox="0 0 80 120" class="stick"><circle cx="40" cy="18" r="12"/><circle cx="47" cy="16" r="2" class="eye"/><line x1="40" y1="30" x2="40" y2="68"/><line x1="40" y1="44" x2="22" y2="60"/><line x1="40" y1="44" x2="58" y2="52"/><line x1="40" y1="68" x2="28" y2="100"/><line x1="40" y1="68" x2="52" y2="100"/><line v-if="eWeapon" x1="58" y1="52" x2="76" y2="34" class="wpn"/></svg>
          <div v-if="eGuard" class="shield-icon">🛡️</div>
        </div>

        <div class="ground"></div>
      </div>

      <!-- Player info -->
      <div class="info-bar player-color">
        <div class="info-top">
          <span>😎 {{ playerName }}</span>
          <span class="lvl-badge">Επ.{{ playerLevel }}</span>
        </div>
        <div class="hp-row">
          <div class="hp-track"><div class="hp-fill" :class="hpCls(pHpPct)" :style="{ width: pHpPct + '%' }"></div></div>
          <span class="hp-num">{{ pHP }}/{{ pMaxHP }}</span>
        </div>
      </div>

      <!-- ===== ACTION BUTTONS ===== -->
      <div v-if="phase === 'player_turn'" class="actions">
        <button class="act-btn" @click="act('punch')">
          <span class="ab-icon">🤜</span><span class="ab-name">Μπουνιά</span><span class="ab-sub">Γρήγορη</span>
        </button>
        <button class="act-btn" @click="act('kick')">
          <span class="ab-icon">🦵</span><span class="ab-name">Κλωτσιά</span><span class="ab-sub">Δυνατή</span>
        </button>
        <button v-if="pWeapon" class="act-btn act-wpn" @click="act('weapon')">
          <span class="ab-icon">{{ pWeapon.icon }}</span><span class="ab-name">{{ pWeapon.name }}</span><span class="ab-sub">Όπλο</span>
        </button>
        <button class="act-btn act-guard" @click="act('guard')">
          <span class="ab-icon">🛡️</span><span class="ab-name">Αμυνα</span><span class="ab-sub">-50% ζημιά</span>
        </button>
      </div>

      <!-- Waiting indicator -->
      <div v-else-if="phase === 'animating'" class="wait-bar">⏳</div>

      <!-- ===== RESULT ===== -->
      <div v-if="phase === 'result'" class="result" :class="won ? 'res-win' : 'res-lose'">
        <div class="res-icon">{{ won ? '🏆' : '💀' }}</div>
        <div class="res-title">{{ won ? 'ΝΙΚΗ!' : 'ΗΤΤΑ...' }}</div>
        <div v-if="won && resData" class="res-rewards">
          <span class="badge badge-success">+€{{ resData.cashReward }}</span>
          <span class="badge badge-info">+{{ resData.xpReward }} XP</span>
          <span v-if="resData.itemDrop" class="badge badge-warning">{{ resData.itemDrop }}!</span>
        </div>
        <div class="res-stats">{{ turn }} γύροι · {{ pHP }}/{{ pMaxHP }} HP</div>
        <button class="btn btn-primary btn-block" @click="finish">Συνέχεια</button>
      </div>

      <!-- ===== COMBAT LOG ===== -->
      <div class="clog" ref="logEl">
        <div v-for="(m, i) in log" :key="i" :class="'cl-' + m.t">{{ m.s }}</div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { getItemById } from '../../data/items'
import { rollItemDrop } from '../../engine/formulas'

const props = defineProps({
  opponent: { type: Object, required: true },
  isPvp: { type: Boolean, default: false },
})
const emit = defineEmits(['fight-end', 'fight-flee'])

const player = usePlayerStore()
const inv = useInventoryStore()

/* ---------- resolve equipment ---------- */
const pWeapon = inv.equippedWeapon          // full item obj | null
const pArmor = inv.equippedArmor
const eWeapon = props.opponent.equippedWeapon ? getItemById(props.opponent.equippedWeapon) : null
const eArmor = props.opponent.equippedArmor ? getItemById(props.opponent.equippedArmor) : null

const oppName = computed(() => props.opponent.nickname || props.opponent.name)
const playerName = player.name
const playerLevel = player.level

/* effective combat stats (armor folded in) */
const pSt = {
  strength: player.stats.strength,
  speed: player.stats.speed,
  dexterity: player.stats.dexterity,
  defense: player.stats.defense + (pArmor?.defense || 0),
}
const eSt = {
  strength: props.opponent.stats.strength,
  speed: props.opponent.stats.speed,
  dexterity: props.opponent.stats.dexterity,
  defense: props.opponent.stats.defense + (eArmor?.defense || 0),
}

/* ---------- reactive state ---------- */
const phase = ref('intro')
const turn  = ref(1)
const pHP   = ref(player.resources.hp.current)
const eHP   = ref(props.opponent.hp)
const pMaxHP = player.resources.hp.max
const eMaxHP = props.opponent.hp

const pAnim = ref('idle')
const eAnim = ref('idle')
const pGuard = ref(false)
const eGuard = ref(false)
const shaking = ref(false)
const flash = ref(null)

const popups = ref([])
let pid = 0

const log = ref([])
const logEl = ref(null)

const won = ref(false)
const resData = ref(null)

const pHpPct = computed(() => Math.max(0, (pHP.value / pMaxHP) * 100))
const eHpPct = computed(() => Math.max(0, (eHP.value / eMaxHP) * 100))

function hpCls(p) { return p > 60 ? 'hp-hi' : p > 30 ? 'hp-mid' : 'hp-lo' }

/* ---------- helpers ---------- */
let timers = []
let dead = false

function sl(ms) {
  return new Promise(r => { const t = setTimeout(r, ms); timers.push(t) })
}

function addLog(s, t = 'info') {
  log.value.push({ s, t })
  nextTick(() => { if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight })
}

function addPopup(side, text, cls) {
  const id = pid++
  const x = side === 'player' ? 18 + Math.random() * 8 : 65 + Math.random() * 8
  const y = 25 + Math.random() * 20
  popups.value.push({ id, text, cls, x, y })
  const t = setTimeout(() => { popups.value = popups.value.filter(p => p.id !== id) }, 1200)
  timers.push(t)
}

function shake() { shaking.value = true; setTimeout(() => shaking.value = false, 300) }

/* ---------- combat math ---------- */
function calcHit(atk, action, wpn, def, defGuarding) {
  let dmg, acc

  if (action === 'punch') {
    dmg = atk.strength * 0.7 + atk.dexterity * 0.15
    acc = 0.6 + (atk.speed / (atk.speed + def.speed + 1)) * 0.3
  } else if (action === 'kick') {
    dmg = atk.strength * 1.1 + atk.dexterity * 0.1
    acc = 0.45 + (atk.speed / (atk.speed + def.speed + 1)) * 0.3
  } else if (action === 'weapon' && wpn) {
    dmg = wpn.damage + atk.strength * 0.4
    acc = wpn.accuracy * (0.75 + atk.dexterity * 0.004)
  } else {
    return { hit: false, damage: 0, crit: false }
  }

  acc = Math.min(0.95, Math.max(0.2, acc))
  if (Math.random() >= acc) return { hit: false, damage: 0, crit: false }

  const dv = def.defense * (defGuarding ? 1.5 : 1.0)
  const red = 1 - dv / (dv + 50)
  const v = 0.85 + Math.random() * 0.3
  const crit = Math.random() < (0.05 + atk.dexterity * 0.002)
  const total = Math.max(1, Math.floor(dmg * red * v * (crit ? 1.5 : 1.0)))

  return { hit: true, damage: total, crit }
}

/* ---------- enemy AI ---------- */
function aiPick() {
  const r = Math.random()
  const ratio = eHP.value / eMaxHP
  const hw = !!eWeapon

  if (ratio < 0.25) {
    if (r < 0.35) return 'guard'
    if (hw && r < 0.55) return 'weapon'
    return r < 0.8 ? 'punch' : 'kick'
  }
  if (ratio < 0.5) {
    if (r < 0.15) return 'guard'
    if (hw && r < 0.4) return 'weapon'
    return r < 0.7 ? 'punch' : 'kick'
  }
  if (hw && r < 0.3) return 'weapon'
  if (r < 0.1) return 'guard'
  return r < 0.6 ? 'punch' : 'kick'
}

/* ---------- labels ---------- */
const ACT_LABEL = { punch: 'μπουνιά', kick: 'κλωτσιά', weapon: 'όπλο', guard: 'αμυνα' }
const ACT_FLASH = { punch: '🤜', kick: '🦵', weapon: '🗡️', guard: '🛡️' }

/* ---------- execute one side's action ---------- */
async function execOne(who, action) {
  if (dead) return
  const isP = who === 'player'
  const atkS = isP ? pSt : eSt
  const defS = isP ? eSt : pSt
  const wpn = isP ? pWeapon : eWeapon
  const dg = isP ? eGuard.value : pGuard.value
  const name = isP ? playerName : oppName.value

  if (action === 'guard') {
    if (isP) pGuard.value = true; else eGuard.value = true
    if (isP) pAnim.value = 'guarding'; else eAnim.value = 'guarding'
    addLog(`${name} πήρε αμυντική στάση`, 'guard')
    await sl(450)
    return
  }

  /* attack anim */
  flash.value = ACT_FLASH[action]
  if (isP) pAnim.value = 'attacking'; else eAnim.value = 'attacking'
  await sl(350)
  flash.value = null

  const res = calcHit(atkS, action, wpn, defS, dg)

  if (res.hit) {
    if (isP) { eHP.value = Math.max(0, eHP.value - res.damage); eAnim.value = 'hit' }
    else     { pHP.value = Math.max(0, pHP.value - res.damage); pAnim.value = 'hit' }
    shake()

    const side = isP ? 'enemy' : 'player'
    addPopup(side, res.crit ? `💥${res.damage}` : `-${res.damage}`, res.crit ? 'pop-crit' : 'pop-dmg')

    const ct = res.crit ? ' ΚΡΙΤΙΚΟ!' : ''
    addLog(`${name} — ${ACT_LABEL[action]} → ${res.damage} ζημιά${ct}`, isP ? 'player' : 'enemy')
  } else {
    const side = isP ? 'enemy' : 'player'
    if (isP) eAnim.value = 'dodge'; else pAnim.value = 'dodge'
    addPopup(side, 'ΑΣΤΟΧΙΑ', 'pop-miss')
    addLog(`${name} — ${ACT_LABEL[action]} → αστοχία`, 'miss')
  }

  await sl(450)
  pAnim.value = pGuard.value ? 'guarding' : 'idle'
  eAnim.value = eGuard.value ? 'guarding' : 'idle'
}

/* ---------- main turn ---------- */
async function act(action) {
  if (phase.value !== 'player_turn' || dead) return
  phase.value = 'animating'

  const aiAction = aiPick()
  const playerFirst = pSt.speed >= eSt.speed
  const moves = playerFirst
    ? [['player', action], ['enemy', aiAction]]
    : [['enemy', aiAction], ['player', action]]

  for (const [who, a] of moves) {
    await execOne(who, a)
    if (dead) return

    if (eHP.value <= 0) { eAnim.value = 'ko'; await sl(600); await endFight(true); return }
    if (pHP.value <= 0) { pAnim.value = 'ko'; await sl(600); await endFight(false); return }
    await sl(150)
  }

  pGuard.value = false; eGuard.value = false
  pAnim.value = 'idle'; eAnim.value = 'idle'
  turn.value++

  if (turn.value > 30) {
    await endFight(pHP.value / pMaxHP >= eHP.value / eMaxHP)
    return
  }
  phase.value = 'player_turn'
}

/* ---------- end fight ---------- */
async function endFight(playerWon) {
  if (dead) return
  won.value = playerWon

  if (playerWon) {
    const o = props.opponent
    const cash = o.rewards.cashMin + Math.floor(Math.random() * (o.rewards.cashMax - o.rewards.cashMin + 1))
    const dropId = rollItemDrop(o.possibleItemDrops || [])
    let dropName = null
    if (dropId) { const it = getItemById(dropId); dropName = it ? it.name : dropId }

    resData.value = { won: true, cashReward: cash, xpReward: o.rewards.xp, itemDrop: dropName, itemDropId: dropId, turns: turn.value, playerHPRemaining: pHP.value }
    addLog(`🏆 ΝΙΚΗ! +€${cash} +${o.rewards.xp}XP`, 'win')
  } else {
    resData.value = { won: false, turns: turn.value, playerHPRemaining: 0 }
    addLog('💀 ΗΤΤΑ...', 'lose')
  }

  await sl(300)
  phase.value = 'result'
}

function finish() {
  emit('fight-end', { ...resData.value, isPvp: props.isPvp, opponentId: props.opponent.id, opponentName: oppName.value, opponentIcon: props.opponent.icon })
}

function flee() {
  if (phase.value === 'result' || dead) return
  dead = true
  timers.forEach(clearTimeout)
  timers = []
  emit('fight-flee', { opponentId: props.opponent.id, isPvp: props.isPvp, opponentName: oppName.value })
}

/* ---------- lifecycle ---------- */
onMounted(async () => {
  addLog(`⚔️ ${playerName} vs ${oppName.value}`, 'info')
  await sl(1800)
  if (dead) return
  phase.value = 'player_turn'
  addLog('Διάλεξε επίθεση!', 'info')
})

onBeforeUnmount(() => { dead = true; timers.forEach(clearTimeout) })
</script>

<style scoped>
.flee-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: var(--space-xs);
}
.flee-btn {
  flex-shrink: 0;
  border-color: rgba(230, 126, 34, 0.45);
}
.flee-btn:hover {
  border-color: var(--color-warning, #e67e22);
  background: rgba(230, 126, 34, 0.08);
}
.flee-hint {
  font-size: var(--font-size-xs);
  line-height: 1.35;
}

.arena {
  display: flex; flex-direction: column; gap: var(--space-sm);
  position: relative;
}
.arena-shake { animation: arShake 0.3s ease; }
@keyframes arShake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-3px); }
  75%     { transform: translateX(3px); }
}

/* ===== INTRO ===== */
.intro {
  display: flex; align-items: center; justify-content: center; gap: var(--space-lg);
  padding: var(--space-xl) 0;
  animation: introFade 0.6s ease;
}
.intro-fighter { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.intro-icon { font-size: 3rem; }
.intro-name { font-weight: var(--font-weight-bold); font-size: var(--font-size-md); }
.intro-lvl  { font-size: var(--font-size-xs); color: var(--text-secondary); }
.intro-vs   { font-size: 2.5rem; font-weight: 900; color: var(--color-danger); animation: vsPulse 0.8s ease infinite alternate; }
@keyframes vsPulse { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }
@keyframes introFade { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

/* ===== TURN BAR ===== */
.turn-bar {
  display: flex; align-items: center; justify-content: space-between;
  font-size: var(--font-size-sm); color: var(--text-secondary);
}
.turn-num  { font-weight: var(--font-weight-bold); }
.turn-you  { color: var(--color-success); font-weight: var(--font-weight-bold); animation: pulse 1s ease infinite alternate; }
@keyframes pulse { 0% { opacity: 0.7; } 100% { opacity: 1; } }

/* ===== INFO BARS ===== */
.info-bar {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
}
.enemy-color { border-left: 3px solid var(--color-danger); }
.player-color { border-left: 3px solid var(--color-accent); }
.info-top {
  display: flex; align-items: center; justify-content: space-between;
  font-size: var(--font-size-sm); font-weight: var(--font-weight-bold);
  margin-bottom: 4px;
}
.lvl-badge {
  font-size: 10px; padding: 1px 6px;
  background: var(--bg-surface-raised); border-radius: var(--border-radius-full);
  color: var(--text-secondary);
}
.hp-row { display: flex; align-items: center; gap: var(--space-xs); }
.hp-track {
  flex: 1; height: 10px;
  background: #1a1a2e; border-radius: 5px; overflow: hidden;
}
.hp-fill {
  height: 100%; border-radius: 5px;
  transition: width 0.35s ease;
}
.hp-hi  { background: linear-gradient(90deg, #27ae60, #2ecc71); }
.hp-mid { background: linear-gradient(90deg, #e67e22, #f39c12); }
.hp-lo  { background: linear-gradient(90deg, #c0392b, #e74c3c); }
.hp-num { font-size: 10px; font-family: var(--font-family-mono); color: var(--text-secondary); min-width: 52px; text-align: right; }

/* ===== BATTLEFIELD ===== */
.battlefield {
  position: relative;
  height: 180px;
  background: linear-gradient(180deg, #080816 0%, #12122a 100%);
  border-radius: var(--border-radius-lg);
  border: 1px solid #2a2a4a;
  display: flex; align-items: flex-end; justify-content: space-around;
  padding: 0 var(--space-lg);
  overflow: hidden;
}
.ground {
  position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, transparent 5%, #3a3a6a 50%, transparent 95%);
}

/* ===== STICKMEN ===== */
.fig {
  position: relative; width: 80px; height: 120px;
  margin-bottom: 3px; z-index: 2;
  transition: transform 0.15s;
}
.fig .stick {
  width: 100%; height: 100%;
  stroke-width: 3; stroke-linecap: round; fill: none;
}
.player-fig .stick { stroke: #5dade2; }
.player-fig .eye   { fill: #5dade2; stroke: none; }
.player-fig .wpn   { stroke: #f1c40f; stroke-width: 2.5; }

.enemy-fig { transform: scaleX(-1); }
.enemy-fig .stick { stroke: #e74c3c; }
.enemy-fig .eye   { fill: #e74c3c; stroke: none; }
.enemy-fig .wpn   { stroke: #f1c40f; stroke-width: 2.5; }

.shield-icon {
  position: absolute; top: 30%; left: 50%; transform: translateX(-50%);
  font-size: 1.6rem; filter: drop-shadow(0 0 4px rgba(52,152,219,0.5));
  animation: shieldBob 0.6s ease infinite alternate;
}
@keyframes shieldBob { 0% { transform: translateX(-50%) translateY(0); } 100% { transform: translateX(-50%) translateY(-3px); } }

/* Animations */
.fig.idle      { animation: breathe 2.5s ease infinite; }
.fig.attacking { animation: lunge 0.35s ease forwards; }
.fig.hit       { animation: hitRecoil 0.45s ease; }
.fig.dodge     { animation: dodgeMove 0.4s ease; }
.fig.guarding  { animation: guardStance 0.4s ease forwards; filter: brightness(1.15); }
.fig.ko        { animation: fallDown 0.6s ease forwards; }

/* Enemy mirrored => lunge direction reversed by scaleX(-1) */
@keyframes breathe {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-2px); }
}
.enemy-fig.idle { animation: breatheE 2.5s ease infinite; }
@keyframes breatheE {
  0%,100% { transform: scaleX(-1) translateY(0); }
  50%     { transform: scaleX(-1) translateY(-2px); }
}

@keyframes lunge {
  0%   { transform: translateX(0); }
  50%  { transform: translateX(35px); }
  100% { transform: translateX(0); }
}
.enemy-fig.attacking { animation: lungeE 0.35s ease forwards; }
@keyframes lungeE {
  0%   { transform: scaleX(-1) translateX(0); }
  50%  { transform: scaleX(-1) translateX(35px); }
  100% { transform: scaleX(-1) translateX(0); }
}

@keyframes hitRecoil {
  0%   { transform: translateX(0); filter: brightness(1); }
  30%  { transform: translateX(-12px); filter: brightness(2.5); }
  100% { transform: translateX(0); filter: brightness(1); }
}
.enemy-fig.hit { animation: hitRecoilE 0.45s ease; }
@keyframes hitRecoilE {
  0%   { transform: scaleX(-1) translateX(0); filter: brightness(1); }
  30%  { transform: scaleX(-1) translateX(-12px); filter: brightness(2.5); }
  100% { transform: scaleX(-1) translateX(0); filter: brightness(1); }
}

@keyframes dodgeMove {
  0%   { transform: translateX(0); }
  40%  { transform: translateX(-15px) translateY(-8px); }
  100% { transform: translateX(0); }
}
.enemy-fig.dodge { animation: dodgeMoveE 0.4s ease; }
@keyframes dodgeMoveE {
  0%   { transform: scaleX(-1) translateX(0); }
  40%  { transform: scaleX(-1) translateX(-15px) translateY(-8px); }
  100% { transform: scaleX(-1) translateX(0); }
}

@keyframes guardStance {
  0%   { transform: translateY(0); }
  100% { transform: translateY(2px) scaleY(0.95); }
}
.enemy-fig.guarding { animation: guardStanceE 0.4s ease forwards; filter: brightness(1.15); }
@keyframes guardStanceE {
  0%   { transform: scaleX(-1) translateY(0); }
  100% { transform: scaleX(-1) translateY(2px) scaleY(0.95); }
}

@keyframes fallDown {
  0%   { transform: rotate(0deg); opacity: 1; }
  100% { transform: rotate(85deg) translateY(15px); opacity: 0.4; transform-origin: bottom right; }
}
.enemy-fig.ko { animation: fallDownE 0.6s ease forwards; }
@keyframes fallDownE {
  0%   { transform: scaleX(-1) rotate(0deg); opacity: 1; }
  100% { transform: scaleX(-1) rotate(-85deg) translateY(15px); opacity: 0.4; transform-origin: bottom left; }
}

/* ===== DAMAGE POPUPS ===== */
.popup {
  position: absolute; z-index: 10;
  font-weight: 900; font-size: 1.1rem;
  pointer-events: none;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
  animation: popFloat 1.2s ease-out forwards;
}
.pop-dmg  { color: #e74c3c; }
.pop-crit { color: #f39c12; font-size: 1.4rem; }
.pop-miss { color: #95a5a6; font-style: italic; font-size: 0.9rem; }
@keyframes popFloat {
  0%   { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-50px); opacity: 0; }
}

/* Flash label (action icon) */
.flash-label {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  font-size: 2rem; z-index: 8;
  animation: flashPop 0.35s ease forwards;
  pointer-events: none;
}
@keyframes flashPop {
  0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 1; }
  60%  { transform: translate(-50%,-50%) scale(1.3); opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
}

/* ===== ACTIONS ===== */
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs);
}
.act-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: var(--space-sm) var(--space-xs);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer; transition: all 0.15s;
  color: var(--text-primary);
}
.act-btn:hover { background: var(--bg-surface-raised); border-color: var(--color-accent); transform: translateY(-1px); }
.act-btn:active { transform: scale(0.97); }
.ab-icon { font-size: 1.5rem; }
.ab-name { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); }
.ab-sub  { font-size: 9px; color: var(--text-secondary); }
.act-wpn { border-color: rgba(241,196,15,0.3); }
.act-wpn:hover { border-color: #f1c40f; }
.act-guard { border-color: rgba(52,152,219,0.3); }
.act-guard:hover { border-color: #3498db; }

.wait-bar { text-align: center; font-size: 1.5rem; padding: var(--space-sm); }

/* ===== RESULT ===== */
.result {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm); padding: var(--space-lg);
  border-radius: var(--border-radius-lg);
  animation: resultIn 0.5s ease;
}
.res-win  { background: rgba(46,204,113,0.12); border: 1px solid rgba(46,204,113,0.3); }
.res-lose { background: rgba(231,76,60,0.12); border: 1px solid rgba(231,76,60,0.3); }
.res-icon { font-size: 3rem; }
.res-title { font-size: var(--font-size-2xl); font-weight: 900; }
.res-win .res-title { color: var(--color-success); }
.res-lose .res-title { color: var(--color-danger); }
.res-rewards { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
.res-stats { font-size: var(--font-size-xs); color: var(--text-secondary); }
@keyframes resultIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }

/* ===== COMBAT LOG ===== */
.clog {
  max-height: 100px; overflow-y: auto;
  background: var(--bg-base); border-radius: var(--border-radius-md);
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-xs); line-height: 1.5;
}
.cl-player { color: #5dade2; }
.cl-enemy  { color: #e74c3c; }
.cl-miss   { color: #7f8c8d; }
.cl-guard  { color: #3498db; }
.cl-win    { color: #2ecc71; font-weight: bold; }
.cl-lose   { color: #e74c3c; font-weight: bold; }
.cl-info   { color: var(--text-secondary); }
</style>
