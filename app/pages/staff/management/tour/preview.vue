<template>
  <ClientOnly>
    <div class="preview-page">
      <div class="preview-topbar">
        <NuxtLink to="/staff/management/tour" class="back-link">← 返回管理</NuxtLink>
        <select v-model="currentSceneId" class="scene-select flex-1" @change="onSceneSelect(currentSceneId)">
          <optgroup v-for="grp in groupedScenes" :key="grp.category" :label="grp.category">
            <option v-for="s in grp.scenes" :key="s.id" :value="s.id">{{ s.name }}</option>
          </optgroup>
        </select>
      </div>

      <div
        v-if="quickPoints.length"
        class="quick-points"
      >
        <span class="quick-label">⭐ 快速前往：</span>
        <button
          v-for="q in quickPoints"
          :key="q.id"
          class="quick-btn"
          :class="{ active: q.id === currentSceneId }"
          @click="onSceneSelect(q.id)"
        >
          {{ q.name }}
        </button>
      </div>

      <div
        v-if="sceneGroupMembers.length > 1"
        class="group-switch"
      >
        <span class="group-label">同空間切換：</span>
        <button
          v-for="m in sceneGroupMembers"
          :key="m.id"
          class="group-btn"
          :class="{ active: m.id === currentSceneId }"
          @click="onSceneSelect(m.id)"
        >
          {{ m.name }}
        </button>
      </div>

      <div v-if="loadError" class="preview-error">載入失敗：{{ loadError }}</div>
      <div v-else-if="!currentScene" class="preview-empty">尚無場景資料</div>

      <div class="viewer-stage">
        <div id="preview-viewer" class="preview-viewer"></div>

        <!-- 街景風格小地圖：不再依賴任何上傳的地圖/平面圖，純粹依場景之間已設置好的
             熱點連結關係，用力導向佈局自動算出示意連接圖，涵蓋全部場景。快速點會用
             金色星形標示，方便一眼找到重點位置（例如某棟建築門口）。 -->
        <div
          v-if="showMinimap"
          class="minimap"
          :class="{ 'minimap--expanded': minimapExpanded }"
          @click="minimapExpanded = !minimapExpanded"
          :title="minimapExpanded ? '點擊縮小地圖' : '點擊放大地圖'"
        >
          <svg class="minimap-graph" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              v-for="(e, i) in hotspotEdges"
              :key="i"
              :x1="graphLayout.get(e.sceneId)?.x"
              :y1="graphLayout.get(e.sceneId)?.y"
              :x2="graphLayout.get(e.targetSceneId)?.x"
              :y2="graphLayout.get(e.targetSceneId)?.y"
              class="graph-edge"
            />
          </svg>
          <span
            v-for="s in scenes"
            :key="s.id"
            class="minimap-dot"
            :class="{ 'minimap-dot--current': s.id === currentSceneId, 'minimap-dot--quick': s.quickPoint }"
            :style="{ left: (graphLayout.get(s.id)?.x ?? 50) + '%', top: (graphLayout.get(s.id)?.y ?? 50) + '%' }"
            :title="s.name"
            @click.stop="onSceneSelect(s.id)"
          >{{ s.quickPoint ? '★' : '' }}</span>

          <span class="minimap-toggle">{{ minimapExpanded ? '⤡' : '⤢' }}</span>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

definePageMeta({
  layout: 'staff',
  requiredPermission: 'management.tour'
})

const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url + '/holy/tour')

const scenes = ref([])
const hotspots = ref([])
const currentSceneId = ref(null)
const loadError = ref(null)

const minimapExpanded = ref(false)

// 推進轉場：點熱點箭頭切換時，先記住熱點的方向 (yaw/pitch, deg)，
// 讓 initOrSwitchViewer 在真正切換全景圖之前先「轉向＋拉近」，模擬向前走近的感覺。
// 從下拉選單/快速點/同空間切換等沒有明確方向的入口進來時維持 null，走原本的淡入淡出。
const pendingDirection = ref(null)
const PUSH_ZOOM_DELTA = 18 // 推進時額外拉近的縮放百分比（0-100 制，數字越大代表拉得越近）

