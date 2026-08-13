<script setup>
import { reactive, ref, onMounted } from 'vue'

// 「銷貨單維護」自己重畫的畫面，跟訂貨單維護同一套做法。
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

const items = ref([])
const totalCount = ref(0)
const totalPages = ref(1)
const page = ref(1)
const pagesize = ref(10)
const breadcrumb = ref([])
const createUrl = ref('')
const loading = ref(true)
const errorMessage = ref('')

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
            銷貨單維護
            <span v-if="breadcrumb.length" class="ml-2 text-xs font-normal text-hint-c">
              {{ breadcrumb.join(' >> ') }}
            </span>
          </div>
          <a
            v-if="createUrl"
            :href="createUrl"
            target="_blank"
            class="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
          >
            + 新增
          </a>
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
            <label class="text-muted-c">依日期：</label>
            <input v-model="filters.sdate" type="text" placeholder="起始日期" class="w-28 rounded border border-light-c bg-surface px-2 py-1">
            <span class="text-hint-c">-</span>
            <input v-model="filters.edate" type="text" placeholder="迄止日期" class="w-28 rounded border border-light-c bg-surface px-2 py-1">

            <label class="ml-2 text-muted-c">單據種類：</label>
            <select v-model="filters.orderType" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.orderType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">簽核狀態：</label>
            <select v-model="filters.signType" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.signType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div class="flex flex-wrap items-center gap-2">
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

          <div class="flex flex-wrap items-center gap-2">
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
                  <th class="px-2 py-2">銷貨單號</th>
                  <th class="px-2 py-2">交貨日期</th>
                  <th class="px-2 py-2">客戶名稱</th>
                  <th class="px-2 py-2 text-right">總計金額</th>
                  <th class="px-2 py-2 text-right">應收金額</th>
                  <th class="px-2 py-2">簽核狀態</th>
                  <th class="px-2 py-2">場別</th>
                  <th class="px-2 py-2">備註</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.guid" class="border-b border-light-c hover:bg-surface2">
                  <td class="px-2 py-1.5 text-center text-muted-c">{{ row.seq }}</td>
                  <td class="px-2 py-1.5">
                    <a :href="row.editUrl" target="_blank" class="text-green-700 hover:underline">{{ row.code }}</a>
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
                  <td colspan="9" class="px-2 py-6 text-center text-hint-c">查無資料</td>
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
