<script setup>
definePageMeta({ layout: 'front', requiredPermission: 'order.venue-rental' })
useSiteHead()

// 公開頁面：不需要員工登入即可送出場地租借需求。
// 若站台預設把 /holy/** 都擋在登入後面，請將以下端點加入白名單：
//   GET  /holy/venues/settings/list
//   POST /holy/venues/bookings/request
//   GET  /holy/venues/bookings/by-ids

import { ref, computed, reactive, onMounted } from 'vue'

const commonStore = useCommonStore()
const VENUES_BASE   = () => commonStore.data.main_url + '/holy/venues/settings'
const BOOKINGS_BASE = () => commonStore.data.main_url + '/holy/venues/bookings'
const STORAGE_KEY = 'holy_my_venue_bookings'

const venues = ref([]) // 從後台場地管理讀取，取代原本寫死的清單

const filters = [
  { label: '全部', value: 'all' },
  { label: '大型場地 (100人+)', value: 'large' },
  { label: '中型場地 (30–99人)', value: 'medium' },
  { label: '小型場地 (<30人)', value: 'small' },
  { label: '戶外', value: 'outdoor' },
  { label: '靈修 / 祈禱', value: 'spiritual' },
]

const activeFilter = ref('all')
const activeImage = reactive({})

const setActiveImage = (venueName, img) => {
  activeImage[venueName] = img
}

const lightbox = reactive({ open: false, images: [], index: 0, name: '' })

