<template>
  <div class="park-map-page">

    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1>聖母健康園區</h1>
        <p>探索地圖 · 即時定位</p>
      </div>
      <div class="gps-status" :class="statusClass">
        <span class="status-dot"></span>
        <span>{{ statusText }}</span>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="tool-btn" :class="{ active: isTracking }" @click="toggleTracking">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          <circle cx="12" cy="12" r="8" stroke-dasharray="4 2"/>
        </svg>
        {{ isTracking ? '停止定位' : '開始定位' }}
      </button>
      <button class="tool-btn" :class="{ active: showLandmarks }" @click="showLandmarks = !showLandmarks">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        {{ showLandmarks ? '隱藏設施' : '顯示設施' }}
      </button>
      <button class="tool-btn" v-if="currentGPS" @click="centerOnMe">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        </svg>
        回到我的位置
      </button>
    </div>

    <!-- Map wrapper (scrollable + zoomable) -->
    <div class="map-wrapper" ref="mapWrapper">
      <div
        class="map-container"
        ref="mapContainer"
        :style="{ transform: `scale(${zoom})`, transformOrigin: 'top left' }"
      >
        <!-- Map image -->
        <img
          ref="mapImage"
          src="/images/point_B.png"
          alt="聖母健康園區地圖"
          class="map-img"
          @load="onImageLoad"
          draggable="false"
        />

        <!-- Landmark pins -->
        <template v-if="showLandmarks && imageSize.w > 0">
          <div
            v-for="lm in landmarks"
            :key="lm.id"
            class="landmark-pin"
            :style="pinStyle(lm)"
            @click.stop="selectLandmark(lm)"
            :class="{
              selected: selectedLandmark?.id === lm.id,
              nearby: nearestLandmark?.id === lm.id && isTracking
            }"
          >
            <span class="pin-icon">{{ lm.icon }}</span>
            <span class="pin-label">{{ lm.name }}</span>
          </div>
        </template>

        <!-- Live position dot -->
        <transition name="pop">
          <div
            v-if="mappedPosition && imageSize.w > 0"
            class="position-dot"
            :style="dotStyle"
          >
            <div class="pulse-ring"></div>
            <div class="pulse-ring delay"></div>
            <div class="dot-core"></div>
            <div class="position-label">你在這裡</div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Zoom controls -->
    <div class="zoom-controls">
      <button class="zoom-btn" @click="zoom = Math.min(3, zoom + 0.25)">＋</button>
      <span class="zoom-val">{{ Math.round(zoom * 100) }}%</span>
      <button class="zoom-btn" @click="zoom = Math.max(0.5, zoom - 0.25)">－</button>
    </div>

    <!-- GPS info bar -->
    <transition name="slide-up">
      <div v-if="currentGPS" class="info-bar">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">緯度</span>
            <span class="info-val">{{ currentGPS.lat.toFixed(5) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">經度</span>
            <span class="info-val">{{ currentGPS.lng.toFixed(5) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">精確度</span>
            <span class="info-val">±{{ Math.round(currentGPS.accuracy) }}m</span>
          </div>
          <div class="info-item">
            <span class="info-label">更新</span>
            <span class="info-val">{{ lastUpdated }}</span>
          </div>
        </div>
        <div v-if="nearestLandmark" class="nearest">
          <span class="nearest-icon">{{ nearestLandmark.icon }}</span>
          <div>
            <div class="nearest-name">最近：{{ nearestLandmark.name }}</div>
            <div class="nearest-dist">約 {{ nearestLandmark.dist }}m</div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Landmark detail sheet -->
    <transition name="sheet">
      <div v-if="selectedLandmark" class="detail-sheet" @click.stop>
        <button class="detail-close" @click="selectedLandmark = null">✕</button>
        <div class="detail-icon">{{ selectedLandmark.icon }}</div>
        <h3>{{ selectedLandmark.name }}</h3>
        <p>{{ selectedLandmark.desc }}</p>
        <div class="detail-meta">
          <span class="detail-tag" :class="'tag-' + selectedLandmark.tag">{{ selectedLandmark.tagLabel }}</span>
          <span v-if="currentGPS" class="detail-dist">
            距你約 {{ distToLandmark(selectedLandmark) }}m
          </span>
        </div>
      </div>
    </transition>

    <!-- Error toast -->
    <transition name="fade">
      <div v-if="errorMsg" class="error-toast">⚠️ {{ errorMsg }}</div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, nextTick } from 'vue'

// ── 固定校準座標（兩個錨點，用於 GPS ↔ 圖片比例轉換）────────────
// P1：園區大門  P2：快樂運動館B1
const ANCHOR1 = { imgX: 0.42, imgY: 0.83, lat: 22.75985, lng: 121.09390 }
const ANCHOR2 = { imgX: 0.63, imgY: 0.47, lat: 22.76155, lng: 121.09510 }

const SCALE_LAT = (ANCHOR2.lat - ANCHOR1.lat) / (ANCHOR2.imgY - ANCHOR1.imgY)  // ≈ -0.004722
const SCALE_LNG = (ANCHOR2.lng - ANCHOR1.lng) / (ANCHOR2.imgX - ANCHOR1.imgX)  // ≈ +0.005714

function gpsToImgFraction(lat, lng) {
  const x = ANCHOR1.imgX + (lng - ANCHOR1.lng) / SCALE_LNG
  const y = ANCHOR1.imgY + (lat - ANCHOR1.lat) / SCALE_LAT
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y))
  }
}

