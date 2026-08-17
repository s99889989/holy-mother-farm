<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import ScProductsTabs from '~/components/shopping-cart/ScProductsTabs.vue'
import { ref, computed, onMounted, watch } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/products.get.ts
// 及 products/*），對應原網站 admin_product.php 及 admin_product_CL.php 的
// 商品清單、複製（cp）、刪除（d）動作。
definePageMeta({
  layout: 'staff'
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
      await navigateTo('/staff/order/shopping-cart/login')
      return
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

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader title="商品管理" />
    <ScProductsTabs active="list" />

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <div class="text-xs text-hint-c">商品管理 / {{ activeCategoryName || '商品列表' }}</div>

      <p
        v-if="toast"
        class="text-sm px-4 py-2 rounded-xl"
        :class="toast.type === 'error'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
      >
        {{ toast.message }}
      </p>

      <p v-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

      <div v-else class="flex flex-col lg:flex-row gap-6 items-start">
        <aside class="w-full lg:w-48 flex-shrink-0">
          <p class="text-xs text-hint-c mb-2">商品分類</p>
          <ul class="space-y-1.5 text-right lg:text-left">
            <li v-for="cat in categories" :key="cat.categoryId">
              <a
                href="#"
                class="inline-block py-1 text-sm transition-colors"
                :class="cat.categoryId === categoryId ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-muted-c hover:text-green-700 dark:hover:text-green-400'"
                @click.prevent="selectCategory(cat.categoryId)"
              >
                {{ cat.name }}
              </a>
            </li>
            <li v-if="!loadingCategories && categories.length === 0" class="text-hint-c text-sm">
              尚無顯示中的分類
            </li>
          </ul>
        </aside>

        <section class="flex-1 min-w-0 w-full">
          <div class="flex items-center gap-3 mb-4">
            <NuxtLink
              :to="categoryId ? `/staff/order/shopping-cart/products/add?category=${categoryId}` : '/staff/order/shopping-cart/products/add'"
              class="px-4 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 transition-colors"
            >
              新增商品
            </NuxtLink>
            <button
              class="px-4 py-2 text-sm border border-green-700 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors"
              :disabled="loading"
              @click="fetchProducts"
            >
              {{ loading ? '更新中…' : '重新整理' }}
            </button>
          </div>

          <div v-if="!categoryId" class="border border-dashed border-light-c rounded-xl py-10 text-center text-hint-c text-sm">
            請從左側選擇一個分類查看商品
          </div>
          <div v-else-if="loading" class="border border-dashed border-light-c rounded-xl py-10 text-center text-hint-c text-sm">
            從原網站抓取資料中…
          </div>
          <div v-else-if="items.length === 0" class="border border-dashed border-light-c rounded-xl py-10 text-center text-hint-c text-sm">
            這個分類目前沒有商品
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            <div v-for="p in items" :key="p.productId" class="bg-surface rounded-xl border border-light-c overflow-hidden">
              <img :src="p.imageUrl" class="w-full aspect-[3/2] object-cover bg-surface2" alt="">
              <div class="p-2.5">
                <div class="text-sm font-medium text-base-c truncate">{{ p.name }}</div>
                <div class="text-xs text-hint-c mb-2">價格：{{ p.price }} 元 / {{ p.unit }}</div>
                <div class="flex flex-wrap gap-2 text-xs">
                  <NuxtLink :to="`/staff/order/shopping-cart/products/${p.productId}/images`" class="text-green-700 dark:text-green-400 hover:underline">
                    <i class="fa fa-plus-circle" /> 圖片
                  </NuxtLink>
                  <NuxtLink :to="`/staff/order/shopping-cart/products/${p.productId}/edit`" class="text-green-700 dark:text-green-400 hover:underline">
                    <i class="fa fa-pencil-square-o" /> 編輯
                  </NuxtLink>
                  <a href="#" class="text-green-700 dark:text-green-400 hover:underline" @click.prevent="copyProduct(p)">
                    <i class="fa fa-files-o" /> 複製
                  </a>
                  <a href="#" class="text-red-600 dark:text-red-400 hover:underline" @click.prevent="deleteProduct(p)">
                    <i class="fa fa-remove" /> 刪除
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
