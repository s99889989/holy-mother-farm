<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'health-activities.body-composition' })

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/tabc'

// ── 頁籤 ──────────────────────────────────────────────
const mainTabs = [
  { key: 'overview', label: '總覽' },
  { key: 'customers', label: '客戶查詢' },
  { key: 'progress', label: '進步排行' }
] as const
const currentTab = ref<'overview' | 'customers' | 'progress'>('overview')

// ── 儀表板統計 ──────────────────────────────────────────
const stats = ref<any>(null)
const latestRecords = ref<any[]>([])

async function loadStats() {
  try { stats.value = await $fetch<any>(`${BASE()}/stats`) } catch { stats.value = null }
}
async function loadLatest() {
  try { latestRecords.value = await $fetch<any[]>(`${BASE()}/records/latest`, { params: { limit: 15 } }) ?? [] }
  catch { latestRecords.value = [] }
}

const bmiCategoryList = computed(() => {
  const cats = stats.value?.bmi_categories ?? {}
  const total = Object.values(cats).reduce((a: number, b: any) => a + (b || 0), 0) || 1
  const colorMap: Record<string, string> = {
    過輕: 'bg-sky-400', 正常: 'bg-emerald-500', 過重: 'bg-amber-400', 肥胖: 'bg-rose-500'
  }
  return Object.entries(cats).map(([label, value]: [string, any]) => ({
    label, value, pct: Math.round((value / total) * 100), color: colorMap[label] ?? 'bg-gray-400'
  }))
})

const genderPct = computed(() => {
  const f = stats.value?.gender?.F ?? 0
  const m = stats.value?.gender?.M ?? 0
  const total = f + m || 1
  return { F: Math.round((f / total) * 100), M: Math.round((m / total) * 100) }
})

// ── 客戶列表 ──────────────────────────────────────────
const GROUP_LS_KEY = 'holy-tabc-group-filter'

function loadGroupFromLS(): string {
  if (typeof window === 'undefined') return ''
  try { return window.localStorage.getItem(GROUP_LS_KEY) ?? '' } catch { return '' }
}
function saveGroupToLS(v: string) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(GROUP_LS_KEY, v) } catch { /* localStorage 不可用就略過 */ }
}

const keyword = ref('')
const groupFilter = ref(loadGroupFromLS()) // 記住上次選的班別頁籤
const groups = ref<any[]>([])
const page = ref(1)
const limit = ref(20)
const listData = ref<any>(null)

async function loadGroups() {
  try { groups.value = await $fetch<any[]>(`${BASE()}/groups`) ?? [] }
  catch { groups.value = [] }
}

// 頁籤清單：「全部」+ 各班別（含人數）
const groupTabs = computed(() => {
  const totalCount = stats.value?.total_customers ?? groups.value.reduce((sum, g) => sum + (g.count || 0), 0)
  return [{ name: '', label: '全部', count: totalCount }, ...groups.value.map((g: any) => ({ name: g.name, label: g.name, count: g.count }))]
})

function selectGroup(name: string) {
  groupFilter.value = name
  saveGroupToLS(name)
  search()
}

// 產生 /front/body-composition?group=xxx 的免登入分享連結
function buildGroupShareLink(group: string) {
  return `${window.location.origin}/front/body-composition?group=${encodeURIComponent(group)}`
}

async function copyGroupShareLink() {
  if (!groupFilter.value) return
  const url = buildGroupShareLink(groupFilter.value)
  try {
    await navigator.clipboard.writeText(url)
    alert(`✅ 已複製「${groupFilter.value}」的分享連結：\n${url}`)
  } catch {
    prompt('請手動複製連結：', url)
  }
}

function openGroupShareLink() {
  if (!groupFilter.value) return
  window.open(buildGroupShareLink(groupFilter.value), '_blank', 'noopener')
}

async function refreshList() {
  try {
    listData.value = await $fetch<any>(`${BASE()}/customers`, {
      params: { keyword: keyword.value, group: groupFilter.value, page: page.value, limit: limit.value }
    })
  } catch { listData.value = null }
}

const totalPages = computed(() => Math.ceil((listData.value?.total || 0) / limit.value) || 1)

function search() { page.value = 1; refreshList() }
function resetSearch() {
  keyword.value = ''
  groupFilter.value = ''
  saveGroupToLS('')
  page.value = 1
  refreshList()
}

// ── 客戶詳情 ──────────────────────────────────────────
const selectedPatnr = ref<number | null>(null)
const selectedCustomer = ref<any>(null)
const customerRecords = ref<any[]>([])
const customerLoading = ref(false)

async function openCustomer(patnr: number) {
  currentTab.value = 'customers'
  selectedPatnr.value = patnr
  customerLoading.value = true
  try {
    const [cust, recs] = await Promise.all([
      $fetch<any>(`${BASE()}/customers/${patnr}`),
      $fetch<any[]>(`${BASE()}/customers/${patnr}/records`)
    ])
    selectedCustomer.value = cust
    customerRecords.value = recs ?? []
  } catch {
    selectedCustomer.value = null
    customerRecords.value = []
  } finally {
    customerLoading.value = false
  }
  await loadBoundAccount(patnr)
}
function closeCustomer() {
  selectedPatnr.value = null
  selectedCustomer.value = null
  customerRecords.value = []
  closeBindPanel()
}

// ── Google 帳號綁定 ────────────────────────────────────
const boundAccount = ref<any>(null)      // { bound, customerId, name, email, picture }
const boundLoading = ref(false)

