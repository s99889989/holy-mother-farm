<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="mx-auto flex items-center gap-2" :class="wideTab ? 'w-full' : 'max-w-5xl'">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:15px">📋</div>
        <div class="flex-1">
          <h1 class="font-bold text-base-c leading-none" style="font-size:16px">訂房管理</h1>
        </div>
        <NuxtLink to="/front/order/rooms-booking" target="_blank" class="mini-btn" style="padding:7px 12px;font-size:13.5px">🔗 開啟訂房頁面</NuxtLink>
      </div>
      <div class="mx-auto mt-1" :class="wideTab ? 'w-full' : 'max-w-5xl'">
        <div class="segmented w-fit">
          <button :class="tab === 'dashboard' ? 'seg-active' : ''" :style="tab === 'dashboard' ? segActiveStyle : ''" @click="tab = 'dashboard'">儀表板</button>
          <button :class="tab === 'orders' ? 'seg-active' : ''" :style="tab === 'orders' ? segActiveStyle : ''" @click="tab = 'orders'">訂單管理</button>
          <button :class="tab === 'floorplan' ? 'seg-active' : ''" :style="tab === 'floorplan' ? segActiveStyle : ''" @click="tab = 'floorplan'">平面圖</button>
          <button :class="tab === 'calendar' ? 'seg-active' : ''" :style="tab === 'calendar' ? segActiveStyle : ''" @click="tab = 'calendar'">日曆</button>
          <button :class="tab === 'gantt' ? 'seg-active' : ''" :style="tab === 'gantt' ? segActiveStyle : ''" @click="tab = 'gantt'">甘特圖</button>
          <button :class="tab === 'overview' ? 'seg-active' : ''" :style="tab === 'overview' ? segActiveStyle : ''" @click="tab = 'overview'">房况總覽</button>
          <button :class="tab === 'history' ? 'seg-active' : ''" :style="tab === 'history' ? segActiveStyle : ''" @click="tab = 'history'">訂房紀錄</button>
        </div>
      </div>
    </header>

    <div class="mx-auto px-3 sm:px-4 py-4" :class="wideTab ? 'w-full' : 'max-w-5xl'">
      <div v-if="loading" class="text-center py-8 text-hint-c" style="font-size:14px">載入中...</div>

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
            <h3 class="font-bold text-base-c mb-3" style="font-size:15px">近期入住（依入住日期排序）</h3>
            <table class="w-full">
              <thead>
              <tr class="text-hint-c text-left" style="font-size:12px">
                <th class="py-1.5 font-semibold">房間</th><th class="py-1.5 font-semibold">房客</th>
                <th class="py-1.5 font-semibold">入住</th><th class="py-1.5 font-semibold">退房</th>
                <th class="py-1.5 font-semibold">人數</th><th class="py-1.5 font-semibold">狀態</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="b in upcomingBookings" :key="b.id" class="border-t border-light-c" style="font-size:13.5px">
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
              <tr v-if="upcomingBookings.length === 0"><td colspan="6" class="text-center text-hint-c py-6" style="font-size:13.5px">目前沒有進行中的訂單</td></tr>
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
            <div class="flex items-center gap-2 flex-wrap">
              <button class="mini-btn mini-primary" style="padding:7px 14px;font-size:13.5px" @click="openCreateOrder">＋ 新增訂單</button>
              <button class="mini-btn" style="padding:7px 14px;font-size:13.5px" @click="openCreateGroup">＋ 登記團體</button>
            </div>
          </div>

          <!-- 列表檢視 -->
          <div class="panel">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div class="flex items-center gap-2 flex-wrap">
                <select v-model="ordersStatus" class="select-input">
                  <option value="all">全部（新訂單＋住房中）</option>
                  <option value="unassigned">待指派</option>
                  <option value="pending">待確認</option>
                  <option value="confirmed">已確認（住房中）</option>
                </select>
                <input type="text" v-model="ordersKeyword" placeholder="搜尋房客姓名／訂單編號／房號" class="select-input">
                <span class="text-hint-c" style="font-size:12.5px">快速選月</span>
                <button class="mini-btn" @click="shiftOrdersMonth(-1)">◀上月</button>
                <input type="month" v-model="ordersMonthPick" @change="applyOrdersMonth(ordersMonthPick)" class="select-input">
                <button class="mini-btn" @click="shiftOrdersMonth(1)">下月▶</button>
                <button class="mini-btn" @click="resetOrdersMonth">本月</button>
                <span class="text-hint-c" style="font-size:12.5px">時段</span>
                <input type="date" v-model="ordersDateFrom" class="select-input">
                <span class="text-hint-c">～</span>
                <input type="date" v-model="ordersDateTo" class="select-input">
                <button v-if="ordersDateFrom || ordersDateTo" class="mini-btn" @click="ordersDateFrom = ''; ordersDateTo = ''">清除時段</button>
              </div>
              <span class="text-hint-c" style="font-size:13px">共 {{ filteredOrders.length }} 筆</span>
            </div>
            <table class="w-full">
              <thead>
              <tr class="text-hint-c text-left" style="font-size:12px">
                <th class="py-1.5 font-semibold">訂單編號</th><th class="py-1.5 font-semibold">房間</th>
                <th class="py-1.5 font-semibold">房客</th><th class="py-1.5 font-semibold">電話</th>
                <th class="py-1.5 font-semibold">入住</th><th class="py-1.5 font-semibold">退房</th>
                <th class="py-1.5 font-semibold">人數</th><th class="py-1.5 font-semibold">金額</th>
                <th class="py-1.5 font-semibold">狀態</th><th class="py-1.5 font-semibold">操作</th>
              </tr>
              </thead>
              <tbody>
              <template v-for="row in orderRows" :key="row.kind === 'groupHeader' ? ('grp_' + row.groupId) : row.booking.id">
                <tr v-if="row.kind === 'groupHeader'" class="border-t border-light-c group-header-row" style="font-size:13.5px">
                  <td class="py-2" colspan="10">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                      <button class="flex items-center gap-2 flex-wrap text-left" @click="toggleGroup(row.groupId)">
                        <span class="text-hint-c" style="display:inline-block;width:12px">{{ row.expanded ? '▼' : '▶' }}</span>
                        <span class="status-badge bg-violet-200 text-violet-800">{{ row.groupName }}</span>
                        <b class="text-base-c">共 {{ row.members.length }} 間房</b>
                        <span class="text-hint-c" style="font-size:12.5px">{{ groupDateRangeLabel(row.members) }}</span>
                        <span class="text-hint-c" style="font-size:12.5px">{{ groupStatusSummary(row.members) }}</span>
                      </button>
                      <button class="mini-btn" @click="openGroupTarget(row.groupId, row.groupName)">整團操作</button>
                    </div>
                  </td>
                </tr>
                <tr v-else v-for="b in [row.booking]" :key="b.id" class="border-t border-light-c" :class="row.inGroup ? 'group-member-row' : ''" style="font-size:13.5px">
                  <td class="py-2 text-base-c">{{ b.id }}</td>
                  <td class="py-2">
                    <template v-if="b.roomId">
                      <div class="font-bold text-base-c" style="font-size:17px;line-height:1.2">{{ roomIdOf(b.roomId) }}</div>
                      <div class="text-hint-c" style="font-size:11.5px">{{ roomTypeOf(b.roomId) }}</div>
                    </template>
                    <span v-else class="status-badge bg-sky-100 text-sky-700">待指派</span>
                  </td>
                  <td class="py-2 text-base-c">{{ b.name }}</td>
                  <td class="py-2 text-base-c">{{ b.phone }}</td>
                  <td class="py-2 text-base-c">{{ b.checkIn }}</td>
                  <td class="py-2 text-base-c">{{ b.checkOut }}</td>
                  <td class="py-2 text-base-c">{{ occupancyLabel(b) }}</td>
                  <td class="py-2 text-base-c">{{ b.roomId ? ('NT$ ' + bookingTotal(b).toLocaleString()) : '—' }}</td>
                  <td class="py-2"><span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span></td>
                  <td class="py-2">
                    <div class="flex gap-1 flex-wrap">
                      <button class="mini-btn" @click="openEditOrder(b)">編輯</button>
                      <template v-if="b.status === 'unassigned' || b.status === 'pending'">
                        <button v-if="!b.roomId" class="mini-btn mini-primary" @click="openAssign(b)">指派房間</button>
                        <button v-else class="mini-btn mini-primary" @click="setStatus(b.id, 'confirmed')">確認</button>
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
              </template>

              <tr v-if="filteredOrders.length === 0"><td colspan="10" class="text-center text-hint-c py-6" style="font-size:13.5px">沒有符合條件的訂單</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ===================== 平面圖 ===================== -->
        <div v-else-if="tab === 'floorplan'">

          <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div class="flex gap-2 flex-wrap">
              <button class="pill-btn" :class="ordersBuilding === 'all' ? 'pill-active' : ''" @click="ordersBuilding = 'all'">全部棟別</button>
              <button v-for="b in buildings" :key="b.id" class="pill-btn" :class="ordersBuilding === b.id ? 'pill-active' : ''" @click="ordersBuilding = b.id">{{ b.name }}</button>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button class="mini-btn mini-primary" style="padding:7px 14px;font-size:13.5px" @click="openCreateOrder">＋ 新增訂單</button>
              <button class="mini-btn" style="padding:7px 14px;font-size:13.5px" @click="openCreateGroup">＋ 登記團體</button>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap mb-4">
            <span class="text-hint-c" style="font-size:12.5px">查看日期</span>
            <button class="mini-btn" @click="shiftViewDate(-1)">◀</button>
            <div style="position:relative;display:inline-block">
              <button class="mini-btn" @click="toggleViewDatePicker" style="padding:5px 10px">📅 {{ viewDate }}</button>
              <div v-if="viewDatePickerOpen" class="fixed inset-0 z-30" @click="viewDatePickerOpen = false"></div>
              <div v-if="viewDatePickerOpen" class="date-picker-pop" @click.stop>
                <div class="flex items-center justify-between mb-2">
                  <button class="mini-btn" @click="shiftViewDatePickerMonth(-1)">◀</button>
                  <span class="text-base-c font-semibold" style="font-size:13px">{{ viewDatePickerMonth }}</span>
                  <button class="mini-btn" @click="shiftViewDatePickerMonth(1)">▶</button>
                </div>
                <div class="date-picker-grid date-picker-head">
                  <div v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</div>
                </div>
                <div class="date-picker-grid">
                  <button
                    v-for="(cell, idx) in viewDatePickerCells" :key="idx" class="date-picker-cell"
                    :class="{ 'date-picker-cell-empty': !cell, 'date-picker-cell-selected': cell && cell.date === viewDate, 'date-picker-cell-today': cell && cell.date === today }"
                    :disabled="!cell" @click="cell && pickViewDate(cell.date)"
                  >
                    <span v-if="cell">{{ cell.day }}</span>
                    <span v-if="cell && cell.hasBooking" class="date-picker-dot"></span>
                  </button>
                </div>
                <p class="text-hint-c mt-1.5" style="font-size:11px">有小圓點的日子代表當天有進行中的訂單</p>
              </div>
            </div>
            <button class="mini-btn" @click="shiftViewDate(1)">▶</button>
            <button class="mini-btn" :class="isViewingToday ? 'mini-primary' : ''" @click="resetViewDate">回到今天</button>
          </div>

          <!-- 平面圖檢視：改用共用的 RoomFloorplan 元件（跟房間管理共用同一份牆面/座標邏輯，避免兩邊各刻一份、版本兜不起來） -->
          <div v-if="unassignedForFloor.length" class="panel mb-4">
            <h3 class="font-bold text-base-c mb-3" style="font-size:15px">待指派訂單（尚未對應到房間，平面圖無法顯示）</h3>
            <div class="flex flex-col gap-2">
              <div v-for="b in unassignedForFloor" :key="b.id" class="flex items-center justify-between border border-light-c rounded-lg px-3 py-2">
                <div>
                  <div class="font-semibold text-base-c" style="font-size:13.5px">{{ b.id }} － {{ b.name }}（{{ b.guests }} 人）</div>
                  <div class="text-hint-c" style="font-size:12.5px">{{ b.checkIn }} → {{ b.checkOut }}{{ b.buildingPref !== 'all' ? '・偏好 ' + buildingNameOf(b.buildingPref) : '' }}</div>
                </div>
                <button class="mini-btn mini-primary" @click="openAssign(b)">指派房間</button>
              </div>
            </div>
          </div>

          <div class="panel">
            <p class="text-hint-c mb-3" style="font-size:12px">平面圖顯示的是 <b class="text-base-c">{{ viewDate }}</b>{{ isViewingToday ? '（今天）' : '' }} 當天的房況</p>
            <div v-for="grp in visibleOrderBuildings" :key="grp.id" class="mb-8 last:mb-0">
              <div class="flex items-center gap-2 mb-2">
                <span class="building-badge">{{ grp.name.charAt(0) }}</span>
                <h3 class="font-bold text-base-c" style="font-size:15px">{{ grp.name }}</h3>
                <span class="text-hint-c" style="font-size:12.5px">共 {{ grp.rooms.length }} 間</span>
              </div>

              <RoomFloorplan
                :building="grp"
                :bookings="bookings"
                :reference-date="viewDate"
                :status-resolver="orderStatusResolver"
                @select="room => room && openBookingTile(room, grp.id)"
              />
            </div>
            <div class="flex flex-wrap gap-4 text-hint-c mt-2" style="font-size:12.5px">
              <span><span class="dot" style="background:#10b981"></span>空房</span>
              <span><span class="dot" style="background:#f59e0b"></span>待確認</span>
              <span><span class="dot" style="background:#3b82f6"></span>已確認住房中</span>
              <span><span class="dot" style="background:#a8a29e"></span>已下架</span>
              <span>點擊房間可查看訂單詳情並操作</span>
            </div>
            <p class="text-hint-c mt-2" style="font-size:12px">＊快樂運動館、合力居、愛加倍已依實際平面圖比例定位；懇親房目前無座標資料，暫以走廊示意圖顯示</p>
          </div>
        </div>

        <!-- ===================== 日曆 ===================== -->
        <div v-else-if="tab === 'calendar'">

          <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div class="flex gap-2 flex-wrap">
              <button class="pill-btn" :class="ordersBuilding === 'all' ? 'pill-active' : ''" @click="ordersBuilding = 'all'">全部棟別</button>
              <button v-for="b in buildings" :key="b.id" class="pill-btn" :class="ordersBuilding === b.id ? 'pill-active' : ''" @click="ordersBuilding = b.id">{{ b.name }}</button>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button class="mini-btn mini-primary" style="padding:7px 14px;font-size:13.5px" @click="openCreateOrder">＋ 新增訂單</button>
              <button class="mini-btn" style="padding:7px 14px;font-size:13.5px" @click="openCreateGroup">＋ 登記團體</button>
            </div>
          </div>

          <!-- 日曆檢視：以月曆呈現每天有哪些訂單入住/在住/退房；點某一天，右邊會常駐顯示當天明細並可操作 -->
          <div class="flex gap-4 items-start flex-wrap">
            <div class="panel" style="flex:2 1 480px;min-width:300px">
              <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div class="flex items-center gap-2">
                  <button class="mini-btn" @click="shiftCalendarMonth(-1)">◀</button>
                  <h3 class="font-bold text-base-c" style="font-size:15px">{{ calendarMonthLabel }}</h3>
                  <button class="mini-btn" @click="shiftCalendarMonth(1)">▶</button>
                  <button class="mini-btn" @click="resetCalendarMonth">回到本月</button>
                </div>
                <div class="flex flex-wrap gap-3 text-hint-c" style="font-size:11.5px">
                  <span><span class="dot" style="background:#0284c7"></span>待指派</span>
                  <span><span class="dot" style="background:#d97706"></span>待確認</span>
                  <span><span class="dot" style="background:#059669"></span>已確認</span>
                  <span><span class="dot" style="background:#7c3aed"></span>團體（不分狀態，合併顯示成一條）</span>
                </div>
              </div>

              <div class="cal-grid cal-head">
                <div v-for="w in ['日','一','二','三','四','五','六']" :key="w" class="cal-head-cell">{{ w }}</div>
              </div>
              <div class="cal-grid">
                <div
                  v-for="(cell, idx) in calendarCells" :key="idx" class="cal-cell"
                  :class="{ 'cal-cell-today': cell && cell.date === today, 'cal-cell-empty': !cell, 'cal-cell-selected': cell && dayTarget && cell.date === dayTarget.date }"
                  @click="cell && (dayTarget = cell)"
                >
                  <template v-if="cell">
                    <div class="cal-day-num" :class="cell.date === today ? 'cal-day-today' : ''">{{ cell.day }}</div>
                    <button v-for="bk in cell.bookings.slice(0, 3)" :key="bk.id" class="cal-pill" :class="bk.isGroup ? 'bg-violet-600' : calendarPillClass(bk.status)" @click.stop="dayTarget = cell">
                      {{ bk.calTag ? bk.calTag + '・' : '' }}<template v-if="bk.isGroup">{{ bk.groupName }}（{{ bk.members.length }} 間）</template><template v-else>{{ bk.roomId ? roomIdOf(bk.roomId) : '待指派' }} {{ bk.name }}</template>
                    </button>
                    <button v-if="cell.bookings.length > 3" class="cal-more" @click.stop="dayTarget = cell">+{{ cell.bookings.length - 3 }} 更多</button>
                  </template>
                </div>
              </div>
            </div>

            <!-- 右側：點選日期的當天明細，常駐顯示、不用彈窗 -->
            <div class="panel" style="flex:1 1 300px;min-width:280px;position:sticky;top:76px">
              <div v-if="dayTarget">
                <div class="flex items-center justify-between gap-2 mb-3">
                  <h3 class="font-bold text-base-c" style="font-size:15.5px">{{ dayTarget.date }}</h3>
                  <button class="mini-btn mini-primary" @click="viewDate = dayTarget.date; tab = 'floorplan'">在平面圖查看</button>
                </div>
                <div v-if="dayTarget.bookings.length">
                  <div v-for="bk in dayTarget.bookings" :key="bk.id" class="bg-surface2 rounded-lg p-3 mb-3" style="font-size:13.5px">
                    <template v-if="bk.isGroup">
                      <div class="flex justify-between py-0.5" v-if="bk.calTag"><span class="text-hint-c">標記</span><span class="status-badge" :class="bk.calTag === '入住' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">{{ bk.calTag }}</span></div>
                      <div class="flex justify-between py-0.5"><span class="text-hint-c">團體</span><span class="status-badge bg-violet-100 text-violet-700">{{ bk.groupName }}</span></div>
                      <div class="flex justify-between py-0.5"><span class="text-hint-c">房間數</span><span class="text-base-c">共 {{ bk.members.length }} 間</span></div>
                      <div class="flex justify-between py-1 mt-1 border-t border-light-c"><span class="text-hint-c">狀態</span><span class="text-base-c" style="font-size:12.5px">{{ groupStatusSummary(bk.members) }}</span></div>
                      <div class="flex gap-2 flex-wrap mt-2">
                        <button class="mini-btn mini-primary" @click="openGroupTarget(bk.groupId, bk.groupName)">查看整團</button>
                      </div>
                    </template>
                    <template v-else>
                      <div class="flex justify-between py-0.5" v-if="bk.calTag"><span class="text-hint-c">標記</span><span class="status-badge" :class="bk.calTag === '入住' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">{{ bk.calTag }}</span></div>
                      <div class="flex justify-between py-0.5"><span class="text-hint-c">訂單編號</span><span class="text-base-c">{{ bk.id }}</span></div>
                      <div class="flex justify-between py-0.5"><span class="text-hint-c">房間</span><span class="text-base-c">{{ bk.roomId ? roomLabel(bk.roomId) : '待指派' }}</span></div>
                      <div class="flex justify-between py-0.5"><span class="text-hint-c">房客</span><span class="text-base-c">{{ bk.name }}（{{ bk.guests }} 人）</span></div>
                      <div class="flex justify-between py-0.5"><span class="text-hint-c">電話</span><span class="text-base-c">{{ bk.phone }}</span></div>
                      <div class="flex justify-between py-0.5"><span class="text-hint-c">入住 → 退房</span><span class="text-base-c">{{ bk.checkIn }} → {{ bk.checkOut }}</span></div>
                      <div class="flex justify-between py-1 mt-1 border-t border-light-c"><span class="text-hint-c">狀態</span><span class="status-badge" :class="statusClass(bk.status)">{{ statusLabel(bk.status) }}</span></div>
                      <div class="flex gap-2 flex-wrap mt-2">
                        <button class="mini-btn" @click="openEditOrder(bk)">編輯</button>
                        <button v-if="!bk.roomId" class="mini-btn mini-primary" @click="openAssign(bk)">指派房間</button>
                        <template v-else>
                          <button v-if="bk.status === 'pending'" class="mini-btn mini-primary" @click="quickSetDay(bk.id, 'confirmed')">確認訂單</button>
                          <button v-if="bk.status === 'confirmed'" class="mini-btn" @click="quickSetDay(bk.id, 'completed')">設為已退房</button>
                        </template>
                        <button class="mini-btn" @click="quickSetDay(bk.id, 'cancelled')">取消訂單</button>
                      </div>
                    </template>
                  </div>
                </div>
                <div v-else class="text-center text-hint-c py-6" style="font-size:13px">這天沒有進行中的訂單</div>
              </div>
              <div v-else class="text-center text-hint-c py-10" style="font-size:13px">點左邊日曆上的某一天，這裡會顯示當天的訂單明細</div>
            </div>
          </div>
        </div>

        <!-- ===================== 甘特圖 ===================== -->
        <div v-else-if="tab === 'gantt'">

          <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div class="flex gap-2 flex-wrap">
              <button class="pill-btn" :class="ordersBuilding === 'all' ? 'pill-active' : ''" @click="ordersBuilding = 'all'">全部棟別</button>
              <button v-for="b in buildings" :key="b.id" class="pill-btn" :class="ordersBuilding === b.id ? 'pill-active' : ''" @click="ordersBuilding = b.id">{{ b.name }}</button>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <div class="flex items-center gap-2">
                <button class="mini-btn" @click="shiftCalendarMonth(-1)">◀</button>
                <h3 class="font-bold text-base-c" style="font-size:15px">{{ calendarMonthLabel }}</h3>
                <button class="mini-btn" @click="shiftCalendarMonth(1)">▶</button>
                <button class="mini-btn" @click="resetCalendarMonth">回到本月</button>
              </div>
              <div class="flex flex-wrap gap-3 text-hint-c" style="font-size:11.5px">
                <span><span class="dot" style="background:#0284c7"></span>待指派</span>
                <span><span class="dot" style="background:#d97706"></span>待確認</span>
                <span><span class="dot" style="background:#059669"></span>已確認</span>
                <span><span class="dot" style="background:#7c3aed"></span>團體</span>
              </div>
            </div>
          </div>

          <!-- 甘特圖：每一列一個房間，橫軸是本月每一天，訂單以橫條呈現入住～退房區間 -->
          <div class="panel" style="padding:0;overflow-x:auto">
            <div class="gantt-grid" :style="{ gridTemplateColumns: `150px repeat(${ganttDays.length}, minmax(30px, 1fr))` }">
              <div class="gantt-corner">房間</div>
              <div
                v-for="d in ganttDays" :key="'h_' + d.date" class="gantt-day-head"
                :class="{ 'gantt-weekend': d.dow === 0 || d.dow === 6, 'gantt-today': d.isToday }"
              >
                <div class="gantt-day-num">{{ d.day }}</div>
                <div class="gantt-day-dow">{{ ['日','一','二','三','四','五','六'][d.dow] }}</div>
              </div>

              <template v-for="b in visibleOrderBuildings" :key="b.id">
                <div class="gantt-building-row" style="grid-column:1 / -1">{{ b.name }}</div>
                <template v-for="r in b.rooms" :key="r.id">
                  <div class="gantt-room-label">
                    <span>{{ r.id }}</span>
                    <span class="text-hint-c" style="font-size:11px;font-weight:500">{{ r.type }}</span>
                  </div>
                  <div
                    class="gantt-room-track" style="grid-column:2 / -1"
                    :style="{ gridTemplateColumns: `repeat(${ganttDays.length}, 1fr)` }"
                  >
                    <div
                      v-for="bar in ganttBarsForRoom(r.id)" :key="bar.booking.id"
                      class="gantt-bar" :class="bar.cls"
                      :style="{ gridColumnStart: bar.colStart, gridColumnEnd: bar.colEnd }"
                      :title="bar.title"
                      @click="openEditOrder(bar.booking)"
                    >{{ bar.label }}</div>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </div>

        <!-- ===================== 房况總覽 ===================== -->
        <div v-else-if="tab === 'overview'">

          <div class="flex gap-2 flex-wrap mb-4">
            <button class="pill-btn" :class="ordersBuilding === 'all' ? 'pill-active' : ''" @click="ordersBuilding = 'all'">全部棟別</button>
            <button v-for="b in buildings" :key="b.id" class="pill-btn" :class="ordersBuilding === b.id ? 'pill-active' : ''" @click="ordersBuilding = b.id">{{ b.name }}</button>
          </div>

          <!-- 房况總覽：後台常需要的營運數字 -->
          <div class="panel mb-4">
            <div class="flex items-center justify-between flex-wrap gap-2" :class="overviewCollapsed ? '' : 'mb-3'">
              <div class="flex items-center gap-2">
                <button class="collapse-btn" @click="overviewCollapsed = !overviewCollapsed" :title="overviewCollapsed ? '展開' : '收合'">{{ overviewCollapsed ? '▶' : '▼' }}</button>
                <h3 class="font-bold text-base-c" style="font-size:15px">
                  房况總覽<span class="text-hint-c" style="font-size:12px">{{ ordersBuilding === 'all' ? '（全部棟別）' : '（' + buildingNameOf(ordersBuilding) + '）' }}</span>
                </h3>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-hint-c" style="font-size:12.5px">查看日期</span>
                <button class="mini-btn" @click="shiftViewDate(-1)">◀</button>
                <div style="position:relative;display:inline-block">
                  <button class="mini-btn" @click="toggleViewDatePicker" style="padding:5px 10px">📅 {{ viewDate }}</button>
                  <div v-if="viewDatePickerOpen" class="fixed inset-0 z-30" @click="viewDatePickerOpen = false"></div>
                  <div v-if="viewDatePickerOpen" class="date-picker-pop" @click.stop>
                    <div class="flex items-center justify-between mb-2">
                      <button class="mini-btn" @click="shiftViewDatePickerMonth(-1)">◀</button>
                      <span class="text-base-c font-semibold" style="font-size:13px">{{ viewDatePickerMonth }}</span>
                      <button class="mini-btn" @click="shiftViewDatePickerMonth(1)">▶</button>
                    </div>
                    <div class="date-picker-grid date-picker-head">
                      <div v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</div>
                    </div>
                    <div class="date-picker-grid">
                      <button
                        v-for="(cell, idx) in viewDatePickerCells" :key="idx" class="date-picker-cell"
                        :class="{ 'date-picker-cell-empty': !cell, 'date-picker-cell-selected': cell && cell.date === viewDate, 'date-picker-cell-today': cell && cell.date === today }"
                        :disabled="!cell" @click="cell && pickViewDate(cell.date)"
                      >
                        <span v-if="cell">{{ cell.day }}</span>
                        <span v-if="cell && cell.hasBooking" class="date-picker-dot"></span>
                      </button>
                    </div>
                    <p class="text-hint-c mt-1.5" style="font-size:11px">有小圓點的日子代表當天有進行中的訂單</p>
                  </div>
                </div>
                <button class="mini-btn" @click="shiftViewDate(1)">▶</button>
                <button class="mini-btn" :class="isViewingToday ? 'mini-primary' : ''" @click="resetViewDate">回到今天</button>
              </div>
            </div>
            <template v-if="!overviewCollapsed">
              <p v-if="!isViewingToday" class="text-hint-c mb-3 mt-3" style="font-size:12px">目前顯示的是 {{ viewDate }} 當天的訂房狀況，不是即時狀況</p>
              <div class="stat-grid mb-4" :class="isViewingToday ? 'mt-3' : ''">
                <div class="stat-card"><div class="stat-label">上架房間</div><div class="stat-value">{{ orderStats.active }}</div></div>
                <div class="stat-card"><div class="stat-label">{{ isViewingToday ? '目前住房中' : viewDate + ' 住房中' }}</div><div class="stat-value">{{ orderStats.occupiedNow }}</div></div>
                <div class="stat-card"><div class="stat-label">{{ isViewingToday ? '目前空房' : viewDate + ' 空房' }}</div><div class="stat-value">{{ orderStats.vacant }}</div></div>
                <div class="stat-card"><div class="stat-label">{{ isViewingToday ? '今日應入住' : viewDate + ' 應入住' }}</div><div class="stat-value">{{ checkinTodayCount }}</div></div>
                <div class="stat-card"><div class="stat-label">{{ isViewingToday ? '今日應退房' : viewDate + ' 應退房' }}</div><div class="stat-value">{{ checkoutTodayCount }}</div></div>
                <div class="stat-card"><div class="stat-label">待指派訂單</div><div class="stat-value">{{ ordersUnassignedCount }}</div></div>
                <div class="stat-card"><div class="stat-label">待確認訂單</div><div class="stat-value">{{ ordersPendingCount }}</div></div>
              </div>

              <h4 class="font-semibold text-base-c mb-2" style="font-size:13.5px">依房型分類</h4>
              <div class="type-summary-grid">
                <div v-for="g in roomTypeSummary" :key="g.capacity" class="type-summary-card">
                  <div class="type-summary-title">
                    {{ g.capacity }} 人房 <span class="text-hint-c" style="font-size:11px">（{{ g.typesLabel }}）</span>
                  </div>
                  <div class="type-summary-row"><span class="text-hint-c">上架 / 總數</span><b class="text-base-c">{{ g.active }} / {{ g.total }} 間</b></div>
                  <div class="type-summary-row"><span class="text-hint-c">住房中</span><b style="color:#2563eb">{{ g.occupiedNow }} 間</b></div>
                  <div class="type-summary-row"><span class="text-hint-c">空房可訂</span><b style="color:#15803d">{{ g.vacant }} 間</b></div>
                </div>
                <div v-if="roomTypeSummary.length === 0" class="text-hint-c" style="font-size:12.5px">此棟別尚無房間資料</div>
              </div>
            </template>
          </div>
        </div>

        <!-- ===================== 訂房紀錄 ===================== -->
        <div v-else-if="tab === 'history'">
          <p class="text-hint-c mb-3" style="font-size:13.5px">已退房與已取消的訂單保留於此作為歷史紀錄，不會被刪除</p>
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
                <input type="text" v-model="historyKeyword" placeholder="搜尋房客姓名／訂單編號／房號" class="select-input">
              </div>
              <span class="text-hint-c" style="font-size:13px">共 {{ filteredHistory.length }} 筆</span>
            </div>
            <table class="w-full">
              <thead>
              <tr class="text-hint-c text-left" style="font-size:12px">
                <th class="py-1.5 font-semibold">訂單編號</th><th class="py-1.5 font-semibold">房間</th>
                <th class="py-1.5 font-semibold">房客</th><th class="py-1.5 font-semibold">電話</th>
                <th class="py-1.5 font-semibold">入住</th><th class="py-1.5 font-semibold">退房</th>
                <th class="py-1.5 font-semibold">人數</th><th class="py-1.5 font-semibold">金額</th>
                <th class="py-1.5 font-semibold">狀態</th><th class="py-1.5 font-semibold">操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="b in filteredHistory" :key="b.id" class="border-t border-light-c" style="font-size:13.5px">
                <td class="py-2 text-base-c">{{ b.id }}</td>
                <td class="py-2">
                  <span v-if="b.roomId" class="text-base-c">{{ roomLabel(b.roomId) }}</span>
                  <span v-else class="status-badge bg-sky-100 text-sky-700">未指派</span>
                </td>
                <td class="py-2 text-base-c">
                  {{ b.name }}
                  <button v-if="b.groupId" class="status-badge bg-violet-100 text-violet-700 ml-1" style="cursor:pointer" @click="openGroupTarget(b.groupId, b.groupName)">{{ b.groupName }}</button>
                </td>
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
                  <span v-else class="text-hint-c" style="font-size:12.5px">已完成入住</span>
                </td>
              </tr>
              <tr v-if="filteredHistory.length === 0"><td colspan="10" class="text-center text-hint-c py-6" style="font-size:13.5px">目前沒有歷史紀錄</td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </div>

    <!-- ===== 新增訂單 Modal ===== -->
    <div v-if="createOrderTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => createOrderTarget = false)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
        <h2 class="font-bold text-base-c mb-3" style="font-size:16px">新增訂單</h2>

        <div class="flex flex-col gap-2.5">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">房客姓名 *</label>
            <input type="text" v-model="newOrder.name" class="select-input" style="width:100%" placeholder="房客姓名">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">電話</label>
            <input type="text" v-model="newOrder.phone" class="select-input" style="width:100%" placeholder="聯絡電話">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">入住日期 *</label>
              <input type="date" v-model="newOrder.checkIn" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">退房日期 *</label>
              <input type="date" v-model="newOrder.checkOut" class="select-input" style="width:100%">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">人數 *</label>
              <input type="number" min="1" v-model.number="newOrder.guests" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">偏好棟別</label>
              <select v-model="newOrder.buildingPref" class="select-input" style="width:100%">
                <option value="all">不指定</option>
                <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">備註</label>
            <input type="text" v-model="newOrder.notes" class="select-input" style="width:100%" placeholder="選填">
          </div>

          <div class="border-t border-light-c pt-2.5 mt-1">
            <div class="flex items-center justify-between mb-1">
              <label class="block text-hint-c" style="font-size:13px">立即指派房間（選填，可稍後於訂單管理中指派）</label>
              <button
                class="mini-btn"
                @click="openRoomPicker('order', newOrder.checkIn, newOrder.checkOut, newOrder.guests, [])"
              >在平面圖選房間</button>
            </div>
            <select v-model="newOrder.roomId" @change="applyRoomCapacityAsGuests('order')" class="select-input" style="width:100%">
              <option value="">先不指派（建立為待指派訂單）</option>
              <option v-for="r in eligibleRoomsForCreate" :key="r.id" :value="r.id">
                {{ r.id }} {{ r.type }}・{{ r.buildingName }}・可住 {{ r.capacity }} 人・NT$ {{ r.price.toLocaleString() }}/晚
              </option>
            </select>
            <p v-if="newOrder.roomId" class="text-hint-c mt-1" style="font-size:12.5px">已選：{{ roomLabel(newOrder.roomId) }}</p>
            <p v-if="newOrder.checkIn && newOrder.checkOut && newOrder.guests && eligibleRoomsForCreate.length === 0" class="text-hint-c mt-1" style="font-size:12.5px">目前沒有符合條件且空著的房間，可先建立為待指派訂單</p>
          </div>
        </div>

        <p v-if="newOrderError" class="text-red-500 mt-2" style="font-size:13px">{{ newOrderError }}</p>

        <div class="flex justify-end gap-2 mt-4">
          <button class="btn-plain" @click="createOrderTarget = false">取消</button>
          <button class="mini-btn mini-primary" style="padding:7px 16px;font-size:14px" @click="createOrder">建立訂單</button>
        </div>
      </div>
    </div>

    <!-- ===== 編輯訂單 Modal：修改既有訂單的房客資料/日期/人數/備註，也可以在此直接換房間 ===== -->
    <div v-if="editOrderTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => editOrderTarget = null)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
        <h2 class="font-bold text-base-c mb-1" style="font-size:16px">編輯訂單</h2>
        <p class="text-hint-c mb-3" style="font-size:12.5px">訂單編號 {{ editOrderTarget }}</p>

        <div class="flex flex-col gap-2.5">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">房客姓名 *</label>
            <input type="text" v-model="editOrder.name" class="select-input" style="width:100%" placeholder="房客姓名">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">電話</label>
            <input type="text" v-model="editOrder.phone" class="select-input" style="width:100%" placeholder="聯絡電話">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">入住日期 *</label>
              <input type="date" v-model="editOrder.checkIn" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">退房日期 *</label>
              <input type="date" v-model="editOrder.checkOut" class="select-input" style="width:100%">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">人數 *</label>
              <input type="number" min="1" v-model.number="editOrder.guests" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">偏好棟別</label>
              <select v-model="editOrder.buildingPref" class="select-input" style="width:100%">
                <option value="all">不指定</option>
                <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">備註</label>
            <input type="text" v-model="editOrder.notes" class="select-input" style="width:100%" placeholder="選填">
          </div>

          <div class="border-t border-light-c pt-2.5 mt-1">
            <div class="flex items-center justify-between mb-1">
              <label class="block text-hint-c" style="font-size:13px">房間（指派／更換）</label>
              <button
                class="mini-btn"
                @click="openRoomPicker('edit', editOrder.checkIn, editOrder.checkOut, editOrder.guests, [], editOrderTarget)"
              >在平面圖選房間</button>
            </div>
            <select v-model="editOrder.roomId" @change="applyRoomCapacityAsGuests('edit')" class="select-input" style="width:100%">
              <option value="">先不指派（維持待指派訂單）</option>
              <option v-for="r in eligibleRoomsForEdit" :key="r.id" :value="r.id">
                {{ r.id }} {{ r.type }}・{{ r.buildingName }}・可住 {{ r.capacity }} 人・NT$ {{ r.price.toLocaleString() }}/晚
              </option>
            </select>
            <p v-if="editOrder.roomId" class="text-hint-c mt-1" style="font-size:12.5px">已選：{{ roomLabel(editOrder.roomId) }}</p>
            <p v-if="editOrder.checkIn && editOrder.checkOut && editOrder.guests && eligibleRoomsForEdit.length === 0" class="text-hint-c mt-1" style="font-size:12.5px">目前沒有符合條件且空著的房間</p>
          </div>
        </div>

        <p v-if="editOrderError" class="text-red-500 mt-2" style="font-size:13px">{{ editOrderError }}</p>

        <div class="flex justify-end gap-2 mt-4">
          <button class="btn-plain" @click="editOrderTarget = null">取消</button>
          <button class="mini-btn mini-primary" style="padding:7px 16px;font-size:14px" @click="submitEditOrder">儲存變更</button>
        </div>
      </div>
    </div>

    <!-- ===== 登記團體 Modal：一次登記好幾間房，全部掛同一個團體名稱，後台可以整團一起操作 ===== -->
    <div v-if="createGroupTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => createGroupTarget = false)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-2xl p-5 max-h-[85vh] overflow-y-auto">
        <h2 class="font-bold text-base-c mb-1" style="font-size:16px">登記團體</h2>
        <p class="text-hint-c mb-3" style="font-size:12.5px">每一間房各自還是一筆訂單，只是都會蓋上同一個團體名稱，之後可以在列表／平面圖／日曆看到團體標記，也可以整團一起確認／退房／取消。</p>

        <div class="grid grid-cols-4 gap-2 mb-3">
          <div class="col-span-1">
            <label class="block text-hint-c mb-1" style="font-size:13px">團體名稱 *</label>
            <input type="text" v-model="newGroup.groupName" class="select-input" style="width:100%" placeholder="例如：愛加倍靈修中心">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">聯絡電話</label>
            <input type="text" v-model="newGroup.phone" class="select-input" style="width:100%" placeholder="團體統一聯絡電話">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">入住日期 *</label>
            <input type="date" v-model="newGroup.checkIn" class="select-input" style="width:100%">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">退房日期 *</label>
            <input type="date" v-model="newGroup.checkOut" class="select-input" style="width:100%">
          </div>
        </div>

        <div class="bg-surface2 rounded-lg p-2.5 mb-3">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-hint-c" style="font-size:13px">包棟</span>
            <select v-model="wholeBuildingPick" class="select-input">
              <option value="">選擇要整棟加入的棟別</option>
              <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <button class="mini-btn mini-primary" @click="applyWholeBuilding">整棟加入</button>
          </div>
          <p class="text-hint-c mt-1.5" style="font-size:12px">會把該棟目前空著的房間全部加進下面清單，之後每間房還是可以個別調整人數／備註／刪除</p>
          <p v-if="wholeBuildingNote" class="text-base-c mt-1" style="font-size:12.5px">{{ wholeBuildingNote }}</p>
        </div>

        <div class="flex flex-col gap-2">
          <div v-for="(row, idx) in newGroup.rooms" :key="idx" class="bg-surface2 rounded-lg p-2.5">
            <div class="grid grid-cols-12 gap-2 items-end">
              <div class="col-span-2">
                <label class="block text-hint-c mb-1" style="font-size:12px">偏好棟別</label>
                <select v-model="row.buildingPref" @change="onGroupRowBuildingChange(idx)" class="select-input" style="width:100%">
                  <option value="all">不指定</option>
                  <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
                </select>
              </div>
              <div class="col-span-3">
                <label class="block text-hint-c mb-1" style="font-size:12px">房間</label>
                <select v-model="row.roomId" @change="applyGroupRoomCapacityAsGuests(idx)" class="select-input" style="width:100%">
                  <option value="">選擇房間</option>
                  <option v-for="r in eligibleRoomsForGroupRow(idx)" :key="r.id" :value="r.id">
                    {{ r.id }} {{ r.type }}・{{ r.buildingName }}・可住 {{ r.capacity }} 人
                  </option>
                </select>
              </div>
              <div class="col-span-1 flex justify-center">
                <button
                  class="mini-btn"
                  title="在平面圖選房間"
                  @click="openRoomPicker('group:' + idx, newGroup.checkIn, newGroup.checkOut, row.guests, newGroup.rooms.filter((r, i) => i !== idx && r.roomId).map(r => r.roomId))"
                >平面圖</button>
              </div>
              <div class="col-span-2">
                <label class="block text-hint-c mb-1" style="font-size:12px">聯絡人姓名</label>
                <input type="text" v-model="row.name" class="select-input" style="width:100%" placeholder="留空用團體名稱">
              </div>
              <div class="col-span-1">
                <label class="block text-hint-c mb-1" style="font-size:12px">人數</label>
                <input type="number" min="1" v-model.number="row.guests" class="select-input" style="width:100%">
              </div>
              <div class="col-span-2">
                <label class="block text-hint-c mb-1" style="font-size:12px">備註</label>
                <input type="text" v-model="row.notes" class="select-input" style="width:100%" placeholder="選填">
              </div>
              <div class="col-span-1 flex justify-end">
                <button class="mini-btn mini-danger" :disabled="newGroup.rooms.length <= 1" @click="removeGroupRoomRow(idx)">刪</button>
              </div>
            </div>
            <p v-if="newGroup.checkIn && newGroup.checkOut && eligibleRoomsForGroupRow(idx).length === 0" class="text-hint-c mt-1" style="font-size:12px">這個棟別／日期沒有空房可選了（或已經被表單裡其他列選走）</p>
          </div>
        </div>

        <button class="mini-btn mt-2" @click="addGroupRoomRow">+ 新增一間房</button>

        <p v-if="newGroupError" class="text-red-500 mt-3" style="font-size:13px">{{ newGroupError }}</p>

        <div class="flex justify-end gap-2 mt-4">
          <button class="btn-plain" @click="createGroupTarget = false">取消</button>
          <button class="mini-btn mini-primary" style="padding:7px 16px;font-size:14px" :disabled="groupSaving" @click="createGroup">{{ groupSaving ? '登記中...' : '建立團體訂單' }}</button>
        </div>
      </div>
    </div>

    <!-- ===== 平面圖選房間：新增訂單／登記團體共用，疊在原本的 Modal 上面（z-40） ===== -->
    <div v-if="roomPicker" class="fixed inset-0 bg-black/60 flex items-center justify-center z-40 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => roomPicker = null)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-3xl p-5 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-1">
          <h2 class="font-bold text-base-c" style="font-size:16px">在平面圖選房間</h2>
          <button class="btn-plain" @click="roomPicker = null">取消</button>
        </div>
        <p class="text-hint-c mb-3" style="font-size:12.5px">灰色代表人數不夠、該日期已被占用、已下架或已經被表單裡其他列選走，不能點；點綠色房間即可選定。</p>
        <div v-for="grp in buildings" :key="grp.id" class="mb-6 last:mb-0">
          <div class="flex items-center gap-2 mb-2">
            <span class="building-badge">{{ grp.name.charAt(0) }}</span>
            <h3 class="font-bold text-base-c" style="font-size:15px">{{ grp.name }}</h3>
          </div>
          <RoomFloorplan
            :building="grp"
            :bookings="bookings"
            :unavailable-ids="roomPickerUnavailableIds"
            :reference-date="roomPicker.checkIn"
            @select="room => room && pickRoomFromFloorplan(room)"
          />
        </div>
        <div class="flex flex-wrap gap-4 text-hint-c mt-2" style="font-size:12.5px">
          <span><span class="dot" style="background:#10b981"></span>可選</span>
          <span><span class="dot" style="background:#a8a29e"></span>不可選</span>
        </div>
      </div>
    </div>

    <!-- ===== 團體管理 Modal：查看同一團體底下所有房間，可以整團一起確認/退房/取消 ===== -->
    <div v-if="groupTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => groupTarget = null)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
        <div v-if="!groupEditing" class="flex items-start justify-between gap-2 mb-1">
          <h2 class="font-bold text-base-c" style="font-size:16px">{{ groupTarget.groupName }}</h2>
          <button class="mini-btn" @click="startGroupEdit">編輯團體資訊</button>
        </div>
        <p v-if="!groupEditing" class="text-hint-c mb-3" style="font-size:12.5px">共 {{ groupBookings.length }} 間房{{ groupBookings[0] && groupBookings[0].phone ? '・' + groupBookings[0].phone : '' }}</p>

        <div v-if="groupEditing" class="bg-surface2 rounded-lg p-3 mb-3">
          <div class="flex flex-col gap-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">團體名稱 *</label>
              <input type="text" v-model="groupEditForm.groupName" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:13px">聯絡電話</label>
              <input type="text" v-model="groupEditForm.phone" class="select-input" style="width:100%" placeholder="團體統一聯絡電話">
            </div>
          </div>
          <p v-if="groupEditError" class="text-red-500 mt-2" style="font-size:13px">{{ groupEditError }}</p>
          <div class="flex justify-end gap-2 mt-3">
            <button class="btn-plain" @click="groupEditing = false">取消</button>
            <button class="mini-btn mini-primary" @click="submitGroupEdit">儲存變更</button>
          </div>
          <p class="text-hint-c mt-2" style="font-size:12px">會套用到這個團體底下每一間房的訂單；個別房間的房客姓名/人數/日期請用下面每筆訂單的「編輯」</p>
        </div>

        <div class="flex gap-2 flex-wrap mb-3 pb-3 border-b border-light-c">
          <button class="mini-btn mini-primary" @click="setGroupStatusAll('confirmed')">整團確認</button>
          <button class="mini-btn" @click="setGroupStatusAll('completed')">整團設為已退房</button>
          <button class="mini-btn mini-danger" @click="setGroupStatusAll('cancelled')">整團取消</button>
        </div>

        <div v-for="bk in groupBookings" :key="bk.id" class="bg-surface2 rounded-lg p-3 mb-2.5" style="font-size:13px">
          <div class="flex justify-between py-0.5"><span class="text-hint-c">房間</span><span class="text-base-c">{{ bk.roomId ? roomLabel(bk.roomId) : '待指派' }}</span></div>
          <div class="flex justify-between py-0.5"><span class="text-hint-c">聯絡人</span><span class="text-base-c">{{ bk.name }}（{{ bk.guests }} 人）</span></div>
          <div class="flex justify-between py-0.5" v-if="bk.notes"><span class="text-hint-c">備註</span><span class="text-base-c">{{ bk.notes }}</span></div>
          <div class="flex items-center justify-between py-1 mt-1 border-t border-light-c">
            <span class="status-badge" :class="statusClass(bk.status)">{{ statusLabel(bk.status) }}</span>
            <button class="mini-btn" @click="openEditOrder(bk); groupTarget = null">編輯</button>
          </div>
        </div>
        <p v-if="groupBookings.length === 0" class="text-hint-c text-center py-4" style="font-size:13px">找不到這個團體的訂單</p>

        <div class="flex justify-end mt-2">
          <button class="btn-plain" @click="groupTarget = null">關閉</button>
        </div>
      </div>
    </div>

    <!-- ===== 指派房間 Modal ===== -->
    <div v-if="assignTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => assignTarget = null)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 class="font-bold text-base-c" style="font-size:16px">為訂單 {{ assignTarget.id }} 指派房間</h2>
          <div class="segmented">
            <button :class="assignMode === 'single' ? 'seg-active' : ''" :style="assignMode === 'single' ? segActiveStyle : ''" @click="assignMode = 'single'">單一房間</button>
            <button :class="assignMode === 'group' ? 'seg-active' : ''" :style="assignMode === 'group' ? segActiveStyle : ''" @click="assignMode = 'group'">分配到多間房（團體）</button>
          </div>
        </div>
        <div class="bg-surface2 rounded-lg p-3 mb-3" style="font-size:13.5px">
          <div class="flex justify-between py-0.5"><span class="text-hint-c">房客</span><span class="text-base-c">{{ assignTarget.name }}（{{ assignTarget.guests }} 人）</span></div>
          <div class="flex justify-between py-0.5"><span class="text-hint-c">入住 → 退房</span><span class="text-base-c">{{ assignTarget.checkIn }} → {{ assignTarget.checkOut }}（{{ nights(assignTarget.checkIn, assignTarget.checkOut) }} 晚）</span></div>
          <div class="flex justify-between py-0.5" v-if="assignTarget.buildingPref !== 'all'"><span class="text-hint-c">偏好棟別</span><span class="text-base-c">{{ buildingNameOf(assignTarget.buildingPref) }}</span></div>
        </div>

        <!-- 單一房間：跟原本一樣，一筆訂單指定一間房 -->
        <template v-if="assignMode === 'single'">
          <label class="block text-hint-c mb-1" style="font-size:13px">依棟別篩選</label>
          <select v-model="assignBuildingFilter" class="select-input mb-3" style="width:100%">
            <option value="all">全部棟別（可住 {{ assignTarget.guests }} 人以上）</option>
            <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>

          <p v-if="assignError" class="text-red-500 mb-2" style="font-size:13px">{{ assignError }}</p>

          <div class="flex flex-col gap-2">
            <div v-for="r in eligibleRooms" :key="r.id" class="flex items-center justify-between border border-light-c rounded-lg px-3 py-2" :class="r.buildingId === assignTarget.buildingPref ? 'border-amber-400' : ''">
              <div>
                <div class="font-semibold text-base-c" style="font-size:13.5px">{{ r.id }} <span class="status-badge bg-stone-100 text-stone-600 ml-1">{{ r.type }}</span></div>
                <div class="text-hint-c" style="font-size:12.5px">{{ r.buildingName }} ・ 可住 {{ r.capacity }} 人 ・ {{ r.bed }} ・ NT$ {{ r.price.toLocaleString() }}/晚</div>
              </div>
              <button class="mini-btn mini-primary" @click="assignRoom(r)">選擇此房</button>
            </div>
            <div v-if="eligibleRooms.length === 0" class="text-center text-hint-c py-6" style="font-size:13.5px">
              目前沒有可住 {{ assignTarget.guests }} 人以上、且該日期空著的房間，請調整篩選或聯絡房務確認。<br>
              人數較多可以改用上面的「分配到多間房（團體）」，拆成好幾間房一起入住。
            </div>
          </div>
        </template>

        <!-- 分配到多間房（團體）：這一筆訂單人數太多、單一房間住不下時，拆成好幾間房，
             全部蓋上同一個團體名稱，之後可以在「團體管理」整團一起確認/退房/取消 -->
        <template v-else>
          <p class="text-hint-c mb-2" style="font-size:12.5px">會拆成好幾筆訂單，這一筆訂單本身會變成分配到的第一間房，其餘各自新增，全部掛同一個團體名稱。</p>
          <label class="block text-hint-c mb-1" style="font-size:13px">團體名稱 *</label>
          <input type="text" v-model="splitGroupName" class="select-input mb-3" style="width:100%" :placeholder="'例如：' + assignTarget.name">

          <div class="flex flex-col gap-2">
            <div v-for="(row, idx) in splitRows" :key="idx" class="bg-surface2 rounded-lg p-2.5">
              <div class="grid grid-cols-12 gap-2 items-end">
                <div class="col-span-5">
                  <label class="block text-hint-c mb-1" style="font-size:12px">房間</label>
                  <select v-model="row.roomId" class="select-input" style="width:100%">
                    <option value="">選擇房間</option>
                    <option v-for="r in eligibleRoomsForSplitRow(idx)" :key="r.id" :value="r.id">
                      {{ r.id }} {{ r.type }}・{{ r.buildingName }}・可住 {{ r.capacity }} 人
                    </option>
                  </select>
                </div>
                <div class="col-span-2">
                  <label class="block text-hint-c mb-1" style="font-size:12px">此房人數</label>
                  <input type="number" min="1" v-model.number="row.guests" class="select-input" style="width:100%">
                </div>
                <div class="col-span-3">
                  <label class="block text-hint-c mb-1" style="font-size:12px">聯絡人（留空用團體名稱）</label>
                  <input type="text" v-model="row.name" class="select-input" style="width:100%" placeholder="選填">
                </div>
                <div class="col-span-1">
                  <label class="block text-hint-c mb-1" style="font-size:12px">備註</label>
                  <input type="text" v-model="row.notes" class="select-input" style="width:100%" placeholder="選填">
                </div>
                <div class="col-span-1 flex justify-end">
                  <button class="mini-btn mini-danger" :disabled="splitRows.length <= 1" @click="removeSplitRow(idx)">刪</button>
                </div>
              </div>
              <p v-if="eligibleRoomsForSplitRow(idx).length === 0" class="text-hint-c mt-1" style="font-size:12px">這個日期沒有空房可選了（或已經被表單裡其他列選走）</p>
            </div>
          </div>

          <div class="flex items-center justify-between mt-2">
            <button class="mini-btn" @click="addSplitRow">+ 新增一間房</button>
            <span class="text-hint-c" style="font-size:12.5px">已分配 {{ splitTotalGuests }} / {{ assignTarget.guests }} 人</span>
          </div>
          <p v-if="splitTotalGuests !== assignTarget.guests" class="text-hint-c mt-1" style="font-size:12px">分配的人數總和跟訂單原本的人數不一樣，仍可送出，但建議先確認一下</p>

          <p v-if="splitError" class="text-red-500 mt-2" style="font-size:13px">{{ splitError }}</p>

          <div class="flex justify-end gap-2 mt-3">
            <button class="mini-btn mini-primary" style="padding:7px 16px;font-size:14px" :disabled="splitSaving" @click="submitSplit">{{ splitSaving ? '處理中...' : '拆成團體並分配' }}</button>
          </div>
        </template>

        <div class="flex justify-end mt-4">
          <button class="btn-plain" @click="assignTarget = null">關閉</button>
        </div>
      </div>
    </div>

    <!-- ===== 平面圖點擊：訂單詳情 Modal ===== -->
    <div v-if="tileTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => tileTarget = null)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-1" style="font-size:16px">{{ tileTarget.room.id }} · {{ buildingNameOf(tileTarget.buildingId) }}</h2>
        <p v-if="tileTarget.bookings.length > 1" class="text-hint-c mb-3" style="font-size:12.5px">此房目前有 {{ tileTarget.bookings.length }} 筆不同時段的進行中訂單</p>
        <div v-if="tileTarget.bookings.length">
          <div v-for="bk in tileTarget.bookings" :key="bk.id" class="bg-surface2 rounded-lg p-3 mb-3" style="font-size:13.5px" :class="bk.checkIn <= viewDate && viewDate < bk.checkOut ? 'ring-2 ring-emerald-400' : ''">
            <div class="flex justify-between py-0.5" v-if="bk.checkIn <= viewDate && viewDate < bk.checkOut"><span class="text-hint-c">　</span><span class="status-badge bg-emerald-100 text-emerald-700">涵蓋 {{ viewDate }}</span></div>
            <div class="flex justify-between py-0.5"><span class="text-hint-c">訂單編號</span><span class="text-base-c">{{ bk.id }}</span></div>
            <div class="flex justify-between py-0.5"><span class="text-hint-c">房客</span><span class="text-base-c">{{ bk.name }}（{{ bk.guests }} 人）<button v-if="bk.groupId" class="status-badge bg-violet-100 text-violet-700 ml-1" style="cursor:pointer" @click="openGroupTarget(bk.groupId, bk.groupName)">{{ bk.groupName }}</button></span></div>
            <div class="flex justify-between py-0.5"><span class="text-hint-c">電話</span><span class="text-base-c">{{ bk.phone }}</span></div>
            <div class="flex justify-between py-0.5"><span class="text-hint-c">入住 → 退房</span><span class="text-base-c">{{ bk.checkIn }} → {{ bk.checkOut }}</span></div>
            <div class="flex justify-between py-0.5" v-if="bk.notes"><span class="text-hint-c">備註</span><span class="text-base-c">{{ bk.notes }}</span></div>
            <div class="flex justify-between py-1 mt-1 border-t border-light-c"><span class="text-hint-c">狀態</span><span class="status-badge" :class="statusClass(bk.status)">{{ statusLabel(bk.status) }}</span></div>
            <div class="flex gap-2 flex-wrap mt-2">
              <button v-if="bk.groupId" class="mini-btn" @click="openGroupTarget(bk.groupId, bk.groupName); tileTarget = null">查看整團</button>
              <button class="mini-btn" @click="openEditOrder(bk); tileTarget = null">編輯</button>
              <button v-if="bk.status === 'pending'" class="mini-btn mini-primary" @click="quickSetTile(bk.id, 'confirmed')">確認訂單</button>
              <button v-if="bk.status === 'confirmed'" class="mini-btn" @click="quickSetTile(bk.id, 'completed')">設為已退房</button>
              <button class="mini-btn" @click="quickSetTile(bk.id, 'cancelled')">取消訂單</button>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-2">
          <p class="text-hint-c mb-1" style="font-size:14px">此房目前沒有進行中的訂單。</p>
          <p class="text-hint-c" style="font-size:13px">{{ tileTarget.room.type }}・可住 {{ tileTarget.room.capacity }} 人・NT$ {{ tileTarget.room.price.toLocaleString() }}/晚</p>
        </div>
        <div class="flex justify-end mt-4">
          <button class="btn-plain" @click="tileTarget = null">關閉</button>
        </div>
      </div>
    </div>

    <!-- 日曆當日明細已改成 tab === 'calendar' 內的右側常駐面板，不再用彈窗 -->

  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'booking.orders' })

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

