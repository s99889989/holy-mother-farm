<template>
  <div>
    <SitePageHero cover="/images/access/access-cover.png" title="交通方式" />

    <!-- Tab -->
    <div class="max-w-4xl mx-auto px-4 mt-4">
      <div class="flex gap-6 border-b-2" style="border-color: #e0d8cc;">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          class="pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-0.5"
          :style="activeTab === tab.key ? 'color: #5bbfbf; border-color: #5bbfbf;' : 'color: #888; border-color: transparent;'">
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="rounded-2xl border-2 border-dashed p-6 sm:p-8 bg-white" style="border-color: #b8d8d0;">

        <!-- 地址卡（所有 Tab 都顯示） -->
        <div class="flex flex-col sm:flex-row gap-4 mb-8 bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <img src="/images/access/photo.jpg" alt="聖母健康農莊" class="w-full sm:w-48 rounded-xl object-cover aspect-video sm:aspect-auto" />
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 mt-1 flex-shrink-0" style="color: #e8a020;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <div>
              <p class="font-bold text-gray-800 mb-1">聖母健康農莊</p>
              <p class="text-sm text-gray-600">950 台東縣台東市博物館路110號</p>
              <p class="text-sm text-gray-600">營業時間：08:00–17:30（週一—週六）</p>
              <p class="text-sm text-gray-600">服務電話：089-381382</p>
            </div>
          </div>
        </div>

        <!-- 開車 -->
        <div v-if="activeTab === 'drive'">
          <h2 class="text-base font-bold mb-4 flex items-center gap-2" style="color: #5bbfbf;">
            <span class="w-3 h-3 rounded-full inline-block" style="background: #5bbfbf;"></span>開車
          </h2>
          <div v-for="route in driveRoutes" :key="route.name" class="mb-5">
            <div class="inline-block px-3 py-1 rounded text-xs font-medium text-white mb-2" style="background-color: #5bbfbf;">
              {{ route.tag }}
            </div>
            <p class="text-xs text-gray-400 mb-1">{{ route.name }}</p>
            <p class="text-sm text-gray-600 leading-relaxed">{{ route.desc }}</p>
          </div>
        </div>

        <!-- 火車 -->
        <div v-if="activeTab === 'train'">
          <h2 class="text-base font-bold mb-4 flex items-center gap-2" style="color: #5bbfbf;">
            <span class="w-3 h-3 rounded-full inline-block" style="background: #5bbfbf;"></span>火車
          </h2>
          <div class="space-y-4">
            <div>
              <div class="inline-block px-3 py-1 rounded text-xs font-medium text-white mb-2" style="background-color: #5bbfbf;">台東火車站</div>
              <p class="text-sm text-gray-600">
                <span class="inline-block w-2 h-2 rounded-sm mr-2" style="background: #5bbfbf;"></span>
                預計車程：車程約20分鐘，車資約250元。
              </p>
            </div>
            <div>
              <div class="inline-block px-3 py-1 rounded text-xs font-medium text-white mb-2" style="background-color: #5bbfbf;">康樂火車站</div>
              <p class="text-sm text-gray-600">
                <span class="inline-block w-2 h-2 rounded-sm mr-2" style="background: #5bbfbf;"></span>
                步行：10分鐘內可抵達。
              </p>
            </div>
          </div>
        </div>

        <!-- 飛機 -->
        <div v-if="activeTab === 'fly'">
          <h2 class="text-base font-bold mb-4 flex items-center gap-2" style="color: #5bbfbf;">
            <span class="w-3 h-3 rounded-full inline-block" style="background: #5bbfbf;"></span>飛機
          </h2>
          <div>
            <div class="inline-block px-3 py-1 rounded text-xs font-medium text-white mb-2" style="background-color: #5bbfbf;">台東機場</div>
            <p class="text-sm text-gray-600">
              <span class="inline-block w-2 h-2 rounded-sm mr-2" style="background: #5bbfbf;"></span>
              預計車程：車程約20分鐘，車資約250元。
            </p>
          </div>
        </div>

        <!-- Google Map -->
        <div v-if="activeTab === 'map'">
          <h2 class="text-base font-bold mb-4 flex items-center gap-2" style="color: #5bbfbf;">
            <span class="w-3 h-3 rounded-full inline-block" style="background: #5bbfbf;"></span>Google Map
          </h2>
          <div class="rounded-2xl overflow-hidden border border-gray-200 h-72 sm:h-96">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3679.1123161180503!2d121.09173577534693!3d22.761212726031047!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x346fb7fdd7894785%3A0x3fe49cdb9bca43c1!2z5Y-w5p2x6IGW5q-N5YGl5bq36L6y6I6K!5e0!3m2!1szh-TW!2stw!4v1776229473561!5m2!1szh-TW!2stw"
              class="w-full h-full" style="border:0" allowfullscreen loading="lazy"
              referrerpolicy="no-referrer-when-downgrade" title="聖母健康農莊地圖" />
          </div>
        </div>

      </div>
    </div>

    <div class="text-center pb-12">
      <NuxtLink to="/site" class="inline-block px-8 py-3 rounded-full text-sm font-medium text-white" style="background-color: #5bbfbf;">
        回聖母健康農莊首頁
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
definePageMeta({ layout: 'site' })

const activeTab = ref('drive')
const tabs = [
  { key: 'drive', label: '開車' },
  { key: 'train', label: '火車' },
  { key: 'fly',   label: '飛機' },
  { key: 'map',   label: 'Google' },
]

const driveRoutes = [
  {
    tag: '山線', name: '台9線・自花蓮南下',
    desc: '沿花東縱谷台9線 ⇒ 經過阿美釋迦後，右轉進入和平路 ⇒ 朝太平前進，左轉進入太平路 ⇒ 遇中興路四段後右轉 ⇒ 進博物館路後右轉 ⇒ 朝史前博物館前進，靠左行駛即可達位在左邊的目的地。'
  },
  {
    tag: '海線', name: '台11線・自花蓮南下',
    desc: '沿台11線（花東海岸公路）⇒ 往台東市區方向前進 ⇒ 過富罔，進入台東大橋後 ⇒ 繼續沿著運建航路前進 ⇒ 朝台東火車站前進，右轉中興路二段 ⇒ 朝史前博物館前進，靠左行駛 ⇒ 左轉進入博物館路，目的地即在左邊。'
  },
  {
    tag: '海線', name: '台9線・自屏東北上',
    desc: '沿台9線東南繞公路 ⇒ 沿著環境道朝台東前進，左轉進入花東縱谷台9線 ⇒ 朝卑南前進，右轉進入中興路五段269巷，左轉進入博物館路 ⇒ 目的地即抵達於右邊。'
  },
]
</script>
