<template>
  <ClientOnly>
    <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

      <!-- ── 頂部導覽 ── -->
      <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-orange-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">菜</div>
            <div>
              <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">田園餐廳 · 每日菜色</h1>
              <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Holy Mother Farm</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
          <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
            <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
            <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
          </span>
            <div class="flex items-center gap-1">
              <button @click="isEditMode = false"
                      :class="!isEditMode ? 'bg-orange-700 text-white' : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">查看</button>
              <button @click="isEditMode = true"
                      :class="isEditMode ? 'bg-orange-700 text-white' : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700'"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">編輯</button>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div :class="isEditMode ? 'flex flex-col lg:flex-row' : 'flex flex-col'" class="gap-4 items-start">

          <!-- ── 左欄：日曆（僅編輯模式）── -->
          <div v-if="isEditMode" class="w-full lg:w-72 xl:w-80 flex-shrink-0">
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
          <div class="w-full min-w-0">

            <!-- ══ 查看模式：多日滑動視圖 ══ -->
            <div v-if="!isEditMode">

              <!-- 導覽列 -->
              <div class="flex items-center justify-between mb-3">
                <button v-if="hasPrev" @click="slidePrev"
                        class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors shadow-sm text-sm font-medium select-none">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                  <span class="hidden sm:inline">前</span>
                </button>
                <div v-else class="w-16"></div>

                <div class="flex items-center gap-2">
                <span class="text-sm text-stone-500 dark:text-stone-400">
                  {{ slideDates[0]?.date.slice(5).replace('-', '/') }}
                  <span v-if="slideDates.length > 1"> — {{ slideDates[slideDates.length-1]?.date.slice(5).replace('-', '/') }}</span>
                </span>
                  <button @click="jumpToToday"
                          class="text-xs px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 transition-colors font-medium">
                    今天
                  </button>
                </div>

                <button v-if="hasNext" @click="slideNext"
                        class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors shadow-sm text-sm font-medium select-none">
                  <span class="hidden sm:inline">後</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
                <div v-else class="w-16"></div>
              </div>

              <!-- 卡片列 -->
              <div ref="slideContainer"
                   class="flex gap-3 overflow-hidden"
                   @touchstart="onTouchStart"
                   @touchend="onTouchEnd">
                <div v-for="day in slideDates" :key="day.date"
                     class="flex-shrink-0"
                     :style="{ width: cardWidth + 'px' }">

                  <!-- 卡片頭 -->
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
                    <div v-if="!dateStatus[day.date]"
                         class="flex items-center justify-center h-20 text-stone-300 dark:text-stone-600 text-xs">
                      無紀錄
                    </div>
                    <div v-else class="p-2 space-y-2">
                      <div v-for="section in sections" :key="section.type">
                        <div v-if="weekItemsByType(day.date, section.type).length > 0">
                          <span :class="section.badge" class="text-xs mb-1 inline-block">{{ section.label }}</span>
                          <div class="space-y-1.5">
                            <div v-for="item in weekItemsByType(day.date, section.type)" :key="item.id"
                                 class="rounded-xl overflow-hidden border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800">
                              <img v-if="item.images && item.images.length > 0"
                                   :src="thumbUrl(item.images[0])" :alt="item.name"
                                   class="w-full h-24 object-cover cursor-pointer"
                                   loading="lazy"
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

            </div>

            <!-- ══ 編輯模式：單天 ══ -->
            <div v-if="isEditMode && selectedDate">
              <div class="space-y-5">
                <div v-for="section in sections" :key="section.type">
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-stone-700 dark:text-stone-100 flex items-center gap-2">
                      <span :class="section.badge">{{ section.label }}</span>
                      <span class="text-sm font-normal text-stone-400">{{ slotsByType(section.type).length }} 槽</span>
                    </h3>
                  </div>
                  <div class="space-y-3">
                    <div v-for="slot in slotsByType(section.type)" :key="`${section.type}-${slot}`"
                         class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
                      <div v-for="(item, itemIdx) in itemsByTypeAndSlot(section.type, slot)" :key="item.id">
                        <div v-if="itemIdx > 0" class="mx-3 border-t border-dashed border-stone-200 dark:border-stone-700"></div>
                        <div class="flex gap-3 p-3">
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
                                    class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-stone-300 dark:text-stone-600 hover:text-orange-500 transition-colors">
                              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
                              <span class="text-xs">加圖</span>
                            </button>
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="flex items-start gap-2 mb-1">
                              <select v-if="section.hasDiet" v-model="item.dietType" @change="autoSave(item)"
                                      class="text-xs border border-stone-200 dark:border-stone-600 rounded-lg px-1.5 py-0.5 bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 flex-shrink-0">
                                <option value="">飲食</option>
                                <option v-for="dt in DIET_TYPES" :key="dt" :value="dt">{{ dt }}</option>
                              </select>
                              <input v-model="item.name" :placeholder="section.placeholder"
                                     @blur="autoSave(item)"
                                     class="flex-1 min-w-0 text-sm font-semibold bg-transparent border-none focus:outline-none text-stone-800 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-600" />
                              <div class="flex items-center gap-1 flex-shrink-0">
                                <button @click="showNote[item.id] = !showNote[item.id]"
                                        class="p-1 text-stone-300 dark:text-stone-600 hover:text-stone-500 transition-colors" title="備註">
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                                </button>
                                <button @click="confirmDelete(item)"
                                        class="p-1 text-stone-200 hover:text-red-400 transition-colors" title="刪除">
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
                                     class="px-2 py-0.5 text-xs bg-stone-50 dark:bg-zinc-800 border border-dashed border-stone-300 dark:border-stone-600 rounded-full text-stone-400 focus:outline-none focus:border-orange-400 w-14 focus:w-24 transition-all" />
                            </div>
                            <input v-if="item.note || showNote[item.id]"
                                   v-model="item.note" placeholder="備註…"
                                   @blur="autoSave(item)"
                                   class="w-full text-xs text-stone-400 dark:text-stone-500 bg-transparent border-none focus:outline-none mt-1 italic" />
                          </div>
                        </div>
                      </div>
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

      <!-- 圖片上傳 Modal -->
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
  </ClientOnly>