const today = new Date().toISOString().slice(0, 10)

// 「查看日期」：訂單管理頁的房况總覽／平面圖，預設顯示今天的狀況，
// 但可以切換到別的日期，回推或預覽當天／未來某天各房間的訂房狀況
const viewDate = ref(today)
// 房况總覽可收合，避免佔掉太多版面（尤其是手機或訂單很多棟別展開時）；
// 收合狀態存 localStorage，重新整理或下次再開這頁時會記得上次的選擇
const OVERVIEW_COLLAPSED_KEY = 'holymotherfarm_rooms_overview_collapsed'
const overviewCollapsed = ref(false)
onMounted(() => {
  if (typeof window === 'undefined') return
  overviewCollapsed.value = localStorage.getItem(OVERVIEW_COLLAPSED_KEY) === '1'
})
watch(overviewCollapsed, v => {
  if (typeof window === 'undefined') return
  localStorage.setItem(OVERVIEW_COLLAPSED_KEY, v ? '1' : '0')
})
const isViewingToday = computed(() => viewDate.value === today)
function shiftViewDate(days) {
  const d = new Date(viewDate.value)
  d.setDate(d.getDate() + days)
  viewDate.value = d.toISOString().slice(0, 10)
}
function resetViewDate() { viewDate.value = today }

