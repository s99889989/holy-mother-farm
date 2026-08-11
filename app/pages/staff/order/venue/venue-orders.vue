<template>
  <div class="min-h-full bg-surface2 transition-colors">
    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="mx-auto flex items-center gap-2" :class="wideTab ? 'w-full' : 'max-w-5xl'">
        <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:15px">🏛️</div>
        <div class="flex-1">
          <h1 class="font-bold text-base-c leading-none" style="font-size:16px">場地租借管理</h1>
        </div>
        <NuxtLink to="/front/order/venue-rental" target="_blank" class="mini-btn" style="padding:7px 12px;font-size:13.5px">🔗 開啟場地租借頁面</NuxtLink>
      </div>
      <div class="mx-auto mt-1" :class="wideTab ? 'w-full' : 'max-w-5xl'">
        <div class="segmented w-fit">
          <button :class="tab === 'dashboard' ? 'seg-active' : ''" @click="tab = 'dashboard'">儀表板</button>
          <button :class="tab === 'orders' ? 'seg-active' : ''" @click="tab = 'orders'">訂單管理</button>
          <button :class="tab === 'calendar' ? 'seg-active' : ''" @click="tab = 'calendar'">日曆</button>
          <button :class="tab === 'gantt' ? 'seg-active' : ''" @click="tab = 'gantt'">甘特圖</button>
          <button :class="tab === 'overview' ? 'seg-active' : ''" @click="tab = 'overview'">場地總覽</button>
          <button :class="tab === 'venues' ? 'seg-active' : ''" @click="tab = 'venues'">場地管理</button>
          <button :class="tab === 'history' ? 'seg-active' : ''" @click="tab = 'history'">訂房紀錄</button>
        </div>
      </div>
    </header>

    <div class="mx-auto px-3 sm:px-4 py-4" :class="wideTab ? 'w-full' : 'max-w-5xl'">
      <div v-if="loading" class="text-center py-8 text-hint-c" style="font-size:14px">載入中...</div>

      <template v-else>
        <!-- ===================== 儀表板 ===================== -->
        <div v-if="tab === 'dashboard'">
          <div class="stat-grid mb-5">
            <div class="stat-card"><div class="stat-label">場地總數</div><div class="stat-value">{{ venues.length }}</div></div>
            <div class="stat-card"><div class="stat-label">上架場地</div><div class="stat-value">{{ activeVenues.length }}</div></div>
            <div class="stat-card"><div class="stat-label">今日訂單</div><div class="stat-value">{{ todaysBookings.length }}</div></div>
            <div class="stat-card"><div class="stat-label">待指派</div><div class="stat-value" style="color:#0284c7">{{ countByStatus('unassigned') }}</div></div>
            <div class="stat-card"><div class="stat-label">待確認</div><div class="stat-value" style="color:#d97706">{{ countByStatus('pending') }}</div></div>
            <div class="stat-card"><div class="stat-label">已確認</div><div class="stat-value" style="color:#15803d">{{ countByStatus('confirmed') }}</div></div>
          </div>

          <div class="panel">
            <div class="font-bold text-base-c mb-3" style="font-size:14.5px">近期訂單</div>
            <div v-if="!upcomingBookings.length" class="text-hint-c text-center py-6" style="font-size:13px">目前沒有近期訂單</div>
            <table v-else class="w-full" style="font-size:13px">
              <tbody>
              <tr v-for="b in upcomingBookings" :key="b.id" class="border-t border-light-c">
                <td class="py-2">{{ formatRange(b) }}</td>
                <td>{{ b.name }}<span v-if="b.groupId" class="group-badge">{{ b.groupName || '團體' }}</span></td>
                <td>{{ venueLabel(b.venueId) }}</td>
                <td class="text-right"><span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span></td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ===================== 訂單管理 ===================== -->
        <div v-if="tab === 'orders'">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <button class="pill-btn" :class="ordersStatus === 'all' ? 'pill-active' : ''" @click="ordersStatus = 'all'">全部</button>
            <button class="pill-btn" :class="ordersStatus === 'unassigned' ? 'pill-active' : ''" @click="ordersStatus = 'unassigned'">待指派</button>
            <button class="pill-btn" :class="ordersStatus === 'pending' ? 'pill-active' : ''" @click="ordersStatus = 'pending'">待確認</button>
            <button class="pill-btn" :class="ordersStatus === 'confirmed' ? 'pill-active' : ''" @click="ordersStatus = 'confirmed'">已確認</button>
            <input v-model="ordersKeyword" placeholder="搜尋姓名/電話/場地/團體" class="select-input flex-1" style="min-width:160px">
            <input v-model="ordersDateFrom" type="date" class="select-input">
            <span class="text-hint-c" style="font-size:12px">至</span>
            <input v-model="ordersDateTo" type="date" class="select-input">
            <button class="mini-btn mini-primary" @click="openNewOrder()">＋ 新增訂單</button>
            <button class="mini-btn" @click="openNewGroup()">＋ 登記團體</button>
          </div>

          <div class="panel">
            <table class="w-full" style="font-size:13px">
              <thead>
              <tr class="text-left text-hint-c" style="font-size:12px">
                <th class="pb-2">日期/時段</th>
                <th class="pb-2">租借人</th>
                <th class="pb-2">場地</th>
                <th class="pb-2">人數</th>
                <th class="pb-2">狀態</th>
                <th class="pb-2 text-right">操作</th>
              </tr>
              </thead>
              <tbody>
              <template v-for="row in visibleOrderRows" :key="row.key">
                <tr v-if="row.isGroupHeader" class="group-header-row border-t border-light-c cursor-pointer" @click="toggleGroupOpen(row.groupId)">
                  <td class="py-2" colspan="3">
                    <span class="collapse-btn mr-1">{{ openGroups.has(row.groupId) ? '▾' : '▸' }}</span>
                    <span class="font-bold">{{ row.groupName || '團體' }}</span>
                    <span class="group-badge">{{ row.members.length }} 個場地</span>
                  </td>
                  <td>{{ row.totalGuests }}</td>
                  <td><span class="status-badge" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span></td>
                  <td class="text-right" @click.stop>
                    <button class="mini-btn" @click="openGroupManage(row.groupId)">整團操作</button>
                  </td>
                </tr>
                <tr v-else :class="row.isGroupMember ? 'group-member-row' : ''" class="border-t border-light-c">
                  <td class="py-2">{{ formatRange(row) }}</td>
                  <td>{{ row.name }}<span v-if="row.phone" class="text-hint-c" style="font-size:11.5px"> ・ {{ row.phone }}</span></td>
                  <td>{{ venueLabel(row.venueId) }}<span v-if="!row.venueId" class="text-hint-c">（未指派）</span></td>
                  <td>{{ row.guests }}</td>
                  <td><span class="status-badge" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span></td>
                  <td class="text-right">
                    <button v-if="!row.venueId" class="mini-btn mini-primary" @click="openAssign(row)">指派場地</button>
                    <button v-if="row.status === 'pending'" class="mini-btn" @click="setStatus(row.id, 'confirmed')">確認</button>
                    <button v-if="row.status === 'confirmed'" class="mini-btn" @click="setStatus(row.id, 'completed')">設為完成</button>
                    <button class="mini-btn" @click="openEditOrder(row)">編輯</button>
                    <button v-if="['unassigned', 'pending'].includes(row.status)" class="mini-btn mini-danger" @click="setStatus(row.id, 'cancelled')">取消</button>
                    <button v-if="['unassigned', 'pending', 'cancelled'].includes(row.status)" class="mini-btn mini-danger" @click="deleteOrder(row.id)">刪除</button>
                  </td>
                </tr>
              </template>
              <tr v-if="!orderRows.length"><td colspan="6" class="text-center py-6 text-hint-c">沒有符合條件的訂單</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ===================== 日曆 ===================== -->
        <div v-if="tab === 'calendar'" class="flex gap-4 flex-wrap">
          <div class="flex-1" style="min-width:340px">
            <div class="flex items-center gap-2 mb-3">
              <button class="mini-btn" @click="shiftCalMonth(-1)">◀</button>
              <div class="font-bold" style="font-size:14.5px">{{ calendarMonth.getFullYear() }} 年 {{ calendarMonth.getMonth() + 1 }} 月</div>
              <button class="mini-btn" @click="shiftCalMonth(1)">▶</button>
              <button class="mini-btn" @click="resetCalMonth()">回到本月</button>
            </div>
            <div class="cal-grid cal-head">
              <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="cal-head-cell">{{ d }}</div>
            </div>
            <div class="cal-grid">
              <div v-for="(cell, i) in calendarCells" :key="i"
                   class="cal-cell" :class="[cell ? '' : 'cal-cell-empty', cell && cell.isToday ? 'cal-cell-today' : '', cell && dayTarget === cell.dateStr ? 'cal-cell-selected' : '']"
                   @click="cell && selectCalDay(cell.dateStr)">
                <template v-if="cell">
                  <div class="cal-day-num" :class="cell.isToday ? 'cal-day-today' : ''">{{ cell.day }}</div>
                  <div v-for="b in cell.bookings.slice(0, 3)" :key="b.key" class="cal-pill" :style="{ background: b.isGroup ? '#7c3aed' : statusColor(b.status) }">
                    {{ b.isGroup ? `${b.groupName || '團體'}（${b.members.length}）` : `${b.displayTime} ${venueLabel(b.venueId)}` }}
                  </div>
                  <div v-if="cell.bookings.length > 3" class="cal-more">+{{ cell.bookings.length - 3 }} 更多</div>
                </template>
              </div>
            </div>
          </div>

          <div v-if="dayTarget" class="panel" style="width:320px;flex-shrink:0">
            <div class="flex items-center justify-between mb-3">
              <div class="font-bold" style="font-size:14.5px">{{ dayTarget }}</div>
              <button class="collapse-btn" @click="dayTarget = ''">✕</button>
            </div>
            <div v-if="!dayBookings.length" class="text-hint-c text-center py-4" style="font-size:13px">當天沒有訂單</div>
            <div v-for="b in dayBookings" :key="b.key" class="border border-light-c rounded-lg p-2.5 mb-2">
              <div class="flex items-center justify-between">
                <span class="font-bold" style="font-size:13px">{{ b.isGroup ? b.displayTime : formatRange(b) }}</span>
                <span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span>
              </div>
              <div class="text-hint-c mt-0.5" style="font-size:12px" v-if="b.isGroup">{{ b.groupName || '團體' }}（{{ b.members.length }} 個場地）</div>
              <div class="text-hint-c mt-0.5" style="font-size:12px" v-else>{{ venueLabel(b.venueId) }} ・ {{ b.name }}</div>
              <div class="flex gap-1.5 mt-2">
                <button v-if="b.isGroup" class="mini-btn" @click="openGroupManage(b.groupId)">查看整團</button>
                <template v-else>
                  <button v-if="!b.venueId" class="mini-btn mini-primary" @click="openAssign(b)">指派場地</button>
                  <button v-if="b.status === 'pending'" class="mini-btn" @click="setStatus(b.id, 'confirmed')">確認</button>
                  <button class="mini-btn" @click="openEditOrder(b)">編輯</button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- ===================== 甘特圖（單日，橫軸為時間） ===================== -->
        <div v-if="tab === 'gantt'">
          <div class="flex items-center gap-2 mb-3">
            <button class="mini-btn" @click="shiftGanttDay(-1)">◀ 前一天</button>
            <input v-model="ganttDate" type="date" class="select-input">
            <button class="mini-btn" @click="shiftGanttDay(1)">後一天 ▶</button>
            <button class="mini-btn" @click="ganttDate = todayStr">回到今天</button>
          </div>
          <div class="panel">
            <div class="gantt-grid" :style="{ gridTemplateColumns: `140px repeat(${ganttHours.length}, 44px)` }">
              <div class="gantt-corner">場地</div>
              <div v-for="h in ganttHours" :key="h" class="gantt-day-head">{{ h }}</div>

              <template v-for="v in activeVenues" :key="v.id">
                <div class="gantt-room-label">{{ v.name }}</div>
                <div class="gantt-room-track" :style="{ gridColumn: `2 / span ${ganttHours.length}` }">
                  <div v-for="b in ganttBarsForVenue(v.id)" :key="b.key"
                       class="gantt-bar" :style="b.style" :title="`${b.name} ${formatRange(b.raw)}`"
                       @click="b.groupId ? openGroupManage(b.groupId) : openEditOrder(b.raw)">
                    {{ b.name }}
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- ===================== 場地總覽 ===================== -->
        <div v-if="tab === 'overview'">
          <div class="flex items-center gap-2 mb-3">
            <button class="mini-btn" @click="shiftOverviewDate(-1)">◀</button>
            <input v-model="overviewDate" type="date" class="select-input">
            <button class="mini-btn" @click="shiftOverviewDate(1)">▶</button>
            <button class="mini-btn" @click="overviewDate = todayStr">回到今天</button>
          </div>
          <div class="type-summary-grid">
            <div v-for="v in activeVenues" :key="v.id" class="type-summary-card">
              <div class="type-summary-title">{{ v.name }}</div>
              <div class="type-summary-row"><span class="text-hint-c">容納人數</span><span>{{ v.capacity || '—' }} 人</span></div>
              <div class="type-summary-row"><span class="text-hint-c">當日訂單</span><span>{{ overviewBookingsFor(v.id).length }} 筆</span></div>
              <div v-if="overviewBookingsFor(v.id).length" class="mt-1.5 pt-1.5" style="border-top:1px solid var(--border-light)">
                <div v-for="b in overviewBookingsFor(v.id)" :key="b.id" class="type-summary-row">
                  <span>{{ formatRange(b) }}</span>
                  <span class="status-badge" :class="statusClass(b.status)" style="font-size:10.5px;padding:1px 6px">{{ statusLabel(b.status) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===================== 場地管理 ===================== -->
        <div v-if="tab === 'venues'">
          <div class="flex justify-end mb-3">
            <button class="mini-btn mini-primary" @click="openEditVenue(null)">＋ 新增場地</button>
          </div>
          <div class="panel">
            <table class="w-full" style="font-size:13px">
              <thead>
              <tr class="text-left text-hint-c" style="font-size:12px">
                <th class="pb-2">場地</th><th class="pb-2">容納人數</th><th class="pb-2">價格</th><th class="pb-2">狀態</th><th class="pb-2 text-right">操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="v in venuesSorted" :key="v.id" class="border-t border-light-c">
                <td class="py-2">{{ v.name }}<span v-if="v.location" class="text-hint-c" style="font-size:11.5px"> ・ {{ v.location }}</span></td>
                <td>{{ v.capacity || '—' }}</td>
                <td>NT$ {{ v.price ? v.price.toLocaleString() : '洽詢' }}</td>
                <td><span class="status-badge" :class="v.active ? statusClass('confirmed') : statusClass('cancelled')">{{ v.active ? '上架中' : '已下架' }}</span></td>
                <td class="text-right">
                  <button class="mini-btn" @click="openEditVenue(v)">編輯</button>
                  <button class="mini-btn mini-danger" @click="deleteVenue(v.id)">刪除</button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ===================== 訂房紀錄 ===================== -->
        <div v-if="tab === 'history'">
          <input v-model="historyKeyword" placeholder="搜尋姓名/電話/場地" class="select-input mb-3" style="width:100%">
          <div class="panel">
            <table class="w-full" style="font-size:13px">
              <thead>
              <tr class="text-left text-hint-c" style="font-size:12px">
                <th class="pb-2">建立時間</th><th class="pb-2">日期/時段</th><th class="pb-2">租借人</th><th class="pb-2">場地</th><th class="pb-2">狀態</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="b in historyRows" :key="b.id" class="border-t border-light-c">
                <td class="py-2">{{ b.createdAt }}</td>
                <td>{{ formatRange(b) }}</td>
                <td>{{ b.name }}</td>
                <td>{{ venueLabel(b.venueId) }}</td>
                <td><span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span></td>
              </tr>
              <tr v-if="!historyRows.length"><td colspan="5" class="text-center py-6 text-hint-c">沒有紀錄</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- ===================== Modal：新增訂單 ===================== -->
    <Teleport to="body">
      <div v-if="newOrderOpen" class="modal-mask" @click.self="newOrderOpen = false">
        <div class="modal-box">
          <div class="font-bold mb-3" style="font-size:15px">新增訂單</div>

          <div class="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">開始日期</label>
              <input v-model="newOrder.startDate" type="date" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">開始時間</label>
              <input v-model="newOrder.startTime" type="time" class="select-input" style="width:100%">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">結束日期</label>
              <input v-model="newOrder.endDate" type="date" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">結束時間</label>
              <input v-model="newOrder.endTime" type="time" class="select-input" style="width:100%">
            </div>
          </div>
          <div class="mb-2">
            <label class="block text-hint-c mb-1" style="font-size:12px">場地（選填，可先不指定）</label>
            <select v-model="newOrder.venueId" class="select-input" style="width:100%">
              <option value="">尚未指定</option>
              <option v-for="v in activeVenues" :key="v.id" :value="v.id" :disabled="!!pickerOccupied[v.id]">{{ v.name }}{{ pickerOccupied[v.id] ? '（已被佔用）' : '' }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <input v-model="newOrder.name" placeholder="租借人姓名" class="select-input">
            <input v-model="newOrder.phone" placeholder="聯絡電話" class="select-input">
          </div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <input v-model.number="newOrder.guests" type="number" min="1" placeholder="使用人數" class="select-input">
            <input v-model="newOrder.email" placeholder="Email（選填）" class="select-input">
          </div>
          <textarea v-model="newOrder.notes" rows="2" placeholder="備註（選填）" class="select-input mb-2" style="width:100%"></textarea>

          <p v-if="newOrderError" class="text-red-500 mb-2" style="font-size:12.5px">{{ newOrderError }}</p>
          <div class="flex justify-end gap-2 mt-3">
            <button class="mini-btn" @click="newOrderOpen = false">取消</button>
            <button class="mini-btn mini-primary" :disabled="newOrderSubmitting" @click="submitNewOrder">{{ newOrderSubmitting ? '送出中...' : '建立訂單' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===================== Modal：編輯訂單 ===================== -->
    <Teleport to="body">
      <div v-if="editOrderOpen" class="modal-mask" @click.self="editOrderOpen = false">
        <div class="modal-box">
          <div class="font-bold mb-3" style="font-size:15px">編輯訂單</div>

          <div class="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">開始日期</label>
              <input v-model="editOrder.startDate" type="date" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">開始時間</label>
              <input v-model="editOrder.startTime" type="time" class="select-input" style="width:100%">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">結束日期</label>
              <input v-model="editOrder.endDate" type="date" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">結束時間</label>
              <input v-model="editOrder.endTime" type="time" class="select-input" style="width:100%">
            </div>
          </div>
          <div class="mb-2">
            <label class="block text-hint-c mb-1" style="font-size:12px">場地</label>
            <select v-model="editOrder.venueId" class="select-input" style="width:100%">
              <option value="">尚未指定</option>
              <option v-for="v in eligibleVenuesForEdit" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <input v-model="editOrder.name" placeholder="租借人姓名" class="select-input">
            <input v-model="editOrder.phone" placeholder="聯絡電話" class="select-input">
          </div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <input v-model.number="editOrder.guests" type="number" min="1" placeholder="使用人數" class="select-input">
            <input v-model="editOrder.email" placeholder="Email（選填）" class="select-input">
          </div>
          <textarea v-model="editOrder.notes" rows="2" placeholder="備註（選填）" class="select-input mb-2" style="width:100%"></textarea>

          <p v-if="editOrderError" class="text-red-500 mb-2" style="font-size:12.5px">{{ editOrderError }}</p>
          <div class="flex justify-end gap-2 mt-3">
            <button class="mini-btn" @click="editOrderOpen = false">取消</button>
            <button class="mini-btn mini-primary" :disabled="editOrderSubmitting" @click="submitEditOrder">{{ editOrderSubmitting ? '儲存中...' : '儲存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===================== Modal：指派場地 ===================== -->
    <Teleport to="body">
      <div v-if="assignOpen" class="modal-mask" @click.self="assignOpen = false">
        <div class="modal-box">
          <div class="font-bold mb-3" style="font-size:15px">指派場地</div>
          <div class="mb-2 text-hint-c" style="font-size:12.5px">{{ assignTarget ? formatRange(assignTarget) : '' }} ・ {{ assignTarget?.guests }} 人</div>
          <div class="venue-pick-list">
            <button v-for="v in activeVenues" :key="v.id" class="venue-pick-item"
                    :class="pickerOccupied[v.id] ? 'venue-pick-disabled' : ''" :disabled="!!pickerOccupied[v.id]"
                    @click="confirmAssign(v.id)">
              <span>{{ v.name }}</span>
              <span class="text-hint-c" style="font-size:11.5px">{{ v.capacity }} 人 ・ NT$ {{ v.price ? v.price.toLocaleString() : '洽詢' }}</span>
              <span v-if="pickerOccupied[v.id]" class="text-hint-c" style="font-size:11px">（此時段已被佔用）</span>
            </button>
          </div>
          <div class="flex justify-end gap-2 mt-3">
            <button class="mini-btn" @click="assignOpen = false">取消</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===================== Modal：登記團體 ===================== -->
    <Teleport to="body">
      <div v-if="newGroupOpen" class="modal-mask" @click.self="newGroupOpen = false">
        <div class="modal-box" style="max-width:640px">
          <div class="font-bold mb-3" style="font-size:15px">登記團體租借</div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <input v-model="newGroup.groupName" placeholder="團體名稱" class="select-input">
            <input v-model="newGroup.phone" placeholder="統一聯絡電話" class="select-input">
          </div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">開始日期</label>
              <input v-model="newGroup.startDate" type="date" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">開始時間</label>
              <input v-model="newGroup.startTime" type="time" class="select-input" style="width:100%">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">結束日期</label>
              <input v-model="newGroup.endDate" type="date" class="select-input" style="width:100%">
            </div>
            <div>
              <label class="block text-hint-c mb-1" style="font-size:12px">結束時間</label>
              <input v-model="newGroup.endTime" type="time" class="select-input" style="width:100%">
            </div>
          </div>

          <div v-for="(row, idx) in newGroup.rows" :key="idx" class="border border-light-c rounded-lg p-2 mb-2">
            <div class="flex items-center gap-2">
              <select v-model="row.venueId" class="select-input flex-1">
                <option value="">選擇場地</option>
                <option v-for="v in activeVenues" :key="v.id" :value="v.id" :disabled="isVenueBusyForGroup(v.id, idx)">{{ v.name }}{{ isVenueBusyForGroup(v.id, idx) ? '（已佔用）' : '' }}</option>
              </select>
              <input v-model.number="row.guests" type="number" min="1" placeholder="人數" class="select-input" style="width:80px">
              <button class="mini-btn mini-danger" @click="newGroup.rows.splice(idx, 1)">移除</button>
            </div>
            <input v-model="row.notes" placeholder="備註（選填）" class="select-input mt-1.5" style="width:100%">
          </div>
          <button class="mini-btn mb-3" @click="newGroup.rows.push({ venueId: '', guests: 1, notes: '' })">＋ 新增場地列</button>

          <p v-if="newGroupError" class="text-red-500 mb-2" style="font-size:12.5px">{{ newGroupError }}</p>
          <div class="flex justify-end gap-2">
            <button class="mini-btn" @click="newGroupOpen = false">取消</button>
            <button class="mini-btn mini-primary" :disabled="newGroupSubmitting" @click="submitNewGroup">{{ newGroupSubmitting ? '送出中...' : '建立團體訂單' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===================== Modal：團體管理 ===================== -->
    <Teleport to="body">
      <div v-if="groupManageOpen" class="modal-mask" @click.self="groupManageOpen = false">
        <div class="modal-box" style="max-width:600px">
          <div class="flex items-center justify-between mb-3">
            <div class="font-bold" style="font-size:15px">{{ groupManageTarget?.[0]?.groupName || '團體' }}</div>
            <button class="collapse-btn" @click="groupManageOpen = false">✕</button>
          </div>
          <div v-for="b in groupManageTarget" :key="b.id" class="border border-light-c rounded-lg p-2.5 mb-2 flex items-center justify-between gap-2">
            <div>
              <div class="font-semibold" style="font-size:13px">{{ venueLabel(b.venueId) }}</div>
              <div class="text-hint-c" style="font-size:11.5px">{{ formatRange(b) }} ・ {{ b.guests }} 人</div>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span>
              <button class="mini-btn" @click="groupManageOpen = false; openEditOrder(b)">編輯</button>
              <button class="mini-btn mini-danger" @click="removeFromGroup(b.id)">移除</button>
            </div>
          </div>
          <div class="flex gap-1.5 flex-wrap mt-3">
            <button class="mini-btn mini-primary" @click="groupSetStatus('confirmed')">整團確認</button>
            <button class="mini-btn" @click="groupSetStatus('completed')">整團設為完成</button>
            <button class="mini-btn mini-danger" @click="groupSetStatus('cancelled')">整團取消</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===================== Modal：場地編輯 ===================== -->
    <Teleport to="body">
      <div v-if="editVenueOpen" class="modal-mask" @click.self="editVenueOpen = false">
        <div class="modal-box">
          <div class="font-bold mb-3" style="font-size:15px">{{ editVenue.id ? '編輯場地' : '新增場地' }}</div>
          <input v-model="editVenue.name" placeholder="場地名稱" class="select-input mb-2" style="width:100%">
          <input v-model="editVenue.location" placeholder="位置（選填，例如 A棟）" class="select-input mb-2" style="width:100%">
          <div class="grid grid-cols-2 gap-2 mb-2">
            <input v-model="editVenue.capacity" placeholder="容納人數（例如 40 或 40-60）" class="select-input">
            <input v-model.number="editVenue.price" type="number" placeholder="價格（元/時段）" class="select-input">
          </div>
          <input v-model="editVenue.activities" placeholder="適合用途（例如 中型會議，活動，聚會）" class="select-input mb-2" style="width:100%">
          <div class="mb-2">
            <label class="block text-hint-c mb-1" style="font-size:12px">設備（逗號分隔）</label>
            <input v-model="editVenueEquipmentText" placeholder="A 投影機, D擴音設備, E冷氣" class="select-input" style="width:100%">
          </div>
          <div class="mb-3">
            <label class="block text-hint-c mb-1" style="font-size:12px">照片檔名（逗號分隔，對應 /images/book/venue-rental-catalog/ 底下的檔案）</label>
            <input v-model="editVenueImagesText" placeholder="1757388033567.jpg, 1757388037022.jpg" class="select-input" style="width:100%">
          </div>
          <label class="flex items-center gap-2 mb-3" style="font-size:13px">
            <input v-model="editVenue.active" type="checkbox"> 上架中
          </label>
          <div class="flex justify-end gap-2">
            <button class="mini-btn" @click="editVenueOpen = false">取消</button>
            <button class="mini-btn mini-primary" @click="submitEditVenue">儲存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'venue.orders' })

const commonStore = useCommonStore()
const VENUES_BASE   = () => commonStore.data.main_url + '/holy/venues/settings'
const BOOKINGS_BASE = () => commonStore.data.main_url + '/holy/venues/bookings'

const loading = ref(true)
const tab = ref('dashboard')
const wideTab = computed(() => ['orders', 'gantt', 'history'].includes(tab.value))

const venues   = ref([])   // [{id,name,location,capacity,capacityMax,activities,price,equipment,images,active,order}]
const bookings = ref([])   // [{id,venueId,name,phone,email,guests,startDate,startTime,endDate,endTime,venuePref,notes,groupId,groupName,status,createdAt}]

const activeVenues = computed(() => venues.value.filter(v => v.active))
const venuesSorted = computed(() => [...venues.value].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)))

function venueLabel(id) {
  const v = venues.value.find(x => x.id === id)
  return v ? v.name : '尚未指派'
}
// 起訖日期相同就顯示單日時段，跨日則顯示完整起訖日期時間
function formatRange(b) {
  if (!b) return ''
  if (b.startDate === b.endDate) return `${b.startDate} ${b.startTime}–${b.endTime}`
  return `${b.startDate} ${b.startTime} ~ ${b.endDate} ${b.endTime}`
}

const STATUS_LABEL = { unassigned: '待指派', pending: '待確認', confirmed: '已確認', completed: '已完成', cancelled: '已取消' }
const STATUS_COLOR = { unassigned: '#0284c7', pending: '#d97706', confirmed: '#15803d', completed: '#78716c', cancelled: '#e11d48' }
function statusLabel(s) { return STATUS_LABEL[s] || s }
function statusColor(s) { return STATUS_COLOR[s] || '#78716c' }
function statusClass(s) {
  return {
    unassigned: 'bg-sky-100 text-sky-700', pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700', completed: 'bg-stone-200 text-stone-600',
    cancelled: 'bg-rose-100 text-rose-700',
  }[s] || 'bg-stone-100 text-stone-600'
}

const todayStr = new Date().toISOString().slice(0, 10)
function countByStatus(s) { return bookings.value.filter(b => b.status === s).length }
const todaysBookings = computed(() => bookings.value.filter(b => b.startDate <= todayStr && b.endDate >= todayStr && b.status !== 'cancelled'))
const upcomingBookings = computed(() =>
  bookings.value.filter(b => b.endDate >= todayStr && ['unassigned', 'pending', 'confirmed'].includes(b.status))
    .sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime)).slice(0, 10)
)

// ---------- 訂單管理列表（含團體展開） ----------
const ordersStatus  = ref('all')
const ordersKeyword = ref('')
const ordersDateFrom = ref('')
const ordersDateTo   = ref('')
const openGroups = ref(new Set())
function toggleGroupOpen(gid) {
  const s = new Set(openGroups.value)
  s.has(gid) ? s.delete(gid) : s.add(gid)
  openGroups.value = s
}

const filteredBookings = computed(() => {
  const kw = ordersKeyword.value.trim().toLowerCase()
  return bookings.value.filter(b => {
    if (ordersStatus.value !== 'all' && b.status !== ordersStatus.value) return false
    // 篩選區間跟訂單的起訖區間只要有重疊就算符合（不是要求訂單完全落在篩選區間內）
    if (ordersDateFrom.value && b.endDate < ordersDateFrom.value) return false
    if (ordersDateTo.value && b.startDate > ordersDateTo.value) return false
    if (kw) {
      const hay = `${b.name} ${b.phone} ${venueLabel(b.venueId)} ${b.groupName}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const orderRows = computed(() => {
  const groups = new Map()
  const singles = []
  for (const b of filteredBookings.value) {
    if (b.groupId) {
      if (!groups.has(b.groupId)) groups.set(b.groupId, [])
      groups.get(b.groupId).push(b)
    } else {
      singles.push(b)
    }
  }
  const rows = []
  for (const [gid, members] of groups) {
    const groupStatus = members.every(m => m.status === members[0].status) ? members[0].status : 'pending'
    rows.push({
      key: 'g_' + gid, isGroupHeader: true, groupId: gid, groupName: members[0].groupName,
      members, status: groupStatus, totalGuests: members.reduce((s, m) => s + (m.guests || 0), 0),
    })
    for (const m of members) {
      rows.push({ ...m, key: m.id, isGroupMember: true, groupId: gid })
    }
  }
  singles.sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime))
  for (const s of singles) rows.push({ ...s, key: s.id })
  return rows
})
// 收合的團體只保留表頭列，展開時才顯示成員列，避免渲染看不見的空 <tr>
const visibleOrderRows = computed(() =>
  orderRows.value.filter(row => row.isGroupHeader || !row.isGroupMember || openGroups.value.has(row.groupId))
)

// ---------- 日曆 ----------
const calendarMonth = ref(new Date())
const dayTarget = ref('')
function shiftCalMonth(n) { calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + n, 1) }
function resetCalMonth() { calendarMonth.value = new Date() }

function bookingsOnDate(dateStr) {
  // dateStr 落在 [startDate, endDate] 區間內就算當天有這筆訂單（不是只有 startDate 那天）
  const dayBs = bookings.value.filter(b => b.startDate <= dateStr && b.endDate >= dateStr && b.status !== 'cancelled')
  const groups = new Map()
  const result = []
  for (const b of dayBs) {
    // 當天顯示的時間：訂單開始那天顯示開始時間，結束那天顯示「至 結束時間」，中間的日子整天都算佔用
    const displayTime = dateStr === b.startDate ? b.startTime : (dateStr === b.endDate ? `至 ${b.endTime}` : '全天')
    if (b.groupId) {
      if (!groups.has(b.groupId)) { groups.set(b.groupId, { key: 'g_' + b.groupId, isGroup: true, groupId: b.groupId, groupName: b.groupName, members: [], status: b.status, displayTime }); result.push(groups.get(b.groupId)) }
      groups.get(b.groupId).members.push(b)
    } else {
      result.push({ ...b, key: b.id, displayTime })
    }
  }
  return result.sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime))
}

const calendarCells = computed(() => {
  const y = calendarMonth.value.getFullYear(), m = calendarMonth.value.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, isToday: dateStr === todayStr, bookings: bookingsOnDate(dateStr) })
  }
  return cells
})

function selectCalDay(dateStr) { dayTarget.value = dayTarget.value === dateStr ? '' : dateStr }
const dayBookings = computed(() => dayTarget.value ? bookingsOnDate(dayTarget.value) : [])

// ---------- 甘特圖（單日） ----------
const ganttDate = ref(todayStr)
function shiftGanttDay(n) {
  const d = new Date(ganttDate.value); d.setDate(d.getDate() + n)
  ganttDate.value = d.toISOString().slice(0, 10)
}
const GANTT_START = 7   // 07:00
const GANTT_END   = 22  // 22:00
const ganttHours = computed(() => {
  const arr = []
  for (let h = GANTT_START; h <= GANTT_END; h++) arr.push(`${String(h).padStart(2, '0')}:00`)
  return arr
})
function timeToMinutes(t) { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m }
function ganttBarsForVenue(venueId) {
  const spanMin = (GANTT_END - GANTT_START) * 60
  return bookings.value
    .filter(b => b.venueId === venueId && b.startDate <= ganttDate.value && b.endDate >= ganttDate.value && b.status !== 'cancelled')
    .map(b => {
      // 這一天的有效起訖分鐘：訂單開始那天用開始時間，結束那天用結束時間，中間的日子整天都算佔用（00:00–24:00）
      const dayStartMin = ganttDate.value === b.startDate ? timeToMinutes(b.startTime) : 0
      const dayEndMin   = ganttDate.value === b.endDate   ? timeToMinutes(b.endTime)   : 24 * 60
      const startMin = Math.max(dayStartMin - GANTT_START * 60, 0)
      const endMin = Math.min(dayEndMin - GANTT_START * 60, spanMin)
      const leftPct = (startMin / spanMin) * 100
      const widthPct = Math.max(((endMin - startMin) / spanMin) * 100, 2)
      return {
        key: b.id, name: b.groupId ? (b.groupName || '團體') : b.name, groupId: b.groupId, raw: b,
        style: { position: 'absolute', left: leftPct + '%', width: widthPct + '%', top: '5px', bottom: '5px', background: b.groupId ? '#7c3aed' : statusColor(b.status) },
      }
    })
}

// ---------- 場地總覽 ----------
const overviewDate = ref(todayStr)
function shiftOverviewDate(n) {
  const d = new Date(overviewDate.value); d.setDate(d.getDate() + n)
  overviewDate.value = d.toISOString().slice(0, 10)
}
function overviewBookingsFor(venueId) {
  return bookings.value.filter(b => b.venueId === venueId && b.startDate <= overviewDate.value && b.endDate >= overviewDate.value && b.status !== 'cancelled')
    .sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime))
}

// ---------- 訂房紀錄 ----------
const historyKeyword = ref('')
const historyRows = computed(() => {
  const kw = historyKeyword.value.trim().toLowerCase()
  return [...bookings.value]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter(b => !kw || `${b.name} ${b.phone} ${venueLabel(b.venueId)}`.toLowerCase().includes(kw))
})

// ---------- 佔用檢查（指派場地 / 表單挑場地共用） ----------
const pickerOccupied = ref({}) // venueId -> bookingId
async function refreshOccupied(startDate, startTime, endDate, endTime, excludeId) {
  pickerOccupied.value = {}
  if (!startDate || !startTime || !endDate || !endTime) return
  try {
    const qs = new URLSearchParams({ startDate, startTime, endDate, endTime, excludeId: excludeId || '' })
    pickerOccupied.value = await (await fetch(`${BOOKINGS_BASE()}/venue-status?${qs}`)).json()
  } catch (e) { console.error(e) }
}

// ---------- 新增訂單 ----------
const newOrderOpen = ref(false)
const newOrderSubmitting = ref(false)
const newOrderError = ref('')
const newOrder = reactive({ venueId: '', startDate: '', startTime: '', endDate: '', endTime: '', guests: 1, name: '', phone: '', email: '', notes: '' })
function openNewOrder() {
  Object.assign(newOrder, { venueId: '', startDate: '', startTime: '', endDate: '', endTime: '', guests: 1, name: '', phone: '', email: '', notes: '' })
  newOrderError.value = ''
  newOrderOpen.value = true
}
watch(() => [newOrder.startDate, newOrder.startTime, newOrder.endDate, newOrder.endTime], () => {
  if (newOrderOpen.value) refreshOccupied(newOrder.startDate, newOrder.startTime, newOrder.endDate, newOrder.endTime, '')
})
async function submitNewOrder() {
  newOrderError.value = ''
  if (!newOrder.startDate || !newOrder.startTime || !newOrder.endDate || !newOrder.endTime) { newOrderError.value = '請填寫起訖日期與起訖時間'; return }
  if (!newOrder.name.trim() || !newOrder.phone.trim()) { newOrderError.value = '請填寫租借人姓名與電話'; return }
  newOrderSubmitting.value = true
  try {
    const res = await (await fetch(`${BOOKINGS_BASE()}/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newOrder, name: newOrder.name.trim(), phone: newOrder.phone.trim() }),
    })).json()
    if (res.error) { newOrderError.value = res.error; return }
    if (newOrder.venueId) {
      await fetch(`${BOOKINGS_BASE()}/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: res.id, venueId: newOrder.venueId }) })
      await fetch(`${BOOKINGS_BASE()}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: res.id, status: 'confirmed' }) })
    }
    newOrderOpen.value = false
    await fetchBookings()
  } catch (e) { console.error(e); newOrderError.value = '建立失敗，請稍後再試' }
  finally { newOrderSubmitting.value = false }
}

