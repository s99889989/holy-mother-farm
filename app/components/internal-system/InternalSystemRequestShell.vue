<template>
  <div class="app-wrapper">
    <nav class="topnav">
      <div class="topnav-left">
        <NuxtLink to="/staff/content/internal-system/request" class="brand">🔧 維修管理系統</NuxtLink>
      </div>
      <div class="topnav-right">
        <NuxtLink to="/staff/content/internal-system" class="nav-btn">🏠 返回選單</NuxtLink>
        <button class="nav-btn logout-btn" @click="handleLogout">登出</button>
      </div>
    </nav>

    <div class="body-wrapper">
      <aside class="sidebar">
        <NuxtLink to="/staff/content/internal-system/request" class="sidebar-link" :class="{ active: route.path === '/staff/content/internal-system/request' }">
          📋 需求清單
        </NuxtLink>
        <NuxtLink to="/staff/content/internal-system/request/map" class="sidebar-link" :class="{ active: route.path === '/staff/content/internal-system/request/map' }">
          🗺️ 園區地圖
        </NuxtLink>
      </aside>

      <main class="main-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const handleLogout = async () => {
  await $fetch('/api/internal-system/auth/logout', { method: 'POST' }).catch(() => {})
  navigateTo('/staff/content/internal-system/login')
}

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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
  border-radius: var(--radius, 10px);
}

html.dark .topnav {
  background: #14161a;
}

.brand {
  font-size: 18px;
  font-weight: bold;
  color: white;
  letter-spacing: 1px;
  text-decoration: none;
}

.topnav-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.nav-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: transparent;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.logout-btn {
  font-family: inherit;
}

.body-wrapper {
  flex: 1;
  display: flex;
  min-height: 0;
}

.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border-light);
  padding: 12px 0;
  overflow-y: auto;
}

.sidebar-link {
  display: block;
  padding: 10px 20px;
  font-size: 14px;
  color: var(--text);
}

.sidebar-link.active,
.sidebar-link:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.main-content {
  flex: 1;
  padding: 20px;
  min-width: 0;
}
</style>
