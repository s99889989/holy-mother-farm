<script setup>
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
  toast.message = msg; toast.error = error; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

const nameInput = ref('')
const descriptionInput = ref('')
const deadlineInput = ref('')
const capacityInput = ref(0)
const fieldsDraft = ref([])
const coverUploading = ref(false)

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
    await store.fetchCourse(courseId)
    showToast('已儲存')
  } catch {
    showToast('儲存失敗', true)
  } finally {
    saving.value = false
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
const needsOptions = (type) => ['radio', 'checkbox', 'select'].includes(type)

const addField = () => {
  fieldsDraft.value.push({
    id: '', label: '', type: 'text', required: false,
    allowNote: false, options: [], imageUrl: '', order: fieldsDraft.value.length
  })
}
const removeField = (idx) => fieldsDraft.value.splice(idx, 1)
const addOption = (field) => field.options.push('')
const removeOption = (field, idx) => field.options.splice(idx, 1)

const moveField = (idx, dir) => {
  const target = idx + dir
  if (target < 0 || target >= fieldsDraft.value.length) return
  const arr = fieldsDraft.value
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
}

const savingFields = ref(false)
const saveFields = async () => {
  savingFields.value = true
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

// ── 分享連結 ──────────────────────────────────────────────────
const BASE_URL = useRuntimeConfig().public.apiBase
const shareUrl = computed(() => `${BASE_URL}/holy/course-reg/share/${courseId}`)
const copyShareUrl = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    showToast('分享連結已複製')
  } catch {
    showToast('複製失敗，請手動選取', true)
  }
}
</script>

<template>
  <div class="min-h-full" style="background: var(--surface2)">
    <div class="max-w-3xl mx-auto px-4 py-6">
      <NuxtLink to="/staff/management/course" class="text-sm mb-4 inline-block" style="color: var(--text-hint)">
        ← 返回課程列表
      </NuxtLink>

      <div v-if="loading" class="text-center py-16" style="color: var(--text-hint)">載入中…</div>

      <template v-else>
        <!-- 基本資訊 -->
        <div class="rounded-2xl border p-5 mb-5" style="background: var(--surface); border-color: var(--border-light)">
          <h2 class="font-bold mb-4" style="color: var(--text-base)">基本資訊</h2>

          <div class="mb-4">
            <div
              class="h-40 rounded-xl bg-cover bg-center flex items-center justify-center cursor-pointer"
              style="background-color: var(--surface2)"
              :style="store.currentCourse?.coverImage ? { backgroundImage: `url(${imgUrl(store.currentCourse.coverImage)})` } : {}"
              @click="pickCover"
            >
              <span v-if="!store.currentCourse?.coverImage" class="text-sm" style="color: var(--text-hint)">
                {{ coverUploading ? '上傳中…' : '點擊上傳封面圖' }}
              </span>
            </div>
            <input ref="coverInput" type="file" accept="image/*" class="hidden" @change="onCoverChange">
          </div>

          <label class="block text-xs mb-1" style="color: var(--text-hint)">課程名稱</label>
          <input
            v-model="nameInput"
            type="text"
            class="w-full border rounded-lg px-3 py-2 mb-3"
            style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
          >

          <label class="block text-xs mb-1" style="color: var(--text-hint)">課程說明</label>
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
              <label class="block text-xs mb-1" style="color: var(--text-hint)">報名截止時間（留空 = 不限）</label>
              <input
                v-model="deadlineInput"
                type="datetime-local"
                class="w-full border rounded-lg px-3 py-2"
                style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
              >
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: var(--text-hint)">名額上限（0 = 不限）</label>
              <input
                v-model.number="capacityInput"
                type="number"
                min="0"
                class="w-full border rounded-lg px-3 py-2"
                style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
              >
            </div>
          </div>

          <button
            class="px-4 py-2 rounded-lg text-sm text-white"
            style="background: var(--accent)"
            :disabled="saving"
            @click="saveInfo"
          >
            {{ saving ? '儲存中…' : '儲存基本資訊' }}
          </button>
        </div>

        <!-- 分享連結 -->
        <div class="rounded-2xl border p-5 mb-5" style="background: var(--surface); border-color: var(--border-light)">
          <h2 class="font-bold mb-2" style="color: var(--text-base)">分享連結</h2>
          <p class="text-xs mb-3" style="color: var(--text-hint)">
            貼到 LINE / FB 用這個連結，才會正確顯示課程名稱、簡介、報名進度圖卡：
          </p>
          <div class="flex gap-2">
            <input
              readonly
              :value="shareUrl"
              class="flex-1 border rounded-lg px-3 py-2 text-xs"
              style="border-color: var(--border-light); background: var(--surface2); color: var(--text-muted)"
            >
            <button
              class="px-3 py-2 rounded-lg border text-xs"
              style="border-color: var(--border-light); color: var(--text-muted)"
              @click="copyShareUrl"
            >
              複製
            </button>
          </div>
        </div>

        <!-- 表單欄位編輯器 -->
        <div class="rounded-2xl border p-5 mb-5" style="background: var(--surface); border-color: var(--border-light)">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-bold" style="color: var(--text-base)">報名表單欄位</h2>
            <button
              class="text-xs px-3 py-1.5 rounded-lg border"
              style="border-color: var(--border-light); color: var(--text-muted)"
              @click="addField"
            >
              ＋ 新增欄位
            </button>
          </div>

          <p v-if="fieldsDraft.length === 0" class="text-sm text-center py-6" style="color: var(--text-hint)">
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
                <option v-for="t in FIELD_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
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
            <div v-if="needsOptions(field.type)" class="mb-2">
              <div v-for="(opt, oi) in field.options" :key="oi" class="flex items-center gap-2 mb-1">
                <input
                  v-model="field.options[oi]"
                  type="text"
                  :placeholder="`選項 ${oi + 1}`"
                  class="flex-1 border rounded-lg px-3 py-1 text-sm"
                  style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
                >
                <button class="text-xs px-2" style="color: var(--text-hint)" @click="removeOption(field, oi)">✕</button>
              </div>
              <button class="text-xs" style="color: var(--accent)" @click="addOption(field)">＋ 新增選項</button>
            </div>

            <div class="flex items-center justify-between text-xs" style="color: var(--text-muted)">
              <div class="flex items-center gap-4">
                <label v-if="field.type !== 'display_image'" class="flex items-center gap-1">
                  <input v-model="field.required" type="checkbox"> 必填
                </label>
                <label v-if="needsOptions(field.type)" class="flex items-center gap-1">
                  <input v-model="field.allowNote" type="checkbox"> 加開「其他，請說明」
                </label>
              </div>
              <div class="flex items-center gap-2">
                <button :disabled="idx === 0" @click="moveField(idx, -1)">↑</button>
                <button :disabled="idx === fieldsDraft.length - 1" @click="moveField(idx, 1)">↓</button>
                <button class="text-red-500" @click="removeField(idx)">刪除欄位</button>
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

        <NuxtLink
          :to="`/staff/management/course/${courseId}/registrations`"
          class="block text-center py-3 rounded-xl border text-sm"
          style="border-color: var(--border-light); color: var(--text-muted)"
        >
          查看報名名單（{{ store.totalRegistered }} 人）
        </NuxtLink>
      </template>
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
