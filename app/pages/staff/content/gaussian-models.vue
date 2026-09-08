<script setup>
// 需先安裝：npm install playcanvas
// 不再用 @playcanvas/supersplat-viewer（那個包死了相機的 up 軸邏輯），
// 改直接用引擎本體自己接，這樣才能把模型 Entity 轉正，解決 Z-up 資料在拖曳時的搖晃問題
//
// 注意：這裡故意不在頂層 `import * as pc from 'playcanvas'`。
// playcanvas 打包成單一巨大檔案，Nuxt 在 SSR 階段也會嘗試轉譯 <script setup> 裡的 import
// （即使外層包了 ClientOnly），Vite 的一般 dev-transform 處理這種巨大檔案很容易堆疊爆掉
// （Maximum call stack size exceeded）。改成只在真正要用、且確定在瀏覽器端執行時才動態載入。
let pc = null
const loadPlayCanvas = async () => {
  if (!pc) pc = await import('playcanvas')
  return pc
}

definePageMeta({ layout: 'staff', requiredPermission: 'content.gaussian-models' })

const commonStore = useCommonStore()
const BASE = commonStore.data.just_url + '/holy/gaussian'
const API_ORIGIN = commonStore.data.main_url

const fileUrl = (path) => {
  if (!path) return ''
  return path.startsWith('http') ? path : API_ORIGIN + path
}

// srcdoc iframe 內部 document.baseURI 是字面上的 "about:srcdoc"，
// viewer 內部用它當 new URL() 的 base 來推算分塊檔案路徑會直接丟 Invalid URL，
// 所以傳給 viewer 的 contentUrl 一定要是完整絕對網址（含 http://主機:port），不能是站內相對路徑
const absoluteFileUrl = (path) => {
  const rel = fileUrl(path) // 可能已經是絕對網址，也可能只是 "/api/..." 這種站內相對路徑
  if (rel.startsWith('http')) return rel
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return origin + rel
}

// ── fetch with timeout ────────────────────────────────────────────
const fetchWithTimeout = (url, options = {}, ms = 15000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

// ── 狀態 ──────────────────────────────────────────────────────────
const models = ref([])
const isLoading = ref(false)
const toast = reactive({ show: false, message: '' })

const showToast = (message) => {
  toast.message = message
  toast.show = true
  setTimeout(() => { toast.show = false }, 2500)
}

const fetchModels = async () => {
  isLoading.value = true
  try {
    models.value = await (await fetchWithTimeout(`${BASE}/list`)).json()
  } catch {
    showToast('讀取模型列表失敗')
  } finally {
    isLoading.value = false
  }
}
onMounted(fetchModels)

// ── 上傳 ──────────────────────────────────────────────────────────
const uploadModal = reactive({ show: false })
const uploadForm = reactive({ name: '', description: '', zipFile: null, thumbnail: null })
const uploading = ref(false)
const uploadProgress = ref('')
const dragOver = ref(false)
const zipInputRef = ref(null)
const thumbInputRef = ref(null)

const openUploadModal = () => {
  uploadForm.name = ''
  uploadForm.description = ''
  uploadForm.zipFile = null
  uploadForm.thumbnail = null
  uploadModal.show = true
}

const handleZipDrop = (e) => {
  dragOver.value = false
  const file = e.dataTransfer.files?.[0]
  if (file) uploadForm.zipFile = file
}
const handleZipSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) uploadForm.zipFile = file
}
const handleThumbSelect = (e) => {
  uploadForm.thumbnail = e.target.files?.[0] || null
}

const submitUpload = async () => {
  if (!uploadForm.zipFile) { showToast('請選擇 SOG Tiles 的 zip 檔'); return }
  if (!uploadForm.name.trim()) { showToast('請輸入名稱'); return }

  uploading.value = true
  uploadProgress.value = '上傳中…（檔案較大請耐心等候）'

  const fd = new FormData()
  fd.append('zipFile', uploadForm.zipFile)
  fd.append('name', uploadForm.name.trim())
  fd.append('description', uploadForm.description || '')
  if (uploadForm.thumbnail) fd.append('thumbnail', uploadForm.thumbnail)

  try {
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: fd })
    const text = await res.text()
    if (text.startsWith('錯誤')) {
      showToast(text)
    } else {
      showToast('上傳成功')
      uploadModal.show = false
      await fetchModels()
    }
  } catch {
    showToast('上傳失敗，請檢查網路或檔案大小')
  } finally {
    uploading.value = false
    uploadProgress.value = ''
  }
}

// ── 刪除 ──────────────────────────────────────────────────────────
const deleteModel = async (model) => {
  if (!confirm(`確定要刪除「${model.name}」嗎？此動作無法復原。`)) return
  try {
    await fetchWithTimeout(`${BASE}/remove/${model.id}`, { method: 'DELETE' })
    showToast('已刪除')
    await fetchModels()
  } catch {
    showToast('刪除失敗')
  }
}

// ── 分享 ──────────────────────────────────────────────────────────
const shareUrl = (model) => `${window.location.origin}/front/gaussian/${model.id}`

const openSharePage = (model) => {
  window.open(shareUrl(model), '_blank')
}

const copyShareLink = async (model) => {
  try {
    await navigator.clipboard.writeText(shareUrl(model))
    showToast('已複製分享連結')
  } catch {
    showToast('複製失敗，瀏覽器可能不支援')
  }
}

// ── 檢視器（直接用 playcanvas 引擎本體，不透過 supersplat-viewer）──────
const viewerModal = reactive({ show: false, name: '', id: '' })
const canvasRef = ref(null)
let pcApp = null
let gsplatEntity = null
let cameraEntity = null
let orbitState = null // { target: Vec3, yaw, pitch, distance }
let resizeObserverRef = null

// 手機判斷：用 pointer 精度判斷比 UA 字串抓型號可靠，平板/手機都會是 coarse
const isTouchDevice = ref(false)
if (typeof window !== 'undefined') {
  isTouchDevice.value = window.matchMedia('(pointer: coarse)').matches
}

// 鍵盤走位跟螢幕虛擬按鈕共用同一組「目前按著的按鍵」集合——
// 虛擬按鈕按下/放開時，直接把同樣的字串塞進/移出這個 Set，走位邏輯完全不用另外寫一份
let pressedKeys = new Set()
// 虛擬搖桿的類比輸入（-1~1），跟鍵盤那種「按下就是滿速」不一樣，搖桿要能半推半速
const touchMove = reactive({ x: 0, z: 0 })
let joystickPointerId = null

const savingCamera = ref(false)

// 已用相機拍攝軌跡的高度變化驗證過（Z 軸變化範圍遠小於 X/Y）：
// MipMap 本地坐標系是 Z 軸朝上，PlayCanvas 預設世界是 Y 軸朝上，
// 所以把整個模型 Entity 繞 X 軸轉 -90 度，把資料的 Z 軸接到世界的 Y 軸上——
// 之後拖曳旋轉用的是「轉正後的世界 Y 軸」，就不會再搖晃
const ZUP_TO_YUP_EULER = [-90, 0, 0]

// 一個局部座標點，套用上面那個旋轉後，換算成世界座標（純數學，不用等 entity 真的轉完）
const applyZupToYup = (x, y, z) => [x, z, -y]

// ── 簡易碰撞（依後端解出的 splat 點位自建的體素佔用格）──────────────────
// 模型載入完成後，抓後端做好的 collision.bin（float32 小端點位清單，x,y,z 交錯，無 header），
// 轉成世界座標後量化進一格一格的體素，落點夠多的格子標記「不能走」；走位時逐軸檢查目的地
// 格子有沒有被標記，卡住的軸就不動，沒卡住的軸繼續走，體感類似貼牆滑動。
// 還沒有重力/貼地，純粹水平方向擋人。抓不到 collision.bin（模型還沒做/後端做失敗）時
// 完全不影響原本功能，只是沒有碰撞。
let collisionVoxels = null // Set<string> "vx,vy,vz"
let collisionVoxelSize = 1
let collisionEnabled = false

