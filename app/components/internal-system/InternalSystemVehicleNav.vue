<template>
  <nav class="topnav">
    <div class="topnav-left">
      <NuxtLink to="/staff/content/internal-system/vehicle" class="brand">🚗 公務車管理系統</NuxtLink>
    </div>
    <div class="topnav-right">
      <NuxtLink to="/staff/content/internal-system/vehicle" class="nav-btn">📢 最新消息</NuxtLink>
      <NuxtLink to="/staff/content/internal-system/vehicle/booking" class="nav-btn">🚗 公務車線上申請</NuxtLink>
      <NuxtLink to="/staff/content/internal-system" class="nav-btn">🏠 返回選單</NuxtLink>
      <button class="nav-btn logout-btn" @click="handleLogout">登出</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
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
.topnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: #2d3748;
  color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
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

.logout-btn { font-family: inherit; }
</style>
