<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- Header -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">💵</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">點鈔作業</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Cash Count</p>
          </div>
        </div>
        <button @click="openForm"
                class="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          新增點鈔
        </button>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="flex flex-col lg:flex-row gap-4 items-start">

        <!-- 左側日曆 -->
        <div class="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 lg:sticky lg:top-20">
            <div class="flex items-center justify-between mb-3">
              <button @click="prevMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <span class="text-base font-semibold text-stone-700 dark:text-stone-100">{{ calYear }}年 {{ calMonth }}月</span>
              <button @click="nextMonth" class="p-1.5 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
            <div class="grid grid-cols-7 mb-1">
              <div v-for="w in ['日','一','二','三','四','五','六']" :key="w"
                   class="text-center text-sm text-stone-400 dark:text-stone-500 font-medium py-1">{{ w }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(day, idx) in calendarDays" :key="idx"
                   class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
                   :class="dayClass(day)"
                   @click="day.date && selectDate(day.date)">
                <span>{{ day.label }}</span>
                <span v-if="day.date && recordDates.has(day.date)"
                      class="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                      :class="day.date === selectedDate ? 'bg-white' : 'bg-green-500'">
                </span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
              <span class="text-sm text-stone-700 dark:text-stone-200 font-medium">{{ selectedDate || '請選擇日期' }}</span>
              <button @click="selectDate(todayStr)" class="text-sm text-green-700 dark:text-green-400 hover:text-green-800 font-medium">今天</button>
            </div>
          </div>
        </div>

        <!-- 右側明細 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-stone-700 dark:text-stone-100 text-base sm:text-lg">
              {{ selectedDate }} 點鈔記錄
            </h2>
          </div>

          <div v-if="loading" class="text-sm text-stone-400 py-8 text-center">載入中...</div>

          <div v-else-if="selectedRecords.length === 0"
               class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 px-4 py-12 text-center text-stone-400 text-sm shadow-sm">
            今天還沒有點鈔記錄
          </div>

          <div v-else class="space-y-3">
            <div v-for="r in selectedRecords" :key="r.id"
                 class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
              <div class="flex items-stretch">
                <div class="w-20 flex-shrink-0 bg-green-50 dark:bg-green-900/20 flex flex-col items-center justify-center border-r border-green-100 dark:border-green-800/30 py-3 px-1">
                  <span class="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide mb-0.5">總計</span>
                  <span class="text-base font-black text-green-700 dark:text-green-300 leading-tight text-center">${{ Number(r.total).toLocaleString() }}</span>
                </div>
                <div class="flex-1 px-3 py-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div v-if="r.note" class="mb-1.5">
                        <span class="text-xs bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-stone-300 rounded-full px-2 py-0.5">{{ r.note }}</span>
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        <template v-for="d in allDenoms" :key="d.value">
                          <span v-if="r.items && Number(r.items[d.value]) > 0"
                                class="text-xs bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 rounded px-2 py-0.5">
                            {{ d.label }} × {{ r.items[d.value] }}
                          </span>
                        </template>
                      </div>
                      <img v-if="r.photoPath" :src="`${BASE()}/photo/${r.photoPath}`"
                           class="mt-2 max-h-40 rounded-lg object-contain border border-stone-100 dark:border-stone-700" />
                      <div class="flex items-center gap-2 mt-2 text-xs text-stone-300 dark:text-stone-600">
                        <span v-if="r.createdAt">建立 {{ r.createdAt }}</span>
                        <span v-if="r.updatedAt && r.updatedAt !== r.createdAt"> · 更新 {{ r.updatedAt }}</span>
                      </div>
                    </div>
                    <div class="flex gap-1.5 flex-shrink-0">
                      <button @click="openEditForm(r)"
                              class="px-2.5 py-1 text-xs border border-blue-300 dark:border-blue-700 text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">編輯</button>
                      <button @click="deleteRecord(r.id)"
                              class="px-2.5 py-1 text-xs border border-red-200 dark:border-red-800 text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">刪除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/編輯 Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div class="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <h3 class="font-bold text-stone-800 dark:text-stone-100 mb-4">{{ isEdit ? '編輯點鈔記錄' : '新增點鈔記錄' }}</h3>

        <!-- 日期 + 備註（上下排列） -->
        <div class="space-y-3 mb-4">
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">日期</label>
            <input type="date" v-model="form.date"
                   class="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">備註</label>
            <input type="text" v-model="form.note" placeholder="班別等"
                   class="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 placeholder-stone-300 outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>

        <!-- 面額輸入 -->
        <div class="rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden mb-4">
          <table class="w-full text-sm">
            <thead>
            <tr class="bg-stone-50 dark:bg-zinc-800">
              <th class="text-left px-4 py-2 text-stone-400 font-normal">面額</th>
              <th class="text-right px-4 py-2 text-stone-400 font-normal">數量</th>
              <th class="text-right px-4 py-2 text-stone-400 font-normal">小計</th>
            </tr>
            </thead>
            <tbody>
            <template v-for="(group, gi) in denomGroups" :key="gi">
              <tr v-if="gi > 0"><td colspan="3" class="border-t-2 border-dashed border-stone-100 dark:border-stone-700"></td></tr>
              <tr v-for="d in group" :key="d.value" class="border-t border-stone-50 dark:border-stone-700/50">
                <td class="px-4 py-2">
                  <span class="inline-block bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 rounded px-2 py-0.5 text-xs font-medium">{{ d.label }}</span>
                </td>
                <td class="px-4 py-2 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button type="button"
                            @click="form.items[d.value] = Math.max(0, (Number(form.items[d.value]) || 0) - 1)"
                            class="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors text-base leading-none select-none">−</button>
                    <input type="number" min="0" v-model.number="form.items[d.value]"
                           class="w-14 text-center border border-stone-200 dark:border-stone-600 rounded-lg px-1 py-1 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-400"
                           placeholder="0" />
                    <button type="button"
                            @click="form.items[d.value] = (Number(form.items[d.value]) || 0) + 1"
                            class="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors text-base leading-none select-none">+</button>
                  </div>
                </td>
                <td class="px-4 py-2 text-right font-medium"
                    :class="subtotal(d.value) > 0 ? 'text-stone-800 dark:text-stone-100' : 'text-stone-300 dark:text-stone-600'">
                  {{ subtotal(d.value) > 0 ? subtotal(d.value).toLocaleString() : '—' }}
                </td>
              </tr>
            </template>
            </tbody>
          </table>
          <div class="flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-zinc-800 border-t border-stone-100 dark:border-stone-700">
            <span class="text-sm text-stone-500">總金額</span>
            <span class="text-xl font-semibold text-stone-800 dark:text-stone-100">${{ total.toLocaleString() }}</span>
          </div>
        </div>

        <!-- 照片上傳 -->
        <div class="mb-4">
          <label class="text-sm font-medium text-stone-600 dark:text-stone-300 block mb-1">收銀機照片（選填）</label>
          <ClientOnly>
            <div
              class="border border-dashed border-stone-200 dark:border-stone-600 rounded-xl p-4 text-center cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors"
              @click="triggerPhotoInput">
              <div v-if="!photoPreview" class="text-sm text-stone-400">點擊上傳</div>
              <img v-else :src="photoPreview" class="mx-auto max-h-36 rounded-lg object-contain" />
            </div>
            <input ref="photoInputRef" type="file" accept="image/*" class="hidden" @change="handlePhotoSelect" />
            <button v-if="photoPreview" @click="clearPhoto"
                    class="mt-1 text-xs text-stone-400 hover:text-red-400 transition-colors w-full text-center">移除照片</button>
          </ClientOnly>
        </div>

        <!-- 按鈕 -->
        <div class="flex gap-2">
          <button @click="showForm = false"
                  class="flex-1 py-2.5 text-sm border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 transition-colors">取消</button>
          <button @click="save" :disabled="saving"
                  class="flex-1 py-2.5 text-sm bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white rounded-xl font-medium transition-colors">
            {{ saving ? '儲存中...' : (isEdit ? '更新' : '儲存') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useCommonStore } from '~/stores/common.js'

const commonStore   = useCommonStore()
const BASE          = () => commonStore.data.main_url + '/holy/cashCount'
const photoInputRef = ref(null)

// ── 日曆 ──────────────────────────────────────────────────────────
const today    = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const calYear  = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)
const selectedDate = ref(todayStr)

const calendarDays = computed(() => {
  const firstDay    = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ label: '', date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push({ label: d, date: `${calYear.value}-${mm}-${dd}` })
  }
  return days
})

