<script setup>
useSiteHead()

// HTML 標籤轉純文字
function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
const route = useRoute()
const latestYear = new Date().getFullYear()   // 今年，上限
const selectedYear = computed(() => Number(route.query.year) || latestYear)
const prevYear = computed(() => selectedYear.value - 1)

// ---- 模擬資料（之後替換成 API 呼叫） ----
const allNews = ref([
  {
    id: '7756471d-2e3a-4d88-8744-35baff74ec46',
    image: '/images/news/example/7756471d-2e3a-4d88-8744-35baff74ec46.jpeg',
    createdAt: '2026-04-16',
    title: '親手製作一個「修女祈福蛋糕」~獻給媽媽~',
    parseHtml: ''
  },
  {
    id: '44d46a8b-554e-43ea-a292-113b02dd7bbd',
    image: '/images/news/example/44d46a8b-554e-43ea-a292-113b02dd7bbd.png',
    createdAt: '2026-03-30',
    title: '大地的孩子:聖母健康農莊探索體驗營',
    parseHtml: `
      <p>🌿 2026 聖母健康農莊「探索體驗營」報名開跑！</p>
      <p>讓孩子回到土地，成為大地的孩子，寫下難忘的生命印記！</p>
      <h5>【活動亮點】</h5>
      <p>五大任務： 認識土地、料理達人、自然偵探、合作隊長、健康生活家。<br>
      豐富行程： 走讀農莊、烘焙手作、樹冠層體驗、原民風味餐、夜間觀察。</p>
      <h5>【活動資訊】</h5>
      <p>
        日期： 2026/7/9 (四) ～ 7/12 (日)<br>
        對象： 新學期升四至升七年級學生（限額 20 位）<br>
        地點： 台東聖母健康農莊（台東市博物館路110號）<br>
        費用： 6,800元
      </p>
      <p>
        💰 早鳥優惠： 6/1 前報名享 5,500元。<br>
        👭 兩人同行： 一起報名不須早鳥亦享 5,500元/人。
      </p>
      <h5>【家長重要提醒】</h5>
      <p>
        成果發表： 7/12 (日) 12:00 歡迎家長參與午宴及發表會。<br>
        交通接駁： 提供 7/9 報到及 7/12 賦歸之台東火車站/機場接駁。
      </p>
      <p>🔗 立即線上報名：<br>
        👉 <a href="https://www.beclass.com/rid=30525d169a92635ec349" target="_blank">https://www.beclass.com/rid=30525d169a92635ec349</a>
      </p>
      <p>📞 活動諮詢： 0937-652654 王主任</p>
      <p>✨ 邀請孩子走進自然，體驗從農田到餐桌的真實感動！ ✨</p>
    `
  }
])

// 依年份篩選
const newsList = computed(() =>
    allNews.value.filter(n => n.createdAt.startsWith(String(selectedYear.value)))
)

// ---- scroll-to-top ----
onMounted(() => {
  window.onscroll = () => {
    const btn = document.getElementById('myBtn')
    if (btn) {
      btn.style.display =
          document.body.scrollTop > 20 || document.documentElement.scrollTop > 20
              ? 'block'
              : 'none'
    }
  }
})

function topFunction() {
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
}
</script>

<template>
  <div class="overflow">
    <SiteNavbar />

    <!-- Cover -->
    <section>
      <div class="cover-box">
        <img class="img-fluid d-md-none mob-cover" src="/images/news/mb-news-cover.png" alt="">
        <img class="img-fluid d-none d-md-inline-block mob-cover" src="/images/news/news-cover.png" alt="">
        <img class="cover-title" src="/images/news/news-title.png" alt="">
      </div>
    </section>

    <div class="container">
      <!-- Breadcrumb -->
      <section id="breadcrumb" class="my-1 mx-3 mx-sm-5">
        <NuxtLink to="/front/public">首頁</NuxtLink> > 最新消息
      </section>

      <section id="content" class="mx-3 mx-sm-5">
        <!-- 年份 Tab -->
        <div class="col-12 text-center my-3">
          <div class="row justify-content-center no-gutters">
            <div class="sub-nav nav text-center align-items-center row justify-content-center" id="nav-tab" role="tablist">
              <!-- 往後一年（未到今年才顯示） -->
              <template v-if="selectedYear < latestYear">
                <NuxtLink
                    class="nav-item nav-link tab-link"
                    :to="`/front/news?year=${selectedYear + 1}`"
                >{{ selectedYear + 1 }}</NuxtLink>
                |
              </template>
              <!-- 當前選中年份 -->
              <span class="nav-item nav-link tab-link active">{{ selectedYear }}</span>
              |
              <!-- 往前一年（永遠顯示） -->
              <NuxtLink
                  class="nav-item nav-link tab-link"
                  :to="`/front/news?year=${prevYear}`"
              >{{ prevYear }}</NuxtLink>
            </div>
          </div>
        </div>

        <div class="bar-green bar-green-center"></div>
        <div class="row bg-greenweb py-5 px-sm-2">
          <div class="col-12 px-sm-4">
            <div class="row justify-content-center no-gutters">
              <div class="col-12 rounded bg-lightGreen py-3 px-sm-5">

                <!-- 無資料提示 -->
                <div v-if="newsList.length === 0" class="text-center py-5 text-muted">
                  本年度尚無消息
                </div>

                <!-- 消息卡片 -->
                <template v-else>
                  <div v-for="record in newsList" :key="record.id" class="row px-2 py-4 p-lg-4 no-gutters">
                    <!-- 圖片 -->
                    <div class="col-5 col-lg-4 text-center mt-2 mt-sm-0">
                      <div class="img-frame mr-3">
                        <img :src="record.image" alt="" class="img-fluid">
                      </div>
                    </div>
                    <!-- 文字 -->
                    <div class="col-7 col-lg-8 pl-sm-3">
                      <div class="row">
                        <div class="col-12 news-date">{{ record.createdAt }}</div>
                        <div class="col-12 news-title">
                          <div class="news-title-ellipsis">{{ record.title }}</div>
                        </div>
                        <div class="col-12 text-center">
                          <div class="col-12 news-divider my-2"></div>
                        </div>
                        <div class="col-12 news-summary-ellipsis">
                          <p style="margin-bottom: 0;">{{ stripHtml(record.parseHtml) }}</p>
                        </div>
                        <div class="col-12">
                          <div class="more-button text-right">
                            <NuxtLink :to="`/front/news/${record.id}`">更 多</NuxtLink>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-12 bar-black-dashed my-3"></div>
                  </div>
                </template>

              </div>
            </div>
          </div>
        </div>
        <div class="bar-green bar-green-center2"></div>
      </section>
    </div>

    <div class="container">
      <div class="col-12 col-md-12 text-center my-5">
        <div class="btn col-md-6 cus-button">
          <NuxtLink to="/front/public">回聖母健康農莊首頁</NuxtLink>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="bar-waterDrop mt-5 mx-lg-5"></div>
    </div>

    <SiteFooter />

    <button @click="topFunction" id="myBtn" title="Go to top" class="d-lg-none">
      <i class="fas fa-chevron-up"></i>
    </button>
  </div>
</template>

<style lang="scss">
@import '~/assets/scss/all';
</style>