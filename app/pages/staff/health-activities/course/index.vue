<script setup>
// 專案holy-mother-farm 位置staff/health-activities/course/index.vue
import { useCourseRegistrationStore } from '~/stores/courseRegistration.js'

definePageMeta({ layout: 'staff', requiredPermission: 'health-activities.course' })

const commonStore = useCommonStore()
const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return commonStore.data.main_url + path
}
// 分享連結要複製給人貼到 LINE/FB，一定要是絕對網址
const BASE_URL = useRuntimeConfig().public.apiBase
const copyShareLink = async (course) => {
  try {
    await navigator.clipboard.writeText(`${BASE_URL}/holy/course-reg/share/${course.id}`)
    showToast('分享連結已複製')
  } catch {
    showToast('複製失敗，請手動選取', true)
  }
}

const store = useCourseRegistrationStore()
const loading = ref(false)
const saving = ref(false)
const toast = reactive({ show: false, message: '', error: false })
const modal = reactive({ show: false })
const form = reactive({ name: '' })
const showDeleteConfirm = ref(false)
const deleteTarget = reactive({ id: '', name: '' })

const showToast = (msg, error = false) => {
  toast.message = msg; toast.error = error; toast.show = true
  setTimeout(() => toast.show = false, 2500)
}

onMounted(async () => {
  loading.value = true
  await store.fetchCourses()
  loading.value = false
})

const openAdd = () => {
  form.name = ''
  modal.show = true
}
const save = async () => {
  if (!form.name.trim()) {
    showToast('請填寫課程名稱', true)
    return
  }
  saving.value = true
  try {
    const id = await store.addCourse(form.name, '')
    showToast('新增成功')
    modal.show = false
    await navigateTo(`/staff/health-activities/course/${id}`)
  } catch {
    showToast('新增失敗', true)
  } finally {
    saving.value = false
  }
}

const askDelete = (course) => {
  deleteTarget.id = course.id
  deleteTarget.name = course.name
  showDeleteConfirm.value = true
}
const confirmDelete = async () => {
  try {
    await store.removeCourse(deleteTarget.id)
    showToast('已刪除')
  } catch {
    showToast('刪除失敗', true)
  } finally {
    showDeleteConfirm.value = false
  }
}

const deadlineLabel = (course) => {
  if (!course.registrationDeadline) return '不限時間'
  return `截止 ${course.registrationDeadline}`
}
const capacityLabel = (course) => {
  if (!course.maxCapacity) return `已報名 ${course.registrations?.length ?? 0} 人（不限名額）`
  return `已報名 ${course.registrations?.length ?? 0} / ${course.maxCapacity} 人`
}
</script>

<template>
  <div
    class="min-h-full"
    style="background: var(--surface2)"
  >
    <div class="max-w-5xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1
            class="text-xl font-bold"
            style="color: var(--text-base)"
          >
            課程報名管理
          </h1>
          <p
            class="text-sm mt-1"
            style="color: var(--text-hint)"
          >
            建立課程、自訂報名表單、管理報名名單
          </p>
        </div>
        <div class="flex gap-2">
          <NuxtLink
            to="/staff/health-activities/course/schedule"
            class="px-4 py-2 rounded-lg text-sm font-medium border"
            style="border-color: var(--border-light); color: var(--text-muted)"
          >
            📅 排課表
          </NuxtLink>
          <NuxtLink
            to="/staff/health-activities/course/kpi"
            class="px-4 py-2 rounded-lg text-sm font-medium border"
            style="border-color: var(--border-light); color: var(--text-muted)"
          >
            📊 客源/續約
          </NuxtLink>
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style="background: var(--accent)"
            @click="openAdd"
          >
            ＋ 新增課程
          </button>
        </div>
      </div>

      <div
        v-if="loading"
        class="text-center py-16"
        style="color: var(--text-hint)"
      >
        載入中…
      </div>

      <div
        v-else-if="store.courses.length === 0"
        class="text-center py-16"
        style="color: var(--text-hint)"
      >
        還沒有任何課程，點右上角「新增課程」開始建立。
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div
          v-for="course in store.courses"
          :key="course.id"
          class="rounded-2xl border overflow-hidden flex flex-col"
          style="background: var(--surface); border-color: var(--border-light)"
        >
          <NuxtLink
            :to="`/staff/health-activities/course/${course.id}`"
            class="block"
          >
            <div
              class="h-32 bg-cover bg-center"
              style="background-color: var(--surface2)"
              :style="course.coverImage ? { backgroundImage: `url(${imgUrl(course.coverImage)})` } : {}"
            />
          </NuxtLink>
          <div class="p-4 flex-1 flex flex-col gap-2">
            <NuxtLink
              :to="`/staff/health-activities/course/${course.id}`"
              class="font-bold"
              style="color: var(--text-base)"
            >
              {{ course.name || '（未命名課程）' }}
            </NuxtLink>
            <p
              class="text-xs"
              style="color: var(--text-hint)"
            >
              {{ capacityLabel(course) }}
            </p>
            <p
              class="text-xs"
              style="color: var(--text-hint)"
            >
              {{ deadlineLabel(course) }}
            </p>
            <div class="flex gap-2 mt-auto pt-2">
              <NuxtLink
                :to="`/staff/health-activities/course/${course.id}`"
                class="flex-1 text-center text-sm py-2 rounded-lg border"
                style="border-color: var(--border-light); color: var(--text-muted)"
              >
                編輯課程
              </NuxtLink>
              <NuxtLink
                :to="`/staff/health-activities/course/${course.id}/registrations`"
                class="flex-1 text-center text-sm py-2 rounded-lg border"
                style="border-color: var(--border-light); color: var(--text-muted)"
              >
                報名名單
              </NuxtLink>
            </div>
            <div class="flex gap-2">
              <button
                class="flex-1 text-xs py-2 rounded-lg border"
                style="border-color: var(--border-light); color: var(--accent)"
                @click="copyShareLink(course)"
              >
                🔗 複製分享連結
              </button>
              <a
                :href="`${BASE_URL}/holy/course-reg/share/${course.id}`"
                target="_blank"
                rel="noopener"
                class="text-xs py-2 px-3 rounded-lg border flex items-center"
                style="border-color: var(--border-light); color: var(--text-muted)"
              >
                開啟
              </a>
              <button
                class="text-xs py-2 px-3 rounded-lg border text-red-500"
                style="border-color: var(--border-light)"
                @click="askDelete(course)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增課程 Modal -->
    <div
      v-if="modal.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div
        class="w-full max-w-sm rounded-2xl p-5"
        style="background: var(--surface)"
      >
        <h2
          class="font-bold mb-3"
          style="color: var(--text-base)"
        >
          新增課程
        </h2>
        <input
          v-model="form.name"
          type="text"
          placeholder="課程名稱"
          class="w-full border rounded-lg px-3 py-2 mb-4"
          style="border-color: var(--border-light); background: var(--surface2); color: var(--text-base)"
        >
        <div class="flex gap-2">
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
            {{ saving ? '建立中…' : '建立' }}
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
          刪除課程
        </h2>
        <p
          class="text-sm mb-4"
          style="color: var(--text-muted)"
        >
          確定要刪除「{{ deleteTarget.name }}」嗎？報名名單也會一併刪除，此動作無法復原。
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
            @click="confirmDelete"
          >
            確定刪除
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
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
