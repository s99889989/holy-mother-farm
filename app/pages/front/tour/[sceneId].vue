<template>
  <div class="tour-page">
    <div class="tour-topbar">
      <NuxtLink to="/front/tour" class="back-link">← 導覽總覽</NuxtLink>
      <h1>{{ currentScene?.name || '載入中...' }}</h1>
      <div class="scene-jump">
        <button
          v-for="s in scenes"
          :key="s.id"
          class="jump-btn"
          :class="{ active: s.id === sceneId }"
          @click="goToScene(s.id)"
        >
          {{ s.name }}
        </button>
      </div>
    </div>

    <div v-if="loadError" class="tour-error">
      找不到場景資料：{{ loadError }}
    </div>

    <div id="tour-viewer" class="tour-viewer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// -----------------------------------------------------------------------
// 測試階段：資料從 public/tour/test-data.json 讀取（純靜態檔案）。
// 之後接後端時，只需把下面 loadTourData() 換成
//   await $fetch(`${apiBase}/holy/tour/data`)
// 其餘邏輯（場景切換、熱點渲染、tile adapter 設定）完全不用動。
// -----------------------------------------------------------------------

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const router = useRouter()

const sceneId = computed(() => route.params.sceneId)

const zones = ref([])
const scenes = ref([])
const hotspots = ref([])
const loadError = ref(null)

const currentScene = computed(() =>
  scenes.value.find((s) => s.id === sceneId.value)
)

let viewer = null
let markersPlugin = null

async function loadTourData() {
  try {
    // 測試用：直接抓靜態 json。正式串後端時改成打 /holy/tour/data 之類的 API。
    const data = await $fetch('/tour/test-data.json')
    zones.value = data.zones
    scenes.value = data.scenes
    hotspots.value = data.hotspots
  } catch (err) {
    loadError.value = err.message || String(err)
  }
}

function hotspotsForScene(id) {
  return hotspots.value.filter((h) => h.sceneId === id)
}

function buildTileConfig(scene) {
  const tc = scene.tileConfig
  // Tile 圖片放在 /tour/<sceneId>/tiles/ 底下（比照 tile_generator.py 輸出結構）
  const base = `/tour/${scene.id}`
  return {
    width: tc.width,
    cols: tc.cols,
    rows: tc.rows,
    baseUrl: `${base}/${tc.baseUrl}`,
    tileUrl: (col, row) => `${base}/tiles/${col}x${row}.jpg`
  }
}

function buildMarkers(id) {
  return hotspotsForScene(id).map((h) => ({
    id: h.id,
    position: { yaw: `${h.yaw}deg`, pitch: `${h.pitch}deg` },
    html: '<div class="tour-hotspot-dot"></div>',
    tooltip: h.label,
    data: { targetSceneId: h.targetSceneId }
  }))
}

async function initViewer() {
  const { Viewer } = await import('@photo-sphere-viewer/core')
  const { MarkersPlugin } = await import('@photo-sphere-viewer/markers-plugin')
  const { EquirectangularTilesAdapter } = await import(
    '@photo-sphere-viewer/equirectangular-tiles-adapter'
  )
  await import('@photo-sphere-viewer/core/index.css')
  await import('@photo-sphere-viewer/markers-plugin/index.css')

  const scene = currentScene.value
  if (!scene) return

  viewer = new Viewer({
    container: document.getElementById('tour-viewer'),
    adapter: EquirectangularTilesAdapter,
    panorama: buildTileConfig(scene),
    defaultYaw: `${scene.initialYaw || 0}deg`,
    defaultPitch: `${scene.initialPitch || 0}deg`,
    navbar: ['zoom', 'move', 'fullscreen'],
    plugins: [[MarkersPlugin, { markers: buildMarkers(scene.id) }]]
  })

  markersPlugin = viewer.getPlugin(MarkersPlugin)

  markersPlugin.addEventListener('select-marker', ({ marker }) => {
    const target = marker.data?.targetSceneId
    if (target) goToScene(target)
  })
}

async function switchScene(newId) {
  const scene = scenes.value.find((s) => s.id === newId)
  if (!scene || !viewer) return
  await viewer.setPanorama(buildTileConfig(scene), {
    transition: true,
    showLoader: true
  })
  markersPlugin.setMarkers(buildMarkers(scene.id))
}

function goToScene(id) {
  if (id === sceneId.value) return
  router.push(`/front/tour/${id}`)
}

watch(sceneId, async (newId, oldId) => {
  if (!viewer || !newId || newId === oldId) return
  await switchScene(newId)
})

onMounted(async () => {
  await loadTourData()
  if (currentScene.value) {
    await initViewer()
  }
})

onBeforeUnmount(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<style>
.tour-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #10171a;
}

.tour-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #1a2327;
  border-bottom: 1px solid #2a3438;
  flex-wrap: wrap;
}

.tour-topbar h1 {
  font-size: 15px;
  color: #eef3f2;
  margin: 0;
}

.back-link {
  color: #9fb0ac;
  text-decoration: none;
  font-size: 13px;
}

.back-link:hover {
  color: #4fae8f;
}

.scene-jump {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.jump-btn {
  background: transparent;
  border: 1px solid #2a3438;
  color: #9fb0ac;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  cursor: pointer;
}

.jump-btn.active {
  background: rgba(79, 174, 143, 0.18);
  border-color: #4fae8f;
  color: #4fae8f;
}

.tour-viewer {
  flex: 1;
  width: 100%;
}

.tour-error {
  padding: 12px 20px;
  color: #e06c6c;
  font-size: 13px;
}

.tour-hotspot-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(79, 174, 143, 0.35);
  border: 2px solid #4fae8f;
  box-shadow: 0 0 12px rgba(79, 174, 143, 0.6);
  animation: tour-pulse 1.8s infinite;
}

@keyframes tour-pulse {
  0% {
    transform: scale(0.85);
    opacity: 1;
  }
  70% {
    transform: scale(1.25);
    opacity: 0.4;
  }
  100% {
    transform: scale(0.85);
    opacity: 1;
  }
}
</style>
