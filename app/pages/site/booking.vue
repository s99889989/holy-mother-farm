<template>
  <div class="pt-20">

    <!-- ══ Page Hero ══ -->
    <section class="py-14 sm:py-20 bg-gradient-to-b from-green-50 to-white">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <p class="text-green-600 text-sm font-semibold tracking-widest uppercase mb-3">Reservation</p>
        <h1 class="text-3xl sm:text-4xl font-bold text-stone-800 mb-3">線上訂位</h1>
        <p class="text-stone-400 text-base leading-relaxed">請填寫以下資料完成預約，我們將盡快與您確認。</p>
      </div>
    </section>

    <section class="pb-20">
      <div class="max-w-2xl mx-auto px-4 sm:px-6">
        <div class="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">

          <!-- 步驟列 -->
          <div class="flex border-b border-stone-100">
            <div
              v-for="(step, idx) in steps" :key="step"
              class="flex-1 py-3.5 text-center text-sm font-medium relative"
              :class="currentStep === idx ? 'text-green-700 bg-green-50' : currentStep > idx ? 'text-green-600' : 'text-stone-300'"
            >
              <span class="inline-flex items-center gap-1.5">
                <svg v-if="currentStep > idx" class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                <span v-else class="w-5 h-5 rounded-full text-xs flex items-center justify-center border font-bold"
                  :class="currentStep === idx ? 'bg-green-700 text-white border-green-700' : 'border-stone-200 text-stone-300'">
                  {{ idx + 1 }}
                </span>
                {{ step }}
              </span>
              <div v-if="currentStep === idx" class="absolute bottom-0 inset-x-0 h-0.5 bg-green-600" />
            </div>
          </div>

          <div class="p-6 sm:p-8">

            <!-- ══ Step 1：日期選擇（日曆）══ -->
            <div v-if="currentStep === 0">
              <h2 class="text-lg font-bold text-stone-800 mb-5">選擇用餐日期</h2>

              <!-- 日曆 -->
              <div class="bg-stone-50 rounded-2xl p-4 mb-5">
                <!-- 月份切換 -->
                <div class="flex items-center justify-between mb-4">
                  <button @click="prevMonth"
                    :disabled="!canGoPrevMonth"
                    class="p-2 rounded-xl transition-colors"
                    :class="canGoPrevMonth ? 'hover:bg-stone-200 text-stone-600' : 'text-stone-300 cursor-not-allowed'">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <span class="font-bold text-stone-800">{{ calYear }} 年 {{ calMonth }} 月</span>
                  <button @click="nextMonth" class="p-2 rounded-xl hover:bg-stone-200 text-stone-600 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>

                <!-- 星期標頭 -->
                <div class="grid grid-cols-7 mb-2">
                  <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                    class="text-center text-xs font-semibold text-stone-400 py-1">{{ w }}</div>
                </div>

                <!-- 日期格子 -->
                <div class="grid grid-cols-7 gap-1">
                  <div v-for="(day, idx) in calDays" :key="idx"
                    class="aspect-square flex items-center justify-center rounded-xl text-sm select-none transition-all"
                    :class="dayClass(day)"
                    @click="day.date && !day.disabled && selectCalDate(day.date)">
                    {{ day.label }}
                  </div>
                </div>
              </div>

              <!-- 已選日期顯示 -->
              <div v-if="form.date" class="bg-green-50 border border-green-100 rounded-2xl px-5 py-3.5 flex items-center gap-3">
                <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <div>
                  <p class="text-xs text-green-600 font-semibold">已選擇日期</p>
                  <p class="text-stone-800 font-bold">{{ selectedDateDisplay }}</p>
                </div>
              </div>
              <p v-if="errors.date" class="text-xs text-red-400 mt-2">{{ errors.date }}</p>
            </div>

            <!-- ══ Step 2：基本資料 ══ -->
            <div v-if="currentStep === 1">
              <h2 class="text-lg font-bold text-stone-800 mb-6">填寫資料</h2>
              <div class="space-y-5">

                <div>
                  <label class="block text-sm font-semibold text-stone-700 mb-1.5">姓名 <span class="text-red-400">*</span></label>
                  <input v-model="form.name" type="text" placeholder="請輸入姓名"
                    class="w-full px-4 py-3 rounded-xl border text-stone-800 outline-none transition-all text-sm"
                    :class="errors.name ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-stone-200 focus:ring-2 focus:ring-green-200 focus:border-green-400'" />
                  <p v-if="errors.name" class="text-xs text-red-400 mt-1.5">{{ errors.name }}</p>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-stone-700 mb-1.5">聯絡電話 <span class="text-red-400">*</span></label>
                  <input v-model="form.phone" type="tel" placeholder="請輸入電話"
                    class="w-full px-4 py-3 rounded-xl border text-stone-800 outline-none transition-all text-sm"
                    :class="errors.phone ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-stone-200 focus:ring-2 focus:ring-green-200 focus:border-green-400'" />
                  <p v-if="errors.phone" class="text-xs text-red-400 mt-1.5">{{ errors.phone }}</p>
                </div>

                <!-- 時間 + 人數 -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold text-stone-700 mb-1.5">用餐時間 <span class="text-red-400">*</span></label>
                    <select v-model="form.time"
                      class="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-800 outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 text-sm bg-white">
                      <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-stone-700 mb-1.5">用餐人數 <span class="text-red-400">*</span></label>
                    <div class="flex items-center gap-2">
                      <button @click="form.guests = Math.max(1, form.guests - 1)"
                        class="w-10 h-10 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center justify-center text-lg transition-colors flex-shrink-0">−</button>
                      <input v-model.number="form.guests" type="number" min="1" max="50"
                        class="flex-1 text-center px-2 py-2.5 rounded-xl border border-stone-200 text-stone-800 outline-none focus:ring-2 focus:ring-green-200 text-sm font-bold" />
                      <button @click="form.guests = Math.min(50, form.guests + 1)"
                        class="w-10 h-10 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center justify-center text-lg transition-colors flex-shrink-0">＋</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-stone-700 mb-1.5">備註</label>
                  <textarea v-model="form.note" rows="3" placeholder="過敏食材、特殊需求…"
                    class="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-800 outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 text-sm resize-none" />
                </div>
              </div>
            </div>

            <!-- ══ Step 3：葷素選擇 ══ -->
            <div v-if="currentStep === 2">
              <h2 class="text-lg font-bold text-stone-800 mb-2">葷素選擇</h2>
              <p class="text-sm text-stone-400 mb-6">請選擇您的飲食偏好，方便我們備料。</p>
              <div class="grid grid-cols-2 gap-3 mb-4">
                <button v-for="opt in dietOptions" :key="opt.value"
                  @click="form.diet = opt.value"
                  class="p-4 rounded-2xl border-2 text-left transition-all"
                  :class="form.diet === opt.value ? 'border-green-500 bg-green-50' : 'border-stone-100 hover:border-stone-200'">
                  <div class="text-2xl mb-2">{{ opt.icon }}</div>
                  <div class="font-semibold text-stone-800 text-sm">{{ opt.label }}</div>
                  <div class="text-xs text-stone-400 mt-0.5">{{ opt.desc }}</div>
                </button>
              </div>
              <p v-if="errors.diet" class="text-xs text-red-400 mb-2">{{ errors.diet }}</p>
              <div v-if="form.diet" class="bg-stone-50 rounded-2xl p-4 text-sm text-stone-600 flex items-center gap-3">
                <span class="text-xl">{{ dietOptions.find(o => o.value === form.diet)?.icon }}</span>
                <span>已選擇 <strong class="text-stone-800">{{ dietOptions.find(o => o.value === form.diet)?.label }}</strong></span>
              </div>
            </div>

            <!-- ══ Step 4：確認送出 ══ -->
            <div v-if="currentStep === 3">
              <h2 class="text-lg font-bold text-stone-800 mb-6">確認預約內容</h2>
              <div class="divide-y divide-stone-50 mb-6">
                <div v-for="row in summaryRows" :key="row.label"
                  class="flex justify-between items-center py-3.5">
                  <span class="text-sm text-stone-400 w-20 flex-shrink-0">{{ row.label }}</span>
                  <span class="text-sm font-semibold text-stone-800 text-right">{{ row.value }}</span>
                </div>
              </div>
              <p v-if="submitError" class="text-sm text-red-400 bg-red-50 rounded-xl px-4 py-3">{{ submitError }}</p>
            </div>

          </div>

          <!-- 底部按鈕 -->
          <div class="px-6 sm:px-8 pb-6 sm:pb-8 flex items-center justify-between gap-3">
            <button v-if="currentStep > 0" @click="currentStep--"
              class="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors text-sm font-medium">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              上一步
            </button>
            <div v-else />

            <button v-if="currentStep < steps.length - 1" @click="nextStep"
              class="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white transition-colors text-sm font-semibold ml-auto">
              下一步
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
            <button v-else @click="submit" :disabled="submitting"
              class="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white transition-colors text-sm font-semibold ml-auto">
              <div v-if="submitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {{ submitting ? '送出中…' : '確認預約' }}
            </button>
          </div>

        </div>

        <!-- 注意事項 -->
        <div class="mt-6 bg-amber-50 rounded-2xl p-5 text-sm text-amber-700 space-y-1.5">
          <p class="font-semibold mb-2">📋 預約注意事項</p>
          <p>· 請提前一日完成預約，以便我們備料。</p>
          <p>· 預約送出後為「待確認」狀態，我們將盡快電話確認。</p>
          <p>· 如需取消，請提前來電告知，謝謝。</p>
        </div>

        <!-- 前往便當預訂 -->
        <div class="mt-4 bg-green-50 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p class="font-semibold text-green-800 text-sm">需要外帶便當？</p>
            <p class="text-xs text-green-600 mt-0.5">前往便當預訂頁面</p>
          </div>
          <NuxtLink to="/site/lunch"
            class="flex-shrink-0 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-colors">
            便當預訂 →
          </NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useCommonStore } from '~/stores/common.js'
