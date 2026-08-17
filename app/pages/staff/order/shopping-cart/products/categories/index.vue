<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import ScProductsTabs from '~/components/shopping-cart/ScProductsTabs.vue'
import { ref, reactive, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/product-categories.get.ts
// 及 product-categories/*），對應原網站 admin_product_class.php 及
// admin_product_CL.php 的 class_a / class_u / class_on / class_order / class_d 動作。
// 編輯跟新增共用同一個表單區塊（跟原網站一樣：admin_product_class.php?act=u&sn={id}
// 只是把新增表單預填成該筆資料），透過 editingId 是否有值來切換模式。
definePageMeta({
  layout: 'staff'
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
      await navigateTo('/staff/order/shopping-cart/login')
      return
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

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader title="商品分類" />
    <ScProductsTabs active="categories" />

    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <p
        v-if="toast"
        class="text-sm px-4 py-2 rounded-xl"
        :class="toast.type === 'error'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
      >
        {{ toast.message }}
      </p>

      <template>
        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">
            {{ editingId ? '編輯分類' : '新增分類' }}
          </div>
          <div class="p-4 flex flex-wrap items-center gap-2.5">
            <input v-model="formData.name" type="text" placeholder="分類名稱" class="px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400 min-w-[200px]">
            <select v-model="formData.feeGroup" class="px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
              <option v-for="opt in feeGroupOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <button :disabled="submitting" class="px-5 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors" @click="submitForm">
              {{ submitting ? '處理中…' : editingId ? '更新' : '新增' }}
            </button>
            <button v-if="editingId" class="px-5 py-2 text-sm border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors" @click="cancelEdit">
              取消編輯
            </button>
          </div>
        </div>

        <p v-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

        <button class="px-4 py-2 text-sm border border-green-700 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors" :disabled="loading" @click="fetchCategories">
          {{ loading ? '更新中…' : '重新整理' }}
        </button>

        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-surface2 text-hint-c text-xs uppercase tracking-wide">
                <tr>
                  <th class="px-3 py-2 text-center">排序</th>
                  <th class="px-3 py-2 text-center">分類名稱</th>
                  <th class="px-3 py-2 text-center">順序號</th>
                  <th class="px-3 py-2 text-center">運費群組</th>
                  <th class="px-3 py-2 text-center">顯示或隱藏</th>
                  <th class="px-3 py-2 text-center">編輯</th>
                  <th class="px-3 py-2 text-center">刪除</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-light-c">
                <tr v-if="loading">
                  <td colspan="7" class="px-3 py-8 text-center text-hint-c">從原網站抓取資料中…</td>
                </tr>
                <tr v-else-if="items.length === 0">
                  <td colspan="7" class="px-3 py-8 text-center text-hint-c">查無資料</td>
                </tr>
                <tr
                  v-for="cat in items"
                  :key="cat.categoryId"
                  class="hover-surface2"
                  :class="{ 'bg-amber-50 dark:bg-amber-900/10': editingId === cat.categoryId }"
                >
                  <td class="px-3 py-2 text-center text-hint-c">{{ cat.seq }}</td>
                  <td class="px-3 py-2 text-center text-base-c">{{ cat.name }}</td>
                  <td class="px-3 py-2 text-center">
                    <input v-model="cat.orderValue" type="text" class="w-14 text-center px-1 py-1 rounded border border-light-c bg-surface text-base-c" @change="reorder(cat)">
                  </td>
                  <td class="px-3 py-2 text-center text-base-c">{{ cat.feeGroup }}</td>
                  <td class="px-3 py-2 text-center">
                    <button
                      class="px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-50"
                      :class="cat.visible ? 'border-green-600 text-green-700 dark:text-green-400' : 'border-light-c text-hint-c'"
                      :disabled="actingId === cat.categoryId"
                      @click="toggleVisibility(cat)"
                    >
                      {{ cat.visible ? '顯示' : '隱藏' }}
                    </button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <a href="#" class="text-green-700 dark:text-green-400 hover:underline" @click.prevent="startEdit(cat)">編輯</a>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button
                      class="px-2.5 py-1 text-xs rounded-lg border border-red-300 text-red-600 dark:text-red-400 dark:border-red-800/50 disabled:opacity-50"
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
        </div>

        <p class="text-xs text-hint-c">
          「新增」「編輯」「顯示/隱藏」「刪除」都透過本站代理直接處理，不用另外登入原後台。
        </p>
      </template>
    </div>
  </div>
</template>
