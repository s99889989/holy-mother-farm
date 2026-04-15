<template>
  <div>
    <!-- ══ Hero ══ -->
    <section class="relative h-[100svh] min-h-[560px] flex items-end overflow-hidden">
      <!-- 背景圖（用現有 homepage 圖片輪播，之後再加動效） -->
      <img
        src="/images/homepage/healthfarm_hp_topphoto1.jpg"
        alt="聖母健康農莊"
        class="absolute inset-0 w-full h-full object-cover"
      />
      <!-- 漸層遮罩 -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <!-- Hero 文字 -->
      <div class="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <p class="text-green-300 text-sm font-medium tracking-widest uppercase mb-3">台東 · 鹿野</p>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5 drop-shadow-lg">
          親近大地<br>回歸自然
        </h1>
        <p class="text-white/80 text-base sm:text-lg max-w-md mb-8 leading-relaxed">
          在台東縱谷的懷抱中，以有機農耕、健康飲食與自然體驗，陪伴您找回生命的節奏。
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            to="/site/booking"
            class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full transition-colors shadow-lg"
          >
            立即訂位
          </NuxtLink>
          <NuxtLink
            to="/site/about"
            class="px-6 py-3 bg-white/15 hover:bg-white/25 text-white font-medium rounded-full backdrop-blur-sm transition-colors border border-white/30"
          >
            了解更多
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ 四大亮點 ══ -->
    <section class="py-16 sm:py-20 bg-stone-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-2">我們的特色</p>
          <h2 class="text-2xl sm:text-3xl font-bold text-stone-800">在這裡，每一天都是禮物</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow text-center group"
          >
            <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-50 flex items-center justify-center text-2xl group-hover:bg-green-100 transition-colors">
              {{ feature.icon }}
            </div>
            <h3 class="font-bold text-stone-800 mb-2">{{ feature.title }}</h3>
            <p class="text-sm text-stone-500 leading-relaxed">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 餐廳預覽 ══ -->
    <section class="py-16 sm:py-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div class="order-2 lg:order-1">
            <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-3">健康料理</p>
            <h2 class="text-2xl sm:text-3xl font-bold text-stone-800 mb-4 leading-snug">
              來自土地的<br>每一口滋味
            </h2>
            <p class="text-stone-500 leading-relaxed mb-6">
              使用農莊自產與在地食材，每日新鮮烹調，葷素皆備。
              提供套餐與便當，歡迎提前預訂。
            </p>
            <NuxtLink
              to="/site/restaurant"
              class="inline-flex items-center gap-2 text-green-700 font-semibold hover:text-green-800 transition-colors"
            >
              查看菜單
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </NuxtLink>
          </div>
          <div class="order-1 lg:order-2 grid grid-cols-2 gap-3">
            <img src="/images/restaurant/restaurant-introduce-photo1.jpg" alt="餐廳" class="rounded-2xl w-full h-48 object-cover" />
            <img src="/images/restaurant/restaurant-introduce-photo2.jpg" alt="餐廳" class="rounded-2xl w-full h-48 object-cover mt-6" />
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 訂位 CTA ══ -->
    <section class="py-16 sm:py-20 bg-green-800 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10 bg-[url('/images/global/bg-body.jpg')] bg-cover" />
      <div class="relative max-w-2xl mx-auto px-4 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold text-white mb-4">準備好來訪了嗎？</h2>
        <p class="text-green-200 mb-8 text-base leading-relaxed">
          歡迎個人、家庭或團體訂位，我們期待與您一同感受大自然的恩典。
        </p>
        <NuxtLink
          to="/site/booking"
          class="inline-block px-8 py-4 bg-white text-green-800 font-bold rounded-full hover:bg-green-50 transition-colors shadow-lg text-base"
        >
          線上訂位
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'site' })

const features = [
  { icon: '🌱', title: '有機農耕', desc: '自然農法栽培，無農藥、無化肥，回歸土地本質。' },
  { icon: '🍽️', title: '健康料理', desc: '在地食材現煮，每日新鮮，滋味純粹。' },
  { icon: '🏡', title: '舒適住宿', desc: '靜謐的自然環境，讓身心在此歇息充電。' },
  { icon: '🌿', title: '自然體驗', desc: '農事體驗、草藥課程，走進土地的脈動。' },
]
</script>
