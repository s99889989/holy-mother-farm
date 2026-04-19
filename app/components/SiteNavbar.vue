<script setup>
const isOpen = ref(false)
const route = useRoute()

// 換頁時自動關閉選單
watch(() => route.path, () => {
  isOpen.value = false
})

function toggleMenu() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <!-- Mobile / Pad Navbar -->
  <nav
      class="nav d-xl-none nav-shadow"
      :class="{ open: isOpen }"
      style="background: url(/images/global/nav-bg.png);"
  >
    <div class="nav-header">
      <div class="navLogo">
        <NuxtLink class="navbar-brand mob-logo" to="/front/public">
          <img src="/images/global/healthfarm_logo.png" alt="聖母健康農莊">
        </NuxtLink>
      </div>
      <div class="navToggle" :class="{ open: isOpen }" @click="toggleMenu">
        <div class="icon"></div>
      </div>
    </div>
    <ul
        id="menu-menu-principale-1"
        class="vertical menu por"
        role="menu"
        aria-multiselectable="true"
    >
      <li>
        <NuxtLink to="/front/public">首頁</NuxtLink>
        <span>
          <a href="https://www.facebook.com/st.maryhealthfarm/" target="_blank">
            <i class="fab fa-facebook-square" style="transform: scale(1.3) translateX(200%); color:#fff"></i>
          </a>
        </span>
        <span>
          <a href="mailto:healthfarm@st-mary.com.tw">
            <i class="fas fa-envelope" style="transform: scale(1.3) translateX(250%); color:#fff"></i>
          </a>
        </span>
      </li>
      <li id="mob-menu">
        <NuxtLink to="/front/news">最新消息</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/front/about">關於我們</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/front/production">產品訂購</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/front/event">活動報名</NuxtLink>
      </li>
      <li role="menuitem">
        <NuxtLink to="/front/restaurant">田園餐廳</NuxtLink>
      </li>
      <li role="menuitem">
        <NuxtLink to="/front/cafe">休憩小舖</NuxtLink>
      </li>
      <li role="menuitem">
        <NuxtLink to="/front/access">交通方式</NuxtLink>
      </li>
      <div class="por">
        <img src="/images/homepage/healthfarm_hp_ill_cloud1.png" class="nav-cloud1">
        <img src="/images/homepage/healthfarm_hp_ill_cloud2.png" class="nav-cloud2">
        <img src="/images/homepage/healthfarm_hp_ill_cloud3.png" alt="" class="nav-cloud3">
      </div>
      <div class="col-10 col-sm-8 mx-auto">
        <img src="/images/homepage/healthfarm_hp_news_people.png" class="mob-nav-people img-fluid">
      </div>
    </ul>
  </nav>

  <!-- Desktop Navbar -->
  <div class="d-none d-xl-block">
    <nav class="navbar navbar-expand-xl navbar-light bg-light nav-shadow d-nav" id="navbar">
      <div class="container">
        <div class="col-xl-3 align-middle pl-5">
          <NuxtLink class="navbar-brand d-logo" to="/front/public">
            <img src="/images/global/healthfarm_logo.png" alt="聖母健康農莊">
          </NuxtLink>
        </div>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavAltMarkup"
                aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="d-none d-xl-inline-block col-xl-1"></div>
        <div class="collapse navbar-collapse col-xl-8" id="navbarNavAltMarkup">
          <div class="navbar-nav">
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/news" style="color:#2a1001; font-weight: 500;">最新消息
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/about" style="color:#2a1001; font-weight: 500;">
                關於我們
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/production" style="color:#2a1001; font-weight: 500;">
                產品訂購
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/event" style="color:#2a1001; font-weight: 500;">
                活動報名
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/restaurant" style="color:#2a1001; font-weight: 500;">
                田園餐廳
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/cafe" style="color:#2a1001; font-weight: 500;">休憩小舖
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
            <div class="nav-box mr-lg-3">
              <NuxtLink class="nav-item nav-link nav-cus" to="/front/access" style="color:#2a1001; font-weight: 500;">
                交通方式
              </NuxtLink>
              <div class="nav-line-mask">
                <div class="nav-line-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>