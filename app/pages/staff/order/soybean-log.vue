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
  fetchClosedDates()
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
  filteredOrders.value.reduce((s, o) => {
    if (Array.isArray(o.soymilkItems)) return s + o.soymilkItems.reduce((a, i) => a + (i.qty || 0), 0)
    return s + (o.soymilkQty || 0)
  }, 0))
const filteredTofu = computed(() =>
  filteredOrders.value.reduce((s, o) => s + (o.tofuQty || 0), 0))

// ── 從現在起算下一個取貨日 ───────────────────────────────────────
function nextPickupDateFromNow(pickupDay) {
  const targetDow = pickupDay === 'tue' ? 2 : 5
  const now = new Date()
  // 用本地時間避免 UTC 時差問題
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = (targetDow - base.getDay() + 7) % 7
  const result = new Date(base)
  result.setDate(base.getDate() + diff)
  return `${result.getFullYear()}-${String(result.getMonth()+1).padStart(2,'0')}-${String(result.getDate()).padStart(2,'0')}`
}

// 格式化取貨日顯示：2026-06-19 → 週五 6/19
function pickupDateLabel(pickupDay) {
  const date = nextPickupDateFromNow(pickupDay)
  const d = new Date(date + 'T00:00:00')
  const weekDay = ['日','一','二','三','四','五','六'][d.getDay()]
  return `週${weekDay} ${d.getMonth()+1}/${d.getDate()}`
}
const PRESET_VOLS = [600, 800, 1000, 1700]

// 把訂單的 soymilkItems 正規化（相容舊資料）
function normalizeSoymilkItems(order) {
  if (Array.isArray(order.soymilkItems) && order.soymilkItems.length > 0) {
    return order.soymilkItems
  }
  // 相容舊版單一容量格式
  if (order.soymilkQty > 0) {
    return [{ volume: order.soymilkVolume || 800, qty: order.soymilkQty }]
  }
  return []
}

// 計算總豆漿袋數
function totalSoymilkQty(items) {
  return items.reduce((s, i) => s + (i.qty || 0), 0)
}

// 顯示用文字，例如「800ml×2, 1000ml×1」
function soymilkItemsLabel(order) {
  const items = normalizeSoymilkItems(order)
  if (!items.length) return null
  return items.map(i => `${i.volume}ml×${i.qty}`).join('、')
}

// 計算金額（豆漿 $50/袋）
function calcTotal(order) {
  const sm = Array.isArray(order.soymilkItems)
    ? order.soymilkItems.reduce((s, i) => s + (i.qty || 0), 0)
    : (order.soymilkQty || 0)
  return sm * 50 + (order.tofuQty || 0) * 50
}

// 新建一個空豆漿項目
function newSoymilkItem() {
  return { volume: 800, customVolume: 0, qty: 1 }
}
const groupedOrders = computed(() => {
  const withPickup = filteredOrders.value.map(o => ({
    ...o,
    _pickupDate: resolvePickupDate(o.pickupDay, o.createdAt)
  }))

  const map = new Map()
  for (const o of withPickup) {
    if (!map.has(o._pickupDate)) map.set(o._pickupDate, [])
    map.get(o._pickupDate).push(o)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, orders]) => {
      const weekDay = ['日','一','二','三','四','五','六'][new Date(date + 'T00:00:00').getDay()]
      const [, m, d] = date.split('-')
      return { date, dateLabel: `${m}/${d}（週${weekDay}）取貨`, orders }
    })
})

// 從訂單建立時間往後找最近的週二(tue)或週五(fri)
function resolvePickupDate(pickupDay, createdAt) {
  if (!createdAt) return '9999-99-99'
  const targetDow = pickupDay === 'tue' ? 2 : 5
  const base = new Date(createdAt.replace(' ', 'T'))
  const diff = (targetDow - base.getDay() + 7) % 7
  const result = new Date(base)
  result.setDate(base.getDate() + diff)
  return `${result.getFullYear()}-${String(result.getMonth()+1).padStart(2,'0')}-${String(result.getDate()).padStart(2,'0')}`
}

