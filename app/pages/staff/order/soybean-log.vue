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

// ── 按日期分組 ────────────────────────────────────────────────────
const groupedOrders = computed(() => {
  const map = new Map()
  for (const o of filteredOrders.value) {
    const dateStr = o.createdAt?.substring(0, 10) ?? ''
    if (!map.has(dateStr)) map.set(dateStr, [])
    map.get(dateStr).push(o)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, orders]) => {
      const [y, m, d] = date.split('-')
      const weekDay = ['日','一','二','三','四','五','六'][new Date(date).getDay()]
      return { date, dateLabel: `${m}/${d}（週${weekDay}）`, orders }
    })
})
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

// 根據訂單建立時間推算當週的取貨日期（週二=2, 週五=5）
// 若訂單建立當天已超過取貨日，則取下一週
const pickupLabel = (order) => {
  const dayMap = { tue: { label: '週二', dow: 2 }, fri: { label: '週五', dow: 5 } }
  const info = dayMap[order?.pickupDay]
  if (!info) return order?.pickupDay ?? ''
  const base = order?.createdAt ? new Date(order.createdAt) : new Date()
  const baseDow = base.getDay() // 0=日
  let diff = info.dow - baseDow
  if (diff < 0) diff += 7   // 已過，取下週
  const target = new Date(base)
  target.setDate(base.getDate() + diff)
  const m = target.getMonth() + 1
  const d = target.getDate()
  return `${info.label} ${m}/${d}`
}

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

// ── 新增訂單 ──────────────────────────────────────────────────────
const createModal = ref({show: false, submitting: false})
const createForm = ref({
  name: '', contact: '', pickupDay: 'tue',
  soymilkQty: 0, tofuQty: 0, soymilkVolume: 800, soymilkCustomVolume: 0, remark: '', status: '已確認',
})

const openCreateModal = () => {
  createForm.value = { name: '', contact: '', pickupDay: 'tue', soymilkQty: 0, tofuQty: 0, soymilkVolume: 800, soymilkCustomVolume: 0, remark: '', status: '已確認' }
  createModal.value = { show: true, submitting: false }
}
const closeCreateModal = () => {
  createModal.value = { show: false, submitting: false }
}

const adjCreate = (field, delta) => {
  createForm.value[field] = Math.max(0, createForm.value[field] + delta)
}