/* 「查看日期」自訂選擇器：原生 <input type="date"> 沒辦法在有訂房的日子加標記，
   所以自己刻一個小月曆彈出選單，跟房况總覽／平面圖共用同一份 viewDate。 */
const viewDatePickerOpen = ref(false)
const viewDatePickerMonth = ref(today.slice(0, 7)) // 'YYYY-MM'
function toggleViewDatePicker() {
  if (!viewDatePickerOpen.value) viewDatePickerMonth.value = viewDate.value.slice(0, 7)
  viewDatePickerOpen.value = !viewDatePickerOpen.value
}
function shiftViewDatePickerMonth(diff) {
  const [y, m] = viewDatePickerMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1 + diff, 1)
  viewDatePickerMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
// 目前顯示的月份裡，哪些日子有進行中的訂單（依目前的棟別篩選），有的話小月曆會點一個標記
const viewDatePickerBookedDates = computed(() => {
  const [y, m] = viewDatePickerMonth.value.split('-').map(Number)
  const monthStart = `${viewDatePickerMonth.value}-01`
  const monthEnd = `${viewDatePickerMonth.value}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  const set = new Set()
  for (const b of activeBookings.value.filter(bookingInSelectedBuilding)) {
    let d = b.checkIn > monthStart ? b.checkIn : monthStart
    const last = b.checkOut < monthEnd ? b.checkOut : monthEnd
    while (d <= last) {
      set.add(d)
      const nd = new Date(d)
      nd.setDate(nd.getDate() + 1)
      d = nd.toISOString().slice(0, 10)
    }
  }
  return set
})
const viewDatePickerCells = computed(() => {
  const [y, m] = viewDatePickerMonth.value.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const leadingBlanks = new Date(y, m - 1, 1).getDay()
  const cells = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, date, hasBooking: viewDatePickerBookedDates.value.has(date) })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})
function pickViewDate(date) {
  viewDate.value = date
  viewDatePickerOpen.value = false
}

const loading   = ref(false)
const tab       = ref('dashboard') // dashboard | orders | floorplan | calendar | overview | history
// 日曆／甘特圖需要比較寬的版面才擺得下，這兩個 tab 不套用 max-w-5xl 置中限制，直接吃滿版面寬度
const wideTab = computed(() => tab.value === 'calendar' || tab.value === 'gantt')
// 行內樣式備援：避免外部/全域 CSS 蓋掉 .seg-active 的優先權，導致選中狀態沒有亮起
const segActiveStyle = { background: '#15803d', color: '#fff' }

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
// 下拉選單選房間（非平面圖）時，也比照平面圖選房：人數直接預設為該房可住上限
function applyRoomCapacityAsGuests(target) {
  if (target === 'order') {
    const r = roomById(newOrder.value.roomId)
    if (r) newOrder.value.guests = r.capacity
  } else if (target === 'edit') {
    const r = roomById(editOrder.value.roomId)
    if (r) editOrder.value.guests = r.capacity
  }
}
function applyGroupRoomCapacityAsGuests(idx) {
  const row = newGroup.value.rooms[idx]
  if (!row) return
  const r = roomById(row.roomId)
  if (r) row.guests = r.capacity
}
function roomLabel(roomId) {
  const r = roomById(roomId)
  return r ? `${r.id} ${r.type}` : '尚未指派'
}
function roomIdOf(roomId) {
  const r = roomById(roomId)
  return r ? r.id : '尚未指派'
}
function roomTypeOf(roomId) {
  const r = roomById(roomId)
  return r ? r.type : ''
}
/* 人數欄顯示「入住人數／房間可住人數」，例如 6 人房入住 1 位就顯示 1/6；尚未指派房間時只顯示人數 */
function occupancyLabel(b) {
  const r = roomById(b.roomId)
  return r ? `${b.guests}/${r.capacity}` : `${b.guests} 人`
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

const ordersBuilding = ref('all')
const ordersStatus   = ref('all')
const ordersKeyword  = ref('')
const ordersDateFrom = ref('')
const ordersDateTo   = ref('')
const ordersMonthPick = ref(today.slice(0, 7)) // 'YYYY-MM'，快速選月用
// 把「時段」篩選一次設成整個月的第一天到最後一天，比自己手動點兩次日期快
function applyOrdersMonth(ym) {
  if (!ym) return
  const [y, m] = ym.split('-').map(Number)
  ordersDateFrom.value = `${ym}-01`
  ordersDateTo.value = `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}
function shiftOrdersMonth(diff) {
  const [y, m] = ordersMonthPick.value.split('-').map(Number)
  const d = new Date(y, m - 1 + diff, 1)
  ordersMonthPick.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  applyOrdersMonth(ordersMonthPick.value)
}
function resetOrdersMonth() {
  ordersMonthPick.value = today.slice(0, 7)
  applyOrdersMonth(ordersMonthPick.value)
}

function bookingInSelectedBuilding(b) {
  if (ordersBuilding.value === 'all') return true
  if (b.roomId) { const r = roomById(b.roomId); return r && r.buildingId === ordersBuilding.value }
  return b.buildingPref === ordersBuilding.value
}

const filteredOrders = computed(() => {
  const kw = ordersKeyword.value.trim().toLowerCase()
  return activeBookings.value
    .filter(b => ordersStatus.value === 'all' || b.status === ordersStatus.value)
    .filter(bookingInSelectedBuilding)
    .filter(b => !kw || b.name.toLowerCase().includes(kw) || b.id.toLowerCase().includes(kw) || (b.roomId && b.roomId.toLowerCase().includes(kw)))
    .filter(b => (!ordersDateFrom.value && !ordersDateTo.value) || rangesOverlap(
      ordersDateFrom.value || b.checkIn, ordersDateTo.value || b.checkOut, b.checkIn, b.checkOut
    ))
    .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))
})

