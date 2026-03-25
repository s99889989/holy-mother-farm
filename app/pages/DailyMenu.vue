<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-orange-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">菜</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">田園餐廳 · 每日菜色</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Holy Mother Farm</p>
          </div>
        </div>
        <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
          <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
          <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
        </span>
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
                <span v-if="day.date && markedDates.includes(day.date)"
                  class="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
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

          <!-- 當日統計 -->
          <div v-if="selectedDate && menuItems.length > 0"
            class="mt-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 p-4">
            <p class="text-sm text-orange-700 dark:text-orange-300 font-medium">
              今日共 <span class="text-lg font-bold">{{ menuItems.length }}</span> 道菜
            </p>
          </div>
        </div>

        <!-- ── 右欄：菜色列表 ── -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">
              {{ selectedDate ? selectedDate + ' 菜色' : '請選擇日期' }}
            </h2>
            <button v-if="selectedDate" @click="openModal(null)"
              class="flex items-center gap-1 px-3 py-1.5 bg-orange-700 text-white text-sm rounded-lg hover:bg-orange-800 transition-colors">
              <span class="text-base leading-none">+</span> 新增菜色
            </button>
          </div>

          <!-- 菜色卡片 -->
          <div v-if="selectedDate">
            <div v-if="menuItems.length === 0"
              class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-10 text-center text-stone-400 text-sm shadow-sm">
              今天還沒有菜色紀錄
            </div>

            <div class="space-y-4">
              <div v-for="item in menuItems" :key="item.id"
                class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">

                <!-- 圖片橫幅（有圖才顯示）-->
                <div v-if="item.images && item.images.length > 0" class="relative">
                  <div class="flex gap-1 p-2 overflow-x-auto scrollbar-none">
                    <div v-for="(url, idx) in item.images" :key="idx"
                      class="flex-shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 cursor-pointer hover:opacity-90 transition-opacity"
                      @click="previewUrl = imgUrl(url)">
                      <img :src="imgUrl(url)" :alt="item.name" class="w-full h-full object-cover" />
                    </div>
                    <!-- 新增圖片按鈕 -->
                    <button @click="openImageUpload(item)"
                      class="flex-shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-300 hover:border-orange-500 hover:text-orange-400 transition-colors">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    </button>
                  </div>
                </div>

                <!-- 菜色內容 -->
                <div class="px-4 py-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1">
                      <h3 class="font-bold text-stone-800 dark:text-stone-100 text-lg">{{ item.name }}</h3>

                      <!-- 食材標籤 -->
                      <div v-if="item.ingredients && item.ingredients.length > 0" class="flex flex-wrap gap-1.5 mt-2">
                        <span v-for="ing in item.ingredients" :key="ing"
                          class="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-full">
                          {{ ing }}
                        </span>
                      </div>

                      <p v-if="item.note" class="text-sm text-stone-400 dark:text-stone-500 mt-2">{{ item.note }}</p>
                    </div>

                    <!-- 操作按鈕 -->
                    <div class="flex flex-col gap-1.5 flex-shrink-0">
                      <button @click="openModal(item)"
                        class="px-2.5 py-1 text-sm border border-blue-300 dark:border-blue-700 text-blue-500 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        編輯
                      </button>
                      <button v-if="!item.images || item.images.length === 0" @click="openImageUpload(item)"
                        class="px-2.5 py-1 text-sm border border-orange-300 dark:border-orange-700 text-orange-500 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                        圖片
                      </button>
                      <button @click="confirmDelete(item)"
                        class="px-2.5 py-1 text-sm border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        刪除
                      </button>
                    </div>
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

    <!-- ════════ 新增/編輯 Modal ════════ -->
    <div v-if="modal.show" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-bold text-stone-800 dark:text-stone-100 mb-4">{{ modal.isNew ? '新增菜色' : '編輯菜色' }}</h3>

        <div class="space-y-4">
          <!-- 菜名 -->
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">菜名 *</label>
            <input v-model="form.name" type="text" placeholder="例：農莊時蔬炒飯"
              class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>

          <!-- 食材 -->
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-2">食材清單</label>

            <!-- 從品項選 -->
            <div class="mb-2">
              <p class="text-xs text-stone-400 mb-1.5">從現有品項選取</p>
              <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-stone-50 dark:bg-zinc-800 rounded-lg border border-stone-200 dark:border-stone-700">
                <button v-for="item in allItems" :key="item.key"
                  @click="toggleIngredient(item.name)"
                  :class="form.ingredients.includes(item.name)
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-white dark:bg-zinc-700 text-stone-600 dark:text-stone-200 border-stone-200 dark:border-stone-600 hover:border-orange-400'"
                  class="px-2 py-0.5 text-sm border rounded-full transition-colors">
                  {{ item.name }}
                </button>
              </div>
            </div>

            <!-- 手動輸入 -->
            <div class="flex gap-2">
              <input v-model="ingredientInput" type="text" placeholder="手動輸入食材"
                @keydown.enter.prevent="addIngredient"
                class="flex-1 border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <button @click="addIngredient"
                class="px-3 py-2 bg-orange-700 text-white text-sm rounded-lg hover:bg-orange-800 transition-colors">新增</button>
            </div>

            <!-- 已選食材 -->
            <div v-if="form.ingredients.length > 0" class="flex flex-wrap gap-1.5 mt-2">
              <span v-for="(ing, idx) in form.ingredients" :key="idx"
                class="flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-full">
                {{ ing }}
                <button @click="form.ingredients.splice(idx, 1)" class="text-green-400 hover:text-red-500 transition-colors leading-none">×</button>
              </span>
            </div>
          </div>

          <!-- 備註 -->
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">備註</label>
            <textarea v-model="form.note" placeholder="特殊說明、烹調方式等" rows="2"
              class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          </div>
        </div>

        <div class="flex gap-2 mt-5">
          <button @click="modal.show = false"
            class="flex-1 px-4 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">取消</button>
          <button @click="saveMenuItem" :disabled="!form.name"
            class="flex-1 px-4 py-2.5 text-sm bg-orange-700 text-white rounded-xl hover:bg-orange-800 transition-colors disabled:opacity-50">
            {{ modal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ 圖片上傳 Modal ════════ -->
    <div v-if="imageModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-bold text-stone-800 dark:text-stone-100">圖片管理</h3>
            <p class="text-xs text-stone-400 mt-0.5">{{ imageModal.item?.name }}</p>
          </div>
          <button @click="imageModal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- 現有圖片 -->
        <div class="mb-4">
          <p class="text-sm font-medium text-stone-500 dark:text-stone-400 mb-2">現有圖片（{{ imageModal.images.length }} 張）</p>
          <div v-if="imageModal.images.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <div v-for="(url, idx) in imageModal.images" :key="idx"
              class="relative group aspect-square rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
              <img :src="imgUrl(url)" :alt="`圖片 ${idx+1}`" class="w-full h-full object-cover cursor-pointer" @click="previewUrl = imgUrl(url)" />
              <button @click="deleteMenuImage(idx)"
                class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity hover:bg-red-600">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <p v-else class="text-sm text-stone-400 py-4 text-center border border-dashed border-stone-200 dark:border-stone-700 rounded-xl">尚無圖片</p>
        </div>

        <!-- 上傳區 -->
        <div @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="handleDrop"
          :class="dragOver ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-stone-300 dark:border-stone-600 hover:border-orange-400'"
          class="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all" @click="fileInputRef?.click()">
          <svg class="w-8 h-8 mx-auto mb-2 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          <p class="text-sm text-stone-500 dark:text-stone-400">點擊或拖曳圖片上傳</p>
          <p class="text-xs text-stone-400 mt-0.5">支援 JPG、PNG、WebP，可多張</p>
          <input ref="fileInputRef" type="file" multiple accept="image/*" class="hidden" @change="handleFileSelect" />
        </div>

        <div v-if="uploading" class="mt-3 flex items-center gap-2 text-sm text-stone-500">
          <div class="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          上傳中…
        </div>

        <button @click="imageModal.show = false"
          class="mt-4 w-full px-4 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors">
          關閉
        </button>
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

const BASE       = 'http://localhost:9100/holy/menu'
const API_ORIGIN = 'http://localhost:9100'

const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_ORIGIN + path
}

// ── 狀態 ──────────────────────────────────────────────────────────
const apiOnline      = ref(false)
const menuItems      = ref([])
const markedDates    = ref([])
const allItems       = ref([])   // 來自 restaurant + shop 的所有品項（供食材選取）
const selectedDate   = ref('')
const previewUrl     = ref('')
const fileInputRef   = ref(null)
const dragOver       = ref(false)
const uploading      = ref(false)
const ingredientInput = ref('')

const today    = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const calYear  = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)

