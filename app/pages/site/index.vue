<template>
  <div class="site-page">

    <!-- ══ Cover ══ -->
    <div class="por">
      <!-- 手機版 -->
      <div class="homepage-cover d-lg-none">
        <img v-for="(src, i) in mobileCovers" :key="i" :src="src"
             class="cover-slider" :class="{ active: coverIndex === i }" alt="">
      </div>
      <!-- 桌機版 -->
      <div class="homepage-cover d-none d-lg-block">
        <img v-for="(src, i) in desktopCovers" :key="i" :src="src"
             class="cover-slider desktop-cover-mask" :class="{ active: coverIndex === i }" alt="">
      </div>
      <img src="/images/homepage/healthfarm_hp_ill_sun.png" class="sun" alt="">
    </div>

    <!-- ══ 簡介 ══ -->
    <div class="container mb-5 pb-3">
      <div class="row justify-content-center por mb-0 mb-md-5">
        <img src="/images/homepage/healthfarm_hp_ill_cloud1.png" class="hp-cloud1" alt="">
        <img src="/images/homepage/healthfarm_hp_ill_cloud2.png" class="hp-cloud2" alt="">
        <img src="/images/homepage/healthfarm_hp_ill_cloud3.png" class="hp-cloud3" alt="">
        <div class="text-center py-3 mt-5">
          <img src="/images/homepage/healthfarm_hp_four_title.png" class="intro-title mt-4 mt-md-0" alt="">
        </div>
        <div class="col-12">
          <p class="text-center intro-text">
            健康由安全飲食出發，我們希望能成為民眾健康的促進者，除提供安全的飲食外，<br class="d-none d-md-block">
            也積極與部落及小農合作，輔導提供安全或有機的食材，<br>
            期盼能帶動部落朝向安全有機發展，進而改善促進部落與小農經濟。
          </p>
        </div>
      </div>
    </div>

    <!-- ══ 四大特色 ══ -->
    <div class="bg-greenweb por pt-3 py-md-5">
      <div class="container">
        <!-- 手機版 -->
        <div class="row d-md-none px-4">
          <NuxtLink v-for="f in features" :key="f.to" :to="f.to" class="col-6">
            <img :src="f.mobImg" class="img-fluid mob-four" :alt="f.label">
          </NuxtLink>
        </div>
        <!-- 桌機版 -->
        <div class="row por pb-3">
          <div v-for="(f, i) in features" :key="f.to" class="col-3 por d-none d-md-inline-block">
            <NuxtLink :to="f.to">
              <img :src="f.titleImg" :class="i % 2 === 0 ? 'cycle-title-top' : 'cycle-title-bottom'" :alt="f.label">
              <img src="/images/homepage/healthfarm_hp_four_grassring.png"
                   :class="i % 2 === 0 ? 'cycle-grass-top' : 'cycle-grass-bottom'" alt="">
              <div :class="i % 2 === 0 ? 'cycle-top-mask' : 'cycle-bottom-mask'">
                <img :src="f.photoImg" :class="i % 2 === 0 ? 'cycle-top' : 'cycle-bottom'" :alt="f.label">
              </div>
            </NuxtLink>
          </div>
        </div>
        <div class="py-md-5"></div>
      </div>
    </div>

    <!-- ══ 最新消息 ══ -->
    <div class="container mt-2 por">
      <div class="col-12 bar-green bar-green-center2"></div>
      <img src="/images/homepage/healthfarm_hp_news_ill_flowers.png" class="ill-flowsers-reverse" alt="">
      <img src="/images/homepage/healthfarm_hp_news_ill_flowers.png" class="ill-flowsers" alt="">
      <div class="row justify-content-center">
        <img src="/images/homepage/healthfarm_hp_news_title.png" class="my-lg-5 mt-md-5 feature-title" alt="">
      </div>
      <div class="por">
        <img src="/images/homepage/healthfarm_hp_ill_butterfly1.png" class="butterfly1" alt="">
        <img src="/images/homepage/healthfarm_hp_ill_butterfly2.png" class="butterfly2" alt="">
        <img src="/images/homepage/healthfarm_hp_ill_butterfly3.png" class="butterfly3" alt="">
      </div>
      <div class="row justify-content-center no-gutters mt-5">
        <div class="col-10 bg-white rounded por">
          <img src="/images/homepage/people2.png"
               class="d-none d-lg-inline-block img-fluid col-md-5 news-people" style="transform:translate(0,-100%);" alt="">
          <img src="/images/homepage/healthfarm_hp_news_tape.png" class="news-tape" alt="">
          <img src="/images/homepage/healthfarm_hp_news_talk1.png"
               class="d-none d-lg-inline-block col-md-2 img-fluid news-talk1" alt="">
          <img src="/images/homepage/healthfarm_hp_news_talk2.png"
               class="d-none d-lg-inline-block col-md-2 img-fluid news-talk2" alt="">
          <div class="row no-gutters justify-content-center mt-md-3">
            <template v-if="newsLoading">
              <div class="col-10 py-4 text-center text-muted">載入中…</div>
            </template>
            <template v-else>
              <div v-for="item in latestNews" :key="item.id" class="col-10 my-2">
                <span class="news-date">{{ item.date }}</span>
                <NuxtLink :to="`/site/news/${item.id}`" style="color:#44271a; padding-left:1vw">
                  {{ item.title }}
                </NuxtLink>
                <div class="bar-black-dashed my-2"></div>
              </div>
            </template>
            <div class="col-12 text-center my-3">
              <div class="btn col-md-6 cus-button">
                <NuxtLink to="/site/news">更多最新消息</NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="py-5"></div>
    </div>

    <div class="bg-greenweb py-2 por">
      <img src="/images/homepage/healthfarm_hp_news_bgphoto.png" class="img-fluid news-photo" alt="">
    </div>

    <!-- ══ 產品 ══ -->
    <div class="container py-lg-4">
      <div class="por mt-2 mx-3">
        <div class="text-center my-2">
          <img src="/images/homepage/healthfarm_hp_prod_title.png" class="feature-title my-md-5" alt="">
        </div>
        <div class="por">
          <button class="arrow-left2" @click="prevProduct">
            <img src="/images/homepage/healthfarm_hp_prod_arrow.png" alt="上一頁">
          </button>
          <div class="row justify-content-center no-gutters px-4">
            <div v-for="p in currentProducts" :key="p.name" class="col-6 col-md-3 text-center px-2 mb-3">
              <NuxtLink to="/site/product">
                <img :src="p.img" class="img-fluid rounded" :alt="p.name">
                <p class="prod-text mt-1">{{ p.name }}</p>
              </NuxtLink>
            </div>
          </div>
          <button class="arrow-right2" @click="nextProduct">
            <img src="/images/homepage/healthfarm_hp_prod_arrow.png" alt="下一頁">
          </button>
        </div>
        <div class="text-center mt-3 mb-4">
          <div class="btn col-md-4 cus-button">
            <NuxtLink to="/site/product">更多農莊產品</NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ 田園餐廳 ══ -->
    <div class="bg-greenweb por">
      <div class="container py-4">
        <div class="row justify-content-center align-items-center">
          <div class="col-12 col-md-5 d-none d-md-block" style="margin-left: -30px;">
            <img src="/images/homepage/healthfarm_hp_restaurant_photo.png" class="img-fluid" alt="">
          </div>
          <div class="col-12 col-md-7">
            <img src="/images/homepage/healthfarm_hp_restaurant_title.png" class="feature-title mb-3" alt="田園餐廳">
            <p class="homepage-restaurant-p mt-3">
              "田園餐廰"以健康飲食為訴求，嚴選安全食材，優先使用農莊自產之有機蔬菜，並提供安靜舒適的用餐環境，並曾獲"食品衛生優良商店"。
            </p>
            <div class="row">
              <div class="col-sm-6 por">
                <img src="/images/homepage/healthfarm_hp_restaurant_meals_p1.png" class="img-fluid" alt="">
              </div>
              <div class="col-sm-6">
                <img src="/images/homepage/healthfarm_hp_restaurant_meals_p2.png" class="img-fluid" alt="">
              </div>
              <div class="col-sm-12 text-center pt-4">
                <div class="btn col-12 cus-button">
                  <NuxtLink to="/site/restaurant">更多田園餐廳</NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <img src="/images/homepage/healthfarm_restaurant_bg_wave.png" class="img-fluid hp-restaurant-bg" alt="">
    </div>

    <!-- ══ 活動 ══ -->
    <div class="por">
      <img src="/images/homepage/healthfarm_hp_event_ill_balloon.png" class="ball" alt="">
      <img src="/images/homepage/healthfarm_hp_event_ill_hotairballoon.png" class="hotball" alt="">
      <div class="text-center pt-2">
        <img src="/images/homepage/healthfarm_hp_event_title.png" class="feature-title d-xl-none mt-md-5" alt="">
      </div>
      <!-- 手機版 -->
      <div class="d-xl-none" style="transform:translateY(-30px)">
        <div class="overflow-hidden">
          <div class="d-flex" :style="`transform:translateX(-${eventIndex*100}%);transition:transform .5s`">
            <img v-for="(src, i) in eventPhotos" :key="i" :src="src"
                 class="img-fluid flex-shrink-0" style="width:100%;min-width:100%" :alt="`活動${i+1}`">
          </div>
        </div>
        <div class="d-flex justify-content-center mt-2" style="gap:8px">
          <button v-for="(_, i) in eventPhotos" :key="i" @click="eventIndex=i"
                  class="rounded-circle border-0 p-0"
                  :style="`width:10px;height:10px;cursor:pointer;background:${eventIndex===i?'#5a8a3c':'#ccc'}`"></button>
        </div>
        <div class="col-12 text-center pt-4 pb-5 bg-greenweb">
          <div class="btn cus-button por d-inline-block">
            <NuxtLink to="/site/activity">我要報名</NuxtLink>
            <img src="/images/homepage/healthfarm_hp_event_ill_bee.png" class="bee" alt="">
          </div>
        </div>
      </div>
      <!-- 桌機版 -->
      <div class="d-none d-xl-block pt-5">
        <div class="container">
          <div class="row mt-2 justify-content-center mb-3">
            <img src="/images/homepage/healthfarm_hp_event_title.png" alt="">
          </div>
        </div>
        <div class="mt-md-5 pt-md-5"></div>
        <div class="event-carousel-desktop d-md-block">
          <div v-for="(src, i) in eventPhotos" :key="i"
               :class="getEventClass(i)" @click="selectEvent(i)">
            <img :src="src" :alt="`活動${i+1}`">
          </div>
        </div>
        <div class="row bg-greenweb pb-5">
          <div class="col-12 text-center pt-4 pb-5">
            <div class="btn cus-button por d-inline-block">
              <NuxtLink to="/site/activity">我要報名</NuxtLink>
              <img src="/images/homepage/healthfarm_hp_event_ill_bee.png" class="bee" alt="">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ 友站連結 ══ -->
    <div class="hp-links-bg py-lg-5">
      <div class="container">
        <div class="pt-5">
          <div class="pt-3 mx-4 mx-lg-5">
            <div class="row justify-content-around hp-note-bg px-2 py-4 py-md-2 por">
              <img src="/images/homepage/healthfarm_hp_link_flower.png" class="links-cover" alt="">
              <div class="col-12">
                <div class="text-center py-2 mt-md-4 mt-lg-5 mb-md-2">
                  <img src="/images/homepage/healthfarm_hp_link_title.png" class="feature-title d-none d-lg-inline-block" alt="">
                </div>
              </div>
              <div v-for="link in partnerLinks" :key="link.href" class="col-5 col-md-3 text-center">
                <a :href="link.href" target="_blank">
                  <img :src="link.img" class="px-md-3 px-lg-4 img-fluid" :alt="link.label">
                  <p class="text-center links-text">{{ link.label }}</p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { useCommonStore } from '~/stores/common.js'