const worldToVoxelKey = (x, y, z, size) => `${Math.floor(x / size)},${Math.floor(y / size)},${Math.floor(z / size)}`

// 抓後端算好的碰撞點位檔，回傳 Float32Array（x,y,z 交錯）；抓不到就回傳 null，
// 呼叫端會直接跳過、不套用碰撞，不影響模型本身的載入與顯示
const fetchCollisionCenters = async (model) => {
  if (!model.collisionFile) return null
  try {
    const res = await fetchWithTimeout(absoluteFileUrl(`/holy/gaussian/file/${model.id}/${model.collisionFile}`))
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Float32Array(buf)
  } catch (e) {
    console.warn('[gaussian-collision] 抓取 collision.bin 失敗', e)
    return null
  }
}

// 把一批本地座標（splat 原始座標，跟後端解出來的座標系一致，都還沒轉正）轉成世界座標並灌進
// collisionVoxels——用 gsplatEntity 目前的世界變換矩陣轉換，這樣連使用者存的水平校正微調
// 也會一起算進去，不用自己重算旋轉，跟畫面上看到的永遠是同一套轉換
const mergeCentersIntoCollision = (centers) => {
  if (!centers || !gsplatEntity || !collisionVoxels) return
  const worldTransform = gsplatEntity.getWorldTransform()
  const tmp = new pc.Vec3()
  for (let i = 0; i + 2 < centers.length; i += 3) {
    tmp.set(centers[i], centers[i + 1], centers[i + 2])
    worldTransform.transformPoint(tmp, tmp)
    collisionVoxels.add(worldToVoxelKey(tmp.x, tmp.y, tmp.z, collisionVoxelSize))
  }
  collisionEnabled = true
}

const isVoxelBlocked = (x, y, z) => {
  if (!collisionEnabled || !collisionVoxels) return false
  return collisionVoxels.has(worldToVoxelKey(x, y, z, collisionVoxelSize))
}

// 疊加在 -90 度基礎校正上的微調角度（度），拍攝時沒完全水平就會需要這個補一點點回來
const tiltForm = reactive({ x: 0, y: 0, z: 0 })
const tiltPanelOpen = ref(false)
const savingTilt = ref(false)

const applyEntityTilt = () => {
  if (!gsplatEntity) return
  // 輸入框打字打到一半可能會暫時是空字串／NaN，直接丟給引擎會讓內部矩陣算壞掉，
  // 壞掉的 transform 之後連 app.destroy() 都會跟著噴例外，導致整個關閉流程卡住
  const x = Number.isFinite(tiltForm.x) ? tiltForm.x : 0
  const y = Number.isFinite(tiltForm.y) ? tiltForm.y : 0
  const z = Number.isFinite(tiltForm.z) ? tiltForm.z : 0
  gsplatEntity.setLocalEulerAngles(
    ZUP_TO_YUP_EULER[0] + x,
    ZUP_TO_YUP_EULER[1] + y,
    ZUP_TO_YUP_EULER[2] + z
  )
}

const saveTiltAsDefault = async () => {
  savingTilt.value = true
  try {
    const offset = `${tiltForm.x},${tiltForm.y},${tiltForm.z}`
    const url = `${BASE}/tilt/${viewerModal.id}?offset=${encodeURIComponent(offset)}`
    await fetchWithTimeout(url, { method: 'POST' })
    const model = models.value.find(m => m.id === viewerModal.id)
    if (model) model.tiltOffset = offset
    showToast('已存成這顆模型的水平校正')
  } catch {
    showToast('儲存失敗')
  } finally {
    savingTilt.value = false
  }
}

// ── 移動速度倍率 ─────────────────────────────────────────────
// 不同模型的場景實際尺寸落差很大，雖然走位速度已經跟 bound 算出來的 moveScale 成正比，
// 但重建誤差、切 tile 與否等因素還是會讓「感覺」的速度不一致，所以另外開一個倍率讓使用者自己調，
// 套用方式是乘在 moveScale 算出來的速度上面（不是取代），1 代表不調整、維持原本自動估算的速度
const moveSpeed = ref(1)
const speedPanelOpen = ref(false)
const savingSpeed = ref(false)

const saveSpeedAsDefault = async () => {
  savingSpeed.value = true
  try {
    const url = `${BASE}/speed/${viewerModal.id}?multiplier=${encodeURIComponent(moveSpeed.value)}`
    await fetchWithTimeout(url, { method: 'POST' })
    const model = models.value.find(m => m.id === viewerModal.id)
    if (model) model.moveSpeed = String(moveSpeed.value)
    showToast('已存成這顆模型的預設移動速度')
  } catch {
    showToast('儲存失敗')
  } finally {
    savingSpeed.value = false
  }
}

const updateCameraFromOrbit = () => {
  if (!cameraEntity || !orbitState) return
  const { position, yaw, pitch } = orbitState
  const cp = Math.cos(pitch)
  const forward = new pc.Vec3(
    cp * Math.sin(yaw),
    Math.sin(pitch),
    cp * Math.cos(yaw)
  )
  cameraEntity.setPosition(position)
  cameraEntity.lookAt(position.clone().add(forward))
}

// ── 第三人稱環繞視角（電腦版限定）───────────────────────────────
// 沒有實體「人物」模型可以站在裡面，所以「第三人稱」是模擬出來的：
// 進入的當下，把目前站的位置當作環繞的觀察點（thirdPersonPivot），鏡頭往後拉開＋墊高一點再看回來，
// 之後用滑鼠拖曳/滾輪繞著這個固定點旋轉、拉近拉遠。
// 只在電腦版啟用（isTouchDevice 為 false 時才會被觸發），手機維持原本的觸控走位。
const cameraMode = ref('first') // 'first' | 'third'
const pointerLockActive = ref(false) // 第一人稱下滑鼠是否已鎖定（鎖定後不用按著左鍵，移動滑鼠就會轉頭）
let thirdPersonPivot = null
let thirdPersonYaw = 0
let thirdPersonPitch = 0
let thirdPersonRadius = 5
const THIRD_PERSON_MIN_RADIUS = 1.5 // 場景太小時（moveScale 很小）也要留一個看得到自己的最低拉開距離
const THIRD_PERSON_PITCH = 0.35     // 進入當下固定一個微俯角，從後上方看回去比較有「第三人稱」的感覺

const updateCameraFromThirdPerson = () => {
  if (!cameraEntity || !thirdPersonPivot) return
  const cp = Math.cos(thirdPersonPitch)
  const offset = new pc.Vec3(
    cp * Math.sin(thirdPersonYaw),
    Math.sin(thirdPersonPitch),
    cp * Math.cos(thirdPersonYaw)
  ).mulScalar(thirdPersonRadius)
  cameraEntity.setPosition(thirdPersonPivot.clone().add(offset))
  cameraEntity.lookAt(thirdPersonPivot)
}

const enterThirdPerson = () => {
  if (!cameraEntity || !orbitState || cameraMode.value === 'third') return
  // 第三人稱是拖曳式環繞操作，不需要（也不適合）滑鼠鎖定，先解鎖
  if (document.pointerLockElement === canvasRef.value) document.exitPointerLock()
  // pivot 就是目前站的位置本身（不再往前推）——鏡頭真正往後拉開＋墊高，
  // 這樣切換瞬間才會看到明顯的「拉遠」，不是原地不動
  thirdPersonRadius = Math.max(THIRD_PERSON_MIN_RADIUS, (orbitState.moveScale || 5) * 0.3)
  thirdPersonPivot = orbitState.position.clone()
  thirdPersonYaw = orbitState.yaw + Math.PI // 站在目前朝向的「後面」看回去，畫面裡才看得到原本要看的方向
  thirdPersonPitch = THIRD_PERSON_PITCH
  cameraMode.value = 'third'
  updateCameraFromThirdPerson()
}

