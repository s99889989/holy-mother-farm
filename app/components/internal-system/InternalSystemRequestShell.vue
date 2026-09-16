<template>
  <div class="app-wrapper">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand">🔧 維修管理系統</div>
        <div class="sidebar-actions">
          <NuxtLink to="/staff/content/internal-system" class="action-btn">🏠 返回選單</NuxtLink>
          <button class="action-btn logout-btn" @click="handleLogout">登出</button>
        </div>
      </div>

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
}

.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border-light);
  padding: 0 0 12px;
  overflow-y: auto;
}

.sidebar-header {
  background: #2d3748;
  padding: 16px 16px 12px;
  margin-bottom: 8px;
}

html.dark .sidebar-header {
  background: #14161a;
}

.brand {
  font-size: 18px;
  font-weight: bold;
  color: white;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  display: block;
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: transparent;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
  text-align: left;
  font-family: inherit;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
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
