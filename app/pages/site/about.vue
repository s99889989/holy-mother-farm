<template>
  <div>
    <SitePageHero cover="/images/about/about-cover.png" title="關於我們" />

    <!-- ══ 分頁 Tab ══ -->
    <div class="max-w-4xl mx-auto px-4 mt-4 mb-0">
      <div class="flex gap-0 border-b-2" style="border-color: #e0d8cc;">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          class="px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-0.5"
          :style="activeTab === tab.key
            ? 'color: #5bbfbf; border-color: #5bbfbf;'
            : 'color: #888; border-color: transparent;'">
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ══ 內容卡 ══ -->
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="rounded-2xl border-2 border-dashed p-6 sm:p-8" style="border-color: #b8d8d0; background-color: #fff;">

        <!-- Tab 1：農莊歷史與理念實踐 -->
        <div v-if="activeTab === 'history'">
          <h2 class="text-lg font-bold mb-3" style="color: #5bbfbf;">農莊歷史</h2>
          <p class="text-sm text-gray-600 leading-relaxed mb-6">
            「2009年，八八風災重創台灣，台東災情嚴重，天主教花蓮教區黃兆明主教在第一時間緊急指示，台東各天主教團體聯合組成「天主教花蓮教區88水災救災及重建行動小組」，由台東聖母醫院陳良娟院長擔任總幹事，推行整體救災知識事宜及相關重建工作。」
          </p>
          <div class="grid grid-cols-2 gap-3 mb-6">
            <img src="/images/about/about-history-photo1.jpg" alt="農莊歷史" class="rounded-xl w-full object-cover aspect-video" />
            <img src="/images/about/about-history-photo2.jpg" alt="農莊歷史" class="rounded-xl w-full object-cover aspect-video" />
          </div>
          <p class="text-sm text-gray-600 leading-relaxed mb-6">
            在台東聖母醫院健康促進推廣輔導下，聖母健康農莊完成有機認證、種植健康蔬果，營造優美景觀、打造心靈花園、邀請社區民眾及失業家庭居民共同參與、創造鄰里工作機會，強調從土壤到餐桌都是健康的理念，提供一般民眾及銀子們可以觀察力親為的田園活動中，找回與大自然相處的美好；開啟了聖母健康農莊在台灣較下從無到有的獨屬序曲。
          </p>
          <div class="grid grid-cols-2 gap-3 mb-6">
            <img src="/images/about/healthfarm_about_history_photo10.jpg" alt="農莊歷史" class="rounded-xl w-full object-cover aspect-video" />
            <img src="/images/about/healthfarm_about_history_photo11.jpg" alt="農莊歷史" class="rounded-xl w-full object-cover aspect-video" />
          </div>
          <p class="text-sm text-gray-600 leading-relaxed mb-6">
            2018年4月聖母健康農莊遷移至位於台東區職訓中心的現址，轉型農齡友善的綠色照護農場，發揮聖母醫院長照專業，更以多年來的綠色農場經驗，涵新家打造成台東服健農新樂園。
          </p>
          <div class="grid grid-cols-2 gap-3 mb-8">
            <img src="/images/about/healthfarm_about_history_photo13.jpg" alt="農莊歷史" class="rounded-xl w-full object-cover aspect-video" />
            <img src="/images/about/healthfarm_about_history_photo14.jpg" alt="農莊歷史" class="rounded-xl w-full object-cover aspect-video" />
          </div>

          <h2 class="text-lg font-bold mb-3 mt-8" style="color: #5bbfbf;">理念實踐</h2>
          <p class="text-sm text-gray-600 leading-relaxed mb-4">
            聖母健康農莊主張導重自然，體驗從「土壤到餐桌的愛」，各項飲食及產品，優先使用農莊自產有機蔬菜及在地安全食材，提供安全美味的健康飲食。
          </p>
          <div class="bg-teal-50 border-l-4 border-teal-400 px-4 py-3 rounded-r-xl mb-4">
            <p class="text-sm text-teal-700 font-medium">我們的餐食以「多蔬少肉、多種好油、不油炸、不添加品」的健康飲食；</p>
          </div>
          <p class="text-sm text-gray-600 leading-relaxed">
            遵用當地食材，也積極與部落及有機小農合作，輔導提供安全的食材（如放山雞蛋及自產有機蔬果），透過共同合作，幫助能夠動部落與小農朝向安全有機發展，而帶動地方健康農業發展。
          </p>
        </div>

        <!-- Tab 2：服務宗旨 -->
        <div v-if="activeTab === 'mission'">
          <h2 class="text-lg font-bold mb-4" style="color: #5bbfbf;">服務宗旨</h2>
          <p class="text-sm text-gray-600 leading-relaxed">
            在綠色之愛的理念下，發展樂智農藝的原力環境、充滿愛與能量的天使花園、透過五感體驗找回在迷愛的療癒森林、充滿自然療癒的聖草德香藥草花園、以及靜嘉自我的中密花園。園區內還設有田園餐廳提供健康餐飲、休憩小舖提供咖啡飲及體適能促進中心浴健服務助力老化。
          </p>
        </div>

        <!-- Tab 3：健康務件 -->
        <div v-if="activeTab === 'health'">
          <h2 class="text-lg font-bold mb-4" style="color: #5bbfbf;">健康務件</h2>
          <p class="text-sm text-gray-600 leading-relaxed">
            聖母健康農莊提供多元健康服務，包括農事體驗、草藥認識課程、健康飲食指導等，歡迎個人、家庭及團體預約參觀。
          </p>
        </div>

      </div>
    </div>

    <!-- 回首頁 -->
    <div class="text-center pb-12">
      <NuxtLink to="/site"
        class="inline-block px-8 py-3 rounded-full text-sm font-medium text-white"
        style="background-color: #5bbfbf;">
        回聖母健康農莊首頁
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
definePageMeta({ layout: 'site' })

const activeTab = ref('history')
const tabs = [
  { key: 'history', label: '農莊歷史與理念實踐' },
  { key: 'mission', label: '服務宗旨' },
  { key: 'health',  label: '健康務件' },
]
</script>
