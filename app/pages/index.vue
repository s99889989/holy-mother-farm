<script setup>
import { useCustomerStore } from '~/stores/customer.js'
import { usePermissionStore } from '~/stores/permission.js'
import { useCommonStore } from '~/stores/common.js'

definePageMeta({ layout: 'loginl' })
useSiteHead({
  title: '聖母農莊管理系統',
  description: '員工專區',
  ogTitle: '聖母農莊管理系統',
  ogDescription: '員工專區',
  ogImage: 'https://holymotherfarm.netlify.app/images/home/index_og.jpg',
  twitterImage: 'https://holymotherfarm.netlify.app/images/home/index_og.jpg'
})
const commonStore = useCommonStore()
const customerStore = useCustomerStore()
const permissionStore = usePermissionStore()

const BASE = computed(() => commonStore.data.main_url + '/holy/customer')
const GOOGLE_CLIENT_ID = computed(() => commonStore.data.google_client_id)

onMounted(async () => {
  if (import.meta.client) {
    if (localStorage.getItem('adminDark') === '1') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // 先嘗試自動登入（cookie 還在的話直接進去）
  await fetchMe()

  // 載入 Google GSI script
  if (!document.getElementById('google-gsi-script')) {
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initGoogle()
    document.head.appendChild(script)
  } else {
    // script 已存在，直接 poll 等 window.google ready
    initGoogle()
  }
})

// 帶 retry poll，網路慢時 window.google 可能還沒好
const initGoogle = (attempt = 0) => {
  if (!window.google) {
    if (attempt < 20) setTimeout(() => initGoogle(attempt + 1), 300)
    return
  }
  if (!GOOGLE_CLIENT_ID.value) return
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
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(`${BASE.value}/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({ credential: response.credential }),
    })
    clearTimeout(timer)

    const data = await res.json()
    if (!data.error) {
      customerStore.setCustomer(data)
      await permissionStore.load(data.id, commonStore.data.main_url)
      navigateTo('/staff/home')
    } else {
      error.value = data.error === 'Google token 驗證失敗'
        ? 'Google 驗證失敗，請重新登入'
        : '登入失敗，請再試一次'
    }
  } catch (e) {
    error.value = e.name === 'AbortError'
      ? '連線逾時（15秒），請確認網路後再試'
      : '連線失敗，請確認網路後再試'
  } finally {
    loading.value = false
  }
}

// fetchMe：讀 cookie 自動登入，失敗就靜默留在頁面
const fetchMe = async () => {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(`${BASE.value}/me`, {
      credentials: 'include',
      signal: controller.signal,
    })
    clearTimeout(timer)

    const data = await res.json()
    if (!data.error) {
      customerStore.setCustomer(data)
      await permissionStore.load(data.id, commonStore.data.main_url)
      navigateTo('/staff/home')
    }
  } catch {
    // 未登入或網路問題，靜默留在登入頁
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
        <span class="text-stone-300 dark:text-stone-600 text-sm ml-1">員工登入</span>
      </div>
    </nav>

    <!-- 主體 -->
    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">
        <div class="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div class="p-8">
            <div class="flex items-center gap-2 mb-6">
              <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                員
              </div>
              <div>
                <h2 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm">
                  員工登入
                </h2>
                <p class="text-xs text-stone-400 mt-0.5">
                  Staff Login
                </p>
              </div>
            </div>

            <div class="flex flex-col items-center gap-4">
              <p class="text-sm text-stone-500 dark:text-stone-400 text-center">
                請使用農莊授權的 Google 帳號登入
              </p>

              <div v-if="loading" class="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 py-3">
                <div class="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
                登入中…
              </div>

              <div v-show="!loading" id="google-signin-btn" />

              <p v-if="error" class="text-sm text-red-500 dark:text-red-400 text-center">
                {{ error }}
              </p>
            </div>
          </div>
        </div>

        <p class="text-center text-xs text-stone-400 dark:text-stone-600 mt-5">
          僅限農莊內部員工使用
        </p>
      </div>
    </div>
  </div>
</template>
