<template>
  <ClientOnly>
    <div class="p-3 sm:p-4">
      <div class="mb-3 flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">360 環景導覽管理</h1>
        <NuxtLink
          to="/staff/content/tour/preview"
          target="_blank"
          class="text-xs text-green-700 dark:text-green-400 hover:underline"
        >
          🔍 開啟預覽頁 →
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
        <!-- 左側：分類 + 場景列表 + 上傳 -->
        <div>
          <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
            <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">分類</div>
            <div class="flex gap-1.5">
              <template v-if="editingCategoryName !== null">
                <input
                  v-model="editingCategoryNewValue"
                  placeholder="新的分類名稱"
                  class="flex-1 min-w-0 border border-green-500 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-md px-2 py-1.5 text-xs"
                  @keyup.enter="saveEditCategory"
                  @keyup.esc="cancelEditCategory"
                />
                <button
                  class="shrink-0 text-green-700 dark:text-green-400 text-sm px-1.5"
                  title="儲存"
                  @click="saveEditCategory"
                >
                  ✓
                </button>
                <button
                  class="shrink-0 text-gray-400 dark:text-gray-500 text-sm px-1.5"
                  title="取消"
                  @click="cancelEditCategory"
                >
                  ✕
                </button>
              </template>
              <template v-else>
                <select
                  v-model="activeCategory"
                  class="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-md px-2 py-1.5 text-xs"
                >
                  <option :value="null">全部（{{ scenes.length }}）</option>
                  <option value="">未分類（{{ scenesInCategoryCount('') }}）</option>
                  <option v-for="c in categoryList" :key="c" :value="c">
                    {{ c }}（{{ scenesInCategoryCount(c) }}）{{ blockedCategories.includes(c) ? ' 🔒遊客不可見' : '' }}
                  </option>
                </select>
                <button
                  v-if="activeCategory !== null && activeCategory !== ''"
                  class="shrink-0 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-2.5 py-1 text-xs"
                  title="改分類名稱"
                  @click="startEditCategory(activeCategory)"
                >
                  改名
                </button>
                <button
                  v-if="activeCategory !== null && activeCategory !== ''"
                  class="shrink-0 border rounded-md px-2.5 py-1 text-xs"
                  :class="isActiveCategoryBlocked
                    ? 'border-amber-400 dark:border-amber-600 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
                  :title="isActiveCategoryBlocked
                    ? '目前遊客瀏覽頁看不到這個分類，點擊改成開放'
                    : '點擊後遊客瀏覽頁（front/tour/）會完全看不到這個分類底下的場景，也連不進去'"
                  @click="toggleCategoryBlocked(activeCategory)"
                >
                  {{ isActiveCategoryBlocked ? '🔒 遊客不可見' : '🔓 遊客可見' }}
                </button>
                <button
                  v-if="activeCategory !== null && activeCategory !== ''"
                  class="shrink-0 border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md px-2.5 py-1 text-xs"
                  title="刪除這個分類（底下場景會變成未分類，場景本身不會被刪除）"
                  @click="deleteCategory(activeCategory)"
                >
                  刪除
                </button>
              </template>
            </div>
            <div class="flex gap-1.5 mt-2">
              <input
                v-model="newCategoryName"
                placeholder="新增分類名稱"
                class="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md px-2 py-1 text-xs"
                @keyup.enter="addCategory"
              />
              <button
                class="bg-green-700 hover:bg-green-800 text-white rounded-md px-3 py-1 text-xs"
                @click="addCategory"
              >
                新增
              </button>
            </div>
            <p class="text-[10.5px] text-gray-400 dark:text-gray-500 mt-2">
              分類只是場景列表的自由標籤，方便管理，不對應任何地圖或平面圖。先在這裡新增，上傳/編輯場景時就能用選的。
            </p>
          </section>

          <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
            <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">上傳全景圖</div>
            <label class="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">分類</label>
            <select
              v-model="uploadCategory"
              class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-md px-2 py-1 text-xs mb-2"
            >
              <option value="">未分類</option>
              <option v-for="c in categoryList" :key="c" :value="c">{{ c }}</option>
            </select>
            <div
              class="border-2 border-dashed rounded-lg px-3 py-5 text-center text-xs cursor-pointer transition-colors"
              :class="isDragging
              ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-300 dark:border-gray-600'"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onDrop"
              @click="fileInput?.click()"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg"
                multiple
                class="hidden"
                @change="onFilePick"
              />
              <p v-if="!uploading" class="text-gray-500 dark:text-gray-400">
                拖曳全景圖到此，或點擊選檔<br />
                <small>上傳後自動切 tile，不需要另外處理</small>
              </p>
              <p v-else class="text-gray-500 dark:text-gray-400">處理中… {{ uploadProgress }}</p>
            </div>
          </section>

          <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
            <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {{ activeCategory === null ? '全部' : (activeCategory === '' ? '未分類' : activeCategory) }} 場景列表
            </div>
            <ul class="list-none m-0 p-0">
              <li
                v-for="s in scenesFiltered"
                :key="s.id"
                class="flex justify-between items-center px-2.5 py-1.5 rounded-md cursor-pointer text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                :class="{ 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold': s.id === selectedSceneId }"
                @click="selectScene(s.id)"
              >
                <template v-if="editingSceneId === s.id">
                  <div class="flex-1 min-w-0 flex items-center gap-1" @click.stop>
                    <input
                      v-model="editingNameValue"
                      placeholder="名稱"
                      class="flex-1 min-w-0 border border-green-500 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded px-1.5 py-0.5 text-sm"
                      @keyup.enter="saveSceneMeta"
                      @keyup.esc="cancelEditName"
                    />
                    <select
                      v-model="editingCategoryValue"
                      class="w-20 shrink-0 border border-green-500 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded px-1 py-0.5 text-sm"
                      @keyup.enter="saveSceneMeta"
                      @keyup.esc="cancelEditName"
                    >
                      <option value="">未分類</option>
                      <option v-for="c in categoryList" :key="c" :value="c">{{ c }}</option>
                    </select>
                    <button class="text-green-700 dark:text-green-400 text-sm px-0.5" title="儲存" @click="saveSceneMeta">✓</button>
                    <button class="text-gray-400 dark:text-gray-500 text-sm px-0.5" title="取消" @click="cancelEditName">✕</button>
                  </div>
                </template>
                <template v-else>
                <span class="flex items-center gap-1.5 truncate">
                  <span v-if="s.quickPoint" class="text-amber-400 shrink-0" title="快速點">★</span>
                  <span v-if="s.id === settings.startSceneId" class="text-sky-400 shrink-0" title="預設進入場景">🚪</span>
                  {{ s.name }}
                  <span class="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{{ s.category || '未分類' }}</span>
                </span>
                  <div class="flex items-center gap-0.5 shrink-0">
                    <button
                      class="bg-transparent border-none text-xs leading-none px-1"
                      :class="s.quickPoint ? 'text-amber-400' : 'text-gray-400 dark:text-gray-500 hover:text-amber-400'"
                      title="標記為快速點"
                      @click.stop="toggleQuickPoint(s)"
                    >
                      {{ s.quickPoint ? '★' : '☆' }}
                    </button>
                    <button
                      class="bg-transparent border-none text-gray-400 dark:text-gray-500 hover:text-green-700 dark:hover:text-green-400 text-xs leading-none px-1"
                      title="重新命名／改分類"
                      @click.stop="startEditName(s)"
                    >
                      ✎
                    </button>
                    <button
                      class="bg-transparent border-none text-red-500 dark:text-red-400 text-base leading-none px-1"
                      title="刪除場景"
                      @click.stop="deleteScene(s.id)"
                    >
                      ×
                    </button>
                  </div>
                </template>
              </li>
              <li v-if="!scenesFiltered.length" class="text-[12px] text-gray-400 dark:text-gray-500 py-2">尚無場景</li>
            </ul>
          </section>
        </div>

        <!-- 右側：全景檢視 + 熱點編輯（固定深色，作為看圖區） -->
        <div class="bg-[#10171a] rounded-xl min-h-[420px] lg:min-h-[600px] flex flex-col overflow-hidden relative">
          <div
            v-if="!selectedScene"
            class="absolute inset-0 z-10 flex items-center justify-center text-[#6f8480] text-sm bg-[#10171a]"
          >
            選一個場景，或上傳新的全景圖開始編輯熱點
          </div>

          <div v-show="selectedScene" class="flex items-center gap-3 sm:gap-5 px-3 sm:px-4 py-2.5 bg-[#1a2327] text-[#eef3f2] text-sm flex-wrap">
            <input
              v-if="selectedScene && editingSceneId === selectedScene.id"
              v-model="editingNameValue"
              class="bg-[#0c1412] border border-[#4fae8f] text-[#eef3f2] rounded px-2 py-1 text-sm"
              @keyup.enter="saveSceneMeta"
              @keyup.esc="cancelEditName"
              @blur="saveSceneMeta"
            />
            <strong v-else class="cursor-pointer hover:underline decoration-dotted" title="點擊重新命名" @click="selectedScene && startEditName(selectedScene)">
              {{ selectedScene?.name }} ✎
            </strong>
            <div class="flex items-center gap-2 ml-auto">
              <label>熱點拾取模式</label>
              <div
                class="w-[34px] h-[19px] rounded-full relative cursor-pointer transition-colors"
                :class="pickMode ? 'bg-[#4fae8f]' : 'bg-[#2a3438]'"
                @click="pickMode = !pickMode"
              >
                <span
                  class="absolute top-[2px] w-[15px] h-[15px] bg-white rounded-full transition-all"
                  :class="pickMode ? 'left-[17px]' : 'left-[2px]'"
                ></span>
              </div>
            </div>
            <button
              class="bg-[#2a3438] hover:bg-[#33403f] text-[#eef3f2] text-xs rounded-md px-3 py-1.5"
              title="把目前正在看的角度存成訪客進來時的預設視角"
              @click="saveInitialView"
            >
              📌 設為起始視角
            </button>
            <button
              class="text-xs rounded-md px-3 py-1.5"
              :class="selectedScene && settings.startSceneId === selectedScene.id
                ? 'bg-[#4fae8f] text-[#0c1412]'
                : 'bg-[#2a3438] hover:bg-[#33403f] text-[#eef3f2]'"
              title="訪客第一次打開導覽（瀏覽器裡還沒有瀏覽紀錄）時，預設會看到這張場景"
              @click="setAsStartScene"
            >
              {{ selectedScene && settings.startSceneId === selectedScene.id ? '🚪 目前的預設進入場景' : '🚪 設為預設進入場景' }}
            </button>
            <button
              class="bg-[#2a3438] hover:bg-[#33403f] text-[#eef3f2] text-xs rounded-md px-3 py-1.5"
              @click="openGroupEdit"
            >
              🔗 同空間群組
            </button>
            <button
              class="bg-[#2a3438] hover:bg-[#33403f] disabled:opacity-50 disabled:cursor-not-allowed text-[#eef3f2] text-xs rounded-md px-3 py-1.5"
              title="上傳另一張全景圖，取代目前這張（tile 和預覽圖都會重新產生）"
              :disabled="replacingImage"
              @click="triggerReplaceImage"
            >
              {{ replacingImage ? '處理中…' : '🖼 更換全景圖' }}
            </button>
            <input
              ref="replaceImageInput"
              type="file"
              accept="image/jpeg"
              class="hidden"
              @change="onReplaceImagePick"
            />
          </div>

          <div
            v-if="sceneGroupMembers.length > 1"
            class="flex items-center gap-2 px-4 py-2 bg-[#161f22] border-b border-[#2a3438] flex-wrap"
          >
            <span class="text-[11px] text-[#6f8480]">同空間切換：</span>
            <button
              v-for="m in sceneGroupMembers"
              :key="m.id"
              class="text-xs rounded-full px-3 py-1"
              :class="m.id === selectedSceneId
                ? 'bg-[#4fae8f] text-[#0c1412]'
                : 'bg-[#2a3438] text-[#eef3f2] hover:bg-[#33403f]'"
              @click="selectScene(m.id)"
            >
              {{ m.name }}
            </button>
          </div>

          <div id="admin-viewer" :style="{ height: viewerHeight + 'px', width: '100%' }"></div>

          <!-- 熱點目標選擇彈窗 -->
          <div
            v-if="pendingHotspot"
            class="absolute inset-0 bg-black/45 flex items-center justify-center z-10 p-4"
          >
            <div class="bg-white dark:bg-gray-800 rounded-xl p-4.5 w-full max-w-[300px]">
              <h3 class="m-0 mb-3 text-sm text-gray-800 dark:text-gray-100">新增熱點</h3>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">先篩選分類（可略過）</label>
              <select
                v-model="pendingHotspotCategory"
                class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-md px-2 py-1.5 text-sm box-border"
                @change="pendingHotspot.targetSceneId = ''"
              >
                <option :value="null">全部</option>
                <option value="">未分類</option>
                <option v-for="c in categoryList" :key="c" :value="c">{{ c }}</option>
              </select>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">目標場景</label>
              <select
                v-model="pendingHotspot.targetSceneId"
                class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-md px-2 py-1.5 text-sm box-border"
              >
                <option value="" disabled>選擇要跳到哪個場景</option>
                <option
                  v-for="s in targetSceneOptions"
                  :key="s.id"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </select>
              <p v-if="!targetSceneOptions.length" class="text-[11px] text-orange-500 dark:text-orange-400 mt-1">
                這個分類底下沒有其他場景
              </p>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">標籤文字</label>
              <input
                v-model="pendingHotspot.label"
                placeholder="例如：前往臥室"
                class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md px-2 py-1.5 text-sm box-border"
              />
              <div class="flex gap-2 mt-3.5 justify-end">
                <button
                  class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-none rounded-md px-3.5 py-1.5 text-xs"
                  @click="pendingHotspot = null"
                >
                  取消
                </button>
                <button
                  class="bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white border-none rounded-md px-3.5 py-1.5 text-xs"
                  :disabled="!pendingHotspot.targetSceneId"
                  @click="saveHotspot"
                >
                  儲存熱點
                </button>
              </div>
            </div>
          </div>

          <!-- 同空間群組編輯彈窗 -->
          <div
            v-if="groupEditMode"
            class="absolute inset-0 bg-black/70 flex items-center justify-center z-20 p-4"
          >
            <div class="bg-white dark:bg-gray-800 rounded-xl p-4 w-[92%] max-w-[360px]">
              <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                「{{ selectedScene.name }}」的同空間群組
              </h3>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                勾選跟這個場景是同一個實際空間的其他場景，之後可以用切換鈕直接跳，不用點熱點
              </p>
              <ul class="list-none m-0 p-0 max-h-[240px] overflow-y-auto">
                <li
                  v-for="s in scenesInSameCategory"
                  :key="s.id"
                  class="flex items-center gap-2 py-1.5 text-sm text-gray-700 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    :id="`grp-${s.id}`"
                    :checked="groupEditSelection.has(s.id)"
                    @change="toggleGroupSelection(s.id)"
                  />
                  <label :for="`grp-${s.id}`" class="cursor-pointer">{{ s.name }}</label>
                </li>
                <li v-if="!scenesInSameCategory.length" class="text-[12px] text-gray-400 dark:text-gray-500 py-2">
                  這個分類沒有其他場景
                </li>
              </ul>
              <div class="flex gap-2 mt-3 justify-end">
                <button
                  class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-none rounded-md px-3.5 py-1.5 text-xs"
                  @click="groupEditMode = false"
                >
                  取消
                </button>
                <button
                  class="bg-green-700 hover:bg-green-800 text-white border-none rounded-md px-3.5 py-1.5 text-xs"
                  @click="saveGroupEdit"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>

          <div v-show="selectedScene" class="bg-[#1a2327] text-[#eef3f2] px-4 py-2.5 text-xs max-h-[140px] overflow-y-auto">
            <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">此場景的熱點</div>
            <ul class="list-none m-0 p-0">
              <li
                v-for="h in hotspotsForCurrentScene"
                :key="h.id"
                class="flex justify-between py-1 border-b border-[#2a3438]"
              >
                <span>{{ h.label || '(無標籤)' }} → {{ sceneName(h.targetSceneId) }}</span>
                <button
                  class="bg-transparent border-none text-red-400 text-base leading-none px-1"
                  @click="deleteHotspot(h.id)"
                >
                  ×
                </button>
              </li>
              <li v-if="!hotspotsForCurrentScene.length" class="text-[#6f8480] py-1">尚無熱點</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

definePageMeta({
  layout: 'staff'
})

// -----------------------------------------------------------------------
// API base：比照專案慣例走 commonStore.data.main_url
// -----------------------------------------------------------------------
const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url + '/holy/tour')

