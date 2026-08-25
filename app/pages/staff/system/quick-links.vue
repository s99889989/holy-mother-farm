<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="max-w-2xl md:max-w-6xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">🔗</div>
        <div class="flex-1">
          <h1 class="font-bold text-base-c leading-none" style="font-size:15px">常用網址</h1>
        </div>
        <button
          class="px-3 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0 md:hidden"
          :class="editMode ? 'bg-green-700 text-white' : 'bg-surface2 text-muted-c hover-surface2'"
          style="font-size:12.5px"
          @click="toggleEditMode"
        >
          {{ editMode ? '完成編輯' : '管理' }}
        </button>
      </div>
    </header>

    <!-- 電腦版：左側控制（分類）＋ 右側選項（網址）；手機版：分類為上方水平 Tab -->
    <div class="max-w-2xl md:max-w-6xl mx-auto md:flex md:items-start md:gap-6 md:px-4 md:pt-4">

      <!-- 分類 Tab / 側邊控制欄 -->
      <div v-if="categories.length > 0 || editMode"
           class="bg-surface border-b border-light-c sticky top-0 z-10 md:static md:sticky md:top-4 md:w-52 md:flex-shrink-0 md:border md:border-light-c md:rounded-2xl md:shadow-sm md:p-3">

        <!-- 管理／完成編輯（電腦版顯示於側邊欄頂部） -->
        <button
          class="hidden md:flex w-full items-center justify-center px-3 py-2 rounded-lg font-semibold transition-colors mb-3"
          :class="editMode ? 'bg-green-700 text-white' : 'bg-surface2 text-muted-c hover-surface2'"
          style="font-size:12.5px"
          @click="toggleEditMode"
        >
          {{ editMode ? '完成編輯' : '管理' }}
        </button>

        <div class="flex flex-wrap gap-1.5 px-3 py-2 md:flex-col md:flex-nowrap md:gap-1.5 md:px-0 md:py-0">
          <button
            v-for="(cat, idx) in categories" :key="cat.id"
            class="tab-btn flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 md:w-full md:justify-between"
            :class="[
              activeId === cat.id ? 'bg-green-700 text-white font-semibold' : 'bg-surface2 text-muted-c hover-surface2',
              editMode ? 'cursor-move' : ''
            ]"
            style="font-size:13px"
            :draggable="editMode"
            @dragstart="onCatDragStart(idx)"
            @dragover.prevent
            @dragenter.prevent
            @drop="onCatDrop(idx)"
            @click="activeId = cat.id"
          >
            {{ cat.name }}
            <span class="opacity-60" style="font-size:11px">{{ cat.links.length }}</span>
            <template v-if="editMode">
              <span class="icon-btn opacity-80 hover:opacity-100" @click.stop="openEditCategory(cat)">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </span>
              <span class="icon-btn opacity-80 hover:opacity-100" @click.stop="deleteCategoryConfirm(cat)">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </span>
            </template>
          </button>

          <button
            v-if="editMode"
            class="flex-shrink-0 px-3 py-1.5 rounded-lg border border-dashed border-light-c text-hint-c whitespace-nowrap hover-surface2 md:w-full md:text-center"
            style="font-size:13px"
            @click="openAddCategory"
          >
            ＋ 新增分類
          </button>
        </div>
      </div>

      <!-- 內容區 -->
      <div class="px-3 sm:px-4 py-4 md:flex-1 md:min-w-0 md:px-0 md:py-0">

        <!-- 載入中 -->
        <div v-if="loading" class="text-center py-8 text-hint-c" style="font-size:13px">載入中...</div>

        <template v-else>

          <!-- 空狀態（唯讀模式且完全沒有分類） -->
          <div v-if="categories.length === 0 && !editMode"
               class="bg-surface rounded-2xl border border-light-c px-4 py-10 text-center text-hint-c shadow-sm">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            <p style="font-size:13px" class="mb-3">目前尚無任何常用網址</p>
            <button
              class="px-4 py-2 rounded-lg bg-green-700 text-white font-semibold hover:opacity-90"
              style="font-size:13px"
              @click="openAddCategory"
            >
              ＋ 新增分類
            </button>
          </div>

          <template v-if="activeCat">

            <!-- 此分類無連結（唯讀模式） -->
            <div v-if="activeCat.links.length === 0 && !editMode"
                 class="bg-surface rounded-2xl border border-light-c px-4 py-10 text-center text-hint-c shadow-sm"
                 style="font-size:13px">
              此分類尚無網址
            </div>

            <!-- 卡片 Grid -->
            <div v-else class="link-grid">
              <div
                v-for="(link, idx) in activeCat.links" :key="link.id"
                class="link-card bg-surface border border-light-c rounded-2xl p-3 flex flex-col gap-2 shadow-sm relative"
                :class="editMode ? 'cursor-move' : ''"
                :draggable="editMode"
                @dragstart="onLinkDragStart(idx)"
                @dragover.prevent
                @dragenter.prevent
                @drop="onLinkDrop(idx)"
              >
                <a
                  :href="link.url" target="_blank" rel="noopener"
                  class="flex flex-col gap-2"
                  :class="editMode ? 'pointer-events-none' : ''"
                >
                  <div class="flex items-start justify-between">
                    <div class="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        v-if="link.image"
                        :src="thumbUrl(link.image)"
                        class="w-full h-full object-cover"
                        @error="onFaviconError($event, link.name)"
                      />
                      <img
                        v-else
                        :src="`https://www.google.com/s2/favicons?domain=${getDomain(link.url)}&sz=64`"
                        class="w-6 h-6 rounded"
                        @error="onFaviconError($event, link.name)"
                      />
                    </div>
                    <svg v-if="!editMode" class="w-3 h-3 text-hint-c flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </div>

                  <div>
                    <p class="font-semibold text-base-c leading-snug line-clamp-2" style="font-size:13px">
                      {{ link.name }}
                    </p>
                    <p v-if="link.note" class="text-hint-c mt-0.5 line-clamp-1" style="font-size:11px">
                      {{ link.note }}
                    </p>
                  </div>
                </a>

                <!-- 圖示上傳／更換（編輯模式，疊在頭像方塊上方，左上角） -->
                <button
                  v-if="editMode"
                  class="absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center text-white opacity-0 hover:opacity-100 hover:bg-black/45 transition-all z-10"
                  title="上傳／更換圖示"
                  @click.stop="openLinkImageUpload(link)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>

                <!-- 移除圖示（編輯模式，僅在已有圖片時顯示，左下角） -->
                <button
                  v-if="editMode && link.image"
                  class="icon-btn absolute bottom-2 left-2 w-6 h-6 rounded-lg bg-surface2 flex items-center justify-center text-muted-c hover-surface2"
                  title="移除圖示"
                  @click.stop="removeLinkImageConfirm(link)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>

                <!-- QRCode 產生按鈕（唯讀模式，位於卡片右下角，避免與上方外連結圖示重疊） -->
                <button
                  v-if="!editMode"
                  class="icon-btn absolute bottom-2 right-2 w-6 h-6 rounded-lg bg-surface2 flex items-center justify-center text-hint-c hover-surface2"
                  title="產生 QRCode"
                  @click="openQrModal(link)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <rect width="5" height="5" x="3" y="3" rx="1"/>
                    <rect width="5" height="5" x="16" y="3" rx="1"/>
                    <rect width="5" height="5" x="3" y="16" rx="1"/>
                    <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                    <path d="M21 21v.01"/>
                    <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                    <path d="M3 12h.01"/>
                    <path d="M12 3h.01"/>
                    <path d="M12 16v.01"/>
                    <path d="M16 12h1"/>
                    <path d="M21 12v.01"/>
                    <path d="M12 21v-1"/>
                  </svg>
                </button>

                <div v-if="editMode" class="absolute top-2 right-2 flex gap-1">
                  <button
                    class="icon-btn w-6 h-6 rounded-lg bg-surface2 flex items-center justify-center text-muted-c hover-surface2"
                    title="編輯"
                    @click.stop="openEditLink(link)"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    class="icon-btn w-6 h-6 rounded-lg bg-surface2 flex items-center justify-center text-muted-c hover-surface2"
                    @click.stop="deleteLinkConfirm(link)"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 新增網址卡 -->
              <button
                v-if="editMode"
                class="link-card border border-dashed border-light-c rounded-2xl p-3 flex flex-col items-center justify-center gap-1 text-hint-c hover-surface2"
                style="min-height:96px"
                @click="openAddLink"
              >
                <span style="font-size:22px;line-height:1;">＋</span>
                <span style="font-size:12px;">新增網址</span>
              </button>
            </div>

          </template>
        </template>
      </div>
    </div>

    <!-- ===== 分類 新增／編輯 Modal ===== -->
    <div v-if="catModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @click.self="closeCategoryModal">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">{{ catModal.id ? '編輯分類' : '新增分類' }}</h2>

        <label class="block text-hint-c mb-1" style="font-size:12px">分類名稱</label>
        <input
          v-model="catModal.name" type="text"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-1 bg-surface2 text-base-c"
          style="font-size:13px" placeholder="例如：常用系統"
          @keyup.enter="saveCategoryModal"
        />
        <p v-if="modalError" class="text-red-500 mb-2" style="font-size:11.5px">{{ modalError }}</p>
        <div class="h-3" v-else></div>

        <div class="flex justify-end gap-2 mt-2">
          <button class="px-3 py-1.5 rounded-lg bg-surface2 text-muted-c hover-surface2" style="font-size:13px" @click="closeCategoryModal">取消</button>
          <button class="px-3 py-1.5 rounded-lg bg-green-700 text-white font-semibold disabled:opacity-50" style="font-size:13px" :disabled="saving" @click="saveCategoryModal">
            {{ saving ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 網址 新增／編輯 Modal ===== -->
    <div v-if="linkModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @click.self="closeLinkModal">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">{{ linkModal.id ? '編輯網址' : '新增網址' }}</h2>

        <label class="block text-hint-c mb-1" style="font-size:12px">名稱</label>
        <input
          v-model="linkModal.name" type="text"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c"
          style="font-size:13px" placeholder="例如：庫存系統"
        />

        <label v-if="categories.length > 1" class="block text-hint-c mb-1" style="font-size:12px">分類</label>
        <select
          v-if="categories.length > 1"
          v-model="linkModal.catId"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c"
          style="font-size:13px"
        >
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>

        <label class="block text-hint-c mb-1" style="font-size:12px">網址</label>
        <input
          v-model="linkModal.url" type="url"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c"
          style="font-size:13px" placeholder="https://"
        />

        <label class="block text-hint-c mb-1" style="font-size:12px">備註（選填）</label>
        <input
          v-model="linkModal.note" type="text"
          class="w-full border border-light-c rounded-lg px-3 py-2 mb-1 bg-surface2 text-base-c"
          style="font-size:13px" placeholder="簡短說明"
          @keyup.enter="saveLinkModal"
        />
        <p v-if="modalError" class="text-red-500 mb-2" style="font-size:11.5px">{{ modalError }}</p>
        <div class="h-3" v-else></div>

        <div class="flex justify-end gap-2 mt-2">
          <button class="px-3 py-1.5 rounded-lg bg-surface2 text-muted-c hover-surface2" style="font-size:13px" @click="closeLinkModal">取消</button>
          <button class="px-3 py-1.5 rounded-lg bg-green-700 text-white font-semibold disabled:opacity-50" style="font-size:13px" :disabled="saving" @click="saveLinkModal">
            {{ saving ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== QRCode Modal ===== -->
    <div v-if="qrModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @click.self="closeQrModal">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-xs p-5 text-center">
        <h2 class="font-bold text-base-c mb-1 line-clamp-1" style="font-size:15px">{{ qrModal.name }}</h2>
        <p class="text-hint-c mb-3 break-all" style="font-size:11px">{{ qrModal.url }}</p>

        <div class="flex items-center justify-center gap-2 mb-3">
          <span class="text-hint-c" style="font-size:12px">進階樣式（含圖示）</span>
          <button
            class="relative w-9 h-5 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
            :class="qrModal.withLogo ? 'bg-green-700' : 'bg-surface2 border border-light-c'"
            role="switch"
            :aria-checked="qrModal.withLogo"
            :disabled="qrModal.generating"
            @click="toggleQrLogo"
          >
            <span
              class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
              :class="qrModal.withLogo ? 'translate-x-4' : ''"
            ></span>
          </button>
        </div>

        <div class="flex items-center justify-center mb-4">
          <div
            v-if="qrModal.generating"
            class="w-48 h-48 rounded-lg border border-light-c flex items-center justify-center text-hint-c"
            style="font-size:12px"
          >
            產生中...
          </div>
          <div
            v-else-if="qrModal.error"
            class="w-48 h-48 rounded-lg border border-light-c flex items-center justify-center text-red-500 px-3"
            style="font-size:12px"
          >
            {{ qrModal.error }}
          </div>
          <img
            v-else
            :src="qrModal.dataUrl"
            class="w-48 h-48 rounded-lg border border-light-c bg-white p-2"
            alt="QRCode"
          />
        </div>

        <div class="flex justify-center gap-2">
          <button class="px-3 py-1.5 rounded-lg bg-surface2 text-muted-c hover-surface2" style="font-size:13px" @click="closeQrModal">
            關閉
          </button>
          <button
            class="px-3 py-1.5 rounded-lg bg-green-700 text-white font-semibold disabled:opacity-50"
            style="font-size:13px"
            :disabled="qrModal.generating || !!qrModal.error || !qrModal.dataUrl"
            @click="downloadQr"
          >
            下載圖片
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'system.quick-links' })

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/links'

const thumbUrl = (path) => {
  if (!path) return ''
  const full = path.startsWith('http') ? path : commonStore.data.main_url + path
  return full.replace('/holy/links/image/', '/holy/links/image/thumb/')
}

// 上傳前在前端壓縮圖片，減少上傳流量（後端仍會再統一轉成 WebP）
const compressImage = (file, maxWidth = 800, quality = 0.85) => {
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
      resolve(file) // 壓縮失敗就用原檔
    }
    img.src = url
  })
}

