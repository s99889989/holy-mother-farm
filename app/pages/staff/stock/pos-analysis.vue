<template>
  <div class="min-h-full bg-page transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4" style="height:52px">
      <div class="max-w-5xl mx-auto h-full flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">📊</div>
          <div>
            <h1 class="font-bold text-base-c leading-none" style="font-size:15px">POS 銷售分析</h1>
            <p v-if="storeLabel !== 'POS'" class="text-hint-c" style="font-size:11px">{{ storeLabel }}</p>
          </div>
        </div>
        <div v-if="allInvoices.length" class="hidden sm:flex items-center gap-4">
          <div class="text-right">
            <div class="font-bold text-base-c" style="font-size:14px">{{ formatMoney(filteredTotal) }}</div>
            <div class="text-hint-c" style="font-size:10px">{{ filteredDays.length }} 天・{{ filteredInvoices.length }} 筆</div>
          </div>
          <button class="px-3 py-1.5 rounded-lg border border-light-c text-muted-c hover-surface2 transition-colors" style="font-size:12px" @click="loadData">重新載入</button>
        </div>
      </div>
    </header>

    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-12">

      <!-- 載入中 -->
      <div v-if="loading" class="text-center py-12 text-hint-c" style="font-size:13px">
        <div class="inline-block w-5 h-5 rounded-full border-2 border-light-c spinner mb-2"></div>
        <p>載入資料中...</p>
      </div>

      <!-- 錯誤 -->
      <div v-else-if="parseError" class="bg-surface border border-light-c rounded-2xl px-4 py-6 text-center shadow-sm">
        <p class="text-hint-c" style="font-size:13px">⚠ {{ parseError }}</p>
        <button class="mt-3 px-4 py-1.5 rounded-lg bg-green-700 text-white" style="font-size:12px" @click="loadData">重試</button>
      </div>

      <template v-else-if="allInvoices.length">

        <!-- ── 篩選工具列 ── -->
        <div class="bg-surface border border-light-c rounded-2xl p-4 mb-4 shadow-sm flex flex-col gap-3">

          <!-- 月份 -->
          <div>
            <p class="text-hint-c mb-1.5" style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">月份</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="m in availableMonths" :key="m"
                class="px-3 py-1 rounded-lg transition-colors flex-shrink-0"
                :class="selectedMonths.includes(m) ? 'bg-green-700 text-white font-semibold' : 'bg-surface2 text-muted-c hover-surface2'"
                style="font-size:12px"
                @click="toggleMonth(m)"
              >{{ m }}</button>
            </div>
          </div>

          <!-- 星期 -->
          <div>
            <p class="text-hint-c mb-1.5" style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">星期篩選</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="(wd, idx) in weekdays" :key="idx"
                class="px-3 py-1 rounded-lg transition-colors flex-shrink-0 font-semibold"
                :class="[
                  selectedWeekdays.includes(idx)
                    ? (idx===6 ? 'bg-blue-600 text-white' : idx===0 ? 'bg-red-600 text-white' : 'bg-green-700 text-white')
                    : (idx===6 ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : idx===0 ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-surface2 text-muted-c hover-surface2')
                ]"
                style="font-size:12px"
                @click="toggleWeekday(idx)"
              >{{ wd }}</button>
            </div>
          </div>

          <!-- 商品篩選 -->
          <div>
            <p class="text-hint-c mb-1.5" style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">
              商品篩選
              <span v-if="selectedItems.length" class="ml-1 px-1.5 py-0.5 rounded-full bg-green-700 text-white" style="font-size:10px">已選 {{ selectedItems.length }}</span>
            </p>
            <div class="flex items-center gap-2 mb-2">
              <input v-model="itemSearch" type="text" placeholder="關鍵字過濾..." class="flex-1 max-w-xs px-3 py-1.5 rounded-lg border border-light-c bg-surface2 text-base-c text-sm outline-none focus:border-green-600 transition-colors" style="font-size:12px" />
              <button class="px-2.5 py-1.5 rounded-lg border border-light-c text-muted-c hover-surface2 transition-colors" style="font-size:11px" @click="selectAllItems">全選</button>
              <button class="px-2.5 py-1.5 rounded-lg border border-light-c text-muted-c hover-surface2 transition-colors" style="font-size:11px" @click="selectedItems = []">清除</button>
            </div>
            <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              <label
                v-for="name in filteredAllItemNames" :key="name"
                class="flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-pointer transition-all select-none"
                :class="selectedItems.includes(name) ? 'bg-green-700 border-green-700 text-white' : 'border-light-c bg-surface2 text-muted-c'"
                style="font-size:12px"
              >
                <input type="checkbox" :value="name" v-model="selectedItems" class="hidden" />
                {{ name }}
              </label>
            </div>
          </div>

          <div class="flex justify-end">
            <button class="px-3 py-1.5 rounded-lg border border-light-c text-muted-c hover-surface2 transition-colors" style="font-size:12px" @click="resetFilters">重設篩選</button>
          </div>
        </div>

        <!-- ── 摘要卡片 ── -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div class="bg-surface border border-light-c rounded-2xl p-4 shadow-sm">
            <div class="font-bold text-base-c" style="font-size:18px">{{ formatMoney(filteredTotal) }}</div>
            <div class="text-hint-c mt-0.5" style="font-size:11px">篩選銷售額</div>
            <div class="text-green-600 mt-0.5" style="font-size:10px">共 {{ filteredDays.length }} 天</div>
          </div>
          <div class="bg-surface border border-light-c rounded-2xl p-4 shadow-sm">
            <div class="font-bold text-base-c" style="font-size:18px">{{ filteredDays.length ? formatMoney(Math.round(filteredTotal / filteredDays.length)) : '—' }}</div>
            <div class="text-hint-c mt-0.5" style="font-size:11px">每日平均</div>
          </div>
          <div v-if="selectedItems.length" class="bg-surface border border-green-200 dark:border-green-800 rounded-2xl p-4 shadow-sm">
            <div class="font-bold text-green-700 dark:text-green-400" style="font-size:18px">{{ formatMoney(filteredItemTotal) }}</div>
            <div class="text-hint-c mt-0.5" style="font-size:11px">指定商品</div>
            <div class="text-green-600 mt-0.5" style="font-size:10px">佔 {{ filteredTotal ? Math.round(filteredItemTotal / filteredTotal * 100) : 0 }}%</div>
          </div>
          <div v-if="selectedItems.length" class="bg-surface border border-green-200 dark:border-green-800 rounded-2xl p-4 shadow-sm">
            <div class="font-bold text-green-700 dark:text-green-400" style="font-size:18px">{{ filteredDays.length ? formatMoney(Math.round(filteredItemTotal / filteredDays.length)) : '—' }}</div>
            <div class="text-hint-c mt-0.5" style="font-size:11px">指定每日均</div>
          </div>
          <div class="bg-surface border border-light-c rounded-2xl p-4 shadow-sm">
            <div class="font-bold text-base-c" style="font-size:18px">{{ filteredInvoices.length }}</div>
            <div class="text-hint-c mt-0.5" style="font-size:11px">筆交易</div>
          </div>
          <div class="bg-surface border border-light-c rounded-2xl p-4 shadow-sm">
            <div class="font-bold text-base-c" style="font-size:18px">{{ filteredInvoices.length ? formatMoney(Math.round(filteredTotal / filteredInvoices.length)) : '—' }}</div>
            <div class="text-hint-c mt-0.5" style="font-size:11px">平均客單價</div>
          </div>
        </div>

        <!-- ── 每日銷售明細 ── -->
        <div class="bg-surface border border-light-c rounded-2xl shadow-sm mb-4 overflow-hidden">
          <div class="px-4 py-3 border-b border-light-c">
            <h2 class="font-bold text-base-c" style="font-size:13px">每日銷售明細</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse" style="font-size:13px">
              <thead>
              <tr class="border-b border-light-c">
                <th class="text-left px-4 py-2.5 text-hint-c font-semibold" style="font-size:11px">日期</th>
                <th class="text-left px-3 py-2.5 text-hint-c font-semibold mobile-hide" style="font-size:11px">星期</th>
                <th class="text-right px-3 py-2.5 text-hint-c font-semibold mobile-hide" style="font-size:11px">筆數</th>
                <th class="text-right px-3 py-2.5 text-hint-c font-semibold" style="font-size:11px">銷售額</th>
                <th v-if="selectedItems.length" class="text-right px-3 py-2.5 text-hint-c font-semibold" style="font-size:11px">指定商品</th>
                <th class="px-3 py-2.5 w-6"></th>
              </tr>
              </thead>
              <tbody>
              <template v-for="(group, month) in filteredDaysByMonth" :key="month">
                <!-- 月份標題 -->
                <tr class="cursor-pointer select-none border-b border-light-c month-header-tr" @click="toggleExpandMonth(month)">
                  <td colspan="6" class="px-4 py-2">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-base-c" style="font-size:12px">
                          <span class="mr-1 text-hint-c" style="font-size:10px">{{ expandedMonths.has(month) ? '▾' : '▸' }}</span>
                          {{ month }}
                        </span>
                      <span class="text-hint-c" style="font-size:11px">{{ group.length }} 天・{{ formatMoney(monthTotal(group)) }}</span>
                    </div>
                  </td>
                </tr>

                <template v-if="expandedMonths.has(month)">
                  <template v-for="day in group" :key="day.date">
                    <tr
                      class="border-b border-light-c cursor-pointer transition-colors day-tr"
                      :class="{ 'sat-row': day.weekdayIdx===6, 'sun-row': day.weekdayIdx===0, 'expanded-row': expandedDay===day.date }"
                      @click="toggleDay(day.date)"
                    >
                      <td class="px-4 py-2.5 text-base-c font-medium">{{ day.date }}</td>
                      <td class="px-3 py-2.5 mobile-hide">
                          <span class="px-1.5 py-0.5 rounded text-xs font-semibold"
                                :class="day.weekdayIdx===6 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : day.weekdayIdx===0 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-surface2 text-muted-c'"
                          >{{ weekdays[day.weekdayIdx] }}</span>
                      </td>
                      <td class="px-3 py-2.5 text-right text-muted-c mobile-hide">{{ day.invoices.length }}</td>
                      <td class="px-3 py-2.5 text-right font-semibold text-base-c">{{ formatMoney(day.total) }}</td>
                      <td v-if="selectedItems.length" class="px-3 py-2.5 text-right font-semibold text-green-700 dark:text-green-400">{{ formatMoney(day.itemTotal) }}</td>
                      <td class="px-3 py-2.5 text-hint-c text-right" style="font-size:10px">{{ expandedDay===day.date ? '▲' : '▼' }}</td>
                    </tr>

                    <!-- 展開明細 -->
                    <tr v-if="expandedDay===day.date" class="border-b border-light-c">
                      <td :colspan="selectedItems.length ? 6 : 5" class="p-0">
                        <div class="p-3 flex flex-wrap gap-2 bg-surface2">
                          <template v-for="inv in day.invoices" :key="inv.invNo">
                            <div v-if="!selectedItems.length || invItemTotal(inv) > 0"
                                 class="bg-surface border border-light-c rounded-xl p-3 flex-1 shadow-sm"
                                 style="min-width:200px"
                            >
                              <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="font-mono font-bold text-green-700 dark:text-green-400" style="font-size:11px">{{ inv.invNo }}</span>
                                <span class="text-hint-c ml-auto" style="font-size:11px">{{ inv.time }}</span>
                                <span class="font-bold text-base-c" style="font-size:13px">{{ formatMoney(selectedItems.length ? invItemTotal(inv) : inv.amt) }}</span>
                              </div>
                              <div class="flex flex-col gap-0.5">
                                <template v-for="(it, i) in inv.items" :key="i">
                                  <div v-if="!selectedItems.length || selectedItems.includes(it.name)"
                                       class="flex justify-between items-center px-2 py-1 rounded"
                                       :class="selectedItems.includes(it.name) ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''"
                                       style="font-size:11px"
                                  >
                                    <span class="text-base-c">{{ it.name }}</span>
                                    <span class="text-hint-c font-mono ml-2">{{ it.qty }}×{{ formatMoney(it.price) }}={{ formatMoney(it.subtotal) }}</span>
                                  </div>
                                </template>
                              </div>
                            </div>
                          </template>
                        </div>
                      </td>
                    </tr>
                  </template>

                  <!-- 月份平均 -->
                  <tr class="border-b-2 border-light-c">
                    <td class="px-4 py-2 font-semibold text-green-700 dark:text-green-400" style="font-size:12px">{{ month }} 平均／天</td>
                    <td class="mobile-hide"></td>
                    <td class="px-3 py-2 text-right text-hint-c mobile-hide" style="font-size:12px">{{ (monthInvoiceCount(group)/group.length).toFixed(1) }}</td>
                    <td class="px-3 py-2 text-right font-semibold text-green-700 dark:text-green-400" style="font-size:12px">{{ formatMoney(Math.round(monthTotal(group)/group.length)) }}</td>
                    <td v-if="selectedItems.length" class="px-3 py-2 text-right font-semibold text-green-700 dark:text-green-400" style="font-size:12px">{{ formatMoney(Math.round(monthItemTotal(group)/group.length)) }}</td>
                    <td></td>
                  </tr>
                </template>
              </template>
              </tbody>
              <tfoot>
              <tr class="border-t-2 border-light-c font-bold">
                <td class="px-4 py-3 text-base-c">合計</td>
                <td class="mobile-hide"></td>
                <td class="px-3 py-3 text-right text-muted-c mobile-hide">{{ filteredInvoices.length }}</td>
                <td class="px-3 py-3 text-right text-base-c">{{ formatMoney(filteredTotal) }}</td>
                <td v-if="selectedItems.length" class="px-3 py-3 text-right text-green-700 dark:text-green-400">{{ formatMoney(filteredItemTotal) }}</td>
                <td></td>
              </tr>
              <tr class="border-b border-light-c">
                <td class="px-4 py-2 text-hint-c" style="font-size:12px">每日平均</td>
                <td class="mobile-hide"></td>
                <td class="px-3 py-2 text-right text-hint-c mobile-hide" style="font-size:12px">{{ filteredDays.length ? (filteredInvoices.length/filteredDays.length).toFixed(1) : '—' }}</td>
                <td class="px-3 py-2 text-right text-hint-c" style="font-size:12px">{{ filteredDays.length ? formatMoney(Math.round(filteredTotal/filteredDays.length)) : '—' }}</td>
                <td v-if="selectedItems.length" class="px-3 py-2 text-right text-hint-c" style="font-size:12px">{{ filteredDays.length ? formatMoney(Math.round(filteredItemTotal/filteredDays.length)) : '—' }}</td>
                <td></td>
              </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- ── 商品排行 ── -->
        <div class="bg-surface border border-light-c rounded-2xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b border-light-c">
            <h2 class="font-bold text-base-c" style="font-size:13px">商品銷售排行</h2>
          </div>
          <div class="p-4 flex flex-col gap-2">
            <div v-for="(item, idx) in itemRanking" :key="item.name" class="flex items-center gap-3" style="font-size:12px">
              <span class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
                    :class="idx < 3 ? 'bg-green-700 text-white' : 'bg-surface2 text-muted-c'"
                    style="font-size:11px"
              >{{ idx+1 }}</span>
              <span class="flex-1 text-base-c truncate">{{ item.name }}</span>
              <div class="hidden sm:block flex-1 max-w-24 bg-surface2 rounded-full h-1.5">
                <div class="bg-green-600 h-full rounded-full" :style="{ width: (item.total/itemRanking[0].total*100)+'%' }"></div>
              </div>
              <span class="font-semibold text-base-c w-20 text-right">{{ formatMoney(item.total) }}</span>
              <span class="text-hint-c w-12 text-right hidden sm:block">{{ item.qty }} 件</span>
            </div>
          </div>
        </div>

      </template>

      <!-- 空狀態 -->
      <div v-else class="bg-surface border border-light-c rounded-2xl px-4 py-12 text-center shadow-sm">
        <div class="text-4xl mb-3">📊</div>
        <p class="text-base-c font-semibold mb-1" style="font-size:14px">尚無銷售資料</p>
        <p class="text-hint-c" style="font-size:12px">請確認伺服器上的 pos/sale-data 目錄有 InvD*.txt 檔案</p>
        <button class="mt-4 px-4 py-2 rounded-xl bg-green-700 text-white font-semibold" style="font-size:13px" @click="loadData">重新載入</button>
      </div>

    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'stock.pos-analysis' })

