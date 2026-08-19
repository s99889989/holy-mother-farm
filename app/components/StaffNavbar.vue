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
  const { groups: posNavGroups } = usePosNav()

  const toggleDark = () => {
    darkStore.change_dark_mode()
  }

  watch(() => route.path, () => {
    mobileOpen.value = false
    dropOpen.value = {}
    menuOpen.value = false
  })

  watch(mobileOpen, (val) => {
    if (import.meta.client) {
      document.body.style.overflow = val ? 'hidden' : ''
    }
  })

  const navGroups = [
    {
      label: '🌐 前台內容',
      items: [
        { to: '/staff/content/news', icon: '📢', label: '消息管理', key: 'content.news' },
        { to: '/staff/content/product', icon: '🛍️', label: '商品管理', key: 'content.product' },
        { to: '/staff/content/production', icon: '🌱', label: '產品訂購', key: 'content.production' }
      ]
    },
    {
      label: '🏢 營運管理',
      items: [
        { to: '/staff/management/calendar', icon: '📅', label: '行事曆', key: 'management.calendar' },
        { to: '/staff/management/group-itinerary', icon: '🚌️', label: '團體行程', key: 'management.group-itinerary' },
        { to: '/staff/management/tour', icon: '🌐️', label: '環景導覽管理', key: 'management.tour' },
        { to: '/staff/management/body-composition', icon: '⚖️', label: '身體組成分析', key: 'management.body-composition' },
        { to: '/staff/management/lemon-sauce-inventory', icon: '🫙', label: '鹹檸檬醬進銷', key: 'management.lemon-sauce-inventory' },
        { to: '/staff/management/asset', icon: '🏷️', label: '財產登記', key: 'management.asset' },
        { to: '/staff/management/fire-extinguisher', icon: '🧯', label: '滅火器巡檢', key: 'management.fire-extinguisher' },
        { to: '/staff/management/daily-menu', icon: '🍽️', label: '每日菜色', key: 'management.daily-menu' },
        { to: '/staff/management/files', icon: '📁', label: '檔案管理', key: 'management.files' },
        { to: '/staff/management/course', icon: '🎓', label: '課程報名', key: 'management.course' },
        { to: '/staff/management/meal-schedule', icon: '👨‍🍳', label: '備餐管理', key: 'management.meal-schedule' },
        { to: '/staff/management/html-page', icon: '🖥️', label: '網頁頁面', key: 'management.html-page' },
        { to: '/staff/management/front-website', icon: '📢️', label: '前台管理', key: 'content.news' },
        // POS 系統本身不在頂部展開子項目，只當一個入口；子頁面切換交給 layouts/pos.vue 的左側導覽。
        // key 給整組 pos 權限清單，只要使用者有其中任一權限就會看到這個入口。
        { to: '/staff/pos/daily/sales', icon: '🛒', label: 'POS 系統', key: posNavGroups.flatMap(g => g.items.map(i => i.key)) }
      ]
    },
    {
      label: '📦 訂單管理',
      items: [
        { to: '/staff/order/black-cat-orders', icon: '🚚', label: '黑貓貨單', key: 'order.black-cat-orders' },
        { to: '/staff/order/booking-orders', icon: '📅', label: '訂位管理', key: 'order.booking-orders' },
        { to: '/staff/order/lunch-orders', icon: '🍱', label: '便當訂單', key: 'order.lunch-orders' },
        { to: '/staff/order/soybean-orders', icon: '🥛', label: '豆漿訂單', key: 'order.soybean-orders' },
        { to: '/staff/order/handmade-bread-orders', icon: '🍞', label: '一一手做', key: 'order.handmade-bread-orders' },
        { to: '/staff/order/shopping-cart', icon: '🛒', label: '購物車', key: 'order.shopping-cart' },
        { to: '/staff/order/dc-erp', icon: '🌾️', label: '農莊ERP', key: 'order.dc-erp' },
        { to: '/staff/order/rooms-orders', icon: '🛏️', label: '訂房管理', key: 'order.rooms-orders' },
        { to: '/staff/order/venue/venue-orders', icon: '🏛️', label: '場地租借', key: 'order.venue-orders' }
      ]
    },
    {
      label: '👥 人事',
      items: [
        { to: '/staff/personnel/class-schedule', icon: '🗓️', label: '假表', key: 'personnel.class-schedule' },
        { to: '/staff/personnel/phone-directory', icon: '📞', label: '電話', key: 'personnel.phone-directory' },
        { to: '/staff/personnel/work-manual', icon: '📕', label: '工作手冊', key: 'personnel.work-manual' }
      ]
    },
    {
      label: '💳 其他',
      items: [
        { to: '/staff/other/broadcast', icon: '📣', label: '廣播', key: 'other.broadcast' }
      ]
    },
    {
      label: '🖨️ 列印中心',
      items: [
        { to: '/staff/print/guild-hall-print', icon: '🏛️', label: '會館訂貨', key: 'print.guild-hall-print' },
        { to: '/staff/print/herbs-label-print', icon: '🌿', label: '花園 QRCode', key: 'print.herbs-label-print' },
        { to: '/staff/print/fire-extinguisher-print', icon: '🧯', label: '滅火器 QRCode', key: 'print.fire-extinguisher-print' },
        { to: '/staff/print/table-card-print', icon: '🪧', label: '桌牌', key: 'print.table-card-print' }
      ]
    },
    {
      label: '📊 庫存銷售',
      items: [
        { to: '/staff/stock/cash-count', icon: '💵', label: '點鈔記錄', key: 'stock.cash-count' },
        { to: '/staff/stock/pos-analysis', icon: '📊', label: '銷售分析', key: 'stock.pos-analysis' },
        { to: '/staff/stock/pos-data-table', icon: '🗃️', label: '資料表', key: 'stock.pos-data-table' },
        { to: '/staff/stock/pos-files', icon: '🗂️', label: '資料管理', key: 'stock.pos-files' }
      ]
    },
    {
      label: '🔐 權限',
      items: [
        { to: '/staff/permission/customer-management', icon: '👤', label: '帳號管理', key: 'permission.customer-management' },
        { to: '/staff/permission/permission-management', icon: '🛡️', label: '權限組', key: 'permission.permission-management' }
      ]
    }
  ]

  const standaloneItems = [
    { to: '/staff/system/quick-links', icon: '🔗', label: '常用網址', key: 'system.quick-links' }
  ]

  const permStore = usePermissionStore()

  const hasPerms = computed(() => Object.keys(permStore.perms).length > 0)

  // ── 選單是空的背景自動重試 ────────────────────────────────────────────
  // session/權限的重驗證（visibilitychange 時打 /me、補拉權限）已經統一
  // 交給 layouts/staff.vue 的 checkSessionOnVisible 處理，這裡不再重複
  // 監聽 visibilitychange，避免兩邊同時呼叫 permStore.load() 互相競爭。
  // 但如果訊號很差（例如只有 1-2 格），fetch 常常是逾時/網路錯誤而不是
  // 明確的 401/403，這種情況本來就不該被登出，只能一直重試等網路恢復。
  // 這裡在 navbar 端做：選單空著的時候，每隔固定秒數背景補拉一次，
  // 直到選單有內容（成功）或元件卸載（使用者離開這頁）為止。
  const PERM_RETRY_INTERVAL_MS = 6000
  let permRetryTimer = null

  const stopPermRetryLoop = () => {
    if (permRetryTimer) {
      clearInterval(permRetryTimer)
      permRetryTimer = null
    }
  }

  const startPermRetryLoop = () => {
    if (permRetryTimer) return // 已經在跑了，不重複啟動
    permRetryTimer = setInterval(() => {
      if (!customer.value || hasPerms.value) {
        stopPermRetryLoop()
        return
      }
      permStore.load(customer.value.id, commonStore.data.main_url, true)
    }, PERM_RETRY_INTERVAL_MS)
  }

  const ensurePermsLoaded = async () => {
    if (!customer.value) return
    if (hasPerms.value) return
    await permStore.load(customer.value.id, commonStore.data.main_url, true)
    if (!hasPerms.value) {
      // 這次補拉還是空的：啟動背景重試迴圈，持續打到成功為止
      startPermRetryLoop()
    }
  }

  // 讓使用者在畫面上能主動戳一下重試，不用乾等背景迴圈的下一次間隔
  const manualRetryPerms = () => {
    if (!customer.value) return
    permStore.load(customer.value.id, commonStore.data.main_url, true)
    startPermRetryLoop()
  }

  watch(hasPerms, (val) => {
    // 選單有內容了，停止背景重試
    if (val) stopPermRetryLoop()
  })

  watch(customer, (val) => {
    // 換人登入/登出時，先停掉舊的重試迴圈，重新檢查一次
    stopPermRetryLoop()
    if (val) ensurePermsLoaded()
  })

  // key 可以是單一字串（沿用原本邏輯），也可以是字串陣列（例如 POS 系統入口）——
  // 陣列時只要使用者擁有其中任一權限就顯示這個項目。
  const filterItems = items => items.filter((i) => {
    if (!i.key) return true
    if (Array.isArray(i.key)) return i.key.some(k => perm.can(k))
    return perm.can(i.key)
  })

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

  function toggleDrop(label) {
    dropOpen.value = {
      ...Object.fromEntries(Object.keys(dropOpen.value).map(k => [k, false])),
      [label]: !dropOpen.value[label]
    }
    menuOpen.value = false
  }

  function onClickOutside(e) {
    if (!e.target.closest('.nav-dropdown-wrap')) {
      dropOpen.value = {}
      menuOpen.value = false
    }
  }

  onMounted(() => {
    document.addEventListener('click', onClickOutside)
    ensurePermsLoaded()
  })
  onUnmounted(() => {
    document.removeEventListener('click', onClickOutside)
    stopPermRetryLoop()
    if (import.meta.client) {
      document.body.style.overflow = ''
    }
  })

  const goProfile = () => {
    menuOpen.value = false
    nextTick(() => navigateTo('/staff/profile/settings'))
  }

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
    mobileOpen.value = false
    navigateTo('/')
  }
