<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">銷售報表</h1>
      <div class="tab-switch">
        <button :class="['sw-tab', { active: view === 'overview' }]" @click="view = 'overview'">月份總覽</button>
        <button :class="['sw-tab', { active: view === 'orders' }]" @click="view = 'orders'">訂單明細</button>
        <button :class="['sw-tab', { active: view === 'topitems' }]" @click="view = 'topitems'">熱銷商品</button>
      </div>
    </div>

    <!-- 月份總覽 -->
    <template v-if="view === 'overview'">
      <div v-if="monthlyLoading" class="loading">載入中…</div>
      <template v-else>
        <!-- 統計卡片 -->
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-label">本月營收</div>
            <div class="stat-value">{{ formatCurrency(thisMonth?.revenue ?? 0) }}</div>
            <div class="stat-sub">{{ thisMonth?.orders ?? 0 }} 筆訂單</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">上月營收</div>
            <div class="stat-value">{{ formatCurrency(lastMonth?.revenue ?? 0) }}</div>
            <div class="stat-sub">{{ lastMonth?.orders ?? 0 }} 筆訂單</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">月均營收</div>
            <div class="stat-value">{{ formatCurrency(avgRevenue) }}</div>
            <div class="stat-sub">近12個月平均</div>
          </div>
          <div class="stat-card accent">
            <div class="stat-label">近12月合計</div>
            <div class="stat-value">{{ formatCurrency(totalRevenue) }}</div>
            <div class="stat-sub">{{ totalOrders }} 筆訂單</div>
          </div>
        </div>

        <!-- 月份表格 -->
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>月份</th>
                <th class="text-right">訂單數</th>
                <th class="text-right">營收</th>
                <th style="width:40%">營收比例</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in monthly" :key="m.month">
                <td class="month-cell">{{ m.month }}</td>
                <td class="text-right text-muted">{{ m.orders }}</td>
                <td class="text-right revenue-cell">{{ formatCurrency(m.revenue) }}</td>
                <td>
                  <div class="bar-wrap">
                    <div class="bar" :style="{ width: (m.revenue / maxRevenue * 100) + '%' }"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- 訂單明細 -->
    <template v-else-if="view === 'orders'">
      <div class="filter-bar">
        <input v-model="orderDateFrom" type="date" class="date-input" />
        <span class="date-sep">~</span>
        <input v-model="orderDateTo" type="date" class="date-input" />
        <input v-model="orderSearch" placeholder="搜尋單號/人員…" class="search-input" @keyup.enter="fetchOrders(1)" />
        <button class="btn-primary" @click="fetchOrders(1)">查詢</button>
        <button class="btn-ghost" @click="resetOrders">清除</button>
        <span class="total-hint">共 {{ orderTotal }} 筆</span>
      </div>
      <div v-if="orderLoading" class="loading">載入中…</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>單號</th>
              <th>時間</th>
              <th class="text-right">原價</th>
              <th class="text-right">折扣</th>
              <th class="text-right">實收</th>
              <th class="text-right">現金</th>
              <th>付款</th>
              <th>人員</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.checkNo">
              <td>{{ o.opDate }}</td>
              <td class="text-muted check-no">{{ o.checkNo }}</td>
              <td class="text-muted">{{ o.billTime }}</td>
              <td class="text-right text-muted">{{ o.orderAmt > 0 ? formatCurrency(o.orderAmt) : '-' }}</td>
              <td class="text-right"><span v-if="o.discount > 0" class="text-discount">-{{ formatCurrency(o.discount) }}</span><span v-else class="text-muted">-</span></td>
              <td class="text-right revenue-cell">{{ formatCurrency(o.checkAmt) }}</td>
              <td class="text-right text-muted">{{ o.cashAmt > 0 ? formatCurrency(o.cashAmt) : '-' }}</td>
              <td><span class="pay-badge">{{ o.payType || '現金' }}</span></td>
              <td class="text-muted">{{ o.userId }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="orderTotalPages > 1" class="pagination">
        <button :disabled="orderPage === 1" class="page-btn" @click="fetchOrders(orderPage - 1)">‹ 上一頁</button>
        <span class="page-info">第 {{ orderPage }} / {{ orderTotalPages }} 頁</span>
        <button :disabled="orderPage === orderTotalPages" class="page-btn" @click="fetchOrders(orderPage + 1)">下一頁 ›</button>
      </div>
    </template>

    <!-- 熱銷商品 -->
    <template v-else>
      <div class="filter-bar">
        <input v-model="topDateFrom" type="date" class="date-input" />
        <span class="date-sep">~</span>
        <input v-model="topDateTo" type="date" class="date-input" />
        <button class="btn-primary" @click="fetchTopItems">查詢</button>
        <button class="btn-ghost" @click="topDateFrom = ''; topDateTo = ''; fetchTopItems()">清除</button>
      </div>
      <div v-if="topLoading" class="loading">載入中…</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>商品名稱</th>
              <th class="text-right">交易次數</th>
              <th class="text-right">總金額</th>
              <th style="width:35%">佔比</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in topItems" :key="item.itemName">
              <td><span :class="['rank', i < 3 ? 'rank-top' : '']">{{ i + 1 }}</span></td>
              <td class="item-name">{{ item.itemName }}</td>
              <td class="text-right text-muted">{{ item.cnt }}</td>
              <td class="text-right revenue-cell">{{ formatCurrency(item.totalAmt) }}</td>
              <td>
                <div class="bar-wrap">
                  <div class="bar" :style="{ width: (item.totalAmt / maxTopAmt * 100) + '%' }"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'pos.pos-sales' })

