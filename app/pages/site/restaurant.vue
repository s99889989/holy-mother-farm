<template>
  <div>
    <SitePageHero cover="/images/restaurant/restaurant-cover.png" title="田園餐廳" />

    <!-- Tab -->
    <div class="max-w-4xl mx-auto px-4 mt-4">
      <div class="flex gap-0 border-b-2" style="border-color: #e0d8cc;">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
                class="px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-0.5 whitespace-nowrap"
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
            訂位資訊：即時營業資訊可加入田園餐廳LINE官方社群「田園餐廳之友」，也可在此傳送訊息，提供稍呼時，人數可以線上快速訂位。
          </p>
          <div class="flex flex-wrap gap-3 mt-6">
            <button @click="activeTab = 'booking'"
                    class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-sm font-medium"
                    style="background-color: #5bbfbf;">
              線上訂位 →
            </button>
            <button @click="activeTab = 'lunch'"
                    class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-sm font-medium"
                    style="background-color: #e8a020;">
              便當預訂 →
            </button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <img src="/images/restaurant/restaurant-info-photo1.jpg" alt="餐廳環境" class="rounded-xl w-full object-cover aspect-video" />
            <img src="/images/restaurant/restaurant-info-photo2.jpg" alt="餐廳環境" class="rounded-xl w-full object-cover aspect-video" />
          </div>
        </div>

        <!-- 用餐方式 + 菜色查詢 -->
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

          <!-- 菜色查詢區 -->
          <div class="border-t border-gray-100 pt-6">

            <!-- 日期選擇列 -->
            <div class="flex items-center gap-3 mb-5">
              <h3 class="font-bold text-gray-800 flex-shrink-0">菜色查詢</h3>
              <div class="flex items-center gap-2">
                <button @click="prevDay"
                        class="p-2 rounded-lg border border-gray-200 hover:border-teal-400 hover:text-teal-600 transition-colors text-gray-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <span class="text-sm text-gray-600 font-medium min-w-32 text-center">{{ selectedDate }}</span>
                <button @click="nextDay" :disabled="selectedDate >= todayStr"
                        class="p-2 rounded-lg border border-gray-200 hover:border-teal-400 hover:text-teal-600 transition-colors text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <button v-if="selectedDate !== todayStr" @click="goToday"
                        class="px-3 py-2 text-xs rounded-xl text-white transition-colors"
                        style="background-color: #5bbfbf;">
                  選擇今日
                </button>
              </div>
            </div>

            <!-- 選定日期標題 -->
            <div class="flex items-center gap-2 mb-4">
              <span class="text-xs text-gray-400">{{ selectedDateLabel }}</span>
              <span v-if="selectedDate === todayStr" class="px-2 py-0.5 rounded-full text-white text-xs"
                    style="background-color: #5bbfbf;">今日</span>
            </div>

            <!-- 菜色內容 -->
            <div v-if="menuLoading" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div v-for="n in 6" :key="n" class="rounded-xl bg-gray-100 animate-pulse h-32" />
            </div>
            <div v-else-if="menuItems.length === 0"
                 class="text-center py-10 text-gray-400 text-sm rounded-xl border-2 border-dashed border-gray-100">
              {{ selectedDate === todayStr ? '今日菜色尚未更新' : '此日期無菜色紀錄' }}
            </div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div v-for="item in menuItems" :key="item.id"
                   class="rounded-xl overflow-hidden bg-gray-50 border border-gray-100 hover:shadow-sm transition-shadow">
                <div v-if="item.images?.length" class="h-32 overflow-hidden">
                  <img :src="menuImgUrl(item.images[0])" :alt="item.name" class="w-full h-full object-cover" loading="eager" />
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

        <!-- 線上訂位 -->
        <div v-if="activeTab === 'booking'">
          <div class="bg-white rounded-2xl overflow-hidden">
            <div class="flex border-b border-stone-100 mb-6">
              <div v-for="(step, idx) in bSteps" :key="step"
                   class="flex-1 py-3 text-center text-sm font-medium relative"
                   :class="bStep === idx ? 'text-teal-700 bg-teal-50' : bStep > idx ? 'text-teal-600' : 'text-stone-300'">
                <span class="inline-flex items-center gap-1.5">
                  <svg v-if="bStep > idx" class="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span v-else class="w-5 h-5 rounded-full text-xs flex items-center justify-center border font-bold"
                        :class="bStep === idx ? 'bg-teal-600 text-white border-teal-600' : 'border-stone-200 text-stone-300'">
                    {{ idx + 1 }}
                  </span>
                  {{ step }}
                </span>
                <div v-if="bStep === idx" class="absolute bottom-0 inset-x-0 h-0.5" style="background-color:#5bbfbf;" />
              </div>
            </div>
            <div v-if="bStep === 0">
              <h2 class="text-base font-bold text-stone-800 mb-4">選擇用餐日期</h2>
              <div class="bg-stone-50 rounded-2xl p-4 mb-4">
                <div class="flex items-center justify-between mb-3">
                  <button @click="bPrevMonth" :disabled="!bCanPrevMonth" class="p-2 rounded-xl transition-colors"
                          :class="bCanPrevMonth ? 'hover:bg-stone-200 text-stone-600' : 'text-stone-300 cursor-not-allowed'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <span class="font-bold text-stone-800 text-sm">{{ bCalYear }} 年 {{ bCalMonth }} 月</span>
                  <button @click="bNextMonth" class="p-2 rounded-xl hover:bg-stone-200 text-stone-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
                <div class="grid grid-cols-7 mb-1">
                  <div v-for="w in ['日','一','二','三','四','五','六']" :key="w" class="text-center text-xs text-stone-400 py-1">{{ w }}</div>
                </div>
                <div class="grid grid-cols-7 gap-1">
                  <div v-for="(day, idx) in bCalDays" :key="idx"
                       class="aspect-square flex items-center justify-center rounded-xl text-sm select-none transition-all"
                       :class="bDayClass(day)"
                       @click="day.date && !day.disabled && bSelectDate(day.date)">
                    {{ day.label }}
                  </div>
                </div>
              </div>
              <div v-if="bForm.date" class="rounded-xl px-4 py-3 text-sm font-medium mb-2" style="background-color:#eef7f5; color:#3a9a8a;">
                <div class="flex items-center justify-between">
                  <span>已選擇：{{ bForm.date }}</span>
                  <span v-if="bDateGuestsLoading" class="text-xs opacity-60">查詢中…</span>
                  <span v-else class="text-xs px-2 py-0.5 rounded-full bg-white font-semibold" style="color:#3a9a8a;">
                    已訂 {{ bDateGuests }} 人
                  </span>
                </div>
              </div>
              <p v-if="bErrors.date" class="text-xs text-red-400">{{ bErrors.date }}</p>
            </div>
            <div v-if="bStep === 1" class="space-y-4">
              <h2 class="text-base font-bold text-stone-800 mb-2">填寫資料</h2>
              <div>
                <label class="block text-sm font-semibold text-stone-700 mb-1">姓名 <span class="text-red-400">*</span></label>
                <input v-model="bForm.name" placeholder="請輸入姓名" class="w-full px-4 py-2.5 rounded-xl border text-stone-800 outline-none text-sm focus:ring-2"
                       :class="bErrors.name ? 'border-red-300 bg-red-50' : 'border-stone-200 focus:ring-teal-200'" />
                <p v-if="bErrors.name" class="text-xs text-red-400 mt-1">{{ bErrors.name }}</p>
              </div>
              <div>
                <label class="block text-sm font-semibold text-stone-700 mb-1">聯絡電話 <span class="text-red-400">*</span></label>
                <input v-model="bForm.phone" type="tel" placeholder="請輸入電話" class="w-full px-4 py-2.5 rounded-xl border text-stone-800 outline-none text-sm focus:ring-2"
                       :class="bErrors.phone ? 'border-red-300 bg-red-50' : 'border-stone-200 focus:ring-teal-200'" />
                <p v-if="bErrors.phone" class="text-xs text-red-400 mt-1">{{ bErrors.phone }}</p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-semibold text-stone-700 mb-1">用餐時間</label>
                  <select v-model="bForm.time" class="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-stone-800 outline-none text-sm bg-white">
                    <option v-for="t in bTimeSlots" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-stone-700 mb-1">人數</label>
                  <div class="flex items-center gap-1.5">
                    <button @click="bForm.guests = Math.max(1, bForm.guests - 1)" class="w-9 h-9 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center justify-center flex-shrink-0">−</button>
                    <input v-model.number="bForm.guests" type="number" min="1" max="50" class="flex-1 text-center px-2 py-2 rounded-xl border border-stone-200 text-stone-800 outline-none text-sm font-bold" />
                    <button @click="bForm.guests = Math.min(50, bForm.guests + 1)" class="w-9 h-9 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center justify-center flex-shrink-0">＋</button>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-stone-700 mb-1">備註</label>
                <textarea v-model="bForm.note" rows="2" placeholder="過敏食材、特殊需求…" class="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-stone-800 outline-none text-sm resize-none" />
              </div>
            </div>
            <div v-if="bStep === 2">
              <h2 class="text-base font-bold text-stone-800 mb-4">葷素選擇</h2>
              <div class="grid grid-cols-2 gap-3 mb-3">
                <button v-for="opt in bDietOptions" :key="opt.value" @click="bForm.diet = opt.value"
                        class="p-4 rounded-2xl border-2 text-left transition-all"
                        :class="bForm.diet === opt.value ? 'border-teal-500 bg-teal-50' : 'border-stone-100 hover:border-stone-200'">
                  <div class="text-2xl mb-1">{{ opt.icon }}</div>
                  <div class="font-semibold text-stone-800 text-sm">{{ opt.label }}</div>
                  <div class="text-xs text-stone-400">{{ opt.desc }}</div>
                </button>
              </div>
              <p v-if="bErrors.diet" class="text-xs text-red-400">{{ bErrors.diet }}</p>
            </div>
            <div v-if="bStep === 3">
              <h2 class="text-base font-bold text-stone-800 mb-4">確認預約內容</h2>
              <div class="divide-y divide-stone-50 mb-4 rounded-xl border border-stone-100 overflow-hidden">
                <div v-for="row in bSummary" :key="row.label" class="flex justify-between items-center px-4 py-3">
                  <span class="text-sm text-stone-400">{{ row.label }}</span>
                  <span class="text-sm font-semibold text-stone-800">{{ row.value }}</span>
                </div>
              </div>
              <p v-if="bSubmitError" class="text-sm text-red-400 bg-red-50 rounded-xl px-4 py-3 mb-3">{{ bSubmitError }}</p>
            </div>
            <div class="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-stone-100">
              <button v-if="bStep > 0" @click="bStep--" class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                上一步
              </button>
              <div v-else />
              <button v-if="bStep < bSteps.length - 1" @click="bNextStep"
                      class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold ml-auto" style="background-color:#5bbfbf;">
                下一步 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
              <button v-else @click="bSubmit" :disabled="bSubmitting"
                      class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold ml-auto disabled:opacity-50" style="background-color:#5bbfbf;">
                <div v-if="bSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {{ bSubmitting ? '送出中…' : '確認預約' }}
              </button>
            </div>
          </div>
          <div class="mt-4 rounded-xl p-4 text-sm space-y-1" style="background-color:#eef7f5; color:#3a9a8a;">
            <p class="font-semibold mb-1">📋 預約注意事項</p>
            <p>· 請提前一日完成預約，以便我們備料。</p>
            <p>· 預約送出後為「待確認」狀態，我們將盡快電話確認。</p>
            <p>· 如需取消，請提前來電告知，謝謝。</p>
          </div>
        </div>

        <!-- 便當預訂 -->
        <div v-if="activeTab === 'lunch'">
          <div class="bg-white rounded-2xl overflow-hidden">
            <div class="flex border-b border-stone-100 mb-6">
              <div v-for="(step, idx) in lSteps" :key="step"
                   class="flex-1 py-3 text-center text-sm font-medium relative"
                   :class="lStep === idx ? 'text-amber-700 bg-amber-50' : lStep > idx ? 'text-amber-600' : 'text-stone-300'">
                <span class="inline-flex items-center gap-1.5">
                  <svg v-if="lStep > idx" class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span v-else class="w-5 h-5 rounded-full text-xs flex items-center justify-center border font-bold"
                        :class="lStep === idx ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-200 text-stone-300'">
                    {{ idx + 1 }}
                  </span>
                  {{ step }}
                </span>
                <div v-if="lStep === idx" class="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500" />
              </div>
            </div>
            <div v-if="lStep === 0">
              <h2 class="text-base font-bold text-stone-800 mb-4">選擇取餐日期</h2>
              <div class="bg-stone-50 rounded-2xl p-4 mb-4">
                <div class="flex items-center justify-between mb-3">
                  <button @click="lPrevMonth" :disabled="!lCanPrevMonth" class="p-2 rounded-xl transition-colors"
                          :class="lCanPrevMonth ? 'hover:bg-stone-200 text-stone-600' : 'text-stone-300 cursor-not-allowed'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <span class="font-bold text-stone-800 text-sm">{{ lCalYear }} 年 {{ lCalMonth }} 月</span>
                  <button @click="lNextMonth" class="p-2 rounded-xl hover:bg-stone-200 text-stone-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
                <div class="grid grid-cols-7 mb-1">
                  <div v-for="w in ['日','一','二','三','四','五','六']" :key="w" class="text-center text-xs text-stone-400 py-1">{{ w }}</div>
                </div>
                <div class="grid grid-cols-7 gap-1">
                  <div v-for="(day, idx) in lCalDays" :key="idx"
                       class="aspect-square flex items-center justify-center rounded-xl text-sm select-none transition-all"
                       :class="lDayClass(day)"
                       @click="day.date && !day.disabled && (lForm.date = day.date)">
                    {{ day.label }}
                  </div>
                </div>
              </div>
              <div v-if="lForm.date" class="rounded-xl px-4 py-3 text-sm font-medium mb-2 bg-amber-50 text-amber-700">
                已選擇：{{ lForm.date }}
              </div>
              <p v-if="lErrors.date" class="text-xs text-red-400">{{ lErrors.date }}</p>
            </div>
            <div v-if="lStep === 1" class="space-y-4">
              <h2 class="text-base font-bold text-stone-800 mb-2">填寫資料</h2>
              <div>
                <label class="block text-sm font-semibold text-stone-700 mb-1">姓名 <span class="text-red-400">*</span></label>
                <input v-model="lForm.name" placeholder="請輸入姓名" class="w-full px-4 py-2.5 rounded-xl border text-stone-800 outline-none text-sm"
                       :class="lErrors.name ? 'border-red-300 bg-red-50' : 'border-stone-200'" />
                <p v-if="lErrors.name" class="text-xs text-red-400 mt-1">{{ lErrors.name }}</p>
              </div>
              <div>
                <label class="block text-sm font-semibold text-stone-700 mb-1">聯絡電話 <span class="text-red-400">*</span></label>
                <input v-model="lForm.phone" type="tel" placeholder="請輸入電話" class="w-full px-4 py-2.5 rounded-xl border text-stone-800 outline-none text-sm"
                       :class="lErrors.phone ? 'border-red-300 bg-red-50' : 'border-stone-200'" />
                <p v-if="lErrors.phone" class="text-xs text-red-400 mt-1">{{ lErrors.phone }}</p>
              </div>
              <div>
                <label class="block text-sm font-semibold text-stone-700 mb-1">取餐時間</label>
                <select v-model="lForm.time" class="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-stone-800 outline-none text-sm bg-white">
                  <option v-for="t in lTimeSlots" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-stone-700 mb-1">葷食便當（盒）</label>
                <div class="flex items-center gap-1.5">
                  <button @click="lForm.meatQty = Math.max(0, lForm.meatQty - 1)" class="w-9 h-9 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center justify-center flex-shrink-0">−</button>
                  <input v-model.number="lForm.meatQty" type="number" min="0" class="flex-1 text-center px-2 py-2 rounded-xl border border-stone-200 text-stone-800 outline-none text-sm font-bold" />
                  <button @click="lForm.meatQty++" class="w-9 h-9 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center justify-center flex-shrink-0">＋</button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-stone-700 mb-1">素食便當（盒）</label>
                <div class="flex items-center gap-1.5">
                  <button @click="lForm.vegQty = Math.max(0, lForm.vegQty - 1)" class="w-9 h-9 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center justify-center flex-shrink-0">−</button>
                  <input v-model.number="lForm.vegQty" type="number" min="0" class="flex-1 text-center px-2 py-2 rounded-xl border border-stone-200 text-stone-800 outline-none text-sm font-bold" />
                  <button @click="lForm.vegQty++" class="w-9 h-9 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center justify-center flex-shrink-0">＋</button>
                </div>
              </div>
              <p v-if="lErrors.qty" class="text-xs text-red-400">{{ lErrors.qty }}</p>
              <div v-if="lForm.meatQty > 0 || lForm.vegQty > 0" class="bg-amber-50 rounded-xl p-3 text-sm text-stone-600">
                共 <strong>{{ lForm.meatQty + lForm.vegQty }}</strong> 盒（葷 {{ lForm.meatQty }}、素 {{ lForm.vegQty }}）
              </div>
              <div>
                <label class="block text-sm font-semibold text-stone-700 mb-1">備註</label>
                <textarea v-model="lForm.note" rows="2" placeholder="特殊需求…" class="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-stone-800 outline-none text-sm resize-none" />
              </div>
            </div>
            <div v-if="lStep === 2">
              <h2 class="text-base font-bold text-stone-800 mb-4">確認預訂內容</h2>
              <div class="divide-y divide-stone-50 mb-4 rounded-xl border border-stone-100 overflow-hidden">
                <div v-for="row in lSummary" :key="row.label" class="flex justify-between items-center px-4 py-3">
                  <span class="text-sm text-stone-400">{{ row.label }}</span>
                  <span class="text-sm font-semibold text-stone-800">{{ row.value }}</span>
                </div>
              </div>
              <p v-if="lSubmitError" class="text-sm text-red-400 bg-red-50 rounded-xl px-4 py-3 mb-3">{{ lSubmitError }}</p>
            </div>
            <div class="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-stone-100">
              <button v-if="lStep > 0" @click="lStep--" class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                上一步
              </button>
              <div v-else />
              <button v-if="lStep < lSteps.length - 1" @click="lNextStep"
                      class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold ml-auto">
                下一步 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
              <button v-else @click="lSubmit" :disabled="lSubmitting"
                      class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold ml-auto disabled:opacity-50">
                <div v-if="lSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {{ lSubmitting ? '送出中…' : '確認預訂' }}
              </button>
            </div>
          </div>
          <div class="mt-4 rounded-xl p-4 text-sm space-y-1 bg-amber-50 text-amber-700">
            <p class="font-semibold mb-1">📋 便當預訂須知</p>
            <p>· 請於前一日下午三點前完成預訂。</p>
            <p>· 預訂送出後為「待確認」狀態，我們將盡快電話確認。</p>
            <p>· 如需取消，請提前來電告知，謝謝。</p>
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
import { useRoute } from 'vue-router'
definePageMeta({ layout: 'site' })

