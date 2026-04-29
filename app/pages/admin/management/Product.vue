<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">
    <AdminNavbar />

    <!-- ── Header ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">農</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">推薦農產品管理</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Featured Products</p>
          </div>
        </div>
        <button @click="openModal(null)"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          新增農產品
        </button>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-6 py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="flex items-center justify-center py-16 text-stone-400 gap-2">
        <div class="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        載入中…
      </div>

      <!-- 無資料 -->
      <div v-else-if="productList.length === 0"
           class="text-center py-16 text-stone-400 text-sm">
        尚無推薦農產品，點擊「新增農產品」開始新增
      </div>

      <!-- 農產品列表 -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <div v-for="item in productList" :key="item.id"
             class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden flex flex-col">

          <!-- 封面圖 -->
          <div class="w-full aspect-square bg-stone-100 dark:bg-zinc-800 overflow-hidden">
            <img v-if="item.coverUrl" :src="apiUrl(item.coverUrl)" :alt="item.name"
                 class="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                 @click="previewUrl = apiUrl(item.coverUrl)" />
            <div v-else class="w-full h-full flex items-center justify-center text-stone-300">
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
          </div>

          <!-- 內容 -->
          <div class="p-3 flex-1 flex flex-col gap-2">
            <div>
              <div class="flex items-start justify-between gap-1">
                <p class="font-bold text-sm text-stone-800 dark:text-stone-100 line-clamp-1">{{ item.name }}</p>
              </div>
              <a v-if="item.link" :href="item.link" target="_blank"
                 class="text-xs text-emerald-600 dark:text-emerald-400 mt-1 truncate block hover:underline">
                🔗 {{ item.link }}
              </a>
            </div>
            <div class="flex gap-1.5 mt-auto pt-1">
              <button @click="openModal(item)"
                      class="flex-1 px-2 py-1.5 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                編輯
              </button>
              <button @click="confirmDelete(item)"
                      class="flex-1 px-2 py-1.5 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 新增/編輯 Modal ════════ -->
    <div v-if="modal.show"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-b-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-screen sm:max-h-[92vh] overflow-y-auto">

        <div class="px-5 py-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">
            {{ modal.isNew ? '新增推薦農產品' : '編輯推薦農產品' }}
          </h3>
          <button @click="modal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-5 py-4 space-y-4">

          <!-- 名稱 -->
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">名稱 *</label>
            <input v-model="form.name" placeholder="農產品名稱"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>

          <!-- 連結 -->
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">連結（點擊圖片另開新分頁）</label>
            <input v-model="form.link" placeholder="https://..."
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>

          <!-- 封面圖 -->
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">封面圖</label>
            <div v-if="form.coverPreview || form.coverUrl"
                 class="relative w-full h-48 rounded-xl overflow-hidden mb-2 border border-stone-200 dark:border-stone-700 bg-stone-50">
              <img :src="form.coverPreview || apiUrl(form.coverUrl)" class="w-full h-full object-cover" />
              <button @click="removeCover"
                      class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">×</button>
            </div>
            <div @click="coverInputRef?.click()"
                 class="border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 transition-colors">
              <p class="text-sm text-stone-400">點擊上傳封面圖</p>
              <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="handleCoverSelect" />
            </div>
          </div>

        </div>

        <div class="px-5 py-4 border-t border-stone-100 dark:border-stone-700 flex gap-2 justify-end sticky bottom-0 bg-white dark:bg-zinc-900">
          <button @click="modal.show = false"
                  class="px-4 py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">
            取消
          </button>
          <button @click="save" :disabled="saving"
                  class="px-4 py-2 text-sm bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:bg-emerald-300 transition-colors flex items-center gap-1.5">
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
definePageMeta({ layout: 'admin' })

const commonStore  = useCommonStore()
const BASE         = computed(() => commonStore.data.main_url + '/holy/product')
const API_ORIGIN   = computed(() => commonStore.data.main_url)

const apiUrl = (path) => {
  if (!path || path.startsWith('http')) return path
  return API_ORIGIN.value + path
}

// ── 狀態 ──────────────────────────────────────────────────────────
const productList   = ref([])
const loading       = ref(false)
const saving        = ref(false)
const previewUrl    = ref('')
const coverInputRef = ref(null)
const toast         = reactive({ show: false, message: '' })
const modal         = reactive({ show: false, isNew: true })
const form          = reactive({
  id: '', name: '', link: '',
  coverUrl: '', coverFile: null, coverPreview: ''
})

const showToast = (msg) => {
  toast.message = msg; toast.show = true
  setTimeout(() => toast.show = false, 2500)
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

// ── 開啟 Modal ────────────────────────────────────────────────────
const openModal = (item) => {
  modal.isNew = !item
  Object.assign(form, {
    id:       item?.id       || '',
    name:     item?.name     || '',
    link:     item?.link     || '',
    coverUrl:    item?.coverUrl    || '',
    coverFile: null, coverPreview: '',
  })
  modal.show = true
}

// ── API ──────────────────────────────────────────────────────────
const fetchProducts = async () => {
  loading.value = true
  try {
    productList.value = await (await fetch(`${BASE.value}/list`)).json()
  } catch { productList.value = [] }
  finally { loading.value = false }
}

const save = async () => {
  if (!form.name.trim()) { showToast('請填寫名稱'); return }
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('id', form.id)
    fd.append('name', form.name)
    fd.append('link', form.link)
    if (form.coverFile) fd.append('cover', form.coverFile)
    else if (!form.coverUrl) fd.append('removeCover', 'true')

    const url = modal.isNew ? `${BASE.value}/save` : `${BASE.value}/update`
    const method = modal.isNew ? 'POST' : 'PUT'
    const res = await fetch(url, {method, body: fd})
    if (!res.ok) throw new Error()
    await fetchProducts()
    modal.show = false
    showToast(modal.isNew ? '已新增' : '已儲存')
  } catch {
    showToast('儲存失敗')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (item) => {
  if (!confirm(`確定刪除「${item.name}」？`)) return
  try {
    await fetch(`${BASE.value}/remove/${item.id}`, {method: 'DELETE'})
    productList.value = productList.value.filter(p => p.id !== item.id)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

onMounted(fetchProducts)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
