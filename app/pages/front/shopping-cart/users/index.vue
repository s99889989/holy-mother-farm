<template>
  <div class="sc-order-page">

    <div class="sc-breadcrumb">
      <NuxtLink to="/front/shopping-cart">訂單管理</NuxtLink>
      <span class="sc-sep">/</span>
      <span class="sc-current">會員管理</span>
    </div>

    <div class="sc-toolbar">
      <a
        href="https://shopping.st-mary.org.tw/user_add.php"
        target="_blank"
        rel="noopener"
        class="sc-add-link"
      >
        新增會員 (至購物車註冊會員)
      </a>
      <button class="sc-refresh-btn" :disabled="loading" @click="fetchUsers">
        {{ loading ? '更新中…' : '重新整理' }}
      </button>
    </div>

    <p v-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div class="sc-table-controls">
      <div class="sc-length-control">
        顯示
        <select v-model.number="pageSize" @change="onPageSizeChange">
          <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">{{ n }}</option>
        </select>
        項結果
      </div>

      <div class="sc-search-control">
        搜索：
        <input v-model="keyword" type="search" placeholder="帳號 / 姓名 / 客戶代號…" />
      </div>
    </div>

    <div class="sc-table-wrapper">
      <table class="sc-order-table">
        <thead>
          <tr>
            <th class="text-center">序號</th>
            <th class="text-center">客戶代號</th>
            <th class="text-center">帳號</th>
            <th class="text-center">姓名</th>
            <th class="text-center">電話</th>
            <th class="text-center">手機</th>
            <th class="text-center">地址</th>
            <th class="text-center">臨時編碼</th>
            <th class="text-center">修改</th>
            <th class="text-center">郵件啟用</th>
            <th class="text-center">停啟用</th>
            <th class="text-center">匯出</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="12" class="text-center sc-loading-row">從原網站抓取資料中…</td>
          </tr>
          <tr v-else-if="pagedUsers.length === 0">
            <td colspan="12" class="text-center sc-empty-row">查無資料</td>
          </tr>
          <tr v-for="member in pagedUsers" :key="member.memberId">
            <td class="text-center">{{ member.seq }}</td>
            <td class="text-center">
              <span :class="{ 'sc-unset-code': member.customerCode === '未設定' }">
                {{ member.customerCode }}
              </span>
            </td>
            <td class="text-center">{{ member.account }}</td>
            <td class="text-center">
              <NuxtLink :to="`/front/shopping-cart/users/${member.memberId}`">{{ member.name }}</NuxtLink>
            </td>
            <td class="text-left">{{ member.phone || '-' }}</td>
            <td class="text-left">{{ member.mobile || '-' }}</td>
            <td class="text-left">{{ member.address }}</td>
            <td class="text-left sc-temp-code">{{ member.tempCode || '-' }}</td>
            <td class="text-center">
              <NuxtLink :to="`/front/shopping-cart/users/${member.memberId}/edit`">修改</NuxtLink>
            </td>
            <td class="text-center">
              <span v-if="member.mailVerified">啟用</span>
              <button
                v-else
                class="sc-mini-btn"
                :disabled="actingId === member.memberId"
                @click="verifyMail(member)"
              >
                停用 / 認證
              </button>
            </td>
            <td class="text-center">
              <button
                class="sc-mini-btn"
                :class="member.statusEnabled ? 'sc-mini-btn-on' : 'sc-mini-btn-off'"
                :disabled="actingId === member.memberId"
                @click="toggleStatus(member)"
              >
                {{ member.statusEnabled ? '啟用' : '停用' }}
              </button>
            </td>
            <td class="text-center">
              <a v-if="member.exportUrl" :href="`${SC_BASE}/${member.exportUrl}`" target="_blank" rel="noopener">
                匯出
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="sc-open-note">
      「匯出」會開啟原網站頁面，需要你在該分頁另外登入原後台；「修改」「認證」「啟用/停用」是透過本站代理直接處理，不用另外登入。
    </p>

    <div class="sc-table-footer">
      <div class="sc-info-text">
        顯示第 {{ rangeStart }} 至 {{ rangeEnd }} 項結果，共 {{ filteredUsers.length.toLocaleString() }} 項
      </div>

      <div class="sc-pagination">
        <button class="sc-page-btn" :disabled="page === 1" @click="goToPage(page - 1)">上頁</button>
        <button
          v-for="p in visiblePages"
          :key="p"
          class="sc-page-btn"
          :class="{ active: p === page }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
        <button class="sc-page-btn" :disabled="page === totalPages" @click="goToPage(page + 1)">下頁</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/users.get.ts 及
// users/[id]/*），分別對應原網站 admin_users.php 的清單，以及
// admin_users_CL.php 的「郵件認證」「啟用/停用」動作。
definePageMeta({
  layout: 'shopping-cart'
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
      loadError.value = '登入已過期，請重新登入'
      await navigateTo('/front/shopping-cart/login')
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
  let end = Math.min(totalPages.value, start + maxButtons - 1)
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

<style scoped>
.sc-order-page {
  padding: 20px;
  color: #333;
}

.sc-breadcrumb {
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
}

.sc-breadcrumb a {
  color: #337ab7;
  text-decoration: none;
}

.sc-breadcrumb .sc-sep {
  margin: 0 6px;
}

.sc-breadcrumb .sc-current {
  color: #555;
}

.sc-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}

.sc-add-link {
  font-size: 13px;
  color: #337ab7;
  text-decoration: none;
}

.sc-refresh-btn {
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid #3d7a52;
  color: #3d7a52;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.sc-refresh-btn:hover:not(:disabled) {
  background: #eef5f0;
}

.sc-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sc-load-error {
  color: #d9534f;
  font-size: 13px;
  margin: 0 0 10px;
}

.sc-table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  flex-wrap: wrap;
  gap: 10px;
}

.sc-length-control select {
  margin: 0 4px;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.sc-search-control input {
  padding: 5px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 220px;
}

.sc-table-wrapper {
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.sc-order-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  white-space: nowrap;
}

.sc-order-table th,
.sc-order-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
  border-right: 1px solid #f0f0f0;
}

.sc-order-table thead th {
  background: #f5f5f5;
  font-weight: 600;
  position: sticky;
  top: 0;
}

.sc-order-table tbody tr:nth-child(even) {
  background: #fafafa;
}

.sc-order-table tbody tr:hover {
  background: #f0f7f2;
}

.sc-unset-code {
  color: #ff00ff;
}

.sc-temp-code {
  font-family: monospace;
  font-size: 11px;
  color: #999;
}

.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.sc-loading-row,
.sc-empty-row {
  padding: 24px;
  color: #999;
}

.sc-mini-btn {
  padding: 3px 10px;
  font-size: 12px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
}

.sc-mini-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.sc-mini-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sc-mini-btn-on {
  color: #3d7a52;
  border-color: #3d7a52;
}

.sc-mini-btn-off {
  color: #999;
}

.sc-open-note {
  font-size: 12px;
  color: #999;
  margin: 10px 0 0;
}

.sc-table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
}

.sc-pagination {
  display: flex;
  gap: 4px;
}

.sc-page-btn {
  padding: 5px 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
  font-size: 13px;
}

.sc-page-btn:hover:not(:disabled) {
  background: #f0f7f2;
}

.sc-page-btn.active {
  background: #3d7a52;
  color: #fff;
  border-color: #3d7a52;
}

.sc-page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
