<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'staff.work-manual' })

import { ref, reactive, computed, h, nextTick, onMounted } from 'vue'



useHead({title: 'SOP 手冊 — 聖母健康農莊'})

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/staff/sop'

// ─────────────────────────────────────────
// Edit Mode
// ─────────────────────────────────────────
const editMode = ref(false)

// ─────────────────────────────────────────
// Inline components
// ─────────────────────────────────────────
const SopCard = {
  props: {title: String, badge: String, badgeType: {default: 'gray'}},
  setup(props, {slots}) {
    const open = ref(true)
    const bc = {
      green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      gray: 'bg-surface2 text-hint-c dark:text-hint-c'
    }
    return () => h('div', {class: 'bg-surface rounded-2xl border border-light-c shadow-sm mb-3 overflow-hidden'}, [
      h('div', {
        class: 'flex items-center gap-3 px-4 py-3 cursor-pointer hover-surface2/60 transition-colors select-none border-b border-light-c',
        onClick: () => {
          open.value = !open.value
        }
      }, [
        h('span', {class: 'flex-1 font-semibold text-base-c text-base'}, props.title),
        props.badge ? h('span', {class: `text-sm font-medium px-2 py-0.5 rounded-full ${bc[props.badgeType] || bc.gray}`}, props.badge) : null,
        h('svg', {
          class: `w-4 h-4 text-hint-c transition-transform duration-200 ${open.value ? 'rotate-180' : ''}`,
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        }, [h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': 2,
          d: 'M19 9l-7 7-7-7'
        })]),
      ]),
      open.value ? h('div', {class: 'px-4 py-3'}, slots.default?.()) : null,
    ])
  },
}

// ─────────────────────────────────────────
// SOP Data model
// ─────────────────────────────────────────
let _uid = 1000
const uid = () => String(++_uid)

const sopData = reactive({groups: []})
const loading = ref(true)
const saving = ref(false)

// ─── 載入 API ───────────────────────────
async function loadSop() {
  loading.value = true
  try {
    const res = await fetch(`${BASE()}/load`)
    const data = await res.json()
    if (data.error) {
      showToast('載入失敗：' + data.error);
      return
    }
    sopData.groups = data.groups || []
    if (sopData.groups.length > 0) {
      activePageId.value = sopData.groups[0].pages?.[0]?.id || ''
    }
    showToast('已載入最新資料')
  } catch (e) {
    showToast('載入失敗，請確認伺服器')
  } finally {
    loading.value = false
  }
}