import { ref, computed, onMounted } from 'vue'

// ── State ─────────────────────────────────────────────────
const loadedFiles    = ref([])
const parseError     = ref('')
const allInvoices    = ref([])
const selectedMonths  = ref([])
const selectedWeekdays = ref([])
const selectedItems  = ref([])
const itemSearch     = ref('')
const expandedDay    = ref(null)
const expandedMonths = ref(new Set())
const loading        = ref(false)
const weekdays       = ['日','一','二','三','四','五','六']

// ── 載入 ─────────────────────────────────────────────────
async function loadData() {
  loading.value = true
  parseError.value = ''
  try {
    const commonStore = useCommonStore()
    const BASE = commonStore.data.main_url + '/holy/pos'
    const data = await (await fetch(`${BASE}/all`)).json()
    allInvoices.value = data
    const dates = new Set(data.map(inv => inv.date))
    loadedFiles.value = [...dates].sort()
    selectedMonths.value = [...availableMonths.value]
  } catch (e) {
    parseError.value = `載入失敗：${e.message}`
  } finally {
    loading.value = false
  }
}
onMounted(() => loadData())

// ── Computed ──────────────────────────────────────────────
const availableMonths = computed(() => {
  const s = new Set()
  for (const inv of allInvoices.value) s.add(inv.date.substring(0,7))
  return [...s].sort()
})

