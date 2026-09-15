<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <div class="breadcrumb">
      <NuxtLink to="/staff/content/internal-system/property/inventory-dashboard">盤點資料</NuxtLink>
      <span class="sep">/</span>
      <NuxtLink :to="`/staff/content/internal-system/property/inventory-dashboard-summary?in=${encodeURIComponent(inventoryNo)}`">{{ inventoryNo }}</NuxtLink>
      <span class="sep">/</span>
      <span>{{ custody }}盤點資料</span>
    </div>

    <section class="card">
      <h2 class="card-title">盤點資料</h2>

      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗</p>
      <template v-else>
        <div class="summary-line">
          已確認：<span class="num">{{ summary.confirmed_count }}</span> / <span class="num">{{ summary.total_count }}</span>　
          存在：<span class="num text-success">{{ summary.exist_count }}</span>　
          不存在：<span class="num text-danger">{{ summary.not_exist_count }}</span>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
            <tr>
              <th>序號</th>
              <th>財產編號</th>
              <th>類別</th>
              <th>名稱</th>
              <th>機構/保管單位</th>
              <th>保管人</th>
              <th>放置位置</th>
              <th>是否存在</th>
              <th>說明</th>
              <th>確認時間</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(row, idx) in dataList" :key="row.is_id">
              <td>{{ idx + 1 }}</td>
              <td>
                <NuxtLink :to="`/staff/content/internal-system/property/view?id=${encodeURIComponent(row.product_num)}`">{{ row.product_num }}</NuxtLink>
              </td>
              <td>{{ row.class_name }}</td>
              <td>{{ row.product_name }}</td>
              <td>{{ row.inst_name }} / {{ row.dept_name }}</td>
              <td>{{ row.custody_name }}({{ row.custody }})</td>
              <td>{{ row.put_site_name }}</td>
              <td>
                  <span class="status-badge" :class="`status-${row.check_status}`">
                    {{ checkStatusText(row.check_status) }}
                  </span>
              </td>
              <td>{{ row.is_remark ?? '' }}</td>
              <td>{{ row.check_time ?? '-' }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface DetailRow {
    is_id: string
    product_num: string
    product_name: string
    class_name: string
    inst_name: string
    dept_name: string
    custody: string | null
    custody_name: string | null
    put_site_name: string
    check_status: string
    check_id: string | null
    check_time: string | null
    is_remark: string | null
  }

  interface DetailSummary {
    total_count: string
    confirmed_count: string
    exist_count: string
    not_exist_count: string
  }

  interface DetailResponse {
    data: { dataList: DetailRow[]; summary: DetailSummary }
  }

  const route = useRoute()
  const inventoryNo = computed(() => String(route.query.in ?? ''))
  const custody = computed(() => String(route.query.uid ?? ''))

  const dataList = ref<DetailRow[]>([])
  const summary = ref<DetailSummary>({ total_count: '0', confirmed_count: '0', exist_count: '0', not_exist_count: '0' })
  const loading = ref(true)
  const error = ref(false)

  const checkStatusText = (status: string) =>
          ({ '0': '未盤點', '1': '不存在', '2': '存在' } as Record<string, string>)[status] ?? '未知'

  const load = async () => {
    loading.value = true
    error.value = false
    try {
      const res = await $fetch<DetailResponse>('/api/internal-system/property/inventory-dashboard-detail', {
        query: { in: inventoryNo.value, uid: custody.value },
      })
      dataList.value = res.data.dataList ?? []
      summary.value = res.data.summary
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<style scoped>
  .page { max-width: 1300px; }

  .breadcrumb {
    font-size: 13px;
    color: var(--text-hint);
    margin-bottom: 16px;
  }

  .breadcrumb a { color: var(--accent); }
  .sep { margin: 0 6px; }

  .card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px;
  }

  .card-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 14px;
  }

  .hint-text { color: var(--text-hint); font-size: 13px; }
  .error-text { color: #e53e3e; font-size: 13px; }

  .summary-line {
    text-align: right;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .num { font-weight: 700; color: var(--text); }
  .text-success { color: #38a169; }
  .text-danger { color: #e53e3e; }

  .table-wrap { overflow-x: auto; }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .data-table td a {
    color: var(--accent);
    text-decoration: underline;
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

  .status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }

  .status-badge.status-0 {
    background: var(--surface2);
    color: var(--text-hint);
  }

  .status-badge.status-1 {
    background: #fed7d7;
    color: #c53030;
  }

  .status-badge.status-2 {
    background: #c6f6d5;
    color: #2f855a;
  }
</style>