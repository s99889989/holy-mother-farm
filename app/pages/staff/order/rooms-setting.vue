<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="max-w-4xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">🏨</div>
        <div class="flex-1">
          <h1 class="font-bold text-base-c leading-none" style="font-size:15px">房間管理</h1>
        </div>
        <span class="text-hint-c" style="font-size:12px">共 {{ totalRooms }} 間・上架 {{ activeRooms }} 間</span>
      </div>
    </header>

    <div class="max-w-4xl mx-auto px-3 sm:px-4 py-4">

      <div v-if="loading" class="text-center py-8 text-hint-c" style="font-size:13px">載入中...</div>

      <template v-else>
        <!-- 工具列：棟別快速篩選 + 列表/平面圖切換 -->
        <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div class="flex gap-2 flex-wrap">
            <button
              class="pill-btn" :class="buildingFilter === 'all' ? 'pill-active' : ''"
              @click="buildingFilter = 'all'"
            >全部棟別</button>
            <button
              v-for="b in buildings" :key="b.id" class="pill-btn"
              :class="buildingFilter === b.id ? 'pill-active' : ''"
              @click="buildingFilter = b.id"
            >{{ b.name }}</button>
            <button class="pill-btn border-dashed" @click="openAddBuilding">＋ 新增棟別</button>
          </div>
          <div class="segmented">
            <button :class="viewMode === 'list' ? 'seg-active' : ''" @click="viewMode = 'list'">列表檢視</button>
            <button :class="viewMode === 'floorplan' ? 'seg-active' : ''" @click="viewMode = 'floorplan'">平面圖檢視</button>
          </div>
        </div>

        <!-- 列表檢視 -->
        <div v-if="viewMode === 'list'" class="bg-surface rounded-2xl border border-light-c shadow-sm p-4">
          <div v-for="grp in visibleBuildings" :key="grp.id" class="mb-6 last:mb-0">
            <div class="flex items-center gap-2 mb-2">
              <span class="building-badge">{{ grp.name.charAt(0) }}</span>
              <h3 class="font-bold text-base-c" style="font-size:14px">{{ grp.name }}</h3>
              <span class="text-hint-c" style="font-size:11.5px">共 {{ grp.rooms.length }} 間</span>
              <span class="icon-btn text-hint-c ml-1" @click="openEditBuilding(grp)">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </span>
              <span class="icon-btn text-hint-c" @click="deleteBuildingConfirm(grp)">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </span>
            </div>
            <table class="w-full">
              <thead>
              <tr class="text-hint-c text-left" style="font-size:11px">
                <th class="py-1.5 font-semibold">房號</th>
                <th class="py-1.5 font-semibold">房型</th>
                <th class="py-1.5 font-semibold">人數</th>
                <th class="py-1.5 font-semibold">床型</th>
                <th class="py-1.5 font-semibold">價格/晚</th>
                <th class="py-1.5 font-semibold">上架</th>
                <th class="py-1.5 font-semibold"></th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="r in grp.rooms" :key="r.id" class="border-t border-light-c" style="font-size:12.5px">
                <td class="py-2 font-semibold text-base-c">{{ r.id }}</td>
                <td class="py-2 text-base-c">{{ r.type }}</td>
                <td class="py-2 text-base-c">{{ r.capacity }} 人</td>
                <td class="py-2 text-hint-c">{{ r.bed }}</td>
                <td class="py-2 text-base-c">{{ r.price.toLocaleString() }}</td>
                <td class="py-2">
                  <button class="toggle" :class="r.active ? 'toggle-on' : ''" @click="quickToggleActive(grp.id, r)"></button>
                </td>
                <td class="py-2">
                  <div class="flex gap-1">
                      <span class="icon-btn text-hint-c" @click="openEditRoom(grp, r)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </span>
                    <span class="icon-btn text-hint-c" @click="deleteRoomConfirm(grp, r)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </span>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
            <button class="mt-2 pill-btn border-dashed" @click="openAddRoom(grp)">＋ 新增房間</button>
          </div>
        </div>

        <!-- 平面圖檢視：有實際座標的棟別用真實比例的線框圖，沒有座標的棟別 fallback 成走廊示意圖 -->
        <div v-else class="bg-surface rounded-2xl border border-light-c shadow-sm p-4">
          <div v-for="grp in visibleBuildings" :key="grp.id" class="mb-8 last:mb-0">
            <div class="flex items-center gap-2 mb-2">
              <span class="building-badge">{{ grp.name.charAt(0) }}</span>
              <h3 class="font-bold text-base-c" style="font-size:14px">{{ grp.name }}</h3>
              <span class="text-hint-c" style="font-size:11.5px">共 {{ grp.rooms.length }} 間・單層</span>
            </div>

            <!-- 實際座標線框圖：房塊照真實平面圖比例定位，不用照片當底圖 -->
            <svg
              v-if="realLayoutOf(grp).positions.length"
              :viewBox="`0 0 ${realLayoutOf(grp).width} ${realLayoutOf(grp).height}`"
              class="floorplan-svg"
              :style="{ maxWidth: realLayoutOf(grp).width + 'px' }"
            >
              <rect :x="0" :y="0" :width="realLayoutOf(grp).width" :height="realLayoutOf(grp).height" class="floor-outline" rx="8" />

              <!-- 走廊留白：排與排之間有間隙的地方畫一條貫穿的淺色走廊帶 -->
              <rect
                v-for="(c, i) in realLayoutOf(grp).corridorBands" :key="'band' + i"
                :x="realLayoutOf(grp).minX - 10" :y="c.top"
                :width="realLayoutOf(grp).maxX - realLayoutOf(grp).minX + 20" :height="c.bottom - c.top"
                class="corridor-band-real"
              />

              <!-- 房間之間的共用隔間牆 -->
              <line
                v-for="(w, i) in realLayoutOf(grp).walls" :key="'w' + i"
                :x1="w.x" :y1="w.y1" :x2="w.x" :y2="w.y2" class="partition-wall"
              />

              <line
                v-for="(c, i) in realLayoutOf(grp).connectors" :key="'c' + i"
                :x1="c.x1" :y1="c.y1" :x2="c.x2" :y2="c.y2" class="corridor-connector"
              />

              <g v-for="p in realLayoutOf(grp).positions" :key="p.room.id" class="room-group" @click="openRoomDetail(grp, p.room)">
                <rect :x="p.x" :y="p.y" :width="p.w" :height="p.h" rx="2" :class="['room-rect', tileClass(p.room)]" />
                <text :x="p.x + p.w/2" :y="p.y + p.h/2 + 4" text-anchor="middle" class="room-block-num">{{ p.room.id }}</text>
                <title>{{ p.room.id }} ・ {{ tileLabel(p.room) }}</title>
              </g>

              <!-- 門符號：房間面向走廊那一側的開門弧線記號 -->
              <g v-for="(d, i) in realLayoutOf(grp).doors" :key="'d' + i" class="door-mark">
                <line
                  :x1="d.x - d.w/2" :y1="d.y" :x2="d.x + d.w/2" :y2="d.y"
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
              :viewBox="`0 0 ${layoutOf(grp.id).width} ${layoutOf(grp.id).height}`"
              class="floorplan-svg"
              :style="{ maxWidth: layoutOf(grp.id).width + 'px' }"
            >
              <rect
                :x="0" :y="layoutOf(grp.id).corridorY" :width="layoutOf(grp.id).width" :height="layoutOf(grp.id).corridorH"
                class="corridor-band"
              />
              <text
                :x="layoutOf(grp.id).width / 2" :y="layoutOf(grp.id).corridorY + layoutOf(grp.id).corridorH / 2 + 4"
                text-anchor="middle" class="corridor-label"
              >走廊</text>

              <g v-for="p in layoutOf(grp.id).positions" :key="p.room.id" class="room-group" @click="openRoomDetail(grp, p.room)">
                <rect :x="p.x" :y="p.y" :width="ROOM_W" :height="ROOM_H" rx="6" :class="['room-rect', tileClass(p.room)]" />
                <text :x="p.x + ROOM_W / 2" :y="p.y + 26" text-anchor="middle" class="room-num">{{ p.room.id }}</text>
                <text :x="p.x + ROOM_W / 2" :y="p.y + 43" text-anchor="middle" class="room-sub">{{ p.room.capacity }} 人</text>
                <text :x="p.x + ROOM_W / 2" :y="p.y + 62" text-anchor="middle" :class="['room-status', tileClass(p.room)]">{{ tileLabel(p.room) }}</text>
              </g>
            </svg>
          </div>
          <div class="flex flex-wrap gap-4 text-hint-c mt-2" style="font-size:11.5px">
            <span><span class="dot" style="background:#10b981"></span>空房可用</span>
            <span><span class="dot" style="background:#3b82f6"></span>今日住房中</span>
            <span><span class="dot" style="background:#a8a29e"></span>已下架</span>
            <span>點擊房間可查看詳情與快速編輯</span>
          </div>
          <p class="text-hint-c mt-2" style="font-size:11px">＊快樂運動館、合力居、愛加倍已依實際平面圖比例定位；懇親房目前無座標資料，暫以走廊示意圖顯示</p>
        </div>
      </template>
    </div>

    <!-- ===== 棟別 新增/編輯 Modal ===== -->
    <div v-if="buildingModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @click.self="buildingModal.open = false">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">{{ buildingModal.id ? '編輯棟別' : '新增棟別' }}</h2>
        <label class="block text-hint-c mb-1" style="font-size:12px">棟別名稱</label>
        <input v-model="buildingModal.name" type="text" class="w-full border border-light-c rounded-lg px-3 py-2 mb-1 bg-surface2 text-base-c" style="font-size:13px" placeholder="例如：快樂運動館學員宿舍" @keyup.enter="saveBuildingModal">
        <p v-if="modalError" class="text-red-500 mb-2" style="font-size:11.5px">{{ modalError }}</p>
        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-plain" @click="buildingModal.open = false">取消</button>
          <button class="btn-primary" :disabled="saving" @click="saveBuildingModal">{{ saving ? '儲存中...' : '儲存' }}</button>
        </div>
      </div>
    </div>

    <!-- ===== 房間 新增/編輯 Modal ===== -->
    <div v-if="roomModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @click.self="roomModal.open = false">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">{{ roomModal.id ? '編輯房間' : '新增房間' }}（{{ roomModal.buildingName }}）</h2>

        <label class="block text-hint-c mb-1" style="font-size:12px">房號（作為識別代碼，建立後不可修改）</label>
        <input v-model="roomModal.id" type="text" :disabled="!!roomModal.originalId" class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c disabled:opacity-60" style="font-size:13px" placeholder="例如：A202">

        <label class="block text-hint-c mb-1" style="font-size:12px">房型</label>
        <input v-model="roomModal.type" type="text" class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c" style="font-size:13px" placeholder="例如：雙人雅房">

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">可住人數</label>
            <input v-model.number="roomModal.capacity" type="number" min="1" class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:12px">每晚價格</label>
            <input v-model.number="roomModal.price" type="number" min="0" class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:13px">
          </div>
        </div>

        <label class="block text-hint-c mb-1" style="font-size:12px">床型</label>
        <input v-model="roomModal.bed" type="text" class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c" style="font-size:13px" placeholder="例如：雙人床">

        <div class="flex items-center gap-2 mb-1">
          <button class="toggle" :class="roomModal.active ? 'toggle-on' : ''" @click="roomModal.active = !roomModal.active"></button>
          <span class="text-hint-c" style="font-size:12.5px">{{ roomModal.active ? '目前上架中' : '目前已下架' }}</span>
        </div>
        <p v-if="modalError" class="text-red-500 mb-2 mt-2" style="font-size:11.5px">{{ modalError }}</p>

        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-plain" @click="roomModal.open = false">取消</button>
          <button class="btn-primary" :disabled="saving" @click="saveRoomModal">{{ saving ? '儲存中...' : '儲存' }}</button>
        </div>
      </div>
    </div>

    <!-- ===== 房間詳情 Modal（平面圖點擊） ===== -->
    <div v-if="detailTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @click.self="detailTarget = null">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">{{ detailTarget.room.id }} · {{ detailTarget.buildingName }}</h2>
        <div class="bg-surface2 rounded-lg p-3 mb-3" style="font-size:12.5px">
          <div class="flex justify-between py-0.5"><span class="text-hint-c">房型</span><span class="text-base-c">{{ detailTarget.room.type }}</span></div>
          <div class="flex justify-between py-0.5"><span class="text-hint-c">可住人數</span><span class="text-base-c">{{ detailTarget.room.capacity }} 人</span></div>
          <div class="flex justify-between py-0.5"><span class="text-hint-c">床型</span><span class="text-base-c">{{ detailTarget.room.bed }}</span></div>
          <div class="flex justify-between py-0.5"><span class="text-hint-c">價格</span><span class="text-base-c">NT$ {{ detailTarget.room.price.toLocaleString() }}/晚</span></div>
        </div>
        <div class="mb-3">
          <p class="font-semibold text-hint-c mb-1.5" style="font-size:12px">相關訂單</p>
          <p v-if="detailBookings.length === 0" class="text-hint-c" style="font-size:12px">目前沒有相關訂單</p>
          <div v-for="b in detailBookings" :key="b.id" class="flex justify-between items-center py-1.5 border-t border-light-c" style="font-size:12px">
            <span class="text-base-c">{{ b.checkIn }} → {{ b.checkOut }} ・ {{ b.name }}</span>
            <span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn-plain" @click="openEditRoom({id: detailTarget.buildingId, name: detailTarget.buildingName}, detailTarget.room); detailTarget = null">編輯房間</button>
          <button class="btn-primary" @click="detailTarget = null">關閉</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
  definePageMeta({ layout: 'staff', requiredPermission: 'booking.rooms' })

  const commonStore = useCommonStore()
  const ROOMS_BASE    = () => commonStore.data.main_url + '/holy/rooms/settings'
  const BOOKINGS_BASE = () => commonStore.data.main_url + '/holy/rooms/bookings'

  const loading  = ref(false)
  const saving   = ref(false)
  const modalError = ref('')

  const buildings = ref([])   // [{id, name, rooms:[...]}]
  const bookings  = ref([])   // 全部訂單，用來判斷「今日住房中」與房間詳情的相關訂單

  const buildingFilter = ref('all')
  const viewMode = ref('list')

  const today = new Date().toISOString().slice(0, 10)

  const totalRooms  = computed(() => buildings.value.reduce((s, b) => s + b.rooms.length, 0))
  const activeRooms = computed(() => buildings.value.reduce((s, b) => s + b.rooms.filter(r => r.active).length, 0))

  const visibleBuildings = computed(() =>
    buildingFilter.value === 'all' ? buildings.value : buildings.value.filter(b => b.id === buildingFilter.value)
  )

  async function fetchAll() {
    loading.value = true
    try {
      const [b, o] = await Promise.all([
        (await fetch(`${ROOMS_BASE()}/list`)).json(),
        (await fetch(`${BOOKINGS_BASE()}/list`)).json(),
      ])
      buildings.value = b
      bookings.value = o
    } catch (e) { console.error(e) }
    finally { loading.value = false }
  }

  /* ---------------- 平面圖狀態 ---------------- */

  /* ---------------- 平面圖：簡易走廊示意圖排版 ----------------
     沒有實際建築圖時，依房號順序排成雙排走廊的樣子：
     偶數 index 排上排、奇數排下排，兩排中間夾一條走廊。
     房間位置全部用算的，新增/刪除/排序房間時會自動重排，不用手動維護座標。 */
  const ROOM_W = 108, ROOM_H = 78, ROOM_GAP = 10, CORRIDOR_H = 46, PAD = 16

  function computeLayout(roomsArr) {
    const pairs = Math.max(Math.ceil(roomsArr.length / 2), 1)
    const width = PAD * 2 + pairs * ROOM_W + (pairs - 1) * ROOM_GAP
    const height = PAD * 2 + ROOM_H * 2 + CORRIDOR_H
    const positions = roomsArr.map((room, i) => {
      const col = Math.floor(i / 2)
      const isTop = i % 2 === 0
      return {
        room,
        x: PAD + col * (ROOM_W + ROOM_GAP),
        y: isTop ? PAD : PAD + ROOM_H + CORRIDOR_H,
      }
    })
    return { width, height, positions, corridorY: PAD + ROOM_H, corridorH: CORRIDOR_H }
  }
  const buildingLayouts = computed(() => {
    const map = {}
    for (const grp of buildings.value) map[grp.id] = computeLayout(grp.rooms)
    return map
  })
  function layoutOf(buildingId) {
    return buildingLayouts.value[buildingId] || { width: 0, height: 0, positions: [], corridorY: 0, corridorH: 0 }
  }

  // 有實際平面圖標註過的棟別，用「原始圖片的像素尺寸」當 viewBox，
  // 這樣房間的相對間距、比例才會跟實際平面圖一致（不是隨便一個正方形畫布）。
  // 合力居跟愛加倍是畫在同一張圖上量出來的座標，所以共用同一組尺寸。
  const REAL_CANVAS = {
    A: { w: 1365, h: 768 },
    B: { w: 1195, h: 896 },
    C: { w: 1195, h: 896 },
  }

  // 把「房間中心點座標」轉成「房間方塊」的線框圖排版：
  // 1. 先依 y 座標把房間分成幾排（同一排代表左右相鄰）
  // 2. 排內依 x 座標排序，相鄰房間如果間距夠近就以中點為共用牆（貼在一起，像真的隔間牆）；
  //    間距太遠（樓梯間、走廊轉角等）就保留原本的間隙，不會硬黏在一起
  // 3. 排與排之間的上下邊界用同樣的邏輯處理
  // 這樣畫出來是彼此相連的房間方塊，而不是各自漂浮的小色塊。
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
    rows.forEach(row => {
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

  function realLayoutOf(grp) {
    const canvas = REAL_CANVAS[grp.id]
    const positioned = grp.rooms.filter(r => r.posX != null && r.posY != null)
    if (!canvas || positioned.length === 0) {
      return { width: 0, height: 0, positions: [], connectors: [], corridorBands: [], walls: [], doors: [], minX: 0, maxX: 0 }
    }
    return {
      width: canvas.w,
      height: canvas.h,
      ...buildWireframe(positioned, canvas.w, canvas.h),
    }
  }

  function activeBookingForRoom(roomId) {
    return bookings.value
      .filter(x => x.roomId === roomId && x.status === 'confirmed' && today >= x.checkIn && today < x.checkOut)[0] || null
  }
  function tileClass(r) {
    if (!r.active) return 'tile-inactive'
    return activeBookingForRoom(r.id) ? 'tile-occupied' : 'tile-vacant'
  }
  function tileLabel(r) {
    if (!r.active) return '已下架'
    return activeBookingForRoom(r.id) ? '今日住房中' : '空房可用'
  }

  /* ---------------- 房間詳情 ---------------- */

  const detailTarget = ref(null)
  function openRoomDetail(grp, room) {
    detailTarget.value = { room, buildingId: grp.id, buildingName: grp.name }
  }
  const detailBookings = computed(() => {
    if (!detailTarget.value) return []
    return bookings.value
      .filter(b => b.roomId === detailTarget.value.room.id && b.status !== 'cancelled')
      .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))
  })
  function statusLabel(s) {
    return { unassigned: '待指派', pending: '待確認', confirmed: '已確認', completed: '已退房', cancelled: '已取消' }[s] || s
  }
  function statusClass(s) {
    return {
      unassigned: 'bg-sky-100 text-sky-700',
      pending:    'bg-amber-100 text-amber-700',
      confirmed:  'bg-emerald-100 text-emerald-700',
      completed:  'bg-stone-200 text-stone-600',
      cancelled:  'bg-rose-100 text-rose-700',
    }[s] || 'bg-stone-100 text-stone-600'
  }

  /* ---------------- 棟別 CRUD ---------------- */

  const buildingModal = reactive({ open: false, id: null, name: '' })
  function openAddBuilding() {
    buildingModal.open = true; buildingModal.id = null; buildingModal.name = ''; modalError.value = ''
  }
  function openEditBuilding(b) {
    buildingModal.open = true; buildingModal.id = b.id; buildingModal.name = b.name; modalError.value = ''
  }
  async function saveBuildingModal() {
    if (!buildingModal.name.trim()) { modalError.value = '請輸入棟別名稱'; return }
    saving.value = true
    try {
      const body = { name: buildingModal.name.trim() }
      if (buildingModal.id) body.id = buildingModal.id
      await fetch(`${ROOMS_BASE()}/building/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      buildingModal.open = false
      await fetchAll()
    } catch (e) { console.error(e); modalError.value = '儲存失敗，請稍後再試' }
    finally { saving.value = false }
  }
  async function deleteBuildingConfirm(b) {
    if (!confirm(`確定要刪除棟別「${b.name}」嗎？底下所有房間也會一併刪除。`)) return
    try {
      await fetch(`${ROOMS_BASE()}/building/${b.id}`, { method: 'DELETE' })
      await fetchAll()
    } catch (e) { console.error(e) }
  }

  /* ---------------- 房間 CRUD ---------------- */

  const roomModal = reactive({
    open: false, buildingId: null, buildingName: '', originalId: null,
    id: '', type: '', capacity: 2, bed: '', price: 0, active: true,
  })
  function openAddRoom(grp) {
    roomModal.open = true
    roomModal.buildingId = grp.id; roomModal.buildingName = grp.name
    roomModal.originalId = null
    roomModal.id = ''; roomModal.type = ''; roomModal.capacity = 2; roomModal.bed = ''; roomModal.price = 0; roomModal.active = true
    modalError.value = ''
  }
  function openEditRoom(grp, r) {
    roomModal.open = true
    roomModal.buildingId = grp.id; roomModal.buildingName = grp.name
    roomModal.originalId = r.id
    roomModal.id = r.id; roomModal.type = r.type; roomModal.capacity = r.capacity
    roomModal.bed = r.bed; roomModal.price = r.price; roomModal.active = r.active
    modalError.value = ''
  }
  async function saveRoomModal() {
    if (!roomModal.id.trim()) { modalError.value = '請輸入房號'; return }
    if (!roomModal.type.trim()) { modalError.value = '請輸入房型'; return }
    saving.value = true
    try {
      const body = {
        buildingId: roomModal.buildingId,
        id: roomModal.id.trim(),
        type: roomModal.type.trim(),
        capacity: roomModal.capacity,
        bed: roomModal.bed.trim(),
        price: roomModal.price,
        active: roomModal.active,
      }
      await fetch(`${ROOMS_BASE()}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      roomModal.open = false
      await fetchAll()
    } catch (e) { console.error(e); modalError.value = '儲存失敗，請稍後再試' }
    finally { saving.value = false }
  }
  async function deleteRoomConfirm(grp, r) {
    if (!confirm(`確定要刪除房間「${r.id}」嗎？`)) return
    try {
      await fetch(`${ROOMS_BASE()}/remove/${grp.id}/${r.id}`, { method: 'DELETE' })
      await fetchAll()
    } catch (e) { console.error(e) }
  }
  async function quickToggleActive(buildingId, r) {
    const nextActive = !r.active
    r.active = nextActive // 先在畫面上即時反應
    try {
      await fetch(`${ROOMS_BASE()}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId, id: r.id, type: r.type, capacity: r.capacity, bed: r.bed, price: r.price, active: nextActive }),
      })
    } catch (e) { console.error(e); r.active = !nextActive }
  }

  onMounted(fetchAll)
</script>

<style scoped>
  .pill-btn {
    flex-shrink: 0;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text-muted);
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
  }
  .pill-btn:hover { border-color: var(--accent); color: var(--text); }
  .pill-btn.border-dashed { border-style: dashed; background: transparent; }
  .pill-active {
    background: #15803d;
    border-color: #15803d;
    color: #fff;
  }
  .pill-active:hover { border-color: #15803d; color: #fff; }
  .segmented {
    display: flex;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
  }
  .segmented button {
    border: none;
    background: transparent;
    color: var(--text-muted);
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 700;
  }
  .segmented button:hover { background: var(--border-light); color: var(--text); }
  .seg-active, .seg-active:hover {
    background: #15803d;
    color: #fff;
  }
  .building-badge {
    width: 24px; height: 24px; border-radius: 6px;
    background: rgba(21, 128, 61, .12); color: #15803d;
    display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-weight: 700; flex-shrink: 0;
  }
  .icon-btn {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-hint);
    opacity: .75;
  }
  .icon-btn:hover { opacity: 1; }
  .toggle {
    position: relative; width: 36px; height: 20px; border-radius: 999px;
    background: var(--border); border: none; flex-shrink: 0;
  }
  .toggle-on { background: #22c55e; }
  .toggle::after {
    content: ""; position: absolute; top: 2px; left: 2px;
    width: 16px; height: 16px; border-radius: 50%; background: #fff;
    transition: left .15s;
  }
  .toggle-on::after { left: 18px; }
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
  /* 房間狀態用邊框顏色表示（功能性分類色，不隨深色模式變動），
     底色維持線框圖的中性色，滑鼠移上去邊框會變粗、發亮，而不是整塊變成按鈕感的實心色塊 */
  .room-rect.tile-vacant   { stroke: #10b981; }
  .room-rect.tile-occupied { stroke: #3b82f6; }
  .room-rect.tile-inactive { stroke: #a8a29e; stroke-dasharray: 3 2; }
  .room-group:hover .room-rect.tile-vacant   { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(16,185,129,.9)); }
  .room-group:hover .room-rect.tile-occupied { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(59,130,246,.9)); }
  .room-group:hover .room-rect.tile-inactive { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(168,162,158,.9)); }
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
  .room-status.tile-vacant   { fill: #059669; }
  .room-status.tile-occupied { fill: #2563eb; }
  .room-status.tile-inactive { fill: #78716c; }
  .room-block-num {
    font-size: 9.5px;
    font-weight: 700;
    fill: var(--text);
    pointer-events: none;
  }
  .dot {
    width: 9px; height: 9px; border-radius: 3px; display: inline-block;
    margin-right: 5px; vertical-align: middle;
  }
  .status-badge {
    font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
  }
  .btn-plain {
    padding: 7px 14px; border-radius: 8px; background: var(--surface2); color: var(--text-muted); font-size: 13px; font-weight: 600;
  }
  .btn-plain:hover { background: var(--bg); }
  .btn-primary {
    padding: 7px 14px; border-radius: 8px; background: #15803d; color: #fff; font-size: 13px; font-weight: 700;
  }
  .btn-primary:disabled { opacity: .5; }
</style>
