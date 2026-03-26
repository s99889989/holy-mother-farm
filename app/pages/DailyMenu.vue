<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-orange-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">菜</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">田園餐廳 · 每日菜色</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Holy Mother Farm</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
            <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
            <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
          </span>
          <!-- 編輯 / 查看切換 -->
          <button @click="isEditMode = !isEditMode"
                  :class="isEditMode
              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700'
              : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors">
            <svg v-if="isEditMode" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            {{ isEditMode ? '編輯中' : '查看' }}
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="flex flex-col lg:flex-row gap-4 items-start">

        <!-- ── 左欄：日曆 ── -->
        <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 lg:sticky lg:top-20">
            <div class="flex items-center justify-between mb-3">
              <button @click="prevMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <span class="text-base font-semibold text-stone-700 dark:text-stone-100">{{ calLabel }}</span>
              <button @click="nextMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
            <div class="grid grid-cols-7 mb-1">
              <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                   class="text-center text-sm text-stone-400 dark:text-stone-500 font-medium py-1">{{ w }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(day, idx) in calDays" :key="idx"
                   class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                   :class="dayClass(day)"
                   @click="day.date && selectDate(day.date)">
                <span>{{ day.label }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
              <span class="text-sm text-stone-500 dark:text-stone-400">
                <span v-if="selectedDate" class="text-stone-700 dark:text-stone-200 font-medium">{{ selectedDate }}</span>
                <span v-else>請選擇日期</span>
              </span>
              <button @click="selectDate(todayStr)" class="text-sm text-orange-700 dark:text-orange-400 hover:text-orange-800 font-medium">今天</button>
            </div>
          </div>
        </div>

        <!-- ── 右欄：菜色分類 ── -->
        <div class="flex-1 min-w-0">
          <div v-if="selectedDate">
            <div class="space-y-5">
              <div v-for="section in sections" :key="section.type">
                <!-- 分類標題 -->
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold text-stone-700 dark:text-stone-100 flex items-center gap-2">
                    <span :class="section.badge">{{ section.label }}</span>
                    <span class="text-sm font-normal text-stone-400">{{ itemsByType(section.type).length }} 道</span>
                  </h3>
                  <button v-if="isEditMode" @click="addItem(section.type)"
                          class="text-sm text-stone-400 hover:text-orange-600 transition-colors flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    新增
                  </button>
                </div>

                <!-- 品項卡片 -->
                <div class="space-y-2">
                  <div v-for="item in itemsByType(section.type)" :key="item.id"
                       class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">

                    <!-- 圖片列 -->
                    <div v-if="item.images && item.images.length > 0"
                         class="flex gap-1 p-2 overflow-x-auto scrollbar-none">
                      <div v-for="(url, imgIdx) in item.images" :key="imgIdx"
                           :class="isEditMode ? 'w-20 h-20' : 'w-28 h-28 sm:w-36 sm:h-36'"
                           class="flex-shrink-0 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 cursor-pointer hover:opacity-90 transition-all"
                           @click="previewUrl = imgUrl(url)">
                        <img :src="imgUrl(url)" :alt="item.name" class="w-full h-full object-cover" />
                      </div>
                      <button v-if="isEditMode" @click="openImageUpload(item)"
                              class="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-300 hover:border-orange-400 hover:text-orange-400 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                      </button>
                    </div>

                    <div class="px-4 py-3">
                      <div class="flex items-start gap-3">
                        <div class="flex-1 min-w-0">
                          <!-- 菜名 -->
                          <input v-if="isEditMode" v-model="item.name"
                                 :placeholder="section.placeholder"
                                 @blur="autoSave(item)"
                                 class="w-full font-semibold text-stone-800 dark:text-stone-100 text-base bg-transparent border-b border-transparent hover:border-stone-200 dark:hover:border-stone-600 focus:border-orange-400 focus:outline-none pb-0.5 transition-colors" />
                          <p v-else class="font-bold text-stone-800 dark:text-stone-100 text-lg leading-snug">
                            {{ item.name || '（未填）' }}
                          </p>

                          <!-- 食材標籤 -->
                          <div class="flex flex-wrap gap-1 mt-2 items-center">
                            <span v-for="(ing, ingIdx) in item.ingredients" :key="ingIdx"
                                  class="flex items-center gap-0.5 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs rounded-full">
                              {{ ing }}
                              <button v-if="isEditMode" @click="item.ingredients.splice(ingIdx, 1); autoSave(item)"
                                      class="text-green-300 hover:text-red-400 leading-none ml-0.5">×</button>
                            </span>
                            <input v-if="isEditMode"
                                   v-model="ingredientDraft[item.id]"
                                   placeholder="+ 食材"
                                   @keydown.enter.prevent="addIngredientToItem(item)"
                                   @blur="addIngredientToItem(item)"
                                   class="px-2 py-0.5 text-xs bg-stone-50 dark:bg-zinc-800 border border-dashed border-stone-300 dark:border-stone-600 rounded-full text-stone-400 focus:outline-none focus:border-orange-400 w-16 focus:w-28 transition-all" />
                          </div>

                          <!-- 備註 -->
                          <input v-if="isEditMode && (item.note || showNote[item.id])"
                                 v-model="item.note"
                                 placeholder="備註…"
                                 @blur="autoSave(item)"
                                 class="w-full text-xs text-stone-400 dark:text-stone-500 bg-transparent border-none focus:outline-none mt-1.5 italic" />
                          <p v-else-if="!isEditMode && item.note"
                             class="text-sm text-stone-400 dark:text-stone-500 mt-1.5 italic">{{ item.note }}</p>
                        </div>

                        <!-- 操作（僅編輯模式）-->
                        <div v-if="isEditMode" class="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                          <button v-if="!item.images || item.images.length === 0"
                                  @click="openImageUpload(item)"
                                  class="p-1.5 text-stone-300 hover:text-orange-500 transition-colors" title="新增圖片">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                          </button>
                          <button @click="showNote[item.id] = !showNote[item.id]"
                                  class="p-1.5 text-stone-300 hover:text-stone-500 transition-colors" title="備註">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                          </button>
                          <button @click="confirmDelete(item)"
                                  class="p-1.5 text-stone-200 hover:text-red-400 transition-colors" title="刪除">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="itemsByType(section.type).length === 0"
                       class="text-center py-4 text-stone-300 dark:text-stone-600 text-sm border border-dashed border-stone-200 dark:border-stone-700 rounded-2xl">
                    尚無{{ section.label }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-12 text-center text-stone-400 text-sm shadow-sm">
            請從左側日曆選擇日期
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 圖片上傳 Modal ════════ -->
    <div v-if="imageModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-bold text-stone-800 dark:text-stone-100">圖片管理</h3>
            <p class="text-xs text-stone-400 mt-0.5">{{ imageModal.item?.name || '未命名' }}</p>
          </div>
          <button @click="imageModal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="mb-4">
          <div v-if="imageModal.images.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <div v-for="(url, idx) in imageModal.images" :key="idx"
                 class="relative group aspect-square rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
              <img :src="imgUrl(url)" class="w-full h-full object-cover cursor-pointer" @click="previewUrl = imgUrl(url)" />
              <button @click="deleteMenuImage(idx)"
                      class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 hover:bg-red-600">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <p v-else class="text-sm text-stone-400 py-4 text-center border border-dashed border-stone-200 dark:border-stone-700 rounded-xl">尚無圖片</p>
        </div>
        <div @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="handleDrop"
             :class="dragOver ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-stone-300 dark:border-stone-600 hover:border-orange-400'"
             class="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all" @click="fileInputRef?.click()">
          <svg class="w-8 h-8 mx-auto mb-2 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          <p class="text-sm text-stone-500 dark:text-stone-400">點擊或拖曳圖片上傳</p>
          <input ref="fileInputRef" type="file" multiple accept="image/*" class="hidden" @change="handleFileSelect" />
        </div>
        <div v-if="uploading" class="mt-3 flex items-center gap-2 text-sm text-stone-500">
          <div class="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>上傳中…
        </div>
        <button @click="imageModal.show = false" class="mt-4 w-full px-4 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">關閉</button>
      </div>
    </div>

    <!-- 大圖預覽 -->
    <div v-if="previewUrl" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] cursor-pointer p-4" @click="previewUrl = ''">
      <img :src="previewUrl" class="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const commonStore = useCommonStore()
const BASE        = commonStore.data.main_url + '/holy/menu'
const API_ORIGIN  = commonStore.data.main_url

const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_ORIGIN + path
}

// ── 分類設定 ──────────────────────────────────────────────────────
const sections = [
  { type: 'dish', label: '菜',   badge: 'px-2 py-0.5 rounded-full text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold',  placeholder: '菜名…' },
  { type: 'soup', label: '湯',   badge: 'px-2 py-0.5 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold',    placeholder: '湯名…' },
  { type: 'tea',  label: '茶桶', badge: 'px-2 py-0.5 rounded-full text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold', placeholder: '茶名…' },
]

// ── 狀態 ──────────────────────────────────────────────────────────
const apiOnline       = ref(false)
const menuItems       = ref([])
const dateStatus      = ref({})   // { "2026-03-26": "complete" | "partial" }
const selectedDate    = ref('')
const previewUrl      = ref('')
const fileInputRef    = ref(null)
const dragOver        = ref(false)
const uploading       = ref(false)
const isEditMode      = ref(true)   // true=編輯，false=查看
const ingredientDraft = reactive({})
const showNote        = reactive({})

const today    = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const calYear  = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)

