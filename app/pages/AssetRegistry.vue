<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

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
          <button @click="exportCSV"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            匯出 CSV
          </button>
          <button @click="openModal(null)"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            新增財產
          </button>
        </div>
      </div>

      <!-- 搜尋 + 篩選 -->
      <div class="flex flex-wrap gap-2">
        <input v-model="searchText" placeholder="搜尋財產名稱、型號…"
               class="flex-1 min-w-40 px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
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
        <span class="text-xs text-stone-400 self-center">共 {{ filtered.length }} 筆</span>
      </div>
    </header>

    <div class="max-w-full px-3 sm:px-4 py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="flex items-center justify-center py-16 text-stone-400 gap-2">
        <div class="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        載入中…
      </div>

      <!-- 無資料 -->
      <div v-else-if="filtered.length === 0" class="text-center py-16 text-stone-400 text-sm">
        {{ assets.length === 0 ? '尚無財產資料，點擊「新增財產」開始登記' : '找不到符合條件的財產' }}
      </div>

      <!-- 桌機表格 -->
      <div v-else class="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm whitespace-nowrap">
            <thead class="bg-stone-50 dark:bg-zinc-800 text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            <tr>
              <th class="px-3 py-3 text-left">圖片</th>
              <th class="px-3 py-3 text-left">財產名稱／型號</th>
              <th class="px-3 py-3 text-left">規格</th>
              <th class="px-3 py-3 text-left">廠牌</th>
              <th class="px-3 py-3 text-left">保管人員</th>
              <th class="px-3 py-3 text-left">機構</th>
              <th class="px-3 py-3 text-left">保管單位</th>
              <th class="px-3 py-3 text-left">放置位置</th>
              <th class="px-3 py-3 text-left">用途</th>
              <th class="px-3 py-3 text-left">撥發單位</th>
              <th class="px-3 py-3 text-center">撥發數量</th>
              <th class="px-3 py-3 text-left">備註</th>
              <th class="px-3 py-3 text-left">購置日期</th>
              <th class="px-3 py-3 text-right">單價</th>
              <th class="px-3 py-3 text-center">使用年限</th>
              <th class="px-3 py-3 text-left">計畫名稱</th>
              <th class="px-3 py-3 text-left">車號</th>
              <th class="px-3 py-3 text-center">操作</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
            <tr v-for="asset in filtered" :key="asset.id"
                class="hover:bg-stone-50 dark:hover:bg-zinc-700/30 transition-colors">
              <td class="px-3 py-2.5">
                <img v-if="asset.image" :src="imgUrl(asset.image)" :alt="asset.name"
                     class="w-10 h-10 rounded-lg object-cover border border-stone-200 dark:border-stone-700 cursor-pointer"
                     @click="previewUrl = imgUrl(asset.image)" />
                <div v-else class="w-10 h-10 rounded-lg bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-stone-300">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
              </td>
              <td class="px-3 py-2.5 font-medium text-stone-800 dark:text-stone-100 max-w-40">
                <div class="truncate" :title="asset.name">{{ asset.name }}</div>
              </td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.spec }}</td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.brand }}</td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.keeper }}</td>
              <td class="px-3 py-2.5">
                <span class="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">{{ asset.org }}</span>
              </td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.unit }}</td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300 max-w-36">
                <div class="truncate" :title="asset.location">{{ asset.location }}</div>
              </td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.usage }}</td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.issuer }}</td>
              <td class="px-3 py-2.5 text-center text-stone-700 dark:text-stone-200 font-medium">{{ asset.quantity }}</td>
              <td class="px-3 py-2.5 text-stone-500 dark:text-stone-400 max-w-32">
                <div class="truncate" :title="asset.note">{{ asset.note }}</div>
              </td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.purchaseDate }}</td>
              <td class="px-3 py-2.5 text-right text-stone-700 dark:text-stone-200 font-medium">
                {{ asset.price ? asset.price.toLocaleString() : '—' }}
              </td>
              <td class="px-3 py-2.5 text-center text-stone-600 dark:text-stone-300">{{ asset.lifespan }}</td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.planName }}</td>
              <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ asset.plateNo }}</td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1 justify-center">
                  <button @click="openModal(asset)"
                          class="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">編輯</button>
                  <button @click="confirmDelete(asset)"
                          class="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">刪除</button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 手機卡片 -->
      <div class="md:hidden space-y-3">
        <div v-for="asset in filtered" :key="asset.id"
             class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4">
          <div class="flex items-start gap-3 mb-3">
            <img v-if="asset.image" :src="imgUrl(asset.image)" :alt="asset.name"
                 class="w-16 h-16 rounded-xl object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0 cursor-pointer"
                 @click="previewUrl = imgUrl(asset.image)" />
            <div class="flex-1 min-w-0 flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-stone-800 dark:text-stone-100 leading-tight">{{ asset.name }}</p>
                <p class="text-xs text-stone-400 mt-0.5">{{ asset.spec }} {{ asset.brand ? '· ' + asset.brand : '' }}</p>
              </div>
              <span class="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 flex-shrink-0">{{ asset.org }}</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300 mb-3">
            <div v-if="asset.keeper"><span class="text-stone-400">保管人：</span>{{ asset.keeper }}</div>
            <div v-if="asset.unit"><span class="text-stone-400">保管單位：</span>{{ asset.unit }}</div>
            <div v-if="asset.location"><span class="text-stone-400">位置：</span>{{ asset.location }}</div>
            <div v-if="asset.usage"><span class="text-stone-400">用途：</span>{{ asset.usage }}</div>
            <div v-if="asset.issuer"><span class="text-stone-400">撥發單位：</span>{{ asset.issuer }}</div>
            <div v-if="asset.quantity"><span class="text-stone-400">數量：</span>{{ asset.quantity }}</div>
            <div v-if="asset.purchaseDate"><span class="text-stone-400">購置：</span>{{ asset.purchaseDate }}</div>
            <div v-if="asset.price"><span class="text-stone-400">單價：</span>{{ asset.price.toLocaleString() }}</div>
            <div v-if="asset.lifespan"><span class="text-stone-400">年限：</span>{{ asset.lifespan }} 年</div>
            <div v-if="asset.planName"><span class="text-stone-400">計畫：</span>{{ asset.planName }}</div>
            <div v-if="asset.plateNo"><span class="text-stone-400">車號：</span>{{ asset.plateNo }}</div>
          </div>
          <p v-if="asset.note" class="text-xs text-stone-400 italic mb-3">{{ asset.note }}</p>
          <div class="flex gap-2">
            <button @click="openModal(asset)"
                    class="flex-1 py-1.5 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-50 transition-colors">編輯</button>
            <button @click="confirmDelete(asset)"
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
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- 圖片上傳 -->
          <div class="sm:col-span-2">
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">圖片</label>
            <div class="flex gap-3 items-start">
              <div class="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-stone-200 dark:border-stone-700 relative bg-stone-50 dark:bg-zinc-800 cursor-pointer"
                   @click="triggerImageUpload">
                <img v-if="modal.data.image" :src="imgUrl(modal.data.image)" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-1">
                  <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span class="text-xs">點擊上傳</span>
                </div>
                <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="handleImageChange" />
              </div>
              <div class="flex-1 space-y-1.5">
                <button v-if="modal.data.image" @click="deleteImage"
                        class="text-xs text-red-400 hover:text-red-500 transition-colors">移除圖片</button>
                <p class="text-xs text-stone-400">點擊左側縮圖上傳圖片</p>
                <p v-if="uploadingImage" class="text-xs text-teal-600 flex items-center gap-1">
                  <span class="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block"></span>上傳中…
                </p>
              </div>
            </div>
          </div>

          <!-- 財產名稱/型號 -->
          <div class="sm:col-span-2">
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">財產名稱／型號 <span class="text-red-400">*</span></label>
            <input v-model="modal.data.name" placeholder="例：OA-150木紋辦公桌"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">規格</label>
            <input v-model="modal.data.spec" placeholder="規格"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <!-- 保管單位：簡易和完整模式都顯示 -->
          <div>
            <label class="text-xs font-medium text-stone-600 dark:text-stone-300 mb-1 flex items-center justify-between">
              保管單位
              <button type="button" @click="showUnitManager = true"
                      class="text-teal-600 dark:text-teal-400 hover:text-teal-700 font-normal text-xs flex items-center gap-0.5">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                管理選項
              </button>
            </label>
            <select v-model="modal.data.unit"
                    class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">— 請選擇 —</option>
              <option v-for="u in managedUnitOptions" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <template v-if="!modal.simple">
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">廠牌</label>
              <input v-model="modal.data.brand" placeholder="廠牌"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">保管人員</label>
              <input v-model="modal.data.keeper" placeholder="輸入姓名"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">機構</label>
              <input v-model="modal.data.org" placeholder="例：法人"
                     list="org-list"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
              <datalist id="org-list">
                <option v-for="o in orgOptions" :key="o" :value="o" />
              </datalist>
            </div>
            <div class="sm:col-span-2">
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">放置位置</label>
              <input v-model="modal.data.location" placeholder="請參閱查詢，複製地點名稱"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">用途</label>
              <input v-model="modal.data.usage" placeholder="例：辦公"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">撥發單位</label>
              <input v-model="modal.data.issuer" placeholder="請參閱查詢"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">撥發數量</label>
              <input v-model.number="modal.data.quantity" type="number" min="1" placeholder="1"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">購置日期</label>
              <input v-model="modal.data.purchaseDate" type="date"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">單價（元）</label>
              <input v-model.number="modal.data.price" type="number" min="0" placeholder="0"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">使用年限（年）</label>
              <input v-model.number="modal.data.lifespan" type="number" min="0" placeholder="0"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">計畫名稱（編號）</label>
              <input v-model="modal.data.planName" placeholder="請參閱查詢，填編號"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">車號</label>
              <input v-model="modal.data.plateNo" placeholder="車號"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div class="sm:col-span-2">
              <label class="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1">備註</label>
              <textarea v-model="modal.data.note" rows="2" placeholder="備註"
                        class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400 resize-none"></textarea>
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

    <!-- 大圖預覽 -->
    <div v-if="previewUrl" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] cursor-pointer p-4"
         @click="previewUrl = ''">
      <img :src="previewUrl" class="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
    </div>

    <!-- 單位管理 Modal -->
    <div v-if="showUnitManager" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">管理保管單位選項</h3>
          <button @click="showUnitManager = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- 新增輸入 -->
        <div class="flex gap-2 mb-3">
          <input v-model="newUnitInput" placeholder="新增保管單位…"
                 @keydown.enter.prevent="addUnitOption"
                 class="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-teal-400" />
          <button @click="addUnitOption"
                  class="px-3 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition-colors">新增</button>
        </div>
        <!-- 選項清單 -->
        <div class="space-y-1.5 max-h-64 overflow-y-auto">
          <div v-if="managedUnitOptions.length === 0" class="text-center py-6 text-stone-400 text-sm">尚無選項</div>
          <div v-for="(u, idx) in managedUnitOptions" :key="u"
               class="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-zinc-800 rounded-xl">
            <span class="text-sm text-stone-700 dark:text-stone-200">{{ u }}</span>
            <button @click="removeUnitOption(idx)"
                    class="text-stone-300 hover:text-red-400 transition-colors p-0.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <button @click="showUnitManager = false"
                class="mt-4 w-full py-2 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">完成</button>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import {ref, computed, reactive, onMounted} from 'vue'
