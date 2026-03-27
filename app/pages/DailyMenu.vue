<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-orange-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">菜</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">田園餐廳 · 每日菜色</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Holy Mother Farm</p>
          </div>
        </div>
        <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
          <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
          <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
        </span>
      </div>
      <!-- 頁籤：查看 / 編輯 + 週/月切換 -->
      <nav class="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        <button @click="isEditMode = false"
                :class="!isEditMode ? 'bg-orange-700 text-white' : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0">
          查看
        </button>
        <button @click="isEditMode = true"
                :class="isEditMode ? 'bg-orange-700 text-white' : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0">
          編輯
        </button>
        <!-- 週/月切換（僅查看模式顯示）-->
        <template v-if="!isEditMode">
          <span class="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-1 flex-shrink-0"></span>
          <button @click="viewRange = 'week'"
                  :class="viewRange === 'week' ? 'bg-stone-200 dark:bg-zinc-600 text-stone-700 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0">
            週
          </button>
          <button @click="viewRange = 'month'"
                  :class="viewRange === 'month' ? 'bg-stone-200 dark:bg-zinc-600 text-stone-700 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0">
            月
          </button>
        </template>
      </nav>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="flex flex-col lg:flex-row gap-4 items-start">

        <!-- ── 左欄：日曆（月視圖時隱藏）── -->
        <div v-if="isEditMode || viewRange === 'week'" class="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 lg:sticky lg:top-20">
            <div class="flex items-center justify-between mb-3">
              <button @click="prevMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <span class="text-base font-semibold text-stone-700 dark:text-stone-100">{{ calLabel }}</span>
              <button @click="nextMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
            <div class="grid grid-cols-7 mb-1">
              <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                   class="text-center text-sm text-stone-400 dark:text-stone-500 font-medium py-1">{{ w }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(day, idx) in calDays" :key="idx"
                   class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                   :class="dayClass(day)"
                   @click="day.date && selectDate(day.date)">
                <span>{{ day.label }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
              <span class="text-sm text-stone-500 dark:text-stone-400">
                <span v-if="selectedDate" class="text-stone-700 dark:text-stone-200 font-medium">{{ selectedDate }}</span>
                <span v-else>請選擇日期</span>
              </span>
              <div class="flex items-center gap-2">
                <button v-if="selectedDate && dateStatus[selectedDate]"
                        @click="confirmDeleteDay"
                        class="text-xs text-red-400 hover:text-red-500 transition-colors">刪除當天</button>
                <button @click="selectDate(todayStr)" class="text-sm text-orange-700 dark:text-orange-400 hover:text-orange-800 font-medium">今天</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 右欄 ── -->
        <div class="flex-1 min-w-0">

          <!-- ══ 查看模式 ══ -->
          <div v-if="!isEditMode">

            <!-- 週視圖：永遠顯示7天 -->
            <div v-if="viewRange === 'week'" class="flex flex-wrap gap-3">
              <div v-for="day in weekDates" :key="day.date" class="flex-1 min-w-40 max-w-64">

                <!-- 日期卡片頭 -->
                <div :class="day.date === todayStr
                  ? 'bg-orange-700 text-white'
                  : dateStatus[day.date] === 'complete'
                    ? 'bg-green-700 text-white'
                    : dateStatus[day.date] === 'partial'
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-200 dark:bg-zinc-700 text-stone-500 dark:text-stone-400'"
                     class="rounded-t-2xl px-3 py-2 flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-sm">{{ day.weekLabel }}</span>
                    <span class="text-xs opacity-80">{{ day.date.slice(5) }}</span>
                  </div>
                  <span v-if="dateStatus[day.date] === 'complete'" class="text-xs opacity-80">✓</span>
                </div>

                <!-- 卡片內容 -->
                <div class="bg-white dark:bg-zinc-900 rounded-b-2xl border-x border-b border-stone-200 dark:border-stone-700 shadow-sm min-h-20">
                  <!-- 無資料 -->
                  <div v-if="!dateStatus[day.date]"
                       class="flex items-center justify-center h-20 text-stone-300 dark:text-stone-600 text-xs">
                    無紀錄
                  </div>
                  <!-- 有資料 -->
                  <div v-else class="p-2 space-y-2">
                    <div v-for="section in sections" :key="section.type">
                      <div v-if="weekItemsByType(day.date, section.type).length > 0">
                        <span :class="section.badge" class="text-xs mb-1 inline-block">{{ section.label }}</span>
                        <div class="space-y-1.5">
                          <div v-for="item in weekItemsByType(day.date, section.type)" :key="item.id"
                               class="rounded-xl overflow-hidden border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800">
                            <img v-if="item.images && item.images.length > 0"
                                 :src="imgUrl(item.images[0])" :alt="item.name"
                                 class="w-full h-24 object-cover cursor-pointer"
                                 @click="previewUrl = imgUrl(item.images[0])" />
                            <div class="px-2 py-1.5">
                              <div class="flex items-center gap-1 flex-wrap">
                                  <span v-if="item.isFirst"
                                        class="text-xs px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-medium flex-shrink-0">現在</span>
                                <span v-else
                                      class="text-xs px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-zinc-600 text-stone-500 dark:text-stone-400 font-medium flex-shrink-0">已換</span>
                                <span v-if="item.dietType" :class="DIET_BADGE[item.dietType]"
                                      class="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{{ item.dietType }}</span>
                                <p class="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-snug">{{ item.name }}</p>
                              </div>
                              <p v-if="item.ingredients && item.ingredients.length"
                                 class="text-xs text-stone-400 dark:text-stone-500 mt-0.5 leading-relaxed">
                                {{ item.ingredients.join('・') }}
                              </p>
                              <p v-if="item.note" class="text-xs text-stone-400 italic mt-0.5">{{ item.note }}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- 月視圖：卡片排列 -->
            <div v-if="viewRange === 'month'">
              <!-- 月份導覽 -->
              <div class="flex items-center justify-center gap-4 mb-4">
                <button @click="prevCalMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <span class="font-semibold text-stone-700 dark:text-stone-100 w-32 text-center">{{ calLabel }}</span>
                <button @click="nextCalMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>

              <!-- 卡片（和週視圖完全相同樣式，顯示整月有資料的天）-->
              <div class="flex flex-wrap gap-3">
                <template v-for="day in monthDates" :key="day.date">
                  <div v-if="dateStatus[day.date]" class="flex-1 min-w-44 max-w-64">
                    <!-- 卡片頭 -->
                    <div :class="day.date === todayStr
                      ? 'bg-orange-700 text-white'
                      : dateStatus[day.date] === 'complete'
                        ? 'bg-green-700 text-white'
                        : dateStatus[day.date] === 'partial'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'"
                         class="rounded-t-2xl px-3 py-2 flex items-center justify-between">
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-sm">{{ day.weekLabel }}</span>
                        <span class="text-xs opacity-80">{{ day.date.slice(5) }}</span>
                      </div>
                      <span v-if="dateStatus[day.date] === 'complete'" class="text-xs opacity-80">✓</span>
                    </div>
                    <!-- 卡片內容 -->
                    <div class="bg-white dark:bg-zinc-900 rounded-b-2xl border-x border-b border-stone-200 dark:border-stone-700 shadow-sm">
                      <div class="p-2 space-y-2">
                        <div v-for="section in sections" :key="section.type">
                          <div v-if="weekItemsByType(day.date, section.type).length > 0">
                            <span :class="section.badge" class="text-xs mb-1 inline-block">{{ section.label }}</span>
                            <div class="space-y-1.5">
                              <div v-for="item in weekItemsByType(day.date, section.type)" :key="item.id"
                                   class="rounded-xl overflow-hidden border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800">
                                <img v-if="item.images && item.images.length > 0"
                                     :src="imgUrl(item.images[0])" :alt="item.name"
                                     class="w-full h-24 object-cover cursor-pointer"
                                     @click="previewUrl = imgUrl(item.images[0])" />
                                <div class="px-2 py-1.5">
                                  <div class="flex items-center gap-1 flex-wrap">
                                    <span v-if="item.isFirst"
                                          class="text-xs px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-medium flex-shrink-0">現在</span>
                                    <span v-else
                                          class="text-xs px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-zinc-600 text-stone-500 dark:text-stone-400 font-medium flex-shrink-0">已換</span>
                                    <span v-if="item.dietType" :class="DIET_BADGE[item.dietType]"
                                          class="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{{ item.dietType }}</span>
                                    <p class="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-snug">{{ item.name }}</p>
                                  </div>
                                  <p v-if="item.ingredients && item.ingredients.length"
                                     class="text-xs text-stone-400 dark:text-stone-500 mt-0.5 leading-relaxed">{{ item.ingredients.join('・') }}</p>
                                  <p v-if="item.note" class="text-xs text-stone-400 italic mt-0.5">{{ item.note }}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <div v-if="monthDates.every(d => !dateStatus[d.date])"
                   class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-10 text-center text-stone-400 text-sm shadow-sm">
                本月尚無任何菜色紀錄
              </div>
            </div>

          </div>

          <!-- ══ 編輯模式：單天 ══ -->
          <div v-if="isEditMode && selectedDate">
            <div class="space-y-5">
              <div v-for="section in sections" :key="section.type">
                <!-- 分類標題 -->
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold text-stone-700 dark:text-stone-100 flex items-center gap-2">
                    <span :class="section.badge">{{ section.label }}</span>
                    <span class="text-sm font-normal text-stone-400">{{ slotsByType(section.type).length }} 槽</span>
                  </h3>
                </div>

                <!-- 槽位列表 -->
                <div class="space-y-3">
                  <div v-for="slot in slotsByType(section.type)" :key="`${section.type}-${slot}`"
                       class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">

                    <!-- 槽位內所有菜品 -->
                    <div v-for="(item, itemIdx) in itemsByTypeAndSlot(section.type, slot)" :key="item.id">
                      <!-- 分隔線（第2道以後）-->
                      <div v-if="itemIdx > 0" class="mx-3 border-t border-dashed border-stone-200 dark:border-stone-700"></div>

                      <!-- 左圖右內容橫排 -->
                      <div class="flex gap-3 p-3">
                        <!-- 左側：圖片區 -->
                        <div class="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden relative"
                             :class="(!item.images || item.images.length === 0) ? 'border-2 border-dashed border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800' : ''">
                          <img v-if="item.images && item.images.length > 0"
                               :src="imgUrl(item.images[0])" :alt="item.name"
                               class="w-full h-full object-cover cursor-pointer"
                               @click="previewUrl = imgUrl(item.images[0])" />
                          <button v-if="item.images && item.images.length > 0"
                                  @click="deleteItemImage(item)"
                                  class="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors">
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                          <button v-else @click="openSingleImageUpload(item)"
                                  class="w-full h-full flex items-center justify-center text-stone-300 hover:text-orange-400 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
                          </button>
                        </div>

                        <!-- 右側：內容區 -->
                        <div class="flex-1 min-w-0">
                          <!-- 第一行：菜名 + 葷素 + 操作 -->
                          <div class="flex items-center gap-2">
                            <input v-model="item.name" :placeholder="section.placeholder"
                                   @blur="autoSave(item)"
                                   class="flex-1 min-w-0 font-semibold text-stone-800 dark:text-stone-100 text-sm bg-transparent border-b border-transparent hover:border-stone-200 dark:hover:border-stone-600 focus:border-orange-400 focus:outline-none pb-0.5 transition-colors" />
                            <select v-if="section.hasDiet" v-model="item.dietType"
                                    @change="autoSave(item)"
                                    class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-600 bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 outline-none cursor-pointer">
                              <option value="">—</option>
                              <option v-for="d in DIET_TYPES" :key="d" :value="d">{{ d }}</option>
                            </select>
                            <!-- 操作按鈕（橫排）-->
                            <div class="flex gap-0.5 flex-shrink-0">
                              <button v-if="item.images && item.images.length > 0"
                                      @click="openSingleImageUpload(item)"
                                      class="p-1 text-stone-300 hover:text-orange-500 transition-colors" title="更換圖片">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              </button>
                              <button @click="showNote[item.id] = !showNote[item.id]"
                                      class="p-1 text-stone-300 hover:text-stone-500 transition-colors" title="備註">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                              </button>
                              <button @click="confirmDelete(item)"
                                      class="p-1 text-stone-200 hover:text-red-400 transition-colors" title="刪除">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              </button>
                            </div>
                          </div>

                          <!-- 食材標籤 -->
                          <div class="flex flex-wrap gap-1 mt-1.5 items-center">
                            <span v-for="(ing, ingIdx) in item.ingredients" :key="ingIdx"
                                  class="flex items-center gap-0.5 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs rounded-full">
                              {{ ing }}
                              <button @click="item.ingredients.splice(ingIdx, 1); autoSave(item)"
                                      class="text-green-300 hover:text-red-400 leading-none ml-0.5">×</button>
                            </span>
                            <input v-model="ingredientDraft[item.id]" placeholder="+ 食材"
                                   @keydown.enter.prevent="addIngredientToItem(item)"
                                   @blur="addIngredientToItem(item)"
                                   class="px-2 py-0.5 text-xs bg-stone-50 dark:bg-zinc-800 border border-dashed border-stone-300 dark:border-stone-600 rounded-full text-stone-400 focus:outline-none focus:border-orange-400 w-14 focus:w-24 transition-all" />
                          </div>

                          <!-- 備註 -->
                          <input v-if="item.note || showNote[item.id]"
                                 v-model="item.note" placeholder="備註…"
                                 @blur="autoSave(item)"
                                 class="w-full text-xs text-stone-400 dark:text-stone-500 bg-transparent border-none focus:outline-none mt-1 italic" />
                        </div>
                      </div>
                    </div>

                    <!-- 在此槽位新增下一道菜品 -->
                    <div class="px-4 pb-3">
                      <button @click="addItemToSlot(section.type, slot)"
                              class="w-full text-xs text-stone-400 hover:text-orange-600 border border-dashed border-stone-200 dark:border-stone-700 hover:border-orange-400 rounded-xl py-2 transition-colors flex items-center justify-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        換下一道
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isEditMode && !selectedDate" class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-12 text-center text-stone-400 text-sm shadow-sm">
            請從左側日曆選擇日期
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 圖片上傳 Modal ════════ -->
    <div v-if="imageModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-bold text-stone-800 dark:text-stone-100">圖片管理</h3>
            <p class="text-xs text-stone-400 mt-0.5">{{ imageModal.item?.name || '未命名' }}</p>
          </div>
          <button @click="imageModal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="mb-4">
          <div v-if="imageModal.images.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <div v-for="(url, idx) in imageModal.images" :key="idx"
                 class="relative group aspect-square rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
              <img :src="imgUrl(url)" class="w-full h-full object-cover cursor-pointer" @click="previewUrl = imgUrl(url)" />
              <button @click="deleteMenuImage(idx)"
                      class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 hover:bg-red-600">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <p v-else class="text-sm text-stone-400 py-4 text-center border border-dashed border-stone-200 dark:border-stone-700 rounded-xl">尚無圖片</p>
        </div>
        <div @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="handleDrop"
             :class="dragOver ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-stone-300 dark:border-stone-600 hover:border-orange-400'"
             class="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all" @click="fileInputRef?.click()">
          <svg class="w-8 h-8 mx-auto mb-2 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          <p class="text-sm text-stone-500 dark:text-stone-400">點擊或拖曳圖片上傳</p>
          <input ref="fileInputRef" type="file" multiple accept="image/*" class="hidden" @change="handleFileSelect" />
        </div>
        <div v-if="uploading" class="mt-3 flex items-center gap-2 text-sm text-stone-500">
          <div class="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>上傳中…
        </div>
        <button @click="imageModal.show = false" class="mt-4 w-full px-4 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">關閉</button>
      </div>
    </div>

    <!-- 大圖預覽 -->
    <div v-if="previewUrl" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] cursor-pointer p-4" @click="previewUrl = ''">
      <img :src="previewUrl" class="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
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
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const commonStore = useCommonStore()
const BASE        = commonStore.data.main_url + '/holy/menu'
const API_ORIGIN  = commonStore.data.main_url

const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_ORIGIN + path
}

