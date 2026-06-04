<script setup>
definePageMeta({ layout: 'staff' })
import { ref, reactive, computed, h, nextTick } from 'vue'
useHead({ title: 'SOP 手冊 — 聖母健康農莊' })

// ─────────────────────────────────────────
// Edit Mode
// ─────────────────────────────────────────
const editMode = ref(false)

// ─────────────────────────────────────────
// Inline components
// ─────────────────────────────────────────
const SopCard = {
  props: { title: String, badge: String, badgeType: { default: 'gray' } },
  setup(props, { slots }) {
    const open = ref(true)
    const bc = { green:'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', orange:'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', gray:'bg-stone-100 text-stone-500 dark:bg-zinc-700 dark:text-stone-300' }
    return () => h('div', { class:'bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm mb-3 overflow-hidden' }, [
      h('div', { class:'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/60 transition-colors select-none border-b border-stone-100 dark:border-stone-800', onClick:()=>{ open.value=!open.value } }, [
        h('span', { class:'flex-1 font-semibold text-stone-800 dark:text-stone-100 text-sm' }, props.title),
        props.badge ? h('span', { class:`text-xs font-medium px-2 py-0.5 rounded-full ${bc[props.badgeType]||bc.gray}` }, props.badge) : null,
        h('svg', { class:`w-4 h-4 text-stone-400 transition-transform duration-200 ${open.value?'rotate-180':''}`, fill:'none', stroke:'currentColor', viewBox:'0 0 24 24' }, [h('path', { 'stroke-linecap':'round','stroke-linejoin':'round','stroke-width':2, d:'M19 9l-7 7-7-7' })]),
      ]),
      open.value ? h('div', { class:'px-4 py-3' }, slots.default?.()) : null,
    ])
  },
}

// ─────────────────────────────────────────
// SOP Data model
// pages[].blocks[] can be:
//   { type:'checklist', title, badge, badgeType, items:[{id,text,done}] }
//   { type:'steps',     title, badge, badgeType, items:[{id,title,desc}] }
//   { type:'flowchart', title, nodes:[], edges:[] }
//   { type:'note',      title, content, variant:'warn'|'info'|'default' }
// ─────────────────────────────────────────
let _uid = 1000
const uid = () => String(++_uid)

