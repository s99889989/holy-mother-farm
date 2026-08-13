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

const items = ref([])
const totalCount = ref(0)
const totalPages = ref(1)
const page = ref(1)
const pagesize = ref(20)
const breadcrumb = ref([])
const createUrl = ref('')
const loading = ref(true)
const errorMessage = ref('')

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
  load(p)
}

onMounted(() => load(1))
</script>

<template>
  <div class="p-4">
    <DcErpShell>
      <div class="space-y-3 p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm font-bold text-base-c">
            訂貨單維護
            <span v-if="breadcrumb.length" class="ml-2 text-xs font-normal text-hint-c">
              {{ breadcrumb.join(' >> ') }}
            </span>
          </div>
          <NuxtLink
            v-if="createUrl"
            :to="createUrl"
            class="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
          >
            + 新增
          </NuxtLink>
        </div>

        <!-- 查詢表單 -->
        <div class="space-y-2 rounded-xl border border-light-c bg-surface p-3 text-sm">
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依場別：</label>
            <select v-model="filters.workPlace" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.workPlace" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">依欄位：</label>
            <select v-model="filters.whSearch" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.whSearchField" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <input
              v-model="filters.keyword"
              type="text"
              placeholder="關鍵字"
              class="w-40 rounded border border-light-c bg-surface px-2 py-1"
              @keyup.enter="handleSearch"
            >

            <button class="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-800" @click="handleSearch">送出查詢</button>
            <button class="rounded border border-light-c px-3 py-1 text-muted-c hover:bg-surface2" @click="handleAllList">列出全部</button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依訂貨日：</label>
            <input v-model="filters.sdate" type="text" placeholder="起始日期" class="w-28 rounded border border-light-c bg-surface px-2 py-1">
            <span class="text-hint-c">-</span>
            <input v-model="filters.edate" type="text" placeholder="迄止日期" class="w-28 rounded border border-light-c bg-surface px-2 py-1">

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

          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依交貨日：</label>
            <input v-model="filters.sdate2" type="text" placeholder="起始日期" class="w-28 rounded border border-light-c bg-surface px-2 py-1">
            <span class="text-hint-c">-</span>
            <input v-model="filters.edate2" type="text" placeholder="迄止日期" class="w-28 rounded border border-light-c bg-surface px-2 py-1">

            <label class="ml-2 text-muted-c">依單號：</label>
            <input v-model="filters.scode" type="text" placeholder="起始單號" class="w-24 rounded border border-light-c bg-surface px-2 py-1">
            <span class="text-hint-c">-</span>
            <input v-model="filters.ecode" type="text" placeholder="迄止單號" class="w-24 rounded border border-light-c bg-surface px-2 py-1">

            <label class="ml-2 text-muted-c">依客戶：</label>
            <input v-model="filters.firmCode" type="text" placeholder="客戶代號或名稱" class="w-44 rounded border border-light-c bg-surface px-2 py-1">
          </div>
        </div>

        <!-- 列表 -->
        <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
          <div class="overflow-x-auto">
            <p v-if="loading" class="p-6 text-sm text-hint-c">載入中…</p>
            <p v-else-if="errorMessage" class="p-6 text-sm text-red-600">{{ errorMessage }}</p>
            <table v-else class="w-full text-sm">
              <thead>
                <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
                  <th class="px-2 py-2">項次</th>
                  <th class="px-2 py-2">訂貨單號</th>
                  <th class="px-2 py-2">訂貨日期</th>
                  <th class="px-2 py-2">交貨日期</th>
                  <th class="px-2 py-2">場別</th>
                  <th class="px-2 py-2">客戶名稱</th>
                  <th class="px-2 py-2">訂單狀態</th>
                  <th class="px-2 py-2">簽核狀態</th>
                  <th class="px-2 py-2 text-right">總計金額</th>
                  <th class="px-2 py-2">採買單位</th>
                  <th class="px-2 py-2">備註</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.guid" class="border-b border-light-c hover:bg-surface2">
                  <td class="px-2 py-1.5 text-center text-muted-c">{{ row.seq }}</td>
                  <td class="px-2 py-1.5">
                    <NuxtLink :to="`/staff/order/dc-erp/sales-order-form?guid=${row.guid}`" class="text-green-700 hover:underline">{{ row.code }}</NuxtLink>
                  </td>
                  <td class="px-2 py-1.5 text-center">{{ row.orderDate }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.deliveryDate }}</td>
                  <td class="px-2 py-1.5">{{ row.workPlace }}</td>
                  <td class="px-2 py-1.5">{{ row.firmName }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.receivingState }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.signState }}</td>
                  <td class="px-2 py-1.5 text-right">{{ row.total }}</td>
                  <td class="px-2 py-1.5">{{ row.purchaseDept }}</td>
                  <td class="px-2 py-1.5">{{ row.remark }}</td>
                </tr>
                <tr v-if="!items.length">
                  <td colspan="11" class="px-2 py-6 text-center text-hint-c">查無資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-light-c px-3 py-2 text-xs text-muted-c">
            <span>總計 {{ totalCount.toLocaleString() }} 筆 / 總計 {{ totalPages.toLocaleString() }} 頁</span>
            <div class="flex items-center gap-2">
              <button
                class="rounded border border-light-c px-2 py-1 disabled:opacity-40"
                :disabled="page <= 1"
                @click="goPage(page - 1)"
              >
                上一頁
              </button>
              <span>第 {{ page }} / {{ totalPages }} 頁</span>
              <button
                class="rounded border border-light-c px-2 py-1 disabled:opacity-40"
                :disabled="page >= totalPages"
                @click="goPage(page + 1)"
              >
                下一頁
              </button>
            </div>
          </div>
        </div>
      </div>
    </DcErpShell>
  </div>
</template>
