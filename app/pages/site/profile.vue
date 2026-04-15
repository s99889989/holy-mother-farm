<template>
  <div>
    <SitePageHero cover="/images/restaurant/restaurant-cover.png" title="我的紀錄" />

    <section class="py-8" style="background-color: #f5f0e8;">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">

        <!-- 未登入 -->
        <div v-if="!customer" class="rounded-2xl border-2 border-dashed p-10 bg-white text-center" style="border-color: #b8d8d0;">
          <p class="text-gray-500 mb-6">請先登入 Google 帳號查看您的訂位與訂餐紀錄</p>
          <GoogleLoginButton @login="onLogin" />
        </div>

        <!-- 已登入 -->
        <template v-else>

          <!-- 帳號資訊 -->
          <div class="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 mb-6 bg-white shadow-sm border border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style="background-color:#5bbfbf;">
                {{ customer.name?.charAt(0) || '?' }}
              </div>
              <div>
                <p class="font-semibold text-gray-800">{{ customer.name }}</p>
                <p class="text-xs text-gray-400">{{ customer.email }}</p>
              </div>
            </div>
            <button @click="logout" class="text-xs text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 border border-gray-200 rounded-lg">
              登出
            </button>
          </div>

          <!-- Tab 切換 -->
          <div class="flex gap-0 border-b-2 mb-6" style="border-color: #e0d8cc;">
            <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
              class="px-6 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-0.5"
              :style="activeTab === tab.key ? 'color:#5bbfbf; border-color:#5bbfbf;' : 'color:#888; border-color:transparent;'">
              {{ tab.label }}
            </button>
          </div>

          <!-- 訂位紀錄 -->
          <div v-if="activeTab === 'bookings'">
            <div v-if="bookingsLoading" class="text-center py-10 text-gray-400 text-sm">載入中…</div>
            <div v-else-if="bookings.length === 0"
              class="text-center py-12 text-gray-400 text-sm rounded-2xl border-2 border-dashed bg-white" style="border-color:#b8d8d0;">
              尚無訂位紀錄
            </div>
            <div v-else class="space-y-3">
              <div v-for="b in bookings" :key="b.id"
                class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                <!-- 日期區塊 -->
                <div class="flex-shrink-0 w-14 text-center rounded-xl py-2 px-1" style="background-color:#eef7f5;">
                  <p class="text-xs text-gray-400">{{ b.date?.substring(0, 7) }}</p>
                  <p class="text-xl font-black" style="color:#5bbfbf;">{{ b.date?.substring(8, 10) }}</p>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="font-semibold text-gray-800">{{ b.name }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                      :class="statusClass(b.status)">{{ b.status }}</span>
                  </div>
                  <div class="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>🕐 {{ b.time }}</span>
                    <span>👥 {{ b.guests }} 人</span>
                    <span v-if="b.diet">🍽 {{ b.diet }}</span>
                    <span v-if="b.phone">📞 {{ b.phone }}</span>
                  </div>
                  <p v-if="b.note" class="text-xs text-gray-400 mt-1 italic">{{ b.note }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 便當紀錄 -->
          <div v-if="activeTab === 'lunches'">
            <div v-if="lunchesLoading" class="text-center py-10 text-gray-400 text-sm">載入中…</div>
            <div v-else-if="lunches.length === 0"
              class="text-center py-12 text-gray-400 text-sm rounded-2xl border-2 border-dashed bg-white" style="border-color:#b8d8d0;">
              尚無便當訂購紀錄
            </div>
            <div v-else class="space-y-3">
              <div v-for="l in lunches" :key="l.id"
                class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                <div class="flex-shrink-0 w-14 text-center rounded-xl py-2 px-1 bg-amber-50">
                  <p class="text-xs text-gray-400">{{ l.date?.substring(0, 7) }}</p>
                  <p class="text-xl font-black text-amber-500">{{ l.date?.substring(8, 10) }}</p>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="font-semibold text-gray-800">{{ l.name }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                      :class="statusClass(l.status)">{{ l.status }}</span>
                  </div>
                  <div class="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>🕐 取餐 {{ l.time }}</span>
                    <span>🥩 葷 {{ l.meatQty }} 盒</span>
                    <span>🥦 素 {{ l.vegQty }} 盒</span>
                    <span>共 {{ l.meatQty + l.vegQty }} 盒</span>
                  </div>
                  <p v-if="l.note" class="text-xs text-gray-400 mt-1 italic">{{ l.note }}</p>
                </div>
              </div>
            </div>
          </div>

        </template>

        <!-- 回首頁 -->
        <div class="mt-10 text-center">
          <NuxtLink to="/site" class="inline-block px-8 py-3 rounded-full text-sm font-medium text-white" style="background-color:#5bbfbf;">
            回聖母健康農莊首頁
          </NuxtLink>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'
import GoogleLoginButton from '~/components/GoogleLoginButton.vue'

definePageMeta({ layout: 'site' })

const commonStore = useCommonStore()
const BASE = computed(() => commonStore.data.main_url + '/holy/customer')

import { computed } from 'vue'

const customer = ref(null)
const activeTab = ref('bookings')
const tabs = [
  { key: 'bookings', label: '訂位紀錄' },
  { key: 'lunches',  label: '便當紀錄' },
]

const bookings        = ref([])
const lunches         = ref([])
const bookingsLoading = ref(false)
const lunchesLoading  = ref(false)

const fetchMe = async () => {
  try {
    const data = await (await fetch(`${BASE.value}/me`, { credentials: 'include' })).json()
    if (data.error) { customer.value = null; return }
    customer.value = data
    await fetchAll()
  } catch { customer.value = null }
}

const fetchAll = async () => {
  bookingsLoading.value = true
  lunchesLoading.value  = true
  try {
    const [b, l] = await Promise.all([
      fetch(`${BASE.value}/bookings`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${BASE.value}/lunches`,  { credentials: 'include' }).then(r => r.json()),
    ])
    bookings.value = Array.isArray(b) ? b : []
    lunches.value  = Array.isArray(l) ? l : []
  } catch {}
  finally { bookingsLoading.value = false; lunchesLoading.value = false }
}

const onLogin = async (data) => {
  customer.value = data
  await fetchAll()
}

const logout = async () => {
  await fetch(`${BASE.value}/logout`, { method: 'POST', credentials: 'include' })
  customer.value = null
  bookings.value = []
  lunches.value  = []
}

const statusClass = (status) => {
  const map = {
    '待確認': 'bg-amber-100 text-amber-700',
    '已確認': 'bg-teal-100 text-teal-700',
    '已取餐': 'bg-gray-100 text-gray-500',
    '已取消': 'bg-red-100 text-red-400',
  }
  return map[status] || 'bg-gray-100 text-gray-500'
}

onMounted(fetchMe)
</script>
