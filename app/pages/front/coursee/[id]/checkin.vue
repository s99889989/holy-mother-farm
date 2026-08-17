<script setup>
  import {ref, computed, onMounted, onUnmounted, nextTick, watch} from 'vue'
  import {useRoute} from 'vue-router'
  import {useCommonStore} from '~/stores/common.js'

  definePageMeta({ layout: 'staff' })

  const route = useRoute()
  const courseId = route.params.id
  const commonStore = useCommonStore()
  const BASE = computed(() => `${commonStore.data.main_url}/holy/course-reg/${courseId}/attendance`)

  // ════════════════════════════════════════════════════
  // 測試模式 — 後端出席簽到 API 尚未開發，先用假資料讓畫面/流程可以測試
  // ════════════════════════════════════════════════════
  const testMode = ref(true)
  const voiceEnabled = ref(true)

  const courseTitle = ref('')
  const sessions = ref([]) // { id, date, label }
  const students = ref([]) // { id, name, email, attendance: { [sessionId]: status } }

  const todayStr = () => new Date().toISOString().slice(0, 10)

  const seedMockData = () => {
    courseTitle.value = '功能性團課（測試資料）'
    sessions.value = [
      { id: 's1', date: '2026-08-04', label: 'GP1' },
      { id: 's2', date: '2026-08-06', label: 'GP2' },
      { id: 's3', date: '2026-08-11', label: 'GP3' },
      { id: 's4', date: todayStr(), label: 'GP4' }, // 讓測試資料裡有一場剛好是「今天」，方便測試自動選到
    ]
    students.value = [
      { id: 'st1', name: '測試學員 A', email: 'test-a@example.com', attendance: { s1: 'present', s2: 'present', s3: 'absent', s4: null } },
      { id: 'st2', name: '測試學員 B', email: 'test-b@example.com', attendance: { s1: 'present', s2: 'leave', s3: 'present', s4: null } },
      { id: 'st3', name: '測試學員 C', email: 'test-c@example.com', attendance: { s1: 'absent', s2: 'absent', s3: null, s4: null } },
      { id: 'st4', name: '吳宣澔', email: 's02048898067@gmail.com', attendance: { s1: null, s2: null, s3: null, s4: null } },
    ]
  }

  // ════════════════════════════════════════════════════
  // 讀取資料 + 選擇場次（預設抓「今天」那一場，找不到就給選單自己選）
  // ════════════════════════════════════════════════════
  const loading = ref(true)
  const loadError = ref('')
  const selectedSessionId = ref('')

  const pickDefaultSession = () => {
    const today = sessions.value.find(s => s.date === todayStr())
    selectedSessionId.value = today ? today.id : (sessions.value[0]?.id || '')
  }

  const fetchData = async () => {
    loading.value = true
    loadError.value = ''
    if (testMode.value) {
      seedMockData()
      pickDefaultSession()
      loading.value = false
      return
    }
    try {
      const res = await fetch(BASE.value, { credentials: 'include' })
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      courseTitle.value = data.courseTitle || ''
      sessions.value = Array.isArray(data.sessions) ? data.sessions : []
      students.value = Array.isArray(data.students) ? data.students : []
      pickDefaultSession()
    } catch {
      loadError.value = '後端尚未連線，可先開啟上方「測試模式」試用畫面流程'
    } finally {
      loading.value = false
    }
  }

  const selectedSession = computed(() => sessions.value.find(s => s.id === selectedSessionId.value) || null)
  const isTodaySession = computed(() => selectedSession.value?.date === todayStr())

  // ════════════════════════════════════════════════════
  // 掃描模式：camera（相機掃描）/ manual（外接掃描器／手動輸入）
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
    if (existing) { existing.addEventListener('load', resolve); return }
    const script = document.createElement('script')
    script.id = 'jsqr-script'
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('jsQR 載入失敗'))
    document.head.appendChild(script)
  })

  const startCamera = async () => {
    cameraError.value = ''
    try {
      await loadJsQR()
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
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
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null }
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

  // QRCode 內容是 encodeURIComponent 過的 JSON：%7B%22name%22...
  // 手動輸入 / 舊格式（未做 URI 編碼的 JSON 或純 email 字串）也相容
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

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const banner = ref(null) // { status: 'success'|'duplicate'|'not_found'|'invalid'|'no_session', student, message }
  let bannerTimer = null
  const showBanner = (payload) => {
    banner.value = payload
    clearTimeout(bannerTimer)
    bannerTimer = setTimeout(() => { banner.value = null }, 4000)
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
  // 簽到動作：比對本課程名單，標記所選場次為出席
  // ════════════════════════════════════════════════════
  const speak = (text) => {
    if (!voiceEnabled.value || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'zh-TW'
    window.speechSynthesis.speak(utter)
  }

  const performCheckin = async (email, qrName = '') => {
    if (!selectedSession.value) {
      showBanner({ status: 'no_session', message: '請先選擇要簽到的場次' })
      return
    }
    const student = students.value.find(s => s.email === email)
    if (!student) {
      showBanner({ status: 'not_found', message: '查無此學員的報名資料', qrEmail: email, qrName })
      return
    }
    const already = student.attendance[selectedSession.value.id] === 'present'
    student.attendance[selectedSession.value.id] = 'present'

    if (!testMode.value) {
      try {
        const res = await fetch(`${BASE.value}/mark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ studentId: student.id, sessionId: selectedSession.value.id, status: 'present' })
        })
        if (!res.ok) throw new Error('mark failed')
      } catch {
        showBanner({ status: 'error', message: '簽到失敗，後端尚未連線或發生錯誤' })
        return
      }
    }

    showBanner({
      status: already ? 'duplicate' : 'success',
      student,
      message: already ? '本場次已簽到過囉' : '簽到成功'
    })
    speak(already ? `${student.name}，您已經簽到過了` : `${student.name}，簽到成功`)
  }

  // ── 手動輸入 / 掃描槍送出 ──────────────────────────────────────────
  const submitManual = () => {
    const value = manualEmail.value.trim()
    if (!value) return
    handleDecodedValue(value, { skipCooldown: true })
    manualEmail.value = ''
    focusManualInput()
  }

  // ════════════════════════════════════════════════════
  // 全頁監聽掃描槍輸入（DK-7322 等 USB 鍵盤模擬掃描槍免點擊輸入框即可使用）
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

  // ════════════════════════════════════════════════════
  // 本場次已簽到名單（畫面上的即時清單）
  // ════════════════════════════════════════════════════
  const checkedInForSession = computed(() => {
    if (!selectedSession.value) return []
    return students.value.filter(s => s.attendance[selectedSession.value.id] === 'present')
  })

  // ════════════════════════════════════════════════════
  watch(mode, (val) => {
    if (val === 'camera') startCamera()
    else { stopCamera(); focusManualInput() }
  })

  onMounted(() => {
    fetchData()
    document.addEventListener('keydown', handleGlobalKeydown)
    if (mode.value === 'manual') focusManualInput()
  })

  onUnmounted(() => {
    stopCamera()
    clearTimeout(bannerTimer)
    document.removeEventListener('keydown', handleGlobalKeydown)
  })
</script>

<template>
  <div class="cc-wrap">
    <div class="cc-header">
      <div>
        <p class="cc-eyebrow">課程簽到</p>
        <h1 class="cc-title">{{ courseTitle || '課程簽到' }}</h1>
      </div>
      <div class="cc-header__toggles">
        <label class="cc-toggle">
          <input type="checkbox" v-model="testMode" @change="fetchData">
          <span>測試模式</span>
        </label>
        <label class="cc-toggle cc-toggle--voice">
          <input type="checkbox" v-model="voiceEnabled">
          <span>語音播報姓名</span>
        </label>
      </div>
    </div>

    <div v-if="loading" class="cc-state">載入中…</div>
    <div v-else-if="loadError" class="cc-state cc-state--error">{{ loadError }}</div>

    <template v-else>
      <!-- 場次選擇 -->
      <div class="cc-session">
        <label class="cc-session__label">簽到場次</label>
        <select v-model="selectedSessionId" class="cc-session__select">
          <option v-for="s in sessions" :key="s.id" :value="s.id">{{ s.label }}（{{ s.date }}）</option>
        </select>
        <span v-if="isTodaySession" class="cc-session__badge">今天</span>
        <span v-else class="cc-session__badge cc-session__badge--warn">非今天場次</span>
      </div>

      <div class="cc-tabs">
        <button class="cc-tab" :class="{ active: mode === 'camera' }" @click="mode = 'camera'">相機掃描</button>
        <button class="cc-tab" :class="{ active: mode === 'manual' }" @click="mode = 'manual'">外接掃描器／手動輸入</button>
      </div>

      <div class="cc-panel">
        <!-- 相機掃描 -->
        <div v-if="mode === 'camera'" class="cc-camera">
          <div class="cc-camera__frame">
            <video ref="videoRef" class="cc-camera__video" muted playsinline></video>
            <canvas ref="canvasRef" style="display:none;"></canvas>
            <div class="cc-camera__reticle"></div>
            <p v-if="!cameraActive && !cameraError" class="cc-camera__hint">啟動相機中…</p>
          </div>
          <p v-if="cameraError" class="cc-camera__error">{{ cameraError }}</p>
          <p v-else class="cc-camera__tip">將會員個人 QRCode 對準框內即可自動簽到</p>
        </div>

        <!-- 外接掃描器／手動輸入 -->
        <form v-else class="cc-manual" @submit.prevent="submitManual">
          <label class="cc-manual__label">直接用掃描槍掃描即可（免點擊輸入框），或手動輸入會員 Email</label>
          <div class="cc-manual__row">
            <input ref="manualInputRef" v-model="manualEmail" type="text" inputmode="email"
                   placeholder="example@gmail.com" class="cc-manual__input" autofocus required>
            <button type="submit" class="cc-manual__btn">簽到</button>
          </div>
          <p class="cc-manual__scanner-tip">使用 DK-7322 等 USB 掃描槍：插上即可用（免驅動），在此頁面上直接掃描即可自動簽到，不需要先點擊輸入框。</p>
        </form>
      </div>

      <!-- 結果提示 -->
      <Transition name="cc-banner-fade">
        <div v-if="banner" class="cc-banner" :class="`cc-banner--${banner.status}`">
          <div v-if="banner.student" class="cc-banner__avatar">{{ banner.student.name?.charAt(0)?.toUpperCase() }}</div>
          <div class="cc-banner__text">
            <p class="cc-banner__title">{{ banner.message }}</p>
            <p v-if="banner.student" class="cc-banner__name">{{ banner.student.name }} · {{ banner.student.email }}</p>
            <p v-else-if="banner.qrEmail" class="cc-banner__name">{{ banner.qrName }} · {{ banner.qrEmail }}（不在本課程名單內）</p>
          </div>
        </div>
      </Transition>

      <!-- 本場次已簽到名單 -->
      <div class="cc-list-card">
        <div class="cc-list-card__header">
          <h2 class="cc-list-card__title">本場次已簽到</h2>
          <span class="cc-list-card__count">{{ checkedInForSession.length }} / {{ students.length }} 人</span>
        </div>
        <p v-if="!checkedInForSession.length" class="cc-list-card__empty">尚無簽到紀錄</p>
        <ul v-else class="cc-list">
          <li v-for="s in checkedInForSession" :key="s.id" class="cc-list__item">
            <span class="cc-list__name">{{ s.name }}</span>
            <span class="cc-list__email">{{ s.email }}</span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
  .cc-wrap { max-width: 640px; margin: 0 auto; padding: 20px 16px 60px; font-family: 'Noto Sans TC', sans-serif; }

  .cc-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
  .cc-eyebrow { font-size: 12px; color: #7a8f81; margin: 0 0 2px; }
  .cc-title { font-size: 20px; font-weight: 700; color: #1a3d28; margin: 0; }

  .cc-header__toggles { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
  .cc-toggle {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: #b06a00;
    background: #fff8ea; border: 1px solid #f3e0b0; border-radius: 8px; padding: 6px 10px;
    cursor: pointer; user-select: none;
  }
  .cc-toggle input { accent-color: #1FC29C; }
  .cc-toggle--voice { color: #1a7a52; background: #f0fdf9; border-color: #b7ecdd; }

  .cc-state { text-align: center; padding: 40px 0; color: #7a8f81; font-size: 14px; }
  .cc-state--error { color: #d9534f; }

  /* 場次選擇 */
  .cc-session { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .cc-session__label { font-size: 13px; font-weight: 600; color: #1a3d28; }
  .cc-session__select {
    padding: 8px 10px; border-radius: 8px; border: 1px solid #dce8d8; font-size: 13px; font-family: inherit;
  }
  .cc-session__badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: #e6f7f1; color: #1a7a52; }
  .cc-session__badge--warn { background: #fff8ea; color: #b06a00; }

  .cc-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
  .cc-tab {
    flex: 1; padding: 10px; border-radius: 10px; border: 1px solid #dce8d8; background: #fff;
    color: #4a5f52; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .cc-tab.active { background: #1FC29C; border-color: #1FC29C; color: #fff; }

  .cc-panel { background: #fff; border: 1px solid #dce8d8; border-radius: 14px; padding: 18px; margin-bottom: 16px; }

  /* 相機 */
  .cc-camera__frame {
    position: relative; width: 100%; aspect-ratio: 1 / 1; max-width: 320px; margin: 0 auto;
    border-radius: 16px; overflow: hidden; background: #0d1f16;
  }
  .cc-camera__video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cc-camera__reticle {
    position: absolute; inset: 14%; border: 3px solid rgba(31, 194, 156, 0.85); border-radius: 18px;
    pointer-events: none; box-shadow: 0 0 0 999px rgba(0,0,0,0.25);
  }
  .cc-camera__hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #cfe9df; font-size: 13px; margin: 0; }
  .cc-camera__tip { text-align: center; font-size: 12px; color: #7a8f81; margin: 12px 0 0; }
  .cc-camera__error { text-align: center; font-size: 13px; color: #d9534f; margin: 12px 0 0; }

  /* 手動輸入 */
  .cc-manual__label { display: block; font-size: 13px; font-weight: 600; color: #1a3d28; margin-bottom: 6px; }
  .cc-manual__row { display: flex; gap: 8px; }
  .cc-manual__input { flex: 1; padding: 10px 12px; border-radius: 10px; border: 1px solid #dce8d8; font-size: 14px; font-family: inherit; }
  .cc-manual__input:focus { outline: none; border-color: #1FC29C; }
  .cc-manual__btn { padding: 10px 20px; border-radius: 10px; border: none; background: #1FC29C; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; }
  .cc-manual__scanner-tip { font-size: 12px; color: #7a8f81; margin: 10px 0 0; line-height: 1.6; }

  /* 結果提示 */
  .cc-banner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid transparent; }
  .cc-banner--success { background: #f0fdf9; border-color: #b7ecdd; }
  .cc-banner--duplicate { background: #fff8ea; border-color: #f3e0b0; }
  .cc-banner--not_found, .cc-banner--invalid, .cc-banner--no_session, .cc-banner--error { background: #fff2f1; border-color: #f5c2be; }

  .cc-banner__avatar {
    width: 40px; height: 40px; border-radius: 50%; background: #1FC29C; color: #fff; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .cc-banner__title { font-size: 14px; font-weight: 700; color: #1a3d28; margin: 0; }
  .cc-banner__name { font-size: 12px; color: #6b7d71; margin: 2px 0 0; }

  .cc-banner-fade-enter-active, .cc-banner-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
  .cc-banner-fade-enter-from, .cc-banner-fade-leave-to { opacity: 0; transform: translateY(-6px); }

  /* 已簽到清單 */
  .cc-list-card { background: #fff; border: 1px solid #dce8d8; border-radius: 14px; padding: 16px 18px; }
  .cc-list-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .cc-list-card__title { font-size: 15px; font-weight: 700; color: #1a3d28; margin: 0; }
  .cc-list-card__count { font-size: 12px; color: #fff; background: #1FC29C; border-radius: 999px; padding: 2px 10px; }
  .cc-list-card__empty { font-size: 13px; color: #9aa89f; text-align: center; padding: 20px 0; margin: 0; }
  .cc-list { list-style: none; padding: 0; margin: 0; }
  .cc-list__item { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f5f1; font-size: 13px; }
  .cc-list__item:last-child { border-bottom: none; }
  .cc-list__name { font-weight: 600; color: #333; }
  .cc-list__email { color: #999; font-size: 11px; }
</style>