const submitCreate = async () => {
  const f = createForm.value
  if (!f.name.trim())    { alert('請輸入姓名'); return }
  if (!f.contact.trim()) { alert('請輸入聯絡方式'); return }
  if (f.soymilkQty === 0 && f.tofuQty === 0) { alert('請選擇豆漿或豆腐數量'); return }
  createModal.value.submitting = true
  try {
    const resolvedVolume = f.soymilkVolume === -1 ? (f.soymilkCustomVolume || 0) : (f.soymilkVolume || 0)
    const payload = {
      name: f.name.trim(), contact: f.contact.trim(),
      pickupDay: f.pickupDay, soymilkQty: f.soymilkQty,
      tofuQty: f.tofuQty, soymilkVolume: resolvedVolume,
      remark: f.remark.trim(),
    }
    const res = await fetch(`${BASE.value}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.error) { alert('新增失敗：' + data.error); return }
    // 若選的狀態不是預設的「待確認」，再補一次 PATCH 更新狀態
    if (f.status !== '待確認' && data.month && data.id) {
      await fetch(`${BASE.value}/admin/status/${data.month}/${data.id}?status=${encodeURIComponent(f.status)}`, {
        method: 'PATCH',
        credentials: 'include',
      })
    }
    closeCreateModal()
    await fetchData()
  } catch {
    alert('新增失敗')
  } finally {
    createModal.value.submitting = false
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

// ── 編輯訂單 ──────────────────────────────────────────────────────
const editModal = ref({ show: false, submitting: false, orderId: '', orderMonth: '' })
const editForm = ref({
  name: '', contact: '', pickupDay: 'tue',
  soymilkQty: 0, tofuQty: 0, soymilkVolume: 800, soymilkCustomVolume: 0,
  remark: '', status: '待確認',
})

const openEditModal = (order) => {
  const vol = order.soymilkVolume || 0
  const presetVols = [600, 800, 1000, 1700]
  editForm.value = {
    name:               order.name       || '',
    contact:            order.contact    || '',
    pickupDay:          order.pickupDay  || 'tue',
    soymilkQty:         order.soymilkQty || 0,
    tofuQty:            order.tofuQty    || 0,
    soymilkVolume:      presetVols.includes(vol) ? vol : (vol > 0 ? -1 : 800),
    soymilkCustomVolume: presetVols.includes(vol) ? 0 : vol,
    remark:             order.remark     || '',
    status:             order.status     || '待確認',
  }
  editModal.value = { show: true, submitting: false, orderId: order.id, orderMonth: order.month }
}

const closeEditModal = () => {
  editModal.value = { show: false, submitting: false, orderId: '', orderMonth: '' }
}

const adjEdit = (field, delta) => {
  editForm.value[field] = Math.max(0, editForm.value[field] + delta)
}

const submitEdit = async () => {
  const f = editForm.value
  if (!f.name.trim())    { alert('請輸入姓名'); return }
  if (!f.contact.trim()) { alert('請輸入聯絡方式'); return }
  if (f.soymilkQty === 0 && f.tofuQty === 0) { alert('請選擇豆漿或豆腐數量'); return }

  editModal.value.submitting = true
  try {
    const resolvedVolume = f.soymilkVolume === -1 ? (f.soymilkCustomVolume || 0) : (f.soymilkVolume || 0)
    const payload = {
      name:          f.name.trim(),
      contact:       f.contact.trim(),
      pickupDay:     f.pickupDay,
      soymilkQty:    f.soymilkQty,
      tofuQty:       f.tofuQty,
      soymilkVolume: resolvedVolume,
      remark:        f.remark.trim(),
      status:        f.status,
    }
    const res = await fetch(
      `${BASE.value}/admin/order/${editModal.value.orderMonth}/${editModal.value.orderId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      }
    )
    const data = await res.json()
    if (data.error) { alert('編輯失敗：' + data.error); return }
    // 直接更新本地資料，不需重新 fetch
    const target = orders.value.find(o => o.id === editModal.value.orderId)
    if (target) Object.assign(target, payload)
    closeEditModal()
  } catch {
    alert('編輯失敗')
  } finally {
    editModal.value.submitting = false
  }
}
</script>

