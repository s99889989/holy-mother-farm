<script setup>
  definePageMeta({layout: 'staff', requiredPermission: 'order.booking-orders'})
  const commonStore = useCommonStore()
  const BASE = computed(() => commonStore.data.main_url + '/holy/booking')
  const LUNCH_BASE = computed(() => commonStore.data.main_url + '/holy/lunch')
  const PERIOD_BASE = computed(() => commonStore.data.main_url + '/holy/booking/period')
  const GROUP_BASE = computed(() => commonStore.data.main_url + '/holy/group-itinerary')

  // ── 客戶訂位連結 ──────────────────────────────────────────────────
  const CUSTOMER_BOOKING_URL = 'https://holyfarm.netlify.app/front/order/booking'
  const copyCustomerBookingLink = async () => {
    try {
      await navigator.clipboard.writeText(CUSTOMER_BOOKING_URL)
      showToast('連結已複製')
    } catch {
      showToast('複製失敗')
    }
  }
  const openCustomerBookingLink = () => {
    window.open(CUSTOMER_BOOKING_URL, '_blank')
  }

  // 團體行程名稱查表：訂位只存 groupItineraryId，要顯示名稱得另外查一次團體行程清單
  const groupNamesById = ref({})
  const fetchGroupNames = async () => {
    try {
      const list = await (await fetch(`${GROUP_BASE.value}/list`)).json()
      groupNamesById.value = Object.fromEntries((list || []).map(g => [g.id, g.name]))
    } catch { /* 團體行程功能非必要依賴，撈不到就不顯示徽章即可 */ }
  }

  // ── 24 小時制時間選擇（避免原生 time input 出現上午/下午） ──────────
  const HOUR_OPTIONS = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'))
  const MINUTE_OPTIONS = Array.from({length: 12}, (_, i) => String(i * 5).padStart(2, '0'))
  // 給定 reactive 物件與欄位名稱（值為 "HH:mm" 字串），回傳可分別綁定「時」「分」的 computed
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
    if (calMonth.value === 1) {
      calYear.value--;
      calMonth.value = 12
    } else calMonth.value--
    fetchMarkedDates();
    fetchSchedule();
    fetchRecurring()
  }
  const nextMonth = () => {
    if (calMonth.value === 12) {
      calYear.value++;
      calMonth.value = 1
    } else calMonth.value++
    fetchMarkedDates();
    fetchSchedule();
    fetchRecurring()
  }

  const selectDate = async (date) => {
    selectedDate.value = date
    await fetchBookings()
  }

  // ── 訂位狀態 ──────────────────────────────────────────────────────
  const BOOKING_STATUSES = ['待確認', '已確認', '已入位', '客戶提出取消', '已取消']
  const bookingStatusClass = (status) => {
    switch (status) {
      case '已確認':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200'
      case '已入位':
        return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200'
      case '客戶提出取消':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200'
      case '已取消':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200'
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200'
    }
  }

  // ── 時段設定 ──────────────────────────────────────────────────────
  // 例如 11:00–14:00 設定為「午餐」，訂位/包月的用餐時間會自動歸入對應時段
  const periods = ref([]) // [{ id, name, startTime, endTime, color }]
  const periodSettingsOpen = ref(false)
  const periodFormEditingId = ref('')
  const periodForm = reactive({id: '', name: '', startTime: '11:00', endTime: '14:00', color: 'orange'})
  const periodStartHour = timePart(periodForm, 'startTime', 'h')
  const periodStartMinute = timePart(periodForm, 'startTime', 'm')
  const periodEndHour = timePart(periodForm, 'endTime', 'h')
  const periodEndMinute = timePart(periodForm, 'endTime', 'm')

  const PERIOD_COLORS = [
    {
      key: 'amber',
      label: '琥珀',
      class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
    },
    {
      key: 'orange',
      label: '橘',
      class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/40'
    },
    {
      key: 'indigo',
      label: '靛',
      class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40'
    },
    {
      key: 'purple',
      label: '紫',
      class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/40'
    },
    {
      key: 'teal',
      label: '青',
      class: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800/40'
    },
  ]
  const periodColorClass = (colorKey) => (PERIOD_COLORS.find(c => c.key === colorKey) || PERIOD_COLORS[0]).class

  const sortedPeriods = computed(() => [...periods.value].sort((a, b) => a.startTime.localeCompare(b.startTime)))

  // 依 HH:mm 時間字串找出所屬時段（開始時間含、結束時間不含），找不到回傳 null
  const findPeriod = (time) => {
    if (!time) return null
    return sortedPeriods.value.find(p => time >= p.startTime && time < p.endTime) || null
  }

  const fetchPeriods = async () => {
    try {
      periods.value = await (await fetch(`${PERIOD_BASE.value}/list`)).json()
    } catch (e) {
      console.error(e)
    }
  }

  const openPeriodForm = (period) => {
    if (period) Object.assign(periodForm, period)
    else Object.assign(periodForm, {id: '', name: '', startTime: '11:00', endTime: '14:00', color: 'orange'})
    periodFormEditingId.value = period ? period.id : ''
  }

  const savePeriod = async () => {
    if (!periodForm.name || !periodForm.startTime || !periodForm.endTime) return
    try {
      const saved = await (await fetch(`${PERIOD_BASE.value}/save`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...periodForm})
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
      await fetch(`${PERIOD_BASE.value}/remove/${id}`, {method: 'DELETE'})
      periods.value = periods.value.filter(p => p.id !== id)
      if (periodFormEditingId.value === id) openPeriodForm(null)
      showToast('已刪除')
    } catch {
      showToast('刪除失敗')
    }
  }

  // ── 訂位 ──────────────────────────────────────────────────────────
  const bookings = ref([])
  const markedDates = ref([])

  const bookingModal = reactive({show: false, isNew: true})
  const bForm = reactive({
    id: '', date: '', name: '', phone: '', time: '11:30',
    meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, status: '已確認', note: ''
  })
  const bFormHour = timePart(bForm, 'time', 'h')
  const bFormMinute = timePart(bForm, 'time', 'm')

  const openBookingModal = (booking) => {
    bookingModal.isNew = !booking
    Object.assign(bForm, booking ?? {
      id: '', date: selectedDate.value, name: '', phone: '', time: '11:30',
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
    if (!bForm.name || !bForm.date) return
    if (bookingModal.isNew) {
      const saved = await (await fetch(`${BASE.value}/save`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...bForm})
      })).json()
      // 若新增的日期就是目前檢視中的日期，直接把訂位插入清單；否則清單留給下次選到該日期時再撈
      if (saved.date === selectedDate.value) {
        bookings.value.push(saved)
        bookings.value.sort((a, b) => a.time.localeCompare(b.time))
      }
      if (!markedDates.value.includes(saved.date)) markedDates.value.push(saved.date)
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
    return recurringRules.value.filter(r => r.type !== 'lunch'
      && (!r.weekdays || r.weekdays.length === 0 || r.weekdays.includes(dow)))
  })
  const recurBookingGuests = computed(() =>
    todayRecurBooking.value.reduce((s, r) =>
      s + (Number(r.meatQty) || 0) + (Number(r.fullVegQty) || 0) + (Number(r.eggVegQty) || 0) + (Number(r.spiceVegQty) || 0), 0)
  )
  const recurBookingMeat = computed(() => todayRecurBooking.value.reduce((s, r) => s + (Number(r.meatQty) || 0), 0))
  const recurBookingFull = computed(() => todayRecurBooking.value.reduce((s, r) => s + (Number(r.fullVegQty) || 0), 0))
  const recurBookingEgg = computed(() => todayRecurBooking.value.reduce((s, r) => s + (Number(r.eggVegQty) || 0), 0))
  const recurBookingSpice = computed(() => todayRecurBooking.value.reduce((s, r) => s + (Number(r.spiceVegQty) || 0), 0))

  // 依時段彙總當日人數（訂位 + 包月），找不到對應時段者歸類為「未分類」
  const periodSummary = computed(() => {
    const map = new Map()
    const add = (time, qty) => {
      const p = findPeriod(time)
      const key = p ? p.id : '__none__'
      const cur = map.get(key) || {id: key, name: p ? p.name : '未分類', color: p ? p.color : null, count: 0}
      cur.count += qty
      map.set(key, cur)
    }
    for (const b of bookings.value) {
      add(b.time, (Number(b.meatQty) || 0) + (Number(b.fullVegQty) || 0) + (Number(b.eggVegQty) || 0) + (Number(b.spiceVegQty) || 0))
    }
    for (const r of todayRecurBooking.value) {
      add(r.time, (Number(r.meatQty) || 0) + (Number(r.fullVegQty) || 0) + (Number(r.eggVegQty) || 0) + (Number(r.spiceVegQty) || 0))
    }
    return [...map.values()].filter(g => g.count > 0).sort((a, b) => {
      if (a.id === '__none__') return 1
      if (b.id === '__none__') return -1
      return a.name.localeCompare(b.name)
    })
  })

  // ── 當月預定 ──────────────────────────────────────────────────────
  const RECUR_BASE = computed(() => commonStore.data.main_url + '/holy/recurring')
  const recurringRules = ref([])
  const recurModal = reactive({show: false, isNew: true})
  const recurForm = reactive({
    id: '', name: '', type: 'booking', time: '12:00',
    meatQty: 2, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, note: '', weekdays: []
  })
  const recurFormHour = timePart(recurForm, 'time', 'h')
  const recurFormMinute = timePart(recurForm, 'time', 'm')
  const recurExpand = ref({})

  const fetchRecurring = async () => {
    try {
      const ym = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`
      recurringRules.value = await (await fetch(`${RECUR_BASE.value}/list/${ym}`)).json()
    } catch (e) {
      console.error(e)
    }
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
    } catch {
      showToast('儲存失敗')
    }
  }

  const deleteRecurring = async (id) => {
    if (!confirm('確定刪除此預定？')) return
    const ym = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`
    try {
      await fetch(`${RECUR_BASE.value}/remove/${ym}/${id}`, {method: 'DELETE'})
      recurringRules.value = recurringRules.value.filter(r => r.id !== id)
      showToast('已刪除')
    } catch {
      showToast('刪除失敗')
    }
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
    } catch (e) {
      console.error(e)
    }
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
        schedDefault.count = d.count ?? ''
        schedDefault.time = d.time ?? ''
        schedDefault.enabled = d.enabled !== false
        schedNotes.value = data.notes || ''
        schedDayData.value = data.days || {}
      }
      if (bookDates.ok) markedDates.value = await bookDates.json()
      if (recurRes.ok) recurExpand.value = await recurRes.json()
    } catch (e) {
      console.error(e)
    }
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
    } catch {
      showToast('儲存失敗')
    }
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
      else {
        const nd = {...schedDayData.value};
        delete nd[schedModal.date];
        schedDayData.value = nd
      }
      schedModal.show = false;
      showToast('已儲存')
    } catch {
      showToast('儲存失敗')
    }
  }

  const clearSchedDay = async () => {
    try {
      await fetch(`${SCHED_BASE.value}/day/${schedModal.date}`, {method: 'DELETE'})
      const nd = {...schedDayData.value};
      delete nd[schedModal.date];
      schedDayData.value = nd
      schedModal.show = false;
      showToast('已重設為預設')
    } catch {
      showToast('操作失敗')
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────
  const toast = reactive({show: false, message: ''})
  const showToast = (msg) => {
    toast.message = msg;
    toast.show = true
    setTimeout(() => toast.show = false, 2500)
  }

  // ── 初始化 ────────────────────────────────────────────────────────
  onMounted(async () => {
    await Promise.all([fetchMarkedDates(), fetchSchedule(), fetchRecurring(), fetchPeriods()])
    selectedDate.value = todayStr
    await fetchBookings()
    fetchGroupNames()
  })
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <!-- ── 頂部導覽 ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            田
          </div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">
              田園餐廳 · 訂位管理
            </h1>
            <p class="text-xs text-hint-c mt-0.5 hidden sm:block">
              Holy Mother Farm
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover-surface2 text-hint-c font-medium transition-colors"
            title="複製客戶訂位連結"
            @click="copyCustomerBookingLink"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span class="hidden sm:inline">複製客戶訂位連結</span>
          </button>
          <button
            class="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover-surface2 text-hint-c font-medium transition-colors"
            title="開啟客戶訂位頁"
            @click="openCustomerBookingLink"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span class="hidden sm:inline">客戶訂位連結</span>
          </button>
          <button
            class="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover-surface2 text-hint-c font-medium transition-colors"
            @click="periodSettingsOpen = true"
          >
            ⏱️ <span class="hidden sm:inline">時段設定</span>
          </button>
          <span
            :class="apiOnline ? 'text-green-600' : 'text-red-500'"
            class="text-xs flex items-center gap-1.5 font-medium"
          >
            <span
              :class="apiOnline ? 'bg-green-500' : 'bg-red-400'"
              class="w-2 h-2 rounded-full"
            />
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
            <input
              :value="selectedDate"
              type="date"
              class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
              @change="selectDate($event.target.value)"
            >
            <button
              class="px-3 py-2 text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium whitespace-nowrap flex-shrink-0"
              @click="selectDate(todayStr)"
            >
              今天
            </button>
          </div>

          <!-- 桌面版：完整日曆 -->
          <div class="hidden lg:block bg-surface rounded-2xl border border-light-c shadow-sm p-4 lg:sticky lg:top-20">
            <div class="flex items-center justify-between mb-3">
              <button
                class="p-1.5 hover-surface2 rounded-lg transition-colors"
                @click="prevMonth"
              >
                <svg
                  class="w-5 h-5 text-hint-c dark:text-hint-c"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span class="text-base font-semibold text-muted-c">{{ calendarLabel }}</span>
              <button
                class="p-1.5 hover-surface2 rounded-lg transition-colors"
                @click="nextMonth"
              >
                <svg
                  class="w-5 h-5 text-hint-c dark:text-hint-c"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-7 mb-1">
              <div
                v-for="w in ['日', '一', '二', '三', '四', '五', '六']"
                :key="w"
                class="text-center text-sm text-hint-c font-medium py-1"
              >
                {{ w }}
              </div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div
                v-for="(day, idx) in calendarDays"
                :key="idx"
                class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                :class="dayClass(day)"
                @click="day.date && selectDate(day.date)"
              >
                <span>{{ day.label }}</span>
                <div
                  v-if="day.date && markedDates.includes(day.date)"
                  class="absolute bottom-1 flex gap-0.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-red-500"/>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-light-c">
              <span class="text-sm text-hint-c">
                <span
                  v-if="selectedDate"
                  class="text-base-c font-medium"
                >{{ selectedDate }}</span>
                <span v-else>請選擇日期</span>
              </span>
              <button
                class="text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium"
                @click="selectDate(todayStr)"
              >
                今天
              </button>
            </div>
          </div>

          <!-- 當日訂位統計卡 -->
          <div
            v-if="selectedDate"
            class="mt-3"
          >
            <div
              class="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 px-4 py-3">
              <p class="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                🪑 訂位
              </p>
              <p class="text-sm text-green-700 dark:text-green-300">
                <span class="text-xl font-black">{{ bookings.length }}</span> 筆 ·
                <span class="font-semibold">{{ bookingMeat + bookingVeg + recurBookingGuests }}</span> 人
                <span
                  v-if="recurBookingGuests > 0"
                  class="text-xs font-normal opacity-70 ml-1"
                >（含包月 {{ recurBookingGuests }} 人）</span>
              </p>
              <div
                v-if="bookings.length > 0 || recurBookingGuests > 0"
                class="mt-1.5 space-y-0.5 text-xs text-green-700 dark:text-green-300"
              >
                <div v-if="bookingMeat + recurBookingMeat > 0">
                  🍖 葷 <span class="font-semibold">{{ bookingMeat + recurBookingMeat }}</span>
                </div>
                <div v-if="bookings.reduce((s, b) => s+(Number(b.fullVegQty)||0), 0) + recurBookingFull > 0">
                  🌿 全素 <span class="font-semibold">{{
                    bookings.reduce((s, b) => s + (Number(b.fullVegQty) || 0), 0) + recurBookingFull
                  }}</span>
                </div>
                <div v-if="bookings.reduce((s, b) => s+(Number(b.eggVegQty)||0), 0) + recurBookingEgg > 0">
                  🥚 蛋奶素 <span class="font-semibold">{{
                    bookings.reduce((s, b) => s + (Number(b.eggVegQty) || 0), 0) + recurBookingEgg
                  }}</span>
                </div>
                <div v-if="bookings.reduce((s, b) => s+(Number(b.spiceVegQty)||0), 0) + recurBookingSpice > 0">
                  🧄 五辛素 <span class="font-semibold">{{
                    bookings.reduce((s, b) => s + (Number(b.spiceVegQty) || 0), 0) + recurBookingSpice
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ 右欄 ══ -->
        <div class="flex-1 min-w-0">
          <template v-if="selectedDate">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-muted-c text-base sm:text-lg">
                {{ selectedDate }} 訂位明細
              </h2>
            </div>

            <!-- ── 訂位列表 ── -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-hint-c uppercase tracking-widest flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-green-500"/> 訂位
                  <span
                    v-if="bookings.length > 0 || recurBookingGuests > 0"
                    class="text-green-600 dark:text-green-400 normal-case font-normal flex flex-wrap gap-x-2"
                  >
                    <span v-if="bookingMeat + recurBookingMeat > 0">🍖 {{ bookingMeat + recurBookingMeat }}</span>
                    <span v-if="bookings.reduce((s, b) => s+(Number(b.fullVegQty)||0), 0) + recurBookingFull > 0">🌿 {{
                        bookings.reduce((s, b) => s + (Number(b.fullVegQty) || 0), 0) + recurBookingFull
                      }}</span>
                    <span v-if="bookings.reduce((s, b) => s+(Number(b.eggVegQty)||0), 0) + recurBookingEgg > 0">🥚 {{
                        bookings.reduce((s, b) => s + (Number(b.eggVegQty) || 0), 0) + recurBookingEgg
                      }}</span>
                    <span v-if="bookings.reduce((s, b) => s+(Number(b.spiceVegQty)||0), 0) + recurBookingSpice > 0">🧄 {{
                        bookings.reduce((s, b) => s + (Number(b.spiceVegQty) || 0), 0) + recurBookingSpice
                      }}</span>
                  </span>
                </p>
                <button
                  class="flex items-center gap-1 px-3 py-1 bg-green-800 text-white text-xs rounded-lg hover:bg-green-900 transition-colors"
                  @click="openBookingModal(null)"
                >
                  <span class="leading-none">+</span> 新增
                </button>
              </div>
              <!-- 依時段彙總 -->
              <div
                v-if="periodSummary.length > 0"
                class="flex flex-wrap gap-1.5 mb-2"
              >
                <span
                  v-for="g in periodSummary"
                  :key="g.id"
                  class="px-2 py-0.5 rounded-full text-xs font-medium border"
                  :class="g.color ? periodColorClass(g.color) : 'bg-surface2 text-hint-c border-light-c'"
                >
                  {{ g.name }} {{ g.count }}人
                </span>
              </div>
              <div class="space-y-2">
                <div
                  v-if="bookings.length === 0"
                  class="bg-surface rounded-xl border border-light-c px-4 py-3 text-center text-hint-c text-sm"
                >
                  今天還沒有訂位
                </div>
                <div
                  v-for="booking in bookings"
                  :key="booking.id"
                  class="bg-surface rounded-xl border border-light-c shadow-sm overflow-hidden"
                >
                  <div class="flex items-stretch">
                    <div
                      class="w-16 flex-shrink-0 bg-surface2 flex flex-col items-center justify-center border-r border-light-c py-3 gap-0.5">
                      <span class="text-xs text-hint-c uppercase tracking-wide">TIME</span>
                      <span class="text-lg font-black text-muted-c leading-tight mt-0.5">{{ booking.time }}</span>
                      <span
                        v-if="findPeriod(booking.time)"
                        class="text-[10px] leading-none px-1.5 py-0.5 rounded-full border font-medium mt-0.5"
                        :class="periodColorClass(findPeriod(booking.time).color)"
                      >{{ findPeriod(booking.time).name }}</span>
                    </div>
                    <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-base-c">{{ booking.name }}</span>
                          <button
                            :class="bookingStatusClass(booking.status)"
                            class="px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-colors"
                            @click="toggleBookingStatus(booking)"
                          >
                            {{ booking.status }}
                          </button>
                          <NuxtLink
                            v-if="booking.groupItineraryId"
                            :to="`/staff/management/group-itinerary?open=${booking.groupItineraryId}`"
                            class="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 hover:opacity-80 transition-colors"
                          >🧳 {{ groupNamesById[booking.groupItineraryId] || '團體行程' }}</NuxtLink>
                        </div>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-hint-c">
                          <span
                            v-if="booking.meatQty > 0"
                            class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium"
                          >🍖 葷 {{ booking.meatQty }}</span>
                          <span
                            v-if="booking.fullVegQty > 0"
                            class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                          >🌿 全素 {{ booking.fullVegQty }}</span>
                          <span
                            v-if="booking.eggVegQty > 0"
                            class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                          >🥚 蛋奶素 {{ booking.eggVegQty }}</span>
                          <span
                            v-if="booking.spiceVegQty > 0"
                            class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                          >🧄 五辛素 {{ booking.spiceVegQty }}</span>
                        </div>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-hint-c">
                          <span>📞 {{ booking.phone }}</span>
                          <span v-if="booking.note">💬 {{ booking.note }}</span>
                        </div>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <button
                          class="px-2.5 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                          @click="openBookingModal(booking)"
                        >
                          編輯
                        </button>
                        <button
                          class="px-2.5 py-1 text-xs border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors"
                          @click="confirmDeleteBooking(booking)"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div
            v-else
            class="bg-surface rounded-2xl border border-light-c p-12 text-center text-hint-c text-sm shadow-sm"
          >
            請從左側日曆選擇日期
          </div>

          <!-- ── 當月預定 ── -->
          <div class="mt-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold text-hint-c uppercase tracking-widest flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-indigo-400"/>
                當月預定
                <span class="text-hint-c normal-case font-normal">{{ calYear }}年{{ calMonth }}月</span>
              </p>
              <button
                class="flex items-center gap-1 px-3 py-1 bg-green-800 text-white text-xs rounded-lg hover:bg-green-900 transition-colors"
                @click="openRecurModal(null)"
              >
                <span class="leading-none">+</span> 新增
              </button>
            </div>
            <div class="space-y-2">
              <div
                v-if="recurringRules.length === 0"
                class="bg-surface rounded-xl border border-light-c px-4 py-3 text-center text-hint-c text-sm"
              >
                本月尚無預定
              </div>
              <div
                v-for="rule in recurringRules"
                :key="rule.id"
                class="bg-surface rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm overflow-hidden"
              >
                <div class="flex items-stretch">
                  <div
                    class="w-16 flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/20 flex flex-col items-center justify-center border-r border-indigo-100 dark:border-indigo-800/30 py-3 gap-0.5">
                    <span class="text-xs text-indigo-400 uppercase tracking-wide">包月</span>
                    <span
                      class="text-sm font-black text-indigo-600 dark:text-indigo-300 leading-tight mt-0.5 text-center">{{
                        rule.time
                      }}</span>
                    <span
                      v-if="findPeriod(rule.time)"
                      class="text-[10px] leading-none px-1.5 py-0.5 rounded-full border font-medium mt-0.5"
                      :class="periodColorClass(findPeriod(rule.time).color)"
                    >{{ findPeriod(rule.time).name }}</span>
                  </div>
                  <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class="font-bold text-base-c">{{ rule.name }}</span>
                        <span
                          :class="rule.type === 'lunch' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
                          class="px-2 py-0.5 rounded-full text-xs font-medium"
                        >{{ rule.type === 'lunch' ? '便當' : '訂位' }}</span>
                      </div>
                      <div class="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-xs text-hint-c">
                        <span
                          v-if="rule.meatQty > 0"
                          class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium"
                        >🍖 葷 {{ rule.meatQty }}</span>
                        <span
                          v-if="rule.fullVegQty > 0"
                          class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                        >🌿 全素 {{ rule.fullVegQty }}</span>
                        <span
                          v-if="rule.eggVegQty > 0"
                          class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                        >🥚 蛋奶素 {{ rule.eggVegQty }}</span>
                        <span
                          v-if="rule.spiceVegQty > 0"
                          class="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium"
                        >🧄 五辛素 {{ rule.spiceVegQty }}</span>
                        <span
                          v-if="rule.weekdays && rule.weekdays.length > 0"
                          class="flex items-center gap-0.5"
                        >
                          <span
                            v-for="dow in [0, 1, 2, 3, 4, 5, 6]"
                            :key="dow"
                            :class="rule.weekdays.includes(dow)
                              ? (dow === 0 || dow === 6 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')
                              : 'text-base-c dark:text-muted-c'"
                            class="w-5 h-5 rounded text-center leading-5 font-medium"
                          >{{ ['日', '一', '二', '三', '四', '五', '六'][dow] }}</span>
                        </span>
                        <span
                          v-else
                          class="text-hint-c italic"
                        >每天</span>
                        <span
                          v-if="rule.note"
                          class="italic"
                        >{{ rule.note }}</span>
                      </div>
                    </div>
                    <div class="flex gap-1.5 flex-shrink-0">
                      <button
                        class="px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                        @click="openRecurModal(rule)"
                      >
                        編輯
                      </button>
                      <button
                        class="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-400 rounded-lg hover:bg-red-50 transition-colors"
                        @click="deleteRecurring(rule.id)"
                      >
                        刪除
                      </button>
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
    <div
      v-if="bookingModal.show"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
    >
      <div
        class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-base-c">
            {{ bookingModal.isNew ? '新增訂位' : '編輯訂位' }}
          </h3>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="bookingModal.show = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">日期 *</label>
            <input
              v-model="bForm.date"
              type="date"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
            >
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">姓名 *</label>
            <input
              v-model="bForm.name"
              placeholder="訂位人姓名"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
            >
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">電話</label>
            <input
              v-model="bForm.phone"
              placeholder="聯絡電話"
              type="tel"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
            >
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">用餐時段</label>
            <div class="flex items-center gap-2">
              <select
                v-model="bFormHour"
                class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
              >
                <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}</option>
              </select>
              <span class="text-muted-c font-medium">:</span>
              <select
                v-model="bFormMinute"
                class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
              >
                <option v-for="m in MINUTE_OPTIONS" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">葷素數量</label>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-red-50 dark:bg-red-900/10 rounded-xl p-2.5 border border-red-200 dark:border-red-800/30">
                <label class="text-xs font-medium text-red-700 dark:text-red-400 block mb-1">🍖 葷食</label>
                <input
                  v-model.number="bForm.meatQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-red-200 dark:border-red-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-center font-bold"
                >
              </div>
              <div
                class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🌿 全素</label>
                <input
                  v-model.number="bForm.fullVegQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                >
              </div>
              <div
                class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🥚 蛋奶素</label>
                <input
                  v-model.number="bForm.eggVegQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                >
              </div>
              <div
                class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🧄 五辛素</label>
                <input
                  v-model.number="bForm.spiceVegQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                >
              </div>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">狀態</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="s in BOOKING_STATUSES"
                :key="s"
                type="button"
                :class="bForm.status === s ? bookingStatusClass(s) + 'ring-2 ring-offset-1 ring-green-400' : 'bg-surface2 text-hint-c'"
                class="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                @click="bForm.status = s"
              >
                {{ s }}
              </button>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">備註</label>
            <textarea
              v-model="bForm.note"
              rows="2"
              placeholder="特殊要求"
              class="w-full border border-light-c bg-surface text-base-c rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button
            class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="bookingModal.show = false"
          >
            取消
          </button>
          <button
            :disabled="!bForm.name || !bForm.date"
            class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 disabled:opacity-50 transition-colors"
            @click="saveBooking"
          >
            {{ bookingModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ 當月預定 Modal ════════ -->
    <div
      v-if="recurModal.show"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
    >
      <div
        class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-base-c">
              {{ recurModal.isNew ? '新增當月預定' : '編輯當月預定' }}
            </h3>
            <p class="text-xs text-hint-c mt-0.5">
              {{ calYear }}年{{ calMonth }}月
            </p>
          </div>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="recurModal.show = false"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">名稱 / 機構 *</label>
            <input
              v-model="recurForm.name"
              placeholder="員工餐、康樂區…"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
            >
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">類型</label>
            <div class="flex gap-2">
              <button
                :class="recurForm.type === 'booking' ? 'bg-green-700 text-white' : 'bg-surface2 text-hint-c'"
                class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                @click="recurForm.type = 'booking'"
              >
                訂位
              </button>
              <button
                :class="recurForm.type === 'lunch' ? 'bg-orange-500 text-white' : 'bg-surface2 text-hint-c'"
                class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                @click="recurForm.type = 'lunch'"
              >
                便當
              </button>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">用餐時段</label>
            <div class="flex items-center gap-2">
              <select
                v-model="recurFormHour"
                class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
              >
                <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}</option>
              </select>
              <span class="text-muted-c font-medium">:</span>
              <select
                v-model="recurFormMinute"
                class="flex-1 px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
              >
                <option v-for="m in MINUTE_OPTIONS" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">葷素數量</label>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-red-50 dark:bg-red-900/10 rounded-xl p-2.5 border border-red-200 dark:border-red-800/30">
                <label class="text-xs font-medium text-red-700 dark:text-red-400 block mb-1">🍖 葷食</label>
                <input
                  v-model.number="recurForm.meatQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-red-200 dark:border-red-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-center font-bold"
                >
              </div>
              <div
                class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🌿 全素</label>
                <input
                  v-model.number="recurForm.fullVegQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                >
              </div>
              <div
                class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🥚 蛋奶素</label>
                <input
                  v-model.number="recurForm.eggVegQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                >
              </div>
              <div
                class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🧄 五辛素</label>
                <input
                  v-model.number="recurForm.spiceVegQty"
                  type="number"
                  min="0"
                  class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"
                >
              </div>
            </div>
            <p class="text-xs text-hint-c mt-1.5">
              合計：{{
              (recurForm.meatQty || 0) + (recurForm.fullVegQty || 0) + (recurForm.eggVegQty || 0) + (recurForm.spiceVegQty || 0)
              }} 人
            </p>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">備註</label>
            <input
              v-model="recurForm.note"
              placeholder="特殊需求、注意事項…"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
            >
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">
              適用星期 <span class="text-xs text-hint-c font-normal ml-1">（不選代表每天）</span>
            </label>
            <div class="flex gap-1.5">
              <button
                v-for="(label, dow) in ['日', '一', '二', '三', '四', '五', '六']"
                :key="dow"
                type="button"
                :class="recurForm.weekdays.includes(dow)
                  ? (dow === 0 || dow === 6 ? 'bg-red-500 text-white border-red-500' : 'bg-green-700 text-white border-green-700')
                  : 'bg-surface text-hint-c border-light-c'"
                class="flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                @click="recurForm.weekdays.includes(dow) ? recurForm.weekdays.splice(recurForm.weekdays.indexOf(dow), 1) : recurForm.weekdays.push(dow)"
              >
                {{ label }}
              </button>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button
            class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors"
            @click="recurModal.show = false"
          >
            取消
          </button>
          <button
            :disabled="!recurForm.name"
            class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 disabled:opacity-50 transition-colors"
            @click="saveRecurring"
          >
            儲存
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ 時段設定 Modal ════════ -->
    <div
      v-if="periodSettingsOpen"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
    >
      <div
        class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-base-c">
              時段設定
            </h3>
            <p class="text-xs text-hint-c mt-0.5">
              設定用餐時間區間，例如 11:00–14:00 為午餐
            </p>
          </div>
          <button
            class="text-hint-c hover:text-muted-c p-1"
            @click="periodSettingsOpen = false; openPeriodForm(null)"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- 現有時段列表 -->
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
            <button
              class="text-xs text-blue-500 hover:text-blue-700 px-1.5 flex-shrink-0"
              @click="openPeriodForm(p)"
            >
              編輯
            </button>
            <button
              class="text-xs text-red-400 hover:text-red-600 px-1.5 flex-shrink-0"
              @click="deletePeriod(p.id)"
            >
              刪除
            </button>
          </div>
        </div>

        <!-- 新增／編輯表單 -->
        <div class="border-t border-light-c pt-4 space-y-3">
          <p class="text-xs font-semibold text-hint-c uppercase tracking-widest">
            {{ periodFormEditingId ? '編輯時段' : '新增時段' }}
          </p>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">名稱 *</label>
            <input
              v-model="periodForm.name"
              placeholder="早餐 / 午餐 / 晚餐…"
              class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
            >
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">開始時間 *</label>
              <div class="flex items-center gap-1">
                <select
                  v-model="periodStartHour"
                  class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="text-muted-c font-medium">:</span>
                <select
                  v-model="periodStartMinute"
                  class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option v-for="m in MINUTE_OPTIONS" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-muted-c block mb-1">結束時間 *</label>
              <div class="flex items-center gap-1">
                <select
                  v-model="periodEndHour"
                  class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="text-muted-c font-medium">:</span>
                <select
                  v-model="periodEndMinute"
                  class="flex-1 min-w-0 px-1.5 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-green-400"
                >
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
                :class="[periodColorClass(c.key), periodForm.color === c.key ? 'ring-2 ring-offset-1 ring-green-400' : 'opacity-50']"
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
              class="flex-1 px-4 py-2.5 text-sm bg-green-800 text-white rounded-xl hover:bg-green-900 disabled:opacity-50 transition-colors"
              @click="savePeriod"
            >
              {{ periodFormEditingId ? '儲存變更' : '新增時段' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap"
      >
        <svg
          class="w-4 h-4 text-green-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
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
