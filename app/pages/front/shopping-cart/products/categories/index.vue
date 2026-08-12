<template>
  <div class="sc-order-page">

    <nav class="sc-subnav">
      <NuxtLink to="/front/shopping-cart/products" class="sc-subnav-link">商品列表</NuxtLink>
      <NuxtLink to="/front/shopping-cart/products/categories" class="sc-subnav-link sc-active">商品分類</NuxtLink>
      <NuxtLink to="/front/shopping-cart/products/units" class="sc-subnav-link">商品單位</NuxtLink>
      <NuxtLink to="/front/shopping-cart/products/shipping-fees" class="sc-subnav-link">商品運費</NuxtLink>
    </nav>

    <div class="sc-breadcrumb">
      <span>商品管理</span>
      <span class="sc-sep">/</span>
      <span class="sc-current">商品分類</span>
    </div>

    <p v-if="toast" class="sc-toast" :class="toast.type">{{ toast.message }}</p>

    <div class="sc-panel">
      <div class="sc-panel-heading">{{ editingId ? '編輯分類' : '新增分類' }}</div>
      <div class="sc-panel-body sc-inline-form">
        <input v-model="formData.name" type="text" class="sc-input" placeholder="分類名稱" />
        <select v-model="formData.feeGroup" class="sc-select">
          <option v-for="opt in feeGroupOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <button class="sc-btn-primary" :disabled="submitting" @click="submitForm">
          {{ submitting ? '處理中…' : editingId ? '更新' : '新增' }}
        </button>
        <button v-if="editingId" class="sc-btn-cancel" @click="cancelEdit">取消編輯</button>
      </div>
    </div>

    <p v-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div class="sc-table-controls">
      <button class="sc-refresh-btn" :disabled="loading" @click="fetchCategories">
        {{ loading ? '更新中…' : '重新整理' }}
      </button>
    </div>

    <div class="sc-table-wrapper">
      <table class="sc-order-table">
        <thead>
          <tr>
            <th class="text-center">排序</th>
            <th class="text-center">分類名稱</th>
            <th class="text-center">順序號</th>
            <th class="text-center">運費群組</th>
            <th class="text-center">顯示或隱藏</th>
            <th class="text-center">編輯</th>
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
          <tr v-for="cat in items" :key="cat.categoryId" :class="{ 'sc-row-editing': editingId === cat.categoryId }">
            <td class="text-center">{{ cat.seq }}</td>
            <td class="text-center">{{ cat.name }}</td>
            <td class="text-center">
              <input
                v-model="cat.orderValue"
                type="text"
                class="sc-order-input"
                @change="reorder(cat)"
              />
            </td>
            <td class="text-center">{{ cat.feeGroup }}</td>
            <td class="text-center">
              <button
                class="sc-mini-btn"
                :class="cat.visible ? 'sc-mini-btn-on' : 'sc-mini-btn-off'"
                :disabled="actingId === cat.categoryId"
                @click="toggleVisibility(cat)"
              >
                {{ cat.visible ? '顯示' : '隱藏' }}
              </button>
            </td>
            <td class="text-center">
              <a href="#" @click.prevent="startEdit(cat)">編輯</a>
            </td>
            <td class="text-center">
              <button
                class="sc-mini-btn sc-mini-btn-danger"
                :disabled="actingId === cat.categoryId"
                @click="deleteCategory(cat)"
              >
                刪除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="sc-open-note">
      「新增」「編輯」「顯示/隱藏」「刪除」都透過本站代理直接處理，不用另外登入原後台。
    </p>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/product-categories.get.ts
// 及 product-categories/*），對應原網站 admin_product_class.php 及
// admin_product_CL.php 的 class_a / class_u / class_on / class_order / class_d 動作。
// 編輯跟新增共用同一個表單區塊（跟原網站一樣：admin_product_class.php?act=u&sn={id}
// 只是把新增表單預填成該筆資料），透過 editingId 是否有值來切換模式。
definePageMeta({
  layout: 'shopping-cart'
})