const exitThirdPerson = () => {
  if (cameraMode.value !== 'third' || !cameraEntity || !orbitState) return
  // 離開時鏡頭直接沿用第三人稱當下的位置/朝向換算回第一人稱的 yaw/pitch，不跳動、不用重新定位
  const dir = thirdPersonPivot.clone().sub(cameraEntity.getPosition())
  orbitState.position = cameraEntity.getPosition().clone()
  orbitState.yaw = Math.atan2(dir.x, dir.z)
  orbitState.pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z))
  cameraMode.value = 'first'
  thirdPersonPivot = null
  updateCameraFromOrbit()
}

const attachOrbitControls = (canvas) => {
  let mode = null // 'look' | 'pan' | 'pinch' | null
  let lastX = 0
  let lastY = 0
  let activePointerId = null // 只處理這個 canvas 自己追蹤的手指/滑鼠，避免跟螢幕搖桿的手指互相干擾

  // 觸控用：追蹤目前所有正在碰觸畫面的手指（pointerId -> {x,y}）
  const touches = new Map()
  let pinchStartDist = 0
  let pinchMidX = 0
  let pinchMidY = 0

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

  const startPinch = () => {
    const pts = [...touches.values()]
    pinchStartDist = dist(pts[0], pts[1])
    const m = mid(pts[0], pts[1])
    pinchMidX = m.x; pinchMidY = m.y
    mode = 'pinch'
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) {
        startPinch()
        return
      }
      // 單指＝轉頭看（第一人稱視角，不是繞著什麼東西公轉）
      mode = 'look'
      activePointerId = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
      return
    }
    // 電腦版第一人稱左鍵點一下＝鎖定滑鼠，之後不用按著就能直接移動滑鼠轉頭（跟一般 FPS 遊戲一致）；
    // 已經鎖定、或不是左鍵、或在第三人稱（環繞是拖曳式操作，不需要鎖定）就不用再請求。
    // requestPointerLock() 失敗時瀏覽器預設完全靜默不會報錯，最常見原因是「不安全的連線來源」——
    // Pointer Lock API 規定只能在 HTTPS 或 localhost 底下用，區網 IP／無 TLS 的 http 網址會被直接拒絕，
    // 所以這裡明確接錯誤，失敗時用 toast 告訴使用者原因，而不是讓它悄悄退回拖曳模式讓人以為沒改到
    if (!isTouchDevice.value && cameraMode.value === 'first' && e.button === 0 && document.pointerLockElement !== canvas) {
      const lockResult = canvas.requestPointerLock()
      if (lockResult && typeof lockResult.catch === 'function') {
        lockResult.catch((err) => {
          const insecure = location.protocol !== 'https:' && location.hostname !== 'localhost'
          showToast(insecure
            ? '滑鼠鎖定失敗：目前不是 HTTPS／localhost 連線，瀏覽器不允許鎖定滑鼠，已改用拖曳方式操作'
            : `滑鼠鎖定失敗（${err?.name || err}），已改用拖曳方式操作`)
        })
      }
    }
    // 左鍵拖曳＝轉頭看，右鍵拖曳＝平移（pan），慣例跟大部分 3D 軟體一致——
    // 這組拖曳邏輯保留當作滑鼠鎖定失敗/不支援時的備用操作方式
    mode = e.button === 2 ? 'pan' : 'look'
    activePointerId = e.pointerId
    lastX = e.clientX
    lastY = e.clientY
  }

  const onPointerMove = (e) => {
    if (!cameraEntity) return
    if (document.pointerLockElement === canvas) return // 滑鼠鎖定時完全交給 onMouseMoveLocked（movementX/Y）處理，這裡不用再算
    if (cameraMode.value === 'first' && !orbitState) return
    if (cameraMode.value === 'third' && !thirdPersonPivot) return

    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (mode === 'pinch' && touches.size === 2 && cameraMode.value === 'first') {
        // 雙指縮放/平移目前只服務第一人稱（第三人稱是電腦版限定功能，觸控裝置不會進到這個分支）
        const pts = [...touches.values()]
        const newDist = dist(pts[0], pts[1])
        const newMid = mid(pts[0], pts[1])

        // 雙指開合＝往前/往後移動（縮放的手機版）
        if (pinchStartDist > 1) {
          const dollySpeed = orbitState.moveScale * 0.6 * moveSpeed.value
          orbitState.position.add(cameraEntity.forward.clone().mulScalar((newDist - pinchStartDist) / pinchStartDist * dollySpeed))
          pinchStartDist = newDist
        }
        // 雙指一起拖＝平移
        const panSpeed = orbitState.moveScale * 0.0025 * moveSpeed.value
        const right = cameraEntity.right
        const up = cameraEntity.up
        orbitState.position.sub(right.clone().mulScalar(-(newMid.x - pinchMidX) * panSpeed))
        orbitState.position.sub(up.clone().mulScalar((newMid.y - pinchMidY) * panSpeed))
        pinchMidX = newMid.x; pinchMidY = newMid.y

        updateCameraFromOrbit()
        return
      }

      if (mode !== 'look' || e.pointerId !== activePointerId) return
    } else if (!mode || e.pointerId !== activePointerId) {
      // 不是我們自己在追蹤的那根手指/滑鼠（例如螢幕搖桿的手指），完全不理會，避免互相干擾
      return
    }

    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY

    if (cameraMode.value === 'third') {
      // 第三人稱：左鍵拖曳＝繞著 thirdPersonPivot 旋轉，右鍵拖曳＝平移這個環繞中心點——
      // 跟 superspl 的 Orbit Mode 一樣是滑鼠拖曳驅動，不是按著方向鍵轉
      if (mode === 'look') {
        thirdPersonYaw -= dx * 0.005
        thirdPersonPitch = Math.max(-1.5, Math.min(1.5, thirdPersonPitch - dy * 0.005))
      } else if (mode === 'pan') {
        const panSpeed = thirdPersonRadius * 0.0025 * moveSpeed.value
        const right = cameraEntity.right
        const up = cameraEntity.up
        thirdPersonPivot.sub(right.clone().mulScalar(-dx * panSpeed))
        thirdPersonPivot.sub(up.clone().mulScalar(dy * panSpeed))
      }
      updateCameraFromThirdPerson()
      return
    }

    if (mode === 'look') {
      // 只改朝向（yaw/pitch），相機位置完全不動——原地轉頭，不是繞著哪個點公轉
      orbitState.yaw -= dx * 0.005
      orbitState.pitch = Math.max(-1.5, Math.min(1.5, orbitState.pitch - dy * 0.005))
    } else if (mode === 'pan') {
      const panSpeed = orbitState.moveScale * 0.0025 * moveSpeed.value
      const right = cameraEntity.right
      const up = cameraEntity.up
      orbitState.position.sub(right.clone().mulScalar(-dx * panSpeed))
      orbitState.position.sub(up.clone().mulScalar(dy * panSpeed))
    }
    updateCameraFromOrbit()
  }

  const onPointerUp = (e) => {
    if (e.pointerType === 'touch') {
      touches.delete(e.pointerId)
      if (touches.size === 1) {
        // 從雙指放開一根變單指，換回轉頭模式，用剩下那根手指目前位置當起點避免畫面跳動
        const [[pid, pt]] = [...touches.entries()]
        mode = 'look'
        activePointerId = pid
        lastX = pt.x; lastY = pt.y
      } else if (touches.size === 0 && e.pointerId === activePointerId) {
        mode = null
        activePointerId = null
      }
      return
    }
    if (e.pointerId === activePointerId) {
      mode = null
      activePointerId = null
    }
  }

  const onContextMenu = (e) => e.preventDefault() // 右鍵拿來平移，不要跳出瀏覽器右鍵選單
  const onWheel = (e) => {
    if (!cameraEntity) return
    e.preventDefault()
    if (cameraMode.value === 'third') {
      if (!thirdPersonPivot) return
      // 第三人稱：滾輪＝拉近拉遠環繞半徑（跟 superspl 的 Orbit Zoom 一樣），不是往前飛
      const zoomSpeed = 0.15 * moveSpeed.value
      thirdPersonRadius = Math.max(0.2, thirdPersonRadius * (1 + e.deltaY * 0.001 * zoomSpeed))
      updateCameraFromThirdPerson()
      return
    }
    if (!orbitState) return
    // 滾輪＝沿著目前面向的方向前後移動（第一人稱相機沒有「距離目標」這種東西可以縮放）
    const dollySpeed = orbitState.moveScale * 0.15 * moveSpeed.value
    orbitState.position.add(cameraEntity.forward.clone().mulScalar(-e.deltaY * 0.001 * dollySpeed))
    updateCameraFromOrbit()
  }

  // 滑鼠鎖定期間游標固定不動，clientX/clientY 不會變，onPointerMove 那套用座標差算 dx/dy 的邏輯完全失效，
  // 要改用瀏覽器另外提供的 movementX/movementY（每次移動的相對位移量），不用按著按鍵就會持續轉頭
  const onMouseMoveLocked = (e) => {
    if (document.pointerLockElement !== canvas) return
    if (cameraMode.value !== 'first' || !orbitState || !cameraEntity) return
    if (e.buttons & 2) {
      // 右鍵仍按著＝平移，跟未鎖定時的慣例一致
      const panSpeed = orbitState.moveScale * 0.0025 * moveSpeed.value
      const right = cameraEntity.right
      const up = cameraEntity.up
      orbitState.position.sub(right.clone().mulScalar(-e.movementX * panSpeed))
      orbitState.position.sub(up.clone().mulScalar(e.movementY * panSpeed))
    } else {
      orbitState.yaw -= e.movementX * 0.005
      orbitState.pitch = Math.max(-1.5, Math.min(1.5, orbitState.pitch - e.movementY * 0.005))
    }
    updateCameraFromOrbit()
  }
  const onPointerLockChange = () => {
    pointerLockActive.value = (document.pointerLockElement === canvas)
  }
  // 部分瀏覽器（尤其 Firefox）不是用 Promise reject 回報失敗，而是直接丟這個事件；
  // requestPointerLock() 的 catch 已經處理 Promise 版本，這裡補上事件版本，兩邊都涵蓋到
  const onPointerLockError = () => {
    const insecure = location.protocol !== 'https:' && location.hostname !== 'localhost'
    showToast(insecure
      ? '滑鼠鎖定失敗：目前不是 HTTPS／localhost 連線，瀏覽器不允許鎖定滑鼠，已改用拖曳方式操作'
      : '滑鼠鎖定失敗，已改用拖曳方式操作')
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('contextmenu', onContextMenu)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('mousemove', onMouseMoveLocked)
  document.addEventListener('pointerlockchange', onPointerLockChange)
  document.addEventListener('pointerlockerror', onPointerLockError)

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('contextmenu', onContextMenu)
    canvas.removeEventListener('wheel', onWheel)
    window.removeEventListener('mousemove', onMouseMoveLocked)
    document.removeEventListener('pointerlockchange', onPointerLockChange)
    document.removeEventListener('pointerlockerror', onPointerLockError)
    if (document.pointerLockElement === canvas) document.exitPointerLock()
    pointerLockActive.value = false
  }
}

