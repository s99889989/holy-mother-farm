<template>
  <div class="app-wrapper">
    <button type="button" class="mobile-toggle-btn" title="選單" @click="toggle">☰</button>
    <div v-if="!collapsed" class="mobile-backdrop" @click="toggle" />
    <aside class="sidebar" :class="{ collapsed }">
      <div class="sidebar-header">
        <div class="brand">
          <span class="icon">🕒</span>
          <span class="label-text">員工出勤查詢</span>
        </div>
        <button type="button" class="collapse-toggle" :title="collapsed ? '展開側欄' : '收合側欄'" @click="toggle">
          {{ collapsed ? '»' : '«' }}
        </button>
      </div>

      <div class="sidebar-actions">
        <NuxtLink to="/staff/content/internal-system" class="action-btn" title="返回選單">
          <span class="icon">🏠</span><span class="label-text">返回選單</span>
        </NuxtLink>
        <button class="action-btn logout-btn" title="登出" @click="handleLogout">
          <span class="icon">🚪</span><span class="label-text">登出</span>
        </button>
      </div>

      <NuxtLink to="/staff/content/internal-system/attendance" class="sidebar-link" :class="{ active: route.path === '/staff/content/internal-system/attendance' }" title="出勤查詢">
        <span class="icon">🔍</span><span class="label-text">出勤查詢</span>
      </NuxtLink>
    </aside>

    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { collapsed, toggle } = useInternalSystemSidebarCollapse()

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
  width: 220px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border-light);
  padding: 0 0 12px;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.15s ease;
}

.sidebar.collapsed {
  width: 56px;
}

.sidebar-header,
.sidebar-actions {
  background: #2d3748;
}

html.dark .sidebar-header,
html.dark .sidebar-actions {
  background: #14161a;
}

.sidebar-header {
  padding: 16px 20px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sidebar.collapsed .sidebar-header {
  padding: 16px 8px 10px;
  flex-direction: column;
  gap: 10px;
}

.brand {
  font-size: 18px;
  font-weight: bold;
  color: white;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.collapse-toggle {
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  background: transparent;
  color: white;
  width: 22px;
  height: 22px;
  line-height: 1;
  cursor: pointer;
  font-size: 12px;
}
.collapse-toggle:hover { background: rgba(255,255,255,0.15); }

.sidebar-actions {
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
  text-align: left;
  font-family: inherit;
}
.action-btn:hover { background: rgba(255,255,255,0.12); }

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 16px;
  color: var(--text);
}

.sidebar-link.active,
.sidebar-link:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.icon {
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.sidebar.collapsed .action-btn,
.sidebar.collapsed .sidebar-link {
  justify-content: center;
  padding: 10px 0;
}

.sidebar.collapsed .label-text {
  display: none;
}

.main-content {
  flex: 1;
  padding: 20px;
  min-width: 0;
}

.mobile-toggle-btn {
  display: none;
  position: fixed;
  top: 50px;
  left: 10px;
  z-index: 310;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: rgba(45, 55, 72, 0.55);
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.15s;
}
.mobile-toggle-btn:active { background: rgba(45, 55, 72, 0.8); }
html.dark .mobile-toggle-btn { background: rgba(20, 22, 26, 0.55); }
html.dark .mobile-toggle-btn:active { background: rgba(20, 22, 26, 0.8); }

.mobile-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .mobile-toggle-btn { display: flex; }

  .mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 290;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 300;
    transform: translateX(-100%);
    box-shadow: 2px 0 16px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
  }

  .sidebar:not(.collapsed) {
    transform: translateX(0);
    width: 260px;
  }

  .main-content {
    width: 100%;
    padding: 14px;
  }
}
</style>
