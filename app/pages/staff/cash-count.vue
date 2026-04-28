<script setup>
definePageMeta({ layout: 'staff' })

const commonStore = useCommonStore()
const BASE        = () => commonStore.data.main_url + '/holy/cashCount'

const denomGroups = [
  [{ label: '1000元', value: 1000 }, { label: '500元', value: 500 }, { label: '100元', value: 100 }],
  [{ label: '50元', value: 50 }, { label: '10元', value: 10 }, { label: '5元', value: 5 }, { label: '1元', value: 1 }],
]
const allDenoms = denomGroups.flat()

// ── 日曆 ──────────────────────────────────────────────────────────
const today    = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const calYear      = ref(today.getFullYear())
const calMonth     = ref(today.getMonth() + 1)
const selectedDate = ref(todayStr)
const calOpen      = ref(false)  // 預設收起

const calendarDays = computed(() => {
  const firstDay    = new Date(calYear.value, calMonth.value - 1, 1).getDay()
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
}
function nextMonth() {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
}
function pickDate(date) {
  selectedDate.value = date
  calOpen.value = false  // 選完自動收起
}

// ── 資料 ──────────────────────────────────────────────────────────
const loading    = ref(false)
const records    = ref([])
const expandedId = ref(null)

const recordDates     = computed(() => new Set(records.value.map(r => r.date)))
const selectedRecords = computed(() => records.value.filter(r => r.date === selectedDate.value))

async function fetchRecords() {
  loading.value = true
  try {
    const res     = await fetch(`${BASE()}/list`)
    records.value = await res.json()
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

onMounted(fetchRecords)
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors">

    <!-- Header -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-14 z-20">
      <div class="max-w-2xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">💵</div>
        <div>
          <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none" style="font-size:15px">點鈔記錄</h1>
          <p class="text-stone-400 mt-0.5" style="font-size:11px">僅供查看，如需修改請聯絡管理員</p>
        </div>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4">

      <!-- ── 日曆折疊區塊 ── -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm mb-4 overflow-hidden">

        <!-- 標題列（點擊展開/收起） -->
        <button class="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-700/50 transition-colors"
                @click="calOpen = !calOpen">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span class="font-medium text-stone-700 dark:text-stone-200" style="font-size:14px">{{ selectedDate }}</span>
            <span v-if="recordDates.has(selectedDate)" class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
          </div>
          <svg class="w-4 h-4 text-stone-400 transition-transform flex-shrink-0"
               :class="calOpen ? 'rotate-180' : ''"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        <!-- 日曆本體 -->
        <Transition name="cal">
          <div v-if="calOpen" class="border-t border-stone-100 dark:border-stone-700 px-4 pb-4 pt-3">
            <!-- 月份導航 -->
            <div class="flex items-center justify-between mb-3">
              <button @click="prevMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-4 h-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="font-semibold text-stone-700 dark:text-stone-100" style="font-size:14px">
                {{ calYear }}年 {{ calMonth }}月
              </span>
              <button @click="nextMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-4 h-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <!-- 星期標頭 -->
            <div class="grid grid-cols-7 mb-1">
              <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                   class="text-center text-stone-400 dark:text-stone-500 font-medium py-1"
                   style="font-size:12px">{{ w }}</div>
            </div>
            <!-- 日期格 -->
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(day, idx) in calendarDays" :key="idx"
                   class="relative flex flex-col items-center justify-center aspect-square rounded-xl cursor-pointer transition-all select-none"
                   style="font-size:13px"
                   :class="dayClass(day)"
                   @click="day.date && pickDate(day.date)">
                <span>{{ day.label }}</span>
                <span v-if="day.date && recordDates.has(day.date)"
                      class="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                      :class="day.date === selectedDate ? 'bg-white' : 'bg-green-500'">
                </span>
              </div>
            </div>
            <!-- 快速今天 -->
            <div class="flex justify-end mt-2 pt-2 border-t border-stone-100 dark:border-stone-700">
              <button @click="pickDate(todayStr)"
                      class="text-green-700 dark:text-green-400 hover:text-green-800 font-medium"
                      style="font-size:13px">今天</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── 記錄列表 ── -->
      <h2 class="font-semibold text-stone-700 dark:text-stone-100 mb-3" style="font-size:14px">
        {{ selectedDate }} 點鈔記錄
      </h2>

      <div v-if="loading" class="text-center py-8 text-stone-400" style="font-size:13px">載入中...</div>

      <div v-else-if="selectedRecords.length === 0"
           class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-10 text-center text-stone-400 shadow-sm"
           style="font-size:13px">
        這天沒有點鈔記錄
      </div>

      <div v-else class="space-y-3">
        <div v-for="r in selectedRecords" :key="r.id"
             class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">

          <!-- 摘要列 -->
          <button class="w-full flex items-stretch text-left" @click="toggleExpand(r.id)">
            <div class="w-20 flex-shrink-0 bg-green-50 dark:bg-green-900/20 flex flex-col items-center justify-center border-r border-green-100 dark:border-green-800/30 py-3 px-1">
              <span class="text-green-600 dark:text-green-400 uppercase tracking-wide mb-0.5" style="font-size:10px">總計</span>
              <span class="font-black text-green-700 dark:text-green-300 leading-tight text-center" style="font-size:15px">
                ${{ Number(r.total).toLocaleString() }}
              </span>
            </div>
            <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div v-if="r.note" class="mb-1">
                  <span class="bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-stone-300 rounded-full px-2 py-0.5"
                        style="font-size:11px">{{ r.note }}</span>
                </div>
                <p v-if="r.createdAt" class="text-stone-300 dark:text-stone-600 mt-1" style="font-size:11px">
                  建立 {{ r.createdAt }}
                </p>
              </div>
              <svg class="w-4 h-4 text-stone-400 flex-shrink-0 transition-transform"
                   :class="expandedId === r.id ? 'rotate-180' : ''"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </button>

          <!-- 展開明細 -->
          <Transition name="expand">
            <div v-if="expandedId === r.id" class="border-t border-stone-100 dark:border-stone-700">

              <table class="w-full" style="font-size:13px">
                <thead>
                <tr class="bg-stone-50 dark:bg-zinc-700/50">
                  <th class="text-left px-4 py-2 text-stone-400 font-normal">面額</th>
                  <th class="text-right px-4 py-2 text-stone-400 font-normal">數量</th>
                  <th class="text-right px-4 py-2 text-stone-400 font-normal">小計</th>
                </tr>
                </thead>
                <tbody>
                <template v-for="(group, gi) in denomGroups" :key="gi">
                  <tr v-if="gi > 0"><td colspan="3" class="border-t-2 border-dashed border-stone-100 dark:border-stone-700"></td></tr>
                  <template v-for="d in group" :key="d.value">
                    <tr v-if="r.items && Number(r.items[d.value]) > 0"
                        class="border-t border-stone-50 dark:border-stone-700/50">
                      <td class="px-4 py-2">
                          <span class="bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 rounded px-2 py-0.5"
                                style="font-size:12px;font-weight:500">{{ d.label }}</span>
                      </td>
                      <td class="px-4 py-2 text-right text-stone-600 dark:text-stone-300">× {{ r.items[d.value] }}</td>
                      <td class="px-4 py-2 text-right font-medium text-stone-800 dark:text-stone-100">
                        {{ (Number(r.items[d.value]) * d.value).toLocaleString() }}
                      </td>
                    </tr>
                  </template>
                </template>
                </tbody>
              </table>

              <div class="flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-zinc-700/50 border-t border-stone-100 dark:border-stone-700">
                <span class="text-stone-500 dark:text-stone-400" style="font-size:13px">總金額</span>
                <span class="font-semibold text-stone-800 dark:text-stone-100" style="font-size:17px">
                  ${{ Number(r.total).toLocaleString() }}
                </span>
              </div>

              <div v-if="r.photoPath" class="px-4 pb-4">
                <img :src="`${BASE()}/photo/${r.photoPath}`"
                     class="w-full max-h-64 rounded-xl object-contain border border-stone-100 dark:border-stone-700" />
              </div>

              <div v-if="r.updatedAt && r.updatedAt !== r.createdAt"
                   class="px-4 pb-3 text-stone-300 dark:text-stone-600" style="font-size:11px">
                更新 {{ r.updatedAt }}
              </div>
            </div>
          </Transition>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.cal-enter-active, .cal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.cal-enter-from, .cal-leave-to { opacity: 0; transform: translateY(-6px); }

.expand-enter-active, .expand-leave-active { transition: opacity 0.2s, transform 0.2s; }
.expand-enter-from, .expand-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
