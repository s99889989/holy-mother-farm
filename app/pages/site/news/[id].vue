<template>
  <div>
    <SitePageHero cover="/images/news/news-cover.png" title="最新消息" />

    <!-- 麵包屑（覆蓋 SitePageHero 預設，補上文章標題） -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-2 text-xs text-gray-400 flex items-center gap-1">
      <NuxtLink to="/site" class="hover:text-teal-600 transition-colors">首頁</NuxtLink>
      <span>›</span>
      <NuxtLink to="/site/news" class="hover:text-teal-600 transition-colors">最新消息</NuxtLink>
      <span>›</span>
      <span class="text-gray-600 truncate max-w-xs">{{ news?.title || '文章內容' }}</span>
    </div>

    <section class="py-6" style="background-color: #f5f0e8;">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">

        <!-- 載入中 -->
        <div v-if="loading" class="rounded-2xl border-2 border-dashed p-8 bg-white text-center" style="border-color: #b8d8d0;">
          <div class="inline-block w-8 h-8 border-4 border-teal-300 border-t-teal-600 rounded-full animate-spin mb-3"></div>
          <p class="text-sm text-gray-400">載入中…</p>
        </div>

        <!-- 找不到 -->
        <div v-else-if="!news" class="rounded-2xl border-2 border-dashed p-12 bg-white text-center" style="border-color: #b8d8d0;">
          <p class="text-gray-400 text-sm mb-4">找不到此消息</p>
          <NuxtLink to="/site/news" class="text-sm px-6 py-2 rounded-full text-white" style="background-color: #5bbfbf;">
            回消息列表
          </NuxtLink>
        </div>

        <!-- 文章內容 -->
        <div v-else class="rounded-2xl border-2 border-dashed bg-white overflow-hidden" style="border-color: #b8d8d0;">

          <!-- 封面圖 -->
          <div v-if="news.coverUrl" class="w-full">
            <img :src="apiUrl(news.coverUrl)" :alt="news.title"
              class="w-full object-cover" style="max-height: 380px;" />
          </div>

          <div class="p-6 sm:p-8">
            <!-- 標題區 -->
            <div class="mb-6 pb-6 border-b" style="border-color: #f0ebe3;">
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="text-xs text-gray-400">{{ news.date }}</span>
                <span v-for="tag in news.tags" :key="tag"
                  class="px-2 py-0.5 rounded-full text-xs font-medium"
                  style="background-color: #eef7f5; color: #3a9a8a; border: 1px solid #b8d8d0;">
                  {{ tag }}
                </span>
              </div>
              <h1 class="text-xl sm:text-2xl font-bold leading-snug" style="color: #333;">
                {{ news.title }}
              </h1>
            </div>

            <!-- 正文 -->
            <div class="text-sm text-gray-600 leading-relaxed whitespace-pre-line max-w-2xl">
              {{ news.content }}
            </div>

            <!-- 附件 -->
            <div v-if="news.attachments?.length" class="mt-8 pt-6 border-t" style="border-color: #f0ebe3;">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">附件下載</p>
              <div class="space-y-2">
                <a v-for="att in news.attachments" :key="att.url"
                  :href="apiUrl(att.url)" target="_blank"
                  class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm border transition-colors hover:bg-teal-50"
                  style="background-color:#fff; border-color:#e8e3db; color:#555;">
                  <svg class="w-4 h-4 flex-shrink-0 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                  </svg>
                  {{ att.name }}
                </a>
              </div>
            </div>

            <!-- 上/下一篇導覽 -->
            <div v-if="prevItem || nextItem" class="mt-8 pt-6 border-t flex gap-3" style="border-color: #f0ebe3;">
              <NuxtLink v-if="prevItem" :to="`/site/news/${prevItem.id}`"
                class="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm transition-colors hover:bg-teal-50 group"
                style="border-color: #e8e3db;">
                <svg class="w-4 h-4 text-gray-400 group-hover:text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                <div class="min-w-0">
                  <p class="text-xs text-gray-400 mb-0.5">上一篇</p>
                  <p class="text-gray-700 truncate">{{ prevItem.title }}</p>
                </div>
              </NuxtLink>
              <NuxtLink v-if="nextItem" :to="`/site/news/${nextItem.id}`"
                class="flex-1 flex items-center justify-end gap-2 px-4 py-3 rounded-xl border text-sm transition-colors hover:bg-teal-50 group text-right"
                style="border-color: #e8e3db;">
                <div class="min-w-0">
                  <p class="text-xs text-gray-400 mb-0.5">下一篇</p>
                  <p class="text-gray-700 truncate">{{ nextItem.title }}</p>
                </div>
                <svg class="w-4 h-4 text-gray-400 group-hover:text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- 底部按鈕 -->
        <div class="mt-8 flex items-center justify-center gap-4">
          <NuxtLink to="/site/news"
            class="inline-block px-6 py-2.5 rounded-full text-sm font-medium border transition-colors"
            style="border-color: #5bbfbf; color: #5bbfbf;">
            ← 回消息列表
          </NuxtLink>
          <NuxtLink to="/site"
            class="inline-block px-6 py-2.5 rounded-full text-sm font-medium text-white"
            style="background-color: #5bbfbf;">
            回農莊首頁
          </NuxtLink>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCommonStore } from '~/stores/common.js'
import '~/assets/css/main.css'
definePageMeta({ layout: 'site' })

const route       = useRoute()
const commonStore = useCommonStore()
const BASE        = computed(() => commonStore.data.main_url + '/holy/news')
const API_ORIGIN  = computed(() => commonStore.data.main_url)

const apiUrl = (path) => {
  if (!path || path.startsWith('http')) return path
  return API_ORIGIN.value + path
}

const newsList = ref([])
const loading  = ref(true)
const id       = computed(() => route.params.id)

const news = computed(() => newsList.value.find(n => String(n.id) === String(id.value)) ?? null)

// 找出前後篇（依列表順序）
const currentIndex = computed(() => newsList.value.findIndex(n => String(n.id) === String(id.value)))
const prevItem     = computed(() => currentIndex.value > 0 ? newsList.value[currentIndex.value - 1] : null)
const nextItem     = computed(() => currentIndex.value < newsList.value.length - 1 ? newsList.value[currentIndex.value + 1] : null)

onMounted(async () => {
  try {
    newsList.value = await (await fetch(`${BASE.value}/list`)).json()
  } catch { newsList.value = [] }
  finally { loading.value = false }
})
</script>
