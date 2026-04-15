<template>
  <div class="pt-20 min-h-screen bg-gradient-to-b from-stone-50 to-white">
    <div class="max-w-lg mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">

      <!-- 成功圖示 -->
      <div class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
        :class="isLunch ? 'bg-amber-100' : 'bg-green-100'">
        <svg class="w-10 h-10" :class="isLunch ? 'text-amber-600' : 'text-green-600'"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold text-stone-800 mb-2">
        {{ isLunch ? '便當已預訂！' : '預約已送出！' }}
      </h1>
      <p class="text-stone-400 text-base mb-10">感謝您，我們將盡快以電話確認。</p>

      <!-- 摘要卡 -->
      <div class="bg-white rounded-3xl shadow-sm border border-stone-100 text-left overflow-hidden mb-8">
        <div class="px-6 py-4" :class="isLunch ? 'bg-amber-600' : 'bg-green-700'">
          <p class="text-xs font-semibold uppercase tracking-widest opacity-70 text-white">
            {{ isLunch ? '便當預訂摘要' : '訂位摘要' }}
          </p>
          <p class="text-white font-bold text-lg mt-0.5">{{ route.query.name }} 的{{ isLunch ? '便當' : '預約' }}</p>
        </div>
        <div class="divide-y divide-stone-50">
          <div v-for="row in summaryRows" :key="row.label"
            class="flex justify-between items-center px-6 py-3.5">
            <span class="text-sm text-stone-400">{{ row.label }}</span>
            <span class="text-sm font-semibold text-stone-800">{{ row.value }}</span>
          </div>
        </div>
      </div>

      <!-- 流程說明 -->
      <div class="rounded-2xl px-5 py-4 text-sm text-left mb-10 space-y-1"
        :class="isLunch ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'">
        <p class="font-semibold mb-1.5">📞 接下來的流程</p>
        <p>· 目前狀態為「待確認」</p>
        <p>· 農莊將於一個工作日內來電確認</p>
        <p>· 如有臨時更動，請提前來電告知</p>
      </div>

      <!-- 按鈕 -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <NuxtLink to="/site"
          class="px-6 py-3 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors text-sm font-medium">
          回到首頁
        </NuxtLink>
        <NuxtLink v-if="isLunch" to="/site/booking"
          class="px-6 py-3 rounded-full bg-green-700 hover:bg-green-800 text-white transition-colors text-sm font-semibold">
          同時訂位
        </NuxtLink>
        <NuxtLink v-else to="/site/restaurant"
          class="px-6 py-3 rounded-full bg-green-700 hover:bg-green-800 text-white transition-colors text-sm font-semibold">
          查看今日菜色
        </NuxtLink>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ layout: 'site' })

const route   = useRoute()
const isLunch = computed(() => route.query.type === 'lunch')

const weekdays = ['週日','週一','週二','週三','週四','週五','週六']
const dateDisplay = computed(() => {
  if (!route.query.date) return ''
  const d = new Date(route.query.date)
  return `${route.query.date}　${weekdays[d.getDay()]}`
})

const dietLabel = { '葷食': '葷食', '素食': '全素', '蛋奶素': '蛋奶素', '五辛素': '五辛素' }

const summaryRows = computed(() => {
  const q = route.query
  if (isLunch.value) {
    return [
      { label: '日期',   value: dateDisplay.value },
      { label: '取餐',   value: q.time },
      { label: '葷食',   value: `${q.meatQty} 盒` },
      { label: '素食',   value: `${q.vegQty} 盒` },
      { label: '合計',   value: `${Number(q.meatQty) + Number(q.vegQty)} 盒` },
    ]
  }
  return [
    { label: '日期', value: dateDisplay.value },
    { label: '時間', value: q.time },
    { label: '人數', value: `${q.guests} 人` },
    { label: '葷素', value: dietLabel[q.diet] || q.diet || '未指定' },
  ]
})
</script>