/* 列表檢視：屬於同一個團體的訂單一律排到最上方，用一個常駐的「團體表頭列」統一控制展開/收合
   （點表頭本身就能收合，不需要每一列都放一顆收合按鈕）；沒有 groupId 的訂單照舊依入住日期排序，
   接在所有團體後面 */
const expandedGroups = ref(new Set())
function toggleGroup(groupId) {
  const s = new Set(expandedGroups.value)
  if (s.has(groupId)) s.delete(groupId); else s.add(groupId)
  expandedGroups.value = s
}
function groupDateRangeLabel(members) {
  const ins  = members.map(m => m.checkIn).sort()
  const outs = members.map(m => m.checkOut).sort()
  const minIn = ins[0], maxOut = outs[outs.length - 1]
  const sameRange = ins.every(d => d === minIn) && outs.every(d => d === maxOut)
  return sameRange ? `${minIn} → ${maxOut}` : `${minIn} ～ ${maxOut}（各房日期不同）`
}
function groupStatusSummary(members) {
  const counts = {}
  for (const m of members) counts[m.status] = (counts[m.status] || 0) + 1
  return Object.entries(counts).map(([s, c]) => `${statusLabel(s)} ${c}`).join('・')
}
const orderRows = computed(() => {
  const groups = new Map()
  const singles = []
  for (const b of filteredOrders.value) {
    if (b.groupId) {
      if (!groups.has(b.groupId)) groups.set(b.groupId, { groupId: b.groupId, groupName: b.groupName, members: [] })
      groups.get(b.groupId).members.push(b)
    } else {
      singles.push(b)
    }
  }
  const rows = []
  for (const g of [...groups.values()].sort((a, b) => (a.members[0].checkIn < b.members[0].checkIn ? -1 : 1))) {
    const expanded = expandedGroups.value.has(g.groupId)
    rows.push({ kind: 'groupHeader', groupId: g.groupId, groupName: g.groupName, members: g.members, expanded })
    if (expanded) {
      for (const b of g.members) rows.push({ kind: 'booking', booking: b, inGroup: true })
    }
  }
  for (const b of singles) rows.push({ kind: 'booking', booking: b, inGroup: false })
  return rows
})

