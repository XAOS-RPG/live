import { defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { useGameStore } from './gameStore'
import { usePlayerStore } from './playerStore'
import { RESOURCE_DEFAULTS } from '../data/constants'

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

    async createUserProfile(userId, username, email) {
      const defaultStats = { strength: 5, speed: 5, dexterity: 5, defense: 5 }
      const defaultResources = {
        hp: { current: RESOURCE_DEFAULTS.hp.max, max: RESOURCE_DEFAULTS.hp.max },
        energy: { current: RESOURCE_DEFAULTS.energy.max, max: RESOURCE_DEFAULTS.energy.max },
        nerve: { current: RESOURCE_DEFAULTS.nerve.max, max: RESOURCE_DEFAULTS.nerve.max },
        happiness: { current: 100, max: RESOURCE_DEFAULTS.happiness.max }
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            username,
            name: username,
            gender: 'male',
            level: 1,
            xp: 0,
            cash: 500,
            bank: 0,
            vault: 0,
            filotimo: 50,
            meson: 0,
            crime_xp: 0,
            status: 'free',
            status_timer_end: null,
            stats: defaultStats,
            resources: defaultResources,
            created_at: new Date().toISOString()
          }, { onConflict: 'id' })

        if (error) {
          console.warn('Profile creation error:', error)
          return false // signal failure to caller
        }

        console.log('Profile created successfully')
        return true
      } catch (err) {
        console.warn('Profile creation failed:', err)
        return false
      }
    },

    async loadPlayerProfile() {
      if (!this.user) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', this.user.id)
          .single()

        if (error) throw error

        const gameStore = useGameStore()
        const playerStore = usePlayerStore()

        // Compare cloud save_data timestamp vs localStorage timestamp
        const cloudSave = data.save_data
        const cloudTs = cloudSave?.timestamp || 0

        const { SAVE_KEY, SAVE_VERSION } = await import('../data/constants')
        let localTs = 0
        try {
          const raw = localStorage.getItem(SAVE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.version === SAVE_VERSION) localTs = parsed.timestamp || 0
          }
        } catch {}

        console.log('Player profile loaded:', data)
        console.log(`Cloud ts: ${cloudTs}, Local ts: ${localTs}`)

        if (cloudSave && cloudTs >= localTs) {
          // Cloud is newer (or equal) — load full save from cloud
          console.log('Loading from cloud save (newer)')
          localStorage.setItem(SAVE_KEY, JSON.stringify(cloudSave))
          gameStore.loadGame()
          gameStore.setInitialized(true) // skipSave=true, don't overwrite cloud
        } else if (!cloudSave && localTs > 0) {
          // Cloud has no save but local has data — stale data from another account
          console.log('Clearing stale localStorage (no cloud save for this account)')
          localStorage.removeItem(SAVE_KEY)
          await playerStore.hydrateFromProfile(data)
          if (!gameStore.initialized) gameStore.setInitialized()
        } else if (localTs > cloudTs && localTs > 0) {
          // Local is genuinely newer (same account, played offline)
          console.log('Loading from localStorage (newer)')
          if (!gameStore.initialized) {
            gameStore.loadGame()
            gameStore.setInitialized(true)
          }
        } else {
          // No save anywhere — hydrate from profile basics
          await playerStore.hydrateFromProfile(data)
          if (!gameStore.initialized) gameStore.setInitialized()
        }

        this.showNotification('Προφίλ φορτώθηκε', 'success')
      } catch (error) {
        console.error('Failed to load player profile:', error)

        if (error.code === 'PGRST116') {
          console.warn('Profile missing, creating default...')
          const created = await this.createUserProfile(
            this.user.id,
            this.user.user_metadata?.username || this.user.email,
            this.user.email
          )
          if (created) {
            const { data: retryData, error: retryErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', this.user.id)
              .single()
            if (!retryErr && retryData) {
              const playerStore = usePlayerStore()
              await playerStore.hydrateFromProfile(retryData)
              const gameStore = useGameStore()
              if (!gameStore.initialized) gameStore.setInitialized()
            }
          } else {
            console.warn('Profile creation failed — signing out stale session')
            await supabase.auth.signOut()
          }
        } else {
          this.showNotification('Σφάλμα φόρτωσης προφίλ', 'danger')
        }
      }
    },

    /**
     * Re-sync from cloud when app regains focus (e.g. user switches from mobile to PC).
     * Only loads cloud data if it's strictly newer than local — prevents overwriting
     * in-progress play on this device.
     */
    async syncFromCloud() {
      if (!this.user) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('save_data')
          .eq('id', this.user.id)
          .single()

        if (error || !data?.save_data) return

        const cloudSave = data.save_data
        const cloudTs = cloudSave?.timestamp || 0

        const { SAVE_KEY, SAVE_VERSION } = await import('../data/constants')
        let localTs = 0
        try {
          const raw = localStorage.getItem(SAVE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.version === SAVE_VERSION) localTs = parsed.timestamp || 0
          }
        } catch {}

        // Only load if cloud is STRICTLY newer (not equal — equal means this device saved last)
        if (cloudTs > localTs) {
          console.log(`Cloud sync: cloud is newer (cloud=${cloudTs}, local=${localTs}), reloading`)
          const gameStore = useGameStore()
          localStorage.setItem(SAVE_KEY, JSON.stringify(cloudSave))
          gameStore.loadGame()
          this.showNotification('Συγχρονισμός από cloud', 'info')
        }
      } catch (err) {
        console.warn('syncFromCloud failed:', err)
      }
    },

    handleNewUserSession() {
      console.log('New user session:', this.user)
      // Only load profile if game isn't already initialized (avoids double-load
      // when SIGNED_IN fires right after initializeAuth already loaded it)
      const gameStore = useGameStore()
      if (!gameStore.initialized) {
        this.loadPlayerProfile()
      }
    },

    clearAuthState() {
      this.user = null
      this.session = null

      // Clear localStorage save to prevent stale data leaking to another account
      try {
        localStorage.removeItem('chaos_save_v1')
      } catch {}

      // Reset game initialization flag so next login starts fresh
      const gameStore = useGameStore()
      gameStore.stopGameLoop()
      gameStore.initialized = false

      // Reset player store in memory
      const playerStore = usePlayerStore()
      playerStore.$reset()
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