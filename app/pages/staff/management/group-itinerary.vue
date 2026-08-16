<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">🧳</div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">團體行程</h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">Holy Mother Farm</p>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="flex flex-col lg:flex-row gap-4 items-start">

        <!-- ── 左欄：日曆 ── -->
        <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div class="bg-surface rounded-2xl border border-light-c shadow-sm p-4 lg:sticky lg:top-20">
            <div class="flex items-center justify-between mb-3">
              <button @click="prevMonth" class="p-1.5 hover-surface2 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="text-base font-semibold text-muted-c">{{ calendarLabel }}</span>
              <button @click="nextMonth" class="p-1.5 hover-surface2 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-7 mb-1">
              <div v-for="w in ['日','一','二','三','四','五','六']" :key="w" class="text-center text-sm text-hint-c font-medium py-1">{{ w }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(day, idx) in calendarDays" :key="idx"
                   class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                   :class="dayClass(day)"
                   @click="day.date && selectDate(day.date)">
                <span>{{ day.label }}</span>
                <div v-if="day.date && groupsByDate[day.date]" class="absolute bottom-1 flex gap-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-light-c">
              <span class="text-sm text-hint-c">
                <span v-if="selectedDate" class="text-base-c font-medium">{{ selectedDate }}</span>
                <span v-else>請選擇日期</span>
              </span>
              <button @click="selectDate(todayStr)" class="text-sm text-violet-600 hover:text-violet-700 font-medium">今天</button>
            </div>
          </div>
        </div>

        <!-- ── 右欄：該日期的團體行程 ── -->
        <div class="flex-1 min-w-0 w-full">
          <div v-if="loading" class="text-center py-8 text-hint-c" style="font-size:14px">載入中...</div>

          <template v-else-if="selectedDate">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-bold text-base-c" style="font-size:15px">{{ selectedDate }} 的團體行程</h2>
              <button class="mini-btn mini-primary" @click="openCreateGroup">＋ 新增團體行程</button>
            </div>

            <div v-if="selectedDateGroups.length === 0" class="panel text-center text-hint-c py-10" style="font-size:13.5px">
              這天沒有團體行程
            </div>
            <div v-else class="flex flex-col gap-2">
              <div
                v-for="g in selectedDateGroups"
                :key="g.id"
                class="panel cursor-pointer hover:shadow-md transition-shadow"
                style="padding:14px 16px"
                @click="openDetail(g.id)"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-bold text-base-c truncate" style="font-size:15px">{{ g.name }}</div>
                    <div class="text-hint-c mt-0.5" style="font-size:12.5px">
                      {{ g.startDate }}<span v-if="g.endDate && g.endDate !== g.startDate"> → {{ g.endDate }}</span>
                      <span v-if="g.contactName"> · {{ g.contactName }}</span>
                      <span v-if="g.contactPhone"> · {{ g.contactPhone }}</span>
                    </div>
                  </div>
                  <div class="status-badge bg-violet-100 text-violet-700 flex-shrink-0">{{ g.memberCount }} 個項目</div>
                </div>
                <!-- 快速新增：不用先點進詳情，直接在列表卡片上加項目 -->
                <div class="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-light-c" @click.stop>
                  <button v-for="t in itemTypes" :key="t" class="mini-btn" @click="quickAddItem(g, t)">＋{{ typeLabel(t) }}</button>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="bg-surface rounded-2xl border border-light-c p-12 text-center text-hint-c text-sm shadow-sm">
            請從左側日曆選擇日期
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 新增／編輯團體 Modal ===== -->
    <div v-if="groupModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => groupModal.open = false)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:16px">{{ groupModal.id ? '編輯團體資訊' : '新增團體行程' }}</h2>

        <label class="block text-hint-c mb-1" style="font-size:13px">團體名稱</label>
        <input v-model="groupModal.name" type="text" class="w-full border border-light-c rounded-lg px-3 py-2 mb-3 bg-surface2 text-base-c" style="font-size:14px" placeholder="例如：陽光教會夏令營">

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">開始日期</label>
            <input v-model="groupModal.startDate" type="date" class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:14px">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">結束日期</label>
            <input v-model="groupModal.endDate" type="date" class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:14px">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">聯絡人</label>
            <input v-model="groupModal.contactName" type="text" class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:14px">
          </div>
          <div>
            <label class="block text-hint-c mb-1" style="font-size:13px">聯絡電話</label>
            <input v-model="groupModal.contactPhone" type="text" class="w-full border border-light-c rounded-lg px-3 py-2 bg-surface2 text-base-c" style="font-size:14px">
          </div>
        </div>

        <label class="block text-hint-c mb-1" style="font-size:13px">備註</label>
        <textarea v-model="groupModal.notes" rows="2" class="w-full border border-light-c rounded-lg px-3 py-2 mb-1 bg-surface2 text-base-c" style="font-size:14px"></textarea>

        <p v-if="groupModal.error" class="text-red-500 mb-2 mt-2" style="font-size:12.5px">{{ groupModal.error }}</p>
        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-plain" @click="groupModal.open = false">取消</button>
          <button class="btn-primary" :disabled="groupModal.saving" @click="saveGroupModal">{{ groupModal.saving ? '儲存中...' : '儲存' }}</button>
        </div>
      </div>
    </div>

    <!-- ===== 團體詳情 Modal ===== -->
    <div v-if="detailGroup" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => detailGroup = null)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-lg p-5" style="max-height:88vh;overflow-y:auto">
        <div class="flex items-start justify-between gap-3 mb-1">
          <h2 class="font-bold text-base-c" style="font-size:17px">{{ detailGroup.name }}</h2>
          <button class="mini-btn" @click="openEditGroup">編輯資訊</button>
        </div>
        <div class="text-hint-c mb-4" style="font-size:12.5px">
          {{ detailGroup.startDate }}<span v-if="detailGroup.endDate && detailGroup.endDate !== detailGroup.startDate"> → {{ detailGroup.endDate }}</span>
          <span v-if="detailGroup.contactName"> · {{ detailGroup.contactName }}</span>
          <span v-if="detailGroup.contactPhone"> · {{ detailGroup.contactPhone }}</span>
        </div>
        <p v-if="detailGroup.notes" class="text-base-c mb-4" style="font-size:13px;white-space:pre-wrap">{{ detailGroup.notes }}</p>

        <!-- 子項目清單 -->
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-base-c" style="font-size:14px">項目（{{ detailGroup.members.length }}）</h3>
          <button class="mini-btn mini-primary" @click="openAddItem">＋ 新增項目</button>
        </div>
        <div v-if="detailGroup.members.length === 0" class="text-hint-c text-center py-6" style="font-size:13px">
          還沒有任何項目
        </div>
        <div v-else class="flex flex-col gap-2 mb-4">
          <div
            v-for="m in detailGroup.members"
            :key="m.memberKey"
            class="bg-surface2 border border-light-c rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <span class="flex-shrink-0" style="font-size:16px">{{ typeIcon(m.type) }}</span>
            <div class="min-w-0 flex-1">
              <div class="text-hint-c" style="font-size:11.5px">{{ typeLabel(m.type) }}</div>
              <div class="text-base-c truncate" style="font-size:13px">{{ memberSummary(m) }}</div>
            </div>
            <button class="mini-btn mini-danger flex-shrink-0" @click="removeItem(m)">移除</button>
          </div>
        </div>

        <!-- 整團操作 -->
        <div class="flex flex-wrap gap-2 pt-3 border-t border-light-c">
          <button class="mini-btn" @click="openReschedule">整團改期</button>
          <button class="mini-btn" @click="openCopy">複製到新日期</button>
          <button class="mini-btn mini-danger" @click="deleteGroup">刪除整團</button>
        </div>
      </div>
    </div>

    <!-- ===== 新增項目 Modal ===== -->
    <div v-if="addItemModal.open" class="fixed inset-0 bg-black/60 flex items-center justify-center z-40 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => addItemModal.open = false)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-md p-5" style="max-height:88vh;overflow-y:auto">
        <h2 class="font-bold text-base-c mb-3" style="font-size:16px">
          新增{{ addItemModal.typeLocked ? typeLabel(newItem.type) : '項目' }}
        </h2>

        <div v-if="!addItemModal.typeLocked" class="segmented w-fit mb-4">
          <button v-for="t in itemTypes" :key="t" :class="newItem.type === t ? 'seg-active' : ''" :style="newItem.type === t ? segActiveStyle : ''" @click="switchItemType(t)">{{ typeLabel(t) }}</button>
        </div>

        <!-- 住宿 -->
        <template v-if="newItem.type === 'room'">
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><label class="block text-hint-c mb-1" style="font-size:13px">入住日期</label><input v-model="newItem.checkIn" type="date" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">退房日期</label><input v-model="newItem.checkOut" type="date" class="w-full field-input"></div>
          </div>
          <label class="block text-hint-c mb-1" style="font-size:13px">棟別偏好</label>
          <select v-model="newItem.buildingPref" class="w-full field-input mb-3">
            <option value="all">不指定</option>
            <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </template>

        <!-- 場地租借 -->
        <template v-else-if="newItem.type === 'venue'">
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><label class="block text-hint-c mb-1" style="font-size:13px">開始日期</label><input v-model="newItem.startDate" type="date" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">開始時間</label><input v-model="newItem.startTime" type="time" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">結束日期</label><input v-model="newItem.endDate" type="date" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">結束時間</label><input v-model="newItem.endTime" type="time" class="w-full field-input"></div>
          </div>
          <label class="block text-hint-c mb-1" style="font-size:13px">場地偏好</label>
          <select v-model="newItem.venuePref" class="w-full field-input mb-3">
            <option value="all">不指定</option>
            <option v-for="v in venues" :key="v.id" :value="v.id">{{ v.name }}</option>
          </select>
        </template>

        <!-- 餐廳訂位／便當：欄位相同 -->
        <template v-else-if="newItem.type === 'booking' || newItem.type === 'lunch'">
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><label class="block text-hint-c mb-1" style="font-size:13px">日期</label><input v-model="newItem.date" type="date" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">時間</label><input v-model="newItem.time" type="time" class="w-full field-input"></div>
          </div>
          <div class="grid grid-cols-4 gap-2 mb-3">
            <div><label class="block text-hint-c mb-1" style="font-size:12px">葷食</label><input v-model.number="newItem.meatQty" type="number" min="0" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:12px">全素</label><input v-model.number="newItem.fullVegQty" type="number" min="0" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:12px">蛋奶素</label><input v-model.number="newItem.eggVegQty" type="number" min="0" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:12px">五辛素</label><input v-model.number="newItem.spiceVegQty" type="number" min="0" class="w-full field-input"></div>
          </div>
        </template>

        <!-- 行程 -->
        <template v-else-if="newItem.type === 'itinerary'">
          <label class="block text-hint-c mb-1" style="font-size:13px">標題</label>
          <input v-model="newItem.title" type="text" class="w-full field-input mb-3">
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><label class="block text-hint-c mb-1" style="font-size:13px">起始日期</label><input v-model="newItem.date" type="date" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">結束日期</label><input v-model="newItem.endDate" type="date" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">開始時間</label><input v-model="newItem.time" type="time" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">結束時間</label><input v-model="newItem.endTime" type="time" class="w-full field-input"></div>
          </div>
          <label class="block text-hint-c mb-1" style="font-size:13px">場地／地點</label>
          <input v-model="newItem.room" type="text" class="w-full field-input mb-3">
        </template>

        <!-- 共用：姓名/電話/備註（住宿/場地/訂位/便當都用得到；行程用負責人/詳細內容） -->
        <template v-if="newItem.type !== 'itinerary'">
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><label class="block text-hint-c mb-1" style="font-size:13px">姓名</label><input v-model="newItem.name" type="text" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">電話</label><input v-model="newItem.phone" type="text" class="w-full field-input"></div>
          </div>
          <template v-if="newItem.type === 'room' || newItem.type === 'venue'">
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div><label class="block text-hint-c mb-1" style="font-size:13px">Email</label><input v-model="newItem.email" type="text" class="w-full field-input"></div>
              <div><label class="block text-hint-c mb-1" style="font-size:13px">人數</label><input v-model.number="newItem.guests" type="number" min="1" class="w-full field-input"></div>
            </div>
          </template>
          <label class="block text-hint-c mb-1" style="font-size:13px">備註</label>
          <textarea v-model="newItem.note" rows="2" class="w-full field-input mb-1"></textarea>
        </template>
        <template v-else>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><label class="block text-hint-c mb-1" style="font-size:13px">負責人</label><input v-model="newItem.owner" type="text" class="w-full field-input"></div>
            <div><label class="block text-hint-c mb-1" style="font-size:13px">建築分類</label><input v-model="newItem.building" type="text" class="w-full field-input"></div>
          </div>
          <label class="block text-hint-c mb-1" style="font-size:13px">詳細內容</label>
          <textarea v-model="newItem.description" rows="3" class="w-full field-input mb-1"></textarea>
        </template>

        <p v-if="addItemModal.error" class="text-red-500 mb-2 mt-2" style="font-size:12.5px">{{ addItemModal.error }}</p>
        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-plain" @click="addItemModal.open = false">取消</button>
          <button class="btn-primary" :disabled="addItemModal.saving" @click="submitAddItem">{{ addItemModal.saving ? '建立中...' : '建立' }}</button>
        </div>
      </div>
    </div>

    <!-- ===== 整團改期 Modal ===== -->
    <div v-if="rescheduleModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => rescheduleModal.open = false)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:16px">整團改期</h2>
        <p class="text-hint-c mb-3" style="font-size:13px">會把底下每個項目的日期一起位移相同天數。</p>
        <label class="block text-hint-c mb-1" style="font-size:13px">新的開始日期</label>
        <input v-model="rescheduleModal.newStartDate" type="date" class="w-full field-input mb-1">
        <p v-if="rescheduleModal.error" class="text-red-500 mb-2 mt-2" style="font-size:12.5px">{{ rescheduleModal.error }}</p>
        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-plain" @click="rescheduleModal.open = false">取消</button>
          <button class="btn-primary" :disabled="rescheduleModal.saving" @click="submitReschedule">{{ rescheduleModal.saving ? '處理中...' : '確認改期' }}</button>
        </div>
      </div>
    </div>

    <!-- ===== 複製到新日期 Modal ===== -->
    <div v-if="copyModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4" @mousedown="onBackdropMousedown" @click="onBackdropClick($event, () => copyModal.open = false)">
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2 class="font-bold text-base-c mb-3" style="font-size:16px">複製到新日期</h2>
        <p class="text-hint-c mb-3" style="font-size:13px">原本這團完全不動，會另外產生一份新的團體行程。</p>
        <label class="block text-hint-c mb-1" style="font-size:13px">新的開始日期</label>
        <input v-model="copyModal.newStartDate" type="date" class="w-full field-input mb-3">
        <label class="block text-hint-c mb-1" style="font-size:13px">新團體名稱（留空則自動加「（複製）」）</label>
        <input v-model="copyModal.newName" type="text" class="w-full field-input mb-1">
        <p v-if="copyModal.error" class="text-red-500 mb-2 mt-2" style="font-size:12.5px">{{ copyModal.error }}</p>
        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-plain" @click="copyModal.open = false">取消</button>
          <button class="btn-primary" :disabled="copyModal.saving" @click="submitCopy">{{ copyModal.saving ? '複製中...' : '確認複製' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'management.group-itinerary' })

