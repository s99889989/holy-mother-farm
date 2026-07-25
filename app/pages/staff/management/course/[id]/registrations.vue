<script setup>
// 專案holy-mother-farm 位置staff/management/course/[id]/registrations.vue
import { useCourseRegistrationStore } from '~/stores/courseRegistration.js'

definePageMeta({ layout: 'staff' })

const route = useRoute()
const courseId = route.params.id
const store = useCourseRegistrationStore()

const loading = ref(true)
const saving = ref(false)

const toast = reactive({ show: false, message: '', error: false })
const showToast = (msg, error = false) => {
  toast.message = msg; toast.error = error; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

onMounted(async () => {
  loading.value = true
  await store.fetchCourse(courseId)
  loading.value = false
})

const isDisplayImage = type => type === 'display_image'
const NOTE_SUFFIX = '__note'

// ── 繳費（人工核對版）────────────────────────────────────────
// 已收款總金額，本地從 registrations 算，跟 store 的 totalRegistered/pickedCount
// 用同一套做法，不用等後端多回傳一個欄位
const paidAmountSum = computed(() =>
  (store.currentCourse?.registrations ?? [])
    .filter(r => r.paid)
    .reduce((sum, r) => sum + (r.amount || 0), 0)
)
const priceLabelOf = (reg) => {
  if (!reg.priceOptionId) return '—'
  return reg.amount ? `${reg.priceLabel || '未命名價格'}（$${reg.amount}）` : (reg.priceLabel || '—')
}
const togglePaid = async (reg) => {
  try {
    await store.togglePaid(courseId, reg.id)
  } catch {
    showToast('操作失敗', true)
  }
}

// ── 手動新增/編輯 ────────────────────────────────────────────
const modal = reactive({ show: false, mode: 'add' })
const form = reactive({ id: '', displayName: '', answers: {}, priceOptionId: '', paymentNote: '', paid: false })

const blankAnswers = () => {
  const answers = {}
  store.currentCourse.fields.forEach((f) => {
    if (isDisplayImage(f.type)) return
    answers[f.id] = f.type === 'checkbox' ? [] : ''
    if (f.allowNote) answers[f.id + NOTE_SUFFIX] = ''
  })
  return answers
}

const openAdd = () => {
  form.id = ''; form.displayName = ''
  form.answers = blankAnswers()
  form.priceOptionId = ''; form.paymentNote = ''; form.paid = false
  modal.mode = 'add'; modal.show = true
}
const openEdit = (reg) => {
  form.id = reg.id; form.displayName = reg.displayName
  form.answers = {}
  store.currentCourse.fields.forEach((f) => {
    if (isDisplayImage(f.type)) return
    form.answers[f.id] = reg.answers?.[f.id] ?? (f.type === 'checkbox' ? [] : '')
    if (f.allowNote) form.answers[f.id + NOTE_SUFFIX] = reg.answers?.[f.id + NOTE_SUFFIX] ?? ''
  })
  modal.mode = 'edit'; modal.show = true
}

const save = async () => {
  saving.value = true
  try {
    if (modal.mode === 'add') {
      const payment = store.currentCourse?.paymentEnabled
        ? { priceOptionId: form.priceOptionId, paymentNote: form.paymentNote, paid: form.paid }
        : null
      await store.addRegistration(courseId, form.displayName, form.answers, payment)
    } else {
      await store.updateRegistration(courseId, form.id, form.displayName, form.answers)
    }
    showToast('已儲存')
    modal.show = false
  } catch {
    showToast('儲存失敗', true)
  } finally {
    saving.value = false
  }
}

const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const askRemove = (reg) => { deleteTarget.value = reg; showDeleteConfirm.value = true }
const confirmRemove = async () => {
  try {
    await store.removeRegistration(courseId, deleteTarget.value.id)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗', true)
  } finally {
    showDeleteConfirm.value = false
  }
}

const toggle = async (reg) => {
  try {
    await store.toggle(courseId, reg.id)
  } catch {
    showToast('操作失敗', true)
  }
}

// 多堂課簽到：切換某個上課日期的出席狀態（課程有設定 sessionDates 才會用到）
const toggleAttendance = async (reg, date) => {
  try {
    await store.toggleAttendance(courseId, reg.id, date)
  } catch {
    showToast('操作失敗', true)
  }
}

const resetAll = async () => {
  try {
    await store.reset(courseId)
    showToast('已重置所有簽到狀態')
  } catch {
    showToast('操作失敗', true)
  }
}

const answerDisplay = (reg, field) => {
  const v = reg.answers?.[field.id]
  if (Array.isArray(v)) return v.join('、') || '—'
  if (v === undefined || v === null || v === '') return '—'
  return v
}

const answerFields = computed(() => (store.currentCourse?.fields ?? []).filter(f => !isDisplayImage(f.type)))
const isFieldVisible = (f) => {
  if (!f.dependsOn) return true
  const v = form.answers[f.dependsOn]
  if (Array.isArray(v)) return v.includes(f.dependsOnValue)
  return v === f.dependsOnValue
}
// 只有手動新增/編輯的表單要套用條件顯示；報名名單表格的欄位維持全部顯示，
// 沒填到的條件欄位自然會顯示「—」
const visibleFormFields = computed(() => answerFields.value.filter(isFieldVisible))
</script>

<template>
  <div
    class="min-h-full"
    style="background: var(--surface2)"
  >
    <div class="max-w-5xl mx-auto px-4 py-6">
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
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1
              class="text-xl font-bold"
              style="color: var(--text-base)"
            >
              {{ store.currentCourse?.name }} — 報名名單
            </h1>
            <p
              class="text-sm mt-1"
              style="color: var(--text-hint)"
            >
              共 {{ store.totalRegistered }} 人報名
              <template v-if="!store.currentCourse?.sessionDates?.length">
                ，已簽到 {{ store.pickedCount }} 人
              </template>
              <template v-if="store.currentCourse?.paymentEnabled">
                ・已收 ${{ paidAmountSum }} 元
              </template>
            </p>
          </div>
          <div class="flex gap-2">
            <button
              class="px-3 py-2 rounded-lg border text-xs"
              style="border-color: var(--border-light); color: var(--text-muted)"
              @click="resetAll"
            >
              重置簽到
            </button>
            <button
              class="px-4 py-2 rounded-lg text-sm text-white"
              style="background: var(--accent)"
              @click="openAdd"
            >
              ＋ 手動新增
            </button>
          </div>
        </div>

        <div
          v-if="!store.currentCourse?.registrations?.length"
          class="text-center py-16"
          style="color: var(--text-hint)"
        >
          目前還沒有人報名
        </div>

        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <div
            v-for="reg in store.currentCourse.registrations"
            :key="reg.id"
            class="rounded-2xl border p-4 flex flex-col"
            style="background: var(--surface); border-color: var(--border-light)"
          >
            <!-- 上：姓名 + 報名來源 -->
            <div class="flex items-start justify-between gap-2 mb-3">
              <span
                class="font-bold truncate"
                style="color: var(--text-base)"
              >
                {{ reg.displayName || '—' }}
              </span>
              <span
                class="text-xs px-2 py-0.5 rounded-full border whitespace-nowrap"
                :style="reg.customerId
                  ? 'background: rgba(96,165,250,0.14); border-color: #60a5fa; color: #93c5fd'
                  : 'background: var(--surface2); border-color: var(--border-light); color: var(--text-hint)'"
              >
                {{ reg.customerId ? '自行報名' : '後台建立' }}
              </span>
            </div>

            <!-- 中：自訂欄位答案 -->
            <div
              v-if="answerFields.length"
              class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm mb-3"
            >
              <div v-for="f in answerFields" :key="f.id">
                <div
                  class="text-xs mb-0.5"
                  style="color: var(--text-hint)"
                >
                  {{ f.label }}
                </div>
                <div style="color: var(--text-muted)">
                  {{ answerDisplay(reg, f) }}
                </div>
              </div>
            </div>

            <!-- 繳費：底色跟著已收/未收變，未收是提醒用的琥珀色、已收是綠色 -->
            <div
              v-if="store.currentCourse?.paymentEnabled"
              class="rounded-lg p-2.5 mb-3 border"
              :style="reg.paid
                ? 'background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.35)'
                : 'background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.35)'"
            >
              <div class="flex items-center justify-between gap-2 text-sm">
                <span class="font-medium" style="color: var(--text-base)">{{ priceLabelOf(reg) }}</span>
                <label
                  class="flex items-center gap-1.5 text-xs whitespace-nowrap font-medium"
                  :style="reg.paid ? 'color: #4ade80' : 'color: #fbbf24'"
                >
                  <input
                    type="checkbox"
                    :checked="reg.paid"
                    @change="togglePaid(reg)"
                  >
                  {{ reg.paid ? `已收（${reg.paidAt || ''}）` : '未收' }}
                </label>
              </div>
              <p
                v-if="reg.paymentNote"
                class="text-xs mt-1"
                style="color: var(--text-hint)"
              >
                備註：{{ reg.paymentNote }}
              </p>
            </div>

            <!-- 簽到：放最下面、跟上面資料用分隔線隔開。有設定上課日期就每天各自
                 勾選，沒設定就維持單一「已簽到」勾選 -->
            <div
              class="pt-3 mb-3"
              style="border-top: 1px solid var(--border-light)"
            >
              <div
                class="text-xs mb-1.5"
                style="color: var(--text-hint)"
              >
                簽到
              </div>
              <div
                v-if="store.currentCourse?.sessionDates?.length"
                class="grid gap-1.5"
                style="grid-template-columns: repeat(auto-fill, minmax(52px, 1fr))"
              >
                <label
                  v-for="d in store.currentCourse.sessionDates"
                  :key="d"
                  class="flex items-center justify-center text-xs px-1.5 py-1 rounded-lg border cursor-pointer text-center font-medium transition-colors"
                  :style="reg.attendance?.[d]
                    ? 'background: rgba(34,197,94,0.16); border-color: #22c55e; color: #4ade80'
                    : 'background: var(--surface2); border-color: var(--border-light); color: var(--text-hint)'"
                >
                  <input
                    type="checkbox"
                    class="hidden"
                    :checked="reg.attendance?.[d]"
                    @change="toggleAttendance(reg, d)"
                  >
                  {{ d }}
                </label>
              </div>
              <label
                v-else
                class="flex items-center gap-2 text-sm"
                style="color: var(--text-muted)"
              >
                <input
                  type="checkbox"
                  :checked="reg.picked"
                  @change="toggle(reg)"
                >
                已簽到
              </label>
            </div>

            <!-- 下：報名時間 + 操作 -->
            <div
              class="flex items-center justify-between text-xs pt-2 mt-auto"
              style="border-top: 1px solid var(--border-light); color: var(--text-hint)"
            >
              <span>{{ reg.submittedAt || '—' }}</span>
              <div>
                <button
                  class="mr-3"
                  style="color: var(--accent)"
                  @click="openEdit(reg)"
                >
                  編輯
                </button>
                <button
                  class="text-red-500"
                  @click="askRemove(reg)"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 新增/編輯報名 Modal -->
    <div
      v-if="modal.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto py-8"
    >
      <div
        class="w-full max-w-md rounded-2xl p-5"
        style="background: var(--surface)"
      >
        <h2
          class="font-bold mb-3"
          style="color: var(--text-base)"
        >
          {{ modal.mode === 'add' ? '手動新增報名' : '編輯報名資料' }}
        </h2>

        <label
          class="block text-xs mb-1"
          style="color: var(--text-hint)"
        >姓名</label>
        <input
          v-model="form.displayName"
          type="text"
          class="w-full border rounded-lg px-3 py-2 mb-3"
          style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
        >

        <!-- 繳費：只有「手動新增」（現場報名）才順便填，編輯既有報名不動繳費狀態，
             繳費狀態統一在名單表格用「已收款」checkbox 切換 -->
        <div
          v-if="modal.mode === 'add' && store.currentCourse?.paymentEnabled"
          class="mb-3 p-3 rounded-lg"
          style="background: var(--surface2)"
        >
          <label
            class="block text-xs mb-1"
            style="color: var(--text-hint)"
          >價格</label>
          <select
            v-model="form.priceOptionId"
            class="w-full border rounded-lg px-3 py-2 mb-2 text-sm"
            style="border-color: var(--border-light); background: var(--surface); color: var(--text-base)"
          >
            <option value="">
              不選（現場報名先不記金額）
            </option>
            <option
              v-for="p in store.currentCourse.priceOptions"
              :key="p.id"
              :value="p.id"
            >
              {{ p.label }}（${{ p.amount }}）
            </option>
          </select>
          <input
            v-model="form.paymentNote"
            type="text"
            placeholder="繳費備註（選填，例如匯款後五碼）"
            class="w-full border rounded-lg px-3 py-2 mb-2 text-sm"
            style="border-color: var(--border-light); background: var(--surface); color: var(--text-base)"
          >
          <label class="flex items-center gap-2 text-sm" style="color: var(--text-muted)">
            <input v-model="form.paid" type="checkbox">
            現場已經收款
          </label>
        </div>

        <div
          v-for="f in visibleFormFields"
          :key="f.id"
          class="mb-3"
        >
          <label
            class="block text-xs mb-1"
            style="color: var(--text-hint)"
          >
            {{ f.label }}<span
            v-if="f.required"
            class="text-red-500"
          >＊</span>
          </label>

          <input
            v-if="f.type === 'text' || f.type === 'date'"
            v-model="form.answers[f.id]"
            :type="f.type === 'date' ? 'date' : 'text'"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
          >
          <textarea
            v-else-if="f.type === 'textarea'"
            v-model="form.answers[f.id]"
            rows="2"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
          />
          <select
            v-else-if="f.type === 'select'"
            v-model="form.answers[f.id]"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
          >
            <option value="">
              請選擇
            </option>
            <option
              v-for="opt in f.options"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
          <div
            v-else-if="f.type === 'radio'"
            class="flex flex-col gap-1"
          >
            <label
              v-for="opt in f.options"
              :key="opt"
              class="flex items-center gap-2 text-sm"
              style="color: var(--text-muted)"
            >
              <input
                v-model="form.answers[f.id]"
                type="radio"
                :value="opt"
              > {{ opt }}
            </label>
          </div>
          <div
            v-else-if="f.type === 'checkbox'"
            class="flex flex-col gap-1"
          >
            <label
              v-for="opt in f.options"
              :key="opt"
              class="flex items-center gap-2 text-sm"
              style="color: var(--text-muted)"
            >
              <input
                v-model="form.answers[f.id]"
                type="checkbox"
                :value="opt"
              > {{ opt }}
            </label>
          </div>

          <input
            v-if="f.allowNote"
            v-model="form.answers[f.id + '__note']"
            type="text"
            placeholder="其他，請說明"
            class="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
            style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
          >
        </div>

        <div class="flex gap-2 mt-2">
          <button
            class="flex-1 py-2 rounded-lg border text-sm"
            style="border-color: var(--border-light); color: var(--text-muted)"
            @click="modal.show = false"
          >
            取消
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm text-white"
            style="background: var(--accent)"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 刪除確認 -->
    <div
      v-if="showDeleteConfirm"
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
          刪除報名紀錄
        </h2>
        <p
          class="text-sm mb-4"
          style="color: var(--text-muted)"
        >
          確定要刪除「{{ deleteTarget?.displayName || '此筆' }}」的報名紀錄嗎？
        </p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg border text-sm"
            style="border-color: var(--border-light); color: var(--text-muted)"
            @click="showDeleteConfirm = false"
          >
            取消
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm text-white bg-red-500"
            @click="confirmRemove"
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
