<script setup>
// 前台課程報名頁。
// ⚠️ 這頁目前先放在 staff/admin 這個專案裡方便測試，之後會搬到實際對外的
// 客戶專案。因此刻意不依賴這個專案的 layouts/front.vue、FrontNavbar 等
// staff 專屬元件，盡量自成一頁，方便日後搬家。
import { useCourseRegistrationStore } from '~/stores/courseRegistration.js'
import { useCustomerStore } from '~/stores/customer.js'

definePageMeta({ layout: 'blank' })

const route = useRoute()
const courseId = route.params.id
const store = useCourseRegistrationStore()
const customerStore = useCustomerStore()
const commonStore = useCommonStore()

const BASE = computed(() => commonStore.data.main_url + '/holy/customer')
const GOOGLE_CLIENT_ID = computed(() => commonStore.data.google_client_id)
const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return commonStore.data.main_url + path
}

const loading = ref(true)
const submitting = ref(false)
const cancelling = ref(false)
const toast = reactive({ show: false, message: '', error: false })
const answers = reactive({})
const editing = ref(false)

const showToast = (msg, error = false) => {
  toast.message = msg; toast.error = error; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

const course = computed(() => store.publicCourse)
const answerFields = computed(() => (course.value?.fields ?? []).filter(f => f.type !== 'display_image'))
const isDeadlinePassed = computed(() => {
  if (!course.value?.registrationDeadline) return false
  const normalized = course.value.registrationDeadline.replace(' ', 'T')
  return new Date(normalized) < new Date()
})

const resetAnswers = () => {
  answerFields.value.forEach(f => {
    const existing = course.value?.myRegistration?.answers?.[f.id]
    answers[f.id] = existing ?? (f.type === 'checkbox' ? [] : '')
    if (f.allowNote) {
      answers[f.id + '__note'] = course.value?.myRegistration?.answers?.[f.id + '__note'] ?? ''
    }
  })
}

const fetchCourseData = async () => {
  await store.fetchPublicCourse(courseId)
  resetAnswers()
}

// ── Google 登入（獨立於這個專案的員工登入流程，任何帳號都能登入報名）──
const initGoogle = (attempt = 0) => {
  if (!import.meta.client) return
  if (!window.google) {
    if (attempt < 20) setTimeout(() => initGoogle(attempt + 1), 300)
    return
  }
  if (!GOOGLE_CLIENT_ID.value) return
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID.value,
    callback: handleCredential,
    auto_select: false,
  })
  const el = document.getElementById('google-signin-btn')
  if (el) {
    window.google.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      locale: 'zh-TW',
      width: 280,
    })
  }
}

