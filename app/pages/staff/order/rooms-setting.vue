<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="max-w-4xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:15px">🏨</div>
        <div class="flex-1">
          <h1 class="font-bold text-base-c leading-none" style="font-size:16px">房間管理</h1>
        </div>
        <span class="text-hint-c" style="font-size:13px">共 {{ totalRooms }} 間・上架 {{ activeRooms }} 間</span>
      </div>
    </header>

    <div class="max-w-4xl mx-auto px-3 sm:px-4 py-4">

      <div v-if="loading" class="text-center py-8 text-hint-c" style="font-size:14px">載入中...</div>

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
            <button :class="viewMode === 'list' ? 'seg-active' : ''" :style="viewMode === 'list' ? segActiveStyle : ''" @click="viewMode = 'list'">列表檢視</button>
            <button :class="viewMode === 'floorplan' ? 'seg-active' : ''" :style="viewMode === 'floorplan' ? segActiveStyle : ''" @click="viewMode = 'floorplan'">平面圖檢視</button>
            <button :class="viewMode === 'shape' ? 'seg-active' : ''" :style="viewMode === 'shape' ? segActiveStyle : ''" @click="viewMode = 'shape'">矩形對應</button>
          </div>
        </div>

        <!-- 列表檢視 -->
        <div v-if="viewMode === 'list'" class="bg-surface rounded-2xl border border-light-c shadow-sm p-4">
          <div v-for="grp in visibleBuildings" :key="grp.id" class="mb-6 last:mb-0">
            <div class="flex items-center gap-2 mb-2">
              <span class="building-badge">{{ grp.name.charAt(0) }}</span>
              <h3 class="font-bold text-base-c" style="font-size:15px">{{ grp.name }}</h3>
              <span class="text-hint-c" style="font-size:12.5px">共 {{ grp.rooms.length }} 間</span>
              <span class="icon-btn text-hint-c ml-1" @click="openEditBuilding(grp)">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </span>
              <span class="icon-btn text-hint-c" @click="deleteBuildingConfirm(grp)">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </span>
            </div>
            <table class="w-full">
              <thead>
              <tr class="text-hint-c text-left" style="font-size:12px">
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
              <tr v-for="r in grp.rooms" :key="r.id" class="border-t border-light-c" style="font-size:13.5px">
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

        <!-- 平面圖檢視：改用共用的 RoomFloorplan 元件（跟訂房管理共用同一份牆面/座標邏輯，避免兩邊各刻一份、版本兜不起來） -->
        <div v-else-if="viewMode === 'floorplan'" class="bg-surface rounded-2xl border border-light-c shadow-sm p-4">
          <div v-for="grp in visibleBuildings" :key="grp.id" class="mb-8 last:mb-0">
            <div class="flex items-center gap-2 mb-2">
              <span class="building-badge">{{ grp.name.charAt(0) }}</span>
              <h3 class="font-bold text-base-c" style="font-size:15px">{{ grp.name }}</h3>
              <span class="text-hint-c" style="font-size:12.5px">共 {{ grp.rooms.length }} 間</span>
            </div>
            <RoomFloorplan
              :building="grp"
              :bookings="bookings"
              @select="room => room && openRoomDetail(grp, room)"
            />
          </div>
          <div class="flex flex-wrap gap-4 text-hint-c mt-2" style="font-size:12.5px">
            <span><span class="dot" style="background:#10b981"></span>空房可用</span>
            <span><span class="dot" style="background:#3b82f6"></span>今日住房中</span>
            <span><span class="dot" style="background:#a8a29e"></span>已下架</span>
            <span>點擊房間可查看詳情與快速編輯</span>
          </div>
          <p class="text-hint-c mt-2" style="font-size:12px">＊快樂運動館、合力居、愛加倍已依實際平面圖比例定位；懇親房目前無座標資料，暫以走廊示意圖顯示</p>
        </div>

        <!-- 矩形對應：指定房間 shapeId 對應，或直接拖拽調整矩形/線條位置 -->
        <div v-else class="bg-surface rounded-2xl border border-light-c shadow-sm p-4">
          <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <p class="text-hint-c" style="font-size:13px">
              {{ shapeEditMode === 'assign'
              ? '點一下矩形，指定它對應到哪間房號；已對應的矩形會顯示房號並改成綠色，未對應的矩形顯示原始矩形 id。'
              : '拖拽矩形/線條調整位置；選取後拖右下角小方塊同時調整寬高、拖四邊中間的控制點只調整那一邊、拖端點調整線條長度，下方也可以直接輸入精確數字；選取後也可以用方向鍵移動位置、Shift + 方向鍵調整大小/長度。' }}
            </p>
            <div class="segmented">
              <button :class="shapeEditMode === 'assign' ? 'seg-active' : ''" :style="shapeEditMode === 'assign' ? segActiveStyle : ''" @click="shapeEditMode = 'assign'; selectedShapeId = null">指定房間</button>
              <button :class="shapeEditMode === 'edit' ? 'seg-active' : ''" :style="shapeEditMode === 'edit' ? segActiveStyle : ''" @click="shapeEditMode = 'edit'">調整位置</button>
            </div>
          </div>

          <div v-for="grp in visibleBuildings" :key="grp.id" class="mb-8 last:mb-0">
            <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div class="flex items-center gap-2">
                <span class="building-badge">{{ grp.name.charAt(0) }}</span>
                <h3 class="font-bold text-base-c" style="font-size:15px">{{ grp.name }}</h3>
                <span class="text-hint-c" style="font-size:12.5px">已對應 {{ grp.rooms.filter(r => r.shapeId).length }} / {{ grp.rooms.length }} 間</span>
              </div>
              <div v-if="shapeEditMode === 'edit'" class="flex gap-2">
                <button class="mini-btn" @click="addShape(grp.id, 'rect')">+ 矩形</button>
                <button class="mini-btn" @click="addShape(grp.id, 'vline')">+ 垂直線</button>
                <button class="mini-btn" @click="addShape(grp.id, 'hline')">+ 水平線</button>
              </div>
            </div>

            <svg
              v-if="shapesOf(grp.id).length || shapeEditMode === 'edit'"
              :viewBox="`0 0 ${canvasOf(grp.id).w} ${canvasOf(grp.id).h}`"
              class="shape-svg"
            >
              <template v-for="s in shapesOf(grp.id)" :key="s.id">
                <g v-if="s.type === 'vline'">
                  <line
                    :x1="s.x" :y1="s.y1" :x2="s.x" :y2="s.y2"
                    :class="['shape-wall', shapeEditMode === 'edit' ? 'shape-wall-editable' : '', selectedShapeId === s.id ? 'shape-selected' : '']"
                    @pointerdown="onShapePointerDown($event, grp.id, s, 'move-vline')"
                  />
                  <template v-if="shapeEditMode === 'edit' && selectedShapeId === s.id">
                    <circle :cx="s.x" :cy="s.y1" r="6" class="shape-handle" @pointerdown.stop="onShapePointerDown($event, grp.id, s, 'resize-vline-1')" />
                    <circle :cx="s.x" :cy="s.y2" r="6" class="shape-handle" @pointerdown.stop="onShapePointerDown($event, grp.id, s, 'resize-vline-2')" />
                  </template>
                </g>
                <g v-else-if="s.type === 'hline'">
                  <line
                    :x1="s.x1" :y1="s.y" :x2="s.x2" :y2="s.y"
                    :class="['shape-wall', shapeEditMode === 'edit' ? 'shape-wall-editable' : '', selectedShapeId === s.id ? 'shape-selected' : '']"
                    @pointerdown="onShapePointerDown($event, grp.id, s, 'move-hline')"
                  />
                  <template v-if="shapeEditMode === 'edit' && selectedShapeId === s.id">
                    <circle :cx="s.x1" :cy="s.y" r="6" class="shape-handle" @pointerdown.stop="onShapePointerDown($event, grp.id, s, 'resize-hline-1')" />
                    <circle :cx="s.x2" :cy="s.y" r="6" class="shape-handle" @pointerdown.stop="onShapePointerDown($event, grp.id, s, 'resize-hline-2')" />
                  </template>
                </g>
                <g
                  v-else-if="s.type === 'rect'"
                  class="shape-group"
                  @click="shapeEditMode === 'assign' && openShapeAssign(grp, s)"
                >
                  <rect
                    :x="s.x" :y="s.y" :width="s.w" :height="s.h" rx="4"
                    :class="['shape-rect', assignedRoomFor(grp, s.id) ? 'shape-assigned' : '', selectedShapeId === s.id ? 'shape-selected' : '']"
                    @pointerdown="onShapePointerDown($event, grp.id, s, 'move-rect')"
                  />
                  <text
                    :x="s.x + s.w / 2" :y="s.y + s.h / 2"
                    text-anchor="middle" dominant-baseline="central" class="shape-label"
                  >{{ assignedRoomFor(grp, s.id) ? assignedRoomFor(grp, s.id).id : s.id.replace('custom_', 'c') }}</text>
                  <rect
                    v-if="shapeEditMode === 'edit' && selectedShapeId === s.id"
                    :x="s.x + s.w - 7" :y="s.y + s.h - 7" width="14" height="14"
                    class="shape-handle"
                    @pointerdown.stop="onShapePointerDown($event, grp.id, s, 'resize-rect')"
                  />
                  <!-- 四邊中點控制點：可以個別只拖某一邊調整寬或高（不影響對邊），跟右下角那顆同時調寬高不一樣 -->
                  <template v-if="shapeEditMode === 'edit' && selectedShapeId === s.id">
                    <rect
                      :x="s.x + s.w / 2 - 8" :y="s.y - 4" width="16" height="8"
                      class="shape-handle shape-handle-ns"
                      @pointerdown.stop="onShapePointerDown($event, grp.id, s, 'resize-rect-top')"
                    />
                    <rect
                      :x="s.x + s.w / 2 - 8" :y="s.y + s.h - 4" width="16" height="8"
                      class="shape-handle shape-handle-ns"
                      @pointerdown.stop="onShapePointerDown($event, grp.id, s, 'resize-rect-bottom')"
                    />
                    <rect
                      :x="s.x - 4" :y="s.y + s.h / 2 - 8" width="8" height="16"
                      class="shape-handle shape-handle-ew"
                      @pointerdown.stop="onShapePointerDown($event, grp.id, s, 'resize-rect-left')"
                    />
                    <rect
                      :x="s.x + s.w - 4" :y="s.y + s.h / 2 - 8" width="8" height="16"
                      class="shape-handle shape-handle-ew"
                      @pointerdown.stop="onShapePointerDown($event, grp.id, s, 'resize-rect-right')"
                    />
                  </template>
                </g>
              </template>
            </svg>
            <p v-else class="text-hint-c" style="font-size:13px">這個棟別沒有平面圖矩形資料可供對應。</p>
          </div>
        </div>

        <!-- 選取矩形/線條的精確數字編輯面板：固定在畫面下方，不管捲到哪一棟平面圖都看得到、不用再滾動 -->
        <div v-if="shapeEditMode === 'edit' && selectedShapeBuilding" class="shape-panel shape-panel-float">
          <div class="flex items-center justify-between mb-2 gap-2">
            <span class="font-semibold text-base-c" style="font-size:13.5px">
              {{ selectedShapeBuilding.name }}・{{ selectedShapeInGroup(selectedShapeBuilding.id).id }}（{{ shapeTypeLabel[selectedShapeInGroup(selectedShapeBuilding.id).type] }}）
            </span>
            <div class="flex items-center gap-2">
              <button class="mini-btn mini-danger" @click="deleteSelectedShape(selectedShapeBuilding.id)">刪除</button>
              <button class="mini-btn" title="取消選取" @click="selectedShapeId = null">✕ 取消選取</button>
            </div>
          </div>
          <div v-if="selectedShapeInGroup(selectedShapeBuilding.id).type === 'rect'" class="shape-panel-grid">
            <label>X<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).x" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
            <label>Y<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).y" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
            <label>寬<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).w" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
            <label>高<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).h" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
          </div>
          <!-- 四邊個別增減：點一下就調整那一邊，不用拖拉；「＋」＝往外擴、「－」＝往內縮，另外三邊不動 -->
          <div v-if="selectedShapeInGroup(selectedShapeBuilding.id).type === 'rect'" class="shape-edge-controls">
            <div v-for="edge in EDGES" :key="edge.key" class="shape-edge-row">
              <span class="shape-edge-label">{{ edge.label }}</span>
              <button class="mini-btn" @click="adjustShapeEdge(selectedShapeBuilding.id, edge.key, -1)">－</button>
              <button class="mini-btn" @click="adjustShapeEdge(selectedShapeBuilding.id, edge.key, 1)">＋</button>
            </div>
          </div>
          <div v-else-if="selectedShapeInGroup(selectedShapeBuilding.id).type === 'vline'" class="shape-panel-grid">
            <label>X<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).x" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
            <label>Y1<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).y1" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
            <label>Y2<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).y2" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
          </div>
          <div v-else class="shape-panel-grid">
            <label>Y<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).y" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
            <label>X1<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).x1" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
            <label>X2<input type="number" v-model.number="selectedShapeInGroup(selectedShapeBuilding.id).x2" @change="commitSelectedShape(selectedShapeBuilding.id)"></label>
          </div>
        </div>
      </template>
    </div>


    <!-- ===== 棟別 新增/編輯 Modal ===== -->
    <div v-if="buildingModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => buildingModal.open = false)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:16px">{{ buildingModal.id ? '編輯棟別' : '新增棟別' }}</h2>
        <label class="block text-hint-c mb-1" style="font-size:13px">棟別名稱</label>
        <input v-model="buildingModal.name" type="text" class="w-full border border-light-c rounded-lg px-3 py-2 mb-1 bg-surface2 text-base-c" style="font-size:14px" placeholder="例如：快樂運動館學員宿舍" @keyup.enter="saveBuildingModal">
        <p v-if="modalError" class="text-red-500 mb-2" style="font-size:12.5px">{{ modalError }}</p>
        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-plain" @click="buildingModal.open = false">取消</button>
          <button class="btn-primary" :disabled="saving" @click="saveBuildingModal">{{ saving ? '儲存中...' : '儲存' }}</button>
        </div>
      </div>
    </div>

    <!-- ===== 房間 新增/編輯 Modal ===== -->
    <div v-if="roomModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => roomModal.open = false)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:16px">{{ roomModal.id ? '編輯房間' : '新增房間' }}（{{ roomModal.buildingName }}）</h2>

        <label class="block text-hint-c mb-1" style="font-size:13px">房號（作為識別代碼，建立後不可修改）</label>
        <input v-model="roomModal.id" type="text" :disabled="!!roomModal.originalId" class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c disabled:opacity-60" style="font-size:14px" placeholder="例如：A202">

        <label class="block text-hint-c mb-1" style="font-size:13px">房型</label>
        <input v-model="roomModal.type" type="text" class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c" style="font-size:14px" placeholder="例如：雙人雅房">

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">可住人數</label>
            <input v-model.number="roomModal.capacity" type="number" min="1" class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:14px">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">每晚價格</label>
            <input v-model.number="roomModal.price" type="number" min="0" class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:14px">
          </div>
        </div>

        <label class="block text-hint-c mb-1" style="font-size:13px">床型</label>
        <input v-model="roomModal.bed" type="text" class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c" style="font-size:14px" placeholder="例如：雙人床">

        <div class="flex items-center gap-2 mb-1">
          <button class="toggle" :class="roomModal.active ? 'toggle-on' : ''" @click="roomModal.active = !roomModal.active"></button>
          <span class="text-hint-c" style="font-size:13.5px">{{ roomModal.active ? '目前上架中' : '目前已下架' }}</span>
        </div>
        <p v-if="modalError" class="text-red-500 mb-2 mt-2" style="font-size:12.5px">{{ modalError }}</p>

        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-plain" @click="roomModal.open = false">取消</button>
          <button class="btn-primary" :disabled="saving" @click="saveRoomModal">{{ saving ? '儲存中...' : '儲存' }}</button>
        </div>
      </div>
    </div>

    <!-- ===== 房間詳情 Modal（平面圖點擊） ===== -->
    <div v-if="detailTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => detailTarget = null)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:16px">{{ detailTarget.room.id }} · {{ detailTarget.buildingName }}</h2>
        <div class="bg-surface2 rounded-lg p-3 mb-3" style="font-size:13.5px">
          <div class="flex justify-between py-0.5"><span class="text-hint-c">房型</span><span class="text-base-c">{{ detailTarget.room.type }}</span></div>
          <div class="flex justify-between py-0.5"><span class="text-hint-c">可住人數</span><span class="text-base-c">{{ detailTarget.room.capacity }} 人</span></div>
          <div class="flex justify-between py-0.5"><span class="text-hint-c">床型</span><span class="text-base-c">{{ detailTarget.room.bed }}</span></div>
          <div class="flex justify-between py-0.5"><span class="text-hint-c">價格</span><span class="text-base-c">NT$ {{ detailTarget.room.price.toLocaleString() }}/晚</span></div>
        </div>
        <div class="mb-3">
          <p class="font-semibold text-hint-c mb-1.5" style="font-size:13px">相關訂單</p>
          <p v-if="detailBookings.length === 0" class="text-hint-c" style="font-size:13px">目前沒有相關訂單</p>
          <div v-for="b in detailBookings" :key="b.id" class="flex justify-between items-center py-1.5 border-t border-light-c" style="font-size:13px">
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

    <!-- ===== 矩形對應 Modal ===== -->
    <div v-if="shapeAssign.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => shapeAssign.open = false)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:16px">矩形「{{ shapeAssign.shapeId }}」對應哪間房？</h2>
        <label class="block text-hint-c mb-1" style="font-size:13px">房號</label>
        <select v-model="shapeAssign.roomId" class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c" style="font-size:14px">
          <option value="">－ 不指定（清除對應）－</option>
          <option v-for="r in shapeAssignRooms" :key="r.id" :value="r.id">
            {{ r.id }}（{{ r.type }}）{{ r.shapeId && r.shapeId !== shapeAssign.shapeId ? '・已對應 ' + r.shapeId : '' }}
          </option>
        </select>
        <p class="text-hint-c mb-2" style="font-size:12.5px">如果選的房間已經對應到別的矩形，會自動把舊的對應清掉，避免一個矩形同時綁兩間房。</p>
        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-plain" @click="shapeAssign.open = false">取消</button>
          <button class="btn-primary" :disabled="saving" @click="saveShapeAssign">{{ saving ? '儲存中...' : '儲存' }}</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
  import { useFloorplanShapes } from '~/composables/useFloorplanShapes'

  definePageMeta({ layout: 'staff', requiredPermission: 'booking.rooms' })

  const commonStore = useCommonStore()
  const ROOMS_BASE    = () => commonStore.data.main_url + '/holy/rooms/settings'
  const BOOKINGS_BASE = () => commonStore.data.main_url + '/holy/rooms/bookings'

  // Modal 背景點擊關閉：只有「mousedown 跟 click 都落在背景本身」才關閉。
  // 若只用 @click.self，在 Modal 內容裡按住滑鼠（例如選取文字、拖曳 input）
  // 再放開到背景外面，瀏覽器合成的 click 事件 target 會被判成背景本身，
  // 導致誤關閉；改成先在 mousedown 記錄是否真的點在背景上，click 時再一併確認。
  const backdropMouseDownOnSelf = ref(false)
  function onBackdropMousedown(e) {
    backdropMouseDownOnSelf.value = e.target === e.currentTarget
  }
  function onBackdropClick(e, close) {
    if (backdropMouseDownOnSelf.value && e.target === e.currentTarget) close()
    backdropMouseDownOnSelf.value = false
  }

  const loading  = ref(false)
  const saving   = ref(false)
  const modalError = ref('')

  const buildings = ref([])   // [{id, name, rooms:[...]}]
  const bookings  = ref([])   // 全部訂單，用來判斷「今日住房中」與房間詳情的相關訂單

  const buildingFilter = ref('all')
  const viewMode = ref('list')
  // 行內樣式備援：避免外部/全域 CSS 蓋掉 .seg-active 的優先權，導致選中狀態沒有亮起
  const segActiveStyle = { background: '#15803d', color: '#fff' }

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

  /* ---------------- 矩形對應設置 ----------------
     「指定房間」：把平面圖矩形手動指定給某間實際房間，存成房間的 shapeId 欄位；
                  RoomFloorplan 元件之後就會直接用這個矩形畫出房間實際輪廓。
     「調整位置」：直接在畫面上拖拽矩形/線條調整座標，即時存到後端資料庫。 */
  const { shapesOf, canvasOf, saveShape: saveShapeGeometry, deleteShape: deleteShapeGeometry } = useFloorplanShapes()

  function assignedRoomFor(grp, shapeId) {
    return grp.rooms.find(r => r.shapeId === shapeId) || null
  }

  const shapeAssign = reactive({ open: false, buildingId: null, shapeId: '', roomId: '' })
  function openShapeAssign(grp, shape) {
    const current = assignedRoomFor(grp, shape.id)
    shapeAssign.open = true
    shapeAssign.buildingId = grp.id
    shapeAssign.shapeId = shape.id
    shapeAssign.roomId = current ? current.id : ''
  }
  const shapeAssignRooms = computed(() => {
    const grp = buildings.value.find(b => b.id === shapeAssign.buildingId)
    return grp ? grp.rooms : []
  })
  async function saveShapeAssign() {
    saving.value = true
    try {
      const grp = buildings.value.find(b => b.id === shapeAssign.buildingId)
      const prevOwner = grp && assignedRoomFor(grp, shapeAssign.shapeId)
      // 這個矩形原本對應到別的房間，先解除舊的對應，避免一個矩形同時被兩間房間占用
      if (prevOwner && prevOwner.id !== shapeAssign.roomId) {
        await fetch(`${ROOMS_BASE()}/shape`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buildingId: shapeAssign.buildingId, id: prevOwner.id, shapeId: '' }),
        })
      }
      if (shapeAssign.roomId) {
        await fetch(`${ROOMS_BASE()}/shape`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buildingId: shapeAssign.buildingId, id: shapeAssign.roomId, shapeId: shapeAssign.shapeId }),
        })
      }
      shapeAssign.open = false
      await fetchAll()
    } catch (e) { console.error(e) }
    finally { saving.value = false }
  }

  /* ---------------- 矩形對應：調整位置模式（拖拽 / 新增 / 刪除） ---------------- */
  const shapeEditMode = ref('assign') // 'assign' 指定房間 ・ 'edit' 調整位置
  const selectedShapeId = ref(null)
  const shapeTypeLabel = { rect: '矩形', vline: '垂直線', hline: '水平線' }

  function selectedShapeInGroup(buildingId) {
    if (!selectedShapeId.value) return null
    return shapesOf(buildingId).find(s => s.id === selectedShapeId.value) || null
  }
  // 選取的矩形/線條屬於哪個棟別 —— 下方浮動控制面板要用，這樣不管在哪棟平面圖選的，
  // 面板都能找到正確棟別繼續操作，且面板本身固定在畫面上不用跟著捲動
  const selectedShapeBuilding = computed(() => {
    if (!selectedShapeId.value) return null
    return buildings.value.find(b => shapesOf(b.id).some(s => s.id === selectedShapeId.value)) || null
  })

  // 把滑鼠螢幕座標換算成 SVG viewBox 座標（因為 svg 是用 width:100% 縮放顯示，不是 1:1 像素）
  function svgPointFromClient(svgEl, clientX, clientY) {
    if (!svgEl) return { x: 0, y: 0 }
    const rect = svgEl.getBoundingClientRect()
    const vb = svgEl.viewBox.baseVal
    if (!rect.width || !rect.height) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left) * (vb.width / rect.width),
      y: (clientY - rect.top) * (vb.height / rect.height),
    }
  }
  function round1(n) { return Math.round(n) }

  const dragState = reactive({ active: false, buildingId: null, shapeId: null, mode: null, svgEl: null, startPointer: { x: 0, y: 0 }, startGeom: {}, moved: false })

  function onShapePointerDown(e, buildingId, shape, mode) {
    if (shapeEditMode.value !== 'edit') return
    e.stopPropagation()
    e.preventDefault()
    const svgEl = e.target.closest('svg')
    dragState.active = true
    dragState.buildingId = buildingId
    dragState.shapeId = shape.id
    dragState.mode = mode
    dragState.svgEl = svgEl
    dragState.startPointer = svgPointFromClient(svgEl, e.clientX, e.clientY)
    dragState.startGeom = { x: shape.x, y: shape.y, w: shape.w, h: shape.h, x1: shape.x1, x2: shape.x2, y1: shape.y1, y2: shape.y2 }
    dragState.moved = false
    selectedShapeId.value = shape.id
    window.addEventListener('pointermove', onShapeWindowPointerMove)
    window.addEventListener('pointerup', onShapeWindowPointerUp)
  }
  function onShapeWindowPointerMove(e) {
    if (!dragState.active) return
    const p = svgPointFromClient(dragState.svgEl, e.clientX, e.clientY)
    const dx = p.x - dragState.startPointer.x
    const dy = p.y - dragState.startPointer.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.moved = true
    const shape = shapesOf(dragState.buildingId).find(s => s.id === dragState.shapeId)
    if (!shape) return
    const g = dragState.startGeom
    if (dragState.mode === 'move-rect') {
      shape.x = round1(g.x + dx); shape.y = round1(g.y + dy)
    } else if (dragState.mode === 'resize-rect') {
      shape.w = Math.max(10, round1(g.w + dx)); shape.h = Math.max(10, round1(g.h + dy))
    } else if (dragState.mode === 'resize-rect-right') {
      shape.w = Math.max(10, round1(g.w + dx))
    } else if (dragState.mode === 'resize-rect-left') {
      const newW = Math.max(10, round1(g.w - dx))
      shape.x = round1(g.x + (g.w - newW)); shape.w = newW
    } else if (dragState.mode === 'resize-rect-bottom') {
      shape.h = Math.max(10, round1(g.h + dy))
    } else if (dragState.mode === 'resize-rect-top') {
      const newH = Math.max(10, round1(g.h - dy))
      shape.y = round1(g.y + (g.h - newH)); shape.h = newH
    } else if (dragState.mode === 'move-vline') {
      shape.x = round1(g.x + dx); shape.y1 = round1(g.y1 + dy); shape.y2 = round1(g.y2 + dy)
    } else if (dragState.mode === 'resize-vline-1') {
      shape.y1 = round1(g.y1 + dy)
    } else if (dragState.mode === 'resize-vline-2') {
      shape.y2 = round1(g.y2 + dy)
    } else if (dragState.mode === 'move-hline') {
      shape.y = round1(g.y + dy); shape.x1 = round1(g.x1 + dx); shape.x2 = round1(g.x2 + dx)
    } else if (dragState.mode === 'resize-hline-1') {
      shape.x1 = round1(g.x1 + dx)
    } else if (dragState.mode === 'resize-hline-2') {
      shape.x2 = round1(g.x2 + dx)
    }
  }
  async function onShapeWindowPointerUp() {
    if (!dragState.active) return
    window.removeEventListener('pointermove', onShapeWindowPointerMove)
    window.removeEventListener('pointerup', onShapeWindowPointerUp)
    const buildingId = dragState.buildingId
    const moved = dragState.moved
    const shape = shapesOf(buildingId).find(s => s.id === dragState.shapeId)
    dragState.active = false
    if (shape && moved) {
      try { await saveShapeGeometry(buildingId, shape) }
      catch (e) { console.error(e) }
    }
  }

  // 精確數字輸入框失焦/送出時呼叫，把目前的座標存到後端
  async function commitSelectedShape(buildingId) {
    const shape = selectedShapeInGroup(buildingId)
    if (!shape) return
    try { await saveShapeGeometry(buildingId, shape) }
    catch (e) { console.error(e) }
  }

  async function addShape(buildingId, type) {
    const canvas = canvasOf(buildingId)
    let shape
    if (type === 'rect') shape = { type: 'rect', x: Math.round(canvas.w / 2 - 40), y: Math.round(canvas.h / 2 - 30), w: 80, h: 60 }
    else if (type === 'vline') shape = { type: 'vline', x: Math.round(canvas.w / 2), y1: Math.round(canvas.h / 2 - 40), y2: Math.round(canvas.h / 2 + 40) }
    else shape = { type: 'hline', y: Math.round(canvas.h / 2), x1: Math.round(canvas.w / 2 - 40), x2: Math.round(canvas.w / 2 + 40) }
    try {
      const saved = await saveShapeGeometry(buildingId, shape)
      selectedShapeId.value = saved.id
    } catch (e) { console.error(e) }
  }
  async function deleteSelectedShape(buildingId) {
    if (!selectedShapeId.value) return
    if (!confirm('確定要刪除這個矩形/線條嗎？如果有房間對應到它，那間房的對應也會一併清除。')) return
    try {
      await deleteShapeGeometry(buildingId, selectedShapeId.value)
      selectedShapeId.value = null
    } catch (e) { console.error(e) }
  }

  /* ---------------- 矩形對應：四邊個別增減控制面板（點按鈕，不用拖拉） ----------------
     dir = 1 表示這一邊往外擴（矩形變大）、dir = -1 表示往內縮（矩形變小），另外三邊固定不動。
     跟拖拉四邊中點控制點是同一種調整邏輯，只是用按鈕以固定步進值觸發，方便微調到精確位置。 */
  const EDGES = [
    { key: 'top', label: '上邊' },
    { key: 'bottom', label: '下邊' },
    { key: 'left', label: '左邊' },
    { key: 'right', label: '右邊' },
  ]
  const EDGE_BTN_STEP = 2
  function adjustShapeEdge(buildingId, edge, dir) {
    const shape = selectedShapeInGroup(buildingId)
    if (!shape || shape.type !== 'rect') return
    const delta = dir * EDGE_BTN_STEP
    if (edge === 'top') {
      const newH = Math.max(10, round1(shape.h + delta))
      shape.y = round1(shape.y - (newH - shape.h))
      shape.h = newH
    } else if (edge === 'bottom') {
      shape.h = Math.max(10, round1(shape.h + delta))
    } else if (edge === 'left') {
      const newW = Math.max(10, round1(shape.w + delta))
      shape.x = round1(shape.x - (newW - shape.w))
      shape.w = newW
    } else if (edge === 'right') {
      shape.w = Math.max(10, round1(shape.w + delta))
    }
    commitSelectedShape(buildingId)
  }

  /* ---------------- 矩形對應：方向鍵調整（跟拖拽共用同一組 shape 物件與存檔邏輯） ----------------
     只有在「調整位置」模式下、有選取矩形/線條時才生效；輸入框內打字時（例如上面的精確數字欄位）不搶方向鍵。
     移動/調整大小時先在畫面上即時反應，停止按鍵一小段時間後才真的送出存檔，避免連續按時瘋狂打 API。 */
  const SHAPE_MOVE_STEP = 1  // 方向鍵：每按一下移動幾 px
  const SHAPE_SIZE_STEP = 2  // Shift + 方向鍵：每按一下調整幾 px 的大小/長度
  let shapeKeySaveTimer = null
  function scheduleShapeKeySave(buildingId) {
    clearTimeout(shapeKeySaveTimer)
    shapeKeySaveTimer = setTimeout(() => commitSelectedShape(buildingId), 400)
  }
  function handleShapeKeydown(e) {
    if (viewMode.value !== 'shape' || shapeEditMode.value !== 'edit' || !selectedShapeId.value) return
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return // 精確數字欄位打字時不搶鍵
    const grp = buildings.value.find(b => shapesOf(b.id).some(s => s.id === selectedShapeId.value))
    if (!grp) return
    const shape = shapesOf(grp.id).find(s => s.id === selectedShapeId.value)
    if (!shape) return
    e.preventDefault()
    const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0

    if (e.shiftKey) {
      // Shift + 方向鍵：調整大小／長度
      if (shape.type === 'rect') {
        shape.w = Math.max(10, round1(shape.w + dx * SHAPE_SIZE_STEP))
        shape.h = Math.max(10, round1(shape.h + dy * SHAPE_SIZE_STEP))
      } else if (shape.type === 'vline') {
        shape.y2 = round1(shape.y2 + dy * SHAPE_SIZE_STEP)
      } else if (shape.type === 'hline') {
        shape.x2 = round1(shape.x2 + dx * SHAPE_SIZE_STEP)
      }
    } else {
      // 方向鍵：移動位置（整個矩形/線條一起平移）
      if (shape.type === 'rect') {
        shape.x = round1(shape.x + dx * SHAPE_MOVE_STEP)
        shape.y = round1(shape.y + dy * SHAPE_MOVE_STEP)
      } else if (shape.type === 'vline') {
        shape.x = round1(shape.x + dx * SHAPE_MOVE_STEP)
        shape.y1 = round1(shape.y1 + dy * SHAPE_MOVE_STEP)
        shape.y2 = round1(shape.y2 + dy * SHAPE_MOVE_STEP)
      } else if (shape.type === 'hline') {
        shape.y = round1(shape.y + dy * SHAPE_MOVE_STEP)
        shape.x1 = round1(shape.x1 + dx * SHAPE_MOVE_STEP)
        shape.x2 = round1(shape.x2 + dx * SHAPE_MOVE_STEP)
      }
    }
    scheduleShapeKeySave(grp.id)
  }
  onMounted(() => window.addEventListener('keydown', handleShapeKeydown))
  onUnmounted(() => {
    window.removeEventListener('keydown', handleShapeKeydown)
    clearTimeout(shapeKeySaveTimer)
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
    font-size: 13.5px;
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
    font-size: 13.5px;
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
    font-size: 12.5px; font-weight: 700; flex-shrink: 0;
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
  .shape-svg {
    width: 100%;
    height: auto;
    display: block;
    border: 1px solid var(--border-light);
    border-radius: 8px;
  }
  .shape-wall {
    stroke: var(--border-light);
    stroke-width: 1.5;
  }
  .shape-group {
    cursor: pointer;
  }
  .shape-rect {
    fill: var(--surface2);
    stroke: var(--border);
    stroke-width: 1.5;
    transition: fill .15s, stroke .15s, stroke-width .15s;
    touch-action: none;
  }
  .shape-group:hover .shape-rect {
    stroke: #15803d;
    stroke-width: 2.5;
  }
  .shape-rect.shape-assigned {
    fill: rgba(21, 128, 61, .12);
    stroke: #15803d;
  }
  .shape-label {
    font-size: 14px;
    font-weight: 700;
    fill: var(--text);
    pointer-events: none;
  }
  .shape-wall-editable {
    cursor: move;
    stroke-width: 3;
    touch-action: none;
  }
  .shape-selected {
    stroke: #2563eb !important;
    stroke-width: 3 !important;
    filter: drop-shadow(0 0 4px rgba(37, 99, 235, .7));
  }
  .shape-handle {
    fill: #2563eb;
    stroke: #fff;
    stroke-width: 1.5;
    cursor: nwse-resize;
    touch-action: none;
  }
  .shape-handle-ns {
    cursor: ns-resize;
  }
  .shape-handle-ew {
    cursor: ew-resize;
  }
  .shape-panel {
    margin-top: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--surface2);
    border: 1px solid var(--border);
  }
  /* 浮動版：固定貼在畫面下方，不管捲到哪一棟平面圖都看得到，不用再滾動到最下面才能調整 */
  .shape-panel-float {
    position: fixed;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    width: min(560px, calc(100vw - 32px));
    max-height: 40vh;
    overflow-y: auto;
    z-index: 25;
    background: var(--surface);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
    border: 1px solid var(--border);
  }
  .shape-panel-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    font-size: 13px;
    color: var(--text-hint);
  }
  .shape-panel-grid label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .shape-panel-grid input {
    border: 1px solid var(--border-light);
    border-radius: 6px;
    padding: 4px 6px;
    background: var(--surface);
    color: var(--text);
    font-size: 13.5px;
    width: 100%;
  }
  .shape-edge-controls {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px 12px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--border-light);
  }
  .shape-edge-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .shape-edge-label {
    font-size: 13px;
    color: var(--text-hint);
    width: 34px;
    flex-shrink: 0;
  }
  .shape-edge-row .mini-btn {
    padding: 3px 10px;
  }
  .mini-btn {
    font-size: 12.5px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
  }
  .mini-btn:hover { background: var(--border-light); }
  .mini-btn.mini-danger {
    border-color: #fca5a5;
    color: #b91c1c;
  }
  .mini-btn.mini-danger:hover { background: #fee2e2; }
  .dot {
    width: 9px; height: 9px; border-radius: 3px; display: inline-block;
    margin-right: 5px; vertical-align: middle;
  }
  .status-badge {
    font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
  }
  .btn-plain {
    padding: 7px 14px; border-radius: 8px; background: var(--surface2); color: var(--text-muted); font-size: 14px; font-weight: 600;
  }
  .btn-plain:hover { background: var(--bg); }
  .btn-primary {
    padding: 7px 14px; border-radius: 8px; background: #15803d; color: #fff; font-size: 14px; font-weight: 700;
  }
  .btn-primary:disabled { opacity: .5; }
</style>
