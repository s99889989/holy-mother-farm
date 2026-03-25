<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── 頂部導覽（手機友善）── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-4 sticky top-0 z-30">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">田</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-base sm:text-lg">田園餐廳 · 庫存管理</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Holy Mother Farm</p>
          </div>
        </div>
        <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
          <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
          <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
        </span>
      </div>
      <!-- 頁籤：手機可橫向捲動 -->
      <nav class="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        <button v-for="tab in tabs" :key="tab.key"
                @click="switchTab(tab.key)"
                :class="activeTab === tab.key ? 'bg-green-800 text-white' : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0">
          {{ tab.label }}
        </button>
      </nav>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

      <!-- ════════════════════════════════════════════════════
           Tab 1：品項管理
      ════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'items'">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">
            品項管理 <span class="text-stone-400 font-normal text-sm sm:text-sm hidden sm:inline">— restaurant.yml</span>
          </h2>
          <button @click="openItemModal(null)"
                  class="flex items-center gap-1 px-3 py-1.5 bg-green-800 text-white text-sm sm:text-sm rounded-lg hover:bg-green-900 transition-colors">
            <span class="text-base leading-none">+</span> 新增品項
          </button>
        </div>

        <!-- 類別篩選列 -->
        <div class="flex gap-2 mb-4 flex-wrap">
          <button @click="itemCategoryFilter = ''"
                  :class="itemCategoryFilter === '' ? 'bg-green-800 text-white' : 'bg-white dark:bg-zinc-900 text-stone-600 dark:text-stone-100 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            全部
          </button>
          <button v-for="cat in commonConfig.categories" :key="cat.name"
                  @click="itemCategoryFilter = cat.name"
                  :class="itemCategoryFilter === cat.name ? 'bg-green-800 text-white' : 'bg-white dark:bg-zinc-900 text-stone-600 dark:text-stone-100 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            {{ cat.name }}
            <span class="ml-1 text-xs opacity-70">{{ restaurantItems.filter(i => i.category === cat.name).length }}</span>
          </button>
        </div>

        <!-- 手機：卡片列表 -->
        <div class="sm:hidden space-y-3">
          <div v-for="item in filteredItems" :key="item.key"
               class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-3 shadow-sm">
            <div class="flex gap-3">
              <button @click="openImageModal(item)" class="flex-shrink-0">
                <div v-if="item.images && item.images.length > 0"
                     class="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
                  <img :src="imgUrl(item.images[0])" :alt="item.name" class="w-full h-full object-cover" />
                  <span v-if="item.images.length > 1"
                        class="absolute bottom-0 right-0 bg-stone-800/70 text-white text-xs px-1 rounded-tl leading-4">
                    +{{ item.images.length - 1 }}
                  </span>
                </div>
                <div v-else
                     class="w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-300 dark:text-stone-600 hover:border-green-500 transition-colors">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
              </button>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-1">
                  <div>
                    <p class="font-semibold text-stone-800 dark:text-stone-100 text-base">{{ item.name }}</p>
                    <p class="font-mono text-sm text-stone-400 dark:text-stone-300 dark:text-stone-300 mt-0.5">{{ item.key }}</p>
                  </div>
                  <span :class="item.onSale ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'"
                        class="px-2 py-0.5 rounded-full text-sm font-medium flex-shrink-0">
                    {{ item.onSale ? '上架' : '下架' }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-1.5 mt-1.5">
                  <span class="px-1.5 py-0.5 rounded-md text-sm" :class="catClass(item.category)">{{ item.category }}</span>
                  <span class="text-xs text-stone-400">{{ item.make }}</span>
                  <span class="text-xs font-semibold text-stone-700 dark:text-stone-100">${{ item.price }}</span>
                </div>
                <div class="flex items-center gap-1.5 mt-1.5">
                  <span class="text-sm text-stone-400 dark:text-stone-400">現有庫存</span>
                  <span :class="stockClass(item.key)" class="text-base tabular-nums">{{ stockOf(item.key) }}</span>
                </div>
                <div class="flex gap-1.5 mt-2">
                  <button @click="openItemModal(item)" class="px-2.5 py-1 text-sm border border-blue-300 dark:border-blue-700 text-blue-500 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">編輯</button>
                  <button @click="openImageModal(item)" class="px-2.5 py-1 text-sm border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">圖片</button>
                  <button @click="removeItem(item.key)" class="px-2.5 py-1 text-sm border border-red-300 dark:border-red-700 text-red-400 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">刪除</button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="filteredItems.length === 0" class="text-center py-10 text-stone-400 text-sm">{{ itemCategoryFilter ? `沒有「${itemCategoryFilter}」類別的品項` : '尚無品項' }}</div>
        </div>

        <!-- 桌機表格 -->
        <div class="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-stone-50 dark:bg-zinc-800 text-sm text-stone-500 dark:text-stone-100 uppercase tracking-wide">
              <tr>
                <th class="px-4 py-4 text-left">圖片</th>
                <th class="px-4 py-4 text-left">Key</th>
                <th class="px-4 py-4 text-left">品名</th>
                <th class="px-4 py-4 text-left">類別</th>
                <th class="px-4 py-4 text-left">製造商</th>
                <th class="px-4 py-4 text-right">售價</th>
                <th class="px-4 py-4 text-center">單位</th>
                <th class="px-4 py-4 text-center">期初</th>
                <th class="px-4 py-4 text-center">現有庫存</th>
                <th class="px-4 py-4 text-center">上架</th>
                <th class="px-4 py-4 text-center">操作</th>
              </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
              <tr v-for="item in filteredItems" :key="item.key"
                  class="hover:bg-stone-50 dark:hover:bg-zinc-700/50 transition-colors">
                <td class="px-4 py-2">
                  <button @click="openImageModal(item)" class="block">
                    <div v-if="item.images && item.images.length > 0"
                         class="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 hover:ring-2 hover:ring-green-500 transition-all">
                      <img :src="imgUrl(item.images[0])" :alt="item.name" class="w-full h-full object-cover" />
                      <span v-if="item.images.length > 1"
                            class="absolute bottom-0 right-0 bg-stone-800/70 text-white text-xs px-1 rounded-tl leading-4">
                          +{{ item.images.length - 1 }}
                        </span>
                    </div>
                    <div v-else
                         class="w-16 h-16 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-300 dark:text-stone-600 hover:border-green-500 transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                      </svg>
                    </div>
                  </button>
                </td>
                <td class="px-4 py-4 font-mono text-sm text-stone-400">{{ item.key }}</td>
                <td class="px-4 py-4 font-medium text-stone-800 dark:text-stone-100">{{ item.name }}</td>
                <td class="px-4 py-4"><span class="px-2 py-0.5 rounded-full text-sm" :class="catClass(item.category)">{{ item.category }}</span></td>
                <td class="px-4 py-4 text-stone-600 dark:text-stone-100">{{ item.make }}</td>
                <td class="px-4 py-4 text-right text-stone-700 dark:text-stone-100">${{ item.price }}</td>
                <td class="px-4 py-4 text-center text-stone-500">{{ item.unit }}</td>
                <td class="px-4 py-4 text-center text-stone-600 dark:text-stone-100">{{ item.openingStock }}</td>
                <td class="px-4 py-4 text-center">
                    <span :class="stockClass(item.key)" class="text-base tabular-nums">
                      {{ stockOf(item.key) }}
                    </span>
                </td>
                <td class="px-4 py-4 text-center">
                    <span :class="item.onSale ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-stone-100 text-stone-400'"
                          class="px-2 py-0.5 rounded-full text-sm font-medium">
                      {{ item.onSale ? '上架' : '下架' }}
                    </span>
                </td>
                <td class="px-4 py-4 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button @click="openItemModal(item)" class="px-2.5 py-1 text-sm border border-blue-300 dark:border-blue-700 text-blue-500 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">編輯</button>
                    <button @click="openImageModal(item)" class="px-2.5 py-1 text-sm border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">圖片</button>
                    <button @click="removeItem(item.key)" class="px-2.5 py-1 text-sm border border-red-300 dark:border-red-700 text-red-400 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">刪除</button>
                  </div>
                </td>
              </tr>
              <tr v-if="restaurantItems.length === 0">
                <td colspan="11" class="px-4 py-10 text-center text-stone-400 text-sm">{{ itemCategoryFilter ? `沒有「${itemCategoryFilter}」類別的品項` : '尚無品項' }}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════
           Tab 2：出入庫紀錄
      ════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'inout'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">出入庫紀錄
            <span class="text-stone-400 font-normal text-sm hidden sm:inline">— restaurant_inout_{{ selectedMonth }}.yml</span>
          </h2>
        </div>

        <!-- 桌機：左右分欄；手機：垂直堆疊 -->
        <div class="flex flex-col lg:flex-row gap-4 items-start">

          <!-- ── 左欄：日曆（桌機固定寬度，手機全寬）── -->
          <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
            <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 lg:sticky lg:top-20">
              <!-- 月份導覽 -->
              <div class="flex items-center justify-between mb-3">
                <button @click="prevMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <span class="text-base font-semibold text-stone-700 dark:text-stone-100">
                  {{ calendarMonthLabel }}
                </span>
                <button @click="nextMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
              <!-- 星期標題 -->
              <div class="grid grid-cols-7 mb-1">
                <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                     class="text-center text-sm text-stone-400 dark:text-stone-500 font-medium py-1">
                  {{ w }}
                </div>
              </div>
              <!-- 日期格 -->
              <div class="grid grid-cols-7 gap-1">
                <div v-for="(day, idx) in calendarDays" :key="idx"
                     class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                     :class="calDayClass(day)"
                     @click="day.date && selectCalDate(day.date)">
                  <span>{{ day.label }}</span>
                  <span v-if="day.date && savedDates.includes(day.date)"
                        class="absolute bottom-1 flex gap-0.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  </span>
                </div>
              </div>
              <!-- 今日 + 已選顯示 -->
              <div class="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                <span class="text-sm text-stone-400 dark:text-stone-400">
                  <span v-if="selectedDate" class="text-stone-600 dark:text-stone-200 font-medium">已選：{{ selectedDate }}</span>
                  <span v-else>請點選日期</span>
                </span>
                <button @click="selectCalDate(todayStr)"
                        class="text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium">
                  今天
                </button>
              </div>
            </div>
          </div>

          <!-- ── 右欄：出入庫明細（佔剩餘寬度）── -->
          <div class="flex-1 min-w-0">

            <div v-if="selectedDate" class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
              <div class="px-4 py-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between">
                <span class="text-sm font-semibold text-stone-700 dark:text-stone-100">{{ selectedDate }} 出入庫明細</span>
                <div class="flex items-center gap-2">
                  <button @click="confirmDeleteDay"
                          class="px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    刪除當日
                  </button>
                  <button @click="saveDayInout" class="px-3 py-1.5 bg-green-800 text-white text-sm rounded-lg hover:bg-green-900 transition-colors">儲存當日</button>
                </div>
              </div>

              <!-- 手機：品項卡片 -->
              <div class="sm:hidden divide-y divide-stone-100 dark:divide-stone-700">
                <div v-for="item in restaurantItems.filter(i => i.needInventory)" :key="item.key" class="p-3">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="flex-shrink-0">
                      <img v-if="item.images && item.images.length > 0"
                           :src="imgUrl(item.images[0])" :alt="item.name"
                           class="w-14 h-14 rounded-xl object-cover border border-stone-200 dark:border-stone-700" />
                      <div v-else
                           class="w-14 h-14 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-stone-300">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p class="font-semibold text-stone-800 dark:text-stone-100">{{ item.name }}</p>
                      <p class="text-xs text-stone-400">{{ item.unit }}</p>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-xs text-stone-400 block mb-1">進貨來源</label>
                      <select v-model="getDayItem(selectedDate, item.key).in[0].from"
                              class="w-full bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-sm outline-none">
                        <option value="">—</option>
                        <option v-for="m in supplierMakes" :key="m.name" :value="m.name">{{ m.name }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="text-xs text-green-600 block mb-1">進貨量</label>
                      <input v-model.number="getDayItem(selectedDate, item.key).in[0].qty" type="number"
                             class="w-full text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label class="text-xs text-amber-600 block mb-1">銷售</label>
                      <input v-model.number="getDayItem(selectedDate, item.key).sell" type="number"
                             class="w-full text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-2 text-sm outline-none text-stone-800 dark:text-stone-100" />
                    </div>
                    <div>
                      <label class="text-xs text-blue-600 block mb-1">調撥出</label>
                      <input v-model.number="getDayItem(selectedDate, item.key).transferOut[0].qty" type="number"
                             class="w-full text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-2 text-sm outline-none text-stone-800 dark:text-stone-100" />
                    </div>
                    <div>
                      <label class="text-xs text-orange-500 block mb-1">內部用</label>
                      <input v-model.number="getDayItem(selectedDate, item.key).foodServing" type="number"
                             class="w-full text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-2 text-sm outline-none text-stone-800 dark:text-stone-100" />
                    </div>
                    <div>
                      <label class="text-xs text-red-500 block mb-1">報廢</label>
                      <input v-model.number="getDayItem(selectedDate, item.key).out" type="number"
                             class="w-full text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-2 text-sm outline-none text-stone-800 dark:text-stone-100" />
                    </div>

                  </div>
                </div>
              </div>

              <!-- 桌機表格 -->
              <div class="hidden sm:block overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-stone-50 dark:bg-zinc-800 text-sm text-stone-500 dark:text-stone-100 uppercase tracking-wide">
                  <tr>
                    <th class="px-4 py-4 text-left">品項</th>
                    <th class="px-4 py-4 text-left">進貨來源</th>
                    <th class="px-4 py-4 text-center text-green-600 dark:text-green-400">進貨量</th>
                    <th class="px-4 py-4 text-center text-amber-600 dark:text-amber-400">銷售</th>
                    <th class="px-4 py-4 text-center text-blue-600 dark:text-blue-400">調撥出</th>
                    <th class="px-4 py-4 text-center text-orange-500">內部用</th>
                    <th class="px-4 py-4 text-center text-red-500">報廢</th>
                  </tr>
                  </thead>
                  <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
                  <tr v-for="item in restaurantItems.filter(i => i.needInventory)" :key="item.key"
                      class="hover:bg-stone-50 dark:hover:bg-zinc-700/30 transition-colors">
                    <td class="px-4 py-4">
                      <div class="flex items-center gap-3">
                        <div class="flex-shrink-0">
                          <img v-if="item.images && item.images.length > 0"
                               :src="imgUrl(item.images[0])" :alt="item.name"
                               class="w-14 h-14 rounded-xl object-cover border border-stone-200 dark:border-stone-700" />
                          <div v-else
                               class="w-14 h-14 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-stone-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                          </div>
                        </div>
                        <div>
                          <div class="font-medium text-stone-800 dark:text-stone-100 text-base">{{ item.name }}</div>
                          <div class="text-xs text-stone-400">{{ item.unit }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-2">
                      <select v-model="getDayItem(selectedDate, item.key).in[0].from"
                              class="bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 w-28 outline-none">
                        <option value="">—</option>
                        <option v-for="m in supplierMakes" :key="m.name" :value="m.name">{{ m.name }}</option>
                      </select>
                    </td>
                    <td class="px-4 py-2 text-center">
                      <input v-model.number="getDayItem(selectedDate, item.key).in[0].qty" type="number"
                             class="w-20 text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-base focus:ring-2 focus:ring-green-400 outline-none" />
                    </td>
                    <td class="px-4 py-2 text-center">
                      <input v-model.number="getDayItem(selectedDate, item.key).sell" type="number"
                             class="w-20 text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-base focus:ring-2 focus:ring-amber-400 outline-none" />
                    </td>
                    <td class="px-4 py-2 text-center">
                      <input v-model.number="getDayItem(selectedDate, item.key).transferOut[0].qty" type="number"
                             class="w-20 text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-base focus:ring-2 focus:ring-blue-400 outline-none" />
                    </td>

                    <td class="px-4 py-2 text-center">
                      <input v-model.number="getDayItem(selectedDate, item.key).foodServing" type="number"
                             class="w-20 text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-base focus:ring-2 focus:ring-orange-400 outline-none" />
                    </td>
                    <td class="px-4 py-2 text-center">
                      <input v-model.number="getDayItem(selectedDate, item.key).out" type="number"
                             class="w-20 text-center bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-base focus:ring-2 focus:ring-red-400 outline-none" />
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-10 text-center text-stone-400 text-sm shadow-sm">
              請從左側日曆點選日期
            </div>

          </div><!-- /右欄 -->
        </div><!-- /flex 分欄 -->
      </div>

      <!-- ════════════════════════════════════════════════════
           Tab 3：調撥管理
      ════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'transfer'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">調撥管理
            <span class="text-stone-400 font-normal text-sm hidden sm:inline">— {{ selectedMonth }}</span>
          </h2>
          <div class="flex gap-1 items-center">
            <button @click="prevMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
              <svg class="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span class="text-sm sm:text-base font-semibold text-stone-700 dark:text-stone-100 w-24 text-center">{{ selectedMonth }}</span>
            <button @click="nextMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
              <svg class="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        <!-- 手機：卡片 -->
        <div class="sm:hidden space-y-3">
          <div v-for="(t, idx) in transferList" :key="idx"
               class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-3 shadow-sm flex gap-3 items-center">
            <img v-if="itemImageByKey(t.itemKey)"
                 :src="itemImageByKey(t.itemKey)" :alt="t.itemKey"
                 class="w-16 h-16 rounded-xl object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0" />
            <div v-else
                 class="w-16 h-16 rounded-xl bg-stone-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center text-stone-300">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-stone-800 dark:text-stone-100 text-base">{{ itemNameByKey(t.itemKey) }}</p>
              <p class="text-xs text-stone-400 mt-0.5">{{ t.date }}</p>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="px-2 py-0.5 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">→ {{ t.to }}</span>
                <span class="font-bold text-stone-700 dark:text-stone-100">× {{ t.qty }}</span>
              </div>
            </div>
          </div>
          <div v-if="transferList.length === 0" class="text-center py-10 text-stone-400 text-sm">本月尚無調撥紀錄</div>
        </div>

        <!-- 桌機表格 -->
        <div class="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-stone-50 dark:bg-zinc-800/50 text-sm text-stone-500 dark:text-stone-100 uppercase tracking-wide">
              <tr>
                <th class="px-4 py-4 text-left">日期</th>
                <th class="px-4 py-4 text-left">品項</th>
                <th class="px-4 py-4 text-left">調撥至</th>
                <th class="px-4 py-4 text-center">數量</th>
              </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
              <tr v-for="(t, idx) in transferList" :key="idx"
                  class="hover:bg-stone-50 dark:hover:bg-zinc-700/30 transition-colors">
                <td class="px-4 py-4 text-stone-600 dark:text-stone-100 whitespace-nowrap">{{ t.date }}</td>
                <td class="px-4 py-4">
                  <div class="flex items-center gap-3">
                    <img v-if="itemImageByKey(t.itemKey)"
                         :src="itemImageByKey(t.itemKey)" :alt="t.itemKey"
                         class="w-14 h-14 rounded-xl object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0" />
                    <div v-else
                         class="w-14 h-14 rounded-xl bg-stone-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center text-stone-300">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <span class="font-medium text-stone-800 dark:text-stone-100 text-base">{{ itemNameByKey(t.itemKey) }}</span>
                  </div>
                </td>
                <td class="px-4 py-4">
                  <span class="px-2 py-0.5 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{{ t.to }}</span>
                </td>
                <td class="px-4 py-4 text-center font-semibold text-stone-700 dark:text-stone-100">{{ t.qty }}</td>
              </tr>
              <tr v-if="transferList.length === 0">
                <td colspan="4" class="px-4 py-10 text-center text-stone-400 text-sm">本月尚無調撥紀錄</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="transferList.length > 0" class="mt-4 grid grid-cols-2 gap-3">
          <div class="bg-white dark:bg-zinc-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center shadow-sm">
            <p class="text-2xl font-bold text-stone-800 dark:text-stone-100">{{ transferList.length }}</p>
            <p class="text-xs text-stone-400 mt-0.5">調撥筆數</p>
          </div>
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 p-4 text-center shadow-sm">
            <p class="text-2xl font-bold text-blue-700 dark:text-blue-400">{{ transferList.reduce((s,t) => s + t.qty, 0) }}</p>
            <p class="text-xs text-stone-400 mt-0.5">調撥總數量</p>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════
           Tab 4：設定管理 (common.yml)
      ════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'config'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">
            設定管理 <span class="text-stone-400 font-normal text-sm hidden sm:inline">— common.yml</span>
          </h2>
          <button @click="saveCommon" class="px-3 py-1.5 bg-green-800 text-white text-sm sm:text-sm rounded-lg hover:bg-green-900 transition-colors">儲存設定</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4">
            <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-100 mb-3">品項類別</h3>
            <div class="space-y-2">
              <div v-for="(cat, key) in commonConfig.categories" :key="key" class="flex items-center gap-2">
                <span class="text-xs text-stone-400 w-5 flex-shrink-0">{{ key }}</span>
                <input v-model="cat.name" type="text" placeholder="中文名稱"
                       class="flex-1 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 min-w-0" />
                <input v-model="cat.en" type="text" placeholder="英文 key" maxlength="20"
                       class="w-24 bg-white dark:bg-zinc-800 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg px-2 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0" />
              </div>
            </div>
            <button @click="addCategory" class="mt-3 text-sm text-green-700 dark:text-green-400 hover:text-green-800">+ 新增類別</button>
          </div>
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4">
            <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-100 mb-3">單位</h3>
            <div class="space-y-2">
              <div v-for="(unit, key) in commonConfig.units" :key="key" class="flex items-center gap-2">
                <span class="text-xs text-stone-400 w-5">{{ key }}</span>
                <input v-model="unit.name" type="text" class="flex-1 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>
            <button @click="addUnit" class="mt-3 text-sm text-green-700 dark:text-green-400 hover:text-green-800">+ 新增單位</button>
          </div>
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4">
            <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-100 mb-3">製造商 / 供應商</h3>
            <div class="space-y-2">
              <div v-for="(make, key) in commonConfig.makes" :key="key" class="flex items-center gap-2">
                <span class="text-xs text-stone-400 w-5">{{ key }}</span>
                <input v-model="make.name" type="text" class="flex-1 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                <select v-model="make.role" class="border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-1.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="self">自己</option>
                  <option value="supplier">供應商</option>
                  <option value="partner">姊妹店</option>
                </select>
              </div>
            </div>
            <button @click="addMake" class="mt-3 text-sm text-green-700 dark:text-green-400 hover:text-green-800">+ 新增</button>
          </div>
        </div>
      </div>

    </div>

    <!-- ════════ 品項 Modal（手機從底部彈出）════════ -->
    <div v-if="itemModal.show" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-bold text-stone-800 dark:text-stone-100 mb-4">{{ itemModal.isNew ? '新增品項' : '編輯品項' }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-100 block mb-1">
              Key
              <span v-if="itemModal.isNew" class="ml-1 text-green-600 dark:text-green-400 font-normal">（自動產生）</span>
            </label>
            <!-- 新增：唯讀顯示自動產生的 key -->
            <div v-if="itemModal.isNew"
                 class="w-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800/60 text-stone-500 dark:text-stone-300 rounded-lg px-3 py-2 text-sm font-mono">
              {{ itemModal.data.key || '請先選擇類別' }}
            </div>
            <!-- 編輯：顯示固定 key 不可改 -->
            <input v-else v-model="itemModal.data.key" type="text" disabled
                   class="w-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800/60 text-stone-500 dark:text-stone-300 rounded-lg px-3 py-2 text-sm font-mono disabled:opacity-70 cursor-not-allowed" />
          </div>
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-100 block mb-1">品名 *</label>
            <input v-model="itemModal.data.name" type="text"
                   class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-100 block mb-1">類別</label>
            <select v-model="itemModal.data.category"
                    @change="onCategoryChange(itemModal.data.category)"
                    class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="" disabled>請選擇類別</option>
              <option v-for="cat in commonConfig.categories" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-100 block mb-1">製造商</label>
            <select v-model="itemModal.data.make"
                    class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option v-for="m in commonConfig.makes" :key="m.name" :value="m.name">{{ m.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-100 block mb-1">售價</label>
            <input v-model.number="itemModal.data.price" type="number" min="0"
                   class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-100 block mb-1">單位</label>
            <select v-model="itemModal.data.unit"
                    class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option v-for="u in commonConfig.units" :key="u.name" :value="u.name">{{ u.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-100 block mb-1">期初庫存</label>
            <input v-model.number="itemModal.data.openingStock" type="number" min="0"
                   class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div class="flex items-end gap-3">
            <label class="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-100 cursor-pointer">
              <input v-model="itemModal.data.onSale" type="checkbox" class="rounded" /> 上架
            </label>
            <label class="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-100 cursor-pointer">
              <input v-model="itemModal.data.needInventory" type="checkbox" class="rounded" /> 盤點
            </label>
          </div>
          <div class="col-span-2">
            <label class="text-xs font-medium text-stone-600 dark:text-stone-100 block mb-1">備註說明</label>
            <input v-model="itemModal.data.description" type="text"
                   class="w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button @click="itemModal.show = false"
                  class="flex-1 px-4 py-3.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-100 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors">取消</button>
          <button @click="saveItem"
                  class="flex-1 px-4 py-3.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 transition-colors">{{ itemModal.isNew ? '新增' : '儲存' }}</button>
        </div>
      </div>
    </div>

    <!-- ════════ 圖片管理 Modal（手機從底部彈出）════════ -->
    <div v-if="imageModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-bold text-stone-800 dark:text-stone-100">圖片管理</h3>
            <p class="text-xs text-stone-400 mt-0.5">{{ imageModal.item?.name }} · {{ imageModal.item?.key }}</p>
          </div>
          <button @click="imageModal.show = false" class="text-stone-400 hover:text-stone-600 transition-colors p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="mb-4">
          <p class="text-xs font-medium text-stone-500 dark:text-stone-100 mb-2">現有圖片（{{ imageModal.images.length }} 張）</p>
          <div v-if="imageModal.images.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <div v-for="(url, idx) in imageModal.images" :key="idx"
                 class="relative group aspect-square rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
              <img :src="imgUrl(url)" :alt="`圖片 ${idx + 1}`" class="w-full h-full object-cover cursor-pointer"
                   @click="previewUrl = imgUrl(url)" />
              <span v-if="idx === 0"
                    class="absolute top-1 left-1 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none font-medium">主圖</span>
              <button @click="deleteImage(idx)"
                      class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity hover:bg-red-600">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <button v-if="idx > 0" @click="setMainImage(idx)"
                      class="absolute bottom-0 left-0 right-0 bg-stone-800/75 text-white text-xs py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-stone-800">
                設為主圖
              </button>
            </div>
          </div>
          <p v-else class="text-xs text-stone-400 py-6 text-center border border-dashed border-stone-200 dark:border-stone-700 rounded-xl">尚無圖片</p>
        </div>

        <div
          @dragover.prevent="imageDragOver = true"
          @dragleave="imageDragOver = false"
          @drop.prevent="handleDrop"
          :class="imageDragOver ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-stone-300 dark:border-stone-600 hover:border-green-400'"
          class="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
          @click="triggerFileInput">
          <svg class="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          <p class="text-sm text-stone-500 dark:text-stone-100">點擊或拖曳圖片上傳</p>
          <p class="text-xs text-stone-400 mt-0.5">支援 JPG、PNG、WebP，可多張</p>
          <input ref="fileInputRef" type="file" multiple accept="image/*" class="hidden" @change="handleFileSelect" />
        </div>

        <div v-if="imageModal.uploading" class="mt-3 flex items-center gap-2 text-sm text-stone-500">
          <div class="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          上傳中，請稍候…
        </div>

        <button @click="imageModal.show = false"
                class="mt-4 w-full px-4 py-3.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-stone-100 rounded-xl hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors">
          關閉
        </button>
      </div>
    </div>

    <!-- 大圖預覽 -->
    <div v-if="previewUrl" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] cursor-pointer p-4" @click="previewUrl = ''">
      <img :src="previewUrl" class="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
    </div>

    <!-- Toast：手機置中，桌機右下 -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-4 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'

const BASE       = 'http://localhost:9100/holy'
const API_ORIGIN = 'http://localhost:9100'

const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_ORIGIN + path
}

const tabs = [
  { key: 'items',    label: '品項管理' },
  { key: 'inout',    label: '出入庫紀錄' },
  { key: 'transfer', label: '調撥管理' },
  { key: 'config',   label: '設定管理' },
]
const activeTab = ref('items')

const apiOnline       = ref(false)
const restaurantItems = ref([])
const commonConfig    = reactive({ units: {}, categories: {}, makes: {} })
const inoutData       = ref({})
const savedDates      = ref([])   // 後端已儲存資料的日期，用於紅點標記
const transferList    = ref([])
const selectedDate    = ref('')
const previewUrl      = ref('')
const stockMap        = ref({})   // { itemKey: currentStock }
const fileInputRef    = ref(null)
const imageDragOver   = ref(false)

const today    = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const selectedMonth = ref(
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
)

const datesInMonth  = computed(() => Object.keys(inoutData.value).sort())

// ── 日曆 computed ─────────────────────────────────────────────────
const calendarMonthLabel = computed(() => {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  return `${y}年 ${m}月`
})

const calendarDays = computed(() => {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const firstDay    = new Date(y, m - 1, 1).getDay()   // 0=日
  const daysInMonth = new Date(y, m, 0).getDate()
  const days = []
  // 前置空格
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null })
  // 實際日期
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(m).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push({ label: d, date: `${y}-${mm}-${dd}` })
  }
  return days
})

const calDayClass = (day) => {
  if (!day.date) return 'cursor-default'
  const isSelected = day.date === selectedDate.value
  const isToday    = day.date === todayStr
  const hasData    = datesInMonth.value.includes(day.date)
  if (isSelected) return 'bg-green-700 text-white font-bold shadow-sm'
  if (isToday)    return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold hover:bg-green-200 dark:hover:bg-green-800/50'
  return 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
}

const selectCalDate = (date) => {
  if (!date) return
  selectedDate.value = date
  // 若該日期沒有資料，建立空結構供輸入
  if (!inoutData.value[date]) inoutData.value[date] = {}
}
const supplierMakes = computed(() =>
  Object.values(commonConfig.makes).filter(m => m.role === 'supplier' || m.role === 'partner')
)

// ── 品項類別篩選 ──────────────────────────────────────────────────
const itemCategoryFilter = ref('')   // '' = 全部
const filteredItems = computed(() =>
  itemCategoryFilter.value
    ? restaurantItems.value.filter(i => i.category === itemCategoryFilter.value)
    : restaurantItems.value
)

const getDayItem = (date, itemKey) => {
  if (!inoutData.value[date]) inoutData.value[date] = {}
  if (!inoutData.value[date][itemKey]) {
    inoutData.value[date][itemKey] = {
      in: [{ from: '', qty: 0 }],
      transferOut: [{ to: '休憩小舖', qty: 0, ref: '' }],
      sell: 0, foodServing: 0, out: 0
    }
  }
  return inoutData.value[date][itemKey]
}

const prevMonth = () => {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  selectedMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  fetchInout(); fetchTransfers()
}
const nextMonth = () => {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const d = new Date(y, m, 1)
  selectedMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  fetchInout(); fetchTransfers()
}

// addNewDate 已由日曆元件的 selectCalDate 取代

// 根據類別產生不重複 key，格式：{en前綴}_{流水號}，例：bread_1、bread_2
// en 前綴來自 commonConfig.categories 的 en 欄位；若未設定則 fallback 為 'item'
const generateKey = (categoryName) => {
  const catEntry = Object.values(commonConfig.categories).find(c => c.name === categoryName)
  const prefix = (catEntry?.en || 'item').toLowerCase().replace(/[^a-z0-9]/g, '')  || 'item'
  const nums = restaurantItems.value
    .map(i => i.key)
    .filter(k => k.startsWith(prefix + '_'))
    .map(k => parseInt(k.slice(prefix.length + 1), 10))
    .filter(n => !isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `${prefix}_${next}`
}

// ── 品項 Modal ────────────────────────────────────────────────────
const itemModal = reactive({
  show: false, isNew: true,
  data: { key: '', name: '', category: '', make: '', price: 0, unit: '份', onSale: true, description: '', tags: [], needInventory: true, openingStock: 0 }
})

const openItemModal = (item) => {
  itemModal.isNew = !item
  itemModal.data = item
    ? { ...item }
    : { key: '', name: '', category: '', make: '', price: 0, unit: '份', onSale: true, description: '', tags: [], needInventory: true, openingStock: 0 }
  itemModal.show = true
}

// 新增模式下，切換類別時自動重新計算 key
const onCategoryChange = (newCategory) => {
  if (itemModal.isNew) {
    itemModal.data.key = generateKey(newCategory)
  }
}

// ── 圖片 Modal ────────────────────────────────────────────────────
const imageModal = reactive({ show: false, item: null, images: [], uploading: false })
const openImageModal = (item) => {
  imageModal.item = item
  imageModal.images = [...(item.images || [])]
  imageModal.show = true
}
const triggerFileInput = () => fileInputRef.value?.click()
const handleFileSelect = (e) => uploadFiles(Array.from(e.target.files))
const handleDrop = (e) => {
  imageDragOver.value = false
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  if (files.length) uploadFiles(files)
}
const uploadFiles = async (files) => {
  if (!imageModal.item || files.length === 0) return
  imageModal.uploading = true
  try {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    const res = await fetch(`${BASE}/restaurant/image/upload/${imageModal.item.key}`, { method: 'POST', body: formData })
    const newPaths = await res.json()
    imageModal.images.push(...newPaths)
    const found = restaurantItems.value.find(i => i.key === imageModal.item.key)
    if (found) found.images = [...imageModal.images]
    showToast(`成功上傳 ${newPaths.length} 張圖片`)
  } catch { showToast('上傳失敗') }
  finally {
    imageModal.uploading = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}
const deleteImage = async (idx) => {
  if (!confirm('確定刪除？')) return
  const url = imageModal.images[idx]
  const fileName = url.split('/').pop()
  try {
    await fetch(`${BASE}/restaurant/image/remove/${imageModal.item.key}?fileName=${fileName}`, { method: 'DELETE' })
    imageModal.images.splice(idx, 1)
    const found = restaurantItems.value.find(i => i.key === imageModal.item.key)
    if (found) found.images = [...imageModal.images]
    showToast('圖片已刪除')
  } catch (e) { console.error(e) }
}
const setMainImage = (idx) => {
  const [img] = imageModal.images.splice(idx, 1)
  imageModal.images.unshift(img)
  const found = restaurantItems.value.find(i => i.key === imageModal.item.key)
  if (found) found.images = [...imageModal.images]
  fetch(`${BASE}/restaurant/items/save`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...imageModal.item, images: imageModal.images })
  }).catch(console.error)
  showToast('已設為主圖')
}

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '' })
const showToast = (msg) => { toast.message = msg; toast.show = true; setTimeout(() => toast.show = false, 2500) }

