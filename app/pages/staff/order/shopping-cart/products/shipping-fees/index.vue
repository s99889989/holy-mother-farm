<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import ScProductsTabs from '~/components/shopping-cart/ScProductsTabs.vue'
import { ref, reactive, computed, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/shipping-fees.get.ts
// 及 shipping-fees/*），對應原網站 a_pricehome.php 及 a_pricehome_CL.php 的
// add / update / delete / state 動作（這頁原本就是 JSON API，比其他舊頁單純）。
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
      loadError.value = 'unauthorized'
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

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader title="商品運費" />
    <ScProductsTabs active="shipping-fees" />

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

      <div v-if="loadError === 'unauthorized'" class="bg-surface rounded-xl border border-light-c p-6 text-center space-y-3">
        <p class="text-muted-c text-sm">尚未登入購物車後台。</p>
        <NuxtLink to="/staff/order/shopping-cart/login" class="inline-block px-4 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 transition-colors">
          前往登入購物車後台
        </NuxtLink>
      </div>

      <template v-else>
        <div class="bg-surface rounded-xl border border-light-c overflow-hidden max-w-md">
          <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">
            {{ editingId ? '編輯運費' : '新增運費' }}
          </div>
          <div class="p-4 space-y-3">
            <div class="flex items-center gap-3">
              <span class="w-16 flex-none text-sm text-muted-c">溫層</span>
              <select v-model="formData.temp" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
                <option value="1">常溫</option>
                <option value="0">低溫</option>
              </select>
            </div>
            <div v-if="!isEditingBaseFee" class="flex items-center gap-3">
              <span class="w-16 flex-none text-sm text-muted-c">金額</span>
              <input v-model.number="formData.price" type="number" min="0" step="1" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
            </div>
            <div class="flex items-center gap-3">
              <span class="w-16 flex-none text-sm text-muted-c">運費</span>
              <input v-model.number="formData.pricehome" type="number" min="0" step="1" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
            </div>
            <div v-if="!isEditingBaseFee" class="flex items-center gap-3">
              <span class="w-16 flex-none text-sm text-muted-c">停/啟用</span>
              <select v-model="formData.state" class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c">
                <option value="1">啟用</option>
                <option value="0">停用</option>
              </select>
            </div>
            <div class="flex gap-2 pt-1">
              <button :disabled="submitting" class="px-5 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors" @click="submitForm">
                {{ submitting ? '處理中…' : editingId ? '更新' : '新增' }}
              </button>
              <button v-if="editingId" class="px-5 py-2 text-sm border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors" @click="cancelEdit">
                取消
              </button>
            </div>
          </div>
        </div>

        <p v-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

        <button class="px-4 py-2 text-sm border border-green-700 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors" :disabled="loading" @click="fetchFees">
          {{ loading ? '更新中…' : '重新整理' }}
        </button>

        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-surface2 text-hint-c text-xs uppercase tracking-wide">
                <tr>
                  <th class="px-3 py-2 text-center">序號</th>
                  <th class="px-3 py-2 text-center">溫層</th>
                  <th class="px-3 py-2 text-center">金額</th>
                  <th class="px-3 py-2 text-center">運費</th>
                  <th class="px-3 py-2 text-center">停啟用</th>
                  <th class="px-3 py-2 text-center">修改</th>
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
                <tr v-for="fee in items" :key="fee.phId" class="hover-surface2">
                  <td class="px-3 py-2 text-center text-hint-c">{{ fee.seq }}</td>
                  <td class="px-3 py-2 text-center text-base-c">{{ fee.temp }}</td>
                  <td class="px-3 py-2 text-center text-base-c">
                    {{ fee.isBaseFee ? '基本運費不設定金額' : fee.price }}
                  </td>
                  <td class="px-3 py-2 text-center text-base-c">{{ fee.pricehome }}元</td>
                  <td class="px-3 py-2 text-center">
                    <span v-if="fee.isBaseFee" class="inline-block px-2.5 py-1 rounded-full text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                      基本運費
                    </span>
                    <button
                      v-else
                      class="px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-50"
                      :class="fee.state === '1' ? 'border-green-600 text-green-700 dark:text-green-400' : 'border-light-c text-hint-c'"
                      :disabled="actingId === fee.phId"
                      @click="toggleState(fee)"
                    >
                      {{ fee.state === '1' ? '啟用' : '停用' }}
                    </button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button class="px-2.5 py-1 text-xs rounded-lg border border-light-c text-muted-c hover-surface2" @click="startEdit(fee)">修改</button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button
                      v-if="fee.canDelete"
                      class="px-2.5 py-1 text-xs rounded-lg border border-red-300 text-red-600 dark:text-red-400 dark:border-red-800/50 disabled:opacity-50"
                      :disabled="actingId === fee.phId"
                      @click="deleteFee(fee)"
                    >
                      刪除
                    </button>
                    <span v-else class="text-xs text-hint-c">不可刪除</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
