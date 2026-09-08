<script setup>
// 需先安裝：npm install playcanvas（跟後台管理頁共用同一個套件，如果後台那邊已經裝過就不用重裝）
//
// 注意：這裡故意不在頂層 `import * as pc from 'playcanvas'`。
// playcanvas 打包成單一巨大檔案，Nuxt 在 SSR 階段也會嘗試轉譯 <script setup> 裡的 import，
// Vite 的一般 dev-transform 處理這種巨大檔案很容易堆疊爆掉（Maximum call stack size exceeded）。
// 改成只在真正要用、且確定在瀏覽器端執行時才動態載入。
let pc = null
const loadPlayCanvas = async () => {
  if (!pc) pc = await import('playcanvas')
  return pc
}

// 公開分享頁，不用登入、不用權限，跟後台的 staff layout 分開
definePageMeta({ layout: 'blank' })

const route = useRoute()
const modelId = route.params.id

const commonStore = useCommonStore()
const BASE = commonStore.data.main_url + '/holy/gaussian'
const API_ORIGIN = commonStore.data.main_url

const fileUrl = (path) => {
  if (!path) return ''
  return path.startsWith('http') ? path : API_ORIGIN + path
}
// srcdoc/跨頁情境不會用到這裡，但這裡本身就是真正的頁面（不是 iframe），
// 直接用站內相對路徑其實就沒問題；保留這個 helper只是跟後台那邊寫法一致，方便日後對照維護
const absoluteFileUrl = (path) => fileUrl(path)

const model = ref(null)
const loadError = ref('')
const isLoading = ref(true)

const canvasRef = ref(null)
let pcApp = null
let gsplatEntity = null
let cameraEntity = null
let orbitState = null
let resizeObserverRef = null

const isTouchDevice = ref(false)
if (typeof window !== 'undefined') {
  isTouchDevice.value = window.matchMedia('(pointer: coarse)').matches
}

let pressedKeys = new Set()
const touchMove = reactive({ x: 0, z: 0 })
let joystickPointerId = null

// 移動速度倍率：用這顆模型存的值（後台管理頁調好存的），公開頁不給訪客再調整，
// 維持體驗一致，避免被調到過快/過慢反而變差
const moveSpeed = ref(1)

// 公開頁沒有後台那套 toast 系統，這裡簡單做一個，主要拿來顯示滑鼠鎖定失敗之類的提示
const toast = reactive({ show: false, message: '' })
const showToast = (message) => {
  toast.message = message
  toast.show = true
  setTimeout(() => { toast.show = false }, 2500)
}

const ZUP_TO_YUP_EULER = [-90, 0, 0]
const applyZupToYup = (x, y, z) => [x, z, -y]

const updateCameraFromOrbit = () => {
  if (!cameraEntity || !orbitState) return
  const { position, yaw, pitch } = orbitState
  const cp = Math.cos(pitch)
  const forward = new pc.Vec3(cp * Math.sin(yaw), Math.sin(pitch), cp * Math.cos(yaw))
  cameraEntity.setPosition(position)
  cameraEntity.lookAt(position.clone().add(forward))
}

// ── 第三人稱環繞視角（電腦版限定）───────────────────────────────
// 沒有實體「人物」模型可以站在裡面，所以「第三人稱」是模擬出來的：
// 進入的當下，把目前站的位置當作環繞的觀察點（thirdPersonPivot），鏡頭往後拉開＋墊高一點再看回來，
// 之後用滑鼠拖曳/滾輪繞著這個固定點旋轉、拉近拉遠。只在電腦版啟用，手機維持原本的觸控走位。
const cameraMode = ref('first') // 'first' | 'third'
const pointerLockActive = ref(false) // 第一人稱下滑鼠是否已鎖定（鎖定後不用按著左鍵，移動滑鼠就會轉頭）
let thirdPersonPivot = null
let thirdPersonYaw = 0
let thirdPersonPitch = 0
let thirdPersonRadius = 5
const THIRD_PERSON_MIN_RADIUS = 1.5
const THIRD_PERSON_PITCH = 0.35

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
  if (document.pointerLockElement === canvasRef.value) document.exitPointerLock()
  thirdPersonRadius = Math.max(THIRD_PERSON_MIN_RADIUS, (orbitState.moveScale || 5) * 0.3)
  thirdPersonPivot = orbitState.position.clone()
  thirdPersonYaw = orbitState.yaw + Math.PI
  thirdPersonPitch = THIRD_PERSON_PITCH
  cameraMode.value = 'third'
  updateCameraFromThirdPerson()
}