interface Monthly { month: string; orders: number; revenue: number }
interface Order { opDate: string; checkNo: string; billTime: string; orderAmt: number; discount: number; checkAmt: number; cashAmt: number; payType: string; userId: string; custTotal: string }
interface TopItem { itemName: string; cnt: number; totalAmt: number }

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url)
const view = ref<'overview' | 'orders' | 'topitems'>('overview')

// 月份總覽
const monthly = ref<Monthly[]>([])
const monthlyLoading = ref(false)
const thisMonth = computed(() => monthly.value[0])
const lastMonth = computed(() => monthly.value[1])
const totalRevenue = computed(() => monthly.value.reduce((s, m) => s + m.revenue, 0))
const totalOrders = computed(() => monthly.value.reduce((s, m) => s + m.orders, 0))
const avgRevenue = computed(() => monthly.value.length ? totalRevenue.value / monthly.value.length : 0)
const maxRevenue = computed(() => Math.max(...monthly.value.map(m => m.revenue), 1))

async function fetchMonthly() {
  monthlyLoading.value = true
  try { monthly.value = await $fetch<Monthly[]>(`${apiBase.value}/holy/bksql/sales/monthly`, { credentials: 'include' }) ?? [] }
  finally { monthlyLoading.value = false }
}

// 訂單明細
const orders = ref<Order[]>([])
const orderDateFrom = ref('')
const orderDateTo = ref('')
const orderSearch = ref('')
const orderPage = ref(1)
const orderTotal = ref(0)
const orderTotalPages = ref(1)
const orderLoading = ref(false)

async function fetchOrders(page: number) {
  orderLoading.value = true
  orderPage.value = page
  try {
    const data = await $fetch<{ orders: Order[], total: number, totalPages: number }>(
      `${apiBase.value}/holy/bksql/sales/orders`,
      { credentials: 'include', query: { dateFrom: orderDateFrom.value, dateTo: orderDateTo.value, search: orderSearch.value, page } }
    )
    orders.value = data?.orders ?? []
    orderTotal.value = data?.total ?? 0
    orderTotalPages.value = data?.totalPages ?? 1
  } finally { orderLoading.value = false }
}

function resetOrders() {
  orderDateFrom.value = ''
  orderDateTo.value = ''
  orderSearch.value = ''
  fetchOrders(1)
}

// 熱銷商品
const topItems = ref<TopItem[]>([])
const topDateFrom = ref('')
const topDateTo = ref('')
const topLoading = ref(false)
const maxTopAmt = computed(() => Math.max(...topItems.value.map(t => t.totalAmt), 1))

async function fetchTopItems() {
  topLoading.value = true
  try {
    topItems.value = await $fetch<TopItem[]>(`${apiBase.value}/holy/bksql/sales/topitems`, {
      credentials: 'include', query: { dateFrom: topDateFrom.value, dateTo: topDateTo.value }
    }) ?? []
  } finally { topLoading.value = false }
}

function formatCurrency(n: number) {
  return '$' + Math.round(n).toLocaleString()
}

await fetchMonthly()
await fetchOrders(1)
await fetchTopItems()
</script>

<style scoped>
.page-wrap { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }

.tab-switch { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.sw-tab { padding: 6px 16px; font-size: 13px; border: none; background: var(--surface); color: var(--text-muted); cursor: pointer; }
.sw-tab.active { background: var(--accent); color: #fff; }

.stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.stat-card { background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 16px 20px; }
.stat-card.accent { background: var(--accent); border-color: var(--accent); }
.stat-card.accent .stat-label, .stat-card.accent .stat-value, .stat-card.accent .stat-sub { color: #fff; }
.stat-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.stat-value { font-size: 22px; font-weight: 700; color: var(--text); }
.stat-sub { font-size: 12px; color: var(--text-hint); margin-top: 4px; }

.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.search-input { width: 200px; padding: 7px 12px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); outline: none; }
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
.text-right { text-align: right; }
.text-muted { color: var(--text-muted); font-size: 12px; }
.month-cell { font-weight: 600; }
.revenue-cell { font-weight: 700; color: var(--accent); }
.text-discount { color: #c0392b; font-size: 12px; }
.check-no { font-size: 11px; font-family: monospace; }
.item-name { font-weight: 500; }

.bar-wrap { height: 8px; background: var(--border-light); border-radius: 4px; overflow: hidden; }
.bar { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s; }

.rank { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 700; background: var(--surface2); color: var(--text-muted); }
.rank.rank-top { background: var(--accent); color: #fff; }

.pay-badge { display: inline-block; padding: 2px 8px; font-size: 11px; border-radius: 4px; background: var(--accent-light); color: var(--accent); }

.pagination { display: flex; align-items: center; gap: 12px; justify-content: center; }
.page-btn { padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text); }
.page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-muted); }
</style>
