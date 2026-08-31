<script setup>
  import { reactive, ref, computed, nextTick, onMounted } from 'vue'

  // 「銷貨單維護」自己重畫的畫面，跟訂貨單維護同一套做法。
  //
  // 查詢表單預設收起來只顯示第一排（filterExpanded），日期欄位用共用元件
  // DcErpRocDateInput（文字手打民國年格式 + 日曆圖示選日期），關鍵字欄位用
  // 共用元件 DcErpKeywordSearchInput（純前端 localStorage 記住最近搜尋過的
  // 關鍵字）。元件檔名要用 DcErp 開頭——Nuxt 的元件自動註冊在檔名已經是
  // 資料夾名稱（dc-erp → DcErp）開頭時才會省略前綴，不然要用
  // <DcErpXxx> 這種帶前綴的標籤才 resolve 得到，用短名字會直接不渲染。
  definePageMeta({
    layout: 'staff',
    requiredPermission: 'order.dc-erp'
  })

  const filters = reactive({
    workPlace: '0',
    whSearch: 'whatever',
    keyword: '',
    sdate: '',
    edate: '',
    orderType: '-1',
    signType: '-1',
    scode: '',
    ecode: '',
    temperature: '-1',
    firmCode: '',
    parentFirm: '0',
    customerCategory: '不拘',
    invoiceCode: '',
    isCreateInvoice: '0',
    isPrintReceipt: '0'
  })

  const filterOptions = reactive({
    workPlace: [],
    whSearchField: [],
    orderType: [],
    signType: [],
    temperature: [],
    parentFirm: [],
    customerCategory: [],
    isCreateInvoice: [],
    isPrintReceipt: []
  })

  const filterExpanded = ref(false)
  const viewMode = ref('table') // 'table' | 'card'

  const items = ref([])
  const totalCount = ref(0)
  const totalPages = ref(1)
  const page = ref(1)
  const pagesize = ref(20)
  const breadcrumb = ref([])
  const createUrl = ref('')
  const loading = ref(true)
  const errorMessage = ref('')
  const selectedGuids = ref(new Set())
  const signing = ref(false)

  // 「列印」燈箱：比照原網站 ReportPrint/SelectListReportBySalesSlip 選樣式，
  // 固定用「依選取結果」（即目前列表頁已勾選的訂單），不做「依查詢結果」。
  const printModalOpen = ref(false)
  const printLoading = ref(false)
  const printError = ref('')
  const printStyles = ref([])
  const titleTypeOptions = ref([])
  const titleType = ref('1')
  const printSubmitting = ref('')
  const printForm = ref(null)
  const submitGuids = ref('')
  const submitReportId = ref('')
  const submitReportFormat = ref('')

  // 「顯示銷貨單(中一刀-半長)」是最常用的樣式，常駐顯示；其餘樣式收進
  // 「更多樣式」收合區塊，避免每次列印都要在一長串樣式清單裡找。用
  // includes 比對而不是完全比對，避免原網站樣式名稱多一個空格/全形符號
  // 就整個匹配不到。
  const COMMON_PRINT_STYLE_MATCH = (name) => name.includes('中一刀') && name.includes('半長')
  const commonPrintStyles = computed(() => printStyles.value.filter(s => COMMON_PRINT_STYLE_MATCH(s.name)))
  const otherPrintStyles = computed(() => printStyles.value.filter(s => !COMMON_PRINT_STYLE_MATCH(s.name)))
  const printStylesExpanded = ref(false)

  async function load(targetPage = 1) {
    loading.value = true
    errorMessage.value = ''
    try {
      const data = await $fetch('/api/dc-erp/sales-slips', {
        query: {
          page: targetPage,
          pagesize: pagesize.value,
          ...filters
        }
      })
      Object.assign(filterOptions, data.filters)
      items.value = data.items
      totalCount.value = data.totalCount
      totalPages.value = data.totalPages
      page.value = data.page
      pagesize.value = data.pagesize
      breadcrumb.value = data.breadcrumb
      createUrl.value = data.createUrl
    } catch (err) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        await navigateTo('/staff/order/dc-erp/login')
        return
      }
      errorMessage.value = err?.data?.statusMessage || '無法載入銷貨單，請稍後再試'
    } finally {
      loading.value = false
    }
  }

  function handleSearch() {
    saveListSettings('salesSlips', { whSearch: filters.whSearch, keyword: filters.keyword })
    load(1)
  }

  function handleAllList() {
    Object.assign(filters, {
      workPlace: '0',
      whSearch: 'whatever',
      keyword: '',
      sdate: '',
      edate: '',
      orderType: '-1',
      signType: '-1',
      scode: '',
      ecode: '',
      temperature: '-1',
      firmCode: '',
      parentFirm: '0',
      customerCategory: '不拘',
      invoiceCode: '',
      isCreateInvoice: '0',
      isPrintReceipt: '0'
    })
    saveListSettings('salesSlips', { whSearch: filters.whSearch, keyword: filters.keyword })
    load(1)
  }

  function goPage(p) {
    if (p < 1 || p > totalPages.value) return
    selectedGuids.value.clear()
    load(p)
  }

  function toggleSelect(guid) {
    if (selectedGuids.value.has(guid)) selectedGuids.value.delete(guid)
    else selectedGuids.value.add(guid)
  }

  function toggleSelectAll(checked) {
    if (checked) items.value.forEach((row) => selectedGuids.value.add(row.guid))
    else selectedGuids.value.clear()
  }

  async function handleSignBatch(action) {
    const guids = Array.from(selectedGuids.value)
    if (!guids.length) return
    const label = action === 'return' ? '簽退' : '簽核'
    if (!confirm(`確定要${label}選取的 ${guids.length} 張銷貨單嗎？`)) return
    signing.value = true
    errorMessage.value = ''
    try {
      await $fetch('/api/dc-erp/sales-slip-sign', {
        method: 'POST',
        body: { guids, action }
      })
      selectedGuids.value.clear()
      await load(page.value)
    } catch (err) {
      errorMessage.value = err?.data?.statusMessage || `${label}失敗，請稍後再試`
    } finally {
      signing.value = false
    }
  }

  async function openPrintModal() {
    if (!selectedGuids.value.size) return
    printModalOpen.value = true
    printStylesExpanded.value = false
    printLoading.value = true
    printError.value = ''
    try {
      const data = await $fetch('/api/dc-erp/sales-slip-print-styles')
      printStyles.value = data.styles
      titleTypeOptions.value = data.titleTypeOptions
      const selected = titleTypeOptions.value.find((opt) => opt.selected)
      titleType.value = selected ? selected.value : (titleTypeOptions.value[0]?.value || '1')
    } catch (err) {
      printError.value = err?.data?.statusMessage || '無法載入列印樣式，請稍後再試'
    } finally {
      printLoading.value = false
    }
  }

  function closePrintModal() {
    printModalOpen.value = false
  }

  function handlePrint(fmt) {
    submitGuids.value = Array.from(selectedGuids.value).join(',')
    submitReportId.value = fmt.reportId
    submitReportFormat.value = fmt.format
    printSubmitting.value = `${fmt.reportId}-${fmt.format}`
    // hidden input 是用 :value 綁定的，要等 Vue 把新值 patch 進 DOM 之後
    // 再送出表單，不然送出的還是上一次的 reportId/format。
    nextTick(() => {
      if (printForm.value?.requestSubmit) {
        printForm.value.requestSubmit()
      } else {
        printForm.value?.submit()
      }
      setTimeout(() => { printSubmitting.value = '' }, 1500)
    })
  }

  // 「顯示方式（列表/卡片）」跟「每頁筆數」統一在「設定」頁調整（見
  // settings.vue），這裡只在載入時讀取，畫面上不再有切換鈕。
  // 「依欄位」＋「關鍵字」則是這頁自己記的：使用者反應每次都要重新輸入
  // 客戶代號很麻煩，所以送出查詢/列出全部時順便存起來，下次進來頁面直接
  // 帶入上次查詢的值，不用重打。
  const LIST_SETTINGS_KEY = 'dc-erp-list-settings'
  function loadListSettings(key, defaults) {
    try {
      const raw = window.localStorage.getItem(LIST_SETTINGS_KEY)
      if (!raw) return defaults
      const all = JSON.parse(raw)
      return { ...defaults, ...(all[key] || {}) }
    } catch {
      return defaults
    }
  }
  function saveListSettings(key, patch) {
    try {
      const raw = window.localStorage.getItem(LIST_SETTINGS_KEY)
      const all = raw ? JSON.parse(raw) : {}
      all[key] = { ...(all[key] || {}), ...patch }
      window.localStorage.setItem(LIST_SETTINGS_KEY, JSON.stringify(all))
    } catch {
      // localStorage 不可用（例如無痕模式）就算了，不影響查詢功能本身
    }
  }

  onMounted(() => {
    const listSettings = loadListSettings('salesSlips', {
      pagesize: pagesize.value,
      viewMode: viewMode.value,
      whSearch: filters.whSearch,
      keyword: filters.keyword
    })
    pagesize.value = listSettings.pagesize
    viewMode.value = listSettings.viewMode
    filters.whSearch = listSettings.whSearch
    filters.keyword = listSettings.keyword
    load(1)
  })
