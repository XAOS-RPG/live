import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './authStore'

export const usePlayersStore = defineStore('players', {
  state: () => ({
    leaderboard: [],   // top players for leaderboard
    targets: [],       // players available as bounty targets
    loadingLeaderboard: false,
    loadingTargets: false,
  }),

  actions: {
    async fetchLeaderboard(orderBy = 'level') {
      const auth = useAuthStore()
      if (!auth.user) return

      this.loadingLeaderboard = true
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, save_data')
          .not('save_data', 'is', null)
          .limit(50)

        if (error) throw error

        // Extract fields from save_data and sort client-side
        const rows = (data || []).map(p => ({
          id: p.id,
          username: p.username,
          level: p.save_data?.level ?? 1,
          stats: p.save_data?.stats ?? {},
          cash: p.save_data?.cash ?? 0,
          bank: p.save_data?.bank ?? 0,
          vault: p.save_data?.vault ?? 0,
          filotimo: p.save_data?.filotimo ?? 0,
        }))

        const col = { level: 'level', wealth: 'cash', stats: 'level', winrate: 'level' }[orderBy] ?? 'level'
        rows.sort((a, b) => (b[col] ?? 0) - (a[col] ?? 0))
        this.leaderboard = rows.slice(0, 30)
      } catch (e) {
        console.error('Leaderboard fetch error:', e)
      } finally {
        this.loadingLeaderboard = false
      }
    },

    async fetchTargets(playerLevel) {
      const auth = useAuthStore()
      if (!auth.user) return

      this.loadingTargets = true
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, save_data')
          .neq('id', auth.user.id)
          .not('save_data', 'is', null)
          .limit(50)

        if (error) throw error

        const lvl = playerLevel ?? 1
        const levelMin = Math.max(1, lvl - 8)
        const levelMax = lvl + 8

        this.targets = (data || [])
          .map(p => ({
            id: p.id,
            uuid: p.id,
            nickname: p.username || 'Άγνωστος',
            icon: '👤',
            level: p.save_data?.level ?? 1,
            location: '—',
            stats: p.save_data?.stats ?? { strength: 5, speed: 5, dexterity: 5, defense: 5 },
            hp: p.save_data?.resources?.hp?.current ?? 100,
            status: p.save_data?.status ?? 'free',
          }))
          .filter(p => p.level >= levelMin && p.level <= levelMax)
          .slice(0, 30)
      } catch (e) {
        console.error('Targets fetch error:', e)
      } finally {
        this.loadingTargets = false
      }
    },
  },
})