// ── 格式化訂購時間 ────────────────────────────────────────────────
function formatCreatedAt(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt.replace(' ', 'T'))
  const weekDay = ['日','一','二','三','四','五','六'][d.getDay()]
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd}（週${weekDay}）${hh}:${min}`
}
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
  soymilkItems: [newSoymilkItem()], tofuQty: 0, remark: '', status: '已確認',
})

const openCreateModal = () => {
  createForm.value = { name: '', contact: '', pickupDay: 'tue', soymilkItems: [newSoymilkItem()], tofuQty: 0, remark: '', status: '已確認' }
  createModal.value = { show: true, submitting: false }
}
const closeCreateModal = () => {
  createModal.value = { show: false, submitting: false }
}

const addSoymilkItem = (form) => {
  form.soymilkItems.push(newSoymilkItem())
}
const removeSoymilkItem = (form, idx) => {
  form.soymilkItems.splice(idx, 1)
}
const adjItemQty = (item, delta) => {
  item.qty = Math.max(1, (item.qty || 1) + delta)
}
const adjTofuQty = (form, delta) => {
  form.tofuQty = Math.max(0, (form.tofuQty || 0) + delta)
}

// 計算 form 的小計
function formTotal(form) {
  const sm = form.soymilkItems.reduce((s, i) => s + (i.qty || 0), 0)
  return sm * 50 + (form.tofuQty || 0) * 50
}
// 解析容量（-1 表示自訂）
function resolveVol(item) {
  return item.volume === -1 ? (item.customVolume || 0) : (item.volume || 800)
}

const submitCreate = async () => {
  const f = createForm.value
  if (!f.name.trim())    { alert('請輸入姓名'); return }
  if (!f.contact.trim()) { alert('請輸入聯絡方式'); return }
  const hasSoymilk = f.soymilkItems.some(i => i.qty > 0)
  if (!hasSoymilk && f.tofuQty === 0) { alert('請選擇豆漿或豆腐數量'); return }

  // ── 休息日檢查 ────────────────────────────────────────────────
  const pickupDate = nextPickupDateFromNow(f.pickupDay)
  if (closedDates.value.includes(pickupDate)) {
    const d = new Date(pickupDate + 'T00:00:00')
    const weekDay = ['日','一','二','三','四','五','六'][d.getDay()]
    alert(`${d.getMonth()+1}/${d.getDate()}（週${weekDay}）為休息日，無法新增訂單`)
    return
  }
  createModal.value.submitting = true
  try {
    const soymilkItems = f.soymilkItems
      .filter(i => i.qty > 0)
      .map(i => ({ volume: resolveVol(i), qty: i.qty }))
    const payload = {
      name: f.name.trim(), contact: f.contact.trim(),
      pickupDay: f.pickupDay,
      soymilkItems,
      soymilkQty: soymilkItems.reduce((s, i) => s + i.qty, 0),
      soymilkVolume: soymilkItems.length === 1 ? soymilkItems[0].volume : 0,
      tofuQty: f.tofuQty,
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

// ── 休息日設定 ────────────────────────────────────────────────────
const closedDates = ref([])          // ['2026-06-17', '2026-06-24']
const closedDateInput = ref('')      // 新增輸入框
const closedSaving = ref(false)
const closedSaved  = ref(false)

const fetchClosedDates = async () => {
  try {
    const res  = await fetch(`${BASE.value}/admin/settings/closed-dates`, { credentials: 'include' })
    const data = await res.json()
    closedDates.value = Array.isArray(data.closedDates) ? data.closedDates : []
  } catch {}
}

const addClosedDate = async () => {
  const d = closedDateInput.value.trim()
  if (!d.match(/^\d{4}-\d{2}-\d{2}$/)) { alert('請輸入正確日期格式 YYYY-MM-DD'); return }
  if (closedDates.value.includes(d)) { alert('此日期已在休息日清單中'); return }
  closedSaving.value = true
  try {
    const res  = await fetch(`${BASE.value}/admin/settings/closed-dates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ date: d }),
    })
    const data = await res.json()
    if (data.error) { alert('新增失敗：' + data.error); return }
    closedDates.value = data.closedDates
    closedDateInput.value = ''
    closedSaved.value = true
    setTimeout(() => closedSaved.value = false, 2000)
  } catch { alert('新增失敗') } finally { closedSaving.value = false }
}

const removeClosedDate = async (date) => {
  closedSaving.value = true
  try {
    const res  = await fetch(`${BASE.value}/admin/settings/closed-dates`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ date }),
    })
    const data = await res.json()
    if (data.error) { alert('刪除失敗：' + data.error); return }
    closedDates.value = data.closedDates
  } catch { alert('刪除失敗') } finally { closedSaving.value = false }
}