const scenes = ref([])
const hotspots = ref([])
const categoryList = ref([])
const settings = ref({ startSceneId: null, blockedCategories: [] })

const activeCategory = ref(null)
const selectedSceneId = ref(null)
const uploadCategory = ref('')
const newCategoryName = ref('')
const editingCategoryName = ref(null)
const editingCategoryNewValue = ref('')

const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref('')
const fileInput = ref(null)

const pickMode = ref(false)
const pendingHotspot = ref(null)
const pendingHotspotCategory = ref(null)
const groupEditMode = ref(false)
const groupEditSelection = ref(new Set())

const editingSceneId = ref(null)
const editingNameValue = ref('')
const editingCategoryValue = ref('')

const replaceImageInput = ref(null)
const replacingImage = ref(false)

const viewerHeight = ref(600)

let viewer = null
let markersPlugin = null

const selectedScene = computed(() => scenes.value.find((s) => s.id === selectedSceneId.value))
const allScenesExceptCurrent = computed(() =>
  scenes.value.filter((s) => s.id !== selectedSceneId.value)
)
const targetSceneOptions = computed(() => {
  if (pendingHotspotCategory.value === null) return allScenesExceptCurrent.value
  if (pendingHotspotCategory.value === '') return allScenesExceptCurrent.value.filter((s) => !s.category)
  return allScenesExceptCurrent.value.filter((s) => s.category === pendingHotspotCategory.value)
})
const hotspotsForCurrentScene = computed(() =>
  hotspots.value.filter((h) => h.sceneId === selectedSceneId.value)
)
const scenesFiltered = computed(() => {
  if (activeCategory.value === null) return scenes.value
  if (activeCategory.value === '') return scenes.value.filter((s) => !s.category)
  return scenes.value.filter((s) => s.category === activeCategory.value)
})
const scenesInSameCategory = computed(() =>
  scenes.value.filter(
    (s) => (s.category || null) === (selectedScene.value?.category || null) && s.id !== selectedSceneId.value
  )
)
const sceneGroupMembers = computed(() => {
  if (!selectedScene.value?.groupId) return []
  return scenes.value.filter((s) => s.groupId === selectedScene.value.groupId)
})

