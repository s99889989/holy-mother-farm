<script setup>
import { reactive, ref, onMounted, computed, watch, nextTick } from 'vue'

// 「銷貨單維護 - 新增/編輯」：跟訂貨單的 sales-order-form.vue 同一套架構
// （URL 帶 ?guid=xxx 是編輯，不帶是新增），細節差異、假設、風險都寫在
// sales-slip-form.get.ts／sales-slip-detail.get.ts／sales-slip.post.ts
// 開頭註解裡——**這頁比訂貨單頁多一層風險**：訂貨單那邊每一個環節都已經
// 拿使用者實測的真實 Network 記錄核對過，銷貨單這邊表頭是有拿到真實
// Edit 頁面核對過，但明細 Grid（DetailSource/DetailSave/DetailDelete）跟
// 刪除（Delete）目前是照訂貨單那邊已經驗證過的規律類推的，還沒有實測樣本
// 核對過，**上線前務必先用測試資料整套跑過一次**。
//
// 這頁只做「基本資料」分頁（場別/交貨日期/客戶/取訂貨單/送貨地址/收款方式/
// 價格稅金/備註/明細），原網站「其他款項」「宅配資料」「發票憑證」「批次
// 更新」這幾個分頁沒有做。
//
// 客戶／商品搜尋直接沿用訂貨單那幾支 API（sales-order-firms.get.ts／
// sales-order-products.get.ts／sales-order-products-info.get.ts／
// sales-order-warehouses.get.ts）——這幾支本來就是代理原網站共用的
// FirmList/ProdList/WarehouseAjax，不是訂貨單專屬的，銷貨單也能直接用。
//
// 列印：跟列表頁（sales-slips.vue）批次列印同一套 API（sales-slip-print-
// styles.get.ts／sales-slip-print.post.ts），差別只在這裡永遠只送這一張
// 銷貨單自己的 guid（等同列表頁只勾一張再列印），新增中（isNew）尚未存檔
// 沒有 guid，不顯示列印按鈕。
definePageMeta({
  layout: 'staff',
  requiredPermission: 'order.dc-erp'
})

const route = useRoute()
const guid = computed(() => (route.query.guid ? String(route.query.guid) : ''))
const isNew = computed(() => !guid.value)

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const breadcrumb = ref([])

const header = reactive({
  code: '',
  workPlaceID: '0',
  primaryDate: '',
  firmID: '0',
  firmCode: '',
  firmName: '',
  relationCode: '',
  type: '1',
  address: '',
  payWay: '1',
  taxInputType: '1',
  remark: '',
  operatorID: '',
  operatorCode: '',
  operatorName: '',
  signState: ''
})

const options = reactive({
  workPlace: [],
  type: [],
  payWay: [],
  taxInputType: [],
  taxType: []
})

const warehouseOptions = ref([])
const details = ref([])
const deletedGuids = ref([])
let tempIdSeed = 0

async function loadHeader() {
  const data = await $fetch('/api/dc-erp/sales-slip-form', { query: guid.value ? { guid: guid.value } : {} })
  Object.assign(header, {
    code: data.header.code,
    workPlaceID: data.header.workPlaceID || '0',
    primaryDate: data.header.primaryDate,
    firmID: data.header.firmID || '0',
    firmCode: data.header.firmCode,
    firmName: data.header.firmName,
    relationCode: data.header.relationCode,
    type: data.header.type || '1',
    address: data.header.address,
    payWay: data.header.payWay || '1',
    taxInputType: data.header.taxInputType || '1',
    remark: data.header.remark,
    operatorID: data.header.operatorID,
    operatorCode: data.header.operatorCode,
    operatorName: data.header.operatorName,
    signState: data.header.signState
  })
  options.workPlace = data.header.workPlaceOptions
  options.type = data.header.typeOptions
  options.payWay = data.header.payWayOptions
  options.taxInputType = data.header.taxInputTypeOptions
  options.taxType = data.taxTypeOptions
  breadcrumb.value = data.breadcrumb
  firmCodeInput.value = header.firmCode
}