definePageMeta({ layout: 'site' })

const commonStore = useCommonStore()

// ── Cover 輪播 ──
const mobileCovers = [
  '/images/homepage/healthfarm_hp_mobilephoto4.jpg',
  '/images/homepage/healthfarm_hp_mobilephoto3.jpg',
  '/images/homepage/healthfarm_hp_mobilephoto2.jpg',
  '/images/homepage/healthfarm_hp_mobilephoto1.jpg',
]
const desktopCovers = [
  '/images/homepage/healthfarm_hp_topphoto4.jpg',
  '/images/homepage/healthfarm_hp_topphoto3.jpg',
  '/images/homepage/healthfarm_hp_topphoto2.jpg',
  '/images/homepage/healthfarm_hp_topphoto1.jpg',
]
const coverIndex = ref(0)
onMounted(() => {
  setInterval(() => {
    coverIndex.value = (coverIndex.value + 1) % desktopCovers.length
  }, 3500)
})

// ── 四大特色 ──
const features = [
  { to: '/site/about',      label: '關於我們', mobImg: '/images/homepage/mb-four-about.png',     titleImg: '/images/homepage/healthfarm_hp_four_about.png',      photoImg: '/images/homepage/healthfarm_hp_four_about_photo.png' },
  { to: '/site/product',    label: '產品訂購', mobImg: '/images/homepage/mb-four-prod.png',       titleImg: '/images/homepage/healthfarm_hp_four_prod.png',        photoImg: '/images/homepage/healthfarm_hp_four_prod_photo.png' },
  { to: '/site/restaurant', label: '田園餐廳', mobImg: '/images/homepage/mb-four-restaruant.png', titleImg: '/images/homepage/healthfarm_hp_four_restaurant.png',  photoImg: '/images/homepage/healthfarm_hp_four_restaurant_photo.png' },
  { to: '/site/cafe',       label: '休憩小舖', mobImg: '/images/homepage/mb-four-cafe.png',       titleImg: '/images/homepage/healthfarm_hp_four_cafe.png',        photoImg: '/images/homepage/healthfarm_hp_four_cafe_photo.png' },
]

