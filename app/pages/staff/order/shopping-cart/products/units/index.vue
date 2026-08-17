<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import ScProductsTabs from '~/components/shopping-cart/ScProductsTabs.vue'
import { ref, reactive, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/product-units.get.ts
// 及 product-units/*），對應原網站 admin_product_unit.php 及
// admin_product_CL.php 的 unit_a / unit_u / unit_order / unit_d 動作。
definePageMeta({
  layout: 'staff'
})

const items = ref([])
const loading = ref(false)
const loadError = ref('')
const actingId = ref(null)
const submitting = ref(false)
const toast = ref(null)

const editingId = ref(null)

const formData = reactive({
  name: ''
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

function resetForm() {
  formData.name = ''
}

async function fetchUnits() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch('/api/shopping-cart/product-units')
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
  }
}

async function startEdit(unit) {
  editingId.value = unit.unitId
  try {
    const data = await $fetch(`/api/shopping-cart/product-units/${unit.unitId}/edit`)
    formData.name = data.name
  } catch (err) {
    showToast(err?.data?.statusMessage || '讀取單位資料失敗', 'error')
    editingId.value = null
  }
}

function cancelEdit() {
  editingId.value = null
  resetForm()
}

async function submitForm() {
  if (!formData.name) {
    showToast('請輸入單位名稱', 'error')
    return
  }

  submitting.value = true
  try {
    if (editingId.value) {
      const res = await $fetch(`/api/shopping-cart/product-units/${editingId.value}/update`, {
        method: 'POST',
        body: { name: formData.name }
      })
      showToast(res.ok ? '更新成功' : '更新失敗', res.ok ? 'success' : 'error')
    } else {
      const res = await $fetch('/api/shopping-cart/product-units/create', {
        method: 'POST',
        body: { name: formData.name }
      })
      showToast(res.ok ? '新增成功' : '新增失敗', res.ok ? 'success' : 'error')
    }
    editingId.value = null
    resetForm()
    await fetchUnits()
  } catch (err) {
    showToast(err?.data?.statusMessage || '處理失敗', 'error')
  } finally {
    submitting.value = false
  }
}

async function reorder(unit) {
  try {
    await $fetch(`/api/shopping-cart/product-units/${unit.unitId}/reorder`, {
      method: 'POST',
      body: { fieldName: unit.orderFieldName, value: unit.orderValue }
    })
    showToast('順序已更新')
  } catch (err) {
    showToast('順序更新失敗', 'error')
  }
}

async function deleteUnit(unit) {
  if (!window.confirm('你確定要刪除嗎？')) return
  actingId.value = unit.unitId
  try {
    const res = await $fetch(`/api/shopping-cart/product-units/${unit.unitId}/delete`, {
      method: 'POST'
    })
    if (res.ok) {
      items.value = items.value.filter((u) => u.unitId !== unit.unitId)
      if (editingId.value === unit.unitId) cancelEdit()
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

onMounted(fetchUnits)
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader title="商品單位" />
    <ScProductsTabs active="units" />

    <div class="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
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
            {{ editingId ? '編輯單位' : '新增單位' }}
          </div>
          <div class="p-4 flex flex-wrap items-center gap-2.5">
            <input v-model="formData.name" type="text" placeholder="單位名稱" class="px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400 min-w-[200px]">
            <button :disabled="submitting" class="px-5 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors" @click="submitForm">
              {{ submitting ? '處理中…' : editingId ? '更新' : '新增' }}
            </button>
            <button v-if="editingId" class="px-5 py-2 text-sm border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors" @click="cancelEdit">
              取消編輯
            </button>
          </div>
        </div>

        <p v-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

        <button class="px-4 py-2 text-sm border border-green-700 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors" :disabled="loading" @click="fetchUnits">
          {{ loading ? '更新中…' : '重新整理' }}
        </button>

        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-surface2 text-hint-c text-xs uppercase tracking-wide">
                <tr>
                  <th class="px-3 py-2 text-center">序號</th>
                  <th class="px-3 py-2 text-center">單位名稱</th>
                  <th class="px-3 py-2 text-center">順序號</th>
                  <th class="px-3 py-2 text-center">編輯</th>
                  <th class="px-3 py-2 text-center">刪除</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-light-c">
                <tr v-if="loading">
                  <td colspan="5" class="px-3 py-8 text-center text-hint-c">從原網站抓取資料中…</td>
                </tr>
                <tr v-else-if="items.length === 0">
                  <td colspan="5" class="px-3 py-8 text-center text-hint-c">查無資料</td>
                </tr>
                <tr
                  v-for="unit in items"
                  :key="unit.unitId"
                  class="hover-surface2"
                  :class="{ 'bg-amber-50 dark:bg-amber-900/10': editingId === unit.unitId }"
                >
                  <td class="px-3 py-2 text-center text-hint-c">{{ unit.seq }}</td>
                  <td class="px-3 py-2 text-center text-base-c">{{ unit.name }}</td>
                  <td class="px-3 py-2 text-center">
                    <input v-model="unit.orderValue" type="text" class="w-14 text-center px-1 py-1 rounded border border-light-c bg-surface text-base-c" @change="reorder(unit)">
                  </td>
                  <td class="px-3 py-2 text-center">
                    <a href="#" class="text-green-700 dark:text-green-400 hover:underline" @click.prevent="startEdit(unit)">編輯</a>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button
                      class="px-2.5 py-1 text-xs rounded-lg border border-red-300 text-red-600 dark:text-red-400 dark:border-red-800/50 disabled:opacity-50"
                      :disabled="actingId === unit.unitId"
                      @click="deleteUnit(unit)"
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
          「新增」「編輯」「刪除」都透過本站代理直接處理，不用另外登入原後台。
        </p>
      </template>
    </div>
  </div>
</template>
