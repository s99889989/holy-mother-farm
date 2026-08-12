<template>
  <div class="sc-order-page">
    <nav class="sc-topnav">
      <NuxtLink to="/front/shopping-cart" class="sc-topnav-link sc-active">訂單管理</NuxtLink>
      <NuxtLink to="/front/shopping-cart/users" class="sc-topnav-link">會員管理</NuxtLink>
    </nav>

    <div class="sc-breadcrumb">
      <span>訂單管理</span>
      <span class="sc-sep">/</span>
      <span class="sc-current">訂單清單</span>
    </div>

    <div class="sc-toolbar">
      <div class="sc-filter-group">
        <label for="ost">訂單狀態：</label>
        <select id="ost" v-model="filters.status" @change="onFilterChange">
          <option value="">全部</option>
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
      <button class="sc-refresh-btn" :disabled="loading" @click="fetchOrders">
        {{ loading ? '更新中…' : '重新整理' }}
      </button>
    </div>

    <p v-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div class="sc-table-controls">
      <div class="sc-length-control">
        顯示
        <select v-model.number="pageSize" @change="onPageSizeChange">
          <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">{{ n }}</option>
        </select>
        項結果
      </div>

      <div class="sc-search-control">
        搜索：
        <input
          v-model="filters.keyword"
          type="search"
          placeholder="訂單單號 / 收件人 / 會員…"
        />
      </div>
    </div>

    <div class="sc-table-wrapper">
      <table class="sc-order-table">
        <thead>
        <tr>
          <th class="text-center">序號</th>
          <th class="text-center sortable" @click="toggleSort('orderDate')">
            訂購日期
            <span class="sc-sort-icon">{{ sortIcon('orderDate') }}</span>
          </th>
          <th class="text-center">訂單單號</th>
          <th class="text-center">出貨日期</th>
          <th class="text-center">下單會員</th>
          <th class="text-center">收件人</th>
          <th class="text-center">收件人電話</th>
          <th class="text-center">收件人手機</th>
          <th class="text-center">收件人地址</th>
          <th class="text-center">總金額</th>
          <th class="text-center">狀態</th>
          <th class="text-center">處理員</th>
          <th class="text-center">修改</th>
          <th class="text-center">匯出</th>
        </tr>
        </thead>
        <tbody>
        <tr v-if="loading">
          <td colspan="14" class="text-center sc-loading-row">從原網站抓取資料中…</td>
        </tr>
        <tr v-else-if="pagedOrders.length === 0">
          <td colspan="14" class="text-center sc-empty-row">查無資料</td>
        </tr>
        <tr v-for="order in pagedOrders" :key="order.orderNo" :class="rowClass(order)">
          <td class="text-center">{{ order.seq }}</td>
          <td class="text-left">{{ order.orderDate }}</td>
          <td class="text-left">
            <NuxtLink :to="`/front/shopping-cart/order/${order.orderNo}`">
              {{ order.orderNo }}
            </NuxtLink>
          </td>
          <td class="text-center">{{ order.shipDate || '-' }}</td>
          <td class="text-center">{{ order.buyerName }}</td>
          <td class="text-center">{{ order.receiverName }}</td>
          <td class="text-left">{{ order.receiverPhone || '-' }}</td>
          <td class="text-left">{{ order.receiverMobile || '-' }}</td>
          <td class="text-left">{{ order.receiverAddress }}</td>
          <td class="text-left">{{ order.totalAmount }}</td>
          <td class="text-center">
              <span class="sc-status-badge" :class="statusClass(order.statusCode)">
                {{ order.statusText }}
              </span>
          </td>
          <td class="text-center">{{ order.handlerName || '-' }}</td>
          <td class="text-center">
            <NuxtLink :to="`/front/shopping-cart/order/${order.orderNo}/edit`">修改</NuxtLink>
          </td>
          <td class="text-center">
            <a v-if="order.exportUrl" :href="order.exportUrl" target="_blank" rel="noopener">
              匯出
            </a>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <p class="sc-open-note">
      「修改」「匯出」會開啟原網站頁面（需要你在該分頁另外登入原後台，因為這裡抓資料用的登入 session 只存在伺服器端，不會跟瀏覽器分享）。
    </p>

    <div class="sc-table-footer">
      <div class="sc-info-text">
        顯示第 {{ rangeStart }} 至 {{ rangeEnd }} 項結果，共 {{ filteredOrders.length.toLocaleString() }} 項
      </div>

      <div class="sc-pagination">
        <button class="sc-page-btn" :disabled="page === 1" @click="goToPage(page - 1)">
          上頁
        </button>
        <button
          v-for="p in visiblePages"
          :key="p"
          class="sc-page-btn"
          :class="{ active: p === page }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
        <button class="sc-page-btn" :disabled="page === totalPages" @click="goToPage(page + 1)">
          下頁
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, computed, watch, onMounted } from 'vue'

  // 這頁呼叫本專案自己的 server API route（server/api/shopping-cart/orders.get.ts），
  // 由該 route 帶著登入時取得的原網站 session，抓 admin_order.php 的 HTML 解析成 JSON。
  //
  // 原網站行為：依「狀態」篩選後，整批資料一次全部渲染出來，
  // 分頁/搜尋/排序都是原本 DataTables 在瀏覽器端處理的 —
  // 這裡照同樣邏輯：只有「狀態」改變時才重新呼叫 server route，
  // 搜尋/排序/分頁都在前端對拿到的完整清單做。
  definePageMeta({
    layout: false
  })

  const statusOptions = [
    { value: '0', label: '新訂單' },
    { value: '1', label: '訂單成立' },
    { value: '2', label: '備貨' },
    { value: '3', label: '出貨' }
  ]

  const filters = reactive({
    status: '',
    keyword: ''
  })

  const rawOrders = ref([])
  const loading = ref(false)
  const loadError = ref('')

  const page = ref(1)
  const pageSize = ref(10)

  const sortBy = ref('orderDate')
  const sortDir = ref('desc')

  async function fetchOrders() {
    loading.value = true
    loadError.value = ''
    try {
      const res = await $fetch('/api/shopping-cart/orders', {
        query: { status: filters.status || undefined }
      })
      rawOrders.value = res.items ?? []
    } catch (err) {
      rawOrders.value = []
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        loadError.value = '登入已過期，請重新登入'
        await navigateTo('/front/shopping-cart/login')
      } else {
        loadError.value = err?.data?.statusMessage || '抓取原網站資料失敗，請稍後再試'
      }
    } finally {
      loading.value = false
    }
  }

  // 搜尋：比對訂單單號 / 收件人 / 下單會員（跟原本 DataTables 全欄位搜尋精神一致，取常用欄位）
  const filteredOrders = computed(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    let list = rawOrders.value
    if (keyword) {
      list = list.filter((o) =>
        [o.orderNo, o.receiverName, o.buyerName, o.receiverAddress]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      )
    }

    const sorted = [...list].sort((a, b) => {
      const va = a[sortBy.value] || ''
      const vb = b[sortBy.value] || ''
      if (va < vb) return sortDir.value === 'asc' ? -1 : 1
      if (va > vb) return sortDir.value === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  })

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredOrders.value.length / pageSize.value))
  )

  const pagedOrders = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filteredOrders.value.slice(start, start + pageSize.value)
  })

  const rangeStart = computed(() =>
    filteredOrders.value.length === 0 ? 0 : (page.value - 1) * pageSize.value + 1
  )
  const rangeEnd = computed(() =>
    Math.min(page.value * pageSize.value, filteredOrders.value.length)
  )

  const visiblePages = computed(() => {
    const pages = []
    const maxButtons = 5
    let start = Math.max(1, page.value - Math.floor(maxButtons / 2))
    let end = Math.min(totalPages.value, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    for (let p = start; p <= end; p++) pages.push(p)
    return pages
  })

  function statusClass(code) {
    return {
      'sc-status-default': code === 0,
      'sc-status-info': code === 2,
      'sc-status-warning': code === 1,
      'sc-status-success': code === 3
    }
  }

  function rowClass(order) {
    return order.statusCode === 3 ? 'sc-row-shipped' : ''
  }

  function sortIcon(column) {
    if (sortBy.value !== column) return ''
    return sortDir.value === 'asc' ? '▲' : '▼'
  }

  function toggleSort(column) {
    if (sortBy.value === column) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = column
      sortDir.value = 'desc'
    }
  }

  function onFilterChange() {
    page.value = 1
    fetchOrders()
  }

  function onPageSizeChange() {
    page.value = 1
  }

  function goToPage(p) {
    if (p < 1 || p > totalPages.value || p === page.value) return
    page.value = p
  }

  // 搜尋時重置回第一頁
  watch(
    () => filters.keyword,
    () => {
      page.value = 1
    }
  )

  onMounted(fetchOrders)