async function loadBoundAccount(patnr: number) {
  boundLoading.value = true
  try {
    boundAccount.value = await $fetch<any>(`${BASE()}/customers/${patnr}/bound-account`)
  } catch {
    boundAccount.value = null
  } finally {
    boundLoading.value = false
  }
}

// 搜尋 / 選擇 Google 帳號
const bindPanelOpen = ref(false)
const bindKeyword = ref('')
const bindResults = ref<any[]>([])
const bindSearching = ref(false)
const bindSubmitting = ref(false)

function openBindPanel() {
  bindPanelOpen.value = true
  bindKeyword.value = ''
  bindResults.value = []
}
function closeBindPanel() {
  bindPanelOpen.value = false
  bindKeyword.value = ''
  bindResults.value = []
}

let bindSearchTimer: ReturnType<typeof setTimeout> | null = null
function onBindKeywordInput() {
  if (bindSearchTimer) clearTimeout(bindSearchTimer)
  bindSearchTimer = setTimeout(searchBindAccounts, 300)
}

async function searchBindAccounts() {
  const kw = bindKeyword.value.trim()
  if (!kw) { bindResults.value = []; return }
  bindSearching.value = true
  try {
    bindResults.value = await $fetch<any[]>(`${BASE()}/google-accounts/search`, {
      params: { keyword: kw }
    }) ?? []
  } catch {
    bindResults.value = []
  } finally {
    bindSearching.value = false
  }
}

async function selectBindAccount(account: any) {
  if (!selectedPatnr.value) return
  if (account.tabcPatnr && account.tabcPatnr !== String(selectedPatnr.value)) {
    if (!confirm(`「${account.name || account.email}」目前已綁定其他客戶編號（PATNR=${account.tabcPatnr}），\n改綁後將自動解除原本的綁定，確定要繼續嗎？`)) {
      return
    }
  }
  bindSubmitting.value = true
  try {
    const data = await $fetch<any>(`${BASE()}/customers/${selectedPatnr.value}/bind`, {
      method: 'PUT',
      body: { customerId: account.customerId }
    })
    if (data?.error) { alert('綁定失敗：' + data.error); return }
    closeBindPanel()
    await loadBoundAccount(selectedPatnr.value)
  } catch (e: any) {
    alert('綁定失敗：' + (e?.data?.error ?? e?.statusMessage ?? '未知錯誤'))
  } finally {
    bindSubmitting.value = false
  }
}

async function unbindAccount() {
  if (!selectedPatnr.value || !boundAccount.value?.bound) return
  if (!confirm(`確定要解除「${boundAccount.value.name || boundAccount.value.email}」與此客戶編號的綁定嗎？`)) return
  try {
    await $fetch(`${BASE()}/customers/${selectedPatnr.value}/unbind`, { method: 'PUT' })
    await loadBoundAccount(selectedPatnr.value)
  } catch (e: any) {
    alert('解除綁定失敗：' + (e?.data?.error ?? e?.statusMessage ?? '未知錯誤'))
  }
}

// ── 標準範圍色帶（BMI / 體脂率 / 內臟脂肪）─────────────────────
// 性別欄位正規化：資料庫實際存的格式不確定（可能有大小寫/空白/其他代碼），
// 用寬鬆比對取代完全比對；比對不到已知格式時，直接顯示原始值方便排查，而不是靜默顯示空白
function sexCode(v: any): 'M' | 'F' | '' {
  if (v === null || v === undefined) return ''
  const s = String(v).trim().toUpperCase()
  if (s === 'M' || s === 'MALE' || s === '1' || s === '男') return 'M'
  if (s === 'F' || s === 'FEMALE' || s === '2' || s === '女') return 'F'
  return ''
}
function sexLabel(v: any) {
  const code = sexCode(v)
  if (code === 'M') return '男'
  if (code === 'F') return '女'
  const raw = v === null || v === undefined ? '' : String(v).trim()
  return raw
}

// 分區依台灣衛福部 BMI 標準與 InBody 常用體脂率/內臟脂肪等級改編
const BMI_ZONES = [
  { to: 18.5, label: '過輕', color: '#38bdf8' },
  { to: 24, label: '正常', color: '#10b981' },
  { to: 27, label: '過重', color: '#f59e0b' },
  { to: 40, label: '肥胖', color: '#f43f5e' }
]
function fatZones(sex: string) {
  return sex === 'M'
    ? [{ to: 14, label: '過低', color: '#38bdf8' }, { to: 20, label: '正常', color: '#10b981' }, { to: 25, label: '過重', color: '#f59e0b' }, { to: 50, label: '偏高', color: '#f43f5e' }]
    : [{ to: 21, label: '過低', color: '#38bdf8' }, { to: 27, label: '正常', color: '#10b981' }, { to: 32, label: '過重', color: '#f59e0b' }, { to: 55, label: '偏高', color: '#f43f5e' }]
}
const VISZFAT_ZONES = [
  { to: 10, label: '正常', color: '#10b981' },
  { to: 15, label: '偏高', color: '#f59e0b' },
  { to: 30, label: '過高', color: '#f43f5e' }
]

function buildRangeBar(title: string, value: any, zones: { to: number, label: string, color: string }[], digits = 1) {
  const n = Number(value)
  if (Number.isNaN(n)) return null
  const max = zones[zones.length - 1].to
  let from = 0
  const segments = zones.map(z => {
    const seg = { left: (from / max) * 100, width: ((z.to - from) / max) * 100, color: z.color, label: z.label }
    from = z.to
    return seg
  })
  const markerPct = Math.min(100, Math.max(0, (n / max) * 100))
  const activeZone = zones.find(z => n <= z.to) ?? zones[zones.length - 1]
  return { title, valueLabel: n.toFixed(digits), segments, markerPct, markerColor: activeZone.color }
}

