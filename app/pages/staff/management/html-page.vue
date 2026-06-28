<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="max-w-2xl mx-auto flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0"
               style="font-size:14px">📄</div>
          <h1 class="font-bold text-base-c leading-none" style="font-size:15px">HTML 頁面管理</h1>
        </div>
        <button @click="openAdd"
                class="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-xl font-semibold transition-colors hover:bg-green-800"
                style="font-size:13px">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          上傳 HTML
        </button>
      </div>
    </header>

    <!-- 內容區 -->
    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="text-center py-8 text-hint-c" style="font-size:13px">載入中...</div>

      <template v-else>

        <!-- 空狀態 -->
        <div v-if="pageList.length === 0"
             class="bg-surface rounded-2xl border border-light-c px-4 py-10 text-center text-hint-c shadow-sm">
          <p style="font-size:13px">目前沒有頁面，點「上傳 HTML」開始新增</p>
        </div>

        <!-- 列表 -->
        <div v-else class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
          <div v-for="(page, idx) in pageList" :key="page.slug">
            <div class="flex items-center gap-3 px-4 py-3">
              <div class="text-xl flex-shrink-0">📄</div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-base-c truncate" style="font-size:14px">{{ page.title }}</p>
                <p class="text-hint-c font-mono truncate mt-0.5" style="font-size:11px">/html/{{ page.slug }}</p>
              </div>
              <div class="flex gap-1.5 flex-none">
                <button @click="openInTab(page.slug)"
                        class="px-2 py-1 rounded-lg border border-light-c text-hint-c hover-surface2 transition-colors"
                        style="font-size:12px">查看</button>
                <button @click="copyUrl(page.slug)"
                        class="px-2 py-1 rounded-lg border border-light-c text-hint-c hover-surface2 transition-colors"
                        style="font-size:12px">複製</button>
                <button @click="openEdit(page)"
                        class="px-2 py-1 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                        style="font-size:12px">編輯</button>
                <button @click="confirmDelete(page)"
                        class="px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                        style="font-size:12px">刪除</button>
              </div>
            </div>
            <div v-if="idx < pageList.length - 1"
                 class="border-b border-dashed border-light-c mx-4"></div>
          </div>
        </div>

      </template>
    </div>

    <!-- ════ 新增 / 編輯 Modal ════ -->
    <div v-if="modal.show"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-screen sm:max-h-[90vh] overflow-y-auto">

        <div class="px-5 py-4 border-b border-light-c flex items-center justify-between sticky top-0 bg-surface z-10">
          <h3 class="font-bold text-base-c" style="font-size:15px">
            {{ modal.mode === 'edit' ? '編輯 HTML 頁面' : '上傳 HTML 頁面' }}
          </h3>
          <button @click="modal.show = false" class="text-hint-c hover:text-base-c p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-5 py-4 space-y-4">

          <!-- 標題 -->
          <div>
            <label class="text-hint-c font-semibold block mb-1" style="font-size:12px">頁面標題 *</label>
            <input v-model="form.title" placeholder="顯示用的標題"
                   class="w-full px-3 py-2 rounded-xl border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-green-600"
                   style="font-size:14px"/>
          </div>

          <!-- Slug -->
          <div>
            <label class="text-hint-c font-semibold block mb-1" style="font-size:12px">
              網址代稱 (slug)
              <span v-if="modal.mode === 'add'" class="font-normal">* — 英文、數字、橫線</span>
              <span v-else class="font-normal">— 建立後不可更改</span>
            </label>
            <div class="flex items-center gap-1.5">
              <span class="text-hint-c font-mono whitespace-nowrap" style="font-size:12px">/html/</span>
              <input v-model="form.slug" placeholder="example-page"
                     :disabled="modal.mode === 'edit'"
                     class="flex-1 px-3 py-2 rounded-xl border font-mono outline-none transition-colors"
                     :class="modal.mode === 'edit'
                       ? 'border-light-c bg-surface2 text-hint-c cursor-not-allowed'
                       : 'border-light-c bg-surface2 text-base-c focus:ring-2 focus:ring-green-600'"
                     style="font-size:13px"/>
            </div>
          </div>

          <!-- 檔案 -->
          <div>
            <label class="text-hint-c font-semibold block mb-2" style="font-size:12px">
              HTML 檔案
              <span v-if="modal.mode === 'add'" class="font-normal">*</span>
              <span v-else class="font-normal">— 不選則保留原有內容</span>
            </label>
            <label
              class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
              :class="form.file
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-light-c bg-surface2 hover-surface2'">
              <div class="flex flex-col items-center gap-1 text-center px-4">
                <svg class="w-6 h-6" :class="form.file ? 'text-green-600' : 'text-hint-c'"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/>
                </svg>
                <p v-if="!form.file" class="text-hint-c" style="font-size:12px">
                  點擊選擇 <span class="font-semibold text-green-700">.html</span> 檔案
                </p>
                <p v-else class="font-semibold text-green-700 truncate max-w-xs" style="font-size:12px">
                  {{ fileName }}
                </p>
              </div>
              <input type="file" accept=".html,.htm" class="hidden" @change="onFileChange"/>
            </label>
          </div>

        </div>

        <div class="px-5 py-4 border-t border-light-c flex gap-2 justify-end sticky bottom-0 bg-surface">
          <button @click="modal.show = false"
                  class="px-4 py-2 rounded-xl bg-surface2 text-muted-c hover-surface2 transition-colors"
                  style="font-size:13px">取消</button>
          <button @click="save" :disabled="saving"
                  class="px-4 py-2 rounded-xl bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  style="font-size:13px">
            <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ modal.mode === 'edit' ? '儲存' : '上傳' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 刪除確認 -->
    <div v-if="showDeleteConfirm"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <p class="text-muted-c mb-1" style="font-size:13px">你確定要刪除</p>
        <p class="font-black text-red-500 my-2" style="font-size:18px">{{ deleteTarget.title }}</p>
        <p class="text-muted-c mb-6" style="font-size:13px">嗎？</p>
        <div class="flex justify-center gap-3">
          <button @click="doDelete"
                  class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-semibold"
                  style="font-size:13px">確定刪除</button>
          <button @click="showDeleteConfirm = false"
                  class="px-5 py-2 bg-surface2 text-muted-c rounded-xl hover-surface2 transition-colors"
                  style="font-size:13px">取消</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="toast.show"
           :class="toast.error ? 'bg-red-700' : 'bg-zinc-800'"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50"
           style="font-size:13px">
        <svg class="w-4 h-4 flex-shrink-0" :class="toast.error ? 'text-red-200' : 'text-green-400'"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="!toast.error" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        {{ toast.message }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'staff.files' })

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/html-page'

