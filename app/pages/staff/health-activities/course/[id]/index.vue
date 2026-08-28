<script setup>
// 專案holy-mother-farm 位置staff/management/course/[id]/index.vue
import { useCourseRegistrationStore } from '~/stores/courseRegistration.js'

definePageMeta({ layout: 'staff' })

const commonStore = useCommonStore()
const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return commonStore.data.main_url + path
}

const route = useRoute()
const courseId = route.params.id
const store = useCourseRegistrationStore()

const loading = ref(true)
const saving = ref(false)

const toast = reactive({ show: false, message: '', error: false })
const showToast = (msg, error = false) => {
  toast.message = msg
  toast.error = error
  toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

const nameInput = ref('')
const descriptionInput = ref('')
const deadlineInput = ref('')
const capacityInput = ref(0)
const requireLoginInput = ref(true)
const fieldsDraft = ref([])
const coverUploading = ref(false)

// ── 繳費設定（人工核對版）────────────────────────────────────
const paymentEnabledInput = ref(false)
const paymentInfoInput = ref('')
const priceOptionsDraft = ref([])
const savingPayment = ref(false)

// ── 簽到日期（多堂課用）──────────────────────────────────────
const sessionDatesDraft = ref([])
const savingSessionDates = ref(false)

const descriptionTextarea = ref(null)
const autoGrow = (el) => {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

onMounted(async () => {
  loading.value = true
  await store.fetchCourse(courseId)
  const c = store.currentCourse
  nameInput.value = c?.name ?? ''
  descriptionInput.value = c?.description ?? ''
  deadlineInput.value = (c?.registrationDeadline ?? '').replace(' ', 'T')
  capacityInput.value = c?.maxCapacity ?? 0
  requireLoginInput.value = c?.requireLogin ?? true
  paymentEnabledInput.value = c?.paymentEnabled ?? false
  paymentInfoInput.value = c?.paymentInfo ?? ''
  priceOptionsDraft.value = JSON.parse(JSON.stringify(c?.priceOptions ?? []))
  sessionDatesDraft.value = JSON.parse(JSON.stringify(c?.sessionDates ?? []))
  fieldsDraft.value = JSON.parse(JSON.stringify(c?.fields ?? []))
  loading.value = false
  await nextTick()
  autoGrow(descriptionTextarea.value)
})

// ── 儲存基本資訊 ─────────────────────────────────────────────
const saveInfo = async () => {
  saving.value = true
  try {
    await store.updateCourse(courseId, nameInput.value, descriptionInput.value)
    const deadline = deadlineInput.value ? deadlineInput.value.replace('T', ' ') : ''
    await store.updateDeadline(courseId, deadline)
    await store.updateCapacity(courseId, capacityInput.value)
    await store.updateRequireLogin(courseId, requireLoginInput.value)
    await store.fetchCourse(courseId)
    showToast('已儲存')
  } catch {
    showToast('儲存失敗', true)
  } finally {
    saving.value = false
  }
}

// ── 繳費設定 ─────────────────────────────────────────────────
const addPriceOption = () => {
  priceOptionsDraft.value.push({
    id: 'p_' + Math.random().toString(36).slice(2, 10), // 暫時 id，儲存後後端會沿用
    label: '', amount: 0, dependsOn: '', dependsOnValue: ''
  })
}
const removePriceOption = idx => priceOptionsDraft.value.splice(idx, 1)

const savePayment = async () => {
  savingPayment.value = true
  cleanInvalidPriceConditions()
  try {
    await store.updatePaymentSettings(courseId, paymentEnabledInput.value, paymentInfoInput.value)
    await store.updatePriceOptions(courseId, priceOptionsDraft.value)
    await store.fetchCourse(courseId)
    priceOptionsDraft.value = JSON.parse(JSON.stringify(store.currentCourse?.priceOptions ?? []))
    showToast('繳費設定已儲存')
  } catch {
    showToast('儲存失敗', true)
  } finally {
    savingPayment.value = false
  }
}

// 收款資訊圖片（例如轉帳 QR Code、銀行帳戶截圖）：上傳/移除都是獨立 API，
// 不用等按「儲存繳費設定」，選了檔案就直接生效
const paymentImageInput = ref(null)
const paymentImageUploading = ref(false)
const pickPaymentImage = () => paymentImageInput.value?.click()
const onPaymentImageChange = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  paymentImageUploading.value = true
  try {
    await store.uploadPaymentInfoImage(courseId, file)
    await store.fetchCourse(courseId)
    showToast('收款資訊圖片已更新')
  } catch {
    showToast('圖片上傳失敗', true)
  } finally {
    paymentImageUploading.value = false
    e.target.value = ''
  }
}
const removePaymentImage = async () => {
  paymentImageUploading.value = true
  try {
    await store.removePaymentInfoImage(courseId)
    await store.fetchCourse(courseId)
    showToast('已移除收款資訊圖片')
  } catch {
    showToast('移除失敗', true)
  } finally {
    paymentImageUploading.value = false
  }
}

// ── 簽到日期（多堂課用）──────────────────────────────────────
// 有設定日期時，報名名單頁會改成「每個日期各自勾選出席」；不設定就維持原本
// 單一「已簽到」勾選（適合單次活動，不用特別管理日期清單）
const addSessionDate = () => sessionDatesDraft.value.push('')
const removeSessionDate = idx => sessionDatesDraft.value.splice(idx, 1)

const saveSessionDates = async () => {
  savingSessionDates.value = true
  try {
    const dates = sessionDatesDraft.value.map(d => d.trim()).filter(Boolean)
    await store.updateSessionDates(courseId, dates)
    await store.fetchCourse(courseId)
    sessionDatesDraft.value = JSON.parse(JSON.stringify(store.currentCourse?.sessionDates ?? []))
    showToast('簽到日期已儲存')
  } catch {
    showToast('儲存失敗', true)
  } finally {
    savingSessionDates.value = false
  }
}

// ── 封面圖 ────────────────────────────────────────────────────
const coverInput = ref(null)
const pickCover = () => coverInput.value?.click()
const onCoverChange = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  coverUploading.value = true
  try {
    await store.uploadCoverImage(courseId, file)
    await store.fetchCourse(courseId)
    showToast('封面已更新')
  } catch {
    showToast('封面上傳失敗', true)
  } finally {
    coverUploading.value = false
    e.target.value = ''
  }
}

