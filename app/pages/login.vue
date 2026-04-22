<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- 頂部 header（跟後台頁面一致） -->
    <header class="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div class="flex items-center gap-3">
        <img src="/images/global/healthfarm_logo.png" alt="台東聖母健康農莊" class="h-8 w-auto dark:brightness-90" />
        <div>
          <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">後台管理系統</h1>
          <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Holy Mother Farm Admin</p>
        </div>
      </div>
    </header>

    <!-- 主體 -->
    <div class="flex items-center justify-center px-4 py-16">
      <div class="w-full max-w-sm">

        <!-- Logo -->
        <div class="text-center mb-8">
          <img src="/images/global/healthfarm_logo.png" alt="台東聖母健康農莊" class="h-20 mx-auto mb-3 dark:brightness-90" />
          <p class="text-sm text-gray-500 dark:text-gray-400">後台管理系統</p>
        </div>

        <!-- 卡片 -->
        <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div class="flex items-center gap-2 mb-6">
            <div class="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">登</div>
            <div>
              <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">管理員登入</h1>
              <p class="text-xs text-stone-400 mt-0.5">Admin Login</p>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">帳號</label>
              <input v-model="username" type="text" placeholder="請輸入帳號" @keydown.enter="login"
                     class="w-full px-4 py-3 rounded-xl border text-sm text-gray-800 dark:text-gray-100 dark:bg-zinc-700 outline-none transition-all"
                     :class="error
                       ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                       : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30'" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">密碼</label>
              <input v-model="password" type="password" placeholder="請輸入密碼" @keydown.enter="login"
                     class="w-full px-4 py-3 rounded-xl border text-sm text-gray-800 dark:text-gray-100 dark:bg-zinc-700 outline-none transition-all"
                     :class="error
                       ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                       : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30'" />
            </div>
            <p v-if="error" class="text-sm text-red-500 dark:text-red-400 text-center">{{ error }}</p>
            <button @click="login" :disabled="loading"
                    class="w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 transition-all mt-2 disabled:opacity-60">
              <span v-if="loading" class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                登入中…
              </span>
              <span v-else>登入</span>
            </button>
          </div>
        </div>

        <!-- 回前台 -->
        <div class="text-center mt-5">
          <NuxtLink to="/front" class="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            ← 回到農莊網站
          </NuxtLink>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'admin' })
const commonStore = useCommonStore()
onMounted(() => {
  if (localStorage.getItem('adminDark') === '1') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})

const username = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref('')

const login = async () => {
  if (!username.value || !password.value) {
    error.value = '請輸入帳號和密碼'
    return
  }
  if (loading.value) return

  loading.value = true
  error.value   = ''

  try {
    console.log(`${commonStore.data.main_url}/holy/auth/login`)
    const res = await $fetch(`${commonStore.data.main_url}/holy/auth/login`, {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    console.log('登入: ' + res.success)
    if (res.success) {
      console.log('登入成功 ')
      localStorage.setItem('holy_auth', 'ok')
      // router.push('/management/DailyMenu')
      navigateTo('/admin/QuickLinks')
      return
    } else {
      error.value = '帳號或密碼錯誤，請再試一次'
      password.value = ''
    }
  } catch {
    error.value = '帳號或密碼錯誤，請再試一次!!'
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>