async function loadDetails() {
  if (isNew.value) {
    details.value = []
    return
  }
  const data = await $fetch('/api/dc-erp/sales-slip-detail', { query: { purchaseid: guid.value } })
  details.value = data.items.map((it) => ({
    tempId: `t${tempIdSeed++}`,
    guid: it.guid && it.guid !== '00000000-0000-0000-0000-000000000000' ? it.guid : '',
    productID: it.productID,
    productCode: it.productCode,
    productName: it.productName,
    productSpecificationID: it.productSpecificationID,
    productSpecificationCode: it.productSpecificationCode,
    correspondNoID: it.correspondNoID,
    correspondNoCode: it.correspondNoCode,
    specificationUnitID: it.specificationUnitID,
    specificationUnitCode: it.specificationUnitCode,
    specificationUnitName: it.specificationUnitName,
    warehouseID: it.warehouseID,
    warehouseCode: it.warehouseCode,
    warehouseName: it.warehouseName,
    productLevel: it.productLevel,
    originalNum: it.originalNum,
    price: it.price,
    weight: it.weight,
    taxType: it.taxType,
    remark: it.remark
  }))
}

async function loadWarehouses() {
  if (!header.workPlaceID || header.workPlaceID === '0') {
    warehouseOptions.value = []
    return
  }
  try {
    const data = await $fetch('/api/dc-erp/sales-order-warehouses', { query: { workPlaceId: header.workPlaceID } })
    warehouseOptions.value = data.items
  } catch {
    warehouseOptions.value = []
  }
}

async function init() {
  loading.value = true
  errorMessage.value = ''
  try {
    await loadHeader()
    // 新增銷貨單時，如果還沒選客戶，自動帶入這台瀏覽器上一次選過的客戶
    // （純前端 localStorage 記錄，見下面「客戶輸入／搜尋」區塊）。
    if (isNew.value && (!header.firmID || header.firmID === '0')) {
      const history = loadCustomerHistory()
      if (history.length) pickFirm(history[0])
    }
    await Promise.all([loadDetails(), loadWarehouses()])
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/dc-erp/login')
      return
    }
    errorMessage.value = err?.data?.statusMessage || '無法載入銷貨單資料，請稍後再試'
  } finally {
    loading.value = false
  }
}

onMounted(init)
watch(() => header.workPlaceID, loadWarehouses)

// ---------- 客戶輸入／搜尋（跟訂貨單頁同一套） ----------
const firmCodeInput = ref('')
const firmLookupState = ref('')

// 客戶選擇紀錄：純前端 localStorage 記住這台瀏覽器最近選過的客戶（代號+
// 名稱+ID，最多 10 筆，最近選的排最前面）。輸入框 focus 時顯示下拉可以
// 直接點選；新增銷貨單時如果還沒選客戶，會自動帶入最近一筆（見 init()）。
// key 跟訂貨單頁分開存，避免兩邊常用客戶不同時互相干擾。
const CUSTOMER_HISTORY_KEY = 'dc-erp-sales-slips-customer-history'
const MAX_CUSTOMER_HISTORY = 10
const customerHistory = ref([])
const showCustomerHistory = ref(false)

function loadCustomerHistory() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CUSTOMER_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCustomerHistory(list) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CUSTOMER_HISTORY_KEY, JSON.stringify(list))
  } catch {
    // 存不進去（例如無痕模式滿了）就算了，不影響選客戶本身
  }
}

function addToCustomerHistory(firm) {
  if (!firm?.id || !firm?.code) return
  const next = [
    { id: firm.id, code: firm.code, name: firm.name },
    ...customerHistory.value.filter((f) => f.id !== firm.id)
  ].slice(0, MAX_CUSTOMER_HISTORY)
  customerHistory.value = next
  saveCustomerHistory(next)
}

function onFirmCodeFocus() {
  customerHistory.value = loadCustomerHistory()
  showCustomerHistory.value = customerHistory.value.length > 0
}

function onFirmCodeBlur() {
  // 延遲關閉，讓下面選項的 click（mousedown）事件能先觸發
  setTimeout(() => { showCustomerHistory.value = false }, 150)
}

function pickFromHistory(firm) {
  pickFirm(firm)
  showCustomerHistory.value = false
}

const showFirmSearch = ref(false)
const firmKeyword = ref('')
const firmCategory = ref('不拘')
const firmCategoryOptions = ref([])
const firmResults = ref([])
const firmSearching = ref(false)
const firmSearchError = ref('')
const firmPage = ref(1)
const firmTotalPages = ref(1)

function openFirmSearch() {
  firmKeyword.value = firmCodeInput.value
  firmSearchError.value = ''
  firmResults.value = []
  firmPage.value = 1
  showFirmSearch.value = true
  searchFirms()
}

async function searchFirms(targetPage = 1) {
  firmSearching.value = true
  firmSearchError.value = ''
  try {
    const data = await $fetch('/api/dc-erp/sales-order-firms', {
      query: { keyword: firmKeyword.value, category: firmCategory.value, page: targetPage }
    })
    firmResults.value = data.items
    firmPage.value = data.page
    firmTotalPages.value = data.totalPages
    if (data.categoryOptions?.length) firmCategoryOptions.value = data.categoryOptions
  } catch (err) {
    firmSearchError.value = err?.data?.statusMessage || '客戶搜尋失敗'
  } finally {
    firmSearching.value = false
  }
}

