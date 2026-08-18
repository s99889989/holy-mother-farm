<script setup>
// 專案 holy-mother-farm 位置 pages/front/course/[id]/checkin/index.vue
//
// 用途：這堂課的「掃描簽到」入口頁 —— 掃學員個人 QRCode（跟 holy/checkin
// 會員簽到系統共用同一組 QRCode，內容是 email），後端會自動反查是誰、
// 是不是這堂課的報名者、完成簽到，前端全程不用知道 email 對到哪個 customerId。
//
// 跟 checkin.vue 的差異：不是「切換」簽到狀態，是「確保變成已簽到」，
// 所以同一個人重複掃描不會被誤取消，只會顯示「已經簽到過」。
//
// 這頁做完之後，同資料夾下的 [regId].vue（已知報名 id 直接簽到，靠 toggle/
// toggleAttendance）目前用不到了，先保留，之後如果有其他入口（例如報名成功
// 頁直接給連結）要用到已知 id 的簽到，還是可以接上。

import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const route = useRoute()
const courseId = route.params.id

const commonStore = useCommonStore()
const BASE = computed(() => `${commonStore.data.main_url}/holy/course-reg`)

const courseName = ref('')
const loadingCourse = ref(true)

onMounted(async () => {
  try {
    const res = await fetch(`${BASE.value}/public/${courseId}`)
    const data = await res.json()
    courseName.value = data?.name || ''
  } catch {
    courseName.value = ''
  } finally {
    loadingCourse.value = false
  }
})

const voiceEnabled = ref(true)

// ════════════════════════════════════════════════════
// 掃描模式：camera（相機掃描）/ manual（手動輸入 / 外接掃描槍）
// ════════════════════════════════════════════════════
const mode = ref('manual')
const manualEmail = ref('')
const manualInputRef = ref(null)
const focusManualInput = () => nextTick(() => manualInputRef.value?.focus())

// ── 相機 / QRCode 解碼 ──────────────────────────────────────────────
const videoRef = ref(null)
const canvasRef = ref(null)
const cameraActive = ref(false)
const cameraError = ref('')
let mediaStream = null
let rafId = null
let lastScanValue = null
let lastScanTime = 0
const SCAN_COOLDOWN_MS = 3000

const loadJsQR = () => new Promise((resolve, reject) => {
  if (window.jsQR) { resolve(); return }
  const existing = document.getElementById('jsqr-script')
  if (existing) {
    existing.addEventListener('load', () => resolve())
    return
  }
  const script = document.createElement('script')
  script.id = 'jsqr-script'
  script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
  script.async = true
  script.onload = () => resolve()
  script.onerror = () => reject(new Error('jsQR 載入失敗'))
  document.head.appendChild(script)
})

const startCamera = async () => {
  cameraError.value = ''
  try {
    await loadJsQR()
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    await nextTick()
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play()
      cameraActive.value = true
      scanLoop()
    }
  } catch (err) {
    cameraError.value = err?.name === 'NotAllowedError'
      ? '未取得相機權限，請允許瀏覽器使用相機，或改用下方手動輸入。'
      : '無法啟動相機，請改用下方手動輸入。'
    cameraActive.value = false
  }
}

const stopCamera = () => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }
  cameraActive.value = false
}

const scanLoop = () => {
  if (!cameraActive.value || !videoRef.value || !canvasRef.value || !window.jsQR) {
    rafId = requestAnimationFrame(scanLoop)
    return
  }
  const video = videoRef.value
  const canvas = canvasRef.value
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = window.jsQR(imageData.data, imageData.width, imageData.height)
    if (code?.data) handleDecodedValue(code.data)
  }
  rafId = requestAnimationFrame(scanLoop)
}

// ════════════════════════════════════════════════════
// 解碼後的共同處理（相機掃描 / 手動輸入 / 外接掃描槍都會走這裡）
// ════════════════════════════════════════════════════
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const banner = ref(null) // { status, name, courseName, date, message }
let bannerTimer = null

const showBanner = (payload) => {
  banner.value = payload
  clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => { banner.value = null }, 4000)
}

// 跟 checkin.vue 相容同一組 QRCode 格式：encodeURIComponent 過的 JSON、
// 未編碼的 JSON、或純 email 字串
const parseScannedValue = (raw) => {
  const tryParseJson = (str) => {
    try {
      const obj = JSON.parse(str)
      if (obj && typeof obj.email === 'string') return obj.email
    } catch { /* not JSON */ }
    return null
  }

  try {
    const decoded = decodeURIComponent(raw)
    const result = tryParseJson(decoded)
    if (result) return result
  } catch { /* not URI-encoded */ }

  const directResult = tryParseJson(raw)
  if (directResult) return directResult

  return raw
}

