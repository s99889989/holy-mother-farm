<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import ShoppingCartRichTextEditor from '~/components/shopping-cart/RichTextEditor.vue'
import { ref, reactive, computed, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/products/[id]/*），
// 對應原網站 admin_product_update.php 及 admin_product_CL.php 的
// act=u / act=pic_d / act=pic_sort 動作。分類/單位下拉選單重用既有 API。
definePageMeta({
  layout: 'staff'
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
      loadError.value = 'unauthorized'
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

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader :title="formData.name ? `${formData.name}-修改商品` : '修改商品'" :show-tabs="false" />

    <div class="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <NuxtLink to="/staff/order/shopping-cart/products" class="text-sm text-green-700 dark:text-green-400 hover:underline">
        ← 返回商品列表
      </NuxtLink>

      <p
        v-if="toast"
        class="text-sm px-4 py-2 rounded-xl"
        :class="toast.type === 'error'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
      >
        {{ toast.message }}
      </p>

      <div v-if="loading" class="border border-dashed border-light-c rounded-xl py-10 text-center text-hint-c text-sm">
        從原網站抓取資料中…
      </div>
      <div v-else-if="loadError === 'unauthorized'" class="bg-surface rounded-xl border border-light-c p-6 text-center space-y-3">
        <p class="text-muted-c text-sm">尚未登入購物車後台。</p>
        <NuxtLink to="/staff/order/shopping-cart/login" class="inline-block px-4 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 transition-colors">
          前往登入購物車後台
        </NuxtLink>
      </div>
      <p v-else-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

      <template v-else>
        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c flex items-center justify-between">
            商品圖片
            <NuxtLink :to="`/staff/order/shopping-cart/products/${productId}/images`" class="font-normal text-green-700 dark:text-green-400 hover:underline">
              <i class="fa fa-plus-circle" /> 新增圖片
            </NuxtLink>
          </div>
          <div class="p-4">
            <div v-if="images.length === 0" class="text-sm text-hint-c py-2">尚未上傳圖片</div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div v-for="img in images" :key="img.picId">
                <img :src="img.imageUrl" class="w-full aspect-[3/2] object-cover rounded-lg bg-surface2" alt="">
                <div class="mt-1.5 text-xs text-muted-c flex items-center gap-1.5">
                  排序
                  <input v-model="img.sortValue" type="text" class="w-10 text-center px-1 py-0.5 rounded border border-light-c bg-surface text-base-c" @change="reorderImage(img)">
                  <a href="#" class="ml-auto text-red-600 dark:text-red-400 hover:underline" @click.prevent="deleteImage(img)">刪除</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">商品資訊</div>
          <div class="p-4 space-y-3.5">
            <div class="flex items-center gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>分類目錄</span>
              <select v-model="formData.categoryId" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
                <option value="">請選擇</option>
                <option v-for="opt in categoryOptions" :key="opt.categoryId" :value="opt.categoryId">{{ opt.name }}</option>
              </select>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>商品名稱</span>
              <input v-model="formData.name" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>商品資材碼</span>
              <input v-model="formData.no" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right">商品定價</span>
              <input v-model="formData.originalPrice" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>商品售價</span>
              <input v-model="formData.price" type="text" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>商品單位</span>
              <select v-model="formData.unit" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
                <option value="">請選擇</option>
                <option v-for="opt in unitOptions" :key="opt.unitId" :value="opt.name">{{ opt.name }}</option>
              </select>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right">溫層</span>
              <label class="flex items-center gap-1 text-sm text-base-c mr-3"><input v-model="formData.tempZone" type="radio" value="1"> 常溫</label>
              <label class="flex items-center gap-1 text-sm text-base-c"><input v-model="formData.tempZone" type="radio" value="0"> 低溫</label>
            </div>
            <div class="flex items-center gap-3 flex-wrap">
              <span class="w-24 flex-none text-sm text-muted-c text-right">是否可訂購</span>
              <label class="flex items-center gap-1 text-sm text-base-c"><input v-model="formData.orderable" type="radio" value="1"> 可訂購</label>
              <label class="flex items-center gap-1 text-sm text-base-c"><input v-model="formData.orderable" type="radio" value="0"> 缺貨中</label>
              <label class="flex items-center gap-1 text-sm text-base-c"><input v-model="formData.orderable" type="radio" value="2"> 季節限定</label>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right">顯示或隱藏</span>
              <label class="flex items-center gap-1 text-sm text-base-c mr-3"><input v-model="formData.visible" type="radio" value="1"> 顯示</label>
              <label class="flex items-center gap-1 text-sm text-base-c"><input v-model="formData.visible" type="radio" value="0"> 隱藏</label>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right">商品排序</span>
              <input v-model="formData.sort" type="text" class="w-20 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
            </div>
            <div class="flex items-start gap-3">
              <span class="w-24 flex-none text-sm text-muted-c text-right pt-2">詳細描述</span>
              <ShoppingCartRichTextEditor v-model="formData.description" class="flex-1" />
            </div>

            <div class="flex gap-2 pt-1 pl-[108px]">
              <button :disabled="submitting" class="px-6 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors" @click="submitForm">
                {{ submitting ? '送出中…' : '更新商品' }}
              </button>
              <a :href="previewUrl" target="_blank" rel="noopener" class="px-6 py-2 text-sm bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors">
                預覽
              </a>
              <NuxtLink to="/staff/order/shopping-cart/products" class="px-6 py-2 text-sm border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors">
                返回
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
