<template>
  <ClientOnly>
    <div class="preview-page">
      <div class="preview-topbar">
        <NuxtLink to="/staff/management/tour" class="back-link">← 返回管理</NuxtLink>
        <select v-model="currentZoneId" class="zone-select" @change="onZoneChange">
          <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.name }}</option>
        </select>
        <select v-if="currentZoneId" v-model="currentSceneId" class="scene-select" @change="onSceneSelect">
          <option v-for="s in scenesInCurrentZone" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
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

      <div id="preview-viewer" class="preview-viewer"></div>
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

const zones = ref([])
const scenes = ref([])
const hotspots = ref([])
const currentZoneId = ref(null)
const currentSceneId = ref(null)
const loadError = ref(null)

let viewer = null
let markersPlugin = null

const currentScene = computed(() => scenes.value.find((s) => s.id === currentSceneId.value))
const scenesInCurrentZone = computed(() =>
  scenes.value.filter((s) => s.zoneId === currentZoneId.value)
)
const sceneGroupMembers = computed(() => {
  if (!currentScene.value?.groupId) return []
  return scenes.value.filter((s) => s.groupId === currentScene.value.groupId)
})

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

function buildMarkers(id) {
  return hotspotsForScene(id).map((h) => ({
    id: h.id,
    position: { yaw: `${h.yaw}deg`, pitch: `${h.pitch}deg` },
    html: '<div class="preview-hotspot-dot"></div>',
    tooltip: h.label,
    data: { targetSceneId: h.targetSceneId }
  }))
}

async function loadData() {
  try {
    const data = await $fetch(`${apiBase.value}/data`)
    zones.value = data.zones || []
    scenes.value = data.scenes || []
    hotspots.value = data.hotspots || []
    if (zones.value.length) {
      currentZoneId.value = zones.value[0].id
      const firstScene = scenes.value.find((s) => s.zoneId === currentZoneId.value)
      if (firstScene) currentSceneId.value = firstScene.id
    }
  } catch (err) {
    loadError.value = err.message || String(err)
  }
}

async function initOrSwitchViewer() {
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
      if (target) onSceneSelect(target)
    })
  } else {
    await viewer.setPanorama(buildTileConfig(scene), { transition: true, showLoader: true })
    markersPlugin.setMarkers(buildMarkers(scene.id))
  }
}

function onZoneChange() {
  const first = scenes.value.find((s) => s.zoneId === currentZoneId.value)
  currentSceneId.value = first ? first.id : null
}

function onSceneSelect(id) {
  currentSceneId.value = id
}

watch(currentSceneId, async (id) => {
  if (id) await initOrSwitchViewer()
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
}

.back-link:hover {
  color: #4fae8f;
}

.zone-select,
.scene-select {
  background: #2a3438;
  color: #eef3f2;
  border: 1px solid #384442;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12.5px;
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
}

.group-btn.active {
  background: #4fae8f;
  color: #0c1412;
}

.preview-viewer {
  flex: 1;
  width: 100%;
}

.preview-error,
.preview-empty {
  padding: 12px 16px;
  color: #9fb0ac;
  font-size: 13px;
}
</style>

<style>
.preview-hotspot-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(79, 174, 143, 0.35);
  border: 2px solid #4fae8f;
  box-shadow: 0 0 12px rgba(79, 174, 143, 0.6);
  animation: preview-pulse 1.8s infinite;
}

@keyframes preview-pulse {
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