/* 房况總覽：依棟別篩選為範圍，並依 viewDate（可切換的查看日期）判斷住房狀況 */
function isOccupiedNow(roomId) {
  return bookings.value.some(b => b.roomId === roomId && b.status === 'confirmed' && b.checkIn <= viewDate.value && viewDate.value < b.checkOut)
}
const roomsInSelectedBuilding = computed(() =>
  ordersBuilding.value === 'all' ? rooms.value : rooms.value.filter(r => r.buildingId === ordersBuilding.value)
)
/* 依可住人數（X人房）分類統計：總間數／上架間數／目前住房中／空房可訂 */
const roomTypeSummary = computed(() => {
  const map = new Map()
  for (const r of roomsInSelectedBuilding.value) {
    if (!map.has(r.capacity)) map.set(r.capacity, { capacity: r.capacity, types: new Set(), total: 0, active: 0, occupiedNow: 0 })
    const g = map.get(r.capacity)
    g.types.add(r.type)
    g.total++
    if (r.active) {
      g.active++
      if (isOccupiedNow(r.id)) g.occupiedNow++
    }
  }
  return [...map.values()]
    .sort((a, b) => a.capacity - b.capacity)
    .map(g => ({ ...g, typesLabel: [...g.types].join('／'), vacant: g.active - g.occupiedNow }))
})
const orderStats = computed(() =>
  roomTypeSummary.value.reduce((acc, g) => {
    acc.total += g.total; acc.active += g.active; acc.occupiedNow += g.occupiedNow; acc.vacant += g.vacant
    return acc
  }, { total: 0, active: 0, occupiedNow: 0, vacant: 0 })
)
/* 應入住／應退房：依 viewDate 計算（預設今天），切換日期即可預覽/回顧當天的異動量 */
const checkinTodayCount = computed(() =>
  bookings.value.filter(b => b.status !== 'cancelled' && b.status !== 'completed' && b.checkIn === viewDate.value && bookingInSelectedBuilding(b)).length
)
const checkoutTodayCount = computed(() =>
  bookings.value.filter(b => b.status === 'confirmed' && b.checkOut === viewDate.value && bookingInSelectedBuilding(b)).length
)
const ordersUnassignedCount = computed(() => bookings.value.filter(b => b.status === 'unassigned' && bookingInSelectedBuilding(b)).length)
const ordersPendingCount = computed(() => bookings.value.filter(b => b.status === 'pending' && bookingInSelectedBuilding(b)).length)

