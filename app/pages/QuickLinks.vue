<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900">

    <!-- Header -->
    <div class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">🔗</div>
        <div class="flex-1 min-w-0">
          <h1 class="font-bold text-stone-800 dark:text-stone-100 text-sm sm:text-base leading-none">常用網址</h1>
          <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Quick Links</p>
        </div>
        <button @click="openCatModal(null)"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          新增分類
        </button>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">

      <div v-if="categories.length === 0" class="text-center py-16 text-stone-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
        <p class="text-sm">尚未新增任何分類，點右上角「新增分類」開始</p>
      </div>

      <!-- 分類區塊 -->
      <div v-for="(cat, catIdx) in categories" :key="cat.id"
        class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">

        <!-- 分類標題列 -->
        <div class="flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-zinc-800 border-b border-stone-200 dark:border-stone-700">
          <div class="flex items-center gap-2">
            <!-- 排序按鈕 -->
            <div class="flex flex-col gap-0.5">
              <button @click="moveCat(catIdx, -1)" :disabled="catIdx === 0"
                class="p-0.5 text-stone-300 hover:text-stone-600 disabled:opacity-20 transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
              </button>
              <button @click="moveCat(catIdx, 1)" :disabled="catIdx === categories.length - 1"
                class="p-0.5 text-stone-300 hover:text-stone-600 disabled:opacity-20 transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>
            <h2 class="font-semibold text-stone-700 dark:text-stone-100">{{ cat.name }}</h2>
            <span class="text-xs text-stone-400">{{ cat.links.length }} 個</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="openLinkModal(cat.id, null)"
              class="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              新增網址
            </button>
            <button @click="openCatModal(cat)"
              class="p-1.5 text-stone-400 hover:text-blue-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="deleteCategory(cat)"
              class="p-1.5 text-stone-300 hover:text-red-400 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>

        <!-- 網址列表 -->
        <div v-if="cat.links.length === 0" class="px-4 py-6 text-center text-stone-400 text-sm">
          點「新增網址」加入連結
        </div>
        <div v-else class="divide-y divide-stone-100 dark:divide-stone-800">
          <div v-for="(link, linkIdx) in cat.links" :key="link.id"
            class="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors group">
            <!-- 排序 -->
            <div class="flex flex-col gap-0.5 flex-shrink-0">
              <button @click="moveLink(cat, linkIdx, -1)" :disabled="linkIdx === 0"
                class="p-0.5 text-stone-200 dark:text-stone-700 hover:text-stone-500 disabled:opacity-0 transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
              </button>
              <button @click="moveLink(cat, linkIdx, 1)" :disabled="linkIdx === cat.links.length - 1"
                class="p-0.5 text-stone-200 dark:text-stone-700 hover:text-stone-500 disabled:opacity-0 transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>
            <!-- 網址圖示 -->
            <div class="w-8 h-8 rounded-lg bg-stone-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 text-sm">
              <img :src="`https://www.google.com/s2/favicons?domain=${getDomain(link.url)}&sz=32`"
                class="w-5 h-5 rounded"
                @error="$event.target.style.display='none'" />
            </div>
            <!-- 內容 -->
            <div class="flex-1 min-w-0">
              <a :href="link.url" target="_blank" rel="noopener"
                class="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm truncate block">
                {{ link.name }}
              </a>
              <p class="text-xs text-stone-400 truncate">{{ link.url }}</p>
              <p v-if="link.note" class="text-xs text-stone-500 dark:text-stone-400 italic mt-0.5">{{ link.note }}</p>
            </div>
            <!-- 操作 -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <a :href="link.url" target="_blank" rel="noopener"
                class="p-1.5 text-stone-400 hover:text-blue-600 transition-colors" title="開啟">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>
              <button @click="openLinkModal(cat.id, link)"
                class="p-1.5 text-stone-400 hover:text-amber-500 transition-colors" title="編輯">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button @click="deleteLink(cat, link)"
                class="p-1.5 text-stone-300 hover:text-red-400 transition-colors" title="刪除">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分類 Modal -->
    <div v-if="catModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-4">{{ catModal.isNew ? '新增分類' : '編輯分類' }}</h3>
        <input v-model="catModal.name" placeholder="分類名稱" @keydown.enter="saveCategory"
          class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400 mb-4" />
        <div class="flex gap-2">
          <button @click="catModal.show = false" class="flex-1 py-2 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="saveCategory" :disabled="!catModal.name.trim()" class="flex-1 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">儲存</button>
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
              class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">網址 *</label>
            <input v-model="linkModal.url" placeholder="https://…" type="url"
              class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">備註說明</label>
            <input v-model="linkModal.note" placeholder="用途說明、帳號提示…"
              class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="linkModal.show = false" class="flex-1 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="saveLink" :disabled="!linkModal.name.trim() || !linkModal.url.trim()"
            class="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">儲存</button>
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
import { ref, reactive, onMounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/links'

const categories = ref([])
const toast      = reactive({ show: false, message: '' })
const catModal   = reactive({ show: false, isNew: true, id: '', name: '' })
const linkModal  = reactive({ show: false, isNew: true, catId: '', id: '', name: '', url: '', note: '' })

const fetchLinks = async () => {
  try {
    categories.value = await (await fetch(`${BASE()}/list`)).json()
  } catch (e) { console.error(e) }
}

// ── 分類 ──────────────────────────────────────────────────────────
const openCatModal = (cat) => {
  catModal.isNew = !cat
  catModal.id    = cat?.id || ''
  catModal.name  = cat?.name || ''
  catModal.show  = true
}

const saveCategory = async () => {
  if (!catModal.name.trim()) return
  try {
    const res = await fetch(`${BASE()}/category/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: catModal.id, name: catModal.name.trim() })
    })
    const { id } = await res.json()
    if (catModal.isNew) {
      categories.value.push({ id, name: catModal.name.trim(), links: [], order: 99 })
    } else {
      const cat = categories.value.find(c => c.id === catModal.id)
      if (cat) cat.name = catModal.name.trim()
    }
    catModal.show = false
    showToast(catModal.isNew ? '分類已新增' : '分類已更新')
  } catch { showToast('儲存失敗') }
}

const deleteCategory = async (cat) => {
  if (!confirm(`確定刪除分類「${cat.name}」及其所有網址？`)) return
  try {
    await fetch(`${BASE()}/category/${cat.id}`, { method: 'DELETE' })
    categories.value = categories.value.filter(c => c.id !== cat.id)
    showToast('分類已刪除')
  } catch { showToast('刪除失敗') }
}

const moveCat = async (idx, dir) => {
  const arr = categories.value
  const swapIdx = idx + dir
  if (swapIdx < 0 || swapIdx >= arr.length) return
  ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
  categories.value = [...arr]
  await fetch(`${BASE()}/sort`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'category', ids: arr.map(c => c.id) })
  })
}

// ── 網址 ──────────────────────────────────────────────────────────
const openLinkModal = (catId, link) => {
  linkModal.isNew = !link
  linkModal.catId = catId
  linkModal.id    = link?.id   || ''
  linkModal.name  = link?.name || ''
  linkModal.url   = link?.url  || ''
  linkModal.note  = link?.note || ''
  linkModal.show  = true
}

const saveLink = async () => {
  if (!linkModal.name.trim() || !linkModal.url.trim()) return
  let url = linkModal.url.trim()
  if (!url.startsWith('http')) url = 'https://' + url
  try {
    const res = await fetch(`${BASE()}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catId: linkModal.catId, id: linkModal.id, name: linkModal.name.trim(), url, note: linkModal.note.trim() })
    })
    const { id } = await res.json()
    const cat = categories.value.find(c => c.id === linkModal.catId)
    if (cat) {
      if (linkModal.isNew) {
        cat.links.push({ id, name: linkModal.name.trim(), url, note: linkModal.note.trim(), order: 99 })
      } else {
        const lk = cat.links.find(l => l.id === linkModal.id)
        if (lk) { lk.name = linkModal.name.trim(); lk.url = url; lk.note = linkModal.note.trim() }
      }
    }
    linkModal.show = false
    showToast(linkModal.isNew ? '網址已新增' : '網址已更新')
  } catch { showToast('儲存失敗') }
}

const deleteLink = async (cat, link) => {
  if (!confirm(`確定刪除「${link.name}」？`)) return
  try {
    await fetch(`${BASE()}/remove/${cat.id}/${link.id}`, { method: 'DELETE' })
    cat.links = cat.links.filter(l => l.id !== link.id)
    showToast('已刪除')
  } catch { showToast('刪除失敗') }
}

const moveLink = async (cat, idx, dir) => {
  const arr = cat.links
  const swapIdx = idx + dir
  if (swapIdx < 0 || swapIdx >= arr.length) return
  ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
  cat.links = [...arr]
  await fetch(`${BASE()}/sort`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'link', catId: cat.id, ids: arr.map(l => l.id) })
  })
}

const getDomain = (url) => {
  try { return new URL(url).hostname } catch { return '' }
}

const showToast = (msg) => { toast.message = msg; toast.show = true; setTimeout(() => toast.show = false, 2500) }

onMounted(fetchLinks)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
