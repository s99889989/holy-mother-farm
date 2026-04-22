<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useCommonStore } from '~/stores/common.js'
import { useCustomerStore } from '~/stores/customer.js'
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

const commonStore   = useCommonStore()
const customerStore = useCustomerStore()
const BOOKING_BASE  = computed(() => commonStore.data.main_url + '/holy/booking')

// ── Google 登入 ──────────────────────────────────────────────────
const googleBtnRef = ref(null)
const onCustomerLogin = (customer) => {
  if (!bForm.name && customer.name) bForm.name = customer.name
}
const onCustomerLogout = () => {}

watch(() => customerStore.customer, (c) => {
  if (c && !bForm.name) bForm.name = c.name
})

// ── 日期工具 ─────────────────────────────────────────────────────
const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

// ── 步驟 ─────────────────────────────────────────────────────────
const bStep      = ref(0)
const bSteps     = ['選擇日期', '填寫資料', '葷素選擇', '確認送出']
const bForm      = reactive({ name: '', phone: '', date: '', time: '12:00', guests: 2, diet: '', note: '' })
const bErrors    = reactive({})
const bSubmitting   = ref(false)
const bSubmitError  = ref('')
const bTimeSlots    = ['11:00','11:10','11:20','11:30','11:40','11:50','12:00','12:10','12:20','12:30','12:40','12:50','13:00']
const bDietOptions  = [
  { value: '葷食',   icon: '🍖', label: '葷食',   desc: '含肉類料理' },
  { value: '素食',   icon: '🌿', label: '全素',   desc: '不含蛋奶五辛' },
  { value: '蛋奶素', icon: '🥚', label: '蛋奶素', desc: '可食蛋奶製品' },
  { value: '五辛素', icon: '🧄', label: '五辛素', desc: '可食蔥薑蒜' },
]

// ── 月曆 ─────────────────────────────────────────────────────────
const bCal = new Date(); bCal.setHours(0,0,0,0)
const bTodayStr  = toDateStr(bCal)
const bCalYear   = ref(bCal.getFullYear())
const bCalMonth  = ref(bCal.getMonth() + 1)
const bCanPrevMonth = computed(() =>
  bCalYear.value > bCal.getFullYear() ||
  (bCalYear.value === bCal.getFullYear() && bCalMonth.value > bCal.getMonth() + 1))
const bPrevMonth = () => {
  if (!bCanPrevMonth.value) return
  if (bCalMonth.value === 1) { bCalYear.value--; bCalMonth.value = 12 } else bCalMonth.value--
}
const bNextMonth = () => {
  if (bCalMonth.value === 12) { bCalYear.value++; bCalMonth.value = 1 } else bCalMonth.value++
}
const bCalDays = computed(() => {
  const firstDay    = new Date(bCalYear.value, bCalMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(bCalYear.value, bCalMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null, disabled: true })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(bCalMonth.value).padStart(2,'0'), dd = String(d).padStart(2,'0')
    const str = `${bCalYear.value}-${mm}-${dd}`
    days.push({ label: d, date: str, disabled: str <= bTodayStr })
  }
  return days
})
const bDayClass = (day) => {
  if (!day.date)    return 'cursor-default'
  if (day.disabled) return 'text-stone-200 cursor-not-allowed'
  if (day.date === bForm.date) return 'font-bold text-white cursor-pointer shadow-sm bg-teal-600'
  return 'text-stone-700 hover:bg-teal-100 hover:text-teal-800 cursor-pointer'
}

const bDateGuests        = ref(0)
const bDateGuestsLoading = ref(false)
const bSelectDate = async (date) => {
  bForm.date = date
  bDateGuests.value = 0
  bDateGuestsLoading.value = true
  try {
    const data     = await (await fetch(`${BOOKING_BASE.value}/get/${date}`)).json()
    const bookings = Array.isArray(data) ? data : []
    bDateGuests.value = bookings.reduce((sum, b) => sum + (b.guests || 0), 0)
  } catch { bDateGuests.value = 0 }
  finally { bDateGuestsLoading.value = false }
}

const bSummary = computed(() => [
  { label: '日期', value: bForm.date },
  { label: '時間', value: bForm.time },
  { label: '人數', value: `${bForm.guests} 人` },
  { label: '葷素', value: bDietOptions.find(o => o.value === bForm.diet)?.label || '未指定' },
  ...(bForm.note ? [{ label: '備註', value: bForm.note }] : []),
])

