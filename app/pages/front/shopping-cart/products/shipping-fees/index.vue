<template>
  <div class="sc-order-page">

    <nav class="sc-subnav">
      <NuxtLink to="/front/shopping-cart/products" class="sc-subnav-link">商品列表</NuxtLink>
      <NuxtLink to="/front/shopping-cart/products/categories" class="sc-subnav-link">商品分類</NuxtLink>
      <NuxtLink to="/front/shopping-cart/products/units" class="sc-subnav-link">商品單位</NuxtLink>
      <NuxtLink to="/front/shopping-cart/products/shipping-fees" class="sc-subnav-link sc-active">商品運費</NuxtLink>
    </nav>

    <div class="sc-breadcrumb">
      <span>商品</span>
      <span class="sc-sep">/</span>
      <span class="sc-current">運費</span>
    </div>

    <p v-if="toast" class="sc-toast" :class="toast.type">{{ toast.message }}</p>

    <!-- 新增/編輯運費 -->
    <div class="sc-panel">
      <div class="sc-panel-heading">{{ editingId ? '編輯運費' : '新增運費' }}</div>
      <div class="sc-panel-body">
        <div class="sc-field-row">
          <span class="sc-field-label">溫層</span>
          <select v-model="formData.temp" class="sc-select">
            <option value="1">常溫</option>
            <option value="0">低溫</option>
          </select>
        </div>
        <div v-if="!isEditingBaseFee" class="sc-field-row">
          <span class="sc-field-label">金額</span>
          <input v-model.number="formData.price" type="number" min="0" step="1" class="sc-input" />
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">運費</span>
          <input v-model.number="formData.pricehome" type="number" min="0" step="1" class="sc-input" />
        </div>
        <div v-if="!isEditingBaseFee" class="sc-field-row">
          <span class="sc-field-label">停/啟用</span>
          <select v-model="formData.state" class="sc-select">
            <option value="1">啟用</option>
            <option value="0">停用</option>
          </select>
        </div>
        <div class="sc-submit-row">
          <button class="sc-btn-primary" :disabled="submitting" @click="submitForm">
            {{ submitting ? '處理中…' : editingId ? '更新' : '新增' }}
          </button>
          <button v-if="editingId" class="sc-btn-cancel" @click="cancelEdit">取消</button>
        </div>
      </div>
    </div>

    <p v-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div class="sc-table-controls">
      <button class="sc-refresh-btn" :disabled="loading" @click="fetchFees">
        {{ loading ? '更新中…' : '重新整理' }}
      </button>
    </div>

    <div class="sc-table-wrapper">
      <table class="sc-order-table">
        <thead>
          <tr>
            <th class="text-center">序號</th>
            <th class="text-center">溫層</th>
            <th class="text-center">金額</th>
            <th class="text-center">運費</th>
            <th class="text-center">停啟用</th>
            <th class="text-center">修改</th>
            <th class="text-center">刪除</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="text-center sc-loading-row">從原網站抓取資料中…</td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="7" class="text-center sc-empty-row">查無資料</td>
          </tr>
          <tr v-for="fee in items" :key="fee.phId">
            <td class="text-center">{{ fee.seq }}</td>
            <td class="text-center">{{ fee.temp }}</td>
            <td class="text-center">
              {{ fee.isBaseFee ? '基本運費不設定金額' : fee.price }}
            </td>
            <td class="text-center">{{ fee.pricehome }}元</td>
            <td class="text-center">
              <span v-if="fee.isBaseFee" class="sc-badge-base">基本運費</span>
              <button
                v-else
                class="sc-mini-btn"
                :class="fee.state === '1' ? 'sc-mini-btn-on' : 'sc-mini-btn-off'"
                :disabled="actingId === fee.phId"
                @click="toggleState(fee)"
              >
                {{ fee.state === '1' ? '啟用' : '停用' }}
              </button>
            </td>
            <td class="text-center">
              <button class="sc-mini-btn" @click="startEdit(fee)">修改</button>
            </td>
            <td class="text-center">
              <button
                v-if="fee.canDelete"
                class="sc-mini-btn sc-mini-btn-danger"
                :disabled="actingId === fee.phId"
                @click="deleteFee(fee)"
              >
                刪除
              </button>
              <span v-else class="sc-muted">不可刪除</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/shipping-fees.get.ts
// 及 shipping-fees/*），對應原網站 a_pricehome.php 及 a_pricehome_CL.php 的
// add / update / delete / state 動作（這頁原本就是 JSON API，比其他舊頁單純）。
definePageMeta({
  layout: 'shopping-cart'
})

