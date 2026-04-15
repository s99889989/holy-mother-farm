<template>
  <div>
    <SitePageHero cover="/images/restaurant/restaurant-cover.png" title="田園餐廳" />

    <!-- Tab -->
    <div class="max-w-4xl mx-auto px-4 mt-4">
      <div class="flex gap-0 border-b-2" style="border-color: #e0d8cc;">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          class="px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-0.5"
          :style="activeTab === tab.key ? 'color: #5bbfbf; border-color: #5bbfbf;' : 'color: #888; border-color: transparent;'">
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="rounded-2xl border-2 border-dashed p-6 sm:p-8 bg-white" style="border-color: #b8d8d0;">

        <!-- 餐廳簡介 -->
        <div v-if="activeTab === 'intro'">
          <h2 class="text-lg font-bold mb-3" style="color: #5bbfbf;">
            <span class="inline-block w-3 h-3 rounded-full mr-2" style="background-color: #5bbfbf;"></span>
            無國界創意料理
          </h2>
          <p class="text-sm text-gray-600 leading-relaxed mb-5">
            台東聖母健康農莊於2018年4月份搬遷完成並正式營業，重新打造升級成為「高齡友善綠色照護農場」，以高齡友善融合綠色療癒的環境設計，提供長者需要的支持與照里。
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <img src="/images/restaurant/restaurant-introduce-photo1.jpg" alt="餐廳" class="rounded-xl w-full object-cover aspect-video" />
            <img src="/images/restaurant/restaurant-introduce-photo2.jpg" alt="餐廳" class="rounded-xl w-full object-cover aspect-video" />
          </div>
          <p class="text-sm text-gray-600 leading-relaxed mb-5">
            位於高齡友善綠色照護農場環境中的「田園餐廳」，秉持「土壤到餐桌」的健康促進原則，堅持採用自產或當地小農，有機成安全食品的創意餐點符合低油、低糖、低鹽、高纖維的料理原則，並媒合來自農莊香藥草園裡種植的香藥草入菜，並提供天然無糖香藥草茶飲以及「全食物烘焙坊」每日新鮮出爐天然無化學添加的鬆包、手工酥糕。
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <img src="/images/restaurant/restaurant-introduce-photo3.jpg" alt="餐廳" class="rounded-xl w-full object-cover aspect-video" />
            <img src="/images/restaurant/restaurant-introduce-photo4.jpg" alt="餐廳" class="rounded-xl w-full object-cover aspect-video" />
          </div>
          <p class="text-sm text-gray-600 leading-relaxed">
            希望用餐用餐既能除了吃得健康無負擔外，更能達到食有目的，學習健康的生活，享受美好的人生。
          </p>
        </div>

        <!-- 營業時間 -->
        <div v-if="activeTab === 'hours'">
          <h2 class="text-lg font-bold mb-4" style="color: #5bbfbf;">
            <span class="inline-block w-3 h-3 rounded-full mr-2" style="background-color: #5bbfbf;"></span>
            營業時間
          </h2>
          <p class="text-sm text-gray-600 leading-relaxed mb-4">
            營業時間：11:30-13:30供餐 每周日公休（團體40人以上可以提前預約安排用餐）<br>
            訂位電話：(089)381382#889<br>
            這訂資訊：即時營業資訊可加入田園餐廳LINE官方社群「田園餐廳之友」，也可在此傳送訊息，提供稍呼時，人數可以線上快速訂位。
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <img src="/images/restaurant/restaurant-info-photo1.jpg" alt="餐廳環境" class="rounded-xl w-full object-cover aspect-video" />
            <img src="/images/restaurant/restaurant-info-photo2.jpg" alt="餐廳環境" class="rounded-xl w-full object-cover aspect-video" />
          </div>
        </div>

        <!-- 用餐方式 + 今日菜色 -->
        <div v-if="activeTab === 'menu'">
          <h2 class="text-lg font-bold mb-4" style="color: #5bbfbf;">
            <span class="inline-block w-3 h-3 rounded-full mr-2" style="background-color: #5bbfbf;"></span>
            用餐方式
          </h2>
          <p class="text-sm text-gray-600 leading-relaxed mb-6">
            聖母健康農莊「田園餐廳」以健康飲食為宗求，嚴選全食材，優先使用農莊自產之有機蔬菜，提供安舒適的用餐環境，並首選「食品衛生優良商店」。<br><br>
            本餐廳提供每客250元的自助餐，用餐即可免費農莊自製手工麵包、天然藥草茶飲。<br>
            滿40人以上的團體，可預約不同時段及自助餐（每人300-500元）。<br><br>
            田園餐廳採自助式取餐，餐盤、餐具請自行取用，用完餐，請請您的餐具按照分類放置於回收處。
          </p>

          <!-- 今日菜色 -->
          <div class="border-t border-gray-100 pt-6">
            <div class="flex items-end justify-between mb-4">
              <h3 class="font-bold text-gray-800">今日菜色</h3>
              <span class="text-xs text-gray-400">{{ todayLabel }}</span>
            </div>
            <div v-if="menuLoading" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div v-for="n in 6" :key="n" class="rounded-xl bg-gray-100 animate-pulse h-32" />
            </div>
            <div v-else-if="menuItems.length === 0" class="text-center py-8 text-gray-400 text-sm">今日菜色尚未更新</div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div v-for="item in menuItems" :key="item.id"
                class="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                <div v-if="item.images?.length" class="h-32 overflow-hidden">
                  <img :src="menuImgUrl(item.images[0])" :alt="item.name" class="w-full h-full object-cover" />
                </div>
                <div class="p-2.5">
                  <p class="text-sm font-medium text-gray-800">{{ item.name }}</p>
                  <span v-if="item.diet" class="text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block"
                    :class="item.diet === '葷食' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'">
                    {{ item.diet }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="text-center pb-12">
      <NuxtLink to="/site" class="inline-block px-8 py-3 rounded-full text-sm font-medium text-white" style="background-color: #5bbfbf;">
        回聖母健康農莊首頁
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'
definePageMeta({ layout: 'site' })

const commonStore = useCommonStore()
const activeTab = ref('intro')
const tabs = [
  { key: 'intro', label: '餐廳簡介' },
  { key: 'hours', label: '營業時間' },
  { key: 'menu',  label: '用餐方式' },
]

const today = new Date()
const todayStr   = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const todayLabel = today.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })

const menuLoading = ref(false)
const menuItems   = ref([])

const menuImgUrl = (path) => {
  if (!path || path.startsWith('http')) return path
  return commonStore.data.main_url + path
}

onMounted(async () => {
  menuLoading.value = true
  try {
    const data = await (await fetch(`${commonStore.data.main_url}/holy/menu/get/${todayStr}`)).json()
    menuItems.value = Array.isArray(data) ? data.filter(i => i.name?.trim() || i.images?.length > 0) : []
  } catch { menuItems.value = [] }
  finally { menuLoading.value = false }
})
</script>
