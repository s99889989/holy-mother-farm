<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between mb-2">
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
      <!-- 頁籤 -->
      <div class="flex gap-1">
        <button v-for="tab in tabs" :key="tab.key" @click="switchTab(tab.key)"
                :class="activeTab === tab.key ? 'bg-green-800 text-white' : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-zinc-700'"
                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
          {{ tab.label }}
        </button>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="flex flex-col lg:flex-row gap-4 items-start">

        <!-- ── 左欄：日曆（兩個 tab 共用）── -->
        <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 lg:sticky lg:top-24">
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
                <!-- 訂位紅點 -->
                <span v-if="day.date && activeTab === 'booking' && markedDates.includes(day.date)"
                      class="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <!-- 便當橘點 -->
                <span v-if="day.date && activeTab === 'lunch' && lunchMarkedDates.includes(day.date)"
                      class="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-orange-400"></span>
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

          <!-- 當日統計 -->
          <div v-if="selectedDate && activeTab === 'booking'" class="mt-3 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-4">
            <p class="text-sm text-green-700 dark:text-green-300 font-medium">
              {{ selectedDate }} 共 <span class="text-lg font-bold">{{ bookings.length }}</span> 筆訂位
            </p>
            <p class="text-sm text-green-600 dark:text-green-400 mt-0.5">
              共 <span class="font-semibold">{{ bookings.reduce((s, b) => s + b.guests, 0) }}</span> 人
            </p>
          </div>
          <div v-if="selectedDate && activeTab === 'lunch'" class="mt-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 p-4">
            <p class="text-sm text-orange-700 dark:text-orange-300 font-medium">
              {{ selectedDate }} 共 <span class="text-lg font-bold">{{ lunchOrders.length }}</span> 筆便當
            </p>
            <p class="text-sm text-orange-600 dark:text-orange-400 mt-0.5">
              共 <span class="font-semibold">{{ lunchOrders.reduce((s, o) => s + (Number(o.meatQty)||0) + (Number(o.vegQty)||0), 0) }}</span> 個
            </p>
          </div>
        </div>

        <!-- ══ 右欄 ══ -->
        <div class="flex-1 min-w-0">

          <!-- ── Tab 1：訂位 ── -->
          <template v-if="activeTab === 'booking'">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">
                {{ selectedDate ? selectedDate + ' 訂位明細' : '請選擇日期' }}
              </h2>
              <button v-if="selectedDate" @click="openBookingModal(null)"
                      class="flex items-center gap-1 px-3 py-1.5 bg-green-800 text-white text-sm rounded-lg hover:bg-green-900 transition-colors">
                <span class="text-base leading-none">+</span> 新增訂位
              </button>
            </div>

            <div v-if="selectedDate" class="space-y-3">
              <div v-if="bookings.length === 0"
                   class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-10 text-center text-stone-400 text-sm shadow-sm">
                今天還沒有訂位紀錄
              </div>
              <div v-for="booking in bookings" :key="booking.id"
                   class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
                <div class="flex items-stretch">
                  <div class="w-20 flex-shrink-0 bg-stone-50 dark:bg-zinc-800 flex flex-col items-center justify-center border-r border-stone-200 dark:border-stone-700 py-4">
                    <span class="text-xs text-stone-400 uppercase tracking-wide">TIME</span>
                    <span class="text-xl font-black text-stone-700 dark:text-stone-100 leading-tight mt-0.5">{{ booking.time }}</span>
                  </div>
                  <div class="flex-1 px-4 py-3">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-stone-800 dark:text-stone-100 text-base">{{ booking.name }}</span>
                          <button @click="toggleBookingStatus(booking)"
                                  :class="booking.status === '已確認' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200'"
                                  class="px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-colors">
                            {{ booking.status }}
                          </button>
                        </div>
                        <div class="flex flex-wrap gap-3 mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                          <span>👥 {{ booking.guests }} 人</span>
                          <span>📞 {{ booking.phone }}</span>
                          <span v-if="booking.note" class="text-stone-400">💬 {{ booking.note }}</span>
                        </div>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <button @click="openBookingModal(booking)"
                                class="px-2.5 py-1 text-sm border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">編輯</button>
                        <button @click="confirmDeleteBooking(booking)"
                                class="px-2.5 py-1 text-sm border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors">刪除</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-12 text-center text-stone-400 text-sm shadow-sm">
              請從左側日曆選擇日期
            </div>
          </template>

          <!-- ── Tab 2：便當訂購 ── -->
          <template v-if="activeTab === 'lunch'">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">
                {{ selectedDate ? selectedDate + ' 便當訂單' : '請選擇日期' }}
              </h2>
              <div class="flex gap-2">
                <button @click="showTypeManager = true"
                        class="px-3 py-1.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors">
                  管理種類
                </button>
                <button v-if="selectedDate" @click="openLunchModal(null)"
                        class="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors">
                  <span class="text-base leading-none">+</span> 新增便當
                </button>
              </div>
            </div>

            <!-- 統計摘要 -->
            <div v-if="selectedDate && lunchOrders.length > 0" class="grid grid-cols-3 gap-2 mb-4">
              <div class="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/30 p-3 text-center">
                <p class="text-xl font-bold text-red-600 dark:text-red-400">{{ totalMeat }}</p>
                <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">🥩 葷食</p>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/30 p-3 text-center">
                <p class="text-xl font-bold text-green-600 dark:text-green-400">{{ totalVeg }}</p>
                <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">🥦 素食</p>
              </div>
              <div class="bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800/30 p-3 text-center">
                <p class="text-xl font-bold text-orange-600 dark:text-orange-400">{{ totalMeat + totalVeg }}</p>
                <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">合計</p>
              </div>
            </div>

            <div v-if="selectedDate" class="space-y-3">
              <div v-if="lunchOrders.length === 0"
                   class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-10 text-center text-stone-400 text-sm shadow-sm">
                今天還沒有便當訂單
              </div>
              <div v-for="order in lunchOrders" :key="order.id"
                   class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
                <div class="flex items-stretch">
                  <!-- 取餐時間 -->
                  <div class="w-20 flex-shrink-0 bg-orange-50 dark:bg-orange-900/20 flex flex-col items-center justify-center border-r border-orange-100 dark:border-orange-800/30 py-4">
                    <span class="text-xs text-orange-400 uppercase tracking-wide">取餐</span>
                    <span class="text-base font-black text-orange-700 dark:text-orange-300 leading-tight mt-0.5 text-center">{{ order.time }}</span>
                  </div>
                  <div class="flex-1 px-4 py-3">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-stone-800 dark:text-stone-100 text-base">{{ order.name }}</span>
                          <button @click="toggleLunchStatus(order)"
                                  :class="order.status === '已確認' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200'"
                                  class="px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-colors">
                            {{ order.status }}
                          </button>
                        </div>
                        <div class="flex flex-wrap gap-2 mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                          <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            {{ order.boxType }}
                          </span>
                          <span :class="order.dietType === '素食' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'"
                                class="px-2 py-0.5 rounded-full text-xs font-medium">{{ order.dietType }}</span>
                          <span class="font-semibold text-stone-700 dark:text-stone-200">× {{ order.quantity }}</span>
                          <span>📞 {{ order.phone }}</span>
                          <span v-if="order.note" class="text-stone-400">💬 {{ order.note }}</span>
                        </div>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <button @click="openLunchModal(order)"
                                class="px-2.5 py-1 text-sm border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">編輯</button>
                        <button @click="confirmDeleteLunch(order)"
                                class="px-2.5 py-1 text-sm border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors">刪除</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-12 text-center text-stone-400 text-sm shadow-sm">
              請從左側日曆選擇日期
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ════════ 訂位 Modal ════════ -->
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
              <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">連絡電話 *</label>
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
          <button @click="saveBooking" :disabled="!bForm.name || !bForm.phone" class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 disabled:opacity-50 transition-colors">
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

