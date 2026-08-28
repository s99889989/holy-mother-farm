<script setup>
  definePageMeta({ layout: 'staff', requiredPermission: 'catering-kitchen.meal-schedule' })
  const commonStore = useCommonStore()
  const BASE = computed(() => commonStore.data.main_url + '/holy/meal-schedule')

  const apiOnline = ref(false)
  const kitchenMode = ref(false)

  // ── 日曆 ──────────────────────────────────────────────────────────
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const calYear = ref(today.getFullYear())
  const calMonth = ref(today.getMonth() + 1)
  const selectedDate = ref('')

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

  const dayClass = (day) => {
    if (!day.date) return 'cursor-default'
    if (day.date === selectedDate.value) return 'bg-green-700 text-white font-bold shadow-sm'
    if (day.date === todayStr) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold hover:bg-green-200'
    return 'text-base-c hover-surface2'
  }

  const prevMonth = () => { if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value--; }
  const nextMonth = () => { if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++; }
  const selectDate = (date) => { selectedDate.value = date }

  // ── 餐次資料 ──────────────────────────────────────────────────────
  const sessions = ref([])
  const markedDates = computed(() => [...new Set(sessions.value.map(s => s.date))])

  const sessionsForSelectedDate = computed(() =>
    sessions.value
      .filter(s => s.date === selectedDate.value)
      .sort((a, b) => mealOrder(a.mealType) - mealOrder(b.mealType))
  )

  const mealOrder = (t) => {
    const order = { 早餐: 0, 上午點心: 1, 午餐: 2, 下午茶: 3, 晚餐: 4, 宵夜: 5 }
    return order[t] ?? 6
  }

  const mealTypeClass = (t) => {
    if (t === '早餐') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30'
    if (t === '上午點心') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30'
    if (t === '午餐') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/30'
    if (t === '下午茶') return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-200 dark:border-pink-800/30'
    if (t === '晚餐') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30'
    if (t === '宵夜') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/30'
    return 'bg-surface2 text-hint-c'
  }

  const fetchSessions = async () => {
    try {
      sessions.value = await (await fetch(`${BASE.value}/list`)).json()
      apiOnline.value = true
    } catch {
      apiOnline.value = false
    }
  }

  // ── 新增 / 編輯 Modal：簡易模式（日期/餐次/標題/備註）+ 進階模式（份數/菜色/供餐地點/九宮格），預設簡易 ──
  const sessionModal = reactive({ show: false, isNew: true })
  const advancedMode = ref(false)
  const emptyForm = () => ({
    id: '', date: selectedDate.value || todayStr, mealType: '午餐', title: '', note: '',
    totalCount: null, dishes: [], servingPoints: [], boxGrid: []
  })
  const form = reactive(emptyForm())
  const useBoxGrid = ref(false)

  const openCreate = () => {
    sessionModal.isNew = true
    Object.assign(form, emptyForm())
    useBoxGrid.value = false
    advancedMode.value = false
    sessionModal.show = true
  }

  const openEdit = (session) => {
    sessionModal.isNew = false
    Object.assign(form, {
      id: session.id, date: session.date, mealType: session.mealType,
      title: session.title || '', note: session.note || '',
      totalCount: session.totalCount ?? null,
      dishes: (session.dishes || []).map(d => ({ ...d })),
      servingPoints: (session.servingPoints || []).map(sp => ({ ...sp })),
      boxGrid: session.boxGrid && session.boxGrid.length === 9 ? [...session.boxGrid] : []
    })
    useBoxGrid.value = form.boxGrid.length === 9
    advancedMode.value = false
    sessionModal.show = true
  }

  const toggleBoxGrid = () => {
    form.boxGrid = useBoxGrid.value ? Array.from({ length: 9 }, (_, i) => form.boxGrid[i] || '') : []
  }

  const addDish = () => form.dishes.push({ name: '', note: '' })
  const removeDish = (idx) => form.dishes.splice(idx, 1)
  const addServingPoint = () => form.servingPoints.push({ name: '', count: null, lanes: null, note: '' })
  const removeServingPoint = (idx) => form.servingPoints.splice(idx, 1)

  const saveSession = async () => {
    // 簡易模式下不動進階欄位，維持原值一起送出即可（不會因為切回簡易就把已填的進階資料清掉）
    const payload = { ...form, boxGrid: useBoxGrid.value ? form.boxGrid : [] }
    try {
      if (sessionModal.isNew) {
        const saved = await (await fetch(`${BASE.value}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })).json()
        sessions.value.push(saved)
        showToast('餐次已新增')
      } else {
        const saved = await (await fetch(`${BASE.value}/${form.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })).json()
        const idx = sessions.value.findIndex(s => s.id === saved.id)
        if (idx >= 0) sessions.value[idx] = saved
        showToast('餐次已更新')
      }
      sessionModal.show = false
    } catch { showToast('儲存失敗') }
  }

  const confirmDeleteSession = async (session) => {
    if (!confirm(`確定刪除「${session.date} ${session.mealType}」這筆排程？`)) return
    try {
      await fetch(`${BASE.value}/${session.id}`, { method: 'DELETE' })
      sessions.value = sessions.value.filter(s => s.id !== session.id)
      showToast('已刪除')
    } catch { showToast('刪除失敗') }
  }

  // ── Toast ─────────────────────────────────────────────────────────
  const toast = reactive({ show: false, message: '' })
  const showToast = (msg) => {
    toast.message = msg; toast.show = true
    setTimeout(() => toast.show = false, 2500)
  }

  // ── 初始化 ────────────────────────────────────────────────────────
  onMounted(async () => {
    await fetchSessions()
    selectedDate.value = markedDates.value.includes(todayStr) ? todayStr : (markedDates.value[0] || todayStr)
  })
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            餐
          </div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">備餐 / 出餐管理</h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">Holy Mother Farm</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button @click="kitchenMode = !kitchenMode"
                  :class="kitchenMode ? 'bg-green-800 text-white border-green-800' : 'bg-surface text-muted-c border-light-c'"
                  class="text-xs sm:text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors">
            {{ kitchenMode ? '一般檢視' : '廚房大字模式' }}
          </button>
          <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
            <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
            <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
          </span>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="flex flex-col lg:flex-row gap-4 items-start">

        <!-- ── 左欄：日曆（常駐）── -->
        <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <!-- 手機版：僅顯示日期選擇器，不顯示完整日曆 -->
          <div class="lg:hidden bg-surface rounded-2xl border border-light-c shadow-sm p-3 flex items-center gap-2 mb-3">
            <input :value="selectedDate" type="date"
                   class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
                   @change="selectDate($event.target.value)"/>
            <button @click="selectDate(todayStr)"
                    class="px-3 py-2 text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium whitespace-nowrap flex-shrink-0">
              今天
            </button>
          </div>

          <!-- 桌面版：完整日曆 -->
          <div class="hidden lg:block bg-surface rounded-2xl border border-light-c shadow-sm p-4 lg:sticky lg:top-20">
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
              <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                   class="text-center text-sm text-hint-c font-medium py-1">{{ w }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(day, idx) in calendarDays" :key="idx"
                   class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                   :class="dayClass(day)"
                   @click="day.date && selectDate(day.date)">
                <span>{{ day.label }}</span>
                <div v-if="day.date && markedDates.includes(day.date)" class="absolute bottom-1 flex gap-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-light-c">
              <span class="text-sm text-hint-c">
                <span v-if="selectedDate" class="text-base-c font-medium">{{ selectedDate }}</span>
                <span v-else>請選擇日期</span>
              </span>
              <button @click="selectDate(todayStr)" class="text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium">今天</button>
            </div>
          </div>
        </div>

        <!-- ── 右欄：當天餐次 ── -->
        <div class="flex-1 w-full space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-base-c">{{ selectedDate || '—' }}</h2>
            <button @click="openCreate"
                    class="text-sm px-3 py-1.5 rounded-xl bg-green-800 text-white font-medium hover:bg-green-900 transition-colors">
              ＋ 新增餐次
            </button>
          </div>

          <div v-if="!sessionsForSelectedDate.length"
               class="bg-surface rounded-2xl border border-light-c p-8 text-center text-hint-c text-sm">
            這天還沒有排程
          </div>

          <div :class="kitchenMode ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'">
            <div v-for="session in sessionsForSelectedDate" :key="session.id"
                 class="bg-surface rounded-2xl border border-light-c shadow-sm p-4">
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span :class="mealTypeClass(session.mealType)" class="px-2.5 py-0.5 rounded-full text-xs font-medium">{{ session.mealType }}</span>
                  <h3 v-if="session.title" :class="kitchenMode ? 'text-2xl' : 'text-base'" class="font-bold text-base-c">{{ session.title }}</h3>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <button @click="openEdit(session)" class="text-xs px-2 py-1 rounded-lg border border-light-c text-muted-c hover-surface2">編輯</button>
                  <button @click="confirmDeleteSession(session)" class="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">刪除</button>
                </div>
              </div>

              <p v-if="session.totalCount" :class="kitchenMode ? 'text-xl' : 'text-sm'" class="font-semibold text-green-700 dark:text-green-400 mb-1">
                共 {{ session.totalCount }} 份
              </p>
              <p v-if="session.note" :class="kitchenMode ? 'text-lg' : 'text-sm'" class="text-base-c whitespace-pre-wrap leading-relaxed mb-2">{{ session.note }}</p>

              <!-- 九宮格便當 -->
              <div v-if="session.boxGrid && session.boxGrid.length === 9" class="grid grid-cols-3 gap-1.5 mb-2">
                <div v-for="(item, idx) in session.boxGrid" :key="idx"
                     class="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-lg p-2 flex flex-col gap-0.5">
                  <span class="text-[10px] text-hint-c">{{ idx + 1 }}</span>
                  <span :class="kitchenMode ? 'text-base' : 'text-xs'" class="font-medium text-base-c">{{ item }}</span>
                </div>
              </div>

              <!-- 菜色 -->
              <ul v-if="session.dishes && session.dishes.length" class="space-y-1 mb-2">
                <li v-for="(dish, idx) in session.dishes" :key="idx"
                    :class="kitchenMode ? 'text-lg' : 'text-sm'" class="text-base-c border-b border-light-c/60 pb-1 last:border-0">
                  {{ dish.name }}<span v-if="dish.note" class="text-hint-c">（{{ dish.note }}）</span>
                </li>
              </ul>

              <!-- 供餐地點 -->
              <table v-if="session.servingPoints && session.servingPoints.length" class="w-full text-xs mt-1">
                <thead>
                <tr class="text-hint-c">
                  <th class="text-left font-medium py-1">地點</th>
                  <th class="text-left font-medium py-1">人數</th>
                  <th class="text-left font-medium py-1">動線</th>
                  <th class="text-left font-medium py-1">備註</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(sp, idx) in session.servingPoints" :key="idx" class="border-t border-light-c/60">
                  <td :class="kitchenMode ? 'text-base' : ''" class="py-1 text-base-c">{{ sp.name || '—' }}</td>
                  <td :class="kitchenMode ? 'text-base' : ''" class="py-1 text-base-c">{{ sp.count != null ? sp.count + ' 位' : '—' }}</td>
                  <td :class="kitchenMode ? 'text-base' : ''" class="py-1 text-base-c">{{ sp.lanes != null ? sp.lanes + ' 條' : '—' }}</td>
                  <td class="py-1 text-hint-c">{{ sp.note || '' }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ 新增 / 編輯 Modal ════════ -->
    <!-- 比照 home.vue：用 Teleport 掛到 body，避免頁面版型（layout/page transition 等）上層若有 transform，
         導致這個 fixed 疊層定位或主題樣式跑掉 -->
    <Teleport to="body">
      <div v-if="sessionModal.show"
           class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
        <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-base-c">{{ sessionModal.isNew ? '新增餐次' : '編輯餐次' }}</h3>
            <button @click="sessionModal.show = false" class="text-hint-c hover:text-muted-c p-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium text-muted-c block mb-1">日期</label>
                <input v-model="form.date" type="date"
                       class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
              </div>
              <div>
                <label class="text-sm font-medium text-muted-c block mb-1">餐次</label>
                <select v-model="form.mealType"
                        class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
                  <option value="早餐">早餐</option>
                  <option value="上午點心">上午點心</option>
                  <option value="午餐">午餐</option>
                  <option value="下午茶">下午茶</option>
                  <option value="晚餐">晚餐</option>
                  <option value="宵夜">宵夜</option>
                </select>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">標題（選填）</label>
              <input v-model="form.title" type="text" placeholder="不填則顯示餐次名稱"
                     class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
            </div>

            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">備註</label>
              <textarea v-model="form.note" rows="6" style="min-height:140px"
                        placeholder="份數、菜色、供餐地點、動線…想寫什麼都可以"
                        class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400 resize-y"/>
            </div>

            <!-- 簡易／進階切換 -->
            <button type="button" @click="advancedMode = !advancedMode"
                    class="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
              <span>{{ advancedMode ? '▼' : '▶' }}</span>
              進階模式（份數 / 菜色 / 供餐地點 / 九宮格便當）
            </button>

            <div v-if="advancedMode" class="space-y-3 border-t border-light-c pt-3">
              <div>
                <label class="text-sm font-medium text-muted-c block mb-1">總份數</label>
                <input v-model.number="form.totalCount" type="number" min="0"
                       class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
              </div>

              <!-- 菜色 -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-sm font-medium text-muted-c">菜色</label>
                  <button @click="addDish" type="button" class="text-xs text-green-700 dark:text-green-400 font-medium">＋ 新增菜色</button>
                </div>
                <div v-for="(dish, idx) in form.dishes" :key="idx" class="flex gap-2 mb-1.5">
                  <input v-model="dish.name" placeholder="菜名，例如：鹹蛋"
                         class="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
                  <input v-model="dish.note" placeholder="附註，例如：30剖半"
                         class="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
                  <button @click="removeDish(idx)" type="button" class="text-red-500 text-xs px-2">移除</button>
                </div>
              </div>

              <!-- 供餐地點 -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-sm font-medium text-muted-c">供餐地點 / 動線</label>
                  <button @click="addServingPoint" type="button" class="text-xs text-green-700 dark:text-green-400 font-medium">＋ 新增地點</button>
                </div>
                <div v-for="(sp, idx) in form.servingPoints" :key="idx" class="grid grid-cols-[1.4fr_0.7fr_0.7fr_1.2fr_auto] gap-1.5 mb-1.5">
                  <input v-model="sp.name" placeholder="地點"
                         class="px-2 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
                  <input v-model.number="sp.count" type="number" placeholder="人數"
                         class="px-2 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
                  <input v-model.number="sp.lanes" type="number" placeholder="動線"
                         class="px-2 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
                  <input v-model="sp.note" placeholder="備註"
                         class="px-2 py-1.5 text-sm rounded-lg border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
                  <button @click="removeServingPoint(idx)" type="button" class="text-red-500 text-xs">移除</button>
                </div>
              </div>

              <!-- 九宮格便當 -->
              <div>
                <label class="flex items-center gap-2 text-sm font-medium text-muted-c mb-1">
                  <input type="checkbox" v-model="useBoxGrid" @change="toggleBoxGrid" class="accent-green-700"/>
                  使用九宮格便當格式
                </label>
                <div v-if="useBoxGrid" class="grid grid-cols-3 gap-1.5">
                  <input v-for="(item, idx) in form.boxGrid" :key="idx" v-model="form.boxGrid[idx]"
                         :placeholder="`第 ${idx + 1} 格`"
                         class="px-2 py-2 text-sm rounded-lg border border-light-c bg-surface text-base-c text-center outline-none focus:ring-2 focus:ring-green-400"/>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button @click="sessionModal.show = false"
                    class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors">取消</button>
            <button @click="saveSession"
                    class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 transition-colors">
              {{ sessionModal.isNew ? '新增' : '儲存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
  .fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
  .fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
