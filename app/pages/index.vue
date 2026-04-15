<template>
  <div>
    <!-- ══ Hero 輪播 ══ -->
    <section class="relative h-[85vh] min-h-[480px] overflow-hidden">
      <TransitionGroup name="hero-fade">
        <img v-for="(img, idx) in heroImages" :key="img" v-show="currentSlide === idx"
             :src="img" alt="台東聖母健康農莊" class="absolute inset-0 w-full h-full object-cover" />
      </TransitionGroup>
      <!-- 遮罩 -->
      <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 100%);" />

      <!-- 標語 -->
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <img src="/images/homepage/healthfarm_sun.png" alt="" class="w-16 h-16 mb-4 drop-shadow-lg" />
        <h1 class="text-3xl sm:text-5xl font-bold text-white drop-shadow-lg mb-3" style="text-shadow: 0 2px 8px rgba(0,0,0,0.4);">
          吃出原味．嚐會從<br>
          <span style="color: #ffd700;">土壤到餐桌的愛</span>
        </h1>
        <p class="text-white/90 text-base sm:text-lg max-w-xl leading-relaxed drop-shadow">
          遵從自身不飲食出發品，追求讓農莊成為民眾健康的促進家，除提供安全的飲食外，也積極與部落及有機小農合作。
        </p>
      </div>

      <!-- 輪播點 -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        <button v-for="(_, idx) in heroImages" :key="idx" @click="goToSlide(idx)"
                class="rounded-full transition-all duration-300"
                :class="currentSlide === idx ? 'w-6 h-2.5 bg-white' : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/75'" />
      </div>

      <!-- 波浪底部 -->
      <div class="absolute bottom-0 inset-x-0">
        <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full">
          <path d="M0 40 C240 10 480 0 720 15 C960 30 1200 10 1440 0 L1440 40 Z" fill="#f5f0e8"/>
        </svg>
      </div>
    </section>

    <!-- ══ 四大連結 ══ -->
    <section class="py-12" style="background-color: #f5f0e8;">
      <div class="max-w-5xl mx-auto px-4">
        <div class="text-center mb-8">
          <img src="/images/homepage/healthfarm_hp_four_title.png" alt="聖母農莊樂趣" class="h-10 mx-auto" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NuxtLink v-for="link in fourLinks" :key="link.to" :to="link.to"
                    class="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
            <img :src="link.photo" :alt="link.label" class="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <img :src="link.title" :alt="link.label" class="absolute bottom-3 left-1/2 -translate-x-1/2 h-8 drop-shadow-lg" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ 最新消息 ══ -->
    <section class="py-12" style="background-color: #eef7f5;">
      <div class="max-w-4xl mx-auto px-4">
        <div class="text-center mb-6">
          <img src="/images/homepage/healthfarm_hp_news_title.png" alt="最新消息" class="h-10 mx-auto" />
        </div>
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div v-if="newsLoading" class="p-8 text-center text-gray-400 text-sm">載入中…</div>
          <div v-else-if="latestNews.length === 0" class="p-8 text-center text-gray-400 text-sm">目前無消息</div>
          <div v-else>
            <NuxtLink v-for="item in latestNews" :key="item.id" :to="'/site/news'"
                      class="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-teal-50/50 transition-colors group">
              <span class="text-sm text-gray-400 flex-shrink-0 w-24">{{ item.date }}</span>
              <span class="text-sm text-gray-700 group-hover:text-teal-700 transition-colors truncate">{{ item.title }}</span>
            </NuxtLink>
          </div>
          <div class="p-4 text-center border-t border-gray-50">
            <NuxtLink to="/site/news"
                      class="inline-block px-6 py-2 rounded-full text-sm font-medium text-white transition-colors"
                      style="background-color: #5bbfbf;" onmouseover="this.style.backgroundColor='#3a9a8a'" onmouseout="this.style.backgroundColor='#5bbfbf'">
              更多最新消息
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 推薦農產品 ══ -->
    <section class="py-12" style="background-color: #f5f0e8;">
      <div class="max-w-5xl mx-auto px-4">
        <div class="text-center mb-8">
          <img src="/images/homepage/healthfarm_hp_prod_title.png" alt="推薦農產品" class="h-10 mx-auto" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NuxtLink v-for="prod in products" :key="prod.name" to="/site/product"
                    class="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div class="aspect-square overflow-hidden">
              <img :src="prod.img" :alt="prod.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div class="px-3 py-2.5 flex items-center justify-between">
              <span class="text-sm text-gray-700 font-medium">{{ prod.name }}</span>
              <svg class="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </NuxtLink>
        </div>
        <div class="text-center mt-6">
          <NuxtLink to="/site/product"
                    class="inline-block px-6 py-2 rounded-full text-sm font-medium text-white"
                    style="background-color: #5bbfbf;">
            更多農產品
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ 田園餐廳 ══ -->
    <section class="py-12" style="background-color: #eef7f5;">
      <div class="max-w-5xl mx-auto px-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
          <div>
            <img src="/images/homepage/healthfarm_hp_restaurant_title.png" alt="田園餐廳餐點" class="h-10 mb-4" />
            <p class="text-sm text-gray-600 leading-relaxed mb-4">
              「田園餐廳」以健康飲食為宗旨，嚴選全食材，優先使用農莊自產之有機蔬菜，提供安舒適的用餐環境，並首選「食物衛生優良商店」。
            </p>
            <NuxtLink to="/site/restaurant"
                      class="inline-block px-6 py-2 rounded-full text-sm font-medium text-white"
                      style="background-color: #5bbfbf;">
              更多田園餐廳
            </NuxtLink>
          </div>
          <div class="relative">
            <img src="/images/homepage/healthfarm_hp_restaurant_photo.png" alt="田園餐廳" class="rounded-2xl w-full shadow-md" />
            <img src="/images/homepage/healthfarm_restaurant_bg_wave.png" alt="" class="absolute -bottom-4 -left-4 w-24 opacity-50" />
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 農莊活動集錦 ══ -->
    <section class="py-12" style="background-color: #f5f0e8;">
      <div class="max-w-5xl mx-auto px-4">
        <div class="text-center mb-8">
          <img src="/images/homepage/healthfarm_hp_event_title.png" alt="農莊活動集錦" class="h-10 mx-auto" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="n in 6" :key="n" class="rounded-2xl overflow-hidden aspect-square shadow-sm hover:shadow-md transition-shadow">
            <img :src="`/images/homepage/event/healthfarm_hp_event_photo${n}.png`" :alt="`活動照片${n}`" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        </div>
        <div class="text-center mt-6">
          <NuxtLink to="/site/news"
                    class="inline-block px-6 py-2 rounded-full text-sm font-medium text-white"
                    style="background-color: #5bbfbf;">
            報名活動
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ══ 相關連結 ══ -->
    <section class="py-12" style="background-color: #eef7f5;">
      <div class="max-w-5xl mx-auto px-4">
        <div class="text-center mb-8">
          <img src="/images/homepage/healthfarm_hp_link_title.png" alt="相關連結朋局" class="h-10 mx-auto" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
          <a v-for="link in relatedLinks" :key="link.label" :href="link.url" target="_blank"
             class="flex flex-col items-center gap-2 group">
            <div class="w-20 h-20 rounded-full overflow-hidden border-2 border-teal-200 group-hover:border-teal-500 transition-colors shadow">
              <img :src="link.img" :alt="link.label" class="w-full h-full object-cover" />
            </div>
            <span class="text-xs text-gray-600 text-center group-hover:text-teal-700 transition-colors">{{ link.label }}</span>
          </a>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'

