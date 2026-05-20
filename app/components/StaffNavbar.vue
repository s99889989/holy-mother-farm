<template>
  <nav class="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-2 sticky top-0 z-50">
    <!-- 桌機 -->
    <div class="hidden sm:flex items-center gap-1">
      <!-- Logo -->
      <NuxtLink
        to="/staff/home"
        class="flex items-center gap-1.5 px-2 py-1 mr-1 text-green-700 dark:text-green-400 font-bold text-sm"
      >
        🌿 員工專區
      </NuxtLink>

      <!-- 分類 dropdown -->
      <div
        v-for="group in visibleGroups"
        :key="group.label"
        class="relative nav-dropdown-wrap"
      >
        <button
          class="flex items-center gap-1 px-2.5 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap"
          :class="activeGroup?.label === group.label
            ? 'text-green-700 dark:text-green-400'
            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'"
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
            class="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg min-w-[140px]"
          >
            <ul class="p-1.5">
              <li
                v-for="item in group.items"
                :key="item.to"
              >
                <NuxtLink
                  :to="item.to"
                  class="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap"
                  :class="route.path.startsWith(item.to)
                    ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'"
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
        class="flex items-center gap-1 px-2.5 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap"
        :class="route.path.startsWith(item.to)
          ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950'
          : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'"
      >
        <span v-if="item.icon">{{ item.icon }}</span>{{ item.label }}
      </NuxtLink>

      <!-- 右側 -->
      <div class="ml-auto flex items-center gap-1">
        <!-- 暗模式 -->
        <button
          class="p-1.5 rounded text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
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
            class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            @click="toggleMenu"
          >
            <img
              v-if="customer.picture"
              :src="customer.picture"
              class="w-6 h-6 rounded-full object-cover flex-shrink-0"
            >
            <div
              v-else
              class="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            >
              {{ customer.name?.charAt(0) || '?' }}
            </div>
            <span class="text-xs font-medium hidden sm:block max-w-[80px] truncate">{{ customer.name }}</span>
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
              class="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-stone-800 rounded-xl shadow-lg border border-stone-200 dark:border-stone-700 z-50 overflow-hidden"
              @click.stop
            >
              <div class="px-3 py-2 border-b border-stone-100 dark:border-stone-700">
                <p class="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate">
                  {{ customer.name }}
                </p>
                <p class="text-xs text-stone-400 truncate">
                  {{ customer.email }}
                </p>
              </div>
              <ul class="py-1">
                <li>
                  <NuxtLink
                    to="/front/profile/settings"
                    class="flex items-center gap-2 px-3 py-2 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    個人設定
                  </NuxtLink>
                </li>
                <li class="border-t border-stone-100 dark:border-stone-700 mt-1 pt-1">
                  <button
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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

    <!-- 手機 -->
    <div class="sm:hidden flex items-center justify-between">
      <NuxtLink
        to="/staff/home"
        class="text-green-700 dark:text-green-400 font-bold text-sm"
      >🌿 員工專區</NuxtLink>
      <div class="flex items-center gap-1">
        <button
          class="p-1 rounded text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
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
          class="p-1 rounded text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
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
        class="sm:hidden mt-2 p-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 space-y-2"
      >
        <!-- 分類群組 -->
        <div
          v-for="group in visibleGroups"
          :key="group.label"
        >
          <p class="text-xs text-stone-400 dark:text-stone-500 font-semibold px-1 mb-1">
            {{ group.label }}
          </p>
          <div class="grid grid-cols-3 gap-1">
            <NuxtLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="px-2 py-1.5 rounded text-sm font-medium text-center transition-colors"
              :class="route.path.startsWith(item.to)
                ? 'text-white bg-green-700'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'"
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
            :class="route.path.startsWith(item.to)
              ? 'text-white bg-green-700'
              : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'"
          >{{ item.label }}</NuxtLink>
        </div>

        <!-- 登出 -->
        <div class="border-t border-stone-200 dark:border-stone-700 pt-2">
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
const customer = computed(() => customerStore.customer)

const toggleDark = () => { darkStore.change_dark_mode() }

watch(() => route.path, () => { mobileOpen.value = false; dropOpen.value = {} })

// ── 選單定義 ─────────────────────────────────────────────────────
// 每個 item 可加 icon（選填）和 key（權限 key，不填則不做權限過濾）
const navGroups = [
  {
    label: '⚙️ 員工作業',
    items: [
      { to: '/staff/home', icon: '🏠', label: '員工首頁', key: 'staff.home' },
      { to: '/staff/cash-count', icon: '💵', label: '點鈔記錄', key: 'staff.cash-count' },
      { to: '/staff/booking', icon: '🪑', label: '訂位管理', key: 'staff.booking' },
      { to: '/staff/calendar', icon: '📅', label: '行事曆', key: 'staff.calendar' },
      { to: '/staff/image', icon: '🖼️', label: '圖庫管理', key: 'staff.image' },
      { to: '/staff/inventory', icon: '📦', label: '庫存管理', key: 'staff.inventory' },
      { to: '/staff/asset', icon: '🏷️', label: '財產登記', key: 'staff.asset' }
    ]
  },
  {
    label: '🌐 前台內容',
    items: [
      { to: '/staff/menu', icon: '🍽️', label: '每日菜單', key: 'staff.menu' },
      { to: '/staff/news', icon: '📰', label: '消息管理', key: 'staff.news' },
      { to: '/staff/product', icon: '🛍️', label: '商品管理', key: 'staff.product' },
      { to: '/staff/production', icon: '🌾', label: '產品訂購', key: 'staff.production' },
      { to: '/staff/customer', icon: '👥', label: '客戶管理', key: 'staff.customer' }
    ]
  }
]

const standaloneItems = [
  // 範例：{ to: '/staff/xxx', icon: '📌', label: 'XXX', key: 'staff.xxx' },
  { to: '/staff/quick-links', icon: '🔗', label: '常用網址', key: 'staff.quick-links' }
]

// ── 權限過濾 ──────────────────────────────────────────────────────
const filterItems = items => items.filter(i => !i.key || perm.can(i.key))

const visibleGroups = computed(() =>
  navGroups
    .map(g => ({ ...g, items: filterItems(g.items) }))
    .filter(g => g.items.length > 0)
)

const visibleStandaloneItems = computed(() => filterItems(standaloneItems))

const activeGroup = computed(() =>
  visibleGroups.value.find(g => g.items.some(i => route.path.startsWith(i.to)))
)

// ── Dropdown 控制（照 AdminNavbar 模式）──────────────────────────
function toggleDrop(label) {
  dropOpen.value = {
    ...Object.fromEntries(Object.keys(dropOpen.value).map(k => [k, false])),
    [label]: !dropOpen.value[label]
  }
}

const toggleMenu = (e) => {
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

function onClickOutside(e) {
  if (!e.target.closest('.nav-dropdown-wrap')) dropOpen.value = {}
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('click', closeMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('click', closeMenu)
})

const logout = () => {
  customerStore.logout?.()
  usePermissionStore().clear()
  navigateTo('/')
}
</script>