// ── 工具 ──────────────────────────────────────────────────────────
const catClass = (cat) => {
  const map = { '餐點': 'bg-amber-100 text-amber-700', '麵包': 'bg-orange-100 text-orange-700', '餅乾': 'bg-yellow-100 text-yellow-700', '飲料': 'bg-blue-100 text-blue-700' }
  return map[cat] || 'bg-stone-100 text-stone-500'
}
const itemNameByKey  = (key) => restaurantItems.value.find(i => i.key === key)?.name || key
const itemImageByKey = (key) => {
  const found = restaurantItems.value.find(i => i.key === key)
  return found?.images?.[0] ? imgUrl(found.images[0]) : null
}

const addCategory = () => { commonConfig.categories[String(Object.keys(commonConfig.categories).length + 1)] = { name: '', en: '' } }
const addUnit     = () => { commonConfig.units[String(Object.keys(commonConfig.units).length + 1)] = { name: '' } }
const addMake     = () => { commonConfig.makes[String(Object.keys(commonConfig.makes).length + 1)] = { name: '', role: 'supplier' } }

// ── API ───────────────────────────────────────────────────────────
const fetchCommon = async () => {
  try { const res = await fetch(`${BASE}/common/get`); Object.assign(commonConfig, await res.json()); apiOnline.value = true }
  catch { apiOnline.value = false }
}
const fetchItems = async () => {
  try { restaurantItems.value = await (await fetch(`${BASE}/restaurant/items/get`)).json() }
  catch (e) { console.error(e) }
}