import { useRouter } from 'vue-router'

definePageMeta({ layout: 'site' })

const commonStore = useCommonStore()
const router = useRouter()
const BOOKING_BASE = computed(() => commonStore.data.main_url + '/holy/booking')

// ── 步驟 ──────────────────────────────────────────────────────────
const steps = ['選擇日期', '填寫資料', '葷素選擇', '確認送出']
const currentStep = ref(0)

// ── 表單 ──────────────────────────────────────────────────────────
const form = reactive({ name: '', phone: '', date: '', time: '12:00', guests: 2, diet: '', note: '' })
const errors = reactive({})
const submitting = ref(false)
const submitError = ref('')

const timeSlots = ['11:00','11:10','11:20','11:30','11:40','11:50','12:00','12:10','12:20','12:30','12:40','12:50','13:00']
const dietOptions = [
  { value: '葷食',   icon: '🍖', label: '葷食',   desc: '含肉類料理' },
  { value: '素食',   icon: '🌿', label: '全素',   desc: '不含蛋奶五辛' },
  { value: '蛋奶素', icon: '🥚', label: '蛋奶素', desc: '可食蛋奶製品' },
  { value: '五辛素', icon: '🧄', label: '五辛素', desc: '可食蔥薑蒜' },
]

// ── 日曆 ──────────────────────────────────────────────────────────
const today = new Date()
today.setHours(0, 0, 0, 0)
const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayStr = toStr(today)