// ── 日曆 ──────────────────────────────────────────────────────────
const calLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)
const calDays  = computed(() => {
  const firstDay    = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0'), dd = String(d).padStart(2, '0')
    days.push({ label: d, date: `${calYear.value}-${mm}-${dd}` })
  }
  return days
})
const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-orange-700 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-semibold hover:bg-orange-200'
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
  await fetchMenuItems()
}

// ── Modal ─────────────────────────────────────────────────────────
const modal = reactive({ show: false, isNew: true })
const form  = reactive({ id: '', date: '', name: '', ingredients: [], note: '' })

const openModal = (item) => {
  modal.isNew = !item
  if (item) { Object.assign(form, { ...item, ingredients: [...item.ingredients] }) }
  else { Object.assign(form, { id: '', date: selectedDate.value, name: '', ingredients: [], note: '' }) }
  modal.show = true
}

const imageModal = reactive({ show: false, item: null, images: [] })
const openImageUpload = (item) => {
  imageModal.item = item
  imageModal.images = [...(item.images || [])]
  imageModal.show = true
}

// ── 食材 ──────────────────────────────────────────────────────────
const toggleIngredient = (name) => {
  const idx = form.ingredients.indexOf(name)
  if (idx >= 0) form.ingredients.splice(idx, 1)
  else form.ingredients.push(name)
}
const addIngredient = () => {
  const val = ingredientInput.value.trim()
  if (val && !form.ingredients.includes(val)) form.ingredients.push(val)
  ingredientInput.value = ''
}

