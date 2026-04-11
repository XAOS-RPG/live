# Code Map — Χάος (GreekTorn)

Quick reference for AI assistants and developers. Each section describes what a file is responsible for. The game is a Greek-themed browser RPG (Torn City clone) built with Vue 3 + Vite + Pinia.

---

## Entry Points

| File | Role |
|------|------|
| `src/main.js` | App bootstrap: creates Vue app, installs Pinia + Router, mounts to `#app` |
| `src/App.vue` | Root component: layout shell (NavBar, StatusBar, router-view, ToastNotification), starts game loop on mount |
| `src/router/index.js` | Vue Router with hash history (Capacitor-compatible). Guards redirect to `/create` if no save, block incapacitated players from action routes |
| `vite.config.js` | Vite config with `base: '/GreekTorn/'` for GitHub Pages |

---

## Stores (`src/stores/`)

Pinia stores. All have `getSerializable()` and `hydrate(data)` for save/load.

| Store | Responsibility |
|-------|---------------|
| `playerStore.js` | **Core player state**: stats (strength/speed/dexterity/defense), resources (HP/energy/nerve/happiness), cash, level/XP, filotimo, meson, crimeXP, status (free/hospital/jail), `activeActivity` (one action at a time), `pendingResult` (dice waiting to be rolled). `tickRegen()` runs every frame — regenerates resources, resolves expired activities, checks jail/hospital timers. Getters `activityTimeRemaining` and `activityProgress` reference `lastTick` to trigger live reactivity. |
| `gameStore.js` | **Game lifecycle**: save/load to localStorage (`chaos_save_v1`), import/export JSON, notification toasts, rAF game loop (`startGameLoop`). Loads/saves all 10 domain stores. Calculates offline progress on load (up to 24h). |
| `crimeStore.js` | Crime logic. `startCrime()` deducts nerve, pre-rolls d6 success with `rollD6()`, starts activity timer. `applyCrimeResult()` gives rewards or applies jail. Pre-rolling prevents save-scumming. |
| `casinoStore.js` | Casino logic. `playGame()` is instant (no timer). Uses `rollD6()` for probability games, exact-match for number-guess games. Tracks stats (gamesPlayed, totalWon, totalLost). |
| `inventoryStore.js` | Item storage: `{ itemId: quantity }`. Methods: `addItem`, `removeItem`, `useItem` (delegates to item's `onUse` effect). |
| `combatStore.js` | PvE combat. `startFight(npcId)` runs full `resolveCombat()` simulation (turn-based, up to 50 turns). Sends player to hospital on loss. Rewards XP, cash, possible item drops on win. |
| `jobStore.js` | Legal job system. `collectPay()` once per 24h. Each job gives cash + happiness, possible item drop. Tracks `lastCollected`. |
| `propertyStore.js` | Property ownership. Properties give passive income per 24h (`collectIncome()`). Each property has purchasePrice and daily income. |
| `travelStore.js` | City travel via activity system. `travelTo(locationId)` starts a timed activity. Location bonuses exposed as getters: `crimeRewardMultiplier`, `shopDiscountMultiplier`, `gymBoostMultiplier`. Current location persists. |
| `educationStore.js` | Course tracking. `completedCourses` array, `enrollCourse()` starts timed activity. On completion applies permanent stat/skill bonuses. `educationBonuses` getter aggregates all completed course bonuses. |
| `stockStore.js` | Stock market. `tickPrices()` called every game loop frame with mean-reversion random walk. `buyStock()` / `sellStock()`. Dividends applied every 15 min via `tickDividends()`. Portfolio value computed as getter. 8 fictional Greek companies. |

---

## Engine (`src/engine/`)

| File | Role |
|------|------|
| `formulas.js` | **All game math in one place**: `rollD6(successRate)` — converts probability to d6 result (1-6, high roll wins, preserves exact probability internally); `calculateCrimeSuccess()` — base + stat bonus + XP bonus − filotimo penalty; `calculateCrimeReward()` — random cash in range; `calculateJailTime()`; `rollItemDrop()`; `resolveCombat()` — full turn-by-turn simulation; `calculateStatGain()` — gym base gain × happiness multiplier × variance; `calculateHospitalTime()`; `calculateEscapeChance()`; `calculateBribeCost()`; `xpForLevel()` — exponential XP curve |

---

## Data (`src/data/`)

Static game data. Import and read — never mutate at runtime.

| File | Contents |
|------|----------|
| `constants.js` | Global tuning constants: regen rates, resource maximums, cooldowns, save key/version |
| `crimes.js` | 8 crimes with nerveCost, duration (ms), rewards, jailChance, relevant stat, tier |
| `exercises.js` | 20 gym exercises (5 per stat). Each has level requirement, duration, energyCost, multiplier |
| `gyms.js` | 5 gym tiers unlocked by totalStats threshold. Each has baseStatGain and happinessMultiplier flag |
| `items.js` | All items with id, name, type, effect description, `onUse()` callback |
| `npcs.js` | Combat NPCs with level, stats, HP, weapon, rewards |
| `jobs.js` | Legal jobs with pay, requirements, happiness bonus |
| `properties.js` | Purchasable properties with cost and passive daily income |
| `locations.js` | 7 Greek cities with travel time and bonus multipliers (crime/shop/gym) |
| `courses.js` | Education courses grouped by category, with prerequisites and stat bonuses on completion |
| `casino.js` | 5 casino games with winChance, payout multiplier, min/max bet. Some require player choice (number guess) |
| `stocks.js` | 8 fictional Greek companies: basePrice, volatility, dividendRate, sector |

---

## Views (`src/views/`)

One Vue component per page/route.

| View | Route | Description |
|------|-------|-------------|
| `CharacterCreateView.vue` | `/create` | Name input + stat allocation (10 points), starts new game |
| `HomeView.vue` | `/` | Dashboard: resource bars, quick-action grid, activity log |
| `CrimeView.vue` | `/crimes` | Crime list with success%, nerve cost, duration. Timer card while active. "Ρίξε το Ζάρι" button when timer expires. Dice → apply reward/jail |
| `GymView.vue` | `/gym` | Stat tabs (4 stats) → exercise cards. Timer while training. "Ρίξε το Ζάρι" button when done. Dice roll = multiplier on stat gain (1→x0.5, 6→x2.0) |
| `CombatView.vue` | `/combat` | NPC list, start fight, shows turn-by-turn log, result card |
| `JobView.vue` | `/job` | Job list, select job, collect daily pay button (24h cooldown) |
| `PropertyView.vue` | `/property` | Property list, buy/sell, collect passive income |
| `InventoryView.vue` | `/inventory` | Grid of owned items with quantity, use button |
| `TravelView.vue` | `/travel` | City list with travel time and bonuses, travel activity card |
| `EducationView.vue` | `/education` | Category tabs, course cards with prerequisites, enrollment |
| `CasinoView.vue` | `/casino` | Game cards with bet controls, instant play, dice animation |
| `StockView.vue` | `/stocks` | Stock list with mini SVG price charts, buy/sell controls, portfolio summary |
| `HospitalView.vue` | `/hospital` | Countdown timer, recover HP on release, escape option |
| `JailView.vue` | `/jail` | Countdown timer, escape attempt (uses dexterity), bribe option |
| `ProfileView.vue` | `/profile` | Full stats display, rank, XP bar, activity history |
| `SettingsView.vue` | `/settings` | Export/import/delete save, game info |

---

## Components (`src/components/`)

### Layout
| Component | Role |
|-----------|------|
| `NavBar.vue` | Side nav on desktop, bottom bar + "Άλλα" overflow menu on mobile. Extra items render ONLY in sidebar/overlay, not in mobile bottom bar (prevents icon duplication) |
| `StatusBar.vue` | Top bar: HP/energy/nerve/happiness bars, cash display, `ActivityTimer` when an activity is running |

### UI
| Component | Role |
|-----------|------|
| `DiceRoll.vue` | Dice roll overlay. **Two modes**: `check` (crimes/casino) — pip scale 1-6, success/fail result; `multiplier` (gym) — 3×2 multiplier table, shows x0.5–x2.0 result. Player stops the spinning die manually via "Σταμάτα!" button. Roll is pre-determined at activity start (anti-cheat). |
| `ActivityTimer.vue` | Compact bar shown in StatusBar while an activity is in progress. Countdown + progress bar. Click navigates to the relevant page |
| `ResourceBar.vue` | Reusable labeled progress bar for HP/energy/nerve/happiness |
| `ToastNotification.vue` | Toast notifications (top-right, auto-dismiss after 3s, max 5 visible) |

---

## Styles (`src/styles/`)

| File | Role |
|------|------|
| `variables.css` | CSS custom properties: colors, spacing, typography, border radius, transitions |
| `base.css` | Body defaults, scrollbar styling, utility classes (`.flex`, `.text-muted`, `.badge-*`, etc.) |
| `components.css` | Shared component styles: `.card`, `.btn`, `.badge`, `.bar-track/.bar-fill` |
| `animations.css` | Global keyframe animations |
| `reset.css` | Minimal CSS reset |
| `responsive.css` | Breakpoints: mobile-first, tablet at 768px, desktop at 1024px, large desktop at 1400px |

---

## Key Patterns

**Activity system**: Only one activity at a time (`playerStore.activeActivity`). Result is pre-rolled at start and stored in `preRolled` — prevents save-scumming. Timer expires → `pendingResult` set → player navigates to view and manually rolls the dice. After dice dismiss → rewards/penalties applied → `clearPendingResult()`.

**Dice (d6)**: `rollD6(rate)` maps 0–1 probability to a d6 target (1-6). Outcome determined by exact probability, then a matching d6 face is chosen so the visual is always consistent. Crimes/casino = success/fail check. Gym = multiplier (x0.5 to x2.0).

**Reactivity for timers**: `lastTick` in playerStore is updated every rAF frame by `tickRegen()`. Getters `activityTimeRemaining`, `activityProgress`, `statusTimeRemaining` reference `lastTick` so Pinia recomputes them live without a page refresh.

**Save/load**: `gameStore.saveGame()` calls `getSerializable()` on all 10 stores, writes to `localStorage`. `loadGame()` calls `hydrate(data)` on each. `SAVE_VERSION = 1` — version mismatch discards old save.