// 從後端取得所有品項目前庫存
const fetchStock = async () => {
  try { stockMap.value = await (await fetch(`${BASE}/restaurant/stock/all`)).json() }
  catch (e) { console.error(e) }
}

// 取得單一品項庫存，未知則回傳 '—'
const stockOf = (key) => {
  const v = stockMap.value[key]
  return v !== undefined ? v : '—'
}

// 庫存狀態樣式：低庫存（<=3）警示紅，零庫存深紅
const stockClass = (key) => {
  const v = stockMap.value[key]
  if (v === undefined) return 'text-stone-400 dark:text-stone-500'
  if (v < 0)  return 'text-red-600 dark:text-red-400 font-bold'   // 負數：超賣
  if (v === 0) return 'text-red-500 dark:text-red-400 font-bold'  // 零庫存
  if (v <= 3)  return 'text-amber-600 dark:text-amber-400 font-semibold'  // 低庫存
  return 'text-green-700 dark:text-green-400 font-semibold'
}

// ── Tab 切換（切到出入庫或調撥時重新拉品項，確保圖片最新）────────
const switchTab = async (key) => {
  activeTab.value = key
  if (key === 'inout' || key === 'transfer') {
    await fetchItems()
    await fetchStock()
  }
  if (key === 'items') {
    await fetchStock()
  }
}