// 遊客不可見的分類清單（即 settings.blockedCategories），這裡統一開一個
// computed 是為了防呆：settings.value 剛載入完成前可能還沒有這個欄位
const blockedCategories = computed(() => settings.value.blockedCategories || [])
const isActiveCategoryBlocked = computed(
  () => activeCategory.value !== null && activeCategory.value !== '' && blockedCategories.value.includes(activeCategory.value)
)

function scenesInCategoryCount(category) {
  if (category === '') return scenes.value.filter((s) => !s.category).length
  return scenes.value.filter((s) => s.category === category).length
}

function sceneName(id) {
  return scenes.value.find((s) => s.id === id)?.name || '(已刪除場景)'
}

// 重新命名／改分類：只改顯示用的中繼資料，不動底層檔案/tile
function startEditName(scene) {
  editingSceneId.value = scene.id
  editingNameValue.value = scene.name
  editingCategoryValue.value = scene.category || ''
}

function cancelEditName() {
  editingSceneId.value = null
}

async function saveSceneMeta() {
  const id = editingSceneId.value
  if (!id) return
  const scene = scenes.value.find((s) => s.id === id)
  const newName = editingNameValue.value.trim()
  const newCategory = editingCategoryValue.value.trim() || null
  editingSceneId.value = null
  if (!scene || !newName) return
  if (newName === scene.name && newCategory === (scene.category || null)) return
  const updated = await $fetch(`${apiBase.value}/scenes/${id}`, {
    method: 'PUT',
    body: { ...scene, name: newName, category: newCategory }
  })
  const idx = scenes.value.findIndex((s) => s.id === id)
  if (idx !== -1) scenes.value[idx] = updated
}

