# Code Map — GreekTorn (Χάος)

Comprehensive reference for developers and AI assistants. Each file's purpose and responsibilities are documented. This is a Greek-themed browser RPG (Torn City clone) built with Vue 3 + Vite + Pinia.

---

## Entry Points

| File | Role |
|------|------|
| `src/main.js` | App bootstrap: creates Vue app, installs Pinia + Router, mounts to `#app` |
| `src/App.vue` | Root component: layout shell (NavBar, StatusBar, router-view, ToastNotification), starts game loop on mount |
| `src/router/index.js` | Vue Router with hash history (Capacitor-compatible). Guards redirect to `/create` if no save, block incapacitated players from action routes |
| `vite.config.js` | Vite config with `base: '/GreekTorn/'` for GitHub Pages |
| `index.html` | HTML entry point, mounts Vue app to `#app` div |
| `package.json` | Project dependencies and build scripts |

---

## Stores (`src/stores/`)

Pinia stores. All have `getSerializable()` and `hydrate(data)` for save/load.

### Core Game Stores

| Store | Responsibility |
|-------|---------------|
| `gameStore.js` | **Game lifecycle**: save/load to localStorage (`chaos_save_v1`), import/export JSON, notification toasts, rAF game loop (`startGameLoop`). Loads/saves all domain stores. Calculates offline progress on load (up to 24h). |
| `playerStore.js` | **Core player state**: stats (strength/speed/dexterity/defense), resources (HP/energy/nerve/happiness), cash, level/XP, filotimo, meson, crimeXP, status (free/hospital/jail), `activeActivity` (one action at a time), `pendingResult` (dice waiting to be rolled). `tickRegen()` runs every frame — regenerates resources, resolves expired activities, checks jail/hospital timers. Getters `activityTimeRemaining` and `activityProgress` reference `lastTick` to trigger live reactivity. |

### Activity & Action Stores

| Store | Responsibility |
|-------|---------------|
| `crimeStore.js` | Crime logic. `startCrime()` deducts nerve, pre-rolls d6 success with `rollD6()`, starts activity timer. `applyCrimeResult()` gives rewards or applies jail. Pre-rolling prevents save-scumming. |
| `jobStore.js` | Legal job system. `collectPay()` once per 24h. Each job gives cash + happiness, possible item drop. Tracks `lastCollected`. |
| `casinoStore.js` | Casino logic. `playGame()` is instant (no timer). Uses `rollD6()` for probability games, exact-match for number-guess games. Tracks stats (gamesPlayed, totalWon, totalLost). |
| `combatStore.js` | PvE combat. `startFight(npcId)` runs full `resolveCombat()` simulation (turn-based, up to 50 turns). Sends player to hospital on loss. Rewards XP, cash, possible item drops on win. |
| `travelStore.js` | City travel via activity system. `travelTo(locationId)` starts a timed activity. Location bonuses exposed as getters: `crimeRewardMultiplier`, `shopDiscountMultiplier`, `gymBoostMultiplier`. Current location persists. |
| `educationStore.js` | Course tracking. `completedCourses` array, `enrollCourse()` starts timed activity. On completion applies permanent stat/skill bonuses. `educationBonuses` getter aggregates all completed course bonuses. |

### Economy & Progression Stores

