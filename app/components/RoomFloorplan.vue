<script setup>
/**
 * 房間平面圖元件（可共用給「房間管理」與「訂房管理」）。
 *
 * 用法：
 *   <RoomFloorplan
 *     :building="grp"                     -- { id, name, rooms: [...] } 單一棟別
 *     :bookings="bookings"                 -- 全部訂單，用來判斷房間目前狀態（可省略）
 *     :selected-id="selectedRoomId"        -- 目前選取中的房間 id（不屬於這棟就傳 null）
 *     :unavailable-ids="['A203','A205']"   -- 選填：訂房流程用，標記「此日期區間已被占用」的房間
 *     reference-date="2026-08-01"          -- 選填：以哪一天判斷「住房中」，預設今天
 *     @select="room => ..."                -- 點房間時觸發，room 為 null 代表取消選取（點第二下同一間）
 *   >
 *     <template #panel-actions="{ room }">
 *       ...這裡放這個頁面自己要的按鈕（查看詳情／編輯／指派房間...）...
 *     </template>
 *   </RoomFloorplan>
 *
 * 快樂運動館（building.id === 'A'）用實際牆面手繪 SVG 當底圖，房間用小標記釘在 posX/posY 座標上；
 * 其他棟別如果房間有 posX/posY，用推算出來的線框格局；完全沒座標資料的棟別，fallback 成雙排走廊示意圖。
 */
const props = defineProps({
  building: { type: Object, required: true }, // { id, name, rooms: [...] }
  bookings: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  unavailableIds: { type: Array, default: () => [] },
  referenceDate: { type: String, default: null },
  // 選填：想要不同的房間狀態判斷邏輯時傳入（例如訂單管理要分「待確認」跟「已確認」兩種顏色），
  // 傳入 (room) => ({ cls, label })，cls 建議用 tile-vacant / tile-occupied / tile-pending / tile-inactive / tile-unavailable 其中一種，
  // 沒傳的話用預設邏輯（今天是否住房中）。
  statusResolver: { type: Function, default: null }
})
const emit = defineEmits(['select'])

const today = computed(() => props.referenceDate || new Date().toISOString().slice(0, 10))

/* ---------------- 房間狀態 ---------------- */

function activeBookingForRoom(roomId) {
  return props.bookings
    .filter(x => x.roomId === roomId && x.status === 'confirmed' && today.value >= x.checkIn && today.value < x.checkOut)[0] || null
}
function defaultTileClass(r) {
  if (!r.active) return 'tile-inactive'
  if (props.unavailableIds.includes(r.id)) return 'tile-unavailable'
  return activeBookingForRoom(r.id) ? 'tile-occupied' : 'tile-vacant'
}
function defaultTileLabel(r) {
  if (!r.active) return '已下架'
  if (props.unavailableIds.includes(r.id)) return '此日期不可選'
  return activeBookingForRoom(r.id) ? '今日住房中' : '空房可用'
}
function tileClass(r) {
  return props.statusResolver ? props.statusResolver(r).cls : defaultTileClass(r)
}
function tileLabel(r) {
  return props.statusResolver ? props.statusResolver(r).label : defaultTileLabel(r)
}
const BADGE_CLASS = {
  'tile-vacant': 'bg-emerald-100 text-emerald-700',
  'tile-occupied': 'bg-sky-100 text-sky-700',
  'tile-pending': 'bg-amber-100 text-amber-700',
  'tile-inactive': 'bg-stone-200 text-stone-600',
  'tile-unavailable': 'bg-rose-100 text-rose-700'
}
function badgeClass(r) {
  return BADGE_CLASS[tileClass(r)] || 'bg-stone-100 text-stone-600'
}
function isSelected(room) {
  return props.selectedId === room.id
}
function handleClick(room) {
  emit('select', isSelected(room) ? null : room)
}

const selectedRoom = computed(() => props.building.rooms.find(r => r.id === props.selectedId) || null)

