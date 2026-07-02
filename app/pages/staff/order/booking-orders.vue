<script setup>
  definePageMeta({ layout: 'staff', requiredPermission: 'order.booking-orders' })
  const commonStore = useCommonStore()
  const BASE = computed(() => commonStore.data.main_url + '/holy/booking')
  const LUNCH_BASE = computed(() => commonStore.data.main_url + '/holy/lunch')

  // ── 共用日曆 ──────────────────────────────────────────────────────
  const apiOnline = ref(false)
  const selectedDate = ref('')
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const calYear = ref(today.getFullYear())
  const calMonth = ref(today.getMonth() + 1)

  const calendarLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)
  const yearMonth = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`)

  const calendarDays = computed(() => {
    const firstDay = new Date(calYear.value, calMonth.value - 1, 1).getDay()
    const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push({label: '', date: null})
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(calMonth.value).padStart(2, '0'), dd = String(d).padStart(2, '0')
      days.push({label: d, date: `${calYear.value}-${mm}-${dd}`})
    }
    return days
  })

  const dayClass = (day) => {
    if (!day.date) return 'cursor-default'
    if (day.date === selectedDate.value) return 'bg-green-700 text-white font-bold shadow-sm'
    if (day.date === todayStr) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold hover:bg-green-200'
    return 'text-base-c hover-surface2'
  }

  const prevMonth = () => {
    if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value--
    fetchMarkedDates(); fetchSchedule(); fetchRecurring()
  }
  const nextMonth = () => {
    if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
    fetchMarkedDates(); fetchSchedule(); fetchRecurring()
  }

  const selectDate = async (date) => {
    selectedDate.value = date
    await fetchBookings()
  }

  // ── 訂位狀態 ──────────────────────────────────────────────────────
  const BOOKING_STATUSES = ['待確認', '已確認', '已入位', '客戶提出取消', '已取消']
  const bookingStatusClass = (status) => {
    switch (status) {
      case '已確認':   return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200'
      case '已入位':   return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200'
      case '客戶提出取消': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200'
      case '已取消':   return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200'
      default:         return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200'
    }
  }

  // ── 訂位 ──────────────────────────────────────────────────────────
  const bookings = ref([])
  const markedDates = ref([])
  const timeSlots = ['07:00', '08:00', '11:00', '11:10', '11:20', '11:30', '11:40', '11:45', '11:50', '12:00', '12:10', '12:20', '12:30', '12:40', '12:50', '13:00']

  const bookingModal = reactive({show: false, isNew: true})
  const bForm = reactive({
    id: '', date: '', name: '', phone: '', time: '12:00',
    meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, status: '已確認', note: ''
  })

  const openBookingModal = (booking) => {
    bookingModal.isNew = !booking
    Object.assign(bForm, booking ?? {
      id: '', date: selectedDate.value, name: '', phone: '', time: '12:00',
      meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, status: '已確認', note: ''
    })
    bookingModal.show = true
  }

  const fetchMarkedDates = async () => {
    try {
      const res = await fetch(`${BASE.value}/dates/${yearMonth.value}`)
      if (res.ok) markedDates.value = await res.json()
      apiOnline.value = true
    } catch {
      apiOnline.value = false
    }
  }

  const fetchBookings = async () => {
    if (!selectedDate.value) return
    bookings.value = await (await fetch(`${BASE.value}/get/${selectedDate.value}`)).json()
  }

  const saveBooking = async () => {
    if (!bForm.name) return
    if (bookingModal.isNew) {
      const saved = await (await fetch(`${BASE.value}/save`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...bForm, date: selectedDate.value})
      })).json()
      bookings.value.push(saved)
      bookings.value.sort((a, b) => a.time.localeCompare(b.time))
      if (!markedDates.value.includes(selectedDate.value)) markedDates.value.push(selectedDate.value)
      showToast('訂位已新增')
    } else {
      await fetch(`${BASE.value}/update`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(bForm)
      })
      await fetchBookings()
      showToast('訂位已更新')
    }
    bookingModal.show = false
  }

  const confirmDeleteBooking = async (b) => {
    if (!confirm(`確定刪除「${b.name}」的訂位？`)) return
    await fetch(`${BASE.value}/remove/${b.date}/${b.id}`, {method: 'DELETE'})
    bookings.value = bookings.value.filter(x => x.id !== b.id)
    if (!bookings.value.length) markedDates.value = markedDates.value.filter(d => d !== selectedDate.value)
    showToast('訂位已刪除')
  }

  const toggleBookingStatus = async (b) => {
    const idx = BOOKING_STATUSES.indexOf(b.status)
    const next = BOOKING_STATUSES[(idx + 1) % BOOKING_STATUSES.length]
    await fetch(`${BASE.value}/status/${b.date}/${b.id}?status=${encodeURIComponent(next)}`, {method: 'PATCH'})
    b.status = next
    showToast(`狀態已更新為「${next}」`)
  }

  // ── 訂位人數統計 ──────────────────────────────────────────────────
  const bookingMeat = computed(() => bookings.value.reduce((s, b) => s + (Number(b.meatQty) || 0), 0))
  const bookingVeg = computed(() => bookings.value.reduce((s, b) => s + (Number(b.fullVegQty) || 0) + (Number(b.eggVegQty) || 0) + (Number(b.spiceVegQty) || 0), 0))

  const todayRecurBooking = computed(() => {
    if (!selectedDate.value) return []
    const dow = new Date(selectedDate.value).getDay()
    return recurringRules.value.filter(r => r.type !== 'lunch' &&
      (!r.weekdays || r.weekdays.length === 0 || r.weekdays.includes(dow)))
  })
  const recurBookingGuests = computed(() =>
    todayRecurBooking.value.reduce((s, r) =>
      s + (Number(r.meatQty) || 0) + (Number(r.fullVegQty) || 0) + (Number(r.eggVegQty) || 0) + (Number(r.spiceVegQty) || 0), 0)
  )
  const recurBookingMeat  = computed(() => todayRecurBooking.value.reduce((s, r) => s + (Number(r.meatQty) || 0), 0))
  const recurBookingFull  = computed(() => todayRecurBooking.value.reduce((s, r) => s + (Number(r.fullVegQty) || 0), 0))
  const recurBookingEgg   = computed(() => todayRecurBooking.value.reduce((s, r) => s + (Number(r.eggVegQty) || 0), 0))
  const recurBookingSpice = computed(() => todayRecurBooking.value.reduce((s, r) => s + (Number(r.spiceVegQty) || 0), 0))

  // ── 當月預定 ──────────────────────────────────────────────────────
  const RECUR_BASE = computed(() => commonStore.data.main_url + '/holy/recurring')
  const recurringRules = ref([])
  const recurModal = reactive({show: false, isNew: true})
  const recurForm = reactive({
    id: '', name: '', type: 'booking', time: '12:00',
    meatQty: 2, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, note: '', weekdays: []
  })
  const recurExpand = ref({})

  const fetchRecurring = async () => {
    try {
      const ym = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`
      recurringRules.value = await (await fetch(`${RECUR_BASE.value}/list/${ym}`)).json()
    } catch (e) { console.error(e) }
  }

  const openRecurModal = (rule) => {
    recurModal.isNew = !rule
    if (rule) {
      Object.assign(recurForm, {
        id: rule.id, name: rule.name, type: rule.type || 'booking', time: rule.time || '12:00',
        meatQty: rule.meatQty || 0, fullVegQty: rule.fullVegQty || 0,
        eggVegQty: rule.eggVegQty || 0, spiceVegQty: rule.spiceVegQty || 0,
        note: rule.note || '', weekdays: rule.weekdays ? [...rule.weekdays] : []
      })
    } else {
      Object.assign(recurForm, {
        id: '', name: '', type: 'booking', time: '12:00',
        meatQty: 2, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, note: '', weekdays: []
      })
    }
    recurModal.show = true
  }

  const saveRecurring = async () => {
    if (!recurForm.name) return
    const ym = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`
    try {
      const saved = await (await fetch(`${RECUR_BASE.value}/save/${ym}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...recurForm})
      })).json()
      if (recurModal.isNew) recurringRules.value.push(saved)
      else {
        const idx = recurringRules.value.findIndex(r => r.id === saved.id)
        if (idx >= 0) recurringRules.value[idx] = saved
      }
      recurModal.show = false
      showToast(recurModal.isNew ? '已新增' : '已更新')
    } catch { showToast('儲存失敗') }
  }

  const deleteRecurring = async (id) => {
    if (!confirm('確定刪除此預定？')) return
    const ym = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`
    try {
      await fetch(`${RECUR_BASE.value}/remove/${ym}/${id}`, {method: 'DELETE'})
      recurringRules.value = recurringRules.value.filter(r => r.id !== id)
      showToast('已刪除')
    } catch { showToast('刪除失敗') }
  }

  // ── 行事曆 ────────────────────────────────────────────────────────
  const SCHED_BASE = computed(() => commonStore.data.main_url + '/holy/schedule')
  const schedSettingsOpen = ref(false)
  const schedDefault = reactive({activity: '康樂', count: '', time: '', enabled: true})
  const schedNotes = ref('')
  const schedDayData = ref({})
  const schedModal = reactive({show: false, date: '', data: {}})

  const schedYearMonth = computed(() => `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`)

  const schedDayBookings = ref([])
  const schedDayLunch = ref([])
  const schedSelectedDate = ref('')

  const schedDayRecur = computed(() => {
    if (!schedSelectedDate.value) return []
    const dow = new Date(schedSelectedDate.value).getDay()
    return recurringRules.value.filter(r =>
      !r.weekdays || r.weekdays.length === 0 || r.weekdays.includes(dow))
  })

  const schedDayTotal = computed(() => {
    const bookingGuests = schedDayBookings.value.reduce((s, b) =>
      s + (Number(b.meatQty) || 0) + (Number(b.fullVegQty) || 0) + (Number(b.eggVegQty) || 0) + (Number(b.spiceVegQty) || 0), 0)
    const recurGuests = schedDayRecur.value.reduce((s, r) => s + (Number(r.guests) || 0), 0)
    return bookingGuests + recurGuests
  })

  const selectSchedDate = async (date) => {
    schedSelectedDate.value = date
    try {
      const bRes = await fetch(`${BASE.value}/get/${date}`)
      schedDayBookings.value = bRes.ok ? await bRes.json() : []
    } catch (e) { console.error(e) }
  }

  const fetchSchedule = async () => {
    try {
      const ym = schedYearMonth.value
      const [schedRes, bookDates, recurRes] = await Promise.all([
        fetch(`${SCHED_BASE.value}/get/${ym}`),
        fetch(`${BASE.value}/dates/${ym}`),
        fetch(`${RECUR_BASE.value}/expand/${ym}`)
      ])
      if (schedRes.ok) {
        const data = await schedRes.json()
        const d = data.default || {}
        schedDefault.activity = d.activity ?? '康樂'
        schedDefault.count    = d.count ?? ''
        schedDefault.time     = d.time ?? ''
        schedDefault.enabled  = d.enabled !== false
        schedNotes.value = data.notes || ''
        schedDayData.value = data.days || {}
      }
      if (bookDates.ok) markedDates.value = await bookDates.json()
      if (recurRes.ok)  recurExpand.value = await recurRes.json()
    } catch (e) { console.error(e) }
  }

  const saveSchedDefault = async () => {
    try {
      await fetch(`${SCHED_BASE.value}/default/${schedYearMonth.value}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...schedDefault, notes: schedNotes.value})
      })
      await fetch(`${SCHED_BASE.value}/notes/${schedYearMonth.value}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(schedNotes.value)
      })
      showToast('預設值已儲存')
      schedSettingsOpen.value = false
    } catch { showToast('儲存失敗') }
  }

  const openSchedModal = (day) => {
    const custom = schedDayData.value[day.date] || {}
    schedModal.date = day.date
    schedModal.data = {
      activity: custom.activity || '', count: custom.count || '',
      time: custom.time || '', note: custom.note || '',
      holiday: custom.holiday || '',
      enabled: custom.enabled !== undefined ? custom.enabled : null
    }
    schedModal.show = true
  }

  const saveSchedDay = async () => {
    try {
      await fetch(`${SCHED_BASE.value}/day/${schedModal.date}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...schedModal.data})
      })
      const d = Object.fromEntries(Object.entries({...schedModal.data}).filter(([, v]) => v !== '' && v !== null))
      if (Object.keys(d).length > 0) schedDayData.value = {...schedDayData.value, [schedModal.date]: d}
      else { const nd = {...schedDayData.value}; delete nd[schedModal.date]; schedDayData.value = nd }
      schedModal.show = false; showToast('已儲存')
    } catch { showToast('儲存失敗') }
  }

  const clearSchedDay = async () => {
    try {
      await fetch(`${SCHED_BASE.value}/day/${schedModal.date}`, {method: 'DELETE'})
      const nd = {...schedDayData.value}; delete nd[schedModal.date]; schedDayData.value = nd
      schedModal.show = false; showToast('已重設為預設')
    } catch { showToast('操作失敗') }
  }

  // ── Toast ─────────────────────────────────────────────────────────
  const toast = reactive({show: false, message: ''})
  const showToast = (msg) => {
    toast.message = msg; toast.show = true
    setTimeout(() => toast.show = false, 2500)
  }

  // ── 初始化 ────────────────────────────────────────────────────────
  onMounted(async () => {
    await Promise.all([fetchMarkedDates(), fetchSchedule(), fetchRecurring()])
    selectedDate.value = todayStr
    await fetchBookings()
  })
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            田
          </div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">田園餐廳 · 訂位管理</h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">Holy Mother Farm</p>
          </div>
        </div>
        <span :class="apiOnline ? 'text-green-600' : 'text-red-500'" class="text-xs flex items-center gap-1.5 font-medium">
          <span :class="apiOnline ? 'bg-green-500' : 'bg-red-400'" class="w-2 h-2 rounded-full"></span>
          <span class="hidden sm:inline">{{ apiOnline ? '連線中' : '離線' }}</span>
        </span>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="flex flex-col lg:flex-row gap-4 items-start">

        <!-- ── 左欄：日曆（常駐）── -->
        <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div class="bg-surface rounded-2xl border border-light-c shadow-sm p-4 lg:sticky lg:top-20">
            <div class="flex items-center justify-between mb-3">
              <button @click="prevMonth" class="p-1.5 hover-surface2 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-hint-c dark:text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="text-base font-semibold text-muted-c">{{ calendarLabel }}</span>
              <button @click="nextMonth" class="p-1.5 hover-surface2 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-hint-c dark:text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
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

          <!-- 當日訂位統計卡 -->
          <div v-if="selectedDate" class="mt-3">
            <div class="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 px-4 py-3">
              <p class="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">🪑 訂位</p>
              <p class="text-sm text-green-700 dark:text-green-300">
                <span class="text-xl font-black">{{ bookings.length }}</span> 筆 ·
                <span class="font-semibold">{{ bookingMeat + bookingVeg + recurBookingGuests }}</span> 人
                <span v-if="recurBookingGuests > 0" class="text-xs font-normal opacity-70 ml-1">（含包月 {{ recurBookingGuests }} 人）</span>
              </p>
              <div v-if="bookings.length > 0 || recurBookingGuests > 0" class="mt-1.5 space-y-0.5 text-xs text-green-700 dark:text-green-300">
                <div v-if="bookingMeat + recurBookingMeat > 0">🍖 葷 <span class="font-semibold">{{ bookingMeat + recurBookingMeat }}</span></div>
                <div v-if="bookings.reduce((s,b)=>s+(Number(b.fullVegQty)||0),0) + recurBookingFull > 0">🌿 全素 <span class="font-semibold">{{ bookings.reduce((s,b)=>s+(Number(b.fullVegQty)||0),0) + recurBookingFull }}</span></div>
                <div v-if="bookings.reduce((s,b)=>s+(Number(b.eggVegQty)||0),0) + recurBookingEgg > 0">🥚 蛋奶素 <span class="font-semibold">{{ bookings.reduce((s,b)=>s+(Number(b.eggVegQty)||0),0) + recurBookingEgg }}</span></div>
                <div v-if="bookings.reduce((s,b)=>s+(Number(b.spiceVegQty)||0),0) + recurBookingSpice > 0">🧄 五辛素 <span class="font-semibold">{{ bookings.reduce((s,b)=>s+(Number(b.spiceVegQty)||0),0) + recurBookingSpice }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ 右欄 ══ -->
        <div class="flex-1 min-w-0">
          <template v-if="selectedDate">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-muted-c text-base sm:text-lg">{{ selectedDate }} 訂位明細</h2>
            </div>

            <!-- ── 訂位列表 ── -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-hint-c uppercase tracking-widest flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-green-500"></span> 訂位
                  <span v-if="bookings.length > 0 || recurBookingGuests > 0" class="text-green-600 dark:text-green-400 normal-case font-normal flex flex-wrap gap-x-2">
                    <span v-if="bookingMeat + recurBookingMeat > 0">🍖 {{ bookingMeat + recurBookingMeat }}</span>
                    <span v-if="bookings.reduce((s,b)=>s+(Number(b.fullVegQty)||0),0) + recurBookingFull > 0">🌿 {{ bookings.reduce((s,b)=>s+(Number(b.fullVegQty)||0),0) + recurBookingFull }}</span>
                    <span v-if="bookings.reduce((s,b)=>s+(Number(b.eggVegQty)||0),0) + recurBookingEgg > 0">🥚 {{ bookings.reduce((s,b)=>s+(Number(b.eggVegQty)||0),0) + recurBookingEgg }}</span>
                    <span v-if="bookings.reduce((s,b)=>s+(Number(b.spiceVegQty)||0),0) + recurBookingSpice > 0">🧄 {{ bookings.reduce((s,b)=>s+(Number(b.spiceVegQty)||0),0) + recurBookingSpice }}</span>
                  </span>
                </p>
                <button @click="openBookingModal(null)"
                        class="flex items-center gap-1 px-3 py-1 bg-green-800 text-white text-xs rounded-lg hover:bg-green-900 transition-colors">
                  <span class="leading-none">+</span> 新增
                </button>
              </div>
              <div class="space-y-2">
                <div v-if="bookings.length === 0"
                     class="bg-surface rounded-xl border border-light-c px-4 py-3 text-center text-hint-c text-sm">
                  今天還沒有訂位
                </div>
                <div v-for="booking in bookings" :key="booking.id"
                     class="bg-surface rounded-xl border border-light-c shadow-sm overflow-hidden">
                  <div class="flex items-stretch">
                    <div class="w-16 flex-shrink-0 bg-surface2 flex flex-col items-center justify-center border-r border-light-c py-3">
                      <span class="text-xs text-hint-c uppercase tracking-wide">TIME</span>
                      <span class="text-lg font-black text-muted-c leading-tight mt-0.5">{{ booking.time }}</span>
                    </div>
                    <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-base-c">{{ booking.name }}</span>
                          <button @click="toggleBookingStatus(booking)"
                                  :class="bookingStatusClass(booking.status)"
                                  class="px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-colors">
                            {{ booking.status }}
                          </button>
                        </div>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-hint-c">
                          <span v-if="booking.meatQty > 0" class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">🍖 葷 {{ booking.meatQty }}</span>
                          <span v-if="booking.fullVegQty > 0" class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">🌿 全素 {{ booking.fullVegQty }}</span>
                          <span v-if="booking.eggVegQty > 0" class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">🥚 蛋奶素 {{ booking.eggVegQty }}</span>
                          <span v-if="booking.spiceVegQty > 0" class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">🧄 五辛素 {{ booking.spiceVegQty }}</span>
                        </div>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-hint-c">
                          <span>📞 {{ booking.phone }}</span>
                          <span v-if="booking.note">💬 {{ booking.note }}</span>
                        </div>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <button @click="openBookingModal(booking)"
                                class="px-2.5 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">編輯</button>
                        <button @click="confirmDeleteBooking(booking)"
                                class="px-2.5 py-1 text-xs border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors">刪除</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="bg-surface rounded-2xl border border-light-c p-12 text-center text-hint-c text-sm shadow-sm">
            請從左側日曆選擇日期
          </div>

          <!-- ── 當月預定 ── -->
          <div class="mt-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold text-hint-c uppercase tracking-widest flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
                當月預定
                <span class="text-hint-c normal-case font-normal">{{ calYear }}年{{ calMonth }}月</span>
              </p>
              <button @click="openRecurModal(null)"
                      class="flex items-center gap-1 px-3 py-1 bg-green-800 text-white text-xs rounded-lg hover:bg-green-900 transition-colors">
                <span class="leading-none">+</span> 新增
              </button>
            </div>
            <div class="space-y-2">
              <div v-if="recurringRules.length === 0"
                   class="bg-surface rounded-xl border border-light-c px-4 py-3 text-center text-hint-c text-sm">
                本月尚無預定
              </div>
              <div v-for="rule in recurringRules" :key="rule.id"
                   class="bg-surface rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm overflow-hidden">
                <div class="flex items-stretch">
                  <div class="w-16 flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/20 flex flex-col items-center justify-center border-r border-indigo-100 dark:border-indigo-800/30 py-3">
                    <span class="text-xs text-indigo-400 uppercase tracking-wide">包月</span>
                    <span class="text-sm font-black text-indigo-600 dark:text-indigo-300 leading-tight mt-0.5 text-center">{{ rule.time }}</span>
                  </div>
                  <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class="font-bold text-base-c">{{ rule.name }}</span>
                        <span :class="rule.type === 'lunch' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
                              class="px-2 py-0.5 rounded-full text-xs font-medium">{{ rule.type === 'lunch' ? '便當' : '訂位' }}</span>
                      </div>
                      <div class="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-xs text-hint-c">
                        <span v-if="rule.meatQty > 0" class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">🍖 葷 {{ rule.meatQty }}</span>
                        <span v-if="rule.fullVegQty > 0" class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">🌿 全素 {{ rule.fullVegQty }}</span>
                        <span v-if="rule.eggVegQty > 0" class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">🥚 蛋奶素 {{ rule.eggVegQty }}</span>
                        <span v-if="rule.spiceVegQty > 0" class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">🧄 五辛素 {{ rule.spiceVegQty }}</span>
                        <span v-if="rule.weekdays && rule.weekdays.length > 0" class="flex items-center gap-0.5">
                          <span v-for="dow in [0,1,2,3,4,5,6]" :key="dow"
                                :class="rule.weekdays.includes(dow)
 ? (dow === 0 || dow === 6 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')
 : 'text-base-c dark:text-muted-c'"
                                class="w-5 h-5 rounded text-center leading-5 font-medium">{{ ['日','一','二','三','四','五','六'][dow] }}</span>
                        </span>
                        <span v-else class="text-hint-c italic">每天</span>
                        <span v-if="rule.note" class="italic">{{ rule.note }}</span>
                      </div>
                    </div>
                    <div class="flex gap-1.5 flex-shrink-0">
                      <button @click="openRecurModal(rule)" class="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">編輯</button>
                      <button @click="deleteRecurring(rule.id)" class="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors">刪除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ════════ 訂位 Modal ════════ -->
    <div v-if="bookingModal.show"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-base-c">{{ bookingModal.isNew ? '新增訂位' : '編輯訂位' }}</h3>
          <button @click="bookingModal.show = false" class="text-hint-c hover:text-muted-c p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">姓名 *</label>
            <input v-model="bForm.name" placeholder="訂位人姓名"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">電話</label>
            <input v-model="bForm.phone" placeholder="聯絡電話" type="tel"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">用餐時段</label>
            <select v-model="bForm.time"
                    class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
              <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">葷素數量</label>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-red-50 dark:bg-red-900/10 rounded-xl p-2.5 border border-red-200 dark:border-red-800/30">
                <label class="text-xs font-medium text-red-700 dark:text-red-400 block mb-1">🍖 葷食</label>
                <input v-model.number="bForm.meatQty" type="number" min="0"
                       class="w-full bg-surface border border-red-200 dark:border-red-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-center font-bold"/>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🌿 全素</label>
                <input v-model.number="bForm.fullVegQty" type="number" min="0"
                       class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"/>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🥚 蛋奶素</label>
                <input v-model.number="bForm.eggVegQty" type="number" min="0"
                       class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"/>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🧄 五辛素</label>
                <input v-model.number="bForm.spiceVegQty" type="number" min="0"
                       class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"/>
              </div>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">狀態</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="s in BOOKING_STATUSES" :key="s" type="button"
                      @click="bForm.status = s"
                      :class="bForm.status === s ? bookingStatusClass(s) + 'ring-2 ring-offset-1 ring-green-400' : 'bg-surface2 text-hint-c'"
                      class="px-2.5 py-1 rounded-full text-xs font-medium transition-all">{{ s }}</button>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">備註</label>
            <textarea v-model="bForm.note" rows="2" placeholder="特殊要求"
                      class="w-full border border-light-c bg-surface text-base-c rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"/>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="bookingModal.show = false"
                  class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors">取消</button>
          <button @click="saveBooking" :disabled="!bForm.name"
                  class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 disabled:opacity-50 transition-colors">
            {{ bookingModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ 當月預定 Modal ════════ -->
    <div v-if="recurModal.show"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-base-c">{{ recurModal.isNew ? '新增當月預定' : '編輯當月預定' }}</h3>
            <p class="text-xs text-hint-c mt-0.5">{{ calYear }}年{{ calMonth }}月</p>
          </div>
          <button @click="recurModal.show = false" class="text-hint-c hover:text-muted-c p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">名稱 / 機構 *</label>
            <input v-model="recurForm.name" placeholder="員工餐、康樂區…"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">類型</label>
            <div class="flex gap-2">
              <button @click="recurForm.type = 'booking'"
                      :class="recurForm.type === 'booking' ? 'bg-green-700 text-white' : 'bg-surface2 text-hint-c'"
                      class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors">訂位</button>
              <button @click="recurForm.type = 'lunch'"
                      :class="recurForm.type === 'lunch' ? 'bg-orange-500 text-white' : 'bg-surface2 text-hint-c'"
                      class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors">便當</button>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">用餐時段</label>
            <select v-model="recurForm.time"
                    class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400">
              <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">葷素數量</label>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-red-50 dark:bg-red-900/10 rounded-xl p-2.5 border border-red-200 dark:border-red-800/30">
                <label class="text-xs font-medium text-red-700 dark:text-red-400 block mb-1">🍖 葷食</label>
                <input v-model.number="recurForm.meatQty" type="number" min="0"
                       class="w-full bg-surface border border-red-200 dark:border-red-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-center font-bold"/>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🌿 全素</label>
                <input v-model.number="recurForm.fullVegQty" type="number" min="0"
                       class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"/>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🥚 蛋奶素</label>
                <input v-model.number="recurForm.eggVegQty" type="number" min="0"
                       class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"/>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🧄 五辛素</label>
                <input v-model.number="recurForm.spiceVegQty" type="number" min="0"
                       class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"/>
              </div>
            </div>
            <p class="text-xs text-hint-c mt-1.5">合計：{{ (recurForm.meatQty||0)+(recurForm.fullVegQty||0)+(recurForm.eggVegQty||0)+(recurForm.spiceVegQty||0) }} 人</p>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">備註</label>
            <input v-model="recurForm.note" placeholder="特殊需求、注意事項…"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">
              適用星期 <span class="text-xs text-hint-c font-normal ml-1">（不選代表每天）</span>
            </label>
            <div class="flex gap-1.5">
              <button v-for="(label, dow) in ['日','一','二','三','四','五','六']" :key="dow" type="button"
                      @click="recurForm.weekdays.includes(dow) ? recurForm.weekdays.splice(recurForm.weekdays.indexOf(dow),1) : recurForm.weekdays.push(dow)"
                      :class="recurForm.weekdays.includes(dow)
 ? (dow === 0 || dow === 6 ? 'bg-red-500 text-white border-red-500' : 'bg-green-700 text-white border-green-700')
 : 'bg-surface text-hint-c border-light-c'"
                      class="flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors">{{ label }}</button>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="recurModal.show = false"
                  class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors">取消</button>
          <button @click="saveRecurring" :disabled="!recurForm.name"
                  class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 disabled:opacity-50 transition-colors">儲存</button>
        </div>
      </div>
    </div>

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
