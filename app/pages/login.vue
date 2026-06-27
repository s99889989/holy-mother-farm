<script setup>
definePageMeta({ layout: 'loginl' })

const commonStore = useCommonStore()

const loggedIn = ref(false)

onMounted(async () => {
  if (import.meta.client) {
    if (localStorage.getItem('adminDark') === '1') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // 已用帳密登入 → 後台
  if (localStorage.getItem('holy_auth')) {
    loggedIn.value = true
    await navigateTo('/admin/permission-management')
    return
  }
})

// ── 帳密登入 ─────────────────────────────────────────────────────
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const login = async () => {
  if (!username.value || !password.value) {
    error.value = '請輸入帳號和密碼'
    return
  }
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch(`${commonStore.data.main_url}/holy/auth/login`, {
      method: 'POST',
      body: {username: username.value, password: password.value}
    })
    if (res.success) {
      localStorage.setItem('holy_auth', 'ok')
      if (res.token) localStorage.setItem('holy_auth_token', res.token)
      navigateTo('/admin/permission-management')
    } else {
      error.value = '帳號或密碼錯誤，請再試一次'
      password.value = ''
    }
  } catch {
    error.value = '帳號或密碼錯誤，請再試一次'
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrapper">
    <!-- Navbar -->
    <nav class="login-nav">
      <div class="login-nav-inner">
        <img
          src="/images/global/healthfarm_logo.png"
          alt="台東聖母健康農莊"
          class="h-7 w-auto dark:brightness-90"
        >
        <span class="login-nav-title">台東聖母健康農莊</span>
        <span class="login-nav-sub">系統登入</span>
      </div>
    </nav>

    <!-- 主體 -->
    <div v-if="!loggedIn" class="login-main">
      <div class="login-card-wrap">
        <!-- 卡片 -->
        <div class="login-card">
          <div class="login-card-body">
            <div class="login-card-header">
              <div class="login-avatar">
                管
              </div>
              <div>
                <h2 class="login-title">
                  管理員登入
                </h2>
                <p class="login-subtitle">
                  Admin Login
                </p>
              </div>
            </div>

            <div class="login-form">
              <div>
                <label class="login-label">帳號</label>
                <input
                  v-model="username"
                  type="text"
                  placeholder="請輸入帳號"
                  class="login-input"
                  :class="{ 'login-input-error': error }"
                  @keydown.enter="login"
                >
              </div>
              <div>
                <label class="login-label">密碼</label>
                <input
                  v-model="password"
                  type="password"
                  placeholder="請輸入密碼"
                  class="login-input"
                  :class="{ 'login-input-error': error }"
                  @keydown.enter="login"
                >
              </div>
              <p v-if="error" class="login-error">
                {{ error }}
              </p>
              <button
                :disabled="loading"
                class="login-btn"
                @click="login"
              >
                <div v-if="loading" class="login-spinner"/>
                {{ loading ? '登入中…' : '登入' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 回前台 -->
        <div class="login-back">
          <NuxtLink to="/" :prefetch="false" class="login-back-link">
            ← 回到農莊網站
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.login-nav {
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  padding: 8px 16px;
}

.login-nav-inner {
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-nav-title {
  font-weight: 700;
  color: var(--text);
  font-size: 14px;
}

.login-nav-sub {
  color: var(--text-hint);
  font-size: 14px;
  margin-left: 4px;
}

.login-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}

.login-card-wrap {
  width: 100%;
  max-width: 384px;
}

.login-card {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.login-card-body {
  padding: 32px;
}

.login-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.login-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.login-title {
  font-weight: 700;
  color: var(--text);
  line-height: 1;
  font-size: 14px;
  margin: 0;
}

.login-subtitle {
  font-size: 12px;
  color: var(--text-hint);
  margin: 2px 0 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.login-input {
  width: 100%;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.login-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-light);
}

.login-input-error {
  border-color: #f87171;
  background: #fef2f2;
}

html.dark .login-input-error {
  border-color: #b91c1c;
  background: rgba(127, 29, 29, 0.2);
}

.login-error {
  font-size: 14px;
  color: #ef4444;
  text-align: center;
  margin: 0;
}

.login-btn {
  width: 100%;
  padding: 10px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: var(--accent);
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-btn:hover {
  opacity: 0.9;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.login-back {
  text-align: center;
  margin-top: 20px;
}

.login-back-link {
  font-size: 14px;
  color: var(--text-hint);
  transition: color 0.2s;
}

.login-back-link:hover {
  color: var(--accent);
}
</style>
