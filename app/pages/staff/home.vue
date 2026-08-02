<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'staff.home' })

const commonStore = useCommonStore()
const HOME_BASE = () => commonStore.data.main_url + '/holy/home'
const CAL_BASE = () => commonStore.data.main_url + '/holy/calendar'

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

// ── 顯示模式：今日 / 本週 ────────────────────────────────────────────
const viewMode = ref('day') // 'day' | 'week'
const calViewMode = ref('day') // 行事曆自己的今日／本週切換，跟上面的概況切換各自獨立

// ── 今日概況 / 本週概況 ───────────────────────────────────────────────
const loading = ref(false)
const loadingWeek = ref(false)
const daySummary = ref(null)
const weekSummary = ref(null)
const allEvents = ref([]) // 本月所有行事曆事件（含 Google），今日／本週都從這裡篩選

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
    const bMeat = sumQty(bItems, 'meatQty'), bVeg = sumQty(bItems, 'fullVegQty') + sumQty(bItems, 'eggVegQty') + sumQty(bItems, 'spiceVegQty')
    const lMeat = sumQty(lItems, 'meatQty'), lVeg = sumQty(lItems, 'fullVegQty') + sumQty(lItems, 'eggVegQty') + sumQty(lItems, 'spiceVegQty')
    return {
      date,
      booking: { items: bItems, total: bMeat + bVeg },
      lunch: { items: lItems, total: lMeat + lVeg },
      soybean: { items: sItems }
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
// 豆製品後端會自動抓「未來最近一個出貨日」的訂單，不一定等於今天，這裡算出來給畫面顯示是哪一天
const soybeanPickupDate = computed(() => summary.value?.soybean?.date ?? '')
const soybeanIsToday = computed(() => soybeanPickupDate.value === todayStr)

const todayEvents = computed(() => allEvents.value.filter(e => e.date === todayStr))
const weekEvents = computed(() => allEvents.value.filter(e => e.date >= calWeekStart && e.date <= calWeekEnd))
const displayEvents = computed(() => (calViewMode.value === 'week' ? weekEvents.value : todayEvents.value))

// 本週行事曆：每天各自獨立分組顯示，跟本週概況一樣不合併成一個清單
const weekEventsByDay = computed(() => {
  if (calViewMode.value !== 'week') return []
  return CAL_WEEK_DATES.map(date => ({
    date,
    events: weekEvents.value.filter(e => e.date === date)
  }))
})
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
  } catch (e) { /* 無法讀取偏好時使用預設值 */ }
}
function saveSoundPref() {
  try {
    localStorage.setItem('holy_home_sound_enabled', soundEnabled.value ? '1' : '0')
  } catch (e) { /* 無痕模式等情況可能無法儲存，忽略即可 */ }
}

// 瀏覽器多半要求先有使用者互動才允許播放音效，先建立/解鎖 AudioContext
let audioCtx = null
function getAudioCtx() {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext
    if (AudioCtxClass) audioCtx = new AudioCtxClass()
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}
function unlockAudio() {
  getAudioCtx()
  primeSpeech()
}

function playTones(tones, waveType) {
  try {
    const ctx = getAudioCtx()
    if (!ctx) return
    tones.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.16
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = waveType
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.38)
    })
  } catch (e) { /* 音效播放失敗不影響其他功能 */ }
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
  } catch (e) { /* 忽略 */ }
}

function speakText(text) {
  try {
    if (!window.speechSynthesis || !text) return
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'zh-TW'
    utter.rate = 1
    window.speechSynthesis.speak(utter)
  } catch (e) { /* 語音播放失敗不影響其他功能 */ }
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
  return `${prefix}，${nameText}，${timeText ? timeText + '，' : ''}${detail}位`
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
  return `${prefix}，${nameText}，${timeText ? timeText + '，' : ''}${detail}`
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
    setTimeout(playDeleteSound, 900)
    setTimeout(() => speakText('新訂位，王先生，12點，葷2位'), 1500)
    setTimeout(() => speakText('訂位取消，王先生，12點，葷2位'), 3200)
  }
}