async function toggleQuickPoint(scene) {
  const updated = await $fetch(`${apiBase.value}/scenes/${scene.id}`, {
    method: 'PUT',
    body: { ...scene, quickPoint: !scene.quickPoint }
  })
  const idx = scenes.value.findIndex((s) => s.id === scene.id)
  if (idx !== -1) scenes.value[idx] = updated
}

// 把目前正在看的視角存成這個場景的起始視角（訪客進來時預設看到的方向）
async function saveInitialView() {
  const scene = selectedScene.value
  if (!scene || !viewer) return
  const pos = viewer.getPosition()
  const initialYaw = +((pos.yaw * 180) / Math.PI).toFixed(2)
  const initialPitch = +((pos.pitch * 180) / Math.PI).toFixed(2)
  const updated = await $fetch(`${apiBase.value}/scenes/${scene.id}`, {
    method: 'PUT',
    body: { ...scene, initialYaw, initialPitch }
  })
  const idx = scenes.value.findIndex((s) => s.id === scene.id)
  if (idx !== -1) scenes.value[idx] = updated
}

// 設定訪客第一次打開導覽（瀏覽器裡沒有瀏覽紀錄）時預設看到的場景。
// 方向直接沿用這個場景自己的 initialYaw/initialPitch（上面「設為起始視角」設的那組），
// 不用另外存一份方向設定。
//
// PUT /settings 是整包覆蓋，所以這裡要把目前的 settings 全部帶上，只改
// startSceneId 這一個欄位，不然會把 blockedCategories 也一起洗掉。
async function setAsStartScene() {
  const scene = selectedScene.value
  if (!scene) return
  const updated = await $fetch(`${apiBase.value}/settings`, {
    method: 'PUT',
    body: { ...settings.value, startSceneId: scene.id }
  })
  settings.value = updated
}

