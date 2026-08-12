<template>
  <div class="sc-order-page">
    <nav class="sc-topnav">
      <NuxtLink to="/front/shopping-cart" class="sc-topnav-link">訂單管理</NuxtLink>
      <NuxtLink to="/front/shopping-cart/users" class="sc-topnav-link">會員管理</NuxtLink>
      <NuxtLink to="/front/shopping-cart/managers" class="sc-topnav-link sc-active">管理員設定</NuxtLink>
    </nav>

    <div class="sc-breadcrumb">
      <span>設定</span>
      <span class="sc-sep">/</span>
      <span class="sc-current">管理員</span>
    </div>

    <p v-if="toast" class="sc-toast" :class="toast.type">{{ toast.message }}</p>

    <!-- 新增管理員 -->
    <div class="sc-panel">
      <div class="sc-panel-heading">新增管理員</div>
      <div class="sc-panel-body">
        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>帳號</span>
          <input v-model="newManager.account" type="text" class="sc-input" placeholder="帳號" />
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>密碼</span>
          <input v-model="newManager.password" type="password" class="sc-input" />
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>姓名</span>
          <input v-model="newManager.name" type="text" class="sc-input" placeholder="姓名" />
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">備註</span>
          <input v-model="newManager.note" type="text" class="sc-input" />
        </div>
        <div class="sc-submit-row">
          <button class="sc-btn-primary" :disabled="creating" @click="createManager">
            {{ creating ? '新增中…' : '新增' }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div class="sc-table-controls">
      <button class="sc-refresh-btn" :disabled="loading" @click="fetchManagers">
        {{ loading ? '更新中…' : '重新整理' }}
      </button>
      <div class="sc-search-control">
        搜索：
        <input v-model="keyword" type="search" placeholder="帳號 / 姓名 / 備註…" />
      </div>
    </div>

    <div class="sc-table-wrapper">
      <table class="sc-order-table">
        <thead>
          <tr>
            <th class="text-center">序號</th>
            <th class="text-center">帳號</th>
            <th class="text-center">姓名</th>
            <th class="text-center">備註</th>
            <th class="text-center">停啟用</th>
            <th class="text-center">修改</th>
            <th class="text-center">刪除</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="text-center sc-loading-row">從原網站抓取資料中…</td>
          </tr>
          <tr v-else-if="filteredManagers.length === 0">
            <td colspan="7" class="text-center sc-empty-row">查無資料</td>
          </tr>
          <tr v-for="manager in filteredManagers" :key="manager.managerId">
            <td class="text-center">{{ manager.seq }}</td>
            <td class="text-center">{{ manager.account }}</td>
            <td class="text-center">{{ manager.name }}</td>
            <td class="text-center">{{ manager.note || '-' }}</td>
            <td class="text-center">
              <button
                class="sc-mini-btn"
                :class="manager.statusEnabled ? 'sc-mini-btn-on' : 'sc-mini-btn-off'"
                :disabled="actingId === manager.managerId"
                @click="toggleStatus(manager)"
              >
                {{ manager.statusEnabled ? '啟用' : '停用' }}
              </button>
            </td>
            <td class="text-center">
              <a :href="manager.editUrl" target="_blank" rel="noopener">修改</a>
            </td>
            <td class="text-center">
              <button
                class="sc-mini-btn sc-mini-btn-danger"
                :disabled="actingId === manager.managerId"
                @click="deleteManager(manager)"
              >
                刪除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="sc-open-note">
      「修改」目前會開啟原網站頁面（需要另外登入）；「新增」「停啟用」「刪除」是透過本站代理直接處理，不用另外登入。
    </p>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/managers.get.ts
// 及 managers/create.post.ts、managers/[id]/*），對應原網站 admin_manager.php
// 及 admin_manager_CL.php 的新增/停啟用/刪除動作。
definePageMeta({
  layout: false
})

const rawManagers = ref([])
const loading = ref(false)
const loadError = ref('')
const actingId = ref(null)
const creating = ref(false)
const keyword = ref('')
const toast = ref(null)

const newManager = reactive({
  account: '',
  password: '',
  name: '',
  note: ''
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

async function fetchManagers() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch('/api/shopping-cart/managers')
    rawManagers.value = res.items ?? []
  } catch (err) {
    rawManagers.value = []
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

const filteredManagers = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return rawManagers.value
  return rawManagers.value.filter((m) =>
    [m.account, m.name, m.note].join(' ').toLowerCase().includes(kw)
  )
})

async function createManager() {
  if (!newManager.account || !newManager.password || !newManager.name) {
    showToast('帳號、密碼、姓名為必填', 'error')
    return
  }
  creating.value = true
  try {
    const res = await $fetch('/api/shopping-cart/managers/create', {
      method: 'POST',
      body: { ...newManager }
    })
    if (res.ok) {
      showToast('新增成功')
      newManager.account = ''
      newManager.password = ''
      newManager.name = ''
      newManager.note = ''
      await fetchManagers()
    } else {
      showToast('新增失敗', 'error')
    }
  } catch (err) {
    showToast(err?.data?.statusMessage || '新增失敗', 'error')
  } finally {
    creating.value = false
  }
}

async function toggleStatus(manager) {
  actingId.value = manager.managerId
  const targetSw = manager.statusEnabled ? 0 : 1
  try {
    const res = await $fetch(`/api/shopping-cart/managers/${manager.managerId}/toggle-status`, {
      method: 'POST',
      body: { sw: targetSw }
    })
    if (res.ok) manager.statusEnabled = !manager.statusEnabled
  } catch (err) {
    showToast('更新失敗', 'error')
  } finally {
    actingId.value = null
  }
}

async function deleteManager(manager) {
  if (!window.confirm('你確定要刪除嗎？')) return
  actingId.value = manager.managerId
  try {
    const res = await $fetch(`/api/shopping-cart/managers/${manager.managerId}/delete`, {
      method: 'POST'
    })
    if (res.ok) {
      rawManagers.value = rawManagers.value.filter((m) => m.managerId !== manager.managerId)
      showToast('刪除成功')
    } else {
      showToast('刪除失敗', 'error')
    }
  } catch (err) {
    showToast(err?.data?.statusMessage || '刪除失敗', 'error')
  } finally {
    actingId.value = null
  }
}

onMounted(fetchManagers)
</script>

<style scoped>
.sc-order-page {
  padding: 20px;
  color: #333;
}

.sc-topnav {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #ddd;
}

.sc-topnav-link {
  padding: 8px 16px;
  font-size: 14px;
  color: #666;
  text-decoration: none;
  border-bottom: 2px solid transparent;
}

.sc-topnav-link:hover {
  color: #3d7a52;
}

.sc-topnav-link.sc-active {
  color: #3d7a52;
  font-weight: 600;
  border-bottom-color: #3d7a52;
}

.sc-breadcrumb {
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
}

.sc-breadcrumb .sc-sep {
  margin: 0 6px;
}

.sc-breadcrumb .sc-current {
  color: #555;
}

.sc-toast {
  position: sticky;
  top: 10px;
  z-index: 10;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 12px;
}

.sc-toast.success {
  background: #dff0d8;
  color: #3c763d;
}

.sc-toast.error {
  background: #f2dede;
  color: #a94442;
}

.red {
  color: #d9534f;
}

.sc-panel {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 20px;
  overflow: hidden;
}

.sc-panel-heading {
  background: #f5f5f5;
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid #ddd;
}

.sc-panel-body {
  padding: 20px;
  max-width: 500px;
}

.sc-field-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
}

.sc-field-label {
  flex: 0 0 80px;
  color: #666;
}

.sc-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.sc-submit-row {
  margin-top: 12px;
}

.sc-btn-primary {
  padding: 8px 24px;
  font-size: 14px;
  background: #3d7a52;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.sc-btn-primary:hover:not(:disabled) {
  background: #2f6141;
}

.sc-btn-primary:disabled {
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
}

.sc-order-table tbody tr:nth-child(even) {
  background: #fafafa;
}

.sc-order-table tbody tr:hover {
  background: #f0f7f2;
}

.text-center {
  text-align: center;
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

.sc-mini-btn-danger {
  color: #d9534f;
  border-color: #d9534f;
}

.sc-open-note {
  font-size: 12px;
  color: #999;
  margin: 10px 0 0;
}
</style>