let detachOrbitControls = null
let detachKeyboardControls = null

const computeOrbitFromBound = (bound) => {
  const { minx, miny, minz, maxx, maxy, maxz } = bound
  const centerLocal = [(minx + maxx) / 2, (miny + maxy) / 2, (minz + maxz) / 2]
  const size = [maxx - minx, maxy - miny, maxz - minz]
  const radius = Math.sqrt(size[0] ** 2 + size[1] ** 2 + size[2] ** 2) / 2 || 5
  const [wx, wy, wz] = applyZupToYup(...centerLocal) // 轉正後的世界座標中心點
  // 起始位置站在中心點斜前上方一段距離，看向中心點——之後純粹是「原地轉頭」，不會再繞著這個點公轉
  const yaw = Math.PI * 0.75
  const pitch = -0.4
  return {
    position: new pc.Vec3(wx + radius * 0.9, wy + radius * 0.6, wz - radius * 0.9),
    yaw,
    pitch,
    moveScale: radius // 走位/平移/滾輪速度的基準值，固定不變（不像公轉模式那樣跟著縮放距離變速度）
  }
}

// 鍵盤走位（照 MipMap 同一套按鍵）：WASD 前後左右、QE 上下、Ctrl 減速、Shift 加速。
// 用 app.on('update', dt) 每一幀持續移動，才會有「按著不放持續走」的效果，不是按一下動一下
const ARROW_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

const attachKeyboardControls = (app) => {
  pressedKeys = new Set() // 換成共用集合，螢幕虛擬按鈕（手機用）也會操作同一個
  const onKeyDown = (e) => {
    if (e.code === 'Space') e.preventDefault() // 不然空白鍵會讓瀏覽器頁面往下捲
    const isArrow = ARROW_CODES.includes(e.code)
    if (isArrow) e.preventDefault() // 方向鍵預設會捲動頁面，這裡改由我們自己處理
    // 第三人稱只在電腦版開放：方向鍵切進第三人稱、Esc 離開；手機沒有實體鍵盤，這段基本不會被觸發
    if (!isTouchDevice.value) {
      if (e.code === 'Escape' && cameraMode.value === 'third') { exitThirdPerson(); return }
      if (isArrow && cameraMode.value === 'first') enterThirdPerson()
    }
    pressedKeys.add(e.code)
  }
  const onKeyUp = (e) => pressedKeys.delete(e.code)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  const tmpForward = new pc.Vec3()
  const tmpRight = new pc.Vec3()
  const tmpMove = new pc.Vec3()
  const worldUp = new pc.Vec3(0, 1, 0)

  const onUpdate = (dt) => {
    if (!orbitState || !cameraEntity) return

    // 第三人稱現在完全由滑鼠拖曳/滾輪即時驅動（見 onPointerMove/onWheel），這裡不用逐幀處理
    if (cameraMode.value === 'third') return

    const hasTouchInput = touchMove.x !== 0 || touchMove.z !== 0
    if (pressedKeys.size === 0 && !hasTouchInput) return

    // 前後左右用相機目前面向的水平分量（忽略上下俯仰），不然抬頭看時 W 會往天花板飛
    tmpForward.copy(cameraEntity.forward); tmpForward.y = 0
    if (tmpForward.lengthSq() > 1e-6) tmpForward.normalize()
    tmpRight.copy(cameraEntity.right); tmpRight.y = 0
    if (tmpRight.lengthSq() > 1e-6) tmpRight.normalize()

    let speed = orbitState.moveScale * 1.2 * moveSpeed.value // 走位速度跟模型大小成正比，模型越大走越快；moveSpeed 是使用者另外可調的倍率
    if (pressedKeys.has('ControlLeft') || pressedKeys.has('ControlRight')) speed *= 2.5

    tmpMove.set(0, 0, 0)
    if (pressedKeys.has('KeyW')) tmpMove.add(tmpForward)
    if (pressedKeys.has('KeyS')) tmpMove.sub(tmpForward)
    if (pressedKeys.has('KeyD')) tmpMove.add(tmpRight)
    if (pressedKeys.has('KeyA')) tmpMove.sub(tmpRight)
    if (pressedKeys.has('Space')) tmpMove.add(worldUp)
    if (pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight')) tmpMove.sub(worldUp)
    // 虛擬搖桿是類比輸入（半推＝半速），跟鍵盤的滿速按鍵疊加在一起
    if (hasTouchInput) {
      tmpMove.add(tmpForward.clone().mulScalar(touchMove.z))
      tmpMove.add(tmpRight.clone().mulScalar(touchMove.x))
    }

    const len = tmpMove.length()
    if (len > 1e-6) {
      if (len > 1) tmpMove.mulScalar(1 / len) // 只封頂，不強制正規化，搖桿半推才會是半速
      tmpMove.mulScalar(speed * dt)
      // 逐軸位移＋簡易碰撞檢查：卡住的軸就不動，沒卡住的軸繼續走，體感類似貼牆滑動。
      // 沒有碰撞資料（collisionEnabled 為 false）時 isVoxelBlocked 永遠回傳 false，行為跟原本一樣
      const nextPos = orbitState.position.clone()
      const axisSteps = [
        new pc.Vec3(tmpMove.x, 0, 0),
        new pc.Vec3(0, tmpMove.y, 0),
        new pc.Vec3(0, 0, tmpMove.z)
      ]
      axisSteps.forEach((step) => {
        if (step.lengthSq() < 1e-9) return
        const candidate = nextPos.clone().add(step)
        if (!isVoxelBlocked(candidate.x, candidate.y, candidate.z)) nextPos.copy(candidate)
      })
      orbitState.position.copy(nextPos)
      updateCameraFromOrbit()
    }
  }
  app.on('update', onUpdate)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    app.off('update', onUpdate)
    pressedKeys.clear()
  }
}

