<template>
  <div class="pos-wrap">
    <header class="pos-header">
      <div class="header-inner">
        <div class="header-left">
          <span class="header-label">POS 銷售分析</span>
          <span class="header-sub">{{ storeLabel }}</span>
        </div>
        <div class="header-stats" v-if="allInvoices.length">
          <div class="stat">
            <span class="stat-val">{{ filteredDays.length }}</span>
            <span class="stat-lbl">天</span>
          </div>
          <div class="stat">
            <span class="stat-val">{{ filteredInvoices.length }}</span>
            <span class="stat-lbl">筆單</span>
          </div>
          <div class="stat">
            <span class="stat-val">{{ formatMoney(filteredTotal) }}</span>
            <span class="stat-lbl">總銷售額</span>
          </div>
        </div>
      </div>
    </header>

    <main class="pos-main">
      <!-- 載入狀態列 -->
      <section class="status-bar">
        <div v-if="loading" class="status-loading">
          <span class="spinner"></span> 載入資料中...
        </div>
        <div v-else-if="parseError" class="status-error">⚠ {{ parseError }}</div>
        <div v-else-if="allInvoices.length" class="status-ok">
          <span class="status-dot"></span>
          已載入 {{ allInvoices.length }} 筆資料・{{ loadedFiles.length }} 個檔案
          <button class="btn-reload" @click="loadData">重新載入</button>
        </div>
        <div v-else class="status-empty">找不到資料</div>
      </section>

      <template v-if="allInvoices.length">
        <!-- 篩選工具列 -->
        <section class="filter-bar">
          <div class="filter-group">
            <label>月份</label>
            <div class="month-pills">
              <button
                v-for="m in availableMonths"
                :key="m"
                class="pill"
                :class="{ active: selectedMonths.includes(m) }"
                @click="toggleMonth(m)"
              >{{ m }}</button>
            </div>
          </div>

          <div class="filter-group">
            <label>星期篩選</label>
            <div class="weekday-pills">
              <button
                v-for="(wd, idx) in weekdays"
                :key="idx"
                class="pill wd"
                :class="{ active: selectedWeekdays.includes(idx), sat: idx === 6, sun: idx === 0 }"
                @click="toggleWeekday(idx)"
              >{{ wd }}</button>
            </div>
          </div>

          <div class="filter-group">
            <label>
              商品篩選 <span class="hint">（加總指定項目銷售額）</span>
              <span v-if="selectedItems.length" class="item-count-badge">已選 {{ selectedItems.length }}</span>
            </label>
            <div class="item-keyword-row">
              <input v-model="itemSearch" type="text" placeholder="關鍵字過濾..." class="input-keyword" />
              <button class="btn-select-all" @click="selectAllItems">全選</button>
              <button class="btn-clear-items" @click="selectedItems = []">清除</button>
            </div>
            <div class="item-checklist">
              <label
                v-for="name in filteredAllItemNames"
                :key="name"
                class="item-check-row"
                :class="{ checked: selectedItems.includes(name) }"
              >
                <input type="checkbox" :value="name" v-model="selectedItems" />
                <span>{{ name }}</span>
              </label>
            </div>
          </div>

          <button class="btn-reset" @click="resetFilters">重設篩選</button>
        </section>

        <!-- 摘要卡片 -->
        <section class="summary-cards">
          <div class="card">
            <div class="card-num">{{ formatMoney(filteredTotal) }}</div>
            <div class="card-lbl">篩選期間銷售額</div>
            <div class="card-sub">共 {{ filteredDays.length }} 天</div>
          </div>
          <div class="card">
            <div class="card-num">{{ filteredDays.length ? formatMoney(Math.round(filteredTotal / filteredDays.length)) : '—' }}</div>
            <div class="card-lbl">每日平均銷售額</div>
          </div>
          <div class="card" v-if="selectedItems.length">
            <div class="card-num accent">{{ formatMoney(filteredItemTotal) }}</div>
            <div class="card-lbl">指定商品銷售額</div>
            <div class="card-sub">佔總額 {{ filteredTotal ? Math.round(filteredItemTotal / filteredTotal * 100) : 0 }}%</div>
          </div>
          <div class="card" v-if="selectedItems.length">
            <div class="card-num accent">{{ filteredDays.length ? formatMoney(Math.round(filteredItemTotal / filteredDays.length)) : '—' }}</div>
            <div class="card-lbl">指定商品每日平均</div>
          </div>
          <div class="card">
            <div class="card-num">{{ filteredInvoices.length }}</div>
            <div class="card-lbl">筆交易</div>
          </div>
          <div class="card">
            <div class="card-num">{{ filteredInvoices.length ? formatMoney(Math.round(filteredTotal / filteredInvoices.length)) : '—' }}</div>
            <div class="card-lbl">平均客單價</div>
          </div>
        </section>

        <!-- 每日明細表 -->
        <section class="day-table-wrap">
          <h2 class="section-title">每日銷售明細</h2>
          <div class="table-scroll">
            <table class="day-table">
              <thead>
              <tr>
                <th>日期</th>
                <th>星期</th>
                <th class="num">筆數</th>
                <th class="num">銷售額</th>
                <th class="num" v-if="selectedItems.length">指定商品</th>
                <th></th>
              </tr>
              </thead>
              <tbody>
              <template v-for="(group, month) in filteredDaysByMonth" :key="month">
                <tr class="month-header-row" @click="toggleExpandMonth(month)">
                  <td colspan="6">
                    <span class="month-toggle">{{ expandedMonths.has(month) ? '▾' : '▸' }}</span>
                    {{ month }}
                    <span class="month-summary">{{ group.length }} 天・{{ formatMoney(monthTotal(group)) }}</span>
                  </td>
                </tr>
                <template v-if="expandedMonths.has(month)">
                  <template v-for="day in group" :key="day.date">
                    <tr
                      class="day-row"
                      :class="{ expanded: expandedDay === day.date, sat: day.weekdayIdx === 6, sun: day.weekdayIdx === 0 }"
                      @click="toggleDay(day.date)"
                    >
                      <td>{{ day.date }}</td>
                      <td><span class="wd-badge" :class="{ sat: day.weekdayIdx === 6, sun: day.weekdayIdx === 0 }">{{ weekdays[day.weekdayIdx] }}</span></td>
                      <td class="num">{{ day.invoices.length }}</td>
                      <td class="num">{{ formatMoney(day.total) }}</td>
                      <td class="num" v-if="selectedItems.length">{{ formatMoney(day.itemTotal) }}</td>
                      <td class="expand-icon">{{ expandedDay === day.date ? '▲' : '▼' }}</td>
                    </tr>
                    <tr v-if="expandedDay === day.date" class="detail-row">
                      <td :colspan="selectedItems.length ? 6 : 5">
                        <div class="invoice-list">
                          <template v-for="inv in day.invoices" :key="inv.invNo">
                            <div
                              v-if="!selectedItems.length || invItemTotal(inv) > 0"
                              class="invoice-card"
                            >
                              <div class="inv-header">
                                <span class="inv-no">{{ inv.invNo }}</span>
                                <span class="inv-time">{{ inv.time }}</span>
                                <span class="inv-amt">{{ formatMoney(selectedItems.length ? invItemTotal(inv) : inv.amt) }}</span>
                              </div>
                              <div v-if="inv.items.length" class="inv-items">
                                <template v-for="(it, i) in inv.items" :key="i">
                                  <div
                                    v-if="!selectedItems.length || selectedItems.includes(it.name)"
                                    class="inv-item highlight"
                                  >
                                    <span class="it-name">{{ it.name }}</span>
                                    <span class="it-detail">{{ it.qty }} × {{ formatMoney(it.price) }} = {{ formatMoney(it.subtotal) }}</span>
                                  </div>
                                </template>
                              </div>
                            </div>
                          </template>
                        </div>
                      </td>
                    </tr>
                  </template>
                  <!-- 月份平均列 -->
                  <tr class="month-avg-row">
                    <td>{{ month }} 平均／天</td>
                    <td class="mobile-hide"></td>
                    <td class="num mobile-hide">{{ (monthInvoiceCount(group) / group.length).toFixed(1) }}</td>
                    <td class="num">{{ formatMoney(Math.round(monthTotal(group) / group.length)) }}</td>
                    <td class="num" v-if="selectedItems.length">{{ formatMoney(Math.round(monthItemTotal(group) / group.length)) }}</td>
                    <td></td>
                  </tr>
                </template>
              </template>
              </tbody>
              <tfoot>
              <tr class="total-row">
                <td>合計</td>
                <td class="mobile-hide"></td>
                <td class="num mobile-hide">{{ filteredInvoices.length }}</td>
                <td class="num">{{ formatMoney(filteredTotal) }}</td>
                <td class="num" v-if="selectedItems.length">{{ formatMoney(filteredItemTotal) }}</td>
                <td></td>
              </tr>
              <tr class="avg-row">
                <td>每日平均</td>
                <td class="mobile-hide"></td>
                <td class="num mobile-hide">{{ filteredDays.length ? (filteredInvoices.length / filteredDays.length).toFixed(1) : '—' }}</td>
                <td class="num">{{ filteredDays.length ? formatMoney(Math.round(filteredTotal / filteredDays.length)) : '—' }}</td>
                <td class="num" v-if="selectedItems.length">{{ filteredDays.length ? formatMoney(Math.round(filteredItemTotal / filteredDays.length)) : '—' }}</td>
                <td></td>
              </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <!-- 商品排行 -->
        <section class="ranking-wrap">
          <h2 class="section-title">商品銷售排行</h2>
          <div class="ranking-list">
            <div v-for="(item, idx) in itemRanking" :key="item.name" class="rank-row">
              <span class="rank-no" :class="{ top: idx < 3 }">{{ idx + 1 }}</span>
              <span class="rank-name">{{ item.name }}</span>
              <div class="rank-bar-wrap">
                <div class="rank-bar" :style="{ width: (item.total / itemRanking[0].total * 100) + '%' }"></div>
              </div>
              <span class="rank-amt">{{ formatMoney(item.total) }}</span>
              <span class="rank-qty">{{ item.qty }} 件</span>
            </div>
          </div>
        </section>
      </template>

      <!-- 空狀態 -->
      <div v-else class="empty-state">
        <p>請上傳 POS 資料檔案開始分析</p>
        <p class="empty-hint">格式：InvD20260101_002.txt</p>
      </div>
    </main>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'

  // ── 商品名稱正規化：去掉結尾的折扣/價格修飾詞 ──────────
  function normalizeItemName(name) {
    // 反覆去掉結尾的修飾括號，直到沒有可去的為止
    // 匹配：(80%) (90%) (九折) (八折) (員工價) (員工價格) (會員價) 等
    const modifierPattern = /（[^）]*[折%價]）$|\([^)]*[折%價]\)$/
    let prev = ''
    let result = name.trim()
    while (result !== prev) {
      prev = result
      result = result.replace(modifierPattern, '').trim()
    }
    return result
  }

  // ── Big5 解碼工具 ──────────────────────────────────────────
  function decodeBig5Line(rawStr) {
    // rawStr 是 latin1 字串，包含 \xNN escape
    // 需要把 latin1 bytes 當 Big5 重新解碼
    try {
      const bytes = []
      for (let i = 0; i < rawStr.length; i++) {
        bytes.push(rawStr.charCodeAt(i) & 0xff)
      }
      const uint8 = new Uint8Array(bytes)
      const decoder = new TextDecoder('big5', { fatal: false })
      return decoder.decode(uint8)
    } catch {
      return rawStr
    }
  }

  // ── 解析一個 txt 檔案的文字內容 ──────────────────────────
  function parsePosFile(rawText, filename) {
    // rawText 用 latin1 讀進來（binary string）
    const lines = rawText.split('\n')
    const invoiceMap = {}

    // 從檔名抓日期
    const dateMatch = filename.match(/InvD(\d{4})(\d{2})(\d{2})/)
    const fileDate = dateMatch ? `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}` : null

    for (const line of lines) {
      if (!line.trim() || line.startsWith('OPDate')) continue

      // CSV 解析：移除每欄頭尾的單引號
      const cols = line.split(',').map(c => c.trim().replace(/^'|'$/g, ''))
      if (cols.length < 9) continue

      const [opDate, invNo, listNoStr, lineType, lineText, , posId, storeId, fileDateTime] = cols
      const listNo = parseInt(listNoStr)

      if (!invoiceMap[invNo]) {
        // 取日期與時間
        const dtMatch = fileDateTime.match(/(\d{4}\/\d{2}\/\d{2}) (\d{2}:\d{2}:\d{2})/)
        // storeId 可能是 Big5 編碼（如「市集」），解碼一次
        const storeDecoded = decodeBig5Line(storeId)
        invoiceMap[invNo] = {
          invNo,
          storeId: storeDecoded,
          date: fileDate || (dtMatch ? dtMatch[1] : opDate.split(' ')[0]),
          time: dtMatch ? dtMatch[2] : '',
          amt: 0,
          items: []
        }
      }

      const inv = invoiceMap[invNo]

      if (lineType === 'InvAmt') {
        inv.amt = parseInt(lineText) || 0
      } else if (listNo > 0 && lineType === '') {
        // 商品行：格式 商品名:數量:單價: :小計
        const decoded = decodeBig5Line(lineText)
        const parts = decoded.split(':')
        if (parts.length >= 5) {
          const name = normalizeItemName(parts[0].trim())
          const qty = parseFloat(parts[1]) || 0
          const price = parseFloat(parts[2]) || 0
          const subtotal = parseFloat(parts[4]) || 0
          if (name && !name.startsWith('應稅') && subtotal > 0) {
            inv.items.push({ name, qty, price, subtotal })
          }
        }
      }
    }

    return Object.values(invoiceMap).filter(inv => inv.amt > 0)
  }

  // ── State ─────────────────────────────────────────────────
  const loadedFiles = ref([])
  const parseError = ref('')
  const allInvoices = ref([])

  const selectedMonths = ref([])
  const selectedWeekdays = ref([])
  const selectedItems = ref([])
  const itemSearch = ref('')
  const expandedDay = ref(null)
  const expandedMonths = ref(new Set())

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  // ── 從 JSON 載入（build 時預先轉換）────────────────────
  const loading = ref(false)

  async function loadData() {
    loading.value = true
    parseError.value = ''
    try {
      const data = await $fetch('/file/pos-data.json')
      allInvoices.value = data
      // 從資料反推載入的檔案清單（用日期去重）
      const dates = new Set(data.map(inv => inv.date))
      loadedFiles.value = [...dates].sort()
      selectedMonths.value = [...availableMonths.value]
    } catch (e) {
      parseError.value = `載入失敗：${e.message}`
    } finally {
      loading.value = false
    }
  }

  onMounted(() => loadData())

  // ── 衍生資料 ─────────────────────────────────────────────
  const availableMonths = computed(() => {
    const months = new Set()
    for (const inv of allInvoices.value) {
      const m = inv.date.substring(0, 7) // YYYY/MM
      months.add(m)
    }
    return [...months].sort()
  })

  // 門市名稱彙總
  const storeLabel = computed(() => {
    const stores = new Set(allInvoices.value.map(i => i.storeId).filter(Boolean))
    return stores.size ? [...stores].join('・') : 'POS'
  })

  // 依日期分組
  const dayMap = computed(() => {
    const map = {}
    for (const inv of allInvoices.value) {
      if (!map[inv.date]) {
        const d = new Date(inv.date.replace(/\//g, '-'))
        map[inv.date] = {
          date: inv.date,
          weekdayIdx: d.getDay(),
          invoices: [],
          total: 0,
          itemTotal: 0
        }
      }
      map[inv.date].invoices.push(inv)
      map[inv.date].total += inv.amt
    }
    return map
  })

  // 篩選後的天
  const filteredDays = computed(() => {
    return Object.values(dayMap.value)
      .filter(day => {
        const month = day.date.substring(0, 7)
        const monthOk = selectedMonths.value.length === 0 || selectedMonths.value.includes(month)
        const wdOk = selectedWeekdays.value.length === 0 || selectedWeekdays.value.includes(day.weekdayIdx)
        return monthOk && wdOk
      })
      .map(day => {
        // 計算指定商品銷售額
        let itemTotal = 0
        if (selectedItems.value.length) {
          for (const inv of day.invoices) {
            for (const it of inv.items) {
              if (selectedItems.value.includes(it.name)) {
                itemTotal += it.subtotal
              }
            }
          }
        }
        return { ...day, itemTotal }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  const filteredInvoices = computed(() =>
    filteredDays.value.flatMap(d => d.invoices)
  )

  const filteredTotal = computed(() =>
    filteredDays.value.reduce((s, d) => s + d.total, 0)
  )

  const filteredItemTotal = computed(() =>
    filteredDays.value.reduce((s, d) => s + d.itemTotal, 0)
  )

  // 按月分組
  const filteredDaysByMonth = computed(() => {
    const map = {}
    for (const day of filteredDays.value) {
      const month = day.date.substring(0, 7)
      if (!map[month]) map[month] = []
      map[month].push(day)
    }
    return map
  })

  function monthTotal(group) { return group.reduce((s, d) => s + d.total, 0) }
  function monthItemTotal(group) { return group.reduce((s, d) => s + d.itemTotal, 0) }
  function monthInvoiceCount(group) { return group.reduce((s, d) => s + d.invoices.length, 0) }

  // 商品排行（篩選範圍內）
  const itemRanking = computed(() => {
    const map = {}
    for (const inv of filteredInvoices.value) {
      for (const it of inv.items) {
        if (!map[it.name]) map[it.name] = { name: it.name, total: 0, qty: 0 }
        map[it.name].total += it.subtotal
        map[it.name].qty += it.qty
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 20)
  })

  // 商品清單
  const allItemNames = computed(() => {
    const s = new Set()
    for (const inv of allInvoices.value) {
      for (const it of inv.items) s.add(it.name)
    }
    return [...s].sort()
  })

  const filteredAllItemNames = computed(() =>
    itemSearch.value
      ? allItemNames.value.filter(n => n.includes(itemSearch.value))
      : allItemNames.value
  )

  // ── 操作 ─────────────────────────────────────────────────
  function toggleMonth(m) {
    const idx = selectedMonths.value.indexOf(m)
    if (idx >= 0) selectedMonths.value.splice(idx, 1)
    else selectedMonths.value.push(m)
  }

  function toggleWeekday(idx) {
    const pos = selectedWeekdays.value.indexOf(idx)
    if (pos >= 0) selectedWeekdays.value.splice(pos, 1)
    else selectedWeekdays.value.push(idx)
  }

  function selectAllItems() {
    selectedItems.value = [...filteredAllItemNames.value]
  }

  function addItem(name) {
    if (!selectedItems.value.includes(name)) selectedItems.value.push(name)
    itemSearch.value = ''
  }

  function toggleExpandMonth(month) {
    if (expandedMonths.value.has(month)) expandedMonths.value.delete(month)
    else expandedMonths.value.add(month)
    expandedMonths.value = new Set(expandedMonths.value) // trigger reactivity
  }

  function toggleDay(date) {
    expandedDay.value = expandedDay.value === date ? null : date
  }

  function resetFilters() {
    selectedMonths.value = [...availableMonths.value]
    selectedWeekdays.value = []
    selectedItems.value = []
    itemSearch.value = ''
    expandedDay.value = null
  }

  function invItemTotal(inv) {
    return inv.items
      .filter(it => selectedItems.value.includes(it.name))
      .reduce((s, it) => s + it.subtotal, 0)
  }

  function formatMoney(n) {
    if (!n && n !== 0) return '—'
    return '$' + Math.round(n).toLocaleString('zh-TW')
  }
</script>

<style scoped>
  /* ── Variables ── */
  :root {
    --c-bg: #f5f4f0;
    --c-surface: #ffffff;
    --c-border: #e2e0d8;
    --c-text: #1a1a18;
    --c-muted: #7a7870;
    --c-accent: #2d6a4f;
    --c-accent-lt: #e8f4ee;
    --c-sat: #1a5276;
    --c-sat-bg: #eaf2f8;
    --c-sun: #922b21;
    --c-sun-bg: #fdedec;
    --c-highlight: #fff3cd;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .pos-wrap {
    min-height: 100vh;
    background: #f5f4f0;
    font-family: 'Noto Sans TC', 'PingFang TC', sans-serif;
    color: #1a1a18;
  }

  /* ── Header ── */
  .pos-header {
    background: #1a1a18;
    color: #f5f4f0;
    padding: 0 2rem;
    height: 56px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-inner {
    max-width: 1200px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header-left { display: flex; align-items: baseline; gap: 0.75rem; }
  .header-label { font-size: 1rem; font-weight: 600; letter-spacing: 0.05em; }
  .header-sub { font-size: 0.75rem; color: #888; }
  .header-stats { display: flex; gap: 2rem; }
  .stat { display: flex; align-items: baseline; gap: 0.25rem; }
  .stat-val { font-size: 1.1rem; font-weight: 700; color: #c8e6c9; }
  .stat-lbl { font-size: 0.7rem; color: #888; }

  /* ── Main ── */
  .pos-main { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1rem 4rem; }

  /* ── Status Bar ── */
  .status-bar {
    background: #fff;
    border-radius: 10px;
    border: 1px solid #e2e0d8;
    padding: 0.75rem 1.25rem;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .status-loading { display: flex; align-items: center; gap: 0.6rem; color: #7a7870; }
  .spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid #e2e0d8;
    border-top-color: #2d6a4f;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .status-ok { display: flex; align-items: center; gap: 0.6rem; flex: 1; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #2d6a4f; flex-shrink: 0; }
  .status-error { color: #c0392b; }
  .status-empty { color: #7a7870; }
  .btn-reload {
    margin-left: auto;
    background: none;
    border: 1px solid #e2e0d8;
    border-radius: 6px;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    color: #7a7870;
    cursor: pointer;
  }
  .btn-reload:hover { border-color: #2d6a4f; color: #2d6a4f; }

  /* ── Filter Bar ── */
  .filter-bar {
    background: #fff;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid #e2e0d8;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
  .filter-group label { font-size: 0.75rem; font-weight: 600; color: #7a7870; text-transform: uppercase; letter-spacing: 0.06em; }
  .hint { font-weight: 400; text-transform: none; }

  .month-pills, .weekday-pills { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .pill {
    border: 1px solid #e2e0d8;
    background: #f5f4f0;
    border-radius: 20px;
    padding: 0.3rem 0.8rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
    color: #1a1a18;
  }
  .pill:hover { border-color: #2d6a4f; color: #2d6a4f; }
  .pill.active { background: #2d6a4f; border-color: #2d6a4f; color: #fff; }
  .pill.sat.active { background: #1a5276; border-color: #1a5276; }
  .pill.sun.active { background: #922b21; border-color: #922b21; }

  .item-filter-row { display: flex; flex-direction: column; gap: 0.5rem; }
  .item-search-wrap { position: relative; max-width: 400px; }
  /* ── Item Checklist ── */
  .item-count-badge {
    display: inline-block;
    background: #2d6a4f;
    color: #fff;
    border-radius: 10px;
    padding: 0.05rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    margin-left: 0.4rem;
    vertical-align: middle;
  }
  .item-keyword-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .input-keyword {
    flex: 1;
    max-width: 240px;
    border: 1px solid #e2e0d8;
    border-radius: 6px;
    padding: 0.35rem 0.7rem;
    font-size: 0.8rem;
    background: #f5f4f0;
    outline: none;
  }
  .input-keyword:focus { border-color: #2d6a4f; background: #fff; }
  .btn-select-all, .btn-clear-items {
    border: 1px solid #e2e0d8;
    border-radius: 6px;
    padding: 0.3rem 0.75rem;
    font-size: 0.75rem;
    cursor: pointer;
    background: #f5f4f0;
    color: #7a7870;
    transition: all 0.15s;
  }
  .btn-select-all:hover { border-color: #2d6a4f; color: #2d6a4f; }
  .btn-clear-items:hover { border-color: #c0392b; color: #c0392b; }

  .item-checklist {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    max-height: 180px;
    overflow-y: auto;
    padding: 0.25rem 0;
  }
  .item-check-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    border-radius: 20px;
    border: 1px solid #e2e0d8;
    font-size: 0.8rem;
    cursor: pointer;
    background: #f5f4f0;
    color: #1a1a18;
    transition: all 0.12s;
    user-select: none;
  }
  .item-check-row input[type="checkbox"] { display: none; }
  .item-check-row:hover { border-color: #2d6a4f; color: #2d6a4f; }
  .item-check-row.checked { background: #2d6a4f; border-color: #2d6a4f; color: #fff; }


  .btn-reset {
    align-self: flex-start;
    background: none;
    border: 1px solid #e2e0d8;
    border-radius: 6px;
    padding: 0.35rem 1rem;
    font-size: 0.8rem;
    color: #7a7870;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-reset:hover { border-color: #1a1a18; color: #1a1a18; }

  /* ── Summary Cards ── */
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .card {
    background: #fff;
    border-radius: 10px;
    border: 1px solid #e2e0d8;
    padding: 1.25rem 1.5rem;
  }
  .card-num { font-size: 1.5rem; font-weight: 700; color: #1a1a18; }
  .card-num.accent { color: #2d6a4f; }
  .card-lbl { font-size: 0.75rem; color: #7a7870; margin-top: 0.2rem; }
  .card-sub { font-size: 0.72rem; color: #2d6a4f; margin-top: 0.2rem; }

  /* ── Day Table ── */
  .day-table-wrap, .ranking-wrap {
    background: #fff;
    border-radius: 12px;
    border: 1px solid #e2e0d8;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.5rem;
  }
  .section-title { font-size: 0.875rem; font-weight: 700; color: #7a7870; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1rem; }
  .table-scroll { overflow-x: auto; }
  .day-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .day-table th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 600;
    color: #7a7870;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid #e2e0d8;
  }
  .day-table th.num, .day-table td.num { text-align: right; }
  .day-row td {
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid #f0efe9;
    cursor: pointer;
    transition: background 0.1s;
  }
  .day-row:hover td { background: #f9f8f4; }
  .day-row.sat td { background: #eaf2f8; }
  .day-row.sun td { background: #fdedec; }
  .day-row.expanded td { background: #e8f4ee !important; }

  .wd-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    background: #f5f4f0;
    color: #7a7870;
  }
  .wd-badge.sat { background: #eaf2f8; color: #1a5276; }
  .wd-badge.sun { background: #fdedec; color: #922b21; }
  .expand-icon { text-align: right; color: #bbb; font-size: 0.7rem; }

  .detail-row td { padding: 0; background: #fafaf7 !important; }
  .invoice-list { padding: 0.75rem 1rem; display: flex; flex-wrap: wrap; gap: 0.75rem; }
  .invoice-card {
    background: #fff;
    border: 1px solid #e2e0d8;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    min-width: 220px;
    flex: 1;
  }
  .inv-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
  .inv-no { font-size: 0.75rem; font-weight: 700; font-family: monospace; color: #2d6a4f; }
  .inv-time { font-size: 0.72rem; color: #7a7870; margin-left: auto; }
  .inv-amt { font-size: 0.9rem; font-weight: 700; }
  .inv-items { display: flex; flex-direction: column; gap: 0.2rem; }
  .inv-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; padding: 0.2rem 0.4rem; border-radius: 3px; }
  .inv-item.highlight { background: #fff3cd; }
  .it-name { color: #1a1a18; }
  .it-detail { color: #7a7870; font-family: monospace; }

  .total-row td {
    padding: 0.75rem;
    font-weight: 700;
    border-top: 2px solid #1a1a18;
    font-size: 0.9rem;
  }
  .total-row td.num { text-align: right; }
  .month-header-row td {
    padding: 0.4rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #4a4a42;
    background: #e8e6de;
    border-top: 1px solid #d4d2ca;
    cursor: pointer;
    user-select: none;
    transition: background 0.1s;
  }
  .month-header-row:hover td { background: #dedad0; }
  .month-toggle { margin-right: 0.4rem; font-size: 0.7rem; }
  .month-summary {
    float: right;
    font-weight: 400;
    color: #7a7870;
    font-size: 0.75rem;
  }
  @media (max-width: 640px) {
    .month-summary { float: none; display: block; margin-top: 0.1rem; }
  }
  .month-avg-row td {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    color: #2d6a4f;
    font-weight: 600;
    background: #f0f9f4;
    border-top: 1px dashed #b7dfc9;
    border-bottom: 2px solid #e2e0d8;
  }
  .month-avg-row td.num { text-align: right; }
  .avg-row td {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    color: #7a7870;
    border-top: 1px dashed #e2e0d8;
  }
  .avg-row td.num { text-align: right; }

  /* ── Ranking ── */
  .ranking-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .rank-row {
    display: grid;
    grid-template-columns: 2rem 1fr 120px auto auto;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
  }
  .rank-no {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #f0efe9;
    color: #7a7870;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
  }
  .rank-no.top { background: #2d6a4f; color: #fff; }
  .rank-name { color: #1a1a18; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rank-bar-wrap { background: #f0efe9; border-radius: 3px; height: 6px; }
  .rank-bar { height: 100%; background: #2d6a4f; border-radius: 3px; transition: width 0.3s; }
  .rank-amt { text-align: right; font-weight: 600; white-space: nowrap; }
  .rank-qty { color: #7a7870; font-size: 0.75rem; white-space: nowrap; }

  /* ── Empty ── */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #7a7870;
  }
  .empty-state p { font-size: 1rem; }
  .empty-hint { font-size: 0.8rem; margin-top: 0.5rem; }

  @media (max-width: 640px) {
    /* Header */
    .header-stats { display: none; }
    .pos-header { padding: 0 1rem; }
    .header-label { font-size: 0.9rem; }

    /* Main padding */
    .pos-main { padding: 1rem 0.75rem 3rem; }

    /* Status bar */
    .status-bar { padding: 0.6rem 1rem; font-size: 0.8rem; }

    /* Filter bar */
    .filter-bar { padding: 1rem; gap: 0.875rem; }
    .month-pills, .weekday-pills { gap: 0.3rem; }
    .pill { padding: 0.25rem 0.6rem; font-size: 0.75rem; }
    .item-checklist { max-height: 140px; }
    .item-check-row { font-size: 0.75rem; padding: 0.2rem 0.5rem; }

    /* Summary cards: 2欄 */
    .summary-cards { grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .card { padding: 0.875rem 1rem; }
    .card-num { font-size: 1.1rem; }

    /* Table: 隱藏星期欄，日期縮短，筆數隱藏 */
    .day-table th:nth-child(2),
    .day-table td:nth-child(2),
    .day-table th:nth-child(3),
    .day-table td:nth-child(3),
    .mobile-hide { display: none; }
    .day-table th, .day-table td { padding: 0.5rem 0.5rem; font-size: 0.8rem; }
    .month-header-row td { font-size: 0.75rem; padding: 0.35rem 0.5rem; }
    .month-summary { font-size: 0.7rem; }

    /* Invoice cards: 1欄 */
    .invoice-list { padding: 0.5rem; gap: 0.5rem; }
    .invoice-card { min-width: unset; width: 100%; }
    .inv-header { font-size: 0.78rem; }
    .inv-item { font-size: 0.72rem; }
    .it-detail { font-size: 0.7rem; }

    /* Ranking */
    .rank-row { grid-template-columns: 2rem 1fr auto; }
    .rank-bar-wrap, .rank-qty { display: none; }
    .rank-amt { font-size: 0.8rem; }

    /* Section titles */
    .day-table-wrap, .ranking-wrap { padding: 1rem; }
    .section-title { font-size: 0.75rem; }
  }
</style>
