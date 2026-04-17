# Code Map — Χάος (Greek RPG)

Comprehensive reference for developers and AI assistants. Greek-themed browser RPG (Torn City-inspired) built with Vue 3 + Vite + Pinia + Supabase.

---

## Entry Points

| File | Role |
|------|------|
| `src/main.js` | App bootstrap: creates Vue app, installs Pinia + Router, mounts to `#app` |
| `src/App.vue` | Root component: layout shell (NavBar, StatusBar, router-view, ToastNotification), starts game loop on mount |
| `src/router/index.js` | Vue Router with hash history. Guards redirect to `/auth` if not logged in, `/create` if no save, block incapacitated players from action routes |
| `vite.config.js` | Vite config with `base: '/live/'` for GitHub Pages |
| `index.html` | HTML entry point, mounts Vue app to `#app` div |
| `package.json` | Project dependencies and build scripts |

---

## Stores (`src/stores/`)

Pinia stores. All have `getSerializable()` and `hydrate(data)` for save/load.

### Core Game Stores

| Store | Responsibility |
|-------|---------------|
| `gameStore.js` | **Game lifecycle**: save/load to localStorage (`chaos_save_v1`), import/export JSON, notification toasts, rAF game loop (`startGameLoop`). Loads/saves all domain stores. Calculates offline progress on load (up to 24h). |
| `playerStore.js` | **Core player state**: stats (strength/speed/dexterity/defense), resources (HP/energy/nerve/happiness), cash, level/XP, filotimo, meson, crimeXP, status (free/hospital/jail), `activeActivity`, `pendingResult`. `tickRegen()` runs every frame. Getters `activityTimeRemaining` and `activityProgress` reference `lastTick` for live reactivity. |

### Authentication & Session Stores

| Store | Responsibility |
|-------|---------------|
| `authStore.js` | **Supabase authentication**: manages user session, sign-up / login / logout, syncs player data with Supabase profiles, bridges localStorage save with cloud backup. |
| `eventsHubStore.js` | **Random events hub**: triggers city exploration events on navigation (5% chance), logs event results, manages cooldowns, applies event effects (cash, items, HP). |

### Activity & Action Stores

| Store | Responsibility |
|-------|---------------|
| `crimeStore.js` | Crime logic. `startCrime()` deducts nerve, pre-rolls d6, starts activity timer. `applyCrimeResult()` gives rewards or applies jail. Hacker specialization support. |
| `jobStore.js` | Legal job system. `collectPay()` once per 24h. Each job gives cash + happiness, possible item drop. Tracks `lastCollected`. |
| `casinoStore.js` | Casino logic. Instant play (no timer). Uses `rollD6()` for probability games. Tracks stats (gamesPlayed, totalWon, totalLost). |
| `combatStore.js` | PvE + PvP combat. `startFight(npcId)` runs full `resolveCombat()` simulation. Sends player to hospital on loss. Rewards XP, cash, possible item drops on win. Status effects (Burn/Bleed/Stun) from crafted weapons. |
| `pvpStore.js` | **Real PvP**: fetches real player profiles from Supabase for PvP combat. Async battles using real opponent stats. Steals 3% of opponent's cash on win. Filters out hospitalized/jailed players. |
| `travelStore.js` | City travel via activity system. `travelTo(locationId)` starts a timed activity. Location bonuses exposed as getters. Current location persists. |
| `educationStore.js` | Course tracking. `completedCourses` array, `enrollCourse()` starts timed activity. On completion applies permanent stat/skill bonuses. |
| `smugglingStore.js` | **Contraband smuggling**: buy contraband cheap in one city, sell in another. Police checkpoint risk on travel (reduced by vehicle avoidance). Earnings go to dirty money. Prices refresh every 4h. Vehicle state: `equippedVehicle`, `ownedVehicles`, `effectiveMaxCargoSlots`. Actions: `buyVehicle()`, `equipVehicle()`, `checkVehicleOnArrival()`. |
| `territoryStore.js` | **Territory Wars**: tracks control of 7 Greek cities (faction, capturedAt, siegeEndsAt). Syncs via Supabase Realtime. Actions: `fetchTerritories()`, `subscribeRealtime()`, `initiateSiege()`, `joinSiege()`, `resolveSiege()`, `calculateTaxOnPurchase()`. Tax rate: 2% on purchases/travel in controlled cities. |
| `heistStore.js` | **Group Heists**: cooperative 3-player PvE via Supabase Realtime lobbies. State: `activeLobbyId`, `myRole`, `lobby`, `publicLobbies`, `heistHistory`, `heistCooldowns`. Actions: `createLobby()`, `joinLobby()`, `leaveLobby()`, `startHeist()`, `submitRoll()`. Rewards split equally (dirty money + Κέβλαρ). |
| `weeklyEventStore.js` | **Weekly events**: 9 rotating game-wide events (Double XP, Police Operation, Discounts, Blood Moon, etc.) that change every Monday. Applies multipliers across all systems. |