const loading = ref(false)
const saving  = ref(false)
const pageList = ref([])
const toast    = reactive({ show: false, message: '', error: false })
const modal    = reactive({ show: false, mode: 'add' })
const showDeleteConfirm = ref(false)
const deleteTarget = reactive({ slug: '', title: '' })

const form     = reactive({ slug: '', title: '', file: null })
const fileName = ref('')

const showToast = (msg, error = false) => {
  toast.message = msg
  toast.error   = error
  toast.show    = true
  setTimeout(() => toast.show = false, 2500)
}

const fetchList = async () => {
  loading.value = true
  try {
    pageList.value = await (await fetch(`${BASE()}/list`)).json()
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const openAdd = () => {
  modal.mode = 'add'
  form.slug  = ''; form.title = ''; form.file = null; fileName.value = ''
  modal.show = true
}

const openEdit = (page) => {
  modal.mode  = 'edit'
  form.slug   = page.slug
  form.title  = page.title
  form.file   = null; fileName.value = ''
  modal.show  = true
}

const onFileChange = (e) => {
  const f = e.target.files[0]
  if (!f) return
  form.file = f
  fileName.value = f.name
  if (modal.mode === 'add' && !form.slug) {
    form.slug = f.name.replace(/\.html?$/i, '').replace(/\s+/g, '-').toLowerCase()
  }
}

const save = async () => {
  if (!form.title.trim()) { showToast('請填寫標題', true); return }
  if (modal.mode === 'add') {
    if (!form.slug.trim()) { showToast('請填寫 slug', true); return }
    if (!form.file)        { showToast('請選擇 HTML 檔案', true); return }
    if (!/^[a-z0-9\-_]+$/i.test(form.slug)) { showToast('slug 只能使用英文、數字、橫線', true); return }
  }
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('title', form.title.trim())
    if (modal.mode === 'add') {
      fd.append('slug', form.slug.trim())
      fd.append('file', form.file)
      await fetch(`${BASE()}/upload`, { method: 'POST', body: fd })
    } else {
      if (form.file) fd.append('file', form.file)
      await fetch(`${BASE()}/update/${form.slug}`, { method: 'POST', body: fd })
    }
    showToast(modal.mode === 'edit' ? '儲存成功' : '上傳成功')
    modal.show = false
    await fetchList()
  } catch { showToast('操作失敗', true) }
  finally { saving.value = false }
}

const confirmDelete = (page) => {
  deleteTarget.slug  = page.slug
  deleteTarget.title = page.title
  showDeleteConfirm.value = true
}

const doDelete = async () => {
  await fetch(`${BASE()}/remove/${deleteTarget.slug}`, { method: 'DELETE' })
  showDeleteConfirm.value = false
  showToast('已刪除')
  await fetchList()
}

const copyUrl = (slug) => {
  navigator.clipboard.writeText(`${window.location.origin}/html/${slug}`)
  showToast('網址已複製')
}

const openInTab = (slug) => window.open(`/html/${slug}`, '_blank')

onMounted(fetchList)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; transform: translateY(8px); }
</style>
