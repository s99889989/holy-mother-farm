<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">

    <!-- ── Header ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="max-w-6xl mx-auto flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center text-white text-base font-bold flex-shrink-0">🧯</div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-base sm:text-lg">滅火器巡檢管理</h1>
            <p class="text-sm text-hint-c mt-0.5 hidden sm:block">Fire Extinguisher Registry &amp; Inspection Records</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button :title="darkStore.data.display_name"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-light-c text-hint-c hover-surface2 transition-colors"
                  @click="toggleDark">
            <svg v-if="!isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
            </svg>
          </button>
          <template v-if="activeTab === 'registry'">
            <button
              v-if="usingSeed"
              :disabled="importing"
              class="px-3 py-1.5 rounded-lg border border-amber-400 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              style="font-size:14px"
              @click="importSeed"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
              {{ importing ? '匯入中...' : '匯入種子資料' }}
            </button>
            <button
              class="px-3 py-1.5 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 transition-colors flex items-center gap-1.5"
              style="font-size:14px"
              @click="openModal(null)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              新增滅火器
            </button>
          </template>
        </div>
      </div>

      <!-- 頁籤 -->
      <div class="max-w-6xl mx-auto flex gap-2 mb-2">
        <button
          @click="activeTab = 'registry'"
          class="px-4 py-1.5 rounded-lg font-semibold transition-colors"
          :class="activeTab === 'registry' ? 'bg-red-700 text-white' : 'bg-surface2 text-muted-c hover-surface2'"
          style="font-size:14px"
        >滅火器清冊</button>
        <button
          @click="activeTab = 'records'"
          class="px-4 py-1.5 rounded-lg font-semibold transition-colors"
          :class="activeTab === 'records' ? 'bg-red-700 text-white' : 'bg-surface2 text-muted-c hover-surface2'"
          style="font-size:14px"
        >巡檢紀錄<span v-if="pendingCount" class="ml-1.5 inline-flex items-center justify-center rounded-full bg-white/25 px-1.5" style="font-size:11px">{{ pendingCount }}</span></button>
      </div>

      <!-- 統計 -->
      <div v-if="activeTab === 'registry'" class="max-w-6xl mx-auto flex flex-wrap items-center gap-2">
        <span class="badge-stat">共 {{ items.length }} 支</span>
        <span v-for="f in floorCounts" :key="f.floor" class="badge-stat">{{ f.floor }} · {{ f.count }} 支</span>
        <span v-if="usingSeed" class="text-amber-600 dark:text-amber-400" style="font-size:13px">
          ⚠ 目前顯示的是本機種子資料,尚未寫入後端,請按「匯入種子資料」
        </span>
      </div>
      <div v-else class="max-w-6xl mx-auto flex flex-wrap gap-2">
        <span class="badge-stat">共 {{ logs.length }} 筆紀錄</span>
        <span class="badge-stat text-red-700 dark:text-red-300">待處理 {{ countByStatus('待處理') }}</span>
        <span class="badge-stat text-amber-700 dark:text-amber-300">送修中 {{ countByStatus('送修中') }}</span>
        <span class="badge-stat">已更換 {{ countByStatus('已更換') }}</span>
      </div>
    </header>

    <div class="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4">

      <!-- ══════════════════ 滅火器清冊 ══════════════════ -->
      <template v-if="activeTab === 'registry'">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <button
            class="flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            :class="activeFloor === null
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold'
              : 'bg-surface2 text-muted-c hover-surface2'"
            style="font-size:14px"
            @click="activeFloor = null"
          >全部樓層</button>
          <button
            v-for="floor in floors" :key="floor"
            class="flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            :class="activeFloor === floor
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold'
              : 'bg-surface2 text-muted-c hover-surface2'"
            style="font-size:14px"
            @click="activeFloor = floor"
          >{{ floor }}</button>

          <label class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface2 text-muted-c whitespace-nowrap cursor-pointer" style="font-size:14px">
            <input type="checkbox" v-model="showInactive" @change="fetchItems">
            顯示已停用
          </label>

          <div class="flex-shrink-0 flex gap-1 bg-surface2 rounded-lg p-1">
            <button
              @click="registryView = 'list'"
              class="px-3 py-1 rounded-md transition-colors"
              :class="registryView === 'list' ? 'bg-surface text-base-c font-semibold shadow-sm' : 'text-muted-c'"
              style="font-size:13px"
            >清單</button>
            <button
              @click="registryView = 'plan'"
              class="px-3 py-1 rounded-md transition-colors"
              :class="registryView === 'plan' ? 'bg-surface text-base-c font-semibold shadow-sm' : 'text-muted-c'"
              style="font-size:13px"
            >平面圖</button>
          </div>

          <div class="relative ml-auto w-full sm:w-64">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input
              v-model="searchText"
              placeholder="搜尋編號、位置或批號..."
              class="w-full pl-9 pr-8 py-1.5 text-base rounded-xl border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-red-500"
            />
            <button v-if="searchText" @click="searchText = ''" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-hint-c hover:text-muted-c">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- 平面圖檢視 -->
        <template v-if="registryView === 'plan'">
          <p v-if="!activeFloor" class="bg-surface rounded-2xl border border-light-c px-4 py-10 text-center text-hint-c shadow-sm" style="font-size:15px">
            請先在上面選一個樓層,才看得到平面圖
          </p>
          <template v-else>
            <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden mb-4">
              <img :src="`/fire-plans/${activeFloor}.jpg`" :alt="`${activeFloor} 平面圖`" class="w-full block" />
            </div>
            <div class="bg-surface rounded-2xl border border-light-c shadow-sm p-4">
              <p class="text-hint-c mb-2" style="font-size:13px">{{ activeFloor }} 滅火器一覽(對照圖上圖示位置)</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="item in filtered" :key="item.id" class="badge-stat font-mono">{{ item.code }} · {{ item.location }}</span>
              </div>
            </div>
          </template>
        </template>

        <!-- 清單檢視 -->
        <template v-else>
          <p v-if="loading" class="text-hint-c text-center py-10" style="font-size:15px">載入中...</p>

          <template v-else>
            <p v-if="filtered.length === 0" class="bg-surface rounded-2xl border border-light-c px-4 py-10 text-center text-hint-c shadow-sm" style="font-size:15px">
              找不到符合的滅火器
            </p>

            <div v-else class="hidden md:block bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
              <table class="w-full">
                <thead>
                <tr class="bg-surface2 border-b border-light-c text-hint-c" style="font-size:13px">
                  <th class="text-left px-4 py-2.5 font-semibold">項次</th>
                  <th class="text-left px-4 py-2.5 font-semibold">編號</th>
                  <th class="text-left px-4 py-2.5 font-semibold">位置</th>
                  <th class="text-left px-4 py-2.5 font-semibold">批號</th>
                  <th class="text-left px-4 py-2.5 font-semibold">狀態</th>
                  <th class="text-right px-4 py-2.5 font-semibold">操作</th>
                </tr>
                </thead>
                <tbody class="divide-y divide-base">
                <tr v-for="(item, idx) in filtered" :key="item.id" class="hover-surface2 transition-colors" :class="{ 'opacity-50': item.active === false }">
                  <td class="px-4 py-2.5 text-hint-c" style="font-size:14px">{{ idx + 1 }}</td>
                  <td class="px-4 py-2.5 font-mono font-semibold text-base-c" style="font-size:14px">{{ item.code }}</td>
                  <td class="px-4 py-2.5 text-muted-c" style="font-size:14px">{{ item.location }}</td>
                  <td class="px-4 py-2.5 text-hint-c font-mono" style="font-size:14px">{{ item.batchNo }}</td>
                  <td class="px-4 py-2.5">
                    <span v-if="item.active === false" class="badge bad">已停用</span>
                    <span v-else class="badge ok">使用中</span>
                  </td>
                  <td class="px-4 py-2.5 text-right whitespace-nowrap">
                    <template v-if="item.active === false">
                      <button class="text-green-700 dark:text-green-400 hover:underline" style="font-size:14px" @click="restoreItem(item)">還原</button>
                    </template>
                    <template v-else>
                      <button class="text-blue-700 dark:text-blue-400 hover:underline mr-3" style="font-size:14px" @click="openModal(item)">編輯</button>
                      <button class="text-red-700 dark:text-red-400 hover:underline" style="font-size:14px" @click="removeItem(item)">停用</button>
                    </template>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <div v-if="filtered.length" class="md:hidden space-y-2">
              <div v-for="item in filtered" :key="item.id"
                   class="bg-surface rounded-xl border border-light-c px-4 py-3 shadow-sm" :class="{ 'opacity-50': item.active === false }">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="font-mono font-semibold text-base-c" style="font-size:15px">{{ item.code }}</p>
                      <span v-if="item.active === false" class="badge bad">已停用</span>
                    </div>
                    <p class="text-muted-c mt-0.5" style="font-size:14px">{{ item.location }}</p>
                    <p class="text-hint-c font-mono mt-0.5" style="font-size:13px">批號 {{ item.batchNo }}</p>
                  </div>
                  <div class="flex flex-col items-end gap-1 flex-shrink-0">
                    <template v-if="item.active === false">
                      <button class="text-green-700 dark:text-green-400" style="font-size:14px" @click="restoreItem(item)">還原</button>
                    </template>
                    <template v-else>
                      <button class="text-blue-700 dark:text-blue-400" style="font-size:14px" @click="openModal(item)">編輯</button>
                      <button class="text-red-700 dark:text-red-400" style="font-size:14px" @click="removeItem(item)">停用</button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>
      </template>

      <!-- ══════════════════ 巡檢紀錄 ══════════════════ -->
      <template v-else>
        <div class="section-title">異常追蹤看板 <span class="tag">直接按按鈕換狀態,不用拖拉</span></div>
        <div class="kanban">
          <div v-for="col in kanbanCols" :key="col.key" class="kanban-col">
            <h4>{{ col.label }}<span>{{ col.items.length }}</span></h4>
            <div v-for="log in col.items" :key="log.id" class="issue-card" :class="'col-' + col.key">
              <div class="id">{{ log.code }}</div>
              <div class="desc">{{ log.note || '（無說明）' }}</div>
              <div class="meta">{{ log.inspectedAt }}<span v-if="log.inspector"> · {{ log.inspector }}</span></div>
              <div class="issue-actions">
                <button v-for="next in nextStatuses(col.key)" :key="next" @click="changeStatus(log, next)">{{ next }}</button>
              </div>
            </div>
            <p v-if="!col.items.length" class="empty-hint">沒有項目</p>
          </div>
        </div>

        <div class="section-title" style="margin-top:28px;">全部巡檢紀錄
          <span class="tag">{{ filteredLogs.length }} / {{ logs.length }} 筆</span>
        </div>

        <div class="flex flex-wrap gap-2 mb-3">
          <input v-model="recordsSearch" placeholder="搜尋編號..." class="search-input">
          <select v-model="statusFilter" class="search-input" style="max-width:140px;">
            <option value="">全部狀態</option>
            <option v-for="s in ['正常','待處理','送修中','已更換','已報廢']" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <p v-if="logsLoading" class="text-hint-c text-center py-10" style="font-size:15px">載入中...</p>
        <div v-else class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
          <table class="w-full">
            <thead>
            <tr class="bg-surface2 border-b border-light-c text-hint-c" style="font-size:13px">
              <th class="text-left px-4 py-2.5 font-semibold">時間</th>
              <th class="text-left px-4 py-2.5 font-semibold">編號</th>
              <th class="text-left px-4 py-2.5 font-semibold">檢查人</th>
              <th class="text-left px-4 py-2.5 font-semibold">說明</th>
              <th class="text-left px-4 py-2.5 font-semibold">照片</th>
              <th class="text-left px-4 py-2.5 font-semibold">狀態</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-base">
            <tr v-for="log in filteredLogs" :key="log.id" class="hover-surface2 transition-colors">
              <td class="px-4 py-2.5 font-mono text-hint-c" style="font-size:14px">{{ log.inspectedAt }}</td>
              <td class="px-4 py-2.5 font-mono font-semibold text-base-c" style="font-size:14px">{{ log.code }}</td>
              <td class="px-4 py-2.5 text-muted-c" style="font-size:14px">{{ log.inspector || '—' }}</td>
              <td class="px-4 py-2.5 text-muted-c" style="font-size:14px">{{ log.note || '—' }}</td>
              <td class="px-4 py-2.5">
                <a v-if="log.photoUrl" :href="log.photoUrl" target="_blank" class="text-blue-700 dark:text-blue-400 hover:underline" style="font-size:14px">查看</a>
                <span v-else class="text-hint-c" style="font-size:14px">—</span>
              </td>
              <td class="px-4 py-2.5"><span class="badge" :class="badgeClass(log.status)">{{ log.status }}</span></td>
            </tr>
            <tr v-if="!filteredLogs.length"><td colspan="6" class="px-4 py-8 text-center text-hint-c" style="font-size:14px">沒有符合的紀錄</td></tr>
            </tbody>
          </table>
        </div>
      </template>

    </div>

    <!-- ── 新增/編輯滅火器 Modal ── -->
    <transition name="fade">
      <div v-if="modal.show" class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" @click.self="modal.show = false">
        <div class="bg-surface rounded-2xl border border-light-c shadow-lg w-full max-w-sm p-5">
          <h2 class="font-bold text-base-c mb-4" style="font-size:17px">{{ modal.isNew ? '新增滅火器' : '編輯滅火器' }}</h2>

          <div class="space-y-3">
            <div>
              <label class="text-hint-c block mb-1" style="font-size:13px">編號</label>
              <input v-model="modal.data.code" placeholder="例如 D區1F-A01"
                     class="w-full px-3 py-2 text-base rounded-lg border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-red-500 font-mono" />
            </div>
            <div>
              <label class="text-hint-c block mb-1" style="font-size:13px">位置</label>
              <input v-model="modal.data.location" placeholder="例如 服務中心"
                     class="w-full px-3 py-2 text-base rounded-lg border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label class="text-hint-c block mb-1" style="font-size:13px">批號</label>
              <input v-model="modal.data.batchNo" placeholder="例如 FE-130104"
                     class="w-full px-3 py-2 text-base rounded-lg border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-red-500 font-mono" />
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button class="flex-1 py-2 rounded-lg border border-light-c text-muted-c hover-surface2 transition-colors" style="font-size:15px" @click="modal.show = false">取消</button>
            <button class="flex-1 py-2 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 transition-colors" style="font-size:15px" @click="saveItem">儲存</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── Toast ── -->
    <transition name="fade">
      <div v-if="toast.show" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-light-c shadow-lg rounded-xl px-4 py-2.5 text-base-c z-50 flex items-center gap-2" style="font-size:14px">
        <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'management.fire-extinguisher' })