### Economy & Progression Stores

| Store | Responsibility |
|-------|---------------|
| `inventoryStore.js` | Item storage: `{ itemId: quantity }`. Methods: `addItem`, `removeItem`, `useItem` (delegates to item's `onUse` effect). |
| `propertyStore.js` | Property ownership. Properties give passive income per 24h (`collectIncome()`). |
| `stockStore.js` | Stock market. `tickPrices()` called every game loop frame with mean-reversion random walk. `buyStock()` / `sellStock()`. Dividends every 15 min. 8 fictional Greek companies. |
| `companyStore.js` | Business ownership. Found businesses (Περίπτερο, Εστιατόριο, Γκαράζ, Φαρμακείο, Ξενοδοχείο). Hourly passive income, level upgrades, employee hiring (+10% income/person). Requires level 5+. Dirty money laundering (70% conversion). |
| `craftingStore.js` | **Crafting system**: 10 recipes using 8 base materials. Quality dice roll (d6) after craft determines stat multiplier (×1.00–×2.00). Materials sourced from crimes/smuggling/market. |
| `loanStore.js` | **Loan shark system**: 4 tiers (€5k–€500k), daily interest (10–25%). Enforcers attack at 3 days overdue (−30% HP), cash seizure at 7 days. |
| `auctionStore.js` | **Live auction house**: list items with starting price + duration (6/12/24/48h). 5% listing fee. Minimum bid increment +5%. Anti-snipe: 5-min extension if bid in last 5 min. NPC competition. Auto-refund on outbid. |
| `dealerStore.js` | **Black market dealer (Μαυραγορίτης)**: appears every 8h in a random city. Sells 3 premium items (20 total stock). Accepts only dirty money. Player must be in same city. |
| `cardStore.js` | **Lucky Kiosk card system**: 3 pack types (Basic/Rare/Legendary). 14 cards with Greek god themes. Equip up to 3 cards simultaneously for passive buffs. Collection tracking. |

### Social & Community Stores

| Store | Responsibility |
|-------|---------------|
| `factionStore.js` | Faction/gang system. `joinFaction()`, rank tracking (member/veteran/officer/leader), contribution points, faction bonuses. Faction Fortress with 4 upgradeable buildings (Hidden Gym, Underground Accounting, Operations Center, Community Pantry). Collective treasury donations. |
| `bountyStore.js` | Bounty hunting. Pre-populated bounties on NPCs and real players. `acceptBounty()` starts combat. Rewards on completion. |
| `bazaarStore.js` | Player-to-player marketplace. NPC-generated listings. Players can `buyFromListing()` or list own items. |
| `friendStore.js` | **Friends system**: send/accept/reject friend requests via Supabase `friends` table. View friends list with levels. |
| `playersStore.js` | **Real players store**: fetches and caches real player profiles from Supabase for PvP, bounties, jail/hospital views. |

### Progression & Rewards Stores

| Store | Responsibility |
|-------|---------------|
| `achievementStore.js` | Achievement/badge system. `checkAchievements()` runs after each action. Players claim rewards when achievement unlocks. |
| `missionStore.js` | Daily mission system. 3 random daily missions. Tracks progress, refreshes daily. |
| `dailyRewardStore.js` | **Street Box (Κουτί Δρόμου)**: once per 24h unboxing mechanic. 70% Common / 25% Rare / 5% Legendary items. Cash bonus scales with streak (+€50/day, max +€1,500). Streak save via ad watch (1–2 missed days). |
| `petStore.js` | **Pet system**: 8 pets with unique passive bonuses (crime success, casino luck, combat damage, etc.). Daily feeding/playing/training. Level up to 10. Pet leaves if unfed for 48h. Only 1 active pet at a time. |
| `eliteStore.js` | **Elite Ascension (Level 30+)**: Shadow Control (up to 5 NPC helpers earning passive income), Networking Tree (spend Meson for permanent perks), Political Influence (spend Filotimo+cash to control cities for hourly tax income), Legal Fronts (launder dirty money, buy Status Symbols). |
| `classStore.js` | **Specialization system**: at Level 3, player picks one permanent specialization — Εκτελεστής (+10% combat), Χάκερ (instant crime completion, 24h cooldown), Επιχειρηματίας (+10% company income & dividends). |
| `prestigeStore.js` | Prestige/ascension tracking for endgame progression. |
| `volunteerStore.js` | **Volunteering system**: 5 social actions (1h cooldown, −30 Energy, +Filotimo/Happiness). Charitable donation (−€1,000, +10 Filotimo). |
| `encounterStore.js` | **Random encounters**: 5% chance after crime/gym. Moral dilemma with 3 choices (Help/Ignore/Steal). Each has different Filotimo/cash/energy effects. |
| `bossStore.js` | **World Boss (Ριφιφί)**: global cooperative event. Boss has 1,000,000 HP. Each attack costs 25 Energy. Proportional €5M reward distribution. Top damager gets €500K bonus. Live damage leaderboard. |
| `racingStore.js` | Racing/vehicle system. Tracks wins, best times, racing stats. |

---

## Engine (`src/engine/`)

| File | Role |
|------|------|
| `formulas.js` | **All game math**: `rollD6()`, `calculateCrimeSuccess()`, `calculateCrimeReward()`, `calculateJailTime()`, `rollItemDrop()`, `resolveCombat()` (with status effects Burn/Bleed/Stun), `calculateStatGain()`, `calculateHospitalTime()`, `calculateEscapeChance()`, `calculateBribeCost()`, `xpForLevel()` |

---

## Data (`src/data/`)

Static game data. Import and read — never mutate at runtime.

| File | Contents |
|------|----------|
| `constants.js` | Global tuning constants: regen rates, resource maximums, cooldowns, save key/version |
| `crimes.js` | 8 crimes with nerveCost, duration, rewards, jailChance, relevant stat, tier |
| `exercises.js` | 20 gym exercises (5 per stat). Level requirement, duration, energyCost, multiplier |
| `gyms.js` | 5 gym tiers unlocked by totalStats threshold |
| `items.js` | All items with id, name, type, effect, `onUse()` callback, rarity, icon |
| `npcs.js` | Combat NPCs with level, stats, HP, weapon, rewards |
| `jobs.js` | Legal jobs with pay, requirements, happiness bonus, passive bonus type |
| `properties.js` | Purchasable properties with cost and passive daily income |
| `locations.js` | 7 Greek cities with travel time and bonus multipliers (crime/shop/gym) |
| `courses.js` | Education courses grouped by category, prerequisites, stat bonuses on completion |
| `casino.js` | 5 casino games with winChance, payout multiplier, min/max bet |
| `stocks.js` | 8 fictional Greek companies: basePrice, volatility, dividendRate, sector |
| `achievements.js` | All achievements with id, name, icon, description, check condition, reward |
| `missions.js` | Mission templates grouped by type. `getRandomMissions(3)` returns daily missions |
| `factions.js` | Faction data: id, name, icon, description, bonus effects, fortress building definitions |
| `dailyRewards.js` | Street Box loot tables: Common/Rare/Legendary item pools, cash streak scaling |
| `racing.js` | Racing courses with difficulty, distance, time limits, rewards |
| `fakeUsers.js` | Pre-generated NPC player profiles for bounty system, bazaar sellers, faction members |
| `fakeAds.js` | Fake advertisement banners for immersion |
| `cityExplorationEvents.js` | Weighted random city events triggered during navigation |
| `contraband.js` | Smuggling goods: buy/sell prices per city, rarity, arrest risk, price refresh cycle. `dirtyMoneyOnly` flag on counterfeit_euros & ancient_artifacts. |
| `recipes.js` | 10 crafting recipes: required materials, output item, quality dice multiplier range |
| `pets.js` | 8 pet definitions: name, icon, bonus type, bonus per level, care requirements |
| `weeklyEvents.js` | 9 weekly event definitions with multipliers and affected systems |
| `vehicles.js` | **NEW** — 4 smuggling vehicles (Παπάκι/Βαν/Φορτηγό/Ταχύπλοο) with price, cargoBonus, avoidance, unlockLevel. `SEA_ROUTE_CITIES` constant. `getVehicleById()` helper. |
| `heists.js` | **NEW** — `HEIST_TARGETS` (Εθνική Τράπεζα, Μουσείο Ακρόπολης) and `HEIST_ROLES` (Χάκερ/Εκτελεστής/Επιχειρηματίας). Helper functions `getHeistTargetById()`, `getHeistRoleById()`. |

---

## Views (`src/views/`)

One Vue component per page/route.

### Authentication & Setup Views

| View | Route | Description |
|------|-------|-------------|
| `AuthView.vue` | `/auth` | Supabase login / registration form, password reset. Redirects to `/` after auth. |
| `CharacterCreateView.vue` | `/create` | Name input + stat allocation (10 points), starts new game |

### Main Game Views

| View | Route | Description |
|------|-------|-------------|
| `HomeView.vue` | `/` | Dashboard: resource bars, quick-action grid, activity log, weekly event display, status display |
| `ProfileView.vue` | `/profile` | Full stats display, rank, XP bar, specialization badge, activity history |
| `PublicProfileView.vue` | `/profile/:id` | View another player's public profile (stats, level, faction) |
| `SettingsView.vue` | `/settings` | Export/import/delete save, game info, credits |

### Action & Activity Views

| View | Route | Description |
|------|-------|-------------|
| `CrimeView.vue` | `/crimes` | Crime list with success%, nerve cost, duration. Hacker instant-complete button with cooldown. Dice roll on completion. |
| `GymView.vue` | `/gym` | Stat tabs → exercise cards. Dice roll = multiplier on stat gain (1→×0.5, 6→×2.0). Weekly Gym Rush event support. |
| `CombatView.vue` | `/combat` | NPC list + PvP tab with real players. Turn-by-turn log, status effects display, result card. |
| `JobView.vue` | `/job` | Job list, select job, collect daily pay (24h cooldown), passive bonus display |
| `TravelView.vue` | `/travel` | City list with travel time and bonuses, travel activity card, smuggling checkpoint on arrival |
| `EducationView.vue` | `/education` | Category tabs, course cards with prerequisites, enrollment, completion tracking |
| `SmugglingView.vue` | `/smuggling` | Two tabs: **Λαθρεμπόριο** (buy/sell contraband, price table, vehicle management) and **Μαυραγορίτης** (black market dealer: premium items for dirty money, location timer). `/black-market` redirects here. |
| `WorkshopView.vue` | `/workshop` | Crafting interface: 10 recipes, material inventory, quality dice roll after craft |

### Economy & Market Views

| View | Route | Description |
|------|-------|-------------|
| `CasinoView.vue` | `/casino` | 5 game cards with bet controls, instant play, dice animation |
| `StockView.vue` | `/stocks` | Stock list with mini SVG price charts, buy/sell controls, portfolio summary, Insider Trading perk support |
| `PropertyView.vue` | `/property` | Property list, buy/sell, collect passive income |
| `InventoryView.vue` | `/inventory` | Grid of owned items with quantity, use button, crafted item quality display |
| `BazaarView.vue` | `/bazaar` | Player-to-player marketplace. Browse and purchase items. |
| `ShopView.vue` | `/shop` | Two tabs: Μαρκετ (legal items, −10% discount if Filotimo ≥ 100) and Μαύρη Αγορά (weapons/drugs). **Μαυραγορίτης** section gated by `player.hasLowFilotimo` (Filotimo = 0) with 3 exclusive contracts. |
| `BlackMarketView.vue` | `/black-market` | ~~Removed~~ — redirects to `/smuggling` (Μαυραγορίτης tab) |
| `CompanyView.vue` | `/company` | Found/manage businesses, level up, hire employees, collect income, dirty money laundering (Elite) |
| `AuctionHouseView.vue` | `/auction` | Live auction listings, place bids, list own items, anti-snipe timer, NPC bidders |
| `LoanSharkView.vue` | `/loan` | Borrow money across 4 tiers, view active loan, repay, interest countdown |
| `LuckyKioskView.vue` | `/kiosk` | Buy card packs (Basic/Rare/Legendary), view collection, equip up to 3 cards |

### Hospital & Jail Views

| View | Route | Description |
|------|-------|-------------|
| `HospitalView.vue` | `/hospital` | Own countdown timer + use medical items. View all hospitalized real players. Blood donation (−50 HP, +25 Filotimo, Medical Badge 24h). **Τηλέφωνο από Ψηλά**: spend 10 Μέσον to exit hospital instantly (cooldown 24h). |
| `JailView.vue` | `/jail` | Own countdown timer, escape attempt (DEX + Meson), bribe option. View all jailed real players. Bail out (€) or bust attempt (5 Meson, need 5–6 on d6, +10 Filotimo). |

### Social & Community Views

| View | Route | Description |
|------|-------|-------------|
| `AchievementsView.vue` | `/achievements` | Achievement list, progress display, reward claims |
| `MissionsView.vue` | `/missions` | Active daily missions, progress tracking, reward claims |
| `FactionView.vue` | `/faction` | Two tabs: **Συμμορία** (join/leave faction, member list, bonuses) and **Ψάξε** (fortress: 4 upgradeable buildings, treasury donations, contribution points). `/faction-fortress` redirects here. |
| `BountyView.vue` | `/bounty` | Bounty list on NPCs and real players, difficulty info, rewards, accept bounty |
| `DailyRewardView.vue` | `/daily-reward` | Street Box unboxing: open once per 24h, animated reveal, streak counter, cash bonus |
| `LeaderboardView.vue` | `/leaderboard` | Real player rankings from Supabase by wealth, level, combat wins, crime stats |
| `ForumsView.vue` | `/forums` | Player forums |
| `MessagesView.vue` | `/messages` | Private messaging system |
| `FriendsView.vue` | `/friends` | Friends list, send/accept/reject requests, search players by username |
| `NewspaperView.vue` | `/newspaper` | In-game news: recent battles, crimes, server stats, player activity log |
| `KontresView.vue` | `/kontres` | Player-vs-player encounters/duels |

### Progression & Special Views

| View | Route | Description |
|------|-------|-------------|
| `TerritoryView.vue` | `/territory` | 7-city grid showing controlling faction, siege countdown, Πολιορκία button (officer/leader only), combined STR+DEF power bar. Realtime updates. `allowIncapacitated: true`. |
| `HeistView.vue` | `/heist` | Two top-level tabs: **Ομαδικό Ριφιφί** (browse/create/history lobbies, active lobby view) and **World Boss** (global cooperative raid, damage leaderboard). `/world-boss` redirects here. `allowIncapacitated: false`. |
| `PetView.vue` | `/pets` | Pet management: adopt, feed, play, train, view bonuses, level progress |
| `EliteMenu.vue` | `/elite` | Elite Ascension hub (Level 30+): Shadow Control, Networking Tree, Political Influence, Legal Fronts |
| `PrestigeView.vue` | `/prestige` | Prestige/ascension system display |
| `MasteryView.vue` | `/mastery` | Mastery progression tracking |
| `Volunteering.vue` | `/volunteer` | 5 social actions (1h cooldown), charitable donation, Filotimo/Happiness rewards |

---

## Components (`src/components/`)

### Layout Components (`src/components/layout/`)

| Component | Role |
|-----------|------|
| `NavBar.vue` | Side nav on desktop, bottom bar + overflow menu on mobile |
| `StatusBar.vue` | Top bar: HP/energy/nerve/happiness bars, cash display, dirty money display, `ActivityTimer` |

### UI Components (`src/components/ui/`)

| Component | Role |
|-----------|------|
| `DiceRoll.vue` | Dice roll overlay. Two modes: `check` (crimes) — success/fail; `multiplier` (gym/crafting) — ×0.5–×2.0. Pre-determined result (anti-cheat). |
| `ActivityTimer.vue` | Compact bar in StatusBar while activity is in progress. Countdown + progress bar. |
| `ResourceBar.vue` | Reusable labeled progress bar for HP/energy/nerve/happiness |
| `ToastNotification.vue` | Toast notifications (top-right, auto-dismiss 3s, max 5 visible) |
| `ComingSoon.vue` | Placeholder for features under development |

### Standalone Components

| Component | Role |
|-----------|------|
| `RandomEncounter.vue` | Modal for random moral dilemma events (5% chance after crime/gym). 3 choices with different outcomes. |
| `SpecializationModal.vue` | Level 3 specialization selection modal. One-time permanent choice (Εκτελεστής/Χάκερ/Επιχειρηματίας). |
| `WorldBoss.vue` | World boss attack widget — used in `HeistView.vue` (World Boss tab) |

### Casino Components (`src/components/casino/`)

| Component | Role |
|-----------|------|
| `BlackjackGame.vue` | Blackjack game implementation |
| `SlotsGame.vue` | Slots machine game |
| `KenoGame.vue` | Keno lottery game |

### Combat Components (`src/components/combat/`)

| Component | Role |
|-----------|------|
| `CombatArena.vue` | Main combat display: health bars, turn-by-turn log, status effects, result summary |
| `BattleEquipPopup.vue` | Equipment selection popup during combat |

---

## Composables (`src/composables/`)

| File | Role |
|------|------|
| `useNavBadges.js` | Reactive badge counts for nav items (pending results, unread messages, active bounties, etc.) |

---

## Styles (`src/styles/`)

| File | Role |
|------|------|
| `variables.css` | CSS custom properties: colors, spacing, typography, border radius, transitions |
| `reset.css` | Minimal CSS reset |
| `base.css` | Body defaults, scrollbar styling, utility classes |
| `components.css` | Shared component styles: `.card`, `.btn`, `.badge`, `.bar-track/.bar-fill`, `.grid`, `.tabs` |
| `animations.css` | Global keyframe animations: spin, pulse, fadeIn, slideIn, diceRoll, unboxing, etc. |
| `responsive.css` | Breakpoints: mobile-first, tablet 768px, desktop 1024px, large 1400px |

---

## Lib (`src/lib/`)

| File | Role |
|------|------|
| `supabaseClient.js` | Supabase client singleton using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |

---

## Utils (`src/utils/`)

| File | Role |
|------|------|
| `combatSession.js` | sessionStorage utilities for combat interruption detection. Prevents cheating by closing tabs mid-fight. |

---

## SQL Files (Supabase Schema)

| File | Purpose |
|------|---------|
| `supabase_profiles_schema.sql` | Base profiles table schema (id, username, save_data JSONB, created_at) |
| `supabase_add_save_data_column.sql` | Migration: adds `save_data` JSONB column to profiles |
| `supabase_add_missing_columns.sql` | Migration: adds any missing columns to profiles table |
| `supabase_clean.sql` | Cleanup script: drops and recreates tables for fresh setup |
| `supabase_comprehensive_schema_fix.sql` | Comprehensive schema repair: RLS policies, indexes, constraints |
| `supabase_pvp_policy.sql` | RLS policy: allows authenticated users to read all profiles for PvP |
| `supabase_friends_and_pvp_fix.sql` | Creates `friends` table + `friends_with_profiles` view + open SELECT policy on profiles for PvP/search |
| `supabase_attack_logs.sql` | Creates `attack_logs` table for PvP battle history |
| `supabase_territory_heist_schema.sql` | **NEW** — Creates `territory_control`, `siege_participants`, `heist_lobbies`, `heist_members` tables with RLS policies. Seeds 7 neutral city rows. **Must enable Realtime** for territory_control, heist_lobbies, heist_members in Supabase dashboard. |

---

## Miscellaneous

| File | Purpose |
|------|---------|
| `README.md` | Full game documentation in Greek: mechanics, systems, changelog |
| `codemap.md` | This file — developer reference for all files and their roles |
| `.env` | Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `.github/workflows/deploy.yml` | GitHub Actions: auto-deploy to GitHub Pages on push to main |
| `push.ps1` | PowerShell script for git push operations |

---

## Key Patterns

### Activity System
One activity at a time (`playerStore.activeActivity`). Result pre-rolled at start (`preRolled`) — prevents save-scumming. Timer expires → `pendingResult` set → player manually rolls dice → rewards/penalties applied → `clearPendingResult()`.

**Flow**: User clicks action → deduct resources, pre-roll d6, start timer → timer completes, `pendingResult` set → user navigates to view → dice animation, user clicks "Σταμάτα!" → `applyResult()` → `clearPendingResult()`.

### Dice System (d6)
`rollD6(rate)` maps 0–1 probability to a d6 target. Outcome determined by exact probability, then a matching d6 face is chosen for visual consistency.
- **Crimes**: success/fail check
- **Gym / Crafting**: multiplier (×0.5 to ×2.0)

### Dirty Money Flow
Smuggling earnings → dirty money → spend at Μαυραγορίτης OR launder via company (70% conversion to clean cash) → spend on Status Symbols (Elite Ascension).

### Reactivity for Timers
`lastTick` in playerStore updated every rAF frame. Getters `activityTimeRemaining`, `activityProgress`, `statusTimeRemaining` reference `lastTick` so Pinia recomputes them live.

### Save/Load System
`gameStore.saveGame()` calls `getSerializable()` on all stores → writes to localStorage. `loadGame()` calls `hydrate(data)` on each. `SAVE_VERSION = 1`. Supports offline progress (up to 24h). Supabase `profiles.save_data` JSONB mirrors localStorage for cloud backup.

### Real Player Integration (Supabase)
- PvP, bounties, jail/hospital views, leaderboard, and friends all use real player data from Supabase `profiles` table.
- `playersStore` fetches and caches profiles. `pvpStore` handles async battles against real opponents.
- `friends` table + `friends_with_profiles` view handle friend requests and status.
- Players in hospital/jail are shown as unavailable for PvP.

### Weekly Events
`weeklyEventStore` determines the current event based on ISO week number. Events apply multipliers globally (XP, crime rewards, gym gains, etc.). Active event displayed on HomeView and EventsHub.

### Specialization System
At Level 3, `SpecializationModal` appears once. Choice stored in `classStore`. Εκτελεστής buffs apply in `combatStore`/`bossStore`. Χάκερ button appears in `CrimeView`. Επιχειρηματίας multiplier applied in `companyStore`/`stockStore`.

### Faction Fortress
`factionStore` tracks fortress building levels. Buildings upgraded by leader/officers using faction treasury. Bonuses (gym gains, company income, nerve max, crime success, daily Filotimo) applied automatically to all members.

### Territory Tax Flow
`territoryStore.calculateTaxOnPurchase(cityId, amount)` called in `inventoryStore.buyItem()` and `travelStore.startTravel()`. Tax = 2% if city has a controlling faction. Only deposited to the local player's faction vault (client-authoritative). Territories fetched from Supabase on `loadGame()` and updated via Realtime channel `territory_changes`.

### Vehicle Avoidance (Smuggling)
`smugglingStore.checkpointRisk` = `rawRisk * (1 - vehicleAvoidance)`. `effectiveMaxCargoSlots` = base 10 + vehicle.cargoBonus. `checkVehicleOnArrival(cityId)` called in `travelStore.arriveAtDestination()` — auto-unequips Ταχύπλοο on mainland cities.

### Τηλέφωνο από Ψηλά (Cultural Stats)
`playerStore.useTilefonoApsila()` deducts 10 Μέσον, sets `mesonAbilityCooldowns.tilefonoApsila = Date.now()`. Effect A: if status === 'hospital' → `clearStatus()`, hp = maxHP × 0.5. Effect B: if free → `pvpImmunityEndsAt = Date.now() + 10min`. `pvpStore.attack()` checks `targetImmunityEnd > Date.now()` and aborts with warning. `highFilotimoDiscount` (0.10 if filotimo ≥ 100) applied in `inventoryStore.buyItem()`.

### Group Heist Realtime Flow
`heistStore.createLobby()` inserts row to `heist_lobbies` + self to `heist_members`, subscribes to `heist_${lobbyId}` channel. Other members join via `joinLobby()`. Leader calls `startHeist()` → status = 'active' → Realtime fires on all members → each auto-calls `submitRoll()` (local d6) → leader's watcher calls `_resolveHeist()` once all rolls in → sets status 'completed'/'failed' → `_applyHeistRewards()` on all via Realtime.

### Elite Ascension (Level 30+)
`eliteStore` manages 4 subsystems: Shadow Control (NPC helpers earning passive income), Networking Tree (Meson → permanent perks), Political Influence (Filotimo+cash → city tax income), Legal Fronts (dirty money laundering + Status Symbols).

---

## Development Notes

- **Greek Language**: All UI text, item names, achievement titles in Greek (UTF-8)
- **Capacitor-Compatible**: Hash routing for mobile app support
- **Hybrid Persistence**: localStorage for game state, Supabase for auth + cloud backup
- **Anti-Cheat**: Pre-rolling results, session-storage combat tracking, server-side profile validation
- **Mobile-First CSS**: Responsive from 320px to 1400px+
- **Pinia State Management**: Centralized stores, auto-save every 30s
- **Vue 3 Composition API**: All components use `setup()` with `computed`/`ref`
