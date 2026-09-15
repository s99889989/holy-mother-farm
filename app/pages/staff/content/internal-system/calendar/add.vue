<template>
  <InternalSystemCalendarNav />
  <InternalSystemCalendarForm :initial-date="date" />
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system' })

  const route = useRoute()
  const date = String(route.query.date ?? '')
</script>