// ── 動態畫質調整（依即時 FPS 自動升降階，不需要使用者手動調）─────────────
// initViewer 會先依裝置類型／tile 數量抓一個合理的起始畫質（qualityTier），
// 這裡是「跑起來之後」如果實際幀率撐不住就再往下降一階；撐得住夠久了，再往上升回去。
// 升階要盯著明顯更久的穩定期，避免在門檻附近來回震盪（一降就又升、一升就又降）。
const QUALITY_PRESETS = [
  { pixelRatio: 1, lodRangeMin: 2 },   // 0 最低：弱機／大場景兜底
  { pixelRatio: 1.5, lodRangeMin: 1 }, // 1 中：原本的手機預設
  { pixelRatio: 2, lodRangeMin: 0 }    // 2 高：原本的桌機預設（小場景）
]
let qualityTier = 2
const tileEntities = [] // 記錄目前載入的所有 tile entity，動態調整 LOD 時要一次改全部
const FPS_LOW_THRESHOLD = 25
const FPS_RECOVER_THRESHOLD = 50
const FRAMES_TO_DOWNGRADE = 60   // 連續約 1 秒持續低於門檻才降階，避免單次 lag spike 誤判
const FRAMES_TO_UPGRADE = 240    // 升階要穩定更久，避免緊貼門檻來回震盪
let lowFpsStreak = 0
let highFpsStreak = 0

const applyQualityTier = (tier) => {
  qualityTier = tier
  const preset = QUALITY_PRESETS[tier]
  if (pcApp?.graphicsDevice) {
    pcApp.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, isTouchDevice.value ? Math.min(preset.pixelRatio, 1.5) : preset.pixelRatio)
    const canvas = canvasRef.value
    if (canvas?.parentElement) {
      const rect = canvas.parentElement.getBoundingClientRect()
      pcApp.resizeCanvas(rect.width, rect.height) // 改了 maxPixelRatio 一定要重新 resize 才會真正套用到渲染解析度
    }
  }
  tileEntities.forEach((entity) => {
    if (entity.gsplat) entity.gsplat.lodRangeMin = preset.lodRangeMin
  })
}

const attachPerformanceMonitor = (app) => {
  lowFpsStreak = 0
  highFpsStreak = 0
  const onUpdate = (dt) => {
    if (dt <= 0) return
    const fps = 1 / dt
    if (fps < FPS_LOW_THRESHOLD) {
      lowFpsStreak++
      highFpsStreak = 0
      if (lowFpsStreak > FRAMES_TO_DOWNGRADE && qualityTier > 0) {
        applyQualityTier(qualityTier - 1)
        lowFpsStreak = 0
      }
    } else if (fps > FPS_RECOVER_THRESHOLD) {
      highFpsStreak++
      lowFpsStreak = 0
      if (highFpsStreak > FRAMES_TO_UPGRADE && qualityTier < QUALITY_PRESETS.length - 1) {
        applyQualityTier(qualityTier + 1)
        highFpsStreak = 0
      }
    } else {
      lowFpsStreak = 0
      highFpsStreak = 0
    }
  }
  app.on('update', onUpdate)
  return () => app.off('update', onUpdate)
}

let detachPerformanceMonitor = null

const disposeViewer = () => {
  // 每一步都各自包 try/catch：就算引擎內部因為壞掉的 transform 矩陣噴例外，
  // 也不能讓它擋住後面的清理步驟，不然視窗會關不掉、殘留的監聽器也清不掉
  try { if (detachOrbitControls) detachOrbitControls() } catch (e) { console.error(e) }
  detachOrbitControls = null
  try { if (detachKeyboardControls) detachKeyboardControls() } catch (e) { console.error(e) }
  detachKeyboardControls = null
  try { if (detachPerformanceMonitor) detachPerformanceMonitor() } catch (e) { console.error(e) }
  detachPerformanceMonitor = null
  try { if (resizeObserverRef) resizeObserverRef.disconnect() } catch (e) { console.error(e) }
  resizeObserverRef = null
  try { if (pcApp) pcApp.destroy() } catch (e) { console.error(e) }
  pcApp = null
  gsplatEntity = null
  cameraEntity = null
  orbitState = null
  pressedKeys = new Set()
  touchMove.x = 0; touchMove.z = 0
  joystickPointerId = null
  tileEntities.length = 0
  lowFpsStreak = 0
  highFpsStreak = 0
  cameraMode.value = 'first'
  thirdPersonPivot = null
  collisionVoxels = null
  collisionEnabled = false
}

