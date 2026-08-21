<template>
  <ClientOnly>
    <div class="preview-page">
      <div class="preview-topbar">
        <NuxtLink to="/staff/management/tour" class="back-link">← 返回管理</NuxtLink>
        <select v-model="currentSceneId" class="scene-select flex-1" @change="onSceneSelect(currentSceneId)">
          <optgroup v-for="grp in groupedScenes" :key="grp.category" :label="grp.category">
            <option v-for="s in grp.scenes" :key="s.id" :value="s.id">{{ s.name }}</option>
          </optgroup>
        </select>
      </div>

      <div
        v-if="quickPoints.length"
        class="quick-points"
      >
        <span class="quick-label">⭐ 快速前往：</span>
        <button
          v-for="q in quickPoints"
          :key="q.id"
          class="quick-btn"
          :class="{ active: q.id === currentSceneId }"
          @click="onSceneSelect(q.id)"
        >
          {{ q.name }}
        </button>
      </div>

      <div
        v-if="sceneGroupMembers.length > 1"
        class="group-switch"
      >
        <span class="group-label">同空間切換：</span>
        <button
          v-for="m in sceneGroupMembers"
          :key="m.id"
          class="group-btn"
          :class="{ active: m.id === currentSceneId }"
          @click="onSceneSelect(m.id)"
        >
          {{ m.name }}
        </button>
      </div>

      <div v-if="loadError" class="preview-error">載入失敗：{{ loadError }}</div>
      <div v-else-if="!currentScene" class="preview-empty">尚無場景資料</div>

      <div
        class="viewer-stage"
        ref="viewerStageEl"
        @pointerenter="onStagePointerEnter"
        @pointermove="onStagePointerMove"
        @pointerleave="onStagePointerLeave"
      >
        <div id="preview-viewer" class="preview-viewer"></div>

        <!-- 地板方向鍵：跟著滑鼠在畫面上移動，靠近熱點方向（角度差在
             HOTSPOT_HOVER_THRESHOLD_DEG 以內）時才會亮起、可以點擊，
             跟 Google 街景的互動邏輯一致。這個元素本身不接收滑鼠事件
             （pointer-events: none），實際點擊判斷是 PSV 自己的 click
             事件（see initOrSwitchViewer），這裡純粹是視覺回饋。原生滑鼠
             游標在 .preview-viewer 上被隱藏了（見下方 CSS 的 cursor: none），
             不然畫面上會同時看到系統游標跟這個地板箭頭，變兩個游標很奇怪。 -->
        <div
          v-if="currentScene && isHovering"
          class="floor-cursor"
          :class="{ 'floor-cursor--active': !!hoverHotspot }"
          :style="{ left: cursorPos.x + 'px', top: cursorPos.y + 'px', '--cursor-scale': cursorScale }"
        >
          <svg viewBox="0 0 40 40" width="80" height="80">
            <ellipse cx="20" cy="20" rx="17" :ry="cursorEllipseRy" class="floor-cursor-ring" />
            <path d="M20 10 L28 24 L20 20 L12 24 Z" class="floor-cursor-arrow" />
          </svg>
          <span v-if="hoverHotspot" class="floor-cursor-label">{{ hoverHotspot.label }}</span>
        </div>

        <!-- 置中短暫提示：點到沒有場景的方向時跳出來，顯示一下自動消失。
             跟上面的地板箭頭是分開的兩件事，不常駐在箭頭旁邊。 -->
        <Transition name="center-toast-fade">
          <div v-if="centerToast" class="center-toast">{{ centerToast }}</div>
        </Transition>

        <!-- 街景風格小地圖：不再依賴任何上傳的地圖/平面圖，純粹依場景之間已設置好的
             熱點連結關係，用力導向佈局自動算出示意連接圖，涵蓋全部場景。快速點會用
             金色星形標示，方便一眼找到重點位置（例如某棟建築門口）。 -->
        <div
          v-if="showMinimap"
          class="minimap"
          :class="{ 'minimap--expanded': minimapExpanded }"
          @click="minimapExpanded = !minimapExpanded"
          :title="minimapExpanded ? '點擊縮小地圖' : '點擊放大地圖'"
        >
          <svg class="minimap-graph" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              v-for="(e, i) in hotspotEdges"
              :key="i"
              :x1="graphLayout.get(e.sceneId)?.x"
              :y1="graphLayout.get(e.sceneId)?.y"
              :x2="graphLayout.get(e.targetSceneId)?.x"
              :y2="graphLayout.get(e.targetSceneId)?.y"
              class="graph-edge"
            />
          </svg>
          <span
            v-for="s in scenes"
            :key="s.id"
            class="minimap-dot"
            :class="{ 'minimap-dot--current': s.id === currentSceneId, 'minimap-dot--quick': s.quickPoint }"
            :style="{ left: (graphLayout.get(s.id)?.x ?? 50) + '%', top: (graphLayout.get(s.id)?.y ?? 50) + '%' }"
            :title="s.name"
            @click.stop="onSceneSelect(s.id)"
          >{{ s.quickPoint ? '★' : '' }}</span>

          <span class="minimap-toggle">{{ minimapExpanded ? '⤡' : '⤢' }}</span>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

  definePageMeta({
    layout: 'staff',
    requiredPermission: 'management.tour'
  })

  const commonStore = useCommonStore()
  const apiBase = computed(() => commonStore.data.main_url + '/holy/tour')

  const scenes = ref([])
  const hotspots = ref([])
  const currentSceneId = ref(null)
  const loadError = ref(null)

  const minimapExpanded = ref(false)

  // 點熱點箭頭切換時記下 direction，純粹當「這次切換是不是從熱點點擊過來」的
  // 旗標，用來決定要不要在 setPanorama 時明確帶著切換前的視角（見
  // initOrSwitchViewer）；不會拿裡面的 yaw/pitch 去重新定位視角——視角維持
  // 使用者原本看的方向不變。從下拉選單/快速點/同空間切換等入口進來時是
  // null，一樣走淡入淡出，只是不用特別去抓當下視角。
  const pendingDirection = ref(null)

  let viewer = null

  // 地板箭頭跟著滑鼠移動所需的狀態：cursorPos 是箭頭在 .viewer-stage 內的
  // CSS 座標（滑鼠在哪它就在哪），hoverHotspot 是目前滑鼠方向有沒有落在某個
  // 熱點附近（在 HOTSPOT_HOVER_THRESHOLD_DEG 角度內），有的話箭頭會亮起、
  // 可以點擊；viewerStageEl 是 .viewer-stage 的 DOM 參照，換算滑鼠座標跟
  // 定位箭頭都要用它的 boundingClientRect。
  const cursorPos = ref({ x: 0, y: 0 })
  const cursorScale = ref(1)
  const cursorEllipseRy = ref(9)
  const hoverHotspot = ref(null)
  const isHovering = ref(false)
  const viewerStageEl = ref(null)

  // 畫面中間的短暫提示（例如點到沒有場景的方向），跟地板箭頭是分開的兩件事：
  // 箭頭只負責「靠近熱點時亮起」的視覺回饋，點下去沒有對應場景時才跳這個
  // 置中訊息，顯示一下自動消失，不用使用者手動關掉。
  const centerToast = ref('')
  let centerToastTimer = null
  function showCenterToast(message) {
    centerToast.value = message
    if (centerToastTimer) clearTimeout(centerToastTimer)
    centerToastTimer = setTimeout(() => {
      centerToast.value = ''
      centerToastTimer = null
    }, 1400)
  }

  const currentScene = computed(() => scenes.value.find((s) => s.id === currentSceneId.value))
  const sceneGroupMembers = computed(() => {
    if (!currentScene.value?.groupId) return []
    return scenes.value.filter((s) => s.groupId === currentScene.value.groupId)
  })

  const groupedScenes = computed(() => {
    const map = new Map()
    for (const s of scenes.value) {
      const cat = s.category || '未分類'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(s)
    }
    return Array.from(map.entries()).map(([category, list]) => ({ category, scenes: list }))
  })

  // 快速點：後台標記過的重點場景，不管目前在哪個場景都能一鍵跳過去
  const quickPoints = computed(() => scenes.value.filter((s) => s.quickPoint))

  // ---- 小地圖：完全依熱點連結自動排版，不需要任何上傳的地圖圖片 ----
  const hotspotEdges = computed(() => {
    const idSet = new Set(scenes.value.map((s) => s.id))
    return hotspots.value.filter((h) => idSet.has(h.sceneId) && idSet.has(h.targetSceneId))
  })
  const showMinimap = computed(() => scenes.value.length > 1 && hotspotEdges.value.length > 0)

  // 小地圖排版：舊版是純拓樸力導向（只看「哪些場景互相連結」，完全不管熱點記錄的實際
  // 朝向），排斥力＋彈簧力＋置中引力這組力學系統對一條「一直線串下去」的路徑並沒有讓它
  // 保持直線的理由——排斥力會把兩端推開、置中引力又把中間節點往中心拉，均衡下來鏈狀路徑
  // 自然會拗成弧形，這就是走廊在小地圖上不直的根本原因。
  // 現在改成：先用每個熱點記錄的 yaw（在該場景要往哪個方向看才會走到下一個場景）做
  // dead-reckoning，沿著實際拍攝方向一路往前擺點，直線走廊自然就會排成直線；接著只跑
  // 溫和的排斥力（避免節點疊在一起）＋方向修正力（把邊的角度拉回熱點原本的 yaw，
  // 而不是像舊版那樣用純距離彈簧、會讓角度資訊在鬆弛過程中流失），不再加置中引力。
  let cachedGraphLayout = null
  const graphLayout = computed(() => {
    if (!showMinimap.value) return new Map()
    if (cachedGraphLayout) return cachedGraphLayout
    cachedGraphLayout = computeGraphLayout(scenes.value, hotspotEdges.value)
    return cachedGraphLayout
  })

  // PSV 熱點 yaw：0deg 為場景「正前方」，順時針增加。這裡對應成小地圖上的 2D 方向，
  // 0deg = 螢幕正上方（往前走）、順時針轉，符合一般人看地圖時「往前=往上」的直覺。
  function yawToUnit(yawDeg) {
    const rad = ((yawDeg || 0) * Math.PI) / 180
    return { ux: Math.sin(rad), uy: -Math.cos(rad) }
  }

  function computeGraphLayout(sceneList, edgeList) {
    const n = sceneList.length
    if (n === 0) return new Map()

    const indexOf = new Map(sceneList.map((s, i) => [s.id, i]))
    const SPRING_LEN = 26

    // 依熱點方向建立鄰接關係，供 dead-reckoning 初始定位與後續方向修正力共用
    const adj = Array.from({ length: n }, () => [])
    const edges = []
    for (const h of edgeList) {
      const a = indexOf.get(h.sceneId)
      const b = indexOf.get(h.targetSceneId)
      if (a == null || b == null || a === b) continue
      adj[a].push({ to: b, yaw: h.yaw })
      edges.push({ a, b, yaw: h.yaw })
    }

    // 第一步：沿熱點方向做 dead-reckoning。用 BFS 從每個尚未定位的節點出發，
    // 每走一個熱點就往記錄的 yaw 方向延伸固定長度——這樣「一路往前走的走廊」
    // 會自動排成直線，不需要靠力學鬆弛去猜。
    const nodes = new Array(n)
    const placed = new Array(n).fill(false)
    for (let start = 0; start < n; start++) {
      if (placed[start]) continue
      nodes[start] = { x: 50, y: 50 }
      placed[start] = true
      const queue = [start]
      while (queue.length) {
        const cur = queue.shift()
        for (const { to, yaw } of adj[cur]) {
          if (placed[to]) continue
          const { ux, uy } = yawToUnit(yaw)
          nodes[to] = { x: nodes[cur].x + ux * SPRING_LEN, y: nodes[cur].y + uy * SPRING_LEN }
          placed[to] = true
          queue.push(to)
        }
      }
    }

    // 第二步：只做排斥力（避免節點重疊、分支互相靠太近）＋方向修正力
    // （把邊的實際角度拉回熱點記錄的 yaw，同時保留距離彈簧維持間距），
    // 不加置中引力——dead-reckoning 出來的座標本身就有意義，置中引力
    // 只會把直線走廊往中心拗回去，又製造出舊版的彎曲問題。
    const REPULSION = 90
    const DIST_K = 0.02
    const ANGLE_K = 0.05
    const ITERATIONS = 150

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const fx = new Array(n).fill(0)
      const fy = new Array(n).fill(0)

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = nodes[i].x - nodes[j].x
          let dy = nodes[i].y - nodes[j].y
          const distSq = Math.max(dx * dx + dy * dy, 0.05)
          const dist = Math.sqrt(distSq)
          const force = REPULSION / distSq
          const ux = dx / dist
          const uy = dy / dist
          fx[i] += ux * force
          fy[i] += uy * force
          fx[j] -= ux * force
          fy[j] -= uy * force
        }
      }

      for (const { a, b, yaw } of edges) {
        const dx = nodes[b].x - nodes[a].x
        const dy = nodes[b].y - nodes[a].y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.05)

        // 距離彈簧：維持節點間距，避免擠在一起或散太開
        const distForce = DIST_K * (dist - SPRING_LEN)
        const ux = dx / dist
        const uy = dy / dist
        fx[a] += ux * distForce
        fy[a] += uy * distForce
        fx[b] -= ux * distForce
        fy[b] -= uy * distForce

        // 方向修正力：把 b 相對 a 的實際角度拉回熱點記錄的 yaw 方向
        // （只修正垂直於目標方向的偏移量，不影響距離），讓直線走廊在
        // 鬆弛排斥力之後依然維持直線。
        const target = yawToUnit(yaw)
        const px = -target.uy
        const py = target.ux
        const perpOffset = dx * px + dy * py
        const angleForce = ANGLE_K * perpOffset
        fx[b] -= px * angleForce
        fy[b] -= py * angleForce
        fx[a] += px * angleForce
        fy[a] += py * angleForce
      }

      for (let i = 0; i < n; i++) {
        nodes[i].x += fx[i] * 0.02
        nodes[i].y += fy[i] * 0.02
      }
    }

    const xs = nodes.map((p) => p.x)
    const ys = nodes.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    // 用等比縮放（取 x/y 範圍較大者）而不是各自獨立縮放到 0-1 再貼齊正方形，
    // 避免長走廊被硬塞進正方形容器時角度被拉伸變形、跟熱點記錄的方向對不上。
    const scale = Math.max(maxX - minX, maxY - minY, 1)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    const result = new Map()
    sceneList.forEach((s, i) => {
      result.set(s.id, {
        x: +(50 + ((nodes[i].x - cx) / scale) * 76).toFixed(2),
        y: +(50 + ((nodes[i].y - cy) / scale) * 76).toFixed(2)
      })
    })
    return result
  }

  function hotspotsForScene(id) {
    return hotspots.value.filter((h) => h.sceneId === id)
  }

  function buildTileConfig(scene) {
    const base = `${apiBase.value}/image/${scene.id}`
    return {
      width: scene.width,
      cols: scene.cols,
      rows: scene.rows,
      baseUrl: `${base}/preview.jpg`,
      tileUrl: (col, row) => `${base}/tiles/${col}x${row}.jpg`
    }
  }

  // 地板方向鍵改版：跟 Google 街景一樣「箭頭跟著滑鼠在地板上移動，靠近熱點時
  // 才能點」，而不是每個熱點都畫一個固定貼花在場景裡（先前那版會有貼花本身
  // 太靠近腳邊、投影敏感造成畫面跳動的問題，這次直接不用 PSV 的 polygon
  // marker，改成一個普通的 CSS 定位游標圖層，跟著滑鼠座標走，穩定很多）。
  //
  // 判斷「滑鼠現在指向哪個方向」要把螢幕座標換算成全景球面上的 yaw/pitch，
  // 這裡用 PSV 內部但實際可呼叫的 dataHelper.viewerCoordsToVector3 +
  // vector3ToSphericalCoords（在 PSV 官方 GitHub 上有其他使用者這樣用來算
  // marker 位置，不是文件正式列出的公開 API，所以這裡都包 try/catch，換算失敗
  // 就讓游標退回「只是跟著滑鼠但不會亮起」的狀態，不會整頁掛掉）。
  const HOTSPOT_HOVER_THRESHOLD_DEG = 22 // 滑鼠方向跟熱點方向差在這個角度以內才算「靠近」

  function angleDiffDeg(a, b) {
    const d = Math.abs(a - b) % 360
    return d > 180 ? 360 - d : d
  }

  function screenToSpherical(clientX, clientY) {
    if (!viewer?.dataHelper || !viewerStageEl.value) return null
    try {
      const rect = viewerStageEl.value.getBoundingClientRect()
      const vec = viewer.dataHelper.viewerCoordsToVector3({ x: clientX - rect.left, y: clientY - rect.top })
      if (!vec) return null
      const { yaw, pitch } = viewer.dataHelper.vector3ToSphericalCoords(vec)
      return { yawDeg: (yaw * 180) / Math.PI, pitchDeg: (pitch * 180) / Math.PI }
    } catch (e) {
      return null
    }
  }

  function findNearestHotspot(yawDeg) {
    if (yawDeg == null) return null
    let best = null
    let bestDiff = Infinity
    for (const h of hotspotsForScene(currentSceneId.value)) {
      const diff = angleDiffDeg(h.yaw, yawDeg)
      if (diff < bestDiff) {
        bestDiff = diff
        best = h
      }
    }
    return best && bestDiff <= HOTSPOT_HOVER_THRESHOLD_DEG ? best : null
  }

  let moveRaf = null
  function onStagePointerEnter() {
    isHovering.value = true
  }

  // 箭頭大小：用滑鼠指向的全景球面俯角（pitch）判斷遠近，不是螢幕像素座標——
  // 螢幕位置會因為縮放倍率、視窗大小改變而跑掉，pitch 是全景圖本身的角度，
  // 不管怎麼縮放都代表同一個「往下看多少度」，才是真正對應這張圖的遠近關係。
  // 俯角越接近垂直向下（PITCH_NEAR_DEG，離腳邊最近）箭頭越大；越接近水平線
  // 甚至往上（PITCH_FAR_DEG）代表看得越遠，箭頭越小。
  const PITCH_NEAR_DEG = -80
  const PITCH_FAR_DEG = 5
  const CURSOR_SCALE_MIN = 0.5
  const CURSOR_SCALE_MAX = 2.1

  // 橢圓扁平程度：跟 Google 街景實測一樣，貼花本身是地上的正圓形，但因為是
  // 斜著看，看的角度越平（離水平線越近＝越遠）投影起來就越扁；正下方幾乎是
  // 垂直往下看，才會接近正圓。rx 固定 17，這裡只調 ry：離腳邊近時 ry 接近
  // rx（正圓），離水平線近時 ry 縮到很小（扁橢圓）。
  const ELLIPSE_RY_NEAR = 16 // 最近時的 ry（rx=17，接近正圓）
  const ELLIPSE_RY_FAR = 4 // 最遠時的 ry（扁橢圓）

  function pitchToT(pitchDeg) {
    return Math.min(Math.max((pitchDeg - PITCH_FAR_DEG) / (PITCH_NEAR_DEG - PITCH_FAR_DEG), 0), 1)
  }

  function onStagePointerMove(e) {
    if (moveRaf) return
    moveRaf = requestAnimationFrame(() => {
      moveRaf = null
      if (!viewerStageEl.value) return
      const rect = viewerStageEl.value.getBoundingClientRect()
      cursorPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }

      const sph = screenToSpherical(e.clientX, e.clientY)
      let t
      if (sph) {
        t = pitchToT(sph.pitchDeg)
        hoverHotspot.value = findNearestHotspot(sph.yawDeg)
      } else {
        // dataHelper 換算失敗時的保險：退回螢幕座標粗估，至少維持「往下比較大」
        // 的感覺，不會整個沒有縮放效果。
        t = Math.min(Math.max(cursorPos.value.y / rect.height, 0), 1)
        hoverHotspot.value = null
      }
      cursorScale.value = CURSOR_SCALE_MIN + t * (CURSOR_SCALE_MAX - CURSOR_SCALE_MIN)
      cursorEllipseRy.value = ELLIPSE_RY_FAR + t * (ELLIPSE_RY_NEAR - ELLIPSE_RY_FAR)
    })
  }

  function onStagePointerLeave() {
    isHovering.value = false
    hoverHotspot.value = null
  }



  async function loadData() {
    try {
      const data = await $fetch(`${apiBase.value}/data`)
      scenes.value = data.scenes || []
      hotspots.value = data.hotspots || []
      if (scenes.value.length) {
        currentSceneId.value = scenes.value[0].id
      }
    } catch (err) {
      loadError.value = err.message || String(err)
    }
  }

  async function initOrSwitchViewer(direction) {
    const scene = currentScene.value
    if (!scene) return

    const { Viewer } = await import('@photo-sphere-viewer/core')
    const { EquirectangularTilesAdapter } = await import(
      '@photo-sphere-viewer/equirectangular-tiles-adapter'
      )
    await import('@photo-sphere-viewer/core/index.css')

    if (!viewer) {
      await nextTick()
      viewer = new Viewer({
        container: document.getElementById('preview-viewer'),
        adapter: EquirectangularTilesAdapter,
        panorama: buildTileConfig(scene),
        defaultYaw: `${scene.initialYaw || 0}deg`,
        defaultPitch: `${scene.initialPitch || 0}deg`,
        navbar: ['zoom', 'move', 'fullscreen']
      })

      // 地板方向鍵改成跟著滑鼠走，不再用固定貼花，所以點擊判斷也不能用
      // MarkersPlugin 的 select-marker，改聽 PSV 自己的 click 事件——這個事件
      // 已經幫我們處理好「拖曳轉視角放開滑鼠」不會誤判成點擊的邏輯，直接複用
      // hover 那套「換算滑鼠方向 → 找最近的熱點」邏輯來判斷點到哪個熱點。
      viewer.addEventListener('click', ({ data }) => {
        if (!data || data.rightclick || data.yaw == null) return
        const yawDeg = (data.yaw * 180) / Math.PI
        const hit = findNearestHotspot(yawDeg)
        if (hit) {
          onSceneSelect(hit.targetSceneId, { yaw: hit.yaw, pitch: hit.pitch })
        } else {
          showCenterToast('此方向沒有場景')
        }
      })
    } else if (direction) {
      // 拿掉了「拉近再退回」的縮放脈衝——放大又縮小這個動作本身就會給人一種
      // 回彈的感覺，不是動畫曲線的問題，是這個機制本身就這樣。改成單純淡入
      // 淡出，縮放全程不變；視角一樣明確帶著切換前的當下方向傳進去，避免被
      // 套件當成沒給的欄位、目標值當 0 處理。
      const basePosition = viewer.getPosition() // { yaw, pitch }，弧度
      await viewer.setPanorama(buildTileConfig(scene), {
        position: basePosition,
        transition: { rotation: false, effect: 'fade', speed: 1000 },
        showLoader: true
      })
    } else {
      // 沒有明確方向的切換（下拉選單／快速點／同空間切換）：維持單純淡入淡出
      await viewer.setPanorama(buildTileConfig(scene), { transition: true, showLoader: true })
    }
    hoverHotspot.value = null
  }

  function onSceneSelect(id, direction = null) {
    pendingDirection.value = direction
    currentSceneId.value = id
  }

  watch(currentSceneId, async (id) => {
    if (id) {
      const direction = pendingDirection.value
      pendingDirection.value = null
      await initOrSwitchViewer(direction)
    }
  })

  onMounted(loadData)

  onBeforeUnmount(() => {
    if (moveRaf) {
      cancelAnimationFrame(moveRaf)
      moveRaf = null
    }
    if (centerToastTimer) {
      clearTimeout(centerToastTimer)
      centerToastTimer = null
    }
    if (viewer) {
      viewer.destroy()
      viewer = null
    }
  })
