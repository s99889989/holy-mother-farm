<template>
  <ClientOnly>
    <div class="min-h-full bg-surface2 transition-colors duration-300">

      <!-- ── 頂部導覽 ── -->
      <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-orange-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">菜</div>
            <div>
              <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">田園餐廳 · 每日菜色</h1>
              <p class="text-xs text-hint-c mt-0.5 hidden sm:block">Holy Mother Farm</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
          <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
            <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
            <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
          </span>
            <div class="flex items-center gap-1">
              <button @click="isEditMode = false"
                      :class="!isEditMode ? 'bg-orange-700 text-white' : 'text-hint-c dark:text-hint-c hover-surface2'"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">查看</button>
              <button :disabled="!perm.can('staff.daily-menu')" @click="perm.can('staff.daily-menu') && (isEditMode = true)"
                      :class="isEditMode ? 'bg-orange-700 text-white' : 'text-hint-c dark:text-hint-c hover-surface2'"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">編輯</button>
              <button @click="openSuggest" :disabled="suggesting"
                      class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-hint-c dark:text-hint-c hover-surface2">
                <svg v-if="!suggesting" class="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <div v-else class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div :class="isEditMode ? 'flex flex-col lg:flex-row' : 'flex flex-col'" class="gap-4 items-start">

          <!-- ── 左欄：日曆（僅編輯模式）── -->
          <div v-if="isEditMode" class="w-full lg:w-72 xl:w-80 flex-shrink-0">
            <div class="bg-surface rounded-2xl border border-light-c shadow-sm p-4 lg:sticky lg:top-20">
              <div class="flex items-center justify-between mb-3">
                <button @click="prevMonth" class="p-1.5 hover-surface2 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-hint-c dark:text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <span class="text-base font-semibold text-muted-c">{{ calLabel }}</span>
                <button @click="nextMonth" class="p-1.5 hover-surface2 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-hint-c dark:text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
              <div class="grid grid-cols-7 mb-1">
                <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                     class="text-center text-sm text-hint-c font-medium py-1">{{ w }}</div>
              </div>
              <div class="grid grid-cols-7 gap-1">
                <div v-for="(day, idx) in calDays" :key="idx"
                     class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                     :class="dayClass(day)"
                     @click="day.date && selectDate(day.date)">
                  <span>{{ day.label }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between mt-3 pt-3 border-t border-light-c">
              <span class="text-sm text-hint-c">
                <span v-if="selectedDate" class="text-base-c font-medium">{{ selectedDate }}</span>
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
          <div class="w-full min-w-0" ref="mainCol">

            <!-- ══ 查看模式 ══ -->
            <div v-if="!isEditMode">

              <!-- 導覽列 -->
              <div class="flex items-center justify-between mb-3">
                <button v-if="hasPrev" @click="slidePrev"
                        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-light-c text-muted-c hover-surface2 transition-colors shadow-sm font-medium select-none">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                  <span class="text-sm">前</span>
                </button>
                <div v-else class="w-20"></div>

                <div class="flex items-center gap-2">
                <span class="text-sm text-hint-c">
                  {{ displayDates[0]?.date.slice(5).replace('-', '/') }}
                  <span v-if="displayDates.length > 1"> — {{ displayDates[displayDates.length-1]?.date.slice(5).replace('-', '/') }}</span>
                </span>
                  <button @click="jumpToToday"
                          class="text-xs px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 transition-colors font-medium">
                    今天
                  </button>
                </div>

                <button v-if="hasNext" @click="slideNext"
                        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-light-c text-muted-c hover-surface2 transition-colors shadow-sm font-medium select-none">
                  <span class="text-sm">後</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                </button>
                <div v-else class="w-20"></div>
              </div>

              <!-- ── 載入中骨架 ── -->
              <div v-if="isLoading"
                   class="grid gap-3"
                   :style="{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }">
                <div v-for="i in colCount" :key="i"
                     class="rounded-2xl bg-surface border border-light-c overflow-hidden animate-pulse">
                  <div class="h-8 bg-surface2 rounded-t-2xl"></div>
                  <div class="p-3 space-y-2">
                    <div class="h-28 bg-surface2 rounded-xl"></div>
                    <div class="h-3 bg-surface2 rounded w-3/4"></div>
                    <div class="h-3 bg-surface2 rounded w-1/2"></div>
                    <div class="h-3 bg-surface2 rounded w-2/3"></div>
                  </div>
                </div>
              </div>

              <!-- 卡片網格 -->
              <div v-else
                   class="grid gap-3"
                   :style="{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }"
                   @touchstart="onTouchStart"
                   @touchend="onTouchEnd">
                <div v-for="day in displayDates" :key="day.date">

                  <!-- 卡片頭 -->
                  <div :class="day.date === todayStr
 ? 'bg-orange-700 text-white'
 : dateStatus[day.date] === 'complete'
 ? 'bg-green-700 text-white'
 : dateStatus[day.date] === 'partial'
 ? 'bg-amber-500 text-white'
 : 'bg-surface2 text-hint-c'"
                       class="rounded-t-2xl px-3 py-2 flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-sm">{{ day.weekLabel }}</span>
                      <span class="text-xs opacity-80">{{ day.date.slice(5) }}</span>
                    </div>
                    <span v-if="dateStatus[day.date] === 'complete'" class="text-xs opacity-80">✓</span>
                  </div>

                  <!-- 卡片內容 -->
                  <div class="bg-surface rounded-b-2xl border-x border-b border-light-c shadow-sm min-h-20">
                    <div v-if="!dateStatus[day.date]"
                         class="flex items-center justify-center h-20 text-hint-c text-xs">
                      無紀錄
                    </div>
                    <div v-else class="p-2 space-y-2">
                      <div v-for="section in sections" :key="section.type">
                        <div v-if="itemsByTypeForDate(day.date, section.type).length > 0">
                          <span :class="section.badge" class="text-xs mb-1 inline-block">{{ section.label }}</span>
                          <div class="space-y-1.5">
                            <div v-for="item in itemsByTypeForDate(day.date, section.type)" :key="item.id"
                                 class="rounded-xl overflow-hidden border border-light-c bg-surface2">
                              <template v-if="item.images && item.images.length > 0">
                                <img v-if="!imgErrors.has(item.images[0])"
                                     :src="thumbUrl(item.images[0])"
                                     :srcset="`${thumbUrl(item.images[0])} 400w, ${imgUrl(item.images[0])} 1200w`"
                                     sizes="(max-width: 640px) 45vw, 300px"
                                     :alt="item.name"
                                     class="w-full aspect-[4/3] object-cover cursor-pointer bg-surface2"
                                     loading="lazy"
                                     decoding="async"
                                     @error="imgErrors.add(item.images[0])"
                                     @click="previewUrl = imgUrl(item.images[0])" />
                                <div v-else
                                     class="w-full aspect-[4/3] bg-surface2 flex items-center justify-center text-hint-c text-xs">
                                  無法載入圖片
                                </div>
                              </template>
                              <div class="px-2 py-1.5">
                                <div class="flex items-center gap-1 flex-wrap">
                                <span v-if="item.isFirst"
                                      class="text-xs px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-medium flex-shrink-0">現在</span>
                                  <span v-else
                                        class="text-xs px-1.5 py-0.5 rounded-full bg-surface2 text-hint-c font-medium flex-shrink-0">已換</span>
                                  <span v-if="item.dietType" :class="DIET_BADGE[item.dietType]"
                                        class="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{{ item.dietType }}</span>
                                  <p class="font-semibold text-base-c text-sm leading-snug">{{ item.name }}</p>
                                </div>
                                <p v-if="item.ingredients && item.ingredients.length"
                                   class="text-xs text-hint-c mt-0.5 leading-relaxed">
                                  {{ item.ingredients.join('・') }}
                                </p>
                                <p v-if="item.note" class="text-xs text-hint-c italic mt-0.5">{{ item.note }}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            <!-- ══ 編輯模式：單天 ══ -->
            <div v-if="isEditMode && selectedDate">

              <div class="space-y-5">
                <div v-for="section in sections" :key="section.type">
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-muted-c flex items-center gap-2">
                      <span :class="section.badge">{{ section.label }}</span>
                      <span class="text-sm font-normal text-hint-c">{{ slotsByType(section.type).length }} 槽</span>
                    </h3>
                  </div>
                  <div class="space-y-3">
                    <div v-for="slot in slotsByType(section.type)" :key="`${section.type}-${slot}`"
                         class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
                      <div v-for="(item, itemIdx) in itemsByTypeAndSlot(section.type, slot)" :key="item.id">
                        <div v-if="itemIdx > 0" class="mx-3 border-t border-dashed border-light-c"></div>
                        <div class="flex gap-3 p-3">
                          <div class="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden relative"
                               :class="(!item.images || item.images.length === 0) ? 'border-2 border-dashed border-light-c bg-surface2' : ''">
                            <template v-if="item.images && item.images.length > 0">
                              <img v-if="!imgErrors.has(item.images[0])"
                                   :src="imgUrl(item.images[0])" :alt="item.name"
                                   class="w-full h-full object-cover cursor-pointer"
                                   decoding="async"
                                   @error="imgErrors.add(item.images[0])"
                                   @click="previewUrl = imgUrl(item.images[0])" />
                              <div v-else class="w-full h-full flex items-center justify-center text-hint-c text-xs text-center p-1">無法載入</div>
                            </template>
                            <button v-if="item.images && item.images.length > 0"
                                    @click="deleteItemImage(item)"
                                    class="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors">
                              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                            <button v-else @click="openSingleImageUpload(item)"
                                    class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-hint-c hover:text-orange-500 transition-colors">
                              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
                              <span class="text-xs">加圖</span>
                            </button>
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="flex items-start gap-2 mb-1">
                              <select v-if="section.hasDiet" v-model="item.dietType" @change="autoSave(item)"
                                      class="text-xs border border-light-c rounded-lg px-1.5 py-0.5 bg-surface text-muted-c flex-shrink-0">
                                <option value="">飲食</option>
                                <option v-for="dt in DIET_TYPES" :key="dt" :value="dt">{{ dt }}</option>
                              </select>
                              <input v-model="item.name" :placeholder="section.placeholder"
                                     @blur="autoSave(item)"
                                     class="flex-1 min-w-0 text-sm font-semibold bg-transparent border-none focus:outline-none text-base-c placeholder-hint" />
                              <div class="flex items-center gap-1 flex-shrink-0">
                                <button @click="showNote[item.id] = !showNote[item.id]"
                                        class="p-1 text-hint-c hover:text-hint-c transition-colors">
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                                </button>
                                <button @click="confirmDelete(item)"
                                        class="p-1 text-base-c hover:text-red-400 transition-colors">
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            </div>
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
                                     class="px-2 py-0.5 text-xs bg-surface2 border border-dashed border-base rounded-full text-hint-c focus:outline-none focus:border-orange-400 w-14 focus:w-24 transition-all" />
                            </div>
                            <input v-if="item.note || showNote[item.id]"
                                   v-model="item.note" placeholder="備註…"
                                   @blur="autoSave(item)"
                                   class="w-full text-xs text-hint-c bg-transparent border-none focus:outline-none mt-1 italic" />
                          </div>
                        </div>
                      </div>
                      <div class="px-4 pb-3">
                        <button @click="addItemToSlot(section.type, slot)"
                                class="w-full text-xs text-hint-c hover:text-orange-600 border border-dashed border-light-c hover:border-orange-400 rounded-xl py-2 transition-colors flex items-center justify-center gap-1">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                          換下一道
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="isEditMode && !selectedDate" class="bg-surface rounded-2xl border border-light-c p-12 text-center text-hint-c text-sm shadow-sm">
              請從左側日曆選擇日期
            </div>
          </div>
        </div>
      </div>

      <!-- 隨機建議 Modal -->
      <div v-if="suggestModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
        <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-3">
            <div class="min-w-0 mr-2">
              <h3 class="text-base font-bold text-base-c">隨機建議菜色</h3>
              <p class="text-xs text-hint-c mt-0.5">從歷史紀錄隨機抽取，僅供參考，資料越多建議越豐富</p>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <button @click="openSuggest" :disabled="suggesting"
                      class="p-2 rounded-lg bg-surface2 text-muted-c hover-surface2 transition-colors">
                <svg class="w-4 h-4" :class="suggesting ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </button>
              <button @click="suggestModal.show = false" class="p-2 text-hint-c hover:text-muted-c">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <!-- 菜 5 格 -->
            <div v-if="suggestModal.data['dish']">
              <p class="text-xs font-semibold text-hint-c mb-1.5">菜</p>
              <div v-if="suggestModal.data['dish'].length > 0" class="grid grid-cols-3 gap-2">
                <div v-for="(item, idx) in suggestModal.data['dish']" :key="idx"
                     class="rounded-xl overflow-hidden border border-light-c bg-surface2">
                  <div v-if="item.images && item.images.length > 0" class="aspect-square">
                    <img :src="imgUrl(item.images[0])" :alt="item.name"
                         class="w-full h-full object-cover cursor-pointer" loading="lazy" decoding="async"
                         @click="previewUrl = imgUrl(item.images[0])" />
                  </div>
                  <div v-else class="aspect-square bg-surface2 flex items-center justify-center text-hint-c text-xs">無圖</div>
                  <div class="px-2 py-1">
                    <span v-if="item.dietType" :class="DIET_BADGE[item.dietType]"
                          class="text-xs px-1 py-0.5 rounded-full font-medium">{{ item.dietType }}</span>
                    <p v-if="item.name" class="text-xs font-semibold text-base-c mt-0.5">{{ item.name }}</p>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-hint-c py-2 px-3 rounded-xl bg-surface2 border border-dashed border-light-c">歷史紀錄不足</p>
            </div>

            <!-- 湯 + 茶 合併同一個 grid -->
            <div>
              <div class="grid grid-cols-3 gap-2">
                <div v-for="(item, idx) in [...(suggestModal.data['soup'] || []), ...(suggestModal.data['tea'] || [])]"
                     :key="idx" class="rounded-xl overflow-hidden border border-light-c bg-surface2">
                  <div v-if="item.images && item.images.length > 0" class="aspect-square">
                    <img :src="imgUrl(item.images[0])" :alt="item.name"
                         class="w-full h-full object-cover cursor-pointer" loading="lazy" decoding="async"
                         @click="previewUrl = imgUrl(item.images[0])" />
                  </div>
                  <div v-else class="aspect-square bg-surface2 flex items-center justify-center text-hint-c text-xs">無圖</div>
                  <div class="px-2 py-1">
                    <span v-if="item.dietType" :class="DIET_BADGE[item.dietType]"
                          class="text-xs px-1 py-0.5 rounded-full font-medium">{{ item.dietType }}</span>
                    <span v-if="item._category" class="text-xs text-hint-c ml-1">{{ item._category }}</span>
                    <p v-if="item.name" class="text-xs font-semibold text-base-c mt-0.5">{{ item.name }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button @click="suggestModal.show = false"
                  class="mt-5 w-full px-4 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl hover:bg-surface2 transition-colors">關閉</button>
        </div>
      </div>

      <!-- 圖片上傳 Modal -->
      <div v-if="imageModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
        <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-bold text-base-c">圖片管理</h3>
              <p class="text-xs text-hint-c mt-0.5">{{ imageModal.item?.name || '未命名' }}</p>
            </div>
            <button @click="imageModal.show = false" class="text-hint-c hover:text-muted-c p-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="mb-4">
            <div v-if="imageModal.images.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <div v-for="(url, idx) in imageModal.images" :key="idx"
                   class="relative group aspect-square rounded-xl overflow-hidden border border-light-c">
                <img :src="imgUrl(url)" class="w-full h-full object-cover cursor-pointer" decoding="async" @click="previewUrl = imgUrl(url)" />
                <button @click="deleteMenuImage(idx)"
                        class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 hover:bg-red-600">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <p v-else class="text-sm text-hint-c py-4 text-center border border-dashed border-light-c rounded-xl">尚無圖片</p>
          </div>

          <!-- 上傳區 -->
          <div @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="handleDrop"
               :class="dragOver ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-base hover:border-orange-400'"
               class="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all" @click="fileInputRef?.click()">
            <svg class="w-8 h-8 mx-auto mb-2 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            <p class="text-sm text-hint-c">點擊或拖曳圖片上傳</p>
            <p class="text-xs text-hint-c mt-1 opacity-60">上傳前自動壓縮，節省流量</p>
            <input ref="fileInputRef" type="file" multiple accept="image/*" class="hidden" @change="handleFileSelect" />
          </div>
          <div v-if="uploading" class="mt-3 flex items-center gap-2 text-sm text-hint-c">
            <div class="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            上傳中…{{ uploadProgress }}
          </div>
          <button @click="imageModal.show = false" class="mt-4 w-full px-4 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl hover:bg-surface2 transition-colors">關閉</button>
        </div>
      </div>

      <!-- 大圖預覽 -->
      <div v-if="previewUrl" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] cursor-pointer p-4" @click="previewUrl = ''">
        <img :src="previewUrl" class="max-w-full max-h-full rounded-xl shadow-2xl object-contain" decoding="async" />
      </div>

      <!-- Toast -->
      <transition name="fade">
        <div v-if="toast.show"
             class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
          <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </ClientOnly>
</template>

<script setup>
definePageMeta({layout: 'staff', requiredPermission: 'management.daily-menu'})
const perm = usePermission()

const commonStore = useCommonStore()
const BASE = commonStore.data.main_url + '/holy/menu'
const API_ORIGIN = commonStore.data.main_url

const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_ORIGIN + path
}