const loginError = ref('')
const handleCredential = async (response) => {
  loginError.value = ''
  try {
    const res = await fetch(`${BASE.value}/google-login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential }),
    })
    const data = await res.json()
    if (data.error) {
      loginError.value = data.error
      return
    }
    customerStore.setCustomer(data)
    await fetchCourseData()
  } catch {
    loginError.value = '登入失敗，請確認網路後再試'
  }
}

const fetchMe = async () => {
  try {
    const res = await fetch(`${BASE.value}/me`, { credentials: 'include' })
    const data = await res.json()
    if (!data.error) customerStore.setCustomer(data)
  } catch {
    // 未登入或逾時，靜默留在頁面
  }
}

const logout = async () => {
  try {
    await fetch(`${BASE.value}/logout`, { method: 'POST', credentials: 'include' })
  } catch { /* ignore */ }
  customerStore.clearCustomer()
}

onMounted(async () => {
  loading.value = true
  await fetchMe()
  await fetchCourseData()
  loading.value = false

  if (!document.getElementById('google-gsi-script')) {
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initGoogle()
    document.head.appendChild(script)
  } else {
    initGoogle()
  }
})

// ── 送出報名 ──────────────────────────────────────────────────
const validate = () => {
  for (const f of answerFields.value) {
    if (!f.required) continue
    const v = answers[f.id]
    const empty = v === undefined || v === null || v === ''
      || (Array.isArray(v) && v.length === 0)
    if (empty) return `「${f.label}」為必填`
  }
  return ''
}

const submit = async () => {
  const err = validate()
  if (err) { showToast(err, true); return }

  submitting.value = true
  try {
    const res = await store.submitRegistration(courseId, { ...answers })
    if (res.error) {
      showToast(res.error, true)
    } else {
      showToast('報名成功！')
      editing.value = false
      await fetchCourseData()
    }
  } catch {
    showToast('報名失敗，請稍後再試', true)
  } finally {
    submitting.value = false
  }
}

const cancelRegistration = async () => {
  cancelling.value = true
  try {
    const res = await store.cancelMyRegistration(courseId)
    if (res.error) {
      showToast(res.error, true)
    } else {
      showToast('已取消報名')
      await fetchCourseData()
    }
  } catch {
    showToast('取消失敗，請稍後再試', true)
  } finally {
    cancelling.value = false
  }
}

const startEdit = () => { resetAnswers(); editing.value = true }

useHead(() => ({
  title: course.value?.name ? `${course.value.name} 報名` : '課程報名'
}))
</script>

<template>
  <div class="min-h-screen bg-stone-50">
    <div class="max-w-xl mx-auto px-4 py-6">
      <div v-if="loading" class="text-center py-20 text-stone-400">載入中…</div>

      <template v-else-if="course">
        <div
          v-if="course.coverImage"
          class="h-44 rounded-2xl bg-cover bg-center mb-4"
          :style="{ backgroundImage: `url(${imgUrl(course.coverImage)})` }"
        />

        <h1 class="text-xl font-bold text-stone-800">{{ course.name }}</h1>
        <p v-if="course.description" class="text-sm text-stone-500 mt-2 whitespace-pre-line">
          {{ course.description }}
        </p>

        <div class="flex flex-wrap gap-2 mt-3 text-xs">
          <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">
            已報名 {{ course.registeredCount }}{{ course.maxCapacity ? ` / ${course.maxCapacity}` : '' }} 人
          </span>
          <span v-if="course.registrationDeadline" class="px-3 py-1 rounded-full bg-amber-50 text-amber-700">
            截止：{{ course.registrationDeadline }}
          </span>
        </div>

        <!-- 未登入：顯示 Google 登入按鈕 -->
        <div v-if="!customerStore.isLoggedIn" class="mt-6 bg-white rounded-2xl border border-stone-200 p-5 text-center">
          <p class="text-sm text-stone-500 mb-4">請先用 Google 帳號登入才能報名</p>
          <div id="google-signin-btn" class="flex justify-center" />
          <p v-if="loginError" class="text-xs text-red-500 mt-3">{{ loginError }}</p>
        </div>

        <!-- 已登入 -->
        <template v-else>
          <div class="flex items-center justify-between mt-6 mb-3">
            <p class="text-xs text-stone-400">已登入：{{ customerStore.customer?.name || customerStore.customer?.email }}</p>
            <button class="text-xs text-stone-400 underline" @click="logout">登出</button>
          </div>

          <!-- 已報名，且不是編輯模式：顯示報名結果 -->
          <div
            v-if="course.myRegistration && !editing"
            class="bg-white rounded-2xl border border-emerald-200 p-5"
          >
            <p class="text-emerald-700 font-medium mb-1">✅ 你已經報名這堂課程</p>
            <p class="text-xs text-stone-400 mb-4">報名時間：{{ course.myRegistration.submittedAt }}</p>
            <div class="flex gap-2">
              <button
                class="flex-1 py-2 rounded-lg border border-stone-200 text-sm text-stone-600"
                @click="startEdit"
              >
                修改報名資料
              </button>
              <button
                class="flex-1 py-2 rounded-lg border border-red-200 text-sm text-red-500"
                :disabled="cancelling"
                @click="cancelRegistration"
              >
                {{ cancelling ? '取消中…' : '取消報名' }}
              </button>
            </div>
          </div>

          <!-- 額滿 / 已截止，且尚未報名 -->
          <div
            v-else-if="(course.isFull || isDeadlinePassed) && !course.myRegistration"
            class="bg-white rounded-2xl border border-stone-200 p-5 text-center text-stone-500 text-sm"
          >
            {{ isDeadlinePassed ? '報名時間已截止' : '報名人數已額滿' }}
          </div>

          <!-- 報名表單 -->
          <div v-else class="bg-white rounded-2xl border border-stone-200 p-5">
            <div v-for="f in answerFields" :key="f.id" class="mb-4">
              <label class="block text-sm font-medium text-stone-700 mb-1">
                {{ f.label }}<span v-if="f.required" class="text-red-500">＊</span>
              </label>

              <input
                v-if="f.type === 'text' || f.type === 'date'"
                v-model="answers[f.id]"
                :type="f.type === 'date' ? 'date' : 'text'"
                class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              >
              <textarea
                v-else-if="f.type === 'textarea'"
                v-model="answers[f.id]"
                rows="3"
                class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              />
              <select
                v-else-if="f.type === 'select'"
                v-model="answers[f.id]"
                class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">請選擇</option>
                <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <div v-else-if="f.type === 'radio'" class="flex flex-col gap-2">
                <label v-for="opt in f.options" :key="opt" class="flex items-center gap-2 text-sm text-stone-600">
                  <input v-model="answers[f.id]" type="radio" :value="opt"> {{ opt }}
                </label>
              </div>
              <div v-else-if="f.type === 'checkbox'" class="flex flex-col gap-2">
                <label v-for="opt in f.options" :key="opt" class="flex items-center gap-2 text-sm text-stone-600">
                  <input v-model="answers[f.id]" type="checkbox" :value="opt"> {{ opt }}
                </label>
              </div>
              <div v-else-if="f.type === 'image'" class="text-xs text-stone-400">
                （圖片上傳欄位，可依需求接上傳 API）
              </div>

              <input
                v-if="f.allowNote"
                v-model="answers[f.id + '__note']"
                type="text"
                placeholder="其他，請說明"
                class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mt-2"
              >
            </div>

            <div class="flex gap-2 mt-2">
              <button
                v-if="editing"
                class="flex-1 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-600"
                @click="editing = false"
              >
                取消編輯
              </button>
              <button
                class="flex-1 py-2.5 rounded-lg text-white text-sm font-medium bg-emerald-600"
                :disabled="submitting"
                @click="submit"
              >
                {{ submitting ? '送出中…' : (editing ? '更新報名資料' : '確認報名') }}
              </button>
            </div>
          </div>
        </template>
      </template>

      <div v-else class="text-center py-20 text-stone-400">找不到這個課程</div>
    </div>

    <Transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm text-white z-50"
        :style="{ background: toast.error ? '#ef4444' : '#059669' }"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>
