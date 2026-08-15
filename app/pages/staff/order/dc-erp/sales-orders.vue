<script setup>
import { reactive, ref, onMounted } from 'vue'

// 「訂貨單維護」自己重畫的第一個畫面：查詢表單 + 列表都是我們自己的
// Tailwind 樣式，資料來自 /api/dc-erp/sales-orders（伺服器解析原網站 HTML
// 轉成 JSON），不是整頁代理原網站的排版。
// 外層還是包 DcErpShell，保留 dc-erp 模組共用的頂部選單／側邊欄可以切換到
// 其他還沒重畫的畫面（那些畫面繼續走 page.get.ts 整頁代理）。
//
// 「新增」按鈕跟每列訂貨單號連結，已經改連到自己重畫的 sales-order-form.vue
// （見該頁開頭註解），不再走 page.get.ts 整頁代理。
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
  signState: '-1',
  orderType: '-1',
  receivingState: '-1',
  sdate2: '',
  edate2: '',
  scode: '',
  ecode: '',
  firmCode: ''
})

const filterOptions = reactive({
  workPlace: [],
  whSearchField: [],
  signState: [],
  orderType: [],
  receivingState: []
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

async function load(targetPage = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch('/api/dc-erp/sales-orders', {
      query: {
        page: targetPage,
        pagesize: pagesize.value,
        workPlace: filters.workPlace,
        whSearch: filters.whSearch,
        keyword: filters.keyword,
        sdate: filters.sdate,
        edate: filters.edate,
        signState: filters.signState,
        orderType: filters.orderType,
        receivingState: filters.receivingState,
        sdate2: filters.sdate2,
        edate2: filters.edate2,
        scode: filters.scode,
        ecode: filters.ecode,
        firmCode: filters.firmCode
      }
    })
    filterOptions.workPlace = data.filters.workPlace
    filterOptions.whSearchField = data.filters.whSearchField
    filterOptions.signState = data.filters.signState
    filterOptions.orderType = data.filters.orderType
    filterOptions.receivingState = data.filters.receivingState
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
    errorMessage.value = err?.data?.statusMessage || '無法載入訂貨單，請稍後再試'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  load(1)
}

function handleAllList() {
  Object.assign(filters, {
    workPlace: '0',
    whSearch: 'whatever',
    keyword: '',
    sdate: '',
    edate: '',
    signState: '-1',
    orderType: '-1',
    receivingState: '-1',
    sdate2: '',
    edate2: '',
    scode: '',
    ecode: '',
    firmCode: ''
  })
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

// 「簽核」／「簽退」對應原網站列表頁勾選後按右上角圖示的動作，見
// sales-order-sign.post.ts 開頭註解。多選時 Guid 用逗號分隔送出——原網站
// 多選的真實格式沒有實測樣本，如果多選簽核/簽退失敗，麻煩測一次多選後
// 告訴我，我再核對調整。
async function handleSignBatch(action) {
  const guids = Array.from(selectedGuids.value)
  if (!guids.length) return
  const label = action === 'return' ? '簽退' : '簽核'
  if (!confirm(`確定要${label}選取的 ${guids.length} 張訂貨單嗎？`)) return
  signing.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/dc-erp/sales-order-sign', {
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

const transferringGuid = ref('')

// 「轉銷」（轉入銷貨單），對應 SalesOrderModify.js 的 TransSlipClick()。
async function handleTransfer(row) {
  if (!confirm(`確定要把訂貨單「${row.code}」轉入銷貨單嗎？`)) return
  transferringGuid.value = row.guid
  errorMessage.value = ''
  try {
    await $fetch('/api/dc-erp/sales-order-trans', {
      method: 'POST',
      body: { guid: row.guid }
    })
    await load(page.value)
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || '轉入銷貨單失敗'
  } finally {
    transferringGuid.value = ''
  }
}

// 客戶名稱查詢紀錄用的 key 跟 DcErpKeywordSearchInput 內部存的格式一樣
// （純字串陣列，最新一筆在最前面），這裡直接讀同一把 key，讓頁面一開啟
// 就自動帶入上次查詢過的客戶名稱，不用使用者自己再打一次。
const CUSTOMER_NAME_HISTORY_KEY = 'dc-erp-sales-orders-customer-name-history'
function loadLastCustomerName() {
  if (typeof window === 'undefined') return ''
  try {
    const raw = window.localStorage.getItem(CUSTOMER_NAME_HISTORY_KEY)
    const list = raw ? JSON.parse(raw) : []
    return list[0] || ''
  } catch {
    return ''
  }
}

// 「顯示方式（列表/卡片）」跟「每頁筆數」統一在「設定」頁調整（見
// settings.vue），這裡只在載入時讀取，畫面上不再有切換鈕。
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

onMounted(() => {
  const listSettings = loadListSettings('salesOrders', { pagesize: pagesize.value, viewMode: viewMode.value })
  pagesize.value = listSettings.pagesize
  viewMode.value = listSettings.viewMode
  filters.firmCode = loadLastCustomerName()
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
            <label class="text-muted-c">客戶名稱：</label>
            <DcErpKeywordSearchInput
              v-model="filters.firmCode"
              storage-key="dc-erp-sales-orders-customer-name-history"
              placeholder="客戶名稱"
              @enter="handleSearch"
            />

            <DcErpKeywordSearchInput
              v-model="filters.keyword"
              storage-key="dc-erp-sales-orders-keyword-history"
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

            <label class="ml-2 text-muted-c">依欄位：</label>
            <select v-model="filters.whSearch" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.whSearchField" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div v-show="filterExpanded" class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依訂貨日：</label>
            <DcErpRocDateInput v-model="filters.sdate" placeholder="起始日期" />
            <span class="text-hint-c">-</span>
            <DcErpRocDateInput v-model="filters.edate" placeholder="迄止日期" />

            <label class="ml-2 text-muted-c">簽核狀態：</label>
            <select v-model="filters.signState" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.signState" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">單據種類：</label>
            <select v-model="filters.orderType" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.orderType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">訂單狀態：</label>
            <select v-model="filters.receivingState" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.receivingState" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div v-show="filterExpanded" class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依交貨日：</label>
            <DcErpRocDateInput v-model="filters.sdate2" placeholder="起始日期" />
            <span class="text-hint-c">-</span>
            <DcErpRocDateInput v-model="filters.edate2" placeholder="迄止日期" />

            <label class="ml-2 text-muted-c">依單號：</label>
            <input v-model="filters.scode" type="text" placeholder="起始單號" class="w-24 rounded border border-light-c bg-surface px-2 py-1">
            <span class="text-hint-c">-</span>
            <input v-model="filters.ecode" type="text" placeholder="迄止單號" class="w-24 rounded border border-light-c bg-surface px-2 py-1">
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 border-t border-light-c pt-2">
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
            <NuxtLink
              v-if="createUrl"
              :to="createUrl"
              class="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800"
            >
              + 新增
            </NuxtLink>
          </div>
        </div>

        <!-- 列表 -->
        <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
          <p v-if="loading" class="p-6 text-base text-hint-c">載入中…</p>
          <p v-else-if="errorMessage" class="p-6 text-base text-red-600">{{ errorMessage }}</p>

          <!-- 卡片檢視 -->
          <div v-else-if="viewMode === 'card'" class="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="row in items"
              :key="row.guid"
              class="rounded-lg border border-light-c p-3 text-base hover:bg-surface2"
            >
              <div class="mb-1 flex items-start justify-between gap-2">
                <input type="checkbox" :checked="selectedGuids.has(row.guid)" @change="toggleSelect(row.guid)">
                <DcErpItemsTooltip :guid="row.guid" api-path="/api/dc-erp/sales-order-detail">
                  <NuxtLink
                    :to="`/staff/order/dc-erp/sales-order-form?guid=${row.guid}`"
                    class="flex-1 font-medium text-green-700 hover:underline"
                  >
                    {{ row.code }}
                  </NuxtLink>
                </DcErpItemsTooltip>
                <span class="shrink-0 text-sm text-hint-c">#{{ row.seq }}</span>
              </div>
              <div class="text-sm text-muted-c">{{ row.workPlace }}｜{{ row.firmName }}</div>
              <div class="mt-1 flex items-center justify-between text-sm text-muted-c">
                <span>訂貨 {{ row.orderDate }} → 交貨 {{ row.deliveryDate }}</span>
                <span class="font-medium text-base-c">{{ row.total }}</span>
              </div>
              <div class="mt-1.5 flex flex-wrap items-center gap-1 text-sm">
                <span class="rounded bg-surface2 px-1.5 py-0.5 text-muted-c">{{ row.receivingState }}</span>
                <span class="rounded bg-surface2 px-1.5 py-0.5 text-muted-c">{{ row.signState }}</span>
                <button
                  v-if="row.canTransfer"
                  class="rounded border border-light-c px-1.5 py-0.5 text-muted-c hover:bg-surface2 disabled:opacity-50"
                  :disabled="transferringGuid === row.guid"
                  @click="handleTransfer(row)"
                >
                  {{ transferringGuid === row.guid ? '轉入中…' : '轉銷' }}
                </button>
              </div>
              <div v-if="row.remark" class="mt-1.5 truncate text-sm text-hint-c" :title="row.remark">{{ row.remark }}</div>
            </div>
            <p v-if="!items.length" class="col-span-full py-6 text-center text-hint-c">查無資料</p>
          </div>

          <!-- 列表檢視 -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-base">
              <thead>
                <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
                  <th class="px-2 py-2 text-center">
                    <input type="checkbox" @change="toggleSelectAll($event.target.checked)">
                  </th>
                  <th class="px-2 py-2 text-center">項次</th>
                  <th class="px-2 py-2">訂貨單號</th>
                  <th class="px-2 py-2 text-center">訂貨日期</th>
                  <th class="px-2 py-2 text-center">交貨日期</th>
                  <th class="px-2 py-2">場別</th>
                  <th class="px-2 py-2">客戶名稱</th>
                  <th class="px-2 py-2 text-center">訂單狀態</th>
                  <th class="px-2 py-2 text-center">簽核狀態</th>
                  <th class="px-2 py-2 text-center">轉銷</th>
                  <th class="px-2 py-2 text-right">總計金額</th>
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
                    <DcErpItemsTooltip :guid="row.guid" api-path="/api/dc-erp/sales-order-detail">
                      <NuxtLink :to="`/staff/order/dc-erp/sales-order-form?guid=${row.guid}`" class="text-green-700 hover:underline">{{ row.code }}</NuxtLink>
                    </DcErpItemsTooltip>
                  </td>
                  <td class="px-2 py-1.5 text-center">{{ row.orderDate }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.deliveryDate }}</td>
                  <td class="px-2 py-1.5">{{ row.workPlace }}</td>
                  <td class="px-2 py-1.5">{{ row.firmName }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.receivingState }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.signState }}</td>
                  <td class="px-2 py-1.5 text-center">
                    <button
                      v-if="row.canTransfer"
                      class="rounded border border-light-c px-2 py-0.5 text-sm text-muted-c hover:bg-surface2 disabled:opacity-50"
                      :disabled="transferringGuid === row.guid"
                      @click="handleTransfer(row)"
                    >
                      {{ transferringGuid === row.guid ? '轉入中…' : '轉銷' }}
                    </button>
                  </td>
                  <td class="px-2 py-1.5 text-right">{{ row.total }}</td>
                  <td class="px-2 py-1.5">{{ row.remark }}</td>
                </tr>
                <tr v-if="!items.length">
                  <td colspan="12" class="px-2 py-6 text-center text-hint-c">查無資料</td>
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
  </div>
</template>
