<template>
  <div class="min-h-full bg-surface2 transition-colors">
    <div class="page-wrap">
      <!-- ── Header ── -->
      <div class="header bg-surface border-b border-light-c">
        <div class="header-inner">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center text-white text-base flex-shrink-0">
              🖨️
            </div>
            <div>
              <div class="font-bold text-base-c leading-none text-lg">
                印表機設定
              </div>
              <div class="text-hint-c mt-0.5 text-sm">
                抓取公司端電腦目前可用的印表機清單
              </div>
            </div>
          </div>

          <button
            class="refresh-btn"
            :disabled="loading"
            @click="fetchPrinters"
          >
            {{ loading ? '讀取中...' : '🔄 重新整理' }}
          </button>
        </div>
      </div>

      <!-- ── Content ── -->
      <div class="content">
        <!-- 載入中 -->
        <div v-if="loading && printers.length === 0" class="state-box text-hint-c">
          正在連線到公司端 Agent 查詢印表機...
        </div>

        <!-- 錯誤 -->
        <div v-else-if="errorMsg" class="state-box error-box">
          <div class="font-bold mb-1">
            抓取失敗
          </div>
          <div class="text-sm">
            {{ errorMsg }}
          </div>
          <div class="text-sm text-hint-c mt-2">
            請確認公司端 Agent 是否在線上（常駐程式有沒有在跑、有沒有連上 Hub）。
          </div>
        </div>

        <!-- 沒有印表機 -->
        <div v-else-if="!loading && printers.length === 0" class="state-box text-hint-c">
          目前沒有抓到任何印表機。
        </div>

        <!-- 印表機清單 -->
        <div v-else class="printer-list">
          <button
            v-for="name in printers"
            :key="name"
            class="printer-card bg-surface border-light-c"
            :class="{ selected: name === selectedPrinter }"
            @click="selectPrinter(name)"
          >
            <div class="printer-icon">
              🖨️
            </div>
            <div class="printer-name text-base-c">
              {{ name }}
            </div>
            <div v-if="name === selectedPrinter" class="printer-badge">
              ✓ 預設
            </div>
          </button>
        </div>

        <div v-if="printers.length > 0" class="hint-row text-hint-c">
          點選一個印表機設為預設，之後列印功能會自動帶入這個選擇。
        </div>

        <!-- ── 測試列印 ── -->
        <div v-if="printers.length > 0" class="test-print-box bg-surface border-light-c">
          <div class="font-bold text-base-c mb-1">
            測試列印
          </div>
          <div class="text-hint-c text-sm mb-3">
            會送一張只有英文字的測試頁到「{{ selectedPrinter || '（尚未選擇印表機）' }}」，確認整條列印路徑是否打通。
          </div>
          <button
            class="test-print-btn"
            :disabled="!selectedPrinter || testing"
            @click="doTestPrint"
          >
            {{ testing ? '送出中...' : '🖨️ 送出測試頁' }}
          </button>

          <div v-if="testResult" :class="['test-result', testResult.ok ? 'ok' : 'fail']">
            {{ testResult.message }}
          </div>
        </div>

        <!-- ── 測試圖片網址列印（模擬 Hermes 呼叫 /print-url） ── -->
        <div v-if="printers.length > 0" class="test-print-box bg-surface border-light-c">
          <div class="font-bold text-base-c mb-1">
            測試圖片網址列印
          </div>
          <div class="text-hint-c text-sm mb-3">
            貼一個圖片網址（例如 Discord 附件連結），直接呼叫 /holy/agent/print-url，
            跟 Hermes 實際呼叫的是同一支 API，用來繞過 Discord 直接除錯。
          </div>

          <div class="url-row">
            <input
              v-model="testImageUrl"
              type="text"
              placeholder="https://cdn.discordapp.com/attachments/..."
              class="url-input border-light-c bg-surface2 text-base-c"
            >
          </div>

          <div v-if="!selectedPrinter" class="text-sm mb-2" style="color:#f59e0b">
            ⚠ 請先在上面點選一個印表機，才能送出測試
          </div>

          <button
            class="test-print-btn"
            :disabled="!selectedPrinter || !testImageUrl || testingUrl"
            @click="doTestUrlPrint"
          >
            {{ testingUrl ? '送出中，最多等 30 秒...' : '🖼️ 送出圖片網址列印' }}
          </button>

          <div v-if="testUrlResult" :class="['test-result', testUrlResult.ok ? 'ok' : 'fail']">
            {{ testUrlResult.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'

  definePageMeta({ layout: 'staff', requiredPermission: 'printer-settings' })

  const commonStore = useCommonStore()

  // 走 commonStore.data.main_url（= '/api'，同網域），
  // 由 nuxt.config.ts 既有的 routeRules proxy 規則轉發到家裡主機，
  // 不用另外寫 server/api 代理檔案。
  const PRINTERS_API = `${commonStore.data.main_url}/holy/agent/printers`
  const PRINT_API = `${commonStore.data.main_url}/holy/agent/print`
  const PRINT_URL_API = `${commonStore.data.main_url}/holy/agent/print-url`
  const STORAGE_KEY = 'holy-selected-printer'

  const printers = ref([])
  const selectedPrinter = ref('')
  const loading = ref(false)
  const errorMsg = ref('')
  const testing = ref(false)
  const testResult = ref(null)
  const testImageUrl = ref('')
  const testingUrl = ref(false)
  const testUrlResult = ref(null)

  async function fetchPrinters() {
    loading.value = true
    errorMsg.value = ''
    try {
      const res = await fetch(PRINTERS_API)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      printers.value = Array.isArray(data) ? data : []

      // 如果之前存的預設印表機已經不在清單裡了，清掉避免誤導
      if (selectedPrinter.value && !printers.value.includes(selectedPrinter.value)) {
        selectedPrinter.value = ''
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      errorMsg.value = e?.message || String(e)
      printers.value = []
    } finally {
      loading.value = false
    }
  }

  function selectPrinter(name) {
    selectedPrinter.value = name
    localStorage.setItem(STORAGE_KEY, name)
    testResult.value = null
  }

  /**
   * 純 JS 組一份最小可用的 PDF（沒有外部套件依賴），只有一行英文測試字。
   * 注意：PDF 內建 Helvetica 字型沒有中文字型，這裡只能用英文字，
   * 純粹是測試「前端→Hub→Agent→印表機」這條路徑通不通，跟中文排版無關。
   */
  function buildTestPdf(text) {
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    ]
    const stream = `BT /F1 24 Tf 50 750 Td (${text}) Tj ET`
    objects.push(`5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`)

    let body = '%PDF-1.4\n'
    const offsets = [0]
    for (const obj of objects) {
      offsets.push(body.length)
      body += obj
    }
    const xrefStart = body.length
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    for (let i = 1; i <= objects.length; i++) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
    }
    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

    return new Blob([body + xref + trailer], { type: 'application/pdf' })
  }

  async function doTestPrint() {
    if (!selectedPrinter.value) return
    testing.value = true
    testResult.value = null
    try {
      const now = new Date().toLocaleString('zh-TW')
      const pdfBlob = buildTestPdf(`TEST PRINT - ${now}`)

      const form = new FormData()
      form.append('printerName', selectedPrinter.value)
      form.append('file', pdfBlob, 'test-print.pdf')

      const res = await fetch(PRINT_API, { method: 'POST', body: form })
      const text = await res.text()
      testResult.value = { ok: res.ok, message: text }
    } catch (e) {
      testResult.value = { ok: false, message: e?.message || String(e) }
    } finally {
      testing.value = false
    }
  }

  async function doTestUrlPrint() {
    if (!selectedPrinter.value || !testImageUrl.value) return
    testingUrl.value = true
    testUrlResult.value = null
    try {
      const res = await fetch(PRINT_URL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: selectedPrinter.value,
          imageUrl: testImageUrl.value,
        }),
      })
      const text = await res.text()
      testUrlResult.value = { ok: res.ok, message: text }
    } catch (e) {
      testUrlResult.value = { ok: false, message: e?.message || String(e) }
    } finally {
      testingUrl.value = false
    }
  }

  onMounted(() => {
    selectedPrinter.value = localStorage.getItem(STORAGE_KEY) || ''
    fetchPrinters()
  })
