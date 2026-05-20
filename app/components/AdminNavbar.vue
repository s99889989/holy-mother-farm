<script setup>
import { reactive } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const route = useRoute()
const commonStore = useCommonStore()
const mobileOpen = ref(false)
const darkStore = useDarkModeStore()
const isDark = computed(() => darkStore.data.dark)

const toggleDark = () => { darkStore.change_dark_mode() }
watch(() => route.path, () => { mobileOpen.value = false })

// 後台縮減為只剩帳戶管理
const navItems = [
  { to: '/admin/management/CustomerManagement', label: '帳號管理' },
  { to: '/admin/management/PermissionManagement', label: '權限管理' },
]

// ── 頭像選單 ──────────────────────────────────────────────────────
const menuOpen = ref(false)
const closeMenu = () => { menuOpen.value = false }
const toggleMenu = (e) => {
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
}

function onClickOutside() { menuOpen.value = false }
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

const logout = () => {
  localStorage.removeItem('holy_auth')
  window.location.href = '/login'
}

// ── 修改密碼 Modal ────────────────────────────────────────────────
const pwModal = ref(false)
const pwForm = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const pwError = ref('')
const pwOk = ref(false)
const pwLoading = ref(false)

const openPwModal = () => {
  closeMenu()
  Object.assign(pwForm, { oldPassword: '', newPassword: '', confirm: '' })
  pwError.value = ''
  pwOk.value = false
  pwModal.value = true
}

const changePassword = async () => {
  pwError.value = ''
  if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirm) {
    pwError.value = '請填寫所有欄位'; return
  }
  if (pwForm.newPassword !== pwForm.confirm) {
    pwError.value = '新密碼與確認密碼不一致'; return
  }
  if (pwForm.newPassword.length < 4) {
    pwError.value = '新密碼至少 4 個字元'; return
  }
  pwLoading.value = true
  try {
    const res = await $fetch(`${commonStore.data.main_url}/holy/auth/password`, {
      method: 'PUT',
      body: { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }
    })
    if (res.success) {
      pwOk.value = true
      setTimeout(() => { pwModal.value = false }, 1500)
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
  <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
    <div class="flex items-center gap-2">

      <!-- 導覽連結 -->
      <nav class="flex items-center gap-1 flex-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap"
          :class="route.path.startsWith(item.to)
            ? 'bg-blue-700 text-white dark:bg-transparent dark:text-blue-400'
            : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- 開燈 / 關燈 -->
      <button
        class="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
        :title="isDark ? '開燈' : '關燈'"
        @click="toggleDark"
      >
        <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </button>

      <!-- 頭像選單 -->
      <div class="relative" @click.stop>
        <button
          class="w-8 h-8 rounded-full bg-blue-700 text-white text-sm font-bold flex items-center justify-center hover:bg-blue-800 transition-colors"
          @click="toggleMenu"
        >
          管
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
            v-if="menuOpen"
            class="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-36"
          >
            <ul class="p-1">
              <li>
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  @click="openPwModal"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  修改密碼
                </button>
              </li>
              <li>
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  @click="logout"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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

  <!-- 修改密碼 Modal -->
  <div
    v-if="pwModal"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-bold text-stone-800 dark:text-stone-100">修改密碼</h3>
        <button class="text-stone-400 hover:text-stone-600 p-1" @click="pwModal = false">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div v-if="pwOk" class="text-center py-4">
        <div class="text-4xl mb-2">✅</div>
        <p class="text-green-600 font-medium">密碼已更新</p>
      </div>
      <div v-else class="space-y-4">
        <div>
          <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">舊密碼</label>
          <input v-model="pwForm.oldPassword" type="password" placeholder="請輸入舊密碼"
                 class="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
        </div>
        <div>
          <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">新密碼</label>
          <input v-model="pwForm.newPassword" type="password" placeholder="請輸入新密碼"
                 class="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
        </div>
        <div>
          <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">確認新密碼</label>
          <input v-model="pwForm.confirm" type="password" placeholder="再次輸入新密碼"
                 class="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400"
                 @keydown.enter="changePassword">
        </div>
        <p v-if="pwError" class="text-xs text-red-500">{{ pwError }}</p>
        <div class="flex gap-2 pt-1">
          <button
            class="flex-1 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors"
            @click="pwModal = false"
          >取消</button>
          <button
            :disabled="pwLoading"
            class="flex-1 py-2.5 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            @click="changePassword"
          >
            <div v-if="pwLoading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ pwLoading ? '更新中…' : '確認修改' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
