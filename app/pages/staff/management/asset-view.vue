<template>
  <div class="min-h-full bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── Header ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">財</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">財產登記系統</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Asset Registry</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- 黑暗模式切換 -->
          <button :title="darkStore.data.display_name"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
                  @click="toggleDark">
            <svg v-if="!isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
            </svg>
          </button>
          <!-- 桌機顯示方式切換 -->
          <div class="hidden md:flex bg-stone-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
            <button :title="'表格'"
                    :class="desktopView === 'table' ? 'bg-white dark:bg-zinc-700 text-stone-700 dark:text-stone-100 shadow-sm' : 'text-stone-400 dark:text-stone-500'"
                    class="w-7 h-7 flex items-center justify-center rounded-md transition-all"
                    @click="desktopView = 'table'">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z"/>
              </svg>
            </button>
            <button :title="'卡片'"
                    :class="desktopView === 'card' ? 'bg-white dark:bg-zinc-700 text-stone-700 dark:text-stone-100 shadow-sm' : 'text-stone-400 dark:text-stone-500'"
                    class="w-7 h-7 flex items-center justify-center rounded-md transition-all"
                    @click="desktopView = 'card'">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
          </div>
          <!-- 欄位顯示設定 -->
          <div ref="colSettingsRef" class="relative">
            <button :class="showColSettings ? 'bg-stone-100 dark:bg-zinc-800' : ''"
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
                    title="欄位設定"
                    @click="showColSettings = !showColSettings">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <div v-if="showColSettings"
                 class="fixed right-4 top-14 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl z-40 w-56 p-3">
              <p class="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2 px-1">顯示欄位</p>
              <div class="space-y-0.5 max-h-72 overflow-y-auto">
                <label v-for="col in COL_DEFS" :key="col.key"
                       class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer">
                  <input type="checkbox" :checked="visibleCols[col.key]"
                         class="w-3.5 h-3.5 accent-teal-600 cursor-pointer"
                         @change="toggleCol(col.key)">
                  <span class="text-sm text-stone-700 dark:text-stone-200">{{ col.label }}</span>
                </label>
              </div>
              <div class="mt-2 pt-2 border-t border-stone-100 dark:border-stone-700 flex gap-1.5">
                <button class="flex-1 py-1 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 transition-colors" @click="resetCols">重設</button>
                <button class="flex-1 py-1 text-xs bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors" @click="showColSettings = false">完成</button>
              </div>
            </div>
          </div>
          <!-- 匯出 Excel -->
          <button title="匯出 Excel"
                  class="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:gap-1.5 sm:px-3 sm:py-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                  @click="exportExcel">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span class="hidden sm:inline">匯出 Excel</span>
          </button>
          <!-- 匯入 Excel -->
          <button v-if="perm.can('staff.inventory.edit')"
                  title="匯入 Excel"
                  class="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:gap-1.5 sm:px-3 sm:py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-600 rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
                  @click="triggerImport">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4 4l4-4m0 0l4 4m-4-4V4"/>
            </svg>
            <span class="hidden sm:inline">匯入 Excel</span>
          </button>
          <input ref="importInputRef" type="file" accept=".xlsx,.xls" class="hidden" @change="handleImport">
          <!-- 新增財產 -->
          <button v-if="perm.can('staff.inventory.edit')"
                  title="新增財產"
                  class="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:gap-1.5 sm:px-3 sm:py-1.5 text-xs font-medium bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors"
                  @click="openModal(null)">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span class="hidden sm:inline">新增財產</span>
          </button>
        </div>
      </div>

      <!-- 搜尋 + 篩選 -->
      <div class="flex flex-wrap gap-2">
        <input v-model="searchText" placeholder="搜尋財產名稱、型號…"
               class="flex-1 min-w-40 px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
        <select v-model="filterOrg"
                class="px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">全部機構</option>
          <option v-for="o in orgOptions" :key="o" :value="o">{{ o }}</option>
        </select>
        <select v-model="filterUnit"
                class="px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">全部單位</option>
          <option v-for="u in managedUnitOptions" :key="u" :value="u">{{ u }}</option>
        </select>
        <select v-model="filterLocation"
                class="px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">全部位置</option>
          <option v-for="l in managedLocationOptions" :key="l" :value="l">{{ l }}</option>
        </select>
        <select v-model="filterListed"
                class="px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">全部財產</option>
          <option value="true">列入財產</option>
          <option value="false">不列入財產</option>
        </select>
        <span class="text-xs text-stone-400 self-center">共 {{ filtered.length }} 筆</span>
      </div>
    </header>

    <div class="max-w-full px-3 sm:px-4 py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="flex items-center justify-center py-16 text-stone-400 gap-2">
        <div class="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/>
        載入中…
      </div>

      <!-- 無資料 -->
      <div v-else-if="filtered.length === 0" class="text-center py-16 text-stone-400 text-sm">
        {{ assets.length === 0 ? '尚無財產資料，點擊「新增財產」開始登記' : '找不到符合條件的財產' }}
      </div>

      <!-- ── 桌機表格（含拖曳排序）── -->
      <div v-else-if="desktopView === 'table'"
           class="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
        <div class="px-4 py-2 border-b border-stone-100 dark:border-stone-800 flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 select-none">
          <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
          </svg>
          拖曳列左側圖示可調整順序，放開後自動儲存
          <span v-if="reordering" class="ml-auto flex items-center gap-1 text-teal-600 dark:text-teal-400">
            <span class="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin inline-block"/>儲存中…
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm whitespace-nowrap">
            <thead class="bg-stone-50 dark:bg-zinc-800 text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            <tr>
              <th class="w-8 px-2 py-3"/>
              <th class="px-3 py-3 text-left">圖片</th>
              <th class="px-3 py-3 text-left">財產名稱／型號</th>
              <th v-if="visibleCols.listed" class="px-3 py-3 text-center">列入財產</th>
              <th v-if="visibleCols.spec" class="px-3 py-3 text-left">規格</th>
              <th v-if="visibleCols.brand" class="px-3 py-3 text-left">廠牌</th>
              <th v-if="visibleCols.keeper" class="px-3 py-3 text-left">保管人員</th>
              <th v-if="visibleCols.org" class="px-3 py-3 text-left">機構</th>
              <th v-if="visibleCols.unit" class="px-3 py-3 text-left">保管單位</th>
              <th v-if="visibleCols.location" class="px-3 py-3 text-left">放置位置</th>
              <th v-if="visibleCols.usage" class="px-3 py-3 text-left">用途</th>
              <th v-if="visibleCols.issuer" class="px-3 py-3 text-left">撥發單位</th>
              <th v-if="visibleCols.quantity" class="px-3 py-3 text-center">撥發數量</th>
              <th v-if="visibleCols.note" class="px-3 py-3 text-left">備註</th>
              <th v-if="visibleCols.purchaseDate" class="px-3 py-3 text-left">購置日期</th>
              <th v-if="visibleCols.price" class="px-3 py-3 text-right">單價</th>
              <th v-if="visibleCols.lifespan" class="px-3 py-3 text-center">使用年限</th>
              <th v-if="visibleCols.planName" class="px-3 py-3 text-left">計畫名稱</th>
              <th v-if="visibleCols.plateNo" class="px-3 py-3 text-left">車號</th>
              <th class="px-3 py-3 text-center">操作</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
            <tr v-for="(asset, index) in filtered" :key="asset.id"
                :class="[
                    'hover:bg-stone-50 dark:hover:bg-zinc-700/30 transition-colors',
                    draggingIndex === index ? 'opacity-40' : '',
                    dragOverIndex === index ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                  ]"
                draggable="true"
                @dragstart="onDragStart(index, $event)"
                @dragover.prevent="onDragOver(index)"
                @dragleave="onDragLeave"
                @dragend="onDragEnd"
                @drop.prevent="onDrop(index)">
              <td class="px-2 py-2.5 cursor-grab active:cursor-grabbing text-stone-300 dark:text-stone-600">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                </svg>
              </td>
              <td class="px-3 py-2.5">
                <img v-if="asset.image" :src="imgUrl(asset.thumbUrl) || imgUrl(asset.image)" :alt="asset.name"
                     loading="lazy" class="w-10 h-10 rounded-lg object-cover border border-stone-200 dark:border-stone-700 cursor-pointer"
                     @click="openPreview(asset.image)">
                <div v-else class="w-10 h-10 rounded-lg bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-stone-300">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
              </td>
              <td class="px-3 py-2.5 font-medium text-stone-800 dark:text-stone-100 max-w-40">
                <div class="truncate" :title="asset.name">{{ asset.name }}</div>
              </td>
              <td v-if="visibleCols.listed" class="px-3 py-2.5 text-center">
                  <span :class="asset.listed ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'bg-stone-100 text-stone-400 dark:bg-zinc-800'"
                        class="px-2 py-0.5 rounded-full text-xs">{{ asset.listed ? '✓ 列入' : '不列入' }}</span>
              </td>
              <td v-if="visibleCols.spec" class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.spec }}</td>
              <td v-if="visibleCols.brand" class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.brand }}</td>
              <td v-if="visibleCols.keeper" class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.keeper }}</td>
              <td v-if="visibleCols.org" class="px-3 py-2.5">
                <span class="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">{{ asset.org }}</span>
              </td>
              <td v-if="visibleCols.unit" class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.unit }}</td>
              <td v-if="visibleCols.location" class="px-3 py-2.5 text-stone-600 dark:text-stone-300 max-w-36">
                <div class="truncate" :title="asset.location">{{ asset.location }}</div>
              </td>
              <td v-if="visibleCols.usage" class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.usage }}</td>
              <td v-if="visibleCols.issuer" class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.issuer }}</td>
              <td v-if="visibleCols.quantity" class="px-3 py-2.5 text-center text-stone-700 dark:text-stone-200 font-medium">{{ asset.quantity }}</td>
              <td v-if="visibleCols.note" class="px-3 py-2.5 text-stone-500 dark:text-stone-400 max-w-32">
                <div class="truncate" :title="asset.note">{{ asset.note }}</div>
              </td>
              <td v-if="visibleCols.purchaseDate" class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.purchaseDate }}</td>
              <td v-if="visibleCols.price" class="px-3 py-2.5 text-right text-stone-700 dark:text-stone-200 font-medium">
                {{ asset.price ? asset.price.toLocaleString() : '—' }}
              </td>
              <td v-if="visibleCols.lifespan" class="px-3 py-2.5 text-center text-stone-600 dark:text-stone-300">{{ asset.lifespan }}</td>
              <td v-if="visibleCols.planName" class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.planName }}</td>
              <td v-if="visibleCols.plateNo" class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.plateNo }}</td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1 justify-center">
                  <button v-if="perm.can('staff.inventory.edit')" @click="openModal(asset)"
                          class="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">編輯</button>
                  <button v-if="perm.can('staff.inventory.edit')" @click="confirmDelete(asset)"
                          class="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">刪除</button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── 桌機卡片（圖片用大縮圖 thumbLgUrl）── -->
      <div v-else-if="desktopView === 'card'"
           class="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <div v-for="asset in filtered" :key="asset.id"
             class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
          <div class="relative w-full h-44 bg-stone-100 dark:bg-zinc-800 overflow-hidden">
            <img v-if="asset.image"
                 :src="imgUrl(asset.thumbLgUrl) || imgUrl(asset.image)"
                 :alt="asset.name"
                 loading="lazy"
                 class="w-full h-full object-cover cursor-pointer"
                 @click="openPreview(asset.image)">
            <div v-else class="w-full h-full flex items-center justify-center text-stone-200 dark:text-stone-700">
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <span v-if="visibleCols.listed"
                  :class="asset.listed ? 'bg-teal-600/90 text-white' : 'bg-stone-500/80 text-white'"
                  class="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs">
              {{ asset.listed ? '✓ 列入' : '不列入' }}
            </span>
          </div>
          <div class="p-3">
            <p class="font-semibold text-stone-800 dark:text-stone-100 leading-tight mb-1 truncate" :title="asset.name">{{ asset.name }}</p>
            <div class="flex items-center gap-1.5 mb-2 flex-wrap">
              <span v-if="visibleCols.org && asset.org" class="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">{{ asset.org }}</span>
              <span v-if="visibleCols.brand && asset.brand" class="text-xs text-stone-400">{{ asset.brand }}</span>
            </div>
            <div class="text-xs text-stone-500 dark:text-stone-400 space-y-0.5 mb-3">
              <div v-if="visibleCols.spec && asset.spec" class="truncate"><span class="text-stone-400">規格：</span>{{ asset.spec }}</div>
              <div v-if="visibleCols.keeper && asset.keeper" class="truncate"><span class="text-stone-400">保管人：</span>{{ asset.keeper }}</div>
              <div v-if="visibleCols.unit && asset.unit" class="truncate"><span class="text-stone-400">單位：</span>{{ asset.unit }}</div>
              <div v-if="visibleCols.location && asset.location" class="truncate"><span class="text-stone-400">位置：</span>{{ asset.location }}</div>
              <div v-if="visibleCols.price && asset.price" class="truncate"><span class="text-stone-400">單價：</span>{{ asset.price.toLocaleString() }}</div>
              <div v-if="visibleCols.purchaseDate && asset.purchaseDate" class="truncate"><span class="text-stone-400">購置：</span>{{ asset.purchaseDate }}</div>
              <div v-if="visibleCols.planName && asset.planName" class="truncate"><span class="text-stone-400">計畫：</span>{{ asset.planName }}</div>
              <div v-if="visibleCols.plateNo && asset.plateNo" class="truncate"><span class="text-stone-400">車號：</span>{{ asset.plateNo }}</div>
            </div>
            <p v-if="visibleCols.note && asset.note" class="text-xs text-stone-400 italic mb-3 truncate">{{ asset.note }}</p>
            <div class="flex gap-2">
              <button v-if="perm.can('staff.inventory.edit')" @click="openModal(asset)"
                      class="flex-1 py-1.5 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">編輯</button>
              <button v-if="perm.can('staff.inventory.edit')" @click="confirmDelete(asset)"
                      class="flex-1 py-1.5 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">刪除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 手機卡片 -->
      <div class="md:hidden space-y-3">
        <div v-for="asset in filtered" :key="asset.id"
             class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4">
          <div class="flex items-start gap-3 mb-3">
            <img v-if="asset.image" :src="imgUrl(asset.thumbUrl) || imgUrl(asset.image)" :alt="asset.name"
                 loading="lazy" class="w-16 h-16 rounded-xl object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0 cursor-pointer"
                 @click="openPreview(asset.image)">
            <div class="flex-1 min-w-0 flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-stone-800 dark:text-stone-100 leading-tight">{{ asset.name }}</p>
                <p v-if="visibleCols.spec || visibleCols.brand" class="text-xs text-stone-400 mt-0.5">
                  {{ visibleCols.spec ? asset.spec : '' }}{{ (visibleCols.spec && visibleCols.brand && asset.spec && asset.brand) ? ' · ' : '' }}{{ visibleCols.brand ? asset.brand : '' }}
                </p>
              </div>
              <span v-if="visibleCols.org && asset.org"
                    class="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 flex-shrink-0">{{ asset.org }}</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300 mb-3">
            <div v-if="visibleCols.keeper"><span class="text-stone-400">保管人：</span>{{ asset.keeper || '—' }}</div>
            <div v-if="visibleCols.unit"><span class="text-stone-400">保管單位：</span>{{ asset.unit || '—' }}</div>
            <div v-if="visibleCols.location"><span class="text-stone-400">位置：</span>{{ asset.location || '—' }}</div>
            <div v-if="visibleCols.usage"><span class="text-stone-400">用途：</span>{{ asset.usage || '—' }}</div>
            <div v-if="visibleCols.issuer"><span class="text-stone-400">撥發單位：</span>{{ asset.issuer || '—' }}</div>
            <div v-if="visibleCols.quantity"><span class="text-stone-400">數量：</span>{{ asset.quantity }}</div>
            <div v-if="visibleCols.purchaseDate"><span class="text-stone-400">購置：</span>{{ asset.purchaseDate || '—' }}</div>
            <div v-if="visibleCols.price"><span class="text-stone-400">單價：</span>{{ asset.price ? asset.price.toLocaleString() : '—' }}</div>
            <div v-if="visibleCols.lifespan"><span class="text-stone-400">年限：</span>{{ asset.lifespan ? asset.lifespan + ' 年' : '—' }}</div>
            <div v-if="visibleCols.planName"><span class="text-stone-400">計畫：</span>{{ asset.planName || '—' }}</div>
            <div v-if="visibleCols.plateNo"><span class="text-stone-400">車號：</span>{{ asset.plateNo || '—' }}</div>
          </div>
          <p v-if="visibleCols.note" class="text-xs text-stone-400 italic mb-3">{{ asset.note || '—' }}</p>
          <div class="flex gap-2">
            <button v-if="perm.can('staff.inventory.edit')" @click="openModal(asset)"
                    class="flex-1 py-1.5 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-50 transition-colors">編輯</button>
            <button v-if="perm.can('staff.inventory.edit')" @click="confirmDelete(asset)"
                    class="flex-1 py-1.5 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 transition-colors">刪除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 新增/編輯 Modal ════════ -->
    <div v-if="modal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <div class="px-5 py-4 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div class="flex items-center gap-3">
            <h3 class="font-bold text-stone-800 dark:text-stone-100 text-base">{{ modal.isNew ? '新增財產' : '編輯財產' }}</h3>
            <div class="flex bg-stone-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              <button @click="modal.simple = true"
                      :class="modal.simple ? 'bg-white dark:bg-zinc-700 text-stone-700 dark:text-stone-100 shadow-sm' : 'text-stone-400 dark:text-stone-500'"
                      class="px-3 py-1 rounded-md text-xs font-medium transition-all">簡易</button>
              <button @click="modal.simple = false"
                      :class="!modal.simple ? 'bg-white dark:bg-zinc-700 text-stone-700 dark:text-stone-100 shadow-sm' : 'text-stone-400 dark:text-stone-500'"
                      class="px-3 py-1 rounded-md text-xs font-medium transition-all">完整</button>
            </div>
          </div>
          <button @click="modal.show = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- 圖片上傳 -->
          <div class="sm:col-span-2">
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">圖片</label>
            <div class="flex gap-3 items-start">
              <div class="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-stone-200 dark:border-stone-700 relative bg-stone-50 dark:bg-zinc-800 cursor-pointer"
                   @click="triggerImageUpload">
                <img v-if="modal.data.image" :src="imgUrl(modal.data.image)" class="w-full h-full object-cover">
                <div v-else class="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-1">
                  <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span class="text-xs">點擊上傳</span>
                </div>
                <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="handleImageChange">
              </div>
              <div class="flex-1 space-y-1.5">
                <button v-if="modal.data.image" @click="deleteImage"
                        class="text-xs text-red-400 hover:text-red-500 transition-colors">移除圖片</button>
                <p class="text-xs text-stone-400">點擊左側縮圖上傳圖片</p>
                <p v-if="uploadingImage" class="text-xs text-teal-600 flex items-center gap-1">
                  <span class="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block"/>上傳中…
                </p>
              </div>
            </div>
          </div>

          <!-- 財產名稱/型號 -->
          <div class="sm:col-span-2">
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">財產名稱／型號 <span class="text-red-400">*</span></label>
            <input v-model="modal.data.name" placeholder="例：OA-150木紋辦公桌"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
          </div>
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">規格</label>
            <input v-model="modal.data.spec" placeholder="規格"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
          </div>
          <!-- 保管單位 -->
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 mb-1 flex items-center justify-between">
              保管單位
              <button type="button" @click="showUnitManager = true"
                      class="text-teal-600 dark:text-teal-400 hover:text-teal-700 font-normal text-xs flex items-center gap-0.5">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>管理選項
              </button>
            </label>
            <select v-model="modal.data.unit"
                    class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">— 請選擇 —</option>
              <option v-for="u in managedUnitOptions" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <!-- 放置位置（簡易模式也顯示） -->
          <div class="sm:col-span-2">
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 mb-1 flex items-center justify-between">
              放置位置
              <button type="button" @click="showLocationManager = true"
                      class="text-teal-600 dark:text-teal-400 hover:text-teal-700 font-normal text-xs flex items-center gap-0.5">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>管理選項
              </button>
            </label>
            <select v-model="modal.data.location"
                    class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">— 請選擇 —</option>
              <option v-for="l in managedLocationOptions" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
          <!-- 列入財產 toggle（簡易模式顯示） -->
          <div class="sm:col-span-2">
            <label class="flex items-center gap-3 cursor-pointer select-none">
              <div class="relative">
                <input v-model="modal.data.listed" type="checkbox" class="sr-only">
                <div :class="modal.data.listed ? 'bg-teal-600' : 'bg-stone-200 dark:bg-zinc-700'"
                     class="w-10 h-6 rounded-full transition-colors duration-200"/>
                <div :class="modal.data.listed ? 'translate-x-4' : 'translate-x-0'"
                     class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"/>
              </div>
              <div>
                <p class="text-sm font-medium text-stone-700 dark:text-stone-200">列入財產</p>
                <p class="text-xs text-stone-400">取消勾選表示不列入正式財產清單</p>
              </div>
            </label>
          </div>
          <template v-if="!modal.simple">
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">廠牌</label>
              <input v-model="modal.data.brand" placeholder="廠牌"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">保管人員</label>
              <input v-model="modal.data.keeper" placeholder="輸入姓名"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">機構</label>
              <input v-model="modal.data.org" placeholder="例：法人" list="org-list"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
              <datalist id="org-list">
                <option v-for="o in orgOptions" :key="o" :value="o"/>
              </datalist>
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">用途</label>
              <input v-model="modal.data.usage" placeholder="例：辦公"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">撥發單位</label>
              <input v-model="modal.data.issuer" placeholder="請參閱查詢"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">撥發數量</label>
              <input v-model.number="modal.data.quantity" type="number" min="1" placeholder="1"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">購置日期</label>
              <input v-model="modal.data.purchaseDate" type="date"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">單價（元）</label>
              <input v-model.number="modal.data.price" type="number" min="0" placeholder="0"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">使用年限（年）</label>
              <input v-model.number="modal.data.lifespan" type="number" min="0" placeholder="0"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">計畫名稱（編號）</label>
              <input v-model="modal.data.planName" placeholder="請參閱查詢，填編號"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">車號</label>
              <input v-model="modal.data.plateNo" placeholder="車號"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div class="sm:col-span-2">
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">備註</label>
              <textarea v-model="modal.data.note" rows="2" placeholder="備註"
                        class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400 resize-none"/>
            </div>
          </template>
        </div>

        <div class="px-5 py-4 border-t border-stone-100 dark:border-stone-700 flex gap-2 justify-end">
          <button @click="modal.show = false"
                  class="px-4 py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">取消</button>
          <button @click="saveAsset"
                  class="px-4 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors">
            {{ modal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ 大圖預覽（含 loading spinner）════════ -->
    <div v-if="preview.show"
         class="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] cursor-pointer p-4"
         @click="preview.show = false">
      <transition name="fade">
        <div v-if="preview.loading" class="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div class="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"/>
          <span class="text-white/50 text-sm select-none">載入中…</span>
        </div>
      </transition>
      <img :src="preview.url"
           :class="['max-w-full max-h-full rounded-xl shadow-2xl object-contain transition-opacity duration-300', preview.loading ? 'opacity-0' : 'opacity-100']"
           @load="preview.loading = false"
           @error="preview.loading = false">
    </div>

    <!-- 單位管理 Modal -->
    <div v-if="showUnitManager" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">管理保管單位選項</h3>
          <button @click="showUnitManager = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="flex gap-2 mb-3">
          <input v-model="newUnitInput" placeholder="新增保管單位…"
                 @keydown.enter.prevent="addUnitOption"
                 class="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
          <button @click="addUnitOption" class="px-3 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors">新增</button>
        </div>
        <div class="space-y-1.5 max-h-64 overflow-y-auto">
          <div v-if="managedUnitOptions.length === 0" class="text-center py-6 text-stone-400 text-sm">尚無選項</div>
          <div v-for="(u, idx) in managedUnitOptions" :key="u"
               class="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-zinc-800 rounded-xl">
            <span class="text-sm text-stone-700 dark:text-stone-200">{{ u }}</span>
            <button @click="removeUnitOption(idx)" class="text-stone-300 hover:text-red-400 transition-colors p-0.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <button @click="showUnitManager = false"
                class="mt-4 w-full py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">完成</button>
      </div>
    </div>

    <!-- 放置位置管理 Modal -->
    <div v-if="showLocationManager" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">管理放置位置選項</h3>
          <button @click="showLocationManager = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="flex gap-2 mb-3">
          <input v-model="newLocationInput" placeholder="新增放置位置…"
                 @keydown.enter.prevent="addLocationOption"
                 class="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
          <button @click="addLocationOption" class="px-3 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors">新增</button>
        </div>
        <div class="space-y-1.5 max-h-64 overflow-y-auto">
          <div v-if="managedLocationOptions.length === 0" class="text-center py-6 text-stone-400 text-sm">尚無選項</div>
          <div v-for="l in managedLocationOptions" :key="l"
               class="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-zinc-800 rounded-xl">
            <span class="text-sm text-stone-700 dark:text-stone-200">{{ l }}</span>
            <span v-if="assetLocationOptions.includes(l)" class="text-xs text-stone-300 dark:text-stone-600">資料已有</span>
            <button v-else @click="removeLocationOption(l)" class="text-stone-300 hover:text-red-400 transition-colors p-0.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <button @click="showLocationManager = false"
                class="mt-4 w-full py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">完成</button>
      </div>
    </div>

    <!-- 匯入進度 Modal -->
    <div v-if="importState.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80]">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div v-if="importState.done">
          <svg class="w-12 h-12 text-teal-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="font-bold text-stone-800 dark:text-stone-100 mb-1">匯入完成</p>
          <p class="text-sm text-stone-500 dark:text-stone-400 mb-1">成功 {{ importState.success }} 筆</p>
          <p v-if="importState.fail > 0" class="text-sm text-red-400 mb-4">失敗 {{ importState.fail }} 筆</p>
          <p v-else class="mb-4"/>
          <button @click="importState.show = false"
                  class="px-6 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors">關閉</button>
        </div>
        <div v-else>
          <div class="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p class="font-bold text-stone-800 dark:text-stone-100 mb-1">匯入中…</p>
          <p class="text-sm text-stone-500 dark:text-stone-400 mb-3">{{ importState.current }} / {{ importState.total }} 筆</p>
          <div class="w-full bg-stone-100 dark:bg-zinc-800 rounded-full h-2">
            <div class="bg-teal-600 h-2 rounded-full transition-all duration-300"
                 :style="{ width: importState.total ? (importState.current / importState.total * 100) + '%' : '0%' }"/>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
definePageMeta({layout: 'staff', requiredPermission: 'staff.asset'})
const perm = usePermission()

// ── Dark Mode ─────────────────────────────────────────────────────
const darkStore = useDarkModeStore()
const isDark = computed(() => darkStore.data.dark)
const toggleDark = () => {
  darkStore.change_dark_mode()
}

// ── 桌機顯示模式 ──────────────────────────────────────────────────
const desktopView = ref('table')

// ── 欄位設定 ──────────────────────────────────────────────────────
const COL_DEFS = [
  {key: 'listed', label: '列入財產'},
  {key: 'spec', label: '規格'},
  {key: 'brand', label: '廠牌'},
  {key: 'keeper', label: '保管人員'},
  {key: 'org', label: '機構'},
  {key: 'unit', label: '保管單位'},
  {key: 'location', label: '放置位置'},
  {key: 'usage', label: '用途'},
  {key: 'issuer', label: '撥發單位'},
  {key: 'quantity', label: '撥發數量'},
  {key: 'note', label: '備註'},
  {key: 'purchaseDate', label: '購置日期'},
  {key: 'price', label: '單價'},
  {key: 'lifespan', label: '使用年限'},
  {key: 'planName', label: '計畫名稱'},
  {key: 'plateNo', label: '車號'}
]
const DEFAULT_COLS = Object.fromEntries(COL_DEFS.map(c => [c.key, true]))
const LS_COLS = 'asset_visible_cols'
const visibleCols = reactive({...DEFAULT_COLS})
const showColSettings = ref(false)
const colSettingsRef = ref(null)

const loadCols = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_COLS) || '{}')
    for (const col of COL_DEFS) {
      if (col.key in saved) visibleCols[col.key] = saved[col.key]
    }
  } catch {
  }
}
const saveCols = () => {
  localStorage.setItem(LS_COLS, JSON.stringify({...visibleCols}))
}
const toggleCol = (key) => {
  visibleCols[key] = !visibleCols[key];
  saveCols()
}
const resetCols = () => {
  for (const col of COL_DEFS) visibleCols[col.key] = true;
  saveCols()
}

