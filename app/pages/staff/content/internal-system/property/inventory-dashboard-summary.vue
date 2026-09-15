<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <div class="breadcrumb">
      <NuxtLink to="/staff/content/internal-system/property/inventory-dashboard">盤點資料</NuxtLink>
      <span class="sep">/</span>
      <span>{{ inventoryNo }}</span>
    </div>

    <section class="card">
      <h2 class="card-title">盤點單清單</h2>

      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗</p>
      <template v-else>
        <div class="summary-line">
          總數：<span class="num">{{ summary.total_count }}</span>　
          總已盤數：<span class="num text-success">{{ summary.confirmed_count }}</span>　
          總未盤數：<span class="num text-danger">{{ summary.not_confirmed_count }}</span>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
            <tr>
              <th>序號</th>
              <th>盤點人</th>
              <th>部門</th>
              <th>總財產數</th>
              <th>已盤數</th>
              <th>未盤數</th>
              <th>不存在數</th>
              <th>盤點完成率</th>
              <th>最後更新時間</th>
              <th>操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(row, idx) in dataList" :key="row.custody ?? idx">
              <td>{{ idx + 1 }}</td>
              <td>{{ row.custody_name }}({{ row.custody }})</td>
              <td>{{ row.dept_name }}</td>
              <td>{{ row.total_count }}</td>
              <td>{{ row.done_count }}</td>
              <td>{{ row.pending_count }}</td>
              <td>{{ row.abnormal_count }}</td>
              <td>{{ row.completion_rate }}%</td>
              <td>{{ row.last_update_time ?? '-' }}</td>
              <td>
                <NuxtLink
                        :to="`/staff/content/internal-system/property/inventory-dashboard-detail?in=${encodeURIComponent(inventoryNo)}&uid=${encodeURIComponent(row.custody ?? '')}`"
                        class="btn-sm"
                >詳細資料</NuxtLink>
              </td>
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

  interface SummaryRow {
    custody: string | null
    custody_name: string | null
    dept_name: string
    total_count: string
    done_count: string
    pending_count: string
    abnormal_count: string
    completion_rate: string
    last_update_time: string | null
  }

  interface SummaryTotal {
    total_count: string
    confirmed_count: string
    not_confirmed_count: string
  }

  interface SummaryResponse {
    data: { dataList: SummaryRow[]; summary: SummaryTotal }
  }

  const route = useRoute()
  const inventoryNo = computed(() => String(route.query.in ?? ''))

  const dataList = ref<SummaryRow[]>([])
  const summary = ref<SummaryTotal>({ total_count: '0', confirmed_count: '0', not_confirmed_count: '0' })
  const loading = ref(true)
  const error = ref(false)

  const load = async () => {
    loading.value = true
    error.value = false
    try {
      const res = await $fetch<SummaryResponse>('/api/internal-system/property/inventory-dashboard-summary', {
        query: { in: inventoryNo.value },
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
  .page { max-width: 1200px; }

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

  .btn-sm {
    display: inline-block;
    padding: 4px 12px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-size: 12px;
    text-decoration: none;
  }
</style>