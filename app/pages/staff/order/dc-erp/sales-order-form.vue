<script setup>
  import { reactive, ref, onMounted, computed, watch } from 'vue'

  // 「訂貨單維護 - 新增/編輯」：URL 帶 ?guid=xxx 是編輯，不帶是新增，共用同一頁。
  // 跟訂貨單/銷貨單列表頁不同，這頁是本站第一個真正可編輯、會寫回原網站的
  // 表單頁（不只是查詢/瀏覽），存檔動作串接的原網站行為比較複雜，細節、假設
  // 都寫在 sales-order.post.ts 開頭註解裡，這裡只負責畫面。
  //
  // 明細 Grid 是原網站用 ExtJS 動態產生的（欄位由伺服器決定），這裡沒有照抄
  // ExtJS 的行為，改成本站畫面上目前實際會用到的固定欄位（品項代號/品名/
  // 單位/數量/單價/小計/倉庫/課稅別/備註）——這组欄位是比對過一筆真實
  // DetailSource 回應才定下來的，不是憑空猜的。搭贈（GiftWay/GiftPrice/
  // GiftNum/GiftTotal）這幾個欄位本站目前是隱藏欄位，這裡完全沒有做搭贈
  // 相關 UI，儲存時一律當作「搭贈方式：無」處理。
  //
  // 「客戶」欄位：原網站是燈箱選客戶（FirmList/CustomerList），選客戶的連結
  // 是 onclick="tb_GetParent().InputCustomer('代號','名稱','ID',...)"，代號/
  // 名稱/ID 直接寫在 onclick 屬性裡，可以穩穩解析（見 sales-order-firms.get.ts），
  // 這裡做成跟商品搜尋一樣的搜尋清單燈箱（單選，選一列就關窗）。
  // 「預收貨款」分頁（原網站 tabs-3）本站沒有做，這頁只有基本資料 + 宅配資料。
  definePageMeta({
    layout: 'staff',
    requiredPermission: 'order.dc-erp'
  })

  const route = useRoute()
  const guid = computed(() => (route.query.guid ? String(route.query.guid) : ''))
  const isNew = computed(() => !guid.value)

  const loading = ref(true)
  const saving = ref(false)
  const errorMessage = ref('')
  const breadcrumb = ref([])

  const header = reactive({
    code: '',
    workPlaceID: '0',
    primaryDate: '',
    receivingDate: '',
    firmID: '0',
    firmCode: '',
    firmName: '',
    purchaseDept: '',
    type: '1',
    customerDocCode: '',
    address: '',
    payWay: '1',
    taxInputType: '1',
    receiptType: '1',
    receiptMode: '1',
    remark: '',
    operatorID: '',
    operatorCode: '',
    operatorName: '',
    signState: '',
    receivingState: '',
    deliveryCompany: '黑貓宅急便',
    deliveryPeriod: '1',
    temperatureLevel: '1',
    deliveryPersonal: '',
    deliveryAddress: '',
    deliveryCellPhone: '',
    deliveryTelPhone: '',
    deliveryRemark: '',
    number: '0'
  })

  const options = reactive({
    workPlace: [],
    type: [],
    payWay: [],
    taxInputType: [],
    receiptType: [],
    receiptMode: [],
    deliveryCompany: [],
    deliveryPeriod: [],
    temperatureLevel: [],
    taxType: []
  })

  const showDelivery = ref(false)
  const showOtherSettings = ref(false)
  const showHeaderSection = ref(true)

  const warehouseOptions = ref([])

  // ── 品項圖片（進階品項管理，見 product-images.vue 檔頭註解）─────────
  // 跟該頁一樣：直接打 Spring Boot 的 DcErpProductImageController，不經過
  // Nuxt server/api、也跟 COAERP 完全無關，純粹用品項代號查有沒有圖可以
  // 顯示。這裡只「顯示」不提供上傳/刪除，要管理圖片請到「進階品項管理」頁。
  const commonStore = useCommonStore()
  const productImageOrigin = commonStore.data.main_url
  const productImagesMap = ref({})
  async function loadProductImagesMap() {
    try {
      const res = await fetch(`${productImageOrigin}/holy/dc-erp/product-image/list`)
      productImagesMap.value = await res.json() // { code: { images: [...], productClass: '...' } }
    } catch {
      productImagesMap.value = {}
    }
  }
  function productThumbUrl(code) {
    const images = productImagesMap.value[code]?.images
    if (!images || !images.length) return ''
    return (productImageOrigin + images[0]).replace('/holy/dc-erp/product-image/', '/holy/dc-erp/product-image/thumb/')
  }
  function productFullUrl(code) {
    const images = productImagesMap.value[code]?.images
    if (!images || !images.length) return ''
    return productImageOrigin + images[0]
  }
  // 商品搜尋燈箱（ProdListMultiple）本身完全沒有「所屬類別」欄位（原網站
  // 那張表格就是只有8欄，查證過確實沒有），但可以拿品項代號去對「進階
  // 品項管理」批次設置存下來的本地快取，有的話就能顯示——沒有的話（該
  // 品項還沒被「設置所屬類別」處理過）就顯示空白，不是資料抓取失敗。
  function productClassOf(code) {
    return productImagesMap.value[code]?.productClass || ''
  }
  // 依所屬類別篩選：COAERP 商品搜尋本身沒有類別篩選（見上面 productClassOf
  // 的說明），這裡只能用本地快取資料在「目前這一頁已經查到的結果」裡做
  // 篩選，不是重新對全部品項下類別條件查詢——換頁、換關鍵字都要重新篩。
  const productClassFilter = ref('')
  const productClassOptions = computed(() => {
    const set = new Set()
    for (const entry of Object.values(productImagesMap.value)) {
      if (entry?.productClass) set.add(entry.productClass)
    }
    return Array.from(set).sort()
  })
  const filteredProductResults = computed(() => {
    if (!productClassFilter.value) return productResults.value
    return productResults.value.filter((p) => productClassOf(p.code) === productClassFilter.value)
  })
  const previewUrl = ref('')

  // 明細列：id 是前端自產的暫時 key（不是伺服器 GUID），guid 是伺服器 GUID
  // （新列是空字串，代表還沒存過）。
  const details = ref([])
  const deletedGuids = ref([])
  let tempIdSeed = 0

  async function loadHeader() {
    const data = await $fetch('/api/dc-erp/sales-order-form', { query: guid.value ? { guid: guid.value } : {} })
    Object.assign(header, {
      code: data.header.code,
      workPlaceID: data.header.workPlaceID || '0',
      primaryDate: data.header.primaryDate,
      receivingDate: data.header.receivingDate,
      firmID: data.header.firmID || '0',
      firmCode: data.header.firmCode,
      firmName: data.header.firmName,
      purchaseDept: data.header.purchaseDept,
      type: data.header.type || '1',
      customerDocCode: data.header.customerDocCode,
      address: data.header.address,
      payWay: data.header.payWay || '1',
      taxInputType: data.header.taxInputType || '1',
      receiptType: data.header.receiptType || '1',
      receiptMode: data.header.receiptMode || '1',
      remark: data.header.remark,
      operatorID: data.header.operatorID,
      operatorCode: data.header.operatorCode,
      operatorName: data.header.operatorName,
      signState: data.header.signState,
      receivingState: data.header.receivingState,
      deliveryCompany: data.header.deliveryCompany || '黑貓宅急便',
      deliveryPeriod: data.header.deliveryPeriod || '1',
      temperatureLevel: data.header.temperatureLevel || '1',
      deliveryPersonal: data.header.deliveryPersonal,
      deliveryAddress: data.header.deliveryAddress,
      deliveryCellPhone: data.header.deliveryCellPhone,
      deliveryTelPhone: data.header.deliveryTelPhone,
      deliveryRemark: data.header.deliveryRemark,
      number: data.header.number || '0'
    })
    options.workPlace = data.header.workPlaceOptions
    options.type = data.header.typeOptions
    options.payWay = data.header.payWayOptions
    options.taxInputType = data.header.taxInputTypeOptions
    options.receiptType = data.header.receiptTypeOptions
    options.receiptMode = data.header.receiptModeOptions
    options.deliveryCompany = data.header.deliveryCompanyOptions
    options.deliveryPeriod = data.header.deliveryPeriodOptions
    options.temperatureLevel = data.header.temperatureLevelOptions
    options.taxType = data.taxTypeOptions
    breadcrumb.value = data.breadcrumb

    // 新增訂貨單時，原網站「場別」預設是「未選取」（value 0），這裡改成
    // 預設帶入「聖母農莊」——用選項的顯示文字去找，而不是寫死代號（代號在
    // 資料庫裡本來就可能變動，比對名稱比較不會因為代號改變而跟著壞掉）。
    // 如果之後改用其他場別為主，或希望維持原網站「未選取」的行為，把下面
    // 這段拿掉即可。
    if (isNew.value && (!header.workPlaceID || header.workPlaceID === '0')) {
      const defaultWorkPlace = options.workPlace.find((opt) => opt.label === '聖母農莊')
      if (defaultWorkPlace) header.workPlaceID = defaultWorkPlace.value
    }

    firmCodeInput.value = header.firmCode
    if (header.firmID && header.firmID !== '0') firmLookupState.value = 'found'
  }

  async function loadDetails() {
    if (isNew.value) {
      details.value = []
      return
    }
    const data = await $fetch('/api/dc-erp/sales-order-detail', { query: { purchaseid: guid.value } })
    details.value = data.items.map((it) => ({
      tempId: `t${tempIdSeed++}`,
      guid: it.guid && it.guid !== '00000000-0000-0000-0000-000000000000' ? it.guid : '',
      productID: it.productID,
      productCode: it.productCode,
      productName: it.productName,
      productSpecificationID: it.productSpecificationID,
      productSpecificationCode: it.productSpecificationCode,
      correspondNoID: it.correspondNoID,
      correspondNoCode: it.correspondNoCode,
      specificationUnitID: it.specificationUnitID,
      specificationUnitCode: it.specificationUnitCode,
      specificationUnitName: it.specificationUnitName,
      warehouseID: it.warehouseID,
      warehouseCode: it.warehouseCode,
      warehouseName: it.warehouseName,
      productLevel: it.productLevel,
      originalNum: it.originalNum,
      price: it.price,
      weight: it.weight,
      taxType: it.taxType,
      remark: it.remark
    }))
  }

  async function loadWarehouses() {
    if (!header.workPlaceID || header.workPlaceID === '0') {
      warehouseOptions.value = []
      return
    }
    try {
      const data = await $fetch('/api/dc-erp/sales-order-warehouses', { query: { workPlaceId: header.workPlaceID } })
      warehouseOptions.value = data.items
    } catch {
      warehouseOptions.value = []
    }
  }

  // 「明細」跟「新增商品搜尋結果」的顯示方式（列表/卡片）統一在「設定」頁
  // 調整（見 settings.vue，key: orderDetail / productSearch，銷貨單編輯頁
  // 共用同一組設定），這裡只在載入時讀取。
  const LIST_SETTINGS_KEY = 'dc-erp-list-settings'
  function loadListSettings(key, defaults) {
    try {
      const raw = window.localStorage.getItem(LIST_SETTINGS_KEY)
      if (!raw) return defaults
      const all = JSON.parse(raw)
      return { ...defaults, ...(all[key] || {}) }
    } catch {
      return defaults
    }
  }
  const detailViewMode = ref('card')
  const productViewMode = ref('table')

  async function init() {
    loading.value = true
    errorMessage.value = ''
    detailViewMode.value = loadListSettings('orderDetail', { viewMode: 'card' }).viewMode
    productViewMode.value = loadListSettings('productSearch', { viewMode: 'table' }).viewMode
    try {
      await loadHeader()
      // 新增訂貨單時，如果還沒選客戶，自動帶入這台瀏覽器上一次選過的客戶
      // （純前端 localStorage 記錄，見下面「客戶輸入／搜尋」區塊）。
      if (isNew.value && (!header.firmID || header.firmID === '0')) {
        const history = loadCustomerHistory()
        if (history.length) pickFirm(history[0])
      }
      await Promise.all([loadDetails(), loadWarehouses(), loadProductImagesMap()])
    } catch (err) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        await navigateTo('/staff/order/dc-erp/login')
        return
      }
      errorMessage.value = err?.data?.statusMessage || '無法載入訂貨單資料，請稍後再試'
    } finally {
      loading.value = false
    }
  }

  onMounted(init)

  watch(() => header.workPlaceID, loadWarehouses)

  // ---------- 客戶輸入／搜尋 ----------
  // 「客戶」欄位支援兩種操作方式：
  //   1. 直接在輸入框打客戶代號、按 Enter，直接依代號查詢（依欄位=客戶代號）
  //      比對到唯一一筆就直接補全；比對到多筆（代號有重複，例如同代號不同
  //      分店）就自動開下面的搜尋燈箱讓使用者自己選；查無資料就顯示查無此代號
  //   2. 點旁邊的放大鏡開完整搜尋燈箱（可依類別/欄位/關鍵字查詢，瀏覽全部）
  const firmCodeInput = ref('')
  const firmLookupState = ref('') // '', 'loading', 'found', 'notfound', 'error'

  // 客戶選擇紀錄：純前端 localStorage 記住這台瀏覽器最近選過的客戶（代號+
  // 名稱+ID，最多 10 筆，最近選的排最前面）。輸入框 focus 時顯示下拉可以
  //直接點選；新增訂貨單時如果還沒選客戶，會自動帶入最近一筆（見 init()）。
  const CUSTOMER_HISTORY_KEY = 'dc-erp-sales-orders-customer-history'
  const MAX_CUSTOMER_HISTORY = 10
  const customerHistory = ref([])
  const showCustomerHistory = ref(false)

  function loadCustomerHistory() {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(CUSTOMER_HISTORY_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function saveCustomerHistory(list) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(CUSTOMER_HISTORY_KEY, JSON.stringify(list))
    } catch {
      // 存不進去（例如無痕模式滿了）就算了，不影響選客戶本身
    }
  }

  function addToCustomerHistory(firm) {
    if (!firm?.id || !firm?.code) return
    const next = [
      { id: firm.id, code: firm.code, name: firm.name },
      ...customerHistory.value.filter((f) => f.id !== firm.id)
    ].slice(0, MAX_CUSTOMER_HISTORY)
    customerHistory.value = next
    saveCustomerHistory(next)
  }

  function onFirmCodeFocus() {
    customerHistory.value = loadCustomerHistory()
    showCustomerHistory.value = customerHistory.value.length > 0
  }

  function onFirmCodeBlur() {
    // 延遲關閉，讓下面選項的 click（mousedown）事件能先觸發
    setTimeout(() => { showCustomerHistory.value = false }, 150)
  }

  function pickFromHistory(firm) {
    pickFirm(firm)
    showCustomerHistory.value = false
  }

  const showFirmSearch = ref(false)
  const firmKeyword = ref('')
  const firmCategory = ref('不拘')
  const firmCategoryOptions = ref([])
  const firmResults = ref([])
  const firmSearching = ref(false)
  const firmSearchError = ref('')
  const firmPage = ref(1)
  const firmTotalPages = ref(1)

  function openFirmSearch() {
    firmKeyword.value = firmCodeInput.value
    firmSearchError.value = ''
    firmResults.value = []
    firmPage.value = 1
    showFirmSearch.value = true
    searchFirms()
  }

  async function searchFirms(targetPage = 1) {
    firmSearching.value = true
    firmSearchError.value = ''
    try {
      const data = await $fetch('/api/dc-erp/sales-order-firms', {
        query: { keyword: firmKeyword.value, category: firmCategory.value, page: targetPage }
      })
      firmResults.value = data.items
      firmPage.value = data.page
      firmTotalPages.value = data.totalPages
      if (data.categoryOptions?.length) firmCategoryOptions.value = data.categoryOptions
    } catch (err) {
      firmSearchError.value = err?.data?.statusMessage || '客戶搜尋失敗'
    } finally {
      firmSearching.value = false
    }
  }

  function pickFirm(firm) {
    header.firmID = firm.id
    header.firmCode = firm.code
    header.firmName = firm.name
    firmCodeInput.value = firm.code
    firmLookupState.value = 'found'
    showFirmSearch.value = false
    addToCustomerHistory(firm)
  }

  // 輸入框按 Enter：依客戶代號直接查（WHSearch=Code），比對到唯一一筆直接
  // 補全，比對到多筆就開燈箱讓使用者選，避免代號打對了一半、還要多點一次
  // 放大鏡才能選的麻煩。
  async function handleFirmCodeEnter() {
    const code = firmCodeInput.value.trim()
    if (!code) return
    firmLookupState.value = 'loading'
    try {
      const data = await $fetch('/api/dc-erp/sales-order-firms', {
        query: { keyword: code, whSearch: 'Code', category: '不拘', page: 1 }
      })
      const items = data.items || []
      const exact = items.find((f) => f.code.toLowerCase() === code.toLowerCase())
      if (exact) {
        pickFirm(exact)
      } else if (items.length === 1) {
        pickFirm(items[0])
      } else if (items.length > 1) {
        firmKeyword.value = code
        firmCategory.value = '不拘'
        firmLookupState.value = ''
        showFirmSearch.value = true
        searchFirms(1)
      } else {
        header.firmID = '0'
        header.firmName = ''
        firmLookupState.value = 'notfound'
      }
    } catch {
      firmLookupState.value = 'error'
    }
  }

  // ---------- 商品搜尋 ----------
  const showProductSearch = ref(false)
  const productFilterExpanded = ref(false) // 進階篩選（資料來源/促銷檔期/對應貨號）預設收起，規格單位/關鍵字比較常用保持展開
  const productKeyword = ref('')
  const productWhSearch = ref('whatever')
  const productWhSearchOptions = ref([])
  const productSourceType = ref('0')
  const productSourceTypeOptions = ref([])
  const productSche = ref('0')
  const productScheOptions = ref([])
  const productCorrespondNoKeyword = ref('')
  const productSpecUnitKeyword = ref('')
  const productFirmName = ref('')
  const productResults = ref([])
  const productSearching = ref(false)
  const productSearchError = ref('')
  const productPage = ref(1)
  const productTotalPages = ref(1)
  const selectedProductIds = reactive(new Set())

  function openProductSearch() {
    if (!header.workPlaceID || header.workPlaceID === '0') {
      productSearchError.value = '請先選擇場別'
      showProductSearch.value = true
      return
    }
    if (!header.firmID || header.firmID === '0') {
      productSearchError.value = '請先輸入並查詢客戶'
      showProductSearch.value = true
      return
    }
    productSearchError.value = ''
    productKeyword.value = ''
    productWhSearch.value = 'whatever'
    productSourceType.value = '0'
    productSche.value = '0'
    productCorrespondNoKeyword.value = ''
    productSpecUnitKeyword.value = ''
    productClassFilter.value = ''
    productResults.value = []
    selectedProductIds.clear()
    showProductSearch.value = true
    searchProducts(1)
  }

  async function searchProducts(targetPage = 1) {
    if (productClassFilter.value) {
      await searchProductsByClass()
      return
    }
    productSearching.value = true
    productSearchError.value = ''
    try {
      const data = await $fetch('/api/dc-erp/sales-order-products', { query: buildProductQuery(targetPage) })
      productResults.value = data.items
      productPage.value = data.page
      productTotalPages.value = data.totalPages
      productFirmName.value = data.firmName
      if (data.whSearchOptions?.length) productWhSearchOptions.value = data.whSearchOptions
      if (data.sourceTypeOptions?.length) productSourceTypeOptions.value = data.sourceTypeOptions
      if (data.scheOptions?.length) productScheOptions.value = data.scheOptions
    } catch (err) {
      productSearchError.value = err?.data?.statusMessage || '商品搜尋失敗'
    } finally {
      productSearching.value = false
    }
  }

  function buildProductQuery(targetPage) {
    return {
      keyword: productKeyword.value,
      whSearch: productWhSearch.value,
      sourceType: productSourceType.value,
      scheSelect: productSche.value,
      correspondNoKeyword: productCorrespondNoKeyword.value,
      specUnitKeyword: productSpecUnitKeyword.value,
      firmId: header.firmID,
      workPlaceId: header.workPlaceID,
      selectDate: header.receivingDate || header.primaryDate,
      page: targetPage
    }
  }

  // ── 依所屬類別搜尋（快速版：用代號字首）─────────────────────────
  // 使用者在原網站實測確認過兩件事：(1) 商品搜尋「依欄位=品項代號」的關鍵字
  // 是部分比對（打 aa 只查到 aa 開頭的代號）(2) 觀察到的樣本裡，同一類別
  // 的代號目前都共用固定字首（aa002~aa022 清一色都是米類）。
  //
  // 利用這點，把「逐頁掃描全部」改成：從本地類別快取抓出這個類別的所有
  // 代號 → 依代號前兩碼分組 → 對每個字首各發一次「代號部分比對」查詢
  // （通常只要幾次，不是幾十頁）。
  //
  // 安全網：字首終究只是「縮小範圍」的手段，不是保證正確——查回來的每一筆
  // 還是會用本地類別快取重新核對一次是不是真的屬於這個類別，不是的就丟掉；
  // 使用者自己在關鍵字欄位打的字也會一併套用（用品名比對）。就算「字首＝
  // 類別」這個規律以後失效，結果正確性也不會受影響，只是變慢——這種情況
  // （抓不到查詢欄位、或本地快取這個類別完全沒有代號）會直接退回原本逐頁
  // 掃描全部的做法，不會整個功能壞掉。
  const productClassSearching = ref(false)
  const productClassSearchProgress = ref('')
  const productClassSearchCapped = ref(false)
  const MAX_CLASS_SEARCH_MATCHES = 200
  const MAX_CLASS_SEARCH_PAGES = 60

  function codesForClass(cls) {
    return Object.keys(productImagesMap.value).filter((code) => productImagesMap.value[code]?.productClass === cls)
  }
  function codePrefixesForClass(cls) {
    const set = new Set()
    for (const code of codesForClass(cls)) {
      if (code.length >= 2) set.add(code.slice(0, 2).toLowerCase())
    }
    return Array.from(set)
  }

  async function searchProductsByClass() {
    productSearching.value = true
    productClassSearching.value = true
    productClassSearchCapped.value = false
    productSearchError.value = ''
    productResults.value = []

    const codeField = productWhSearchOptions.value.find((o) => /品項代號|商品代號/.test(o.label))?.value
    const prefixes = codeField ? codePrefixesForClass(productClassFilter.value) : []

    if (!codeField || !prefixes.length) {
      await searchProductsByClassScanAll()
      return
    }

    const seenIds = new Set()
    const matches = []
    try {
      outer: for (let i = 0; i < prefixes.length; i++) {
        let page = 1
        let totalPages = 1
        do {
          productClassSearchProgress.value = `依類別搜尋中（字首 ${i + 1}/${prefixes.length}：${prefixes[i]}，第 ${page}/${totalPages} 頁，已找到 ${matches.length} 筆）…`
          const data = await $fetch('/api/dc-erp/sales-order-products', {
            query: { ...buildProductQuery(page), whSearch: codeField, keyword: prefixes[i] }
          })
          totalPages = data.totalPages || 1
          productFirmName.value = data.firmName
          for (const item of data.items) {
            if (seenIds.has(item.id)) continue
            if (productClassOf(item.code) !== productClassFilter.value) continue
            if (productKeyword.value && !item.name.includes(productKeyword.value)) continue
            seenIds.add(item.id)
            matches.push(item)
          }
          if (matches.length >= MAX_CLASS_SEARCH_MATCHES) break outer
          page++
        } while (page <= totalPages)
      }
      productResults.value = matches
      productPage.value = 1
      productTotalPages.value = 1
      if (matches.length >= MAX_CLASS_SEARCH_MATCHES) productClassSearchCapped.value = true
    } catch (err) {
      productSearchError.value = err?.data?.statusMessage || '依類別搜尋失敗'
    } finally {
      productSearching.value = false
      productClassSearching.value = false
      productClassSearchProgress.value = ''
    }
  }

  // 保底：找不到「品項代號」查詢欄位、或本地快取這個類別沒有任何代號時才會
  // 用到——邏輯跟改版前一樣，逐頁把符合關鍵字等條件的結果掃過一輪再篩選。
  async function searchProductsByClassScanAll() {
    productSearchError.value = ''
    productResults.value = []
    const matches = []
    try {
      let page = 1
      let totalPages = 1
      do {
        productClassSearchProgress.value = `依類別搜尋中（第 ${page} / ${totalPages} 頁，已找到 ${matches.length} 筆）…`
        const data = await $fetch('/api/dc-erp/sales-order-products', { query: buildProductQuery(page) })
        totalPages = data.totalPages || 1
        matches.push(...data.items.filter((p) => productClassOf(p.code) === productClassFilter.value))
        productFirmName.value = data.firmName
        if (data.whSearchOptions?.length) productWhSearchOptions.value = data.whSearchOptions
        if (data.sourceTypeOptions?.length) productSourceTypeOptions.value = data.sourceTypeOptions
        if (data.scheOptions?.length) productScheOptions.value = data.scheOptions
        page++
      } while (page <= totalPages && matches.length < MAX_CLASS_SEARCH_MATCHES && page <= MAX_CLASS_SEARCH_PAGES)

      productResults.value = matches
      productPage.value = 1
      productTotalPages.value = 1
      if (matches.length >= MAX_CLASS_SEARCH_MATCHES || (page > MAX_CLASS_SEARCH_PAGES && page <= totalPages)) {
        productClassSearchCapped.value = true
      }
    } catch (err) {
      productSearchError.value = err?.data?.statusMessage || '依類別搜尋失敗'
    } finally {
      productSearching.value = false
      productClassSearching.value = false
      productClassSearchProgress.value = ''
    }
  }

  function toggleProductSelect(id) {
    if (selectedProductIds.has(id)) selectedProductIds.delete(id)
    else selectedProductIds.add(id)
  }

  async function confirmProductSelection() {
    const ids = Array.from(selectedProductIds)
    if (!ids.length) {
      showProductSearch.value = false
      return
    }
    try {
      const data = await $fetch('/api/dc-erp/sales-order-products-info', {
        query: {
          ids: ids.join(','),
          firmId: header.firmID,
          workPlaceId: header.workPlaceID,
          selectDate: header.receivingDate || header.primaryDate
        }
      })
      for (const p of data.items) {
        details.value.push({
          tempId: `t${tempIdSeed++}`,
          guid: '',
          productID: p.productID,
          productCode: p.productCode,
          productName: p.productName,
          productSpecificationID: p.productSpecificationID,
          productSpecificationCode: p.productSpecificationCode,
          correspondNoID: p.correspondNoID,
          correspondNoCode: p.correspondNoCode,
          specificationUnitID: p.unitID,
          specificationUnitCode: p.unitCode,
          specificationUnitName: p.unitName,
          warehouseID: p.warehouseID,
          warehouseCode: p.warehouseCode,
          warehouseName: p.warehouseName,
          productLevel: '無',
          originalNum: 1,
          price: p.price,
          weight: p.weight,
          taxType: p.taxType || (options.taxType[0]?.value ?? ''),
          remark: ''
        })
      }
    } finally {
      showProductSearch.value = false
    }
  }

  function removeRow(row) {
    if (row.guid) deletedGuids.value.push(row.guid)
    details.value = details.value.filter((r) => r.tempId !== row.tempId)
  }

  // 明細排序：純畫面上調整順序，跟原網站無關（原網站明細本來就沒有順序
  // 概念，儲存時是照陣列順序整批送出，所以調整順序不影響其他欄位）。
  function moveRowUp(index) {
    if (index <= 0) return
    const arr = details.value
    const tmp = arr[index - 1]
    arr[index - 1] = arr[index]
    arr[index] = tmp
  }

  function moveRowDown(index) {
    if (index >= details.value.length - 1) return
    const arr = details.value
    const tmp = arr[index + 1]
    arr[index + 1] = arr[index]
    arr[index] = tmp
  }

  function onWarehouseChange(row, code) {
    const wh = warehouseOptions.value.find((w) => w.code === code)
    if (wh) {
      row.warehouseID = wh.id
      row.warehouseCode = wh.code
      row.warehouseName = wh.name
    }
  }

  const summation = computed(() => details.value.reduce((s, r) => s + (Number(r.originalNum) || 0) * (Number(r.price) || 0), 0))

  async function handleSave() {
    errorMessage.value = ''
    if (!header.workPlaceID || header.workPlaceID === '0') {
      errorMessage.value = '請選擇場別'
      return
    }
    if (!header.firmID || header.firmID === '0') {
      errorMessage.value = '請輸入並查詢客戶'
      return
    }
    const wasNew = isNew.value // 存檔後 guid.value 會因為網址列變化而跟著變，先記住這次是不是「新增」
    saving.value = true
    try {
      const result = await $fetch('/api/dc-erp/sales-order', {
        method: 'POST',
        body: {
          guid: guid.value,
          ...header,
          details: details.value,
          deletedGuids: deletedGuids.value
        }
      })
      if (wasNew) {
        // 新增訂貨單存檔成功後直接回列表頁，不管有沒有順利拿到新 Guid——
        // 資料確定已經存進去了，使用者要看剛存的那張單可以直接在列表上找。
        await navigateTo('/staff/order/dc-erp/sales-orders')
      } else if (result.guid) {
        // 編輯既有訂貨單：存檔完成且知道 Guid，停在（或跳到）這張單的編輯頁
        await navigateTo(`/staff/order/dc-erp/sales-order-form?guid=${result.guid}`)
        await init()
      } else {
        // 資料確定已經存進去了，只是這次沒能順便抓到 Guid，一樣導回列表頁
        await navigateTo('/staff/order/dc-erp/sales-orders')
      }
    } catch (err) {
      errorMessage.value = err?.data?.statusMessage || '儲存失敗，請稍後再試'
    } finally {
      saving.value = false
    }
  }

  const deleting = ref(false)

  async function handleDelete() {
    if (!guid.value) return
    if (!confirm(`確定要刪除訂貨單「${header.code}」嗎？此動作無法復原。`)) return
    deleting.value = true
    errorMessage.value = ''
    try {
      await $fetch('/api/dc-erp/sales-order-delete', {
        method: 'POST',
        body: { guid: guid.value }
      })
      await navigateTo('/staff/order/dc-erp/sales-orders')
    } catch (err) {
      errorMessage.value = err?.data?.statusMessage || '刪除失敗，請稍後再試'
    } finally {
      deleting.value = false
    }
  }

  const signing = ref(false)

  async function handleSign(action) {
    if (!guid.value) return
    const label = action === 'return' ? '簽退' : '簽核'
    if (!confirm(`確定要${label}訂貨單「${header.code}」嗎？`)) return
    signing.value = true
    errorMessage.value = ''
    try {
      await $fetch('/api/dc-erp/sales-order-sign', {
        method: 'POST',
        body: { guids: [guid.value], action }
      })
      await init()
    } catch (err) {
      errorMessage.value = err?.data?.statusMessage || `${label}失敗，請稍後再試`
    } finally {
      signing.value = false
    }
  }

  const transferring = ref(false)

  // 「轉銷」（轉入銷貨單），對應 SalesOrderModify.js 的 TransSlipClick()。
  // 原網站確切什麼條件下才會顯示這顆按鈕不完全確定（實測發現不是單純「已
  // 核准」就會顯示），這裡簡化成：已核准就顯示，讓使用者自己判斷要不要按；
  // 按下去如果條件不符，原網站那支 API 本身就會回錯誤訊息，不會誤動作。
  async function handleTransfer() {
    if (!guid.value) return
    if (!confirm(`確定要把訂貨單「${header.code}」轉入銷貨單嗎？`)) return
    transferring.value = true
    errorMessage.value = ''
    try {
      await $fetch('/api/dc-erp/sales-order-trans', {
        method: 'POST',
        body: { guid: guid.value }
      })
      await init()
    } catch (err) {
      errorMessage.value = err?.data?.statusMessage || '轉入銷貨單失敗'
    } finally {
      transferring.value = false
    }
  }