const route       = useRoute()
const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/menu')

const activeTab = ref(route.query.tab || 'intro')
const tabs = [
  { key: 'intro',   label: '餐廳簡介' },
  { key: 'hours',   label: '營業時間' },
  { key: 'menu',    label: '用餐方式' },
  { key: 'booking', label: '線上訂位' },
  { key: 'lunch',   label: '便當預訂' },
]

// ── 日期工具 ──────────────────────────────────────────────────────
const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

const today        = new Date()
const todayStr     = toDateStr(today)
const selectedDate = ref(todayStr)

const selectedDateLabel = computed(() => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
})

const prevDay = async () => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  for (let i = 0; i < 60; i++) {
    d.setDate(d.getDate() - 1)
    const str = toDateStr(d)
    const ym = str.substring(0, 7)
    if (!Object.keys(dateStatus.value).some(k => k.startsWith(ym))) {
      await fetchDateStatusByYm(ym)
    }
    if (dateStatus.value[str]) {
      selectedDate.value = str
      await fetchMenu()
      return
    }
  }
}

const nextDay = async () => {
  if (selectedDate.value >= todayStr) return
  const d = new Date(selectedDate.value + 'T00:00:00')
  for (let i = 0; i < 60; i++) {
    d.setDate(d.getDate() + 1)
    const str = toDateStr(d)
    if (str > todayStr) return
    // 今天永遠可以到達
    if (str === todayStr) {
      selectedDate.value = str
      await fetchMenu()
      return
    }
    const ym = str.substring(0, 7)
    if (!Object.keys(dateStatus.value).some(k => k.startsWith(ym))) {
      await fetchDateStatusByYm(ym)
    }
    if (dateStatus.value[str]) {
      selectedDate.value = str
      await fetchMenu()
      return
    }
  }
}
const goToday = () => {
  selectedDate.value = todayStr
  fetchMenu()
}