const thumbUrl = (path) => {
  if (!path) return ''
  const full = path.startsWith('http') ? path : API_ORIGIN + path
  return full.replace('/holy/menu/image/', '/holy/menu/image/thumb/')
}

// ── fetch with timeout ────────────────────────────────────────────
const fetchWithTimeout = (url, options = {}, ms = 8000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, {...options, signal: controller.signal}).finally(() => clearTimeout(timer))
}

// ── 上傳前在前端壓縮圖片 ──────────────────────────────────────────
// 目的：手機拍的照片通常 4–10 MB，壓縮到 1200px / quality 0.82 後
//       約 200–400 KB，可減少 ~80% 的上傳流量。
// 後端收到後仍會再做一次 WebP 轉換，確保統一格式。
const compressImage = (file, maxWidth = 1200, quality = 0.82) => {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {type: 'image/jpeg'})),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file) // 壓縮失敗就用原檔
    }
    img.src = url
  })
}

// ── 分類設定 ──────────────────────────────────────────────────────
const DIET_TYPES = ['葷食', '素食', '五辛素', '蛋奶素', '五辛蛋奶素']
const DIET_BADGE = {
  '葷食': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  '素食': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  '五辛素': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  '蛋奶素': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  '五辛蛋奶素': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}
const sections = [
  {
    type: 'dish',
    label: '菜',
    badge: 'px-2 py-0.5 rounded-full text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold',
    placeholder: '菜名…',
    hasDiet: true,
    defaultSlots: 5
  },
  {
    type: 'soup',
    label: '湯',
    badge: 'px-2 py-0.5 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold',
    placeholder: '湯名…',
    hasDiet: true,
    defaultSlots: 2
  },
  {
    type: 'tea',
    label: '茶',
    badge: 'px-2 py-0.5 rounded-full text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold',
    placeholder: '茶名…',
    hasDiet: false,
    defaultSlots: 1
  },
  {
    type: 'salad_bar',
    label: '沙拉霸',
    badge: 'px-2 py-0.5 rounded-full text-sm bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400 font-semibold',
    placeholder: '沙拉霸名稱…',
    hasDiet: false,
    defaultSlots: 3
  },
]

