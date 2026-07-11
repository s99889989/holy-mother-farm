<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'pos.pos-accounting' })

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)

const tab = ref<'maintain' | 'browse'>('maintain')

// 資料庫暫停/開啟狀態，兩個頁籤共用同一份（composables/useBk35DbStatus.ts）
const { bk35menuAttached, bksqlAttached, checking, checkStatus } = useBk35DbStatus()

function switchToBrowse() {
  tab.value = 'browse'
  // 切過去時如果還沒抓過資料表清單，順便抓一次
  if (browseDbAttached.value !== false && tables.value.length === 0 && !tablesLoading.value) {
    fetchTables()
  }
}

// ══════════════════ 資料庫維護 ══════════════════

const actionLoading = ref(false)
const uploadLoading = ref(false)
const uploadProgress = ref('')
const lastResults = ref<ActionResult[]>([])

interface ActionResult {
  label: string
  ok: boolean
  [key: string]: any
}

async function confirmAndRun(action: 'detach' | 'attach', label: string) {
  const ok = confirm(`確定要執行「${label}」嗎？這會直接影響正式使用的資料庫。`)
  if (!ok) return

  actionLoading.value = true
  lastResults.value = []
  try {
    const res = await $fetch<Record<string, any>>(
      `${apiBase.value}/holy/bk35sql/admin/${action}`,
      { method: 'POST', credentials: 'include', query: { confirm: true } }
    )
    lastResults.value = [{ label, ok: !!res?.ok, ...res }]
  } catch (e: any) {
    lastResults.value = [{ label, ok: false, error: e?.message ?? '執行失敗' }]
  } finally {
    actionLoading.value = false
    await checkStatus(true)
  }
}

const ALLOWED_FILENAMES = ['bk35menu.mdf', 'bk35menu.ldf', 'bksql.mdf', 'bksql.ldf']

interface FileWithTarget {
  file: File
  target: string | null
}

