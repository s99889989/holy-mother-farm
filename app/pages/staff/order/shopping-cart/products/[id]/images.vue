<script setup>
import ScHeader from '~/components/shopping-cart/ScHeader.vue'
import { ref } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/products/[id]/images/upload.post.ts），
// 對應原網站 admin_product_image_add.php（multipart 上傳，最多 6 張，欄位皆為 upload[]）。
definePageMeta({
  layout: 'staff'
})

const route = useRoute()
const productId = route.params.id

const files = ref([null, null, null, null, null, null])
const uploading = ref(false)
const toast = ref(null)

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

function onFileChange(idx, event) {
  const file = event.target.files?.[0] || null
  if (file && !file.name.toLowerCase().match(/\.jpe?g$/)) {
    showToast('副檔名不符合，請使用 *.JPG 圖片檔案', 'error')
    event.target.value = ''
    files.value[idx] = null
    return
  }
  files.value[idx] = file
}

async function submitUpload() {
  const selected = files.value.filter(Boolean)
  if (selected.length === 0) {
    showToast('請選擇至少一張圖片', 'error')
    return
  }

  const body = new FormData()
  for (const file of selected) {
    body.append('upload[]', file)
  }

  uploading.value = true
  try {
    const res = await $fetch(`/api/shopping-cart/products/${productId}/images/upload`, {
      method: 'POST',
      body
    })
    if (res.ok) {
      await navigateTo(`/staff/order/shopping-cart/products/${productId}/edit`)
    } else {
      showToast('上傳失敗', 'error')
    }
  } catch (err) {
    showToast(err?.data?.statusMessage || '上傳失敗', 'error')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">
    <ScHeader title="新增商品圖片" :show-tabs="false" />

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      <NuxtLink :to="`/staff/order/shopping-cart/products/${productId}/edit`" class="text-sm text-green-700 dark:text-green-400 hover:underline">
        ← 返回編輯商品
      </NuxtLink>

      <p
        v-if="toast"
        class="text-sm px-4 py-2 rounded-xl"
        :class="toast.type === 'error'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
      >
        {{ toast.message }}
      </p>

      <div class="bg-surface rounded-xl border border-light-c p-5">
        <p class="text-sm text-muted-c mb-5 leading-relaxed">
          1、建議圖片使用3:2圖片，大圖：900*600像素，縮圖：180*120像素<br>
          2、圖片格式請使用JPEG圖片，即副檔名為*.jpg<br>
          3、注意檔案大小不要超過512KB<br>
          4、圖片一次上傳最多六張
        </p>

        <div v-for="(n, idx) in 6" :key="idx" class="flex items-center gap-3 mb-3.5">
          <span class="w-24 flex-none text-sm text-muted-c text-right">上傳圖片{{ n }}</span>
          <input
            type="file"
            accept=".jpg,.jpeg,image/jpeg"
            class="flex-1 text-sm text-base-c"
            @change="onFileChange(idx, $event)"
          >
        </div>

        <div class="flex gap-2 pl-[108px] pt-2">
          <button :disabled="uploading" class="px-6 py-2 text-sm bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors" @click="submitUpload">
            {{ uploading ? '上傳中…' : '新增圖片' }}
          </button>
          <NuxtLink :to="`/staff/order/shopping-cart/products/${productId}/edit`" class="px-6 py-2 text-sm border border-light-c text-muted-c rounded-xl hover-surface2 transition-colors">
            返回編輯商品
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