/* ---------------- 座標系統 ----------------
   有實際平面圖標註過的棟別，用「原始圖片的像素尺寸」當 viewBox，
   這樣房間的相對間距、比例才會跟實際平面圖一致（不是隨便一個正方形畫布）。
   合力居跟愛加倍是畫在同一張圖上量出來的座標，所以共用同一組尺寸。 */
const REAL_CANVAS = {
  A: { w: 1360, h: 780 }, // 快樂運動館：對應手繪平面圖的 viewBox，兩邊座標系統一致
  B: { w: 1195, h: 896 },
  C: { w: 1195, h: 896 }
}

// 把「房間中心點座標」轉成畫布上的實際像素點，單純依比例換算，不做牆面推算。
// 用在已經有手繪牆面底圖的棟別（例如快樂運動館）：牆是畫死的，房間只需要一個「釘」標記其位置即可。
const pins = computed(() => {
  const canvas = REAL_CANVAS[props.building.id]
  if (!canvas) return []
  return props.building.rooms
    .filter(r => r.posX != null && r.posY != null)
    .map(r => ({ room: r, x: r.posX / 100 * canvas.w, y: r.posY / 100 * canvas.h }))
})

/* ---------------- 沒有手繪牆面時：依座標推算的線框格局 ----------------
   1. 先依 y 座標把房間分成幾排（同一排代表左右相鄰）
   2. 排內依 x 座標排序，相鄰房間如果間距夠近就以中點為共用牆（貼在一起，像真的隔間牆）；
      間距太遠（樓梯間、走廊轉角等）就保留原本的間隙，不會硬黏在一起
   3. 排與排之間的上下邊界用同樣的邏輯處理
   這樣畫出來是彼此相連的房間方塊，而不是各自漂浮的小色塊。 */
