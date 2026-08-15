<script setup>
import { reactive, ref, onMounted } from 'vue'

// 「進階品項管理」— 用品項代號幫品項綁定照片。
//
// 跟原本的 products.vue（唯讀檢視 COAERP 品項主檔）是分開的兩個東西：
//   - 品項代號/名稱/單位等資料，這頁沿用既有的 /api/dc-erp/products
//     （Nuxt server/api 代理 COAERP，跟 products.vue 同一支 API，查詢/
//     分頁/關鍵字邏輯照抄）
//   - 圖片本身完全不經過 COAERP、也不經過 Nuxt server/api，前端直接打
//     新的 Spring Boot 端點 DcErpProductImageController（/holy/dc-erp/
//     product-image/*），架構跟聖母健康農莊「每日菜色」daily-menu.vue
//     直打 MenuController 完全一樣（canvas 先壓縮 → 上傳 → 後端轉 WebP
//     + 縮圖）
//
// 這麼分開的原因：COAERP 品項主檔是正式在用的 4000+ 筆資料，貿然寫回
// 有風險（見 products.get.ts／README 的說明），但綁圖片這件事完全不需要
// 動到 COAERP，用「品項代號」當 key 存在自己這邊就好，安全、也不用等
// 拿到 COAERP 儲存規格的真實 Network 記錄才能做。
definePageMeta({
  layout: 'staff',
  requiredPermission: 'order.dc-erp'
})

const commonStore = useCommonStore()
const BASE = commonStore.data.main_url + '/holy/dc-erp/product-image'
const API_ORIGIN = commonStore.data.main_url

const imgUrl = (path) => {
  if (!path) return ''
  return path.startsWith('http') ? path : API_ORIGIN + path
}
const thumbUrl = (path) => {
  if (!path) return ''
  const full = path.startsWith('http') ? path : API_ORIGIN + path
  return full.replace('/holy/dc-erp/product-image/', '/holy/dc-erp/product-image/thumb/')
}

const fetchWithTimeout = (url, options = {}, ms = 8000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

// 上傳前在前端用 canvas 壓縮（手機拍照常見 4–10MB，壓到 1200px/0.82 後
// 約 200–400KB），後端收到後仍會再轉一次 WebP，統一格式。
const compressImage = (file, maxWidth = 1200, quality = 0.82) => {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

// ── 查詢表單（跟 products.vue 同一套） ─────────────────────────────
const filters = reactive({
  whSearch: 'whatever',
  keyword: '',
  selectDisable: 'whatever'
})
const filterOptions = reactive({
  whSearchField: [],
  selectDisable: []
})

const viewMode = ref('table') // 'card' | 'table' — 使用者要求預設改列表
const onlyWithImages = ref(false)

const items = ref([])
const totalCount = ref(0)
const totalPages = ref(1)
const page = ref(1)
const pagesize = ref(20)
const breadcrumb = ref([])
const loading = ref(true)
const errorMessage = ref('')

async function loadImagesMap() {
  try {
    const res = await fetchWithTimeout(`${BASE}/list`)
    return await res.json() // { code: { images: [...], productClass: '...' } }
  } catch {
    return {}
  }
}

async function load(targetPage = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    const [data, imagesMap] = await Promise.all([
      $fetch('/api/dc-erp/products', {
        query: { page: targetPage, pagesize: pagesize.value, ...filters }
      }),
      loadImagesMap()
    ])
    Object.assign(filterOptions, data.filters)
    items.value = data.items.map(row => ({ ...row, images: imagesMap[row.code]?.images || [] }))
    totalCount.value = data.totalCount
    totalPages.value = data.totalPages
    page.value = data.page
    pagesize.value = data.pagesize
    breadcrumb.value = data.breadcrumb
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/dc-erp/login')
      return
    }
    errorMessage.value = err?.data?.statusMessage || '無法載入品項資料，請稍後再試'
  } finally {
    loading.value = false
  }
}

const displayItems = computed(() =>
  onlyWithImages.value ? items.value.filter(i => i.images.length > 0) : items.value
)

