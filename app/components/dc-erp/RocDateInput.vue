<script setup>
import { ref, computed } from 'vue'

// 共用的「民國年日期」輸入元件：維持原本可以直接手打 115/09/30 這種格式的
// 文字輸入（跟原網站查詢表單一致，也是目前 API 已經在用、驗證過的格式），
// 另外加一顆日曆圖示按鈕，點下去用瀏覽器原生 <input type="date"> 選日期
// （西元年），選完自動換算回民國年字串填回文字欄位。
//
// 原生 date input 用 showPicker()（Chrome 系瀏覽器支援）跳出日曆；不支援
// 的瀏覽器則退回讓那顆隱藏欄位自己 focus，使用者還是可以用鍵盤打西元日期，
// 文字欄位本身永遠可以直接手打，不會因為日曆功能而失去原本的操作方式。
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

function rocToIso(roc) {
  if (!roc) return ''
  const m = roc.trim().match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return ''
  const year = Number(m[1]) + 1911
  return `${year}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function isoToRoc(iso) {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  const rocYear = Number(m[1]) - 1911
  return `${rocYear}/${m[2]}/${m[3]}`
}

const isoValue = computed(() => rocToIso(props.modelValue))
const dateInput = ref(null)

function onTextInput(e) {
  emit('update:modelValue', e.target.value)
}

function onPick(e) {
  emit('update:modelValue', isoToRoc(e.target.value))
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
      class="w-28 rounded border border-light-c bg-surface py-1 pl-2 pr-6"
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
