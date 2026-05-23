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
      await navigateTo('/admin/management/PermissionManagement')
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
        body: { username: username.value, password: password.value }
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
</script>

<template>
  <div class="min-h-screen bg-stone-100 dark:bg-zinc-950 transition-colors flex flex-col">
    <!-- Navbar -->
    <nav class="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-2">
      <div class="flex items-center gap-2">
        <img
          src="/images/global/healthfarm_logo.png"
          alt="台東聖母健康農莊"
          class="h-7 w-auto dark:brightness-90"
        >
        <span class="font-bold text-stone-700 dark:text-stone-200 text-sm">台東聖母健康農莊</span>
        <span class="text-stone-300 dark:text-stone-600 text-sm ml-1">系統登入</span>
      </div>
    </nav>

    <!-- 主體 -->
    <div v-if="!loggedIn" class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">
        <!-- 卡片 -->
        <div
          class="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden"
        >
          <div class="p-8">
            <div class="flex items-center gap-2 mb-6">
              <div
                class="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              >
                管
              </div>
              <div>
                <h2 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm">
                  管理員登入
                </h2>
                <p class="text-xs text-stone-400 mt-0.5">
                  Admin Login
                </p>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-1.5">帳號</label>
                <input
                  v-model="username"
                  type="text"
                  placeholder="請輸入帳號"
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
                  v-model="password"
                  type="password"
                  placeholder="請輸入密碼"
                  class="w-full px-4 py-2.5 rounded-lg border text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 outline-none transition-all"
                  :class="error
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-stone-200 dark:border-stone-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30'"
                  @keydown.enter="login"
                >
              </div>
              <p
                v-if="error"
                class="text-sm text-red-500 dark:text-red-400 text-center"
              >
                {{ error }}
              </p>
              <button
                :disabled="loading"
                class="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                @click="login"
              >
                <div
                  v-if="loading"
                  class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                />
                {{ loading ? '登入中…' : '登入' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 回前台 -->
        <div class="text-center mt-5">
          <NuxtLink
            to="/"
            :prefetch="false"
            class="text-sm text-stone-400 dark:text-stone-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            ← 回到農莊網站
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