const commonStore = useCommonStore()
const GROUP_BASE = computed(() => commonStore.data.main_url + '/holy/group-itinerary')
const ROOMS_BASE = computed(() => commonStore.data.main_url + '/holy/rooms/settings')
const VENUES_BASE = computed(() => commonStore.data.main_url + '/holy/venues/settings')

// Modal 背景點擊關閉：只有「mousedown 跟 click 都落在背景本身」才關閉（比照 rooms-orders.vue 的做法，
// 避免在 Modal 內容裡按住滑鼠選取文字、放開到背景外面時被誤判成點背景關閉）
const backdropMouseDownOnSelf = ref(false)
function onBackdropMousedown(e) { backdropMouseDownOnSelf.value = e.target === e.currentTarget }
function onBackdropClick(e, close) {
  if (backdropMouseDownOnSelf.value && e.target === e.currentTarget) close()
  backdropMouseDownOnSelf.value = false
}

const segActiveStyle = { background: '#7c3aed', color: '#fff' }

const loading = ref(false)
const groups = ref([])
const buildings = ref([]) // 住宿棟別，供新增項目下拉選單用
const venues = ref([])    // 場地清單，供新增項目下拉選單用

// ── 日曆（比照 booking-orders.vue／lunch-orders.vue 的左側日曆） ──────────────
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const selectedDate = ref('')
const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)
const calendarLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)