</template>

<script setup>
import {ref, computed, reactive, onMounted, onUnmounted, watch, nextTick} from 'vue'
import {useCommonStore} from '~/stores/common.js'

const commonStore = useCommonStore()
const BASE = commonStore.data.main_url + '/holy/menu'
const API_ORIGIN = commonStore.data.main_url

const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_ORIGIN + path
}

// 縮圖 URL：把 /image/ 換成 /image/thumb/
const thumbUrl = (path) => {
  if (!path) return ''
  const full = path.startsWith('http') ? path : API_ORIGIN + path
  return full.replace('/holy/menu/image/', '/holy/menu/image/thumb/')
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
    hasDiet: true
  },
  {
    type: 'soup',
    label: '湯',
    badge: 'px-2 py-0.5 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold',
    placeholder: '湯名…',
    hasDiet: true
  },
  {
    type: 'tea',
    label: '茶',
    badge: 'px-2 py-0.5 rounded-full text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold',
    placeholder: '茶名…',
    hasDiet: false
  },
  {
    type: 'salad_bar',
    label: '沙拉霸',
    badge: 'px-2 py-0.5 rounded-full text-sm bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400 font-semibold',
    placeholder: '沙拉霸名稱…',
    hasDiet: false
  },
]

// ── 狀態 ──────────────────────────────────────────────────────────
const apiOnline = ref(false)
const menuItems = ref([])
const dateStatus = ref({})
const selectedDate = ref('')
const previewUrl = ref('')
const fileInputRef = ref(null)
const dragOver = ref(false)
const uploading = ref(false)
const isEditMode = ref(false)
const ingredientDraft = reactive({})
const showNote = reactive({})

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)

// ── 多日滑動視圖 ─────────────────────────────────────────────────
const slideContainer = ref(null)
const containerWidth = ref(800)
const isClient = ref(false)
const CARD_MIN_WIDTH = 160  // px
const CARD_GAP = 12   // gap-3

// 由容器寬度算出能顯示幾張卡片
const visibleCount = computed(() => {
  if (containerWidth.value <= 0) return 1
  const n = Math.floor((containerWidth.value + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP))
  return Math.max(1, n)
})