const exitThirdPerson = () => {
  if (cameraMode.value !== 'third' || !cameraEntity || !orbitState) return
  const dir = thirdPersonPivot.clone().sub(cameraEntity.getPosition())
  orbitState.position = cameraEntity.getPosition().clone()
  orbitState.yaw = Math.atan2(dir.x, dir.z)
  orbitState.pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z))
  cameraMode.value = 'first'
  thirdPersonPivot = null
  updateCameraFromOrbit()
}

const attachOrbitControls = (canvas) => {
  let mode = null
  let lastX = 0
  let lastY = 0
  let activePointerId = null
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
      if (touches.size === 2) { startPinch(); return }
      mode = 'look'
      activePointerId = e.pointerId
      lastX = e.clientX; lastY = e.clientY
      return
    }
    // 電腦版第一人稱左鍵點一下＝鎖定滑鼠，之後不用按著就能直接移動滑鼠轉頭（跟一般 FPS 遊戲一致）。
    // requestPointerLock() 失敗時瀏覽器預設完全靜默不會報錯，最常見原因是「不安全的連線來源」——
    // Pointer Lock API 規定只能在 HTTPS 或 localhost 底下用，這裡明確接錯誤並用 toast 告訴使用者原因
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
    // 左鍵拖曳＝轉頭看，右鍵拖曳＝平移，這組保留當作滑鼠鎖定失敗/不支援時的備用操作方式
    mode = e.button === 2 ? 'pan' : 'look'
    activePointerId = e.pointerId
    lastX = e.clientX; lastY = e.clientY
  }

  const onPointerMove = (e) => {
    if (!cameraEntity) return
    if (document.pointerLockElement === canvas) return // 滑鼠鎖定時交給 onMouseMoveLocked（movementX/Y）處理
    if (cameraMode.value === 'first' && !orbitState) return
    if (cameraMode.value === 'third' && !thirdPersonPivot) return

    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (mode === 'pinch' && touches.size === 2 && cameraMode.value === 'first') {
        // 雙指縮放/平移只服務第一人稱（第三人稱是電腦版限定功能，觸控裝置不會進到這個分支）
        const pts = [...touches.values()]
        const newDist = dist(pts[0], pts[1])
        const newMid = mid(pts[0], pts[1])
        if (pinchStartDist > 1) {
          const dollySpeed = orbitState.moveScale * 0.6 * moveSpeed.value
          orbitState.position.add(cameraEntity.forward.clone().mulScalar((newDist - pinchStartDist) / pinchStartDist * dollySpeed))
          pinchStartDist = newDist
        }
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
      return
    }

    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX; lastY = e.clientY

    if (cameraMode.value === 'third') {
      // 第三人稱：左鍵拖曳＝繞著 thirdPersonPivot 旋轉，右鍵拖曳＝平移這個環繞中心點
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
        const [[pid, pt]] = [...touches.entries()]
        mode = 'look'; activePointerId = pid
        lastX = pt.x; lastY = pt.y
      } else if (touches.size === 0 && e.pointerId === activePointerId) {
        mode = null; activePointerId = null
      }
      return
    }
    if (e.pointerId === activePointerId) { mode = null; activePointerId = null }
  }

  const onContextMenu = (e) => e.preventDefault()
  const onWheel = (e) => {
    if (!cameraEntity) return
    e.preventDefault()
    if (cameraMode.value === 'third') {
      if (!thirdPersonPivot) return
      // 第三人稱：滾輪＝拉近拉遠環繞半徑，不是往前飛
      const zoomSpeed = 0.15 * moveSpeed.value
      thirdPersonRadius = Math.max(0.2, thirdPersonRadius * (1 + e.deltaY * 0.001 * zoomSpeed))
      updateCameraFromThirdPerson()
      return
    }
    if (!orbitState) return
    const dollySpeed = orbitState.moveScale * 0.15 * moveSpeed.value
    orbitState.position.add(cameraEntity.forward.clone().mulScalar(-e.deltaY * 0.001 * dollySpeed))
    updateCameraFromOrbit()
  }

  // 滑鼠鎖定期間游標固定不動，clientX/clientY 不會變，onPointerMove 那套用座標差算 dx/dy 的邏輯完全失效，
  // 要改用瀏覽器另外提供的 movementX/movementY，不用按著按鍵就會持續轉頭
  const onMouseMoveLocked = (e) => {
    if (document.pointerLockElement !== canvas) return
    if (cameraMode.value !== 'first' || !orbitState || !cameraEntity) return
    if (e.buttons & 2) {
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
  const [wx, wy, wz] = applyZupToYup(...centerLocal)
  return {
    position: new pc.Vec3(wx + radius * 0.9, wy + radius * 0.6, wz - radius * 0.9),
    yaw: Math.PI * 0.75,
    pitch: -0.4,
    moveScale: radius
  }
}

// ── 動態畫質調整（依即時 FPS 自動升降階，不需要使用者手動調）─────────────
const QUALITY_PRESETS = [
  { pixelRatio: 1, lodRangeMin: 2 },   // 0 最低：弱機／大場景兜底
  { pixelRatio: 1.5, lodRangeMin: 1 }, // 1 中：原本的手機預設
  { pixelRatio: 2, lodRangeMin: 0 }    // 2 高：原本的桌機預設（小場景）
]
let qualityTier = 2
const tileEntities = []
const FPS_LOW_THRESHOLD = 25
const FPS_RECOVER_THRESHOLD = 50
const FRAMES_TO_DOWNGRADE = 60
const FRAMES_TO_UPGRADE = 240
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
      pcApp.resizeCanvas(rect.width, rect.height)
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

const ARROW_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

const attachKeyboardControls = (app) => {
  pressedKeys = new Set()
  const onKeyDown = (e) => {
    if (e.code === 'Space') e.preventDefault()
    const isArrow = ARROW_CODES.includes(e.code)
    if (isArrow) e.preventDefault() // 方向鍵預設會捲動頁面，這裡改由我們自己處理
    // 第三人稱只在電腦版開放：方向鍵切進第三人稱、Esc 離開
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

    // 第三人稱現在完全由滑鼠拖曳/滾輪即時驅動，這裡不用逐幀處理
    if (cameraMode.value === 'third') return

    const hasTouchInput = touchMove.x !== 0 || touchMove.z !== 0
    if (pressedKeys.size === 0 && !hasTouchInput) return

    tmpForward.copy(cameraEntity.forward); tmpForward.y = 0
    if (tmpForward.lengthSq() > 1e-6) tmpForward.normalize()
    tmpRight.copy(cameraEntity.right); tmpRight.y = 0
    if (tmpRight.lengthSq() > 1e-6) tmpRight.normalize()

    let speed = orbitState.moveScale * 1.2 * moveSpeed.value
    if (pressedKeys.has('ControlLeft') || pressedKeys.has('ControlRight')) speed *= 2.5

    tmpMove.set(0, 0, 0)
    if (pressedKeys.has('KeyW')) tmpMove.add(tmpForward)
    if (pressedKeys.has('KeyS')) tmpMove.sub(tmpForward)
    if (pressedKeys.has('KeyD')) tmpMove.add(tmpRight)
    if (pressedKeys.has('KeyA')) tmpMove.sub(tmpRight)
    if (pressedKeys.has('Space')) tmpMove.add(worldUp)
    if (pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight')) tmpMove.sub(worldUp)
    if (hasTouchInput) {
      tmpMove.add(tmpForward.clone().mulScalar(touchMove.z))
      tmpMove.add(tmpRight.clone().mulScalar(touchMove.x))
    }

    const len = tmpMove.length()
    if (len > 1e-6) {
      if (len > 1) tmpMove.mulScalar(1 / len)
      tmpMove.mulScalar(speed * dt)
      orbitState.position.add(tmpMove)
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

const disposeViewer = () => {
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
}

const initViewer = async () => {
  await loadPlayCanvas()
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas || !model.value) return

  disposeViewer()

  // 頁面剛載入時瀏覽器焦點可能不在畫面上，某些瀏覽器下這會讓方向鍵一開始不會生效，
  // 要點一下畫面「奪回」焦點才會動。這裡主動把焦點轉到 canvas 本身，方向鍵/WASD 一開場就能立刻用
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  canvas.focus()

  // 依 tile 數量先抓一個起始畫質（正式的動態升降階交給 attachPerformanceMonitor）：
  // 場景如果被切成很多塊（多個 entryFiles，代表整體 splat 量很可能很大），先從「中」開始，
  // 避免一開場就用最高畫質硬扛
  const m0 = model.value
  const tileCount = (m0.entryFiles && m0.entryFiles.length) ? m0.entryFiles.length : (m0.entryFile ? 1 : 0)
  qualityTier = isTouchDevice.value ? 1 : (tileCount > 3 ? 1 : 2)
  const initialPreset = QUALITY_PRESETS[qualityTier]

  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    // 只有起始畫質是「高」才開 MSAA——splat 渲染本來就是 overdraw/fill-rate 密集
    graphicsDeviceOptions: { antialias: qualityTier === 2 }
  })
  pcApp = app
  app.setCanvasFillMode(pc.FILLMODE_NONE)
  app.setCanvasResolution(pc.RESOLUTION_AUTO)
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

  const m = model.value

  // 讀取這顆模型存的移動速度倍率（沒存過、或存壞了就退回 1 倍，不調整）
  const savedSpeed = Number(m.moveSpeed)
  moveSpeed.value = (m.moveSpeed && Number.isFinite(savedSpeed) && savedSpeed > 0) ? savedSpeed : 1

  if (m.cameraPosition && m.cameraTarget) {
    const [px, py, pz] = m.cameraPosition.split(',').map(Number)
    const [tx, ty, tz] = m.cameraTarget.split(',').map(Number)
    const position = new pc.Vec3(px, py, pz)
    const target = new pc.Vec3(tx, ty, tz)
    const dir = target.clone().sub(position)
    const yaw = Math.atan2(dir.x, dir.z)
    const pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z))
    let moveScale = position.distance(target) || 5
    if (m.bound) {
      const [minx, miny, minz, maxx, maxy, maxz] = m.bound.split(',').map(Number)
      const size = [maxx - minx, maxy - miny, maxz - minz]
      moveScale = Math.sqrt(size[0] ** 2 + size[1] ** 2 + size[2] ** 2) / 2 || moveScale
    }
    orbitState = { position, yaw, pitch, moveScale }
    updateCameraFromOrbit()
  } else if (m.bound) {
    const [minx, miny, minz, maxx, maxy, maxz] = m.bound.split(',').map(Number)
    orbitState = computeOrbitFromBound({ minx, miny, minz, maxx, maxy, maxz })
    updateCameraFromOrbit()
  } else {
    orbitState = { position: new pc.Vec3(0, 1, -3), yaw: 0, pitch: -0.15, moveScale: 5 }
    updateCameraFromOrbit()
  }

  detachOrbitControls = attachOrbitControls(canvas)
  detachKeyboardControls = attachKeyboardControls(app)

  // 場景可能被重建工具切成多個 MipTile（每個各自是一棵完整獨立的 LOD tree，
  // 只描述場景的一部分），entryFiles 是清單，每一份都要各自建一個 gsplat Entity，
  // 全部疊在同一個「根」Entity 底下，才會拼成完整場景。
  // 水平校正套用在這個根 Entity 上，不管有幾塊 tile 都只轉一次。
  gsplatEntity = new pc.Entity('gsplat-root')
  const [tx, ty, tz] = (m.tiltOffset ? m.tiltOffset.split(',').map(Number) : [0, 0, 0])
  gsplatEntity.setLocalEulerAngles(
    ZUP_TO_YUP_EULER[0] + (Number.isFinite(tx) ? tx : 0),
    ZUP_TO_YUP_EULER[1] + (Number.isFinite(ty) ? ty : 0),
    ZUP_TO_YUP_EULER[2] + (Number.isFinite(tz) ? tz : 0)
  )
  app.root.addChild(gsplatEntity)

  // 向下相容：舊資料如果 API 還沒更新、只給了單一 entryFile 字串，包成單筆清單繼續用
  const entryFiles = (m.entryFiles && m.entryFiles.length)
    ? m.entryFiles
    : (m.entryFile ? [m.entryFile] : [])

  if (entryFiles.length === 0) {
    loadError.value = '這顆模型沒有可用的進入點檔案'
    isLoading.value = false
    app.start()
    return
  }

  let loadedTiles = 0
  let erroredTiles = 0
  entryFiles.forEach((entryPath, idx) => {
    const contentUrl = absoluteFileUrl(`/holy/gaussian/file/${m.id}/${entryPath}`)
    const asset = new pc.Asset(`${m.name || 'gsplat'}-tile-${idx}`, 'gsplat', { url: contentUrl })
    app.assets.add(asset)
    asset.once('load', () => {
      const tileEntity = new pc.Entity(`gsplat-tile-${idx}`)
      tileEntity.addComponent('gsplat', { asset })
      if (tileEntity.gsplat) {
        // 套用目前的起始畫質階（手機／多 tile 場景預設會跳過最細緻那一階 LOD）
        tileEntity.gsplat.lodRangeMin = QUALITY_PRESETS[qualityTier].lodRangeMin
      }
      gsplatEntity.addChild(tileEntity)
      tileEntities.push(tileEntity) // 記下來，之後動態調整畫質時才能一次改全部 tile
      loadedTiles++
      if (loadedTiles + erroredTiles === entryFiles.length) isLoading.value = false
    })
    asset.once('error', (err) => {
      erroredTiles++
      console.error(`第 ${idx + 1}/${entryFiles.length} 塊模型載入失敗：`, err)
      if (loadedTiles === 0 && erroredTiles === entryFiles.length) {
        loadError.value = `模型載入失敗：${err}`
      }
      if (loadedTiles + erroredTiles === entryFiles.length) isLoading.value = false
    })
    app.assets.load(asset)
  })

  detachPerformanceMonitor = attachPerformanceMonitor(app)
  app.start()
}

