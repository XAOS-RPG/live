import { createRouter, createWebHashHistory } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'
import { useEventsHubStore } from '../stores/eventsHubStore'
import { useAuthStore } from '../stores/authStore'

const routes = [
  {
    path: '/auth',
    name: 'auth',
    component: () => import('../views/AuthView.vue'),
    meta: { public: true }
  },
  {
    path: '/create',
    name: 'create',
    component: () => import('../views/CharacterCreateView.vue'),
    meta: { public: false }
  },
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/crimes',
    name: 'crimes',
    component: () => import('../views/CrimeView.vue')
  },
  {
    path: '/gym',
    name: 'gym',
    component: () => import('../views/GymView.vue')
  },
  {
    path: '/combat',
    name: 'combat',
    component: () => import('../views/CombatView.vue')
  },
  {
    path: '/job',
    name: 'job',
    component: () => import('../views/JobView.vue')
  },
  {
    path: '/property',
    name: 'property',
    component: () => import('../views/PropertyView.vue')
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: () => import('../views/InventoryView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/hospital',
    name: 'hospital',
    component: () => import('../views/HospitalView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/jail',
    name: 'jail',
    component: () => import('../views/JailView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/stocks',
    name: 'stocks',
    component: () => import('../views/StockView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/casino',
    name: 'casino',
    component: () => import('../views/CasinoView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/education',
    name: 'education',
    component: () => import('../views/EducationView.vue')
  },
  {
    path: '/travel',
    name: 'travel',
    component: () => import('../views/TravelView.vue')
  },
  {
    path: '/daily',
    name: 'daily',
    component: () => import('../views/DailyRewardView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/achievements',
    name: 'achievements',
    component: () => import('../views/AchievementsView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/missions',
    name: 'missions',
    component: () => import('../views/MissionsView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: () => import('../views/LeaderboardView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/faction',
    name: 'faction',
    component: () => import('../views/FactionView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/events-hub',
    name: 'events-hub',
    component: () => import('../views/NewspaperView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/newspaper',
    redirect: '/events-hub',
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('../views/MessagesView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/kontres',
    name: 'kontres',
    component: () => import('../views/KontresView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/forums',
    name: 'forums',
    component: () => import('../views/ForumsView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/shop',
    name: 'shop',
    component: () => import('../views/ShopView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/bounties',
    name: 'bounties',
    component: () => import('../views/BountyView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/bazaar',
    name: 'bazaar',
    component: () => import('../views/BazaarView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/company',
    name: 'company',
    component: () => import('../views/CompanyView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/masteries',
    name: 'masteries',
    component: () => import('../views/MasteryView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/friends',
    name: 'friends',
    component: () => import('../views/FriendsView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/player/:id',
    name: 'public-profile',
    component: () => import('../views/PublicProfileView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/smuggling',
    name: 'smuggling',
    component: () => import('../views/SmugglingView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/pets',
    name: 'pets',
    component: () => import('../views/PetView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/workshop',
    name: 'workshop',
    component: () => import('../views/WorkshopView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/loans',
    name: 'loans',
    component: () => import('../views/LoanSharkView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/elite',
    name: 'elite',
    component: () => import('../views/EliteMenu.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/prestige',
    redirect: '/elite',
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/lucky-kiosk',
    name: 'lucky-kiosk',
    component: () => import('../views/LuckyKioskView.vue'),
    meta: { allowIncapacitated: true }
  },
  {
    path: '/faction-fortress',
    name: 'faction-fortress',
    component: () => import('../views/FactionFortressView.vue'),
    meta: { allowIncapacitated: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  // Stores are safe to call here because pinia is installed before router in main.js
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const authStore = useAuthStore()

  // Ensure auth store is initialized (sets up session listener)
  if (!authStore.initialized) {
    await authStore.initializeAuth()
  }

  // Public routes (no authentication required)
  const isPublicRoute = to.meta.public === true
  const isAuthRoute = to.path === '/auth'

  // Redirect if user is logged in and trying to access auth page
  if (isAuthRoute && authStore.user) {
    return { path: '/' }
  }

  // Require authentication for non‑public routes
  if (!isPublicRoute && !authStore.user) {
    return { path: '/auth', query: { redirect: to.fullPath } }
  }

  // Legacy game‑initialization logic (only relevant after authentication)
  // If user is authenticated but game not initialized, redirect to character creation
  if (authStore.user && !gameStore.initialized && !isPublicRoute) {
    return { path: '/create' }
  }

  // Prevent access to /create if game already initialized
  if (gameStore.initialized && to.path === '/create') {
    return { path: '/' }
  }

  // If user is not authenticated and tries to access a non‑public route (including /create),
  // the earlier guard will have already redirected to /auth.

  if (gameStore.initialized && playerStore.isIncapacitated && !to.meta.allowIncapacitated) {
    if (playerStore.status === 'hospital') return { path: '/hospital' }
    if (playerStore.status === 'jail') return { path: '/jail' }
  }
})

router.afterEach((to, from) => {
  useEventsHubStore().maybeTriggerExplorationOnNavigate(to.path, from.path)
})

export default router
