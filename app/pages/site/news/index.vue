<template>
  <div>
    <SitePageHero cover="/images/news/news-cover.png" title="最新消息" />

    <section class="py-8" style="background-color: #f5f0e8;">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">

        <!-- 年份 Tab -->
        <div v-if="years.length > 1" class="flex gap-2 mb-6">
          <button
            v-for="year in years" :key="year"
            @click="selectedYear = year"
            class="px-5 py-1.5 text-sm font-semibold transition-all border-b-2"
            :style="selectedYear === year
              ? 'color: #e8a020; border-color: #e8a020;'
              : 'color: #aaa; border-color: transparent;'"
          >{{ year }}</button>
        </div>

        <!-- 消息列表 -->
        <div class="rounded-2xl border-2 border-dashed overflow-hidden" style="border-color: #b8d8d0; background-color: #fff;">

          <div v-if="loading">
            <div v-for="n in 4" :key="n"
                 class="flex gap-5 sm:gap-6 p-4 sm:p-6 border-b last:border-0 animate-pulse" style="border-color: #e8e3db;">
              <div class="w-28 sm:w-52 rounded-2xl bg-gray-100 flex-shrink-0" style="min-height: 112px;" />
              <div class="flex-1 space-y-3 py-1">
                <div class="h-3 bg-gray-100 rounded w-1/5" />
                <div class="h-5 bg-gray-100 rounded w-2/3" />
                <div class="h-3 bg-gray-100 rounded w-full" />
                <div class="h-3 bg-gray-100 rounded w-4/5" />
              </div>
            </div>
          </div>

          <div v-else-if="filteredNews.length === 0" class="text-center py-16 text-gray-300">
            <p>{{ selectedYear }} 年尚無消息</p>
          </div>

          <div v-else>
            <NuxtLink
              v-for="item in filteredNews" :key="item.id"
              :to="`/site/news/${item.id}`"
              class="flex gap-5 sm:gap-6 p-4 sm:p-6 border-b last:border-0 cursor-pointer transition-colors hover:bg-teal-50/40 block group"
              style="border-color: #e8e3db;"
            >
              <!-- 封面圖：固定寬度，高度自適應，完整顯示不裁切 -->
              <div class="flex-shrink-0 w-28 sm:w-52 rounded-2xl overflow-hidden bg-gray-50 self-start shadow-sm border border-gray-100">
                <img v-if="item.coverUrl" :src="apiUrl(item.coverUrl)" :alt="item.title"
                     class="w-full h-auto block" />
                <div v-else class="w-full flex items-center justify-center text-gray-200" style="aspect-ratio:1/1;">
                  <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                  </svg>
                </div>
              </div>

              <!-- 文字區 -->
              <div class="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <p class="text-xs text-gray-400 mb-1.5">{{ item.date }}</p>
                  <h2 class="font-bold text-base sm:text-xl leading-snug mb-2 transition-colors"
                      style="color: #333;">
                    {{ item.title }}
                  </h2>
                  <div v-if="item.tags?.length" class="flex flex-wrap gap-1.5 mb-3">
                    <span v-for="tag in item.tags" :key="tag"
                          class="px-2 py-0.5 rounded-full text-xs font-medium"
                          style="background-color: #eef7f5; color: #3a9a8a; border: 1px solid #b8d8d0;">
                      {{ tag }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 line-clamp-3 leading-relaxed hidden sm:block">
                    {{ item.content }}
                  </p>
                </div>
                <div class="flex items-center justify-end mt-3">
                  <span class="text-xs px-4 py-1.5 rounded-full border transition-all group-hover:bg-teal-500 group-hover:text-white group-hover:border-teal-500"
                        style="color:#999; border-color:#ccc;">
                    更 多
                  </span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <div class="mt-10 text-center">
          <NuxtLink to="/site"
                    class="inline-block px-8 py-3 rounded-full text-sm font-medium text-white"
                    style="background-color: #5bbfbf;">
            回聖母健康農莊首頁
          </NuxtLink>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'

definePageMeta({ layout: 'site' })

const commonStore = useCommonStore()
const BASE        = computed(() => commonStore.data.main_url + '/holy/news')
const API_ORIGIN  = computed(() => commonStore.data.main_url)

const apiUrl = (path) => {
  if (!path || path.startsWith('http')) return path
  return API_ORIGIN.value + path
}

const newsList     = ref([])
const loading      = ref(true)
const selectedYear = ref('')

const years = computed(() => {
  const set = new Set()
  newsList.value.forEach(n => {
    if (n.date) set.add(n.date.substring(0, 4))
  })
  return [...set].sort((a, b) => b - a)
})

const filteredNews = computed(() => {
  if (!selectedYear.value) return newsList.value
  return newsList.value.filter(n => n.date?.startsWith(selectedYear.value))
})

onMounted(async () => {
  try {
    newsList.value = await (await fetch(`${BASE.value}/list`)).json()
    if (years.value.length > 0) selectedYear.value = years.value[0]
  } catch {
    newsList.value = []
  } finally {
    loading.value = false
  }
})
</script>
