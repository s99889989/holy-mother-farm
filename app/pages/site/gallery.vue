<template>
  <div>
    <SitePageHero cover="/images/event/event-cover.png" title="相片館" />

    <div class="max-w-5xl mx-auto px-4 py-8">

      <!-- 資料夾分類 -->
      <div v-if="folders.length > 0" class="flex flex-wrap gap-2 mb-6">
        <button @click="selectFolder('全部')"
          class="px-4 py-1.5 rounded-full text-sm font-medium transition-all border"
          :style="selectedFolder === '全部' ? 'background-color:#5bbfbf;color:#fff;border-color:#5bbfbf;' : 'background:#fff;color:#666;border-color:#ccc;'">
          全部
        </button>
        <button v-for="folder in folders" :key="folder.path" @click="selectFolder(folder.path)"
          class="px-4 py-1.5 rounded-full text-sm font-medium transition-all border"
          :style="selectedFolder === folder.path ? 'background-color:#5bbfbf;color:#fff;border-color:#5bbfbf;' : 'background:#fff;color:#666;border-color:#ccc;'">
          {{ folder.name }}
        </button>
      </div>

      <!-- 載入 -->
      <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div v-for="n in 12" :key="n" class="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
      </div>

      <!-- 無圖片 -->
      <div v-else-if="images.length === 0" class="text-center py-20 text-gray-400">
        <p>此分類尚無照片</p>
      </div>

      <!-- 圖片格 -->
      <div v-else class="rounded-2xl border-2 border-dashed p-4 bg-white" style="border-color: #b8d8d0;">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div v-for="(img, idx) in images" :key="imgKey(img)"
            class="group relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all"
            @click="openLightbox(idx)">
            <img :src="imgUrl(img.thumbUrl || img.url)" :alt="img.displayName || img.originalName"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        </div>
      </div>
    </div>

    <div class="text-center pb-12">
      <NuxtLink to="/site" class="inline-block px-8 py-3 rounded-full text-sm font-medium text-white" style="background-color: #5bbfbf;">
        回聖母健康農莊首頁
      </NuxtLink>
    </div>

    <!-- 燈箱 -->
    <Teleport to="body">
      <Transition name="lightbox-fade">
        <div v-if="lightbox.show" class="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          @click.self="closeLightbox" @keydown.esc="closeLightbox" @keydown.left="lightboxPrev" @keydown.right="lightboxNext"
          tabindex="0" ref="lightboxEl">
          <button @click="closeLightbox" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <button v-if="lightbox.index > 0" @click="lightboxPrev" class="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <Transition name="img-slide" mode="out-in">
            <img :key="lightbox.index" :src="imgUrl(currentLightboxImg?.url)" class="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl" />
          </Transition>
          <button v-if="lightbox.index < images.length - 1" @click="lightboxNext" class="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
          <div class="absolute bottom-5 inset-x-0 text-center text-white/60 text-sm">{{ lightbox.index + 1 }} / {{ images.length }}</div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, nextTick } from 'vue'
import { useCommonStore } from '~/stores/common.js'
definePageMeta({ layout: 'site' })

const commonStore = useCommonStore()
const BASE       = computed(() => commonStore.data.main_url + '/holy/images')
const API_ORIGIN = computed(() => commonStore.data.main_url)

const imgUrl = (path) => {
  if (!path || path.startsWith('http')) return path
  const encoded = path.split('/').map(seg => encodeURIComponent(seg)).join('/')
  return API_ORIGIN.value + encoded
}
const imgKey = (img) => `${img.folder}::${img.fileName}`

const folders = ref([])
const selectedFolder = ref('全部')
const images  = ref([])
const loading = ref(false)

const flattenFolders = (nodes, result = []) => {
  for (const n of nodes) {
    result.push({ name: n.name, path: n.path })
    if (n.children?.length) flattenFolders(n.children, result)
  }
  return result
}

const fetchImages = async (folderPath) => {
  loading.value = true
  try {
    const folder = folderPath === '全部' ? '' : folderPath
    images.value = await (await fetch(`${BASE.value}/list?folder=${encodeURIComponent(folder)}`)).json()
  } catch { images.value = [] }
  finally { loading.value = false }
}

const selectFolder = async (path) => { selectedFolder.value = path; await fetchImages(path) }

const lightbox   = reactive({ show: false, index: 0 })
const lightboxEl = ref(null)
const currentLightboxImg = computed(() => images.value[lightbox.index] ?? null)
const openLightbox = async (idx) => { lightbox.index = idx; lightbox.show = true; await nextTick(); lightboxEl.value?.focus() }
const closeLightbox = () => { lightbox.show = false }
const lightboxPrev  = () => { if (lightbox.index > 0) lightbox.index-- }
const lightboxNext  = () => { if (lightbox.index < images.value.length - 1) lightbox.index++ }

onMounted(async () => {
  try {
    const tree = await (await fetch(`${BASE.value}/folders`)).json()
    folders.value = flattenFolders(tree)
  } catch { folders.value = [] }
  await fetchImages('全部')
})
</script>

<style scoped>
.lightbox-fade-enter-active, .lightbox-fade-leave-active { transition: opacity 0.2s ease; }
.lightbox-fade-enter-from, .lightbox-fade-leave-to { opacity: 0; }
.img-slide-enter-active, .img-slide-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.img-slide-enter-from { opacity: 0; transform: scale(0.97); }
.img-slide-leave-to { opacity: 0; transform: scale(1.02); }
</style>
