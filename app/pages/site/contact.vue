<template>
  <div class="pt-20">

    <!-- ══ Page Hero ══ -->
    <section class="relative h-56 sm:h-72 overflow-hidden flex items-end">
      <img src="/images/access/access-cover.png" alt="交通資訊" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 pb-10 w-full">
        <p class="text-green-300 text-xs font-semibold tracking-widest uppercase mb-1">Access & Contact</p>
        <h1 class="text-3xl sm:text-4xl font-bold text-white">交通與聯絡</h1>
      </div>
    </section>

    <!-- ══ 聯絡資訊 ══ -->
    <section class="py-16 sm:py-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">

        <!-- 左：資訊 -->
        <div>
          <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-3">聯絡我們</p>
          <h2 class="text-2xl sm:text-3xl font-bold text-stone-800 mb-8">隨時歡迎您到訪</h2>

          <div class="space-y-6">
            <div
              v-for="item in contactItems"
              :key="item.label"
              class="flex items-start gap-4"
            >
              <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <span class="text-xl">{{ item.icon }}</span>
              </div>
              <div>
                <p class="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-0.5">{{ item.label }}</p>
                <p class="text-stone-700 font-medium">{{ item.value }}</p>
                <p v-if="item.sub" class="text-sm text-stone-400 mt-0.5">{{ item.sub }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 右：地圖（嵌入 Google Maps） -->
        <div class="rounded-3xl overflow-hidden shadow-lg h-80 lg:h-auto bg-stone-100 flex items-center justify-center">
          <!-- 替換成你們農莊的實際座標 -->
          <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3679.1123161180503!2d121.09173577534693!3d22.761212726031047!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x346fb7fdd7894785%3A0x3fe49cdb9bca43c1!2z5Y-w5p2x6IGW5q-N5YGl5bq36L6y6I6K!5e0!3m2!1szh-TW!2stw!4v1776220721026!5m2!1szh-TW!2stw" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    </section>

    <!-- ══ 交通方式 ══ -->
    <section class="py-16 bg-stone-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-10">
          <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-2">如何抵達</p>
          <h2 class="text-2xl font-bold text-stone-800">交通資訊</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div
            v-for="transport in transportMethods"
            :key="transport.type"
            class="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div class="text-3xl mb-3">{{ transport.icon }}</div>
            <h3 class="font-bold text-stone-800 mb-2">{{ transport.type }}</h3>
            <p class="text-sm text-stone-500 leading-relaxed">{{ transport.desc }}</p>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'site' })

const contactItems = [
  { icon: '📍', label: '地址', value: '台東縣鹿野鄉永安村', sub: '（詳細地址請補充）' },
  { icon: '📞', label: '電話', value: '(089) 000-000' },
  { icon: '⏰', label: '開放時間', value: '每日 08:00 – 18:00', sub: '用餐需提前預約' },
  { icon: '✉️', label: 'Email', value: 'info@holymotherfarm.org' },
]

const transportMethods = [
  {
    icon: '🚗',
    type: '自行開車',
    desc: '國道三號下關山交流道，往鹿野方向，沿指標行駛約 XX 分鐘可達。',
  },
  {
    icon: '🚂',
    type: '火車',
    desc: '搭乘台鐵至鹿野站下車，可預約農莊接駁，或搭乘計程車約 XX 分鐘。',
  },
  {
    icon: '🚌',
    type: '客運',
    desc: '台東市區搭乘往鹿野方向客運，在 XX 站下車後步行 XX 分鐘。',
  },
]
</script>
