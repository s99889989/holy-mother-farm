<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useCommonStore } from '~/stores/common.js'

definePageMeta({ layout: 'staff', requiredPermission: 'order.handmade-bread-orders' })

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/handmade-bread')

const DOW_CODE = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun' }
const DOW_LABEL = { 1: '週一', 2: '週二', 3: '週三', 4: '週四', 5: '週五', 6: '週六', 7: '週日' }
const DOW_COLORS = [
  { bg: 'bg-amber-100 text-amber-700', active: 'bg-amber-700 text-white border-amber-700' },
  { bg: 'bg-blue-100 text-blue-700', active: 'bg-blue-600 text-white border-blue-600' },
  { bg: 'bg-green-100 text-green-700', active: 'bg-green-700 text-white border-green-700' },
  { bg: 'bg-purple-100 text-purple-700', active: 'bg-purple-600 text-white border-purple-600' }
]
const STATUSES = ['待確認', '已確認', '已付款', '已取貨', '已取消']

function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dowToCode(dow) {
  return DOW_CODE[dow] || 'mon'
}

function codeToDow(code) {
  const found = Object.entries(DOW_CODE).find(([, c]) => c === code)
  return found ? Number(found[0]) : 1
}

// ── 出爐日排程 ────────────────────────────────────────────────────
const businessDays = ref([1, 5])
const businessDaysDraft = ref([1, 5])
const businessDaysEffectiveFrom = ref('')
const businessDaysSaving = ref(false)
const businessDaysSaved = ref(false)
const businessDaysSchedule = ref([])
const businessPanelOpen = ref(false)

const businessDayOptions = computed(() =>
  businessDays.value.map((dow, idx) => ({
    dow, code: dowToCode(dow), label: DOW_LABEL[dow] || '',
    color: DOW_COLORS[idx % DOW_COLORS.length]
  }))
)

function toggleDraftDow(dow) {
  businessDaysDraft.value = businessDaysDraft.value.includes(dow)
    ? businessDaysDraft.value.filter(d => d !== dow)
    : [...businessDaysDraft.value, dow].sort((a, b) => a - b)
}

const fetchBusinessDaysSchedule = async () => {
  try {
    const res = await fetch(`${BASE.value}/settings/business-days-schedule`, { credentials: 'include' })
    const data = await res.json()
    businessDaysSchedule.value = Array.isArray(data.schedule) ? data.schedule : []
    if (Array.isArray(data.currentBusinessDays) && data.currentBusinessDays.length > 0) {
      businessDays.value = data.currentBusinessDays
      businessDaysDraft.value = [...data.currentBusinessDays]
    }
  } catch {
  }
}
const saveBusinessDays = async (days, effectiveFrom = '') => {
  if (!days.length) {
    alert('請至少選擇一個出爐日')
    return
  }
  businessDaysSaving.value = true
  businessDaysSaved.value = false
  try {
    const payload = { businessDays: days }
    if (effectiveFrom) payload.effectiveFrom = effectiveFrom
    const res = await fetch(`${BASE.value}/admin/settings/business-days`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.error) {
      alert('儲存失敗：' + data.error)
      return
    }
    if (Array.isArray(data.currentBusinessDays)) businessDays.value = data.currentBusinessDays
    businessDaysSaved.value = true
    setTimeout(() => businessDaysSaved.value = false, 2000)
    fetchBusinessDaysSchedule()
  } catch {
    alert('儲存失敗')
  } finally {
    businessDaysSaving.value = false
  }
}
const removeBusinessDaysScheduleEntry = async (effectiveFrom) => {
  if (!confirm(`確定要刪除 ${effectiveFrom} 起生效的出爐日排程？`)) return
  try {
    const res = await fetch(`${BASE.value}/admin/settings/business-days-schedule?effectiveFrom=${encodeURIComponent(effectiveFrom)}`, {
      method: 'DELETE', credentials: 'include'
    })
    const data = await res.json()
    if (data.error) {
      alert('刪除失敗：' + data.error)
      return
    }
    businessDaysSchedule.value = Array.isArray(data.schedule) ? data.schedule : []
    if (Array.isArray(data.currentBusinessDays)) businessDays.value = data.currentBusinessDays
  } catch {
    alert('刪除失敗')
  }
}

