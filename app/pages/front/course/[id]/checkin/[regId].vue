<script setup>
// 專案 holy-mother-farm 位置建議：pages/course/[id]/checkin/[regId].vue
//
// 用途：課程/活動「學員自助簽到」頁面 —— 純前端，直接呼叫既有 courseRegistration
// store 的 toggle / toggleAttendance API 完成簽到，沒有新增任何後端 API，
// 跟你在 registrations.vue 後台手動點簽到 checkbox 是同一套 API，只是
// 現在改成學員自己在這頁完成，資料一樣存進後台資料庫。
//
// 使用情境：學員先在另一個「選自己是誰」的頁面（你說會另外做，這邊還沒實作）
// 選到自己的報名紀錄，該頁面帶著這筆報名的 id 導到這裡（route param regId），
// 這裡進來就自動判斷今天日期、完成簽到、顯示結果。
//
// ⚠️ 假設 1：sessionDates 陣列裡的日期是「不補零的 M/D」字串（例如 "8/18"），
// 這是從你提供的報名名單截圖推測的格式。如果實際格式不同（例如 "2026-08-18"），
// 請調整 todayStr 這段的算法即可，其他邏輯不用動。
//
// ⚠️ 假設 2：layout 目前沒有指定（學員端，不一定要走 staff 登入版型），
// 請依你們專案實際的公開頁面版型調整，例如 definePageMeta({ layout: 'public' })。
//
// ⚠️ 這頁完全沒有身份驗證，任何人只要有這個連結（帶對的 regId）就能觸發簽到。
// 之後你做「選自己」的頁面時，記得那邊要有基本防呆（例如不能亂猜別人的 regId），
// 不然這頁本身是無法擋人的。

import { useCourseRegistrationStore } from '~/stores/courseRegistration.js'

const route = useRoute()
const courseId = route.params.id
const regId = Array.isArray(route.params.regId) ? route.params.regId[0] : route.params.regId

const store = useCourseRegistrationStore()

const voiceEnabled = ref(true)

// status: 'loading' | 'success' | 'duplicate' | 'not_found' | 'no_session' | 'error'
const status = ref('loading')
const errorMessage = ref('')
const checkedTime = ref('')

const registration = computed(() =>
  store.currentCourse?.registrations?.find(r => r.id === regId) || null
)

const hasSessionDates = computed(() => !!store.currentCourse?.sessionDates?.length)

