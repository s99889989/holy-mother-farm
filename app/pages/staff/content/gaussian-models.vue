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

// ── 檢視器（直接用 playcanvas 引擎本體，不透過 supersplat-viewer）──────
const viewerModal = reactive({ show: false, name: '', id: '' })
const canvasRef = ref(null)
let pcApp = null
let gsplatEntity = null
let cameraEntity = null
let orbitState = null // { target: Vec3, yaw, pitch, distance }
let resizeObserverRef = null

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
  const { target, yaw, pitch, distance } = orbitState
  const cp = Math.cos(pitch)
  const pos = new pc.Vec3(
    target.x + distance * cp * Math.sin(yaw),
    target.y + distance * Math.sin(pitch),
    target.z + distance * cp * Math.cos(yaw)
  )
  cameraEntity.setPosition(pos)
  cameraEntity.lookAt(target)
}

const attachOrbitControls = (canvas) => {
  let mode = null // 'orbit' | 'pan' | null
  let lastX = 0
  let lastY = 0

  const onPointerDown = (e) => {
    // 左鍵拖曳＝旋轉，右鍵拖曳＝平移（pan），慣例跟大部分 3D 軟體一致
    mode = e.button === 2 ? 'pan' : 'orbit'
    lastX = e.clientX
    lastY = e.clientY
  }
  const onPointerMove = (e) => {
    if (!mode || !orbitState || !cameraEntity) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY

    if (mode === 'orbit') {
      orbitState.yaw -= dx * 0.005
      orbitState.pitch = Math.max(-1.5, Math.min(1.5, orbitState.pitch - dy * 0.005))
    } else {
      // 平移幅度跟目前拉開的距離成正比，不然拉遠之後拖起來會感覺完全不動、拉近又太快
      const panSpeed = orbitState.distance * 0.0015
      const right = cameraEntity.right
      const up = cameraEntity.up
      orbitState.target.sub(right.clone().mulScalar(-dx * panSpeed))
      orbitState.target.sub(up.clone().mulScalar(dy * panSpeed))
    }
    updateCameraFromOrbit()
  }
  const onPointerUp = () => { mode = null }
  const onContextMenu = (e) => e.preventDefault() // 右鍵拿來平移，不要跳出瀏覽器右鍵選單
  const onWheel = (e) => {
    if (!orbitState) return
    e.preventDefault()
    orbitState.distance = Math.max(0.5, orbitState.distance * (1 + e.deltaY * 0.001))
    updateCameraFromOrbit()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('contextmenu', onContextMenu)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
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
  const radius = Math.sqrt(size[0] ** 2 + size[1] ** 2 + size[2] ** 2) / 2
  const [wx, wy, wz] = applyZupToYup(...centerLocal) // 轉正後的世界座標中心點
  return {
    target: new pc.Vec3(wx, wy, wz),
    yaw: Math.PI * 0.75,
    pitch: 0.5,
    distance: radius * 1.6 || 5
  }
}

// 鍵盤走位（照 MipMap 同一套按鍵）：WASD 前後左右、QE 上下、Ctrl 減速、Shift 加速。
// 用 app.on('update', dt) 每一幀持續移動，才會有「按著不放持續走」的效果，不是按一下動一下
const attachKeyboardControls = (app) => {
  const pressed = new Set()
  const onKeyDown = (e) => {
    if (e.code === 'Space') e.preventDefault() // 不然空白鍵會讓瀏覽器頁面往下捲
    pressed.add(e.code)
  }
  const onKeyUp = (e) => pressed.delete(e.code)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  const tmpForward = new pc.Vec3()
  const tmpRight = new pc.Vec3()
  const tmpMove = new pc.Vec3()
  const worldUp = new pc.Vec3(0, 1, 0)

  const onUpdate = (dt) => {
    if (!orbitState || !cameraEntity || pressed.size === 0) return

    // 前後左右用相機目前面向的水平分量（忽略上下俯仰），不然抬頭看時 W 會往天花板飛
    tmpForward.copy(cameraEntity.forward); tmpForward.y = 0
    if (tmpForward.lengthSq() > 1e-6) tmpForward.normalize()
    tmpRight.copy(cameraEntity.right); tmpRight.y = 0
    if (tmpRight.lengthSq() > 1e-6) tmpRight.normalize()

    let speed = orbitState.distance * 1.2 // 走位速度跟模型大小成正比，模型越大走越快，不用每次都手動調
    if (pressed.has('ControlLeft') || pressed.has('ControlRight')) speed *= 2.5

    tmpMove.set(0, 0, 0)
    if (pressed.has('KeyW')) tmpMove.add(tmpForward)
    if (pressed.has('KeyS')) tmpMove.sub(tmpForward)
    if (pressed.has('KeyD')) tmpMove.add(tmpRight)
    if (pressed.has('KeyA')) tmpMove.sub(tmpRight)
    if (pressed.has('Space')) tmpMove.add(worldUp)
    if (pressed.has('ShiftLeft') || pressed.has('ShiftRight')) tmpMove.sub(worldUp)

    if (tmpMove.lengthSq() > 1e-6) {
      tmpMove.normalize().mulScalar(speed * dt)
      orbitState.target.add(tmpMove) // 移動目標點，相機會跟著一起走（保持原本的旋轉/距離）
      updateCameraFromOrbit()
    }
  }
  app.on('update', onUpdate)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    app.off('update', onUpdate)
    pressed.clear()
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
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2)

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
    const target = new pc.Vec3(tx, ty, tz)
    const distance = new pc.Vec3(px, py, pz).distance(target) || 5
    orbitState = { target, yaw: Math.PI * 0.75, pitch: 0.5, distance }
    cameraEntity.setPosition(px, py, pz)
    cameraEntity.lookAt(target)
  } else if (model.bound) {
    const [minx, miny, minz, maxx, maxy, maxz] = model.bound.split(',').map(Number)
    orbitState = computeOrbitFromBound({ minx, miny, minz, maxx, maxy, maxz })
    updateCameraFromOrbit()
  } else {
    orbitState = { target: new pc.Vec3(0, 0, 0), yaw: 0, pitch: 0.3, distance: 5 }
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
    const t = orbitState.target
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
          高斯潑灑模型（3D 導覽）
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
        <div class="flex items-center justify-between px-4 py-2 bg-black/80 text-white">
          <span class="text-sm font-medium">{{ viewerModal.name }}</span>
          <div class="flex items-center gap-3">
            <button
              class="text-white/80 hover:text-white text-xs border border-white/30 rounded-lg px-2.5 py-1"
              @click="resetCameraToDefault"
            >
              重設視角
            </button>
            <button
              class="text-white/80 hover:text-white text-xs border border-white/30 rounded-lg px-2.5 py-1 disabled:opacity-50"
              :disabled="savingCamera"
              @click="saveCameraAsDefault"
            >
              {{ savingCamera ? '儲存中…' : '存成預設視角' }}
            </button>
            <button
              class="text-white/80 hover:text-white text-xs border border-white/30 rounded-lg px-2.5 py-1"
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
          <p class="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none">
            WASD 走位．空白鍵上升．Shift 下降．Ctrl 加速．左鍵旋轉．右鍵平移．滾輪縮放
          </p>

          <div
            v-if="tiltPanelOpen"
            class="absolute top-3 right-3 bg-black/85 text-white text-xs rounded-xl p-3 w-60 space-y-2 backdrop-blur"
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
