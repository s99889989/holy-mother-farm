<template>
  <div class="venue-page">
    <!-- Header -->
    <section class="page-header">
      <h1 class="page-title">場地租借目錄</h1>
      <p class="page-subtitle">聖母健康農莊 · 提供多元空間供您選擇</p>
    </section>

    <!-- Filter Bar -->
    <section class="filter-bar">
      <div class="filter-inner">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="filter-btn"
          :class="{ active: activeFilter === filter.value }"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </section>

    <!-- Venue Grid -->
    <section class="venue-grid-section">
      <div class="venue-grid">
        <div
          v-for="venue in filteredVenues"
          :key="venue.name"
          class="venue-card"
        >
          <!-- Main Image -->
          <div class="card-image">
            <img
              v-if="venue.images.length"
              :src="`/images/book/venue-rental-catalog/${activeImage[venue.name] || venue.images[0]}`"
              :alt="venue.name"
              class="main-img"
              @click="openLightbox(venue, activeImage[venue.name] || venue.images[0])"
            />
            <div v-else class="card-image-placeholder">
              <span class="placeholder-icon">{{ venueIcon(venue) }}</span>
            </div>
            <div class="price-badge">NT$ {{ formatPrice(venue.price) }} <span>/ 時段</span></div>
          </div>

          <!-- Body -->
          <div class="card-body">
            <div class="card-header-row">
              <h2 class="venue-name">{{ venue.name }}</h2>
              <span v-if="venue.location" class="venue-location">{{ venue.location }}</span>
            </div>

            <div class="venue-meta">
              <span class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9a7 7 0 1 1 14 0H3z"/></svg>
                {{ venue.capacity }} 人
              </span>
              <span class="meta-item activities">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1V3a1 1 0 1 0-2 0v1H7V3a1 1 0 0 0-1-1zm0 5a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H6z" clip-rule="evenodd"/></svg>
                {{ venue.activities }}
              </span>
            </div>

            <!-- Equipment Tags -->
            <div v-if="venue.equipment.length" class="equipment-tags">
              <span
                v-for="eq in venue.equipment"
                :key="eq"
                class="eq-tag"
                :class="equipmentClass(eq)"
              >{{ eq }}</span>
            </div>

            <!-- Thumbnails -->
            <div v-if="venue.images.length > 1" class="extra-images">
              <img
                v-for="(img, idx) in venue.images"
                :key="idx"
                :src="`/images/book/venue-rental-catalog/${img}`"
                :alt="`${venue.name} ${idx + 1}`"
                class="thumb"
                :class="{ 'thumb-active': (activeImage[venue.name] || venue.images[0]) === img }"
                @click="setActiveImage(venue.name, img)"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="lightbox.open" class="lightbox" @click.self="closeLightbox">
        <button class="lb-close" @click="closeLightbox">✕</button>
        <button v-if="lightbox.images.length > 1" class="lb-arrow lb-prev" @click="lightboxPrev">&#8249;</button>
        <img
          class="lb-img"
          :src="`/images/book/venue-rental-catalog/${lightbox.images[lightbox.index]}`"
          :alt="lightbox.name"
        />
        <button v-if="lightbox.images.length > 1" class="lb-arrow lb-next" @click="lightboxNext">&#8250;</button>
        <div v-if="lightbox.images.length > 1" class="lb-dots">
          <span
            v-for="(_, i) in lightbox.images"
            :key="i"
            class="lb-dot"
            :class="{ active: i === lightbox.index }"
            @click="lightbox.index = i"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

