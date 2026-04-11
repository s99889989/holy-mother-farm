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
        <!-- Section Header -->
        <div class="section-header">
          <h2 class="section-title">{{ section.name }}</h2>
          <div class="section-actions">
            <button class="icon-btn" title="篩選">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
            <button class="icon-btn" title="排序">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button class="icon-btn" title="搜尋">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
        </div>

        <!-- Cards Grid -->
        <div class="cards-grid">
          <div
            v-for="item in section.items"
            :key="item.id"
            class="card"
            @click="openModal(item)"
          >
            <div class="card-img-wrap">
              <img v-if="item.image" :src="item.image" :alt="item.name" class="card-img" />
              <div v-else class="card-img-placeholder" />
            </div>
            <div class="card-body">
              <p class="card-name">{{ item.name }}</p>
              <div class="card-tags">
                <span
                  v-for="tag in item.tags"
                  :key="tag.label"
                  class="tag"
                  :class="tag.color"
                >{{ tag.label }}</span>
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
          <div class="modal-img-wrap">
            <img v-if="selectedItem.image" :src="selectedItem.image" :alt="selectedItem.name" class="modal-img" />
            <div v-else class="modal-img-placeholder" />
          </div>
          <div class="modal-content">
            <h3 class="modal-title">{{ selectedItem.name }}</h3>
            <div class="card-tags" style="margin-top:8px">
              <span
                v-for="tag in selectedItem.tags"
                :key="tag.label"
                class="tag"
                :class="tag.color"
              >{{ tag.label }}</span>
            </div>
            <p v-if="selectedItem.description" class="modal-desc">{{ selectedItem.description }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 傳入 Banner 圖片網址（選填），不傳則顯示漸層背景
const props = defineProps({
  heroBanner: { type: String, default: '' }
})

const selectedItem = ref(null)

function openModal(item) {
  selectedItem.value = item
}
function closeModal() {
  selectedItem.value = null
}

const sections = ref([
  {
    id: 'agape',
    name: '愛加倍靈修中心',
    items: [
      {
        id: 'agape-1',
        name: '兩大床四人客房',
        image: '',
        tags: [{ label: '4000元/晚', color: 'tag-yellow' }],
        description: '寬敞四人房，配備兩張大床，適合家庭或小團體入住。'
      },
      {
        id: 'agape-2',
        name: '愛加倍交誼廳',
        image: '',
        tags: [{ label: '一拼報2500元', color: 'tag-green' }],
        description: '提供舒適的交誼空間，適合小型聚會與交流。'
      },
      {
        id: 'agape-3',
        name: '靜心室',
        image: '',
        tags: [{ label: '一拼報2500元', color: 'tag-green' }],
        description: '靜心冥想空間，適合個人靈修與放鬆。'
      }
    ]
  },
  {
    id: 'heli',
    name: '合力居',
    items: [
      {
        id: 'heli-1',
        name: '雙床房',
        image: '',
        tags: [],
        description: ''
      },
      {
        id: 'heli-2',
        name: '有窗雙人房',
        image: '',
        tags: [],
        description: ''
      },
      {
        id: 'heli-3',
        name: '無窗雙人房',
        image: '',
        tags: [],
        description: ''
      },
      {
        id: 'heli-4',
        name: '有窗單人房',
        image: '',
        tags: [],
        description: ''
      },
      {
        id: 'heli-5',
        name: '無窗單人房',
        image: '',
        tags: [],
        description: ''
      }
    ]
  },
  {
    id: 'sport',
    name: '快樂運動館',
    items: [
      {
        id: 'sport-1',
        name: '植物扦插',
        image: '',
        tags: [
          { label: '成品帶回家', color: 'tag-brown' },
          { label: '200元/人', color: 'tag-yellow' },
          { label: '體驗時長5', color: 'tag-gray' }
        ],
        description: '學習植物扦插技巧，帶著自己親手種植的植物回家。'
      },
      {
        id: 'sport-2',
        name: '手洗窯玉',
        image: '',
        tags: [
          { label: '200元/人', color: 'tag-yellow' },
          { label: '即時體驗', color: 'tag-blue' },
          { label: '即時體驗', color: 'tag-blue' },
          { label: '體驗時長50分鐘', color: 'tag-gray' }
        ],
        description: '體驗陶藝製作，在農莊享受手工創作的樂趣。'
      },
      {
        id: 'sport-3',
        name: '無患子溝渠液',
        image: '',
        tags: [
          { label: '250元/人', color: 'tag-yellow' },
          { label: '體驗時長50分鐘', color: 'tag-gray' },
          { label: '季節限定', color: 'tag-red' }
        ],
        description: '使用天然無患子製作環保清潔液，認識自然素材。'
      }
    ]
  },
  {
    id: 'kitchen',
    name: '樂智家園盟親廚房',
    items: [
      {
        id: 'kitchen-1',
        name: '手作香草魚',
        image: '',
        tags: [
          { label: '即時體驗', color: 'tag-blue' },
          { label: '300元/人', color: 'tag-yellow' },
          { label: '體驗時長50分鐘', color: 'tag-gray' }
        ],
        description: '學習以新鮮香草料理魚料理，品嚐農莊在地食材的美味。'
      },
      {
        id: 'kitchen-2',
        name: '植物紮托染',
        image: '',
        tags: [
          { label: '即時體驗', color: 'tag-blue' },
          { label: '350元/人', color: 'tag-yellow' },
          { label: '體驗時長50分鐘', color: 'tag-gray' }
        ],
        description: '利用天然植物染料體驗傳統紮染工藝，創作獨一無二的作品。'
      },
      {
        id: 'kitchen-3',
        name: '醬滷豆腐',
        image: '',
        tags: [
          { label: '體驗時長30分鐘', color: 'tag-gray' },
          { label: '1000元/組(3-5人)', color: 'tag-yellow' }
        ],
        description: '學習傳統醬滷豆腐製作，感受台灣在地飲食文化。'
      }
    ]
  },
  {
    id: 'camping',
    name: '露營地租借',
    items: [
      {
        id: 'camp-1',
        name: '環形運動',
        image: '',
        tags: [
          { label: '250元/人', color: 'tag-yellow' },
          { label: '體驗時長50分鐘', color: 'tag-gray' }
        ],
        description: '在寬闊戶外空間體驗環形團體運動，增進團隊向心力。'
      },
      {
        id: 'camp-2',
        name: '桶油運動',
        image: '',
        tags: [
          { label: '350元/人', color: 'tag-yellow' },
          { label: '體驗時長50分鐘', color: 'tag-gray' }
        ],
        description: '趣味性十足的桶油競技，適合各年齡層參與。'
      },
      {
        id: 'camp-3',
        name: '地板滾球體驗',
        image: '',
        tags: [
          { label: '400元/人', color: 'tag-yellow' },
          { label: '體驗時長60分鐘', color: 'tag-gray' }
        ],
        description: '體驗地板滾球競賽，老少咸宜的益智運動。'
      },
      {
        id: 'camp-4',
        name: '地板滾球競賽',
        image: '',
        tags: [
          { label: '體驗時長90分鐘', color: 'tag-gray' },
          { label: '350元/人', color: 'tag-yellow' }
        ],
        description: '進階版地板滾球正式競賽，激烈精彩、樂趣無窮。'
      }
    ]
  }
])
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&family=Noto+Sans+TC:wght@300;400;500&display=swap');

.catalog-page {
  font-family: 'Noto Sans TC', sans-serif;
  background: #faf9f7;
  min-height: 100vh;
  color: #2c2c2c;
}

/* Hero */
.hero-banner {
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: linear-gradient(135deg, #f9e4c8 0%, #ffd5a0 50%, #ffb98a 100%);
}
.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

/* Content */
.content-wrapper {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 24px 60px;
}

.page-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 6px;
}
.page-subtitle {
  font-size: 13px;
  color: #666;
  margin: 0 0 2px;
}
.page-contact {
  font-size: 13px;
  color: #666;
  margin: 0 0 32px;
}

/* Section */
.section {
  margin-bottom: 36px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1.5px solid #e8e4df;
  padding-bottom: 8px;
  margin-bottom: 14px;
}
.section-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}
.section-actions {
  display: flex;
  gap: 4px;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  color: #888;
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover {
  background: #ede9e4;
  color: #333;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.card {
  background: #ffffff;
  border: 1px solid #e8e4df;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
}
.card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
  transform: translateY(-2px);
}

