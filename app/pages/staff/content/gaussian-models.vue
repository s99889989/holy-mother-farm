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

definePageMeta({ layout: 'staff', requiredPermission: 'holymotherfarm.gaussian-models' })

const commonStore = useCommonStore()
const BASE = commonStore.data.main_url + '/holy/gaussian'
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
    // 左鍵拖曳＝轉頭看，右鍵拖曳＝平移（pan），慣例跟大部分 3D 軟體一致
    mode = e.button === 2 ? 'pan' : 'look'
    activePointerId = e.pointerId
    lastX = e.clientX
    lastY = e.clientY
  }

  const onPointerMove = (e) => {
    if (!orbitState || !cameraEntity) return

    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (mode === 'pinch' && touches.size === 2) {
        const pts = [...touches.values()]
        const newDist = dist(pts[0], pts[1])
        const newMid = mid(pts[0], pts[1])

        // 雙指開合＝往前/往後移動（縮放的手機版）
        if (pinchStartDist > 1) {
          const dollySpeed = orbitState.moveScale * 0.6
          orbitState.position.add(cameraEntity.forward.clone().mulScalar((newDist - pinchStartDist) / pinchStartDist * dollySpeed))
          pinchStartDist = newDist
        }
        // 雙指一起拖＝平移
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
      // 不是我們自己在追蹤的那根手指/滑鼠（例如螢幕搖桿的手指），完全不理會，避免互相干擾
      return
    }

    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY

    if (mode === 'look') {
      // 只改朝向（yaw/pitch），相機位置完全不動——原地轉頭，不是繞著哪個點公轉
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
    if (!orbitState || !cameraEntity) return
    e.preventDefault()
    // 滾輪＝沿著目前面向的方向前後移動（第一人稱相機沒有「距離目標」這種東西可以縮放）
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
const attachKeyboardControls = (app) => {
  pressedKeys = new Set() // 換成共用集合，螢幕虛擬按鈕（手機用）也會操作同一個
  const onKeyDown = (e) => {
    if (e.code === 'Space') e.preventDefault() // 不然空白鍵會讓瀏覽器頁面往下捲
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

    // 前後左右用相機目前面向的水平分量（忽略上下俯仰），不然抬頭看時 W 會往天花板飛
    tmpForward.copy(cameraEntity.forward); tmpForward.y = 0
    if (tmpForward.lengthSq() > 1e-6) tmpForward.normalize()
    tmpRight.copy(cameraEntity.right); tmpRight.y = 0
    if (tmpRight.lengthSq() > 1e-6) tmpRight.normalize()

    let speed = orbitState.moveScale * 1.2 // 走位速度跟模型大小成正比，模型越大走越快，不用每次都手動調
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
      orbitState.position.add(tmpMove) // 直接移動相機位置（第一人稱走位，不是移動一個公轉目標點）
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
  // 每一步都各自包 try/catch：就算引擎內部因為壞掉的 transform 矩陣噴例外，
  // 也不能讓它擋住後面的清理步驟，不然視窗會關不掉、殘留的監聽器也清不掉
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

const initViewer = async (model) => {
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas) return

  disposeViewer()

  // 讀取這顆模型之前存的水平校正微調值（沒存過就是 0,0,0，只用基礎的 -90 度校正）
  const [tx0, ty0, tz0] = (model.tiltOffset ? model.tiltOffset.split(',').map(Number) : [0, 0, 0])
  tiltForm.x = tx0; tiltForm.y = ty0; tiltForm.z = tz0

  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    graphicsDeviceOptions: { antialias: true }
  })
  pcApp = app
  app.setCanvasFillMode(pc.FILLMODE_NONE)
  app.setCanvasResolution(pc.RESOLUTION_AUTO)
  // 沒設這個的話，高解析度螢幕（Retina/2x 以上）會用 CSS 像素尺寸渲染再放大貼上去，
  // 畫面就會糊——之前用官方 viewer 包時這個是內建處理好的，自己接引擎要手動補上
  // 手機 GPU 弱很多，解析度上限降低一點換效能，不然容易頓/發燙
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

  const contentUrl = absoluteFileUrl(`/holy/gaussian/file/${model.id}/${model.entryFile}`)
  const asset = new pc.Asset(model.name || 'gsplat', 'gsplat', { url: contentUrl })
  app.assets.add(asset)
  asset.once('load', () => {
    gsplatEntity = new pc.Entity('gsplat')
    gsplatEntity.addComponent('gsplat', { asset })
    if (isTouchDevice.value && gsplatEntity.gsplat) {
      // 手機跳過最細緻那一階 LOD，犧牲一點細節換效能，不然大場景在手機上容易卡
      gsplatEntity.gsplat.lodRangeMin = 1
    }
    app.root.addChild(gsplatEntity)
    applyEntityTilt() // 用目前 tiltForm（已經在下面載入這顆模型存的值）套用旋轉
  })
  asset.once('error', (err) => showToast(`模型載入失敗：${err}`))
  app.assets.load(asset)

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
  const model = models.value.find(m => m.id === viewerModal.id)
  if (!model?.bound) { showToast('這顆模型沒有 bound 資料，無法自動計算'); return }
  const [minx, miny, minz, maxx, maxy, maxz] = model.bound.split(',').map(Number)
  orbitState = computeOrbitFromBound({ minx, miny, minz, maxx, maxy, maxz })
  updateCameraFromOrbit()
}

const saveCameraAsDefault = async () => {
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
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 7l8-4 8 4M4 7v10l8 4m-8-14l8 4m0 10l8-4V7m-8 14V11m8-4l-8 4"
            /></svg>
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span class="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity">點擊瀏覽</span>
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
        <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
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
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              /></svg>
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
            <div class="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
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
              @click="tiltPanelOpen = !tiltPanelOpen"
            >
              {{ tiltPanelOpen ? '收起水平校正' : '校正水平' }}
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
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              /></svg>
            </button>
          </div>
        </div>

        <div class="flex-1 relative">
          <canvas
            ref="canvasRef"
            class="absolute inset-0 w-full h-full touch-none"
          />
          <p
            v-if="!isTouchDevice"
            class="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none"
          >
            WASD 走位．空白鍵上升．Shift 下降．Ctrl 加速．左鍵轉頭．右鍵平移．滾輪前後
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
