<!-- 共用 Hero 元件：全寬照片 + 右側漢字標題卡 + 麵包屑 -->
<template>
  <div>
    <!-- Hero -->
    <div class="hero-wrapper">
      <img :src="cover" :alt="title" class="hero-bg">
      <!-- 右側標題卡 -->
      <div class="hero-title-card">
        <span class="hero-title-text">{{ title }}</span>
      </div>
      <!-- 波浪底部 -->
      <div class="hero-wave">
        <svg viewBox="0 0 1440 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%; display:block;">
          <path d="M0 36 C240 8 480 0 720 12 C960 24 1200 8 1440 0 L1440 36 Z" fill="#f5f0e8"/>
        </svg>
      </div>
    </div>

    <!-- 麵包屑 -->
    <div class="container">
      <nav class="hero-breadcrumb">
        <NuxtLink to="/">首頁</NuxtLink>
        <span class="mx-1">›</span>
        <span>{{ title }}</span>
      </nav>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cover: { type: String, required: true },
  title: { type: String, required: true },
})
</script>

<style scoped>
.hero-wrapper {
  position: relative;
  width: 100%;
  height: 220px;
  overflow: hidden;
}

@media (min-width: 576px) {
  .hero-wrapper {
    height: 288px;
  }
}

.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-title-card {
  position: absolute;
  top: 50%;
  right: 5%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  background-color: rgba(255, 252, 245, 0.82);
  writing-mode: vertical-rl;
  letter-spacing: 0.25em;
  min-height: 140px;
  min-width: 80px;
}

@media (min-width: 576px) {
  .hero-title-card {
    right: 10%;
  }
}

.hero-title-text {
  font-weight: 700;
  font-size: 2.4rem;
  line-height: 1.2;
  color: #3a3228;
}

.hero-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.hero-breadcrumb {
  padding: 6px 0;
  font-size: 13px;
  color: #aaa;
}

.hero-breadcrumb a {
  color: #aaa;
  text-decoration: none;
  transition: color 0.15s;
}

.hero-breadcrumb a:hover {
  color: #1FC29C;
}

.hero-breadcrumb span:last-child {
  color: #666;
}
</style>
