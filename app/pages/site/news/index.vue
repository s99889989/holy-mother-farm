<template>
  <div>
    <!-- Cover -->
    <section class="relative">
      <img class="w-full md:hidden" src="/images/news/mb-news-cover.png" alt="">
      <img class="w-full hidden md:block" src="/images/news/news-cover.png" alt="">
      <img class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 md:w-52"
           src="/images/news/news-title.png" alt="最新消息">
    </section>

    <div class="max-w-4xl mx-auto px-6 py-4">
      <!-- 麵包屑 -->
      <nav class="text-sm text-gray-500 mb-4">
        <NuxtLink to="/site" class="hover:text-[#5a8a3c] transition-colors">首頁</NuxtLink>
        <span class="mx-1">›</span>
        <span class="text-gray-700">最新消息</span>
      </nav>

      <!-- 年份切換 -->
      <div class="flex justify-center gap-3 mb-4 flex-wrap">
        <NuxtLink
          v-for="y in data?.years" :key="y"
          :to="y === data?.years[0] ? '/site/news' : `/site/news?year=${y}`"
          class="px-5 py-1 rounded-full border text-sm font-medium transition-colors"
          :class="currentYear === y
            ? 'bg-[#5a8a3c] text-white border-[#5a8a3c]'
            : 'border-[#5a8a3c] text-[#5a8a3c] hover:bg-[#5a8a3c] hover:text-white'">
          {{ y }}
        </NuxtLink>
      </div>

      <div class="h-1 bg-[#5a8a3c] rounded mb-1"></div>
      <div class="bg-[#e8f0d8] py-6 px-2">
        <div class="bg-[#d4e6b5] rounded-xl py-4 px-4 md:px-8">
          <NewsItem v-for="item in data?.news" :key="item.id" :record="item" />
          <p v-if="!data?.news?.length" class="text-center text-gray-500 py-6">目前無消息</p>
        </div>
      </div>
      <div class="h-1 bg-[#5a8a3c] rounded mt-1"></div>

      <div class="text-center my-8">
        <NuxtLink to="/site"
                  class="inline-block border border-[#5a8a3c] text-[#5a8a3c] py-2 px-10 rounded-full hover:bg-[#5a8a3c] hover:text-white transition-colors text-sm">
          回聖母健康農莊首頁
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import '~/assets/css/main.css'
definePageMeta({ layout: 'site' })

const route = useRoute()
const yearQuery = computed(() => route.query.year ? Number(route.query.year) : undefined)

const { data, refresh } = await useFetch('/api/site/news', {
  query: computed(() => yearQuery.value ? { year: yearQuery.value } : {})
})

const currentYear = computed(() => yearQuery.value ?? data.value?.years?.[0])

watch(yearQuery, () => refresh())
</script>