let viewer = null
let markersPlugin = null

const currentScene = computed(() => scenes.value.find((s) => s.id === currentSceneId.value))
const sceneGroupMembers = computed(() => {
  if (!currentScene.value?.groupId) return []
  return scenes.value.filter((s) => s.groupId === currentScene.value.groupId)
})

const groupedScenes = computed(() => {
  const map = new Map()
  for (const s of scenes.value) {
    const cat = s.category || '未分類'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat).push(s)
  }
  return Array.from(map.entries()).map(([category, list]) => ({ category, scenes: list }))
})

// 快速點：後台標記過的重點場景，不管目前在哪個場景都能一鍵跳過去
const quickPoints = computed(() => scenes.value.filter((s) => s.quickPoint))

// ---- 小地圖：完全依熱點連結自動排版，不需要任何上傳的地圖圖片 ----
const hotspotEdges = computed(() => {
  const idSet = new Set(scenes.value.map((s) => s.id))
  return hotspots.value.filter((h) => idSet.has(h.sceneId) && idSet.has(h.targetSceneId))
})
const showMinimap = computed(() => scenes.value.length > 1 && hotspotEdges.value.length > 0)

// 力導向圖佈局：初始位置依場景 order 排成一個圓（確定性、不會每次重整頁面亂跳），
// 再跑固定次數的排斥力＋彈簧力，讓有熱點連結的場景靠近、孤立場景自然散開。
// 場景/熱點資料在同一次造訪中不會變動，算一次快取起來即可。
let cachedGraphLayout = null
const graphLayout = computed(() => {
  if (!showMinimap.value) return new Map()
  if (cachedGraphLayout) return cachedGraphLayout
  cachedGraphLayout = computeGraphLayout(scenes.value, hotspotEdges.value)
  return cachedGraphLayout
})

function computeGraphLayout(sceneList, edgeList) {
  const n = sceneList.length
  const nodes = sceneList.map((s, i) => {
    const angle = (i / n) * Math.PI * 2
    return { x: 50 + Math.cos(angle) * 30, y: 50 + Math.sin(angle) * 30 }
  })
  const indexOf = new Map(sceneList.map((s, i) => [s.id, i]))
  const edges = edgeList
    .map((h) => [indexOf.get(h.sceneId), indexOf.get(h.targetSceneId)])
    .filter(([a, b]) => a != null && b != null && a !== b)

  const REPULSION = 260
  const SPRING_LEN = 26
  const SPRING_K = 0.03
  const CENTER_K = 0.006
  const ITERATIONS = 300

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const fx = new Array(n).fill(0)
    const fy = new Array(n).fill(0)

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = nodes[i].x - nodes[j].x
        let dy = nodes[i].y - nodes[j].y
        const distSq = Math.max(dx * dx + dy * dy, 0.05)
        const dist = Math.sqrt(distSq)
        const force = REPULSION / distSq
        const ux = dx / dist
        const uy = dy / dist
        fx[i] += ux * force
        fy[i] += uy * force
        fx[j] -= ux * force
        fy[j] -= uy * force
      }
    }

    for (const [a, b] of edges) {
      const dx = nodes[b].x - nodes[a].x
      const dy = nodes[b].y - nodes[a].y
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.05)
      const force = SPRING_K * (dist - SPRING_LEN)
      const ux = dx / dist
      const uy = dy / dist
      fx[a] += ux * force
      fy[a] += uy * force
      fx[b] -= ux * force
      fy[b] -= uy * force
    }

    for (let i = 0; i < n; i++) {
      fx[i] += (50 - nodes[i].x) * CENTER_K
      fy[i] += (50 - nodes[i].y) * CENTER_K
      nodes[i].x += fx[i] * 0.02
      nodes[i].y += fy[i] * 0.02
    }
  }

  const xs = nodes.map((p) => p.x)
  const ys = nodes.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  const result = new Map()
  sceneList.forEach((s, i) => {
    result.set(s.id, {
      x: +(12 + ((nodes[i].x - minX) / rangeX) * 76).toFixed(2),
      y: +(12 + ((nodes[i].y - minY) / rangeY) * 76).toFixed(2)
    })
  })
  return result
}