const storeLabel = computed(() => {
  const s = new Set(allInvoices.value.map(i => i.storeId).filter(Boolean))
  return s.size ? [...s].join('・') : 'POS'
})

const dayMap = computed(() => {
  const map = {}
  for (const inv of allInvoices.value) {
    if (!map[inv.date]) {
      const d = new Date(inv.date.replace(/\//g,'-'))
      map[inv.date] = { date: inv.date, weekdayIdx: d.getDay(), invoices: [], total: 0, itemTotal: 0 }
    }
    map[inv.date].invoices.push(inv)
    map[inv.date].total += inv.amt
  }
  return map
})

const filteredDays = computed(() =>
  Object.values(dayMap.value)
    .filter(day => {
      const mOk = !selectedMonths.value.length || selectedMonths.value.includes(day.date.substring(0,7))
      const wOk = !selectedWeekdays.value.length || selectedWeekdays.value.includes(day.weekdayIdx)
      return mOk && wOk
    })
    .map(day => {
      let itemTotal = 0
      if (selectedItems.value.length)
        for (const inv of day.invoices)
          for (const it of inv.items)
            if (selectedItems.value.includes(it.name)) itemTotal += it.subtotal
      return { ...day, itemTotal }
    })
    .sort((a,b) => a.date.localeCompare(b.date))
)

const filteredInvoices = computed(() => filteredDays.value.flatMap(d => d.invoices))
const filteredTotal    = computed(() => filteredDays.value.reduce((s,d) => s+d.total, 0))
const filteredItemTotal = computed(() => filteredDays.value.reduce((s,d) => s+d.itemTotal, 0))

const filteredDaysByMonth = computed(() => {
  const map = {}
  for (const day of filteredDays.value) {
    const m = day.date.substring(0,7)
    if (!map[m]) map[m] = []
    map[m].push(day)
  }
  return map
})

function monthTotal(g)        { return g.reduce((s,d) => s+d.total, 0) }
function monthItemTotal(g)    { return g.reduce((s,d) => s+d.itemTotal, 0) }
function monthInvoiceCount(g) { return g.reduce((s,d) => s+d.invoices.length, 0) }

const itemRanking = computed(() => {
  const map = {}
  for (const inv of filteredInvoices.value)
    for (const it of inv.items) {
      if (!map[it.name]) map[it.name] = { name: it.name, total: 0, qty: 0 }
      map[it.name].total += it.subtotal
      map[it.name].qty   += it.qty
    }
  return Object.values(map).sort((a,b) => b.total-a.total).slice(0,20)
})

const allItemNames = computed(() => {
  const s = new Set()
  for (const inv of allInvoices.value)
    for (const it of inv.items) s.add(it.name)
  return [...s].sort()
})

const filteredAllItemNames = computed(() =>
  itemSearch.value ? allItemNames.value.filter(n => n.includes(itemSearch.value)) : allItemNames.value
)

// ── 操作 ─────────────────────────────────────────────────
function toggleMonth(m) {
  const i = selectedMonths.value.indexOf(m)
  if (i >= 0) selectedMonths.value.splice(i,1); else selectedMonths.value.push(m)
}
function toggleWeekday(idx) {
  const i = selectedWeekdays.value.indexOf(idx)
  if (i >= 0) selectedWeekdays.value.splice(i,1); else selectedWeekdays.value.push(idx)
}
function selectAllItems() { selectedItems.value = [...filteredAllItemNames.value] }
function toggleExpandMonth(month) {
  if (expandedMonths.value.has(month)) expandedMonths.value.delete(month)
  else expandedMonths.value.add(month)
  expandedMonths.value = new Set(expandedMonths.value)
}
function toggleDay(date) { expandedDay.value = expandedDay.value===date ? null : date }
function resetFilters() {
  selectedMonths.value = [...availableMonths.value]
  selectedWeekdays.value = []
  selectedItems.value = []
  itemSearch.value = ''
  expandedDay.value = null
}
function invItemTotal(inv) {
  return inv.items.filter(it => selectedItems.value.includes(it.name)).reduce((s,it) => s+it.subtotal, 0)
}
function formatMoney(n) {
  if (!n && n !== 0) return '—'
  return '$' + Math.round(n).toLocaleString('zh-TW')
}
</script>

<style scoped>
.spinner {
  border-top-color: #16a34a;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.month-header-tr { background: var(--color-surface2, #f5f4f0); }
.month-header-tr:hover { filter: brightness(0.97); }

.day-tr:hover td { background: var(--color-surface2, #f5f5f5); }
.sat-row td { background: rgba(59,130,246,.05); }
.sun-row td { background: rgba(239,68,68,.05); }
.expanded-row td { background: rgba(22,163,74,.07) !important; }

@media (max-width: 640px) {
  .mobile-hide { display: none !important; }
}
</style>