</script>

<style scoped>
  .preview-page {
    display: flex;
    flex-direction: column;
    /* 這頁是被 staff.vue layout 的 #staff-scroll-wrap（flex-1，已經是
       100vh − 導覽列高度）包住，這裡改用 height: 100% 填滿父層就好，
       不要再寫 100vh——不然會把導覽高度重複算一次，多出來的部分被推到
       畫面外，變成整頁多一層捲軸、viewer 下緣（含小地圖）被裁掉看不到。 */
    height: 100%;
    background: #10171a;
  }

  .preview-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: #1a2327;
    border-bottom: 1px solid #2a3438;
    flex-wrap: wrap;
  }

  .back-link {
    color: #9fb0ac;
    text-decoration: none;
    font-size: 13px;
    flex-shrink: 0;
  }

  .back-link:hover {
    color: #4fae8f;
  }

  .scene-select {
    background: #2a3438;
    color: #eef3f2;
    border: 1px solid #384442;
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 12.5px;
    min-width: 0;
    max-width: 100%;
  }

  .quick-points {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #1d1a12;
    border-bottom: 1px solid #3a331f;
    flex-wrap: wrap;
  }

  .quick-label {
    font-size: 11px;
    color: #c9a860;
  }

  .quick-btn {
    background: #33291a;
    color: #eef3f2;
    border: 1px solid #6b5730;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 12px;
    cursor: pointer;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .quick-btn:hover {
    background: #4a3c22;
  }

  .quick-btn.active {
    background: #f0b93d;
    color: #1d1a12;
    border-color: #f0b93d;
  }

  .group-switch {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #161f22;
    border-bottom: 1px solid #2a3438;
    flex-wrap: wrap;
  }

  .group-label {
    font-size: 11px;
    color: #6f8480;
  }

  .group-btn {
    background: #2a3438;
    color: #eef3f2;
    border: none;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 12px;
    cursor: pointer;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .group-btn.active {
    background: #4fae8f;
    color: #0c1412;
  }

  .viewer-stage {
    position: relative;
    flex: 1;
    width: 100%;
    min-height: 0;
  }

  .preview-viewer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    /* 藏掉原生滑鼠游標，改用下面的 .floor-cursor 地板箭頭當唯一的視覺游標，
       不然畫面上會同時看到系統游標（那個白色十字其實是 PSV 拖曳平移用的
       move/grab 游標）跟地板箭頭，變成兩個游標。PSV 是用 JS 直接把
       cursor 寫成 inline style 掛在畫布容器上，一般 class 蓋不掉 inline
       style，這裡要加 !important 才蓋得過去；PSV 的導覽列
       （zoom/move/fullscreen）是掛在同一個容器底下的子元素，也要另外把
       游標加回來，不然使用者會看不到游標飄到按鈕上。 */
    cursor: none !important;
  }

  .preview-viewer :deep(*) {
    cursor: none !important;
  }

  .preview-viewer :deep(.psv-navbar),
  .preview-viewer :deep(.psv-navbar *) {
    cursor: auto !important;
  }

  /* 地板方向鍵：固定用 CSS 定位跟著滑鼠座標走（不是貼在全景球面上），所以
     不會有先前 polygon marker 版本那種「太靠近腳邊、投影敏感造成畫面跳動」
     的問題。用 rotateX 做一個簡單的透視傾斜，讓它看起來像貼在地上，而不是
     垂直立在畫面上的圖示。預設是半透明的中性樣式（表示「這裡目前不能走」），
     滑鼠方向靠近某個熱點時（.floor-cursor--active）才會變亮、顯示地點名稱，
     這時候點下去才會真的觸發場景切換（判斷邏輯在 initOrSwitchViewer 的
     viewer click 事件，這裡的 pointer-events: none 只是純視覺回饋）。 */
  .floor-cursor {
    position: absolute;
    transform: translate(-50%, -50%) perspective(300px) rotateX(55deg) scale(var(--cursor-scale, 1));
    transform-origin: center;
    pointer-events: none;
    transition: filter 0.15s ease, transform 0.08s ease-out;
    z-index: 5;
  }

  .floor-cursor-ring {
    fill: rgba(16, 23, 26, 0.35);
    stroke: rgba(255, 255, 255, 0.55);
    stroke-width: 2;
    transition: fill 0.15s ease, stroke 0.15s ease, ry 0.08s ease-out;
  }

  .floor-cursor-arrow {
    fill: rgba(255, 255, 255, 0.55);
    transition: fill 0.15s ease;
  }

  .floor-cursor--active .floor-cursor-ring {
    fill: rgba(79, 174, 143, 0.45);
    stroke: #ffffff;
  }

  .floor-cursor--active .floor-cursor-arrow {
    fill: #ffffff;
  }

  .floor-cursor--active {
    filter: drop-shadow(0 2px 8px rgba(79, 174, 143, 0.6));
  }

  .floor-cursor-label {
    position: absolute;
    left: 50%;
    bottom: 100%;
    transform: translateX(-50%) rotateX(-55deg) translateY(-6px);
    white-space: nowrap;
    background: rgba(16, 23, 26, 0.85);
    color: #fff;
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 6px;
  }

  .center-toast {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(16, 23, 26, 0.8);
    color: #fff;
    font-size: 14px;
    padding: 8px 18px;
    border-radius: 999px;
    pointer-events: none;
    z-index: 6;
    white-space: nowrap;
  }

  .center-toast-fade-enter-active,
  .center-toast-fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .center-toast-fade-enter-from,
  .center-toast-fade-leave-to {
    opacity: 0;
  }


  .preview-error,
  .preview-empty {
    padding: 12px 16px;
    color: #9fb0ac;
    font-size: 13px;
  }

  /* ---------------- 街景風格小地圖（自動連接圖） ---------------- */
  .minimap {
    position: absolute;
    left: 16px;
    bottom: 16px;
    width: 150px;
    height: 150px;
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.85);
    background: #161f22;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    cursor: pointer;
    transition: width 0.2s ease, height 0.2s ease;
    z-index: 5;
  }

  .minimap--expanded {
    width: 320px;
    height: 320px;
  }

  .minimap-graph {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .graph-edge {
    stroke: rgba(159, 176, 172, 0.55);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .minimap-dot {
    position: absolute;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #d9dedc;
    border: 1.5px solid #10171a;
    transform: translate(-50%, -50%);
    cursor: pointer;
    z-index: 2;
  }

  .minimap-dot:hover {
    background: #ffffff;
  }

  .minimap-dot--current {
    width: 13px;
    height: 13px;
    background: #4fae8f;
    border: 2px solid #ffffff;
    box-shadow: 0 0 8px rgba(79, 174, 143, 0.8);
    z-index: 3;
  }

  .minimap-dot--quick {
    width: 15px;
    height: 15px;
    background: #f0b93d;
    border: 1.5px solid #1d1a12;
    color: #1d1a12;
    font-size: 9px;
    line-height: 14px;
    text-align: center;
    z-index: 3;
  }

  .minimap-dot--current.minimap-dot--quick {
    border: 2px solid #4fae8f;
    box-shadow: 0 0 8px rgba(79, 174, 143, 0.8);
    z-index: 4;
  }

  .minimap-toggle {
    position: absolute;
    right: 4px;
    bottom: 3px;
    font-size: 11px;
    color: #eef3f2;
    background: rgba(16, 23, 26, 0.55);
    border-radius: 4px;
    padding: 0 3px;
    line-height: 1.4;
    pointer-events: none;
  }

  /* ---------------- 手機版調整 ---------------- */
  @media (max-width: 640px) {
    .preview-topbar {
      flex-wrap: nowrap;
      padding: 8px 12px;
      gap: 8px;
    }

    .scene-select {
      font-size: 12px;
    }

    .quick-points,
    .group-switch {
      padding: 6px 12px;
      gap: 6px;
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .quick-points::-webkit-scrollbar,
    .group-switch::-webkit-scrollbar {
      display: none;
    }

    .minimap {
      width: 100px;
      height: 100px;
      left: 10px;
      bottom: 10px;
    }

    .minimap--expanded {
      width: 230px;
      height: 230px;
    }

    .minimap-dot--quick {
      width: 13px;
      height: 13px;
      font-size: 8px;
      line-height: 12px;
    }
  }
</style>