// ---------- 編輯訂單 ----------
const editOrderOpen = ref(false)
const editOrderSubmitting = ref(false)
const editOrderError = ref('')
const editOrder = reactive({ id: '', venueId: '', startDate: '', startTime: '', endDate: '', endTime: '', guests: 1, name: '', phone: '', email: '', notes: '' })
const eligibleVenuesForEdit = computed(() => activeVenues.value.filter(v => v.id === editOrder.venueId || !pickerOccupied.value[v.id]))
function openEditOrder(b) {
  Object.assign(editOrder, { id: b.id, venueId: b.venueId, startDate: b.startDate, startTime: b.startTime, endDate: b.endDate, endTime: b.endTime, guests: b.guests, name: b.name, phone: b.phone, email: b.email, notes: b.notes })
  editOrderError.value = ''
  editOrderOpen.value = true
  refreshOccupied(b.startDate, b.startTime, b.endDate, b.endTime, b.id)
}
watch(() => [editOrder.startDate, editOrder.startTime, editOrder.endDate, editOrder.endTime], () => {
  if (editOrderOpen.value) refreshOccupied(editOrder.startDate, editOrder.startTime, editOrder.endDate, editOrder.endTime, editOrder.id)
})
async function submitEditOrder() {
  editOrderError.value = ''
  if (!editOrder.startDate || !editOrder.startTime || !editOrder.endDate || !editOrder.endTime) { editOrderError.value = '請填寫起訖日期與起訖時間'; return }
  editOrderSubmitting.value = true
  try {
    const res = await (await fetch(`${BOOKINGS_BASE()}/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editOrder) })).json()
    if (res.error) { editOrderError.value = res.error; return }
    const original = bookings.value.find(b => b.id === editOrder.id)
    if (original && editOrder.venueId && editOrder.venueId !== original.venueId) {
      const r2 = await (await fetch(`${BOOKINGS_BASE()}/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editOrder.id, venueId: editOrder.venueId }) })).json()
      if (r2.error) { editOrderError.value = r2.error; return }
    }
    editOrderOpen.value = false
    await fetchBookings()
  } catch (e) { console.error(e); editOrderError.value = '儲存失敗，請稍後再試' }
  finally { editOrderSubmitting.value = false }
}