// ── 分類設定 ──────────────────────────────────────────────────────
const DIET_TYPES = ['葷食', '素食', '五辛素', '蛋奶素', '五辛蛋奶素']
const DIET_BADGE = {
  '葷食':       'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  '素食':       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  '五辛素':     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  '蛋奶素':     'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  '五辛蛋奶素': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const sections = [
  { type: 'dish',      label: '菜',     badge: 'px-2 py-0.5 rounded-full text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold',  placeholder: '菜名…',       hasDiet: true },
  { type: 'soup',      label: '湯',     badge: 'px-2 py-0.5 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold',      placeholder: '湯名…',       hasDiet: true },
  { type: 'tea',       label: '茶',     badge: 'px-2 py-0.5 rounded-full text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold',   placeholder: '茶名…',       hasDiet: false },
  { type: 'salad_bar', label: '沙拉霸', badge: 'px-2 py-0.5 rounded-full text-sm bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400 font-semibold',      placeholder: '沙拉霸名稱…', hasDiet: false },
]

// ── 狀態 ──────────────────────────────────────────────────────────
const apiOnline       = ref(false)
const menuItems       = ref([])
const dateStatus      = ref({})   // { "2026-03-26": "complete" | "partial" }
const selectedDate    = ref('')
const previewUrl      = ref('')
const fileInputRef    = ref(null)
const dragOver        = ref(false)
const uploading       = ref(false)
const isEditMode      = ref(false)  // false=查看，true=編輯
const viewRange       = ref('week') // 'week' | 'month'
const expandedCalDate = ref(null)   // 月視圖點擊展開的日期
const ingredientDraft = reactive({})
const showNote        = reactive({})

const today    = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const calYear  = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)

