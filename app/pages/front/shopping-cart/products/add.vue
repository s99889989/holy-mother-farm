<template>
  <div class="sc-order-page">

    <div class="sc-breadcrumb">
      <NuxtLink to="/front/shopping-cart/products">商品管理</NuxtLink>
      <span class="sc-sep">/</span>
      <span class="sc-current">新增商品</span>
    </div>

    <p v-if="toast" class="sc-toast" :class="toast.type">{{ toast.message }}</p>
    <p v-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div class="sc-panel">
      <div class="sc-panel-body">
        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>分類目錄</span>
          <select v-model="formData.categoryId" class="sc-select">
            <option value="">請選擇</option>
            <option v-for="opt in categoryOptions" :key="opt.categoryId" :value="opt.categoryId">
              {{ opt.name }}
            </option>
          </select>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>商品名稱</span>
          <input v-model="formData.name" type="text" class="sc-input" placeholder="商品名稱" />
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>商品資材碼</span>
          <input v-model="formData.no" type="text" class="sc-input" placeholder="商品資材碼" />
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">商品定價</span>
          <input v-model="formData.originalPrice" type="text" class="sc-input" placeholder="商品定價" />
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>商品售價</span>
          <input v-model="formData.price" type="text" class="sc-input" placeholder="商品售價" />
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label"><span class="red">*</span>商品單位</span>
          <select v-model="formData.unit" class="sc-select">
            <option value="">請選擇</option>
            <option v-for="opt in unitOptions" :key="opt.unitId" :value="opt.name">
              {{ opt.name }}
            </option>
          </select>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">溫層</span>
          <label class="sc-radio-label">
            <input v-model="formData.tempZone" type="radio" value="1" /> 常溫
          </label>
          <label class="sc-radio-label">
            <input v-model="formData.tempZone" type="radio" value="0" /> 低溫
          </label>
        </div>
        <div class="sc-field-row">
          <span class="sc-field-label">商品排序</span>
          <input v-model="formData.sort" type="text" class="sc-input sc-input-narrow" />
        </div>
        <div class="sc-field-row sc-field-row-top">
          <span class="sc-field-label">詳細描述</span>
          <ShoppingCartRichTextEditor v-model="formData.description" class="sc-rte" />
        </div>

        <p class="sc-hint red">在新增商品之後，請記得到商品管理頁面，點選（圖片）按鈕上傳圖片</p>

        <div class="sc-submit-row">
          <button class="sc-btn-primary" :disabled="submitting" @click="submitForm">
            {{ submitting ? '送出中…' : '新增商品' }}
          </button>
          <NuxtLink to="/front/shopping-cart/products" class="sc-btn-cancel">取消</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/products/create.post.ts），
// 對應原網站 admin_product_add.php 及 admin_product_CL.php?act=a。
// 分類/單位下拉選單直接重用既有的 product-categories、product-units API
// （分類只列「顯示中」的，跟原網站 admin_product_add.php 一致）。
definePageMeta({
  layout: 'shopping-cart'
})

const route = useRoute()

const categoryOptions = ref([])
const unitOptions = ref([])
const loadError = ref('')
const submitting = ref(false)
const toast = ref(null)

const formData = reactive({
  categoryId: typeof route.query.category === 'string' ? route.query.category : '',
  name: '',
  no: '',
  originalPrice: '',
  price: '',
  unit: '',
  tempZone: '1',
  sort: '9',
  description: ''
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

async function loadOptions() {
  loadError.value = ''
  try {
    const [catRes, unitRes] = await Promise.all([
      $fetch('/api/shopping-cart/product-categories'),
      $fetch('/api/shopping-cart/product-units')
    ])
    categoryOptions.value = (catRes.items ?? []).filter((c) => c.visible)
    unitOptions.value = unitRes.items ?? []
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      loadError.value = '登入已過期，請重新登入'
      await navigateTo('/front/shopping-cart/login')
    } else {
      loadError.value = err?.data?.statusMessage || '抓取分類/單位資料失敗，請稍後再試'
    }
  }
}

async function submitForm() {
  if (!formData.categoryId || !formData.name || !formData.no || !formData.price || !formData.unit) {
    showToast('分類目錄、商品名稱、商品資材碼、商品售價、商品單位皆為必填', 'error')
    return
  }

  submitting.value = true
  try {
    const res = await $fetch('/api/shopping-cart/products/create', {
      method: 'POST',
      body: { ...formData }
    })
    if (res.ok) {
      await navigateTo(`/front/shopping-cart/products?category=${formData.categoryId}`)
    } else {
      showToast('新增失敗', 'error')
    }
  } catch (err) {
    showToast(err?.data?.statusMessage || '新增失敗', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(loadOptions)
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
  color: #888;
  text-decoration: none;
}

.sc-breadcrumb a:hover {
  color: #3d7a52;
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

.sc-load-error {
  color: #d9534f;
  font-size: 13px;
  margin: 0 0 10px;
}

.sc-panel {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  max-width: 640px;
}

.sc-panel-body {
  padding: 20px;
}

.sc-field-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.sc-field-row-top {
  align-items: flex-start;
}

.sc-field-label {
  width: 100px;
  flex-shrink: 0;
  font-size: 14px;
  color: #555;
  text-align: right;
}

.red {
  color: #d9534f;
}

.sc-input,
.sc-select,
.sc-textarea {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.sc-input-narrow {
  flex: none;
  width: 80px;
}

.sc-textarea {
  resize: vertical;
}

.sc-rte {
  flex: 1;
}

.sc-radio-label {
  font-size: 14px;
  color: #555;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
}

.sc-hint {
  font-size: 13px;
  margin: 0 0 16px 112px;
}

.sc-submit-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: 112px;
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
  text-decoration: none;
}

.sc-btn-cancel:hover {
  background: #f5f5f5;
}
</style>