// ── 篩選 ─────────────────────────────────────────────────────────
const searchText = ref('')
const filterOrg = ref('')
const filterUnit = ref('')
const filterLocation = ref('')
const filterListed = ref('')
const LS_FILTERS = 'asset_filters'

const loadFilters = () => {
  try {
    const s = JSON.parse(localStorage.getItem(LS_FILTERS) || '{}')
    if (s.desktopView) desktopView.value = s.desktopView
    if (s.filterOrg) filterOrg.value = s.filterOrg
    if (s.filterUnit) filterUnit.value = s.filterUnit
    if (s.filterLocation) filterLocation.value = s.filterLocation
    if (s.filterListed) filterListed.value = s.filterListed
  } catch {
  }
}
const saveFilters = () => {
  localStorage.setItem(LS_FILTERS, JSON.stringify({
    desktopView: desktopView.value, filterOrg: filterOrg.value,
    filterUnit: filterUnit.value, filterLocation: filterLocation.value, filterListed: filterListed.value
  }))
}
watch([desktopView, filterOrg, filterUnit, filterLocation, filterListed], saveFilters)

// ── API ──────────────────────────────────────────────────────────
const commonStore = useCommonStore()
const API_BASE = computed(() => commonStore.data.main_url + '/holy/assets')

// ── 狀態 ──────────────────────────────────────────────────────────
const assets = ref([])
const loading = ref(false)

