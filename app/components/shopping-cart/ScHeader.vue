<template>
  <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          購
        </div>
        <div>
          <h1 class="font-bold text-base-c leading-none text-sm sm:text-base">
            購物車後台{{ title ? ` · ${title}` : '' }}
          </h1>
          <p class="text-xs text-hint-c mt-0.5 hidden sm:block">
            Holy Mother Farm
          </p>
        </div>
      </div>
      <slot name="actions" />
    </div>

    <nav v-if="showTabs" class="flex gap-1 -mb-px overflow-x-auto">
      <NuxtLink
        to="/staff/order/shopping-cart"
        class="px-3 py-1.5 text-sm rounded-t-lg whitespace-nowrap transition-colors"
        :class="isActive('/staff/order/shopping-cart', true)
          ? 'bg-green-700 text-white'
          : 'text-muted-c hover-surface2'"
      >
        訂單管理
      </NuxtLink>
      <NuxtLink
        to="/staff/order/shopping-cart/users"
        class="px-3 py-1.5 text-sm rounded-t-lg whitespace-nowrap transition-colors"
        :class="isActive('/staff/order/shopping-cart/users')
          ? 'bg-green-700 text-white'
          : 'text-muted-c hover-surface2'"
      >
        會員管理
      </NuxtLink>
      <NuxtLink
        to="/staff/order/shopping-cart/managers"
        class="px-3 py-1.5 text-sm rounded-t-lg whitespace-nowrap transition-colors"
        :class="isActive('/staff/order/shopping-cart/managers')
          ? 'bg-green-700 text-white'
          : 'text-muted-c hover-surface2'"
      >
        管理員設定
      </NuxtLink>
      <NuxtLink
        to="/staff/order/shopping-cart/products"
        class="px-3 py-1.5 text-sm rounded-t-lg whitespace-nowrap transition-colors"
        :class="isActive('/staff/order/shopping-cart/products')
          ? 'bg-green-700 text-white'
          : 'text-muted-c hover-surface2'"
      >
        商品管理
      </NuxtLink>
    </nav>
  </header>
</template>

<script setup>
// 共用的購物車後台頁首：sticky header + 四個模組分頁（訂單/會員/管理員/商品）。
// 取代原本獨立的 app/layouts/shopping-cart.vue 導覽列 —
// 現在頁面改用 layout: 'staff'，這個元件直接放在頁面模板最上面即可，
// 風格比照 staff/order/restaurant-orders.vue 的 sticky header 寫法。
defineProps({
  title: {
    type: String,
    default: ''
  },
  showTabs: {
    type: Boolean,
    default: true
  }
})

const route = useRoute()

function isActive(prefix, exact = false) {
  if (exact) {
    return (
      route.path === prefix ||
      (route.path.startsWith(`${prefix}/`) &&
        !route.path.startsWith('/staff/order/shopping-cart/users') &&
        !route.path.startsWith('/staff/order/shopping-cart/managers') &&
        !route.path.startsWith('/staff/order/shopping-cart/products') &&
        !route.path.startsWith('/staff/order/shopping-cart/login'))
    )
  }
  return route.path.startsWith(prefix)
}
</script>
