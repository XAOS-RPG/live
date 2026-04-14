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

      const col = { level: 'level', wealth: 'cash', stats: 'level', winrate: 'level' }[orderBy] ?? 'level'

      this.loadingLeaderboard = true
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, name, level, stats, cash, bank, vault, filotimo')
          .order(col, { ascending: false })
          .limit(30)

        if (error) throw error
        this.leaderboard = data || []
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
          .select('id, username, name, level, stats, resources, status')
          .neq('id', auth.user.id)
          .gte('level', Math.max(1, (playerLevel ?? 1) - 8))
          .lte('level', (playerLevel ?? 1) + 8)
          .order('level', { ascending: true })
          .limit(30)

        if (error) throw error
        this.targets = (data || []).map(p => ({
          id: p.id,
          uuid: p.id,
          nickname: p.username || p.name || 'Άγνωστος',
          icon: '👤',
          level: p.level ?? 1,
          location: '—',
          stats: p.stats ?? { strength: 5, speed: 5, dexterity: 5, defense: 5 },
          hp: p.resources?.hp?.current ?? 100,
          status: p.status ?? 'free',
        }))
      } catch (e) {
        console.error('Targets fetch error:', e)
      } finally {
        this.loadingTargets = false
      }
    },
  },
})