const saveItem = async () => {
  if (!itemModal.data.key || !itemModal.data.name) return
  try {
    await fetch(`${BASE}/restaurant/items/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemModal.data) })
    await fetchItems(); itemModal.show = false; showToast('品項儲存成功')
  } catch (e) { console.error(e) }
}
const removeItem = async (key) => {
  if (!confirm(`確定刪除品項「${key}」？`)) return
  try { await fetch(`${BASE}/restaurant/items/remove/${key}`, { method: 'DELETE' }); await fetchItems(); showToast('品項已刪除') }
  catch (e) { console.error(e) }
}
const fetchInout = async () => {
  try {
    const data = await (await fetch(`${BASE}/restaurant/inout/get/${selectedMonth.value}`)).json()
    inoutData.value = {}
    for (const [date, items] of Object.entries(data.records || {})) {
      inoutData.value[date] = {}
      for (const [itemKey, di] of Object.entries(items)) {
        inoutData.value[date][itemKey] = {
          in: di.in?.length ? di.in : [{ from: '', qty: 0 }],
          transferOut: di.transferOut?.length ? di.transferOut : [{ to: '休憩小舖', qty: 0, ref: '' }],
          sell: di.sell || 0, foodServing: di.foodServing || 0, out: di.out || 0
        }
      }
    }
    // 記錄後端真正有資料的日期，供紅點標記用
    savedDates.value = Object.keys(data.records || {})
    selectedDate.value = savedDates.value.length > 0 ? savedDates.value[savedDates.value.length - 1] : ''
  } catch (e) { console.error(e) }
}
// 確保所有 qty 欄位儲存為整數（避免 v-model.number 產生浮點數）
const sanitizeDayItem = (di) => ({
  in: (di.in || []).map(e => ({ ...e, qty: Math.round(Number(e.qty) || 0) })),
  transferOut: (di.transferOut || []).map(e => ({ ...e, qty: Math.round(Number(e.qty) || 0) })),
  sell:        Math.round(Number(di.sell)        || 0),
  foodServing: Math.round(Number(di.foodServing) || 0),
  out:         Math.round(Number(di.out)         || 0),
})

const saveDayInout = async () => {
  if (!selectedDate.value) return
  for (const [itemKey, di] of Object.entries(inoutData.value[selectedDate.value] || {})) {
    try {
      await fetch(`${BASE}/restaurant/inout/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth: selectedMonth.value, date: selectedDate.value, itemKey, dayItem: sanitizeDayItem(di) })
      })
    } catch (e) { console.error(e) }
  }
  // 儲存成功後將日期加入紅點清單
  if (!savedDates.value.includes(selectedDate.value)) {
    savedDates.value.push(selectedDate.value)
  }
  showToast(`${selectedDate.value} 出入庫已儲存`)
}

