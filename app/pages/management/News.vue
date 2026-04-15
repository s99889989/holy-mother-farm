<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── Header ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-sky-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">消</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">活動消息管理</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">News & Events</p>
          </div>
        </div>
        <button @click="openModal(null)"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sky-700 text-white rounded-lg hover:bg-sky-800 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          新增消息
        </button>
      </div>
    </header>

    <div class="max-w-4xl mx-auto px-3 sm:px-4 py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="flex items-center justify-center py-16 text-stone-400 gap-2">
        <div class="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        載入中…
      </div>

      <!-- 無資料 -->
      <div v-else-if="newsList.length === 0"
        class="text-center py-16 text-stone-400 text-sm">
        尚無活動消息，點擊「新增消息」開始新增
      </div>

      <!-- 消息列表 -->
      <div v-else class="space-y-3">
        <div v-for="item in newsList" :key="item.id"
          class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 flex gap-4 items-start">

          <!-- 封面圖 -->
          <div class="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-800">
            <img v-if="item.coverUrl" :src="apiUrl(item.coverUrl)" :alt="item.title"
              class="w-full h-full object-cover cursor-pointer" @click="previewUrl = apiUrl(item.coverUrl)" />
            <div v-else class="w-full h-full flex items-center justify-center text-stone-300">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
          </div>

          <!-- 內容 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-stone-800 dark:text-stone-100 truncate">{{ item.title }}</p>
                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                  <span class="text-xs text-stone-400">{{ item.date }}</span>
                  <span v-for="tag in item.tags" :key="tag"
                    class="px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                    {{ tag }}
                  </span>
                </div>
                <p class="text-xs text-stone-400 mt-1.5 line-clamp-2">{{ item.content }}</p>
                <p v-if="item.attachments?.length" class="text-xs text-stone-400 mt-1">
                  📎 {{ item.attachments.length }} 個附件
                </p>
              </div>
              <div class="flex gap-1.5 flex-shrink-0">
                <button @click="openModal(item)"
                  class="px-2.5 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  編輯
                </button>
                <button @click="confirmDelete(item)"
                  class="px-2.5 py-1 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 新增/編輯 Modal ════════ -->
    <div v-if="modal.show"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">

        <div class="px-5 py-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">
            {{ modal.isNew ? '新增活動消息' : '編輯活動消息' }}
          </h3>
          <button @click="modal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-5 py-4 space-y-4">

          <!-- 標題 -->
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">標題 *</label>
            <input v-model="form.title" placeholder="活動消息標題"
              class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-sky-400" />
          </div>

          <!-- 日期 + 分類標籤 -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">日期</label>
              <input v-model="form.date" type="date"
                class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-sky-400" />
            </div>
            <div>
              <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">分類標籤</label>
              <div class="flex gap-1.5">
                <input v-model="tagInput" placeholder="輸入後按 Enter"
                  @keydown.enter.prevent="addTag"
                  class="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-sky-400" />
                <button @click="addTag"
                  class="px-3 py-2 text-sm bg-sky-700 text-white rounded-xl hover:bg-sky-800 transition-colors">+</button>
              </div>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <span v-for="(tag, idx) in form.tags" :key="tag"
                  class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                  {{ tag }}
                  <button @click="form.tags.splice(idx, 1)" class="hover:text-red-400 leading-none">×</button>
                </span>
              </div>
            </div>
          </div>

          <!-- 內文 -->
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">內文</label>
            <textarea v-model="form.content" rows="6" placeholder="活動詳細內容…"
              class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
          </div>

          <!-- 封面圖 -->
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">封面圖</label>
            <div v-if="form.coverPreview || form.coverUrl"
              class="relative w-full h-40 rounded-xl overflow-hidden mb-2 border border-stone-200 dark:border-stone-700 bg-stone-50">
              <img :src="form.coverPreview || apiUrl(form.coverUrl)" class="w-full h-full object-cover" />
              <button @click="removeCover"
                class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">×</button>
            </div>
            <div @click="coverInputRef?.click()"
              class="border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl p-4 text-center cursor-pointer hover:border-sky-400 transition-colors">
              <p class="text-sm text-stone-400">點擊上傳封面圖</p>
              <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="handleCoverSelect" />
            </div>
          </div>

          <!-- 附件 -->
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">附件</label>
            <div v-if="form.attachments?.length" class="space-y-1.5 mb-2">
              <div v-for="(att, idx) in form.attachments" :key="idx"
                class="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-zinc-800 rounded-xl text-sm">
                <span class="text-stone-600 dark:text-stone-300 truncate flex-1 mr-2">📎 {{ att.name }}</span>
                <button @click="removeAttachment(idx)"
                  class="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
            <div @click="attachInputRef?.click()"
              class="border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl p-4 text-center cursor-pointer hover:border-sky-400 transition-colors">
              <p class="text-sm text-stone-400">點擊上傳附件（可多選）</p>
              <input ref="attachInputRef" type="file" multiple class="hidden" @change="handleAttachSelect" />
            </div>
          </div>

        </div>

        <div class="px-5 py-4 border-t border-stone-100 dark:border-stone-700 flex gap-2 justify-end sticky bottom-0 bg-white dark:bg-zinc-900">
          <button @click="modal.show = false"
            class="px-4 py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">
            取消
          </button>
          <button @click="save" :disabled="saving"
            class="px-4 py-2 text-sm bg-sky-700 text-white rounded-xl hover:bg-sky-800 disabled:bg-sky-300 transition-colors flex items-center gap-1.5">
            <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ modal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 大圖預覽 -->
    <div v-if="previewUrl" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] cursor-pointer p-4"
      @click="previewUrl = ''">
      <img :src="previewUrl" class="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const commonStore = useCommonStore()
