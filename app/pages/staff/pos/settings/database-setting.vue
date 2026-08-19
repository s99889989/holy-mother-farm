<script setup lang="ts">
definePageMeta({ layout: 'pos', requiredPermission: 'pos.pos-accounting' })

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)

// 上傳分段用：直接打家中主機，不走 nuxt.config.ts 的 /api routeRules proxy。
// 這條代理是為了讓一般 API 請求變成同網域第一方 cookie（解 iOS ITP 問題），
// 但上傳這幾支端點不需要帶登入態 cookie，直接繞過代理就能避開
// Netlify Function 6MB 請求本體的硬性上限，不用切成一堆小分段。
const directApiBase = useRuntimeConfig().public.apiBase

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

// Cloudflare 代理對單次請求本體有 100MB 上限，超過會在代理層被擋掉，
// 回傳一個空的 500，連後端 controller 都進不去。這裡把每片切到遠低於
// 100MB，留足夠的安全邊界（multipart 表單本身也有一點額外開銷）。
// 不再受 Netlify Function 6MB 限制（因為直接繞過 proxy 打家中主機），
// 分段大小可以放大一點，減少來回次數；上限還是要顧到後端
// application.properties 的 spring.servlet.multipart.max-file-size（目前 200MB）
const CHUNK_SIZE = 20 * 1024 * 1024 // 20MB

