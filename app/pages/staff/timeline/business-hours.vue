<script setup>
// 「餐廳設定」：時段設定 + 營業設定，訂位（booking-orders）跟便當（bento-orders）共用同一份，
// 這裡是唯一的編輯入口，兩邊管理頁面都只放連結過來，不再各自重複刻一份 UI。
//
// 假設本頁放在 pages/staff/management/restaurant-hours.vue（路由 /staff/management/restaurant-hours），
// 跟既有的 group-itinerary 管理頁同一層；requiredPermission 用的是新權限 key
// 'order.restaurant-settings'，需要在 permissions.yml 幫要能改設定的 group 加上這個權限，
// 否則沒人進得來這頁。如果你們想沿用既有權限（例如 order.booking-orders），把下面這行改掉即可。
definePageMeta({ layout: 'staff', requiredPermission: 'timeline.business-hours' })

const commonStore = useCommonStore()
const PERIOD_BASE = computed(() => commonStore.data.main_url + '/holy/booking/period')
const HOURS_BASE = computed(() => commonStore.data.main_url + '/holy/restaurant/hours')

// ── 24 小時制時間選擇（避免原生 time input 出現上午/下午） ──────────
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
const timePart = (obj, key, part) => computed({
  get: () => {
    const [h, m] = (obj[key] || '00:00').split(':')
    return part === 'h' ? h : m
  },
  set: (v) => {
    const [h, m] = (obj[key] || '00:00').split(':')
    obj[key] = part === 'h' ? `${v}:${m}` : `${h}:${v}`
  }
})

