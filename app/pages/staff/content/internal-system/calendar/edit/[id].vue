<template>
  <InternalSystemCalendarShell>
  <InternalSystemCalendarForm :is-edit="true" :calendar-id="id" />
  </InternalSystemCalendarShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system' })

  const route = useRoute()
  const id = String(route.params.id)
</script>