// 每張卡片均分容器寬度
const cardWidth = computed(() => {
  if (containerWidth.value <= 0) return CARD_MIN_WIDTH
  return Math.floor((containerWidth.value - (visibleCount.value - 1) * CARD_GAP) / visibleCount.value)
})

// anchorDate：目前顯示的第一個有資料日期
const anchorDate = ref(todayStr)

// 取得某方向起始的有資料日期列表（最多找 180 天）
const findDatesWithData = async (startDate, direction, count) => {
  const result = []
  const d = new Date(startDate)
  const loadedMonths = new Set()

  for (let i = 0; i < 180 && result.length < count; i++) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const date = `${yyyy}-${mm}-${dd}`
    const ym = `${yyyy}-${mm}`

    // 尚未載入這個月的 dateStatus，先拉
    if (!loadedMonths.has(ym)) {
      loadedMonths.add(ym)
      try {
        const status = await (await fetch(`${BASE}/dates/${ym}`)).json()
        dateStatus.value = {...dateStatus.value, ...status}
        apiOnline.value = true
      } catch {
        apiOnline.value = false
      }
    }

    if (dateStatus.value[date]) result.push(date)
    d.setDate(d.getDate() + direction)
  }
  return result
}

// 目前顯示的有資料日期
const visibleDates = ref([])
const hasPrev = ref(false)
const hasNext = ref(false)

const refreshVisibleDates = async () => {
  // 從 anchorDate 往後找 visibleCount 筆
  let dates = await findDatesWithData(anchorDate.value, 1, visibleCount.value)

  // 找不到任何資料：往前找最近有資料的天重設 anchor
  if (dates.length === 0) {
    const prevDates = await findDatesWithData(anchorDate.value, -1, visibleCount.value)
    if (prevDates.length > 0) {
      anchorDate.value = prevDates[prevDates.length - 1]
      dates = await findDatesWithData(anchorDate.value, 1, visibleCount.value)
    }
  }

  // 筆數不足 visibleCount：往前補齊（例如最後幾天不夠一頁）
  if (dates.length > 0 && dates.length < visibleCount.value) {
    const need = visibleCount.value - dates.length
    const firstD = new Date(dates[0])
    firstD.setDate(firstD.getDate() - 1)
    const fillStart = `${firstD.getFullYear()}-${String(firstD.getMonth() + 1).padStart(2, '0')}-${String(firstD.getDate()).padStart(2, '0')}`
    const fillDates = await findDatesWithData(fillStart, -1, need)
    dates = [...fillDates.reverse(), ...dates]
    if (dates.length > 0) anchorDate.value = dates[0]
  }

  visibleDates.value = dates

  // 判斷是否有前/後資料
  if (dates.length > 0) {
    const firstD = new Date(dates[0])
    firstD.setDate(firstD.getDate() - 1)
    const firstPrev = `${firstD.getFullYear()}-${String(firstD.getMonth() + 1).padStart(2, '0')}-${String(firstD.getDate()).padStart(2, '0')}`
    const prevCheck = await findDatesWithData(firstPrev, -1, 1)
    hasPrev.value = prevCheck.length > 0

    const lastD = new Date(dates[dates.length - 1])
    lastD.setDate(lastD.getDate() + 1)
    const lastNext = `${lastD.getFullYear()}-${String(lastD.getMonth() + 1).padStart(2, '0')}-${String(lastD.getDate()).padStart(2, '0')}`
    const nextCheck = await findDatesWithData(lastNext, 1, 1)
    hasNext.value = nextCheck.length > 0
  } else {
    hasPrev.value = false
    hasNext.value = false
  }

  // 拉品項資料
  await Promise.all(dates.map(async (date) => {
    if (weekItemsMap.value[date] && weekItemsMap.value[date].length > 0) return
    try {
      const items = await (await fetch(`${BASE}/get/${date}`)).json()
      weekItemsMap.value[date] = items.filter(i =>
        (i.name && i.name.trim() !== '') || (i.images && i.images.length > 0))
    } catch {
      weekItemsMap.value[date] = []
    }
  }))
}

