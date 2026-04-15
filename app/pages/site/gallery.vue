<template>
  <div class="pt-20">

    <!-- ══ Page Hero ══ -->
    <section class="py-16 sm:py-20 bg-stone-50 text-center">
      <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-3">Gallery</p>
      <h1 class="text-3xl sm:text-4xl font-bold text-stone-800">相片館</h1>
      <p class="text-stone-400 mt-3 text-sm">農莊四季的美好時刻</p>
    </section>

    <!-- ══ 佔位提示（之後串 ImageLibrary API） ══ -->
    <section class="py-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 text-center text-stone-300">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p class="text-stone-400 text-base">相片庫串接中，敬請期待</p>
        <p class="text-stone-300 text-sm mt-2">（將串接後台 ImageLibrary API）</p>
      </div>
    </section>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'site' })
</script>