// ── 欄位編輯器 ────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: 'text', label: '單行文字' },
  { value: 'textarea', label: '多行文字' },
  { value: 'radio', label: '單選' },
  { value: 'checkbox', label: '多選' },
  { value: 'select', label: '下拉選單' },
  { value: 'date', label: '日期' },
  { value: 'image', label: '圖片上傳（報名者填答）' },
  { value: 'display_image', label: '純展示圖片（不算答案）' }
]
const needsOptions = type => ['radio', 'checkbox', 'select'].includes(type)

const addField = () => {
  fieldsDraft.value.push({
    // 立刻給一個暫時 id（不等後端存檔才產生），這樣後面新增的欄位才能馬上
    // 設定「顯示條件」指到這個還沒儲存的欄位；儲存後後端會沿用這個 id。
    id: 'f_' + Math.random().toString(36).slice(2, 10),
    label: '', type: 'text', required: false,
    allowNote: false, options: [], imageUrl: '', order: fieldsDraft.value.length,
    dependsOn: '', dependsOnValue: ''
  })
}
const removeField = idx => fieldsDraft.value.splice(idx, 1)
const fieldDeleteConfirm = reactive({ show: false, idx: -1 })
const askRemoveField = (idx) => {
  fieldDeleteConfirm.idx = idx
  fieldDeleteConfirm.show = true
}
const confirmRemoveField = () => {
  removeField(fieldDeleteConfirm.idx)
  fieldDeleteConfirm.show = false
}
const addOption = field => field.options.push('')
const removeOption = (field, idx) => field.options.splice(idx, 1)