definePageMeta({ layout: 'site' })

const commonStore = useCommonStore()

// ── Hero 輪播 ──────────────────────────────────────────────────────
const heroImages = [
  '/images/homepage/healthfarm_hp_topphoto1.jpg',
  '/images/homepage/healthfarm_hp_topphoto2.jpg',
  '/images/homepage/healthfarm_hp_topphoto3.jpg',
  '/images/homepage/healthfarm_hp_topphoto4.jpg',
]
const currentSlide = ref(0)
let timer = null
const goToSlide = (idx) => { currentSlide.value = idx; resetTimer() }
const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % heroImages.length }
const resetTimer = () => { clearInterval(timer); timer = setInterval(nextSlide, 5000) }
onMounted(() => resetTimer())
onUnmounted(() => clearInterval(timer))

// ── 四大連結 ──────────────────────────────────────────────────────
const fourLinks = [
  { to: '/site/about',      photo: '/images/homepage/healthfarm_hp_four_about_photo.png',      title: '/images/homepage/healthfarm_hp_four_about.png',      label: '關於我們' },
  { to: '/site/product',    photo: '/images/homepage/healthfarm_hp_four_prod_photo.png',        title: '/images/homepage/healthfarm_hp_four_prod.png',        label: '產品訂購' },
  { to: '/site/restaurant', photo: '/images/homepage/healthfarm_hp_four_restaurant_photo.png',  title: '/images/homepage/healthfarm_hp_four_restaurant.png',  label: '田園餐廳' },
  { to: '/site/cafe',       photo: '/images/homepage/healthfarm_hp_four_cafe_photo.png',        title: '/images/homepage/healthfarm_hp_four_cafe.png',        label: '休憩小舖' },
]

// ── 最新消息 ──────────────────────────────────────────────────────
const newsLoading = ref(true)
const latestNews  = ref([])
onMounted(async () => {
  try {
    const all = await (await fetch(`${commonStore.data.main_url}/holy/news/list`)).json()
    latestNews.value = Array.isArray(all) ? all.slice(0, 4) : []
  } catch { latestNews.value = [] }
  finally { newsLoading.value = false }
})

// ── 推薦農產品 ──────────────────────────────────────────────────────
const products = [
  { name: '修女祈福蛋糕', img: '/images/product/1/healthfarm_product1_photo4.jpg' },
  { name: '手工麵包',     img: '/images/homepage/prod/healthfarm_hp_prod_photo1.png' },
  { name: '香藥草',       img: '/images/homepage/prod/healthfarm_hp_prod_photo5.png' },
  { name: '禮盒',         img: '/images/homepage/prod/healthfarm_hp_prod_photo9.png' },
]

// ── 相關連結 ──────────────────────────────────────────────────────
const relatedLinks = [
  { label: '台東聖母醫院暨附設護理之家', url: '#', img: '/images/about/healthfarm_about_partner_photo1.png' },
  { label: '台東市教育處',               url: '#', img: '/images/about/healthfarm_about_partner_photo2.png' },
  { label: '知心麗廉衛生食材',           url: '#', img: '/images/about/healthfarm_about_partner_photo3.png' },
  { label: '志心根緣',                   url: '#', img: '/images/about/healthfarm_about_partner_photo4.png' },
]
</script>

<style scoped>
.hero-fade-enter-active, .hero-fade-leave-active {
  transition: opacity 1.2s ease;
  position: absolute; inset: 0;
}
.hero-fade-enter-from, .hero-fade-leave-to { opacity: 0; }
</style>
