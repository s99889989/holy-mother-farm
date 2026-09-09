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
    try { latestRecords.value = await $fetch<any[]>(`${BASE()}/records/latest`, { params: { limit: 15 } }) ?? [] } catch { latestRecords.value = [] }
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
    try { groups.value = await $fetch<any[]>(`${BASE()}/groups`) ?? [] } catch { groups.value = [] }
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
  const boundAccount = ref<any>(null) // { bound, customerId, name, email, picture }
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
    const segments = zones.map((z) => {
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
  // 實際可計算差值的指標（用來算綜合評分，也是「單一指標」可選的項目）
  const REAL_METRICS = [
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

// 「排行指標」下拉選單：綜合評分 + 各單項指標
  const PROGRESS_METRICS = [
    { key: 'composite', label: '綜合評分（多指標平均）', better: 'up' },
    ...REAL_METRICS
  ] as const

    function toDateInputStr(d: Date) {
    return d.toISOString().slice(0, 10)
  }
  const todayD = new Date()
  const threeMonthsAgoD = new Date(todayD)
  threeMonthsAgoD.setMonth(threeMonthsAgoD.getMonth() - 3)

  // 「所屬班別」跟「客戶查詢」頁籤共用同一組 localStorage（GROUP_LS_KEY），
  // 兩邊選的班別會互相同步、也會一起被記住
  const progressGroup = ref(loadGroupFromLS()) // 空字串＝全部班別
  const progressStart = ref(toDateInputStr(threeMonthsAgoD))
  const progressEnd = ref(toDateInputStr(todayD))
  const progressMetric = ref<string>('composite')
  const progressView = ref<'bar' | 'line' | 'table'>('bar') // 直條圖／折線圖／表格 三選一顯示
  const progressData = ref<any>(null)
  const progressLoading = ref(false)

  // 雙向同步：改「進步排行」的班別 → 同步到「客戶查詢」的班別並存回 localStorage
  watch(progressGroup, (v) => {
    saveGroupToLS(v)
    if (groupFilter.value !== v) groupFilter.value = v
  })
  // 反之，改「客戶查詢」的班別（點頁籤／清除搜尋）→ 同步到「進步排行」的班別
  watch(groupFilter, (v) => {
    if (progressGroup.value !== v) progressGroup.value = v
  })

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
  const isCompositeMetric = computed(() => progressMetric.value === 'composite')
  // 表格是否顯示「班別」欄：只有在沒篩選特定班別（顯示多個班別混在一起）時才需要
  const showGroupColumn = computed(() => !progressGroup.value)

  // ── 綜合評分（多指標平均）──────────────────────────────
  // 做法：對每一項指標，先依「進步方向」把差值轉成「越大越好」的方向調整值，
  // 再用 min-max 正規化成 0~100 分（該指標在目前這批學生裡的相對名次高低），
  // 最後把每位學生「有資料的各指標分數」平均起來，得到一個 0~100 的綜合分數，
  // 分數越高代表在這段期間、這幾項指標綜合起來進步幅度越大（相對於同一批學生而言）。
  // 這裡把「算正規化範圍」跟「套用範圍算分數」拆成兩步，
  // 這樣折線圖也能用同一套範圍，幫每一筆中間紀錄（不只頭尾）算出對應的綜合分數。
  const compositeMetricRanges = computed(() => {
    const rows: any[] = progressData.value?.rows ?? []
    const ranges: Record<string, { min: number, max: number }> = {}
    for (const m of REAL_METRICS) {
      const vals: number[] = []
      for (const r of rows) {
        const d = r.delta?.[m.key]
        if (d === null || d === undefined) continue
        vals.push(m.better === 'down' ? -d : d)
      }
      if (vals.length) ranges[m.key] = { min: Math.min(...vals), max: Math.max(...vals) }
    }
    return ranges
  })

  function compositeScoreFromDeltas(deltas: Record<string, number>): number | null {
    const ranges = compositeMetricRanges.value
    let sum = 0, count = 0
    for (const m of REAL_METRICS) {
      const d = deltas[m.key]
      if (d === undefined) continue
      const range = ranges[m.key]
      if (!range) continue
      const adjusted = m.better === 'down' ? -d : d
      const span = range.max - range.min
      sum += span === 0 ? 50 : ((adjusted - range.min) / span) * 100
      count++
    }
    return count > 0 ? Math.round((sum / count) * 10) / 10 : null
  }

  const compositeScores = computed(() => {
    const rows: any[] = progressData.value?.rows ?? []
    const scores = new Map<number, number>()
    if (!rows.length) return scores
    for (const r of rows) {
      const deltas: Record<string, number> = {}
      for (const m of REAL_METRICS) {
        const d = r.delta?.[m.key]
        if (d !== null && d !== undefined) deltas[m.key] = d
      }
      const score = compositeScoreFromDeltas(deltas)
      if (score !== null) scores.set(r.patnr, score)
    }
    return scores
  })

  // 依所選指標排序：
  // - 選「綜合評分」：分數越高（0~100）代表綜合進步幅度越大
  // - 選單一指標：better === 'down' 時差值越負代表進步越多，反之越正代表進步越多
  const rankedProgress = computed(() => {
    const rows = [...(progressData.value?.rows ?? [])]

    if (isCompositeMetric.value) {
      const scores = compositeScores.value
      rows.sort((a: any, b: any) => {
        const sa = scores.get(a.patnr)
        const sb = scores.get(b.patnr)
        if (sa === undefined && sb === undefined) return 0
        if (sa === undefined) return 1
        if (sb === undefined) return -1
        return sb - sa
      })
      return rows
    }

    const metric = currentMetricInfo.value
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
  function fmtScore(v: number | undefined) {
    return v === undefined ? '–' : v.toFixed(1)
  }
  function scoreClass(v: number | undefined) {
    if (v === undefined) return 'text-hint-c'
    if (v >= 60) return 'text-emerald-600 dark:text-emerald-400'
    if (v <= 40) return 'text-rose-600 dark:text-rose-400'
    return 'text-base-c'
  }

  // ── 進步排行圖表（水平長條圖，只取排序後前 20 名，避免圖表過長）──
  const PROGRESS_CHART_LIMIT = 20
  const progressChartRows = computed(() => rankedProgress.value.slice(0, PROGRESS_CHART_LIMIT))

  function chartValue(row: any): number {
    if (isCompositeMetric.value) return compositeScores.value.get(row.patnr) ?? 0
    const d = row.delta?.[progressMetric.value]
    return d ?? 0
  }

  // 單一指標模式下，用目前這批圖表資料裡差值絕對值的最大值當作長條圖滿版基準
  const chartMax = computed(() => {
    if (isCompositeMetric.value) return 100
    const vals = progressChartRows.value
      .map((r: any) => r.delta?.[progressMetric.value])
      .filter((v: any) => v !== null && v !== undefined)
      .map((v: number) => Math.abs(v))
    return vals.length ? Math.max(...vals) : 1
  })

  function chartWidthPct(row: any): number {
    if (isCompositeMetric.value) {
      return Math.min(100, Math.max(0, chartValue(row)))
    }
    const max = chartMax.value || 1
    return Math.min(100, Math.max(0, (Math.abs(chartValue(row)) / max) * 100))
  }

  function chartBarColor(row: any): string {
    if (isCompositeMetric.value) {
      const v = chartValue(row)
      if (v >= 60) return 'bg-emerald-500'
      if (v <= 40) return 'bg-rose-500'
      return 'bg-amber-400'
    }
    const d = row.delta?.[progressMetric.value]
    if (d === null || d === undefined) return 'bg-gray-300 dark:bg-gray-600'
    const improved = currentMetricInfo.value.better === 'down' ? d < 0 : d > 0
    return improved ? 'bg-emerald-500' : 'bg-rose-500'
  }
  // 同一份判斷邏輯，回傳 16 進位色碼版本，給條上的行內文字標籤上色用（class 沒辦法用在 :style 的 color 上）
  function barColorHex(row: any): string {
    if (isCompositeMetric.value) {
      const v = chartValue(row)
      if (v >= 60) return '#10b981'
      if (v <= 40) return '#f43f5e'
      return '#f59e0b'
    }
    const d = row.delta?.[progressMetric.value]
    if (d === null || d === undefined) return '#9ca3af'
    const improved = currentMetricInfo.value.better === 'down' ? d < 0 : d > 0
    return improved ? '#10b981' : '#f43f5e'
  }

  // ── 進步排行：日期解析（後端 start/end 物件的日期欄位名稱不確定，
  //    依序嘗試常見欄位，都沒有的話就退回使用查詢條件的起訖日期，確保圖表仍能畫出來）──
  function pickRecDateRaw(rec: any, fallback: string) {
    return rec?.datetime ?? rec?.date ?? rec?.checkdate ?? rec?.check_date
      ?? rec?.measure_date ?? rec?.record_date ?? fallback
  }
  function parseDateSafe(v: any): number | null {
    if (!v) return null
    const t = new Date(v).getTime()
    return Number.isNaN(t) ? null : t
  }
  function recDateMs(rec: any, fallback: string): number | null {
    return parseDateSafe(pickRecDateRaw(rec, fallback))
  }
  function recDateLabel(rec: any, fallback: string): string {
    return fmtDate(pickRecDateRaw(rec, fallback))
  }
  // 條形圖每一列 hover 時顯示的起訖時間點（＋數值），滑鼠移到長條上就能看到
  function rowDateRangeLabel(row: any): string {
    const s = recDateLabel(row.start, progressStart.value)
    const e = recDateLabel(row.end, progressEnd.value)
    const val = isCompositeMetric.value ? fmtScore(chartValue(row)) : fmtDelta(chartValue(row))
    return `${s} ～ ${e}　${val}`
  }

  // 條形圖上方顯示的整體資料期間（取所選前 N 名裡最早的起始日～最晚的結束日）
  const progressBarDateSpan = computed(() => {
    const rows = progressChartRows.value
    if (!rows.length) return ''
    const starts = rows.map((r: any) => recDateMs(r.start, progressStart.value)).filter((v: any): v is number => v !== null).sort((a: number, b: number) => a - b)
    const ends = rows.map((r: any) => recDateMs(r.end, progressEnd.value)).filter((v: any): v is number => v !== null).sort((a: number, b: number) => a - b)
    if (!starts.length || !ends.length) return ''
    return `${fmtDate(new Date(starts[0]).toISOString())} ～ ${fmtDate(new Date(ends[ends.length - 1]).toISOString())}`
  })

  // 條形圖點選狀態：點一列把它「選起來」，下方顯示詳細明細（跟折線圖的點選互動一致），
  // 不再是點了就直接跳去客戶詳情頁
  const selectedBarPatnr = ref<number | null>(null)
  function toggleBarSelect(patnr: number) {
    selectedBarPatnr.value = selectedBarPatnr.value === patnr ? null : patnr
  }
  const selectedBarRow = computed(() =>
    progressChartRows.value.find((r: any) => r.patnr === selectedBarPatnr.value) ?? null
  )
  watch(progressChartRows, () => { selectedBarPatnr.value = null })

  // 選到的那一列，組出詳細資料：
  // - 綜合評分模式：列出每一項指標各自的起訖值、差值、是否進步（分數就是這些差值換算出來的）
  // - 單一指標模式：只列該指標的起訖值與差值
  interface BarDetailMetric {
    key: string
    label: string
    start: string
    end: string
    delta: string
    improved: boolean | null
  }
  const selectedBarDetail = computed(() => {
    const row = selectedBarRow.value
    if (!row) return null
    const metrics: BarDetailMetric[] = (isCompositeMetric.value ? REAL_METRICS : [currentMetricInfo.value])
      .map((m: any) => {
        const d = row.delta?.[m.key]
        const improved = d === null || d === undefined ? null : (m.better === 'down' ? d < 0 : d > 0)
        return {
          key: m.key,
          label: m.label,
          start: fmtNum(row.start?.[m.key]),
          end: fmtNum(row.end?.[m.key]),
          delta: fmtDelta(d),
          improved
        }
      })
    return {
      patnr: row.patnr,
      name: `${row.lastname ?? ''}${row.firstname ?? ''}`,
      group: row.group1 || '其他',
      recordCount: row.record_count,
      dateRange: `${recDateLabel(row.start, progressStart.value)} ～ ${recDateLabel(row.end, progressEnd.value)}`,
      scoreLabel: isCompositeMetric.value ? fmtScore(chartValue(row)) : null,
      color: chartBarColor(row).includes('emerald') ? '#10b981' : chartBarColor(row).includes('rose') ? '#f43f5e' : '#f59e0b',
      metrics
    }
  })

  // ── 進步排行：折線圖（改抓每位學生「完整」檢測紀錄，而非只有頭尾兩筆）──
  // /progress 這支 API 本身只回傳期間內最早／最晚各一筆，畫不出中間的變化，
  // 所以折線圖改成對圖表上會顯示的每位學生，各別呼叫既有的
  // GET .../customers/{patnr}/records（跟客戶詳情頁「歷史趨勢折線圖」共用同一支 API），
  // 抓回該學生的完整歷史紀錄，再依目前選擇的起訖日期篩選、畫出中間所有點的走勢。
  const LINE_H = 460
  const LINE_PAD_X = 70
  const LINE_PAD_Y = 30

  // 折線圖寬度改成量測容器實際寬度（左右也撐滿），而不是寫死的常數，
  // 這樣文字／資料點不會因為 CSS 縮放而跑版變形（座標單位＝實際 px，比例永遠是 1:1）。
  // 用 watch 監看 template ref，因為這個容器只在切到「折線圖」時才會被渲染出來，
  // 一開始掛載時通常還抓不到元素，要等它真的出現才能開始觀察尺寸。
  const lineChartWrapRef = ref<HTMLElement | null>(null)
  const lineChartWidth = ref(960)
  let lineChartResizeObserver: ResizeObserver | null = null

  function measureLineChartWidth() {
    const w = lineChartWrapRef.value?.clientWidth
    // 手機版容器很窄，但圖表最小還是要有 700px 才看得清楚，
    // 這種情況允許圖表比容器寬、讓外層可以左右滑動查看，桌機版容器夠寬時就直接吃滿容器寬度
    if (w && w > 0) lineChartWidth.value = Math.max(700, Math.round(w))
  }

  watch(lineChartWrapRef, (el) => {
    lineChartResizeObserver?.disconnect()
    lineChartResizeObserver = null
    if (el && typeof ResizeObserver !== 'undefined') {
      measureLineChartWidth()
      lineChartResizeObserver = new ResizeObserver(() => measureLineChartWidth())
      lineChartResizeObserver.observe(el)
    }
  })
  onBeforeUnmount(() => {
    lineChartResizeObserver?.disconnect()
  })

  const lineRecordsCache = ref<Map<number, any[]>>(new Map())
  const lineRecordsLoading = ref(false)

  async function fetchCustomerRecords(patnr: number): Promise<any[]> {
    try {
      return await $fetch<any[]>(`${BASE()}/customers/${patnr}/records`) ?? []
    } catch {
      return []
    }
  }

  async function ensureLineRecords(patnrs: number[]) {
    const missing = patnrs.filter(p => !lineRecordsCache.value.has(p))
    if (!missing.length) return
    lineRecordsLoading.value = true
    try {
      const pairs = await Promise.all(missing.map(async patnr => [patnr, await fetchCustomerRecords(patnr)] as const))
      for (const [patnr, recs] of pairs) lineRecordsCache.value.set(patnr, recs)
    } finally {
      lineRecordsLoading.value = false
    }
  }

  // ── 客戶查詢列表：最新檢測日期 ──
  // 跟折線圖共用同一份 lineRecordsCache（同一支 GET .../customers/{patnr}/records），
  // 這個學生的完整紀錄如果折線圖已經抓過就直接沿用，不用重複打 API。
  const latestDateLoading = ref<Set<number>>(new Set())

  async function ensureLatestDates(patnrs: number[]) {
    const missing = patnrs.filter(p => !lineRecordsCache.value.has(p) && !latestDateLoading.value.has(p))
    if (!missing.length) return
    missing.forEach(p => latestDateLoading.value.add(p))
    await Promise.all(missing.map(async (patnr) => {
      const recs = await fetchCustomerRecords(patnr)
      lineRecordsCache.value.set(patnr, recs)
      latestDateLoading.value.delete(patnr)
    }))
  }

  // 客戶查詢的清單一有變化（換頁／搜尋／篩選班別）就補抓目前這一頁裡缺少的人
  watch(() => listData.value?.rows, (rows: any) => {
    const patnrs = (rows ?? []).map((r: any) => r.patnr)
    if (patnrs.length) ensureLatestDates(patnrs)
  }, { immediate: true })

  // 條形圖點選某位學生時，補抓他的完整紀錄（用來畫長條上的時間點），
  // 這份紀錄跟折線圖、客戶查詢列表共用同一份快取，抓過的人不會重複打 API
  watch(selectedBarPatnr, (patnr) => {
    if (patnr !== null) ensureLatestDates([patnr])
  })

  // 客戶的紀錄本來就是新到舊排序（跟 customerRecords / latestRecord 的假設一致），取第一筆即為最新日期
  function latestDateLabel(patnr: number): string {
    if (latestDateLoading.value.has(patnr)) return '…'
    const recs = lineRecordsCache.value.get(patnr)
    if (!recs || !recs.length) return '–'
    return fmtDate(recs[0]?.datetime)
  }

  // 切到折線圖時，圖表上會顯示的學生清單有變化就補抓缺少的人（綜合評分模式一樣需要完整紀錄來換算分數趨勢）
  const lineTargetPatnrs = computed(() =>
    progressView.value === 'line'
      ? progressChartRows.value.map((r: any) => r.patnr)
      : []
  )
  watch(lineTargetPatnrs, (list) => { if (list.length) ensureLineRecords(list) }, { immediate: true })

  // 把某學生的完整紀錄，篩選在目前所選的起訖日期區間內、依時間由舊到新排序
  function recordsInRange(patnr: number): any[] {
    const all = lineRecordsCache.value.get(patnr) ?? []
    const startMs = parseDateSafe(progressStart.value)
    const endMs = parseDateSafe(progressEnd.value)
    const endBoundary = endMs === null ? null : endMs + 24 * 60 * 60 * 1000 - 1 // 含結束日當天
    return all
      .map((r: any) => ({ rec: r, t: parseDateSafe(r.datetime) }))
      .filter((x: any) => x.t !== null && (startMs === null || x.t >= startMs) && (endBoundary === null || x.t <= endBoundary))
      .sort((a: any, b: any) => a.t - b.t)
  }

  // 綜合評分模式：參考條形圖「綜合分數」的算法──把每一筆紀錄跟該學生「期間內第一筆」比較，
  // 算出各指標差值，再用整批學生的差值範圍換算成 0~100 分，這樣中間每一筆都能有一個對應的
  // 綜合分數，連成趨勢線（分數越高＝相對於同一批學生，累積進步幅度越大）。
  // 抽成頂層函式，折線圖跟條形圖點選後的時間點都共用這套算法。
  function compositePts(patnr: number): { t: number, v: number }[] {
    const recs = recordsInRange(patnr)
    if (recs.length < 2) return []
    const baseline = recs[0].rec
    return recs
      .map((x: any) => {
        const deltas: Record<string, number> = {}
        for (const m of REAL_METRICS) {
          const bv = baseline[m.key]
          const cv = x.rec[m.key]
          if (bv === null || bv === undefined || bv === '' || cv === null || cv === undefined || cv === '') continue
          deltas[m.key] = Number(cv) - Number(bv)
        }
        const score = compositeScoreFromDeltas(deltas)
        return score === null ? null : { t: x.t, v: score }
      })
      .filter((p: any): p is { t: number, v: number } => p !== null)
  }

  function singleMetricPts(patnr: number, key: string): { t: number, v: number }[] {
    return recordsInRange(patnr)
      .filter((x: any) => x.rec[key] !== null && x.rec[key] !== undefined && x.rec[key] !== '')
      .map((x: any) => ({ t: x.t, v: Number(x.rec[key]) }))
  }

  const progressLineChart = computed(() => {
    const key = progressMetric.value
    const rows = progressChartRows.value
    const LINE_W = lineChartWidth.value
    const isComposite = isCompositeMetric.value

    const series = rows
      .map((row: any) => {
        const pts = isComposite ? compositePts(row.patnr) : singleMetricPts(row.patnr, key)
        if (pts.length < 2) return null // 期間內少於 2 筆，無法畫趨勢
        return { row, pts }
      })
      .filter((s: any): s is NonNullable<typeof s> => s !== null)
    if (!series.length) return null

    const allT = series.flatMap((s: any) => s.pts.map((p: any) => p.t))
    const minT = Math.min(...allT)
    const maxT = Math.max(...allT)
    const tRange = (maxT - minT) || 1

    const allV = series.flatMap((s: any) => s.pts.map((p: any) => p.v))
    const minV = Math.min(...allV)
    const maxV = Math.max(...allV)
    const vRange = (maxV - minV) || 1

    const xOf = (t: number) => LINE_PAD_X + ((t - minT) / tRange) * (LINE_W - LINE_PAD_X * 2)
    const yOf = (v: number) => LINE_H - LINE_PAD_Y - ((v - minV) / vRange) * (LINE_H - LINE_PAD_Y * 2)

    // 產生等距刻度（Y 軸數值 4 等分、X 軸時間 4 等分），畫格線＋座標軸用
    function buildTicks(min: number, max: number, count: number): number[] {
      if (min === max) return [min]
      return Array.from({ length: count + 1 }, (_, i) => min + (max - min) * (i / count))
    }
    const yTicks = buildTicks(minV, maxV, 4).map(v => ({ y: yOf(v), label: v.toFixed(1) }))
    const xTicks = buildTicks(minT, maxT, 4).map(t => ({ x: xOf(t), label: fmtDate(new Date(t).toISOString()) }))

    // 綜合評分本身已經是「分數越高＝越進步」，不需要再依 better 方向判斷
    const better = currentMetricInfo.value.better
    const lines = series.map((s: any) => {
      const first = s.pts[0]
      const last = s.pts[s.pts.length - 1]
      const improved = isComposite ? last.v > first.v : (better === 'down' ? last.v < first.v : last.v > first.v)
      const color = improved ? '#10b981' : '#f43f5e'
      const points = s.pts.map((p: any, i: number) => ({
        i,
        x: xOf(p.t),
        y: yOf(p.v),
        label: p.v.toFixed(1),
        dateLabel: fmtDate(new Date(p.t).toISOString())
      }))
      const path = points.map((p: any, i: number) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')
      return {
        patnr: s.row.patnr,
        name: `${s.row.lastname ?? ''}${s.row.firstname ?? ''}`,
        color,
        path,
        points,
        pointCount: s.pts.length,
        firstDate: fmtDate(new Date(first.t).toISOString()),
        lastDate: fmtDate(new Date(last.t).toISOString()),
        firstLabel: first.v.toFixed(1),
        lastLabel: last.v.toFixed(1)
      }
    })

    return {
      w: LINE_W,
      h: LINE_H,
      plotLeft: LINE_PAD_X,
      axisY: LINE_H - LINE_PAD_Y,
      yTicks,
      xTicks,
      lines
    }
  })

  // 條形圖選到某位學生後，把該學生完整紀錄換算成一串時間點（跟折線圖同一套算法），
  // 依時間比例定位在長條上，附上日期＋數值標籤（見下方模板 -top-4 那幾個 <span>）
  interface SelectedBarPoint {
    xPct: number
    dateLabel: string
    valueLabel: string
  }
  const selectedBarPoints = computed<SelectedBarPoint[] | null>(() => {
    const row = selectedBarRow.value
    if (!row) return null
    const isComposite = isCompositeMetric.value
    const pts = isComposite ? compositePts(row.patnr) : singleMetricPts(row.patnr, progressMetric.value)
    if (pts.length < 2) return null

    const minT = pts[0].t
    const maxT = pts[pts.length - 1].t
    const tRange = (maxT - minT) || 1

    return pts.map((p: any) => ({
      xPct: Math.min(100, Math.max(0, ((p.t - minT) / tRange) * 100)),
      dateLabel: fmtDate(new Date(p.t).toISOString()).slice(5),
      valueLabel: isComposite ? fmtScore(p.v) : fmtNum(p.v)
    }))
  })

  // 折線圖 hover 狀態：滑鼠移到資料點上時顯示跟著游標的浮動數值卡片
  interface LineHoverInfo {
    patnr: number
    pointIndex: number
    x: number
    y: number
    name: string
    date: string
    value: string
    color: string
  }
  const lineHover = ref<LineHoverInfo | null>(null)
  function setLineHover(ln: any, pt: any) {
    lineHover.value = {
      patnr: ln.patnr, pointIndex: pt.i, x: pt.x, y: pt.y,
      name: ln.name, date: pt.dateLabel, value: pt.label, color: ln.color
    }
  }
  function clearLineHover() {
    lineHover.value = null
  }
  watch(progressLineChart, () => { lineHover.value = null })

  // 折線圖點選狀態：點一條線把它「選起來」，下方會列出這條線每一筆的日期＋數值；
  // 再點一次同一條線（或點別條線）就切換／換選，不再是點了直接跳去客戶詳情頁
  const selectedLinePatnr = ref<number | null>(null)
  function toggleLineSelect(patnr: number) {
    selectedLinePatnr.value = selectedLinePatnr.value === patnr ? null : patnr
  }
  const selectedLine = computed(() => {
    if (selectedLinePatnr.value === null || !progressLineChart.value) return null
    return progressLineChart.value.lines.find((l: any) => l.patnr === selectedLinePatnr.value) ?? null
  })
  watch(progressLineChart, () => { selectedLinePatnr.value = null })

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
              <div
                class="h-full rounded bg-pink-400"
                :style="{ width: genderPct.F + '%' }"
              />
            </div>
            <span class="w-10 text-right text-muted-c">{{ stats?.gender?.F ?? 0 }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="w-10 text-hint-c dark:text-hint-c">男</span>
            <div class="flex-1 bg-surface2 rounded h-2 overflow-hidden">
              <div
                class="h-full rounded bg-blue-400"
                :style="{ width: genderPct.M + '%' }"
              />
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
              <td
                colspan="6"
                class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c"
              >
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
              <option
                v-for="g in groupTabs"
                :key="g.name"
                :value="g.name"
              >
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
                <th class="border border-teal-700 dark:border-teal-900 px-3 py-2 text-left whitespace-nowrap">
                  最新日期
                </th>
              </tr>
              </thead>
              <tbody class="divide-y divide-base">
              <tr v-if="!listData?.rows?.length">
                <td
                  colspan="6"
                  class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c"
                >
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
                <td class="border border-light-c px-3 py-1 whitespace-nowrap font-mono">
                  {{ latestDateLabel(row.patnr) }}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── 右：客戶詳情 / 歷史紀錄（sticky，跟著捲動）── -->
        <div class="lg:sticky lg:top-4 min-w-0">
          <div
            v-if="!selectedPatnr"
            class="border border-base rounded-md p-10 text-center text-hint-c dark:text-hint-c bg-surface"
          >
            ← 從左側列表點選一位客戶查看詳情
          </div>
          <div
            v-else
            class="border border-base rounded-md overflow-hidden mb-4"
          >
            <div class="bg-teal-500 dark:bg-teal-700 text-white px-4 py-2 font-bold flex items-center justify-between">
              <span>
                {{ selectedCustomer?.lastname }}{{ selectedCustomer?.firstname }}
                的身體組成歷史紀錄
              </span>
              <button
                class="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
                @click="closeCustomer"
              >
                ✕ 關閉
              </button>
            </div>
            <div class="p-4 bg-surface">
              <div
                v-if="customerLoading"
                class="text-hint-c dark:text-hint-c py-4 text-center"
              >
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

                  <div
                    v-if="boundLoading"
                    class="text-xs text-hint-c dark:text-hint-c"
                  >
                    載入中…
                  </div>

                  <template v-else>
                    <!-- 已綁定 -->
                    <div
                      v-if="boundAccount?.bound"
                      class="flex items-center gap-3"
                    >
                      <img
                        v-if="boundAccount.picture"
                        :src="boundAccount.picture"
                        :alt="boundAccount.name"
                        class="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      >
                      <div
                        v-else
                        class="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0"
                      >
                        {{ (boundAccount.name || boundAccount.email || '?').charAt(0).toUpperCase() }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-semibold text-base-c truncate">
                          {{ boundAccount.name || '（未提供姓名）' }}
                        </div>
                        <div class="text-xs text-hint-c dark:text-hint-c truncate">
                          {{ boundAccount.email }}
                        </div>
                      </div>
                      <button
                        class="text-xs bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-3 py-1.5 rounded hover:bg-rose-200 dark:hover:bg-rose-900/60 flex-shrink-0"
                        @click="unbindAccount"
                      >
                        解除綁定
                      </button>
                    </div>

                    <!-- 未綁定 -->
                    <div
                      v-else-if="!bindPanelOpen"
                      class="flex items-center justify-between gap-2"
                    >
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

                      <div
                        v-if="bindSearching"
                        class="text-xs text-hint-c dark:text-hint-c py-2"
                      >
                        搜尋中…
                      </div>
                      <div
                        v-else-if="bindKeyword.trim() && !bindResults.length"
                        class="text-xs text-hint-c dark:text-hint-c py-2"
                      >
                        查無符合的前台帳號
                      </div>

                      <div
                        v-if="bindResults.length"
                        class="max-h-56 overflow-y-auto rounded border border-base divide-y divide-base bg-surface"
                      >
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
                          <div
                            v-else
                            class="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                          >
                            {{ (acc.name || acc.email || '?').charAt(0).toUpperCase() }}
                          </div>
                          <div class="min-w-0 flex-1">
                            <div class="text-sm text-base-c truncate">
                              {{ acc.name || '（未提供姓名）' }}
                            </div>
                            <div class="text-xs text-hint-c dark:text-hint-c truncate">
                              {{ acc.email }}
                            </div>
                          </div>
                          <span
                            v-if="acc.tabcPatnr"
                            class="text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap"
                          >
                            已綁定 PATNR {{ acc.tabcPatnr }}
                          </span>
                        </button>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- 最新測量狀態：標準範圍色帶（InBody 報告常見呈現方式） -->
                <div
                  v-if="latestRecord"
                  class="grid md:grid-cols-3 gap-4 mb-5 p-3 rounded border border-base bg-surface2/40"
                >
                  <div
                    v-for="bar in rangeBars"
                    :key="bar.title"
                  >
                    <div class="flex justify-between items-baseline text-xs mb-1">
                      <span class="text-muted-c dark:text-hint-c">{{ bar.title }}</span>
                      <span
                        class="font-mono font-bold"
                        :style="{ color: bar.markerColor }"
                      >{{ bar.valueLabel }}</span>
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
                      <span
                        v-for="(seg, i) in bar.segments"
                        :key="i"
                        :style="{ width: seg.width + '%' }"
                        class="text-center truncate"
                      >
                        {{ seg.label }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 歷史趨勢圖 -->
                <div
                  v-if="trendCharts.length"
                  class="grid md:grid-cols-2 gap-4 mb-5"
                >
                  <div
                    v-for="t in trendCharts"
                    :key="t.key"
                    class="border border-base rounded p-3 bg-surface2/30"
                  >
                    <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-1">
                      {{ t.title }}趨勢
                    </div>
                    <svg
                      :viewBox="`0 0 ${t.w} ${t.h}`"
                      class="w-full h-24"
                    >
                      <path
                        :d="t.area"
                        :fill="t.color"
                        fill-opacity="0.12"
                        stroke="none"
                      />
                      <path
                        :d="t.path"
                        fill="none"
                        :stroke="t.color"
                        stroke-width="2"
                      />
                      <circle
                        v-for="(p, i) in t.pts"
                        :key="i"
                        :cx="p.x"
                        :cy="p.y"
                        r="2.2"
                        :fill="i === t.pts.length - 1 ? '#C79A44' : t.color"
                      >
                        <title>{{ p.vLabel }}</title>
                      </circle>
                      <text
                        :x="4"
                        :y="t.maxY + (t.maxY > 10 ? -3 : 9)"
                        font-size="8"
                        fill="currentColor"
                        class="text-hint-c dark:text-hint-c"
                      >{{ t.maxLabel }}</text>
                      <text
                        :x="4"
                        :y="t.minY + (t.minY < t.h - 10 ? 9 : -3)"
                        font-size="8"
                        fill="currentColor"
                        class="text-hint-c dark:text-hint-c"
                      >{{ t.minLabel }}</text>
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
                      <td
                        colspan="13"
                        class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c"
                      >
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
                        <span
                          v-if="idx === 0"
                          class="ml-1 text-[10px] bg-teal-500 text-white rounded px-1"
                        >
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
            <option
              v-for="g in groupTabs"
              :key="g.name"
              :value="g.name"
            >
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
          <select
            v-model="progressMetric"
            class="border border-base rounded px-3 py-1.5 bg-surface text-base-c"
          >
            <option
              v-for="m in PROGRESS_METRICS"
              :key="m.key"
              :value="m.key"
            >
              {{ m.label }}{{ m.key === 'composite' ? '' : (m.better === 'down' ? '（降低為進步）' : '（提升為進步）') }}
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
        <template v-if="isCompositeMetric">
          綜合評分是把體重／BMI／體脂率／體脂重／肌肉量／內臟脂肪／骨量／體水分／基礎代謝／體內年齡等指標，
          依各自的進步方向換算成 0~100 分（在目前這批學生中的相對名次），再取平均，分數越高代表整體進步幅度越大。
        </template>
      </div>

      <!-- 直條圖／折線圖／表格 切換 -->
      <div class="flex gap-1 border border-base rounded overflow-hidden w-fit mb-3">
        <button
          type="button"
          class="px-3 py-1.5 text-sm"
          :class="progressView === 'bar' ? 'bg-teal-600 text-white' : 'bg-surface text-base-c hover:bg-surface2'"
          @click="progressView = 'bar'"
        >
          📊 條形圖
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm"
          :class="progressView === 'line' ? 'bg-teal-600 text-white' : 'bg-surface text-base-c hover:bg-surface2'"
          @click="progressView = 'line'"
        >
          📈 折線圖
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm"
          :class="progressView === 'table' ? 'bg-teal-600 text-white' : 'bg-surface text-base-c hover:bg-surface2'"
          @click="progressView = 'table'"
        >
          📋 表格
        </button>
      </div>

      <!-- 進步排行：條形圖（橫向長條，點一列可選起來看詳細） -->
      <div
        v-if="progressView === 'bar' && progressChartRows.length"
        class="mb-5 border border-base rounded-md p-4 bg-surface"
      >
        <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-1">
          {{ isCompositeMetric ? '綜合評分排行圖' : `${currentMetricInfo.label} 差值排行圖` }}
          <span
            v-if="rankedProgress.length > PROGRESS_CHART_LIMIT"
            class="font-normal text-hint-c dark:text-hint-c"
          >
            （僅顯示前 {{ PROGRESS_CHART_LIMIT }} 名，共 {{ rankedProgress.length }} 名）
          </span>
        </div>
        <div
          v-if="progressBarDateSpan"
          class="text-[11px] text-hint-c dark:text-hint-c mb-2"
        >
          🕒 資料期間：{{ progressBarDateSpan }}；點一列可以看該學生的詳細明細
        </div>
        <!-- 選取狀態固定顯示在上面，不用捲到下面才能取消選取 -->
        <div
          v-if="selectedBarDetail"
          class="flex items-center gap-2 text-xs mb-2"
        >
          <span
            class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ backgroundColor: selectedBarDetail.color }"
          />
          <span>已選：<b>{{ selectedBarDetail.name }}</b></span>
          <button
            type="button"
            class="text-teal-600 dark:text-teal-400 hover:underline"
            @click="selectedBarPatnr = null"
          >
            清除選取
          </button>
        </div>
        <div :class="selectedBarPatnr ? 'space-y-10' : 'space-y-1.5'">
          <div
            v-for="row in progressChartRows"
            :key="row.patnr"
            class="flex items-center gap-2 text-xs px-1 py-0.5 rounded cursor-pointer"
            :class="selectedBarPatnr === row.patnr ? 'bg-teal-500/10 ring-1 ring-teal-500/40' : 'hover:bg-surface2'"
            :title="rowDateRangeLabel(row)"
            @click="toggleBarSelect(row.patnr)"
          >
            <span class="w-20 text-right text-hint-c dark:text-hint-c truncate">{{ row.lastname }}{{ row.firstname }}</span>
            <div class="flex-1 relative">
              <div class="bg-surface2 rounded h-3 overflow-hidden">
                <div
                  class="h-full rounded"
                  :class="chartBarColor(row)"
                  :style="{ width: chartWidthPct(row) + '%' }"
                />
              </div>
              <!-- 選到這一列時，直接在條上標出各時間點的日期＋數值，跟折線圖選線後的標法一致；
                   完整紀錄還沒抓回來之前，先用起訖兩點頂著 -->
              <template v-if="selectedBarPatnr === row.patnr">
                <template v-if="selectedBarPoints && selectedBarPoints.length">
                  <template
                    v-for="(pt, pi) in selectedBarPoints"
                    :key="pi"
                  >
                    <span
                      class="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2"
                      :style="{ left: pt.xPct + '%', backgroundColor: barColorHex(row) }"
                    />
                    <span
                      class="absolute text-[10px] font-mono font-semibold whitespace-nowrap -translate-x-1/2"
                      :style="{ left: pt.xPct + '%', top: pi % 2 === 0 ? '-16px' : '-30px', color: barColorHex(row) }"
                    >
                      {{ pt.dateLabel }}：{{ pt.valueLabel }}
                    </span>
                  </template>
                </template>
                <template v-else>
                  <span
                    class="absolute -top-4 left-0 text-[10px] font-mono font-semibold whitespace-nowrap"
                    :style="{ color: barColorHex(row) }"
                  >
                    {{ recDateLabel(row.start, progressStart).slice(5) }}：{{ isCompositeMetric ? '—' : fmtNum(row.start?.[progressMetric]) }}
                  </span>
                  <span
                    class="absolute -top-4 text-[10px] font-mono font-semibold whitespace-nowrap"
                    :style="{ left: Math.min(chartWidthPct(row), 78) + '%', color: barColorHex(row) }"
                  >
                    {{ recDateLabel(row.end, progressEnd).slice(5) }}：{{ isCompositeMetric ? fmtScore(chartValue(row)) : fmtNum(row.end?.[progressMetric]) }}
                  </span>
                </template>
              </template>
            </div>
            <span
              class="w-14 text-right font-mono"
              :class="isCompositeMetric ? scoreClass(chartValue(row)) : deltaClass(row.delta?.[progressMetric], currentMetricInfo.better)"
            >
              {{ isCompositeMetric ? fmtScore(chartValue(row)) : fmtDelta(chartValue(row)) }}
            </span>
          </div>
        </div>
        <!-- 選到某位學生後，顯示詳細明細（綜合評分模式會列出每一項指標的起訖值＋差值） -->
        <div
          v-if="selectedBarDetail"
          class="mt-3 border border-base rounded-md p-3 bg-surface2/30 text-xs"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 font-bold">
              <span
                class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                :style="{ backgroundColor: selectedBarDetail.color }"
              />
              {{ selectedBarDetail.name }}
              <span
                v-if="showGroupColumn"
                class="font-normal text-hint-c dark:text-hint-c"
              >（{{ selectedBarDetail.group }}）</span>
              <span
                v-if="selectedBarDetail.scoreLabel"
                class="font-mono"
              >綜合分數 {{ selectedBarDetail.scoreLabel }}</span>
            </div>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="text-teal-600 dark:text-teal-400 hover:underline"
                @click="openCustomer(selectedBarDetail.patnr)"
              >
                查看客戶詳情 →
              </button>
              <button
                type="button"
                class="text-hint-c dark:text-hint-c hover:underline"
                @click="selectedBarPatnr = null"
              >
                收起
              </button>
            </div>
          </div>
          <div class="text-[11px] text-hint-c dark:text-hint-c mb-2">
            {{ selectedBarDetail.dateRange }}　共 {{ selectedBarDetail.recordCount }} 筆
          </div>
          <div class="overflow-x-auto">
            <table class="text-[11px] border-collapse">
              <thead>
              <tr class="text-hint-c dark:text-hint-c">
                <th class="text-left pr-4 pb-1">指標</th>
                <th class="text-right pr-4 pb-1">起始值</th>
                <th class="text-right pr-4 pb-1">結束值</th>
                <th class="text-right pb-1">差值</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="m in selectedBarDetail.metrics"
                :key="m.key"
              >
                <td class="pr-4 py-0.5 whitespace-nowrap">{{ m.label }}</td>
                <td class="text-right pr-4 py-0.5 font-mono">{{ m.start }}</td>
                <td class="text-right pr-4 py-0.5 font-mono">{{ m.end }}</td>
                <td
                  class="text-right py-0.5 font-mono"
                  :class="m.improved === null ? 'text-hint-c' : m.improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                >
                  {{ m.delta }}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div
        v-else-if="progressView === 'bar' && !progressLoading"
        class="mb-5 border border-base rounded-md p-6 bg-surface text-center text-xs text-hint-c dark:text-hint-c"
      >
        尚無資料，請選擇班別與時間段後查詢
      </div>

      <!-- 進步排行：折線圖（SVG 斜率圖，X 軸依實際檢測時間點定位） -->
      <div
        v-if="progressView === 'line' && lineRecordsLoading"
        class="mb-5 border border-base rounded-md p-6 bg-surface text-center text-xs text-hint-c dark:text-hint-c"
      >
        載入各學生完整檢測紀錄中…
      </div>
      <div
        v-else-if="progressView === 'line' && progressLineChart"
        class="mb-5 border border-base rounded-md p-4 bg-surface"
      >
        <div class="text-xs font-bold text-muted-c dark:text-hint-c mb-1">
          {{ isCompositeMetric ? '綜合評分' : currentMetricInfo.label }} 走勢折線圖
          <span
            v-if="rankedProgress.length > PROGRESS_CHART_LIMIT"
            class="font-normal text-hint-c dark:text-hint-c"
          >
            （僅顯示前 {{ PROGRESS_CHART_LIMIT }} 名，共 {{ rankedProgress.length }} 名）
          </span>
        </div>
        <div
          v-if="isCompositeMetric"
          class="text-[11px] text-hint-c dark:text-hint-c mb-3"
        >
          🕒 綜合分數算法跟條形圖一致：把每一筆紀錄跟該學生「期間內第一筆」比較，換算成 0~100 分，分數越高代表累積進步幅度越大（起點不一定是 0 分，是跟同一批學生相對比較出來的）
        </div>
        <div
          v-else
          class="text-[11px] text-hint-c dark:text-hint-c mb-2">
          🕒 每條線代表一位學生在所選期間內「每一筆」檢測紀錄的數值變化（綠色＝進步、紅色＝退步）；滑鼠移到資料點上可快速看一眼日期與數值，點一下線或圖例可以把該學生「選起來」，下方會列出完整明細
        </div>
        <!-- 選取狀態一律顯示在最上面（不用捲到下面才能取消選取） -->
        <div
          v-if="selectedLine"
          class="flex items-center gap-2 text-xs mb-2"
        >
          <span
            class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ backgroundColor: selectedLine.color }"
          />
          <span>已選：<b>{{ selectedLine.name }}</b></span>
          <button
            type="button"
            class="text-teal-600 dark:text-teal-400 hover:underline"
            @click="selectedLinePatnr = null"
          >
            清除選取（顯示全部）
          </button>
        </div>
        <div
          ref="lineChartWrapRef"
          class="w-full"
        >
          <div class="overflow-x-auto">
            <div :style="{ minWidth: (progressLineChart ? progressLineChart.w : 0) + 'px' }">
              <div class="relative">
                <svg
                  v-if="progressLineChart"
                  :viewBox="`0 0 ${progressLineChart.w} ${progressLineChart.h}`"
                  :width="progressLineChart.w"
                  :height="progressLineChart.h"
                  class="block"
                >
                  <!-- 背景：點空白處可以取消選取 -->
                  <rect
                    x="0"
                    y="0"
                    :width="progressLineChart.w"
                    :height="progressLineChart.h"
                    fill="transparent"
                    style="pointer-events: all"
                    @click="selectedLinePatnr = null"
                  />
                  <!-- Y 軸格線＋刻度數值 -->
                  <g v-for="(t, ti) in progressLineChart.yTicks" :key="'y' + ti">
                    <line
                      :x1="progressLineChart.plotLeft"
                      :y1="t.y"
                      :x2="progressLineChart.w"
                      :y2="t.y"
                      stroke="currentColor"
                      class="text-base opacity-20"
                      stroke-width="1"
                    />
                    <text
                      :x="progressLineChart.plotLeft - 6"
                      :y="t.y + 3"
                      text-anchor="end"
                      font-size="12"
                      class="fill-current text-hint-c dark:text-hint-c"
                    >
                      {{ t.label }}
                    </text>
                  </g>
                  <!-- X 軸刻度日期 -->
                  <text
                    v-for="(t, ti) in progressLineChart.xTicks"
                    :key="'x' + ti"
                    :x="t.x"
                    :y="progressLineChart.h - 4"
                    text-anchor="middle"
                    font-size="12"
                    class="fill-current text-hint-c dark:text-hint-c"
                  >
                    {{ t.label }}
                  </text>
                  <g
                    v-for="ln in progressLineChart.lines"
                    :key="ln.patnr"
                  >
                    <path
                      :d="ln.path"
                      fill="none"
                      :stroke="ln.color"
                      :stroke-width="selectedLinePatnr === ln.patnr ? 3 : 1.5"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                      :opacity="selectedLinePatnr && selectedLinePatnr !== ln.patnr ? 0.4 : 0.85"
                      class="cursor-pointer"
                      @click="toggleLineSelect(ln.patnr)"
                    />
                    <circle
                      v-for="pt in ln.points"
                      :key="pt.i"
                      :cx="pt.x"
                      :cy="pt.y"
                      :r="lineHover && lineHover.patnr === ln.patnr && lineHover.pointIndex === pt.i ? 6 : 3"
                      :fill="ln.color"
                      :opacity="selectedLinePatnr && selectedLinePatnr !== ln.patnr ? 0.4 : 1"
                      class="cursor-pointer"
                      style="transition: r 0.1s"
                      @mouseenter="setLineHover(ln, pt)"
                      @mouseleave="clearLineHover"
                      @click="toggleLineSelect(ln.patnr)"
                    />
                    <!-- 選到的那條線，直接在每個點旁邊標出日期＋數值 -->
                    <text
                      v-for="pt in (selectedLinePatnr === ln.patnr ? ln.points : [])"
                      :key="'lbl' + pt.i"
                      :x="pt.x"
                      :y="pt.y < 24 ? pt.y + 16 : pt.y - 8"
                      text-anchor="middle"
                      font-size="11"
                      font-weight="600"
                      :fill="ln.color"
                      class="pointer-events-none"
                    >
                      {{ pt.dateLabel.slice(5) }}：{{ pt.label }}
                    </text>
                  </g>
                </svg>
                <!-- 跟著滑鼠游標的浮動數值卡片 -->
                <div
                  v-if="lineHover"
                  class="absolute pointer-events-none bg-gray-800 text-white text-[11px] rounded px-2 py-1.5 shadow-lg z-10 whitespace-nowrap"
                  :style="{ left: lineHover.x + 'px', top: (lineHover.y - 10) + 'px', transform: 'translate(-50%, -100%)' }"
                >
                  <div class="font-semibold flex items-center gap-1">
                    <span
                      class="inline-block w-2 h-2 rounded-full"
                      :style="{ backgroundColor: lineHover.color }"
                    />
                    {{ lineHover.name }}
                  </div>
                  <div class="text-gray-300">{{ lineHover.date }}</div>
                  <div>數值：<b>{{ lineHover.value }}</b></div>
                </div>
              </div>
              <!-- 點選某條線後，顯示這位學生每一筆的日期＋數值明細 -->
              <div
                v-if="selectedLine"
                class="mt-3 border border-base rounded-md p-3 bg-surface2/30 text-xs"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2 font-bold">
                    <span
                      class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      :style="{ backgroundColor: selectedLine.color }"
                    />
                    {{ selectedLine.name }}　共 {{ selectedLine.pointCount }} 筆
                  </div>
                  <button
                    type="button"
                    class="text-teal-600 dark:text-teal-400 hover:underline"
                    @click="openCustomer(selectedLine.patnr)"
                  >
                    查看客戶詳情 →
                  </button>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 font-mono">
                  <span
                    v-for="pt in selectedLine.points"
                    :key="pt.i"
                  >
                    {{ pt.dateLabel }}：<b :style="{ color: selectedLine.color }">{{ pt.label }}</b>
                  </span>
                </div>
              </div>
              <!-- 圖例：因線條可能重疊，額外用清單列出每位學生的起訖數值；點了會跟圖表上點線一樣效果 -->
              <div class="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px]">
                <div
                  v-for="ln in progressLineChart.lines"
                  :key="ln.patnr"
                  class="flex items-center gap-1 cursor-pointer"
                  :class="{ 'font-bold': selectedLinePatnr === ln.patnr }"
                  @click="toggleLineSelect(ln.patnr)"
                >
                  <span
                    class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    :style="{ backgroundColor: ln.color }"
                  />
                  <span class="text-hint-c dark:text-hint-c">{{ ln.name }}</span>
                  <span class="font-mono">{{ ln.firstLabel }} → {{ ln.lastLabel }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-else-if="progressView === 'line' && !progressLoading"
        class="mb-5 border border-base rounded-md p-6 bg-surface text-center text-xs text-hint-c dark:text-hint-c"
      >
        尚無資料，請選擇班別與時間段後查詢
      </div>

      <div
        v-if="progressView === 'table'"
        class="overflow-x-auto rounded border border-base"
      >
        <table class="w-full border-collapse text-xs">
          <thead class="bg-teal-600 dark:bg-teal-800 text-white">
          <tr>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
              名次
            </th>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-left whitespace-nowrap">
              姓名
            </th>
            <th
              v-if="showGroupColumn"
              class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-left whitespace-nowrap"
            >
              班別
            </th>
            <template v-if="isCompositeMetric">
              <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
                綜合分數
              </th>
            </template>
            <template v-else>
              <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
                起始值
              </th>
              <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
                結束值
              </th>
              <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
                差值
              </th>
            </template>
            <th class="border border-teal-700 dark:border-teal-900 px-2 py-1.5 text-right whitespace-nowrap">
              紀錄筆數
            </th>
          </tr>
          </thead>
          <tbody class="divide-y divide-base">
          <tr v-if="!progressLoading && !rankedProgress.length">
            <td
              :colspan="2 + (showGroupColumn ? 1 : 0) + (isCompositeMetric ? 1 : 3) + 1"
              class="border border-light-c px-4 py-6 text-center text-hint-c dark:text-hint-c"
            >
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
            <td
              v-if="showGroupColumn"
              class="border border-light-c px-2 py-1 whitespace-nowrap"
            >
              {{ row.group1 || '其他' }}
            </td>
            <template v-if="isCompositeMetric">
              <td
                class="border border-light-c px-2 py-1 text-right font-semibold"
                :class="scoreClass(compositeScores.get(row.patnr))"
              >
                {{ fmtScore(compositeScores.get(row.patnr)) }}
              </td>
            </template>
            <template v-else>
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
            </template>
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
