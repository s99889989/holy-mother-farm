<template>
  <div class="pt-20">

    <!-- ══ Page Hero ══ -->
    <section class="relative h-56 sm:h-72 overflow-hidden flex items-end">
      <img src="/images/about/about-cover.png" alt="關於我們" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 pb-10 w-full">
        <p class="text-green-300 text-xs font-semibold tracking-widest uppercase mb-1">About Us</p>
        <h1 class="text-3xl sm:text-4xl font-bold text-white">關於我們</h1>
      </div>
    </section>

    <!-- ══ 理念 ══ -->
    <section class="py-16 sm:py-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-3">我們的理念</p>
          <h2 class="text-2xl sm:text-3xl font-bold text-stone-800 mb-5 leading-snug">
            以土地為師<br>以自然為家
          </h2>
          <p class="text-stone-500 leading-relaxed mb-4">
            聖母健康農莊由修道院修女們於台東鹿野創立，結合信仰精神與有機農業，
            致力於提供一個讓人身心靈都能得到滋養的場所。
          </p>
          <p class="text-stone-500 leading-relaxed">
            我們相信，當人與土地建立真實的連結，才能找到真正的健康與平靜。
            農莊的每一份食材、每一片土地，都承載著我們對這份使命的堅持。
          </p>
        </div>
        <div>
          <img
            src="/images/about/about-purpose-photo.png"
            alt="農莊理念"
            class="rounded-3xl w-full object-cover shadow-lg"
          />
        </div>
      </div>
    </section>

    <!-- ══ 歷史時間軸（佔位，之後填真實資料） ══ -->
    <section class="py-16 bg-stone-50">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-2">歷史沿革</p>
          <h2 class="text-2xl sm:text-3xl font-bold text-stone-800">走過的每一步</h2>
        </div>
        <div class="relative">
          <!-- 中心線 -->
          <div class="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-green-200 -translate-x-px sm:-translate-x-1/2" />
          <div class="space-y-10">
            <div
              v-for="(event, idx) in history"
              :key="event.year"
              class="relative flex gap-6 sm:gap-0"
              :class="idx % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'"
            >
              <!-- 圓點 -->
              <div class="absolute left-4 sm:left-1/2 w-3 h-3 rounded-full bg-green-600 border-2 border-white shadow -translate-x-1.5 sm:-translate-x-1.5 top-1.5" />
              <!-- 內容卡片 -->
              <div
                class="ml-10 sm:ml-0 sm:w-[45%] bg-white rounded-2xl p-5 shadow-sm"
                :class="idx % 2 === 0 ? 'sm:mr-auto sm:ml-0 sm:pr-6' : 'sm:ml-auto sm:mr-0 sm:pl-6'"
              >
                <span class="text-xs font-bold text-green-600 tracking-widest">{{ event.year }}</span>
                <h3 class="font-bold text-stone-800 mt-1 mb-1">{{ event.title }}</h3>
                <p class="text-sm text-stone-500 leading-relaxed">{{ event.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 合作夥伴（佔位） ══ -->
    <section class="py-16 sm:py-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-2">合作單位</p>
        <h2 class="text-2xl font-bold text-stone-800 mb-10">攜手同行的夥伴</h2>
        <div class="flex flex-wrap justify-center items-center gap-8 opacity-70">
          <img v-for="n in 5" :key="n"
            :src="`/images/about/healthfarm_about_partner_photo${n}.png`"
            :alt="`合作夥伴 ${n}`"
            class="h-12 w-auto object-contain grayscale hover:grayscale-0 transition-all"
          />
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'site' })

const history = [
  { year: '創立初期', title: '農莊成立', desc: '修道院修女們在台東鹿野開墾土地，以信仰與雙手建立這片農場。' },
  { year: '發展期', title: '有機轉型', desc: '全面轉型為有機農業，導入自然農法，守護土地的永續生命力。' },
  { year: '近年', title: '對外開放', desc: '開始接待訪客，提供餐飲、住宿與農事體驗，讓更多人認識健康生活。' },
]
</script>
