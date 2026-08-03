<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'permission.permission-management' })

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/permission')

// ── 狀態 ──────────────────────────────────────────────────────────
const keyDefs = ref([])
const groups = ref([])
const defaultGroup = ref('guest')
const loadingGroups = ref(true)
const saving = ref(false)
const reordering = ref(false)
const deleteGroupTarget = ref(null)
const toast = reactive({ show: false, message: '' })

const groupModal = reactive({
  open: false,
  isCreate: false,
  data: {id: '', label: '', permissions: {}},
  error: ''
})

// ── Computed ──────────────────────────────────────────────────────
const allKeys = computed(() => keyDefs.value.map(k => k.key))

const keysBySection = computed(() => {
  const map = {}
  for (const kd of keyDefs.value) {
    const s = kd.section || '其他'
    if (!map[s]) map[s] = []
    map[s].push(kd)
  }
  return map
})

// ── 工具 ──────────────────────────────────────────────────────────
const showToast = (msg) => {
  toast.message = msg;
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

const countAllowed = perms => perms ? Object.values(perms).filter(Boolean).length : 0

// ── 群組全選/分區 ──────────────────────────────────────────────────
const setAllPerms = (val) => {
  allKeys.value.forEach((k) => {
    groupModal.data.permissions[k] = val
  })
}
const setSectionPerms = (sectionKeys, val) => {
  sectionKeys.forEach((kd) => {
    groupModal.data.permissions[kd.key] = val
  })
}

// ── 載入 ──────────────────────────────────────────────────────────
const fetchKeys = async () => {
  try {
    const res = await fetch(BASE.value + '/keys')
    keyDefs.value = await res.json()
  } catch (e) {
    console.error(e)
  }
}

const fetchGroups = async () => {
  loadingGroups.value = true
  try {
    const [gRes, dRes] = await Promise.all([
      fetch(BASE.value + '/groups'),
      fetch(BASE.value + '/default-group')
    ])
    groups.value = await gRes.json()
    defaultGroup.value = (await dRes.json()).defaultGroup ?? 'guest'
  } catch (e) {
    console.error(e)
  } finally {
    loadingGroups.value = false
  }
}

// ── 開啟新增群組 ──────────────────────────────────────────────────
const openCreateGroup = () => {
  groupModal.isCreate = true
  groupModal.error = ''
  groupModal.data = {
    id: '',
    label: '',
    permissions: Object.fromEntries(allKeys.value.map(k => [k, false]))
  }
  groupModal.open = true
}

// ── 開啟編輯群組 ──────────────────────────────────────────────────
const openEditGroup = (g) => {
  groupModal.isCreate = false
  groupModal.error = ''
  groupModal.data = {
    id: g.id,
    label: g.label,
    permissions: {...Object.fromEntries(allKeys.value.map(k => [k, false])), ...g.permissions}
  }
  groupModal.open = true
}

// ── 儲存群組 ──────────────────────────────────────────────────────
const saveGroup = async () => {
  groupModal.error = ''
  if (!groupModal.data.label.trim()) {
    groupModal.error = '請輸入顯示名稱';
    return
  }

  saving.value = true
  try {
    if (groupModal.isCreate) {
      if (!groupModal.data.id.trim()) {
        groupModal.error = '請輸入群組 ID';
        saving.value = false;
        return
      }
      const res = await fetch(BASE.value + '/groups', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: groupModal.data.id, label: groupModal.data.label})
      })
      const d = await res.json()
      if (d.error) {
        groupModal.error = d.error;
        saving.value = false;
        return
      }
    }

    const res = await fetch(`${BASE.value}/groups/${groupModal.data.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({label: groupModal.data.label, permissions: groupModal.data.permissions})
    })
    const d = await res.json()
    if (d.error) {
      groupModal.error = d.error;
      return
    }

    await fetchGroups()
    groupModal.open = false
    showToast(groupModal.isCreate ? '群組已新增' : '群組已更新')
  } catch {
    groupModal.error = '連線失敗，請再試一次'
  } finally {
    saving.value = false
  }
}

// ── 設為預設 ──────────────────────────────────────────────────────
const setAsDefault = async (groupId) => {
  try {
    await fetch(BASE.value + '/default-group', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({group: groupId})
    })
    defaultGroup.value = groupId
    showToast('預設群組已更新')
  } catch (e) {
    console.error(e)
  }
}

// ── 調整排序 ──────────────────────────────────────────────────────
const moveGroup = async (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= groups.value.length || reordering.value) return

  const reordered = [...groups.value]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(targetIndex, 0, moved)
  groups.value = reordered

  reordering.value = true
  try {
    await fetch(BASE.value + '/groups/reorder', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({groups: reordered.map(g => g.id)})
    })
  } catch (e) {
    console.error(e)
  } finally {
    reordering.value = false
  }
}

// ── 刪除群組 ──────────────────────────────────────────────────────
const confirmDeleteGroup = (g) => {
  deleteGroupTarget.value = g
}

const doDeleteGroup = async () => {
  saving.value = true
  try {
    const res = await fetch(`${BASE.value}/groups/${deleteGroupTarget.value.id}`, {method: 'DELETE'})
    const d = await res.json()
    if (d.success) {
      await fetchGroups()
      showToast('群組已刪除')
    }
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
    deleteGroupTarget.value = null
  }
}

// ── 初始化（keys 先載，groups 依賴 keyDefs 展開 checkbox）──────────
onMounted(async () => {
  await fetchKeys()
  fetchGroups()
})
</script>

<template>
  <div class="min-h-screen bg-surface2 transition-colors duration-300">
    <AdminNavbar/>

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          權
        </div>
        <div>
          <h1 class="font-bold text-base-c text-sm sm:text-base leading-none">
            權限組
          </h1>
          <p class="text-xs text-hint-c mt-0.5 hidden sm:block">
            Permission Groups
          </p>
        </div>
      </div>
    </header>

    <div class="max-w-full px-3 sm:px-4 py-4">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs text-hint-c">
          共 {{ groups.length }} 個群組，預設：
          <span class="font-semibold text-violet-600">{{ defaultGroup }}</span>
        </p>
        <button
          class="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1"
          @click="openCreateGroup"
        >
          <span class="text-base leading-none">+</span> 新增群組
        </button>
      </div>

      <div
        v-if="loadingGroups"
        class="flex items-center justify-center py-16 text-hint-c gap-2"
      >
        <div class="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"/>
        載入中…
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <div
          v-for="(g, index) in groups"
          :key="g.id"
          class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden"
        >
          <!-- 群組標頭 -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-light-c">
            <div class="flex items-center gap-2">
              <!-- 排序按鈕 -->
              <div class="flex flex-col gap-0.5 mr-0.5">
                <button
                  :disabled="index === 0 || reordering"
                  class="w-5 h-5 flex items-center justify-center rounded text-hint-c hover:text-violet-600 hover-surface2 disabled:opacity-30 disabled:hover:text-hint-c transition-colors"
                  title="上移"
                  @click="moveGroup(index, -1)"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
                <button
                  :disabled="index === groups.length - 1 || reordering"
                  class="w-5 h-5 flex items-center justify-center rounded text-hint-c hover:text-violet-600 hover-surface2 disabled:opacity-30 disabled:hover:text-hint-c transition-colors"
                  title="下移"
                  @click="moveGroup(index, 1)"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
              <span
                class="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 text-xs font-bold">{{
                  g.label?.charAt(0)
                }}</span>
              <div>
                <p class="font-semibold text-base-c text-sm">
                  {{ g.label }}
                </p>
                <p class="text-xs text-hint-c">
                  ID: {{ g.id }}
                </p>
              </div>
              <span
                v-if="g.id === defaultGroup"
                class="px-2 py-0.5 text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-full font-medium ml-1"
              >預設</span>
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
                class="px-2 py-1 text-xs border border-light-c text-muted-c rounded-lg hover-surface2 transition-colors"
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

          <!-- 權限預覽 -->
          <div class="px-4 py-3">
            <p class="text-xs text-hint-c mb-2">
              {{ countAllowed(g.permissions) }} / {{ allKeys.length }} 項已開啟
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="kd in keyDefs"
                :key="kd.key"
                :class="g.permissions[kd.key] ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-surface2 text-hint-c'"
                class="px-2 py-0.5 text-xs rounded-full"
              >{{ kd.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ 新增/編輯群組 Modal ══ -->
    <div
      v-if="groupModal.open"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 px-4 py-6 overflow-y-auto"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-2xl p-6 my-auto">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-bold text-base-c">
            {{ groupModal.isCreate ? '新增權限組' : '編輯權限組：' + groupModal.data.label }}
          </h3>
          <button
            class="text-hint-c hover:text-muted-c p-1"
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
            <label class="text-xs font-semibold text-muted-c block mb-1">群組 ID <span class="text-hint-c font-normal">（英數字，建立後不能更改）</span></label>
            <input
              v-model="groupModal.data.id"
              placeholder="例如：senior、manager"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-violet-400"
            >
          </div>

          <!-- 名稱 -->
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">顯示名稱</label>
            <input
              v-model="groupModal.data.label"
              placeholder="例如：資深員工、主管"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-violet-400"
            >
          </div>

          <!-- 權限設定（動態從 keyDefs 產生分區） -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-muted-c">權限設定</label>
              <div class="flex gap-2">
                <button
                  class="text-xs text-green-600 hover:underline"
                  @click="setAllPerms(true)"
                >
                  全部開啟
                </button>
                <span class="text-hint-c">|</span>
                <button
                  class="text-xs text-red-500 hover:underline"
                  @click="setAllPerms(false)"
                >
                  全部關閉
                </button>
              </div>
            </div>

            <div
              v-for="(sectionKeys, sectionName) in keysBySection"
              :key="sectionName"
              class="mb-4"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-hint-c uppercase tracking-wide">{{ sectionName }}</span>
                <div class="flex-1 h-px bg-surface2"/>
                <button
                  class="text-xs text-green-600 hover:underline"
                  @click="setSectionPerms(sectionKeys, true)"
                >
                  全開
                </button>
                <button
                  class="text-xs text-red-500 hover:underline"
                  @click="setSectionPerms(sectionKeys, false)"
                >
                  全關
                </button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <label
                  v-for="kd in sectionKeys"
                  :key="kd.key"
                  class="flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors"
                  :class="groupModal.data.permissions[kd.key]
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                    : 'border-light-c hover-surface2'"
                >
                  <input
                    type="checkbox"
                    :checked="groupModal.data.permissions[kd.key]"
                    class="accent-violet-600 w-3.5 h-3.5 flex-shrink-0"
                    @change="groupModal.data.permissions[kd.key] = $event.target.checked"
                  >
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-base-c">{{ kd.label }}</p>
                    <p class="text-xs text-hint-c font-mono">{{ kd.key }}</p>
                  </div>
                </label>
              </div>
            </div>

            <div
              v-if="keyDefs.length === 0"
              class="text-xs text-hint-c text-center py-4"
            >
              尚未定義任何 permission key，請先至「Permission Keys」頁面新增。
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
              class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl transition-colors"
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

    <!-- ══ 刪除群組確認 ══ -->
    <div
      v-if="deleteGroupTarget"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="font-bold text-base-c mb-2">
          確認刪除群組
        </h3>
        <p class="text-sm text-hint-c mb-5">
          確定要刪除「<span class="font-semibold text-base-c">{{ deleteGroupTarget.label }}</span>」嗎？<br>
          已套用此群組的用戶將改為預設群組。
        </p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl transition-colors"
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
        class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap"
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

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
