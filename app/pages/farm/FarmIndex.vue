<template>
  <div class="overflow">
    <!-- Mobile / Tablet Navbar (hidden on xl) -->
    <nav
      class="nav nav-shadow d-xl-none"
      :class="{ 'menu-open': mobileMenuOpen }"
    >
      <div class="nav-header">
        <div class="navLogo">
          <a
            class="navbar-brand mob-logo"
            href="/"
          >
            <img
              src="/images/global/healthfarm_logo.png"
              alt="台東聖母健康農莊"
            >
          </a>
        </div>
        <div
          class="navToggle"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <div
            class="icon"
            :class="{ active: mobileMenuOpen }"
          />
        </div>
      </div>

      <ul
        v-show="mobileMenuOpen"
        class="vertical menu"
      >
        <li>
          <a href="/">首頁</a>
          <span>
            <a
              href="https://www.facebook.com/st.maryhealthfarm/"
              target="_blank"
            >
              <i
                class="fab fa-facebook-square"
                style="transform: scale(1.3) translateX(200%); color:#fff"
              />
            </a>
          </span>
          <span>
            <a href="mailto:healthfarm@st-mary.com.tw">
              <i
                class="fas fa-envelope"
                style="transform: scale(1.3) translateX(250%); color:#fff"
              />
            </a>
          </span>
        </li>
        <li><a href="/news">最新消息</a></li>
        <li><a href="/about">關於我們</a></li>
        <li><a href="/production">產品訂購</a></li>
        <li><a href="/event">活動報名</a></li>
        <li><a href="/restaurant">田園餐廳</a></li>
        <li><a href="/cafe">休憩小舖</a></li>
        <li><a href="/access">交通方式</a></li>
      </ul>
    </nav>

    <!-- Desktop Navbar -->
    <div class="d-none d-xl-block">
      <nav
        id="navbar"
        class="navbar navbar-expand-xl navbar-light bg-light nav-shadow d-nav"
      >
        <div class="container">
          <div class="col-xl-3 align-middle pl-5">
            <a
              class="navbar-brand d-logo"
              href="/"
            >
              <img
                src="/images/global/healthfarm_logo.png"
                alt="台東聖母健康農莊"
              >
            </a>
          </div>
          <div class="d-none d-xl-inline-block col-xl-1" />
          <div
            id="navbarNavAltMarkup"
            class="collapse navbar-collapse col-xl-8"
          >
            <div class="navbar-nav">
              <div
                v-for="link in navLinks"
                :key="link.href"
                class="nav-box mr-lg-3"
              >
                <a
                  class="nav-item nav-link nav-cus"
                  :href="link.href"
                  style="color:#2a1001; font-weight: 500;"
                >
                  {{ link.label }}
                </a>
                <div class="nav-line-mask">
                  <div class="nav-line-bar" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>

    <!-- Cover / Hero Slider -->
    <div class="cover-wrapper">
      <!-- Mobile Cover -->
      <div class="homepage-cover d-lg-none">
        <img
          v-for="(img, i) in mobileCovers"
          :key="i"
          :src="img"
          :class="['img-fluid', 'cover-slider', { active: coverIndex === i }]"
          alt="封面"
        >
      </div>
      <!-- Desktop Cover -->
      <div class="homepage-cover d-none d-lg-block">
        <img
          v-for="(img, i) in desktopCovers"
          :key="i"
          :src="img"
          :class="['desktop-cover-mask', 'img-fluid', 'cover-slider', { active: coverIndex === i }]"
          alt="封面"
        >
      </div>
      <img
        src="/images/homepage/healthfarm_hp_ill_sun.png"
        class="sun"
        alt=""
      >
    </div>

    <!-- Introduce -->
    <div class="container mb-5 pb-5">
      <div class="row justify-content-center por mb-0 mb-md-5">
        <img
          src="/images/homepage/healthfarm_hp_ill_cloud1.png"
          class="hp-cloud1"
          alt=""
        >
        <img
          src="/images/homepage/healthfarm_hp_ill_cloud2.png"
          class="hp-cloud2"
          alt=""
        >
        <img
          src="/images/homepage/healthfarm_hp_ill_cloud3.png"
          class="hp-cloud3"
          alt=""
        >
        <div class="text-center py-3 mt-5">
          <img
            src="/images/homepage/healthfarm_hp_four_title.png"
            class="intro-title mt-4 mt-md-0"
            alt="四大特色"
          >
        </div>
        <div class="col-12">
          <p class="text-center intro-text">
            健康由安全飲食出發，<br class="d-md-none">我們希望能成為民眾健康的促進者，<br class="d-md-none">除提供安全的飲食外，<br class="d-none d-md-inline-block">
            也積極與部落及小農合作，<br class="d-md-none">輔導提供安全或有機的食材，<br>
            期盼能帶動部落朝向安全有機發展，<br class="d-md-none">進而改善促進部落與小農經濟。
          </p>
        </div>
      </div>
    </div>

    <!-- Four Features -->
    <div class="bg-greenweb por pt-3 py-md-5">
      <div class="container">
        <!-- Mobile -->
        <div class="row d-md-none px-4">
          <a
            href="/about"
            class="col-6 col-md-3"
          >
            <img
              src="/images/homepage/mb-four-about.png"
              class="img-fluid mob-four"
              alt="關於我們"
            >
          </a>
          <a
            href="/production"
            class="col-6 col-md-3"
          >
            <img
              src="/images/homepage/mb-four-prod.png"
              class="img-fluid mob-four"
              alt="產品訂購"
            >
          </a>
          <a
            href="/cafe"
            class="col-6 col-md-3"
          >
            <img
              src="/images/homepage/mb-four-cafe.png"
              class="img-fluid mob-four2"
              alt="休憩小舖"
            >
          </a>
          <a
            href="/restaurant"
            class="col-6 col-md-3"
          >
            <img
              src="/images/homepage/mb-four-restaruant.png"
              class="img-fluid mob-four2"
              alt="田園餐廳"
            >
          </a>
        </div>
        <!-- Desktop -->
        <div class="row por pb-3">
          <div
            v-for="feature in features"
            :key="feature.href"
            class="col-3 por d-none d-md-inline-block"
          >
            <a :href="feature.href">
              <img
                :src="feature.titleImg"
                :class="['cycle-title', feature.position === 'top' ? 'cycle-title-top' : 'cycle-title-bottom']"
                :alt="feature.alt"
              >
              <img
                src="/images/homepage/healthfarm_hp_four_grassring.png"
                :class="['cycle-grass', feature.position === 'top' ? 'cycle-grass-top' : 'cycle-grass-bottom']"
                alt=""
              >
              <div :class="['cycle-mask', feature.position === 'top' ? 'cycle-top-mask' : 'cycle-bottom-mask']">
                <img
                  :src="feature.photoImg"
                  :class="['cycle-photo', feature.position === 'top' ? 'cycle-top' : 'cycle-bottom']"
                  :alt="feature.alt"
                >
              </div>
            </a>
          </div>
        </div>
        <div class="py-md-5" />
      </div>
    </div>

    <!-- News -->
    <div class="container mt-2 por">
      <div class="col-12 bar-green bar-green-center2" />
      <img
        src="/images/homepage/healthfarm_hp_news_ill_flowers.png"
        class="ill-flowsers-reverse"
        alt=""
      >
      <img
        src="/images/homepage/healthfarm_hp_news_ill_flowers.png"
        class="ill-flowsers"
        alt=""
      >
      <div class="row justify-content-center">
        <div>
          <img
            src="/images/homepage/healthfarm_hp_news_title.png"
            class="my-lg-5 mt-md-5 feature-title"
            alt="最新消息"
          >
        </div>
      </div>
      <div class="por">
        <img
          src="/images/homepage/healthfarm_hp_ill_butterfly1.png"
          class="butterfly1"
          alt=""
        >
        <img
          src="/images/homepage/healthfarm_hp_ill_butterfly2.png"
          class="butterfly2"
          alt=""
        >
        <img
          src="/images/homepage/healthfarm_hp_ill_butterfly3.png"
          class="butterfly3"
          alt=""
        >
      </div>
      <div class="row justify-content-center no-gutters mt-5">
        <div class="col-10 bg-white rounded por justify-content-center">
          <img
            src="/images/homepage/people2.png"
            class="d-none d-lg-inline-block img-fluid col-md-5 news-people"
            alt=""
          >
          <img
            src="/images/homepage/healthfarm_hp_news_tape.png"
            class="news-tape"
            alt=""
          >
          <img
            src="/images/homepage/healthfarm_hp_news_talk1.png"
            class="d-none d-lg-inline-block col-md-2 img-fluid news-talk1"
            alt=""
          >
          <img
            src="/images/homepage/healthfarm_hp_news_talk2.png"
            class="d-none d-lg-inline-block col-md-2 img-fluid news-talk2"
            alt=""
          >
          <div class="row no-gutters justify-content-center mt-md-3">
            <template
              v-for="(item, i) in newsList"
              :key="i"
            >
              <div class="col-10 my-3">
                <span class="news-date">{{ item.date }} </span>
                <a
                  :href="item.href"
                  style="color: #44271a; padding-left: 1vw"
                >{{ item.title }}</a>
              </div>
              <div class="col-10 bar-black-dashed my-2" />
            </template>
            <div class="col-12 text-center my-3">
              <div class="btn col-md-6 cus-button">
                <a href="/news">更多最新消息</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="py-5" />
    </div>

    <div class="bg-greenweb py-2 por">
      <img
        src="/images/homepage/healthfarm_hp_news_bgphoto.png"
        alt=""
        class="img-fluid news-photo"
      >
    </div>

    <!-- Products -->
    <div class="container py-lg-4">
      <div class="por mt-2 mx-3 mob-prod">
        <div class="text-center my-2">
          <img
            src="/images/homepage/healthfarm_hp_prod_title.png"
            class="feature-title my-md-5"
            alt="農產品"
          >
        </div>
        <div class="col-sm-12">
          <div class="row mx-auto">
            <a
              href="#"
              @click.prevent="prevSlide"
            ><img
              src="/images/homepage/healthfarm_hp_prod_arrow.png"
              class="arrow-left2"
              alt="上一頁"
            ></a>
            <a
              href="#"
              @click.prevent="nextSlide"
            ><img
              src="/images/homepage/healthfarm_hp_prod_arrow.png"
              class="arrow-right2"
              alt="下一頁"
            ></a>
            <div class="col-sm-12 por">
              <div class="carousel-inner">
                <div class="carousel-item text-center active">
                  <div class="row justify-content-center mb-2">
                    <figure
                      v-for="prod in currentProducts"
                      :key="prod.name"
                      class="col-6 col-lg-3"
                    >
                      <a :href="prod.href">
                        <img
                          :src="prod.img"
                          class="img-fluid"
                          :alt="prod.name"
                        >
                        <p class="text-center prod-text">{{ prod.name }}</p>
                      </a>
                    </figure>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 text-center mb-5">
        <div class="btn cus-button">
          <a href="/production">更多農產品</a>
        </div>
      </div>
    </div>

    <!-- Restaurant - Mobile -->
    <div class="d-lg-none">
      <div
        class="bg-restaurant py-lg-4"
        style="background-color:#b6e0d1"
      >
        <div class="row justify-content-center no-gutters">
          <div class="col-10 text-center mt-2">
            <img
              src="/images/homepage/healthfarm_hp_restaurant_title.png"
              class="feature-title mt-md-3"
              alt="田園餐廳"
            >
          </div>
          <p class="col-10 homepage-restaurant-p">
            "田園餐廰"以健康飲食為訴求，嚴選安全食材，優先使用農莊自產之有機蔬菜，並提供安靜舒適的用餐環境，並曾獲"食品衛生優良商店"。
          </p>
          <div class="row no-gutters justify-content-center">
            <div class="col-5 mr-3">
              <img
                src="/images/homepage/healthfarm_hp_restaurant_meals_p1.png"
                class="img-fluid"
                alt="餐點1"
              >
            </div>
            <div class="col-5">
              <img
                src="/images/homepage/healthfarm_hp_restaurant_meals_p2.png"
                class="img-fluid"
                alt="餐點2"
              >
            </div>
          </div>
          <div class="col-12 text-center pt-4 mb-5">
            <div class="btn col-12 cus-button">
              <a href="/restaurant">更多田園餐廳</a>
            </div>
          </div>
        </div>
      </div>
      <img
        src="/images/homepage/healthfarm_restaurant_bg_wave.png"
        class="img-fluid nopadding hp-restaurant-bg d-lg-none"
        alt=""
      >
    </div>

    <!-- Restaurant - Desktop -->
    <div class="d-none d-lg-block">
      <div
        class="bg-restaurant por p-5"
        style="background-color:#b6e0d1"
      >
        <div class="container">
          <div class="row justify-content-center por py-5 mt-2">
            <div class="col-sm-6 align-self-center">
              <img
                src="/images/homepage/healthfarm_hp_restaurant_photo.png"
                class="img-fluid px-3"
                alt="田園餐廳照片"
              >
            </div>
            <div class="col-12 col-sm-6">
              <img
                src="/images/homepage/healthfarm_hp_restaurant_title.png"
                class="ml-2 mt-4"
                alt="田園餐廳"
              >
              <div class="col-sm-12">
                <p class="homepage-restaurant-p mt-3">
                  "田園餐廰"以健康飲食為訴求，嚴選安全食材，優先使用農莊自產之有機蔬菜，並提供安靜舒適的用餐環境，並曾獲"食品衛生優良商店"。
                </p>
              </div>
              <div class="row">
                <div class="col-sm-6 por">
                  <img
                    src="/images/homepage/healthfarm_hp_restaurant_meals_p1.png"
                    class="img-fluid"
                    alt="餐點1"
                  >
                  <img
                    src="/images/homepage/healthfarm_hp_restaurant_meals_talkline.png"
                    class="d-none d-lg-inline-block meal-line"
                    alt=""
                  >
                  <img
                    src="/images/homepage/healthfarm_hp_restaurant_meals_talk.png"
                    class="d-none d-lg-inline-block meal-talk"
                    alt=""
                  >
                </div>
                <div class="col-sm-6">
                  <img
                    src="/images/homepage/healthfarm_hp_restaurant_meals_p2.png"
                    class="img-fluid"
                    alt="餐點2"
                  >
                </div>
                <div class="col-sm-12 text-center pt-4">
                  <div class="btn col-12 cus-button">
                    <a href="/restaurant">更多田園餐廳</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <img
        src="/images/homepage/healthfarm_restaurant_bg_wave.png"
        class="img-fluid nopadding hp-restaurant-bg"
        alt=""
      >
    </div>

    <!-- Events -->
    <div class="por">
      <img
        src="/images/homepage/healthfarm_hp_event_ill_balloon.png"
        class="ball"
        alt=""
      >
      <img
        src="/images/homepage/healthfarm_hp_event_ill_hotairballoon.png"
        class="hotball"
        alt=""
      >

      <div class="text-center pt-2">
        <img
          src="/images/homepage/healthfarm_hp_event_title.png"
          class="feature-title d-xl-none mt-md-5"
          alt="活動報名"
        >
      </div>

      <!-- Mobile Event Slider -->
      <div class="event-slider-mobile d-xl-none">
        <div
          class="event-slides-wrapper"
          :style="{ transform: `translateX(calc(-${eventIndex * 100}% + ${eventOffset}px))` }"
        >
          <div
            v-for="(img, i) in eventPhotos"
            :key="i"
            class="event-slide"
            :class="{ active: eventIndex === i }"
          >
            <img
              :src="img"
              class="img-fluid"
              :alt="`活動${i + 1}`"
            >
          </div>
        </div>
        <div class="event-dots">
          <span
            v-for="(_, i) in eventPhotos"
            :key="i"
            :class="['dot', { active: eventIndex === i }]"
            @click="eventIndex = i"
          />
        </div>
      </div>

      <div class="col-12 text-center pt-4 pb-5 d-lg-none bg-greenweb">
        <div class="btn cus-button por">
          <a href="/event">我要報名</a>
          <img
            src="/images/homepage/healthfarm_hp_event_ill_bee.png"
            class="bee"
            alt=""
          >
        </div>
      </div>

      <!-- Desktop Event -->
      <div class="d-none col-lg-12 d-xl-block pt-5">
        <div class="container">
          <div class="row mt-2 justify-content-center mb-3">
            <img
              src="/images/homepage/healthfarm_hp_event_title.png"
              alt="活動報名"
            >
          </div>
        </div>
        <div class="mt-md-5 pt-md-5" />
        <div class="event-carousel-desktop">
          <div
            v-for="(img, i) in eventPhotos"
            :key="i"
            :class="getEventClass(i)"
            @click="selectEvent(i)"
          >
            <img
              :src="img"
              :alt="`活動${i + 1}`"
            >
          </div>
        </div>
        <div class="row bg-greenweb pb-5">
          <div class="col-12 text-center pt-4 pb-5">
            <div class="btn cus-button por">
              <a href="/event">我要報名</a>
              <img
                src="/images/homepage/healthfarm_hp_event_ill_bee.png"
                class="bee"
                alt=""
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Partner Links -->
    <div class="hp-links-bg py-lg-5">
      <div class="container">
        <div class="pt-5">
          <div class="pt-3 mx-4 mx-lg-5">
            <div class="row justify-content-around hp-note-bg px-2 py-4 py-md-2 por">
              <img
                src="/images/homepage/healthfarm_hp_link_flower.png"
                class="links-cover"
                alt=""
              >
              <div class="col-12">
                <div class="text-center py-2 py-lg-2 mt-md-4 mt-lg-5 mb-md-2">
                  <img
                    src="/images/homepage/healthfarm_hp_link_title.png"
                    class="feature-title d-none d-lg-inline-block"
                    alt="相關連結"
                  >
                </div>
              </div>
              <div
                v-for="link in partnerLinks"
                :key="link.href"
                class="col-5 col-md-3 text-center"
              >
                <a
                  :href="link.href"
                  target="_blank"
                >
                  <img
                    :src="link.img"
                    class="px-md-3 px-lg-4 img-fluid"
                    :alt="link.label"
                  >
                  <p class="text-center links-text">{{ link.label }}</p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="bar-waterDrop mt-5 mx-lg-5" />
    </div>

    <!-- Footer - Desktop -->
    <div class="container">
      <div class="mx-5 d-none d-xl-block">
        <div class="my-lg-5 px-5 mx-3">
          <div class="row p-4 p-lg-0 align-items-center">
            <div class="col-sm-3 mr-4 mb-2 pt-3 mr-5">
              <img
                src="/images/global/healthfarm_logo.png"
                alt="台東聖母健康農莊"
              >
            </div>
            <div class="ml-3 col-8 bar-straight-dotted pt-lg-3">
              <p class="pl-lg-2">
                財團法人天主教會花蓮教區附設聖母健康農莊<br>
                統編：36726891<br>
                台東巿博物館路110號<span class="pl-lg-5">089-381382</span><br>
                營業時間：08:00~17:30（週二~週日）
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="py-3 px-5 d-none d-xl-block footer-bg">
      <div class="container">
        <div class="por p-5">
          <img
            src="/images/global/grass.png"
            class="footer-grass"
            alt=""
          >
          <div class="row">
            <div class="col-12 d-md-block col-md-6">
              <p class="text-white footer-fontSize text-center text-md-left">
                Copyright © 2019 台東聖母健康農莊 All Rights Reserved<br>
                版權所有，非經授權，不得轉載本網站內容 .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer - Mobile -->
    <div class="container">
      <div class="d-xl-none">
        <div class="row no-gutters justify-content-center my-3">
          <div class="col-10">
            <img
              src="/images/global/healthfarm_logo.png"
              class="mob-logo"
              alt="台東聖母健康農莊"
            >
            <p class="footer-address">
              財團法人天主教會花蓮教區附設聖母健康農莊<br>
              統編：36726891<br>
              台東巿博物館路110號<span style="padding-left: 20px" />089-381382<br>
              8:00~17:30（週一~週六）
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="pt-5 py-3 d-xl-none footer-bg">
      <div class="container">
        <div class="por">
          <img
            src="/images/global/grass.png"
            class="footer-grass"
            alt=""
          >
          <div class="row">
            <div class="col-12">
              <p class="text-white footer-fontSize text-center">
                Copyright © 2019 台東聖母健康農莊 All Rights Reserved<br>
                版權所有，非經授權，不得轉載本網站內容 .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Back to Top -->
    <button
      v-show="showBackTop"
      id="myBtn"
      title="回到頂部"
      class="d-lg-none"
      @click="scrollToTop"
    >
      <i class="fas fa-chevron-up" />
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

      // Cover sliders
      coverIndex: 0,
      coverTimer: null,
      mobileCovers: [
        '/images/homepage/healthfarm_hp_mobilephoto4.jpg',
        '/images/homepage/healthfarm_hp_mobilephoto3.jpg',
        '/images/homepage/healthfarm_hp_mobilephoto2.jpg',
        '/images/homepage/healthfarm_hp_mobilephoto1.jpg'
      ],
      desktopCovers: [
        '/images/homepage/healthfarm_hp_topphoto4.jpg',
        '/images/homepage/healthfarm_hp_topphoto3.jpg',
        '/images/homepage/healthfarm_hp_topphoto2.jpg',
        '/images/homepage/healthfarm_hp_topphoto1.jpg'
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
          alt: '關於我們'
        },
        {
          href: '/production',
          titleImg: '/images/homepage/healthfarm_hp_four_prod.png',
          photoImg: '/images/homepage/healthfarm_hp_four_prod_photo.png',
          position: 'bottom',
          alt: '產品訂購'
        },
        {
          href: '/restaurant',
          titleImg: '/images/homepage/healthfarm_hp_four_restaurant.png',
          photoImg: '/images/homepage/healthfarm_hp_four_restaurant_photo.png',
          position: 'bottom',
          alt: '田園餐廳'
        },
        {
          href: '/cafe',
          titleImg: '/images/homepage/healthfarm_hp_four_cafe.png',
          photoImg: '/images/homepage/healthfarm_hp_four_cafe_photo.png',
          position: 'top',
          alt: '休憩小舖'
        }
      ],

      newsList: [
        { date: '2026-03-07', href: '/news/69ac187624c592c33dc6e986', title: '休園公告' },
        { date: '2026-03-07', href: '/news/69ac184124c592c33dc6e985', title: '特別營業公告' },
        { date: '2026-03-04', href: '/news/69a7d3ff24c592c33dc6e984', title: '高齡體驗課程' }
      ],

      // Products
      allProducts: [
        { name: '火龍果小餐包', img: '/images/homepage/prod/healthfarm_hp_prod_photo1.png', href: '/production4' },
        { name: '香蕉巧克力蛋糕', img: '/images/homepage/prod/healthfarm_hp_prod_photo2.png', href: '/production2' },
        { name: '好體力茶', img: '/images/homepage/prod/healthfarm_hp_prod_photo3.png', href: '/production5' },
        { name: '一口酥綜合禮盒', img: '/images/homepage/prod/healthfarm_hp_prod_photo4.png', href: '/production6' },
        { name: '樹枝棒', img: '/images/homepage/prod/healthfarm_hp_prod_photo5.png', href: '/production3' },
        { name: '豆腐DIY模組', img: '/images/homepage/prod/healthfarm_hp_prod_photo6.png', href: '/production7' },
        { name: '巧克力核桃餅乾', img: '/images/homepage/prod/healthfarm_hp_prod_photo7.png', href: '/production3' },
        { name: '起司葡萄貝果', img: '/images/homepage/prod/healthfarm_hp_prod_photo8.png', href: '/production4' },
        { name: '青椒起司麵包', img: '/images/homepage/prod/healthfarm_hp_prod_photo9.png', href: '/production4' },
        { name: '薑餅乾', img: '/images/homepage/prod/healthfarm_hp_prod_photo10.png', href: '/production3' },
        { name: '綜合堅果', img: '/images/homepage/prod/healthfarm_hp_prod_photo11.png', href: '/production7' },
        { name: '手工餅乾禮盒', img: '/images/homepage/prod/healthfarm_hp_prod_photo12.png', href: '/production6' }
      ],
      productPage: 0,
      productPerPage: 4,

      // Events
      eventIndex: 2,
      eventOffset: 0,
      eventPhotos: [
        '/images/homepage/event/healthfarm_hp_event_photo1.png',
        '/images/homepage/event/healthfarm_hp_event_photo2.png',
        '/images/homepage/event/healthfarm_hp_event_photo3.png',
        '/images/homepage/event/healthfarm_hp_event_photo4.png',
        '/images/homepage/event/healthfarm_hp_event_photo5.png',
        '/images/homepage/event/healthfarm_hp_event_photo6.png'
      ],

      partnerLinks: [
        { href: 'https://act.st-mary.org.tw', img: '/images/homepage/healthfarm_hp_link_photo1.png', label: '台東聖母醫院高齡服務' },
        { href: 'https://www.st-mary.org.tw/', img: '/images/homepage/healthfarm_hp_link_photo2.png', label: '台東聖母醫院' },
        { href: 'http://www.healthclub.org.tw/3_Meal_3.htm', img: '/images/homepage/healthfarm_hp_link_photo3.png', label: '聖母健康會館' },
        { href: 'http://www.healthclub.org.tw/fshm/', img: '/images/homepage/healthfarm_hp_link_photo4.png', label: '芳心好美館' }
      ]
    }
  },

  computed: {
    currentProducts() {
      const start = this.productPage * this.productPerPage
      return this.allProducts.slice(start, start + this.productPerPage)
    },
    totalProductPages() {
      return Math.ceil(this.allProducts.length / this.productPerPage)
    }
  },

  mounted() {
    window.addEventListener('scroll', this.handleScroll)
    this.startCoverSlider()
  },

  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll)
    clearInterval(this.coverTimer)
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
        const total = Math.max(this.mobileCovers.length, this.desktopCovers.length)
        this.coverIndex = (this.coverIndex + 1) % total
      }, 3500)
    },
    prevSlide() {
      this.productPage = (this.productPage - 1 + this.totalProductPages) % this.totalProductPages
    },
    nextSlide() {
      this.productPage = (this.productPage + 1) % this.totalProductPages
    },
    selectEvent(i) {
      this.eventIndex = i
    },
    getEventClass(i) {
      const total = this.eventPhotos.length
      const diff = ((i - this.eventIndex) % total + total) % total
      const centered = diff > total / 2 ? diff - total : diff
      const map = {
        '-3': 'hideLeft',
        '-2': 'prevLeftSecond',
        '-1': 'prev',
        '0': 'selected',
        '1': 'next',
        '2': 'nextRightSecond'
      }
      return map[String(centered)] || 'hideLeft'
    }
  }
}
</script>

