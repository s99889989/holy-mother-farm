<script setup>
  // 需先安裝：npm install @playcanvas/supersplat-viewer
  import { renderViewerHtml } from '@playcanvas/supersplat-viewer'
  import { defaultSettings } from '@playcanvas/supersplat-viewer/settings'

  definePageMeta({ layout: 'staff', requiredPermission: 'holymotherfarm.gaussian-models' })

  const commonStore = useCommonStore()
  const BASE = commonStore.data.main_url + '/holy/gaussian'
  const API_ORIGIN = commonStore.data.main_url

  const fileUrl = (path) => {
    if (!path) return ''
    return path.startsWith('http') ? path : API_ORIGIN + path
  }

  // srcdoc iframe 內部 document.baseURI 是字面上的 "about:srcdoc"，
  // viewer 內部用它當 new URL() 的 base 來推算分塊檔案路徑會直接丟 Invalid URL，
  // 所以傳給 viewer 的 contentUrl 一定要是完整絕對網址（含 http://主機:port），不能是站內相對路徑
  const absoluteFileUrl = (path) => {
    const rel = fileUrl(path) // 可能已經是絕對網址，也可能只是 "/api/..." 這種站內相對路徑
    if (rel.startsWith('http')) return rel
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return origin + rel
  }

  // ── fetch with timeout ────────────────────────────────────────────
  const fetchWithTimeout = (url, options = {}, ms = 15000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
  }

  // ── 狀態 ──────────────────────────────────────────────────────────
  const models = ref([])
  const isLoading = ref(false)
  const toast = reactive({ show: false, message: '' })

  const showToast = (message) => {
    toast.message = message
    toast.show = true
    setTimeout(() => { toast.show = false }, 2500)
  }

  const fetchModels = async () => {
    isLoading.value = true
    try {
      models.value = await (await fetchWithTimeout(`${BASE}/list`)).json()
    } catch {
      showToast('讀取模型列表失敗')
    } finally {
      isLoading.value = false
    }
  }
  onMounted(fetchModels)

  // ── 上傳 ──────────────────────────────────────────────────────────
  const uploadModal = reactive({ show: false })
  const uploadForm = reactive({ name: '', description: '', zipFile: null, thumbnail: null })
  const uploading = ref(false)
  const uploadProgress = ref('')
  const dragOver = ref(false)
  const zipInputRef = ref(null)
  const thumbInputRef = ref(null)

  const openUploadModal = () => {
    uploadForm.name = ''
    uploadForm.description = ''
    uploadForm.zipFile = null
    uploadForm.thumbnail = null
    uploadModal.show = true
  }

  const handleZipDrop = (e) => {
    dragOver.value = false
    const file = e.dataTransfer.files?.[0]
    if (file) uploadForm.zipFile = file
  }
  const handleZipSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadForm.zipFile = file
  }
  const handleThumbSelect = (e) => {
    uploadForm.thumbnail = e.target.files?.[0] || null
  }

  const submitUpload = async () => {
    if (!uploadForm.zipFile) { showToast('請選擇 SOG Tiles 的 zip 檔'); return }
    if (!uploadForm.name.trim()) { showToast('請輸入名稱'); return }

    uploading.value = true
    uploadProgress.value = '上傳中…（檔案較大請耐心等候）'

    const fd = new FormData()
    fd.append('zipFile', uploadForm.zipFile)
    fd.append('name', uploadForm.name.trim())
    fd.append('description', uploadForm.description || '')
    if (uploadForm.thumbnail) fd.append('thumbnail', uploadForm.thumbnail)

    try {
      const res = await fetch(`${BASE}/upload`, { method: 'POST', body: fd })
      const text = await res.text()
      if (text.startsWith('錯誤')) {
        showToast(text)
      } else {
        showToast('上傳成功')
        uploadModal.show = false
        await fetchModels()
      }
    } catch {
      showToast('上傳失敗，請檢查網路或檔案大小')
    } finally {
      uploading.value = false
      uploadProgress.value = ''
    }
  }

  // ── 刪除 ──────────────────────────────────────────────────────────
  const deleteModel = async (model) => {
    if (!confirm(`確定要刪除「${model.name}」嗎？此動作無法復原。`)) return
    try {
      await fetchWithTimeout(`${BASE}/remove/${model.id}`, { method: 'DELETE' })
      showToast('已刪除')
      await fetchModels()
    } catch {
      showToast('刪除失敗')
    }
  }

  // ── 檢視器 ────────────────────────────────────────────────────────
  const viewerModal = reactive({ show: false, html: '', name: '' })

  const openViewer = (model) => {
    const contentUrl = absoluteFileUrl(`/holy/gaussian/file/${model.id}/${model.entryFile}`)
    const doc = renderViewerHtml({
      bootstrap: {
        contentUrl,
        settings: defaultSettings() // 內嵌預設設定，避免 viewer 再去 fetch 不存在的 ./settings.json
      },
      inlineCss: true,
      inlineJs: true, // 必須內嵌 JS，否則 iframe srcdoc 會去抓不存在的 ./index.js（同源相對路徑）
      backgroundColor: [0.05, 0.05, 0.05]
    })
    viewerModal.html = doc
    viewerModal.name = model.name
    viewerModal.show = true
  }

  const closeViewer = () => {
    viewerModal.show = false
    viewerModal.html = ''
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`
  }
</script>

<template>
  <ClientOnly>
    <div class="p-4 sm:p-6 max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-5">
        <h1 class="text-xl font-bold text-base-c">
          高斯潑灑模型（3D 導覽）
        </h1>
        <button
          class="px-4 py-2 text-sm bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
          @click="openUploadModal"
        >
          + 上傳模型
        </button>
      </div>

      <div
        v-if="isLoading"
        class="text-center text-hint-c py-10 text-sm"
      >
        載入中…
      </div>

      <div
        v-else-if="models.length === 0"
        class="text-center text-hint-c py-16 text-sm border border-dashed border-light-c rounded-xl"
      >
        尚無模型，點右上角「上傳模型」開始
      </div>

      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      >
        <div
          v-for="model in models"
          :key="model.id"
          class="bg-surface rounded-xl overflow-hidden border border-light-c hover:shadow-lg transition-shadow group"
        >
          <div
            class="aspect-video bg-surface2 flex items-center justify-center cursor-pointer relative"
            @click="openViewer(model)"
          >
            <img
              v-if="model.thumbnail"
              :src="fileUrl(model.thumbnail)"
              class="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            >
            <svg
              v-else
              class="w-10 h-10 text-hint-c"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 7l8-4 8 4M4 7v10l8 4m-8-14l8 4m0 10l8-4V7m-8 14V11m8-4l-8 4"
            /></svg>
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span class="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity">點擊瀏覽</span>
            </div>
          </div>
          <div class="p-3">
            <p class="text-sm font-semibold text-base-c truncate">
              {{ model.name }}
            </p>
            <p
              v-if="model.description"
              class="text-xs text-hint-c mt-0.5 line-clamp-2"
            >
              {{ model.description }}
            </p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-hint-c">{{ formatSize(model.totalSizeBytes) }}</span>
              <button
                class="text-xs text-red-500 hover:text-red-600"
                @click="deleteModel(model)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 上傳 Modal -->
      <div
        v-if="uploadModal.show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      >
        <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-base-c">
              上傳高斯模型
            </h3>
            <button
              class="text-hint-c hover:text-muted-c p-1"
              @click="uploadModal.show = false"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              /></svg>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs text-hint-c mb-1 block">名稱</label>
              <input
                v-model="uploadForm.name"
                type="text"
                placeholder="例如：台東教堂"
                class="w-full px-3 py-2 text-sm rounded-lg border border-light-c bg-surface2"
              >
            </div>
            <div>
              <label class="text-xs text-hint-c mb-1 block">說明（選填）</label>
              <textarea
                v-model="uploadForm.description"
                rows="2"
                class="w-full px-3 py-2 text-sm rounded-lg border border-light-c bg-surface2"
              />
            </div>

            <div>
              <label class="text-xs text-hint-c mb-1 block">SOG Tiles 資料夾（打包成 .zip）</label>
              <div
                :class="dragOver ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-base hover:border-orange-400'"
                class="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
                @dragover.prevent="dragOver = true"
                @dragleave="dragOver = false"
                @drop.prevent="handleZipDrop"
                @click="zipInputRef?.click()"
              >
                <p class="text-sm text-hint-c">
                  {{ uploadForm.zipFile ? uploadForm.zipFile.name : '點擊或拖曳 zip 檔上傳' }}
                </p>
                <p class="text-xs text-hint-c mt-1 opacity-60">
                  將重建工具輸出的 SOG Tiles 整個資料夾打包成 zip
                </p>
                <input
                  ref="zipInputRef"
                  type="file"
                  accept=".zip"
                  class="hidden"
                  @change="handleZipSelect"
                >
              </div>
            </div>

            <div>
              <label class="text-xs text-hint-c mb-1 block">縮圖（選填）</label>
              <input
                ref="thumbInputRef"
                type="file"
                accept="image/*"
                class="w-full text-sm"
                @change="handleThumbSelect"
              >
            </div>
          </div>

          <div
            v-if="uploading"
            class="mt-3 flex items-center gap-2 text-sm text-hint-c"
          >
            <div class="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            {{ uploadProgress }}
          </div>

          <button
            class="mt-4 w-full px-4 py-2.5 text-sm bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
            :disabled="uploading"
            @click="submitUpload"
          >
            {{ uploading ? '上傳中…' : '開始上傳' }}
          </button>
        </div>
      </div>

      <!-- 檢視器 Modal -->
      <div
        v-if="viewerModal.show"
        class="fixed inset-0 bg-black z-[60] flex flex-col"
      >
        <div class="flex items-center justify-between px-4 py-2 bg-black/80 text-white">
          <span class="text-sm font-medium">{{ viewerModal.name }}</span>
          <button
            class="text-white/80 hover:text-white p-1"
            @click="closeViewer"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            /></svg>
          </button>
        </div>
        <iframe
          :srcdoc="viewerModal.html"
          class="flex-1 w-full border-0"
          allow="fullscreen; xr-spatial-tracking"
        />
      </div>

      <!-- Toast -->
      <transition name="fade">
        <div
          v-if="toast.show"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 whitespace-nowrap"
        >
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </ClientOnly>
</template>

<style scoped>
  @use '~/assets/scs/main' as *;
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s, transform 0.3s;
  }
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }
</style>
