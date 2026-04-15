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
        <nav class="hidden md:flex items-center">
          <NuxtLink
            v-for="item in navItems" :key="item.to" :to="item.to"
            class="px-3 py-2 font-medium transition-colors text-gray-700 hover:text-teal-600 whitespace-nowrap"
          >{{ item.label }}</NuxtLink>
        </nav>

        <!-- 手機漢堡 -->
        <button
          class="md:hidden ml-auto p-2 rounded text-gray-700"
          @click="mobileOpen = !mobileOpen"
        >
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
            <NuxtLink
              v-for="item in navItems" :key="item.to" :to="item.to"
              class="px-3 py-3 font-medium text-gray-700 hover:text-teal-600 border-b border-gray-50 last:border-0 transition-colors"
              @click="mobileOpen = false"
            >{{ item.label }}</NuxtLink>
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
      <!-- 草地裝飾 -->
      <div style="background-color: #f5f0e8;">
        <img src="/images/global/grass.png" alt="" class="w-full h-auto object-cover" style="max-height: 60px;" />
      </div>

      <!-- 資訊區 -->
      <div style="background-color: #f5f0e8;" class="py-8">
        <div class="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-start gap-6">
          <!-- Logo -->
          <div class="flex-shrink-0">
            <img src="/images/global/healthfarm_logo.png" alt="台東聖母健康農莊" class="h-16 w-auto" />
            <div class="text-xs text-gray-500 mt-1 text-center">TAITUNG ST. MARY'S HEALTH FARM</div>
          </div>
          <!-- 聯絡資訊 -->
          <div class="text-sm text-gray-600 space-y-1">
            <p class="font-medium">財團法人天主教會花蓮教區附設聖母健康農莊</p>
            <p>統編：36726891</p>
            <p>台東市博物館路110號　　089-381382</p>
            <p>營業時間：08:00–17:30（週一—週六）</p>
          </div>
        </div>
      </div>

      <!-- 點點裝飾線 -->
      <div style="background-color: #f5f0e8;">
        <img src="/images/global/bar-green1.png" alt="" class="w-full h-auto" style="max-height: 16px;" />
      </div>

      <!-- 版權區 -->
      <div class="py-4 text-center text-xs text-white" style="background-color: #3a9a8a;">
        Copyright © 2019 台東聖母健康農莊 All Rights Reserved
        版權所有，非經授權，不得轉載本網站內容
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const mobileOpen = ref(false)

const navItems = [
  { to: '/site/news',       label: '最新消息' },
  { to: '/site/about',      label: '關於我們' },
  { to: '/site/product',    label: '產品訂購' },
  { to: '/site/activity',   label: '活動報名' },
  { to: '/site/restaurant', label: '田園餐廳' },
  { to: '/site/cafe',       label: '休憩小舖' },
  { to: '/site/contact',    label: '交通方式' },
]

const handleScroll = () => {}
onMounted(() => {})
onUnmounted(() => {})
</script>
