<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDarkModeStore } from '~/stores/dark_mode'
import { useCommonStore } from '~/stores/common.js'
import { useFlowbite } from '~/components/useFlowbite'
import { initFlowbite } from 'flowbite'

const dark_mode   = useDarkModeStore()
const commonStore = useCommonStore()
const router      = useRouter()

// 路由切換時關閉所有 Flowbite dropdown / navbar
watch(() => router.currentRoute.value.path, () => {
  setTimeout(() => {
    // 關閉 dropdown 選單
    document.querySelectorAll('[data-dropdown-toggle]').forEach(btn => {
      const targetId = btn.getAttribute('data-dropdown-toggle')
      const dropdown = targetId ? document.getElementById(targetId) : null
      dropdown?.classList.add('hidden')
    })
    // 關閉手機版漢堡選單
    const navbarToggle = document.querySelector('[data-collapse-toggle="navbar-dropdown"]')
    const navbar = document.getElementById('navbar-dropdown')
    if (navbarToggle && navbar && !navbar.classList.contains('hidden')) {
      navbar.classList.add('hidden')
      navbarToggle.setAttribute('aria-expanded', 'false')
    }
  }, 100)
})

// ── 頭像下拉 ──────────────────────────────────────────────────────
const menuOpen  = ref(false)
const closeMenu = () => { menuOpen.value = false }
const toggleMenu = (e: Event) => {
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
  useFlowbite(() => { initFlowbite() })
})
onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

// ── 登出 ──────────────────────────────────────────────────────────
const logout = () => {
  localStorage.removeItem('holy_auth')
  window.location.href = '/login'
}

// ── 修改密碼 Modal ────────────────────────────────────────────────
const pwModal   = ref(false)
const pwForm    = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const pwError   = ref('')
const pwOk      = ref(false)
const pwLoading = ref(false)