function makeUploadId() {
  // crypto.randomUUID() 在 https / localhost 才有，保險起見加個 fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// 上傳前先把整個檔案用瀏覽器原生的 CompressionStream 壓成 gzip，再切片上傳。
// 除了省流量，binary 內容變成亂碼狀，也能避開像 Cloudflare WAF 把資料庫檔案裡
// 夾帶的文字內容（stored procedure、欄位名稱等）誤判成攻擊特徵而擋掉的狀況。
// 瀏覽器不支援 CompressionStream 時自動退回不壓縮，行為跟原本一樣。
async function maybeCompressFile(file: File): Promise<{ blob: Blob, compressed: boolean }> {
  if (typeof CompressionStream === 'undefined') {
    return { blob: file, compressed: false }
  }
  try {
    const compressedStream = file.stream().pipeThrough(new CompressionStream('gzip'))
    const compressedBlob = await new Response(compressedStream).blob()
    return { blob: compressedBlob, compressed: true }
  } catch {
    return { blob: file, compressed: false }
  }
}

// 判斷一個 fetch/File 讀取錯誤，是不是「本機檔案被鎖定使用中」造成的（例如本機
// SQL Server / BK35 POS 還開著這個資料庫檔案），是的話附上明確的中文提示，
// 不要只留下一句看不出所以然的「未知錯誤」或「Failed to fetch」
function describeUploadError(err: any): string {
  const rawName = err?.name ?? ''
  const rawMessage = err?.data?.error ?? err?.message ?? String(err ?? '')
  const isLocked = /notreadable|being used by another process|access is denied|permission denied|拒絕存取|使用中/i
    .test(`${rawName} ${rawMessage}`)
  const detail = rawMessage || '未知錯誤'
  if (isLocked) {
    return `${detail}\n（這通常代表這台電腦上的檔案目前被其他程式鎖定，例如本機還開著 SQL Server / BK35 POS 正在使用這個資料庫檔案。請先在「這台電腦」上關閉該程式或停用資料庫連線，再重新選擇檔案。）`
  }
  return detail
}

// 單一檔案的分段上傳：（可選）壓縮 → 切片 → 逐片上傳到 chunkEndpoint → 全部完成後呼叫
// finishEndpoint 組裝並視需要解壓縮。targetFieldName 讓這支函式同時給「覆蓋 mdf/ldf」
// （欄位是 targetFileName）跟「上傳 .bak 還原」（欄位是 targetDb）兩種流程共用。
// onProgress(stage, chunkIndex, totalChunks) 讓外層更新畫面上的進度文字
async function uploadFileInChunks(
  file: File,
  targetValue: string,
  onProgress: (stage: 'compressing' | 'uploading', chunkIndex: number, totalChunks: number) => void,
  chunkEndpoint: string = '/holy/bk35sql/admin/upload-chunk',
  finishEndpoint: string = '/holy/bk35sql/admin/upload-finish',
  targetFieldName: string = 'targetFileName'
): Promise<Record<string, any>> {
  onProgress('compressing', 0, 1)
  const { blob, compressed } = await maybeCompressFile(file)

  const uploadId = makeUploadId()
  const totalChunks = Math.max(1, Math.ceil(blob.size / CHUNK_SIZE))

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    onProgress('uploading', chunkIndex, totalChunks)
    const start = chunkIndex * CHUNK_SIZE
    const end = Math.min(blob.size, start + CHUNK_SIZE)
    const chunkBlob = blob.slice(start, end)

    const formData = new FormData()
    formData.append('file', chunkBlob, file.name)
    formData.append('uploadId', uploadId)
    formData.append('chunkIndex', String(chunkIndex))
    formData.append('totalChunks', String(totalChunks))
    formData.append(targetFieldName, targetValue)

    let res: Record<string, any> | undefined
    try {
      res = await $fetch<Record<string, any>>(
        `${directApiBase}${chunkEndpoint}`,
        { method: 'POST', credentials: 'omit', body: formData }
      )
    } catch (err: any) {
      // 把是第幾片失敗、原始錯誤內容都帶出來，不然畫面上只會看到一個看不出所以然的 500
      const detail = describeUploadError(err)
      throw new Error(`分段 ${chunkIndex + 1}/${totalChunks}（共 ${(blob.size / 1024 / 1024).toFixed(1)}MB，已傳 ${(end / 1024 / 1024).toFixed(1)}MB）上傳例外：${detail}`)
    }
    if (!res?.ok) {
      throw new Error(res?.error ?? `分段 ${chunkIndex + 1}/${totalChunks} 上傳失敗`)
    }
  }

  onProgress('uploading', totalChunks, totalChunks)

  const finishForm = new FormData()
  finishForm.append('uploadId', uploadId)
  finishForm.append('totalChunks', String(totalChunks))
  finishForm.append(targetFieldName, targetValue)
  finishForm.append('compressed', String(compressed))

  let finishRes: Record<string, any> | undefined
  try {
    finishRes = await $fetch<Record<string, any>>(
      `${directApiBase}${finishEndpoint}`,
      { method: 'POST', credentials: 'omit', body: finishForm }
    )
  } catch (err: any) {
    throw new Error(describeUploadError(err))
  }
  if (!finishRes?.ok) {
    const err: any = new Error(finishRes?.error ?? '檔案組裝／還原失敗')
    err.responseData = finishRes
    throw err
  }
  return finishRes
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
    try {
      const res = await uploadFileInChunks(item.file, item.target as string, (stage, chunkIndex, totalChunks) => {
        if (stage === 'compressing') {
          uploadProgress.value = `${i + 1}/${validFiles.value.length}：${item.file.name}（壓縮中…）`
          return
        }
        const percent = Math.round((chunkIndex / totalChunks) * 100)
        uploadProgress.value = totalChunks > 1
          ? `${i + 1}/${validFiles.value.length}：${item.file.name}（分段 ${Math.min(chunkIndex + 1, totalChunks)}/${totalChunks}，${percent}%）`
          : `${i + 1}/${validFiles.value.length}：${item.file.name}`
      })
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

// ══════════════════ 資料庫還原（.bak，運作中也能上傳） ══════════════════
// 用途：如果要上傳的那台電腦本機的資料庫還在運作中，.mdf/.ldf 會被獨佔鎖定，
// 連複製都做不到。這條路徑改成先在本機用 SQL Server 自己的 BACKUP DATABASE
// 產生 .bak（資料庫可以繼續開著，不受外部鎖定影響），上傳這份 .bak，
// 由伺服器執行 RESTORE DATABASE ... WITH REPLACE 覆蓋回正式資料庫。
// RESTORE 前伺服器會自動把目標資料庫切成單人模式踢掉現有連線，
// 所以伺服器端也不需要事先手動「暫停資料庫」。

const restoreTargetDb = ref<'BK35MENU' | 'BKSQL'>('BKSQL')
const restoreFile = ref<File | null>(null)
const restoreFileInput = ref<HTMLInputElement | null>(null)
const restoreLoading = ref(false)
const restoreProgress = ref('')
const restoreResult = ref<Record<string, any> | null>(null)

function onRestoreFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  restoreFile.value = target.files?.[0] ?? null
  restoreResult.value = null
}

async function confirmAndRestore() {
  if (!restoreFile.value) return
  const ok = confirm(
    `確定要用「${restoreFile.value.name}」還原覆蓋 ${restoreTargetDb.value} 嗎？\n\n這會強制中斷該資料庫目前所有連線並整個覆蓋掉，此動作無法復原。`
  )
  if (!ok) return

  restoreLoading.value = true
  restoreResult.value = null
  try {
    const res = await uploadFileInChunks(
      restoreFile.value,
      restoreTargetDb.value,
      (stage, chunkIndex, totalChunks) => {
        if (stage === 'compressing') {
          restoreProgress.value = `${restoreFile.value?.name}（壓縮中…）`
          return
        }
        const percent = Math.round((chunkIndex / totalChunks) * 100)
        restoreProgress.value = totalChunks > 1
          ? `分段 ${Math.min(chunkIndex + 1, totalChunks)}/${totalChunks}，${percent}%（上傳完成後開始還原，資料庫較大時可能要好幾分鐘，請耐心等候）`
          : `上傳中…（上傳完成後開始還原，資料庫較大時可能要好幾分鐘，請耐心等候）`
      },
      '/holy/bk35sql/admin/restore-chunk',
      '/holy/bk35sql/admin/restore-finish',
      'targetDb'
    )
    restoreResult.value = res
  } catch (e: any) {
    restoreResult.value = e?.responseData ?? { ok: false, error: e?.message ?? '還原失敗' }
  } finally {
    restoreLoading.value = false
    restoreProgress.value = ''
    restoreFile.value = null
    if (restoreFileInput.value) restoreFileInput.value.value = ''
    await checkStatus(true)
  }
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
  tables: Record<string, { columns: SchemaColumn[], primaryKeys: string[] }>
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
      <h1 class="page-title">
        BK35 資料庫管理
      </h1>
      <div class="tab-switch">
        <button
          :class="['sw-tab', { active: tab === 'maintain' }]"
          @click="tab = 'maintain'"
        >
          資料庫維護
        </button>
        <button
          :class="['sw-tab', { active: tab === 'browse' }]"
          @click="switchToBrowse"
        >
          資料庫瀏覽
        </button>
      </div>
      <button
        class="btn-ghost"
        :disabled="checking"
        @click="checkStatus(true)"
      >
        {{ checking ? '檢查中…' : '重新整理狀態' }}
      </button>
    </div>

    <!-- 狀態卡片：兩個頁籤共用同一份狀態 -->
    <div class="status-cards">
      <div class="status-card">
        <div class="status-label">
          BK35MENU
        </div>
        <div :class="['status-value', bk35menuAttached ? 'ok' : 'off']">
          {{ bk35menuAttached ? '● 已開啟' : '○ 已暫停 / 無法連線' }}
        </div>
      </div>
      <div class="status-card">
        <div class="status-label">
          BKSQL
        </div>
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
        <h2 class="section-title">
          資料庫開關
        </h2>
        <div class="action-row">
          <button
            class="btn-danger"
            :disabled="actionLoading"
            @click="confirmAndRun('detach', '暫停資料庫')"
          >
            暫停資料庫（Detach）
          </button>
          <button
            class="btn-primary"
            :disabled="actionLoading"
            @click="confirmAndRun('attach', '開啟資料庫')"
          >
            開啟資料庫（Attach）
          </button>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">
          上傳資料庫檔案
        </h2>
        <p class="section-hint">
          建議流程：先「暫停資料庫」→ 一次選取 4 個檔案（bk35menu.mdf / bk35menu.ldf / bksql.mdf / bksql.ldf）上傳覆蓋 → 再「開啟資料庫」。
          目標檔案會自動依檔名比對，不用手動選。資料庫還在開啟狀態時系統會拒絕上傳，避免資料損毀。
        </p>
        <div class="upload-row">
          <input
            ref="fileInput"
            type="file"
            class="file-input"
            multiple
            @change="onFileChange"
          >
          <button
            class="btn-primary"
            :disabled="!validFiles.length || uploadLoading"
            @click="confirmAndUpload"
          >
            {{ uploadLoading ? `上傳中…（${uploadProgress}）` : `上傳並覆蓋（${validFiles.length} 個檔案）` }}
          </button>
        </div>

        <ul
          v-if="selectedFiles.length"
          class="file-preview-list"
        >
          <li
            v-for="f in selectedFiles"
            :key="f.file.name"
            :class="{ invalid: !f.target }"
          >
            {{ f.file.name }}（{{ formatSize(f.file.size) }}）
            <span v-if="f.target">→ 將覆蓋 <strong>{{ f.target }}</strong></span>
            <span
              v-else
              class="invalid-hint"
            >⚠️ 不在允許覆蓋的檔名清單內，這個檔案不會被上傳</span>
          </li>
        </ul>
      </div>

      <div
        v-if="lastResults.length"
        class="section"
      >
        <h2 class="section-title">
          執行結果
        </h2>
        <div
          v-for="(r, i) in lastResults"
          :key="i"
          class="result-item"
        >
          <span :class="['result-badge', r.ok ? 'ok' : 'fail']">{{ r.ok ? '成功' : '失敗' }}</span>
          <span class="result-label">{{ r.label }}</span>
        </div>
        <pre class="output-box">{{ formatResults(lastResults) }}</pre>
      </div>

      <div class="section">
        <h2 class="section-title">
          上傳備份還原（.bak，來源資料庫運作中也能上傳）
        </h2>
        <p class="section-hint">
          如果「要上傳檔案的那台電腦」本機資料庫還在運作中，直接複製 .mdf/.ldf 會因為檔案被鎖定而失敗（連複製都做不到）。
          這裡改成：先在本機用 SQL Server 的「備份」功能產生 .bak 檔（資料庫可以繼續開著，不受影響），上傳這份 .bak，
          由伺服器自動執行還原覆蓋。還原前伺服器會自動強制中斷該資料庫目前所有連線，<strong>不需要事先「暫停資料庫」</strong>，
          但也代表還原當下該資料庫會短暫無法使用，請避開營業／使用中的時段。
        </p>
        <div class="upload-row">
          <select
            v-model="restoreTargetDb"
            class="table-select"
            :disabled="restoreLoading"
          >
            <option value="BK35MENU">
              BK35MENU
            </option>
            <option value="BKSQL">
              BKSQL
            </option>
          </select>
          <input
            ref="restoreFileInput"
            type="file"
            class="file-input"
            accept=".bak"
            :disabled="restoreLoading"
            @change="onRestoreFileChange"
          >
          <button
            class="btn-danger"
            :disabled="!restoreFile || restoreLoading"
            @click="confirmAndRestore"
          >
            {{ restoreLoading ? `還原中…（${restoreProgress}）` : `上傳並還原覆蓋 ${restoreTargetDb}` }}
          </button>
        </div>
        <p
          v-if="restoreFile"
          class="section-hint"
        >
          已選擇：{{ restoreFile.name }}（{{ formatSize(restoreFile.size) }}）→ 將還原覆蓋 <strong>{{ restoreTargetDb }}</strong>
        </p>

        <template v-if="restoreResult">
          <div class="result-item">
            <span :class="['result-badge', restoreResult.ok ? 'ok' : 'fail']">{{ restoreResult.ok ? '成功' : '失敗' }}</span>
            <span class="result-label">{{ restoreResult.ok ? `已還原 ${restoreResult.targetDb}` : (restoreResult.error ?? '還原失敗') }}</span>
          </div>
          <pre class="output-box">{{ JSON.stringify(restoreResult, null, 2) }}</pre>
        </template>
      </div>
    </template>

    <!-- ══════════════════ 資料庫瀏覽 ══════════════════ -->
    <template v-else>
      <div
        v-if="browseDbAttached === false"
        class="paused-banner"
      >
        ⏸ {{ browseDb }} 目前已暫停（Detach），查詢功能暫時無法使用，請先到「資料庫維護」頁籤開啟資料庫後再試。
      </div>

      <template v-else>
        <div class="filter-bar">
          <select
            v-model="browseDb"
            class="table-select"
            @change="onDbChange"
          >
            <option value="BK35MENU">
              BK35MENU
            </option>
            <option value="BKSQL">
              BKSQL
            </option>
          </select>
          <button
            class="btn-ghost"
            @click="fetchSchemaAll"
          >
            📋 匯出全部資料表結構
          </button>
          <select
            v-model="selectedTable"
            class="table-select"
            @change="onTableChange"
          >
            <option
              value=""
              disabled
            >
              選擇資料表…
            </option>
            <option
              v-for="t in tables"
              :key="t"
              :value="t"
            >
              {{ t }}
            </option>
          </select>
          <input
            v-model="search"
            placeholder="搜尋內容…"
            class="search-input"
            :disabled="!selectedTable"
            @keyup.enter="fetchData(1)"
          >
          <button
            class="btn-primary"
            :disabled="!selectedTable"
            @click="fetchData(1)"
          >
            查詢
          </button>
          <button
            class="btn-ghost"
            :disabled="!selectedTable"
            @click="resetSearch"
          >
            清除
          </button>
          <button
            class="btn-ghost"
            :disabled="!selectedTable"
            @click="fetchSchema"
          >
            📋 查看欄位結構
          </button>
          <span
            v-if="selectedTable"
            class="total-hint"
          >共 {{ total }} 筆</span>
        </div>

        <div
          v-if="tablesLoading"
          class="loading"
        >
          載入資料表清單中…
        </div>
        <div
          v-else-if="tablesError"
          class="error-box"
        >
          {{ tablesError }}
        </div>

        <template v-else-if="selectedTable">
          <div
            v-if="dataLoading"
            class="loading"
          >
            載入中…
          </div>
          <div
            v-else-if="dataError"
            class="error-box"
          >
            {{ dataError }}
          </div>
          <div
            v-else
            class="table-wrap"
          >
            <table class="data-table">
              <thead>
                <tr>
                  <th
                    v-for="col in columns"
                    :key="col"
                  >
                    {{ col }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in rows"
                  :key="i"
                >
                  <td
                    v-for="col in columns"
                    :key="col"
                  >
                    <span
                      v-if="row[col] === null || row[col] === undefined"
                      class="text-muted"
                    >-</span>
                    <span v-else>{{ row[col] }}</span>
                  </td>
                </tr>
                <tr v-if="rows.length === 0">
                  <td
                    :colspan="columns.length || 1"
                    class="empty-cell"
                  >
                    查無資料
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="totalPages > 1"
            class="pagination"
          >
            <button
              :disabled="page === 1"
              class="page-btn"
              @click="fetchData(page - 1)"
            >
              ‹ 上一頁
            </button>
            <span class="page-info">第 {{ page }} / {{ totalPages }} 頁</span>
            <button
              :disabled="page === totalPages"
              class="page-btn"
              @click="fetchData(page + 1)"
            >
              下一頁 ›
            </button>
          </div>
        </template>

        <div
          v-else
          class="empty-hint"
        >
          請先選擇一張資料表
        </div>
      </template>
    </template>

    <!-- ══════════════════ 欄位結構彈窗 ══════════════════ -->
    <div
      v-if="showSchema"
      class="schema-overlay"
      @click.self="closeSchema"
    >
      <div class="schema-modal">
        <div class="schema-modal-header">
          <h2 class="section-title">
            {{ selectedTable }} 欄位結構（{{ browseDb }}）
          </h2>
          <button
            class="btn-ghost small"
            @click="closeSchema"
          >
            ✕ 關閉
          </button>
        </div>

        <div
          v-if="schemaLoading"
          class="loading"
        >
          載入中…
        </div>
        <div
          v-else-if="schemaError"
          class="error-box"
        >
          {{ schemaError }}
        </div>

        <template v-else-if="schemaResult">
          <div class="schema-actions">
            <span
              v-if="schemaResult.primaryKeys.length"
              class="total-hint"
            >
              主鍵：{{ schemaResult.primaryKeys.join(', ') }}
            </span>
            <span
              v-else
              class="total-hint"
            >此表未偵測到主鍵</span>
            <button
              class="btn-primary small"
              @click="copySchemaJson"
            >
              {{ copyLabel }}
            </button>
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
                <tr
                  v-for="c in schemaResult.columns"
                  :key="c.name"
                >
                  <td>
                    {{ c.name }}
                    <span
                      v-if="schemaResult.primaryKeys.includes(c.name)"
                      class="pk-badge"
                    >PK</span>
                  </td>
                  <td>{{ c.type }}</td>
                  <td>
                    <span v-if="c.maxLength">{{ c.maxLength }}</span>
                    <span v-else-if="c.numericPrecision">{{ c.numericPrecision }}<span v-if="c.numericScale">,{{ c.numericScale }}</span></span>
                    <span
                      v-else
                      class="text-muted"
                    >-</span>
                  </td>
                  <td>{{ c.nullable ? '可為 NULL' : '必填' }}</td>
                  <td>
                    <span v-if="c.default">{{ c.default }}</span>
                    <span
                      v-else
                      class="text-muted"
                    >-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="section-hint">
            下面是完整 JSON，複製後可以直接貼給 Claude 參考：
          </p>
          <pre class="output-box schema-json">{{ JSON.stringify(schemaResult, null, 2) }}</pre>
        </template>
      </div>
    </div>

    <!-- ══════════════════ 全部資料表結構彈窗 ══════════════════ -->
    <div
      v-if="showSchemaAll"
      class="schema-overlay"
      @click.self="closeSchemaAll"
    >
      <div class="schema-modal">
        <div class="schema-modal-header">
          <h2 class="section-title">
            {{ browseDb }} 全部資料表結構
          </h2>
          <button
            class="btn-ghost small"
            @click="closeSchemaAll"
          >
            ✕ 關閉
          </button>
        </div>

        <div
          v-if="schemaAllLoading"
          class="loading"
        >
          載入中，資料表較多可能要幾秒…
        </div>
        <div
          v-else-if="schemaAllError"
          class="error-box"
        >
          {{ schemaAllError }}
        </div>

        <template v-else-if="schemaAllResult">
          <div class="schema-actions">
            <span class="total-hint">共 {{ schemaAllResult.tableCount }} 張資料表</span>
            <button
              class="btn-primary small"
              @click="copySchemaAllJson"
            >
              {{ copyAllLabel }}
            </button>
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
                  <tr
                    v-for="c in info.columns"
                    :key="c.name"
                  >
                    <td>
                      {{ c.name }}
                      <span
                        v-if="info.primaryKeys.includes(c.name)"
                        class="pk-badge"
                      >PK</span>
                    </td>
                    <td>{{ c.type }}</td>
                    <td>
                      <span v-if="c.maxLength">{{ c.maxLength }}</span>
                      <span v-else-if="c.numericPrecision">{{ c.numericPrecision }}<span v-if="c.numericScale">,{{ c.numericScale }}</span></span>
                      <span
                        v-else
                        class="text-muted"
                      >-</span>
                    </td>
                    <td>{{ c.nullable ? '可為 NULL' : '必填' }}</td>
                    <td>
                      <span v-if="c.default">{{ c.default }}</span>
                      <span
                        v-else
                        class="text-muted"
                      >-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>

          <p class="section-hint">
            或直接按上面「複製全部 JSON」貼給 Claude 參考，比一張一張複製快很多。
          </p>
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
