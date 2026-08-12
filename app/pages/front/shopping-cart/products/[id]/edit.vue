<template>
  <div class="sc-order-page">

    <div class="sc-breadcrumb">
      <NuxtLink to="/front/shopping-cart/products">商品管理</NuxtLink>
      <span class="sc-sep">/</span>
      <span class="sc-current">{{ formData.name ? `${formData.name}-修改商品` : '修改商品' }}</span>
    </div>

    <p v-if="toast" class="sc-toast" :class="toast.type">{{ toast.message }}</p>
    <p v-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div v-if="loading" class="sc-empty-hint">從原網站抓取資料中…</div>

    <template v-else>
      <div class="sc-panel">
        <div class="sc-panel-heading">
          商品圖片
          <NuxtLink :to="`/front/shopping-cart/products/${productId}/images`" class="sc-add-image-link">
            <i class="fa fa-plus-circle" /> 新增圖片
          </NuxtLink>
        </div>
        <div class="sc-panel-body">
          <div v-if="images.length === 0" class="sc-empty-hint sc-empty-hint-small">尚未上傳圖片</div>
          <div v-else class="sc-image-grid">
            <div v-for="img in images" :key="img.picId" class="sc-image-card">
              <img :src="img.imageUrl" alt="" />
              <div class="sc-image-controls">
                排序
                <input
                  v-model="img.sortValue"
                  type="text"
                  class="sc-order-input"
                  @change="reorderImage(img)"
                />
                <a href="#" class="sc-danger-link" @click.prevent="deleteImage(img)">刪除</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sc-panel">
        <div class="sc-panel-heading">商品資訊</div>
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
            <input v-model="formData.name" type="text" class="sc-input" />
          </div>
          <div class="sc-field-row">
            <span class="sc-field-label"><span class="red">*</span>商品資材碼</span>
            <input v-model="formData.no" type="text" class="sc-input" />
          </div>
          <div class="sc-field-row">
            <span class="sc-field-label">商品定價</span>
            <input v-model="formData.originalPrice" type="text" class="sc-input" />
          </div>
          <div class="sc-field-row">
            <span class="sc-field-label"><span class="red">*</span>商品售價</span>
            <input v-model="formData.price" type="text" class="sc-input" />
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
            <span class="sc-field-label">是否可訂購</span>
            <label class="sc-radio-label">
              <input v-model="formData.orderable" type="radio" value="1" /> 可訂購
            </label>
            <label class="sc-radio-label">
              <input v-model="formData.orderable" type="radio" value="0" /> 缺貨中
            </label>
            <label class="sc-radio-label">
              <input v-model="formData.orderable" type="radio" value="2" /> 季節限定
            </label>
          </div>
          <div class="sc-field-row">
            <span class="sc-field-label">顯示或隱藏</span>
            <label class="sc-radio-label">
              <input v-model="formData.visible" type="radio" value="1" /> 顯示
            </label>
            <label class="sc-radio-label">
              <input v-model="formData.visible" type="radio" value="0" /> 隱藏
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

          <div class="sc-submit-row">
            <button class="sc-btn-primary" :disabled="submitting" @click="submitForm">
              {{ submitting ? '送出中…' : '更新商品' }}
            </button>
            <a :href="previewUrl" target="_blank" rel="noopener" class="sc-btn-preview">預覽</a>
            <NuxtLink to="/front/shopping-cart/products" class="sc-btn-cancel">返回</NuxtLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/products/[id]/*），
// 對應原網站 admin_product_update.php 及 admin_product_CL.php 的
// act=u / act=pic_d / act=pic_sort 動作。分類/單位下拉選單重用既有 API。
definePageMeta({
  layout: 'shopping-cart'
})

const route = useRoute()
const productId = route.params.id

const categoryOptions = ref([])
const unitOptions = ref([])
const images = ref([])
const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const toast = ref(null)

const formData = reactive({
  categoryId: '',
  name: '',
  no: '',
  originalPrice: '',
  price: '',
  unit: '',
  tempZone: '1',
  orderable: '1',
  visible: '1',
  sort: '',
  description: ''
})

const previewUrl = computed(
  () => `https://shopping.st-mary.org.tw/product_detail.php?i=${productId}&di=${formData.categoryId}`
)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

async function loadData() {
  loading.value = true
  loadError.value = ''
  try {
    const [catRes, unitRes, productRes] = await Promise.all([
      $fetch('/api/shopping-cart/product-categories'),
      $fetch('/api/shopping-cart/product-units'),
      $fetch(`/api/shopping-cart/products/${productId}/edit`)
    ])
    categoryOptions.value = (catRes.items ?? []).filter((c) => c.visible)
    unitOptions.value = unitRes.items ?? []

    formData.categoryId = productRes.categoryId
    formData.name = productRes.name
    formData.no = productRes.no
    formData.originalPrice = productRes.originalPrice
    formData.price = productRes.price
    formData.unit = productRes.unit
    formData.tempZone = productRes.tempZone
    formData.orderable = productRes.orderable
    formData.visible = productRes.visible
    formData.sort = productRes.sort
    formData.description = productRes.description
    images.value = productRes.images ?? []
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      loadError.value = '登入已過期，請重新登入'
      await navigateTo('/front/shopping-cart/login')
    } else {
      loadError.value = err?.data?.statusMessage || '抓取商品資料失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

async function submitForm() {
  if (!formData.categoryId || !formData.name || !formData.no || !formData.price || !formData.unit) {
    showToast('分類目錄、商品名稱、商品資材碼、商品售價、商品單位皆為必填', 'error')
    return
  }

  submitting.value = true
  try {
    const res = await $fetch(`/api/shopping-cart/products/${productId}/update`, {
      method: 'POST',
      body: { ...formData }
    })
    showToast(res.ok ? '更新成功' : '更新失敗', res.ok ? 'success' : 'error')
  } catch (err) {
    showToast(err?.data?.statusMessage || '更新失敗', 'error')
  } finally {
    submitting.value = false
  }
}

async function reorderImage(img) {
  try {
    await $fetch(`/api/shopping-cart/products/${productId}/images/reorder`, {
      method: 'POST',
      body: { fieldName: img.sortFieldName, value: img.sortValue }
    })
    showToast('排序已更新')
  } catch (err) {
    showToast('排序更新失敗', 'error')
  }
}

async function deleteImage(img) {
  if (!window.confirm('你確定要刪除嗎？')) return
  try {
    const res = await $fetch(`/api/shopping-cart/products/${productId}/images/${img.picId}/delete`, {
      method: 'POST'
    })
    if (res.ok) {
      images.value = images.value.filter((i) => i.picId !== img.picId)
      showToast('刪除成功')
    } else {
      showToast('刪除失敗', 'error')
    }
  } catch (err) {
    showToast(err?.data?.statusMessage || '刪除失敗', 'error')
  }
}

onMounted(loadData)
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

.sc-empty-hint {
  padding: 40px 0;
  text-align: center;
  color: #999;
  font-size: 14px;
  border: 1px dashed #ddd;
  border-radius: 4px;
}

.sc-empty-hint-small {
  padding: 16px 0;
  border: none;
}

.sc-panel {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 20px;
  overflow: hidden;
  max-width: 720px;
}

.sc-panel-heading {
  background: #f5f5f5;
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sc-add-image-link {
  font-weight: normal;
  font-size: 13px;
  color: #3d7a52;
  text-decoration: none;
}

.sc-add-image-link:hover {
  text-decoration: underline;
}

.sc-panel-body {
  padding: 20px;
}

.sc-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.sc-image-card img {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  display: block;
  border-radius: 4px;
  background: #f5f5f5;
}

.sc-image-controls {
  margin-top: 6px;
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sc-order-input {
  width: 40px;
  text-align: center;
  padding: 3px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.sc-danger-link {
  color: #d9534f;
  text-decoration: none;
  margin-left: auto;
}

.sc-danger-link:hover {
  text-decoration: underline;
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

.sc-btn-preview {
  padding: 8px 20px;
  font-size: 14px;
  background: #2f96b4;
  color: #fff;
  border-radius: 4px;
  text-decoration: none;
}

.sc-btn-preview:hover {
  background: #267a94;
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
