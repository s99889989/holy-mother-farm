<template>
  <nav class="staff-nav">
    <!-- 桌機 -->
    <div class="hidden lg:flex items-center gap-0.5">
      <!-- Logo -->
      <NuxtLink
        to="/staff/home"
        class="nav-logo flex items-center gap-1 px-2 py-1 mr-1 font-bold text-lg"
      >
        🏠 首頁
      </NuxtLink>

      <!-- 分類 dropdown -->
      <div
        v-for="group in visibleGroups"
        :key="group.label"
        class="relative nav-dropdown-wrap"
      >
        <button
          class="nav-item flex items-center gap-1 px-2 py-1 rounded text-lg font-medium transition-colors whitespace-nowrap"
          :class="activeGroup?.label === group.label ? 'nav-item-active' : 'nav-item-inactive'"
          @click.stop="toggleDrop(group.label)"
        >
          {{ group.label }}
          <svg
            class="w-3 h-3 transition-transform duration-150"
            :class="dropOpen[group.label] ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m19 9-7 7-7-7"
            />
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
          <div
            v-if="dropOpen[group.label]"
            class="nav-dropdown absolute top-full left-0 mt-1 z-50 rounded-lg min-w-[140px]"
          >
            <ul class="p-1.5">
              <li
                v-for="item in group.items"
                :key="item.to"
              >
                <NuxtLink
                  :to="item.to"
                  class="nav-item flex items-center gap-2 px-3 py-1.5 rounded text-lg font-medium transition-colors whitespace-nowrap"
                  :class="route.path.startsWith(item.to) ? 'nav-item-active nav-item-active-bg' : 'nav-item-inactive'"
                >
                  <span v-if="item.icon">{{ item.icon }}</span>{{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </Transition>
      </div>

      <!-- 獨立連結 -->
      <NuxtLink
        v-for="item in visibleStandaloneItems"
        :key="item.to"
        :to="item.to"
        class="nav-item flex items-center gap-1 px-2 py-1 rounded text-lg font-medium transition-colors whitespace-nowrap"
        :class="route.path.startsWith(item.to) ? 'nav-item-active nav-item-active-bg' : 'nav-item-inactive'"
      >
        <span v-if="item.icon">{{ item.icon }}</span>{{ item.label }}
      </NuxtLink>

      <!-- 右側 -->
      <div class="ml-auto flex items-center gap-1">
        <!-- 暗模式 -->
        <button
          class="nav-icon-btn p-1.5 rounded transition-colors"
          :title="isDark ? '切換亮色' : '切換暗色'"
          @click="toggleDark"
        >
          <svg
            v-if="isDark"
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"
            />
          </svg>
          <svg
            v-else
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
            />
          </svg>
        </button>

        <!-- 用戶頭像 dropdown -->
        <div
          v-if="customer"
          class="relative nav-dropdown-wrap"
        >
          <button
            class="nav-icon-btn flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
            @click.stop="menuOpen = !menuOpen"
          >
            <img
              v-if="customer.picture"
              :src="customer.picture"
              class="w-6 h-6 rounded-full object-cover flex-shrink-0"
            >
            <div
              v-else
              class="user-avatar w-6 h-6 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            >
              {{ customer.name?.charAt(0) || '?' }}
            </div>
            <span class="text-xl font-medium hidden lg:block max-w-[80px] truncate">{{ customer.name }}</span>
            <svg
              class="w-3 h-3 transition-transform"
              :class="menuOpen ? 'rotate-180' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="m19 9-7 7-7-7"
              />
            </svg>
          </button>
          <Transition
            enter-active-class="transition-all duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-100 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="menuOpen"
              class="nav-dropdown absolute right-0 top-full mt-1 w-44 rounded-xl z-50 overflow-hidden"
              @click.stop
            >
              <div class="nav-dropdown-head px-3 py-2">
                <p
                  class="text-sm font-semibold truncate"
                  style="color: var(--text)"
                >
                  {{ customer.name }}
                </p>
                <p
                  class="text-sm truncate"
                  style="color: var(--text-hint)"
                >
                  {{ customer.email }}
                </p>
              </div>
              <ul class="py-1">
                <li>
                  <button
                    class="nav-dropdown-item w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                    @click="goProfile"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    個人設定
                  </button>
                </li>
                <li>
                  <a
                    href="https://holyfarm.netlify.app"
                    target="_blank"
                    class="nav-dropdown-item w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                    @click="menuOpen = false"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    首頁
                  </a>
                </li>
                <li class="nav-dropdown-divider mt-1 pt-1">
                  <button
                    class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    @click="logout"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    登出
                  </button>
                </li>
              </ul>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 手機 navbar -->
    <div class="lg:hidden flex items-center justify-between">
      <NuxtLink
        to="/staff/home"
        class="nav-logo flex items-center gap-1.5 font-bold text-sm"
      >
        🏠 首頁
      </NuxtLink>
      <div class="flex items-center gap-1">
        <button
          class="nav-icon-btn p-1 rounded transition-colors"
          :title="isDark ? '切換亮色' : '切換暗色'"
          @click="toggleDark"
        >
          <svg
            v-if="isDark"
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"
            />
          </svg>
          <svg
            v-else
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
            />
          </svg>
        </button>
        <button
          class="nav-icon-btn p-1 rounded transition-colors"
          @click="mobileOpen = !mobileOpen"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="!mobileOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 手機選單 -->
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileOpen"
        class="nav-mobile-menu lg:hidden mt-2 p-2 rounded-lg space-y-2 max-h-[70vh] overflow-y-auto"
      >
        <!-- 分類群組 -->
        <div
          v-for="group in visibleGroups"
          :key="group.label"
        >
          <p
            class="text-xs font-semibold px-1 mb-1"
            style="color: var(--text-hint)"
          >
            {{ group.label }}
          </p>
          <div class="grid grid-cols-3 gap-1">
            <NuxtLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="px-2 py-1.5 rounded text-sm font-medium text-center transition-colors"
              :class="route.path.startsWith(item.to) ? 'nav-mobile-active' : 'nav-item-inactive'"
            >{{ item.label }}</NuxtLink>
          </div>
        </div>

        <!-- 獨立連結 -->
        <div
          v-if="visibleStandaloneItems.length > 0"
          class="grid grid-cols-3 gap-1"
        >
          <NuxtLink
            v-for="item in visibleStandaloneItems"
            :key="item.to"
            :to="item.to"
            class="px-2 py-1.5 rounded text-sm font-medium text-center transition-colors"
            :class="route.path.startsWith(item.to) ? 'nav-mobile-active' : 'nav-item-inactive'"
          >{{ item.label }}</NuxtLink>
        </div>

        <!-- 個人設定 / 首頁 -->
        <div class="nav-dropdown-divider pt-2 grid grid-cols-2 gap-1">
          <button
            class="nav-item-inactive px-2 py-1.5 rounded text-sm font-medium text-center transition-colors"
            @click="mobileOpen = false; goProfile()"
          >
            個人設定
          </button>
          <a
            href="https://holyfarm.netlify.app"
            target="_blank"
            class="nav-item-inactive px-2 py-1.5 rounded text-sm font-medium text-center transition-colors"
            @click="mobileOpen = false"
          >
            首頁
          </a>
        </div>

        <!-- 登出 -->
        <div class="nav-dropdown-divider pt-2">
          <button
            class="w-full text-left px-2 py-1.5 rounded text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            @click="logout"
          >
            登出
          </button>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup>
const route = useRoute()
const mobileOpen = ref(false)
const menuOpen = ref(false)
const dropOpen = ref({})
const darkStore = useDarkModeStore()
const isDark = computed(() => darkStore.data.dark)
const perm = usePermission()
const customerStore = useCustomerStore()
const commonStore = useCommonStore()
const customer = computed(() => customerStore.customer)

const toggleDark = () => {
  darkStore.change_dark_mode()
}

watch(() => route.path, () => {
  mobileOpen.value = false
  dropOpen.value = {}
  menuOpen.value = false
})

// ── 選單定義 ─────────────────────────────────────────────────────
const navGroups = [
  {
    label: '👥 人事',
    items: [
      { to: '/staff/personnel/class-schedule', icon: '📅', label: '假表', key: 'staff.class-schedule' },
      { to: '/staff/personnel/phone-directory', icon: '📞', label: '電話', key: 'staff.phone-directory' },
      { to: '/staff/personnel/work-manual', icon: '📘', label: '工作手冊', key: 'staff.work-manual' }
    ]
  },
  {
    label: '🖨️ 列印中心',
    items: [
      { to: '/staff/print/table-card-print', icon: '🪧', label: '桌牌', key: 'staff.table-card-print' },
      { to: '/staff/print/herbs-label-print', icon: '🏷️', label: '花園 QRCode', key: 'staff.herbs-label-print' }
    ]
  },
  {
    label: '🏢 營運管理',
    items: [
      { to: '/staff/management/daily-menu', icon: '🍽️', label: '每日菜色', key: 'staff.daily-menu' },
      { to: '/staff/management/calendar', icon: '🗓️', label: '行事曆', key: 'staff.calendar' },
      { to: '/staff/management/asset', icon: '📦', label: '財產登記', key: 'staff.asset' },
      { to: '/staff/management/files', icon: '📁', label: '檔案管理', key: 'staff.files' },
      { to: '/staff/management/html-page', icon: '📁', label: '網頁檔案', key: 'staff.files' }
    ]
  },
  {
    label: '📦 訂單管理',
    items: [
      { to: '/staff/order/black-cat-orders', icon: '🚚', label: '黑貓貨單', key: 'staff.black-cat-orders' },
      { to: '/staff/order/soybean-orders', icon: '🥛', label: '豆漿訂單', key: 'staff.soybean-orders' },
      { to: '/staff/order/lunch-orders', icon: '🍱', label: '便當訂單', key: 'staff.lunch-orders' },
      { to: '/staff/order/booking-orders', icon: '🪑', label: '訂位管理', key: 'staff.booking-orders' }
    ]
  },
  {
    label: '👥 庫存銷售',
    items: [
      { to: '/staff/stock/pos-analysis', icon: '📅', label: '銷售分析', key: 'staff.cash-count' },
      { to: '/staff/stock/pos-files', icon: '📞', label: '資料管理', key: 'staff.cash-count' }
    ]
  },
  {
    label: '🌐 前台內容',
    items: [
      { to: '/staff/content/news', icon: '📢', label: '消息管理', key: 'staff.news' },
      { to: '/staff/content/product', icon: '🛍️', label: '商品管理', key: 'staff.product' },
      { to: '/staff/content/production', icon: '🌱', label: '產品訂購', key: 'staff.production' }
    ]
  }
]

const standaloneItems = [
  { to: '/staff/system/quick-links', icon: '🔗', label: '常用網址', key: 'staff.quick-links' }
]

// ── 權限過濾 ──────────────────────────────────────────────────────
const permStore = usePermissionStore()

// 改用 perms 是否有內容來判斷，而非 loaded flag。
// 原因：loaded 不 persist，iOS BFCache/App Switcher 回來時 loaded=false，
// 但 perms 還有 persist 的舊資料，這時用 loaded 判斷會讓選單空白，
// 等 API 回來才顯示。改用 hasPerms 讓 perms 有資料就立刻顯示，
// 背景 API 更新完再響應式刷新，完全無閃爍。
const hasPerms = computed(() => Object.keys(permStore.perms).length > 0)

const filterItems = items => items.filter(i => !i.key || perm.can(i.key))

const visibleGroups = computed(() => {
  if (!hasPerms.value) return []
  return navGroups
    .map(g => ({ ...g, items: filterItems(g.items) }))
    .filter(g => g.items.length > 0)
})

const visibleStandaloneItems = computed(() => {
  if (!hasPerms.value) return []
  return filterItems(standaloneItems)
})

const activeGroup = computed(() =>
  visibleGroups.value.find(g => g.items.some(i => route.path.startsWith(i.to)))
)

// ── Dropdown 控制 ─────────────────────────────────────────────────
function toggleDrop(label) {
  dropOpen.value = {
    ...Object.fromEntries(Object.keys(dropOpen.value).map(k => [k, false])),
    [label]: !dropOpen.value[label]
  }
  menuOpen.value = false
}

// ── 點外部關閉所有 dropdown（統一一個 handler）────────────────────
function onClickOutside(e) {
  if (!e.target.closest('.nav-dropdown-wrap')) {
    dropOpen.value = {}
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})

// ── 個人設定導航（先關 dropdown 再跳頁，避免路由切換重渲染造成 CSS 異常）──
const goProfile = () => {
  menuOpen.value = false
  nextTick(() => navigateTo('/staff/profile/settings'))
}

// ── 登出 ──────────────────────────────────────────────────────────
const logout = async () => {
  try {
    await fetch(`${commonStore.data.main_url}/holy/customer/logout`, {
      method: 'POST',
      credentials: 'include'
    })
  } catch { /* 即使失敗也繼續清除本地狀態 */
  }
  customerStore.clearCustomer()
  usePermissionStore().clear()
  menuOpen.value = false
  navigateTo('/')
}
</script>

<style scoped>
  .staff-nav {
    background: var(--surface);
    border-bottom: 1px solid var(--border-light);
    padding: 6px 12px;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .nav-logo {
    color: var(--accent);
  }

  .nav-item-inactive {
    color: var(--text-muted);
  }

  .nav-item-inactive:hover {
    background: var(--surface2);
  }

  .nav-item-active {
    color: var(--accent);
  }

  .nav-item-active-bg {
    background: var(--accent-light);
  }

  .nav-icon-btn {
    color: var(--text-hint);
  }

  .nav-icon-btn:hover {
    background: var(--surface2);
  }

  .user-avatar {
    background: var(--accent);
  }

  .nav-dropdown {
    background: var(--surface);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow);
  }

  .nav-dropdown-head {
    border-bottom: 1px solid var(--border-light);
  }

  .nav-dropdown-item {
    color: var(--text-muted);
  }

  .nav-dropdown-item:hover {
    background: var(--surface2);
  }

  .nav-dropdown-divider {
    border-top: 1px solid var(--border-light);
  }

  .nav-mobile-menu {
    background: var(--surface2);
    border: 1px solid var(--border-light);
  }

  .nav-mobile-active {
    color: white;
    background: var(--accent);
  }
</style>
