<script>
  // 模組層級的快取（不是 ref，整個頁面共用一份，跟元件實例生命週期無關）：
  // 同一張單第一次 hover 查詢過明細之後，之後再 hover 到同一列直接用快取，
  // 不會每次移過去都重打一次 API。key 用 apiPath+guid 組合，這樣同一頁面
  // 如果同時有訂貨單／銷貨單兩種 tooltip 也不會互相搞混。
  const detailCache = new Map()
</script>

<script setup>
  import { ref, nextTick } from 'vue'

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
  const tooltipEl = ref(null)
  let hoverTimer = null
  // tooltip 是用 Teleport 傳到 body 底下，不是觸發用 span 的子元素——滑鼠從
  // span 移到 tooltip 中間那段路徑上，會先觸發 span 的 mouseleave。所以關閉
  // 不能馬上執行，要留一小段延遲（leaveTimer），讓滑鼠有時間移進 tooltip
  // 本身；tooltip 自己也要有 mouseenter/mouseleave 來取消或重新觸發這個延遲。
  let leaveTimer = null
  // 觸發元素當時的 rect，資料載入完成、tooltip 實際寬高確定後要重新算位置
  // 時還會用到，所以存起來而不是只在 onEnter 當下用一次。
  let currentRect = null

  function cacheKey() {
    return `${props.apiPath}:${props.guid}`
  }

  // 用傳入的寬高算出 left／top。改成貼著觸發元素「右側」顯示（跟觸發元素
  // 上緣切齊），而不是往下——原本往下顯示會直接擋住下一列的內容，滑鼠很難
  // 繞過去。右側空間不夠（單號在畫面很右邊）就自動改貼左側；寬高在資料還
  // 沒載入時只是估計值，等 reposition() 量到 tooltip 實際尺寸後會再修正一次。
  function computePosition(width, height = 0) {
    if (!currentRect) return
    const gap = 8
    const fitsRight = currentRect.right + gap + width <= window.innerWidth - 4
    const left = fitsRight
      ? currentRect.right + gap
      : Math.max(4, currentRect.left - gap - width)
    const top = Math.max(
      4,
      Math.min(currentRect.top, window.innerHeight - height - 4)
    )
    posStyle.value = {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`
    }
  }

  function reposition() {
    if (tooltipEl.value) {
      computePosition(tooltipEl.value.offsetWidth, tooltipEl.value.offsetHeight)
    }
  }

  async function fetchItems() {
    const key = cacheKey()
    if (detailCache.has(key)) {
      items.value = detailCache.get(key)
      await nextTick()
      reposition()
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
      await nextTick()
      reposition()
    }
  }

  function onEnter(e) {
    if (!props.guid) return
    if (leaveTimer) {
      clearTimeout(leaveTimer)
      leaveTimer = null
    }
    currentRect = e.currentTarget.getBoundingClientRect()
    // tooltip 還沒渲染出內容，先用估計寬高抓個大概位置，避免一開始跳到
    // 螢幕外；資料載入完成後 reposition() 會用實際尺寸校正。
    computePosition(300, 200)
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
    // 不馬上關，給滑鼠一點時間移進 tooltip（見上面 leaveTimer 的說明）。
    if (show.value) {
      leaveTimer = setTimeout(() => {
        show.value = false
      }, 150)
    }
  }

  // 滑鼠移進 tooltip 本身：取消剛剛排定的關閉，讓 tooltip 留著繼續可以滾動。
  function onTooltipEnter() {
    if (leaveTimer) {
      clearTimeout(leaveTimer)
      leaveTimer = null
    }
  }

  // 滑鼠真的離開 tooltip 才關閉。
  function onTooltipLeave() {
    leaveTimer = setTimeout(() => {
      show.value = false
    }, 150)
  }
</script>

<template>
  <span class="inline-block" @mouseenter="onEnter" @mouseleave="onLeave">
    <slot />
    <Teleport to="body">
      <div
        v-if="show"
        ref="tooltipEl"
        :style="posStyle"
        class="z-50 w-max max-w-sm min-w-[8rem] rounded border border-light-c bg-surface p-2 text-sm shadow-lg"
        @mouseenter="onTooltipEnter"
        @mouseleave="onTooltipLeave"
      >
        <p v-if="loading" class="text-hint-c">載入中…</p>
        <p v-else-if="errorMsg" class="text-red-600">{{ errorMsg }}</p>
        <div v-else-if="items.length" class="max-h-56 overflow-y-auto">
          <table class="w-full border-collapse border border-light-c">
            <tbody>
              <tr
                v-for="(it, i) in items"
                :key="i"
                class="border-b border-light-c last:border-b-0"
              >
                <td class="break-words border-r border-light-c py-0.5 pr-2 align-top">{{ it.productName }}</td>
                <td class="whitespace-nowrap border-r border-light-c py-0.5 px-2 text-right align-top tabular-nums text-base-c">
                  {{ it.originalNum }}
                </td>
                <td class="whitespace-nowrap py-0.5 pl-2 align-top text-hint-c opacity-70">
                  {{ it.specificationUnitName }}
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
