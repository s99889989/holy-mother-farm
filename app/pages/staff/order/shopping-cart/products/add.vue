<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import ShoppingCartRichTextEditor from '~/components/shopping-cart/RichTextEditor.vue'
import { ref, reactive, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/products/create.post.ts），
// 對應原網站 admin_product_add.php 及 admin_product_CL.php?act=a。
// 分類/單位下拉選單直接重用既有的 product-categories、product-units API
// （分類只列「顯示中」的，跟原網站 admin_product_add.php 一致）。
definePageMeta({
  layout: 'staff'
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
      await navigateTo('/staff/order/shopping-cart/login')
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
      await navigateTo(`/staff/order/shopping-cart/products?category=${formData.categoryId}`)
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

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader title="新增商品" :show-tabs="false" />

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
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
      <p v-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

      <div class="bg-surface rounded-xl border border-light-c p-5 space-y-3.5">
        <div class="flex items-center gap-3">
          <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>分類目錄</span>
          <select v-model="formData.categoryId" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
            <option value="">請選擇</option>
            <option v-for="opt in categoryOptions" :key="opt.categoryId" :value="opt.categoryId">{{ opt.name }}</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>商品名稱</span>
          <input v-model="formData.name" type="text" placeholder="商品名稱" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
        </div>
        <div class="flex items-center gap-3">
          <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>商品資材碼</span>
          <input v-model="formData.no" type="text" placeholder="商品資材碼" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
        </div>
        <div class="flex items-center gap-3">
          <span class="w-24 flex-none text-sm text-muted-c text-right">商品定價</span>
          <input v-model="formData.originalPrice" type="text" placeholder="商品定價" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
        </div>
        <div class="flex items-center gap-3">
          <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>商品售價</span>
          <input v-model="formData.price" type="text" placeholder="商品售價" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
        </div>
        <div class="flex items-center gap-3">
          <span class="w-24 flex-none text-sm text-muted-c text-right"><span class="text-red-500">*</span>商品單位</span>
          <select v-model="formData.unit" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
            <option value="">請選擇</option>
            <option v-for="opt in unitOptions" :key="opt.unitId" :value="opt.name">{{ opt.name }}</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-24 flex-none text-sm text-muted-c text-right">溫層</span>
          <label class="flex items-center gap-1 text-sm text-base-c mr-3"><input v-model="formData.tempZone" type="radio" value="1"> 常溫</label>
          <label class="flex items-center gap-1 text-sm text-base-c"><input v-model="formData.tempZone" type="radio" value="0"> 低溫</label>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-24 flex-none text-sm text-muted-c text-right">商品排序</span>
          <input v-model="formData.sort" type="text" class="w-20 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
        </div>
        <div class="flex items-start gap-3">
          <span class="w-24 flex-none text-sm text-muted-c text-right pt-2">詳細描述</span>
          <ShoppingCartRichTextEditor v-model="formData.description" class="flex-1" />
        </div>

        <p class="text-xs text-red-500 pl-[108px]">在新增商品之後，請記得到商品管理頁面，點選（圖片）按鈕上傳圖片</p>

        <div class="flex gap-2 pl-[108px]">
          <button :disabled="submitting" class="px-6 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors" @click="submitForm">
            {{ submitting ? '送出中…' : '新增商品' }}
          </button>
          <NuxtLink to="/staff/order/shopping-cart/products" class="px-6 py-2 text-sm border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors">
            取消
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