const venues = [
  { name: '快樂運動館B1大禮堂', location: '', capacity: '250', activities: '大型活動，活動，會議', price: 15000, equipment: ['A 投影機', 'D擴音設備', 'E冷氣', 'F飲水機', 'G桌子', 'H椅子', 'Ｃ電腦'], images: [] },
  { name: '活動中心', location: '', capacity: '500', activities: '大型活動，活動，會議', price: 6000, equipment: ['D擴音設備', 'F飲水機', 'G桌子', 'H椅子'], images: [] },
  { name: '療癒森林大草坪', location: '', capacity: '500', activities: '戶外活動，野餐', price: 6000, equipment: [], images: [] },
  { name: '烘培坊烘培教室', location: '', capacity: '20', activities: '烘培教室，活動', price: 6000, equipment: ['E冷氣', 'F飲水機', 'G桌子'], images: [] },
  { name: '快樂競技館', location: '', capacity: '30', activities: '運動課程，活動', price: 5000, equipment: ['B 液晶螢幕', 'E冷氣', 'F飲水機', 'G桌子', 'Ｃ電腦'], images: [] },
  { name: '樂活教室', location: '', capacity: '40-60', activities: '中型會議，聚會', price: 5000, equipment: ['A 投影機', 'D擴音設備', 'E冷氣', 'F飲水機', 'G桌子', 'Ｃ電腦'], images: [] },
  { name: '聖堂', location: 'A棟', capacity: '100', activities: '禮儀，祈禱，靈修', price: 4000, equipment: ['D擴音設備', 'E冷氣', 'H椅子'], images: [] },
  { name: '心靈教室', location: '', capacity: '30', activities: '禮儀，祈禱，靈修', price: 4000, equipment: ['B 液晶螢幕', 'D擴音設備', 'E冷氣', 'F飲水機', 'H椅子', 'Ｃ電腦'], images: [] },
  { name: '快樂運動館樂功能軟墊教室', location: '', capacity: '25-30', activities: '運動，活動，小團體', price: 4000, equipment: ['A 投影機', 'D擴音設備', 'E冷氣', 'Ｃ電腦'], images: [] },
  { name: '手作教室', location: '', capacity: '40', activities: '體驗課程，炊事', price: 4000, equipment: ['A 投影機', 'F飲水機', 'G桌子', 'H椅子'], images: [] },
  { name: 'A棟201教室', location: '', capacity: '40', activities: '中型會議，活動，聚會', price: 4000, equipment: ['A 投影機', 'D擴音設備', 'E冷氣', 'G桌子', 'H椅子', 'Ｃ電腦'], images: [] },
  { name: 'Ａ棟202教室', location: '', capacity: '40', activities: '中型會議，活動，聚會', price: 4000, equipment: ['A 投影機', 'D擴音設備', 'E冷氣', 'G桌子', 'H椅子', 'Ｃ電腦'], images: [] },
  { name: 'A棟簡報室', location: '', capacity: '60', activities: '中型會議，活動，聚會', price: 3500, equipment: ['A 投影機', 'D擴音設備', 'E冷氣', 'G桌子', 'H椅子', 'Ｃ電腦'], images: [] },
  { name: '森林好食光廚房及餐廳', location: '', capacity: '16', activities: '廚藝，炊事，聚餐', price: 3000, equipment: ['B 液晶螢幕', 'E冷氣', 'F飲水機', 'G桌子', 'H椅子'], images: [] },
  { name: 'A棟203教室', location: '', capacity: '25', activities: '小型會議，活動，聚會', price: 2500, equipment: ['A 投影機', 'D擴音設備', 'E冷氣', 'G桌子', 'H椅子', 'Ｃ電腦'], images: [] },
  { name: '靈修中心靜心室', location: '', capacity: '20', activities: '禮儀，祈禱，靈修', price: 2500, equipment: ['E冷氣'], images: [] },
  { name: '靈修中心客廳', location: '', capacity: '16', activities: '講習，工作坊，靈修', price: 2500, equipment: ['B 液晶螢幕', 'E冷氣', 'F飲水機', 'G桌子', 'H椅子'], images: [] },
  { name: '接待室及小會議室', location: '', capacity: '12', activities: '會談，小型會議，聚會', price: 2500, equipment: ['B 液晶螢幕', 'E冷氣', 'F飲水機', 'G桌子', 'H椅子', 'Ｃ電腦'], images: [] },
  { name: '營火場', location: '', capacity: '150', activities: '營火', price: 2000, equipment: [], images: [] },
  { name: '多功能教室', location: '', capacity: '', activities: '', price: null, equipment: [], images: ['1757388033567.jpg', '1757388037022.jpg', '1757388035355.jpg', '1757388038676.jpg'] },
]

const filters = [
  { label: '全部', value: 'all' },
  { label: '大型場地 (100人+)', value: 'large' },
  { label: '中型場地 (30–99人)', value: 'medium' },
  { label: '小型場地 (<30人)', value: 'small' },
  { label: '戶外', value: 'outdoor' },
  { label: '靈修 / 祈禱', value: 'spiritual' },
]

const activeFilter = ref('all')

// tracks which thumbnail is shown as main image per venue
const activeImage = reactive({})

const setActiveImage = (venueName, img) => {
  activeImage[venueName] = img
}

// lightbox state
const lightbox = reactive({
  open: false,
  images: [],
  index: 0,
  name: '',
})

const openLightbox = (venue, currentImg) => {
  lightbox.images = venue.images
  lightbox.index = venue.images.indexOf(currentImg)
  lightbox.name = venue.name
  lightbox.open = true
}

const closeLightbox = () => {
  lightbox.open = false
}

