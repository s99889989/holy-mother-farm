<template>
  <div>
    <SitePageHero cover="/images/about/about-cover.png" title="關於我們" />

    <!-- ══ 分頁 Tab ══ -->
    <div class="max-w-4xl mx-auto px-4 mt-4 mb-0">
      <div class="flex gap-0 border-b-2 overflow-x-auto" style="border-color: #e0d8cc;">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
                class="px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-0.5 whitespace-nowrap"
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
          <!-- 宗旨文字 + 聖母像 -->
          <div class="flex flex-col sm:flex-row gap-6 mb-8">
            <div class="flex-1">
              <h2 class="text-lg font-bold mb-3" style="color: #5bbfbf;">宗旨：愛主愛人、尊重生命、為窮人服務</h2>
              <p class="text-sm text-gray-600 leading-relaxed mb-4">
                「窮人」泛指身、心、靈缺乏之的人！窮人沒有生病的條件，特別是在台東的窮人；幫助窮人的方式，除了給予資助外，還要協助窮人生活健康不生病。
              </p>
              <p class="text-sm text-gray-600 leading-relaxed mb-4">
                台東聖母醫院為邁向符合世界潮流的綠色醫院（GREEN HOSPITAL），積極推動健康促進，並以向大自然學習的精神，強調人與自然的融合，企盼從實踐健康與愛的生活中，達到身體的覺醒（BODY AWARENESS）。
              </p>
              <p class="text-sm text-gray-600 leading-relaxed">
                我們努力結合各種資源，並以教會為基地、用健康去福傳，建立了天主教台東聖母健康園區。
              </p>
            </div>
            <div class="flex-shrink-0 flex justify-center sm:justify-end">
              <img src="/images/about/about-purpose-photo.png" alt="聖母像"
                   class="w-32 sm:w-40 object-contain" />
            </div>
          </div>

          <!-- 組織圖 -->
          <div class="mt-6">
            <h3 class="text-center text-base font-bold mb-6" style="color: #5bbfbf;">《 組織圖 》</h3>

            <!-- 1952 -->
            <div class="flex flex-col items-center">
              <div class="rounded-lg px-8 py-2 text-white text-sm font-bold text-center shadow"
                   style="background-color: #e8a020; min-width: 160px;">
                <div class="text-xs font-normal opacity-80">1952</div>
                天主教會花蓮教區
              </div>

              <!-- 委託 -->
              <div class="flex flex-col items-center my-2">
                <div class="w-px h-4 bg-teal-400"></div>
                <span class="text-xs text-gray-400">委 託</span>
                <div class="relative flex flex-col items-center">
                  <svg class="w-3 h-3 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 14l-6-6h12l-6 6z"/>
                  </svg>
                </div>
              </div>

              <!-- 1961 -->
              <div class="rounded-lg px-8 py-2 text-white text-sm font-bold text-center shadow"
                   style="background-color: #e8a020; min-width: 160px;">
                <div class="text-xs font-normal opacity-80">1961</div>
                天主教台東聖母醫院
              </div>

              <!-- 經營管理 -->
              <div class="flex flex-col items-center my-2">
                <div class="w-px h-4 bg-teal-400"></div>
                <span class="text-xs text-gray-400">經 營 管 理</span>
                <svg class="w-3 h-3 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 14l-6-6h12l-6 6z"/>
                </svg>
              </div>

              <!-- 四個子單位 -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
                <div v-for="unit in orgUnits" :key="unit.year"
                     class="rounded-lg px-3 py-2 text-white text-xs font-bold text-center shadow"
                     style="background-color: #e8a020;">
                  <div class="text-xs font-normal opacity-80 mb-0.5">{{ unit.year }}</div>
                  {{ unit.name }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3：健康夥伴 -->
        <div v-if="activeTab === 'partners'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div v-for="partner in partners" :key="partner.name" class="flex flex-col">
              <h3 class="text-base font-bold mb-2 flex items-center gap-2" style="color: #5bbfbf;">
                <span class="w-3 h-3 rounded-full inline-block flex-shrink-0" style="background: #5bbfbf;"></span>
                {{ partner.name }}
              </h3>
              <img :src="partner.photo" :alt="partner.name"
                   class="w-full rounded-xl object-cover mb-3" style="aspect-ratio: 4/3;" />
              <p class="text-xs font-semibold mb-1" style="color: #5bbfbf;">{{ partner.tagline }}</p>
              <p class="text-xs text-gray-600 leading-relaxed mb-2">{{ partner.desc }}</p>
              <div v-if="partner.addr" class="mt-auto space-y-0.5">
                <p class="text-xs text-gray-400">地址：{{ partner.addr }}</p>
                <p class="text-xs text-gray-400">電話：{{ partner.tel }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 4：法定公開揭露事項 -->
        <div v-if="activeTab === 'legal'">
          <h2 class="text-lg font-bold mb-4" style="color: #5bbfbf;">法定公開揭露事項</h2>

          <div class="mb-6">
            <p class="text-sm font-bold text-gray-700 mb-1">性騷擾申訴管道</p>
            <p class="text-sm text-gray-600">性騷擾申訴專線電話：089-381382 分機 176</p>
            <p class="text-sm text-gray-600">EMAIL：a00193@st-mary.com.tw</p>
          </div>

          <div>
            <p class="text-sm font-bold text-gray-700 mb-3">性騷擾防治措施：</p>
            <div class="space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>（一）不得利用工作上權力、機會或方法，對員工或求職者性騷擾，亦不得縱容他人對員工或求職者性騷擾。</p>
              <p>（二）員工不得於工作職場對同仁性騷擾，亦不得對同仁執行職務時對其性騷擾。</p>
              <p>（三）工作場所有以上性騷擾之情形時，管理監督者應予勸阻或為其他適當之處置者，不可縱容。</p>
              <p>（四）本法人應致力防制性騷擾、改善就業場所設施以保護員工免於性騷擾，鼓勵員工參加性騷擾防治之教育講習。</p>
              <p class="font-medium text-gray-700">（五）申訴及調查</p>
              <p>1. 為處理性騷擾申訴，成立「性騷擾申訴審議委員會」。</p>
              <p>2. 本法人員工遭受性騷擾、性侵犯，非本法人員工、求職者或間接對本法人員工施以性騷擾、性侵犯、受害員工或單位相關人員，得向委員會提出申訴，必要時向警察機關開案處理。</p>
              <p>3. 可洽詢人資索取「申訴書」或本網頁下載，由人資受理申訴及呈交「性騷擾申訴審議委員會」，並於申訴後七日內開始調查及審議。申訴應填具申訴書並具名之。申訴人可以親送、書信、電子郵件等方式提出申訴。必要時，得以電話先行申訴，並於三日內以書面補正。</p>
              <p>4. 為處理申訴案件，必要時得邀請被申訴者列席說明或陳述意見，並得依申訴者之申請，進行調查；被申訴者非有正當理由，不得拒絕；必要時，得邀請申訴者與被申訴者共同列席說明或陳述意見。</p>
              <p>5. 受理申訴者為調查、審議性騷擾申訴，得要求相關人員或單位提供相關資料，該相關人員或單位不得規避、妨礙或拒絕。</p>
              <p>6. 調查、審議過程中應維護申訴人權益，以保密方式處理申訴案件，不得洩漏申訴人之姓名或其他足資識別申訴人身份之相關資料。</p>
              <p>7. 受理申訴者應於受理之日起二週內作成決定，必要時得延長六日，並以延長一次為限。申訴及被申訴人對申訴案之結果有異議者，得以三日內提出申覆。經結案後，不得就同一事件，再提出申訴。</p>
              <p>8. 受理申訴者應應將申訴案之處理經過作成書面記錄，並密封存檔至少三年。</p>
              <p>9. 本法人不得因申訴人提出申訴，而予以解僱、調職或其他不利之處置。</p>
            </div>
          </div>
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
  { key: 'history',  label: '農莊歷史與理念實踐' },
  { key: 'mission',  label: '服務宗旨' },
  { key: 'partners', label: '健康夥伴' },
  { key: 'legal',    label: '法定公開揭露事項' },
]

// 組織圖子單位
const orgUnits = [
  { year: '1955', name: '聖母健康培育院' },
  { year: '2008', name: '聖母健康會館' },
  { year: '2010', name: '聖母健康農莊' },
  { year: '2013', name: '芳心美好館' },
]

// 健康夥伴
const partners = [
  {
    name: '天主教台東聖母醫院',
    photo: '/images/about/healthfarm_about_partner_photo1.png',
    tagline: '建構醫療福傳網絡、落實四全醫療照護',
    desc: '我們以「人」為中心！不只看「病人」；更不是只看「病」；秉持「別人不去、我們去；別人不做、我們做」的精神。',
    addr: '950 台東縣台東市杭州街2號',
    tel: '089-322833',
  },
  {
    name: '高齡服務培訓中心',
    photo: '/images/about/healthfarm_about_partner_photo2.png',
    tagline: '提供各項高齡服務，長照培訓與即測即評',
    desc: '秉持「老吾老、以及人之老」的初心，發揮職人精神為高齡照顧打造軟、硬體兼具的優質設施，貼心營造環境細節體驗，務求讓高齡服務品的最高水準。',
    addr: '950 台東縣台東市博物館路110號',
    tel: '089-381581',
  },
  {
    name: '健康活力站',
    photo: '/images/about/healthfarm_about_partner_photo3.png',
    tagline: '運用在地資源結合外地協助，2010年起陸續成立嘉蘭及泰源健康活力站',
    desc: '提供老人日托關懷、部落健康廚房、送餐服務及學童課後輔導一等服務。期盼能結合教會及在地青年的力量，建立行台族群傳信仰環境模式。',
    addr: '',
    tel: '',
  },
  {
    name: '部落健康廚房',
    photo: '/images/about/healthfarm_about_partner_photo4.png',
    tagline: '送餐服務是台東聖母醫院多年來持續關懷獨居老人及身心障礙者的善工',
    desc: '台東幅員廣闊，為讓老人家吃到熱騰騰的飯菜，我們籌辦了8個部落健康廚房，就從服部落港鄉，也創造了當地就業機會。',
    addr: '',
    tel: '',
  },
  {
    name: '聖母健康會館',
    photo: '/images/about/healthfarm_about_partner_photo5.png',
    tagline: '體塑健康飲食的教育基地，以全蔬食自助餐方式，提供營養均衡的美味三餐',
    desc: '幫助大家過健康好生活、體會生命美好的園地，是服鄉民眾健康的好朋友！',
    addr: '950 台東縣台東市南京路77號',
    tel: '089-345719',
  },
  {
    name: '芳心美好館',
    photo: '/images/about/healthfarm_about_partner_photo6.png',
    tagline: '全國首創專為老人、病人及照顧者開闢的芳療館',
    desc: '營造充滿健康、優雅、自在的療癒環境，讓為者照顧及個個都需要幫助的人們。',
    addr: '950 台東縣台東市信義路106號',
    tel: '089-330958',
  },
]
</script>
