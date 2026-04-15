import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './authStore'

export const useFriendStore = defineStore('friends', {
  state: () => ({
    friends: [],         // accepted rows where current user is either side
    incoming: [],        // pending rows where current user is friend_id (recipient)
    outgoing: [],        // pending rows where current user is user_id (requester)
    loading: false,
    error: null,
  }),

  getters: {
    pendingCount: (state) => state.incoming.length,

    // Set of user UUIDs the player already has any relationship with
    relatedIds(state) {
      const auth = useAuthStore()
      const me = auth.user?.id
      if (!me) return new Set()
      const ids = new Set()
      for (const r of [...state.friends, ...state.incoming, ...state.outgoing]) {
        ids.add(r.user_id)
        ids.add(r.friend_id)
      }
      ids.delete(me)
      return ids
    },
  },

  actions: {
    async fetchFriends() {
      const auth = useAuthStore()
      if (!auth.user) return
      this.loading = true
      this.error = null
      try {
        const { data, error } = await supabase
          .from('friends_with_profiles')
          .select('*')
        if (error) throw error

        const me = auth.user.id
        this.friends  = data.filter(r => r.status === 'accepted')
        this.incoming = data.filter(r => r.status === 'pending' && r.friend_id === me)
        this.outgoing = data.filter(r => r.status === 'pending' && r.user_id  === me)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async sendRequest(targetUserId) {
      const auth = useAuthStore()
      if (!auth.user) return { ok: false, message: 'Δεν είσαι συνδεδεμένος.' }
      const me = auth.user.id
      if (me === targetUserId) return { ok: false, message: 'Δεν μπορείς να στείλεις αίτημα στον εαυτό σου.' }

      const { error } = await supabase
        .from('friends')
        .insert({ user_id: me, friend_id: targetUserId, status: 'pending' })

      if (error) {
        // unique violation → already exists
        if (error.code === '23505') return { ok: false, message: 'Υπάρχει ήδη σχέση με αυτόν τον παίκτη.' }
        return { ok: false, message: error.message }
      }
      await this.fetchFriends()
      return { ok: true }
    },

    async acceptRequest(requestId) {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId)

      if (error) return { ok: false, message: error.message }
      await this.fetchFriends()
      return { ok: true }
    },

    async declineRequest(requestId) {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId)

      if (error) return { ok: false, message: error.message }
      await this.fetchFriends()
      return { ok: true }
    },

    async removeFriend(requestId) {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId)

      if (error) return { ok: false, message: error.message }
      await this.fetchFriends()
      return { ok: true }
    },
  },
})