function buildWireframe(rooms, canvasW, canvasH) {
  const pts = rooms.map(r => ({ room: r, x: r.posX / 100 * canvasW, y: r.posY / 100 * canvasH }))

  const ROW_EPS = canvasH * 0.06
  const rows = []
  for (const p of [...pts].sort((a, b) => a.y - b.y)) {
    const row = rows.find(row => Math.abs(row.reduce((s, r) => s + r.y, 0) / row.length - p.y) < ROW_EPS)
    if (row) row.push(p)
    else rows.push([p])
  }
  rows.forEach(row => row.sort((a, b) => a.x - b.x))
  rows.sort((a, b) => (a.reduce((s, r) => s + r.y, 0) / a.length) - (b.reduce((s, r) => s + r.y, 0) / b.length))

  const rowCenters = rows.map(row => row.reduce((s, r) => s + r.y, 0) / row.length)
  const GAP_THRESH_Y = canvasH * 0.10
  const DEFAULT_HALF_H = canvasH * 0.028
  const rowBounds = rows.map((row, i) => {
    const cy = rowCenters[i]
    const top = i === 0
      ? cy - DEFAULT_HALF_H
      : (cy - rowCenters[i - 1] < GAP_THRESH_Y ? (cy + rowCenters[i - 1]) / 2 : cy - DEFAULT_HALF_H)
    const bottom = i === rows.length - 1
      ? cy + DEFAULT_HALF_H
      : (rowCenters[i + 1] - cy < GAP_THRESH_Y ? (cy + rowCenters[i + 1]) / 2 : cy + DEFAULT_HALF_H)
    return [top, bottom]
  })

  const GAP_THRESH_X = canvasW * 0.09
  const DEFAULT_HALF_W = canvasW * 0.022
  const positions = []
  rows.forEach((row, ri) => {
    const [top, bottom] = rowBounds[ri]
    row.forEach((p, i) => {
      const left = i === 0
        ? p.x - DEFAULT_HALF_W
        : (p.x - row[i - 1].x < GAP_THRESH_X ? (p.x + row[i - 1].x) / 2 : p.x - DEFAULT_HALF_W)
      const right = i === row.length - 1
        ? p.x + DEFAULT_HALF_W
        : (row[i + 1].x - p.x < GAP_THRESH_X ? (p.x + row[i + 1].x) / 2 : p.x + DEFAULT_HALF_W)
      positions.push({ room: p.room, x: left, y: top, w: right - left, h: bottom - top })
    })
  })

  // 走廊連接線：用最小生成樹（MST）把所有房間連成一整片，不管是同排/同列還是隔著樓梯間，
  // 全部都會有一條線接起來，畫出來才會像平面圖裡「房間彼此相連」的樣子，而不是一塊塊分開飄著。
  // 線畫在房塊「下面」，房塊蓋住線的兩端，視覺上就像走廊接到房間牆上。
  const connectors = buildMST(pts)

  // ---- 建築感元素：走廊留白 + 房間隔間牆 + 門符號 ----
  // 走廊：排與排之間如果有明顯留白（沒有貼在一起），畫成一條貫穿整層的淺色走廊帶
  const corridorBands = []
  for (let i = 0; i < rowBounds.length - 1; i++) {
    const gapTop = rowBounds[i][1]
    const gapBottom = rowBounds[i + 1][0]
    if (gapBottom - gapTop > 4) corridorBands.push({ top: gapTop, bottom: gapBottom })
  }
  const minX = Math.min(...positions.map(p => p.x))
  const maxX = Math.max(...positions.map(p => p.x + p.w))

  // 隔間牆：同一排相鄰房間如果緊貼（中間沒有走廊），畫一條共用牆的分隔線
  const walls = []
  rows.forEach((row) => {
    const rowPositions = positions.filter(p => row.some(r => r.room === p.room))
      .sort((a, b) => a.x - b.x)
    for (let i = 0; i < rowPositions.length - 1; i++) {
      const a = rowPositions[i], b = rowPositions[i + 1]
      if (b.x - (a.x + a.w) < 6) walls.push({ x: a.x + a.w, y1: a.y, y2: a.y + a.h })
    }
  })

  // 門符號：房間邊界貼著走廊帶的那一側，畫一個開門弧線記號
  const doors = []
  for (const p of positions) {
    const facesTop = corridorBands.some(c => Math.abs(p.y - c.bottom) < 3)
    const facesBottom = corridorBands.some(c => Math.abs((p.y + p.h) - c.top) < 3)
    const dx = p.x + p.w / 2
    const doorW = Math.min(18, p.w * 0.4)
    if (facesTop) doors.push({ room: p.room, x: dx, y: p.y, w: doorW, dir: 'up' })
    else if (facesBottom) doors.push({ room: p.room, x: dx, y: p.y + p.h, w: doorW, dir: 'down' })
  }

  return { positions, connectors, corridorBands, walls, doors, minX, maxX }
}

function buildMST(pts) {
  const n = pts.length
  if (n <= 1) return []
  const inTree = new Array(n).fill(false)
  const minDist = new Array(n).fill(Infinity)
  const parent = new Array(n).fill(-1)
  minDist[0] = 0
  for (let iter = 0; iter < n; iter++) {
    let u = -1
    for (let i = 0; i < n; i++) {
      if (!inTree[i] && (u === -1 || minDist[i] < minDist[u])) u = i
    }
    inTree[u] = true
    for (let v = 0; v < n; v++) {
      if (!inTree[v]) {
        const d = Math.hypot(pts[u].x - pts[v].x, pts[u].y - pts[v].y)
        if (d < minDist[v]) { minDist[v] = d; parent[v] = u }
      }
    }
  }
  const edges = []
  for (let i = 0; i < n; i++) {
    if (parent[i] !== -1) edges.push({ x1: pts[parent[i]].x, y1: pts[parent[i]].y, x2: pts[i].x, y2: pts[i].y })
  }
  return edges
}