<template>
  <div class="min-h-full bg-stone-50 dark:bg-zinc-900 transition-colors">

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
          <!-- 客戶訂單連結 -->
          <a href="https://holyfarm.netlify.app/front/order/soybeans?og=20" target="_blank"
             class="flex items-center gap-1 px-2.5 py-1.5 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-400 hover:bg-green-700 hover:text-white hover:border-green-700 transition-colors text-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            訂購連結
          </a>
          <!-- 新增訂單按鈕 -->
          <button @click="openCreateModal"
                  class="flex items-center gap-1 px-2.5 py-1.5 border border-emerald-600 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors text-xs font-semibold">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            新增訂單
          </button>
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

      <!-- 彙總卡片（compact 橫排） -->
      <div class="flex items-center gap-2 mb-3 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 shadow-sm flex-wrap">
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-stone-400">本月訂單</span>
          <span class="text-base font-extrabold text-stone-800 dark:text-stone-100">{{ orders.length }}</span>
          <span class="text-xs text-stone-400">筆</span>
        </div>
        <div class="w-px h-4 bg-stone-200 dark:bg-stone-600 mx-1"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-green-600">豆漿</span>
          <span class="text-base font-extrabold text-green-700">{{ totalSoymilk }}</span>
          <span class="text-xs text-green-500">袋</span>
        </div>
        <div class="w-px h-4 bg-stone-200 dark:bg-stone-600 mx-1"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-amber-600">豆腐</span>
          <span class="text-base font-extrabold text-amber-600">{{ totalTofu }}</span>
          <span class="text-xs text-amber-500">塊</span>
        </div>
        <div v-if="lastUpdated" class="ml-auto text-xs text-stone-300 whitespace-nowrap">更新 {{ lastUpdated }}</div>
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
      </div>

      <!-- 訂單列表（按日期分組） -->
      <div v-if="loading && orders.length === 0" class="text-center py-16 text-stone-400 text-sm">載入中…</div>
      <div v-else-if="filteredOrders.length === 0"
           class="text-center py-16 text-stone-400 text-sm border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl">
        本月尚無訂購紀錄
      </div>
      <template v-else>
        <div v-for="group in groupedOrders" :key="group.date" class="mb-4">
          <!-- 日期分隔標題 -->
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold text-stone-500 dark:text-stone-400 whitespace-nowrap">{{ group.dateLabel }}</span>
            <div class="flex-1 h-px bg-stone-200 dark:bg-stone-700"></div>
            <span class="text-xs text-stone-400 whitespace-nowrap">{{ group.orders.length }} 筆</span>
          </div>
          <!-- 該日訂單表格 -->
          <div class="bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm overflow-hidden">
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
                <tr v-for="o in group.orders" :key="o.id"
                    class="hover:bg-stone-50 dark:hover:bg-zinc-700/30 transition-colors"
                    :class="{ 'opacity-40': o.status === '已取消' }">
                  <td class="px-3 py-2.5 text-xs text-stone-400 whitespace-nowrap">{{ o.createdAt?.substring(11, 16) }}</td>
                  <td class="px-3 py-2.5 font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">{{ o.name }}</td>
                  <td class="px-3 py-2.5 text-xs text-stone-500 dark:text-stone-400">{{ o.contact }}</td>
                  <td class="px-3 py-2.5">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                          :class="o.pickupDay === 'tue' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'">
                      {{ pickupLabel(o) }}
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <span v-if="o.soymilkQty" class="font-semibold text-green-700 text-xs">
                      {{ o.soymilkQty }} 袋
                      <span v-if="o.soymilkVolume" class="text-stone-400 font-normal">{{ o.soymilkVolume }}ml</span>
                    </span>
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
                      <button :disabled="updatingId === o.id" @click="openEditModal(o)"
                              class="px-2 py-0.5 text-xs border border-blue-200 dark:border-blue-900 rounded-lg bg-white dark:bg-zinc-700 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                        編輯
                      </button>
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
      </template>

    </div>

    <!-- 新增訂單 Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="createModal.show"
             class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
             @click.self="closeCreateModal">
          <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-bold text-stone-800 dark:text-stone-100 text-base">新增訂單</h3>
              <button @click="closeCreateModal" class="text-stone-300 hover:text-stone-500 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <!-- 姓名 & 聯絡 -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-stone-500 mb-1">姓名 <span class="text-red-400">*</span></label>
                  <input v-model="createForm.name" type="text" placeholder="訂購人姓名"
                         class="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-stone-500 mb-1">聯絡方式 <span class="text-red-400">*</span></label>
                  <input v-model="createForm.contact" type="text" placeholder="電話或 Line"
                         class="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500"/>
                </div>
              </div>

              <!-- 取貨日 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1.5">取貨日</label>
                <div class="flex gap-2">
                  <button @click="createForm.pickupDay = 'tue'"
                          :class="createForm.pickupDay === 'tue' ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                          class="flex-1 py-2 text-sm border rounded-xl transition-colors font-medium">
                    週二
                  </button>
                  <button @click="createForm.pickupDay = 'fri'"
                          :class="createForm.pickupDay === 'fri' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                          class="flex-1 py-2 text-sm border rounded-xl transition-colors font-medium">
                    週五
                  </button>
                </div>
              </div>

              <!-- 豆漿容量 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1.5">豆漿容量（ml／袋）</label>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <button v-for="v in [600, 800, 1000, 1700]" :key="v"
                          @click="createForm.soymilkVolume = v"
                          :class="createForm.soymilkVolume === v
                            ? 'bg-green-700 text-white border-green-700'
                            : 'bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                          class="flex-1 py-1.5 text-xs border rounded-xl transition-colors font-medium">
                    {{ v }} ml
                  </button>
                  <button @click="createForm.soymilkVolume = -1"
                          :class="createForm.soymilkVolume === -1
                            ? 'bg-green-700 text-white border-green-700'
                            : 'bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                          class="flex-1 py-1.5 text-xs border rounded-xl transition-colors font-medium">
                    自訂
                  </button>
                </div>
                <input v-if="createForm.soymilkVolume === -1"
                       v-model.number="createForm.soymilkCustomVolume"
                       type="number" min="0" placeholder="輸入 ml 數量"
                       class="mt-2 w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500"/>
              </div>

              <!-- 豆漿 & 豆腐 -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-stone-500 mb-1.5">豆漿（袋）</label>
                  <div class="flex items-center gap-2">
                    <button @click="adjCreate('soymilkQty', -1)"
                            class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">−</button>
                    <span class="w-10 text-center font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ createForm.soymilkQty }}</span>
                    <button @click="adjCreate('soymilkQty', 1)"
                            class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">＋</button>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-stone-500 mb-1.5">豆腐（塊）</label>
                  <div class="flex items-center gap-2">
                    <button @click="adjCreate('tofuQty', -1)"
                            class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">−</button>
                    <span class="w-10 text-center font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ createForm.tofuQty }}</span>
                    <button @click="adjCreate('tofuQty', 1)"
                            class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">＋</button>
                  </div>
                </div>
              </div>

              <!-- 金額小計 -->
              <div v-if="createForm.soymilkQty > 0 || createForm.tofuQty > 0"
                   class="bg-stone-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 flex justify-between items-center text-sm">
                <span class="text-stone-400">小計</span>
                <span class="font-bold text-stone-800 dark:text-stone-100">${{ createForm.soymilkQty * 50 + createForm.tofuQty * 50 }}</span>
              </div>

              <!-- 備註 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1">備註</label>
                <input v-model="createForm.remark" type="text" placeholder="選填"
                       class="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500"/>
              </div>

              <!-- 訂單狀態 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1.5">訂單狀態</label>
                <div class="flex flex-wrap gap-2">
                  <button v-for="s in STATUSES" :key="s"
                          @click="createForm.status = s"
                          :class="createForm.status === s ? statusClass(s) + ' ring-2 ring-offset-1 ring-current' : 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-400 dark:bg-zinc-700 dark:text-stone-500'"
                          class="transition-all cursor-pointer">
                    {{ s }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex gap-2 mt-6">
              <button @click="closeCreateModal" :disabled="createModal.submitting"
                      class="flex-1 py-2.5 text-sm border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors">
                取消
              </button>
              <button @click="submitCreate" :disabled="createModal.submitting"
                      class="flex-1 py-2.5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 font-semibold">
                <span v-if="createModal.submitting" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {{ createModal.submitting ? '新增中…' : '確認新增' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 編輯訂單 Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="editModal.show"
             class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
             @click.self="closeEditModal">
          <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6 my-auto">
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-bold text-stone-800 dark:text-stone-100 text-base">編輯訂單</h3>
              <button @click="closeEditModal" class="text-stone-300 hover:text-stone-500 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <!-- 姓名 & 聯絡 -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-stone-500 mb-1">姓名 <span class="text-red-400">*</span></label>
                  <input v-model="editForm.name" type="text" placeholder="訂購人姓名"
                         class="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-stone-500 mb-1">聯絡方式 <span class="text-red-400">*</span></label>
                  <input v-model="editForm.contact" type="text" placeholder="電話或 Line"
                         class="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              <!-- 取貨日 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1.5">取貨日</label>
                <div class="flex gap-2">
                  <button @click="editForm.pickupDay = 'tue'"
                          :class="editForm.pickupDay === 'tue' ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                          class="flex-1 py-2 text-sm border rounded-xl transition-colors font-medium">
                    週二
                  </button>
                  <button @click="editForm.pickupDay = 'fri'"
                          :class="editForm.pickupDay === 'fri' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                          class="flex-1 py-2 text-sm border rounded-xl transition-colors font-medium">
                    週五
                  </button>
                </div>
              </div>

              <!-- 豆漿容量 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1.5">豆漿容量（ml／袋）</label>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <button v-for="v in [600, 800, 1000, 1700]" :key="v"
                          @click="editForm.soymilkVolume = v"
                          :class="editForm.soymilkVolume === v
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                          class="flex-1 py-1.5 text-xs border rounded-xl transition-colors font-medium">
                    {{ v }} ml
                  </button>
                  <button @click="editForm.soymilkVolume = -1"
                          :class="editForm.soymilkVolume === -1
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                          class="flex-1 py-1.5 text-xs border rounded-xl transition-colors font-medium">
                    自訂
                  </button>
                </div>
                <input v-if="editForm.soymilkVolume === -1"
                       v-model.number="editForm.soymilkCustomVolume"
                       type="number" min="0" placeholder="輸入 ml 數量"
                       class="mt-2 w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              <!-- 豆漿 & 豆腐 -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-stone-500 mb-1.5">豆漿（袋）</label>
                  <div class="flex items-center gap-2">
                    <button @click="adjEdit('soymilkQty', -1)"
                            class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">−</button>
                    <span class="w-10 text-center font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ editForm.soymilkQty }}</span>
                    <button @click="adjEdit('soymilkQty', 1)"
                            class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">＋</button>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-stone-500 mb-1.5">豆腐（塊）</label>
                  <div class="flex items-center gap-2">
                    <button @click="adjEdit('tofuQty', -1)"
                            class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">−</button>
                    <span class="w-10 text-center font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ editForm.tofuQty }}</span>
                    <button @click="adjEdit('tofuQty', 1)"
                            class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">＋</button>
                  </div>
                </div>
              </div>

              <!-- 金額小計 -->
              <div v-if="editForm.soymilkQty > 0 || editForm.tofuQty > 0"
                   class="bg-stone-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 flex justify-between items-center text-sm">
                <span class="text-stone-400">小計</span>
                <span class="font-bold text-stone-800 dark:text-stone-100">${{ editForm.soymilkQty * 50 + editForm.tofuQty * 50 }}</span>
              </div>

              <!-- 備註 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1">備註</label>
                <input v-model="editForm.remark" type="text" placeholder="選填"
                       class="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              <!-- 訂單狀態 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1.5">訂單狀態</label>
                <div class="flex flex-wrap gap-2">
                  <button v-for="s in STATUSES" :key="s"
                          @click="editForm.status = s"
                          :class="editForm.status === s ? statusClass(s) + ' ring-2 ring-offset-1 ring-current' : 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-400 dark:bg-zinc-700 dark:text-stone-500'"
                          class="transition-all cursor-pointer">
                    {{ s }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex gap-2 mt-6">
              <button @click="closeEditModal" :disabled="editModal.submitting"
                      class="flex-1 py-2.5 text-sm border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors">
                取消
              </button>
              <button @click="submitEdit" :disabled="editModal.submitting"
                      class="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 font-semibold">
                <span v-if="editModal.submitting" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {{ editModal.submitting ? '儲存中…' : '確認儲存' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
              <strong class="text-stone-700">{{ deleteModal.order.name }}</strong>　{{ pickupLabel(deleteModal.order) }} 取貨<br>
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
