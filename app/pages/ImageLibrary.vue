<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900">

    <!-- Header -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3">
      <div class="flex items-center gap-3">
        <!-- 手機：資料夾開關按鈕 -->
        <button @click="sidebarOpen = !sidebarOpen"
                class="sm:hidden p-1.5 text-stone-500 hover:text-indigo-600 transition-colors flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
        </button>
        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">圖</div>
        <div class="flex-1 min-w-0">
          <h1 class="font-bold text-stone-800 dark:text-stone-100 text-sm sm:text-base leading-none">資源管理庫</h1>
          <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Resource Library</p>
        </div>
        <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
          <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
          <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
        </span>
      </div>
    </header>

    <div class="flex h-[calc(100vh-57px)] relative">

      <!-- 手機遮罩 -->
      <div v-if="sidebarOpen" class="fixed inset-0 bg-black/40 z-20 sm:hidden" @click="sidebarOpen = false"></div>

      <!-- 左側欄：資料夾樹 -->
      <aside :class="[
        'flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-stone-200 dark:border-stone-700 flex flex-col z-30 transition-transform duration-300',
        'fixed top-0 bottom-0 left-0 w-64 sm:static sm:w-52 sm:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
      ]">
        <div class="px-3 pt-3 pb-2 flex items-center justify-between">
          <span class="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">資料夾</span>
          <button @click="openAddFolder(null)" class="p-1 text-stone-400 hover:text-indigo-600 transition-colors" title="新增頂層資料夾">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          <button @click="selectFolder('全部')"
                  :class="selectedPath === '全部' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800'"
                  class="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 mb-0.5">
            <svg class="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            全部
          </button>
          <FolderTreeNode v-for="node in folderTree" :key="node.path"
                          :node="node" :selectedPath="selectedPath" :depth="0"
                          @select="selectFolder"
                          @add="openAddFolder"
                          @rename="openRenameFolder"
                          @moveup="moveFolderUp"
                          @movedown="moveFolderDown"
                          @delete="confirmDeleteFolder"
                          @drop-file="onDropToFolder" />
        </div>
      </aside>

      <!-- 主區域 -->
      <main class="flex-1 min-w-0 flex flex-col overflow-hidden">

        <!-- 工具列 -->
        <div class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div class="relative flex-1 min-w-40 max-w-xs">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
            <input v-model="searchText" placeholder="搜尋檔案…"
                   class="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div class="flex bg-stone-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
            <button @click="viewMode = 'grid'" :class="viewMode==='grid'?'bg-white dark:bg-zinc-700 shadow-sm text-stone-700 dark:text-stone-100':'text-stone-400'" class="p-1.5 rounded-md transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            </button>
            <button @click="viewMode = 'list'" :class="viewMode==='list'?'bg-white dark:bg-zinc-700 shadow-sm text-stone-700 dark:text-stone-100':'text-stone-400'" class="p-1.5 rounded-md transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            </button>
          </div>
          <div class="text-xs text-stone-400 hidden sm:block">
            {{ selectedPath === '全部' ? '全部' : String(selectedPath).replace(/\//g, ' / ') }} · {{ filteredImages.length }} 個
          </div>
          <label class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer ml-auto">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            上傳
            <input type="file" accept="image/*,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.pdf,.txt" multiple class="hidden" @change="handleUpload" />
          </label>
        </div>

        <!-- 上傳進度 -->
        <div v-if="uploading" class="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800/30 px-4 py-2 flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
          <div class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          上傳中…
        </div>

        <!-- 檔案區域 -->
        <div class="flex-1 overflow-y-auto p-4 relative"
             @dragover.prevent="isDragOverUpload = true"
             @dragleave.self="isDragOverUpload = false"
             @drop.prevent="onDropUpload">

          <!-- 拖放上傳提示遮罩 -->
          <div v-if="isDragOverUpload"
               class="absolute inset-0 z-20 bg-indigo-600/10 border-4 border-dashed border-indigo-400 rounded-2xl flex flex-col items-center justify-center gap-3 pointer-events-none m-2">
            <svg class="w-12 h-12 text-indigo-500 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            <p class="text-indigo-600 dark:text-indigo-400 font-semibold text-base">放開以上傳到「{{ selectedPath === '全部' ? '未分類' : selectedPath }}」</p>
          </div>
          <div v-if="loading" class="flex items-center justify-center py-16 text-stone-400 gap-2">
            <div class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            載入中…
          </div>
          <div v-else-if="filteredImages.length === 0" class="flex flex-col items-center justify-center py-20 text-stone-400">
            <svg class="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <p class="text-sm">{{ searchText ? '找不到符合的檔案' : '這裡還沒有檔案' }}</p>
          </div>

          <!-- 格狀 -->
          <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            <div v-for="img in filteredImages" :key="img.url"
                 class="group relative bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
                 draggable="true"
                 @dragstart="onDragStart(img)"
                 @dragend="dragging = null"
                 @click="previewImg = img">
              <div class="aspect-square overflow-hidden bg-stone-100 dark:bg-zinc-700 flex items-center justify-center">
                <img v-if="isImage(img.fileName)" :src="imgUrl(img.url)" :alt="img.originalName" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                <img v-else-if="img.coverUrl" :src="imgUrl(img.coverUrl)" :alt="img.originalName" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                <div v-else class="flex flex-col items-center gap-2 p-4">
                  <span class="text-4xl">{{ fileEmoji(img.fileName) }}</span>
                  <span class="text-xs font-bold uppercase text-stone-500">{{ fileExt(img.fileName) }}</span>
                </div>
              </div>
              <div class="px-2 py-1.5">
                <p class="text-xs text-stone-600 dark:text-stone-300 truncate font-medium">{{ img.displayName || img.originalName }}</p>
                <p v-if="img.displayName" class="text-xs text-stone-400 truncate">{{ img.originalName }}</p>
                <p class="text-xs text-stone-400 mt-0.5">{{ formatSize(img.size) }}</p>
              </div>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-2xl items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 hidden sm:flex">
                <button @click.stop="copyUrl(img)" title="複製連結" class="p-2 bg-white/90 hover:bg-white rounded-xl text-stone-700 transition-colors shadow-sm">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
                <a :href="imgUrl(img.url)" :download="img.originalName" @click.stop title="下載" class="p-2 bg-white/90 hover:bg-indigo-50 rounded-xl text-indigo-600 transition-colors shadow-sm">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </a>
                <button @click.stop="openMoveModal(img)" title="移動" class="p-2 bg-white/90 hover:bg-indigo-50 rounded-xl text-indigo-500 transition-colors shadow-sm">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                </button>
                <button @click.stop="openEditModal(img)" title="編輯" class="p-2 bg-white/90 hover:bg-amber-50 rounded-xl text-amber-600 transition-colors shadow-sm">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button @click.stop="confirmDelete(img)" title="刪除" class="p-2 bg-white/90 hover:bg-red-50 rounded-xl text-red-500 transition-colors shadow-sm">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 列表 -->
          <div v-else class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
            <table class="w-full text-sm">
              <thead class="bg-stone-50 dark:bg-zinc-800 text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              <tr>
                <th class="px-4 py-3 text-left w-14">預覽</th>
                <th class="px-4 py-3 text-left">檔名</th>
                <th class="px-4 py-3 text-left hidden sm:table-cell">位置</th>
                <th class="px-4 py-3 text-center hidden md:table-cell">大小</th>
                <th class="px-4 py-3 text-center hidden lg:table-cell">上傳時間</th>
                <th class="px-4 py-3 text-center">操作</th>
              </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
              <tr v-for="img in filteredImages" :key="img.url"
                  class="hover:bg-stone-50 dark:hover:bg-zinc-700/30 transition-colors cursor-grab"
                  draggable="true"
                  @dragstart="onDragStart(img)"
                  @dragend="dragging = null">
                <td class="px-4 py-2">
                  <div class="w-12 h-12 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden flex items-center justify-center bg-stone-100 dark:bg-zinc-800 cursor-pointer" @click="previewImg = img">
                    <img v-if="isImage(img.fileName)" :src="imgUrl(img.url)" :alt="img.originalName" class="w-full h-full object-cover" loading="lazy" />
                    <img v-else-if="img.coverUrl" :src="imgUrl(img.coverUrl)" class="w-full h-full object-cover" loading="lazy" />
                    <span v-else class="text-2xl">{{ fileEmoji(img.fileName) }}</span>
                  </div>
                </td>
                <td class="px-4 py-2">
                  <p class="font-medium text-stone-800 dark:text-stone-100 truncate max-w-48">{{ img.displayName || img.originalName }}</p>
                  <p v-if="img.displayName" class="text-xs text-stone-400 truncate max-w-48">{{ img.originalName }}</p>
                </td>
                <td class="px-4 py-2 hidden sm:table-cell">
                  <span class="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{{ img.folder }}</span>
                </td>
                <td class="px-4 py-2 text-center text-stone-500 hidden md:table-cell">{{ formatSize(img.size) }}</td>
                <td class="px-4 py-2 text-center text-stone-400 text-xs hidden lg:table-cell">{{ formatDate(img.uploadTime) }}</td>
                <td class="px-4 py-2">
                  <div class="flex items-center justify-center gap-1">
                    <button @click="copyUrl(img)" title="複製" class="p-1.5 text-stone-400 hover:text-indigo-600 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
                    <a :href="imgUrl(img.url)" :download="img.originalName" title="下載" class="p-1.5 text-stone-400 hover:text-indigo-600 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></a>
                    <button @click="openMoveModal(img)" title="移動" class="p-1.5 text-stone-400 hover:text-indigo-600 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg></button>
                    <button @click="openEditModal(img)" title="編輯" class="p-1.5 text-stone-400 hover:text-amber-500 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                    <button @click="confirmDelete(img)" class="p-1.5 text-stone-300 hover:text-red-400 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <!-- 大圖預覽 -->
    <div v-if="previewImg" class="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" @click.self="previewImg = null">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-stone-800 dark:text-stone-100 truncate">{{ previewImg.displayName || previewImg.originalName }}</p>
            <p class="text-xs text-stone-400 mt-0.5">{{ previewImg.folder }} · {{ formatSize(previewImg.size) }}</p>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <button @click="copyUrl(previewImg)" class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              複製連結
            </button>
            <a :href="imgUrl(previewImg.url)" :download="previewImg.originalName" class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-100 dark:bg-zinc-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-200 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              下載
            </a>
            <button @click="previewImg = null" class="p-1.5 text-stone-400 hover:text-stone-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-auto p-4 flex items-center justify-center bg-stone-50 dark:bg-zinc-800">
          <img v-if="isImage(previewImg.fileName)" :src="imgUrl(previewImg.url)" :alt="previewImg.originalName" class="max-w-full max-h-[60vh] object-contain rounded-xl" />
          <div v-else-if="previewImg.coverUrl" class="flex flex-col items-center gap-4">
            <img :src="imgUrl(previewImg.coverUrl)" class="max-w-full max-h-[55vh] object-contain rounded-xl shadow-md" />
            <a :href="imgUrl(previewImg.url)" :download="previewImg.originalName" class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              下載 {{ fileExt(previewImg.fileName) }} 檔案
            </a>
          </div>
          <div v-else class="flex flex-col items-center gap-4 py-12">
            <span class="text-7xl">{{ fileEmoji(previewImg.fileName) }}</span>
            <p class="text-stone-600 dark:text-stone-300 font-medium">{{ previewImg.displayName || previewImg.originalName }}</p>
            <a :href="imgUrl(previewImg.url)" :download="previewImg.originalName" class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              下載檔案
            </a>
          </div>
        </div>
        <div class="px-4 py-3 border-t border-stone-200 dark:border-stone-700 flex items-center gap-2">
          <input :value="fullUrl(previewImg.url)" readonly class="flex-1 text-xs font-mono bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 text-stone-600 dark:text-stone-300 outline-none" />
          <button @click="copyUrl(previewImg)" class="px-3 py-2 text-xs bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-300 transition-colors flex-shrink-0">{{ copied ? '✓ 已複製' : '複製' }}</button>
        </div>
        <!-- 手機操作列 -->
        <div class="sm:hidden px-4 py-3 border-t border-stone-200 dark:border-stone-700 flex items-center justify-around gap-2">
          <button @click="openMoveModal(previewImg); previewImg = null"
                  class="flex flex-col items-center gap-1 text-xs text-stone-500 dark:text-stone-400 hover:text-indigo-600 transition-colors px-3 py-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            移動
          </button>
          <button @click="openEditModal(previewImg); previewImg = null"
                  class="flex flex-col items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors px-3 py-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            編輯
          </button>
          <button @click="confirmDelete(previewImg); previewImg = null"
                  class="flex flex-col items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors px-3 py-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            刪除
          </button>
        </div>
      </div>
    </div>

    <!-- 編輯 Modal -->
    <div v-if="editModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">編輯檔案</h3>
          <button @click="editModal.show = false" class="text-stone-400 hover:text-stone-600 p-1"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <p class="text-xs text-stone-400 mb-3 truncate">原始檔名：{{ editModal.img?.originalName }}</p>
        <div class="mb-4">
          <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">顯示名稱</label>
          <input v-model="editModal.displayName" :placeholder="editModal.img?.originalName"
                 class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400" />
          <p class="text-xs text-stone-400 mt-1">留空則使用原始檔名</p>
        </div>
        <div v-if="editModal.img && !isImage(editModal.img.fileName)" class="mb-4">
          <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-2">封面圖</label>
          <div class="flex items-start gap-3">
            <div class="w-20 h-20 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-700 overflow-hidden flex items-center justify-center bg-stone-50 dark:bg-zinc-800 flex-shrink-0">
              <img v-if="editModal.coverPreview || (editModal.img?.coverUrl && !editModal.removeCover)" :src="editModal.coverPreview || imgUrl(editModal.img.coverUrl)" class="w-full h-full object-cover" />
              <span v-else class="text-3xl">{{ fileEmoji(editModal.img?.fileName) }}</span>
            </div>
            <div class="flex-1 space-y-2">
              <label class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer w-fit">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                選擇封面圖
                <input type="file" accept="image/*" class="hidden" @change="onCoverSelect" />
              </label>
              <button v-if="(editModal.img?.coverUrl && !editModal.removeCover) || editModal.coverPreview"
                      @click="editModal.removeCover = true; editModal.coverPreview = ''; editModal.coverFile = null"
                      class="text-xs text-red-400 hover:text-red-500 transition-colors block">移除封面圖</button>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="editModal.show = false" class="flex-1 py-2 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="saveEdit" class="flex-1 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors">儲存</button>
        </div>
      </div>
    </div>

    <!-- 重新命名資料夾 Modal -->
    <div v-if="renameFolderModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-1">重新命名資料夾</h3>
        <p class="text-xs text-stone-400 mb-4">原名稱：{{ renameFolderModal.oldName }}</p>
        <input v-model="renameFolderModal.newName" placeholder="新名稱" @keydown.enter="doRenameFolder"
               class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400 mb-4" />
        <div class="flex gap-2">
          <button @click="renameFolderModal.show = false" class="flex-1 py-2 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="doRenameFolder" :disabled="!renameFolderModal.newName.trim()" class="flex-1 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors">重新命名</button>
        </div>
      </div>
    </div>

    <!-- 新增資料夾 Modal -->
    <div v-if="addFolderModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-4">
          {{ addFolderModal.parent ? `在「${addFolderModal.parent}」下新增子資料夾` : '新增資料夾' }}
        </h3>
        <input v-model="addFolderModal.name" placeholder="資料夾名稱" @keydown.enter="addFolder"
               class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-indigo-400 mb-4" />
        <div class="flex gap-2">
          <button @click="addFolderModal.show = false" class="flex-1 py-2 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="addFolder" :disabled="!addFolderModal.name.trim()" class="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">建立</button>
        </div>
      </div>
    </div>

    <!-- 移動 Modal -->
    <div v-if="moveModal.show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">移動檔案</h3>
          <button @click="moveModal.show = false" class="text-stone-400 hover:text-stone-600 p-1"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-4 truncate">{{ moveModal.img?.originalName }}</p>
        <div class="space-y-1 max-h-56 overflow-y-auto mb-4">
          <button v-for="path in allFolderPaths.filter(p => p !== moveModal.img?.folder)" :key="path"
                  @click="moveModal.target = path"
                  :class="moveModal.target === path ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-800'"
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors text-left">
            <svg class="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            {{ path }}
          </button>
        </div>
        <div class="flex gap-2">
          <button @click="moveModal.show = false" class="flex-1 py-2 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="doMove" :disabled="!moveModal.target" class="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">移動</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show" class="fixed bottom-6 right-6 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import {ref, computed, reactive, onMounted} from 'vue'
import {useCommonStore} from '~/stores/common.js'
import FolderTreeNode from '~/components/FolderTreeNode.vue'

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/images')

const apiOnline = ref(false)
const loading = ref(false)
const uploading = ref(false)
const sidebarOpen = ref(false)
const folderTree = ref([])
const selectedPath = ref('全部')
const images = ref([])
const searchText = ref('')
const viewMode = ref('grid')
const previewImg = ref(null)
const copied = ref(false)
const toast = reactive({show: false, message: ''})

const addFolderModal = reactive({show: false, parent: null, name: ''})
const renameFolderModal = reactive({show: false, oldPath: '', oldName: '', newName: ''})
const moveModal = reactive({show: false, img: null, target: ''})
const editModal = reactive({
  show: false,
  img: null,
  displayName: '',
  coverFile: null,
  coverPreview: '',
  removeCover: false
})

const filteredImages = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  return q ? images.value.filter(i => (i.displayName || i.originalName).toLowerCase().includes(q) || i.folder.toLowerCase().includes(q)) : images.value
})

const allFolderPaths = computed(() => {
  const paths = []
  const collect = (nodes) => {
    for (const n of nodes) {
      paths.push(n.path);
      if (n.children?.length) collect(n.children)
    }
  }
  collect(folderTree.value)
  return paths
})

const imgUrl = (path) => {
  if (!path || path.startsWith('http')) return path
  const encoded = path.split('/').map(seg => encodeURIComponent(seg)).join('/')
  return BASE.value.replace('/holy/images', '') + encoded
}
const fullUrl = (path) => imgUrl(path)

const fetchFolders = async () => {
  try {
    const res = await fetch(`${BASE.value}/folders`)
    if (!res.ok) throw new Error()
    folderTree.value = await res.json()
    apiOnline.value = true
  } catch {
    apiOnline.value = false
  }
}

const fetchImages = async () => {
  loading.value = true
  try {
    const folder = selectedPath.value === '全部' ? '' : selectedPath.value
    const res = await fetch(`${BASE.value}/list?folder=${encodeURIComponent(folder)}`)
    if (!res.ok) throw new Error()
    images.value = await res.json()
  } catch {
    images.value = []
  } finally {
    loading.value = false
  }
}

const selectFolder = async (path) => {
  selectedPath.value = path
  sidebarOpen.value = false  // 手機選完資料夾自動收起
  await fetchImages()
}

const openAddFolder = (parent) => {
  addFolderModal.parent = parent;
  addFolderModal.name = '';
  addFolderModal.show = true
}
const addFolder = async () => {
  if (!addFolderModal.name.trim()) return
  const parent = addFolderModal.parent || ''
  const name = addFolderModal.name.trim()
  const fullPath = parent ? `${parent}/${name}` : name
  try {
    // 同時支援 @RequestBody 和 @RequestParam 兩種後端寫法
    const res = await fetch(
      `${BASE.value}/folders/add?parentPath=${encodeURIComponent(parent)}&name=${encodeURIComponent(name)}`,
      {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(fullPath)}
    )
    if (!res.ok) throw new Error()
    await fetchFolders();
    addFolderModal.show = false;
    showToast('資料夾已建立')
  } catch {
    showToast('建立失敗')
  }
}

const confirmDeleteFolder = async (path) => {
  if (!confirm(`確定刪除「${path}」及其所有內容？`)) return
  try {
    await fetch(`${BASE.value}/folders/remove`, {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(path)
    })
    await fetchFolders()
    if (selectedPath.value === path || selectedPath.value.startsWith(path + '/')) selectedPath.value = '全部'
    await fetchImages();
    showToast('資料夾已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

const openRenameFolder = (path, name) => {
  renameFolderModal.oldPath = path;
  renameFolderModal.oldName = name;
  renameFolderModal.newName = name;
  renameFolderModal.show = true
}
const doRenameFolder = async () => {
  const {oldPath, newName} = renameFolderModal
  if (!newName.trim() || newName.trim() === renameFolderModal.oldName) {
    renameFolderModal.show = false;
    return
  }
  try {
    const res = await fetch(`${BASE.value}/folders/rename?oldPath=${encodeURIComponent(oldPath)}&newName=${encodeURIComponent(newName.trim())}`, {method: 'POST'})
    if (!res.ok) throw new Error()
    const newPath = await res.json()
    if (selectedPath.value === oldPath || selectedPath.value.startsWith(oldPath + '/')) selectedPath.value = selectedPath.value.replace(oldPath, newPath)
    await fetchFolders();
    await fetchImages();
    renameFolderModal.show = false;
    showToast('已重新命名')
  } catch {
    showToast('重新命名失敗')
  }
}

const moveFolderUp = (path) => moveFolder(path, -1)
const moveFolderDown = (path) => moveFolder(path, 1)
const moveFolder = async (path, dir) => {
  const parentPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
  const siblings = getSiblings(folderTree.value, parentPath)
  const idx = siblings.findIndex(n => n.path === path)
  const swapIdx = idx + dir
  if (swapIdx < 0 || swapIdx >= siblings.length) return
  const newOrder = siblings.map(n => n.path);
  [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
  try {
    await fetch(`${BASE.value}/folders/sort`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(newOrder)
    })
    await fetchFolders()
  } catch {
    showToast('排序失敗')
  }
}
const getSiblings = (nodes, parentPath) => {
  if (!parentPath) return nodes
  for (const n of nodes) {
    if (n.path === parentPath) return n.children || []
    if (parentPath.startsWith(n.path + '/')) {
      const r = getSiblings(n.children || [], parentPath);
      if (r.length) return r
    }
  }
  return []
}

const handleUpload = async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return
  uploading.value = true
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  const folder = selectedPath.value === '全部' ? '未分類' : selectedPath.value
  try {
    const res = await fetch(`${BASE.value}/upload?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      body: formData
    })
    if (!res.ok) throw new Error()
    await fetchImages();
    showToast(`已上傳 ${files.length} 個檔案`)
  } catch {
    showToast('上傳失敗')
  } finally {
    uploading.value = false;
    e.target.value = ''
  }
}

const confirmDelete = async (img) => {
  if (!confirm(`確定刪除「${img.originalName}」？`)) return
  try {
    await fetch(`${BASE.value}/remove?folder=${encodeURIComponent(img.folder)}&fileName=${encodeURIComponent(img.fileName)}`, {method: 'DELETE'})
    images.value = images.value.filter(i => !(i.fileName === img.fileName && i.folder === img.folder))
    if (previewImg.value?.fileName === img.fileName) previewImg.value = null
    showToast('已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

const openMoveModal = (img) => {
  moveModal.img = img;
  moveModal.target = '';
  moveModal.show = true
}
const doMove = async () => {
  if (!moveModal.target || !moveModal.img) return
  try {
    const res = await fetch(`${BASE.value}/move?fromFolder=${encodeURIComponent(moveModal.img.folder)}&toFolder=${encodeURIComponent(moveModal.target)}&fileName=${encodeURIComponent(moveModal.img.fileName)}`, {method: 'POST'})
    if (!res.ok) throw new Error()
    images.value = images.value.filter(i => !(i.fileName === moveModal.img.fileName && i.folder === moveModal.img.folder))
    if (previewImg.value?.fileName === moveModal.img.fileName && previewImg.value?.folder === moveModal.img.folder) previewImg.value = null
    moveModal.show = false
    showToast(`已移動到「${moveModal.target}」`)
  } catch {
    showToast('移動失敗')
  }
}

const openEditModal = (img) => {
  editModal.img = img;
  editModal.displayName = img.displayName || '';
  editModal.coverFile = null;
  editModal.coverPreview = '';
  editModal.removeCover = false;
  editModal.show = true
}
const onCoverSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return
  editModal.coverFile = file;
  editModal.removeCover = false;
  editModal.coverPreview = URL.createObjectURL(file);
  e.target.value = ''
}
const saveEdit = async () => {
  const img = editModal.img
  try {
    await fetch(`${BASE.value}/rename?folder=${encodeURIComponent(img.folder)}&fileName=${encodeURIComponent(img.fileName)}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(editModal.displayName)
    })
    img.displayName = editModal.displayName
    if (editModal.coverFile) {
      const fd = new FormData();
      fd.append('cover', editModal.coverFile)
      const res = await fetch(`${BASE.value}/cover?folder=${encodeURIComponent(img.folder)}&fileName=${encodeURIComponent(img.fileName)}`, {
        method: 'POST',
        body: fd
      })
      img.coverUrl = (await res.json()) + '?t=' + Date.now()
    } else if (editModal.removeCover && img.coverUrl) {
      await fetch(`${BASE.value}/cover?folder=${encodeURIComponent(img.folder)}&fileName=${encodeURIComponent(img.fileName)}`, {method: 'DELETE'})
      img.coverUrl = ''
    }
    editModal.show = false;
    showToast('已更新')
  } catch {
    showToast('更新失敗')
  }
}

const copyUrl = async (img) => {
  try {
    await navigator.clipboard.writeText(fullUrl(img.url));
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
    showToast('連結已複製')
  } catch {
    showToast('複製失敗')
  }
}

const dragging = ref(null)
const dropTarget = ref(null)
const isDragOverUpload = ref(false)

const onDropUpload = async (e) => {
  isDragOverUpload.value = false
  // 如果是從卡片拖曳（移動檔案），不當作上傳
  if (dragging.value) return
  const files = Array.from(e.dataTransfer.files)
  if (!files.length) return
  uploading.value = true
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  const folder = selectedPath.value === '全部' ? '未分類' : selectedPath.value
  try {
    const res = await fetch(`${BASE.value}/upload?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      body: formData
    })
    if (!res.ok) throw new Error()
    await fetchImages()
    showToast(`已上傳 ${files.length} 個檔案到「${folder}」`)
  } catch {
    showToast('上傳失敗')
  } finally {
    uploading.value = false
  }
}

const onDragStart = (img) => {
  dragging.value = img
}

const onDropToFolder = async (folderPath) => {
  const img = dragging.value
  dragging.value = null
  if (!img || img.folder === folderPath) return
  try {
    const res = await fetch(`${BASE.value}/move?fromFolder=${encodeURIComponent(img.folder)}&toFolder=${encodeURIComponent(folderPath)}&fileName=${encodeURIComponent(img.fileName)}`, {method: 'POST'})
    if (!res.ok) throw new Error()
    // 直接更新前端，不 refetch（避免 race condition）
    images.value = images.value.filter(i => !(i.fileName === img.fileName && i.folder === img.folder))
    if (previewImg.value?.fileName === img.fileName && previewImg.value?.folder === img.folder) previewImg.value = null
    showToast(`已移動到「${folderPath}」`)
  } catch {
    showToast('移動失敗')
  }
}

const isImage = (fn) => fn && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fn.split('.').pop().toLowerCase())
const fileExt = (fn) => fn ? fn.split('.').pop().toUpperCase() : ''
const fileEmoji = (fn) => {
  if (!fn) return '📄';
  const e = fn.split('.').pop().toLowerCase()
  if (['xlsx', 'xls'].includes(e)) return '📊';
  if (['docx', 'doc'].includes(e)) return '📝'
  if (['pptx', 'ppt'].includes(e)) return '📋';
  if (e === 'pdf') return '📕';
  if (e === 'txt') return '📃';
  return '📄'
}
const formatSize = (b) => !b ? '—' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`
const formatDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
const showToast = (msg) => {
  toast.message = msg;
  toast.show = true;
  setTimeout(() => toast.show = false, 2500)
}

onMounted(async () => {
  await fetchFolders();
  await fetchImages()
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
