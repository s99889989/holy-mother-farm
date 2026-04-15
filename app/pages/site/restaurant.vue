<template>
  <div class="pt-20">

    <!-- ══ Page Hero ══ -->
    <section class="relative h-56 sm:h-72 overflow-hidden flex items-end">
      <img src="/images/restaurant/restaurant-cover.png" alt="健康料理" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 pb-10 w-full">
        <p class="text-green-300 text-xs font-semibold tracking-widest uppercase mb-1">Restaurant</p>
        <h1 class="text-3xl sm:text-4xl font-bold text-white">健康料理</h1>
      </div>
    </section>

    <!-- ══ 介紹 ══ -->
    <section class="py-16 sm:py-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-3">用心料理</p>
            <h2 class="text-2xl sm:text-3xl font-bold text-stone-800 mb-5">從田園到餐桌</h2>
            <p class="text-stone-500 leading-relaxed mb-4">
              農莊料理以自產有機蔬菜為主，搭配在地食材，每日新鮮烹調。
              提供葷素套餐，歡迎提前訂位與預約便當。
            </p>
            <div class="flex flex-wrap gap-3 mt-6">
              <span class="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">有機蔬菜</span>
              <span class="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">在地食材</span>
              <span class="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">葷素皆備</span>
              <span class="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">預約制</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <img src="/images/restaurant/restaurant-introduce-photo1.jpg" alt="料理" class="rounded-2xl w-full h-44 object-cover" />
            <img src="/images/restaurant/restaurant-introduce-photo2.jpg" alt="料理" class="rounded-2xl w-full h-44 object-cover mt-5" />
            <img src="/images/restaurant/restaurant-introduce-photo3.jpg" alt="料理" class="rounded-2xl w-full h-44 object-cover" />
            <img src="/images/restaurant/restaurant-introduce-photo4.jpg" alt="料理" class="rounded-2xl w-full h-44 object-cover mt-5" />
          </div>
        </div>

        <!-- ══ 菜單圖片 ══ -->
        <div class="text-center mb-10">
          <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-2">本月菜色</p>
          <h2 class="text-2xl font-bold text-stone-800">精選料理</h2>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            v-for="n in 4"
            :key="n"
            class="group relative rounded-2xl overflow-hidden aspect-square"
          >
            <img
              :src="`/images/restaurant/restaurant-menu-photo${n}_n.jpg`"
              :alt="`菜色 ${n}`"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div class="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 用餐資訊 ══ -->
    <section class="py-16 bg-stone-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-10">
          <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-2">用餐須知</p>
          <h2 class="text-2xl font-bold text-stone-800">訂餐資訊</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div
            v-for="info in diningInfo"
            :key="info.title"
            class="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl flex-shrink-0">
                {{ info.icon }}
              </div>
              <div>
                <h3 class="font-bold text-stone-800 mb-1">{{ info.title }}</h3>
                <p class="text-sm text-stone-500 leading-relaxed">{{ info.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-10 text-center">
          <NuxtLink
            to="/site/booking"
            class="inline-block px-8 py-4 bg-green-700 hover:bg-green-800 text-white font-bold rounded-full transition-colors shadow-md"
          >
            預約訂位
          </NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'site' })

const diningInfo = [
  { icon: '🕐', title: '用餐時間', desc: '午餐 11:30 – 13:30 / 晚餐 17:30 – 19:30（需提前預約）' },
  { icon: '📋', title: '預約方式', desc: '請提前一日電話或線上訂位，以便備料。' },
  { icon: '🥗', title: '葷素選擇', desc: '提供葷食套餐與全素套餐，請於訂位時告知。' },
  { icon: '🍱', title: '便當預訂', desc: '提供便當外帶，需前一日下午三點前預訂。' },
]
</script>
