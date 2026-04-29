<script setup>
definePageMeta({ layout: 'staff' })

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/booking'
const LUNCH_BASE = () => commonStore.data.main_url + '/holy/lunch'

// ── 日曆 ──────────────────────────────────────────────────────────
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)
const selectedDate = ref(todayStr)
const calOpen = ref(false)

const yearMonth = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`)

const calendarDays = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push({ label: d, date: `${calYear.value}-${mm}-${dd}` })
  }
  return days
})

const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-green-700 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold hover:bg-green-200'
  return 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
}

function prevMonth() {
  if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value--
  fetchMarkedDates(); fetchRecurring()
}
function nextMonth() {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
  fetchMarkedDates(); fetchRecurring()
}
function pickDate(date) {
  selectedDate.value = date
  calOpen.value = false
  fetchDay()
}

// ── 資料 ──────────────────────────────────────────────────────────
const loading = ref(false)
const bookings = ref([])
const lunchOrders = ref([])
const markedDates = ref([])
const lunchMarkedDates = ref([])

// 統計
const bookingMeat = computed(() => bookings.value.reduce((s, b) => s + (Number(b.meatQty) || 0), 0))
const bookingFull = computed(() => bookings.value.reduce((s, b) => s + (Number(b.fullVegQty) || 0), 0))
const bookingEgg = computed(() => bookings.value.reduce((s, b) => s + (Number(b.eggVegQty) || 0), 0))
const bookingSpice = computed(() => bookings.value.reduce((s, b) => s + (Number(b.spiceVegQty) || 0), 0))
const bookingTotal = computed(() => bookingMeat.value + bookingFull.value + bookingEgg.value + bookingSpice.value)

const lunchMeat = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.meatQty) || 0), 0))
const lunchFull = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.fullVegQty) || 0), 0))
const lunchEgg = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.eggVegQty) || 0), 0))
const lunchSpice = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.spiceVegQty) || 0), 0))
const lunchTotal = computed(() => lunchMeat.value + lunchFull.value + lunchEgg.value + lunchSpice.value)

async function fetchMarkedDates() {
  try {
    const [bRes, lRes] = await Promise.all([
      fetch(`${BASE()}/dates/${yearMonth.value}`),
      fetch(`${LUNCH_BASE()}/dates/${yearMonth.value}`)
    ])
    if (bRes.ok) markedDates.value = await bRes.json()
    if (lRes.ok) lunchMarkedDates.value = await lRes.json()
  } catch (e) { console.error(e) }
}

async function fetchDay() {
  loading.value = true
  try {
    const [bRes, lRes] = await Promise.all([
      fetch(`${BASE()}/get/${selectedDate.value}`),
      fetch(`${LUNCH_BASE()}/get/${selectedDate.value}`)
    ])
    bookings.value = bRes.ok ? await bRes.json() : []
    lunchOrders.value = lRes.ok ? await lRes.json() : []
  } catch (e) { console.error(e) } finally { loading.value = false }
}

const hasMark = date => markedDates.value.includes(date) || lunchMarkedDates.value.includes(date)

// ── 當月預定 ──────────────────────────────────────────────────────
const RECUR_BASE = () => commonStore.data.main_url + '/holy/recurring'
const recurringRules = ref([])

// 當月預定顯示全部（不依星期篩選），讓員工了解本月包月情況
const dayRecurRules = computed(() => recurringRules.value)

// 統計只算當天適用的（依星期篩選）
const todayRecurRules = computed(() => {
  if (!selectedDate.value) return []
  const dow = new Date(selectedDate.value).getDay()
  return recurringRules.value.filter(r =>
    !r.weekdays || r.weekdays.length === 0 || r.weekdays.includes(dow)
  )
})

const recurBookingRules = computed(() => todayRecurRules.value.filter(r => r.type !== 'lunch'))
const recurLunchRules = computed(() => todayRecurRules.value.filter(r => r.type === 'lunch'))
const recurBookingTotal = computed(() => recurBookingRules.value.reduce((s, r) =>
  s + (Number(r.meatQty) || 0) + (Number(r.fullVegQty) || 0) + (Number(r.eggVegQty) || 0) + (Number(r.spiceVegQty) || 0), 0))
const recurBookingMeat = computed(() => recurBookingRules.value.reduce((s, r) => s + (Number(r.meatQty) || 0), 0))
const recurBookingFull = computed(() => recurBookingRules.value.reduce((s, r) => s + (Number(r.fullVegQty) || 0), 0))
const recurBookingEgg = computed(() => recurBookingRules.value.reduce((s, r) => s + (Number(r.eggVegQty) || 0), 0))
const recurBookingSpice = computed(() => recurBookingRules.value.reduce((s, r) => s + (Number(r.spiceVegQty) || 0), 0))

async function fetchRecurring() {
  try {
    recurringRules.value = await (await fetch(`${RECUR_BASE()}/list/${yearMonth.value}`)).json()
  } catch (e) { console.error(e) }
}

onMounted(async () => {
  await Promise.all([fetchMarkedDates(), fetchRecurring()])
  await fetchDay()
})
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors">
    <!-- Header -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-14 z-20">
      <div class="max-w-2xl mx-auto flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white flex-shrink-0"
          style="font-size:14px"
        >
          田
        </div>
        <div>
          <h1
            class="font-bold text-stone-800 dark:text-stone-100 leading-none"
            style="font-size:15px"
          >
            訂位記錄
          </h1>
        </div>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4">
      <!-- ── 日曆折疊 ── -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm mb-4 overflow-hidden">
        <button
          class="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-700/50 transition-colors"
          @click="calOpen = !calOpen"
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-4 h-4 text-green-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span
              class="font-medium text-stone-700 dark:text-stone-200"
              style="font-size:14px"
            >{{ selectedDate }}</span>
            <span
              v-if="hasMark(selectedDate)"
              class="w-2 h-2 rounded-full bg-green-500 inline-block"
            />
          </div>
          <svg
            class="w-4 h-4 text-stone-400 transition-transform flex-shrink-0"
            :class="calOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <Transition name="cal">
          <div
            v-if="calOpen"
            class="border-t border-stone-100 dark:border-stone-700 px-4 pb-4 pt-3"
          >
            <div class="flex items-center justify-between mb-3">
              <button
                class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                @click="prevMonth"
              >
                <svg
                  class="w-4 h-4 text-stone-500 dark:text-stone-300"
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
              <span
                class="font-semibold text-stone-700 dark:text-stone-100"
                style="font-size:14px"
              >{{ calYear }}年 {{ calMonth }}月</span>
              <button
                class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                @click="nextMonth"
              >
                <svg
                  class="w-4 h-4 text-stone-500 dark:text-stone-300"
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
                class="text-center text-stone-400 dark:text-stone-500 font-medium py-1"
                style="font-size:12px"
              >
                {{ w }}
              </div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div
                v-for="(day, idx) in calendarDays"
                :key="idx"
                class="relative flex flex-col items-center justify-center aspect-square rounded-xl cursor-pointer transition-all select-none"
                style="font-size:13px"
                :class="dayClass(day)"
                @click="day.date && pickDate(day.date)"
              >
                <span>{{ day.label }}</span>
                <div
                  v-if="day.date && hasMark(day.date)"
                  class="absolute bottom-1 flex gap-0.5"
                >
                  <span
                    v-if="markedDates.includes(day.date)"
                    class="w-1.5 h-1.5 rounded-full"
                    :class="day.date === selectedDate ? 'bg-white' : 'bg-red-400'"
                  />
                  <span
                    v-if="lunchMarkedDates.includes(day.date)"
                    class="w-1.5 h-1.5 rounded-full"
                    :class="day.date === selectedDate ? 'bg-white' : 'bg-orange-400'"
                  />
                </div>
              </div>
            </div>
            <div class="flex justify-end mt-2 pt-2 border-t border-stone-100 dark:border-stone-700">
              <button
                class="text-green-700 dark:text-green-400 font-medium"
                style="font-size:13px"
                @click="pickDate(todayStr)"
              >
                今天
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── 當日統計列 ── -->
      <div
        v-if="!loading && (bookings.length > 0 || lunchOrders.length > 0 || dayRecurRules.length > 0)"
        class="grid grid-cols-2 gap-2 mb-4"
      >
        <!-- 訂位統計 -->
        <div
          v-if="bookings.length > 0 || recurBookingRules.length > 0"
          class="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 px-3 py-2.5"
        >
          <p
            class="font-semibold text-green-700 dark:text-green-400 mb-1"
            style="font-size:11px"
          >
            🪑 訂位 {{ bookings.length }} 筆・{{ bookingTotal + recurBookingTotal }} 人
            <span
              v-if="recurBookingTotal > 0"
              class="opacity-70"
            >（含包月 {{ recurBookingTotal }} 人）</span>
          </p>
          <div
            class="space-y-0.5"
            style="font-size:11px; color: inherit"
          >
            <div
              v-if="bookingMeat + recurBookingMeat > 0"
              class="text-green-700 dark:text-green-300"
            >
              🍖 葷 <span class="font-semibold">{{ bookingMeat + recurBookingMeat }}</span>
            </div>
            <div
              v-if="bookingFull + recurBookingFull > 0"
              class="text-green-700 dark:text-green-300"
            >
              🌿 全素 <span class="font-semibold">{{ bookingFull + recurBookingFull }}</span>
            </div>
            <div
              v-if="bookingEgg + recurBookingEgg > 0"
              class="text-green-700 dark:text-green-300"
            >
              🥚 蛋奶素 <span class="font-semibold">{{ bookingEgg + recurBookingEgg }}</span>
            </div>
            <div
              v-if="bookingSpice + recurBookingSpice > 0"
              class="text-green-700 dark:text-green-300"
            >
              🧄 五辛素 <span class="font-semibold">{{ bookingSpice + recurBookingSpice }}</span>
            </div>
          </div>
        </div>
        <!-- 便當統計 -->
        <div
          v-if="lunchOrders.length > 0"
          class="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 px-3 py-2.5"
        >
          <p
            class="font-semibold text-orange-700 dark:text-orange-400 mb-1"
            style="font-size:11px"
          >
            🍱 便當 {{ lunchTotal }} 個
          </p>
          <div
            class="space-y-0.5"
            style="font-size:11px"
          >
            <div
              v-if="lunchMeat > 0"
              class="text-orange-700 dark:text-orange-300"
            >
              🍖 葷 <span class="font-semibold">{{ lunchMeat }}</span>
            </div>
            <div
              v-if="lunchFull > 0"
              class="text-orange-700 dark:text-orange-300"
            >
              🌿 全素 <span class="font-semibold">{{ lunchFull }}</span>
            </div>
            <div
              v-if="lunchEgg > 0"
              class="text-orange-700 dark:text-orange-300"
            >
              🥚 蛋奶素 <span class="font-semibold">{{ lunchEgg }}</span>
            </div>
            <div
              v-if="lunchSpice > 0"
              class="text-orange-700 dark:text-orange-300"
            >
              🧄 五辛素 <span class="font-semibold">{{ lunchSpice }}</span>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="loading"
        class="text-center py-8 text-stone-400"
        style="font-size:13px"
      >
        載入中...
      </div>

      <template v-else>
        <!-- ── 訂位列表 ── -->
        <div
          v-if="bookings.length > 0"
          class="mb-4"
        >
          <p
            class="font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1.5 mb-2"
            style="font-size:11px"
          >
            <span class="w-2 h-2 rounded-full bg-green-500" /> 訂位
          </p>
          <div class="space-y-2">
            <div
              v-for="b in bookings"
              :key="b.id"
              class="bg-white dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
            >
              <div class="flex items-stretch">
                <!-- 時間色塊 -->
                <div class="w-14 flex-shrink-0 bg-stone-50 dark:bg-zinc-700 flex flex-col items-center justify-center border-r border-stone-200 dark:border-stone-700 py-3">
                  <span
                    class="text-stone-400 uppercase tracking-wide"
                    style="font-size:9px"
                  >TIME</span>
                  <span
                    class="font-black text-stone-700 dark:text-stone-100 leading-tight mt-0.5"
                    style="font-size:14px"
                  >{{ b.time }}</span>
                </div>
                <!-- 內容 -->
                <div class="flex-1 px-3 py-2.5 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="font-bold text-stone-800 dark:text-stone-100"
                      style="font-size:14px"
                    >{{ b.name }}</span>
                  </div>
                  <div class="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                    <span
                      v-if="b.meatQty > 0"
                      class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium"
                      style="font-size:11px"
                    >🍖 葷 {{ b.meatQty }}</span>
                    <span
                      v-if="b.fullVegQty > 0"
                      class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                      style="font-size:11px"
                    >🌿 全素 {{ b.fullVegQty }}</span>
                    <span
                      v-if="b.eggVegQty > 0"
                      class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                      style="font-size:11px"
                    >🥚 蛋奶素 {{ b.eggVegQty }}</span>
                    <span
                      v-if="b.spiceVegQty> 0"
                      class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                      style="font-size:11px"
                    >🧄 五辛素 {{ b.spiceVegQty }}</span>
                  </div>
                  <div
                    class="flex flex-wrap gap-x-3 mt-1 text-stone-400 dark:text-stone-500"
                    style="font-size:11px"
                  >
                    <span>📞 {{ b.phone }}</span>
                    <span v-if="b.note">💬 {{ b.note }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 便當列表 ── -->
        <div
          v-if="lunchOrders.length > 0"
          class="mb-4"
        >
          <p
            class="font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1.5 mb-2"
            style="font-size:11px"
          >
            <span class="w-2 h-2 rounded-full bg-orange-400" /> 便當
          </p>
          <div class="space-y-2">
            <div
              v-for="o in lunchOrders"
              :key="o.id"
              class="bg-white dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
            >
              <div class="flex items-stretch">
                <div class="w-14 flex-shrink-0 bg-orange-50 dark:bg-orange-900/20 flex flex-col items-center justify-center border-r border-orange-100 dark:border-orange-800/30 py-3">
                  <span
                    class="text-orange-400 uppercase tracking-wide"
                    style="font-size:9px"
                  >取餐</span>
                  <span
                    class="font-black text-orange-700 dark:text-orange-300 leading-tight mt-0.5 text-center"
                    style="font-size:13px"
                  >{{ o.time }}</span>
                </div>
                <div class="flex-1 px-3 py-2.5 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="font-bold text-stone-800 dark:text-stone-100"
                      style="font-size:14px"
                    >{{ o.name }}</span>
                  </div>
                  <div class="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                    <span
                      v-if="o.meatQty > 0"
                      class="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium"
                      style="font-size:11px"
                    >🍖 葷 {{ o.meatQty }}</span>
                    <span
                      v-if="o.fullVegQty > 0"
                      class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium"
                      style="font-size:11px"
                    >🌿 全素 {{ o.fullVegQty }}</span>
                    <span
                      v-if="o.eggVegQty > 0"
                      class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium"
                      style="font-size:11px"
                    >🥚 蛋奶素 {{ o.eggVegQty }}</span>
                    <span
                      v-if="o.spiceVegQty> 0"
                      class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium"
                      style="font-size:11px"
                    >🧄 五辛素 {{ o.spiceVegQty }}</span>
                  </div>
                  <div
                    class="flex flex-wrap gap-x-3 mt-1 text-stone-400 dark:text-stone-500"
                    style="font-size:11px"
                  >
                    <span>📞 {{ o.phone }}</span>
                    <span v-if="o.note">💬 {{ o.note }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 當月預定 ── -->
        <div
          v-if="dayRecurRules.length > 0"
          class="mb-4"
        >
          <p
            class="font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1.5 mb-2"
            style="font-size:11px"
          >
            <span class="w-2 h-2 rounded-full bg-indigo-400" /> 當月預定
          </p>
          <div class="space-y-2">
            <div
              v-for="r in dayRecurRules"
              :key="r.id"
              class="bg-white dark:bg-zinc-800 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm overflow-hidden"
            >
              <div class="flex items-stretch">
                <div class="w-14 flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/20 flex flex-col items-center justify-center border-r border-indigo-100 dark:border-indigo-800/30 py-3">
                  <span
                    class="text-indigo-400 uppercase tracking-wide"
                    style="font-size:9px"
                  >包月</span>
                  <span
                    class="font-black text-indigo-600 dark:text-indigo-300 leading-tight mt-0.5 text-center"
                    style="font-size:13px"
                  >{{ r.time }}</span>
                </div>
                <div class="flex-1 px-3 py-2.5 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="font-bold text-stone-800 dark:text-stone-100"
                      style="font-size:14px"
                    >{{ r.name }}</span>
                    <span
                      :class="r.type === 'lunch'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
                      class="px-2 py-0.5 rounded-full font-medium"
                      style="font-size:11px"
                    >
                      {{ r.type === 'lunch' ? '便當' : '訂位' }}
                    </span>
                  </div>
                  <div
                    class="flex flex-wrap gap-x-2 gap-y-1 mt-1"
                    style="font-size:11px"
                  >
                    <span
                      v-if="r.meatQty > 0"
                      class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium"
                    >🍖 葷 {{ r.meatQty }}</span>
                    <span
                      v-if="r.fullVegQty > 0"
                      class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                    >🌿 全素 {{ r.fullVegQty }}</span>
                    <span
                      v-if="r.eggVegQty > 0"
                      class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                    >🥚 蛋奶素 {{ r.eggVegQty }}</span>
                    <span
                      v-if="r.spiceVegQty> 0"
                      class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                    >🧄 五辛素 {{ r.spiceVegQty }}</span>
                  </div>
                  <div
                    class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-stone-400 dark:text-stone-500"
                    style="font-size:11px"
                  >
                    <span
                      v-if="r.weekdays && r.weekdays.length > 0"
                      class="flex gap-0.5"
                    >
                      <span
                        v-for="dow in [0, 1, 2, 3, 4, 5, 6]"
                        :key="dow"
                        :class="r.weekdays.includes(dow)
                          ? (dow===0||dow===6 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300')
                          : 'text-stone-200 dark:text-zinc-700'"
                        class="w-4 h-4 rounded text-center leading-4 font-medium"
                        style="font-size:10px"
                      >
                        {{ ['日', '一', '二', '三', '四', '五', '六'][dow] }}
                      </span>
                    </span>
                    <span
                      v-else
                      class="italic"
                    >每天</span>
                    <span v-if="r.note">💬 {{ r.note }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空狀態 -->
        <div
          v-if="bookings.length === 0 && lunchOrders.length === 0 && dayRecurRules.length === 0"
          class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-10 text-center text-stone-400 shadow-sm"
          style="font-size:13px"
        >
          這天沒有訂位或便當記錄
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cal-enter-active, .cal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.cal-enter-from, .cal-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
