<script setup>
  definePageMeta({layout: 'staff', requiredPermission: 'staff.home'})

  const commonStore = useCommonStore()
  const HOME_BASE = () => commonStore.data.main_url + '/holy/home'
  const CAL_BASE = () => commonStore.data.main_url + '/holy/calendar'

  const GOOGLE_CALENDAR_ID = 'healthfarmpr@st-mary.org.tw'
  const GOOGLE_API_KEY = 'AIzaSyDJ3AtXgPyYbHWZsHVLWNm9Hkr1gVa2l_k'

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const todayLabel = `${today.getMonth() + 1} 月 ${today.getDate()} 日　${weekDays[today.getDay()]}`

  // ── 功能列表（含所需權限 key）─────────────────────────────────────
  const appGroups = [
    {
      label: '人事',
      items: [
        {to: '/staff/personnel/class-schedule', icon: '📅', label: '假表', key: 'staff.class-schedule', bg: 'bg-sky-500'},
        {to: '/staff/personnel/phone-directory', icon: '📞', label: '電話簿', key: 'staff.phone-directory', bg: 'bg-sky-600'},
        {to: '/staff/personnel/work-manual', icon: '📘', label: '工作手冊', key: 'staff.work-manual', bg: 'bg-sky-700'},
      ]
    },
    {
      label: '列印中心',
      items: [
        {to: '/staff/print/table-card-print', icon: '🪧', label: '桌牌', key: 'staff.table-card-print', bg: 'bg-purple-500'},
        {to: '/staff/print/herbs-label-print', icon: '🏷️', label: '花園 QRCode', key: 'staff.herbs-label-print', bg: 'bg-purple-600'},
      ]
    },
    {
      label: '營運管理',
      items: [
        {to: '/staff/management/daily-menu', icon: '🍽️', label: '每日菜色', key: 'staff.daily-menu', bg: 'bg-orange-500'},
        {to: '/staff/management/calendar', icon: '🗓️', label: '行事曆', key: 'staff.calendar', bg: 'bg-orange-600'},
        {to: '/staff/management/asset', icon: '📦', label: '財產登記', key: 'staff.asset', bg: 'bg-orange-700'},
        {to: '/staff/management/files', icon: '📁', label: '檔案管理', key: 'staff.files', bg: 'bg-amber-600'},
      ]
    },
    {
      label: '訂單管理',
      items: [
        {to: '/staff/order/booking-orders', icon: '🪑', label: '訂位管理', key: 'staff.booking-orders', bg: 'bg-green-600'},
        {to: '/staff/order/lunch-orders', icon: '🍱', label: '便當訂單', key: 'staff.lunch-orders', bg: 'bg-green-700'},
        {to: '/staff/order/soybean-orders', icon: '🥛', label: '豆漿訂單', key: 'staff.soybean-orders', bg: 'bg-green-800'},
        {to: '/staff/order/black-cat-orders', icon: '🚚', label: '黑貓貨單', key: 'staff.black-cat-orders', bg: 'bg-teal-600'},
      ]
    },
    {
      label: '前台內容',
      items: [
        {to: '/staff/content/news', icon: '📢', label: '消息管理', key: 'staff.news', bg: 'bg-rose-500'},
        {to: '/staff/content/product', icon: '🛍️', label: '商品管理', key: 'staff.product', bg: 'bg-rose-600'},
        {to: '/staff/content/production', icon: '🌱', label: '產品訂購', key: 'staff.production', bg: 'bg-rose-700'},
      ]
    },
    {
      label: '工具・系統',
      items: [
        {to: '/staff/stock/cash-count', icon: '💵', label: '點鈔記錄', key: 'staff.cash-count', bg: 'bg-slate-500'},
        {to: '/staff/system/quick-links', icon: '🔗', label: '常用網址', key: 'staff.quick-links', bg: 'bg-slate-600'},
      ]
    },
  ]

  // ── 權限過濾 ──────────────────────────────────────────────────────
  const perm = usePermission()
  const permStore = usePermissionStore()

  // 改用 perms 是否有內容來判斷，而非 loaded flag。
  // 原因：loaded 不 persist，iOS BFCache/App Switcher 回來時 loaded=false，
  // 但 perms 還有 persist 的舊資料，這時用 loaded 判斷會讓功能圖示全消失，
  // 等 API 回來才顯示。改用 hasPerms 讓 perms 有資料就立刻顯示。
  const hasPerms = computed(() => Object.keys(permStore.perms).length > 0)

  const visibleGroups = computed(() => {
    if (!hasPerms.value) return []
    return appGroups
      .map(g => ({...g, items: g.items.filter(i => perm.can(i.key))}))
      .filter(g => g.items.length > 0)
  })

  // ── 今日概況 ──────────────────────────────────────────────────────
  const loading = ref(false)
  const todaySummary = ref(null)
  const todayEvents = ref([])

  const bookings = computed(() => todaySummary.value?.booking?.items ?? [])
  const lunchOrders = computed(() => todaySummary.value?.lunch?.items ?? [])
  const soybeanOrders = computed(() => todaySummary.value?.soybean?.items ?? [])

  const bookingTotal = computed(() => todaySummary.value?.booking?.total ?? 0)
  const bookingMeat = computed(() => todaySummary.value?.booking?.meat ?? 0)
  const bookingVeg = computed(() => todaySummary.value?.booking?.veg ?? 0)
  const lunchTotal = computed(() => todaySummary.value?.lunch?.total ?? 0)
  const lunchMeat = computed(() => todaySummary.value?.lunch?.meat ?? 0)
  const lunchVeg = computed(() => todaySummary.value?.lunch?.veg ?? 0)
  const soybeanSoymilk = computed(() => todaySummary.value?.soybean?.soymilk ?? 0)
  const soybeanTofu = computed(() => todaySummary.value?.soybean?.tofu ?? 0)

  // ── 行事曆顏色 ────────────────────────────────────────────────────
  const calTypeColor = {醫院: '#e0534a', 園區: '#3d6b52', 芳心: '#a06080', Google: '#2563eb'}
  const calChipBg = ev => ev.source === 'google' ? '#dbeafe' : ({
    醫院: '#fee2e2',
    園區: '#dcfce7',
    芳心: '#fce7f3'
  }[ev.type] || '#f0f0f0')
  const calChipText = ev => ev.source === 'google' ? '#1d4ed8' : (calTypeColor[ev.type] || '#555')
  const calBarColor = ev => ev.source === 'google' ? '#2563eb' : (calTypeColor[ev.type] || '#ccc')
  const calBadgeLabel = ev => ev.source === 'google' ? 'Google' : ev.type

  async function fetchToday() {
    loading.value = true
    try {
      const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      const promises = [
        fetch(`${HOME_BASE()}/today`, {credentials: 'include'}),
        fetch(`${CAL_BASE()}/list?yearMonth=${ym}`),
      ]
      let googlePromise = Promise.resolve(null)
      if (GOOGLE_CALENDAR_ID && !GOOGLE_CALENDAR_ID.includes('your-calendar')) {
        const timeMin = encodeURIComponent(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString())
        const timeMax = encodeURIComponent(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString())
        const gUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`
          + `?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=50`
        googlePromise = fetch(gUrl).catch(() => null)
      }
      promises.push(googlePromise)
      const [homeRes, cRes, gRes] = await Promise.all(promises)
      if (homeRes?.ok) todaySummary.value = await homeRes.json()
      const allCal = cRes.ok ? await cRes.json() : []
      const sysEvents = allCal.filter(e => e.date === todayStr)
      let gEvents = []
      if (gRes?.ok) {
        const gData = await gRes.json()
        gEvents = (gData.items || []).map(item => {
          const isAllDay = !!item.start?.date
          const startRaw = isAllDay ? item.start.date : item.start?.dateTime
          const endRaw = isAllDay ? item.end?.date : item.end?.dateTime
          const date = startRaw ? startRaw.slice(0, 10) : ''
          let time = ''
          if (!isAllDay && startRaw) {
            const s = new Date(startRaw)
            const e = endRaw ? new Date(endRaw) : null
            const fmt = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
            time = e ? `${fmt(s)}-${fmt(e)}` : fmt(s)
          }
          return {
            id: item.id, date, time, title: item.summary || '（無標題）',
            allDay: isAllDay,
            type: 'Google', source: 'google', googleLink: item.htmlLink || '', description: item.description || ''
          }
        })
      }
      todayEvents.value = [...sysEvents, ...gEvents].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchToday()
  })
</script>

<template>
  <div class="min-h-screen bg-surface2 transition-colors">

    <header class="bg-surface border-b border-light-c px-4 py-3">
      <div class="max-w-2xl mx-auto flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white flex-shrink-0"
             style="font-size:14px">🌿
        </div>
        <div>
          <h1 class="font-bold text-base-c leading-none" style="font-size:15px">員工專區</h1>
          <p class="text-hint-c mt-0.5" style="font-size:11px">{{ todayLabel }}</p>
        </div>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">

      <!-- ── 今日概況 ── -->
      <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
        <div class="px-4 pt-3 pb-2 border-b border-light-c">
          <span class="font-semibold text-muted-c" style="font-size:13px">今日概況</span>
        </div>
        <div v-if="loading" class="px-4 py-6 text-center text-hint-c" style="font-size:13px">載入中...</div>
        <div v-else-if="bookings.length === 0 && lunchOrders.length === 0 && soybeanOrders.length === 0"
             class="px-4 py-6 text-center text-hint-c" style="font-size:13px">今天尚無訂位或便當記錄
        </div>
        <div v-else class="grid grid-cols-3 divide-x divide-base">
          <!-- 訂位 -->
          <div class="px-4 py-3">
            <div class="flex items-center gap-1.5 mb-2">
              <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"/>
              <span class="font-semibold text-hint-c uppercase tracking-wide" style="font-size:10px">訂位</span>
            </div>
            <div v-if="bookings.length === 0" class="text-hint-c" style="font-size:12px">尚無記錄</div>
            <template v-else>
              <p class="text-base-c" style="font-size:13px">
                <span class="font-black" style="font-size:24px">{{ bookings.length }}</span> 筆
                · <span class="font-semibold">{{ bookingTotal }}</span> 人
              </p>
              <div class="mt-1 space-y-0.5 text-green-600 dark:text-green-400" style="font-size:11px">
                <div v-if="bookingMeat > 0">🍖 葷 {{ bookingMeat }}</div>
                <div v-if="bookingVeg  > 0">🌿 素 {{ bookingVeg }}</div>
              </div>
            </template>
          </div>
          <!-- 便當 -->
          <div class="px-4 py-3">
            <div class="flex items-center gap-1.5 mb-2">
              <span class="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"/>
              <span class="font-semibold text-hint-c uppercase tracking-wide" style="font-size:10px">便當</span>
            </div>
            <div v-if="lunchOrders.length === 0" class="text-hint-c" style="font-size:12px">尚無記錄</div>
            <template v-else>
              <p class="text-base-c" style="font-size:13px">
                <span class="font-black" style="font-size:24px">{{ lunchTotal }}</span> 個
              </p>
              <div class="mt-1 space-y-0.5 text-orange-600 dark:text-orange-400" style="font-size:11px">
                <div v-if="lunchMeat > 0">🍖 葷 {{ lunchMeat }}</div>
                <div v-if="lunchVeg  > 0">🌿 素 {{ lunchVeg }}</div>
              </div>
            </template>
          </div>
          <!-- 豆製品 -->
          <div class="px-4 py-3">
            <div class="flex items-center gap-1.5 mb-2">
              <span class="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"/>
              <span class="font-semibold text-hint-c uppercase tracking-wide" style="font-size:10px">豆製品</span>
            </div>
            <div v-if="soybeanOrders.length === 0" class="text-hint-c" style="font-size:12px">尚無記錄</div>
            <template v-else>
              <p class="text-base-c" style="font-size:13px">
                <span class="font-black" style="font-size:24px">{{ soybeanOrders.length }}</span> 筆
              </p>
              <div class="mt-1 space-y-0.5 text-amber-600 dark:text-amber-400" style="font-size:11px">
                <div v-if="soybeanSoymilk > 0">🥛 豆漿 {{ soybeanSoymilk }} 袋</div>
                <div v-if="soybeanTofu    > 0">🟨 豆腐 {{ soybeanTofu }} 塊</div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- ── 今日行事曆 ── -->
      <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-light-c">
          <span class="font-semibold text-muted-c" style="font-size:13px">今日行事曆</span>
          <NuxtLink to="/staff/management/calendar" class="text-green-700 dark:text-green-400 font-medium"
                    style="font-size:12px">查看全月 →
          </NuxtLink>
        </div>
        <div v-if="loading" class="px-4 py-5 text-center text-hint-c" style="font-size:13px">載入中...</div>
        <div v-else-if="todayEvents.length === 0" class="px-4 py-5 text-center text-hint-c" style="font-size:13px">
          今天沒有排定的活動
        </div>
        <div v-else class="divide-y divide-base">
          <div v-for="(ev, i) in todayEvents" :key="i" class="flex items-start gap-3 px-4 py-3">
            <div class="flex-shrink-0 text-right" style="min-width:42px">
              <span class="font-mono font-semibold text-hint-c"
                    style="font-size:11px">{{ ev.time ? ev.time.split('-')[0] : '' }}</span>
            </div>
            <div class="flex-shrink-0 w-1 self-stretch rounded-full mt-0.5" :style="{ background: calBarColor(ev) }"/>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-base-c leading-snug" style="font-size:13px">{{ ev.title }}</p>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span v-if="ev.owner" class="text-hint-c" style="font-size:11px">👤 {{ ev.owner }}</span>
                <span v-if="ev.room" class="text-hint-c truncate" style="font-size:11px">
                  📍 {{ ev.source === 'google' ? ev.room : ev.room.replace(/^[A-Z0-9]+\s*/, '') }}
                </span>
              </div>
            </div>
            <span class="flex-shrink-0 rounded-full px-2 py-0.5 font-semibold self-start mt-0.5" style="font-size:10px"
                  :style="{ background: calChipBg(ev), color: calChipText(ev) }">
              {{ calBadgeLabel(ev) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── App 功能列表 ── -->
      <div v-if="!hasPerms" class="flex justify-center py-8">
        <div class="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"/>
      </div>
      <template v-else>
        <div v-for="group in visibleGroups" :key="group.label">
          <p class="text-hint-c font-semibold uppercase tracking-widest px-1 mb-2" style="font-size:10px">
            {{ group.label }}
          </p>
          <div class="grid grid-cols-4 gap-3">
            <NuxtLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="app-icon flex flex-col items-center gap-1.5"
            >
              <div :class="item.bg"
                   class="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm app-icon-btn"
                   style="font-size:26px">
                {{ item.icon }}
              </div>
              <span class="text-center text-base-c leading-tight" style="font-size:11px">{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
  .app-icon {
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }

  .app-icon-btn {
    transition: transform 0.12s, opacity 0.12s;
  }

  .app-icon:active .app-icon-btn {
    transform: scale(0.91);
    opacity: 0.85;
  }
</style>
