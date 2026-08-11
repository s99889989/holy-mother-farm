<script setup>
definePageMeta({layout: 'staff', requiredPermission: 'staff.home'})

const commonStore = useCommonStore()
const HOME_BASE = () => commonStore.data.main_url + '/holy/home'
const CAL_BASE = () => commonStore.data.main_url + '/holy/calendar'
const RECUR_BASE = () => commonStore.data.main_url + '/holy/recurring'
const ROOMS_SETTINGS_BASE = () => commonStore.data.main_url + '/holy/rooms/settings'
const BOOKING_BASE = () => commonStore.data.main_url + '/holy/booking'
const LUNCH_BASE = () => commonStore.data.main_url + '/holy/lunch'

const GOOGLE_CALENDAR_ID = 'healthfarmpr@st-mary.org.tw'
const GOOGLE_API_KEY = 'AIzaSyDJ3AtXgPyYbHWZsHVLWNm9Hkr1gVa2l_k'

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayLabel = `${today.getMonth() + 1} 月 ${today.getDate()} 日　${weekDays[today.getDay()]}`

// 本週（週一～週日）範圍，跟後端 /holy/home/week 的週界算法一致
function fmtDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const calWeekMonday = new Date(today)
calWeekMonday.setDate(today.getDate() + (today.getDay() === 0 ? -6 : 1 - today.getDay()))
const calWeekSunday = new Date(calWeekMonday)
calWeekSunday.setDate(calWeekMonday.getDate() + 6)
const calWeekStart = fmtDateStr(calWeekMonday)
const calWeekEnd = fmtDateStr(calWeekSunday)

// 明天的日期，「今日行事曆」要多顯示明天，方便提早一天準備
const tomorrowDate = new Date(today)
tomorrowDate.setDate(today.getDate() + 1)
const tomorrowStr = fmtDateStr(tomorrowDate)
// 抓資料的範圍要涵蓋到明天，正常情況明天本來就在本週範圍內；
// 只有在今天剛好是週日、明天跨到下週（甚至跨月）時才會超出，這裡保底往後延一天
const fetchRangeEnd = tomorrowStr > calWeekEnd ? tomorrowStr : calWeekEnd

// ── 顯示模式：今日 / 本週 ────────────────────────────────────────────
const viewMode = ref('day') // 'day' | 'week'
const calViewMode = ref('day') // 行事曆自己的今日／本週切換，跟上面的概況切換各自獨立

// ── 今日概況 / 本週概況 ───────────────────────────────────────────────
const loading = ref(false)
const loadingWeek = ref(false)
const daySummary = ref(null)
const weekSummary = ref(null)
const allEvents = ref([]) // 本月所有行事曆事件（含 Google），今日／本週都從這裡篩選
const recurringRules = ref([]) // 包月訂位規則（跨月時含兩個月），今日／本週都從這裡依星期篩選

const summary = computed(() => (viewMode.value === 'week' ? weekSummary.value : daySummary.value))
const summaryLoading = computed(() => (viewMode.value === 'week' ? loadingWeek.value : loading.value))

