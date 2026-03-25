<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">田</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">田園餐廳 · 訂位管理</h1>
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

            <!-- 月份導覽 -->
            <div class="flex items-center justify-between mb-3">
              <button @click="prevMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="text-base font-semibold text-stone-700 dark:text-stone-100">{{ calendarLabel }}</span>
              <button @click="nextMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            <!-- 星期標題 -->
            <div class="grid grid-cols-7 mb-1">
              <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                   class="text-center text-sm text-stone-400 dark:text-stone-500 font-medium py-1">{{ w }}</div>
            </div>

            <!-- 日期格 -->
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(day, idx) in calendarDays" :key="idx"
                   class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                   :class="dayClass(day)"
                   @click="day.date && selectDate(day.date)">
                <span>{{ day.label }}</span>
                <!-- 紅點：有訂位 -->
                <span v-if="day.date && markedDates.includes(day.date)"
                      class="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-500"></span>
              </div>
            </div>

            <!-- 底部資訊 -->
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
              <span class="text-sm text-stone-500 dark:text-stone-400">
                <span v-if="selectedDate" class="text-stone-700 dark:text-stone-200 font-medium">{{ selectedDate }}</span>
                <span v-else>請選擇日期</span>
              </span>
              <button @click="selectDate(todayStr)" class="text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium">今天</button>
            </div>
          </div>

          <!-- 當日統計 -->
          <div v-if="selectedDate" class="mt-3 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-4">
            <p class="text-sm text-green-700 dark:text-green-300 font-medium">
              {{ selectedDate }} 共 <span class="text-lg font-bold">{{ bookings.length }}</span> 筆訂位
            </p>
            <p class="text-sm text-green-600 dark:text-green-400 mt-0.5">
              共 <span class="font-semibold">{{ bookings.reduce((s, b) => s + b.guests, 0) }}</span> 人
            </p>
          </div>
        </div>

        <!-- ── 右欄：訂位列表 ── -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">
              {{ selectedDate ? selectedDate + ' 訂位明細' : '請選擇日期' }}
            </h2>
            <button v-if="selectedDate" @click="openModal(null)"
                    class="flex items-center gap-1 px-3 py-1.5 bg-green-800 text-white text-sm rounded-lg hover:bg-green-900 transition-colors">
              <span class="text-base leading-none">+</span> 新增訂位
            </button>
          </div>

          <!-- 訂位卡片列表 -->
          <div v-if="selectedDate" class="space-y-3">
            <div v-if="bookings.length === 0"
                 class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-10 text-center text-stone-400 text-sm shadow-sm">
              今天還沒有訂位紀錄
            </div>

            <div v-for="booking in bookings" :key="booking.id"
                 class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
              <div class="flex items-stretch">

                <!-- 時間條 -->
                <div class="w-20 flex-shrink-0 bg-stone-50 dark:bg-zinc-800 flex flex-col items-center justify-center border-r border-stone-200 dark:border-stone-700 py-4">
                  <span class="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wide">TIME</span>
                  <span class="text-xl font-black text-stone-700 dark:text-stone-100 leading-tight mt-0.5">{{ booking.time }}</span>
                </div>

                <!-- 主要資訊 -->
                <div class="flex-1 px-4 py-3">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-stone-800 dark:text-stone-100 text-base">{{ booking.name }}</span>
                        <!-- 狀態 badge，點擊切換 -->
                        <button @click="toggleStatus(booking)"
                                :class="booking.status === '已確認'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700'"
                                class="px-2 py-0.5 rounded-full text-xs font-medium transition-colors hover:opacity-80">
                          {{ booking.status }}
                        </button>
                      </div>
                      <div class="flex flex-wrap gap-3 mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                        <span class="flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                          {{ booking.guests }} 人
                        </span>
                        <span class="flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                          </svg>
                          {{ booking.phone }}
                        </span>
                        <span v-if="booking.note" class="flex items-center gap-1 text-stone-400 dark:text-stone-500">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                          </svg>
                          {{ booking.note }}
                        </span>
                      </div>
                    </div>

                    <!-- 操作按鈕 -->
                    <div class="flex gap-1.5 flex-shrink-0">
                      <button @click="openModal(booking)"
                              class="px-2.5 py-1 text-sm border border-blue-300 dark:border-blue-700 text-blue-500 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        編輯
                      </button>
                      <button @click="confirmDelete(booking)"
                              class="px-2.5 py-1 text-sm border border-red-300 dark:border-red-700 text-red-400 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 未選日期 -->
          <div v-else class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-12 text-center text-stone-400 text-sm shadow-sm">
            請從左側日曆選擇日期
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 新增/編輯 Modal ════════ -->
    <div v-if="modal.show" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-bold text-stone-800 dark:text-stone-100 mb-4">
          {{ modal.isNew ? '新增訂位' : '編輯訂位' }}
        </h3>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">客戶名稱 *</label>
              <input v-model="form.name" type="text" placeholder="請輸入姓名"
                     class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">連絡電話 *</label>
              <input v-model="form.phone" type="tel" placeholder="09xx-xxx-xxx"
                     class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">人數</label>
              <input v-model.number="form.guests" type="number" min="1"
                     class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">用餐時間</label>
              <select v-model="form.time"
                      class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">狀態</label>
            <div class="flex gap-3">
              <label v-for="s in ['待確認','已確認','已取消']" :key="s"
                     class="flex items-center gap-2 cursor-pointer text-sm text-stone-600 dark:text-stone-300">
                <input type="radio" v-model="form.status" :value="s" class="accent-green-700" />
                {{ s }}
              </label>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">備註</label>
            <textarea v-model="form.note" placeholder="特殊需求、過敏原等" rows="3"
                      class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="modal.show = false"
                  class="flex-1 px-4 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
            取消
          </button>
          <button @click="saveBooking"
                  :disabled="!form.name || !form.phone"
                  class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 transition-colors disabled:opacity-50">
            {{ modal.isNew ? '新增' : '儲存' }}
          </button>
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
import {ref, computed, reactive, onMounted} from 'vue'
import { useCommonStore } from '~/stores/common.js'

