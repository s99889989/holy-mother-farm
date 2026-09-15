<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <h1 class="page-title">盤點資料</h1>

    <section class="card">
      <h2 class="card-title">查詢條件</h2>
      <div class="filter-grid">
        <div class="filter-group">
          <label class="filter-label">機構</label>
          <select v-model="instSelect" class="filter-select">
            <option value="">請選擇</option>
            <option v-for="inst in instList" :key="inst.Code" :value="inst.Code">{{ inst.Name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">開始年度</label>
          <input v-model="startYear" type="text" class="filter-select" placeholder="開始年度" />
        </div>
        <div class="filter-group">
          <label class="filter-label">結束年度</label>
          <input v-model="endYear" type="text" class="filter-select" placeholder="結束年度" />
        </div>
        <div class="filter-group">
          <label class="filter-label">狀態</label>
          <select v-model="statusSelect" class="filter-select">
            <option value="1">執行中</option>
            <option value="2">結案</option>
            <option value="3">作廢</option>
            <option value="">全部</option>
          </select>
        </div>
      </div>
      <div class="search-row">
        <button type="button" class="search-btn" :disabled="searching" @click="search">
          {{ searching ? '查詢中...' : '查詢' }}
        </button>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">盤點單清單</h2>
      <p v-if="metaLoading" class="hint-text">載入中...</p>
      <p v-else-if="metaError" class="error-text">初始資料載入失敗</p>
      <template v-else>
        <p v-if="!searched" class="hint-text">請先設定查詢條件</p>
        <p v-else-if="dataList.length === 0" class="hint-text">查無資料</p>
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
            <tr>
              <th>序號</th>
              <th>機構</th>
              <th>盤點單號</th>
              <th>名稱</th>
              <th>開始時間</th>
              <th>結束時間</th>
              <th>狀態</th>
              <th>創建者</th>
              <th>創建時間</th>
              <th>操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(row, idx) in dataList" :key="row.inventory_no">
              <td>{{ idx + 1 }}</td>
              <td>{{ row.inst_name }}</td>
              <td>{{ row.inventory_no }}</td>
              <td>{{ row.title }}</td>
              <td>{{ row.start_time }}</td>
              <td>{{ row.end_time }}</td>
              <td>{{ statusText(row.it_status) }}</td>
              <td>{{ row.created_name }}({{ row.created_by }})</td>
              <td>{{ row.created_at }}</td>
              <td>
                <div class="row-actions">
                  <NuxtLink :to="`/staff/content/internal-system/property/inventory-dashboard-summary?in=${encodeURIComponent(row.inventory_no)}`" class="btn-sm">查看</NuxtLink>
                  <button v-if="isActive(row.it_status)" type="button" class="btn-sm btn-danger" @click="openFinish(row)">
                    結案
                  </button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <!-- 結案確認 -->
    <div v-if="finishTarget" class="modal-backdrop" @click.self="finishTarget = null">
      <div class="modal-box">
        <h3 class="modal-title">結案 {{ finishTarget.inventory_no }}</h3>
        <p class="modal-text">你確定要結案嗎？會導致此次盤點關閉！請輸入盤點單號確認。</p>
        <input v-model="confirmInput" type="text" class="form-select" placeholder="請輸入盤點單號" />
        <div class="modal-actions">
          <button type="button" class="btn-sm" @click="finishTarget = null">取消</button>
          <button type="button" class="btn-sm btn-danger" :disabled="finishing" @click="submitFinish">
            {{ finishing ? '處理中...' : '確認' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface InstOption { Code: string; Name: string }

  interface MetaResponse {
    data: { instList: InstOption[] }
  }

  /** 欄位名稱依畫面表頭推測，接上後如與實際回傳不符請告知我調整 */
  interface DashboardRow {
    inventory_no: string
    inst_name: string
    title: string
    start_time: string
    end_time: string
    it_status: string | number
    created_name: string
    created_by: string
    created_at: string
  }

  interface SearchResponse {
    data: { dataList: DashboardRow[] }
  }

  const route = useRoute()
  const router = useRouter()

  const STORAGE_KEY = 'property-inventory-dashboard-filters'

  interface StoredFilters {
    inst: string
    st: string
    et: string
    status: string
  }

  const loadStoredFilters = (): StoredFilters | null => {
    if (!import.meta.client) return null
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as StoredFilters) : null
    } catch {
      return null
    }
  }

  const stored = loadStoredFilters()
  const hasSavedFilters = !!stored || ['inst', 'st', 'et', 'status'].some((key) => route.query[key] !== undefined)

  const instList = ref<InstOption[]>([])
  const metaLoading = ref(true)
  const metaError = ref(false)

  const instSelect = ref(String(route.query.inst ?? stored?.inst ?? ''))
  const startYear = ref(String(route.query.st ?? stored?.st ?? ''))
  const endYear = ref(String(route.query.et ?? stored?.et ?? ''))
  const statusSelect = ref(String(route.query.status ?? stored?.status ?? '1'))

  const syncFilters = () => {
    const query = {
      inst: instSelect.value || undefined,
      st: startYear.value || undefined,
      et: endYear.value || undefined,
      status: statusSelect.value || undefined,
    }
    router.replace({ query })

    if (import.meta.client) {
      sessionStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                inst: instSelect.value,
                st: startYear.value,
                et: endYear.value,
                status: statusSelect.value,
              }),
      )
    }
  }

  watch([instSelect, startYear, endYear, statusSelect], syncFilters)

  const dataList = ref<DashboardRow[]>([])
  const searching = ref(false)
  const searched = ref(false)

  const finishTarget = ref<DashboardRow | null>(null)
  const confirmInput = ref('')
  const finishing = ref(false)

  const isActive = (status: string | number) => String(status) === '1'
  const statusText = (status: string | number) =>
          ({ '1': '執行中', '2': '結案', '3': '作廢' } as Record<string, string>)[String(status)] ?? '未知'

  const loadMeta = async () => {
    metaLoading.value = true
    metaError.value = false
    try {
      const res = await $fetch<MetaResponse>('/api/internal-system/property/inventory-dashboard-meta')
      instList.value = res.data.instList ?? []
    } catch {
      metaError.value = true
    } finally {
      metaLoading.value = false
    }
  }

  const search = async () => {
    searching.value = true
    try {
      const res = await $fetch<SearchResponse>('/api/internal-system/property/inventory-dashboard-search', {
        method: 'POST',
        body: {
          instSelect: instSelect.value,
          startYear: startYear.value,
          endYear: endYear.value,
          statusSelect: statusSelect.value,
        },
      })
      dataList.value = res.data.dataList ?? []
      searched.value = true
    } catch {
      alert('查詢失敗，請稍後再試')
    } finally {
      searching.value = false
    }
  }

  const openFinish = (row: DashboardRow) => {
    finishTarget.value = row
    confirmInput.value = ''
  }

  const submitFinish = async () => {
    if (!finishTarget.value) return
    if (confirmInput.value !== finishTarget.value.inventory_no) {
      alert('請確認盤點單號是否輸入正確!')
      return
    }
    finishing.value = true
    try {
      const res = await $fetch<{ rs: string; msg: string }>('/api/internal-system/property/inventory-dashboard-finish', {
        method: 'POST',
        body: { inventoryNo: finishTarget.value.inventory_no },
      })
      if (res.rs === '1') {
        finishTarget.value = null
        await search()
      } else {
        alert(res.msg ?? '結案失敗')
      }
    } catch {
      alert('結案失敗，請稍後再試')
    } finally {
      finishing.value = false
    }
  }

  onMounted(async () => {
    await loadMeta()
    if (hasSavedFilters) {
      search()
    }
  })
