<script setup>
definePageMeta({ layout: 'staff' })

const commonStore = useCommonStore()
const BASE        = () => commonStore.data.main_url + '/holy/booking'
const LUNCH_BASE  = () => commonStore.data.main_url + '/holy/lunch'

const today    = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
const todayWeekday = weekDays[today.getDay()]
const todayLabel = `${today.getMonth()+1} 月 ${today.getDate()} 日　${todayWeekday}`

// 快捷功能
const shortcuts = [
  { to: '/staff/booking',     icon: '🪑', label: '訂位記錄', color: 'bg-green-700',  desc: '查看當日訂位與便當' },
  { to: '/staff/cash-count',  icon: '💵', label: '點鈔記錄', color: 'bg-emerald-600', desc: '查看每日點鈔結果' },
  { to: '/staff/quick-links', icon: '🔗', label: '常用網址', color: 'bg-blue-600',    desc: '常用系統與工具連結' },
]

// 當日摘要
const loading       = ref(false)
const bookings      = ref([])
const lunchOrders   = ref([])

const bookingTotal  = computed(() => bookings.value.reduce((s,b) =>
  s + (Number(b.meatQty)||0) + (Number(b.fullVegQty)||0) + (Number(b.eggVegQty)||0) + (Number(b.spiceVegQty)||0), 0))
const lunchTotal    = computed(() => lunchOrders.value.reduce((s,o) =>
  s + (Number(o.meatQty)||0) + (Number(o.fullVegQty)||0) + (Number(o.eggVegQty)||0) + (Number(o.spiceVegQty)||0), 0))

const bookingMeat   = computed(() => bookings.value.reduce((s,b) => s+(Number(b.meatQty)||0), 0))
const bookingVeg    = computed(() => bookings.value.reduce((s,b) => s+(Number(b.fullVegQty)||0)+(Number(b.eggVegQty)||0)+(Number(b.spiceVegQty)||0), 0))
const lunchMeat     = computed(() => lunchOrders.value.reduce((s,o) => s+(Number(o.meatQty)||0), 0))
const lunchVeg      = computed(() => lunchOrders.value.reduce((s,o) => s+(Number(o.fullVegQty)||0)+(Number(o.eggVegQty)||0)+(Number(o.spiceVegQty)||0), 0))

async function fetchToday() {
  loading.value = true
  try {
    const [bRes, lRes] = await Promise.all([
      fetch(`${BASE()}/get/${todayStr}`),
      fetch(`${LUNCH_BASE()}/get/${todayStr}`)
    ])
    bookings.value    = bRes.ok ? await bRes.json() : []
    lunchOrders.value = lRes.ok ? await lRes.json() : []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

onMounted(fetchToday)
</script>

<template>
  <div class="min-h-screen bg-stone-100 dark:bg-zinc-950 transition-colors">

    <!-- ── 頂部歡迎區 ── -->
    <div class="bg-green-800 dark:bg-green-900 px-4 pt-6 pb-10">
      <div class="max-w-2xl mx-auto">
        <p class="text-green-200 dark:text-green-300" style="font-size:12px">{{ todayLabel }}</p>
        <h1 class="font-black text-white mt-1 leading-tight" style="font-size:22px">員工專區</h1>
        <p class="text-green-200 dark:text-green-300 mt-0.5" style="font-size:13px">聖母健康農莊</p>
      </div>
    </div>

    <div class="max-w-2xl mx-auto px-3 sm:px-4 -mt-6 pb-8 space-y-4">

      <!-- ── 今日摘要卡 ── -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-zinc-600 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100 dark:border-zinc-700">
          <span class="font-semibold text-stone-700 dark:text-stone-100" style="font-size:13px">今日概況</span>
          <NuxtLink to="/staff/booking" class="text-green-700 dark:text-green-400 font-medium" style="font-size:12px">查看詳情 →</NuxtLink>
        </div>

        <div v-if="loading" class="px-4 py-6 text-center text-stone-400" style="font-size:13px">載入中...</div>

        <div v-else-if="bookings.length === 0 && lunchOrders.length === 0"
             class="px-4 py-6 text-center text-stone-400" style="font-size:13px">
          今天尚無訂位或便當記錄
        </div>

        <div v-else class="grid grid-cols-2 divide-x divide-stone-100 dark:divide-zinc-700">
          <!-- 訂位 -->
          <div class="px-4 py-3">
            <div class="flex items-center gap-1.5 mb-2">
              <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
              <span class="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide" style="font-size:10px">訂位</span>
            </div>
            <div v-if="bookings.length === 0" class="text-stone-300 dark:text-stone-600" style="font-size:12px">尚無記錄</div>
            <template v-else>
              <p class="text-stone-800 dark:text-stone-100" style="font-size:13px">
                <span class="font-black" style="font-size:24px">{{ bookings.length }}</span> 筆
                · <span class="font-semibold">{{ bookingTotal }}</span> 人
              </p>
              <div class="mt-1 space-y-0.5" style="font-size:11px; color: #16a34a">
                <div v-if="bookingMeat > 0" class="dark:text-green-400">🍖 葷 {{ bookingMeat }}</div>
                <div v-if="bookingVeg  > 0" class="dark:text-green-400">🌿 素 {{ bookingVeg }}</div>
              </div>
            </template>
          </div>
          <!-- 便當 -->
          <div class="px-4 py-3">
            <div class="flex items-center gap-1.5 mb-2">
              <span class="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></span>
              <span class="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide" style="font-size:10px">便當</span>
            </div>
            <div v-if="lunchOrders.length === 0" class="text-stone-300 dark:text-stone-600" style="font-size:12px">尚無記錄</div>
            <template v-else>
              <p class="text-stone-800 dark:text-stone-100" style="font-size:13px">
                <span class="font-black" style="font-size:24px">{{ lunchTotal }}</span> 個
              </p>
              <div class="mt-1 space-y-0.5" style="font-size:11px; color: #ea580c">
                <div v-if="lunchMeat > 0" class="dark:text-orange-400">🍖 葷 {{ lunchMeat }}</div>
                <div v-if="lunchVeg  > 0" class="dark:text-orange-400">🌿 素 {{ lunchVeg }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- ── 快捷功能 ── -->
      <div>
        <p class="text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-widest px-1 mb-2" style="font-size:10px">功能</p>
        <div class="space-y-2">
          <NuxtLink v-for="s in shortcuts" :key="s.to" :to="s.to"
                    class="shortcut-card bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-600 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
            <div :class="s.color" class="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style="font-size:18px">
              {{ s.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-stone-800 dark:text-stone-100" style="font-size:14px">{{ s.label }}</p>
              <p class="text-stone-400 dark:text-stone-500 mt-0.5" style="font-size:11px">{{ s.desc }}</p>
            </div>
            <svg class="w-4 h-4 text-stone-300 dark:text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
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
