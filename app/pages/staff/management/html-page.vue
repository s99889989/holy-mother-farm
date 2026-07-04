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
                <button @click="openContentEditor(page)"
                        class="px-2 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                        style="font-size:12px">編輯內容</button>
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

          <!-- OG 分享圖片 -->
          <div>
            <label class="text-hint-c font-semibold block mb-2" style="font-size:12px">
              分享預覽圖 (OG Image)
              <span class="font-normal">— 不上傳會依標題自動產生</span>
            </label>

            <!-- 現有圖片預覽 (僅編輯模式，且尚未選擇新檔案時顯示) -->
            <div v-if="modal.mode === 'edit' && !form.ogImage && !ogPreviewBroken" class="mb-2 relative">
              <img
                :src="ogPreviewUrl"
                @error="ogPreviewBroken = true"
                class="w-full rounded-xl border border-light-c object-cover"
                style="aspect-ratio: 1200 / 630;"
              />
              <button
                type="button"
                @click="resetOgImage"
                :disabled="resettingOg"
                class="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
                style="font-size:11px"
              >{{ resettingOg ? '重設中...' : '重設為自動產生' }}</button>
            </div>

            <label
              class="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
              :class="form.ogImage
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-light-c bg-surface2 hover-surface2'">
              <div class="flex flex-col items-center gap-1 text-center px-4">
                <svg class="w-5 h-5" :class="form.ogImage ? 'text-green-600' : 'text-hint-c'"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"/>
                </svg>
                <p v-if="!form.ogImage" class="text-hint-c" style="font-size:12px">
                  點擊上傳圖片 <span class="text-hint-c">(選填)</span>
                </p>
                <p v-else class="font-semibold text-green-700 truncate max-w-xs" style="font-size:12px">
                  {{ ogImageName }}
                </p>
              </div>
              <input type="file" accept="image/*" class="hidden" @change="onOgImageChange"/>
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

    <!-- ════ 內容編輯 Modal (編輯／即時預覽) ════ -->
    <div v-if="contentModal.show"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-6xl h-full sm:h-[92vh] flex flex-col overflow-hidden">

        <div class="px-5 py-3 border-b border-light-c flex items-center justify-between flex-none">
          <div class="min-w-0">
            <h3 class="font-bold text-base-c truncate" style="font-size:15px">編輯內容 — {{ contentModal.title }}</h3>
            <p class="text-hint-c font-mono truncate" style="font-size:11px">/html/{{ contentModal.slug }}</p>
          </div>
          <div class="flex items-center gap-2 flex-none">
            <button @click="toggleWysiwyg"
                    class="px-3 py-1.5 rounded-lg border font-semibold transition-colors whitespace-nowrap"
                    :class="editMode === 'wysiwyg'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-light-c text-hint-c hover-surface2'"
                    style="font-size:12px">
              {{ editMode === 'wysiwyg' ? '✓ 點擊編輯中' : '啟用點擊編輯' }}
            </button>
            <button @click="contentModal.show = false" class="text-hint-c hover:text-base-c p-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 手機用頁籤切換編輯／預覽 -->
        <div class="flex lg:hidden border-b border-light-c flex-none">
          <button @click="mobileTab = 'edit'"
                  class="flex-1 py-2 font-semibold transition-colors"
                  :class="mobileTab === 'edit' ? 'text-green-700 border-b-2 border-green-700' : 'text-hint-c'"
                  style="font-size:13px">編輯</button>
          <button @click="mobileTab = 'preview'"
                  class="flex-1 py-2 font-semibold transition-colors"
                  :class="mobileTab === 'preview' ? 'text-green-700 border-b-2 border-green-700' : 'text-hint-c'"
                  style="font-size:13px">預覽</button>
        </div>

        <div v-if="editMode === 'wysiwyg'"
             class="px-5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 flex-none"
             style="font-size:11px">
          點擊右側預覽畫面裡的文字即可直接修改。適合改字、改用詞；大範圍排版調整請先關閉此模式，改用左側原始碼。
        </div>

        <div v-if="contentModal.loading" class="flex-1 flex items-center justify-center text-hint-c" style="font-size:13px">
          載入中...
        </div>

        <div v-else class="flex-1 grid lg:grid-cols-2 overflow-hidden">
          <textarea
            :class="[mobileTab === 'edit' ? 'block' : 'hidden', 'lg:block']"
            v-model="contentModal.content"
            :disabled="editMode === 'wysiwyg'"
            @keydown.tab.prevent="insertTab"
            spellcheck="false"
            class="w-full h-full resize-none outline-none p-4 font-mono bg-surface2 text-base-c border-r border-light-c disabled:opacity-60 disabled:cursor-not-allowed"
            style="font-size:13px; line-height:1.6;"
          ></textarea>
          <iframe
            ref="previewFrame"
            :class="[mobileTab === 'preview' ? 'block' : 'hidden', 'lg:block']"
            :srcdoc="contentModal.content"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            class="w-full h-full border-0"
            title="即時預覽"
            @load="onPreviewLoad"
          ></iframe>
        </div>

        <div class="px-5 py-3 border-t border-light-c flex gap-2 justify-end flex-none">
          <button @click="contentModal.show = false"
                  class="px-4 py-2 rounded-xl bg-surface2 text-muted-c hover-surface2 transition-colors"
                  style="font-size:13px">取消</button>
          <button @click="saveContent" :disabled="savingContent || contentModal.loading"
                  class="px-4 py-2 rounded-xl bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  style="font-size:13px">
            <div v-if="savingContent" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            儲存內容
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
definePageMeta({ layout: 'staff', requiredPermission: 'management.html-page' })

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/html-page'

