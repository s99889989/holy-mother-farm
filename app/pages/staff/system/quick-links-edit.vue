<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors">

    <!-- Header -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-14 z-20">
      <div class="max-w-2xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">🔗</div>
        <div class="flex-1">
          <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none" style="font-size:15px">常用網址</h1>
        </div>
        <button @click="openCatModal(null)"
                class="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
                style="font-size:13px">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          新增分類
        </button>
      </div>
    </header>

    <!-- 分類 Tab 列 -->
    <div v-if="categories.length > 0"
         class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 sticky top-[calc(3.5rem+49px)] z-10">
      <div class="max-w-2xl mx-auto">
        <div class="tab-scroll flex gap-1 px-3 py-2 overflow-x-auto">
          <button
            v-for="(cat, catIdx) in categories" :key="cat.id"
            class="tab-btn group flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            :class="activeId === cat.id
              ? 'bg-green-700 text-white font-semibold'
              : 'bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-zinc-600'"
            style="font-size:13px"
            @click="activeId = cat.id"
          >
            {{ cat.name }}
            <span class="opacity-60" style="font-size:11px">{{ cat.links.length }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 內容區 -->
    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="text-center py-8 text-stone-400" style="font-size:13px">載入中...</div>

      <template v-else>

        <!-- 空狀態 -->
        <div v-if="categories.length === 0"
             class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-10 text-center text-stone-400 shadow-sm">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <p style="font-size:13px">目前尚無任何常用網址，點右上角「新增分類」開始</p>
        </div>

        <template v-if="activeCat">

          <!-- 分類操作列 -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <!-- 分類排序 -->
              <div class="flex gap-1">
                <button @click="moveCat(activeCatIdx, -1)" :disabled="activeCatIdx === 0"
                        class="p-1 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <button @click="moveCat(activeCatIdx, 1)" :disabled="activeCatIdx === categories.length - 1"
                        class="p-1 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
              <span class="text-stone-500 dark:text-stone-300 font-semibold" style="font-size:13px">{{ activeCat.name }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button @click="openLinkModal(activeCat.id, null)"
                      class="flex items-center gap-1 px-2.5 py-1 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
                      style="font-size:12px">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                新增網址
              </button>
              <button @click="openCatModal(activeCat)"
                      class="p-1.5 text-stone-400 hover:text-green-700 transition-colors" title="編輯分類">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button @click="deleteCategory(activeCat)"
                      class="p-1.5 text-stone-300 hover:text-red-400 transition-colors" title="刪除分類">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <!-- 此分類無連結 -->
          <div v-if="activeCat.links.length === 0"
               class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-10 text-center text-stone-400 shadow-sm"
               style="font-size:13px">
            此分類尚無網址，點「新增網址」加入連結
          </div>

          <!-- 卡片 Grid -->
          <div v-else class="link-grid">
            <div
              v-for="(link, linkIdx) in activeCat.links" :key="link.id"
              class="link-card bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-3 flex flex-col gap-2 shadow-sm relative group"
            >
              <!-- 排序按鈕 -->
              <div class="absolute top-2 left-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button @click="moveLink(activeCat, linkIdx, -1)" :disabled="linkIdx === 0"
                        class="p-0.5 bg-white/90 dark:bg-zinc-700/90 rounded text-stone-400 hover:text-stone-700 disabled:opacity-20 shadow-sm transition-colors">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <button @click="moveLink(activeCat, linkIdx, 1)" :disabled="linkIdx === activeCat.links.length - 1"
                        class="p-0.5 bg-white/90 dark:bg-zinc-700/90 rounded text-stone-400 hover:text-stone-700 disabled:opacity-20 shadow-sm transition-colors">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>

              <!-- 操作按鈕（右上角） -->
              <div class="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button @click.prevent="openLinkModal(activeCat.id, link)"
                        class="p-1 bg-white/90 dark:bg-zinc-700/90 rounded text-stone-400 hover:text-amber-500 shadow-sm transition-colors" title="編輯">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button @click.prevent="deleteLink(activeCat, link)"
                        class="p-1 bg-white/90 dark:bg-zinc-700/90 rounded text-stone-300 hover:text-red-400 shadow-sm transition-colors" title="刪除">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>

              <!-- 點擊開啟連結 -->
              <a :href="link.url" target="_blank" rel="noopener" class="flex flex-col gap-2 min-h-0">
                <div class="flex items-start justify-between">
                  <div class="w-10 h-10 rounded-xl bg-stone-100 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img
                      :src="`https://www.google.com/s2/favicons?domain=${getDomain(link.url)}&sz=64`"
                      class="w-6 h-6 rounded"
                      @error="onFaviconError($event, link.name)"
                    />
                  </div>
                  <svg class="w-3 h-3 text-stone-300 dark:text-stone-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                </div>
                <div>
                  <p class="font-semibold text-stone-800 dark:text-stone-100 leading-snug line-clamp-2" style="font-size:13px">
                    {{ link.name }}
                  </p>
                  <p v-if="link.note" class="text-stone-400 dark:text-stone-500 mt-0.5 line-clamp-1" style="font-size:11px">
                    {{ link.note }}
                  </p>
                </div>
              </a>
            </div>
          </div>

        </template>
      </template>
    </div>

    <!-- 分類 Modal -->
    <div v-if="catModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-4">{{ catModal.isNew ? '新增分類' : '編輯分類' }}</h3>
        <input v-model="catModal.name" placeholder="分類名稱" @keydown.enter="saveCategory"
               class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500 mb-4" />
        <div class="flex gap-2">
          <button @click="catModal.show = false"
                  class="flex-1 py-2 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="saveCategory" :disabled="!catModal.name.trim()"
                  class="flex-1 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors">儲存</button>
        </div>
      </div>
    </div>

    <!-- 網址 Modal -->
    <div v-if="linkModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-4">{{ linkModal.isNew ? '新增網址' : '編輯網址' }}</h3>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">名稱 *</label>
            <input v-model="linkModal.name" placeholder="Google、公司系統…"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">網址 *</label>
            <input v-model="linkModal.url" placeholder="https://…" type="url"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">備註</label>
            <input v-model="linkModal.note" placeholder="簡短說明（選填）"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button @click="linkModal.show = false"
                  class="flex-1 py-2 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="saveLink" :disabled="!linkModal.name.trim() || !linkModal.url.trim()"
                  class="flex-1 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors">儲存</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show" class="fixed bottom-6 right-6 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
definePageMeta({layout: 'staff', requiredPermission: 'staff.quick-links.edit'})

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/links'

const loading = ref(false)
const categories = ref([])
const activeId = ref(null)
const toast = reactive({show: false, message: ''})
const catModal = reactive({show: false, isNew: true, id: '', name: ''})
const linkModal = reactive({show: false, isNew: true, catId: '', id: '', name: '', url: '', note: ''})

const activeCat = computed(() => categories.value.find(c => c.id === activeId.value) ?? null)
const activeCatIdx = computed(() => categories.value.findIndex(c => c.id === activeId.value))

// ── 資料載入 ──────────────────────────────────────────────────────
const fetchLinks = async () => {
  loading.value = true
  try {
    categories.value = await (await fetch(`${BASE()}/list`)).json()
    if (categories.value.length > 0) activeId.value = categories.value[0].id
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ── 分類 ──────────────────────────────────────────────────────────
const openCatModal = (cat) => {
  catModal.isNew = !cat
  catModal.id = cat?.id || ''
  catModal.name = cat?.name || ''
  catModal.show = true
}

const saveCategory = async () => {
  if (!catModal.name.trim()) return
  try {
    const res = await fetch(`${BASE()}/category/save`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id: catModal.id, name: catModal.name.trim()})
    })
    const {id} = await res.json()
    if (catModal.isNew) {
      categories.value.push({id, name: catModal.name.trim(), links: [], order: 99})
      activeId.value = id
    } else {
      const cat = categories.value.find(c => c.id === catModal.id)
      if (cat) cat.name = catModal.name.trim()
    }
    catModal.show = false
    showToast(catModal.isNew ? '分類已新增' : '分類已更新')
  } catch {
    showToast('儲存失敗')
  }
}

const deleteCategory = async (cat) => {
  if (!confirm(`確定刪除分類「${cat.name}」及其所有網址？`)) return
  try {
    await fetch(`${BASE()}/category/${cat.id}`, {method: 'DELETE'})
    categories.value = categories.value.filter(c => c.id !== cat.id)
    activeId.value = categories.value[0]?.id ?? null
    showToast('分類已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

const moveCat = async (idx, dir) => {
  const arr = categories.value
  const swapIdx = idx + dir
  if (swapIdx < 0 || swapIdx >= arr.length) return
  const currentId = arr[idx].id
  ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
  categories.value = [...arr]
  activeId.value = currentId
  await fetch(`${BASE()}/sort`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'category', ids: arr.map(c => c.id)})
  })
}

// ── 網址 ──────────────────────────────────────────────────────────
const openLinkModal = (catId, link) => {
  linkModal.isNew = !link
  linkModal.catId = catId
  linkModal.id = link?.id || ''
  linkModal.name = link?.name || ''
  linkModal.url = link?.url || ''
  linkModal.note = link?.note || ''
  linkModal.show = true
}

const saveLink = async () => {
  if (!linkModal.name.trim() || !linkModal.url.trim()) return
  let url = linkModal.url.trim()
  if (!url.startsWith('http')) url = 'https://' + url
  try {
    const res = await fetch(`${BASE()}/save`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        catId: linkModal.catId,
        id: linkModal.id,
        name: linkModal.name.trim(),
        url,
        note: linkModal.note.trim()
      })
    })
    const {id} = await res.json()
    const cat = categories.value.find(c => c.id === linkModal.catId)
    if (cat) {
      if (linkModal.isNew) {
        cat.links.push({id, name: linkModal.name.trim(), url, note: linkModal.note.trim(), order: 99})
      } else {
        const lk = cat.links.find(l => l.id === linkModal.id)
        if (lk) {
          lk.name = linkModal.name.trim();
          lk.url = url;
          lk.note = linkModal.note.trim()
        }
      }
    }
    linkModal.show = false
    showToast(linkModal.isNew ? '網址已新增' : '網址已更新')
  } catch {
    showToast('儲存失敗')
  }
}