// ── 設施資料（含預算好的 GPS 座標）──────────────────────────────
const landmarks = ref([
  { id:1,  name:'園區大門',          icon:'🚪', lat:22.75985,  lng:121.09390, imgX:0.42, imgY:0.83, desc:'主要入口，遊覽車可在附近停放。博物館路側。',          tag:'green',  tagLabel:'入口' },
  { id:2,  name:'快樂運動館B1大禮堂', icon:'🏋️', lat:22.76155,  lng:121.09510, imgX:0.63, imgY:0.47, desc:'大型室內大禮堂，適合集合說明，可容納大型團體。',      tag:'orange', tagLabel:'集合推薦' },
  { id:3,  name:'樂智幸福家園',       icon:'🏡', lat:22.761172, lng:121.093214, imgX:0.30, imgY:0.55, desc:'核心示範區，含樂智團體家屋、廣場、農藝區、小規模多機能。', tag:'orange', tagLabel:'重點參觀' },
  { id:4,  name:'田園餐廳',           icon:'🍽️', lat:22.760228, lng:121.094586, imgX:0.54, imgY:0.75, desc:'1F 用餐空間，主打健康有機食材，適合安排團體午餐，需提前訂位。', tag:'gold',   tagLabel:'餐飲' },
  { id:5,  name:'療癒森林',           icon:'🌲', lat:22.762494, lng:121.095614, imgX:0.72, imgY:0.27, desc:'東北角自然步道，感受森林療癒氛圍，適合輕度健走。',    tag:'green',  tagLabel:'戶外亮點' },
  { id:6,  name:'聖賀德住香草園',     icon:'🌿', lat:22.760936, lng:121.095843, imgX:0.76, imgY:0.60, desc:'香草植物園，感官體驗豐富，年長者特別喜愛。',          tag:'green',  tagLabel:'體驗亮點' },
  { id:7,  name:'全食物烘焙坊',       icon:'🍞', lat:22.760086, lng:121.096186, imgX:0.82, imgY:0.78, desc:'1F 健康烘焙產品，可觀摩或採購伴手禮。',              tag:'gold',   tagLabel:'伴手禮' },
  { id:8,  name:'手作教室',           icon:'🎨', lat:22.762731, lng:121.093671, imgX:0.38, imgY:0.22, desc:'各式手作體驗課程，需提前預約確認時段。',             tag:'orange', tagLabel:'需預約' },
  { id:9,  name:'高齡服務培訓中心',   icon:'🎓', lat:22.759661, lng:121.095214, imgX:0.65, imgY:0.87, desc:'專業培訓空間，適合了解服務模式，教育參訪首選。',      tag:'green',  tagLabel:'教育參訪' },
  { id:10, name:'休憩小舖',           icon:'☕', lat:22.760558, lng:121.096014, imgX:0.79, imgY:0.68, desc:'輕食飲品，參觀中場休息使用，提供茶飲與輕點心。',     tag:'gold',   tagLabel:'休息站' },
  { id:11, name:'聖堂 · 天使花園',   icon:'⛪', lat:22.759614, lng:121.095614, imgX:0.72, imgY:0.88, desc:'靈性空間與靜謐庭園，可自由參觀，氛圍寧靜。',         tag:'gold',   tagLabel:'靜思空間' },
  { id:12, name:'木工教室',           icon:'🪚', lat:22.762258, lng:121.092814, imgX:0.23, imgY:0.32, desc:'木工體驗課程，提供親手製作的樂趣，需提前預約。',     tag:'orange', tagLabel:'需預約' },
  { id:13, name:'康樂據點',           icon:'🏥', lat:22.761456, lng:121.094186, imgX:0.47, imgY:0.49, desc:'社區型健康服務空間，日常活動示範中心。',             tag:'green',  tagLabel:'服務示範' },
  { id:14, name:'森林好食光',         icon:'🍃', lat:22.762731, lng:121.096357, imgX:0.85, imgY:0.22, desc:'東北角森林餐飲體驗空間，享受自然中用餐的美好。',     tag:'gold',   tagLabel:'餐飲' },
])