const calendarDays = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0'), dd = String(d).padStart(2, '0')
    days.push({ label: d, date: `${calYear.value}-${mm}-${dd}` })
  }
  return days
})
function dayClass(day) {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-violet-600 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-semibold hover:bg-violet-200'
  return 'text-base-c hover-surface2'
}
function prevMonth() { if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value-- }
function nextMonth() { if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++ }
function selectDate(date) { selectedDate.value = date }

// 每個團體從 startDate 到 endDate（含）都算「這天有這個團」，用來點日曆標記／篩選右側清單。
// 團體行程的日期範圍通常不會太長，但還是設個上限避免資料異常（例如日期打反）時卡住整頁。
const groupsByDate = computed(() => {
  const map = {}
  for (const g of groups.value) {
    if (!g.startDate) continue
    const start = g.startDate
    const end = g.endDate && g.endDate >= g.startDate ? g.endDate : g.startDate
    let cur = start
    let guard = 0
    while (cur <= end && guard < 366) {
      if (!map[cur]) map[cur] = []
      map[cur].push(g)
      const nd = new Date(cur)
      nd.setDate(nd.getDate() + 1)
      cur = nd.toISOString().slice(0, 10)
      guard++
    }
  }
  return map
})
const selectedDateGroups = computed(() => groupsByDate.value[selectedDate.value] || [])

