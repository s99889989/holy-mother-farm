<template>
  <div>
    <SitePageHero cover="/images/event/event-cover.png" title="活動報名" />

    <section class="py-10" style="background-color: #f5f0e8;">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">

        <!-- 標題 -->
        <h2 class="text-center font-bold mb-8" style="color: #5bbfbf; font-size: 1.2em;">聖母農莊樂趣趣</h2>

        <!-- 內容卡 -->
        <div class="rounded-2xl border-2 border-dashed px-6 sm:px-12 py-8" style="border-color: #b8d8d0; background-color: #fff;">

          <!-- 介紹文字 -->
          <p class="text-gray-600 leading-relaxed mb-10 text-sm sm:text-base">
            稟榜以向大自然學習的聖母健康農莊，提供遊園並充滿學習趣味的體驗活動，滿足大家對土地神奇力量的憧憬，同時以新鮮農作採索、手作麵包DIY、香草與生活等多元企劃，與您一同踏查「從土壤到餐桌」的奇妙，並透過田園餐廳提供美味的健康餐，讓大家在即席賞味時，學會真健康、真飲食的觀念。
          </p>

          <!-- 活動項目列表 -->
          <div class="space-y-12">
            <div v-for="(act, idx) in activities" :key="act.label"
              class="flex flex-col items-center gap-4 relative">

              <!-- 裝飾葉片 -->
              <div class="absolute -left-2 sm:-left-8 top-0 opacity-30 hidden sm:block">
                <svg width="40" height="80" viewBox="0 0 40 80" fill="none">
                  <path d="M20 70 Q5 50 10 30 Q15 10 20 5 Q25 10 30 30 Q35 50 20 70Z" fill="#8dc97a"/>
                  <line x1="20" y1="70" x2="20" y2="5" stroke="#6ab85a" stroke-width="1"/>
                </svg>
              </div>
              <div class="absolute -right-2 sm:-right-8 top-8 opacity-30 hidden sm:block">
                <svg width="30" height="60" viewBox="0 0 30 60" fill="none">
                  <path d="M15 55 Q3 38 7 22 Q11 7 15 3 Q19 7 23 22 Q27 38 15 55Z" fill="#8dc97a"/>
                  <line x1="15" y1="55" x2="15" y2="3" stroke="#6ab85a" stroke-width="1"/>
                </svg>
              </div>

              <!-- 圓形照片 -->
              <div class="rounded-full overflow-hidden shadow-md border-4 border-white"
                :class="idx % 2 === 0 ? 'self-center sm:self-start sm:ml-16' : 'self-center sm:self-end sm:mr-16'"
                style="width: 220px; height: 220px; flex-shrink: 0;">
                <img :src="act.img" :alt="act.label"
                  class="w-full h-full object-cover" />
              </div>

              <!-- 標籤 -->
              <div class="inline-block px-4 py-1 text-sm font-medium text-white rounded"
                style="background-color: #e8a020;">
                {{ act.label }}
              </div>
            </div>
          </div>

        </div>

        <!-- 回首頁 -->
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
definePageMeta({ layout: 'site' })

const activities = [
  {
    label: '認識香藥草植物',
    img: '/images/web/site/49b59b5e-5e5c-437d-a322-ef321d93b575 (1).png',
  },
  {
    label: '體驗彈弓彈簧床',
    img: '/images/web/site/87f4886e-753f-4ddb-bd38-5a3eca9782ca (1).png',
  },
  {
    label: '烘培體驗DIY',
    img: '/images/web/site/9a9fc814-b024-4eef-9686-cf697568edc9 (1).png',
  },
  {
    label: '美味農家樂餐',
    img: '/images/web/site/b6136977-a265-48f3-8420-2076352570d1 (1).png',
  },
]
</script>