const sopData = reactive({
  groups: [
    // ── 收銀 / 交易 ──
    {
      id: 'g1', label: '收銀 / 交易',
      pages: [
        {
          id: 'cashier', label: '收銀流程',
          icon: [['rect',{x:2,y:5,width:20,height:14,rx:2}],['path',{d:'M2 10h20'}]],
          blocks: [
            {
              type: 'flowchart', id: 'fc1', title: '收銀流程圖',
              nodes: [
                { id:'n1',  type:'rect',    label:'一般客人',         x:60,  y:30,  w:120, h:40, palette:'customer', sub:'' },
                { id:'n2',  type:'rect',    label:'VIP 客人',         x:280, y:30,  w:120, h:40, palette:'customer', sub:'' },
                { id:'n3',  type:'rect',    label:'員工',             x:500, y:30,  w:120, h:40, palette:'customer', sub:'' },
                { id:'n4',  type:'rect',    label:'建立訂單',         x:165, y:130, w:310, h:64, palette:'order',    sub:'可複選：物品含餐券 ／ 物品不含餐券 ／ 午餐' },
                { id:'n14', type:'diamond', label:'是否含餐券品項？', x:255, y:250, w:150, h:60, palette:'neutral',  sub:'' },
                { id:'n15', type:'diamond', label:'是否只有午餐？',   x:460, y:360, w:150, h:60, palette:'neutral',  sub:'' },
                { id:'n5',  type:'rect',    label:'現金',             x:15,  y:370, w:80,  h:40, palette:'payment',  sub:'' },
                { id:'n6',  type:'rect',    label:'刷卡',             x:110, y:370, w:80,  h:40, palette:'payment',  sub:'' },
                { id:'n7',  type:'rect',    label:'線上支付',         x:205, y:370, w:100, h:40, palette:'payment',  sub:'' },
                { id:'n8',  type:'rect',    label:'員工消費券',       x:318, y:370, w:120, h:40, palette:'payment',  sub:'' },
                { id:'n9',  type:'rect',    label:'以餐券結帳',       x:470, y:490, w:130, h:40, palette:'payment',  sub:'僅限含餐券品項' },
                { id:'n10', type:'diamond', label:'是否用載具？',     x:140, y:490, w:150, h:60, palette:'neutral',  sub:'（選填）' },
                { id:'n11', type:'rect',    label:'發票打勾（載具）', x:20,  y:620, w:160, h:44, palette:'invoice',  sub:'' },
                { id:'n16', type:'diamond', label:'是否有統編？',     x:270, y:610, w:150, h:60, palette:'neutral',  sub:'' },
                { id:'n17', type:'rect',    label:'統編發票',         x:170, y:740, w:130, h:44, palette:'invoice',  sub:'填入統一編號' },
                { id:'n12', type:'rect',    label:'帳單打勾（紙本）', x:390, y:740, w:160, h:44, palette:'receipt',  sub:'' },
                { id:'n13', type:'rect',    label:'交易完成',         x:220, y:860, w:160, h:44, palette:'neutral',  sub:'' },
              ],
              edges: [
                { id:'e1',  from:'n1',  to:'n4',  label:'', mid:null },
                { id:'e2',  from:'n2',  to:'n4',  label:'', mid:null },
                { id:'e3',  from:'n3',  to:'n4',  label:'', mid:null },
                { id:'e18', from:'n4',  to:'n14', label:'', mid:null },
                { id:'e19', from:'n14', to:'n15', label:'是', mid:null },
                { id:'e20', from:'n15', to:'n13', label:'是', mid:null },
                { id:'e21', from:'n15', to:'n9',  label:'否', mid:null },
                { id:'e4',  from:'n14', to:'n5',  label:'否', mid:null },
                { id:'e5',  from:'n14', to:'n6',  label:'', mid:null },
                { id:'e6',  from:'n14', to:'n7',  label:'', mid:null },
                { id:'e7',  from:'n14', to:'n8',  label:'', mid:null },
                { id:'e9',  from:'n5',  to:'n10', label:'', mid:null },
                { id:'e10', from:'n6',  to:'n10', label:'', mid:null },
                { id:'e11', from:'n7',  to:'n10', label:'', mid:null },
                { id:'e12', from:'n8',  to:'n10', label:'', mid:null },
                { id:'e13', from:'n9',  to:'n10', label:'', mid:null },
                { id:'e14', from:'n10', to:'n11', label:'是', mid:null },
                { id:'e15', from:'n10', to:'n16', label:'否', mid:null },
                { id:'e22', from:'n16', to:'n17', label:'是', mid:null },
                { id:'e23', from:'n16', to:'n12', label:'否', mid:null },
                { id:'e16', from:'n11', to:'n13', label:'', mid:null },
                { id:'e24', from:'n17', to:'n13', label:'', mid:null },
                { id:'e17', from:'n12', to:'n13', label:'', mid:null },
              ],
            },
          ],
        },
        {
          id: 'delivery', label: '宅配',
          icon: [['path',{d:'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3'}],['rect',{x:9,y:11,width:14,height:10,rx:1}],['circle',{cx:12,cy:21,r:1}],['circle',{cx:20,cy:21,r:1}]],
          blocks: [
            {
              type: 'steps', id: 'b_del1', title: '📋 接單流程', badge: '5 步驟', badgeType: 'green',
              items: [
                { id:'s1', title:'查詢或建立客戶資料', desc:'ERP → 基本資料 → 客戶資料管理 → 輸入客戶名稱搜尋\n舊客戶：複製客戶代碼｜新客戶：新增（取最後一碼 +1）\n必填：客戶代號、名稱、電話、地址、身分勾選「客戶」' },
                { id:'s2', title:'建立銷貨單', desc:'ERP → 進銷存 → 銷貨管理 → 銷貨單維護 → 新增\n場別：聖母農莊；填交貨日期、客戶代碼、品項、數量、金額\n備註範例：7/25(四)宅配，貨到付款，發票隨貨附上/回捐' },
                { id:'s3', title:'填寫宅配資料', desc:'選擇宅配資料 → 填收件人、寄件日、送達日、件數、溫層（常溫/冷藏/冷凍）\n內容物盡量填完整；有代收款需填「代收款項」' },
                { id:'s4', title:'列印 & 匯入黑貓宅配單', desc:'選「黑貓宅配單二模(新版)-(A4)：CSV」→ 存至桌面宅配單資料夾\n開啟黑貓宅配網頁 → 建立託運單 → 匯入 → 瀏覽選檔 → 第一項不勾 → 確認資料後列印' },
                { id:'s5', title:'訂單彙整歸檔', desc:'依日期收納至資料夾，裝訂準備出貨' },
              ],
            },
            {
              type: 'checklist', id: 'b_del2', title: '🛒 每日購物車檢查', badge: '', badgeType: 'gray',
              items: [
                { id:'c1', text:'查看新訂單（紅色標示）', done:false },
                { id:'c2', text:'確認客戶資訊', done:false },
                { id:'c3', text:'聯絡確認出貨日', done:false },
                { id:'c4', text:'更改狀態至「出貨中」', done:false },
              ],
            },
            {
              type: 'note', id: 'b_del3', title: '📞 宅配業者聯絡',
              content: '每天早上 9:30–10:00 前電話通知業者取件\n🐱 黑貓：使用宅配網頁系統建立\n🚚 新竹物流：另開系統建立託運單',
              variant: 'info',
            },
            {
              type: 'note', id: 'b_del4', title: '💬 匯款通知簡訊',
              content: '使用農莊簡訊系統，費用每則扣 3 點\n目前餘約 291 點（≈100則）\n額度不足時向敏利申請儲值（約 3,000–6,000元/次）',
              variant: 'warn',
            },
          ],
        },
        {
          id: 'sell', label: '賣物品',
          icon: [['path',{d:'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'}],['line',{x1:3,y1:6,x2:21,y2:6}],['path',{d:'M16 10a4 4 0 0 1-8 0'}]],
          blocks: [
            {
              type: 'note', id: 'b_sell1', title: '🏪 銷售類別',
              content: '現場販售：直接結帳\n線上販售：確認付款狀態後再進行備貨或宅配出貨',
              variant: 'info',
            },
          ],
        },
      ],
    },
    // ── 定期任務 ──
    {
      id: 'g2', label: '定期任務',
      pages: [
        {
          id: 'daily', label: '每日作業',
          icon: [['rect',{x:3,y:4,width:18,height:18,rx:2}],['line',{x1:16,y1:2,x2:16,y2:6}],['line',{x1:8,y1:2,x2:8,y2:6}],['line',{x1:3,y1:10,x2:21,y2:10}]],
          blocks: [
            {
              type: 'checklist', id: 'b_d1', title: '📊 每日日報', badge: '小舖 ＋ 餐廳', badgeType: 'green',
              items: [
                { id:'d1', text:'印出日報', done:false },
                { id:'d2', text:'清點小舖物品數量，對照日報數字', done:false },
                { id:'d3', text:'清點餐廳物品數量，對照日報數字', done:false },
                { id:'d4', text:'若有差異立即回報主管', done:false },
              ],
            },
          ],
        },
        {
          id: 'monthly', label: '每月作業',
          icon: [['path',{d:'M3 3v5h5'}],['path',{d:'M3.05 13A9 9 0 1 0 6 5.3L3 8'}]],
          blocks: [
            {
              type: 'checklist', id: 'b_m1', title: '📋 月報統整', badge: '小舖 ＋ 餐廳', badgeType: 'green',
              items: [
                { id:'m1', text:'印出月報（小舖）', done:false },
                { id:'m2', text:'印出月報（餐廳）', done:false },
                { id:'m3', text:'將小舖資料統整歸檔', done:false },
                { id:'m4', text:'將餐廳資料統整歸檔', done:false },
              ],
            },
          ],
        },
        {
          id: 'car', label: '公務車',
          icon: [['path',{d:'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'}],['path',{d:'M14 3l3 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1'}],['circle',{cx:7,cy:17,r:2}],['circle',{cx:17,cy:17,r:2}],['path',{d:'M5 9h4l2-4'}]],
          blocks: [
            {
              type: 'steps', id: 'b_c1', title: '⛽ 月初：匯入油脂資料', badge: '每月必做', badgeType: 'orange',
              items: [
                { id:'cs1', title:'從中油平台下載加油明細', desc:'中油車隊卡平台 → 加油明細查詢 → 選上月區間 → 轉出 CSV / Excel' },
                { id:'cs2', title:'匯入公務車管理系統', desc:'公務車管理系統 → 報表 → 導入油脂資料 → 匯入剛存的 Excel → 上傳' },
              ],
            },
            {
              type: 'checklist', id: 'b_c2', title: '🔧 日常維護', badge: '建議每週', badgeType: 'gray',
              items: [
                { id:'cv1', text:'進入系統查看車輛異常記錄，發現異常立即修正', done:false },
                { id:'cv2', text:'確認車輛驗車到期日，到期前安排驗車並更新系統日期', done:false },
                { id:'cv3', text:'確認加油卡餘額（系統 Email 通知）— 不足時以核銷單申請儲值 NT$6,000', done:false },
                { id:'cv4', text:'借車需線上申請或請代登記，每次使用掃 QR Code 建立記錄', done:false },
              ],
            },
          ],
        },
      ],
    },
    // ── 餐廳作業 ──
    {
      id: 'g3', label: '餐廳作業',
      pages: [
        {
          id: 'restaurant_inner', label: '田園餐廳內場',
          icon: [['path',{d:'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2'}],['path',{d:'M7 2v20'}],['path',{d:'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7'}]],
          blocks: [
            {
              type: 'checklist', id: 'b_ri1', title: '🌅 上午備餐', badge: '7 項', badgeType: 'green',
              items: [
                { id:'rm1', text:'排放昨天洗好的盤子碗筷', done:false },
                { id:'rm2', text:'放接茶滴下來的盆子', done:false },
                { id:'rm3', text:'準備沙拉', done:false },
                { id:'rm4', text:'準備鹹湯（填湯）', done:false },
                { id:'rm5', text:'準備茶', done:false },
                { id:'rm6', text:'準備 5 道菜', done:false },
                { id:'rm7', text:'準備康樂失智餐', done:false },
              ],
            },
            {
              type: 'checklist', id: 'b_ri2', title: '🌇 下午收場', badge: '1:30 後', badgeType: 'orange',
              items: [
                { id:'ra1', text:'收餐具回收區的餐具', done:false },
                { id:'ra2', text:'收沙拉吧區和主食飲料區', done:false },
                { id:'ra3', text:'擦沙拉吧區和主食飲料區桌子', done:false },
                { id:'ra4', text:'把廚餘桶和骨頭桶收到裡面，換垃圾袋', done:false },
                { id:'ra5', text:'洗餐具', done:false },
                { id:'ra6', text:'洗盤子鍋子', done:false },
                { id:'ra7', text:'洗地板', done:false },
              ],
            },
          ],
        },
        {
          id: 'restaurant_outer', label: '田園餐廳外場',
          icon: [['path',{d:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'}],['polyline',{points:'9 22 9 12 15 12 15 22'}]],
          blocks: [
            {
              type: 'checklist', id: 'b_ro1', title: '🧹 外場清潔', badge: '5 項', badgeType: 'green',
              items: [
                { id:'ro1', text:'補衛生紙', done:false },
                { id:'ro2', text:'擦桌子', done:false },
                { id:'ro3', text:'掃地', done:false },
                { id:'ro4', text:'拖地', done:false },
                { id:'ro5', text:'掃大門走道落葉', done:false },
              ],
            },
          ],
        },
      ],
    },
    // ── 備忘 ──
    {
      id: 'g4', label: '備忘',
      pages: [
        {
          id: 'notes', label: '注意事項',
          icon: [['path',{d:'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'}],['line',{x1:12,y1:9,x2:12,y2:13}],['line',{x1:12,y1:17,x2:12.01,y2:17}]],
          blocks: [
            {
              type: 'note', id: 'b_n1', title: '⚠ 最常見出錯原因',
              content: '被打斷後沒有繼續完成：做事到一半接電話、被問其他事，常導致遺漏後續步驟。\n建議做法：每完成一個步驟就在 checklist 打勾，被打斷後回來能立刻知道做到哪裡。',
              variant: 'warn',
            },
            {
              type: 'steps', id: 'b_n2', title: '💡 防呆原則', badge: '', badgeType: 'gray',
              items: [
                { id:'t1', title:'一次只做一件事', desc:'避免同時處理多張訂單或多個任務，確認完成再接下一件。' },
                { id:'t2', title:'使用 checklist 追蹤進度', desc:'每個步驟完成後立即打勾，中斷後能快速找回作業進度。' },
                { id:'t3', title:'不確定時先問', desc:'遇到不熟悉的情況不要猜，寧可多花一點時間確認，避免後續更大的麻煩。' },
              ],
            },
          ],
        },
      ],
    },
  ],
})

// ── flattened page list ──
const allPages = computed(() => sopData.groups.flatMap(g => g.pages.map(p => ({ ...p, groupId: g.id }))))
const activePageId = ref('cashier')
const activePage = computed(() => allPages.value.find(p => p.id === activePageId.value) || null)

// ─────────────────────────────────────────
// Sidebar edit helpers
// ─────────────────────────────────────────
const editingLabelId = ref(null)
const editingLabelVal = ref('')

function startEditLabel(id, val) {
  editingLabelId.value = id
  editingLabelVal.value = val
  nextTick(() => { document.getElementById('label-input-' + id)?.focus() })
}

function commitLabel(thing) {
  thing.label = editingLabelVal.value.trim() || thing.label
  editingLabelId.value = null
}

function addGroup() {
  sopData.groups.push({ id: 'g' + uid(), label: '新分類', pages: [] })
}

function deleteGroup(gIdx) {
  sopData.groups.splice(gIdx, 1)
}

function addPage(group) {
  const id = 'p' + uid()
  group.pages.push({ id, label: '新頁面', icon: [['circle',{cx:12,cy:12,r:10}]], blocks: [] })
  activePageId.value = id
}

function deletePage(group, pIdx) {
  const pid = group.pages[pIdx].id
  group.pages.splice(pIdx, 1)
  if (activePageId.value === pid) activePageId.value = allPages.value[0]?.id || ''
}

function moveGroup(idx, dir) {
  const arr = sopData.groups
  const target = idx + dir
  if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
}

function movePage(group, idx, dir) {
  const arr = group.pages
  const target = idx + dir
  if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
}

// ─────────────────────────────────────────
// Block edit helpers
// ─────────────────────────────────────────
const blockPickerOpen = ref(false)

function addBlock(page, type) {
  const id = 'b' + uid()
  if (type === 'checklist') page.blocks.push({ type, id, title: '新 Checklist', badge: '', badgeType: 'gray', items: [] })
  else if (type === 'steps') page.blocks.push({ type, id, title: '新步驟說明', badge: '', badgeType: 'gray', items: [] })
  else if (type === 'note') page.blocks.push({ type, id, title: '新備註', content: '', variant: 'info' })
  else if (type === 'flowchart') page.blocks.push({ type, id, title: '新流程圖', nodes: [], edges: [] })
  blockPickerOpen.value = false
}

function deleteBlock(page, bIdx) {
  page.blocks.splice(bIdx, 1)
}

function moveBlock(page, idx, dir) {
  const arr = page.blocks
  const t = idx + dir
  if (t < 0 || t >= arr.length) return
    ;[arr[idx], arr[t]] = [arr[t], arr[idx]]
}

// checklist block helpers
function addCheckItem(block) {
  block.items.push({ id: 'ci' + uid(), text: '新項目', done: false })
}
function deleteCheckItem(block, idx) { block.items.splice(idx, 1) }
function moveCheckItem(block, idx, dir) {
  const t = idx + dir
  if (t < 0 || t >= block.items.length) return
    ;[block.items[idx], block.items[t]] = [block.items[t], block.items[idx]]
}

// steps block helpers
function addStepItem(block) {
  block.items.push({ id: 'si' + uid(), title: '新步驟', desc: '' })
}
function deleteStepItem(block, idx) { block.items.splice(idx, 1) }
function moveStepItem(block, idx, dir) {
  const t = idx + dir
  if (t < 0 || t >= block.items.length) return
    ;[block.items[idx], block.items[t]] = [block.items[t], block.items[idx]]
}

// ─────────────────────────────────────────
// Flowchart engine (per-block state)
// ─────────────────────────────────────────
const PALETTES = {
  customer: { fill:'#085041', stroke:'#5DCAA5', text:'#9FE1CB' },
  order:    { fill:'#3C3489', stroke:'#AFA9EC', text:'#CECBF6' },
  payment:  { fill:'#633806', stroke:'#EF9F27', text:'#FAC775' },
  invoice:  { fill:'#27500A', stroke:'#97C459', text:'#C0DD97' },
  receipt:  { fill:'#712B13', stroke:'#F0997B', text:'#F5C4B3' },
  neutral:  { fill:'#444441', stroke:'#B4B2A9', text:'#D3D1C7' },
}
const LEGEND = [
  { label:'顧客類型', palette:'customer' },
  { label:'訂單建立', palette:'order' },
  { label:'付款方式', palette:'payment' },
  { label:'電子發票', palette:'invoice' },
  { label:'紙本帳單', palette:'receipt' },
  { label:'其他',     palette:'neutral' },
]

const fcState = reactive({})  // keyed by block.id

function getFc(block) {
  if (!fcState[block.id]) {
    fcState[block.id] = {
      tab: 'view',
      selected: null,
      selectedEdgeId: null,
      addingEdge: null,
      svgRef: null,
      nextId: 200,
    }
  }
  return fcState[block.id]
}

const pal = p => PALETTES[p] || PALETTES.neutral
function nodeCx(n) { return n.x + n.w / 2 }
function nodeCy(n) { return n.y + n.h / 2 }

function edgePoints(block, e) {
  const f = block.nodes.find(n => n.id === e.from)
  const t = block.nodes.find(n => n.id === e.to)
  if (!f || !t) return ''
  const fx = nodeCx(f), fy = f.y + f.h
  const tx = nodeCx(t), ty = t.y
  const mx = e.mid ? e.mid.x : (fx + tx) / 2
  const my = e.mid ? e.mid.y : fy + (ty - fy) * 0.5
  return `M${fx},${fy} L${fx},${my} L${tx},${my} L${tx},${ty}`
}

function edgeMid(block, e) {
  const f = block.nodes.find(n => n.id === e.from)
  const t = block.nodes.find(n => n.id === e.to)
  if (!f || !t) return { x:0, y:0 }
  const fx = nodeCx(f), fy = f.y + f.h
  const tx = nodeCx(t), ty = t.y
  return { x: e.mid ? e.mid.x : (fx+tx)/2, y: e.mid ? e.mid.y : fy+(ty-fy)*0.5 }
}

function diamondPts(n) {
  const cx = nodeCx(n), cy = nodeCy(n)
  return `${cx},${n.y} ${n.x+n.w},${cy} ${cx},${n.y+n.h} ${n.x},${cy}`
}

function fcViewBox(block) {
  const ns = block.nodes
  if (!ns.length) return '0 0 680 200'
  const pad = 40
  const minX = ns.reduce((m,n) => Math.min(m,n.x), Infinity) - pad
  const minY = ns.reduce((m,n) => Math.min(m,n.y), Infinity) - pad
  const maxX = ns.reduce((m,n) => Math.max(m,n.x+n.w), -Infinity) + pad
  const maxY = ns.reduce((m,n) => Math.max(m,n.y+n.h), -Infinity) + pad + 60
  return `${minX} ${minY} ${maxX-minX} ${maxY-minY}`
}

function fcLegendY(block) {
  return block.nodes.reduce((m,n) => Math.max(m, n.y+n.h), -Infinity) + 20
}

function fcSelectNode(block, id) {
  const s = getFc(block)
  if (s.addingEdge) {
    if (s.addingEdge.fromId !== id) {
      block.edges.push({ id:'e'+(++s.nextId), from:s.addingEdge.fromId, to:id, label:'', mid:null })
    }
    s.addingEdge = null; return
  }
  s.selectedEdgeId = null
  s.selected = s.selected === id ? null : id
}

function fcSelectEdge(block, id) {
  const s = getFc(block)
  if (s.addingEdge) return
  s.selected = null
  s.selectedEdgeId = s.selectedEdgeId === id ? null : id
}

function fcAddNode(block) {
  const s = getFc(block)
  const id = 'n'+(++s.nextId)
  block.nodes.push({ id, type:'rect', label:'新節點', x:200, y:200, w:120, h:40, palette:'neutral', sub:'' })
  s.selected = id
}

function fcDeleteSelected(block) {
  const s = getFc(block)
  if (s.selectedEdgeId) { fcDeleteEdge(block, s.selectedEdgeId); return }
  if (!s.selected) return
  const idx = block.nodes.findIndex(n => n.id === s.selected)
  if (idx >= 0) block.nodes.splice(idx, 1)
  for (let i = block.edges.length-1; i >= 0; i--) {
    if (block.edges[i].from === s.selected || block.edges[i].to === s.selected) block.edges.splice(i, 1)
  }
  s.selected = null
}

function fcDeleteEdge(block, id) {
  const s = getFc(block)
  const idx = block.edges.findIndex(e => e.id === id)
  if (idx >= 0) block.edges.splice(idx, 1)
  if (s.selectedEdgeId === id) s.selectedEdgeId = null
}

function fcResetEdgeMid(block, eid) {
  const e = block.edges.find(e => e.id === eid)
  if (e) e.mid = null
}

// drag nodes
let dragging = null
function fcDragStart(e, block, nodeId, svgEl) {
  e.preventDefault()
  const pt = svgEl.createSVGPoint()
  const n = block.nodes.find(x => x.id === nodeId)
  if (!n) return
  const cp = e.touches ? { x:e.touches[0].clientX, y:e.touches[0].clientY } : { x:e.clientX, y:e.clientY }
  pt.x = cp.x; pt.y = cp.y
  const sp = pt.matrixTransform(svgEl.getScreenCTM().inverse())
  dragging = { block, nodeId, svgEl, ox: sp.x-n.x, oy: sp.y-n.y }
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', endDrag)
  window.addEventListener('touchmove', onDrag, { passive:false })
  window.addEventListener('touchend', endDrag)
}

function onDrag(e) {
  if (!dragging) return; e.preventDefault()
  const pt = dragging.svgEl.createSVGPoint()
  const cp = e.touches ? { x:e.touches[0].clientX, y:e.touches[0].clientY } : { x:e.clientX, y:e.clientY }
  pt.x = cp.x; pt.y = cp.y
  const sp = pt.matrixTransform(dragging.svgEl.getScreenCTM().inverse())
  const n = dragging.block.nodes.find(x => x.id === dragging.nodeId)
  if (n) { n.x = sp.x - dragging.ox; n.y = sp.y - dragging.oy }
}

function endDrag() {
  dragging = null
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', endDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', endDrag)
}

// drag waypoints
let draggingWp = null
function fcWpStart(e, block, eid, svgEl) {
  e.preventDefault(); e.stopPropagation()
  const edge = block.edges.find(x => x.id === eid)
  if (!edge) return
  if (!edge.mid) { const m = edgeMid(block, edge); edge.mid = { x:m.x, y:m.y } }
  const pt = svgEl.createSVGPoint()
  const cp = e.touches ? { x:e.touches[0].clientX, y:e.touches[0].clientY } : { x:e.clientX, y:e.clientY }
  pt.x = cp.x; pt.y = cp.y
  const sp = pt.matrixTransform(svgEl.getScreenCTM().inverse())
  draggingWp = { block, eid, svgEl, ox: sp.x-edge.mid.x, oy: sp.y-edge.mid.y }
  window.addEventListener('mousemove', onWpDrag)
  window.addEventListener('mouseup', endWpDrag)
  window.addEventListener('touchmove', onWpDrag, { passive:false })
  window.addEventListener('touchend', endWpDrag)
}

function onWpDrag(e) {
  if (!draggingWp) return; e.preventDefault()
  const pt = draggingWp.svgEl.createSVGPoint()
  const cp = e.touches ? { x:e.touches[0].clientX, y:e.touches[0].clientY } : { x:e.clientX, y:e.clientY }
  pt.x = cp.x; pt.y = cp.y
  const sp = pt.matrixTransform(draggingWp.svgEl.getScreenCTM().inverse())
  const edge = draggingWp.block.edges.find(x => x.id === draggingWp.eid)
  if (edge) edge.mid = { x: sp.x-draggingWp.ox, y: sp.y-draggingWp.oy }
}

function endWpDrag() {
  draggingWp = null
  window.removeEventListener('mousemove', onWpDrag)
  window.removeEventListener('mouseup', endWpDrag)
  window.removeEventListener('touchmove', onWpDrag)
  window.removeEventListener('touchend', endWpDrag)
}

function fcExport(block, svgEl) {
  if (!svgEl) return
  const blob = new Blob(['<?xml version="1.0"?>\n' + svgEl.cloneNode(true).outerHTML], { type:'image/svg+xml' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'flowchart.svg'; a.click()
}

// toast
const toast = reactive({ show:false, message:'' })
let toastTimer = null
function showToast(msg) {
  toast.message = msg; toast.show = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.show = false }, 2000)
}
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- Header -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">📋</div>
          <div>
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">SOP 手冊</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">聖母健康農莊</p>
          </div>
        </div>
        <!-- Edit Mode toggle -->
        <button @click="editMode = !editMode"
                :class="['flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                         editMode
                           ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                           : 'bg-stone-100 dark:bg-zinc-800 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400']">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          {{ editMode ? '編輯中' : '編輯模式' }}
        </button>
      </div>
    </header>

    <div class="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 flex gap-4 items-start">

      <!-- ── Sidebar ── -->
      <nav class="w-48 flex-shrink-0 hidden md:block sticky top-20">
        <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
          <div v-for="(group, gIdx) in sopData.groups" :key="group.id">
            <!-- Group header -->
            <div class="flex items-center gap-1 px-3 pt-3 pb-1">
              <template v-if="editMode && editingLabelId === group.id">
                <input :id="'label-input-'+group.id" v-model="editingLabelVal"
                       @blur="commitLabel(group)" @keyup.enter="commitLabel(group)"
                       class="flex-1 text-[10px] font-semibold uppercase tracking-wider bg-stone-100 dark:bg-zinc-700 rounded px-1 py-0.5 outline-none text-stone-600 dark:text-stone-300 w-full" />
              </template>
              <template v-else>
                <span :class="['flex-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 truncate',
                               editMode ? 'cursor-pointer hover:text-stone-600 dark:hover:text-stone-300' : '']"
                      @click="editMode && startEditLabel(group.id, group.label)">{{ group.label }}</span>
              </template>
              <template v-if="editMode">
                <button @click="moveGroup(gIdx, -1)" class="text-stone-300 dark:text-stone-600 hover:text-stone-500 text-xs px-0.5" title="上移">↑</button>
                <button @click="moveGroup(gIdx, 1)"  class="text-stone-300 dark:text-stone-600 hover:text-stone-500 text-xs px-0.5" title="下移">↓</button>
                <button @click="deleteGroup(gIdx)" class="text-red-300 dark:text-red-700 hover:text-red-500 text-xs px-0.5" title="刪除分類">×</button>
              </template>
            </div>

            <!-- Pages -->
            <div v-for="(page, pIdx) in group.pages" :key="page.id"
                 class="flex items-center group/page">
              <a :class="['flex-1 flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors border-l-2 min-w-0',
                          activePageId === page.id
                            ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium'
                            : 'border-transparent text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800']"
                 @click="activePageId = page.id">
                <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path v-for="(p, i) in page.icon" :key="i" v-bind="Object.fromEntries([[p[0]==='path'||p[0]==='line'||p[0]==='polyline'?'d':p[0]==='circle'?'cx':p[0], ...[]], ...Object.entries(p[1])])" />
                  <component v-for="(p, i) in page.icon" :key="'ic'+i" :is="p[0]" v-bind="p[1]" />
                </svg>
                <template v-if="editMode && editingLabelId === page.id">
                  <input :id="'label-input-'+page.id" v-model="editingLabelVal"
                         @blur="commitLabel(page)" @keyup.enter="commitLabel(page)"
                         class="flex-1 min-w-0 text-xs bg-stone-100 dark:bg-zinc-700 rounded px-1 py-0.5 outline-none" />
                </template>
                <template v-else>
                  <span class="truncate text-xs" @dblclick="editMode && startEditLabel(page.id, page.label)">{{ page.label }}</span>
                </template>
              </a>
              <template v-if="editMode">
                <div class="flex flex-col pr-1 opacity-0 group-hover/page:opacity-100 transition-opacity">
                  <button @click="movePage(group, pIdx, -1)" class="text-stone-300 hover:text-stone-500 text-[10px] leading-none">↑</button>
                  <button @click="movePage(group, pIdx, 1)"  class="text-stone-300 hover:text-stone-500 text-[10px] leading-none">↓</button>
                </div>
                <button @click="deletePage(group, pIdx)" class="pr-2 text-red-300 hover:text-red-500 text-xs opacity-0 group-hover/page:opacity-100 transition-opacity">×</button>
              </template>
            </div>

            <!-- Add page -->
            <div v-if="editMode" class="px-3 pb-2 pt-1">
              <button @click="addPage(group)"
                      class="w-full text-[11px] text-stone-400 dark:text-stone-500 hover:text-green-600 dark:hover:text-green-400 border border-dashed border-stone-200 dark:border-stone-700 rounded-lg py-1 transition-colors">
                ＋ 新增頁面
              </button>
            </div>
          </div>

          <!-- Add group -->
          <div v-if="editMode" class="px-3 py-2 border-t border-stone-100 dark:border-stone-800">
            <button @click="addGroup"
                    class="w-full text-[11px] text-stone-400 dark:text-stone-500 hover:text-green-600 dark:hover:text-green-400 border border-dashed border-stone-200 dark:border-stone-700 rounded-lg py-1 transition-colors">
              ＋ 新增分類
            </button>
          </div>
        </div>
      </nav>

      <!-- Mobile nav -->
      <div class="md:hidden w-full mb-2">
        <select v-model="activePageId"
                class="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none">
          <optgroup v-for="g in sopData.groups" :key="g.id" :label="g.label">
            <option v-for="p in g.pages" :key="p.id" :value="p.id">{{ p.label }}</option>
          </optgroup>
        </select>
      </div>

      <!-- ── Main ── -->
      <div class="flex-1 min-w-0">
        <template v-if="activePage">

          <!-- Page header -->
          <div class="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 class="text-base font-bold text-stone-800 dark:text-stone-100">{{ activePage.label }}</h2>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="activePage.blocks.length === 0"
               class="flex flex-col items-center justify-center py-16 text-stone-300 dark:text-stone-600">
            <svg class="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-sm">這個頁面還沒有內容</p>
            <p v-if="!editMode" class="text-xs mt-1">開啟右上角「編輯模式」來新增區塊</p>
          </div>

          <!-- Blocks -->
          <div v-for="(block, bIdx) in activePage.blocks" :key="block.id" class="relative group/block">

            <!-- Block edit controls -->
            <div v-if="editMode"
                 class="absolute -top-2 -right-2 z-10 flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity bg-white dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm px-1.5 py-1">
              <button @click="moveBlock(activePage, bIdx, -1)" class="text-stone-400 hover:text-stone-600 text-xs px-1" title="上移">↑</button>
              <button @click="moveBlock(activePage, bIdx, 1)"  class="text-stone-400 hover:text-stone-600 text-xs px-1" title="下移">↓</button>
              <span class="text-stone-200 dark:text-stone-700">|</span>
              <button @click="deleteBlock(activePage, bIdx)" class="text-red-400 hover:text-red-600 text-xs px-1" title="刪除">🗑</button>
            </div>

            <!-- ── Checklist block ── -->
            <template v-if="block.type === 'checklist'">
              <SopCard :title="block.title" :badge="block.badge" :badge-type="block.badgeType">
                <!-- edit: block meta -->
                <div v-if="editMode" class="flex gap-2 mb-3 flex-wrap">
                  <input v-model="block.title" placeholder="標題"
                         class="flex-1 min-w-0 px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none" />
                  <input v-model="block.badge" placeholder="標籤"
                         class="w-24 px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none" />
                  <select v-model="block.badgeType"
                          class="px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none">
                    <option value="green">綠</option><option value="orange">橙</option><option value="gray">灰</option>
                  </select>
                </div>
                <!-- items -->
                <ul class="divide-y divide-stone-100 dark:divide-stone-800">
                  <li v-for="(item, iIdx) in block.items" :key="item.id"
                      class="flex items-start gap-3 py-2.5 group/item">
                    <div @click="!editMode && (item.done = !item.done)"
                         :class="['mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 transition-all flex items-center justify-center',
                                  !editMode ? 'cursor-pointer' : '',
                                  item.done ? 'bg-green-600 border-green-600' : 'border-stone-300 dark:border-stone-600']">
                      <svg v-if="item.done" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <template v-if="editMode">
                      <input v-model="item.text"
                             class="flex-1 min-w-0 px-2 py-0.5 text-sm border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none" />
                      <div class="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0">
                        <button @click="moveCheckItem(block, iIdx, -1)" class="text-stone-300 hover:text-stone-500 text-xs px-0.5">↑</button>
                        <button @click="moveCheckItem(block, iIdx, 1)"  class="text-stone-300 hover:text-stone-500 text-xs px-0.5">↓</button>
                        <button @click="deleteCheckItem(block, iIdx)" class="text-red-300 hover:text-red-500 text-xs px-0.5">×</button>
                      </div>
                    </template>
                    <span v-else :class="['flex-1 text-sm leading-relaxed', item.done ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-700 dark:text-stone-200']">{{ item.text }}</span>
                  </li>
                </ul>
                <div class="flex items-center justify-between mt-2">
                  <button v-if="editMode" @click="addCheckItem(block)"
                          class="text-xs text-green-600 dark:text-green-400 hover:underline">＋ 新增項目</button>
                  <div v-else />
                  <button @click="block.items.forEach(i => i.done = false)"
                          class="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
                    ↺ 重置
                  </button>
                </div>
              </SopCard>
            </template>

            <!-- ── Steps block ── -->
            <template v-else-if="block.type === 'steps'">
              <SopCard :title="block.title" :badge="block.badge" :badge-type="block.badgeType">
                <div v-if="editMode" class="flex gap-2 mb-3 flex-wrap">
                  <input v-model="block.title" placeholder="標題"
                         class="flex-1 min-w-0 px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none" />
                  <input v-model="block.badge" placeholder="標籤"
                         class="w-24 px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none" />
                  <select v-model="block.badgeType"
                          class="px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none">
                    <option value="green">綠</option><option value="orange">橙</option><option value="gray">灰</option>
                  </select>
                </div>
                <ol class="space-y-3">
                  <li v-for="(item, iIdx) in block.items" :key="item.id" class="flex gap-3 group/step">
                    <span class="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{{ iIdx+1 }}</span>
                    <div class="flex-1 min-w-0">
                      <template v-if="editMode">
                        <input v-model="item.title" placeholder="步驟標題"
                               class="w-full px-2 py-1 text-sm border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none mb-1" />
                        <textarea v-model="item.desc" placeholder="步驟說明（選填）" rows="2"
                                  class="w-full px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-stone-300 outline-none resize-none" />
                      </template>
                      <template v-else>
                        <p class="text-sm font-medium text-stone-800 dark:text-stone-100">{{ item.title }}</p>
                        <p v-if="item.desc" class="text-xs text-stone-500 dark:text-stone-400 mt-0.5 whitespace-pre-line">{{ item.desc }}</p>
                      </template>
                    </div>
                    <div v-if="editMode" class="flex gap-0.5 opacity-0 group-hover/step:opacity-100 transition-opacity flex-shrink-0 pt-1">
                      <button @click="moveStepItem(block, iIdx, -1)" class="text-stone-300 hover:text-stone-500 text-xs px-0.5">↑</button>
                      <button @click="moveStepItem(block, iIdx, 1)"  class="text-stone-300 hover:text-stone-500 text-xs px-0.5">↓</button>
                      <button @click="deleteStepItem(block, iIdx)" class="text-red-300 hover:text-red-500 text-xs px-0.5">×</button>
                    </div>
                  </li>
                </ol>
                <button v-if="editMode" @click="addStepItem(block)"
                        class="mt-3 text-xs text-green-600 dark:text-green-400 hover:underline">＋ 新增步驟</button>
              </SopCard>
            </template>

            <!-- ── Note block ── -->
            <template v-else-if="block.type === 'note'">
              <div :class="['rounded-2xl px-4 py-3 mb-3 border',
                            block.variant==='warn'  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                            block.variant==='info'  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                                                       'bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-stone-700']">
                <template v-if="editMode">
                  <div class="flex gap-2 mb-2 flex-wrap">
                    <input v-model="block.title" placeholder="標題"
                           class="flex-1 min-w-0 px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 outline-none font-semibold" />
                    <select v-model="block.variant"
                            class="px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-zinc-700 text-stone-700 dark:text-stone-200 outline-none">
                      <option value="info">藍色</option><option value="warn">橙色</option><option value="default">灰色</option>
                    </select>
                  </div>
                  <textarea v-model="block.content" placeholder="內容（換行用 Enter）" rows="3"
                            class="w-full px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-zinc-700 text-stone-700 dark:text-stone-300 outline-none resize-none" />
                </template>
                <template v-else>
                  <p :class="['text-sm font-semibold mb-1',
                              block.variant==='warn' ? 'text-orange-700 dark:text-orange-300' :
                              block.variant==='info' ? 'text-blue-700 dark:text-blue-300' : 'text-stone-700 dark:text-stone-200']">
                    {{ block.title }}
                  </p>
                  <p :class="['text-xs leading-relaxed whitespace-pre-line',
                              block.variant==='warn' ? 'text-orange-600 dark:text-orange-400' :
                              block.variant==='info' ? 'text-blue-600 dark:text-blue-400' : 'text-stone-500 dark:text-stone-400']">
                    {{ block.content }}
                  </p>
                </template>
              </div>
            </template>

            <!-- ── Flowchart block ── -->
            <template v-else-if="block.type === 'flowchart'">
              <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm mb-3 overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                  <span class="flex-1 font-semibold text-stone-800 dark:text-stone-100 text-sm">{{ block.title }}</span>
                  <template v-if="editMode">
                    <input v-model="block.title" class="text-xs px-2 py-1 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none w-32" placeholder="流程圖名稱" />
                  </template>
                  <!-- tab pills -->
                  <div class="flex items-center gap-0.5 bg-stone-100 dark:bg-zinc-800 rounded-xl p-0.5">
                    <button @click="getFc(block).tab='view'"
                            :class="['px-3 py-1 text-xs font-medium rounded-lg transition-colors',
                                     getFc(block).tab==='view' ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 shadow-sm' : 'text-stone-500 hover:text-stone-700']">
                      📋 檢視
                    </button>
                    <button @click="getFc(block).tab='edit'"
                            :class="['px-3 py-1 text-xs font-medium rounded-lg transition-colors',
                                     getFc(block).tab==='edit' ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 shadow-sm' : 'text-stone-500 hover:text-stone-700']">
                      ✏️ 編輯
                    </button>
                  </div>
                </div>

                <div class="p-3">
                  <!-- View -->
                  <div v-if="getFc(block).tab==='view'" class="bg-zinc-900 rounded-xl overflow-auto p-3">
                    <svg :viewBox="fcViewBox(block)" width="100%" style="min-width:400px;display:block;">
                      <defs>
                        <marker id="va" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M2 1L8 5L2 9" fill="none" stroke="#9C9A92" stroke-width="1.5" stroke-linecap="round"/>
                        </marker>
                      </defs>
                      <g v-for="e in block.edges" :key="e.id">
                        <path :d="edgePoints(block,e)" fill="none" stroke="#9C9A92" stroke-width="0.8" opacity="0.5" marker-end="url(#va)"/>
                        <text v-if="e.label" :x="edgeMid(block,e).x" :y="edgeMid(block,e).y-6" text-anchor="middle" font-size="11" fill="#9C9A92">{{e.label}}</text>
                      </g>
                      <g v-for="n in block.nodes" :key="n.id">
                        <template v-if="n.type==='rect'">
                          <rect :x="n.x" :y="n.y" :width="n.w" :height="n.h" rx="8" :fill="pal(n.palette).fill" :stroke="pal(n.palette).stroke" stroke-width="0.5"/>
                          <text :x="n.x+n.w/2" :y="n.sub?n.y+n.h/2-8:n.y+n.h/2" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" :fill="pal(n.palette).text">{{n.label}}</text>
                          <text v-if="n.sub" :x="n.x+n.w/2" :y="n.y+n.h/2+10" text-anchor="middle" dominant-baseline="central" font-size="11" :fill="pal(n.palette).stroke">{{n.sub}}</text>
                        </template>
                        <template v-else-if="n.type==='diamond'">
                          <polygon :points="diamondPts(n)" fill="transparent" :stroke="pal(n.palette).text" stroke-width="1" opacity="0.85"/>
                          <text :x="n.x+n.w/2" :y="n.sub?n.y+n.h/2-7:n.y+n.h/2" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="500" fill="#FAF9F5">{{n.label}}</text>
                          <text v-if="n.sub" :x="n.x+n.w/2" :y="n.y+n.h/2+9" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#B4B2A9">{{n.sub}}</text>
                        </template>
                      </g>
                      <g v-for="(l,i) in LEGEND" :key="l.label" :transform="`translate(0,${fcLegendY(block)})`">
                        <rect :x="40+i*105" y="0" width="14" height="14" rx="3" :fill="pal(l.palette).fill" :stroke="pal(l.palette).stroke" stroke-width="0.5"/>
                        <text :x="60+i*105" y="11" font-size="12" fill="#C2C0B6">{{l.label}}</text>
                      </g>
                    </svg>
                  </div>

                  <!-- Edit -->
                  <div v-else>
                    <!-- toolbar -->
                    <div class="flex flex-wrap gap-2 mb-3">
                      <button @click="fcAddNode(block)"
                              class="px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                        ＋ 新增節點
                      </button>
                      <button @click="fcDeleteSelected(block)"
                              :disabled="!getFc(block).selected && !getFc(block).selectedEdgeId"
                              class="px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40">
                        🗑 刪除選取
                      </button>
                      <button @click="getFc(block).addingEdge = getFc(block).addingEdge ? null : { fromId: getFc(block).selected }"
                              :disabled="!getFc(block).selected"
                              :class="['px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors disabled:opacity-40',
                                       getFc(block).addingEdge ? 'bg-green-700 border-green-700 text-white' : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300']">
                        {{ getFc(block).addingEdge ? '點選目標節點…' : '↗ 連線' }}
                      </button>
                      <button @click="e => fcExport(block, e.currentTarget.closest('.fc-editor').querySelector('svg'))"
                              class="px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-500 hover:bg-stone-50 transition-colors ml-auto">
                        ⬇ 匯出
                      </button>
                    </div>

                    <div class="fc-editor flex gap-3 items-start">
                      <!-- canvas -->
                      <div class="flex-1 bg-zinc-900 rounded-xl overflow-auto">
                        <svg :viewBox="fcViewBox(block)" width="100%"
                             style="min-width:400px;display:block;"
                             :style="{cursor: getFc(block).addingEdge ? 'crosshair' : 'default'}"
                             :ref="el => { if(el) getFc(block).svgRef = el }">
                          <defs>
                            <marker id="ea" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M2 1L8 5L2 9" fill="none" stroke="#9C9A92" stroke-width="1.5" stroke-linecap="round"/>
                            </marker>
                          </defs>
                          <!-- edges -->
                          <g v-for="e in block.edges" :key="e.id">
                            <path :d="edgePoints(block,e)" fill="none" stroke="transparent" stroke-width="12" style="cursor:pointer" @click.stop="fcSelectEdge(block,e.id)"/>
                            <path :d="edgePoints(block,e)" fill="none"
                                  :stroke="getFc(block).selectedEdgeId===e.id?'#60A5FA':'#9C9A92'"
                                  :stroke-width="getFc(block).selectedEdgeId===e.id?1.5:0.8"
                                  opacity="0.9" marker-end="url(#ea)"/>
                            <text v-if="e.label" :x="edgeMid(block,e).x" :y="edgeMid(block,e).y-6"
                                  text-anchor="middle" font-size="11"
                                  :fill="getFc(block).selectedEdgeId===e.id?'#93C5FD':'#9C9A92'">{{e.label}}</text>
                            <g v-if="getFc(block).selectedEdgeId===e.id">
                              <circle :cx="edgeMid(block,e).x" :cy="edgeMid(block,e).y" r="6"
                                      fill="#1D4ED8" stroke="#93C5FD" stroke-width="1.5" style="cursor:move"
                                      @mousedown.stop="fcWpStart($event,block,e.id,getFc(block).svgRef)"
                                      @touchstart.stop.prevent="fcWpStart($event,block,e.id,getFc(block).svgRef)"/>
                            </g>
                          </g>
                          <!-- nodes -->
                          <g v-for="n in block.nodes" :key="n.id"
                             :style="{cursor: getFc(block).addingEdge?'crosshair':'grab'}"
                             @mousedown.stop="fcDragStart($event,block,n.id,getFc(block).svgRef)"
                             @touchstart.stop.prevent="fcDragStart($event,block,n.id,getFc(block).svgRef)"
                             @click.stop="fcSelectNode(block,n.id)">
                            <template v-if="n.type==='rect'">
                              <rect :x="n.x" :y="n.y" :width="n.w" :height="n.h" rx="8"
                                    :fill="pal(n.palette).fill"
                                    :stroke="getFc(block).selected===n.id?'#FFD700':pal(n.palette).stroke"
                                    :stroke-width="getFc(block).selected===n.id?2:0.5"/>
                              <text :x="n.x+n.w/2" :y="n.sub?n.y+n.h/2-8:n.y+n.h/2" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" :fill="pal(n.palette).text" style="pointer-events:none">{{n.label}}</text>
                              <text v-if="n.sub" :x="n.x+n.w/2" :y="n.y+n.h/2+10" text-anchor="middle" dominant-baseline="central" font-size="11" :fill="pal(n.palette).stroke" style="pointer-events:none">{{n.sub}}</text>
                            </template>
                            <template v-else-if="n.type==='diamond'">
                              <polygon :points="diamondPts(n)" fill="transparent"
                                       :stroke="getFc(block).selected===n.id?'#FFD700':pal(n.palette).text"
                                       :stroke-width="getFc(block).selected===n.id?2:1" opacity="0.9"/>
                              <text :x="n.x+n.w/2" :y="n.sub?n.y+n.h/2-7:n.y+n.h/2" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="500" fill="#FAF9F5" style="pointer-events:none">{{n.label}}</text>
                              <text v-if="n.sub" :x="n.x+n.w/2" :y="n.y+n.h/2+9" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#B4B2A9" style="pointer-events:none">{{n.sub}}</text>
                            </template>
                          </g>
                        </svg>
                      </div>

                      <!-- Property panel -->
                      <div class="w-48 flex-shrink-0">
                        <!-- Node panel -->
                        <div v-if="getFc(block).selected && block.nodes.find(n=>n.id===getFc(block).selected)"
                             class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-3 text-xs">
                          <p class="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">節點屬性</p>
                          <label class="block text-stone-500 mb-1">文字</label>
                          <input v-model="block.nodes.find(n=>n.id===getFc(block).selected).label" class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none mb-2"/>
                          <label class="block text-stone-500 mb-1">副標題</label>
                          <input v-model="block.nodes.find(n=>n.id===getFc(block).selected).sub" placeholder="（選填）" class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none mb-2"/>
                          <label class="block text-stone-500 mb-1">形狀</label>
                          <select v-model="block.nodes.find(n=>n.id===getFc(block).selected).type" class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none mb-2">
                            <option value="rect">矩形</option><option value="diamond">菱形（判斷）</option>
                          </select>
                          <label class="block text-stone-500 mb-1">顏色</label>
                          <select v-model="block.nodes.find(n=>n.id===getFc(block).selected).palette" class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none mb-2">
                            <option value="customer">顧客（綠）</option><option value="order">訂單（紫）</option>
                            <option value="payment">付款（橙）</option><option value="invoice">發票（草綠）</option>
                            <option value="receipt">帳單（磚紅）</option><option value="neutral">其他（灰）</option>
                          </select>
                          <div class="grid grid-cols-2 gap-1.5">
                            <div><label class="block text-stone-500 mb-1">寬</label>
                              <input type="number" v-model.number="block.nodes.find(n=>n.id===getFc(block).selected).w" class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none"/></div>
                            <div><label class="block text-stone-500 mb-1">高</label>
                              <input type="number" v-model.number="block.nodes.find(n=>n.id===getFc(block).selected).h" class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none"/></div>
                          </div>
                        </div>

                        <!-- Edge panel -->
                        <div v-else-if="getFc(block).selectedEdgeId && block.edges.find(e=>e.id===getFc(block).selectedEdgeId)"
                             class="bg-white dark:bg-zinc-900 rounded-2xl border border-blue-200 dark:border-blue-800 p-3 text-xs">
                          <p class="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-2">連線屬性</p>
                          <div class="text-[11px] text-stone-500 mb-2">
                            {{ (block.nodes.find(n=>n.id===block.edges.find(e=>e.id===getFc(block).selectedEdgeId)?.from)||{label:'?'}).label }}
                            <span class="text-blue-400 mx-1">→</span>
                            {{ (block.nodes.find(n=>n.id===block.edges.find(e=>e.id===getFc(block).selectedEdgeId)?.to)||{label:'?'}).label }}
                          </div>
                          <label class="block text-stone-500 mb-1">標籤</label>
                          <input v-model="block.edges.find(e=>e.id===getFc(block).selectedEdgeId).label" placeholder="是 / 否"
                                 class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none mb-3"/>
                          <button @click="fcResetEdgeMid(block, getFc(block).selectedEdgeId)"
                                  class="w-full px-2 py-1.5 text-[11px] border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-500 hover:bg-stone-100 transition-colors mb-2">
                            ↺ 重置折點
                          </button>
                          <button @click="fcDeleteEdge(block, getFc(block).selectedEdgeId)"
                                  class="w-full px-2 py-1.5 text-[11px] border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
                            🗑 刪除連線
                          </button>
                        </div>

                        <div v-else class="bg-stone-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 p-4 text-center text-xs text-stone-400 dark:text-stone-500">
                          點選節點或連線<br>查看屬性
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

          </div>

          <!-- Add block picker -->
          <div v-if="editMode" class="mt-2">
            <div v-if="!blockPickerOpen">
              <button @click="blockPickerOpen = true"
                      class="w-full py-2.5 text-sm text-stone-400 dark:text-stone-500 hover:text-green-600 dark:hover:text-green-400 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl transition-colors flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                新增區塊
              </button>
            </div>
            <div v-else class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4">
              <p class="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-3">選擇區塊類型</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button v-for="bt in [
                  { type:'checklist', icon:'☑️', label:'Checklist', desc:'可打勾的清單' },
                  { type:'steps',     icon:'📝', label:'步驟說明', desc:'有編號的步驟' },
                  { type:'note',      icon:'📌', label:'備註',     desc:'提示或警告' },
                  { type:'flowchart', icon:'🔀', label:'流程圖',   desc:'可編輯的流程圖' },
                ]" :key="bt.type"
                        @click="addBlock(activePage, bt.type)"
                        class="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all cursor-pointer text-center">
                  <span class="text-2xl">{{ bt.icon }}</span>
                  <span class="text-xs font-semibold text-stone-700 dark:text-stone-200">{{ bt.label }}</span>
                  <span class="text-[10px] text-stone-400 dark:text-stone-500">{{ bt.desc }}</span>
                </button>
              </div>
              <button @click="blockPickerOpen = false" class="mt-3 text-xs text-stone-400 hover:text-stone-600 w-full text-center">取消</button>
            </div>
          </div>

        </template>

        <!-- No page selected -->
        <div v-else class="flex flex-col items-center justify-center py-24 text-stone-300 dark:text-stone-600">
          <p class="text-sm">請從左側選擇頁面</p>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 right-6 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
