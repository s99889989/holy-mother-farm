<script setup>
  import { reactive, ref, computed, onMounted } from 'vue'

  // 「銷貨統計明細」：對應原網站 統計報表 > 銷貨統計報表 > 銷貨統計明細
  // （/COAERP/SalesStatistics/SearchSalesStatisticsList），目前只做
  // 「客戶日期銷售品項明細表-(A4)」這一張報表。
  //
  // 原網站這張報表只提供「列印」「EXCEL」兩種輸出，沒有資料 API，所以：
  //   - 網頁顯示：後端用查詢條件跟原網站要 Excel，解析成 JSON 再畫表格
  //     （sales-statistics-list.get.ts）
  //   - 下載 Excel：後端把原網站的 Excel 原封不動轉給瀏覽器
  //     （sales-statistics-list-excel.get.ts），跟原網站下載的檔案一模一樣
  //   - 下載整理版 Excel：本站自己產生的版本，直接用畫面上已查詢到的資料
  //     （含品項篩選）在瀏覽器端用 SheetJS 產生 .xlsx，不再打原網站。
  //     原網站的版本是給列印看的排版（合併儲存格、客戶只寫在第一列、夾雜
  //     合計列），不方便在 Excel 裡篩選/樞紐分析；整理版每一列都帶客戶，
  //     分成「明細」「依品項彙總」「客戶合計」三個工作表。
  // 表單欄位、報表代碼、Excel 格式的核對說明見
  // server/utils/dc-erp/salesStatisticsList.ts。
  //
  // 查詢條件比照原網站表單；選項（場別/母公司/客戶類別/簽核狀態/單據類型）
  // 跟預設期間從原網站查詢頁解析（sales-statistics-list-options.get.ts）。
  // 日期用瀏覽器原生日期選單（西元），送到原網站時轉成 yyyy/MM/dd。
  definePageMeta({
    layout: 'staff',
    requiredPermission: 'order.dc-erp'
  })

  const filters = reactive({
    dateS: '',
    dateE: '',
    firmCodeS: '',
    firmCodeE: '',
    workPlaceS: '',
    workPlaceE: '',
    prodCodeS: '',
    prodCodeE: '',
    parentFirmID: '0',
    firmType: '不拘',
    saleSlipData: true,
    saleReturnData: true,
    signState: 'sign',
    formType: '-1'
  })

  const options = reactive({
    workPlace: [],
    parentFirm: [],
    firmType: [],
    signState: [],
    formType: []
  })
  const companyId = ref('')

  const filterExpanded = ref(false)
  const optionsLoading = ref(true)
  const loading = ref(false)
  const downloading = ref(false)
  const errorMessage = ref('')

  const report = ref(null) // { title, periodText, customers, grandTotal }
  const viewMode = ref('detail') // 'detail' 逐筆明細 | 'summary' 依品項彙總
  const keyword = ref('') // 前端篩選：品項名稱

  function selectedValue(list, fallback) {
    const s = list.find(o => o.selected)
    return s ? s.value : fallback
  }

  async function loadOptions() {
    optionsLoading.value = true
    try {
      const data = await $fetch('/api/dc-erp/sales-statistics-list-options')
      companyId.value = data.companyId
      Object.assign(options, data.options)
      filters.dateS = data.dateS || filters.dateS
      filters.dateE = data.dateE || filters.dateE
      filters.parentFirmID = selectedValue(options.parentFirm, '0')
      filters.firmType = selectedValue(options.firmType, '不拘')
      filters.signState = selectedValue(options.signState, 'sign')
      filters.formType = selectedValue(options.formType, '-1')
    } catch (err) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        await navigateTo('/staff/order/dc-erp/login')
        return
      }
      errorMessage.value = err?.data?.statusMessage || '無法載入查詢條件，請稍後再試'
    } finally {
      optionsLoading.value = false
    }
  }

  // 客戶／品項起始代號輸入後，迄止還空著就自動帶入同一個代號
  // （查單一客戶最常見；要查區間再自己改迄止），比照原網站日期起始填完
  // 自動帶入結束日的做法。
  function fillEndIfEmpty(startKey, endKey) {
    if (filters[startKey] && !filters[endKey]) filters[endKey] = filters[startKey]
  }

  function validate() {
    if (!filters.dateS || !filters.dateE) {
      errorMessage.value = '請填寫期間'
      return false
    }
    if (filters.dateS > filters.dateE) {
      errorMessage.value = '期間起始日不能晚於結束日'
      return false
    }
    if (!filters.saleSlipData && !filters.saleReturnData) {
      errorMessage.value = '單據來源至少要勾選一個'
      return false
    }
    return true
  }

  function buildQuery() {
    return {
      companyId: companyId.value,
      dateS: filters.dateS,
      dateE: filters.dateE,
      firmCodeS: filters.firmCodeS.trim(),
      firmCodeE: filters.firmCodeE.trim(),
      workPlaceS: filters.workPlaceS,
      workPlaceE: filters.workPlaceE,
      prodCodeS: filters.prodCodeS.trim(),
      prodCodeE: filters.prodCodeE.trim(),
      parentFirmID: filters.parentFirmID,
      firmType: filters.firmType,
      saleSlipData: String(filters.saleSlipData),
      saleReturnData: String(filters.saleReturnData),
      signState: filters.signState,
      formType: filters.formType
    }
  }

  async function handleSearch() {
    errorMessage.value = ''
    if (!validate()) return
    loading.value = true
    try {
      report.value = await $fetch('/api/dc-erp/sales-statistics-list', { query: buildQuery() })
    } catch (err) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        await navigateTo('/staff/order/dc-erp/login')
        return
      }
      report.value = null
      errorMessage.value = err?.data?.statusMessage || '查詢失敗，請稍後再試'
    } finally {
      loading.value = false
    }
  }

  // 下載用原生 fetch 拿 blob：失敗時可以把錯誤訊息顯示在頁面上，
  // 不會跳到一頁 JSON 錯誤；檔名照原網站回傳的 Content-Disposition。
  async function handleDownload() {
    errorMessage.value = ''
    if (!validate()) return
    downloading.value = true
    try {
      const qs = new URLSearchParams(buildQuery()).toString()
      const res = await fetch(`/api/dc-erp/sales-statistics-list-excel?${qs}`, { credentials: 'include' })
      if (res.status === 401) {
        await navigateTo('/staff/order/dc-erp/login')
        return
      }
      if (!res.ok) {
        let msg = '下載失敗，請稍後再試'
        try {
          const data = await res.json()
          msg = data?.statusMessage || data?.message || msg
        } catch { /* 不是 JSON 就用預設訊息 */ }
        throw new Error(msg)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      let filename = '客戶日期銷售品項明細表.xls'
      const star = disposition.match(/filename\*=UTF-8''([^;]+)/i)
      if (star) {
        try { filename = decodeURIComponent(star[1]) } catch { /* 用預設檔名 */ }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      errorMessage.value = err?.message || '下載失敗，請稍後再試'
    } finally {
      downloading.value = false
    }
  }

  // ---------- 下載整理版 Excel（本站自己產生） ----------
  const exportingCustom = ref(false)

  async function handleDownloadCustom() {
    if (!report.value || !visibleCustomers.value.length) return
    exportingCustom.value = true
    errorMessage.value = ''
    try {
      // 只在按下按鈕時才載入 SheetJS，不影響頁面載入速度
      const mod = await import('xlsx')
      const XLSX = mod.default?.utils ? mod.default : mod

      const customers = visibleCustomers.value
      const numFmt = (ws, cols, fmt, fromRow, toRow) => {
        for (let r = fromRow; r <= toRow; r++) {
          for (const c of cols) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })]
            if (cell && cell.t === 'n') cell.z = fmt
          }
        }
      }

      // 工作表一：明細（每一列都帶客戶，第一列是欄位名稱，方便篩選/樞紐分析）
      const detailRows = [['客戶編號', '客戶', '銷售日期', '品項', '數量', '搭量', '單位', '單價', '金額']]
      for (const c of customers) {
        for (const i of c.items) {
          detailRows.push([c.firmCode, c.firmName, i.date, i.product, i.qty, i.giftNum, i.unit, i.price, i.amount])
        }
      }
      const detailLast = detailRows.length - 1
      detailRows.push([])
      detailRows.push(['', '', '', '總計', visibleTotal.value.qty, visibleTotal.value.giftNum, '', '', visibleTotal.value.amount])
      const wsDetail = XLSX.utils.aoa_to_sheet(detailRows)
      numFmt(wsDetail, [4, 5], '#,##0.##', 1, detailRows.length - 1)
      numFmt(wsDetail, [7], '#,##0.##', 1, detailLast)
      numFmt(wsDetail, [8], '#,##0', 1, detailRows.length - 1)
      wsDetail['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 11 }, { wch: 26 }, { wch: 8 }, { wch: 7 }, { wch: 12 }, { wch: 9 }, { wch: 10 }]
      wsDetail['!autofilter'] = { ref: `A1:I${detailLast + 1}` }

      // 工作表二：依品項彙總（跟畫面上「依品項彙總」同一套計算）
      const sumRows = [['客戶編號', '客戶', '品項', '單位', '出貨天數', '總數量', '總搭量', '總金額']]
      for (const c of customers) {
        for (const g of summarize(c.items)) {
          sumRows.push([c.firmCode, c.firmName, g.product, g.unit, g.days, g.qty, g.giftNum, g.amount])
        }
      }
      const sumLast = sumRows.length - 1
      const wsSum = XLSX.utils.aoa_to_sheet(sumRows)
      numFmt(wsSum, [5, 6], '#,##0.##', 1, sumLast)
      numFmt(wsSum, [7], '#,##0', 1, sumLast)
      wsSum['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 26 }, { wch: 12 }, { wch: 9 }, { wch: 9 }, { wch: 8 }, { wch: 11 }]
      wsSum['!autofilter'] = { ref: `A1:H${sumLast + 1}` }

      // 工作表三：客戶合計
      const custRows = [['客戶編號', '客戶', '筆數', '數量', '搭量', '金額']]
      for (const c of customers) {
        custRows.push([c.firmCode, c.firmName, c.items.length, c.subtotal.qty, c.subtotal.giftNum, c.subtotal.amount])
      }
      custRows.push(['', '總計', customers.reduce((n, c) => n + c.items.length, 0), visibleTotal.value.qty, visibleTotal.value.giftNum, visibleTotal.value.amount])
      const wsCust = XLSX.utils.aoa_to_sheet(custRows)
      numFmt(wsCust, [3, 4], '#,##0.##', 1, custRows.length - 1)
      numFmt(wsCust, [5], '#,##0', 1, custRows.length - 1)
      wsCust['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 7 }, { wch: 10 }, { wch: 8 }, { wch: 12 }]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, wsDetail, '明細')
      XLSX.utils.book_append_sheet(wb, wsSum, '依品項彙總')
      XLSX.utils.book_append_sheet(wb, wsCust, '客戶合計')

      // 檔名：期間用 Excel 表頭上的民國日期（沒有就用查詢條件），
      // 單一客戶時加上客戶名稱，有品項篩選時加註關鍵字
      const period = (report.value.periodText || `${filters.dateS}至${filters.dateE}`).replace(/\//g, '')
      const who = customers.length === 1 ? `_${customers[0].firmName || customers[0].firmCode}` : ''
      const kwNote = keyword.value.trim() ? `_篩選-${keyword.value.trim()}` : ''
      const filename = `銷貨統計明細${who}_${period}${kwNote}.xlsx`.replace(/[\\/:*?"<>|]/g, '_')

      XLSX.writeFile(wb, filename)
    } catch (err) {
      errorMessage.value = err?.message ? `產生 Excel 失敗：${err.message}` : '產生 Excel 失敗，請稍後再試'
    } finally {
      exportingCustom.value = false
    }
  }

  function handleReset() {
    Object.assign(filters, {
      firmCodeS: '',
      firmCodeE: '',
      workPlaceS: '',
      workPlaceE: '',
      prodCodeS: '',
      prodCodeE: '',
      parentFirmID: selectedValue(options.parentFirm, '0'),
      firmType: selectedValue(options.firmType, '不拘'),
      saleSlipData: true,
      saleReturnData: true,
      signState: selectedValue(options.signState, 'sign'),
      formType: selectedValue(options.formType, '-1')
    })
  }

  // ---------- 顯示：前端篩選 + 彙總 ----------
  const kw = computed(() => keyword.value.trim().toLowerCase())

  // 套用品項關鍵字後的客戶清單；有關鍵字時小計改成前端重算
  const visibleCustomers = computed(() => {
    if (!report.value) return []
    return report.value.customers
      .map((c) => {
        if (!kw.value) return c
        const items = c.items.filter(i => i.product.toLowerCase().includes(kw.value))
        return {
          ...c,
          items,
          subtotal: {
            qty: items.reduce((s, i) => s + i.qty, 0),
            giftNum: items.reduce((s, i) => s + i.giftNum, 0),
            amount: items.reduce((s, i) => s + i.amount, 0)
          }
        }
      })
      .filter(c => c.items.length)
  })

  const visibleTotal = computed(() => {
    if (!report.value) return { qty: 0, giftNum: 0, amount: 0 }
    if (!kw.value) return report.value.grandTotal
    return visibleCustomers.value.reduce((t, c) => ({
      qty: t.qty + c.subtotal.qty,
      giftNum: t.giftNum + c.subtotal.giftNum,
      amount: t.amount + c.subtotal.amount
    }), { qty: 0, giftNum: 0, amount: 0 })
  })

  // 依品項彙總：同一客戶、同品項＋單位合併，算總數量/總金額/出貨天數
  function summarize(items) {
    const map = new Map()
    for (const i of items) {
      const key = `${i.product}__${i.unit}`
      if (!map.has(key)) map.set(key, { product: i.product, unit: i.unit, qty: 0, giftNum: 0, amount: 0, dates: new Set() })
      const g = map.get(key)
      g.qty += i.qty
      g.giftNum += i.giftNum
      g.amount += i.amount
      g.dates.add(i.date)
    }
    return Array.from(map.values())
      .map(g => ({ ...g, days: g.dates.size }))
      .sort((a, b) => b.amount - a.amount)
  }

  const fmtQty = n => Number(n || 0).toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const fmtMoney = n => Number(n || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })
  const fmtPrice = n => Number(n || 0).toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

  onMounted(loadOptions)
</script>

<template>
  <div class="p-2 sm:p-4">
    <DcErpShell>
      <div class="space-y-3 p-2 sm:p-4">
        <!-- 查詢條件 -->
        <div class="space-y-2 rounded-xl border border-light-c bg-surface p-3 text-base">
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">期間：</label>
            <input
              v-model="filters.dateS"
              type="date"
              class="rounded border border-light-c bg-surface px-2 py-1"
              @change="!filters.dateE && (filters.dateE = filters.dateS)"
            >
            <span class="text-hint-c">~</span>
            <input v-model="filters.dateE" type="date" class="rounded border border-light-c bg-surface px-2 py-1">

            <label class="ml-2 text-muted-c">客戶代號：</label>
            <input
              v-model="filters.firmCodeS"
              type="text"
              placeholder="起始"
              class="w-28 rounded border border-light-c bg-surface px-2 py-1"
              @blur="fillEndIfEmpty('firmCodeS', 'firmCodeE')"
              @keyup.enter="fillEndIfEmpty('firmCodeS', 'firmCodeE'); handleSearch()"
            >
            <span class="text-hint-c">~</span>
            <input
              v-model="filters.firmCodeE"
              type="text"
              placeholder="迄止"
              class="w-28 rounded border border-light-c bg-surface px-2 py-1"
              @keyup.enter="handleSearch"
            >

            <button
              class="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              :disabled="loading || optionsLoading"
              @click="handleSearch"
            >
              {{ loading ? '查詢中…' : '送出查詢' }}
            </button>
            <button
              class="rounded-lg border border-light-c px-3 py-1.5 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="downloading || optionsLoading"
              @click="handleDownload"
            >
              {{ downloading ? '下載中…' : '下載 Excel' }}
            </button>
            <button
              class="rounded-lg border border-light-c px-3 py-1.5 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="!report || !visibleCustomers.length || exportingCustom || loading"
              :title="report ? '依目前查詢結果（含品項篩選）產生，分成明細／依品項彙總／客戶合計三個工作表' : '請先送出查詢'"
              @click="handleDownloadCustom"
            >
              {{ exportingCustom ? '產生中…' : '下載整理版 Excel' }}
            </button>
            <button
              class="ml-auto rounded-lg border border-light-c px-3 py-1.5 text-sm text-muted-c hover:bg-surface2"
              @click="filterExpanded = !filterExpanded"
            >
              {{ filterExpanded ? '收起條件 ▲' : '更多條件 ▼' }}
            </button>
          </div>

          <div v-if="filterExpanded" class="space-y-2 border-t border-light-c pt-2">
            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">場別：</label>
              <select v-model="filters.workPlaceS" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.workPlace" :key="`s${opt.value}`" :value="opt.value">{{ opt.label }}</option>
              </select>
              <span class="text-hint-c">~</span>
              <select v-model="filters.workPlaceE" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.workPlace" :key="`e${opt.value}`" :value="opt.value">{{ opt.label }}</option>
              </select>

              <label class="ml-2 text-muted-c">品項代號：</label>
              <input
                v-model="filters.prodCodeS"
                type="text"
                placeholder="起始"
                class="w-28 rounded border border-light-c bg-surface px-2 py-1"
                @blur="fillEndIfEmpty('prodCodeS', 'prodCodeE')"
              >
              <span class="text-hint-c">~</span>
              <input v-model="filters.prodCodeE" type="text" placeholder="迄止" class="w-28 rounded border border-light-c bg-surface px-2 py-1">
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="text-muted-c">母公司：</label>
              <select v-model="filters.parentFirmID" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.parentFirm" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>

              <label class="ml-2 text-muted-c">客戶類別：</label>
              <select v-model="filters.firmType" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.firmType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>

              <label class="ml-2 text-muted-c">簽核狀態：</label>
              <select v-model="filters.signState" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.signState" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>

              <label class="ml-2 text-muted-c">單據類型：</label>
              <select v-model="filters.formType" class="rounded border border-light-c bg-surface px-2 py-1">
                <option v-for="opt in options.formType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span class="text-muted-c">單據來源：</span>
              <label class="flex items-center gap-1">
                <input v-model="filters.saleSlipData" type="checkbox"> 銷貨單
              </label>
              <label class="flex items-center gap-1">
                <input v-model="filters.saleReturnData" type="checkbox"> 銷貨退回單
              </label>
              <button
                class="ml-auto rounded-lg border border-light-c px-3 py-1 text-sm text-muted-c hover:bg-surface2"
                @click="handleReset"
              >
                清除條件
              </button>
            </div>
          </div>
        </div>

        <p v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-600">
          {{ errorMessage }}
        </p>

        <!-- 結果 -->
        <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
          <p v-if="loading" class="p-6 text-base text-hint-c">
            查詢中…（原網站產生報表需要幾秒鐘）
          </p>
          <p v-else-if="!report" class="p-6 text-base text-hint-c">
            設定期間與客戶後按「送出查詢」，或直接「下載 Excel」。
          </p>

          <template v-else>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-light-c px-3 py-2">
              <div class="text-base font-bold text-base-c">
                {{ report.title }}
              </div>
              <div class="text-sm text-muted-c">
                銷售日期 {{ report.periodText || '—' }}
              </div>
              <div class="text-sm text-muted-c">
                {{ visibleCustomers.length }} 位客戶｜數量 {{ fmtQty(visibleTotal.qty) }}｜金額
                <span class="font-bold text-base-c">{{ fmtMoney(visibleTotal.amount) }}</span>
              </div>

              <div class="ml-auto flex flex-wrap items-center gap-2">
                <input
                  v-model="keyword"
                  type="text"
                  placeholder="篩選品項名稱"
                  class="w-40 rounded border border-light-c bg-surface px-2 py-1 text-sm"
                >
                <div class="flex items-center gap-0.5 rounded-lg border border-light-c p-0.5 text-xs">
                  <button
                    class="rounded px-2 py-0.5"
                    :class="viewMode === 'detail' ? 'bg-surface2 font-medium text-base-c' : 'text-muted-c hover:bg-surface2'"
                    @click="viewMode = 'detail'"
                  >
                    逐筆明細
                  </button>
                  <button
                    class="rounded px-2 py-0.5"
                    :class="viewMode === 'summary' ? 'bg-surface2 font-medium text-base-c' : 'text-muted-c hover:bg-surface2'"
                    @click="viewMode = 'summary'"
                  >
                    依品項彙總
                  </button>
                </div>
              </div>
            </div>

            <p v-if="!visibleCustomers.length" class="p-6 text-center text-base text-hint-c">
              {{ keyword ? '沒有符合的品項' : '這段期間查無銷售資料' }}
            </p>

            <div
              v-for="c in visibleCustomers"
              :key="c.firmCode || c.firmName"
              class="border-b border-light-c last:border-b-0"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 bg-surface2 px-3 py-1.5">
                <div class="font-medium text-base-c">
                  {{ c.firmCode }} {{ c.firmName }}
                </div>
                <div class="text-sm text-muted-c">
                  數量 {{ fmtQty(c.subtotal.qty) }}
                  <template v-if="c.subtotal.giftNum">｜搭量 {{ fmtQty(c.subtotal.giftNum) }}</template>
                  ｜合計 <span class="font-bold text-base-c">{{ fmtMoney(c.subtotal.amount) }}</span>
                </div>
              </div>

              <!-- 逐筆明細 -->
              <div v-if="viewMode === 'detail'" class="overflow-x-auto">
                <table class="w-full text-base">
                  <thead>
                  <tr class="border-b border-light-c text-left text-sm text-muted-c">
                    <th class="px-3 py-1.5">銷售日期</th>
                    <th class="px-3 py-1.5">品項</th>
                    <th class="px-3 py-1.5 text-right">數量</th>
                    <th class="px-3 py-1.5 text-right">搭量</th>
                    <th class="px-3 py-1.5">單位</th>
                    <th class="px-3 py-1.5 text-right">單價</th>
                    <th class="px-3 py-1.5 text-right">金額</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr
                    v-for="(i, idx) in c.items"
                    :key="idx"
                    class="border-b border-light-c last:border-b-0 hover:bg-surface2"
                    :class="idx > 0 && c.items[idx - 1].date !== i.date ? 'border-t-2' : ''"
                  >
                    <td class="whitespace-nowrap px-3 py-1 text-muted-c">
                      <!-- 同一天連續的列只在第一列顯示日期，比較好分辨是哪一天出的貨 -->
                      {{ idx === 0 || c.items[idx - 1].date !== i.date ? i.date : '' }}
                    </td>
                    <td class="px-3 py-1">{{ i.product }}</td>
                    <td class="px-3 py-1 text-right">{{ fmtQty(i.qty) }}</td>
                    <td class="px-3 py-1 text-right text-hint-c">{{ i.giftNum ? fmtQty(i.giftNum) : '' }}</td>
                    <td class="whitespace-nowrap px-3 py-1 text-muted-c">{{ i.unit }}</td>
                    <td class="px-3 py-1 text-right">{{ fmtPrice(i.price) }}</td>
                    <td class="px-3 py-1 text-right font-medium">{{ fmtMoney(i.amount) }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>

              <!-- 依品項彙總 -->
              <div v-else class="overflow-x-auto">
                <table class="w-full text-base">
                  <thead>
                  <tr class="border-b border-light-c text-left text-sm text-muted-c">
                    <th class="px-3 py-1.5">品項</th>
                    <th class="px-3 py-1.5">單位</th>
                    <th class="px-3 py-1.5 text-right">出貨天數</th>
                    <th class="px-3 py-1.5 text-right">總數量</th>
                    <th class="px-3 py-1.5 text-right">總搭量</th>
                    <th class="px-3 py-1.5 text-right">總金額</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr
                    v-for="g in summarize(c.items)"
                    :key="`${g.product}${g.unit}`"
                    class="border-b border-light-c last:border-b-0 hover:bg-surface2"
                  >
                    <td class="px-3 py-1">{{ g.product }}</td>
                    <td class="whitespace-nowrap px-3 py-1 text-muted-c">{{ g.unit }}</td>
                    <td class="px-3 py-1 text-right text-muted-c">{{ g.days }}</td>
                    <td class="px-3 py-1 text-right">{{ fmtQty(g.qty) }}</td>
                    <td class="px-3 py-1 text-right text-hint-c">{{ g.giftNum ? fmtQty(g.giftNum) : '' }}</td>
                    <td class="px-3 py-1 text-right font-medium">{{ fmtMoney(g.amount) }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              v-if="visibleCustomers.length > 1"
              class="flex flex-wrap items-center justify-end gap-3 border-t border-light-c bg-surface2 px-3 py-2 text-sm"
            >
              <span class="text-muted-c">{{ keyword ? '篩選後總計' : '總計' }}</span>
              <span>數量 {{ fmtQty(visibleTotal.qty) }}</span>
              <span v-if="visibleTotal.giftNum">搭量 {{ fmtQty(visibleTotal.giftNum) }}</span>
              <span class="font-bold text-base-c">金額 {{ fmtMoney(visibleTotal.amount) }}</span>
            </div>
          </template>
        </div>
      </div>
    </DcErpShell>
  </div>
</template>