import { ref, reactive, computed, onMounted } from 'vue'

// ── Dark Mode ─────────────────────────────────────────────────────
const darkStore = useDarkModeStore()
const isDark = computed(() => darkStore.data.dark)
const toggleDark = () => { darkStore.change_dark_mode() }

// ── 頁籤 ─────────────────────────────────────────────────────────
const activeTab = ref('registry') // 'registry' | 'records'
const registryView = ref('list')  // 'list' | 'plan'

// ── API ──────────────────────────────────────────────────────────
const commonStore = useCommonStore()
const API_BASE = computed(() => commonStore.data.main_url + '/holy/fire-extinguisher')
const INSPECTION_API_BASE = computed(() => API_BASE.value + '/inspection')

const toast = reactive({ show: false, message: '' })
const showToast = (msg) => {
  toast.message = msg
  toast.show = true
  setTimeout(() => { toast.show = false }, 2500)
}

// ════════════════════ 滅火器清冊 ════════════════════

// 種子資料(D 區實際清冊,API 尚未回傳前先顯示)
const seedItems = [
  { code: 'D區1F-A01', location: '服務中心', batchNo: 'FE-130104' },
  { code: 'D區1F-A02', location: '小舖內', batchNo: 'FE-130104' },
  { code: 'D區1F-A03', location: '香藥草教室', batchNo: 'FE-130104' },
  { code: 'D區1F-A04', location: '香藥草廁所', batchNo: 'FE-130104' },
  { code: 'D區1F-A05', location: '輔具正門', batchNo: 'FE-130104' },
  { code: 'D區1F-A06', location: '輔具側門', batchNo: 'FE-130104' },
  { code: 'D區1F-A07', location: '物管2號庫房', batchNo: 'FE-130104' },
  { code: 'D區1F-A08', location: '物管5號庫房', batchNo: 'FE-130104' },
  { code: 'D區1F-A09', location: '物管辦公室', batchNo: 'FE-130104' },
  { code: 'D區1F-A010', location: '電氣機房1', batchNo: 'FE-130104' },
  { code: 'D區1F-A011', location: '電氣機房2', batchNo: 'FE-130104' },
  { code: 'D區2F-A12', location: '電梯1', batchNo: 'FE-130104' },
  { code: 'D區2F-A13', location: '電梯2', batchNo: 'FE-130104' },
  { code: 'D區2F-A14', location: '多功能教室前', batchNo: 'FE-130104' },
  { code: 'D區2F-A15', location: '多功能教室後', batchNo: 'FE-130104' },
  { code: 'D區2F-A16', location: '庫房1', batchNo: 'FE-130104' },
  { code: 'D區2F-A17', location: '庫房2', batchNo: 'FE-130104' },
  { code: 'D區2F-A18', location: '評鑑教室1', batchNo: 'FE-130104' },
  { code: 'D區2F-A19', location: '評鑑教室2', batchNo: 'FE-130104' },
  { code: 'D區3F-A20', location: '長照辦公室1', batchNo: 'FE-130104' },
  { code: 'D區3F-A21', location: '長照辦公室2', batchNo: 'FE-130104' },
  { code: 'D區3F-A22', location: '中央製水機房1', batchNo: 'FE-130104' },
  { code: 'D區3F-A23', location: '中央製水機房2', batchNo: 'FE-130104' },
  { code: 'D區3F-A24', location: '庫房1', batchNo: 'FE-130104' },
  { code: 'D區3F-A25', location: '庫房2', batchNo: 'FE-130104' },
  { code: 'D區3F-A26', location: '電梯1', batchNo: 'FE-130104' },
  { code: 'D區BF-A27', location: '電梯2', batchNo: 'FE-130104' },
  { code: 'D區BF-A28', location: '庫房1', batchNo: 'FE-130104' },
  { code: 'D區BF-A29', location: '庫房2', batchNo: 'FE-130104' },
  { code: 'D區1F-A30', location: '輔具室內', batchNo: 'FE-130104' }
]