// 格式化休息日顯示：2026-06-17 → 06/17（週三）
function formatClosedDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const weekDay = ['日','一','二','三','四','五','六'][d.getDay()]
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}（週${weekDay}）`
}

// 是否為休息日（用於訂單列表標記）
function isClosedDate(dateStr) {
  return closedDates.value.includes(dateStr)
}
const editModal = ref({ show: false, submitting: false, orderId: '', orderMonth: '' })
const editForm = ref({
  name: '', contact: '', pickupDay: 'tue',
  soymilkItems: [newSoymilkItem()], tofuQty: 0,
  remark: '', status: '待確認',
})

const openEditModal = (order) => {
  const raw = normalizeSoymilkItems(order)
  const soymilkItems = raw.length > 0
    ? raw.map(i => ({
      volume: PRESET_VOLS.includes(i.volume) ? i.volume : -1,
      customVolume: PRESET_VOLS.includes(i.volume) ? 0 : i.volume,
      qty: i.qty || 1,
    }))
    : [newSoymilkItem()]
  editForm.value = {
    name:         order.name      || '',
    contact:      order.contact   || '',
    pickupDay:    order.pickupDay || 'tue',
    soymilkItems,
    tofuQty:      order.tofuQty  || 0,
    remark:       order.remark   || '',
    status:       order.status   || '待確認',
  }
  editModal.value = { show: true, submitting: false, orderId: order.id, orderMonth: order.month }
}

const closeEditModal = () => {
  editModal.value = { show: false, submitting: false, orderId: '', orderMonth: '' }
}

const submitEdit = async () => {
  const f = editForm.value
  if (!f.name.trim())    { alert('請輸入姓名'); return }
  if (!f.contact.trim()) { alert('請輸入聯絡方式'); return }
  const hasSoymilk = f.soymilkItems.some(i => i.qty > 0)
  if (!hasSoymilk && f.tofuQty === 0) { alert('請選擇豆漿或豆腐數量'); return }

  editModal.value.submitting = true
  try {
    const soymilkItems = f.soymilkItems
      .filter(i => i.qty > 0)
      .map(i => ({ volume: resolveVol(i), qty: i.qty }))
    const payload = {
      name:          f.name.trim(),
      contact:       f.contact.trim(),
      pickupDay:     f.pickupDay,
      soymilkItems,
      soymilkQty:    soymilkItems.reduce((s, i) => s + i.qty, 0),
      soymilkVolume: soymilkItems.length === 1 ? soymilkItems[0].volume : 0,
      tofuQty:       f.tofuQty,
      remark:        f.remark.trim(),
      status:        f.status,
    }
    const res = await fetch(
      `${BASE.value}/admin/order/${editModal.value.orderMonth}/${editModal.value.orderId}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) }
    )
    const data = await res.json()
    if (data.error) { alert('編輯失敗：' + data.error); return }
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
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3">
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
        <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">豆製品訂購管理</h1>
        <div class="flex items-center gap-1.5 sm:gap-2 ml-auto flex-wrap justify-end">
          <!-- 月份選擇 -->
          <select v-model="selectedMonth" @change="fetchData"
                  class="px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm">
            <option v-for="o in monthOptions" :key="o.val" :value="o.val">{{ o.label }}</option>
          </select>
          <!-- 客戶訂單連結 -->
          <a href="https://holyfarm.netlify.app/front/order/soybeans?og=20" target="_blank"
             class="flex items-center gap-1 px-2 py-1.5 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-400 hover:bg-green-700 hover:text-white hover:border-green-700 transition-colors text-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            <span class="hidden sm:inline">訂購連結</span>
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
                  class="flex items-center gap-1 px-2 py-1.5 border rounded-lg transition-colors text-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span class="hidden sm:inline">設定</span>
          </button>
          <!-- 重新整理 -->
          <button @click="fetchData" :disabled="loading"
                  class="flex items-center gap-1 px-2 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors text-xs">
            <svg :class="['w-3.5 h-3.5', loading && 'animate-spin']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span class="hidden sm:inline">{{ loading ? '載入中…' : '重新整理' }}</span>
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

      <!-- ── 休息日設定面板 ── -->
      <Transition name="hint-panel">
        <div v-if="showHintSettings"
             class="mb-4 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-3 border-b border-stone-100 dark:border-stone-700">
            <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
            </svg>
            <span class="text-sm font-semibold text-stone-700 dark:text-stone-200">休息日設定</span>
            <span class="text-xs text-stone-400">（設定後客戶無法訂購該取貨日）</span>
          </div>
          <div class="p-4">
            <!-- 新增輸入 -->
            <div class="flex gap-2 mb-3">
              <input v-model="closedDateInput" type="date"
                     class="flex-1 px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-stone-50 dark:bg-zinc-700 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-red-400"/>
              <button @click="addClosedDate" :disabled="closedSaving || !closedDateInput"
                      class="flex items-center gap-1 px-3 py-2 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 disabled:opacity-40 transition-colors font-medium whitespace-nowrap">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                </svg>
                新增
              </button>
            </div>

            <!-- 休息日清單 -->
            <div v-if="closedDates.length === 0" class="text-xs text-stone-400 py-2 text-center">
              尚未設定任何休息日
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <div v-for="d in closedDates.slice().sort()" :key="d"
                   class="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs">
                <svg class="w-3 h-3 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span class="text-red-700 dark:text-red-300 font-medium">{{ formatClosedDate(d) }}</span>
                <button @click="removeClosedDate(d)" :disabled="closedSaving"
                        class="ml-0.5 text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <Transition name="fade">
              <p v-if="closedSaved" class="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" points="20 6 9 17 4 12"/></svg>
                已更新
              </p>
            </Transition>
          </div>
        </div>
      </Transition>
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
            <span v-if="isClosedDate(group.date)"
                  class="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-medium">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
              休息日
            </span>
            <div class="flex-1 h-px bg-stone-200 dark:bg-stone-700"></div>
            <span class="text-xs text-stone-400 whitespace-nowrap">{{ group.orders.length }} 筆</span>
          </div>

          <!-- 手機：卡片列表 -->
          <div class="flex flex-col gap-2 sm:hidden">
            <div v-for="o in group.orders" :key="o.id"
                 class="bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3 shadow-sm"
                 :class="{ 'opacity-40': o.status === '已取消' }">
              <!-- 頂行：姓名 + 狀態 + 操作 -->
              <div class="flex items-center gap-2 mb-2">
                <span class="font-bold text-stone-800 dark:text-stone-100 text-sm flex-1">{{ o.name }}</span>
                <span :class="statusClass(o.status)">{{ o.status }}</span>
                <button @click="openEditModal(o)" :disabled="updatingId === o.id"
                        class="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 disabled:opacity-40 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button @click="openDeleteModal(o)" :disabled="updatingId === o.id"
                        class="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-40 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
              <!-- 中間：品項資訊 -->
              <div class="flex items-center gap-3 mb-2 flex-wrap">
                <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                      :class="o.pickupDay === 'tue' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'">
                  {{ pickupLabel(o) }}
                </span>
                <span v-if="normalizeSoymilkItems(o).length" class="text-sm font-semibold text-green-700">
                  豆漿 {{ totalSoymilkQty(normalizeSoymilkItems(o)) }} 袋
                  <span class="text-xs text-stone-400 font-normal">（{{ soymilkItemsLabel(o) }}）</span>
                </span>
                <span v-if="o.tofuQty" class="text-sm font-semibold text-amber-600">
                  豆腐 {{ o.tofuQty }} 塊
                </span>
                <span class="text-sm font-bold text-stone-700 dark:text-stone-200 ml-auto">
                  ${{ calcTotal(o) }}
                </span>
              </div>
              <!-- 底行：聯絡 + 備註 + 時間 -->
              <div class="flex items-center gap-2 text-xs text-stone-400 flex-wrap">
                <span>{{ o.contact }}</span>
                <span v-if="o.remark" class="text-stone-300">｜</span>
                <span v-if="o.remark" class="text-stone-400 truncate max-w-[120px]">{{ o.remark }}</span>
                <span class="ml-auto text-stone-300">{{ formatCreatedAt(o.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 桌機：表格 -->
          <div class="hidden sm:block bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm overflow-hidden">
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
                  <td class="px-3 py-2.5 text-xs text-stone-400 whitespace-nowrap">{{ formatCreatedAt(o.createdAt) }}</td>
                  <td class="px-3 py-2.5 font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">{{ o.name }}</td>
                  <td class="px-3 py-2.5 text-xs text-stone-500 dark:text-stone-400">{{ o.contact }}</td>
                  <td class="px-3 py-2.5">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                          :class="o.pickupDay === 'tue' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'">
                      {{ pickupLabel(o) }}
                    </span>
                  </td>
                  <td class="px-3 py-2.5">
                    <div v-if="normalizeSoymilkItems(o).length" class="text-xs text-green-700 font-semibold space-y-0.5">
                      <div v-for="(item, idx) in normalizeSoymilkItems(o)" :key="idx" class="whitespace-nowrap">
                        {{ item.volume }}ml × {{ item.qty }}
                      </div>
                    </div>
                    <span v-else class="text-stone-300 text-xs">—</span>
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <span v-if="o.tofuQty" class="font-semibold text-amber-600 text-xs">{{ o.tofuQty }} 塊</span>
                    <span v-else class="text-stone-300 text-xs">—</span>
                  </td>
                  <td class="px-3 py-2.5 font-semibold text-stone-800 dark:text-stone-100 text-xs whitespace-nowrap">
                    ${{ calcTotal(o) }}
                  </td>
                  <td class="px-3 py-2.5 text-xs text-stone-400 max-w-[100px] truncate">{{ o.remark || '—' }}</td>
                  <td class="px-3 py-2.5"><span :class="statusClass(o.status)">{{ o.status }}</span></td>
                  <td class="px-3 py-2.5">
                    <div class="flex gap-1 flex-wrap">
                      <button :disabled="updatingId === o.id" @click="openEditModal(o)"
                              class="px-2 py-0.5 text-xs border border-blue-200 dark:border-blue-900 rounded-lg bg-white dark:bg-zinc-700 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                        編輯
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
                          :disabled="isClosedDate(nextPickupDateFromNow('tue'))"
                          :class="[
                            isClosedDate(nextPickupDateFromNow('tue'))
                              ? 'opacity-40 cursor-not-allowed bg-white dark:bg-zinc-800 text-stone-400 border-stone-200 dark:border-stone-600'
                              : createForm.pickupDay === 'tue'
                                ? 'bg-green-700 text-white border-green-700'
                                : 'bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600'
                          ]"
                          class="flex-1 py-2 text-sm border rounded-xl transition-colors font-medium relative">
                    <div>{{ pickupDateLabel('tue') }}</div>
                    <span v-if="isClosedDate(nextPickupDateFromNow('tue'))"
                          class="text-xs font-normal text-red-400">休息日</span>
                  </button>
                  <button @click="createForm.pickupDay = 'fri'"
                          :disabled="isClosedDate(nextPickupDateFromNow('fri'))"
                          :class="[
                            isClosedDate(nextPickupDateFromNow('fri'))
                              ? 'opacity-40 cursor-not-allowed bg-white dark:bg-zinc-800 text-stone-400 border-stone-200 dark:border-stone-600'
                              : createForm.pickupDay === 'fri'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600'
                          ]"
                          class="flex-1 py-2 text-sm border rounded-xl transition-colors font-medium relative">
                    <div>{{ pickupDateLabel('fri') }}</div>
                    <span v-if="isClosedDate(nextPickupDateFromNow('fri'))"
                          class="text-xs font-normal text-red-400">休息日</span>
                  </button>
                </div>
              </div>

              <!-- 豆漿容量（多組） -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-medium text-stone-500">豆漿（可多種容量）</label>
                  <button @click="addSoymilkItem(createForm)"
                          class="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                    </svg>
                    新增容量
                  </button>
                </div>
                <div class="space-y-2">
                  <div v-for="(item, idx) in createForm.soymilkItems" :key="idx"
                       class="bg-stone-50 dark:bg-zinc-800 rounded-xl p-3">
                    <!-- 容量選擇 -->
                    <div class="flex items-center gap-1.5 flex-wrap mb-2">
                      <button v-for="v in PRESET_VOLS" :key="v"
                              @click="item.volume = v"
                              :class="item.volume === v ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-zinc-700 text-stone-500 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                              class="px-2.5 py-1 text-xs border rounded-lg transition-colors font-medium">
                        {{ v }}ml
                      </button>
                      <button @click="item.volume = -1"
                              :class="item.volume === -1 ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-zinc-700 text-stone-500 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                              class="px-2.5 py-1 text-xs border rounded-lg transition-colors font-medium">
                        自訂
                      </button>
                    </div>
                    <input v-if="item.volume === -1"
                           v-model.number="item.customVolume"
                           type="number" min="0" placeholder="輸入 ml"
                           class="w-full mb-2 px-3 py-1.5 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500"/>
                    <!-- 數量 & 刪除 -->
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-stone-400 mr-auto">數量</span>
                      <button @click="adjItemQty(item, -1)"
                              class="w-7 h-7 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center">−</button>
                      <span class="w-8 text-center font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ item.qty }}</span>
                      <button @click="adjItemQty(item, 1)"
                              class="w-7 h-7 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center">＋</button>
                      <button v-if="createForm.soymilkItems.length > 1" @click="removeSoymilkItem(createForm, idx)"
                              class="ml-2 w-7 h-7 border border-red-200 dark:border-red-900 rounded-lg bg-white dark:bg-zinc-700 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 豆腐 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1.5">豆腐（塊）</label>
                <div class="flex items-center gap-2">
                  <button @click="adjTofuQty(createForm, -1)"
                          class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">−</button>
                  <span class="w-10 text-center font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ createForm.tofuQty }}</span>
                  <button @click="adjTofuQty(createForm, 1)"
                          class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">＋</button>
                </div>
              </div>

              <!-- 金額小計 -->
              <div v-if="formTotal(createForm) > 0"
                   class="bg-stone-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 flex justify-between items-center text-sm">
                <span class="text-stone-400">小計</span>
                <span class="font-bold text-stone-800 dark:text-stone-100">${{ formTotal(createForm) }}</span>
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

              <!-- 豆漿容量（多組） -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-medium text-stone-500">豆漿（可多種容量）</label>
                  <button @click="addSoymilkItem(editForm)"
                          class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                    </svg>
                    新增容量
                  </button>
                </div>
                <div class="space-y-2">
                  <div v-for="(item, idx) in editForm.soymilkItems" :key="idx"
                       class="bg-stone-50 dark:bg-zinc-800 rounded-xl p-3">
                    <!-- 容量選擇 -->
                    <div class="flex items-center gap-1.5 flex-wrap mb-2">
                      <button v-for="v in PRESET_VOLS" :key="v"
                              @click="item.volume = v"
                              :class="item.volume === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-700 text-stone-500 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                              class="px-2.5 py-1 text-xs border rounded-lg transition-colors font-medium">
                        {{ v }}ml
                      </button>
                      <button @click="item.volume = -1"
                              :class="item.volume === -1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-700 text-stone-500 dark:text-stone-300 border-stone-200 dark:border-stone-600'"
                              class="px-2.5 py-1 text-xs border rounded-lg transition-colors font-medium">
                        自訂
                      </button>
                    </div>
                    <input v-if="item.volume === -1"
                           v-model.number="item.customVolume"
                           type="number" min="0" placeholder="輸入 ml"
                           class="w-full mb-2 px-3 py-1.5 text-sm border border-stone-200 dark:border-stone-600 rounded-xl bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"/>
                    <!-- 數量 & 刪除 -->
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-stone-400 mr-auto">數量</span>
                      <button @click="adjItemQty(item, -1)"
                              class="w-7 h-7 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center">−</button>
                      <span class="w-8 text-center font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ item.qty }}</span>
                      <button @click="adjItemQty(item, 1)"
                              class="w-7 h-7 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center">＋</button>
                      <button v-if="editForm.soymilkItems.length > 1" @click="removeSoymilkItem(editForm, idx)"
                              class="ml-2 w-7 h-7 border border-red-200 dark:border-red-900 rounded-lg bg-white dark:bg-zinc-700 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 豆腐 -->
              <div>
                <label class="block text-xs font-medium text-stone-500 mb-1.5">豆腐（塊）</label>
                <div class="flex items-center gap-2">
                  <button @click="adjTofuQty(editForm, -1)"
                          class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">−</button>
                  <span class="w-10 text-center font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ editForm.tofuQty }}</span>
                  <button @click="adjTofuQty(editForm, 1)"
                          class="w-8 h-8 border border-stone-200 dark:border-stone-600 rounded-lg bg-white dark:bg-zinc-700 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg">＋</button>
                </div>
              </div>

              <!-- 金額小計 -->
              <div v-if="formTotal(editForm) > 0"
                   class="bg-stone-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 flex justify-between items-center text-sm">
                <span class="text-stone-400">小計</span>
                <span class="font-bold text-stone-800 dark:text-stone-100">${{ formTotal(editForm) }}</span>
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