// ── 日期狀態（有菜標記）──────────────────────────────────────────
const dateStatus = ref({})

const fetchDateStatusByYm = async (ym) => {
  try {
    const status = await (await fetch(`${BASE.value}/dates/${ym}`)).json()
    dateStatus.value = { ...dateStatus.value, ...status }
  } catch {}
}

const fetchDateStatus = async () => {
  const ym = selectedDate.value.substring(0, 7)
  await fetchDateStatusByYm(ym)
}

// ── 菜色 ──────────────────────────────────────────────────────────
const menuLoading = ref(false)
const menuItems   = ref([])

const menuImgUrl = (path) => {
  if (!path || path.startsWith('http')) return path
  const full = commonStore.data.main_url + path
  return full.replace('/holy/menu/image/', '/holy/menu/image/thumb/')
}

const fetchMenu = async () => {
  menuLoading.value = true
  // 切換月份時補抓該月狀態
  await fetchDateStatus()
  try {
    const data = await (await fetch(`${BASE.value}/get/${selectedDate.value}`)).json()
    menuItems.value = Array.isArray(data) ? data.filter(i => i.name?.trim() || i.images?.length > 0) : []
  } catch { menuItems.value = [] }
  finally { menuLoading.value = false }
}

onMounted(async () => {
  await fetchDateStatus()
  await fetchMenu()
})