const loading    = ref(false)
const categories = ref([])
const activeId   = ref(null)
const editMode   = ref(false)

const activeCat = computed(() => categories.value.find(c => c.id === activeId.value) ?? null)

/* ---------------- 記住上次選取的分類 ---------------- */

const ACTIVE_CAT_STORAGE_KEY = 'quickLinksActiveCatId'

function loadSavedActiveId() {
  try { return localStorage.getItem(ACTIVE_CAT_STORAGE_KEY) } catch { return null }
}
function saveActiveId(id) {
  try {
    if (id === null || id === undefined) {
      localStorage.removeItem(ACTIVE_CAT_STORAGE_KEY)
    } else {
      localStorage.setItem(ACTIVE_CAT_STORAGE_KEY, String(id))
    }
  } catch { /* localStorage 不可用時忽略 */ }
}

// 選取分類的變動都存起來，下次進來自動帶回
watch(activeId, (id) => saveActiveId(id))

// 取得清單；若目前選取的分類仍存在則保留選取；否則優先還原上次儲存的分類，避免每次進來都跳回第一個
const fetchLinks = async () => {
  loading.value = true
  try {
    const data = await (await fetch(`${BASE()}/list`)).json()
    categories.value = data
    const stillExists = categories.value.some(c => c.id === activeId.value)
    if (!stillExists) {
      const savedId = loadSavedActiveId()
      const savedMatch = savedId !== null
        ? categories.value.find(c => String(c.id) === savedId)
        : null
      activeId.value = savedMatch ? savedMatch.id : (categories.value.length > 0 ? categories.value[0].id : null)
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const getDomain = (url) => {
  try { return new URL(url).hostname } catch { return '' }
}

function onFaviconError(event, name) {
  const img    = event.target
  const parent = img.parentElement
  img.remove()
  const span = document.createElement('span')
  span.textContent = name?.charAt(0)?.toUpperCase() || '?'
  span.style.cssText = 'font-size:16px;font-weight:700;color:#94a3b8;'
  parent.appendChild(span)
}

function toggleEditMode() {
  editMode.value = !editMode.value
}

/* ---------------- 分類：新增／編輯／刪除 ---------------- */

const catModal   = reactive({ open: false, id: null, name: '' })
const saving     = ref(false)
const modalError = ref('')

function openAddCategory() {
  catModal.open = true
  catModal.id = null
  catModal.name = ''
  modalError.value = ''
}
function openEditCategory(cat) {
  catModal.open = true
  catModal.id = cat.id
  catModal.name = cat.name
  modalError.value = ''
}
function closeCategoryModal() {
  catModal.open = false
}
async function saveCategoryModal() {
  if (!catModal.name.trim()) {
    modalError.value = '請輸入分類名稱'
    return
  }
  saving.value = true
  modalError.value = ''
  try {
    const body = { name: catModal.name.trim() }
    if (catModal.id) body.id = catModal.id
    await fetch(`${BASE()}/category/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    closeCategoryModal()
    await fetchLinks()
  } catch (e) {
    console.error(e)
    modalError.value = '儲存失敗，請稍後再試'
  } finally {
    saving.value = false
  }
}
async function deleteCategoryConfirm(cat) {
  if (!confirm(`確定要刪除分類「${cat.name}」嗎？此分類底下的網址也會一併刪除。`)) return
  try {
    await fetch(`${BASE()}/category/${cat.id}`, { method: 'DELETE' })
    await fetchLinks()
  } catch (e) { console.error(e) }
}

/* ---------------- 分類：拖曳排序 ---------------- */

const dragCatIndex = ref(null)
function onCatDragStart(idx) {
  dragCatIndex.value = idx
}
async function onCatDrop(idx) {
  if (dragCatIndex.value === null || dragCatIndex.value === idx) return
  const arr = categories.value
  const [moved] = arr.splice(dragCatIndex.value, 1)
  arr.splice(idx, 0, moved)
  dragCatIndex.value = null
  try {
    await fetch(`${BASE()}/sort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'category', ids: categories.value.map(c => c.id) }),
    })
  } catch (e) { console.error(e) }
}

