<template>
  <div class="max-w-7xl mx-auto px-3 sm:px-4 pt-3">
    <nav class="flex gap-1 border-b border-light-c overflow-x-auto">
      <NuxtLink
        to="/staff/order/shopping-cart/products"
        class="px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors"
        :class="active === 'list' ? 'border-green-700 text-green-700 dark:text-green-400 font-medium' : 'border-transparent text-muted-c hover-surface2'"
      >
        商品列表
      </NuxtLink>
      <NuxtLink
        to="/staff/order/shopping-cart/products/categories"
        class="px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors"
        :class="active === 'categories' ? 'border-green-700 text-green-700 dark:text-green-400 font-medium' : 'border-transparent text-muted-c hover-surface2'"
      >
        商品分類
      </NuxtLink>
      <NuxtLink
        to="/staff/order/shopping-cart/products/units"
        class="px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors"
        :class="active === 'units' ? 'border-green-700 text-green-700 dark:text-green-400 font-medium' : 'border-transparent text-muted-c hover-surface2'"
      >
        商品單位
      </NuxtLink>
      <NuxtLink
        to="/staff/order/shopping-cart/products/shipping-fees"
        class="px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors"
        :class="active === 'shipping-fees' ? 'border-green-700 text-green-700 dark:text-green-400 font-medium' : 'border-transparent text-muted-c hover-surface2'"
      >
        商品運費
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup>
// 商品管理底下的子分頁（商品列表/商品分類/商品單位/商品運費）。
// active 用來標記目前在哪一個子分頁：'list' | 'categories' | 'units' | 'shipping-fees'
// 商品新增/編輯/圖片這幾個子頁面不是分頁列表，不需要用到這個元件。
defineProps({
  active: {
    type: String,
    default: 'list'
  }
})
</script>
