<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">庫存管理</h1>
      <div class="tab-switch">
        <button :class="['sw-tab', { active: view === 'summary' }]" @click="view = 'summary'">庫存結餘</button>
        <button :class="['sw-tab', { active: view === 'log' }]" @click="view = 'log'">進出明細</button>
      </div>
    </div>

    <!-- 庫存結餘 -->
    <template v-if="view === 'summary'">
      <div class="filter-bar">
        <input v-model="summarySearch" placeholder="搜尋品名…" class="search-input" @keyup.enter="fetchSummary" />
        <button class="btn-primary" @click="fetchSummary">搜尋</button>
        <button v-if="summarySearch" class="btn-ghost" @click="summarySearch = ''; fetchSummary()">清除</button>
      </div>
      <div v-if="summaryLoading" class="loading">載入中…</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
          <tr>
            <th>品號</th>
            <th>品名</th>
            <th>類別</th>
            <th>單位</th>
            <th class="text-right">進貨</th>
            <th class="text-right">出貨</th>
            <th class="text-right">結餘</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="s in summary" :key="s.matNo" @click="drillDown(s.matName)" class="clickable">
            <td class="text-muted">{{ s.matNo }}</td>
            <td class="item-name">{{ s.matName }}</td>
            <td>{{ s.matType }}</td>
            <td class="text-muted">{{ s.matUnit }}</td>
            <td class="text-right text-in">{{ s.totalIn }}</td>
            <td class="text-right text-out">{{ s.totalOut }}</td>
            <td class="text-right"><span :class="['balance', s.balance > 0 ? 'pos' : 'zero']">{{ s.balance }}</span></td>
          </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 進出明細 -->
    <template v-else>
      <div class="filter-bar">
        <input v-model="logMatName" placeholder="品名…" class="search-input short" />
        <input v-model="logDateFrom" type="date" class="date-input" />
        <span class="date-sep">~</span>
        <input v-model="logDateTo" type="date" class="date-input" />
        <button class="btn-primary" @click="fetchLog(1)">查詢</button>
        <button class="btn-ghost" @click="resetLog">清除</button>
        <span class="total-hint">共 {{ logTotal }} 筆</span>
      </div>
      <div v-if="logLoading" class="loading">載入中…</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
          <tr>
            <th>日期</th>
            <th>品號</th>
            <th>品名</th>
            <th>類別</th>
            <th>單位</th>
            <th class="text-right">進貨量</th>
            <th class="text-right">出貨量</th>
            <th class="text-right">報廢量</th>
            <th>備註</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(log, i) in logs" :key="i">
            <td>{{ log.opDate }}</td>
            <td class="text-muted">{{ log.matNo }}</td>
            <td class="item-name">{{ log.matName }}</td>
            <td>{{ log.matType }}</td>
            <td class="text-muted">{{ log.matUnit }}</td>
            <td class="text-right"><span v-if="parseFloat(log.inQty) > 0" class="text-in">+{{ log.inQty }}</span><span v-else class="text-muted">-</span></td>
            <td class="text-right"><span v-if="parseFloat(log.outQty) > 0" class="text-out">-{{ log.outQty }}</span><span v-else class="text-muted">-</span></td>
            <td class="text-right"><span v-if="parseFloat(log.scrapQty) > 0" class="text-scrap">{{ log.scrapQty }}</span><span v-else class="text-muted">-</span></td>
            <td class="text-muted remark">{{ log.remark }}</td>
          </tr>
          </tbody>
        </table>
      </div>
      <div v-if="logTotalPages > 1" class="pagination">
        <button :disabled="logPage === 1" class="page-btn" @click="fetchLog(logPage - 1)">‹ 上一頁</button>
        <span class="page-info">第 {{ logPage }} / {{ logTotalPages }} 頁</span>
        <button :disabled="logPage === logTotalPages" class="page-btn" @click="fetchLog(logPage + 1)">下一頁 ›</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'pos.pos-stock' })

  interface StockSummary { matNo: string; matName: string; matType: string; matUnit: string; totalIn: number; totalOut: number; balance: number }
  interface StockLog { opDate: string; matNo: string; matName: string; matType: string; matUnit: string; inQty: string; outQty: string; scrapQty: string; remark: string }

  const commonStore = useCommonStore()
  const apiBase = computed(() => commonStore.data.main_url)

  const view = ref<'summary' | 'log'>('summary')

  // 結餘
  const summary = ref<StockSummary[]>([])
  const summarySearch = ref('')
  const summaryLoading = ref(false)

  async function fetchSummary() {
    summaryLoading.value = true
    try {
      summary.value = await $fetch<StockSummary[]>(`${apiBase.value}/holy/bksql/stock/summary`, {
        credentials: 'include', query: { search: summarySearch.value }
      }) ?? []
    } finally { summaryLoading.value = false }
  }

  function drillDown(matName: string) {
    logMatName.value = matName
    view.value = 'log'
    fetchLog(1)
  }

  // 明細
  const logs = ref<StockLog[]>([])
  const logMatName = ref('')
  const logDateFrom = ref('')
  const logDateTo = ref('')
  const logPage = ref(1)
  const logTotal = ref(0)
  const logTotalPages = ref(1)
  const logLoading = ref(false)

  async function fetchLog(page: number) {
    logLoading.value = true
    logPage.value = page
    try {
      const data = await $fetch<{ logs: StockLog[], total: number, totalPages: number }>(
        `${apiBase.value}/holy/bksql/stock/log`,
          { credentials: 'include', query: { matName: logMatName.value, dateFrom: logDateFrom.value, dateTo: logDateTo.value, page } }
      )
      logs.value = data?.logs ?? []
      logTotal.value = data?.total ?? 0
      logTotalPages.value = data?.totalPages ?? 1
    } finally { logLoading.value = false }
  }

  function resetLog() {
    logMatName.value = ''
    logDateFrom.value = ''
    logDateTo.value = ''
    fetchLog(1)
  }

  await fetchSummary()
  await fetchLog(1)
