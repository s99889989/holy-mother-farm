<script setup>
definePageMeta({ layout: 'blank' })

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/html-page'

const route = useRoute()
const slug  = route.params.slug

const htmlContent = ref('')
const error       = ref(false)

onMounted(async () => {
  try {
    const res = await fetch(`${BASE()}/content/${slug}`)
    if (!res.ok) { error.value = true; return }
    htmlContent.value = await res.text()
  } catch {
    error.value = true
  }
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