const items = ref([])
const loading = ref(true)
const usingSeed = ref(false)
const importing = ref(false)
const showInactive = ref(false)

const fetchItems = async () => {
  loading.value = true
  try {
    const list = await $fetch(`${API_BASE.value}/list`, {
      credentials: 'include',
      query: showInactive.value ? { includeInactive: true } : {}
    })
    if (Array.isArray(list) && list.length) {
      items.value = list
      usingSeed.value = false
    } else {
      items.value = seedItems
      usingSeed.value = true
    }
  } catch (e) {
    console.error(e)
    items.value = seedItems
    usingSeed.value = true
  } finally {
    loading.value = false
  }
}

const importSeed = async () => {
  importing.value = true
  try {
    const result = await $fetch(`${API_BASE.value}/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: seedItems
    })
    showToast(`匯入完成:新增 ${result?.added ?? 0} 筆,略過 ${result?.skipped ?? 0} 筆`)
    await fetchItems()
  } catch (e) {
    console.error(e)
    showToast('匯入失敗')
  } finally {
    importing.value = false
  }
}

const parseFloor = (code) => {
  const m = code?.match(/(\d+F|BF\d*|B\d+F?)/i)
  return m ? m[1].toUpperCase() : '未分類'
}

const floors = computed(() => {
  const set = new Set(items.value.map(i => parseFloor(i.code)))
  return [...set].sort()
})

const floorCounts = computed(() =>
  floors.value.map(floor => ({
    floor,
    count: items.value.filter(i => parseFloor(i.code) === floor).length
  }))
)

const activeFloor = ref(null)
const searchText = ref('')

const filtered = computed(() => {
  let list = items.value
  if (activeFloor.value) list = list.filter(i => parseFloor(i.code) === activeFloor.value)
  const q = searchText.value.trim().toLowerCase()
  if (q) {
    list = list.filter(i =>
      i.code?.toLowerCase().includes(q) ||
      i.location?.toLowerCase().includes(q) ||
      i.batchNo?.toLowerCase().includes(q)
    )
  }
  return list
})

const emptyItem = () => ({ code: '', location: '', batchNo: '' })
const modal = reactive({ show: false, isNew: true, data: emptyItem() })

const openModal = (item) => {
  modal.isNew = !item
  modal.data = item ? { ...item } : emptyItem()
  modal.show = true
}

const saveItem = async () => {
  if (!modal.data.code?.trim()) { showToast('請填寫編號'); return }
  try {
    if (modal.isNew) {
      const saved = await $fetch(`${API_BASE.value}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: modal.data
      })
      if (saved?.error) { showToast(saved.error); return }
      items.value.push(saved)
    } else {
      const updated = await $fetch(`${API_BASE.value}/update/${modal.data.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: modal.data
      })
      if (updated?.error) { showToast(updated.error); return }
      const idx = items.value.findIndex(i => i.id === modal.data.id)
      if (idx !== -1) items.value[idx] = updated
    }
    modal.show = false
    showToast(modal.isNew ? '新增成功' : '儲存成功')
  } catch (e) {
    console.error(e)
    showToast('儲存失敗')
  }
}

// 停用(軟刪除):資料還在,只是預設清冊不顯示,巡檢紀錄不會斷
const removeItem = async (item) => {
  if (!confirm(`確定要停用 ${item.code} 嗎?停用後預設清冊不會顯示,但巡檢歷史紀錄還查得到,之後也可以還原。`)) return
  try {
    await $fetch(`${API_BASE.value}/remove/${item.id}`, { method: 'DELETE' })
    if (showInactive.value) {
      item.active = false
    } else {
      items.value = items.value.filter(i => i.id !== item.id)
    }
    showToast('已停用')
  } catch (e) {
    console.error(e)
    showToast('停用失敗')
  }
}

const restoreItem = async (item) => {
  try {
    const updated = await $fetch(`${API_BASE.value}/restore/${item.id}`, { method: 'PUT' })
    const idx = items.value.findIndex(i => i.id === item.id)
    if (idx !== -1) items.value[idx] = updated
    showToast('已還原')
  } catch (e) {
    console.error(e)
    showToast('還原失敗')
  }
}

// ════════════════════ 巡檢紀錄 ════════════════════

const logs = ref([])
const logsLoading = ref(true)

const fetchLogs = async () => {
  logsLoading.value = true
  try {
    const data = await $fetch(`${INSPECTION_API_BASE.value}/list`, { credentials: 'include' })
    logs.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error(e)
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

const countByStatus = (status) => logs.value.filter(l => l.status === status).length
const pendingCount = computed(() => countByStatus('待處理'))

const kanbanCols = computed(() => [
  { key: 'todo',     label: '待處理', items: logs.value.filter(l => l.status === '待處理') },
  { key: 'doing',    label: '送修中', items: logs.value.filter(l => l.status === '送修中') },
  { key: 'replaced', label: '已更換', items: logs.value.filter(l => l.status === '已更換') },
  { key: 'scrapped', label: '已報廢', items: logs.value.filter(l => l.status === '已報廢') }
])

const nextStatuses = (colKey) => ({
  todo: ['送修中', '已更換', '已報廢'],
  doing: ['已更換', '已報廢'],
  replaced: [],
  scrapped: []
}[colKey] || [])

const changeStatus = async (log, next) => {
  try {
    await $fetch(`${INSPECTION_API_BASE.value}/status/${log.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: { status: next }
    })
    log.status = next
    showToast(`${log.code} 已更新為「${next}」`)
  } catch (e) {
    console.error(e)
    showToast('更新失敗')
  }
}