function pickFirm(firm) {
  header.firmID = firm.id
  header.firmCode = firm.code
  header.firmName = firm.name
  firmCodeInput.value = firm.code
  firmLookupState.value = 'found'
  showFirmSearch.value = false
  addToCustomerHistory(firm)
}

async function handleFirmCodeEnter() {
  const code = firmCodeInput.value.trim()
  if (!code) return
  firmLookupState.value = 'loading'
  try {
    const data = await $fetch('/api/dc-erp/sales-order-firms', {
      query: { keyword: code, whSearch: 'Code', category: '不拘', page: 1 }
    })
    const items = data.items || []
    const exact = items.find((f) => f.code.toLowerCase() === code.toLowerCase())
    if (exact) {
      pickFirm(exact)
    } else if (items.length === 1) {
      pickFirm(items[0])
    } else if (items.length > 1) {
      firmKeyword.value = code
      firmCategory.value = '不拘'
      firmLookupState.value = ''
      showFirmSearch.value = true
      searchFirms(1)
    } else {
      header.firmID = '0'
      header.firmName = ''
      firmLookupState.value = 'notfound'
    }
  } catch {
    firmLookupState.value = 'error'
  }
}

// ---------- 商品搜尋（跟訂貨單頁同一套） ----------
const showProductSearch = ref(false)
const productFilterExpanded = ref(false) // 進階篩選（資料來源/促銷檔期/對應貨號）預設收起，規格單位/關鍵字比較常用保持展開
const productKeyword = ref('')
const productWhSearch = ref('whatever')
const productWhSearchOptions = ref([])
const productSourceType = ref('0')
const productSourceTypeOptions = ref([])
const productSche = ref('0')
const productScheOptions = ref([])
const productCorrespondNoKeyword = ref('')
const productSpecUnitKeyword = ref('')
const productFirmName = ref('')
const productResults = ref([])
const productSearching = ref(false)
const productSearchError = ref('')
const productPage = ref(1)
const productTotalPages = ref(1)
const selectedProductIds = reactive(new Set())

function openProductSearch() {
  if (!header.workPlaceID || header.workPlaceID === '0') {
    productSearchError.value = '請先選擇場別'
    showProductSearch.value = true
    return
  }
  if (!header.firmID || header.firmID === '0') {
    productSearchError.value = '請先輸入並查詢客戶'
    showProductSearch.value = true
    return
  }
  productSearchError.value = ''
  productKeyword.value = ''
  productWhSearch.value = 'whatever'
  productSourceType.value = '0'
  productSche.value = '0'
  productCorrespondNoKeyword.value = ''
  productSpecUnitKeyword.value = ''
  productResults.value = []
  selectedProductIds.clear()
  showProductSearch.value = true
  searchProducts(1)
}

async function searchProducts(targetPage = 1) {
  productSearching.value = true
  productSearchError.value = ''
  try {
    const data = await $fetch('/api/dc-erp/sales-order-products', {
      query: {
        keyword: productKeyword.value,
        whSearch: productWhSearch.value,
        sourceType: productSourceType.value,
        scheSelect: productSche.value,
        correspondNoKeyword: productCorrespondNoKeyword.value,
        specUnitKeyword: productSpecUnitKeyword.value,
        firmId: header.firmID,
        workPlaceId: header.workPlaceID,
        selectDate: header.primaryDate,
        page: targetPage
      }
    })
    productResults.value = data.items
    productPage.value = data.page
    productTotalPages.value = data.totalPages
    productFirmName.value = data.firmName
    if (data.whSearchOptions?.length) productWhSearchOptions.value = data.whSearchOptions
    if (data.sourceTypeOptions?.length) productSourceTypeOptions.value = data.sourceTypeOptions
    if (data.scheOptions?.length) productScheOptions.value = data.scheOptions
  } catch (err) {
    productSearchError.value = err?.data?.statusMessage || '商品搜尋失敗'
  } finally {
    productSearching.value = false
  }
}

function toggleProductSelect(id) {
  if (selectedProductIds.has(id)) selectedProductIds.delete(id)
  else selectedProductIds.add(id)
}

