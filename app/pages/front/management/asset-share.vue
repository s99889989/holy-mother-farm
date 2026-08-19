<script setup>
definePageMeta({ layout: false })

const commonStore = useCommonStore()
const API_BASE = computed(() => commonStore.data.main_url + '/holy/assets')
const route = useRoute()

const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_BASE.value.replace('/holy/assets', '') + path
}
const imgSrcset = (asset) => {
  const small = imgUrl(asset.thumbUrl)
  const large = imgUrl(asset.thumbLgUrl) || imgUrl(asset.image)
  if (small && large && small !== large) return `${small} 400w, ${large} 1200w`
  return ''
}
const imgErrors = reactive(new Set())

// ── 從網址帶入的篩選條件（唯讀，代表分享當下所選的狀態）───────────
const q            = String(route.query.q || '')
const filterOrg    = String(route.query.org || '')
const filterUnit   = String(route.query.unit || '')
const filterLoc    = String(route.query.location || '')
const filterListed = String(route.query.listed || '')

const activeFilters = computed(() => {
  const list = []
  if (filterOrg)    list.push({ label: '機構', value: filterOrg })
  if (filterUnit)   list.push({ label: '單位', value: filterUnit })
  if (filterLoc)    list.push({ label: '位置', value: filterLoc })
  if (filterListed) list.push({ label: '財產狀態', value: filterListed === 'true' ? '列入財產' : '不列入財產' })
  if (q)            list.push({ label: '搜尋', value: q })
  return list
})

// ── 資料 ─────────────────────────────────────────────────────────
const assets  = ref([])
const loading = ref(true)
const loadError = ref('')

const filtered = computed(() => {
  const qq = q.toLowerCase()
  return assets.value.filter((a) => {
    return (!qq || a.name?.toLowerCase().includes(qq) || a.spec?.toLowerCase().includes(qq)
      || a.brand?.toLowerCase().includes(qq) || a.keeper?.toLowerCase().includes(qq) || a.location?.toLowerCase().includes(qq))
    && (!filterOrg    || a.org === filterOrg)
    && (!filterUnit   || a.unit === filterUnit)
    && (!filterLoc    || a.location === filterLoc)
    && (!filterListed || (filterListed === 'true' ? a.listed !== false : a.listed === false))
  })
})

onMounted(async () => {
  try {
    assets.value = await (await fetch(`${API_BASE.value}/list`)).json()
  } catch (e) {
    loadError.value = '資料載入失敗，請確認網路連線後重新整理'
  } finally {
    loading.value = false
  }
})

// ── 大圖預覽 ─────────────────────────────────────────────────────
const preview = reactive({ show: false, url: '', loading: false })
const openPreview = (imagePath) => {
  preview.url = imgUrl(imagePath); preview.loading = true; preview.show = true
}
</script>

<template>
  <div class="min-h-full bg-surface2">
    <!-- ── Header ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          財
        </div>
        <div>
          <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">
            財產清單分享
          </h1>
          <p class="text-xs text-hint-c mt-0.5">
            僅供查看，共 {{ filtered.length }} 筆
          </p>
        </div>
      </div>
      <div
        v-if="activeFilters.length"
        class="flex flex-wrap gap-1.5 mt-2"
      >
        <span
          v-for="f in activeFilters"
          :key="f.label"
          class="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
        >{{ f.label }}：{{ f.value }}</span>
      </div>
    </header>

    <div class="p-4">
      <!-- 載入中 -->
      <div
        v-if="loading"
        class="flex items-center justify-center py-20 text-hint-c gap-2"
      >
        <span class="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block" />載入中…
      </div>

      <!-- 錯誤 -->
      <div
        v-else-if="loadError"
        class="text-center py-20 text-hint-c text-sm"
      >
        {{ loadError }}
      </div>

      <!-- 空結果 -->
      <div
        v-else-if="filtered.length === 0"
        class="text-center py-20 text-hint-c text-sm"
      >
        沒有符合條件的財產項目
      </div>

      <!-- 卡片列表 -->
      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
      >
        <div
          v-for="asset in filtered"
          :key="asset.id"
          class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden"
        >
          <div class="relative w-full aspect-square bg-surface2 overflow-hidden">
            <img
              v-if="asset.image && !imgErrors.has(asset.id)"
              :src="imgUrl(asset.thumbLgUrl) || imgUrl(asset.image)"
              :srcset="imgSrcset(asset)"
              sizes="(max-width: 640px) 45vw, 20vw"
              :alt="asset.name"
              loading="lazy"
              decoding="async"
              class="w-full h-full object-contain cursor-pointer"
              @error="imgErrors.add(asset.id)"
              @click="openPreview(asset.image)"
            >
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-base-c dark:text-muted-c"
            >
              <svg
                class="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div class="p-3">
            <p
              class="font-semibold text-base-c leading-tight mb-1.5 truncate"
              :title="asset.name"
            >
              {{ asset.name }}
            </p>
            <div class="text-xs text-hint-c space-y-0.5">
              <div
                v-if="asset.keeper"
                class="truncate"
              >
                <span class="text-hint-c">保管人：</span>{{ asset.keeper }}
              </div>
              <div
                v-if="asset.unit"
                class="truncate"
              >
                <span class="text-hint-c">單位：</span>{{ asset.unit }}
              </div>
              <div
                v-if="asset.location"
                class="truncate"
              >
                <span class="text-hint-c">位置：</span>{{ asset.location }}
              </div>
              <div
                v-if="asset.quantity"
                class="truncate"
              >
                <span class="text-hint-c">數量：</span>{{ asset.quantity }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 大圖預覽 -->
    <div
      v-if="preview.show"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      @click="preview.show = false"
    >
      <span
        v-if="preview.loading"
        class="absolute w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"
      />
      <img
        :src="preview.url"
        :class="['max-w-full max-h-full rounded-xl shadow-2xl object-contain transition-opacity duration-300', preview.loading ? 'opacity-0' : 'opacity-100']"
        @load="preview.loading = false"
      >
      <button
        class="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"
        @click="preview.show = false"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
