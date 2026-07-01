<template>
  <div class="min-h-full bg-page transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4" style="height:52px">
      <div class="max-w-3xl mx-auto h-full flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">📁</div>
        <div class="flex-1">
          <h1 class="font-bold text-base-c leading-none" style="font-size:15px">POS 資料管理</h1>
          <p class="text-hint-c" style="font-size:11px">pos/sale-data/</p>
        </div>
        <span class="text-hint-c" style="font-size:12px">共 {{ files.length }} 個檔案</span>
      </div>
    </header>

    <div class="max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-12">

      <!-- 上傳區 -->
      <div
        class="bg-surface border-2 rounded-2xl p-6 mb-4 text-center transition-colors shadow-sm"
        :class="dragging ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-dashed border-light-c'"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="handleDrop"
      >
        <input ref="fileInput" type="file" multiple accept=".txt" class="hidden" @change="handleFileInput" />
        <div class="text-3xl mb-2">📂</div>
        <p class="font-semibold text-base-c mb-1" style="font-size:14px">拖曳或點擊上傳 POS 資料</p>
        <p class="text-hint-c mb-4" style="font-size:12px">支援 InvD20260101_002.txt 格式，可一次選多個</p>
        <button
          class="px-5 py-2 rounded-xl bg-green-700 text-white font-semibold transition-colors hover:bg-green-800"
          style="font-size:13px"
          @click="$refs.fileInput.click()"
        >選擇檔案</button>
      </div>

      <!-- 上傳進度 -->
      <div v-if="uploading" class="bg-surface border border-light-c rounded-2xl p-4 mb-4 shadow-sm">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-4 h-4 rounded-full border-2 border-light-c spinner flex-shrink-0"></div>
          <span class="text-base-c font-semibold" style="font-size:13px">上傳中... {{ uploadProgress.done }}/{{ uploadProgress.total }}</span>
        </div>
        <div class="bg-surface2 rounded-full h-1.5">
          <div class="bg-green-600 h-full rounded-full transition-all" :style="{ width: uploadProgress.total ? (uploadProgress.done/uploadProgress.total*100)+'%' : '0%' }"></div>
        </div>
      </div>

      <!-- 上傳結果 -->
      <div v-if="uploadResult" class="bg-surface border border-light-c rounded-2xl p-4 mb-4 shadow-sm">
        <div v-if="uploadResult.saved?.length" class="mb-2">
          <span class="text-green-700 dark:text-green-400 font-semibold" style="font-size:12px">✓ 成功上傳 {{ uploadResult.saved.length }} 個</span>
          <div class="flex flex-wrap gap-1 mt-1">
            <span v-for="f in uploadResult.saved" :key="f" class="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" style="font-size:11px">{{ f }}</span>
          </div>
        </div>
        <div v-if="uploadResult.failed?.length">
          <span class="text-red-600 font-semibold" style="font-size:12px">✗ 失敗 {{ uploadResult.failed.length }} 個（格式不符）</span>
          <div class="flex flex-wrap gap-1 mt-1">
            <span v-for="f in uploadResult.failed" :key="f" class="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300" style="font-size:11px">{{ f }}</span>
          </div>
        </div>
        <button class="mt-2 text-hint-c" style="font-size:11px" @click="uploadResult = null">關閉</button>
      </div>

      <!-- 載入中 -->
      <div v-if="loading" class="text-center py-8 text-hint-c" style="font-size:13px">載入中...</div>

      <!-- 檔案清單 -->
      <div v-else class="bg-surface border border-light-c rounded-2xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-light-c flex items-center justify-between">
          <h2 class="font-bold text-base-c" style="font-size:13px">已上傳檔案</h2>
          <button class="text-hint-c hover:text-base-c transition-colors" style="font-size:12px" @click="fetchFiles">重新整理</button>
        </div>

        <!-- 空狀態 -->
        <div v-if="!files.length" class="px-4 py-10 text-center text-hint-c" style="font-size:13px">
          尚無檔案，請上傳 InvD*.txt 資料
        </div>

        <!-- 列表 -->
        <div v-else>
          <!-- 批次操作列 -->
          <div class="px-4 py-2 border-b border-light-c flex items-center gap-3 bg-surface2">
            <label class="flex items-center gap-1.5 cursor-pointer" style="font-size:12px">
              <input type="checkbox" :checked="selectedFiles.length === files.length" @change="toggleSelectAll" class="rounded" />
              <span class="text-muted-c">全選</span>
            </label>
            <span v-if="selectedFiles.length" class="text-muted-c" style="font-size:12px">已選 {{ selectedFiles.length }} 個</span>
            <button
              v-if="selectedFiles.length"
              class="ml-auto px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800 transition-colors hover:bg-red-100"
              style="font-size:12px"
              @click="deleteSelected"
            >刪除選取</button>
          </div>

          <div v-for="(file, idx) in files" :key="file.name"
               class="flex items-center gap-3 px-4 py-3 transition-colors"
               :class="[idx < files.length-1 ? 'border-b border-light-c' : '', selectedFiles.includes(file.name) ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-surface2']"
          >
            <input type="checkbox" :value="file.name" v-model="selectedFiles" class="rounded flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-base-c font-medium truncate" style="font-size:13px">{{ file.name }}</p>
              <p class="text-hint-c" style="font-size:11px">{{ formatSize(file.size) }}・{{ formatDate(file.lastModified) }}</p>
            </div>
            <button
              class="flex-shrink-0 px-2.5 py-1 rounded-lg text-red-500 border border-transparent hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              style="font-size:12px"
              @click="deleteSingle(file.name)"
            >刪除</button>
          </div>
        </div>
      </div>

      <!-- 前往分析頁 -->
      <div class="mt-4 text-center">
        <NuxtLink to="/book/PosAnalysis" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-700 text-white font-semibold transition-colors hover:bg-green-800" style="font-size:13px">
          📊 前往銷售分析
        </NuxtLink>
      </div>

    </div>

    <!-- 刪除確認 Modal -->
    <div v-if="confirmDelete" class="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" @click.self="confirmDelete = null">
      <div class="bg-surface rounded-2xl shadow-xl p-5 w-full max-w-sm">
        <p class="font-bold text-base-c mb-1" style="font-size:15px">確認刪除</p>
        <p class="text-muted-c mb-4" style="font-size:13px">
          {{ confirmDelete.names.length === 1 ? confirmDelete.names[0] : `${confirmDelete.names.length} 個檔案` }}
        </p>
        <div class="flex gap-2 justify-end">
          <button class="px-4 py-2 rounded-xl border border-light-c text-muted-c" style="font-size:13px" @click="confirmDelete = null">取消</button>
          <button class="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold" style="font-size:13px" :disabled="deleting" @click="doDelete">
            {{ deleting ? '刪除中...' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'staff.cash-count' })

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/pos'

