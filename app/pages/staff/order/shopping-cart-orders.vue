<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'order.shopping-cart' })

// 這頁直接沿用既有的 server/api/shopping-cart/orders.get.ts（解析原網站
// admin_order.php），跟 /staff/order/shopping-cart/index.vue 是同一份資料來源，
// 只是換一套版型（staff 版型的 design token）放在 staff/order/ 底下。
// 「訂單單號」「修改」仍然連到既有的 /staff/order/shopping-cart/order/[orderNo]
// 系列頁面（那邊有完整的查看/修改/狀態/數量/出貨日功能，這裡不重做）。
import { ref, reactive, computed, watch, onMounted } from 'vue'

const statusOptions = [
  { value: '0', label: '新訂單' },
  { value: '1', label: '訂單成立' },
  { value: '2', label: '備貨' },
  { value: '3', label: '出貨' }
]

const filters = reactive({
  status: '',
  keyword: ''
})

const rawOrders = ref([])
const loading = ref(false)
const loadError = ref('')

const page = ref(1)
const pageSize = ref(10)

async function fetchOrders() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch('/api/shopping-cart/orders', {
      query: { status: filters.status || undefined }
    })
    rawOrders.value = res.items ?? []
  } catch (err) {
    rawOrders.value = []
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      loadError.value = 'unauthorized'
    } else {
      loadError.value = err?.data?.statusMessage || '抓取原網站資料失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

const filteredOrders = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  let list = rawOrders.value
  if (keyword) {
    list = list.filter((o) =>
      [o.orderNo, o.receiverName, o.buyerName, o.receiverAddress]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }
  return list
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredOrders.value.length / pageSize.value))
)

const pagedOrders = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredOrders.value.slice(start, start + pageSize.value)
})

const rangeStart = computed(() =>
  filteredOrders.value.length === 0 ? 0 : (page.value - 1) * pageSize.value + 1
)
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, filteredOrders.value.length))

const visiblePages = computed(() => {
  const pages = []
  const maxButtons = 5
  let start = Math.max(1, page.value - Math.floor(maxButtons / 2))
  const end = Math.min(totalPages.value, start + maxButtons - 1)
  start = Math.max(1, end - maxButtons + 1)
  for (let p = start; p <= end; p++) pages.push(p)
  return pages
})

function statusBadgeClass(code) {
  switch (code) {
    case 0:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30'
    case 1:
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30'
    case 2:
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800/30'
    case 3:
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/30'
    default:
      return 'bg-surface2 text-hint-c border border-light-c'
  }
}

function goToPage(p) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
}

function onFilterChange() {
  page.value = 1
  fetchOrders()
}

watch(
  () => filters.keyword,
  () => {
    page.value = 1
  }
)

