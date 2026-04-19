<template>
  <div class="min-h-screen flex flex-col" style="background-color: #f5f0e8; font-family: 'Noto Sans TC', sans-serif; font-size: 150%;">

    <!-- ══ 導覽列 ══ -->
    <header class="fixed top-0 inset-x-0 z-50 bg-white shadow-sm" style="font-size: 1.25rem;">
      <!-- 頂部綠色細線 -->
      <div style="height: 5px; background-color: #1FC29C;"></div>
      <div class="max-w-7xl mx-auto px-6 flex items-center h-24 gap-8">

        <!-- Logo -->
        <NuxtLink to="/site" class="flex items-center flex-shrink-0">
          <img src="/images/global/healthfarm_logo.png" alt="台東聖母健康農莊" class="h-16 w-auto" />
        </NuxtLink>

        <!-- 桌機選單 -->
        <nav class="hidden md:flex items-center flex-1">
          <NuxtLink
            v-for="item in navItems" :key="item.to" :to="item.to"
            class="px-3 py-2 font-medium whitespace-nowrap transition-colors"
            style="color: #2a1001; font-size: 19px; font-weight: 500;"
            onmouseover="this.style.color='#f5a21b'"
            onmouseout="this.style.color='#2a1001'"
          >{{ item.label }}</NuxtLink>
        </nav>

        <!-- 頭像下拉（桌機）-->
        <div class="hidden md:block relative flex-shrink-0" ref="avatarRef">

          <!-- 未登入：人形 icon -->
          <button v-if="!customer" @click="toggleAvatar"
                  class="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-teal-400 flex items-center justify-center text-gray-400 hover:text-teal-600 transition-all bg-gray-50">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </button>

          <!-- 已登入：首字母頭像 -->
          <button v-else @click="toggleAvatar"
                  class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm hover:opacity-90 transition-all"
                  style="background-color: #1FC29C;">
            {{ customer.name?.charAt(0)?.toUpperCase() || '?' }}
          </button>

          <!-- 下拉選單 -->
          <Transition
            enter-active-class="transition-all duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="avatarOpen"
                 class="absolute right-0 top-14 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">

              <!-- 已登入：帳號資訊 -->
              <div v-if="customer" class="px-4 py-4 border-b border-gray-50">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                       style="background-color: #1FC29C;">
                    {{ customer.name?.charAt(0)?.toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-800 text-sm truncate">{{ customer.name }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ customer.email }}</p>
                  </div>
                </div>
              </div>

              <!-- 未登入：Google 按鈕 -->
              <div v-else class="px-4 py-4 border-b border-gray-50">
                <p class="text-xs text-gray-500 mb-3">登入後可查看訂位與便當紀錄</p>
                <div id="nav-google-btn"></div>
              </div>

              <!-- 選單項目 -->
              <ul class="py-1" v-if="customer">
                <li>
                  <NuxtLink to="/site/profile" @click="closeAvatar"
                            class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    我的訂位紀錄
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/site/restaurant?tab=booking" @click="closeAvatar"
                            class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    線上訂位
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/site/restaurant?tab=lunch" @click="closeAvatar"
                            class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    便當預訂
                  </NuxtLink>
                </li>
                <li class="border-t border-gray-50 mt-1">
                  <button @click="logout"
                          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    登出
                  </button>
                </li>
              </ul>
            </div>
          </Transition>
        </div>

        <!-- 手機漢堡 -->
        <button class="md:hidden ml-auto p-2 rounded text-gray-700" @click="mobileOpen = !mobileOpen">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!mobileOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- 手機選單 -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="mobileOpen" class="md:hidden bg-white border-b border-gray-100 shadow-lg">
          <nav class="px-4 py-3 flex flex-col">
            <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to"
                      class="px-3 py-3 font-medium text-gray-700 hover:text-teal-600 border-b border-gray-50 last:border-0 transition-colors"
                      @click="mobileOpen = false">{{ item.label }}</NuxtLink>

            <!-- 手機版帳號區 -->
            <div class="pt-3 mt-1 border-t border-gray-100">
              <div v-if="customer" class="px-3 space-y-1">
                <div class="flex items-center gap-3 py-2">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                       style="background-color: #1FC29C;">
                    {{ customer.name?.charAt(0)?.toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-800 truncate">{{ customer.name }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ customer.email }}</p>
                  </div>
                </div>
                <NuxtLink to="/site/profile" @click="mobileOpen = false"
                          class="block px-2 py-2 text-sm text-gray-700 hover:text-teal-600">我的訂位紀錄</NuxtLink>
                <button @click="logout; mobileOpen = false"
                        class="block px-2 py-2 text-sm text-red-500 text-left w-full">登出</button>
              </div>
              <div v-else class="px-3 py-2">
                <p class="text-xs text-gray-500 mb-2">登入後可查看訂位紀錄</p>
                <div id="nav-google-btn-mobile"></div>
              </div>
            </div>
          </nav>
        </div>
      </Transition>
    </header>

    <!-- ══ 主內容 ══ -->
    <main class="flex-1 pt-24">
      <slot />
    </main>

    <!-- ══ Footer ══ -->
    <footer>
      <div style="background-color: #f5f0e8;">
        <img src="/images/global/grass.png" alt="" class="w-full h-auto object-cover" style="max-height: 60px;" />
      </div>
      <div style="background-color: #f5f0e8;" class="py-8">
        <div class="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-start gap-6">
          <div class="flex-shrink-0">
            <img src="/images/global/healthfarm_logo.png" alt="台東聖母健康農莊" class="h-16 w-auto" />
            <div class="text-xs text-gray-500 mt-1 text-center">TAITUNG ST. MARY'S HEALTH FARM</div>
          </div>
          <div class="text-sm text-gray-600 space-y-1">
            <p class="font-medium">財團法人天主教會花蓮教區附設聖母健康農莊</p>
            <p>統編：36726891</p>
            <p>台東市博物館路110號　　089-381382</p>
            <p>營業時間：08:00–17:30（週一—週六）</p>
          </div>
        </div>
      </div>
      <div style="background-color: #f5f0e8;">
        <img src="/images/global/bar-green1.png" alt="" class="w-full h-auto" style="max-height: 16px;" />
      </div>
      <div class="py-4 text-center text-xs text-white" style="background-color: #3a9a8a;">
        Copyright © 2019 台東聖母健康農莊 All Rights Reserved
        版權所有，非經授權，不得轉載本網站內容
      </div>
    </footer>

  </div>
</template>

<script setup>
useHead({
  link: [
    { rel: 'stylesheet', href: 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css' }
  ]
})
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useCommonStore } from '~/stores/common.js'
import { useCustomerStore } from '~/stores/customer.js'

const commonStore   = useCommonStore()
const customerStore = useCustomerStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/customer')

const GOOGLE_CLIENT_ID = computed(() => commonStore.data.google_client_id)

const mobileOpen = ref(false)
const avatarOpen = ref(false)
const avatarRef  = ref(null)

// 用 store 取代本地 customer ref
const customer = computed(() => customerStore.customer)

const navItems = [
  { to: '/site/news',       label: '最新消息' },
  { to: '/site/about',      label: '關於我們' },
  { to: '/site/product',    label: '產品訂購' },
  { to: '/site/activity',   label: '活動報名' },
  { to: '/site/restaurant', label: '田園餐廳' },
  { to: '/site/cafe',       label: '休憩小舖' },
  { to: '/site/contact',    label: '交通方式' },
]

// ── 下拉開關 ──────────────────────────────────────────────────────
const toggleAvatar = () => {
  avatarOpen.value = !avatarOpen.value
  if (avatarOpen.value && !customer.value) {
    nextTick(() => renderGoogleBtn('nav-google-btn'))
  }
}
const closeAvatar = () => { avatarOpen.value = false }

const onClickOutside = (e) => {
  if (avatarRef.value && !avatarRef.value.contains(e.target)) {
    avatarOpen.value = false
  }
}

// ── Google 登入 ───────────────────────────────────────────────────
const initGoogle = () => {
  if (!window.google) return
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID.value,
    callback: handleCredential,
    auto_select: false,
  })
}

const renderGoogleBtn = (elId) => {
  if (!window.google) return
  const el = document.getElementById(elId)
  if (!el) return
  window.google.accounts.id.renderButton(el, {
    theme: 'outline', size: 'medium', text: 'signin_with', locale: 'zh-TW', width: 220,
  })
}

const handleCredential = async (response) => {
  try {
    const res = await fetch(`${BASE.value}/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential: response.credential })
    })
    const data = await res.json()
    if (!data.error) {
      customerStore.setCustomer(data)
      avatarOpen.value = false
    }
  } catch {}
}

const logout = async () => {
  await fetch(`${BASE.value}/logout`, { method: 'POST', credentials: 'include' })
  customerStore.clearCustomer()
  avatarOpen.value = false
}

// ── 取得登入狀態 ──────────────────────────────────────────────────
const fetchMe = async () => {
  try {
    const data = await (await fetch(`${BASE.value}/me`, { credentials: 'include' })).json()
    if (!data.error) customerStore.setCustomer(data)
  } catch {}
}

onMounted(async () => {
  await fetchMe()
  document.addEventListener('click', onClickOutside)

  if (!document.getElementById('google-gsi-script')) {
    const script = document.createElement('script')
    script.id    = 'google-gsi-script'
    script.src   = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initGoogle()
    document.head.appendChild(script)
  } else if (window.google) {
    initGoogle()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>
