<script setup>
import { ref } from 'vue'

// 共用的「可管理紀錄」文字輸入元件：跟 DcErpKeywordSearchInput（自動記錄
// 最近搜尋過的關鍵字，只能挑不能改）不一樣，這支多了使用者自己手動管理
// 的一份清單——可以把目前輸入的內容存成一筆紀錄、之後從清單挑選、也可以
// 編輯或刪除某一筆紀錄。純前端用 localStorage 存，不會送到後端。
//
// 兩種面板，分開觸發：
//   1. 點擊/focus 輸入框本身 → 只顯示乾淨的清單（點了就直接帶入），跟
//      DcErpKeywordSearchInput 一樣單純，不會看到編輯/刪除的圖示擠在旁邊。
//   2. 點旁邊的📑按鈕 → 才顯示「管理」面板（每筆多了編輯✎/刪除✕，底下
//      多一顆「把目前輸入的內容存成紀錄」）。
// 點面板外面（背景）會關閉面板。
//
// 「編輯」「刪除」用瀏覽器原生 prompt()/confirm()，這個工具本來就是內部
// 後台用，不特別再做一個小型彈窗表單。
//
// 檔名要用 DcErp 開頭——Nuxt 的元件自動註冊在檔名已經是資料夾名稱
// （dc-erp → DcErp）開頭時才會省略前綴，不然要用 <DcErpXxx> 這種帶前綴的
// 標籤才 resolve 得到，用短名字會直接不渲染（之前 DcErpKeywordSearchInput
// 就是踩到這個雷）。
const props = defineProps({
  modelValue: { type: String, default: '' },
  storageKey: { type: String, required: true },
  placeholder: { type: String, default: '' },
  widthClass: { type: String, default: 'w-40' },
  recordLabel: { type: String, default: '已儲存的紀錄' }
})
const emit = defineEmits(['update:modelValue', 'enter'])

const showPanel = ref(false)
const panelMode = ref('pick') // 'pick'（單純選）｜'manage'（可編輯/刪除/新增）
const records = ref([])

function loadRecords() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(props.storageKey)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecords(list) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(props.storageKey, JSON.stringify(list))
  } catch {
    // 存不進去（例如無痕模式滿了）就算了，不影響輸入本身
  }
}

function openPanelOnFocus() {
  records.value = loadRecords()
  panelMode.value = 'pick'
  showPanel.value = true
}

function toggleManagePanel() {
  if (showPanel.value && panelMode.value === 'manage') {
    showPanel.value = false
    return
  }
  records.value = loadRecords()
  panelMode.value = 'manage'
  showPanel.value = true
}

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function onEnter() {
  emit('enter')
}

function pick(record) {
  emit('update:modelValue', record.value)
  showPanel.value = false
  emit('enter')
}

function addCurrentAsRecord() {
  const value = (props.modelValue || '').trim()
  if (!value) return
  if (records.value.some((r) => r.value === value)) return // 已經存過同樣內容就不重複加
  const next = [...records.value, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, value }]
  records.value = next
  saveRecords(next)
}

function editRecord(record) {
  const next = window.prompt('編輯紀錄內容', record.value)
  if (next === null) return // 使用者按取消
  const trimmed = next.trim()
  if (!trimmed) return
  const list = records.value.map((r) => (r.id === record.id ? { ...r, value: trimmed } : r))
  records.value = list
  saveRecords(list)
}

function deleteRecord(record) {
  if (!window.confirm(`確定要刪除紀錄「${record.value}」嗎？`)) return
  const list = records.value.filter((r) => r.id !== record.id)
  records.value = list
  saveRecords(list)
}
</script>

<template>
  <div class="relative inline-flex items-center">
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :class="widthClass"
      class="rounded-l border border-r-0 border-light-c bg-surface px-2 py-1"
      @input="onInput"
      @keyup.enter="onEnter"
      @focus="openPanelOnFocus"
    >
    <button
      type="button"
      class="rounded-r border border-light-c bg-surface2 px-2 py-1 text-muted-c hover:bg-surface"
      title="管理已儲存的紀錄"
      @click="toggleManagePanel"
    >
      📑
    </button>

    <div v-if="showPanel" class="fixed inset-0 z-20" @click="showPanel = false" />

    <!-- 單純選單：focus 輸入框時顯示，只能點選，沒有編輯/刪除 -->
    <ul
      v-if="showPanel && panelMode === 'pick'"
      class="absolute left-0 top-full z-30 mt-1 max-h-48 w-max min-w-full overflow-y-auto rounded border border-light-c bg-surface text-sm shadow-lg"
      @click.stop
    >
      <li
        v-for="r in records"
        :key="r.id"
        class="cursor-pointer truncate px-2 py-1 hover:bg-surface2"
        @mousedown.prevent="pick(r)"
      >
        {{ r.value }}
      </li>
      <li v-if="!records.length" class="px-2 py-2 text-center text-hint-c">尚無紀錄，可點右側📑按鈕新增</li>
    </ul>

    <!-- 管理面板：點📑按鈕才顯示，可編輯/刪除/新增 -->
    <div
      v-if="showPanel && panelMode === 'manage'"
      class="absolute left-0 top-full z-30 mt-1 w-64 rounded border border-light-c bg-surface p-2 text-sm shadow-lg"
      @click.stop
    >
      <div class="mb-1 text-xs text-muted-c">{{ recordLabel }}</div>
      <ul class="max-h-48 overflow-y-auto">
        <li
          v-for="r in records"
          :key="r.id"
          class="flex items-center gap-1 rounded px-1 py-1 hover:bg-surface2"
        >
          <button type="button" class="flex-1 truncate text-left" @click="pick(r)">{{ r.value }}</button>
          <button type="button" class="text-hint-c hover:text-base-c" title="編輯" @click="editRecord(r)">✎</button>
          <button type="button" class="text-hint-c hover:text-red-600" title="刪除" @click="deleteRecord(r)">✕</button>
        </li>
        <li v-if="!records.length" class="px-1 py-2 text-center text-hint-c">尚無紀錄</li>
      </ul>
      <button
        type="button"
        class="mt-2 w-full rounded border border-light-c py-1 text-xs text-muted-c hover:bg-surface2"
        @click="addCurrentAsRecord"
      >
        + 把目前輸入的內容存成紀錄
      </button>
    </div>
  </div>
</template>
