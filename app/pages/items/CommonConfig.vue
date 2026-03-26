<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-stone-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">設</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">設定管理</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">common.yml — 共用設定</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
            <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
            <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
          </span>
          <button @click="saveCommon"
            class="px-3 py-1.5 bg-green-800 text-white text-sm rounded-lg hover:bg-green-900 transition-colors">
            儲存設定
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <!-- 品項類別 -->
        <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4">
          <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-100 mb-3">品項類別</h3>
          <div class="space-y-2">
            <div v-for="(cat, key) in commonConfig.categories" :key="key" class="flex items-center gap-2">
              <span class="text-xs text-stone-400 w-5 flex-shrink-0">{{ key }}</span>
              <input v-model="cat.name" type="text" placeholder="中文名稱"
                class="flex-1 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 min-w-0" />
              <input v-model="cat.en" type="text" placeholder="英文 key" maxlength="20"
                class="w-24 bg-white dark:bg-zinc-800 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg px-2 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0" />
              <button @click="removeCategory(key)"
                class="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <button @click="addCategory" class="mt-3 text-sm text-green-700 dark:text-green-400 hover:text-green-800">+ 新增類別</button>
        </div>

        <!-- 單位 -->
        <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4">
          <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-100 mb-3">單位</h3>
          <div class="space-y-2">
            <div v-for="(unit, key) in commonConfig.units" :key="key" class="flex items-center gap-2">
              <span class="text-xs text-stone-400 w-5 flex-shrink-0">{{ key }}</span>
              <input v-model="unit.name" type="text"
                class="flex-1 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              <button @click="removeUnit(key)"
                class="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <button @click="addUnit" class="mt-3 text-sm text-green-700 dark:text-green-400 hover:text-green-800">+ 新增單位</button>
        </div>

        <!-- 製造商 / 供應商 -->
        <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4">
          <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-100 mb-3">製造商 / 供應商</h3>
          <div class="space-y-2">
            <div v-for="(make, key) in commonConfig.makes" :key="key" class="flex items-center gap-2">
              <span class="text-xs text-stone-400 w-5 flex-shrink-0">{{ key }}</span>
              <input v-model="make.name" type="text"
                class="flex-1 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 min-w-0" />
              <select v-model="make.role"
                class="border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-1.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0">
                <option value="self">自己</option>
                <option value="supplier">供應商</option>
                <option value="partner">姊妹店</option>
              </select>
              <button @click="removeMake(key)"
                class="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <button @click="addMake" class="mt-3 text-sm text-green-700 dark:text-green-400 hover:text-green-800">+ 新增</button>
        </div>

      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const commonStore = useCommonStore()
const BASE        = commonStore.data.main_url + '/holy'

const apiOnline    = reactive({ value: false })
const commonConfig = reactive({ units: {}, categories: {}, makes: {} })
const toast        = reactive({ show: false, message: '' })

const showToast = (msg) => {
  toast.message = msg; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

// ── 新增 ──────────────────────────────────────────────────────────
const addCategory = () => {
  const key = String(Object.keys(commonConfig.categories).length + 1)
  commonConfig.categories[key] = { name: '', en: '' }
}
const addUnit = () => {
  const key = String(Object.keys(commonConfig.units).length + 1)
  commonConfig.units[key] = { name: '' }
}
const addMake = () => {
  const key = String(Object.keys(commonConfig.makes).length + 1)
  commonConfig.makes[key] = { name: '', role: 'supplier' }
}

// ── 刪除 ──────────────────────────────────────────────────────────
const removeCategory = (key) => { delete commonConfig.categories[key] }
const removeUnit     = (key) => { delete commonConfig.units[key] }
const removeMake     = (key) => { delete commonConfig.makes[key] }

// ── API ───────────────────────────────────────────────────────────
const fetchCommon = async () => {
  try {
    const res = await fetch(`${BASE}/common/get`)
    Object.assign(commonConfig, await res.json())
    apiOnline.value = true
  } catch { apiOnline.value = false }
}

const saveCommon = async () => {
  try {
    await fetch(`${BASE}/common/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commonConfig)
    })
    showToast('設定已儲存')
  } catch (e) {
    console.error(e)
    showToast('儲存失敗')
  }
}

onMounted(fetchCommon)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