// ── GPS 狀態 ──────────────────────────────────────────────────
const isTracking = ref(false)
const currentGPS = ref(null)
const errorMsg = ref('')
const lastUpdated = ref('')
const watchId = ref(null)

function toggleTracking() {
  isTracking.value ? stopTracking() : startTracking()
}
function startTracking() {
  if (!navigator.geolocation) { showError('此裝置不支援 GPS 定位'); return }
  isTracking.value = true
  watchId.value = navigator.geolocation.watchPosition(
    (pos) => {
      currentGPS.value = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
      lastUpdated.value = new Date().toLocaleTimeString('zh-TW')
    },
    (err) => {
      const msgs = { 1:'使用者拒絕定位授權', 2:'無法取得位置資訊', 3:'定位請求逾時' }
      showError(msgs[err.code] || '定位失敗')
      isTracking.value = false
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
  )
}
function stopTracking() {
  if (watchId.value !== null) { navigator.geolocation.clearWatch(watchId.value); watchId.value = null }
  isTracking.value = false
  currentGPS.value = null
}

// ── 圖片尺寸 ─────────────────────────────────────────────────
const mapImage = ref(null)
const mapWrapper = ref(null)
const mapContainer = ref(null)
const imageSize = ref({ w: 0, h: 0 })
const zoom = ref(1)

function onImageLoad() {
  imageSize.value = { w: mapImage.value.naturalWidth, h: mapImage.value.naturalHeight }
}

// ── 位置轉換 ─────────────────────────────────────────────────
const mappedPosition = computed(() => {
  if (!currentGPS.value) return null
  return gpsToImgFraction(currentGPS.value.lat, currentGPS.value.lng)
})

const dotStyle = computed(() => {
  if (!mappedPosition.value) return {}
  return { left: mappedPosition.value.x * 100 + '%', top: mappedPosition.value.y * 100 + '%' }
})

function pinStyle(lm) {
  return { left: lm.imgX * 100 + '%', top: lm.imgY * 100 + '%' }
}

// ── 最近設施 ─────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

const nearestLandmark = computed(() => {
  if (!currentGPS.value) return null
  let nearest = null, minDist = Infinity
  for (const lm of landmarks.value) {
    const dist = haversine(currentGPS.value.lat, currentGPS.value.lng, lm.lat, lm.lng)
    if (dist < minDist) { minDist = dist; nearest = { ...lm, dist } }
  }
  return nearest
})

function distToLandmark(lm) {
  if (!currentGPS.value) return '—'
  return haversine(currentGPS.value.lat, currentGPS.value.lng, lm.lat, lm.lng)
}

// ── 設施互動 ─────────────────────────────────────────────────
const selectedLandmark = ref(null)
function selectLandmark(lm) {
  selectedLandmark.value = selectedLandmark.value?.id === lm.id ? null : lm
}

// ── 置中到我的位置 ─────────────────────────────────────────
async function centerOnMe() {
  if (!mappedPosition.value || !mapWrapper.value) return
  await nextTick()
  const wrapper = mapWrapper.value
  const containerW = wrapper.clientWidth
  const containerH = wrapper.clientHeight
  const imgW = mapImage.value?.offsetWidth || containerW
  const imgH = mapImage.value?.offsetHeight || containerH
  const targetX = mappedPosition.value.x * imgW * zoom.value - containerW / 2
  const targetY = mappedPosition.value.y * imgH * zoom.value - containerH / 2
  wrapper.scrollTo({ left: Math.max(0, targetX), top: Math.max(0, targetY), behavior: 'smooth' })
}

// ── UI 狀態 ──────────────────────────────────────────────────
const statusClass = computed(() => {
  if (!isTracking.value) return 'status-off'
  if (currentGPS.value) return 'status-live'
  return 'status-searching'
})
const statusText = computed(() => {
  if (!isTracking.value) return '尚未定位'
  if (currentGPS.value) return 'GPS 即時追蹤中'
  return '搜尋 GPS 訊號…'
})

function showError(msg) {
  errorMsg.value = msg
  setTimeout(() => { errorMsg.value = '' }, 4000)
}

onUnmounted(() => { stopTracking() })
</script>

<style scoped>
.park-map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: 'Noto Sans TC', 'PingFang TC', sans-serif;
  background: #f5f0e8;
  color: #1a1a1a;
}

