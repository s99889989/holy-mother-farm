<script setup>
  definePageMeta({layout: 'staff', requiredPermission: 'other.broadcast'})

  const commonStore = useCommonStore()
  const BROADCAST_BASE = () => commonStore.data.main_url + '/holy/broadcast'

  // ── 標示（選填，例如「櫃檯」），記住上次輸入，下次不用重打 ──────────────
  const fromLabel = ref('')

  function loadFromLabel() {
    try {
      const saved = localStorage.getItem('holy_broadcast_from')
      if (saved) fromLabel.value = saved
    } catch (e) { /* 無法讀取偏好時使用預設值 */
    }
  }

  function saveFromLabel() {
    try {
      localStorage.setItem('holy_broadcast_from', fromLabel.value || '')
    } catch (e) { /* 無痕模式等情況可能無法儲存，忽略即可 */
    }
  }

  watch(fromLabel, saveFromLabel)

  // ── 按住說話：邊講邊切段上傳，內場那邊邊收邊播，接近對講機體驗 ───────────
  // 每段長度愈短，內場那邊聽到的延遲愈低，但上傳次數會變多；0.6～0.7 秒是實測還算
  // 順暢、接縫也不明顯的折衷值。每段都是「重新開始錄一段新的」，不是同一段錄音切開，
  // 這樣每段檔案自己都有檔頭，內場那邊才能一段一段各自獨立播放。
  const CHUNK_MS = 650
  const MAX_SECONDS = 60 // 保底上限，避免不小心按住太久錄出超長內容

  const recording = ref(false)
  const sending = ref(false)
  const statusText = ref('')
  const seconds = ref(0)

  let mediaStream = null
  let mediaRecorder = null
  let chunkBlobs = []
  let chunkTimer = null
  let timerInterval = null
  let sessionId = null
  let seq = 0
  let stopRequested = false

  function pickMimeType() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return ''
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) || ''
  }

  function newSessionId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID()
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  function releaseMic() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop())
      mediaStream = null
    }
  }

  async function startRecording() {
    if (recording.value || sending.value) return
    statusText.value = ''
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({audio: true})
    } catch (e) {
      statusText.value = '無法取得麥克風權限，請確認已允許使用麥克風'
      return
    }

    sessionId = newSessionId()
    seq = 0
    stopRequested = false
    recording.value = true
    seconds.value = 0
    timerInterval = setInterval(() => {
      seconds.value++
      if (seconds.value >= MAX_SECONDS) stopRecording()
    }, 1000)

    recordNextChunk()
  }

  // 「每段重新開始錄音」而不是單一長錄音切段：每次都重新 new 一個 MediaRecorder，
  // 讓每一段輸出的檔案自己就是完整、有檔頭、可單獨播放的音檔
  function recordNextChunk() {
    if (!mediaStream) return
    chunkBlobs = []
    const mimeType = pickMimeType()
    try {
      mediaRecorder = mimeType ? new MediaRecorder(mediaStream, {mimeType}) : new MediaRecorder(mediaStream)
    } catch (e) {
      mediaRecorder = new MediaRecorder(mediaStream)
    }
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunkBlobs.push(e.data)
    }
    mediaRecorder.onstop = onChunkStop
    mediaRecorder.start()
    chunkTimer = setTimeout(() => {
      try {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
      } catch (e) { /* 忽略 */
      }
    }, CHUNK_MS)
  }

  function stopRecording() {
    if (!recording.value) return
    recording.value = false
    sending.value = true // 放開後還要送出最後一段，先顯示忙碌狀態
    stopRequested = true
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    if (chunkTimer) {
      clearTimeout(chunkTimer)
      chunkTimer = null
    }
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
    } catch (e) { /* 忽略 */
    }
  }

  async function onChunkStop() {
    if (chunkTimer) {
      clearTimeout(chunkTimer)
      chunkTimer = null
    }
    const isLast = stopRequested
    const currentSeq = seq++
    const blobs = chunkBlobs
    chunkBlobs = []
    const mt = (mediaRecorder && mediaRecorder.mimeType) || 'audio/webm'

    if (!isLast) {
      recordNextChunk() // 還在講，馬上開下一段，讓空檔降到最低
    } else {
      releaseMic()
    }

    const blob = blobs.length ? new Blob(blobs, {type: mt}) : null
    await uploadChunk(blob, currentSeq, isLast)

    if (isLast) {
      statusText.value = '已送出 ✓'
      sending.value = false
      setTimeout(() => {
        if (statusText.value === '已送出 ✓') statusText.value = ''
      }, 2000)
    }
  }

  async function uploadChunk(blob, chunkSeq, isLast) {
    try {
      const form = new FormData()
      form.append('sessionId', sessionId)
      form.append('seq', String(chunkSeq))
      form.append('last', isLast ? '1' : '0')
      if (chunkSeq === 0 && fromLabel.value) form.append('from', fromLabel.value)
      if (blob) {
        const ext = (blob.type || '').includes('mp4') ? 'm4a' : 'webm'
        form.append('audio', blob, `chunk-${chunkSeq}.${ext}`)
      }
      const res = await fetch(`${BROADCAST_BASE()}/chunk`, {
        method: 'POST',
        credentials: 'include',
        body: form
      })
      if (!res.ok) throw new Error('上傳失敗')
    } catch (e) {
      console.error(e)
      if (isLast) statusText.value = '傳送失敗，請稍後再試'
    }
  }

  function onPointerDown(e) {
    e.preventDefault()
    startRecording()
  }

  function onPointerUp(e) {
    e.preventDefault()
    stopRecording()
  }

  function onPointerCancel() {
    stopRecording()
  }

  onMounted(() => {
    loadFromLabel()
  })

  onUnmounted(() => {
    releaseMic()
    if (timerInterval) clearInterval(timerInterval)
    if (chunkTimer) clearTimeout(chunkTimer)
  })
</script>

<template>
  <div class="min-h-full flex flex-col items-center justify-center bg-surface2 px-6 py-10 gap-7">
    <div class="text-center">
      <h1
        class="font-bold text-base-c"
        style="font-size:clamp(18px, calc(18px + 0.6vw), 26px)"
      >內場語音廣播</h1>
      <p
        class="text-hint-c mt-1"
        style="font-size:clamp(12px, calc(12px + 0.4vw), 15px)"
      >按住下方麥克風說話，內場會邊講邊聽，放開即結束</p>
    </div>

    <div class="w-full max-w-xs">
      <label class="text-sm font-medium text-muted-c block mb-1">標示（選填，例如：櫃檯）</label>
      <input
        v-model="fromLabel"
        type="text"
        placeholder="不填也可以送出"
        class="w-full border border-light-c bg-surface text-base-c rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
      />
    </div>

    <button
      type="button"
      class="select-none rounded-full flex items-center justify-center transition-all duration-150 shadow-xl"
      :class="recording ? 'bg-red-600 scale-110' : 'bg-green-800'"
      style="width: 46vw; height: 46vw; max-width: 220px; max-height: 220px; touch-action: none;"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointerleave="onPointerCancel"
      @pointercancel="onPointerCancel"
    >
      <span style="font-size:clamp(48px, 14vw, 72px)">🎙️</span>
    </button>

    <p
      class="text-muted-c text-center"
      style="font-size:clamp(13px, calc(13px + 0.4vw), 17px)"
    >
      <template v-if="recording">🔴 廣播中... {{ seconds }} 秒</template>
      <template v-else-if="sending">傳送中...</template>
      <template v-else>{{ statusText || '按住上方按鈕開始說話' }}</template>
    </p>
  </div>
</template>
