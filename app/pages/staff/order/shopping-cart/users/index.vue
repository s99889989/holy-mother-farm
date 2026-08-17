<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import { ref, computed, watch, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/users.get.ts 及
// users/[id]/*），分別對應原網站 admin_users.php 的清單，以及
// admin_users_CL.php 的「郵件認證」「啟用/停用」動作。
definePageMeta({
  layout: 'staff'
})

const SC_BASE = 'https://shopping.st-mary.org.tw/admincp'

const rawUsers = ref([])
const loading = ref(false)
const loadError = ref('')
const actingId = ref(null)

const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)

async function fetchUsers() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch('/api/shopping-cart/users')
    rawUsers.value = res.items ?? []
  } catch (err) {
    rawUsers.value = []
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/shopping-cart/login')
      return
    } else {
      loadError.value = err?.data?.statusMessage || '抓取原網站資料失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

const filteredUsers = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return rawUsers.value
  return rawUsers.value.filter((m) =>
    [m.account, m.name, m.customerCode, m.address].join(' ').toLowerCase().includes(kw)
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / pageSize.value)))

const pagedUsers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredUsers.value.slice(start, start + pageSize.value)
})

const rangeStart = computed(() => (filteredUsers.value.length === 0 ? 0 : (page.value - 1) * pageSize.value + 1))
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, filteredUsers.value.length))

const visiblePages = computed(() => {
  const pages = []
  const maxButtons = 5
  let start = Math.max(1, page.value - Math.floor(maxButtons / 2))
  const end = Math.min(totalPages.value, start + maxButtons - 1)
  start = Math.max(1, end - maxButtons + 1)
  for (let p = start; p <= end; p++) pages.push(p)
  return pages
})

function onPageSizeChange() {
  page.value = 1
}

function goToPage(p) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
}

async function toggleStatus(member) {
  actingId.value = member.memberId
  const targetSw = member.statusEnabled ? 0 : 1
  try {
    const res = await $fetch(`/api/shopping-cart/users/${member.memberId}/toggle-status`, {
      method: 'POST',
      body: { sw: targetSw }
    })
    if (res.ok) {
      member.statusEnabled = !member.statusEnabled
    }
  } catch (err) {
    // 靜默失敗即可，狀態維持原樣
  } finally {
    actingId.value = null
  }
}

async function verifyMail(member) {
  actingId.value = member.memberId
  try {
    const res = await $fetch(`/api/shopping-cart/users/${member.memberId}/verify-mail`, {
      method: 'POST'
    })
    if (res.ok) {
      member.mailVerified = true
    }
  } catch (err) {
    // 靜默失敗即可
  } finally {
    actingId.value = null
  }
}

watch(keyword, () => {
  page.value = 1
})

