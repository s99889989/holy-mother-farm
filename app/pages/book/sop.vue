<script setup>
definePageMeta({ layout: 'staff' })

import { ref, reactive, computed, h } from 'vue'

useHead({ title: 'SOP 手冊 — 聖母健康農莊' })

// ─────────────────────────────────────────
// Inline sub-components
// ─────────────────────────────────────────

const SopCard = {
  props: {
    title:     { type: String, required: true },
    badge:     { type: String, default: '' },
    badgeType: { type: String, default: 'gray' },
  },
  setup(props, { slots }) {
    const isOpen = ref(true)
    const badgeClasses = {
      green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      gray:   'bg-stone-100 text-stone-500 dark:bg-zinc-700 dark:text-stone-300',
    }
    return () => h('div', { class: 'bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm mb-3 overflow-hidden' }, [
      h('div', {
        class: 'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/60 transition-colors select-none border-b border-stone-100 dark:border-stone-800',
        onClick: () => { isOpen.value = !isOpen.value },
      }, [
        h('span', { class: 'flex-1 font-semibold text-stone-800 dark:text-stone-100 text-sm' }, props.title),
        props.badge ? h('span', { class: `text-xs font-medium px-2 py-0.5 rounded-full ${badgeClasses[props.badgeType] ?? badgeClasses.gray}` }, props.badge) : null,
        h('svg', { class: `w-4 h-4 text-stone-400 transition-transform duration-200 ${isOpen.value ? 'rotate-180' : ''}`, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
          [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 2, d: 'M19 9l-7 7-7-7' })]),
      ]),
      isOpen.value ? h('div', { class: 'px-4 py-3' }, slots.default?.()) : null,
    ])
  },
}