const recordsSearch = ref('')
const statusFilter = ref('')
const filteredLogs = computed(() => {
  let list = logs.value
  if (recordsSearch.value.trim()) {
    const q = recordsSearch.value.trim().toLowerCase()
    list = list.filter(l => l.code?.toLowerCase().includes(q))
  }
  if (statusFilter.value) list = list.filter(l => l.status === statusFilter.value)
  return list
})

const badgeClass = (status) => ({
  '正常': 'ok', '已更換': 'ok', '待處理': 'bad', '已報廢': 'muted', '送修中': 'warn'
}[status] || 'muted')

onMounted(() => { fetchItems(); fetchLogs() })
</script>

<style scoped>
.badge-stat {
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface2, #f0f1ec);
  color: var(--hint-c, #6b6f6a);
  border: 1px solid var(--border-light-c, #dadedb);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.section-title { font-size: 16px; font-weight: 700; margin: 0 0 12px; display: flex; align-items: center; gap: 10px; color: var(--base-c); }
.section-title .tag { font-size: 12px; color: var(--hint-c, #6b6f6a); font-weight: 500; }
.search-input { flex: 1; min-width: 160px; padding: 8px 12px; font-size: 14px; border-radius: 10px; border: 1px solid var(--border-light-c, #dadedb); background: var(--surface2, #f0f1ec); color: var(--base-c); }

.kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 900px) { .kanban { grid-template-columns: repeat(2, 1fr); } }
.kanban-col { background: var(--surface2, #f0f1ec); border-radius: 12px; padding: 10px; min-height: 90px; }
.kanban-col h4 { font-size: 13px; font-weight: 600; color: var(--hint-c, #6b6f6a); margin: 2px 6px 10px; display: flex; justify-content: space-between; }
.empty-hint { text-align: center; font-size: 12px; color: var(--hint-c, #6b6f6a); padding: 10px 0; }

.issue-card { background: var(--surface, #fff); border: 1px solid var(--border-light-c, #dadedb); border-left: 4px solid #C1272D; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
.issue-card.col-doing { border-left-color: #B4740E; }
.issue-card.col-replaced { border-left-color: #2F7D5C; }
.issue-card.col-scrapped { border-left-color: #8B8E88; }
.issue-card .id { font-family: monospace; font-size: 12px; color: var(--hint-c, #6b6f6a); font-weight: 600; }
.issue-card .desc { font-size: 13px; margin: 4px 0; color: var(--base-c); }
.issue-card .meta { font-size: 11px; color: var(--hint-c, #6b6f6a); }
.issue-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.issue-actions button { font-size: 11px; padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border-light-c, #dadedb); background: var(--surface, #fff); cursor: pointer; color: var(--base-c); }
.issue-actions button:hover { background: var(--surface2, #f0f1ec); }

.badge { display: inline-flex; align-items: center; font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: 999px; border: 1px solid transparent; }
.badge.ok { background: #E4F1EA; color: #2F7D5C; border-color: #9FCBB4; }
.badge.warn { background: #FCF0D9; color: #B4740E; border-color: #EFC97C; }
.badge.bad { background: #FBE8E7; color: #C1272D; border-color: #E7A6A2; }
.badge.muted { background: var(--surface2, #f0f1ec); color: var(--hint-c, #6b6f6a); border-color: var(--border-light-c, #dadedb); }
</style>