const itemsByType = (type) => menuItems.value.filter(i => i.type === type)

// 取得某類型的所有 slot 編號（排序）
const slotsByType = (type) => {
  const slots = [...new Set(menuItems.value.filter(i => i.type === type).map(i => i.slot || 1))]
  return slots.sort((a, b) => a - b)
}

// 取得某類型某 slot 的所有菜品（依 id 排序）
const itemsByTypeAndSlot = (type, slot) =>
  menuItems.value.filter(i => i.type === type && (i.slot || 1) === slot)
    .sort((a, b) => a.id.localeCompare(b.id))

// ── 當週日期 computed ─────────────────────────────────────────────
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const weekDates = computed(() => {
  const base = selectedDate.value ? new Date(selectedDate.value) : new Date()
  const dow = base.getDay()  // 0=日
  const monday = new Date(base)
  monday.setDate(base.getDate() - dow)  // 從週日開始
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const yyyy = d.getFullYear()
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const dd   = String(d.getDate()).padStart(2, '0')
    return { date: `${yyyy}-${mm}-${dd}`, weekLabel: WEEK_LABELS[d.getDay()] }
  })
})

// 週視圖的品項快取（以日期為 key）
const weekItemsMap = ref({})

// 查看模式：每個 slot 顯示全部，標記第一道（現在）和其他（已換）
const weekItemsByType = (date, type) => {
  const items = (weekItemsMap.value[date] || [])
    .filter(i => i.type === type && ((i.name && i.name.trim() !== '') || (i.images && i.images.length > 0)))
  // 依 slot 分組
  const slotMap = {}
  for (const item of items) {
    const slot = item.slot || 1
    if (!slotMap[slot]) slotMap[slot] = []
    slotMap[slot].push(item)
  }
  // 每個 slot 依 id 排序，第一道標記 isFirst
  const result = []
  for (const slot of Object.keys(slotMap).map(Number).sort()) {
    const slotItems = slotMap[slot].sort((a, b) => a.id.localeCompare(b.id))
    slotItems.forEach((item, idx) => result.push({ ...item, isFirst: idx === 0 }))
  }
  return result
}