const emptyAsset = () => ({
  id: '', name: '', spec: '', brand: '', keeper: '', org: '', unit: '',
  location: '', usage: '', issuer: '', quantity: 1, note: '',
  purchaseDate: '', price: null, lifespan: null, planName: '', plateNo: '',
  image: '', thumbUrl: '', thumbLgUrl: '', listed: true
})

const modal = reactive({show: false, isNew: true, simple: true, data: emptyAsset()})
const imageInputRef = ref(null)
const uploadingImage = ref(false)
const toast = reactive({show: false, message: ''})

// ── imgUrl ────────────────────────────────────────────────────────
const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_BASE.value.replace('/holy/assets', '') + path
}

// ── 大圖預覽 ─────────────────────────────────────────────────────
const preview = reactive({show: false, url: '', loading: false})
const openPreview = (imagePath) => {
  preview.url = imgUrl(imagePath);
  preview.loading = true;
  preview.show = true
}

// ── 圖片上傳：後端回傳 { image, thumbUrl, thumbLgUrl } ───────────
const triggerImageUpload = async () => {
  if (modal.isNew && !modal.data.id) {
    if (!modal.data.name?.trim()) {
      alert('請先填寫財產名稱再上傳圖片');
      return
    }
    try {
      const saved = await (await fetch(`${API_BASE.value}/save`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(modal.data)
      })).json()
      modal.data.id = saved.id;
      modal.isNew = false;
      assets.value.push({...modal.data})
    } catch (e) {
      console.error(e);
      return
    }
  }
  imageInputRef.value?.click()
}

