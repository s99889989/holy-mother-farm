<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">
    <AdminNavbar />

    <!-- ── Header ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            權
          </div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">
              權限管理
            </h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">
              Permission Management
            </p>
          </div>
        </div>
      </div>

      <!-- 頁籤 -->
      <div class="flex gap-1 mt-3">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="activeTab === tab.id
            ? 'bg-violet-600 text-white'
            : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-zinc-700'"
          class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </header>

    <div class="max-w-full px-3 sm:px-4 py-4">
      <!-- ════ 頁籤：權限組管理 ════ -->
      <div v-if="activeTab === 'groups'">
        <!-- 操作列 -->
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-stone-400">
            共 {{ groups.length }} 個群組，預設群組：
            <span class="font-semibold text-violet-600">{{ defaultGroup }}</span>
          </p>
          <button
            class="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1"
            @click="openCreateGroup"
          >
            <span class="text-base leading-none">+</span> 新增群組
          </button>
        </div>

        <!-- 載入中 -->
        <div
          v-if="loadingGroups"
          class="flex items-center justify-center py-16 text-stone-400 gap-2"
        >
          <div class="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          載入中…
        </div>

        <!-- 群組卡片 -->
        <div
          v-else
          class="space-y-3"
        >
          <div
            v-for="g in groups"
            :key="g.id"
            class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
          >
            <!-- 群組標頭 -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-700">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 text-xs font-bold">{{ g.label?.charAt(0) }}</span>
                <div>
                  <p class="font-semibold text-stone-800 dark:text-stone-100 text-sm">
                    {{ g.label }}
                  </p>
                  <p class="text-xs text-stone-400">
                    ID: {{ g.id }}
                  </p>
                </div>
                <span
                  v-if="g.id === defaultGroup"
                  class="px-2 py-0.5 text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-full font-medium ml-1"
                >
                  預設
                </span>
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  v-if="g.id !== defaultGroup"
                  class="px-2 py-1 text-xs border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 rounded-lg hover:bg-violet-50 transition-colors"
                  @click="setAsDefault(g.id)"
                >
                  設為預設
                </button>
                <button
                  class="px-2 py-1 text-xs border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
                  @click="openEditGroup(g)"
                >
                  編輯
                </button>
                <button
                  v-if="g.id !== defaultGroup"
                  class="px-2 py-1 text-xs border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  @click="confirmDeleteGroup(g)"
                >
                  刪除
                </button>
              </div>
            </div>

            <!-- 頁面權限預覽 -->
            <div class="px-4 py-3">
              <p class="text-xs text-stone-400 mb-2">
                可進入 {{ countAllowed(g.pages) }} / {{ pageList.length }} 個頁面
              </p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="page in pageList"
                  :key="page.path"
                  :class="g.pages[page.path]
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-stone-100 text-stone-400 dark:bg-zinc-800 dark:text-stone-500'"
                  class="px-2 py-0.5 text-xs rounded-full"
                >
                  {{ page.label }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════ 頁籤：用戶權限管理 ════ -->
      <div v-if="activeTab === 'users'">
        <!-- 搜尋 -->
        <div class="flex gap-2 mb-3">
          <input
            v-model="userSearch"
            placeholder="搜尋姓名或 Email…"
            class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-violet-400"
          >
        </div>

        <!-- 載入中 -->
        <div
          v-if="loadingUsers"
          class="flex items-center justify-center py-16 text-stone-400 gap-2"
        >
          <div class="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          載入中…
        </div>

        <!-- 桌機表格 -->
        <div
          v-else-if="filteredUsers.length > 0"
          class="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden"
        >
          <table class="w-full text-sm">
            <thead class="bg-stone-50 dark:bg-zinc-800 text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              <tr>
                <th class="px-3 py-3 text-left">
                  用戶
                </th>
                <th class="px-3 py-3 text-center">
                  所屬群組
                </th>
                <th class="px-3 py-3 text-center">
                  個人覆蓋頁數
                </th>
                <th class="px-3 py-3 text-center">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
              <tr
                v-for="u in filteredUsers"
                :key="u.id"
                class="hover:bg-stone-50 dark:hover:bg-zinc-700/30 transition-colors"
              >
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <img
                      v-if="u.picture"
                      :src="u.picture"
                      :alt="u.name"
                      class="w-8 h-8 rounded-full object-cover border border-stone-200 flex-shrink-0"
                    >
                    <div
                      v-else
                      class="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 text-xs font-bold flex-shrink-0"
                    >
                      {{ u.name?.charAt(0) || '?' }}
                    </div>
                    <div>
                      <p class="font-medium text-stone-800 dark:text-stone-100">
                        {{ u.name }}
                      </p>
                      <p class="text-xs text-stone-400">
                        {{ u.email }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                    {{ groupLabel(userPermMap[u.id]?.group) }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center text-stone-500 dark:text-stone-400 text-xs">
                  {{ overrideCount(userPermMap[u.id]?.pages) }} 頁
                </td>
                <td class="px-3 py-2.5 text-center">
                  <button
                    class="px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                    @click="openUserPerm(u)"
                  >
                    管理權限
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 手機卡片 -->
        <div
          v-else-if="filteredUsers.length > 0"
          class="md:hidden space-y-3"
        >
          <!-- 同桌機，略 -->
        </div>

        <div
          v-else
          class="text-center py-16 text-stone-400 text-sm"
        >
          找不到符合的用戶
        </div>
      </div>
    </div>

    <!-- ════ 新增/編輯群組 Modal ════ -->
    <div
      v-if="groupModal.open"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 px-4 py-6 overflow-y-auto"
    >
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-bold text-stone-800 dark:text-stone-100">
            {{ groupModal.isCreate ? '新增權限組' : '編輯權限組：' + groupModal.data.label }}
          </h3>
          <button
            class="text-stone-400 hover:text-stone-600 p-1"
            @click="groupModal.open = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <!-- ID（新增時才顯示） -->
          <div v-if="groupModal.isCreate">
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">群組 ID <span class="text-stone-400 font-normal">（英數字，建立後不能更改）</span></label>
            <input
              v-model="groupModal.data.id"
              placeholder="例如：staff、editor、vip"
              class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-violet-400"
            >
          </div>

          <!-- 名稱 -->
          <div>
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">顯示名稱</label>
            <input
              v-model="groupModal.data.label"
              placeholder="例如：員工、編輯人員"
              class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-violet-400"
            >
          </div>

          <!-- 頁面權限設定 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-stone-600 dark:text-stone-300">頁面權限</label>
              <div class="flex gap-2">
                <button
                  class="text-xs text-green-600 hover:underline"
                  @click="setAllPages(true)"
                >
                  全部允許
                </button>
                <span class="text-stone-300">|</span>
                <button
                  class="text-xs text-red-500 hover:underline"
                  @click="setAllPages(false)"
                >
                  全部禁止
                </button>
              </div>
            </div>

            <!-- 依區域分組顯示 -->
            <div
              v-for="section in pageSections"
              :key="section.prefix"
              class="mb-3"
            >
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">{{ section.label }}</span>
                <div class="flex-1 h-px bg-stone-100 dark:bg-stone-700" />
                <button
                  class="text-xs text-green-600 hover:underline"
                  @click="setSectionPages(section.prefix, true)"
                >
                  全開
                </button>
                <button
                  class="text-xs text-red-500 hover:underline"
                  @click="setSectionPages(section.prefix, false)"
                >
                  全關
                </button>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <label
                  v-for="page in section.pages"
                  :key="page.path"
                  class="flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm"
                  :class="groupModal.data.pages[page.path]
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                    : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-zinc-800'"
                >
                  <input
                    type="checkbox"
                    :checked="groupModal.data.pages[page.path]"
                    class="accent-violet-600 w-3.5 h-3.5 flex-shrink-0"
                    @change="groupModal.data.pages[page.path] = $event.target.checked"
                  >
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-stone-700 dark:text-stone-200 truncate">{{ page.label }}</p>
                    <p class="text-xs text-stone-400 truncate">{{ page.path }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <p
            v-if="groupModal.error"
            class="text-xs text-red-500"
          >
            {{ groupModal.error }}
          </p>

          <div class="flex gap-2 pt-1">
            <button
              class="flex-1 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors"
              @click="groupModal.open = false"
            >
              取消
            </button>
            <button
              :disabled="saving"
              class="flex-1 py-2.5 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              @click="saveGroup"
            >
              <div
                v-if="saving"
                class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
              {{ saving ? '儲存中…' : '儲存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════ 用戶權限 Modal ════ -->
    <div
      v-if="userPermModal.open"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 px-4 py-6 overflow-y-auto"
    >
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div class="flex items-center gap-3 mb-5">
          <img
            v-if="userPermModal.user?.picture"
            :src="userPermModal.user.picture"
            class="w-10 h-10 rounded-full object-cover border border-stone-200 flex-shrink-0"
          >
          <div
            v-else
            class="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 font-bold flex-shrink-0"
          >
            {{ userPermModal.user?.name?.charAt(0) || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-stone-800 dark:text-stone-100">
              {{ userPermModal.user?.name }}
            </h3>
            <p class="text-xs text-stone-400">
              {{ userPermModal.user?.email }}
            </p>
          </div>
          <button
            class="text-stone-400 hover:text-stone-600 p-1"
            @click="userPermModal.open = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- 選擇群組 -->
        <div class="mb-4">
          <label class="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-1">所屬群組</label>
          <select
            v-model="userPermModal.group"
            class="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option
              v-for="g in groups"
              :key="g.id"
              :value="g.id"
            >
              {{ g.label }}（{{ g.id }}）
            </option>
          </select>
          <p class="text-xs text-stone-400 mt-1">
            群組設定為基礎，個人覆蓋優先於群組
          </p>
        </div>

        <!-- 個人頁面覆蓋 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-stone-600 dark:text-stone-300">個人覆蓋設定</label>
            <button
              class="text-xs text-stone-400 hover:text-red-500 hover:underline transition-colors"
              @click="clearAllOverrides"
            >
              清除所有覆蓋（回歸群組）
            </button>
          </div>

          <div
            v-for="section in pageSections"
            :key="section.prefix"
            class="mb-3"
          >
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">{{ section.label }}</span>
              <div class="flex-1 h-px bg-stone-100 dark:bg-stone-700" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div
                v-for="page in section.pages"
                :key="page.path"
                class="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-sm"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-stone-700 dark:text-stone-200 truncate">
                    {{ page.label }}
                  </p>
                  <!-- 群組預設顯示 -->
                  <p class="text-xs text-stone-400 mt-0.5">
                    群組預設：
                    <span :class="groupDefaultForPage(page.path) ? 'text-green-600' : 'text-red-500'">
                      {{ groupDefaultForPage(page.path) ? '允許' : '禁止' }}
                    </span>
                  </p>
                </div>
                <!-- 三態選擇：繼承群組 / 覆蓋允許 / 覆蓋禁止 -->
                <select
                  :value="getUserOverride(page.path)"
                  class="text-xs px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-1 focus:ring-violet-400"
                  @change="setUserOverride(page.path, $event.target.value)"
                >
                  <option value="inherit">
                    繼承群組
                  </option>
                  <option value="allow">
                    覆蓋：允許
                  </option>
                  <option value="deny">
                    覆蓋：禁止
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-3 border-t border-stone-100 dark:border-stone-700 mt-4">
          <button
            class="flex-1 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-colors"
            @click="userPermModal.open = false"
          >
            取消
          </button>
          <button
            :disabled="saving"
            class="flex-1 py-2.5 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            @click="saveUserPerm"
          >
            <div
              v-if="saving"
              class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════ 刪除群組確認 Modal ════ -->
    <div
      v-if="deleteGroupTarget"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-2">
          確認刪除群組
        </h3>
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-5">
          確定要刪除「<span class="font-semibold text-stone-800 dark:text-stone-100">{{ deleteGroupTarget.label }}</span>」群組嗎？<br>
          已套用此群組的用戶將改為使用預設群組。
        </p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2.5 text-sm bg-stone-100 dark:bg-zinc-800 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
            @click="deleteGroupTarget = null"
          >
            取消
          </button>
          <button
            :disabled="saving"
            class="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            @click="doDeleteGroup"
          >
            <div
              v-if="saving"
              class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            {{ saving ? '刪除中…' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap"
      >
        <svg
          class="w-4 h-4 text-green-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'admin', pageLabel: '權限管理' })

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/permission')
const CUST_BASE = computed(() => commonStore.data.main_url + '/holy/customer')

// ── 頁面清單（自動從 Nuxt 路由產生）────────────────────────────────
const router = useRouter()

// 路由 path → 中文 label 對照表
// 新增頁面後只需在這裡補一行，不補也能運作（fallback 顯示 path）
const PAGE_LABELS = {
  '/': '首頁',
  '/front/about': '關於我們',
  '/front/access': '交通資訊',
  '/front/cafe': '咖啡廳',
  '/front/event': '活動',
  '/front/menu': '菜單',
  '/front/news/index': '最新消息',
  '/front/production': '生產資訊',
  '/front/public': '公開頁面',
  '/front/restaurant': '餐廳',
  '/front/profile/booking': '我的訂位',
  '/front/profile/log': '我的紀錄',
  '/front/profile/lunch': '我的便當',
  '/front/profile/settings': '帳號設定',
  '/book/CalendarPage': '訂位日曆',
  '/book/group-accommodation-space': '團體住宿',
  '/book/herbs-production-area': '香草園區',
  '/book/trial-courses': '體驗課程',
  '/book/venue-rental': '場地租借',
  '/book/AssetRegistry': '財產登記',
  '/staff/home': '員工首頁',
  '/staff/booking': '員工訂位',
  '/staff/calendar': '員工行事曆',
  '/staff/cash-count': '員工點鈔',
  '/staff/quick-links': '員工快速連結',
  '/staff/work-record': '執行記錄',
  '/admin/QuickLinks': '快速連結',
  '/admin/Todo': '待辦事項',
  '/admin/items/CashCount': '點鈔管理',
  '/admin/items/CommonConfig': '系統設定',
  '/admin/items/InventoryQuantity': '庫存數量',
  '/admin/items/ShopInventory': '商店庫存',
  '/admin/management/AssetRegistry': '資產登記',
  '/admin/management/BookIndex': '訂位管理',
  '/admin/management/CustomerManagement': '客戶管理',
  '/admin/management/DailyMenu': '每日菜單',
  '/admin/management/ImageLibrary': '圖庫管理',
  '/admin/management/News': '最新消息管理',
  '/admin/management/Product': '商品管理',
  '/admin/management/ProductionItem': '生產項目',
  '/admin/management/PermissionManagement': '權限管理',
  '/admin/management/admin-calendar': '行政行事曆'
}

// 排除不需要控管的路由（登入頁、動態路由等）
const EXCLUDE_PATHS = ['/login', '/404']
const EXCLUDE_PREFIXES = ['/front/old', '/staff/old']

const pageList = router.getRoutes()
  .filter(r =>
    r.path &&
    r.path !== '' &&           // ← 加這行
    !r.path.includes(':') &&
    !EXCLUDE_PATHS.includes(r.path) &&
    !EXCLUDE_PREFIXES.some(prefix => r.path.startsWith(prefix))
  )
  .map(r => ({
    path: r.path,
    label: PAGE_LABELS[r.path] ?? r.path
  }))
  .sort((a, b) => a.path.localeCompare(b.path))

// 依區域分組（顯示用）
const pageSections = computed(() => [
  { prefix: '/front', label: 'Front 前台', pages: pageList.filter(p => p.path.startsWith('/front')) },
  { prefix: '/book', label: 'Book 訂位', pages: pageList.filter(p => p.path.startsWith('/book')) },
  { prefix: '/staff', label: 'Staff 員工區', pages: pageList.filter(p => p.path.startsWith('/staff')) },
  { prefix: '/admin', label: 'Admin 後台', pages: pageList.filter(p => p.path.startsWith('/admin')) },
  { prefix: '/', label: '其他', pages: pageList.filter(p => p.path === '/') }
])

// ── 頁籤 ──────────────────────────────────────────────────────────
const tabs = [
  { id: 'groups', label: '⚙ 權限組管理' },
  { id: 'users', label: '👤 用戶權限' }
]
const activeTab = ref('groups')

// ── 狀態 ──────────────────────────────────────────────────────────
const groups = ref([])
const defaultGroup = ref('guest')
const loadingGroups = ref(true)
const customers = ref([])
const userPermMap = ref({}) // { customerId: { group, pages } }
const loadingUsers = ref(true)
const userSearch = ref('')
const saving = ref(false)
const deleteGroupTarget = ref(null)
const toast = reactive({ show: false, message: '' })

// ── 群組 Modal ────────────────────────────────────────────────────
const groupModal = reactive({
  open: false,
  isCreate: false,
  data: { id: '', label: '', pages: {} },
  error: ''
})

// ── 用戶權限 Modal ─────────────────────────────────────────────────
const userPermModal = reactive({
  open: false,
  user: null,
  group: 'guest',
  overrides: {} // { path: 'inherit' | 'allow' | 'deny' }
})

// ── Computed ──────────────────────────────────────────────────────
const filteredUsers = computed(() => {
  const q = userSearch.value.toLowerCase()
  return customers.value.filter(c =>
    !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
  )
})

// ── 工具函數 ──────────────────────────────────────────────────────
const showToast = (msg) => {
  toast.message = msg; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

const countAllowed = (pages) => {
  if (!pages) return 0
  return Object.values(pages).filter(Boolean).length
}

const overrideCount = (pages) => {
  if (!pages) return 0
  return Object.keys(pages).length
}

const groupLabel = (groupId) => {
  return groups.value.find(g => g.id === groupId)?.label ?? groupId ?? '—'
}

// 取得某個群組對某頁面的預設值
const groupDefaultForPage = (path) => {
  const g = groups.value.find(g => g.id === userPermModal.group)
  return g?.pages?.[path] ?? false
}

// 取得用戶對某頁面的覆蓋狀態
const getUserOverride = (path) => {
  return userPermModal.overrides[path] ?? 'inherit'
}

const setUserOverride = (path, val) => {
  userPermModal.overrides[path] = val
}

const clearAllOverrides = () => {
  userPermModal.overrides = {}
}

// ── 群組全選/全關 ──────────────────────────────────────────────────
const setAllPages = (val) => {
  pageList.forEach((p) => { groupModal.data.pages[p.path] = val })
}

const setSectionPages = (prefix, val) => {
  pageList.filter(p => p.path.startsWith(prefix)).forEach((p) => {
    groupModal.data.pages[p.path] = val
  })
}

// ── API：載入群組 ──────────────────────────────────────────────────
const fetchGroups = async () => {
  loadingGroups.value = true
  try {
    const [gRes, dRes] = await Promise.all([
      fetch(BASE.value + '/groups'),
      fetch(BASE.value + '/default-group')
    ])
    groups.value = await gRes.json()
    defaultGroup.value = (await dRes.json()).defaultGroup ?? 'guest'
  } catch (e) { console.error(e) } finally { loadingGroups.value = false }
}

// ── API：載入用戶 + 個人權限 ──────────────────────────────────────
const fetchUsers = async () => {
  loadingUsers.value = true
  try {
    const res = await fetch(CUST_BASE.value + '/list')
    customers.value = await res.json()

    // 批次拉個人權限
    const perms = await Promise.all(
      customers.value.map(c =>
        fetch(`${BASE.value}/user/${c.id}`).then(r => r.json())
      )
    )
    perms.forEach((p) => { if (p.customerId) userPermMap.value[p.customerId] = p })
  } catch (e) { console.error(e) } finally { loadingUsers.value = false }
}

// ── 開啟新增群組 ───────────────────────────────────────────────────
const openCreateGroup = () => {
  groupModal.isCreate = true
  groupModal.error = ''
  groupModal.data = { id: '', label: '', pages: Object.fromEntries(pageList.map(p => [p.path, false])) }
  groupModal.open = true
}

// ── 開啟編輯群組 ───────────────────────────────────────────────────
const openEditGroup = (g) => {
  groupModal.isCreate = false
  groupModal.error = ''
  groupModal.data = {
    id: g.id,
    label: g.label,
    pages: { ...Object.fromEntries(pageList.map(p => [p.path, false])), ...g.pages }
  }
  groupModal.open = true
}

// ── 儲存群組 ───────────────────────────────────────────────────────
const saveGroup = async () => {
  groupModal.error = ''
  if (!groupModal.data.label.trim()) { groupModal.error = '請輸入顯示名稱'; return }

  saving.value = true
  try {
    let res
    if (groupModal.isCreate) {
      if (!groupModal.data.id.trim()) { groupModal.error = '請輸入群組 ID'; saving.value = false; return }
      res = await fetch(BASE.value + '/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: groupModal.data.id, label: groupModal.data.label })
      })
      const d = await res.json()
      if (d.error) { groupModal.error = d.error; saving.value = false; return }
    }

    // 儲存頁面設定
    res = await fetch(`${BASE.value}/groups/${groupModal.data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: groupModal.data.label, pages: groupModal.data.pages })
    })
    const d = await res.json()
    if (d.error) { groupModal.error = d.error; return }

    await fetchGroups()
    groupModal.open = false
    showToast(groupModal.isCreate ? '群組已新增' : '群組已更新')
  } catch { groupModal.error = '連線失敗，請再試一次' } finally { saving.value = false }
}

// ── 設為預設群組 ───────────────────────────────────────────────────
const setAsDefault = async (groupId) => {
  try {
    await fetch(BASE.value + '/default-group', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: groupId })
    })
    defaultGroup.value = groupId
    showToast('預設群組已更新')
  } catch (e) { console.error(e) }
}

// ── 刪除群組 ───────────────────────────────────────────────────────
const confirmDeleteGroup = (g) => { deleteGroupTarget.value = g }

const doDeleteGroup = async () => {
  saving.value = true
  try {
    const res = await fetch(`${BASE.value}/groups/${deleteGroupTarget.value.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (d.success) {
      await fetchGroups()
      showToast('群組已刪除')
    }
  } catch (e) { console.error(e) } finally { saving.value = false; deleteGroupTarget.value = null }
}

// ── 開啟用戶權限 Modal ─────────────────────────────────────────────
const openUserPerm = (u) => {
  const perm = userPermMap.value[u.id]
  userPermModal.user = u
  userPermModal.group = perm?.group ?? defaultGroup.value

  // 把 pages 轉成 overrides 格式
  const overrides = {}
  if (perm?.pages) {
    Object.entries(perm.pages).forEach(([path, allow]) => {
      overrides[path] = allow ? 'allow' : 'deny'
    })
  }
  userPermModal.overrides = overrides
  userPermModal.open = true
}

// ── 儲存用戶權限 ───────────────────────────────────────────────────
const saveUserPerm = async () => {
  saving.value = true
  const customerId = userPermModal.user.id
  try {
    // 1. 儲存群組
    await fetch(`${BASE.value}/user/${customerId}/group`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: userPermModal.group })
    })

    // 2. 儲存個人覆蓋（逐頁處理）
    for (const [path, val] of Object.entries(userPermModal.overrides)) {
      if (val === 'inherit') {
        // 清除覆蓋
        await fetch(`${BASE.value}/user/${customerId}/page`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        })
      } else {
        await fetch(`${BASE.value}/user/${customerId}/page`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, allow: val === 'allow' })
        })
      }
    }

    // 3. 更新本地 cache
    const res = await fetch(`${BASE.value}/user/${customerId}`)
    userPermMap.value[customerId] = await res.json()

    userPermModal.open = false
    showToast('用戶權限已更新')
  } catch (e) { console.error(e) } finally { saving.value = false }
}

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(() => {
  fetchGroups()
  fetchUsers()
})

// 切換頁籤時才載入用戶（節省效能）
watch(activeTab, (tab) => {
  if (tab === 'users' && customers.value.length === 0) fetchUsers()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