const initViewer = async (model) => {
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas) return

  disposeViewer()

  // 觸發開啟的按鈕（例如卡片上的「打開」）點下去之後，瀏覽器焦點可能還留在那顆按鈕上，
  // 某些瀏覽器下這會讓方向鍵之類的按鍵一開始不會生效，要點一下畫面「奪回」焦點才會動。
  // 這裡主動把焦點轉到 canvas 本身，方向鍵/WASD 一開場就能立刻用，不用先點一次滑鼠
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  canvas.focus()

  // 讀取這顆模型之前存的水平校正微調值（沒存過就是 0,0,0，只用基礎的 -90 度校正）
  const [tx0, ty0, tz0] = (model.tiltOffset ? model.tiltOffset.split(',').map(Number) : [0, 0, 0])
  tiltForm.x = tx0; tiltForm.y = ty0; tiltForm.z = tz0

  // 讀取這顆模型之前存的移動速度倍率（沒存過、或存壞了就退回 1 倍，不調整）
  const savedSpeed = Number(model.moveSpeed)
  moveSpeed.value = (model.moveSpeed && Number.isFinite(savedSpeed) && savedSpeed > 0) ? savedSpeed : 1

  // 依裝置類型＋tile 數量先抓一個起始畫質（正式的動態升降階交給 attachPerformanceMonitor）：
  // 手機一律從「中」開始；桌機如果場景被切成很多塊（多個 entryFiles，代表整體 splat 量很可能很大）
  // 也先從「中」開始，避免一開場就用最高畫質硬扛，等量到幀率撐不住才降就太晚了
  const tileCount = (model.entryFiles && model.entryFiles.length) ? model.entryFiles.length : (model.entryFile ? 1 : 0)
  qualityTier = isTouchDevice.value ? 1 : (tileCount > 3 ? 1 : 2)
  const initialPreset = QUALITY_PRESETS[qualityTier]

  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    // 只有起始畫質是「高」才開 MSAA——splat 渲染本來就是 overdraw/fill-rate 密集，
    // 場景已經先被判定要降階的話，AA 只會讓負擔雪上加霜
    graphicsDeviceOptions: { antialias: qualityTier === 2 }
  })
  pcApp = app
  app.setCanvasFillMode(pc.FILLMODE_NONE)
  app.setCanvasResolution(pc.RESOLUTION_AUTO)
  // 沒設這個的話，高解析度螢幕（Retina/2x 以上）會用 CSS 像素尺寸渲染再放大貼上去，
  // 畫面就會糊——之前用官方 viewer 包時這個是內建處理好的，自己接引擎要手動補上
  // 手機 GPU 弱很多，解析度上限降低一點換效能，不然容易頓/發燙
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, isTouchDevice.value ? Math.min(initialPreset.pixelRatio, 1.5) : initialPreset.pixelRatio)

  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect()
    app.resizeCanvas(rect.width, rect.height)
  }
  resize()
  resizeObserverRef = new ResizeObserver(resize)
  resizeObserverRef.observe(canvas.parentElement)

  cameraEntity = new pc.Entity('camera')
  cameraEntity.addComponent('camera', { clearColor: new pc.Color(0.05, 0.05, 0.05) })
  app.root.addChild(cameraEntity)

  // 起始視角：優先用之前存的手動視角，否則用 bound 算（都是「轉正後」的世界座標）
  if (model.cameraPosition && model.cameraTarget) {
    const [px, py, pz] = model.cameraPosition.split(',').map(Number)
    const [tx, ty, tz] = model.cameraTarget.split(',').map(Number)
    const position = new pc.Vec3(px, py, pz)
    const target = new pc.Vec3(tx, ty, tz)
    const dir = target.clone().sub(position)
    const yaw = Math.atan2(dir.x, dir.z)
    const pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z))

    let moveScale = position.distance(target) || 5
    if (model.bound) {
      const [minx, miny, minz, maxx, maxy, maxz] = model.bound.split(',').map(Number)
      const size = [maxx - minx, maxy - miny, maxz - minz]
      moveScale = Math.sqrt(size[0] ** 2 + size[1] ** 2 + size[2] ** 2) / 2 || moveScale
    }

    orbitState = { position, yaw, pitch, moveScale }
    updateCameraFromOrbit()
  } else if (model.bound) {
    const [minx, miny, minz, maxx, maxy, maxz] = model.bound.split(',').map(Number)
    orbitState = computeOrbitFromBound({ minx, miny, minz, maxx, maxy, maxz })
    updateCameraFromOrbit()
  } else {
    orbitState = { position: new pc.Vec3(0, 1, -3), yaw: 0, pitch: -0.15, moveScale: 5 }
    updateCameraFromOrbit()
  }

  detachOrbitControls = attachOrbitControls(canvas)
  detachKeyboardControls = attachKeyboardControls(app)

  // 碰撞格子大小依模型尺寸（moveScale）抓一個比例，模型越大格子跟著放大，
  // 避免小模型格子太粗、大模型格子太細（太細會讓體素數量爆炸，建置變慢）
  collisionVoxels = new Set()
  collisionEnabled = false
  collisionVoxelSize = Math.max((orbitState.moveScale || 5) * 0.02, 0.05)
  // 碰撞點位是整顆模型共用一份 collision.bin（後端已經跨所有 MipTile 合併過），
  // 不用等 tile 逐一載入完成，直接單獨抓一次、抓到就整批灌進 collisionVoxels；
  // 抓不到（模型還沒做/後端做失敗）就跳個 toast 提醒，不影響模型本身顯示
  fetchCollisionCenters(model).then((centers) => {
    if (viewerModal.id !== model.id) return // 資料抓回來前使用者已經切去看別顆模型，這份就不要套用了
    mergeCentersIntoCollision(centers)
    if (!collisionEnabled) {
      showToast('這顆模型暫時無法建立碰撞資料，走位不會被擋')
    }
  })

  // 場景可能被重建工具切成多個 MipTile（每個各自是一棵完整獨立的 LOD tree，
  // 只描述場景的一部分），entryFiles 是清單，每一份都要各自建一個 gsplat Entity，
  // 全部疊在同一個「根」Entity 底下，才會拼成完整場景。
  // 水平校正（applyEntityTilt）套用在這個根 Entity 上，這樣不管有幾塊 tile，
  // 只要轉一次就全部一起轉，不用每塊各自轉一次。
  gsplatEntity = new pc.Entity('gsplat-root')
  app.root.addChild(gsplatEntity)
  applyEntityTilt() // 用目前 tiltForm（已經在下面載入這顆模型存的值）套用旋轉，套在根節點上

  // 向下相容：舊資料如果 API 還沒更新、只給了單一 entryFile 字串，包成單筆清單繼續用
  const entryFiles = (model.entryFiles && model.entryFiles.length)
    ? model.entryFiles
    : (model.entryFile ? [model.entryFile] : [])

  if (entryFiles.length === 0) {
    showToast('這顆模型沒有可用的進入點檔案')
    app.start()
    return
  }

  let loadedTiles = 0
  let erroredTiles = 0
  entryFiles.forEach((entryPath, idx) => {
    const contentUrl = absoluteFileUrl(`/holy/gaussian/file/${model.id}/${entryPath}`)
    const asset = new pc.Asset(`${model.name || 'gsplat'}-tile-${idx}`, 'gsplat', { url: contentUrl })
    app.assets.add(asset)
    asset.once('load', () => {
      const tileEntity = new pc.Entity(`gsplat-tile-${idx}`)
      tileEntity.addComponent('gsplat', { asset })
      if (tileEntity.gsplat) {
        // 套用目前這顆模型的起始畫質階（手機／多 tile 場景預設會跳過最細緻那一階 LOD）
        tileEntity.gsplat.lodRangeMin = QUALITY_PRESETS[qualityTier].lodRangeMin
      }
      gsplatEntity.addChild(tileEntity)
      tileEntities.push(tileEntity) // 記下來，之後動態調整畫質時才能一次改全部 tile
      loadedTiles++
    })
    asset.once('error', (err) => {
      erroredTiles++
      showToast(`第 ${idx + 1}/${entryFiles.length} 塊模型載入失敗：${err}`)
    })
    app.assets.load(asset)
  })

  detachPerformanceMonitor = attachPerformanceMonitor(app)
  app.start()
}

const openViewer = async (model) => {
  await loadPlayCanvas()
  viewerModal.name = model.name
  viewerModal.id = model.id
  viewerModal.show = true
  initViewer(model)
}

const resetCameraToDefault = () => {
  if (cameraMode.value === 'third') exitThirdPerson() // 重設視角前先退回第一人稱，避免跟環繞邏輯互相覆蓋
  const model = models.value.find(m => m.id === viewerModal.id)
  if (!model?.bound) { showToast('這顆模型沒有 bound 資料，無法自動計算'); return }
  const [minx, miny, minz, maxx, maxy, maxz] = model.bound.split(',').map(Number)
  orbitState = computeOrbitFromBound({ minx, miny, minz, maxx, maxy, maxz })
  updateCameraFromOrbit()
}

