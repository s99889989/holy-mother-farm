<script setup>
  import {ref, computed, onMounted, onUnmounted, nextTick} from 'vue'
  import {useCommonStore} from '~/stores/common.js'

  definePageMeta({ layout: 'staff' })

  const commonStore = useCommonStore()
  const BASE = computed(() => commonStore.data.main_url + '/holy/checkin')

  // ════════════════════════════════════════════════════
  // 測試模式 — 後端尚未串接，先用假資料讓畫面/流程可以測試
  // 之後 /holy/checkin/scan、/holy/checkin/today 做好後，
  // 把這裡關掉（或直接刪除 testMode 相關程式碼）即可切換成真實 API
  // ════════════════════════════════════════════════════
  const testMode = ref(true)
  const voiceEnabled = ref(true)
  const MOCK_CUSTOMERS = [
    { id: '1', name: '吳宣澔', email: 's02048898067@gmail.com', picture: null },
    { id: '2', name: '測試會員 A', email: 'test-a@example.com', picture: null },
    { id: '3', name: '測試會員 B', email: 'test-b@example.com', picture: null },
  ]
  const mockCheckedIn = ref([]) // { customer, checkedInAt }

  // ════════════════════════════════════════════════════
  // 掃描模式：camera（相機掃描）/ manual（手動輸入，方便測試或無相機時使用）
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
  const jsQRReady = ref(false)
  let mediaStream = null
  let rafId = null
  let lastScanValue = null
  let lastScanTime = 0
  const SCAN_COOLDOWN_MS = 3000

  const loadJsQR = () => new Promise((resolve, reject) => {
    if (window.jsQR) { jsQRReady.value = true; resolve(); return }
    const existing = document.getElementById('jsqr-script')
    if (existing) {
      existing.addEventListener('load', () => { jsQRReady.value = true; resolve() })
      return
    }
    const script = document.createElement('script')
    script.id = 'jsqr-script'
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
    script.async = true
    script.onload = () => { jsQRReady.value = true; resolve() }
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
  // 解碼後的共同處理（相機掃描 / 手動輸入都會走這裡）
  // ════════════════════════════════════════════════════
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const banner = ref(null) // { status: 'success'|'duplicate'|'not_found'|'invalid'|'error', customer, checkedInAt, message }
  let bannerTimer = null

  const showBanner = (payload) => {
    banner.value = payload
    clearTimeout(bannerTimer)
    bannerTimer = setTimeout(() => { banner.value = null }, 4000)
  }

  // QRCode 內容現在是 encodeURIComponent 過的 JSON：
  // %7B%22name%22...（純 ASCII，讓 DK-7322 這類 USB 鍵盤模擬掃描器也能正確打出中文姓名）
  // 手動輸入 / 舊版 QRCode（未做 URI 編碼的 JSON 或純 email 字串）也相容
  const parseScannedValue = (raw) => {
    const tryParseJson = (str) => {
      try {
        const obj = JSON.parse(str)
        if (obj && typeof obj.email === 'string') {
          return { email: obj.email, name: typeof obj.name === 'string' ? obj.name : '' }
        }
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

    return { email: raw, name: '' }
  }

  const handleDecodedValue = (value, { skipCooldown = false } = {}) => {
    const now = Date.now()
    if (!skipCooldown && value === lastScanValue && now - lastScanTime < SCAN_COOLDOWN_MS) return
    lastScanValue = value
    lastScanTime = now

    const { email, name: qrName } = parseScannedValue(value)
    if (!EMAIL_RE.test(email)) {
      showBanner({ status: 'invalid', message: '掃描到的內容不是有效的會員 QRCode' })
      return
    }
    performCheckin(email, qrName)
  }

  // ════════════════════════════════════════════════════
  // 簽到動作：測試模式走假資料，正式模式打後端 API
  // ════════════════════════════════════════════════════
  const submitting = ref(false)

  const performCheckin = async (email, qrName = '') => {
    submitting.value = true
    try {
      if (testMode.value) {
        const result = mockScan(email, qrName)
        applyResult(result, qrName)
      } else {
        const res = await fetch(`${BASE.value}/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email })
        })
        const data = await res.json()
        applyResult(data, qrName)
      }
    } catch {
      showBanner({ status: 'error', message: '後端尚未連線，可先開啟上方「測試模式」試用畫面流程' })
    } finally {
      submitting.value = false
    }
  }

  const mockScan = (email, qrName = '') => {
    let customer = MOCK_CUSTOMERS.find(c => c.email === email)
    // 測試模式下，若假資料清單裡沒有這個 email，直接用 QRCode 帶的 name 現場建一筆，
    // 方便用自己的 QRCode（展示個人QRCode）測試完整流程
    if (!customer && qrName) {
      customer = { id: email, name: qrName, email, picture: null }
    }
    if (!customer) return { found: false }
    const already = mockCheckedIn.value.some(r => r.customer.email === email)
    const checkedAt = new Date().toISOString()
    if (!already) mockCheckedIn.value.unshift({ customer, checkedInAt: checkedAt })
    return { found: true, alreadyCheckedIn: already, customer, checkedInAt: checkedAt }
  }

  // ── 語音播報 ─────────────────────────────────────────────────────
  const speak = (text) => {
    if (!voiceEnabled.value || !window.speechSynthesis) return
    window.speechSynthesis.cancel() // 避免連續簽到時語音疊在一起
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'zh-TW'
    window.speechSynthesis.speak(utter)
  }

  const applyResult = (data, qrName = '') => {
    if (!data?.found) {
      showBanner({ status: 'not_found', message: '查無此會員，請確認 QRCode 是否正確' })
      return
    }
    const displayName = data.customer?.name || qrName || ''
    showBanner({
      status: data.alreadyCheckedIn ? 'duplicate' : 'success',
      customer: data.customer,
      checkedInAt: data.checkedInAt,
      message: data.alreadyCheckedIn ? '今日已簽到過囉' : '簽到成功'
    })
    if (displayName) {
      speak(data.alreadyCheckedIn ? `${displayName}，您已經簽到過了` : `${displayName}，簽到成功`)
    }
    if (!testMode.value) fetchTodayList()
  }

  // ── 手動輸入送出（測試 / 無相機時使用）──────────────────────────────
  const submitManual = () => {
    const value = manualEmail.value.trim()
    if (!value) return
    handleDecodedValue(value, { skipCooldown: true })
    manualEmail.value = ''
    focusManualInput()
  }

  // ════════════════════════════════════════════════════
  // 今日簽到清單
  // ════════════════════════════════════════════════════
  const todayList = ref([])
  const todayListDisplay = computed(() => testMode.value ? mockCheckedIn.value : todayList.value)

  const fetchTodayList = async () => {
    if (testMode.value) return
    try {
      const res = await fetch(`${BASE.value}/today`, { credentials: 'include' })
      const data = await res.json()
      todayList.value = Array.isArray(data) ? data : []
    } catch {
      todayList.value = []
    }
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  }

  // ════════════════════════════════════════════════════
  watch(mode, (val) => {
    if (val === 'camera') startCamera()
    else { stopCamera(); focusManualInput() }
  })

  onMounted(() => {
    fetchTodayList()
    if (mode.value === 'camera') startCamera()
    else focusManualInput()
  })

  onUnmounted(() => {
    stopCamera()
    clearTimeout(bannerTimer)
  })
</script>

<template>
  <div class="ci-wrap">
    <div class="ci-header">
      <div>
        <h1 class="ci-title">簽到系統</h1>
        <p class="ci-subtitle">掃描會員個人 QRCode 進行簽到</p>
      </div>
      <div class="ci-header__toggles">
        <label class="ci-testmode">
          <input type="checkbox" v-model="testMode">
          <span>測試模式（尚未接後端時使用假資料）</span>
        </label>
        <label class="ci-testmode ci-testmode--voice">
          <input type="checkbox" v-model="voiceEnabled">
          <span>語音播報姓名</span>
        </label>
      </div>
    </div>

    <div class="ci-tabs">
      <button class="ci-tab" :class="{ active: mode === 'camera' }" @click="mode = 'camera'">相機掃描</button>
      <button class="ci-tab" :class="{ active: mode === 'manual' }" @click="mode = 'manual'">外接掃描器／手動輸入</button>
    </div>

    <div class="ci-panel">
      <!-- 相機掃描 -->
      <div v-if="mode === 'camera'" class="ci-camera">
        <div class="ci-camera__frame">
          <video ref="videoRef" class="ci-camera__video" muted playsinline></video>
          <canvas ref="canvasRef" style="display:none;"></canvas>
          <div class="ci-camera__reticle"></div>
          <p v-if="!cameraActive && !cameraError" class="ci-camera__hint">啟動相機中…</p>
        </div>
        <p v-if="cameraError" class="ci-camera__error">{{ cameraError }}</p>
        <p v-else class="ci-camera__tip">將會員個人 QRCode 對準框內即可自動簽到</p>
      </div>

      <!-- 外接掃描器（如 DK-7322）／手動輸入 -->
      <form v-else class="ci-manual" @submit.prevent="submitManual">
        <label class="ci-manual__label">掃描槍請對準此欄位掃描，或手動輸入會員 Email</label>
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
          <button type="submit" class="ci-manual__btn" :disabled="submitting">簽到</button>
        </div>
        <p class="ci-manual__scanner-tip">使用 DK-7322 等 USB 掃描槍：插上即可用（免驅動），掃描前先點一下上方欄位讓游標在裡面，接著掃描會員 QRCode，掃描槍會自動輸入內容並送出簽到。</p>
      </form>
    </div>

    <!-- 結果提示 -->
    <Transition name="ci-banner-fade">
      <div v-if="banner" class="ci-banner" :class="`ci-banner--${banner.status}`">
        <div v-if="banner.customer" class="ci-banner__avatar">
          <img v-if="banner.customer.picture" :src="banner.customer.picture" :alt="banner.customer.name">
          <span v-else>{{ banner.customer.name?.charAt(0)?.toUpperCase() }}</span>
        </div>
        <div class="ci-banner__text">
          <p class="ci-banner__title">{{ banner.message }}</p>
          <p v-if="banner.customer" class="ci-banner__name">
            {{ banner.customer.name }}<span v-if="banner.checkedInAt"> · {{ formatTime(banner.checkedInAt) }}</span>
          </p>
        </div>
      </div>
    </Transition>

    <!-- 今日簽到清單 -->
    <div class="ci-list-card">
      <div class="ci-list-card__header">
        <h2 class="ci-list-card__title">今日簽到</h2>
        <span class="ci-list-card__count">{{ todayListDisplay.length }} 人</span>
      </div>
      <p v-if="!todayListDisplay.length" class="ci-list-card__empty">今日尚無簽到紀錄</p>
      <ul v-else class="ci-list">
        <li v-for="(row, i) in todayListDisplay" :key="row.customer?.id || i" class="ci-list__item">
          <div class="ci-list__avatar">
            <img v-if="row.customer?.picture" :src="row.customer.picture" :alt="row.customer?.name">
            <span v-else>{{ row.customer?.name?.charAt(0)?.toUpperCase() }}</span>
          </div>
          <div class="ci-list__info">
            <p class="ci-list__name">{{ row.customer?.name }}</p>
            <p class="ci-list__email">{{ row.customer?.email }}</p>
          </div>
          <span class="ci-list__time">{{ formatTime(row.checkedInAt) }}</span>
        </li>
      </ul>
    </div>
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
    color: #b06a00;
    background: #fff8ea;
    border: 1px solid #f3e0b0;
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
    user-select: none;
  }
  .ci-testmode input { accent-color: #1FC29C; }
  .ci-header__toggles { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
  .ci-testmode--voice { color: #1a7a52; background: #f0fdf9; border-color: #b7ecdd; }

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

  .ci-banner__avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: #1FC29C; color: #fff; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden;
  }
  .ci-banner__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .ci-banner__title { font-size: 14px; font-weight: 700; color: #1a3d28; margin: 0; }
  .ci-banner__name { font-size: 12px; color: #6b7d71; margin: 2px 0 0; }

  .ci-banner-fade-enter-active,
  .ci-banner-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
  .ci-banner-fade-enter-from,
  .ci-banner-fade-leave-to { opacity: 0; transform: translateY(-6px); }

  /* 今日清單 */
  .ci-list-card {
    background: #fff;
    border: 1px solid #dce8d8;
    border-radius: 14px;
    padding: 16px 18px;
  }
  .ci-list-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ci-list-card__title { font-size: 15px; font-weight: 700; color: #1a3d28; margin: 0; }
  .ci-list-card__count { font-size: 12px; color: #fff; background: #1FC29C; border-radius: 999px; padding: 2px 10px; }
  .ci-list-card__empty { font-size: 13px; color: #9aa89f; text-align: center; padding: 20px 0; margin: 0; }

  .ci-list { list-style: none; padding: 0; margin: 0; }
  .ci-list__item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #f0f5f1;
  }
  .ci-list__item:last-child { border-bottom: none; }
  .ci-list__avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: #e6f7f1; color: #1a7a52; font-weight: 700; font-size: 13px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden;
  }
  .ci-list__avatar img { width: 100%; height: 100%; object-fit: cover; }
  .ci-list__info { min-width: 0; flex: 1; }
  .ci-list__name { font-size: 14px; font-weight: 600; color: #333; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ci-list__email { font-size: 11px; color: #999; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ci-list__time { font-size: 12px; color: #7a8f81; flex-shrink: 0; }
</style>