function hotspotsForScene(id) {
  return hotspots.value.filter((h) => h.sceneId === id)
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

// 街景風格熱點：白色圓盤 + 三角箭頭（chevron），取代原本的綠色圓點
function buildMarkers(id) {
  return hotspotsForScene(id).map((h) => ({
    id: h.id,
    position: { yaw: `${h.yaw}deg`, pitch: `${h.pitch}deg` },
    html: `
      <div class="preview-hotspot-arrow">
        <span class="arrow-pulse"></span>
        <svg viewBox="0 0 36 36" width="36" height="36">
          <circle cx="18" cy="18" r="15.5" class="arrow-disc" />
          <path d="M18 9 L26 22 L18 18 L10 22 Z" class="arrow-chevron" />
        </svg>
      </div>
    `,
    tooltip: h.label,
    data: { targetSceneId: h.targetSceneId, yaw: h.yaw, pitch: h.pitch }
  }))
}

async function loadData() {
  try {
    const data = await $fetch(`${apiBase.value}/data`)
    scenes.value = data.scenes || []
    hotspots.value = data.hotspots || []
    if (scenes.value.length) {
      currentSceneId.value = scenes.value[0].id
    }
  } catch (err) {
    loadError.value = err.message || String(err)
  }
}

async function initOrSwitchViewer(direction) {
  const scene = currentScene.value
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
      container: document.getElementById('preview-viewer'),
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
      if (target) {
        const yaw = marker.data?.yaw
        const pitch = marker.data?.pitch
        onSceneSelect(target, (yaw != null && pitch != null) ? { yaw, pitch } : null)
      }
    })
  } else if (direction) {
    // 推進轉場：先原地轉向熱點方向並把鏡頭拉近，模擬向前走過去，
    // 再切換到下一張全景圖並把縮放還原，銜接淡入淡出，取代單純的跳接。
    const currentZoom = viewer.getZoomLevel ? viewer.getZoomLevel() : 50
    try {
      await viewer.animate({
        yaw: `${direction.yaw}deg`,
        pitch: `${direction.pitch}deg`,
        zoom: Math.min(currentZoom + PUSH_ZOOM_DELTA, 100),
        speed: '8rpm'
      })
    } catch (e) {
      // 動畫被中途打斷（例如使用者又點了別的熱點）也沒關係，繼續切換場景
    }

    await viewer.setPanorama(buildTileConfig(scene), {
      position: { yaw: `${direction.yaw}deg`, pitch: `${direction.pitch}deg` },
      zoom: currentZoom,
      transition: { rotation: false, effect: 'fade', speed: 280 },
      showLoader: false
    })
    markersPlugin.setMarkers(buildMarkers(scene.id))
  } else {
    // 沒有明確方向的切換（下拉選單／快速點／同空間切換）：維持原本淡入淡出
    await viewer.setPanorama(buildTileConfig(scene), { transition: true, showLoader: true })
    markersPlugin.setMarkers(buildMarkers(scene.id))
  }
}

function onSceneSelect(id, direction = null) {
  pendingDirection.value = direction
  currentSceneId.value = id
}

watch(currentSceneId, async (id) => {
  if (id) {
    const direction = pendingDirection.value
    pendingDirection.value = null
    await initOrSwitchViewer(direction)
  }
})

onMounted(loadData)

onBeforeUnmount(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<style scoped>
.preview-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #10171a;
}

.preview-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #1a2327;
  border-bottom: 1px solid #2a3438;
  flex-wrap: wrap;
}

.back-link {
  color: #9fb0ac;
  text-decoration: none;
  font-size: 13px;
  flex-shrink: 0;
}

.back-link:hover {
  color: #4fae8f;
}

.scene-select {
  background: #2a3438;
  color: #eef3f2;
  border: 1px solid #384442;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12.5px;
  min-width: 0;
  max-width: 100%;
}

.quick-points {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #1d1a12;
  border-bottom: 1px solid #3a331f;
  flex-wrap: wrap;
}

.quick-label {
  font-size: 11px;
  color: #c9a860;
}