/* ---------------- 網址：新增／編輯／刪除 ---------------- */

const linkModal = reactive({ open: false, catId: null, id: null, name: '', url: '', note: '' })

function openAddLink() {
  if (!activeCat.value) return
  linkModal.open = true
  linkModal.catId = activeCat.value.id
  linkModal.id = null
  linkModal.name = ''
  linkModal.url = ''
  linkModal.note = ''
  modalError.value = ''
}
function openEditLink(link) {
  if (!activeCat.value) return
  linkModal.open = true
  linkModal.catId = activeCat.value.id
  linkModal.id = link.id
  linkModal.name = link.name
  linkModal.url = link.url
  linkModal.note = link.note || ''
  modalError.value = ''
}
function closeLinkModal() {
  linkModal.open = false
}
async function saveLinkModal() {
  if (!linkModal.name.trim() || !linkModal.url.trim()) {
    modalError.value = '請輸入名稱與網址'
    return
  }
  saving.value = true
  modalError.value = ''
  try {
    const originalCatId = activeCat.value?.id ?? null
    const body = {
      catId: linkModal.id ? originalCatId : linkModal.catId,
      name: linkModal.name.trim(),
      url: linkModal.url.trim(),
      note: linkModal.note.trim(),
    }
    if (linkModal.id) body.id = linkModal.id
    await fetch(`${BASE()}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // 編輯時若分類有變更，另外呼叫移動分類 API
    if (linkModal.id && linkModal.catId !== originalCatId) {
      await fetch(`${BASE()}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCatId: originalCatId,
          toCatId: linkModal.catId,
          id: linkModal.id,
        }),
      })
    }

    closeLinkModal()
    await fetchLinks()
  } catch (e) {
    console.error(e)
    modalError.value = '儲存失敗，請稍後再試'
  } finally {
    saving.value = false
  }
}
async function deleteLinkConfirm(link) {
  if (!activeCat.value) return
  if (!confirm(`確定要刪除「${link.name}」嗎？`)) return
  try {
    await fetch(`${BASE()}/remove/${activeCat.value.id}/${link.id}`, { method: 'DELETE' })
    await fetchLinks()
  } catch (e) { console.error(e) }
}

