<script setup>
import {ref, computed, onMounted, watch} from 'vue'
import {useCommonStore} from '~/stores/common.js'
import {useCustomerStore} from '~/stores/customer.js'
import GoogleLoginButton from '~/components/GoogleLoginButton.vue'

useSiteHead()

onMounted(() => {
  window.onscroll = () => {
    const btn = document.getElementById('myBtn')
    if (btn) {
      btn.style.display =
        document.body.scrollTop > 20 || document.documentElement.scrollTop > 20
          ? 'block'
          : 'none'
    }
  }
})

function topFunction() {
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
}

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
    const cid = customerStore.customer?.id ?? ''
    const [b, l] = await Promise.all([
      fetch(`${BASE.value}/bookings?customerId=${cid}`).then(r => r.json()),
      fetch(`${BASE.value}/lunches?customerId=${cid}`).then(r => r.json()),
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
        <NuxtLink to="/front/public">首頁</NuxtLink>
        > 田園餐廳 > 我的紀錄
      </section>
      <section id="content" class="mx-3 mx-sm-5">
        <div class="bar-green bar-green-center"></div>
        <div class="row bg-greenweb py-5 px-sm-2">
          <div class="col-12 px-sm-4">
            <div class="row justify-content-center no-gutters">
              <div class="col-12 col-md-8 col-lg-7 rounded bg-lightGreen py-4 px-3 px-sm-4">

                <!-- 未登入 -->
                <div v-if="!customer" class="profile-empty text-center">
                  <p class="profile-empty__hint">請先登入 Google 帳號查看您的訂位與訂餐紀錄</p>
                  <GoogleLoginButton @login="onLogin"/>
                </div>

                <!-- 已登入 -->
                <template v-else>

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
                          <p class="profile-card__date-day profile-card__date-day--teal">{{
                              b.date?.substring(8, 10)
                            }}</p>
                        </div>
                        <div class="profile-card__body">
                          <div class="profile-card__row">
                            <span class="profile-card__name">{{ b.name }}</span>
                            <span class="profile-badge" :class="statusClass(b.status)">{{ b.status }}</span>
                          </div>
                          <div class="profile-card__meta">
                            <span>🕐 {{ b.time }}</span>
                            <span v-if="b.meatQty > 0">🍖 葷 {{ b.meatQty }}</span>
                            <span v-if="b.fullVegQty > 0">🌿 全素 {{ b.fullVegQty }}</span>
                            <span v-if="b.eggVegQty > 0">🥚 蛋奶素 {{ b.eggVegQty }}</span>
                            <span v-if="b.spiceVegQty > 0">🧄 五辛素 {{ b.spiceVegQty }}</span>
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
                          <p class="profile-card__date-day profile-card__date-day--amber">{{
                              l.date?.substring(8, 10)
                            }}</p>
                        </div>
                        <div class="profile-card__body">
                          <div class="profile-card__row">
                            <span class="profile-card__name">{{ l.name }}</span>
                            <span class="profile-badge" :class="statusClass(l.status)">{{ l.status }}</span>
                          </div>
                          <div class="profile-card__meta">
                            <span>🕐 取餐 {{ l.time }}</span>
                            <span v-if="l.meatQty > 0">🍖 葷 {{ l.meatQty }}</span>
                            <span v-if="l.fullVegQty > 0">🌿 全素 {{ l.fullVegQty }}</span>
                            <span v-if="l.eggVegQty > 0">🥚 蛋奶素 {{ l.eggVegQty }}</span>
                            <span v-if="l.spiceVegQty > 0">🧄 五辛素 {{ l.spiceVegQty }}</span>
                            <span>共 {{
                                (l.meatQty || 0) + (l.fullVegQty || 0) + (l.eggVegQty || 0) + (l.spiceVegQty || 0)
                              }} 盒</span>
                          </div>
                          <p v-if="l.note" class="profile-card__note">{{ l.note }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </template>

              </div>
            </div>
          </div>
        </div>
        <div class="bar-green bar-green-center2"></div>
      </section>
    </div>

    <div class="container">
      <div class="col-12 text-center my-5">
        <div class="btn col-md-6 cus-button">
          <NuxtLink to="/front/public">回聖母健康農莊首頁</NuxtLink>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="bar-waterDrop mt-5 mx-lg-5"></div>
    </div>

    <SiteFooter/>

    <button @click="topFunction" id="myBtn" title="Go to top" class="d-lg-none">
      <i class="fas fa-chevron-up"></i>
    </button>
  </div>
</template>

<style lang="scss">
@use '~/assets/scss/all' as *;
</style>

<style scoped>
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
}

/* ── Tab ── */
.profile-tabs {
  display: flex;
  flex-direction: row;
  border-bottom: 2px solid #e0d8cc;
  margin-bottom: 20px;
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
}

.profile-card__date-day {
  font-size: 22px;
  font-weight: 900;
  margin: 0;
  line-height: 1.2;
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
}

.profile-card__meta {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.profile-card__note {
  font-size: 12px;
  color: #bbb;
  font-style: italic;
  margin: 4px 0 0;
}

/* ── 狀態 Badge ── */
.profile-badge {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 20px;
  font-weight: 500;
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
</style>
