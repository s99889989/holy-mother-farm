<template>
  <div>
    <!-- Cover -->
    <section class="relative">
      <img class="w-full md:hidden" src="/images/about/mobile-about-cover.png" alt="">
      <img class="w-full hidden md:block" src="/images/about/about-cover.png" alt="">
      <img class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 md:w-52"
        src="/images/about/about-title.png" alt="關於我們">
    </section>

    <div class="max-w-4xl mx-auto px-6 py-4">
      <!-- 麵包屑 -->
      <nav class="text-sm text-gray-500 mb-4">
        <NuxtLink to="/site" class="hover:text-[#5a8a3c] transition-colors">首頁</NuxtLink>
        <span class="mx-1">›</span>
        <span class="text-gray-700">關於我們</span>
      </nav>

      <!-- Tab 切換 -->
      <div class="flex flex-wrap justify-center gap-1 mb-4">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
          class="px-3 py-1.5 text-sm font-medium rounded-full border transition-colors"
          :class="activeTab === tab.id
            ? 'bg-[#5a8a3c] text-white border-[#5a8a3c]'
            : 'border-[#5a8a3c] text-[#5a8a3c] hover:bg-[#5a8a3c] hover:text-white'">
          {{ tab.label }}
        </button>
      </div>

      <div class="h-1 bg-[#5a8a3c] rounded mb-1"></div>
      <div class="bg-[#e8f0d8] py-6 px-2">
        <div class="bg-[#d4e6b5] rounded-xl py-6 px-4 md:px-8">

          <!-- 農莊歷史與理念實踐 -->
          <div v-show="activeTab === 'history'">
            <h3 class="text-[#5a8a3c] font-bold text-base border-l-4 border-[#5a8a3c] pl-3 mb-4">農莊歷史</h3>
            <p class="text-gray-700 leading-9 text-sm mb-5">「2009年，八八風災重創台灣，台東災情嚴重，天主教花蓮教區黃兆明主教在第一時間緊急指示，台東各天主教團體聯合組成「天主教花蓮教區88水災救災及重建行動小組」，由台東聖母醫院陳良娟院長擔任總幹事，進行整體救災協調事宜及相關重建工作。</p>
            <div class="grid grid-cols-3 gap-2 mb-5">
              <img src="/images/about/about-history-photo1.jpg" class="rounded-lg w-full" alt="">
              <img src="/images/about/about-history-photo2.jpg" class="rounded-lg w-full" alt="">
              <img src="/images/about/about-history-photo3.jpg" class="rounded-lg w-full" alt="">
            </div>
            <p class="text-gray-700 leading-9 text-sm mb-5">在台東聖母醫院健康促進團隊輔導下，聖母健康農莊完成有機認證、種植健康蔬果，營造優美景觀、打造心靈花園，邀請災區民眾及失業原住民共同開墾，創造留鄉工作機會，強調從土壤到餐桌都要健康的理念，提供一般民眾及孩子們可以從親力親為的田園活動中，找回與大自然相處的美好；開啟了聖母健康農莊在東台灣寫下從無到有的瑰麗序曲。</p>
            <div class="grid grid-cols-2 gap-2 mb-5 max-w-md mx-auto">
              <img src="/images/about/about-history-photo4.jpg" class="rounded-lg w-full" alt="">
              <img src="/images/about/about_history_photo5.jpg" class="rounded-lg w-full" alt="">
            </div>
            <p class="text-gray-700 leading-9 text-sm mb-5">2018年4月聖母健康農莊喬遷至位於東區職訓中心的現址，轉型高齡友善的綠色照護園區，發揮聖母醫院長照專長，更以多年來的綠色墾殖經驗，將新家打造成台東銀髮健康新樂園。</p>
            <div class="grid grid-cols-2 gap-2 mb-5 max-w-md mx-auto">
              <img src="/images/about/healthfarm_about_history_photo10.jpg" class="rounded-lg w-full" alt="">
              <img src="/images/about/healthfarm_about_history_photo11.jpg" class="rounded-lg w-full" alt="">
            </div>
            <p class="text-gray-700 leading-9 text-sm mb-5">在綠色之愛的理念下，發展樂智農藝的原力廣場、充滿愛與能量的天使花園、透過五感體驗找回內在感覺的療癒森林、充滿自然療癒力的聖賀德佳香藥草花園、以及靜觀自得的中庭花園。園區內還設有田園餐廳提供健康餐飲、休憩小舖提供咖啡茶飲及體適能促進中心強健體能預防老化。</p>
            <div class="grid grid-cols-2 gap-2 mb-8 max-w-md mx-auto">
              <img src="/images/about/healthfarm_about_history_photo13.jpg" class="rounded-lg w-full" alt="">
              <img src="/images/about/healthfarm_about_history_photo14.jpg" class="rounded-lg w-full" alt="">
            </div>

            <h3 class="text-[#5a8a3c] font-bold text-base border-l-4 border-[#5a8a3c] pl-3 mb-4 mt-4">理念實踐</h3>
            <div class="md:flex gap-6 items-start">
              <div class="md:flex-1 space-y-4 text-sm text-gray-700 leading-9">
                <p>聖母健康農莊主張尊重自然，吃出原味，體會從「土壤到餐桌的愛」，各項餐飲及產品，優先使用農莊自產有機蔬菜及在地安全食材，提供安全美味的健康飲食。</p>
                <p>◎我們的餐食以<span class="text-[#5a8a3c] font-semibold">「多蔬少肉、多纖好油、不油炸、不使用添加品」</span>的健康飲食；運用當地、當季食材，由專業營養師設計菜色，研發味美好吃、營養健康的料理。</p>
                <p>◎健康由安全飲食出發，我們希望能成為民眾健康的促進者，除提供安全的飲食外，也積極與部落及有機小農合作，輔導提供安全的食材，透過共同合作，期盼能帶動部落與小農朝向安全有機發展，而帶動地方健康產業發展。</p>
              </div>
              <div class="md:w-48 mt-4 md:mt-0 flex-shrink-0">
                <img src="/images/about/about_history_photo8.png" class="rounded-lg w-full" alt="">
              </div>
            </div>
          </div>

          <!-- 服務宗旨 -->
          <div v-show="activeTab === 'purpose'">
            <h3 class="text-[#5a8a3c] font-bold text-base border-l-4 border-[#5a8a3c] pl-3 mb-4">服務宗旨</h3>
            <div class="md:flex gap-6 items-center">
              <div class="md:flex-1 text-sm text-gray-700 leading-9 space-y-3">
                <p>農莊以「健康、有機、自然」為核心價值，致力推廣健康生活方式，服務社區與部落，落實從土壤到餐桌的健康理念。</p>
                <p>我們相信每個人都有權利享有安全、美味、營養的食物，並透過農業教育、體驗活動與社區合作，讓更多人了解健康飲食的重要性。</p>
              </div>
              <div class="md:w-56 mt-4 md:mt-0 flex-shrink-0">
                <img src="/images/about/about-purpose-photo.png" class="rounded-lg w-full" alt="">
              </div>
            </div>
          </div>

          <!-- 健康夥伴 -->
          <div v-show="activeTab === 'partner'">
            <h3 class="text-[#5a8a3c] font-bold text-base border-l-4 border-[#5a8a3c] pl-3 mb-6">健康夥伴</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div v-for="p in partners" :key="p.name" class="border-b border-dashed border-gray-300 pb-6 last:border-0">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-3 h-3 rounded-full bg-[#5a8a3c] flex-shrink-0"></div>
                  <h4 class="text-[#5a8a3c] font-bold">{{ p.name }}</h4>
                </div>
                <img :src="p.img" class="w-full rounded-lg mb-3" :alt="p.name">
                <p class="text-[#5a8a3c] text-sm font-medium mb-1">{{ p.subtitle }}</p>
                <p class="text-gray-600 text-sm leading-7">{{ p.desc }}</p>
                <div v-if="p.address" class="mt-2 text-xs text-gray-500 space-y-0.5">
                  <p>地址：{{ p.address }}</p>
                  <p>電話：{{ p.phone }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 法定公開揭露事項 -->
          <div v-show="activeTab === 'gov'">
            <h3 class="text-[#5a8a3c] font-bold text-base border-l-4 border-[#5a8a3c] pl-3 mb-4">法定公開揭露事項</h3>
            <div class="text-sm text-gray-700 leading-9 space-y-4">
              <p><span class="font-bold">性騷擾申訴管道</span><br>
              性騷擾申訴專線電話：089-381382 分機 176<br>
              EMAIL：a00193@st-mary.com.tw</p>
              <p><span class="font-bold">性騷擾防治措施：</span><br>
              (一) 不得利用工作上權力、機會或方法，對員工或求職者性騷擾，亦不得縱容他人對員工或求職者性騷擾。<br>
              (二) 員工不得於工作職場對同仁性騷擾，亦不得於同仁執行職務時對其性騷擾。<br>
              (三) 工作職場有以上性騷擾之情形時，管理監督者應予勸阻或為其他適當之處置者，不可縱容。</p>
            </div>
          </div>

        </div>
      </div>
      <div class="h-1 bg-[#5a8a3c] rounded mt-1"></div>

      <div class="text-center my-8">
        <NuxtLink to="/site"
          class="inline-block border border-[#5a8a3c] text-[#5a8a3c] py-2 px-10 rounded-full hover:bg-[#5a8a3c] hover:text-white transition-colors text-sm">
          回聖母健康農莊首頁
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'site' })

