<template>
  <nav class="staff-nav">
    <div class="staff-nav-inner">
      <!-- Logo / 品牌 -->
      <NuxtLink to="/staff" class="staff-brand">
        <span class="staff-brand-icon">🌿</span>
        <span class="staff-brand-text">員工專區</span>
      </NuxtLink>

      <!-- 桌機選單 -->
      <ul class="staff-menu">
        <li v-for="item in navItems" :key="item.to">
          <NuxtLink :to="item.to" class="staff-menu-link" :class="{ active: isActive(item.to) }">
            <span class="staff-menu-icon">{{ item.icon }}</span>
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>

      <!-- 暗模式切換 -->
      <button class="staff-dark-btn" @click="toggleDark" :title="isDark ? '切換亮色' : '切換暗色'">
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
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>

    <!-- 手機下拉選單 -->
    <Transition name="mobile-drop">
      <div v-if="isOpen" class="staff-mobile-menu">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="staff-mobile-link"
          :class="{ active: isActive(item.to) }"
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
const route  = useRoute()
const isOpen = ref(false)
const isDark = ref(false)

const navItems = [
  { to: '/staff/quick-links', icon: '🔗', label: '常用網址' },
  { to: '/staff/cash-count',  icon: '💵', label: '點鈔記錄' },
]

const isActive   = (path) => route.path.startsWith(path)
const toggleMenu = () => { isOpen.value = !isOpen.value }

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('staffDark', isDark.value ? '1' : '0')
}

onMounted(() => {
  if (import.meta.client) {
    const saved = localStorage.getItem('staffDark')
    isDark.value = saved !== null ? saved === '1' : document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', isDark.value)
  }
})

watch(() => route.path, () => { isOpen.value = false })
</script>

<style scoped>
.staff-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1px solid #e5e0d8;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  font-family: 'Noto Sans TC', sans-serif;
}
:global(.dark) .staff-nav {
  background: #1c1917;
  border-bottom-color: #44403c;
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
  color: #4a7c59;
  letter-spacing: 0.05em;
}
:global(.dark) .staff-brand-text { color: #6abf85; }

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
  color: #5a5048;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
:global(.dark) .staff-menu-link { color: #d6d3d1; }
.staff-menu-link:hover { background: #f0ece6; color: #2d6a4f; }
:global(.dark) .staff-menu-link:hover { background: #292524; color: #6abf85; }
.staff-menu-link.active { background: #e8f5ee; color: #2d6a4f; font-weight: 600; }
:global(.dark) .staff-menu-link.active { background: #1a3326; color: #6abf85; }
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
  color: #78716c;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}
.staff-dark-btn:hover { background: #f0ece6; color: #2d6a4f; }
:global(.dark) .staff-dark-btn { color: #a8a29e; }
:global(.dark) .staff-dark-btn:hover { background: #292524; color: #fbbf24; }
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
  background: #5a5048;
  border-radius: 2px;
  transition: transform 0.25s, opacity 0.25s;
}
:global(.dark) .staff-hamburger span { background: #d6d3d1; }
.staff-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.staff-hamburger.open span:nth-child(2) { opacity: 0; }
.staff-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* 手機選單 */
.staff-mobile-menu {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #e5e0d8;
  background: #fff;
  padding: 0.5rem 1rem 1rem;
}
:global(.dark) .staff-mobile-menu {
  background: #1c1917;
  border-top-color: #44403c;
}
.staff-mobile-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 0.5rem;
  font-size: 0.9rem;
  color: #5a5048;
  text-decoration: none;
  border-bottom: 1px solid #f0ece6;
}
:global(.dark) .staff-mobile-link { color: #d6d3d1; border-bottom-color: #292524; }
.staff-mobile-link:last-child { border-bottom: none; }
.staff-mobile-link.active { color: #2d6a4f; font-weight: 600; }
:global(.dark) .staff-mobile-link.active { color: #6abf85; }

/* 動畫 */
.mobile-drop-enter-active,
.mobile-drop-leave-active { transition: opacity 0.2s, transform 0.2s; }
.mobile-drop-enter-from,
.mobile-drop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
