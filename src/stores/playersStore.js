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

        // Extract fields from save_data (stored under stores.player)
        const rows = (data || []).map(p => {
          const pd = p.save_data?.stores?.player ?? {}
          return {
            id: p.id,
            username: p.username,
            level: pd.level ?? 1,
            stats: pd.stats ?? {},
            cash: pd.cash ?? 0,
            bank: pd.bank ?? 0,
            vault: pd.vault ?? 0,
            filotimo: pd.filotimo ?? 0,
          }
        })

        rows.sort((a, b) => {
          if (orderBy === 'wealth') return (b.cash + b.bank + b.vault) - (a.cash + a.bank + a.vault)
          if (orderBy === 'stats') {
            const sum = s => (s.strength ?? 0) + (s.speed ?? 0) + (s.dexterity ?? 0) + (s.defense ?? 0)
            return sum(b.stats) - sum(a.stats)
          }
          return (b.level ?? 0) - (a.level ?? 0)
        })
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