// ══ 線上訂位 ══════════════════════════════════════════════════════
const BOOKING_BASE = computed(() => commonStore.data.main_url + '/holy/booking')
const bStep = ref(0)
const bSteps = ['選擇日期', '填寫資料', '葷素選擇', '確認送出']
const bForm = reactive({ name: '', phone: '', date: '', time: '12:00', guests: 2, diet: '', note: '' })
const bErrors = reactive({})
const bSubmitting = ref(false)
const bSubmitError = ref('')
const bTimeSlots = ['11:00','11:10','11:20','11:30','11:40','11:50','12:00','12:10','12:20','12:30','12:40','12:50','13:00']
const bDietOptions = [
  { value: '葷食',   icon: '🍖', label: '葷食',   desc: '含肉類料理' },
  { value: '素食',   icon: '🌿', label: '全素',   desc: '不含蛋奶五辛' },
  { value: '蛋奶素', icon: '🥚', label: '蛋奶素', desc: '可食蛋奶製品' },
  { value: '五辛素', icon: '🧄', label: '五辛素', desc: '可食蔥薑蒜' },
]

const bCal = new Date(); bCal.setHours(0,0,0,0)
const bTodayStr = toDateStr(bCal)
const bCalYear  = ref(bCal.getFullYear())
const bCalMonth = ref(bCal.getMonth() + 1)
const bCanPrevMonth = computed(() =>
  bCalYear.value > bCal.getFullYear() || (bCalYear.value === bCal.getFullYear() && bCalMonth.value > bCal.getMonth() + 1))
