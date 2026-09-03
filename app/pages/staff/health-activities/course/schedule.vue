<script setup>
// 專案 holy-mother-farm 位置 staff/health-activities/course/schedule.vue
import { useCourseScheduleStore } from '~/stores/courseSchedule.js'
import { useCourseRegistrationStore } from '~/stores/courseRegistration.js'

definePageMeta({ layout: 'staff', requiredPermission: 'health-activities.course' })

const scheduleStore = useCourseScheduleStore()
const courseStore = useCourseRegistrationStore()

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth() + 1) // 1~12

const yearMonth = computed(() => `${viewYear.value}-${String(viewMonth.value).padStart(2, '0')}`)

const loading = ref(false)
const toast = reactive({ show: false, message: '', error: false })
const showToast = (msg, error = false) => {
  toast.message = msg; toast.error = error; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

const load = async () => {
  loading.value = true
  try {
    await Promise.all([
      scheduleStore.fetchMonth(yearMonth.value),
      courseStore.fetchCourses(),
    ])
  } catch {
    showToast('載入失敗', true)
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(yearMonth, load)

const prevMonth = () => {
  if (viewMonth.value === 1) { viewMonth.value = 12; viewYear.value-- } else viewMonth.value--
}
const nextMonth = () => {
  if (viewMonth.value === 12) { viewMonth.value = 1; viewYear.value++ } else viewMonth.value++
}
const goToday = () => { viewYear.value = today.getFullYear(); viewMonth.value = today.getMonth() + 1 }

const pad = n => String(n).padStart(2, '0')
const dateStr = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

// 週一為每週第一天（比照 Excel 排課表的「週一～週日」欄序）
const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

const calendarCells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value - 1, 1)
  const firstWeekday = (first.getDay() + 6) % 7 // 0=週一
  const daysInMonth = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(dateStr(viewYear.value, viewMonth.value, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})
const weeks = computed(() => {
  const cells = calendarCells.value
  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
})

const dayOf = (date) => scheduleStore.dayOf(date)
const isToday = (date) => date === dateStr(today.getFullYear(), today.getMonth() + 1, today.getDate())

const courseOf = (id) => courseStore.courses.find(c => c.id === id)
const courseCapacityLabel = (id) => {
  const c = courseOf(id)
  if (!c) return ''
  const count = c.registrations?.length ?? 0
  return c.maxCapacity ? `${count}/${c.maxCapacity} 人` : `${count} 人`
}
const starsOf = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n))

// ── 自動帶入課程簽到日期 ─────────────────────────────────────
// 課程的 sessionDates 是 "M/D" 字串（不含年份，例如 "6/30"）。目前檢視的
// 月曆本身就知道年份/月份了，所以直接拿 M 對目前檢視月份、D 對當天日期比對，
// 不需要額外猜年份。比對到的課程會自動顯示成唯讀時段（場地/教練留空），
// 使用者點進去補場地/教練並存檔後，才會變成真正寫進 CourseScheduleController
// 的排課紀錄（見 saveSlot），到時候就不會再是 _auto，而是真正的 slot。
const parseMD = (str) => {
  const [m, d] = String(str).split('/').map(s => parseInt(s.trim(), 10))
  return { m, d }
}
const autoSlotsForDate = (date) => {
  if (!date) return []
  const [, m, d] = date.split('-').map(Number)
  const linkedIds = new Set((dayOf(date).slots || []).map(s => s.linkedCourseId).filter(Boolean))
  return courseStore.courses
    .filter(c => !linkedIds.has(c.id))
    .filter(c => (c.sessionDates || []).some(md => {
      const p = parseMD(md)
      return p.m === m && p.d === d
    }))
    .map(c => ({
      id: `auto-${c.id}`,
      venue: '', coach: '', topic: c.name, difficulty: 1,
      linkedCourseId: c.id,
      _auto: true,
    }))
}
const combinedSlotsFor = (date) => date ? [...(dayOf(date).slots || []), ...autoSlotsForDate(date)] : []