const latestRecord = computed(() => customerRecords.value[0] ?? null)

const rangeBars = computed(() => {
  if (!latestRecord.value) return []
  const sex = sexCode(selectedCustomer.value?.sex) || 'F'
  return [
    buildRangeBar('BMI', latestRecord.value.bmi, BMI_ZONES),
    buildRangeBar('體脂率 %', latestRecord.value.fatp, fatZones(sex)),
    buildRangeBar('內臟脂肪等級', latestRecord.value.vfatl, VISZFAT_ZONES, 0)
  ].filter((b): b is NonNullable<typeof b> => b !== null)
})

// ── 歷史趨勢折線圖（純 SVG，不需額外圖表套件）───────────────
function buildTrend(key: string, title: string, color: string, digits = 1) {
  const recs = [...customerRecords.value].reverse()
    .filter(r => r[key] !== null && r[key] !== undefined && r[key] !== '')
  if (recs.length < 2) return null
  const values = recs.map(r => Number(r[key]))
  const w = 300, h = 90, padX = 8, padY = 14
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = (max - min) || 1
  const stepX = (w - padX * 2) / (recs.length - 1)
  const pts = values.map((v, i) => ({
    x: padX + i * stepX,
    y: h - padY - ((v - min) / range) * (h - padY * 2),
    vLabel: v.toFixed(digits)
  }))
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')
  const area = path + ` L${pts[pts.length - 1].x.toFixed(1)},${h - padY} L${pts[0].x.toFixed(1)},${h - padY} Z`
  return {
    key, title, color, w, h, path, area, pts,
    firstLabel: fmtDate(recs[0].datetime),
    lastValue: values[values.length - 1].toFixed(digits),
    maxLabel: max.toFixed(digits),
    minLabel: min.toFixed(digits),
    maxY: pts.reduce((a, p) => Math.min(a, p.y), h),
    minY: pts.reduce((a, p) => Math.max(a, p.y), 0)
  }
}

const trendCharts = computed(() => {
  if (customerRecords.value.length < 2) return []
  return [
    buildTrend('bmi', 'BMI', '#0d9488'),
    buildTrend('fatp', '體脂率', '#f43f5e'),
    buildTrend('pmm', '肌肉量', '#10b981'),
    buildTrend('vfatl', '內臟脂肪', '#f59e0b', 0)
  ].filter((t): t is NonNullable<typeof t> => t !== null)
})

// ── 格式化輔助 ────────────────────────────────────────
function fmtNum(v: any, digits = 1) {
  if (v === null || v === undefined || v === '') return '–'
  const n = Number(v)
  if (Number.isNaN(n)) return '–'
  return n.toFixed(digits)
}
function fmtDate(v: any) {
  if (!v) return '–'
  return String(v).slice(0, 10)
}
function bmiTagClass(bmi: any) {
  const n = Number(bmi)
  const base = 'inline-block px-1.5 py-0.5 rounded text-[11px] font-mono'
  if (Number.isNaN(n)) return base
  if (n >= 27) return `${base} bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300`
  if (n >= 24) return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`
  if (n < 18.5) return `${base} bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300`
  return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`
}

// ── 上傳 GMON3.GDB ────────────────────────────────────
const dbFileInput = ref<HTMLInputElement | null>(null)
const dbUploading = ref(false)

async function onDbFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.name.toUpperCase().endsWith('.GDB')) return alert('只接受 .GDB 檔案')
  if (!confirm(`確定要用「${file.name}」覆蓋伺服器上的 GMON3.GDB？\n⚠️ 此操作無法還原！`)) {
    input.value = ''
    return
  }
  dbUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch(`${BASE()}/upload-db`, { method: 'POST', body: fd })
    alert('✅ GMON3.GDB 已成功更新！')
    closeCustomer()
    await Promise.all([loadStats(), loadLatest(), loadGroups(), refreshList()])
  } catch (err: any) {
    alert('❌ 上傳失敗：' + (err?.data?.error ?? err?.statusMessage ?? '未知錯誤'))
  } finally {
    dbUploading.value = false
    input.value = ''
  }
}

// ── 進步排行 ──────────────────────────────────────────
const PROGRESS_METRICS = [
  { key: 'weight', label: '體重kg', better: 'down' },
  { key: 'bmi', label: 'BMI', better: 'down' },
  { key: 'fatp', label: '體脂率%', better: 'down' },
  { key: 'fatm', label: '體脂重kg', better: 'down' },
  { key: 'pmm', label: '肌肉量kg', better: 'up' },
  { key: 'vfatl', label: '內臟脂肪等級', better: 'down' },
  { key: 'bonem', label: '骨量kg', better: 'up' },
  { key: 'tbw', label: '體水分kg', better: 'up' },
  { key: 'bmr', label: '基礎代謝', better: 'up' },
  { key: 'metaage', label: '體內年齡', better: 'down' }
] as const

function toDateInputStr(d: Date) {
  return d.toISOString().slice(0, 10)
}
const todayD = new Date()
const threeMonthsAgoD = new Date(todayD)
threeMonthsAgoD.setMonth(threeMonthsAgoD.getMonth() - 3)

const progressGroup = ref('') // 空字串＝全部班別
const progressStart = ref(toDateInputStr(threeMonthsAgoD))
const progressEnd = ref(toDateInputStr(todayD))
const progressMetric = ref<string>('fatp')
const progressData = ref<any>(null)
const progressLoading = ref(false)