// ── 休息日 ──────────────────────────────────────────────────────
const closedDates = ref([])
const newClosedDate = ref('')
const fetchClosedDates = async () => {
  try {
    const res = await fetch(`${BASE.value}/admin/settings/closed-dates`, { credentials: 'include' })
    const data = await res.json()
    closedDates.value = Array.isArray(data.closedDates) ? data.closedDates : []
  } catch {
  }
}
const addClosedDate = async () => {
  if (!newClosedDate.value) return
  try {
    const res = await fetch(`${BASE.value}/admin/settings/closed-dates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ date: newClosedDate.value })
    })
    const data = await res.json()
    if (data.error) {
      alert('新增失敗：' + data.error)
      return
    }
    closedDates.value = data.closedDates
    newClosedDate.value = ''
  } catch {
    alert('新增失敗')
  }
}
const removeClosedDate = async (date) => {
  try {
    const res = await fetch(`${BASE.value}/admin/settings/closed-dates`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ date })
    })
    const data = await res.json()
    if (data.error) {
      alert('刪除失敗：' + data.error)
      return
    }
    closedDates.value = data.closedDates
  } catch {
    alert('刪除失敗')
  }
}

// ── 品項設定 ────────────────────────────────────────────────────
const items = ref([]) // 目前生效中的品項（用於數量欄位、金額計算）
const itemsDraft = ref([]) // 設定面板編輯中的草稿
const itemsPanelOpen = ref(false)
const itemsSaving = ref(false)
const itemsSaved = ref(false)

const fetchItems = async () => {
  try {
    const res = await fetch(`${BASE.value}/admin/settings/items`, { credentials: 'include' })
    const data = await res.json()
    items.value = Array.isArray(data.items) ? data.items : []
    itemsDraft.value = items.value.map(i => ({ ...i }))
  } catch {
  }
}

function addItemRow() {
  itemsDraft.value.push({ code: '', name: '', price: 0, unit: '個', active: true })
}

function removeItemRow(idx) {
  itemsDraft.value.splice(idx, 1)
}

async function saveItems() {
  itemsSaving.value = true
  itemsSaved.value = false
  try {
    const res = await fetch(`${BASE.value}/admin/settings/items`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ items: itemsDraft.value })
    })
    const data = await res.json()
    if (data.error) {
      alert('儲存失敗：' + data.error)
      return
    }
    items.value = data.items
    itemsDraft.value = data.items.map(i => ({ ...i }))
    itemsSaved.value = true
    setTimeout(() => itemsSaved.value = false, 2000)
  } catch {
    alert('儲存失敗')
  } finally {
    itemsSaving.value = false
  }
}

function itemByCode(code) {
  return items.value.find(i => i.code === code)
}

// ── 月份選擇 ──────────────────────────────────────────────────────
function thisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(thisMonth())
const monthOptions = computed(() => {
  const opts = []
  const now = new Date()
  for (let i = -3; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push({
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
    })
  }
  return opts
})

// ── 資料 ──────────────────────────────────────────────────────────
const loading = ref(false)
const orders = ref([])
const totalAmount = ref(0)
const qtyByCode = ref({})
const lastUpdated = ref('')

const fetchData = async (isInitialLoad = false) => {
  loading.value = true
  try {
    const res = await fetch(`${BASE.value}/admin/list?month=${selectedMonth.value}`, { credentials: 'include' })
    const data = await res.json()
    orders.value = data.orders ?? []
    totalAmount.value = data.totalAmount ?? 0
    qtyByCode.value = data.qtyByCode ?? {}
    const now = new Date()
    lastUpdated.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    if (isInitialLoad) scrollToToday()
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

function scrollToToday() {
  nextTick(() => {
    const el = document.getElementById(`pickup-group-${todayDateStr()}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

let autoRefreshTimer = null
onMounted(() => {
  fetchData(true)
  fetchClosedDates()
  fetchBusinessDaysSchedule()
  fetchItems()
  autoRefreshTimer = setInterval(() => fetchData(false), 30000)
})
onUnmounted(() => clearInterval(autoRefreshTimer))

// ── 篩選 ──────────────────────────────────────────────────────────
const filterDay = ref('')
const filterStatus = ref('')

const filteredOrders = computed(() => {
  return orders.value.filter((o) => {
    if (filterDay.value && o.pickupDay !== filterDay.value) return false
    if (filterStatus.value && o.status !== filterStatus.value) return false
    return true
  })
})

function itemsLabel(order) {
  if (!Array.isArray(order.items) || order.items.length === 0) return ''
  return order.items.map(i => `${i.name}×${i.qty}`).join('、')
}

function isToday(dateStr) {
  return dateStr === todayDateStr()
}

const groupedOrders = computed(() => {
  const map = new Map()
  for (const o of filteredOrders.value) {
    const key = o.pickupDate || '9999-99-99'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(o)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => {
      const weekDay = date.match(/^\d{4}-\d{2}-\d{2}$/)
        ? ['日', '一', '二', '三', '四', '五', '六'][new Date(date + 'T00:00:00').getDay()]
        : '？'
      const [, m, d] = date.split('-')
      const active = list.filter(o => o.status !== '已取消')
      const amount = active.reduce((s, o) => s + (o.totalAmount || 0), 0)
      const qtyMap = {}
      for (const o of active) {
        for (const item of (o.items || [])) qtyMap[item.code] = (qtyMap[item.code] || 0) + item.qty
      }
      const breakdown = Object.entries(qtyMap)
        .map(([code, qty]) => `${code}×${qty}`)
        .join('、')
      return { date, dateLabel: `${m}/${d}（週${weekDay}）出爐`, orders: list, amount, breakdown }
    })
})

const updatingId = ref('')
const updateStatus = async (order, newStatus) => {
  updatingId.value = order.id
  try {
    await fetch(`${BASE.value}/admin/status/${order.month}/${order.id}?status=${encodeURIComponent(newStatus)}`, {
      method: 'PATCH', credentials: 'include'
    })
    order.status = newStatus
  } catch {
    alert('更新失敗')
  } finally {
    updatingId.value = ''
  }
}

const statusClass = s => ({
  待確認: 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700',
  已確認: 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700',
  已付款: 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700',
  已取貨: 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700',
  已取消: 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-500'
}[s] || 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface2 text-hint-c')

function pickupLabel(order) {
  const dow = codeToDow(order?.pickupDay)
  const label = DOW_LABEL[dow] || ''
  if (order?.pickupDate && /^\d{4}-\d{2}-\d{2}$/.test(order.pickupDate)) {
    const d = new Date(order.pickupDate + 'T00:00:00')
    return `${label} ${d.getMonth() + 1}/${d.getDate()}`
  }
  return label
}

function formatCreatedAt(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt.replace(' ', 'T'))
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd}（週${weekDay}）${hh}:${min}`
}

// ── 編輯 Modal ──────────────────────────────────────────────────
const editModal = reactive({ show: false, order: null, submitting: false })
const editForm = reactive({ name: '', contact: '', remark: '', status: '待確認', itemQty: {} })

function openEditModal(order) {
  editModal.order = order
  editForm.name = order.name
  editForm.contact = order.contact
  editForm.remark = order.remark || ''
  editForm.status = order.status
  const q = {}
  for (const it of items.value) q[it.code] = 0
  for (const it of (order.items || [])) q[it.code] = it.qty
  editForm.itemQty = q
  editModal.show = true
}

function closeEditModal() {
  editModal.show = false
  editModal.order = null
}

function adjEditQty(code, delta) {
  editForm.itemQty[code] = Math.max(0, (editForm.itemQty[code] || 0) + delta)
}

const editFormTotal = computed(() => {
  let total = 0
  for (const it of items.value) {
    const qty = editForm.itemQty[it.code] || 0
    total += qty * it.price
  }
  return total
})

async function submitEdit() {
  if (!editModal.order) return
  editModal.submitting = true
  try {
    const itemsPayload = items.value
      .map(it => ({ code: it.code, qty: editForm.itemQty[it.code] || 0 }))
      .filter(i => i.qty > 0)
    if (itemsPayload.length === 0) {
      alert('請至少選擇一款麵包')
      return
    }
    const res = await fetch(`${BASE.value}/admin/order/${editModal.order.month}/${editModal.order.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: editForm.name, contact: editForm.contact, remark: editForm.remark,
        status: editForm.status, items: itemsPayload
      })
    })
    const data = await res.json()
    if (data.error) {
      alert('儲存失敗：' + data.error)
      return
    }
    closeEditModal()
    fetchData(false)
  } catch {
    alert('儲存失敗')
  } finally {
    editModal.submitting = false
  }
}