// ── 最新消息（Spring Boot API）──
const newsLoading = ref(true)
const latestNews = ref([])
onMounted(async () => {
  try {
    const all = await (await fetch(`${commonStore.data.main_url}/holy/news/list`)).json()
    latestNews.value = Array.isArray(all) ? all.slice(0, 3) : []
  } catch { latestNews.value = [] }
  finally { newsLoading.value = false }
})

// ── 產品輪播 ──
const allProducts = [
  { name: '火龍果小餐包',   img: '/images/homepage/prod/healthfarm_hp_prod_photo1.png' },
  { name: '香蕉巧克力蛋糕', img: '/images/homepage/prod/healthfarm_hp_prod_photo2.png' },
  { name: '好體力茶',       img: '/images/homepage/prod/healthfarm_hp_prod_photo3.png' },
  { name: '一口酥綜合禮盒', img: '/images/homepage/prod/healthfarm_hp_prod_photo4.png' },
  { name: '樹枝棒',         img: '/images/homepage/prod/healthfarm_hp_prod_photo5.png' },
  { name: '豆腐DIY模組',    img: '/images/homepage/prod/healthfarm_hp_prod_photo6.png' },
  { name: '巧克力核桃餅乾', img: '/images/homepage/prod/healthfarm_hp_prod_photo7.png' },
  { name: '起司葡萄貝果',   img: '/images/homepage/prod/healthfarm_hp_prod_photo8.png' },
]
const productPage = ref(0)
const productPerPage = 4
const totalProductPages = computed(() => Math.ceil(allProducts.length / productPerPage))
const currentProducts = computed(() => {
  const start = productPage.value * productPerPage
  return allProducts.slice(start, start + productPerPage)
})
function prevProduct() { productPage.value = (productPage.value - 1 + totalProductPages.value) % totalProductPages.value }
function nextProduct() { productPage.value = (productPage.value + 1) % totalProductPages.value }

