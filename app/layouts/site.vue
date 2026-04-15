<template>
  <div class="min-h-screen flex flex-col bg-white text-stone-800">

    <!-- ══ 導覽列 ══ -->
    <header
      class="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      :class="scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'"
    >
      <div class="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-20">

        <!-- Logo -->
        <NuxtLink to="/site" class="flex items-center gap-2.5 group">
          <img src="/images/global/healthfarm_logo.png" alt="聖母健康農莊" class="h-10 w-auto" />
          <span
            class="font-bold text-lg leading-tight hidden sm:block transition-colors"
            :class="scrolled ? 'text-green-800' : 'text-white drop-shadow'"
          >
            聖母健康農莊
          </span>
        </NuxtLink>

        <!-- 桌機選單 -->
        <nav class="hidden md:flex items-center gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
            :class="[
              scrolled ? 'text-stone-700 hover:bg-green-50 hover:text-green-800' : 'text-white/90 hover:text-white hover:bg-white/15',
              $route.path === item.to ? (scrolled ? 'bg-green-50 text-green-800' : 'bg-white/20 text-white') : ''
            ]"
          >
            {{ item.label }}
          </NuxtLink>
          <NuxtLink
            to="/site/booking"
            class="ml-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 bg-green-700 text-white hover:bg-green-800 shadow-sm"
          >
            立即訂位
          </NuxtLink>
        </nav>

        <!-- 手機漢堡 -->
        <button
          class="md:hidden p-2 rounded-xl transition-colors"
          :class="scrolled ? 'text-stone-600 hover:bg-stone-100' : 'text-white hover:bg-white/15'"
          @click="mobileOpen = !mobileOpen"
          aria-label="選單"
        >
          <svg v-if="!mobileOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- 手機展開選單 -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="mobileOpen" class="md:hidden bg-white border-b border-stone-100 shadow-lg">
          <nav class="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-green-50 hover:text-green-800 transition-colors"
              :class="$route.path === item.to ? 'bg-green-50 text-green-800' : ''"
              @click="mobileOpen = false"
            >
              {{ item.label }}
            </NuxtLink>
            <NuxtLink
              to="/site/booking"
              class="mt-1 px-4 py-3 rounded-xl text-sm font-semibold bg-green-700 text-white text-center hover:bg-green-800 transition-colors"
              @click="mobileOpen = false"
            >
              立即訂位
            </NuxtLink>
          </nav>
        </div>
      </Transition>
    </header>

    <!-- ══ 主內容 ══ -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- ══ Footer ══ -->
    <footer class="bg-green-950 text-green-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">

        <!-- 品牌 -->
        <div>
          <div class="flex items-center gap-2.5 mb-3">
            <img src="/images/global/healthfarm_logo.png" alt="聖母健康農莊" class="h-9 w-auto opacity-90" />
            <span class="font-bold text-white text-base">聖母健康農莊</span>
          </div>
          <p class="text-sm text-green-300 leading-relaxed">
            台東縣鹿野鄉的有機農場<br>
            提供住宿、餐飲與自然體驗
          </p>
        </div>

        <!-- 快速連結 -->
        <div>
          <h3 class="text-xs font-semibold text-green-400 uppercase tracking-widest mb-4">快速連結</h3>
          <ul class="space-y-2">
            <li v-for="item in navItems" :key="item.to">
              <NuxtLink :to="item.to" class="text-sm text-green-200 hover:text-white transition-colors">
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- 聯絡 -->
        <div>
          <h3 class="text-xs font-semibold text-green-400 uppercase tracking-widest mb-4">聯絡我們</h3>
          <ul class="space-y-2 text-sm text-green-200">
            <li class="flex items-start gap-2">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              台東縣鹿野鄉永安村
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              (089) 000-000
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-green-900 py-4 text-center text-xs text-green-500">
        © {{ new Date().getFullYear() }} 台東聖母健康農莊 · 版權所有
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const scrolled = ref(false)
const mobileOpen = ref(false)

const navItems = [
  { to: '/site', label: '首頁' },
  { to: '/site/about', label: '關於我們' },
  { to: '/site/restaurant', label: '餐廳' },
  { to: '/site/gallery', label: '相片館' },
  { to: '/site/contact', label: '交通資訊' },
]

const handleScroll = () => {
  scrolled.value = window.scrollY > 40
}

onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>
