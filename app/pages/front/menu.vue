<script setup>
useSiteHead()

const commonStore = useCommonStore()
const BASE       = commonStore.data.main_url + '/holy/menu'
const API_ORIGIN = commonStore.data.main_url

const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return API_ORIGIN + path
}
const thumbUrl = (path) => {
  if (!path) return ''
  const full = path.startsWith('http') ? path : API_ORIGIN + path
  return full.replace('/holy/menu/image/', '/holy/menu/image/thumb/')
}

// ── 分類設定 ──────────────────────────────────────────────────────
const DIET_BADGE = {
  '葷食':       'bg-red-100 text-red-600',
  '素食':       'bg-green-100 text-green-700',
  '五辛素':     'bg-yellow-100 text-yellow-700',
  '蛋奶素':     'bg-sky-100 text-sky-700',
  '五辛蛋奶素': 'bg-purple-100 text-purple-700',
}
const sections = [
  { type: 'dish',      label: '菜', icon: '🥗', badge: 'bg-amber-100 text-amber-700',  placeholder: '菜名…' },
  { type: 'soup',      label: '湯', icon: '🍲', badge: 'bg-blue-100 text-blue-700',    placeholder: '湯名…' },
  { type: 'tea',       label: '茶', icon: '🍵', badge: 'bg-green-100 text-green-700',  placeholder: '茶名…' },
  { type: 'salad_bar', label: '沙拉霸', icon: '🥙', badge: 'bg-lime-100 text-lime-700', placeholder: '沙拉霸名稱…' },
]

// ── 狀態 ──────────────────────────────────────────────────────────
const menuItems      = ref([])
const dateStatus     = ref({})
const weekItemsMap   = ref({})
const previewUrl     = ref('')
const loading        = ref(true)
const apiOnline      = ref(false)

const today    = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

// ── 單日模式 ──────────────────────────────────────────────────────
const mainCol  = ref(null)
const hasPrev  = ref(false)
const hasNext  = ref(false)

// ── 日期瀏覽 ─────────────────────────────────────────────────────
const anchorDate   = ref(todayStr)
const visibleDates = ref([])

const currentDay = computed(() => {
  const date = visibleDates.value[0] || anchorDate.value
  return { date, weekLabel: WEEK_LABELS[new Date(date).getDay()] }
})

const pickSlotItem = (slotItems) => {
  const sorted = [...slotItems].sort((a, b) => a.id.localeCompare(b.id))
  return sorted.find(i => i.isFirst === true) ?? sorted[0]
}

const itemsByTypeForDate = (date, type) => {
  const items = (weekItemsMap.value[date] || [])
    .filter(i => i.type === type && ((i.name && i.name.trim() !== '') || (i.images && i.images.length > 0)))
  const slotMap = {}
  for (const item of items) {
    const slot = item.slot || 1
    if (!slotMap[slot]) slotMap[slot] = []
    slotMap[slot].push(item)
  }
  const result = []
  for (const slot of Object.keys(slotMap).map(Number).sort()) {
    slotMap[slot].sort((a, b) => a.id.localeCompare(b.id))
      .forEach((item, idx) => result.push({ ...item, isFirst: idx === 0 }))
  }
  return result
}

// 沙拉霸：每個 slot 取代表圖，展開所有圖片
const saladBarImages = (date) => {
  const all = (weekItemsMap.value[date] || [])
    .filter(i => i.type === 'salad_bar' && i.images && i.images.length > 0)
  const slotMap = {}
  for (const item of all) {
    const slot = item.slot || 1
    if (!slotMap[slot]) slotMap[slot] = []
    slotMap[slot].push(item)
  }
  const imgs = []
  for (const slot of Object.keys(slotMap).map(Number).sort()) {
    const pick = pickSlotItem(slotMap[slot])
    if (pick) imgs.push(...(pick.images || []))
  }
  return imgs
}

const fetchDatesStatus = async (ym) => {
  try {
    const status = await (await fetch(`${BASE}/dates/${ym}`)).json()
    dateStatus.value = { ...dateStatus.value, ...status }
    apiOnline.value = true
  } catch { apiOnline.value = false }
}

const findDatesWithData = async (startDate, direction, count) => {
  const result = []
  const d = new Date(startDate)
  const loadedMonths = new Set()
  for (let i = 0; i < 365 && result.length < count; i++) {
    const yyyy = d.getFullYear()
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const dd   = String(d.getDate()).padStart(2, '0')
    const date = `${yyyy}-${mm}-${dd}`
    const ym   = `${yyyy}-${mm}`
    if (!loadedMonths.has(ym)) {
      loadedMonths.add(ym)
      await fetchDatesStatus(ym)
    }
    if (dateStatus.value[date]) result.push(date)
    d.setDate(d.getDate() + direction)
  }
  return result
}

