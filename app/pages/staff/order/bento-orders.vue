<script setup>
definePageMeta({layout: 'staff', requiredPermission: 'order.bento-orders'})
const commonStore = useCommonStore()
const LUNCH_BASE = computed(() => commonStore.data.main_url + '/holy/lunch')
const GROUP_BASE = computed(() => commonStore.data.main_url + '/holy/group-itinerary')
const HOURS_BASE = computed(() => commonStore.data.main_url + '/holy/restaurant/hours')
const TIMESLOT_BASE = computed(() => commonStore.data.main_url + '/holy/lunch/timeslot')

// ── 客戶訂餐連結 ──────────────────────────────────────────────────
const CUSTOMER_LUNCH_URL = 'https://holyfarm.netlify.app/front/order/bento'
const copyCustomerLunchLink = async () => {
  try {
    await navigator.clipboard.writeText(CUSTOMER_LUNCH_URL)
    showToast('連結已複製')
  } catch {
    showToast('複製失敗')
  }
}
const openCustomerLunchLink = () => {
  window.open(CUSTOMER_LUNCH_URL, '_blank')
}

// 團體行程名稱查表：便當訂單只存 groupItineraryId，要顯示名稱得另外查一次團體行程清單
const groupNamesById = ref({})
const fetchGroupNames = async () => {
  try {
    const list = await (await fetch(`${GROUP_BASE.value}/list`)).json()
    groupNamesById.value = Object.fromEntries((list || []).map(g => [g.id, g.name]))
  } catch { /* 團體行程功能非必要依賴，撈不到就不顯示徽章即可 */
  }
}

// ── 營業設定（唯讀，供日曆標示公休/臨時開放；要編輯請到「餐廳設定」頁面）──────
// 跟訂位共用同一份餐廳營業規則（RestaurantHoursController），不是便當自己一份
const hoursSettings = reactive({openWeekdays: [1, 2, 3, 4, 5], closedDates: {}, openDates: {}})
const fetchHoursSettings = async () => {
  try {
    const data = await (await fetch(`${HOURS_BASE.value}/get`)).json()
    hoursSettings.openWeekdays = data.openWeekdays || [1, 2, 3, 4, 5]
    hoursSettings.closedDates = data.closedDates || {}
    hoursSettings.openDates = data.openDates || {}
  } catch (e) {
    console.error(e)
  }
}
// 日曆上該日期的營業標記：'closed' 公休／'open' 臨時開放／null 依固定營業星期
const dayHoursMark = (date) => {
  if (hoursSettings.closedDates[date] !== undefined) return 'closed'
  if (hoursSettings.openDates[date] !== undefined) return 'open'
  return null
}

// ── 日曆 ──────────────────────────────────────────────────────────
const apiOnline = ref(false)
const selectedDate = ref('')
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)

const calendarLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)
const yearMonth = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`)

const calendarDays = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({label: '', date: null})
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0'), dd = String(d).padStart(2, '0')
    days.push({label: d, date: `${calYear.value}-${mm}-${dd}`})
  }
  return days
})

const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-orange-600 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-semibold hover:bg-orange-200'
  if (dayHoursMark(day.date) === 'closed') return 'text-hint-c opacity-50 hover-surface2'
  return 'text-base-c hover-surface2'
}

const prevMonth = () => {
  if (calMonth.value === 1) {
    calYear.value--
    calMonth.value = 12
  } else calMonth.value--
  fetchMarkedDates()
}
const nextMonth = () => {
  if (calMonth.value === 12) {
    calYear.value++
    calMonth.value = 1
  } else calMonth.value++
  fetchMarkedDates()
}

const selectDate = async (date) => {
  selectedDate.value = date
  await fetchLunchOrders()
}

// ── 便當狀態 ──────────────────────────────────────────────────────
const LUNCH_STATUSES = ['待確認', '已確認', '已取餐', '客戶提出取消', '已取消']
const lunchStatusClass = (status) => {
  switch (status) {
    case '已確認':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200'
    case '已取餐':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200'
    case '客戶提出取消':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200'
    case '已取消':
      return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200'
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200'
  }
}

// ── 24 小時制時間選擇（避免原生 time input 出現上午/下午） ──────────
const HOUR_OPTIONS = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({length: 12}, (_, i) => String(i * 5).padStart(2, '0'))
const timePart = (obj, key, part) => computed({
  get: () => {
    const [h, m] = (obj[key] || '00:00').split(':')
    return part === 'h' ? h : m
  },
  set: (v) => {
    const [h, m] = (obj[key] || '00:00').split(':')
    obj[key] = part === 'h' ? `${v}:${m}` : `${h}:${v}`
  }
})

// ── 取餐時間設定（便當獨立一份，不跟訂位共用）─────────────────────────
// 例如 11:30–13:00、interval=10，客人可選 11:30、11:40…12:50 取餐，後端也會依此驗證。
// 跟「時段標籤」（純顯示用，在營業設定頁面管理）是兩回事：這裡才是真正決定客人能選哪些
// 取餐時間的設定。
const pickupSlots = ref([])
const pickupSlotModal = reactive({show: false})
const pickupSlotEditingId = ref('')
const pickupSlotForm = reactive({id: '', name: '', startTime: '11:00', endTime: '14:00', color: 'orange', interval: 5, temporary: false, dates: {}})
const pickupSlotStartHour = timePart(pickupSlotForm, 'startTime', 'h')
const pickupSlotStartMinute = timePart(pickupSlotForm, 'startTime', 'm')
const pickupSlotEndHour = timePart(pickupSlotForm, 'endTime', 'h')
const pickupSlotEndMinute = timePart(pickupSlotForm, 'endTime', 'm')
const INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 60]

// 臨時時段（temporary=true）才會用到：指定它在哪幾天開放，那幾天會取代預設時段
// （同一天若有多筆臨時時段，那天就會同時看到那幾筆）。用法跟營業設定的「臨時開放日」類似。
const pickupSlotDateForm = reactive({date: '', note: ''})
const sortedPickupSlotDates = computed(() =>
  Object.entries(pickupSlotForm.dates || {}).sort((a, b) => a[0].localeCompare(b[0])))
const addPickupSlotDate = () => {
  if (!pickupSlotDateForm.date) return
  pickupSlotForm.dates[pickupSlotDateForm.date] = pickupSlotDateForm.note
  Object.assign(pickupSlotDateForm, {date: '', note: ''})
}
const removePickupSlotDate = (date) => {
  delete pickupSlotForm.dates[date]
}

const SLOT_COLORS = [
  {key: 'amber', label: '琥珀', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'},
  {key: 'orange', label: '橘', class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/40'},
  {key: 'indigo', label: '靛', class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40'},
  {key: 'purple', label: '紫', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/40'},
  {key: 'teal', label: '青', class: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800/40'},
]
const slotColorClass = (colorKey) => (SLOT_COLORS.find(c => c.key === colorKey) || SLOT_COLORS[0]).class

const sortedPickupSlots = computed(() => [...pickupSlots.value].sort((a, b) => a.startTime.localeCompare(b.startTime)))

const fetchPickupSlots = async () => {
  try {
    pickupSlots.value = await (await fetch(`${TIMESLOT_BASE.value}/list`)).json()
  } catch (e) {
    console.error(e)
  }
}

const openPickupSlotSettings = () => {
  openPickupSlotForm(null)
  pickupSlotModal.show = true
}

const openPickupSlotForm = (slot) => {
  if (slot) Object.assign(pickupSlotForm, {interval: 5, temporary: false, dates: {}, ...slot, dates: {...(slot.dates || {})}})
  else Object.assign(pickupSlotForm, {id: '', name: '', startTime: '11:00', endTime: '14:00', color: 'orange', interval: 5, temporary: false, dates: {}})
  Object.assign(pickupSlotDateForm, {date: '', note: ''})
  pickupSlotEditingId.value = slot ? slot.id : ''
}

const pickupSlotCanSave = computed(() =>
  !!pickupSlotForm.name && !!pickupSlotForm.startTime && !!pickupSlotForm.endTime
  && (!pickupSlotForm.temporary || Object.keys(pickupSlotForm.dates || {}).length > 0))

const savePickupSlot = async () => {
  if (!pickupSlotCanSave.value) return
  try {
    const saved = await (await fetch(`${TIMESLOT_BASE.value}/save`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...pickupSlotForm})
    })).json()
    const idx = pickupSlots.value.findIndex(p => p.id === saved.id)
    if (idx >= 0) pickupSlots.value[idx] = saved
    else pickupSlots.value.push(saved)
    openPickupSlotForm(null)
    showToast('取餐時間已儲存')
  } catch {
    showToast('儲存失敗')
  }
}

const deletePickupSlot = async (id) => {
  if (!confirm('確定刪除此取餐時間？')) return
  try {
    await fetch(`${TIMESLOT_BASE.value}/remove/${id}`, {method: 'DELETE'})
    pickupSlots.value = pickupSlots.value.filter(p => p.id !== id)
    if (pickupSlotEditingId.value === id) openPickupSlotForm(null)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

// ── 準備時間（便當專屬）────────────────────────────────────────────
// 例如設定 15 分鐘：客人「今天」下單時只能選現在時間＋15分鐘之後的取餐時段，
// 選明天以後的日期不受影響。客訂頁面會顯示說明文字告訴客人為什麼有些時間不能選。
const prepMinutes = ref(0)
const prepMinutesDraft = ref(0)

const fetchPrepMinutes = async () => {
  try {
    const r = await (await fetch(`${TIMESLOT_BASE.value}/prep-time`)).json()
    prepMinutes.value = r.prepMinutes || 0
    prepMinutesDraft.value = prepMinutes.value
  } catch (e) {
    console.error(e)
  }
}

const savePrepMinutes = async () => {
  try {
    const minutes = Math.max(0, Number(prepMinutesDraft.value) || 0)
    const r = await (await fetch(`${TIMESLOT_BASE.value}/prep-time/save?minutes=${minutes}`, {method: 'POST'})).json()
    prepMinutes.value = r.prepMinutes || 0
    prepMinutesDraft.value = prepMinutes.value
    showToast('準備時間已儲存')
  } catch {
    showToast('儲存失敗')
  }
}

// ── 便當資料 ──────────────────────────────────────────────────────
const lunchOrders = ref([])
const lunchMarkedDates = ref([])

const lunchModal = reactive({show: false, isNew: true})
const lForm = reactive({
  id: '', date: '', name: '', phone: '',
  meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, time: '11:30', status: '已確認', note: ''
})
const lFormHour = timePart(lForm, 'time', 'h')
const lFormMinute = timePart(lForm, 'time', 'm')

const totalMeat = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.meatQty) || 0), 0))
const totalFullVeg = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.fullVegQty) || 0), 0))
const totalEggVeg = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.eggVegQty) || 0), 0))
const totalSpiceVeg = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.spiceVegQty) || 0), 0))
const totalAll = computed(() => totalMeat.value + totalFullVeg.value + totalEggVeg.value + totalSpiceVeg.value)

const openLunchModal = (order) => {
  lunchModal.isNew = !order
  Object.assign(lForm, order ?? {
    id: '', date: selectedDate.value, name: '', phone: '',
    meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, time: '11:30', status: '已確認', note: ''
  })
  lunchModal.show = true
}

const fetchMarkedDates = async () => {
  try {
    const res = await fetch(`${LUNCH_BASE.value}/dates/${yearMonth.value}`)
    if (res.ok) lunchMarkedDates.value = await res.json()
    apiOnline.value = true
  } catch {
    apiOnline.value = false
  }
}

const fetchLunchOrders = async () => {
  if (!selectedDate.value) return
  lunchOrders.value = await (await fetch(`${LUNCH_BASE.value}/get/${selectedDate.value}`)).json()
}

const saveLunch = async () => {
  if (!lForm.name || !lForm.date) return
  if (lunchModal.isNew) {
    // staff=true：後台人工新增訂單，略過「該日是否開放線上訂購」檢查（例如公休日包場、臨時加開）
    const saved = await (await fetch(`${LUNCH_BASE.value}/save?staff=true`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...lForm})
    })).json()
    // 若新增的日期就是目前檢視中的日期，直接把訂單插入清單；否則清單留給下次選到該日期時再撈
    if (saved.date === selectedDate.value) {
      lunchOrders.value.push(saved)
      lunchOrders.value.sort((a, b) => a.time.localeCompare(b.time))
    }
    if (!lunchMarkedDates.value.includes(saved.date)) lunchMarkedDates.value.push(saved.date)
    showToast('便當訂單已新增')
  } else {
    await fetch(`${LUNCH_BASE.value}/update`, {
      method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(lForm)
    })
    await fetchLunchOrders()
    showToast('便當訂單已更新')
  }
  lunchModal.show = false
}

const confirmDeleteLunch = async (o) => {
  if (!confirm(`確定刪除「${o.name}」的便當訂單？`)) return
  await fetch(`${LUNCH_BASE.value}/remove/${o.date}/${o.id}`, {method: 'DELETE'})
  lunchOrders.value = lunchOrders.value.filter(x => x.id !== o.id)
  if (!lunchOrders.value.length) lunchMarkedDates.value = lunchMarkedDates.value.filter(d => d !== selectedDate.value)
  showToast('便當訂單已刪除')
}

const toggleLunchStatus = async (o) => {
  const idx = LUNCH_STATUSES.indexOf(o.status)
  const next = LUNCH_STATUSES[(idx + 1) % LUNCH_STATUSES.length]
  await fetch(`${LUNCH_BASE.value}/status/${o.date}/${o.id}?status=${encodeURIComponent(next)}`, {method: 'PATCH'})
  o.status = next
  showToast(`狀態已更新為「${next}」`)
}

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({show: false, message: ''})
const showToast = (msg) => {
  toast.message = msg
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchMarkedDates(), fetchHoursSettings(), fetchPickupSlots(), fetchPrepMinutes()])
  selectedDate.value = todayStr
  await fetchLunchOrders()
  fetchGroupNames()
})
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <!-- ── 頂部導覽 ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          >
            🍱
          </div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">
              田園餐廳 · 便當管理
            </h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">
              Holy Mother Farm
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover-surface2 text-hint-c font-medium transition-colors"
            title="複製客戶訂餐連結"
            @click="copyCustomerLunchLink"
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
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span class="hidden sm:inline">複製客戶訂購連結</span>
          </button>
          <button
            class="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover-surface2 text-hint-c font-medium transition-colors"
            title="開啟客戶訂餐頁"
            @click="openCustomerLunchLink"
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span class="hidden sm:inline">客戶訂購連結</span>
          </button>
          <button
            class="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover-surface2 text-hint-c font-medium transition-colors"
            title="便當取餐時間設定（幾點到幾點可以取餐、間隔幾分鐘）"
            @click="openPickupSlotSettings"
          >
            🕐 <span class="hidden sm:inline">取餐時間設定</span>
          </button>
          <NuxtLink
            to="/staff/management/business-hours"
            class="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover-surface2 text-hint-c font-medium transition-colors"
            title="營業日 / 餐廳資訊（跟訂位共用）"
          >
            ⚙️ <span class="hidden sm:inline">營業設定</span>
          </NuxtLink>
          <span
            :class="apiOnline ? 'text-green-600' : 'text-red-500'"
            class="text-xs flex items-center gap-1.5 font-medium"
          >
            <span
              :class="apiOnline ? 'bg-green-500' : 'bg-red-400'"
              class="w-2 h-2 rounded-full"
            />
            <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
          </span>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="flex flex-col lg:flex-row gap-4 items-start">
        <!-- ── 左欄：日曆 ── -->
        <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <!-- 手機版：僅顯示日期選擇器，不顯示完整日曆 -->
          <div
            class="lg:hidden bg-surface rounded-2xl border border-light-c shadow-sm p-3 flex items-center gap-2 mb-3">
            <input
              :value="selectedDate"
              type="date"
              class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
              @change="selectDate($event.target.value)"
            >
            <button
              class="px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 font-medium whitespace-nowrap flex-shrink-0"
              @click="selectDate(todayStr)"
            >
              今天
            </button>
          </div>

          <!-- 桌面版：完整日曆 -->
          <div class="hidden lg:block bg-surface rounded-2xl border border-light-c shadow-sm p-4 lg:sticky lg:top-20">
            <div class="flex items-center justify-between mb-3">
              <button
                class="p-1.5 hover-surface2 rounded-lg transition-colors"
                @click="prevMonth"
              >
                <svg
                  class="w-5 h-5 text-hint-c dark:text-hint-c"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span class="text-base font-semibold text-muted-c">{{ calendarLabel }}</span>
              <button
                class="p-1.5 hover-surface2 rounded-lg transition-colors"
                @click="nextMonth"
              >
                <svg
                  class="w-5 h-5 text-hint-c dark:text-hint-c"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-7 mb-1">
              <div
                v-for="w in ['日', '一', '二', '三', '四', '五', '六']"
                :key="w"
                class="text-center text-sm text-hint-c font-medium py-1"
              >
                {{ w }}
              </div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div
                v-for="(day, idx) in calendarDays"
                :key="idx"
                class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                :class="dayClass(day)"
                :title="day.date && hoursSettings.closedDates[day.date] ? '公休：' + hoursSettings.closedDates[day.date]
                  : day.date && hoursSettings.openDates[day.date] ? '臨時開放：' + hoursSettings.openDates[day.date] : ''"
                @click="day.date && selectDate(day.date)"
              >
                <span
                  v-if="day.date && dayHoursMark(day.date)"
                  class="absolute top-0.5 right-0.5 text-[9px] leading-none"
                >{{ dayHoursMark(day.date) === 'closed' ? '🚫' : '⭐' }}</span>
                <span>{{ day.label }}</span>
                <div
                  v-if="day.date && lunchMarkedDates.includes(day.date)"
                  class="absolute bottom-1 flex gap-0.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-orange-400"/>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-light-c">
              <span class="text-sm text-hint-c">
                <span
                  v-if="selectedDate"
                  class="text-base-c font-medium"
                >{{ selectedDate }}</span>
                <span v-else>請選擇日期</span>
              </span>
              <button
                class="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 font-medium"
                @click="selectDate(todayStr)"
              >
                今天
              </button>
            </div>
          </div>

          <!-- 當日便當統計卡 -->
          <div
            v-if="selectedDate"
            class="mt-3"
          >
            <div
              class="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 px-4 py-3"
            >
              <p class="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">
                🍱 便當
              </p>
              <p class="text-sm text-orange-700 dark:text-orange-300">
                <span class="text-xl font-black">{{ totalAll }}</span> 個
              </p>
              <div
                v-if="lunchOrders.length > 0"
                class="mt-1.5 space-y-0.5 text-xs text-orange-700 dark:text-orange-300"
              >
                <div v-if="totalMeat > 0">
                  🍖 葷 <span class="font-semibold">{{ totalMeat }}</span>
                </div>
                <div v-if="totalFullVeg > 0">
                  🌿 全素 <span class="font-semibold">{{ totalFullVeg }}</span>
                </div>
                <div v-if="totalEggVeg > 0">
                  🥚 蛋奶素 <span class="font-semibold">{{ totalEggVeg }}</span>
                </div>
                <div v-if="totalSpiceVeg > 0">
                  🧄 五辛素 <span class="font-semibold">{{ totalSpiceVeg }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ 右欄 ══ -->
        <div class="flex-1 min-w-0">
          <template v-if="selectedDate">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-muted-c text-base sm:text-lg">
                {{ selectedDate }} 便當明細
              </h2>
            </div>

            <!-- ── 便當列表 ── -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-hint-c uppercase tracking-widest flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-orange-400"/> 便當
                  <span
                    v-if="lunchOrders.length > 0"
                    class="text-orange-600 dark:text-orange-400 normal-case font-normal flex flex-wrap gap-x-2"
                  >
                    <span v-if="totalMeat > 0">🍖 {{ totalMeat }}</span>
                    <span v-if="totalFullVeg > 0">🌿 {{ totalFullVeg }}</span>
                    <span v-if="totalEggVeg > 0">🥚 {{ totalEggVeg }}</span>
                    <span v-if="totalSpiceVeg > 0">🧄 {{ totalSpiceVeg }}</span>
                  </span>
                </p>
                <button
                  class="flex items-center gap-1 px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors"
                  @click="openLunchModal(null)"
                >
                  <span class="leading-none">+</span> 新增
                </button>
              </div>
              <div class="space-y-2">
                <div
                  v-if="lunchOrders.length === 0"
                  class="bg-surface rounded-xl border border-light-c px-4 py-3 text-center text-hint-c text-sm"
                >
                  今天還沒有便當訂單
                </div>
                <div
                  v-for="order in lunchOrders"
                  :key="order.id"
                  class="bg-surface rounded-xl border border-light-c shadow-sm overflow-hidden"
                >
                  <div class="flex items-stretch">
                    <div
                      class="w-16 flex-shrink-0 bg-orange-50 dark:bg-orange-900/20 flex flex-col items-center justify-center border-r border-orange-100 dark:border-orange-800/30 py-3"
                    >
                      <span class="text-xs text-orange-400 uppercase tracking-wide">取餐</span>
                      <span
                        class="text-sm font-black text-orange-700 dark:text-orange-300 leading-tight mt-0.5 text-center"
                      >{{
                          order.time
                        }}</span>
                    </div>
                    <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-base-c">{{ order.name }}</span>
                          <button
                            :class="lunchStatusClass(order.status)"
                            class="px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-colors"
                            @click="toggleLunchStatus(order)"
                          >
                            {{ order.status }}
                          </button>
                          <NuxtLink
                            v-if="order.groupItineraryId"
                            :to="`/staff/management/group-itinerary?open=${order.groupItineraryId}`"
                            class="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 hover:opacity-80 transition-colors"
                          >
                            🧳 {{ groupNamesById[order.groupItineraryId] || '團體行程' }}
                          </NuxtLink>
                        </div>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
                          <span
                            v-if="order.meatQty > 0"
                            class="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium"
                          >🍖 葷 {{
                              order.meatQty
                            }}</span>
                          <span
                            v-if="order.fullVegQty > 0"
                            class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium"
                          >🌿 全素 {{
                              order.fullVegQty
                            }}</span>
                          <span
                            v-if="order.eggVegQty > 0"
                            class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium"
                          >🥚 蛋奶素 {{
                              order.eggVegQty
                            }}</span>
                          <span
                            v-if="order.spiceVegQty > 0"
                            class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium"
                          >🧄 五辛素 {{
                              order.spiceVegQty
                            }}</span>
                        </div>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-hint-c">
                          <span>📞 {{ order.phone }}</span>
                          <span v-if="order.note">💬 {{ order.note }}</span>
                        </div>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <button
                          class="px-2.5 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                          @click="openLunchModal(order)"
                        >
                          編輯
                        </button>
                        <button
                          class="px-2.5 py-1 text-xs border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors"
                          @click="confirmDeleteLunch(order)"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div
            v-else
            class="bg-surface rounded-2xl border border-light-c p-12 text-center text-hint-c text-sm shadow-sm"
          >
            請從左側日曆選擇日期
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 便當 Modal ════════ -->
    <div
      v-if="lunchModal.show"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
    >
      <div
        class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-base-c">
            {{ lunchModal.isNew ? '新增便當' : '編輯便當' }}
          </h3>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="lunchModal.show = false"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">日期 *</label>
            <input
              v-model="lForm.date"
              type="date"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
            >
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">姓名 *</label>
            <input
              v-model="lForm.name"
              placeholder="訂購人姓名"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
            >
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">電話</label>
            <input
              v-model="lForm.phone"
              placeholder="聯絡電話"
              type="tel"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
            >
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">取餐時段</label>
            <div class="flex items-center gap-2">
              <select
                v-model="lFormHour"
                class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option
                  v-for="h in HOUR_OPTIONS"
                  :key="h"
                  :value="h"
                >
                  {{ h }}
                </option>
              </select>
              <span class="text-muted-c font-medium">:</span>
              <select
                v-model="lFormMinute"
                class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option
                  v-for="m in MINUTE_OPTIONS"
                  :key="m"
                  :value="m"
                >
                  {{ m }}
                </option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">葷素數量</label>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-red-50 dark:bg-red-900/10 rounded-xl p-2.5 border border-red-200 dark:border-red-800/30">
                <label class="text-xs font-medium text-red-700 dark:text-red-400 block mb-1">🍖 葷食</label>
                <input
                  v-model.number="lForm.meatQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-red-200 dark:border-red-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-center font-bold"
                >
              </div>
              <div
                class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30"
              >
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🌿 全素</label>
                <input
                  v-model.number="lForm.fullVegQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                >
              </div>
              <div
                class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30"
              >
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🥚 蛋奶素</label>
                <input
                  v-model.number="lForm.eggVegQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                >
              </div>
              <div
                class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30"
              >
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🧄 五辛素</label>
                <input
                  v-model.number="lForm.spiceVegQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                >
              </div>
            </div>
            <p class="text-xs text-hint-c mt-1.5">
              合計：{{
                (lForm.meatQty || 0) + (lForm.fullVegQty || 0) + (lForm.eggVegQty || 0) + (lForm.spiceVegQty || 0)
              }} 個
            </p>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">狀態</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="s in LUNCH_STATUSES"
                :key="s"
                type="button"
                :class="lForm.status === s ? lunchStatusClass(s) + 'ring-2 ring-offset-1 ring-orange-400' : 'bg-surface2 text-hint-c'"
                class="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                @click="lForm.status = s"
              >
                {{ s }}
              </button>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">備註</label>
            <textarea
              v-model="lForm.note"
              rows="2"
              placeholder="特殊要求"
              class="w-full border border-light-c bg-surface text-base-c rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button
            class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="lunchModal.show = false"
          >
            取消
          </button>
          <button
            :disabled="!lForm.name || !lForm.date || (lForm.meatQty === 0 && lForm.fullVegQty === 0 && lForm.eggVegQty === 0 && lForm.spiceVegQty === 0)"
            class="flex-1 px-4 py-2.5 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors"
            @click="saveLunch"
          >
            {{ lunchModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ 便當取餐時間設定 Modal ════════ -->
    <div
      v-if="pickupSlotModal.show"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
    >
      <div
        class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-base-c">
              🕐 便當取餐時間設定
            </h3>
            <p class="text-xs text-hint-c mt-0.5">
              幾點到幾點可以取餐、間隔幾分鐘。只影響便當，跟訂位到場時間各自獨立。
            </p>
          </div>
          <button
            class="text-hint-c hover:text-muted-c p-1 flex-shrink-0"
            @click="pickupSlotModal.show = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="bg-surface2 rounded-xl px-3 py-3 mb-4">
          <div class="text-sm font-medium text-base-c mb-1">
            ⏱️ 準備時間
          </div>
          <p class="text-xs text-hint-c mb-2">
            客人「今天」下單時，只能選現在時間加上這個準備時間之後的取餐時段（例如設定 15
            分鐘，現在是 14:00，最早只能選 14:15 之後的時段）。選明天以後的日期不受影響。
          </p>
          <div class="flex items-center gap-2">
            <input
              v-model.number="prepMinutesDraft"
              type="number"
              min="0"
              step="5"
              class="w-24 px-3 py-1.5 rounded-lg border border-light-c bg-surface text-base-c text-sm"
            >
            <span class="text-sm text-hint-c">分鐘</span>
            <button
              class="ml-auto px-3 py-1.5 rounded-lg bg-orange-600 text-white text-sm font-medium"
              @click="savePrepMinutes"
            >
              儲存
            </button>
          </div>
        </div>

        <div class="space-y-2 mb-4">
          <div
            v-if="sortedPickupSlots.length === 0"
            class="bg-surface2 rounded-xl px-4 py-3 text-center text-hint-c text-sm"
          >
            尚未設定任何取餐時間（沒有設定時，便當暫時不限制下單時間）
          </div>
          <div
            v-for="p in sortedPickupSlots"
            :key="p.id"
            class="flex items-center gap-2 bg-surface2 rounded-xl px-3 py-2 flex-wrap"
          >
            <span
              class="px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0"
              :class="slotColorClass(p.color)"
            >{{ p.name }}</span>
            <span class="text-sm text-muted-c flex-1 min-w-0">
              {{ p.startTime }} – {{ p.endTime }}
              <span class="text-xs text-hint-c">（每 {{ p.interval || 5 }} 分）</span>
            </span>
            <span
              v-if="!p.temporary"
              class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface text-hint-c border border-light-c flex-shrink-0"
            >🔁 預設</span>
            <span
              v-else
              class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex-shrink-0"
              :title="Object.keys(p.dates || {}).join('、')"
            >📅 臨時（{{ Object.keys(p.dates || {}).length }} 天）</span>
            <button class="text-xs text-blue-500 hover:text-blue-700 px-1.5 flex-shrink-0" @click="openPickupSlotForm(p)">
              編輯
            </button>
            <button class="text-xs text-red-400 hover:text-red-600 px-1.5 flex-shrink-0" @click="deletePickupSlot(p.id)">
              刪除
            </button>
          </div>
        </div>

        <div class="border-t border-light-c pt-4 space-y-3">
          <p class="text-xs font-semibold text-hint-c uppercase tracking-widest">
            {{ pickupSlotEditingId ? '編輯取餐時間' : '新增取餐時間' }}
          </p>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">名稱 *</label>
            <input
              v-model="pickupSlotForm.name"
              placeholder="早餐 / 午餐 / 晚餐…"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
            >
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">開始時間 *</label>
              <div class="flex items-center gap-1">
                <select v-model="pickupSlotStartHour" class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400">
                  <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="text-muted-c font-medium">:</span>
                <select v-model="pickupSlotStartMinute" class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400">
                  <option v-for="m in MINUTE_OPTIONS" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">結束時間 *</label>
              <div class="flex items-center gap-1">
                <select v-model="pickupSlotEndHour" class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400">
                  <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="text-muted-c font-medium">:</span>
                <select v-model="pickupSlotEndMinute" class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400">
                  <option v-for="m in MINUTE_OPTIONS" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">時間間隔（分鐘）</label>
            <select
              v-model.number="pickupSlotForm.interval"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option v-for="m in INTERVAL_OPTIONS" :key="m" :value="m">每 {{ m }} 分鐘</option>
            </select>
            <p class="text-xs text-hint-c mt-1">
              客人可選的取餐時間間隔，例如設 10 分鐘，11:30–13:00 會展開成 11:30、11:40…12:50。
            </p>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">類型</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="py-2 rounded-xl text-sm font-medium border transition-colors"
                :class="!pickupSlotForm.temporary ? 'bg-orange-600 text-white border-orange-600' : 'bg-surface text-hint-c border-light-c'"
                @click="pickupSlotForm.temporary = false"
              >
                🔁 預設（每個營業日）
              </button>
              <button
                type="button"
                class="py-2 rounded-xl text-sm font-medium border transition-colors"
                :class="pickupSlotForm.temporary ? 'bg-purple-600 text-white border-purple-600' : 'bg-surface text-hint-c border-light-c'"
                @click="pickupSlotForm.temporary = true"
              >
                📅 臨時（指定日期）
              </button>
            </div>
            <p class="text-xs text-hint-c mt-1">
              臨時時段只在下面指定的日期開放，那天會取代預設時段（同一天可以有多筆臨時時段同時開放）。
            </p>
          </div>
          <div v-if="pickupSlotForm.temporary" class="border-t border-light-c pt-3 space-y-2">
            <label class="text-sm font-medium text-muted-c block mb-1">開放日期 *</label>
            <div
              v-if="sortedPickupSlotDates.length === 0"
              class="bg-surface2 rounded-xl px-3 py-2 text-center text-hint-c text-xs"
            >
              尚未指定日期，至少要加一個
            </div>
            <div
              v-for="[date, note] in sortedPickupSlotDates"
              :key="date"
              class="flex items-center gap-2 bg-surface2 rounded-xl px-3 py-1.5"
            >
              <span class="text-sm text-muted-c font-medium flex-shrink-0">{{ date }}</span>
              <span class="text-xs text-hint-c flex-1 min-w-0 truncate">{{ note }}</span>
              <button class="text-xs text-red-400 hover:text-red-600 px-1.5 flex-shrink-0" @click="removePickupSlotDate(date)">
                移除
              </button>
            </div>
            <div class="flex gap-2">
              <input
                v-model="pickupSlotDateForm.date"
                type="date"
                class="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
              >
              <input
                v-model="pickupSlotDateForm.note"
                placeholder="備註（選填）"
                class="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"
              >
              <button
                :disabled="!pickupSlotDateForm.date"
                class="px-3 py-2 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors flex-shrink-0"
                @click="addPickupSlotDate"
              >
                新增
              </button>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">標籤顏色</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="c in SLOT_COLORS"
                :key="c.key"
                type="button"
                class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                :class="[slotColorClass(c.key), pickupSlotForm.color === c.key ? 'ring-2 ring-offset-1 ring-orange-400' : 'opacity-50']"
                @click="pickupSlotForm.color = c.key"
              >
                {{ c.label }}
              </button>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button
              v-if="pickupSlotEditingId"
              class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors"
              @click="openPickupSlotForm(null)"
            >
              取消編輯
            </button>
            <button
              :disabled="!pickupSlotCanSave"
              class="flex-1 px-4 py-2.5 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors"
              @click="savePickupSlot"
            >
              {{ pickupSlotEditingId ? '儲存變更' : '新增取餐時間' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap"
      >
        <svg
          class="w-4 h-4 text-orange-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