const visibleOrderBuildings = computed(() =>
  ordersBuilding.value === 'all' ? buildings.value : buildings.value.filter(b => b.id === ordersBuilding.value)
)
const unassignedForFloor = computed(() =>
  [...bookings.value.filter(b => b.status === 'unassigned')].sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))
)

// 同一間房可以有多筆「日期不重疊」的進行中訂單（例如 201 房 7/31~8/2 一筆、8/21~8/26 另一筆），
// 所以這裡回傳的是「全部」進行中訂單（依入住日期排序），不是只有一筆
function roomBookingsForRoom(roomId) {
  return bookings.value
    .filter(b => b.roomId === roomId && (b.status === 'pending' || b.status === 'confirmed'))
    .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))
}
// 平面圖顏色／標籤要回答的是「viewDate 這一天，這間房是什麼狀態」，
// 所以要挑的是「checkIn <= viewDate < checkOut」的那一筆，不是不分日期抓最早的一筆
function bookingOnDate(roomId, date) {
  return roomBookingsForRoom(roomId).find(b => b.checkIn <= date && date < b.checkOut) || null
}
function orderTileClass(r) {
  if (!r.active) return 'tile-inactive'
  const b = bookingOnDate(r.id, viewDate.value)
  if (!b) return 'tile-vacant'
  return b.status === 'pending' ? 'tile-pending' : 'tile-occupied'
}
function orderTileLabel(r) {
  if (!r.active) return '已下架'
  const list = roomBookingsForRoom(r.id)
  const b = bookingOnDate(r.id, viewDate.value)
  const more = list.length > (b ? 1 : 0) ? `（+${list.length - (b ? 1 : 0)} 筆其他時段）` : ''
  if (!b) return '空房' + more
  return (b.status === 'pending' ? '待確認・' : '已確認・') + (b.groupName || b.name) + more
}
// 給 RoomFloorplan 的 statusResolver prop：訂單管理要分「待確認」跟「已確認」兩種顏色，
// 跟房間管理預設的「今日住房中／空房」邏輯不同，所以這裡自訂
function orderStatusResolver(r) {
  return { cls: orderTileClass(r), label: orderTileLabel(r) }
}

const tileTarget = ref(null)
function openBookingTile(room, buildingId) {
  tileTarget.value = { room, buildingId, bookings: roomBookingsForRoom(room.id) }
}
async function quickSetTile(bookingId, status) {
  if (!tileTarget.value) return
  await setStatus(bookingId, status) // setStatus 內部已經會重新 fetchAll()
  if (tileTarget.value) {
    tileTarget.value = { ...tileTarget.value, bookings: roomBookingsForRoom(tileTarget.value.room.id) }
  }
}

/* ---------------- 日曆檢視 ---------------- */

const calendarMonth = ref(today.slice(0, 7)) // 'YYYY-MM'
const calendarMonthLabel = computed(() => {
  const [y, m] = calendarMonth.value.split('-')
  return `${y} 年 ${Number(m)} 月`
})
function shiftCalendarMonth(diff) {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1 + diff, 1)
  calendarMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function resetCalendarMonth() { calendarMonth.value = today.slice(0, 7) }

function calendarPillClass(status) {
  return { unassigned: 'bg-sky-600', pending: 'bg-amber-600', confirmed: 'bg-emerald-600' }[status] || 'bg-stone-500'
}
// 某一天有哪些訂單「有關」：入住日／退房日／中間在住都算，並標記是入住還是退房，
// 方便日曆一眼看出當天要接待誰、要送誰走。同一個團體當天不管佔了幾間房，都合併成一筆
// 摘要（而不是一間房一筆、洗版整個日曆），沒有 groupId 的個人訂房則照舊逐筆列出。
function bookingsOnCalendarDate(date) {
  const raw = activeBookings.value
    .filter(bookingInSelectedBuilding)
    .filter(b => b.checkIn <= date && date <= b.checkOut)
    .map(b => ({ ...b, calTag: b.checkIn === date ? '入住' : (b.checkOut === date ? '退房' : '') }))

  const groupMap = new Map()
  const singles = []
  for (const b of raw) {
    if (b.groupId) {
      if (!groupMap.has(b.groupId)) groupMap.set(b.groupId, [])
      groupMap.get(b.groupId).push(b)
    } else {
      singles.push(b)
    }
  }
  const groupEntries = [...groupMap.entries()].map(([groupId, members]) => {
    const tags = new Set(members.map(m => m.calTag).filter(Boolean))
    return {
      id: 'grp_' + groupId,
      isGroup: true,
      groupId,
      groupName: members[0].groupName,
      calTag: tags.size === 1 ? [...tags][0] : '',
      checkIn: members.reduce((min, m) => (m.checkIn < min ? m.checkIn : min), members[0].checkIn),
      members,
    }
  })
  return [...groupEntries, ...singles].sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))
}
// 產生月曆格子：前後補空白湊滿整週（星期日開頭），每格帶當天日期字串與當天訂單清單
const calendarCells = computed(() => {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const leadingBlanks = new Date(y, m - 1, 1).getDay()
  const cells = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, date, bookings: bookingsOnCalendarDate(date) })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})

/* ---------------- 甘特圖 ---------------- */

// 本月每一天：day 數字、星期幾（0=日...6=六）、是否為今天，用來畫甘特圖橫軸表頭
const ganttDays = computed(() => {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const list = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    list.push({ day: d, date, dow: new Date(y, m - 1, d).getDay(), isToday: date === today })
  }
  return list
})
// 某個房間在本月要畫的橫條：把訂單的入住～退房區間裁切到本月範圍內，換算成甘特圖的欄位起訖
function ganttBarsForRoom(roomId) {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd = new Date(y, m - 1, daysInMonth)
  return bookings.value
    .filter(b => b.roomId === roomId && b.status !== 'cancelled' && b.status !== 'completed')
    .filter(b => new Date(b.checkIn) <= monthEnd && new Date(b.checkOut) > monthStart)
    .map(b => {
      let occStart = new Date(b.checkIn)
      let occEnd = new Date(b.checkOut)
      occEnd.setDate(occEnd.getDate() - 1) // 退房日當天不算住宿夜，橫條畫到退房前一天
      if (occStart < monthStart) occStart = monthStart
      if (occEnd > monthEnd) occEnd = monthEnd
      const startDay = occStart.getDate()
      const endDay = Math.max(startDay, occEnd.getDate())
      return {
        booking: b,
        colStart: startDay,
        colEnd: endDay + 1,
        label: b.groupName || b.name,
        title: `${b.groupName || b.name}｜${b.checkIn} → ${b.checkOut}｜${statusLabel(b.status)}`,
        cls: b.groupId ? 'bg-violet-600' : calendarPillClass(b.status),
      }
    })
}

const dayTarget = ref(null)
async function quickSetDay(bookingId, status) {
  if (!dayTarget.value) return
  await setStatus(bookingId, status) // setStatus 內部已經會重新 fetchAll()
  if (dayTarget.value) {
    dayTarget.value = { ...dayTarget.value, bookings: bookingsOnCalendarDate(dayTarget.value.date) }
  }
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
const assignMode = ref('single') // 'single' 指定單一房間 ・ 'group' 拆成好幾間房分配給團體
const splitGroupName = ref('')
const splitRows = ref([{ roomId: '', guests: 1, name: '', notes: '' }])
const splitError = ref('')
const splitSaving = ref(false)

function openAssign(booking) {
  assignTarget.value = booking
  assignBuildingFilter.value = booking.buildingPref && booking.buildingPref !== 'all' ? booking.buildingPref : 'all'
  assignError.value = ''
  assignMode.value = 'single'
  splitGroupName.value = booking.name
  splitRows.value = [{ roomId: '', guests: booking.guests, name: '', notes: '' }]
  splitError.value = ''
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

// 「分配到多間房（團體）」：人數太多、單一房間住不下時，把這筆訂單拆成好幾間房。
// 同一份表單裡已經被別列選走的房間要排除，避免自己選重複。
function addSplitRow() { splitRows.value.push({ roomId: '', guests: 1, name: '', notes: '' }) }
function removeSplitRow(idx) {
  if (splitRows.value.length <= 1) return
  splitRows.value.splice(idx, 1)
}
function eligibleRoomsForSplitRow(idx) {
  if (!assignTarget.value) return []
  const b = assignTarget.value
  const pickedElsewhere = splitRows.value.filter((r, i) => i !== idx && r.roomId).map(r => r.roomId)
  return rooms.value
    .filter(r => r.active)
    .filter(r => !pickedElsewhere.includes(r.id))
    .filter(r => isRoomAvailable(r.id, b.checkIn, b.checkOut, b.id))
    .sort((r1, r2) => r1.capacity - r2.capacity || r1.price - r2.price)
}
const splitTotalGuests = computed(() => splitRows.value.reduce((s, r) => s + (Number(r.guests) || 0), 0))

async function submitSplit() {
  splitError.value = ''
  if (!assignTarget.value) return
  if (!splitGroupName.value.trim()) { splitError.value = '請填寫團體名稱'; return }
  const rows = splitRows.value.filter(r => r.roomId)
  if (rows.length === 0) { splitError.value = '請至少分配一間房'; return }
  const roomIds = rows.map(r => r.roomId)
  if (new Set(roomIds).size !== roomIds.length) { splitError.value = '同一份表單裡不能選到同一間房兩次'; return }

  splitSaving.value = true
  try {
    const res = await (await fetch(`${BOOKINGS_BASE()}/split-to-group`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: assignTarget.value.id,
        groupName: splitGroupName.value.trim(),
        rooms: rows.map(r => ({ roomId: r.roomId, guests: r.guests || 1, name: r.name.trim(), notes: r.notes.trim() })),
      }),
    })).json()
    if (res && res.error) { splitError.value = res.error; return }
    const finishedGroupName = splitGroupName.value.trim()
    assignTarget.value = null
    await fetchAll()
    if (res && res.groupId) openGroupTarget(res.groupId, finishedGroupName)
  } catch (e) { console.error(e); splitError.value = '分配失敗，請稍後再試' }
  finally { splitSaving.value = false }
}

