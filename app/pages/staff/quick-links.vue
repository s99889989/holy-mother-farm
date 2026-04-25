<template>
  <div class="min-h-screen bg-stone-50">

    <!-- Header -->
    <div class="bg-white border-b border-stone-200 px-4 py-3">
      <div class="max-w-4xl mx-auto flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">🔗</div>
        <div class="flex-1 min-w-0">
          <h1 class="font-bold text-stone-800 text-sm sm:text-base leading-none">常用網址</h1>
          <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Quick Links</p>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">

      <div v-if="categories.length === 0" class="text-center py-16 text-stone-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>
        <p class="text-sm">目前尚無任何常用網址</p>
      </div>

      <!-- 分類區塊 -->
      <div v-for="cat in categories" :key="cat.id"
           class="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

        <!-- 分類標題列 -->
        <div class="flex items-center px-4 py-3 bg-stone-50 border-b border-stone-200">
          <h2 class="font-semibold text-stone-700">{{ cat.name }}</h2>
          <span class="text-xs text-stone-400 ml-2">{{ cat.links.length }} 個</span>
        </div>

        <!-- 網址列表 -->
        <div v-if="cat.links.length === 0" class="px-4 py-6 text-center text-stone-400 text-sm">
          此分類尚無網址
        </div>
        <div v-else class="divide-y divide-stone-100">
          <div v-for="link in cat.links" :key="link.id"
               class="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors group">
            <!-- 網址圖示 -->
            <div class="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
              <img :src="`https://www.google.com/s2/favicons?domain=${getDomain(link.url)}&sz=32`"
                   class="w-5 h-5 rounded"
                   @error="$event.target.style.display='none'" />
            </div>
            <!-- 內容 -->
            <div class="flex-1 min-w-0">
              <a :href="link.url" target="_blank" rel="noopener"
                 class="font-medium text-blue-600 hover:underline text-sm truncate block">
                {{ link.name }}
              </a>
              <p class="text-xs text-stone-400 truncate">{{ link.url }}</p>
              <p v-if="link.note" class="text-xs text-stone-500 italic mt-0.5">{{ link.note }}</p>
            </div>
            <!-- 開啟按鈕 -->
            <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <a :href="link.url" target="_blank" rel="noopener"
                 class="p-1.5 text-stone-400 hover:text-blue-600 transition-colors" title="開啟">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff' })
useSiteHead()

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/links'

const categories = ref([])

const fetchLinks = async () => {
  try {
    categories.value = await (await fetch(`${BASE()}/list`)).json()
  } catch (e) { console.error(e) }
}

const getDomain = (url) => {
  try { return new URL(url).hostname } catch { return '' }
}

onMounted(fetchLinks)
</script>

<style scoped>
</style>

<style lang="scss">
@use '~/assets/scss/all' as *;
</style>
