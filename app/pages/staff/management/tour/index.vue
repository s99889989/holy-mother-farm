<template>
  <div class="p-4">
    <div class="mb-3">
      <h1 class="text-lg font-semibold text-gray-800 dark:text-gray-100">360 環景導覽管理</h1>
    </div>

    <div class="grid grid-cols-[300px_1fr] gap-4 items-start">
      <!-- 左側：分區 + 場景列表 + 上傳 -->
      <div>
        <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
          <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">分區（棟）</div>
          <ul class="list-none m-0 p-0">
            <li
              v-for="z in zones"
              :key="z.id"
              class="flex justify-between items-center px-2.5 py-1.5 rounded-md cursor-pointer text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="{ 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold': z.id === activeZoneId }"
              @click="activeZoneId = z.id"
            >
              <span class="flex items-center gap-1.5 truncate">
                {{ z.name }}
                <span
                  v-if="z.mapX == null"
                  class="text-[10px] text-orange-500 dark:text-orange-400 shrink-0"
                  title="尚未設定在總覽圖上的位置"
                >●</span>
                <span
                  v-if="z.hasFloorPlan"
                  class="text-[10px] text-blue-500 dark:text-blue-400 shrink-0"
                  title="已上傳平面圖"
                >🗺️</span>
              </span>
              <span class="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{{ scenesInZone(z.id).length }}</span>
            </li>
          </ul>
          <div class="flex gap-1.5 mt-2">
            <input
              v-model="newZoneName"
              placeholder="新增分區名稱"
              class="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md px-2 py-1 text-xs"
              @keyup.enter="addZone"
            />
            <button
              class="bg-green-700 hover:bg-green-800 text-white rounded-md px-3 py-1 text-xs"
              @click="addZone"
            >
              新增
            </button>
          </div>

          <!-- 選定分區後，這裡管理該分區在總覽圖上的位置 + 平面圖 -->
          <div v-if="activeZone" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div class="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">「{{ activeZone.name }}」設定</div>
            <div class="flex gap-1.5">
              <button
                class="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-[11px] rounded-md px-2 py-1.5"
                @click="zoneMapPickMode = true"
              >
                📍 總覽圖位置
              </button>
              <button
                class="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-[11px] rounded-md px-2 py-1.5"
                @click="floorPlanInput?.click()"
              >
                🗺️ {{ activeZone.hasFloorPlan ? '更換平面圖' : '上傳平面圖' }}
              </button>
              <input
                ref="floorPlanInput"
                type="file"
                accept="image/jpeg"
                class="hidden"
                @change="onFloorPlanPick"
              />
            </div>
            <p class="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1.5">
              沒平面圖的分區：訪客點總覽圖圖釘後直接進第一個場景，靠場景內熱點走。<br />
              有平面圖的分區：點總覽圖圖釘後改顯示這張平面圖，各場景另外定位在平面圖上。
            </p>
          </div>
        </section>

        <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
          <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">上傳全景圖</div>
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
          <p v-if="!activeZoneId" class="text-orange-600 dark:text-orange-400 text-[11px] mt-1.5">
            請先選一個分區才能上傳
          </p>
        </section>

        <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
          <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {{ activeZone?.name || '場景' }} 場景列表
          </div>
          <ul class="list-none m-0 p-0">
            <li
              v-for="s in scenesInZone(activeZoneId)"
              :key="s.id"
              class="flex justify-between items-center px-2.5 py-1.5 rounded-md cursor-pointer text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="{ 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold': s.id === selectedSceneId }"
              @click="selectScene(s.id)"
            >
              <span class="flex items-center gap-1.5 truncate">
                {{ s.name }}
                <span
                  v-if="activeZone?.hasFloorPlan && s.mapX == null"
                  class="text-[10px] text-orange-500 dark:text-orange-400 shrink-0"
                  title="尚未在平面圖上定位"
                >●</span>
              </span>
              <button
                class="bg-transparent border-none text-red-500 dark:text-red-400 text-base leading-none px-1 shrink-0"
                title="刪除場景"
                @click.stop="deleteScene(s.id)"
              >
                ×
              </button>
            </li>
          </ul>
        </section>
      </div>

      <!-- 右側：全景檢視 + 熱點編輯（固定深色，作為看圖區） -->
      <div class="bg-[#10171a] rounded-xl min-h-[600px] flex flex-col overflow-hidden relative">
        <div v-if="!selectedScene" class="flex-1 flex items-center justify-center text-[#6f8480] text-sm">
          選一個場景，或上傳新的全景圖開始編輯熱點
        </div>

        <template v-else>
          <div class="flex items-center gap-5 px-4 py-2.5 bg-[#1a2327] text-[#eef3f2] text-sm flex-wrap">
            <strong>{{ selectedScene.name }}</strong>
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
              @click="openGroupEdit"
            >
              🔗 同空間群組
            </button>
            <button
              v-if="activeZone?.hasFloorPlan"
              class="bg-[#2a3438] hover:bg-[#33403f] text-[#eef3f2] text-xs rounded-md px-3 py-1.5"
              @click="sceneMapPickMode = true"
            >

              📍 在平面圖上定位
            </button>
            <span v-else class="text-[11px] text-[#6f8480]">
              此分區沒有平面圖，場景位置請用熱點串接
            </span>
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

          <div id="admin-viewer" class="flex-1 min-h-[500px]"></div>

          <!-- 熱點目標選擇彈窗 -->
          <div
            v-if="pendingHotspot"
            class="absolute inset-0 bg-black/45 flex items-center justify-center z-10"
          >
            <div class="bg-white dark:bg-gray-800 rounded-xl p-4.5 w-[280px]">
              <h3 class="m-0 mb-3 text-sm text-gray-800 dark:text-gray-100">新增熱點</h3>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">目標場景</label>
              <select
                v-model="pendingHotspot.targetSceneId"
                class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-md px-2 py-1.5 text-sm box-border"
              >
                <option value="" disabled>選擇要跳到哪個場景</option>
                <option
                  v-for="s in allScenesExceptCurrent"
                  :key="s.id"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </select>
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

          <!-- 場景定位彈窗：點擊「所屬分區的平面圖」設定場景 mapX/mapY -->
          <div
            v-if="sceneMapPickMode"
            class="absolute inset-0 bg-black/70 flex items-center justify-center z-20"
          >
            <div class="bg-white dark:bg-gray-800 rounded-xl p-4 w-[92%] max-w-[480px]">
              <div class="flex justify-between items-center mb-2">
                <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  在「{{ activeZone?.name }}」平面圖上設定「{{ selectedScene.name }}」的位置
                </h3>
                <button
                  class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md px-2.5 py-1"
                  @click="sceneMapPickMode = false"
                >
                  完成
                </button>
              </div>
              <div
                class="relative rounded-lg overflow-hidden cursor-crosshair select-none"
                @click="onSceneMapClick"
              >
                <img
                  :src="`${apiBase}/image/zone/${activeZoneId}/floorplan.jpg`"
                  class="w-full block pointer-events-none"
                  alt="分區平面圖"
                />
                <span
                  v-for="s in otherPositionedScenesInZone"
                  :key="s.id"
                  class="absolute w-2.5 h-2.5 rounded-full bg-gray-400 border border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  :style="{ left: s.mapX + '%', top: s.mapY + '%' }"
                ></span>
                <span
                  v-if="selectedScene.mapX != null"
                  class="absolute w-3.5 h-3.5 rounded-full bg-green-600 border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  :style="{ left: selectedScene.mapX + '%', top: selectedScene.mapY + '%' }"
                ></span>
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                灰點是同分區其他場景的位置，綠點是目前這個場景，點擊圖片任意處即可移動
              </p>
            </div>
          </div>

          <!-- 分區定位彈窗：點擊「園區總覽圖」設定分區 mapX/mapY -->
          <div
            v-if="zoneMapPickMode"
            class="absolute inset-0 bg-black/70 flex items-center justify-center z-20"
          >
            <div class="bg-white dark:bg-gray-800 rounded-xl p-4 w-[92%] max-w-[480px]">
              <div class="flex justify-between items-center mb-2">
                <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  在總覽圖上設定「{{ activeZone?.name }}」的位置
                </h3>
                <button
                  class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md px-2.5 py-1"
                  @click="zoneMapPickMode = false"
                >
                  完成
                </button>
              </div>
              <div
                class="relative rounded-lg overflow-hidden cursor-crosshair select-none"
                @click="onZoneMapClick"
              >
                <img src="/tour/campus-map.jpg" class="w-full block pointer-events-none" alt="園區總覽圖" />
                <span
                  v-for="z in otherPositionedZones"
                  :key="z.id"
                  class="absolute w-2.5 h-2.5 rounded-full bg-gray-400 border border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  :style="{ left: z.mapX + '%', top: z.mapY + '%' }"
                ></span>
                <span
                  v-if="activeZone?.mapX != null"
                  class="absolute w-3.5 h-3.5 rounded-full bg-green-600 border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  :style="{ left: activeZone.mapX + '%', top: activeZone.mapY + '%' }"
                ></span>
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                灰點是其他分區的位置，綠點是目前這個分區，點擊圖片任意處即可移動
              </p>
            </div>
          </div>

          <!-- 同空間群組編輯彈窗 -->
          <div
            v-if="groupEditMode"
            class="absolute inset-0 bg-black/70 flex items-center justify-center z-20"
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
                  v-for="s in scenesInSameZone"
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
                <li v-if="!scenesInSameZone.length" class="text-[12px] text-gray-400 dark:text-gray-500 py-2">
                  這個分區沒有其他場景
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

          <div class="bg-[#1a2327] text-[#eef3f2] px-4 py-2.5 text-xs max-h-[140px] overflow-y-auto">
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
        </template>
      </div>
    </div>
  </div>
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

const zones = ref([])
const scenes = ref([])
const hotspots = ref([])

const activeZoneId = ref(null)
const selectedSceneId = ref(null)
const newZoneName = ref('')

const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref('')
const fileInput = ref(null)
const floorPlanInput = ref(null)

const pickMode = ref(false)
const pendingHotspot = ref(null)
const sceneMapPickMode = ref(false)
const zoneMapPickMode = ref(false)
const groupEditMode = ref(false)
const groupEditSelection = ref(new Set())

let viewer = null
let markersPlugin = null

const activeZone = computed(() => zones.value.find((z) => z.id === activeZoneId.value))
const selectedScene = computed(() => scenes.value.find((s) => s.id === selectedSceneId.value))
const allScenesExceptCurrent = computed(() =>
  scenes.value.filter((s) => s.id !== selectedSceneId.value)
)
const hotspotsForCurrentScene = computed(() =>
  hotspots.value.filter((h) => h.sceneId === selectedSceneId.value)
)
const otherPositionedScenesInZone = computed(() =>
  scenes.value.filter(
    (s) =>
      s.id !== selectedSceneId.value &&
      s.zoneId === activeZoneId.value &&
      s.mapX != null &&
      s.mapY != null
  )
)
const otherPositionedZones = computed(() =>
  zones.value.filter((z) => z.id !== activeZoneId.value && z.mapX != null && z.mapY != null)
)
const scenesInSameZone = computed(() =>
  scenes.value.filter((s) => s.zoneId === activeZoneId.value && s.id !== selectedSceneId.value)
)
const sceneGroupMembers = computed(() => {
  if (!selectedScene.value?.groupId) return []
  return scenes.value.filter((s) => s.groupId === selectedScene.value.groupId)
})

function scenesInZone(zoneId) {
  return scenes.value.filter((s) => s.zoneId === zoneId)
}

function sceneName(id) {
  return scenes.value.find((s) => s.id === id)?.name || '(已刪除場景)'
}

async function loadAll() {
  const data = await $fetch(`${apiBase.value}/data`)
  zones.value = data.zones || []
  scenes.value = data.scenes || []
  hotspots.value = data.hotspots || []
  if (!activeZoneId.value && zones.value.length) {
    activeZoneId.value = zones.value[0].id
  }
}

async function addZone() {
  if (!newZoneName.value.trim()) return
  const zone = await $fetch(`${apiBase.value}/zones`, {
    method: 'POST',
    body: { name: newZoneName.value.trim(), order: zones.value.length }
  })
  zones.value.push(zone)
  activeZoneId.value = zone.id
  newZoneName.value = ''
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
  if (!activeZoneId.value || !files.length) return
  uploading.value = true
  for (let i = 0; i < files.length; i++) {
    uploadProgress.value = `${i + 1}/${files.length}`
    const form = new FormData()
    form.append('file', files[i])
    form.append('name', files[i].name.replace(/\.[^.]+$/, ''))
    form.append('zoneId', activeZoneId.value)
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

async function onFloorPlanPick(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file || !activeZoneId.value) return
  const form = new FormData()
  form.append('file', file)
  try {
    await $fetch(`${apiBase.value}/zone/${activeZoneId.value}/floorplan`, {
      method: 'POST',
      body: form
    })
    const idx = zones.value.findIndex((z) => z.id === activeZoneId.value)
    if (idx !== -1) zones.value[idx] = { ...zones.value[idx], hasFloorPlan: true }
  } catch (err) {
    alert(`上傳平面圖失敗：${err.data?.error || err.message}`)
  }
}

async function deleteScene(id) {
  if (!confirm('確定刪除這個場景？相關熱點也會一併刪除')) return
  await $fetch(`${apiBase.value}/scenes/${id}`, { method: 'DELETE' })
  scenes.value = scenes.value.filter((s) => s.id !== id)
  hotspots.value = hotspots.value.filter((h) => h.sceneId !== id && h.targetSceneId !== id)
  if (selectedSceneId.value === id) selectedSceneId.value = null
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
  const base = `${apiBase.value}/image/${scene.id}`
  return {
    width: scene.width,
    cols: scene.cols,
    rows: scene.rows,
    baseUrl: `${base}/preview.jpg`,
    tileUrl: (col, row) => `${base}/tiles/${col}x${row}.jpg`
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
      navbar: ['zoom', 'move', 'fullscreen'],
      plugins: [[MarkersPlugin, { markers: [] }]]
    })
    markersPlugin = viewer.getPlugin(MarkersPlugin)

    viewer.addEventListener('click', ({ data }) => {
      if (!pickMode.value) return
      const yawDeg = +(data.yaw * 180 / Math.PI).toFixed(2)
      const pitchDeg = +(data.pitch * 180 / Math.PI).toFixed(2)
      pendingHotspot.value = { yaw: yawDeg, pitch: pitchDeg, targetSceneId: '', label: '' }
    })
  } else {
    await viewer.setPanorama(buildTileConfig(scene))
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

function onSceneMapClick(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  saveScenePosition(+x.toFixed(2), +y.toFixed(2))
}

async function saveScenePosition(mapX, mapY) {
  const scene = selectedScene.value
  if (!scene) return
  const updated = await $fetch(`${apiBase.value}/scenes/${scene.id}`, {
    method: 'PUT',
    body: { ...scene, mapX, mapY }
  })
  const idx = scenes.value.findIndex((s) => s.id === scene.id)
  if (idx !== -1) scenes.value[idx] = updated
}

function onZoneMapClick(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  saveZonePosition(+x.toFixed(2), +y.toFixed(2))
}

async function saveZonePosition(mapX, mapY) {
  const zone = activeZone.value
  if (!zone) return
  const updated = await $fetch(`${apiBase.value}/zones/${zone.id}`, {
    method: 'PUT',
    body: { ...zone, mapX, mapY }
  })
  const idx = zones.value.findIndex((z) => z.id === zone.id)
  if (idx !== -1) zones.value[idx] = { ...updated, hasFloorPlan: zone.hasFloorPlan }
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

watch(selectedSceneId, async (id) => {
  sceneMapPickMode.value = false
  pendingHotspot.value = null
  groupEditMode.value = false
  if (id) await initOrSwitchViewer()
})

watch(activeZoneId, () => {
  zoneMapPickMode.value = false
})

onMounted(loadAll)

onBeforeUnmount(() => {
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
