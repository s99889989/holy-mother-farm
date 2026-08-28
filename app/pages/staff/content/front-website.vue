<script setup>
  definePageMeta({ layout: 'staff', requiredPermission: 'content.front-website' })

  import NewsPanel from '~/components/front-website/NewsPanel.vue'
  import ProductPanel from '~/components/front-website/ProductPanel.vue'
  import ProductionPanel from '~/components/front-website/ProductionPanel.vue'

  const tabs = [
    { key: 'news',       label: '活動消息',   component: NewsPanel,       dotClass: 'bg-sky-600',    barClass: 'bg-sky-600' },
    { key: 'product',    label: '推薦農產品', component: ProductPanel,    dotClass: 'bg-emerald-600', barClass: 'bg-emerald-600' },
    { key: 'production', label: '產品訂購',   component: ProductionPanel, dotClass: 'bg-teal-600',   barClass: 'bg-teal-600' },
  ]

  const activeTab = ref('news')
  const activeComponent = computed(() => tabs.find(t => t.key === activeTab.value)?.component)
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300 flex">

    <!-- ── 左側頁籤選單 ── -->
    <aside class="w-44 sm:w-52 flex-shrink-0 bg-surface border-r border-light-c min-h-full sticky top-0 self-start">
      <nav class="py-3">
        <button v-for="tab in tabs" :key="tab.key"
                @click="activeTab = tab.key"
                class="relative w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-left transition-colors"
                :class="activeTab === tab.key
                  ? 'text-base-c bg-surface2'
                  : 'text-hint-c hover:text-muted-c hover:bg-surface2'">
          <span class="w-2 h-2 rounded-full flex-shrink-0" :class="tab.dotClass"></span>
          {{ tab.label }}
          <span v-if="activeTab === tab.key"
                class="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                :class="tab.barClass"></span>
        </button>
      </nav>
    </aside>

    <!-- ── 頁籤內容（keep-alive 保留各頁籤已載入的資料，切換不重新打 API） ── -->
    <div class="flex-1 min-w-0">
      <keep-alive>
        <component :is="activeComponent" />
      </keep-alive>
    </div>

  </div>
</template>