const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.date === selectedDate.value) return 'bg-green-700 text-white font-bold shadow-sm'
  if (day.date === todayStr) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold hover:bg-green-200 dark:hover:bg-green-800/40'
  return 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
}

function prevMonth() {
  if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 } else calMonth.value--
}
function nextMonth() {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 } else calMonth.value++
}
function selectDate(date) {
  selectedDate.value = date
}

// ── 資料 ──────────────────────────────────────────────────────────
const loading           = ref(false)
const records           = ref([])
const saving            = ref(false)
const showForm          = ref(false)
const isEdit            = ref(false)
const editId            = ref('')
const originalPhotoPath = ref('')
const photoFile         = ref(null)
const photoPreview      = ref('')
const toast             = reactive({ show: false, message: '' })

const recordDates     = computed(() => new Set(records.value.map(r => r.date)))
const selectedRecords = computed(() => records.value.filter(r => r.date === selectedDate.value))

// ── 面額 ──────────────────────────────────────────────────────────
const denomGroups = [
  [{ label: '1000元', value: 1000 }, { label: '500元', value: 500 }, { label: '100元', value: 100 }],
  [{ label: '50元', value: 50 }, { label: '10元', value: 10 }, { label: '5元', value: 5 }, { label: '1元', value: 1 }],
]
const allDenoms = denomGroups.flat()
const initItems = () => Object.fromEntries(allDenoms.map(d => [d.value, 0]))

