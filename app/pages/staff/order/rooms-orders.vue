<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="max-w-5xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">📋</div>
        <div class="flex-1">
          <h1 class="font-bold text-base-c leading-none" style="font-size:15px">訂房管理</h1>
        </div>
      </div>
      <div class="max-w-5xl mx-auto mt-2">
        <div class="segmented w-fit">
          <button :class="tab === 'dashboard' ? 'seg-active' : ''" @click="tab = 'dashboard'">儀表板</button>
          <button :class="tab === 'orders' ? 'seg-active' : ''" @click="tab = 'orders'">訂單管理</button>
          <button :class="tab === 'history' ? 'seg-active' : ''" @click="tab = 'history'">訂房紀錄</button>
        </div>
      </div>
    </header>

    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4">
      <div v-if="loading" class="text-center py-8 text-hint-c" style="font-size:13px">載入中...</div>

      <template v-else>

        <!-- ===================== 儀表板 ===================== -->
        <div v-if="tab === 'dashboard'">
          <div class="stat-grid mb-5">
            <div class="stat-card"><div class="stat-label">房間總數</div><div class="stat-value">{{ rooms.length }}</div></div>
            <div class="stat-card"><div class="stat-label">上架房間</div><div class="stat-value">{{ rooms.filter(r => r.active).length }}</div></div>
            <div class="stat-card"><div class="stat-label">待指派訂單</div><div class="stat-value">{{ countByStatus('unassigned') }}</div></div>
            <div class="stat-card"><div class="stat-label">待確認訂單</div><div class="stat-value">{{ countByStatus('pending') }}</div></div>
            <div class="stat-card"><div class="stat-label">預估總營收</div><div class="stat-value">{{ estRevenue.toLocaleString() }}</div></div>
          </div>

          <div class="panel">
            <h3 class="font-bold text-base-c mb-3" style="font-size:14px">近期入住（依入住日期排序）</h3>
            <table class="w-full">
              <thead>
              <tr class="text-hint-c text-left" style="font-size:11px">
                <th class="py-1.5 font-semibold">房間</th><th class="py-1.5 font-semibold">房客</th>
                <th class="py-1.5 font-semibold">入住</th><th class="py-1.5 font-semibold">退房</th>
                <th class="py-1.5 font-semibold">人數</th><th class="py-1.5 font-semibold">狀態</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="b in upcomingBookings" :key="b.id" class="border-t border-light-c" style="font-size:12.5px">
                <td class="py-2">
                  <span v-if="b.roomId" class="text-base-c">{{ roomLabel(b.roomId) }}</span>
                  <span v-else class="status-badge bg-sky-100 text-sky-700">待指派</span>
                </td>
                <td class="py-2 text-base-c">{{ b.name }}</td>
                <td class="py-2 text-base-c">{{ b.checkIn }}</td>
                <td class="py-2 text-base-c">{{ b.checkOut }}</td>
                <td class="py-2 text-base-c">{{ b.guests }}</td>
                <td class="py-2"><span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span></td>
              </tr>
              <tr v-if="upcomingBookings.length === 0"><td colspan="6" class="text-center text-hint-c py-6" style="font-size:12.5px">目前沒有進行中的訂單</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ===================== 訂單管理 ===================== -->
        <div v-else-if="tab === 'orders'">
          <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div class="flex gap-2 flex-wrap">
              <button class="pill-btn" :class="ordersBuilding === 'all' ? 'pill-active' : ''" @click="ordersBuilding = 'all'">全部棟別</button>
              <button v-for="b in buildings" :key="b.id" class="pill-btn" :class="ordersBuilding === b.id ? 'pill-active' : ''" @click="ordersBuilding = b.id">{{ b.name }}</button>
            </div>
            <div class="segmented">
              <button :class="ordersView === 'list' ? 'seg-active' : ''" @click="ordersView = 'list'">列表檢視</button>
              <button :class="ordersView === 'floorplan' ? 'seg-active' : ''" @click="ordersView = 'floorplan'">平面圖檢視</button>
            </div>
          </div>

          <!-- 列表檢視 -->
          <div v-if="ordersView === 'list'" class="panel">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div class="flex gap-2 flex-wrap">
                <select v-model="ordersStatus" class="select-input">
                  <option value="all">全部（新訂單＋住房中）</option>
                  <option value="unassigned">待指派</option>
                  <option value="pending">待確認</option>
                  <option value="confirmed">已確認（住房中）</option>
                </select>
                <input type="text" v-model="ordersKeyword" placeholder="搜尋房客姓名或訂單編號" class="select-input">
              </div>
              <span class="text-hint-c" style="font-size:12px">共 {{ filteredOrders.length }} 筆</span>
            </div>
            <table class="w-full">
              <thead>
              <tr class="text-hint-c text-left" style="font-size:11px">
                <th class="py-1.5 font-semibold">訂單編號</th><th class="py-1.5 font-semibold">房間</th>
                <th class="py-1.5 font-semibold">房客</th><th class="py-1.5 font-semibold">電話</th>
                <th class="py-1.5 font-semibold">入住</th><th class="py-1.5 font-semibold">退房</th>
                <th class="py-1.5 font-semibold">人數</th><th class="py-1.5 font-semibold">金額</th>
                <th class="py-1.5 font-semibold">狀態</th><th class="py-1.5 font-semibold">操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="b in filteredOrders" :key="b.id" class="border-t border-light-c" style="font-size:12.5px">
                <td class="py-2 text-base-c">{{ b.id }}</td>
                <td class="py-2">
                  <span v-if="b.roomId" class="text-base-c">{{ roomLabel(b.roomId) }}</span>
                  <span v-else class="status-badge bg-sky-100 text-sky-700">待指派</span>
                </td>
                <td class="py-2 text-base-c">{{ b.name }}</td>
                <td class="py-2 text-base-c">{{ b.phone }}</td>
                <td class="py-2 text-base-c">{{ b.checkIn }}</td>
                <td class="py-2 text-base-c">{{ b.checkOut }}</td>
                <td class="py-2 text-base-c">{{ b.guests }}</td>
                <td class="py-2 text-base-c">{{ b.roomId ? ('NT$ ' + bookingTotal(b).toLocaleString()) : '—' }}</td>
                <td class="py-2"><span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span></td>
                <td class="py-2">
                  <div class="flex gap-1 flex-wrap">
                    <template v-if="b.status === 'unassigned' || b.status === 'pending'">
                      <button v-if="!b.roomId" class="mini-btn mini-primary" @click="openAssign(b)">指派房間</button>
                      <template v-else>
                        <button class="mini-btn" @click="openAssign(b)">更換房間</button>
                        <button class="mini-btn mini-primary" @click="setStatus(b.id, 'confirmed')">確認</button>
                      </template>
                      <button class="mini-btn" @click="setStatus(b.id, 'cancelled')">取消</button>
                      <button class="mini-btn mini-danger" @click="removeBooking(b.id)">刪除</button>
                    </template>
                    <template v-else-if="b.status === 'confirmed'">
                      <button class="mini-btn" @click="setStatus(b.id, 'completed')">設為已退房</button>
                      <button class="mini-btn" @click="setStatus(b.id, 'cancelled')">取消</button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredOrders.length === 0"><td colspan="10" class="text-center text-hint-c py-6" style="font-size:12.5px">沒有符合條件的訂單</td></tr>
              </tbody>
            </table>
          </div>

          <!-- 平面圖檢視 -->
          <div v-else>
            <div v-if="unassignedForFloor.length" class="panel mb-4">
              <h3 class="font-bold text-base-c mb-3" style="font-size:14px">待指派訂單（尚未對應到房間，平面圖無法顯示）</h3>
              <div class="flex flex-col gap-2">
                <div v-for="b in unassignedForFloor" :key="b.id" class="flex items-center justify-between border border-light-c rounded-lg px-3 py-2">
                  <div>
                    <div class="font-semibold text-base-c" style="font-size:12.5px">{{ b.id }} － {{ b.name }}（{{ b.guests }} 人）</div>
                    <div class="text-hint-c" style="font-size:11.5px">{{ b.checkIn }} → {{ b.checkOut }}{{ b.buildingPref !== 'all' ? '・偏好 ' + buildingNameOf(b.buildingPref) : '' }}</div>
                  </div>
                  <button class="mini-btn mini-primary" @click="openAssign(b)">指派房間</button>
                </div>
              </div>
            </div>

            <div class="panel">
              <div v-for="grp in visibleOrderBuildings" :key="grp.id" class="mb-8 last:mb-0">
                <div class="flex items-center gap-2 mb-2">
                  <span class="building-badge">{{ grp.name.charAt(0) }}</span>
                  <h3 class="font-bold text-base-c" style="font-size:14px">{{ grp.name }}</h3>
                  <span class="text-hint-c" style="font-size:11.5px">共 {{ grp.rooms.length }} 間</span>
                </div>

                <!-- 實際座標線框圖：房塊照真實平面圖比例定位，不用照片當底圖 -->
                <svg
                  v-if="realLayoutOf(grp).positions.length"
                  :viewBox="`0 0 ${realLayoutOf(grp).width} ${realLayoutOf(grp).height}`"
                  class="floorplan-svg"
                  :style="{ maxWidth: realLayoutOf(grp).width + 'px' }"
                >
                  <rect :x="0" :y="0" :width="realLayoutOf(grp).width" :height="realLayoutOf(grp).height" class="floor-outline" rx="8" />
                  <g v-for="p in realLayoutOf(grp).positions" :key="p.room.id" class="room-group" @click="openBookingTile(p.room)">
                    <rect :x="p.x" :y="p.y" :width="p.w" :height="p.h" rx="4" :class="['room-rect', orderTileClass(p.room)]" />
                    <text :x="p.x + p.w/2" :y="p.y + p.h/2 + 4" text-anchor="middle" class="room-block-num">{{ p.room.id }}</text>
                    <title>{{ p.room.id }} ・ {{ orderTileLabel(p.room) }}</title>
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

                  <g v-for="p in layoutOf(grp.id).positions" :key="p.room.id" class="room-group" @click="openBookingTile(p.room)">
                    <rect :x="p.x" :y="p.y" :width="ROOM_W" :height="ROOM_H" rx="6" :class="['room-rect', orderTileClass(p.room)]" />
                    <text :x="p.x + ROOM_W / 2" :y="p.y + 26" text-anchor="middle" class="room-num">{{ p.room.id }}</text>
                    <text :x="p.x + ROOM_W / 2" :y="p.y + 43" text-anchor="middle" class="room-sub">{{ p.room.type }}</text>
                    <text :x="p.x + ROOM_W / 2" :y="p.y + 62" text-anchor="middle" :class="['room-status', orderTileClass(p.room)]">{{ orderTileLabel(p.room) }}</text>
                  </g>
                </svg>
              </div>
              <div class="flex flex-wrap gap-4 text-hint-c mt-2" style="font-size:11.5px">
                <span><span class="dot" style="background:#10b981"></span>空房</span>
                <span><span class="dot" style="background:#f59e0b"></span>待確認</span>
                <span><span class="dot" style="background:#3b82f6"></span>已確認住房中</span>
                <span><span class="dot" style="background:#a8a29e"></span>已下架</span>
                <span>點擊房間可查看訂單詳情並操作</span>
              </div>
              <p class="text-hint-c mt-2" style="font-size:11px">＊快樂運動館、合力居、愛加倍已依實際平面圖比例定位；懇親房目前無座標資料，暫以走廊示意圖顯示</p>
            </div>
          </div>
        </div>

        <!-- ===================== 訂房紀錄 ===================== -->
        <div v-else-if="tab === 'history'">
          <p class="text-hint-c mb-3" style="font-size:12.5px">已退房與已取消的訂單保留於此作為歷史紀錄，不會被刪除</p>
          <div class="stat-grid mb-5">
            <div class="stat-card"><div class="stat-label">已退房訂單</div><div class="stat-value">{{ historyStats.completedCount }}</div></div>
            <div class="stat-card"><div class="stat-label">已取消訂單</div><div class="stat-value">{{ historyStats.cancelledCount }}</div></div>
            <div class="stat-card"><div class="stat-label">歷史入住晚數</div><div class="stat-value">{{ historyStats.totalNights }}</div></div>
            <div class="stat-card"><div class="stat-label">歷史實收營收</div><div class="stat-value">{{ historyStats.totalRevenue.toLocaleString() }}</div></div>
          </div>

          <div class="panel">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div class="flex gap-2 flex-wrap">
                <select v-model="historyStatus" class="select-input">
                  <option value="all">全部（已退房＋已取消）</option>
                  <option value="completed">已退房</option>
                  <option value="cancelled">已取消</option>
                </select>
                <input type="text" v-model="historyKeyword" placeholder="搜尋房客姓名或訂單編號" class="select-input">
              </div>
              <span class="text-hint-c" style="font-size:12px">共 {{ filteredHistory.length }} 筆</span>
            </div>
            <table class="w-full">
              <thead>
              <tr class="text-hint-c text-left" style="font-size:11px">
                <th class="py-1.5 font-semibold">訂單編號</th><th class="py-1.5 font-semibold">房間</th>
                <th class="py-1.5 font-semibold">房客</th><th class="py-1.5 font-semibold">電話</th>
                <th class="py-1.5 font-semibold">入住</th><th class="py-1.5 font-semibold">退房</th>
                <th class="py-1.5 font-semibold">人數</th><th class="py-1.5 font-semibold">金額</th>
                <th class="py-1.5 font-semibold">狀態</th><th class="py-1.5 font-semibold">操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="b in filteredHistory" :key="b.id" class="border-t border-light-c" style="font-size:12.5px">
                <td class="py-2 text-base-c">{{ b.id }}</td>
                <td class="py-2">
                  <span v-if="b.roomId" class="text-base-c">{{ roomLabel(b.roomId) }}</span>
                  <span v-else class="status-badge bg-sky-100 text-sky-700">未指派</span>
                </td>
                <td class="py-2 text-base-c">{{ b.name }}</td>
                <td class="py-2 text-base-c">{{ b.phone }}</td>
                <td class="py-2 text-base-c">{{ b.checkIn }}</td>
                <td class="py-2 text-base-c">{{ b.checkOut }}</td>
                <td class="py-2 text-base-c">{{ b.guests }}</td>
                <td class="py-2 text-base-c">{{ b.roomId ? ('NT$ ' + bookingTotal(b).toLocaleString()) : '—' }}</td>
                <td class="py-2"><span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span></td>
                <td class="py-2">
                  <div class="flex gap-1" v-if="b.status === 'cancelled'">
                    <button class="mini-btn" @click="restoreBooking(b)">恢復訂單</button>
                    <button class="mini-btn mini-danger" @click="removeBooking(b.id)">刪除</button>
                  </div>
                  <span v-else class="text-hint-c" style="font-size:11.5px">已完成入住</span>
                </td>
              </tr>
              <tr v-if="filteredHistory.length === 0"><td colspan="10" class="text-center text-hint-c py-6" style="font-size:12.5px">目前沒有歷史紀錄</td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </div>

    <!-- ===== 指派房間 Modal ===== -->
    <div v-if="assignTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @click.self="assignTarget = null">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">為訂單 {{ assignTarget.id }} 指派房間</h2>
        <div class="bg-surface2 rounded-lg p-3 mb-3" style="font-size:12.5px">
          <div class="flex justify-between py-0.5"><span class="text-hint-c">房客</span><span class="text-base-c">{{ assignTarget.name }}（{{ assignTarget.guests }} 人）</span></div>
          <div class="flex justify-between py-0.5"><span class="text-hint-c">入住 → 退房</span><span class="text-base-c">{{ assignTarget.checkIn }} → {{ assignTarget.checkOut }}（{{ nights(assignTarget.checkIn, assignTarget.checkOut) }} 晚）</span></div>
          <div class="flex justify-between py-0.5" v-if="assignTarget.buildingPref !== 'all'"><span class="text-hint-c">偏好棟別</span><span class="text-base-c">{{ buildingNameOf(assignTarget.buildingPref) }}</span></div>
        </div>

        <label class="block text-hint-c mb-1" style="font-size:12px">依棟別篩選</label>
        <select v-model="assignBuildingFilter" class="select-input mb-3" style="width:100%">
          <option value="all">全部棟別（可住 {{ assignTarget.guests }} 人以上）</option>
          <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>

        <p v-if="assignError" class="text-red-500 mb-2" style="font-size:12px">{{ assignError }}</p>

        <div class="flex flex-col gap-2">
          <div v-for="r in eligibleRooms" :key="r.id" class="flex items-center justify-between border border-light-c rounded-lg px-3 py-2" :class="r.buildingId === assignTarget.buildingPref ? 'border-amber-400' : ''">
            <div>
              <div class="font-semibold text-base-c" style="font-size:12.5px">{{ r.id }} <span class="status-badge bg-stone-100 text-stone-600 ml-1">{{ r.type }}</span></div>
              <div class="text-hint-c" style="font-size:11.5px">{{ r.buildingName }} ・ 可住 {{ r.capacity }} 人 ・ {{ r.bed }} ・ NT$ {{ r.price.toLocaleString() }}/晚</div>
            </div>
            <button class="mini-btn mini-primary" @click="assignRoom(r)">選擇此房</button>
          </div>
          <div v-if="eligibleRooms.length === 0" class="text-center text-hint-c py-6" style="font-size:12.5px">
            目前沒有可住 {{ assignTarget.guests }} 人以上、且該日期空著的房間，請調整篩選或聯絡房務確認。
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <button class="btn-plain" @click="assignTarget = null">關閉</button>
        </div>
      </div>
    </div>

    <!-- ===== 平面圖點擊：訂單詳情 Modal ===== -->
    <div v-if="tileTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @click.self="tileTarget = null">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:15px">{{ tileTarget.room.id }} · {{ buildingNameOf(tileTarget.room.buildingId) }}</h2>
        <div v-if="tileTarget.booking">
          <div class="bg-surface2 rounded-lg p-3 mb-3" style="font-size:12.5px">
            <div class="flex justify-between py-0.5"><span class="text-hint-c">訂單編號</span><span class="text-base-c">{{ tileTarget.booking.id }}</span></div>
            <div class="flex justify-between py-0.5"><span class="text-hint-c">房客</span><span class="text-base-c">{{ tileTarget.booking.name }}（{{ tileTarget.booking.guests }} 人）</span></div>
            <div class="flex justify-between py-0.5"><span class="text-hint-c">電話</span><span class="text-base-c">{{ tileTarget.booking.phone }}</span></div>
            <div class="flex justify-between py-0.5"><span class="text-hint-c">入住 → 退房</span><span class="text-base-c">{{ tileTarget.booking.checkIn }} → {{ tileTarget.booking.checkOut }}</span></div>
            <div class="flex justify-between py-0.5" v-if="tileTarget.booking.notes"><span class="text-hint-c">備註</span><span class="text-base-c">{{ tileTarget.booking.notes }}</span></div>
            <div class="flex justify-between py-1 mt-1 border-t border-light-c"><span class="text-hint-c">狀態</span><span class="status-badge" :class="statusClass(tileTarget.booking.status)">{{ statusLabel(tileTarget.booking.status) }}</span></div>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button v-if="tileTarget.booking.status === 'pending'" class="mini-btn mini-primary" @click="quickSetTile('confirmed')">確認訂單</button>
            <button v-if="tileTarget.booking.status === 'pending'" class="mini-btn" @click="openAssign(tileTarget.booking); tileTarget = null">更換房間</button>
            <button v-if="tileTarget.booking.status === 'confirmed'" class="mini-btn" @click="quickSetTile('completed')">設為已退房</button>
            <button class="mini-btn" @click="quickSetTile('cancelled')">取消訂單</button>
          </div>
        </div>
        <div v-else class="text-center py-2">
          <p class="text-hint-c mb-1" style="font-size:13px">此房目前沒有進行中的訂單。</p>
          <p class="text-hint-c" style="font-size:12px">{{ tileTarget.room.type }}・可住 {{ tileTarget.room.capacity }} 人・NT$ {{ tileTarget.room.price.toLocaleString() }}/晚</p>
        </div>
        <div class="flex justify-end mt-4">
          <button class="btn-plain" @click="tileTarget = null">關閉</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
  definePageMeta({ layout: 'staff', requiredPermission: 'booking.orders' })

  const commonStore = useCommonStore()
  const ROOMS_BASE    = () => commonStore.data.main_url + '/holy/rooms/settings'
  const BOOKINGS_BASE = () => commonStore.data.main_url + '/holy/rooms/bookings'

  const today = new Date().toISOString().slice(0, 10)

  const loading   = ref(false)
  const tab       = ref('dashboard') // dashboard | orders | history

  const buildings = ref([]) // [{id, name, rooms:[...]}]
  const bookings  = ref([]) // 全部訂單（raw）

  const rooms = computed(() =>
    buildings.value.flatMap(b => b.rooms.map(r => ({ ...r, buildingId: b.id, buildingName: b.name })))
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

  /* ---------------- 共用小工具 ---------------- */

  function nights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0
    const d = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
    return d > 0 ? d : 0
  }
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
  function roomById(id) { return rooms.value.find(r => r.id === id) }
  function roomLabel(roomId) {
    const r = roomById(roomId)
    return r ? `${r.id} ${r.type}` : '尚未指派'
  }
  function buildingNameOf(id) {
    const b = buildings.value.find(x => x.id === id)
    return b ? b.name : id
  }
  function bookingTotal(b) {
    const r = roomById(b.roomId)
    if (!r) return 0
    return r.price * nights(b.checkIn, b.checkOut)
  }
  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart)
  }
  function isRoomAvailable(roomId, checkIn, checkOut, excludeId) {
    return !bookings.value.some(b =>
      b.roomId === roomId && b.status !== 'cancelled' && b.status !== 'completed' &&
      b.id !== excludeId && rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut)
    )
  }
  function countByStatus(s) { return bookings.value.filter(b => b.status === s).length }

  /* 還在流程中的訂單：新訂單＋住房中，不含已退房、已取消 */
  const activeBookings = computed(() => bookings.value.filter(b => b.status !== 'cancelled' && b.status !== 'completed'))
  const estRevenue = computed(() => activeBookings.value.reduce((s, b) => s + bookingTotal(b), 0))
  const upcomingBookings = computed(() =>
    [...activeBookings.value].sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1)).slice(0, 8)
  )

  /* ---------------- 訂單管理 ---------------- */

  const ordersView     = ref('list')
  const ordersBuilding = ref('all')
  const ordersStatus   = ref('all')
  const ordersKeyword  = ref('')

  const filteredOrders = computed(() => {
    const kw = ordersKeyword.value.trim().toLowerCase()
    return activeBookings.value
      .filter(b => ordersStatus.value === 'all' || b.status === ordersStatus.value)
      .filter(b => {
        if (ordersBuilding.value === 'all') return true
        if (b.roomId) { const r = roomById(b.roomId); return r && r.buildingId === ordersBuilding.value }
        return b.buildingPref === ordersBuilding.value
      })
      .filter(b => !kw || b.name.toLowerCase().includes(kw) || b.id.toLowerCase().includes(kw))
      .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))
  })

  const visibleOrderBuildings = computed(() =>
    ordersBuilding.value === 'all' ? buildings.value : buildings.value.filter(b => b.id === ordersBuilding.value)
  )
  const unassignedForFloor = computed(() =>
    [...bookings.value.filter(b => b.status === 'unassigned')].sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))
  )

  function activeBookingForRoom(roomId) {
    return bookings.value
      .filter(b => b.roomId === roomId && (b.status === 'pending' || b.status === 'confirmed'))
      .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))[0] || null
  }
  function orderTileClass(r) {
    if (!r.active) return 'tile-inactive'
    const b = activeBookingForRoom(r.id)
    if (!b) return 'tile-vacant'
    return b.status === 'pending' ? 'tile-pending' : 'tile-occupied'
  }
  function orderTileLabel(r) {
    if (!r.active) return '已下架'
    const b = activeBookingForRoom(r.id)
    if (!b) return '空房'
    return (b.status === 'pending' ? '待確認・' : '已確認・') + b.name
  }

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
  // 這樣房間的相對間距、比例才會跟實際平面圖一致。
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
    return positions
  }

  function realLayoutOf(grp) {
    const canvas = REAL_CANVAS[grp.id]
    const positioned = grp.rooms.filter(r => r.posX != null && r.posY != null)
    if (!canvas || positioned.length === 0) return { width: 0, height: 0, positions: [] }
    return {
      width: canvas.w,
      height: canvas.h,
      positions: buildWireframe(positioned, canvas.w, canvas.h),
    }
  }

  const tileTarget = ref(null)
  function openBookingTile(room) {
    tileTarget.value = { room, booking: activeBookingForRoom(room.id) }
  }
  async function quickSetTile(status) {
    if (!tileTarget.value || !tileTarget.value.booking) return
    await setStatus(tileTarget.value.booking.id, status)
    tileTarget.value = null
  }

  /* ---------------- 狀態轉換 / 刪除 ---------------- */

  async function setStatus(id, status) {
    try {
      await fetch(`${BOOKINGS_BASE()}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
      })
      await fetchAll()
    } catch (e) { console.error(e) }
  }
  async function removeBooking(id) {
    if (!confirm('確定要刪除這筆訂單嗎？此動作無法復原。')) return
    try {
      await fetch(`${BOOKINGS_BASE()}/${id}`, { method: 'DELETE' })
      await fetchAll()
    } catch (e) { console.error(e) }
  }
  async function restoreBooking(b) {
    await setStatus(b.id, b.roomId ? 'pending' : 'unassigned')
  }

  /* ---------------- 指派房間 ---------------- */

  const assignTarget = ref(null)
  const assignBuildingFilter = ref('all')
  const assignError = ref('')

  function openAssign(booking) {
    assignTarget.value = booking
    assignBuildingFilter.value = booking.buildingPref && booking.buildingPref !== 'all' ? booking.buildingPref : 'all'
    assignError.value = ''
  }
  const eligibleRooms = computed(() => {
    if (!assignTarget.value) return []
    const b = assignTarget.value
    return rooms.value
      .filter(r => r.active)
      .filter(r => r.capacity >= b.guests)
      .filter(r => assignBuildingFilter.value === 'all' || r.buildingId === assignBuildingFilter.value)
      .filter(r => isRoomAvailable(r.id, b.checkIn, b.checkOut, b.id))
      .sort((r1, r2) => {
        const pref = b.buildingPref
        if (pref && pref !== 'all') {
          if (r1.buildingId === pref && r2.buildingId !== pref) return -1
          if (r2.buildingId === pref && r1.buildingId !== pref) return 1
        }
        return r1.capacity - r2.capacity || r1.price - r2.price
      })
  })
  async function assignRoom(room) {
    assignError.value = ''
    try {
      const res = await (await fetch(`${BOOKINGS_BASE()}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignTarget.value.id, roomId: room.id }),
      })).json()
      if (res && res.error) { assignError.value = res.error; await fetchAll(); return }
      assignTarget.value = null
      await fetchAll()
    } catch (e) { console.error(e); assignError.value = '指派失敗，請稍後再試' }
  }

  /* ---------------- 訂房紀錄 ---------------- */

  const historyStatus  = ref('all')
  const historyKeyword = ref('')
  const historyBookings = computed(() => bookings.value.filter(b => b.status === 'completed' || b.status === 'cancelled'))
  const filteredHistory = computed(() => {
    const kw = historyKeyword.value.trim().toLowerCase()
    return historyBookings.value
      .filter(b => historyStatus.value === 'all' || b.status === historyStatus.value)
      .filter(b => !kw || b.name.toLowerCase().includes(kw) || b.id.toLowerCase().includes(kw))
      .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
  })
  const historyStats = computed(() => {
    const completed = historyBookings.value.filter(b => b.status === 'completed')
    const cancelled = historyBookings.value.filter(b => b.status === 'cancelled')
    return {
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      totalNights: completed.reduce((s, b) => s + nights(b.checkIn, b.checkOut), 0),
      totalRevenue: completed.reduce((s, b) => s + bookingTotal(b), 0),
    }
  })

  onMounted(fetchAll)