// ── 圖片 ──────────────────────────────────────────────────────────
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
    // 同步更新 menuItems
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
    const res = await fetch(`${BASE}/dates/${yearMonth.value}`)
    markedDates.value = await res.json()
    apiOnline.value = true
  } catch { apiOnline.value = false }
}

const fetchMenuItems = async () => {
  if (!selectedDate.value) return
  try { menuItems.value = await (await fetch(`${BASE}/get/${selectedDate.value}`)).json() }
  catch (e) { console.error(e) }
}

// 同時拉田園餐廳和休憩小舖的品項，合併供食材選取
const fetchAllItems = async () => {
  try {
    const [r, s] = await Promise.all([
      fetch('http://localhost:9100/holy/restaurant/items/get').then(r => r.json()).catch(() => []),
      fetch('http://localhost:9100/holy/shop/items/get').then(r => r.json()).catch(() => [])
    ])
    allItems.value = [...r, ...s]
  } catch (e) { console.error(e) }
}

const saveMenuItem = async () => {
  if (!form.name) return
  try {
    if (modal.isNew) {
      const res = await fetch(`${BASE}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, date: selectedDate.value })
      })
      const saved = await res.json()
      menuItems.value.push(saved)
      if (!markedDates.value.includes(selectedDate.value)) markedDates.value.push(selectedDate.value)
      showToast('菜色已新增')
    } else {
      await fetch(`${BASE}/update`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      await fetchMenuItems()
      showToast('菜色已更新')
    }
    modal.show = false
  } catch (e) { console.error(e) }
}

const confirmDelete = async (item) => {
  if (!confirm(`確定刪除「${item.name}」？`)) return
  try {
    await fetch(`${BASE}/remove/${item.date}/${item.id}`, { method: 'DELETE' })
    menuItems.value = menuItems.value.filter(i => i.id !== item.id)
    if (menuItems.value.length === 0) markedDates.value = markedDates.value.filter(d => d !== selectedDate.value)
    showToast('菜色已刪除')
  } catch (e) { console.error(e) }
}

onMounted(async () => {
  await Promise.all([fetchMarkedDates(), fetchAllItems()])
  selectedDate.value = todayStr
  await fetchMenuItems()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