import {useCommonStore} from '~/stores/common.js'

// ── API ──────────────────────────────────────────────────────────
const commonStore = useCommonStore()
const API_BASE = computed(() => commonStore.data.main_url + '/holy/assets')

// ── 狀態 ──────────────────────────────────────────────────────────
const assets = ref([])
const loading = ref(false)
const searchText = ref('')
const filterOrg = ref('')
const filterUnit = ref('')

const emptyAsset = () => ({
  id: '', name: '', spec: '', brand: '', keeper: '', org: '', unit: '',
  location: '', usage: '', issuer: '', quantity: 1, note: '',
  purchaseDate: '', price: null, lifespan: null, planName: '', plateNo: '', image: '',
})

const modal = reactive({show: false, isNew: true, simple: true, data: emptyAsset()})
const imageInputRef = ref(null)
const uploadingImage = ref(false)

const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_BASE.value.replace('/holy/assets', '') + path
}

const triggerImageUpload = async () => {
  // 新增模式且沒有 id 時，先儲存取得 id
  if (modal.isNew && !modal.data.id) {
    if (!modal.data.name?.trim()) {
      alert('請先填寫財產名稱再上傳圖片')
      return
    }
    try {
      const saved = await (await fetch(`${API_BASE.value}/save`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(modal.data)
      })).json()
      modal.data.id = saved.id
      modal.isNew = false
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
    const url = await (await fetch(`${API_BASE.value}/image/upload/${modal.data.id}`, {
      method: 'POST', body: formData
    })).json()
    modal.data.image = url
    const idx = assets.value.findIndex(a => a.id === modal.data.id)
    if (idx >= 0) assets.value[idx].image = url
  } catch (e) {
    console.error(e)
  } finally {
    uploadingImage.value = false;
    if (imageInputRef.value) imageInputRef.value.value = ''
  }
}

