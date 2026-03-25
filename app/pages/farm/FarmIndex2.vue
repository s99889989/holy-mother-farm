<template>
  <div class="overflow">

    <!-- ══ Mobile Navbar ══ -->
    <nav class="mob-nav d-xl-none" :class="{ open: mobileMenuOpen }">
      <div class="nav-header">
        <a href="/"><img src="/images/global/healthfarm_logo.png" class="mob-logo-img" alt="台東聖母健康農莊" /></a>
        <div class="hamburger" @click="mobileMenuOpen = !mobileMenuOpen" :class="{ active: mobileMenuOpen }">
          <span></span><span></span><span></span>
        </div>
      </div>
      <ul class="mob-menu" v-show="mobileMenuOpen">
        <li><a href="/">首頁</a></li>
        <li><a href="/news">最新消息</a></li>
        <li><a href="/about">關於我們</a></li>
        <li><a href="/production">產品訂購</a></li>
        <li><a href="/event">活動報名</a></li>
        <li><a href="/restaurant">田園餐廳</a></li>
        <li><a href="/cafe">休憩小舖</a></li>
        <li><a href="/access">交通方式</a></li>
        <li class="mob-social">
          <a href="https://www.facebook.com/st.maryhealthfarm/" target="_blank"><i class="fab fa-facebook-square"></i></a>
          <a href="mailto:healthfarm@st-mary.com.tw"><i class="fas fa-envelope"></i></a>
        </li>
      </ul>
    </nav>

    <!-- ══ Desktop Navbar ══ -->
    <nav class="desk-nav d-none d-xl-flex">
      <div class="desk-nav-inner">
        <a href="/" class="desk-logo">
          <img src="/images/global/healthfarm_logo.png" alt="台東聖母健康農莊" />
        </a>
        <ul class="desk-links">
          <li v-for="link in navLinks" :key="link.href" class="nav-box">
            <a :href="link.href">{{ link.label }}</a>
            <div class="nav-underline"></div>
          </li>
        </ul>
      </div>
    </nav>

    <!-- ══ Cover Slider ══ -->
    <section class="cover-section">
      <div class="cover-track" :style="{ transform: `translateX(-${coverIndex * 100}%)` }">
        <img v-for="(img, i) in desktopCovers" :key="i" :src="img" class="cover-img d-none d-lg-block" alt="封面" />
        <img v-for="(img, i) in mobileCovers"  :key="'m'+i" :src="img" class="cover-img d-lg-none" alt="封面" />
      </div>
      <img src="/images/homepage/healthfarm_hp_ill_sun.png" class="sun-deco" alt="" />
    </section>

    <!-- ══ Intro ══ -->
    <section class="intro-section por">
      <img src="/images/homepage/healthfarm_hp_ill_cloud1.png" class="cloud c1" alt="" />
      <img src="/images/homepage/healthfarm_hp_ill_cloud2.png" class="cloud c2" alt="" />
      <img src="/images/homepage/healthfarm_hp_ill_cloud3.png" class="cloud c3" alt="" />
      <div class="intro-inner">
        <img src="/images/homepage/healthfarm_hp_four_title.png" class="section-title-img" alt="四大特色" />
        <p class="intro-body">
          健康由安全飲食出發，我們希望能成為民眾健康的促進者，除提供安全的飲食外，<br class="d-none d-md-block" />
          也積極與部落及小農合作，輔導提供安全或有機的食材，<br />
          期盼能帶動部落朝向安全有機發展，進而改善促進部落與小農經濟。
        </p>
      </div>
    </section>

    <!-- ══ Four Features ══ -->
    <section class="four-section bg-green-light">
      <div class="container">
        <!-- Mobile grid -->
        <div class="four-mobile d-md-none">
          <a href="/about"><img src="/images/homepage/mb-four-about.png" alt="關於我們" /></a>
          <a href="/production"><img src="/images/homepage/mb-four-prod.png" alt="產品訂購" /></a>
          <a href="/cafe"><img src="/images/homepage/mb-four-cafe.png" alt="休憩小舖" /></a>
          <a href="/restaurant"><img src="/images/homepage/mb-four-restaruant.png" alt="田園餐廳" /></a>
        </div>
        <!-- Desktop circles -->
        <div class="four-desktop d-none d-md-flex">
          <div v-for="feat in features" :key="feat.href" class="feat-col">
            <a :href="feat.href">
              <img :src="feat.titleImg" class="feat-label" :alt="feat.alt" />
              <div class="feat-circle-wrap" :class="feat.position">
                <img src="/images/homepage/healthfarm_hp_four_grassring.png" class="feat-ring" alt="" />
                <div class="feat-circle">
                  <img :src="feat.photoImg" :alt="feat.alt" />
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ News ══ -->
    <section class="news-section">
      <div class="container por">
        <div class="section-bar"></div>
        <img src="/images/homepage/healthfarm_hp_news_ill_flowers.png" class="flowers fl-left" alt="" />
        <img src="/images/homepage/healthfarm_hp_news_ill_flowers.png" class="flowers fl-right" alt="" />
        <div class="section-head">
          <img src="/images/homepage/healthfarm_hp_news_title.png" class="section-title-img" alt="最新消息" />
        </div>
        <div class="butterflies por">
          <img src="/images/homepage/healthfarm_hp_ill_butterfly1.png" class="btfly b1" alt="" />
          <img src="/images/homepage/healthfarm_hp_ill_butterfly2.png" class="btfly b2" alt="" />
          <img src="/images/homepage/healthfarm_hp_ill_butterfly3.png" class="btfly b3" alt="" />
        </div>
        <div class="news-card-wrap">
          <div class="news-card">
            <img src="/images/homepage/people2.png" class="news-people d-none d-lg-block" alt="" />
            <img src="/images/homepage/healthfarm_hp_news_tape.png" class="news-tape" alt="" />
            <img src="/images/homepage/healthfarm_hp_news_talk1.png" class="news-talk1 d-none d-lg-block" alt="" />
            <img src="/images/homepage/healthfarm_hp_news_talk2.png" class="news-talk2 d-none d-lg-block" alt="" />
            <div class="news-list">
              <div v-for="(item, i) in newsList" :key="i" class="news-row">
                <span class="news-date">{{ item.date }}</span>
                <a :href="item.href" class="news-link">{{ item.title }}</a>
              </div>
              <div class="news-more-wrap">
                <a href="/news" class="cus-btn">更多最新消息</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- news bg strip -->
    <div class="news-bg-photo bg-green-light">
      <img src="/images/homepage/healthfarm_hp_news_bgphoto.png" alt="" />
    </div>

    <!-- ══ Products ══ -->
    <section class="prod-section">
      <div class="container">
        <div class="section-head">
          <img src="/images/homepage/healthfarm_hp_prod_title.png" class="section-title-img" alt="推薦農產品" />
        </div>
        <div class="prod-carousel">
          <button class="prod-arrow" @click="prevProd">&#8249;</button>
          <div class="prod-track">
            <div v-for="prod in currentProducts" :key="prod.name" class="prod-item">
              <a :href="prod.href">
                <img :src="prod.img" :alt="prod.name" />
                <p>{{ prod.name }}</p>
              </a>
            </div>
          </div>
          <button class="prod-arrow" @click="nextProd">&#8250;</button>
        </div>
        <div class="more-btn-wrap">
          <a href="/production" class="cus-btn">更多農產品</a>
        </div>
      </div>
    </section>

    <!-- ══ Restaurant ══ -->
    <section class="restaurant-section">
      <!-- Mobile -->
      <div class="d-lg-none restaurant-mobile">
        <img src="/images/homepage/healthfarm_hp_restaurant_title.png" class="section-title-img" alt="田園餐廳" />
        <p class="restaurant-desc">"田園餐廰"以健康飲食為訴求，嚴選安全食材，優先使用農莊自產之有機蔬菜，並提供安靜舒適的用餐環境，並曾獲"食品衛生優良商店"。</p>
        <div class="restaurant-meals-row">
          <img src="/images/homepage/healthfarm_hp_restaurant_meals_p1.png" alt="餐點1" />
          <img src="/images/homepage/healthfarm_hp_restaurant_meals_p2.png" alt="餐點2" />
        </div>
        <div class="more-btn-wrap">
          <a href="/restaurant" class="cus-btn">更多田園餐廳</a>
        </div>
      </div>
      <!-- Desktop -->
      <div class="d-none d-lg-flex restaurant-desktop">
        <div class="restaurant-photo-col">
          <img src="/images/homepage/healthfarm_hp_restaurant_photo.png" alt="田園餐廳" />
        </div>
        <div class="restaurant-info-col">
          <img src="/images/homepage/healthfarm_hp_restaurant_title.png" class="section-title-img" alt="田園餐廳" />
          <p class="restaurant-desc">"田園餐廰"以健康飲食為訴求，嚴選安全食材，優先使用農莊自產之有機蔬菜，並提供安靜舒適的用餐環境，並曾獲"食品衛生優良商店"。</p>
          <div class="restaurant-meals-row">
            <div class="por">
              <img src="/images/homepage/healthfarm_hp_restaurant_meals_p1.png" alt="餐點1" />
              <img src="/images/homepage/healthfarm_hp_restaurant_meals_talkline.png" class="meal-line" alt="" />
              <img src="/images/homepage/healthfarm_hp_restaurant_meals_talk.png" class="meal-talk" alt="" />
            </div>
            <img src="/images/homepage/healthfarm_hp_restaurant_meals_p2.png" alt="餐點2" />
          </div>
          <div class="more-btn-wrap">
            <a href="/restaurant" class="cus-btn">更多田園餐廳</a>
          </div>
        </div>
      </div>
      <img src="/images/homepage/healthfarm_restaurant_bg_wave.png" class="restaurant-wave" alt="" />
    </section>

    <!-- ══ Events ══ -->
    <section class="event-section por">
      <img src="/images/homepage/healthfarm_hp_event_ill_balloon.png" class="deco-balloon" alt="" />
      <img src="/images/homepage/healthfarm_hp_event_ill_hotairballoon.png" class="deco-hotball" alt="" />
      <div class="container">
        <div class="section-head">
          <img src="/images/homepage/healthfarm_hp_event_title.png" class="section-title-img" alt="農莊活動集錦" />
        </div>
      </div>
      <!-- Mobile slider -->
      <div class="event-slider d-xl-none">
        <div class="event-track" :style="{ transform: `translateX(-${eventIndex * 100}%)` }">
          <div v-for="(img, i) in eventPhotos" :key="i" class="event-slide">
            <img :src="img" :alt="`活動${i+1}`" />
          </div>
        </div>
        <div class="event-dots">
          <span
            v-for="(_, i) in eventPhotos" :key="i"
            :class="['dot', { active: eventIndex === i }]"
            @click="eventIndex = i"
          ></span>
        </div>
      </div>
      <!-- Desktop coverflow -->
      <div class="event-coverflow d-none d-xl-block">
        <div
          v-for="(img, i) in eventPhotos" :key="i"
          :class="['cf-item', getEventClass(i)]"
          @click="selectEvent(i)"
        >
          <img :src="img" :alt="`活動${i+1}`" />
        </div>
      </div>
      <div class="bg-green-light event-cta">
        <a href="/event" class="cus-btn por">
          我要報名
          <img src="/images/homepage/healthfarm_hp_event_ill_bee.png" class="bee-deco" alt="" />
        </a>
      </div>
    </section>

    <!-- ══ Partner Links ══ -->
    <section class="links-section">
      <div class="container">
        <div class="links-box por">
          <img src="/images/homepage/healthfarm_hp_link_flower.png" class="link-flower" alt="" />
          <div class="section-head">
            <img src="/images/homepage/healthfarm_hp_link_title.png" class="section-title-img d-none d-lg-block" alt="相關連結" />
          </div>
          <div class="links-grid">
            <a v-for="link in partnerLinks" :key="link.href" :href="link.href" target="_blank" class="link-item">
              <img :src="link.img" :alt="link.label" />
              <p>{{ link.label }}</p>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- divider -->
    <div class="container"><div class="waterdrop-bar"></div></div>

    <!-- ══ Footer ══ -->
    <footer class="site-footer">
      <!-- Desktop info row -->
      <div class="container footer-info d-none d-xl-flex">
        <img src="/images/global/healthfarm_logo.png" class="footer-logo" alt="台東聖母健康農莊" />
        <div class="footer-text">
          <p>
            財團法人天主教會花蓮教區附設聖母健康農莊&nbsp;&nbsp;統編：36726891<br />
            台東巿博物館路110號&emsp;089-381382<br />
            營業時間：08:00~17:30（週二~週日）
          </p>
        </div>
      </div>
      <!-- Mobile info -->
      <div class="container footer-info-mob d-xl-none">
        <img src="/images/global/healthfarm_logo.png" class="footer-logo" alt="台東聖母健康農莊" />
        <p class="footer-addr">
          財團法人天主教會花蓮教區附設聖母健康農莊<br />
          統編：36726891<br />
          台東巿博物館路110號&ensp;089-381382<br />
          8:00~17:30（週一~週六）
        </p>
      </div>
      <!-- Copyright bar -->
      <div class="footer-copy">
        <div class="container footer-copy-inner por">
          <img src="/images/global/grass.png" class="footer-grass" alt="" />
          <p class="copy-text">
            Copyright © 2019 台東聖母健康農莊 All Rights Reserved<br />
            版權所有，非經授權，不得轉載本網站內容 .
          </p>
        </div>
      </div>
    </footer>

    <!-- Back to top -->
    <button class="back-top d-lg-none" v-show="showBackTop" @click="scrollToTop">
      <i class="fas fa-chevron-up"></i>
    </button>

  </div>