async function confirmProductSelection() {
  const ids = Array.from(selectedProductIds)
  if (!ids.length) {
    showProductSearch.value = false
    return
  }
  try {
    const data = await $fetch('/api/dc-erp/sales-order-products-info', {
      query: {
        ids: ids.join(','),
        firmId: header.firmID,
        workPlaceId: header.workPlaceID,
        selectDate: header.primaryDate
      }
    })
    for (const p of data.items) {
      details.value.push({
        tempId: `t${tempIdSeed++}`,
        guid: '',
        productID: p.productID,
        productCode: p.productCode,
        productName: p.productName,
        productSpecificationID: p.productSpecificationID,
        productSpecificationCode: p.productSpecificationCode,
        correspondNoID: p.correspondNoID,
        correspondNoCode: p.correspondNoCode,
        specificationUnitID: p.unitID,
        specificationUnitCode: p.unitCode,
        specificationUnitName: p.unitName,
        warehouseID: p.warehouseID,
        warehouseCode: p.warehouseCode,
        warehouseName: p.warehouseName,
        productLevel: '無',
        originalNum: 1,
        price: p.price,
        weight: p.weight,
        taxType: p.taxType || (options.taxType[0]?.value ?? ''),
        remark: ''
      })
    }
  } finally {
    showProductSearch.value = false
  }
}

function removeRow(row) {
  if (row.guid) deletedGuids.value.push(row.guid)
  details.value = details.value.filter((r) => r.tempId !== row.tempId)
}

// 明細排序：純畫面上調整順序，跟原網站無關（原網站明細本來就沒有順序
// 概念，儲存時是照陣列順序整批送出，所以調整順序不影響其他欄位）。
function moveRowUp(index) {
  if (index <= 0) return
  const arr = details.value
  const tmp = arr[index - 1]
  arr[index - 1] = arr[index]
  arr[index] = tmp
}

function moveRowDown(index) {
  if (index >= details.value.length - 1) return
  const arr = details.value
  const tmp = arr[index + 1]
  arr[index + 1] = arr[index]
  arr[index] = tmp
}

function onWarehouseChange(row, code) {
  const wh = warehouseOptions.value.find((w) => w.code === code)
  if (wh) {
    row.warehouseID = wh.id
    row.warehouseCode = wh.code
    row.warehouseName = wh.name
  }
}

const summation = computed(() => details.value.reduce((s, r) => s + (Number(r.originalNum) || 0) * (Number(r.price) || 0), 0))

async function handleSave() {
  errorMessage.value = ''
  if (!header.workPlaceID || header.workPlaceID === '0') {
    errorMessage.value = '請選擇場別'
    return
  }
  if (!header.firmID || header.firmID === '0') {
    errorMessage.value = '請輸入並查詢客戶'
    return
  }
  saving.value = true
  try {
    const result = await $fetch('/api/dc-erp/sales-slip', {
      method: 'POST',
      body: {
        guid: guid.value,
        ...header,
        details: details.value,
        deletedGuids: deletedGuids.value
      }
    })
    if (result.guid) {
      await navigateTo(`/staff/order/dc-erp/sales-slip-form?guid=${result.guid}`)
      await init()
    } else {
      errorMessage.value = ''
      await navigateTo('/staff/order/dc-erp/sales-slips')
    }
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || '儲存失敗，請稍後再試'
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)

async function handleDelete() {
  if (!guid.value) return
  if (!confirm(`確定要刪除銷貨單「${header.code}」嗎？此動作無法復原。`)) return
  deleting.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/dc-erp/sales-slip-delete', {
      method: 'POST',
      body: { guid: guid.value }
    })
    await navigateTo('/staff/order/dc-erp/sales-slips')
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || '刪除失敗，請稍後再試'
  } finally {
    deleting.value = false
  }
}

const signing = ref(false)

async function handleSign(action) {
  if (!guid.value) return
  const label = action === 'return' ? '簽退' : '簽核'
  if (!confirm(`確定要${label}銷貨單「${header.code}」嗎？`)) return
  signing.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/dc-erp/sales-slip-sign', {
      method: 'POST',
      body: { guids: [guid.value], action }
    })
    await init()
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || `${label}失敗，請稍後再試`
  } finally {
    signing.value = false
  }
}

// ---------- 列印：跟列表頁批次列印同一套 API，這裡固定只印這一張 ----------
const printModalOpen = ref(false)
const printLoading = ref(false)
const printError = ref('')
const printStyles = ref([])
const titleTypeOptions = ref([])
const titleType = ref('1')
const printSubmitting = ref('')
const printForm = ref(null)
const submitReportId = ref('')
const submitReportFormat = ref('')