// 切換某個分類是否限制遊客瀏覽（front/tour/ 看不看得到）。
// 同樣要帶上完整的 settings，只改 blockedCategories 這一個欄位。
async function toggleCategoryBlocked(category) {
  if (category === null || category === '') return
  const current = blockedCategories.value
  const next = current.includes(category)
    ? current.filter((c) => c !== category)
    : [...current, category]
  const updated = await $fetch(`${apiBase.value}/settings`, {
    method: 'PUT',
    body: { ...settings.value, blockedCategories: next }
  })
  settings.value = updated
}

// 導覽區高度依「視窗剩餘空間」動態算，不再寫死 600px；下方還有一段熱點清單要留空間
function updateViewerHeight() {
  nextTick(() => {
    const el = document.getElementById('admin-viewer')
    if (!el) return
    const top = el.getBoundingClientRect().top
    const bottomReserve = 170
    const h = window.innerHeight - top - bottomReserve
    viewerHeight.value = Math.max(360, Math.round(h))
  })
}

async function loadAll() {
  const data = await $fetch(`${apiBase.value}/data`)
  scenes.value = data.scenes || []
  hotspots.value = data.hotspots || []
  settings.value = data.settings || { startSceneId: null, blockedCategories: [] }
}

async function loadCategories() {
  categoryList.value = await $fetch(`${apiBase.value}/categories`)
}

