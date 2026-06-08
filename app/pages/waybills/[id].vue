<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/waybills" class="text-blue-600 hover:underline">← 返回列表</NuxtLink>
      <h1 class="text-xl font-bold">托運單詳細</h1>
    </div>

    <div v-if="waybill" class="space-y-4">

      <!-- 上方固定欄 -->
      <div class="border rounded p-4 bg-pink-50 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <label class="text-gray-500">契客代號</label>
          <div class="font-mono font-bold">{{ waybill.sender_code }}</div>
        </div>
        <div>
          <label class="text-gray-500">寄件人</label>
          <div>{{ waybill.sender_name }}</div>
        </div>
        <div>
          <label class="text-gray-500">紙張種類</label>
          <div>{{ paperName }}</div>
        </div>
        <div>
          <label class="text-gray-500">托運單號</label>
          <div class="font-mono font-bold text-blue-700">{{ waybill.tracking_no }}</div>
        </div>
      </div>

      <!-- 收件人 -->
      <div class="border rounded p-4">
        <h2 class="font-bold text-pink-700 mb-3 border-b pb-1">收件人</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Field label="姓名" :value="waybill.customer_name" />
          <Field label="電話" :value="waybill.customer_phone" />
          <Field label="手機" :value="waybill.customer_mobile" />
          <Field label="地址" :value="waybill.customer_address" class="md:col-span-3" />
        </div>
      </div>

      <!-- 寄件人 -->
      <div class="border rounded p-4">
        <h2 class="font-bold text-pink-700 mb-3 border-b pb-1">寄件人</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Field label="姓名" :value="waybill.sender_name" />
          <Field label="電話" :value="waybill.sender_phone" />
          <Field label="手機" :value="waybill.sender_mobile" />
          <Field label="地址" :value="waybill.sender_address" class="md:col-span-3" />
        </div>
      </div>

      <!-- 配送選項 -->
      <div class="border rounded p-4">
        <h2 class="font-bold text-pink-700 mb-3 border-b pb-1">配送選項</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="收貨日期" :value="waybill.send_date" />
          <Field label="希望配達日期" :value="waybill.deliver_date" />
          <Field label="希望配達時段" :value="deliverTimeLabel" />
          <Field label="溫層" :value="temperatureLabel" />
          <Field label="尺寸" :value="packageSizeLabel" />
          <Field label="注意事項" :value="[waybill.breakable === 'yes' ? '易碎物品' : '', waybill.precision_instrument === 'yes' ? '精密儀器' : ''].filter(Boolean).join('、') || '無'" />
        </div>
      </div>

      <!-- 品名/訂單 -->
      <div class="border rounded p-4">
        <h2 class="font-bold text-pink-700 mb-3 border-b pb-1">其他資訊</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="品名" :value="waybill.production_name" />
          <Field label="訂單編號" :value="waybill.order_no" />
          <Field label="備註" :value="waybill.comment" />
          <Field label="單據類型" :value="waybillTypeLabel" />
          <Field label="代收金額" :value="waybill.price" />
          <Field label="報值金額" :value="waybill.insurance" />
          <Field label="狀態" :value="waybill.state" />
          <Field label="建立時間" :value="waybill.created_at" />
        </div>
      </div>

    </div>
    <div v-else class="text-gray-400">載入中...</div>
  </div>
</template>

<script setup lang="ts">
// 小元件：顯示單一欄位
const Field = defineComponent({
  props: { label: String, value: [String, Number] },
  template: `
    <div>
      <div class="text-gray-400 text-xs mb-0.5">{{ label }}</div>
      <div class="text-gray-800">{{ value || '—' }}</div>
    </div>
  `
})

const route = useRoute()
const { data: waybill } = await useFetch(`/api/waybills/${route.params.id}`)
const { data: papers } = await useFetch('/api/papers')

const paperName = computed(() => {
  const p = (papers.value as any[])?.find((p: any) => p.id === waybill.value?.paper_id)
  return p?.name || waybill.value?.paper_id
})

const deliverTimeMap: Record<string, string> = {
  '1': '13時前', '2': '14-18時', '4': '不指定', '5': '20-21時'
}
const temperatureMap: Record<string, string> = {
  '0001': '常溫', '0002': '冷藏', '0003': '冷凍'
}
const packageSizeMap: Record<string, string> = {
  '0001': '60cm', '0002': '90cm', '0003': '120cm', '0004': '150cm'
}
const waybillTypeMap: Record<string, string> = {
  'A': '一般單', 'B': '代收單', 'N': '到付單'
}

const deliverTimeLabel = computed(() => deliverTimeMap[String(waybill.value?.deliver_time)] || waybill.value?.deliver_time)
const temperatureLabel = computed(() => temperatureMap[waybill.value?.temperature] || waybill.value?.temperature)
const packageSizeLabel = computed(() => packageSizeMap[waybill.value?.package_size] || waybill.value?.package_size)
const waybillTypeLabel = computed(() => waybillTypeMap[waybill.value?.waybilltype] || '一般單')
</script>
