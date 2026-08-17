<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import { ref, reactive, computed, onMounted } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/managers.get.ts
// 及 managers/create.post.ts、managers/[id]/*），對應原網站 admin_manager.php
// 及 admin_manager_CL.php 的新增/停啟用/刪除動作。
definePageMeta({
  layout: 'staff'
})

const rawManagers = ref([])
const loading = ref(false)
const loadError = ref('')
const actingId = ref(null)
const submitting = ref(false)
const keyword = ref('')
const toast = ref(null)

const editingId = ref(null)

const formData = reactive({
  account: '',
  password: '',
  name: '',
  note: ''
})

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

function resetForm() {
  formData.account = ''
  formData.password = ''
  formData.name = ''
  formData.note = ''
}

async function fetchManagers() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch('/api/shopping-cart/managers')
    rawManagers.value = res.items ?? []
  } catch (err) {
    rawManagers.value = []
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

const filteredManagers = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return rawManagers.value
  return rawManagers.value.filter((m) =>
    [m.account, m.name, m.note].join(' ').toLowerCase().includes(kw)
  )
})

async function startEdit(manager) {
  editingId.value = manager.managerId
  try {
    const data = await $fetch(`/api/shopping-cart/managers/${manager.managerId}/edit`)
    formData.account = data.account
    formData.password = ''
    formData.name = data.name
    formData.note = data.note
  } catch (err) {
    showToast(err?.data?.statusMessage || '讀取管理員資料失敗', 'error')
    editingId.value = null
  }
}

function cancelEdit() {
  editingId.value = null
  resetForm()
}

