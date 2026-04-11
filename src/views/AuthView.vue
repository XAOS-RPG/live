<template>
  <div class="auth-page">
    <div class="auth-header">
      <h1 class="game-title">ΧΑΟΣ</h1>
      <p class="game-subtitle">Δρόμοι χωρίς κανόνες. Ζωή χωρίς όρια.</p>
    </div>

    <div class="card auth-card">
      <div class="auth-tabs">
        <button
          class="auth-tab"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'"
        >
          Σύνδεση
        </button>
        <button
          class="auth-tab"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
        >
          Εγγραφή
        </button>
      </div>

      <div v-if="mode === 'login'" class="auth-form">
        <h2 class="card-title">Σύνδεση στον ΧΑΟΣ</h2>
        <p class="text-muted mb-md">
          Συνδέσου με το υπάρχον λογαριασμό σου.
        </p>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            v-model="loginForm.email"
            class="input"
            type="email"
            placeholder="your@email.com"
            :disabled="loading"
            @keyup.enter="handleLogin"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Κωδικός</label>
          <input
            v-model="loginForm.password"
            class="input"
            type="password"
            placeholder="••••••••"
            :disabled="loading"
            @keyup.enter="handleLogin"
          />
        </div>

        <button
          class="btn btn-primary btn-block"
          :disabled="!canLogin || loading"
          @click="handleLogin"
        >
          <span v-if="loading">Σύνδεση...</span>
          <span v-else>Σύνδεση</span>
        </button>

        <p v-if="authStore.error" class="text-danger text-center mt-sm">
          {{ authStore.error }}
        </p>
      </div>

      <div v-else class="auth-form">
        <h2 class="card-title">Εγγραφή στον ΧΑΟΣ</h2>
        <p class="text-muted mb-md">
          Δημιούργησε έναν νέο λογαριασμό για να μπεις στο παιχνίδι.
        </p>

        <div class="form-group">
          <label class="form-label">Username / Ψευδώνυμο</label>
          <input
            v-model="registerForm.username"
            class="input"
            type="text"
            placeholder="Το ψευδώνυμό σου"
            :disabled="loading"
            maxlength="20"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            v-model="registerForm.email"
            class="input"
            type="email"
            placeholder="your@email.com"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Κωδικός</label>
          <input
            v-model="registerForm.password"
            class="input"
            type="password"
            placeholder="••••••••"
            :disabled="loading"
          />
          <p class="form-hint text-muted">
            Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">Επιβεβαίωση Κωδικού</label>
          <input
            v-model="registerForm.confirmPassword"
            class="input"
            type="password"
            placeholder="••••••••"
            :disabled="loading"
            @keyup.enter="handleRegister"
          />
        </div>

        <button
          class="btn btn-primary btn-block"
          :disabled="!canRegister || loading"
          @click="handleRegister"
        >
          <span v-if="loading">Δημιουργία λογαριασμού...</span>
          <span v-else>Εγγραφή</span>
        </button>

        <p v-if="authStore.error" class="text-danger text-center mt-sm">
          {{ authStore.error }}
        </p>
      </div>

      <div class="auth-footer">
        <p class="text-muted text-center">
          Με την εγγραφή/σύνδεση αποδέχεσαι τους
          <a href="#" class="link">Όρους Χρήσης</a> και την
          <a href="#" class="link">Πολιτική Απορρήτου</a>.
        </p>
      </div>
    </div>

    <p class="version-text text-muted text-center">v0.1.0 Beta — Online Phase</p>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const mode = ref('login') // 'login' or 'register'
const loading = ref(false)

const loginForm = reactive({
  email: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const canLogin = computed(() => {
  return loginForm.email.trim() && loginForm.password.trim()
})

const canRegister = computed(() => {
  return (
    registerForm.username.trim() &&
    registerForm.email.trim() &&
    registerForm.password.trim() &&
    registerForm.confirmPassword.trim() &&
    registerForm.password.length >= 6 &&
    registerForm.password === registerForm.confirmPassword
  )
})

const handleLogin = async () => {
  if (!canLogin.value) return

  loading.value = true
  const result = await authStore.login(loginForm.email, loginForm.password)
  loading.value = false

  if (result.success) {
    // Router guard will redirect to home automatically
    // but we can also redirect manually
    router.push('/')
  }
}

const handleRegister = async () => {
  if (!canRegister.value) return

  loading.value = true
  const result = await authStore.register(
    registerForm.email,
    registerForm.password,
    registerForm.username
  )
  loading.value = false

  if (result.success) {
    if (result.needsEmailVerification) {
      // Show a message that email verification is required
      authStore.showNotification('Ελέγξτε το email σας για επιβεβαίωση', 'info')
      mode.value = 'login'
    } else {
      // Auto-logged in, redirect
      router.push('/')
    }
  }
}

// Initialize auth when component mounts
onMounted(() => {
  authStore.initializeAuth()
})
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-raised) 100%);
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.game-title {
  font-size: 4rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
}

.game-subtitle {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.auth-tabs {
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.auth-tab {
  flex: 1;
  padding: 0.75rem;
  background: none;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
}

.auth-tab:hover {
  color: var(--color-text);
}

.auth-tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.card-title {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.auth-form .form-group {
  margin-bottom: 1.25rem;
}

.auth-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.version-text {
  margin-top: 2rem;
  font-size: 0.875rem;
}

.link {
  color: var(--color-accent);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>