const deleteLink = async (cat, link) => {
  if (!confirm(`確定刪除「${link.name}」？`)) return
  try {
    await fetch(`${BASE()}/remove/${cat.id}/${link.id}`, {method: 'DELETE'})
    cat.links = cat.links.filter(l => l.id !== link.id)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

const moveLink = async (cat, idx, dir) => {
  const arr = cat.links
  const swapIdx = idx + dir
  if (swapIdx < 0 || swapIdx >= arr.length) return
    ;
  [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
  cat.links = [...arr]
  await fetch(`${BASE()}/sort`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'link', catId: cat.id, ids: arr.map(l => l.id)})
  })
}

// ── 工具 ──────────────────────────────────────────────────────────
const getDomain = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function onFaviconError(event, name) {
  const img = event.target
  const parent = img.parentElement
  img.remove()
  const span = document.createElement('span')
  span.textContent = name?.charAt(0)?.toUpperCase() || '?'
  span.style.cssText = 'font-size:16px;font-weight:700;color:#94a3b8;'
  parent.appendChild(span)
}

const showToast = (msg) => {
  toast.message = msg;
  toast.show = true;
  setTimeout(() => toast.show = false, 2500)
}

onMounted(fetchLinks)
</script>

<style scoped>
.tab-scroll {
  scrollbar-width: none;
}

.tab-scroll::-webkit-scrollbar {
  display: none;
}

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
  transform: scale(0.97);
}

.link-card:hover {
  border-color: #a8d5b5;
  box-shadow: 0 2px 10px rgba(45, 106, 79, 0.1);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
