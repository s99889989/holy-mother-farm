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
              class="flex gap-4 p-5 border-b last:border-0 animate-pulse" style="border-color: #f0ebe3;">
              <div class="w-36 sm:w-44 rounded-xl bg-gray-100 flex-shrink-0" style="aspect-ratio:4/3;" />
              <div class="flex-1 space-y-2 py-1">
                <div class="h-3 bg-gray-100 rounded w-1/4" />
                <div class="h-4 bg-gray-100 rounded w-3/4" />
                <div class="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          </div>

          <div v-else-if="filteredNews.length === 0" class="text-center py-16 text-gray-300">
            <p>{{ selectedYear }} 年尚無消息</p>
          </div>

          <div v-else>
            <div v-for="item in filteredNews" :key="item.id"
              class="border-b last:border-0" style="border-color: #f0ebe3;">

              <div class="flex gap-4 sm:gap-5 p-4 sm:p-5 cursor-pointer transition-colors hover:bg-teal-50/40"
                @click="toggle(item.id)">

                <div class="flex-shrink-0 w-32 sm:w-44 rounded-xl overflow-hidden bg-gray-100 self-start">
                  <img v-if="item.coverUrl" :src="apiUrl(item.coverUrl)" :alt="item.title"
                    class="w-full object-cover" style="aspect-ratio:4/3;" />
                  <div v-else class="w-full flex items-center justify-center text-gray-200" style="aspect-ratio:4/3;">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                    </svg>
                  </div>
                </div>

                <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <p class="text-xs text-gray-400 mb-1.5">{{ item.date }}</p>
                    <h2 class="font-bold text-base sm:text-lg leading-snug mb-2 transition-colors"
                      :style="expandedId === item.id ? 'color: #5bbfbf;' : 'color: #333;'">
                      {{ item.title }}
                    </h2>
                    <div v-if="item.tags?.length" class="flex flex-wrap gap-1.5 mb-2">
                      <span v-for="tag in item.tags" :key="tag"
                        class="px-2 py-0.5 rounded-full text-xs font-medium"
                        style="background-color: #eef7f5; color: #3a9a8a; border: 1px solid #b8d8d0;">
                        {{ tag }}
                      </span>
                    </div>
                    <p v-if="expandedId !== item.id"
                      class="text-sm text-gray-400 line-clamp-2 leading-relaxed hidden sm:block">
                      {{ item.content }}
                    </p>
                  </div>
                  <div class="flex items-center justify-end mt-2">
                    <span class="text-xs px-3 py-1 rounded-full border transition-all"
                      :style="expandedId === item.id
                        ? 'background-color:#5bbfbf; color:#fff; border-color:#5bbfbf;'
                        : 'color:#999; border-color:#ccc;'">
                      {{ expandedId === item.id ? '收起' : '更多' }}
                    </span>
                  </div>
                </div>
              </div>

              <Transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-[2000px]"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 max-h-[2000px]"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="expandedId === item.id" class="overflow-hidden border-t" style="background-color: #faf8f4; border-color: #f0ebe3;">
                  <div class="px-4 sm:px-5 py-5">
                    <img v-if="item.coverUrl" :src="apiUrl(item.coverUrl)" :alt="item.title"
                      class="w-full sm:max-w-sm rounded-xl mb-5 shadow-sm mx-auto block" />
                    <div class="text-sm text-gray-600 leading-relaxed whitespace-pre-line max-w-2xl">
                      {{ item.content }}
                    </div>
                    <div v-if="item.attachments?.length" class="mt-5 space-y-2">
                      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">附件下載</p>
                      <a v-for="att in item.attachments" :key="att.url"
                        :href="apiUrl(att.url)" target="_blank"
                        class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm border"
                        style="background-color:#fff; border-color:#e8e3db; color:#555;">
                        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                        </svg>
                        {{ att.name }}
                      </a>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
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
const expandedId   = ref(null)
const selectedYear = ref('')

const years = computed(() => {
  const set = new Set()
  newsList.value.forEach(n => { if (n.date) set.add(n.date.substring(0, 4)) })
  return [...set].sort((a, b) => b - a)
})

const filteredNews = computed(() => {
  if (!selectedYear.value) return newsList.value
  return newsList.value.filter(n => n.date?.startsWith(selectedYear.value))
})

const toggle = (id) => { expandedId.value = expandedId.value === id ? null : id }

onMounted(async () => {
  try {
    newsList.value = await (await fetch(`${BASE.value}/list`)).json()
    if (years.value.length > 0) selectedYear.value = years.value[0]
  } catch { newsList.value = [] }
  finally { loading.value = false }
})
</script>
