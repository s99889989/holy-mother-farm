<template>
  <div class="bksql-wrap">
    <aside class="bksql-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">資料表</span>
        <span class="sidebar-count">{{ tables.length }}</span>
      </div>
      <div class="sidebar-search">
        <input v-model="tableSearch" placeholder="搜尋資料表…" class="sidebar-input" />
      </div>
      <ul class="table-list">
        <li
          v-for="t in filteredTables"
          :key="t"
          :class="['table-item', { active: currentTable === t }]"
          @click="selectTable(t)"
        >
          {{ t }}
        </li>
      </ul>
    </aside>

    <main class="bksql-main">
      <template v-if="!currentTable">
        <div class="empty-state">
          <p>← 選擇左側資料表開始瀏覽</p>
        </div>
      </template>

      <template v-else>
        <div class="main-header">
          <h2 class="table-title">{{ currentTable }}</h2>
          <span class="row-count">共 {{ tableData?.total ?? 0 }} 筆</span>
        </div>

        <div class="toolbar">
          <input
            v-model="dataSearch"
            placeholder="搜尋資料…"
            class="data-search"
            @keyup.enter="fetchData(1)"
          />
          <button class="btn-search" @click="fetchData(1)">搜尋</button>
          <button v-if="dataSearch" class="btn-clear" @click="dataSearch = ''; fetchData(1)">清除</button>
        </div>

        <div v-if="loading" class="loading">載入中…</div>

        <div v-else-if="tableData" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="col in tableData.columns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in tableData.rows" :key="i">
                <td v-for="col in tableData.columns" :key="col">
                  {{ (row as Record<string, unknown>)[col] ?? '' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="tableData && tableData.totalPages > 1" class="pagination">
          <button :disabled="currentPage === 1" class="page-btn" @click="fetchData(currentPage - 1)">‹ 上一頁</button>
          <span class="page-info">第 {{ currentPage }} / {{ tableData.totalPages }} 頁</span>
          <button :disabled="currentPage === tableData.totalPages" class="page-btn" @click="fetchData(currentPage + 1)">下一頁 ›</button>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'staff.pos-data-table' })

interface TableData {
  columns: string[]
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)

const tables = ref<string[]>([])
const tableSearch = ref('')
const filteredTables = computed(() =>
  tables.value.filter(t => t.toLowerCase().includes(tableSearch.value.toLowerCase()))
)

const currentTable = ref('')
const dataSearch = ref('')
const currentPage = ref(1)
const loading = ref(false)
const tableData = ref<TableData | null>(null)

async function fetchTables() {
  const data = await $fetch<string[]>(`${apiBase.value}/holy/bksql/tables`, {
    credentials: 'include'
  })
  tables.value = data ?? []
}

async function selectTable(name: string) {
  currentTable.value = name
  dataSearch.value = ''
  currentPage.value = 1
  await fetchData(1)
}

async function fetchData(page: number) {
  if (!currentTable.value) return
  loading.value = true
  currentPage.value = page
  try {
    const data = await $fetch<TableData>(`${apiBase.value}/holy/bksql/data/${currentTable.value}`, {
      credentials: 'include',
      query: { page, search: dataSearch.value }
    })
    tableData.value = data
  } finally {
    loading.value = false
  }
}

await fetchTables()
</script>

<style scoped>
.bksql-wrap {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}
.bksql-sidebar {
  width: 200px;
  min-width: 200px;
  background: var(--surface);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--border-light);
}
.sidebar-title { font-weight: 600; font-size: 14px; color: var(--text); }
.sidebar-count {
  background: var(--accent-light);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 99px;
}
.sidebar-search { padding: 8px 10px; border-bottom: 1px solid var(--border-light); }
.sidebar-input {
  width: 100%;
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  outline: none;
}
.sidebar-input:focus { border-color: var(--accent); }
.table-list { list-style: none; padding: 6px 0; margin: 0; overflow-y: auto; flex: 1; }
.table-item {
  padding: 7px 16px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.table-item:hover { background: var(--accent-light); color: var(--accent); }
.table-item.active { background: var(--accent); color: #fff; font-weight: 600; }
.bksql-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  gap: 12px;
}
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-hint);
  font-size: 15px;
}
.main-header { display: flex; align-items: baseline; gap: 12px; }
.table-title { font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
.row-count { font-size: 13px; color: var(--text-hint); }
.toolbar { display: flex; gap: 8px; align-items: center; }
.data-search {
  flex: 1;
  max-width: 360px;
  padding: 7px 12px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  outline: none;
}
.data-search:focus { border-color: var(--accent); }
.btn-search {
  padding: 7px 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
}
.btn-clear {
  padding: 7px 12px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
}
.loading { color: var(--text-hint); font-size: 14px; }
.table-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
}
.data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.data-table th {
  position: sticky;
  top: 0;
  background: var(--surface2);
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}
.data-table td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text);
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.data-table tr:hover td { background: var(--accent-light); }
.pagination { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 4px 0; }
.page-btn {
  padding: 6px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  color: var(--text);
  transition: background 0.15s;
}
.page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-muted); }
</style>