<style scoped>
/* ─── Global resets ───────────────────────────────────────────────── */
* { box-sizing: border-box; }
.overflow { overflow-x: hidden; }
a { text-decoration: none; }
img { max-width: 100%; display: block; }
.por { position: relative; }

/* ─── Navbar ──────────────────────────────────────────────────────── */
.nav-shadow { box-shadow: 0 2px 8px rgba(0,0,0,.12); }
.nav { position: sticky; top: 0; z-index: 1000; background: #2a6935; }
.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
}
.mob-logo img { height: 40px; }
.navToggle { cursor: pointer; }
.navToggle .icon,
.navToggle .icon::before,
.navToggle .icon::after {
  display: block;
  width: 24px;
  height: 2px;
  background: #fff;
  transition: .3s;
}
.navToggle .icon { position: relative; }
.navToggle .icon::before,
.navToggle .icon::after {
  content: '';
  position: absolute;
}
.navToggle .icon::before { top: -7px; }
.navToggle .icon::after  { top:  7px; }
.navToggle .icon.active { background: transparent; }
.navToggle .icon.active::before { transform: rotate(45deg);  top: 0; }
.navToggle .icon.active::after  { transform: rotate(-45deg); top: 0; }

.vertical.menu {
  list-style: none;
  padding: 0 16px 16px;
  margin: 0;
  background: #2a6935;
}
.vertical.menu li a {
  display: block;
  color: #fff;
  padding: 10px 4px;
  font-size: 15px;
  border-bottom: 1px solid rgba(255,255,255,.15);
}