// 顯示條件只能選「排在自己前面、而且是單選/多選/下拉」的欄位，避免互相依賴
const priorChoiceFields = idx => fieldsDraft.value.filter((f, i) => i < idx && needsOptions(f.type))
const fieldOptionsById = id => fieldsDraft.value.find(f => f.id === id)?.options ?? []
// 欄位順序調整、刪除都可能讓原本設定的顯示條件失效（依賴到後面的欄位、或依賴的欄位被刪了），
// 存檔前清掉這種不合法的條件設定
const cleanInvalidConditions = () => {
  fieldsDraft.value.forEach((f, idx) => {
    if (!f.dependsOn) return
    const stillValid = priorChoiceFields(idx).some(pf => pf.id === f.dependsOn)
    if (!stillValid) {
      f.dependsOn = ''
      f.dependsOnValue = ''
    }
  })
}

// 價格選項的顯示條件（例如「課程選擇」＝「整月」才出現「單人 8 堂優惠」）：
// 價格選項不像表單欄位有排序關係，所以不用限制「只能選前面的欄位」，可以連到
// 任何一個單選/多選/下拉欄位
const choiceFields = computed(() => fieldsDraft.value.filter(f => needsOptions(f.type)))
const priceFieldOptionsById = id => fieldsDraft.value.find(f => f.id === id)?.options ?? []
// 表單欄位被刪掉或改型別後，價格選項原本設定的顯示條件可能失效，存檔前一併清掉
const cleanInvalidPriceConditions = () => {
  priceOptionsDraft.value.forEach(p => {
    if (!p.dependsOn) return
    const stillValid = choiceFields.value.some(f => f.id === p.dependsOn)
    if (!stillValid) {
      p.dependsOn = ''
      p.dependsOnValue = ''
    }
  })
}

const moveField = (idx, dir) => {
  const target = idx + dir
  if (target < 0 || target >= fieldsDraft.value.length) return
  const arr = fieldsDraft.value
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
}

const savingFields = ref(false)
const saveFields = async () => {
  savingFields.value = true
  cleanInvalidConditions()
  try {
    await store.updateFields(courseId, fieldsDraft.value)
    await store.fetchCourse(courseId)
    fieldsDraft.value = JSON.parse(JSON.stringify(store.currentCourse?.fields ?? []))
    showToast('表單欄位已儲存')
  } catch {
    showToast('儲存失敗', true)
  } finally {
    savingFields.value = false
  }
}
</script>