</template>

<script>
export default {
  name: 'HealthFarmHome',

  data() {
    return {
      mobileMenuOpen: false,
      showBackTop: false,

      coverIndex: 0,
      coverTimer: null,

      mobileCovers: [
        '/images/homepage/healthfarm_hp_mobilephoto4.jpg',
        '/images/homepage/healthfarm_hp_mobilephoto3.jpg',
        '/images/homepage/healthfarm_hp_mobilephoto2.jpg',
        '/images/homepage/healthfarm_hp_mobilephoto1.jpg',
      ],
      desktopCovers: [
        '/images/homepage/healthfarm_hp_topphoto4.jpg',
        '/images/homepage/healthfarm_hp_topphoto3.jpg',
        '/images/homepage/healthfarm_hp_topphoto2.jpg',
        '/images/homepage/healthfarm_hp_topphoto1.jpg',
      ],

      navLinks: [
        { href: '/news', label: '最新消息' },
        { href: '/about', label: '關於我們' },
        { href: '/production', label: '產品訂購' },
        { href: '/event', label: '活動報名' },
        { href: '/restaurant', label: '田園餐廳' },
        { href: '/cafe', label: '休憩小舖' },
        { href: '/access', label: '交通方式' }
      ],

      features: [
        {
          href: '/about',
          titleImg: '/images/homepage/healthfarm_hp_four_about.png',
          photoImg: '/images/homepage/healthfarm_hp_four_about_photo.png',
          position: 'top',
          alt: '關於我們',
        },
        {
          href: '/production',
          titleImg: '/images/homepage/healthfarm_hp_four_prod.png',
          photoImg: '/images/homepage/healthfarm_hp_four_prod_photo.png',
          position: 'bottom',
          alt: '產品訂購',
        },
        {
          href: '/restaurant',
          titleImg: '/images/homepage/healthfarm_hp_four_restaurant.png',
          photoImg: '/images/homepage/healthfarm_hp_four_restaurant_photo.png',
          position: 'bottom',
          alt: '田園餐廳',
        },
        {
          href: '/cafe',
          titleImg: '/images/homepage/healthfarm_hp_four_cafe.png',
          photoImg: '/images/homepage/healthfarm_hp_four_cafe_photo.png',
          position: 'top',
          alt: '休憩小舖',
        },
      ],

      newsList: [
        { date: '2026-03-07', href: '/news/69ac187624c592c33dc6e986', title: '休園公告' },
        { date: '2026-03-07', href: '/news/69ac184124c592c33dc6e985', title: '特別營業公告' },
        { date: '2026-03-04', href: '/news/69a7d3ff24c592c33dc6e984', title: '高齡體驗課程' },
      ],

      allProducts: [
        { name: '火龍果小餐包',   img: '/images/homepage/prod/healthfarm_hp_prod_photo1.png',  href: '/production4' },
        { name: '香蕉巧克力蛋糕', img: '/images/homepage/prod/healthfarm_hp_prod_photo2.png',  href: '/production2' },
        { name: '好體力茶',       img: '/images/homepage/prod/healthfarm_hp_prod_photo3.png',  href: '/production5' },
        { name: '一口酥綜合禮盒', img: '/images/homepage/prod/healthfarm_hp_prod_photo4.png',  href: '/production6' },
        { name: '樹枝棒',         img: '/images/homepage/prod/healthfarm_hp_prod_photo5.png',  href: '/production3' },
        { name: '豆腐DIY模組',    img: '/images/homepage/prod/healthfarm_hp_prod_photo6.png',  href: '/production7' },
        { name: '巧克力核桃餅乾', img: '/images/homepage/prod/healthfarm_hp_prod_photo7.png',  href: '/production3' },
        { name: '起司葡萄貝果',   img: '/images/homepage/prod/healthfarm_hp_prod_photo8.png',  href: '/production4' },
        { name: '青椒起司麵包',   img: '/images/homepage/prod/healthfarm_hp_prod_photo9.png',  href: '/production4' },
        { name: '薑餅乾',         img: '/images/homepage/prod/healthfarm_hp_prod_photo10.png', href: '/production3' },
        { name: '綜合堅果',       img: '/images/homepage/prod/healthfarm_hp_prod_photo11.png', href: '/production7' },
        { name: '手工餅乾禮盒',   img: '/images/homepage/prod/healthfarm_hp_prod_photo12.png', href: '/production6' },
      ],
      productPage: 0,
      productPerPage: 4,

      eventIndex: 3,
      eventPhotos: [
        '/images/homepage/event/healthfarm_hp_event_photo1.png',
        '/images/homepage/event/healthfarm_hp_event_photo2.png',
        '/images/homepage/event/healthfarm_hp_event_photo3.png',
        '/images/homepage/event/healthfarm_hp_event_photo4.png',
        '/images/homepage/event/healthfarm_hp_event_photo5.png',
        '/images/homepage/event/healthfarm_hp_event_photo6.png',
      ],

      partnerLinks: [
        { href: 'https://act.st-mary.org.tw',                img: '/images/homepage/healthfarm_hp_link_photo1.png', label: '台東聖母醫院高齡服務' },
        { href: 'https://www.st-mary.org.tw/',               img: '/images/homepage/healthfarm_hp_link_photo2.png', label: '台東聖母醫院' },
        { href: 'http://www.healthclub.org.tw/3_Meal_3.htm', img: '/images/homepage/healthfarm_hp_link_photo3.png', label: '聖母健康會館' },
        { href: 'http://www.healthclub.org.tw/fshm/',        img: '/images/homepage/healthfarm_hp_link_photo4.png', label: '芳心好美館' },
      ],
    }
  },

  computed: {
    currentProducts() {
      const s = this.productPage * this.productPerPage
      return this.allProducts.slice(s, s + this.productPerPage)
    },
    totalProductPages() {
      return Math.ceil(this.allProducts.length / this.productPerPage)
    },
  },

  methods: {
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    handleScroll() {
      this.showBackTop = window.scrollY > 20
    },
    startCoverSlider() {
      this.coverTimer = setInterval(() => {
        this.coverIndex = (this.coverIndex + 1) % this.desktopCovers.length
      }, 3500)
    },
    prevProd() {
      this.productPage = (this.productPage - 1 + this.totalProductPages) % this.totalProductPages
    },
    nextProd() {
      this.productPage = (this.productPage + 1) % this.totalProductPages
    },
    selectEvent(i) {
      this.eventIndex = i
    },
    getEventClass(i) {
      const n = this.eventPhotos.length
      let diff = ((i - this.eventIndex) % n + n) % n
      if (diff > n / 2) diff -= n
      return ({
        '-3': 'cf-hide-left',
        '-2': 'cf-prev2',
        '-1': 'cf-prev',
        '0': 'cf-active',
        '1': 'cf-next',
        '2': 'cf-next2',
      })[String(diff)] || 'cf-hide-left'
    },
  },

  mounted() {
    window.addEventListener('scroll', this.handleScroll)
    this.startCoverSlider()
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll)
    clearInterval(this.coverTimer)
  },
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;600&display=swap');

