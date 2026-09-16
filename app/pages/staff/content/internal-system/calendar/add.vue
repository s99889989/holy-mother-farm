<template>
  <InternalSystemCalendarShell>
  <InternalSystemCalendarForm :initial-date="date" />
  </InternalSystemCalendarShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system' })

  const route = useRoute()
  const date = String(route.query.date ?? '')
</script>
