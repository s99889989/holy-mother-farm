<script setup>
  const route = useRoute()
  const { groups } = usePosNav()

  const collapsed = ref(false)
  const mobileSidebarOpen = ref(false)

  const POS_SIDEBAR_STORAGE_KEY = 'pos-sidebar-collapsed'

  onMounted(() => {
    if (import.meta.client) {
      collapsed.value = localStorage.getItem(POS_SIDEBAR_STORAGE_KEY) === '1'
    }
  })

  watch(collapsed, (val) => {
    if (import.meta.client) {
      localStorage.setItem(POS_SIDEBAR_STORAGE_KEY, val ? '1' : '0')
    }
  })

  // 換頁時自動收起手機版側欄
  watch(() => route.path, () => {
    mobileSidebarOpen.value = false
  })

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function toggleMobileSidebar() {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  }

  function isActive(to) {
    return route.path.startsWith(to)
  }

  // 側邊欄不再逐項用權限過濾：能不能進 POS 系統，已經在 StaffNavbar 的入口那層判斷過了
  // （見 usePosNav 的 key 陣列 + 頂部導覽的 filterItems）。這裡固定顯示完整選單，
  // 避免權限 key 對不上（例如帳務查詢 / 銷售報表 / 品項設置 / 資料庫設置）而被誤濾掉。
  // 若真的沒有某頁權限，頁面本身的 definePageMeta requiredPermission 還是會擋下來。
  const visibleGroups = computed(() => groups.filter(g => g.items.length > 0))
</script>

<template>
  <div class="pos-shell">
    <StaffNavbar />

    <div class="pos-layout">
      <!-- 手機版側欄開啟時的背景遮罩，點擊可關閉 -->
      <div
        v-if="mobileSidebarOpen"
        class="pos-sidebar-backdrop lg:hidden"
        @click="mobileSidebarOpen = false"
      />

      <aside
        class="pos-sidebar"
        :class="[
          collapsed ? 'pos-sidebar-collapsed' : '',
          mobileSidebarOpen ? 'pos-sidebar-open' : ''
        ]"
      >
        <div class="pos-sidebar-top">
          <span
            v-if="!collapsed"
            class="pos-sidebar-title"
          >🖥️ POS 系統</span>
          <button
            type="button"
            class="pos-sidebar-collapse-btn"
            :title="collapsed ? '展開選單' : '收合選單'"
            @click="toggleCollapsed"
          >
            <svg
              class="w-4 h-4"
              :class="collapsed ? 'rotate-180' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        <nav class="pos-sidebar-scroll">
          <div
            v-for="group in visibleGroups"
            :key="group.label"
            class="pos-sidebar-group"
          >
            <p
              v-if="!collapsed"
              class="pos-sidebar-group-label"
            >
              {{ group.label }}
            </p>
            <NuxtLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="pos-sidebar-item"
              :class="isActive(item.to) ? 'pos-sidebar-item-active' : ''"
              :title="collapsed ? item.label : ''"
            >
              <span class="pos-sidebar-item-icon">{{ item.icon }}</span>
              <span
                v-if="!collapsed"
                class="pos-sidebar-item-label"
              >{{ item.label }}</span>
            </NuxtLink>
          </div>
        </nav>
      </aside>

      <!-- 手機版：浮動按鈕開啟側欄 -->
      <button
        type="button"
        class="pos-mobile-toggle lg:hidden"
        @click="toggleMobileSidebar"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <main class="pos-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
  .pos-shell {
    min-height: 100vh;
    background: var(--surface2);
  }

  .pos-layout {
    display: flex;
    align-items: flex-start;
    position: relative;
  }

  .pos-sidebar {
    width: 208px;
    flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border-light);
    display: flex;
    flex-direction: column;
    transition: width 0.15s ease;
  }

  .pos-sidebar-collapsed {
    width: 60px;
  }

  .pos-sidebar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-light);
    flex-shrink: 0;
  }

  .pos-sidebar-title {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text);
    white-space: nowrap;
  }

  .pos-sidebar-collapse-btn {
    color: var(--text-hint);
    padding: 4px;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .pos-sidebar-collapse-btn:hover {
    background: var(--surface2);
  }

  .pos-sidebar-scroll {
    padding: 10px 8px;
    flex: 1;
  }

  .pos-sidebar-group {
    margin-bottom: 14px;
  }

  .pos-sidebar-group-label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--text-hint);
    padding: 0 6px;
    margin-bottom: 6px;
    white-space: nowrap;
  }

  .pos-sidebar-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
  }

  .pos-sidebar-item:hover {
    background: var(--surface2);
  }

  .pos-sidebar-item-active {
    background: var(--accent-light);
    color: var(--accent);
    font-weight: 600;
  }

  .pos-sidebar-item-icon {
    flex-shrink: 0;
    font-size: 1.05rem;
    width: 20px;
    text-align: center;
  }

  .pos-sidebar-item-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pos-sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 45;
  }

  .pos-mobile-toggle {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 55;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    border: none;
    opacity: 0.7;
    transition: opacity 0.15s ease;
  }

  .pos-mobile-toggle:active,
  .pos-mobile-toggle:focus-visible {
    opacity: 1;
  }

  @media (hover: hover) {
    .pos-mobile-toggle:hover {
      opacity: 1;
    }
  }

  .pos-main {
    flex: 1;
    min-width: 0;
  }

  /* 手機版（lg 以下）：側欄改成從左側滑出的抽屜，不用窄版圖示模式 */
  @media (max-width: 1023px) {
    .pos-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: 220px;
      transform: translateX(-100%);
      transition: transform 0.2s ease;
      z-index: 50;
    }

    .pos-sidebar-collapsed {
      width: 220px;
    }

    .pos-sidebar-open {
      transform: translateX(0);
    }

    .pos-main {
      width: 100%;
    }
  }

  /* 桌面版（lg 以上）：明確隱藏手機版按鈕與遮罩。
     這裡不能只靠 lg:hidden，因為它跟上面 .pos-mobile-toggle 的
     display: flex 選擇器優先權相同，若 scoped style 編譯順序排在
     Tailwind utilities 之後就會覆蓋掉 lg:hidden，導致電腦版也顯示按鈕。 */
  @media (min-width: 1024px) {
    .pos-mobile-toggle,
    .pos-sidebar-backdrop {
      display: none;
    }
  }
</style>