const handleDecodedValue = (value, { skipCooldown = false } = {}) => {
  const now = Date.now()
  if (!skipCooldown && value === lastScanValue && now - lastScanTime < SCAN_COOLDOWN_MS) return
  lastScanValue = value
  lastScanTime = now

  const email = parseScannedValue(value)
  if (!EMAIL_RE.test(email)) {
    showBanner({ status: 'invalid', message: '掃描到的內容不是有效的會員 QRCode' })
    return
  }
  performCheckin(email)
}

// ════════════════════════════════════════════════════
// 簽到動作：打後端 checkin-by-email API
// ════════════════════════════════════════════════════
const submitting = ref(false)

const performCheckin = async (email) => {
  submitting.value = true
  try {
    const res = await fetch(`${BASE.value}/${courseId}/checkin-by-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    applyResult(data)
  } catch {
    showBanner({ status: 'error', message: '網路異常，請稍後再試或聯繫現場工作人員' })
  } finally {
    submitting.value = false
  }
}

// ── 語音播報 ─────────────────────────────────────────────────────
const speak = (text) => {
  if (!voiceEnabled.value || !window.speechSynthesis) return
  window.speechSynthesis.cancel() // 避免連續簽到時語音疊在一起
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-TW'
  window.speechSynthesis.speak(utter)
}

const applyResult = (data) => {
  if (data?.error) {
    showBanner({ status: 'not_found', message: data.error })
    return
  }
  showBanner({
    status: data.duplicate ? 'duplicate' : 'success',
    name: data.displayName,
    date: data.date,
    message: data.duplicate ? '今天已經簽到過囉' : '簽到成功'
  })
  if (data.displayName) {
    speak(data.duplicate ? `${data.displayName}，您已經簽到過了` : `${data.displayName}，簽到成功`)
  }
}

// ── 手動輸入送出（外接掃描槍打完 Enter 也會走這裡）─────────────────
const submitManual = () => {
  const value = manualEmail.value.trim()
  if (!value) return
  handleDecodedValue(value, { skipCooldown: true })
  manualEmail.value = ''
  focusManualInput()
}

// ════════════════════════════════════════════════════
// 全頁監聽掃描槍輸入 —— DK-7322 這類 USB 鍵盤模擬掃描槍是把內容
// 「打」進目前有焦點的元素；沒特別點過輸入框時焦點通常停在 <body>，
// 導致掃描沒反應。這裡改成監聽整個頁面按鍵，只要焦點不是落在其他
// 輸入類元件上，就直接收進 manualEmail，不用先手動點輸入框
// ════════════════════════════════════════════════════
let scannerBuffer = ''
let lastGlobalKeyTime = 0
const GLOBAL_SCAN_RESET_MS = 150

const isEditableTarget = (el) => {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

const handleGlobalKeydown = (e) => {
  if (mode.value !== 'manual') return
  if (isEditableTarget(e.target)) return

  if (e.key === 'Enter') {
    e.preventDefault()
    if (scannerBuffer) {
      handleDecodedValue(scannerBuffer, { skipCooldown: true })
      scannerBuffer = ''
    }
    return
  }

  const now = Date.now()
  if (now - lastGlobalKeyTime > GLOBAL_SCAN_RESET_MS) scannerBuffer = ''
  lastGlobalKeyTime = now

  if (e.key.length === 1) {
    scannerBuffer += e.key
    manualEmail.value = scannerBuffer
  }
}

watch(mode, (val) => {
  if (val === 'camera') startCamera()
  else { stopCamera(); focusManualInput() }
})

onMounted(() => {
  if (mode.value === 'camera') startCamera()
  else focusManualInput()
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  stopCamera()
  clearTimeout(bannerTimer)
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="ci-wrap">
    <div class="ci-header">
      <div>
        <h1 class="ci-title">活動簽到</h1>
        <p class="ci-subtitle">
          {{ loadingCourse ? '載入中…' : (courseName || '掃描會員個人 QRCode 進行簽到') }}
        </p>
      </div>
      <label class="ci-testmode ci-testmode--voice">
        <input v-model="voiceEnabled" type="checkbox">
        <span>語音播報姓名</span>
      </label>
    </div>

    <div class="ci-tabs">
      <button class="ci-tab" :class="{ active: mode === 'camera' }" @click="mode = 'camera'">
        相機掃描
      </button>
      <button class="ci-tab" :class="{ active: mode === 'manual' }" @click="mode = 'manual'">
        外接掃描器／手動輸入
      </button>
    </div>

    <div class="ci-panel">
      <!-- 相機掃描 -->
      <div v-if="mode === 'camera'" class="ci-camera">
        <div class="ci-camera__frame">
          <video ref="videoRef" class="ci-camera__video" muted playsinline />
          <canvas ref="canvasRef" style="display:none;" />
          <div class="ci-camera__reticle" />
          <p v-if="!cameraActive && !cameraError" class="ci-camera__hint">啟動相機中…</p>
        </div>
        <p v-if="cameraError" class="ci-camera__error">{{ cameraError }}</p>
        <p v-else class="ci-camera__tip">將會員個人 QRCode 對準框內即可自動簽到</p>
      </div>

      <!-- 外接掃描器（如 DK-7322）／手動輸入 -->
      <form v-else class="ci-manual" @submit.prevent="submitManual">
        <label class="ci-manual__label">直接用掃描槍掃描即可（免點擊輸入框），或手動輸入會員 Email</label>
        <div class="ci-manual__row">
          <input
            ref="manualInputRef"
            v-model="manualEmail"
            type="text"
            inputmode="email"
            placeholder="example@gmail.com"
            class="ci-manual__input"
            autofocus
            required
          >
          <button type="submit" class="ci-manual__btn" :disabled="submitting">
            簽到
          </button>
        </div>
        <p class="ci-manual__scanner-tip">使用 DK-7322 等 USB 掃描槍：插上即可用（免驅動），在此頁面上直接掃描會員 QRCode 即可自動簽到，不需要先點擊輸入框（除非游標正停在其他文字欄位裡）。</p>
      </form>
    </div>

    <!-- 結果提示 -->
    <Transition name="ci-banner-fade">
      <div v-if="banner" class="ci-banner" :class="`ci-banner--${banner.status}`">
        <div class="ci-banner__text">
          <p class="ci-banner__title">{{ banner.message }}</p>
          <p v-if="banner.name" class="ci-banner__name">
            {{ banner.name }}<span v-if="banner.date"> · {{ banner.date }}</span>
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ci-wrap {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 16px 60px;
  font-family: 'Noto Sans TC', sans-serif;
}

.ci-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}
.ci-title { font-size: 22px; font-weight: 700; color: #1a3d28; margin: 0; }
.ci-subtitle { font-size: 13px; color: #7a8f81; margin: 4px 0 0; }

.ci-testmode {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #1a7a52;
  background: #f0fdf9;
  border: 1px solid #b7ecdd;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
}
.ci-testmode input { accent-color: #1FC29C; }

.ci-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.ci-tab {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #dce8d8;
  background: #fff;
  color: #4a5f52;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.ci-tab.active { background: #1FC29C; border-color: #1FC29C; color: #fff; }

.ci-panel {
  background: #fff;
  border: 1px solid #dce8d8;
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 16px;
}

/* 相機 */
.ci-camera__frame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 320px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  background: #0d1f16;
}
.ci-camera__video { width: 100%; height: 100%; object-fit: cover; display: block; }
.ci-camera__reticle {
  position: absolute;
  inset: 14%;
  border: 3px solid rgba(31, 194, 156, 0.85);
  border-radius: 18px;
  pointer-events: none;
  box-shadow: 0 0 0 999px rgba(0,0,0,0.25);
}
.ci-camera__hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cfe9df;
  font-size: 13px;
  margin: 0;
}
.ci-camera__tip { text-align: center; font-size: 12px; color: #7a8f81; margin: 12px 0 0; }
.ci-camera__error { text-align: center; font-size: 13px; color: #d9534f; margin: 12px 0 0; }

/* 手動輸入 */
.ci-manual__label { display: block; font-size: 13px; font-weight: 600; color: #1a3d28; margin-bottom: 6px; }
.ci-manual__row { display: flex; gap: 8px; }
.ci-manual__input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #dce8d8;
  font-size: 14px;
  font-family: inherit;
}
.ci-manual__input:focus { outline: none; border-color: #1FC29C; }
.ci-manual__btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: #1FC29C;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.ci-manual__btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ci-manual__scanner-tip { font-size: 12px; color: #7a8f81; margin: 10px 0 0; line-height: 1.6; }

/* 結果提示 */
.ci-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid transparent;
}
.ci-banner--success { background: #f0fdf9; border-color: #b7ecdd; }
.ci-banner--duplicate { background: #fff8ea; border-color: #f3e0b0; }
.ci-banner--not_found,
.ci-banner--invalid,
.ci-banner--error { background: #fff2f1; border-color: #f5c2be; }

.ci-banner__title { font-size: 14px; font-weight: 700; color: #1a3d28; margin: 0; }
.ci-banner__name { font-size: 12px; color: #6b7d71; margin: 2px 0 0; }

.ci-banner-fade-enter-active,
.ci-banner-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.ci-banner-fade-enter-from,
.ci-banner-fade-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
