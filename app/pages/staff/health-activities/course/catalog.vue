<script setup>
// 專案 holy-mother-farm 位置 staff/health-activities/course/catalog.vue
import { useCourseCatalogStore } from '~/stores/courseCatalog.js'

definePageMeta({ layout: 'staff', requiredPermission: 'health-activities.course' })

const store = useCourseCatalogStore()
const loading = ref(true)
const saving = ref(false)

const toast = reactive({ show: false, message: '', error: false })
const showToast = (msg, error = false) => {
  toast.message = msg; toast.error = error; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

onMounted(async () => {
  loading.value = true
  await store.fetchCatalogs()
  loading.value = false
})

const modal = reactive({ show: false, mode: 'add' })
const form = reactive({ id: '', name: '', coach: '', content: '' })

const openAdd = () => {
  Object.assign(form, { id: '', name: '', coach: '', content: '' })
  modal.mode = 'add'
  modal.show = true
}
const openEdit = (c) => {
  Object.assign(form, { id: c.id, name: c.name, coach: c.coach, content: c.content })
  modal.mode = 'edit'
  modal.show = true
}
const save = async () => {
  if (!form.name.trim()) { showToast('請填寫課程名稱', true); return }
  saving.value = true
  try {
    if (modal.mode === 'add') {
      await store.addCatalog(form.name, form.coach, form.content)
    } else {
      await store.updateCatalog(form.id, form.name, form.coach, form.content)
    }
    showToast('已儲存')
    modal.show = false
  } catch {
    showToast('儲存失敗', true)
  } finally {
    saving.value = false
  }
}

const showDeleteConfirm = ref(false)
const deleteTarget = reactive({ id: '', name: '' })
const askRemove = (c) => { deleteTarget.id = c.id; deleteTarget.name = c.name; showDeleteConfirm.value = true }
const confirmRemove = async () => {
  try {
    await store.removeCatalog(deleteTarget.id)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗', true)
  } finally {
    showDeleteConfirm.value = false
  }
}
</script>

<template>
  <div class="min-h-full" style="background: var(--surface2)">
    <div class="max-w-4xl mx-auto px-4 py-6">
      <NuxtLink
        to="/staff/health-activities/course"
        class="text-sm mb-4 inline-block"
        style="color: var(--text-hint)"
      >
        ← 返回課程列表
      </NuxtLink>

      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color: var(--text-base)">課程管理</h1>
          <p class="text-sm mt-1" style="color: var(--text-hint)">設定課程名稱／教師／上課內容，新增報名表時可以直接選用</p>
        </div>
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style="background: var(--accent)"
          @click="openAdd"
        >
          ＋ 新增課程
        </button>
      </div>

      <div v-if="loading" class="text-center py-16" style="color: var(--text-hint)">載入中…</div>
      <div v-else-if="!store.catalogs.length" class="text-center py-16" style="color: var(--text-hint)">
        還沒有設定任何課程
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="c in store.catalogs"
          :key="c.id"
          class="rounded-2xl border p-4 flex flex-col"
          style="background: var(--surface); border-color: var(--border-light)"
        >
          <div class="font-bold mb-1" style="color: var(--text-base)">{{ c.name }}</div>
          <div v-if="c.coach" class="text-xs mb-2" style="color: var(--accent)">教師：{{ c.coach }}</div>
          <p class="text-sm flex-1" style="color: var(--text-muted)">{{ c.content || '（未填寫上課內容）' }}</p>
          <div class="flex items-center justify-end gap-3 text-xs pt-3 mt-3" style="border-top: 1px solid var(--border-light)">
            <button style="color: var(--accent)" @click="openEdit(c)">編輯</button>
            <button class="text-red-500" @click="askRemove(c)">刪除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/編輯 Modal -->
    <div v-if="modal.show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="modal.show = false">
      <div class="w-full max-w-sm rounded-2xl p-5" style="background: var(--surface)">
        <h2 class="font-bold mb-3" style="color: var(--text-base)">{{ modal.mode === 'add' ? '新增課程' : '編輯課程' }}</h2>

        <label class="block text-xs mb-1" style="color: var(--text-hint)">課程名稱</label>
        <input v-model="form.name" type="text" class="w-full border rounded-lg px-3 py-2 mb-3" style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)">

        <label class="block text-xs mb-1" style="color: var(--text-hint)">教師</label>
        <input v-model="form.coach" type="text" class="w-full border rounded-lg px-3 py-2 mb-3" style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)">

        <label class="block text-xs mb-1" style="color: var(--text-hint)">上課內容</label>
        <textarea v-model="form.content" rows="3" class="w-full border rounded-lg px-3 py-2 mb-4" style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)" />

        <div class="flex gap-2">
          <button class="flex-1 py-2 rounded-lg border text-sm" style="border-color: var(--border-light); color: var(--text-muted)" @click="modal.show = false">取消</button>
          <button class="flex-1 py-2 rounded-lg text-sm text-white" style="background: var(--accent)" :disabled="saving" @click="save">
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 刪除確認 -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="showDeleteConfirm = false">
      <div class="w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
        <p class="text-sm mb-4" style="color: var(--text-base)">確定要刪除「{{ deleteTarget.name }}」嗎？（已建立的報名表不受影響，只是之後無法再從課程管理選用）</p>
        <div class="flex gap-2">
          <button class="flex-1 py-2 rounded-lg border text-sm" style="border-color: var(--border-light); color: var(--text-muted)" @click="showDeleteConfirm = false">取消</button>
          <button class="flex-1 py-2 rounded-lg text-sm text-white bg-red-500" @click="confirmRemove">刪除</button>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="toast.show" class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm text-white z-50" :style="{ background: toast.error ? '#ef4444' : 'var(--accent)' }">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>
