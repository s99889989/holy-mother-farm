<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">

    <!-- ── Header ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">產</div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">產品訂購管理</h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">Production Items</p>
          </div>
        </div>
        <button v-if="perm.can('content.production')" @click="openModal(null)"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          新增產品
        </button>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-6 py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="flex items-center justify-center py-16 text-hint-c gap-2">
        <div class="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        載入中…
      </div>

      <!-- 無資料 -->
      <div v-else-if="itemList.length === 0"
           class="text-center py-16 text-hint-c text-sm">
        尚無產品，點擊「新增產品」開始新增
      </div>

      <!-- 產品列表 -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="item in itemList" :key="item.id"
             class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden flex gap-4 items-start p-4">

          <!-- 封面圖 -->
          <div class="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-surface2">
            <img v-if="item.coverUrl" :src="apiUrl(item.coverUrl)" :alt="item.name"
                 class="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                 @click="previewUrl = apiUrl(item.coverUrl)" />
            <div v-else class="w-full h-full flex items-center justify-center text-hint-c">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
          </div>

          <!-- 內容 -->
          <div class="flex-1 min-w-0 flex flex-col gap-2">
            <div>
              <p class="font-bold text-sm text-base-c truncate">{{ item.name }}</p>
              <p class="text-xs text-hint-c mt-0.5">排序：{{ item.sort }}</p>
              <a v-if="item.link" :href="item.link" target="_blank"
                 class="text-xs text-teal-600 dark:text-teal-400 mt-1 truncate block hover:underline">
                🔗 {{ item.link }}
              </a>
              <p v-else class="text-xs text-hint-c mt-1">— 無連結</p>
            </div>
            <div class="flex gap-1.5 mt-auto">
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
      <div class="bg-surface rounded-b-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-screen sm:max-h-[92vh] overflow-y-auto">

        <div class="px-5 py-4 border-b border-light-c flex items-center justify-between sticky top-0 bg-surface z-10">
          <h3 class="font-bold text-base-c">
            {{ modal.isNew ? '新增產品' : '編輯產品' }}
          </h3>
          <button @click="modal.show = false" class="text-hint-c hover:text-muted-c p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-5 py-4 space-y-4">

          <!-- 名稱 -->
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">名稱 *</label>
            <input v-model="form.name" placeholder="產品名稱"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400" />
          </div>

          <!-- 連結 + 排序 -->
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="text-xs font-semibold text-muted-c block mb-1">連結（點擊另開新分頁）</label>
              <input v-model="form.link" placeholder="https://..."
                     class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-semibold text-muted-c block mb-1">排序（小的排前面）</label>
              <input v-model.number="form.sort" type="number" min="0" placeholder="0"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>

          <!-- 封面圖 -->
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">封面圖</label>
            <div v-if="form.coverPreview || form.coverUrl"
                 class="relative w-full h-48 rounded-xl overflow-hidden mb-2 border border-light-c bg-surface2">
              <img :src="form.coverPreview || apiUrl(form.coverUrl)" class="w-full h-full object-cover" />
              <button @click="removeCover"
                      class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">×</button>
            </div>
            <div @click="coverInputRef?.click()"
                 class="border-2 border-dashed border-base rounded-xl p-4 text-center cursor-pointer hover:border-teal-400 transition-colors">
              <p class="text-sm text-hint-c">點擊上傳封面圖</p>
              <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="handleCoverSelect" />
            </div>
          </div>

        </div>

        <div class="px-5 py-4 border-t border-light-c flex gap-2 justify-end sticky bottom-0 bg-surface">
          <button @click="modal.show = false"
                  class="px-4 py-2 text-sm bg-surface2 text-muted-c rounded-xl hover:bg-surface2 transition-colors">
            取消
          </button>
          <button @click="save" :disabled="saving"
                  class="px-4 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:bg-teal-300 transition-colors flex items-center gap-1.5">
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
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'content.production' })
const perm = usePermission()

const commonStore  = useCommonStore()
const BASE         = computed(() => commonStore.data.main_url + '/holy/production-item')
const API_ORIGIN   = computed(() => commonStore.data.main_url)

const apiUrl = (path) => {
  if (!path || path.startsWith('http')) return path
  return API_ORIGIN.value + path
}

// ── 狀態 ──────────────────────────────────────────────────────────
const itemList      = ref([])
const loading       = ref(false)
const saving        = ref(false)
const previewUrl    = ref('')
const coverInputRef = ref(null)
const toast         = reactive({ show: false, message: '' })
const modal         = reactive({ show: false, isNew: true })
const form          = reactive({
  id: '', name: '', link: '', sort: 0,
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
    sort:     item?.sort     ?? 0,
    coverUrl: item?.coverUrl || '',
    coverFile: null, coverPreview: '',
  })
  modal.show = true
}

// ── API ──────────────────────────────────────────────────────────
const fetchItems = async () => {
  loading.value = true
  try {
    itemList.value = await (await fetch(`${BASE.value}/list`)).json()
  } catch { itemList.value = [] }
  finally { loading.value = false }
}

const save = async () => {
  if (!form.name.trim()) { showToast('請填寫名稱'); return }
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('id',   form.id)
    fd.append('name', form.name)
    fd.append('link', form.link)
    fd.append('sort', form.sort)
    if (form.coverFile)      fd.append('cover', form.coverFile)
    else if (!form.coverUrl) fd.append('removeCover', 'true')

    const url    = modal.isNew ? `${BASE.value}/save` : `${BASE.value}/update`
    const method = modal.isNew ? 'POST' : 'PUT'
    const res    = await fetch(url, { method, body: fd })
    if (!res.ok) throw new Error()
    await fetchItems()
    modal.show = false
    showToast(modal.isNew ? '已新增' : '已儲存')
  } catch { showToast('儲存失敗') }
  finally { saving.value = false }
}

const confirmDelete = async (item) => {
  if (!confirm(`確定刪除「${item.name}」？`)) return
  try {
    await fetch(`${BASE.value}/remove/${item.id}`, { method: 'DELETE' })
    itemList.value = itemList.value.filter(p => p.id !== item.id)
    showToast('已刪除')
  } catch { showToast('刪除失敗') }
}

onMounted(fetchItems)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