async function openPrintModal() {
  if (!guid.value) return
  printModalOpen.value = true
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
</script>

<template>
  <div class="p-4">
    <DcErpShell>
      <div class="space-y-3 p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm font-bold text-base-c">
            {{ isNew ? '銷貨單維護 - 新增' : `銷貨單維護 - 編輯（${header.code}）` }}
            <span v-if="breadcrumb.length" class="ml-2 text-xs font-normal text-hint-c">
              {{ breadcrumb.join(' >> ') }}
            </span>
          </div>
          <NuxtLink to="/staff/order/dc-erp/sales-slips" class="text-xs text-muted-c hover:underline">
            返回列表
          </NuxtLink>
        </div>

        <p v-if="loading" class="p-6 text-sm text-hint-c">載入中…</p>

        <template v-else>
          <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">{{ errorMessage }}</p>

          <!-- 表頭 -->
          <div class="space-y-2 rounded-xl border border-light-c bg-surface p-3 text-sm">
            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c"><span class="text-red-600">*</span>場別：</label>
              <select v-model="header.workPlaceID" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.workPlace" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>

              <label class="ml-2 text-muted-c"><span class="text-red-600">*</span>交貨日期：</label>
              <input v-model="header.primaryDate" type="text" placeholder="YYYY/MM/DD" class="w-28 rounded border border-light-c bg-surface px-2 py-1">

              <label class="ml-2 text-muted-c">單據種類：</label>
              <select v-model="header.type" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.type" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c"><span class="text-red-600">*</span>客戶：</label>
              <div class="relative flex items-center">
                <input
                  v-model="firmCodeInput"
                  type="text"
                  placeholder="輸入客戶代號後按 Enter"
                  class="w-32 rounded-l border border-r-0 border-light-c bg-surface px-2 py-1"
                  @keyup.enter="handleFirmCodeEnter"
                  @focus="onFirmCodeFocus"
                  @blur="onFirmCodeBlur"
                >
                <button
                  class="rounded-r border border-light-c bg-surface2 px-2 py-1 text-muted-c hover:bg-surface"
                  title="搜尋客戶"
                  @click="openFirmSearch"
                >
                  🔍
                </button>
                <ul
                  v-if="showCustomerHistory && customerHistory.length"
                  class="absolute top-full z-20 mt-1 max-h-48 w-56 overflow-y-auto rounded border border-light-c bg-surface text-sm shadow-lg"
                >
                  <li
                    v-for="f in customerHistory"
                    :key="f.id"
                    class="cursor-pointer truncate px-2 py-1 hover:bg-surface2"
                    @mousedown.prevent="pickFromHistory(f)"
                  >
                    {{ f.code }} {{ f.name }}
                  </li>
                </ul>
              </div>
              <span v-if="firmLookupState === 'loading'" class="text-xs text-hint-c">查詢中…</span>
              <span v-else-if="firmLookupState === 'found'" class="text-sm text-green-700">{{ header.firmName }}</span>
              <span v-else-if="firmLookupState === 'notfound'" class="text-xs text-red-600">查無此客戶代號</span>
              <span v-else-if="firmLookupState === 'error'" class="text-xs text-red-600">查詢失敗</span>

              <label class="ml-2 text-muted-c">取訂貨單：</label>
              <input v-model="header.relationCode" type="text" placeholder="訂貨單號" class="w-32 rounded border border-light-c bg-surface px-2 py-1">
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">收款方式：</label>
              <select v-model="header.payWay" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.payWay" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>

              <label class="ml-2 text-muted-c">價格稅金：</label>
              <select v-model="header.taxInputType" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.taxInputType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">送貨地址：</label>
              <input v-model="header.address" type="text" class="w-72 rounded border border-light-c bg-surface px-2 py-1">
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">備註：</label>
              <input v-model="header.remark" type="text" class="w-96 rounded border border-light-c bg-surface px-2 py-1">
            </div>

            <div class="flex flex-wrap items-center gap-2 text-xs text-hint-c">
              <span v-if="header.operatorName">經辦人員：{{ header.operatorCode }} {{ header.operatorName }}</span>
              <span v-if="header.signState" class="ml-2">簽核狀態：{{ header.signState }}</span>
            </div>
          </div>

          <!-- 明細 -->
          <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
            <div class="flex items-center justify-between border-b border-light-c px-3 py-2">
              <div class="text-sm font-bold text-base-c">明細（{{ details.length }} 筆）</div>
              <button class="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800" @click="openProductSearch">
                + 新增商品
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
                    <th class="px-2 py-2 text-center">排序</th>
                    <th class="px-2 py-2">品項代號</th>
                    <th class="px-2 py-2">品名</th>
                    <th class="px-2 py-2">單位</th>
                    <th class="px-2 py-2 text-right">數量</th>
                    <th class="px-2 py-2 text-right">單價</th>
                    <th class="px-2 py-2 text-right">小計</th>
                    <th class="px-2 py-2">倉庫</th>
                    <th class="px-2 py-2">課稅別</th>
                    <th class="px-2 py-2">備註</th>
                    <th class="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in details" :key="row.tempId" class="border-b border-light-c">
                    <td class="px-2 py-1.5">
                      <div class="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          class="rounded px-1 text-muted-c hover:bg-surface2 disabled:opacity-30"
                          title="上移"
                          :disabled="index === 0"
                          @click="moveRowUp(index)"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          class="rounded px-1 text-muted-c hover:bg-surface2 disabled:opacity-30"
                          title="下移"
                          :disabled="index === details.length - 1"
                          @click="moveRowDown(index)"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td class="px-2 py-1.5">{{ row.productCode }}</td>
                    <td class="px-2 py-1.5">{{ row.productName }}</td>
                    <td class="px-2 py-1.5">{{ row.specificationUnitName }}</td>
                    <td class="px-2 py-1.5 text-right">
                      <input v-model.number="row.originalNum" type="number" step="any" class="w-20 rounded border border-light-c bg-surface px-1 py-0.5 text-right">
                    </td>
                    <td class="px-2 py-1.5 text-right">
                      <input v-model.number="row.price" type="number" step="any" class="w-24 rounded border border-light-c bg-surface px-1 py-0.5 text-right">
                    </td>
                    <td class="px-2 py-1.5 text-right">{{ ((Number(row.originalNum) || 0) * (Number(row.price) || 0)).toLocaleString() }}</td>
                    <td class="px-2 py-1.5">
                      <select :value="row.warehouseCode" class="rounded border border-light-c bg-surface px-1 py-0.5" @change="onWarehouseChange(row, $event.target.value)">
                        <option v-if="!warehouseOptions.length" :value="row.warehouseCode">{{ row.warehouseName }}</option>
                        <option v-for="w in warehouseOptions" :key="w.code" :value="w.code">{{ w.name }}</option>
                      </select>
                    </td>
                    <td class="px-2 py-1.5">
                      <select v-model="row.taxType" class="rounded border border-light-c bg-surface px-1 py-0.5">
                        <option v-for="opt in options.taxType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </td>
                    <td class="px-2 py-1.5">
                      <input v-model="row.remark" type="text" class="w-24 rounded border border-light-c bg-surface px-1 py-0.5">
                    </td>
                    <td class="px-2 py-1.5">
                      <button class="text-xs text-red-600 hover:underline" @click="removeRow(row)">刪除</button>
                    </td>
                  </tr>
                  <tr v-if="!details.length">
                    <td colspan="11" class="px-2 py-6 text-center text-hint-c">尚無明細，請按「新增商品」</td>
                  </tr>
                </tbody>
                <tfoot v-if="details.length">
                  <tr class="border-t border-light-c bg-surface2 font-medium">
                    <td colspan="6" class="px-2 py-2 text-right text-muted-c">合計</td>
                    <td class="px-2 py-2 text-right">{{ summation.toLocaleString() }}</td>
                    <td colspan="4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <button
              v-if="!isNew"
              class="rounded-lg border border-light-c px-4 py-2 text-sm font-medium text-muted-c hover:bg-surface2"
              @click="openPrintModal"
            >
              列印
            </button>
            <button
              v-if="!isNew"
              class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              :disabled="deleting"
              @click="handleDelete"
            >
              {{ deleting ? '刪除中…' : '刪除銷貨單' }}
            </button>
            <button
              v-if="!isNew"
              class="rounded-lg border border-light-c px-4 py-2 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="signing"
              @click="handleSign('return')"
            >
              {{ signing ? '處理中…' : '簽退' }}
            </button>
            <button
              v-if="!isNew"
              class="rounded-lg border border-light-c px-4 py-2 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="signing"
              @click="handleSign('sign')"
            >
              {{ signing ? '處理中…' : '簽核' }}
            </button>
            <button
              class="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              :disabled="saving"
              @click="handleSave"
            >
              {{ saving ? '儲存中…' : '儲存' }}
            </button>
          </div>
        </template>
      </div>
    </DcErpShell>

    <!-- 客戶搜尋燈箱 -->
    <div v-if="showFirmSearch" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-surface p-4">
        <div class="mb-2 flex items-center justify-between">
          <div class="text-sm font-bold text-base-c">選擇客戶</div>
          <button class="text-xs text-muted-c hover:underline" @click="showFirmSearch = false">關閉</button>
        </div>
        <div class="mb-2 flex items-center gap-2">
          <select v-model="firmCategory" class="rounded border border-light-c bg-surface px-2 py-1 text-sm">
            <option v-if="!firmCategoryOptions.length" value="不拘">不拘</option>
            <option v-for="opt in firmCategoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <input
            v-model="firmKeyword"
            type="text"
            placeholder="客戶代號／客戶名稱／電話…"
            class="flex-1 rounded border border-light-c bg-surface px-2 py-1 text-sm"
            @keyup.enter="searchFirms(1)"
          >
          <button class="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800" @click="searchFirms(1)">查詢</button>
        </div>
        <p v-if="firmSearchError" class="mb-2 text-xs text-red-600">{{ firmSearchError }}</p>
        <div class="flex-1 overflow-y-auto rounded border border-light-c">
          <p v-if="firmSearching" class="p-4 text-sm text-hint-c">搜尋中…</p>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
                <th class="px-2 py-1.5">客戶代號</th>
                <th class="px-2 py-1.5">客戶名稱</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="f in firmResults"
                :key="f.id"
                class="cursor-pointer border-b border-light-c hover:bg-surface2"
                @click="pickFirm(f)"
              >
                <td class="px-2 py-1.5">{{ f.code }}</td>
                <td class="px-2 py-1.5">{{ f.name }}</td>
              </tr>
              <tr v-if="!firmResults.length">
                <td colspan="2" class="px-2 py-6 text-center text-hint-c">查無資料</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="firmTotalPages > 1" class="mt-2 flex items-center justify-center gap-2 text-xs text-muted-c">
          <button class="rounded border border-light-c px-2 py-1 disabled:opacity-40" :disabled="firmPage <= 1" @click="searchFirms(firmPage - 1)">上一頁</button>
          <span>第 {{ firmPage }} / {{ firmTotalPages }} 頁</span>
          <button class="rounded border border-light-c px-2 py-1 disabled:opacity-40" :disabled="firmPage >= firmTotalPages" @click="searchFirms(firmPage + 1)">下一頁</button>
        </div>
      </div>
    </div>

    <!-- 商品搜尋燈箱 -->
    <div v-if="showProductSearch" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-surface p-4">
        <div class="mb-2 flex items-center justify-between">
          <div class="text-sm font-bold text-base-c">
            選擇商品
            <span v-if="productFirmName" class="ml-2 text-xs font-normal text-hint-c">{{ productFirmName }}</span>
          </div>
          <button class="text-xs text-muted-c hover:underline" @click="showProductSearch = false">關閉</button>
        </div>

        <div class="mb-2 space-y-2 rounded-lg border border-light-c bg-surface2 p-2 text-sm">
          <div class="flex flex-wrap items-center gap-2">
            <DcErpSavedRecordsInput
              v-model="productKeyword"
              storage-key="dc-erp-product-search-keyword-records"
              record-label="已儲存的關鍵字"
              placeholder="關鍵字"
              width-class="w-40"
              @enter="searchProducts(1)"
            />

            <label class="ml-2 text-muted-c">規格單位：</label>
            <DcErpSavedRecordsInput
              v-model="productSpecUnitKeyword"
              storage-key="dc-erp-product-search-specunit-records"
              record-label="已儲存的規格單位"
              width-class="w-20"
              @enter="searchProducts(1)"
            />

            <button class="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800" @click="searchProducts(1)">送出查詢</button>
            <button
              class="ml-auto rounded border border-light-c px-2 py-1 text-xs text-muted-c hover:bg-surface"
              @click="productFilterExpanded = !productFilterExpanded"
            >
              {{ productFilterExpanded ? '收起進階篩選 ▲' : '進階篩選 ▼' }}
            </button>
          </div>

          <div v-show="productFilterExpanded" class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依欄位：</label>
            <select v-model="productWhSearch" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-if="!productWhSearchOptions.length" value="whatever">欄位不拘</option>
              <option v-for="opt in productWhSearchOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">資料來源：</label>
            <select v-model="productSourceType" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-if="!productSourceTypeOptions.length" value="0">所有商品規格</option>
              <option v-for="opt in productSourceTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">促銷檔期：</label>
            <select v-model="productSche" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-if="!productScheOptions.length" value="0">不拘</option>
              <option v-for="opt in productScheOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">對應貨號：</label>
            <input v-model="productCorrespondNoKeyword" type="text" class="w-24 rounded border border-light-c bg-surface px-2 py-1">
          </div>
        </div>

        <p v-if="productSearchError" class="mb-2 text-xs text-red-600">{{ productSearchError }}</p>
        <div class="flex-1 overflow-y-auto rounded border border-light-c">
          <p v-if="productSearching" class="p-4 text-sm text-hint-c">搜尋中…</p>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
                <th class="px-2 py-1.5"></th>
                <th class="px-2 py-1.5">品項代號</th>
                <th class="px-2 py-1.5">品項名稱</th>
                <th class="px-2 py-1.5">商品代號</th>
                <th class="px-2 py-1.5">規格單位</th>
                <th class="px-2 py-1.5 text-right">重量</th>
                <th class="px-2 py-1.5 text-right">商品價格</th>
                <th class="px-2 py-1.5">對應貨號</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in productResults"
                :key="p.id"
                class="cursor-pointer border-b border-light-c hover:bg-surface2"
                @click="toggleProductSelect(p.id)"
              >
                <td class="px-2 py-1.5"><input type="checkbox" :checked="selectedProductIds.has(p.id)" @click.stop="toggleProductSelect(p.id)"></td>
                <td class="px-2 py-1.5">{{ p.code }}</td>
                <td class="px-2 py-1.5">{{ p.name }}</td>
                <td class="px-2 py-1.5">{{ p.prodCode }}</td>
                <td class="px-2 py-1.5">{{ p.unit }}</td>
                <td class="px-2 py-1.5 text-right">{{ p.weight }}</td>
                <td class="px-2 py-1.5 text-right">{{ p.price }}</td>
                <td class="px-2 py-1.5">{{ p.correspondNo }}</td>
              </tr>
              <tr v-if="!productResults.length">
                <td colspan="8" class="px-2 py-6 text-center text-hint-c">查無資料</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <div v-if="productTotalPages > 1" class="flex items-center gap-2 text-xs text-muted-c">
            <button class="rounded border border-light-c px-2 py-1 disabled:opacity-40" :disabled="productPage <= 1" @click="searchProducts(productPage - 1)">上一頁</button>
            <span>第 {{ productPage }} / {{ productTotalPages }} 頁</span>
            <button class="rounded border border-light-c px-2 py-1 disabled:opacity-40" :disabled="productPage >= productTotalPages" @click="searchProducts(productPage + 1)">下一頁</button>
          </div>
          <div v-else></div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-hint-c">已選 {{ selectedProductIds.size }} 項</span>
            <button class="rounded bg-green-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-800" @click="confirmProductSelection">
              確認選取
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 列印燈箱：跟列表頁批次列印同一套 API，這裡固定只印本張銷貨單 -->
    <div
      v-if="printModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closePrintModal"
    >
      <div class="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-sm font-bold text-base-c">選擇列印樣式（{{ header.code }}）</div>
          <button class="text-hint-c hover:text-base-c" @click="closePrintModal">✕</button>
        </div>

        <div v-if="titleTypeOptions.length" class="mb-3 flex items-center gap-2 text-sm">
          <label class="text-muted-c">表頭：</label>
          <select v-model="titleType" class="rounded border border-light-c bg-surface px-2 py-1">
            <option v-for="opt in titleTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <p v-if="printLoading" class="p-6 text-sm text-hint-c">載入中…</p>
        <p v-else-if="printError" class="p-6 text-sm text-red-600">{{ printError }}</p>
        <table v-else class="w-full text-sm">
          <tbody>
            <tr v-for="style in printStyles" :key="style.name" class="border-b border-light-c last:border-b-0">
              <td class="px-2 py-2">{{ style.name }}</td>
              <td class="px-2 py-2 text-right">
                <button
                  v-for="fmt in style.formats"
                  :key="`${fmt.reportId}-${fmt.format}`"
                  class="ml-2 rounded border border-light-c px-3 py-1 text-xs font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
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

        <p class="mt-3 text-xs text-hint-c">
          按下樣式對應的按鈕會在新分頁開啟報表（依原網站回應而定，可能是檔案下載，或報表檢視器頁面）。
        </p>
      </div>
    </div>

    <!-- 真正送出列印請求的表單：比照列表頁批次列印，POST 到伺服器端代理，
         瀏覽器原生送出、開新分頁，session 由 httpOnly cookie 自動帶上。
         這裡固定只帶這一張銷貨單自己的 guid。 -->
    <form ref="printForm" method="post" action="/api/dc-erp/sales-slip-print" target="_blank" class="hidden">
      <input type="hidden" name="guids" :value="guid">
      <input type="hidden" name="reportId" :value="submitReportId">
      <input type="hidden" name="reportFormat" :value="submitReportFormat">
      <input type="hidden" name="titleType" :value="titleType">
    </form>
  </div>
</template>
