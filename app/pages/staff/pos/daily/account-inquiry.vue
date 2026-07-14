<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'pos.daily.pos-sales' })

  // ══════════════════════════════════════════════════════════════════
  // 這頁目前沒有專屬的後端彙總 API，是用現成的通用端點
  // （/holy/bk35sql/tables、/holy/bk35sql/schema/{table}、/holy/bk35sql/data/{table}）
  // 在前端把資料表裡的「每一筆訂單/帳單」依日期加總成月報表。
  // 因為每個資料表的欄位命名不一定一樣，所以底下「欄位對應設定」讓你自己
  // 選日期欄位、以及每一個分類（餐廳現金、小舖信用卡…）要加總哪個資料庫欄位。
  // 設定會存在瀏覽器 localStorage，下次進來會記得。
  // 之後如果後端補了專門的彙總 API，這支頁面的「抓資料＋加總」那段可以整個換掉。
  // ══════════════════════════════════════════════════════════════════

  interface DataResponse {
    columns: string[]
    rows: Record<string, any>[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    error?: string
  }

  interface SchemaColumn {
    name: string
    type: string
    maxLength: number | null
    numericPrecision: number | null
    numericScale: number | null
    nullable: boolean
  default: string | null
  }

  interface SchemaResponse {
    table: string
    columns: SchemaColumn[]
    primaryKeys: string[]
    error?: string
  }

  interface CategoryConfig {
    key: string
    label: string
    column: string
  }

  const commonStore = useCommonStore()
  const apiBase = computed(() => commonStore.data.main_url)

  // 資料庫暫停/開啟狀態（跨頁面共用快取，見 composables/useBk35DbStatus.ts）
  const { bk35menuAttached, bksqlAttached, checkStatus } = useBk35DbStatus()

  function formatMoney(n: number) {
    if (n === null || n === undefined || isNaN(n)) return '0'
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  function currentMonthStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  // ══════════════════ 資料表 + 欄位選擇 ══════════════════

  const browseDb = ref<'BK35MENU' | 'BKSQL'>('BKSQL')
  const browseDbAttached = computed(() =>
    browseDb.value === 'BK35MENU' ? bk35menuAttached.value : bksqlAttached.value
  )

  const tables = ref<string[]>([])
  const tablesLoading = ref(false)
  const tablesError = ref('')

  async function fetchTables() {
    if (browseDbAttached.value === false) return
    tablesLoading.value = true
    tablesError.value = ''
    try {
      const res = await $fetch<string[] | { error: string }>(
        `${apiBase.value}/holy/bk35sql/tables`,
          { credentials: 'include', query: { db: browseDb.value } }
      )
      if (Array.isArray(res)) {
        tables.value = res
      } else {
        tablesError.value = res?.error ?? '取得資料表清單失敗'
        tables.value = []
      }
    } catch (e: any) {
      tablesError.value = e?.message ?? '取得資料表清單失敗'
    } finally {
      tablesLoading.value = false
    }
  }

  function onDbChange() {
    selectedTable.value = ''
    availableColumns.value = []
    fetchTables()
  }

  const selectedTable = ref('')
  const availableColumns = ref<string[]>([])
  const columnsLoading = ref(false)
  const columnsError = ref('')

  async function fetchColumns() {
    if (!selectedTable.value) {
      availableColumns.value = []
      return
    }
    columnsLoading.value = true
    columnsError.value = ''
    try {
      const res = await $fetch<SchemaResponse>(
        `${apiBase.value}/holy/bk35sql/schema/${selectedTable.value}`,
          { credentials: 'include', query: { db: browseDb.value } }
      )
      if (res?.error) {
        columnsError.value = res.error
        availableColumns.value = []
      } else {
        availableColumns.value = (res?.columns ?? []).map(c => c.name)
      }
    } catch (e: any) {
      columnsError.value = e?.message ?? '取得欄位結構失敗'
      availableColumns.value = []
    } finally {
      columnsLoading.value = false
    }
  }

  function onTableChange() {
    fetchColumns()
    saveMapping()
  }

  // ══════════════════ 欄位對應設定（存 localStorage） ══════════════════

  const STORAGE_KEY = 'posSalesAnalysisMappingV1'

  const dateColumn = ref('')
  const categories = ref<CategoryConfig[]>([
    { key: 'c1', label: '餐廳現金', column: '' },
    { key: 'c2', label: '小舖信用卡', column: '' },
    { key: 'c3', label: '宅配代收款', column: '' },
    { key: 'c4', label: '宅配匯款', column: '' },
    { key: 'c5', label: '簽帳（賒帳）', column: '' },
    { key: 'c6', label: '折讓', column: '' },
    { key: 'c7', label: '消費券／生日券', column: '' }
  ])
  const totalMode = ref<'auto' | 'column'>('auto')
  const totalColumn = ref('')

  let catSeq = 8
  function addCategory() {
    categories.value.push({ key: `c${catSeq++}`, label: '新欄位', column: '' })
  }
  function removeCategory(key: string) {
    categories.value = categories.value.filter(c => c.key !== key)
  }

  function saveMapping() {
    if (typeof window === 'undefined') return
    const payload = {
      db: browseDb.value,
      table: selectedTable.value,
      dateColumn: dateColumn.value,
      categories: categories.value,
      totalMode: totalMode.value,
      totalColumn: totalColumn.value,
      useSearchFilter: useSearchFilter.value,
      maxPages: maxPages.value
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // localStorage 存不進去（無痕模式等）就算了，不影響本次操作
    }
  }

  function loadMapping() {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved.db) browseDb.value = saved.db
      if (saved.table) selectedTable.value = saved.table
      if (saved.dateColumn) dateColumn.value = saved.dateColumn
      if (Array.isArray(saved.categories) && saved.categories.length) {
        categories.value = saved.categories
        catSeq = categories.value.length + 1
      }
      if (saved.totalMode) totalMode.value = saved.totalMode
      if (saved.totalColumn) totalColumn.value = saved.totalColumn
      if (typeof saved.useSearchFilter === 'boolean') useSearchFilter.value = saved.useSearchFilter
      if (saved.maxPages) maxPages.value = saved.maxPages
    } catch {
      // 存的格式壞掉就當作沒有設定，用預設值
    }
  }

  const showMappingPanel = ref(true)

  // ══════════════════ 抓資料策略 ══════════════════
  // 後端 /holy/bk35sql/data/{table} 只支援 search 自由文字搜尋 + 固定分頁，沒有結構化日期篩選。
  // 預設用「月份字串」（例如 2026-04）當 search 關鍵字縮小範圍，抓取比較快；
  // 但若日期欄位在資料庫裡的文字表示法搜不到月份字串，可以關掉這個選項，
  // 改成整張表逐頁掃描、在前端依日期欄位篩選（比較慢，大資料表要注意頁數上限）。

  const useSearchFilter = ref(true)
  const maxPages = ref(200)

  async function fetchServerPage(p: number, search: string): Promise<DataResponse> {
    return await $fetch<DataResponse>(
      `${apiBase.value}/holy/bk35sql/data/${selectedTable.value}`,
        { credentials: 'include', query: { db: browseDb.value, page: p, search } }
    )
  }

  async function fetchAllRelevantRows(): Promise<{ rows: Record<string, any>[]; truncated: boolean }> {
    const all: Record<string, any>[] = []
    const searchTerm = useSearchFilter.value ? monthStr.value : ''
    let page = 1
    let totalPages = 1
    let truncated = false
    do {
      const res = await fetchServerPage(page, searchTerm)
      if (res?.error) throw new Error(res.error)
      all.push(...(res?.rows ?? []))
      totalPages = res?.totalPages ?? 1
      if (page >= maxPages.value && page < totalPages) {
        truncated = true
        break
      }
      page++
    } while (page <= totalPages)
    return { rows: all, truncated }
  }

  // ══════════════════ 月報表產生 ══════════════════

  interface DayRow {
    dateStr: string
    day: number
    weekday: string
    isWeekend: boolean
    values: Record<string, number>
    total: number
  }

  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

  const monthStr = ref(currentMonthStr())
  const loading = ref(false)
  const error = ref('')
  const reportRows = ref<DayRow[]>([])
  const reportTotals = ref<Record<string, number>>({})
  const grandTotal = ref(0)
  const fetchedRowCount = ref(0)
  const matchedRowCount = ref(0)
  const wasTruncated = ref(false)
  const lastRunAt = ref('')

  function parseDateCell(raw: any): string | null {
    if (raw === null || raw === undefined || raw === '') return null
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function numOrZero(raw: any): number {
    if (raw === null || raw === undefined || raw === '') return 0
    const n = Number(raw)
    return isNaN(n) ? 0 : n
  }

  async function runReport() {
    if (dbAttached.value === false) {
      error.value = '資料庫目前已暫停（Detach），請聯繫管理員開啟後再查詢。'
      return
    }
    if (!selectedTable.value) {
      error.value = '請先選擇要統計的資料表'
      return
    }
    if (!dateColumn.value) {
      error.value = '請先在欄位對應設定裡選擇日期欄位'
      return
    }

    loading.value = true
    error.value = ''
    reportRows.value = []
    saveMapping()

    try {
      const { rows: rawRows, truncated } = await fetchAllRelevantRows()
      fetchedRowCount.value = rawRows.length
      wasTruncated.value = truncated

      const [y, m] = monthStr.value.split('-').map(Number)
      const daysInMonth = new Date(y, m, 0).getDate()

      const buckets = new Map<string, DayRow>()
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const dow = new Date(y, m - 1, day).getDay()
        const values: Record<string, number> = {}
        categories.value.forEach(c => { values[c.key] = 0 })
        buckets.set(dateStr, {
          dateStr,
          day,
          weekday: WEEKDAYS[dow],
          isWeekend: dow === 0 || dow === 6,
          values,
          total: 0
        })
      }

      let matched = 0
      for (const row of rawRows) {
        const dateStr = parseDateCell(row[dateColumn.value])
        if (!dateStr || !buckets.has(dateStr)) continue
        matched++
        const bucket = buckets.get(dateStr)!
        for (const cat of categories.value) {
          if (cat.column) bucket.values[cat.key] += numOrZero(row[cat.column])
        }
        if (totalMode.value === 'column' && totalColumn.value) {
          bucket.total += numOrZero(row[totalColumn.value])
        }
      }
      matchedRowCount.value = matched

      const totals: Record<string, number> = {}
      categories.value.forEach(c => { totals[c.key] = 0 })
      let grand = 0
      for (const bucket of buckets.values()) {
        if (totalMode.value === 'auto') {
          bucket.total = categories.value.reduce((s, c) => s + bucket.values[c.key], 0)
        }
        categories.value.forEach(c => { totals[c.key] += bucket.values[c.key] })
        grand += bucket.total
      }
      reportTotals.value = totals
      grandTotal.value = grand
      reportRows.value = [...buckets.values()]
      lastRunAt.value = new Date().toLocaleString()
    } catch (e: any) {
      error.value = e?.message ?? '載入資料失敗'
    } finally {
      loading.value = false
    }
  }

  // ══════════════════ CSV 匯出 ══════════════════

  function exportCsv() {
    if (!reportRows.value.length) return
    const headers = ['日期', '星期', ...categories.value.map(c => c.label), '總計']
    const lines = [headers.join(',')]
    for (const r of reportRows.value) {
      const cells = [
        r.dateStr,
        r.weekday,
        ...categories.value.map(c => String(r.values[c.key] ?? 0)),
        String(r.total)
      ]
      lines.push(cells.join(','))
    }
    lines.push([
      '合計', '',
      ...categories.value.map(c => String(reportTotals.value[c.key] ?? 0)),
      String(grandTotal.value)
    ].join(','))

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `銷售分析_${selectedTable.value}_${monthStr.value}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  onMounted(async () => {
    loadMapping()
    await checkStatus()
    await fetchTables()
    if (selectedTable.value) {
      await fetchColumns()
    }
  })
</script>

<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">銷售分析</h1>
      <span class="beta-badge">以通用資料表 API 手動彙總 · 待補專屬後端</span>
    </div>

    <div v-if="dbAttached === false" class="paused-banner">
      ⏸ 資料庫目前已暫停（Detach），查詢功能暫時無法使用，請聯繫管理員開啟資料庫後再試。
    </div>

    <p class="hint-banner">
      這頁目前還沒有專屬的後端彙總 API，是用「瀏覽資料表」的通用端點在前端手動加總。
      請先在下方「欄位對應設定」選擇要統計的資料表、日期欄位，以及每個分類要加總的欄位，
      設定會自動存在瀏覽器裡，下次不用重設。之後補了專屬 API 可以再把這段換掉。
    </p>

    <!-- ══════════════════ 欄位對應設定 ══════════════════ -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">欄位對應設定</h2>
        <button class="btn-ghost small" @click="showMappingPanel = !showMappingPanel">
          {{ showMappingPanel ? '收合' : '展開' }}
        </button>
      </div>

      <template v-if="showMappingPanel">
        <div class="form-row-inline">
          <div class="form-row">
            <label class="form-label">資料庫</label>
            <select v-model="browseDb" class="form-select" @change="onDbChange">
              <option value="BKSQL">BKSQL</option>
              <option value="BK35MENU">BK35MENU</option>
            </select>
          </div>

          <div class="form-row">
            <label class="form-label">資料表</label>
            <select v-model="selectedTable" class="form-select" :disabled="tablesLoading" @change="onTableChange">
              <option value="">請選擇資料表</option>
              <option v-for="t in tables" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <div class="form-row">
            <label class="form-label">日期欄位</label>
            <select v-model="dateColumn" class="form-select" :disabled="!availableColumns.length" @change="saveMapping">
              <option value="">請選擇日期欄位</option>
              <option v-for="c in availableColumns" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <p v-if="tablesLoading || columnsLoading" class="loading">載入欄位中…</p>
        <p v-if="tablesError" class="error-box">{{ tablesError }}</p>
        <p v-if="columnsError" class="error-box">{{ columnsError }}</p>

        <div class="mapping-table-wrap">
          <table class="mapping-table">
            <thead>
            <tr>
              <th>分類名稱</th>
              <th>對應欄位（加總用）</th>
              <th></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="cat in categories" :key="cat.key">
              <td>
                <input v-model="cat.label" class="form-input" placeholder="分類名稱" @change="saveMapping">
              </td>
              <td>
                <select v-model="cat.column" class="form-select" :disabled="!availableColumns.length" @change="saveMapping">
                  <option value="">（不加總）</option>
                  <option v-for="c in availableColumns" :key="c" :value="c">{{ c }}</option>
                </select>
              </td>
              <td>
                <button class="btn-ghost small" @click="removeCategory(cat.key); saveMapping()">移除</button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
        <button class="btn-ghost small" @click="addCategory">＋ 新增分類欄位</button>

        <div class="form-row-inline">
          <div class="form-row">
            <label class="form-label">總計欄位</label>
            <div class="tab-switch">
              <button :class="['sw-tab', { active: totalMode === 'auto' }]" @click="totalMode = 'auto'; saveMapping()">
                自動加總各分類
              </button>
              <button :class="['sw-tab', { active: totalMode === 'column' }]" @click="totalMode = 'column'; saveMapping()">
                指定資料庫欄位
              </button>
            </div>
          </div>
          <div v-if="totalMode === 'column'" class="form-row">
            <label class="form-label">總計對應欄位</label>
            <select v-model="totalColumn" class="form-select" :disabled="!availableColumns.length" @change="saveMapping">
              <option value="">請選擇欄位</option>
              <option v-for="c in availableColumns" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <div class="form-row-inline">
          <label class="inline-checkbox">
            <input v-model="useSearchFilter" type="checkbox" @change="saveMapping">
            用月份字串（例如 {{ monthStr }}）當搜尋關鍵字縮小抓取範圍（較快，但若日期欄位文字格式搜不到月份字串會漏資料）
          </label>
        </div>
        <div v-if="!useSearchFilter" class="form-row-inline">
          <div class="form-row">
            <label class="form-label">最多掃描頁數上限</label>
            <input v-model.number="maxPages" type="number" min="1" class="form-input small-input" @change="saveMapping">
          </div>
          <p class="section-hint">關掉搜尋加速時會逐頁掃描整張表，資料量大時請留意頁數上限，避免等太久。</p>
        </div>
      </template>
    </div>

    <!-- ══════════════════ 月份選擇 + 查詢 ══════════════════ -->
    <div class="section">
      <div class="form-row-inline">
        <div class="form-row">
          <label class="form-label">統計月份</label>
          <input v-model="monthStr" type="month" class="form-input">
        </div>
        <button class="btn-primary" :disabled="loading" @click="runReport">
          {{ loading ? '查詢中…' : '產生月報表' }}
        </button>
        <button class="btn-ghost" :disabled="!reportRows.length" @click="exportCsv">
          匯出 CSV
        </button>
      </div>

      <p v-if="lastRunAt" class="section-hint">
        最後查詢時間：{{ lastRunAt }}　抓取 {{ fetchedRowCount }} 筆原始資料，其中 {{ matchedRowCount }} 筆落在 {{ monthStr }}
        <span v-if="wasTruncated" class="warn-text">（已達掃描頁數上限，資料可能不完整，可調高上限重試）</span>
      </p>

      <p v-if="error" class="error-box">{{ error }}</p>
      <p v-if="loading" class="loading">查詢中，資料量大時可能要等一下…</p>
    </div>

    <!-- ══════════════════ 報表結果 ══════════════════ -->
    <div v-if="reportRows.length" class="table-wrap">
      <table class="report-table">
        <thead>
        <tr>
          <th>日期</th>
          <th>星期</th>
          <th v-for="cat in categories" :key="cat.key">{{ cat.label }}</th>
          <th>總計</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="r in reportRows" :key="r.dateStr" :class="{ weekend: r.isWeekend }">
          <td>{{ monthStr }}-{{ String(r.day).padStart(2, '0') }}</td>
          <td>{{ r.weekday }}</td>
          <td v-for="cat in categories" :key="cat.key" class="num-cell">{{ formatMoney(r.values[cat.key]) }}</td>
          <td class="num-cell total-cell">{{ formatMoney(r.total) }}</td>
        </tr>
        </tbody>
        <tfoot>
        <tr class="totals-row">
          <td colspan="2">合計</td>
          <td v-for="cat in categories" :key="cat.key" class="num-cell">{{ formatMoney(reportTotals[cat.key]) }}</td>
          <td class="num-cell total-cell">{{ formatMoney(grandTotal) }}</td>
        </tr>
        </tfoot>
      </table>
    </div>

    <div v-else-if="!loading && lastRunAt" class="empty-hint">
      這個月份查無符合條件的資料。
    </div>
  </div>
</template>

<style scoped>
  .page-wrap { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .page-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }
  .beta-badge { font-size: 11px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: 999px; padding: 3px 10px; }

  .hint-banner { font-size: 12px; color: var(--text-hint); background: var(--surface2); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 10px 14px; margin: 0; line-height: 1.6; }
  .paused-banner { font-size: 13px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 12px 16px; }

  .section { background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .section-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
  .section-hint { font-size: 12px; color: var(--text-hint); margin: 0; line-height: 1.6; }
  .warn-text { color: #c0392b; font-weight: 600; }

  .form-row-inline { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
  .form-row { display: flex; flex-direction: column; gap: 4px; }
  .form-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
  .form-input { padding: 8px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
  .form-input:focus { border-color: var(--accent); }
  .form-input.small-input { width: 100px; }
  .form-select { padding: 8px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; min-width: 180px; }
  .form-select:focus { border-color: var(--accent); }
  .form-select:disabled { opacity: 0.5; }

  .inline-checkbox { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); line-height: 1.6; }

  .tab-switch { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; width: fit-content; }
  .sw-tab { padding: 6px 14px; font-size: 13px; border: none; background: var(--surface); color: var(--text-muted); cursor: pointer; }
  .sw-tab.active { background: var(--accent); color: #fff; }

  .btn-primary { padding: 8px 18px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
  .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost.small { padding: 4px 10px; font-size: 12px; }

  .loading { color: var(--text-hint); font-size: 13px; margin: 0; }
  .error-box { color: #c0392b; font-size: 13px; background: #fdecea; border: 1px solid #f5c6cb; border-radius: var(--radius-sm); padding: 10px 14px; margin: 0; }
  .empty-hint { color: var(--text-hint); font-size: 13px; padding: 24px 0; text-align: center; }

  .mapping-table-wrap { overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius-sm); }
  .mapping-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .mapping-table th { background: var(--surface2); padding: 8px 12px; text-align: left; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-light); }
  .mapping-table td { padding: 6px 8px; border-bottom: 1px solid var(--border-light); }
  .mapping-table tr:last-child td { border-bottom: none; }

  .table-wrap { overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius); background: var(--surface); }
  .report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .report-table th { background: var(--surface2); padding: 10px 14px; text-align: left; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-light); white-space: nowrap; }
  .report-table td { padding: 9px 14px; border-bottom: 1px solid var(--border-light); color: var(--text); white-space: nowrap; }
  .report-table tr:last-child td { border-bottom: none; }
  .report-table tr:hover td { background: var(--accent-light); }
  .report-table tr.weekend td { background: var(--surface2); }
  .num-cell { text-align: right; font-variant-numeric: tabular-nums; }
  .total-cell { font-weight: 700; color: var(--accent); }
  .totals-row td { font-weight: 700; background: var(--surface2); border-top: 2px solid var(--border); }
</style>
