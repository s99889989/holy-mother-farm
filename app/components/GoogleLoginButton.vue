<template>
  <div>
    <!-- 未登入：顯示 Google 登入按鈕 -->
    <div v-if="!customer" class="flex flex-col items-center gap-3">
      <p class="text-sm text-gray-500">登入 Google 帳號可自動填入資料並查詢歷史紀錄</p>
      <div id="google-login-btn"></div>
      <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
    </div>

    <!-- 已登入：顯示帳號資訊 -->
    <div v-else class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl" style="background-color:#eef7f5;">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style="background-color:#5bbfbf;">
          {{ customer.name?.charAt(0) || '?' }}
        </div>
        <div>
          <p class="text-sm font-semibold text-gray-700">{{ customer.name }}</p>
          <p class="text-xs text-gray-400">{{ customer.email }}</p>
        </div>
      </div>
      <button @click="logout" class="text-xs text-gray-400 hover:text-red-400 transition-colors">登出</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/customer')

// Google Client ID — 請換成你的
const GOOGLE_CLIENT_ID = '441605672654-9j73r51g6j2mar17ptblhskfvard1em9.apps.googleusercontent.com'

const customer = ref(null)
const error    = ref('')
const emit = defineEmits(['login', 'logout'])

// 取得目前登入狀態
const fetchMe = async () => {
  try {
    const data = await (await fetch(`${BASE.value}/me`, { credentials: 'include' })).json()
    if (data.error) { customer.value = null; return }
    customer.value = data
    emit('login', data)
  } catch { customer.value = null }
}

// Google callback
const handleCredentialResponse = async (response) => {
  error.value = ''
  try {
    const res = await fetch(`${BASE.value}/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential: response.credential })
    })
    const data = await res.json()
    if (data.error) { error.value = data.error; return }
    customer.value = data
    emit('login', data)
  } catch { error.value = '登入失敗，請再試一次' }
}

const logout = async () => {
  await fetch(`${BASE.value}/logout`, { method: 'POST', credentials: 'include' })
  customer.value = null
  emit('logout')
  // 重新渲染 Google 按鈕
  setTimeout(() => initGoogleBtn(), 100)
}

const initGoogleBtn = () => {
  if (!window.google) return
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
  })
  const el = document.getElementById('google-login-btn')
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

onMounted(async () => {
  await fetchMe()
  if (!customer.value) {
    // 載入 Google Identity Services SDK
    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script')
      script.id  = 'google-gsi-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => initGoogleBtn()
      document.head.appendChild(script)
    } else if (window.google) {
      initGoogleBtn()
    }
  }
})

import { computed } from 'vue'

// 提供給父元件使用
defineExpose({ customer, fetchMe })
</script>