/* ── Header ── */
.header {
  background: linear-gradient(135deg, #2d5a27, #4a8c3f);
  color: white;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  z-index: 10;
}
.header h1 { font-size: 17px; font-weight: 700; margin-bottom: 2px; }
.header p  { font-size: 11px; opacity: 0.75; }

.gps-status {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; background: rgba(255,255,255,0.15);
  padding: 6px 12px; border-radius: 20px; white-space: nowrap;
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #888; flex-shrink: 0; }
.status-live .status-dot     { background: #4eff6a; box-shadow: 0 0 8px #4eff6a; animation: blink 1.5s infinite; }
.status-searching .status-dot{ background: #ffd700; animation: blink 0.8s infinite; }
.status-off .status-dot      { background: #888; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

/* ── Toolbar ── */
.toolbar {
  display: flex; gap: 8px; padding: 8px 12px;
  background: white; border-bottom: 1px solid #e8e0d4;
  overflow-x: auto; scrollbar-width: none; flex-shrink: 0;
}
.toolbar::-webkit-scrollbar { display: none; }
.tool-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 13px; border: 1.5px solid #ddd; border-radius: 8px;
  background: white; font-size: 13px; font-family: inherit;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  color: #555; transition: all 0.2s;
}
.tool-btn svg { width: 14px; height: 14px; }
.tool-btn:hover { border-color: #4a8c3f; color: #2d5a27; }
.tool-btn.active { background: #2d5a27; border-color: #2d5a27; color: white; }

/* ── Map ── */
.map-wrapper {
  flex: 1; overflow: auto; position: relative; background: #ddd8cc;
}
.map-container {
  display: inline-block; position: relative; min-width: 100%;
  transform-origin: top left; transition: transform 0.15s;
}
.map-img { display: block; width: 100%; height: auto; user-select: none; pointer-events: none; }

/* ── Zoom controls ── */
.zoom-controls {
  position: fixed; right: 16px; bottom: 140px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  z-index: 50;
}
.zoom-btn {
  width: 36px; height: 36px; background: white; border: 1.5px solid #ccc;
  border-radius: 8px; font-size: 18px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; color: #333;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12); transition: background 0.15s;
}
.zoom-btn:hover { background: #f5f0e8; }
.zoom-val { font-size: 11px; color: #999; padding: 2px 0; }

/* ── Position dot ── */
.position-dot {
  position: absolute; transform: translate(-50%, -50%); z-index: 20;
  pointer-events: none;
}
.dot-core {
  width: 16px; height: 16px; background: #2979ff;
  border: 3px solid white; border-radius: 50%;
  box-shadow: 0 2px 8px rgba(41,121,255,0.5); position: relative; z-index: 3;
}
.pulse-ring {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  width: 16px; height: 16px; border: 2px solid rgba(41,121,255,0.7);
  border-radius: 50%; animation: pulseRing 2s ease-out infinite; z-index: 1;
}
.pulse-ring.delay { animation-delay: 1s; }
@keyframes pulseRing {
  0%   { transform: translate(-50%,-50%) scale(1); opacity: 0.8; }
  100% { transform: translate(-50%,-50%) scale(4); opacity: 0; }
}
.position-label {
  position: absolute; top: -26px; left: 50%; transform: translateX(-50%);
  background: #2979ff; color: white; font-size: 11px;
  padding: 3px 8px; border-radius: 10px; white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

/* ── Landmark pins ── */
.landmark-pin {
  position: absolute; transform: translate(-50%, -100%);
  z-index: 10; cursor: pointer;
  display: flex; flex-direction: column; align-items: center;
  transition: transform 0.2s, z-index 0s;
}
.landmark-pin:hover, .landmark-pin.selected {
  transform: translate(-50%, -100%) scale(1.25); z-index: 15;
}
.landmark-pin.nearby .pin-icon {
  filter: drop-shadow(0 0 6px rgba(41,121,255,0.8)) drop-shadow(0 2px 3px rgba(0,0,0,0.35));
}
.pin-icon { font-size: 22px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35)); line-height: 1; }
.pin-label {
  background: rgba(255,255,255,0.93); font-size: 10px;
  padding: 2px 6px; border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15); margin-top: 2px;
  white-space: nowrap; color: #1a1a1a; font-weight: 500;
}
.landmark-pin.selected .pin-label { background: #2d5a27; color: white; }
.landmark-pin.nearby   .pin-label { background: #1a56cc; color: white; }

/* ── Info bar ── */
.info-bar {
  background: white; padding: 12px 16px;
  border-top: 1px solid #e8e0d4; flex-shrink: 0;
}
.info-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 4px; margin-bottom: 10px;
}
.info-item { text-align: center; }
.info-label { display: block; font-size: 10px; color: #999; margin-bottom: 1px; }
.info-val   { font-size: 12px; font-weight: 600; color: #1a1a1a; }
.nearest {
  display: flex; align-items: center; gap: 10px;
  background: #edf7e8; border-radius: 10px; padding: 8px 12px;
}
.nearest-icon  { font-size: 22px; }
.nearest-name  { font-size: 13px; font-weight: 600; color: #2d5a27; }
.nearest-dist  { font-size: 11px; color: #888; }

/* ── Detail sheet ── */
.detail-sheet {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: white; border-radius: 20px 20px 0 0;
  padding: 24px 24px 36px; box-shadow: 0 -8px 32px rgba(0,0,0,0.15);
  z-index: 100; text-align: center;
}
.detail-close {
  position: absolute; top: 14px; right: 16px;
  background: #f5f0e8; border: none; width: 28px; height: 28px;
  border-radius: 50%; font-size: 13px; cursor: pointer; color: #555;
}
.detail-icon { font-size: 36px; margin-bottom: 8px; }
.detail-sheet h3 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.detail-sheet p  { font-size: 14px; color: #555; margin-bottom: 12px; }
.detail-meta  { display: flex; align-items: center; justify-content: center; gap: 12px; }
.detail-tag   { padding: 4px 14px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.detail-dist  { font-size: 13px; color: #2979ff; font-weight: 500; }
.tag-green  { background: #edf7e8; color: #2d5a27; }
.tag-orange { background: #fff0e5; color: #e8621a; }
.tag-gold   { background: #fdf5e0; color: #c8962a; }

/* ── Error toast ── */
.error-toast {
  position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
  background: #cc2200; color: white; padding: 10px 20px;
  border-radius: 12px; font-size: 13px; z-index: 200; white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

/* ── Transitions ── */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(12px); }
.sheet-enter-active, .sheet-leave-active { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); }
.pop-enter-active { transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.pop-enter-from   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