const deleteImage = async () => {
  if (!modal.data.id) return
  try {
    await fetch(`${API_BASE.value}/image/remove/${modal.data.id}`, {method: 'DELETE'})
    modal.data.image = ''
    const idx = assets.value.findIndex(a => a.id === modal.data.id)
    if (idx >= 0) assets.value[idx].image = ''
  } catch (e) {
    console.error(e)
  }
}
const toast = reactive({show: false, message: ''})
const previewUrl = ref('')

// ── Computed ──────────────────────────────────────────────────────
const filtered = computed(() => {
  return assets.value.filter(a => {
    const q = searchText.value.toLowerCase()
    const matchSearch = !q || a.name?.toLowerCase().includes(q) ||
      a.spec?.toLowerCase().includes(q) || a.brand?.toLowerCase().includes(q) ||
      a.keeper?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q)
    const matchOrg = !filterOrg.value || a.org === filterOrg.value
    const matchUnit = !filterUnit.value || a.unit === filterUnit.value
    return matchSearch && matchOrg && matchUnit
  })
})

const orgOptions = computed(() => [...new Set(assets.value.map(a => a.org).filter(Boolean))].sort())
const unitOptions = computed(() => [...new Set(assets.value.map(a => a.unit).filter(Boolean))].sort())

// ── 保管單位選項管理 ──────────────────────────────────────────────
const managedUnitOptions = ref([])
const showUnitManager = ref(false)
const newUnitInput = ref('')
const lastSelectedUnit = ref('')   // 記住上次選擇的保管單位

