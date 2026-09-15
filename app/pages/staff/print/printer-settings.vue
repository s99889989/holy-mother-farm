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
  const STORAGE_KEY = 'holy-selected-printer'

  const printers = ref([])
  const selectedPrinter = ref('')
  const loading = ref(false)
  const errorMsg = ref('')

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
</style>