.card-img-wrap {
  width: 100%;
  aspect-ratio: 4/3;
  overflow: hidden;
  background: #f0ede8;
}
.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.card:hover .card-img {
  transform: scale(1.04);
}
.card-img-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f0ede8 0%, #e8e3dc 100%);
}

.card-body {
  padding: 10px 10px 12px;
}
.card-name {
  font-size: 13px;
  font-weight: 500;
  color: #2c2c2c;
  margin: 0 0 6px;
  line-height: 1.4;
}
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Tags */
.tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 20px;
  font-weight: 400;
  white-space: nowrap;
}
.tag-yellow { background: #fff3cd; color: #856404; }
.tag-green  { background: #d1f5e0; color: #1a6b3a; }
.tag-blue   { background: #dbeafe; color: #1d4ed8; }
.tag-brown  { background: #ede0d4; color: #6b3a1f; }
.tag-gray   { background: #f0f0f0; color: #555; }
.tag-red    { background: #fde8e8; color: #991b1b; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-box {
  background: #fff;
  border-radius: 12px;
  max-width: 420px;
  width: 100%;
  overflow: hidden;
  position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255,255,255,0.9);
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  color: #555;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}
.modal-close:hover { background: #fff; color: #111; }
.modal-img-wrap {
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: #f0ede8;
}
.modal-img { width: 100%; height: 100%; object-fit: cover; }
.modal-img-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #f0ede8 0%, #e8e3dc 100%); }
.modal-content { padding: 18px 20px 24px; }
.modal-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
}
.modal-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #555;
  margin: 12px 0 0;
}

/* Modal transition */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box { transition: transform 0.2s; }
.modal-enter-from .modal-box, .modal-leave-to .modal-box { transform: scale(0.95) translateY(10px); }

/* Responsive */
@media (max-width: 600px) {
  .cards-grid { grid-template-columns: repeat(2, 1fr); }
  .content-wrapper { padding: 20px 16px 48px; }
  .page-title { font-size: 18px; }
}
@media (max-width: 380px) {
  .cards-grid { grid-template-columns: 1fr; }
}
</style>