const lightboxPrev = () => {
  lightbox.index = (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length
}

const lightboxNext = () => {
  lightbox.index = (lightbox.index + 1) % lightbox.images.length
}

const filteredVenues = computed(() => {
  return venues.filter(v => {
    const cap = parseInt(v.capacity)
    switch (activeFilter.value) {
      case 'large': return cap >= 100
      case 'medium': return cap >= 30 && cap < 100
      case 'small': return cap > 0 && cap < 30
      case 'outdoor': return v.activities.includes('戶外') || v.name.includes('草坪') || v.name.includes('營火')
      case 'spiritual': return v.activities.includes('靈修') || v.activities.includes('祈禱')
      default: return true
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
  if (eq.includes('液晶')) return 'eq-screen'
  if (eq.includes('電腦')) return 'eq-computer'
  if (eq.includes('擴音')) return 'eq-audio'
  if (eq.includes('冷氣')) return 'eq-ac'
  if (eq.includes('飲水')) return 'eq-water'
  return 'eq-default'
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&family=Noto+Sans+TC:wght@300;400;500&display=swap');

.venue-page {
  font-family: 'Noto Sans TC', sans-serif;
  background: #f7f5f0;
  min-height: 100vh;
  color: #2c2a24;
}

/* Header */
.page-header {
  background: linear-gradient(135deg, #3d6b4f 0%, #2a4d38 60%, #1e3a28 100%);
  color: #fff;
  text-align: center;
  padding: 4rem 1.5rem 3rem;
  position: relative;
  overflow: hidden;
}
.page-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
.page-title {
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  margin: 0 0 0.5rem;
  letter-spacing: 0.08em;
  position: relative;
}
.page-subtitle {
  font-size: 1rem;
  opacity: 0.75;
  margin: 0;
  font-weight: 300;
  letter-spacing: 0.1em;
  position: relative;
}

/* Filter */
.filter-bar {
  background: #fff;
  border-bottom: 1px solid #e8e4dc;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.filter-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.filter-btn {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1.5px solid #c8c2b4;
  background: transparent;
  color: #5a5448;
  font-size: 0.85rem;
  font-family: 'Noto Sans TC', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.filter-btn:hover {
  border-color: #3d6b4f;
  color: #3d6b4f;
}
.filter-btn.active {
  background: #3d6b4f;
  border-color: #3d6b4f;
  color: #fff;
}

/* Grid */
.venue-grid-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
}
.venue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

/* Card */
.venue-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}
.venue-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

/* Card Image */
.card-image {
  position: relative;
  height: 180px;
  background: #e8f0eb;
  overflow: hidden;
}
.card-image .main-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: zoom-in;
  transition: transform 0.3s;
}
.card-image .main-img:hover {
  transform: scale(1.03);
}
.card-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f0eb, #d4e6da);
}
.placeholder-icon {
  font-size: 3.5rem;
  opacity: 0.6;
}
.price-badge {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  background: rgba(30, 58, 40, 0.88);
  color: #fff;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 500;
  backdrop-filter: blur(4px);
}
.price-badge span {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Card Body */
.card-body {
  padding: 1.25rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.card-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}
.venue-name {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
  color: #1e3a28;
}
.venue-location {
  font-size: 0.75rem;
  background: #f0ebe0;
  color: #7a6e58;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Meta */
.venue-meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: #5a5448;
}
.meta-item svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: #3d6b4f;
}
.meta-item.activities {
  color: #6b6358;
  font-size: 0.83rem;
}

/* Equipment Tags */
.equipment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.eq-tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 400;
}
.eq-projector { background: #eff6ff; color: #1d4ed8; }
.eq-screen    { background: #f0fdf4; color: #166534; }
.eq-computer  { background: #fdf4ff; color: #7e22ce; }
.eq-audio     { background: #fff7ed; color: #c2410c; }
.eq-ac        { background: #f0f9ff; color: #0369a1; }
.eq-water     { background: #f0fdfa; color: #0f766e; }
.eq-default   { background: #f5f5f4; color: #44403c; }

/* Thumbnails */
.extra-images {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.thumb {
  width: 56px;
  height: 42px;
  object-fit: cover;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, opacity 0.15s;
  opacity: 0.75;
}
.thumb:hover {
  opacity: 1;
  border-color: #3d6b4f;
}
.thumb-active {
  opacity: 1;
  border-color: #3d6b4f;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lb-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.lb-close {
  position: absolute;
  top: 1.25rem;
  right: 1.5rem;
  background: rgba(255,255,255,0.15);
  border: none;
  color: #fff;
  font-size: 1.25rem;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.lb-close:hover { background: rgba(255,255,255,0.3); }
.lb-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.15);
  border: none;
  color: #fff;
  font-size: 2.5rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.2s;
}
.lb-arrow:hover { background: rgba(255,255,255,0.3); }
.lb-prev { left: 1.25rem; }
.lb-next { right: 1.25rem; }
.lb-dots {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
}
.lb-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: background 0.2s;
}
.lb-dot.active { background: #fff; }
</style>