// ─── 儲存 API ───────────────────────────
async function saveSop() {
  saving.value = true
  try {
    const payload = JSON.stringify({groups: sopData.groups})
    const res = await fetch(`${BASE()}/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: payload,
    })
    const data = await res.json()
    if (data.error) {
      showToast('儲存失敗：' + data.error);
      return
    }
    showToast(`✅ 已儲存（v${data.version}）`)
  } catch (e) {
    showToast('儲存失敗，請確認伺服器')
  } finally {
    saving.value = false
  }
}

onMounted(loadSop)

// ── flattened page list ──
const allPages = computed(() => sopData.groups.flatMap(g => g.pages.map(p => ({...p, groupId: g.id}))))
const activePageId = ref('')
const activePage = computed(() => allPages.value.find(p => p.id === activePageId.value) || null)

// ─────────────────────────────────────────
// Sidebar edit helpers
// ─────────────────────────────────────────
const editingLabelId = ref(null)
const editingLabelVal = ref('')

function startEditLabel(id, val) {
  editingLabelId.value = id
  editingLabelVal.value = val
  nextTick(() => {
    document.getElementById('label-input-' + id)?.focus()
  })
}

function commitLabel(thing) {
  thing.label = editingLabelVal.value.trim() || thing.label
  editingLabelId.value = null
}

function addGroup() {
  sopData.groups.push({id: 'g' + uid(), label: '新分類', pages: []})
}

function deleteGroup(gIdx) {
  sopData.groups.splice(gIdx, 1)
}

function addPage(group) {
  const id = 'p' + uid()
  group.pages.push({id, label: '新頁面', icon: [['circle', {cx: 12, cy: 12, r: 10}]], blocks: []})
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
    ;
  [arr[idx], arr[target]] = [arr[target], arr[idx]]
}

function movePage(group, idx, dir) {
  const arr = group.pages
  const target = idx + dir
  if (target < 0 || target >= arr.length) return
    ;
  [arr[idx], arr[target]] = [arr[target], arr[idx]]
}

// ─────────────────────────────────────────
// Block edit helpers
// ─────────────────────────────────────────
const blockPickerOpen = ref(false)

function addBlock(page, type) {
  const id = 'b' + uid()
  if (type === 'checklist') page.blocks.push({type, id, title: '新 Checklist', badge: '', badgeType: 'gray', items: []})
  else if (type === 'steps') page.blocks.push({type, id, title: '新步驟說明', badge: '', badgeType: 'gray', items: []})
  else if (type === 'note') page.blocks.push({type, id, title: '新備註', content: '', variant: 'info'})
  else if (type === 'flowchart') page.blocks.push({type, id, title: '新流程圖', nodes: [], edges: []})
  else if (type === 'image') page.blocks.push({type, id, title: '圖片', images: []})
  blockPickerOpen.value = false
}

function deleteBlock(page, bIdx) {
  page.blocks.splice(bIdx, 1)
}

function moveBlock(page, idx, dir) {
  const arr = page.blocks
  const t = idx + dir
  if (t < 0 || t >= arr.length) return
    ;
  [arr[idx], arr[t]] = [arr[t], arr[idx]]
}

// checklist block helpers
function addCheckItem(block) {
  block.items.push({id: 'ci' + uid(), text: '新項目', done: false})
}

function deleteCheckItem(block, idx) {
  block.items.splice(idx, 1)
}

function moveCheckItem(block, idx, dir) {
  const t = idx + dir
  if (t < 0 || t >= block.items.length) return
    ;
  [block.items[idx], block.items[t]] = [block.items[t], block.items[idx]]
}

// steps block helpers
function addStepItem(block) {
  block.items.push({id: 'si' + uid(), title: '新步驟', desc: ''})
}

function deleteStepItem(block, idx) {
  block.items.splice(idx, 1)
}

function moveStepItem(block, idx, dir) {
  const t = idx + dir
  if (t < 0 || t >= block.items.length) return
    ;
  [block.items[idx], block.items[t]] = [block.items[t], block.items[idx]]
}

// ─────────────────────────────────────────
// 圖片資料庫 (SOP 專屬，固定路徑)
// holymotherfarm/staff/personnel/sop/images/
// ─────────────────────────────────────────
const imgLibOpen = ref(false)
const imgLibBlock = ref(null)
const imgLibList = ref([])
const imgLibLoading = ref(false)
const imgLibSearch = ref('')
const imgUploading = ref(false)

const imgLibFiltered = computed(() => {
  if (!imgLibSearch.value.trim()) return imgLibList.value
  const kw = imgLibSearch.value.toLowerCase()
  return imgLibList.value.filter(i =>
    (i.displayName || i.originalName || '').toLowerCase().includes(kw)
  )
})

async function openImgLib(block) {
  imgLibBlock.value = block
  imgLibOpen.value = true
  imgLibSearch.value = ''
  await loadImgList()
}

async function loadImgList() {
  imgLibLoading.value = true
  try {
    const res = await fetch(`${BASE()}/images/list`)
    imgLibList.value = await res.json()
  } catch {
    imgLibList.value = []
  } finally {
    imgLibLoading.value = false
  }
}

async function uploadImgFiles(event) {
  const files = event.target.files
  if (!files || files.length === 0) return
  imgUploading.value = true
  try {
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    const res = await fetch(`${BASE()}/images/upload`, {method: 'POST', body: fd})
    const data = await res.json()
    // 插入到清單最前面
    imgLibList.value = [...(Array.isArray(data) ? data : []), ...imgLibList.value]
    showToast(`上傳 ${Array.isArray(data) ? data.length : 0} 張圖片`)
  } catch {
    showToast('上傳失敗')
  } finally {
    imgUploading.value = false
    event.target.value = ''
  }
}

async function deleteLibImg(img) {
  if (!confirm(`確定刪除「${img.originalName}」？`)) return
  try {
    await fetch(`${BASE()}/images/remove?fileName=` + encodeURIComponent(img.fileName), {method: 'DELETE'})
    imgLibList.value = imgLibList.value.filter(i => i.fileName !== img.fileName)
    showToast('已刪除圖片')
  } catch {
    showToast('刪除失敗')
  }
}

function selectImg(img) {
  if (!imgLibBlock.value) return
  const block = imgLibBlock.value
  if (!block.images) block.images = []
  // 避免重複插入
  if (!block.images.find(i => i.url === img.url)) {
    block.images.push({
      url: img.url,
      thumbUrl: img.thumbUrl || img.url,
      displayName: img.displayName || img.originalName || '',
      caption: '',
    })
  }
  imgLibOpen.value = false
  showToast('圖片已插入')
}

function removeImg(block, idx) {
  block.images.splice(idx, 1)
}

function moveImg(block, idx, dir) {
  const t = idx + dir
  if (t < 0 || t >= block.images.length) return
    ;
  [block.images[idx], block.images[t]] = [block.images[t], block.images[idx]]
}

// ─────────────────────────────────────────
// Flowchart engine (per-block state)
// ─────────────────────────────────────────
const PALETTES = {
  customer: {fill: '#085041', stroke: '#5DCAA5', text: '#9FE1CB'},
  order: {fill: '#3C3489', stroke: '#AFA9EC', text: '#CECBF6'},
  payment: {fill: '#633806', stroke: '#EF9F27', text: '#FAC775'},
  invoice: {fill: '#27500A', stroke: '#97C459', text: '#C0DD97'},
  receipt: {fill: '#712B13', stroke: '#F0997B', text: '#F5C4B3'},
  neutral: {fill: '#444441', stroke: '#B4B2A9', text: '#D3D1C7'},
}
const LEGEND = [
  {label: '顧客類型', palette: 'customer'},
  {label: '訂單建立', palette: 'order'},
  {label: '付款方式', palette: 'payment'},
  {label: '電子發票', palette: 'invoice'},
  {label: '紙本帳單', palette: 'receipt'},
  {label: '其他', palette: 'neutral'},
]

const fcState = reactive({})

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

function nodeCx(n) {
  return n.x + n.w / 2
}

function nodeCy(n) {
  return n.y + n.h / 2
}

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
  if (!f || !t) return {x: 0, y: 0}
  const fx = nodeCx(f), fy = f.y + f.h
  const tx = nodeCx(t), ty = t.y
  return {x: e.mid ? e.mid.x : (fx + tx) / 2, y: e.mid ? e.mid.y : fy + (ty - fy) * 0.5}
}

function diamondPts(n) {
  const cx = nodeCx(n), cy = nodeCy(n)
  return `${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}`
}

function fcViewBox(block) {
  const ns = block.nodes
  if (!ns.length) return '0 0 680 200'
  const pad = 40
  const minX = ns.reduce((m, n) => Math.min(m, n.x), Infinity) - pad
  const minY = ns.reduce((m, n) => Math.min(m, n.y), Infinity) - pad
  const maxX = ns.reduce((m, n) => Math.max(m, n.x + n.w), -Infinity) + pad
  const maxY = ns.reduce((m, n) => Math.max(m, n.y + n.h), -Infinity) + pad + 60
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
}

function fcLegendY(block) {
  return block.nodes.reduce((m, n) => Math.max(m, n.y + n.h), -Infinity) + 20
}

function fcSelectNode(block, id) {
  const s = getFc(block)
  if (s.addingEdge) {
    if (s.addingEdge.fromId !== id) {
      block.edges.push({id: 'e' + (++s.nextId), from: s.addingEdge.fromId, to: id, label: '', mid: null})
    }
    s.addingEdge = null;
    return
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
  const id = 'n' + (++s.nextId)
  block.nodes.push({id, type: 'rect', label: '新節點', x: 200, y: 200, w: 120, h: 40, palette: 'neutral', sub: ''})
  s.selected = id
}

function fcDeleteSelected(block) {
  const s = getFc(block)
  if (s.selectedEdgeId) {
    fcDeleteEdge(block, s.selectedEdgeId);
    return
  }
  if (!s.selected) return
  const idx = block.nodes.findIndex(n => n.id === s.selected)
  if (idx >= 0) block.nodes.splice(idx, 1)
  for (let i = block.edges.length - 1; i >= 0; i--) {
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
  const cp = e.touches ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY}
  pt.x = cp.x;
  pt.y = cp.y
  const sp = pt.matrixTransform(svgEl.getScreenCTM().inverse())
  dragging = {block, nodeId, svgEl, ox: sp.x - n.x, oy: sp.y - n.y}
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', endDrag)
  window.addEventListener('touchmove', onDrag, {passive: false})
  window.addEventListener('touchend', endDrag)
}

function onDrag(e) {
  if (!dragging) return;
  e.preventDefault()
  const pt = dragging.svgEl.createSVGPoint()
  const cp = e.touches ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY}
  pt.x = cp.x;
  pt.y = cp.y
  const sp = pt.matrixTransform(dragging.svgEl.getScreenCTM().inverse())
  const n = dragging.block.nodes.find(x => x.id === dragging.nodeId)
  if (n) {
    n.x = sp.x - dragging.ox;
    n.y = sp.y - dragging.oy
  }
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
  e.preventDefault();
  e.stopPropagation()
  const edge = block.edges.find(x => x.id === eid)
  if (!edge) return
  if (!edge.mid) {
    const m = edgeMid(block, edge);
    edge.mid = {x: m.x, y: m.y}
  }
  const pt = svgEl.createSVGPoint()
  const cp = e.touches ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY}
  pt.x = cp.x;
  pt.y = cp.y
  const sp = pt.matrixTransform(svgEl.getScreenCTM().inverse())
  draggingWp = {block, eid, svgEl, ox: sp.x - edge.mid.x, oy: sp.y - edge.mid.y}
  window.addEventListener('mousemove', onWpDrag)
  window.addEventListener('mouseup', endWpDrag)
  window.addEventListener('touchmove', onWpDrag, {passive: false})
  window.addEventListener('touchend', endWpDrag)
}

function onWpDrag(e) {
  if (!draggingWp) return;
  e.preventDefault()
  const pt = draggingWp.svgEl.createSVGPoint()
  const cp = e.touches ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY}
  pt.x = cp.x;
  pt.y = cp.y
  const sp = pt.matrixTransform(draggingWp.svgEl.getScreenCTM().inverse())
  const edge = draggingWp.block.edges.find(x => x.id === draggingWp.eid)
  if (edge) edge.mid = {x: sp.x - draggingWp.ox, y: sp.y - draggingWp.oy}
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
  const blob = new Blob(['<?xml version="1.0"?>\n' + svgEl.cloneNode(true).outerHTML], {type: 'image/svg+xml'})
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'flowchart.svg';
  a.click()
}

// toast
const toast = reactive({show: false, message: ''})
let toastTimer = null

function showToast(msg) {
  toast.message = msg;
  toast.show = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.show = false
  }, 2500)
}
</script>

<template>
  <div class="min-h-full bg-surface2 transition-colors duration-300">

    <!-- Header -->
    <header
      class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-30">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-base font-bold flex-shrink-0">
            📋
          </div>
          <div>
            <h1 class="font-bold text-base-c leading-none text-base sm:text-lg">工作手冊</h1>
            <p class="text-sm text-hint-c mt-0.5 hidden sm:block">聖母健康農莊</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- Save button -->
          <button v-if="editMode"
                  @click="saveSop"
                  :disabled="saving"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border bg-green-700 border-green-700 text-white hover:bg-green-800 transition-all disabled:opacity-50">
            <svg v-if="!saving" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
            </svg>
            <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.36M20 15a9 9 0 01-14.13 3.36"/>
            </svg>
            <span class="hidden sm:inline">{{ saving ? '儲存中…' : '儲存' }}</span>
          </button>
          <!-- Edit Mode toggle -->
          <button @click="editMode = !editMode"
                  :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
 editMode
 ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
 : 'bg-surface2 border-light-c text-hint-c']">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            <span class="hidden sm:inline">{{ editMode ? '編輯中' : '編輯模式' }}</span>
            <span class="sm:hidden">{{ editMode ? '編輯中' : '編輯' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Loading overlay -->
    <div v-if="loading" class="flex items-center justify-center py-32 text-hint-c gap-3">
      <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.36M20 15a9 9 0 01-14.13 3.36"/>
      </svg>
      <span class="text-base">載入中…</span>
    </div>

    <div v-else class="w-full px-3 sm:px-4 py-4 sm:py-6 flex flex-col md:flex-row gap-4 items-start">

      <!-- ── Sidebar ── -->
      <nav class="w-48 flex-shrink-0 hidden md:block sticky top-20">
        <div
          class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
          <div v-for="(group, gIdx) in sopData.groups" :key="group.id">
            <!-- Group header -->
            <div class="flex items-center gap-1 px-3 pt-3 pb-1">
              <template v-if="editMode && editingLabelId === group.id">
                <input :id="'label-input-'+group.id" v-model="editingLabelVal"
                       @blur="commitLabel(group)" @keyup.enter="commitLabel(group)"
                       class="flex-1 text-sm font-semibold uppercase tracking-wider bg-surface2 rounded px-1 py-0.5 outline-none text-muted-c w-full"/>
              </template>
              <template v-else>
                <span :class="['flex-1 text-sm font-semibold uppercase tracking-wider text-hint-c truncate',
 editMode ? 'cursor-pointer hover-text-muted' : '']"
                      @click="editMode && startEditLabel(group.id, group.label)">{{ group.label }}</span>
              </template>
              <template v-if="editMode">
                <button @click="moveGroup(gIdx, -1)"
                        class="text-hint-c hover:text-hint-c text-sm px-0.5" title="上移">↑
                </button>
                <button @click="moveGroup(gIdx, 1)"
                        class="text-hint-c hover:text-hint-c text-sm px-0.5" title="下移">↓
                </button>
                <button @click="deleteGroup(gIdx)"
                        class="text-red-300 dark:text-red-700 hover:text-red-500 text-sm px-0.5" title="刪除分類">×
                </button>
              </template>
            </div>

            <!-- Pages -->
            <div v-for="(page, pIdx) in group.pages" :key="page.id"
                 class="flex items-center group/page">
              <a :class="['flex-1 flex items-center gap-2 px-3 py-2 text-base cursor-pointer transition-colors border-l-2 min-w-0',
 activePageId === page.id
 ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium'
 : 'border-transparent text-muted-c hover-surface2']"
                 @click="activePageId = page.id">
                <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2">
                  <component v-for="(p, i) in page.icon" :key="'ic'+i" :is="p[0]" v-bind="p[1]"/>
                </svg>
                <template v-if="editMode && editingLabelId === page.id">
                  <input :id="'label-input-'+page.id" v-model="editingLabelVal"
                         @blur="commitLabel(page)" @keyup.enter="commitLabel(page)"
                         class="flex-1 min-w-0 text-sm bg-surface2 rounded px-1 py-0.5 outline-none"/>
                </template>
                <template v-else>
                  <span class="truncate text-sm"
                        @dblclick="editMode && startEditLabel(page.id, page.label)">{{ page.label }}</span>
                </template>
              </a>
              <template v-if="editMode">
                <div class="flex flex-col pr-1 md:opacity-0 md:group-hover/page:opacity-100 transition-opacity">
                  <button @click="movePage(group, pIdx, -1)"
                          class="text-hint-c hover:text-hint-c text-sm leading-none">↑
                  </button>
                  <button @click="movePage(group, pIdx, 1)"
                          class="text-hint-c hover:text-hint-c text-sm leading-none">↓
                  </button>
                </div>
                <button @click="deletePage(group, pIdx)"
                        class="pr-2 text-red-300 hover:text-red-500 text-sm md:opacity-0 md:group-hover/page:opacity-100 transition-opacity">
                  ×
                </button>
              </template>
            </div>

            <!-- Add page -->
            <div v-if="editMode" class="px-3 pb-2 pt-1">
              <button @click="addPage(group)"
                      class="w-full text-sm text-hint-c hover:text-green-600 dark:hover:text-green-400 border border-dashed border-light-c rounded-lg py-1 transition-colors">
                ＋ 新增頁面
              </button>
            </div>
          </div>

          <!-- Add group -->
          <div v-if="editMode" class="px-3 py-2 border-t border-light-c">
            <button @click="addGroup"
                    class="w-full text-sm text-hint-c hover:text-green-600 dark:hover:text-green-400 border border-dashed border-light-c rounded-lg py-1 transition-colors">
              ＋ 新增分類
            </button>
          </div>
        </div>
      </nav>

      <!-- Mobile nav -->
      <div class="md:hidden w-full">
        <div class="flex gap-2 mb-2">
          <select v-model="activePageId"
                  class="flex-1 min-w-0 text-base border border-light-c rounded-xl px-3 py-2 bg-surface text-base-c outline-none">
            <optgroup v-for="g in sopData.groups" :key="g.id" :label="g.label">
              <option v-for="p in g.pages" :key="p.id" :value="p.id">{{ p.label }}</option>
            </optgroup>
          </select>
          <!-- Mobile edit shortcuts -->
          <template v-if="editMode">
            <button
              @click="sopData.groups.length && addPage(sopData.groups[sopData.groups.findIndex(g => g.pages.some(p => p.id === activePageId)) >= 0 ? sopData.groups.findIndex(g => g.pages.some(p => p.id === activePageId)) : 0])"
              class="px-3 py-2 rounded-xl border border-dashed border-light-c text-hint-c hover:text-green-600 text-sm whitespace-nowrap">
              ＋頁面
            </button>
            <button @click="addGroup"
                    class="px-3 py-2 rounded-xl border border-dashed border-light-c text-hint-c hover:text-green-600 text-sm whitespace-nowrap">
              ＋分類
            </button>
          </template>
        </div>
      </div>

      <!-- ── Main ── -->
      <div class="flex-1 min-w-0">
        <template v-if="activePage">

          <!-- Page header -->
          <div class="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 class="text-lg font-bold text-base-c">{{ activePage.label }}</h2>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="activePage.blocks.length === 0"
               class="flex flex-col items-center justify-center py-16 text-hint-c">
            <svg class="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-base">這個頁面還沒有內容</p>
            <p v-if="!editMode" class="text-sm mt-1">開啟右上角「編輯模式」來新增區塊</p>
          </div>

          <!-- Blocks -->
          <div v-for="(block, bIdx) in activePage.blocks" :key="block.id" class="relative group/block">

            <!-- Block edit controls -->
            <div v-if="editMode"
                 class="absolute -top-2 -right-2 z-10 flex items-center gap-1 md:opacity-0 md:group-hover/block:opacity-100 transition-opacity bg-surface rounded-xl border border-light-c shadow-sm px-1.5 py-1">
              <button @click="moveBlock(activePage, bIdx, -1)" class="text-hint-c hover:text-muted-c text-sm px-1"
                      title="上移">↑
              </button>
              <button @click="moveBlock(activePage, bIdx, 1)" class="text-hint-c hover:text-muted-c text-sm px-1"
                      title="下移">↓
              </button>
              <span class="text-base-c dark:text-muted-c">|</span>
              <button @click="deleteBlock(activePage, bIdx)" class="text-red-400 hover:text-red-600 text-sm px-1"
                      title="刪除">🗑
              </button>
            </div>

            <!-- ── Checklist block ── -->
            <template v-if="block.type === 'checklist'">
              <SopCard :title="block.title" :badge="block.badge" :badge-type="block.badgeType">
                <div v-if="editMode" class="flex gap-2 mb-3 flex-wrap">
                  <input v-model="block.title" placeholder="標題"
                         class="flex-1 min-w-0 px-2 py-1 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none"/>
                  <input v-model="block.badge" placeholder="標籤"
                         class="w-24 px-2 py-1 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none"/>
                  <select v-model="block.badgeType"
                          class="px-2 py-1 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none">
                    <option value="green">綠</option>
                    <option value="orange">橙</option>
                    <option value="gray">灰</option>
                  </select>
                </div>
                <ul class="divide-y divide-base">
                  <li v-for="(item, iIdx) in block.items" :key="item.id"
                      class="flex items-start gap-3 py-2.5 group/item">
                    <div @click="!editMode && (item.done = !item.done)"
                         :class="['mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 transition-all flex items-center justify-center',
 !editMode ? 'cursor-pointer' : '',
 item.done ? 'bg-green-600 border-green-600' : 'border-base']">
                      <svg v-if="item.done" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor"
                           viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <template v-if="editMode">
                      <input v-model="item.text"
                             class="flex-1 min-w-0 px-2 py-0.5 text-base border border-light-c rounded-lg bg-surface2 text-base-c outline-none"/>
                      <div
                        class="flex gap-0.5 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity flex-shrink-0">
                        <button @click="moveCheckItem(block, iIdx, -1)"
                                class="text-hint-c hover:text-hint-c text-sm px-0.5">↑
                        </button>
                        <button @click="moveCheckItem(block, iIdx, 1)"
                                class="text-hint-c hover:text-hint-c text-sm px-0.5">↓
                        </button>
                        <button @click="deleteCheckItem(block, iIdx)"
                                class="text-red-300 hover:text-red-500 text-sm px-0.5">×
                        </button>
                      </div>
                    </template>
                    <span v-else
                          :class="['flex-1 text-base leading-relaxed', item.done ? 'line-through text-hint-c' : 'text-base-c']">{{
                        item.text
                      }}</span>
                  </li>
                </ul>
                <div class="flex items-center justify-between mt-2">
                  <button v-if="editMode" @click="addCheckItem(block)"
                          class="text-sm text-green-600 dark:text-green-400 hover:underline">＋ 新增項目
                  </button>
                  <div v-else/>
                  <button @click="block.items.forEach(i => i.done = false)"
                          class="text-sm text-hint-c hover-text-muted px-2 py-1 rounded-lg hover-surface2 transition-colors">
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
                         class="flex-1 min-w-0 px-2 py-1 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none"/>
                  <input v-model="block.badge" placeholder="標籤"
                         class="w-24 px-2 py-1 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none"/>
                  <select v-model="block.badgeType"
                          class="px-2 py-1 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none">
                    <option value="green">綠</option>
                    <option value="orange">橙</option>
                    <option value="gray">灰</option>
                  </select>
                </div>
                <ol class="space-y-3">
                  <li v-for="(item, iIdx) in block.items" :key="item.id" class="flex gap-3 group/step">
                    <span
                      class="w-6 h-6 rounded-full bg-green-700 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{{
                        iIdx + 1
                      }}</span>
                    <div class="flex-1 min-w-0">
                      <template v-if="editMode">
                        <input v-model="item.title" placeholder="步驟標題"
                               class="w-full px-2 py-1 text-base border border-light-c rounded-lg bg-surface2 text-base-c outline-none mb-1"/>
                        <textarea v-model="item.desc" placeholder="步驟說明（選填）" rows="2"
                                  class="w-full px-2 py-1 text-sm border border-light-c rounded-lg bg-surface2 text-muted-c outline-none resize-none"/>
                      </template>
                      <template v-else>
                        <p class="text-base font-medium text-base-c">{{ item.title }}</p>
                        <p v-if="item.desc"
                           class="text-sm text-hint-c mt-0.5 whitespace-pre-line">{{
                            item.desc
                          }}</p>
                      </template>
                    </div>
                    <div v-if="editMode"
                         class="flex gap-0.5 md:opacity-0 md:group-hover/step:opacity-100 transition-opacity flex-shrink-0 pt-1">
                      <button @click="moveStepItem(block, iIdx, -1)"
                              class="text-hint-c hover:text-hint-c text-sm px-0.5">↑
                      </button>
                      <button @click="moveStepItem(block, iIdx, 1)"
                              class="text-hint-c hover:text-hint-c text-sm px-0.5">↓
                      </button>
                      <button @click="deleteStepItem(block, iIdx)"
                              class="text-red-300 hover:text-red-500 text-sm px-0.5">×
                      </button>
                    </div>
                  </li>
                </ol>
                <button v-if="editMode" @click="addStepItem(block)"
                        class="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline">＋ 新增步驟
                </button>
              </SopCard>
            </template>

            <!-- ── Note block ── -->
            <template v-else-if="block.type === 'note'">
              <div :class="['rounded-2xl px-4 py-3 mb-3 border',
 block.variant==='warn' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
 block.variant==='info' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
 'bg-surface2 border-light-c']">
                <template v-if="editMode">
                  <div class="flex gap-2 mb-2 flex-wrap">
                    <input v-model="block.title" placeholder="標題"
                           class="flex-1 min-w-0 px-2 py-1 text-sm border border-light-c rounded-lg bg-surface text-base-c outline-none font-semibold"/>
                    <select v-model="block.variant"
                            class="px-2 py-1 text-sm border border-light-c rounded-lg bg-surface text-base-c outline-none">
                      <option value="info">藍色</option>
                      <option value="warn">橙色</option>
                      <option value="default">灰色</option>
                    </select>
                  </div>
                  <textarea v-model="block.content" placeholder="內容（換行用 Enter）" rows="8"
                            class="w-full px-2 py-1 text-sm border border-light-c rounded-lg bg-surface text-muted-c outline-none resize-y"/>
                </template>
                <template v-else>
                  <p :class="['text-base font-semibold mb-1',
 block.variant==='warn' ? 'text-orange-700 dark:text-orange-300' :
 block.variant==='info' ? 'text-blue-700 dark:text-blue-300' : 'text-base-c']">
                    {{ block.title }}
                  </p>
                  <p :class="['text-sm leading-relaxed whitespace-pre-line',
 block.variant==='warn' ? 'text-orange-600 dark:text-orange-400' :
 block.variant==='info' ? 'text-blue-600 dark:text-blue-400' : 'text-hint-c']">
                    {{ block.content }}
                  </p>
                </template>
              </div>
            </template>

            <!-- ── Image block ── -->
            <template v-else-if="block.type === 'image'">
              <div
                class="bg-surface rounded-2xl border border-light-c shadow-sm mb-3 overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 border-b border-light-c">
                  <template v-if="editMode">
                    <input v-model="block.title" placeholder="標題"
                           class="flex-1 px-2 py-1 text-base font-semibold border border-light-c rounded-lg bg-surface2 text-base-c outline-none"/>
                  </template>
                  <span v-else class="flex-1 font-semibold text-base-c text-base">{{
                      block.title || '圖片'
                    }}</span>
                  <button v-if="editMode"
                          @click="openImgLib(block)"
                          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    插入圖片
                  </button>
                </div>
                <div class="p-3">
                  <!-- Empty -->
                  <div v-if="!block.images || block.images.length === 0"
                       class="flex flex-col items-center justify-center py-8 text-hint-c border-2 border-dashed border-light-c rounded-xl">
                    <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <p class="text-sm">{{ editMode ? '點擊上方「插入圖片」從資源庫選取' : '尚無圖片' }}</p>
                  </div>
                  <!-- Grid -->
                  <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div v-for="(img, iIdx) in block.images" :key="iIdx"
                         class="relative group/img rounded-xl overflow-hidden border border-light-c bg-surface2">
                      <!-- Thumbnail -->
                      <a :href="img.url" target="_blank" rel="noopener">
                        <img :src="img.thumbUrl || img.url"
                             :alt="img.displayName || img.caption || '圖片'"
                             class="w-full aspect-square object-cover hover:opacity-90 transition-opacity"/>
                      </a>
                      <!-- Caption -->
                      <div class="px-2 py-1.5">
                        <template v-if="editMode">
                          <input v-model="img.caption" placeholder="說明文字（選填）"
                                 class="w-full text-sm bg-transparent outline-none text-hint-c"/>
                        </template>
                        <p v-else-if="img.caption" class="text-sm text-hint-c truncate">
                          {{ img.caption }}</p>
                      </div>
                      <!-- Edit controls -->
                      <div v-if="editMode"
                           class="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <button @click="moveImg(block, iIdx, -1)"
                                class="w-6 h-6 flex items-center justify-center bg-black/60 text-white rounded-lg text-sm hover:bg-black/80">
                          ←
                        </button>
                        <button @click="moveImg(block, iIdx, 1)"
                                class="w-6 h-6 flex items-center justify-center bg-black/60 text-white rounded-lg text-sm hover:bg-black/80">
                          →
                        </button>
                        <button @click="removeImg(block, iIdx)"
                                class="w-6 h-6 flex items-center justify-center bg-red-500/80 text-white rounded-lg text-sm hover:bg-red-600">
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- ── Flowchart block ── -->
            <template v-else-if="block.type === 'flowchart'">
              <div
                class="bg-surface rounded-2xl border border-light-c shadow-sm mb-3 overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 border-b border-light-c">
                  <span class="flex-1 font-semibold text-base-c text-base">{{ block.title }}</span>
                  <template v-if="editMode">
                    <input v-model="block.title"
                           class="text-sm px-2 py-1 border border-light-c rounded-lg bg-surface2 text-base-c outline-none w-32"
                           placeholder="流程圖名稱"/>
                  </template>
                  <!-- tab pills -->
                  <div class="flex items-center gap-0.5 bg-surface2 rounded-xl p-0.5">
                    <button @click="getFc(block).tab='view'"
                            :class="['px-3 py-1 text-sm font-medium rounded-lg transition-colors',
 getFc(block).tab==='view' ? 'bg-surface text-base-c shadow-sm' : 'text-hint-c hover:text-muted-c']">
                      📋 檢視
                    </button>
                    <button @click="getFc(block).tab='edit'"
                            :class="['px-3 py-1 text-sm font-medium rounded-lg transition-colors',
 getFc(block).tab==='edit' ? 'bg-surface text-base-c shadow-sm' : 'text-hint-c hover:text-muted-c']">
                      ✏️ 編輯
                    </button>
                  </div>
                </div>

                <div class="p-3">
                  <!-- View -->
                  <div v-if="getFc(block).tab==='view'" class="rounded-xl overflow-auto p-3">
                    <svg :viewBox="fcViewBox(block)" width="100%" style="min-width:400px;display:block;">
                      <defs>
                        <marker id="va" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6"
                                orient="auto-start-reverse">
                          <path d="M2 1L8 5L2 9" fill="none" stroke="#9C9A92" stroke-width="1.5"
                                stroke-linecap="round"/>
                        </marker>
                      </defs>
                      <g v-for="e in block.edges" :key="e.id">
                        <path :d="edgePoints(block,e)" fill="none" stroke="#9C9A92" stroke-width="0.8" opacity="0.5"
                              marker-end="url(#va)"/>
                        <text v-if="e.label" :x="edgeMid(block,e).x" :y="edgeMid(block,e).y-6" text-anchor="middle"
                              font-size="15" fill="#9C9A92">{{ e.label }}
                        </text>
                      </g>
                      <g v-for="n in block.nodes" :key="n.id">
                        <template v-if="n.type==='rect'">
                          <rect :x="n.x" :y="n.y" :width="n.w" :height="n.h" rx="8" :fill="pal(n.palette).fill"
                                :stroke="pal(n.palette).stroke" stroke-width="0.5"/>
                          <text :x="n.x+n.w/2" :y="n.sub?n.y+n.h/2-8:n.y+n.h/2" text-anchor="middle"
                                dominant-baseline="central" font-size="16" font-weight="500"
                                :fill="pal(n.palette).text">{{ n.label }}
                          </text>
                          <text v-if="n.sub" :x="n.x+n.w/2" :y="n.y+n.h/2+10" text-anchor="middle"
                                dominant-baseline="central" font-size="15" :fill="pal(n.palette).stroke">{{ n.sub }}
                          </text>
                        </template>
                        <template v-else-if="n.type==='diamond'">
                          <polygon :points="diamondPts(n)" fill="transparent" :stroke="pal(n.palette).text"
                                   stroke-width="1" opacity="0.85"/>
                          <text :x="n.x+n.w/2" :y="n.sub?n.y+n.h/2-7:n.y+n.h/2" text-anchor="middle"
                                dominant-baseline="central" font-size="15" font-weight="500" fill="#FAF9F5">
                            {{ n.label }}
                          </text>
                          <text v-if="n.sub" :x="n.x+n.w/2" :y="n.y+n.h/2+9" text-anchor="middle"
                                dominant-baseline="central" font-size="16" fill="#B4B2A9">{{ n.sub }}
                          </text>
                        </template>
                      </g>
                      <g v-for="(l,i) in LEGEND" :key="l.label" :transform="`translate(0,${fcLegendY(block)})`">
                        <rect :x="40+i*105" y="0" width="14" height="14" rx="3" :fill="pal(l.palette).fill"
                              :stroke="pal(l.palette).stroke" stroke-width="0.5"/>
                        <text :x="60+i*105" y="11" font-size="16" fill="#C2C0B6">{{ l.label }}</text>
                      </g>
                    </svg>
                  </div>

                  <!-- Edit -->
                  <div v-else>
                    <div class="flex flex-wrap gap-2 mb-3">
                      <button @click="fcAddNode(block)"
                              class="px-3 py-1.5 text-sm font-medium rounded-xl border border-light-c bg-surface text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                        ＋ 新增節點
                      </button>
                      <button @click="fcDeleteSelected(block)"
                              :disabled="!getFc(block).selected && !getFc(block).selectedEdgeId"
                              class="px-3 py-1.5 text-sm font-medium rounded-xl border border-light-c bg-surface text-red-600 dark:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40">
                        🗑 刪除選取
                      </button>
                      <button
                        @click="getFc(block).addingEdge = getFc(block).addingEdge ? null : { fromId: getFc(block).selected }"
                        :disabled="!getFc(block).selected"
                        :class="['px-3 py-1.5 text-sm font-medium rounded-xl border transition-colors disabled:opacity-40',
 getFc(block).addingEdge ? 'bg-green-700 border-green-700 text-white' : 'border-light-c bg-surface text-muted-c']">
                        {{ getFc(block).addingEdge ? '點選目標節點…' : '↗ 連線' }}
                      </button>
                      <button @click="e => fcExport(block, e.currentTarget.closest('.fc-editor').querySelector('svg'))"
                              class="px-3 py-1.5 text-sm font-medium rounded-xl border border-light-c bg-surface text-hint-c hover:bg-surface2 transition-colors ml-auto">
                        ⬇ 匯出
                      </button>
                    </div>

                    <div class="fc-editor flex gap-3 items-start">
                      <div class="flex-1 rounded-xl overflow-auto">
                        <svg :viewBox="fcViewBox(block)" width="100%"
                             style="min-width:400px;display:block;"
                             :style="{cursor: getFc(block).addingEdge ? 'crosshair' : 'default'}"
                             :ref="el => { if(el) getFc(block).svgRef = el }">
                          <defs>
                            <marker id="ea" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6"
                                    orient="auto-start-reverse">
                              <path d="M2 1L8 5L2 9" fill="none" stroke="#9C9A92" stroke-width="1.5"
                                    stroke-linecap="round"/>
                            </marker>
                          </defs>
                          <g v-for="e in block.edges" :key="e.id">
                            <path :d="edgePoints(block,e)" fill="none" stroke="transparent" stroke-width="12"
                                  style="cursor:pointer" @click.stop="fcSelectEdge(block,e.id)"/>
                            <path :d="edgePoints(block,e)" fill="none"
                                  :stroke="getFc(block).selectedEdgeId===e.id?'#60A5FA':'#9C9A92'"
                                  :stroke-width="getFc(block).selectedEdgeId===e.id?1.5:0.8"
                                  opacity="0.9" marker-end="url(#ea)"/>
                            <text v-if="e.label" :x="edgeMid(block,e).x" :y="edgeMid(block,e).y-6"
                                  text-anchor="middle" font-size="15"
                                  :fill="getFc(block).selectedEdgeId===e.id?'#93C5FD':'#9C9A92'">{{ e.label }}
                            </text>
                            <g v-if="getFc(block).selectedEdgeId===e.id">
                              <circle :cx="edgeMid(block,e).x" :cy="edgeMid(block,e).y" r="6"
                                      fill="#1D4ED8" stroke="#93C5FD" stroke-width="1.5" style="cursor:move"
                                      @mousedown.stop="fcWpStart($event,block,e.id,getFc(block).svgRef)"
                                      @touchstart.stop.prevent="fcWpStart($event,block,e.id,getFc(block).svgRef)"/>
                            </g>
                          </g>
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
                              <text :x="n.x+n.w/2" :y="n.sub?n.y+n.h/2-8:n.y+n.h/2" text-anchor="middle"
                                    dominant-baseline="central" font-size="16" font-weight="500"
                                    :fill="pal(n.palette).text" style="pointer-events:none">{{ n.label }}
                              </text>
                              <text v-if="n.sub" :x="n.x+n.w/2" :y="n.y+n.h/2+10" text-anchor="middle"
                                    dominant-baseline="central" font-size="15" :fill="pal(n.palette).stroke"
                                    style="pointer-events:none">{{ n.sub }}
                              </text>
                            </template>
                            <template v-else-if="n.type==='diamond'">
                              <polygon :points="diamondPts(n)" fill="transparent"
                                       :stroke="getFc(block).selected===n.id?'#FFD700':pal(n.palette).text"
                                       :stroke-width="getFc(block).selected===n.id?2:1" opacity="0.9"/>
                              <text :x="n.x+n.w/2" :y="n.sub?n.y+n.h/2-7:n.y+n.h/2" text-anchor="middle"
                                    dominant-baseline="central" font-size="15" font-weight="500" fill="#FAF9F5"
                                    style="pointer-events:none">{{ n.label }}
                              </text>
                              <text v-if="n.sub" :x="n.x+n.w/2" :y="n.y+n.h/2+9" text-anchor="middle"
                                    dominant-baseline="central" font-size="16" fill="#B4B2A9"
                                    style="pointer-events:none">{{ n.sub }}
                              </text>
                            </template>
                          </g>
                        </svg>
                      </div>

                      <!-- Property panel -->
                      <div class="w-48 flex-shrink-0">
                        <div v-if="getFc(block).selected && block.nodes.find(n=>n.id===getFc(block).selected)"
                             class="bg-surface rounded-2xl border border-light-c p-3 text-sm">
                          <p class="text-sm font-semibold text-hint-c uppercase tracking-wide mb-2">節點屬性</p>
                          <label class="block text-hint-c mb-1">文字</label>
                          <input v-model="block.nodes.find(n=>n.id===getFc(block).selected).label"
                                 class="w-full px-2 py-1.5 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none mb-2"/>
                          <label class="block text-hint-c mb-1">副標題</label>
                          <input v-model="block.nodes.find(n=>n.id===getFc(block).selected).sub" placeholder="（選填）"
                                 class="w-full px-2 py-1.5 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none mb-2"/>
                          <label class="block text-hint-c mb-1">形狀</label>
                          <select v-model="block.nodes.find(n=>n.id===getFc(block).selected).type"
                                  class="w-full px-2 py-1.5 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none mb-2">
                            <option value="rect">矩形</option>
                            <option value="diamond">菱形（判斷）</option>
                          </select>
                          <label class="block text-hint-c mb-1">顏色</label>
                          <select v-model="block.nodes.find(n=>n.id===getFc(block).selected).palette"
                                  class="w-full px-2 py-1.5 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none mb-2">
                            <option value="customer">顧客（綠）</option>
                            <option value="order">訂單（紫）</option>
                            <option value="payment">付款（橙）</option>
                            <option value="invoice">發票（草綠）</option>
                            <option value="receipt">帳單（磚紅）</option>
                            <option value="neutral">其他（灰）</option>
                          </select>
                          <div class="grid grid-cols-2 gap-1.5">
                            <div><label class="block text-hint-c mb-1">寬</label>
                              <input type="number" v-model.number="block.nodes.find(n=>n.id===getFc(block).selected).w"
                                     class="w-full px-2 py-1.5 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none"/>
                            </div>
                            <div><label class="block text-hint-c mb-1">高</label>
                              <input type="number" v-model.number="block.nodes.find(n=>n.id===getFc(block).selected).h"
                                     class="w-full px-2 py-1.5 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none"/>
                            </div>
                          </div>
                        </div>

                        <div
                          v-else-if="getFc(block).selectedEdgeId && block.edges.find(e=>e.id===getFc(block).selectedEdgeId)"
                          class="bg-surface rounded-2xl border border-blue-200 dark:border-blue-800 p-3 text-sm">
                          <p class="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-2">連線屬性</p>
                          <div class="text-sm text-hint-c mb-2">
                            {{
                              (block.nodes.find(n => n.id === block.edges.find(e => e.id === getFc(block).selectedEdgeId)?.from) || {label: '?'}).label
                            }}
                            <span class="text-blue-400 mx-1">→</span>
                            {{
                              (block.nodes.find(n => n.id === block.edges.find(e => e.id === getFc(block).selectedEdgeId)?.to) || {label: '?'}).label
                            }}
                          </div>
                          <label class="block text-hint-c mb-1">標籤</label>
                          <input v-model="block.edges.find(e=>e.id===getFc(block).selectedEdgeId).label"
                                 placeholder="是 / 否"
                                 class="w-full px-2 py-1.5 text-sm border border-light-c rounded-lg bg-surface2 text-base-c outline-none mb-3"/>
                          <button @click="fcResetEdgeMid(block, getFc(block).selectedEdgeId)"
                                  class="w-full px-2 py-1.5 text-sm border border-light-c rounded-lg bg-surface2 text-hint-c hover:bg-surface2 transition-colors mb-2">
                            ↺ 重置折點
                          </button>
                          <button @click="fcDeleteEdge(block, getFc(block).selectedEdgeId)"
                                  class="w-full px-2 py-1.5 text-sm border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
                            🗑 刪除連線
                          </button>
                        </div>

                        <div v-else
                             class="bg-surface2/50 rounded-2xl border border-dashed border-light-c p-4 text-center text-sm text-hint-c">
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
                      class="w-full py-2.5 text-base text-hint-c hover:text-green-600 dark:hover:text-green-400 border-2 border-dashed border-light-c rounded-2xl transition-colors flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                新增區塊
              </button>
            </div>
            <div v-else
                 class="bg-surface rounded-2xl border border-light-c shadow-sm p-4">
              <p class="text-sm font-semibold text-hint-c mb-3">選擇區塊類型</p>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button v-for="bt in [
                  { type:'checklist', icon:'☑️', label:'Checklist', desc:'可打勾的清單' },
                  { type:'steps',     icon:'📝', label:'步驟說明', desc:'有編號的步驟' },
                  { type:'note',      icon:'📌', label:'備註',     desc:'提示或警告' },
                  { type:'image',     icon:'🖼️', label:'圖片',     desc:'從資源庫選取' },
                  { type:'flowchart', icon:'🔀', label:'流程圖',   desc:'可編輯的流程圖' },
                ]" :key="bt.type"
                        @click="addBlock(activePage, bt.type)"
                        class="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-light-c hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all cursor-pointer text-center">
                  <span class="text-2xl">{{ bt.icon }}</span>
                  <span class="text-sm font-semibold text-base-c">{{ bt.label }}</span>
                  <span class="text-sm text-hint-c">{{ bt.desc }}</span>
                </button>
              </div>
              <button @click="blockPickerOpen = false"
                      class="mt-3 text-sm text-hint-c hover:text-muted-c w-full text-center">取消
              </button>
            </div>
          </div>

        </template>

        <!-- No page selected -->
        <div v-else class="flex flex-col items-center justify-center py-24 text-hint-c">
          <p class="text-base">請從左側選擇頁面</p>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 right-6 bg-accent-solid text-white text-base px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
        <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>

    <!-- ── Image Library Modal ── -->
    <transition name="modal">
      <div v-if="imgLibOpen"
           class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
           @click.self="imgLibOpen = false">
        <div
          class="bg-surface rounded-2xl border border-light-c shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">

          <!-- Modal header -->
          <div class="flex flex-col gap-2 px-4 py-3 border-b border-light-c flex-shrink-0">
            <!-- Row 1: title + close -->
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span class="font-semibold text-base-c flex-1 text-base">選取圖片</span>
              <button @click="imgLibOpen = false"
                      class="text-hint-c hover:text-muted-c text-xl leading-none flex-shrink-0">
                ×
              </button>
            </div>
            <!-- Row 2: upload + search -->
            <div class="flex items-center gap-2">
              <label :class="['flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border transition-colors cursor-pointer flex-shrink-0',
 imgUploading
 ? 'border-light-c bg-surface2 text-hint-c cursor-not-allowed'
 : 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100']">
                <svg v-if="!imgUploading" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.36M20 15a9 9 0 01-14.13 3.36"/>
                </svg>
                {{ imgUploading ? '上傳中…' : '上傳圖片' }}
                <input type="file" accept="image/*" multiple class="hidden" :disabled="imgUploading"
                       @change="uploadImgFiles"/>
              </label>
              <input v-model="imgLibSearch" placeholder="搜尋…"
                     class="flex-1 min-w-0 px-3 py-1.5 text-sm border border-light-c rounded-xl bg-surface2 text-base-c outline-none"/>
            </div>
          </div>

          <!-- Image grid -->
          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="imgLibLoading" class="flex items-center justify-center py-16 text-hint-c gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.36M20 15a9 9 0 01-14.13 3.36"/>
              </svg>
              <span class="text-base">載入中…</span>
            </div>
            <div v-else-if="imgLibFiltered.length === 0"
                 class="flex flex-col items-center justify-center py-16 text-hint-c">
              <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p class="text-base">尚無圖片，點擊右上角上傳</p>
            </div>
            <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              <div v-for="img in imgLibFiltered" :key="img.url"
                   class="group/imgsel relative rounded-xl overflow-hidden border-2 border-transparent hover:border-green-500 transition-all aspect-square bg-surface2">
                <!-- Select click -->
                <button class="w-full h-full" @click="selectImg(img)">
                  <img :src="img.thumbUrl || img.url"
                       :alt="img.displayName || img.originalName"
                       class="w-full h-full object-cover group-hover/imgsel:scale-105 transition-transform duration-200"/>
                  <div
                    class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover/imgsel:opacity-100 transition-opacity">
                    <p class="text-sm text-white truncate">{{ img.displayName || img.originalName }}</p>
                  </div>
                </button>
                <!-- Delete button -->
                <button @click.stop="deleteLibImg(img)"
                        class="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-red-500/80 text-white rounded-lg text-sm opacity-0 group-hover/imgsel:opacity-100 transition-opacity hover:bg-red-600 z-10">
                  ×
                </button>
              </div>
            </div>
          </div>

          <!-- Modal footer -->
          <div
            class="px-4 py-2.5 border-t border-light-c flex-shrink-0 flex items-center justify-between">
            <span class="text-sm text-hint-c">共 {{ imgLibFiltered.length }} 張圖片・點擊圖片即可插入</span>
            <button @click="imgLibOpen = false"
                    class="px-3 py-1.5 text-sm rounded-xl border border-light-c text-hint-c hover-surface2 transition-colors">
              關閉
            </button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white, .modal-leave-active .bg-white {
  transition: transform 0.2s;
}

.modal-enter-from .bg-white, .modal-leave-to .bg-white {
  transform: scale(0.96);
}
</style>
