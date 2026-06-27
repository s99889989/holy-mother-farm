<template>
  <div class="h-screen flex flex-col bg-page transition-colors">
    <StaffNavbar />
    <div id="staff-scroll-wrap" class="flex-1 overflow-y-auto">
      <slot />
    </div>
  </div>
</template>

<script setup>
const commonStore = useCommonStore()
const customerStore = useCustomerStore()
const permissionStore = usePermissionStore()

onMounted(async () => {
  if (!permissionStore.loaded) {
    const customerId = customerStore.isLoggedIn ? customerStore.customer.id : null
    await permissionStore.load(customerId, commonStore.data.main_url)
  } else {
    // 已有快取 → 背景靜默更新，不擋頁面
    const customerId = customerStore.isLoggedIn ? customerStore.customer.id : null
    permissionStore.load(customerId, commonStore.data.main_url, true)
  }
})
</script>

<style src="~/assets/css/main.css" />
<style>
@media print {
  #staff-scroll-wrap {
    overflow: visible !important;
    height: auto !important;
    flex: none !important;
  }
}
</style>