// ---------- 指派場地 ----------
const assignOpen = ref(false)
const assignTarget = ref(null)
function openAssign(b) {
  assignTarget.value = b
  assignOpen.value = true
  refreshOccupied(b.startDate, b.startTime, b.endDate, b.endTime, b.id)
}
async function confirmAssign(venueId) {
  if (pickerOccupied.value[venueId]) return
  try {
    const res = await (await fetch(`${BOOKINGS_BASE()}/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: assignTarget.value.id, venueId }) })).json()
    if (res.error) { alert(res.error); return }
    assignOpen.value = false
    await fetchBookings()
  } catch (e) { console.error(e) }
}

// ---------- 狀態變更 / 刪除 ----------
async function setStatus(id, status) {
  try {
    await fetch(`${BOOKINGS_BASE()}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    await fetchBookings()
  } catch (e) { console.error(e) }
}
async function deleteOrder(id) {
  if (!confirm('確定要刪除這筆訂單嗎？')) return
  try {
    await fetch(`${BOOKINGS_BASE()}/${id}`, { method: 'DELETE' })
    await fetchBookings()
  } catch (e) { console.error(e) }
}

// ---------- 登記團體 ----------
const newGroupOpen = ref(false)
const newGroupSubmitting = ref(false)
const newGroupError = ref('')
const newGroup = reactive({ groupName: '', phone: '', startDate: '', startTime: '', endDate: '', endTime: '', rows: [{ venueId: '', guests: 1, notes: '' }] })
function openNewGroup() {
  Object.assign(newGroup, { groupName: '', phone: '', startDate: '', startTime: '', endDate: '', endTime: '', rows: [{ venueId: '', guests: 1, notes: '' }] })
  newGroupError.value = ''
  newGroupOpen.value = true
}
function isVenueBusyForGroup(venueId, idx) {
  if (pickerOccupied.value[venueId]) return true
  return newGroup.rows.some((r, i) => i !== idx && r.venueId === venueId)
}
watch(() => [newGroup.startDate, newGroup.startTime, newGroup.endDate, newGroup.endTime], () => {
  if (newGroupOpen.value) refreshOccupied(newGroup.startDate, newGroup.startTime, newGroup.endDate, newGroup.endTime, '')
})
async function submitNewGroup() {
  newGroupError.value = ''
  if (!newGroup.startDate || !newGroup.startTime || !newGroup.endDate || !newGroup.endTime) { newGroupError.value = '請填寫起訖日期與起訖時間'; return }
  if (!newGroup.groupName.trim()) { newGroupError.value = '請填寫團體名稱'; return }
  const rows = newGroup.rows.filter(r => r.venueId)
  if (!rows.length) { newGroupError.value = '請至少選一個場地'; return }
  newGroupSubmitting.value = true
  try {
    // 先用第一列建立主訂單，再用 split-to-group 把其餘場地掛上去（沿用既有的分拆邏輯，資料結構跟手動登記團體一致）
    const first = await (await fetch(`${BOOKINGS_BASE()}/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: newGroup.startDate, startTime: newGroup.startTime, endDate: newGroup.endDate, endTime: newGroup.endTime, guests: rows[0].guests, name: newGroup.groupName.trim(), phone: newGroup.phone.trim(), notes: rows[0].notes }),
    })).json()
    if (first.error) { newGroupError.value = first.error; return }
    const res = await (await fetch(`${BOOKINGS_BASE()}/split-to-group`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: first.id, groupName: newGroup.groupName.trim(), venues: rows.map(r => ({ venueId: r.venueId, guests: r.guests, notes: r.notes })) }),
    })).json()
    if (res.error) { newGroupError.value = res.error; return }
    await fetch(`${BOOKINGS_BASE()}/group/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: res.groupId, status: 'confirmed' }) })
    newGroupOpen.value = false
    await fetchBookings()
  } catch (e) { console.error(e); newGroupError.value = '建立失敗，請稍後再試' }
  finally { newGroupSubmitting.value = false }
}