// ── 活動輪播 ──
const eventPhotos = [
  '/images/homepage/event/healthfarm_hp_event_photo1.png',
  '/images/homepage/event/healthfarm_hp_event_photo2.png',
  '/images/homepage/event/healthfarm_hp_event_photo3.png',
  '/images/homepage/event/healthfarm_hp_event_photo4.png',
  '/images/homepage/event/healthfarm_hp_event_photo5.png',
  '/images/homepage/event/healthfarm_hp_event_photo6.png',
]
const eventIndex = ref(2)
function selectEvent(i) { eventIndex.value = i }
function getEventClass(i) {
  const total = eventPhotos.length
  const diff = ((i - eventIndex.value) % total + total) % total
  const centered = diff > total / 2 ? diff - total : diff
  const map = { '-3': 'hideLeft', '-2': 'prevLeftSecond', '-1': 'prev', '0': 'selected', '1': 'next', '2': 'nextRightSecond' }
  return map[String(centered)] || 'hideLeft'
}

// ── 友站連結 ──
const partnerLinks = [
  { href: 'https://act.st-mary.org.tw',                img: '/images/homepage/healthfarm_hp_link_photo1.png', label: '台東聖母醫院高齡服務' },
  { href: 'https://www.st-mary.org.tw/',               img: '/images/homepage/healthfarm_hp_link_photo2.png', label: '台東聖母醫院' },
  { href: 'http://www.healthclub.org.tw/3_Meal_3.htm', img: '/images/homepage/healthfarm_hp_link_photo3.png', label: '聖母健康會館' },
  { href: 'http://www.healthclub.org.tw/fshm/',        img: '/images/homepage/healthfarm_hp_link_photo4.png', label: '芳心好美館' },
]
</script>