</script>

<template>
  <div class="p-2 sm:p-4">
    <DcErpShell>
      <div class="space-y-3 p-2 sm:p-4">
        <div class="flex items-center justify-end gap-3">
          <span class="text-xs text-hint-c">{{ isNew ? '新增' : `編輯（${header.code}）` }}</span>
          <NuxtLink to="/staff/order/dc-erp/sales-orders" class="text-xs text-muted-c hover:underline">
            返回列表
          </NuxtLink>
        </div>

        <p v-if="loading" class="p-6 text-sm text-hint-c">載入中…</p>

        <template v-else>
          <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">{{ errorMessage }}</p>

          <!-- 表頭 -->
          <div class="rounded-xl border border-light-c bg-surface text-sm">
            <button
              type="button"
              class="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left"
              @click="showHeaderSection = !showHeaderSection"
            >
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-bold text-base-c">訂單資訊</span>
                <span v-if="!showHeaderSection" class="text-xs text-muted-c">
                  {{ header.firmName || '尚未選擇客戶' }}｜{{ header.primaryDate || '未填訂貨日期' }} → {{ header.receivingDate || '未填交貨日期' }}
                  <template v-if="header.receivingState">｜{{ header.receivingState }}</template>
                  <template v-if="header.signState">｜{{ header.signState }}</template>
                </span>
              </div>
              <span class="shrink-0 text-xs text-muted-c">{{ showHeaderSection ? '收合 ▲' : '展開 ▼' }}</span>
            </button>

            <div v-show="showHeaderSection" class="space-y-2 border-t border-light-c p-3 pt-2">
              <div v-if="!isNew" class="flex flex-wrap items-center gap-2">
                <label class="text-muted-c">單號：</label>
                <span class="font-medium text-base-c">{{ header.code }}</span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <label class="text-muted-c"><span class="text-red-600">*</span>場別：</label>
                <select v-model="header.workPlaceID" class="rounded border border-light-c bg-surface px-2 py-1">
                  <option v-for="opt in options.workPlace" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <label class="text-muted-c"><span class="text-red-600">*</span>客戶：</label>
                <div class="relative flex items-center">
                  <input
                    v-model="firmCodeInput"
                    type="text"
                    placeholder="輸入客戶代號後按 Enter"
                    class="w-32 rounded-l border border-r-0 border-light-c bg-surface px-2 py-1"
                    @keyup.enter="handleFirmCodeEnter"
                    @focus="onFirmCodeFocus"
                    @blur="onFirmCodeBlur"
                  >
                  <button
                    class="rounded-r border border-light-c bg-surface2 px-2 py-1 text-muted-c hover:bg-surface"
                    title="搜尋客戶"
                    @click="openFirmSearch"
                  >
                    🔍
                  </button>
                  <ul
                    v-if="showCustomerHistory && customerHistory.length"
                    class="absolute top-full z-20 mt-1 max-h-48 w-56 overflow-y-auto rounded border border-light-c bg-surface text-sm shadow-lg"
                  >
                    <li
                      v-for="f in customerHistory"
                      :key="f.id"
                      class="cursor-pointer truncate px-2 py-1 hover:bg-surface2"
                      @mousedown.prevent="pickFromHistory(f)"
                    >
                      {{ f.code }} {{ f.name }}
                    </li>
                  </ul>
                </div>
                <span v-if="firmLookupState === 'loading'" class="text-xs text-hint-c">查詢中…</span>
                <span v-else-if="firmLookupState === 'found'" class="text-sm text-green-700">{{ header.firmName }}</span>
                <span v-else-if="firmLookupState === 'notfound'" class="text-xs text-red-600">查無此客戶代號</span>
                <span v-else-if="firmLookupState === 'error'" class="text-xs text-red-600">查詢失敗</span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <label class="text-muted-c"><span class="text-red-600">*</span>訂貨日期：</label>
                <DcErpDateInput v-model="header.primaryDate" />

                <label class="ml-2 text-muted-c"><span class="text-red-600">*</span>交貨日期：</label>
                <DcErpDateInput v-model="header.receivingDate" />
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <label class="text-muted-c">備註：</label>
                <DcErpKeywordSearchInput
                  v-model="header.remark"
                  storage-key="dc-erp-sales-orders-remark-history"
                  placeholder="備註"
                  width-class="w-full sm:w-96"
                />
              </div>

              <div class="flex flex-wrap items-center gap-2 text-xs text-hint-c">
                <span v-if="header.operatorName">經辦人員：{{ header.operatorCode }} {{ header.operatorName }}</span>
                <span v-if="header.receivingState" class="ml-2">訂單狀態：{{ header.receivingState }}</span>
                <span v-if="header.signState" class="ml-2">簽核狀態：{{ header.signState }}</span>
              </div>

              <button class="text-xs text-muted-c hover:underline" @click="showOtherSettings = !showOtherSettings">
                {{ showOtherSettings ? '收合其他設定 ▲' : '展開其他設定 ▼' }}
              </button>

              <div v-if="showOtherSettings" class="space-y-2 border-t border-light-c pt-2">
                <div class="flex flex-wrap items-center gap-2">
                  <label class="text-muted-c">採買單位：</label>
                  <input v-model="header.purchaseDept" type="text" class="w-24 rounded border border-light-c bg-surface px-2 py-1">

                  <label class="ml-2 text-muted-c">客戶單號：</label>
                  <input v-model="header.customerDocCode" type="text" class="w-32 rounded border border-light-c bg-surface px-2 py-1">
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <label class="text-muted-c">單據種類：</label>
                  <select v-model="header.type" class="rounded border border-light-c bg-surface px-2 py-1">
                    <option v-for="opt in options.type" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>

                  <label class="ml-2 text-muted-c">收款方式：</label>
                  <select v-model="header.payWay" class="rounded border border-light-c bg-surface px-2 py-1">
                    <option v-for="opt in options.payWay" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>

                  <label class="ml-2 text-muted-c">價格稅金：</label>
                  <select v-model="header.taxInputType" class="rounded border border-light-c bg-surface px-2 py-1">
                    <option v-for="opt in options.taxInputType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>

                  <label class="ml-2 text-muted-c">發票聯式：</label>
                  <select v-model="header.receiptType" class="rounded border border-light-c bg-surface px-2 py-1">
                    <option v-for="opt in options.receiptType" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>

                  <label class="ml-2 text-muted-c">開立方式：</label>
                  <select v-model="header.receiptMode" class="rounded border border-light-c bg-surface px-2 py-1">
                    <option v-for="opt in options.receiptMode" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <label class="text-muted-c">送貨地址：</label>
                  <input v-model="header.address" type="text" class="w-full sm:w-72 rounded border border-light-c bg-surface px-2 py-1">
                </div>
              </div>

              <button class="text-xs text-muted-c hover:underline" @click="showDelivery = !showDelivery">
                {{ showDelivery ? '收合宅配資料 ▲' : '展開宅配資料 ▼' }}
              </button>
              <div v-if="showDelivery" class="space-y-2 border-t border-light-c pt-2">
                <div class="flex flex-wrap items-center gap-2">
                  <label class="text-muted-c">宅配公司：</label>
                  <select v-model="header.deliveryCompany" class="rounded border border-light-c bg-surface px-2 py-1">
                    <option v-for="opt in options.deliveryCompany" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <label class="ml-2 text-muted-c">送達時段：</label>
                  <select v-model="header.deliveryPeriod" class="rounded border border-light-c bg-surface px-2 py-1">
                    <option v-for="opt in options.deliveryPeriod" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <label class="ml-2 text-muted-c">宅配溫層：</label>
                  <select v-model="header.temperatureLevel" class="rounded border border-light-c bg-surface px-2 py-1">
                    <option v-for="opt in options.temperatureLevel" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <label class="text-muted-c">宅配收件人：</label>
                  <input v-model="header.deliveryPersonal" type="text" class="w-32 rounded border border-light-c bg-surface px-2 py-1">
                  <label class="ml-2 text-muted-c">宅配地址：</label>
                  <input v-model="header.deliveryAddress" type="text" class="w-full sm:w-56 rounded border border-light-c bg-surface px-2 py-1">
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <label class="text-muted-c">聯絡手機：</label>
                  <input v-model="header.deliveryCellPhone" type="text" class="w-32 rounded border border-light-c bg-surface px-2 py-1">
                  <label class="ml-2 text-muted-c">聯絡電話：</label>
                  <input v-model="header.deliveryTelPhone" type="text" class="w-32 rounded border border-light-c bg-surface px-2 py-1">
                  <label class="ml-2 text-muted-c">宅配備註：</label>
                  <input v-model="header.deliveryRemark" type="text" class="w-40 rounded border border-light-c bg-surface px-2 py-1">
                </div>
              </div>
            </div>
          </div>

          <!-- 明細 -->
          <div class="overflow-hidden rounded-xl border border-light-c bg-surface">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-light-c px-3 py-2">
              <div class="text-sm font-bold text-base-c">明細（{{ details.length }} 筆）</div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="flex items-center gap-0.5 rounded-lg border border-light-c p-0.5 text-xs">
                  <button
                    class="rounded px-2 py-0.5"
                    :class="detailViewMode === 'table' ? 'bg-surface2 font-medium text-base-c' : 'text-muted-c hover:bg-surface2'"
                    @click="detailViewMode = 'table'"
                  >
                    列表
                  </button>
                  <button
                    class="rounded px-2 py-0.5"
                    :class="detailViewMode === 'card' ? 'bg-surface2 font-medium text-base-c' : 'text-muted-c hover:bg-surface2'"
                    @click="detailViewMode = 'card'"
                  >
                    卡片
                  </button>
                </div>
                <button class="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800" @click="openProductSearch">
                  + 新增商品
                </button>
              </div>
            </div>

            <!-- 卡片檢視 -->
            <div v-if="detailViewMode === 'card'" class="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              <div
                v-for="(row, index) in details"
                :key="row.tempId"
                class="overflow-hidden rounded-lg border border-light-c"
              >
                <div class="relative aspect-[4/3] bg-surface2">
                  <img
                    v-if="productThumbUrl(row.productCode)"
                    :src="productThumbUrl(row.productCode)"
                    class="h-full w-full cursor-pointer object-cover"
                    loading="lazy"
                    @click="previewUrl = productFullUrl(row.productCode)"
                  >
                  <span v-else class="flex h-full w-full items-center justify-center text-xs text-hint-c">無圖</span>
                  <div class="absolute right-1.5 top-1.5 flex flex-col gap-0.5">
                    <button type="button" class="rounded bg-surface/90 px-1.5 text-muted-c hover:bg-surface disabled:opacity-30" title="上移" :disabled="index === 0" @click="moveRowUp(index)">▲</button>
                    <button type="button" class="rounded bg-surface/90 px-1.5 text-muted-c hover:bg-surface disabled:opacity-30" title="下移" :disabled="index === details.length - 1" @click="moveRowDown(index)">▼</button>
                  </div>
                </div>
                <div class="space-y-2 p-3 text-sm">
                  <div class="min-w-0">
                    <div class="truncate font-medium text-base-c">{{ row.productName }}</div>
                    <div class="text-xs text-hint-c">{{ row.specificationUnitName }}</div>
                  </div>
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-xs text-muted-c">數量</div>
                      <div class="mt-0.5 flex items-center gap-1">
                        <button type="button" class="rounded border border-light-c px-2 text-muted-c hover:bg-surface2" @click="row.originalNum = Math.max(0, (Number(row.originalNum) || 0) - 1)">−</button>
                        <input v-model.number="row.originalNum" type="number" step="any" class="w-14 appearance-none rounded border border-light-c bg-surface px-1 py-1 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none">
                        <button type="button" class="rounded border border-light-c px-2 text-muted-c hover:bg-surface2" @click="row.originalNum = (Number(row.originalNum) || 0) + 1">＋</button>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-xs text-muted-c">單價</div>
                      <div class="mt-0.5 font-medium text-base-c">{{ row.price }}</div>
                    </div>
                  </div>
                  <div class="flex items-center justify-between border-t border-light-c pt-2">
                    <span class="text-muted-c">小計：<span class="font-medium text-base-c">{{ ((Number(row.originalNum) || 0) * (Number(row.price) || 0)).toLocaleString() }}</span></span>
                    <button class="text-xs text-red-600 hover:underline" @click="removeRow(row)">刪除</button>
                  </div>
                </div>
              </div>
              <p v-if="!details.length" class="col-span-full p-6 text-center text-hint-c">尚無明細，請按「新增商品」</p>
              <div v-if="details.length" class="col-span-full flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 font-medium">
                <span class="text-muted-c">合計</span>
                <span class="text-base-c">{{ summation.toLocaleString() }}</span>
              </div>
            </div>

            <!-- 列表檢視 -->
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
                  <th class="px-2 py-2 text-center">排序</th>
                  <th class="px-2 py-2 text-center">圖</th>
                  <th class="px-2 py-2">品名</th>
                  <th class="px-2 py-2">單位</th>
                  <th class="px-2 py-2 text-center">數量</th>
                  <th class="px-2 py-2 text-right">單價</th>
                  <th class="px-2 py-2 text-right">小計</th>
                  <th class="px-2 py-2"></th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(row, index) in details" :key="row.tempId" class="border-b border-light-c">
                  <td class="px-2 py-1.5">
                    <div class="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        class="rounded px-1 text-muted-c hover:bg-surface2 disabled:opacity-30"
                        title="上移"
                        :disabled="index === 0"
                        @click="moveRowUp(index)"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        class="rounded px-1 text-muted-c hover:bg-surface2 disabled:opacity-30"
                        title="下移"
                        :disabled="index === details.length - 1"
                        @click="moveRowDown(index)"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td class="px-2 py-1.5 text-center">
                    <img
                      v-if="productThumbUrl(row.productCode)"
                      :src="productThumbUrl(row.productCode)"
                      class="mx-auto h-8 w-8 cursor-pointer rounded object-cover"
                      loading="lazy"
                      @click="previewUrl = productFullUrl(row.productCode)"
                    >
                    <span v-else class="text-xs text-hint-c">-</span>
                  </td>
                  <td class="px-2 py-1.5">{{ row.productName }}</td>
                  <td class="px-2 py-1.5">{{ row.specificationUnitName }}</td>
                  <td class="px-2 py-1.5">
                    <div class="flex items-center justify-center gap-1">
                      <button type="button" class="rounded border border-light-c px-2 text-muted-c hover:bg-surface2" @click="row.originalNum = Math.max(0, (Number(row.originalNum) || 0) - 1)">−</button>
                      <input v-model.number="row.originalNum" type="number" step="any" class="w-14 appearance-none rounded border border-light-c bg-surface px-1 py-0.5 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none">
                      <button type="button" class="rounded border border-light-c px-2 text-muted-c hover:bg-surface2" @click="row.originalNum = (Number(row.originalNum) || 0) + 1">＋</button>
                    </div>
                  </td>
                  <td class="px-2 py-1.5 text-right">{{ row.price }}</td>
                  <td class="px-2 py-1.5 text-right">{{ ((Number(row.originalNum) || 0) * (Number(row.price) || 0)).toLocaleString() }}</td>
                  <td class="px-2 py-1.5">
                    <button class="text-xs text-red-600 hover:underline" @click="removeRow(row)">刪除</button>
                  </td>
                </tr>
                <tr v-if="!details.length">
                  <td colspan="8" class="px-2 py-6 text-center text-hint-c">尚無明細，請按「新增商品」</td>
                </tr>
                </tbody>
                <tfoot v-if="details.length">
                <tr class="border-t border-light-c bg-surface2 font-medium">
                  <td colspan="6" class="px-2 py-2 text-right text-muted-c">合計</td>
                  <td class="px-2 py-2 text-right">{{ summation.toLocaleString() }}</td>
                  <td></td>
                </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <button
              v-if="!isNew"
              class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              :disabled="deleting"
              @click="handleDelete"
            >
              {{ deleting ? '刪除中…' : '刪除訂貨單' }}
            </button>
            <button
              v-if="!isNew"
              class="rounded-lg border border-light-c px-4 py-2 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="signing"
              @click="handleSign('return')"
            >
              {{ signing ? '處理中…' : '簽退' }}
            </button>
            <button
              v-if="!isNew"
              class="rounded-lg border border-light-c px-4 py-2 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="signing"
              @click="handleSign('sign')"
            >
              {{ signing ? '處理中…' : '簽核' }}
            </button>
            <button
              v-if="!isNew && header.signState === '已核准'"
              class="rounded-lg border border-light-c px-4 py-2 text-sm font-medium text-muted-c hover:bg-surface2 disabled:opacity-50"
              :disabled="transferring"
              @click="handleTransfer"
            >
              {{ transferring ? '轉入中…' : '轉銷' }}
            </button>
            <button
              class="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              :disabled="saving"
              @click="handleSave"
            >
              {{ saving ? '儲存中…' : '儲存' }}
            </button>
          </div>
        </template>
      </div>
    </DcErpShell>

    <!-- 客戶搜尋燈箱 -->
    <div v-if="showFirmSearch" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-surface p-4">
        <div class="mb-2 flex items-center justify-between">
          <div class="text-sm font-bold text-base-c">選擇客戶</div>
          <button class="text-xs text-muted-c hover:underline" @click="showFirmSearch = false">關閉</button>
        </div>
        <div class="mb-2 flex items-center gap-2">
          <select v-model="firmCategory" class="rounded border border-light-c bg-surface px-2 py-1 text-sm">
            <option v-if="!firmCategoryOptions.length" value="不拘">不拘</option>
            <option v-for="opt in firmCategoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <input
            v-model="firmKeyword"
            type="text"
            placeholder="客戶代號／客戶名稱／電話…"
            class="flex-1 rounded border border-light-c bg-surface px-2 py-1 text-sm"
            @keyup.enter="searchFirms(1)"
          >
          <button class="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800" @click="searchFirms(1)">查詢</button>
        </div>
        <p v-if="firmSearchError" class="mb-2 text-xs text-red-600">{{ firmSearchError }}</p>
        <div class="flex-1 overflow-y-auto rounded border border-light-c">
          <p v-if="firmSearching" class="p-4 text-sm text-hint-c">搜尋中…</p>
          <table v-else class="w-full text-sm">
            <thead>
            <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
              <th class="px-2 py-1.5">客戶代號</th>
              <th class="px-2 py-1.5">客戶名稱</th>
            </tr>
            </thead>
            <tbody>
            <tr
              v-for="f in firmResults"
              :key="f.id"
              class="cursor-pointer border-b border-light-c hover:bg-surface2"
              @click="pickFirm(f)"
            >
              <td class="px-2 py-1.5">{{ f.code }}</td>
              <td class="px-2 py-1.5">{{ f.name }}</td>
            </tr>
            <tr v-if="!firmResults.length">
              <td colspan="2" class="px-2 py-6 text-center text-hint-c">查無資料</td>
            </tr>
            </tbody>
          </table>
        </div>
        <div v-if="firmTotalPages > 1" class="mt-2 flex items-center justify-center gap-2 text-xs text-muted-c">
          <button class="rounded border border-light-c px-2 py-1 disabled:opacity-40" :disabled="firmPage <= 1" @click="searchFirms(firmPage - 1)">上一頁</button>
          <span>第 {{ firmPage }} / {{ firmTotalPages }} 頁</span>
          <button class="rounded border border-light-c px-2 py-1 disabled:opacity-40" :disabled="firmPage >= firmTotalPages" @click="searchFirms(firmPage + 1)">下一頁</button>
        </div>
      </div>
    </div>

    <!-- 商品搜尋燈箱 -->
    <div v-if="showProductSearch" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-surface p-4">
        <div class="mb-2 flex items-center justify-between">
          <div class="text-sm font-bold text-base-c">
            選擇商品
            <span v-if="productFirmName" class="ml-2 text-xs font-normal text-hint-c">{{ productFirmName }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-0.5 rounded-lg border border-light-c p-0.5 text-xs">
              <button
                class="rounded px-2 py-0.5"
                :class="productViewMode === 'table' ? 'bg-surface2 font-medium text-base-c' : 'text-muted-c hover:bg-surface2'"
                @click="productViewMode = 'table'"
              >
                列表
              </button>
              <button
                class="rounded px-2 py-0.5"
                :class="productViewMode === 'card' ? 'bg-surface2 font-medium text-base-c' : 'text-muted-c hover:bg-surface2'"
                @click="productViewMode = 'card'"
              >
                卡片
              </button>
            </div>
            <button class="text-xs text-muted-c hover:underline" @click="showProductSearch = false">關閉</button>
          </div>
        </div>

        <div class="mb-2 space-y-2 rounded-lg border border-light-c bg-surface2 p-2 text-sm">
          <div class="flex flex-wrap items-center gap-2">
            <DcErpSavedRecordsInput
              v-model="productKeyword"
              storage-key="dc-erp-product-search-keyword-records"
              record-label="已儲存的關鍵字"
              placeholder="關鍵字"
              width-class="w-48 flex-1"
              @enter="searchProducts(1)"
            />
            <button class="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800" @click="searchProducts(1)">送出查詢</button>
            <button
              class="rounded border border-light-c px-2 py-1 text-xs text-muted-c hover:bg-surface"
              @click="productFilterExpanded = !productFilterExpanded"
            >
              {{ productFilterExpanded ? '收起進階篩選 ▲' : '進階篩選 ▼' }}
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label class="text-muted-c">規格單位：</label>
            <DcErpSavedRecordsInput
              v-model="productSpecUnitKeyword"
              storage-key="dc-erp-product-search-specunit-records"
              record-label="已儲存的規格單位"
              width-class="w-20"
              @enter="searchProducts(1)"
            />

            <label class="ml-2 text-muted-c">依所屬類別：</label>
            <select v-model="productClassFilter" class="rounded border border-light-c bg-surface px-2 py-1" @change="searchProducts(1)">
              <option value="">不拘</option>
              <option v-for="c in productClassOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <p v-if="productClassFilter" class="text-xs text-hint-c">
            選了類別之後，「送出查詢」會先試著用品項代號字首快速查詢（原網站實測部分比對可行），查回來的每一筆都還是用本地快取重新核對過才會列出；如果查不到查詢欄位或這個類別本地完全沒有代號，會自動退回逐頁掃描（較慢但一樣安全）。篩選依據是本地快取，要先在「進階品項管理」按過「設置所屬類別」才有資料。
          </p>

          <div v-show="productFilterExpanded" class="flex flex-wrap items-center gap-2 border-t border-light-c pt-2">
            <label class="text-muted-c">依欄位：</label>
            <select v-model="productWhSearch" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-if="!productWhSearchOptions.length" value="whatever">欄位不拘</option>
              <option v-for="opt in productWhSearchOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">資料來源：</label>
            <select v-model="productSourceType" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-if="!productSourceTypeOptions.length" value="0">所有商品規格</option>
              <option v-for="opt in productSourceTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">促銷檔期：</label>
            <select v-model="productSche" class="rounded border border-light-c bg-surface px-2 py-1">
              <option v-if="!productScheOptions.length" value="0">不拘</option>
              <option v-for="opt in productScheOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label class="ml-2 text-muted-c">對應貨號：</label>
            <input v-model="productCorrespondNoKeyword" type="text" class="w-24 rounded border border-light-c bg-surface px-2 py-1">
          </div>
        </div>

        <p v-if="productSearchError" class="mb-2 text-xs text-red-600">{{ productSearchError }}</p>
        <p v-if="productClassSearchCapped" class="mb-2 text-xs text-amber-500">
          已達搜尋上限（{{ MAX_CLASS_SEARCH_MATCHES }} 筆 / {{ MAX_CLASS_SEARCH_PAGES }} 頁），可能還有更多符合的品項沒列出，請加關鍵字縮小範圍再查一次。
        </p>
        <div class="flex-1 overflow-y-auto rounded border border-light-c">
          <p v-if="productClassSearching" class="p-4 text-sm text-hint-c">{{ productClassSearchProgress }}</p>
          <p v-else-if="productSearching" class="p-4 text-sm text-hint-c">搜尋中…</p>

          <!-- 卡片檢視 -->
          <div v-else-if="productViewMode === 'card'" class="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            <div
              v-for="p in filteredProductResults"
              :key="p.id"
              class="cursor-pointer overflow-hidden rounded-lg border hover:bg-surface2"
              :class="selectedProductIds.has(p.id) ? 'border-green-600 ring-1 ring-green-600' : 'border-light-c'"
              @click="toggleProductSelect(p.id)"
            >
              <div class="relative aspect-[4/3] bg-surface2">
                <img
                  v-if="productThumbUrl(p.code)"
                  :src="productThumbUrl(p.code)"
                  class="h-full w-full object-cover"
                  loading="lazy"
                >
                <span v-else class="flex h-full w-full items-center justify-center text-xs text-hint-c">無圖</span>
                <input
                  type="checkbox"
                  class="absolute left-1.5 top-1.5 h-4 w-4"
                  :checked="selectedProductIds.has(p.id)"
                  @click.stop="toggleProductSelect(p.id)"
                >
              </div>
              <div class="p-2 text-sm">
                <div class="truncate font-medium text-base-c" :title="p.name">{{ p.name }}</div>
                <div class="text-xs text-muted-c">{{ p.unit }}｜{{ p.price }}</div>
                <div v-if="productClassOf(p.code)" class="truncate text-xs text-hint-c" :title="productClassOf(p.code)">{{ productClassOf(p.code) }}</div>
              </div>
            </div>
            <p v-if="!filteredProductResults.length" class="col-span-full py-6 text-center text-hint-c">查無資料</p>
          </div>

          <!-- 列表檢視 -->
          <table v-else class="w-full text-sm">
            <thead>
            <tr class="border-b border-light-c bg-surface2 text-left text-muted-c">
              <th class="px-2 py-1.5"></th>
              <th class="px-2 py-1.5 text-center">圖</th>
              <th class="px-2 py-1.5">品項名稱</th>
              <th class="px-2 py-1.5">規格單位</th>
              <th class="px-2 py-1.5 text-right">商品價格</th>
              <th class="px-2 py-1.5">所屬類別</th>
            </tr>
            </thead>
            <tbody>
            <tr
              v-for="p in filteredProductResults"
              :key="p.id"
              class="cursor-pointer border-b border-light-c hover:bg-surface2"
              @click="toggleProductSelect(p.id)"
            >
              <td class="px-2 py-1.5"><input type="checkbox" :checked="selectedProductIds.has(p.id)" @click.stop="toggleProductSelect(p.id)"></td>
              <td class="px-2 py-1.5 text-center">
                <img
                  v-if="productThumbUrl(p.code)"
                  :src="productThumbUrl(p.code)"
                  class="mx-auto h-8 w-8 rounded object-cover"
                  loading="lazy"
                >
                <span v-else class="text-xs text-hint-c">-</span>
              </td>
              <td class="px-2 py-1.5">{{ p.name }}</td>
              <td class="px-2 py-1.5">{{ p.unit }}</td>
              <td class="px-2 py-1.5 text-right">{{ p.price }}</td>
              <td class="px-2 py-1.5 text-xs text-muted-c">{{ productClassOf(p.code) }}</td>
            </tr>
            <tr v-if="!filteredProductResults.length">
              <td colspan="6" class="px-2 py-6 text-center text-hint-c">查無資料</td>
            </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <div v-if="productTotalPages > 1" class="flex items-center gap-2 text-xs text-muted-c">
            <button class="rounded border border-light-c px-2 py-1 disabled:opacity-40" :disabled="productPage <= 1" @click="searchProducts(productPage - 1)">上一頁</button>
            <span>第 {{ productPage }} / {{ productTotalPages }} 頁</span>
            <button class="rounded border border-light-c px-2 py-1 disabled:opacity-40" :disabled="productPage >= productTotalPages" @click="searchProducts(productPage + 1)">下一頁</button>
          </div>
          <div v-else></div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-hint-c">已選 {{ selectedProductIds.size }} 項</span>
            <button class="rounded bg-green-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-800" @click="confirmProductSelection">
              確認選取
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 品項圖片預覽（點明細/商品搜尋的縮圖放大） -->
    <div
      v-if="previewUrl"
      class="fixed inset-0 z-[60] flex cursor-pointer items-center justify-center bg-black/85 p-4"
      @click="previewUrl = ''"
    >
      <img :src="previewUrl" class="max-h-full max-w-full rounded-xl object-contain shadow-2xl" decoding="async">
    </div>
  </div>
</template>
