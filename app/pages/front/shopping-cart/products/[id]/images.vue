<template>
  <div class="sc-order-page">

    <div class="sc-breadcrumb">
      <NuxtLink to="/front/shopping-cart/products">商品管理</NuxtLink>
      <span class="sc-sep">/</span>
      <span class="sc-current">新增商品圖片</span>
      <span class="sc-sep">/</span>
      <NuxtLink :to="`/front/shopping-cart/products/${productId}/edit`">編輯商品</NuxtLink>
    </div>

    <p v-if="toast" class="sc-toast" :class="toast.type">{{ toast.message }}</p>

    <div class="sc-panel">
      <div class="sc-panel-body">
        <p class="sc-notice">
          1、建議圖片使用3:2圖片，大圖：900*600像素，縮圖：180*120像素<br />
          2、圖片格式請使用JPEG圖片，即副檔名為*.jpg<br />
          3、注意檔案大小不要超過512KB<br />
          4、圖片一次上傳最多六張
        </p>

        <div v-for="(n, idx) in 6" :key="idx" class="sc-field-row">
          <span class="sc-field-label">上傳圖片{{ n }}</span>
          <input
            ref="fileInputs"
            type="file"
            accept=".jpg,.jpeg,image/jpeg"
            class="sc-file-input"
            @change="onFileChange(idx, $event)"
          />
        </div>

        <div class="sc-submit-row">
          <button class="sc-btn-primary" :disabled="uploading" @click="submitUpload">
            {{ uploading ? '上傳中…' : '新增圖片' }}
          </button>
          <NuxtLink :to="`/front/shopping-cart/products/${productId}/edit`" class="sc-btn-cancel">
            返回編輯商品
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 呼叫本專案自己的 server API route（server/api/shopping-cart/products/[id]/images/upload.post.ts），
// 對應原網站 admin_product_image_add.php（multipart 上傳，最多 6 張，欄位皆為 upload[]）。
definePageMeta({
  layout: 'shopping-cart'
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
      await navigateTo(`/front/shopping-cart/products/${productId}/edit`)
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

<style scoped>
.sc-order-page {
  padding: 20px;
  color: #333;
}

.sc-breadcrumb {
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
}

.sc-breadcrumb a {
  color: #888;
  text-decoration: none;
}

.sc-breadcrumb a:hover {
  color: #3d7a52;
}

.sc-breadcrumb .sc-sep {
  margin: 0 6px;
}

.sc-breadcrumb .sc-current {
  color: #555;
}

.sc-toast {
  position: sticky;
  top: 10px;
  z-index: 10;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 12px;
}

.sc-toast.success {
  background: #dff0d8;
  color: #3c763d;
}

.sc-toast.error {
  background: #f2dede;
  color: #a94442;
}

.sc-panel {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  max-width: 640px;
}

.sc-panel-body {
  padding: 20px;
}

.sc-notice {
  font-size: 13px;
  color: #666;
  margin: 0 0 20px;
  line-height: 1.6;
}

.sc-field-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.sc-field-label {
  width: 100px;
  flex-shrink: 0;
  font-size: 14px;
  color: #555;
  text-align: right;
}

.sc-file-input {
  flex: 1;
  font-size: 13px;
}

.sc-submit-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: 112px;
  margin-top: 8px;
}

.sc-btn-primary {
  padding: 8px 24px;
  font-size: 14px;
  background: #3d7a52;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.sc-btn-primary:hover:not(:disabled) {
  background: #2f6141;
}

.sc-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sc-btn-cancel {
  padding: 8px 20px;
  font-size: 14px;
  background: #fff;
  color: #666;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-decoration: none;
}

.sc-btn-cancel:hover {
  background: #f5f5f5;
}
</style>
