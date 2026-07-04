<script setup>
definePageMeta({layout: 'blank'})

const config = useRuntimeConfig()
const BASE = config.public.apiBase + '/holy/html-page'

const route = useRoute()
const slug = route.params.slug

const {data: htmlContent, error} = await useAsyncData(
  `html-page-${slug}`,
  () => $fetch(`${BASE}/content/${slug}`, {responseType: 'text'})
)

const {data: metaList} = await useAsyncData(
  'html-page-meta',
  () => $fetch(`${BASE}/list`)
)

const pageTitle = computed(() => {
  const found = metaList.value?.find(p => p.slug === slug)
  return found?.title ?? '聖母健康農莊'
})

// 絕對路徑：OG 爬蟲抓圖片時比較不會有相對路徑解析錯誤的問題
// 沒有自訂圖片時，後端會依標題自動產生一張
const ogImageUrl = `${BASE}/og-image/${slug}`

useHead({
  title: () => pageTitle.value,
  meta: [
    {property: 'og:title', content: () => pageTitle.value},
    {property: 'og:description', content: '聖母健康農莊活動資訊'},
    {property: 'og:type', content: 'website'},
    {property: 'og:image', content: ogImageUrl},
    {property: 'og:image:width', content: '1200'},
    {property: 'og:image:height', content: '630'},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: () => pageTitle.value},
    {name: 'twitter:image', content: ogImageUrl},
  ],
})
</script>

<template>
  <div v-if="error || !htmlContent"
       class="flex flex-col items-center justify-center min-h-screen bg-surface gap-3">
    <p class="text-4xl">😕</p>
    <p class="text-hint-c" style="font-size:15px">找不到此頁面</p>
    <a href="/" class="text-green-700 hover:underline" style="font-size:13px">回首頁</a>
  </div>

  <iframe
    v-else
    :srcdoc="htmlContent"
    class="w-full border-0"
    style="height: 100vh; display: block;"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    title="HTML 頁面"
  ></iframe>
</template>