const saveCameraAsDefault = async () => {
  if (cameraMode.value === 'third') exitThirdPerson() // 存的應該是第一人稱視角，先退回去再存
  if (!cameraEntity || !orbitState) return
  savingCamera.value = true
  try {
    const p = cameraEntity.getPosition()
    // 現在沒有「公轉目標點」這個概念了，存檔格式沿用 position/target 兩個欄位，
    // target 就合成一個「往目前面向方向前面一點的點」，下次載入時用來反推 yaw/pitch
    const t = p.clone().add(cameraEntity.forward.clone().mulScalar(orbitState.moveScale || 5))
    const position = `${p.x},${p.y},${p.z}`
    const target = `${t.x},${t.y},${t.z}`
    const url = `${BASE}/camera/${viewerModal.id}?position=${encodeURIComponent(position)}&target=${encodeURIComponent(target)}`
    await fetchWithTimeout(url, { method: 'POST' })
    const model = models.value.find(m => m.id === viewerModal.id)
    if (model) { model.cameraPosition = position; model.cameraTarget = target }
    showToast('已存成這顆模型的預設視角')
  } catch {
    showToast('儲存失敗')
  } finally {
    savingCamera.value = false
  }
}

// ── 手機虛擬搖桿＋上下按鈕（沒有實體鍵盤，走位只能靠這個）──────────
const joystickKnobStyle = reactive({ x: 0, y: 0 })
const JOYSTICK_RADIUS = 40 // px，要跟下面 template 裡搖桿底座的半徑對上

const onJoystickPointerDown = (e) => {
  joystickPointerId = e.pointerId
  e.target.setPointerCapture(e.pointerId)
}
const onJoystickPointerMove = (e) => {
  if (e.pointerId !== joystickPointerId) return
  const rect = e.currentTarget.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  let dx = e.clientX - cx
  let dy = e.clientY - cy
  const len = Math.hypot(dx, dy)
  if (len > JOYSTICK_RADIUS) { dx = (dx / len) * JOYSTICK_RADIUS; dy = (dy / len) * JOYSTICK_RADIUS }
  joystickKnobStyle.x = dx
  joystickKnobStyle.y = dy
  touchMove.x = dx / JOYSTICK_RADIUS       // 右推為正，對應 tmpRight
  touchMove.z = -dy / JOYSTICK_RADIUS      // 上推（螢幕座標 dy 是負的）為正，對應前進
}
const onJoystickPointerUp = (e) => {
  if (e.pointerId !== joystickPointerId) return
  joystickPointerId = null
  joystickKnobStyle.x = 0
  joystickKnobStyle.y = 0
  touchMove.x = 0
  touchMove.z = 0
}

const onVertButtonDown = (code) => pressedKeys.add(code)
const onVertButtonUp = (code) => pressedKeys.delete(code)

const closeViewer = () => {
  viewerModal.show = false
  tiltPanelOpen.value = false
  disposeViewer()
}

onUnmounted(disposeViewer)