const bPrevMonth = () => { if (!bCanPrevMonth.value) return; if (bCalMonth.value === 1) { bCalYear.value--; bCalMonth.value = 12 } else bCalMonth.value-- }
const bNextMonth = () => { if (bCalMonth.value === 12) { bCalYear.value++; bCalMonth.value = 1 } else bCalMonth.value++ }
const bCalDays = computed(() => {
  const firstDay = new Date(bCalYear.value, bCalMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(bCalYear.value, bCalMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null, disabled: true })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(bCalMonth.value).padStart(2,'0'), dd = String(d).padStart(2,'0')
    const str = `${bCalYear.value}-${mm}-${dd}`
    days.push({ label: d, date: str, disabled: str <= bTodayStr })
  }
  return days
})
const bDayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.disabled) return 'text-stone-200 cursor-not-allowed'
  if (day.date === bForm.date) return 'font-bold text-white cursor-pointer shadow-sm' + ' bg-teal-600'
  return 'text-stone-700 hover:bg-teal-100 hover:text-teal-800 cursor-pointer'
}

const bDateGuests = ref(0)
const bDateGuestsLoading = ref(false)
const bSelectDate = async (date) => {
  bForm.date = date
  bDateGuests.value = 0
  bDateGuestsLoading.value = true
  try {
    const data = await (await fetch(`${BOOKING_BASE.value}/get/${date}`)).json()
    const bookings = Array.isArray(data) ? data : []
    bDateGuests.value = bookings.reduce((sum, b) => sum + (b.guests || 0), 0)
  } catch { bDateGuests.value = 0 }
  finally { bDateGuestsLoading.value = false }
}
const bSummary = computed(() => [
  { label: '日期', value: bForm.date },
  { label: '時間', value: bForm.time },
  { label: '人數', value: `${bForm.guests} 人` },
  { label: '葷素', value: bDietOptions.find(o => o.value === bForm.diet)?.label || '未指定' },
  ...(bForm.note ? [{ label: '備註', value: bForm.note }] : []),
])
const bNextStep = () => {
  Object.keys(bErrors).forEach(k => delete bErrors[k])
  if (bStep.value === 0 && !bForm.date) { bErrors.date = '請選擇用餐日期'; return }
  if (bStep.value === 1) {
    if (!bForm.name.trim()) bErrors.name = '請輸入姓名'
    if (!bForm.phone.trim()) bErrors.phone = '請輸入聯絡電話'
    if (Object.keys(bErrors).length > 0) return
  }
  if (bStep.value === 2 && !bForm.diet) { bErrors.diet = '請選擇葷素偏好'; return }
  bStep.value++
}
const bSubmit = async () => {
  bSubmitError.value = ''; bSubmitting.value = true
  try {
    const res = await fetch(`${BOOKING_BASE.value}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bForm, status: '待確認' })
    })
    if (!res.ok) throw new Error()
    // 重置表單
    Object.assign(bForm, { name: '', phone: '', date: '', time: '12:00', guests: 2, diet: '', note: '' })
    bStep.value = 0
    alert('訂位已送出！我們將盡快電話確認，謝謝。')
  } catch { bSubmitError.value = '預約送出失敗，請稍後再試或直接來電。' }
  finally { bSubmitting.value = false }
}

// ══ 便當預訂 ══════════════════════════════════════════════════════
const LUNCH_BASE = computed(() => commonStore.data.main_url + '/holy/lunch')
const lStep = ref(0)
const lSteps = ['選擇日期', '填寫資料', '確認送出']
const lForm = reactive({ name: '', phone: '', date: '', time: '12:00', meatQty: 0, vegQty: 0, note: '' })
const lErrors = reactive({})
const lSubmitting = ref(false)
const lSubmitError = ref('')
const lTimeSlots = ['10:00','10:30','11:00','11:30','12:00','12:30','13:00']

const lCal = new Date(); lCal.setHours(0,0,0,0)
const lTodayStr = toDateStr(lCal)
const lCalYear  = ref(lCal.getFullYear())
const lCalMonth = ref(lCal.getMonth() + 1)
const lCanPrevMonth = computed(() =>
  lCalYear.value > lCal.getFullYear() || (lCalYear.value === lCal.getFullYear() && lCalMonth.value > lCal.getMonth() + 1))
const lPrevMonth = () => { if (!lCanPrevMonth.value) return; if (lCalMonth.value === 1) { lCalYear.value--; lCalMonth.value = 12 } else lCalMonth.value-- }
const lNextMonth = () => { if (lCalMonth.value === 12) { lCalYear.value++; lCalMonth.value = 1 } else lCalMonth.value++ }
const lCalDays = computed(() => {
  const firstDay = new Date(lCalYear.value, lCalMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(lCalYear.value, lCalMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null, disabled: true })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(lCalMonth.value).padStart(2,'0'), dd = String(d).padStart(2,'0')
    const str = `${lCalYear.value}-${mm}-${dd}`
    days.push({ label: d, date: str, disabled: str <= lTodayStr })
  }
  return days
})
const lDayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.disabled) return 'text-stone-200 cursor-not-allowed'
  if (day.date === lForm.date) return 'bg-amber-600 text-white font-bold cursor-pointer shadow-sm'
  return 'text-stone-700 hover:bg-amber-100 hover:text-amber-800 cursor-pointer'
}
const lSummary = computed(() => [
  { label: '日期', value: lForm.date },
  { label: '取餐', value: lForm.time },
  { label: '葷食', value: `${lForm.meatQty} 盒` },
  { label: '素食', value: `${lForm.vegQty} 盒` },
  { label: '合計', value: `${lForm.meatQty + lForm.vegQty} 盒` },
  ...(lForm.note ? [{ label: '備註', value: lForm.note }] : []),
])
const lNextStep = () => {
  Object.keys(lErrors).forEach(k => delete lErrors[k])
  if (lStep.value === 0 && !lForm.date) { lErrors.date = '請選擇取餐日期'; return }
  if (lStep.value === 1) {
    if (!lForm.name.trim()) lErrors.name = '請輸入姓名'
    if (!lForm.phone.trim()) lErrors.phone = '請輸入聯絡電話'
    if (lForm.meatQty === 0 && lForm.vegQty === 0) lErrors.qty = '請至少預訂一盒便當'
    if (Object.keys(lErrors).length > 0) return
  }
  lStep.value++
}
const lSubmit = async () => {
  lSubmitError.value = ''; lSubmitting.value = true
  try {
    const res = await fetch(`${LUNCH_BASE.value}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lForm, status: '待確認' })
    })
    if (!res.ok) throw new Error()
    Object.assign(lForm, { name: '', phone: '', date: '', time: '12:00', meatQty: 0, vegQty: 0, note: '' })
    lStep.value = 0
    alert('便當預訂已送出！我們將盡快電話確認，謝謝。')
  } catch { lSubmitError.value = '預訂送出失敗，請稍後再試或直接來電。' }
  finally { lSubmitting.value = false }
}
</script>

<style scoped>
/* 隱藏 number input 的上下箭頭 */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }
</style>