const calYear  = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)

const canGoPrevMonth = computed(() =>
  calYear.value > today.getFullYear() ||
  (calYear.value === today.getFullYear() && calMonth.value > today.getMonth() + 1)
)

const prevMonth = () => {
  if (!canGoPrevMonth.value) return
  if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value--
}
const nextMonth = () => {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
}

const calDays = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null, disabled: true })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    const dateStr = `${calYear.value}-${mm}-${dd}`
    const isPast = dateStr <= todayStr  // 今天也不能選（需提前一日）
    days.push({ label: d, date: dateStr, disabled: isPast })
  }
  return days
})

const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.disabled) return 'text-stone-200 cursor-not-allowed'
  if (day.date === form.date) return 'bg-green-700 text-white font-bold cursor-pointer shadow-sm'
  return 'text-stone-700 hover:bg-green-100 hover:text-green-800 cursor-pointer font-medium'
}

const selectCalDate = (dateStr) => { form.date = dateStr }

const selectedDateDisplay = computed(() => {
  if (!form.date) return ''
  const d = new Date(form.date)
  const days = ['週日','週一','週二','週三','週四','週五','週六']
  return `${form.date}　${days[d.getDay()]}`
})

// ── 確認摘要 ──────────────────────────────────────────────────────
const summaryRows = computed(() => [
  { label: '日期', value: selectedDateDisplay.value },
  { label: '時間', value: form.time },
  { label: '人數', value: `${form.guests} 人` },
  { label: '葷素', value: dietOptions.find(o => o.value === form.diet)?.label || '未指定' },
  ...(form.note ? [{ label: '備註', value: form.note }] : []),
])

// ── 驗證 ──────────────────────────────────────────────────────────
const validateStep = () => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (currentStep.value === 0 && !form.date)         { errors.date  = '請選擇用餐日期'; return false }
  if (currentStep.value === 1) {
    if (!form.name.trim())  errors.name  = '請輸入姓名'
    if (!form.phone.trim()) errors.phone = '請輸入聯絡電話'
    return Object.keys(errors).length === 0
  }
  if (currentStep.value === 2 && !form.diet) { errors.diet = '請選擇葷素偏好'; return false }
  return true
}

const nextStep = () => { if (validateStep()) currentStep.value++ }

// ── 送出 ──────────────────────────────────────────────────────────
const submit = async () => {
  submitError.value = ''
  submitting.value = true
  try {
    const res = await fetch(`${BOOKING_BASE.value}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, phone: form.phone, date: form.date, time: form.time, guests: form.guests, diet: form.diet, note: form.note, status: '待確認' }),
    })
    if (!res.ok) throw new Error()
    router.push({ path: '/site/booking-confirm', query: { type: 'booking', name: form.name, date: form.date, time: form.time, guests: form.guests, diet: form.diet } })
  } catch {
    submitError.value = '預約送出失敗，請稍後再試或直接來電。'
  } finally {
    submitting.value = false
  }
}
</script>