</script>

<style scoped>
  .sc-order-page {
    padding: 20px;
    color: #333;
  }

  .sc-topnav {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    border-bottom: 1px solid #ddd;
  }

  .sc-topnav-link {
    padding: 8px 16px;
    font-size: 14px;
    color: #666;
    text-decoration: none;
    border-bottom: 2px solid transparent;
  }

  .sc-topnav-link:hover {
    color: #3d7a52;
  }

  .sc-topnav-link.sc-active,
  .sc-topnav-link.router-link-exact-active {
    color: #3d7a52;
    font-weight: 600;
    border-bottom-color: #3d7a52;
  }

  .sc-breadcrumb {
    font-size: 13px;
    color: #888;
    margin-bottom: 16px;
  }

  .sc-breadcrumb .sc-sep {
    margin: 0 6px;
  }

  .sc-breadcrumb .sc-current {
    color: #555;
  }

  .sc-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .sc-filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .sc-filter-group select {
    padding: 6px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .sc-refresh-btn {
    padding: 6px 14px;
    font-size: 13px;
    border: 1px solid #3d7a52;
    color: #3d7a52;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
  }

  .sc-refresh-btn:hover:not(:disabled) {
    background: #eef5f0;
  }

  .sc-refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sc-load-error {
    color: #d9534f;
    font-size: 13px;
    margin: 0 0 10px;
  }

  .sc-table-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 13px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .sc-length-control select {
    margin: 0 4px;
    padding: 4px 6px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .sc-search-control input {
    padding: 5px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: 220px;
  }

  .sc-table-wrapper {
    overflow-x: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .sc-order-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    white-space: nowrap;
  }

  .sc-order-table th,
  .sc-order-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #eee;
    border-right: 1px solid #f0f0f0;
  }

  .sc-order-table thead th {
    background: #f5f5f5;
    font-weight: 600;
    position: sticky;
    top: 0;
  }

  .sc-order-table thead th.sortable {
    cursor: pointer;
    user-select: none;
  }

  .sc-sort-icon {
    margin-left: 4px;
    font-size: 10px;
    color: #999;
  }

  .sc-order-table tbody tr:nth-child(even) {
    background: #fafafa;
  }

  .sc-order-table tbody tr:hover {
    background: #f0f7f2;
  }

  .sc-row-shipped {
    color: #777;
  }

  .text-center {
    text-align: center;
  }

  .text-left {
    text-align: left;
  }

  .sc-loading-row,
  .sc-empty-row {
    padding: 24px;
    color: #999;
  }

  .sc-status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 3px;
    font-size: 12px;
    color: #fff;
  }

  .sc-status-default {
    background: #999;
  }

  .sc-status-info {
    background: #5bc0de;
  }

  .sc-status-warning {
    background: #f0ad4e;
  }

  .sc-status-success {
    background: #3d7a52;
  }

  .sc-open-note {
    font-size: 12px;
    color: #999;
    margin: 10px 0 0;
  }

  .sc-table-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 13px;
  }

  .sc-pagination {
    display: flex;
    gap: 4px;
  }

  .sc-page-btn {
    padding: 5px 10px;
    border: 1px solid #ddd;
    background: #fff;
    border-radius: 3px;
    cursor: pointer;
    font-size: 13px;
  }

  .sc-page-btn:hover:not(:disabled) {
    background: #f0f7f2;
  }

  .sc-page-btn.active {
    background: #3d7a52;
    color: #fff;
    border-color: #3d7a52;
  }

  .sc-page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
