<script setup>
// dc-erp 模組共用的簡化外殼：只保留固定的四個常用連結（首頁／訂貨單／銷貨單／
// 統計月報表），不再動態抓取解析原網站完整的多層選單——原網站選單有上百個
// 項目，但實際上只會用到這幾個，寫死比較穩定、也比較好維護。
//
// 「銷貨單維護」「統計月報表」這兩個還沒另外重畫成 Vue 頁面，先用整頁代理
// 開新分頁（target="_blank"）。原本 target="contentFrame" 的寫法要有一個
// 共用的 <iframe name="contentFrame"> 才打得到，但像「訂貨單」這種已經改成
// 我們自己重畫的頁面就沒有 iframe 可以接了，所以統一改開新分頁比較不會有
// 連結點了沒反應的問題；如果之後也把這兩個重畫成 Vue 頁面，再改回站內導覽即可。
async function handleLogout() {
  await $fetch('/api/dc-erp/logout', { method: 'POST' })
  await navigateTo('/staff/order/dc-erp/login')
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-light-c bg-surface2">
    <header class="flex items-center justify-between border-b border-light-c bg-surface px-4 py-2">
      <div class="text-sm font-bold text-base-c">農業生產組織經營管理系統</div>
      <button class="text-xs text-red-600 hover:underline" @click="handleLogout">登出 dc-erp</button>
    </header>

    <nav class="flex gap-1 border-b border-light-c bg-surface px-2 py-1 text-sm">
      <NuxtLink
        to="/staff/order/dc-erp"
        class="rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        首頁
      </NuxtLink>
      <NuxtLink
        to="/staff/order/dc-erp/sales-orders"
        class="rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        訂貨單
      </NuxtLink>
      <NuxtLink
        to="/staff/order/dc-erp/sales-slips"
        class="rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        銷貨單
      </NuxtLink>
      <a
        href="/api/dc-erp/page?path=%2FCOAERP%2FSalesStatistics%2FSearchSalesStatisticsMonth"
        target="_blank"
        class="rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
      >
        統計月報表
      </a>
    </nav>

    <slot />
  </div>
</template>
