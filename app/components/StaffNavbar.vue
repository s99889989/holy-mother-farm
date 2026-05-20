<template>
  <nav class="staff-nav bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700">
    <div class="staff-nav-inner">
      <!-- Logo -->
      <NuxtLink to="/staff/home" class="staff-brand">
        <span class="staff-brand-icon">🌿</span>
        <span class="staff-brand-text text-green-700 dark:text-green-400">員工專區</span>
      </NuxtLink>

      <!-- 桌機選單 -->
      <ul class="staff-menu">
        <li v-for="item in visibleItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="staff-menu-link text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-green-700 dark:hover:text-green-400"
            :class="isActive(item.to) ? 'active bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' : ''"
          >
            <span class="staff-menu-icon">{{ item.icon }}</span>
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>

      <!-- 右側工具列 -->
      <div class="flex items-center gap-1 ml-auto flex-shrink-0">
        <!-- 用戶資訊 -->
        <div v-if="customer" class="relative" @click.stop>
          <button
            class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            @click="menuOpen = !menuOpen"
          >
            <img v-if="customer.picture" :src="customer.picture" class="w-6 h-6 rounded-full object-cover flex-shrink-0">
            <div v-else class="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {{ customer.name?.charAt(0) || '?' }}
            </div>
            <span class="text-xs font-medium hidden sm:block max-w-[80px] truncate">{{ customer.name }}</span>
            <svg class="w-3 h-3 transition-transform" :class="menuOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7"/>
            </svg>
          </button>

          <Transition
            enter-active-class="transition-all duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div v-if="menuOpen" class="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg w-44 p-1">
              <!-- 用戶資訊區 -->
              <div class="px-3 py-2 border-b border-stone-100 dark:border-stone-700 mb-1">
                <p class="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate">{{ customer.name }}</p>
                <p class="text-xs text-stone-400 truncate">{{ customer.email }}</p>
                <p class="text-xs text-green-600 dark:text-green-400 mt-0.5">{{ groupLabel }}</p>
              </div>
              <!-- 個人設定連結 -->
              <NuxtLink
                to="/front/profile/settings"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                @click="menuOpen = false"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                個人設定
              </NuxtLink>
              <!-- 登出 -->
              <button
                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                @click="logout"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                登出
              </button>
            </div>
          </Transition>
        </div>

        <!-- 暗模式 -->
        <button
          class="staff-dark-btn text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-green-700 dark:hover:text-yellow-400"
          :title="isDark ? '切換亮色' : '切換暗色'"
          @click="toggleDark"
        >
          <svg v-if="!isDark" class="staff-dark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
          </svg>
          <svg v-else class="staff-dark-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
          </svg>
        </button>

        <!-- 手機漢堡 -->
        <button
          class="staff-hamburger"
          :class="{ open: isOpen }"
          aria-label="選單"
          @click="toggleMenu"
        >
          <span class="bg-stone-600 dark:bg-stone-300" />
          <span class="bg-stone-600 dark:bg-stone-300" />
          <span class="bg-stone-600 dark:bg-stone-300" />
        </button>
      </div>
    </div>

    <!-- 手機下拉選單 -->
    <Transition name="mobile-drop">
      <div v-if="isOpen" class="staff-mobile-menu bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700">
        <NuxtLink
          v-for="item in visibleItems"
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
const route        = useRoute()
const isOpen       = ref(false)
const menuOpen     = ref(false)
const darkStore    = useDarkModeStore()
const isDark       = computed(() => darkStore.data.dark)
const perm         = usePermission()
const customerStore = useCustomerStore()
const permStore    = usePermissionStore()

const customer  = computed(() => customerStore.customer)
const groupLabel = computed(() => {
  // 顯示目前群組名稱（從 permStore 拿群組 id，這裡僅顯示 id，後續可擴充對照表）
  return ''
})

// 所有可能的選單項目，每項綁定需要的 permission key
const allNavItems = [
  { to: '/staff/home',        icon: '🏠', label: '員工首頁',  key: 'staff.home'        },
  { to: '/staff/quick-links', icon: '🔗', label: '常用網址',  key: 'staff.quick-links' },
  { to: '/staff/cash-count',  icon: '💵', label: '點鈔記錄',  key: 'staff.cash-count'  },
  { to: '/staff/booking',     icon: '🪑', label: '訂位管理',  key: 'staff.booking'     },
  { to: '/staff/calendar',    icon: '📅', label: '行事曆',    key: 'staff.calendar'    },
  { to: '/staff/menu',        icon: '🍽️', label: '每日菜單',  key: 'staff.menu'        },
  { to: '/staff/news',        icon: '📰', label: '消息管理',  key: 'staff.news'        },
  { to: '/staff/product',     icon: '🛍️', label: '商品管理',  key: 'staff.product'     },
  { to: '/staff/image',       icon: '🖼️', label: '圖庫管理',  key: 'staff.image'       },
  { to: '/staff/inventory',   icon: '📦', label: '庫存管理',    key: 'staff.inventory'   },
  { to: '/staff/asset',       icon: '🏷️', label: '財產登記',    key: 'staff.asset'       },
  { to: '/staff/production',  icon: '🌾', label: '產品訂購',    key: 'staff.production'  },
  { to: '/staff/customer',    icon: '👥', label: '客戶管理',    key: 'staff.customer'    },
]

// 只顯示有權限的選單項目
const visibleItems = computed(() =>
  allNavItems.filter(item => perm.can(item.key))
)

const isActive   = path => route.path.startsWith(path)
const toggleMenu = () => { isOpen.value = !isOpen.value }
const toggleDark = () => { darkStore.change_dark_mode() }

const logout = () => {
  customerStore.logout?.()
  usePermissionStore().clear()
  navigateTo('/')
}

// 關閉選單
function onClickOutside() { menuOpen.value = false }
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
watch(() => route.path, () => { isOpen.value = false; menuOpen.value = false })
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1rem;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  gap: 0.2rem;
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
}
.staff-menu::-webkit-scrollbar { display: none; }
@media (max-width: 640px) { .staff-menu { display: none; } }

.staff-menu-link {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.staff-menu-link.active { font-weight: 600; }
.staff-menu-icon { font-size: 0.85rem; }

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
  flex-shrink: 0;
}
@media (max-width: 640px) { .staff-hamburger { display: flex; } }
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