async function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  categoryList.value = await $fetch(`${apiBase.value}/categories`, {
    method: 'POST',
    body: { name }
  })
  newCategoryName.value = ''
}

// 刪除分類：分類底下的場景會被後端一併改成未分類，場景本身不會被刪除
async function deleteCategory(name) {
  if (!confirm(`確定要刪除分類「${name}」？底下的場景會變成未分類，場景本身不會被刪除`)) return
  categoryList.value = await $fetch(`${apiBase.value}/categories/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  })
  activeCategory.value = null
  await loadAll()
}

function startEditCategory(name) {
  editingCategoryName.value = name
  editingCategoryNewValue.value = name
}

function cancelEditCategory() {
  editingCategoryName.value = null
}

// 改分類名稱：底下場景會被後端一併同步改成新名字；如果新名字跟現有分類撞名，
// 後端會當作合併處理，不會出現兩個同名分類
async function saveEditCategory() {
  const oldName = editingCategoryName.value
  const newName = editingCategoryNewValue.value.trim()
  editingCategoryName.value = null
  if (oldName === null || !newName || newName === oldName) return
  categoryList.value = await $fetch(`${apiBase.value}/categories/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    body: { name: newName }
  })
  if (activeCategory.value === oldName) activeCategory.value = newName
  await loadAll()
}

function onDrop(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files).filter((f) => f.type === 'image/jpeg')
  uploadFiles(files)
}

function onFilePick(e) {
  const files = Array.from(e.target.files)
  uploadFiles(files)
  e.target.value = ''
}

async function uploadFiles(files) {
  if (!files.length) return
  uploading.value = true
  const category = uploadCategory.value.trim() || ''
  for (let i = 0; i < files.length; i++) {
    uploadProgress.value = `${i + 1}/${files.length}`
    const form = new FormData()
    form.append('file', files[i])
    form.append('name', files[i].name.replace(/\.[^.]+$/, ''))
    form.append('category', category)
    try {
      const scene = await $fetch(`${apiBase.value}/scene/upload`, {
        method: 'POST',
        body: form
      })
      scenes.value.push(scene)
    } catch (err) {
      alert(`上傳失敗：${files[i].name} — ${err.data?.error || err.message}`)
    }
  }
  uploading.value = false
  uploadProgress.value = ''
}

