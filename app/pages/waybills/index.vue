<template>
  <div class="p-6 max-w-7xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">托運單查詢</h1>

    <!-- 搜尋列 -->
    <div class="flex gap-3 mb-6 flex-wrap">
      <input v-model="keyword" type="text" placeholder="收件人姓名 / 電話 / 托運單號"
             class="border rounded px-3 py-2 w-64" @keyup.enter="search" />
      <input v-model="startDate" type="date" class="border rounded px-3 py-2" />
      <span class="self-center">～</span>
      <input v-model="endDate" type="date" class="border rounded px-3 py-2" />
      <button @click="search"
              class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        查詢
      </button>
      <button @click="reset"
              class="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
        清除
      </button>
    </div>

    <!-- 結果表格 -->
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-gray-100">
        <tr>
          <th class="border px-3 py-2 text-left">托運單號</th>
          <th class="border px-3 py-2 text-left">寄送日期</th>
          <th class="border px-3 py-2 text-left">寄件人</th>
          <th class="border px-3 py-2 text-left">收件人</th>
          <th class="border px-3 py-2 text-left">收件電話</th>
          <th class="border px-3 py-2 text-left">收件地址</th>
          <th class="border px-3 py-2 text-left">品名</th>
          <th class="border px-3 py-2 text-left">金額</th>
          <th class="border px-3 py-2 text-left">狀態</th>
        </tr>
        </thead>
        <tbody>
        <tr
          v-for="row in data?.rows"
          :key="row.id"
          class="hover:bg-blue-50 cursor-pointer transition-colors"
          @click="navigateTo(`/waybills/${row.id}`)"
        >
          <td class="border px-3 py-2 font-mono text-blue-600">{{ row.tracking_no }}</td>
          <td class="border px-3 py-2">{{ row.send_date }}</td>
          <td class="border px-3 py-2">{{ row.sender_name }}</td>
          <td class="border px-3 py-2">{{ row.customer_name }}</td>
          <td class="border px-3 py-2">{{ row.customer_phone }}</td>
          <td class="border px-3 py-2">{{ row.customer_address }}</td>
          <td class="border px-3 py-2">{{ row.production_name }}</td>
          <td class="border px-3 py-2">{{ row.price }}</td>
          <td class="border px-3 py-2">{{ row.state }}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- 分頁 -->
    <div class="flex gap-2 mt-4 items-center">
      <button :disabled="page <= 1" @click="page--; refresh()"
              class="border px-3 py-1 rounded disabled:opacity-40">上一頁</button>
      <span>第 {{ page }} 頁 / 共 {{ totalPages }} 頁（{{ data?.total }} 筆）</span>
      <button :disabled="page >= totalPages" @click="page++; refresh()"
              class="border px-3 py-1 rounded disabled:opacity-40">下一頁</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const keyword = ref('')
const startDate = ref('')
const endDate = ref('')
const page = ref(1)
const limit = 20

const { data, refresh } = await useFetch('/api/waybills', {
  query: {
    keyword,
    start_date: startDate,
    end_date: endDate,
    page,
    limit
  }
})

const totalPages = computed(() => Math.ceil((data.value?.total || 0) / limit))

function search() {
  page.value = 1
  refresh()
}

function reset() {
  keyword.value = ''
  startDate.value = ''
  endDate.value = ''
  page.value = 1
  refresh()
}
</script>
