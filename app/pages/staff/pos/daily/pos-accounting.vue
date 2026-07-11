<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">BK35 資料庫瀏覽</h1>
      <span :class="['ping-badge', pingOk ? 'ok' : 'fail']">
        {{ pingLoading ? '連線中…' : (pingOk ? `已連線：${pingDb}` : '連線失敗') }}
      </span>
    </div>

    <div class="filter-bar">
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'pos.pos-accounting' })

interface DataResponse {
  columns: string[]
  rows: Record<string, any>[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  error?: string
}

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)

// 連線狀態
const pingOk = ref(false)
const pingDb = ref('')
const pingLoading = ref(true)

async function checkPing() {
  pingLoading.value = true
  try {
    const res = await $fetch<{ ok: boolean; database?: string; error?: string }>(
      `${apiBase.value}/holy/bk35sql/ping`,
      { credentials: 'include' }
    )
    pingOk.value = !!res?.ok
    pingDb.value = res?.database ?? ''
  } catch {
    pingOk.value = false
  } finally {
    pingLoading.value = false
  }
}

// 資料表清單
const tables = ref<string[]>([])
const tablesLoading = ref(true)
const tablesError = ref('')

async function fetchTables() {
  tablesLoading.value = true
  tablesError.value = ''
  try {
    const res = await $fetch<string[] | { error: string }>(
      `${apiBase.value}/holy/bk35sql/tables`,
      { credentials: 'include' }
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

// 資料瀏覽
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
      { credentials: 'include', query: { page: p, search: search.value } }
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
}

function resetSearch() {
  search.value = ''
  fetchData(1)
}

await checkPing()
await fetchTables()
</script>

<style scoped>
.page-wrap { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }

.ping-badge { padding: 3px 10px; font-size: 12px; border-radius: 999px; font-weight: 600; }
.ping-badge.ok { background: #e6f4ea; color: #1e7e34; }
.ping-badge.fail { background: #fdecea; color: #c0392b; }

.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.table-select { padding: 7px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; min-width: 200px; }
.table-select:focus { border-color: var(--accent); }
.search-input { width: 220px; padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.search-input:focus { border-color: var(--accent); }
.search-input:disabled, .table-select:disabled { opacity: 0.5; }
.btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
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
</style>
