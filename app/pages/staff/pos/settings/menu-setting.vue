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

// 資料庫暫停/開啟狀態（跨頁面共用快取，見 composables/useBk35DbStatus.ts）
const { bksqlAttached: dbAttached, checkStatus } = useBk35DbStatus()

const TABLE_MAP: Record<string, string> = {
  menutype: 'MENUTYPE',
  menuitem: 'MENUITEM',
  matlist: 'MATLIST'
}

const tab = ref<'menutype' | 'menuitem' | 'matlist'>('menutype')
const search = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const columns = ref<string[]>([])
const rows = ref<Record<string, any>[]>([])
const loading = ref(false)
const error = ref('')

async function fetchData(p: number) {
  if (dbAttached.value === false) return
  loading.value = true
  error.value = ''
  page.value = p
  try {
    const res = await $fetch<DataResponse>(
      `${apiBase.value}/holy/bk35sql/data/${TABLE_MAP[tab.value]}`,
      { credentials: 'include', query: { db: 'BKSQL', page: p, search: search.value } }
    )
    if (res?.error) {
      error.value = res.error
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
    error.value = e?.message ?? '載入資料失敗'
  } finally {
    loading.value = false
  }
}

function switchTab(t: 'menutype' | 'menuitem' | 'matlist') {
  tab.value = t
  search.value = ''
  fetchData(1)
}

function resetSearch() {
  search.value = ''
  fetchData(1)
}

await checkStatus()
await fetchData(1)
</script>

<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">
        選單管理
      </h1>
      <div class="tab-switch">
        <button
          :class="['sw-tab', { active: tab === 'menutype' }]"
          @click="switchTab('menutype')"
        >
          選單類別
        </button>
        <button
          :class="['sw-tab', { active: tab === 'menuitem' }]"
          @click="switchTab('menuitem')"
        >
          品項設定
        </button>
        <button
          :class="['sw-tab', { active: tab === 'matlist' }]"
          @click="switchTab('matlist')"
        >
          物料設定
        </button>
      </div>
    </div>

    <p class="hint-banner">
      目前欄位為資料庫原始欄位名稱（尚未對應成中文表頭），資料本身是真實查詢結果。
      表名對照：選單類別 → MENUTYPE、品項設定 → MENUITEM、物料設定 → MATLIST，
      如果表名不對或欄位需要調整成中文表頭，請告訴 Claude。
    </p>

    <div
      v-if="dbAttached === false"
      class="paused-banner"
    >
      ⏸ BKSQL 資料庫目前已暫停（Detach），查詢功能暫時無法使用，請聯繫管理員開啟資料庫後再試。
    </div>

    <template v-else>
      <div class="filter-bar">
        <input
          v-model="search"
          placeholder="搜尋內容…"
          class="search-input"
          @keyup.enter="fetchData(1)"
        >
        <button
          class="btn-primary"
          @click="fetchData(1)"
        >
          查詢
        </button>
        <button
          class="btn-ghost"
          @click="resetSearch"
        >
          清除
        </button>
        <span class="total-hint">共 {{ total }} 筆</span>
      </div>

      <div
        v-if="loading"
        class="loading"
      >
        載入中…
      </div>
      <div
        v-else-if="error"
        class="error-box"
      >
        {{ error }}
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
  </div>
</template>

<style scoped>
.page-wrap { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }

.tab-switch { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.sw-tab { padding: 6px 16px; font-size: 13px; border: none; background: var(--surface); color: var(--text-muted); cursor: pointer; }
.sw-tab.active { background: var(--accent); color: #fff; }

.hint-banner { font-size: 12px; color: var(--text-hint); background: var(--surface2); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 8px 12px; margin: 0; line-height: 1.6; }
.paused-banner { font-size: 13px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 12px 16px; }

.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.search-input { width: 220px; padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
.search-input:focus { border-color: var(--accent); }
.btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
.total-hint { font-size: 13px; color: var(--text-hint); }

.loading { color: var(--text-hint); font-size: 14px; }
.error-box { color: #c0392b; font-size: 13px; background: #fdecea; border: 1px solid #f5c6cb; border-radius: var(--radius-sm); padding: 10px 14px; }
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