// ---------- 團體管理 ----------
const groupManageOpen = ref(false)
const groupManageId = ref('')
const groupManageTarget = computed(() => bookings.value.filter(b => b.groupId === groupManageId.value))
function openGroupManage(gid) { groupManageId.value = gid; groupManageOpen.value = true }
async function groupSetStatus(status) {
  try {
    await fetch(`${BOOKINGS_BASE()}/group/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: groupManageId.value, status }) })
    await fetchBookings()
  } catch (e) { console.error(e) }
}
async function removeFromGroup(id) {
  if (!confirm('確定要把這個場地從團體中移除嗎？')) return
  try {
    await fetch(`${BOOKINGS_BASE()}/${id}`, { method: 'DELETE' })
    await fetchBookings()
  } catch (e) { console.error(e) }
}

// ---------- 場地管理 ----------
const editVenueOpen = ref(false)
const editVenue = reactive({ id: '', name: '', location: '', capacity: '', price: 0, activities: '', equipment: [], images: [], active: true })
const editVenueEquipmentText = computed({
  get: () => editVenue.equipment.join(', '),
  set: (v) => { editVenue.equipment = v.split(',').map(s => s.trim()).filter(Boolean) },
})
const editVenueImagesText = computed({
  get: () => editVenue.images.join(', '),
  set: (v) => { editVenue.images = v.split(',').map(s => s.trim()).filter(Boolean) },
})
function openEditVenue(v) {
  if (v) Object.assign(editVenue, { id: v.id, name: v.name, location: v.location, capacity: v.capacity, price: v.price, activities: v.activities, equipment: [...v.equipment], images: [...v.images], active: v.active })
  else Object.assign(editVenue, { id: '', name: '', location: '', capacity: '', price: 0, activities: '', equipment: [], images: [], active: true })
  editVenueOpen.value = true
}
async function submitEditVenue() {
  if (!editVenue.name.trim()) { alert('請輸入場地名稱'); return }
  try {
    await fetch(`${VENUES_BASE()}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editVenue) })
    editVenueOpen.value = false
    await fetchVenues()
  } catch (e) { console.error(e) }
}
async function deleteVenue(id) {
  if (!confirm('確定要刪除這個場地嗎？')) return
  try {
    await fetch(`${VENUES_BASE()}/${id}`, { method: 'DELETE' })
    await fetchVenues()
  } catch (e) { console.error(e) }
}