.quick-btn {
  background: #33291a;
  color: #eef3f2;
  border: 1px solid #6b5730;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.quick-btn:hover {
  background: #4a3c22;
}

.quick-btn.active {
  background: #f0b93d;
  color: #1d1a12;
  border-color: #f0b93d;
}

.group-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #161f22;
  border-bottom: 1px solid #2a3438;
  flex-wrap: wrap;
}

.group-label {
  font-size: 11px;
  color: #6f8480;
}

.group-btn {
  background: #2a3438;
  color: #eef3f2;
  border: none;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.group-btn.active {
  background: #4fae8f;
  color: #0c1412;
}

.viewer-stage {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
}

.preview-viewer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.preview-error,
.preview-empty {
  padding: 12px 16px;
  color: #9fb0ac;
  font-size: 13px;
}

/* ---------------- 街景風格小地圖（自動連接圖） ---------------- */
.minimap {
  position: absolute;
  left: 16px;
  bottom: 16px;
  width: 150px;
  height: 150px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: #161f22;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: width 0.2s ease, height 0.2s ease;
  z-index: 5;
}

.minimap--expanded {
  width: 320px;
  height: 320px;
}

.minimap-graph {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.graph-edge {
  stroke: rgba(159, 176, 172, 0.55);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.minimap-dot {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #d9dedc;
  border: 1.5px solid #10171a;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 2;
}

.minimap-dot:hover {
  background: #ffffff;
}

.minimap-dot--current {
  width: 13px;
  height: 13px;
  background: #4fae8f;
  border: 2px solid #ffffff;
  box-shadow: 0 0 8px rgba(79, 174, 143, 0.8);
  z-index: 3;
}

.minimap-dot--quick {
  width: 15px;
  height: 15px;
  background: #f0b93d;
  border: 1.5px solid #1d1a12;
  color: #1d1a12;
  font-size: 9px;
  line-height: 14px;
  text-align: center;
  z-index: 3;
}

.minimap-dot--current.minimap-dot--quick {
  border: 2px solid #4fae8f;
  box-shadow: 0 0 8px rgba(79, 174, 143, 0.8);
  z-index: 4;
}

.minimap-toggle {
  position: absolute;
  right: 4px;
  bottom: 3px;
  font-size: 11px;
  color: #eef3f2;
  background: rgba(16, 23, 26, 0.55);
  border-radius: 4px;
  padding: 0 3px;
  line-height: 1.4;
  pointer-events: none;
}

/* ---------------- 手機版調整 ---------------- */
@media (max-width: 640px) {
  .preview-topbar {
    flex-wrap: nowrap;
    padding: 8px 12px;
    gap: 8px;
  }

  .scene-select {
    font-size: 12px;
  }

  .quick-points,
  .group-switch {
    padding: 6px 12px;
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .quick-points::-webkit-scrollbar,
  .group-switch::-webkit-scrollbar {
    display: none;
  }

  .minimap {
    width: 100px;
    height: 100px;
    left: 10px;
    bottom: 10px;
  }

  .minimap--expanded {
    width: 230px;
    height: 230px;
  }

  .minimap-dot--quick {
    width: 13px;
    height: 13px;
    font-size: 8px;
    line-height: 12px;
  }
}
</style>

<style>
/* 街景風格熱點：白色圓盤 + 三角箭頭，取代原本的綠色圓點 */
.preview-hotspot-arrow {
  position: relative;
  width: 36px;
  height: 36px;
  cursor: pointer;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
  transition: transform 0.15s ease;
}

.preview-hotspot-arrow:hover {
  transform: scale(1.15);
}

.preview-hotspot-arrow .arrow-disc {
  fill: rgba(16, 23, 26, 0.55);
  stroke: #ffffff;
  stroke-width: 1.5;
}

.preview-hotspot-arrow .arrow-chevron {
  fill: #ffffff;
}

.preview-hotspot-arrow .arrow-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.65);
  animation: arrow-pulse-anim 1.8s ease-out infinite;
}

@keyframes arrow-pulse-anim {
  0% {
    transform: scale(0.7);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
</style>