// 查看模式切換或日期選擇時，拉當週資料
const fetchWeekItems = async () => {
  const promises = weekDates.value.map(async (day) => {
    // 只有確定有資料的天才用快取，避免空陣列擋住重新拉
    if (weekItemsMap.value[day.date] && weekItemsMap.value[day.date].length > 0) return
    try {
      const items = await (await fetch(`${BASE}/get/${day.date}`)).json()
      // 只儲存有名稱的項目（過濾純模板空白）
      weekItemsMap.value[day.date] = items.filter(i => (i.name && i.name.trim() !== '') || (i.images && i.images.length > 0))
    } catch { weekItemsMap.value[day.date] = [] }
  })
  await Promise.all(promises)
}

// 月視圖：整月所有日期（含星期標籤）
const monthDates = computed(() => {
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const mm = String(calMonth.value).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    const date = `${calYear.value}-${mm}-${dd}`
    return { date, weekLabel: WEEK_LABELS[new Date(date).getDay()] }
  })
})
const prevCalMonth = () => {
  if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value--
  fetchMarkedDates(); fetchMonthItems()
}
const nextCalMonth = () => {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
  fetchMarkedDates(); fetchMonthItems()
}
const fetchMonthItems = async () => {
  const datesWithData = Object.keys(dateStatus.value).filter(d => d.startsWith(yearMonth.value))
  await Promise.all(datesWithData.map(async (date) => {
    if (weekItemsMap.value[date]) return
    try {
      const items = await (await fetch(`${BASE}/get/${date}`)).json()
      weekItemsMap.value[date] = items.filter(i => (i.name && i.name.trim() !== '') || (i.images && i.images.length > 0))
    }
    catch { weekItemsMap.value[date] = [] }
  }))
}

