<script setup lang="ts">
  definePageMeta({ layout: 'pos', requiredPermission: 'pos.pos-accounting' })

  interface DataResponse {
    columns: string[]
    rows: Record<string, any>[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    error?: string
  }

  interface MenuTypeOption {
    typeNo: string
    typeName: string
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

  // ── 品項設定 / 選單類別：類別分類 + 排序 ───────────────
  // MENUITEM／MENUTYPE 沒有專屬的伺服器端篩選、排序 API，
  // 所以這兩個分頁改成把全部資料一次撈回前端，篩選／排序／分頁都在前端處理。
  // 品項設定 → 依 ItemNo 排序；選單類別 → 依 TypeNo 排序。
  const CLIENT_PAGE_SIZE = 20
  const menuTypes = ref<MenuTypeOption[]>([])
  const menuTypesLoaded = ref(false)
  const menuTypeRowsCache = ref<Record<string, any>[]>([])
  const menuTypeColumnsCache = ref<string[]>([])
  const selectedType = ref('') // 品項設定的類別篩選，TypeNo，空字串代表全部類別
  const allRows = ref<Record<string, any>[]>([]) // 目前分頁（menutype／menuitem）完整資料

  function getCol(row: Record<string, any>, key: string) {
    const k = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase())
    return k ? row[k] : undefined
  }

  function typeNameFor(typeNo: any) {
    if (typeNo === null || typeNo === undefined) return ''
    const match = menuTypes.value.find(t => t.typeNo === String(typeNo))
    return match ? match.typeName : ''
  }

  function compareValues(a: any, b: any) {
    const na = Number(a)
    const nb = Number(b)
    const bothNumeric =
      a !== '' && a !== null && a !== undefined &&
      b !== '' && b !== null && b !== undefined &&
      !isNaN(na) && !isNaN(nb)
    if (bothNumeric) return na - nb
    return String(a ?? '').localeCompare(String(b ?? ''))
  }

  function sortByCol(list: Record<string, any>[], key: string) {
    return [...list].sort((a, b) => compareValues(getCol(a, key), getCol(b, key)))
  }

  async function fetchAllRows(table: string) {
    let all: Record<string, any>[] = []
    let cols: string[] = []
    let p = 1
    let tp = 1
    do {
      const res = await $fetch<DataResponse>(
        `${apiBase.value}/holy/bk35sql/data/${table}`,
          { credentials: 'include', query: { db: 'BKSQL', page: p, search: '' } }
      )
      if (res?.error) throw new Error(res.error)
      cols = res?.columns ?? cols
      all = all.concat(res?.rows ?? [])
      tp = res?.totalPages ?? 1
      p++
    } while (p <= tp)
    return { columns: cols, rows: all }
  }

  // 撈 MENUTYPE 並依 TypeNo 排序，同時提供「選單類別」分頁資料 與 品項設定的類別下拉選單快取
  async function loadMenuTypeRows() {
    if (menuTypesLoaded.value) return
    try {
      const { columns: cols, rows: typeRows } = await fetchAllRows('MENUTYPE')
      menuTypeColumnsCache.value = cols
      menuTypeRowsCache.value = sortByCol(typeRows, 'TypeNo')
      menuTypes.value = menuTypeRowsCache.value
        .map(r => ({
          typeNo: String(getCol(r, 'TypeNo') ?? ''),
          typeName: String(getCol(r, 'TypeName') ?? '')
        }))
        .filter(t => t.typeNo !== '')
      menuTypesLoaded.value = true
    } catch (e) {
      // 類別清單載入失敗不影響品項清單本身，僅無法顯示分類篩選／類別名稱
      console.error('載入選單類別失敗', e)
    }
  }

  function applyClientFilter(p: number) {
    const kw = search.value.trim().toLowerCase()
    let filtered = allRows.value

    if (tab.value === 'menuitem' && selectedType.value) {
      filtered = filtered.filter(r => String(getCol(r, 'TypeNo') ?? '') === selectedType.value)
    }
    if (kw) {
      filtered = filtered.filter(r =>
        Object.values(r).some(v => String(v ?? '').toLowerCase().includes(kw))
      )
    }

    total.value = filtered.length
    totalPages.value = Math.max(1, Math.ceil(filtered.length / CLIENT_PAGE_SIZE))
    page.value = Math.min(Math.max(1, p), totalPages.value)
    const start = (page.value - 1) * CLIENT_PAGE_SIZE
    rows.value = filtered.slice(start, start + CLIENT_PAGE_SIZE)
  }

  async function loadClientTab(t: 'menutype' | 'menuitem') {
    if (dbAttached.value === false) return
    loading.value = true
    error.value = ''
    try {
      if (t === 'menuitem') {
        await loadMenuTypeRows() // 品項設定需要類別對照表來篩選／顯示類別名稱
        const { columns: cols, rows: itemRows } = await fetchAllRows('MENUITEM')
        columns.value = cols
        allRows.value = sortByCol(itemRows, 'ItemNo')
      } else {
        await loadMenuTypeRows()
        columns.value = menuTypeColumnsCache.value
        allRows.value = menuTypeRowsCache.value
      }
      applyClientFilter(1)
    } catch (e: any) {
      error.value = e?.message ?? '載入資料失敗'
      allRows.value = []
      rows.value = []
      total.value = 0
      totalPages.value = 1
    } finally {
      loading.value = false
    }
  }

  function onTypeChange() {
    applyClientFilter(1)
  }

  // ── 選單類別／物料設定：維持原本後端分頁 ────────────
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
    selectedType.value = ''
    if (t === 'matlist') {
      fetchData(1)
    } else {
      loadClientTab(t)
    }
  }

  function runSearch() {
    if (tab.value === 'matlist') {
      fetchData(1)
    } else {
      applyClientFilter(1)
    }
  }

  function resetSearch() {
    search.value = ''
    if (tab.value === 'matlist') {
      fetchData(1)
    } else {
      selectedType.value = ''
      applyClientFilter(1)
    }
  }

  function goToPage(p: number) {
    if (tab.value === 'matlist') {
      fetchData(p)
    } else {
      applyClientFilter(p)
    }
  }

  await checkStatus()
  await loadClientTab('menutype')
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
        <select
          v-if="tab === 'menuitem'"
          v-model="selectedType"
          class="type-select"
          @change="onTypeChange"
        >
          <option value="">
            全部類別
          </option>
          <option
            v-for="t in menuTypes"
            :key="t.typeNo"
            :value="t.typeNo"
          >
            {{ t.typeName }}
          </option>
        </select>
        <input
          v-model="search"
          placeholder="搜尋內容…"
          class="search-input"
          @keyup.enter="runSearch"
        >
        <button
          class="btn-primary"
          @click="runSearch"
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
              <template v-else>
                <span>{{ row[col] }}</span>
                <span
                  v-if="tab === 'menuitem' && col.toLowerCase() === 'typeno' && typeNameFor(row[col])"
                  class="type-name-tag"
                >
                    {{ typeNameFor(row[col]) }}
                  </span>
              </template>
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
          @click="goToPage(page - 1)"
        >
          ‹ 上一頁
        </button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 頁</span>
        <button
          :disabled="page === totalPages"
          class="page-btn"
          @click="goToPage(page + 1)"
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
  .type-select { padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; max-width: 200px; }
  .type-select:focus { border-color: var(--accent); }
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
  .type-name-tag { margin-left: 6px; font-size: 11px; color: var(--text-hint); background: var(--surface2); border-radius: 4px; padding: 1px 6px; }

  .pagination { display: flex; align-items: center; gap: 12px; justify-content: center; }
  .page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
  .page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
  .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .page-info { font-size: 13px; color: var(--text-muted); }
</style>