const fetchItemsForDates = async (dates) => {
  await Promise.all(dates.map(async (date) => {
    if (weekItemsMap.value[date] !== undefined) return
    try {
      const items = await (await fetch(`${BASE}/get/${date}`)).json()
      weekItemsMap.value[date] = items.filter(i =>
        (i.name && i.name.trim() !== '') || (i.images && i.images.length > 0))
    } catch { weekItemsMap.value[date] = [] }
  }))
}

const refresh = async () => {
  loading.value = true
  const forward = await findDatesWithData(anchorDate.value, 1, 1)
  visibleDates.value = forward
  const prevCheck = await findDatesWithData(
    (() => { const d = new Date(anchorDate.value); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10) })(),
    -1, 1
  )
  hasPrev.value = prevCheck.length > 0
  const nextCheck = await findDatesWithData(
    (() => { const d = new Date(forward[0] || anchorDate.value); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10) })(),
    1, 1
  )
  hasNext.value = nextCheck.length > 0
  await fetchItemsForDates(visibleDates.value)
  loading.value = false
}

const slidePrev = async () => {
  const prev = await findDatesWithData(
    (() => { const d = new Date(anchorDate.value); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10) })(),
    -1, 1
  )
  if (prev.length) {
    anchorDate.value = prev[0]
    await refresh()
  }
}
const slideNext = async () => {
  const last = visibleDates.value[visibleDates.value.length - 1] || anchorDate.value
  const next = await findDatesWithData(
    (() => { const d = new Date(last); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10) })(),
    1, 1
  )
  if (next.length) {
    anchorDate.value = next[0]
    await refresh()
  }
}
const jumpToToday = async () => {
  anchorDate.value = todayStr
  await refresh()
}

// ── 觸控滑動 ─────────────────────────────────────────────────────
const touchStartX = ref(0)
const onTouchStart = (e) => { touchStartX.value = e.touches[0].clientX }
const onTouchEnd   = (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX.value
  if (Math.abs(dx) > 50) dx > 0 ? slidePrev() : slideNext()
}

// ── 鍵盤 ─────────────────────────────────────────────────────────
const onKeyDown = (e) => {
  if (e.key === 'ArrowLeft') slidePrev()
  if (e.key === 'ArrowRight') slideNext()
}