const items = ref([])
const loading = ref(false)
const loadError = ref('')
const actingId = ref(null)
const submitting = ref(false)
const toast = ref(null)

const editingId = ref(null)
const editingIsBase = ref(false)

const formData = reactive({
  temp: '1',
  price: 0,
  pricehome: 0,
  state: '1'
})

const isEditingBaseFee = computed(() => editingIsBase.value)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

function resetForm() {
  formData.temp = '1'
  formData.price = 0
  formData.pricehome = 0
  formData.state = '1'
  editingIsBase.value = false
}

async function fetchFees() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch('/api/shopping-cart/shipping-fees')
    items.value = res.items ?? []
  } catch (err) {
    items.value = []
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

function startEdit(fee) {
  editingId.value = fee.phId
  editingIsBase.value = fee.isBaseFee
  formData.temp = fee.tempValue
  formData.price = Number(fee.price) || 0
  formData.pricehome = Number(fee.pricehome) || 0
  formData.state = fee.state
}

function cancelEdit() {
  editingId.value = null
  resetForm()
}

async function submitForm() {
  submitting.value = true
  try {
    if (editingId.value) {
      const res = await $fetch(`/api/shopping-cart/shipping-fees/${editingId.value}/update`, {
        method: 'POST',
        body: { ...formData }
      })
      showToast(res.ok ? '更新運費成功' : '更新運費失敗', res.ok ? 'success' : 'error')
    } else {
      const res = await $fetch('/api/shopping-cart/shipping-fees/create', {
        method: 'POST',
        body: { ...formData }
      })
      showToast(res.ok ? '新增運費成功' : '新增運費失敗', res.ok ? 'success' : 'error')
    }
    editingId.value = null
    resetForm()
    await fetchFees()
  } catch (err) {
    showToast('處理失敗', 'error')
  } finally {
    submitting.value = false
  }
}

async function toggleState(fee) {
  actingId.value = fee.phId
  const targetState = fee.state === '1' ? 0 : 1
  try {
    const res = await $fetch(`/api/shopping-cart/shipping-fees/${fee.phId}/toggle-state`, {
      method: 'POST',
      body: { state: targetState }
    })
    if (res.ok) fee.state = String(targetState)
  } catch (err) {
    showToast('狀態更新失敗', 'error')
  } finally {
    actingId.value = null
  }
}

async function deleteFee(fee) {
  if (!window.confirm('你確定要刪除這條運費嗎？')) return
  actingId.value = fee.phId
  try {
    const res = await $fetch(`/api/shopping-cart/shipping-fees/${fee.phId}/delete`, {
      method: 'POST'
    })
    if (res.ok) {
      items.value = items.value.filter((f) => f.phId !== fee.phId)
      showToast('刪除運費成功')
    } else {
      showToast('刪除運費失敗', 'error')
    }
  } catch (err) {
    showToast('刪除運費失敗', 'error')
  } finally {
    actingId.value = null
  }
}

onMounted(fetchFees)
</script>

<style scoped>
.sc-order-page {
  padding: 20px;
  color: #333;
}

.sc-subnav {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #ddd;
}

.sc-subnav-link {
  padding: 8px 16px;
  font-size: 14px;
  color: #666;
  text-decoration: none;
  border-bottom: 2px solid transparent;
}

.sc-subnav-link:hover {
  color: #3d7a52;
}

.sc-subnav-link.sc-active {
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

.sc-panel {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 20px;
  overflow: hidden;
  max-width: 480px;
}

.sc-panel-heading {
  background: #f5f5f5;
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid #ddd;
}

.sc-panel-body {
  padding: 20px;
}

.sc-field-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
}

.sc-field-label {
  flex: 0 0 70px;
  color: #666;
}

.sc-input,
.sc-select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.sc-submit-row {
  margin-top: 12px;
  display: flex;
  gap: 10px;
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

.sc-btn-cancel {
  padding: 8px 20px;
  font-size: 14px;
  background: #fff;
  color: #666;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.sc-btn-cancel:hover {
  background: #f5f5f5;
}

.sc-load-error {
  color: #d9534f;
  font-size: 13px;
  margin: 0 0 10px;
}

.sc-table-controls {
  margin-bottom: 10px;
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

.sc-badge-base {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 3px;
  font-size: 12px;
  background: #5bc0de;
  color: #fff;
}

.sc-muted {
  color: #999;
  font-size: 12px;
}
</style>
