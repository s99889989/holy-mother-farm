<template>
  <div class="app-wrapper">
    <nav class="topnav">
      <div class="topnav-left">
        <NuxtLink to="/staff/content/internal-system/calendar" class="brand">📅 聖母行事曆</NuxtLink>
      </div>
      <div class="topnav-right">
        <button
            class="nav-btn theme-toggle"
            type="button"
            :title="colorMode === 'dark' ? '切換為淺色模式' : '切換為深色模式'"
            @click="toggleColorMode"
        >
          <span v-if="colorMode === 'dark'">☀️</span>
          <span v-else>🌙</span>
        </button>
        <NuxtLink v-if="isCalendarRoute" to="/staff/content/internal-system/calendar" class="nav-btn">🏠 返回選單</NuxtLink>
        <NuxtLink v-if="isCalendarRoute" to="/staff/content/internal-system/calendar/add" class="nav-btn">＋ 新增</NuxtLink>
        <button class="nav-btn logout-btn" @click="handleLogout">登出</button>
      </div>
    </nav>

    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { colorMode, toggleColorMode } = useInternalSystemColorMode()

const route = useRoute()
const isCalendarRoute = computed(() => route.path.startsWith('/staff/content/internal-system/calendar'))

const handleLogout = async () => {
  // 清除 cookie 後跳回登入頁
  await $fetch('/api/internal-system/auth/logout', { method: 'POST' }).catch(() => {})
  navigateTo('/staff/content/internal-system/login')
}

// 停留在頁面時，若 logged_in cookie 過期或被清掉，主動跳回登入頁
const loggedIn = useCookie('logged_in')
let cookieCheckTimer: ReturnType<typeof setInterval> | null = null

const checkLoggedIn = () => {
  if (!loggedIn.value) {
    navigateTo('/staff/content/internal-system/login')
  }
}

onMounted(() => {
  cookieCheckTimer = setInterval(checkLoggedIn, 5000)
  document.addEventListener('visibilitychange', checkLoggedIn)
})

onUnmounted(() => {
  if (cookieCheckTimer) clearInterval(cookieCheckTimer)
  document.removeEventListener('visibilitychange', checkLoggedIn)
})
</script>

<style>
/* global reset */
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Microsoft JhengHei', Arial, sans-serif; background: var(--bg); }
a { text-decoration: none; color: inherit; }
</style>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: #2d3748;
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

html.dark .topnav {
  background: #14161a;
}

.brand {
  font-size: 18px;
  font-weight: bold;
  color: white;
  letter-spacing: 1px;
}

.topnav-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.nav-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  background: transparent;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
}
.nav-btn:hover { background: rgba(255,255,255,0.15); }

.theme-toggle {
  font-size: 16px;
  line-height: 1;
  padding: 6px 10px;
}

.logout-btn { font-family: inherit; }

.main-content {
  flex: 1;
  padding: 20px;
}
</style>