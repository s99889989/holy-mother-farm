<script setup>
  definePageMeta({ layout: 'staff', requiredPermission: 'order.lunch-orders' })
  const commonStore = useCommonStore()
  const LUNCH_BASE = computed(() => commonStore.data.main_url + '/holy/lunch')

  // ── 日曆 ──────────────────────────────────────────────────────────
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
    if (day.date === selectedDate.value) return 'bg-orange-600 text-white font-bold shadow-sm'
    if (day.date === todayStr) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-semibold hover:bg-orange-200'
    return 'text-base-c hover-surface2'
  }

  const prevMonth = () => {
    if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value--
    fetchMarkedDates()
  }
  const nextMonth = () => {
    if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
    fetchMarkedDates()
  }

  const selectDate = async (date) => {
    selectedDate.value = date
    await fetchLunchOrders()
  }

  // ── 便當狀態 ──────────────────────────────────────────────────────
  const LUNCH_STATUSES = ['待確認', '已確認', '已取餐', '客戶提出取消', '已取消']
  const lunchStatusClass = (status) => {
    switch (status) {
      case '已確認':   return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200'
      case '已取餐':   return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200'
      case '客戶提出取消': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200'
      case '已取消':   return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200'
      default:         return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200'
    }
  }

  // ── 便當資料 ──────────────────────────────────────────────────────
  const lunchOrders = ref([])
  const lunchMarkedDates = ref([])

  const lunchModal = reactive({show: false, isNew: true})
  const lForm = reactive({
    id: '', date: '', name: '', phone: '',
    meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, time: '12:00', status: '已確認', note: ''
  })

  const totalMeat = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.meatQty) || 0), 0))
  const totalFullVeg = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.fullVegQty) || 0), 0))
  const totalEggVeg = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.eggVegQty) || 0), 0))
  const totalSpiceVeg = computed(() => lunchOrders.value.reduce((s, o) => s + (Number(o.spiceVegQty) || 0), 0))
  const totalAll = computed(() => totalMeat.value + totalFullVeg.value + totalEggVeg.value + totalSpiceVeg.value)

  const openLunchModal = (order) => {
    lunchModal.isNew = !order
    Object.assign(lForm, order ?? {
      id: '', date: selectedDate.value, name: '', phone: '',
      meatQty: 0, fullVegQty: 0, eggVegQty: 0, spiceVegQty: 0, time: '12:00', status: '已確認', note: ''
    })
    lunchModal.show = true
  }

  const fetchMarkedDates = async () => {
    try {
      const res = await fetch(`${LUNCH_BASE.value}/dates/${yearMonth.value}`)
      if (res.ok) lunchMarkedDates.value = await res.json()
      apiOnline.value = true
    } catch {
      apiOnline.value = false
    }
  }

  const fetchLunchOrders = async () => {
    if (!selectedDate.value) return
    lunchOrders.value = await (await fetch(`${LUNCH_BASE.value}/get/${selectedDate.value}`)).json()
  }

  const saveLunch = async () => {
    if (!lForm.name) return
    if (lunchModal.isNew) {
      const saved = await (await fetch(`${LUNCH_BASE.value}/save`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...lForm, date: selectedDate.value})
      })).json()
      lunchOrders.value.push(saved)
      lunchOrders.value.sort((a, b) => a.time.localeCompare(b.time))
      if (!lunchMarkedDates.value.includes(selectedDate.value)) lunchMarkedDates.value.push(selectedDate.value)
      showToast('便當訂單已新增')
    } else {
      await fetch(`${LUNCH_BASE.value}/update`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(lForm)
      })
      await fetchLunchOrders()
      showToast('便當訂單已更新')
    }
    lunchModal.show = false
  }

  const confirmDeleteLunch = async (o) => {
    if (!confirm(`確定刪除「${o.name}」的便當訂單？`)) return
    await fetch(`${LUNCH_BASE.value}/remove/${o.date}/${o.id}`, {method: 'DELETE'})
    lunchOrders.value = lunchOrders.value.filter(x => x.id !== o.id)
    if (!lunchOrders.value.length) lunchMarkedDates.value = lunchMarkedDates.value.filter(d => d !== selectedDate.value)
    showToast('便當訂單已刪除')
  }

  const toggleLunchStatus = async (o) => {
    const idx = LUNCH_STATUSES.indexOf(o.status)
    const next = LUNCH_STATUSES[(idx + 1) % LUNCH_STATUSES.length]
    await fetch(`${LUNCH_BASE.value}/status/${o.date}/${o.id}?status=${encodeURIComponent(next)}`, {method: 'PATCH'})
    o.status = next
    showToast(`狀態已更新為「${next}」`)
  }

  // ── Toast ─────────────────────────────────────────────────────────
  const toast = reactive({show: false, message: ''})
  const showToast = (msg) => {
    toast.message = msg; toast.show = true
    setTimeout(() => toast.show = false, 2500)
  }

  // ── 初始化 ────────────────────────────────────────────────────────
  onMounted(async () => {
    await fetchMarkedDates()
    selectedDate.value = todayStr
    await fetchLunchOrders()
  })
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">

    <!-- ── 頂部導覽 ── -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            🍱
          </div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">田園餐廳 · 便當管理</h1>
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

        <!-- ── 左欄：日曆 ── -->
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
                <div v-if="day.date && lunchMarkedDates.includes(day.date)" class="absolute bottom-1 flex gap-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-light-c">
              <span class="text-sm text-hint-c">
                <span v-if="selectedDate" class="text-base-c font-medium">{{ selectedDate }}</span>
                <span v-else>請選擇日期</span>
              </span>
              <button @click="selectDate(todayStr)" class="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 font-medium">今天</button>
            </div>
          </div>

          <!-- 當日便當統計卡 -->
          <div v-if="selectedDate" class="mt-3">
            <div class="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 px-4 py-3">
              <p class="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">🍱 便當</p>
              <p class="text-sm text-orange-700 dark:text-orange-300">
                <span class="text-xl font-black">{{ totalAll }}</span> 個
              </p>
              <div v-if="lunchOrders.length > 0" class="mt-1.5 space-y-0.5 text-xs text-orange-700 dark:text-orange-300">
                <div v-if="totalMeat > 0">🍖 葷 <span class="font-semibold">{{ totalMeat }}</span></div>
                <div v-if="totalFullVeg > 0">🌿 全素 <span class="font-semibold">{{ totalFullVeg }}</span></div>
                <div v-if="totalEggVeg > 0">🥚 蛋奶素 <span class="font-semibold">{{ totalEggVeg }}</span></div>
                <div v-if="totalSpiceVeg > 0">🧄 五辛素 <span class="font-semibold">{{ totalSpiceVeg }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ 右欄 ══ -->
        <div class="flex-1 min-w-0">
          <template v-if="selectedDate">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-muted-c text-base sm:text-lg">{{ selectedDate }} 便當明細</h2>
            </div>

            <!-- ── 便當列表 ── -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-hint-c uppercase tracking-widest flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-orange-400"></span> 便當
                  <span v-if="lunchOrders.length > 0" class="text-orange-600 dark:text-orange-400 normal-case font-normal flex flex-wrap gap-x-2">
                    <span v-if="totalMeat > 0">🍖 {{ totalMeat }}</span>
                    <span v-if="totalFullVeg > 0">🌿 {{ totalFullVeg }}</span>
                    <span v-if="totalEggVeg > 0">🥚 {{ totalEggVeg }}</span>
                    <span v-if="totalSpiceVeg > 0">🧄 {{ totalSpiceVeg }}</span>
                  </span>
                </p>
                <button @click="openLunchModal(null)"
                        class="flex items-center gap-1 px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors">
                  <span class="leading-none">+</span> 新增
                </button>
              </div>
              <div class="space-y-2">
                <div v-if="lunchOrders.length === 0"
                     class="bg-surface rounded-xl border border-light-c px-4 py-3 text-center text-hint-c text-sm">
                  今天還沒有便當訂單
                </div>
                <div v-for="order in lunchOrders" :key="order.id"
                     class="bg-surface rounded-xl border border-light-c shadow-sm overflow-hidden">
                  <div class="flex items-stretch">
                    <div class="w-16 flex-shrink-0 bg-orange-50 dark:bg-orange-900/20 flex flex-col items-center justify-center border-r border-orange-100 dark:border-orange-800/30 py-3">
                      <span class="text-xs text-orange-400 uppercase tracking-wide">取餐</span>
                      <span class="text-sm font-black text-orange-700 dark:text-orange-300 leading-tight mt-0.5 text-center">{{ order.time }}</span>
                    </div>
                    <div class="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-base-c">{{ order.name }}</span>
                          <button @click="toggleLunchStatus(order)"
                                  :class="lunchStatusClass(order.status)"
                                  class="px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-colors">
                            {{ order.status }}
                          </button>
                        </div>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
                          <span v-if="order.meatQty > 0" class="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">🍖 葷 {{ order.meatQty }}</span>
                          <span v-if="order.fullVegQty > 0" class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">🌿 全素 {{ order.fullVegQty }}</span>
                          <span v-if="order.eggVegQty > 0" class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">🥚 蛋奶素 {{ order.eggVegQty }}</span>
                          <span v-if="order.spiceVegQty > 0" class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">🧄 五辛素 {{ order.spiceVegQty }}</span>
                        </div>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-hint-c">
                          <span>📞 {{ order.phone }}</span>
                          <span v-if="order.note">💬 {{ order.note }}</span>
                        </div>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <button @click="openLunchModal(order)"
                                class="px-2.5 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">編輯</button>
                        <button @click="confirmDeleteLunch(order)"
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
        </div>
      </div>
    </div>

    <!-- ════════ 便當 Modal ════════ -->
    <div v-if="lunchModal.show"
         class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-base-c">{{ lunchModal.isNew ? '新增便當' : '編輯便當' }}</h3>
          <button @click="lunchModal.show = false" class="text-hint-c hover:text-muted-c p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">姓名 *</label>
            <input v-model="lForm.name" placeholder="訂購人姓名"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">電話</label>
            <input v-model="lForm.phone" placeholder="聯絡電話" type="tel"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">取餐時段</label>
            <input v-model="lForm.time" type="time"
                   class="w-full px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">葷素數量</label>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-red-50 dark:bg-red-900/10 rounded-xl p-2.5 border border-red-200 dark:border-red-800/30">
                <label class="text-xs font-medium text-red-700 dark:text-red-400 block mb-1">🍖 葷食</label>
                <input v-model.number="lForm.meatQty" type="number" min="0"
                       class="w-full bg-surface border border-red-200 dark:border-red-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-center font-bold"/>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🌿 全素</label>
                <input v-model.number="lForm.fullVegQty" type="number" min="0"
                       class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"/>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🥚 蛋奶素</label>
                <input v-model.number="lForm.eggVegQty" type="number" min="0"
                       class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"/>
              </div>
              <div class="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-200 dark:border-green-800/30">
                <label class="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">🧄 五辛素</label>
                <input v-model.number="lForm.spiceVegQty" type="number" min="0"
                       class="w-full bg-surface border border-green-200 dark:border-green-800/50 text-base-c rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-center font-bold"/>
              </div>
            </div>
            <p class="text-xs text-hint-c mt-1.5">合計：{{ (lForm.meatQty||0)+(lForm.fullVegQty||0)+(lForm.eggVegQty||0)+(lForm.spiceVegQty||0) }} 個</p>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">狀態</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="s in LUNCH_STATUSES" :key="s" type="button"
                      @click="lForm.status = s"
                      :class="lForm.status === s ? lunchStatusClass(s) + 'ring-2 ring-offset-1 ring-orange-400' : 'bg-surface2 text-hint-c'"
                      class="px-2.5 py-1 rounded-full text-xs font-medium transition-all">{{ s }}</button>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-c block mb-1">備註</label>
            <textarea v-model="lForm.note" rows="2" placeholder="特殊要求"
                      class="w-full border border-light-c bg-surface text-base-c rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"/>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="lunchModal.show = false"
                  class="flex-1 px-4 py-2.5 text-sm border border-light-c text-muted-c rounded-xl hover:bg-surface2 transition-colors">取消</button>
          <button @click="saveLunch"
                  :disabled="!lForm.name || (lForm.meatQty === 0 && lForm.fullVegQty === 0 && lForm.eggVegQty === 0 && lForm.spiceVegQty === 0)"
                  class="flex-1 px-4 py-2.5 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors">
            {{ lunchModal.isNew ? '新增' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-accent-solid text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
