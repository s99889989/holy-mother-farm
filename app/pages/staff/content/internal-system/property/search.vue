<template>
  <InternalSystemPropertyShell>
  <div class="page">
    <h1 class="page-title">財產查詢</h1>

    <section class="card">
      <h2 class="card-title">查詢條件</h2>
      <p class="page-note">
        部門連動選單（部門樹狀選擇器）這次先省略，其餘條件（類別／保管人／計畫／金額區間）都可用。
      </p>
      <div class="filter-grid">
        <div class="filter-group">
          <label class="filter-label">第一類別</label>
          <select v-model="first" class="filter-select">
            <option value="">請選擇</option>
            <option v-for="o in firstOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">第二類別</label>
          <select v-model="second" class="filter-select" :disabled="!first">
            <option value="">請選擇</option>
            <option v-for="o in secondOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">第三類別</label>
          <select v-model="third" class="filter-select" :disabled="!second">
            <option value="">請選擇</option>
            <option v-for="o in thirdOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">第四類別</label>
          <select v-model="fourth" class="filter-select" :disabled="!third">
            <option value="">請選擇</option>
            <option v-for="o in fourthOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">保管人</label>
          <select v-model="employeeId" class="filter-select">
            <option value="">請選擇</option>
            <option v-for="e in employeeList" :key="e.employee_id" :value="e.employee_id">
              {{ e.employee_name }}({{ e.employee_id }})
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">計畫</label>
          <select v-model="projectId" class="filter-select">
            <option value="">請選擇</option>
            <option v-for="p in projectList" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">最低金額</label>
          <input v-model="priceMin" type="number" class="filter-select" placeholder="最低金額" />
        </div>
        <div class="filter-group">
          <label class="filter-label">最高金額</label>
          <input v-model="priceMax" type="number" class="filter-select" placeholder="最高金額" />
        </div>
      </div>

      <div class="search-row">
        <button type="button" class="search-btn" :disabled="searching" @click="search">
          {{ searching ? '查詢中...' : '查詢' }}
        </button>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">財產清單</h2>
      <p v-if="metaLoading" class="hint-text">載入中...</p>
      <p v-else-if="metaError" class="error-text">初始資料載入失敗</p>
      <template v-else>
        <p v-if="!searched" class="hint-text">請先設定查詢條件</p>
        <p v-else-if="dataList.length === 0" class="hint-text">查無資料</p>
        <template v-else>
          <div class="site-filter-row">
            <label class="filter-label">類別篩選</label>
            <select v-model="categoryFilter" class="filter-select site-filter-input">
              <option value="">全部</option>
              <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ cat }}</option>
            </select>
            <label class="filter-label">放置地點篩選</label>
            <select v-model="siteFilter" class="filter-select site-filter-input">
              <option value="">全部</option>
              <option v-for="site in siteOptions" :key="site" :value="site">{{ site }}</option>
            </select>
            <label class="filter-label">保管人篩選</label>
            <select v-model="custodyFilter" class="filter-select site-filter-input">
              <option value="">全部</option>
              <option v-for="c in custodyOptions" :key="c.custody" :value="c.custody">{{ c.label }}</option>
            </select>
            <input v-model="keyword" type="text" class="filter-select keyword-input" placeholder="搜尋編號/類別/名稱/廠牌規格/備註" />
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
          <p v-if="filteredDataList.length === 0" class="hint-text">查無符合篩選條件的資料</p>
          <div v-else-if="viewMode === 'table'" class="table-wrap">
            <table class="data-table">
              <thead>
              <tr>
                <th>序號</th>
                <th>編號(新)</th>
                <th>編號(舊)</th>
                <th>類別</th>
                <th>名稱</th>
                <th>廠牌/規格</th>
                <th>數量</th>
                <th>單價</th>
                <th>單位</th>
                <th>保管人</th>
                <th>放置地點</th>
                <th>年限/已使用</th>
                <th>備註</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="row in filteredDataList" :key="row.product_num ?? row.__seq">
                <td>{{ row.__seq }}</td>
                <td><button type="button" class="link-btn" @click="openModal(row.product_num)">{{ row.product_num }}</button></td>
                <td>{{ row.old_product_num }}</td>
                <td>{{ row.fourth_class_name }}</td>
                <td>{{ row.product_name }}</td>
                <td>{{ row.brand }}<template v-if="row.standard"> / {{ row.standard }}</template></td>
                <td>{{ row.total_num }}</td>
                <td>{{ formatPrice(row.product_price) }}</td>
                <td>{{ row.inst_name }} / {{ row.department_name }}</td>
                <td>
                  <template v-if="row.employee_name">{{ row.employee_name }}<template v-if="row.custody">({{ row.custody }})</template></template>
                  <span v-if="row.is_abnormal === '1'" class="badge-abnormal">異常</span>
                </td>
                <td>
                  <template v-if="row.ps_location">{{ row.ps_location }}<template v-if="row.pf_name">({{ row.pf_name }})</template></template>
                  <template v-else>{{ row.pf_name }}</template>
                </td>
                <td>{{ row.fixed_year }}/{{ row.used_year }}</td>
                <td>{{ row.notes }}</td>
              </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="card-grid">
            <div v-for="row in filteredDataList" :key="row.product_num ?? row.__seq" class="property-card">
              <div class="property-card-header">
                <span class="property-card-seq">{{ row.__seq }}</span>
                <span class="property-card-name" :title="row.product_name">{{ row.product_name }}</span>
                <span v-if="row.is_abnormal === '1'" class="badge-abnormal">異常</span>
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
                  <span class="property-card-value">{{ row.brand }}<template v-if="row.standard"> / {{ row.standard }}</template></span>
                </div>
                <div class="property-card-row">
                  <span class="property-card-label">數量/單價</span>
                  <span class="property-card-value">{{ row.total_num }}{{ row.product_price ? ' / ' + formatPrice(row.product_price) : '' }}</span>
                </div>
                <div class="property-card-row">
                  <span class="property-card-label">單位</span>
                  <span class="property-card-value">{{ row.inst_name }} / {{ row.department_name }}</span>
                </div>
                <div class="property-card-row" v-if="row.employee_name">
                  <span class="property-card-label">保管人</span>
                  <span class="property-card-value">{{ row.employee_name }}<template v-if="row.custody">({{ row.custody }})</template></span>
                </div>
                <div class="property-card-row" v-if="row.ps_location || row.pf_name">
                  <span class="property-card-label">放置地點</span>
                  <span class="property-card-value"><template v-if="row.ps_location">{{ row.ps_location }}<template v-if="row.pf_name">({{ row.pf_name }})</template></template><template v-else>{{ row.pf_name }}</template></span>
                </div>
                <div class="property-card-row" v-if="row.fixed_year || row.used_year">
                  <span class="property-card-label">年限/已使用</span>
                  <span class="property-card-value">{{ row.fixed_year }}/{{ row.used_year }}</span>
                </div>
                <div class="property-card-row" v-if="row.notes">
                  <span class="property-card-label">備註</span>
                  <span class="property-card-value">{{ row.notes }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
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
  import { useInternalSystemPropertyClassCascade } from '~/composables/useInternalSystemPropertyClassCascade'

  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

  interface Employee { employee_id: string; employee_name: string }
  interface Project { id: string; name: string }

  interface SearchMetaResponse {
    data: {
      classData: {
        firstClass: { value: string; label: string; unite_num: string }[]
        secondClass: { value: string; label: string; unite_num: string; first_num: string }[]
        thirdClass: { value: string; label: string; unite_num: string; first_num: string; second_num: string }[]
        fourthClass: { value: string; label: string; unite_num: string; first_num: string; second_num: string; third_num: string }[]
      }
      employee: Employee[]
      project: Project[]
    }
  }

  /** 結果欄位名稱對應實際 API 回傳（property_search_CL.php?act=search_data） */
  interface PropertyRow {
    product_num: string
    old_product_num: string | null
    product_name: string
    product_price: string | null
    total_num: string
    standard: string | null
    brand: string | null
    department_name: string
    custody: string | null
    employee_name: string | null
    ps_location: string | null
    pf_name: string | null
    fourth_class_name: string
    fixed_year: string | null
    notes: string | null
    inst_name: string
    used_year: string | null
    is_abnormal: string
    /** 前端附加：查詢結果的原始序號，不受篩選影響 */
    __seq?: number
  }

  interface SearchDataResponse {
    data: { dataList: PropertyRow[] }
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

  const classData = ref<SearchMetaResponse['data']['classData'] | null>(null)
  const employeeList = ref<Employee[]>([])
  const projectList = ref<Project[]>([])
  const metaLoading = ref(true)
  const metaError = ref(false)

  const { first, second, third, fourth, firstOptions, secondOptions, thirdOptions, fourthOptions } =
          useInternalSystemPropertyClassCascade(classData)

  const employeeId = ref('')
  const projectId = ref('')
  const priceMin = ref('')
  const priceMax = ref('')

  const dataList = ref<PropertyRow[]>([])
  const searching = ref(false)
  const searched = ref(false)
  const siteFilter = ref('')
  const custodyFilter = ref('')
  const categoryFilter = ref('')
  const keyword = ref('')
  const viewMode = ref<'table' | 'card'>('table')

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

  const applyKeyword = (list: PropertyRow[]) => {
    const kw = keyword.value.trim().toLowerCase()
    if (!kw) return list
    return list.filter((row) => {
      const haystack = [
        row.product_num,
        row.old_product_num,
        row.fourth_class_name,
        row.product_name,
        row.brand,
        row.standard,
        row.notes,
      ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
      return haystack.includes(kw)
    })
  }

  // 套用「放置地點／保管人／類別」篩選，可指定排除其中一個（該選單的選項清單要排除自己）
  const applyFiltersExcept = (exclude?: 'site' | 'custody' | 'category') => {
    let list = dataList.value
    if (exclude !== 'site' && siteFilter.value) {
      list = list.filter((row) => row.ps_location === siteFilter.value)
    }
    if (exclude !== 'custody' && custodyFilter.value) {
      list = list.filter((row) => row.custody === custodyFilter.value)
    }
    if (exclude !== 'category' && categoryFilter.value) {
      list = list.filter((row) => row.fourth_class_name === categoryFilter.value)
    }
    return applyKeyword(list)
  }

  const listForSiteOptions = computed(() => applyFiltersExcept('site'))
  const listForCustodyOptions = computed(() => applyFiltersExcept('custody'))
  const listForCategoryOptions = computed(() => applyFiltersExcept('category'))

  const filteredDataList = computed(() => applyFiltersExcept())

  const siteOptions = computed(() => {
    const set = new Set<string>()
    listForSiteOptions.value.forEach((row) => {
      if (row.ps_location) set.add(row.ps_location)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  })

  const custodyOptions = computed(() => {
    const map = new Map<string, string>()
    listForCustodyOptions.value.forEach((row) => {
      if (row.custody) {
        map.set(row.custody, row.employee_name ? `${row.employee_name}(${row.custody})` : row.custody)
      }
    })
    return Array.from(map.entries())
            .map(([custody, label]) => ({ custody, label }))
            .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
  })

  const categoryOptions = computed(() => {
    const set = new Set<string>()
    listForCategoryOptions.value.forEach((row) => {
      if (row.fourth_class_name) set.add(row.fourth_class_name)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  })

  // 若目前選中的放置地點／保管人／類別在其他篩選套用後已經不存在選項裡，自動清掉，避免卡在無效值
  watch(siteOptions, (opts) => {
    if (siteFilter.value && !opts.includes(siteFilter.value)) siteFilter.value = ''
  })
  watch(custodyOptions, (opts) => {
    if (custodyFilter.value && !opts.some((o) => o.custody === custodyFilter.value)) custodyFilter.value = ''
  })
  watch(categoryOptions, (opts) => {
    if (categoryFilter.value && !opts.includes(categoryFilter.value)) categoryFilter.value = ''
  })

  const formatPrice = (val: string | number | null) => {
    if (val === null || val === undefined || val === '') return ''
    const num = Number(val)
    if (Number.isNaN(num)) return ''
    return num.toLocaleString()
  }

  const loadMeta = async () => {
    metaLoading.value = true
    metaError.value = false
    try {
      const res = await $fetch<SearchMetaResponse>('/api/internal-system/property/search-meta')
      classData.value = res.data.classData
      employeeList.value = res.data.employee ?? []
      projectList.value = res.data.project ?? []
    } catch {
      metaError.value = true
    } finally {
      metaLoading.value = false
    }
  }

  const search = async () => {
    searching.value = true
    siteFilter.value = ''
    custodyFilter.value = ''
    categoryFilter.value = ''
    keyword.value = ''
    try {
      const res = await $fetch<SearchDataResponse>('/api/internal-system/property/search-data', {
        method: 'POST',
        body: {
          firstClassSelect: first.value,
          secondClassSelect: second.value,
          thirdClassSelect: third.value,
          fourthClassSelect: fourth.value,
          employeeSelect: employeeId.value,
          projectSelect: projectId.value,
          priceMin: priceMin.value,
          priceMax: priceMax.value,
        },
      })
      dataList.value = (res.data.dataList ?? []).map((row, i) => ({ ...row, __seq: i + 1 }))
      searched.value = true
    } catch {
      alert('查詢失敗，請稍後再試')
    } finally {
      searching.value = false
    }
  }

  onMounted(loadMeta)
</script>

<style scoped>
  .page { max-width: 1300px; }

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
    margin: 0 0 6px;
  }

  .page-note {
    font-size: 12px;
    color: var(--text-hint);
    margin: 0 0 14px;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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
  .filter-select:disabled { opacity: 0.5; }

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

  .site-filter-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .site-filter-row .filter-label { white-space: nowrap; }
  .site-filter-input { max-width: 260px; }
  .keyword-input { max-width: 260px; flex: 1; min-width: 200px; }

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

  .table-wrap {
    overflow-x: auto;
    transform: rotateX(180deg);
  }
  .table-wrap .data-table {
    transform: rotateX(180deg);
  }

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

  .badge-abnormal {
    display: inline-block;
    margin-left: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #e53e3e;
    color: white;
    font-size: 11px;
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

  .modal-header .card-title { margin: 0; }

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