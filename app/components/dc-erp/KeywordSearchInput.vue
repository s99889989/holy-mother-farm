<script setup>
import { ref } from 'vue'

// 共用的「關鍵字」搜尋輸入元件：點下去/focus 顯示這台瀏覽器最近在這個
// 列表頁搜尋過的關鍵字，可以直接點選帶入；按 Enter 或點選都會把這次的
// 關鍵字存進紀錄。純前端用 localStorage 存，不會送到後端，也不會影響
// 原本查詢用的 API（原網站本來就沒有這個功能，這裡只是方便使用者自己
// 重複查詢常用關鍵字）。
//
// storageKey 每個列表頁要給不同的值（例如 dc-erp-sales-orders-keyword-
// history／dc-erp-sales-slips-keyword-history），避免不同列表的搜尋紀錄
// 互相污染。
const props = defineProps({
  modelValue: { type: String, default: '' },
  storageKey: { type: String, required: true },
  placeholder: { type: String, default: '' },
  widthClass: { type: String, default: 'w-40' }
})
const emit = defineEmits(['update:modelValue', 'enter'])

const MAX_HISTORY = 10
const showDropdown = ref(false)
const history = ref([])

function loadHistory() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(props.storageKey)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(list) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(props.storageKey, JSON.stringify(list))
  } catch {
    // localStorage 存不進去（例如無痕模式滿了）就算了，不影響搜尋本身
  }
}

function addToHistory(keyword) {
  const trimmed = keyword.trim()
  if (!trimmed) return
  const next = [trimmed, ...history.value.filter((k) => k !== trimmed)].slice(0, MAX_HISTORY)
  history.value = next
  saveHistory(next)
}

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function onFocus() {
  history.value = loadHistory()
  showDropdown.value = history.value.length > 0
}

function onBlur() {
  // 延遲關閉，讓下面選項的 click（mousedown）事件能先觸發
  setTimeout(() => { showDropdown.value = false }, 150)
}

function onEnter() {
  addToHistory(props.modelValue || '')
  showDropdown.value = false
  emit('enter')
}

function pick(keyword) {
  emit('update:modelValue', keyword)
  addToHistory(keyword)
  showDropdown.value = false
  emit('enter')
}
</script>

<template>
  <div class="relative">
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :class="widthClass"
      class="rounded border border-light-c bg-surface px-2 py-1"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keyup.enter="onEnter"
    >
    <ul
      v-if="showDropdown && history.length"
      class="absolute z-20 mt-1 max-h-48 overflow-y-auto rounded border border-light-c bg-surface text-sm shadow-lg"
      :class="widthClass"
    >
      <li
        v-for="(k, i) in history"
        :key="i"
        class="cursor-pointer truncate px-2 py-1 hover:bg-surface2"
        @mousedown.prevent="pick(k)"
      >
        {{ k }}
      </li>
    </ul>
  </div>
</template>