<template>
  <div
    class="min-h-full"
    style="background: var(--surface2)"
  >
    <div class="max-w-6xl mx-auto px-4 py-6">
      <NuxtLink
        to="/staff/management/course"
        class="text-sm mb-4 inline-block"
        style="color: var(--text-hint)"
      >
        ← 返回課程列表
      </NuxtLink>

      <div
        v-if="loading"
        class="text-center py-16"
        style="color: var(--text-hint)"
      >
        載入中…
      </div>

      <template v-else>
        <div class="lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
          <!-- 左欄：基本資訊 -->
          <div>
            <!-- 基本資訊 -->
            <div
              class="rounded-2xl border p-5 mb-5"
              style="background: var(--surface); border-color: var(--border-light)"
            >
              <h2
                class="font-bold mb-4"
                style="color: var(--text-base)"
              >
                基本資訊
              </h2>

              <div class="mb-4">
                <div
                  v-if="store.currentCourse?.coverImage"
                  class="rounded-xl overflow-hidden cursor-pointer"
                  @click="pickCover"
                >
                  <img
                    :src="imgUrl(store.currentCourse.coverImage)"
                    :alt="store.currentCourse.name"
                    class="w-full h-auto block"
                  >
                </div>
                <div
                  v-else
                  class="h-40 rounded-xl flex items-center justify-center cursor-pointer"
                  style="background-color: var(--surface2)"
                  @click="pickCover"
                >
                <span
                  class="text-sm"
                  style="color: var(--text-hint)"
                >
                  {{ coverUploading ? '上傳中…' : '點擊上傳封面圖' }}
                </span>
                </div>
                <p
                  v-if="store.currentCourse?.coverImage"
                  class="text-xs mt-1.5"
                  style="color: var(--text-hint)"
                >
                  {{ coverUploading ? '上傳中…' : '點擊圖片可更換封面' }}
                </p>
                <input
                  ref="coverInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onCoverChange"
                >
              </div>

              <label
                class="block text-xs mb-1"
                style="color: var(--text-hint)"
              >課程名稱</label>
              <input
                v-model="nameInput"
                type="text"
                class="w-full border rounded-lg px-3 py-2 mb-3"
                style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
              >

              <label
                class="block text-xs mb-1"
                style="color: var(--text-hint)"
              >課程說明</label>
              <textarea
                ref="descriptionTextarea"
                v-model="descriptionInput"
                rows="3"
                class="w-full border rounded-lg px-3 py-2 mb-3 resize-none"
                style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                @input="autoGrow(descriptionTextarea)"
              />

              <div class="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label
                    class="block text-xs mb-1"
                    style="color: var(--text-hint)"
                  >報名截止時間（留空 = 不限）</label>
                  <input
                    v-model="deadlineInput"
                    type="datetime-local"
                    class="w-full border rounded-lg px-3 py-2"
                    style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                  >
                </div>
                <div>
                  <label
                    class="block text-xs mb-1"
                    style="color: var(--text-hint)"
                  >名額上限（0 = 不限）</label>
                  <input
                    v-model.number="capacityInput"
                    type="number"
                    min="0"
                    class="w-full border rounded-lg px-3 py-2"
                    style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                  >
                </div>
              </div>

              <label
                class="flex items-center gap-2 text-sm mb-4 cursor-pointer"
                style="color: var(--text-base)"
              >
                <input
                  v-model="requireLoginInput"
                  type="checkbox"
                >
                需要登入才能填寫報名表單
              </label>
              <p
                class="text-xs -mt-3 mb-4"
                style="color: var(--text-hint)"
              >
                取消勾選後，前台不會再擋「請先登入」，任何人都能直接填表送出報名（無法追蹤重複報名，也無法自行修改／取消）。
              </p>

              <button
                class="px-4 py-2 rounded-lg text-sm text-white"
                style="background: var(--accent)"
                :disabled="saving"
                @click="saveInfo"
              >
                {{ saving ? '儲存中…' : '儲存基本資訊' }}
              </button>
            </div>
          </div><!-- /左欄 -->

          <!-- 右欄：表單欄位編輯器 + 繳費設定 -->
          <div>
            <!-- 表單欄位編輯器 -->
            <div
              class="rounded-2xl border p-5 mb-5"
              style="background: var(--surface); border-color: var(--border-light)"
            >
              <div class="flex items-center justify-between mb-4">
                <h2
                  class="font-bold text-lg"
                  style="color: var(--text-base)"
                >
                  報名表單欄位
                </h2>
                <button
                  class="text-xs px-3 py-1.5 rounded-lg border"
                  style="border-color: var(--border-light); color: var(--text-muted)"
                  @click="addField"
                >
                  ＋ 新增欄位
                </button>
              </div>

              <p
                v-if="fieldsDraft.length === 0"
                class="text-sm text-center py-6"
                style="color: var(--text-hint)"
              >
                還沒有自訂欄位，報名者只需要用 Google 帳號登入即可報名。
              </p>

              <div
                v-for="(field, idx) in fieldsDraft"
                :key="idx"
                class="border rounded-xl p-3 mb-3"
                style="border-color: var(--border-light)"
              >
                <div class="flex items-start gap-2 mb-2">
                  <input
                    v-model="field.label"
                    type="text"
                    placeholder="欄位標題，例如：姓名"
                    class="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                    style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                  >
                  <select
                    v-model="field.type"
                    class="border rounded-lg px-2 py-1.5 text-sm"
                    style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                  >
                    <option
                      v-for="t in FIELD_TYPES"
                      :key="t.value"
                      :value="t.value"
                    >
                      {{ t.label }}
                    </option>
                  </select>
                </div>

                <!-- display_image：純展示用圖片網址 -->
                <input
                  v-if="field.type === 'display_image'"
                  v-model="field.imageUrl"
                  type="text"
                  placeholder="圖片網址（可先用「答案圖片上傳」API 上傳後貼路徑）"
                  class="w-full border rounded-lg px-3 py-1.5 text-sm mb-2"
                  style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                >

                <!-- 選項（單選/多選/下拉） -->
                <div
                  v-if="needsOptions(field.type)"
                  class="mb-2"
                >
                  <div
                    v-for="(opt, oi) in field.options"
                    :key="oi"
                    class="flex items-center gap-2 mb-1"
                  >
                    <input
                      v-model="field.options[oi]"
                      type="text"
                      :placeholder="`選項 ${oi + 1}`"
                      class="flex-1 border rounded-lg px-3 py-1 text-sm"
                      style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                    >
                    <button
                      class="text-xs px-2"
                      style="color: var(--text-hint)"
                      @click="removeOption(field, oi)"
                    >
                      ✕
                    </button>
                  </div>
                  <button
                    class="text-xs"
                    style="color: var(--accent)"
                    @click="addOption(field)"
                  >
                    ＋ 新增選項
                  </button>
                </div>

                <!-- 顯示條件：只有選到指定值時，這個欄位才會出現在報名表單上 -->
                <div
                  v-if="priorChoiceFields(idx).length > 0"
                  class="flex items-center flex-wrap gap-2 text-sm mb-2 pb-2"
                  style="border-bottom: 1px dashed var(--border-light); color: var(--text-muted)"
                >
                  <span>顯示條件</span>
                  <select
                    v-model="field.dependsOn"
                    class="border rounded-lg px-2 py-1"
                    style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                    @change="field.dependsOnValue = ''"
                  >
                    <option value="">
                      一律顯示
                    </option>
                    <option
                      v-for="pf in priorChoiceFields(idx)"
                      :key="pf.id"
                      :value="pf.id"
                    >
                      當「{{ pf.label || '未命名欄位' }}」＝
                    </option>
                  </select>
                  <select
                    v-if="field.dependsOn"
                    v-model="field.dependsOnValue"
                    class="border rounded-lg px-2 py-1"
                    style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                  >
                    <option value="">
                      請選擇值
                    </option>
                    <option
                      v-for="opt in fieldOptionsById(field.dependsOn)"
                      :key="opt"
                      :value="opt"
                    >
                      {{ opt }}
                    </option>
                  </select>
                </div>

                <div
                  class="flex items-center justify-between text-sm"
                  style="color: var(--text-muted)"
                >
                  <div class="flex items-center gap-4">
                    <label
                      v-if="field.type !== 'display_image'"
                      class="flex items-center gap-1"
                    >
                      <input
                        v-model="field.required"
                        type="checkbox"
                      > 必填
                    </label>
                    <label
                      v-if="needsOptions(field.type)"
                      class="flex items-center gap-1"
                    >
                      <input
                        v-model="field.allowNote"
                        type="checkbox"
                      > 加開「其他，請說明」
                    </label>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      :disabled="idx === 0"
                      @click="moveField(idx, -1)"
                    >
                      ↑
                    </button>
                    <button
                      :disabled="idx === fieldsDraft.length - 1"
                      @click="moveField(idx, 1)"
                    >
                      ↓
                    </button>
                    <button
                      class="text-red-500"
                      @click="askRemoveField(idx)"
                    >
                      刪除欄位
                    </button>
                  </div>
                </div>
              </div>

              <button
                class="px-4 py-2 rounded-lg text-sm text-white mt-2"
                style="background: var(--accent)"
                :disabled="savingFields"
                @click="saveFields"
              >
                {{ savingFields ? '儲存中…' : '儲存表單欄位' }}
              </button>
            </div>

            <!-- 繳費設定（人工核對版，不接金流） -->
            <div
              class="rounded-2xl border p-5 mb-5"
              style="background: var(--surface); border-color: var(--border-light)"
            >
              <h2
                class="font-bold mb-1"
                style="color: var(--text-base)"
              >
                繳費設定
              </h2>
              <p
                class="text-xs mb-4"
                style="color: var(--text-hint)"
              >
                不接第三方金流，報名者匯款後由後台人工核對、手動勾選已收款；未繳費不影響報名成立，也不會被算進名額。
              </p>

              <label
                class="flex items-center gap-2 text-sm mb-3 cursor-pointer"
                style="color: var(--text-base)"
              >
                <input
                  v-model="paymentEnabledInput"
                  type="checkbox"
                >
                開啟繳費追蹤（報名表單會多一步「選擇價格」）
              </label>

              <template v-if="paymentEnabledInput">
                <label
                  class="block text-xs mb-1"
                  style="color: var(--text-hint)"
                >收款資訊（顯示給報名者看，例如銀行代碼／戶名／帳號）</label>
                <textarea
                  v-model="paymentInfoInput"
                  rows="2"
                  class="w-full border rounded-lg px-3 py-2 mb-4 resize-none"
                  style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                />

                <label
                  class="block text-xs mb-1"
                  style="color: var(--text-hint)"
                >收款資訊圖片（選填，例如轉帳 QR Code、銀行帳戶截圖）</label>
                <div class="mb-4">
                  <div
                    v-if="store.currentCourse?.paymentInfoImage"
                    class="rounded-xl overflow-hidden cursor-pointer"
                    @click="pickPaymentImage"
                  >
                    <img
                      :src="imgUrl(store.currentCourse.paymentInfoImage)"
                      alt="收款資訊圖片"
                      class="w-full h-auto block"
                    >
                  </div>
                  <div
                    v-else
                    class="h-24 rounded-xl flex items-center justify-center cursor-pointer"
                    style="background-color: var(--surface2)"
                    @click="pickPaymentImage"
                  >
                  <span
                    class="text-sm"
                    style="color: var(--text-hint)"
                  >
                    {{ paymentImageUploading ? '上傳中…' : '點擊上傳圖片' }}
                  </span>
                  </div>
                  <div class="flex items-center gap-3 mt-1.5">
                    <p
                      v-if="store.currentCourse?.paymentInfoImage"
                      class="text-xs"
                      style="color: var(--text-hint)"
                    >
                      {{ paymentImageUploading ? '處理中…' : '點擊圖片可更換' }}
                    </p>
                    <button
                      v-if="store.currentCourse?.paymentInfoImage"
                      class="text-xs"
                      style="color: #ef4444"
                      :disabled="paymentImageUploading"
                      @click="removePaymentImage"
                    >
                      移除圖片
                    </button>
                  </div>
                  <input
                    ref="paymentImageInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="onPaymentImageChange"
                  >
                </div>

                <div class="flex items-center justify-between mb-2">
                  <label
                    class="block text-xs"
                    style="color: var(--text-hint)"
                  >價格選項（例如早鳥價／現場價，至少要有一個報名者才選得到）</label>
                  <button
                    class="text-xs px-2 py-1 rounded-lg border"
                    style="border-color: var(--border-light); color: var(--text-muted)"
                    @click="addPriceOption"
                  >
                    ＋ 新增價格
                  </button>
                </div>

                <div
                  v-for="(p, idx) in priceOptionsDraft"
                  :key="idx"
                  class="border rounded-xl p-2.5 mb-2"
                  style="border-color: var(--border-light)"
                >
                  <div class="flex items-center gap-2">
                    <input
                      v-model="p.label"
                      type="text"
                      placeholder="價格名稱，例如：早鳥價"
                      class="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                      style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                    >
                    <div class="flex items-center gap-1">
                    <span
                      class="text-sm"
                      style="color: var(--text-hint)"
                    >$</span>
                      <input
                        v-model.number="p.amount"
                        type="number"
                        min="0"
                        class="w-24 border rounded-lg px-2 py-1.5 text-sm"
                        style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                      >
                    </div>
                    <button
                      class="text-xs px-2"
                      style="color: var(--text-hint)"
                      @click="removePriceOption(idx)"
                    >
                      ✕
                    </button>
                  </div>

                  <!-- 顯示條件：只有選到指定值時，這個價格選項才會出現在報名表單上
                       （例如「課程選擇」＝「整月」才顯示「單人 8 堂優惠」） -->
                  <div
                    v-if="choiceFields.length > 0"
                    class="flex items-center flex-wrap gap-2 text-xs mt-2 pt-2"
                    style="border-top: 1px dashed var(--border-light); color: var(--text-muted)"
                  >
                    <span>顯示條件</span>
                    <select
                      v-model="p.dependsOn"
                      class="border rounded-lg px-2 py-1"
                      style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                      @change="p.dependsOnValue = ''"
                    >
                      <option value="">
                        一律顯示
                      </option>
                      <option
                        v-for="cf in choiceFields"
                        :key="cf.id"
                        :value="cf.id"
                      >
                        當「{{ cf.label || '未命名欄位' }}」＝
                      </option>
                    </select>
                    <select
                      v-if="p.dependsOn"
                      v-model="p.dependsOnValue"
                      class="border rounded-lg px-2 py-1"
                      style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                    >
                      <option value="">
                        請選擇值
                      </option>
                      <option
                        v-for="opt in priceFieldOptionsById(p.dependsOn)"
                        :key="opt"
                        :value="opt"
                      >
                        {{ opt }}
                      </option>
                    </select>
                  </div>
                </div>

                <p
                  v-if="priceOptionsDraft.length === 0"
                  class="text-xs mb-2"
                  style="color: var(--text-hint)"
                >
                  還沒有任何價格選項，報名者會看不到可以選的價格，請先新增至少一個。
                </p>
              </template>

              <button
                class="px-4 py-2 rounded-lg text-sm text-white mt-2"
                style="background: var(--accent)"
                :disabled="savingPayment"
                @click="savePayment"
              >
                {{ savingPayment ? '儲存中…' : '儲存繳費設定' }}
              </button>
            </div>

            <!-- 簽到日期設定（多堂課用） -->
            <div
              class="rounded-2xl border p-5 mb-5"
              style="background: var(--surface); border-color: var(--border-light)"
            >
              <h2
                class="font-bold mb-1"
                style="color: var(--text-base)"
              >
                簽到日期
              </h2>
              <p
                class="text-xs mb-4"
                style="color: var(--text-hint)"
              >
                設定這堂課的上課日期後，報名名單頁會改成每個日期各自勾選出席，用來記錄學員哪幾天有來上課；不設定就維持單一「已簽到」勾選（適合單次活動）。
              </p>

              <div
                v-for="(d, idx) in sessionDatesDraft"
                :key="idx"
                class="flex items-center gap-2 mb-2"
              >
                <input
                  v-model="sessionDatesDraft[idx]"
                  type="text"
                  placeholder="上課日期，例如：6/30"
                  class="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                  style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                >
                <button
                  class="text-xs px-2"
                  style="color: var(--text-hint)"
                  @click="removeSessionDate(idx)"
                >
                  ✕
                </button>
              </div>

              <p
                v-if="sessionDatesDraft.length === 0"
                class="text-xs mb-2"
                style="color: var(--text-hint)"
              >
                還沒有設定任何上課日期。
              </p>

              <button
                class="text-xs px-2 py-1 rounded-lg border mb-3"
                style="border-color: var(--border-light); color: var(--text-muted)"
                @click="addSessionDate"
              >
                ＋ 新增日期
              </button>

              <button
                class="px-4 py-2 rounded-lg text-sm text-white block mt-2"
                style="background: var(--accent)"
                :disabled="savingSessionDates"
                @click="saveSessionDates"
              >
                {{ savingSessionDates ? '儲存中…' : '儲存簽到日期' }}
              </button>
            </div>
          </div><!-- /右欄 -->
        </div>
      </template>
    </div>

    <!-- 刪除欄位確認 -->
    <div
      v-if="fieldDeleteConfirm.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div
        class="w-full max-w-sm rounded-2xl p-5"
        style="background: var(--surface)"
      >
        <h2
          class="font-bold mb-2"
          style="color: var(--text-base)"
        >
          刪除欄位
        </h2>
        <p
          class="text-sm mb-4"
          style="color: var(--text-muted)"
        >
          確定要刪除「{{ fieldsDraft[fieldDeleteConfirm.idx]?.label || '這個欄位' }}」嗎？其他欄位設定的顯示條件如果依賴它，也會一併失效。
        </p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg border text-sm"
            style="border-color: var(--border-light); color: var(--text-muted)"
            @click="fieldDeleteConfirm.show = false"
          >
            取消
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm text-white bg-red-500"
            @click="confirmRemoveField"
          >
            確定刪除
          </button>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm text-white z-50"
        :style="{ background: toast.error ? '#ef4444' : 'var(--accent)' }"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>