// ---------- 資料載入 ----------
async function fetchVenues() {
  try { venues.value = await (await fetch(`${VENUES_BASE()}/list`)).json() } catch (e) { console.error(e) }
}
async function fetchBookings() {
  try { bookings.value = await (await fetch(`${BOOKINGS_BASE()}/list`)).json() } catch (e) { console.error(e) }
}

onMounted(async () => {
  await Promise.all([fetchVenues(), fetchBookings()])
  loading.value = false
})
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

.group-header-row { background: rgba(139, 92, 246, .16); }
.group-member-row { background: rgba(139, 92, 246, .06); }
.group-member-row td:first-child { border-left: 3px solid #a78bfa; padding-left: 9px; }
.group-badge { font-size: 10.5px; background: rgba(124,58,237,.14); color: #7c3aed; padding: 1px 7px; border-radius: 999px; margin-left: 6px; font-weight: 700; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.stat-card { background: var(--surface); border-radius: 12px; padding: 14px; border-left: 4px solid #15803d; box-shadow: var(--shadow); }
.stat-label { font-size: 12.5px; color: var(--text-hint); font-weight: 600; }
.stat-value { font-size: 23px; font-weight: 700; color: var(--text); margin-top: 2px; }

.type-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
.type-summary-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
.type-summary-title { font-weight: 700; color: var(--text); font-size: 13.5px; margin-bottom: 6px; }
.type-summary-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; padding: 1.5px 0; }

.panel { background: var(--surface); border-radius: 16px; padding: 16px; box-shadow: var(--shadow); overflow-x: auto; }
.select-input { padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13.5px; background: var(--surface2); color: var(--text); }
.status-badge { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.mini-btn { padding: 5px 10px; border-radius: 6px; background: var(--surface2); color: var(--text-muted); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
.mini-btn:hover { background: var(--bg); }
.mini-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.mini-primary { background: #15803d; color: #fff; }
.mini-primary:hover { background: #15803d; filter: brightness(1.08); }
.mini-danger { background: transparent; border: 1px solid #e11d48; color: #e11d48; }
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
.cal-more { text-align: left; font-size: 10.5px; color: var(--text-hint); font-weight: 600; padding: 1px 4px; }

.gantt-grid { display: grid; font-size: 12px; min-width: 100%; width: max-content; }
.gantt-corner { position: sticky; top: 0; left: 0; z-index: 3; background: var(--surface); border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); display: flex; align-items: center; padding: 6px 10px; font-weight: 700; font-size: 12px; color: var(--text-hint); }
.gantt-day-head { position: sticky; top: 0; z-index: 2; background: var(--surface); border-bottom: 1px solid var(--border); border-left: 1px solid var(--border-light); text-align: center; padding: 4px 2px; font-size: 10.5px; color: var(--text-hint); }
.gantt-room-label { position: sticky; left: 0; z-index: 1; background: var(--surface); border-right: 1px solid var(--border); border-bottom: 1px solid var(--border-light); padding: 7px 10px; font-size: 12.5px; font-weight: 700; color: var(--text); display: flex; align-items: center; white-space: nowrap; }
.gantt-room-track { position: relative; border-bottom: 1px solid var(--border-light); min-height: 40px; }
.gantt-bar { border-radius: 5px; color: #fff; font-size: 11px; font-weight: 600; padding: 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; display: flex; align-items: center; }
.gantt-bar:hover { filter: brightness(1.12); }

.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal-box { background: var(--surface); border-radius: 16px; padding: 20px; width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; }

.venue-pick-list { display: flex; flex-direction: column; gap: 6px; max-height: 340px; overflow-y: auto; }
.venue-pick-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface2); text-align: left; }
.venue-pick-item:hover:not(:disabled) { border-color: #15803d; }
.venue-pick-disabled { opacity: .45; cursor: not-allowed; }
</style>