const fmtMD = (dateStr) => {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}/${Number(d)}`
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const fmtMDWeekday = (dateStr) => {
  if (!dateStr) return ''
  const weekday = WEEKDAY_LABELS[new Date(`${dateStr}T00:00:00`).getDay()]
  return `${fmtMD(dateStr)}（週${weekday}）`
}

const weekRangeLabel = computed(() => {
  if (!weekSummary.value?.weekStart || !weekSummary.value?.weekEnd) return ''
  return `${fmtMD(weekSummary.value.weekStart)} - ${fmtMD(weekSummary.value.weekEnd)}`
})

const bookings = computed(() => summary.value?.booking?.items ?? [])
const lunchOrders = computed(() => summary.value?.lunch?.items ?? [])
const soybeanOrders = computed(() => summary.value?.soybean?.items ?? [])

// ── 包月訂位（recurring）：跟訂位頁一樣，只算 type !== 'lunch'、依星期（JS getDay()：0=日...6=六）篩選當天適用的規則
function recurBookingRulesForDate(date) {
  if (!date) return []
  const dow = new Date(`${date}T00:00:00`).getDay()
  return recurringRules.value.filter(r => r.type !== 'lunch' &&
    (!r.weekdays || r.weekdays.length === 0 || r.weekdays.includes(dow)))
}

const recurGuestsOf = rules => rules.reduce((s, r) =>
  s + (Number(r.meatQty) || 0) + (Number(r.fullVegQty) || 0) + (Number(r.eggVegQty) || 0) + (Number(r.spiceVegQty) || 0), 0)

const bookingRecurRules = computed(() => recurBookingRulesForDate(todayStr))
const bookingRecurGuests = computed(() => recurGuestsOf(bookingRecurRules.value))
const bookingRecurMeat = computed(() => bookingRecurRules.value.reduce((s, r) => s + (Number(r.meatQty) || 0), 0))
const bookingRecurFullVeg = computed(() => bookingRecurRules.value.reduce((s, r) => s + (Number(r.fullVegQty) || 0), 0))
const bookingRecurEggVeg = computed(() => bookingRecurRules.value.reduce((s, r) => s + (Number(r.eggVegQty) || 0), 0))
const bookingRecurSpiceVeg = computed(() => bookingRecurRules.value.reduce((s, r) => s + (Number(r.spiceVegQty) || 0), 0))

// 本週的 7 個日期（週一～週日）
const CAL_WEEK_DATES = (() => {
  const dates = []
  const d = new Date(calWeekMonday)
  for (let i = 0; i < 7; i++) {
    dates.push(fmtDateStr(d))
    d.setDate(d.getDate() + 1)
  }
  return dates
})()

const sumQty = (items, field) => items.reduce((s, i) => s + (i[field] || 0), 0)

// 本週檢視：每天各自獨立算自己的統計（不把整週加總在一起），依日期排序下去
const weekDayCards = computed(() => {
  if (viewMode.value !== 'week') return []
  return CAL_WEEK_DATES.map((date) => {
    const bItems = bookings.value.filter(i => i.date === date)
    const lItems = lunchOrders.value.filter(i => i.date === date)
    const sItems = soybeanOrders.value.filter(i => i.date === date)
    const bMeat = sumQty(bItems, 'meatQty'),
      bVeg = sumQty(bItems, 'fullVegQty') + sumQty(bItems, 'eggVegQty') + sumQty(bItems, 'spiceVegQty')
    const lMeat = sumQty(lItems, 'meatQty'),
      lVeg = sumQty(lItems, 'fullVegQty') + sumQty(lItems, 'eggVegQty') + sumQty(lItems, 'spiceVegQty')
    const recurRules = recurBookingRulesForDate(date)
    const recurG = recurGuestsOf(recurRules)
    const bOnsite = bMeat + bVeg
    return {
      date,
      booking: {items: bItems, total: bOnsite + recurG, onsiteTotal: bOnsite, recurGuests: recurG, recurRules},
      lunch: {items: lItems, total: lMeat + lVeg},
      soybean: {items: sItems}
    }
  })
})

const bookingTotal = computed(() => summary.value?.booking?.total ?? 0)
const bookingMeat = computed(() => summary.value?.booking?.meat ?? 0)
const bookingVeg = computed(() => summary.value?.booking?.veg ?? 0)
const bookingFullVeg = computed(() => summary.value?.booking?.fullVeg ?? 0)
const bookingEggVeg = computed(() => summary.value?.booking?.eggVeg ?? 0)
const bookingSpiceVeg = computed(() => summary.value?.booking?.spiceVeg ?? 0)
const lunchTotal = computed(() => summary.value?.lunch?.total ?? 0)
const lunchMeat = computed(() => summary.value?.lunch?.meat ?? 0)
const lunchVeg = computed(() => summary.value?.lunch?.veg ?? 0)
const lunchFullVeg = computed(() => summary.value?.lunch?.fullVeg ?? 0)
const lunchEggVeg = computed(() => summary.value?.lunch?.eggVeg ?? 0)
const lunchSpiceVeg = computed(() => summary.value?.lunch?.spiceVeg ?? 0)
const soybeanSoymilk = computed(() => summary.value?.soybean?.soymilk ?? 0)
const soybeanTofu = computed(() => summary.value?.soybean?.tofu ?? 0)
// 豆漿總容量（毫升）：把每筆訂單的容量明細（volume×qty）全部加總
const soybeanSoymilkTotalMl = computed(() => soybeanOrders.value.reduce((sum, item) => {
  const list = item.soymilkBreakdown || []
  return sum + list.reduce((s, b) => s + (Number(b.volume) || 0) * (Number(b.qty) || 0), 0)
}, 0))
// 豆製品後端會自動抓「未來最近一個出貨日」的訂單，不一定等於今天，這裡算出來給畫面顯示是哪一天
const soybeanPickupDate = computed(() => summary.value?.soybean?.date ?? '')
const soybeanIsToday = computed(() => soybeanPickupDate.value === todayStr)

// 豆製品區塊可收合（今日／本週共用同一個狀態），收合後訂位／便當文字放大一號（+2px）
const soybeanCollapsed = ref(false)

function fs(min, max, vw = 0.45) {
  const bump = soybeanCollapsed.value ? 2 : 0
  return `clamp(${min + bump}px, calc(${min + bump}px + ${vw}vw), ${max + bump}px)`
}

// ── 房務狀況：一律看「今天」的資料，不受上面今日／本週概況切換影響（房務本來就是當天的事）───
// 房務狀況要比照「訂單管理」列表呈現房型/棟別/金額，這些資訊只有房間設定 API 才有，
// 這裡直接複用跟 rooms-orders.vue 一樣的 /holy/rooms/settings/list 抓法，跟 today() 彙總資料分開拉
const roomBuildings = ref([])
const rooms = computed(() => roomBuildings.value.flatMap(b => (b.rooms || []).map(r => ({
  ...r,
  buildingId: b.id,
  buildingName: b.name
}))))

function roomById(roomId) {
  return rooms.value.find(r => r.id === roomId)
}

function roomTypeOfRoom(roomId) {
  const r = roomById(roomId)
  return r ? r.type : ''
}

function buildingNameOfRoom(roomId) {
  const r = roomById(roomId)
  return r ? r.buildingName : ''
}

function hkNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  const d = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
  return d > 0 ? d : 0
}

function hkOccupancyLabel(item) {
  const r = roomById(item.roomId)
  return r ? `${item.guests}/${r.capacity}` : `${item.guests} 人`
}

function hkBookingTotal(item) {
  const r = roomById(item.roomId)
  if (!r) return 0
  return r.price * hkNights(item.checkIn, item.checkOut)
}

function hkStatusLabel(s) {
  return {
    unassigned: '待指派',
    pending: '待確認',
    confirmed: '已確認',
    completed: '已退房',
    cancelled: '已取消'
  }[s] || s
}

function hkStatusClass(s) {
  return {
    unassigned: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  }[s] || 'bg-stone-100 text-stone-600'
}

async function fetchRoomBuildings() {
  try {
    const res = await fetch(`${ROOMS_SETTINGS_BASE()}/list`)
    if (res.ok) roomBuildings.value = await res.json()
  } catch (e) {
    console.error(e)
  }
}

const housekeeping = computed(() => daySummary.value?.housekeeping ?? null)

// 同一棟連續的房間只在第一筆前面插一個棟別小標題，不用每一列都重複顯示棟別名稱（比照訂房管理／訂單管理的做法）
function withBuildingHeaders(list) {
  let lastBuildingName
  return list.map(item => {
    const buildingName = buildingNameOfRoom(item.roomId)
    const showBuildingHeader = !!item.roomId && buildingName !== lastBuildingName
    if (item.roomId) lastBuildingName = buildingName
    return {...item, buildingName, showBuildingHeader}
  })
}

const hkCheckouts = computed(() => withBuildingHeaders(housekeeping.value?.checkouts ?? []))
const hkCheckins = computed(() => withBuildingHeaders(housekeeping.value?.checkins ?? []))

// 合併退房＋入住成單一清單（比照訂單管理，同一個 groupId 用一個團體表頭列，其餘依房號排序，
// 同一棟連續的房間一樣只在第一筆前面插棟別小標題），每列自己用小標籤標示是退房整理還是入住備妥。
// 不再依日期插分隔列——表頭列／每列本身就已經顯示入住、退房的完整日期（含星期），不需要
// 再用日期分隔列重複交代一次；同一個 groupId 也只出現一張表頭列（合併入住/退房兩批成員，
// 表頭的日期區間文字本身就同時顯示入住、退房日期，不用為了兩個日期各自出現一次表頭列）
const expandedHkGroups = ref(new Set())

function toggleHkGroup(key) {
  const s = new Set(expandedHkGroups.value)
  if (s.has(key)) s.delete(key); else s.add(key)
  expandedHkGroups.value = s
}

// 房務狀況目前出現的所有團體 id（用來做「全部展開／全部收合」，不受目前展開狀態影響）
const hkAllGroupIds = computed(() => {
  const ids = new Set()
  for (const item of [...(housekeeping.value?.checkouts ?? []), ...(housekeeping.value?.checkins ?? [])]) {
    if (item.groupId) ids.add(item.groupId)
  }
  return [...ids]
})

function expandAllHkGroups() {
  expandedHkGroups.value = new Set(hkAllGroupIds.value)
}

function collapseAllHkGroups() {
  expandedHkGroups.value = new Set()
}

function hkGroupDateRangeLabel(members) {
  const ins = members.map(m => m.checkIn).sort()
  const outs = members.map(m => m.checkOut).sort()
  const minIn = ins[0], maxOut = outs[outs.length - 1]
  const sameRange = ins.every(d => d === minIn) && outs.every(d => d === maxOut)
  const inLabel = minIn ? fmtMDWeekday(minIn) : ''
  const outLabel = maxOut ? fmtMDWeekday(maxOut) : ''
  return sameRange ? `入住 ${inLabel} → 退房 ${outLabel}` : `入住 ${inLabel} ～ 退房 ${outLabel}（各房日期不同）`
}

function hkGroupStatusSummary(members) {
  const counts = {}
  for (const m of members) counts[m.status] = (counts[m.status] || 0) + 1
  return Object.entries(counts).map(([s, c]) => `${hkStatusLabel(s)} ${c}`).join('・')
}

const hkRows = computed(() => {
  const combined = [
    ...(housekeeping.value?.checkouts ?? []).map(item => ({...item, kind: 'checkout', dateKey: item.checkOut})),
    ...(housekeeping.value?.checkins ?? []).map(item => ({...item, kind: 'checkin', dateKey: item.checkIn})),
  ]
  // 「舊客退房、新客入住」是指同一天有兩筆『不同』訂單（各自的 id 不同），這種情況才只留入住那筆。
  // 如果一筆訂單只在 30 天內看得到「退房」這一半（例如很早之前就入住、還沒排進這次視窗內的入住清單，
  // 或團體裡有房間中途加進來、入住日已經過了），代表它沒有對應的「入住」筆可以代替顯示，不能整筆跳過，
  // 不然這筆訂單（連同它所屬的團體展開後）會憑空消失、展開了也看不到任何列
  const idsWithCheckin = new Set((housekeeping.value?.checkins ?? []).map(i => i.id))

  // 同一個 groupId 底下的成員（不分入住/退房兩種 kind）先各自去重收集起來（同一筆訂單的
  // 入住列跟退房列會有相同 id，用 id 去重合併成一筆），用來算「共幾間房」跟表頭列的日期區間，
  // 避免同一團在入住日、退房日各自產生一張表頭列
  const groupAllMembers = new Map() // groupId -> Map(id -> member)
  for (const item of combined) {
    if (!item.groupId) continue
    if (!groupAllMembers.has(item.groupId)) groupAllMembers.set(item.groupId, new Map())
    groupAllMembers.get(item.groupId).set(item.id, item)
  }

  // 排序：團體用「最早的入住日」當排序依據，個人訂單用自己的日期，同一天再依房號排序
  function sortKeyOf(item) {
    if (item.groupId) return [...groupAllMembers.get(item.groupId).values()].map(m => m.checkIn).sort()[0]
    return item.dateKey
  }

  const sorted = [...combined].sort((a, b) => {
    const ka = sortKeyOf(a), kb = sortKeyOf(b)
    if (ka !== kb) return ka < kb ? -1 : 1
    return String(a.roomId).localeCompare(String(b.roomId))
  })

  const rows = []
  let lastBuildingName
  const emittedGroupIds = new Set()
  let currentGroupExpanded = false

  for (const item of sorted) {
    if (item.groupId) {
      currentGroupExpanded = expandedHkGroups.value.has(item.groupId)
      if (!emittedGroupIds.has(item.groupId)) {
        emittedGroupIds.add(item.groupId)
        rows.push({
          rowKind: 'groupHeader', groupKey: item.groupId,
          groupId: item.groupId, groupName: item.groupName,
          members: [...groupAllMembers.get(item.groupId).values()], expanded: currentGroupExpanded,
        })
      }
      if (!currentGroupExpanded) continue // 團體收合時不畫出每一間房的列，只留表頭列
      // 團體展開後同一間房如果同一天「舊客退房、新客入住」（兩筆不同訂單）才只留入住那筆；
      // 只有退房、沒有對應入住筆的訂單（表頭列的「共幾間房」是用 groupAllMembers 依 id 去重算的，
      // 不受這裡的顯示邏輯影響，不會變少）仍要顯示，不然這間房展開後就憑空不見
      if (item.kind === 'checkout' && idsWithCheckin.has(item.id)) continue
      const buildingName = buildingNameOfRoom(item.roomId)
      const showBuildingHeader = !!item.roomId && buildingName !== lastBuildingName
      if (item.roomId) lastBuildingName = buildingName
      rows.push({rowKind: 'item', item: {...item, buildingName, showBuildingHeader}})
      continue
    }
    // 個人訂單：同一間房若同一天「舊客退房、新客入住」（兩筆不同訂單）會各出現一筆，只留入住
    // 那筆就夠；但如果這筆訂單只看得到退房、沒有對應的入住筆，代表它沒有別筆能代替顯示，要保留
    if (item.kind === 'checkout' && idsWithCheckin.has(item.id)) continue
    const buildingName = buildingNameOfRoom(item.roomId)
    rows.push({rowKind: 'item', item: {...item, buildingName}})
  }
  return rows
})
const hkPendingCount = computed(() => housekeeping.value?.pendingCount ?? 0)
const hkSavingRoomIds = ref([]) // 正在送出中的房號，避免同一個房間被連續快速點擊

async function toggleCleaned(item) {
  const roomId = item.roomId
  if (hkSavingRoomIds.value.includes(roomId)) return
  const nextCleaned = !item.cleaned
  hkSavingRoomIds.value = [...hkSavingRoomIds.value, roomId]
  try {
    const res = await fetch(`${HOME_BASE()}/housekeeping/status`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({date: todayStr, roomId, cleaned: nextCleaned})
    })
    if (res.ok) {
      // 同一間房可能同時出現在「退房」跟「入住」兩份清單（今天連續订：舊客退房、新客馬上入住），
      // 打掃狀態是依房號存的，兩邊要一起同步更新，不用等下一次重新抓資料
      const hk = daySummary.value?.housekeeping
      if (hk) {
        for (const it of [...(hk.checkouts || []), ...(hk.checkins || [])]) {
          if (it.roomId === roomId) it.cleaned = nextCleaned
        }
        hk.pendingCount = (hk.checkouts || []).filter(it => !it.cleaned).length
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    hkSavingRoomIds.value = hkSavingRoomIds.value.filter(id => id !== roomId)
  }
}

// 今日行事曆現在同時顯示「今天」跟「明天」兩天，本週行事曆維持顯示整週，兩邊都用同一套「每天分組」模板呈現
const CAL_TODAY_DATES = [todayStr, tomorrowStr]
const calDisplayDates = computed(() => (calViewMode.value === 'week' ? CAL_WEEK_DATES : CAL_TODAY_DATES))
const calEventsByDay = computed(() => (
  calDisplayDates.value.map(date => ({
    date,
    events: allEvents.value.filter(e => e.date === date)
  }))
))
const calHasAnyEvents = computed(() => calEventsByDay.value.some(day => day.events.length > 0))

// ── 今日備菜（來自備餐/出餐管理系統）：今日模式看「今天／明天」兩天，本週模式看整週，跟今日行事曆用同一套日期組 ──
const MEAL_BASE = () => commonStore.data.main_url + '/holy/meal-schedule'
const mealLoading = ref(false)
const mealSessions = ref([])
const mealViewMode = ref('day') // 備菜區塊自己的今日／本週切換，跟今日行事曆的 calViewMode 各自獨立

async function fetchMealSessions() {
  mealLoading.value = true
  try {
    mealSessions.value = await (await fetch(`${MEAL_BASE()}/list`)).json()
  } catch (e) {
    console.error(e)
  } finally {
    mealLoading.value = false
  }
}

const mealTypeOrder = t => (t === '早餐' ? 0 : t === '午餐' ? 1 : t === '晚餐' ? 2 : 3)

const mealDisplayDates = computed(() => (mealViewMode.value === 'week' ? CAL_WEEK_DATES : CAL_TODAY_DATES))

const mealSessionsByDay = computed(() => (
  mealDisplayDates.value.map(date => ({
    date,
    sessions: mealSessions.value
      .filter(s => s.date === date)
      .sort((a, b) => mealTypeOrder(a.mealType) - mealTypeOrder(b.mealType))
  }))
))
const mealHasAnySessions = computed(() => mealSessionsByDay.value.some(day => day.sessions.length > 0))

// 備菜區塊的每日標題：今日模式直接標示「今天／明天」，本週模式維持只顯示日期，跟 calDayHeaderLabel 同一套規則
function mealDayHeaderLabel(date) {
  if (mealViewMode.value !== 'week') {
    if (date === todayStr) return `今天　${fmtMDWeekday(date)}`
    if (date === tomorrowStr) return `明天　${fmtMDWeekday(date)}`
  }
  return fmtMDWeekday(date)
}

function mealTypeBadgeClass(mealType) {
  if (mealType === '早餐') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30'
  if (mealType === '午餐') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/30'
  if (mealType === '晚餐') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30'
  return 'bg-surface2 text-hint-c'
}

// 備菜卡片內文：九宮格便當精簡列出 9 格內容，一般餐次列出菜色（含附註）
function mealDishSummary(session) {
  if (session.boxGrid && session.boxGrid.length === 9) return session.boxGrid.join('、')
  if (session.dishes && session.dishes.length) {
    return session.dishes.map(d => (d.note ? `${d.name}（${d.note}）` : d.name)).join('、')
  }
  return ''
}

function mealServingSummary(session) {
  if (!session.servingPoints || !session.servingPoints.length) return ''
  return session.servingPoints
    .map(sp => `${sp.name || '—'}${sp.count != null ? ' ' + sp.count + '位' : ''}`)
    .join('　')
}

// 今日行事曆的每日標題：今天／明天直接標示文字，比只看日期清楚；本週行事曆維持只顯示日期
function calDayHeaderLabel(date) {
  if (calViewMode.value !== 'week') {
    if (date === todayStr) return `今天　${fmtMDWeekday(date)}`
    if (date === tomorrowStr) return `明天　${fmtMDWeekday(date)}`
  }
  return fmtMDWeekday(date)
}

// 事件詳細內容：跟 calendar.vue 一致統一用 description 欄位；Google 的內容可能帶 HTML 標籤，用同一套 stripHtml 去掉再顯示
function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}

function calEventDetail(ev) {
  return stripHtml(ev.description || '')
}

const calWeekRangeLabel = `${fmtMD(calWeekStart)} - ${fmtMD(calWeekEnd)}`

// 依葷素細項組成簡短標籤，例如「葷2・全素1・蛋奶素1」，用於卡片內每筆訂單顯示
function typeBreakdown(item) {
  const parts = []
  if (item.meatQty) parts.push(`🍖葷${item.meatQty}`)
  if (item.fullVegQty) parts.push(`🌿全素${item.fullVegQty}`)
  if (item.eggVegQty) parts.push(`🥚蛋奶素${item.eggVegQty}`)
  if (item.spiceVegQty) parts.push(`🧄五辛素${item.spiceVegQty}`)
  return parts.join('・')
}

// 單筆訂位/包月的總人數（葷素加總）
function itemGuestTotal(item) {
  return (Number(item.meatQty) || 0) + (Number(item.fullVegQty) || 0) + (Number(item.eggVegQty) || 0) + (Number(item.spiceVegQty) || 0)
}

// 容量數字格式化：滿 1000ml 就換算成 L 顯示（例如 8700 -> 8.7L，8000 -> 8L），避免小數字太長
function formatVolume(ml) {
  if (!ml) return '0ml'
  if (ml >= 1000) {
    const l = ml / 1000
    return `${Number.isInteger(l) ? l : l.toFixed(1)}L`
  }
  return `${ml}ml`
}

// 豆漿容量明細，例如「800ml×2、1200ml×1」——同一筆訂單可能混搭不同容量
function soymilkBreakdownText(item) {
  const list = item.soymilkBreakdown || []
  if (!list.length) return item.soymilkQty ? `豆漿${item.soymilkQty}` : ''
  return list.map(b => `${b.volume}ml×${b.qty}`).join('、')
}

const detailStatusClass = (status) => {
  switch (status) {
    case '已確認':
    case '已入位':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case '客戶提出取消':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case '已取消':
      return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  }
}

// ── 新訂單通知（SSE 即時推播＋跳出訊息＋提示音）───────────────────────
let eventSource = null
// 記錄目前已知的訂單內容（不只 ID，連內容一起存，刪除時才有資料可顯示）
const knownBookings = new Map()
const knownLunches = new Map()
const knownSoybeans = new Map()

const notifications = ref([])
let notifySeq = 0

// 提示音開關（記住使用者偏好；預設開啟，但實際能否播放仍受瀏覽器自動播放限制）
const soundEnabled = ref(true)

function loadSoundPref() {
  try {
    const saved = localStorage.getItem('holy_home_sound_enabled')
    if (saved !== null) soundEnabled.value = saved === '1'
  } catch (e) { /* 無法讀取偏好時使用預設值 */
  }
}

function saveSoundPref() {
  try {
    localStorage.setItem('holy_home_sound_enabled', soundEnabled.value ? '1' : '0')
  } catch (e) { /* 無痕模式等情況可能無法儲存，忽略即可 */
  }
}

// 提示音效（叮咚聲，非語音）音量倍率：現場如果覺得叮咚聲蓋不過音樂，可以自己調大聲一點。
// 這個只影響 playTones() 產生的音效，不影響語音播報本身——瀏覽器 Web Speech API 的
// utter.volume 上限就是 1（100%），沒辦法再往上加大，這是 API 本身的天花板，調這個滑桿沒用。
// 範圍刻意允許超過 100%（最高 250%），因為叮咚聲是我們自己用 Web Audio API 產生的波形，
// GainNode 的 gain 值本來就不受「1 = 最大」限制，可以放得比原本更大聲（超過某個程度可能會
// 聽起來有點破音，現場可以自己抓感覺剛好的位置）。
const alertVolume = ref(1.6)

function loadAlertVolumePref() {
  try {
    const saved = localStorage.getItem('holy_home_alert_volume')
    if (saved !== null) {
      const n = parseFloat(saved)
      if (!isNaN(n) && n > 0) alertVolume.value = n
    }
  } catch (e) { /* 無法讀取偏好時使用預設值 */
  }
}

function saveAlertVolumePref() {
  try {
    localStorage.setItem('holy_home_alert_volume', String(alertVolume.value))
  } catch (e) { /* 無痕模式等情況可能無法儲存，忽略即可 */
  }
}

function onAlertVolumeInput(e) {
  alertVolume.value = parseFloat(e.target.value)
  saveAlertVolumePref()
}

// ── 設定區塊（可收縮）：定時檢查（輪詢）開關 ─────────────────────────
const showSettings = ref(false)
const pollEnabled = ref(true)

function loadPollPref() {
  try {
    const saved = localStorage.getItem('holy_home_poll_enabled')
    if (saved !== null) pollEnabled.value = saved === '1'
  } catch (e) { /* 無法讀取偏好時使用預設值 */
  }
}

function savePollPref() {
  try {
    localStorage.setItem('holy_home_poll_enabled', pollEnabled.value ? '1' : '0')
  } catch (e) { /* 無痕模式等情況可能無法儲存，忽略即可 */
  }
}

function togglePoll() {
  pollEnabled.value = !pollEnabled.value
  savePollPref()
}

// ── 設定區塊：是否接收內場語音廣播（有些裝置/畫面不需要放出聲音，可以關掉）───
const broadcastReceiveEnabled = ref(true)

function loadBroadcastReceivePref() {
  try {
    const saved = localStorage.getItem('holy_home_broadcast_receive_enabled')
    if (saved !== null) broadcastReceiveEnabled.value = saved === '1'
  } catch (e) { /* 無法讀取偏好時使用預設值 */
  }
}

function saveBroadcastReceivePref() {
  try {
    localStorage.setItem('holy_home_broadcast_receive_enabled', broadcastReceiveEnabled.value ? '1' : '0')
  } catch (e) { /* 無痕模式等情況可能無法儲存，忽略即可 */
  }
}

function toggleBroadcastReceive() {
  broadcastReceiveEnabled.value = !broadcastReceiveEnabled.value
  saveBroadcastReceivePref()
  if (broadcastReceiveEnabled.value) {
    connectBroadcastSignaling()
  } else {
    disconnectBroadcastSignaling() // 立刻斷開信令連線＋收掉任何正在播放的廣播，不用等重新整理頁面
  }
}

// 瀏覽器多半要求先有使用者互動才允許播放音效，先建立/解鎖 AudioContext
let audioCtx = null

function getAudioCtx() {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext
    if (AudioCtxClass) audioCtx = new AudioCtxClass()
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {
  })
  return audioCtx
}

function unlockAudio() {
  getAudioCtx()
  primeSpeech()
}

// 接一個 MediaStream，持續量測音量大小寫進 levelRef（0～1，粗略 RMS），回傳一個停止函式。
// 用途：證明「聲音資料真的有傳過來」跟「傳過來但這台放不出聲音」是兩件不同的事——
// 如果這個量表會跳，代表 WebRTC 音訊資料確實收到了，問題就出在這台電腦的喇叭/音量/
// 輸出裝置設定，不是連線或程式的問題；如果完全不跳，才需要往連線本身去查。
function startLevelMeter(stream, levelRef) {
  try {
    const ctx = getAudioCtx()
    if (!ctx) return null
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser) // 只接來做分析，不接 destination，不會因此多播放一次聲音
    const data = new Uint8Array(analyser.frequencyBinCount)
    let rafId = null
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sumSquares = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sumSquares += v * v
      }
      levelRef.value = Math.sqrt(sumSquares / data.length)
      rafId = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      try {
        source.disconnect()
      } catch (e) { /* 忽略 */
      }
      try {
        analyser.disconnect()
      } catch (e) { /* 忽略 */
      }
    }
  } catch (e) {
    console.error('[broadcast] 無法建立音量偵測', e)
    return null
  }
}

function playTones(tones, waveType) {
  try {
    const ctx = getAudioCtx()
    if (!ctx) return
    // 基準峰值音量 0.5，再乘上使用者設定的 alertVolume 倍率（預設 1.6 倍，比原本更大聲）；
    // GainNode 允許超過 1，所以倍率拉高真的會比「音量開到最大」更大聲，不是無效設定。
    const peak = 0.5 * alertVolume.value
    tones.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.18
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = waveType
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.44)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.46)
    })
  } catch (e) { /* 音效播放失敗不影響其他功能 */
  }
}

// 新訂單：明亮上揚的四音「叮咚叮咚」
function playCreateSound() {
  playTones([880, 1046, 880, 1318], 'sine')
}

// 刪除訂單：低沉下降的兩音，跟新訂單的音效明顯不同
function playDeleteSound() {
  playTones([523, 349], 'triangle')
}

// ── 語音播報新訂單（瀏覽器內建 Web Speech API，不需要額外服務）───────────
function primeSpeech() {
  // 部分瀏覽器（尤其 Chrome）需要先有一次使用者互動才願意播放語音，這裡先「唸」一個空字串預熱
  try {
    if (!window.speechSynthesis) return
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
  } catch (e) { /* 忽略 */
  }
}

function speakText(text) {
  try {
    if (!window.speechSynthesis || !text) return
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'zh-TW'
    utter.rate = 1
    // utter.volume 的合法範圍是 0～1，1 已經是 Web Speech API 允許的最大值，沒辦法再往上加大；
    // 如果語音本身聽起來還是太小聲，只能透過拉高叮咚提示音（alertVolume）先抓住注意力，
    // 或是調整這台電腦本身的系統音量/瀏覽器分頁音量。
    utter.volume = 1
    window.speechSynthesis.speak(utter)
  } catch (e) { /* 語音播放失敗不影響其他功能 */
  }
}

// 時間唸法，例如 "12:00" → "12點"，"12:30" → "12點30分"
function timeToSpoken(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  return m ? `${h}點${m}分` : `${h}點`
}

// 訂位／便當的葷素細項唸法，例如「葷2位、全素1位」或「葷便當2個、全素便當1個」
function spokenTypeBreakdown(item, unit) {
  const parts = []
  if (item.meatQty) parts.push(`葷${unit}${item.meatQty}`)
  if (item.fullVegQty) parts.push(`全素${unit}${item.fullVegQty}`)
  if (item.eggVegQty) parts.push(`蛋奶素${unit}${item.eggVegQty}`)
  if (item.spiceVegQty) parts.push(`五辛素${unit}${item.spiceVegQty}`)
  return parts.join('、')
}

function bookingSpokenText(item, prefix = '新訂位') {
  const detail = spokenTypeBreakdown(item, '') || '尚未填寫數量'
  const timeText = timeToSpoken(item.time)
  const nameText = item.name || '未填姓名'
  const noteText = item.note ? `，備註：${item.note}` : ''
  return `${prefix}，${nameText}，${timeText ? timeText + '，' : ''}${detail}位${noteText}`
}

function lunchSpokenText(item, prefix = '新便當訂單') {
  const parts = []
  if (item.meatQty) parts.push(`葷便當${item.meatQty}個`)
  if (item.fullVegQty) parts.push(`全素便當${item.fullVegQty}個`)
  if (item.eggVegQty) parts.push(`蛋奶素便當${item.eggVegQty}個`)
  if (item.spiceVegQty) parts.push(`五辛素便當${item.spiceVegQty}個`)
  const detail = parts.join('、') || '尚未填寫數量'
  const timeText = timeToSpoken(item.time)
  const nameText = item.name || '未填姓名'
  const noteText = item.note ? `，備註：${item.note}` : ''
  return `${prefix}，${nameText}，${timeText ? timeText + '，' : ''}${detail}${noteText}`
}

function soybeanSpokenText(item, prefix = '新豆製品訂購') {
  const parts = []
  for (const b of (item.soymilkBreakdown || [])) {
    parts.push(`豆漿${b.volume}毫升${b.qty}袋`)
  }
  if (item.tofuQty) parts.push(`豆腐${item.tofuQty}塊`)
  const detail = parts.join('、') || '尚未填寫數量'
  const nameText = item.name || '未填姓名'
  return `${prefix}，${nameText}，${detail}`
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  saveSoundPref()
  if (soundEnabled.value) {
    unlockAudio()
    // 依序播兩種聲音，讓使用者一次聽出新訂單／刪除的差異
    playCreateSound()
    setTimeout(playDeleteSound, 1050)
    setTimeout(() => speakText('新訂位，王先生，12點，葷2位'), 1700)
    setTimeout(() => speakText('訂位取消，王先生，12點，葷2位'), 3500)
  }
}

function pushNotification(icon, title, detail, tab) {
  const id = ++notifySeq
  notifications.value.push({id, icon, title, detail, tab})
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }, 8000)
}

function dismissNotification(id) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

function openNotification(n) {
  viewMode.value = 'day'
  dismissNotification(n.id)
}

const qtyOf = (item) => (item.meatQty || 0) + (item.fullVegQty || 0) + (item.eggVegQty || 0) + (item.spiceVegQty || 0)

// 判斷同一筆訂位／便當訂單，內容是否有被編輯過（姓名/時間/狀態/葷素數量/備註任一有變），
// 用來在「已入位」以外的一般編輯（例如改時間、改數量）時也跳通知＋語音
function bookingSnapshotEqual(a, b) {
  return a.name === b.name && a.time === b.time && a.status === b.status &&
    a.meatQty === b.meatQty && a.fullVegQty === b.fullVegQty &&
    a.eggVegQty === b.eggVegQty && a.spiceVegQty === b.spiceVegQty &&
    (a.note || '') === (b.note || '')
}

function lunchSnapshotEqual(a, b) {
  return a.name === b.name && a.time === b.time && a.status === b.status &&
    a.meatQty === b.meatQty && a.fullVegQty === b.fullVegQty &&
    a.eggVegQty === b.eggVegQty && a.spiceVegQty === b.spiceVegQty &&
    (a.note || '') === (b.note || '')
}

function syncKnownItems(data) {
  knownBookings.clear()
  ;(data?.booking?.items ?? []).forEach(i => knownBookings.set(i.id, i))
  knownLunches.clear()
  ;(data?.lunch?.items ?? []).forEach(i => knownLunches.set(i.id, i))
  knownSoybeans.clear()
  ;(data?.soybean?.items ?? []).forEach(i => knownSoybeans.set(i.id, i))
}

async function syncNewOrders() {
  try {
    const res = await fetch(`${HOME_BASE()}/today`, {credentials: 'include'})
    if (!res.ok) return
    const data = await res.json()

    const newBookings = data?.booking?.items ?? []
    const newLunches = data?.lunch?.items ?? []
    const newSoybeans = data?.soybean?.items ?? []
    const newBookingIds = new Set(newBookings.map(i => i.id))
    const newLunchIds = new Set(newLunches.map(i => i.id))
    const newSoybeanIds = new Set(newSoybeans.map(i => i.id))
    let gotCreated = false
    let gotDeleted = false
    let gotCheckedIn = false
    let gotModified = false
    const spokenPhrases = []
    const spokenModifiedPhrases = []

    // 新增／已入位／一般編輯（改時間、改數量等，跟已入位分開處理，避免重複跳兩次通知）
    for (const item of newBookings) {
      const prev = knownBookings.get(item.id)
      if (!prev) {
        gotCreated = true
        pushNotification('🍽️', '新訂位', `${item.name || '未填姓名'}　${item.time || ''}　${typeBreakdown(item) || qtyOf(item) + '人'}`, 'booking')
        spokenPhrases.push(bookingSpokenText(item))
      } else if (prev.status !== '已入位' && item.status === '已入位') {
        gotCheckedIn = true
        pushNotification('🪑', '訂位已入位', `${item.name || '未填姓名'}　${item.time || ''}`, 'booking')
        spokenPhrases.push(`${item.name || '未填姓名'}，已入位`)
      } else if (!bookingSnapshotEqual(prev, item)) {
        gotModified = true
        pushNotification('✏️', '訂位異動', `${item.name || '未填姓名'}　${item.time || ''}　${typeBreakdown(item) || qtyOf(item) + '人'}`, 'booking')
        spokenModifiedPhrases.push(bookingSpokenText(item, '訂位異動'))
      }
    }
    for (const item of newLunches) {
      const prev = knownLunches.get(item.id)
      if (!prev) {
        gotCreated = true
        pushNotification('🍱', '新便當訂單', `${item.name || '未填姓名'}　${item.time || ''}　${typeBreakdown(item) || qtyOf(item) + '個'}`, 'lunch')
        spokenPhrases.push(lunchSpokenText(item))
      } else if (!lunchSnapshotEqual(prev, item)) {
        gotModified = true
        pushNotification('✏️', '便當訂單異動', `${item.name || '未填姓名'}　${item.time || ''}　${typeBreakdown(item) || qtyOf(item) + '個'}`, 'lunch')
        spokenModifiedPhrases.push(lunchSpokenText(item, '便當訂單異動'))
      }
    }
    for (const item of newSoybeans) {
      if (!knownSoybeans.has(item.id)) {
        gotCreated = true
        const parts = []
        const soyText = soymilkBreakdownText(item)
        if (soyText) parts.push(`豆漿 ${soyText}`)
        if (item.tofuQty) parts.push(`豆腐${item.tofuQty}`)
        pushNotification('🥛', '新豆製品訂購', `${item.name || '未填姓名'}　${parts.join('・')}`, 'soybean')
        spokenPhrases.push(soybeanSpokenText(item))
      }
    }

    // 刪除（用刪除前記住的內容顯示，因為新資料裡已經沒有這筆了）
    const spokenDeletePhrases = []
    for (const [id, item] of knownBookings) {
      if (!newBookingIds.has(id)) {
        gotDeleted = true
        pushNotification('🗑️', '訂位已刪除', `${item.name || '未填姓名'}　${item.time || ''}　${typeBreakdown(item) || qtyOf(item) + '人'}`, 'booking')
        spokenDeletePhrases.push(bookingSpokenText(item, '訂位取消'))
      }
    }
    for (const [id, item] of knownLunches) {
      if (!newLunchIds.has(id)) {
        gotDeleted = true
        pushNotification('🗑️', '便當訂單已刪除', `${item.name || '未填姓名'}　${item.time || ''}　${typeBreakdown(item) || qtyOf(item) + '個'}`, 'lunch')
        spokenDeletePhrases.push(lunchSpokenText(item, '便當訂單取消'))
      }
    }
    for (const [id, item] of knownSoybeans) {
      if (!newSoybeanIds.has(id)) {
        gotDeleted = true
        const parts = []
        const soyText = soymilkBreakdownText(item)
        if (soyText) parts.push(`豆漿 ${soyText}`)
        if (item.tofuQty) parts.push(`豆腐${item.tofuQty}`)
        pushNotification('🗑️', '豆製品訂購已刪除', `${item.name || '未填姓名'}　${parts.join('・')}`, 'soybean')
        spokenDeletePhrases.push(soybeanSpokenText(item, '豆製品訂購取消'))
      }
    }

    syncKnownItems(data)

    const gotPositive = gotCreated || gotCheckedIn || gotModified
    if (gotPositive || gotDeleted) {
      if (soundEnabled.value) {
        if (gotPositive) playCreateSound()
        if (gotDeleted) setTimeout(playDeleteSound, gotPositive ? 520 : 0)
        const allPhrases = [...spokenPhrases, ...spokenModifiedPhrases, ...spokenDeletePhrases]
        if (allPhrases.length) {
          // 等提示音都播完再開始念，語音本身會自動排隊依序念完，不用逐句手動間隔
          const chimeDuration = gotDeleted && gotPositive ? 1050 : 650
          setTimeout(() => allPhrases.forEach(speakText), chimeDuration)
        }
      }
      if (viewMode.value === 'day') daySummary.value = data
      if (weekSummary.value) fetchWeek()
    }
  } catch (e) {
    console.error(e)
  }
}

function connectStream() {
  if (typeof EventSource === 'undefined') return
  // 直接連後端原始網址（commonStore.data.just_url），刻意避開 main_url 的 /api 反向代理：
  // 這條 proxy 在 Netlify 上是跑在 serverless function 裡，函式執行有逾時限制，撐不住
  // 「大部分時間閒置、只在有新訂單時才推播」的長連線，本地開發沒有這層代理限制才會正常。
  // 這條 stream 只推播 "category:action" 這種通用事件、不含任何個資，不需要帶 cookie，
  // 所以直接跨網域連過去即可，後端只要開放 CORS（不需要 withCredentials）。
  eventSource = new EventSource(`${commonStore.data.just_url}/holy/home/stream`)
  eventSource.addEventListener('order', () => {
    syncNewOrders()
  })
  // 連線出錯時瀏覽器會自動重連，這裡只需記錄，不用手動處理
  eventSource.onerror = () => {
  }
}

function disconnectStream() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
}

// ── 內場語音廣播（WebRTC，接近即時）─────────────────────────────────────
// 這台主機（收話端）常駐連著信令 WebSocket；手機按下開始廣播時會連過來，兩邊
// 透過這條 WebSocket 交換 WebRTC 的 offer/answer/ICE，談好之後音訊直接走瀏覽器
// 內建的點對點連線播放，不再經過伺服器中繼、也不用切段錄音上傳，延遲降到接近
// 即時（只受 WebRTC 本身的網路延遲影響）。
//
// 跟訂單通知走不同的連線（/holy/broadcast/ws），原因跟上面的訂單 SSE 一樣：
// 要避開 main_url 的 /api 反向代理（對長連線不友善），所以直接連 just_url。
const broadcastWsUrl = () => commonStore.data.just_url.replace(/^http/, 'ws') + '/holy/broadcast/ws'

// STUN 只能幫忙在一般家用 NAT 底下探出對外位址讓兩邊直連；這台電腦在公司網路，
// 防火牆/企業級 NAT 常常擋掉這種 P2P 直連，這時就需要 TURN 當中繼備援。
// udp 版本走 3478（優先，延遲較低）；tcp 版本是備援，公司網路如果連 UDP 都整個擋掉，
// 至少還能靠 TCP 3478 打通（比較慢一點，但至少有聲音）。
//
// 實測發現公司網路連 DNS 解析都會失敗（連 Google 的 stun.l.google.com 都解析不出來，
// 研判是網域白名單機制擋掉了不在清單上的網域），所以 TURN_HOST 這個網域名稱那組很可能
// 在公司網路完全用不上；因此額外加了 TURN_IP 直接用 IP 位址連，跳過 DNS 這一步。
// 兩組都放進 ICE_SERVERS，瀏覽器會自動挑能用的那個：DNS 政策哪天鬆綁了，網域那組會自動
// 生效（而且會跟著 DDNS 自動更新，不用管）；DNS 還是被擋的話，就靠 IP 那組頂著。
//
// ⚠️ TURN_IP 是目前的公網 IP，因為是動態 IP，哪天 ISP 換了 IP 給你，這裡要跟著手動更新
// （跟 turnserver.conf 的 external-ip 要保持一致），不然 IP 這組也會失效。
const TURN_HOST = 'madustrialtd.asuscomm.com'
const TURN_IP = '61.227.78.231'
const TURN_USERNAME = 'holyfarm'
const TURN_CREDENTIAL = 'changeme123'
const ICE_SERVERS = [
  {urls: 'stun:stun.l.google.com:19302'},
  {urls: `turn:${TURN_HOST}:3478`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
  {urls: `turn:${TURN_HOST}:3478?transport=tcp`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
  {urls: `turn:${TURN_IP}:3478`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
  {urls: `turn:${TURN_IP}:3478?transport=tcp`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
  // TURN over TLS，走 443：有些嚴格防火牆（DPI）就算放行 443 的 TCP 連線，
  // 也會擋掉裡面不是合法 TLS 封包的內容（例如裸的 TURN 協定），偽裝成走 443 但
  // 沒包 TLS 還是可能連不上。turns: 是真的 TLS 握手，看起來就是一般 HTTPS 流量，
  // 用這個當最後一層備援。網域跟 IP 都放，邏輯跟上面幾組一樣。
  {urls: `turns:${TURN_HOST}:443?transport=tcp`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
  {urls: `turns:${TURN_IP}:443?transport=tcp`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
]

const broadcastPlaying = ref(false)
const broadcastFrom = ref('')
// 有連線、橫幅也出現，但瀏覽器自動播放限制擋下了 audioEl.play()，導致完全沒聲音的情況——
// 這種通常發生在這台電腦的分頁本身很久沒人點過（例如放著沒人操作的常駐螢幕），瀏覽器就不
// 允許在沒有「使用者手勢」的情況下自動出聲。擋下時会把這個設 true，畫面上會跳出可以點的
// 提示，讓現場自己點一下就能解除，不用等重新整理頁面或叫人來處理。
const broadcastAudioBlocked = ref(false)
// 目前收到的廣播音訊音量（0～1，粗略值），給畫面顯示小音量計用，證明資料確實有傳過來
const broadcastAudioLevel = ref(0)

// 訊令 WebSocket 連線狀態，純粹給畫面顯示＋ console 除錯用，不影響功能本身。
// 主要是為了分辨「完全沒反應」到底是卡在哪一步：
// - 一直停在 connecting/retrying：代表這台電腦（可能受公司網路/防火牆限制）連不到
//   /holy/broadcast/ws 這個 WebSocket，要往網路設定或後端反向代理去查
// - 顯示 connected，但手機廣播時還是沒有畫面反應：代表訊令本身有連上，問題出在後端
//   沒有把 offer 轉發過來、或是手機端（broadcast.vue）根本沒送出 offer，要往那邊查
const broadcastWsStatus = ref('idle') // idle | connecting | connected | retrying | error
const broadcastReconnectCount = ref(0)

let broadcastWs = null
let broadcastReconnectTimer = null
// callerId（手機那端的信令連線 id）-> {pc, audioEl, label}
const broadcastPeers = new Map()

function updateBroadcastBanner() {
  const active = broadcastPeers.values().next().value
  broadcastPlaying.value = broadcastPeers.size > 0
  broadcastFrom.value = active ? active.label : ''
  if (broadcastPeers.size === 0) {
    broadcastAudioBlocked.value = false
    broadcastAudioLevel.value = 0
  }
}

function sendBroadcastSignal(payload) {
  if (broadcastWs && broadcastWs.readyState === WebSocket.OPEN) {
    broadcastWs.send(JSON.stringify(payload))
  }
}

function closeBroadcastPeer(callerId) {
  const entry = broadcastPeers.get(callerId)
  if (!entry) return
  try {
    entry.pc.close()
  } catch (e) { /* 忽略 */
  }
  if (entry.stopLevelMeter) entry.stopLevelMeter()
  if (entry.audioEl) {
    entry.audioEl.pause()
    entry.audioEl.srcObject = null
  }
  broadcastPeers.delete(callerId)
  updateBroadcastBanner()
}

// 這個一定要在真正的使用者點擊事件裡「直接」呼叫 play()，才算數（瀏覽器認的是呼叫當下
// 在不在使用者手勢的呼叫堆疊裡，不是元素本身建立的時間點），所以不能包在其他非同步流程後面。
function retryBroadcastAudio() {
  for (const entry of broadcastPeers.values()) {
    entry.audioEl.play().then(() => {
      broadcastAudioBlocked.value = false
    }).catch((err) => {
      console.error('[broadcast] 手動重試播放仍失敗', err.name, err.message)
    })
  }
}

async function handleBroadcastOffer(msg) {
  closeBroadcastPeer(msg.from) // 同一支手機重新發 offer（例如重連）時，先收掉舊的連線

  const pc = new RTCPeerConnection({iceServers: ICE_SERVERS})
  const audioEl = new Audio()
  audioEl.autoplay = true
  broadcastPeers.set(msg.from, {pc, audioEl, label: msg.label || ''})
  updateBroadcastBanner()

  pc.ontrack = (e) => {
    audioEl.srcObject = e.streams[0]
    const tracks = e.streams[0].getAudioTracks()
    console.log('[broadcast] 收到音訊軌', tracks.map(t => ({
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState
    })))
    const entry = broadcastPeers.get(msg.from)
    if (entry) entry.stopLevelMeter = startLevelMeter(e.streams[0], broadcastAudioLevel)
    audioEl.play().then(() => {
      broadcastAudioBlocked.value = false
    }).catch((err) => {
      // 最常見是 NotAllowedError：瀏覽器自動播放限制擋下，橫幅仍會顯示廣播中但完全沒聲音，
      // 之前這裡是靜默吞掉完全看不出來——現在會 log 出來，並在畫面跳出可點的提示解除。
      console.error('[broadcast] audioEl.play() 被擋下', err.name, err.message)
      if (err.name === 'NotAllowedError') broadcastAudioBlocked.value = true
    })
  }
  pc.onicecandidate = (e) => {
    if (e.candidate) sendBroadcastSignal({type: 'ice', to: msg.from, candidate: e.candidate})
  }
  pc.oniceconnectionstatechange = () => {
    console.log('[broadcast] ICE 連線狀態', pc.iceConnectionState)
  }
  pc.onconnectionstatechange = () => {
    console.log('[broadcast] 整體連線狀態', pc.connectionState)
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) closeBroadcastPeer(msg.from)
  }

  try {
    await pc.setRemoteDescription(msg.sdp)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    sendBroadcastSignal({type: 'answer', to: msg.from, sdp: pc.localDescription})
  } catch (e) {
    console.error(e)
    closeBroadcastPeer(msg.from)
  }
}

async function handleBroadcastSignal(msg) {
  console.log('[broadcast] 收到訊令訊息', msg.type, msg.from || '')
  if (msg.type === 'offer') {
    handleBroadcastOffer(msg)
  } else if (msg.type === 'ice') {
    const entry = broadcastPeers.get(msg.from)
    if (entry && msg.candidate) {
      try {
        await entry.pc.addIceCandidate(msg.candidate)
      } catch (e) { /* 忽略偶爾晚到或重複的 candidate */
      }
    }
  } else if (msg.type === 'bye') {
    closeBroadcastPeer(msg.from)
  }
}

function scheduleBroadcastReconnect() {
  if (broadcastReconnectTimer) return
  broadcastReconnectTimer = setTimeout(() => {
    broadcastReconnectTimer = null
    connectBroadcastSignaling()
  }, 3000)
}

function connectBroadcastSignaling() {
  if (typeof WebSocket === 'undefined') return
  broadcastWsStatus.value = broadcastReconnectCount.value > 0 ? 'retrying' : 'connecting'
  const url = broadcastWsUrl()
  console.log('[broadcast] 嘗試連線訊令 WebSocket', url, '第', broadcastReconnectCount.value, '次重試')
  try {
    broadcastWs = new WebSocket(url)
  } catch (e) {
    console.error('[broadcast] 建立 WebSocket 失敗', e)
    broadcastWsStatus.value = 'error'
    broadcastReconnectCount.value++
    scheduleBroadcastReconnect()
    return
  }
  broadcastWs.onopen = () => {
    console.log('[broadcast] 訊令 WebSocket 已連線')
    broadcastWsStatus.value = 'connected'
    broadcastReconnectCount.value = 0
    sendBroadcastSignal({type: 'hello', role: 'receiver'})
  }
  broadcastWs.onmessage = (e) => {
    try {
      handleBroadcastSignal(JSON.parse(e.data))
    } catch (err) { /* 忽略格式異常的訊息 */
    }
  }
  broadcastWs.onclose = (e) => {
    console.log('[broadcast] 訊令 WebSocket 已斷線，3 秒後重試', 'code=', e.code, 'reason=', e.reason)
    broadcastWsStatus.value = 'retrying'
    // 這台主機是常駐收話端，斷線要自動重連，不然之後手機廣播都收不到
    for (const id of Array.from(broadcastPeers.keys())) closeBroadcastPeer(id)
    broadcastReconnectCount.value++
    scheduleBroadcastReconnect()
  }
  broadcastWs.onerror = (e) => {
    // 之前這裡是空的，連線失敗完全看不出來；補上 log 才有辦法判斷是不是被公司網路擋掉
    console.error('[broadcast] 訊令 WebSocket 發生錯誤', e)
    broadcastWsStatus.value = 'error'
  }
}

function disconnectBroadcastSignaling() {
  if (broadcastReconnectTimer) {
    clearTimeout(broadcastReconnectTimer)
    broadcastReconnectTimer = null
  }
  for (const id of Array.from(broadcastPeers.keys())) closeBroadcastPeer(id)
  if (broadcastWs) {
    broadcastWs.onclose = null // 卸載頁面時的正常關閉，不用觸發自動重連
    try {
      broadcastWs.close()
    } catch (e) { /* 忽略 */
    }
    broadcastWs = null
  }
  broadcastWsStatus.value = 'idle'
  broadcastReconnectCount.value = 0
}

// ── 定時輪詢備援（SSE 推播目前不穩，後端暫時不能動，先在前端加保險）───────
// 每隔固定秒數主動打一次 /today 跟本地已知清單比對，邏輯跟 SSE 收到事件時完全共用 syncNewOrders()，
// 有差異（新增／刪除／入位）才會跳通知＋語音，沒差異就悄悄結束，不會有重複或多餘的提示。
const POLL_INTERVAL_MS = 20000
let pollTimer = null

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (pollEnabled.value) syncNewOrders()
  }, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// ── 手動刷新按鈕（保底用，萬一 SSE 跟定時輪詢都剛好失敗，員工可以自己按一下）───
const refreshing = ref(false)

async function refreshNow() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await syncNewOrders() // 跟 SSE／輪詢共用同一套比對邏輯，有差異才會跳通知＋語音
    if (weekSummary.value) await fetchWeek()
  } finally {
    refreshing.value = false
  }
}

// ── 行事曆顏色 ────────────────────────────────────────────────────
const calTypeColor = {醫院: '#e0534a', 園區: '#3d6b52', 芳心: '#a06080', Google: '#2563eb'}
// 建築分類：優先用 building 欄位，舊資料 type 直接就是建築分類值時當備援
const calEventBuilding = ev => ev.source === 'google' ? '' : (ev.building || ev.type)
const calChipBg = ev => ev.source === 'google'
  ? '#dbeafe'
  : ({
    醫院: '#fee2e2',
    園區: '#dcfce7',
    芳心: '#fce7f3'
  }[calEventBuilding(ev)] || '#f0f0f0')
const calChipText = ev => ev.source === 'google' ? '#1d4ed8' : (calTypeColor[calEventBuilding(ev)] || '#555')
const calBarColor = ev => ev.source === 'google' ? '#2563eb' : (calTypeColor[calEventBuilding(ev)] || '#ccc')
const calBadgeLabel = ev => ev.source === 'google' ? 'Google' : (calEventBuilding(ev) || '院內')

async function fetchToday() {
  loading.value = true
  try {
    // 本週可能跨月（例如週一在上個月），系統行事曆 API 是按月查詢，兩個月不同就都抓；
    // 範圍也要涵蓋到明天（fetchRangeEnd），保底處理「今天是週日、明天跨到下週/下個月」的情況
    const startMonth = calWeekStart.slice(0, 7)
    const endMonth = fetchRangeEnd.slice(0, 7)
    const months = startMonth === endMonth ? [startMonth] : [startMonth, endMonth]

    const homePromise = fetch(`${HOME_BASE()}/today`, {credentials: 'include'})
    const calPromises = months.map(ym => fetch(`${CAL_BASE()}/list?yearMonth=${ym}`))
    // 包月訂位（recurring）是照月份存的，跟行事曆一樣可能跨月，兩個月都要抓
    const recurPromises = months.map(ym => fetch(`${RECUR_BASE()}/list/${ym}`, {credentials: 'include'}))

    let googlePromise = Promise.resolve(null)
    if (GOOGLE_CALENDAR_ID && !GOOGLE_CALENDAR_ID.includes('your-calendar')) {
      // 直接抓「本週＋明天」涵蓋的範圍，今日／明日／本週事件都落在裡面，一次抓夠三種檢視模式用
      const timeMin = encodeURIComponent(new Date(`${calWeekStart}T00:00:00`).toISOString())
      const timeMax = encodeURIComponent(new Date(`${fetchRangeEnd}T23:59:59`).toISOString())
      const gUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`
        + `?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`
      googlePromise = fetch(gUrl).catch(() => null)
    }

    const [homeRes, calResults, recurResults, gRes] = await Promise.all([
      homePromise,
      Promise.all(calPromises),
      Promise.all(recurPromises),
      googlePromise
    ])
    if (homeRes?.ok) daySummary.value = await homeRes.json()

    const recurRules = []
    for (const rRes of recurResults) {
      if (!rRes.ok) continue
      const monthRules = await rRes.json()
      recurRules.push(...monthRules)
    }
    recurringRules.value = recurRules

    const sysEvents = []
    for (const cRes of calResults) {
      if (!cRes.ok) continue
      const monthEvents = await cRes.json()
      // 首頁行事曆只顯示「園區」建築分類的活動；新資料是 type=院內 + building=園區，
      // 舊資料（尚未重新儲存）type 可能直接就是園區，兩種都判斷相容
      sysEvents.push(...monthEvents.filter(e => (e.building || e.type) === '園區'))
    }

    let gEvents = []
    if (gRes?.ok) {
      const gData = await gRes.json()
      gEvents = (gData.items || []).map((item) => {
        const isAllDay = !!item.start?.date
        const startRaw = isAllDay ? item.start.date : item.start?.dateTime
        const endRaw = isAllDay ? item.end?.date : item.end?.dateTime
        const date = startRaw ? startRaw.slice(0, 10) : ''
        let time = ''
        if (!isAllDay && startRaw) {
          const s = new Date(startRaw)
          const e = endRaw ? new Date(endRaw) : null
          const fmt = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          time = e ? `${fmt(s)}-${fmt(e)}` : fmt(s)
        }
        return {
          id: item.id, date, time, title: item.summary || '（無標題）',
          allDay: isAllDay,
          type: 'Google', source: 'google', googleLink: item.htmlLink || '', description: item.description || ''
        }
      })
    }
    allEvents.value = [...sysEvents, ...gEvents].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function fetchWeek() {
  loadingWeek.value = true
  try {
    const res = await fetch(`${HOME_BASE()}/week?date=${todayStr}`, {credentials: 'include'})
    if (res.ok) weekSummary.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    loadingWeek.value = false
  }
}

