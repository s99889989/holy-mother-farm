<template>

  <div>
    <SitePageHero cover="/images/restaurant/restaurant-cover.png" title="我的紀錄"/>

    <section class="profile-section">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-12 col-md-8 col-lg-7">

            <!-- 未登入 -->
            <div v-if="!customer" class="profile-empty text-center">
              <p class="profile-empty__hint">請先登入 Google 帳號查看您的訂位與訂餐紀錄</p>
              <GoogleLoginButton @login="onLogin"/>
            </div>

            <!-- 已登入 -->
            <template v-else>

              <!-- 帳號資訊 -->
              <div class="profile-account">
                <div class="profile-account__left">
                  <div class="profile-account__avatar">
                    <img
                      v-if="customer.picture"
                      :src="customer.picture"
                      :alt="customer.name"
                      class="profile-account__avatar-img"
                    >
                    <span v-else>{{ customer.name?.charAt(0)?.toUpperCase() || '?' }}</span>
                  </div>
                  <div class="profile-account__info">
                    <p class="profile-account__name">{{ customer.name }}</p>
                    <p class="profile-account__email">{{ customer.email }}</p>
                  </div>
                </div>
                <button @click="logout" class="profile-account__logout-btn">登出</button>
              </div>

              <!-- Tab 切換 -->
              <div class="profile-tabs">
                <button
                  v-for="tab in tabs"
                  :key="tab.key"
                  @click="activeTab = tab.key"
                  class="profile-tab"
                  :class="{ 'profile-tab--active': activeTab === tab.key }"
                >
                  {{ tab.label }}
                </button>
              </div>

              <!-- 訂位紀錄 -->
              <div v-if="activeTab === 'bookings'">
                <div v-if="bookingsLoading" class="profile-loading">載入中…</div>
                <div v-else-if="bookings.length === 0" class="profile-empty-tab">
                  尚無訂位紀錄
                </div>
                <div v-else>
                  <div v-for="b in bookings" :key="b.id" class="profile-card">
                    <div class="profile-card__date profile-card__date--teal">
                      <p class="profile-card__date-month">{{ b.date?.substring(0, 7) }}</p>
                      <p class="profile-card__date-day profile-card__date-day--teal">{{ b.date?.substring(8, 10) }}</p>
                    </div>
                    <div class="profile-card__body">
                      <div class="profile-card__row">
                        <span class="profile-card__name">{{ b.name }}</span>
                        <span class="profile-badge" :class="statusClass(b.status)">{{ b.status }}</span>
                      </div>
                      <div class="profile-card__meta">
                        <span>🕐 {{ b.time }}</span>
                        <span>👥 {{ b.guests }} 人</span>
                        <span v-if="b.diet">🍽 {{ b.diet }}</span>
                        <span v-if="b.phone">📞 {{ b.phone }}</span>
                      </div>
                      <p v-if="b.note" class="profile-card__note">{{ b.note }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 便當紀錄 -->
              <div v-if="activeTab === 'lunches'">
                <div v-if="lunchesLoading" class="profile-loading">載入中…</div>
                <div v-else-if="lunches.length === 0" class="profile-empty-tab">
                  尚無便當訂購紀錄
                </div>
                <div v-else>
                  <div v-for="l in lunches" :key="l.id" class="profile-card">
                    <div class="profile-card__date profile-card__date--amber">
                      <p class="profile-card__date-month">{{ l.date?.substring(0, 7) }}</p>
                      <p class="profile-card__date-day profile-card__date-day--amber">{{ l.date?.substring(8, 10) }}</p>
                    </div>
                    <div class="profile-card__body">
                      <div class="profile-card__row">
                        <span class="profile-card__name">{{ l.name }}</span>
                        <span class="profile-badge" :class="statusClass(l.status)">{{ l.status }}</span>
                      </div>
                      <div class="profile-card__meta">
                        <span>🕐 取餐 {{ l.time }}</span>
                        <span>🥩 葷 {{ l.meatQty }} 盒</span>
                        <span>🥦 素 {{ l.vegQty }} 盒</span>
                        <span>共 {{ l.meatQty + l.vegQty }} 盒</span>
                      </div>
                      <p v-if="l.note" class="profile-card__note">{{ l.note }}</p>
                    </div>
                  </div>
                </div>
              </div>

            </template>

            <!-- 回首頁 -->
            <div class="text-center mt-5 pb-5">
              <NuxtLink to="/" class="profile-home-btn">回聖母健康農莊首頁</NuxtLink>
            </div>

          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import {ref, computed, onMounted, watch} from 'vue'
import {useCommonStore} from '~/stores/common.js'
import {useCustomerStore} from '~/stores/customer.js'
import GoogleLoginButton from '~/components/GoogleLoginButton.vue'

const commonStore = useCommonStore()
const customerStore = useCustomerStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/customer')

const customer = computed(() => customerStore.customer)
const activeTab = ref('bookings')
const tabs = [
  {key: 'bookings', label: '訂位紀錄'},
  {key: 'lunches', label: '便當紀錄'},
]

const bookings = ref([])
const lunches = ref([])
const bookingsLoading = ref(false)
const lunchesLoading = ref(false)

const fetchAll = async () => {
  bookingsLoading.value = true
  lunchesLoading.value = true
  try {
    const [b, l] = await Promise.all([
      fetch(`${BASE.value}/bookings`, {credentials: 'include'}).then(r => r.json()),
      fetch(`${BASE.value}/lunches`, {credentials: 'include'}).then(r => r.json()),
    ])
    bookings.value = Array.isArray(b) ? b : []
    lunches.value = Array.isArray(l) ? l : []
  } catch {
  } finally {
    bookingsLoading.value = false
    lunchesLoading.value = false
  }
}

const onLogin = async () => {
  await fetchAll()
}

const logout = async () => {
  await fetch(`${BASE.value}/logout`, {method: 'POST', credentials: 'include'})
  customerStore.clearCustomer()
  bookings.value = []
  lunches.value = []
}

const statusClass = (status) => {
  const map = {
    '待確認': 'profile-badge--warning',
    '已確認': 'profile-badge--success',
    '已取餐': 'profile-badge--muted',
    '已取消': 'profile-badge--danger',
  }
  return map[status] || 'profile-badge--muted'
}

onMounted(async () => {
  if (customer.value) await fetchAll()
})

watch(customer, async (c) => {
  if (c) await fetchAll()
  else {
    bookings.value = []
    lunches.value = []
  }
})
</script>

<style scoped>
.profile-section {
  background-color: #f5f0e8;
  padding: 40px 0 60px;
}

/* ── 未登入 ── */
.profile-empty {
  background: #fff;
  border: 2px dashed #b8d8d0;
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
}

.profile-empty__hint {
  font-size: 15px;
  color: #888;
  margin-bottom: 20px;
  text-align: center;
}

/* ── 帳號資訊卡 ── */
.profile-account {
  margin-top: 60px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: left;
}

.profile-account__left {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.profile-account__avatar {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: 50%;
  background-color: #1FC29C;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  text-align: center;
}

.profile-account__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.profile-account__info {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.profile-account__name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0;
  text-align: left;
  line-height: 1.4;
}

.profile-account__email {
  font-size: 12px;
  color: #aaa;
  margin: 0;
  text-align: left;
  line-height: 1.4;
}

.profile-account__logout-btn {
  font-size: 12px;
  color: #aaa;
  background: none;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 5px 12px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.profile-account__logout-btn:hover {
  color: #e74c3c;
  border-color: #e74c3c;
}

/* ── Tab ── */
.profile-tabs {
  display: flex;
  flex-direction: row;
  border-bottom: 2px solid #e0d8cc;
  margin-bottom: 20px;
  text-align: left;
}

.profile-tab {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #888;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  text-align: center;
}

.profile-tab--active {
  color: #1FC29C;
  border-bottom-color: #1FC29C;
}

/* ── 卡片 ── */
.profile-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  text-align: left;
}

.profile-card__date {
  flex-shrink: 0;
  width: 56px;
  min-width: 56px;
  text-align: center;
  border-radius: 12px;
  padding: 8px 4px;
}

.profile-card__date--teal {
  background-color: #eef7f5;
}

.profile-card__date--amber {
  background-color: #fff8ee;
}

.profile-card__date-month {
  font-size: 11px;
  color: #aaa;
  margin: 0;
  text-align: center;
}

.profile-card__date-day {
  font-size: 22px;
  font-weight: 900;
  margin: 0;
  line-height: 1.2;
  text-align: center;
}

.profile-card__date-day--teal {
  color: #1FC29C;
}

.profile-card__date-day--amber {
  color: #f59e0b;
}

.profile-card__body {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.profile-card__row {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.profile-card__name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  text-align: left;
}

.profile-card__meta {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  text-align: left;
}

.profile-card__note {
  font-size: 12px;
  color: #bbb;
  font-style: italic;
  margin: 4px 0 0;
  text-align: left;
}

/* ── 狀態 Badge ── */
.profile-badge {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 20px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
}

.profile-badge--warning {
  background-color: #fff3cd;
  color: #856404;
}

.profile-badge--success {
  background-color: #d1f0e8;
  color: #0d6e4f;
}

.profile-badge--muted {
  background-color: #f0f0f0;
  color: #888;
}

.profile-badge--danger {
  background-color: #fde8e8;
  color: #c0392b;
}

/* ── Loading / Empty ── */
.profile-loading {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: #aaa;
}

.profile-empty-tab {
  text-align: center;
  padding: 48px 24px;
  font-size: 14px;
  color: #aaa;
  background: #fff;
  border: 2px dashed #b8d8d0;
  border-radius: 16px;
}

/* ── 回首頁按鈕 ── */
.profile-home-btn {
  display: inline-block;
  padding: 10px 32px;
  background-color: #1FC29C;
  color: #fff !important;
  border-radius: 30px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s;
}

.profile-home-btn:hover {
  background-color: #17a884;
  text-decoration: none;
}
</style>