const loading      = ref(false)
const dragging     = ref(false)
const uploading    = ref(false)
const deleting     = ref(false)
const files        = ref([])
const selectedFiles = ref([])
const uploadResult = ref(null)
const confirmDelete = ref(null)
const uploadProgress = ref({ done: 0, total: 0 })

// ── 取得檔案清單 ──────────────────────────────────────────
async function fetchFiles() {
  loading.value = true
  try {
    files.value = await (await fetch(`${BASE()}/files`)).json()
    selectedFiles.value = []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

// ── 上傳 ─────────────────────────────────────────────────
async function handleFileInput(e) {
  await uploadFiles(Array.from(e.target.files))
  e.target.value = ''
}
async function handleDrop(e) {
  dragging.value = false
  await uploadFiles(Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.txt')))
}

async function uploadFiles(fileList) {
  if (!fileList.length) return
  uploading.value = true
  uploadResult.value = null
  uploadProgress.value = { done: 0, total: fileList.length }

  // 每次最多 10 個一批
  const batchSize = 10
  const saved = [], failed = []
  for (let i = 0; i < fileList.length; i += batchSize) {
    const batch = fileList.slice(i, i + batchSize)
    const fd = new FormData()
    batch.forEach(f => fd.append('files', f))
    try {
      const res = await (await fetch(`${BASE()}/upload`, { method: 'POST', body: fd })).json()
      saved.push(...(res.saved || []))
      failed.push(...(res.failed || []))
    } catch (e) { failed.push(...batch.map(f => f.name)) }
    uploadProgress.value.done += batch.length
  }

  uploading.value = false
  uploadResult.value = { saved, failed }
  await fetchFiles()
}

// ── 刪除 ─────────────────────────────────────────────────
function deleteSingle(name) { confirmDelete.value = { names: [name] } }
function deleteSelected()   { confirmDelete.value = { names: [...selectedFiles.value] } }
function toggleSelectAll(e) { selectedFiles.value = e.target.checked ? files.value.map(f => f.name) : [] }

async function doDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    for (const name of confirmDelete.value.names) {
      await fetch(`${BASE()}/remove/${encodeURIComponent(name)}`, { method: 'DELETE' })
    }
  } catch (e) { console.error(e) }
  deleting.value = false
  confirmDelete.value = null
  await fetchFiles()
}

// ── 格式化 ───────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/1024/1024).toFixed(1) + ' MB'
}
function formatDate(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

onMounted(fetchFiles)
</script>

<style scoped>
.spinner {
  border-top-color: #16a34a;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
