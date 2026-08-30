<script>
// 模組層級的快取（不是 ref，整個頁面共用一份，跟元件實例生命週期無關）：
// 同一張單第一次 hover 查詢過明細之後，之後再 hover 到同一列直接用快取，
// 不會每次移過去都重打一次 API。key 用 apiPath+guid 組合，這樣同一頁面
// 如果同時有訂貨單／銷貨單兩種 tooltip 也不會互相搞混。
const detailCache = new Map()
</script>

<script setup>
import { ref } from 'vue'

// 訂貨單／銷貨單列表：滑鼠移到單號上面顯示明細品項的 tooltip。
// apiPath 傳 /api/dc-erp/sales-order-detail 或 /api/dc-erp/sales-slip-detail
// （兩支既有的 API，表單頁編輯明細用的就是這兩支，欄位格式已經核對過），
// 用 guid 當 purchaseid 查詢參數。
//
// 用 Teleport 把 tooltip 傳到 body 底下、position:fixed 定位（用觸發元素
// 當時的 getBoundingClientRect 算座標）——列表本身包在 overflow-x-auto
// 的容器裡，如果 tooltip 用一般的 absolute 定位會被容器裁切看不到，所以
// 才需要 Teleport 出去。
//
// 用一個小延遲（250ms）才觸發查詢，避免滑鼠只是路過（不是真的想看）也
// 打一次 API；滑走就立刻取消。
//
// 檔名要用 DcErp 開頭——Nuxt 的元件自動註冊在檔名已經是資料夾名稱
// （dc-erp → DcErp）開頭時才會省略前綴，不然要用 <DcErpXxx> 這種帶前綴的
// 標籤才 resolve 得到，用短名字會直接不渲染。
const props = defineProps({
  guid: { type: String, required: true },
  apiPath: { type: String, required: true }
})

const show = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const items = ref([])
const posStyle = ref({})
let hoverTimer = null

function cacheKey() {
  return `${props.apiPath}:${props.guid}`
}

async function fetchItems() {
  const key = cacheKey()
  if (detailCache.has(key)) {
    items.value = detailCache.get(key)
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await $fetch(props.apiPath, { query: { purchaseid: props.guid } })
    items.value = data.items || []
    detailCache.set(key, items.value)
  } catch {
    errorMsg.value = '無法載入明細'
  } finally {
    loading.value = false
  }
}

function onEnter(e) {
  if (!props.guid) return
  const rect = e.currentTarget.getBoundingClientRect()
  const width = 260
  posStyle.value = {
    position: 'fixed',
    left: `${Math.max(4, Math.min(rect.left, window.innerWidth - width - 4))}px`,
    top: `${rect.bottom + 4}px`
  }
  hoverTimer = setTimeout(() => {
    show.value = true
    fetchItems()
  }, 250)
}

function onLeave() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  show.value = false
}
</script>

<template>
  <span class="inline-block" @mouseenter="onEnter" @mouseleave="onLeave">
    <slot />
    <Teleport to="body">
      <div
        v-if="show"
        :style="posStyle"
        class="z-50 w-64 rounded border border-light-c bg-surface p-2 text-xs shadow-lg"
      >
        <p v-if="loading" class="text-hint-c">載入中…</p>
        <p v-else-if="errorMsg" class="text-red-600">{{ errorMsg }}</p>
        <div v-else-if="items.length" class="max-h-56 overflow-y-auto">
          <table class="w-full table-fixed border-collapse">
            <tbody>
              <tr v-for="(it, i) in items" :key="i">
                <td class="truncate py-0.5 pr-2 align-top">{{ it.productName }}</td>
                <td class="w-24 whitespace-nowrap py-0.5 text-right align-top">
                  <span class="tabular-nums text-base-c">{{ it.originalNum }}</span>
                  <span class="ml-1 text-hint-c opacity-70">{{ it.specificationUnitName }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-hint-c">尚無明細</p>
      </div>
    </Teleport>
  </span>
</template>
