<script setup>
const route = useRoute()
const mobileOpen = ref(false)

watch(() => route.path, () => { mobileOpen.value = false })

const isDark = ref(false)

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('adminDark', isDark.value ? '1' : '0')
}

onMounted(() => {
  const saved = localStorage.getItem('adminDark')
  if (saved !== null) {
    isDark.value = saved === '1'
  } else {
    isDark.value = document.documentElement.classList.contains('dark')
  }
  document.documentElement.classList.toggle('dark', isDark.value)
})


const navGroups = [
  {
    label: '庫存・財務',
    items: [
      {to: '/admin/items/CommonConfig', label: '設定管理'},
      { to: '/admin/items/ShopInventory',     label: '休憩小舖庫存' },
      { to: '/admin/items/InventoryQuantity', label: '餐廳小舖庫存' },
      { to: '/admin/items/CashCount', label: '點鈔作業'     },
    ]
  },
  {
    label: '內容管理',
    items: [
      {to: '/admin/management/News', label: '活動消息'},
      {to: '/admin/management/DailyMenu', label: '每日菜色'},
      {to: '/admin/management/BookIndex', label: '訂位管理'},
      {to: '/admin/management/ImageLibrary', label: '資源管理庫'},
      { to: '/admin/management/AssetRegistry',     label: '財產登記'     },
    ]
  },
]

const standaloneItems = [
  {to: '/admin/Todo', label: '工作待辦'},
  {to: '/admin/QuickLinks', label: '常用網址'},
]

const allItems = [...navGroups.flatMap(g => g.items), ...standaloneItems]
const dropOpen = ref({})
const activeGroup = computed(() => navGroups.find(g => g.items.some(i => route.path.startsWith(i.to))))

function toggleDrop(label) {
  dropOpen.value = {
    ...Object.fromEntries(Object.keys(dropOpen.value).map(k => [k, false])),
    [label]: !dropOpen.value[label]
  }
}

function onClickOutside(e) {
  if (!e.target.closest('.nav-dropdown-wrap')) dropOpen.value = {}
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <!-- ══ 後台導覽列 ══ -->
  <!-- bg-neutral-primary / border-default -->
  <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">

    <!-- 桌機 -->
    <div class="hidden sm:flex items-center gap-1 flex-wrap">
      <div v-for="group in navGroups" :key="group.label" class="relative nav-dropdown-wrap">
        <button
          @click.stop="toggleDrop(group.label)"
          class="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
          :class="activeGroup?.label === group.label
            ? 'text-blue-700 dark:text-blue-500'
            : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'"
        >
          {{ group.label }}
          <svg class="w-3 h-3 transition-transform duration-150" :class="dropOpen[group.label] ? 'rotate-180' : ''"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div v-if="dropOpen[group.label]"
               class="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-36">
            <ul class="p-1.5">
              <li v-for="item in group.items" :key="item.to">
                <NuxtLink
                  :to="item.to"
                  class="block px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                  :class="route.path.startsWith(item.to)
                    ? 'text-white bg-blue-700 dark:bg-transparent dark:text-blue-500'
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'"
                >{{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </Transition>
      </div>
      <!-- 獨立連結 -->
      <NuxtLink
        v-for="item in standaloneItems" :key="item.to"
        :to="item.to"
        class="px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
        :class="route.path.startsWith(item.to)
          ? 'text-white bg-blue-700 md:bg-transparent md:text-blue-700 dark:md:text-blue-500'
          : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'"
      >{{ item.label }}
      </NuxtLink>
      <!-- 開燈 / 關燈 -->
      <button @click="toggleDark"
              class="ml-auto p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
              :title="isDark ? '開燈' : '關燈'">
        <!-- 太陽（dark 時顯示 → 開燈） -->
        <svg v-if="isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"/>
        </svg>
        <!-- 月亮（light 時顯示 → 關燈） -->
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>
    </div>

    <!-- 手機 -->
    <div class="sm:hidden flex items-center justify-between">
      <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">後台導覽</span>
      <div class="flex items-center gap-1">
        <!-- 開燈 / 關燈 -->
        <button @click="toggleDark"
                class="p-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white transition-colors">
          <svg v-if="isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        </button>
        <button
          class="p-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
          @click="mobileOpen = !mobileOpen">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!mobileOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <!-- bg-neutral-secondary-soft / border-default -->
      <div v-if="mobileOpen"
           class="sm:hidden mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2">
        <div v-for="group in navGroups" :key="group.label">
          <p class="text-xs text-gray-400 dark:text-gray-500 font-semibold px-1 mb-1">{{ group.label }}</p>
          <div class="grid grid-cols-3 gap-1">
            <NuxtLink
              v-for="item in group.items" :key="item.to"
              :to="item.to"
              class="px-2 py-1.5 rounded text-xs font-medium text-center transition-colors"
              :class="route.path.startsWith(item.to)
                ? 'text-white bg-blue-700 dark:bg-transparent dark:text-blue-500'
                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'"
            >{{ item.label }}
            </NuxtLink>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-1 mt-1">
          <NuxtLink
            v-for="item in standaloneItems" :key="item.to"
            :to="item.to"
            class="px-2 py-1.5 rounded text-xs font-medium text-center transition-colors"
            :class="route.path.startsWith(item.to)
                ? 'text-white bg-blue-700 dark:bg-transparent dark:text-blue-500'
                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'"
          >{{ item.label }}
          </NuxtLink>
        </div>
      </div>
    </Transition>

  </div>
</template>
