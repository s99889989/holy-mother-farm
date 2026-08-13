<script setup>
import { reactive, ref, onMounted } from 'vue'

// 首頁：跟訂貨單維護一樣，查詢表單 + 列表都是自己的 Tailwind 樣式，資料來自
// /api/dc-erp/home（伺服器解析原網站 /COAERP/News/IndexBrowse 轉成 JSON）。
// 多一個「待簽核清單」區塊：內容是原網站現成的 HTML 字串，先用 v-html 顯示
// （裡面如果有連結，目前還沒特別重寫過，點了不會走我們的代理）。
definePageMeta({
  layout: 'staff',
  requiredPermission: 'order.dc-erp'
})

const filters = reactive({
  title: '',
  sdate: '',
  edate: '',
  includeOutdated: false
})

const items = ref([])
const totalCount = ref(0)
const totalPages = ref(1)
const page = ref(1)
const pagesize = ref(20)
const breadcrumbText = ref('')
const todoListHtml = ref('')
const harvestInfoHtml = ref('')
const loading = ref(true)
const errorMessage = ref('')

async function load(targetPage = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch('/api/dc-erp/home', {
      query: {
        page: targetPage,
        pagesize: pagesize.value,
        title: filters.title,
        sdate: filters.sdate,
        edate: filters.edate,
        includeOutdated: filters.includeOutdated ? 'true' : 'false'
      }
    })
    items.value = data.items
    totalCount.value = data.totalCount
    totalPages.value = data.totalPages
    page.value = data.page
    pagesize.value = data.pagesize
    breadcrumbText.value = data.breadcrumbText
    todoListHtml.value = data.todoListHtml
    harvestInfoHtml.value = data.harvestInfoHtml
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/dc-erp/login')
      return
    }
    errorMessage.value = err?.data?.statusMessage || '無法載入首頁資料，請稍後再試'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  load(1)
}

function handleAllList() {
  Object.assign(filters, { title: '', sdate: '', edate: '', includeOutdated: false })
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
        <div class="text-sm font-bold text-base-c">
          首頁
          <span v-if="breadcrumbText" class="ml-2 text-xs font-normal text-hint-c">{{ breadcrumbText }}</span>
        </div>

        <!-- 待簽核清單 -->
        <div class="rounded-xl border border-light-c bg-surface p-3 text-sm">
          <div class="mb-1 font-medium text-green-700">待簽核清單</div>
          <div v-if="todoListHtml" class="text-muted-c" v-html="todoListHtml" />
          <div v-else class="text-hint-c">讀取中…</div>
          <div v-if="harvestInfoHtml" class="mt-2 text-green-700" v-html="harvestInfoHtml" />
        </div>

        <!-- 查詢表單 -->
        <div class="space-y-2 rounded-xl border border-light-c bg-surface p-3 text-sm">
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依標題：</label>
            <input
              v-model="filters.title"
              type="text"
              placeholder="請輸入欲查詢的標題"
              class="w-48 rounded border border-light-c bg-surface px-2 py-1"
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
            <label class="ml-2 flex items-center gap-1 text-muted-c">
              <input v-model="filters.includeOutdated" type="checkbox">
              含過期最新消息
            </label>
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
                  <th class="px-2 py-2">標題</th>
                  <th class="px-2 py-2">公告場別</th>
                  <th class="px-2 py-2">公告起始日</th>
                  <th class="px-2 py-2">公告截止</th>
                  <th class="px-2 py-2">是否簽收</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.seq + row.title" class="border-b border-light-c hover:bg-surface2">
                  <td class="px-2 py-1.5 text-center text-muted-c">{{ row.seq }}</td>
                  <td class="px-2 py-1.5">
                    <a v-if="row.titleUrl" :href="row.titleUrl" target="_blank" class="text-green-700 hover:underline">{{ row.title }}</a>
                    <span v-else>{{ row.title }}</span>
                  </td>
                  <td class="px-2 py-1.5">{{ row.workPlace }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.startDate }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.endDate }}</td>
                  <td class="px-2 py-1.5 text-center">{{ row.isSign }}</td>
                </tr>
                <tr v-if="!items.length">
                  <td colspan="6" class="px-2 py-6 text-center text-hint-c">查無資料</td>
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