</script>

<template>
  <div class="p-4">
    <DcErpShell>
      <div class="space-y-3 p-4">
        <!-- 查詢表單：預設只顯示第一排，其餘篩選條件收起來 -->
        <div class="space-y-2 rounded-xl border border-light-c bg-surface p-3 text-base">
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依欄位：</label>
            <select v-model="filters.whSearch" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.whSearchField" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <DcErpKeywordSearchInput
              v-model="filters.keyword"
              storage-key="dc-erp-sales-slips-keyword-history"
              placeholder="關鍵字"
              @enter="handleSearch"
            />

            <button class="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-800" @click="handleSearch">送出查詢</button>
            <button class="rounded border border-light-c px-3 py-1 text-muted-c hover:bg-surface2" @click="handleAllList">列出全部</button>
            <button
              class="ml-auto rounded border border-light-c px-3 py-1 text-sm text-muted-c hover:bg-surface2"
              @click="filterExpanded = !filterExpanded"
            >
              {{ filterExpanded ? '收起條件 ▲' : '更多條件 ▼' }}
            </button>
          </div>

          <div v-show="filterExpanded" class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依場別：</label>
            <select v-model="filters.workPlace" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.workPlace" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">依日期：</label>
            <DcErpRocDateInput v-model="filters.sdate" placeholder="起始日期" />
            <span class="text-hint-c">-</span>
            <DcErpRocDateInput v-model="filters.edate" placeholder="迄止日期" />

            <label class="ml-2 text-muted-c">單據種類：</label>
            <select v-model="filters.orderType" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.orderType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">簽核狀態：</label>
            <select v-model="filters.signType" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.signType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div v-show="filterExpanded" class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依單號：</label>
            <input v-model="filters.scode" type="text" placeholder="起始單號" class="w-24 rounded border border-light-c bg-surface px-2 py-1">
            <span class="text-hint-c">-</span>
            <input v-model="filters.ecode" type="text" placeholder="迄止單號" class="w-24 rounded border border-light-c bg-surface px-2 py-1">

            <label class="ml-2 text-muted-c">宅配溫層：</label>
            <select v-model="filters.temperature" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.temperature" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">依客戶：</label>
            <input v-model="filters.firmCode" type="text" placeholder="客戶代號或名稱" class="w-40 rounded border border-light-c bg-surface px-2 py-1">
          </div>

          <div v-show="filterExpanded" class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">母公司：</label>
            <select v-model="filters.parentFirm" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.parentFirm" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">客戶類別：</label>
            <select v-model="filters.customerCategory" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.customerCategory" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">依發票：</label>
            <input v-model="filters.invoiceCode" type="text" placeholder="發票號碼" class="w-32 rounded border border-light-c bg-surface px-2 py-1">

            <label class="ml-2 text-muted-c">發票開立：</label>
            <select v-model="filters.isCreateInvoice" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.isCreateInvoice" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">收據開立：</label>
            <select v-model="filters.isPrintReceipt" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.isPrintReceipt" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 border-t border-light-c pt-2">
            <button
              class="rounded-lg border border-light-c px-3 py-1.5 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="!selectedGuids.size"
              @click="openPrintModal"
            >
              列印（{{ selectedGuids.size }}）
            </button>
            <button
              class="rounded-lg border border-light-c px-3 py-1.5 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="!selectedGuids.size || signing"
              @click="handleSignBatch('return')"
            >
              {{ signing ? '處理中…' : `簽退（${selectedGuids.size}）` }}
            </button>
            <button
              class="rounded-lg border border-light-c px-3 py-1.5 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="!selectedGuids.size || signing"
              @click="handleSignBatch('sign')"
            >
              {{ signing ? '處理中…' : `簽核（${selectedGuids.size}）` }}
            </button>
          </div>
        </div>

        <!-- 列表 -->
        <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
          <p v-if="loading" class="p-6 text-base text-hint-c">載入中…</p>
          <p v-else-if="errorMessage" class="p-6 text-base text-red-600">{{ errorMessage }}</p>

          <!-- 卡片檢視：viewMode=card 時各尺寸都顯示；viewMode=table 時強制手機（<sm）顯示卡片，
               桌機（sm 以上）改顯示下方的列表檢視 -->
          <div
            v-else
            class="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3"
            :class="{ 'sm:hidden': viewMode !== 'card' }"
          >
            <div
              v-for="row in items"
              :key="row.guid"
              class="rounded-lg border border-light-c p-3 text-base hover:bg-surface2"
            >
              <div class="mb-1 flex items-start justify-between gap-2">
                <input type="checkbox" :checked="selectedGuids.has(row.guid)" @change="toggleSelect(row.guid)">
                <DcErpItemsTooltip :guid="row.guid" api-path="/api/dc-erp/sales-slip-detail">
                  <NuxtLink
                    :to="`/staff/order/dc-erp/sales-slip-form?guid=${row.guid}`"
                    class="flex-1 font-medium text-green-700 hover:underline"
                  >
                    {{ row.code }}
                  </NuxtLink>
                </DcErpItemsTooltip>
                <span class="shrink-0 text-sm text-hint-c">#{{ row.seq }}</span>
              </div>
              <div class="text-sm text-muted-c">{{ row.workPlace }}｜{{ row.firmName }}</div>
              <div class="mt-1 flex items-center justify-between text-sm text-muted-c">
                <span>交貨 {{ row.deliveryDate }}</span>
                <span class="font-medium text-base-c">{{ row.total }}（應收 {{ row.currentMoney }}）</span>
              </div>
              <div class="mt-1.5 flex flex-wrap items-center gap-1 text-sm">
                <span class="rounded bg-surface2 px-1.5 py-0.5 text-muted-c">{{ row.signState }}</span>
              </div>
              <div v-if="row.remark" class="mt-1.5 truncate text-sm text-hint-c" :title="row.remark">{{ row.remark }}</div>
            </div>
            <p v-if="!items.length" class="col-span-full py-6 text-center text-hint-c">查無資料</p>
          </div>

          <!-- 列表檢視：只在 viewMode=table 時渲染，且只在桌機（sm 以上）顯示；手機一律走上面的卡片 -->
          <div v-if="viewMode === 'table'" class="hidden overflow-x-auto sm:block">
            <table class="w-full text-base">
              <thead>
              <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
                <th class="px-2 py-2 text-center">
                  <input type="checkbox" @change="toggleSelectAll($event.target.checked)">
                </th>
                <th class="px-2 py-2 text-center">項次</th>
                <th class="px-2 py-2">銷貨單號</th>
                <th class="px-2 py-2 text-center">交貨日期</th>
                <th class="px-2 py-2">客戶名稱</th>
                <th class="px-2 py-2 text-right">總計金額</th>
                <th class="px-2 py-2 text-right">應收金額</th>
                <th class="px-2 py-2 text-center">簽核狀態</th>
                <th class="px-2 py-2">場別</th>
                <th class="px-2 py-2">備註</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="row in items" :key="row.guid" class="border-b border-light-c hover:bg-surface2">
                <td class="px-2 py-1.5 text-center">
                  <input type="checkbox" :checked="selectedGuids.has(row.guid)" @change="toggleSelect(row.guid)">
                </td>
                <td class="px-2 py-1.5 text-center text-muted-c">{{ row.seq }}</td>
                <td class="px-2 py-1.5">
                  <DcErpItemsTooltip :guid="row.guid" api-path="/api/dc-erp/sales-slip-detail">
                    <NuxtLink :to="`/staff/order/dc-erp/sales-slip-form?guid=${row.guid}`" class="text-green-700 hover:underline">{{ row.code }}</NuxtLink>
                  </DcErpItemsTooltip>
                </td>
                <td class="px-2 py-1.5 text-center">{{ row.deliveryDate }}</td>
                <td class="px-2 py-1.5">{{ row.firmName }}</td>
                <td class="px-2 py-1.5 text-right">{{ row.total }}</td>
                <td class="px-2 py-1.5 text-right">{{ row.currentMoney }}</td>
                <td class="px-2 py-1.5 text-center">{{ row.signState }}</td>
                <td class="px-2 py-1.5">{{ row.workPlace }}</td>
                <td class="px-2 py-1.5">{{ row.remark }}</td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="10" class="px-2 py-6 text-center text-hint-c">查無資料</td>
              </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-light-c px-3 py-2 text-sm text-muted-c">
            <span>總計 {{ totalCount.toLocaleString() }} 筆 / 總計 {{ totalPages.toLocaleString() }} 頁</span>
            <DcErpPagination :page="page" :total-pages="totalPages" @go="goPage" />
          </div>
        </div>
      </div>
    </DcErpShell>

    <!-- 列印燈箱：比照原網站 ReportPrint/SelectListReportBySalesSlip，
         固定「依選取結果」，列出目前已勾選的訂單可用的報表樣式。 -->
    <div
      v-if="printModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closePrintModal"
    >
      <div class="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-base font-bold text-base-c">選擇列印樣式（已選取 {{ selectedGuids.size }} 張銷貨單）</div>
          <button class="text-hint-c hover:text-base-c" @click="closePrintModal">✕</button>
        </div>

        <div v-if="titleTypeOptions.length" class="mb-3 flex items-center gap-2 text-base">
          <label class="text-muted-c">表頭：</label>
          <select v-model="titleType" class="rounded border border-light-c bg-surface px-2 py-1">
            <option v-for="opt in titleTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <p v-if="printLoading" class="p-6 text-base text-hint-c">載入中…</p>
        <p v-else-if="printError" class="p-6 text-base text-red-600">{{ printError }}</p>
        <template v-else>
          <table class="w-full text-base">
            <tbody>
            <tr v-for="style in commonPrintStyles" :key="style.name" class="border-b border-light-c last:border-b-0">
              <td class="px-2 py-2">{{ style.name }}</td>
              <td class="px-2 py-2 text-right">
                <button
                  v-for="fmt in style.formats"
                  :key="`${fmt.reportId}-${fmt.format}`"
                  class="ml-2 rounded border border-light-c px-3 py-1 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
                  :disabled="printSubmitting === `${fmt.reportId}-${fmt.format}`"
                  @click="handlePrint(fmt)"
                >
                  {{ printSubmitting === `${fmt.reportId}-${fmt.format}` ? '處理中…' : fmt.label }}
                </button>
              </td>
            </tr>
            <tr v-if="!printStyles.length">
              <td colspan="2" class="px-2 py-6 text-center text-hint-c">查無可用樣式</td>
            </tr>
            </tbody>
          </table>

          <button
            v-if="otherPrintStyles.length"
            class="mt-2 w-full rounded border border-light-c px-3 py-1.5 text-sm text-muted-c hover:bg-surface2"
            @click="printStylesExpanded = !printStylesExpanded"
          >
            {{ printStylesExpanded ? '收起其他樣式 ▲' : `其他樣式 ▼（${otherPrintStyles.length}）` }}
          </button>
          <table v-show="printStylesExpanded" class="mt-2 w-full text-base">
            <tbody>
            <tr v-for="style in otherPrintStyles" :key="style.name" class="border-b border-light-c last:border-b-0">
              <td class="px-2 py-2">{{ style.name }}</td>
              <td class="px-2 py-2 text-right">
                <button
                  v-for="fmt in style.formats"
                  :key="`${fmt.reportId}-${fmt.format}`"
                  class="ml-2 rounded border border-light-c px-3 py-1 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
                  :disabled="printSubmitting === `${fmt.reportId}-${fmt.format}`"
                  @click="handlePrint(fmt)"
                >
                  {{ printSubmitting === `${fmt.reportId}-${fmt.format}` ? '處理中…' : fmt.label }}
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </template>

        <p class="mt-3 text-sm text-hint-c">
          按下樣式對應的按鈕會在新分頁開啟報表（依原網站回應而定，可能是檔案下載，或報表檢視器頁面）。
        </p>
      </div>
    </div>

    <!-- 真正送出列印請求的表單：比照統計月報表頁面的做法，POST 到伺服器端
         代理，瀏覽器原生送出、開新分頁，session 由 httpOnly cookie 自動帶上。
         這個表單本身不顯示，只是拿來送出用。 -->
    <form ref="printForm" method="post" action="/api/dc-erp/sales-slip-print" target="_blank" class="hidden">
      <input type="hidden" name="guids" :value="submitGuids">
      <input type="hidden" name="reportId" :value="submitReportId">
      <input type="hidden" name="reportFormat" :value="submitReportFormat">
      <input type="hidden" name="titleType" :value="titleType">
    </form>
  </div>
</template>