<style scoped>
/* Cover slider — Vue class-based transition */
.cover-slider {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1s ease-in-out;
  margin-top: 0 !important;
}
.cover-slider.active {
  position: relative;
  opacity: 1;
}

/* Desktop event coverflow */
.event-carousel-desktop {
  position: relative;
  height: 300px;
  overflow: visible;
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 800px;
  margin: 0 auto;
  max-width: 900px;
}
.event-carousel-desktop > div {
  position: absolute;
  width: 240px;
  transition: transform .5s, opacity .5s;
  cursor: pointer;
}
.event-carousel-desktop > div img { border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.15); }
.selected       { transform: translate3d(0,0,0);              z-index: 5; opacity: 1; }
.prev           { transform: translate3d(-260px,0,-100px) rotateY(50deg);  z-index: 3; opacity: .8; }
.next           { transform: translate3d(260px,0,-100px)  rotateY(-50deg); z-index: 3; opacity: .8; }
.prevLeftSecond { transform: translate3d(-460px,0,-200px) rotateY(60deg);  z-index: 2; opacity: .5; }
.nextRightSecond{ transform: translate3d(460px,0,-200px)  rotateY(-60deg); z-index: 2; opacity: .5; }
.hideLeft       { transform: translate3d(-600px,0,-300px);                 z-index: 1; opacity: 0; }

/* Product arrows */
.arrow-left2 {
  position: absolute; top: 50%; left: -8px;
  transform: translateY(-50%) rotate(180deg);
  width: 28px; cursor: pointer; z-index: 10;
}
.arrow-right2 {
  position: absolute; top: 50%; right: -8px;
  transform: translateY(-50%);
  width: 28px; cursor: pointer; z-index: 10;
}
.prod-text { font-size: 13px; color: #44271a; margin-top: 6px; text-align: center; }
</style>
