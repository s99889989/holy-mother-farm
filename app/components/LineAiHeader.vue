<template>
  <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
    <div
      class="mx-auto flex items-center gap-2"
      :class="wide ? 'max-w-7xl' : 'max-w-5xl'"
    >
      <div
        class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white flex-shrink-0"
        style="font-size:15px"
      >
        💬
      </div>
      <div class="flex-1 min-w-0">
        <h1
          class="font-bold text-base-c leading-none"
          style="font-size:16px"
        >
          LINE AI 客服
        </h1>
      </div>
      <select
        v-if="accounts.length"
        :value="accountId"
        class="select-input"
        style="max-width:220px"
        @change="onSelect(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="a in accounts"
          :key="a.id"
          :value="a.id"
        >
          {{ a.name }}{{ a.enabled ? '' : '（已停用）' }}
        </option>
      </select>
      <span
        v-else
        class="text-hint-c"
        style="font-size:13px"
      >尚未新增官方帳號</span>
    </div>
    <div
      class="mx-auto mt-2"
      :class="wide ? 'max-w-7xl' : 'max-w-5xl'"
    >
      <div class="segmented w-fit">
        <NuxtLink
          v-for="t in tabs"
          :key="t.to"
          :to="t.to"
          :class="route.path === t.to ? 'seg-active' : ''"
          :style="route.path === t.to ? segActiveStyle : ''"
        >
          {{ t.label }}
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ wide?: boolean }>(), { wide: false })
const emit = defineEmits<{ (e: 'change', id: string): void }>()

const route = useRoute()
const { accounts, accountId, selectAccount } = useLineAi()

// 行內樣式備援：避免外部/全域 CSS 蓋掉 .seg-active
const segActiveStyle = { background: '#15803d', color: '#fff' }

const base = '/staff/content/line-ai'
const tabs = [
  { to: base, label: '客服對話' },
  { to: `${base}/knowledge`, label: '知識庫' },
  { to: `${base}/settings`, label: '設定' },
]

function onSelect(id: string) {
  selectAccount(id)
  emit('change', id)
}
</script>

<style scoped>
.segmented {
  display: flex;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.segmented a {
  border: none;
  background: transparent;
  color: var(--text-muted);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
}

.segmented a:hover {
  background: var(--border-light);
  color: var(--text);
}

.seg-active, .seg-active:hover {
  background: #15803d;
  color: #fff;
}

.w-fit {
  width: fit-content;
}

.select-input {
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 13.5px;
  background: var(--surface2);
  color: var(--text);
}
</style>
