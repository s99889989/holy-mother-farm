<template>
  <div class="sc-layout">
    <nav class="sc-topnav">
      <NuxtLink to="/staff/order/shopping-cart" class="sc-topnav-link" :class="{ 'sc-active': isActive('/staff/order/shopping-cart', true) }">
        訂單管理
      </NuxtLink>
      <NuxtLink to="/staff/order/shopping-cart/users" class="sc-topnav-link" :class="{ 'sc-active': isActive('/staff/order/shopping-cart/users') }">
        會員管理
      </NuxtLink>
      <NuxtLink to="/staff/order/shopping-cart/managers" class="sc-topnav-link" :class="{ 'sc-active': isActive('/staff/order/shopping-cart/managers') }">
        管理員設定
      </NuxtLink>
      <NuxtLink to="/staff/order/shopping-cart/products" class="sc-topnav-link" :class="{ 'sc-active': isActive('/staff/order/shopping-cart/products') }">
        商品管理
      </NuxtLink>
    </nav>

    <div class="sc-layout-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
// 共用給所有「購物車後台」頁面（登入頁除外）的 layout，只負責頂部導覽列。
// 各頁面自己的 definePageMeta 要設定 layout: 'shopping-cart' 才會套用。
const route = useRoute()

function isActive(prefix, exact = false) {
  if (exact) {
    // 訂單管理是根路徑，要排除掉其他子模組（users/managers/products）也以它開頭的情況
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

<style scoped>
.sc-layout {
  min-height: 100vh;
  background: #f9faf9;
}

.sc-topnav {
  display: flex;
  gap: 4px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

.sc-topnav-link {
  padding: 12px 16px;
  font-size: 14px;
  color: #666;
  text-decoration: none;
  border-bottom: 2px solid transparent;
}

.sc-topnav-link:hover {
  color: #3d7a52;
}

.sc-topnav-link.sc-active {
  color: #3d7a52;
  font-weight: 600;
  border-bottom-color: #3d7a52;
}
</style>