</script>

<style scoped>
  .page { max-width: 1200px; }

  .page-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 20px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px;
    margin-bottom: 20px;
  }

  .card-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 14px;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .filter-select {
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
    box-sizing: border-box;
    width: 100%;
  }

  .search-row {
    margin-top: 16px;
    text-align: right;
  }

  .search-btn {
    padding: 9px 24px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
  }
  .search-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .hint-text { color: var(--text-hint); font-size: 13px; }
  .error-text { color: #e53e3e; font-size: 13px; }

  .table-wrap { overflow-x: auto; }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .data-table th,
  .data-table td {
    border: 1px solid var(--border-light);
    padding: 8px 10px;
    text-align: center;
    white-space: nowrap;
  }

  .data-table th {
    background: var(--surface2);
    color: var(--text-muted);
  }

  .row-actions {
    display: flex;
    gap: 6px;
    justify-content: center;
  }

  .btn-sm {
    display: inline-block;
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
    text-decoration: none;
  }
  .btn-sm:hover { background: var(--surface2); }

  .btn-danger {
    color: #e53e3e;
    border-color: #e53e3e;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }

  .modal-box {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 22px;
    width: 380px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .modal-title {
    margin: 0 0 12px;
    font-size: 16px;
    color: var(--text);
  }

  .modal-text {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0 0 12px;
    line-height: 1.6;
  }

  .form-select {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
</style>