<script setup>
import {useCustomerStore} from '~/stores/customer.js'
import {usePermissionStore} from '~/stores/permission.js'
import {useCommonStore} from '~/stores/common.js'

definePageMeta({layout: 'loginl'})

const commonStore = useCommonStore()
const customerStore = useCustomerStore()
const permissionStore = usePermissionStore()

const BASE = computed(() => commonStore.data.main_url + '/holy/customer')
const GOOGLE_CLIENT_ID = computed(() => commonStore.data.google_client_id)

// ── dark mode ────────────────────────────────────────────────────────
onMounted(async () => {
  if (import.meta.client) {
    if (localStorage.getItem('adminDark') === '1') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // 已登入 → 先驗 session，再導向
  await fetchMe()

  // 載入 Google GSI SDK
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

// ── Google 登入 ──────────────────────────────────────────────────────
const initGoogle = () => {
  if (!window.google || !GOOGLE_CLIENT_ID.value) return
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID.value,
    callback: handleCredential,
    auto_select: false,
  })
  const el = document.getElementById('google-signin-btn')
  if (el) {
    window.google.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      locale: 'zh-TW',
      width: 280,
    })
  }
}

const loading = ref(false)
const error = ref('')

const handleCredential = async (response) => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${BASE.value}/google-login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({credential: response.credential}),
    })
    const data = await res.json()
    if (!data.error) {
      customerStore.setCustomer(data)
      await permissionStore.load(data.id, commonStore.data.main_url)
      redirectAfterLogin()
    } else {
      error.value = '登入失敗，請再試一次'
    }
  } catch {
    error.value = '連線失敗，請確認網路後再試'
  } finally {
    loading.value = false
  }
}

const fetchMe = async () => {
  try {
    const data = await (await fetch(`${BASE.value}/me`, {credentials: 'include'})).json()
    if (!data.error) {
      customerStore.setCustomer(data)
      await permissionStore.load(data.id, commonStore.data.main_url)
      redirectAfterLogin()
    }
  } catch {
    // 未登入，留在頁面
  }
}

const redirectAfterLogin = () => {
  const role = customerStore.role
  if (role === 'ADMIN' || role === 'EDITOR') {
    navigateTo('/admin/management/PermissionManagement')
  } else if (role === 'STAFF') {
    navigateTo('/staff/home')
  }
  // CUSTOMER 或其他 role → 留在登入頁（無後台權限）
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
    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">
        <!-- 卡片 -->
        <div
          class="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div class="p-8">
            <!-- 標題 -->
            <div class="flex items-center gap-2 mb-6">
              <div
                class="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
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

            <!-- Google 按鈕區 -->
            <div class="flex flex-col items-center gap-4">
              <p class="text-sm text-stone-500 dark:text-stone-400 text-center">
                請使用授權的 Google 帳號登入
              </p>

              <!-- loading spinner 覆蓋 -->
              <div v-if="loading" class="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 py-3">
                <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
                登入中…
              </div>

              <!-- Google GSI 渲染目標 -->
              <div v-show="!loading" id="google-signin-btn"/>

              <!-- 錯誤訊息 -->
              <p v-if="error" class="text-sm text-red-500 dark:text-red-400 text-center">
                {{ error }}
              </p>
            </div>
          </div>
        </div>

        <!-- 說明文字 -->
        <p class="text-center text-xs text-stone-400 dark:text-stone-600 mt-5">
          僅限農莊內部人員使用
        </p>
      </div>
    </div>
  </div>
</template>