// ── 刪除 Modal ──────────────────────────────────────────────────
const deleteModal = reactive({ show: false, order: null, submitting: false })

function openDeleteModal(order) {
  deleteModal.order = order
  deleteModal.show = true
}

function closeDeleteModal() {
  deleteModal.show = false
  deleteModal.order = null
}

async function confirmDelete() {
  if (!deleteModal.order) return
  deleteModal.submitting = true
  try {
    const res = await fetch(`${BASE.value}/admin/order/${deleteModal.order.month}/${deleteModal.order.id}`, {
      method: 'DELETE', credentials: 'include'
    })
    const data = await res.json()
    if (data.error) {
      alert('刪除失敗：' + data.error)
      return
    }
    closeDeleteModal()
    fetchData(false)
  } catch {
    alert('刪除失敗')
  } finally {
    deleteModal.submitting = false
  }
}

watch(selectedMonth, () => fetchData(false))
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 pb-24">
    <!-- 標題列 -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-lg font-bold text-base-c">
        🍞 麵包預購管理
      </h1>
      <span
        v-if="lastUpdated"
        class="text-xs text-hint-c"
      >更新於 {{ lastUpdated }}</span>
    </div>

    <!-- 出爐日排程面板 -->
    <div class="bg-surface border border-light-c rounded-2xl mb-3">
      <button
        class="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-base-c"
        @click="businessPanelOpen = !businessPanelOpen"
      >
        <span>出爐日設定（目前：{{ businessDayOptions.map(o => o.label).join('、') }}）</span>
        <span>{{ businessPanelOpen ? '收合 ▲' : '展開 ▼' }}</span>
      </button>
      <div
        v-if="businessPanelOpen"
        class="px-4 pb-4 space-y-3"
      >
        <div class="flex flex-wrap gap-2">
          <button
            v-for="dow in [1, 2, 3, 4, 5, 6, 7]"
            :key="dow"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            :class="businessDaysDraft.includes(dow) ? 'bg-amber-700 text-white border-amber-700' : 'bg-surface2 text-hint-c border-light-c'"
            @click="toggleDraftDow(dow)"
          >
            {{ DOW_LABEL[dow] }}
          </button>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-xs text-hint-c">生效日（留空＝立即生效）</label>
          <input
            v-model="businessDaysEffectiveFrom"
            type="date"
            class="px-2 py-1 text-xs border border-light-c rounded-lg bg-surface2 text-base-c"
          >
          <button
            :disabled="businessDaysSaving"
            class="px-3 py-1.5 text-xs font-semibold bg-amber-700 text-white rounded-lg disabled:opacity-50"
            @click="saveBusinessDays(businessDaysDraft, businessDaysEffectiveFrom)"
          >
            {{ businessDaysSaving ? '儲存中…' : (businessDaysSaved ? '已儲存 ✓' : '儲存') }}
          </button>
        </div>
        <div
          v-if="businessDaysSchedule.length"
          class="space-y-1"
        >
          <p class="text-xs text-hint-c">
            已排定的排程：
          </p>
          <div
            v-for="entry in businessDaysSchedule"
            :key="entry.effectiveFrom"
            class="flex items-center justify-between text-xs bg-surface2 rounded-lg px-3 py-1.5"
          >
            <span>{{ entry.effectiveFrom }} 起：{{ entry.businessDays.map(d => DOW_LABEL[d]).join('、') }}</span>
            <button
              class="text-red-500"
              @click="removeBusinessDaysScheduleEntry(entry.effectiveFrom)"
            >
              刪除
            </button>
          </div>
        </div>

        <div class="border-t border-light-c pt-3">
          <p class="text-xs text-hint-c mb-1.5">
            休息日
          </p>
          <div class="flex items-center gap-2 mb-2">
            <input
              v-model="newClosedDate"
              type="date"
              class="px-2 py-1 text-xs border border-light-c rounded-lg bg-surface2 text-base-c"
            >
            <button
              class="px-3 py-1.5 text-xs font-semibold bg-surface2 text-base-c border border-light-c rounded-lg"
              @click="addClosedDate"
            >
              新增休息日
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="d in closedDates"
              :key="d"
              class="flex items-center gap-1 text-xs bg-red-50 text-red-600 rounded-full px-2.5 py-1"
            >
              {{ d }}
              <button @click="removeClosedDate(d)">✕</button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 品項設定面板 -->
    <div class="bg-surface border border-light-c rounded-2xl mb-3">
      <button
        class="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-base-c"
        @click="itemsPanelOpen = !itemsPanelOpen"
      >
        <span>麵包品項設定（共 {{ items.length }} 款）</span>
        <span>{{ itemsPanelOpen ? '收合 ▲' : '展開 ▼' }}</span>
      </button>
      <div
        v-if="itemsPanelOpen"
        class="px-4 pb-4 space-y-2"
      >
        <div
          v-for="(item, idx) in itemsDraft"
          :key="idx"
          class="flex items-center gap-2 flex-wrap bg-surface2 rounded-lg px-3 py-2"
        >
          <input
            v-model="item.code"
            placeholder="代碼"
            class="w-14 px-2 py-1 text-xs border border-light-c rounded bg-surface text-base-c"
          >
          <input
            v-model="item.name"
            placeholder="名稱"
            class="flex-1 min-w-[100px] px-2 py-1 text-xs border border-light-c rounded bg-surface text-base-c"
          >
          <input
            v-model.number="item.price"
            type="number"
            placeholder="單價"
            class="w-16 px-2 py-1 text-xs border border-light-c rounded bg-surface text-base-c"
          >
          <input
            v-model="item.unit"
            placeholder="單位"
            class="w-16 px-2 py-1 text-xs border border-light-c rounded bg-surface text-base-c"
          >
          <label class="flex items-center gap-1 text-xs text-hint-c">
            <input
              v-model="item.active"
              type="checkbox"
            > 上架
          </label>
          <button
            class="text-red-500 text-xs ml-auto"
            @click="removeItemRow(idx)"
          >
            刪除
          </button>
        </div>
        <div class="flex items-center gap-2 pt-1">
          <button
            class="px-3 py-1.5 text-xs font-semibold bg-surface2 text-base-c border border-light-c rounded-lg"
            @click="addItemRow"
          >
            ＋ 新增品項
          </button>
          <button
            :disabled="itemsSaving"
            class="px-3 py-1.5 text-xs font-semibold bg-amber-700 text-white rounded-lg disabled:opacity-50"
            @click="saveItems"
          >
            {{ itemsSaving ? '儲存中…' : (itemsSaved ? '已儲存 ✓' : '儲存品項設定') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 月份與篩選 -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <select
        v-model="selectedMonth"
        class="px-3 py-1.5 text-sm border border-light-c rounded-lg bg-surface text-base-c"
      >
        <option
          v-for="opt in monthOptions"
          :key="opt.val"
          :value="opt.val"
        >
          {{ opt.label }}
        </option>
      </select>
      <select
        v-model="filterDay"
        class="px-3 py-1.5 text-sm border border-light-c rounded-lg bg-surface text-base-c"
      >
        <option value="">
          全部星期
        </option>
        <option
          v-for="dow in businessDayOptions"
          :key="dow.dow"
          :value="dow.code"
        >
          {{ dow.label }}
        </option>
      </select>
      <select
        v-model="filterStatus"
        class="px-3 py-1.5 text-sm border border-light-c rounded-lg bg-surface text-base-c"
      >
        <option value="">
          全部狀態
        </option>
        <option
          v-for="s in STATUSES"
          :key="s"
          :value="s"
        >
          {{ s }}
        </option>
      </select>
      <!-- 客戶訂購連結 -->
      <a
        href="https://holyfarm.netlify.app/front/order/handmade-bread?og=20"
        target="_blank"
        class="flex items-center gap-1 px-2 py-1.5 border border-light-c rounded-lg bg-surface text-hint-c hover:bg-amber-700 hover:text-white hover:border-amber-700 transition-colors text-xs"
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
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <span class="hidden sm:inline">訂購連結</span>
      </a>
      <button
        class="px-3 py-1.5 text-sm bg-surface2 text-base-c border border-light-c rounded-lg"
        @click="fetchData(false)"
      >
        🔄 重新整理
      </button>
    </div>

    <!-- 總覽 -->
    <div class="bg-surface border border-light-c rounded-2xl p-4 mb-4 flex items-center justify-between">
      <div>
        <p class="text-xs text-hint-c">
          本月總金額（不含已取消）
        </p>
        <p class="text-xl font-bold text-base-c">
          ${{ totalAmount }}
        </p>
      </div>
      <div class="text-right text-xs text-hint-c leading-relaxed">
        <div
          v-for="(qty, code) in qtyByCode"
          :key="code"
        >
          {{ code }}．{{ itemByCode(code)?.name || code }} × {{ qty }}
        </div>
      </div>
    </div>

    <div
      v-if="loading && orders.length === 0"
      class="text-center text-hint-c py-10"
    >
      載入中…
    </div>
    <div
      v-else-if="groupedOrders.length === 0"
      class="text-center text-hint-c py-10"
    >
      這個月沒有訂單
    </div>

    <!-- 依取貨日分組列表 -->
    <div
      v-for="group in groupedOrders"
      :id="`pickup-group-${group.date}`"
      :key="group.date"
      class="mb-5"
    >
      <div class="flex items-center justify-between mb-2 px-1">
        <h2
          class="text-sm font-bold"
          :class="isToday(group.date) ? 'text-amber-700' : 'text-base-c'"
        >
          {{ group.dateLabel }}<span
            v-if="isToday(group.date)"
            class="ml-1 text-xs"
          >（今天）</span>
        </h2>
        <span class="text-xs text-hint-c">{{ group.breakdown }}　共 ${{ group.amount }}</span>
      </div>

      <div class="space-y-2">
        <div
          v-for="order in group.orders"
          :key="order.id"
          class="bg-surface border border-light-c rounded-xl p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-base-c text-sm">{{ order.name }}</span>
                <span :class="statusClass(order.status)">{{ order.status }}</span>
              </div>
              <p class="text-xs text-hint-c mt-0.5">
                {{ order.contact }}　{{ pickupLabel(order) }}取貨
              </p>
              <p class="text-sm text-muted-c mt-1">
                {{ itemsLabel(order) }}
              </p>
              <p
                v-if="order.remark"
                class="text-xs text-hint-c mt-1"
              >
                備註：{{ order.remark }}
              </p>
              <p class="text-xs text-hint-c mt-1">
                訂購於 {{ formatCreatedAt(order.createdAt) }}
              </p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="font-bold text-base-c">
                ${{ order.totalAmount }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between mt-2 pt-2 border-t border-light-c">
            <div class="flex flex-wrap gap-1">
              <button
                v-for="s in STATUSES"
                :key="s"
                :disabled="updatingId === order.id"
                :class="order.status === s ? statusClass(s) + ' ring-2 ring-offset-1 ring-current' : 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface2 text-hint-c'"
                class="transition-all cursor-pointer disabled:opacity-50"
                @click="updateStatus(order, s)"
              >
                {{ s }}
              </button>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <button
                class="text-xs text-blue-600"
                @click="openEditModal(order)"
              >
                編輯
              </button>
              <button
                class="text-xs text-red-500"
                @click="openDeleteModal(order)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 編輯 Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="editModal.show"
          class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          @click.self="closeEditModal"
        >
          <div class="bg-surface rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto">
            <h3 class="font-bold text-base-c mb-4">
              編輯訂單
            </h3>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-hint-c mb-1">姓名</label>
                <input
                  v-model="editForm.name"
                  type="text"
                  class="w-full px-3 py-2 text-sm border border-light-c rounded-xl bg-surface2 text-base-c outline-none"
                >
              </div>
              <div>
                <label class="block text-xs font-medium text-hint-c mb-1">聯絡方式</label>
                <input
                  v-model="editForm.contact"
                  type="text"
                  class="w-full px-3 py-2 text-sm border border-light-c rounded-xl bg-surface2 text-base-c outline-none"
                >
              </div>

              <div>
                <label class="block text-xs font-medium text-hint-c mb-1.5">品項數量</label>
                <div class="space-y-1.5">
                  <div
                    v-for="it in items"
                    :key="it.code"
                    class="flex items-center gap-2 bg-surface2 rounded-lg px-3 py-1.5"
                  >
                    <span class="flex-1 text-sm text-base-c">{{ it.code }}．{{ it.name }}
                      <span class="text-xs text-hint-c">${{ it.price }}／{{ it.unit }}</span>
                    </span>
                    <button
                      class="w-7 h-7 border border-light-c rounded-lg bg-surface text-hint-c flex items-center justify-center"
                      @click="adjEditQty(it.code, -1)"
                    >
                      −
                    </button>
                    <span class="w-8 text-center text-sm font-semibold text-base-c">{{
                      editForm.itemQty[it.code] || 0
                    }}</span>
                    <button
                      class="w-7 h-7 border border-light-c rounded-lg bg-surface text-hint-c flex items-center justify-center"
                      @click="adjEditQty(it.code, 1)"
                    >
                      ＋
                    </button>
                  </div>
                </div>
              </div>

              <div
                v-if="editFormTotal > 0"
                class="bg-surface2 rounded-xl px-4 py-2.5 flex justify-between items-center text-sm"
              >
                <span class="text-hint-c">小計</span>
                <span class="font-bold text-base-c">${{ editFormTotal }}</span>
              </div>

              <div>
                <label class="block text-xs font-medium text-hint-c mb-1">備註</label>
                <input
                  v-model="editForm.remark"
                  type="text"
                  class="w-full px-3 py-2 text-sm border border-light-c rounded-xl bg-surface2 text-base-c outline-none"
                >
              </div>

              <div>
                <label class="block text-xs font-medium text-hint-c mb-1.5">訂單狀態</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="s in STATUSES"
                    :key="s"
                    :class="editForm.status === s ? statusClass(s) + ' ring-2 ring-offset-1 ring-current' : 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface2 text-hint-c'"
                    class="transition-all cursor-pointer"
                    @click="editForm.status = s"
                  >
                    {{ s }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex gap-2 mt-6">
              <button
                :disabled="editModal.submitting"
                class="flex-1 py-2.5 text-sm border border-light-c text-muted-c rounded-xl disabled:opacity-50"
                @click="closeEditModal"
              >
                取消
              </button>
              <button
                :disabled="editModal.submitting"
                class="flex-1 py-2.5 text-sm bg-amber-700 text-white rounded-xl disabled:opacity-50 font-semibold"
                @click="submitEdit"
              >
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
        <div
          v-if="deleteModal.show"
          class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          @click.self="closeDeleteModal"
        >
          <div class="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <h3 class="font-bold text-base-c mb-2">
              確認刪除訂單？
            </h3>
            <p
              v-if="deleteModal.order"
              class="text-sm text-hint-c leading-relaxed mb-5"
            >
              <strong class="text-muted-c">{{ deleteModal.order.name }}</strong>　{{ pickupLabel(deleteModal.order) }} 取貨<br>
              {{ itemsLabel(deleteModal.order) }}
              <br><span class="text-red-400 text-xs">刪除後無法復原</span>
            </p>
            <div class="flex gap-2">
              <button
                :disabled="deleteModal.submitting"
                class="flex-1 py-2 text-sm border border-light-c text-muted-c rounded-xl disabled:opacity-50"
                @click="closeDeleteModal"
              >
                取消
              </button>
              <button
                :disabled="deleteModal.submitting"
                class="flex-1 py-2 text-sm bg-red-500 text-white rounded-xl disabled:opacity-50"
                @click="confirmDelete"
              >
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
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