</script>

<style scoped>
  .page-wrap { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .page-header { display: flex; align-items: center; gap: 16px; }
  .page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }

  .tab-switch { display: flex; gap: 0; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
  .sw-tab { padding: 6px 16px; font-size: 13px; border: none; background: var(--surface); color: var(--text-muted); cursor: pointer; }
  .sw-tab.active { background: var(--accent); color: #fff; }

  .filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .search-input { width: 240px; padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
  .search-input.short { width: 160px; }
  .search-input:focus { border-color: var(--accent); }
  .date-input { padding: 7px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
  .date-sep { color: var(--text-muted); font-size: 13px; }
  .btn-primary { padding: 7px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
  .btn-ghost { padding: 7px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; }
  .total-hint { font-size: 13px; color: var(--text-hint); }

  .loading { color: var(--text-hint); font-size: 14px; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius); background: var(--surface); }
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table th { background: var(--surface2); padding: 10px 14px; text-align: left; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-light); white-space: nowrap; }
  .data-table td { padding: 9px 14px; border-bottom: 1px solid var(--border-light); color: var(--text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--accent-light); }
  .clickable { cursor: pointer; }
  .data-table th.text-right,
  .data-table td.text-right { text-align: right; }
  .text-muted { color: var(--text-muted); font-size: 12px; }
  .item-name { font-weight: 500; }
  .text-in { color: #1e7e34; font-weight: 600; }
  .text-out { color: #c0392b; font-weight: 600; }
  .text-scrap { color: #e65100; }
  .remark { font-size: 12px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .balance { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }
  .balance.pos { background: #e6f4ea; color: #1e7e34; }
  .balance.zero { background: #f5f5f5; color: #888; }

  .pagination { display: flex; align-items: center; gap: 12px; justify-content: center; }
  .page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
  .page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
  .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .page-info { font-size: 13px; color: var(--text-muted); }
</style>
