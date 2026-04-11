import { createRouter, createWebHashHistory } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'
import { useEventsHubStore } from '../stores/eventsHubStore'

const routes = [
  {
    path: '/create',
    name: 'create',
    component: () => import('../views/CharacterCreateView.vue'),
    meta: { public: true }
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
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { allowIncapacitated: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  // Stores are safe to call here because pinia is installed before router in main.js
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()

  if (!gameStore.initialized && !to.meta.public) {
    return { path: '/create' }
  }

  if (gameStore.initialized && to.path === '/create') {
    return { path: '/' }
  }

  if (gameStore.initialized && playerStore.isIncapacitated && !to.meta.allowIncapacitated) {
    if (playerStore.status === 'hospital') return { path: '/hospital' }
    if (playerStore.status === 'jail') return { path: '/jail' }
  }
})

router.afterEach((to, from) => {
  useEventsHubStore().maybeTriggerExplorationOnNavigate(to.path, from.path)
})

export default router