function handleSearch() {
  load(1)
}
function handleAllList() {
  Object.assign(filters, { whSearch: 'whatever', keyword: '', selectDisable: 'whatever' })
  load(1)
}
function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  load(p)
}

// 「顯示方式（列表/卡片）」跟「每頁筆數」統一在「設定」頁調整（見
// settings.vue），這裡只在載入時讀取，畫面上不再有切換鈕。
const LIST_SETTINGS_KEY = 'dc-erp-list-settings'
function loadListSettings(key, defaults) {
  try {
    const raw = window.localStorage.getItem(LIST_SETTINGS_KEY)
    if (!raw) return defaults
    const all = JSON.parse(raw)
    return { ...defaults, ...(all[key] || {}) }
  } catch {
    return defaults
  }
}

onMounted(() => {
  const listSettings = loadListSettings('productImages', { pagesize: pagesize.value, viewMode: viewMode.value })
  pagesize.value = listSettings.pagesize
  viewMode.value = listSettings.viewMode
  load(1)
})

// ── 圖片管理 Modal ───────────────────────────────────────────────
const imageModal = reactive({ show: false, item: null, images: [] })
const fileInputRef = ref(null)
const dragOver = ref(false)
const uploading = ref(false)
const uploadProgress = ref('')
const previewUrl = ref('')
const toast = reactive({ show: false, message: '' })

function showToast(message) {
  toast.message = message
  toast.show = true
  setTimeout(() => { toast.show = false }, 2500)
}

function openImageModal(item) {
  imageModal.item = item
  imageModal.images = [...(item.images || [])]
  imageModal.show = true
}

function syncItemImages() {
  const found = items.value.find(i => i.code === imageModal.item.code)
  if (found) found.images = [...imageModal.images]
}

