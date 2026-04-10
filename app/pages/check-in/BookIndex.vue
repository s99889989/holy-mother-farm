<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">田</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">田園餐廳 · 訂位管理</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Holy Mother Farm</p>
          </div>
        </div>
        <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
          <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
          <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
        </span>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="flex flex-col lg:flex-row gap-4 items-start">

        <!-- ── 左欄：日曆（常駐）── -->
        <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 lg:sticky lg:top-20">
            <div class="flex items-center justify-between mb-3">
              <button @click="prevMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <span class="text-base font-semibold text-stone-700 dark:text-stone-100">{{ calendarLabel }}</span>
              <button @click="nextMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
            <div class="grid grid-cols-7 mb-1">
              <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                   class="text-center text-sm text-stone-400 dark:text-stone-500 font-medium py-1">{{ w }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(day, idx) in calendarDays" :key="idx"
                   class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                   :class="dayClass(day)"
                   @click="day.date && selectDate(day.date)">
                <span>{{ day.label }}</span>
                <!-- 訂位紅點 + 便當橘點（雙點並排） -->
                <div v-if="day.date && (markedDates.includes(day.date) || lunchMarkedDates.includes(day.date))"
                     class="absolute bottom-1 flex gap-0.5">
                  <span v-if="markedDates.includes(day.date)" class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  <span v-if="lunchMarkedDates.includes(day.date)" class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
              <span class="text-sm text-stone-500 dark:text-stone-400">
                <span v-if="selectedDate" class="text-stone-700 dark:text-stone-200 font-medium">{{ selectedDate }}</span>
                <span v-else>請選擇日期</span>
              </span>
              <button @click="selectDate(todayStr)" class="text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium">今天</button>
            </div>
          </div>

          <!-- 當日統計（合併訂位+便當） -->
          <div v-if="selectedDate" class="mt-3 space-y-2">
            <div class="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 px-4 py-3">
              <p class="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">🪑 訂位</p>
              <p class="text-sm text-green-700 dark:text-green-300">
                <span class="text-xl font-black">{{ bookings.length }}</span> 筆 ·
                <span class="font-semibold">{{ bookings.reduce((s, b) => s + (b.guests || 0), 0) + recurBookingGuests }}</span> 人
                <span v-if="recurBookingGuests > 0" class="text-xs font-normal opacity-70 ml-1">（含包月 {{ recurBookingGuests }} 人）</span>
              </p>
            </div>
            <div class="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 px-4 py-3">
              <p class="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">🍱 便當</p>
              <p class="text-sm text-orange-700 dark:text-orange-300">
                <span class="text-xl font-black">{{ totalMeat + totalVeg }}</span> 個 ·
                葷 <span class="font-semibold">{{ totalMeat }}</span> / 素 <span class="font-semibold">{{ totalVeg }}</span>
              </p>
            </div>

          </div>
        </div>

        <!-- ══ 右欄 ══ -->
        <div class="flex-1 min-w-0">

          <!-- ─────────── 當日區塊（選日期後顯示）─────────── -->
          <template v-if="selectedDate">

            <!-- 當日標題 -->
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">{{ selectedDate }} 明細</h2>
            </div>

            <!-- ── 訂位 ── -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-green-500"></span> 訂位
                </p>
                <button @click="openBookingModal(null)"
                        class="flex items-center gap-1 px-3 py-1 bg-green-800 text-white text-xs rounded-lg hover:bg-green-900 transition-colors">
                  <span class="leading-none">+</span> 新增
                </button>
              </div>
              <div class="space-y-2">
                <div v-if="bookings.length === 0"
                     class="bg-white dark:bg-zinc-900 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 text-center text-stone-400 text-sm">
                  今天還沒有訂位
                </div>
                <div v-for="booking in bookings" :key="booking.id"
                     class="bg-white dark:bg-zinc-900 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
                  <div class="flex items-stretch">
                    <div class="w-16 flex-shrink-0 bg-stone-50 dark:bg-zinc-800 flex flex-col items-center justify-center border-r border-stone-200 dark:border-stone-700 py-3">
                      <span class="text-xs text-stone-400 uppercase tracking-wide">TIME</span>
                      <span class="text-lg font-black text-stone-700 dark:text-stone-100 leading-tight mt-0.5">{{ booking.time }}</span>
                    </div>
                    <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-stone-800 dark:text-stone-100">{{ booking.name }}</span>
                          <button @click="toggleBookingStatus(booking)"
                                  :class="booking.status === '已確認' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200'"
                                  class="px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-colors">{{ booking.status }}</button>
                        </div>
                        <div class="flex flex-wrap gap-2 mt-1 text-xs text-stone-500 dark:text-stone-400">
                          <span>👥 {{ booking.guests }} 人</span>
                          <span>📞 {{ booking.phone }}</span>
                          <span v-if="booking.note">💬 {{ booking.note }}</span>
                        </div>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <button @click="openBookingModal(booking)" class="px-2.5 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">編輯</button>
                        <button @click="confirmDeleteBooking(booking)" class="px-2.5 py-1 text-xs border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors">刪除</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── 便當 ── -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-orange-400"></span> 便當
                  <span v-if="lunchOrders.length > 0" class="text-orange-600 dark:text-orange-400 normal-case">
                    葷 {{ totalMeat }} / 素 {{ totalVeg }}
                  </span>
                </p>
                <button @click="openLunchModal(null)"
                        class="flex items-center gap-1 px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors">
                  <span class="leading-none">+</span> 新增
                </button>
              </div>
              <div class="space-y-2">
                <div v-if="lunchOrders.length === 0"
                     class="bg-white dark:bg-zinc-900 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 text-center text-stone-400 text-sm">
                  今天還沒有便當訂單
                </div>
                <div v-for="order in lunchOrders" :key="order.id"
                     class="bg-white dark:bg-zinc-900 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
                  <div class="flex items-stretch">
                    <div class="w-16 flex-shrink-0 bg-orange-50 dark:bg-orange-900/20 flex flex-col items-center justify-center border-r border-orange-100 dark:border-orange-800/30 py-3">
                      <span class="text-xs text-orange-400 uppercase tracking-wide">取餐</span>
                      <span class="text-sm font-black text-orange-700 dark:text-orange-300 leading-tight mt-0.5 text-center">{{ order.time }}</span>
                    </div>
                    <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-stone-800 dark:text-stone-100">{{ order.name }}</span>
                          <button @click="toggleLunchStatus(order)"
                                  :class="order.status === '已確認' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200'"
                                  class="px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-colors">{{ order.status }}</button>
                        </div>
                        <div class="flex flex-wrap gap-2 mt-1 text-xs text-stone-500 dark:text-stone-400">
                          <span :class="order.dietType === '素食' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'"
                                class="px-1.5 py-0.5 rounded-full font-medium">{{ order.dietType }}</span>
                          <span>× {{ order.quantity }}</span>
                          <span>📞 {{ order.phone }}</span>
                          <span v-if="order.note">💬 {{ order.note }}</span>
                        </div>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <button @click="openLunchModal(order)" class="px-2.5 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">編輯</button>
                        <button @click="confirmDeleteLunch(order)" class="px-2.5 py-1 text-xs border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors">刪除</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </template>
          <div v-else class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-12 text-center text-stone-400 text-sm shadow-sm">
            請從左側日曆選擇日期
          </div>

          <!-- ─────────── 當月預定 ─────────── -->
          <div class="mt-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
                當月預定
                <span class="text-stone-400 dark:text-stone-500 normal-case font-normal">{{ calYear }}年{{ calMonth }}月</span>
              </p>
              <button @click="openRecurModal(null)"
                      class="flex items-center gap-1 px-3 py-1 bg-green-800 text-white text-xs rounded-lg hover:bg-green-900 transition-colors">
                <span class="leading-none">+</span> 新增
              </button>
            </div>
            <div class="space-y-2">
              <div v-if="recurringRules.length === 0"
                   class="bg-white dark:bg-zinc-900 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 text-center text-stone-400 text-sm">
                本月尚無預定
              </div>
              <div v-for="rule in recurringRules" :key="rule.id"
                   class="bg-white dark:bg-zinc-900 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm overflow-hidden">
                <div class="flex items-stretch">
                  <div class="w-16 flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/20 flex flex-col items-center justify-center border-r border-indigo-100 dark:border-indigo-800/30 py-3">
                    <span class="text-xs text-indigo-400 uppercase tracking-wide">包月</span>
                    <span class="text-sm font-black text-indigo-600 dark:text-indigo-300 leading-tight mt-0.5 text-center">{{ rule.time }}</span>
                  </div>
                  <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class="font-bold text-stone-800 dark:text-stone-100">{{ rule.name }}</span>
                        <span :class="rule.type === 'lunch' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
                              class="px-2 py-0.5 rounded-full text-xs font-medium">{{ rule.type === 'lunch' ? '便當' : '訂位' }}</span>
                      </div>
                      <div class="flex flex-wrap gap-2 text-xs text-stone-500 dark:text-stone-400">
                        <span>👥 {{ rule.guests }} 人</span>
                        <span v-if="rule.weekdays && rule.weekdays.length > 0" class="flex items-center gap-0.5">
                          <span v-for="dow in [0,1,2,3,4,5,6]" :key="dow"
                                :class="rule.weekdays.includes(dow)
                                  ? (dow === 0 || dow === 6 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')
                                  : 'text-stone-200 dark:text-stone-700'"
                                class="w-5 h-5 rounded text-center leading-5 font-medium">{{ ['日','一','二','三','四','五','六'][dow] }}</span>
                        </span>
                        <span v-else class="text-stone-300 dark:text-stone-600 italic">每天</span>
                        <span v-if="rule.note" class="italic">{{ rule.note }}</span>
                      </div>
                    </div>
                    <div class="flex gap-1.5 flex-shrink-0">
                      <button @click="openRecurModal(rule)" class="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">編輯</button>
                      <button @click="deleteRecurring(rule.id)" class="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors">刪除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ════════ 行事曆單日編輯 Modal ════════ -->
    <div v-if="schedModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">
            {{ schedModal.date }}
            <span class="text-sm font-normal text-stone-400 ml-1">{{ ['日','一','二','三','四','五','六'][new Date(schedModal.date).getDay()] }}</span>
          </h3>
          <button @click="schedModal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300">活動開啟</label>
            <button @click="schedModal.data.enabled = schedModal.data.enabled === false ? null : false"
                    :class="schedModal.data.enabled !== false ? 'bg-teal-500' : 'bg-stone-300 dark:bg-zinc-600'"
                    class="relative w-10 h-5 rounded-full transition-colors">
              <span :class="schedModal.data.enabled !== false ? 'translate-x-5' : 'translate-x-0.5'"
                    class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"></span>
            </button>
          </div>
          <template v-if="schedModal.data.enabled !== false">
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">活動名稱 <span class="text-xs text-stone-400">（空白套用預設）</span></label>
              <input v-model="schedModal.data.activity" :placeholder="schedDefault.activity||'康樂'"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">人數</label>
                <input v-model="schedModal.data.count" :placeholder="schedDefault.count||''"
                       class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">時間</label>
                <input v-model="schedModal.data.time" :placeholder="schedDefault.time||''"
                       class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            </div>
          </template>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">節假日</label>
            <input v-model="schedModal.data.holiday" placeholder="清明節、母親節…"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">特殊備註</label>
            <textarea v-model="schedModal.data.note" rows="2" placeholder="東特、特殊事項…"
                      class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="clearSchedDay" class="px-3 py-2.5 text-xs border border-stone-200 dark:border-stone-700 text-stone-500 rounded-xl hover:bg-stone-50 transition-colors">重設預設</button>
          <button @click="schedModal.show = false" class="flex-1 px-4 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="saveSchedDay" class="flex-1 px-4 py-2.5 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors">儲存</button>
        </div>
      </div>
    </div>
    <div v-if="bookingModal.show" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-bold text-stone-800 dark:text-stone-100 mb-4">{{ bookingModal.isNew ? '新增訂位' : '編輯訂位' }}</h3>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">客戶名稱 *</label>
              <input v-model="bForm.name" placeholder="請輸入姓名"
                     class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">連絡電話</label>
              <input v-model="bForm.phone" placeholder="09xx-xxx-xxx" type="tel"
                     class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">人數</label>
              <input v-model.number="bForm.guests" type="number" min="1"
                     class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">用餐時間</label>
              <select v-model="bForm.time"
                      class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">狀態</label>
            <div class="flex gap-3">
              <label v-for="s in ['待確認','已確認','已取消']" :key="s" class="flex items-center gap-2 cursor-pointer text-sm text-stone-600 dark:text-stone-300">
                <input type="radio" v-model="bForm.status" :value="s" class="accent-green-700" /> {{ s }}
              </label>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">備註</label>
            <textarea v-model="bForm.note" rows="3" placeholder="特殊需求、過敏原等"
                      class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="bookingModal.show = false" class="flex-1 px-4 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="saveBooking" :disabled="!bForm.name" class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 disabled:opacity-50 transition-colors">
            {{ bookingModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ 便當 Modal ════════ -->
    <div v-if="lunchModal.show" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-bold text-stone-800 dark:text-stone-100 mb-4">{{ lunchModal.isNew ? '新增便當訂單' : '編輯便當訂單' }}</h3>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">訂購人 *</label>
              <input v-model="lForm.name" placeholder="姓名"
                     class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">聯絡電話</label>
              <input v-model="lForm.phone" placeholder="09xx-xxx-xxx" type="tel"
                     class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          <!-- 葷素數量 -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 border border-red-200 dark:border-red-800/30">
              <label class="text-sm font-medium text-red-700 dark:text-red-400 block mb-1">🥩 葷食數量</label>
              <input v-model.number="lForm.meatQty" type="number" min="0"
                     class="w-full bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-800/50 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-center text-lg font-bold" />
            </div>
            <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 border border-green-200 dark:border-green-800/30">
              <label class="text-sm font-medium text-green-700 dark:text-green-400 block mb-1">🥦 素食數量</label>
              <input v-model.number="lForm.vegQty" type="number" min="0"
                     class="w-full bg-white dark:bg-zinc-800 border border-green-200 dark:border-green-800/50 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center text-lg font-bold" />
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">取餐時間</label>
            <select v-model="lForm.time"
                    class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option v-for="t in lunchTimeSlots" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">狀態</label>
            <div class="flex gap-3 flex-wrap">
              <label v-for="s in ['待確認','已確認','已取餐','已取消']" :key="s" class="flex items-center gap-2 cursor-pointer text-sm text-stone-600 dark:text-stone-300">
                <input type="radio" v-model="lForm.status" :value="s" class="accent-orange-500" /> {{ s }}
              </label>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">備註</label>
            <textarea v-model="lForm.note" rows="2" placeholder="特殊要求"
                      class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="lunchModal.show = false" class="flex-1 px-4 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="saveLunch" :disabled="!lForm.name || (lForm.meatQty === 0 && lForm.vegQty === 0)"
                  class="flex-1 px-4 py-2.5 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors">
            {{ lunchModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ 當月預定 Modal ════════ -->
    <div v-if="recurModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-stone-800 dark:text-stone-100">{{ recurModal.isNew ? '新增當月預定' : '編輯當月預定' }}</h3>
            <p class="text-xs text-stone-400 mt-0.5">{{ calYear }}年{{ calMonth }}月</p>
          </div>
          <button @click="recurModal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="space-y-3">
          <!-- 名稱 -->
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">名稱 / 機構 *</label>
            <input v-model="recurForm.name" placeholder="員工餐、康樂區…"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <!-- 類型 -->
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">類型</label>
            <div class="flex gap-2">
              <button @click="recurForm.type = 'booking'"
                      :class="recurForm.type === 'booking' ? 'bg-green-700 text-white' : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-stone-400'"
                      class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors">訂位</button>
              <button @click="recurForm.type = 'lunch'"
                      :class="recurForm.type === 'lunch' ? 'bg-orange-500 text-white' : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-stone-400'"
                      class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors">便當</button>
            </div>
          </div>
          <!-- 時間 + 人數 -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">用餐時段</label>
              <select v-model="recurForm.time"
                      class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-400">
                <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">人數</label>
              <input v-model.number="recurForm.guests" type="number" min="1"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <!-- 備註 -->
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">備註</label>
            <input v-model="recurForm.note" placeholder="特殊需求、注意事項…"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <!-- 適用星期 -->
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">
              適用星期
              <span class="text-xs text-stone-400 font-normal ml-1">（不選代表每天）</span>
            </label>
            <div class="flex gap-1.5">
              <button v-for="(label, dow) in ['日','一','二','三','四','五','六']" :key="dow"
                      type="button"
                      @click="recurForm.weekdays.includes(dow) ? recurForm.weekdays.splice(recurForm.weekdays.indexOf(dow), 1) : recurForm.weekdays.push(dow)"
                      :class="recurForm.weekdays.includes(dow)
                        ? (dow === 0 || dow === 6 ? 'bg-red-500 text-white border-red-500' : 'bg-green-700 text-white border-green-700')
                        : 'bg-white dark:bg-zinc-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'"
                      class="flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors">
                {{ label }}
              </button>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="recurModal.show = false"
                  class="flex-1 px-4 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="saveRecurring" :disabled="!recurForm.name"
                  class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 disabled:opacity-50 transition-colors">儲存</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'
const commonStore = useCommonStore()
const BASE       = computed(() => commonStore.data.main_url + '/holy/booking')
const LUNCH_BASE = computed(() => commonStore.data.main_url + '/holy/lunch')

// ── 固定預訂規則面板開關
const showRecurPanel = ref(false)

// ── 共用日曆 ──────────────────────────────────────────────────────
const apiOnline    = ref(false)
const selectedDate = ref('')
const today        = new Date()
const todayStr     = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const calYear      = ref(today.getFullYear())
const calMonth     = ref(today.getMonth() + 1)

const calendarLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)
const yearMonth     = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2,'0')}`)

const calendarDays = computed(() => {
  const firstDay    = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2,'0'), dd = String(d).padStart(2,'0')
    days.push({ label: d, date: `${calYear.value}-${mm}-${dd}` })
  }
  return days
})

const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-green-700 text-white font-bold shadow-sm'
  if (day.date === todayStr)           return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold hover:bg-green-200'
  return 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
}

const prevMonth = () => {
  if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value--
  fetchMarkedDates(); fetchSchedule(); fetchRecurring()
}
const nextMonth = () => {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
  fetchMarkedDates(); fetchSchedule(); fetchRecurring()
}

const selectDate = async (date) => {
  selectedDate.value = date
  await Promise.all([fetchBookings(), fetchLunchOrders()])
}


// ── 訂位 ──────────────────────────────────────────────────────────
const bookings    = ref([])
const markedDates = ref([])
const timeSlots   = ['11:00', '11:10', '11:20', '11:30', '11:40', '11:50', '12:00', '12:10', '12:20', '12:30', '12:40', '12:50', '13:00']

const bookingModal = reactive({ show: false, isNew: true })
const bForm = reactive({ id:'', date:'', name:'', phone:'', guests:2, time:'12:00', status:'待確認', note:'' })

const openBookingModal = (booking) => {
  bookingModal.isNew = !booking
  Object.assign(bForm, booking ?? { id:'', date: selectedDate.value, name:'', phone:'', guests:2, time:'12:00', status:'待確認', note:'' })
  bookingModal.show = true
}

const fetchMarkedDates = async () => {
  try {
    const [bRes, lRes] = await Promise.all([
      fetch(`${BASE.value}/dates/${yearMonth.value}`),
      fetch(`${LUNCH_BASE.value}/dates/${yearMonth.value}`)
    ])
    if (bRes.ok) markedDates.value = await bRes.json()
    if (lRes.ok) lunchMarkedDates.value = await lRes.json()
    apiOnline.value = true
  } catch { apiOnline.value = false }
}

const fetchBookings = async () => {
  if (!selectedDate.value) return
  bookings.value = await (await fetch(`${BASE.value}/get/${selectedDate.value}`)).json()
}

const saveBooking = async () => {
  if (!bForm.name) return
  if (bookingModal.isNew) {
    const saved = await (await fetch(`${BASE.value}/save`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...bForm, date: selectedDate.value }) })).json()
    bookings.value.push(saved)
    bookings.value.sort((a,b) => a.time.localeCompare(b.time))
    if (!markedDates.value.includes(selectedDate.value)) markedDates.value.push(selectedDate.value)
    showToast('訂位已新增')
  } else {
    await fetch(`${BASE.value}/update`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(bForm) })
    await fetchBookings()
    showToast('訂位已更新')
  }
  bookingModal.show = false
}

const confirmDeleteBooking = async (b) => {
  if (!confirm(`確定刪除「${b.name}」的訂位？`)) return
  await fetch(`${BASE.value}/remove/${b.date}/${b.id}`, { method:'DELETE' })
  bookings.value = bookings.value.filter(x => x.id !== b.id)
  if (!bookings.value.length) markedDates.value = markedDates.value.filter(d => d !== selectedDate.value)
  showToast('訂位已刪除')
}

const toggleBookingStatus = async (b) => {
  const next = b.status === '已確認' ? '待確認' : '已確認'
  await fetch(`${BASE.value}/status/${b.date}/${b.id}?status=${encodeURIComponent(next)}`, { method:'PATCH' })
  b.status = next
  showToast(`狀態已更新為「${next}」`)
}

// ── 便當 ──────────────────────────────────────────────────────────
const lunchOrders      = ref([])
const lunchMarkedDates = ref([])
const lunchTimeSlots   = ['10:00','10:30','11:00','11:30','12:00','12:30','13:00']

const lunchModal = reactive({ show: false, isNew: true })
const lForm = reactive({ id:'', date:'', name:'', phone:'', meatQty:0, vegQty:0, time:'12:00', status:'待確認', note:'' })

const totalMeat = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.meatQty) || 0), 0))
const totalVeg  = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.vegQty)  || 0), 0))

const recurBookingGuests = computed(() => {
  if (!selectedDate.value) return 0
  const dow = new Date(selectedDate.value).getDay()
  return recurringRules.value
    .filter(r => r.type !== 'lunch' &&
      (!r.weekdays || r.weekdays.length === 0 || r.weekdays.includes(dow)))
    .reduce((s, r) => s + (r.guests || 0), 0)
})

const openLunchModal = (order) => {
  lunchModal.isNew = !order
  Object.assign(lForm, order ?? { id:'', date: selectedDate.value, name:'', phone:'', meatQty:0, vegQty:0, time:'12:00', status:'待確認', note:'' })
  lunchModal.show = true
}

const fetchLunchOrders = async () => {
  if (!selectedDate.value) return
  lunchOrders.value = await (await fetch(`${LUNCH_BASE.value}/get/${selectedDate.value}`)).json()
}

const saveLunch = async () => {
  if (!lForm.name) return
  if (lunchModal.isNew) {
    const saved = await (await fetch(`${LUNCH_BASE.value}/save`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...lForm, date: selectedDate.value }) })).json()
    lunchOrders.value.push(saved)
    lunchOrders.value.sort((a,b) => a.time.localeCompare(b.time))
    if (!lunchMarkedDates.value.includes(selectedDate.value)) lunchMarkedDates.value.push(selectedDate.value)
    showToast('便當訂單已新增')
  } else {
    await fetch(`${LUNCH_BASE.value}/update`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(lForm) })
    await fetchLunchOrders()
    showToast('便當訂單已更新')
  }
  lunchModal.show = false
}

const confirmDeleteLunch = async (o) => {
  if (!confirm(`確定刪除「${o.name}」的便當訂單？`)) return
  await fetch(`${LUNCH_BASE.value}/remove/${o.date}/${o.id}`, { method:'DELETE' })
  lunchOrders.value = lunchOrders.value.filter(x => x.id !== o.id)
  if (!lunchOrders.value.length) lunchMarkedDates.value = lunchMarkedDates.value.filter(d => d !== selectedDate.value)
  showToast('便當訂單已刪除')
}

const toggleLunchStatus = async (o) => {
  const next = o.status === '已確認' ? '待確認' : '已確認'
  await fetch(`${LUNCH_BASE.value}/status/${o.date}/${o.id}?status=${encodeURIComponent(next)}`, { method:'PATCH' })
  o.status = next
  showToast(`狀態已更新為「${next}」`)
}

// ── 當月預定 ──────────────────────────────────────────────────────
const RECUR_BASE     = computed(() => commonStore.data.main_url + '/holy/recurring')
const recurringRules = ref([])
const recurModal     = reactive({ show: false, isNew: true })
const recurForm      = reactive({ id: '', name: '', type: 'booking', time: '12:00', guests: 2, note: '', weekdays: [] })

// 依目前月份載入當月預定
const fetchRecurring = async () => {
  try {
    const ym = `${calYear.value}-${String(calMonth.value).padStart(2,'0')}`
    recurringRules.value = await (await fetch(`${RECUR_BASE.value}/list/${ym}`)).json()
  } catch (e) { console.error(e) }
}

const openRecurModal = (rule) => {
  recurModal.isNew = !rule
  if (rule) {
    Object.assign(recurForm, { id: rule.id, name: rule.name, type: rule.type || 'booking', time: rule.time || '12:00', guests: rule.guests || 2, note: rule.note || '', weekdays: rule.weekdays ? [...rule.weekdays] : [] })
  } else {
    Object.assign(recurForm, { id: '', name: '', type: 'booking', time: '12:00', guests: 2, note: '', weekdays: [] })
  }
  recurModal.show = true
}

const saveRecurring = async () => {
  if (!recurForm.name) return
  const ym = `${calYear.value}-${String(calMonth.value).padStart(2,'0')}`
  try {
    const saved = await (await fetch(`${RECUR_BASE.value}/save/${ym}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...recurForm })
    })).json()
    if (recurModal.isNew) recurringRules.value.push(saved)
    else { const idx = recurringRules.value.findIndex(r => r.id === saved.id); if (idx >= 0) recurringRules.value[idx] = saved }
    recurModal.show = false
    showToast(recurModal.isNew ? '已新增' : '已更新')
  } catch { showToast('儲存失敗') }
}

