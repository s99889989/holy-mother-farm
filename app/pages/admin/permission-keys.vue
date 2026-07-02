<template>
  <div class="min-h-screen bg-surface2 transition-colors duration-300">
    <AdminNavbar />

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">K</div>
        <div>
          <h1 class="font-bold text-base-c text-sm sm:text-base leading-none">Permission Keys</h1>
          <p class="text-xs text-hint-c mt-0.5 hidden sm:block">新增頁面時在這裡新增 key，各群組會自動補上（預設關閉）</p>
        </div>
      </div>
    </header>

    <div class="max-w-full px-3 sm:px-4 lg:px-6 py-4">

      <div class="max-w-7xl mx-auto flex items-center justify-between mb-3 gap-2">
        <p class="text-xs text-hint-c">共 {{ keyDefs.length }} 個 key・{{ sections.length }} 個分類</p>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 text-xs border border-light-c text-muted-c rounded-lg hover-surface2 transition-colors flex items-center gap-1"
            @click="openSectionManager"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h6v6H3V4zm8 0h6v6h-6V4zM3 12h6v4H3v-4zm8 0h6v4h-6v-4z"/></svg>
            管理分類
          </button>
          <button
            class="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1"
            @click="openCreateKey()"
          >
            <span class="text-base leading-none">+</span> 新增 Key
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-hint-c gap-2">
        <div class="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />載入中…
      </div>

      <div v-else class="max-w-7xl mx-auto bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
        <div v-for="sec in sections" :key="sec.section" class="border-b border-light-c last:border-b-0">
          <!-- 分區標頭 -->
          <div class="px-4 py-2 bg-surface2 flex items-center justify-between">
            <span class="text-xs font-semibold text-hint-c uppercase tracking-wide">{{ sec.section }}</span>
            <div class="flex items-center gap-3">
              <span class="text-xs text-hint-c">{{ (keysBySection[sec.section] || []).length }} 個</span>
              <button
                class="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-0.5"
                @click="openCreateKey(sec.section)"
              >
                <span class="text-sm leading-none">+</span> 新增
              </button>
            </div>
          </div>

          <!-- 空分類提示 -->
          <div v-if="!(keysBySection[sec.section] || []).length" class="px-4 py-6 text-center text-hint-c text-xs">
            此分類尚無 key，
            <button class="text-violet-600 hover:underline" @click="openCreateKey(sec.section)">新增一個</button>
          </div>

          <!-- Key 卡片網格：手機單欄，平板雙欄，桌機三～四欄 -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-3">
            <div
              v-for="(kd, idx) in (keysBySection[sec.section] || [])" :key="kd.key"
              class="flex items-center gap-1.5 px-2 py-2 rounded-xl border border-light-c hover-surface2 transition-colors"
            >
              <!-- 排序上下鍵 -->
              <div class="flex flex-col flex-shrink-0">
                <button
                  class="text-hint-c hover:text-violet-600 disabled:opacity-20 disabled:pointer-events-none leading-none px-0.5"
                  :disabled="idx === 0"
                  title="上移"
                  @click="moveKey(sec.section, idx, -1)"
                ><svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 5l6 7H4l6-7z"/></svg></button>
                <button
                  class="text-hint-c hover:text-violet-600 disabled:opacity-20 disabled:pointer-events-none leading-none px-0.5"
                  :disabled="idx === (keysBySection[sec.section] || []).length - 1"
                  title="下移"
                  @click="moveKey(sec.section, idx, 1)"
                ><svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-6-7h12l-6 7z"/></svg></button>
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-base-c truncate" :title="kd.label">{{ kd.label }}</p>
                <p class="text-xs text-hint-c font-mono mt-0.5 break-all">{{ kd.key }}</p>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <button
                  class="px-2 py-1 text-xs border border-light-c text-muted-c rounded-lg hover-surface2 transition-colors"
                  @click="openEditKey(kd)"
                >編輯</button>
                <button
                  class="px-2 py-1 text-xs border border-red-200 dark:border-red-800 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  @click="confirmDeleteKey(kd)"
                >刪除</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="keyDefs.length === 0 && sections.length === 0" class="px-4 py-12 text-center text-hint-c text-sm">
          尚未定義任何 permission key
        </div>
      </div>

    </div>

    <!-- ══ 新增/編輯 Key Modal ══ -->
    <div v-if="keyModal.open" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 px-4 py-6 overflow-y-auto">
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 my-auto">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-bold text-base-c">{{ keyModal.isCreate ? '新增 Permission Key' : '編輯 Key：' + keyModal.originalKey }}</h3>
          <button class="text-hint-c hover:text-muted-c p-1" @click="keyModal.open = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="space-y-4">
          <!-- Key -->
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">
              Permission Key
              <span class="text-hint-c font-normal">（英數字、點、連字號）</span>
            </label>
            <input v-model="keyModal.data.key" placeholder="例如：staff.pos-analysis"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-violet-400 font-mono">
            <p v-if="!keyModal.isCreate && keyModal.data.key !== keyModal.originalKey"
               class="text-xs text-amber-500 mt-1">
              ⚠️ 重新命名不會遺失群組的開/關設定，但頁面 <code class="font-mono">definePageMeta({{ '{' }} requiredPermission {{ '}' }})</code> 需要手動同步改成新 key，否則權限檢查會失效。
            </p>
          </div>

          <!-- 中文標籤 -->
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">中文標籤</label>
            <input v-model="keyModal.data.label" placeholder="例如：POS 分析"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-violet-400">
          </div>

          <!-- 分區 -->
          <div>
            <label class="text-xs font-semibold text-muted-c block mb-1">分區</label>
            <div class="flex gap-2">
              <select v-model="keyModal.data.section"
                      class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-violet-400">
                <option v-for="s in sections" :key="s.section" :value="s.section">{{ s.section }}</option>
                <option value="__custom__">自訂分區…</option>
              </select>
              <input v-if="keyModal.data.section === '__custom__'"
                     v-model="keyModal.customSection" placeholder="輸入新分區名稱"
                     class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-violet-400">
            </div>
          </div>

          <p v-if="keyModal.isCreate" class="text-xs text-hint-c bg-surface2 rounded-xl px-3 py-2">
            新增後，所有現有群組將自動補上此 key（預設關閉），可到「權限組」頁面調整各群組設定。
          </p>

          <p v-if="keyModal.error" class="text-xs text-red-500">{{ keyModal.error }}</p>

          <div class="flex gap-2 pt-1">
            <button class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl transition-colors" @click="keyModal.open = false">取消</button>
            <button :disabled="saving"
                    class="flex-1 py-2.5 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    @click="saveKey">
              <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {{ saving ? '儲存中…' : '儲存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ 刪除確認（Key） ══ -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="font-bold text-base-c mb-2">確認刪除 Permission Key</h3>
        <p class="text-sm text-hint-c mb-1">
          確定要刪除「<span class="font-semibold text-base-c">{{ deleteTarget.label }}</span>」嗎？
        </p>
        <p class="text-xs text-red-500 mb-5">此 key 將從所有群組及個人設定中一併移除，且無法復原。</p>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 text-sm bg-surface2 text-muted-c rounded-xl transition-colors" @click="deleteTarget = null">取消</button>
          <button :disabled="saving"
                  class="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  @click="doDeleteKey">
            <div v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ saving ? '刪除中…' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ 管理分類 Modal ══ -->
    <div v-if="sectionModal.open" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 px-4 py-6 overflow-y-auto">
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 my-auto">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-base-c">管理分類</h3>
          <button class="text-hint-c hover:text-muted-c p-1" @click="sectionModal.open = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="text-xs text-hint-c mb-4">用上下鍵調整分類順序；刪除分類時，內部 key 會自動移到「其他」。</p>

        <div class="space-y-2 mb-4 max-h-[50vh] overflow-y-auto pr-0.5">
          <div
            v-for="(sec, idx) in sections" :key="sec.section"
            class="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-light-c"
          >
            <div class="flex flex-col flex-shrink-0">
              <button
                class="text-hint-c hover:text-violet-600 disabled:opacity-20 disabled:pointer-events-none leading-none px-0.5"
                :disabled="idx === 0" title="上移" @click="moveSection(idx, -1)"
              ><svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 5l6 7H4l6-7z"/></svg></button>
              <button
                class="text-hint-c hover:text-violet-600 disabled:opacity-20 disabled:pointer-events-none leading-none px-0.5"
                :disabled="idx === sections.length - 1" title="下移" @click="moveSection(idx, 1)"
              ><svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-6-7h12l-6 7z"/></svg></button>
            </div>

            <input
              v-if="renamingSection === sec.section"
              v-model="renameValue"
              class="flex-1 min-w-0 px-2 py-1 text-sm rounded-lg border border-violet-400 bg-surface text-base-c outline-none"
              @keyup.enter="doRenameSection(sec)"
              @blur="doRenameSection(sec)"
              @keyup.esc="renamingSection = null"
            >
            <span v-else class="flex-1 min-w-0 text-sm text-base-c truncate">{{ sec.section }}</span>

            <span class="text-xs text-hint-c flex-shrink-0">{{ sec.count }} 個</span>

            <button
              class="text-xs text-muted-c hover:text-violet-600 flex-shrink-0"
              @click="startRename(sec)"
            >改名</button>

            <button
              class="text-xs flex-shrink-0 transition-colors"
              :class="[deleteArmed === sec.section ? 'text-red-500 font-semibold' : 'text-muted-c hover:text-red-500', sec.section === '其他' ? 'opacity-20 pointer-events-none' : '']"
              @click="askDeleteSection(sec)"
            >{{ deleteArmed === sec.section ? '確定？' : '刪除' }}</button>
          </div>
        </div>

        <div class="flex gap-2">
          <input v-model="newSectionName" placeholder="新增分類名稱"
                 class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-violet-400"
                 @keyup.enter="doCreateSection">
          <button
            class="px-4 py-2 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors flex-shrink-0"
            @click="doCreateSection"
          >新增</button>
        </div>
        <p v-if="sectionModal.error" class="text-xs text-red-500 mt-2">{{ sectionModal.error }}</p>
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
definePageMeta({ layout: 'admin', pageLabel: 'Permission Keys' })

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/permission')

// ── 狀態 ──────────────────────────────────────────────────────────
const keyDefs    = ref([])
const sections   = ref([])   // [{ section, order, count }]，已依 order 排序
const loading    = ref(true)
const saving     = ref(false)
const deleteTarget = ref(null)
const toast = reactive({ show: false, message: '' })

const keyModal = reactive({
  open: false,
  isCreate: false,
  customSection: '',
  originalKey: '',   // 編輯模式下用來記住原始 key，才知道要 PUT 到哪個路徑
  data: { key: '', label: '', section: '' },
  error: ''
})

// ── 分類管理 Modal 狀態 ──────────────────────────────────────────────
const sectionModal = reactive({ open: false, error: '' })
const newSectionName  = ref('')
const renamingSection = ref(null)
const renameValue     = ref('')
const deleteArmed     = ref(null)

// ── Computed ──────────────────────────────────────────────────────
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
  toast.message = msg; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

// ── 載入 ──────────────────────────────────────────────────────────
const fetchKeys = async () => {
  try {
    const res = await fetch(BASE.value + '/keys')
    keyDefs.value = await res.json()
  } catch (e) { console.error(e) }
}

const fetchSections = async () => {
  try {
    const res = await fetch(BASE.value + '/sections')
    sections.value = await res.json()
  } catch (e) { console.error(e) }
}

const fetchAll = async () => {
  loading.value = true
  try {
    await Promise.all([fetchKeys(), fetchSections()])
  } finally { loading.value = false }
}

// ── Key 排序（分類內上下移） ──────────────────────────────────────
const moveKey = async (section, idx, dir) => {
  const list = [...(keysBySection.value[section] || [])]
  const j = idx + dir
  if (j < 0 || j >= list.length) return
    ;[list[idx], list[j]] = [list[j], list[idx]]
  try {
    await fetch(BASE.value + '/keys/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: list.map(k => k.key) })
    })
  } catch (e) { console.error(e) }
  await fetchKeys()
}

// ── 新增 Key（可指定預設分類） ────────────────────────────────────
const openCreateKey = (presetSection) => {
  keyModal.isCreate = true
  keyModal.error = ''
  keyModal.customSection = ''
  keyModal.originalKey = ''
  keyModal.data = { key: '', label: '', section: presetSection || sections.value[0]?.section || '其他' }
  keyModal.open = true
}

// ── 編輯 Key ──────────────────────────────────────────────────────
const openEditKey = (kd) => {
  keyModal.isCreate = false
  keyModal.error = ''
  keyModal.customSection = ''
  keyModal.originalKey = kd.key
  keyModal.data = { key: kd.key, label: kd.label, section: kd.section }
  keyModal.open = true
}

// ── 儲存 Key ──────────────────────────────────────────────────────
const saveKey = async () => {
  keyModal.error = ''
  if (!keyModal.data.key.trim())   { keyModal.error = '請輸入 permission key'; return }
  if (!keyModal.data.label.trim()) { keyModal.error = '請輸入中文標籤'; return }

  const section = keyModal.data.section === '__custom__'
    ? keyModal.customSection.trim()
    : keyModal.data.section.trim()
  if (!section) { keyModal.error = '請輸入分區名稱'; return }

  saving.value = true
  try {
    let res
    if (keyModal.isCreate) {
      res = await fetch(BASE.value + '/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyModal.data.key.trim(), label: keyModal.data.label.trim(), section })
      })
    } else {
      // PUT 到原本的 key 路徑；body 帶新的 key 值，後端會自動搬移各群組的設定
      res = await fetch(`${BASE.value}/keys/${encodeURIComponent(keyModal.originalKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyModal.data.key.trim(), label: keyModal.data.label.trim(), section })
      })
    }
    const d = await res.json()
    if (d.error) { keyModal.error = d.error; return }

    await fetchAll()
    keyModal.open = false
    showToast(keyModal.isCreate ? 'Permission Key 已新增' : 'Permission Key 已更新')
  } catch { keyModal.error = '連線失敗，請再試一次' } finally { saving.value = false }
}

// ── 刪除 Key ──────────────────────────────────────────────────────
const confirmDeleteKey = (kd) => { deleteTarget.value = kd }

const doDeleteKey = async () => {
  saving.value = true
  try {
    const res = await fetch(`${BASE.value}/keys/${encodeURIComponent(deleteTarget.value.key)}`, {method: 'DELETE'})
    const d = await res.json()
    if (d.success) {
      await fetchAll()
      showToast('Permission Key 已刪除')
    }
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
    deleteTarget.value = null
  }
}

// ── 分類管理 ──────────────────────────────────────────────────────
const openSectionManager = () => {
  sectionModal.open = true
  sectionModal.error = ''
  newSectionName.value = ''
  renamingSection.value = null
  deleteArmed.value = null
}

const moveSection = async (idx, dir) => {
  const j = idx + dir
  if (j < 0 || j >= sections.value.length) return
  const list = [...sections.value]
  ;[list[idx], list[j]] = [list[j], list[idx]]
  sections.value = list
  try {
    await fetch(BASE.value + '/sections/reorder', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sections: list.map(s => s.section)})
    })
  } catch (e) {
    console.error(e)
  }
  await fetchSections()
}

const doCreateSection = async () => {
  const name = newSectionName.value.trim()
  if (!name) return
  sectionModal.error = ''
  try {
    const res = await fetch(BASE.value + '/sections', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({section: name})
    })
    const d = await res.json()
    if (d.error) {
      sectionModal.error = d.error;
      return
    }
    newSectionName.value = ''
    await fetchSections()
    showToast('分類已新增')
  } catch {
    sectionModal.error = '連線失敗，請再試一次'
  }
}

const startRename = (sec) => {
  renamingSection.value = sec.section
  renameValue.value = sec.section
}

const doRenameSection = async (sec) => {
  if (renamingSection.value !== sec.section) return // 避免 enter + blur 重複觸發
  const newLabel = renameValue.value.trim()
  renamingSection.value = null
  if (!newLabel || newLabel === sec.section) return
  try {
    const res = await fetch(`${BASE.value}/sections/${encodeURIComponent(sec.section)}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({label: newLabel})
    })
    const d = await res.json()
    if (d.error) {
      sectionModal.error = d.error;
      return
    }
    await fetchAll()
    showToast('分類已重新命名')
  } catch {
    sectionModal.error = '連線失敗，請再試一次'
  }
}

const askDeleteSection = (sec) => {
  if (sec.section === '其他') return
  if (deleteArmed.value === sec.section) {
    doDeleteSection(sec)
  } else {
    deleteArmed.value = sec.section
    setTimeout(() => {
      if (deleteArmed.value === sec.section) deleteArmed.value = null
    }, 3000)
  }
}

const doDeleteSection = async (sec) => {
  deleteArmed.value = null
  try {
    const res = await fetch(`${BASE.value}/sections/${encodeURIComponent(sec.section)}`, {method: 'DELETE'})
    const d = await res.json()
    if (d.error) {
      sectionModal.error = d.error;
      return
    }
    await fetchAll()
    showToast('分類已刪除，原有 key 已移至「其他」')
  } catch {
    sectionModal.error = '連線失敗，請再試一次'
  }
}

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(() => fetchAll())
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
