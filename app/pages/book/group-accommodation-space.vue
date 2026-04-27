<template>
  <div class="catalog-page">
    <!-- Hero Banner -->
    <div class="hero-banner">
      <img v-if="heroBanner" :src="heroBanner" alt="聖母健康農莊" class="hero-img" />
    </div>

    <!-- Main Content -->
    <div class="content-wrapper">
      <h1 class="page-title">聖母健康園區 團體住宿空間</h1>
      <p class="page-subtitle">疑問及預約，歡迎來電聖母健康農莊洽詢</p>
      <p class="page-contact">089-381581 #888 服務中心 賈小姐</p>

      <!-- Sections -->
      <div v-for="section in sections" :key="section.id" class="section">
        <div class="section-header">
          <h2 class="section-title">{{ section.name }}</h2>

        </div>

        <div class="cards-grid">
          <div
            v-for="item in section.items"
            :key="item.id"
            class="card"
            @click="openModal(item)"
          >
            <div class="card-img-wrap">
              <img v-if="item.images && item.images.length" :src="item.images[0]" :alt="item.name" class="card-img" />
              <div v-else class="card-img-placeholder" />

            </div>
            <div class="card-body">
              <p class="card-name">{{ item.name }}</p>
              <div class="card-tags">
                <span v-for="tag in item.tags" :key="tag.label" class="tag" :class="tag.color">{{ tag.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Transition name="modal">
      <div v-if="selectedItem" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box">
          <button class="modal-close" @click="closeModal">✕</button>

          <!-- Carousel -->
          <div class="modal-img-wrap" @touchstart="onTouchStart" @touchend="onTouchEnd">
            <template v-if="modalImages.length">
              <Transition :name="slideDir" mode="out-in">
                <img :key="currentIndex" :src="modalImages[currentIndex]" :alt="selectedItem.name" class="modal-img" />
              </Transition>
              <button v-if="modalImages.length > 1" class="carousel-btn prev" @click.stop="prevImage">&#8249;</button>
              <button v-if="modalImages.length > 1" class="carousel-btn next" @click.stop="nextImage">&#8250;</button>
              <div v-if="modalImages.length > 1" class="carousel-counter">{{ currentIndex + 1 }} / {{ modalImages.length }}</div>
            </template>
            <div v-else class="modal-img-placeholder" />
          </div>

          <!-- Thumbnail Strip -->
          <div v-if="modalImages.length > 1" class="thumb-strip">
            <img
              v-for="(img, i) in modalImages"
              :key="i"
              :src="img"
              :alt="`圖片 ${i + 1}`"
              class="thumb"
              :class="{ 'thumb-active': i === currentIndex }"
              @click="goTo(i)"
            />
          </div>

          <div class="modal-content">
            <h3 class="modal-title">{{ selectedItem.name }}</h3>
            <div class="card-tags" style="margin-top:8px">
              <span v-for="tag in selectedItem.tags" :key="tag.label" class="tag" :class="tag.color">{{ tag.label }}</span>
            </div>
            <p v-if="selectedItem.description" class="modal-desc">{{ selectedItem.description }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  heroBanner: { type: String, default: '' }
})

const selectedItem = ref(null)
const currentIndex = ref(0)
const slideDir = ref('slide-left')
let touchStartX = 0

const modalImages = computed(() => selectedItem.value?.images || [])

function openModal(item) {
  selectedItem.value = item
  currentIndex.value = 0
}
function closeModal() {
  selectedItem.value = null
}
function prevImage() {
  if (modalImages.value.length <= 1) return
  slideDir.value = 'slide-right'
  currentIndex.value = (currentIndex.value - 1 + modalImages.value.length) % modalImages.value.length
}
function nextImage() {
  if (modalImages.value.length <= 1) return
  slideDir.value = 'slide-left'
  currentIndex.value = (currentIndex.value + 1) % modalImages.value.length
}
function goTo(i) {
  slideDir.value = i > currentIndex.value ? 'slide-left' : 'slide-right'
  currentIndex.value = i
}
function onTouchStart(e) { touchStartX = e.touches[0].clientX }
function onTouchEnd(e) {
  const diff = touchStartX - e.changedTouches[0].clientX
  if (Math.abs(diff) > 40) diff > 0 ? nextImage() : prevImage()
}

// images: 陣列，填入多張圖片 URL；卡片縮圖顯示第一張，Modal 內可左右切換
const sections = ref([
  {
    id: 'agape',
    name: '愛加倍靈修中心',
    items: [
      { id: 'agape-1', name: '兩大床四人客房', images: [], tags: [{ label: '4000元/晚', color: 'tag-yellow' }], description: '寬敞四人房，配備兩張大床，適合家庭或小團體入住。' },
      { id: 'agape-2', name: '愛加倍交誼廳',  images: [], tags: [{ label: '一拼報2500元', color: 'tag-green' }], description: '提供舒適的交誼空間，適合小型聚會與交流。' },
      { id: 'agape-3', name: '靜心室',        images: [], tags: [{ label: '一拼報2500元', color: 'tag-green' }], description: '靜心冥想空間，適合個人靈修與放鬆。' }
    ]
  },
  {
    id: 'heli',
    name: '合力居',
    items: [
      { id: 'heli-1', name: '雙床房',   images: [], tags: [], description: '' },
      { id: 'heli-2', name: '有窗雙人房', images: [], tags: [], description: '' },
      { id: 'heli-3', name: '無窗雙人房', images: [], tags: [], description: '' },
      { id: 'heli-4', name: '有窗單人房', images: [], tags: [], description: '' },
      { id: 'heli-5', name: '無窗單人房', images: [], tags: [], description: '' }
    ]
  },
  {
    id: 'sport',
    name: '快樂運動館',
    items: [
      { id: 'sport-1', name: '植物扦插',    images: [
        '/images/book/group-accommodation-space/22bd452e-3178-4705-b85c-a9439ef2912d.png',
          '/images/book/group-accommodation-space/e02a3496-59cc-4ade-a210-480c48d03641.png',
        ], tags: [{ label: '成品帶回家', color: 'tag-brown' }, { label: '200元/人', color: 'tag-yellow' }, { label: '體驗時長5分鐘', color: 'tag-gray' }], description: '學習植物扦插技巧，帶著自己親手種植的植物回家。' },
      { id: 'sport-2', name: '手洗窯玉',    images: [
          '/images/book/group-accommodation-space/9af9354d-3243-453f-83e4-8926edefc8c2.png',
          '/images/book/group-accommodation-space/e2cc5721-66e6-4254-94ad-738b5c25c17b.png',
        ], tags: [{ label: '200元/人', color: 'tag-yellow' }, { label: '即時體驗', color: 'tag-blue' }, { label: '體驗時長50分鐘', color: 'tag-gray' }], description: '體驗陶藝製作，在農莊享受手工創作的樂趣。' },
      { id: 'sport-3', name: '無患子溝渠液', images: [
          '/images/book/group-accommodation-space/d0bc0bce-23cd-4e25-8411-d440ee3e9416.png',
          '/images/book/group-accommodation-space/79dc1690-c399-45f1-9bef-89410c370e1f.png',
        ], tags: [{ label: '250元/人', color: 'tag-yellow' }, { label: '體驗時長50分鐘', color: 'tag-gray' }, { label: '季節限定', color: 'tag-red' }], description: '使用天然無患子製作環保清潔液，認識自然素材。' }
    ]
  },
  {
    id: 'kitchen',
    name: '樂智家園盟親廚房',
    items: [
      { id: 'kitchen-1', name: '手作香草魚', images: [
          '/images/book/group-accommodation-space/8ff0ab92-c740-4ce1-8fbc-0a3af93e1db5.png',
          '/images/book/group-accommodation-space/6f758524-7272-4359-9a9c-611f5a663215.png',
        ], tags: [{ label: '即時體驗', color: 'tag-blue' }, { label: '300元/人', color: 'tag-yellow' }, { label: '體驗時長50分鐘', color: 'tag-gray' }], description: '學習以新鮮香草料理魚料理，品嚐農莊在地食材的美味。' },
      { id: 'kitchen-2', name: '植物紮托染', images: [
          '/images/book/group-accommodation-space/b592e6ff-622b-4661-9320-a2c51db0967a.png',
          '/images/book/group-accommodation-space/bf43f2fa-2b77-43ea-8521-1a53f70ee27a.png',
        ], tags: [{ label: '即時體驗', color: 'tag-blue' }, { label: '350元/人', color: 'tag-yellow' }, { label: '體驗時長50分鐘', color: 'tag-gray' }], description: '利用天然植物染料體驗傳統紮染工藝，創作獨一無二的作品。' },
      { id: 'kitchen-3', name: '醬滷豆腐',   images: [
          '/images/book/group-accommodation-space/ec5f0415-98e2-4b17-aae4-67315e76bfed.png',
          '/images/book/group-accommodation-space/a28a1f48-6eef-430a-b304-046ff3fe07d9.png',
        ], tags: [{ label: '體驗時長30分鐘', color: 'tag-gray' }, { label: '1000元/組(3-5人)', color: 'tag-yellow' }], description: '學習傳統醬滷豆腐製作，感受台灣在地飲食文化。' }
    ]
  },
  {
    id: 'camping',
    name: '露營地租借',
    items: [
      { id: 'camp-1', name: '環形運動',    images: [
          '/images/book/group-accommodation-space/78907d2d-961e-4306-8690-dc2d2659dcf0 (1).png',
          '/images/book/group-accommodation-space/da7817bf-1cbf-4eb2-9882-a0157ac6943f (1).png',
        ], tags: [{ label: '250元/人', color: 'tag-yellow' }, { label: '體驗時長50分鐘', color: 'tag-gray' }], description: '在寬闊戶外空間體驗環形團體運動，增進團隊向心力。' },
      { id: 'camp-2', name: '桶油運動',    images: [
          '/images/book/group-accommodation-space/b6136977-a265-48f3-8420-2076352570d1 (1).png',
          '/images/book/group-accommodation-space/07e4a21c-1e0b-464d-9669-aea45d66d19d (1).png',
          '/images/book/group-accommodation-space/9a9fc814-b024-4eef-9686-cf697568edc9 (1).png',
        ], tags: [{ label: '350元/人', color: 'tag-yellow' }, { label: '體驗時長50分鐘', color: 'tag-gray' }], description: '趣味性十足的桶油競技，適合各年齡層參與。' },
      { id: 'camp-3', name: '地板滾球體驗', images: [
          '/images/book/group-accommodation-space/87f4886e-753f-4ddb-bd38-5a3eca9782ca (1).png',
          '/images/book/group-accommodation-space/f8a1bbdb-bb64-4c44-b11d-0cf7720c4699 (1).png',
        ], tags: [{ label: '400元/人', color: 'tag-yellow' }, { label: '體驗時長60分鐘', color: 'tag-gray' }], description: '體驗地板滾球競賽，老少咸宜的益智運動。' },
      { id: 'camp-4', name: '地板滾球競賽', images: [
          '/images/book/group-accommodation-space/5bf961dc-eb46-44a7-b264-dbf1ef0834aa (1).png',
          '/images/book/group-accommodation-space/49b59b5e-5e5c-437d-a322-ef321d93b575 (1).png',
        ], tags: [{ label: '體驗時長90分鐘', color: 'tag-gray' }, { label: '350元/人', color: 'tag-yellow' }], description: '進階版地板滾球正式競賽，激烈精彩、樂趣無窮。' }
    ]
  }
])
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&family=Noto+Sans+TC:wght@300;400;500&display=swap');

.catalog-page { font-family: 'Noto Sans TC', sans-serif; background: #faf9f7; min-height: 100vh; color: #2c2c2c; }

/* Hero */
.hero-banner { width: 100%; height: 180px; overflow: hidden; background: linear-gradient(135deg, #f9e4c8 0%, #ffd5a0 50%, #ffb98a 100%); }
.hero-img { width: 100%; height: 100%; object-fit: cover; object-position: top; }

/* Content */
.content-wrapper { max-width: 760px; margin: 0 auto; padding: 32px 24px 60px; }
.page-title { font-family: 'Noto Serif TC', serif; font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 6px; }
.page-subtitle { font-size: 13px; color: #666; margin: 0 0 2px; }
.page-contact { font-size: 13px; color: #666; margin: 0 0 32px; }

/* Section */
.section { margin-bottom: 36px; }
.section-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #e8e4df; padding-bottom: 8px; margin-bottom: 14px; }
.section-title { font-family: 'Noto Serif TC', serif; font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0; }
.section-actions { display: flex; gap: 4px; }
.icon-btn { background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 4px; color: #888; transition: background 0.15s, color 0.15s; }
.icon-btn:hover { background: #ede9e4; color: #333; }

/* Cards */
.cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.card { background: #fff; border: 1px solid #e8e4df; border-radius: 8px; overflow: hidden; cursor: pointer; transition: box-shadow 0.2s, transform 0.15s; }
.card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.10); transform: translateY(-2px); }
.card-img-wrap { width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #f0ede8; position: relative; }
.card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.card:hover .card-img { transform: scale(1.04); }
.card-img-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #f0ede8 0%, #e8e3dc 100%); }

.card-body { padding: 10px 10px 12px; }
.card-name { font-size: 13px; font-weight: 500; color: #2c2c2c; margin: 0 0 6px; line-height: 1.4; }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; }

/* Tags */
.tag { display: inline-block; font-size: 11px; padding: 2px 7px; border-radius: 20px; font-weight: 400; white-space: nowrap; }
.tag-yellow { background: #fff3cd; color: #856404; }
.tag-green  { background: #d1f5e0; color: #1a6b3a; }
.tag-blue   { background: #dbeafe; color: #1d4ed8; }
.tag-brown  { background: #ede0d4; color: #6b3a1f; }
.tag-gray   { background: #f0f0f0; color: #555; }
.tag-red    { background: #fde8e8; color: #991b1b; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-box { background: #fff; border-radius: 12px; max-width: 460px; width: 100%; overflow: hidden; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.25); max-height: 90vh; display: flex; flex-direction: column; }
.modal-close { position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.9); border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 12px; color: #555; z-index: 10; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
.modal-close:hover { background: #fff; color: #111; }

/* Carousel */
.modal-img-wrap { width: 100%; aspect-ratio: 4/3; background: #f0ede8; position: relative; overflow: hidden; flex-shrink: 0; }
.modal-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.modal-img-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #f0ede8 0%, #e8e3dc 100%); }

.carousel-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.85); border: none; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; font-size: 22px; color: #333; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: background 0.15s, transform 0.15s; z-index: 5; }
.carousel-btn:hover { background: #fff; transform: translateY(-50%) scale(1.08); }
.carousel-btn.prev { left: 10px; }
.carousel-btn.next { right: 10px; }
.carousel-counter { position: absolute; bottom: 10px; right: 12px; background: rgba(0,0,0,0.5); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 10px; }

/* Thumbnail strip */
.thumb-strip { display: flex; gap: 6px; padding: 8px 12px; overflow-x: auto; background: #f7f5f2; border-bottom: 1px solid #e8e4df; flex-shrink: 0; }
.thumb-strip::-webkit-scrollbar { height: 3px; }
.thumb-strip::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
.thumb { width: 52px; height: 40px; object-fit: cover; border-radius: 5px; cursor: pointer; border: 2px solid transparent; flex-shrink: 0; opacity: 0.65; transition: opacity 0.15s, border-color 0.15s; }
.thumb:hover { opacity: 1; }
.thumb-active { border-color: #c8864a; opacity: 1; }

.modal-content { padding: 16px 20px 22px; overflow-y: auto; }
.modal-title { font-family: 'Noto Serif TC', serif; font-size: 17px; font-weight: 600; margin: 0; color: #1a1a1a; }
.modal-desc { font-size: 13px; line-height: 1.7; color: #555; margin: 12px 0 0; }

/* Slide transitions */
.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; position: absolute; width: 100%; height: 100%; }
.slide-left-enter-from  { transform: translateX(100%); opacity: 0; }
.slide-left-leave-to    { transform: translateX(-100%); opacity: 0; }
.slide-right-enter-from { transform: translateX(-100%); opacity: 0; }
.slide-right-leave-to   { transform: translateX(100%); opacity: 0; }

/* Modal open/close */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box { transition: transform 0.2s; }
.modal-enter-from .modal-box, .modal-leave-to .modal-box { transform: scale(0.95) translateY(10px); }

/* Responsive */
@media (max-width: 600px) {
  .cards-grid { grid-template-columns: repeat(2, 1fr); }
  .content-wrapper { padding: 20px 16px 48px; }
  .page-title { font-size: 18px; }
  .modal-overlay { align-items: flex-end; padding: 0; }
  .modal-box { max-width: 100%; border-radius: 12px 12px 0 0; align-self: flex-end; max-height: 88vh; }
}
@media (max-width: 380px) {
  .cards-grid { grid-template-columns: 1fr; }
}
</style>