onMounted(fetchUsers)
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader title="會員管理">
      <template #actions>
        <a
          href="https://shopping.st-mary.org.tw/user_add.php"
          target="_blank"
          rel="noopener"
          class="px-3 py-1.5 text-xs sm:text-sm border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors"
        >
          新增會員（至購物車註冊）
        </a>
      </template>
    </ScHeader>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <template>
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2 text-sm text-muted-c">
            <button class="px-4 py-2 text-sm border border-green-700 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors" :disabled="loading" @click="fetchUsers">
              {{ loading ? '更新中…' : '重新整理' }}
            </button>
            顯示
            <select v-model.number="pageSize" class="px-2 py-1.5 rounded-lg border border-light-c bg-surface text-base-c" @change="onPageSizeChange">
              <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">{{ n }}</option>
            </select>
            項結果
          </div>
          <input v-model="keyword" type="search" placeholder="搜尋：帳號 / 姓名 / 客戶代號…" class="px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400 w-64">
        </div>

        <p v-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm whitespace-nowrap">
              <thead class="bg-surface2 text-hint-c text-xs uppercase tracking-wide">
                <tr>
                  <th class="px-3 py-2 text-center">序號</th>
                  <th class="px-3 py-2 text-center">客戶代號</th>
                  <th class="px-3 py-2 text-center">帳號</th>
                  <th class="px-3 py-2 text-center">姓名</th>
                  <th class="px-3 py-2 text-center">電話</th>
                  <th class="px-3 py-2 text-center">手機</th>
                  <th class="px-3 py-2 text-left">地址</th>
                  <th class="px-3 py-2 text-center">臨時編碼</th>
                  <th class="px-3 py-2 text-center">修改</th>
                  <th class="px-3 py-2 text-center">郵件啟用</th>
                  <th class="px-3 py-2 text-center">停啟用</th>
                  <th class="px-3 py-2 text-center">匯出</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-light-c">
                <tr v-if="loading">
                  <td colspan="12" class="px-3 py-8 text-center text-hint-c">從原網站抓取資料中…</td>
                </tr>
                <tr v-else-if="pagedUsers.length === 0">
                  <td colspan="12" class="px-3 py-8 text-center text-hint-c">查無資料</td>
                </tr>
                <tr v-for="member in pagedUsers" :key="member.memberId" class="hover-surface2">
                  <td class="px-3 py-2 text-center text-hint-c">{{ member.seq }}</td>
                  <td class="px-3 py-2 text-center">
                    <span :class="member.customerCode === '未設定' ? 'text-pink-500 dark:text-pink-400' : 'text-base-c'">
                      {{ member.customerCode }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-center text-base-c">{{ member.account }}</td>
                  <td class="px-3 py-2 text-center">
                    <NuxtLink :to="`/staff/order/shopping-cart/users/${member.memberId}`" class="text-green-700 dark:text-green-400 hover:underline">
                      {{ member.name }}
                    </NuxtLink>
                  </td>
                  <td class="px-3 py-2 text-left text-base-c">{{ member.phone || '-' }}</td>
                  <td class="px-3 py-2 text-left text-base-c">{{ member.mobile || '-' }}</td>
                  <td class="px-3 py-2 text-left text-base-c">{{ member.address }}</td>
                  <td class="px-3 py-2 text-left font-mono text-xs text-hint-c">{{ member.tempCode || '-' }}</td>
                  <td class="px-3 py-2 text-center">
                    <NuxtLink :to="`/staff/order/shopping-cart/users/${member.memberId}/edit`" class="text-green-700 dark:text-green-400 hover:underline">
                      修改
                    </NuxtLink>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span v-if="member.mailVerified" class="text-green-700 dark:text-green-400">啟用</span>
                    <button
                      v-else
                      class="px-2.5 py-1 text-xs rounded-lg border border-light-c text-muted-c hover-surface2 disabled:opacity-50"
                      :disabled="actingId === member.memberId"
                      @click="verifyMail(member)"
                    >
                      停用 / 認證
                    </button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button
                      class="px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-50"
                      :class="member.statusEnabled
                        ? 'border-green-600 text-green-700 dark:text-green-400'
                        : 'border-light-c text-hint-c'"
                      :disabled="actingId === member.memberId"
                      @click="toggleStatus(member)"
                    >
                      {{ member.statusEnabled ? '啟用' : '停用' }}
                    </button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <a v-if="member.exportUrl" :href="`${SC_BASE}/${member.exportUrl}`" target="_blank" rel="noopener" class="text-green-700 dark:text-green-400 hover:underline">
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
          「匯出」會開啟原網站頁面，需要你在該分頁另外登入原後台；「修改」「認證」「啟用/停用」是透過本站代理直接處理，不用另外登入。
        </p>

        <div class="flex items-center justify-between flex-wrap gap-3 text-sm">
          <div class="text-hint-c">
            顯示第 {{ rangeStart }} 至 {{ rangeEnd }} 項結果，共 {{ filteredUsers.length.toLocaleString() }} 項
          </div>
          <div class="flex gap-1">
            <button class="px-3 py-1.5 rounded-lg border border-light-c text-muted-c hover-surface2 disabled:opacity-40" :disabled="page === 1" @click="goToPage(page - 1)">上頁</button>
            <button
              v-for="p in visiblePages"
              :key="p"
              class="px-3 py-1.5 rounded-lg border transition-colors"
              :class="p === page ? 'bg-green-700 text-white border-green-700' : 'border-light-c text-muted-c hover-surface2'"
              @click="goToPage(p)"
            >
              {{ p }}
            </button>
            <button class="px-3 py-1.5 rounded-lg border border-light-c text-muted-c hover-surface2 disabled:opacity-40" :disabled="page === totalPages" @click="goToPage(page + 1)">下頁</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