</script>

<template>
  <nav class="staff-nav">
    <!-- 桌機 -->
    <div class="hidden lg:flex items-center gap-0.5">
      <!-- Logo -->
      <NuxtLink
        to="/staff/home"
        class="nav-logo flex items-center gap-1 px-2 py-1 mr-1 font-bold text-lg"
      >
        🏠 專區首頁
      </NuxtLink>

      <!-- 分類 dropdown -->
      <div
        v-if="!hasPerms"
        class="flex items-center gap-2 px-2 py-1 text-sm"
        style="color: var(--text-hint)"
      >
        選單載入中，重試中…
        <button
          type="button"
          class="text-xs px-2 py-0.5 rounded-full border"
          style="color: var(--text-hint); border-color: var(--text-hint)"
          @click="manualRetryPerms"
        >
          重試
        </button>
      </div>
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
                    農莊首頁
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
        🏠 專區首頁
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

    <!-- 手機全螢幕選單（App 風格） -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="mobileOpen"
          class="nav-fullscreen lg:hidden fixed inset-0 z-[100] flex flex-col"
        >
          <!-- 頂部標題列 -->
          <div class="nav-fullscreen-header flex items-center justify-between px-4 py-3 flex-shrink-0">
            <span class="font-bold text-base">選單</span>
            <button
              class="nav-icon-btn p-1.5 rounded-full transition-colors"
              @click="mobileOpen = false"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- 可捲動內容 -->
          <div class="flex-1 overflow-y-auto px-4 pb-4">
            <!-- 使用者卡片 -->
            <button
              v-if="customer"
              class="nav-user-card w-full flex items-center gap-3 p-3 rounded-2xl mb-5 mt-1 transition-colors"
              @click="mobileOpen = false; goProfile()"
            >
              <img
                v-if="customer.picture"
                :src="customer.picture"
                class="w-11 h-11 rounded-full object-cover flex-shrink-0"
              >
              <div
                v-else
                class="user-avatar w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              >
                {{ customer.name?.charAt(0) || '?' }}
              </div>
              <div class="flex-1 min-w-0 text-left">
                <p
                  class="text-sm font-semibold truncate"
                  style="color: var(--text)"
                >
                  {{ customer.name }}
                </p>
                <p
                  class="text-xs truncate"
                  style="color: var(--text-hint)"
                >
                  {{ customer.email }}
                </p>
              </div>
              <svg
                class="w-4 h-4 flex-shrink-0"
                style="color: var(--text-hint)"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m9 5 7 7-7 7"
                />
              </svg>
            </button>

            <!-- 選單目前是空的：讓使用者知道發生什麼事，而不是留一片空白 -->
            <div
              v-if="!hasPerms"
              class="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center"
            >
              <p
                class="text-sm"
                style="color: var(--text-hint)"
              >
                選單載入失敗，可能是訊號不穩，背景會持續重試中…
              </p>
              <button
                type="button"
                class="text-xs px-4 py-2 rounded-full border transition-colors"
                style="color: var(--text-hint); border-color: var(--text-hint)"
                @click="manualRetryPerms"
              >
                立即重新載入
              </button>
            </div>

            <!-- 分類卡片網格 -->
            <div
              v-for="group in visibleGroups"
              :key="group.label"
              class="mb-6"
            >
              <p
                class="text-xs font-semibold px-1 mb-2 tracking-wide"
                style="color: var(--text-hint)"
              >
                {{ group.label }}
              </p>
              <div class="grid grid-cols-3 gap-3">
                <NuxtLink
                  v-for="item in group.items"
                  :key="item.to"
                  :to="item.to"
                  class="nav-app-tile flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 rounded-2xl text-center transition-colors"
                  :class="route.path.startsWith(item.to) ? 'nav-app-tile-active' : ''"
                >
                  <span class="text-2xl leading-none">{{ item.icon }}</span>
                  <span class="text-xs font-medium leading-tight">{{ item.label }}</span>
                </NuxtLink>
              </div>
            </div>

            <!-- 獨立連結 -->
            <div
              v-if="visibleStandaloneItems.length > 0"
              class="mb-2"
            >
              <p
                class="text-xs font-semibold px-1 mb-2 tracking-wide"
                style="color: var(--text-hint)"
              >
                🔗 其他
              </p>
              <div class="grid grid-cols-3 gap-3">
                <NuxtLink
                  v-for="item in visibleStandaloneItems"
                  :key="item.to"
                  :to="item.to"
                  class="nav-app-tile flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 rounded-2xl text-center transition-colors"
                  :class="route.path.startsWith(item.to) ? 'nav-app-tile-active' : ''"
                >
                  <span class="text-2xl leading-none">{{ item.icon }}</span>
                  <span class="text-xs font-medium leading-tight">{{ item.label }}</span>
                </NuxtLink>
              </div>
            </div>
          </div>

          <!-- 底部固定工具列 -->
          <div class="nav-fullscreen-footer flex-shrink-0 px-4 py-3 flex items-center gap-2">
            <button
              class="nav-footer-btn flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-colors"
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
              {{ isDark ? '亮色' : '暗色' }}
            </button>
            <a
              href="https://holyfarm.netlify.app"
              target="_blank"
              class="nav-footer-btn flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-colors"
              @click="mobileOpen = false"
            >
              <svg
                class="w-5 h-5"
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
              農莊首頁
            </a>
            <button
              class="nav-footer-btn nav-footer-btn-danger flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-colors"
              @click="logout"
            >
              <svg
                class="w-5 h-5"
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
          </div>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>

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

  .nav-fullscreen {
    background: var(--surface);
  }

  .nav-fullscreen-header {
    border-bottom: 1px solid var(--border-light);
  }

  .nav-fullscreen-footer {
    border-top: 1px solid var(--border-light);
    background: var(--surface2);
  }

  .nav-user-card {
    background: var(--surface2);
  }

  .nav-user-card:active {
    opacity: 0.7;
  }

  .nav-app-tile {
    background: var(--surface2);
    color: var(--text-muted);
  }

  .nav-app-tile:active {
    opacity: 0.7;
  }

  .nav-app-tile-active {
    background: var(--accent-light);
    color: var(--accent);
  }

  .nav-footer-btn {
    background: var(--surface);
    color: var(--text-muted);
  }

  .nav-footer-btn:active {
    opacity: 0.7;
  }

  .nav-footer-btn-danger {
    color: #ef4444;
  }
</style>