const selectedFiles = ref<FileWithTarget[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const validFiles = computed(() => selectedFiles.value.filter(f => f.target))

function matchTarget(fileName: string): string | null {
  const lower = fileName.toLowerCase()
  const match = ALLOWED_FILENAMES.find(n => n.toLowerCase() === lower)
  return match ?? null
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  selectedFiles.value = files.map(file => ({ file, target: matchTarget(file.name) }))
}

async function confirmAndUpload() {
  if (!validFiles.value.length) return

  const fileList = validFiles.value.map(f => `${f.file.name} → ${f.target}`).join('\n')
  const ok = confirm(`確定要上傳並覆蓋以下 ${validFiles.value.length} 個檔案嗎？此動作無法復原：\n\n${fileList}`)
  if (!ok) return

  uploadLoading.value = true
  lastResults.value = []
  const results: ActionResult[] = []

  for (let i = 0; i < validFiles.value.length; i++) {
    const item = validFiles.value[i]
    uploadProgress.value = `${i + 1}/${validFiles.value.length}：${item.file.name}`
    try {
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('targetFileName', item.target as string)

      const res = await $fetch<Record<string, any>>(
        `${apiBase.value}/holy/bk35sql/admin/upload`,
        { method: 'POST', credentials: 'include', body: formData }
      )
      results.push({ label: item.file.name, ok: !!res?.ok, ...res })
    } catch (e: any) {
      results.push({ label: item.file.name, ok: false, error: e?.message ?? '上傳失敗' })
    }
  }

  lastResults.value = results
  uploadLoading.value = false
  uploadProgress.value = ''
  selectedFiles.value = []
  if (fileInput.value) fileInput.value.value = ''
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatResults(results: ActionResult[]) {
  return JSON.stringify(results, null, 2)
}

// ══════════════════ 資料庫瀏覽 ══════════════════

interface DataResponse {
  columns: string[]
  rows: Record<string, any>[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  error?: string
}

const tables = ref<string[]>([])
const tablesLoading = ref(false)
const tablesError = ref('')

// 瀏覽頁籤目前選擇的資料庫，對應不同的暫停狀態
const browseDb = ref<'BK35MENU' | 'BKSQL'>('BK35MENU')
const browseDbAttached = computed(() =>
  browseDb.value === 'BK35MENU' ? bk35menuAttached.value : bksqlAttached.value
)

function onDbChange() {
  selectedTable.value = ''
  tables.value = []
  columns.value = []
  rows.value = []
  search.value = ''
  if (browseDbAttached.value !== false) {
    fetchTables()
  }
}

async function fetchTables() {
  if (browseDbAttached.value === false) {
    tablesLoading.value = false
    return
  }
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
    }
  } catch (e: any) {
    tablesError.value = e?.message ?? '取得資料表清單失敗'
  } finally {
    tablesLoading.value = false
  }
}

const selectedTable = ref('')
const search = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const columns = ref<string[]>([])
const rows = ref<Record<string, any>[]>([])
const dataLoading = ref(false)
const dataError = ref('')

async function fetchData(p: number) {
  if (!selectedTable.value) return
  dataLoading.value = true
  dataError.value = ''
  page.value = p
  try {
    const res = await $fetch<DataResponse>(
      `${apiBase.value}/holy/bk35sql/data/${selectedTable.value}`,
      { credentials: 'include', query: { db: browseDb.value, page: p, search: search.value } }
    )
    if (res?.error) {
      dataError.value = res.error
      columns.value = []
      rows.value = []
      total.value = 0
      totalPages.value = 1
    } else {
      columns.value = res?.columns ?? []
      rows.value = res?.rows ?? []
      total.value = res?.total ?? 0
      totalPages.value = res?.totalPages ?? 1
    }
  } catch (e: any) {
    dataError.value = e?.message ?? '載入資料失敗'
  } finally {
    dataLoading.value = false
  }
}

function onTableChange() {
  search.value = ''
  fetchData(1)
  showSchema.value = false
}

function resetSearch() {
  search.value = ''
  fetchData(1)
}

// ══════════════════ 欄位結構查看 ══════════════════
// 對應後端新增的 GET /holy/bk35sql/schema/{table} 端點，
// 不撈資料列，只回傳欄位型別/長度/是否可為 NULL/主鍵，方便規劃新功能時直接複製貼給 Claude 參考。

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

const showSchema = ref(false)
const schemaLoading = ref(false)
const schemaError = ref('')
const schemaResult = ref<SchemaResponse | null>(null)
const copyLabel = ref('複製 JSON')

async function fetchSchema() {
  if (!selectedTable.value) return
  showSchema.value = true
  schemaLoading.value = true
  schemaError.value = ''
  schemaResult.value = null
  try {
    const res = await $fetch<SchemaResponse>(
      `${apiBase.value}/holy/bk35sql/schema/${selectedTable.value}`,
      { credentials: 'include', query: { db: browseDb.value } }
    )
    if (res?.error) {
      schemaError.value = res.error
    } else {
      schemaResult.value = res
    }
  } catch (e: any) {
    schemaError.value = e?.message ?? '取得欄位結構失敗'
  } finally {
    schemaLoading.value = false
  }
}

function closeSchema() {
  showSchema.value = false
}

async function copySchemaJson() {
  if (!schemaResult.value) return
  try {
    await navigator.clipboard.writeText(JSON.stringify(schemaResult.value, null, 2))
    copyLabel.value = '已複製 ✓'
    setTimeout(() => { copyLabel.value = '複製 JSON' }, 1500)
  } catch {
    copyLabel.value = '複製失敗，請手動選取文字'
  }
}

// ══════════════════ 全部資料表結構（一次匯出） ══════════════════
// 對應後端新增的 GET /holy/bk35sql/schema-all 端點，一次撈整個資料庫所有表的結構，
// 不用像上面單表查詢一樣一張一張點。

interface SchemaAllResponse {
  db: string
  tableCount: number
  tables: Record<string, { columns: SchemaColumn[]; primaryKeys: string[] }>
  error?: string
}

const showSchemaAll = ref(false)
const schemaAllLoading = ref(false)
const schemaAllError = ref('')
const schemaAllResult = ref<SchemaAllResponse | null>(null)
const copyAllLabel = ref('複製全部 JSON')

async function fetchSchemaAll() {
  showSchemaAll.value = true
  schemaAllLoading.value = true
  schemaAllError.value = ''
  schemaAllResult.value = null
  try {
    const res = await $fetch<SchemaAllResponse>(
      `${apiBase.value}/holy/bk35sql/schema-all`,
      { credentials: 'include', query: { db: browseDb.value } }
    )
    if (res?.error) {
      schemaAllError.value = res.error
    } else {
      schemaAllResult.value = res
    }
  } catch (e: any) {
    schemaAllError.value = e?.message ?? '取得全部欄位結構失敗'
  } finally {
    schemaAllLoading.value = false
  }
}

function closeSchemaAll() {
  showSchemaAll.value = false
}

async function copySchemaAllJson() {
  if (!schemaAllResult.value) return
  try {
    await navigator.clipboard.writeText(JSON.stringify(schemaAllResult.value, null, 2))
    copyAllLabel.value = '已複製 ✓'
    setTimeout(() => { copyAllLabel.value = '複製全部 JSON' }, 1500)
  } catch {
    copyAllLabel.value = '複製失敗，請手動選取文字'
  }
}

await checkStatus()
</script>

<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">BK35 資料庫管理</h1>
      <div class="tab-switch">
        <button :class="['sw-tab', { active: tab === 'maintain' }]" @click="tab = 'maintain'">資料庫維護</button>
        <button :class="['sw-tab', { active: tab === 'browse' }]" @click="switchToBrowse">資料庫瀏覽</button>
      </div>
      <button class="btn-ghost" @click="checkStatus(true)" :disabled="checking">
        {{ checking ? '檢查中…' : '重新整理狀態' }}
      </button>
    </div>

    <!-- 狀態卡片：兩個頁籤共用同一份狀態 -->
    <div class="status-cards">
      <div class="status-card">
        <div class="status-label">BK35MENU</div>
        <div :class="['status-value', bk35menuAttached ? 'ok' : 'off']">
          {{ bk35menuAttached ? '● 已開啟' : '○ 已暫停 / 無法連線' }}
        </div>
      </div>
      <div class="status-card">
        <div class="status-label">BKSQL</div>
        <div :class="['status-value', bksqlAttached ? 'ok' : 'off']">
          {{ bksqlAttached ? '● 已開啟' : '○ 已暫停 / 無法連線' }}
        </div>
      </div>
    </div>

    <!-- ══════════════════ 資料庫維護 ══════════════════ -->
    <template v-if="tab === 'maintain'">
      <div class="warning-box">
        ⚠️ 這頁會直接停用 / 覆蓋正式使用的資料庫，操作前請確認沒有其他人正在使用 POS，
        且確定要進行這個動作。每個動作都需要二次確認才會執行。
      </div>

      <div class="section">
        <h2 class="section-title">資料庫開關</h2>
        <div class="action-row">
          <button class="btn-danger" :disabled="actionLoading" @click="confirmAndRun('detach', '暫停資料庫')">
            暫停資料庫（Detach）
          </button>
          <button class="btn-primary" :disabled="actionLoading" @click="confirmAndRun('attach', '開啟資料庫')">
            開啟資料庫（Attach）
          </button>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">上傳資料庫檔案</h2>
        <p class="section-hint">
          建議流程：先「暫停資料庫」→ 一次選取 4 個檔案（bk35menu.mdf / bk35menu.ldf / bksql.mdf / bksql.ldf）上傳覆蓋 → 再「開啟資料庫」。
          目標檔案會自動依檔名比對，不用手動選。資料庫還在開啟狀態時系統會拒絕上傳，避免資料損毀。
        </p>
        <div class="upload-row">
          <input ref="fileInput" type="file" class="file-input" multiple @change="onFileChange" />
          <button class="btn-primary" :disabled="!validFiles.length || uploadLoading" @click="confirmAndUpload">
            {{ uploadLoading ? `上傳中…（${uploadProgress}）` : `上傳並覆蓋（${validFiles.length} 個檔案）` }}
          </button>
        </div>

        <ul v-if="selectedFiles.length" class="file-preview-list">
          <li v-for="f in selectedFiles" :key="f.file.name" :class="{ invalid: !f.target }">
            {{ f.file.name }}（{{ formatSize(f.file.size) }}）
            <span v-if="f.target">→ 將覆蓋 <strong>{{ f.target }}</strong></span>
            <span v-else class="invalid-hint">⚠️ 不在允許覆蓋的檔名清單內，這個檔案不會被上傳</span>
          </li>
        </ul>
      </div>

      <div class="section" v-if="lastResults.length">
        <h2 class="section-title">執行結果</h2>
        <div v-for="(r, i) in lastResults" :key="i" class="result-item">
          <span :class="['result-badge', r.ok ? 'ok' : 'fail']">{{ r.ok ? '成功' : '失敗' }}</span>
          <span class="result-label">{{ r.label }}</span>
        </div>
        <pre class="output-box">{{ formatResults(lastResults) }}</pre>
      </div>
    </template>

    <!-- ══════════════════ 資料庫瀏覽 ══════════════════ -->
    <template v-else>
      <div v-if="browseDbAttached === false" class="paused-banner">
        ⏸ {{ browseDb }} 目前已暫停（Detach），查詢功能暫時無法使用，請先到「資料庫維護」頁籤開啟資料庫後再試。
      </div>

      <template v-else>
        <div class="filter-bar">
          <select v-model="browseDb" class="table-select" @change="onDbChange">
            <option value="BK35MENU">BK35MENU</option>
            <option value="BKSQL">BKSQL</option>
          </select>
          <button class="btn-ghost" @click="fetchSchemaAll">📋 匯出全部資料表結構</button>
          <select v-model="selectedTable" class="table-select" @change="onTableChange">
            <option value="" disabled>選擇資料表…</option>
            <option v-for="t in tables" :key="t" :value="t">{{ t }}</option>
          </select>
          <input
            v-model="search"
            placeholder="搜尋內容…"
            class="search-input"
            :disabled="!selectedTable"
            @keyup.enter="fetchData(1)"
          />
          <button class="btn-primary" :disabled="!selectedTable" @click="fetchData(1)">查詢</button>
          <button class="btn-ghost" :disabled="!selectedTable" @click="resetSearch">清除</button>
          <button class="btn-ghost" :disabled="!selectedTable" @click="fetchSchema">📋 查看欄位結構</button>
          <span class="total-hint" v-if="selectedTable">共 {{ total }} 筆</span>
        </div>

        <div v-if="tablesLoading" class="loading">載入資料表清單中…</div>
        <div v-else-if="tablesError" class="error-box">{{ tablesError }}</div>

        <template v-else-if="selectedTable">
          <div v-if="dataLoading" class="loading">載入中…</div>
          <div v-else-if="dataError" class="error-box">{{ dataError }}</div>
          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
              <tr>
                <th v-for="col in columns" :key="col">{{ col }}</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(row, i) in rows" :key="i">
                <td v-for="col in columns" :key="col">
                  <span v-if="row[col] === null || row[col] === undefined" class="text-muted">-</span>
                  <span v-else>{{ row[col] }}</span>
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td :colspan="columns.length || 1" class="empty-cell">查無資料</td>
              </tr>
              </tbody>
            </table>
          </div>

          <div v-if="totalPages > 1" class="pagination">
            <button :disabled="page === 1" class="page-btn" @click="fetchData(page - 1)">‹ 上一頁</button>
            <span class="page-info">第 {{ page }} / {{ totalPages }} 頁</span>
            <button :disabled="page === totalPages" class="page-btn" @click="fetchData(page + 1)">下一頁 ›</button>
          </div>
        </template>

        <div v-else class="empty-hint">請先選擇一張資料表</div>
      </template>
    </template>

    <!-- ══════════════════ 欄位結構彈窗 ══════════════════ -->
    <div v-if="showSchema" class="schema-overlay" @click.self="closeSchema">
      <div class="schema-modal">
        <div class="schema-modal-header">
          <h2 class="section-title">{{ selectedTable }} 欄位結構（{{ browseDb }}）</h2>
          <button class="btn-ghost small" @click="closeSchema">✕ 關閉</button>
        </div>

        <div v-if="schemaLoading" class="loading">載入中…</div>
        <div v-else-if="schemaError" class="error-box">{{ schemaError }}</div>

        <template v-else-if="schemaResult">
          <div class="schema-actions">
            <span v-if="schemaResult.primaryKeys.length" class="total-hint">
              主鍵：{{ schemaResult.primaryKeys.join(', ') }}
            </span>
            <span v-else class="total-hint">此表未偵測到主鍵</span>
            <button class="btn-primary small" @click="copySchemaJson">{{ copyLabel }}</button>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
              <tr>
                <th>欄位名稱</th>
                <th>型別</th>
                <th>長度 / 精度</th>
                <th>可為 NULL</th>
                <th>預設值</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="c in schemaResult.columns" :key="c.name">
                <td>
                  {{ c.name }}
                  <span v-if="schemaResult.primaryKeys.includes(c.name)" class="pk-badge">PK</span>
                </td>
                <td>{{ c.type }}</td>
                <td>
                  <span v-if="c.maxLength">{{ c.maxLength }}</span>
                  <span v-else-if="c.numericPrecision">{{ c.numericPrecision }}<span v-if="c.numericScale">,{{ c.numericScale }}</span></span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td>{{ c.nullable ? '可為 NULL' : '必填' }}</td>
                <td>
                  <span v-if="c.default">{{ c.default }}</span>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <p class="section-hint">下面是完整 JSON，複製後可以直接貼給 Claude 參考：</p>
          <pre class="output-box schema-json">{{ JSON.stringify(schemaResult, null, 2) }}</pre>
        </template>
      </div>
    </div>

    <!-- ══════════════════ 全部資料表結構彈窗 ══════════════════ -->
    <div v-if="showSchemaAll" class="schema-overlay" @click.self="closeSchemaAll">
      <div class="schema-modal">
        <div class="schema-modal-header">
          <h2 class="section-title">{{ browseDb }} 全部資料表結構</h2>
          <button class="btn-ghost small" @click="closeSchemaAll">✕ 關閉</button>
        </div>

        <div v-if="schemaAllLoading" class="loading">載入中，資料表較多可能要幾秒…</div>
        <div v-else-if="schemaAllError" class="error-box">{{ schemaAllError }}</div>

        <template v-else-if="schemaAllResult">
          <div class="schema-actions">
            <span class="total-hint">共 {{ schemaAllResult.tableCount }} 張資料表</span>
            <button class="btn-primary small" @click="copySchemaAllJson">{{ copyAllLabel }}</button>
          </div>

          <details
            v-for="(info, tname) in schemaAllResult.tables"
            :key="tname"
            class="schema-table-detail"
          >
            <summary>
              {{ tname }}（{{ info.columns.length }} 欄位<span v-if="info.primaryKeys.length">，主鍵：{{ info.primaryKeys.join(', ') }}</span>）
            </summary>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                <tr>
                  <th>欄位名稱</th>
                  <th>型別</th>
                  <th>長度 / 精度</th>
                  <th>可為 NULL</th>
                  <th>預設值</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="c in info.columns" :key="c.name">
                  <td>
                    {{ c.name }}
                    <span v-if="info.primaryKeys.includes(c.name)" class="pk-badge">PK</span>
                  </td>
                  <td>{{ c.type }}</td>
                  <td>
                    <span v-if="c.maxLength">{{ c.maxLength }}</span>
                    <span v-else-if="c.numericPrecision">{{ c.numericPrecision }}<span v-if="c.numericScale">,{{ c.numericScale }}</span></span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>{{ c.nullable ? '可為 NULL' : '必填' }}</td>
                  <td>
                    <span v-if="c.default">{{ c.default }}</span>
                    <span v-else class="text-muted">-</span>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </details>

          <p class="section-hint">或直接按上面「複製全部 JSON」貼給 Claude 參考，比一張一張複製快很多。</p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrap { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }

.tab-switch { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.sw-tab { padding: 6px 16px; font-size: 13px; border: none; background: var(--surface); color: var(--text-muted); cursor: pointer; }
.sw-tab.active { background: var(--accent); color: #fff; }

.status-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.status-card { background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 16px 20px; }
.status-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.status-value { font-size: 16px; font-weight: 700; }
.status-value.ok { color: #1e7e34; }
.status-value.off { color: #c0392b; }

.warning-box { font-size: 13px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 12px 16px; line-height: 1.6; }

.section { background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.section-title { font-size: 14px; font-weight: 700; color: var(--text); margin: 0; display: flex; align-items: center; gap: 8px; }
.section-hint { font-size: 12px; color: var(--text-hint); margin: 0; line-height: 1.6; }

.action-row { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-primary { padding: 8px 18px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { padding: 8px 18px; background: #c0392b; color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.upload-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.file-input { font-size: 13px; }

.file-preview-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.file-preview-list li { font-size: 12px; color: var(--text-muted); background: var(--surface2); border-radius: var(--radius-sm); padding: 6px 10px; }
.file-preview-list li.invalid { background: #fdecea; color: #c0392b; }
.file-preview-list li strong { color: var(--text); }
.invalid-hint { font-weight: 600; }

.result-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.result-label { color: var(--text); }

.result-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
.result-badge.ok { background: #e6f4ea; color: #1e7e34; }
.result-badge.fail { background: #fdecea; color: #c0392b; }
.output-box { background: #1e1e1e; color: #d4d4d4; font-size: 12px; padding: 12px 14px; border-radius: var(--radius-sm); overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; max-height: 320px; overflow-y: auto; }

.paused-banner { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 12px 16px; }

.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.table-select { padding: 7px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; min-width: 200px; }
.table-select:focus { border-color: var(--accent); }
.search-input { width: 220px; padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.search-input:focus { border-color: var(--accent); }
.search-input:disabled, .table-select:disabled { opacity: 0.5; }
.total-hint { font-size: 13px; color: var(--text-hint); }

.loading { color: var(--text-hint); font-size: 14px; }
.error-box { color: #c0392b; font-size: 13px; background: #fdecea; border: 1px solid #f5c6cb; border-radius: var(--radius-sm); padding: 10px 14px; }
.empty-hint { color: var(--text-hint); font-size: 14px; padding: 24px 0; text-align: center; }
.empty-cell { text-align: center; color: var(--text-hint); padding: 24px 0 !important; }

.table-wrap { overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius); background: var(--surface); }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { background: var(--surface2); padding: 10px 14px; text-align: left; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-light); white-space: nowrap; }
.data-table td { padding: 9px 14px; border-bottom: 1px solid var(--border-light); color: var(--text); white-space: nowrap; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--accent-light); }
.text-muted { color: var(--text-muted); font-size: 12px; }

.pagination { display: flex; align-items: center; gap: 12px; justify-content: center; }
.page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
.page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-muted); }

/* 欄位結構彈窗 */
.btn-ghost.small, .btn-primary.small { padding: 4px 10px; font-size: 12px; }
.schema-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 24px; }
.schema-modal { background: var(--surface); border-radius: var(--radius); padding: 20px 24px; width: min(720px, 100%); max-height: 85vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.schema-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.schema-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pk-badge { display: inline-block; margin-left: 6px; font-size: 10px; font-weight: 700; color: #fff; background: var(--accent); border-radius: 4px; padding: 1px 5px; vertical-align: middle; }
.schema-json { max-height: 260px; }
.schema-table-detail { border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 4px 0; }
.schema-table-detail summary { cursor: pointer; padding: 8px 12px; font-size: 13px; font-weight: 600; color: var(--text); }
.schema-table-detail summary:hover { color: var(--accent); }
.schema-table-detail .table-wrap { margin: 0 12px 10px; border: none; }
</style>
