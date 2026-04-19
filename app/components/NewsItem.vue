<template>
  <div class="w-full">
    <div class="flex items-baseline gap-3 py-2 px-1">
      <span class="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{{ record.createdAt }}</span>
      <NuxtLink :to="`/site/news/${record.id}`"
        class="text-[#44271a] hover:text-[#5a8a3c] transition-colors text-sm leading-relaxed">
        {{ record.title }}
      </NuxtLink>
    </div>
    <div class="border-b border-dashed border-gray-400"></div>
  </div>
</template>

<script setup>
defineProps({
  record: { type: Object, required: true }
})
</script>
