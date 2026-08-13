<script setup>
import { reactive, ref, onMounted, nextTick } from 'vue'

// 「統計月報表」（原網站 SalesStatistics/SearchSalesStatisticsMonth）：跟
// 訂貨單／銷貨單不同，這頁本質是「產生報表檔案」而不是「瀏覽資料列表」——
// 填好篩選條件後，畫面下半部是好幾份報表（客戶別品項銷貨月統計表…等），
// 每份各有「列印」「EXCEL」兩顆按鈕，按下去會把 ReportID／FilePath／
// reportformat 塞進同一份表單再送出，開新分頁看報表或下載檔案。
//
// 這裡比照原網站的行為：畫面上放一個「真正的」<form target="_blank">，
// 篩選條件用 hidden input 同步 filters 的值；按「列印」/「EXCEL」時先把
// reportId／reportName／format 填進對應 hidden input，再呼叫
// form.requestSubmit()，讓瀏覽器原生送出 POST 到
// /api/dc-erp/sales-statistics-month（伺服器端代理，session 留在伺服器端
// 的 httpOnly cookie，瀏覽器會自動帶上，不用另外處理）。伺服器端會依原網站
// 回應的類型決定：檔案（PDF/Excel 等）直接轉送下載，HTML（報表檢視器或
// 錯誤頁）則比照 page.get.ts 改寫連結後回傳，新分頁一樣能繼續運作。
//
// SetReportID() 實際邏輯在原網站另一支 StatisticsSearch.js（目前沒有拿到
// 原始碼），採用最直接的推斷：ReportID／FilePath 就是 onclick 帶的兩個參數，
// reportformat 則是「列印」留空、「EXCEL」帶 EXCEL。如果實際送出後報表產生
// 不正確，麻煩把原網站按「列印」那筆請求的 Network Form Data 貼給我核對調整。
definePageMeta({
  layout: 'staff',
  requiredPermission: 'order.dc-erp'
})

const filters = reactive({
  startY: '',
  startM: '1',
  endM: '12',
  firmCodeS: '',
  firmCodeE: '',
  peopleKeyWord: '',
  isSupplier: false,
  isFarmer: false,
  isAssociator: false,
  workPlaceCodeS: '',
  workPlaceSelectS: '',
  workPlaceCodeE: '',
  workPlaceSelectE: '',
  prodCodeS: '',
  prodCodeE: '',
  firmType: '不拘',
  saleSlipData: true,
  saleReturnData: true
})

const filterOptions = reactive({
  startY: [],
  startM: [],
  endM: [],
  workPlaceS: [],
  workPlaceE: [],
  firmType: []
})

const reports = ref([])
const companyId = ref('')
const breadcrumb = ref([])
const loading = ref(true)
const errorMessage = ref('')
const submitting = ref('')

const reportForm = ref(null)
const submitReportId = ref('')
const submitReportName = ref('')
const submitFormat = ref('')

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch('/api/dc-erp/sales-statistics-month')
    filterOptions.startY = data.filterOptions.startY
    filterOptions.startM = data.filterOptions.startM
    filterOptions.endM = data.filterOptions.endM
    filterOptions.workPlaceS = data.filterOptions.workPlaceS
    filterOptions.workPlaceE = data.filterOptions.workPlaceE
    filterOptions.firmType = data.filterOptions.firmType
    reports.value = data.reports
    companyId.value = data.companyId
    breadcrumb.value = data.breadcrumb

    // 期間（年）預設代入原網站頁面上已經 selected 的那個選項
    const selectedYear = filterOptions.startY.find((opt) => opt.selected)
    filters.startY = selectedYear ? selectedYear.value : (filterOptions.startY[0]?.value || '')
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/dc-erp/login')
      return
    }
    errorMessage.value = err?.data?.statusMessage || '無法載入統計月報表頁面，請稍後再試'
  } finally {
    loading.value = false
  }
}