// ── 頁籤 ──────────────────────────────────────────────────────────
const tabs      = [{ key: 'booking', label: '訂位' }, { key: 'lunch', label: '便當訂購' }]
const activeTab = ref('booking')

const switchTab = async (key) => {
  activeTab.value = key
  await fetchMarkedDates()
  if (selectedDate.value) {
    if (key === 'booking') await fetchBookings()
    if (key === 'lunch')   await fetchLunchOrders()
  }
}

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
  fetchMarkedDates()
}
const nextMonth = () => {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
  fetchMarkedDates()
}

const selectDate = async (date) => {
  selectedDate.value = date
  if (activeTab.value === 'booking') await fetchBookings()
  if (activeTab.value === 'lunch')   await fetchLunchOrders()
}

// ── 訂位 ──────────────────────────────────────────────────────────
const bookings    = ref([])
const markedDates = ref([])
const timeSlots   = ['11:00','11:30','12:00','12:30','13:00','17:00','17:30','18:00','18:30','19:00','19:30']

const bookingModal = reactive({ show: false, isNew: true })
const bForm = reactive({ id:'', date:'', name:'', phone:'', guests:2, time:'12:00', status:'待確認', note:'' })

const openBookingModal = (booking) => {
  bookingModal.isNew = !booking
  Object.assign(bForm, booking ?? { id:'', date: selectedDate.value, name:'', phone:'', guests:2, time:'12:00', status:'待確認', note:'' })
  bookingModal.show = true
}

const fetchMarkedDates = async () => {
  try {
    if (activeTab.value === 'booking') {
      markedDates.value = await (await fetch(`${BASE.value}/dates/${yearMonth.value}`)).json()
    } else {
      lunchMarkedDates.value = await (await fetch(`${LUNCH_BASE.value}/dates/${yearMonth.value}`)).json()
    }
    apiOnline.value = true
  } catch { apiOnline.value = false }
}

const fetchBookings = async () => {
  if (!selectedDate.value) return
  bookings.value = await (await fetch(`${BASE.value}/get/${selectedDate.value}`)).json()
}

const saveBooking = async () => {
  if (!bForm.name || !bForm.phone) return
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

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '' })
const showToast = (msg) => { toast.message = msg; toast.show = true; setTimeout(() => toast.show = false, 2500) }

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchMarkedDates()
  selectedDate.value = todayStr
  await fetchBookings()
  await fetchLunchOrders()
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