const handleFileSelect = e => uploadImages(Array.from(e.target.files))
const handleDrop = (e) => {
  dragOver.value = false
  uploadImages(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')))
}

async function uploadImages(files) {
  if (!imageModal.item || files.length === 0) return
  uploading.value = true
  uploadProgress.value = ''
  let successCount = 0
  const errors = []
  try {
    for (let i = 0; i < files.length; i++) {
      uploadProgress.value = `（${i + 1} / ${files.length}）`
      try {
        const compressed = await compressImage(files[i])
        const formData = new FormData()
        formData.append('files', compressed)
        if (imageModal.item.productClass) formData.append('productClass', imageModal.item.productClass)
        const res = await fetchWithTimeout(
          `${BASE}/upload/${encodeURIComponent(imageModal.item.code)}`,
          { method: 'POST', body: formData }
        )
        if (!res.ok) throw new Error(`${files[i].name}：${res.status}`)
        const newPaths = await res.json()
        imageModal.images.push(...newPaths)
        syncItemImages()
        successCount++
      } catch (err) {
        errors.push(err.message || files[i].name)
      }
    }
    if (errors.length === 0) {
      showToast(`成功上傳 ${successCount} 張圖片`)
    } else if (successCount > 0) {
      showToast(`上傳 ${successCount} 張成功，${errors.length} 張失敗`)
      console.error('上傳失敗：', errors)
    } else {
      showToast(`上傳失敗：${errors[0]}`)
      console.error('上傳失敗：', errors)
    }
  } finally {
    uploading.value = false
    uploadProgress.value = ''
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

async function deleteImage(idx) {
  if (!confirm('確定刪除這張圖片？')) return
  const fileName = imageModal.images[idx].split('/').pop()
  try {
    await fetchWithTimeout(
      `${BASE}/remove/${encodeURIComponent(imageModal.item.code)}?fileName=${fileName}`,
      { method: 'DELETE' }
    )
    imageModal.images.splice(idx, 1)
    syncItemImages()
    showToast('圖片已刪除')
  } catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <div class="p-4">
    <DcErpShell>
      <div class="space-y-3 p-4">
        <!-- 查詢表單 -->
        <div class="space-y-2 rounded-xl border border-light-c bg-surface p-3 text-sm">
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">依欄位：</label>
            <select v-model="filters.whSearch" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.whSearchField" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <DcErpKeywordSearchInput
              v-model="filters.keyword"
              storage-key="dc-erp-product-images-keyword-history"
              placeholder="關鍵字"
              width-class="w-48"
              @enter="handleSearch"
            />

            <label class="ml-2 text-muted-c">依是否停用：</label>
            <select v-model="filters.selectDisable" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-for="opt in filterOptions.selectDisable" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <button class="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-800" @click="handleSearch">送出查詢</button>
            <button class="rounded border border-light-c px-3 py-1 text-muted-c hover:bg-surface2" @click="handleAllList">列出全部</button>

            <label class="ml-2 flex items-center gap-1 text-muted-c">
              <input v-model="onlyWithImages" type="checkbox">
              只看本頁已有圖片的
            </label>
          </div>
          <p class="text-xs text-hint-c">
            這頁只綁圖片，不會改動品項主檔任何欄位；上傳圖片時會順便把目前查到的「所屬類別」存進去，方便之後分類瀏覽。「只看本頁已有圖片的」只篩選目前這頁載入的資料，不是全站搜尋。顯示方式、每頁筆數、批次「設置所屬類別」都移到
            <NuxtLink to="/staff/order/dc-erp/settings" class="text-green-700 hover:underline">設定</NuxtLink>
            頁調整。
          </p>
        </div>

        <!-- 列表 -->
        <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
          <p v-if="loading" class="p-6 text-sm text-hint-c">載入中…</p>
          <p v-else-if="errorMessage" class="p-6 text-sm text-red-600">{{ errorMessage }}</p>

          <!-- 卡片檢視 -->
          <div v-else-if="viewMode === 'card'" class="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-5">
            <div
              v-for="row in displayItems"
              :key="row.id || row.code"
              class="overflow-hidden rounded-lg border border-light-c hover:bg-surface2"
            >
              <div
                v-if="row.images.length > 0"
                class="aspect-square cursor-pointer"
                @click="previewUrl = imgUrl(row.images[0])"
              >
                <img
                  :src="thumbUrl(row.images[0])"
                  :alt="row.name"
                  class="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                >
              </div>
              <div
                v-else
                class="flex aspect-square items-center justify-center bg-surface2 text-xs text-hint-c"
              >
                無圖
              </div>
              <div class="p-2 text-sm">
                <div class="font-medium text-base-c">{{ row.code }}</div>
                <div class="truncate text-xs text-muted-c" :title="row.name">{{ row.name }}</div>
                <div class="text-xs text-hint-c">{{ row.unitName }}</div>
                <div v-if="row.productClass" class="truncate text-xs text-hint-c" :title="row.productClass">{{ row.productClass }}</div>
                <button
                  class="mt-1.5 w-full rounded border border-light-c px-2 py-1 text-xs text-muted-c hover:bg-surface2"
                  @click="openImageModal(row)"
                >
                  管理圖片（{{ row.images.length }}）
                </button>
              </div>
            </div>
            <p v-if="!displayItems.length" class="col-span-full py-6 text-center text-hint-c">查無資料</p>
          </div>

          <!-- 列表檢視 -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
                  <th class="px-2 py-2 text-center">縮圖</th>
                  <th class="px-2 py-2">品項代號</th>
                  <th class="px-2 py-2">品項名稱</th>
                  <th class="px-2 py-2">基本單位</th>
                  <th class="px-2 py-2">所屬類別</th>
                  <th class="px-2 py-2 text-center">管理</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in displayItems" :key="row.id || row.code" class="border-b border-light-c hover:bg-surface2">
                  <td class="px-2 py-1.5 text-center">
                    <div
                      v-if="row.images.length > 0"
                      class="mx-auto h-10 w-10 cursor-pointer overflow-hidden rounded"
                      @click="previewUrl = imgUrl(row.images[0])"
                    >
                      <img :src="thumbUrl(row.images[0])" class="h-full w-full object-cover" loading="lazy" decoding="async">
                    </div>
                    <div v-else class="mx-auto flex h-10 w-10 items-center justify-center rounded bg-surface2 text-[10px] text-hint-c">
                      無圖
                    </div>
                  </td>
                  <td class="px-2 py-1.5">{{ row.code }}</td>
                  <td class="px-2 py-1.5">{{ row.name }}</td>
                  <td class="px-2 py-1.5">{{ row.unitName }}</td>
                  <td class="px-2 py-1.5">{{ row.productClass }}</td>
                  <td class="px-2 py-1.5 text-center">
                    <button
                      class="rounded border border-light-c px-2 py-1 text-xs text-muted-c hover:bg-surface2"
                      @click="openImageModal(row)"
                    >
                      管理圖片（{{ row.images.length }}）
                    </button>
                  </td>
                </tr>
                <tr v-if="!displayItems.length">
                  <td colspan="6" class="px-2 py-6 text-center text-hint-c">查無資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-light-c px-3 py-2 text-xs text-muted-c">
            <span>總計 {{ totalCount.toLocaleString() }} 筆 / 總計 {{ totalPages.toLocaleString() }} 頁</span>
            <DcErpPagination :page="page" :total-pages="totalPages" @go="goPage" />
          </div>
        </div>
      </div>

      <!-- 圖片管理 Modal -->
      <div
        v-if="imageModal.show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      >
        <div class="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-xl sm:max-w-xl sm:rounded-2xl sm:p-6">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-base-c">圖片管理</h3>
              <p class="mt-0.5 text-xs text-hint-c">
                {{ imageModal.item?.code }}　{{ imageModal.item?.name }}
                <template v-if="imageModal.item?.productClass">　{{ imageModal.item.productClass }}</template>
              </p>
            </div>
            <button class="p-1 text-hint-c hover:text-muted-c" @click="imageModal.show = false">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="mb-4">
            <div v-if="imageModal.images.length > 0" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <div
                v-for="(url, idx) in imageModal.images"
                :key="idx"
                class="group relative aspect-square overflow-hidden rounded-xl border border-light-c"
              >
                <img
                  :src="imgUrl(url)"
                  class="h-full w-full cursor-pointer object-cover"
                  decoding="async"
                  @click="previewUrl = imgUrl(url)"
                >
                <button
                  class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 hover:bg-red-600 group-hover:opacity-100 sm:opacity-100"
                  @click="deleteImage(idx)"
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <p v-else class="rounded-xl border border-dashed border-light-c py-4 text-center text-sm text-hint-c">
              尚無圖片
            </p>
          </div>

          <!-- 上傳區 -->
          <div
            :class="dragOver ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-base hover:border-orange-400'"
            class="cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop.prevent="handleDrop"
            @click="fileInputRef?.click()"
          >
            <svg class="mx-auto mb-2 h-8 w-8 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p class="text-sm text-hint-c">點擊或拖曳圖片上傳</p>
            <p class="mt-1 text-xs text-hint-c opacity-60">上傳前自動壓縮，節省流量</p>
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept="image/*"
              class="hidden"
              @change="handleFileSelect"
            >
          </div>
          <div v-if="uploading" class="mt-3 flex items-center gap-2 text-sm text-hint-c">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
            上傳中…{{ uploadProgress }}
          </div>

          <button
            class="mt-4 w-full rounded-xl bg-surface2 px-4 py-2.5 text-sm text-muted-c hover:bg-surface2"
            @click="imageModal.show = false"
          >
            關閉
          </button>
        </div>
      </div>

      <!-- 大圖預覽 -->
      <div
        v-if="previewUrl"
        class="fixed inset-0 z-[60] flex cursor-pointer items-center justify-center bg-black/85 p-4"
        @click="previewUrl = ''"
      >
        <img :src="previewUrl" class="max-h-full max-w-full rounded-xl object-contain shadow-2xl" decoding="async">
      </div>

      <!-- Toast -->
      <transition name="fade">
        <div
          v-if="toast.show"
          class="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-accent-solid px-4 py-3 text-sm text-white shadow-lg sm:left-auto sm:right-6 sm:translate-x-0"
        >
          <svg class="h-4 w-4 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ toast.message }}
        </div>
      </transition>
    </DcErpShell>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