const openLightbox = (venue, currentImg) => {
  lightbox.images = venue.images
  lightbox.index = venue.images.indexOf(currentImg)
  lightbox.name = venue.name
  lightbox.open = true
}
const closeLightbox = () => { lightbox.open = false }
const lightboxPrev = () => { lightbox.index = (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length }
const lightboxNext = () => { lightbox.index = (lightbox.index + 1) % lightbox.images.length }

const filteredVenues = computed(() => {
  return venues.value.filter(v => {
    const cap = v.capacityMax || parseInt(v.capacity) || 0
    switch (activeFilter.value) {
      case 'large':     return cap >= 100
      case 'medium':    return cap >= 30 && cap < 100
      case 'small':     return cap > 0 && cap < 30
      case 'outdoor':   return v.activities.includes('戶外') || v.name.includes('草坪') || v.name.includes('營火')
      case 'spiritual': return v.activities.includes('靈修') || v.activities.includes('祈禱')
      default:          return true
    }
  })
})

const formatPrice = (price) => {
  if (!price) return '洽詢'
  return price.toLocaleString()
}

const venueIcon = (venue) => {
  if (venue.activities.includes('靈修') || venue.activities.includes('祈禱')) return '⛪'
  if (venue.activities.includes('戶外') || venue.name.includes('草坪')) return '🌿'
  if (venue.activities.includes('營火')) return '🔥'
  if (venue.activities.includes('烘培') || venue.activities.includes('廚藝') || venue.activities.includes('炊事')) return '🍳'
  if (venue.activities.includes('運動')) return '🏃'
  if (venue.activities.includes('大型活動')) return '🏛️'
  return '🏫'
}

const equipmentClass = (eq) => {
  if (eq.includes('投影機')) return 'eq-projector'
  if (eq.includes('液晶'))   return 'eq-screen'
  if (eq.includes('電腦'))   return 'eq-computer'
  if (eq.includes('擴音'))   return 'eq-audio'
  if (eq.includes('冷氣'))   return 'eq-ac'
  if (eq.includes('飲水'))   return 'eq-water'
  return 'eq-default'
}

// ---------- 預約表單 ----------
const today = new Date().toISOString().slice(0, 10)
const bookingOpen = ref(false)
const bookingVenue = ref(null)
const form = reactive({ date: '', startTime: '', endTime: '', guests: 10, name: '', phone: '', email: '', notes: '' })
const formError = ref('')
const submitting = ref(false)
const justSubmittedId = ref('')

function openBooking(venue) {
  bookingVenue.value = venue
  Object.assign(form, { date: '', startTime: '', endTime: '', guests: 10, name: '', phone: '', email: '', notes: '' })
  formError.value = ''
  bookingOpen.value = true
}

async function submitBooking() {
  formError.value = ''
  if (!form.date) { formError.value = '請選擇使用日期'; return }
  if (!form.startTime || !form.endTime) { formError.value = '請選擇開始與結束時間'; return }
  if (form.endTime <= form.startTime) { formError.value = '結束時間需晚於開始時間'; return }
  if (!form.guests || form.guests < 1) { formError.value = '請輸入正確的使用人數'; return }
  if (!form.name.trim()) { formError.value = '請輸入姓名'; return }
  if (!form.phone.trim()) { formError.value = '請輸入聯絡電話'; return }

  submitting.value = true
  try {
    const body = {
      date: form.date, startTime: form.startTime, endTime: form.endTime, guests: form.guests,
      name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
      venuePref: bookingVenue.value ? bookingVenue.value.id : 'all',
      notes: form.notes.trim(),
    }
    const res = await (await fetch(`${BOOKINGS_BASE()}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })).json()
    if (res.error) { formError.value = res.error; return }

    myBookingIds.value.push(res.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(myBookingIds.value))
    await fetchMyBookings()
    justSubmittedId.value = res.id
    bookingOpen.value = false
  } catch (e) {
    console.error(e)
    formError.value = '送出失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}

// ---------- 我的預約 ----------
const myBookingIds  = ref([])
const myBookingsRaw = ref([])

function venueLabel(id) {
  if (!id || id === 'all') return '尚未指派'
  const v = venues.value.find(x => x.id === id)
  return v ? v.name : '尚未指派'
}
function statusLabel(s) {
  return { unassigned: '待安排', pending: '待確認', confirmed: '已確認', completed: '已使用', cancelled: '已取消' }[s] || s
}
function statusClass(s) {
  return {
    unassigned: 'bg-sky-100 text-sky-700',
    pending:    'bg-amber-100 text-amber-700',
    confirmed:  'bg-emerald-100 text-emerald-700',
    completed:  'bg-stone-200 text-stone-600',
    cancelled:  'bg-rose-100 text-rose-700',
  }[s] || 'bg-stone-100 text-stone-600'
}

const myBookings = computed(() =>
  myBookingsRaw.value
    .map(b => ({ ...b, venueLabel: venueLabel(b.venueId) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
)

async function fetchVenues() {
  try {
    venues.value = await (await fetch(`${VENUES_BASE()}/list`)).json()
  } catch (e) { console.error(e) }
}

async function fetchMyBookings() {
  if (myBookingIds.value.length === 0) { myBookingsRaw.value = []; return }
  try {
    myBookingsRaw.value = await (await fetch(`${BOOKINGS_BASE()}/by-ids?ids=${myBookingIds.value.join(',')}`)).json()
  } catch (e) { console.error(e) }
}

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  myBookingIds.value = stored ? JSON.parse(stored) : []
  fetchVenues()
  fetchMyBookings()
})
</script>

<template>
  <div class="overflow">

    <!-- Cover -->
    <section>
      <div class="cover-box">
        <img class="img-fluid d-md-none mob-cover" src="/images/cafe/mobile-cafe-cover.png" alt="">
        <img class="img-fluid d-none d-md-inline-block mob-cover" src="/images/cafe/cafe-cover.png" alt="">
        <img class="cover-title" src="/images/venue/venue-title.png" alt="">
      </div>
    </section>

    <!-- Content -->
    <div class="container">
      <section id="breadcrumb" class="my-1 mx-3 mx-sm-5">
        <NuxtLink to="/front/public">首頁</NuxtLink> > 場地租借
      </section>

      <section id="content" class="mx-3 mx-sm-5">
        <div class="col-12 text-center my-3 sub-nav">場地租借目錄</div>
        <div class="bar-green bar-green-center"></div>

        <div v-if="justSubmittedId" class="vr-submitted-banner">
          租借需求已送出，訂單編號 {{ justSubmittedId }}，我們會盡快與您確認。
          <button class="vr-submitted-close" @click="justSubmittedId = ''">✕</button>
        </div>

        <div class="row bg-greenweb py-4 px-sm-2">
          <div class="col-12 px-sm-4">
            <div class="row justify-content-center no-gutters">
              <div class="col-12 rounded bg-lightGreen py-4 px-3">

                <!-- Filter -->
                <div class="vr-filter-row mb-4">
                  <button
                      v-for="filter in filters"
                      :key="filter.value"
                      class="vr-filter-btn"
                      :class="{ active: activeFilter === filter.value }"
                      @click="activeFilter = filter.value"
                  >{{ filter.label }}</button>
                </div>

                <!-- Venue Grid -->
                <div class="vr-venue-grid">
                  <div v-for="venue in filteredVenues" :key="venue.id" class="vr-card">
                    <!-- Image -->
                    <div class="vr-card-image">
                      <img
                          v-if="venue.images.length"
                          :src="`/images/venue/sub/${activeImage[venue.name] || venue.images[0]}`"
                          :alt="venue.name"
                          class="vr-main-img"
                          @click="openLightbox(venue, activeImage[venue.name] || venue.images[0])"
                      />
                      <div v-else class="vr-card-image-placeholder">
                        <span>{{ venueIcon(venue) }}</span>
                      </div>
                      <div class="vr-price-badge">
                        NT$ {{ formatPrice(venue.price) }} <span>/ 時段</span>
                      </div>
                    </div>

                    <!-- Body -->
                    <div class="vr-card-body">
                      <div class="vr-card-header-row">
                        <h2 class="vr-venue-name">{{ venue.name }}</h2>
                        <span v-if="venue.location" class="vr-venue-location">{{ venue.location }}</span>
                      </div>

                      <div class="vr-venue-meta">
                        <span v-if="venue.capacity" class="vr-meta-item">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9a7 7 0 1 1 14 0H3z"/></svg>
                          {{ venue.capacity }} 人
                        </span>
                        <span v-if="venue.activities" class="vr-meta-item">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1V3a1 1 0 1 0-2 0v1H7V3a1 1 0 0 0-1-1zm0 5a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H6z" clip-rule="evenodd"/></svg>
                          {{ venue.activities }}
                        </span>
                      </div>

                      <div v-if="venue.equipment.length" class="vr-equipment-tags">
                        <span
                            v-for="eq in venue.equipment"
                            :key="eq"
                            class="vr-eq-tag"
                            :class="equipmentClass(eq)"
                        >{{ eq }}</span>
                      </div>

                      <div v-if="venue.images.length > 1" class="vr-extra-images">
                        <img
                            v-for="(img, idx) in venue.images"
                            :key="idx"
                            :src="`/images/book/venue-rental-catalog/${img}`"
                            :alt="`${venue.name} ${idx + 1}`"
                            class="vr-thumb"
                            :class="{ 'vr-thumb-active': (activeImage[venue.name] || venue.images[0]) === img }"
                            @click="setActiveImage(venue.name, img)"
                        />
                      </div>

                      <button class="vr-book-btn" @click="openBooking(venue)">立即預約</button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- 我的預約 -->
        <div v-if="myBookings.length" class="row bg-greenweb py-4 px-sm-2 mt-4">
          <div class="col-12 px-sm-4">
            <div class="col-12 rounded bg-lightGreen py-4 px-3">
              <h2 class="vr-my-bookings-title">我的預約</h2>
              <div v-for="b in myBookings" :key="b.id" class="vr-booking-row">
                <div>
                  <p class="vr-booking-main">{{ b.venueLabel }} · {{ b.date }} {{ b.startTime }}–{{ b.endTime }}</p>
                  <p class="vr-booking-sub">{{ b.guests }} 人・訂單編號 {{ b.id }}</p>
                </div>
                <span class="status-badge" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bar-green bar-green-center2"></div>
      </section>
    </div>

    <div class="col-12 col-md-12 text-center my-5">
      <div class="btn col-md-6 cus-button">
        <NuxtLink to="/front/public">回聖母健康農莊首頁</NuxtLink>
      </div>
    </div>

    <div class="container">
      <div class="bar-waterDrop mt-5 mx-lg-5"></div>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="lightbox.open" class="vr-lightbox" @click.self="closeLightbox">
        <button class="vr-lb-close" @click="closeLightbox">✕</button>
        <button v-if="lightbox.images.length > 1" class="vr-lb-arrow vr-lb-prev" @click="lightboxPrev">&#8249;</button>
        <img
            class="vr-lb-img"
            :src="`/images/book/venue-rental-catalog/${lightbox.images[lightbox.index]}`"
            :alt="lightbox.name"
        />
        <button v-if="lightbox.images.length > 1" class="vr-lb-arrow vr-lb-next" @click="lightboxNext">&#8250;</button>
        <div v-if="lightbox.images.length > 1" class="vr-lb-dots">
          <span
              v-for="(_, i) in lightbox.images"
              :key="i"
              class="vr-lb-dot"
              :class="{ active: i === lightbox.index }"
              @click="lightbox.index = i"
          />
        </div>
      </div>
    </Teleport>

    <!-- 預約表單 Modal -->
    <Teleport to="body">
      <div v-if="bookingOpen" class="vr-modal-mask" @click.self="bookingOpen = false">
        <div class="vr-modal-box">
          <button class="vr-modal-close" @click="bookingOpen = false">✕</button>
          <h2 class="vr-modal-title">預約場地</h2>
          <p class="vr-modal-subtitle">{{ bookingVenue ? bookingVenue.name : '' }}</p>

          <div class="vr-form-row-2">
            <div>
              <label class="vr-form-label">使用日期</label>
              <input v-model="form.date" type="date" :min="today" class="vr-form-input">
            </div>
            <div>
              <label class="vr-form-label">使用人數</label>
              <input v-model.number="form.guests" type="number" min="1" class="vr-form-input">
            </div>
          </div>

          <div class="vr-form-row-2">
            <div>
              <label class="vr-form-label">開始時間</label>
              <input v-model="form.startTime" type="time" class="vr-form-input">
            </div>
            <div>
              <label class="vr-form-label">結束時間</label>
              <input v-model="form.endTime" type="time" class="vr-form-input">
            </div>
          </div>

          <div class="vr-form-row-2">
            <div>
              <label class="vr-form-label">姓名</label>
              <input v-model="form.name" type="text" placeholder="請輸入姓名" class="vr-form-input">
            </div>
            <div>
              <label class="vr-form-label">聯絡電話</label>
              <input v-model="form.phone" type="text" placeholder="09xx-xxx-xxx" class="vr-form-input">
            </div>
          </div>

          <label class="vr-form-label">Email（選填）</label>
          <input v-model="form.email" type="email" class="vr-form-input mb-3">

          <label class="vr-form-label">備註</label>
          <textarea v-model="form.notes" rows="2" placeholder="活動內容、需要的設備等" class="vr-form-input mb-3"></textarea>

          <p v-if="formError" class="vr-form-error">{{ formError }}</p>

          <button class="vr-submit-btn" :disabled="submitting" @click="submitBooking">
            {{ submitting ? '送出中...' : '送出租借需求' }}
          </button>
          <p class="vr-form-hint">送出後即建立「待安排」訂單，我們會依場地空檔盡快與您確認</p>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
/* ── Filter ── */
.vr-filter-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.vr-filter-btn {
  padding: 0.38rem 0.9rem; border-radius: 999px;
  border: 1.5px solid #c5d4be; background: transparent;
  color: #5a6e54; font-size: 0.83rem; font-family: inherit;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.vr-filter-btn:hover { border-color: #3d7a52; color: #3d7a52; }
.vr-filter-btn.active { background: #3d7a52; border-color: #3d7a52; color: #fff; }

/* ── Submitted banner ── */
.vr-submitted-banner {
  background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857;
  border-radius: 8px; padding: 0.6rem 1rem; margin-bottom: 1rem;
  font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
}
.vr-submitted-close { background: none; border: none; color: inherit; opacity: 0.6; cursor: pointer; font-size: 0.9rem; }
.vr-submitted-close:hover { opacity: 1; }

/* ── Grid ── */
.vr-venue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}

/* ── Card ── */
.vr-card {
  background: #fff; border-radius: 10px; overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex; flex-direction: column;
}
.vr-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(0,0,0,0.12); }

.vr-card-image {
  position: relative; height: 170px;
  background: linear-gradient(135deg, #e8f0eb, #d4e6da); overflow: hidden;
}
.vr-main-img { width: 100%; height: 100%; object-fit: cover; cursor: zoom-in; transition: transform 0.3s; }
.vr-main-img:hover { transform: scale(1.03); }
.vr-card-image-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center; font-size: 3rem; opacity: 0.55;
}
.vr-price-badge {
  position: absolute; bottom: 0.65rem; right: 0.65rem;
  background: rgba(15,41,24,0.88); color: #fff;
  padding: 0.25rem 0.65rem; border-radius: 999px;
  font-size: 0.88rem; font-weight: 500; backdrop-filter: blur(4px);
}
.vr-price-badge span { font-size: 0.72rem; opacity: 0.8; }

.vr-card-body { padding: 1.1rem; flex: 1; display: flex; flex-direction: column; gap: 0.65rem; }
.vr-card-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }
.vr-venue-name {
  font-family: 'Noto Serif TC', serif;
  font-size: 1rem; font-weight: 600; margin: 0; line-height: 1.4; color: #1a3d28;
}
.vr-venue-location {
  font-size: 0.72rem; background: #e8f0eb; color: #5a6e54;
  padding: 0.13rem 0.45rem; border-radius: 4px; white-space: nowrap; flex-shrink: 0;
}
.vr-venue-meta { display: flex; flex-direction: column; gap: 0.3rem; }
.vr-meta-item {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.83rem; color: #4a5e44;
}
.vr-meta-item svg { width: 14px; height: 14px; flex-shrink: 0; color: #3d7a52; }
.vr-equipment-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.vr-eq-tag { font-size: 0.72rem; padding: 0.18rem 0.45rem; border-radius: 4px; font-weight: 400; }
.eq-projector { background: #eff6ff; color: #1d4ed8; }
.eq-screen    { background: #f0fdf4; color: #166534; }
.eq-computer  { background: #fdf4ff; color: #7e22ce; }
.eq-audio     { background: #fff7ed; color: #c2410c; }
.eq-ac        { background: #f0f9ff; color: #0369a1; }
.eq-water     { background: #f0fdfa; color: #0f766e; }
.eq-default   { background: #f0f4ee; color: #5a6e54; }

.vr-extra-images { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.vr-thumb {
  width: 54px; height: 40px; object-fit: cover; border-radius: 4px;
  border: 2px solid transparent; cursor: pointer; transition: border-color 0.15s, opacity 0.15s; opacity: 0.7;
}
.vr-thumb:hover { opacity: 1; border-color: #3d7a52; }
.vr-thumb-active { opacity: 1; border-color: #3d7a52; }

.vr-book-btn {
  margin-top: auto; padding: 0.5rem; border-radius: 8px; border: none;
  background: #3d7a52; color: #fff; font-weight: 600; font-size: 0.85rem;
  cursor: pointer; transition: background 0.15s;
}
.vr-book-btn:hover { background: #2f6141; }

/* ── 我的預約 ── */
.vr-my-bookings-title {
  font-family: 'Noto Serif TC', serif; font-size: 1.05rem; font-weight: 700; color: #1a3d28; margin-bottom: 0.75rem;
}
.vr-booking-row {
  background: #fff; border-radius: 8px; padding: 0.7rem 0.9rem; margin-bottom: 0.5rem;
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.vr-booking-main { font-size: 0.85rem; font-weight: 600; color: #1a3d28; margin: 0; }
.vr-booking-sub { font-size: 0.72rem; color: #7a8a76; margin: 0.15rem 0 0; }
.status-badge { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }

/* ── Lightbox ── */
.vr-lightbox {
  position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.vr-lb-img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 6px; box-shadow: 0 8px 40px rgba(0,0,0,0.5); }
.vr-lb-close {
  position: absolute; top: 1.25rem; right: 1.5rem;
  background: rgba(255,255,255,0.15); border: none; color: #fff;
  font-size: 1.25rem; width: 2.25rem; height: 2.25rem; border-radius: 50%;
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;
}
.vr-lb-close:hover { background: rgba(255,255,255,0.3); }
.vr-lb-arrow {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,0.15); border: none; color: #fff;
  font-size: 2.5rem; width: 3rem; height: 3rem; border-radius: 50%;
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;
}
.vr-lb-arrow:hover { background: rgba(255,255,255,0.3); }
.vr-lb-prev { left: 1.25rem; }
.vr-lb-next { right: 1.25rem; }
.vr-lb-dots {
  position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
  display: flex; gap: 0.5rem;
}
.vr-lb-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.4); cursor: pointer; transition: background 0.2s; }
.vr-lb-dot.active { background: #fff; }

/* ── 預約表單 Modal ── */
.vr-modal-mask {
  position: fixed; inset: 0; background: rgba(15,41,24,0.55); z-index: 9998;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.vr-modal-box {
  background: #fff; border-radius: 14px; padding: 1.5rem; width: 100%; max-width: 440px;
  max-height: 90vh; overflow-y: auto; position: relative;
}
.vr-modal-close {
  position: absolute; top: 0.9rem; right: 0.9rem; background: #f0f4ee; border: none;
  width: 1.8rem; height: 1.8rem; border-radius: 50%; cursor: pointer; color: #5a6e54; font-size: 0.9rem;
}
.vr-modal-close:hover { background: #e2ebe0; }
.vr-modal-title {
  font-family: 'Noto Serif TC', serif; font-size: 1.15rem; font-weight: 700; color: #1a3d28; margin: 0 0 0.15rem;
}
.vr-modal-subtitle { font-size: 0.85rem; color: #5a6e54; margin: 0 0 1rem; }
.vr-form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; margin-bottom: 0.75rem; }
.vr-form-label { display: block; font-size: 0.76rem; color: #5a6e54; margin-bottom: 0.25rem; }
.vr-form-input {
  width: 100%; border: 1px solid #d8e2d4; border-radius: 8px; padding: 0.5rem 0.7rem;
  font-size: 0.85rem; font-family: inherit; background: #fafcf9; color: #1a3d28;
}
.vr-form-error { color: #dc2626; font-size: 0.78rem; margin: 0 0 0.5rem; }
.vr-submit-btn {
  width: 100%; padding: 0.65rem; border-radius: 8px; border: none;
  background: #3d7a52; color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer;
}
.vr-submit-btn:hover { background: #2f6141; }
.vr-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.vr-form-hint { text-align: center; font-size: 0.72rem; color: #8a9a86; margin-top: 0.5rem; }
</style>