// 切換到月視圖時自動拉資料
watch(viewRange, async (range) => {
  if (range === 'month') await fetchMonthItems()
})

// ── 日曆 ──────────────────────────────────────────────────────────
const calLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)
const calDays  = computed(() => {
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
  if (day.date === selectedDate.value) return 'bg-orange-700 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-semibold hover:bg-orange-200'
  if (dateStatus.value[day.date] === 'complete') return 'text-green-600 dark:text-green-400 font-semibold hover:bg-stone-100 dark:hover:bg-zinc-700'
  if (dateStatus.value[day.date] === 'partial')  return 'text-amber-500 dark:text-amber-400 font-semibold hover:bg-stone-100 dark:hover:bg-zinc-700'
  return 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
}
const yearMonth = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2,'0')}`)

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
  weekItemsMap.value = {}  // 清除週快取，強制重新拉
  await fetch(`${BASE}/init/${date}`, { method: 'POST' })
  await fetchMenuItems()
  await fetchMarkedDates()
  if (!isEditMode.value) await fetchWeekItems()
}

// 切到查看模式時自動拉當週資料
watch(isEditMode, async (editing) => {
  if (!editing) {
    weekItemsMap.value = {}
    await fetchWeekItems()
  }
})

// ── 食材 ──────────────────────────────────────────────────────────
const addIngredientToItem = (item) => {
  const val = (ingredientDraft[item.id] || '').trim()
  if (val && !item.ingredients.includes(val)) {
    item.ingredients.push(val)
    autoSave(item)
  }
  ingredientDraft[item.id] = ''
}

// ── 單張圖片直接上傳/刪除 ────────────────────────────────────────
const singleFileInput = ref(null)
const singleUploadTarget = ref(null)

const openSingleImageUpload = (item) => {
  singleUploadTarget.value = item
  // 動態建立 input 觸發選檔
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('files', file)
    try {
      // 若已有圖先刪除
      if (item.images && item.images.length > 0) {
        const oldFile = item.images[0].split('/').pop()
        await fetch(`${BASE}/image/remove/${item.date}/${item.id}?fileName=${oldFile}`, { method: 'DELETE' })
      }
      const res = await fetch(`${BASE}/image/upload/${item.date}/${item.id}`, { method: 'POST', body: formData })
      const newPaths = await res.json()
      item.images = newPaths.slice(0, 1)   // 只保留一張
      showToast('圖片已更新')
    } catch { showToast('上傳失敗') }
  }
  input.click()
}

const deleteItemImage = async (item) => {
  if (!item.images || item.images.length === 0) return
  const fileName = item.images[0].split('/').pop()
  try {
    await fetch(`${BASE}/image/remove/${item.date}/${item.id}?fileName=${fileName}`, { method: 'DELETE' })
    item.images = []
    showToast('圖片已刪除')
  } catch (e) { console.error(e) }
}

// ── 圖片上傳 Modal（保留供其他用途）─────────────────────────────
const imageModal = reactive({ show: false, item: null, images: [] })
const openImageUpload = (item) => { imageModal.item = item; imageModal.images = [...(item.images || [])]; imageModal.show = true }
const handleFileSelect = (e) => uploadImages(Array.from(e.target.files))
const handleDrop = (e) => { dragOver.value = false; uploadImages(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))) }

const uploadImages = async (files) => {
  if (!imageModal.item || files.length === 0) return
  uploading.value = true
  try {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    const res = await fetch(`${BASE}/image/upload/${imageModal.item.date}/${imageModal.item.id}`, { method: 'POST', body: formData })
    const newPaths = await res.json()
    imageModal.images.push(...newPaths)
    const found = menuItems.value.find(i => i.id === imageModal.item.id)
    if (found) found.images = [...imageModal.images]
    showToast(`成功上傳 ${newPaths.length} 張圖片`)
  } catch { showToast('上傳失敗') }
  finally { uploading.value = false; if (fileInputRef.value) fileInputRef.value.value = '' }
}
const deleteMenuImage = async (idx) => {
  if (!confirm('確定刪除？')) return
  const url = imageModal.images[idx]
  const fileName = url.split('/').pop()
  try {
    await fetch(`${BASE}/image/remove/${imageModal.item.date}/${imageModal.item.id}?fileName=${fileName}`, { method: 'DELETE' })
    imageModal.images.splice(idx, 1)
    const found = menuItems.value.find(i => i.id === imageModal.item.id)
    if (found) found.images = [...imageModal.images]
    showToast('圖片已刪除')
  } catch (e) { console.error(e) }
}

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '' })
const showToast = (msg) => { toast.message = msg; toast.show = true; setTimeout(() => toast.show = false, 2500) }

// ── API ───────────────────────────────────────────────────────────
const fetchMarkedDates = async () => {
  try {
    dateStatus.value = await (await fetch(`${BASE}/dates/${yearMonth.value}`)).json()
    apiOnline.value = true
  } catch { apiOnline.value = false }
}

const fetchMenuItems = async () => {
  if (!selectedDate.value) return
  try {
    menuItems.value = await (await fetch(`${BASE}/get/${selectedDate.value}`)).json()
    menuItems.value.forEach(i => { if (!ingredientDraft[i.id]) ingredientDraft[i.id] = '' })
  } catch (e) { console.error(e) }
}

// blur 時自動儲存
const autoSave = async (item) => {
  if (!item.id) return
  try {
    await fetch(`${BASE}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    })
    await fetchMarkedDates()   // 更新完成狀態
  } catch (e) { console.error(e) }
}