const activeTab = ref('history')

const tabs = [
  { id: 'history', label: '農莊歷史與理念實踐' },
  { id: 'purpose', label: '服務宗旨' },
  { id: 'partner', label: '健康夥伴' },
  { id: 'gov',     label: '法定公開揭露事項' },
]

const partners = [
  { name: '台東聖母醫院',     subtitle: '提供優質醫療服務',                                              desc: '台東聖母醫院長期深耕台東，提供完善的醫療照護服務。',                                                                                         img: '/images/about/healthfarm_about_partner_photo1.png', address: '950 台東縣台東市杭州街2號',   phone: '089-322833' },
  { name: '高齡服務培訓中心', subtitle: '提供各項高齡服務，長照培訓與即測即評',                          desc: '秉持「老吾老、以及人之老」的初心，發揮職人精神為高齡照顧打造軟、硬體兼具的優良設施，貼心營造環境每個細節，務求達到高齡服務培訓的最高品質。',   img: '/images/about/healthfarm_about_partner_photo2.png', address: '950 台東縣台東市博物館路110號', phone: '089-381581' },
  { name: '健康活力站',       subtitle: '運用在地資源結合外地協助，2010年起陸續成立嘉蘭及泰源健康活力站', desc: '提供老人日托關懷、部落健康廚房、送餐服務及學童課後輔導…等服務。',                                                                             img: '/images/about/healthfarm_about_partner_photo3.png', address: '', phone: '' },
  { name: '部落健康廚房',     subtitle: '送餐服務是台東聖母醫院多年來持續關懷獨居老人及身心障礙者的事工', desc: '台東幅員廣闊，為讓老人家吃到熱騰騰的飯菜，我們籌備了8個部落健康廚房，就近服務部落鄉親，也創造了當地就業機會。',                           img: '/images/about/healthfarm_about_partner_photo4.png', address: '', phone: '' },
  { name: '聖母健康會館',     subtitle: '體驗健康飲食的教育基地，以全蔬食自助餐方式，提供營養均衡的美味三餐', desc: '幫助大家過健康好生活、體會生命美好的園地，是照顧民眾健康的好朋友！',                                                                        img: '/images/about/healthfarm_about_partner_photo5.png', address: '950 台東縣台東市南京路77號',   phone: '089-345719' },
  { name: '芳心好美館',       subtitle: '全國首創專為老人、病人及照顧者開辦的芳療館',                    desc: '營造充滿健康、優雅、自在的療育環境，讓芳香照護陪伴著每個需要幫助的人們。',                                                                        img: '/images/about/healthfarm_about_partner_photo6.png', address: '950 台東縣台東市信義路106號', phone: '089-330958' },
]
</script>