// slideDates 供 template 使用（轉換格式）
const slideDates = computed(() => {
  return visibleDates.value.map(date => ({
    date,
    weekLabel: WEEK_LABELS[new Date(date).getDay()]
  }))
})

const slidePrev = async () => {
  // 從目前第一筆往前找 visibleCount 筆有資料的日期（方向 -1）
  const first = visibleDates.value[0]
  if (!first) return
  const prevStart = new Date(first)
  prevStart.setDate(prevStart.getDate() - 1)
  const yyyy = prevStart.getFullYear()
  const mm = String(prevStart.getMonth() + 1).padStart(2, '0')
  const dd = String(prevStart.getDate()).padStart(2, '0')
  const prevStartStr = `${yyyy}-${mm}-${dd}`
  // 往前找，再倒轉排列
  const dates = await findDatesWithData(prevStartStr, -1, visibleCount.value)
  if (dates.length === 0) return
  anchorDate.value = dates[dates.length - 1]  // 最遠的那天作為新 anchor
  await refreshVisibleDates()
}

const slideNext = async () => {
  const last = visibleDates.value[visibleDates.value.length - 1]
  if (!last) return
  const nextStart = new Date(last)
  nextStart.setDate(nextStart.getDate() + 1)
  const yyyy = nextStart.getFullYear()
  const mm = String(nextStart.getMonth() + 1).padStart(2, '0')
  const dd = String(nextStart.getDate()).padStart(2, '0')
  anchorDate.value = `${yyyy}-${mm}-${dd}`
  await refreshVisibleDates()
}

const jumpToToday = async () => {
  // 從今天開始，先往前找最近有資料的那天作為 anchor
  const recent = await findDatesWithData(todayStr, -1, 1)
  anchorDate.value = recent.length > 0 ? recent[0] : todayStr
  await refreshVisibleDates()
}

// fetchSlideItems 改為呼叫 refreshVisibleDates
const fetchSlideItems = () => refreshVisibleDates()

// visibleCount 變化時重拉
watch(visibleCount, () => {
  refreshVisibleDates()
})

// 觸控滑動
let touchStartX = 0
const onTouchStart = (e) => {
  touchStartX = e.touches[0].clientX
}
const onTouchEnd = (e) => {
  const diff = touchStartX - e.changedTouches[0].clientX
  if (Math.abs(diff) > 50) diff > 0 ? slideNext() : slidePrev()
}

// ResizeObserver
let resizeObserver = null
const initResizeObserver = () => {
  if (!slideContainer.value) return
  containerWidth.value = slideContainer.value.offsetWidth
  resizeObserver = new ResizeObserver(entries => {
    containerWidth.value = entries[0].contentRect.width
  })
  resizeObserver.observe(slideContainer.value)
}

// ── 品項快取 & 顯示 ───────────────────────────────────────────────
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const weekItemsMap = ref({})

const weekItemsByType = (date, type) => {
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
    const slotItems = slotMap[slot].sort((a, b) => a.id.localeCompare(b.id))
    slotItems.forEach((item, idx) => result.push({...item, isFirst: idx === 0}))
  }
  return result
}

// ── 編輯模式輔助 ───────────────────────────────────────────────────
const itemsByType = (type) => menuItems.value.filter(i => i.type === type)

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
  if (dateStatus.value[day.date] === 'complete') return 'text-green-600 dark:text-green-400 font-semibold hover:bg-stone-100 dark:hover:bg-zinc-700'
  if (dateStatus.value[day.date] === 'partial') return 'text-amber-500 dark:text-amber-400 font-semibold hover:bg-stone-100 dark:hover:bg-zinc-700'
  return 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
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
  await fetch(`${BASE}/init/${date}`, {method: 'POST'})
  await fetchMenuItems()
  await fetchMarkedDates()
}