// 在指定槽位新增下一道菜品
const addItemToSlot = async (type, slot) => {
  try {
    const res = await fetch(`${BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate.value, type, slot, name: '', ingredients: [], images: [], note: '' })
    })
    const saved = await res.json()
    menuItems.value.push(saved)
    ingredientDraft[saved.id] = ''
  } catch (e) { console.error(e) }
}

const addItem = async (type) => {
  try {
    const res = await fetch(`${BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate.value, type, name: '', ingredients: [], images: [], note: '' })
    })
    const saved = await res.json()
    menuItems.value.push(saved)
    ingredientDraft[saved.id] = ''
  } catch (e) { console.error(e) }
}

const confirmDeleteDay = async () => {
  if (!confirm(`確定刪除 ${selectedDate.value} 的所有菜色？此操作無法復原。`)) return
  try {
    await fetch(`${BASE}/remove/${selectedDate.value}`, { method: 'DELETE' })
    menuItems.value = []
    delete dateStatus.value[selectedDate.value]
    delete weekItemsMap.value[selectedDate.value]
    showToast(`${selectedDate.value} 菜色已刪除`)
  } catch (e) { console.error(e) }
}

const confirmDelete = async (item) => {
  if (!confirm(`確定刪除${item.name ? `「${item.name}」` : '這個項目'}？`)) return
  try {
    await fetch(`${BASE}/remove/${item.date}/${item.id}`, { method: 'DELETE' })
    menuItems.value = menuItems.value.filter(i => i.id !== item.id)
    showToast('已刪除')
  } catch (e) { console.error(e) }
}

onMounted(async () => {
  await fetchMarkedDates()
  selectedDate.value = todayStr
  await fetch(`${BASE}/init/${todayStr}`, { method: 'POST' })
  await fetchMenuItems()
  await fetchMarkedDates()   // init 後重新計算
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