// ── 手機虛擬搖桿＋上下按鈕 ──────────────────────────
const joystickKnobStyle = reactive({ x: 0, y: 0 })
const JOYSTICK_RADIUS = 40

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
  touchMove.x = dx / JOYSTICK_RADIUS
  touchMove.z = -dy / JOYSTICK_RADIUS
}
const onJoystickPointerUp = (e) => {
  if (e.pointerId !== joystickPointerId) return
  joystickPointerId = null
  joystickKnobStyle.x = 0; joystickKnobStyle.y = 0
  touchMove.x = 0; touchMove.z = 0
}
const onVertButtonDown = (code) => pressedKeys.add(code)
const onVertButtonUp = (code) => pressedKeys.delete(code)

const fetchModel = async () => {
  try {
    const res = await fetch(`${BASE}/get/${modelId}`)
    const data = await res.json()
    if (!data) { loadError.value = '找不到這個模型，連結可能已失效'; isLoading.value = false; return }
    model.value = data
    await initViewer()
  } catch {
    loadError.value = '載入失敗，請檢查網路連線'
    isLoading.value = false
  }
}

onMounted(fetchModel)
onUnmounted(disposeViewer)
</script>

<template>
  <ClientOnly>
    <div class="fixed inset-0 bg-black flex flex-col">
      <div class="px-4 py-3 bg-black/80 text-white">
        <span class="text-sm font-medium">{{ model?.name || '高斯潑灑模型' }}</span>
      </div>

      <div class="flex-1 relative">
        <div
          v-if="isLoading"
          class="absolute inset-0 flex items-center justify-center text-white/60 text-sm"
        >
          載入中…
        </div>
        <div
          v-else-if="loadError"
          class="absolute inset-0 flex items-center justify-center text-white/60 text-sm px-6 text-center"
        >
          {{ loadError }}
        </div>

        <canvas
          ref="canvasRef"
          tabindex="-1"
          class="absolute inset-0 w-full h-full touch-none outline-none"
        />

        <p
          v-if="!isLoading && !loadError && !isTouchDevice && cameraMode === 'first' && !pointerLockActive"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none"
        >
          點一下畫面啟用滑鼠轉頭．WASD 走位．空白鍵上升．Shift 下降．Ctrl 加速．右鍵平移．滾輪前後．方向鍵：切換第三人稱
        </p>
        <p
          v-else-if="!isLoading && !loadError && !isTouchDevice && cameraMode === 'first'"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none"
        >
          滑鼠移動轉頭．WASD 走位．空白鍵上升．Shift 下降．Ctrl 加速．右鍵平移．滾輪前後．方向鍵：切換第三人稱
        </p>
        <p
          v-else-if="!isLoading && !loadError && !isTouchDevice"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none"
        >
          左鍵拖曳：環繞旋轉．右鍵拖曳：平移中心．滾輪：拉近拉遠．Esc：離開第三人稱
        </p>

        <template v-if="!isLoading && !loadError && isTouchDevice">
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
      </div>

      <transition name="fade">
        <div
          v-if="toast.show"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-white/90 text-black text-sm px-4 py-3 rounded-xl shadow-lg z-50"
        >
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </ClientOnly>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