const form = ref({ date: todayStr, note: '', items: initItems() })

const subtotal = (val) => (Number(form.value.items[val]) || 0) * val
const total    = computed(() => allDenoms.reduce((sum, d) => sum + subtotal(d.value), 0))

// ── 照片 ──────────────────────────────────────────────────────────
function triggerPhotoInput() {
  photoInputRef.value?.click()
}

function handlePhotoSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  photoFile.value    = file
  photoPreview.value = URL.createObjectURL(file)
}

function clearPhoto() {
  photoFile.value         = null
  photoPreview.value      = ''
  originalPhotoPath.value = ''
  if (photoInputRef.value) photoInputRef.value.value = ''
}

// ── 表單 ──────────────────────────────────────────────────────────
function openForm() {
  isEdit.value            = false
  editId.value            = ''
  originalPhotoPath.value = ''
  form.value              = { date: selectedDate.value, note: '', items: initItems() }
  photoFile.value         = null
  photoPreview.value      = ''
  showForm.value          = true
}

function openEditForm(r) {
  isEdit.value            = true
  editId.value            = r.id
  originalPhotoPath.value = r.photoPath || ''
  form.value = {
    date:  r.date,
    note:  r.note || '',
    items: Object.fromEntries(allDenoms.map(d => [d.value, Number(r.items?.[d.value]) || 0])),
  }
  photoFile.value    = null
  photoPreview.value = r.photoPath ? `${BASE()}/photo/${r.photoPath}` : ''
  showForm.value     = true
}

// ── API ───────────────────────────────────────────────────────────
async function save() {
  saving.value = true
  try {
    let photoPath = ''
    if (photoFile.value) {
      const fd = new FormData()
      fd.append('file', photoFile.value)
      const res  = await fetch(`${BASE()}/uploadPhoto`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) photoPath = data.path
    } else {
      photoPath = originalPhotoPath.value
    }
    const payload = {
      ...(isEdit.value ? { id: editId.value } : {}),
      date:      form.value.date,
      note:      form.value.note,
      items:     form.value.items,
      total:     total.value,
      photoPath,
    }
    const url    = isEdit.value ? `${BASE()}/update` : `${BASE()}/save`
    const method = isEdit.value ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    showForm.value     = false
    selectedDate.value = form.value.date
    showToast(isEdit.value ? '已更新' : '點鈔記錄已儲存')
    await fetchRecords()
  } catch { showToast('儲存失敗') }
  finally { saving.value = false }
}

async function fetchRecords() {
  loading.value = true
  try {
    const res     = await fetch(`${BASE()}/list`)
    records.value = await res.json()
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function deleteRecord(id) {
  if (!confirm('確定刪除這筆記錄？')) return
  try {
    await fetch(`${BASE()}/delete/${id}`, { method: 'DELETE' })
    records.value = records.value.filter(r => r.id !== id)
    showToast('已刪除')
  } catch { showToast('刪除失敗') }
}

const showToast = (msg) => {
  toast.message = msg
  toast.show    = true
  setTimeout(() => toast.show = false, 2500)
}

onMounted(fetchRecords)
</script>

<style scoped>
input[type=number],
input[type=text],
input[type=date] {
  font-size: 16px !important;
}

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