| Store | Responsibility |
|-------|---------------|
| `inventoryStore.js` | Item storage: `{ itemId: quantity }`. Methods: `addItem`, `removeItem`, `useItem` (delegates to item's `onUse` effect). |
| `propertyStore.js` | Property ownership. Properties give passive income per 24h (`collectIncome()`). Each property has purchasePrice and daily income. |
| `stockStore.js` | Stock market. `tickPrices()` called every game loop frame with mean-reversion random walk. `buyStock()` / `sellStock()`. Dividends applied every 15 min via `tickDividends()`. Portfolio value computed as getter. 8 fictional Greek companies. |
| `companyStore.js` | Business ownership system. Players can found businesses (Περίπτερο, Εστιατόριο, Γκαράζ, Φαρμακείο). Each business generates hourly passive income, can be leveled up. Tracks owned companies and upgrade costs. |

### Social & Community Stores

| Store | Responsibility |
|-------|---------------|
| `factionStore.js` | Faction/gang system. `joinFaction()` allows player to join a faction. Tracks current faction, rank (member/veteran/officer/leader), contribution points, and faction bonuses. Ranks auto-promote based on contribution. |
| `bountyStore.js` | Bounty hunting system. Pre-populated bounties on NPCs and players. `acceptBounty()` starts a combat-like activity. Rewards given on completion. Bounties expire or can be manually posted. |
| `bazaarStore.js` | Player-to-player marketplace. `listings` are fake NPC-generated marketplace items. Players can `buyFromListing()`. Generates random item listings with varied sellers and prices. |

### Progression & Rewards Stores

| Store | Responsibility |
|-------|---------------|
| `achievementStore.js` | Achievement/badge system. Tracks `unlocked` and `claimed` achievement IDs. `checkAchievements()` runs after each action to evaluate unlocked conditions (based on stat snapshots: combat wins, crimes, level, wealth, stats, items, education). Players claim rewards when achievement unlocks. |
| `missionStore.js` | Daily mission system. `activeMissions` array refreshes daily. Tracks progress on mission objectives (combat, crime, level, etc.). `refreshMissions()` loads 3 random daily missions. Players claim rewards when mission completes. |
| `dailyRewardStore.js` | Daily login reward system. `claimDailyReward()` once per 24h. Sequential rewards that scale (day 1→10, 11→20, etc.). Streak tracking and bonus rewards. |
| `racingStore.js` | Racing/vehicle system. Players compete in races with different difficulties. Tracks wins, best times, and racing stats. Rewards cash and XP. |

### Shop & Transaction Stores

| Store | Responsibility |
|-------|---------------|
| `shopStore.js` | General shop/store system. Allows purchase of items, consumables, and equipment. Different shop types with different inventory. Price adjustments based on location bonuses. |

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
| `items.js` | All items with id, name, type, effect description, `onUse()` callback, rarity, icon |
| `npcs.js` | Combat NPCs with level, stats, HP, weapon, rewards |
| `jobs.js` | Legal jobs with pay, requirements, happiness bonus |
| `properties.js` | Purchasable properties with cost and passive daily income |
| `locations.js` | 7 Greek cities with travel time and bonus multipliers (crime/shop/gym) |
| `courses.js` | Education courses grouped by category, with prerequisites and stat bonuses on completion |
| `casino.js` | 5 casino games with winChance, payout multiplier, min/max bet. Some require player choice (number guess) |
| `stocks.js` | 8 fictional Greek companies: basePrice, volatility, dividendRate, sector |
| `achievements.js` | All achievements with id, name, icon, description, check condition, reward. Categories: combat, crime, level, wealth, stats, items, education |
| `missions.js` | Mission templates grouped by type (combat, crime, level, wealth). `getRandomMissions(3)` returns random daily missions |
| `factions.js` | Faction data: id, name, icon, description, bonus effects for members. Each faction has unique stat/income bonuses |
| `dailyRewards.js` | Sequential daily reward tiers. Each day has cash/XP reward amounts. Bonus multipliers for streaks |
| `racing.js` | Racing courses with difficulty, distance, time limits, rewards, leaderboard data |
| `fakeUsers.js` | Pre-generated NPC player profiles (nickname, level, stats, icon). Used for bounty system, bazaar sellers, faction members |

---

## Views (`src/views/`)

One Vue component per page/route. All routed through Vue Router.

### Main Game Views

| View | Route | Description |
|------|-------|-------------|
| `CharacterCreateView.vue` | `/create` | Name input + stat allocation (10 points), starts new game |
| `HomeView.vue` | `/` | Dashboard: resource bars, quick-action grid, activity log, status display |
| `ProfileView.vue` | `/profile` | Full stats display, rank, XP bar, activity history, detailed player info |
| `SettingsView.vue` | `/settings` | Export/import/delete save, game info, credits |

### Action & Activity Views

| View | Route | Description |
|------|-------|-------------|
| `CrimeView.vue` | `/crimes` | Crime list with success%, nerve cost, duration. Timer card while active. "Ρίξε το Ζάρι" button when timer expires. Dice → apply reward/jail |
| `GymView.vue` | `/gym` | Stat tabs (4 stats) → exercise cards. Timer while training. "Ρίξε το Ζάρι" button when done. Dice roll = multiplier on stat gain (1→x0.5, 6→x2.0) |
| `CombatView.vue` | `/combat` | NPC list, start fight, shows turn-by-turn log, result card |
| `JobView.vue` | `/job` | Job list, select job, collect daily pay button (24h cooldown) |
| `TravelView.vue` | `/travel` | City list with travel time and bonuses, travel activity card |
| `EducationView.vue` | `/education` | Category tabs, course cards with prerequisites, enrollment, completion tracking |

### Economy & Market Views

| View | Route | Description |
|------|-------|-------------|
| `CasinoView.vue` | `/casino` | Game cards with bet controls, instant play, dice animation |
| `StockView.vue` | `/stocks` | Stock list with mini SVG price charts, buy/sell controls, portfolio summary |
| `PropertyView.vue` | `/property` | Property list, buy/sell, collect passive income |
| `InventoryView.vue` | `/inventory` | Grid of owned items with quantity, use button |
| `BazaarView.vue` | `/bazaar` | Marketplace listings from fake sellers. Browse items, purchase with negotiable prices |
| `ShopView.vue` | `/shop` | Item shop (consumables, weapons, armor). Purchase with cash. Prices vary by location |
| `CompanyView.vue` | `/company` | Owned businesses display. Found new company, level up, collect income |

### Hospital & Jail Views

| View | Route | Description |
|------|-------|-------------|
| `HospitalView.vue` | `/hospital` | Countdown timer, recover HP on release, escape option |
| `JailView.vue` | `/jail` | Countdown timer, escape attempt (uses dexterity), bribe option |

### Social & Community Views

| View | Route | Description |
|------|-------|-------------|
| `AchievementsView.vue` | `/achievements` | Achievement list, progress display, reward claims, categories by type |
| `MissionsView.vue` | `/missions` | Active daily missions, progress tracking, reward claims. Missions refresh daily at midnight |
| `FactionView.vue` | `/faction` | Faction list to join, current faction display, member list, faction bonuses, rank info |
| `BountyView.vue` | `/bounty` | Bounty list on NPCs and players, difficulty info, rewards, accept bounty for combat |
| `DailyRewardView.vue` | `/daily-reward` | Daily login reward display, claim button, streak counter, upcoming rewards |
| `LeaderboardView.vue` | `/leaderboard` | Global rankings by wealth, level, combat wins, crime stats, achievements |
| `ForumsView.vue` | `/forums` | Player forums (coming soon) |
| `MessagesView.vue` | `/messages` | Private messaging system (coming soon) |
| `NewspaperView.vue` | `/newspaper` | In-game news/events (coming soon) |
| `KontresView.vue` | `/kontres` | Player-vs-player encounters/duels system (coming soon) |

---

## Components (`src/components/`)

### Layout Components

| Component | Role |
|-----------|------|
| `NavBar.vue` | Side nav on desktop, bottom bar + "Άλλα" overflow menu on mobile. Extra items render ONLY in sidebar/overlay, not in mobile bottom bar (prevents icon duplication) |
| `StatusBar.vue` | Top bar: HP/energy/nerve/happiness bars, cash display, `ActivityTimer` when an activity is running |

### UI Components

| Component | Role |
|-----------|------|
| `DiceRoll.vue` | Dice roll overlay. **Two modes**: `check` (crimes/casino) — pip scale 1-6, success/fail result; `multiplier` (gym) — 3×2 multiplier table, shows x0.5–x2.0 result. Player stops the spinning die manually via "Σταμάτα!" button. Roll is pre-determined at activity start (anti-cheat). |
| `ActivityTimer.vue` | Compact bar shown in StatusBar while an activity is in progress. Countdown + progress bar. Click navigates to the relevant page |
| `ResourceBar.vue` | Reusable labeled progress bar for HP/energy/nerve/happiness |
| `ToastNotification.vue` | Toast notifications (top-right, auto-dismiss after 3s, max 5 visible) |
| `ComingSoon.vue` | Placeholder component for features under development |

### Casino Components

| Component | Role |
|-----------|------|
| `BlackjackGame.vue` | Blackjack game implementation (card game, dealer vs player, instant results) |
| `SlotsGame.vue` | Slots machine game (spinning reels, instant results) |
| `KenoGame.vue` | Keno lottery game (number selection, instant results) |

### Combat Components

| Component | Role |
|-----------|------|
| `CombatArena.vue` | Main combat display. Shows health bars, turn-by-turn log, attack buttons, result summary. Used in CombatView |
| `BattleEquipPopup.vue` | Equipment selection popup during combat (weapons, armor changes) |

---

## Styles (`src/styles/`)

| File | Role |
|------|------|
| `variables.css` | CSS custom properties: colors (primary/secondary/danger/success), spacing (sm/md/lg), typography (font-family, sizes), border radius, transitions |
| `reset.css` | Minimal CSS reset (no opinionated defaults) |
| `base.css` | Body defaults, scrollbar styling, utility classes (`.flex`, `.text-muted`, `.badge-*`, `.btn`, `.card`, etc.) |
| `components.css` | Shared component styles: `.card`, `.btn`, `.badge`, `.bar-track/.bar-fill`, `.grid`, `.tabs` |
| `animations.css` | Global keyframe animations: spin, pulse, fadeIn, slideIn, diceRoll, etc. |
| `responsive.css` | Breakpoints: mobile-first, tablet at 768px, desktop at 1024px, large desktop at 1400px |

---

## Miscellaneous

| File | Purpose |
|------|---------|
| `README.md` | Project documentation, setup instructions, feature overview |
| `.gitignore` | Git ignore patterns (node_modules, dist, .env, etc.) |
| `.github/workflows/deploy.yml` | GitHub Actions workflow for automated deployment to GitHub Pages |
| `push.ps1` | PowerShell script for git push operations |

---

## Key Patterns

### Activity System
Only one activity at a time (`playerStore.activeActivity`). Result is pre-rolled at start and stored in `preRolled` — prevents save-scumming. Timer expires → `pendingResult` set → player navigates to view and manually rolls the dice. After dice dismiss → rewards/penalties applied → `clearPendingResult()`.

**Flow**: 
1. User clicks action (crime, gym, combat, etc.)
2. `startAction()` deducts resources, pre-rolls d6, starts timer, sets `activeActivity`
3. Timer completes, `pendingResult` set
4. User navigates to action view
5. Dice roll UI shows (animated), user clicks "Σταμάτα!"
6. `applyResult()` executes rewards/penalties
7. `clearPendingResult()` resets state

### Dice System (d6)
`rollD6(rate)` maps 0–1 probability to a d6 target (1-6). Outcome determined by exact probability, then a matching d6 face is chosen so the visual is always consistent. 

- **Crimes/Casino**: success/fail check (probability to success threshold)
- **Gym**: multiplier (x0.5 to x2.0 on stat gains)

### Reactivity for Timers
`lastTick` in playerStore is updated every rAF frame by `tickRegen()`. Getters `activityTimeRemaining`, `activityProgress`, `statusTimeRemaining` reference `lastTick` so Pinia recomputes them live without a page refresh.

### Save/Load System
`gameStore.saveGame()` calls `getSerializable()` on all stores, writes to `localStorage`. `loadGame()` calls `hydrate(data)` on each. `SAVE_VERSION = 1` — version mismatch discards old save. Supports offline progress calculation (up to 24h).

### Achievement Checking
After each action, `achievementStore.checkAchievements()` evaluates all achievements against current game state snapshot. Achievements unlock silently, players claim rewards in AchievementsView. Anti-cheat: checks are state-based, not event-based.

### Daily Reset Logic
Missions, daily rewards, and job pay tracked via `lastRefreshDate` / `lastCollected` (date strings or timestamps). Midnight UTC triggers refresh on next load/tick.

---

## Development Notes

- **Greek Language**: All UI text, item names, and achievement titles are in Greek (UTF-8)
- **Capacitor-Compatible**: Hash routing for mobile app support
- **No Backend**: Fully client-side, localStorage persistence only
- **Anti-Cheat**: Pre-rolling results, localStorage checksums (optional), no server validation
- **Mobile-First CSS**: Responsive design from 320px to 1400px+
- **Pinia State Management**: Centralized stores, auto-save to localStorage
- **Vue 3 Composition**: Components use setup() and computed/ref reactivity
