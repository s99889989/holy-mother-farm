<template>
  <div class="sc-order-page">

    <nav class="sc-subnav">
      <NuxtLink to="/front/shopping-cart/products" class="sc-subnav-link sc-active">商品列表</NuxtLink>
      <NuxtLink to="/front/shopping-cart/products/categories" class="sc-subnav-link">商品分類</NuxtLink>
      <NuxtLink to="/front/shopping-cart/products/units" class="sc-subnav-link">商品單位</NuxtLink>
      <NuxtLink to="/front/shopping-cart/products/shipping-fees" class="sc-subnav-link">商品運費</NuxtLink>
    </nav>

    <div class="sc-breadcrumb">
      <span>商品管理</span>
      <span class="sc-sep">/</span>
      <span class="sc-current">{{ activeCategoryName || '商品列表' }}</span>
    </div>

    <p v-if="toast" class="sc-toast" :class="toast.type">{{ toast.message }}</p>
    <p v-if="loadError" class="sc-load-error">{{ loadError }}</p>

    <div class="sc-product-layout">
      <aside class="sc-sidebar">
        <p class="sc-sidebar-title">商品分類</p>
        <ul class="sc-category-list">
          <li v-for="cat in categories" :key="cat.categoryId">
            <a
              href="#"
              class="sc-category-link"
              :class="{ 'sc-active': cat.categoryId === categoryId }"
              @click.prevent="selectCategory(cat.categoryId)"
            >
              {{ cat.name }}
            </a>
          </li>
          <li v-if="!loadingCategories && categories.length === 0" class="sc-category-empty">
            尚無顯示中的分類
          </li>
        </ul>
      </aside>

      <section class="sc-product-main">
        <div class="sc-product-toolbar">
          <NuxtLink
            :to="categoryId ? `/front/shopping-cart/products/add?category=${categoryId}` : '/front/shopping-cart/products/add'"
            class="sc-btn-primary sc-btn-link"
          >
            新增商品
          </NuxtLink>
          <button class="sc-refresh-btn" :disabled="loading" @click="fetchProducts">
            {{ loading ? '更新中…' : '重新整理' }}
          </button>
        </div>

        <div v-if="!categoryId" class="sc-empty-hint">請從左側選擇一個分類查看商品</div>
        <div v-else-if="loading" class="sc-empty-hint">從原網站抓取資料中…</div>
        <div v-else-if="items.length === 0" class="sc-empty-hint">這個分類目前沒有商品</div>

        <div v-else class="sc-product-grid">
          <div v-for="p in items" :key="p.productId" class="sc-product-card">
            <img :src="p.imageUrl" class="sc-product-thumb" alt="" />
            <div class="sc-product-info">
              <div class="sc-product-name">{{ p.name }}</div>
              <div class="sc-product-price">價格：{{ p.price }} 元 / {{ p.unit }}</div>
              <div class="sc-product-actions">
                <NuxtLink :to="`/front/shopping-cart/products/${p.productId}/images`">
                  <i class="fa fa-plus-circle" /> 圖片
                </NuxtLink>
                <NuxtLink :to="`/front/shopping-cart/products/${p.productId}/edit`">
                  <i class="fa fa-pencil-square-o" /> 編輯
                </NuxtLink>
                <a href="#" @click.prevent="copyProduct(p)">
                  <i class="fa fa-files-o" /> 複製
                </a>
                <a href="#" class="sc-danger-link" @click.prevent="deleteProduct(p)">
                  <i class="fa fa-remove" /> 刪除
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/products.get.ts
// 及 products/*），對應原網站 admin_product.php 及 admin_product_CL.php 的
// 商品清單、複製（cp）、刪除（d）動作。
definePageMeta({
  layout: 'shopping-cart'
})

const route = useRoute()
const router = useRouter()

const categories = ref([])
const items = ref([])
const categoryId = ref(typeof route.query.category === 'string' ? route.query.category : '')
const loading = ref(false)
const loadingCategories = ref(false)
const loadError = ref('')
const toast = ref(null)

const activeCategoryName = computed(() => {
  const cat = categories.value.find((c) => c.categoryId === categoryId.value)
  return cat ? cat.name : ''
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

async function fetchProducts() {
  loading.value = true
  if (categories.value.length === 0) loadingCategories.value = true
  loadError.value = ''
  try {
    const res = await $fetch('/api/shopping-cart/products', {
      query: categoryId.value ? { categoryId: categoryId.value } : {}
    })
    categories.value = res.categories ?? []
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
    loadingCategories.value = false
  }
}

function selectCategory(id) {
  categoryId.value = id
  router.replace({ query: { ...route.query, category: id } })
}

watch(categoryId, () => {
  fetchProducts()
})

async function copyProduct(p) {
  if (!window.confirm(`確定要複製「${p.name}」嗎？`)) return
  try {
    const res = await $fetch(`/api/shopping-cart/products/${p.productId}/copy`, {
      method: 'POST',
      body: { categoryId: categoryId.value }
    })
    showToast(res.ok ? '複製成功' : '複製失敗', res.ok ? 'success' : 'error')
    if (res.ok) await fetchProducts()
  } catch (err) {
    showToast(err?.data?.statusMessage || '複製失敗', 'error')
  }
}

async function deleteProduct(p) {
  if (!window.confirm('你確定要刪除嗎？')) return
  try {
    const res = await $fetch(`/api/shopping-cart/products/${p.productId}/delete`, {
      method: 'POST'
    })
    if (res.ok) {
      items.value = items.value.filter((i) => i.productId !== p.productId)
      showToast('刪除成功')
    } else {
      showToast('刪除失敗', 'error')
    }
  } catch (err) {
    showToast(err?.data?.statusMessage || '刪除失敗', 'error')
  }
}

onMounted(fetchProducts)
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

.sc-load-error {
  color: #d9534f;
  font-size: 13px;
  margin: 0 0 10px;
}

.sc-product-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.sc-sidebar {
  width: 180px;
  flex-shrink: 0;
}

.sc-sidebar-title {
  font-size: 13px;
  color: #888;
  margin: 0 0 8px;
}

.sc-category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  text-align: right;
}

.sc-category-list li {
  margin-bottom: 6px;
}

.sc-category-link {
  display: inline-block;
  padding: 4px 0;
  color: #555;
  text-decoration: none;
  font-size: 14px;
}

.sc-category-link:hover {
  color: #3d7a52;
}

.sc-category-link.sc-active {
  color: #3d7a52;
  font-weight: 600;
}

.sc-category-empty {
  color: #aaa;
  font-size: 13px;
}

.sc-product-main {
  flex: 1;
  min-width: 0;
}

.sc-product-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
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

.sc-btn-link {
  text-decoration: none;
  display: inline-block;
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

.sc-empty-hint {
  padding: 40px 0;
  text-align: center;
  color: #999;
  font-size: 14px;
  border: 1px dashed #ddd;
  border-radius: 4px;
}

.sc-product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.sc-product-card {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.sc-product-thumb {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  display: block;
  background: #f5f5f5;
}

.sc-product-info {
  padding: 10px;
}

.sc-product-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-product-price {
  font-size: 12px;
  color: #777;
  margin-bottom: 8px;
}

.sc-product-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}

.sc-product-actions a {
  color: #3d7a52;
  text-decoration: none;
}

.sc-product-actions a:hover {
  text-decoration: underline;
}

.sc-product-actions a.sc-danger-link {
  color: #d9534f;
}
</style>
