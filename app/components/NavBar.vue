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
  <nav class="bg-neutral-primary w-full start-0 border-default">
    <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
      <button data-collapse-toggle="navbar-dropdown"
              type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-body rounded-base md:hidden hover:bg-neutral-secondary-soft hover:text-heading focus:outline-none focus:ring-2 focus:ring-neutral-tertiary" aria-controls="navbar-dropdown" aria-expanded="false">
        <span class="sr-only">Open main menu</span>
        <svg class="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5 7h14M5 12h14M5 17h14"/></svg>
      </button>
      <div class="hidden w-full md:block md:w-auto" id="navbar-dropdown">
        <ul class="flex flex-col font-medium p-4 md:p-0 mt-4 border border-default rounded-base bg-neutral-secondary-soft md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-neutral-primary">
          <li>
            <button id="dropdownNvbarButton" data-dropdown-toggle="dropdownNavbar" class="flex items-center justify-between w-full py-2 px-3 rounded font-medium text-heading text-2xl md:w-auto hover:bg-neutral-tertiary md:hover:bg-transparent md:border-0 md:hover:text-fg-brand md:p-0">
              庫存
              <svg class="w-4 h-4 ms-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7"/></svg>
            </button>
            <!-- Dropdown menu -->
            <div id="dropdownNavbar" class="z-50 hidden bg-white dark:bg-zinc-800 border border-default-medium rounded-base shadow-lg w-52">
              <ul class="py-1 text-body font-medium" aria-labelledby="dropdownNvbarButton">
                <li>
                  <NuxtLink to="/items/InventoryQuantity" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">
                    餐廳小舖</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/items/ShopInventory" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">
                    休憩小舖</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/items/CommonConfig" class="block px-4 py-2.5 text-base hover:bg-neutral-tertiary rounded-lg transition-colors">
                    庫存設定</NuxtLink>
                </li>
              </ul>
            </div>
          </li>

          <li>
            <NuxtLink to="/check-in/BookIndex" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              行事曆</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/DailyMenu" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              餐廳菜色紀錄</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/AssetRegistry" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              財產清點</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/ImageLibrary" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              資源管理</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/QuickLinks" class="text-2xl block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">
              常用連結</NuxtLink>
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