// ── 回到頂端 ─────────────────────────────────────────────────────
function topFunction() {
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  window.onscroll = () => {
    const btn = document.getElementById('myBtn')
    if (btn) btn.style.display =
      document.body.scrollTop > 20 || document.documentElement.scrollTop > 20 ? 'block' : 'none'
  }
  await fetchDatesStatus(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`)
  await refresh()
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div class="overflow">
    <SiteNavbar/>

    <!-- Cover -->
    <section>
      <div class="cover-box">
        <img class="img-fluid d-md-none mob-cover" src="/images/restaurant/mobile-restaurant-cover.png" alt="">
        <img class="img-fluid d-none d-md-inline-block mob-cover" src="/images/restaurant/restaurant-cover.png" alt="">
        <img class="cover-title" src="/images/restaurant/restaurant-title.png" alt="">
      </div>
    </section>

    <!-- Content -->
    <div class="container">
      <div class="container" id="body"></div>
      <section id="breadcrumb" class="my-1 mx-3 mx-sm-5">
        <NuxtLink to="/">首頁</NuxtLink> >
        <NuxtLink to="/front/restaurant">田園餐廳</NuxtLink> >
        每日菜色
      </section>

      <section id="content" class="mx-3 mx-sm-5">
        <!-- 頁面標題 -->
        <div class="col-12 text-center my-3">
          <div class="row justify-content-center no-gutters">
            <div class="sub-nav nav text-center align-items-center row justify-content-center" id="nav-tab" role="tablist">
              <NuxtLink class="nav-item nav-link tab-link" to="/front/restaurant">回餐廳介紹</NuxtLink> |
              <a class="nav-item nav-link tab-link active" href="#">每日菜色</a>
            </div>
          </div>
        </div>
        <div class="bar-green bar-green-center"></div>

        <div class="row bg-greenweb py-5 px-sm-2">
          <div class="col-12 px-sm-4">
            <div class="row justify-content-center no-gutters">
              <div class="col-12 rounded bg-lightGreen py-3">

                <!-- 標題區 -->
                <div class="row pt-4 justify-content-center no-gutters">
                  <div class="col-10">
                    <div class="section"></div>
                    <div class="circle"></div>
                    <div class="sub-header">今日菜色</div>
                  </div>
                </div>

                <!-- 每日菜色主體 -->
                <div class="row justify-content-center no-gutters">
                  <div class="col-12 col-lg-10 px-2 px-sm-3 py-3" ref="mainCol">

                    <!-- 導覽列 -->
                    <div class="menu-nav-bar mb-3">
                      <button v-if="hasPrev" @click="slidePrev" class="menu-nav-btn">
                        <i class="fas fa-chevron-left me-1"></i>
                      </button>
                      <div v-else class="menu-nav-placeholder"></div>

                      <div class="menu-nav-center">
                        <div class="menu-date-display"
                             :class="currentDay.date === todayStr ? 'menu-date-display--today' : ''">
                          <span class="menu-date-weekday">{{ currentDay.weekLabel }}</span>
                          <span class="menu-date-text">{{ currentDay.date.slice(5).replace('-', '/') }}</span>
                          <span v-if="currentDay.date === todayStr" class="menu-today-chip">今天</span>
                        </div>
                        <button @click="jumpToToday" class="menu-today-btn">
                          <i class="fas fa-calendar-day me-1"></i> 回今日
                        </button>
                      </div>

                      <button v-if="hasNext" @click="slideNext" class="menu-nav-btn">
                        <i class="fas fa-chevron-right ms-1"></i>
                      </button>
                      <div v-else class="menu-nav-placeholder"></div>
                    </div>

                    <!-- 載入中 -->
                    <div v-if="loading" class="text-center py-5 text-muted">
                      <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
                      <div class="small">載入中…</div>
                    </div>

                    <!-- 單日菜色卡片 -->
                    <div v-else
                         @touchstart="onTouchStart"
                         @touchend="onTouchEnd">

                      <div v-if="!dateStatus[currentDay.date]"
                           class="menu-empty-day">
                        <i class="fas fa-store-slash fa-2x mb-2 opacity-40"></i>
                        <div>當日公休或無紀錄</div>
                      </div>

                      <div v-else>
                        <div v-for="section in sections" :key="section.type">
                          <div v-if="itemsByTypeForDate(currentDay.date, section.type).length > 0"
                               class="menu-section-block">
                            <!-- 分類標題 -->
                            <div class="menu-section-header" :class="section.badge">
                              <span class="me-1">{{ section.icon }}</span> {{ section.label }}
                            </div>
                            <!-- 菜品卡片網格 -->
                            <div class="menu-dishes-grid">
                              <div v-for="item in itemsByTypeForDate(currentDay.date, section.type)" :key="item.id"
                                   class="menu-dish-card">
                                <div v-if="item.images && item.images.length > 0"
                                     class="menu-dish-img-wrap"
                                     @click="previewUrl = imgUrl(item.images[0])">
                                  <img :src="thumbUrl(item.images[0])"
                                       :alt="item.name"
                                       class="menu-dish-img"
                                       loading="lazy" />
                                  <div class="menu-dish-img-overlay"><i class="fas fa-search-plus"></i></div>
                                </div>
                                <div v-else class="menu-dish-no-img">
                                  <i class="fas fa-utensils fa-lg opacity-30"></i>
                                </div>
                                <div v-if="item.name || (item.ingredients && item.ingredients.length) || item.note"
                                     class="menu-dish-body">
                                  <div v-if="item.name" class="menu-dish-name">{{ item.name }}</div>
                                  <p v-if="item.ingredients && item.ingredients.length"
                                     class="menu-item-ingredients">
                                    {{ item.ingredients.join('・') }}
                                  </p>
                                  <p v-if="item.note" class="menu-item-note">{{ item.note }}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    <!-- 操作說明 -->
                    <div class="text-center text-muted mt-3" style="font-size: 0.78rem;">
                      <i class="fas fa-hand-pointer me-1"></i> 左右滑動或點擊箭頭瀏覽其他日期
                    </div>

                  </div>
                </div>

                <!-- 備註 -->
                <div class="row justify-content-center no-gutters pb-4">
                  <div class="col-10">
                    <div class="menu-note-box">
                      <i class="fas fa-info-circle me-2" style="color: #5a8a3c;"></i>
                      菜色每日依食材新鮮度調整，請以當天公告為準。<br>
                      營業時間：11:30 – 13:30，每週日公休。<br>
                      訂位電話：(089) 381382 # 889
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
        <div class="bar-green bar-green-center2"></div>
      </section>
    </div>

    <!-- 底部按鈕 -->
    <div class="container">
      <div class="col-12 text-center my-5">
        <div class="btn col-md-6 cus-button">
          <NuxtLink to="/">回聖母健康農莊首頁</NuxtLink>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="bar-waterDrop mt-5 mx-lg-5"></div>
    </div>

    <SiteFooter/>

    <!-- 圖片預覽 Lightbox -->
    <div v-if="previewUrl" class="menu-lightbox" @click="previewUrl = ''">
      <img :src="previewUrl" class="menu-lightbox-img" @click.stop />
      <button class="menu-lightbox-close" @click="previewUrl = ''">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- 回到頂端 -->
    <button @click="topFunction" id="myBtn" title="Go to top" class="d-lg-none">
      <i class="fas fa-chevron-up"></i>
    </button>
  </div>
</template>

<style lang="scss">
@use '~/assets/scss/all' as *;

/* ── 導覽列 ── */
.menu-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.menu-nav-placeholder { width: 90px; flex-shrink: 0; }
.menu-nav-btn {
  flex-shrink: 0;
  width: 40px;
  padding: 6px 10px;
  font-size: 0.82rem;
  border: 1.5px solid #8bb868;
  background: #fff;
  color: #5a8a3c;
  border-radius: 20px;
  cursor: pointer;
  transition: all .15s;
  &:hover { background: #5a8a3c; color: #fff; }
}
.menu-nav-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.menu-date-display {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 18px;
  border-radius: 24px;
  background: #d8e8c8;
  color: #4a6c32;
  font-weight: 600;

  &--today {
    background: #5a8a3c;
    color: #fff;
  }
}
.menu-date-weekday {
  font-size: 1.1rem;
  font-weight: 700;
}
.menu-date-text {
  font-size: 1rem;
  letter-spacing: 0.5px;
}
.menu-today-chip {
  font-size: 0.68rem;
  background: rgba(255,255,255,0.3);
  border-radius: 20px;
  padding: 1px 8px;
}
.menu-today-btn {
  font-size: 0.75rem;
  padding: 2px 12px;
  background: transparent;
  border: 1px solid #8bb868;
  color: #5a8a3c;
  border-radius: 12px;
  cursor: pointer;
  transition: all .15s;
  &:hover { background: #5a8a3c; color: #fff; }
}

/* ── 無紀錄 ── */
.menu-empty-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: #aaa;
  font-size: 0.9rem;
}

/* ── 分類區塊 ── */
.menu-section-block {
  margin-bottom: 20px;
}
.menu-section-header {
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 20px;
  margin-bottom: 10px;
  letter-spacing: 0.5px;
}

/* ── 菜品卡片網格 ── */
.menu-dishes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }

  &--full {
    grid-template-columns: 1fr;
  }
}

.menu-dish-card {
  background: #fff;
  border: 1px solid #dde8d0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: box-shadow .2s;
  &:hover { box-shadow: 0 4px 16px rgba(90,138,60,0.15); }
}

/* ── 沙拉霸圖片牆 ── */
.menu-salad-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 6px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  > .menu-dish-img-wrap {
    height: 160px;
    border-radius: 10px;
  }
}

/* ── 單圖 ── */
.menu-dish-img-wrap {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  aspect-ratio: 4 / 3;
}

/* ── 多圖橫排（沙拉吧） ── */
.menu-dish-multi-imgs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 3px;
}
.menu-dish-multi-imgs > .menu-dish-img-wrap {
  height: 120px;
  border-radius: 0;
}
.menu-dish-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .25s;
  .menu-dish-img-wrap:hover & { transform: scale(1.04); }
}
.menu-dish-img-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.3rem;
  opacity: 0;
  transition: all .2s;
  .menu-dish-img-wrap:hover & {
    background: rgba(0,0,0,0.25);
    opacity: 1;
  }
}
.menu-dish-no-img {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f8f2;
  color: #aaa;
}

.menu-dish-body {
  padding: 10px 12px 12px;
}
.menu-dish-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #333;
  line-height: 1.3;
}

/* ── 通用 ── */
.menu-item-ingredients {
  font-size: 0.75rem;
  color: #888;
  margin: 4px 0 0;
  line-height: 1.5;
}
.menu-item-note {
  font-size: 0.72rem;
  color: #aaa;
  font-style: italic;
  margin: 2px 0 0;
}
.menu-diet-badge {
  font-size: 0.68rem;
  padding: 1px 7px;
  border-radius: 20px;
  font-weight: 500;
  flex-shrink: 0;
}

/* ── 備註框 ── */
.menu-note-box {
  background: #f0f7e8;
  border-left: 4px solid #5a8a3c;
  border-radius: 0 8px 8px 0;
  padding: 12px 16px;
  font-size: 0.82rem;
  color: #4a6c32;
  line-height: 1.8;
  margin-top: 8px;
}

/* ── Lightbox ── */
.menu-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;

  &-img {
    max-width: 92vw;
    max-height: 88vh;
    border-radius: 8px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  }

  &-close {
    position: fixed;
    top: 16px;
    right: 20px;
    background: rgba(255,255,255,0.2);
    border: none;
    color: #fff;
    font-size: 1.2rem;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    cursor: pointer;
    transition: background .2s;

    &:hover { background: rgba(255,255,255,0.35); }
  }
}
</style>
