<!-- 共用 Hero 元件：全寬照片 + 右側漢字標題卡 + 麵包屑 -->
<template>
  <div>
    <!-- Hero -->
    <section class="relative h-56 sm:h-72 overflow-hidden">
      <img :src="cover" :alt="title" class="absolute inset-0 w-full h-full object-cover" />
      <!-- 右側標題卡 -->
      <div class="absolute inset-0 flex items-center justify-end pr-10 sm:pr-20">
        <div class="flex items-center justify-center px-6 py-6 shadow-lg"
             style="
               background-color: rgba(255,252,245,0.82);
               writing-mode: vertical-rl;
               letter-spacing: 0.25em;
               min-height: 140px;
               min-width: 80px;
             ">
          <span class="font-bold" style="color: #3a3228; font-size: 2.4rem; line-height: 1.2;">{{ title }}</span>
        </div>
      </div>
      <!-- 波浪底部 -->
      <div class="absolute bottom-0 inset-x-0">
        <svg viewBox="0 0 1440 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full">
          <path d="M0 36 C240 8 480 0 720 12 C960 24 1200 8 1440 0 L1440 36 Z" fill="#f5f0e8"/>
        </svg>
      </div>
    </section>

    <!-- 麵包屑 -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-2 text-xs text-gray-400 flex items-center gap-1">
      <NuxtLink to="/site" class="hover:text-teal-600 transition-colors">首頁</NuxtLink>
      <span>›</span>
      <span class="text-gray-600">{{ title }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cover: { type: String, required: true },
  title: { type: String, required: true },
})
</script>