// 今天日期，格式對齊 sessionDates（假設是不補零的 M/D，見上方註解）
const todayStr = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}/${d.getDate()}`
})

const todayInSchedule = computed(() =>
  hasSessionDates.value && store.currentCourse.sessionDates.includes(todayStr.value)
)

const alreadyCheckedIn = computed(() => {
  if (!registration.value) return false
  return hasSessionDates.value
    ? !!registration.value.attendance?.[todayStr.value]
    : !!registration.value.picked
})

const formatNow = () => new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })

const speak = (text) => {
  if (!voiceEnabled.value || !window.speechSynthesis) return
  window.speechSynthesis.cancel() // 避免連續簽到時語音疊在一起
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-TW'
  window.speechSynthesis.speak(utter)
}

const runCheckin = async () => {
  status.value = 'loading'
  errorMessage.value = ''
  try {
    await store.fetchCourse(courseId)

    if (!registration.value) {
      status.value = 'not_found'
      return
    }

    if (hasSessionDates.value && !todayInSchedule.value) {
      status.value = 'no_session'
      return
    }

    if (alreadyCheckedIn.value) {
      status.value = 'duplicate'
      checkedTime.value = formatNow()
      speak(`${registration.value.displayName}，您已經簽到過了`)
      return
    }

    // 跟後台管理頁面用的是同一支 API，只是這裡是學員自己觸發
    if (hasSessionDates.value) {
      await store.toggleAttendance(courseId, regId, todayStr.value)
    } else {
      await store.toggle(courseId, regId)
    }

    status.value = 'success'
    checkedTime.value = formatNow()
    speak(`${registration.value.displayName}，簽到成功`)
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err?.message || '簽到失敗，請稍後再試或通知現場工作人員'
  }
}

onMounted(runCheckin)
</script>

<template>
  <div class="ac-wrap">
    <div class="ac-card">
      <!-- 載入中 -->
      <div v-if="status === 'loading'" class="ac-state">
        <div class="ac-spinner" />
        <p class="ac-state__text">簽到中，請稍候…</p>
      </div>

      <!-- 簽到成功 -->
      <div v-else-if="status === 'success'" class="ac-state">
        <div class="ac-icon ac-icon--success">✓</div>
        <p class="ac-state__title">簽到成功</p>
        <p class="ac-state__name">{{ registration.displayName }}</p>
        <p class="ac-state__meta">
          {{ store.currentCourse?.name }}
          <template v-if="hasSessionDates"> · {{ todayStr }}</template>
          · {{ checkedTime }}
        </p>
      </div>

      <!-- 今天已經簽到過 -->
      <div v-else-if="status === 'duplicate'" class="ac-state">
        <div class="ac-icon ac-icon--duplicate">!</div>
        <p class="ac-state__title">今天已經簽到過囉</p>
        <p class="ac-state__name">{{ registration.displayName }}</p>
        <p class="ac-state__meta">
          {{ store.currentCourse?.name }}
          <template v-if="hasSessionDates"> · {{ todayStr }}</template>
        </p>
      </div>

      <!-- 今天沒有排這堂課 -->
      <div v-else-if="status === 'no_session'" class="ac-state">
        <div class="ac-icon ac-icon--warn">!</div>
        <p class="ac-state__title">今天沒有安排這堂課</p>
        <p class="ac-state__meta">請確認是不是走錯簽到連結，或聯繫現場工作人員</p>
      </div>

      <!-- 找不到這筆報名紀錄 -->
      <div v-else-if="status === 'not_found'" class="ac-state">
        <div class="ac-icon ac-icon--error">✕</div>
        <p class="ac-state__title">找不到報名紀錄</p>
        <p class="ac-state__meta">請確認簽到連結是否正確，或聯繫現場工作人員</p>
      </div>

      <!-- 發生錯誤 -->
      <div v-else class="ac-state">
        <div class="ac-icon ac-icon--error">✕</div>
        <p class="ac-state__title">簽到失敗</p>
        <p class="ac-state__meta">{{ errorMessage }}</p>
        <button class="ac-retry" @click="runCheckin">
          再試一次
        </button>
      </div>

      <label class="ac-voice">
        <input v-model="voiceEnabled" type="checkbox">
        <span>語音播報</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.ac-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: #f4f8f5;
  font-family: 'Noto Sans TC', sans-serif;
}

.ac-card {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 20px;
  padding: 40px 28px;
  box-shadow: 0 8px 30px rgba(26, 61, 40, 0.08);
  text-align: center;
}

.ac-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.ac-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #dce8d8;
  border-top-color: #1FC29C;
  border-radius: 50%;
  animation: ac-spin 0.8s linear infinite;
  margin-bottom: 10px;
}
@keyframes ac-spin {
  to { transform: rotate(360deg); }
}

.ac-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}
.ac-icon--success { background: #1FC29C; }
.ac-icon--duplicate { background: #f0ad4e; }
.ac-icon--warn { background: #f0ad4e; }
.ac-icon--error { background: #d9534f; }

.ac-state__title { font-size: 18px; font-weight: 700; color: #1a3d28; margin: 4px 0 0; }
.ac-state__name { font-size: 22px; font-weight: 700; color: #1a3d28; margin: 2px 0 0; }
.ac-state__meta { font-size: 13px; color: #7a8f81; margin: 4px 0 0; }
.ac-state__text { font-size: 14px; color: #7a8f81; margin: 0; }

.ac-retry {
  margin-top: 14px;
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: #1FC29C;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

.ac-voice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
  font-size: 12px;
  color: #9aa89f;
  cursor: pointer;
  user-select: none;
}
.ac-voice input { accent-color: #1FC29C; }
</style>
