<template>
  <div>
    <SitePageHero cover="/images/product/product-cover.png" title="產品訂購" />

    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="text-center mb-4">
        <h2 class="text-lg font-bold" style="color: #5bbfbf;">產品訂購</h2>
      </div>
      <div class="rounded-2xl border-2 border-dashed p-6 sm:p-8 bg-white" style="border-color: #b8d8d0;">

        <p class="text-sm text-gray-600 leading-relaxed mb-2">親愛的朋友：</p>
        <p class="text-sm text-gray-600 leading-relaxed mb-4">
          平安！很高興與您分享我們向大自然學習，從泥土、植物、和愛的生活中製作的產品。<br>
          我們的自然農法香藥草及農產品無化肥、無農藥，從種植、採摘、烘乾包裝全程由農夫完成。<br>
          全食物烘焙坊則使用真食材，全粒粟麵粉、在地蔬果、頂級紐西蘭奶油、不使用氫化油脂、酥油、合成香精、防腐劑及添加物。
        </p>

        <div class="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <span class="text-sm text-gray-600">線上訂購</span>
          <span class="text-sm text-gray-400">傳真訂購：</span>
          <a href="#" class="text-sm text-teal-600 hover:underline">商品訂購單下載</a>
          <span class="text-sm text-gray-400 ml-auto">來電訂購專線：089-381382分機888 週一至週六 上午8:00至下午5:30</span>
        </div>

        <!-- 產品格 -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NuxtLink v-for="prod in products" :key="prod.name" to="#"
            class="group rounded-2xl overflow-hidden border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all">
            <div class="aspect-square overflow-hidden bg-gray-50">
              <img :src="prod.img" :alt="prod.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div class="px-3 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-700">{{ prod.name }}</span>
              <svg class="w-4 h-4 flex-shrink-0" style="color: #5bbfbf;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </NuxtLink>
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
definePageMeta({ layout: 'site' })

const products = [
  { name: '修女祈福蛋糕', img: '/images/product/1/healthfarm_product1_photo4.jpg' },
  { name: '芳心好美系列精油', img: '/images/homepage/prod/healthfarm_hp_prod_photo2.png' },
  { name: '草本足浴包', img: '/images/homepage/prod/healthfarm_hp_prod_photo3.png' },
  { name: '手工麵包', img: '/images/homepage/prod/healthfarm_hp_prod_photo4.png' },
  { name: '香藥草', img: '/images/homepage/prod/healthfarm_hp_prod_photo5.png' },
  { name: '禮盒', img: '/images/homepage/prod/healthfarm_hp_prod_photo9.png' },
]
</script>