async function fetchGroups() {
  loading.value = true
  try {
    groups.value = await (await fetch(`${GROUP_BASE.value}/list`)).json()
  } catch (e) { console.error(e) } finally { loading.value = false }
}

async function fetchOptionLists() {
  try {
    const [b, v] = await Promise.all([
      (await fetch(`${ROOMS_BASE.value}/list`)).json(),
      (await fetch(`${VENUES_BASE.value}/list`)).json()
    ])
    buildings.value = Array.isArray(b) ? b : []
    venues.value = Array.isArray(v) ? v : []
  } catch (e) { console.error(e) }
}

/* ---------------- 團體 新增/編輯 ---------------- */
const groupModal = reactive({ open: false, id: '', name: '', startDate: '', endDate: '', contactName: '', contactPhone: '', notes: '', saving: false, error: '' })

function openCreateGroup() {
  // 從右側「＋ 新增團體行程」點進來時，預設帶入目前選擇的日期，省得再選一次
  const d = selectedDate.value || todayStr
  Object.assign(groupModal, { open: true, id: '', name: '', startDate: d, endDate: d, contactName: '', contactPhone: '', notes: '', error: '' })
}
function openEditGroup() {
  if (!detailGroup.value) return
  const g = detailGroup.value
  Object.assign(groupModal, { open: true, id: g.id, name: g.name, startDate: g.startDate, endDate: g.endDate, contactName: g.contactName, contactPhone: g.contactPhone, notes: g.notes, error: '' })
}
async function saveGroupModal() {
  groupModal.error = ''
  if (!groupModal.name.trim()) { groupModal.error = '請輸入團體名稱'; return }
  if (!groupModal.startDate) { groupModal.error = '請選擇開始日期'; return }
  groupModal.saving = true
  try {
    const body = {
      id: groupModal.id || undefined,
      name: groupModal.name,
      startDate: groupModal.startDate,
      endDate: groupModal.endDate || groupModal.startDate,
      contactName: groupModal.contactName,
      contactPhone: groupModal.contactPhone,
      notes: groupModal.notes
    }
    const res = await (await fetch(`${GROUP_BASE.value}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()
    if (res.error) { groupModal.error = res.error; return }
    groupModal.open = false
    await fetchGroups()
    if (detailGroup.value && detailGroup.value.id === res.id) await openDetail(res.id)
  } catch (e) { groupModal.error = '儲存失敗' } finally { groupModal.saving = false }
}

/* ---------------- 團體詳情 ---------------- */
const detailGroup = ref(null) // { id, name, startDate, endDate, contactName, contactPhone, notes, members:[...] }

async function openDetail(id) {
  try {
    const res = await (await fetch(`${GROUP_BASE.value}/${id}`)).json()
    if (res.error) { alert(res.error); return }
    detailGroup.value = res
  } catch (e) { console.error(e) }
}

const typeLabelMap = { room: '住宿', venue: '場地租借', booking: '餐廳訂位', lunch: '便當', itinerary: '行程' }
const typeIconMap = { room: '🛏️', venue: '🏛️', booking: '🍽️', lunch: '🍱', itinerary: '🗓️' }
function typeLabel(t) { return typeLabelMap[t] || t }
function typeIcon(t) { return typeIconMap[t] || '•' }

function totalQty(d) { return (d.meatQty || 0) + (d.fullVegQty || 0) + (d.eggVegQty || 0) + (d.spiceVegQty || 0) }
function memberSummary(m) {
  if (m.missing || !m.data) return '（原始資料已被刪除或找不到，僅保留參照紀錄）'
  const d = m.data
  switch (m.type) {
    case 'room':      return `${d.checkIn} → ${d.checkOut}　${d.name || ''}　${d.guests || ''}人　${d.status || ''}`
    case 'venue':      return `${d.startDate} ${d.startTime} → ${d.endDate} ${d.endTime}　${d.name || ''}　${d.status || ''}`
    case 'booking':    return `${d.date} ${d.time}　${d.name || ''}　共${totalQty(d)}人　${d.status || ''}`
    case 'lunch':      return `${d.date} ${d.time}　${d.name || ''}　共${totalQty(d)}份　${d.status || ''}`
    case 'itinerary':  return `${d.date}${d.endDate && d.endDate !== d.date ? ' → ' + d.endDate : ''} ${d.time || ''}　${d.title || ''}`
    default:           return ''
  }
}

async function removeItem(m) {
  if (!detailGroup.value) return
  if (!confirm(`確定要移除「${typeLabel(m.type)}」這個項目嗎？對應的原始資料也會一併刪除，此動作無法復原。`)) return
  try {
    const res = await (await fetch(`${GROUP_BASE.value}/remove-item`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: detailGroup.value.id, memberKey: m.memberKey })
    })).json()
    if (res && res.error) { alert(res.error); return }
    await openDetail(detailGroup.value.id)
    await fetchGroups()
  } catch (e) { console.error(e) }
}

async function deleteGroup() {
  if (!detailGroup.value) return
  if (!confirm(`確定要刪除整個團體行程「${detailGroup.value.name}」嗎？底下所有項目都會一併刪除，此動作無法復原。`)) return
  try {
    await fetch(`${GROUP_BASE.value}/${detailGroup.value.id}`, { method: 'DELETE' })
    detailGroup.value = null
    await fetchGroups()
  } catch (e) { console.error(e) }
}

/* ---------------- 新增項目 ---------------- */
const itemTypes = ['room', 'venue', 'booking', 'lunch', 'itinerary']
const addItemModal = reactive({ open: false, saving: false, error: '', typeLocked: false })
// 新增項目的目標團體 id：從詳情 Modal 開（openAddItem）或直接從列表卡片快速新增（quickAddItem）
// 都寫這個欄位，不綁死一定要先打開詳情 Modal 才能新增
const addItemGroupId = ref('')
const newItem = reactive({
  type: 'booking',
  date: '', endDate: '', time: '', endTime: '',
  name: '', phone: '', email: '', note: '',
  meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0,
  checkIn: '', checkOut: '', guests: 1, buildingPref: 'all',
  startDate: '', startTime: '', venuePref: 'all',
  title: '', owner: '', room: '', building: '', description: ''
})

function prefillNewItem(g, type) {
  Object.assign(newItem, {
    type,
    date: g.startDate, endDate: g.endDate, time: '', endTime: '',
    name: g.contactName || '', phone: g.contactPhone || '', email: '', note: '',
    meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0,
    checkIn: g.startDate, checkOut: g.endDate, guests: 1, buildingPref: 'all',
    startDate: g.startDate, startTime: '', venuePref: 'all',
    title: '', owner: g.contactName || '', room: '', building: '', description: ''
  })
}
function openAddItem() {
  if (!detailGroup.value) return
  addItemGroupId.value = detailGroup.value.id
  prefillNewItem(detailGroup.value, 'booking')
  addItemModal.typeLocked = false
  addItemModal.error = ''
  addItemModal.open = true
}
// 列表卡片上的「＋住宿」「＋場地租借」…按鈕：類型已經由按的哪顆按鈕決定了，Modal 裡就不用
// 再讓使用者切換類型（typeLocked = true 會把切換用的 segmented 控制項隱藏）
function quickAddItem(g, type) {
  addItemGroupId.value = g.id
  prefillNewItem(g, type)
  addItemModal.typeLocked = true
  addItemModal.error = ''
  addItemModal.open = true
}
function switchItemType(t) { newItem.type = t }

function buildItemPayload() {
  const t = newItem.type
  if (t === 'room') {
    return { checkIn: newItem.checkIn, checkOut: newItem.checkOut, guests: newItem.guests, name: newItem.name, phone: newItem.phone, email: newItem.email, buildingPref: newItem.buildingPref, notes: newItem.note }
  }
  if (t === 'venue') {
    return { startDate: newItem.startDate, startTime: newItem.startTime, endDate: newItem.endDate, endTime: newItem.endTime, guests: newItem.guests, name: newItem.name, phone: newItem.phone, email: newItem.email, venuePref: newItem.venuePref, notes: newItem.note }
  }
  if (t === 'booking' || t === 'lunch') {
    return { date: newItem.date, time: newItem.time, name: newItem.name, phone: newItem.phone, meatQty: newItem.meatQty, fullVegQty: newItem.fullVegQty, eggVegQty: newItem.eggVegQty, spiceVegQty: newItem.spiceVegQty, note: newItem.note }
  }
  // itinerary
  return { date: newItem.date, endDate: newItem.endDate, time: newItem.time, endTime: newItem.endTime, title: newItem.title, owner: newItem.owner, room: newItem.room, building: newItem.building, description: newItem.description }
}

async function submitAddItem() {
  addItemModal.error = ''
  if (!addItemGroupId.value) return
  if (newItem.type === 'itinerary' && !newItem.title.trim()) { addItemModal.error = '請輸入標題'; return }
  if (newItem.type !== 'itinerary' && !newItem.name.trim()) { addItemModal.error = '請輸入姓名'; return }
  addItemModal.saving = true
  try {
    const body = { groupId: addItemGroupId.value, type: newItem.type, ...buildItemPayload() }
    const res = await (await fetch(`${GROUP_BASE.value}/add-item`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()
    if (res.error) { addItemModal.error = res.error; return }
    addItemModal.open = false
    await fetchGroups()
    // 詳情 Modal 剛好開著同一個團體時，也一併刷新裡面的項目清單
    if (detailGroup.value && detailGroup.value.id === addItemGroupId.value) await openDetail(addItemGroupId.value)
  } catch (e) { addItemModal.error = '建立失敗' } finally { addItemModal.saving = false }
}

/* ---------------- 整團改期 ---------------- */
const rescheduleModal = reactive({ open: false, newStartDate: '', saving: false, error: '' })
function openReschedule() {
  if (!detailGroup.value) return
  Object.assign(rescheduleModal, { open: true, newStartDate: detailGroup.value.startDate, error: '' })
}
async function submitReschedule() {
  rescheduleModal.error = ''
  if (!rescheduleModal.newStartDate) { rescheduleModal.error = '請選擇新的開始日期'; return }
  rescheduleModal.saving = true
  try {
    const res = await (await fetch(`${GROUP_BASE.value}/reschedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: detailGroup.value.id, newStartDate: rescheduleModal.newStartDate })
    })).json()
    if (res.error) { rescheduleModal.error = res.error; return }
    rescheduleModal.open = false
    await openDetail(detailGroup.value.id)
    await fetchGroups()
    if (res.failedMembers && res.failedMembers.length) {
      alert(`有 ${res.failedMembers.length} 個項目改期失敗（可能是新日期已被佔用），請到詳情裡個別檢查。`)
    }
  } catch (e) { rescheduleModal.error = '改期失敗' } finally { rescheduleModal.saving = false }
}