/* Desktop nav */
.d-nav { background: #fff !important; }
.d-logo img { height: 48px; }
.navbar-nav { display: flex; align-items: center; gap: 4px; }
.nav-box { position: relative; }
.nav-cus { font-size: 14px; padding: 8px 10px; color: #2a1001; font-weight: 500; }
.nav-line-mask { overflow: hidden; height: 2px; }
.nav-line-bar { height: 2px; background: #2a6935; transform: translateX(-100%); transition: transform .3s; }
.nav-box:hover .nav-line-bar { transform: translateX(0); }

/* ─── Cover Slider ────────────────────────────────────────────────── */
.cover-wrapper { position: relative; width: 100%; }
.homepage-cover { position: relative; width: 100%; overflow: hidden; }
.cover-slider { position: absolute; top: 0; left: 0; width: 100%; opacity: 0; transition: opacity 1s; }
.cover-slider.active { position: relative; opacity: 1; }
.sun { position: absolute; top: 20px; right: 40px; width: 80px; z-index: 5; }

/* ─── Intro ───────────────────────────────────────────────────────── */
.intro-title { max-width: 320px; }
.intro-text { font-size: 15px; line-height: 2; color: #44271a; margin-top: 16px; }
.hp-cloud1, .hp-cloud2, .hp-cloud3 {
  position: absolute;
  pointer-events: none;
}
.hp-cloud1 { top: 10px; left: -40px; width: 120px; }
.hp-cloud2 { top: -20px; right: 0; width: 100px; }
.hp-cloud3 { bottom: 0; left: 50%; width: 90px; }

/* ─── Four Features ───────────────────────────────────────────────── */
.bg-greenweb { background: #d4edda; }
.mob-four, .mob-four2 { margin-bottom: 12px; }
.cycle-title-top, .cycle-title-bottom { display: block; width: 80%; margin: 0 auto; }
.cycle-grass-top, .cycle-grass-bottom { display: block; width: 100%; }
.cycle-top-mask, .cycle-bottom-mask {
  width: 80%;
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  aspect-ratio: 1;
}
.cycle-top, .cycle-bottom { width: 100%; height: 100%; object-fit: cover; }

/* ─── News ────────────────────────────────────────────────────────── */
.feature-title { max-width: 260px; display: block; margin: 0 auto; }
.bar-green { height: 3px; background: #2a6935; }
.bar-green-center2 { margin: 0 auto; max-width: 80%; }
.ill-flowsers, .ill-flowsers-reverse { position: absolute; width: 100px; pointer-events: none; }
.ill-flowsers { right: 0; top: 0; }
.ill-flowsers-reverse { left: 0; top: 0; transform: scaleX(-1); }
.butterfly1, .butterfly2, .butterfly3 { position: absolute; pointer-events: none; }
.butterfly1 { width: 50px; top: 10px; left: 10%; }
.butterfly2 { width: 40px; top: -10px; right: 20%; }
.butterfly3 { width: 35px; top: 30px; right: 5%; }
.news-people { position: absolute; top: 0; left: 0; transform: translateY(-100%); max-width: 200px; }
.news-tape { position: absolute; top: -10px; right: 16px; width: 60px; }
.news-talk1 { position: absolute; top: 20px; right: 30%; }
.news-talk2 { position: absolute; top: 0; right: 10%; }
.news-date { color: #888; font-size: 13px; }
.bar-black-dashed { border-top: 1px dashed #ccc; }
.cus-button {
  background: #2a6935;
  border-radius: 4px;
  padding: 10px 32px;
}
.cus-button a { color: #fff; font-size: 14px; font-weight: 500; }
.news-photo { width: 100%; object-fit: cover; max-height: 200px; }

/* ─── Products ────────────────────────────────────────────────────── */
.mob-prod { overflow: hidden; }
.prod-text { font-size: 13px; color: #44271a; margin-top: 6px; }
.arrow-left2, .arrow-right2 { width: 28px; cursor: pointer; position: absolute; top: 50%; }
.arrow-left2 { left: -8px; transform: translateY(-50%) rotate(180deg); }
.arrow-right2 { right: -8px; transform: translateY(-50%); }

/* ─── Restaurant ──────────────────────────────────────────────────── */
.homepage-restaurant-p { font-size: 14px; line-height: 1.9; color: #44271a; }
.hp-restaurant-bg { display: block; width: 100%; }
.meal-line { position: absolute; bottom: 0; left: 0; width: 80px; transform: translate(200%, 40%) scale(.8); }
.meal-talk { position: absolute; left: 0; bottom: 0; transform: translate(-10%, 150%); width: 120px; }

/* ─── Events ──────────────────────────────────────────────────────── */
.ball { position: absolute; top: 0; left: 10px; width: 60px; }
.hotball { position: absolute; top: 40px; right: 20px; width: 80px; }
.bee { position: absolute; top: -30px; right: -20px; width: 50px; }

/* Mobile event slider */
.event-slider-mobile { overflow: hidden; position: relative; }
.event-slides-wrapper { display: flex; transition: transform .4s ease; }
.event-slide { min-width: 80%; margin: 0 10%; transition: transform .4s; }
.event-slide img { border-radius: 8px; }
.event-dots { display: flex; justify-content: center; gap: 8px; margin: 12px 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer; transition: background .3s; }
.dot.active { background: #2a6935; }

/* Desktop event coverflow */
.event-carousel-desktop {
  position: relative;
  height: 300px;
  overflow: visible;
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 800px;
}
.event-carousel-desktop > div {
  position: absolute;
  width: 240px;
  transition: transform .5s, opacity .5s, z-index 0s;
  cursor: pointer;
}
.event-carousel-desktop > div img { border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.15); }
.selected  { transform: translate3d(0,0,0); z-index: 5; opacity: 1; }
.prev      { transform: translate3d(-260px,0,-100px) rotateY(50deg); z-index: 3; opacity: .8; }
.next      { transform: translate3d( 260px,0,-100px) rotateY(-50deg); z-index: 3; opacity: .8; }
.prevLeftSecond { transform: translate3d(-460px,0,-200px) rotateY(60deg); z-index: 2; opacity: .5; }
.nextRightSecond{ transform: translate3d( 460px,0,-200px) rotateY(-60deg); z-index: 2; opacity: .5; }
.hideLeft  { transform: translate3d(-600px,0,-300px); z-index: 1; opacity: 0; }

/* ─── Partner links ───────────────────────────────────────────────── */
.hp-links-bg { background: #f7f3eb; }
.hp-note-bg { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.links-cover { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); width: 120px; pointer-events: none; }
.links-text { font-size: 13px; color: #44271a; margin-top: 8px; }

/* ─── Footer ──────────────────────────────────────────────────────── */
.footer-bg { background: url('/images/global/bg-footer.jpg') repeat; }
.footer-grass { position: absolute; bottom: 0; left: 0; width: 200px; }
.footer-fontSize { font-size: 13px; }
.footer-address { font-size: 13px; color: #555; line-height: 1.9; margin-top: 12px; }
.bar-straight-dotted { border-left: 2px dashed #ccc; }
.bar-waterDrop { height: 3px; background: linear-gradient(to right, #2a6935, transparent); border-radius: 4px; }

/* ─── Back-to-top ─────────────────────────────────────────────────── */
#myBtn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
  background: #2a6935;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  font-size: 16px;
  cursor: pointer;
}

/* ─── Bootstrap-like utilities (minimal) ─────────────────────────── */
.d-none         { display: none !important; }
.d-block        { display: block !important; }
.d-lg-none      { display: block; }
.d-lg-block     { display: none; }
.d-xl-none      { display: block; }
.d-xl-block     { display: none; }
.d-md-none      { display: block; }
.d-md-block     { display: none; }
@media (min-width: 768px) {
  .d-md-none    { display: none !important; }
  .d-md-block   { display: block !important; }
  .d-none.d-md-inline-block { display: inline-block !important; }
}
@media (min-width: 992px) {
  .d-lg-none    { display: none !important; }
  .d-lg-block   { display: block !important; }
  .d-none.d-lg-block { display: block !important; }
}
@media (min-width: 1200px) {
  .d-xl-none    { display: none !important; }
  .d-xl-block   { display: block !important; }
  .d-none.d-xl-block { display: block !important; }
}
.container { max-width: 1140px; margin: 0 auto; padding: 0 15px; }
.row { display: flex; flex-wrap: wrap; margin: 0 -15px; }
.row > * { padding: 0 15px; }
.col-12 { width: 100%; }
.col-10 { width: 83.333%; }
.col-8  { width: 66.667%; }
.col-6  { width: 50%; }
.col-5  { width: 41.667%; }
.col-3  { width: 25%; }
@media (min-width: 768px) {
  .col-md-3 { width: 25%; }
  .col-md-5 { width: 41.667%; }
  .col-md-6 { width: 50%; }
}
@media (min-width: 1200px) {
  .col-xl-3 { width: 25%; }
  .col-xl-8 { width: 66.667%; }
  .col-xl-1 { width: 8.333%; }
}
.text-center   { text-align: center; }
.text-white    { color: #fff; }
.bg-white      { background: #fff; }
.rounded       { border-radius: 8px; }
.justify-content-center { justify-content: center; }
.justify-content-around  { justify-content: space-around; }
.align-self-center       { align-self: center; }
.align-items-center      { align-items: center; }
.no-gutters { margin: 0; }
.no-gutters > * { padding: 0; }
.img-fluid { width: 100%; height: auto; }
.mx-auto { margin-left: auto; margin-right: auto; }
.my-2   { margin-top: .5rem; margin-bottom: .5rem; }
.my-3   { margin-top: 1rem; margin-bottom: 1rem; }
.mt-2   { margin-top: .5rem; }
.mt-4   { margin-top: 1.5rem; }
.mt-5   { margin-top: 3rem; }
.mb-5   { margin-bottom: 3rem; }
.mb-2   { margin-bottom: .5rem; }
.pb-5   { padding-bottom: 3rem; }
.pb-3   { padding-bottom: 1rem; }
.pt-2   { padding-top: .5rem; }
.pt-3   { padding-top: 1rem; }
.pt-4   { padding-top: 1.5rem; }
.pt-5   { padding-top: 3rem; }
.py-2   { padding-top: .5rem; padding-bottom: .5rem; }
.py-3   { padding-top: 1rem; padding-bottom: 1rem; }
.py-4   { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.py-5   { padding-top: 3rem; padding-bottom: 3rem; }
.px-2   { padding-left: .5rem; padding-right: .5rem; }
.px-3   { padding-left: 1rem; padding-right: 1rem; }
.px-4   { padding-left: 1.5rem; padding-right: 1.5rem; }
.px-5   { padding-left: 3rem; padding-right: 3rem; }
.p-4    { padding: 1.5rem; }
.p-5    { padding: 3rem; }
.pl-5   { padding-left: 3rem; }
.ml-3   { margin-left: 1rem; }
.mr-3   { margin-right: 1rem; }
.mr-4   { margin-right: 1.5rem; }
.mr-5   { margin-right: 3rem; }
.mx-3   { margin-left: 1rem; margin-right: 1rem; }
.mx-4   { margin-left: 1.5rem; margin-right: 1.5rem; }
.mx-5   { margin-left: 3rem; margin-right: 3rem; }
.nopadding { padding: 0; margin: 0; }
.btn { display: inline-block; cursor: pointer; }
</style>