// ── 狀態 ──────────────────────────────────────────────────────────
const apiOnline = ref(false)
const isLoading = ref(false)
const menuItems = ref([])
const dateStatus = ref({})
const selectedDate = ref('')
const previewUrl = ref('')
const fileInputRef = ref(null)
const dragOver = ref(false)
const uploading = ref(false)
const uploadProgress = ref('')
const suggesting = ref(false)
const suggestModal = reactive({show: false, data: {}})
const isEditMode = ref(false)
const isClient = ref(false)
const ingredientDraft = reactive({})
const showNote = reactive({})
const imgErrors = reactive(new Set())

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)

// ── 視圖設定 ─────────────────────────────────────────────────────
const mainCol = ref(null)
const containerWidth = ref(800)
const CARD_GAP = 12
const COL_MIN_WIDTH = 160
const COL_MIN_WIDTH_MD = 320

const colCount = computed(() => {
  const minW = containerWidth.value >= 640 ? COL_MIN_WIDTH_MD : COL_MIN_WIDTH
  return Math.max(1, Math.floor((containerWidth.value + CARD_GAP) / (minW + CARD_GAP)))
})

// ── 日期搜尋 ─────────────────────────────────────────────────────
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const weekItemsMap = ref({})
const loadedMonthsCache = new Set()

