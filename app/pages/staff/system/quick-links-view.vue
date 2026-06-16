<template>
  <div class="min-h-full bg-stone-50 dark:bg-zinc-900 transition-colors">

    <!-- Header -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-20">
      <div class="max-w-2xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">🔗</div>
        <div>
          <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none" style="font-size:15px">常用網址</h1>
        </div>
      </div>
    </header>

    <!-- 分類 Tab 列 -->
    <div v-if="categories.length > 0"
         class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-10">
      <div class="max-w-2xl mx-auto">
        <div class="tab-scroll flex gap-1 px-3 py-2 overflow-x-auto">
          <button
            v-for="cat in categories" :key="cat.id"
            class="tab-btn flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            :class="activeId === cat.id
              ? 'bg-green-700 text-white font-semibold'
              : 'bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-zinc-600'"
            style="font-size:13px"
            @click="activeId = cat.id"
          >
            {{ cat.name }}
            <span class="ml-1 opacity-60" style="font-size:11px">{{ cat.links.length }}</span>
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
          <p style="font-size:13px">目前尚無任何常用網址</p>
        </div>

        <template v-if="activeCat">

          <!-- 此分類無連結 -->
          <div v-if="activeCat.links.length === 0"
               class="bg-white dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-10 text-center text-stone-400 shadow-sm"
               style="font-size:13px">
            此分類尚無網址
          </div>

          <!-- 卡片 Grid -->
          <div v-else class="link-grid">
            <a
              v-for="link in activeCat.links" :key="link.id"
              :href="link.url" target="_blank" rel="noopener"
              class="link-card bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-3 flex flex-col gap-2 shadow-sm"
            >
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

        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'staff.quick-links' })

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/links'

const loading    = ref(false)
const categories = ref([])
const activeId   = ref(null)

const activeCat = computed(() => categories.value.find(c => c.id === activeId.value) ?? null)

const fetchLinks = async () => {
  loading.value = true
  try {
    categories.value = await (await fetch(`${BASE()}/list`)).json()
    if (categories.value.length > 0) activeId.value = categories.value[0].id
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
  transform: scale(0.95);
}
.link-card:hover {
  border-color: #a8d5b5;
  box-shadow: 0 2px 10px rgba(45, 106, 79, 0.1);
}
</style>
