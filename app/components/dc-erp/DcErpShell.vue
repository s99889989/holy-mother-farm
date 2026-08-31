<script setup>
  // dc-erp 模組共用的簡化外殼：只保留固定的常用連結（首頁／訂貨單／銷貨單／
  // 品項／統計月報表），不再動態抓取解析原網站完整的多層選單——原網站選單有
  // 上百個項目，但實際上只會用到這幾個，寫死比較穩定、也比較好維護。
  //
  // 「銷貨單維護」目前還沒另外重畫成 Vue 頁面，先用整頁代理開新分頁
  // （target="_blank"）。原本 target="contentFrame" 的寫法要有一個
  // 共用的 <iframe name="contentFrame"> 才打得到，但像「訂貨單」這種已經改成
  // 我們自己重畫的頁面就沒有 iframe 可以接了，所以統一改開新分頁比較不會有
  // 連結點了沒反應的問題；如果之後也把這頁重畫成 Vue 頁面，再改回站內導覽即可。
  //
  // 「統計月報表」已經改成自己重畫的頁面（sales-statistics-month.vue +
  // sales-statistics-month.get.ts/.post.ts），改回站內導覽（NuxtLink）。
  //
  // 「品項」是品項資料管理列表頁（products.vue + products.get.ts），目前
  // 只有查詢/檢視，還沒有新增/編輯/刪除，一樣改回站內導覽（NuxtLink）。
  //
  // 「進階品項管理」是本地功能（product-images.vue），用品項代號幫品項綁
  // 圖片，完全不經過 COAERP，前端直打 Spring Boot 的
  // DcErpProductImageController（跟聖母健康農莊「每日菜色」直打
  // MenuController 同一套模式），詳見該頁檔頭註解。
  //
  // 「設定」是全域設定頁（settings.vue）：統一調整四個列表頁的顯示方式/
  // 每頁筆數（純前端 localStorage，key: dc-erp-list-settings），以及批次
  // 「設置所屬類別」（原本在「進階品項管理」，搬過來這裡）。四個列表頁
  // 自己已經沒有列表/卡片切換鈕了，要改都回這頁改。
  async function handleLogout() {
    await $fetch('/api/dc-erp/logout', { method: 'POST' })
    await navigateTo('/staff/order/dc-erp/login')
  }
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-light-c bg-surface2">
    <nav class="flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-light-c bg-surface px-2 py-1 text-base">
      <NuxtLink
        to="/staff/order/dc-erp"
        class="shrink-0 rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        首頁
      </NuxtLink>
      <NuxtLink
        to="/staff/order/dc-erp/sales-orders"
        class="shrink-0 rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        訂貨單
      </NuxtLink>
      <NuxtLink
        to="/staff/order/dc-erp/sales-slips"
        class="shrink-0 rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        銷貨單
      </NuxtLink>
      <NuxtLink
        to="/staff/order/dc-erp/products"
        class="shrink-0 rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        品項
      </NuxtLink>
      <NuxtLink
        to="/staff/order/dc-erp/product-images"
        class="shrink-0 rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        進階品項管理
      </NuxtLink>
      <NuxtLink
        to="/staff/order/dc-erp/sales-statistics-month"
        class="shrink-0 rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        統計月報表
      </NuxtLink>
      <NuxtLink
        to="/staff/order/dc-erp/settings"
        class="shrink-0 rounded px-3 py-1.5 text-muted-c hover:bg-surface2 hover:text-green-700"
        active-class="bg-surface2 font-medium text-green-700"
      >
        設定
      </NuxtLink>
      <button class="ml-auto shrink-0 rounded border border-light-c px-3 py-1.5 text-sm text-red-600 hover:bg-surface2" @click="handleLogout">登出</button>
    </nav>

    <slot />
  </div>
</template>