/* ---------------- 新增訂單 ---------------- */

const createOrderTarget = ref(false)
const newOrderError = ref('')
const newOrder = ref({ name: '', phone: '', checkIn: today, checkOut: '', guests: 1, buildingPref: 'all', roomId: '', notes: '' })

function openCreateOrder() {
  newOrder.value = { name: '', phone: '', checkIn: today, checkOut: '', guests: 1, buildingPref: 'all', roomId: '', notes: '' }
  newOrderError.value = ''
  createOrderTarget.value = true
}

/* ---------------- 編輯訂單：修改既有訂單的房客資料/日期/人數/備註，也可以直接在這裡換房間
   （取代原本獨立的「更換房間」按鈕），換房間本身仍是呼叫既有的 /assign，只是入口收斂到
   編輯 Modal，避免兩個地方都能改房間、使用者要記兩套操作） ---------------- */

const editOrderTarget = ref(null) // 目前正在編輯的訂單 id，null 代表沒開啟
const editOrderError = ref('')
const editOrderOriginalRoomId = ref('')
const editOrder = ref({ name: '', phone: '', checkIn: '', checkOut: '', guests: 1, buildingPref: 'all', notes: '', roomId: '' })

function openEditOrder(b) {
  editOrderTarget.value = b.id
  editOrderOriginalRoomId.value = b.roomId || ''
  editOrder.value = {
    name: b.name || '',
    phone: b.phone || '',
    checkIn: b.checkIn || '',
    checkOut: b.checkOut || '',
    guests: b.guests || 1,
    buildingPref: b.buildingPref || 'all',
    notes: b.notes || '',
    roomId: b.roomId || '',
  }
  editOrderError.value = ''
}

// 換房間下拉的候選名單：跟新增訂單那份邏輯一樣（上架／夠住／該日期沒被其他訂單占用），
// 但要排除自己這筆訂單（isRoomAvailable 的 excludeId），也保留「目前已指派的房間」，
// 即使因為棟別/人數篩選條件改變而不符合，也還是顯示在選單裡，避免使用者看不到目前選的房間
const eligibleRoomsForEdit = computed(() => {
  const o = editOrder.value
  if (!o.checkIn || !o.checkOut || !o.guests || nights(o.checkIn, o.checkOut) <= 0) return []
  return rooms.value
    .filter(r => (r.active && r.capacity >= o.guests && (o.buildingPref === 'all' || r.buildingId === o.buildingPref)) || r.id === o.roomId)
    .filter(r => isRoomAvailable(r.id, o.checkIn, o.checkOut, editOrderTarget.value))
    .sort((r1, r2) => r1.capacity - r2.capacity || r1.price - r2.price)
})

async function submitEditOrder() {
  editOrderError.value = ''
  const o = editOrder.value
  if (!o.name.trim() || !o.checkIn || !o.checkOut || !o.guests) {
    editOrderError.value = '請填寫房客姓名、入住/退房日期與人數'
    return
  }
  if (nights(o.checkIn, o.checkOut) <= 0) {
    editOrderError.value = '退房日期需晚於入住日期'
    return
  }
  const id = editOrderTarget.value
  try {
    const res = await (await fetch(`${BOOKINGS_BASE()}/update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name: o.name.trim(),
        phone: o.phone.trim(),
        guests: o.guests,
        checkIn: o.checkIn,
        checkOut: o.checkOut,
        buildingPref: o.buildingPref,
        notes: o.notes.trim(),
      }),
    })).json()
    if (res && res.error) { editOrderError.value = res.error; return }

    // 房間有變更（含從沒房到有房、或換成別間）才呼叫既有的 /assign，跟新增訂單同一套 API
    if (o.roomId && o.roomId !== editOrderOriginalRoomId.value) {
      const assignRes = await (await fetch(`${BOOKINGS_BASE()}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, roomId: o.roomId }),
      })).json()
      if (assignRes && assignRes.error) { editOrderError.value = `其他資料已更新，但房間變更失敗：${assignRes.error}`; await fetchAll(); return }
    }

    editOrderTarget.value = null
    await fetchAll()
  } catch (e) { console.error(e); editOrderError.value = '儲存失敗，請稍後再試' }
}

const eligibleRoomsForCreate = computed(() => {
  const o = newOrder.value
  if (!o.checkIn || !o.checkOut || !o.guests || nights(o.checkIn, o.checkOut) <= 0) return []
  return rooms.value
    .filter(r => r.active)
    .filter(r => r.capacity >= o.guests)
    .filter(r => o.buildingPref === 'all' || r.buildingId === o.buildingPref)
    .filter(r => isRoomAvailable(r.id, o.checkIn, o.checkOut))
    .sort((r1, r2) => r1.capacity - r2.capacity || r1.price - r2.price)
})

async function createOrder() {
  newOrderError.value = ''
  const o = newOrder.value
  if (!o.name.trim() || !o.checkIn || !o.checkOut || !o.guests) {
    newOrderError.value = '請填寫房客姓名、入住/退房日期與人數'
    return
  }
  if (nights(o.checkIn, o.checkOut) <= 0) {
    newOrderError.value = '退房日期需晚於入住日期'
    return
  }
  try {
    const res = await (await fetch(`${BOOKINGS_BASE()}/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkIn: o.checkIn,
        checkOut: o.checkOut,
        guests: o.guests,
        name: o.name.trim(),
        phone: o.phone.trim(),
        email: '',
        buildingPref: o.buildingPref,
        notes: o.notes.trim(),
      }),
    })).json()
    if (res && res.error) { newOrderError.value = res.error; return }

    // /request 一律建立為待指派訂單；若當下有選房間，緊接著呼叫既有的指派 API
    if (o.roomId && res && res.id) {
      const assignRes = await (await fetch(`${BOOKINGS_BASE()}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: res.id, roomId: o.roomId }),
      })).json()
      if (assignRes && assignRes.error) { newOrderError.value = `訂單已建立（${res.id}），但指派房間失敗：${assignRes.error}`; await fetchAll(); return }

      // 後台手動建立、且當下就指派了房間的訂單，視同已經確認過，直接跳過「待確認」
      await (await fetch(`${BOOKINGS_BASE()}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: res.id, status: 'confirmed' }),
      })).json()
    }

    createOrderTarget.value = false
    await fetchAll()
  } catch (e) { console.error(e); newOrderError.value = '新增失敗，請稍後再試' }
}

/* ---------------- 登記團體 ----------------
   設計上團體不是新的資料結構：每一間房還是走跟個人訂房完全一樣的 /request + /assign，
   只是每一筆都多蓋上同一個 groupId/groupName，所以既有的日期重疊檢查、狀態轉換、
   平面圖/日曆顯示邏輯完全不用改，只是多顯示一個團體標籤而已。 */

const createGroupTarget = ref(false)
const newGroupError = ref('')
const groupSaving = ref(false)
function blankGroupRow() { return { roomId: '', buildingPref: 'all', name: '', guests: 1, notes: '' } }
const newGroup = ref({ groupName: '', phone: '', checkIn: today, checkOut: '', rooms: [blankGroupRow()] })
const wholeBuildingPick = ref('')
const wholeBuildingNote = ref('')

function openCreateGroup() {
  newGroup.value = { groupName: '', phone: '', checkIn: today, checkOut: '', rooms: [blankGroupRow()] }
  newGroupError.value = ''
  wholeBuildingPick.value = ''
  wholeBuildingNote.value = ''
  createGroupTarget.value = true
}
// 包棟：把選定棟別裡目前空著的房間一次全部加進團體房間清單，每一列後續還是可以個別改人數/刪除，
// 跟手動一列一列加房間是同一份資料、同一套邏輯，只是省了逐間挑選的功夫
function applyWholeBuilding() {
  newGroupError.value = ''
  wholeBuildingNote.value = ''
  const g = newGroup.value
  if (!wholeBuildingPick.value) { newGroupError.value = '請先選擇要包棟的棟別'; return }
  if (!g.checkIn || !g.checkOut || nights(g.checkIn, g.checkOut) <= 0) { newGroupError.value = '請先確認入住/退房日期'; return }
  const already = new Set(g.rooms.filter(r => r.roomId).map(r => r.roomId))
  const buildingRooms = rooms.value.filter(r => r.active && r.buildingId === wholeBuildingPick.value)
  const toAdd = buildingRooms.filter(r => !already.has(r.id) && isRoomAvailable(r.id, g.checkIn, g.checkOut))
  const alreadyInBuilding = buildingRooms.filter(r => already.has(r.id)).length
  const skipped = buildingRooms.length - toAdd.length - alreadyInBuilding
  if (toAdd.length === 0) {
    newGroupError.value = alreadyInBuilding > 0 && skipped === 0
      ? '這個棟別的房間已經都在清單裡了'
      : '這個棟別目前沒有空房可以加入（可能都已被佔用）'
    return
  }
  // 表單裡如果都還是空白列（尚未選房間），先清掉，避免整棟加進來後多出一列空白
  if (g.rooms.every(r => !r.roomId)) g.rooms = []
  for (const r of toAdd) g.rooms.push({ roomId: r.id, buildingPref: wholeBuildingPick.value, name: '', guests: r.capacity, notes: '' })
  wholeBuildingNote.value = skipped > 0
    ? `已加入 ${toAdd.length} 間房；另有 ${skipped} 間房該日期已被占用，沒有一起加入`
    : `已加入整棟 ${toAdd.length} 間房`
  wholeBuildingPick.value = ''
}
function addGroupRoomRow() { newGroup.value.rooms.push(blankGroupRow()) }
function removeGroupRoomRow(idx) {
  if (newGroup.value.rooms.length <= 1) return
  newGroup.value.rooms.splice(idx, 1)
}
// 同一份團體表單裡，已經被別列選走的房間要從下拉選單裡排除，避免同一份表單自己選重複；
// 每一列也有自己的「偏好棟別」，選了就只列出該棟的房間
function eligibleRoomsForGroupRow(idx) {
  const g = newGroup.value
  const row = g.rooms[idx]
  if (!g.checkIn || !g.checkOut || nights(g.checkIn, g.checkOut) <= 0) return []
  const pickedElsewhere = g.rooms.filter((r, i) => i !== idx && r.roomId).map(r => r.roomId)
  return rooms.value
    .filter(r => r.active)
    .filter(r => !pickedElsewhere.includes(r.id))
    .filter(r => row.buildingPref === 'all' || r.buildingId === row.buildingPref)
    .filter(r => isRoomAvailable(r.id, g.checkIn, g.checkOut))
    .sort((r1, r2) => r1.capacity - r2.capacity || r1.price - r2.price)
}
// 換了偏好棟別、但原本選的房間不屬於新棟別時，把房間選擇清掉，避免表單顯示跟實際不一致
function onGroupRowBuildingChange(idx) {
  const row = newGroup.value.rooms[idx]
  if (!row || !row.roomId) return
  const r = roomById(row.roomId)
  if (r && row.buildingPref !== 'all' && r.buildingId !== row.buildingPref) row.roomId = ''
}

async function createGroup() {
  newGroupError.value = ''
  const g = newGroup.value
  if (!g.groupName.trim()) { newGroupError.value = '請填寫團體名稱'; return }
  if (!g.checkIn || !g.checkOut || nights(g.checkIn, g.checkOut) <= 0) { newGroupError.value = '請確認入住/退房日期'; return }
  const rows = g.rooms.filter(r => r.roomId)
  if (rows.length === 0) { newGroupError.value = '請至少選一間房間'; return }
  const roomIds = rows.map(r => r.roomId)
  if (new Set(roomIds).size !== roomIds.length) { newGroupError.value = '同一份團體登記裡不能選到同一間房兩次'; return }

  groupSaving.value = true
  const groupId = 'grp_' + Date.now()
  const failed = []
  try {
    for (const row of rows) {
      try {
        const res = await (await fetch(`${BOOKINGS_BASE()}/request`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkIn: g.checkIn,
            checkOut: g.checkOut,
            guests: row.guests || 1,
            name: (row.name.trim() || g.groupName.trim()),
            phone: g.phone.trim(),
            email: '',
            buildingPref: 'all',
            notes: row.notes.trim(),
            groupId,
            groupName: g.groupName.trim(),
          }),
        })).json()
        if (res && res.error) { failed.push(`${row.roomId}：${res.error}`); continue }

        const assignRes = await (await fetch(`${BOOKINGS_BASE()}/assign`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: res.id, roomId: row.roomId }),
        })).json()
        if (assignRes && assignRes.error) failed.push(`${row.roomId}：${assignRes.error}`)
      } catch (e) {
        console.error(e)
        failed.push(`${row.roomId}：建立失敗`)
      }
    }
    // 後台手動登記的團體，已成功建立的房間直接整團設為已確認，不停在待確認
    if (rows.length > failed.length) {
      await (await fetch(`${BOOKINGS_BASE()}/group/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, status: 'confirmed' }),
      })).json()
    }
    await fetchAll()
    if (failed.length) {
      // 部分房間可能剛好被搶先訂走；已成功的那幾間房不受影響，留在畫面上讓使用者看清楚哪幾間要重選
      newGroupError.value = `部分房間登記失敗，請重新選擇：${failed.join('；')}`
    } else {
      createGroupTarget.value = false
    }
  } finally {
    groupSaving.value = false
  }
}

