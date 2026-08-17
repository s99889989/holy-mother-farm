<script setup>
import { ref, computed } from 'vue'

// 共用的「西元年日期」輸入元件：維持原本可以直接手打 2026/08/17 這種格式的
// 文字輸入（跟訂貨單/銷貨單新增編輯頁「訂貨日期／交貨日期」原本的格式一致），
// 另外加一顆日曆圖示按鈕，點下去用瀏覽器原生 <input type="date"> 選日期，
// 選完自動填回文字欄位（YYYY/MM/DD）。
//
// 跟 DcErpRocDateInput 的差別只有年份不用民國年轉換（這裡欄位本來就是存
// 西元年字串），其餘行為一致：showPicker() 跳日曆、不支援的瀏覽器退回
// focus()，文字欄位本身永遠可以直接手打。
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'YYYY/MM/DD' },
  widthClass: { type: String, default: 'w-28' }
})
const emit = defineEmits(['update:modelValue'])

function toIso(v) {
  if (!v) return ''
  const m = v.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return ''
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function fromIso(iso) {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  return `${m[1]}/${m[2]}/${m[3]}`
}

const isoValue = computed(() => toIso(props.modelValue))
const dateInput = ref(null)

function onTextInput(e) {
  emit('update:modelValue', e.target.value)
}

function onPick(e) {
  emit('update:modelValue', fromIso(e.target.value))
}

function openPicker() {
  const el = dateInput.value
  if (!el) return
  if (typeof el.showPicker === 'function') {
    try {
      el.showPicker()
      return
    } catch {
      // 部分瀏覽器在特定情況會擋 showPicker()，就退回 focus()
    }
  }
  el.focus()
}
</script>

<template>
  <div class="relative inline-flex items-center">
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :class="widthClass"
      class="rounded border border-light-c bg-surface py-1 pl-2 pr-6"
      @input="onTextInput"
    >
    <button
      type="button"
      tabindex="-1"
      class="absolute right-1 text-hint-c hover:text-base-c"
      title="選擇日期"
      @click="openPicker"
    >
      📅
    </button>
    <input
      ref="dateInput"
      type="date"
      class="sr-only"
      :value="isoValue"
      @change="onPick"
    >
  </div>
</template>