const openPwModal = () => {
  closeMenu()
  pwForm.oldPassword = ''
  pwForm.newPassword = ''
  pwForm.confirm     = ''
  pwError.value      = ''
  pwOk.value         = false
  pwModal.value      = true
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
      body: { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword },
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
  <nav class="bg-neutral-primary w-full start-0 border-default">
    <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
      <button data-collapse-toggle="navbar-dropdown" type="button"
              class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-body rounded-base md:hidden hover:bg-neutral-secondary-soft hover:text-heading focus:outline-none focus:ring-2 focus:ring-neutral-tertiary"
              aria-controls="navbar-dropdown" aria-expanded="false">
        <span class="sr-only">Open main menu</span>
        <svg class="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5 7h14M5 12h14M5 17h14"/>
        </svg>
      </button>

      <div class="hidden w-full md:block md:w-auto" id="navbar-dropdown">
        <ul class="flex flex-col font-medium p-4 md:p-0 mt-4 border border-default rounded-base bg-neutral-secondary-soft md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-neutral-primary items-center">

          <!-- 庫存 -->
          <li>
            <button id="dropdownNvbarButton1" data-dropdown-toggle="dropdownNavbar1"
                    class="flex items-center justify-between w-full py-2 px-3 rounded font-medium text-heading text-2xl md:w-auto hover:bg-neutral-tertiary md:hover:bg-transparent md:border-0 md:hover:text-fg-brand md:p-0">
              庫存
              <svg class="w-4 h-4 ms-1.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7"/>
              </svg>
            </button>
            <div id="dropdownNavbar1" class="z-50 hidden bg-white dark:bg-zinc-800 border border-default-medium rounded-base shadow-lg w-52">
              <ul class="py-1 text-body font-medium" aria-labelledby="dropdownNvbarButton1">
                <li><NuxtLink to="/rear/items/InventoryQuantity" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">餐廳小舖</NuxtLink></li>
                <li><NuxtLink to="/rear/items/ShopInventory" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">休憩小舖</NuxtLink></li>
                <li><NuxtLink to="/rear/items/CommonConfig" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">庫存設定</NuxtLink></li>
              </ul>
            </div>
          </li>

          <!-- 管理 -->
          <li>
            <button id="dropdownNvbarButton2" data-dropdown-toggle="dropdownNavbar2"
                    class="flex items-center justify-between w-full py-2 px-3 rounded font-medium text-heading text-2xl md:w-auto hover:bg-neutral-tertiary md:hover:bg-transparent md:border-0 md:hover:text-fg-brand md:p-0">
              管理
              <svg class="w-4 h-4 ms-1.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7"/>
              </svg>
            </button>
            <div id="dropdownNavbar2" class="z-50 hidden bg-white dark:bg-zinc-800 border border-default-medium rounded-base shadow-lg w-52">
              <ul class="py-1 text-body font-medium" aria-labelledby="dropdownNvbarButton2">
                <li><NuxtLink to="/rear/check-in/BookIndex" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">訂位訂餐管理</NuxtLink></li>
                <li><NuxtLink to="/rear/management/AssetRegistry" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">財產清點</NuxtLink></li>
                <li><NuxtLink to="/rear/management/DailyMenu" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">菜色紀錄</NuxtLink></li>
                <li><NuxtLink to="/rear/management/News" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">活動消息</NuxtLink></li>
                <li><NuxtLink to="/rear/management/ImageLibrary" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">資源管理</NuxtLink></li>
                <li><NuxtLink to="/rear/common/CashCount" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">點鈔作業</NuxtLink></li>
              </ul>
            </div>
          </li>

          <li><NuxtLink to="/rear/Todo" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">待辦</NuxtLink></li>
          <li><NuxtLink to="/rear/QuickLinks" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">常用連結</NuxtLink></li>
          <li><button @click="dark_mode.change_dark_mode" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">{{ dark_mode.data.display_name }}</button></li>

          <!-- 頭像下拉 -->
          <li class="relative">
            <button @click="toggleMenu"
                    class="w-9 h-9 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-colors shadow-sm">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </button>

            <Transition
              enter-active-class="transition-all duration-150 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-1"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition-all duration-100 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-1"
            >
              <div v-if="menuOpen" @click.stop
                   class="absolute right-0 top-11 w-44 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 z-50 overflow-hidden">
                <div class="px-4 py-2.5 border-b border-gray-50 dark:border-zinc-700">
                  <p class="text-xs text-gray-400">管理員</p>
                </div>
                <ul class="py-1">
                  <li>
                    <NuxtLink to="/" @click="closeMenu"
                              class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-zinc-700 transition-colors">
                      <svg class="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                      </svg>
                      回前台
                    </NuxtLink>
                  </li>
                  <li>
                    <button @click="openPwModal"
                            class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                      </svg>
                      修改密碼
                    </button>
                  </li>
                  <li class="border-t border-gray-50 dark:border-zinc-700 mt-1 pt-1">
                    <button @click="logout"
                            class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                      </svg>
                      登出
                    </button>
                  </li>
                </ul>
              </div>
            </Transition>
          </li>

        </ul>
      </div>
    </div>
  </nav>

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
          <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">舊密碼</label>
          <input v-model="pwForm.oldPassword" type="password" placeholder="請輸入舊密碼"
                 class="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">新密碼</label>
          <input v-model="pwForm.newPassword" type="password" placeholder="請輸入新密碼"
                 class="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">確認新密碼</label>
          <input v-model="pwForm.confirm" type="password" placeholder="再次輸入新密碼"
                 @keydown.enter="changePassword"
                 class="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <p v-if="pwError" class="text-xs text-red-500">{{ pwError }}</p>
        <div class="flex gap-2 pt-1">
          <button @click="pwModal = false"
                  class="flex-1 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">
            取消
          </button>
          <button @click="changePassword" :disabled="pwLoading"
                  class="flex-1 py-2.5 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-teal-300 transition-colors flex items-center justify-center gap-1.5">
            <div v-if="pwLoading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ pwLoading ? '更新中…' : '確認修改' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