const findDatesWithData = async (startDate, direction, count) => {
  const result = []
  const d = new Date(startDate)
  for (let i = 0; i < 365 && result.length < count; i++) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const date = `${yyyy}-${mm}-${dd}`
    const ym = `${yyyy}-${mm}`
    if (!loadedMonthsCache.has(ym)) {
      loadedMonthsCache.add(ym)
      try {
        const status = await (await fetchWithTimeout(`${BASE}/dates/${ym}`)).json()
        dateStatus.value = {...dateStatus.value, ...status}
        apiOnline.value = true
      } catch {
        apiOnline.value = false
        loadedMonthsCache.delete(ym)
      }
    }
    if (dateStatus.value[date]) result.push(date)
    d.setDate(d.getDate() + direction)
  }
  return result
}

const fetchItemsForDates = async (dates) => {
  await Promise.all(dates.map(async (date) => {
    if (weekItemsMap.value[date] !== undefined) return
    try {
      const items = await (await fetchWithTimeout(`${BASE}/get/${date}`)).json()
      weekItemsMap.value[date] = items.filter(i =>
        (i.name && i.name.trim() !== '') || (i.images && i.images.length > 0))
    } catch {
      weekItemsMap.value[date] = []
    }
  }))
}

// ── 顯示日期列表 ──────────────────────────────────────────────────
const anchorDate = ref(todayStr)
const hasPrev = ref(false)
const hasNext = ref(false)