const handleImageChange = async (e) => {
  const file = e.target.files[0]
  if (!file || !modal.data.id) return
  uploadingImage.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const result = await (await fetch(`${API_BASE.value}/image/upload/${modal.data.id}`, {
      method: 'POST', body: formData
    })).json()
    modal.data.image = result.image
    modal.data.thumbUrl = result.thumbUrl
    modal.data.thumbLgUrl = result.thumbLgUrl
    const idx = assets.value.findIndex(a => a.id === modal.data.id)
    if (idx >= 0) {
      assets.value[idx].image = result.image
      assets.value[idx].thumbUrl = result.thumbUrl
      assets.value[idx].thumbLgUrl = result.thumbLgUrl
    }
  } catch (e) {
    console.error(e)
  } finally {
    uploadingImage.value = false
    if (imageInputRef.value) imageInputRef.value.value = ''
  }
}

const deleteImage = async () => {
  if (!modal.data.id) return
  try {
    await fetch(`${API_BASE.value}/image/remove/${modal.data.id}`, {method: 'DELETE'})
    modal.data.image = '';
    modal.data.thumbUrl = '';
    modal.data.thumbLgUrl = ''
    const idx = assets.value.findIndex(a => a.id === modal.data.id)
    if (idx >= 0) {
      assets.value[idx].image = '';
      assets.value[idx].thumbUrl = '';
      assets.value[idx].thumbLgUrl = ''
    }
  } catch (e) {
    console.error(e)
  }
}

