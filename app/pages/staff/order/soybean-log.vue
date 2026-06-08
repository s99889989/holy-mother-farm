<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue'
import {useCommonStore} from '~/stores/common.js'

definePageMeta({layout: 'staff'})

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/soybean')

// ── 月份選擇 ──────────────────────────────────────────────────────
function thisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(thisMonth())

const monthOptions = computed(() => {
  const opts = []
  const now = new Date()
  for (let i = 0; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
    opts.push({val, label})
  }
  return opts
})

// ── 資料 ──────────────────────────────────────────────────────────
const loading = ref(false)
const totalSoymilk = ref(0)
const totalTofu = ref(0)
const orders = ref([])
const lastUpdated = ref('')

const fetchData = async () => {
  loading.value = true
  try {
    const res = await fetch(`${BASE.value}/admin/list?month=${selectedMonth.value}`, {
      credentials: 'include',
    })
    const data = await res.json()
    totalSoymilk.value = data.totalSoymilk ?? 0
    totalTofu.value = data.totalTofu ?? 0
    orders.value = data.orders ?? []
    const now = new Date()
    lastUpdated.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

let autoRefreshTimer = null
onMounted(() => {
  fetchData()
  fetchHints()
  autoRefreshTimer = setInterval(fetchData, 30000)
})
onUnmounted(() => clearInterval(autoRefreshTimer))

// ── 篩選 ──────────────────────────────────────────────────────────
const filterDay = ref('')
const filterStatus = ref('')

const filteredOrders = computed(() => {
  return orders.value.filter(o => {
    if (filterDay.value && o.pickupDay !== filterDay.value) return false
    if (filterStatus.value && o.status !== filterStatus.value) return false
    return true
  })
})

const filteredSoymilk = computed(() =>
  filteredOrders.value.reduce((s, o) => s + (o.soymilkQty || 0), 0))
const filteredTofu = computed(() =>
  filteredOrders.value.reduce((s, o) => s + (o.tofuQty || 0), 0))

// ── 狀態更新 ──────────────────────────────────────────────────────
const updatingId = ref('')

const updateStatus = async (order, newStatus) => {
  updatingId.value = order.id
  try {
    await fetch(`${BASE.value}/admin/status/${order.month}/${order.id}?status=${encodeURIComponent(newStatus)}`, {
      method: 'PATCH',
      credentials: 'include',
    })
    order.status = newStatus
  } catch {
    alert('更新失敗')
  } finally {
    updatingId.value = ''
  }
}

// ── 狀態樣式 ──────────────────────────────────────────────────────
const statusClass = (s) => ({
  '待確認': 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700',
  '已確認': 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700',
  '已取貨': 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700',
  '已取消': 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-500',
}[s] || 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-400')

const pickupLabel = (d) => d === 'tue' ? '週二' : d === 'fri' ? '週五' : d

const STATUSES = ['待確認', '已確認', '已取貨', '已取消']

// ── 刪除 ──────────────────────────────────────────────────────────
const deleteModal = ref({show: false, order: null, submitting: false})

const openDeleteModal = (order) => {
  deleteModal.value = {show: true, order, submitting: false}
}
const closeDeleteModal = () => {
  deleteModal.value = {show: false, order: null, submitting: false}
}

const confirmDelete = async () => {
  const {order} = deleteModal.value
  if (!order) return
  deleteModal.value.submitting = true
  try {
    const res = await fetch(`${BASE.value}/admin/order/${order.month}/${order.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (data.error) { alert('刪除失敗：' + data.error); return }
    orders.value = orders.value.filter(o => o.id !== order.id)
    closeDeleteModal()
  } catch {
    alert('刪除失敗')
  } finally {
    deleteModal.value.submitting = false
  }
}

// ── 提示訊息設定 ──────────────────────────────────────────────────
const showHintSettings = ref(false)
const hintSaving = ref(false)
const hintSaved  = ref(false)

const HINT_STATUSES = ['待確認', '已確認', '已取貨', '已取消']
const hintBadgeClass = (s) => ({
  '待確認': 'bg-amber-100 text-amber-700',
  '已確認': 'bg-emerald-100 text-emerald-700',
  '已取貨': 'bg-teal-100 text-teal-700',
  '已取消': 'bg-red-100 text-red-500',
}[s] || 'bg-stone-100 text-stone-500')

const hints = ref({
  '待確認': '我們已收到您的預約，將盡快來電確認。',
  '已確認': '訂單已確認，請於取貨日前來取貨！',
  '已取貨': '感謝您的訂購，歡迎再次訂購！',
  '已取消': '此筆訂單已取消，歡迎再次訂購。',
})

const fetchHints = async () => {
  try {
    const res  = await fetch(`${BASE.value}/settings/hints`, {credentials: 'include'})
    const data = await res.json()
    if (!data.error) Object.assign(hints.value, data)
  } catch {}
}

const saveHints = async () => {
  hintSaving.value = true
  hintSaved.value  = false
  try {
    const res  = await fetch(`${BASE.value}/settings/hints`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify(hints.value),
    })
    const data = await res.json()
    if (data.error) { alert('儲存失敗：' + data.error); return }
    hintSaved.value = true
    setTimeout(() => hintSaved.value = false, 2500)
  } catch {
    alert('儲存失敗')
  } finally {
    hintSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors">

    <!-- Header -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-14 z-20">
      <div class="max-w-6xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
        </div>
        <h1 class="flex-1 font-bold text-stone-800 dark:text-stone-100 leading-none" style="font-size:15px">豆製品訂購管理</h1>
        <div class="flex items-center gap-2">
          <!-- 設定按鈕 -->
          <button @click="showHintSettings = !showHintSettings"
                  :class="showHintSettings ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'"
                  class="flex items-center gap-1 px-2.5 py-1.5 border rounded-lg transition-colors text-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            設定
          </button>
          <select v-model="selectedMonth" @change="fetchData"
                  class="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500 text-sm">
            <option v-for="o in monthOptions" :key="o.val" :value="o.val">{{ o.label }}</option>
          </select>
          <button @click="fetchData" :disabled="loading"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
                  style="font-size:13px">
            <svg v-if="loading" class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {{ loading ? '載入中…' : '重新整理' }}
          </button>
        </div>
      </div>
    </header>

    <!-- 內容區 -->
    <div class="max-w-6xl mx-auto px-3 sm:px-4 py-4">

      <!-- ── 提示訊息設定面板 ── -->
      <Transition name="hint-panel">
        <div v-if="showHintSettings"
             class="mb-4 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-700">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
              <span class="text-sm font-semibold text-stone-700 dark:text-stone-200">前台提示訊息設定</span>
              <span class="text-xs text-stone-400">（客戶在「我的紀錄」看到的說明文字）</span>
            </div>
            <button @click="showHintSettings = false" class="text-stone-300 hover:text-stone-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-for="s in HINT_STATUSES" :key="s">
              <label class="flex items-center gap-2 mb-1.5">
                <span :class="['inline-block px-2 py-0.5 rounded-full text-xs font-semibold', hintBadgeClass(s)]">{{ s }}</span>
                <span class="text-xs text-stone-400">顯示訊息</span>
              </label>
              <textarea
                v-model="hints[s]"
                rows="2"
                class="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-700 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-500 resize-none font-sans leading-relaxed"
                :placeholder="'「' + s + '」狀態的提示訊息'"
              ></textarea>
            </div>
          </div>
          <div class="px-4 pb-4 flex items-center gap-3">
            <button @click="saveHints" :disabled="hintSaving"
                    class="flex items-center gap-1.5 px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors">
              <svg v-if="hintSaving" class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>
              {{ hintSaving ? '儲存中…' : '儲存設定' }}
            </button>
            <Transition name="fade">
              <span v-if="hintSaved" class="text-sm text-emerald-600 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" points="20 6 9 17 4 12"/></svg>
                已儲存
              </span>
            </Transition>
          </div>
        </div>
      </Transition>

      <!-- 彙總卡片 -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 shadow-sm flex flex-col gap-1">
          <div class="text-xs text-stone-400">本月訂單</div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-extrabold text-stone-800 dark:text-stone-100">{{ orders.length }}</span>
            <span class="text-xs text-stone-400">筆</span>
          </div>
        </div>
        <div class="bg-white dark:bg-zinc-800 border border-green-200 dark:border-green-900/50 rounded-2xl p-4 shadow-sm flex flex-col gap-1" style="background:rgb(240,253,244)">
          <div class="text-xs text-green-600">豆漿（本月）</div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-extrabold text-green-700">{{ totalSoymilk }}</span>
            <span class="text-xs text-green-500">袋</span>
          </div>
        </div>
        <div class="bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 shadow-sm flex flex-col gap-1" style="background:rgb(255,251,235)">
          <div class="text-xs text-amber-600">豆腐（本月）</div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-extrabold text-amber-600">{{ totalTofu }}</span>
            <span class="text-xs text-amber-500">塊</span>
          </div>
        </div>
      </div>

      <!-- 篩選列 -->
      <div class="bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3 mb-4 flex flex-wrap gap-x-4 gap-y-2 items-center">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-stone-400 whitespace-nowrap">取貨日</span>
          <button @click="filterDay = ''" :class="['filter-chip', { active: filterDay === '' }]">全部</button>
          <button @click="filterDay = 'tue'" :class="['filter-chip', { active: filterDay === 'tue' }]">週二</button>
          <button @click="filterDay = 'fri'" :class="['filter-chip', { active: filterDay === 'fri' }]">週五</button>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-stone-400 whitespace-nowrap">狀態</span>
          <button @click="filterStatus = ''" :class="['filter-chip', { active: filterStatus === '' }]">全部</button>
          <button v-for="s in STATUSES" :key="s" @click="filterStatus = s" :class="['filter-chip', { active: filterStatus === s }]">{{ s }}</button>
        </div>
        <div v-if="filterDay || filterStatus" class="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1 whitespace-nowrap">
          篩選：豆漿 <strong>{{ filteredSoymilk }}</strong> 袋 ／ 豆腐 <strong>{{ filteredTofu }}</strong> 塊（{{ filteredOrders.length }} 筆）
        </div>
        <div v-if="lastUpdated" class="ml-auto text-xs text-stone-300 whitespace-nowrap">更新 {{ lastUpdated }}</div>
      </div>

      <!-- 訂單列表 -->
      <div v-if="loading && orders.length === 0" class="text-center py-16 text-stone-400 text-sm">載入中…</div>
      <div v-else-if="filteredOrders.length === 0"
           class="text-center py-16 text-stone-400 text-sm border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl">
        本月尚無訂購紀錄
      </div>
      <div v-else class="bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-stone-50 dark:bg-zinc-700/50 border-b border-stone-200 dark:border-stone-700">
            <tr>
              <th class="px-3 py-2.5 text-left font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">訂購時間</th>
              <th class="px-3 py-2.5 text-left font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">姓名</th>
              <th class="px-3 py-2.5 text-left font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">聯絡</th>
              <th class="px-3 py-2.5 text-left font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">取貨日</th>
              <th class="px-3 py-2.5 text-center font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">豆漿</th>
              <th class="px-3 py-2.5 text-center font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">豆腐</th>
              <th class="px-3 py-2.5 text-left font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">金額</th>
              <th class="px-3 py-2.5 text-left font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">備註</th>
              <th class="px-3 py-2.5 text-left font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">狀態</th>
              <th class="px-3 py-2.5 text-left font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap text-xs">操作</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
            <tr v-for="o in filteredOrders" :key="o.id"
                class="hover:bg-stone-50 dark:hover:bg-zinc-700/30 transition-colors"
                :class="{ 'opacity-40': o.status === '已取消' }">
              <td class="px-3 py-2.5 text-xs text-stone-400 whitespace-nowrap">{{ o.createdAt?.substring(0, 16) }}</td>
              <td class="px-3 py-2.5 font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">{{ o.name }}</td>
              <td class="px-3 py-2.5 text-xs text-stone-500 dark:text-stone-400">{{ o.contact }}</td>
              <td class="px-3 py-2.5">
                  <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                        :class="o.pickupDay === 'tue' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'">
                    {{ pickupLabel(o.pickupDay) }}
                  </span>
              </td>
              <td class="px-3 py-2.5 text-center">
                <span v-if="o.soymilkQty" class="font-semibold text-green-700 text-xs">{{ o.soymilkQty }} 袋</span>
                <span v-else class="text-stone-300 text-xs">—</span>
              </td>
              <td class="px-3 py-2.5 text-center">
                <span v-if="o.tofuQty" class="font-semibold text-amber-600 text-xs">{{ o.tofuQty }} 塊</span>
                <span v-else class="text-stone-300 text-xs">—</span>
              </td>
              <td class="px-3 py-2.5 font-semibold text-stone-800 dark:text-stone-100 text-xs whitespace-nowrap">
                ${{ (o.soymilkQty || 0) * 50 + (o.tofuQty || 0) * 50 }}
              </td>
              <td class="px-3 py-2.5 text-xs text-stone-400 max-w-[100px] truncate">{{ o.remark || '—' }}</td>
              <td class="px-3 py-2.5"><span :class="statusClass(o.status)">{{ o.status }}</span></td>
              <td class="px-3 py-2.5">
                <div class="flex gap-1 flex-wrap">
                  <button v-for="s in STATUSES.filter(s => s !== o.status)" :key="s"
                          :disabled="updatingId === o.id" @click="updateStatus(o, s)"
                          class="px-2 py-0.5 text-xs border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-600 dark:text-stone-300 hover:bg-green-700 hover:text-white hover:border-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                    {{ s }}
                  </button>
                  <button :disabled="updatingId === o.id" @click="openDeleteModal(o)"
                          class="px-2 py-0.5 text-xs border border-red-200 dark:border-red-900 rounded-lg bg-white dark:bg-zinc-700 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- 刪除確認 Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="deleteModal.show"
             class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
             @click.self="closeDeleteModal">
          <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-2">確認刪除訂單？</h3>
            <p v-if="deleteModal.order" class="text-sm text-stone-500 leading-relaxed mb-5">
              <strong class="text-stone-700">{{ deleteModal.order.name }}</strong>　{{ pickupLabel(deleteModal.order.pickupDay) }} 取貨<br>
              <span v-if="deleteModal.order.soymilkQty">豆漿 × {{ deleteModal.order.soymilkQty }} 袋　</span>
              <span v-if="deleteModal.order.tofuQty">豆腐 × {{ deleteModal.order.tofuQty }} 塊</span>
              <br><span class="text-red-400 text-xs">刪除後無法復原</span>
            </p>
            <div class="flex gap-2">
              <button @click="closeDeleteModal" :disabled="deleteModal.submitting"
                      class="flex-1 py-2 text-sm border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 disabled:opacity-50 transition-colors">
                取消
              </button>
              <button @click="confirmDelete" :disabled="deleteModal.submitting"
                      class="flex-1 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                <span v-if="deleteModal.submitting" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {{ deleteModal.submitting ? '刪除中…' : '確認刪除' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.filter-chip {
  padding: 3px 12px;
  border: 1.5px solid #e7e5e4;
  border-radius: 20px;
  background: white;
  color: #78716c;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.dark .filter-chip { border-color: #52525b; background: #3f3f46; color: #d6d3d1; }
.filter-chip.active { background: #15803d; color: white; border-color: #15803d; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.hint-panel-enter-active, .hint-panel-leave-active { transition: opacity 0.2s, transform 0.2s; }
.hint-panel-enter-from, .hint-panel-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