onMounted(fetchOrders)
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <!-- ── 頂部導覽 ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            購
          </div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">
              購物車 · 訂單管理
            </h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">
              Holy Mother Farm
            </p>
          </div>
        </div>
        <button
          class="px-3 py-1.5 text-xs sm:text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
          :disabled="loading"
          @click="fetchOrders"
        >
          {{ loading ? '更新中…' : '重新整理' }}
        </button>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">

    <!-- 未登入購物車後台代理 session -->
    <div
      v-if="loadError === 'unauthorized'"
      class="bg-surface rounded-xl border border-light-c p-6 text-center space-y-3"
    >
      <p class="text-muted-c text-sm">
        尚未登入購物車後台（這裡的訂單資料是即時向原網站抓取的，需要先登入）。
      </p>
      <NuxtLink
        to="/staff/order/shopping-cart/login"
        class="inline-block px-4 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 transition-colors"
      >
        前往登入購物車後台
      </NuxtLink>
    </div>

    <p v-else-if="loadError" class="text-red-600 dark:text-red-400 text-sm">
      {{ loadError }}
    </p>

    <template v-if="loadError !== 'unauthorized'">
      <!-- 篩選列 -->
      <div class="bg-surface rounded-xl border border-light-c p-4 flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-muted-c">訂單狀態</label>
          <select
            v-model="filters.status"
            class="px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
            @change="onFilterChange"
          >
            <option value="">全部</option>
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2 flex-1 min-w-[200px]">
          <label class="text-sm font-medium text-muted-c">搜尋</label>
          <input
            v-model="filters.keyword"
            type="search"
            placeholder="訂單單號 / 收件人 / 會員…"
            class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
          >
        </div>
      </div>

      <!-- 訂單表格 -->
      <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm whitespace-nowrap">
            <thead class="bg-surface2 text-hint-c text-xs uppercase tracking-wide">
              <tr>
                <th class="px-3 py-2 text-center">序號</th>
                <th class="px-3 py-2 text-center">訂購日期</th>
                <th class="px-3 py-2 text-center">訂單單號</th>
                <th class="px-3 py-2 text-center">出貨日期</th>
                <th class="px-3 py-2 text-center">下單會員</th>
                <th class="px-3 py-2 text-center">收件人</th>
                <th class="px-3 py-2 text-center">電話</th>
                <th class="px-3 py-2 text-center">手機</th>
                <th class="px-3 py-2 text-left">地址</th>
                <th class="px-3 py-2 text-center">金額</th>
                <th class="px-3 py-2 text-center">狀態</th>
                <th class="px-3 py-2 text-center">處理員</th>
                <th class="px-3 py-2 text-center">修改</th>
                <th class="px-3 py-2 text-center">匯出</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-light-c">
              <tr v-if="loading">
                <td colspan="14" class="px-3 py-8 text-center text-hint-c">從原網站抓取資料中…</td>
              </tr>
              <tr v-else-if="pagedOrders.length === 0">
                <td colspan="14" class="px-3 py-8 text-center text-hint-c">查無資料</td>
              </tr>
              <tr
                v-for="order in pagedOrders"
                :key="order.orderNo"
                class="hover-surface2"
                :class="{ 'opacity-60': order.statusCode === 3 }"
              >
                <td class="px-3 py-2 text-center text-hint-c">{{ order.seq }}</td>
                <td class="px-3 py-2 text-center text-base-c">{{ order.orderDate }}</td>
                <td class="px-3 py-2 text-center">
                  <NuxtLink
                    :to="`/staff/order/shopping-cart/order/${order.orderNo}`"
                    class="text-green-700 dark:text-green-400 hover:underline"
                  >
                    {{ order.orderNo }}
                  </NuxtLink>
                </td>
                <td class="px-3 py-2 text-center text-base-c">{{ order.shipDate || '-' }}</td>
                <td class="px-3 py-2 text-center text-base-c">{{ order.buyerName }}</td>
                <td class="px-3 py-2 text-center text-base-c">{{ order.receiverName }}</td>
                <td class="px-3 py-2 text-center text-base-c">{{ order.receiverPhone || '-' }}</td>
                <td class="px-3 py-2 text-center text-base-c">{{ order.receiverMobile || '-' }}</td>
                <td class="px-3 py-2 text-left text-base-c">{{ order.receiverAddress }}</td>
                <td class="px-3 py-2 text-center text-base-c font-medium">{{ order.totalAmount }}</td>
                <td class="px-3 py-2 text-center">
                  <span
                    class="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                    :class="statusBadgeClass(order.statusCode)"
                  >
                    {{ order.statusText }}
                  </span>
                </td>
                <td class="px-3 py-2 text-center text-base-c">{{ order.handlerName || '-' }}</td>
                <td class="px-3 py-2 text-center">
                  <NuxtLink
                    :to="`/staff/order/shopping-cart/order/${order.orderNo}/edit`"
                    class="text-green-700 dark:text-green-400 hover:underline"
                  >
                    修改
                  </NuxtLink>
                </td>
                <td class="px-3 py-2 text-center">
                  <a
                    v-if="order.exportUrl"
                    :href="order.exportUrl"
                    target="_blank"
                    rel="noopener"
                    class="text-green-700 dark:text-green-400 hover:underline"
                  >
                    匯出
                  </a>
                  <span v-else class="text-hint-c">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="text-xs text-hint-c">
        「訂單單號」「修改」會進到購物車後台的訂單詳情/編輯頁；「匯出」會另開原網站頁面（需要該分頁也登入原後台）。
      </p>

      <!-- 分頁 -->
      <div class="flex items-center justify-between flex-wrap gap-3 text-sm">
        <div class="text-hint-c">
          顯示第 {{ rangeStart }} 至 {{ rangeEnd }} 項結果，共 {{ filteredOrders.length.toLocaleString() }} 項
        </div>
        <div class="flex gap-1">
          <button
            class="px-3 py-1.5 rounded-lg border border-light-c text-muted-c hover-surface2 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page === 1"
            @click="goToPage(page - 1)"
          >
            上頁
          </button>
          <button
            v-for="p in visiblePages"
            :key="p"
            class="px-3 py-1.5 rounded-lg border transition-colors"
            :class="p === page
              ? 'bg-green-700 text-white border-green-700'
              : 'border-light-c text-muted-c hover-surface2'"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="px-3 py-1.5 rounded-lg border border-light-c text-muted-c hover-surface2 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page === totalPages"
            @click="goToPage(page + 1)"
          >
            下頁
          </button>
        </div>
      </div>
    </template>
    </div>
  </div>
</template>