const SopChecklist = {
  props: { initialItems: { type: Array, required: true } },
  setup(props) {
    const items = reactive(props.initialItems.map(i => ({ ...i, done: false })))
    const reset = () => items.forEach(i => { i.done = false })
    return () => h('div', null, [
      h('ul', { class: 'divide-y divide-stone-100 dark:divide-stone-800' },
        items.map(item =>
          h('li', {
            key: item.id,
            class: `flex items-start gap-3 py-2.5 cursor-pointer group`,
            onClick: () => { item.done = !item.done },
          }, [
            h('div', {
              class: `mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 transition-all flex items-center justify-center
                      ${item.done
                ? 'bg-green-600 border-green-600'
                : 'border-stone-300 dark:border-stone-600 group-hover:border-green-400'}`,
            }, item.done ? [h('svg', { class: 'w-2.5 h-2.5 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 3, d: 'M5 13l4 4L19 7' })])] : []),
            h('span', {
              class: `text-sm leading-relaxed ${item.done ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-700 dark:text-stone-200'}`,
              innerHTML: item.text,
            }),
          ])
        )
      ),
      h('div', { class: 'flex justify-end mt-2' },
        h('button', {
          class: 'text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800',
          onClick: reset,
        }, '↺ 重置')
      ),
    ])
  },
}

// ─────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────

const activeSection = ref('cashier')

const mkIcon = (paths) => ({
  render: () => h('svg', { class: 'w-4 h-4', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
    paths.map(([tag, attrs]) => h(tag, attrs))
  )
})

const NAV = [
  {
    group: '收銀 / 交易',
    items: [
      { id: 'cashier',  label: '收銀流程', icon: mkIcon([['rect',{x:2,y:5,width:20,height:14,rx:2}],['path',{d:'M2 10h20'}]]) },
      { id: 'delivery', label: '宅配',     icon: mkIcon([['path',{d:'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3'}],['rect',{x:9,y:11,width:14,height:10,rx:1}],['circle',{cx:12,cy:21,r:1}],['circle',{cx:20,cy:21,r:1}]]) },
      { id: 'sell',     label: '賣物品',   icon: mkIcon([['path',{d:'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'}],['line',{x1:3,y1:6,x2:21,y2:6}],['path',{d:'M16 10a4 4 0 0 1-8 0'}]]) },
    ]
  },
  {
    group: '定期任務',
    items: [
      { id: 'daily',   label: '每日作業', icon: mkIcon([['rect',{x:3,y:4,width:18,height:18,rx:2}],['line',{x1:16,y1:2,x2:16,y2:6}],['line',{x1:8,y1:2,x2:8,y2:6}],['line',{x1:3,y1:10,x2:21,y2:10}]]) },
      { id: 'monthly', label: '每月作業', icon: mkIcon([['path',{d:'M3 3v5h5'}],['path',{d:'M3.05 13A9 9 0 1 0 6 5.3L3 8'}]]) },
      { id: 'car',     label: '公務車',   icon: mkIcon([['path',{d:'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'}],['path',{d:'M14 3l3 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1'}],['circle',{cx:7,cy:17,r:2}],['circle',{cx:17,cy:17,r:2}],['path',{d:'M5 9h4l2-4'}]]) },
    ]
  },
  {
    group: '備忘',
    items: [
      { id: 'notes', label: '注意事項', icon: mkIcon([['path',{d:'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'}],['line',{x1:12,y1:9,x2:12,y2:13}],['line',{x1:12,y1:17,x2:12.01,y2:17}]]) },
    ]
  },
]

// ─────────────────────────────────────────
// Checklist data
// ─────────────────────────────────────────

const dailyItems = [
  { id: 'd1', text: '印出日報' },
  { id: 'd2', text: '清點小舖物品數量，對照日報數字' },
  { id: 'd3', text: '清點餐廳物品數量，對照日報數字' },
  { id: 'd4', text: '若有差異立即回報主管' },
]
const monthlyItems = [
  { id: 'm1', text: '印出月報（小舖）' },
  { id: 'm2', text: '印出月報（餐廳）' },
  { id: 'm3', text: '將小舖資料統整歸檔' },
  { id: 'm4', text: '將餐廳資料統整歸檔' },
]
const carItems = [
  { id: 'c1', text: '進入系統查看車輛異常記錄，發現異常立即修正' },
  { id: 'c2', text: '確認車輛驗車到期日，到期前安排驗車並更新系統日期<br><small class="text-orange-500 text-[11px]">⚠ 未驗車會顯示紅色警示</small>' },
  { id: 'c3', text: '確認加油卡餘額（系統 Email 通知）<br><small class="text-stone-400 text-[11px]">不足時以核銷單申請儲值 NT$6,000</small>' },
  { id: 'c4', text: '借車需線上申請或請代登記，每次使用掃 QR Code 建立記錄' },
]
const tips = [
  { title: '一次只做一件事', desc: '避免同時處理多張訂單或多個任務，確認完成再接下一件。' },
  { title: '使用 checklist 追蹤進度', desc: '每個步驟完成後立即打勾，中斷後能快速找回作業進度。' },
  { title: '不確定時先問', desc: '遇到不熟悉的情況不要猜，寧可多花一點時間確認，避免後續更大的麻煩。' },
]

// ─────────────────────────────────────────
// Flowchart
// ─────────────────────────────────────────

const PALETTES = {
  customer: { fill: '#085041', stroke: '#5DCAA5', text: '#9FE1CB' },
  order:    { fill: '#3C3489', stroke: '#AFA9EC', text: '#CECBF6' },
  payment:  { fill: '#633806', stroke: '#EF9F27', text: '#FAC775' },
  invoice:  { fill: '#27500A', stroke: '#97C459', text: '#C0DD97' },
  receipt:  { fill: '#712B13', stroke: '#F0997B', text: '#F5C4B3' },
  neutral:  { fill: '#444441', stroke: '#B4B2A9', text: '#D3D1C7' },
}

const LEGEND = [
  { label: '顧客類型', palette: 'customer' },
  { label: '訂單建立', palette: 'order' },
  { label: '付款方式', palette: 'payment' },
  { label: '電子發票', palette: 'invoice' },
  { label: '紙本帳單', palette: 'receipt' },
  { label: '其他',     palette: 'neutral' },
]

const DEFAULT_NODES = [
  { id: 'n1',  type: 'rect',    label: '一般客人',           x: 60,  y: 30,  w: 120, h: 40, palette: 'customer', sub: '' },
  { id: 'n2',  type: 'rect',    label: 'VIP 客人',           x: 280, y: 30,  w: 120, h: 40, palette: 'customer', sub: '' },
  { id: 'n3',  type: 'rect',    label: '員工',               x: 500, y: 30,  w: 120, h: 40, palette: 'customer', sub: '' },
  { id: 'n4',  type: 'rect',    label: '建立訂單',           x: 165, y: 130, w: 310, h: 64, palette: 'order',    sub: '可複選：物品含餐券 ／ 物品不含餐券 ／ 午餐' },
  { id: 'n14', type: 'diamond', label: '是否含餐券品項？',   x: 255, y: 250, w: 150, h: 60, palette: 'neutral',  sub: '' },
  { id: 'n15', type: 'diamond', label: '是否只有午餐？',     x: 460, y: 360, w: 150, h: 60, palette: 'neutral',  sub: '' },
  { id: 'n5',  type: 'rect',    label: '現金',               x: 15,  y: 370, w: 80,  h: 40, palette: 'payment',  sub: '' },
  { id: 'n6',  type: 'rect',    label: '刷卡',               x: 110, y: 370, w: 80,  h: 40, palette: 'payment',  sub: '' },
  { id: 'n7',  type: 'rect',    label: '線上支付',           x: 205, y: 370, w: 100, h: 40, palette: 'payment',  sub: '' },
  { id: 'n8',  type: 'rect',    label: '員工消費券',         x: 318, y: 370, w: 120, h: 40, palette: 'payment',  sub: '' },
  { id: 'n9',  type: 'rect',    label: '以餐券結帳',         x: 470, y: 480, w: 130, h: 40, palette: 'payment',  sub: '僅限含餐券品項' },
  { id: 'n10', type: 'diamond', label: '是否用載具？',       x: 155, y: 480, w: 150, h: 60, palette: 'neutral',  sub: '' },
  { id: 'n11', type: 'rect',    label: '發票打勾（載具）',   x: 50,  y: 600, w: 160, h: 44, palette: 'invoice',  sub: '' },
  { id: 'n12', type: 'rect',    label: '帳單打勾（紙本）',   x: 290, y: 600, w: 160, h: 44, palette: 'receipt',  sub: '' },
  { id: 'n13', type: 'rect',    label: '交易完成',           x: 220, y: 710, w: 160, h: 44, palette: 'neutral',  sub: '' },
]

const DEFAULT_EDGES = [
  { id: 'e1',  from: 'n1',  to: 'n4',  label: '' },
  { id: 'e2',  from: 'n2',  to: 'n4',  label: '' },
  { id: 'e3',  from: 'n3',  to: 'n4',  label: '' },
  { id: 'e18', from: 'n4',  to: 'n14', label: '' },
  { id: 'e19', from: 'n14', to: 'n15', label: '是' },
  { id: 'e20', from: 'n15', to: 'n13', label: '是' },
  { id: 'e21', from: 'n15', to: 'n9',  label: '否' },
  { id: 'e4',  from: 'n14', to: 'n5',  label: '否' },
  { id: 'e5',  from: 'n14', to: 'n6',  label: '' },
  { id: 'e6',  from: 'n14', to: 'n7',  label: '' },
  { id: 'e7',  from: 'n14', to: 'n8',  label: '' },
  { id: 'e9',  from: 'n5',  to: 'n10', label: '' },
  { id: 'e10', from: 'n6',  to: 'n10', label: '' },
  { id: 'e11', from: 'n7',  to: 'n10', label: '' },
  { id: 'e12', from: 'n8',  to: 'n10', label: '' },
  { id: 'e13', from: 'n9',  to: 'n10', label: '' },
  { id: 'e14', from: 'n10', to: 'n11', label: '是' },
  { id: 'e15', from: 'n10', to: 'n12', label: '否' },
  { id: 'e16', from: 'n11', to: 'n13', label: '' },
  { id: 'e17', from: 'n12', to: 'n13', label: '' },
]

const nodes      = reactive(JSON.parse(JSON.stringify(DEFAULT_NODES)))
const edges      = reactive(JSON.parse(JSON.stringify(DEFAULT_EDGES)))
const selected   = ref(null)       // node id
const selectedEdgeId = ref(null)   // edge id
const addingEdge = ref(null)
const activeTab  = ref('view')
const editorSvg  = ref(null)
const toast      = reactive({ show: false, message: '' })
let toastTimer   = null
let nextId       = 16

const getNode = id => nodes.find(n => n.id === id)
const getEdge = id => edges.find(e => e.id === id)
const pal     = p  => PALETTES[p] || PALETTES.neutral

function nodeCx(n) { return n.x + n.w / 2 }
function nodeCy(n) { return n.y + n.h / 2 }

// Each edge can have an optional { mx, my } waypoint for the elbow midpoint
function edgePoints(e) {
  const f = getNode(e.from), t = getNode(e.to)
  if (!f || !t) return ''
  const fx = nodeCx(f), fy = f.y + f.h
  const tx = nodeCx(t), ty = t.y
  const mx = e.mid ? e.mid.x : (fx + tx) / 2
  const my = e.mid ? e.mid.y : fy + (ty - fy) * 0.5
  return `M${fx},${fy} L${fx},${my} L${tx},${my} L${tx},${ty}`
}

function edgeMidPoint(e) {
  const f = getNode(e.from), t = getNode(e.to)
  if (!f || !t) return { x: 0, y: 0 }
  const fx = nodeCx(f), fy = f.y + f.h
  const tx = nodeCx(t), ty = t.y
  return {
    x: e.mid ? e.mid.x : (fx + tx) / 2,
    y: e.mid ? e.mid.y : fy + (ty - fy) * 0.5,
  }
}

// label sits slightly above the midpoint elbow
function edgeMidLabel(e) {
  const m = edgeMidPoint(e)
  return { x: m.x, y: m.y - 8 }
}

function diamondPts(n) {
  const cx = nodeCx(n), cy = nodeCy(n)
  return `${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}`
}

const PAD = 40
const svgViewBox = computed(() => {
  if (!nodes.length) return '0 0 680 860'
  const minX = nodes.reduce((m, n) => Math.min(m, n.x), Infinity) - PAD
  const minY = nodes.reduce((m, n) => Math.min(m, n.y), Infinity) - PAD
  const maxX = nodes.reduce((m, n) => Math.max(m, n.x + n.w), -Infinity) + PAD
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y + n.h), -Infinity) + PAD + 60
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
})

const legendY = computed(() =>
  nodes.reduce((m, n) => Math.max(m, n.y + n.h), -Infinity) + 20
)

const selectedNode = computed(() => selected.value ? getNode(selected.value) : null)
const selectedEdge = computed(() => selectedEdgeId.value ? getEdge(selectedEdgeId.value) : null)

const connectedEdges = computed(() =>
  selectedNode.value
    ? edges.filter(e => e.from === selectedNode.value.id || e.to === selectedNode.value.id)
    : []
)

function selectNode(id) {
  if (addingEdge.value) {
    if (addingEdge.value.fromId !== id) {
      edges.push({ id: 'e' + (++nextId), from: addingEdge.value.fromId, to: id, label: '', mid: null })
      showToast('連線已建立')
    }
    addingEdge.value = null
    return
  }
  selectedEdgeId.value = null
  selected.value = selected.value === id ? null : id
}

function selectEdge(id) {
  if (addingEdge.value) return
  selected.value = null
  selectedEdgeId.value = selectedEdgeId.value === id ? null : id
}

function addNode() {
  const id = 'n' + (++nextId)
  nodes.push({ id, type: 'rect', label: '新節點', x: 200, y: 780, w: 120, h: 40, palette: 'neutral', sub: '' })
  selected.value = id
  showToast('節點已新增')
}

function deleteSelected() {
  if (selectedEdgeId.value) {
    deleteEdge(selectedEdgeId.value)
    return
  }
  if (!selected.value) return
  const idx = nodes.findIndex(n => n.id === selected.value)
  if (idx >= 0) nodes.splice(idx, 1)
  for (let i = edges.length - 1; i >= 0; i--) {
    if (edges[i].from === selected.value || edges[i].to === selected.value) edges.splice(i, 1)
  }
  selected.value = null
  showToast('節點已刪除')
}

function deleteEdge(id) {
  const idx = edges.findIndex(e => e.id === id)
  if (idx >= 0) edges.splice(idx, 1)
  if (selectedEdgeId.value === id) selectedEdgeId.value = null
  showToast('連線已刪除')
}

function resetEdgeMid(edgeId) {
  const e = getEdge(edgeId)
  if (e) e.mid = null
  showToast('折點已重置')
}

function toggleEdgeMode() {
  addingEdge.value = addingEdge.value ? null : { fromId: selected.value }
}

function resetAll() {
  nodes.splice(0, nodes.length, ...JSON.parse(JSON.stringify(DEFAULT_NODES)))
  edges.splice(0, edges.length, ...JSON.parse(JSON.stringify(DEFAULT_EDGES)))
  selected.value = null
  selectedEdgeId.value = null
  showToast('已還原為原始版本')
}

function showToast(msg) {
  toast.message = msg; toast.show = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.show = false }, 2000)
}

function exportSVG() {
  const svgEl = editorSvg.value
  if (!svgEl) return
  const blob = new Blob(['<?xml version="1.0"?>\n' + svgEl.cloneNode(true).outerHTML], { type: 'image/svg+xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'pos_checkout_flowchart.svg'
  a.click()
}

let dragging = null

function handleDragStart(e, nodeId) {
  const svgEl = editorSvg.value
  if (!svgEl) return
  e.preventDefault()
  const pt = svgEl.createSVGPoint()
  dragging = { nodeId, svgEl }
  const n = getNode(nodeId)
  const cp = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }
  pt.x = cp.x; pt.y = cp.y
  const sp = pt.matrixTransform(svgEl.getScreenCTM().inverse())
  dragging.offsetX = sp.x - n.x
  dragging.offsetY = sp.y - n.y
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', endDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('touchend', endDrag)
}

function onDrag(e) {
  if (!dragging) return
  e.preventDefault()
  const pt = dragging.svgEl.createSVGPoint()
  const cp = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }
  pt.x = cp.x; pt.y = cp.y
  const sp = pt.matrixTransform(dragging.svgEl.getScreenCTM().inverse())
  const n = getNode(dragging.nodeId)
  if (n) { n.x = sp.x - dragging.offsetX; n.y = sp.y - dragging.offsetY }
}

function endDrag() {
  dragging = null
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', endDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', endDrag)
}

