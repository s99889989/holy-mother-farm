<script setup>
import { ref } from 'vue'

// 共用分頁控制列：第一頁／上一頁／下一頁／最末頁 + 指定頁數跳頁。
// 父層只要傳目前頁碼/總頁數，跳頁邏輯（clamp 範圍、觸發查詢）都由父層
// 自己的 goPage(p) 處理，這支元件只負責發出使用者想去的頁碼。
const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true }
})
const emit = defineEmits(['go'])

const jumpInput = ref('')

function submitJump() {
  const n = parseInt(jumpInput.value, 10)
  if (!Number.isFinite(n)) return
  const target = Math.min(Math.max(n, 1), Math.max(props.totalPages, 1))
  emit('go', target)
  jumpInput.value = ''
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      class="rounded border border-light-c px-2 py-1 disabled:opacity-40"
      :disabled="page <= 1"
      @click="$emit('go', 1)"
    >
      第一頁
    </button>
    <button
      class="rounded border border-light-c px-2 py-1 disabled:opacity-40"
      :disabled="page <= 1"
      @click="$emit('go', page - 1)"
    >
      上一頁
    </button>
    <span>第 {{ page }} / {{ totalPages }} 頁</span>
    <button
      class="rounded border border-light-c px-2 py-1 disabled:opacity-40"
      :disabled="page >= totalPages"
      @click="$emit('go', page + 1)"
    >
      下一頁
    </button>
    <button
      class="rounded border border-light-c px-2 py-1 disabled:opacity-40"
      :disabled="page >= totalPages"
      @click="$emit('go', totalPages)"
    >
      最末頁
    </button>
    <span class="flex items-center gap-1">
      <input
        v-model="jumpInput"
        type="number"
        min="1"
        :max="totalPages"
        placeholder="頁數"
        class="w-16 rounded border border-light-c bg-surface px-2 py-1"
        @keyup.enter="submitJump"
      >
      <button class="rounded border border-light-c px-2 py-1 text-muted-c hover:bg-surface2" @click="submitJump">跳至</button>
    </span>
  </div>
</template>
