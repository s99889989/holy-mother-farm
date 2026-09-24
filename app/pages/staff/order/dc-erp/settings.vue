<script setup>
  import { reactive, ref, computed, onMounted } from 'vue'

  // dc-erp「設定」頁——統一調整訂貨單/銷貨單/品項/進階品項管理四個列表頁
  // 的顯示方式（列表/卡片）跟每頁筆數，純前端 localStorage（key:
  // dc-erp-list-settings），不影響 COAERP 任何資料。四個列表頁自己不再有
  // 切換鈕，只在載入時讀這裡存的設定，要改都回這頁改。
  //
  // 「設置所屬類別」原本放在「進階品項管理」頁的批次工具區塊，搬過來這裡
  // 跟其他全域設定放一起，邏輯完全沒變（直打 Spring Boot 的
  // DcErpProductImageController，逐頁掃 /api/dc-erp/products 收集代號+
  // 所屬類別，分批 POST /sync-classes 寫進 product_images.yml）。
  //
  // 「自動化：簽核並轉銷＋列印下載」是新增區塊——針對設定的客戶，一次做完
  // 查未簽核訂貨單→簽核→轉銷→在銷貨單找對應單→下載 PDF（中一刀-半長）。
  // 邏輯在 server/utils/dc-erp/automation.ts。登入用 autoLogin.ts 的驗證碼
  // 樣板比對分類器自動完成（不用人工看圖輸入），帳密存在 Spring Boot（見
  // 下面「自動登入帳密」區塊），排程觸發是 Spring Boot 的 @Scheduled 每週一
  // 08:00 主動打 run-scheduled.post.ts，細節見各檔案開頭註解。
  definePageMeta({
    layout: 'staff',
    requiredPermission: 'order.dc-erp'
  })

  const LIST_SETTINGS_KEY = 'dc-erp-list-settings'
  const LISTS = [
    { key: 'salesOrders', label: '訂貨單' },
    { key: 'salesSlips', label: '銷貨單' },
    { key: 'products', label: '品項' },
    { key: 'productImages', label: '進階品項管理' },
    { key: 'orderDetail', label: '訂單明細（訂貨單/銷貨單編輯頁的明細 Grid）', hasPagesize: false, defaultViewMode: 'card' },
    { key: 'productSearch', label: '新增商品（訂貨單/銷貨單「新增商品」搜尋結果）', hasPagesize: false }
  ]
  const DEFAULTS = { pagesize: 20, viewMode: 'table' }

  const settings = reactive(
    Object.fromEntries(LISTS.map(({ key, defaultViewMode }) => [key, { ...DEFAULTS, ...(defaultViewMode ? { viewMode: defaultViewMode } : {}) }]))
  )

  function loadSettings() {
    try {
      const raw = window.localStorage.getItem(LIST_SETTINGS_KEY)
      const all = raw ? JSON.parse(raw) : {}
      for (const { key, defaultViewMode } of LISTS) {
        const base = { ...DEFAULTS, ...(defaultViewMode ? { viewMode: defaultViewMode } : {}) }
        settings[key] = { ...base, ...(all[key] || {}) }
      }
    } catch {
      // 讀不到就維持預設值
    }
  }

  function persist() {
    window.localStorage.setItem(LIST_SETTINGS_KEY, JSON.stringify(settings))
  }

  const toast = reactive({ show: false, message: '' })
  function showToast(message) {
    toast.message = message
    toast.show = true
    setTimeout(() => { toast.show = false }, 2000)
  }

  function updateSetting(key, patch) {
    Object.assign(settings[key], patch)
    persist()
    showToast('已儲存，下次打開該頁面就會套用')
  }

  function onPagesizeChange(key, value) {
    const n = Math.min(200, Math.max(1, parseInt(value, 10) || DEFAULTS.pagesize))
    updateSetting(key, { pagesize: n })
  }

  // ── 設置所屬類別（原本在「進階品項管理」，邏輯不變）────────────────
  const commonStore = useCommonStore()
  const BASE = commonStore.data.main_url + '/holy/dc-erp/product-image'

  const fetchWithTimeout = (url, options = {}, ms = 8000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
  }

  const syncingClass = ref(false)
  const syncClassProgress = ref('')
  const lastSyncedAt = ref('')

  async function loadLastSynced() {
    try {
      const res = await fetchWithTimeout(`${BASE}/last-synced`)
      const data = await res.json()
      lastSyncedAt.value = data.lastSyncedAt || ''
    } catch {
      lastSyncedAt.value = ''
    }
  }
  const lastSyncedDisplay = computed(() => {
    if (!lastSyncedAt.value) return '尚未同步過'
    const d = new Date(lastSyncedAt.value)
    return isNaN(d.getTime()) ? '尚未同步過' : d.toLocaleString('zh-TW', { hour12: false })
  })

  async function syncAllProductClasses() {
    if (syncingClass.value) return
    if (!confirm('會查詢 COAERP 全部品項並把「所屬類別」存到本地設定檔，品項數量較多（4000+ 筆）可能需要一點時間，確定要開始嗎？')) return

    syncingClass.value = true
    syncClassProgress.value = '查詢頁數中…'
    const SYNC_PAGESIZE = 200
    const baseQuery = { whSearch: 'whatever', keyword: '', selectDisable: 'whatever', pagesize: SYNC_PAGESIZE }

    try {
      const first = await $fetch('/api/dc-erp/products', { query: { page: 1, ...baseQuery } })
      const totalSyncPages = first.totalPages || 1
      const collected = first.items
        .filter(it => it.code)
        .map(it => ({ code: it.code, productClass: it.productClass || '' }))

      for (let p = 2; p <= totalSyncPages; p++) {
        syncClassProgress.value = `查詢中（${p} / ${totalSyncPages} 頁）…`
        const data = await $fetch('/api/dc-erp/products', { query: { page: p, ...baseQuery } })
        collected.push(...data.items.filter(it => it.code).map(it => ({ code: it.code, productClass: it.productClass || '' })))
      }

      const CHUNK = 500
      let updated = 0
      for (let i = 0; i < collected.length; i += CHUNK) {
        syncClassProgress.value = `寫入中（${Math.min(i + CHUNK, collected.length)} / ${collected.length}）…`
        const chunk = collected.slice(i, i + CHUNK)
        const res = await fetchWithTimeout(
          `${BASE}/sync-classes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=UTF-8' },
            body: JSON.stringify(chunk)
          },
          20000
        )
        const result = await res.json()
        updated += result.updated || 0
      }

      showToast(`已設定 ${updated.toLocaleString()} 筆品項的所屬類別`)
      await loadLastSynced()
    } catch (e) {
      console.error(e)
      showToast('設置失敗，請稍後再試')
    } finally {
      syncingClass.value = false
      syncClassProgress.value = ''
    }
  }

  // ── 自動登入帳密 ─────────────────────────────────────────────────
  const credentialsInfo = ref({ source: 'none', account: '' })
  const credentialsAccount = ref('')
  const credentialsPassword = ref('')
  const credentialsSaving = ref(false)

  async function loadCredentialsInfo() {
    try {
      credentialsInfo.value = await $fetch('/api/dc-erp/automation/credentials')
      credentialsAccount.value = credentialsInfo.value.account || ''
    } catch {
      // 讀不到就先當未設定，不擋頁面其他功能
    }
  }

  async function handleSaveCredentials() {
    if (!credentialsAccount.value.trim()) {
      showToast('請填帳號')
      return
    }
    credentialsSaving.value = true
    try {
      await $fetch('/api/dc-erp/automation/credentials', {
        method: 'POST',
        body: { account: credentialsAccount.value.trim(), password: credentialsPassword.value }
      })
      credentialsPassword.value = ''
      await loadCredentialsInfo()
      showToast('帳密已儲存')
    } catch (e) {
      showToast(e?.data?.statusMessage || '帳密儲存失敗，請稍後再試')
    } finally {
      credentialsSaving.value = false
    }
  }

  // ── 列印方向設定 ─────────────────────────────────────────────────
  // 「新中一刀」（EPSON LQ-310 點陣機）自動判斷方向實測會錯，這裡切換後
  // Agent 下次列印會直接讀最新值，不用重新部署 Agent。
  const printOrientation = ref('auto')
  const printOrientationSaving = ref(false)

  async function loadPrintOrientation() {
    try {
      const data = await $fetch('/api/dc-erp/automation/print-settings')
      printOrientation.value = data.orientation || 'auto'
    } catch {
      // 讀不到就先當 auto，不擋頁面其他功能
    }
  }

  async function handlePrintOrientationChange() {
    printOrientationSaving.value = true
    try {
      await $fetch('/api/dc-erp/automation/print-settings', {
        method: 'POST',
        body: { orientation: printOrientation.value }
      })
      showToast('列印方向已儲存')
    } catch {
      showToast('儲存失敗，請稍後再試')
    } finally {
      printOrientationSaving.value = false
    }
  }

  // ── 排程設定 ─────────────────────────────────────────────────────
  // 星期幾／幾點自動觸發一次 run-scheduled，實際存在 Spring Boot，
  // DcErpAutomationScheduler 每分鐘輪詢這份設定，改了立刻生效，不用重新
  // 部署。星期對應 java.time.DayOfWeek 的英文名稱（MONDAY...SUNDAY）。
  const WEEKDAY_OPTIONS = [
    { value: 'MONDAY', label: '星期一' },
    { value: 'TUESDAY', label: '星期二' },
    { value: 'WEDNESDAY', label: '星期三' },
    { value: 'THURSDAY', label: '星期四' },
    { value: 'FRIDAY', label: '星期五' },
    { value: 'SATURDAY', label: '星期六' },
    { value: 'SUNDAY', label: '星期日' }
  ]
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h)
  const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, m) => m)

  const scheduleEnabled = ref(true)
  const scheduleWeekday = ref('MONDAY')
  const scheduleHour = ref(9)
  const scheduleMinute = ref(0)
  const scheduleSaving = ref(false)

  async function loadScheduleSettings() {
    try {
      const data = await $fetch('/api/dc-erp/automation/schedule-settings')
      scheduleEnabled.value = data.enabled !== false
      scheduleWeekday.value = data.weekday || 'MONDAY'
      scheduleHour.value = Number.isFinite(data.hour) ? data.hour : 9
      scheduleMinute.value = Number.isFinite(data.minute) ? data.minute : 0
    } catch {
      // 讀不到就先當預設值，不擋頁面其他功能
    }
  }

  async function handleScheduleChange() {
    scheduleSaving.value = true
    try {
      await $fetch('/api/dc-erp/automation/schedule-settings', {
        method: 'POST',
        body: {
          enabled: scheduleEnabled.value,
          weekday: scheduleWeekday.value,
          hour: scheduleHour.value,
          minute: scheduleMinute.value
        }
      })
      showToast('排程設定已儲存')
    } catch {
      showToast('儲存失敗，請稍後再試')
    } finally {
      scheduleSaving.value = false
    }
  }

  const resettingScheduleFlag = ref(false)

  async function handleResetScheduleFlag() {
    if (!confirm('清除今天的排程觸發紀錄，讓今天可以再測一次排程，確定嗎？')) return
    resettingScheduleFlag.value = true
    try {
      await $fetch('/api/dc-erp/automation/reset-schedule-flag', { method: 'POST' })
      showToast('已清除，今天可以再測一次排程了')
    } catch {
      showToast('清除失敗，請稍後再試')
    } finally {
      resettingScheduleFlag.value = false
    }
  }

  // ── 執行紀錄 ─────────────────────────────────────────────────────
  const automationLog = ref([])
  const automationLogLoading = ref(false)

  async function loadAutomationLog() {
    automationLogLoading.value = true
    try {
      automationLog.value = await $fetch('/api/dc-erp/automation/log', { query: { limit: 50 } })
    } catch {
      // 讀不到就先維持空清單，不擋頁面其他功能
    } finally {
      automationLogLoading.value = false
    }
  }

  function formatLogTime(iso) {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? iso : d.toLocaleString('zh-TW', { hour12: false })
  }

  // ── 自動化：簽核並轉銷＋列印下載 ─────────────────────────────────
  const automationCustomers = ref([])
  const newCustomerCode = ref('')
  const newCustomerLabel = ref('')
  const newCustomerKeywords = ref([]) // 建立客戶前，先在這裡一個一個加關鍵字
  const newCustomerKeywordInput = ref('')
  const automationRunning = ref('') // 目前執行中的客戶代號，'' = 無
  const automationResults = reactive({}) // firmCode -> 這次執行/預覽的結果
  const automationError = reactive({}) // firmCode -> 錯誤訊息
  const customerKeywordInputs = reactive({}) // customer.id -> 目前正在輸入、還沒加進去的關鍵字

  function parseKeywords(remarkKeyword) {
    return (remarkKeyword || '').split(/[,，]/).map((k) => k.trim()).filter(Boolean)
  }

  async function loadAutomationCustomers() {
    try {
      const data = await $fetch('/api/dc-erp/automation/config')
      automationCustomers.value = data.customers || []
    } catch {
      // 讀不到就先當空清單，不擋頁面其他功能
    }
  }

  async function saveAutomationCustomers() {
    try {
      const data = await $fetch('/api/dc-erp/automation/config', {
        method: 'POST',
        body: { customers: automationCustomers.value }
      })
      automationCustomers.value = data.customers
    } catch {
      showToast('客戶清單儲存失敗，請稍後再試')
    }
  }

  function addNewCustomerKeyword() {
    const keyword = newCustomerKeywordInput.value.trim()
    if (!keyword || newCustomerKeywords.value.includes(keyword)) {
      newCustomerKeywordInput.value = ''
      return
    }
    newCustomerKeywords.value.push(keyword)
    newCustomerKeywordInput.value = ''
  }

  function removeNewCustomerKeyword(index) {
    newCustomerKeywords.value.splice(index, 1)
  }

  function addAutomationCustomer() {
    const firmCode = newCustomerCode.value.trim()
    if (!firmCode) return
    automationCustomers.value.push({
      id: crypto.randomUUID(),
      firmCode,
      label: newCustomerLabel.value.trim() || firmCode,
      enabled: true,
      remarkKeyword: newCustomerKeywords.value.join(','),
      printEnabled: true
    })
    newCustomerCode.value = ''
    newCustomerLabel.value = ''
    newCustomerKeywords.value = []
    newCustomerKeywordInput.value = ''
    saveAutomationCustomers()
  }

  function removeAutomationCustomer(id) {
    automationCustomers.value = automationCustomers.value.filter((c) => c.id !== id)
    saveAutomationCustomers()
  }

  function addCustomerKeyword(customer) {
    const keyword = (customerKeywordInputs[customer.id] || '').trim()
    customerKeywordInputs[customer.id] = ''
    if (!keyword) return
    const keywords = parseKeywords(customer.remarkKeyword)
    if (keywords.includes(keyword)) return
    keywords.push(keyword)
    customer.remarkKeyword = keywords.join(',')
    saveAutomationCustomers()
  }

  function removeCustomerKeyword(customer, keyword) {
    const keywords = parseKeywords(customer.remarkKeyword).filter((k) => k !== keyword)
    customer.remarkKeyword = keywords.join(',')
    saveAutomationCustomers()
  }

  function remarkKeywordSummary(remarkKeyword) {
    const keywords = parseKeywords(remarkKeyword)
    if (!keywords.length) return '目前不篩備註，整個客戶代號底下的未簽核訂單都會處理'
    if (keywords.length === 1) return `只處理備註包含「${keywords[0]}」的訂單`
    return `只處理備註包含「${keywords.join('」或「')}」其中之一的訂單`
  }

  async function runAutomation(customer, dryRun) {
    automationRunning.value = customer.firmCode
    automationError[customer.firmCode] = ''
    try {
      const data = await $fetch('/api/dc-erp/automation/run-customer', {
        method: 'POST',
        body: { firmCode: customer.firmCode, dryRun, remarkKeyword: customer.remarkKeyword, printEnabled: customer.printEnabled, label: customer.label }
      })
      automationResults[customer.firmCode] = data
    } catch (e) {
      automationError[customer.firmCode] = e?.data?.statusMessage || e?.message || '執行失敗，請稍後再試'
    } finally {
      automationRunning.value = ''
      loadAutomationLog() // 跑完順便刷新一下執行紀錄，不用等下次進頁才看到
    }
  }

  // 手動測試/重新列印：不重新產生 PDF，直接把已經存好的那份再送一次列印
  // 指令，方便反覆測試印表機那端有沒有反應（見印表機成功回應只代表送進
  // Windows 佇列沒有丟例外，不代表紙真的印出來了，需要肉眼到印表機那邊確認）。
  const reprinting = ref('') // 正在重印中的 fileName，'' = 無
  const reprintResults = reactive({}) // fileName -> { ok, error }

  async function handleReprint(fileName) {
    reprinting.value = fileName
    try {
      const data = await $fetch('/api/dc-erp/automation/print', {
        method: 'POST',
        body: { fileName }
      })
      reprintResults[fileName] = { ok: !!data.printOk, error: data.printError || '' }
    } catch (e) {
      reprintResults[fileName] = { ok: false, error: e?.data?.statusMessage || e?.message || '列印請求失敗' }
    } finally {
      reprinting.value = ''
    }
  }

  // ── 登入驗證碼自動辨識（樣板庫）─────────────────────────────────
  // 這份庫是「猜對／真的登入成功時才會長大」，不是一般 OCR，細節見
  // server/utils/dc-erp/captchaOCR.ts、autoLogin.ts 開頭註解。這裡只顯示
  // 現況（總數＋各數字分布），跟提供「匯入本機樣板庫」的功能——你在自己
  // 電腦用 bootstrap-captcha-ocr.mjs 長出來的 captcha-template-library.json
  // 選檔案上傳，會合併進伺服器這份（不會覆蓋掉伺服器已經長出來的樣本）。
  const captchaLibraryStats = ref(null) // { total, counts }
  const captchaImporting = ref(false)
  const captchaImportMessage = ref('')

  async function loadCaptchaLibraryStats() {
    try {
      captchaLibraryStats.value = await $fetch('/api/dc-erp/automation/captcha-library')
    } catch {
      // 讀不到就不顯示這塊，不擋頁面其他功能
    }
  }

  const DIGIT_ORDER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

  async function handleCaptchaLibraryFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    captchaImporting.value = true
    captchaImportMessage.value = ''
    try {
      const text = await file.text()
      const entries = JSON.parse(text)
      const data = await $fetch('/api/dc-erp/automation/captcha-library', {
        method: 'POST',
        body: { entries }
      })
      captchaLibraryStats.value = { total: data.total, counts: data.counts }
      captchaImportMessage.value = `已匯入 ${data.imported} 筆，樣板庫現在共 ${data.total} 筆`
    } catch (e) {
      captchaImportMessage.value = e?.data?.statusMessage || '匯入失敗，請確認檔案格式（要是 bootstrap-captcha-ocr.mjs 產生的 captcha-template-library.json）'
    } finally {
      captchaImporting.value = false
      event.target.value = ''
    }
  }

  onMounted(() => {
    loadSettings()
    loadLastSynced()
    loadAutomationCustomers()
    loadCaptchaLibraryStats()
    loadCredentialsInfo()
    loadPrintOrientation()
    loadScheduleSettings()
    loadAutomationLog()
  })
</script>

<template>
  <div class="p-4">
    <DcErpShell>
      <div class="space-y-4 p-4">
        <!-- 列表顯示設定 -->
        <div class="rounded-xl border border-light-c bg-surface p-4 text-sm">
          <div class="mb-1 font-medium text-base-c">列表顯示設定</div>
          <p class="mb-3 text-xs text-hint-c">
            只影響這台瀏覽器上這幾個頁面的顯示方式（部分有每頁筆數可調），純前端記憶，不會送到伺服器，不影響其他人。
          </p>
          <div class="space-y-3">
            <div
              v-for="list in LISTS"
              :key="list.key"
              class="flex flex-wrap items-center gap-3 border-t border-light-c pt-3 first:border-t-0 first:pt-0"
            >
              <span class="w-28 shrink-0 font-medium text-base-c">{{ list.label }}</span>

              <label class="text-muted-c">顯示方式：</label>
              <select
                :value="settings[list.key].viewMode"
                class="rounded border border-light-c bg-surface px-2 py-1"
                @change="updateSetting(list.key, { viewMode: $event.target.value })"
              >
                <option value="table">列表</option>
                <option value="card">卡片</option>
              </select>

              <template v-if="list.hasPagesize !== false">
                <label class="ml-2 text-muted-c">每頁筆數：</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  :value="settings[list.key].pagesize"
                  class="w-20 rounded border border-light-c bg-surface px-2 py-1"
                  @change="onPagesizeChange(list.key, $event.target.value)"
                >
              </template>
            </div>
          </div>
        </div>

        <!-- 設置所屬類別 -->
        <div class="rounded-xl border border-light-c bg-surface p-4 text-sm">
          <div class="mb-1 font-medium text-base-c">
            設置所屬類別
            <span class="ml-2 text-xs font-normal text-hint-c">（上次同步：{{ lastSyncedDisplay }}）</span>
          </div>
          <button
            class="mt-2 rounded bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
            :disabled="syncingClass"
            @click="syncAllProductClasses"
          >
            {{ syncingClass ? syncClassProgress : '設置所屬類別' }}
          </button>
          <p class="mt-2 text-xs text-hint-c">
            會查詢 COAERP 全部品項（依總筆數自動分頁抓取），把每筆的「所屬類別」存進本地設定檔（跟圖片綁定同一份 product_images.yml，見「進階品項管理」）。只是把類別資料快取起來，不會改動 COAERP 任何資料，也不會動到已經上傳的圖片。COAERP 的品項偶爾會新增/調整類別，這份快取不會自動更新，建議隔一段時間（例如每次大量新增品項後）手動按一次。
          </p>
        </div>

        <!-- 自動化：簽核並轉銷＋列印下載 -->
        <div class="rounded-xl border border-light-c bg-surface p-4 text-sm">
          <div class="mb-1 font-medium text-base-c">自動化：簽核並轉銷＋列印下載</div>
          <p class="mb-3 text-xs text-hint-c">
            針對下面設定的客戶，一次做完「查未簽核訂貨單 → 簽核 → 轉銷 → 在銷貨單找對應單 → 下載 PDF（中一刀-半長）」，只處理交貨日期是今天或之後的單，過去日期的舊單不會被自動處理。登入用驗證碼樣板比對分類器自動完成，不用人工看圖輸入；排程時間見下面「排程」卡片。「實際列印」欄位是「已送出給印表機、沒有立即出錯」，不是「確認紙真的印出來了」——建議偶爾實際去印表機那邊看一眼。
          </p>

          <!-- 自動登入帳密 -->
          <div class="mb-3 rounded-lg border border-light-c p-3">
            <div class="mb-1 text-xs font-medium text-base-c">自動登入帳密</div>
            <p v-if="credentialsInfo.source === 'env'" class="mb-2 text-xs text-muted-c">
              目前使用伺服器環境變數（<code>DC_ERP_AUTO_ACCOUNT</code>）——帳號：{{ credentialsInfo.account }}。環境變數優先於下面表單設定的帳密，要改用這裡設定的帳密，需要先把環境變數移除。
            </p>
            <p v-else-if="credentialsInfo.source === 'stored'" class="mb-2 text-xs text-muted-c">
              目前使用下面設定的帳號：{{ credentialsInfo.account }}
            </p>
            <p v-else class="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
              尚未設定自動登入帳密——「立即執行」在瀏覽器沒有登入 session 時會失敗，排程也不會動。請在下面設定，或改用伺服器環境變數 <code>DC_ERP_AUTO_ACCOUNT</code> / <code>DC_ERP_AUTO_PASSWORD</code>。
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="credentialsAccount"
                type="text"
                placeholder="COAERP 登入帳號"
                class="w-40 rounded border border-light-c bg-surface px-2 py-1 text-xs"
              >
              <input
                v-model="credentialsPassword"
                type="password"
                placeholder="密碼（留空 = 不變更）"
                class="w-48 rounded border border-light-c bg-surface px-2 py-1 text-xs"
              >
              <button
                class="rounded bg-accent-solid px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                :disabled="credentialsSaving"
                @click="handleSaveCredentials"
              >
                {{ credentialsSaving ? '儲存中…' : '儲存帳密' }}
              </button>
            </div>
            <p class="mt-1 text-xs text-hint-c">密碼存在 Spring Boot（明文），不會顯示在畫面上；只改帳號不想重打密碼的話，密碼欄留空即可。</p>
          </div>

          <!-- 列印方向設定 -->
          <div class="mb-3 rounded-lg border border-light-c p-3">
            <div class="mb-1 text-xs font-medium text-base-c">列印方向（新中一刀）</div>
            <p class="mb-2 text-xs text-hint-c">
              「新中一刀」是 EPSON LQ-310 點陣式印表機，自動判斷方向不一定準。改這裡會立刻生效，不用重新部署 Agent，測試方向錯了就直接切換再重印一次。
            </p>
            <select
              v-model="printOrientation"
              class="rounded border border-light-c bg-surface px-2 py-1 text-xs"
              :disabled="printOrientationSaving"
              @change="handlePrintOrientationChange"
            >
              <option value="auto">自動判斷（照 PDF 頁面寬高）</option>
              <option value="landscape">強制橫印</option>
              <option value="portrait">強制直印</option>
            </select>
          </div>

          <!-- 排程設定 -->
          <div class="mb-3 rounded-lg border border-light-c p-3">
            <div class="mb-1 text-xs font-medium text-base-c">排程</div>
            <p class="mb-2 text-xs text-hint-c">
              每週固定時間自動觸發一次，對下面啟用的客戶逐一跑「簽核＋轉銷＋下載PDF（＋列印，看各客戶自己的開關）」。需要先在上面設定自動登入帳密，Spring Boot 那邊也要設定
              <code>dc-erp.automation.target-url</code> / <code>dc-erp.automation.secret</code>，這裡改的時間才會真的被觸發到。
            </p>
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <label class="flex items-center gap-1">
                <input
                  v-model="scheduleEnabled"
                  type="checkbox"
                  :disabled="scheduleSaving"
                  @change="handleScheduleChange"
                >
                <span class="text-muted-c">啟用排程</span>
              </label>
              <span class="text-muted-c">每</span>
              <select
                v-model="scheduleWeekday"
                class="rounded border border-light-c bg-surface px-2 py-1"
                :disabled="scheduleSaving"
                @change="handleScheduleChange"
              >
                <option v-for="w in WEEKDAY_OPTIONS" :key="w.value" :value="w.value">{{ w.label }}</option>
              </select>
            </div>
            <div class="mt-2">
              <div class="mb-1 text-xs text-muted-c">執行時間（24 小時制）</div>
              <div class="flex items-center gap-2">
                <select
                  v-model.number="scheduleHour"
                  class="rounded border border-light-c bg-surface px-2 py-1 text-xs"
                  :disabled="scheduleSaving"
                  @change="handleScheduleChange"
                >
                  <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ String(h).padStart(2, '0') }}</option>
                </select>
                <span class="text-muted-c">：</span>
                <select
                  v-model.number="scheduleMinute"
                  class="rounded border border-light-c bg-surface px-2 py-1 text-xs"
                  :disabled="scheduleSaving"
                  @change="handleScheduleChange"
                >
                  <option v-for="m in MINUTE_OPTIONS" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
                </select>
              </div>
            </div>

            <div class="mt-3 border-t border-light-c pt-3">
              <button
                class="rounded border border-light-c px-2 py-1 text-xs hover:bg-surface2 disabled:opacity-50"
                :disabled="resettingScheduleFlag"
                @click="handleResetScheduleFlag"
              >
                {{ resettingScheduleFlag ? '清除中…' : '清除今日排程觸發紀錄（測試用）' }}
              </button>
              <p class="mt-1 text-xs text-hint-c">
                排程一天只會成功觸發一次；測試時把上面時間改成幾分鐘後、按這個按鈕清掉「今天已觸發」的紀錄，就能同一天重複測試，不用等到明天。
              </p>
            </div>
          </div>

          <!-- 新增客戶 -->
          <div class="mb-3 border-b border-light-c pb-3">
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="newCustomerCode"
                type="text"
                placeholder="客戶代號（例如 127）"
                class="w-40 rounded border border-light-c bg-surface px-2 py-1"
              >
              <input
                v-model="newCustomerLabel"
                type="text"
                placeholder="備註名稱（選填）"
                class="w-40 rounded border border-light-c bg-surface px-2 py-1"
              >
              <button
                class="rounded bg-accent-solid px-3 py-1.5 text-xs font-medium text-white"
                @click="addAutomationCustomer"
              >
                新增客戶
              </button>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span class="text-xs text-muted-c">備註關鍵字篩選（選填，一次加一個）：</span>
              <span
                v-for="(kw, i) in newCustomerKeywords"
                :key="kw"
                class="flex items-center gap-1 rounded-full bg-surface2 px-2 py-0.5 text-xs text-base-c"
              >
                {{ kw }}
                <button class="text-hint-c hover:text-red-600" @click="removeNewCustomerKeyword(i)">✕</button>
              </span>
              <input
                v-model="newCustomerKeywordInput"
                type="text"
                placeholder="例如「藥草」"
                class="w-32 rounded border border-light-c bg-surface px-2 py-1 text-xs"
                @keyup.enter="addNewCustomerKeyword"
              >
              <button
                class="rounded border border-light-c px-2 py-1 text-xs hover:bg-surface2"
                @click="addNewCustomerKeyword"
              >
                + 加關鍵字
              </button>
            </div>
          </div>
          <p class="mb-3 text-xs text-hint-c">
            同一個客戶代號底下如果混著不同種類的訂單（例如同一個客戶代號下有藥草／豆腐／麵包等備註不同的單），設「備註關鍵字」只會處理備註裡有出現這些字其中之一的訂單——可以用「+ 加關鍵字」按鈕一個一個加（例如加「藥草」再加「茶葉」，代表備註含其中一個都算）；不加任何關鍵字就跟以前一樣，整個客戶代號底下的未簽核訂單都處理。如果同一個客戶代號要分成好幾組、各自獨立簽核/轉銷/列印，不要把好幾組關鍵字擠在同一筆——同一個客戶代號可以新增好幾筆客戶（備註名稱取不同名字），各自加各自的關鍵字，彼此互不影響。
          </p>

          <p v-if="!automationCustomers.length" class="text-xs text-hint-c">尚未設定任何客戶。</p>

          <div
            v-for="customer in automationCustomers"
            :key="customer.id"
            class="mb-3 rounded-lg border border-light-c p-3 last:mb-0"
          >
            <div class="flex flex-wrap items-center gap-2">
              <label class="flex items-center gap-1">
                <input
                  v-model="customer.enabled"
                  type="checkbox"
                  @change="saveAutomationCustomers"
                >
                <span class="text-xs text-muted-c">啟用</span>
              </label>
              <label class="flex items-center gap-1">
                <input
                  v-model="customer.printEnabled"
                  type="checkbox"
                  @change="saveAutomationCustomers"
                >
                <span class="text-xs text-muted-c">同時列印（新中一刀）</span>
              </label>
              <span class="font-medium text-base-c">{{ customer.label }}</span>
              <span class="text-xs text-hint-c">（客戶代號：{{ customer.firmCode }}）</span>
              <button
                class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                @click="removeAutomationCustomer(customer.id)"
              >
                刪除
              </button>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span class="text-muted-c">備註關鍵字篩選：</span>
              <span
                v-for="kw in parseKeywords(customer.remarkKeyword)"
                :key="kw"
                class="flex items-center gap-1 rounded-full bg-surface2 px-2 py-0.5 text-xs text-base-c"
              >
                {{ kw }}
                <button class="text-hint-c hover:text-red-600" @click="removeCustomerKeyword(customer, kw)">✕</button>
              </span>
              <input
                v-model="customerKeywordInputs[customer.id]"
                type="text"
                placeholder="例如「藥草」"
                class="w-28 rounded border border-light-c bg-surface px-2 py-1"
                @keyup.enter="addCustomerKeyword(customer)"
              >
              <button
                class="rounded border border-light-c px-2 py-1 hover:bg-surface2"
                @click="addCustomerKeyword(customer)"
              >
                + 加關鍵字
              </button>
            </div>
            <p class="mt-1 text-xs text-hint-c">
              {{ remarkKeywordSummary(customer.remarkKeyword) }}
            </p>

            <div class="mt-2 flex flex-wrap gap-2">
              <button
                class="rounded border border-light-c px-3 py-1.5 text-xs font-medium hover:bg-surface2 disabled:opacity-50"
                :disabled="automationRunning === customer.firmCode"
                @click="runAutomation(customer, true)"
              >
                {{ automationRunning === customer.firmCode ? '查詢中…' : '預覽（只查未簽核，不動作）' }}
              </button>
              <button
                class="rounded bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                :disabled="automationRunning === customer.firmCode"
                @click="runAutomation(customer, false)"
              >
                {{ automationRunning === customer.firmCode ? '執行中…' : '立即執行（簽核＋轉銷＋下載PDF）' }}
              </button>
            </div>

            <p v-if="automationError[customer.firmCode]" class="mt-2 text-xs text-red-600">
              {{ automationError[customer.firmCode] }}
            </p>

            <!-- 預覽結果 -->
            <div v-if="automationResults[customer.firmCode]?.dryRun" class="mt-2 text-xs">
              <p class="text-muted-c">目前未簽核：{{ automationResults[customer.firmCode].matchedCount }} 張</p>
              <ul v-if="automationResults[customer.firmCode].matchedCount" class="mt-1 space-y-0.5">
                <li v-for="o in automationResults[customer.firmCode].orders" :key="o.code">
                  {{ o.code }}（交貨日期 {{ o.deliveryDate }}，金額 {{ o.total }}，備註：{{ o.remark || '（無）' }}）
                </li>
              </ul>
            </div>

            <!-- 執行結果 -->
            <table
              v-if="automationResults[customer.firmCode] && !automationResults[customer.firmCode].dryRun && automationResults[customer.firmCode].results.length"
              class="mt-2 w-full text-xs"
            >
              <thead>
              <tr class="border-b border-light-c text-left text-hint-c">
                <th class="py-1 pr-2">訂貨單號</th>
                <th class="py-1 pr-2">簽核</th>
                <th class="py-1 pr-2">轉銷</th>
                <th class="py-1 pr-2">對應銷貨單</th>
                <th class="py-1 pr-2">PDF</th>
                <th class="py-1 pr-2">實際列印</th>
                <th class="py-1 pr-2">備註</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="r in automationResults[customer.firmCode].results" :key="r.code" class="border-b border-light-c/50">
                <td class="py-1 pr-2">{{ r.code }}</td>
                <td class="py-1 pr-2">{{ r.signOk ? '✅' : '—' }}</td>
                <td class="py-1 pr-2">{{ r.transferOk ? '✅' : '—' }}</td>
                <td class="py-1 pr-2">
                  {{ r.matchedSlipCode || '—' }}
                  <span v-if="r.slipSignOk" class="ml-1 text-green-600">（已簽核）</span>
                  <span v-else-if="r.slipSignError" class="ml-1 text-red-600">（簽核失敗）</span>
                </td>
                <td class="py-1 pr-2">
                  <a v-if="r.pdfOk" :href="r.url" target="_blank" class="text-accent-solid hover:underline">下載</a>
                  <button
                    v-if="r.pdfOk"
                    class="ml-2 rounded border border-light-c px-2 py-0.5 hover:bg-surface2 disabled:opacity-50"
                    :disabled="reprinting === r.fileName"
                    @click="handleReprint(r.fileName)"
                  >
                    {{ reprinting === r.fileName ? '列印中…' : '列印' }}
                  </button>
                  <span v-if="!r.pdfOk">—</span>
                  <span v-if="reprintResults[r.fileName]" class="ml-1" :class="reprintResults[r.fileName].ok ? 'text-green-600' : 'text-red-600'">
                      {{ reprintResults[r.fileName].ok ? '（已送進印表機佇列，請到印表機確認）' : `（列印失敗：${reprintResults[r.fileName].error}）` }}
                    </span>
                </td>
                <td class="py-1 pr-2">
                  <span v-if="!customer.printEnabled">（未開啟）</span>
                  <span v-else-if="r.printOk">✅</span>
                  <span v-else-if="r.pdfOk">❌</span>
                  <span v-else>—</span>
                </td>
                <td class="py-1 pr-2 text-hint-c">{{ r.transferError || r.pdfError || r.printError || r.slipSignError }}</td>
              </tr>
              </tbody>
            </table>
            <p
              v-else-if="automationResults[customer.firmCode] && !automationResults[customer.firmCode].dryRun"
              class="mt-2 text-xs text-hint-c"
            >
              目前沒有未簽核的訂貨單，沒有東西要處理。
            </p>
          </div>
        </div>

        <!-- 執行紀錄 -->
        <div class="rounded-xl border border-light-c bg-surface p-4 text-sm">
          <div class="mb-1 flex items-center gap-2">
            <span class="font-medium text-base-c">執行紀錄</span>
            <button
              class="ml-auto rounded border border-light-c px-2 py-1 text-xs hover:bg-surface2 disabled:opacity-50"
              :disabled="automationLogLoading"
              @click="loadAutomationLog"
            >
              {{ automationLogLoading ? '讀取中…' : '重新整理' }}
            </button>
          </div>
          <p class="mb-2 text-xs text-hint-c">
            手動「立即執行」跟排程觸發都會記一筆，最新的在最上面——排程半夜自己跑完，隔天可以直接來這裡看有沒有出錯，不用等出貨出狀況才回頭查。只留摘要數字，完整明細要看的話，手動觸發的當下上面就看得到。
          </p>
          <p v-if="!automationLog.length" class="text-xs text-hint-c">目前沒有執行紀錄。</p>
          <table v-else class="w-full text-xs">
            <thead>
            <tr class="border-b border-light-c text-left text-hint-c">
              <th class="py-1 pr-2">時間</th>
              <th class="py-1 pr-2">來源</th>
              <th class="py-1 pr-2">客戶</th>
              <th class="py-1 pr-2">配對</th>
              <th class="py-1 pr-2">簽核</th>
              <th class="py-1 pr-2">轉銷</th>
              <th class="py-1 pr-2">PDF</th>
              <th class="py-1 pr-2">列印</th>
              <th class="py-1 pr-2">錯誤</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(entry, i) in automationLog" :key="i" class="border-b border-light-c/50">
              <td class="py-1 pr-2 whitespace-nowrap">{{ formatLogTime(entry.timestamp) }}</td>
              <td class="py-1 pr-2">{{ entry.source === 'scheduled' ? '排程' : '手動' }}</td>
              <td class="py-1 pr-2">
                {{ entry.label }}
                <span v-if="entry.dryRun" class="text-hint-c">（預覽）</span>
              </td>
              <td class="py-1 pr-2">{{ entry.matchedCount }}</td>
              <td class="py-1 pr-2">{{ entry.signCount }}</td>
              <td class="py-1 pr-2">{{ entry.transferCount }}</td>
              <td class="py-1 pr-2">{{ entry.pdfCount }}</td>
              <td class="py-1 pr-2">{{ entry.printCount }}</td>
              <td class="py-1 pr-2" :class="(entry.errorCount || entry.error) ? 'text-red-600' : ''">
                <span v-if="entry.error">{{ entry.error }}</span>
                <span v-else-if="entry.errorCount">{{ entry.errorCount }} 筆</span>
                <span v-else>—</span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <!-- 登入驗證碼自動辨識（樣板庫） -->
        <div class="rounded-xl border border-light-c bg-surface p-4 text-sm">
          <div class="mb-1 font-medium text-base-c">登入驗證碼自動辨識（樣板庫）</div>
          <p class="mb-3 text-xs text-hint-c">
            自動登入用的是「樣板比對」分類器，不是一般 OCR——猜對／真的登入成功時才會把新樣本加進來，猜錯的不會，不用擔心庫被污染。下面這裡只顯示現況，正式使用不用手動操作。
          </p>

          <div v-if="captchaLibraryStats" class="mb-3">
            <p class="text-xs text-muted-c">目前共 {{ captchaLibraryStats.total }} 個字元樣本</p>
            <div class="mt-1 flex flex-wrap gap-2 text-xs">
              <span
                v-for="d in DIGIT_ORDER"
                :key="d"
                class="rounded px-2 py-1"
                :class="captchaLibraryStats.counts[d] ? 'bg-surface2 text-base-c' : 'bg-red-50 text-red-500'"
              >
                {{ d }}：{{ captchaLibraryStats.counts[d] || 0 }}
              </span>
            </div>
            <p class="mt-1 text-xs text-hint-c">紅色底代表這個數字目前完全沒有樣本，遇到時猜錯機率會比較高。</p>
          </div>

          <div class="border-t border-light-c pt-3">
            <label class="block text-xs text-muted-c">
              匯入本機樣板庫（選 bootstrap-captcha-ocr.mjs 產生的 captcha-template-library.json）：
            </label>
            <input
              type="file"
              accept=".json"
              class="mt-1 text-xs"
              :disabled="captchaImporting"
              @change="handleCaptchaLibraryFile"
            >
            <p v-if="captchaImportMessage" class="mt-1 text-xs" :class="captchaImporting ? 'text-hint-c' : 'text-muted-c'">
              {{ captchaImportMessage }}
            </p>
          </div>

          <p class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            要讓「立即執行」不需要先手動登入、或要接上真正的排程觸發，伺服器要設定環境變數 <code>DC_ERP_AUTO_ACCOUNT</code> / <code>DC_ERP_AUTO_PASSWORD</code>（真實登入帳密，只放在環境變數，不會存進任何設定檔或資料庫）。外部排程可以打 <code>/api/dc-erp/automation/run-scheduled</code>（另外要設 <code>DC_ERP_AUTOMATION_SECRET</code> 當密鑰），或如果你的 Nuxt/Nitro 版本支援 Tasks 功能，可以用 <code>server/tasks/dc-erp-weekly-automation.ts</code> 接 Nitro 內建排程，兩者擇一即可。
          </p>
        </div>
      </div>

      <!-- Toast -->
      <transition name="fade">
        <div
          v-if="toast.show"
          class="fixed bottom-6 right-6 z-50 rounded-xl bg-accent-solid px-4 py-3 text-sm text-white shadow-lg"
        >
          {{ toast.message }}
        </div>
      </transition>
    </DcErpShell>
  </div>
</template>

<style scoped>
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s;
  }
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
</style>