function handleGenerate(report, format) {
  submitReportId.value = report.reportId
  submitReportName.value = report.reportName
  submitFormat.value = format
  submitting.value = `${report.reportId}-${format || 'PDF'}`
  // hidden input 是用 :value 綁定的，要等 Vue 把新值 patch 進 DOM 之後
  // 再送出表單，不然送出的還是上一次的 reportId/format。
  nextTick(() => {
    if (reportForm.value?.requestSubmit) {
      reportForm.value.requestSubmit()
    } else {
      reportForm.value?.submit()
    }
    setTimeout(() => { submitting.value = '' }, 1500)
  })
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <DcErpShell>
      <div class="space-y-3 p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm font-bold text-base-c">
            統計月報表
            <span v-if="breadcrumb.length" class="ml-2 text-xs font-normal text-hint-c">
              {{ breadcrumb.join(' >> ') }}
            </span>
          </div>
        </div>

        <p v-if="loading" class="p-6 text-sm text-hint-c">載入中…</p>
        <p v-else-if="errorMessage" class="p-6 text-sm text-red-600">{{ errorMessage }}</p>

        <template v-else>
          <!-- 查詢條件 -->
          <div class="space-y-2 rounded-xl border border-light-c bg-surface p-3 text-sm">
            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c"><span class="text-red-600">*</span>期間：</label>
              <select v-model="filters.startY" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in filterOptions.startY" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <span class="text-muted-c">年</span>
              <select v-model="filters.startM" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in filterOptions.startM" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <span class="text-muted-c">月～</span>
              <select v-model="filters.endM" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in filterOptions.endM" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <span class="text-muted-c">月</span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">對象編號：</label>
              <input v-model="filters.firmCodeS" type="text" placeholder="起始對象編號" class="w-32 rounded border border-light-c bg-surface px-2 py-1">
              <span class="text-hint-c">~</span>
              <input v-model="filters.firmCodeE" type="text" placeholder="迄止對象編號" class="w-32 rounded border border-light-c bg-surface px-2 py-1">

              <label class="ml-2 text-muted-c">對象名稱：</label>
              <input v-model="filters.peopleKeyWord" type="text" placeholder="請輸入對象名稱" class="w-40 rounded border border-light-c bg-surface px-2 py-1">
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">身份：</label>
              <label class="flex items-center gap-1 text-muted-c">
                <input type="checkbox" checked disabled>客戶
              </label>
              <label class="flex items-center gap-1 text-muted-c">
                <input v-model="filters.isSupplier" type="checkbox">廠商
              </label>
              <label class="flex items-center gap-1 text-muted-c">
                <input v-model="filters.isFarmer" type="checkbox">農民
              </label>
              <label class="flex items-center gap-1 text-muted-c">
                <input v-model="filters.isAssociator" type="checkbox">社員
              </label>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">場別(起/迄)：</label>
              <input v-model="filters.workPlaceCodeS" type="text" placeholder="起始場別" class="w-28 rounded border border-light-c bg-surface px-2 py-1">
              <select v-model="filters.workPlaceSelectS" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in filterOptions.workPlaceS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <span class="text-hint-c">~</span>
              <input v-model="filters.workPlaceCodeE" type="text" placeholder="迄止場別" class="w-28 rounded border border-light-c bg-surface px-2 py-1">
              <select v-model="filters.workPlaceSelectE" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in filterOptions.workPlaceE" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">品項(起/迄)：</label>
              <input v-model="filters.prodCodeS" type="text" placeholder="起始品項" class="w-32 rounded border border-light-c bg-surface px-2 py-1">
              <span class="text-hint-c">~</span>
              <input v-model="filters.prodCodeE" type="text" placeholder="迄止品項" class="w-32 rounded border border-light-c bg-surface px-2 py-1">

              <label class="ml-2 text-muted-c">客戶類別：</label>
              <select v-model="filters.firmType" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in filterOptions.firmType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c"><span class="text-red-600">*</span>單據來源：</label>
              <label class="flex items-center gap-1 text-muted-c">
                <input v-model="filters.saleSlipData" type="checkbox">銷貨單
              </label>
              <label class="flex items-center gap-1 text-muted-c">
                <input v-model="filters.saleReturnData" type="checkbox">銷貨退回單
              </label>
            </div>
          </div>

          <!-- 報表清單 -->
          <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
            <table class="w-full text-sm">
              <tbody>
                <tr v-for="report in reports" :key="report.reportId" class="border-b border-light-c last:border-b-0">
                  <td class="px-3 py-2">{{ report.label }}</td>
                  <td class="px-3 py-2 text-right">
                    <button
                      class="mr-2 rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                      :disabled="submitting === `${report.reportId}-PDF`"
                      @click="handleGenerate(report, '')"
                    >
                      {{ submitting === `${report.reportId}-PDF` ? '產生中…' : '列印' }}
                    </button>
                    <button
                      v-if="report.hasExcel"
                      class="rounded border border-light-c px-3 py-1 text-xs font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
                      :disabled="submitting === `${report.reportId}-EXCEL`"
                      @click="handleGenerate(report, 'EXCEL')"
                    >
                      {{ submitting === `${report.reportId}-EXCEL` ? '產生中…' : 'EXCEL' }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!reports.length">
                  <td class="px-3 py-6 text-center text-hint-c">查無可用報表</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="text-xs text-hint-c">
            按下「列印」或「EXCEL」會在新分頁開啟報表（依原網站回應而定，可能是 PDF／Excel 檔案下載，或報表檢視器頁面）。
          </p>
        </template>

        <!-- 真正送出報表產生請求的表單：比照原網站，POST 到伺服器端代理，
             瀏覽器原生送出，session 由 httpOnly cookie 自動帶上，開新分頁。
             這個表單本身不顯示，只是拿來送出用。 -->
        <form ref="reportForm" method="post" action="/api/dc-erp/sales-statistics-month" target="_blank" class="hidden">
          <input type="hidden" name="companyId" :value="companyId">
          <input type="hidden" name="reportId" :value="submitReportId">
          <input type="hidden" name="reportName" :value="submitReportName">
          <input type="hidden" name="format" :value="submitFormat">
          <input type="hidden" name="startY" :value="filters.startY">
          <input type="hidden" name="startM" :value="filters.startM">
          <input type="hidden" name="endM" :value="filters.endM">
          <input type="hidden" name="firmCodeS" :value="filters.firmCodeS">
          <input type="hidden" name="firmCodeE" :value="filters.firmCodeE">
          <input type="hidden" name="peopleKeyWord" :value="filters.peopleKeyWord">
          <input type="hidden" name="isSupplier" :value="filters.isSupplier ? 'true' : 'false'">
          <input type="hidden" name="isFarmer" :value="filters.isFarmer ? 'true' : 'false'">
          <input type="hidden" name="isAssociator" :value="filters.isAssociator ? 'true' : 'false'">
          <input type="hidden" name="workPlaceCodeS" :value="filters.workPlaceCodeS">
          <input type="hidden" name="workPlaceSelectS" :value="filters.workPlaceSelectS">
          <input type="hidden" name="workPlaceCodeE" :value="filters.workPlaceCodeE">
          <input type="hidden" name="workPlaceSelectE" :value="filters.workPlaceSelectE">
          <input type="hidden" name="prodCodeS" :value="filters.prodCodeS">
          <input type="hidden" name="prodCodeE" :value="filters.prodCodeE">
          <input type="hidden" name="firmType" :value="filters.firmType">
          <input type="hidden" name="saleSlipData" :value="filters.saleSlipData ? 'true' : 'false'">
          <input type="hidden" name="saleReturnData" :value="filters.saleReturnData ? 'true' : 'false'">
        </form>
      </div>
    </DcErpShell>
  </div>
</template>