const displayDates = computed(() =>
  (visibleDates.value).map(date => ({
    date,
    weekLabel: WEEK_LABELS[new Date(date).getDay()]
  }))
)
const visibleDates = ref([])

const refresh = async () => {
  isLoading.value = true
  try {
    let dates = await findDatesWithData(anchorDate.value, 1, colCount.value)

    if (dates.length === 0) {
      const prev = await findDatesWithData(anchorDate.value, -1, colCount.value)
      if (prev.length > 0) {
        anchorDate.value = prev[prev.length - 1]
        dates = await findDatesWithData(anchorDate.value, 1, colCount.value)
      }
    }

    if (dates.length > 0 && dates.length < colCount.value) {
      const need = colCount.value - dates.length
      const firstD = new Date(dates[0])
      firstD.setDate(firstD.getDate() - 1)
      const fs = `${firstD.getFullYear()}-${String(firstD.getMonth() + 1).padStart(2, '0')}-${String(firstD.getDate()).padStart(2, '0')}`
      const fill = await findDatesWithData(fs, -1, need)
      dates = [...fill.reverse(), ...dates]
      if (dates.length > 0) anchorDate.value = dates[0]
    }

    visibleDates.value = dates
    await fetchItemsForDates(dates)

    if (dates.length > 0) {
      const f = new Date(dates[0]);
      f.setDate(f.getDate() - 1)
      const fp = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
      hasPrev.value = (await findDatesWithData(fp, -1, 1)).length > 0

      const l = new Date(dates[dates.length - 1]);
      l.setDate(l.getDate() + 1)
      const ln = `${l.getFullYear()}-${String(l.getMonth() + 1).padStart(2, '0')}-${String(l.getDate()).padStart(2, '0')}`
      hasNext.value = (await findDatesWithData(ln, 1, 1)).length > 0
    } else {
      hasPrev.value = false
      hasNext.value = false
    }
  } finally {
    isLoading.value = false
  }
}

