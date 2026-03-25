<script setup lang="ts">
import { useDarkModeStore } from '~/stores/dark_mode'
import { onMounted } from 'vue'
import { useFlowbite } from '~/components/useFlowbite'
import { initFlowbite } from 'flowbite'

const dark_mode = useDarkModeStore()

onMounted(() => {
  useFlowbite(() => {
    initFlowbite()
  })
})
</script>

<template>
  <nav class="bg-neutral-primary w-full z-20 top-0 start-0 border-default">
    <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
      <button data-collapse-toggle="navbar-dropdown"
              type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-body rounded-base md:hidden hover:bg-neutral-secondary-soft hover:text-heading focus:outline-none focus:ring-2 focus:ring-neutral-tertiary" aria-controls="navbar-dropdown" aria-expanded="false">
        <span class="sr-only">Open main menu</span>
        <svg class="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5 7h14M5 12h14M5 17h14"/></svg>
      </button>
      <div class="hidden w-full md:block md:w-auto" id="navbar-dropdown">
        <ul class="flex flex-col font-medium p-4 md:p-0 mt-4 border border-default rounded-base bg-neutral-secondary-soft md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-neutral-primary">
          <li>
            <NuxtLink to="/items/InventoryQuantity" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              田園餐廳庫存</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/items/ShopInventory" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              休憩小舖庫存</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/check-in/BookIndex" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              訂位</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/DailyMenu" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              每日菜色紀錄</NuxtLink>
          </li>
          <li>
            <button @click="dark_mode.change_dark_mode" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              {{dark_mode.data.display_name}}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>

</style>