async function deleteScene(id) {
  if (!confirm('確定刪除這個場景？相關熱點也會一併刪除')) return
  await $fetch(`${apiBase.value}/scenes/${id}`, { method: 'DELETE' })
  scenes.value = scenes.value.filter((s) => s.id !== id)
  hotspots.value = hotspots.value.filter((h) => h.sceneId !== id && h.targetSceneId !== id)
  if (selectedSceneId.value === id) selectedSceneId.value = null
}

function triggerReplaceImage() {
  replaceImageInput.value?.click()
}

// 上傳新圖取代目前選中場景的全景圖：後端重新切 tile + 產生預覽圖，
// 場景 id/名稱/分類/熱點都不變，只有圖片內容換掉。
async function onReplaceImagePick(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || !selectedScene.value) return
  if (!confirm('確定要用這張新圖取代目前的全景圖嗎？原本的圖會被覆蓋，無法復原')) return

  replacingImage.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    const updated = await $fetch(`${apiBase.value}/scenes/${selectedScene.value.id}/replace-image`, {
      method: 'POST',
      body: form
    })
    const idx = scenes.value.findIndex((s) => s.id === updated.id)
    if (idx !== -1) scenes.value[idx] = updated
    if (viewer && selectedSceneId.value === updated.id) {
      await viewer.setPanorama(buildTileConfig(updated))
    }
  } catch (err) {
    alert(`更換圖片失敗：${err.data?.error || err.message}`)
  } finally {
    replacingImage.value = false
  }
}

async function deleteHotspot(id) {
  await $fetch(`${apiBase.value}/hotspots/${id}`, { method: 'DELETE' })
  hotspots.value = hotspots.value.filter((h) => h.id !== id)
  if (markersPlugin) refreshMarkers()
}

function selectScene(id) {
  selectedSceneId.value = id
}

function buildTileConfig(scene) {
  // tile/preview 網址走 30 天 immutable 快取，換圖後檔名不會變，
  // 所以要靠 imageVersion 當 query string 破快取，不然瀏覽器會一直顯示舊圖
  const v = scene.imageVersion || 0
  const base = `${apiBase.value}/image/${scene.id}`
  return {
    width: scene.width,
    cols: scene.cols,
    rows: scene.rows,
    baseUrl: `${base}/preview.jpg?v=${v}`,
    tileUrl: (col, row) => `${base}/tiles/${col}x${row}.jpg?v=${v}`
  }
}

function refreshMarkers() {
  if (!markersPlugin) return
  markersPlugin.setMarkers(
    hotspotsForCurrentScene.value.map((h) => ({
      id: h.id,
      position: { yaw: `${h.yaw}deg`, pitch: `${h.pitch}deg` },
      html: '<div class="admin-hotspot-dot"></div>',
      tooltip: h.label
    }))
  )
}

async function initOrSwitchViewer() {
  const scene = selectedScene.value
  if (!scene) return

  const { Viewer } = await import('@photo-sphere-viewer/core')
  const { MarkersPlugin } = await import('@photo-sphere-viewer/markers-plugin')
  const { EquirectangularTilesAdapter } = await import(
    '@photo-sphere-viewer/equirectangular-tiles-adapter'
    )
  await import('@photo-sphere-viewer/core/index.css')
  await import('@photo-sphere-viewer/markers-plugin/index.css')

  if (!viewer) {
    await nextTick()
    viewer = new Viewer({
      container: document.getElementById('admin-viewer'),
      adapter: EquirectangularTilesAdapter,
      panorama: buildTileConfig(scene),
      defaultYaw: `${scene.initialYaw || 0}deg`,
      defaultPitch: `${scene.initialPitch || 0}deg`,
      navbar: ['zoom', 'move', 'fullscreen'],
      plugins: [[MarkersPlugin, { markers: [] }]]
    })
    markersPlugin = viewer.getPlugin(MarkersPlugin)

    viewer.addEventListener('click', ({ data }) => {
      if (!pickMode.value) return
      const yawDeg = +(data.yaw * 180 / Math.PI).toFixed(2)
      const pitchDeg = +(data.pitch * 180 / Math.PI).toFixed(2)
      pendingHotspotCategory.value = null
      pendingHotspot.value = { yaw: yawDeg, pitch: pitchDeg, targetSceneId: '', label: '' }
    })
  } else {
    await viewer.setPanorama(buildTileConfig(scene))
    viewer.rotate({ yaw: `${scene.initialYaw || 0}deg`, pitch: `${scene.initialPitch || 0}deg` })
  }
  refreshMarkers()
}