/* ---------------- 平面圖選房間：新增訂單／登記團體／編輯訂單共用的浮動選房器 ----------------
   target 用字串區分要把選到的房間填回哪裡：'order' 填新增訂單那顆 select，'edit' 填編輯
   訂單那顆 select，'group:<idx>' 填登記團體第 idx 列的 select，跟原本的下拉選單共用同一個
   v-model，所以在平面圖上點跟在下拉選單選是同一件事，畫面會同步。
   excludeBookingId：編輯既有訂單時，該訂單目前占用的房間不該被自己擋住，所以要排除自己。 */

const roomPicker = ref(null) // { target, checkIn, checkOut, guests, excludeIds, excludeBookingId }
function openRoomPicker(target, checkIn, checkOut, guests, excludeIds, excludeBookingId) {
  if (!checkIn || !checkOut || nights(checkIn, checkOut) <= 0) {
    const msg = '請先填入住日期與退房日期，才能用平面圖選房間'
    if (target === 'order') newOrderError.value = msg
    else if (target === 'edit') editOrderError.value = msg
    else newGroupError.value = msg
    return
  }
  roomPicker.value = { target, checkIn, checkOut, guests: guests || 1, excludeIds: excludeIds || [], excludeBookingId: excludeBookingId || null }
}
// 平面圖上要標成「不可選」（灰色）的房間 id：不夠大、該日期已被佔用、已下架、
// 或已經被同一份表單裡其他列選走
const roomPickerUnavailableIds = computed(() => {
  if (!roomPicker.value) return []
  const rp = roomPicker.value
  return rooms.value
    .filter(r => !(
      r.active &&
      r.capacity >= rp.guests &&
      !rp.excludeIds.includes(r.id) &&
      isRoomAvailable(r.id, rp.checkIn, rp.checkOut, rp.excludeBookingId)
    ))
    .map(r => r.id)
})
function pickRoomFromFloorplan(room) {
  if (!roomPicker.value) return
  if (roomPickerUnavailableIds.value.includes(room.id)) return // 防呆：不可選的房間點了也不處理
  const target = roomPicker.value.target
  if (target === 'order') {
    newOrder.value.roomId = room.id
    newOrder.value.guests = room.capacity // 預設人數＝該房可住上限，多數訂房都是住滿，省得再手動改
  } else if (target === 'edit') {
    editOrder.value.roomId = room.id
    editOrder.value.guests = room.capacity
  } else if (target.startsWith('group:')) {
    const idx = Number(target.split(':')[1])
    if (newGroup.value.rooms[idx]) {
      newGroup.value.rooms[idx].roomId = room.id
      newGroup.value.rooms[idx].guests = room.capacity
    }
  }
  roomPicker.value = null
}

/* ---------------- 團體管理：查看/整團操作同一個 groupId 底下所有訂單 ---------------- */

const groupTarget = ref(null) // { groupId, groupName }
function openGroupTarget(groupId, groupName) {
  groupTarget.value = { groupId, groupName }
  groupEditing.value = false
}
const groupBookings = computed(() => {
  if (!groupTarget.value) return []
  return bookings.value
    .filter(b => b.groupId === groupTarget.value.groupId)
    .sort((a, b) => (a.roomId < b.roomId ? -1 : 1))
})
async function setGroupStatusAll(status) {
  if (!groupTarget.value) return
  try {
    const res = await (await fetch(`${BOOKINGS_BASE()}/group/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: groupTarget.value.groupId, status }),
    })).json()
    if (res && res.error) { alert(res.error); return }
    await fetchAll()
  } catch (e) { console.error(e); alert('操作失敗，請稍後再試') }
}

/* 團體資訊編輯：團體名稱／統一聯絡電話是存在每一筆訂單自己的欄位裡，改的時候要整團一次改，
   所以走 /group/update，不是走單筆訂單的 /update */
const groupEditing = ref(false)
const groupEditError = ref('')
const groupEditForm = ref({ groupName: '', phone: '' })
function startGroupEdit() {
  groupEditError.value = ''
  groupEditForm.value = {
    groupName: groupTarget.value.groupName || '',
    phone: (groupBookings.value[0] && groupBookings.value[0].phone) || '',
  }
  groupEditing.value = true
}
async function submitGroupEdit() {
  groupEditError.value = ''
  const f = groupEditForm.value
  if (!f.groupName.trim()) { groupEditError.value = '請填寫團體名稱'; return }
  try {
    const res = await (await fetch(`${BOOKINGS_BASE()}/group/update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: groupTarget.value.groupId, groupName: f.groupName.trim(), phone: f.phone.trim() }),
    })).json()
    if (res && res.error) { groupEditError.value = res.error; return }
    groupTarget.value = { groupId: groupTarget.value.groupId, groupName: f.groupName.trim() }
    groupEditing.value = false
    await fetchAll()
  } catch (e) { console.error(e); groupEditError.value = '儲存失敗，請稍後再試' }
}

/* ---------------- 訂房紀錄 ---------------- */

const historyStatus  = ref('all')
const historyKeyword = ref('')
const historyBookings = computed(() => bookings.value.filter(b => b.status === 'completed' || b.status === 'cancelled'))
const filteredHistory = computed(() => {
  const kw = historyKeyword.value.trim().toLowerCase()
  return historyBookings.value
    .filter(b => historyStatus.value === 'all' || b.status === historyStatus.value)
    .filter(b => !kw || b.name.toLowerCase().includes(kw) || b.id.toLowerCase().includes(kw) || (b.roomId && b.roomId.toLowerCase().includes(kw)))
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
.segmented button { border: none; background: transparent; color: var(--text-muted); padding: 6px 14px; border-radius: 6px; font-size: 13.5px; font-weight: 700; white-space: nowrap; }
.segmented button:hover { background: var(--border-light); color: var(--text); }
.seg-active, .seg-active:hover { background: #15803d; color: #fff; }
.w-fit { width: fit-content; }

.pill-btn { flex-shrink: 0; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface2); color: var(--text-muted); font-size: 13.5px; font-weight: 700; white-space: nowrap; }
.pill-btn:hover { border-color: var(--accent); color: var(--text); }
.pill-active, .pill-active:hover { background: #15803d; border-color: #15803d; color: #fff; }

/* 訂單管理列表：團體表頭列＋成員列的視覺區隔，讓展開後的團體訂單一眼看出跟其他一般訂單不是同一掛 */
.group-header-row { background: rgba(139, 92, 246, .16); }
.group-header-row button:hover { opacity: .85; }
.group-member-row { background: rgba(139, 92, 246, .06); }
.group-member-row td:first-child { border-left: 3px solid #a78bfa; padding-left: 9px; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.stat-card { background: var(--surface); border-radius: 12px; padding: 14px; border-left: 4px solid #15803d; box-shadow: var(--shadow); }
.stat-label { font-size: 12.5px; color: var(--text-hint); font-weight: 600; }
.stat-value { font-size: 23px; font-weight: 700; color: var(--text); margin-top: 2px; }

.type-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.type-summary-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
.type-summary-title { font-weight: 700; color: var(--text); font-size: 13.5px; margin-bottom: 6px; }
.type-summary-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; padding: 1.5px 0; }

.panel { background: var(--surface); border-radius: 16px; padding: 16px; box-shadow: var(--shadow); overflow-x: auto; }

.select-input { padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13.5px; background: var(--surface2); color: var(--text); }

.building-badge { width: 24px; height: 24px; border-radius: 6px; background: rgba(21, 128, 61, .12); color: #15803d; display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 700; flex-shrink: 0; }

.dot { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-right: 5px; vertical-align: middle; }

.status-badge { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }

.mini-btn { padding: 5px 10px; border-radius: 6px; background: var(--surface2); color: var(--text-muted); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
.mini-btn:hover { background: var(--bg); }
.mini-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.mini-btn:disabled:hover { background: var(--surface2); }
.mini-primary { background: #15803d; color: #fff; }
.mini-primary:hover { background: #15803d; filter: brightness(1.08); }
.mini-danger { background: transparent; border: 1px solid #e11d48; color: #e11d48; }

.btn-plain { padding: 7px 14px; border-radius: 8px; background: var(--surface2); color: var(--text-muted); font-size: 14px; font-weight: 600; }
.btn-plain:hover { background: var(--bg); }

.collapse-btn { width: 22px; height: 22px; border-radius: 6px; background: var(--surface2); color: var(--text-muted); font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.collapse-btn:hover { background: var(--bg); color: var(--text); }

.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
.cal-head { margin-bottom: 5px; }
.cal-head-cell { text-align: center; padding: 6px 0; font-weight: 700; font-size: 12px; color: var(--text-hint); }
.cal-cell { min-height: 92px; border: 1px solid var(--border); border-radius: 8px; padding: 6px; background: var(--surface2); display: flex; flex-direction: column; gap: 3px; overflow: hidden; cursor: pointer; }
.cal-cell-empty { background: transparent; border-color: transparent; cursor: default; }
.cal-cell-today { border-color: #15803d; box-shadow: 0 0 0 1px #15803d inset; }
.cal-cell-selected { border-color: #2563eb; box-shadow: 0 0 0 2px #2563eb inset; }
.cal-day-num { font-weight: 700; font-size: 12px; color: var(--text); margin-bottom: 1px; }
.cal-day-today { color: #15803d; }
.cal-pill { text-align: left; padding: 2px 6px; border-radius: 5px; color: #fff; font-size: 10.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cal-pill:hover { filter: brightness(1.12); }
.cal-more { text-align: left; font-size: 10.5px; color: var(--text-hint); font-weight: 600; padding: 1px 4px; }
.cal-more:hover { color: var(--text); }

/* 「查看日期」迷你月曆彈出選單（房况總覽／平面圖共用） */
.date-picker-pop { position: absolute; top: calc(100% + 6px); left: 0; z-index: 31; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow); padding: 10px; width: 240px; }
.date-picker-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.date-picker-head { margin-bottom: 2px; }
.date-picker-head div { text-align: center; font-size: 11px; font-weight: 700; color: var(--text-hint); padding: 2px 0; }
.date-picker-cell { position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 12px; color: var(--text); background: transparent; }
.date-picker-cell:hover:not(:disabled) { background: var(--surface2); }
.date-picker-cell-empty { visibility: hidden; cursor: default; }
.date-picker-cell-today { font-weight: 700; color: #15803d; }
.date-picker-cell-selected { background: #15803d; color: #fff; }
.date-picker-cell-selected:hover { background: #15803d; }
.date-picker-dot { position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 999px; background: #d97706; }
.date-picker-cell-selected .date-picker-dot { background: #fff; }

/* 甘特圖 */
.gantt-grid { display: grid; font-size: 12px; min-width: 100%; width: max-content; }
.gantt-corner { position: sticky; top: 0; left: 0; z-index: 3; background: var(--surface); border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); display: flex; align-items: center; padding: 6px 10px; font-weight: 700; font-size: 12px; color: var(--text-hint); }
.gantt-day-head { position: sticky; top: 0; z-index: 2; background: var(--surface); border-bottom: 1px solid var(--border); border-left: 1px solid var(--border-light); text-align: center; padding: 4px 2px; }
.gantt-day-num { font-weight: 700; font-size: 12px; color: var(--text); line-height: 1.3; }
.gantt-day-dow { font-size: 10px; color: var(--text-hint); }
.gantt-weekend { background: var(--surface2); }
.gantt-today .gantt-day-num { color: #15803d; }
.gantt-today { box-shadow: inset 0 -3px 0 #15803d; }
.gantt-building-row { position: sticky; left: 0; background: var(--surface2); font-weight: 700; font-size: 12.5px; color: var(--text); padding: 6px 10px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.gantt-room-label { position: sticky; left: 0; z-index: 1; background: var(--surface); border-right: 1px solid var(--border); border-bottom: 1px solid var(--border-light); padding: 7px 10px; font-size: 12.5px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 5px; white-space: nowrap; }
.gantt-room-track { position: relative; display: grid; grid-template-rows: 1fr; border-bottom: 1px solid var(--border-light); min-height: 36px; }
.gantt-bar { grid-row: 1; margin: 5px 1px; border-radius: 5px; color: #fff; font-size: 11px; font-weight: 600; padding: 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; display: flex; align-items: center; }
.gantt-bar:hover { filter: brightness(1.12); }

</style>