const confirmDeleteDay = async () => {
  if (!selectedDate.value) return
  if (!confirm(`確定刪除 ${selectedDate.value} 的所有出入庫紀錄？\n此操作無法復原。`)) return
  try {
    const res = await fetch(
      `${BASE}/restaurant/inout/remove/${selectedMonth.value}/${selectedDate.value}`,
      { method: 'DELETE' }
    )
    if (!res.ok) throw new Error('HTTP ' + res.status)
    // 從本地狀態移除
    delete inoutData.value[selectedDate.value]
    savedDates.value = savedDates.value.filter(d => d !== selectedDate.value)
    selectedDate.value = savedDates.value.length > 0
      ? savedDates.value[savedDates.value.length - 1]
      : ''
    showToast(`${selectedDate.value || '紀錄'} 已刪除`)
  } catch (e) {
    console.error(e)
    showToast('刪除失敗，請確認伺服器連線')
  }
}
const fetchTransfers = async () => {
  try { transferList.value = await (await fetch(`${BASE}/restaurant/inout/transfers/${selectedMonth.value}`)).json() }
  catch (e) { console.error(e) }
}
const saveCommon = async () => {
  try { await fetch(`${BASE}/common/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(commonConfig) }); showToast('設定已儲存') }
  catch (e) { console.error(e) }
}

onMounted(async () => {
  await fetchCommon(); await fetchItems(); await fetchStock(); await fetchInout(); await fetchTransfers()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
