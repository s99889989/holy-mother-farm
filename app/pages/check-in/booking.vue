<script setup lang="ts">
import { reactive } from 'vue'

// 定義訂位資料結構
const state = reactive({
  name: '',
  phone: '',
  guests: 2,
  date: new Date().toISOString().substr(0, 10), // 預設今天
  time: '12:00',
  note: ''
})

// 模擬提交邏輯
const isSubmitting = ref(false)
async function onSubmit() {
  isSubmitting.value = true

  // 這裡可以串接你的 API 或實作資料持久化
  console.log('提交訂位資料：', state)

  // 模擬網路延遲
  await new Promise(resolve => setTimeout(resolve, 1000))

  alert('登記成功！')
  isSubmitting.value = false
}
</script>

<template>
  <UContainer class="py-10">
    <UCard class="max-w-md mx-auto">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold font-sans">客戶訂位登記</h3>
          <UBadge color="primary" variant="soft">新單</UBadge>
        </div>
      </template>

      <UForm :state="state" @submit="onSubmit" class="space-y-4">
        <UFormGroup label="客戶姓名" name="name" required>
          <UInput v-model="state.name" placeholder="例如：王小明" icon="i-heroicons-user" />
        </UFormGroup>

        <UFormGroup label="聯絡電話" name="phone" required>
          <UInput v-model="state.phone" type="tel" placeholder="0912-345-678" icon="i-heroicons-phone" />
        </UFormGroup>

        <div class="grid grid-cols-2 gap-4">
          <UFormGroup label="人數" name="guests">
            <UInput v-model="state.guests" type="number" min="1" icon="i-heroicons-users" />
          </UFormGroup>

          <UFormGroup label="訂位時間" name="time">
            <USelect
              v-model="state.time"
              :options="['11:00', '12:00', '13:00', '17:00', '18:00', '19:00']"
              icon="i-heroicons-clock"
            />
          </UFormGroup>
        </div>

        <UFormGroup label="訂位日期" name="date">
          <UInput v-model="state.date" type="date" icon="i-heroicons-calendar-days" />
        </UFormGroup>

        <UFormGroup label="備註內容" name="note">
          <UTextarea v-model="state.note" placeholder="例如：對海鮮過敏、需要嬰兒椅..." autoresize />
        </UFormGroup>

        <UDivider class="my-6" />

        <UButton
          type="submit"
          block
          color="black"
          size="lg"
          :loading="isSubmitting"
        >
          確認登記
        </UButton>
      </UForm>
    </UCard>
  </UContainer>
</template>

<style scoped>
/* 這裡可以根據需要微調樣式 */
</style>