const BASE        = computed(() => commonStore.data.main_url + '/holy/news')
const API_ORIGIN  = computed(() => commonStore.data.main_url)

const apiUrl = (path) => {
  if (!path || path.startsWith('http')) return path
  return API_ORIGIN.value + path
}

// ── 狀態 ──────────────────────────────────────────────────────────
const newsList     = ref([])
const loading      = ref(false)
const saving       = ref(false)
const previewUrl   = ref('')
const coverInputRef  = ref(null)
const attachInputRef = ref(null)
const tagInput       = ref('')
const toast          = reactive({ show: false, message: '' })

const modal = reactive({ show: false, isNew: true })
const form  = reactive({
  id: '', title: '', date: '', content: '', tags: [],
  coverUrl: '', coverFile: null, coverPreview: '',
  attachments: [],   // [{ name, url }] 已儲存的
  newAttachFiles: [] // File[] 待上傳的
})

const showToast = (msg) => {
  toast.message = msg; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

// ── 標籤 ──────────────────────────────────────────────────────────
const addTag = () => {
  const t = tagInput.value.trim()
  if (t && !form.tags.includes(t)) form.tags.push(t)
  tagInput.value = ''
}

// ── 封面圖 ────────────────────────────────────────────────────────
const handleCoverSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return
  form.coverFile    = file
  form.coverPreview = URL.createObjectURL(file)
}
const removeCover = () => {
  form.coverFile = null; form.coverPreview = ''; form.coverUrl = ''
  if (coverInputRef.value) coverInputRef.value.value = ''
}

// ── 附件 ──────────────────────────────────────────────────────────
const handleAttachSelect = (e) => {
  const files = Array.from(e.target.files)
  for (const f of files) {
    form.newAttachFiles.push(f)
    form.attachments.push({ name: f.name, url: '', isNew: true })
  }
  if (attachInputRef.value) attachInputRef.value.value = ''
}
const removeAttachment = (idx) => {
  form.attachments.splice(idx, 1)
  // 如果是新附件也從 newAttachFiles 移除（按新附件順序對應）
  const newIdx = form.attachments.slice(0, idx).filter(a => a.isNew).length
  const newOnes = form.attachments.filter(a => a.isNew)
  if (form.attachments[idx]?.isNew) form.newAttachFiles.splice(newIdx, 1)
}

// ── 開啟 Modal ────────────────────────────────────────────────────
const openModal = (item) => {
  modal.isNew = !item
  Object.assign(form, {
    id: item?.id || '',
    title: item?.title || '',
    date: item?.date || '',
    content: item?.content || '',
    tags: item?.tags ? [...item.tags] : [],
    coverUrl: item?.coverUrl || '',
    coverFile: null, coverPreview: '',
    attachments: item?.attachments ? item.attachments.map(a => ({ ...a })) : [],
    newAttachFiles: [],
  })
  tagInput.value = ''
  modal.show = true
}

// ── API ──────────────────────────────────────────────────────────
const fetchNews = async () => {
  loading.value = true
  try {
    newsList.value = await (await fetch(`${BASE.value}/list`)).json()
  } catch { newsList.value = [] }
  finally { loading.value = false }
}

const save = async () => {
  if (!form.title.trim()) { showToast('請填寫標題'); return }
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('id',      form.id)
    fd.append('title',   form.title)
    fd.append('date',    form.date)
    fd.append('content', form.content)
    fd.append('tags',    JSON.stringify(form.tags))
    // 已儲存的附件（非新增的）
    const existingAtts = form.attachments.filter(a => !a.isNew)
    fd.append('attachments', JSON.stringify(existingAtts))
    if (form.coverFile)          fd.append('cover', form.coverFile)
    else if (!form.coverUrl)     fd.append('removeCover', 'true')
    for (const f of form.newAttachFiles) fd.append('newAttachments', f)

    const url    = modal.isNew ? `${BASE.value}/save` : `${BASE.value}/update`
    const method = modal.isNew ? 'POST' : 'PUT'
    const res    = await fetch(url, { method, body: fd })
    if (!res.ok) throw new Error()
    await fetchNews()
    modal.show = false
    showToast(modal.isNew ? '已新增' : '已儲存')
  } catch { showToast('儲存失敗') }
  finally { saving.value = false }
}

const confirmDelete = async (item) => {
  if (!confirm(`確定刪除「${item.title}」？`)) return
  try {
    await fetch(`${BASE.value}/remove/${item.id}`, { method: 'DELETE' })
    newsList.value = newsList.value.filter(n => n.id !== item.id)
    showToast('已刪除')
  } catch { showToast('刪除失敗') }
}

onMounted(fetchNews)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