const deleteRecurring = async (id) => {
  if (!confirm('確定刪除此預定？')) return
  const ym = `${calYear.value}-${String(calMonth.value).padStart(2,'0')}`
  try {
    await fetch(`${RECUR_BASE.value}/remove/${ym}/${id}`, { method: 'DELETE' })
    recurringRules.value = recurringRules.value.filter(r => r.id !== id)
    showToast('已刪除')
  } catch { showToast('刪除失敗') }
}
const SCHED_BASE       = computed(() => commonStore.data.main_url + '/holy/schedule')
const schedSettingsOpen = ref(false)
const schedDefault     = reactive({ activity: '康樂', count: '', time: '', enabled: true })
const schedNotes       = ref('')
const schedDayData     = ref({})
const schedModal       = reactive({ show: false, date: '', data: { activity: '', count: '', time: '', note: '', holiday: '', enabled: null } })

const schedYearMonth = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2,'0')}`)
const schedFirstDay  = computed(() => new Date(calYear.value, calMonth.value - 1, 1).getDay())
const schedTotalDays = computed(() => new Date(calYear.value, calMonth.value, 0).getDate())

const schedDays = computed(() => {
  const days = []
  for (let d = 1; d <= schedTotalDays.value; d++) {
    const mm = String(calMonth.value).padStart(2,'0')
    const dd = String(d).padStart(2,'0')
    const date = `${calYear.value}-${mm}-${dd}`
    const dow  = new Date(calYear.value, calMonth.value - 1, d).getDay()
    const custom = schedDayData.value[date] || {}
    const enabled = custom.enabled !== undefined && custom.enabled !== null ? custom.enabled : schedDefault.enabled
    days.push({
      d, date, dow,
      isToday:      date === todayStr,
      hasCustom:    Object.keys(custom).length > 0,
      showActivity: enabled,
      activity:     custom.activity || schedDefault.activity,
      count:        custom.count    || schedDefault.count,
      time:         custom.time     || schedDefault.time,
      note:         custom.note     || '',
      holiday:      custom.holiday  || '',
      // 訂位數量
      bookingCount: markedDates.value.includes(date) ? 1 : 0,
      lunchCount:   lunchMarkedDates.value.includes(date) ? 1 : 0,
      // 固定預訂
      recurItems:   recurExpand.value[date] || [],
      // 人數加總：訂位 + 固定預訂
      get totalGuests() {
        const bookingGuests = 0  // markedDates 只知道有沒有，實際人數需點擊後才知道
        const recurGuests = (recurExpand.value[date] || []).reduce((s, r) => s + (r.guests || 0), 0)
        return recurGuests
      }
    })
  }
  return days
})

const schedSelectedDate = ref('')
const schedDayBookings  = ref([])
const schedDayLunch     = ref([])
const schedDayRecur     = computed(() => recurExpand.value[schedSelectedDate.value] || [])

const schedDayTotalGuests = computed(() => {
  const bookingGuests = schedDayBookings.value.reduce((s, b) => s + (Number(b.guests) || 0), 0)
  const recurGuests   = schedDayRecur.value.reduce((s, r) => s + (Number(r.guests) || 0), 0)
  return bookingGuests + recurGuests
})

const selectSchedDate = async (date) => {
  schedSelectedDate.value = date
  try {
    const [bRes, lRes] = await Promise.all([
      fetch(`${BASE.value}/get/${date}`),
      fetch(`${LUNCH_BASE.value}/get/${date}`)
    ])
    schedDayBookings.value = bRes.ok ? await bRes.json() : []
    schedDayLunch.value    = lRes.ok ? await lRes.json() : []
  } catch (e) { console.error(e) }
}
const fetchSchedule = async () => {
  try {
    const ym = schedYearMonth.value
    // 同時載入行事曆設定、訂位標記、便當標記、固定預訂
    const [schedRes, bookDates, lunchDates, recurRes] = await Promise.all([
      fetch(`${SCHED_BASE.value}/get/${ym}`),
      fetch(`${BASE.value}/dates/${ym}`),
      fetch(`${LUNCH_BASE.value}/dates/${ym}`),
      fetch(`${RECUR_BASE.value}/expand/${ym}`)
    ])
    if (schedRes.ok) {
      const data = await schedRes.json()
      const d = data.default || {}
      schedDefault.activity = d.activity ?? '康樂'
      schedDefault.count    = d.count    ?? ''
      schedDefault.time     = d.time     ?? ''
      schedDefault.enabled  = d.enabled  !== false
      schedNotes.value      = data.notes || ''
      schedDayData.value    = data.days  || {}
    }
    if (bookDates.ok) markedDates.value = await bookDates.json()
    if (lunchDates.ok) lunchMarkedDates.value = await lunchDates.json()
    if (recurRes.ok) recurExpand.value = await recurRes.json()
  } catch (e) { console.error(e) }
}

const saveSchedDefault = async () => {
  try {
    await fetch(`${SCHED_BASE.value}/default/${schedYearMonth.value}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...schedDefault, notes: schedNotes.value })
    })
    await fetch(`${SCHED_BASE.value}/notes/${schedYearMonth.value}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedNotes.value)
    })
    showToast('預設值已儲存')
    schedSettingsOpen.value = false
  } catch { showToast('儲存失敗') }
}

const openSchedModal = (day) => {
  const custom = schedDayData.value[day.date] || {}
  schedModal.date = day.date
  schedModal.data = { activity: custom.activity||'', count: custom.count||'', time: custom.time||'', note: custom.note||'', holiday: custom.holiday||'', enabled: custom.enabled !== undefined ? custom.enabled : null }
  schedModal.show = true
}

const saveSchedDay = async () => {
  try {
    await fetch(`${SCHED_BASE.value}/day/${schedModal.date}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...schedModal.data})
    })
    const d = Object.fromEntries(Object.entries({...schedModal.data}).filter(([, v]) => v !== '' && v !== null))
    if (Object.keys(d).length > 0) schedDayData.value = {...schedDayData.value, [schedModal.date]: d}
    else {
      const nd = {...schedDayData.value};
      delete nd[schedModal.date];
      schedDayData.value = nd
    }
    schedModal.show = false;
    showToast('已儲存')
  } catch {
    showToast('儲存失敗')
  }
}

const clearSchedDay = async () => {
  try {
    await fetch(`${SCHED_BASE.value}/day/${schedModal.date}`, {method: 'DELETE'})
    const nd = {...schedDayData.value};
    delete nd[schedModal.date];
    schedDayData.value = nd
    schedModal.show = false;
    showToast('已重設為預設')
  } catch {
    showToast('操作失敗')
  }
}
const toast = reactive({show: false, message: ''})
const showToast = (msg) => {
  toast.message = msg;
  toast.show = true;
  setTimeout(() => toast.show = false, 2500)
}

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchMarkedDates(), fetchSchedule(), fetchRecurring()])
  selectedDate.value = todayStr
  await Promise.all([fetchBookings(), fetchLunchOrders()])
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
