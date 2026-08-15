<script setup>
import { reactive, ref, onMounted } from 'vue'

// 「品項資料管理」列表頁（原網站 /COAERP/Prod/index），跟訂貨單/銷貨單
// 列表同一套做法。目前只做查詢（依欄位/關鍵字/是否停用）+ 分頁 + 連結到
// 檢視頁，沒有「依所屬類別」篩選、批次刪除、批次列印——這幾個原網站有
// 的功能目前先跳過，原因見 products.get.ts 開頭註解。
//
// 關鍵字欄位跟訂貨單/銷貨單列表一樣換成共用元件 DcErpKeywordSearchInput（純
// 前端 localStorage 記住最近搜尋過的關鍵字）。這頁查詢表單本來就只有一排
// （沒有像訂貨單/銷貨單那樣還有第二三排進階條件），所以沒有加「收縮／
// 更多條件」的展開按鈕；也沒有日期欄位，DcErpRocDateInput 用不到。
definePageMeta({
  layout: 'staff',
  requiredPermission: 'order.dc-erp'
})

const filters = reactive({
  whSearch: 'whatever',
  keyword: '',
  selectDisable: 'whatever'
})

const filterOptions = reactive({
  whSearchField: [],
  selectDisable: []
})

const viewMode = ref('table') // 'table' | 'card'

const items = ref([])
const totalCount = ref(0)
const totalPages = ref(1)
const page = ref(1)
const pagesize = ref(20)
const breadcrumb = ref([])
const loading = ref(true)
const errorMessage = ref('')

async function load(targetPage = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch('/api/dc-erp/products', {
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
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/dc-erp/login')
      return
    }
    errorMessage.value = err?.data?.statusMessage || '無法載入品項資料，請稍後再試'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  load(1)
}

function handleAllList() {
  Object.assign(filters, { whSearch: 'whatever', keyword: '', selectDisable: 'whatever' })
  load(1)
}

function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  load(p)
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
  const listSettings = loadListSettings('products', { pagesize: pagesize.value, viewMode: viewMode.value })
  pagesize.value = listSettings.pagesize
  viewMode.value = listSettings.viewMode
  load(1)
})
</script>

<template>
  <div class="p-4">
    <DcErpShell>
      <div class="space-y-3 p-4">
        <!-- 查詢表單 -->
        <div class="space-y-2 rounded-xl border border-light-c bg-surface p-3 text-base">
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依欄位：</label>
            <select v-model="filters.whSearch" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.whSearchField" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <DcErpKeywordSearchInput
              v-model="filters.keyword"
              storage-key="dc-erp-products-keyword-history"
              placeholder="關鍵字"
              width-class="w-48"
              @enter="handleSearch"
            />

            <label class="ml-2 text-muted-c">依是否停用：</label>
            <select v-model="filters.selectDisable" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.selectDisable" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <button class="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-800" @click="handleSearch">送出查詢</button>
            <button class="rounded border border-light-c px-3 py-1 text-muted-c hover:bg-surface2" @click="handleAllList">列出全部</button>
          </div>
          <p class="text-sm text-hint-c">
            「依所屬類別」篩選目前尚未實作（原網站是動態連動下拉，需要真實 Network 記錄才能核對）。
          </p>
        </div>

        <!-- 列表 -->
        <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
          <p v-if="loading" class="p-6 text-base text-hint-c">載入中…</p>
          <p v-else-if="errorMessage" class="p-6 text-base text-red-600">{{ errorMessage }}</p>

          <!-- 卡片檢視 -->
          <div v-else-if="viewMode === 'card'" class="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
              v-for="row in items"
              :key="row.id"
              class="rounded-lg border border-light-c p-3 text-base hover:bg-surface2"
            >
              <div class="mb-1 flex items-center justify-between gap-2">
                <NuxtLink v-if="row.editUrl" :to="row.editUrl" class="font-medium text-green-700 hover:underline">{{ row.code }}</NuxtLink>
                <span v-else class="font-medium">{{ row.code }}</span>
                <span class="shrink-0 text-sm text-hint-c">#{{ row.seq }}</span>
              </div>
              <div>{{ row.name }}</div>
              <div class="mt-1 text-sm text-muted-c">{{ row.unitName }}｜保存 {{ row.saveDays }} 天</div>
              <div v-if="row.productClass" class="mt-1 text-sm text-muted-c">{{ row.productClass }}</div>
              <div class="mt-1.5 flex items-center gap-1 text-sm">
                <span
                  class="rounded px-1.5 py-0.5"
                  :class="row.isDisable === '是' ? 'bg-red-50 text-red-600' : 'bg-surface2 text-muted-c'"
                >
                  {{ row.isDisable === '是' ? '停用' : '啟用' }}
                </span>
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
                  <th class="px-2 py-2 text-center">項次</th>
                  <th class="px-2 py-2">品項代號</th>
                  <th class="px-2 py-2">品項名稱</th>
                  <th class="px-2 py-2">基本單位</th>
                  <th class="px-2 py-2 text-center">保存天數</th>
                  <th class="px-2 py-2">備註</th>
                  <th class="px-2 py-2">所屬類別</th>
                  <th class="px-2 py-2 text-center">停用</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.id" class="border-b border-light-c hover:bg-surface2">
                  <td class="px-2 py-1.5 text-center text-muted-c">{{ row.seq }}</td>
                  <td class="px-2 py-1.5">
                    <NuxtLink v-if="row.editUrl" :to="row.editUrl" class="text-green-700 hover:underline">{{ row.code }}</NuxtLink>
                    <span v-else>{{ row.code }}</span>
                  </td>
                  <td class="px-2 py-1.5">{{ row.name }}</td>
                  <td class="px-2 py-1.5">{{ row.unitName }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.saveDays }}</td>
                  <td class="px-2 py-1.5 max-w-xs truncate" :title="row.remark">{{ row.remark }}</td>
                  <td class="px-2 py-1.5">{{ row.productClass }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.isDisable }}</td>
                </tr>
                <tr v-if="!items.length">
                  <td colspan="8" class="px-2 py-6 text-center text-hint-c">查無資料</td>
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