function switchView(mode) {
  if (viewMode.value === mode) return
  viewMode.value = mode
  if (mode === 'week' && !weekSummary.value) fetchWeek()
}

// ── 快速新增（訂位／便當，一律新增在「今天」）───────────────────────────
const quickModal = reactive({show: false, type: 'booking'}) // type: 'booking' | 'lunch'
const quickSaving = ref(false)
const qForm = reactive({
  name: '', time: '12:00',
  meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, status: '已確認', note: ''
})

const quickTitle = computed(() => (quickModal.type === 'lunch' ? '新增便當訂單' : '新增訂位'))

function openQuickAdd(type) {
  quickModal.type = type
  Object.assign(qForm, {
    name: '', time: '12:00',
    meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, status: '已確認', note: ''
  })
  quickModal.show = true
}

// 葷素數量 +／− 快速按鈕
function qInc(field) {
  qForm[field] = (Number(qForm[field]) || 0) + 1
}

function qDec(field) {
  qForm[field] = Math.max(0, (Number(qForm[field]) || 0) - 1)
}

// 姓名留空時依序帶入「未知人物A」「未知人物B」...，避免同一天多筆都叫「未知人物」而分不清
function suffixLetters(n) {
  let s = ''
  n++
  while (n > 0) {
    n--
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

function nextUnknownName(isLunch) {
  const items = (isLunch ? daySummary.value?.lunch?.items : daySummary.value?.booking?.items) ?? []
  const used = new Set(
    items
      .map(i => i.name || '')
      .filter(n => n.startsWith('未知人物'))
      .map(n => n.slice(4))
  )
  let i = 0
  while (used.has(suffixLetters(i))) i++
  return '未知人物' + suffixLetters(i)
}

async function saveQuickAdd() {
  if (quickSaving.value) return
  quickSaving.value = true
  try {
    const isLunch = quickModal.type === 'lunch'
    const base = isLunch ? LUNCH_BASE() : BOOKING_BASE()
    const payload = {
      ...qForm,
      name: qForm.name.trim() || nextUnknownName(isLunch), // 姓名留空時自動帶入「未知人物A」「未知人物B」...
      date: todayStr,
    }
    const res = await fetch(`${base}/save`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      alert('新增失敗，請稍後再試')
      return
    }
    const saved = await res.json()
    quickModal.show = false
    pushNotification(
      isLunch ? '🍱' : '🍽️',
      isLunch ? '便當訂單已新增' : '訂位已新增',
      `${saved.name || payload.name}　${saved.time || ''}　${typeBreakdown(saved) || qtyOf(saved) + (isLunch ? '個' : '人')}`,
      isLunch ? 'lunch' : 'booking'
    )
    // 重新抓今日（及本週，若已載入過）資料，並同步已知清單，
    // 避免輪詢／SSE 推播把這筆自己剛新增的訂單又當成「新訂單」重複跳出通知一次
    await fetchToday()
    syncKnownItems(daySummary.value)
    if (weekSummary.value) await fetchWeek()
  } catch (e) {
    console.error(e)
    alert('新增失敗，請稍後再試')
  } finally {
    quickSaving.value = false
  }
}

const UNLOCK_EVENTS = ['click', 'keydown', 'touchstart', 'pointerdown']

onMounted(() => {
  loadSoundPref()
  loadAlertVolumePref()
  loadPollPref()
  loadBroadcastReceivePref()
  UNLOCK_EVENTS.forEach(evt => window.addEventListener(evt, unlockAudio, {once: true}))
  fetchRoomBuildings() // 房務狀況要用到房型/棟別/金額，跟今日概況分開拉，互不影響彼此的載入中狀態
  fetchMealSessions() // 今日備菜跟今日概況、房務狀況都各自獨立拉，互不影響彼此的載入中狀態
  fetchToday().then(() => {
    syncKnownItems(daySummary.value)
    connectStream()
    startPolling()
  })
  if (broadcastReceiveEnabled.value) connectBroadcastSignaling()
})

onUnmounted(() => {
  disconnectStream()
  stopPolling()
  disconnectBroadcastSignaling()
  UNLOCK_EVENTS.forEach(evt => window.removeEventListener(evt, unlockAudio))
})
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors">
    <!-- ── 內場語音廣播中提示（頂部橫幅，播放期間顯示）── -->
    <Teleport to="body">
      <Transition name="notify">
        <div
          v-if="broadcastPlaying"
          class="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-green-800 text-white px-4 py-2.5 shadow-lg pointer-events-none"
          style="font-size:clamp(14px, calc(14px + 0.45vw), 19px)"
        >
          <span class="animate-pulse">🎙️</span>
          <span class="font-semibold">內場廣播中{{ broadcastFrom ? '　' + broadcastFrom : '' }}</span>
          <!-- 音量計：只要這條會跳，就代表聲音資料確實有傳過來，跟這台放不放得出聲音是兩回事 -->
          <span class="flex items-center gap-1.5 flex-shrink-0">
            <span class="w-16 h-2 bg-white/25 rounded-full overflow-hidden">
              <span
                class="block h-full bg-lime-300 rounded-full transition-[width] duration-75"
                :style="{width: Math.min(100, broadcastAudioLevel * 320) + '%'}"
              />
            </span>
            <span
              style="font-size:clamp(11px, calc(11px + 0.3vw), 13px)"
              class="opacity-90 whitespace-nowrap"
            >{{ broadcastAudioLevel > 0.02 ? '收到聲音中' : '尚未收到聲音資料' }}</span>
          </span>
        </div>
      </Transition>
    </Teleport>

    <!-- ── 廣播被瀏覽器自動播放限制擋下（有連線、有橫幅，但完全沒聲音）：跳出可點的提示自己解除 ── -->
    <Teleport to="body">
      <Transition name="notify">
        <button
          v-if="broadcastPlaying && broadcastAudioBlocked"
          type="button"
          class="fixed top-12 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-red-700 text-white px-4 py-2.5 shadow-lg w-full text-center animate-pulse"
          style="font-size:clamp(13px, calc(13px + 0.4vw), 17px)"
          @click="retryBroadcastAudio"
        >
          <span>🔇</span>
          <span class="font-semibold">廣播聲音被瀏覽器擋住了，點這裡播放</span>
        </button>
      </Transition>
    </Teleport>

    <!-- ── 新訂單通知（置中、放大）── -->
    <!-- 同樣用 Teleport 掛到 body，避免版型上層若有 transform 導致這個 fixed 疊層定位跑掉 -->
    <Teleport to="body">
      <div
        v-if="notifications.length"
        class="fixed inset-0 z-40 bg-black/20 pointer-events-none transition-opacity"
      />
      <div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-4 pointer-events-none">
        <TransitionGroup name="notify">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="pointer-events-auto w-full max-w-sm sm:max-w-md bg-surface border-2 border-green-600 shadow-2xl rounded-2xl px-5 py-4 flex items-center gap-4 cursor-pointer"
            @click="openNotification(n)"
          >
            <span
              class="flex-shrink-0"
              style="font-size:clamp(36px, calc(36px + 0.45vw), 50px)"
            >{{ n.icon }}</span>
            <div class="flex-1 min-w-0">
              <p
                class="font-bold text-base-c"
                style="font-size:clamp(16px, calc(16px + 0.45vw), 22px)"
              >{{ n.title }}</p>
              <p
                class="text-muted-c mt-0.5"
                style="font-size:clamp(14px, calc(14px + 0.45vw), 20px)"
              >{{ n.detail }}</p>
            </div>
            <button
              class="text-hint-c hover:text-muted-c flex-shrink-0 self-start"
              style="font-size:clamp(16px, calc(16px + 0.45vw), 22px)"
              @click.stop="dismissNotification(n.id)"
            >
              ✕
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>

    <div class="mx-auto px-3 sm:px-4 lg:px-8 xl:px-12 py-4 lg:py-8 xl:py-10">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 xl:gap-8 lg:items-start">
        <!-- ── 今日概況 ── -->
        <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden lg:col-span-2">
          <div
            class="flex items-center justify-between flex-wrap gap-x-2 gap-y-1.5 px-4 pt-3 pb-2 border-b border-light-c">
          <span
            class="font-semibold text-muted-c"
            style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
          >
            {{ viewMode === 'week' ? '本週概況' : '今日概況' }}
            <span
              v-if="viewMode === 'day'"
              class="font-normal text-hint-c"
              style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
            > ({{ todayLabel }})</span>
            <span
              v-if="viewMode === 'week' && weekRangeLabel"
              class="font-normal text-hint-c"
              style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
            > ({{ weekRangeLabel }})</span>
          </span>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                class="flex-shrink-0 rounded-full px-2 py-1 border border-light-c text-hint-c transition-colors disabled:opacity-50"
                style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                title="手動刷新最新訂單（保底用，正常情況下會自動更新）"
                :disabled="refreshing"
                @click="refreshNow"
              >
                <span :class="{ 'inline-block animate-spin': refreshing }">🔄</span>
              </button>
              <button
                class="flex-shrink-0 rounded-full px-2 py-1 border transition-colors"
                style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                :class="showSettings ? 'border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'border-light-c text-hint-c'"
                title="即時更新設定"
                @click="showSettings = !showSettings"
              >
                ⚙️
              </button>
              <div class="flex items-center gap-0.5 bg-surface2 rounded-full p-0.5">
                <button
                  class="rounded-full font-medium px-2.5 py-1 transition-colors"
                  style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                  :class="viewMode === 'day' ? 'bg-green-800 text-white shadow-sm' : 'text-hint-c'"
                  @click="switchView('day')"
                >
                  今日
                </button>
                <button
                  class="rounded-full font-medium px-2.5 py-1 transition-colors"
                  style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                  :class="viewMode === 'week' ? 'bg-green-800 text-white shadow-sm' : 'text-hint-c'"
                  @click="switchView('week')"
                >
                  本週
                </button>
              </div>
            </div>
          </div>

          <!-- ── 快速新增（放最上面方便操作）── -->
          <div class="flex items-center gap-2 px-4 py-2.5 border-b border-light-c bg-surface2/30">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1 rounded-xl font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 py-2 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              style="font-size:clamp(12px, calc(12px + 0.45vw), 15px)"
              @click="openQuickAdd('booking')"
            >
              <span class="leading-none">＋</span> 新增訂位
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1 rounded-xl font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 py-2 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
              style="font-size:clamp(12px, calc(12px + 0.45vw), 15px)"
              @click="openQuickAdd('lunch')"
            >
              <span class="leading-none">＋</span> 新增便當
            </button>
          </div>

          <!-- ── 設定區塊（可收縮）── -->
          <div
            class="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out border-b border-light-c"
            :class="showSettings ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] border-b-0'"
          >
            <div class="min-h-0 overflow-hidden">
              <div class="px-4 py-3 bg-surface2/40 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  class="text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                >
                  定時檢查（每 20 秒自動比對新訂單，SSE 即時推播不穩時的保底機制）
                </span>
                <button
                  class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
                  :class="pollEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'"
                  role="switch"
                  :aria-checked="pollEnabled"
                  :title="pollEnabled ? '點一下關閉定時檢查' : '點一下開啟定時檢查'"
                  @click="togglePoll"
                >
                  <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                    :class="pollEnabled ? 'translate-x-4' : 'translate-x-1'"
                  />
                </button>
                <span
                  class="text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                >
                  {{ pollEnabled ? '已開啟' : '已關閉（僅依賴 SSE 推播與手動刷新）' }}
                </span>
              </div>
              <div
                class="px-4 py-3 bg-surface2/40 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-light-c/60">
                <span
                  class="text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                >
                  提示音／語音播報（有新訂單、取消、入位時提醒）
                </span>
                <button
                  class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
                  :class="soundEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'"
                  role="switch"
                  :aria-checked="soundEnabled"
                  :title="soundEnabled ? '點一下測試提示音與語音播報' : '提示音已關閉，點一下開啟'"
                  @click="toggleSound"
                >
                  <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                    :class="soundEnabled ? 'translate-x-4' : 'translate-x-1'"
                  />
                </button>
                <span
                  class="text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                >
                  {{ soundEnabled ? '已開啟' : '已關閉（靜音中）' }}
                </span>
              </div>
              <div
                v-if="soundEnabled"
                class="px-4 py-3 bg-surface2/40 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-light-c/60"
              >
                <span
                  class="text-hint-c flex-shrink-0"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                  title="只調叮咚提示音效的大小，語音播報本身音量已經是瀏覽器允許的最大值，這個滑桿調不到語音上"
                >
                  叮咚提示音效音量
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  :value="alertVolume"
                  class="flex-1 min-w-[100px] accent-green-600"
                  @input="onAlertVolumeInput"
                  @change="playCreateSound"
                >
                <span
                  class="text-hint-c flex-shrink-0 tabular-nums"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                >
                  {{ Math.round(alertVolume * 100) }}%
                </span>
              </div>
              <div
                class="px-4 py-3 bg-surface2/40 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-light-c/60">
                <span
                  class="text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                >
                  接收內場語音廣播（手機端「內場語音廣播」按下開始廣播時，這台會自動出聲）
                </span>
                <button
                  class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
                  :class="broadcastReceiveEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'"
                  role="switch"
                  :aria-checked="broadcastReceiveEnabled"
                  :title="broadcastReceiveEnabled ? '點一下關閉，這台就不會再接收語音廣播' : '點一下開啟接收語音廣播'"
                  @click="toggleBroadcastReceive"
                >
                  <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                    :class="broadcastReceiveEnabled ? 'translate-x-4' : 'translate-x-1'"
                  />
                </button>
                <span
                  class="text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                >
                  {{ broadcastReceiveEnabled ? '已開啟' : '已關閉（不接收廣播）' }}
                </span>
              </div>
              <div
                v-if="broadcastReceiveEnabled"
                class="px-4 py-2 bg-surface2/40 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-light-c/60"
              >
                <span
                  class="text-hint-c"
                  style="font-size:clamp(10px, calc(10px + 0.35vw), 13px)"
                >
                  訊令連線狀態：
                  <span
                    class="font-semibold"
                    :class="{
                      'text-green-600': broadcastWsStatus === 'connected',
                      'text-amber-600': broadcastWsStatus === 'connecting' || broadcastWsStatus === 'retrying',
                      'text-red-600': broadcastWsStatus === 'error',
                    }"
                  >{{
                      {
                        idle: '未連線',
                        connecting: '連線中…',
                        connected: '已連接',
                        retrying: `中斷，重試中…（第 ${broadcastReconnectCount} 次）`,
                        error: '連線錯誤',
                      }[broadcastWsStatus]
                    }}</span>
                  <template v-if="broadcastWsStatus === 'connected'">
                    （已連上，若手機廣播時仍無反應，問題在後端轉發或手機端，不是這台連不上）
                  </template>
                  <template v-else-if="broadcastReconnectCount >= 2">
                    （一直連不上，可能是公司網路/防火牆擋掉這個 WebSocket，請回報開發者）
                  </template>
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="summaryLoading"
            class="px-4 py-6 text-center text-hint-c"
            style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
          >
            載入中...
          </div>
          <div
            v-else-if="bookings.length === 0 && bookingRecurGuests === 0 && lunchOrders.length === 0 && soybeanOrders.length === 0"
            class="px-4 py-6 text-center text-hint-c"
            style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
          >
            {{ viewMode === 'week' ? '本週尚無訂位或便當記錄' : '今天尚無訂位或便當記錄' }}
          </div>

          <!-- ── 今日模式：手機直向堆疊，sm 以上維持 3 欄格線 ── -->
          <div
            v-else-if="viewMode === 'day'"
            class="grid divide-y divide-base sm:divide-y-0 sm:divide-x"
            :class="soybeanCollapsed ? 'grid-cols-1 sm:grid-cols-[1fr_1fr_auto]' : 'grid-cols-1 sm:grid-cols-3'"
          >
            <!-- 訂位 -->
            <div class="px-4 py-3 xl:px-6 xl:py-5 text-left">
              <div class="flex items-center gap-1.5 mb-2">
                <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"/>
                <span
                  class="font-semibold text-hint-c uppercase tracking-wide"
                  :style="{fontSize: fs(10, 14, 0.45)}"
                >訂位</span>
              </div>
              <div
                v-if="bookings.length === 0 && bookingRecurGuests === 0"
                class="text-hint-c"
                :style="{fontSize: fs(12, 17, 0.45)}"
              >
                尚無記錄
              </div>
              <template v-else>
                <p
                  class="text-base-c"
                  :style="{fontSize: fs(13, 18, 0.45)}"
                >
                <span
                  class="font-black"
                  :style="{fontSize: fs(24, 34, 0.45)}"
                >{{ bookings.length }}</span> 筆
                  · <span class="font-semibold">{{ bookingTotal + bookingRecurGuests }}</span> 人
                  <span
                    v-if="bookingRecurGuests > 0"
                    class="font-normal text-hint-c"
                    :style="{fontSize: fs(10, 14, 0.45)}"
                  >（現場 {{ bookingTotal }}・包月 {{ bookingRecurGuests }}）</span>
                </p>
                <div
                  class="mt-1 space-y-0.5 text-green-600 dark:text-green-400"
                  :style="{fontSize: fs(11, 15, 0.45)}"
                >
                  <div v-if="bookingMeat + bookingRecurMeat > 0">
                    🍖 葷 {{ bookingMeat + bookingRecurMeat }}
                  </div>
                  <div v-if="bookingFullVeg + bookingRecurFullVeg > 0">
                    🌿 全素 {{ bookingFullVeg + bookingRecurFullVeg }}
                  </div>
                  <div v-if="bookingEggVeg + bookingRecurEggVeg > 0">
                    🥚 蛋奶素 {{ bookingEggVeg + bookingRecurEggVeg }}
                  </div>
                  <div v-if="bookingSpiceVeg + bookingRecurSpiceVeg > 0">
                    🧄 五辛素 {{ bookingSpiceVeg + bookingRecurSpiceVeg }}
                  </div>
                </div>
                <div
                  v-if="bookingRecurRules.length > 0"
                  class="mt-2 pt-2 border-t border-light-c/60 space-y-1"
                >
                  <div
                    v-for="rule in bookingRecurRules"
                    :key="rule.id"
                    class="flex items-center gap-1.5 flex-wrap"
                  >
                    <span
                      class="flex-shrink-0 rounded-full px-1.5 py-0.5 font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                      :style="{fontSize: fs(9, 13, 0.45)}"
                    >包月</span>
                    <span
                      class="font-medium text-base-c"
                      :style="{fontSize: fs(11, 15, 0.45)}"
                    >{{ rule.name }}</span>
                    <span
                      class="text-hint-c"
                      :style="{fontSize: fs(10, 14, 0.45)}"
                    >{{ typeBreakdown(rule) }}</span>
                  </div>
                </div>
                <div
                  class="mt-2 pt-2 border-t border-light-c/60 divide-y divide-base max-h-64 xl:max-h-[32rem] overflow-y-auto">
                  <div
                    v-for="item in bookings"
                    :key="item.id"
                    class="py-1.5 first:pt-0"
                  >
                    <div class="flex items-center gap-2 flex-wrap">
                    <span
                      v-if="item.time"
                      class="flex-shrink-0 font-mono text-hint-c"
                      :style="{fontSize: fs(10, 14, 0.45)}"
                    >{{ item.time }}</span>
                      <span
                        class="flex-1 min-w-0 truncate font-semibold text-base-c"
                        :style="{fontSize: fs(12, 17, 0.45)}"
                      >{{ item.name || '未填姓名' }}</span>
                      <span
                        v-if="itemGuestTotal(item) > 0"
                        class="flex-shrink-0 font-semibold text-green-700 dark:text-green-400"
                        :style="{fontSize: fs(11, 15, 0.45)}"
                      >{{ itemGuestTotal(item) }}人</span>
                      <span
                        class="flex-shrink-0 rounded-full px-1.5 py-0.5 font-medium"
                        :style="{fontSize: fs(9, 13, 0.45)}"
                        :class="detailStatusClass(item.status)"
                      >{{ item.status }}</span>
                    </div>
                    <div
                      class="text-hint-c mt-0.5"
                      :style="{fontSize: fs(11, 15, 0.45)}"
                    >
                      {{ typeBreakdown(item) || '尚未填寫葷素數量' }}
                    </div>
                    <div
                      v-if="item.note"
                      class="text-hint-c mt-0.5 whitespace-pre-wrap"
                      :style="{fontSize: fs(11, 15, 0.45)}"
                    >
                      📝 {{ item.note }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <!-- 便當 -->
            <div class="px-4 py-3 xl:px-6 xl:py-5 text-left">
              <div class="flex items-center gap-1.5 mb-2">
                <span class="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"/>
                <span
                  class="font-semibold text-hint-c uppercase tracking-wide"
                  :style="{fontSize: fs(10, 14, 0.45)}"
                >便當</span>
              </div>
              <div
                v-if="lunchOrders.length === 0"
                class="text-hint-c"
                :style="{fontSize: fs(12, 17, 0.45)}"
              >
                尚無記錄
              </div>
              <template v-else>
                <p
                  class="text-base-c"
                  :style="{fontSize: fs(13, 18, 0.45)}"
                >
                <span
                  class="font-black"
                  :style="{fontSize: fs(24, 34, 0.45)}"
                >{{ lunchTotal }}</span> 個
                </p>
                <div
                  class="mt-1 space-y-0.5 text-orange-600 dark:text-orange-400"
                  :style="{fontSize: fs(11, 15, 0.45)}"
                >
                  <div v-if="lunchMeat > 0">
                    🍖 葷 {{ lunchMeat }}
                  </div>
                  <div v-if="lunchFullVeg > 0">
                    🌿 全素 {{ lunchFullVeg }}
                  </div>
                  <div v-if="lunchEggVeg > 0">
                    🥚 蛋奶素 {{ lunchEggVeg }}
                  </div>
                  <div v-if="lunchSpiceVeg > 0">
                    🧄 五辛素 {{ lunchSpiceVeg }}
                  </div>
                </div>
                <div
                  class="mt-2 pt-2 border-t border-light-c/60 divide-y divide-base max-h-64 xl:max-h-[32rem] overflow-y-auto">
                  <div
                    v-for="item in lunchOrders"
                    :key="item.id"
                    class="py-1.5 first:pt-0"
                  >
                    <div class="flex items-center gap-2 flex-wrap">
                    <span
                      v-if="item.time"
                      class="flex-shrink-0 font-mono text-hint-c"
                      :style="{fontSize: fs(10, 14, 0.45)}"
                    >{{ item.time }}</span>
                      <span
                        class="flex-1 min-w-0 truncate font-semibold text-base-c"
                        :style="{fontSize: fs(12, 17, 0.45)}"
                      >{{ item.name || '未填姓名' }}</span>
                      <span
                        class="flex-shrink-0 rounded-full px-1.5 py-0.5 font-medium"
                        :style="{fontSize: fs(9, 13, 0.45)}"
                        :class="detailStatusClass(item.status)"
                      >{{ item.status }}</span>
                    </div>
                    <div
                      class="text-hint-c mt-0.5"
                      :style="{fontSize: fs(11, 15, 0.45)}"
                    >
                      {{ typeBreakdown(item) || '尚未填寫葷素數量' }}
                    </div>
                    <div
                      v-if="item.note"
                      class="text-hint-c mt-0.5 whitespace-pre-wrap"
                      :style="{fontSize: fs(11, 15, 0.45)}"
                    >
                      📝 {{ item.note }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <!-- 豆製品（可收合，收合後訂位／便當文字放大一號；narrow-strip 收合樣式只在 sm 以上並排時才需要） -->
            <div
              class="text-left"
              :class="soybeanCollapsed ? 'px-4 py-3 sm:px-1.5 xl:px-2 xl:py-5' : 'px-4 py-3 xl:px-6 xl:py-5'"
            >
              <button
                type="button"
                class="flex items-center gap-1.5 w-full flex-wrap"
                :class="soybeanCollapsed ? 'sm:flex-col' : 'mb-2'"
                @click="soybeanCollapsed = !soybeanCollapsed"
              >
                <span class="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"/>
                <span
                  class="font-semibold text-hint-c uppercase tracking-wide"
                  :style="{fontSize: soybeanCollapsed ? '11px' : 'clamp(10px, calc(10px + 0.45vw), 14px)'}"
                >豆製品</span>
                <span
                  v-if="soybeanPickupDate && !soybeanIsToday && !soybeanCollapsed"
                  class="font-normal text-hint-c"
                  style="font-size:clamp(9px, calc(9px + 0.45vw), 13px)"
                >（{{ fmtMDWeekday(soybeanPickupDate) }} 出貨）</span>
                <span
                  v-if="soybeanOrders.length > 0"
                  class="font-semibold text-amber-600 dark:text-amber-400"
                  :class="soybeanCollapsed ? 'ml-auto sm:ml-0' : 'ml-auto'"
                  style="font-size:11px"
                >{{ soybeanOrders.length }}</span>
                <span class="text-hint-c flex-shrink-0" style="font-size:11px">{{ soybeanCollapsed ? '▶' : '▼' }}</span>
              </button>
              <div
                v-if="!soybeanCollapsed && soybeanOrders.length === 0"
                class="text-hint-c"
                style="font-size:clamp(12px, calc(12px + 0.45vw), 17px)"
              >
                尚無記錄
              </div>
              <template v-if="!soybeanCollapsed && soybeanOrders.length > 0">
                <p
                  class="text-base-c"
                  style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
                >
                <span
                  class="font-black"
                  style="font-size:clamp(24px, calc(24px + 0.45vw), 34px)"
                >{{ soybeanOrders.length }}</span> 筆
                </p>
                <div
                  class="mt-1 space-y-0.5 text-amber-600 dark:text-amber-400"
                  style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                >
                  <div v-if="soybeanSoymilk > 0">
                    🥛 豆漿 {{ soybeanSoymilk }} 袋（共 {{ formatVolume(soybeanSoymilkTotalMl) }}）
                  </div>
                  <div v-if="soybeanTofu > 0">
                    🟨 豆腐 {{ soybeanTofu }} 塊
                  </div>
                </div>
                <div
                  class="mt-2 pt-2 border-t border-light-c/60 divide-y divide-base max-h-64 xl:max-h-[32rem] overflow-y-auto">
                  <div
                    v-for="item in soybeanOrders"
                    :key="item.id"
                    class="py-1.5 first:pt-0"
                  >
                    <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="flex-1 min-w-0 truncate font-semibold text-base-c"
                      style="font-size:clamp(12px, calc(12px + 0.45vw), 17px)"
                    >{{ item.name || '未填姓名' }}</span>
                      <span
                        class="flex-shrink-0 rounded-full px-1.5 py-0.5 font-medium"
                        style="font-size:clamp(9px, calc(9px + 0.45vw), 13px)"
                        :class="detailStatusClass(item.status)"
                      >{{ item.status }}</span>
                    </div>
                    <div
                      class="text-hint-c mt-0.5"
                      style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                    >
                      <template v-if="soymilkBreakdownText(item)">🥛 豆漿 {{ soymilkBreakdownText(item) }}</template>
                      <template v-if="item.tofuQty"> 🟨 豆腐 {{ item.tofuQty }}</template>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- ── 本週模式：每天各自獨立顯示當天狀況，依序排下去，不做整週加總 ── -->
          <div
            v-else
            class="divide-y divide-base"
          >
            <div
              v-for="day in weekDayCards"
              :key="day.date"
            >
              <div
                class="px-4 py-2 bg-surface2/50 font-semibold text-hint-c"
                style="font-size:clamp(12px, calc(12px + 0.45vw), 16px)"
              >
                {{ fmtMDWeekday(day.date) }}
              </div>
              <div
                class="grid divide-y divide-base sm:divide-y-0 sm:divide-x"
                :class="soybeanCollapsed ? 'grid-cols-1 sm:grid-cols-[1fr_1fr_auto]' : 'grid-cols-1 sm:grid-cols-3'"
              >
                <!-- 訂位 -->
                <div class="px-4 py-2.5 xl:px-6 xl:py-3 text-left">
                  <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span class="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"/>
                    <span
                      class="font-semibold text-hint-c uppercase tracking-wide"
                      :style="{fontSize: fs(10, 13, 0.4)}"
                    >訂位</span>
                    <span
                      v-if="day.booking.items.length || day.booking.recurGuests > 0"
                      class="text-hint-c"
                      :style="{fontSize: fs(10, 13, 0.4)}"
                    >· {{ day.booking.items.length }}筆・{{ day.booking.total }}人<template
                      v-if="day.booking.recurGuests > 0">（現場{{
                        day.booking.onsiteTotal
                      }}・包月{{ day.booking.recurGuests }}）</template></span>
                  </div>
                  <div
                    v-if="day.booking.items.length === 0 && day.booking.recurGuests === 0"
                    class="text-hint-c"
                    :style="{fontSize: fs(11, 14, 0.4)}"
                  >
                    無
                  </div>
                  <div
                    v-else
                    class="space-y-1.5"
                  >
                    <div
                      v-for="rule in day.booking.recurRules"
                      :key="'recur-' + rule.id"
                    >
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span
                          class="flex-shrink-0 rounded-full px-1.5 py-0.5 font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          :style="{fontSize: fs(9, 12, 0.4)}"
                        >包月</span>
                        <span
                          class="flex-1 min-w-0 truncate font-medium text-base-c"
                          :style="{fontSize: fs(11, 14, 0.4)}"
                        >{{ rule.name }}</span>
                      </div>
                      <div
                        class="text-hint-c"
                        :style="{fontSize: fs(10, 13, 0.4)}"
                      >
                        {{ typeBreakdown(rule) }}
                      </div>
                    </div>
                    <div
                      v-for="item in day.booking.items"
                      :key="item.id"
                    >
                      <div class="flex items-center gap-2 flex-wrap">
                      <span
                        v-if="item.time"
                        class="flex-shrink-0 font-mono text-hint-c"
                        :style="{fontSize: fs(10, 13, 0.4)}"
                      >{{ item.time }}</span>
                        <span
                          class="flex-1 min-w-0 truncate font-medium text-base-c"
                          :style="{fontSize: fs(11, 14, 0.4)}"
                        >{{ item.name || '未填姓名' }}</span>
                        <span
                          v-if="itemGuestTotal(item) > 0"
                          class="flex-shrink-0 font-semibold text-green-700 dark:text-green-400"
                          :style="{fontSize: fs(10, 13, 0.4)}"
                        >{{ itemGuestTotal(item) }}人</span>
                        <span
                          class="flex-shrink-0 rounded-full px-1.5 py-0.5 font-medium"
                          :style="{fontSize: fs(9, 12, 0.4)}"
                          :class="detailStatusClass(item.status)"
                        >{{ item.status }}</span>
                      </div>
                      <div
                        class="text-hint-c"
                        :style="{fontSize: fs(10, 13, 0.4)}"
                      >
                        {{ typeBreakdown(item) || '尚未填寫葷素數量' }}
                      </div>
                      <div
                        v-if="item.note"
                        class="text-hint-c whitespace-pre-wrap"
                        :style="{fontSize: fs(10, 13, 0.4)}"
                      >
                        📝 {{ item.note }}
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 便當 -->
                <div class="px-4 py-2.5 xl:px-6 xl:py-3 text-left">
                  <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span class="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"/>
                    <span
                      class="font-semibold text-hint-c uppercase tracking-wide"
                      :style="{fontSize: fs(10, 13, 0.4)}"
                    >便當</span>
                    <span
                      v-if="day.lunch.items.length"
                      class="text-hint-c"
                      :style="{fontSize: fs(10, 13, 0.4)}"
                    >· {{ day.lunch.total }}個</span>
                  </div>
                  <div
                    v-if="day.lunch.items.length === 0"
                    class="text-hint-c"
                    :style="{fontSize: fs(11, 14, 0.4)}"
                  >
                    無
                  </div>
                  <div
                    v-else
                    class="space-y-1.5"
                  >
                    <div
                      v-for="item in day.lunch.items"
                      :key="item.id"
                    >
                      <div class="flex items-center gap-2 flex-wrap">
                      <span
                        v-if="item.time"
                        class="flex-shrink-0 font-mono text-hint-c"
                        :style="{fontSize: fs(10, 13, 0.4)}"
                      >{{ item.time }}</span>
                        <span
                          class="flex-1 min-w-0 truncate font-medium text-base-c"
                          :style="{fontSize: fs(11, 14, 0.4)}"
                        >{{ item.name || '未填姓名' }}</span>
                        <span
                          class="flex-shrink-0 rounded-full px-1.5 py-0.5 font-medium"
                          :style="{fontSize: fs(9, 12, 0.4)}"
                          :class="detailStatusClass(item.status)"
                        >{{ item.status }}</span>
                      </div>
                      <div
                        class="text-hint-c"
                        :style="{fontSize: fs(10, 13, 0.4)}"
                      >
                        {{ typeBreakdown(item) || '尚未填寫葷素數量' }}
                      </div>
                      <div
                        v-if="item.note"
                        class="text-hint-c whitespace-pre-wrap"
                        :style="{fontSize: fs(10, 13, 0.4)}"
                      >
                        📝 {{ item.note }}
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 豆製品（可收合，與上方今日概況共用同一個收合狀態） -->
                <div
                  class="text-left"
                  :class="soybeanCollapsed ? 'px-4 py-2.5 sm:px-1.5 xl:px-2 xl:py-3' : 'px-4 py-2.5 xl:px-6 xl:py-3'"
                >
                  <button
                    type="button"
                    class="flex items-center gap-1.5 w-full flex-wrap"
                    :class="soybeanCollapsed ? 'sm:flex-col' : 'mb-1.5'"
                    @click="soybeanCollapsed = !soybeanCollapsed"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"/>
                    <span
                      class="font-semibold text-hint-c uppercase tracking-wide"
                      :style="{fontSize: soybeanCollapsed ? '10px' : 'clamp(10px, calc(10px + 0.4vw), 13px)'}"
                    >豆製品</span>
                    <span
                      v-if="day.soybean.items.length && !soybeanCollapsed"
                      class="text-hint-c"
                      style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                    >· {{ day.soybean.items.length }}筆</span>
                    <span
                      v-if="day.soybean.items.length && soybeanCollapsed"
                      class="font-semibold text-amber-600 dark:text-amber-400"
                      style="font-size:10px"
                    >{{ day.soybean.items.length }}</span>
                    <span class="text-hint-c flex-shrink-0" style="font-size:10px">{{
                        soybeanCollapsed ? '▶' : '▼'
                      }}</span>
                  </button>
                  <div
                    v-if="!soybeanCollapsed && day.soybean.items.length === 0"
                    class="text-hint-c"
                    style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                  >
                    無
                  </div>
                  <div
                    v-if="!soybeanCollapsed && day.soybean.items.length > 0"
                    class="space-y-1.5"
                  >
                    <div
                      v-for="item in day.soybean.items"
                      :key="item.id"
                    >
                      <div class="flex items-center gap-2 flex-wrap">
                      <span
                        class="flex-1 min-w-0 truncate font-medium text-base-c"
                        style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                      >{{ item.name || '未填姓名' }}</span>
                        <span
                          class="flex-shrink-0 rounded-full px-1.5 py-0.5 font-medium"
                          style="font-size:clamp(9px, calc(9px + 0.4vw), 12px)"
                          :class="detailStatusClass(item.status)"
                        >{{ item.status }}</span>
                      </div>
                      <div
                        class="text-hint-c"
                        style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                      >
                        <template v-if="soymilkBreakdownText(item)">🥛 豆漿 {{ soymilkBreakdownText(item) }}</template>
                        <template v-if="item.tofuQty"> 🟨 豆腐 {{ item.tofuQty }}</template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── 房務狀況：跟「訂房管理／訂單管理」同一種列表呈現方式，把編輯/刪除/房務打勾等操作都拿掉，
               純顯示訂單資訊；不分today退房/入住兩張表，合併成一份清單。同一間房若當天「舊客退房、
               新客入住」不論是個人訂單還是團體展開後的成員列，都只留入住那筆，退房那筆不重複顯示，
               也不用「入住/退房」小標籤；個人訂單棟別直接併入房間欄位一起顯示，不用另外插一行棟別
               小標題，團體訂單維持原本的棟別小標題列 ── -->
          <div v-if="housekeeping" class="border-t border-light-c px-4 py-3">
            <div class="flex items-center justify-between flex-wrap gap-1.5 mb-2.5">
              <span
                class="font-semibold text-muted-c"
                style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
              >
                🧹 房務狀況
                <span
                  class="font-normal text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                > (今天起 30 天內)</span>
              </span>
              <span
                v-if="hkPendingCount > 0"
                class="flex-shrink-0 rounded-full px-2 py-0.5 font-semibold bg-rose-100 text-rose-700"
                style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
              >今天待整理 {{ hkPendingCount }} 間</span>
              <span
                v-else-if="hkCheckouts.length > 0"
                class="flex-shrink-0 rounded-full px-2 py-0.5 font-semibold bg-emerald-100 text-emerald-700"
                style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
              >今天退房房間已整理完成</span>
              <div v-if="hkAllGroupIds.length > 0" class="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  class="rounded-full px-2 py-0.5 font-medium border border-light-c text-hint-c hover:bg-surface2 transition-colors"
                  style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                  @click="expandAllHkGroups"
                >全部展開
                </button>
                <button
                  type="button"
                  class="rounded-full px-2 py-0.5 font-medium border border-light-c text-hint-c hover:bg-surface2 transition-colors"
                  style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                  @click="collapseAllHkGroups"
                >全部收合
                </button>
              </div>
            </div>

            <div
              v-if="hkRows.length === 0"
              class="text-hint-c"
              style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
            >未來 30 天內沒有退房或入住
            </div>

            <div v-else class="overflow-x-auto -mx-1">
              <table class="w-full border-collapse" style="min-width:560px">
                <thead>
                <tr class="text-hint-c text-left text-sm">
                  <th class="py-1 px-1 font-semibold">房客</th>
                  <th class="py-1 px-1 font-semibold">房間</th>
                  <th class="py-1 px-1 font-semibold">入住</th>
                  <th class="py-1 px-1 font-semibold">退房</th>
                  <th class="py-1 px-1 font-semibold">人數</th>
                </tr>
                </thead>
                <tbody>
                <template v-for="row in hkRows"
                          :key="row.rowKind === 'groupHeader' ? ('grp_' + row.groupId) : (row.item.kind + '_' + row.item.id)">
                  <tr v-if="row.rowKind === 'groupHeader'" class="border-t border-light-c group-header-row">
                    <td class="py-1.5 px-1" colspan="5">
                      <button class="flex items-center gap-2 flex-wrap text-left" @click="toggleHkGroup(row.groupKey)">
                        <span class="text-hint-c inline-block w-3 text-sm">{{ row.expanded ? '▼' : '▶' }}</span>
                        <span
                          class="rounded-full px-2 py-0.5 font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-sm"
                        >{{ row.groupName || '團體' }}</span>
                        <b class="text-base-c text-base">共 {{ row.members.length }} 間房</b>
                        <span class="text-hint-c text-sm">{{ hkGroupDateRangeLabel(row.members) }}</span>
                        <span class="text-hint-c text-sm">{{ hkGroupStatusSummary(row.members) }}</span>
                      </button>
                    </td>
                  </tr>
                  <template v-else>
                    <tr v-if="row.item.showBuildingHeader" class="border-t border-light-c"
                        :class="row.item.groupId ? 'group-member-row group-building-row' : ''">
                      <td class="py-1 px-1 text-hint-c font-semibold text-sm" colspan="5">🏠 {{
                          row.item.buildingName
                        }}
                      </td>
                    </tr>
                    <tr class="border-t border-light-c text-base" :class="row.item.groupId ? 'group-member-row' : ''">
                      <td class="py-1.5 px-1 text-base-c">
                        {{ row.item.name || '未填姓名' }}
                      </td>
                      <td class="py-1.5 px-1">
                        <div v-if="!row.item.groupId" class="text-hint-c text-xs">{{ row.item.buildingName }}</div>
                        <div class="font-bold text-base-c text-lg leading-tight">{{ row.item.roomId }}</div>
                        <div class="text-hint-c text-sm">{{ roomTypeOfRoom(row.item.roomId) }}</div>
                      </td>
                      <td class="py-1.5 px-1 text-base-c">{{ row.item.checkIn }}</td>
                      <td class="py-1.5 px-1 text-base-c">{{ row.item.checkOut }}</td>
                      <td class="py-1.5 px-1 text-base-c">{{ hkOccupancyLabel(row.item) }}</td>
                    </tr>
                  </template>
                </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── 右側欄：今日備菜 + 今日行事曆，一起放在第 3 欄當側欄 ── -->
        <div class="flex flex-col gap-4 lg:gap-6 xl:gap-8">
          <!-- ── 今日備菜 ── -->
          <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-light-c gap-2 flex-wrap">
            <span
              class="font-semibold text-muted-c"
              style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
            >
              {{ mealViewMode === 'week' ? '本週備菜' : '今日備菜' }}
              <span
                v-if="mealViewMode === 'week'"
                class="font-normal text-hint-c"
                style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
              > ({{ calWeekRangeLabel }})</span>
            </span>
              <div class="flex items-center gap-1.5">
                <div class="flex items-center gap-0.5 bg-surface2 rounded-full p-0.5">
                  <button
                    class="rounded-full font-medium px-2.5 py-1 transition-colors"
                    style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                    :class="mealViewMode === 'day' ? 'bg-green-800 text-white shadow-sm' : 'text-hint-c'"
                    @click="mealViewMode = 'day'"
                  >
                    今日
                  </button>
                  <button
                    class="rounded-full font-medium px-2.5 py-1 transition-colors"
                    style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                    :class="mealViewMode === 'week' ? 'bg-green-800 text-white shadow-sm' : 'text-hint-c'"
                    @click="mealViewMode = 'week'"
                  >
                    本週
                  </button>
                </div>
                <NuxtLink
                  to="/staff/management/meal-schedule"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-green-700 dark:text-green-400 font-medium flex-shrink-0"
                  style="font-size:clamp(12px, calc(12px + 0.45vw), 17px)"
                >查看完整排程 →
                </NuxtLink>
              </div>
            </div>
            <div
              v-if="mealLoading"
              class="px-4 py-5 text-center text-hint-c"
              style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
            >
              載入中...
            </div>
            <div
              v-else-if="!mealHasAnySessions"
              class="px-4 py-5 text-center text-hint-c"
              style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
            >
              {{ mealViewMode === 'week' ? '本週沒有排定的備餐' : '這兩天沒有排定的備餐' }}
            </div>

            <!-- ── 每天各自獨立分組顯示，今天／明天兩組，跟今日行事曆用同一套日期 ── -->
            <div
              v-else
              class="divide-y divide-base"
            >
              <div
                v-for="day in mealSessionsByDay"
                :key="day.date"
              >
                <div
                  class="px-4 py-2 bg-surface2/50 font-semibold text-hint-c"
                  style="font-size:clamp(12px, calc(12px + 0.45vw), 16px)"
                >
                  {{ mealDayHeaderLabel(day.date) }}
                </div>
                <div
                  v-if="day.sessions.length === 0"
                  class="px-4 py-2 text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                >
                  沒有排定的餐次
                </div>
                <div
                  v-else
                  class="divide-y divide-base"
                >
                  <div
                    v-for="session in day.sessions"
                    :key="session.id"
                    class="px-4 py-2.5"
                  >
                    <div class="flex items-center gap-2 flex-wrap">
                    <span
                      :class="mealTypeBadgeClass(session.mealType)"
                      class="flex-shrink-0 rounded-full px-2 py-0.5 font-semibold"
                      style="font-size:clamp(9px, calc(9px + 0.4vw), 13px)"
                    >{{ session.mealType }}</span>
                      <p
                        v-if="session.title"
                        class="font-semibold text-base-c leading-snug"
                        style="font-size:clamp(12px, calc(12px + 0.4vw), 15px)"
                      >
                        {{ session.title }}
                      </p>
                      <span
                        v-if="session.totalCount"
                        class="text-hint-c"
                        style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                      >共 {{ session.totalCount }} 份</span>
                    </div>
                    <p
                      v-if="mealDishSummary(session)"
                      class="text-hint-c mt-1 leading-snug"
                      style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                    >
                      {{ mealDishSummary(session) }}
                    </p>
                    <p
                      v-if="mealServingSummary(session)"
                      class="text-hint-c mt-0.5 leading-snug"
                      style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                    >
                      📍 {{ mealServingSummary(session) }}
                    </p>
                    <p
                      v-if="session.note"
                      class="text-base-c mt-1 leading-snug whitespace-pre-wrap"
                      style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                    >
                      {{ session.note }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── 今日行事曆 ── -->
          <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-light-c gap-2 flex-wrap">
          <span
            class="font-semibold text-muted-c"
            style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
          >
            {{ calViewMode === 'week' ? '本週行事曆' : '今日行事曆' }}
            <span
              v-if="calViewMode === 'week'"
              class="font-normal text-hint-c"
              style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
            > ({{ calWeekRangeLabel }})</span>
          </span>
              <div class="flex items-center gap-1.5">
                <div class="flex items-center gap-0.5 bg-surface2 rounded-full p-0.5">
                  <button
                    class="rounded-full font-medium px-2.5 py-1 transition-colors"
                    style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                    :class="calViewMode === 'day' ? 'bg-green-800 text-white shadow-sm' : 'text-hint-c'"
                    @click="calViewMode = 'day'"
                  >
                    今日
                  </button>
                  <button
                    class="rounded-full font-medium px-2.5 py-1 transition-colors"
                    style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                    :class="calViewMode === 'week' ? 'bg-green-800 text-white shadow-sm' : 'text-hint-c'"
                    @click="calViewMode = 'week'"
                  >
                    本週
                  </button>
                </div>
                <NuxtLink
                  to="/staff/management/calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-green-700 dark:text-green-400 font-medium flex-shrink-0"
                  style="font-size:clamp(12px, calc(12px + 0.45vw), 17px)"
                >查看全月 →
                </NuxtLink>
              </div>
            </div>
            <div
              v-if="loading"
              class="px-4 py-5 text-center text-hint-c"
              style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
            >
              載入中...
            </div>
            <div
              v-else-if="!calHasAnyEvents"
              class="px-4 py-5 text-center text-hint-c"
              style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
            >
              {{ calViewMode === 'week' ? '本週沒有排定的活動' : '這兩天沒有排定的活動' }}
            </div>

            <!-- ── 每天各自獨立分組顯示；今日模式是「今天／明天」兩組，本週模式是整週七組 ── -->
            <div
              v-else
              class="divide-y divide-base"
            >
              <div
                v-for="day in calEventsByDay"
                :key="day.date"
              >
                <div
                  class="px-4 py-2 bg-surface2/50 font-semibold text-hint-c"
                  style="font-size:clamp(12px, calc(12px + 0.45vw), 16px)"
                >
                  {{ calDayHeaderLabel(day.date) }}
                </div>
                <div
                  v-if="day.events.length === 0"
                  class="px-4 py-2 text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                >
                  沒有排定的活動
                </div>
                <div
                  v-else
                  class="divide-y divide-base"
                >
                  <div
                    v-for="(ev, i) in day.events"
                    :key="i"
                    class="flex items-start gap-3 px-4 py-2.5"
                  >
                    <div
                      class="flex-shrink-0 text-right"
                      style="min-width:42px"
                    >
                  <span
                    class="font-mono font-semibold text-hint-c"
                    style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                  >{{ ev.time ? ev.time.split('-')[0] : '' }}</span>
                    </div>
                    <div
                      class="flex-shrink-0 w-1 self-stretch rounded-full mt-0.5"
                      :style="{ background: calBarColor(ev) }"
                    />
                    <div class="flex-1 min-w-0">
                      <p
                        class="font-semibold text-base-c leading-snug"
                        style="font-size:clamp(12px, calc(12px + 0.4vw), 15px)"
                      >
                        {{ ev.title }}
                      </p>
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span
                      v-if="ev.owner"
                      class="text-hint-c"
                      style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                    >👤 {{ ev.owner }}</span>
                        <span
                          v-if="ev.room"
                          class="text-hint-c truncate"
                          style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                        >
                      📍 {{ ev.source === 'google' ? ev.room : ev.room.replace(/^[A-Z0-9]+\s*/, '') }}
                    </span>
                      </div>
                      <p
                        v-if="calEventDetail(ev)"
                        class="text-hint-c mt-1 whitespace-pre-wrap leading-snug"
                        style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                      >
                        {{ calEventDetail(ev) }}
                      </p>
                    </div>
                    <span
                      class="flex-shrink-0 rounded-full px-2 py-0.5 font-semibold self-start mt-0.5"
                      style="font-size:clamp(9px, calc(9px + 0.4vw), 13px)"
                      :style="{ background: calChipBg(ev), color: calChipText(ev) }"
                    >
                  {{ calBadgeLabel(ev) }}
                </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 快速新增（訂位／便當）Modal ════════ -->
    <!-- 用 Teleport 掛到 body：避免頁面版型（layout/page transition 等）上層若有 transform，
         導致這個 fixed 彈窗的定位基準跑掉、變成只蓋住頁面容器寬度而不是整個畫面 -->
    <Teleport to="body">
      <div
        v-if="quickModal.show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 overflow-y-auto px-3 py-4 sm:px-4"
        @click.self="quickModal.show = false"
      >
        <div class="bg-surface rounded-2xl shadow-xl w-full sm:max-w-md p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-base-c">{{ quickTitle }}（今天）</h3>
            <button
              class="text-hint-c hover:text-muted-c p-1"
              @click="quickModal.show = false"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">姓名</label>
              <input
                v-model="qForm.name"
                placeholder="留空自動填入「未知人物A」「未知人物B」..."
                class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">{{
                  quickModal.type === 'lunch' ? '取餐時段' : '用餐時段'
                }}</label>
              <input
                v-model="qForm.time"
                type="time"
                class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">葷素數量</label>
              <div class="grid grid-cols-2 gap-2">
                <div class="bg-red-50 dark:bg-red-900/10 rounded-xl p-2.5 border border-red-200 dark:border-red-800/30">
                  <label class="text-xs font-medium text-red-700 dark:text-red-400 block mb-1">🍖 葷食</label>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="flex-shrink-0 w-7 h-7 rounded-lg bg-white dark:bg-black/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 font-bold text-base leading-none flex items-center justify-center active:scale-90 transition-transform"
                      @click="qDec('meatQty')"
                    >−
                    </button>
                    <input
                      v-model.number="qForm.meatQty"
                      type="number"
                      min="0"
                      class="w-full min-w-0 bg-surface border border-red-200 dark:border-red-800/50 text-base-c rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-center font-bold"
                    />
                    <button
                      type="button"
                      class="flex-shrink-0 w-7 h-7 rounded-lg bg-white dark:bg-black/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 font-bold text-base leading-none flex items-center justify-center active:scale-90 transition-transform"
                      @click="qInc('meatQty')"
                    >＋
                    </button>
                  </div>
                </div>
                <div
                  class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                  <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🌿 全素</label>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="flex-shrink-0 w-7 h-7 rounded-lg bg-white dark:bg-black/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 font-bold text-base leading-none flex items-center justify-center active:scale-90 transition-transform"
                      @click="qDec('fullVegQty')"
                    >−
                    </button>
                    <input
                      v-model.number="qForm.fullVegQty"
                      type="number"
                      min="0"
                      class="w-full min-w-0 bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                    />
                    <button
                      type="button"
                      class="flex-shrink-0 w-7 h-7 rounded-lg bg-white dark:bg-black/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 font-bold text-base leading-none flex items-center justify-center active:scale-90 transition-transform"
                      @click="qInc('fullVegQty')"
                    >＋
                    </button>
                  </div>
                </div>
                <div
                  class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                  <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🥚 蛋奶素</label>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="flex-shrink-0 w-7 h-7 rounded-lg bg-white dark:bg-black/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 font-bold text-base leading-none flex items-center justify-center active:scale-90 transition-transform"
                      @click="qDec('eggVegQty')"
                    >−
                    </button>
                    <input
                      v-model.number="qForm.eggVegQty"
                      type="number"
                      min="0"
                      class="w-full min-w-0 bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                    />
                    <button
                      type="button"
                      class="flex-shrink-0 w-7 h-7 rounded-lg bg-white dark:bg-black/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 font-bold text-base leading-none flex items-center justify-center active:scale-90 transition-transform"
                      @click="qInc('eggVegQty')"
                    >＋
                    </button>
                  </div>
                </div>
                <div
                  class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                  <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🧄 五辛素</label>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="flex-shrink-0 w-7 h-7 rounded-lg bg-white dark:bg-black/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 font-bold text-base leading-none flex items-center justify-center active:scale-90 transition-transform"
                      @click="qDec('spiceVegQty')"
                    >−
                    </button>
                    <input
                      v-model.number="qForm.spiceVegQty"
                      type="number"
                      min="0"
                      class="w-full min-w-0 bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                    />
                    <button
                      type="button"
                      class="flex-shrink-0 w-7 h-7 rounded-lg bg-white dark:bg-black/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 font-bold text-base leading-none flex items-center justify-center active:scale-90 transition-transform"
                      @click="qInc('spiceVegQty')"
                    >＋
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">備註</label>
              <textarea
                v-model="qForm.note"
                rows="2"
                placeholder="特殊要求"
                class="w-full border border-light-c bg-surface text-base-c rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
          </div>
          <div class="flex gap-2 mt-5">
            <button
              class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors"
              @click="quickModal.show = false"
            >取消
            </button>
            <button
              class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 disabled:opacity-50 transition-colors"
              :disabled="quickSaving"
              @click="saveQuickAdd"
            >
              {{ quickSaving ? '新增中...' : '新增' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.notify-enter-active,
.notify-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.notify-enter-from,
.notify-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.notify-leave-active {
  position: absolute;
}

.group-header-row {
  background: rgba(139, 92, 246, .16);
}

.group-header-row button:hover {
  opacity: .85;
}

.group-member-row {
  background: rgba(139, 92, 246, .06);
}

.group-member-row td:first-child {
  border-left: 3px solid #a78bfa;
  padding-left: 12px;
}

.group-building-row {
  background: rgba(139, 92, 246, .18);
  border-top: 2px solid rgba(167, 139, 250, .55) !important;
}

.group-building-row td {
  padding-top: 7px;
  padding-bottom: 7px;
}

</style>