/* ---------------- 網址：圖示上傳／移除 ---------------- */

function openLinkImageUpload(link) {
  if (!activeCat.value) return
  const catId = activeCat.value.id
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)
      const res = await fetch(`${BASE()}/image/upload/${catId}/${link.id}`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('上傳失敗')
      const data = await res.json()
      link.image = data.image
    } catch (e) {
      console.error(e)
      alert('圖片上傳失敗，請稍後再試')
    }
  }
  input.click()
}

async function removeLinkImageConfirm(link) {
  if (!activeCat.value || !link.image) return
  if (!confirm('確定要移除這個圖示嗎？')) return
  try {
    await fetch(`${BASE()}/image/remove/${activeCat.value.id}/${link.id}`, { method: 'DELETE' })
    link.image = ''
  } catch (e) { console.error(e) }
}

/* ---------------- 網址：拖曳排序 ---------------- */

const dragLinkIndex = ref(null)
function onLinkDragStart(idx) {
  dragLinkIndex.value = idx
}
async function onLinkDrop(idx) {
  if (dragLinkIndex.value === null || dragLinkIndex.value === idx || !activeCat.value) return
  const arr = activeCat.value.links
  const [moved] = arr.splice(dragLinkIndex.value, 1)
  arr.splice(idx, 0, moved)
  dragLinkIndex.value = null
  try {
    await fetch(`${BASE()}/sort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'link', catId: activeCat.value.id, ids: arr.map(l => l.id) }),
    })
  } catch (e) { console.error(e) }
}

/* ---------------- QRCode 產生／下載 ---------------- */

const qrModal = reactive({
  open: false,
  name: '',
  url: '',
  link: null,
  dataUrl: '',
  generating: false,
  error: '',
  withLogo: false,
})

// 畫圓角矩形（用於中心圖示的白色底框）
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 嘗試把網站的 favicon 轉成 data URL（用 fetch+blob 而非直接畫 <img>，
// 避免來源沒有開放 CORS 時把 canvas「污染」導致之後 toDataURL 失敗；
// 若來源不允許 CORS，fetch 本身就會失敗，直接回傳 null 走備用方案）
async function fetchFaviconAsDataUrl(domain) {
  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// 產生 QRCode；withLogo 時使用高容錯等級，並在中心疊加圓形圖示做出類似 LINE 的樣式：
// 優先使用網站本身的 favicon，若無法取得（跨網域不開放）則改用名稱首字當作圖示
async function generateQrDataUrl(link, withLogo) {
  const { default: QRCode } = await import('qrcode')
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, link.url, {
    width: 300,
    margin: 1,
    errorCorrectionLevel: withLogo ? 'H' : 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })

  if (withLogo) {
    const ctx  = canvas.getContext('2d')
    const size = canvas.width
    const cx   = size / 2
    const cy   = size / 2

    const logoSize = Math.round(size * 0.22)
    const pad      = 6
    const boxSize  = logoSize + pad * 2

    // 外層白色圓角方框，避免圖示直接壓在 QR 模組上造成邊緣難以辨識
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, cx - boxSize / 2, cy - boxSize / 2, boxSize, boxSize, 10)
    ctx.fill()

    let drewFavicon = false
    const faviconDataUrl = await fetchFaviconAsDataUrl(getDomain(link.url))
    if (faviconDataUrl) {
      try {
        const img = await loadImageEl(faviconDataUrl)
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize)
        ctx.drawImage(img, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize)
        ctx.restore()
        drewFavicon = true
      } catch { /* 圖片載入失敗，改用備用文字圖示 */ }
    }

    if (!drewFavicon) {
      // 備用：品牌色圓形 ＋ 名稱首字
      ctx.fillStyle = '#15803d'
      ctx.beginPath()
      ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.round(logoSize * 0.5)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText((link.name || '?').trim().charAt(0).toUpperCase(), cx, cy + 1)
    }
  }

  return canvas.toDataURL('image/png')
}

async function regenerateQr() {
  if (!qrModal.link) return
  qrModal.dataUrl = ''
  qrModal.error = ''
  qrModal.generating = true
  try {
    qrModal.dataUrl = await generateQrDataUrl(qrModal.link, qrModal.withLogo)
  } catch (e) {
    console.error(e)
    qrModal.error = '產生 QRCode 失敗'
  } finally {
    qrModal.generating = false
  }
}

async function openQrModal(link) {
  qrModal.open = true
  qrModal.name = link.name
  qrModal.url = link.url
  qrModal.link = link
  qrModal.withLogo = false
  await regenerateQr()
}

function toggleQrLogo() {
  qrModal.withLogo = !qrModal.withLogo
  regenerateQr()
}

function closeQrModal() {
  qrModal.open = false
}

function downloadQr() {
  if (!qrModal.dataUrl) return
  const a = document.createElement('a')
  a.href = qrModal.dataUrl
  a.download = `${qrModal.name || 'qrcode'}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

onMounted(fetchLinks)
</script>

<style scoped>
.tab-btn {
  -webkit-tap-highlight-color: transparent;
}
.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.link-card {
  -webkit-tap-highlight-color: transparent;
  text-decoration: none;
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
}
.link-card:active {
  transform: scale(0.95);
}
.link-card:hover {
  border-color: #a8d5b5;
  box-shadow: 0 2px 10px rgba(45, 106, 79, 0.1);
}
.icon-btn {
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:active {
  transform: scale(0.9);
}
</style>
