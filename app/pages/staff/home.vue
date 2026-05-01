<script setup>
definePageMeta({ layout: 'staff' })

const commonStore = useCommonStore()
const BASE       = () => commonStore.data.main_url + '/holy/booking'
const LUNCH_BASE = () => commonStore.data.main_url + '/holy/lunch'
const CAL_BASE   = () => commonStore.data.main_url + '/holy/calendar'

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayWeekday = weekDays[today.getDay()]
const todayLabel = `${today.getMonth() + 1} 月 ${today.getDate()} 日　${todayWeekday}`

const shortcuts = [
  { to: '/staff/booking',     icon: '🪑', label: '訂位記錄', color: 'bg-green-700',   desc: '查看當日訂位與便當' },
  { to: '/staff/cash-count',  icon: '💵', label: '點鈔記錄', color: 'bg-emerald-600', desc: '查看每日點鈔結果' },
  { to: '/staff/calendar',    icon: '📅', label: '行事曆',   color: 'bg-indigo-600',  desc: '查看本月活動與備注' },
  { to: '/staff/quick-links', icon: '🔗', label: '常用網址', color: 'bg-blue-600',    desc: '常用系統與工具連結' }
]

const loading      = ref(false)
const bookings     = ref([])
const lunchOrders  = ref([])
const todayEvents  = ref([])   // 今日行事曆活動

// 行事曆類型色
const calTypeColor = { 醫院: '#e0534a', 園區: '#3d6b52', 芳心: '#a06080' }
function calChipBg(type) {
  return { 醫院: '#fee2e2', 園區: '#dcfce7', 芳心: '#fce7f3' }[type] || '#f0f0f0'
}
function calChipText(type) {
  return calTypeColor[type] || '#555'
}

const bookingTotal = computed(() => bookings.value.reduce((s, b) =>
  s + (Number(b.meatQty) || 0) + (Number(b.fullVegQty) || 0) + (Number(b.eggVegQty) || 0) + (Number(b.spiceVegQty) || 0), 0))
const lunchTotal = computed(() => lunchOrders.value.reduce((s, o) =>
  s + (Number(o.meatQty) || 0) + (Number(o.fullVegQty) || 0) + (Number(o.eggVegQty) || 0) + (Number(o.spiceVegQty) || 0), 0))

const bookingMeat = computed(() => bookings.value.reduce((s, b) => s + (Number(b.meatQty) || 0), 0))
const bookingVeg = computed(() => bookings.value.reduce((s, b) => s + (Number(b.fullVegQty) || 0) + (Number(b.eggVegQty) || 0) + (Number(b.spiceVegQty) || 0), 0))
const lunchMeat = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.meatQty) || 0), 0))
const lunchVeg = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.fullVegQty) || 0) + (Number(o.eggVegQty) || 0) + (Number(o.spiceVegQty) || 0), 0))

