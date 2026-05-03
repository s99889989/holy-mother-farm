<template>
  <nav class="staff-nav bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700">
    <div class="staff-nav-inner">
      <!-- Logo / 品牌 -->
      <NuxtLink to="/staff/home" class="staff-brand">
        <span class="staff-brand-icon">🌿</span>
        <span class="staff-brand-text text-green-700 dark:text-green-400">員工專區</span>
      </NuxtLink>

      <!-- 桌機選單 -->
      <ul class="staff-menu">
        <li v-for="item in navItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="staff-menu-link text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-green-700 dark:hover:text-green-400"
            :class="isActive(item.to)
              ? 'active bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
              : ''"
          >
            <span class="staff-menu-icon">{{ item.icon }}</span>
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>

      <!-- 暗模式切換 -->
      <button
        class="staff-dark-btn text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-green-700 dark:hover:text-yellow-400"
        @click="toggleDark"
        :title="isDark ? '切換亮色' : '切換暗色'"
      >
        <!-- 月亮（目前亮色） -->
        <svg v-if="!isDark" class="staff-dark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
        </svg>
        <!-- 太陽（目前暗色） -->
        <svg v-else class="staff-dark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
        </svg>
      </button>

      <!-- 手機漢堡 -->
      <button class="staff-hamburger" :class="{ open: isOpen }" @click="toggleMenu" aria-label="選單">
        <span class="bg-stone-600 dark:bg-stone-300"></span>
        <span class="bg-stone-600 dark:bg-stone-300"></span>
        <span class="bg-stone-600 dark:bg-stone-300"></span>
      </button>
    </div>

    <!-- 手機下拉選單 -->
    <Transition name="mobile-drop">
      <div v-if="isOpen" class="staff-mobile-menu bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="staff-mobile-link text-stone-600 dark:text-stone-300 border-stone-100 dark:border-stone-800"
          :class="isActive(item.to) ? 'active text-green-700 dark:text-green-400' : ''"
          @click="isOpen = false"
        >
          <span>{{ item.icon }}</span>
          {{ item.label }}
        </NuxtLink>
      </div>
    </Transition>
  </nav>
</template>

<script setup>
const route     = useRoute()
const isOpen    = ref(false)
const darkStore = useDarkModeStore()
const isDark    = computed(() => darkStore.data.dark)

const navItems = [
  { to: '/staff/quick-links', icon: '🔗', label: '常用網址' },
  { to: '/staff/cash-count',  icon: '💵', label: '點鈔記錄' },
  { to: '/staff/booking',     icon: '🪑', label: '訂位記錄' },
  { to: '/staff/calendar',     icon: '🪑', label: '行事曆' },
  { to: '/staff/work-record', icon: '📋', label: '執行記錄', color: 'bg-teal-700', desc: '場租空間工作規劃執行紀錄' },
]

const isActive   = (path) => route.path.startsWith(path)
const toggleMenu = () => { isOpen.value = !isOpen.value }
const toggleDark = () => { darkStore.change_dark_mode() }

watch(() => route.path, () => { isOpen.value = false })
</script>

<style>
.staff-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  font-family: 'Noto Sans TC', sans-serif;
}

.staff-nav-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1rem;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* 品牌 */
.staff-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  flex-shrink: 0;
}
.staff-brand-icon { font-size: 1.25rem; }
.staff-brand-text {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* 桌機選單 */
.staff-menu {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
}
@media (max-width: 640px) {
  .staff-menu { display: none; }
}
.staff-menu-link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  font-size: 0.875rem;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.staff-menu-link.active { font-weight: 600; }
.staff-menu-icon { font-size: 0.9rem; }

/* 暗模式按鈕 */
.staff-dark-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}
.staff-dark-icon { width: 20px; height: 20px; }

/* 漢堡按鈕 */
.staff-hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 6px;
  background: none;
  border: none;
  cursor: pointer;
}
@media (max-width: 640px) {
  .staff-hamburger { display: flex; }
}
.staff-hamburger span {
  display: block;
  height: 2px;
  border-radius: 2px;
  transition: transform 0.25s, opacity 0.25s;
}
.staff-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.staff-hamburger.open span:nth-child(2) { opacity: 0; }
.staff-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* 手機選單 */
.staff-mobile-menu {
  display: flex;
  flex-direction: column;
  border-top: 1px solid;
  padding: 0.5rem 1rem 1rem;
}
.staff-mobile-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 0.5rem;
  font-size: 0.9rem;
  text-decoration: none;
  border-bottom: 1px solid;
}
.staff-mobile-link:last-child { border-bottom: none; }
.staff-mobile-link.active { font-weight: 600; }

/* 動畫 */
.mobile-drop-enter-active,
.mobile-drop-leave-active { transition: opacity 0.2s, transform 0.2s; }
.mobile-drop-enter-from,
.mobile-drop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
