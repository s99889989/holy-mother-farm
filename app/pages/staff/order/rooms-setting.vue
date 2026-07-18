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

        <!-- 平面圖檢視 -->
        <div v-else class="bg-surface rounded-2xl border border-light-c shadow-sm p-4">
          <div v-for="grp in visibleBuildings" :key="grp.id" class="mb-6 last:mb-0">
            <div class="flex items-center gap-2 mb-2">
              <span class="building-badge">{{ grp.name.charAt(0) }}</span>
              <h3 class="font-bold text-base-c" style="font-size:14px">{{ grp.name }}</h3>
              <span class="text-hint-c" style="font-size:11.5px">共 {{ grp.rooms.length }} 間</span>
            </div>
            <div class="floor-grid">
              <div
                v-for="r in grp.rooms" :key="r.id"
                class="floor-tile" :class="tileClass(r)"
                @click="openRoomDetail(grp, r)"
              >
                <div class="font-bold text-base-c" style="font-size:15px">{{ r.id }}</div>
                <div class="text-hint-c" style="font-size:10px">{{ r.type }}<br>可住 {{ r.capacity }} 人</div>
                <div class="mt-auto font-bold" :class="tileLabelClass(r)" style="font-size:10.5px">{{ tileLabel(r) }}</div>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-4 text-hint-c mt-4" style="font-size:11.5px">
            <span><span class="dot" style="background:#10b981"></span>空房可用</span>
            <span><span class="dot" style="background:#3b82f6"></span>今日住房中</span>
            <span><span class="dot" style="background:#a8a29e"></span>已下架</span>
            <span>點擊房間可查看詳情與快速編輯</span>
          </div>
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

function activeBookingForRoom(roomId) {
  return bookings.value
    .filter(x => x.roomId === roomId && x.status === 'confirmed' && today >= x.checkIn && today < x.checkOut)[0] || null
}
function tileClass(r) {
  if (!r.active) return 'tile-inactive'
  return activeBookingForRoom(r.id) ? 'tile-occupied' : 'tile-vacant'
}
function tileLabelClass(r) {
  if (!r.active) return 'text-stone-500'
  return activeBookingForRoom(r.id) ? 'text-blue-600' : 'text-emerald-600'
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
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
}
.pill-btn.border-dashed { border-style: dashed; }
.pill-active {
  background: #15803d;
  border-color: #15803d;
  color: #fff;
}
.segmented {
  display: flex;
  background: var(--surface2);
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
.seg-active {
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
.floor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 10px;
}
.floor-tile {
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  min-height: 84px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border: 2px solid transparent;
  transition: transform .12s, box-shadow .12s;
}
.floor-tile:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
/* 房間狀態色屬於功能性分類色，維持固定色階、不隨深色模式變動 */
.tile-vacant   { background: #ecfdf5; border-color: rgba(16,185,129,.3); }
.tile-occupied { background: #eff6ff; border-color: rgba(59,130,246,.35); }
.tile-inactive { background: var(--surface2); opacity: .6; }
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