/* ── Reset & base ─────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.overflow { overflow-x: hidden; font-family: 'Noto Sans TC', sans-serif; color: #2a1001; background: #fdfaf4; }
a { text-decoration: none; color: inherit; }
img { display: block; max-width: 100%; height: auto; }
.por { position: relative; }
.container { max-width: 1140px; margin: 0 auto; padding: 0 15px; }
.bg-green-light { background-color: #c8e6c0; }

/* shared title image */
.section-title-img { display: block; margin: 0 auto 20px; max-width: 280px; }
/* shared CTA */
.cus-btn {
  display: inline-block;
  background: #3aad79; color: #fff;
  border-radius: 30px; padding: 10px 36px;
  font-size: 14px; font-weight: 500; letter-spacing: .5px;
  transition: background .2s, transform .15s;
}
.cus-btn:hover { background: #2a8a5e; transform: translateY(-1px); }
.more-btn-wrap { text-align: center; margin-top: 20px; }

/* ── Responsive helpers ───────────────────────────── */
.d-none     { display: none !important; }
.d-block    { display: block !important; }
.d-flex     { display: flex  !important; }
.d-md-none  { display: block; }
.d-lg-none  { display: block; }
.d-lg-block { display: none;  }
.d-lg-flex  { display: none;  }
.d-xl-none  { display: block; }
.d-xl-block { display: none;  }
.d-xl-flex  { display: none;  }
@media (min-width: 768px)  {
  .d-md-none  { display: none  !important; }
  .d-none.d-md-block { display: block !important; }
}
@media (min-width: 992px)  {
  .d-lg-none  { display: none  !important; }
  .d-lg-block { display: block !important; }
  .d-lg-flex  { display: flex  !important; }
}
@media (min-width: 1200px) {
  .d-xl-none  { display: none  !important; }
  .d-xl-block { display: block !important; }
  .d-xl-flex  { display: flex  !important; }
}

/* ══════════════════════════════════════════════
   MOBILE NAV
══════════════════════════════════════════════ */
.mob-nav {
  position: sticky; top: 0; z-index: 1000;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,.1);
}
.nav-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; }
.mob-logo-img { height: 42px; width: auto; }
.hamburger { cursor: pointer; display: flex; flex-direction: column; gap: 5px; padding: 4px; }
.hamburger span { display: block; width: 24px; height: 2px; background: #2a6935; transition: .3s; border-radius: 2px; }
.hamburger.active span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger.active span:nth-child(2) { opacity: 0; }
.hamburger.active span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
.mob-menu { list-style: none; background: #2a6935; }
.mob-menu li a { display: block; padding: 11px 20px; color: #fff; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,.15); }
.mob-social { display: flex !important; gap: 16px; padding: 12px 20px; }
.mob-social a { color: #fff; font-size: 20px; }

/* ══════════════════════════════════════════════
   DESKTOP NAV
══════════════════════════════════════════════ */
.desk-nav { position: sticky; top: 0; z-index: 1000; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.desk-nav-inner { max-width: 1140px; margin: 0 auto; padding: 0 40px; display: flex; align-items: center; gap: 32px; }
.desk-logo img { height: 52px; width: auto; padding: 8px 0; }
.desk-links { list-style: none; display: flex; align-items: center; }
.nav-box { position: relative; }
.nav-box > a { display: block; padding: 20px 12px 18px; font-size: 14px; font-weight: 500; color: #2a1001; transition: color .2s; }
.nav-box:hover > a { color: #2a6935; }
.nav-underline { height: 2px; background: #3aad79; transform: scaleX(0); transform-origin: left; transition: transform .25s; }
.nav-box:hover .nav-underline { transform: scaleX(1); }

/* ══════════════════════════════════════════════
   COVER SLIDER
══════════════════════════════════════════════ */
.cover-section { position: relative; overflow: hidden; background: #e8f4e4; }
.cover-track { display: flex; transition: transform .8s ease; }
.cover-img { min-width: 100%; object-fit: cover; }
.sun-deco {
  position: absolute; top: 16px; right: 24px;
  width: clamp(60px, 8vw, 100px); z-index: 5;
  animation: spin-slow 20s linear infinite;
}
@keyframes spin-slow { to { transform: rotate(360deg); } }

/* ══════════════════════════════════════════════
   INTRO
══════════════════════════════════════════════ */
.intro-section { padding: 60px 16px 80px; background: #fdfaf4; }
.cloud { position: absolute; pointer-events: none; }
.c1 { top: -10px; left: -20px; width: 110px; animation: float 6s ease-in-out infinite; }
.c2 { top: -30px; right: 10px; width: 90px;  animation: float 8s ease-in-out infinite reverse; }
.c3 { bottom: 20px; left: 45%; width: 80px;  animation: float 7s ease-in-out infinite 2s; }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
.intro-inner { text-align: center; }
.intro-body { font-size: 15px; line-height: 2.1; color: #44271a; max-width: 680px; margin: 0 auto; }

/* ══════════════════════════════════════════════
   FOUR FEATURES
══════════════════════════════════════════════ */
.four-section { padding: 40px 0 60px; }
.four-mobile { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 16px; }
.four-mobile img { border-radius: 8px; }
.four-desktop { justify-content: center; }
.feat-col { flex: 0 0 25%; text-align: center; }
.feat-label { display: block; margin: 0 auto 8px; max-width: 130px; }
.feat-circle-wrap { position: relative; width: 100%; }
.feat-circle-wrap.top    .feat-ring { margin-top: -40px; }
.feat-circle-wrap.bottom .feat-ring { margin-top: 0; }
.feat-ring { width: 100%; display: block; }
.feat-circle {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 62%; aspect-ratio: 1;
  border-radius: 50%; overflow: hidden;
  border: 3px solid #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,.12);
  transition: transform .3s;
}
.feat-circle img { width: 100%; height: 100%; object-fit: cover; }
.feat-col a:hover .feat-circle { transform: translate(-50%, -50%) scale(1.05); }

/* ══════════════════════════════════════════════
   NEWS
══════════════════════════════════════════════ */
.news-section { padding: 60px 0 0; }
.section-bar { height: 3px; background: #3aad79; margin-bottom: 8px; }
.section-head { text-align: center; padding: 20px 0; }
.flowers { position: absolute; width: 100px; pointer-events: none; }
.fl-left  { left: 0;  top: 0; transform: scaleX(-1); }
.fl-right { right: 0; top: 0; }
.butterflies { pointer-events: none; height: 60px; }
.btfly { position: absolute; }
.b1 { width: 46px; top: 0; left: 12%; }
.b2 { width: 38px; top: -8px; right: 22%; }
.b3 { width: 32px; top: 8px; right: 6%; }
.news-card-wrap { display: flex; justify-content: center; }
.news-card {
  position: relative;
  background: #fff; border-radius: 12px;
  width: min(90%, 680px);
  padding: 32px 40px 28px;
  box-shadow: 0 4px 20px rgba(0,0,0,.08);
}
.news-people { position: absolute; top: 0; left: -10px; transform: translateY(-80%); width: 200px; pointer-events: none; }
.news-tape   { position: absolute; top: -8px; right: 20px; width: 60px; }
.news-talk1  { position: absolute; top: 12px; right: 260px; width: 100px; }
.news-talk2  { position: absolute; top: -4px; right: 100px; width: 100px; }
.news-list   { margin-top: 8px; }
.news-row    { display: flex; align-items: baseline; gap: 12px; padding: 12px 0; border-bottom: 1px dashed #ccc; }
.news-date   { font-size: 13px; color: #888; white-space: nowrap; }
.news-link   { font-size: 14px; color: #44271a; transition: color .2s; }
.news-link:hover { color: #2a6935; }
.news-more-wrap { text-align: center; margin-top: 20px; }
.news-bg-photo { overflow: hidden; }
.news-bg-photo img { width: 100%; max-height: 220px; object-fit: cover; }

/* ══════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════ */
.prod-section { padding: 60px 0; background: #fdfaf4; }
.prod-carousel { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; }
.prod-track { display: flex; justify-content: center; gap: 24px; overflow: hidden; width: 100%; max-width: 900px; }
.prod-item { flex: 0 0 calc(25% - 18px); text-align: center; }
.prod-item img { border-radius: 8px; transition: transform .2s; }
.prod-item:hover img { transform: scale(1.04); }
.prod-item p { font-size: 13px; color: #44271a; margin-top: 8px; }
.prod-arrow { background: none; border: none; cursor: pointer; font-size: 40px; color: #3aad79; line-height: 1; padding: 0 8px; flex-shrink: 0; transition: color .2s; }
.prod-arrow:hover { color: #2a6935; }
@media (max-width: 767px) { .prod-item { flex: 0 0 calc(50% - 12px); } }

/* ══════════════════════════════════════════════
   RESTAURANT
══════════════════════════════════════════════ */
.restaurant-section { background-color: #b6e0d1; padding-bottom: 0; }
.restaurant-mobile { padding: 32px 20px 24px; }
.restaurant-desc { font-size: 14px; line-height: 1.9; color: #44271a; margin: 12px 0 20px; }
.restaurant-meals-row { display: flex; gap: 12px; }
.restaurant-meals-row img { flex: 1; border-radius: 8px; }
.restaurant-desktop { align-items: center; padding: 48px 40px 32px; max-width: 1140px; margin: 0 auto; gap: 48px; }
.restaurant-photo-col { flex: 0 0 48%; }
.restaurant-info-col  { flex: 1; }
.meal-line { position: absolute; bottom: 0; left: 0; width: 80px; transform: translate(200%,40%) scale(.8); }
.meal-talk { position: absolute; left: 0; bottom: 0; width: 130px; transform: translate(-10%,160%); }
.restaurant-wave { width: 100%; display: block; }

/* ══════════════════════════════════════════════
   EVENTS
══════════════════════════════════════════════ */
.event-section { padding: 60px 0 0; background: #fdfaf4; overflow: hidden; }
.deco-balloon { position: absolute; left: 12px; top: 0; width: 60px; }
.deco-hotball { position: absolute; right: 16px; top: 50px; width: 80px; }
.event-slider { overflow: hidden; margin: 24px 0 0; }
.event-track { display: flex; transition: transform .5s ease; }
.event-slide { min-width: 100%; padding: 0 20px; }
.event-slide img { border-radius: 12px; width: 100%; }
.event-dots { display: flex; justify-content: center; gap: 8px; padding: 14px 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #c8c8c8; cursor: pointer; transition: background .3s; }
.dot.active { background: #3aad79; }
.event-coverflow { position: relative; height: 320px; display: flex; align-items: center; justify-content: center; perspective: 1000px; margin: 32px 0 0; }
.cf-item { position: absolute; width: 260px; transition: transform .5s, opacity .5s; cursor: pointer; }
.cf-item img { border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,.15); width: 100%; }
.cf-active    { transform: translate3d(0,0,0);             z-index: 5; opacity: 1; }
.cf-prev      { transform: translate3d(-280px,0,-120px) rotateY(50deg);  z-index: 3; opacity: .75; }
.cf-next      { transform: translate3d( 280px,0,-120px) rotateY(-50deg); z-index: 3; opacity: .75; }
.cf-prev2     { transform: translate3d(-490px,0,-240px) rotateY(60deg);  z-index: 2; opacity: .45; }
.cf-next2     { transform: translate3d( 490px,0,-240px) rotateY(-60deg); z-index: 2; opacity: .45; }
.cf-hide-left { transform: translate3d(-680px,0,-360px); z-index: 1; opacity: 0; }
.event-cta { display: flex; justify-content: center; align-items: center; padding: 32px 0 40px; margin-top: 40px; }
.bee-deco  { position: absolute; top: -32px; right: -24px; width: 52px; pointer-events: none; }

/* ══════════════════════════════════════════════
   PARTNER LINKS
══════════════════════════════════════════════ */
.links-section { padding: 60px 0; background: #fdfaf4; }
.links-box { background: #fff; border-radius: 16px; padding: 48px 24px 40px; box-shadow: 0 2px 16px rgba(0,0,0,.06); }
.link-flower { position: absolute; top: -36px; left: 50%; transform: translateX(-50%); width: 120px; pointer-events: none; }
.links-grid { display: flex; flex-wrap: wrap; justify-content: space-around; gap: 24px; margin-top: 8px; }
.link-item { text-align: center; flex: 0 0 calc(25% - 24px); min-width: 120px; }
.link-item img { border-radius: 50%; width: 100px; height: 100px; object-fit: cover; margin: 0 auto 10px; border: 2px solid #d4edda; }
.link-item p { font-size: 13px; color: #44271a; }

/* divider */
.waterdrop-bar { height: 4px; margin: 40px 48px; background: linear-gradient(to right, #3aad79, rgba(58,173,121,0)); border-radius: 4px; }

/* ══════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════ */
.site-footer { background: #fdfaf4; }
.footer-info { align-items: center; gap: 32px; padding: 32px 40px; border-bottom: 1px dashed #ccc; max-width: 1140px; margin: 0 auto; }
.footer-logo { height: 56px; width: auto; }
.footer-text { border-left: 2px dashed #ccc; padding-left: 24px; }
.footer-text p { font-size: 14px; color: #555; line-height: 2; }
.footer-info-mob { padding: 24px 16px; }
.footer-addr { font-size: 13px; color: #555; line-height: 2; margin-top: 12px; }
.footer-copy { background: url('/images/global/bg-footer.jpg') repeat; padding: 24px 0; }
.footer-copy-inner { position: relative; padding: 16px 0; }
.footer-grass { position: absolute; bottom: 0; left: 0; width: 180px; }
.copy-text { font-size: 12px; color: #fff; text-align: center; line-height: 1.8; }

/* back to top */
.back-top {
  position: fixed; bottom: 20px; right: 16px; z-index: 999;
  width: 42px; height: 42px; background: #3aad79; color: #fff;
  border: none; border-radius: 50%; font-size: 15px; cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.2); transition: background .2s;
}
.back-top:hover { background: #2a8a5e; }
</style>