// ── 日檢視 Modal ─────────────────────────────────────────────
const dayModal = reactive({ show: false, date: '' })
const openDay = (date) => {
  if (!date) return
  dayModal.date = date
  dayModal.show = true
}
const currentDay = computed(() => dayModal.date
  ? { ...dayOf(dayModal.date), slots: combinedSlotsFor(dayModal.date) }
  : { slots: [], adminTasks: [], promotion: '' })

// ── 時段（slot）編輯 ─────────────────────────────────────────
const VENUE_OPTIONS = ['聖母醫院', '快樂運動館', '聖母農莊']
const slotModal = reactive({ show: false, isNew: true, isAuto: false, editingId: '', saving: false })
const slotForm = reactive({ id: '', venue: '', coach: '', topic: '', difficulty: 1, linkedCourseId: '' })

const openAddSlot = () => {
  slotModal.isNew = true
  slotModal.isAuto = false
  slotModal.editingId = ''
  Object.assign(slotForm, { id: '', venue: '', coach: '', topic: '', difficulty: 1, linkedCourseId: '' })
  slotModal.show = true
}
const openEditSlot = (slot) => {
  slotModal.isNew = false
  slotModal.isAuto = !!slot._auto
  slotModal.editingId = slot._auto ? '' : slot.id
  Object.assign(slotForm, { id: '', venue: slot.venue, coach: slot.coach, topic: slot.topic, difficulty: slot.difficulty, linkedCourseId: slot.linkedCourseId })
  slotModal.show = true
}
const saveSlot = async () => {
  if (!slotForm.topic.trim()) { showToast('請填寫課程主題', true); return }
  const realSlots = [...(dayOf(dayModal.date).slots || [])]
  // 新增，或編輯的是「自動帶入」的唯讀時段（沒有真正存過）→ 存成一筆新的
  if (slotModal.isNew || slotModal.isAuto) {
    realSlots.push({ ...slotForm, id: '' })
  } else {
    const idx = realSlots.findIndex(s => s.id === slotModal.editingId)
    if (idx === -1) realSlots.push({ ...slotForm, id: '' })
    else realSlots[idx] = { ...slotForm, id: slotModal.editingId }
  }

  slotModal.saving = true
  try {
    await scheduleStore.updateSlots(dayModal.date, realSlots)
    showToast('已儲存')
    slotModal.show = false
  } catch {
    showToast('儲存失敗', true)
  } finally {
    slotModal.saving = false
  }
}
const removeSlot = async (slot) => {
  if (slot._auto) return // 自動帶入的沒有實際存檔，沒東西可刪（要移除請去課程本身改簽到日期）
  const realSlots = (dayOf(dayModal.date).slots || []).filter(s => s.id !== slot.id)
  try {
    await scheduleStore.updateSlots(dayModal.date, realSlots)
    showToast('已刪除')
  } catch {
    showToast('操作失敗', true)
  }
}

// ── 行政待辦 ─────────────────────────────────────────────────
const SUGGESTED_TASKS = [
  '【提醒】課程提醒', '【更新】課程照片', '【測量】inbody', '【拍照】簽到單',
  '【完成】inbody數據', '【更新】資料統計', '【發佈】下一期', '下期課程安排',
  '下期課程報名表更新', '下期招生', '這期結束', '【截止】課程報名', '【截止】下一期課程', '【報名】下一期課程',
]
const availableSuggestions = computed(() => {
  const used = new Set((currentDay.value.adminTasks || []).map(t => t.label))
  return SUGGESTED_TASKS.filter(t => !used.has(t))
})
const newTaskLabel = ref('')
const addTask = async (label) => {
  const l = (label ?? newTaskLabel.value).trim()
  if (!l) return
  const tasks = [...(currentDay.value.adminTasks || []), { label: l, done: false }]
  try {
    await scheduleStore.updateAdminTasks(dayModal.date, tasks)
    newTaskLabel.value = ''
  } catch {
    showToast('操作失敗', true)
  }
}
const toggleTask = async (index) => {
  const tasks = currentDay.value.adminTasks.map((t, i) => i === index ? { ...t, done: !t.done } : t)
  try {
    await scheduleStore.updateAdminTasks(dayModal.date, tasks)
  } catch {
    showToast('操作失敗', true)
  }
}
const removeTask = async (index) => {
  const tasks = currentDay.value.adminTasks.filter((_, i) => i !== index)
  try {
    await scheduleStore.updateAdminTasks(dayModal.date, tasks)
  } catch {
    showToast('操作失敗', true)
  }
}

