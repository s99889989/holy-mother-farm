<template>
  <div class="min-h-full bg-surface2 transition-colors">
    <div class="layout">
      <!-- ── 手機 Topbar ── -->
      <div class="mobile-topbar bg-surface border-b border-light-c">
        <div class="mobile-topbar-inner">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white flex-shrink-0" style="font-size:12px">
              📦
            </div>
            <span class="font-bold" style="font-size:14px">會館叫貨</span>
          </div>
          <div class="mobile-topbar-actions">
            <button
              v-if="sideTab === 'create'"
              class="print-nav-btn"
              :disabled="orderItems.length === 0"
              style="padding:6px 10px;font-size:11px"
              @click="doPrint"
            >
              🖨️ 列印
            </button>
            <button class="mobile-menu-btn" :class="{ active: mobileOpen }" @click="mobileOpen = !mobileOpen">
              <span>{{ mobileOpen ? '✕' : '☰' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="mobileOpen" class="mobile-overlay" @click="mobileOpen = false" />

      <!-- ── 左側 Sidebar ── -->
      <aside class="sidebar bg-surface border-r border-light-c" :class="{ open: mobileOpen }">
        <div class="sidebar-header border-b border-light-c px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">
              📦
            </div>
            <div>
              <div class="font-bold text-base-c leading-none" style="font-size:15px">會館叫貨</div>
              <div class="text-hint-c mt-0.5" style="font-size:11px">農莊 → 會館 叫貨單建立與紀錄管理</div>
            </div>
          </div>
        </div>

        <!-- Tab 切換 -->
        <div class="tab-bar border-b border-light-c">
          <button
            :class="['tab-btn', sideTab === 'create' ? 'active bg-surface border-b-2 border-emerald-500 text-base-c' : 'text-muted-c hover:bg-surface2']"
            @click="sideTab = 'create'; mobileOpen = false"
          >
            🧾 建立叫貨
          </button>
          <button
            :class="['tab-btn', sideTab === 'history' ? 'active bg-surface border-b-2 border-emerald-500 text-base-c' : 'text-muted-c hover:bg-surface2']"
            @click="sideTab = 'history'; mobileOpen = false"
          >
            📋 歷史紀錄
          </button>
          <button
            :class="['tab-btn', sideTab === 'items' ? 'active bg-surface border-b-2 border-emerald-500 text-base-c' : 'text-muted-c hover:bg-surface2']"
            @click="sideTab = 'items'; mobileOpen = false"
          >
            ⚙ 品項管理
          </button>
        </div>

        <!-- ══ 建立叫貨 tab：品項選擇 ══ -->
        <template v-if="sideTab === 'create'">
          <div class="search-row border-b border-light-c">
            <input v-model="searchQuery" placeholder="搜尋品項..." class="search-inp text-base-c bg-surface">
            <button v-if="searchQuery" class="search-clear text-muted-c" @click="searchQuery = ''">✕</button>
          </div>

          <div class="list-scroll">
            <template v-if="searchQuery.trim()">
              <div v-for="p in searchResults" :key="p.id" class="item-row" @click="addItemToOrder(p)">
                <span class="zh-main">{{ p.name }}</span>
                <span class="item-meta text-hint-c">{{ p.unit }} / ${{ p.price }}</span>
                <span class="add-mark">＋</span>
              </div>
              <div v-if="searchResults.length === 0" class="empty-search text-hint-c">找不到「{{ searchQuery }}」</div>
            </template>

            <template v-else>
              <div v-for="(group, gi) in catalog" :key="group.id" class="group">
                <div class="group-header bg-surface" @click="toggleGroupOpen(gi)">
                  <span class="group-toggle">{{ groupOpen[gi] === false ? '▶' : '▼' }}</span>
                  <span class="group-name-label text-base-c">{{ group.group }}</span>
                  <span class="group-count text-hint-c">{{ group.items.length }}</span>
                </div>
                <template v-if="groupOpen[gi] !== false">
                  <div v-for="p in group.items" :key="p.id" class="item-row" @click="addItemToOrder(p)">
                    <span class="zh-main">{{ p.name }}</span>
                    <span class="item-meta text-hint-c">{{ p.unit }} / ${{ p.price }}</span>
                    <span class="add-mark">＋</span>
                  </div>
                </template>
              </div>
            </template>
          </div>

          <div class="sidebar-footer border-t border-light-c">
            <div class="text-hint-c" style="font-size:11px;padding:0 2px 6px">
              已選 {{ orderItems.length }} 項品項，合計 ${{ totalAmount }}
            </div>
            <button class="print-btn" :disabled="orderItems.length === 0" @click="doPrint">
              🖨️ 列印叫貨單
            </button>
            <button class="save-btn" :disabled="orderItems.length === 0" @click="saveOrder">
              💾 存為歷史紀錄
            </button>
          </div>
        </template>

        <!-- ══ 歷史紀錄 tab ══ -->
        <template v-if="sideTab === 'history'">
          <div class="search-row border-b border-light-c">
            <input v-model="historyQuery" placeholder="搜尋訂購人 / 品名..." class="search-inp text-base-c bg-surface">
            <button v-if="historyQuery" class="search-clear text-muted-c" @click="historyQuery = ''">✕</button>
          </div>
          <div class="list-scroll">
            <div v-if="filteredHistory.length === 0" class="empty-search text-hint-c">尚無符合的紀錄</div>
            <div
              v-for="rec in filteredHistory"
              :key="rec.id"
              class="history-row"
              :class="{ active: selectedHistoryId === rec.id }"
              @click="selectedHistoryId = rec.id"
            >
              <div class="history-row-top">
                <span class="history-date text-base-c">{{ rec.orderDate }}</span>
                <span class="history-status" :class="rec.status === '已出貨' ? 'done' : 'pending'">{{ rec.status }}</span>
              </div>
              <div class="history-orderer text-muted-c">{{ rec.ordererName }}</div>
              <div class="history-summary text-hint-c">
                {{ rec.items.length }} 項品項 · 合計 ${{ rec.total }}
              </div>
            </div>
          </div>
        </template>

        <!-- ══ 品項管理 tab ══ -->
        <template v-if="sideTab === 'items'">
          <div class="config-scroll">
            <div class="add-group-row">
              <template v-if="addingGroup">
                <input
                  v-model="newGroupName"
                  placeholder="類別名稱"
                  class="edit-inp border-light-c bg-surface text-base-c"
                  @keyup.enter="confirmAddGroup"
                  @keyup.escape="addingGroup = false"
                >
                <button class="edit-ok" @click="confirmAddGroup">✓</button>
                <button class="edit-cancel border-light-c text-base-c" @click="addingGroup = false">✕</button>
              </template>
              <button v-else class="add-group-btn" @click="addingGroup = true; newGroupName = ''">＋ 新增類別</button>
            </div>

            <div v-for="(group, gi) in catalog" :key="group.id" class="group">
              <div class="group-header bg-surface">
                <span class="group-toggle" @click="toggleGroupOpen(gi)">{{ groupOpen[gi] === false ? '▶' : '▼' }}</span>
                <template v-if="editingGroupIdx === gi">
                  <input
                    v-model="editGroupName"
                    class="edit-inp group-name-inp"
                    @keyup.enter="confirmEditGroup(gi)"
                    @keyup.escape="editingGroupIdx = -1"
                  >
                  <button class="edit-ok sm" @click="confirmEditGroup(gi)">✓</button>
                  <button class="edit-cancel sm border-light-c text-base-c" @click="editingGroupIdx = -1">✕</button>
                </template>
                <template v-else>
                  <span class="group-name-label text-base-c">{{ group.group }}</span>
                  <span class="group-actions">
                    <button class="act-btn" title="改名" @click="startEditGroup(gi)">✎</button>
                    <template v-if="confirmDeleteGroupIdx === gi">
                      <span class="del-confirm-label">確定？</span>
                      <button class="del-yes" @click="confirmDeleteGroup(gi)">是</button>
                      <button class="del-no border-light-c text-base-c" @click="confirmDeleteGroupIdx = -1">否</button>
                    </template>
                    <button v-else class="act-btn del" title="刪除類別" @click="confirmDeleteGroupIdx = gi">✕</button>
                    <button class="group-add-btn" title="新增品項" @click="startAddItem(gi)">＋</button>
                  </span>
                </template>
              </div>

              <template v-if="groupOpen[gi] !== false">
                <div v-if="addingIn === gi" class="edit-row bg-surface border-b border-light-c">
                  <div class="edit-field-row">
                    <span class="edit-field-label">品名</span>
                    <input v-model="editForm.name" placeholder="品名" class="edit-inp border-light-c bg-surface text-base-c">
                  </div>
                  <div class="edit-field-row">
                    <span class="edit-field-label">單位</span>
                    <input v-model="editForm.unit" placeholder="單位（包/罐/盒...）" class="edit-inp border-light-c bg-surface text-base-c">
                  </div>
                  <div class="edit-field-row">
                    <span class="edit-field-label">單價</span>
                    <input v-model.number="editForm.price" type="number" min="0" placeholder="單價" class="edit-inp border-light-c bg-surface text-base-c">
                  </div>
                  <div class="edit-action-row">
                    <button class="edit-ok" @click="confirmAddItem(gi)">✓ 確認</button>
                    <button class="edit-cancel border-light-c text-base-c" @click="addingIn = -1">✕ 取消</button>
                  </div>
                </div>

                <div v-for="(p, pi) in group.items" :key="p.id">
                  <div v-if="editingKey === gi + '-' + pi" class="edit-row bg-surface border-b border-light-c">
                    <div class="edit-field-row">
                      <span class="edit-field-label">品名</span>
                      <input v-model="editForm.name" class="edit-inp border-light-c bg-surface text-base-c">
                    </div>
                    <div class="edit-field-row">
                      <span class="edit-field-label">單位</span>
                      <input v-model="editForm.unit" class="edit-inp border-light-c bg-surface text-base-c">
                    </div>
                    <div class="edit-field-row">
                      <span class="edit-field-label">單價</span>
                      <input v-model.number="editForm.price" type="number" min="0" class="edit-inp border-light-c bg-surface text-base-c">
                    </div>
                    <div class="edit-action-row">
                      <button class="edit-ok" @click="confirmEditItem(gi, pi)">✓ 確認</button>
                      <button class="edit-cancel border-light-c text-base-c" @click="editingKey = ''">✕ 取消</button>
                    </div>
                  </div>
                  <div v-else class="item-row config-item-row">
                    <div class="config-item-content">
                      <span class="zh-main">{{ p.name }}</span>
                      <span class="item-meta text-hint-c">{{ p.unit }} / ${{ p.price }}</span>
                      <span class="item-actions" style="opacity:1">
                        <button class="act-btn" title="編輯" @click="startEditItem(gi, pi, p)">✎</button>
                        <template v-if="confirmDeleteKey === gi + '-' + pi">
                          <span class="del-confirm-label">確定刪除？</span>
                          <button class="del-yes" @click="confirmDeleteItem(gi, pi)">是</button>
                          <button class="del-no border-light-c text-base-c" @click="confirmDeleteKey = ''">否</button>
                        </template>
                        <button v-else class="act-btn del" title="刪除" @click="confirmDeleteKey = gi + '-' + pi">✕</button>
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>
      </aside>

      <!-- ── 右側主要區 ── -->
      <main class="preview-area bg-surface2">
        <!-- 建立叫貨：表單 + 列印預覽 -->
        <template v-if="sideTab === 'create'">
          <div class="preview-toolbar bg-surface border-b border-light-c">
            <span class="preview-toolbar-label text-muted-c">叫貨單資訊</span>
          </div>

          <div class="form-panel">
            <div class="form-grid">
              <label class="form-field">
                <span class="form-label text-muted-c">訂購日期</span>
                <input v-model="form.orderDate" type="date" class="form-inp border-light-c bg-surface text-base-c">
              </label>
              <label class="form-field">
                <span class="form-label text-muted-c">訂購人</span>
                <input v-model="form.ordererName" class="form-inp border-light-c bg-surface text-base-c">
              </label>
              <label class="form-field">
                <span class="form-label text-muted-c">訂購人電話</span>
                <input v-model="form.ordererPhone" class="form-inp border-light-c bg-surface text-base-c">
              </label>
              <label class="form-field">
                <span class="form-label text-muted-c">訂購人傳真</span>
                <input v-model="form.ordererFax" class="form-inp border-light-c bg-surface text-base-c">
              </label>
            </div>

            <div class="ship-dates">
              <span class="form-label text-muted-c">出貨日期（可多筆）</span>
              <div v-for="(d, i) in form.shipDates" :key="i" class="ship-date-row">
                <input v-model="form.shipDates[i]" type="date" class="form-inp border-light-c bg-surface text-base-c">
                <button v-if="form.shipDates.length > 1" class="rule-del" @click="form.shipDates.splice(i, 1)">✕</button>
              </div>
              <button class="rule-add" @click="form.shipDates.push('')">＋ 新增出貨日期</button>
            </div>

            <label class="form-field" style="max-width:100%">
              <span class="form-label text-muted-c">備註</span>
              <input v-model="form.note" class="form-inp border-light-c bg-surface text-base-c" placeholder="感謝!隨貨附發票">
            </label>

            <!-- 已選品項表 -->
            <div class="order-table-wrap">
              <table class="order-table">
                <thead>
                <tr>
                  <th>序號</th>
                  <th style="text-align:left">品名</th>
                  <th>單位</th>
                  <th>數量</th>
                  <th>單價</th>
                  <th>金額</th>
                  <th></th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(it, i) in orderItems" :key="it.uid">
                  <td>{{ i + 1 }}</td>
                  <td style="text-align:left">{{ it.name }}</td>
                  <td>{{ it.unit }}</td>
                  <td><input v-model.number="it.qty" type="number" min="1" class="qty-inp bg-surface text-base-c border-light-c"></td>
                  <td><input v-model.number="it.price" type="number" min="0" class="qty-inp bg-surface text-base-c border-light-c"></td>
                  <td>{{ it.qty * it.price }}</td>
                  <td><button class="act-btn del" @click="orderItems.splice(i, 1)">✕</button></td>
                </tr>
                <tr v-if="orderItems.length === 0">
                  <td colspan="7" class="empty-order text-hint-c">尚未選擇品項，請由左側清單點選加入</td>
                </tr>
                </tbody>
              </table>
            </div>
            <div class="order-total text-base-c">合計金額：${{ totalAmount }}</div>
          </div>
        </template>

        <!-- 歷史紀錄：預覽選中的單據 -->
        <template v-else-if="sideTab === 'history'">
          <div class="preview-toolbar bg-surface border-b border-light-c">
            <span class="preview-toolbar-label text-muted-c">歷史叫貨紀錄</span>
            <template v-if="selectedHistory">
              <button class="auto-scale-btn" @click="loadFromHistory(selectedHistory)">📝 複製為新單</button>
              <button class="auto-scale-btn" @click="printHistory(selectedHistory)">🖨️ 列印此單</button>
              <button
                class="auto-scale-btn"
                @click="selectedHistory.status = selectedHistory.status === '已出貨' ? '待出貨' : '已出貨'"
              >
                {{ selectedHistory.status === '已出貨' ? '↺ 標記待出貨' : '✓ 標記已出貨' }}
              </button>
            </template>
          </div>
          <div v-if="!selectedHistory" class="empty-hint text-hint-c">請由左側選擇一筆紀錄查看內容</div>
          <div v-else class="history-detail">
            <div class="history-detail-card bg-surface border border-light-c">
              <div class="history-detail-row"><span class="text-muted-c">訂購日期</span><span class="text-base-c">{{ selectedHistory.orderDate }}</span></div>
              <div class="history-detail-row"><span class="text-muted-c">出貨日期</span><span class="text-base-c">{{ selectedHistory.shipDates.join('、') || '未填' }}</span></div>
              <div class="history-detail-row"><span class="text-muted-c">訂購人</span><span class="text-base-c">{{ selectedHistory.ordererName }}</span></div>
              <div class="history-detail-row"><span class="text-muted-c">狀態</span><span class="text-base-c">{{ selectedHistory.status }}</span></div>
              <table class="order-table" style="margin-top:10px">
                <thead>
                <tr><th>序號</th><th style="text-align:left">品名</th><th>單位</th><th>數量</th><th>單價</th><th>金額</th></tr>
                </thead>
                <tbody>
                <tr v-for="(it, i) in selectedHistory.items" :key="i">
                  <td>{{ i + 1 }}</td>
                  <td style="text-align:left">{{ it.name }}</td>
                  <td>{{ it.unit }}</td>
                  <td>{{ it.qty }}</td>
                  <td>{{ it.price }}</td>
                  <td>{{ it.qty * it.price }}</td>
                </tr>
                </tbody>
              </table>
              <div class="order-total text-base-c">合計金額：${{ selectedHistory.total }}</div>
              <div v-if="selectedHistory.note" class="text-hint-c" style="margin-top:6px">備註：{{ selectedHistory.note }}</div>
            </div>
          </div>
        </template>

        <!-- 品項管理：分類總覽 -->
        <template v-else>
          <div class="preview-toolbar bg-surface border-b border-light-c">
            <span class="preview-toolbar-label text-muted-c">品項總覽（供叫貨單選用的預設品名／單位／單價）</span>
          </div>
          <div class="config-preview-wrap">
            <div v-for="group in catalog" :key="group.id">
              <div class="config-preview-group-label text-muted-c">{{ group.group }}</div>
              <div class="catalog-grid">
                <div v-for="p in group.items" :key="p.id" class="catalog-card bg-surface border border-light-c">
                  <div class="catalog-name text-base-c">{{ p.name }}</div>
                  <div class="catalog-meta text-hint-c">{{ p.unit }} · ${{ p.price }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </main>
    </div>

    <!-- ══ 純列印用區塊（畫面上不顯示，只在列印時出現）══ -->
    <div id="print-root">
      <div v-for="(sheet, si) in printQueue" :key="si" class="print-sheet">
        <div class="print-dates">
          <div>訂購日期 : {{ formatDateWithWeekday(sheet.orderDate) }}</div>
          <div v-for="(d, i) in sheet.shipDates.filter(Boolean)" :key="i">出貨日期 : {{ formatDateWithWeekday(d) }}</div>
        </div>

        <div class="print-parties">
          <div class="print-party">
            <div>TO：{{ sheet.toName }}</div>
            <div>電話：{{ sheet.toPhone }}</div>
            <div>傳真：{{ sheet.toFax }}</div>
          </div>
          <div class="print-party">
            <div>訂購人：{{ sheet.ordererName }}</div>
            <div>電話：{{ sheet.ordererPhone }}</div>
            <div>傳真：{{ sheet.ordererFax }}</div>
          </div>
        </div>

        <table class="print-table">
          <thead>
          <tr><th style="width:8%">序號</th><th style="width:42%">品名</th><th style="width:12%">單位</th><th style="width:12%">數量</th><th style="width:13%">單價</th><th style="width:13%">金額</th></tr>
          </thead>
          <tbody>
          <tr v-for="(it, i) in sheet.items" :key="i">
            <td>{{ i + 1 }}</td>
            <td style="text-align:left">{{ it.name }}</td>
            <td>{{ it.unit }}</td>
            <td>{{ it.qty }}</td>
            <td>{{ it.price }}</td>
            <td>{{ it.qty * it.price }}</td>
          </tr>
          <tr>
            <td colspan="5" style="text-align:right;font-weight:bold">合計</td>
            <td style="font-weight:bold">{{ sheet.items.reduce((s, it) => s + it.qty * it.price, 0) }}</td>
          </tr>
          </tbody>
        </table>

        <div class="print-note">{{ sheet.note }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'

  definePageMeta({ layout: 'staff', requiredPermission: 'print.guild-hall-print' })

  /* ══════════════════════════════════
     TODO（接後端時使用）：
     const commonStore = useCommonStore()
     const BASE = () => commonStore.data.main_url + '/holy/order'
     目前先以本地模擬資料運作，之後可將
     loadCatalog / loadHistory / saveOrder / saveCatalog
     換成 apiFetch(`${BASE()}/...`) 呼叫並用 useApiFetch 處理回應。
  ══════════════════════════════════ */

  const sideTab = ref('create')
  const mobileOpen = ref(false)

  /* ── 固定聯絡資訊預設值 ── */
  const DEFAULT_TO = { toName: '店長&會館同仁', toPhone: '345719', toFax: '347422' }
  const DEFAULT_ORDERER = { ordererName: '農莊/應芝雲', ordererPhone: '381382分機888', ordererFax: '381303' }

  function todayStr() {
    return new Date().toISOString().slice(0, 10)
  }
  function addDaysStr(days) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }
  function formatDateWithWeekday(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return dateStr
    const wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}(${wk})`
  }

  /* ══════════════════════════════════
     品項目錄（模擬資料，對應 會館叫貨.xlsx 各分頁）
  ══════════════════════════════════ */
  const catalog = reactive([
    {
      id: 1,
      group: '堅果類',
      items: [
        { id: 11, name: '夏威夷豆350g', unit: '包', price: 580 },
        { id: 12, name: '夏威夷豆200g', unit: '包', price: 380 },
        { id: 13, name: '綜合堅果220g', unit: '包', price: 200 },
        { id: 14, name: '綜合堅果450g', unit: '包', price: 240 },
        { id: 15, name: '葡萄乾250g', unit: '包', price: 100 }
      ]
    },
    {
      id: 2,
      group: '芝麻醬類',
      items: [
        { id: 21, name: '黑芝麻醬(有糖)', unit: '罐', price: 120 },
        { id: 22, name: '芝麻醬3入紙盒', unit: '組', price: 15 },
        { id: 23, name: '黑芝麻醬-桶裝', unit: '桶', price: 1800 }
      ]
    },
    {
      id: 3,
      group: '咖啡類',
      items: [
        { id: 31, name: '陽光咖啡豆(半磅)', unit: '包', price: 240 },
        { id: 32, name: '陽光咖啡豆(1磅)', unit: '包', price: 480 }
      ]
    },
    {
      id: 4,
      group: '生活用品',
      items: [
        { id: 41, name: '環保餐盒', unit: '盒', price: 500 },
        { id: 42, name: '菜瓜布', unit: '個', price: 60 }
      ]
    }
  ])
  const groupOpen = reactive({})
  function toggleGroupOpen(gi) {
    groupOpen[gi] = groupOpen[gi] === false ? true : false
  }

  let nextItemId = 100
  let nextGroupId = 100

  /* ── 品項管理：新增/編輯/刪除類別與品項 ── */
  const addingGroup = ref(false)
  const newGroupName = ref('')
  function confirmAddGroup() {
    const name = newGroupName.value.trim()
    if (!name) return
    catalog.push({ id: nextGroupId++, group: name, items: [] })
    addingGroup.value = false
  }

  const editingGroupIdx = ref(-1)
  const editGroupName = ref('')
  function startEditGroup(gi) {
    editingGroupIdx.value = gi
    editGroupName.value = catalog[gi].group
  }
  function confirmEditGroup(gi) {
    const name = editGroupName.value.trim()
    if (name) catalog[gi].group = name
    editingGroupIdx.value = -1
  }
  const confirmDeleteGroupIdx = ref(-1)
  function confirmDeleteGroup(gi) {
    catalog.splice(gi, 1)
    confirmDeleteGroupIdx.value = -1
  }

  const addingIn = ref(-1)
  const editingKey = ref('')
  const editForm = reactive({ name: '', unit: '', price: 0 })
  function startAddItem(gi) {
    addingIn.value = gi
    editingKey.value = ''
    editForm.name = ''
    editForm.unit = ''
    editForm.price = 0
  }
  function confirmAddItem(gi) {
    if (!editForm.name.trim()) return
    catalog[gi].items.push({ id: nextItemId++, name: editForm.name.trim(), unit: editForm.unit.trim() || '個', price: editForm.price || 0 })
    addingIn.value = -1
  }
  function startEditItem(gi, pi, p) {
    editingKey.value = gi + '-' + pi
    addingIn.value = -1
    editForm.name = p.name
    editForm.unit = p.unit
    editForm.price = p.price
  }
  function confirmEditItem(gi, pi) {
    Object.assign(catalog[gi].items[pi], { name: editForm.name, unit: editForm.unit, price: editForm.price })
    editingKey.value = ''
  }
  const confirmDeleteKey = ref('')
  function confirmDeleteItem(gi, pi) {
    catalog[gi].items.splice(pi, 1)
    confirmDeleteKey.value = ''
  }

  /* ══════════════════════════════════
     建立叫貨單
  ══════════════════════════════════ */
  const searchQuery = ref('')
  const searchResults = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return []
    const all = catalog.flatMap(g => g.items)
    return all.filter(p => p.name.toLowerCase().includes(q))
  })

  const form = reactive({
    orderDate: todayStr(),
    shipDates: [addDaysStr(1)],
    ...DEFAULT_TO,
    ...DEFAULT_ORDERER,
    note: '感謝!隨貨附發票'
  })

  let nextUid = 1
  const orderItems = reactive([])
  function addItemToOrder(p) {
    const exist = orderItems.find(it => it.catalogId === p.id)
    if (exist) {
      exist.qty += 1
      return
    }
    orderItems.push({ uid: nextUid++, catalogId: p.id, name: p.name, unit: p.unit, price: p.price, qty: 1 })
  }
  const totalAmount = computed(() => orderItems.reduce((s, it) => s + it.qty * it.price, 0))

  /* ══════════════════════════════════
     歷史紀錄（模擬資料）
  ══════════════════════════════════ */
  const orderHistory = reactive([
    {
      id: 1,
      orderDate: '2026-06-17',
      shipDates: ['2026-06-24'],
      ...DEFAULT_TO,
      ...DEFAULT_ORDERER,
      items: [{ name: '黑芝麻醬(有糖)', unit: '罐', price: 120, qty: 60 }],
      note: '感謝!隨貨附發票',
      status: '已出貨',
      total: 7200
    },
    {
      id: 2,
      orderDate: '2026-06-29',
      shipDates: ['2026-06-30'],
      ...DEFAULT_TO,
      ordererName: '農莊/賈德蘭',
      ordererPhone: '381382分機888',
      ordererFax: '381303',
      items: [{ name: '黑芝麻醬-桶裝', unit: '桶', price: 1800, qty: 1 }],
      note: '感謝!隨貨附發票',
      status: '已出貨',
      total: 1800
    },
    {
      id: 3,
      orderDate: '2026-07-06',
      shipDates: ['2026-07-07'],
      ...DEFAULT_TO,
      ordererName: '農莊/賈德蘭',
      ordererPhone: '381382分機888',
      ordererFax: '381303',
      items: [{ name: '陽光咖啡豆(半磅)', unit: '包', price: 240, qty: 8 }],
      note: '7/07到貨 , 感謝!隨貨附發票',
      status: '待出貨',
      total: 1920
    }
  ])
  const historyQuery = ref('')
  const filteredHistory = computed(() => {
    const q = historyQuery.value.trim().toLowerCase()
    const sorted = [...orderHistory].sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    if (!q) return sorted
    return sorted.filter(r => r.ordererName.toLowerCase().includes(q) || r.items.some(it => it.name.toLowerCase().includes(q)))
  })
  const selectedHistoryId = ref(null)
  const selectedHistory = computed(() => orderHistory.find(r => r.id === selectedHistoryId.value) || null)

  let nextHistoryId = 100
  function saveOrder() {
    if (orderItems.length === 0) return
    orderHistory.push({
      id: nextHistoryId++,
      orderDate: form.orderDate,
      shipDates: [...form.shipDates],
      toName: form.toName,
      toPhone: form.toPhone,
      toFax: form.toFax,
      ordererName: form.ordererName,
      ordererPhone: form.ordererPhone,
      ordererFax: form.ordererFax,
      items: orderItems.map(it => ({ name: it.name, unit: it.unit, price: it.price, qty: it.qty })),
      note: form.note,
      status: '待出貨',
      total: totalAmount.value
    })
    sideTab.value = 'history'
  }

  function loadFromHistory(rec) {
    form.orderDate = todayStr()
    form.shipDates = [addDaysStr(1)]
    form.toName = rec.toName
    form.toPhone = rec.toPhone
    form.toFax = rec.toFax
    form.ordererName = rec.ordererName
    form.ordererPhone = rec.ordererPhone
    form.ordererFax = rec.ordererFax
    form.note = rec.note
    orderItems.splice(0)
    rec.items.forEach(it => orderItems.push({ uid: nextUid++, catalogId: null, name: it.name, unit: it.unit, price: it.price, qty: it.qty }))
    sideTab.value = 'create'
  }

  /* ══════════════════════════════════
     列印
  ══════════════════════════════════ */
  const printQueue = ref([])
  function doPrint() {
    if (orderItems.length === 0) return
    printQueue.value = [{
      orderDate: form.orderDate,
      shipDates: [...form.shipDates],
      toName: form.toName,
      toPhone: form.toPhone,
      toFax: form.toFax,
      ordererName: form.ordererName,
      ordererPhone: form.ordererPhone,
      ordererFax: form.ordererFax,
      items: orderItems.map(it => ({ name: it.name, unit: it.unit, price: it.price, qty: it.qty })),
      note: form.note
    }]
    requestAnimationFrame(() => window.print())
  }
  function printHistory(rec) {
    printQueue.value = [{ ...rec, shipDates: [...rec.shipDates], items: rec.items.map(it => ({ ...it })) }]
    requestAnimationFrame(() => window.print())
  }
</script>

<style scoped>
  /* ══ 版面骨架 ══ */
  .layout {
    display: flex;
    height: calc(100vh - var(--nav-height, 44px));
    overflow: hidden;
  }

  .sidebar {
    width: 320px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    padding: 9px 4px;
    font-size: 12px;
    border: none;
    cursor: pointer;
    background: transparent;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    flex-shrink: 0;
  }

  .search-inp {
    flex: 1;
    border: 1px solid var(--border-light, #ddd);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 12px;
    outline: none;
  }

  .search-clear {
    cursor: pointer;
    font-size: 13px;
    background: transparent;
    border: none;
  }

  .list-scroll, .config-scroll {
    flex: 1;
    overflow-y: auto;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
  }

  .group-toggle {
    cursor: pointer;
    font-size: 10px;
    opacity: .6;
  }

  .group-name-label {
    flex: 1;
  }

  .group-count {
    font-size: 11px;
  }

  .group-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .item-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px 7px 22px;
    font-size: 12.5px;
    cursor: pointer;
    border-bottom: 1px solid rgba(128,128,128,.08);
  }

  .item-row:hover {
    background: rgba(16, 185, 129, .08);
  }

  .zh-main {
    flex: 1;
  }

  .item-meta {
    font-size: 11px;
    white-space: nowrap;
  }

  .add-mark {
    font-size: 13px;
    opacity: .5;
  }

  .config-item-row {
    padding-left: 12px;
    cursor: default;
  }

  .config-item-content {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .item-actions {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }

  .act-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    opacity: .55;
    padding: 2px 4px;
  }

  .act-btn:hover {
    opacity: 1;
  }

  .act-btn.del:hover {
    color: #ef4444;
  }

  .del-confirm-label {
    font-size: 11px;
    opacity: .7;
  }

  .del-yes, .del-no {
    border: 1px solid;
    border-radius: 5px;
    font-size: 11px;
    padding: 1px 6px;
    cursor: pointer;
  }

  .del-yes {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
  }

  .empty-search {
    font-size: 12px;
    padding: 16px;
    text-align: center;
  }

  .add-group-row {
    display: flex;
    gap: 6px;
    padding: 8px 10px;
  }

  .add-group-btn, .rule-add {
    border: 1px dashed;
    background: transparent;
    border-radius: 8px;
    font-size: 12px;
    padding: 6px 10px;
    cursor: pointer;
    opacity: .75;
  }

  .edit-row {
    padding: 8px 10px 8px 22px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .edit-field-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .edit-field-label {
    font-size: 11px;
    opacity: .6;
    width: 34px;
    flex-shrink: 0;
  }

  .edit-inp {
    flex: 1;
    border: 1px solid var(--border-light, #ddd);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 12px;
    outline: none;
  }

  .group-name-inp {
    flex: 1;
    border: 1px solid var(--border-light, #ddd);
    border-radius: 6px;
    padding: 3px 6px;
    font-size: 12px;
  }

  .edit-ok, .edit-cancel, .group-add-btn {
    border: 1px solid;
    border-radius: 6px;
    font-size: 12px;
    padding: 3px 8px;
    cursor: pointer;
  }

  .edit-ok {
    background: #10b981;
    color: white;
    border-color: #10b981;
  }

  .edit-ok.sm, .edit-cancel.sm {
    padding: 2px 6px;
    font-size: 11px;
  }

  .group-add-btn {
    background: transparent;
    border-color: rgba(128,128,128,.3);
  }

  .edit-action-row {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .sidebar-footer {
    padding: 10px 12px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .print-btn, .save-btn, .print-nav-btn {
    border: none;
    border-radius: 8px;
    padding: 9px;
    font-size: 13px;
    cursor: pointer;
    font-weight: bold;
  }

  .print-btn {
    background: #10b981;
    color: white;
  }

  .save-btn {
    background: transparent;
    border: 1px solid #10b981;
    color: #10b981;
  }

  .print-btn:disabled, .save-btn:disabled, .print-nav-btn:disabled {
    opacity: .4;
    cursor: not-allowed;
  }

  .print-nav-btn {
    background: #10b981;
    color: white;
  }

  /* ── 歷史紀錄清單 ── */
  .history-row {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(128,128,128,.1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .history-row:hover {
    background: rgba(16, 185, 129, .06);
  }

  .history-row.active {
    background: rgba(16, 185, 129, .14);
  }

  .history-row-top {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    font-weight: bold;
  }

  .history-status {
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 999px;
  }

  .history-status.done {
    background: rgba(16,185,129,.15);
    color: #059669;
  }

  .history-status.pending {
    background: rgba(234,179,8,.18);
    color: #b45309;
  }

  .history-orderer, .history-summary {
    font-size: 11.5px;
  }

  /* ── 主要區 ── */
  .preview-area {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .preview-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .preview-toolbar-label {
    font-size: 12px;
    opacity: .8;
  }

  .auto-scale-btn {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid #10b981;
    background: transparent;
    color: #10b981;
  }

  .empty-hint {
    font-size: 14px;
    padding: 60px 20px;
    text-align: center;
  }

  /* ── 建立叫貨表單 ── */
  .form-panel {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 900px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-label {
    font-size: 11px;
  }

  .form-inp {
    border: 1px solid var(--border-light, #ddd);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 13px;
    outline: none;
  }

  .ship-dates {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ship-date-row {
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 260px;
  }

  .rule-del {
    border: none;
    background: transparent;
    cursor: pointer;
    opacity: .5;
    font-size: 12px;
  }

  .order-table-wrap {
    overflow-x: auto;
  }

  .order-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .order-table th, .order-table td {
    border: 1px solid rgba(128,128,128,.25);
    padding: 6px 8px;
    text-align: center;
  }

  .qty-inp {
    width: 64px;
    border: 1px solid var(--border-light, #ddd);
    border-radius: 6px;
    padding: 3px 6px;
    text-align: center;
    font-size: 12.5px;
  }

  .empty-order {
    text-align: center;
    padding: 20px;
  }

  .order-total {
    text-align: right;
    font-weight: bold;
    font-size: 15px;
  }

  /* ── 歷史紀錄詳情 ── */
  .history-detail {
    padding: 16px;
  }

  .history-detail-card {
    border-radius: 10px;
    padding: 16px;
    max-width: 700px;
  }

  .history-detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 3px 0;
  }

  /* ── 品項總覽 ── */
  .config-preview-wrap {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .config-preview-group-label {
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 6px;
  }

  .catalog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }

  .catalog-card {
    border-radius: 8px;
    padding: 10px 12px;
  }

  .catalog-name {
    font-size: 13px;
    font-weight: bold;
  }

  .catalog-meta {
    font-size: 11.5px;
    margin-top: 2px;
  }

  /* ══ 手機響應式 ══ */
  .mobile-topbar {
    display: none;
    flex-shrink: 0;
  }

  .mobile-topbar-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
  }

  .mobile-topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mobile-menu-btn {
    background: transparent;
    border: 1px solid;
    border-radius: 8px;
    width: 36px;
    height: 36px;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mobile-menu-btn.active {
    background: #10b981;
    color: white;
    border-color: #10b981;
  }

  .mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.4);
    z-index: 40;
    backdrop-filter: blur(2px);
  }

  @media (max-width: 767px) {
    .mobile-topbar { display: flex; }
    .mobile-overlay { display: block; }
    .layout { flex-direction: column; height: calc(100vh - var(--nav-height, 44px)); }
    .sidebar {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      width: min(320px, 88vw);
      transform: translateX(-110%);
      transition: transform .25s cubic-bezier(.4,0,.2,1);
      z-index: 50;
      border-right: 1px solid;
      box-shadow: 4px 0 24px rgba(0,0,0,.18);
    }
    .sidebar.open { transform: translateX(0); }
    .sidebar-header { display: none; }
    .preview-area { flex: 1; overflow-y: auto; }
  }

  /* ══ 列印區塊：畫面上隱藏 ══ */
  #print-root {
    display: none;
  }

  @media print {
    .layout, .mobile-topbar, .mobile-overlay {
      display: none !important;
    }
    #print-root {
      display: block !important;
    }
  }
</style>

<style>
  /* 列印樣式需為全域（非 scoped），確保 @page 與列印區塊生效 */
  @media print {
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    body * {
      visibility: hidden;
    }
    #print-root, #print-root * {
      visibility: visible;
    }
    #print-root {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
    }
  }

  .print-sheet {
    font-family: '標楷體', 'DFKai-SB', 'Microsoft JhengHei', sans-serif;
    color: #111;
    page-break-after: always;
  }

  .print-dates {
    font-size: 18px;
    margin-bottom: 14px;
    line-height: 1.7;
  }

  .print-parties {
    display: flex;
    justify-content: space-between;
    font-size: 16px;
    line-height: 1.8;
    margin-bottom: 18px;
  }

  .print-party {
    flex: 1;
  }

  .print-party:last-child {
    text-align: right;
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 17px;
  }

  .print-table th, .print-table td {
    border: 1px solid #333;
    padding: 9px 10px;
    text-align: center;
  }

  .print-note {
    margin-top: 14px;
    font-size: 16px;
  }
</style>
