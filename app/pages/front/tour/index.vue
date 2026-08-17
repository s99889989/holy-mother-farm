<template>
  <div class="map-page">
    <div class="map-topbar">
      <h1>聖母健康園區 探索地圖</h1>
      <p class="map-hint">點擊地圖上的圖釘進入該地點的環景導覽</p>
    </div>

    <div class="map-wrap">
      <img src="/tour/campus-map.jpg" class="map-image" alt="園區地圖" />

      <button
        v-for="scene in scenesWithMapPosition"
        :key="scene.id"
        class="map-pin"
        :style="{ left: scene.mapX + '%', top: scene.mapY + '%' }"
        @click="goToScene(scene.id)"
      >
        <span class="pin-dot"></span>
        <span class="pin-label">{{ scene.name }}</span>
      </button>
    </div>

    <p v-if="!loading && !scenesWithMapPosition.length && !loadError" class="map-empty">
      園區還沒有上架任何場景，請洽管理者於後台上傳
    </p>
    <p v-if="loadError" class="map-error">載入導覽資料失敗：{{ loadError }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'default'
})

const router = useRouter()

// -----------------------------------------------------------------------
// 正式串接：資料改打真實後端 /holy/tour/data，跟後台管理頁走同一份資料，
// 不再讀寫死的 test-data.json。
// -----------------------------------------------------------------------
const commonStore = useCommonStore()
const apiBase = computed(() => commonStore.data.main_url + '/holy/tour')

const scenes = ref([])
const loading = ref(true)
const loadError = ref(null)

const scenesWithMapPosition = computed(() =>
  scenes.value.filter((s) => s.mapX != null && s.mapY != null)
)

async function loadData() {
  loading.value = true
  try {
    const data = await $fetch(`${apiBase.value}/data`)
    scenes.value = data.scenes || []
  } catch (err) {
    loadError.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}

function goToScene(id) {
  router.push(`/front/tour/${id}`)
}

onMounted(loadData)
</script>

<style scoped>
.map-page {
  background: #f4f7f5;
  min-height: 100vh;
  padding: 20px;
}

.map-topbar {
  text-align: center;
  margin-bottom: 16px;
}

.map-topbar h1 {
  font-size: 20px;
  color: #1a3d28;
  margin: 0 0 4px;
}

.map-hint {
  font-size: 13px;
  color: #6b7a75;
  margin: 0;
}

.map-wrap {
  position: relative;
  max-width: 620px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.map-image {
  width: 100%;
  display: block;
}

.map-pin {
  position: absolute;
  transform: translate(-50%, -100%);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
}

.pin-dot {
  width: 18px;
  height: 18px;
  border-radius: 50% 50% 50% 0;
  background: #3d7a52;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  transform: rotate(-45deg);
  animation: pin-bounce 1.6s infinite;
}

@keyframes pin-bounce {
  0%,
  100% {
    transform: rotate(-45deg) translateY(0);
  }
  50% {
    transform: rotate(-45deg) translateY(-4px);
  }
}

.pin-label {
  margin-top: 4px;
  font-size: 10.5px;
  background: rgba(26, 61, 40, 0.9);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
}

.map-empty,
.map-error {
  text-align: center;
  font-size: 12.5px;
  margin-top: 12px;
}

.map-empty {
  color: #7c8a86;
}

.map-error {
  color: #b0453e;
}
</style>