const slidePrev = async () => {
  const first = visibleDates.value[0]
  if (!first) return
  const d = new Date(first);
  d.setDate(d.getDate() - 1)
  const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const prev = await findDatesWithData(s, -1, colCount.value)
  if (prev.length === 0) return
  anchorDate.value = prev[prev.length - 1]
  await refresh()
}

const slideNext = async () => {
  const last = visibleDates.value[visibleDates.value.length - 1]
  if (!last) return
  const d = new Date(last);
  d.setDate(d.getDate() + 1)
  anchorDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  await refresh()
}

const jumpToToday = async () => {
  const recent = await findDatesWithData(todayStr, -1, 1)
  anchorDate.value = recent.length > 0 ? recent[0] : todayStr
  await refresh()
}

watch(colCount, () => refresh())

// ── 觸控 / 滑鼠 / 滾輪 切換 ──────────────────────────────────────
let touchStartX = 0
const onTouchStart = (e) => {
  touchStartX = e.touches[0].clientX
}
const onTouchEnd = (e) => {
  const diff = touchStartX - e.changedTouches[0].clientX
  if (Math.abs(diff) > 50) diff > 0 ? slideNext() : slidePrev()
}

let wheelTimer = null
let wheelAccum = 0
const onWheel = (e) => {
  if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return
  wheelAccum += e.deltaX
  clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => {
    if (wheelAccum > 60) slideNext()
    else if (wheelAccum < -60) slidePrev()
    wheelAccum = 0
  }, 80)
}

let isDragging = false
let dragStartX = 0
let dragMoved = false
const onMouseDown = (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragMoved = false
}
const onMouseMove = (e) => {
  if (!isDragging) return;
  if (Math.abs(e.clientX - dragStartX) > 5) dragMoved = true
}
const onMouseUp = (e) => {
  if (!isDragging) return
  isDragging = false
  if (!dragMoved) return
  const diff = dragStartX - e.clientX
  if (Math.abs(diff) > 60) diff > 0 ? slideNext() : slidePrev()
}

// ── 查看模式品項取得 ──────────────────────────────────────────────
const itemsByTypeForDate = (date, type) => {
  const items = (weekItemsMap.value[date] || [])
    .filter(i => i.type === type && ((i.name && i.name.trim() !== '') || (i.images && i.images.length > 0)))
  const slotMap = {}
  for (const item of items) {
    const slot = item.slot || 1
    if (!slotMap[slot]) slotMap[slot] = []
    slotMap[slot].push(item)
  }
  const result = []
  for (const slot of Object.keys(slotMap).map(Number).sort()) {
    slotMap[slot].sort((a, b) => a.id.localeCompare(b.id))
      .forEach((item, idx) => result.push({...item, isFirst: idx === 0}))
  }
  return result
}

// ── 編輯模式輔助 ───────────────────────────────────────────────────
const slotsByType = (type) => {
  const slots = [...new Set(menuItems.value.filter(i => i.type === type).map(i => i.slot || 1))]
  return slots.sort((a, b) => a - b)
}
const itemsByTypeAndSlot = (type, slot) =>
  menuItems.value.filter(i => i.type === type && (i.slot || 1) === slot)
    .sort((a, b) => a.id.localeCompare(b.id))