const fetchUnits = async () => {
  try {
    managedUnitOptions.value = await (await fetch(`${API_BASE.value}/units`)).json()
  } catch (e) {
    console.error(e)
  }
}

const addUnitOption = async () => {
  const v = newUnitInput.value.trim()
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

// ── API ───────────────────────────────────────────────────────────
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
      modal.data.id = saved.id  // 取得 id 以便圖片上傳
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

// ── Modal ─────────────────────────────────────────────────────────
const openModal = (asset) => {
  modal.isNew = !asset
  modal.simple = true
  modal.data = asset ? {...asset} : {...emptyAsset(), unit: lastSelectedUnit.value}
  modal.show = true
}

// ── 匯出 CSV ──────────────────────────────────────────────────────
const exportCSV = () => {
  const headers = ['財產名稱/型號', '規格', '廠牌', '保管人員', '機構', '保管單位', '放置位置', '用途', '撥發單位', '撥發數量', '備註', '購置日期', '單價', '使用年限', '計畫名稱', '車號']
  const fields = ['name', 'spec', 'brand', 'keeper', 'org', 'unit', 'location', 'usage', 'issuer', 'quantity', 'note', 'purchaseDate', 'price', 'lifespan', 'planName', 'plateNo']
  const rows = filtered.value.map(a => fields.map(f => {
    const v = a[f] ?? ''
    return `"${String(v).replace(/"/g, '""')}"`
  }).join(','))
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url;
  a.download = `財產登記_${new Date().toISOString().slice(0, 10)}.csv`
  a.click();
  URL.revokeObjectURL(url)
  showToast('CSV 已匯出')
}

// ── Toast ─────────────────────────────────────────────────────────
const showToast = (msg) => {
  toast.message = msg;
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

onMounted(async () => {
  await fetchAssets();
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