async function loadProgress() {
  if (!progressStart.value || !progressEnd.value) return
  progressLoading.value = true
  try {
    progressData.value = await $fetch<any>(`${BASE()}/progress`, {
      params: { group: progressGroup.value, start: progressStart.value, end: progressEnd.value }
    })
  } catch {
    progressData.value = null
  } finally {
    progressLoading.value = false
  }
}

const currentMetricInfo = computed(() =>
  PROGRESS_METRICS.find(m => m.key === progressMetric.value) ?? PROGRESS_METRICS[0]
)

// 依所選指標排序：better === 'down' 時差值越負代表進步越多，反之越正代表進步越多
const rankedProgress = computed(() => {
  const metric = currentMetricInfo.value
  const rows = [...(progressData.value?.rows ?? [])]
  rows.sort((a: any, b: any) => {
    const da = a.delta?.[metric.key]
    const db = b.delta?.[metric.key]
    if (da == null && db == null) return 0
    if (da == null) return 1
    if (db == null) return -1
    const scoreA = metric.better === 'down' ? -da : da
    const scoreB = metric.better === 'down' ? -db : db
    return scoreB - scoreA
  })
  return rows
})

function deltaClass(delta: number | null | undefined, better: 'up' | 'down') {
  if (delta === null || delta === undefined) return 'text-hint-c'
  if (delta === 0) return 'text-hint-c'
  const improved = better === 'down' ? delta < 0 : delta > 0
  return improved
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400'
}
function fmtDelta(v: number | null | undefined, digits = 1) {
  if (v === null || v === undefined) return '–'
  const sign = v > 0 ? '+' : ''
  return sign + v.toFixed(digits)
}

// 第一次切到「進步排行」頁籤時自動查一次（用預設的近 3 個月、全部班別）
watch(currentTab, (t) => {
  if (t === 'progress' && !progressData.value && !progressLoading.value) loadProgress()
})

onMounted(async () => {
  await Promise.all([loadStats(), loadLatest(), loadGroups(), refreshList()])
})
</script>

