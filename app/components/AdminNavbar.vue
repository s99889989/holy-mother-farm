<script setup>
import { reactive } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const route       = useRoute()
const commonStore = useCommonStore()
const mobileOpen  = ref(false)
const darkStore   = useDarkModeStore()
const isDark      = computed(() => darkStore.data.dark)

const toggleDark = () => { darkStore.change_dark_mode() }

watch(() => route.path, () => { mobileOpen.value = false })

const navGroups = [
  {
    label: '庫存・財務',
    items: [
      {to: '/admin/items/CommonConfig', label: '設定管理'},
      {to: '/admin/items/ShopInventory', label: '休憩小舖庫存'},
      {to: '/admin/items/InventoryQuantity', label: '餐廳小舖庫存'},
      {to: '/admin/items/CashCount', label: '點鈔作業'},
    ]
  },
  {
    label: '內容管理',
    items: [
      {to: '/admin/management/News', label: '活動消息'},
      {to: '/admin/management/DailyMenu', label: '每日菜色'},
      {to: '/admin/management/BookIndex', label: '訂位管理'},
      {to: '/admin/management/ImageLibrary', label: '資源管理庫'},
      {to: '/admin/management/AssetRegistry', label: '財產登記'},
      {to: '/admin/management/CustomerManagement', label: '客戶帳號'}
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

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('click', closeMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('click', closeMenu)
})

// ── 頭像選單 ──────────────────────────────────────────────────────
const menuOpen = ref(false)
const closeMenu = () => {
  menuOpen.value = false
}
const toggleMenu = (e) => {
  e.stopPropagation();
  menuOpen.value = !menuOpen.value
}

const logout = () => {
  localStorage.removeItem('holy_auth')
  window.location.href = '/login'
}

// ── 修改密碼 Modal ────────────────────────────────────────────────
const pwModal = ref(false)
const pwForm = reactive({oldPassword: '', newPassword: '', confirm: ''})
const pwError = ref('')
const pwOk = ref(false)
const pwLoading = ref(false)

const openPwModal = () => {
  closeMenu()
  Object.assign(pwForm, {oldPassword: '', newPassword: '', confirm: ''})
  pwError.value = ''
  pwOk.value = false
  pwModal.value = true
}

const changePassword = async () => {
  pwError.value = ''
  if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirm) {
    pwError.value = '請填寫所有欄位';
    return
  }
  if (pwForm.newPassword !== pwForm.confirm) {
    pwError.value = '新密碼與確認密碼不一致';
    return
  }
  if (pwForm.newPassword.length < 4) {
    pwError.value = '新密碼至少 4 個字元';
    return
  }
  pwLoading.value = true
  try {
    const res = await $fetch(`${commonStore.data.main_url}/holy/auth/password`, {
      method: 'PUT',
      body: {oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword},
    })
    if (res.success) {
      pwOk.value = true
      setTimeout(() => {
        pwModal.value = false
      }, 1500)
    } else {
      pwError.value = res.message || '舊密碼錯誤'
    }
  } catch {
    pwError.value = '修改失敗，請再試一次'
  } finally {
    pwLoading.value = false
  }
}
</script>

<template>
  <!-- ══ 後台導覽列 ══ -->
  <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">

    <!-- 桌機 -->
    <div class="hidden sm:flex items-center gap-1 flex-wrap">
      <div v-for="group in navGroups" :key="group.label" class="relative nav-dropdown-wrap">
        <button
          @click.stop="toggleDrop(group.label)"
          class="flex items-center gap-1 px-2.5 py-1 rounded text-2xl font-medium transition-colors whitespace-nowrap"
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
               class="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-45">
            <ul class="p-1.5">
              <li v-for="item in group.items" :key="item.to">
                <NuxtLink
                  :to="item.to"
                  class="block px-3 py-1.5 rounded text-2xl font-medium transition-colors whitespace-nowrap"
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
        class="px-2.5 py-1 rounded text-2xl font-medium transition-colors whitespace-nowrap"
        :class="route.path.startsWith(item.to)
          ? 'text-white bg-blue-700 md:bg-transparent md:text-blue-700 dark:md:text-blue-500'
          : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'"
      >{{ item.label }}
      </NuxtLink>
      <!-- 開燈 / 關燈 -->
      <button @click="toggleDark"
              class="ml-auto p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
              :title="isDark ? '開燈' : '關燈'">
        <svg v-if="isDark" class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"/>
        </svg>
        <svg v-else class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>

      <!-- 頭像下拉 -->
      <div class="relative nav-dropdown-wrap">
        <button @click="toggleMenu"
                class="w-8 h-8 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
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
          <div v-if="menuOpen" @click.stop
               class="absolute right-0 top-10 w-44 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 z-50 overflow-hidden">
            <div class="px-4 py-2.5 border-b border-gray-100 dark:border-zinc-700">
              <p class="text-xl text-gray-400">管理員</p>
            </div>
            <ul class="py-1">
              <li>
                <NuxtLink target="_blank" to="/front" @click="closeMenu"
                          class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-zinc-700 transition-colors">
                  <svg class="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                  回前台
                </NuxtLink>
              </li>
              <li>
                <button @click="openPwModal"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                  </svg>
                  修改密碼
                </button>
              </li>
              <li class="border-t border-gray-100 dark:border-zinc-700 mt-1 pt-1">
                <button @click="logout"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  登出
                </button>
              </li>
            </ul>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 手機 -->
    <div class="sm:hidden flex items-center justify-between">
      <span class="text-xl text-gray-500 dark:text-gray-400 font-medium">後台導覽</span>
      <div class="flex items-center gap-1">
        <!-- 開燈 / 關燈 -->
        <button @click="toggleDark"
                class="p-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white transition-colors">
          <svg v-if="isDark" class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"/>
          </svg>
          <svg v-else class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        </button>
        <button
          class="p-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
          @click="mobileOpen = !mobileOpen">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div v-if="mobileOpen"
           class="sm:hidden mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2">
        <div v-for="group in navGroups" :key="group.label">
          <p class="text-xl text-gray-400 dark:text-gray-500 font-semibold px-1 mb-1">{{ group.label }}</p>
          <div class="grid grid-cols-3 gap-1">
            <NuxtLink
              v-for="item in group.items" :key="item.to"
              :to="item.to"
              class="px-2 py-1.5 rounded text-xl font-medium text-center transition-colors"
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
            class="px-2 py-1.5 rounded text-xl font-medium text-center transition-colors"
            :class="route.path.startsWith(item.to)
                ? 'text-white bg-blue-700 dark:bg-transparent dark:text-blue-500'
                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'"
          >{{ item.label }}
          </NuxtLink>
        </div>
      </div>
    </Transition>

  </div>
  <!-- ══ 修改密碼 Modal ══ -->
  <div v-if="pwModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-bold text-stone-800 dark:text-stone-100">修改密碼</h3>
        <button @click="pwModal = false" class="text-stone-400 hover:text-stone-600 p-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div v-if="pwOk" class="text-center py-4">
        <div class="text-4xl mb-2">✅</div>
        <p class="text-green-600 font-medium">密碼已更新</p>
      </div>
      <div v-else class="space-y-4">
        <div>
          <label class="text-xl font-semibold text-stone-600 dark:text-stone-300 block mb-1">舊密碼</label>
          <input v-model="pwForm.oldPassword" type="password" placeholder="請輸入舊密碼"
                 class="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400"/>
        </div>
        <div>
          <label class="text-xl font-semibold text-stone-600 dark:text-stone-300 block mb-1">新密碼</label>
          <input v-model="pwForm.newPassword" type="password" placeholder="請輸入新密碼"
                 class="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400"/>
        </div>
        <div>
          <label class="text-xl font-semibold text-stone-600 dark:text-stone-300 block mb-1">確認新密碼</label>
          <input v-model="pwForm.confirm" type="password" placeholder="再次輸入新密碼"
                 @keydown.enter="changePassword"
                 class="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400"/>
        </div>
        <p v-if="pwError" class="text-xl text-red-500">{{ pwError }}</p>
        <div class="flex gap-2 pt-1">
          <button @click="pwModal = false"
                  class="flex-1 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">
            取消
          </button>
          <button @click="changePassword" :disabled="pwLoading"
                  class="flex-1 py-2.5 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-teal-300 transition-colors flex items-center justify-center gap-1.5">
            <div v-if="pwLoading"
                 class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            {{ pwLoading ? '更新中…' : '確認修改' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