</script>

<style scoped>
  *, *::before, *::after {
    box-sizing: border-box;
  }

  .page-wrap {
    max-width: 720px;
    margin: 0 auto;
  }

  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    gap: 12px;
    flex-wrap: wrap;
  }

  .refresh-btn {
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    transition: background .15s;
  }

  .refresh-btn:hover:not(:disabled) {
    background: rgba(100, 116, 139, .12);
  }

  .refresh-btn:disabled {
    opacity: .5;
    cursor: default;
  }

  .content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .state-box {
    padding: 40px 20px;
    text-align: center;
    border-radius: 12px;
  }

  .error-box {
    background: rgba(239, 68, 68, .08);
    color: #dc2626;
  }

  .printer-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .printer-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 12px;
    border-radius: 12px;
    border: 1px solid;
    cursor: pointer;
    transition: border-color .15s, transform .1s;
    text-align: center;
  }

  .printer-card:hover {
    transform: translateY(-1px);
  }

  .printer-card.selected {
    border-color: #64748b;
    border-width: 2px;
    background: rgba(100, 116, 139, .08);
  }

  .printer-icon {
    font-size: 28px;
  }

  .printer-name {
    font-size: 14px;
    font-weight: 500;
    word-break: break-all;
  }

  .printer-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #64748b;
    color: white;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
  }

  .hint-row {
    font-size: 13px;
    text-align: center;
  }

  .test-print-box {
    border: 1px solid;
    border-radius: 12px;
    padding: 16px;
  }

  .test-print-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    background: #64748b;
    color: white;
    cursor: pointer;
    font-size: 14px;
    transition: background .15s;
  }

  .test-print-btn:hover:not(:disabled) {
    background: #475569;
  }

  .test-print-btn:disabled {
    opacity: .5;
    cursor: default;
  }

  .test-result {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    word-break: break-all;
  }

  .test-result.ok {
    background: rgba(34, 197, 94, .12);
    color: #16a34a;
  }

  .test-result.fail {
    background: rgba(239, 68, 68, .1);
    color: #dc2626;
  }

  .url-input {
    display: block;
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid;
    font-size: 13px;
    box-sizing: border-box;
  }

  .url-row {
    margin-bottom: 10px;
  }
</style>
