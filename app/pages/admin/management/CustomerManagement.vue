<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">
    <AdminNavbar />

    <!-- ── Header ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">客</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">客戶帳號管理</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Customer Accounts</p>
          </div>
        </div>
        <span class="text-xs text-stone-400">共 {{ filtered.length }} 位客戶</span>
      </div>

      <!-- 搜尋 + 篩選 -->
      <div class="flex flex-wrap gap-2">
        <input v-model="searchText" placeholder="搜尋姓名、Email、電話…"
               class="flex-1 min-w-40 px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400" />
        <select v-model="filterStatus"
                class="px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">全部狀態</option>
          <option value="active">正常</option>
          <option value="blocked">已封鎖</option>
        </select>
        <select v-model="filterRole"
                class="px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">全部權限</option>
          <option value="CUSTOMER">一般客戶</option>
          <option value="STAFF">員工</option>
          <option value="EDITOR">編輯</option>
          <option value="ADMIN">管理員</option>
        </select>
      </div>
    </header>

    <div class="max-w-full px-3 sm:px-4 py-4">

      <!-- 載入中 -->
      <div v-if="loading" class="flex items-center justify-center py-16 text-stone-400 gap-2">
        <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        載入中…
      </div>

      <!-- 無資料 -->
      <div v-else-if="filtered.length === 0" class="text-center py-16 text-stone-400 text-sm">
        {{ customers.length === 0 ? '尚無客戶資料' : '找不到符合條件的客戶' }}
      </div>

      <!-- 桌機表格 -->
      <div v-else class="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
        <table class="w-full text-sm whitespace-nowrap">
          <thead class="bg-stone-50 dark:bg-zinc-800 text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
          <tr>
            <th class="px-3 py-3 text-left">客戶</th>
            <th class="px-3 py-3 text-left">Email</th>
            <th class="px-3 py-3 text-left">電話</th>
            <th class="px-3 py-3 text-center">權限</th>
            <th class="px-3 py-3 text-center">訂位</th>
            <th class="px-3 py-3 text-center">便當</th>
            <th class="px-3 py-3 text-left">建立時間</th>
            <th class="px-3 py-3 text-center">狀態</th>
            <th class="px-3 py-3 text-center">操作</th>
          </tr>
          </thead>
          <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
          <tr v-for="c in filtered" :key="c.id"
              class="hover:bg-stone-50 dark:hover:bg-zinc-700/30 transition-colors"
              :class="c.status === 'blocked' ? 'opacity-50' : ''">
            <!-- 客戶 -->
            <td class="px-3 py-2.5">
              <div class="flex items-center gap-2">
                <img v-if="c.picture" :src="c.picture" :alt="c.name"
                     class="w-8 h-8 rounded-full object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0"/>
                <div v-else class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                  {{ c.name?.charAt(0) || '?' }}
                </div>
                <span class="font-medium text-stone-800 dark:text-stone-100">{{ c.name }}</span>
              </div>
            </td>
            <td class="px-3 py-2.5 text-stone-500 dark:text-stone-400">{{ c.email }}</td>
            <td class="px-3 py-2.5 text-stone-600 dark:text-stone-300">{{ c.mobile || c.landline || '—' }}</td>
            <!-- 權限 -->
            <td class="px-3 py-2.5 text-center">
              <span :class="roleBadgeClass(c.role)" class="px-2 py-0.5 rounded-full text-xs font-medium">
                {{ roleLabel(c.role) }}
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
            <td class="px-3 py-2.5 text-stone-400 text-xs">{{ c.createdAt }}</td>
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
                <button @click="openRoleModal(c)"
                        class="px-2 py-1 text-xs border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">權限</button>
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
             class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4"
             :class="c.status === 'blocked' ? 'opacity-60' : ''">
          <div class="flex items-start gap-3 mb-3">
            <img v-if="c.picture" :src="c.picture" :alt="c.name"
                 class="w-12 h-12 rounded-full object-cover border border-stone-200 flex-shrink-0"/>
            <div v-else class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
              {{ c.name?.charAt(0) || '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <p class="font-semibold text-stone-800 dark:text-stone-100 truncate">{{ c.name }}</p>
                <div class="flex gap-1.5">
                  <span :class="roleBadgeClass(c.role)" class="px-2 py-0.5 rounded-full text-xs font-medium">
                    {{ roleLabel(c.role) }}
                  </span>
                  <span :class="c.status === 'blocked'
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
                        class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                    {{ c.status === 'blocked' ? '已封鎖' : '正常' }}
                  </span>
                </div>
              </div>
              <p class="text-xs text-stone-400 mt-0.5 truncate">{{ c.email }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300 mb-3">
            <div v-if="c.mobile || c.landline"><span class="text-stone-400">電話：</span>{{ c.mobile || c.landline }}</div>
            <div v-if="c.birthday"><span class="text-stone-400">生日：</span>{{ c.birthday }}</div>
            <div><span class="text-stone-400">訂位：</span><span class="text-teal-600 font-medium">{{ c.bookingCount ?? '—' }} 筆</span></div>
            <div><span class="text-stone-400">便當：</span><span class="text-orange-600 font-medium">{{ c.lunchCount ?? '—' }} 筆</span></div>
            <div class="col-span-2 text-stone-400">建立：{{ c.createdAt }}</div>
          </div>
          <div class="flex gap-2">
            <button @click="openEdit(c)"
                    class="flex-1 py-1.5 text-xs border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-50 transition-colors">編輯</button>
            <button @click="openRoleModal(c)"
                    class="flex-1 py-1.5 text-xs border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-50 transition-colors">權限</button>
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
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center gap-3 mb-5">
          <img v-if="editModal.customer?.picture" :src="editModal.customer.picture"
               class="w-10 h-10 rounded-full object-cover border border-stone-200"/>
          <div>
            <h3 class="font-bold text-stone-800 dark:text-stone-100">編輯客戶資料</h3>
            <p class="text-xs text-stone-400">{{ editModal.customer?.email }}</p>
          </div>
          <button @click="editModal.open = false" class="ml-auto text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">姓名</label>
            <input v-model="editForm.name" type="text"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">手機</label>
              <input v-model="editForm.mobile" type="tel"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
            <div>
              <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">市話</label>
              <input v-model="editForm.landline" type="tel"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">地址</label>
            <input v-model="editForm.address" type="text"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">生日</label>
            <input v-model="editForm.birthday" type="date"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">備註</label>
            <textarea v-model="editForm.note" rows="2"
                      class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400 resize-none"/>
          </div>

          <p v-if="editError" class="text-xs text-red-500">{{ editError }}</p>

          <div class="flex gap-2 pt-1">
            <button @click="editModal.open = false"
                    class="flex-1 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">
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

    <!-- ══ 權限 Modal ══ -->
    <div v-if="roleModal.open" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div class="flex items-center gap-3 mb-5">
          <img v-if="roleModal.customer?.picture" :src="roleModal.customer.picture"
               class="w-10 h-10 rounded-full object-cover border border-stone-200 flex-shrink-0"/>
          <div v-else class="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-bold flex-shrink-0">
            {{ roleModal.customer?.name?.charAt(0) || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-stone-800 dark:text-stone-100 truncate">{{ roleModal.customer?.name }}</h3>
            <p class="text-xs text-stone-400 truncate">{{ roleModal.customer?.email }}</p>
          </div>
          <button @click="roleModal.open = false" class="text-stone-400 hover:text-stone-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <p class="text-xs text-stone-500 dark:text-stone-400 mb-3">選擇此帳號的系統權限：</p>

        <!-- 權限選項 -->
        <div class="space-y-2 mb-5">
          <label v-for="opt in roleOptions" :key="opt.value"
                 class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                 :class="roleModal.selected === opt.value
                   ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600'
                   : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-zinc-800'">
            <input type="radio" :value="opt.value" v-model="roleModal.selected" class="mt-0.5 accent-purple-600"/>
            <div>
              <p class="text-sm font-semibold text-stone-800 dark:text-stone-100">{{ opt.label }}</p>
              <p class="text-xs text-stone-400 mt-0.5">{{ opt.desc }}</p>
            </div>
          </label>
        </div>

        <div class="flex gap-2">
          <button @click="roleModal.open = false"
                  class="flex-1 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">
            取消
          </button>
          <button @click="saveRole" :disabled="saving"
                  class="flex-1 py-2.5 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            {{ saving ? '儲存中…' : '確認更新' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ 刪除確認 Modal ══ -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-2">確認刪除</h3>
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-5">
          確定要刪除 <span class="font-semibold text-stone-800 dark:text-stone-100">{{ deleteTarget.name }}</span>（{{ deleteTarget.email }}）的帳號嗎？此操作無法復原。
        </p>
        <div class="flex gap-2">
          <button @click="deleteTarget = null"
                  class="flex-1 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors">
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
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
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

// ── 狀態 ──────────────────────────────────────────────────────────
const customers    = ref([])
const loading      = ref(true)
const saving       = ref(false)
const searchText   = ref('')
const filterStatus = ref('')
const filterRole   = ref('')
const deleteTarget = ref(null)
const editError    = ref('')
const toast        = reactive({ show: false, message: '' })

const editModal = reactive({ open: false, customer: null })
const editForm  = reactive({ name: '', mobile: '', landline: '', address: '', birthday: '', note: '' })

const roleModal = reactive({ open: false, customer: null, selected: 'CUSTOMER' })

// ── 權限設定 ──────────────────────────────────────────────────────
const roleOptions = [
  { value: 'CUSTOMER', label: '一般客戶', desc: '只能使用前台訂位、訂便當等功能' },
  { value: 'STAFF',    label: '員工',     desc: '可進入員工區查看資料，無法編輯' },
  { value: 'EDITOR',   label: '編輯',     desc: '可新增及編輯內容（菜單、活動等）' },
  { value: 'ADMIN',    label: '管理員',   desc: '最高權限，可管理所有人的帳號與權限' },
]

const roleLabel = (role) => {
  return roleOptions.find(o => o.value === role)?.label ?? role ?? 'CUSTOMER'
}

const roleBadgeClass = (role) => {
  const map = {
    CUSTOMER: 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
    STAFF:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    EDITOR:   'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    ADMIN:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return map[role] ?? map.CUSTOMER
}

// ── 計算屬性 ──────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = searchText.value.toLowerCase()
  return customers.value.filter(c => {
    const matchSearch = !q || [c.name, c.email, c.mobile, c.landline, c.address].some(v => v?.toLowerCase().includes(q))
    const matchStatus = !filterStatus.value || c.status === filterStatus.value
    const matchRole   = !filterRole.value || c.role === filterRole.value
    return matchSearch && matchStatus && matchRole
  })
})

// ── 工具 ──────────────────────────────────────────────────────────
const showToast = (msg) => {
  toast.message = msg
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
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

// ── 開啟權限 Modal ─────────────────────────────────────────────────
const openRoleModal = (c) => {
  roleModal.customer = c
  roleModal.selected = c.role || 'CUSTOMER'
  roleModal.open = true
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

// ── API：更新 role ─────────────────────────────────────────────────
const saveRole = async () => {
  saving.value = true
  try {
    const res = await fetch(`${BASE.value}/${roleModal.customer.id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: roleModal.selected })
    })
    const data = await res.json()
    if (data.success) {
      roleModal.customer.role = roleModal.selected
      roleModal.open = false
      showToast(`權限已更新為「${roleLabel(roleModal.selected)}」`)
    }
  } catch {
    console.error('更新 role 失敗')
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
  } catch (e) {
    console.error(e)
  }
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
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
    deleteTarget.value = null
  }
}

onMounted(fetchCustomers)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