// ── Toast ─────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '' })
const showToast = (msg) => {
  toast.message = msg
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

// ══════════════════════ 時段設定 ══════════════════════
// 例如 11:00–14:00 設定為「午餐」，訂位/便當的用餐時間會自動歸入對應時段
const periods = ref([])
const periodFormEditingId = ref('')
const periodForm = reactive({ id: '', name: '', startTime: '11:00', endTime: '14:00', color: 'orange' })
const periodStartHour = timePart(periodForm, 'startTime', 'h')
const periodStartMinute = timePart(periodForm, 'startTime', 'm')
const periodEndHour = timePart(periodForm, 'endTime', 'h')
const periodEndMinute = timePart(periodForm, 'endTime', 'm')

const PERIOD_COLORS = [
  { key: 'amber', label: '琥珀', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/40' },
  { key: 'orange', label: '橘', class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/40' },
  { key: 'indigo', label: '靛', class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40' },
  { key: 'purple', label: '紫', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/40' },
  { key: 'teal', label: '青', class: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800/40' },
]
const periodColorClass = (colorKey) => (PERIOD_COLORS.find(c => c.key === colorKey) || PERIOD_COLORS[0]).class
const sortedPeriods = computed(() => [...periods.value].sort((a, b) => a.startTime.localeCompare(b.startTime)))

const fetchPeriods = async () => {
  try {
    periods.value = await (await fetch(`${PERIOD_BASE.value}/list`)).json()
  } catch (e) {
    console.error(e)
  }
}

const openPeriodForm = (period) => {
  if (period) Object.assign(periodForm, period)
  else Object.assign(periodForm, { id: '', name: '', startTime: '11:00', endTime: '14:00', color: 'orange' })
  periodFormEditingId.value = period ? period.id : ''
}

const savePeriod = async () => {
  if (!periodForm.name || !periodForm.startTime || !periodForm.endTime) return
  try {
    const saved = await (await fetch(`${PERIOD_BASE.value}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...periodForm })
    })).json()
    const idx = periods.value.findIndex(p => p.id === saved.id)
    if (idx >= 0) periods.value[idx] = saved
    else periods.value.push(saved)
    openPeriodForm(null)
    showToast('時段已儲存')
  } catch {
    showToast('儲存失敗')
  }
}

const deletePeriod = async (id) => {
  if (!confirm('確定刪除此時段？')) return
  try {
    await fetch(`${PERIOD_BASE.value}/remove/${id}`, { method: 'DELETE' })
    periods.value = periods.value.filter(p => p.id !== id)
    if (periodFormEditingId.value === id) openPeriodForm(null)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗')
  }
}

// ══════════════════════ 營業設定 ══════════════════════
// 固定營業星期 / 國定假日公休 / 週六等臨時開放——訂位跟便當共用同一份（RestaurantHoursController）
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const hoursSettings = reactive({ openWeekdays: [1, 2, 3, 4, 5], closedDates: {}, openDates: {} })
const closedDateForm = reactive({ date: '', note: '' })
const openDateForm = reactive({ date: '', note: '' })

const fetchHoursSettings = async () => {
  try {
    const data = await (await fetch(`${HOURS_BASE.value}/get`)).json()
    hoursSettings.openWeekdays = data.openWeekdays || [1, 2, 3, 4, 5]
    hoursSettings.closedDates = data.closedDates || {}
    hoursSettings.openDates = data.openDates || {}
  } catch (e) {
    console.error(e)
  }
}

const toggleOpenWeekday = async (dow) => {
  const next = hoursSettings.openWeekdays.includes(dow)
    ? hoursSettings.openWeekdays.filter(d => d !== dow)
    : [...hoursSettings.openWeekdays, dow].sort((a, b) => a - b)
  try {
    const saved = await (await fetch(`${HOURS_BASE.value}/weekdays`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next)
    })).json()
    hoursSettings.openWeekdays = saved.openWeekdays
    showToast('固定營業日已更新')
  } catch {
    showToast('儲存失敗')
  }
}

const addClosedDate = async () => {
  if (!closedDateForm.date) return
  try {
    const saved = await (await fetch(`${HOURS_BASE.value}/closed-date`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...closedDateForm })
    })).json()
    hoursSettings.closedDates = saved.closedDates
    hoursSettings.openDates = saved.openDates
    Object.assign(closedDateForm, { date: '', note: '' })
    showToast('公休日已新增')
  } catch {
    showToast('新增失敗')
  }
}

const removeClosedDate = async (date) => {
  try {
    const saved = await (await fetch(`${HOURS_BASE.value}/closed-date/${date}`, { method: 'DELETE' })).json()
    hoursSettings.closedDates = saved.closedDates
    showToast('已移除')
  } catch {
    showToast('移除失敗')
  }
}

const addOpenDate = async () => {
  if (!openDateForm.date) return
  try {
    const saved = await (await fetch(`${HOURS_BASE.value}/open-date`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...openDateForm })
    })).json()
    hoursSettings.openDates = saved.openDates
    hoursSettings.closedDates = saved.closedDates
    Object.assign(openDateForm, { date: '', note: '' })
    showToast('臨時開放日已新增')
  } catch {
    showToast('新增失敗')
  }
}

const removeOpenDate = async (date) => {
  try {
    const saved = await (await fetch(`${HOURS_BASE.value}/open-date/${date}`, { method: 'DELETE' })).json()
    hoursSettings.openDates = saved.openDates
    showToast('已移除')
  } catch {
    showToast('移除失敗')
  }
}

const sortedClosedDates = computed(() =>
  Object.entries(hoursSettings.closedDates).sort((a, b) => a[0].localeCompare(b[0])))
const sortedOpenDates = computed(() =>
  Object.entries(hoursSettings.openDates).sort((a, b) => a[0].localeCompare(b[0])))

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(() => {
  fetchPeriods()
  fetchHoursSettings()
})
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <!-- ── 頂部導覽 ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            ⚙️
          </div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">
              田園餐廳 · 餐廳設定
            </h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">
              時段設定與營業設定，訂位、便當共用同一份
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/staff/management/booking-orders"
            class="text-xs px-2.5 py-1.5 rounded-lg hover-surface2 text-hint-c font-medium transition-colors"
          >
            ← 訂位管理
          </NuxtLink>
          <NuxtLink
            to="/staff/management/bento-orders"
            class="text-xs px-2.5 py-1.5 rounded-lg hover-surface2 text-hint-c font-medium transition-colors"
          >
            ← 便當管理
          </NuxtLink>
        </div>
      </div>
    </header>

    <div class="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
      <!-- ══════════════════════ 時段設定 ══════════════════════ -->
      <section class="bg-surface rounded-2xl border border-light-c shadow-sm p-5">
        <h2 class="font-bold text-base-c mb-1">
          ⏱️ 時段設定
        </h2>
        <p class="text-xs text-hint-c mb-4">
          設定用餐時間區間，例如 11:00–14:00 為午餐。訂位、便當管理頁都會用這裡的設定分類顯示。
        </p>

        <div class="space-y-2 mb-4">
          <div
            v-if="sortedPeriods.length === 0"
            class="bg-surface2 rounded-xl px-4 py-3 text-center text-hint-c text-sm"
          >
            尚未設定任何時段
          </div>
          <div
            v-for="p in sortedPeriods"
            :key="p.id"
            class="flex items-center gap-2 bg-surface2 rounded-xl px-3 py-2"
          >
            <span
              class="px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0"
              :class="periodColorClass(p.color)"
            >{{ p.name }}</span>
            <span class="text-sm text-muted-c flex-1 min-w-0">{{ p.startTime }} – {{ p.endTime }}</span>
            <button class="text-xs text-blue-500 hover:text-blue-700 px-1.5 flex-shrink-0" @click="openPeriodForm(p)">
              編輯
            </button>
            <button class="text-xs text-red-400 hover:text-red-600 px-1.5 flex-shrink-0" @click="deletePeriod(p.id)">
              刪除
            </button>
          </div>
        </div>

        <div class="border-t border-light-c pt-4 space-y-3">
          <p class="text-xs font-semibold text-hint-c uppercase tracking-widest">
            {{ periodFormEditingId ? '編輯時段' : '新增時段' }}
          </p>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">名稱 *</label>
            <input
              v-model="periodForm.name"
              placeholder="早餐 / 午餐 / 晚餐…"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400"
            >
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">開始時間 *</label>
              <div class="flex items-center gap-1">
                <select v-model="periodStartHour" class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400">
                  <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="text-muted-c font-medium">:</span>
                <select v-model="periodStartMinute" class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400">
                  <option v-for="m in MINUTE_OPTIONS" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">結束時間 *</label>
              <div class="flex items-center gap-1">
                <select v-model="periodEndHour" class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400">
                  <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="text-muted-c font-medium">:</span>
                <select v-model="periodEndMinute" class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400">
                  <option v-for="m in MINUTE_OPTIONS" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">標籤顏色</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="c in PERIOD_COLORS"
                :key="c.key"
                type="button"
                class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                :class="[periodColorClass(c.key), periodForm.color === c.key ? 'ring-2 ring-offset-1 ring-teal-400' : 'opacity-50']"
                @click="periodForm.color = c.key"
              >
                {{ c.label }}
              </button>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button
              v-if="periodFormEditingId"
              class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors"
              @click="openPeriodForm(null)"
            >
              取消編輯
            </button>
            <button
              :disabled="!periodForm.name || !periodForm.startTime || !periodForm.endTime"
              class="flex-1 px-4 py-2.5 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-50 transition-colors"
              @click="savePeriod"
            >
              {{ periodFormEditingId ? '儲存變更' : '新增時段' }}
            </button>
          </div>
        </div>
      </section>

      <!-- ══════════════════════ 營業設定 ══════════════════════ -->
      <section class="bg-surface rounded-2xl border border-light-c shadow-sm p-5">
        <h2 class="font-bold text-base-c mb-1">
          📅 營業設定
        </h2>
        <p class="text-xs text-hint-c mb-4">
          固定營業星期、國定假日公休、週六等臨時開放——訂位跟便當共用同一份，改這裡兩邊都會生效。
        </p>

        <!-- 固定營業星期 -->
        <div class="mb-5">
          <p class="text-xs font-semibold text-hint-c uppercase tracking-widest mb-2">
            固定營業星期
          </p>
          <p class="text-xs text-hint-c mb-2">
            目前為一~五；未來客人變多可加選「六」改為一~六營業。
          </p>
          <div class="flex gap-1.5">
            <button
              v-for="(label, dow) in WEEKDAY_LABELS"
              :key="dow"
              type="button"
              :class="hoursSettings.openWeekdays.includes(dow)
                ? (dow === 0 || dow === 6 ? 'bg-red-500 text-white border-red-500' : 'bg-teal-700 text-white border-teal-700')
                : 'bg-surface text-hint-c border-light-c'"
              class="flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              @click="toggleOpenWeekday(dow)"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- 臨時開放日（例：週六訂位人數足夠） -->
        <div class="mb-5 border-t border-light-c pt-4">
          <p class="text-xs font-semibold text-hint-c uppercase tracking-widest mb-2">
            臨時開放日
          </p>
          <p class="text-xs text-hint-c mb-2">
            例如某週六訂位人數足夠，評估後開放當天線上訂位／訂購。
          </p>
          <div class="space-y-2 mb-3">
            <div
              v-if="sortedOpenDates.length === 0"
              class="bg-surface2 rounded-xl px-4 py-3 text-center text-hint-c text-sm"
            >
              尚未設定臨時開放日
            </div>
            <div
              v-for="[date, note] in sortedOpenDates"
              :key="date"
              class="flex items-center gap-2 bg-surface2 rounded-xl px-3 py-2"
            >
              <span class="text-sm text-muted-c font-medium flex-shrink-0">{{ date }}</span>
              <span class="text-xs text-hint-c flex-1 min-w-0 truncate">{{ note }}</span>
              <button class="text-xs text-red-400 hover:text-red-600 px-1.5 flex-shrink-0" @click="removeOpenDate(date)">
                移除
              </button>
            </div>
          </div>
          <div class="flex gap-2">
            <input
              v-model="openDateForm.date"
              type="date"
              class="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400"
            >
            <input
              v-model="openDateForm.note"
              placeholder="備註（選填）"
              class="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400"
            >
            <button
              :disabled="!openDateForm.date"
              class="px-3 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-50 transition-colors flex-shrink-0"
              @click="addOpenDate"
            >
              新增
            </button>
          </div>
        </div>

        <!-- 公休日（國定假日、臨時店休…） -->
        <div class="border-t border-light-c pt-4">
          <p class="text-xs font-semibold text-hint-c uppercase tracking-widest mb-2">
            公休日
          </p>
          <p class="text-xs text-hint-c mb-2">
            國定假日或臨時店休，加入後即使是固定營業日也不開放線上訂位／訂購。
          </p>
          <div class="space-y-2 mb-3">
            <div
              v-if="sortedClosedDates.length === 0"
              class="bg-surface2 rounded-xl px-4 py-3 text-center text-hint-c text-sm"
            >
              尚未設定公休日
            </div>
            <div
              v-for="[date, note] in sortedClosedDates"
              :key="date"
              class="flex items-center gap-2 bg-surface2 rounded-xl px-3 py-2"
            >
              <span class="text-sm text-muted-c font-medium flex-shrink-0">{{ date }}</span>
              <span class="text-xs text-hint-c flex-1 min-w-0 truncate">{{ note }}</span>
              <button class="text-xs text-red-400 hover:text-red-600 px-1.5 flex-shrink-0" @click="removeClosedDate(date)">
                移除
              </button>
            </div>
          </div>
          <div class="flex gap-2">
            <input
              v-model="closedDateForm.date"
              type="date"
              class="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400"
            >
            <input
              v-model="closedDateForm.note"
              placeholder="備註（選填，如：中秋節）"
              class="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-teal-400"
            >
            <button
              :disabled="!closedDateForm.date"
              class="px-3 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-50 transition-colors flex-shrink-0"
              @click="addClosedDate"
            >
              新增
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap"
      >
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s, transform 0.3s;
  }

  .fade-enter-from, .fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }
</style>
