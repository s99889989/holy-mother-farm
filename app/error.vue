<script setup>
const props = defineProps({
  error: Object
})

onMounted(() => {
  if (props.error?.statusCode === 404) {
    window.location.href = '/'
  }
})
</script>

<template>
  <div>
    <template v-if="error?.statusCode === 404">
      <!-- 404 直接跳轉，不顯示內容 -->
    </template>
    <template v-else>
      <h1>{{ error?.statusCode }}</h1>
      <p>{{ error?.message }}</p>
      <NuxtLink to="/">回首頁</NuxtLink>
    </template>
  </div>
</template>