/* ---------------- 複製到新日期 ---------------- */
const copyModal = reactive({ open: false, newStartDate: '', newName: '', saving: false, error: '' })
function openCopy() {
  if (!detailGroup.value) return
  Object.assign(copyModal, { open: true, newStartDate: '', newName: '', error: '' })
}
async function submitCopy() {
  copyModal.error = ''
  if (!copyModal.newStartDate) { copyModal.error = '請選擇新的開始日期'; return }
  copyModal.saving = true
  try {
    const body = { groupId: detailGroup.value.id, newStartDate: copyModal.newStartDate }
    if (copyModal.newName.trim()) body.newName = copyModal.newName.trim()
    const res = await (await fetch(`${GROUP_BASE.value}/copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()
    if (res.error) { copyModal.error = res.error; return }
    copyModal.open = false
    await fetchGroups()
    await openDetail(res.id) // 直接切到新複製出來的團體，方便微調
    if (res.failedSourceMembers && res.failedSourceMembers.length) {
      alert(`有 ${res.failedSourceMembers.length} 個項目複製失敗（來源資料可能已被刪除），請到詳情裡確認。`)
    }
  } catch (e) { copyModal.error = '複製失敗' } finally { copyModal.saving = false }
}

const route = useRoute()

onMounted(async () => {
  selectedDate.value = todayStr
  await fetchGroups()
  fetchOptionLists()
  // 從其他系統（訂位/便當/訂房/行程）的「屬於 XX 團」徽章點過來時，帶 ?open=<groupId>，
  // 進頁面直接打開該團體的詳情，並把左側日曆切到那個團體開始的日期／月份，不用自己再找
  if (route.query.open) {
    await openDetail(route.query.open)
    if (detailGroup.value && detailGroup.value.startDate) {
      selectedDate.value = detailGroup.value.startDate
      const [y, m] = detailGroup.value.startDate.split('-').map(Number)
      calYear.value = y
      calMonth.value = m
    }
  }
})
</script>

<style scoped>
.segmented { display: flex; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 3px; gap: 2px; }
.segmented button { border: none; background: transparent; color: var(--text-muted); padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 700; white-space: nowrap; }
.segmented button:hover { background: var(--border-light); color: var(--text); }
.seg-active, .seg-active:hover { background: #7c3aed; color: #fff; }
.w-fit { width: fit-content; }

.panel { background: var(--surface); border-radius: 16px; padding: 16px; box-shadow: var(--shadow); }

.status-badge { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }

.mini-btn { padding: 5px 10px; border-radius: 6px; background: var(--surface2); color: var(--text-muted); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
.mini-btn:hover { background: var(--bg); }
.mini-primary { background: #7c3aed; color: #fff; }
.mini-primary:hover { background: #7c3aed; filter: brightness(1.08); }
.mini-danger { background: transparent; border: 1px solid #e11d48; color: #e11d48; }

.btn-plain { padding: 7px 14px; border-radius: 8px; background: var(--surface2); color: var(--text-muted); font-size: 14px; font-weight: 600; }
.btn-plain:hover { background: var(--bg); }
.btn-primary { padding: 7px 14px; border-radius: 8px; background: #7c3aed; color: #fff; font-size: 14px; font-weight: 700; }
.btn-primary:disabled { opacity: .5; }

.field-input { padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13.5px; background: var(--surface2); color: var(--text); }
</style>
