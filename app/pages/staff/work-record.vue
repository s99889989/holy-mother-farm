<script setup>
definePageMeta({layout: 'staff'})

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/workRecord'

// ── 各空間完整工作內容（依星期）────────────────────────────────────
const WEEKDAY_SPACES = {
  '星期一': [
    {
      name: '聖堂、文物室（更衣室）',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '擴大機（1台）'},
        {label: '播放機（2個）'},
        {label: '麥克風（1台）'},
        {label: '電子琴'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '1630後關機：擴大機'},
        {label: '1630後關機：播放機'},
        {label: '1630後關機：麥克風'},
        {label: '1630後關機：電子琴'},
        {label: '聖堂時鐘對時'},
        {label: '結案完成'},
      ]
    },
    {
      name: '簡報室',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '擴大機（1台）'},
        {label: '電腦（3個）'},
        {label: '麥克風（1台）'},
        {label: '投影機'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '冷氣開關正常'},
        {label: '桌子清點數量（4張）'},
        {label: '椅子清點數量（37張）'},
        {label: '1630後關機：擴大機'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：麥克風'},
        {label: '1630後關機：投影機'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
    {
      name: '招待所（會議室）',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '電腦（1台）'},
        {label: '電視（1台）'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '冷氣開關正常'},
        {label: '桌子清點數量（4張）'},
        {label: '椅子清點數量（8張）'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：電視'},
        {label: '會議室時鐘對時'},
        {label: '接待區時鐘對時'},
        {label: '結案完成'},
      ]
    },
  ],
  '星期二': [
    {
      name: 'A201教室',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '擴大機（1台）'},
        {label: '電腦（2個）'},
        {label: '麥克風（1台）'},
        {label: '投影機'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '桌子清點數量（12張）'},
        {label: '椅子清點數量（50張）'},
        {label: '1630後關機：擴大機'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：麥克風'},
        {label: '1630後關機：投影機'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
    {
      name: 'A202教室',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '擴大機（1台）'},
        {label: '電腦（3個）'},
        {label: '麥克風（1台）'},
        {label: '投影機'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '桌子清點數量（12張）'},
        {label: '椅子清點數量（45張）'},
        {label: '1630後關機：擴大機'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：麥克風'},
        {label: '1630後關機：投影機'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
    {
      name: 'A203教室',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '擴大機（1台）'},
        {label: '電腦（1個）'},
        {label: '麥克風（1台）'},
        {label: '投影機'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '桌子清點數量（6張）'},
        {label: '椅子清點數量（24張）'},
        {label: '1630後關機：投影機'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：麥克風'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
  ],
  '星期三': [
    {
      name: '樂活教室',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '擴大機（1台）'},
        {label: '電腦（3個）'},
        {label: '麥克風（1台）'},
        {label: '投影機'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '桌子清點數量（20張）'},
        {label: '椅子清點數量（60張）'},
        {label: '1630後關機：擴大機'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：麥克風'},
        {label: '1630後關機：投影機'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
    {
      name: '講師休息室',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '桌椅擺設整齊'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
    {
      name: '心靈教室',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '擴大機（1台）'},
        {label: '電腦（1台）'},
        {label: '電視（1台）'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '蒲團清點數量（12個）'},
        {label: '椅子清點數量（12張）'},
        {label: '1630後關機：擴大機'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：電視'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
  ],
  '星期四': [
    {
      name: '競技館',
      note: '暫時不用',
      subItems: [
        {label: '暫時不用（確認）'},
      ]
    },
    {
      name: '手工教室',
      note: '暫時不用',
      subItems: [
        {label: '暫時不用（確認）'},
      ]
    },
    {
      name: '運動館 B1大禮堂',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '擴大機（1台）'},
        {label: '電腦（1台）'},
        {label: '投影機（1台）'},
        {label: '麥克風（1個）'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '桌子清點數量（19張）'},
        {label: '椅子清點數量（210張）'},
        {label: '1630後關機：擴大機'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：投影機'},
        {label: '1630後關機：麥克風'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
    {
      name: '快樂運動館 樂功能教室',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '擴大機（1台）'},
        {label: '電腦（1台）'},
        {label: '投影機（1台）'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '1630後關機：擴大機'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：投影機'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
    {
      name: '快樂運動館 大廳',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '電腦（1台）'},
        {label: '電視（1台）'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '1630後關機：電腦'},
        {label: '1630後關機：電視'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
    {
      name: '森林好食光餐廳',
      subItems: [
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '冷氣開關正常'},
        {label: '桌子清點數量（4張）'},
        {label: '椅子清點數量（16張）'},
        {label: '沙發桌椅清點數量（1套）'},
        {label: '時鐘對時'},
        {label: '結案完成'},
      ]
    },
  ],
  '星期五': [
    {
      name: '活動中心',
      subItems: [
        {label: '1330 開機暖機'},
        {label: '移動式擴大機'},
        {label: '音樂播放機'},
        {label: '麥克風'},
        {label: '環境巡視與整理'},
        {label: '設施清點與紀錄'},
        {label: '燈光檢查'},
        {label: '桌子清點'},
        {label: '小藍椅清點'},
        {label: '摺疊藍椅清點'},
        {label: '咖啡涼椅清點'},
        {label: '1630後關機：移動式擴大機'},
        {label: '1630後關機：音樂播放機'},
        {label: '1630後關機：麥克風'},
        {label: '結案完成'},
      ]
    },
    {
      name: '其餘空間（迴廊燈、時鐘對時）',
      subItems: [
        {label: 'A區迴廊燈光檢查'},
        {label: '農莊服務中心走廊燈檢查'},
        {label: '小舖平台走廊燈檢查'},
        {label: '早禱區時鐘對時'},
        {label: '咖啡小舖時鐘對時'},
        {label: '服務中心時鐘對時'},
        {label: '香藥草工作室時鐘對時'},
        {label: '麵包坊體驗區時鐘對時'},
        {label: '競技館時鐘對時'},
        {label: '手作教室時鐘對時'},
      ]
    },
  ],
}

const CHECK_ITEMS = [
  {
    item: '16:30 未使用空間上鎖歸位',
    detail: '聖堂、文物室（更衣室）、簡報室、招待所（會議室）、A201、A202、A203、樂活教室、講師休息室、心靈教室、運動館B1大禮堂、運動管樂功能教室、競技館、手作教室、好食光餐廳、活動中心、咖啡小舖平台'
  },
  {item: '16:30 仍在使用空間 #1（場租）'},
  {item: '16:30 仍在使用空間 #2（場租）'},
  {item: '16:30 仍在使用空間 #3（場租）'},
  {item: '外圍環境巡視：關閉走廊不必要電源'},
  {item: '外圍環境巡視：關閉廁所不必要電源'},
  {item: '外圍環境設施正常確認'},
]

const WEEKDAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

// ── 日曆 ──────────────────────────────────────────────────────────
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)
const selectedDate = ref(todayStr)
const calOpen = ref(false)

const calendarDays = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({label: '', date: null})
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push({label: d, date: `${calYear.value}-${mm}-${dd}`})
  }
  return days
})

function prevMonth() {
  if (calMonth.value === 1) {
    calYear.value--;
    calMonth.value = 12
  } else calMonth.value--
}

function nextMonth() {
  if (calMonth.value === 12) {
    calYear.value++;
    calMonth.value = 1
  } else calMonth.value++
}

function pickDate(date) {
  selectedDate.value = date
  calOpen.value = false
}

// ── 資料 ──────────────────────────────────────────────────────────
const loading = ref(false)
const saving = ref(false)
const records = ref([])
const expandedId = ref(null)
const expandedSpaceIdx = ref({}) // { recordId: Set<spaceIndex> }

const recordDates = computed(() => new Set(records.value.map(r => r.date)))
const selectedRecords = computed(() => records.value.filter(r => r.date === selectedDate.value))

async function fetchRecords() {
  loading.value = true
  try {
    const ym = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`
    const res = await fetch(`${BASE()}/list?yearMonth=${ym}`)
    records.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch([calYear, calMonth], fetchRecords)

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function toggleSpaceExpand(recId, si) {
  if (!expandedSpaceIdx.value[recId]) expandedSpaceIdx.value[recId] = new Set()
  const s = expandedSpaceIdx.value[recId]
  if (s.has(si)) s.delete(si) else s.add(si)
  expandedSpaceIdx.value = {...expandedSpaceIdx.value}
}

function isSpaceExpanded(recId, si) {
  return expandedSpaceIdx.value[recId]?.has(si) || false
}

// ── 新增表單 ──────────────────────────────────────────────────────
const showForm = ref(false)
const editingId = ref(null)
const expandedFormSpaceIdx = ref(new Set())

const selectedWeekday = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(selectedDate.value)
  return WEEKDAYS[d.getDay()]
})

function buildDefaultSpaces(weekday) {
  const templates = WEEKDAY_SPACES[weekday] || []
  return templates.map(t => ({
    name: t.name,
    note: t.note || '',
    done: false,
    remark: '',
    subItems: (t.subItems || []).map(sub => ({label: sub.label, done: false})),
  }))
}

function buildDefaultChecks() {
  return CHECK_ITEMS.map(c => ({item: c.item, detail: c.detail || '', done: false, remark: ''}))
}

const form = ref({date: '', weekday: '', staff: '', note: '', spaces: [], checks: []})

function openAddForm() {
  editingId.value = null
  expandedFormSpaceIdx.value = new Set([0])
  form.value = {
    date: selectedDate.value,
    weekday: selectedWeekday.value,
    staff: '',
    note: '',
    spaces: buildDefaultSpaces(selectedWeekday.value),
    checks: buildDefaultChecks(),
  }
  showForm.value = true
}

function openEditForm(record) {
  editingId.value = record.id
  expandedFormSpaceIdx.value = new Set([0])
  form.value = {
    id: record.id,
    date: record.date,
    weekday: record.weekday,
    staff: record.staff,
    note: record.note,
    spaces: record.spaces.map(s => ({
      ...s,
      subItems: (s.subItems || []).map(sub => ({...sub})),
    })),
    checks: record.checks.map(c => ({...c})),
  }
  showForm.value = true
}

watch(() => form.value.weekday, (wday) => {
  if (!editingId.value) {
    form.value.spaces = buildDefaultSpaces(wday)
    expandedFormSpaceIdx.value = new Set([0])
  }
})

function toggleFormSpace(si) {
  const s = new Set(expandedFormSpaceIdx.value)
  if (s.has(si)) s.delete(si) else s.add(si)
  expandedFormSpaceIdx.value = s
}

function addSpace() {
  const newIdx = form.value.spaces.length
  form.value.spaces.push({name: '', note: '', done: false, remark: '', subItems: []})
  const s = new Set(expandedFormSpaceIdx.value)
  s.add(newIdx)
  expandedFormSpaceIdx.value = s
}

function removeSpace(i) {
  form.value.spaces.splice(i, 1)
}

function addSubItem(si) {
  form.value.spaces[si].subItems.push({label: '', done: false})
}

function removeSubItem(si, idx) {
  form.value.spaces[si].subItems.splice(idx, 1)
}

function syncSpaceDone(s) {
  if (s.subItems && s.subItems.length) {
    s.done = s.subItems.every(sub => sub.done)
  }
}

async function submitForm() {
  saving.value = true
  try {
    const url = editingId.value ? `${BASE()}/update` : `${BASE()}/save`
    const method = editingId.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(form.value),
    })
    const data = await res.json()
    if (data.success) {
      showForm.value = false
      await fetchRecords()
    } else {
      alert('儲存失敗：' + (data.message || ''))
    }
  } catch (e) {
    alert('網路錯誤：' + e.message)
  } finally {
    saving.value = false
  }
}

async function deleteRecord(id) {
  if (!confirm('確定刪除這筆記錄？')) return
  try {
    await fetch(`${BASE()}/delete/${id}`, {method: 'DELETE'})
    await fetchRecords()
    if (expandedId.value === id) expandedId.value = null
  } catch (e) {
    alert('刪除失敗：' + e.message)
  }
}

// ── 進度計算 ──────────────────────────────────────────────────────
function spaceSubDone(s) {
  if (!s.subItems || !s.subItems.length) return {done: s.done ? 1 : 0, total: 1}
  return {done: s.subItems.filter(x => x.done).length, total: s.subItems.length}
}

function doneCount(record) {
  let done = 0, total = 0
  for (const s of (record.spaces || [])) {
    const c = spaceSubDone(s);
    done += c.done;
    total += c.total
  }
  for (const c of (record.checks || [])) {
    total++;
    if (c.done) done++
  }
  return {done, total}
}

function progressColor(record) {
  const {done, total} = doneCount(record)
  if (total === 0) return 'bg-stone-300'
  const pct = done / total
  if (pct === 1) return 'bg-green-500'
  if (pct >= 0.5) return 'bg-yellow-400'
  return 'bg-red-400'
}

const weekdayColor = {
  '星期一': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  '星期二': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  '星期三': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  '星期四': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  '星期五': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  '星期六': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  '星期日': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

function dayClass(day) {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-teal-700 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold hover:bg-teal-200'
  return 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
}

onMounted(fetchRecords)
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors">

    <!-- Header -->
    <header
      class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-14 z-20">
      <div class="max-w-2xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white flex-shrink-0"
             style="font-size:14px">📋
        </div>
        <div class="flex-1">
          <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none" style="font-size:15px">
            工作規劃執行紀錄表</h1>
        </div>
        <button
          class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors flex-shrink-0"
          style="font-size:13px"
          @click="openAddForm"
        >
          <span class="text-base leading-none">＋</span> 新增
        </button>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4">

      <!-- 日曆折疊 -->
      <div
        class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm mb-4 overflow-hidden">
        <button
          class="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-700/50 transition-colors"
          @click="calOpen = !calOpen"
        >
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span class="font-medium text-stone-700 dark:text-stone-200" style="font-size:14px">{{
                selectedDate
              }}</span>
            <span v-if="recordDates.has(selectedDate)" class="w-2 h-2 rounded-full bg-teal-500 inline-block"/>
          </div>
          <svg class="w-4 h-4 text-stone-400 transition-transform flex-shrink-0" :class="calOpen ? 'rotate-180' : ''"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-if="calOpen" class="border-t border-stone-100 dark:border-stone-700 px-4 pb-4 pt-3">
          <div class="flex items-center justify-between mb-3">
            <button class="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-700" @click="prevMonth">
              <svg class="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span class="font-semibold text-stone-700 dark:text-stone-200" style="font-size:14px">{{
                calYear
              }} 年 {{ calMonth }} 月</span>
            <button class="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-700" @click="nextMonth">
              <svg class="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <div class="grid grid-cols-7 mb-1">
            <div v-for="d in ['日','一','二','三','四','五','六']" :key="d"
                 class="text-center text-stone-400 dark:text-stone-500 font-medium" style="font-size:11px">{{ d }}
            </div>
          </div>
          <div class="grid grid-cols-7 gap-0.5">
            <button
              v-for="(day, i) in calendarDays" :key="i"
              class="relative aspect-square rounded-lg flex items-center justify-center transition-colors text-sm"
              :class="dayClass(day)"
              :disabled="!day.date"
              @click="day.date && pickDate(day.date)"
            >
              {{ day.label }}
              <span v-if="day.date && recordDates.has(day.date) && day.date !== selectedDate"
                    class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-400"/>
            </button>
          </div>
        </div>
      </div>

      <!-- 記錄清單 -->
      <div v-if="loading" class="flex justify-center py-10">
        <div class="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/>
      </div>

      <div v-else-if="selectedRecords.length === 0" class="text-center py-10">
        <div class="text-3xl mb-2">📋</div>
        <p class="text-stone-400 dark:text-stone-500" style="font-size:14px">{{ selectedDate }} 尚無記錄</p>
        <button class="mt-3 px-4 py-2 rounded-xl bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors"
                style="font-size:13px" @click="openAddForm">新增今日記錄
        </button>
      </div>

      <div v-else class="space-y-3">
        <div v-for="rec in selectedRecords" :key="rec.id"
             class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
          <!-- 卡片標題 -->
          <button
            class="w-full px-4 py-3 flex items-center gap-3 hover:bg-stone-50 dark:hover:bg-zinc-700/50 transition-colors text-left"
            @click="toggleExpand(rec.id)">
            <div
              class="flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-700/50">
              <span class="font-bold text-stone-700 dark:text-stone-200 leading-none"
                    style="font-size:13px">{{ doneCount(rec).done }}</span>
              <span class="text-stone-400 dark:text-stone-500 leading-none"
                    style="font-size:10px">/{{ doneCount(rec).total }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  :class="['px-1.5 py-0.5 rounded-md font-medium flex-shrink-0', weekdayColor[rec.weekday] || 'bg-stone-100 text-stone-600']"
                  style="font-size:11px">{{ rec.weekday }}</span>
                <span v-if="rec.staff" class="text-stone-600 dark:text-stone-300 font-medium truncate"
                      style="font-size:13px">{{ rec.staff }}</span>
              </div>
              <div class="mt-1.5 h-1.5 rounded-full bg-stone-100 dark:bg-zinc-600 overflow-hidden w-full">
                <div
                  class="h-full rounded-full transition-all"
                  :class="progressColor(rec)"
                  :style="`width:${doneCount(rec).total ? Math.round(doneCount(rec).done/doneCount(rec).total*100) : 0}%`"
                />
              </div>
            </div>
            <svg class="w-4 h-4 text-stone-400 flex-shrink-0 transition-transform"
                 :class="expandedId === rec.id ? 'rotate-180' : ''" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          <!-- 展開詳情 -->
          <div v-if="expandedId === rec.id"
               class="border-t border-stone-100 dark:border-stone-700 px-4 pb-4 pt-3 space-y-4">
            <p v-if="rec.note" class="text-stone-500 dark:text-stone-400 italic" style="font-size:13px">{{
                rec.note
              }}</p>

            <!-- 各空間 -->
            <div v-if="rec.spaces?.length">
              <p class="font-semibold text-stone-600 dark:text-stone-300 mb-2 flex items-center gap-1.5"
                 style="font-size:12px">
                <span class="text-base">🏢</span> 一、各空間例行工作
              </p>
              <div class="space-y-1.5">
                <div
                  v-for="(s, si) in rec.spaces" :key="si"
                  class="rounded-xl border overflow-hidden"
                  :class="spaceSubDone(s).done === spaceSubDone(s).total ? 'border-green-200 dark:border-green-800' : 'border-stone-200 dark:border-stone-600'"
                >
                  <button
                    class="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                    :class="spaceSubDone(s).done === spaceSubDone(s).total ? 'bg-green-50 dark:bg-green-900/20' : 'bg-stone-50 dark:bg-zinc-700/40'"
                    @click="toggleSpaceExpand(rec.id, si)"
                  >
                    <span
                      :class="spaceSubDone(s).done === spaceSubDone(s).total ? 'text-green-600 dark:text-green-400' : 'text-stone-300 dark:text-stone-500'"
                      class="font-bold flex-shrink-0" style="font-size:14px"
                    >{{ spaceSubDone(s).done === spaceSubDone(s).total ? '✓' : '○' }}</span>
                    <span class="flex-1 font-medium text-stone-700 dark:text-stone-200" style="font-size:13px">{{
                        s.name
                      }}</span>
                    <span v-if="s.note" class="text-stone-400 flex-shrink-0 mr-1" style="font-size:11px">{{
                        s.note
                      }}</span>
                    <span class="text-stone-400 flex-shrink-0" style="font-size:11px">{{
                        spaceSubDone(s).done
                      }}/{{ spaceSubDone(s).total }}</span>
                    <svg class="w-3.5 h-3.5 text-stone-400 flex-shrink-0 transition-transform ml-1"
                         :class="isSpaceExpanded(rec.id, si) ? 'rotate-180' : ''" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  <div v-if="isSpaceExpanded(rec.id, si)"
                       class="border-t border-stone-100 dark:border-stone-700 px-3 py-2 space-y-1">
                    <div v-for="(sub, subI) in s.subItems" :key="subI" class="flex items-center gap-2">
                      <span :class="sub.done ? 'text-green-500' : 'text-stone-300 dark:text-stone-600'"
                            style="font-size:12px">{{ sub.done ? '●' : '○' }}</span>
                      <span
                        :class="['flex-1', sub.done ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-stone-600 dark:text-stone-300']"
                        style="font-size:12px">{{ sub.label }}</span>
                    </div>
                    <p v-if="s.remark"
                       class="text-rose-600 dark:text-rose-400 pt-1.5 border-t border-stone-100 dark:border-stone-700 mt-1"
                       style="font-size:12px">⚠ {{ s.remark }}</p>
                  </div>
                  <div v-else-if="s.remark" class="border-t border-stone-100 dark:border-stone-700 px-3 py-1.5">
                    <p class="text-rose-600 dark:text-rose-400" style="font-size:12px">⚠ {{ s.remark }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 16:30 關門檢查 -->
            <div v-if="rec.checks?.length">
              <p class="font-semibold text-stone-600 dark:text-stone-300 mb-2 flex items-center gap-1.5"
                 style="font-size:12px">
                <span class="text-base">🔒</span> 二、16:30 關門檢查
              </p>
              <div class="space-y-1.5">
                <div
                  v-for="(c, ci) in rec.checks" :key="ci"
                  class="flex items-start gap-2 rounded-xl px-3 py-2 border"
                  :class="c.done ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-stone-50 dark:bg-zinc-700/40 border-stone-200 dark:border-stone-600'"
                >
                  <span :class="c.done ? 'text-green-600 dark:text-green-400' : 'text-stone-300 dark:text-stone-500'"
                        class="font-bold flex-shrink-0 mt-px" style="font-size:14px">{{ c.done ? '✓' : '○' }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-stone-700 dark:text-stone-200" style="font-size:13px">{{ c.item }}</p>
                    <p v-if="c.remark" class="text-rose-600 dark:text-rose-400 mt-0.5" style="font-size:12px">⚠
                      {{ c.remark }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作 -->
            <div class="flex gap-2 pt-1">
              <button
                class="flex-1 py-2 rounded-xl border border-teal-600 text-teal-700 dark:text-teal-400 font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                style="font-size:13px" @click="openEditForm(rec)">編輯
              </button>
              <button
                class="px-4 py-2 rounded-xl border border-red-300 text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                style="font-size:13px" @click="deleteRecord(rec.id)">刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 新增／編輯 Modal ── -->
    <Teleport to="body">
      <div v-if="showForm"
           class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
        <div
          class="bg-white dark:bg-zinc-900 w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">

          <!-- Modal Header -->
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-700 flex-shrink-0">
            <h2 class="font-bold text-stone-800 dark:text-stone-100" style="font-size:15px">
              {{ editingId ? '編輯記錄' : '新增執行記錄' }}</h2>
            <button class="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1" @click="showForm = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="overflow-y-auto flex-1 px-4 py-4 space-y-4">

            <!-- ▸ 流程提示 -->
            <div
              class="rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 px-3 py-2.5 flex items-start gap-2">
              <span class="flex-shrink-0 text-teal-600 dark:text-teal-400 font-bold mt-px"
                    style="font-size:13px">▸</span>
              <p class="text-teal-700 dark:text-teal-300 leading-relaxed" style="font-size:12px">
                各空間作業流程：<strong>1330 啟動暖機</strong> → 環境巡視與整理 → 設施清點與紀錄 → <strong>1630
                關機上鎖</strong>
              </p>
            </div>

            <!-- 基本資訊 -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-stone-500 dark:text-stone-400 font-medium mb-1"
                       style="font-size:12px">日期</label>
                <input v-model="form.date" type="date"
                       class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                       style="font-size:13px"/>
              </div>
              <div>
                <label class="block text-stone-500 dark:text-stone-400 font-medium mb-1"
                       style="font-size:12px">星期</label>
                <select v-model="form.weekday"
                        class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        style="font-size:13px">
                  <option v-for="w in WEEKDAYS" :key="w" :value="w">{{ w }}</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-stone-500 dark:text-stone-400 font-medium mb-1"
                     style="font-size:12px">執行人員</label>
              <input v-model="form.staff" type="text" placeholder="姓名"
                     class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                     style="font-size:13px"/>
            </div>

            <div>
              <label class="block text-stone-500 dark:text-stone-400 font-medium mb-1"
                     style="font-size:12px">整體備注</label>
              <textarea v-model="form.note" rows="2" placeholder="可選填整體補充說明…"
                        class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                        style="font-size:13px"/>
            </div>

            <!-- 各空間例行工作 -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-1.5"
                   style="font-size:13px"><span>🏢</span> 一、各空間例行工作</p>
                <button class="text-teal-600 font-medium hover:underline" style="font-size:12px" @click="addSpace">＋
                  新增空間
                </button>
              </div>
              <div class="space-y-2">
                <div v-for="(s, si) in form.spaces" :key="si"
                     class="rounded-xl border border-stone-200 dark:border-stone-600 overflow-hidden">
                  <!-- 空間標題列 -->
                  <div class="flex items-center gap-2 px-3 py-2 bg-stone-50 dark:bg-zinc-800">
                    <button class="flex items-center gap-1.5 flex-1 min-w-0 text-left" @click="toggleFormSpace(si)">
                      <svg class="w-3.5 h-3.5 text-stone-400 flex-shrink-0 transition-transform"
                           :class="expandedFormSpaceIdx.has(si) ? 'rotate-90' : ''" fill="none" stroke="currentColor"
                           viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                      <input v-model="s.name" type="text" placeholder="空間名稱"
                             class="flex-1 bg-transparent text-stone-800 dark:text-stone-100 focus:outline-none font-medium"
                             style="font-size:13px" @click.stop/>
                    </button>
                    <span class="text-stone-400 text-xs flex-shrink-0">{{
                        s.subItems.filter(x => x.done).length
                      }}/{{ s.subItems.length }}</span>
                    <button class="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0 ml-1"
                            @click="removeSpace(si)">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>

                  <!-- 子項清單 -->
                  <div v-if="expandedFormSpaceIdx.has(si)"
                       class="border-t border-stone-100 dark:border-stone-700 px-3 py-2 space-y-1.5">
                    <div v-for="(sub, subI) in s.subItems" :key="subI" class="flex items-center gap-2">
                      <input v-model="sub.done" type="checkbox" class="w-4 h-4 rounded accent-teal-600 flex-shrink-0"
                             @change="syncSpaceDone(s)"/>
                      <input v-model="sub.label" type="text" placeholder="工作項目"
                             class="flex-1 text-stone-700 dark:text-stone-300 bg-transparent focus:outline-none"
                             style="font-size:12px"/>
                      <button class="text-stone-200 hover:text-red-400 flex-shrink-0 transition-colors"
                              @click="removeSubItem(si, subI)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <button class="text-teal-500 hover:text-teal-700 dark:hover:text-teal-300 mt-1"
                            style="font-size:12px" @click="addSubItem(si)">＋ 新增項目
                    </button>
                    <div class="border-t border-stone-100 dark:border-stone-700 pt-2 mt-1">
                      <input v-model="s.remark" type="text" placeholder="⚠ 異常備注（可空白）"
                             class="w-full bg-transparent text-rose-600 dark:text-rose-400 placeholder-stone-300 dark:placeholder-stone-600 focus:outline-none"
                             style="font-size:12px"/>
                    </div>
                  </div>
                  <div v-else-if="s.remark" class="border-t border-stone-100 dark:border-stone-700 px-3 py-1.5">
                    <p class="text-rose-600 dark:text-rose-400" style="font-size:12px">⚠ {{ s.remark }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 16:30 關門檢查 -->
            <div>
              <p class="font-semibold text-stone-600 dark:text-stone-300 mb-2 flex items-center gap-1.5"
                 style="font-size:13px"><span>🔒</span> 二、16:30 關門檢查</p>
              <div class="space-y-2">
                <div v-for="(c, ci) in form.checks" :key="ci"
                     class="rounded-xl border border-stone-200 dark:border-stone-600 overflow-hidden">
                  <div class="flex items-center gap-2 px-3 py-2 bg-stone-50 dark:bg-zinc-800">
                    <input v-model="c.done" type="checkbox" class="w-4 h-4 rounded accent-teal-600 flex-shrink-0"/>
                    <span class="flex-1 text-stone-700 dark:text-stone-300" style="font-size:13px">{{ c.item }}</span>
                  </div>
                  <div v-if="c.detail" class="px-3 py-1.5 border-t border-stone-100 dark:border-stone-700">
                    <p class="text-stone-400 dark:text-stone-500 leading-relaxed" style="font-size:11px">{{
                        c.detail
                      }}</p>
                  </div>
                  <div class="px-3 py-2 border-t border-stone-100 dark:border-stone-700">
                    <input v-model="c.remark" type="text" placeholder="⚠ 異常備注（可空白）"
                           class="w-full bg-transparent text-rose-600 dark:text-rose-400 placeholder-stone-300 dark:placeholder-stone-600 focus:outline-none"
                           style="font-size:12px"/>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="flex gap-2 px-4 py-3 border-t border-stone-100 dark:border-stone-700 flex-shrink-0">
            <button
              class="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
              style="font-size:14px" @click="showForm = false">取消
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
              style="font-size:14px" :disabled="saving" @click="submitForm">
              <span v-if="saving">儲存中…</span>
              <span v-else>{{ editingId ? '更新' : '儲存' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
