<template>
  <InternalSystemRequestShell>
  <div class="page">
    <div class="map-wrap">
      <img src="/images/maintenance-management-system/map.jpg" alt="園區地圖" class="map-image" />
    </div>
  </div>
  </InternalSystemRequestShell>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })
</script>

<style scoped>
  /* main-content 本身有 20px padding（見 request.vue layout），
     這裡扣掉頂部導覽列高度(52px)，讓地圖區塊撐滿剩下的視窗高度 */
  .page {
    height: calc(100vh - 52px - 40px);
  }

  .map-wrap {
    height: 100%;
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
  }

  .map-image {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: var(--radius-sm);
  }
</style>