// ── waypoint drag ──
let draggingWaypoint = null

function startWaypointDrag(e, edgeId) {
  const svgEl = editorSvg.value
  if (!svgEl) return
  e.preventDefault()
  e.stopPropagation()
  const edge = getEdge(edgeId)
  if (!edge) return
  // init mid from current computed position if not set
  if (!edge.mid) {
    const m = edgeMidPoint(edge)
    edge.mid = { x: m.x, y: m.y }
  }
  const pt = svgEl.createSVGPoint()
  const cp = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }
  pt.x = cp.x; pt.y = cp.y
  const sp = pt.matrixTransform(svgEl.getScreenCTM().inverse())
  draggingWaypoint = { edgeId, svgEl, offsetX: sp.x - edge.mid.x, offsetY: sp.y - edge.mid.y }
  window.addEventListener('mousemove', onWaypointDrag)
  window.addEventListener('mouseup', endWaypointDrag)
  window.addEventListener('touchmove', onWaypointDrag, { passive: false })
  window.addEventListener('touchend', endWaypointDrag)
}

function onWaypointDrag(e) {
  if (!draggingWaypoint) return
  e.preventDefault()
  const pt = draggingWaypoint.svgEl.createSVGPoint()
  const cp = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }
  pt.x = cp.x; pt.y = cp.y
  const sp = pt.matrixTransform(draggingWaypoint.svgEl.getScreenCTM().inverse())
  const edge = getEdge(draggingWaypoint.edgeId)
  if (edge) {
    edge.mid = { x: sp.x - draggingWaypoint.offsetX, y: sp.y - draggingWaypoint.offsetY }
  }
}