// ── 日曆（編輯模式）─────────────────────────────────────────────
const calLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)
const calDays = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({label: '', date: null})
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0'), dd = String(d).padStart(2, '0')
    days.push({label: d, date: `${calYear.value}-${mm}-${dd}`})
  }
  return days
})
const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-orange-700 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-semibold hover:bg-orange-200'
  if (dateStatus.value[day.date] === 'complete') return 'text-green-600 dark:text-green-400 font-semibold hover-surface2'
  if (dateStatus.value[day.date] === 'partial') return 'text-amber-500 dark:text-amber-400 font-semibold hover-surface2'
  return 'text-base-c hover-surface2'
}
const yearMonth = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`)

const prevMonth = () => {
  if (calMonth.value === 1) {
    calYear.value--;
    calMonth.value = 12
  } else calMonth.value--
  fetchMarkedDates()
}
const nextMonth = () => {
  if (calMonth.value === 12) {
    calYear.value++;
    calMonth.value = 1
  } else calMonth.value++
  fetchMarkedDates()
}

const selectDate = async (date) => {
  selectedDate.value = date
  weekItemsMap.value = {}
  await fetchWithTimeout(`${BASE}/init/${date}`, {method: 'POST'}).catch(() => {
  })
  await fetchMenuItems()
  await fetchMarkedDates()
}

// ── 食材 ──────────────────────────────────────────────────────────
const addIngredientToItem = (item) => {
  const val = (ingredientDraft[item.id] || '').trim()
  if (val && !item.ingredients.includes(val)) {
    item.ingredients.push(val);
    autoSave(item)
  }
  ingredientDraft[item.id] = ''
}

// ── 圖片：單張上傳（編輯卡片小圖）────────────────────────────────
const openSingleImageUpload = (item) => {
  const input = document.createElement('input')
  input.type = 'file';
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return
    try {
      // 壓縮後上傳
      const compressed = await compressImage(file)
      if (item.images && item.images.length > 0) {
        const oldFile = item.images[0].split('/').pop()
        await fetchWithTimeout(`${BASE}/image/remove/${item.date}/${item.id}?fileName=${oldFile}`, {method: 'DELETE'}).catch(() => {
        })
      }
      const formData = new FormData()
      formData.append('files', compressed)
      const res = await fetchWithTimeout(`${BASE}/image/upload/${item.date}/${item.id}`, {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error(`上傳失敗（${res.status}）`)
      item.images = (await res.json()).slice(0, 1)
      showToast('圖片已更新')
    } catch (e) {
      showToast(e.message || '上傳失敗')
    }
  }
  input.click()
}

const deleteItemImage = async (item) => {
  if (!item.images || item.images.length === 0) return
  const fileName = item.images[0].split('/').pop()
  try {
    await fetchWithTimeout(`${BASE}/image/remove/${item.date}/${item.id}?fileName=${fileName}`, {method: 'DELETE'})
    item.images = [];
    showToast('圖片已刪除')
  } catch (e) {
    console.error(e)
  }
}

const imageModal = reactive({show: false, item: null, images: []})
const openImageUpload = (item) => {
  imageModal.item = item;
  imageModal.images = [...(item.images || [])];
  imageModal.show = true
}
const handleFileSelect = (e) => uploadImages(Array.from(e.target.files))
const handleDrop = (e) => {
  dragOver.value = false;
  uploadImages(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')))
}

// ── 圖片：批次上傳（Modal）──────────────────────────────────────
const uploadImages = async (files) => {
  if (!imageModal.item || files.length === 0) return
  uploading.value = true
  uploadProgress.value = ''
  let successCount = 0
  const errors = []
  try {
    for (let i = 0; i < files.length; i++) {
      uploadProgress.value = `（${i + 1} / ${files.length}）`
      try {
        // 先壓縮
        const compressed = await compressImage(files[i])
        const formData = new FormData()
        formData.append('files', compressed)
        const res = await fetchWithTimeout(`${BASE}/image/upload/${imageModal.item.date}/${imageModal.item.id}`, {
          method: 'POST',
          body: formData
        })
        if (!res.ok) throw new Error(`${files[i].name}：${res.status}`)
        const newPaths = await res.json()
        imageModal.images.push(...newPaths)
        const found = menuItems.value.find(i => i.id === imageModal.item.id)
        if (found) found.images = [...imageModal.images]
        successCount++
      } catch (err) {
        errors.push(err.message || files[i].name)
      }
    }
    if (errors.length === 0) {
      showToast(`成功上傳 ${successCount} 張圖片`)
    } else if (successCount > 0) {
      showToast(`上傳 ${successCount} 張成功，${errors.length} 張失敗`)
      console.error('上傳失敗：', errors)
    } else {
      showToast(`上傳失敗：${errors[0]}`)
      console.error('上傳失敗：', errors)
    }
  } finally {
    uploading.value = false
    uploadProgress.value = ''
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const deleteMenuImage = async (idx) => {
  if (!confirm('確定刪除？')) return
  const fileName = imageModal.images[idx].split('/').pop()
  try {
    await fetchWithTimeout(`${BASE}/image/remove/${imageModal.item.date}/${imageModal.item.id}?fileName=${fileName}`, {method: 'DELETE'})
    imageModal.images.splice(idx, 1)
    const found = menuItems.value.find(i => i.id === imageModal.item.id)
    if (found) found.images = [...imageModal.images]
    showToast('圖片已刪除')
  } catch (e) {
    console.error(e)
  }
}

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({show: false, message: ''})
const showToast = (msg) => {
  toast.message = msg;
  toast.show = true;
  setTimeout(() => toast.show = false, 2500)
}

// ── 隨機建議 ──────────────────────────────────────────────────────
const openSuggest = async () => {
  suggesting.value = true
  suggestModal.show = true
  try {
    const res = await fetchWithTimeout(`${BASE}/suggest`)
    suggestModal.data = await res.json()
  } catch (e) {
    showToast('取得建議失敗，請稍後再試')
    suggestModal.show = false
  } finally {
    suggesting.value = false
  }
}

// ── API ───────────────────────────────────────────────────────────
const fetchMarkedDates = async () => {
  try {
    dateStatus.value = await (await fetchWithTimeout(`${BASE}/dates/${yearMonth.value}`)).json()
    apiOnline.value = true
  } catch {
    apiOnline.value = false
  }
}

const fetchMenuItems = async () => {
  if (!selectedDate.value) return
  try {
    menuItems.value = await (await fetchWithTimeout(`${BASE}/get/${selectedDate.value}`)).json()
    menuItems.value.forEach(i => {
      if (!ingredientDraft[i.id]) ingredientDraft[i.id] = ''
    })
    apiOnline.value = true
    await ensureDefaultSlots()
  } catch (e) {
    apiOnline.value = false
    console.error(e)
  }
}

const ensureDefaultSlots = async () => {
  for (const section of sections) {
    const existingInSlot1 = itemsByTypeAndSlot(section.type, 1)
    const need = section.defaultSlots - existingInSlot1.length
    for (let i = 0; i < need; i++) {
      await addItemToSlot(section.type, 1)
    }
  }
}

const autoSave = async (item) => {
  if (!item.id) return
  try {
    await fetchWithTimeout(`${BASE}/update`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(item)
    })
    await fetchMarkedDates()
  } catch (e) {
    console.error(e)
  }
}

const addItemToSlot = async (type, slot) => {
  try {
    const existing = itemsByTypeAndSlot(type, slot)
    const dietType = existing.length > 0 ? (existing[0].dietType || '') : ''
    const res = await fetchWithTimeout(`${BASE}/save`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        date: selectedDate.value,
        type,
        slot,
        name: '',
        dietType,
        ingredients: [],
        images: [],
        note: ''
      })
    })
    const saved = await res.json();
    menuItems.value.push(saved);
    ingredientDraft[saved.id] = ''
  } catch (e) {
    console.error(e)
  }
}

const confirmDeleteDay = async () => {
  if (!confirm(`確定刪除 ${selectedDate.value} 的所有菜色？此操作無法復原。`)) return
  try {
    await fetchWithTimeout(`${BASE}/remove/${selectedDate.value}`, {method: 'DELETE'})
    menuItems.value = [];
    delete dateStatus.value[selectedDate.value];
    delete weekItemsMap.value[selectedDate.value]
    showToast(`${selectedDate.value} 菜色已刪除`)
  } catch (e) {
    console.error(e)
  }
}

const confirmDelete = async (item) => {
  if (!confirm(`確定刪除${item.name ? `「${item.name}」` : '這個項目'}？`)) return
  try {
    await fetchWithTimeout(`${BASE}/remove/${item.date}/${item.id}`, {method: 'DELETE'})
    menuItems.value = menuItems.value.filter(i => i.id !== item.id);
    showToast('已刪除')
  } catch (e) {
    console.error(e)
  }
}

// ── ResizeObserver ────────────────────────────────────────────────
let resizeObserver = null
const initResizeObserver = () => {
  if (!mainCol.value) return
  containerWidth.value = mainCol.value.offsetWidth
  resizeObserver = new ResizeObserver(entries => {
    containerWidth.value = entries[0].contentRect.width
  })
  resizeObserver.observe(mainCol.value)
}

watch(isEditMode, async (editing) => {
  if (!editing) {
    await nextTick()
    initResizeObserver()
    await refresh()
  }
})

const onKeyDown = (e) => {
  if (e.key === 'ArrowLeft') slidePrev()
  if (e.key === 'ArrowRight') slideNext()
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  await fetchMarkedDates()
  selectedDate.value = todayStr
  fetchWithTimeout(`${BASE}/init/${todayStr}`, {method: 'POST'}).catch(() => {
  })
  await fetchMenuItems()
  await fetchMarkedDates()
  await nextTick()
  isClient.value = true
  initResizeObserver()
  await refresh()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (resizeObserver) resizeObserver.disconnect()
})
</script>

<style scoped>
@use '~/assets/scs/main' as *;
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
