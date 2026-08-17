<template>
  <div class="tour-index-loading">
    <p>載入導覽資料中...</p>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default'
})

// 測試階段先直接導向第一個場景；正式版這頁會改成分區地圖總覽
// （點地圖上的圖釘跳到對應 scene，比照聊過的 tour_zones 規劃）。
onMounted(async () => {
  try {
    const data = await $fetch('/tour/test-data.json')
    if (data.scenes?.length) {
      await navigateTo(`/front/tour/${data.scenes[0].id}`)
    }
  } catch (err) {
    console.error('載入導覽資料失敗', err)
  }
})
</script>

<style scoped>
.tour-index-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #10171a;
  color: #9fb0ac;
  font-size: 14px;
}
</style>