watch(isEditMode, async (editing) => {
  if (!editing) {
    weekItemsMap.value = {}
    await nextTick()
    initResizeObserver()
    await fetchSlideItems()
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

// ── 圖片 ──────────────────────────────────────────────────────────
const openSingleImageUpload = (item) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('files', file)
    try {
      if (item.images && item.images.length > 0) {
        const oldFile = item.images[0].split('/').pop()
        await fetch(`${BASE}/image/remove/${item.date}/${item.id}?fileName=${oldFile}`, {method: 'DELETE'})
      }
      const res = await fetch(`${BASE}/image/upload/${item.date}/${item.id}`, {method: 'POST', body: formData})
      const newPaths = await res.json()
      item.images = newPaths.slice(0, 1)
      showToast('圖片已更新')
    } catch {
      showToast('上傳失敗')
    }
  }
  input.click()
}

const deleteItemImage = async (item) => {
  if (!item.images || item.images.length === 0) return
  const fileName = item.images[0].split('/').pop()
  try {
    await fetch(`${BASE}/image/remove/${item.date}/${item.id}?fileName=${fileName}`, {method: 'DELETE'})
    item.images = []
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

const uploadImages = async (files) => {
  if (!imageModal.item || files.length === 0) return
  uploading.value = true
  try {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    const res = await fetch(`${BASE}/image/upload/${imageModal.item.date}/${imageModal.item.id}`, {
      method: 'POST',
      body: formData
    })
    const newPaths = await res.json()
    imageModal.images.push(...newPaths)
    const found = menuItems.value.find(i => i.id === imageModal.item.id)
    if (found) found.images = [...imageModal.images]
    showToast(`成功上傳 ${newPaths.length} 張圖片`)
  } catch {
    showToast('上傳失敗')
  } finally {
    uploading.value = false;
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const deleteMenuImage = async (idx) => {
  if (!confirm('確定刪除？')) return
  const url = imageModal.images[idx]
  const fileName = url.split('/').pop()
  try {
    await fetch(`${BASE}/image/remove/${imageModal.item.date}/${imageModal.item.id}?fileName=${fileName}`, {method: 'DELETE'})
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

// ── API ───────────────────────────────────────────────────────────
const fetchMarkedDates = async () => {
  try {
    dateStatus.value = await (await fetch(`${BASE}/dates/${yearMonth.value}`)).json()
    apiOnline.value = true
  } catch {
    apiOnline.value = false
  }
}

const fetchMenuItems = async () => {
  if (!selectedDate.value) return
  try {
    menuItems.value = await (await fetch(`${BASE}/get/${selectedDate.value}`)).json()
    menuItems.value.forEach(i => {
      if (!ingredientDraft[i.id]) ingredientDraft[i.id] = ''
    })
  } catch (e) {
    console.error(e)
  }
}

const autoSave = async (item) => {
  if (!item.id) return
  try {
    await fetch(`${BASE}/update`, {
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
    const res = await fetch(`${BASE}/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({date: selectedDate.value, type, slot, name: '', ingredients: [], images: [], note: ''})
    })
    const saved = await res.json()
    menuItems.value.push(saved)
    ingredientDraft[saved.id] = ''
  } catch (e) {
    console.error(e)
  }
}

const confirmDeleteDay = async () => {
  if (!confirm(`確定刪除 ${selectedDate.value} 的所有菜色？此操作無法復原。`)) return
  try {
    await fetch(`${BASE}/remove/${selectedDate.value}`, {method: 'DELETE'})
    menuItems.value = []
    delete dateStatus.value[selectedDate.value]
    delete weekItemsMap.value[selectedDate.value]
    showToast(`${selectedDate.value} 菜色已刪除`)
  } catch (e) {
    console.error(e)
  }
}

const confirmDelete = async (item) => {
  if (!confirm(`確定刪除${item.name ? `「${item.name}」` : '這個項目'}？`)) return
  try {
    await fetch(`${BASE}/remove/${item.date}/${item.id}`, {method: 'DELETE'})
    menuItems.value = menuItems.value.filter(i => i.id !== item.id)
    showToast('已刪除')
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  await fetchMarkedDates()
  selectedDate.value = todayStr
  await fetch(`${BASE}/init/${todayStr}`, {method: 'POST'})
  await fetchMenuItems()
  await fetchMarkedDates()
  await nextTick()
  initResizeObserver()
  await nextTick()
  isClient.value = true
  // 從今天往前找最近有資料的一天作為起始 anchor
  const recent = await findDatesWithData(todayStr, -1, 1)
  if (recent.length > 0) anchorDate.value = recent[0]
  await fetchSlideItems()
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
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