const formatSize = (bytes) => {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`
}
</script>

<template>
  <ClientOnly>
    <div class="p-4 sm:p-6 max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-5">
        <h1 class="text-xl font-bold text-base-c">
          高斯潑濺模型（3D 導覽）
        </h1>
        <button
          class="px-4 py-2 text-sm bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
          @click="openUploadModal"
        >
          + 上傳模型
        </button>
      </div>

      <div
        v-if="isLoading"
        class="text-center text-hint-c py-10 text-sm"
      >
        載入中…
      </div>

      <div
        v-else-if="models.length === 0"
        class="text-center text-hint-c py-16 text-sm border border-dashed border-light-c rounded-xl"
      >
        尚無模型，點右上角「上傳模型」開始
      </div>

      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      >
        <div
          v-for="model in models"
          :key="model.id"
          class="bg-surface rounded-xl overflow-hidden border border-light-c hover:shadow-lg transition-shadow group"
        >
          <div
            class="aspect-video bg-surface2 flex items-center justify-center cursor-pointer relative"
            @click="openViewer(model)"
          >
            <img
              v-if="model.thumbnail"
              :src="fileUrl(model.thumbnail)"
              class="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            >
            <svg
              v-else
              class="w-10 h-10 text-hint-c"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 7l8-4 8 4M4 7v10l8 4m-8-14l8 4m0 10l8-4V7m-8 14V11m8-4l-8 4"
              />
            </svg>
            <div
              class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span
                class="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity">點擊瀏覽</span>
            </div>
          </div>
          <div class="p-3">
            <p class="text-sm font-semibold text-base-c truncate">
              {{ model.name }}
            </p>
            <p
              v-if="model.description"
              class="text-xs text-hint-c mt-0.5 line-clamp-2"
            >
              {{ model.description }}
            </p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-hint-c">{{ formatSize(model.totalSizeBytes) }}</span>
              <button
                class="text-xs text-red-500 hover:text-red-600"
                @click="deleteModel(model)"
              >
                刪除
              </button>
            </div>
            <div class="flex items-center gap-2 mt-2 pt-2 border-t border-light-c">
              <button
                class="flex-1 text-xs text-hint-c hover:text-base-c border border-light-c rounded-lg py-1"
                @click="openSharePage(model)"
              >
                打開
              </button>
              <button
                class="flex-1 text-xs text-hint-c hover:text-base-c border border-light-c rounded-lg py-1"
                @click="copyShareLink(model)"
              >
                複製分享連結
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 上傳 Modal -->
      <div
        v-if="uploadModal.show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      >
        <div
          class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-base-c">
              上傳高斯模型
            </h3>
            <button
              class="text-hint-c hover:text-muted-c p-1"
              @click="uploadModal.show = false"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs text-hint-c mb-1 block">名稱</label>
              <input
                v-model="uploadForm.name"
                type="text"
                placeholder="例如：台東教堂"
                class="w-full px-3 py-2 text-sm rounded-lg border border-light-c bg-surface2"
              >
            </div>
            <div>
              <label class="text-xs text-hint-c mb-1 block">說明（選填）</label>
              <textarea
                v-model="uploadForm.description"
                rows="2"
                class="w-full px-3 py-2 text-sm rounded-lg border border-light-c bg-surface2"
              />
            </div>

            <div>
              <label class="text-xs text-hint-c mb-1 block">SOG Tiles 資料夾（打包成 .zip）</label>
              <div
                :class="dragOver ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-base hover:border-orange-400'"
                class="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
                @dragover.prevent="dragOver = true"
                @dragleave="dragOver = false"
                @drop.prevent="handleZipDrop"
                @click="zipInputRef?.click()"
              >
                <p class="text-sm text-hint-c">
                  {{ uploadForm.zipFile ? uploadForm.zipFile.name : '點擊或拖曳 zip 檔上傳' }}
                </p>
                <p class="text-xs text-hint-c mt-1 opacity-60">
                  將重建工具輸出的 SOG Tiles 整個資料夾打包成 zip
                </p>
                <input
                  ref="zipInputRef"
                  type="file"
                  accept=".zip"
                  class="hidden"
                  @change="handleZipSelect"
                >
              </div>
            </div>

            <div>
              <label class="text-xs text-hint-c mb-1 block">縮圖（選填）</label>
              <input
                ref="thumbInputRef"
                type="file"
                accept="image/*"
                class="w-full text-sm"
                @change="handleThumbSelect"
              >
            </div>
          </div>

          <div
            v-if="uploading"
            class="mt-3 flex items-center gap-2 text-sm text-hint-c"
          >
            <div class="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"/>
            {{ uploadProgress }}
          </div>

          <button
            class="mt-4 w-full px-4 py-2.5 text-sm bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
            :disabled="uploading"
            @click="submitUpload"
          >
            {{ uploading ? '上傳中…' : '開始上傳' }}
          </button>
        </div>
      </div>

      <!-- 檢視器 Modal -->
      <div
        v-if="viewerModal.show"
        class="fixed inset-0 bg-black z-[60] flex flex-col"
      >
        <div class="flex items-center justify-between px-2 sm:px-4 py-2 bg-black/80 text-white flex-wrap gap-y-1">
          <span class="text-sm font-medium truncate max-w-[40vw] sm:max-w-none">{{ viewerModal.name }}</span>
          <div class="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end">
            <button
              class="text-white/80 hover:text-white text-[11px] sm:text-xs border border-white/30 rounded-lg px-2 sm:px-2.5 py-1"
              @click="resetCameraToDefault"
            >
              重設視角
            </button>
            <button
              class="text-white/80 hover:text-white text-[11px] sm:text-xs border border-white/30 rounded-lg px-2 sm:px-2.5 py-1 disabled:opacity-50"
              :disabled="savingCamera"
              @click="saveCameraAsDefault"
            >
              {{ savingCamera ? '儲存中…' : '存成預設視角' }}
            </button>
            <button
              class="text-white/80 hover:text-white text-[11px] sm:text-xs border border-white/30 rounded-lg px-2 sm:px-2.5 py-1"
              @click="tiltPanelOpen = !tiltPanelOpen; if (tiltPanelOpen) speedPanelOpen = false"
            >
              {{ tiltPanelOpen ? '收起水平校正' : '校正水平' }}
            </button>
            <button
              class="text-white/80 hover:text-white text-[11px] sm:text-xs border border-white/30 rounded-lg px-2 sm:px-2.5 py-1"
              @click="speedPanelOpen = !speedPanelOpen; if (speedPanelOpen) tiltPanelOpen = false"
            >
              {{ speedPanelOpen ? '收起移動速度' : '移動速度' }}
            </button>
            <button
              class="text-white/80 hover:text-white p-1"
              @click="closeViewer"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 relative">
          <canvas
            ref="canvasRef"
            tabindex="-1"
            class="absolute inset-0 w-full h-full touch-none outline-none"
          />
          <p
            v-if="!isTouchDevice && cameraMode === 'first' && !pointerLockActive"
            class="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none"
          >
            點一下畫面啟用滑鼠轉頭．WASD 走位．空白鍵上升．Shift 下降．Ctrl 加速．右鍵平移．滾輪前後．方向鍵：切換第三人稱
          </p>
          <p
            v-else-if="!isTouchDevice && cameraMode === 'first'"
            class="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none"
          >
            滑鼠移動轉頭．WASD 走位．空白鍵上升．Shift 下降．Ctrl 加速．右鍵平移．滾輪前後．方向鍵：切換第三人稱
          </p>
          <p
            v-else-if="!isTouchDevice"
            class="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none"
          >
            左鍵拖曳：環繞旋轉．右鍵拖曳：平移中心．滾輪：拉近拉遠．Esc：離開第三人稱
          </p>

          <!-- 手機虛擬搖桿（走位）＋上下按鈕：沒有實體鍵盤，走位只能靠這個 -->
          <template v-if="isTouchDevice">
            <div
              class="absolute bottom-6 left-6 w-24 h-24 rounded-full bg-white/10 border border-white/25 touch-none"
              @pointerdown="onJoystickPointerDown"
              @pointermove="onJoystickPointerMove"
              @pointerup="onJoystickPointerUp"
              @pointercancel="onJoystickPointerUp"
            >
              <div
                class="absolute top-1/2 left-1/2 w-10 h-10 -mt-5 -ml-5 rounded-full bg-white/40 pointer-events-none"
                :style="{ transform: `translate(${joystickKnobStyle.x}px, ${joystickKnobStyle.y}px)` }"
              />
            </div>

            <div class="absolute bottom-6 right-6 flex flex-col gap-3">
              <button
                class="w-12 h-12 rounded-full bg-white/15 border border-white/25 text-white text-lg active:bg-white/30 touch-none"
                @pointerdown.prevent="onVertButtonDown('Space')"
                @pointerup.prevent="onVertButtonUp('Space')"
                @pointercancel.prevent="onVertButtonUp('Space')"
              >
                ▲
              </button>
              <button
                class="w-12 h-12 rounded-full bg-white/15 border border-white/25 text-white text-lg active:bg-white/30 touch-none"
                @pointerdown.prevent="onVertButtonDown('ShiftLeft')"
                @pointerup.prevent="onVertButtonUp('ShiftLeft')"
                @pointercancel.prevent="onVertButtonUp('ShiftLeft')"
              >
                ▼
              </button>
            </div>

            <p class="absolute top-3 left-1/2 -translate-x-1/2 text-white/50 text-[10px] pointer-events-none">
              單指拖曳轉頭．雙指縮放/平移
            </p>
          </template>

          <div
            v-if="tiltPanelOpen"
            class="absolute top-3 right-3 bg-black/85 text-white text-xs rounded-xl p-3 w-60 max-w-[calc(100vw-1.5rem)] space-y-2 backdrop-blur"
          >
            <p class="font-semibold text-sm mb-1">
              水平校正微調（度）
            </p>
            <p class="opacity-60 leading-relaxed">
              疊加在基礎校正上，拖曳/輸入後即時套用，看畫面水平線正不正
            </p>

            <div
              v-for="axis in ['x', 'y', 'z']"
              :key="axis"
              class="flex items-center gap-2"
            >
              <span class="w-3 uppercase opacity-70">{{ axis }}</span>
              <input
                v-model.number="tiltForm[axis]"
                type="range"
                min="-15"
                max="15"
                step="0.5"
                class="flex-1"
                @input="applyEntityTilt"
              >
              <input
                v-model.number="tiltForm[axis]"
                type="number"
                step="0.5"
                class="w-14 px-1 py-0.5 rounded bg-white/10 border border-white/20 text-white"
                @change="applyEntityTilt"
              >
            </div>

            <button
              class="w-full mt-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium disabled:opacity-50"
              :disabled="savingTilt"
              @click="saveTiltAsDefault"
            >
              {{ savingTilt ? '儲存中…' : '存成預設校正' }}
            </button>
          </div>

          <div
            v-if="speedPanelOpen"
            class="absolute top-3 right-3 bg-black/85 text-white text-xs rounded-xl p-3 w-60 max-w-[calc(100vw-1.5rem)] space-y-2 backdrop-blur"
          >
            <p class="font-semibold text-sm mb-1">
              移動速度倍率
            </p>
            <p class="opacity-60 leading-relaxed">
              走位／平移／滾輪縮放共用，拖曳後即時套用；1 代表維持模型大小自動估算的預設速度
            </p>

            <div class="flex items-center gap-2">
              <input
                v-model.number="moveSpeed"
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                class="flex-1"
              >
              <input
                v-model.number="moveSpeed"
                type="number"
                min="0.1"
                step="0.1"
                class="w-14 px-1 py-0.5 rounded bg-white/10 border border-white/20 text-white"
              >
            </div>

            <button
              class="w-full mt-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium disabled:opacity-50"
              :disabled="savingSpeed"
              @click="saveSpeedAsDefault"
            >
              {{ savingSpeed ? '儲存中…' : '存成預設速度' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <transition name="fade">
        <div
          v-if="toast.show"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 whitespace-nowrap"
        >
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </ClientOnly>
</template>


<style scoped>
@use '~/assets/scs/main' as *;
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