// ── Computed ──────────────────────────────────────────────────────
const filtered = computed(() => assets.value.filter((a) => {
  const q = searchText.value.toLowerCase()
  return (!q || a.name?.toLowerCase().includes(q) || a.spec?.toLowerCase().includes(q)
      || a.brand?.toLowerCase().includes(q) || a.keeper?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q))
    && (!filterOrg.value || a.org === filterOrg.value)
    && (!filterUnit.value || a.unit === filterUnit.value)
    && (!filterLocation.value || a.location === filterLocation.value)
    && (!filterListed.value || (filterListed.value === 'true' ? a.listed !== false : a.listed === false))
}))

const orgOptions = computed(() => [...new Set(assets.value.map(a => a.org).filter(Boolean))].sort())

// ── 拖曳排序 ─────────────────────────────────────────────────────
const draggingIndex = ref(null)
const dragOverIndex = ref(null)
const reordering = ref(false)

const onDragStart = (index, event) => {
  draggingIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(index))
}
const onDragOver = (index) => {
  if (draggingIndex.value !== null && draggingIndex.value !== index) dragOverIndex.value = index
}
const onDragLeave = () => {
  dragOverIndex.value = null
}
const onDragEnd = () => {
  draggingIndex.value = null;
  dragOverIndex.value = null
}