async function fetchToday() {
  loading.value = true
  try {
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const [bRes, lRes, cRes] = await Promise.all([
      fetch(`${BASE()}/get/${todayStr}`),
      fetch(`${LUNCH_BASE()}/get/${todayStr}`),
      fetch(`${CAL_BASE()}/list?yearMonth=${ym}`)
    ])
    bookings.value    = bRes.ok ? await bRes.json() : []
    lunchOrders.value = lRes.ok ? await lRes.json() : []
    const allCal      = cRes.ok ? await cRes.json() : []
    // 只留今天的，依時間排序
    todayEvents.value = allCal
      .filter(e => e.date === todayStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  } catch (e) { console.error(e) } finally { loading.value = false }
}

onMounted(fetchToday)
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors">
    <!-- Header -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3">
      <div class="max-w-2xl mx-auto flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white flex-shrink-0"
          style="font-size:14px"
        >
          🌿
        </div>
        <div>
          <h1
            class="font-bold text-stone-800 dark:text-stone-100 leading-none"
            style="font-size:15px"
          >
            員工專區
          </h1>
          <p
            class="text-stone-400 mt-0.5"
            style="font-size:11px"
          >
            {{ todayLabel }}
          </p>
        </div>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      <!-- ── 今日概況 ── -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 dark:border-stone-700">
          <span
            class="font-semibold text-stone-700 dark:text-stone-100"
            style="font-size:13px"
          >今日概況</span>
          <NuxtLink
            to="/staff/booking"
            class="text-green-700 dark:text-green-400 font-medium"
            style="font-size:12px"
          >查看詳情 →</NuxtLink>
        </div>

        <div
          v-if="loading"
          class="px-4 py-6 text-center text-stone-400"
          style="font-size:13px"
        >
          載入中...
        </div>

        <div
          v-else-if="bookings.length === 0 && lunchOrders.length === 0"
          class="px-4 py-6 text-center text-stone-400"
          style="font-size:13px"
        >
          今天尚無訂位或便當記錄
        </div>

        <div
          v-else
          class="grid grid-cols-2 divide-x divide-stone-100 dark:divide-zinc-700"
        >
          <!-- 訂位 -->
          <div class="px-4 py-3">
            <div class="flex items-center gap-1.5 mb-2">
              <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span
                class="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide"
                style="font-size:10px"
              >訂位</span>
            </div>
            <div
              v-if="bookings.length === 0"
              class="text-stone-300 dark:text-stone-600"
              style="font-size:12px"
            >
              尚無記錄
            </div>
            <template v-else>
              <p
                class="text-stone-800 dark:text-stone-100"
                style="font-size:13px"
              >
                <span
                  class="font-black"
                  style="font-size:24px"
                >{{ bookings.length }}</span> 筆
                · <span class="font-semibold">{{ bookingTotal }}</span> 人
              </p>
              <div
                class="mt-1 space-y-0.5 text-green-600 dark:text-green-400"
                style="font-size:11px"
              >
                <div v-if="bookingMeat > 0">
                  🍖 葷 {{ bookingMeat }}
                </div>
                <div v-if="bookingVeg > 0">
                  🌿 素 {{ bookingVeg }}
                </div>
              </div>
            </template>
          </div>

          <!-- 便當 -->
          <div class="px-4 py-3">
            <div class="flex items-center gap-1.5 mb-2">
              <span class="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
              <span
                class="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide"
                style="font-size:10px"
              >便當</span>
            </div>
            <div
              v-if="lunchOrders.length === 0"
              class="text-stone-300 dark:text-stone-600"
              style="font-size:12px"
            >
              尚無記錄
            </div>
            <template v-else>
              <p
                class="text-stone-800 dark:text-stone-100"
                style="font-size:13px"
              >
                <span
                  class="font-black"
                  style="font-size:24px"
                >{{ lunchTotal }}</span> 個
              </p>
              <div
                class="mt-1 space-y-0.5 text-orange-600 dark:text-orange-400"
                style="font-size:11px"
              >
                <div v-if="lunchMeat > 0">
                  🍖 葷 {{ lunchMeat }}
                </div>
                <div v-if="lunchVeg > 0">
                  🌿 素 {{ lunchVeg }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- ── 今日行事曆 ── -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 dark:border-stone-700">
          <span class="font-semibold text-stone-700 dark:text-stone-100" style="font-size:13px">
            今日行事曆
          </span>
          <NuxtLink to="/staff/calendar"
                    class="text-green-700 dark:text-green-400 font-medium" style="font-size:12px">
            查看全月 →
          </NuxtLink>
        </div>

        <!-- 載入中 -->
        <div v-if="loading" class="px-4 py-5 text-center text-stone-400" style="font-size:13px">
          載入中...
        </div>

        <!-- 無活動 -->
        <div v-else-if="todayEvents.length === 0"
             class="px-4 py-5 text-center text-stone-400" style="font-size:13px">
          今天沒有排定的活動
        </div>

        <!-- 活動列表 -->
        <div v-else class="divide-y divide-stone-100 dark:divide-zinc-700">
          <div v-for="(ev, i) in todayEvents" :key="i"
               class="flex items-start gap-3 px-4 py-3">
            <!-- 時間 -->
            <div class="flex-shrink-0 text-right" style="min-width:42px">
              <span class="font-mono font-semibold text-stone-500 dark:text-stone-400"
                    style="font-size:11px">
                {{ ev.time ? ev.time.split('-')[0] : '' }}
              </span>
            </div>
            <!-- 色條 -->
            <div class="flex-shrink-0 w-1 self-stretch rounded-full mt-0.5"
                 :style="{ background: calTypeColor[ev.type] || '#ccc' }">
            </div>
            <!-- 內容 -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-stone-800 dark:text-stone-100 leading-snug"
                 style="font-size:13px">{{ ev.title }}</p>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span v-if="ev.owner" class="text-stone-400" style="font-size:11px">
                  👤 {{ ev.owner }}
                </span>
                <span v-if="ev.room" class="text-stone-400 truncate" style="font-size:11px">
                  📍 {{ ev.room.replace(/^[A-Z0-9]+\s*/, '') }}
                </span>
              </div>
            </div>
            <!-- 類型 badge -->
            <span class="flex-shrink-0 rounded-full px-2 py-0.5 font-semibold self-start mt-0.5"
                  style="font-size:10px"
                  :style="{ background: calChipBg(ev.type), color: calChipText(ev.type) }">
              {{ ev.type }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── 快捷功能 ── -->
      <div>
        <p
          class="text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-widest px-1 mb-2"
          style="font-size:10px"
        >
          功能
        </p>
        <div class="space-y-2">
          <NuxtLink
            v-for="s in shortcuts"
            :key="s.to"
            :to="s.to"
            class="shortcut-card bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm"
          >
            <div
              :class="s.color"
              class="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style="font-size:18px"
            >
              {{ s.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="font-semibold text-stone-800 dark:text-stone-100"
                style="font-size:14px"
              >{{ s.label }}</p>
              <p
                class="text-stone-400 dark:text-stone-500 mt-0.5"
                style="font-size:11px"
              >{{ s.desc }}</p>
            </div>
            <svg
              class="w-4 h-4 text-stone-300 dark:text-zinc-600 flex-shrink-0"
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
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shortcut-card {
  text-decoration: none;
  transition: transform 0.12s, box-shadow 0.12s;
  -webkit-tap-highlight-color: transparent;
}
.shortcut-card:active {
  transform: scale(0.98);
}
</style>
