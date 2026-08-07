<script setup>
  definePageMeta({layout: 'staff', requiredPermission: 'staff.home'})

  const commonStore = useCommonStore()

  // 信令用的 WebSocket 網址：跟訂單通知／舊版廣播的 SSE 一樣直接連 just_url，
  // 避開 main_url 的 /api 反向代理（那層 proxy 對長連線不友善），
  // 差別只是這裡協定從 http(s) 換成 ws(s)
  const wsUrl = () => commonStore.data.just_url.replace(/^http/, 'ws') + '/holy/broadcast/ws'

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

  // ── WebRTC 廣播：點一下開始、再點一下結束 ──────────────────────────────
  // 跟內場主機（可能不只一台）各自建立一條 WebRTC 連線，音訊直接點對點傳送，
  // 不用再切段錄音上傳，延遲降到接近即時（僅受 WebRTC 本身的網路延遲影響）。
  const MAX_SECONDS = 300 // 保底上限，避免忘記點「結束」而一直開著麥克風

  const recording = ref(false)
  const statusText = ref('')
  const seconds = ref(0)
  // 麥克風目前的音量大小（0～1，粗略 RMS），給畫面顯示小音量計用——
  // 這條會跳，就證明麥克風確實有收到聲音、資料也確實送出去了，
  // 這樣如果內場那邊還是沒聲音，就能確定問題不在這支手機/這邊的麥克風。
  const micLevel = ref(0)
  let stopMicLevelMeter = null

  // 接一個 MediaStream，持續量測音量大小寫進 levelRef，回傳一個停止函式
  function startLevelMeter(stream, levelRef) {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext
      if (!AudioCtxClass) return null
      const ctx = new AudioCtxClass()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser) // 只接來做分析，不接 destination，不會有回音或重複播放的問題
      const data = new Uint8Array(analyser.frequencyBinCount)
      let rafId = null
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sumSquares = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sumSquares += v * v
        }
        levelRef.value = Math.sqrt(sumSquares / data.length)
        rafId = requestAnimationFrame(tick)
      }
      tick()
      return () => {
        if (rafId) cancelAnimationFrame(rafId)
        try {
          source.disconnect()
        } catch (e) { /* 忽略 */
        }
        try {
          ctx.close()
        } catch (e) { /* 忽略 */
        }
      }
    } catch (e) {
      console.error('[broadcast] 無法建立音量偵測', e)
      return null
    }
  }

  // 跟 home.vue 用同一組 TURN 帳密，兩邊要對得上。
  // TURN_IP 是備援：如果對方那邊的網路連 DNS 都被限制（例如白名單機制），網域名稱那組
  // 會完全連不上，這時就靠 IP 直連繞過 DNS。IP 是動態的，哪天家裡網路的公網 IP 換了，
  // 這裡要跟著手動更新（要跟 turnserver.conf 的 external-ip、home.vue 裡的 TURN_IP 一致）。
  const TURN_HOST = 'madustrialtd.asuscomm.com'
  const TURN_IP = '61.227.78.231'
  const TURN_USERNAME = 'holyfarm'
  const TURN_CREDENTIAL = 'changeme123'
  const ICE_SERVERS = [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: `turn:${TURN_HOST}:3478`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
    {urls: `turn:${TURN_HOST}:3478?transport=tcp`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
    {urls: `turn:${TURN_IP}:3478`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
    {urls: `turn:${TURN_IP}:3478?transport=tcp`, username: TURN_USERNAME, credential: TURN_CREDENTIAL},
  ]

  let mediaStream = null
  let ws = null
  let timerInterval = null
  const peers = new Map() // receiverId -> RTCPeerConnection

  function releaseMic() {
    if (stopMicLevelMeter) {
      stopMicLevelMeter()
      stopMicLevelMeter = null
    }
    micLevel.value = 0
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop())
      mediaStream = null
    }
  }

  function closeAllPeers() {
    for (const pc of peers.values()) {
      try {
        pc.close()
      } catch (e) { /* 忽略 */
      }
    }
    peers.clear()
  }

  function sendSignal(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
    }
  }

  async function connectToReceiver(receiverId) {
    if (peers.has(receiverId)) return
    const pc = new RTCPeerConnection({iceServers: ICE_SERVERS})
    peers.set(receiverId, pc)

    mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream))

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({type: 'ice', to: receiverId, candidate: e.candidate})
    }
    pc.oniceconnectionstatechange = () => {
      console.log('[broadcast] ICE 連線狀態', pc.iceConnectionState)
    }
    pc.onconnectionstatechange = () => {
      console.log('[broadcast] 整體連線狀態', pc.connectionState)
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        peers.delete(receiverId)
      }
    }

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal({type: 'offer', to: receiverId, sdp: pc.localDescription, label: fromLabel.value || ''})
    } catch (e) {
      console.error(e)
      peers.delete(receiverId)
    }
  }

  async function handleSignal(msg) {
    if (msg.type === 'receivers') {
      // 剛連上信令伺服器，拿到目前線上的內場主機清單，分別對每一台建立連線
      for (const id of (msg.ids || [])) connectToReceiver(id)
      if (!msg.ids || msg.ids.length === 0) {
        statusText.value = '目前沒有內場主機連線中，請確認內場那台是否有開著首頁'
      }
      return
    }
    const pc = peers.get(msg.from)
    if (msg.type === 'answer') {
      if (pc) {
        try {
          await pc.setRemoteDescription(msg.sdp)
        } catch (e) {
          console.error(e)
        }
      }
    } else if (msg.type === 'ice') {
      if (pc && msg.candidate) {
        try {
          await pc.addIceCandidate(msg.candidate)
        } catch (e) { /* 忽略偶爾晚到或重複的 candidate */
        }
      }
    } else if (msg.type === 'bye') {
      if (pc) {
        try {
          pc.close()
        } catch (e) { /* 忽略 */
        }
        peers.delete(msg.from)
      }
    }
  }

  async function startRecording() {
    if (recording.value) return
    statusText.value = ''
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({audio: true})
    } catch (e) {
      statusText.value = '無法取得麥克風權限，請確認已允許使用麥克風'
      return
    }
    stopMicLevelMeter = startLevelMeter(mediaStream, micLevel)

    try {
      ws = new WebSocket(wsUrl())
    } catch (e) {
      statusText.value = '無法連線到伺服器，請稍後再試'
      releaseMic()
      return
    }

    ws.onopen = () => {
      sendSignal({type: 'hello', role: 'caller'})
    }
    ws.onmessage = (e) => {
      try {
        handleSignal(JSON.parse(e.data))
      } catch (err) { /* 忽略格式異常的訊息 */
      }
    }
    ws.onerror = () => {
      statusText.value = '連線發生問題'
    }
    ws.onclose = () => {
      if (recording.value) stopRecording() // 連線意外斷掉時，把畫面狀態收乾淨
    }

    recording.value = true
    seconds.value = 0
    timerInterval = setInterval(() => {
      seconds.value++
      if (seconds.value >= MAX_SECONDS) stopRecording()
    }, 1000)
  }

  function stopRecording() {
    if (!recording.value) return
    recording.value = false
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    closeAllPeers()
    if (ws) {
      try {
        ws.close()
      } catch (e) { /* 忽略 */
      }
      ws = null
    }
    releaseMic()
    statusText.value = '已結束'
    setTimeout(() => {
      if (statusText.value === '已結束') statusText.value = ''
    }, 2000)
  }

  // 點一下開始、再點一下結束
  function toggleRecording() {
    if (recording.value) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  onMounted(() => {
    loadFromLabel()
  })

  onUnmounted(() => {
    if (recording.value) stopRecording()
    if (timerInterval) clearInterval(timerInterval)
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
      >點一下開始廣播，內場會即時聽到，再點一下結束</p>
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
      style="width: 46vw; height: 46vw; max-width: 220px; max-height: 220px;"
      @click="toggleRecording"
    >
      <span style="font-size:clamp(48px, 14vw, 72px)">🎙️</span>
    </button>

    <p
      class="text-muted-c text-center"
      style="font-size:clamp(13px, calc(13px + 0.4vw), 17px)"
    >
      <template v-if="recording">🔴 廣播中... {{ seconds }} 秒（點一下結束）</template>
      <template v-else>{{ statusText || '點一下開始說話' }}</template>
    </p>

    <!-- 麥克風即時音量計：講話時這條會跳，證明麥克風確實有收到聲音、也確實送出去了 -->
    <div v-if="recording" class="w-full max-w-xs flex flex-col items-center gap-1">
      <div class="w-full h-3 bg-light-c rounded-full overflow-hidden">
        <div
          class="h-full bg-green-500 rounded-full transition-[width] duration-75"
          :style="{width: Math.min(100, micLevel * 320) + '%'}"
        />
      </div>
      <p class="text-muted-c" style="font-size:clamp(11px, calc(11px + 0.3vw), 13px)">
        {{ micLevel > 0.02 ? '🎤 有偵測到聲音' : '⚠️ 沒偵測到聲音，對著手機說話看看' }}
      </p>
    </div>
  </div>
</template>