const loading = ref(false)
const saving  = ref(false)
const pageList = ref([])
const toast    = reactive({ show: false, message: '', error: false })
const modal    = reactive({ show: false, mode: 'add' })
const showDeleteConfirm = ref(false)
const deleteTarget = reactive({ slug: '', title: '' })

const form     = reactive({ slug: '', title: '', file: null, ogImage: null })
const fileName   = ref('')
const ogImageName = ref('')

// OG 圖片預覽相關狀態
const ogPreviewBroken = ref(false)
const ogPreviewVersion = ref(0)
const resettingOg = ref(false)
const ogPreviewUrl = computed(() =>
  `${BASE()}/og-image/${form.slug}?v=${ogPreviewVersion.value}`
)

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
  form.ogImage = null; ogImageName.value = ''
  ogPreviewBroken.value = false
  modal.show = true
}

const openEdit = (page) => {
  modal.mode  = 'edit'
  form.slug   = page.slug
  form.title  = page.title
  form.file   = null; fileName.value = ''
  form.ogImage = null; ogImageName.value = ''
  ogPreviewBroken.value = false
  ogPreviewVersion.value++
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

const onOgImageChange = (e) => {
  const f = e.target.files[0]
  if (!f) return
  form.ogImage = f
  ogImageName.value = f.name
}

const resetOgImage = async () => {
  resettingOg.value = true
  try {
    await fetch(`${BASE()}/og-image/${form.slug}/reset`, { method: 'POST' })
    ogPreviewBroken.value = false
    ogPreviewVersion.value++
    showToast('已重設為自動產生')
  } catch { showToast('重設失敗', true) }
  finally { resettingOg.value = false }
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
    if (form.ogImage) fd.append('ogImage', form.ogImage)
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

// ── 內容編輯（直接在網頁上改 HTML，右側即時預覽） ──────────────
const contentModal = reactive({ show: false, slug: '', title: '', content: '', loading: false })
const mobileTab = ref('edit')
const savingContent = ref(false)
const editMode = ref('code') // 'code' | 'wysiwyg'
const previewFrame = ref(null)

const openContentEditor = async (page) => {
  contentModal.slug    = page.slug
  contentModal.title   = page.title
  contentModal.content = ''
  contentModal.loading = true
  contentModal.show    = true
  mobileTab.value      = 'preview'
  editMode.value       = 'wysiwyg'
  try {
    contentModal.content = await (await fetch(`${BASE()}/content/${page.slug}`)).text()
  } catch {
    showToast('讀取內容失敗', true)
    contentModal.show = false
  } finally {
    contentModal.loading = false
  }
}

// Tab 鍵在編輯器裡插入兩個空格，而不是跳出 textarea
const insertTab = (e) => {
  const ta = e.target
  const start = ta.selectionStart
  const end = ta.selectionEnd
  contentModal.content = contentModal.content.slice(0, start) + '  ' + contentModal.content.slice(end)
  nextTick(() => { ta.selectionStart = ta.selectionEnd = start + 2 })
}

// ── 點擊編輯（讓右側預覽的 iframe 內文直接可編輯） ──────────────
const onPreviewLoad = () => {
  if (editMode.value === 'wysiwyg') enableEditable()
}

const enableEditable = () => {
  const doc = previewFrame.value?.contentDocument
  if (doc?.body) doc.body.contentEditable = 'true'
}

// 把 iframe 裡目前的 DOM 內容讀回 contentModal.content（保留原本的 DOCTYPE）
const syncFromPreview = () => {
  const doc = previewFrame.value?.contentDocument
  if (!doc?.documentElement) return
  const hasDoctype = /^\s*<!DOCTYPE/i.test(contentModal.content)
  contentModal.content = (hasDoctype ? '<!DOCTYPE html>\n' : '') + doc.documentElement.outerHTML
}

const toggleWysiwyg = () => {
  if (editMode.value === 'code') {
    editMode.value = 'wysiwyg'
    enableEditable() // iframe 已經載入好了，直接開啟可編輯，不會重新整理
  } else {
    syncFromPreview() // 離開前先把改動同步回原始碼（會觸發 iframe 重新載入一次，恢復成唯讀預覽）
    editMode.value = 'code'
  }
}

const saveContent = async () => {
  if (editMode.value === 'wysiwyg') syncFromPreview()
  savingContent.value = true
  try {
    const blob = new Blob([contentModal.content], { type: 'text/html' })
    const file = new File([blob], contentModal.slug + '.html', { type: 'text/html' })
    const fd = new FormData()
    fd.append('title', contentModal.title)
    fd.append('file', file)
    await fetch(`${BASE()}/update/${contentModal.slug}`, { method: 'POST', body: fd })
    showToast('內容已儲存')
    contentModal.show = false
    await fetchList()
  } catch {
    showToast('儲存失敗', true)
  } finally {
    savingContent.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; transform: translateY(8px); }
</style>