const itemsByType = (type) => menuItems.value.filter(i => i.type === type)

// ── 日曆 ──────────────────────────────────────────────────────────
const calLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)
const calDays  = computed(() => {
  const firstDay    = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2,'0'), dd = String(d).padStart(2,'0')
    days.push({ label: d, date: `${calYear.value}-${mm}-${dd}` })
  }
  return days
})
const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-orange-700 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-semibold hover:bg-orange-200'
  if (dateStatus.value[day.date] === 'complete') return 'text-green-600 dark:text-green-400 font-semibold hover:bg-stone-100 dark:hover:bg-zinc-700'
  if (dateStatus.value[day.date] === 'partial')  return 'text-amber-500 dark:text-amber-400 font-semibold hover:bg-stone-100 dark:hover:bg-zinc-700'
  return 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
}
const yearMonth = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2,'0')}`)

const prevMonth = () => {
  if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value--
  fetchMarkedDates()
}
const nextMonth = () => {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
  fetchMarkedDates()
}

const selectDate = async (date) => {
  selectedDate.value = date
  await fetch(`${BASE}/init/${date}`, { method: 'POST' })
  await fetchMenuItems()
  await fetchMarkedDates()   // 重新計算狀態（init 後可能從無到有）
}

// ── 食材 ──────────────────────────────────────────────────────────
const addIngredientToItem = (item) => {
  const val = (ingredientDraft[item.id] || '').trim()
  if (val && !item.ingredients.includes(val)) {
    item.ingredients.push(val)
    autoSave(item)
  }
  ingredientDraft[item.id] = ''
}

// ── 圖片 ──────────────────────────────────────────────────────────
const imageModal = reactive({ show: false, item: null, images: [] })
const openImageUpload = (item) => { imageModal.item = item; imageModal.images = [...(item.images || [])]; imageModal.show = true }
const handleFileSelect = (e) => uploadImages(Array.from(e.target.files))
const handleDrop = (e) => { dragOver.value = false; uploadImages(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))) }

const uploadImages = async (files) => {
  if (!imageModal.item || files.length === 0) return
  uploading.value = true
  try {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    const res = await fetch(`${BASE}/image/upload/${imageModal.item.date}/${imageModal.item.id}`, { method: 'POST', body: formData })
    const newPaths = await res.json()
    imageModal.images.push(...newPaths)
    const found = menuItems.value.find(i => i.id === imageModal.item.id)
    if (found) found.images = [...imageModal.images]
    showToast(`成功上傳 ${newPaths.length} 張圖片`)
  } catch { showToast('上傳失敗') }
  finally { uploading.value = false; if (fileInputRef.value) fileInputRef.value.value = '' }
}
const deleteMenuImage = async (idx) => {
  if (!confirm('確定刪除？')) return
  const url = imageModal.images[idx]
  const fileName = url.split('/').pop()
  try {
    await fetch(`${BASE}/image/remove/${imageModal.item.date}/${imageModal.item.id}?fileName=${fileName}`, { method: 'DELETE' })
    imageModal.images.splice(idx, 1)
    const found = menuItems.value.find(i => i.id === imageModal.item.id)
    if (found) found.images = [...imageModal.images]
    showToast('圖片已刪除')
  } catch (e) { console.error(e) }
}

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '' })
const showToast = (msg) => { toast.message = msg; toast.show = true; setTimeout(() => toast.show = false, 2500) }

// ── API ───────────────────────────────────────────────────────────
const fetchMarkedDates = async () => {
  try {
    dateStatus.value = await (await fetch(`${BASE}/dates/${yearMonth.value}`)).json()
    apiOnline.value = true
  } catch { apiOnline.value = false }
}

const fetchMenuItems = async () => {
  if (!selectedDate.value) return
  try {
    menuItems.value = await (await fetch(`${BASE}/get/${selectedDate.value}`)).json()
    menuItems.value.forEach(i => { if (!ingredientDraft[i.id]) ingredientDraft[i.id] = '' })
  } catch (e) { console.error(e) }
}

// blur 時自動儲存
const autoSave = async (item) => {
  if (!item.id) return
  try {
    await fetch(`${BASE}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    })
    await fetchMarkedDates()   // 更新完成狀態
  } catch (e) { console.error(e) }
}

const addItem = async (type) => {
  try {
    const res = await fetch(`${BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate.value, type, name: '', ingredients: [], images: [], note: '' })
    })
    const saved = await res.json()
    menuItems.value.push(saved)
    ingredientDraft[saved.id] = ''
  } catch (e) { console.error(e) }
}

const confirmDelete = async (item) => {
  if (!confirm(`確定刪除${item.name ? `「${item.name}」` : '這個項目'}？`)) return
  try {
    await fetch(`${BASE}/remove/${item.date}/${item.id}`, { method: 'DELETE' })
    menuItems.value = menuItems.value.filter(i => i.id !== item.id)
    showToast('已刪除')
  } catch (e) { console.error(e) }
}

onMounted(async () => {
  await fetchMarkedDates()
  selectedDate.value = todayStr
  await fetch(`${BASE}/init/${todayStr}`, { method: 'POST' })
  await fetchMenuItems()
  await fetchMarkedDates()   // init 後重新計算
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