const commonStore = useCommonStore()
const BASE = commonStore.data.main_url + '/holy/booking'

// ── 狀態 ──────────────────────────────────────────────────────────
const apiOnline = ref(false)
const bookings = ref([])
const markedDates = ref([])   // 有訂位的日期（紅點）
const selectedDate = ref('')

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)  // 1-based

const timeSlots = ['11:00', '11:30', '12:00', '12:30', '13:00', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30']

// ── 日曆 computed ─────────────────────────────────────────────────
const calendarLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)

const calendarDays = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({label: '', date: null})
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push({label: d, date: `${calYear.value}-${mm}-${dd}`})
  }
  return days
})

const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-green-700 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold hover:bg-green-200'
  return 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
}

const prevMonth = () => {
  if (calMonth.value === 1) {
    calYear.value--;
    calMonth.value = 12
  } else calMonth.value--
  fetchMarkedDates()
}
const nextMonth = () => {
  if (calMonth.value === 12) {
    calYear.value++;
    calMonth.value = 1
  } else calMonth.value++
  fetchMarkedDates()
}

const selectDate = async (date) => {
  selectedDate.value = date
  await fetchBookings()
}

// ── Modal ─────────────────────────────────────────────────────────
const modal = reactive({show: false, isNew: true})
const form = reactive({id: '', date: '', name: '', phone: '', guests: 2, time: '12:00', status: '待確認', note: ''})

const openModal = (booking) => {
  modal.isNew = !booking
  if (booking) {
    Object.assign(form, booking)
  } else {
    Object.assign(form, {
      id: '',
      date: selectedDate.value,
      name: '',
      phone: '',
      guests: 2,
      time: '12:00',
      status: '待確認',
      note: ''
    })
  }
  modal.show = true
}

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({show: false, message: ''})
const showToast = (msg) => {
  toast.message = msg;
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

// ── API ───────────────────────────────────────────────────────────
const yearMonth = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`)

const fetchMarkedDates = async () => {
  try {
    const res = await fetch(`${BASE}/dates/${yearMonth.value}`)
    markedDates.value = await res.json()
    apiOnline.value = true
  } catch {
    apiOnline.value = false
  }
}

const fetchBookings = async () => {
  if (!selectedDate.value) return
  try {
    const res = await fetch(`${BASE}/get/${selectedDate.value}`)
    bookings.value = await res.json()
  } catch (e) {
    console.error(e)
  }
}

const saveBooking = async () => {
  if (!form.name || !form.phone) return
  try {
    if (modal.isNew) {
      const res = await fetch(`${BASE}/save`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...form, date: selectedDate.value})
      })
      const saved = await res.json()
      bookings.value.push(saved)
      bookings.value.sort((a, b) => a.time.localeCompare(b.time))
      if (!markedDates.value.includes(selectedDate.value)) {
        markedDates.value.push(selectedDate.value)
      }
      showToast('訂位已新增')
    } else {
      await fetch(`${BASE}/update`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(form)
      })
      await fetchBookings()
      showToast('訂位已更新')
    }
    modal.show = false
  } catch (e) {
    console.error(e)
  }
}

const confirmDelete = async (booking) => {
  if (!confirm(`確定刪除「${booking.name}」的訂位？`)) return
  try {
    await fetch(`${BASE}/remove/${booking.date}/${booking.id}`, {method: 'DELETE'})
    bookings.value = bookings.value.filter(b => b.id !== booking.id)
    // 若當天無訂位，移除紅點
    if (bookings.value.length === 0) {
      markedDates.value = markedDates.value.filter(d => d !== selectedDate.value)
    }
    showToast('訂位已刪除')
  } catch (e) {
    console.error(e)
  }
}

const toggleStatus = async (booking) => {
  const next = booking.status === '已確認' ? '待確認' : '已確認'
  try {
    await fetch(`${BASE}/status/${booking.date}/${booking.id}?status=${encodeURIComponent(next)}`, {method: 'PATCH'})
    booking.status = next
    showToast(`狀態已更新為「${next}」`)
  } catch (e) {
    console.error(e)
  }
}

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchMarkedDates()
  selectedDate.value = todayStr
  await fetchBookings()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