async function submitForm() {
  if (!formData.account || !formData.name || (!editingId.value && !formData.password)) {
    showToast('帳號、密碼、姓名為必填', 'error')
    return
  }

  submitting.value = true
  try {
    if (editingId.value) {
      const res = await $fetch(`/api/shopping-cart/managers/${editingId.value}/update`, {
        method: 'POST',
        body: { ...formData }
      })
      showToast(res.ok ? '更新成功' : '更新失敗', res.ok ? 'success' : 'error')
    } else {
      const res = await $fetch('/api/shopping-cart/managers/create', {
        method: 'POST',
        body: { ...formData }
      })
      showToast(res.ok ? '新增成功' : '新增失敗', res.ok ? 'success' : 'error')
    }
    editingId.value = null
    resetForm()
    await fetchManagers()
  } catch (err) {
    showToast(err?.data?.statusMessage || '處理失敗', 'error')
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(manager) {
  actingId.value = manager.managerId
  const targetSw = manager.statusEnabled ? 0 : 1
  try {
    const res = await $fetch(`/api/shopping-cart/managers/${manager.managerId}/toggle-status`, {
      method: 'POST',
      body: { sw: targetSw }
    })
    if (res.ok) manager.statusEnabled = !manager.statusEnabled
  } catch (err) {
    showToast('更新失敗', 'error')
  } finally {
    actingId.value = null
  }
}

async function deleteManager(manager) {
  if (!window.confirm('你確定要刪除嗎？')) return
  actingId.value = manager.managerId
  try {
    const res = await $fetch(`/api/shopping-cart/managers/${manager.managerId}/delete`, {
      method: 'POST'
    })
    if (res.ok) {
      rawManagers.value = rawManagers.value.filter((m) => m.managerId !== manager.managerId)
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

onMounted(fetchManagers)
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader title="管理員設定" />

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

      <p v-if="loadError" class="text-red-600 dark:text-red-400 text-sm">{{ loadError }}</p>

      <template v-else>
        <!-- 新增/編輯管理員 -->
        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="bg-surface2 px-4 py-2.5 font-semibold text-base-c text-sm border-b border-light-c">
            {{ editingId ? '編輯管理員' : '新增管理員' }}
          </div>
          <div class="p-4 space-y-3 max-w-md">
            <div class="space-y-1">
              <label class="text-sm text-muted-c"><span class="text-red-500">*</span>帳號</label>
              <input v-model="formData.account" type="text" placeholder="帳號" class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
            </div>
            <div class="space-y-1">
              <label class="text-sm text-muted-c">
                <span v-if="!editingId" class="text-red-500">*</span>密碼
              </label>
              <input
                v-model="formData.password"
                type="password"
                :placeholder="editingId ? '留空代表不修改密碼' : ''"
                class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
              >
            </div>
            <div class="space-y-1">
              <label class="text-sm text-muted-c"><span class="text-red-500">*</span>姓名</label>
              <input v-model="formData.name" type="text" placeholder="姓名" class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
            </div>
            <div class="space-y-1">
              <label class="text-sm text-muted-c">備註</label>
              <input v-model="formData.note" type="text" class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
            </div>
            <div class="flex gap-2 pt-1">
              <button :disabled="submitting" class="px-5 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors" @click="submitForm">
                {{ submitting ? '處理中…' : editingId ? '更新' : '新增' }}
              </button>
              <button v-if="editingId" class="px-5 py-2 text-sm border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors" @click="cancelEdit">
                取消編輯
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between flex-wrap gap-3">
          <button class="px-4 py-2 text-sm border border-green-700 text-green-700 dark:text-green-400 dark:border-green-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors" :disabled="loading" @click="fetchManagers">
            {{ loading ? '更新中…' : '重新整理' }}
          </button>
          <input v-model="keyword" type="search" placeholder="搜尋：帳號 / 姓名 / 備註…" class="px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400 w-56">
        </div>

        <div class="bg-surface rounded-xl border border-light-c overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-surface2 text-hint-c text-xs uppercase tracking-wide">
                <tr>
                  <th class="px-3 py-2 text-center">序號</th>
                  <th class="px-3 py-2 text-center">帳號</th>
                  <th class="px-3 py-2 text-center">姓名</th>
                  <th class="px-3 py-2 text-center">備註</th>
                  <th class="px-3 py-2 text-center">停啟用</th>
                  <th class="px-3 py-2 text-center">修改</th>
                  <th class="px-3 py-2 text-center">刪除</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-light-c">
                <tr v-if="loading">
                  <td colspan="7" class="px-3 py-8 text-center text-hint-c">從原網站抓取資料中…</td>
                </tr>
                <tr v-else-if="filteredManagers.length === 0">
                  <td colspan="7" class="px-3 py-8 text-center text-hint-c">查無資料</td>
                </tr>
                <tr v-for="manager in filteredManagers" :key="manager.managerId" class="hover-surface2">
                  <td class="px-3 py-2 text-center text-hint-c">{{ manager.seq }}</td>
                  <td class="px-3 py-2 text-center text-base-c">{{ manager.account }}</td>
                  <td class="px-3 py-2 text-center text-base-c">{{ manager.name }}</td>
                  <td class="px-3 py-2 text-center text-base-c">{{ manager.note || '-' }}</td>
                  <td class="px-3 py-2 text-center">
                    <button
                      class="px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-50"
                      :class="manager.statusEnabled
                        ? 'border-green-600 text-green-700 dark:text-green-400'
                        : 'border-light-c text-hint-c'"
                      :disabled="actingId === manager.managerId"
                      @click="toggleStatus(manager)"
                    >
                      {{ manager.statusEnabled ? '啟用' : '停用' }}
                    </button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <a href="#" class="text-green-700 dark:text-green-400 hover:underline" @click.prevent="startEdit(manager)">修改</a>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button
                      class="px-2.5 py-1 text-xs rounded-lg border border-red-300 text-red-600 dark:text-red-400 dark:border-red-800/50 disabled:opacity-50"
                      :disabled="actingId === manager.managerId"
                      @click="deleteManager(manager)"
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
          「新增」「修改」「停啟用」「刪除」都透過本站代理直接處理，不用另外登入原後台。
        </p>
      </template>
    </div>
  </div>
</template>