// ── 推廣/曝光 ────────────────────────────────────────────────
const promotionDraft = ref('')
const promotionSaving = ref(false)
watch(() => dayModal.date, (date) => {
  promotionDraft.value = date ? dayOf(date).promotion : ''
})
const savePromotion = async () => {
  promotionSaving.value = true
  try {
    await scheduleStore.updatePromotion(dayModal.date, promotionDraft.value)
    showToast('已儲存')
  } catch {
    showToast('儲存失敗', true)
  } finally {
    promotionSaving.value = false
  }
}

const monthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value} 月`)
const dayNumber = (date) => date ? Number(date.slice(-2)) : ''
</script>

<template>
  <div class="min-h-full" style="background: var(--surface2)">
    <div class="max-w-6xl mx-auto px-4 py-6">
      <NuxtLink
        to="/staff/health-activities/course"
        class="text-sm mb-4 inline-block"
        style="color: var(--text-hint)"
      >
        ← 返回課程列表
      </NuxtLink>

      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 class="text-xl font-bold" style="color: var(--text-base)">課程排課表</h1>
          <p class="text-sm mt-1" style="color: var(--text-hint)">場地／教練／課程主題排班，行政待辦與推廣曝光紀錄</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1.5 rounded-lg border text-sm" style="border-color: var(--border-light); color: var(--text-muted)" @click="prevMonth">‹</button>
          <button class="px-3 py-1.5 rounded-lg border text-sm" style="border-color: var(--border-light); color: var(--text-muted)" @click="goToday">今天</button>
          <span class="font-medium px-2" style="color: var(--text-base)">{{ monthLabel }}</span>
          <button class="px-3 py-1.5 rounded-lg border text-sm" style="border-color: var(--border-light); color: var(--text-muted)" @click="nextMonth">›</button>
        </div>
      </div>

      <div v-if="loading" class="text-center py-16" style="color: var(--text-hint)">載入中…</div>

      <div v-else class="rounded-2xl border overflow-hidden" style="border-color: var(--border-light); background: var(--surface)">
        <div class="grid grid-cols-7" style="border-bottom: 1px solid var(--border-light)">
          <div v-for="w in weekdayLabels" :key="w" class="text-center text-xs py-2 font-medium" style="color: var(--text-hint)">
            週{{ w }}
          </div>
        </div>

        <div v-for="(week, wi) in weeks" :key="wi" class="grid grid-cols-7" :style="wi < weeks.length - 1 ? 'border-bottom: 1px solid var(--border-light)' : ''">
          <div
            v-for="(date, di) in week"
            :key="di"
            class="min-h-[110px] p-1.5 flex flex-col gap-1 cursor-pointer transition"
            :style="[
              di < 6 ? 'border-right: 1px solid var(--border-light)' : '',
              !date ? 'background: var(--surface2); opacity: 0.4' : '',
            ]"
            @click="openDay(date)"
          >
            <template v-if="date">
              <div class="flex items-center justify-between">
                <span
                  class="text-xs w-5 h-5 flex items-center justify-center rounded-full"
                  :style="isToday(date) ? 'background: var(--accent); color: white' : 'color: var(--text-hint)'"
                >
                  {{ dayNumber(date) }}
                </span>
                <span v-if="dayOf(date).promotion" class="text-xs" title="有推廣/曝光備註">📣</span>
              </div>

              <div
                v-for="(slot, si) in combinedSlotsFor(date).slice(0, 3)"
                :key="si"
                class="text-[11px] px-1.5 py-0.5 rounded truncate"
                :style="slot._auto ? 'background: rgba(96,165,250,0.14); color: #60a5fa' : 'background: var(--surface2); color: var(--text-muted)'"
                :title="`${slot.venue} · ${slot.coach} · ${slot.topic}${slot._auto ? '（自動帶入自課程簽到日期）' : ''}`"
              >
                {{ slot.venue?.slice(0, 2) }} {{ slot.topic }}
              </div>
              <div v-if="combinedSlotsFor(date).length > 3" class="text-[11px]" style="color: var(--text-hint)">
                +{{ combinedSlotsFor(date).length - 3 }}
              </div>

              <div v-if="dayOf(date).adminTasks?.length" class="mt-auto text-[11px]" style="color: var(--text-hint)">
                📋 {{ dayOf(date).adminTasks.filter(t => t.done).length }}/{{ dayOf(date).adminTasks.length }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 日檢視 Modal -->
    <div v-if="dayModal.show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto py-8" @click.self="dayModal.show = false">
      <div class="w-full max-w-lg rounded-2xl p-5" style="background: var(--surface)">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold" style="color: var(--text-base)">{{ dayModal.date }}</h2>
          <button style="color: var(--text-hint)" @click="dayModal.show = false">✕</button>
        </div>

        <!-- 時段列表 -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium" style="color: var(--text-muted)">課程時段</span>
            <button class="text-xs px-2 py-1 rounded-lg border" style="border-color: var(--border-light); color: var(--accent)" @click="openAddSlot">
              ＋ 新增時段
            </button>
          </div>
          <div v-if="!currentDay.slots?.length" class="text-xs py-3 text-center" style="color: var(--text-hint)">
            這天還沒有排課
          </div>
          <div v-for="(slot, i) in currentDay.slots" :key="slot.id || i" class="rounded-lg border p-2.5 mb-2 flex items-start justify-between gap-2" style="border-color: var(--border-light)">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate" style="color: var(--text-base)">
                {{ slot.topic }}
                <span class="text-xs" style="color: var(--accent)">{{ starsOf(slot.difficulty) }}</span>
                <span v-if="slot._auto" class="text-[10px] px-1.5 py-0.5 rounded-full" style="background: rgba(96,165,250,0.14); color: #60a5fa">自動帶入</span>
              </div>
              <div class="text-xs mt-0.5" style="color: var(--text-hint)">
                {{ slot.venue || '未設定場地' }} · {{ slot.coach || '未設定教練' }}
              </div>
              <div v-if="slot.linkedCourseId" class="text-xs mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style="background: rgba(96,165,250,0.14); color: #60a5fa">
                🔗 {{ courseOf(slot.linkedCourseId)?.name || '（已刪除課程）' }}
                <span v-if="courseOf(slot.linkedCourseId)">・{{ courseCapacityLabel(slot.linkedCourseId) }}</span>
              </div>
            </div>
            <div class="flex flex-col gap-1 shrink-0">
              <button class="text-xs" style="color: var(--accent)" @click="openEditSlot(slot)">{{ slot._auto ? '補場地/教練' : '編輯' }}</button>
              <button v-if="!slot._auto" class="text-xs text-red-500" @click="removeSlot(slot)">刪除</button>
            </div>
          </div>
        </div>

        <!-- 行政待辦 -->
        <div class="mb-4">
          <span class="text-sm font-medium block mb-2" style="color: var(--text-muted)">行政待辦</span>
          <div v-if="currentDay.adminTasks?.length" class="flex flex-col gap-1 mb-2">
            <label v-for="(t, i) in currentDay.adminTasks" :key="i" class="flex items-center gap-2 text-sm">
              <input type="checkbox" :checked="t.done" @change="toggleTask(i)">
              <span :style="t.done ? 'color: var(--text-hint); text-decoration: line-through' : 'color: var(--text-base)'" class="flex-1">{{ t.label }}</span>
              <button class="text-xs text-red-500" @click="removeTask(i)">✕</button>
            </label>
          </div>
          <div class="flex gap-2 mb-2">
            <input
              v-model="newTaskLabel"
              type="text"
              placeholder="自訂待辦事項"
              class="flex-1 border rounded-lg px-2 py-1.5 text-sm"
              style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
              @keyup.enter="addTask()"
            >
            <button class="text-xs px-3 rounded-lg border" style="border-color: var(--border-light); color: var(--accent)" @click="addTask()">新增</button>
          </div>
          <div v-if="availableSuggestions.length" class="flex flex-wrap gap-1">
            <button
              v-for="s in availableSuggestions"
              :key="s"
              class="text-[11px] px-2 py-1 rounded-full border"
              style="border-color: var(--border-light); color: var(--text-hint)"
              @click="addTask(s)"
            >
              + {{ s }}
            </button>
          </div>
        </div>

        <!-- 推廣/曝光 -->
        <div class="mb-2">
          <span class="text-sm font-medium block mb-2" style="color: var(--text-muted)">推廣／曝光備註</span>
          <textarea
            v-model="promotionDraft"
            rows="2"
            placeholder="例如：阿布運動教室-肌力篇、影片拍攝、客戶回饋…"
            class="w-full border rounded-lg px-3 py-2 text-sm mb-2"
            style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
            @blur="savePromotion"
          />
        </div>
      </div>
    </div>

    <!-- 時段編輯 Modal -->
    <div v-if="slotModal.show" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" @click.self="slotModal.show = false">
      <div class="w-full max-w-sm rounded-2xl p-5" style="background: var(--surface)">
        <h3 class="font-bold mb-3" style="color: var(--text-base)">{{ slotModal.index === -1 ? '新增時段' : '編輯時段' }}</h3>

        <label class="block text-xs mb-1" style="color: var(--text-hint)">場地</label>
        <select v-model="slotForm.venue" class="w-full border rounded-lg px-3 py-2 mb-3 text-sm" style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)">
          <option value="">請選擇</option>
          <option v-for="v in VENUE_OPTIONS" :key="v" :value="v">{{ v }}</option>
        </select>

        <label class="block text-xs mb-1" style="color: var(--text-hint)">教練</label>
        <input v-model="slotForm.coach" type="text" class="w-full border rounded-lg px-3 py-2 mb-3 text-sm" style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)">

        <label class="block text-xs mb-1" style="color: var(--text-hint)">課程主題</label>
        <input v-model="slotForm.topic" type="text" placeholder="例如：基礎肌力、彈力圈肌力" class="w-full border rounded-lg px-3 py-2 mb-3 text-sm" style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)">

        <label class="block text-xs mb-1" style="color: var(--text-hint)">難易度</label>
        <div class="flex gap-2 mb-3">
          <button
            v-for="n in [1,2,3]"
            :key="n"
            type="button"
            class="flex-1 py-1.5 rounded-lg border text-sm"
            :style="slotForm.difficulty === n
              ? 'border-color: var(--accent); background: var(--accent); color: white'
              : 'border-color: var(--border-light); color: var(--text-muted)'"
            @click="slotForm.difficulty = n"
          >
            {{ starsOf(n) }}
          </button>
        </div>

        <label class="block text-xs mb-1" style="color: var(--text-hint)">連動報名課程（選填）</label>
        <select v-model="slotForm.linkedCourseId" class="w-full border rounded-lg px-3 py-2 mb-4 text-sm" style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)">
          <option value="">不連動</option>
          <option v-for="c in courseStore.courses" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>

        <div class="flex gap-2">
          <button class="flex-1 py-2 rounded-lg border text-sm" style="border-color: var(--border-light); color: var(--text-muted)" @click="slotModal.show = false">取消</button>
          <button class="flex-1 py-2 rounded-lg text-sm text-white" style="background: var(--accent)" :disabled="slotModal.saving" @click="saveSlot">
            {{ slotModal.saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="toast.show" class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm text-white z-50" :style="{ background: toast.error ? '#ef4444' : 'var(--accent)' }">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>
