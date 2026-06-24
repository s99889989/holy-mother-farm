<template>
  <div class="min-h-screen bg-surface2 transition-colors duration-300">
    <AdminNavbar />

    <!-- ── Header ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">客</div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">客戶帳號管理</h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">Customer Accounts</p>
          </div>
        </div>
        <span class="text-xs text-hint-c">共 {{ filtered.length }} 位客戶</span>
      </div>

      <!-- 搜尋 + 篩選 -->
      <div class="flex flex-wrap gap-2">
        <input v-model="searchText" placeholder="搜尋姓名、Email、電話…"
               class="flex-1 min-w-40 px-3 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400" />
        <select v-model="filterStatus"
                class="px-3 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">全部狀態</option>
          <option value="active">正常</option>
          <option value="blocked">已封鎖</option>
        </select>
        <select v-model="filterGroup"
                class="px-3 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">全部群組</option>
          <option v-for="g in permGroups" :key="g.id" :value="g.id">{{ g.label }}</option>
        </select>
      </div>
    </header>

    <div class="max-w-full px-3 sm:px-4 py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="flex items-center justify-center py-16 text-hint-c gap-2">
        <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        載入中…
      </div>

      <!-- 無資料 -->
      <div v-else-if="filtered.length === 0" class="text-center py-16 text-hint-c text-sm">
        {{ customers.length === 0 ? '尚無客戶資料' : '找不到符合條件的客戶' }}
      </div>

      <!-- 桌機表格 -->
      <div v-else class="hidden md:block bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
        <table class="w-full text-sm whitespace-nowrap">
          <thead class="bg-surface2 text-xs text-hint-c uppercase tracking-wide">
          <tr>
            <th class="px-3 py-3 text-left">客戶</th>
            <th class="px-3 py-3 text-left">Email</th>
            <th class="px-3 py-3 text-left">電話</th>
            <th class="px-3 py-3 text-center">權限群組</th>
            <th class="px-3 py-3 text-center">訂位</th>
            <th class="px-3 py-3 text-center">便當</th>
            <th class="px-3 py-3 text-left">建立時間</th>
            <th class="px-3 py-3 text-center">狀態</th>
            <th class="px-3 py-3 text-center">操作</th>
          </tr>
          </thead>
          <tbody class="divide-y divide-base">
          <tr v-for="c in filtered" :key="c.id"
              class="hover-surface2/30 transition-colors"
              :class="c.status === 'blocked' ? 'opacity-50' : ''">
            <!-- 客戶 -->
            <td class="px-3 py-2.5">
              <div class="flex items-center gap-2">
                <img v-if="c.picture" :src="c.picture" :alt="c.name"
                     class="w-8 h-8 rounded-full object-cover border border-light-c flex-shrink-0"/>
                <div v-else class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                  {{ c.name?.charAt(0) || '?' }}
                </div>
                <span class="font-medium text-base-c">{{ c.name }}</span>
              </div>
            </td>
            <td class="px-3 py-2.5 text-hint-c">{{ c.email }}</td>
            <td class="px-3 py-2.5 text-muted-c">{{ c.mobile || c.landline || '—' }}</td>
            <!-- 權限群組 -->
            <td class="px-3 py-2.5 text-center">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                {{ groupLabel(userPermMap[c.id]?.group) }}
              </span>
            </td>
            <td class="px-3 py-2.5 text-center">
              <span class="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 font-medium">
                {{ c.bookingCount ?? '—' }}
              </span>
            </td>
            <td class="px-3 py-2.5 text-center">
              <span class="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium">
                {{ c.lunchCount ?? '—' }}
              </span>
            </td>
            <td class="px-3 py-2.5 text-hint-c text-xs">{{ c.createdAt }}</td>
            <td class="px-3 py-2.5 text-center">
              <span :class="c.status === 'blocked'
 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
 : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
                    class="px-2 py-0.5 rounded-full text-xs font-medium">
                {{ c.status === 'blocked' ? '已封鎖' : '正常' }}
              </span>
            </td>
            <td class="px-3 py-2.5">
              <div class="flex items-center gap-1 justify-center">
                <button @click="openEdit(c)"
                        class="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">編輯</button>
                <button @click="openPermModal(c)"
                        class="px-2 py-1 text-xs border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">權限</button>
                <button @click="toggleBlock(c)"
                        :class="c.status === 'blocked'
 ? 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
 : 'border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'"
                        class="px-2 py-1 text-xs border rounded-lg transition-colors">
                  {{ c.status === 'blocked' ? '解鎖' : '封鎖' }}
                </button>
                <button @click="confirmDelete(c)"
                        class="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">刪除</button>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- 手機卡片 -->
      <div class="md:hidden space-y-3">
        <div v-for="c in filtered" :key="c.id"
             class="bg-surface rounded-2xl border border-light-c shadow-sm p-4"
             :class="c.status === 'blocked' ? 'opacity-60' : ''">
          <div class="flex items-start gap-3 mb-3">
            <img v-if="c.picture" :src="c.picture" :alt="c.name"
                 class="w-12 h-12 rounded-full object-cover border border-light-c flex-shrink-0"/>
            <div v-else class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
              {{ c.name?.charAt(0) || '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <p class="font-semibold text-base-c truncate">{{ c.name }}</p>
                <div class="flex gap-1.5">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                    {{ groupLabel(userPermMap[c.id]?.group) }}
                  </span>
                  <span :class="c.status === 'blocked'
 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
 : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
                        class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                    {{ c.status === 'blocked' ? '已封鎖' : '正常' }}
                  </span>
                </div>
              </div>
              <p class="text-xs text-hint-c mt-0.5 truncate">{{ c.email }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-c mb-3">
            <div v-if="c.mobile || c.landline"><span class="text-hint-c">電話：</span>{{ c.mobile || c.landline }}</div>
            <div v-if="c.birthday"><span class="text-hint-c">生日：</span>{{ c.birthday }}</div>
            <div><span class="text-hint-c">訂位：</span><span class="text-teal-600 font-medium">{{ c.bookingCount ?? '—' }} 筆</span></div>
            <div><span class="text-hint-c">便當：</span><span class="text-orange-600 font-medium">{{ c.lunchCount ?? '—' }} 筆</span></div>
            <div class="col-span-2 text-hint-c">建立：{{ c.createdAt }}</div>
          </div>
          <div class="flex gap-2">
            <button @click="openEdit(c)"
                    class="flex-1 py-1.5 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-50 transition-colors">編輯</button>
            <button @click="openPermModal(c)"
                    class="flex-1 py-1.5 text-xs border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 rounded-xl hover:bg-violet-50 transition-colors">權限</button>
            <button @click="toggleBlock(c)"
                    :class="c.status === 'blocked'
 ? 'border-green-300 text-green-600 hover:bg-green-50'
 : 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'"
                    class="flex-1 py-1.5 text-xs border rounded-xl transition-colors">
              {{ c.status === 'blocked' ? '解鎖' : '封鎖' }}
            </button>
            <button @click="confirmDelete(c)"
                    class="flex-1 py-1.5 text-xs border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 transition-colors">刪除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ 編輯 Modal ══ -->
    <div v-if="editModal.open" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center gap-3 mb-5">
          <img v-if="editModal.customer?.picture" :src="editModal.customer.picture"
               class="w-10 h-10 rounded-full object-cover border border-light-c"/>
          <div>
            <h3 class="font-bold text-base-c">編輯客戶資料</h3>
            <p class="text-xs text-hint-c">{{ editModal.customer?.email }}</p>
          </div>
          <button @click="editModal.open = false" class="ml-auto text-hint-c hover:text-muted-c p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">姓名</label>
            <input v-model="editForm.name" type="text"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-muted-c block mb-1">手機</label>
              <input v-model="editForm.mobile" type="tel"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
            <div>
              <label class="text-xs font-semibold text-muted-c block mb-1">市話</label>
              <input v-model="editForm.landline" type="tel"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">地址</label>
            <input v-model="editForm.address" type="text"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">生日</label>
            <input v-model="editForm.birthday" type="date"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">備註</label>
            <textarea v-model="editForm.note" rows="2"
                      class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-400 resize-none"/>
          </div>

          <p v-if="editError" class="text-xs text-red-500">{{ editError }}</p>

          <div class="flex gap-2 pt-1">
            <button @click="editModal.open = false"
                    class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl hover:bg-surface2 transition-colors">
              取消
            </button>
            <button @click="saveEdit" :disabled="saving"
                    class="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center gap-1.5">
              <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              {{ saving ? '儲存中…' : '儲存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ 用戶權限 Modal ══ -->
    <div v-if="permModal.open" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 px-4 py-6 overflow-y-auto">
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-2xl p-6 my-auto">
        <!-- 用戶資訊 -->
        <div class="flex items-center gap-3 mb-5">
          <img v-if="permModal.customer?.picture" :src="permModal.customer.picture"
               class="w-10 h-10 rounded-full object-cover border border-light-c flex-shrink-0"/>
          <div v-else class="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 font-bold flex-shrink-0">
            {{ permModal.customer?.name?.charAt(0) || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-base-c truncate">{{ permModal.customer?.name }}</h3>
            <p class="text-xs text-hint-c truncate">{{ permModal.customer?.email }}</p>
          </div>
          <button @click="permModal.open = false" class="text-hint-c hover:text-muted-c p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- 選擇群組 -->
        <div class="mb-5">
          <label class="text-xs font-semibold text-muted-c block mb-1">所屬群組</label>
          <select v-model="permModal.group"
                  class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-violet-400">
            <option v-for="g in permGroups" :key="g.id" :value="g.id">{{ g.label }}（{{ g.id }}）</option>
          </select>
          <p class="text-xs text-hint-c mt-1">群組為基礎，個人覆蓋優先於群組設定</p>
        </div>

        <!-- 個人覆蓋 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-muted-c">個人覆蓋設定</label>
            <button class="text-xs text-hint-c hover:text-red-500 hover:underline transition-colors"
                    @click="clearOverrides">清除所有覆蓋</button>
          </div>

          <div v-for="section in permSections" :key="section.prefix" class="mb-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-semibold text-hint-c uppercase tracking-wide">{{ section.label }}</span>
              <div class="flex-1 h-px bg-surface2 dark:bg-surface2" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div v-for="key in section.keys" :key="key"
                   class="flex items-center gap-2 px-3 py-2 rounded-xl border border-light-c">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-base-c">{{ KEY_LABELS[key] ?? key }}</p>
                  <p class="text-xs text-hint-c mt-0.5">
                    群組預設：
                    <span :class="groupDefaultForKey(key) ? 'text-green-600' : 'text-red-500'">
                      {{ groupDefaultForKey(key) ? '開啟' : '關閉' }}
                    </span>
                  </p>
                </div>
                <!-- 修正：改用 v-model 搭配計算的 getter/setter，確保響應式正確 -->
                <select v-model="permOverrides[key]"
                        class="text-xs px-2 py-1 rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-1 focus:ring-violet-400">
                  <option value="inherit">繼承群組</option>
                  <option value="allow">覆蓋：開啟</option>
                  <option value="deny">覆蓋：關閉</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- 錯誤提示 -->
        <p v-if="permError" class="text-xs text-red-500 mb-3">{{ permError }}</p>

        <div class="flex gap-2 pt-3 border-t border-light-c mt-4">
          <button @click="permModal.open = false"
                  class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl hover:bg-surface2 transition-colors">取消</button>
          <button @click="savePerm" :disabled="saving"
                  class="flex-1 py-2.5 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ 刪除確認 Modal ══ -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="font-bold text-base-c mb-2">確認刪除</h3>
        <p class="text-sm text-hint-c mb-5">
          確定要刪除 <span class="font-semibold text-base-c">{{ deleteTarget.name }}</span>（{{ deleteTarget.email }}）的帳號嗎？此操作無法復原。
        </p>
        <div class="flex gap-2">
          <button @click="deleteTarget = null"
                  class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl hover:bg-surface2 transition-colors">
            取消
          </button>
          <button @click="doDelete" :disabled="saving"
                  class="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            {{ saving ? '刪除中…' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'admin' })

const commonStore = useCommonStore()
const BASE        = computed(() => commonStore.data.main_url + '/holy/customer')
const ADMIN_BASE  = computed(() => commonStore.data.main_url + '/holy/admin/customers')
const PERM_BASE   = computed(() => commonStore.data.main_url + '/holy/permission')

// ── 狀態 ──────────────────────────────────────────────────────────
const customers    = ref([])
const loading      = ref(true)
const saving       = ref(false)
const searchText   = ref('')
const filterStatus = ref('')
const filterGroup  = ref('')
const deleteTarget = ref(null)
const editError    = ref('')
const permError    = ref('')
const toast        = reactive({ show: false, message: '' })

// ── 權限相關狀態 ──────────────────────────────────────────────────
const permGroups   = ref([])   // 所有群組（從 permission API 取得）
const defaultGroup = ref('guest')
const userPermMap  = ref({})   // { customerId: { group, permissions } }

const editModal = reactive({ open: false, customer: null })
const editForm  = reactive({ name: '', mobile: '', landline: '', address: '', birthday: '', note: '' })

// 修正：overrides 用 ref({}) 而非放在 reactive() 裡，
// 避免整個物件重新指派時 Vue 追蹤斷裂。
// 每個 key 初始值為 'inherit'，這樣 v-model 一定有東西可以綁。
const permModal = reactive({
  open: false,
  customer: null,
  group: 'guest',
})
const permOverrides = ref({})  // { key: 'inherit' | 'allow' | 'deny' }

// ── Permission Key 中文對照 ──────────────────────────────────────
const KEY_LABELS = {
  'front.view':                 '前台瀏覽',
  'profile.view':               '個人頁面',
  'staff.cash-count':           '點鈔紀錄（查看）',
  'staff.cash-count.edit':      '點鈔紀錄（編輯）',
  'staff.inventory':            '庫存管理（查看）',
  'staff.inventory.edit':       '庫存管理（編輯）',
  'staff.booking':              '訂位管理（查看）',
  'staff.booking.edit':         '訂位管理（編輯）',
  'staff.menu':                 '每日菜單（查看）',
  'staff.menu.edit':            '每日菜單（編輯）',
  'staff.calendar':             '行事曆（查看）',
  'staff.calendar.edit':        '行事曆（編輯）',
  'staff.asset':                '財產登記（查看）',
  'staff.asset.edit':           '財產登記（編輯）',
  'staff.files':                '檔案管理（查看）',
  'staff.files.edit':           '檔案管理（編輯）',
  'staff.news':                 '消息管理（查看）',
  'staff.news.edit':            '消息管理（編輯）',
  'staff.product':              '商品管理（查看）',
  'staff.product.edit':         '商品管理（編輯）',
  'staff.production':           '產品訂購管理（查看）',
  'staff.production.edit':      '產品訂購管理（編輯）',
  'staff.home':                 '員工首頁（查看）',
  'staff.home.edit':            '員工首頁（編輯）',
  'staff.quick-links':          '常用網址（查看）',
  'staff.quick-links.edit':     '常用網址（編輯）',
  'staff.customer':             '客戶管理（查看）',
  'staff.customer.edit':        '客戶管理（編輯）',
}

const ALL_KEYS = Object.keys(KEY_LABELS)

const permSections = [
  { prefix: 'front',     label: '前台',      keys: ['front.view', 'profile.view'] },
  { prefix: 'inventory', label: '庫存・財務', keys: ['staff.cash-count', 'staff.cash-count.edit', 'staff.inventory', 'staff.inventory.edit'] },
  { prefix: 'ops',       label: '營運管理',  keys: ['staff.booking', 'staff.booking.edit', 'staff.menu', 'staff.menu.edit', 'staff.calendar', 'staff.calendar.edit', 'staff.asset', 'staff.asset.edit', 'staff.files', 'staff.files.edit'] },
  { prefix: 'content',   label: '前台內容',  keys: ['staff.news', 'staff.news.edit', 'staff.product', 'staff.product.edit', 'staff.production', 'staff.production.edit'] },
  { prefix: 'tools',     label: '工具・系統', keys: ['staff.home', 'staff.home.edit', 'staff.quick-links', 'staff.quick-links.edit'] },
  { prefix: 'misc',      label: '其他',      keys: ['staff.customer', 'staff.customer.edit'] },
]

// ── 計算屬性 ──────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = searchText.value.toLowerCase()
  return customers.value.filter(c => {
    const matchSearch = !q || [c.name, c.email, c.mobile, c.landline, c.address].some(v => v?.toLowerCase().includes(q))
    const matchStatus = !filterStatus.value || c.status === filterStatus.value
    const matchGroup  = !filterGroup.value  || userPermMap.value[c.id]?.group === filterGroup.value
    return matchSearch && matchStatus && matchGroup
  })
})

// ── 工具 ──────────────────────────────────────────────────────────
const showToast = (msg) => {
  toast.message = msg
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

const groupLabel = (groupId) =>
  permGroups.value.find(g => g.id === groupId)?.label ?? groupId ?? '—'

const groupDefaultForKey = (key) => {
  const g = permGroups.value.find(g => g.id === permModal.group)
  return g?.permissions?.[key] ?? false
}

// ── 開啟編輯 ──────────────────────────────────────────────────────
const openEdit = (c) => {
  editError.value = ''
  editModal.customer = c
  editModal.open = true
  Object.assign(editForm, {
    name:     c.name     || '',
    mobile:   c.mobile   || '',
    landline: c.landline || '',
    address:  c.address  || '',
    birthday: c.birthday || '',
    note:     c.note     || '',
  })
}

// ── 清除個人覆蓋（重設所有 key 為 inherit） ──────────────────────
const clearOverrides = () => {
  const fresh = {}
  for (const key of ALL_KEYS) fresh[key] = 'inherit'
  permOverrides.value = fresh
}

// ── 開啟用戶權限 Modal ────────────────────────────────────────────
// 修正：所有 key 都預先初始化為 'inherit'，
// 再把後端已有的覆蓋蓋上去，確保 v-model 有初始值可以綁定。
const openPermModal = (c) => {
  permError.value = ''
  const perm = userPermMap.value[c.id]
  permModal.customer = c
  permModal.group = perm?.group ?? defaultGroup.value

  // 所有 key 先設為 'inherit'
  const fresh = {}
  for (const key of ALL_KEYS) fresh[key] = 'inherit'

  // 套上後端已有的覆蓋
  if (perm?.permissions) {
    Object.entries(perm.permissions).forEach(([key, allow]) => {
      fresh[key] = allow ? 'allow' : 'deny'
    })
  }

  permOverrides.value = fresh
  permModal.open = true
}

// ── API：取得客戶清單 ──────────────────────────────────────────────
const fetchCustomers = async () => {
  loading.value = true
  try {
    const res = await fetch(BASE.value + '/list')
    customers.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ── API：取得權限群組 + 所有用戶權限 ─────────────────────────────
const fetchPermData = async () => {
  try {
    const [gRes, dRes] = await Promise.all([
      fetch(PERM_BASE.value + '/groups'),
      fetch(PERM_BASE.value + '/default-group'),
    ])
    permGroups.value   = await gRes.json()
    defaultGroup.value = (await dRes.json()).defaultGroup ?? 'guest'
  } catch (e) { console.error(e) }
}

const fetchUserPerms = async () => {
  try {
    const perms = await Promise.all(
      customers.value.map(c =>
        fetch(`${PERM_BASE.value}/user/${c.id}`).then(r => r.json())
      )
    )
    const map = {}
    perms.forEach(p => { if (p.customerId) map[p.customerId] = p })
    userPermMap.value = map
  } catch (e) { console.error(e) }
}

// ── API：儲存編輯 ──────────────────────────────────────────────────
const saveEdit = async () => {
  editError.value = ''
  saving.value = true
  try {
    const res = await fetch(ADMIN_BASE.value + '/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editModal.customer.id, ...editForm })
    })
    const data = await res.json()
    if (data.success) {
      await fetchCustomers()
      editModal.open = false
      showToast('客戶資料已更新')
    } else {
      editError.value = data.message || '更新失敗'
    }
  } catch {
    editError.value = '連線失敗，請再試一次'
  } finally {
    saving.value = false
  }
}

// ── API：儲存用戶權限 ─────────────────────────────────────────────
// 修正重點：
// 1. 每個步驟的 API 回傳值都檢查是否有 error，有的話拋出讓 catch 接住
// 2. DELETE 改用 query string（?key=...），避免 DELETE with body 被 filter 吞掉
// 3. 儲存完後重新拉全部用戶權限，確保列表資料同步
const savePerm = async () => {
  permError.value = ''
  saving.value = true
  const customerId = permModal.customer.id
  try {
    // 1. 儲存群組
    const groupRes = await fetch(`${PERM_BASE.value}/user/${customerId}/group`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: permModal.group })
    })
    const groupData = await groupRes.json()
    if (groupData.error) throw new Error('群組儲存失敗：' + groupData.error)

    // 2. 儲存個人覆蓋
    for (const [key, val] of Object.entries(permOverrides.value)) {
      if (val === 'inherit') {
        // 修正：DELETE 用 query string，不帶 body
        const delRes = await fetch(
          `${PERM_BASE.value}/user/${customerId}/perm?key=${encodeURIComponent(key)}`,
          { method: 'DELETE' }
        )
        const delData = await delRes.json()
        if (delData.error) throw new Error(`清除 ${key} 失敗：` + delData.error)
      } else {
        const putRes = await fetch(`${PERM_BASE.value}/user/${customerId}/perm`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, allow: val === 'allow' })
        })
        const putData = await putRes.json()
        if (putData.error) throw new Error(`設定 ${key} 失敗：` + putData.error)
      }
    }

    // 3. 重新拉全部用戶權限，確保列表群組顯示同步
    await fetchUserPerms()

    permModal.open = false
    showToast('用戶權限已更新')
  } catch (e) {
    permError.value = e.message || '儲存失敗，請再試一次'
    console.error(e)
  } finally {
    saving.value = false
  }
}

// ── API：封鎖/解鎖 ─────────────────────────────────────────────────
const toggleBlock = async (c) => {
  const newStatus = c.status === 'blocked' ? 'active' : 'blocked'
  try {
    const res = await fetch(`${BASE.value}/${c.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    const data = await res.json()
    if (data.success) {
      c.status = newStatus
      showToast(newStatus === 'blocked' ? '帳號已封鎖' : '帳號已解鎖')
    }
  } catch (e) { console.error(e) }
}

// ── API：刪除 ─────────────────────────────────────────────────────
const confirmDelete = (c) => { deleteTarget.value = c }

const doDelete = async () => {
  saving.value = true
  try {
    const res = await fetch(`${ADMIN_BASE.value}/delete/${deleteTarget.value.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      await fetchCustomers()
      showToast('帳號已刪除')
    }
  } catch (e) { console.error(e) } finally {
    saving.value = false
    deleteTarget.value = null
  }
}

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchCustomers(), fetchPermData()])
  await fetchUserPerms()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