const items = ref([])
const feeGroupOptions = ref([{ value: 'N', label: '預設' }])
const loading = ref(false)
const loadError = ref('')
const actingId = ref(null)
const submitting = ref(false)
const toast = ref(null)

const editingId = ref(null)

const formData = reactive({
  name: '',
  feeGroup: 'N'
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

function resetForm() {
  formData.name = ''
  formData.feeGroup = 'N'
}

async function fetchCategories() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch('/api/shopping-cart/product-categories')
    items.value = res.items ?? []
    if (res.feeGroupOptions?.length) feeGroupOptions.value = res.feeGroupOptions
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

async function startEdit(cat) {
  editingId.value = cat.categoryId
  try {
    const data = await $fetch(`/api/shopping-cart/product-categories/${cat.categoryId}/edit`)
    formData.name = data.name
    formData.feeGroup = data.feeGroup || 'N'
  } catch (err) {
    showToast(err?.data?.statusMessage || '讀取分類資料失敗', 'error')
    editingId.value = null
  }
}

function cancelEdit() {
  editingId.value = null
  resetForm()
}

async function submitForm() {
  if (!formData.name) {
    showToast('請輸入分類名稱', 'error')
    return
  }

  submitting.value = true
  try {
    if (editingId.value) {
      const res = await $fetch(`/api/shopping-cart/product-categories/${editingId.value}/update`, {
        method: 'POST',
        body: { ...formData }
      })
      showToast(res.ok ? '更新成功' : '更新失敗', res.ok ? 'success' : 'error')
    } else {
      const res = await $fetch('/api/shopping-cart/product-categories/create', {
        method: 'POST',
        body: { ...formData }
      })
      showToast(res.ok ? '新增成功' : '新增失敗', res.ok ? 'success' : 'error')
    }
    editingId.value = null
    resetForm()
    await fetchCategories()
  } catch (err) {
    showToast(err?.data?.statusMessage || '處理失敗', 'error')
  } finally {
    submitting.value = false
  }
}

async function toggleVisibility(cat) {
  actingId.value = cat.categoryId
  const targetSw = cat.visible ? 0 : 1
  try {
    const res = await $fetch(`/api/shopping-cart/product-categories/${cat.categoryId}/toggle-visibility`, {
      method: 'POST',
      body: { sw: targetSw }
    })
    if (res.ok) cat.visible = !cat.visible
  } catch (err) {
    showToast('更新失敗', 'error')
  } finally {
    actingId.value = null
  }
}

async function reorder(cat) {
  try {
    await $fetch(`/api/shopping-cart/product-categories/${cat.categoryId}/reorder`, {
      method: 'POST',
      body: { fieldName: cat.orderFieldName, value: cat.orderValue }
    })
    showToast('順序已更新')
  } catch (err) {
    showToast('順序更新失敗', 'error')
  }
}

async function deleteCategory(cat) {
  if (!window.confirm('你確定要刪除嗎？')) return
  actingId.value = cat.categoryId
  try {
    const res = await $fetch(`/api/shopping-cart/product-categories/${cat.categoryId}/delete`, {
      method: 'POST'
    })
    if (res.ok) {
      items.value = items.value.filter((c) => c.categoryId !== cat.categoryId)
      if (editingId.value === cat.categoryId) cancelEdit()
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

onMounted(fetchCategories)
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
}

.sc-panel-heading {
  background: #f5f5f5;
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid #ddd;
}

.sc-panel-body {
  padding: 16px;
}

.sc-inline-form {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.sc-input {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
}

.sc-select {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.sc-btn-primary {
  padding: 7px 20px;
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

.sc-order-table tbody tr.sc-row-editing {
  background: #fff8e1;
}

.text-center {
  text-align: center;
}

.sc-loading-row,
.sc-empty-row {
  padding: 24px;
  color: #999;
}

.sc-order-input {
  width: 50px;
  text-align: center;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 3px;
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
