import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { useGameStore } from './gameStore'
import { usePlayerStore } from './playerStore'
import { useNeighborhoodStore } from './neighborhoodStore'
import { usePetStore } from './petStore'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    session: null,
    initialized: false,
    loading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    // Alias for compatibility with existing code expecting user object
    currentUser: (state) => state.user
  },

  actions: {
    async initializeAuth() {
      if (this.initialized) return

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        this.session = session
        this.user = session?.user ?? null
        this.initialized = true
        console.log('Auth initialized', { user: this.user })

        // Set up auth state change listener — only react to real sign-in/out events,
        // not the INITIAL_SESSION echo (which would double-load the profile).
        supabase.auth.onAuthStateChange((event, session) => {
          console.log('Supabase auth event:', event)
          this.session = session
          this.user = session?.user ?? null

          if (event === 'SIGNED_IN') {
            this.handleNewUserSession()
          }

          if (event === 'SIGNED_OUT') {
            this.clearAuthState()
          }
        })

        // Load profile once from the initial session (not via the listener)
        if (this.user) {
          await this.loadPlayerProfile()
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        this.error = error.message
        this.initialized = true // mark done even on error so router doesn't spin
      }
    },

    async register(email, password, username) {
      this.loading = true
      this.error = null

      try {
        // 1. Sign up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name: username
            }
          }
        })

        if (error) throw error

        // 2. If sign-up successful, we have a user but email may need confirmation
        // For immediate login, we can sign in after sign up
        if (data.user) {
          this.user = data.user
          this.session = data.session

          // 3. Create a full profile record in public.profiles table
          await this.createUserProfile(data.user.id, username, email)

          // 4. Load the profile into playerStore (if session exists)
          if (data.session) {
            await this.loadPlayerProfile()
          }

          // 5. Notify success
          this.showNotification('Επιτυχής εγγραφή!', 'success')
          return { success: true, needsEmailVerification: !data.session }
        }

        return { success: false }
      } catch (error) {
        console.error('Registration error:', error)
        this.error = error.message
        this.showNotification(`Σφάλμα εγγραφής: ${error.message}`, 'danger')
        return { success: false, error }
      } finally {
        this.loading = false
      }
    },

    async login(email, password) {
      this.loading = true
      this.error = null

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        this.user = data.user
        this.session = data.session

        // Load player profile after successful login
        await this.loadPlayerProfile()

        this.showNotification('Επιτυχής σύνδεση!', 'success')
        return { success: true }
      } catch (error) {
        console.error('Login error:', error)
        this.error = error.message
        this.showNotification(`Σφάλμα σύνδεσης: ${error.message}`, 'danger')
        return { success: false, error }
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error

        this.clearAuthState()
        this.showNotification('Αποσυνδεθήκατε', 'info')
        return { success: true }
      } catch (error) {
        console.error('Logout error:', error)
        this.error = error.message
        return { success: false, error }
      }
    },

    async resetProgress() {
      if (!this.user) return { success: false }
      try {
        // Wipe save_data in cloud — Pinia defaults become the new game state
        const { error } = await supabase
          .from('profiles')
          .update({ save_data: null })
          .eq('id', this.user.id)
        if (error) throw error

        const gameStore = useGameStore()
        gameStore.stopGameLoop()
        gameStore.initialized = false
        usePlayerStore().$reset()

        // Reload — loadGame() will return false (no save_data), then setInitialized writes fresh save
        await this.loadPlayerProfile()

        this.showNotification('Η πρόοδος διαγράφηκε. Ξεκινάς από την αρχή!', 'warning')
        return { success: true }
      } catch (err) {
        console.error('resetProgress failed:', err)
        this.showNotification('Σφάλμα κατά την επαναφορά', 'danger')
        return { success: false }
      }
    },

    async createUserProfile(userId, username) {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: userId, username }, { onConflict: 'id' })
        if (error) { console.warn('Profile creation error:', error); return false }
        return true
      } catch (err) {
        console.warn('Profile creation failed:', err); return false
      }
    },

    /**
     * Load save from cloud (single source of truth) and initialize game state.
     */
    async loadPlayerProfile() {
      if (!this.user) return
      const gameStore = useGameStore()
      const playerStore = usePlayerStore()

      // Clear any legacy localStorage game data on this device
      try { localStorage.removeItem('chaos_save_v1') } catch {}

      try {
        const loaded = await gameStore.loadGame()

        if (loaded) {
          // Existing cloud save found — do NOT call saveGame here (would overwrite what we just loaded)
          gameStore.setInitialized(true)
        } else {
          // New account or save_data is null — fetch username from profile row
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', this.user.id)
            .single()
          if (data?.username) playerStore.name = data.username
          // setInitialized() will write the first cloud save for this account
          gameStore.setInitialized()
          // Fetch neighborhoods for new accounts (loadGame() skips this for empty saves)
          const nbStore = useNeighborhoodStore()
          nbStore.fetchNeighborhoods().then(() => nbStore.subscribeRealtime())
        }

        this.showNotification('Καλώς ήρθες!', 'success')
      } catch (error) {
        console.error('Failed to load player profile:', error)

        if (error?.code === 'PGRST116') {
          // Profile row missing — create it, then retry
          console.warn('Profile row missing, creating...')
          const username = this.user.user_metadata?.username || this.user.email?.split('@')[0] || `user_${this.user.id.substring(0, 8)}`
          const created = await this.createUserProfile(this.user.id, username)
          if (created) {
            playerStore.name = username
            gameStore.setInitialized()
          } else {
            console.warn('Profile creation failed — signing out')
            await supabase.auth.signOut()
          }
        } else {
          this.showNotification('Σφάλμα φόρτωσης προφίλ', 'danger')
        }
      }
    },

    handleNewUserSession() {
      console.log('New user session:', this.user)
      const gameStore = useGameStore()
      if (!gameStore.initialized) {
        this.loadPlayerProfile()
      }
    },

    clearAuthState() {
      this.user = null
      this.session = null
      // Clear legacy localStorage game data
      try { localStorage.removeItem('chaos_save_v1') } catch {}
      // Reset game
      const gameStore = useGameStore()
      gameStore.stopGameLoop()
      gameStore.initialized = false
      usePlayerStore().$reset()
      // Reset stores that hold per-user data not covered by save_data hydration
      const neighborhoodStore = useNeighborhoodStore()
      neighborhoodStore.unsubscribeRealtime()
      neighborhoodStore.$reset()
      usePetStore().$reset()
    },

    showNotification(message, type = 'info') {
      const gameStore = useGameStore()
      if (gameStore && typeof gameStore.addNotification === 'function') {
        gameStore.addNotification(message, type)
      } else {
        console.log(`[${type}] ${message}`)
      }
    }
  }
})