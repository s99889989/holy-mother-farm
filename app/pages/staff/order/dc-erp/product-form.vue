<script setup>
import { reactive, ref, onMounted, computed } from 'vue'

// 「品項資料管理 - 檢視」（原網站 /COAERP/Prod/Edit/{id}）。
//
// 【目前只做唯讀檢視，沒有「儲存」功能】原因見 product-form.get.ts 開頭
// 註解——這個編輯頁牽涉到動態類別下拉、單位查詢、ExtJS 規格清單 Grid、
// 組合商品分頁、圖片上傳，這些都還沒有真實 Network 記錄可以核對，貿然
// 只送出部分欄位存檔，有可能把原網站沒收到的欄位當成清空處理，覆蓋掉
// 既有資料（這是正式在用的品項主檔，風險太高，不能用猜的）。
//
// 如果要加上「儲存」，麻煩在原網站這個編輯頁按「儲存」，把那次請求完整
// 的 Network 記錄（Request URL + Form Data + Response）貼給我核對。
definePageMeta({
  layout: 'staff',
  requiredPermission: 'order.dc-erp'
})

const route = useRoute()
const id = computed(() => (route.query.id ? String(route.query.id) : ''))

const loading = ref(true)
const errorMessage = ref('')
const breadcrumb = ref([])

const product = reactive({
  id: '',
  code: '',
  name: '',
  shortName: '',
  marketingProductCode: '',
  unitCode: '',
  unitName: '',
  faProductAccountingID: '',
  isNotExpireDate: false,
  saveDays: '',
  taxType: '',
  lossRate: '',
  warehouseID: '',
  safeStock: '',
  temperLayer: '',
  isTAFTProduct: false,
  barCode: '',
  remark: '',
  isDisable: false
})

const options = reactive({
  faProductAccounting: [],
  taxType: [],
  warehouse: [],
  temperLayer: []
})

function labelOf(list, value) {
  const found = list.find((opt) => opt.value === value)
  return found ? found.label : value
}

async function load() {
  if (!id.value) {
    errorMessage.value = '缺少品項編號'
    loading.value = false
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch('/api/dc-erp/product-form', { query: { id: id.value } })
    Object.assign(product, data.product)
    options.faProductAccounting = data.product.faProductAccountingOptions
    options.taxType = data.product.taxTypeOptions
    options.warehouse = data.product.warehouseOptions
    options.temperLayer = data.product.temperLayerOptions
    breadcrumb.value = data.breadcrumb
  } catch (err) {
    if (err?.statusCode === 401 || err?.response?.status === 401) {
      await navigateTo('/staff/order/dc-erp/login')
      return
    }
    errorMessage.value = err?.data?.statusMessage || '無法載入品項資料，請稍後再試'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <DcErpShell>
      <div class="space-y-3 p-4">
        <div class="flex items-center justify-end">
          <NuxtLink to="/staff/order/dc-erp/products" class="text-xs text-muted-c hover:underline">
            返回列表
          </NuxtLink>
        </div>

        <p v-if="loading" class="p-6 text-sm text-hint-c">載入中…</p>
        <p v-else-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">{{ errorMessage }}</p>

        <template v-else>
          <p class="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            目前僅提供檢視，「所屬類別」「基本單位查詢」「商品規格清單」「組合內容」「產品圖片」與「儲存」尚未實作。
          </p>

          <div class="grid grid-cols-1 gap-2 rounded-xl border border-light-c bg-surface p-3 text-sm sm:grid-cols-2">
            <div><span class="text-muted-c">品項代號：</span>{{ product.code }}</div>
            <div><span class="text-muted-c">運銷代號：</span>{{ product.marketingProductCode || '（無）' }}</div>
            <div><span class="text-muted-c">品項名稱：</span>{{ product.name }}</div>
            <div><span class="text-muted-c">品項簡稱：</span>{{ product.shortName || '（無）' }}</div>
            <div><span class="text-muted-c">基本單位：</span>{{ product.unitCode }}（{{ product.unitName }}）</div>
            <div><span class="text-muted-c">科目分類：</span>{{ labelOf(options.faProductAccounting, product.faProductAccountingID) }}</div>
            <div>
              <span class="text-muted-c">保存天數：</span>
              {{ product.isNotExpireDate ? '無保存期限' : `${product.saveDays} 天` }}
            </div>
            <div><span class="text-muted-c">課稅別：</span>{{ labelOf(options.taxType, product.taxType) }}</div>
            <div><span class="text-muted-c">耗損率：</span>{{ product.lossRate }}%</div>
            <div><span class="text-muted-c">預設倉庫：</span>{{ labelOf(options.warehouse, product.warehouseID) }}</div>
            <div><span class="text-muted-c">安全存量：</span>{{ product.safeStock }}</div>
            <div><span class="text-muted-c">宅配溫層：</span>{{ labelOf(options.temperLayer, product.temperLayer) }}</div>
            <div><span class="text-muted-c">履歷品項：</span>{{ product.isTAFTProduct ? '是' : '否' }}</div>
            <div><span class="text-muted-c">品項條碼：</span>{{ product.barCode || '（無）' }}</div>
            <div><span class="text-muted-c">停用：</span>{{ product.isDisable ? '是' : '否' }}</div>
            <div class="sm:col-span-2">
              <span class="text-muted-c">備註：</span>
              <div class="mt-1 whitespace-pre-wrap rounded border border-light-c bg-surface2 p-2">{{ product.remark || '（無）' }}</div>
            </div>
          </div>
        </template>
      </div>
    </DcErpShell>
  </div>
</template>