<template>
  <div class="p-4 xl:px-8 max-w-screen-xl 2xl:max-w-none mx-auto text-sm text-base-c">
    <!-- 標題 -->
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div class="text-base font-bold text-muted-c dark:text-hint-c">
        身體組成分析
      </div>
      <!-- 上傳 GMON3.GDB -->
      <div class="flex items-center gap-2">
        <input
          ref="dbFileInput"
          type="file"
          accept=".gdb,.GDB"
          class="hidden"
          @change="onDbFileChange"
        >
        <button
          :disabled="dbUploading"
          class="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm"
          @click="(dbFileInput as HTMLInputElement)?.click()"
        >
          {{ dbUploading ? '上傳中…' : '⬆️ 上傳 GMON3.GDB' }}
        </button>
      </div>
    </div>

    <!-- ════════════════════════ 頁籤導覽 ════════════════════════ -->
    <div class="flex gap-1 border-b border-base mb-5">
      <button
        v-for="t in mainTabs"
        :key="t.key"
        class="px-4 py-2 text-sm border-b-2 -mb-px transition-colors"
        :class="currentTab === t.key
          ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-semibold'
          : 'border-transparent text-muted-c dark:text-hint-c hover:text-base-c'"
        @click="currentTab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ════════════════════════ 總覽 ════════════════════════ -->
    <div v-show="currentTab === 'overview'">

      <!-- ════════════════════════ KPI 卡片 ════════════════════════ -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div class="border border-base rounded-md p-3 bg-surface">
          <div class="text-xl font-bold text-base-c">
            {{ stats?.total_customers ?? '–' }}
          </div>
          <div class="text-xs text-hint-c dark:text-hint-c">
            建檔客戶數
          </div>
        </div>
        <div class="border border-base rounded-md p-3 bg-surface">
          <div class="text-xl font-bold text-base-c">
            {{ stats?.total_measurements ?? '–' }}
          </div>
          <div class="text-xs text-hint-c dark:text-hint-c">
            檢測總筆數
          </div>
        </div>
        <div class="border border-base rounded-md p-3 bg-surface">
          <div class="text-xl font-bold text-base-c">
            {{ stats?.avg_bmi ?? '–' }}
          </div>
          <div class="text-xs text-hint-c dark:text-hint-c">
            平均 BMI
          </div>
        </div>
        <div class="border border-base rounded-md p-3 bg-surface">
          <div class="text-xl font-bold text-base-c">
            {{ stats?.avg_fatp ?? '–' }}%
          </div>
          <div class="text-xs text-hint-c dark:text-hint-c">
            平均體脂率
          </div>
        </div>
      </div>

      <!-- BMI 分類 / 性別比例 -->
      <div class="grid md:grid-cols-2 gap-3 mb-6">
        <div class="border border-base rounded-md p-4 bg-surface">
          <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-3">
            BMI 分類分布
          </div>
          <div
            v-for="cat in bmiCategoryList"
            :key="cat.label"
            class="flex items-center gap-2 mb-1.5 text-xs"
          >
            <span class="w-10 text-hint-c dark:text-hint-c">{{ cat.label }}</span>
            <div class="flex-1 bg-surface2 rounded h-2 overflow-hidden">
              <div
                class="h-full rounded"
                :class="cat.color"
                :style="{ width: cat.pct + '%' }"
              />
            </div>
            <span class="w-10 text-right text-muted-c">{{ cat.value }}</span>
          </div>
        </div>
        <div class="border border-base rounded-md p-4 bg-surface">
          <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-3">
            性別比例
          </div>
          <div class="flex items-center gap-2 mb-1.5 text-xs">
            <span class="w-10 text-hint-c dark:text-hint-c">女</span>
            <div class="flex-1 bg-surface2 rounded h-2 overflow-hidden">
              <div class="h-full rounded bg-pink-400" :style="{ width: genderPct.F + '%' }" />
            </div>
            <span class="w-10 text-right text-muted-c">{{ stats?.gender?.F ?? 0 }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="w-10 text-hint-c dark:text-hint-c">男</span>
            <div class="flex-1 bg-surface2 rounded h-2 overflow-hidden">
              <div class="h-full rounded bg-blue-400" :style="{ width: genderPct.M + '%' }" />
            </div>
            <span class="w-10 text-right text-muted-c">{{ stats?.gender?.M ?? 0 }}</span>
          </div>
        </div>
      </div>

      <!-- ════════════════════════ 最新檢測動態 ════════════════════════ -->
      <div class="mb-6">
        <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-2">
          最新檢測動態
        </div>
        <div class="overflow-x-auto rounded-md border border-base">
          <table class="w-full border-collapse text-xs">
            <thead class="bg-teal-600 dark:bg-teal-800 text-white">
            <tr>
              <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
                姓名
              </th>
              <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
                日期
              </th>
              <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-right whitespace-nowrap">
                BMI
              </th>
              <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-right whitespace-nowrap">
                體脂率%
              </th>
              <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-right whitespace-nowrap">
                肌肉量kg
              </th>
              <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-right whitespace-nowrap">
                內臟脂肪
              </th>
            </tr>
            </thead>
            <tbody class="divide-y divide-base">
            <tr v-if="!latestRecords.length">
              <td colspan="6" class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c">
                無資料
              </td>
            </tr>
            <tr
              v-for="rec in latestRecords"
              :key="rec.patnr + '-' + rec.datetime"
              class="bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
              @click="openCustomer(rec.patnr)"
            >
              <td class="border border-light-c px-3 py-1 whitespace-nowrap">
                {{ rec.lastname }}{{ rec.firstname }}
              </td>
              <td class="border border-light-c px-3 py-1 whitespace-nowrap font-mono">
                {{ fmtDate(rec.datetime) }}
              </td>
              <td class="border border-light-c px-3 py-1 text-right whitespace-nowrap">
                <span :class="bmiTagClass(rec.bmi)">{{ fmtNum(rec.bmi) }}</span>
              </td>
              <td class="border border-light-c px-3 py-1 text-right whitespace-nowrap">
                {{ fmtNum(rec.fatp) }}
              </td>
              <td class="border border-light-c px-3 py-1 text-right whitespace-nowrap">
                {{ fmtNum(rec.pmm) }}
              </td>
              <td class="border border-light-c px-3 py-1 text-right whitespace-nowrap">
                {{ fmtNum(rec.vfatl, 0) }}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
    <!-- ════════════════════════ /總覽 ════════════════════════ -->

    <!-- ════════════════════════ 客戶查詢 ════════════════════════ -->
    <div v-show="currentTab === 'customers'">

      <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-2">
        客戶查詢
      </div>

      <div class="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-5 lg:items-start">

        <!-- ── 左：搜尋 + 客戶列表 ── -->
        <div class="min-w-0">
          <div class="flex gap-3 mb-3 flex-wrap items-center">
            <input
              v-model="keyword"
              type="text"
              placeholder="姓名 / 客戶編號 / 電話"
              class="border border-base rounded px-3 py-1.5 w-56 bg-surface text-base-c placeholder:text-hint-c dark:placeholder:text-hint-c"
              @keyup.enter="search"
            >
            <select
              :value="groupFilter"
              class="border border-base rounded px-3 py-1.5 bg-surface text-base-c"
              @change="selectGroup(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="g in groupTabs" :key="g.name" :value="g.name">
                {{ g.label }}（{{ g.count }}）
              </option>
            </select>
            <button
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded"
              @click="search"
            >
              查詢
            </button>
            <button
              class="bg-surface2 hover-border text-base-c px-4 py-1.5 rounded"
              @click="resetSearch"
            >
              清除
            </button>
            <button
              v-if="groupFilter"
              class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm"
              title="複製此班別的免登入分享連結"
              @click="copyGroupShareLink"
            >
              🔗 複製「{{ groupFilter }}」分享連結
            </button>
            <button
              v-if="groupFilter"
              class="bg-surface2 hover-border text-base-c px-4 py-1.5 rounded text-sm"
              title="在新分頁開啟此班別的分享頁"
              @click="openGroupShareLink"
            >
              ↗ 開啟連結
            </button>
          </div>

          <div class="flex gap-2 mb-2 items-center text-sm flex-wrap">
            <button
              :disabled="page <= 1"
              class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2"
              @click="page = 1; refreshList()"
            >
              &lt;&lt; 第一頁
            </button>
            <button
              :disabled="page <= 1"
              class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2"
              @click="page--; refreshList()"
            >
              &lt; 前一頁
            </button>
            <span class="text-muted-c">第 {{ page }} 頁 / 共 {{ totalPages }} 頁（{{ listData?.total ?? 0 }} 筆）</span>
            <button
              :disabled="page >= totalPages"
              class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2"
              @click="page++; refreshList()"
            >
              下一頁 &gt;
            </button>
            <button
              :disabled="page >= totalPages"
              class="border border-base px-3 py-1 rounded disabled:opacity-40 bg-surface text-muted-c hover:bg-surface2"
              @click="page = totalPages; refreshList()"
            >
              最後一頁 &gt;&gt;
            </button>
          </div>

          <div class="overflow-x-auto rounded-md border border-base mb-6 lg:mb-0">
            <table class="w-full border-collapse text-sm">
              <thead class="bg-teal-600 dark:bg-teal-800 text-white">
              <tr>
                <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
                  客戶編號
                </th>
                <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
                  姓名
                </th>
                <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-center whitespace-nowrap">
                  性別
                </th>
                <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left">
                  所屬班別
                </th>
                <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
                  建檔日期
                </th>
              </tr>
              </thead>
              <tbody class="divide-y divide-base">
              <tr v-if="!listData?.rows?.length">
                <td colspan="5" class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c">
                  無資料
                </td>
              </tr>
              <tr
                v-for="row in listData?.rows"
                :key="row.patnr"
                class="transition-colors bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                :class="{ 'bg-yellow-100 dark:bg-yellow-900/40 font-semibold': selectedPatnr === row.patnr }"
                @click="openCustomer(row.patnr)"
              >
                <td class="border border-light-c px-3 py-1 font-mono whitespace-nowrap">
                  {{ row.customerid }}
                </td>
                <td class="border border-light-c px-3 py-1 whitespace-nowrap">
                  {{ row.lastname }}{{ row.firstname }}
                </td>
                <td class="border border-light-c px-3 py-1 text-center whitespace-nowrap">
                  {{ sexLabel(row.sex) }}
                </td>
                <td
                  class="border border-light-c px-3 py-1 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis"
                  :title="row.group1"
                >
                  {{ row.group1 }}
                </td>
                <td class="border border-light-c px-3 py-1 whitespace-nowrap">
                  {{ fmtDate(row.creationdate) }}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── 右：客戶詳情 / 歷史紀錄（sticky，跟著捲動）── -->
        <div class="lg:sticky lg:top-4 min-w-0">
          <div v-if="!selectedPatnr" class="border border-base rounded-md p-10 text-center text-hint-c dark:text-hint-c bg-surface">
            ← 從左側列表點選一位客戶查看詳情
          </div>
          <div v-else class="border border-base rounded-md overflow-hidden mb-4">
            <div class="bg-teal-500 dark:bg-teal-700 text-white px-4 py-2 font-bold flex items-center justify-between">
        <span>
          {{ selectedCustomer?.lastname }}{{ selectedCustomer?.firstname }}
          的身體組成歷史紀錄
        </span>
              <button class="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded" @click="closeCustomer">
                ✕ 關閉
              </button>
            </div>
            <div class="p-4 bg-surface">
              <div v-if="customerLoading" class="text-hint-c dark:text-hint-c py-4 text-center">
                載入中…
              </div>
              <template v-else>
                <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-c dark:text-hint-c mb-3">
                  <span>客戶編號：<b class="text-base-c">{{ selectedCustomer?.customerid }}</b></span>
                  <span>性別：<b class="text-base-c">{{ sexLabel(selectedCustomer?.sex) || '–' }}</b></span>
                  <span>電話：<b class="text-base-c">{{ selectedCustomer?.telephone || '–' }}</b></span>
                  <span>班別：<b class="text-base-c">{{ selectedCustomer?.group1 || '–' }}</b></span>
                  <span>共 <b class="text-base-c">{{ customerRecords.length }}</b> 筆檢測紀錄</span>
                </div>

                <!-- Google 帳號綁定 -->
                <div class="mb-4 p-3 rounded border border-base bg-surface2/40">
                  <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-2">
                    前台 Google 帳號綁定
                  </div>

                  <div v-if="boundLoading" class="text-xs text-hint-c dark:text-hint-c">
                    載入中…
                  </div>

                  <template v-else>
                    <!-- 已綁定 -->
                    <div v-if="boundAccount?.bound" class="flex items-center gap-3">
                      <img
                        v-if="boundAccount.picture"
                        :src="boundAccount.picture"
                        :alt="boundAccount.name"
                        class="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      >
                      <div class="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0" v-else>
                        {{ (boundAccount.name || boundAccount.email || '?').charAt(0).toUpperCase() }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-semibold text-base-c truncate">{{ boundAccount.name || '（未提供姓名）' }}</div>
                        <div class="text-xs text-hint-c dark:text-hint-c truncate">{{ boundAccount.email }}</div>
                      </div>
                      <button
                        class="text-xs bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-3 py-1.5 rounded hover:bg-rose-200 dark:hover:bg-rose-900/60 flex-shrink-0"
                        @click="unbindAccount"
                      >
                        解除綁定
                      </button>
                    </div>

                    <!-- 未綁定 -->
                    <div v-else-if="!bindPanelOpen" class="flex items-center justify-between gap-2">
                      <span class="text-xs text-hint-c dark:text-hint-c">尚未綁定 Google 帳號，客戶無法從前台查詢此筆資料</span>
                      <button
                        class="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded flex-shrink-0"
                        @click="openBindPanel"
                      >
                        ＋ 綁定帳號
                      </button>
                    </div>

                    <!-- 搜尋 / 選擇 Google 帳號 -->
                    <div v-else>
                      <div class="flex gap-2 mb-2">
                        <input
                          v-model="bindKeyword"
                          type="text"
                          placeholder="輸入姓名或 Email 搜尋前台帳號"
                          class="flex-1 min-w-0 border border-base rounded px-3 py-1.5 text-sm bg-surface text-base-c placeholder:text-hint-c dark:placeholder:text-hint-c"
                          @input="onBindKeywordInput"
                          @keyup.enter="searchBindAccounts"
                        >
                        <button
                          class="text-xs bg-surface2 hover-border text-base-c px-3 py-1.5 rounded flex-shrink-0"
                          @click="closeBindPanel"
                        >
                          取消
                        </button>
                      </div>

                      <div v-if="bindSearching" class="text-xs text-hint-c dark:text-hint-c py-2">
                        搜尋中…
                      </div>
                      <div v-else-if="bindKeyword.trim() && !bindResults.length" class="text-xs text-hint-c dark:text-hint-c py-2">
                        查無符合的前台帳號
                      </div>

                      <div v-if="bindResults.length" class="max-h-56 overflow-y-auto rounded border border-base divide-y divide-base bg-surface">
                        <button
                          v-for="acc in bindResults"
                          :key="acc.customerId"
                          class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                          :disabled="bindSubmitting"
                          @click="selectBindAccount(acc)"
                        >
                          <img
                            v-if="acc.picture"
                            :src="acc.picture"
                            :alt="acc.name"
                            class="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          >
                          <div class="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0" v-else>
                            {{ (acc.name || acc.email || '?').charAt(0).toUpperCase() }}
                          </div>
                          <div class="min-w-0 flex-1">
                            <div class="text-sm text-base-c truncate">{{ acc.name || '（未提供姓名）' }}</div>
                            <div class="text-xs text-hint-c dark:text-hint-c truncate">{{ acc.email }}</div>
                          </div>
                          <span v-if="acc.tabcPatnr" class="text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                            已綁定 PATNR {{ acc.tabcPatnr }}
                          </span>
                        </button>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- 最新測量狀態：標準範圍色帶（InBody 報告常見呈現方式） -->
                <div v-if="latestRecord" class="grid md:grid-cols-3 gap-4 mb-5 p-3 rounded border border-base bg-surface2/40">
                  <div v-for="bar in rangeBars" :key="bar.title">
                    <div class="flex justify-between items-baseline text-xs mb-1">
                      <span class="text-muted-c dark:text-hint-c">{{ bar.title }}</span>
                      <span class="font-mono font-bold" :style="{ color: bar.markerColor }">{{ bar.valueLabel }}</span>
                    </div>
                    <div class="relative h-2.5 rounded-full overflow-hidden flex">
                      <div
                        v-for="(seg, i) in bar.segments"
                        :key="i"
                        :style="{ width: seg.width + '%', background: seg.color }"
                      />
                      <div
                        class="absolute -top-0.5 w-[3px] h-[14px] rounded bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                        :style="{ left: 'calc(' + bar.markerPct + '% - 1.5px)' }"
                      />
                    </div>
                    <div class="flex justify-between text-[10px] text-hint-c dark:text-hint-c mt-1">
                <span v-for="(seg, i) in bar.segments" :key="i" :style="{ width: seg.width + '%' }" class="text-center truncate">
                  {{ seg.label }}
                </span>
                    </div>
                  </div>
                </div>

                <!-- 歷史趨勢圖 -->
                <div v-if="trendCharts.length" class="grid md:grid-cols-2 gap-4 mb-5">
                  <div v-for="t in trendCharts" :key="t.key" class="border border-base rounded p-3 bg-surface2/30">
                    <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-1">
                      {{ t.title }}趨勢
                    </div>
                    <svg :viewBox="`0 0 ${t.w} ${t.h}`" class="w-full h-24">
                      <path :d="t.area" :fill="t.color" fill-opacity="0.12" stroke="none" />
                      <path :d="t.path" fill="none" :stroke="t.color" stroke-width="2" />
                      <circle
                        v-for="(p, i) in t.pts"
                        :key="i"
                        :cx="p.x" :cy="p.y" r="2.2"
                        :fill="i === t.pts.length - 1 ? '#C79A44' : t.color"
                      >
                        <title>{{ p.vLabel }}</title>
                      </circle>
                      <text :x="4" :y="t.maxY + (t.maxY > 10 ? -3 : 9)" font-size="8" fill="currentColor" class="text-hint-c dark:text-hint-c">{{ t.maxLabel }}</text>
                      <text :x="4" :y="t.minY + (t.minY < t.h - 10 ? 9 : -3)" font-size="8" fill="currentColor" class="text-hint-c dark:text-hint-c">{{ t.minLabel }}</text>
                    </svg>
                    <div class="flex justify-between text-[10px] text-hint-c dark:text-hint-c mt-1 font-mono">
                      <span>{{ t.firstLabel }}</span>
                      <span>最新 {{ t.lastValue }}</span>
                    </div>
                  </div>
                </div>

                <div class="overflow-x-auto rounded border border-base">
                  <table class="w-full border-collapse text-xs">
                    <thead class="bg-surface2">
                    <tr class="text-muted-c dark:text-hint-c">
                      <th class="border border-light-c px-2 py-1.5 text-left whitespace-nowrap">
                        日期
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        年齡
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        身高cm
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        體重kg
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        BMI
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        體脂率%
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        體脂重kg
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        肌肉量kg
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        內臟脂肪
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        骨量kg
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        基礎代謝
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        體內年齡
                      </th>
                      <th class="border border-light-c px-2 py-1.5 text-right whitespace-nowrap">
                        綜合風險
                      </th>
                    </tr>
                    </thead>
                    <tbody class="divide-y divide-base">
                    <tr v-if="!customerRecords.length">
                      <td colspan="13" class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c">
                        尚無檢測紀錄
                      </td>
                    </tr>
                    <tr
                      v-for="(rec, idx) in customerRecords"
                      :key="rec.datetime"
                      class="bg-surface"
                      :class="{ 'font-semibold': idx === 0 }"
                    >
                      <td class="border border-light-c px-2 py-1 font-mono whitespace-nowrap">
                        {{ fmtDate(rec.datetime) }}
                        <span v-if="idx === 0" class="ml-1 text-[10px] bg-teal-500 text-white rounded px-1">
                      最新
                    </span>
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.age, 0) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.height) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.weight) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        <span :class="bmiTagClass(rec.bmi)">{{ fmtNum(rec.bmi) }}</span>
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.fatp) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.fatm) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.pmm) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.vfatl, 0) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.bonem) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.bmr, 0) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ fmtNum(rec.metaage, 0) }}
                      </td>
                      <td class="border border-light-c px-2 py-1 text-right">
                        {{ rec.allrisk != null ? fmtNum(rec.allrisk * 100, 0) + '%' : '–' }}
                      </td>
                    </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
          </div>
        </div>
        <!-- /右：客戶詳情 -->

      </div>
      <!-- /左右兩欄 -->

    </div>
    <!-- ════════════════════════ /客戶查詢 ════════════════════════ -->

    <!-- ════════════════════════ 進步排行 ════════════════════════ -->
    <div v-show="currentTab === 'progress'">

      <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-2">
        學生進步排行
      </div>

      <div class="flex gap-3 mb-4 flex-wrap items-end">
        <div>
          <label class="block text-[11px] text-hint-c dark:text-hint-c mb-1">所屬班別</label>
          <select
            v-model="progressGroup"
            class="border border-base rounded px-3 py-1.5 bg-surface text-base-c"
          >
            <option v-for="g in groupTabs" :key="g.name" :value="g.name">
              {{ g.label }}（{{ g.count }}）
            </option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-hint-c dark:text-hint-c mb-1">起始日期</label>
          <input
            v-model="progressStart"
            type="date"
            class="border border-base rounded px-3 py-1.5 bg-surface text-base-c"
          >
        </div>
        <div>
          <label class="block text-[11px] text-hint-c dark:text-hint-c mb-1">結束日期</label>
          <input
            v-model="progressEnd"
            type="date"
            class="border border-base rounded px-3 py-1.5 bg-surface text-base-c"
          >
        </div>
        <div>
          <label class="block text-[11px] text-hint-c dark:text-hint-c mb-1">排行指標</label>
          <select v-model="progressMetric" class="border border-base rounded px-3 py-1.5 bg-surface text-base-c">
            <option v-for="m in PROGRESS_METRICS" :key="m.key" :value="m.key">
              {{ m.label }}（{{ m.better === 'down' ? '降低為進步' : '提升為進步' }}）
            </option>
          </select>
        </div>
        <button
          class="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-1.5 rounded"
          :disabled="progressLoading"
          @click="loadProgress"
        >
          {{ progressLoading ? '查詢中…' : '查詢排行' }}
        </button>
      </div>

      <div class="text-[11px] text-hint-c dark:text-hint-c mb-2">
        僅列出所選期間內至少有 2 筆檢測紀錄的學生，取期間內「最早一筆」與「最晚一筆」計算差值。
      </div>

      <div class="overflow-x-auto rounded border border-base">
        <table class="w-full border-collapse text-xs">
          <thead class="bg-teal-600 dark:bg-teal-800 text-white">
          <tr>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
              名次
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-left whitespace-nowrap">
              姓名
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-left whitespace-nowrap">
              班別
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
              起始日期
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
              結束日期
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
              起始值
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
              結束值
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
              差值
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
              紀錄筆數
            </th>
          </tr>
          </thead>
          <tbody class="divide-y divide-base">
          <tr v-if="!progressLoading && !rankedProgress.length">
            <td colspan="9" class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c">
              尚無資料，請選擇班別與時間段後查詢
            </td>
          </tr>
          <tr
            v-for="(row, idx) in rankedProgress"
            :key="row.patnr"
            class="bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
            @click="openCustomer(row.patnr)"
          >
            <td class="border border-light-c px-2 py-1 text-right font-mono">
              {{ idx + 1 }}
            </td>
            <td class="border border-light-c px-2 py-1 whitespace-nowrap">
              {{ row.lastname }}{{ row.firstname }}
            </td>
            <td class="border border-light-c px-2 py-1 whitespace-nowrap">
              {{ row.group1 || '其他' }}
            </td>
            <td class="border border-light-c px-2 py-1 text-right font-mono whitespace-nowrap">
              {{ fmtDate(row.start_date) }}
            </td>
            <td class="border border-light-c px-2 py-1 text-right font-mono whitespace-nowrap">
              {{ fmtDate(row.end_date) }}
            </td>
            <td class="border border-light-c px-2 py-1 text-right">
              {{ fmtNum(row.start?.[progressMetric]) }}
            </td>
            <td class="border border-light-c px-2 py-1 text-right">
              {{ fmtNum(row.end?.[progressMetric]) }}
            </td>
            <td
              class="border border-light-c px-2 py-1 text-right font-semibold"
              :class="deltaClass(row.delta?.[progressMetric], currentMetricInfo.better)"
            >
              {{ fmtDelta(row.delta?.[progressMetric]) }}
            </td>
            <td class="border border-light-c px-2 py-1 text-right">
              {{ row.record_count }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>

    </div>
    <!-- ════════════════════════ /進步排行 ════════════════════════ -->
  </div>
</template>