function endWaypointDrag() {
  draggingWaypoint = null
  window.removeEventListener('mousemove', onWaypointDrag)
  window.removeEventListener('mouseup', endWaypointDrag)
  window.removeEventListener('touchmove', onWaypointDrag)
  window.removeEventListener('touchend', endWaypointDrag)
}
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-zinc-900 transition-colors duration-300">

    <!-- ── Header ── -->
    <header class="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">📋</div>
          <div class="min-w-0">
            <h1 class="font-bold text-stone-800 dark:text-stone-100 leading-none text-sm sm:text-base">SOP 手冊</h1>
            <p class="text-xs text-stone-400 mt-0.5 hidden sm:block">Standard Operating Procedures</p>
          </div>
        </div>
      </div>
    </header>

    <!-- ── Layout ── -->
    <div class="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 flex gap-4 items-start">

      <!-- Sidebar -->
      <nav class="w-44 flex-shrink-0 hidden md:block">
        <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden sticky top-20">
          <template v-for="group in NAV" :key="group.group">
            <div class="px-3 pt-3 pb-1 text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              {{ group.group }}
            </div>
            <a v-for="item in group.items" :key="item.id"
               :class="['flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors border-l-2',
                        activeSection === item.id
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium'
                          : 'border-transparent text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-stone-100']"
               @click="activeSection = item.id">
              <component :is="item.icon"
                         :class="activeSection === item.id ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'" />
              {{ item.label }}
            </a>
          </template>
        </div>
      </nav>

      <!-- Mobile nav -->
      <div class="md:hidden w-full mb-2">
        <select v-model="activeSection"
                class="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400">
          <template v-for="group in NAV" :key="group.group">
            <optgroup :label="group.group">
              <option v-for="item in group.items" :key="item.id" :value="item.id">{{ item.label }}</option>
            </optgroup>
          </template>
        </select>
      </div>

      <!-- Main content -->
      <div class="flex-1 min-w-0">

        <!-- ═══ 收銀流程 ═══ -->
        <div v-show="activeSection === 'cashier'">
          <div class="mb-4">
            <h2 class="text-base font-bold text-stone-800 dark:text-stone-100">收銀流程</h2>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">SOP 流程圖檢視與編輯</p>
          </div>

          <!-- Tab bar -->
          <div class="flex items-center gap-0.5 bg-stone-100 dark:bg-zinc-800 rounded-xl p-0.5 w-fit mb-3">
            <button @click="activeTab = 'view'"
                    :class="['px-4 py-1.5 text-xs font-medium rounded-lg transition-colors',
                             activeTab === 'view'
                               ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 shadow-sm'
                               : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200']">
              📋 SOP 流程圖
            </button>
            <button @click="activeTab = 'edit'"
                    :class="['px-4 py-1.5 text-xs font-medium rounded-lg transition-colors',
                             activeTab === 'edit'
                               ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-stone-100 shadow-sm'
                               : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200']">
              ✏️ 編輯流程圖
            </button>
          </div>

          <!-- View -->
          <div v-if="activeTab === 'view'"
               class="bg-zinc-900 rounded-2xl border border-stone-700 shadow-sm overflow-auto p-4">
            <svg :viewBox="svgViewBox" width="100%" style="min-width:500px;display:block;">
              <defs>
                <marker id="va" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="#9C9A92" stroke-width="1.5" stroke-linecap="round" />
                </marker>
              </defs>
              <g v-for="e in edges" :key="e.id">
                <path :d="edgePoints(e)" fill="none" stroke="#9C9A92" stroke-width="0.8" opacity="0.5" marker-end="url(#va)" />
                <text v-if="e.label" :x="edgeMidLabel(e).x" :y="edgeMidLabel(e).y - 4"
                      text-anchor="middle" font-size="11" fill="#9C9A92">{{ e.label }}</text>
              </g>
              <g v-for="n in nodes" :key="n.id">
                <template v-if="n.type === 'rect'">
                  <rect :x="n.x" :y="n.y" :width="n.w" :height="n.h" rx="8"
                        :fill="pal(n.palette).fill" :stroke="pal(n.palette).stroke" stroke-width="0.5" />
                  <text :x="n.x + n.w / 2" :y="n.sub ? n.y + n.h / 2 - 8 : n.y + n.h / 2"
                        text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500"
                        :fill="pal(n.palette).text">{{ n.label }}</text>
                  <text v-if="n.sub" :x="n.x + n.w / 2" :y="n.y + n.h / 2 + 10"
                        text-anchor="middle" dominant-baseline="central" font-size="11"
                        :fill="pal(n.palette).stroke">{{ n.sub }}</text>
                </template>
                <template v-else-if="n.type === 'diamond'">
                  <polygon :points="diamondPts(n)" fill="transparent" :stroke="pal(n.palette).text" stroke-width="1" opacity="0.85" />
                  <text :x="n.x + n.w / 2" :y="n.y + n.h / 2" text-anchor="middle" dominant-baseline="central"
                        font-size="13" font-weight="500" fill="#FAF9F5">{{ n.label }}</text>
                </template>
              </g>
              <g v-for="(l, i) in LEGEND" :key="l.label" :transform="`translate(0,${legendY})`">
                <rect :x="40 + i * 105" y="0" width="14" height="14" rx="3"
                      :fill="pal(l.palette).fill" :stroke="pal(l.palette).stroke" stroke-width="0.5" />
                <text :x="60 + i * 105" y="11" font-size="12" fill="#C2C0B6">{{ l.label }}</text>
              </g>
            </svg>
          </div>

          <!-- Edit -->
          <div v-else>
            <!-- Toolbar -->
            <div class="flex flex-wrap gap-2 mb-3">
              <button @click="addNode"
                      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                ＋ 新增節點
              </button>
              <button @click="deleteSelected" :disabled="!selected && !selectedEdgeId"
                      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                🗑 刪除選取
              </button>
              <button @click="toggleEdgeMode" :disabled="!selected"
                      :class="['flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                               addingEdge
                                 ? 'bg-green-700 border-green-700 text-white'
                                 : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700']">
                {{ addingEdge ? '點選目標節點…' : '↗ 連線' }}
              </button>
              <button @click="exportSVG"
                      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors">
                ⬇ 匯出 SVG
              </button>
              <button @click="resetAll"
                      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-800 text-stone-400 dark:text-stone-500 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors ml-auto">
                ↺ 還原
              </button>
            </div>

            <transition name="fade">
              <div v-if="addingEdge"
                   class="mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-xs text-green-700 dark:text-green-300">
                請點選要連接的目標節點（點選同一節點或再按「連線」可取消）
              </div>
            </transition>

            <div class="flex gap-3 items-start">
              <!-- Canvas -->
              <div class="flex-1 bg-zinc-900 rounded-2xl border border-stone-700 overflow-auto">
                <svg ref="editorSvg" id="editor-svg" :viewBox="svgViewBox" width="100%"
                     style="min-width:500px;display:block;" :style="{ cursor: addingEdge ? 'crosshair' : 'default' }">
                  <defs>
                    <marker id="ea" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M2 1L8 5L2 9" fill="none" stroke="#9C9A92" stroke-width="1.5" stroke-linecap="round" />
                    </marker>
                  </defs>
                  <g v-for="e in edges" :key="e.id">
                    <!-- wide invisible hit area for clicking the line -->
                    <path :d="edgePoints(e)" fill="none" stroke="transparent" stroke-width="12"
                          style="cursor:pointer" @click.stop="selectEdge(e.id)" />
                    <!-- visible line -->
                    <path :d="edgePoints(e)" fill="none"
                          :stroke="selectedEdgeId === e.id ? '#60A5FA' : '#9C9A92'"
                          :stroke-width="selectedEdgeId === e.id ? 1.5 : 0.8"
                          opacity="0.9" marker-end="url(#ea)" />
                    <!-- label -->
                    <text v-if="e.label" :x="edgeMidLabel(e).x" :y="edgeMidLabel(e).y"
                          text-anchor="middle" font-size="11"
                          :fill="selectedEdgeId === e.id ? '#93C5FD' : '#9C9A92'">{{ e.label }}</text>
                    <!-- waypoint drag handle (only when edge is selected) -->
                    <g v-if="selectedEdgeId === e.id">
                      <circle :cx="edgeMidPoint(e).x" :cy="edgeMidPoint(e).y" r="6"
                              fill="#1D4ED8" stroke="#93C5FD" stroke-width="1.5"
                              style="cursor:move"
                              @mousedown.stop="startWaypointDrag($event, e.id)"
                              @touchstart.stop.prevent="startWaypointDrag($event, e.id)" />
                    </g>
                  </g>
                  <g v-for="n in nodes" :key="n.id"
                     :style="{ cursor: addingEdge ? 'crosshair' : 'grab' }"
                     @mousedown.stop="handleDragStart($event, n.id)"
                     @touchstart.stop.prevent="handleDragStart($event, n.id)"
                     @click.stop="selectNode(n.id)">
                    <template v-if="n.type === 'rect'">
                      <rect :x="n.x" :y="n.y" :width="n.w" :height="n.h" rx="8"
                            :fill="pal(n.palette).fill"
                            :stroke="selected === n.id ? '#FFD700' : pal(n.palette).stroke"
                            :stroke-width="selected === n.id ? 2 : 0.5" />
                      <text :x="n.x + n.w / 2" :y="n.sub ? n.y + n.h / 2 - 8 : n.y + n.h / 2"
                            text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500"
                            :fill="pal(n.palette).text" style="pointer-events:none">{{ n.label }}</text>
                      <text v-if="n.sub" :x="n.x + n.w / 2" :y="n.y + n.h / 2 + 10"
                            text-anchor="middle" dominant-baseline="central" font-size="11"
                            :fill="pal(n.palette).stroke" style="pointer-events:none">{{ n.sub }}</text>
                    </template>
                    <template v-else-if="n.type === 'diamond'">
                      <polygon :points="diamondPts(n)" fill="transparent"
                               :stroke="selected === n.id ? '#FFD700' : pal(n.palette).text"
                               :stroke-width="selected === n.id ? 2 : 1" opacity="0.9" />
                      <text :x="n.x + n.w / 2" :y="n.y + n.h / 2" text-anchor="middle" dominant-baseline="central"
                            font-size="13" font-weight="500" fill="#FAF9F5" style="pointer-events:none">{{ n.label }}</text>
                    </template>
                  </g>
                </svg>
              </div>

              <!-- Node property panel -->
              <div v-if="selectedNode"
                   class="w-48 flex-shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-3 text-xs">
                <p class="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">節點屬性</p>

                <label class="block text-stone-500 dark:text-stone-400 mb-1">文字</label>
                <input v-model="selectedNode.label"
                       class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-400 mb-2" />

                <label class="block text-stone-500 dark:text-stone-400 mb-1">副標題</label>
                <input v-model="selectedNode.sub" placeholder="（選填）"
                       class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-400 mb-2" />

                <label class="block text-stone-500 dark:text-stone-400 mb-1">形狀</label>
                <select v-model="selectedNode.type"
                        class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400 mb-2">
                  <option value="rect">矩形</option>
                  <option value="diamond">菱形（判斷）</option>
                </select>

                <label class="block text-stone-500 dark:text-stone-400 mb-1">顏色類型</label>
                <select v-model="selectedNode.palette"
                        class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none focus:ring-2 focus:ring-green-400 mb-2">
                  <option value="customer">顧客類型（綠）</option>
                  <option value="order">訂單建立（紫）</option>
                  <option value="payment">付款方式（橙）</option>
                  <option value="invoice">電子發票（草綠）</option>
                  <option value="receipt">紙本帳單（磚紅）</option>
                  <option value="neutral">其他（灰）</option>
                </select>

                <div class="grid grid-cols-2 gap-1.5 mb-2">
                  <div>
                    <label class="block text-stone-500 dark:text-stone-400 mb-1">寬</label>
                    <input type="number" v-model.number="selectedNode.w"
                           class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <div>
                    <label class="block text-stone-500 dark:text-stone-400 mb-1">高</label>
                    <input type="number" v-model.number="selectedNode.h"
                           class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                </div>

                <template v-if="connectedEdges.length">
                  <div class="border-t border-stone-100 dark:border-stone-800 pt-2 mt-2">
                    <p class="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1.5">連線</p>
                    <div v-for="e in connectedEdges" :key="e.id" class="flex items-center gap-1.5 mb-1.5">
                      <span class="flex-1 text-stone-500 dark:text-stone-400 truncate text-[11px]">
                        {{ e.from === selectedNode.id ? '→' : '←' }}
                        {{ (nodes.find(n => n.id === (e.from === selectedNode.id ? e.to : e.from)) || { label: '?' }).label }}
                      </span>
                      <input v-model="e.label" placeholder="標籤"
                             class="w-10 px-1.5 py-1 text-[11px] border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-stone-200 outline-none" />
                      <button @click="deleteEdge(e.id)"
                              class="text-red-400 hover:text-red-600 transition-colors text-sm leading-none">×</button>
                    </div>
                  </div>
                </template>
              </div>

              <!-- Edge property panel -->
              <div v-else-if="selectedEdge"
                   class="w-48 flex-shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm p-3 text-xs">
                <p class="text-[10px] font-semibold text-blue-400 dark:text-blue-500 uppercase tracking-wide mb-2">連線屬性</p>

                <div class="text-[11px] text-stone-500 dark:text-stone-400 mb-2 leading-relaxed">
                  {{ (getNode(selectedEdge.from) || { label: '?' }).label }}
                  <span class="text-blue-400 mx-1">→</span>
                  {{ (getNode(selectedEdge.to) || { label: '?' }).label }}
                </div>

                <label class="block text-stone-500 dark:text-stone-400 mb-1">標籤文字</label>
                <input v-model="selectedEdge.label" placeholder="例：是 / 否"
                       class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400 mb-3" />

                <div class="border-t border-stone-100 dark:border-stone-800 pt-2">
                  <p class="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">折點位置</p>
                  <p class="text-[11px] text-stone-400 dark:text-stone-500 mb-2 leading-relaxed">拖動線上的藍色圓點調整路徑</p>
                  <div class="grid grid-cols-2 gap-1.5 mb-2">
                    <div>
                      <label class="block text-stone-500 dark:text-stone-400 mb-1">X</label>
                      <input type="number" :value="selectedEdge.mid ? Math.round(selectedEdge.mid.x) : Math.round(edgeMidPoint(selectedEdge).x)"
                             @input="e => { if (!selectedEdge.mid) selectedEdge.mid = edgeMidPoint(selectedEdge); selectedEdge.mid.x = +e.target.value }"
                             class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label class="block text-stone-500 dark:text-stone-400 mb-1">Y</label>
                      <input type="number" :value="selectedEdge.mid ? Math.round(selectedEdge.mid.y) : Math.round(edgeMidPoint(selectedEdge).y)"
                             @input="e => { if (!selectedEdge.mid) selectedEdge.mid = edgeMidPoint(selectedEdge); selectedEdge.mid.y = +e.target.value }"
                             class="w-full px-2 py-1.5 text-xs border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  <button @click="resetEdgeMid(selectedEdge.id)"
                          class="w-full px-2 py-1.5 text-[11px] border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-zinc-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors mb-2">
                    ↺ 重置折點
                  </button>
                </div>

                <button @click="deleteEdge(selectedEdge.id)"
                        class="w-full px-2 py-1.5 text-[11px] border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                  🗑 刪除此連線
                </button>
              </div>

              <!-- Empty panel -->
              <div v-else
                   class="w-48 flex-shrink-0 bg-stone-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 p-4 text-center text-xs text-stone-400 dark:text-stone-500">
                點選節點或連線<br>查看屬性
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ 宅配 ═══ -->
        <div v-show="activeSection === 'delivery'">
          <div class="mb-4">
            <h2 class="text-base font-bold text-stone-800 dark:text-stone-100">宅配流程</h2>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">接單、建立宅配單、歸檔出貨完整流程</p>
          </div>

          <!-- 接單流程 -->
          <SopCard title="📋 接單流程" badge="5 步驟" badge-type="green">
            <ol class="space-y-4">
              <li class="flex gap-3">
                <span class="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-stone-800 dark:text-stone-100">查詢或建立客戶資料</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    ERP → 基本資料 → 客戶資料管理 → 輸入客戶名稱搜尋<br>
                    <span class="inline-flex items-center gap-1 mt-1">
                      <span class="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-[11px] font-medium">舊客戶</span>
                      複製客戶代碼
                    </span>
                    <span class="inline-flex items-center gap-1 ml-2">
                      <span class="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded text-[11px] font-medium">新客戶</span>
                      新增（取最後一碼 +1）
                    </span>
                    <br>必填：客戶代號、名稱、電話、地址、身分勾選「客戶」
                  </p>
                </div>
              </li>

              <li class="flex gap-3">
                <span class="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-stone-800 dark:text-stone-100">建立銷貨單</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    ERP → 進銷存 → 銷貨管理 → 銷貨單維護 → 新增<br>
                    場別：聖母農莊；填交貨日期、客戶代碼、品項、數量、金額
                  </p>
                  <div class="mt-1.5 px-2.5 py-1.5 bg-stone-100 dark:bg-zinc-800 rounded-lg">
                    <p class="text-[10px] text-stone-400 dark:text-stone-500 mb-0.5">備註範例</p>
                    <code class="text-[11px] text-green-700 dark:text-green-400 font-mono">7/25(四)宅配，貨到付款，發票隨貨附上/回捐</code>
                  </div>
                </div>
              </li>

              <li class="flex gap-3">
                <span class="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-stone-800 dark:text-stone-100">填寫宅配資料</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    選擇宅配資料 → 填收件人、寄件日、送達日、件數、溫層
                  </p>
                  <div class="flex flex-wrap gap-1.5 mt-1.5">
                    <span v-for="tag in ['常溫','冷藏','冷凍']" :key="tag"
                          class="px-2 py-0.5 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 rounded-full text-[11px] font-medium">
                      {{ tag }}
                    </span>
                  </div>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-1.5">內容物盡量填完整；有代收款需填「代收款項」</p>
                </div>
              </li>

              <li class="flex gap-3">
                <span class="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-stone-800 dark:text-stone-100">列印 &amp; 匯入黑貓宅配單</p>
                  <ol class="mt-1 space-y-1 text-xs text-stone-500 dark:text-stone-400">
                    <li class="flex gap-1.5">
                      <span class="text-stone-300 dark:text-stone-600 flex-shrink-0">①</span>
                      選「黑貓宅配單二模(新版)-(A4)：CSV」→ 存至桌面宅配單資料夾
                    </li>
                    <li class="flex gap-1.5">
                      <span class="text-stone-300 dark:text-stone-600 flex-shrink-0">②</span>
                      開啟黑貓宅配網頁 → 建立託運單 → 匯入 → 瀏覽選檔
                    </li>
                    <li class="flex gap-1.5">
                      <span class="text-stone-300 dark:text-stone-600 flex-shrink-0">③</span>
                      第一項不勾 → 確認資料後列印
                    </li>
                  </ol>
                </div>
              </li>

              <li class="flex gap-3">
                <span class="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-stone-800 dark:text-stone-100">訂單彙整歸檔</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">依日期收納至資料夾，裝訂準備出貨</p>
                </div>
              </li>
            </ol>
          </SopCard>

          <!-- 業者聯絡 -->
          <SopCard title="📞 宅配業者">
            <div class="space-y-2">
              <div class="flex gap-3 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <span class="text-amber-500 flex-shrink-0 text-base">⏰</span>
                <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  <strong>每天早上 9:30–10:00 前</strong>電話通知業者取件
                </p>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div class="px-3 py-2.5 bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-xl">
                  <p class="text-xs font-semibold text-stone-700 dark:text-stone-200 mb-0.5">🐱 黑貓宅急便</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400">使用宅配網頁系統建立</p>
                </div>
                <div class="px-3 py-2.5 bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-xl">
                  <p class="text-xs font-semibold text-stone-700 dark:text-stone-200 mb-0.5">🚚 新竹物流</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400">另開系統建立託運單</p>
                </div>
              </div>
            </div>
          </SopCard>

          <!-- 購物車 -->
          <SopCard title="🛒 每日購物車檢查">
            <div class="flex gap-3">
              <div class="flex-1 min-w-0">
                <ol class="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                  <li class="flex gap-2 items-start">
                    <span class="w-5 h-5 rounded-full bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-stone-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    查看新訂單（<span class="text-red-500 font-medium">紅色標示</span>）
                  </li>
                  <li class="flex gap-2 items-start">
                    <span class="w-5 h-5 rounded-full bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-stone-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    確認客戶資訊
                  </li>
                  <li class="flex gap-2 items-start">
                    <span class="w-5 h-5 rounded-full bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-stone-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    聯絡確認出貨日
                  </li>
                  <li class="flex gap-2 items-start">
                    <span class="w-5 h-5 rounded-full bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-stone-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                    更改狀態至「<span class="text-blue-600 dark:text-blue-400 font-medium">出貨中</span>」
                  </li>
                </ol>
              </div>
            </div>
          </SopCard>

          <!-- 簡訊系統 -->
          <SopCard title="💬 匯款通知簡訊">
            <div class="space-y-2">
              <p class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                使用農莊簡訊系統發送，費用每則扣 <strong class="text-stone-800 dark:text-stone-100">3 點</strong>
              </p>
              <div class="flex items-center gap-3 px-3 py-2 bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 rounded-xl">
                <div>
                  <p class="text-[10px] text-stone-400 dark:text-stone-500">目前餘額</p>
                  <p class="text-sm font-bold text-stone-800 dark:text-stone-100">約 291 點 <span class="text-xs font-normal text-stone-400">≈ 100 則</span></p>
                </div>
              </div>
              <div class="px-3 py-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                <p class="text-xs text-orange-700 dark:text-orange-300">
                  <strong>額度不足時</strong>向敏利申請儲值（約 3,000–6,000 元 / 次）
                </p>
              </div>
            </div>
          </SopCard>
        </div>

        <!-- ═══ 賣物品 ═══ -->
        <div v-show="activeSection === 'sell'">
          <div class="mb-4">
            <h2 class="text-base font-bold text-stone-800 dark:text-stone-100">賣物品</h2>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">現場與線上販售作業流程</p>
          </div>
          <SopCard title="🏪 銷售類別" badge="2 種">
            <div class="grid grid-cols-2 gap-2 mb-3">
              <div class="px-3 py-2 rounded-xl border text-xs font-medium text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">現場販售</div>
              <div class="px-3 py-2 rounded-xl border text-xs font-medium text-center bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">線上販售</div>
            </div>
            <p class="text-xs text-stone-500 dark:text-stone-400">線上訂單需確認付款狀態後，再進行備貨或宅配出貨。</p>
          </SopCard>
        </div>

        <!-- ═══ 每日作業 ═══ -->
        <div v-show="activeSection === 'daily'">
          <div class="mb-4">
            <h2 class="text-base font-bold text-stone-800 dark:text-stone-100">每日作業</h2>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">小舖與餐廳每日收銀結帳作業，勾選以追蹤進度</p>
          </div>
          <SopCard title="📊 每日日報" badge="小舖 ＋ 餐廳" badge-type="green">
            <SopChecklist :initial-items="dailyItems" />
          </SopCard>
        </div>

        <!-- ═══ 每月作業 ═══ -->
        <div v-show="activeSection === 'monthly'">
          <div class="mb-4">
            <h2 class="text-base font-bold text-stone-800 dark:text-stone-100">每月作業</h2>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">月底月初需完成的統整與報表作業</p>
          </div>
          <SopCard title="📋 月報統整" badge="小舖 ＋ 餐廳" badge-type="green">
            <SopChecklist :initial-items="monthlyItems" />
          </SopCard>
        </div>

        <!-- ═══ 公務車 ═══ -->
        <div v-show="activeSection === 'car'">
          <div class="mb-4">
            <h2 class="text-base font-bold text-stone-800 dark:text-stone-100">公務車管理</h2>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">月初匯入作業與日常維護流程</p>
          </div>
          <SopCard title="⛽ 月初：匯入油脂資料" badge="每月必做" badge-type="orange">
            <ol class="space-y-3">
              <li class="flex gap-3">
                <span class="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <div>
                  <p class="text-sm font-medium text-stone-800 dark:text-stone-100">從中油平台下載加油明細</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">中油車隊卡平台 → 加油明細查詢 → 選上月區間 → 轉出
                    <code class="px-1 py-0.5 bg-stone-100 dark:bg-zinc-700 rounded text-xs font-mono text-green-700 dark:text-green-400">CSV / Excel</code>
                  </p>
                </div>
              </li>
              <li class="flex gap-3">
                <span class="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <div>
                  <p class="text-sm font-medium text-stone-800 dark:text-stone-100">匯入公務車管理系統</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">公務車管理系統 → 報表 → 導入油脂資料 → 匯入剛存的 Excel → 上傳</p>
                </div>
              </li>
            </ol>
          </SopCard>
          <SopCard title="🔧 日常維護" badge="建議每週">
            <SopChecklist :initial-items="carItems" />
          </SopCard>
        </div>

        <!-- ═══ 注意事項 ═══ -->
        <div v-show="activeSection === 'notes'">
          <div class="mb-4">
            <h2 class="text-base font-bold text-stone-800 dark:text-stone-100">注意事項</h2>
            <p class="text-xs text-stone-400 dark:text-stone-500 mt-0.5">常見出錯原因與防呆提醒</p>
          </div>

          <!-- Warn box -->
          <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl px-4 py-3 mb-3 flex gap-3">
            <span class="text-orange-500 text-base flex-shrink-0 mt-0.5">⚠</span>
            <div>
              <p class="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-1">最常見出錯原因</p>
              <p class="text-xs text-orange-600 dark:text-orange-400 leading-relaxed">
                <strong>被打斷後沒有繼續完成</strong>：做事到一半接電話、被問其他事，常導致遺漏後續步驟。<br>
                建議做法：每完成一個步驟就在 checklist 打勾，被打斷後回來能立刻知道做到哪裡。
              </p>
            </div>
          </div>

          <SopCard title="💡 防呆原則">
            <ol class="space-y-3">
              <li v-for="tip in tips" :key="tip.title" class="flex gap-3">
                <span class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
                <div>
                  <p class="text-sm font-medium text-stone-800 dark:text-stone-100">{{ tip.title }}</p>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{{ tip.desc }}</p>
                </div>
              </li>
            </ol>
          </SopCard>
        </div>

      </div><!-- /main content -->
    </div><!-- /layout -->

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 bg-stone-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 whitespace-nowrap">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
