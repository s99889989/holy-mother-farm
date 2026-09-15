<template>
  <InternalSystemPropertyShell>
  <div class="feature-placeholder">
    <div class="placeholder-icon">🚧</div>
    <h2 class="placeholder-title">{{ label }}</h2>
    <p class="placeholder-text">此功能開發中，尚未串接。</p>
  </div>
  </InternalSystemPropertyShell>
</template>

<script setup lang="ts">
import { getInternalSystemPropertyFeatureLabel } from '~/utils/internal-system/propertyMenu'

definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system', middleware: 'internal-system-auth' })

const route = useRoute()
const label = computed(() => getInternalSystemPropertyFeatureLabel(String(route.params.feature)))
</script>

<style scoped>
.feature-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: var(--text-hint);
}

.placeholder-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.placeholder-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px;
}

.placeholder-text {
  font-size: 14px;
  margin: 0;
}
</style>