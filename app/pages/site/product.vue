<template>
  <div>
    <!-- Cover -->
    <section class="relative">
      <img class="w-full md:hidden" src="/images/product/mobile-product-cover.png" alt="">
      <img class="w-full hidden md:block" src="/images/product/product-cover.png" alt="">
      <img class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 md:w-52"
        src="/images/product/product-title.png" alt="產品訂購">
    </section>

    <div class="max-w-4xl mx-auto px-6 py-4">
      <!-- 麵包屑 -->
      <nav class="text-sm text-gray-500 mb-4">
        <NuxtLink to="/site" class="hover:text-[#5a8a3c] transition-colors">首頁</NuxtLink>
        <span class="mx-1">›</span>
        <span class="text-gray-700">產品訂購</span>
      </nav>

      <div class="text-center mb-4">
        <span class="text-[#5a8a3c] font-bold text-base">產品訂購</span>
      </div>

      <div class="h-1 bg-[#5a8a3c] rounded mb-1"></div>
      <div class="bg-[#e8f0d8] py-6 px-2">
        <div class="bg-[#d4e6b5] rounded-xl py-6 px-4 md:px-8">

          <!-- 說明文字 -->
          <p class="text-gray-700 leading-9 text-sm mb-6">
            親愛的朋友：<br>
            平安！很高興與您分享我們向大自然學習，從泥土、植物、和愛的生活中製作的產品。<br>
            我們的自然農法香藥草及農產品無化肥、無農藥，從種植、採摘、烘乾包裝全程由農夫完成。<br>
            全食物烘焙坊則使用真食材，全粒麥麵粉、在地蔬果、頂級紐西蘭奶油、不使用氫化油脂、酥油、合成香精、防腐劑及添加物。<br><br>
            <a href="https://shopping.st-mary.org.tw/index.php" target="_blank"
              class="text-[#5a8a3c] underline underline-offset-2 hover:text-[#3d6128]">線上訂購</a>
            　傳真訂購：<a href="/file/order.pdf?20240927001" target="_blank"
              class="text-[#5a8a3c] underline underline-offset-2 hover:text-[#3d6128]">商品訂購單下載</a><br>
            來電訂購專線：089–381382分機888　周一至周六 上午8:00至下午5:30
          </p>

          <!-- 產品卡片 Row 1 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <a v-for="p in productsRow1" :key="p.name" :href="p.url" target="_blank"
              class="bg-white rounded-xl overflow-hidden shadow hover:shadow-md transition-shadow group block">
              <div class="overflow-hidden">
                <img :src="p.img" class="w-full object-cover group-hover:scale-105 transition-transform duration-300" :alt="p.name">
              </div>
              <div class="py-3 text-center">
                <p class="text-[#5a8a3c] font-medium text-sm">
                  {{ p.name }}
                  <i class="fas fa-chevron-right text-xs ml-1"></i>
                </p>
              </div>
            </a>
          </div>

          <!-- 產品卡片 Row 2 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a v-for="p in productsRow2" :key="p.name" :href="p.url" target="_blank"
              class="bg-white rounded-xl overflow-hidden shadow hover:shadow-md transition-shadow group block">
              <div class="overflow-hidden">
                <img :src="p.img" class="w-full object-cover group-hover:scale-105 transition-transform duration-300" :alt="p.name">
              </div>
              <div class="py-3 text-center">
                <p class="text-[#5a8a3c] font-medium text-sm">
                  {{ p.name }}
                  <i class="fas fa-chevron-right text-xs ml-1"></i>
                </p>
              </div>
            </a>
          </div>

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
definePageMeta({ layout: 'site' })

const productsRow1 = [
  { name: '修女祈福蛋糕',   url: 'https://shopping.st-mary.org.tw/index.php?dir=1&di=9',              img: '/images/product/1/healthfarm_product1_photo4.jpg' },
  { name: '芳心好美系列精油', url: 'https://shopping.st-mary.org.tw/index.php?dir=1&di=36',             img: '/images/product/other/healthfarm_product_photo08.jpg' },
  { name: '草本足浴包',     url: 'https://shopping.st-mary.org.tw/product_detail.php?i=203&di=34',   img: '/images/product/other/healthfarm_product_photo07.jpg' },
]
const productsRow2 = [
  { name: '手工麵包', url: 'https://shopping.st-mary.org.tw/index.php?dir=1&di=23', img: '/images/product/4/healthfarm_product4_photo1.jpg' },
  { name: '香 藥 草', url: 'https://shopping.st-mary.org.tw/index.php?dir=1&di=19', img: '/images/product/5/healthfarm_product5_photo1.jpg' },
  { name: '禮　　盒', url: 'https://shopping.st-mary.org.tw/index.php?dir=1&di=24', img: '/images/product/other/healthfarm_product_photo06.jpg' },
]
</script>