const bNextStep = () => {
  Object.keys(bErrors).forEach(k => delete bErrors[k])
  if (bStep.value === 0 && !bForm.date)  { bErrors.date = '請選擇用餐日期'; return }
  if (bStep.value === 1) {
    if (!bForm.name.trim())  bErrors.name  = '請輸入姓名'
    if (!bForm.phone.trim()) bErrors.phone = '請輸入聯絡電話'
    if (Object.keys(bErrors).length > 0) return
  }
  if (bStep.value === 2 && !bForm.diet) { bErrors.diet = '請選擇葷素偏好'; return }
  bStep.value++
}

const bSubmit = async () => {
  bSubmitError.value = ''; bSubmitting.value = true
  try {
    const res = await fetch(`${BOOKING_BASE.value}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bForm, status: '待確認' }),
    })
    if (!res.ok) throw new Error()
    Object.assign(bForm, { name: '', phone: '', date: '', time: '12:00', guests: 2, diet: '', note: '' })
    bStep.value = 0
    alert('訂位已送出！我們將盡快電話確認，謝謝。')
  } catch { bSubmitError.value = '預約送出失敗，請稍後再試或直接來電。' }
  finally { bSubmitting.value = false }
}
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
        > <NuxtLink to="/front/restaurant">田園餐廳</NuxtLink>
        > 線上訂位
      </section>
      <section id="content" class="mx-3 mx-sm-5">
        <div class="bar-green bar-green-center"></div>
        <div class="row bg-greenweb py-5 px-sm-2">
          <div class="col-12 px-sm-4">
            <div class="row justify-content-center no-gutters">
              <div class="col-12 col-md-8 col-lg-7 rounded bg-lightGreen py-4 px-3 px-sm-4">

                <!-- 步驟列 -->
                <div class="booking-steps">
                  <div
                    v-for="(step, idx) in bSteps" :key="step"
                    class="booking-step"
                    :class="bStep === idx ? 'booking-step--active' : bStep > idx ? 'booking-step--done' : 'booking-step--pending'"
                  >
                    <span class="booking-step__inner">
                      <svg v-if="bStep > idx" class="booking-step__check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span v-else class="booking-step__num" :class="bStep === idx ? 'booking-step__num--active' : ''">
                        {{ idx + 1 }}
                      </span>
                      {{ step }}
                    </span>
                    <div v-if="bStep === idx" class="booking-step__bar" />
                  </div>
                </div>

                <!-- Step 0：選擇日期 -->
                <div v-if="bStep === 0">
                  <div class="mb-4">
                    <GoogleLoginButton @login="onCustomerLogin" @logout="onCustomerLogout" ref="googleBtnRef" />
                  </div>
                  <h2 class="booking-title">選擇用餐日期</h2>
                  <div class="booking-cal">
                    <div class="booking-cal__header">
                      <button @click="bPrevMonth" :disabled="!bCanPrevMonth" class="booking-cal__nav" :class="!bCanPrevMonth && 'booking-cal__nav--disabled'">
                        <svg class="booking-cal__nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <span class="booking-cal__month">{{ bCalYear }} 年 {{ bCalMonth }} 月</span>
                      <button @click="bNextMonth" class="booking-cal__nav">
                        <svg class="booking-cal__nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                      </button>
                    </div>
                    <div class="booking-cal__weekdays">
                      <div v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</div>
                    </div>
                    <div class="booking-cal__grid">
                      <div
                        v-for="(day, idx) in bCalDays" :key="idx"
                        class="booking-cal__day"
                        :class="bDayClass(day)"
                        @click="day.date && !day.disabled && bSelectDate(day.date)"
                      >{{ day.label }}</div>
                    </div>
                  </div>
                  <div v-if="bForm.date" class="booking-selected">
                    <span>已選擇：{{ bForm.date }}</span>
                    <span v-if="bDateGuestsLoading" class="booking-selected__badge">查詢中…</span>
                    <span v-else class="booking-selected__badge">已訂 {{ bDateGuests }} 人</span>
                  </div>
                  <p v-if="bErrors.date" class="booking-error">{{ bErrors.date }}</p>
                </div>

                <!-- Step 1：填寫資料 -->
                <div v-if="bStep === 1" class="booking-form">
                  <h2 class="booking-title">填寫資料</h2>
                  <div class="booking-field">
                    <label class="booking-label">姓名 <span class="booking-required">*</span></label>
                    <input v-model="bForm.name" placeholder="請輸入姓名" class="booking-input" :class="bErrors.name && 'booking-input--error'" />
                    <p v-if="bErrors.name" class="booking-error">{{ bErrors.name }}</p>
                  </div>
                  <div class="booking-field">
                    <label class="booking-label">聯絡電話 <span class="booking-required">*</span></label>
                    <input v-model="bForm.phone" type="tel" placeholder="請輸入電話" class="booking-input" :class="bErrors.phone && 'booking-input--error'" />
                    <p v-if="bErrors.phone" class="booking-error">{{ bErrors.phone }}</p>
                  </div>
                  <div class="booking-grid-2">
                    <div class="booking-field">
                      <label class="booking-label">用餐時間</label>
                      <select v-model="bForm.time" class="booking-input">
                        <option v-for="t in bTimeSlots" :key="t" :value="t">{{ t }}</option>
                      </select>
                    </div>
                    <div class="booking-field">
                      <label class="booking-label">人數</label>
                      <div class="booking-counter">
                        <button @click="bForm.guests = Math.max(1, bForm.guests - 1)" class="booking-counter__btn">−</button>
                        <input v-model.number="bForm.guests" type="number" min="1" max="50" class="booking-counter__input" />
                        <button @click="bForm.guests = Math.min(50, bForm.guests + 1)" class="booking-counter__btn">＋</button>
                      </div>
                    </div>
                  </div>
                  <div class="booking-field">
                    <label class="booking-label">備註</label>
                    <textarea v-model="bForm.note" rows="2" placeholder="過敏食材、特殊需求…" class="booking-input booking-textarea" />
                  </div>
                </div>

                <!-- Step 2：葷素選擇 -->
                <div v-if="bStep === 2">
                  <h2 class="booking-title">葷素選擇</h2>
                  <div class="booking-diet-grid">
                    <button
                      v-for="opt in bDietOptions" :key="opt.value"
                      @click="bForm.diet = opt.value"
                      class="booking-diet-card"
                      :class="bForm.diet === opt.value ? 'booking-diet-card--active' : ''"
                    >
                      <div class="booking-diet-card__icon">{{ opt.icon }}</div>
                      <div class="booking-diet-card__label">{{ opt.label }}</div>
                      <div class="booking-diet-card__desc">{{ opt.desc }}</div>
                    </button>
                  </div>
                  <p v-if="bErrors.diet" class="booking-error">{{ bErrors.diet }}</p>
                </div>

                <!-- Step 3：確認送出 -->
                <div v-if="bStep === 3">
                  <h2 class="booking-title">確認預約內容</h2>
                  <div class="booking-summary">
                    <div v-for="row in bSummary" :key="row.label" class="booking-summary__row">
                      <span class="booking-summary__label">{{ row.label }}</span>
                      <span class="booking-summary__value">{{ row.value }}</span>
                    </div>
                  </div>
                  <p v-if="bSubmitError" class="booking-submit-error">{{ bSubmitError }}</p>
                </div>

                <!-- 導覽按鈕 -->
                <div class="booking-nav">
                  <button v-if="bStep > 0" @click="bStep--" class="booking-btn booking-btn--back">
                    <svg class="booking-btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    上一步
                  </button>
                  <div v-else />
                  <button v-if="bStep < bSteps.length - 1" @click="bNextStep" class="booking-btn booking-btn--next">
                    下一步
                    <svg class="booking-btn__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                  <button v-else @click="bSubmit" :disabled="bSubmitting" class="booking-btn booking-btn--submit">
                    <div v-if="bSubmitting" class="booking-btn__spinner" />
                    {{ bSubmitting ? '送出中…' : '確認預約' }}
                  </button>
                </div>

                <!-- 注意事項 -->
                <div class="booking-notice booking-notice--teal">
                  <p class="booking-notice__title">📋 預約注意事項</p>
                  <p>· 請提前一日完成預約，以便我們備料。</p>
                  <p>· 預約送出後為「待確認」狀態，我們將盡快電話確認。</p>
                  <p>· 如需取消，請提前來電告知，謝謝。</p>
                </div>

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
/* ── 步驟列 ── */
.booking-steps {
  display: flex;
  border-bottom: 1px solid #e5e0d8;
  margin-bottom: 24px;
}
.booking-step {
  flex: 1;
  padding: 12px 4px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  position: relative;
}
.booking-step--active  { color: #3a9a8a; background-color: #eef7f5; }
.booking-step--done    { color: #3a9a8a; }
.booking-step--pending { color: #ccc; }
.booking-step__inner   { display: inline-flex; align-items: center; gap: 6px; }
.booking-step__check   { width: 16px; height: 16px; color: #3a9a8a; }
.booking-step__num {
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 1.5px solid #ccc;
  font-size: 11px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
  color: #ccc;
}
.booking-step__num--active { background-color: #3a9a8a; border-color: #3a9a8a; color: #fff; }
.booking-step__bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 2px; background-color: #5bbfbf;
}

/* ── 共用 ── */
.booking-title  { font-size: 15px; font-weight: 700; color: #333; margin-bottom: 16px; }
.booking-form   { display: flex; flex-direction: column; gap: 16px; }
.booking-field  { display: flex; flex-direction: column; gap: 4px; }
.booking-label  { font-size: 13px; font-weight: 600; color: #555; }
.booking-required { color: #e74c3c; }
.booking-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #ddd;
  font-size: 13px;
  color: #333;
  outline: none;
  background: #fff;
  transition: border-color 0.15s;
}
.booking-input:focus      { border-color: #5bbfbf; }
.booking-input--error     { border-color: #e74c3c; background-color: #fff5f5; }
.booking-textarea         { resize: none; }
.booking-error            { font-size: 12px; color: #e74c3c; margin: 2px 0 0; }
.booking-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ── 月曆 ── */
.booking-cal { background: #f8f7f4; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
.booking-cal__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.booking-cal__month { font-size: 13px; font-weight: 700; color: #333; }
.booking-cal__nav {
  padding: 6px; border-radius: 10px;
  background: none; border: none; cursor: pointer;
  color: #666; transition: background 0.15s;
}
.booking-cal__nav:hover:not(:disabled) { background: #e0e0e0; }
.booking-cal__nav--disabled { color: #ccc; cursor: not-allowed; }
.booking-cal__nav-icon { width: 16px; height: 16px; display: block; }
.booking-cal__weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}
.booking-cal__weekdays > div { text-align: center; font-size: 11px; color: #aaa; padding: 4px 0; }
.booking-cal__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.booking-cal__day {
  aspect-ratio: 1;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  font-size: 13px;
  user-select: none;
  transition: all 0.12s;
}

/* ── 已選日期提示 ── */
.booking-selected {
  background-color: #eef7f5;
  color: #3a9a8a;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.booking-selected__badge {
  font-size: 11px;
  background: #fff;
  color: #3a9a8a;
  padding: 2px 10px;
  border-radius: 20px;
  font-weight: 600;
}

/* ── 計數器 ── */
.booking-counter { display: flex; align-items: center; gap: 6px; }
.booking-counter__btn {
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s;
}
.booking-counter__btn:hover { background: #f5f5f5; }
.booking-counter__input {
  flex: 1;
  text-align: center;
  padding: 8px 4px;
  border-radius: 10px;
  border: 1px solid #ddd;
  font-size: 13px; font-weight: 700;
  color: #333; outline: none;
}

/* ── 葷素選擇 ── */
.booking-diet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
.booking-diet-card {
  padding: 16px;
  border-radius: 16px;
  border: 2px solid #eee;
  text-align: left;
  cursor: pointer;
  background: #fff;
  transition: border-color 0.15s, background 0.15s;
}
.booking-diet-card:hover          { border-color: #b8d8d0; }
.booking-diet-card--active        { border-color: #5bbfbf; background-color: #eef7f5; }
.booking-diet-card__icon          { font-size: 24px; margin-bottom: 4px; }
.booking-diet-card__label         { font-size: 13px; font-weight: 600; color: #333; }
.booking-diet-card__desc          { font-size: 11px; color: #aaa; margin-top: 2px; }

/* ── 確認摘要 ── */
.booking-summary {
  border: 1px solid #eee;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 12px;
}
.booking-summary__row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 13px;
}
.booking-summary__row:last-child { border-bottom: none; }
.booking-summary__label { color: #aaa; }
.booking-summary__value { font-weight: 600; color: #333; }
.booking-submit-error {
  font-size: 13px; color: #e74c3c;
  background: #fff5f5;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
}

/* ── 導覽按鈕 ── */
.booking-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}
.booking-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  border: none;
}
.booking-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.booking-btn__icon { width: 16px; height: 16px; }
.booking-btn__spinner {
  width: 14px; height: 14px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.booking-btn--back   { background: #fff; border: 1px solid #ddd; color: #666; margin-right: auto; }
.booking-btn--back:hover { background: #f5f5f5; }
.booking-btn--next   { background-color: #5bbfbf; color: #fff; margin-left: auto; }
.booking-btn--next:hover { opacity: 0.88; }
.booking-btn--submit { background-color: #5bbfbf; color: #fff; margin-left: auto; }
.booking-btn--submit:hover:not(:disabled) { opacity: 0.88; }

/* ── 注意事項 ── */
.booking-notice {
  margin-top: 16px;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.8;
}
.booking-notice--teal { background-color: #eef7f5; color: #3a9a8a; }
.booking-notice__title { font-weight: 600; margin-bottom: 4px; }

/* ── number input arrow 隱藏 ── */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }
</style>
