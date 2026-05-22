<script setup>
definePageMeta({layout: 'loginl'})

const commonStore = useCommonStore()
const customerStore = useCustomerStore()
const permissionStore = usePermissionStore()

const GOOGLE_CLIENT_ID = computed(() => commonStore.data.google_client_id)
const BASE = computed(() => commonStore.data.main_url + '/holy/customer')

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
    navigateTo('/admin/management/PermissionManagement')
    return
  }

  // 已 Google 登入（store 有資料，同 session）→ 員工首頁
  if (customerStore.isLoggedIn) {
    navigateTo('/staff/home')
    return
  }

  // 嘗試從後端 cookie 恢復登入狀態（重開瀏覽器後仍有效，30 天內）
  try {
    const res = await fetch(`${BASE.value}/me`, {credentials: 'include'})
    if (res.ok) {
      const data = await res.json()
      if (!data.error) {
        customerStore.setCustomer(data)
        await permissionStore.load(data.id, commonStore.data.main_url)
        if (permissionStore.can('staff.home')) {
          navigateTo('/staff/home')
        } else {
          navigateTo('/')
        }
        return
      }
    }
  } catch { /* cookie 不存在或已過期，繼續顯示登入頁 */
  }

  // 動態載入 Google SDK（與 SiteNavbar 相同模式）
  if (!document.getElementById('google-gsi-script')) {
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initGoogle()
    document.head.appendChild(script)
  } else if (window.google) {
    initGoogle()
  }
})

// ── Google 登入 ──────────────────────────────────────────────────
const googleLoading = ref(false)
const googleError = ref('')

const initGoogle = () => {
  if (!window.google || !GOOGLE_CLIENT_ID.value) return
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID.value,
    callback: handleCredential,
    auto_select: false,
  })
  nextTick(() => renderGoogleBtn('google-login-btn'))
}

const renderGoogleBtn = (elId) => {
  if (!window.google) return
  const el = document.getElementById(elId)
  if (!el) return
  window.google.accounts.id.renderButton(el, {
    theme: 'outline', size: 'large', text: 'signin_with',
    locale: 'zh-TW', width: 280,
  })
}

const handleCredential = async (response) => {
  googleLoading.value = true
  googleError.value = ''
  try {
    const res = await fetch(`${BASE.value}/google-login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({credential: response.credential})
    })
    const data = await res.json()
    if (data.error) {
      googleError.value = '登入失敗，請再試一次'
      return
    }
    customerStore.setCustomer(data)
    await permissionStore.load(data.id, commonStore.data.main_url)

    if (permissionStore.can('staff.home')) {
      navigateTo('/staff/home')
    } else {
      navigateTo('/')
    }
  } catch {
    googleError.value = '登入失敗，請再試一次'
  } finally {
    googleLoading.value = false
  }
}

// ── 帳密登入 ─────────────────────────────────────────────────────
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const activeTab = ref('google')

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
      body: {username: username.value, password: password.value},
    })
    if (res.success) {
      localStorage.setItem('holy_auth', 'ok')
      navigateTo('/admin/management/PermissionManagement')
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

// 切換到 Google tab 時重新 render 按鈕
watch(activeTab, (tab) => {
  if (tab === 'google') {
    nextTick(() => renderGoogleBtn('google-login-btn'))
  }
})
</script>

<template>
  <div class="min-h-screen bg-stone-100 dark:bg-zinc-950 transition-colors flex flex-col">

    <!-- Navbar（與 StaffNavbar 同風格） -->
    <nav class="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-2">
      <div class="flex items-center gap-2">
        <img src="/images/global/healthfarm_logo.png" alt="台東聖母健康農莊"
             class="h-7 w-auto dark:brightness-90">
        <span class="font-bold text-stone-700 dark:text-stone-200 text-sm">台東聖母健康農莊</span>
        <span class="text-stone-300 dark:text-stone-600 text-sm ml-1">系統登入</span>
      </div>
    </nav>

    <!-- 主體 -->
    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">

        <!-- 卡片 -->
        <div
          class="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">

          <!-- Tab -->
          <div class="flex border-b border-stone-100 dark:border-stone-700">
            <button
              class="flex-1 py-3 text-sm font-medium transition-colors"
              :class="activeTab === 'google'
                ? 'text-green-700 dark:text-green-400 border-b-2 border-green-700 dark:border-green-400 bg-green-50/50 dark:bg-green-950/20'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'"
              @click="activeTab = 'google'"
            >
              員工 / 會員登入
            </button>
            <button
              class="flex-1 py-3 text-sm font-medium transition-colors"
              :class="activeTab === 'admin'
                ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'"
              @click="activeTab = 'admin'"
            >
              管理員登入
            </button>
          </div>

          <!-- Google 登入 tab -->
          <div v-if="activeTab === 'google'" class="p-8">
            <div class="flex items-center gap-2 mb-6">
              <div
                class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                員
              </div>
              <div>
                <h2 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm">員工 / 會員登入</h2>
                <p class="text-xs text-stone-400 mt-0.5">使用 Google 帳號登入</p>
              </div>
            </div>

            <div class="space-y-4">
              <p class="text-xs text-stone-500 dark:text-stone-400 text-center leading-relaxed">
                使用您的 Google 帳號登入，<br>系統會依照您的身份顯示對應功能。
              </p>

              <div class="flex justify-center min-h-[44px] items-center">
                <div v-if="googleLoading" class="flex items-center gap-2 text-sm text-stone-400">
                  <div class="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"/>
                  登入中…
                </div>
                <!-- Google SDK 在這裡渲染按鈕 -->
                <div v-show="!googleLoading" id="google-login-btn"/>
              </div>

              <p v-if="googleError" class="text-xs text-red-500 dark:text-red-400 text-center">{{ googleError }}</p>
            </div>
          </div>

          <!-- 管理員帳密 tab -->
          <div v-if="activeTab === 'admin'" class="p-8">
            <div class="flex items-center gap-2 mb-6">
              <div
                class="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                管
              </div>
              <div>
                <h2 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm">管理員登入</h2>
                <p class="text-xs text-stone-400 mt-0.5">Admin Login</p>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1.5">帳號</label>
                <input
                  v-model="username" type="text" placeholder="請輸入帳號"
                  class="w-full px-4 py-2.5 rounded-lg border text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 outline-none transition-all"
                  :class="error
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-stone-200 dark:border-stone-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30'"
                  @keydown.enter="login"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1.5">密碼</label>
                <input
                  v-model="password" type="password" placeholder="請輸入密碼"
                  class="w-full px-4 py-2.5 rounded-lg border text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 outline-none transition-all"
                  :class="error
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-stone-200 dark:border-stone-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30'"
                  @keydown.enter="login"
                >
              </div>
              <p v-if="error" class="text-sm text-red-500 dark:text-red-400 text-center">{{ error }}</p>
              <button
                :disabled="loading"
                class="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                @click="login"
              >
                <div v-if="loading"
                     class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                {{ loading ? '登入中…' : '登入' }}
              </button>
            </div>
          </div>

        </div>

        <!-- 回前台 -->
        <div class="text-center mt-5">
          <NuxtLink to="/"
                    class="text-sm text-stone-400 dark:text-stone-500 hover:text-green-600 dark:hover:text-green-400 transition-colors">
            ← 回到農莊網站
          </NuxtLink>
        </div>

      </div>
    </div>
  </div>
</template>