const realLayout = computed(() => {
  const canvas = REAL_CANVAS[props.building.id]
  const positioned = props.building.rooms.filter(r => r.posX != null && r.posY != null)
  if (!canvas || positioned.length === 0) {
    return { width: 0, height: 0, positions: [], connectors: [], corridorBands: [], walls: [], doors: [], minX: 0, maxX: 0 }
  }
  return {
    width: canvas.w,
    height: canvas.h,
    ...buildWireframe(positioned, canvas.w, canvas.h)
  }
})

/* ---------------- 完全沒座標資料時：簡易走廊示意圖排版 ----------------
     偶數 index 排上排、奇數排下排，兩排中間夾一條走廊。
     房間位置全部用算的，新增/刪除/排序房間時會自動重排，不用手動維護座標。 */
const ROOM_W = 108, ROOM_H = 78, CORRIDOR_H = 46, PAD = 16
const fallbackLayout = computed(() => {
  const roomsArr = props.building.rooms
  const pairs = Math.max(Math.ceil(roomsArr.length / 2), 1)
  const width = PAD * 2 + pairs * ROOM_W + (pairs - 1) * 10
  const height = PAD * 2 + ROOM_H * 2 + CORRIDOR_H
  const positions = roomsArr.map((room, i) => {
    const col = Math.floor(i / 2)
    const isTop = i % 2 === 0
    return {
      room,
      x: PAD + col * (ROOM_W + 10),
      y: isTop ? PAD : PAD + ROOM_H + CORRIDOR_H
    }
  })
  return { width, height, positions, corridorY: PAD + ROOM_H, corridorH: CORRIDOR_H }
})
</script>