async function saveHotspot() {
  if (!pendingHotspot.value?.targetSceneId) return
  const created = await $fetch(`${apiBase.value}/hotspots`, {
    method: 'POST',
    body: {
      sceneId: selectedSceneId.value,
      targetSceneId: pendingHotspot.value.targetSceneId,
      yaw: pendingHotspot.value.yaw,
      pitch: pendingHotspot.value.pitch,
      label: pendingHotspot.value.label
    }
  })
  hotspots.value.push(created)
  pendingHotspot.value = null
  refreshMarkers()
}

function openGroupEdit() {
  const current = selectedScene.value
  groupEditSelection.value = new Set(
    scenes.value
      .filter((s) => current.groupId && s.groupId === current.groupId && s.id !== current.id)
      .map((s) => s.id)
  )
  groupEditMode.value = true
}

function toggleGroupSelection(id) {
  if (groupEditSelection.value.has(id)) {
    groupEditSelection.value.delete(id)
  } else {
    groupEditSelection.value.add(id)
  }
  // Set 是物件參照，手動觸發一次以確保 checkbox 畫面同步
  groupEditSelection.value = new Set(groupEditSelection.value)
}

async function saveGroupEdit() {
  const current = selectedScene.value
  const chosenIds = groupEditSelection.value
  const newGroupId = chosenIds.size > 0 ? current.groupId || crypto.randomUUID().slice(0, 8) : null

  const shouldBeInGroup = newGroupId ? new Set([current.id, ...chosenIds]) : new Set()

  const toUpdate = []
  for (const s of scenes.value) {
    const wasInGroup = current.groupId && s.groupId === current.groupId
    const shouldBeIn = shouldBeInGroup.has(s.id)
    if (shouldBeIn && s.groupId !== newGroupId) {
      toUpdate.push({ ...s, groupId: newGroupId })
    } else if (wasInGroup && !shouldBeIn) {
      toUpdate.push({ ...s, groupId: null })
    }
  }

  for (const s of toUpdate) {
    const updated = await $fetch(`${apiBase.value}/scenes/${s.id}`, { method: 'PUT', body: s })
    const idx = scenes.value.findIndex((x) => x.id === s.id)
    if (idx !== -1) scenes.value[idx] = updated
  }

  groupEditMode.value = false
}

// -----------------------------------------------------------------------
// 重新整理後記住上次選的分類 / 場景，不用每次都重新點一次
// -----------------------------------------------------------------------
const STORAGE_KEY_CATEGORY = 'holyMotherFarmTourAdmin.activeCategory'
const STORAGE_KEY_SCENE = 'holyMotherFarmTourAdmin.selectedSceneId'

function loadPersisted(key) {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function savePersisted(key, value) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage 不可用（例如無痕模式滿了）就算了，不影響其他功能
  }
}

watch(activeCategory, (val) => savePersisted(STORAGE_KEY_CATEGORY, val))

watch(selectedSceneId, async (id) => {
  pendingHotspot.value = null
  groupEditMode.value = false
  savePersisted(STORAGE_KEY_SCENE, id)
  if (id) await initOrSwitchViewer()
})

onMounted(async () => {
  await Promise.all([loadAll(), loadCategories()])

  // 還原上次的分類篩選 / 選中的場景，但要先確認資料還存在——
  // 分類被刪掉或場景被刪掉的話，還原一個不存在的值畫面只會空空的
  const persistedCategory = loadPersisted(STORAGE_KEY_CATEGORY)
  if (
    persistedCategory !== undefined &&
    (persistedCategory === null || persistedCategory === '' || categoryList.value.includes(persistedCategory))
  ) {
    activeCategory.value = persistedCategory
  }

  const persistedSceneId = loadPersisted(STORAGE_KEY_SCENE)
  if (persistedSceneId && scenes.value.some((s) => s.id === persistedSceneId)) {
    selectedSceneId.value = persistedSceneId
  }

  updateViewerHeight()
  window.addEventListener('resize', updateViewerHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewerHeight)
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<style>
.admin-hotspot-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(79, 174, 143, 0.35);
  border: 2px solid #4fae8f;
  box-shadow: 0 0 10px rgba(79, 174, 143, 0.6);
}
</style>