function pushNotification(icon, title, detail, tab) {
  const id = ++notifySeq
  notifications.value.push({ id, icon, title, detail, tab })
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

const qtyOf = item => (item.meatQty || 0) + (item.fullVegQty || 0) + (item.eggVegQty || 0) + (item.spiceVegQty || 0)

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
    const res = await fetch(`${HOME_BASE()}/today`, { credentials: 'include' })
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
    const spokenPhrases = []

    // 新增／已入位
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
      }
    }
    for (const item of newLunches) {
      if (!knownLunches.has(item.id)) {
        gotCreated = true
        pushNotification('🍱', '新便當訂單', `${item.name || '未填姓名'}　${item.time || ''}　${typeBreakdown(item) || qtyOf(item) + '個'}`, 'lunch')
        spokenPhrases.push(lunchSpokenText(item))
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

    if (gotCreated || gotDeleted || gotCheckedIn) {
      if (soundEnabled.value) {
        if (gotCreated || gotCheckedIn) playCreateSound()
        if (gotDeleted) setTimeout(playDeleteSound, (gotCreated || gotCheckedIn) ? 450 : 0)
        const allPhrases = [...spokenPhrases, ...spokenDeletePhrases]
        if (allPhrases.length) {
          // 等提示音都播完再開始念，語音本身會自動排隊依序念完，不用逐句手動間隔
          const chimeDuration = gotDeleted && (gotCreated || gotCheckedIn) ? 900 : 550
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
  eventSource = new EventSource(`${HOME_BASE()}/stream`, { withCredentials: true })
  eventSource.addEventListener('order', () => {
    syncNewOrders()
  })
  // 連線出錯時瀏覽器會自動重連，這裡只需記錄，不用手動處理
  eventSource.onerror = () => {}
}

function disconnectStream() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
}

// ── 行事曆顏色 ────────────────────────────────────────────────────
const calTypeColor = { 醫院: '#e0534a', 園區: '#3d6b52', 芳心: '#a06080', Google: '#2563eb' }
const calChipBg = ev => ev.source === 'google'
  ? '#dbeafe'
  : ({
      醫院: '#fee2e2',
      園區: '#dcfce7',
      芳心: '#fce7f3'
    }[ev.type] || '#f0f0f0')
const calChipText = ev => ev.source === 'google' ? '#1d4ed8' : (calTypeColor[ev.type] || '#555')
const calBarColor = ev => ev.source === 'google' ? '#2563eb' : (calTypeColor[ev.type] || '#ccc')
const calBadgeLabel = ev => ev.source === 'google' ? 'Google' : ev.type

async function fetchToday() {
  loading.value = true
  try {
    // 本週可能跨月（例如週一在上個月），系統行事曆 API 是按月查詢，兩個月不同就都抓
    const startMonth = calWeekStart.slice(0, 7)
    const endMonth = calWeekEnd.slice(0, 7)
    const months = startMonth === endMonth ? [startMonth] : [startMonth, endMonth]

    const homePromise = fetch(`${HOME_BASE()}/today`, { credentials: 'include' })
    const calPromises = months.map(ym => fetch(`${CAL_BASE()}/list?yearMonth=${ym}`))

    let googlePromise = Promise.resolve(null)
    if (GOOGLE_CALENDAR_ID && !GOOGLE_CALENDAR_ID.includes('your-calendar')) {
      // 直接抓整個「本週」範圍，今日事件本來就落在本週裡，一次抓夠兩種檢視模式用
      const timeMin = encodeURIComponent(new Date(`${calWeekStart}T00:00:00`).toISOString())
      const timeMax = encodeURIComponent(new Date(`${calWeekEnd}T23:59:59`).toISOString())
      const gUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`
        + `?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`
      googlePromise = fetch(gUrl).catch(() => null)
    }

    const [homeRes, calResults, gRes] = await Promise.all([
      homePromise,
      Promise.all(calPromises),
      googlePromise
    ])
    if (homeRes?.ok) daySummary.value = await homeRes.json()

    const sysEvents = []
    for (const cRes of calResults) {
      if (!cRes.ok) continue
      const monthEvents = await cRes.json()
      sysEvents.push(...monthEvents)
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
    const res = await fetch(`${HOME_BASE()}/week?date=${todayStr}`, { credentials: 'include' })
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

const UNLOCK_EVENTS = ['click', 'keydown', 'touchstart', 'pointerdown']

onMounted(() => {
  loadSoundPref()
  UNLOCK_EVENTS.forEach(evt => window.addEventListener(evt, unlockAudio, { once: true }))
  fetchToday().then(() => {
    syncKnownItems(daySummary.value)
    connectStream()
  })
})

onUnmounted(() => {
  disconnectStream()
  UNLOCK_EVENTS.forEach(evt => window.removeEventListener(evt, unlockAudio))
})
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors">
    <!-- ── 新訂單通知（置中、放大）── -->
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
            >
              {{ n.title }}
            </p>
            <p
              class="text-muted-c mt-0.5"
              style="font-size:clamp(14px, calc(14px + 0.45vw), 20px)"
            >
              {{ n.detail }}
            </p>
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

    <header class="bg-surface border-b border-light-c px-4 py-3 lg:px-6 xl:px-10 xl:py-4">
      <div class="mx-auto flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white flex-shrink-0"
          style="font-size:clamp(14px, calc(14px + 0.45vw), 20px)"
        >
          🌿
        </div>
        <div>
          <h1
            class="font-bold text-base-c leading-none"
            style="font-size:15px"
          >
            員工專區
          </h1>
          <p
            class="text-hint-c mt-0.5"
            style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
          >
            {{ todayLabel }}
          </p>
        </div>
      </div>
    </header>

    <div class="mx-auto px-3 sm:px-4 lg:px-8 xl:px-12 py-4 lg:py-8 xl:py-10">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 xl:gap-8 lg:items-start">
        <!-- ── 今日概況 ── -->
        <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden lg:col-span-2">
          <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-light-c">
            <span
              class="font-semibold text-muted-c"
              style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
            >
              {{ viewMode === 'week' ? '本週概況' : '今日概況' }}
              <span
                v-if="viewMode === 'week' && weekRangeLabel"
                class="font-normal text-hint-c"
                style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
              > ({{ weekRangeLabel }})</span>
            </span>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                class="flex-shrink-0 rounded-full px-2 py-1 border transition-colors"
                style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                :class="soundEnabled ? 'border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'border-light-c text-hint-c'"
                :title="soundEnabled ? '點一下測試提示音與語音播報' : '提示音已關閉，點一下開啟'"
                @click="toggleSound"
              >
                {{ soundEnabled ? '🔔 提示音' : '🔕 靜音中' }}
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
          <div
            v-if="summaryLoading"
            class="px-4 py-6 text-center text-hint-c"
            style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
          >
            載入中...
          </div>
          <div
            v-else-if="bookings.length === 0 && lunchOrders.length === 0 && soybeanOrders.length === 0"
            class="px-4 py-6 text-center text-hint-c"
            style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
          >
            {{ viewMode === 'week' ? '本週尚無訂位或便當記錄' : '今天尚無訂位或便當記錄' }}
          </div>

          <!-- ── 今日模式：單一 3 欄格線 ── -->
          <div
            v-else-if="viewMode === 'day'"
            class="grid grid-cols-3 divide-x divide-base"
          >
            <!-- 訂位 -->
            <div class="px-4 py-3 xl:px-6 xl:py-5 text-left">
              <div class="flex items-center gap-1.5 mb-2">
                <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span
                  class="font-semibold text-hint-c uppercase tracking-wide"
                  style="font-size:clamp(10px, calc(10px + 0.45vw), 14px)"
                >訂位</span>
              </div>
              <div
                v-if="bookings.length === 0"
                class="text-hint-c"
                style="font-size:clamp(12px, calc(12px + 0.45vw), 17px)"
              >
                尚無記錄
              </div>
              <template v-else>
                <p
                  class="text-base-c"
                  style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
                >
                  <span
                    class="font-black"
                    style="font-size:clamp(24px, calc(24px + 0.45vw), 34px)"
                  >{{ bookings.length }}</span> 筆
                  · <span class="font-semibold">{{ bookingTotal }}</span> 人
                </p>
                <div
                  class="mt-1 space-y-0.5 text-green-600 dark:text-green-400"
                  style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                >
                  <div v-if="bookingMeat > 0">
                    🍖 葷 {{ bookingMeat }}
                  </div>
                  <div v-if="bookingFullVeg > 0">
                    🌿 全素 {{ bookingFullVeg }}
                  </div>
                  <div v-if="bookingEggVeg > 0">
                    🥚 蛋奶素 {{ bookingEggVeg }}
                  </div>
                  <div v-if="bookingSpiceVeg > 0">
                    🧄 五辛素 {{ bookingSpiceVeg }}
                  </div>
                </div>
                <div class="mt-2 pt-2 border-t border-light-c/60 divide-y divide-base max-h-64 xl:max-h-[32rem] overflow-y-auto">
                  <div
                    v-for="item in bookings"
                    :key="item.id"
                    class="py-1.5 first:pt-0"
                  >
                    <div class="flex items-center gap-2 flex-wrap">
                      <span
                        v-if="item.time"
                        class="flex-shrink-0 font-mono text-hint-c"
                        style="font-size:clamp(10px, calc(10px + 0.45vw), 14px)"
                      >{{ item.time }}</span>
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
                      {{ typeBreakdown(item) || '尚未填寫葷素數量' }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <!-- 便當 -->
            <div class="px-4 py-3 xl:px-6 xl:py-5 text-left">
              <div class="flex items-center gap-1.5 mb-2">
                <span class="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                <span
                  class="font-semibold text-hint-c uppercase tracking-wide"
                  style="font-size:clamp(10px, calc(10px + 0.45vw), 14px)"
                >便當</span>
              </div>
              <div
                v-if="lunchOrders.length === 0"
                class="text-hint-c"
                style="font-size:clamp(12px, calc(12px + 0.45vw), 17px)"
              >
                尚無記錄
              </div>
              <template v-else>
                <p
                  class="text-base-c"
                  style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
                >
                  <span
                    class="font-black"
                    style="font-size:clamp(24px, calc(24px + 0.45vw), 34px)"
                  >{{ lunchTotal }}</span> 個
                </p>
                <div
                  class="mt-1 space-y-0.5 text-orange-600 dark:text-orange-400"
                  style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
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
                <div class="mt-2 pt-2 border-t border-light-c/60 divide-y divide-base max-h-64 xl:max-h-[32rem] overflow-y-auto">
                  <div
                    v-for="item in lunchOrders"
                    :key="item.id"
                    class="py-1.5 first:pt-0"
                  >
                    <div class="flex items-center gap-2 flex-wrap">
                      <span
                        v-if="item.time"
                        class="flex-shrink-0 font-mono text-hint-c"
                        style="font-size:clamp(10px, calc(10px + 0.45vw), 14px)"
                      >{{ item.time }}</span>
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
                      {{ typeBreakdown(item) || '尚未填寫葷素數量' }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <!-- 豆製品 -->
            <div class="px-4 py-3 xl:px-6 xl:py-5 text-left">
              <div class="flex items-center gap-1.5 mb-2">
                <span class="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span
                  class="font-semibold text-hint-c uppercase tracking-wide"
                  style="font-size:clamp(10px, calc(10px + 0.45vw), 14px)"
                >豆製品</span>
                <span
                  v-if="soybeanPickupDate && !soybeanIsToday"
                  class="font-normal text-hint-c"
                  style="font-size:clamp(9px, calc(9px + 0.45vw), 13px)"
                >（{{ fmtMDWeekday(soybeanPickupDate) }} 出貨）</span>
              </div>
              <div
                v-if="soybeanOrders.length === 0"
                class="text-hint-c"
                style="font-size:clamp(12px, calc(12px + 0.45vw), 17px)"
              >
                尚無記錄
              </div>
              <template v-else>
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
                    🥛 豆漿 {{ soybeanSoymilk }} 袋
                  </div>
                  <div v-if="soybeanTofu > 0">
                    🟨 豆腐 {{ soybeanTofu }} 塊
                  </div>
                </div>
                <div class="mt-2 pt-2 border-t border-light-c/60 divide-y divide-base max-h-64 xl:max-h-[32rem] overflow-y-auto">
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
                      <template v-if="soymilkBreakdownText(item)">
                        🥛 豆漿 {{ soymilkBreakdownText(item) }}
                      </template>
                      <template v-if="item.tofuQty">
                        🟨 豆腐 {{ item.tofuQty }}
                      </template>
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
              <div class="grid grid-cols-3 divide-x divide-base">
                <!-- 訂位 -->
                <div class="px-4 py-2.5 xl:px-6 xl:py-3 text-left">
                  <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span class="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    <span
                      class="font-semibold text-hint-c uppercase tracking-wide"
                      style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                    >訂位</span>
                    <span
                      v-if="day.booking.items.length"
                      class="text-hint-c"
                      style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                    >· {{ day.booking.items.length }}筆・{{ day.booking.total }}人</span>
                  </div>
                  <div
                    v-if="day.booking.items.length === 0"
                    class="text-hint-c"
                    style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                  >
                    無
                  </div>
                  <div
                    v-else
                    class="space-y-1.5"
                  >
                    <div
                      v-for="item in day.booking.items"
                      :key="item.id"
                    >
                      <div class="flex items-center gap-2 flex-wrap">
                        <span
                          v-if="item.time"
                          class="flex-shrink-0 font-mono text-hint-c"
                          style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                        >{{ item.time }}</span>
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
                        {{ typeBreakdown(item) || '尚未填寫葷素數量' }}
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 便當 -->
                <div class="px-4 py-2.5 xl:px-6 xl:py-3 text-left">
                  <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span class="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                    <span
                      class="font-semibold text-hint-c uppercase tracking-wide"
                      style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                    >便當</span>
                    <span
                      v-if="day.lunch.items.length"
                      class="text-hint-c"
                      style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                    >· {{ day.lunch.total }}個</span>
                  </div>
                  <div
                    v-if="day.lunch.items.length === 0"
                    class="text-hint-c"
                    style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
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
                          style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                        >{{ item.time }}</span>
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
                        {{ typeBreakdown(item) || '尚未填寫葷素數量' }}
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 豆製品 -->
                <div class="px-4 py-2.5 xl:px-6 xl:py-3 text-left">
                  <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <span
                      class="font-semibold text-hint-c uppercase tracking-wide"
                      style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                    >豆製品</span>
                    <span
                      v-if="day.soybean.items.length"
                      class="text-hint-c"
                      style="font-size:clamp(10px, calc(10px + 0.4vw), 13px)"
                    >· {{ day.soybean.items.length }}筆</span>
                  </div>
                  <div
                    v-if="day.soybean.items.length === 0"
                    class="text-hint-c"
                    style="font-size:clamp(11px, calc(11px + 0.4vw), 14px)"
                  >
                    無
                  </div>
                  <div
                    v-else
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
                        <template v-if="soymilkBreakdownText(item)">
                          🥛 豆漿 {{ soymilkBreakdownText(item) }}
                        </template>
                        <template v-if="item.tofuQty">
                          🟨 豆腐 {{ item.tofuQty }}
                        </template>
                      </div>
                    </div>
                  </div>
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
            v-else-if="displayEvents.length === 0"
            class="px-4 py-5 text-center text-hint-c"
            style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
          >
            {{ calViewMode === 'week' ? '本週沒有排定的活動' : '今天沒有排定的活動' }}
          </div>

          <!-- ── 今日模式：單一清單 ── -->
          <div
            v-else-if="calViewMode === 'day'"
            class="divide-y divide-base"
          >
            <div
              v-for="(ev, i) in displayEvents"
              :key="i"
              class="flex items-start gap-3 px-4 py-3"
            >
              <div
                class="flex-shrink-0 text-right"
                style="min-width:42px"
              >
                <span
                  class="font-mono font-semibold text-hint-c"
                  style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                >{{ ev.time ? ev.time.split('-')[0] : '' }}</span>
              </div>
              <div
                class="flex-shrink-0 w-1 self-stretch rounded-full mt-0.5"
                :style="{ background: calBarColor(ev) }"
              />
              <div class="flex-1 min-w-0">
                <p
                  class="font-semibold text-base-c leading-snug"
                  style="font-size:clamp(13px, calc(13px + 0.45vw), 18px)"
                >
                  {{ ev.title }}
                </p>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span
                    v-if="ev.owner"
                    class="text-hint-c"
                    style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                  >👤 {{ ev.owner }}</span>
                  <span
                    v-if="ev.room"
                    class="text-hint-c truncate"
                    style="font-size:clamp(11px, calc(11px + 0.45vw), 15px)"
                  >
                    📍 {{ ev.source === 'google' ? ev.room : ev.room.replace(/^[A-Z0-9]+\s*/, '') }}
                  </span>
                </div>
              </div>
              <span
                class="flex-shrink-0 rounded-full px-2 py-0.5 font-semibold self-start mt-0.5"
                style="font-size:clamp(10px, calc(10px + 0.45vw), 14px)"
                :style="{ background: calChipBg(ev), color: calChipText(ev) }"
              >
                {{ calBadgeLabel(ev) }}
              </span>
            </div>
          </div>

          <!-- ── 本週模式：每天各自獨立分組，跟本週概況一樣依序排下去 ── -->
          <div
            v-else
            class="divide-y divide-base"
          >
            <div
              v-for="day in weekEventsByDay"
              :key="day.date"
            >
              <div
                class="px-4 py-2 bg-surface2/50 font-semibold text-hint-c"
                style="font-size:clamp(12px, calc(12px + 0.45vw), 16px)"
              >
                {{ fmtMDWeekday(day.date) }}
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
</style>