<template>
  <div class="room-floorplan">
    <!-- 快樂運動館：手繪實際牆面平面圖，房間用圓角標記釘在真實座標上，點一下＝選取 -->
    <svg
      v-if="building.id === 'A'"
      viewBox="0 0 1360 780"
      class="floorplan-svg"
      style="max-width:1360px"
    >
      <!-- ===== 手繪牆面（依實際格局描繪，僅結構線，不含房間色塊） ===== -->
      <g class="fp-walls">
        <rect class="fp-wall" x="90" y="108" width="95" height="132" />
        <rect class="fp-wall" x="88" y="240" width="147" height="492" />
        <g class="fp-win">
          <rect x="155" y="282" width="14" height="9" />
          <rect x="155" y="358" width="14" height="9" />
          <rect x="155" y="428" width="14" height="9" />
          <rect x="155" y="497" width="14" height="9" />
          <rect x="155" y="565" width="14" height="9" />
          <rect x="155" y="633" width="14" height="9" />
          <rect x="155" y="700" width="14" height="9" />
        </g>
        <path class="fp-wall" d="M185,240 L185,100 L488,100 L488,80 L600,80 L600,100 L965,100 L965,90 L1185,90 L1185,330 L965,330 L965,320 L490,320 L490,240 Z" />
        <line class="fp-wall2" x1="315" y1="100" x2="315" y2="250" />
        <line class="fp-wall2" x1="395" y1="100" x2="395" y2="250" />
        <line class="fp-wall2" x1="490" y1="100" x2="490" y2="250" />
        <line class="fp-wall2" x1="600" y1="100" x2="600" y2="240" />
        <line class="fp-wall2" x1="710" y1="100" x2="710" y2="240" />
        <line class="fp-wall2" x1="800" y1="100" x2="800" y2="330" />
        <line class="fp-wall2" x1="865" y1="100" x2="865" y2="330" />
        <line class="fp-wall2" x1="960" y1="90" x2="960" y2="330" />
        <line class="fp-wall2" x1="185" y1="180" x2="490" y2="180" />
        <line class="fp-wall2" x1="315" y1="250" x2="490" y2="250" />
        <g class="fp-thin">
          <line x1="330" y1="180" x2="330" y2="250" />
          <line x1="365" y1="180" x2="365" y2="250" />
          <line x1="430" y1="180" x2="430" y2="250" />
          <line x1="460" y1="180" x2="460" y2="250" />
        </g>
        <g class="fp-door">
          <path d="M320,182 q7,20 0,40" />
          <path d="M345,182 q7,20 0,40" />
          <path d="M400,182 q7,20 0,40" />
          <path d="M445,182 q7,20 0,40" />
          <path d="M475,182 q7,20 0,40" />
        </g>
        <g class="fp-thin">
          <line x1="230" y1="100" x2="230" y2="180" />
          <line x1="270" y1="100" x2="270" y2="180" />
        </g>
        <g class="fp-door">
          <path d="M232,102 A38,38 0 0,1 270,140" />
          <path d="M272,102 A38,38 0 0,1 310,140" />
        </g>
        <path class="fp-door" d="M400,180 A55,55 0 0,0 455,235" />
        <circle class="fp-thin" cx="530" cy="205" r="12" />
        <line class="fp-thin" x1="518" y1="205" x2="542" y2="205" />
        <path class="fp-door" d="M513,238 A30,30 0 0,0 543,208" />
        <g class="fp-door">
          <path d="M602,110 A40,40 0 0,1 642,150" />
          <path d="M642,150 A40,40 0 0,0 682,110" />
        </g>
        <line class="fp-thin" x1="642" y1="110" x2="642" y2="150" />
        <g class="fp-wall2">
          <rect x="800" y="120" width="65" height="160" />
        </g>
        <g class="fp-thin">
          <line x1="810" y1="130" x2="855" y2="130" />
          <line x1="810" y1="142" x2="855" y2="142" />
          <line x1="810" y1="154" x2="855" y2="154" />
          <line x1="810" y1="166" x2="855" y2="166" />
          <line x1="810" y1="178" x2="855" y2="178" />
          <line x1="810" y1="190" x2="855" y2="190" />
          <line x1="810" y1="202" x2="855" y2="202" />
        </g>
        <path class="fp-door" d="M872,280 A55,55 0 0,0 927,325" />
        <g class="fp-col">
          <rect x="1050" y="105" width="10" height="10" />
          <rect x="1145" y="105" width="10" height="10" />
          <rect x="1055" y="270" width="10" height="10" />
          <rect x="1150" y="270" width="10" height="10" />
        </g>
        <path class="fp-wall" d="M490,240 L490,745 L680,745 L680,660 L800,660 L800,320 L490,320 Z" />
        <line class="fp-wall2" x1="615" y1="240" x2="615" y2="660" />
        <line class="fp-wall2" x1="490" y1="378" x2="615" y2="378" />
        <line class="fp-wall2" x1="490" y1="465" x2="615" y2="465" />
        <line class="fp-wall2" x1="490" y1="565" x2="615" y2="565" />
        <line class="fp-wall2" x1="680" y1="378" x2="800" y2="378" />
        <line class="fp-wall2" x1="680" y1="465" x2="800" y2="465" />
        <line class="fp-wall2" x1="680" y1="565" x2="800" y2="565" />
        <g class="fp-door">
          <path d="M598,320 A28,28 0 0,1 615,348" />
          <path d="M598,378 A28,28 0 0,1 615,406" />
          <path d="M598,465 A28,28 0 0,1 615,493" />
        </g>
        <g class="fp-door">
          <path d="M680,340 A30,30 0 0,0 650,370" />
          <path d="M680,428 A30,30 0 0,0 650,458" />
          <path d="M680,516 A30,30 0 0,0 650,546" />
        </g>
        <line class="fp-wall2" x1="490" y1="590" x2="615" y2="590" />
        <g class="fp-thin">
          <line x1="520" y1="590" x2="520" y2="660" />
          <line x1="555" y1="590" x2="555" y2="660" />
          <line x1="585" y1="590" x2="585" y2="660" />
        </g>
        <g class="fp-door">
          <path d="M498,592 q6,18 0,36" />
          <path d="M530,592 q6,18 0,36" />
          <path d="M565,592 q6,18 0,36" />
        </g>
        <circle class="fp-thin" cx="600" cy="600" r="4" />
        <circle class="fp-thin" cx="608" cy="600" r="4" />
        <rect class="fp-wall2" x="520" y="662" width="80" height="80" />
        <g class="fp-thin">
          <line x1="528" y1="672" x2="592" y2="672" />
          <line x1="528" y1="684" x2="592" y2="684" />
          <line x1="528" y1="696" x2="592" y2="696" />
          <line x1="528" y1="708" x2="592" y2="708" />
          <line x1="528" y1="720" x2="592" y2="720" />
          <line x1="528" y1="732" x2="592" y2="732" />
        </g>
      </g>

      <!-- ===== 房間標記：釘在該房間記錄的 posX/posY 座標上 ===== -->
      <g
        v-for="p in pins"
        :key="p.room.id"
        class="room-group"
        @click="handleClick(p.room)"
      >
        <rect
          :x="p.x - 27"
          :y="p.y - 17"
          width="54"
          height="34"
          rx="6"
          :class="['room-pin', tileClass(p.room), isSelected(p.room) ? 'pin-selected' : '']"
        />
        <text
          :x="p.x"
          :y="p.y + 4"
          text-anchor="middle"
          class="room-block-num"
        >{{ p.room.id }}</text>
        <title>{{ p.room.id }} ・ {{ tileLabel(p.room) }}</title>
      </g>
    </svg>

    <!-- 實際座標線框圖：沒有手繪牆面、但有記錄座標的棟別，用推算出來的線框格局 -->
    <svg
      v-else-if="realLayout.positions.length"
      :viewBox="`0 0 ${realLayout.width} ${realLayout.height}`"
      class="floorplan-svg"
      :style="{ maxWidth: realLayout.width + 'px' }"
    >
      <rect
        :x="0"
        :y="0"
        :width="realLayout.width"
        :height="realLayout.height"
        class="floor-outline"
        rx="8"
      />

      <!-- 走廊留白：排與排之間有間隙的地方畫一條貫穿的淺色走廊帶 -->
      <rect
        v-for="(c, i) in realLayout.corridorBands"
        :key="'band' + i"
        :x="realLayout.minX - 10"
        :y="c.top"
        :width="realLayout.maxX - realLayout.minX + 20"
        :height="c.bottom - c.top"
        class="corridor-band-real"
      />

      <!-- 房間之間的共用隔間牆 -->
      <line
        v-for="(w, i) in realLayout.walls"
        :key="'w' + i"
        :x1="w.x"
        :y1="w.y1"
        :x2="w.x"
        :y2="w.y2"
        class="partition-wall"
      />

      <line
        v-for="(c, i) in realLayout.connectors"
        :key="'c' + i"
        :x1="c.x1"
        :y1="c.y1"
        :x2="c.x2"
        :y2="c.y2"
        class="corridor-connector"
      />

      <g
        v-for="p in realLayout.positions"
        :key="p.room.id"
        class="room-group"
        @click="handleClick(p.room)"
      >
        <rect
          :x="p.x"
          :y="p.y"
          :width="p.w"
          :height="p.h"
          rx="2"
          :class="['room-rect', tileClass(p.room), isSelected(p.room) ? 'pin-selected' : '']"
        />
        <text
          :x="p.x + p.w/2"
          :y="p.y + p.h/2 + 4"
          text-anchor="middle"
          class="room-block-num"
        >{{ p.room.id }}</text>
        <title>{{ p.room.id }} ・ {{ tileLabel(p.room) }}</title>
      </g>

      <!-- 門符號：房間面向走廊那一側的開門弧線記號 -->
      <g
        v-for="(d, i) in realLayout.doors"
        :key="'d' + i"
        class="door-mark"
      >
        <line
          :x1="d.x - d.w/2"
          :y1="d.y"
          :x2="d.x + d.w/2"
          :y2="d.y"
          class="door-gap"
        />
        <path
          v-if="d.dir === 'up'"
          :d="`M ${d.x - d.w/2} ${d.y} A ${d.w} ${d.w} 0 0 1 ${d.x + d.w/2} ${d.y - d.w}`"
          class="door-swing"
        />
        <path
          v-else
          :d="`M ${d.x - d.w/2} ${d.y} A ${d.w} ${d.w} 0 0 0 ${d.x + d.w/2} ${d.y + d.w}`"
          class="door-swing"
        />
      </g>
    </svg>

    <!-- 走廊示意圖（沒有座標時的 fallback） -->
    <svg
      v-else
      :viewBox="`0 0 ${fallbackLayout.width} ${fallbackLayout.height}`"
      class="floorplan-svg"
      :style="{ maxWidth: fallbackLayout.width + 'px' }"
    >
      <rect
        :x="0"
        :y="fallbackLayout.corridorY"
        :width="fallbackLayout.width"
        :height="fallbackLayout.corridorH"
        class="corridor-band"
      />
      <text
        :x="fallbackLayout.width / 2"
        :y="fallbackLayout.corridorY + fallbackLayout.corridorH / 2 + 4"
        text-anchor="middle"
        class="corridor-label"
      >走廊</text>

      <g
        v-for="p in fallbackLayout.positions"
        :key="p.room.id"
        class="room-group"
        @click="handleClick(p.room)"
      >
        <rect
          :x="p.x"
          :y="p.y"
          :width="ROOM_W"
          :height="ROOM_H"
          rx="6"
          :class="['room-rect', tileClass(p.room), isSelected(p.room) ? 'pin-selected' : '']"
        />
        <text
          :x="p.x + ROOM_W / 2"
          :y="p.y + 26"
          text-anchor="middle"
          class="room-num"
        >{{ p.room.id }}</text>
        <text
          :x="p.x + ROOM_W / 2"
          :y="p.y + 43"
          text-anchor="middle"
          class="room-sub"
        >{{ p.room.capacity }} 人</text>
        <text
          :x="p.x + ROOM_W / 2"
          :y="p.y + 62"
          text-anchor="middle"
          :class="['room-status', tileClass(p.room)]"
        >{{ tileLabel(p.room) }}</text>
      </g>
    </svg>

    <!-- 選取中的房間：內嵌資訊卡，動作按鈕交給外層頁面決定要放什麼 -->
    <div
      v-if="selectedRoom"
      class="room-pin-panel"
    >
      <div class="flex items-center justify-between gap-2 mb-2">
        <span
          class="font-bold text-base-c"
          style="font-size:13.5px"
        >{{ selectedRoom.id }}・{{ selectedRoom.type }}</span>
        <span
          class="status-badge"
          :class="badgeClass(selectedRoom)"
        >{{ tileLabel(selectedRoom) }}</span>
      </div>
      <div
        class="text-hint-c mb-3"
        style="font-size:12.5px"
      >
        {{ selectedRoom.capacity }} 人・{{ selectedRoom.bed }}・NT$ {{ selectedRoom.price.toLocaleString() }}/晚
      </div>
      <div class="flex flex-wrap gap-2">
        <slot
          name="panel-actions"
          :room="selectedRoom"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .floorplan-svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .floor-outline {
    fill: var(--surface2);
    stroke: var(--text);
    stroke-width: 2.5;
  }
  .corridor-band-real {
    fill: var(--surface);
    opacity: .6;
  }
  .partition-wall {
    stroke: var(--text);
    stroke-width: 1.2;
    opacity: .7;
  }
  .door-gap {
    stroke: var(--surface);
    stroke-width: 3;
  }
  .door-swing {
    fill: none;
    stroke: var(--border);
    stroke-width: 1;
  }
  .corridor-connector {
    stroke: var(--border);
    stroke-width: 5;
    stroke-linecap: round;
    opacity: .35;
  }
  .corridor-band {
    fill: var(--surface2);
  }
  .corridor-label {
    font-size: 11px;
    fill: var(--text-hint);
    letter-spacing: 2px;
  }
  .room-group {
    cursor: pointer;
  }
  .room-rect {
    fill: var(--surface);
    stroke-width: 1.5;
    transition: stroke-width .15s, filter .15s;
  }
  /* 房間狀態用邊框顏色表示（功能性分類色，不隨深色模式變動） */
  .room-rect.tile-vacant      { stroke: #10b981; }
  .room-rect.tile-occupied    { stroke: #3b82f6; }
  .room-rect.tile-pending     { stroke: #f59e0b; }
  .room-rect.tile-inactive    { stroke: #a8a29e; stroke-dasharray: 3 2; }
  .room-rect.tile-unavailable { stroke: #f43f5e; stroke-dasharray: 3 2; }
  .room-group:hover .room-rect.tile-vacant      { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(16,185,129,.9)); }
  .room-group:hover .room-rect.tile-occupied    { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(59,130,246,.9)); }
  .room-group:hover .room-rect.tile-pending     { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(245,158,11,.9)); }
  .room-group:hover .room-rect.tile-inactive    { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(168,162,158,.9)); }
  .room-group:hover .room-rect.tile-unavailable { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(244,63,94,.9)); }
  .room-num {
    font-size: 14px;
    font-weight: 700;
    fill: var(--text);
  }
  .room-sub {
    font-size: 10px;
    fill: var(--text-hint);
  }
  .room-status {
    font-size: 9.5px;
    font-weight: 700;
  }
  .room-status.tile-vacant      { fill: #059669; }
  .room-status.tile-occupied    { fill: #2563eb; }
  .room-status.tile-pending     { fill: #b45309; }
  .room-status.tile-inactive    { fill: #78716c; }
  .room-status.tile-unavailable { fill: #e11d48; }
  .room-block-num {
    font-size: 9.5px;
    font-weight: 700;
    fill: var(--text);
    pointer-events: none;
  }
  /* 手繪牆面線稿（快樂運動館平面圖），用 CSS 變數跟著站台色彩主題走 */
  .fp-wall {
    stroke: var(--text);
    stroke-width: 3;
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .fp-wall2 {
    stroke: var(--text);
    stroke-width: 1.4;
    fill: none;
    opacity: .85;
  }
  .fp-thin {
    stroke: var(--text-hint);
    stroke-width: 1;
    fill: none;
  }
  .fp-door {
    stroke: var(--text-hint);
    stroke-width: 1.2;
    fill: none;
  }
  .fp-win {
    stroke: var(--text);
    stroke-width: 1.4;
    fill: none;
  }
  .fp-col {
    stroke: var(--text);
    stroke-width: 1.4;
    fill: var(--surface);
  }
  /* 房間標記（釘在手繪牆面上，非精確格局，只表位置） */
  .room-pin {
    fill: var(--surface);
    stroke-width: 2;
    cursor: pointer;
    transition: stroke-width .15s, filter .15s, fill .15s;
  }
  .room-pin.tile-vacant      { stroke: #10b981; }
  .room-pin.tile-occupied    { stroke: #3b82f6; }
  .room-pin.tile-pending     { stroke: #f59e0b; }
  .room-pin.tile-inactive    { stroke: #a8a29e; stroke-dasharray: 3 2; }
  .room-pin.tile-unavailable { stroke: #f43f5e; stroke-dasharray: 3 2; }
  .room-group:hover .room-pin { stroke-width: 3; }
  .room-pin.pin-selected {
    stroke-width: 3.5;
    fill: rgba(21, 128, 61, .12);
    filter: drop-shadow(0 0 4px rgba(21, 128, 61, .85));
  }
  .room-rect.pin-selected {
    stroke-width: 3.5;
    filter: drop-shadow(0 0 4px rgba(21, 128, 61, .85));
  }
  .room-pin-panel {
    margin-top: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--surface2);
    border: 1px solid var(--border);
  }
  .status-badge {
    font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
  }
</style>
