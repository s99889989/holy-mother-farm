<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <h1 class="page-title">我的財產</h1>
    <p class="page-note">
      這裡先提供清單檢視；批次「財產異動」流程（含多層地點/部門/保管人連動選單）之後再實作。
    </p>

    <section class="card">
      <p v-if="loading" class="hint-text">載入中...</p>
      <p v-else-if="error" class="error-text">載入失敗</p>
      <p v-else-if="dataList.length === 0" class="hint-text">目前沒有財產資料</p>
      <template v-else>
        <div class="site-filter-row">
          <label class="filter-label">放置地點篩選</label>
          <select v-model="siteFilter" class="filter-select site-filter-input">
            <option value="">全部</option>
            <option v-for="site in siteOptions" :key="site" :value="site">{{ site }}</option>
          </select>
          <div class="view-toggle">
            <button
                    type="button"
                    class="view-toggle-btn"
                    :class="{ active: viewMode === 'table' }"
                    @click="viewMode = 'table'"
            >表格</button>
            <button
                    type="button"
                    class="view-toggle-btn"
                    :class="{ active: viewMode === 'card' }"
                    @click="viewMode = 'card'"
            >卡片</button>
          </div>
        </div>
        <p v-if="filteredDataList.length === 0" class="hint-text">查無符合的放置地點</p>
        <div v-else-if="viewMode === 'table'" class="table-wrap">
          <table class="data-table">
            <thead>
            <tr>
              <th>序號</th>
              <th>編號(新)</th>
              <th>編號(舊)</th>
              <th>類別</th>
              <th>名稱</th>
              <th>數量</th>
              <th>廠牌/規格</th>
              <th>機構/保管單位</th>
              <th>保管人</th>
              <th>放置位置</th>
              <th>操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="row in filteredDataList" :key="row.product_id">
              <td>{{ row.__seq }}</td>
              <td><button type="button" class="link-btn" @click="openModal(row.product_num)">{{ row.product_num }}</button></td>
              <td>{{ row.old_product_num }}</td>
              <td>{{ row.fourth_class_name }}</td>
              <td>{{ row.product_name }}</td>
              <td>{{ row.total_num }}</td>
              <td>{{ [row.brand, row.standard].filter(Boolean).join(' ') }}</td>
              <td>{{ [row.inst_name, row.department_name].filter(Boolean).join(' / ') }}</td>
              <td>{{ row.employee_name }}({{ row.custody }})</td>
              <td>{{ row.ps_location }}{{ row.pf_name ? `(${row.pf_name})` : '' }}</td>
              <td>
                <NuxtLink :to="`/staff/content/internal-system/property/view?id=${encodeURIComponent(row.product_num)}`" class="btn-sm">檢視</NuxtLink>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="card-grid">
          <div v-for="row in filteredDataList" :key="row.product_id" class="property-card">
            <div class="property-card-header">
              <span class="property-card-seq">{{ row.__seq }}</span>
              <span class="property-card-name" :title="row.product_name">{{ row.product_name }}</span>
            </div>
            <div class="property-card-body">
              <div class="property-card-row">
                <span class="property-card-label">編號(新)</span>
                <span class="property-card-value"><button type="button" class="link-btn" @click="openModal(row.product_num)">{{ row.product_num }}</button></span>
              </div>
              <div class="property-card-row" v-if="row.old_product_num">
                <span class="property-card-label">編號(舊)</span>
                <span class="property-card-value">{{ row.old_product_num }}</span>
              </div>
              <div class="property-card-row">
                <span class="property-card-label">類別</span>
                <span class="property-card-value">{{ row.fourth_class_name }}</span>
              </div>
              <div class="property-card-row" v-if="row.brand || row.standard">
                <span class="property-card-label">廠牌/規格</span>
                <span class="property-card-value">{{ [row.brand, row.standard].filter(Boolean).join(' ') }}</span>
              </div>
              <div class="property-card-row">
                <span class="property-card-label">數量</span>
                <span class="property-card-value">{{ row.total_num }}</span>
              </div>
              <div class="property-card-row">
                <span class="property-card-label">機構單位</span>
                <span class="property-card-value">{{ [row.inst_name, row.department_name].filter(Boolean).join(' / ') }}</span>
              </div>
              <div class="property-card-row" v-if="row.employee_name">
                <span class="property-card-label">保管人</span>
                <span class="property-card-value">{{ row.employee_name }}({{ row.custody }})</span>
              </div>
              <div class="property-card-row" v-if="row.ps_location || row.pf_name">
                <span class="property-card-label">放置位置</span>
                <span class="property-card-value">{{ row.ps_location }}{{ row.pf_name ? `(${row.pf_name})` : '' }}</span>
              </div>
              <div class="property-card-row">
                <span class="property-card-label">操作</span>
                <span class="property-card-value">
                  <NuxtLink :to="`/staff/content/internal-system/property/view?id=${encodeURIComponent(row.product_num)}`" class="btn-sm">檢視</NuxtLink>
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>

    <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal-panel">
        <div class="modal-header">
          <h2 class="card-title">財產檔案</h2>
          <button type="button" class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <p v-if="modalLoading" class="hint-text">載入中...</p>
          <p v-else-if="modalError" class="error-text">載入失敗</p>
          <template v-else-if="modalData">
            <div v-if="modalData.num_chain?.length" class="chain-panel">
              <div class="chain-title">📎 財產編號異動鏈</div>
              <div class="chain-row">
                <template v-for="(num, idx) in modalData.num_chain" :key="num">
                  <span class="chain-badge" :class="{ current: idx === modalData.num_chain.length - 1 }">
                    {{ num }}
                    <span v-if="idx === modalData.num_chain.length - 1"> ✓</span>
                  </span>
                  <span v-if="idx < modalData.num_chain.length - 1" class="chain-arrow">→</span>
                </template>
              </div>
            </div>

            <div class="field-list">
              <div class="field-row"><span class="field-label">財產編號</span><span class="field-value">{{ modalData.product_num }}</span></div>
              <div class="field-row"><span class="field-label">第一類別名稱</span><span class="field-value">{{ modalData.first_class_name }}</span></div>
              <div class="field-row"><span class="field-label">第二類別名稱</span><span class="field-value">{{ modalData.second_class_name }}</span></div>
              <div class="field-row"><span class="field-label">第三類別名稱</span><span class="field-value">{{ modalData.third_class_name }}</span></div>
              <div class="field-row"><span class="field-label">第四類別名稱</span><span class="field-value">{{ modalData.fourth_class_name }}</span></div>
              <div class="field-row"><span class="field-label">名稱</span><span class="field-value">{{ modalData.product_name }}</span></div>

              <div class="field-grid">
                <div class="field-row"><span class="field-label">廠牌</span><span class="field-value">{{ modalData.brand || '-' }}</span></div>
                <div class="field-row"><span class="field-label">規格</span><span class="field-value">{{ modalData.standard || '-' }}</span></div>
                <div v-if="modalData.licensePlate" class="field-row"><span class="field-label">車號</span><span class="field-value">{{ modalData.licensePlate }}</span></div>
              </div>

              <div class="field-row"><span class="field-label">購置日期</span><span class="field-value">{{ modalData.buy_date }}</span></div>
              <div class="field-row"><span class="field-label">機構</span><span class="field-value">{{ modalData.inst_name }}</span></div>

              <div class="field-grid">
                <div class="field-row"><span class="field-label">保管單位</span><span class="field-value">{{ modalData.dept_name }}</span></div>
                <div class="field-row"><span class="field-label">保管人</span><span class="field-value">{{ modalData.employee_name }}({{ modalData.custody }})</span></div>
              </div>

              <div class="field-grid">
                <div class="field-row"><span class="field-label">撥發數量</span><span class="field-value">{{ modalData.total_num }}</span></div>
                <div class="field-row"><span class="field-label">撥發單位</span><span class="field-value">{{ modalData.product_unit }}</span></div>
              </div>

              <div class="field-grid">
                <div class="field-row"><span class="field-label">單價</span><span class="field-value">{{ formatPrice(modalData.product_price) }}</span></div>
                <div class="field-row"><span class="field-label">年限</span><span class="field-value">{{ modalData.fixed_year }}</span></div>
              </div>

              <div class="field-row"><span class="field-label">歸屬計畫</span><span class="field-value">{{ modalData.plan_name || '-' }}</span></div>
              <div class="field-row"><span class="field-label">放置地點</span><span class="field-value">{{ modalData.ps_location }}({{ modalData.pf_name }})</span></div>
              <div class="field-row"><span class="field-label">用途</span><span class="field-value multiline">{{ modalData.product_function || '-' }}</span></div>

              <div class="field-row"><span class="field-label">IP</span><span class="field-value">{{ modalData.IP || '-' }}</span></div>
              <div class="field-row"><span class="field-label">MAC</span><span class="field-value">{{ modalData.MAC || '-' }}</span></div>
              <div class="field-row"><span class="field-label">SIM</span><span class="field-value">{{ modalData.SIM || '-' }}</span></div>

              <div class="field-row"><span class="field-label">備註</span><span class="field-value multiline">{{ modalData.notes || '-' }}</span></div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  /**
   * 欄位名稱依實際 API 回傳 (property_user_CL.php?act=index_page) 對照。
   * item.instList / item.putSite / item.project 是財產異動用的下拉選單資料，
   * 這裡先不用（等做財產異動流程再接）。
   */
  interface PropertyRow {
    product_id: string
    product_num: string
    old_product_num: string
    product_name: string
    inst_name: string
    standard: string
    brand: string
    department_name: string
    custody: string
    employee_name: string
    ps_location: string
    pf_name: string
    fourth_class_name: string
    inst_code: string
    dept_code: string
    put_site: string
    vat_group: string
    total_num: string
    plan_value: string
    plan_name: string | null
    /** 前端附加：清單原始序號，不受篩選影響 */
    __seq?: number
  }

  interface UserListResponse {
    data: {
      dataList: PropertyRow[]
      item?: {
        instList: { Code: string; Name: string; vat_group: string }[]
        putSite: { ps_number: string; ps_location: string; pf_name: string }[]
        project: { sc_value: string; sc_name: string }[]
      }
    }
  }

  /** 對應 property/view.vue 的財產詳情資料結構 */
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

  const dataList = ref<PropertyRow[]>([])
  const loading = ref(true)
  const error = ref(false)
  const siteFilter = ref('')
  const viewMode = ref<'table' | 'card'>('table')

  const filteredDataList = computed(() => {
    if (!siteFilter.value) return dataList.value
    return dataList.value.filter((row) => row.ps_location === siteFilter.value)
  })

  const siteOptions = computed(() => {
    const set = new Set<string>()
    dataList.value.forEach((row) => {
      if (row.ps_location) set.add(row.ps_location)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  })

  const modalOpen = ref(false)
  const modalLoading = ref(false)
  const modalError = ref(false)
  const modalData = ref<ViewData | null>(null)

  const openModal = async (id: string) => {
    modalOpen.value = true
    modalLoading.value = true
    modalError.value = false
    modalData.value = null
    try {
      const res = await $fetch<ViewResponse>('/api/internal-system/property/view', { query: { id } })
      modalData.value = res.data.mainData
    } catch {
      modalError.value = true
    } finally {
      modalLoading.value = false
    }
  }

  const closeModal = () => {
    modalOpen.value = false
  }

  const formatPrice = (price: string) => {
    const n = Number(price)
    return Number.isNaN(n) ? price : n.toLocaleString('zh-TW')
  }

  const load = async () => {
    loading.value = true
    error.value = false
    try {
      const res = await $fetch<UserListResponse>('/api/internal-system/property/user-list')
      dataList.value = (res.data.dataList ?? []).map((row, i) => ({ ...row, __seq: i + 1 }))
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

  .page-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 6px;
  }

  .page-note {
    font-size: 13px;
    color: var(--text-hint);
    margin: 0 0 20px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px;
  }

  .hint-text { color: var(--text-hint); font-size: 13px; }
  .error-text { color: #e53e3e; font-size: 13px; }

  .site-filter-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .filter-label { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
  .filter-select {
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
    box-sizing: border-box;
  }
  .site-filter-input { max-width: 260px; }

  .view-toggle {
    display: flex;
    margin-left: auto;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .view-toggle-btn {
    padding: 7px 16px;
    font-size: 13px;
    border: none;
    background: var(--surface);
    color: var(--text-muted);
    cursor: pointer;
  }
  .view-toggle-btn + .view-toggle-btn { border-left: 1px solid var(--border); }
  .view-toggle-btn.active {
    background: var(--accent);
    color: white;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .property-card {
    border: 1px solid var(--border-light);
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    transition: box-shadow 0.15s ease, transform 0.15s ease;
  }
  .property-card:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  .property-card-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    background: var(--surface2);
    border-bottom: 1px solid var(--border-light);
  }

  .property-card-seq {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--accent);
    color: white;
    font-size: 11px;
    font-weight: 700;
    margin-top: 1px;
  }

  .property-card-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    flex: 1;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .property-card-body {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
  }

  .property-card-row {
    display: grid;
    grid-template-columns: 76px 1fr;
    gap: 4px 10px;
    font-size: 13px;
    padding: 5px 0;
  }
  .property-card-row + .property-card-row {
    border-top: 1px dashed var(--border-light);
  }

  .property-card-label {
    color: var(--text-hint);
  }

  .property-card-value {
    color: var(--text);
    white-space: normal;
    word-break: break-all;
  }

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
    padding: 4px 10px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-size: 12px;
  }

  .link-btn {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
    text-decoration: underline;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 16px;
    overflow-y: auto;
    z-index: 1000;
  }

  .modal-panel {
    background: var(--surface);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    width: 100%;
    max-width: 800px;
    max-height: 100%;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px 0;
  }

  .modal-header .card-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--text); }

  .modal-close {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--text-hint);
    cursor: pointer;
    padding: 4px 8px;
  }

  .modal-body {
    padding: 12px 20px 20px;
  }

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