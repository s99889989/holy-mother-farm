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
    mode = e.button === 2 ? 'pan' : 'look'
    activePointerId = e.pointerId
    lastX = e.clientX; lastY = e.clientY
  }

  const onPointerMove = (e) => {
    if (!orbitState || !cameraEntity) return

    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (mode === 'pinch' && touches.size === 2) {
        const pts = [...touches.values()]
        const newDist = dist(pts[0], pts[1])
        const newMid = mid(pts[0], pts[1])
        if (pinchStartDist > 1) {
          const dollySpeed = orbitState.moveScale * 0.6
          orbitState.position.add(cameraEntity.forward.clone().mulScalar((newDist - pinchStartDist) / pinchStartDist * dollySpeed))
          pinchStartDist = newDist
        }
        const panSpeed = orbitState.moveScale * 0.0025
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

    if (mode === 'look') {
      orbitState.yaw -= dx * 0.005
      orbitState.pitch = Math.max(-1.5, Math.min(1.5, orbitState.pitch - dy * 0.005))
    } else if (mode === 'pan') {
      const panSpeed = orbitState.moveScale * 0.0025
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
    if (!orbitState || !cameraEntity) return
    e.preventDefault()
    const dollySpeed = orbitState.moveScale * 0.15
    orbitState.position.add(cameraEntity.forward.clone().mulScalar(-e.deltaY * 0.001 * dollySpeed))
    updateCameraFromOrbit()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('contextmenu', onContextMenu)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('contextmenu', onContextMenu)
    canvas.removeEventListener('wheel', onWheel)
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

const attachKeyboardControls = (app) => {
  pressedKeys = new Set()
  const onKeyDown = (e) => {
    if (e.code === 'Space') e.preventDefault()
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
    const hasTouchInput = touchMove.x !== 0 || touchMove.z !== 0
    if (pressedKeys.size === 0 && !hasTouchInput) return

    tmpForward.copy(cameraEntity.forward); tmpForward.y = 0
    if (tmpForward.lengthSq() > 1e-6) tmpForward.normalize()
    tmpRight.copy(cameraEntity.right); tmpRight.y = 0
    if (tmpRight.lengthSq() > 1e-6) tmpRight.normalize()

    let speed = orbitState.moveScale * 1.2
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
}

const initViewer = async () => {
  await loadPlayCanvas()
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas || !model.value) return

  disposeViewer()

  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    graphicsDeviceOptions: { antialias: true }
  })
  pcApp = app
  app.setCanvasFillMode(pc.FILLMODE_NONE)
  app.setCanvasResolution(pc.RESOLUTION_AUTO)
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, isTouchDevice.value ? 1.5 : 2)

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

  const contentUrl = absoluteFileUrl(`/holy/gaussian/file/${m.id}/${m.entryFile}`)
  const asset = new pc.Asset(m.name || 'gsplat', 'gsplat', { url: contentUrl })
  app.assets.add(asset)
  asset.once('load', () => {
    gsplatEntity = new pc.Entity('gsplat')
    gsplatEntity.addComponent('gsplat', { asset })
    const [tx, ty, tz] = (m.tiltOffset ? m.tiltOffset.split(',').map(Number) : [0, 0, 0])
    gsplatEntity.setLocalEulerAngles(
      ZUP_TO_YUP_EULER[0] + (Number.isFinite(tx) ? tx : 0),
      ZUP_TO_YUP_EULER[1] + (Number.isFinite(ty) ? ty : 0),
      ZUP_TO_YUP_EULER[2] + (Number.isFinite(tz) ? tz : 0)
    )
    app.root.addChild(gsplatEntity)
    isLoading.value = false
  })
  asset.once('error', (err) => {
    loadError.value = `模型載入失敗：${err}`
    isLoading.value = false
  })
  app.assets.load(asset)

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
          class="absolute inset-0 w-full h-full touch-none"
        />

        <p
          v-if="!isLoading && !loadError && !isTouchDevice"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none"
        >
          WASD 走位．空白鍵上升．Shift 下降．Ctrl 加速．左鍵轉頭．右鍵平移．滾輪前後
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
    </div>
  </ClientOnly>
</template>
