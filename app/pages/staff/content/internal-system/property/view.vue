<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <div class="breadcrumb">
      <button type="button" class="back-link" @click="goBack">← 返回</button>
      <span class="sep">/</span>
      <span>檢視</span>
    </div>

    <section class="card">
      <h2 class="card-title">財產檔案</h2>

      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗</p>
      <template v-else-if="data">
        <div class="chain-panel">
          <div class="chain-title">📎 財產編號異動鏈</div>
          <div class="chain-row">
            <template v-for="(num, idx) in data.num_chain" :key="num">
              <span class="chain-badge" :class="{ current: idx === data.num_chain.length - 1 }">
                {{ num }}
                <span v-if="idx === data.num_chain.length - 1"> ✓</span>
              </span>
              <span v-if="idx < data.num_chain.length - 1" class="chain-arrow">→</span>
            </template>
          </div>
        </div>

        <div class="field-list">
          <div class="field-row"><span class="field-label">財產編號</span><span class="field-value">{{ data.product_num }}</span></div>
          <div class="field-row"><span class="field-label">第一類別名稱</span><span class="field-value">{{ data.first_class_name }}</span></div>
          <div class="field-row"><span class="field-label">第二類別名稱</span><span class="field-value">{{ data.second_class_name }}</span></div>
          <div class="field-row"><span class="field-label">第三類別名稱</span><span class="field-value">{{ data.third_class_name }}</span></div>
          <div class="field-row"><span class="field-label">第四類別名稱</span><span class="field-value">{{ data.fourth_class_name }}</span></div>
          <div class="field-row"><span class="field-label">名稱</span><span class="field-value">{{ data.product_name }}</span></div>

          <div class="field-grid">
            <div class="field-row"><span class="field-label">廠牌</span><span class="field-value">{{ data.brand || '-' }}</span></div>
            <div class="field-row"><span class="field-label">規格</span><span class="field-value">{{ data.standard || '-' }}</span></div>
            <div v-if="data.licensePlate" class="field-row"><span class="field-label">車號</span><span class="field-value">{{ data.licensePlate }}</span></div>
          </div>

          <div class="field-row"><span class="field-label">購置日期</span><span class="field-value">{{ data.buy_date }}</span></div>
          <div class="field-row"><span class="field-label">機構</span><span class="field-value">{{ data.inst_name }}</span></div>

          <div class="field-grid">
            <div class="field-row"><span class="field-label">保管單位</span><span class="field-value">{{ data.dept_name }}</span></div>
            <div class="field-row"><span class="field-label">保管人</span><span class="field-value">{{ data.employee_name }}({{ data.custody }})</span></div>
          </div>

          <div class="field-grid">
            <div class="field-row"><span class="field-label">撥發數量</span><span class="field-value">{{ data.total_num }}</span></div>
            <div class="field-row"><span class="field-label">撥發單位</span><span class="field-value">{{ data.product_unit }}</span></div>
          </div>

          <div class="field-grid">
            <div class="field-row"><span class="field-label">單價</span><span class="field-value">{{ formatPrice(data.product_price) }}</span></div>
            <div class="field-row"><span class="field-label">年限</span><span class="field-value">{{ data.fixed_year }}</span></div>
          </div>

          <div class="field-row"><span class="field-label">歸屬計畫</span><span class="field-value">{{ data.plan_name || '-' }}</span></div>
          <div class="field-row"><span class="field-label">放置地點</span><span class="field-value">{{ data.ps_location }}({{ data.pf_name }})</span></div>
          <div class="field-row"><span class="field-label">用途</span><span class="field-value multiline">{{ data.product_function || '-' }}</span></div>

          <div class="field-row"><span class="field-label">IP</span><span class="field-value">{{ data.IP || '-' }}</span></div>
          <div class="field-row"><span class="field-label">MAC</span><span class="field-value">{{ data.MAC || '-' }}</span></div>
          <div class="field-row"><span class="field-label">SIM</span><span class="field-value">{{ data.SIM || '-' }}</span></div>

          <div class="field-row"><span class="field-label">備註</span><span class="field-value multiline">{{ data.notes || '-' }}</span></div>
        </div>
      </template>
    </section>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface ViewData {
    product_id: string
    product_name: string
    product_num: string
    custody: string
    custody_department: string
    product_function: string
    put_site: string
    total_num: string
    notes: string
    product_unit: string
    buy_date: string
    product_price: string
    fixed_year: string
    MAC: string
    IP: string
    SIM: string
    plan_value: string
    institution: string
    licensePlate: string
    standard: string
    brand: string
    first_class_name: string
    second_class_name: string
    third_class_name: string
    fourth_class_name: string
    inst_name: string
    dept_name: string
    employee_name: string
    plan_name: string | null
    ps_location: string
    pf_name: string
    num_chain: string[]
  }

  interface ViewResponse {
    data: { mainData: ViewData }
  }

  const route = useRoute()
  const router = useRouter()
  const id = computed(() => String(route.query.id ?? ''))

  const goBack = () => {
    if (window.history.state?.back) {
      router.back()
    } else {
      router.push('/staff/content/internal-system/property')
    }
  }

  const data = ref<ViewData | null>(null)
  const loading = ref(true)
  const error = ref(false)

  const formatPrice = (price: string) => {
    const n = Number(price)
    return Number.isNaN(n) ? price : n.toLocaleString('zh-TW')
  }

  const load = async () => {
    loading.value = true
    error.value = false
    try {
      const res = await $fetch<ViewResponse>('/api/internal-system/property/view', { query: { id: id.value } })
      data.value = res.data.mainData
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<style scoped>
  .page { max-width: 800px; }

  .breadcrumb {
    font-size: 13px;
    color: var(--text-hint);
    margin-bottom: 16px;
  }
  .back-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-size: 13px;
    cursor: pointer;
  }
  .sep { margin: 0 6px; }

  .card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 20px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 16px;
  }

  .hint-text { color: var(--text-hint); font-size: 13px; }
  .error-text { color: #e53e3e; font-size: 13px; }

  .chain-panel {
    background: var(--surface2);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    margin-bottom: 20px;
  }

  .chain-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .chain-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .chain-badge {
    padding: 6px 14px;
    border-radius: 999px;
    background: var(--border);
    color: var(--text);
    font-size: 13px;
  }

  .chain-badge.current {
    background: #38a169;
    color: white;
  }

  .chain-arrow {
    color: var(--text-hint);
  }

  .field-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .field-row {
    display: flex;
    border: 1px solid var(--border-light);
    border-radius: var(--radius-sm);
    overflow: hidden;
    font-size: 14px;
  }

  .field-label {
    flex-shrink: 0;
    width: 120px;
    padding: 10px 12px;
    background: var(--surface2);
    color: var(--text-muted);
    font-weight: 600;
  }

  .field-value {
    flex: 1;
    padding: 10px 12px;
    color: var(--text);
  }

  .field-value.multiline {
    white-space: pre-line;
    line-height: 1.6;
  }
</style>