const onDrop = (targetIndex) => {
  if (draggingIndex.value === null || draggingIndex.value === targetIndex) {
    draggingIndex.value = null;
    dragOverIndex.value = null;
    return
  }
  const fromIdx = assets.value.findIndex(a => a.id === filtered.value[draggingIndex.value].id)
  const toIdx = assets.value.findIndex(a => a.id === filtered.value[targetIndex].id)
  if (fromIdx >= 0 && toIdx >= 0) {
    const [moved] = assets.value.splice(fromIdx, 1)
    assets.value.splice(toIdx, 0, moved)
    saveReorder()
  }
  draggingIndex.value = null;
  dragOverIndex.value = null
}

const saveReorder = async () => {
  reordering.value = true
  try {
    await fetch(`${API_BASE.value}/reorder`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(assets.value.map(a => a.id))
    })
    showToast('排序已儲存')
  } catch (e) {
    console.error(e);
    showToast('排序儲存失敗')
  } finally {
    reordering.value = false
  }
}

// ── 保管單位 ──────────────────────────────────────────────────────
const managedUnitOptions = ref([])
const showUnitManager = ref(false)
const newUnitInput = ref('')
const lastSelectedUnit = ref('')

const fetchUnits = async () => {
  try {
    managedUnitOptions.value = await (await fetch(`${API_BASE.value}/units`)).json()
  } catch (e) {
    console.error(e)
  }
}
const addUnitOption = async () => {
  const v = newUnitInput.value.trim();
  if (!v) return
  try {
    managedUnitOptions.value = await (await fetch(`${API_BASE.value}/units/add`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(v)
    })).json()
    newUnitInput.value = ''
  } catch (e) {
    console.error(e)
  }
}
const removeUnitOption = async (idx) => {
  const unit = managedUnitOptions.value[idx]
  try {
    managedUnitOptions.value = await (await fetch(`${API_BASE.value}/units/remove`, {
      method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(unit)
    })).json()
  } catch (e) {
    console.error(e)
  }
}