</script>

<style scoped>
  .segmented { display: flex; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 3px; gap: 2px; }
  .segmented button { border: none; background: transparent; color: var(--text-muted); padding: 6px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .segmented button:hover { background: var(--border-light); color: var(--text); }
  .seg-active, .seg-active:hover { background: #15803d; color: #fff; }
  .w-fit { width: fit-content; }

  .pill-btn { flex-shrink: 0; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface2); color: var(--text-muted); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .pill-btn:hover { border-color: var(--accent); color: var(--text); }
  .pill-active, .pill-active:hover { background: #15803d; border-color: #15803d; color: #fff; }

  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .stat-card { background: var(--surface); border-radius: 12px; padding: 14px; border-left: 4px solid #15803d; box-shadow: var(--shadow); }
  .stat-label { font-size: 11.5px; color: var(--text-hint); font-weight: 600; }
  .stat-value { font-size: 22px; font-weight: 700; color: var(--text); margin-top: 2px; }

  .panel { background: var(--surface); border-radius: 16px; padding: 16px; box-shadow: var(--shadow); overflow-x: auto; }

  .select-input { padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 12.5px; background: var(--surface2); color: var(--text); }

  .building-badge { width: 24px; height: 24px; border-radius: 6px; background: rgba(21, 128, 61, .12); color: #15803d; display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 700; flex-shrink: 0; }

  .floorplan-svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .floor-outline { fill: var(--surface2); stroke: var(--border-light); stroke-width: 1.5; }
  .corridor-band { fill: var(--surface2); }
  .corridor-label { font-size: 11px; fill: var(--text-hint); letter-spacing: 2px; }
  .room-group { cursor: pointer; }
  .room-rect { fill: var(--surface); stroke-width: 1.5; transition: stroke-width .15s, filter .15s; }
  /* 訂單狀態用邊框顏色表示（功能性分類色，不隨深色模式變動），
     底色維持線框圖的中性色，滑鼠移上去邊框會變粗、發亮，而不是整塊變成按鈕感的實心色塊 */
  .room-rect.tile-vacant   { stroke: #10b981; }
  .room-rect.tile-pending  { stroke: #f59e0b; }
  .room-rect.tile-occupied { stroke: #3b82f6; }
  .room-rect.tile-inactive { stroke: #a8a29e; stroke-dasharray: 3 2; }
  .room-group:hover .room-rect.tile-vacant   { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(16,185,129,.9)); }
  .room-group:hover .room-rect.tile-pending  { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(245,158,11,.9)); }
  .room-group:hover .room-rect.tile-occupied { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(59,130,246,.9)); }
  .room-group:hover .room-rect.tile-inactive { stroke-width: 3; filter: drop-shadow(0 0 3px rgba(168,162,158,.9)); }
  .room-num { font-size: 14px; font-weight: 700; fill: var(--text); }
  .room-sub { font-size: 10px; fill: var(--text-hint); }
  .room-status { font-size: 9.5px; font-weight: 700; }
  .room-status.tile-vacant   { fill: #059669; }
  .room-status.tile-pending  { fill: #d97706; }
  .room-status.tile-occupied { fill: #2563eb; }
  .room-status.tile-inactive { fill: #78716c; }
  .room-block-num { font-size: 9.5px; font-weight: 700; fill: var(--text); pointer-events: none; }
  .dot { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-right: 5px; vertical-align: middle; }

  .status-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }

  .mini-btn { padding: 5px 10px; border-radius: 6px; background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 700; white-space: nowrap; }
  .mini-btn:hover { background: var(--bg); }
  .mini-primary { background: #15803d; color: #fff; }
  .mini-primary:hover { background: #15803d; filter: brightness(1.08); }
  .mini-danger { background: transparent; border: 1px solid #e11d48; color: #e11d48; }

  .btn-plain { padding: 7px 14px; border-radius: 8px; background: var(--surface2); color: var(--text-muted); font-size: 13px; font-weight: 600; }
  .btn-plain:hover { background: var(--bg); }
</style>