// ── 放置位置 ──────────────────────────────────────────────────────
const LS_KEY = 'asset_location_options'
const showLocationManager = ref(false)
const newLocationInput = ref('')
const customLocationOptions = ref([])
const lastSelectedLocation = ref('')

const loadCustomLocations = () => {
  try {
    customLocationOptions.value = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    customLocationOptions.value = []
  }
}
const saveCustomLocations = () => {
  localStorage.setItem(LS_KEY, JSON.stringify(customLocationOptions.value))
}
const assetLocationOptions = computed(() => [...new Set(assets.value.map(a => a.location).filter(Boolean))])
const managedLocationOptions = computed(() => [...new Set([...assetLocationOptions.value, ...customLocationOptions.value])].sort())

const addLocationOption = () => {
  const v = newLocationInput.value.trim()
  if (!v || managedLocationOptions.value.includes(v)) return
  customLocationOptions.value.push(v);
  saveCustomLocations();
  newLocationInput.value = ''
}
const removeLocationOption = (option) => {
  if (assetLocationOptions.value.includes(option)) return
  customLocationOptions.value = customLocationOptions.value.filter(l => l !== option)
  saveCustomLocations()
}

// ── 資料 CRUD ─────────────────────────────────────────────────────
const fetchAssets = async () => {
  loading.value = true
  try {
    assets.value = await (await fetch(`${API_BASE.value}/list`)).json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const saveAsset = async () => {
  if (!modal.data.name?.trim()) {
    showToast('請填寫財產名稱');
    return
  }
  const data = {...modal.data}
  try {
    if (modal.isNew) {
      const saved = await (await fetch(`${API_BASE.value}/save`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
      })).json()
      modal.data.id = saved.id;
      assets.value.push(saved)
    } else {
      await fetch(`${API_BASE.value}/update/${data.id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
      })
      const idx = assets.value.findIndex(a => a.id === data.id)
      if (idx >= 0) assets.value[idx] = data
    }
    modal.show = false
    if (data.unit) lastSelectedUnit.value = data.unit
    if (data.location) lastSelectedLocation.value = data.location
    showToast(modal.isNew ? '新增成功' : '儲存成功')
  } catch (e) {
    console.error(e);
    showToast('儲存失敗')
  }
}

const confirmDelete = async (asset) => {
  if (!confirm(`確定刪除「${asset.name}」？`)) return
  try {
    await fetch(`${API_BASE.value}/remove/${asset.id}`, {method: 'DELETE'})
    assets.value = assets.value.filter(a => a.id !== asset.id)
    showToast('已刪除')
  } catch (e) {
    console.error(e)
  }
}

const openModal = (asset) => {
  modal.isNew = !asset
  modal.simple = true
  modal.data = asset ? {...asset} : {
    ...emptyAsset(),
    unit: lastSelectedUnit.value,
    location: lastSelectedLocation.value
  }
  modal.show = true
}

// ── 匯出 Excel ────────────────────────────────────────────────────
const exportExcel = async () => {
  const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
  const COLS = [
    ['財產名稱/型號', 'name', '', 42.89], ['規格', 'spec', '', 38.89], ['廠牌', 'brand', '', 14.89],
    ['保管人員', 'keeper', '(輸入姓名)', 8.67], ['機構', 'org', '(參閱查詢)', 8.11],
    ['保管單位', 'unit', '(請填單位部門)', 22.22], ['用途', 'usage', '', 20.00],
    ['放置位置', 'location', '(請參閱查詢，複製地點名稱)', 32.56], ['撥發數量', 'quantity', '', 9.67],
    ['撥發單位', 'issuer', '(參閱查詢)', 10.00], ['備註', 'note', '', 29.00],
    ['購置日期', 'purchaseDate', '(依日期格式填寫)', 14.89], ['單價', 'price', '', 5.33],
    ['使用年限', 'lifespan', '', 11.89], ['計畫名稱', 'planName', '(參閱查詢，填編號)', 15.33], ['車號', 'plateNo', '', 10.89]
  ]
  const groups = {}
  for (const asset of filtered.value) {
    const key = asset.unit || '未分類'
    if (!groups[key]) groups[key] = []
    groups[key].push(asset)
  }
  const wb = XLSX.utils.book_new()
  for (const [sheetName, items] of Object.entries(groups)) {
    const aoa = [
      ['財產補登資料填寫表1150326版', ...Array(COLS.length - 1).fill(null)],
      COLS.map(c => c[0]), COLS.map(c => c[2] || null),
      ...items.map(asset => COLS.map(([, field]) => {
        const v = asset[field];
        return (v === null || v === undefined || v === '' || v === 0) ? null : v
      }))
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = COLS.map(c => ({wch: c[3]}))
    ws['!rows'] = [{hpt: 39.75}, {hpt: 31.5}, {}, {hpt: 25.5}]
    ws['!merges'] = [0, 1, 2, 6, 8, 10, 12, 13, 15].map(c => ({s: {r: 1, c}, e: {r: 2, c}}))
    ws['!freeze'] = {xSplit: 0, ySplit: 3}
    XLSX.utils.book_append_sheet(wb, ws, sheetName.replace(/[\\/:*?[\]]/g, '_').slice(0, 31))
  }
  const buf = XLSX.write(wb, {bookType: 'xlsx', type: 'array'})
  const blob = new Blob([buf], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url;
  a.download = `財產登記_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click()
  URL.revokeObjectURL(url)
  showToast('Excel 已匯出')
}

// ── 匯入 Excel ────────────────────────────────────────────────────
const importInputRef = ref(null)
const importState = reactive({show: false, done: false, total: 0, current: 0, success: 0, fail: 0})

const triggerImport = () => {
  if (importInputRef.value) importInputRef.value.value = '';
  importInputRef.value?.click()
}

const handleImport = async (e) => {
  const file = e.target.files[0];
  if (!file) return
  const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
  const wb = XLSX.read(await file.arrayBuffer(), {type: 'array'})
  const COL_MAP = {
    '財產名稱/型號': 'name',
    '規格': 'spec',
    '廠牌': 'brand',
    '保管人員': 'keeper',
    '機構': 'org',
    '保管單位': 'unit',
    '用途': 'usage',
    '放置位置': 'location',
    '撥發數量': 'quantity',
    '撥發單位': 'issuer',
    '備註': 'note',
    '購置日期': 'purchaseDate',
    '單價': 'price',
    '使用年限': 'lifespan',
    '計畫名稱': 'planName',
    '車號': 'plateNo'
  }
  const rows = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const raw = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''})
    const hi = raw.findIndex(r => r.includes('財產名稱/型號'));
    if (hi < 0) continue
    const headers = raw[hi]
    for (let i = hi + 1; i < raw.length; i++) {
      const row = {};
      headers.forEach((h, idx) => {
        if (h) row[h] = raw[i][idx] ?? ''
      })
      const name = String(row['財產名稱/型號'] ?? '').trim()
      if (!name || name.includes('填寫') || name.includes('參閱') || name === '財產名稱/型號') continue
      const asset = {...emptyAsset()}
      for (const [xlsCol, apiField] of Object.entries(COL_MAP)) {
        const val = row[xlsCol];
        if (val === undefined || val === '') continue
        if (['quantity', 'price', 'lifespan'].includes(apiField)) {
          const n = parseFloat(val);
          asset[apiField] = isNaN(n) ? null : n
        } else asset[apiField] = String(val).trim()
      }
      rows.push(asset)
    }
  }
  if (rows.length === 0) {
    showToast('找不到可匯入的資料');
    return
  }
  Object.assign(importState, {show: true, done: false, total: rows.length, current: 0, success: 0, fail: 0})
  for (const asset of rows) {
    try {
      const saved = await (await fetch(`${API_BASE.value}/save`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(asset)
      })).json()
      assets.value.push(saved);
      importState.success++
    } catch {
      importState.fail++
    }
    importState.current++
  }
  importState.done = true
}

// ── Toast ─────────────────────────────────────────────────────────
const showToast = (msg) => {
  toast.message = msg
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

onMounted(async () => {
  if (import.meta.client) {
    loadCustomLocations()
    loadFilters()
    loadCols()
    document.addEventListener('mousedown', (e) => {
      if (colSettingsRef.value && !colSettingsRef.value.contains(e.target)) showColSettings.value = false
    })
  }
  await fetchAssets()
  await fetchUnits()
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
