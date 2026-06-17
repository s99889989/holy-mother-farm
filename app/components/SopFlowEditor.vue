<template>
  <div class="sop-flow-editor select-none" ref="editorRef">
    <div class="overflow-x-auto overflow-y-visible pb-4" ref="scrollRef">
      <div
        class="relative"
        :style="{ width: canvasWidth + 'px', minHeight: canvasHeight + 'px' }"
      >
        <!-- SVG 連線層 -->
        <svg
          class="absolute inset-0 pointer-events-none"
          :width="canvasWidth"
          :height="canvasHeight"
          style="overflow: visible;"
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6"
                    refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6"
                       :fill="dark ? '#57534e' : '#d6d3d1'" />
            </marker>
            <marker id="arrowhead-branch-0" markerWidth="8" markerHeight="6"
                    refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#0d9488" />
            </marker>
            <marker id="arrowhead-branch-1" markerWidth="8" markerHeight="6"
                    refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>
          <path
            v-for="(edge, i) in computedEdges"
            :key="'e' + i"
            :d="edge.d"
            :stroke="edge.color || (dark ? '#57534e' : '#d6d3d1')"
            :stroke-dasharray="edge.dashed ? '5 4' : 'none'"
            stroke-width="1.5"
            fill="none"
            stroke-linecap="round"
            :marker-end="edge.marker || 'url(#arrowhead)'"
          />
        </svg>

        <!-- 節點層 -->
        <template v-for="(node, ni) in layoutNodes" :key="node.id">

          <!-- 開始節點 -->
          <div v-if="node.type === 'start'"
               class="absolute flex items-center justify-center"
               :style="nodeStyle(node)">
            <div :class="[
 'px-5 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm',
 dark ? 'border-amber-600 text-amber-400' : 'bg-amber-50 border-amber-400 text-amber-700'
 ]">開始</div>
          </div>

          <!-- 結束節點 -->
          <div v-else-if="node.type === 'end'"
               class="absolute flex items-center justify-center"
               :style="nodeStyle(node)">
            <div :class="[
 'px-5 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm',
 'bg-surface2 border-base text-muted-c'
 ]">結束</div>
          </div>

          <!-- 普通步驟 -->
          <div v-else-if="node.type === 'step'"
               class="absolute"
               :style="nodeStyle(node)">
            <div :class="[
 'rounded-xl border shadow-sm overflow-hidden transition-shadow',
 dark ? 'border-base hover:border-amber-700' : 'bg-surface border-light-c hover:border-amber-300',
 editingId === node.id ? (dark ? 'border-amber-600 shadow-amber-900/30' : 'border-amber-400 shadow-amber-100') : ''
 ]" :style="{ width: NODE_W + 'px' }">
              <!-- 色條 + 序號 -->
              <div :class="[
 'flex items-center gap-2 px-3 py-1.5 border-b',
 dark ? 'border-base /40' : 'border-light-c bg-surface2'
 ]">
                <span :class="[
 'w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0',
 dark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700'
 ]">{{ node.stepNum }}</span>
                <span :class="['text-xs', dark ? 'text-hint-c' : 'text-hint-c']">一般步驟</span>
                <!-- 操作按鈕 -->
                <div class="ml-auto flex items-center gap-1">
                  <button @click="moveStep(node.stepIdx, -1)"
                          :disabled="node.stepIdx === 0"
                          :class="['p-0.5 rounded transition-colors disabled:opacity-30', dark ? 'text-hint-c hover:text-hint-c' : 'text-hint-c hover:text-hint-c']"
                          title="上移">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button @click="moveStep(node.stepIdx, 1)"
                          :disabled="node.stepIdx === steps.length - 1"
                          :class="['p-0.5 rounded transition-colors disabled:opacity-30', dark ? 'text-hint-c hover:text-hint-c' : 'text-hint-c hover:text-hint-c']"
                          title="下移">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button @click="removeStep(node.stepIdx)"
                          :class="['p-0.5 rounded transition-colors', dark ? 'text-muted-c hover:text-red-400' : 'text-hint-c hover:text-red-400']"
                          title="刪除">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              <!-- 文字編輯 -->
              <div class="px-3 py-2">
                <textarea
                  v-model="steps[node.stepIdx].text"
                  rows="2"
                  :placeholder="`步驟 ${node.stepNum} 內容`"
                  @focus="editingId = node.id"
                  @blur="editingId = ''"
                  :class="[
 'w-full text-xs leading-relaxed resize-none outline-none bg-transparent',
 dark ? 'text-base-c placeholder-hint' : 'text-muted-c placeholder-hint'
 ]"
                />
                <!-- 轉換成分支 -->
                <button @click="convertToBranch(node.stepIdx)"
                        :class="[
 'text-xs flex items-center gap-0.5 mt-0.5 transition-colors',
 dark ? 'text-muted-c hover:text-amber-500' : 'text-hint-c hover:text-amber-500'
 ]">
                  <span class="text-amber-400">⬦</span> 轉為判斷分支
                </button>
              </div>
            </div>
          </div>

          <!-- 判斷菱形 -->
          <div v-else-if="node.type === 'diamond'"
               class="absolute flex items-center justify-center"
               :style="nodeStyle(node)">
            <div class="relative" :style="{ width: DIAMOND_W + 'px', height: DIAMOND_H + 'px' }">
              <!-- 菱形背景 SVG -->
              <svg class="absolute inset-0 w-full h-full" style="overflow: visible;">
                <polygon
                  :points="`${DIAMOND_W/2},2 ${DIAMOND_W-2},${DIAMOND_H/2} ${DIAMOND_W/2},${DIAMOND_H-2} 2,${DIAMOND_H/2}`"
                  :fill="dark ? '#1c1917' : '#fffbeb'"
                  :stroke="editingId === node.id ? '#f59e0b' : (dark ? '#92400e' : '#fbbf24')"
                  stroke-width="1.5"
                />
              </svg>
              <!-- 內容 -->
              <div class="absolute inset-0 flex flex-col items-center justify-center px-6">
                <input
                  v-model="steps[node.stepIdx].condition"
                  :placeholder="`判斷條件？`"
                  @focus="editingId = node.id"
                  @blur="editingId = ''"
                  :class="[
 'w-full text-center text-xs font-semibold bg-transparent outline-none',
 dark ? 'text-amber-300 placeholder-amber-900' : 'text-amber-800 placeholder-amber-300'
 ]"
                />
              </div>
              <!-- 右上角操作 -->
              <div class="absolute -top-2 -right-2 flex items-center gap-0.5">
                <button @click="moveStep(node.stepIdx, -1)"
                        :disabled="node.stepIdx === 0"
                        :class="['w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-sm border transition-colors disabled:opacity-30',
 dark ? 'border-base text-hint-c hover:text-base-c' : 'bg-surface border-light-c text-hint-c hover:text-muted-c']">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/></svg>
                </button>
                <button @click="moveStep(node.stepIdx, 1)"
                        :disabled="node.stepIdx === steps.length - 1"
                        :class="['w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-sm border transition-colors disabled:opacity-30',
 dark ? 'border-base text-hint-c hover:text-base-c' : 'bg-surface border-light-c text-hint-c hover:text-muted-c']">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <button @click="removeStep(node.stepIdx)"
                        :class="['w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-sm border transition-colors',
 dark ? 'border-red-900 text-red-500 hover:bg-red-900/30' : 'bg-surface border-red-200 text-red-400 hover:bg-red-50']">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 分支 label -->
          <div v-else-if="node.type === 'branch-label'"
               class="absolute flex items-center justify-center"
               :style="nodeStyle(node)">
            <div :class="[
 'flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium',
 node.branchIdx === 0
 ? (dark ? 'bg-teal-900/20 border-teal-700 text-teal-400' : 'bg-teal-50 border-teal-300 text-teal-700')
 : node.branchIdx === 1
 ? (dark ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-300 text-red-600')
 : (dark ? 'border-base text-hint-c' : 'bg-surface2 border-base text-muted-c')
 ]">
              <input
                v-model="steps[node.stepIdx].branches[node.branchIdx].label"
                :placeholder="node.branchIdx === 0 ? '是' : '否'"
                :class="[
 'text-xs font-medium bg-transparent outline-none w-16 text-center',
 node.branchIdx === 0 ? (dark ? 'text-teal-400' : 'text-teal-700') :
 node.branchIdx === 1 ? (dark ? 'text-red-400' : 'text-red-600') : (dark ? 'text-hint-c' : 'text-muted-c')
 ]"
              />
              <!-- 刪除分支 -->
              <button @click="removeBranch(node.stepIdx, node.branchIdx)"
                      :class="['transition-colors', dark ? 'text-muted-c hover:text-red-400' : 'text-hint-c hover:text-red-400']">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <!-- 分支子步驟 -->
          <div v-else-if="node.type === 'sub'"
               class="absolute"
               :style="nodeStyle(node)">
            <div :class="[
 'rounded-lg border overflow-hidden',
 node.branchIdx === 0
 ? (dark ? 'border-teal-800 bg-teal-900/10' : 'border-teal-200 bg-teal-50/40')
 : node.branchIdx === 1
 ? (dark ? 'border-red-900 bg-red-900/10' : 'border-red-200 bg-red-50/40')
 : (dark ? 'border-base /50' : 'border-light-c bg-surface2')
 ]" :style="{ width: SUB_W + 'px' }">
              <div class="flex items-center gap-1.5 px-2 py-1">
                <span :class="[
 'w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 text-white',
 node.branchIdx === 0 ? 'bg-teal-500' : node.branchIdx === 1 ? 'bg-red-400' : 'bg-stone-400'
 ]">{{ node.subNum }}</span>
                <input
                  v-model="steps[node.stepIdx].branches[node.branchIdx].steps[node.subIdx].text"
                  :placeholder="`子步驟 ${node.subNum}`"
                  @focus="editingId = node.id"
                  @blur="editingId = ''"
                  :class="[
 'flex-1 text-xs bg-transparent outline-none min-w-0',
 dark ? 'text-hint-c placeholder-hint' : 'text-muted-c placeholder-hint'
 ]"
                />
                <button @click="removeSubStep(node.stepIdx, node.branchIdx, node.subIdx)"
                        :class="['transition-colors flex-shrink-0', dark ? 'text-muted-c hover:text-red-400' : 'text-hint-c hover:text-red-400']">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 新增子步驟按鈕 -->
          <div v-else-if="node.type === 'add-sub'"
               class="absolute flex items-center justify-center"
               :style="nodeStyle(node)">
            <button @click="addSubStep(node.stepIdx, node.branchIdx)"
                    :class="[
 'flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed text-xs transition-colors',
 node.branchIdx === 0
 ? (dark ? 'border-teal-800 text-teal-600 hover:border-teal-600 hover:text-teal-400' : 'border-teal-300 text-teal-500 hover:border-teal-400 hover:text-teal-600')
 : node.branchIdx === 1
 ? (dark ? 'border-red-900 text-red-700 hover:border-red-700 hover:text-red-500' : 'border-red-300 text-red-400 hover:border-red-400 hover:text-red-500')
 : (dark ? 'border-base text-muted-c hover-border hover:text-hint-c' : 'border-base text-hint-c hover-border')
 ]"
                    :style="{ width: SUB_W + 'px' }">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              加入子步驟
            </button>
          </div>

          <!-- 新增分支按鈕 -->
          <div v-else-if="node.type === 'add-branch'"
               class="absolute flex items-center justify-center"
               :style="nodeStyle(node)">
            <button @click="addBranch(node.stepIdx)"
                    :class="[
 'flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed text-xs transition-colors',
 dark ? 'border-amber-900 text-amber-700 hover:border-amber-700 hover:text-amber-500' : 'border-amber-300 text-amber-500 hover:border-amber-400 hover:text-amber-600'
 ]">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              新增分支
            </button>
          </div>

          <!-- 新增步驟按鈕（節點間） -->
          <div v-else-if="node.type === 'add-step'"
               class="absolute flex items-center justify-center gap-1.5"
               :style="nodeStyle(node)">
            <button @click="insertStep(node.afterIdx, 'normal')"
                    :class="[
 'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors shadow-sm',
 dark ? 'border-base text-hint-c hover:border-amber-700 hover:text-amber-400' : 'bg-surface border-light-c text-hint-c hover:border-amber-400 hover:text-amber-600'
 ]">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              步驟
            </button>
            <button @click="insertStep(node.afterIdx, 'branch')"
                    :class="[
 'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors shadow-sm',
 dark ? 'border-amber-900 text-amber-600 hover:border-amber-700 hover:text-amber-400' : 'bg-surface border-amber-200 text-amber-500 hover:border-amber-400 hover:text-amber-600'
 ]">
              <span class="text-amber-400">⬦</span>
              分支
            </button>
          </div>

        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  steps: { type: Array, required: true },
  dark:  { type: Boolean, default: false },
})
const emit = defineEmits(['update:steps'])

// ── 直接 mutate（parent 傳入 reactive array）──────────────────────
// steps 是 ruleModal.data.steps，直接操作即可

// ── 佈局常數 ─────────────────────────────────────────────────────
const NODE_W     = 240
const NODE_H_BASE = 72   // 步驟節點預估高度（含 textarea）
const DIAMOND_W  = 180
const DIAMOND_H  = 64
const SUB_W      = 200
const SUB_H      = 36
const H_GAP      = 28   // 分支橫向間距
const V_GAP      = 20   // 節點垂直間距
const ADD_H      = 28   // 新增按鈕區高度
const CENTER_X_BASE = 160

const editingId = ref('')
const editorRef = ref(null)

// ── 版面計算 ─────────────────────────────────────────────────────
/*
  佈局邏輯：
  - 從上往下，每個 top-level step 依序排列
  - 一般步驟：寬 NODE_W，置中
  - 判斷分支：菱形置中，各分支在左右（或多分支橫排）
  - step 與 step 之間插入「新增」按鈕區
*/

const layoutNodes = computed(() => {
  const nodes = []
  const steps = props.steps
  const cx = CENTER_X_BASE + 80  // 畫布中心 X

  let y = 16
  const addNode = (n) => nodes.push(n)

  // 計算一個分支佔的總寬
  const branchColW = (branch) => SUB_W

  // ── 開始 ──────────────────────────────────────────────────────
  addNode({ id: 'start', type: 'start', x: cx - 40, y, w: 80, h: 28 })
  y += 28 + V_GAP

  let stepNum = 0

  steps.forEach((step, idx) => {
    // ── 新增步驟按鈕（在步驟前，idx === 0 跳過，因為有開始節點） ──
    // 其實全部插在步驟之間，包含第一個之前
    // 但第一個之前已有開始節點，就放在這裡
    // 放在每個步驟節點之前
    addNode({
      id: `add_${idx}`,
      type: 'add-step',
      x: cx - 90, y,
      w: 180, h: ADD_H,
      afterIdx: idx,
    })
    y += ADD_H + 8

    if (!step.condition) {
      // ── 普通步驟 ──────────────────────────────────────────────
      stepNum++
      addNode({
        id: `step_${idx}`,
        type: 'step',
        x: cx - NODE_W / 2, y,
        w: NODE_W, h: NODE_H_BASE,
        stepIdx: idx, stepNum,
      })
      y += NODE_H_BASE + V_GAP

    } else {
      // ── 判斷菱形 ──────────────────────────────────────────────
      addNode({
        id: `diamond_${idx}`,
        type: 'diamond',
        x: cx - DIAMOND_W / 2, y,
        w: DIAMOND_W, h: DIAMOND_H,
        stepIdx: idx,
      })
      const diamondBottomY = y + DIAMOND_H

      const branches = step.branches || []
      const totalBranchCols = branches.length
      // 各分支 centerX
      const totalBranchW = totalBranchCols * SUB_W + (totalBranchCols - 1) * H_GAP
      const branchStartX = cx - totalBranchW / 2

      // 找各分支最深 y（含子步驟）
      const branchBottomYs = []

      branches.forEach((branch, bi) => {
        const bcx = branchStartX + bi * (SUB_W + H_GAP) + SUB_W / 2
        const bx  = branchStartX + bi * (SUB_W + H_GAP)
        const labelY = diamondBottomY + V_GAP

        // label 節點
        addNode({
          id: `bl_${idx}_${bi}`,
          type: 'branch-label',
          x: bcx - 50, y: labelY,
          w: 100, h: 28,
          stepIdx: idx, branchIdx: bi,
        })

        let subY = labelY + 28 + 8

        const subSteps = branch.steps || []
        subSteps.forEach((sub, si) => {
          addNode({
            id: `sub_${idx}_${bi}_${si}`,
            type: 'sub',
            x: bx, y: subY,
            w: SUB_W, h: SUB_H,
            stepIdx: idx, branchIdx: bi, subIdx: si, subNum: si + 1,
          })
          subY += SUB_H + 6
        })

        // 加入子步驟按鈕
        addNode({
          id: `addsub_${idx}_${bi}`,
          type: 'add-sub',
          x: bx, y: subY,
          w: SUB_W, h: 28,
          stepIdx: idx, branchIdx: bi,
        })
        subY += 28

        branchBottomYs.push(subY)
      })

      // 新增分支按鈕（在所有分支右側）
      if (totalBranchCols < 4) {
        const addBranchX = branchStartX + totalBranchCols * (SUB_W + H_GAP)
        const addBranchY = diamondBottomY + V_GAP
        addNode({
          id: `addbranch_${idx}`,
          type: 'add-branch',
          x: addBranchX, y: addBranchY,
          w: 80, h: 28,
          stepIdx: idx,
        })
      }

      const maxBranchY = Math.max(...branchBottomYs, diamondBottomY + V_GAP + 28)
      y = maxBranchY + V_GAP
    }
  })

  // ── 最後的新增步驟 ────────────────────────────────────────────
  addNode({
    id: `add_${steps.length}`,
    type: 'add-step',
    x: cx - 90, y,
    w: 180, h: ADD_H,
    afterIdx: steps.length,
  })
  y += ADD_H + 8

  // ── 結束 ──────────────────────────────────────────────────────
  addNode({ id: 'end', type: 'end', x: cx - 40, y, w: 80, h: 28 })

  return nodes
})

// ── SVG 連線 ─────────────────────────────────────────────────────
const computedEdges = computed(() => {
  const edges = []
  const steps = props.steps
  const cx = CENTER_X_BASE + 80

  // 找到節點的工具
  const findNode = (id) => layoutNodes.value.find(n => n.id === id)
  const bottom  = (n) => n ? n.y + n.h : 0
  const centerX = (n) => n ? n.x + n.w / 2 : cx

  // 從開始到第一個 add-step
  const startNode = findNode('start')
  const firstAdd  = findNode('add_0')
  if (startNode && firstAdd) {
    edges.push({ d: `M ${cx} ${bottom(startNode)} L ${cx} ${firstAdd.y}` })
  }

  steps.forEach((step, idx) => {
    const addNode  = findNode(`add_${idx}`)
    const addBottom = addNode ? bottom(addNode) + 8 : 0

    if (!step.condition) {
      const stepNode = findNode(`step_${idx}`)
      const nextAdd  = findNode(`add_${idx + 1}`)

      // add → step
      if (addNode && stepNode) {
        edges.push({ d: `M ${cx} ${bottom(addNode) + 8} L ${cx} ${stepNode.y}` })
      }
      // step → next add
      if (stepNode && nextAdd) {
        edges.push({ d: `M ${cx} ${bottom(stepNode)} L ${cx} ${nextAdd.y}` })
      }
    } else {
      const diamondNode = findNode(`diamond_${idx}`)
      if (!diamondNode) return

      // add → diamond
      if (addNode && diamondNode) {
        edges.push({ d: `M ${cx} ${bottom(addNode) + 8} L ${cx} ${diamondNode.y}` })
      }

      const branches = step.branches || []
      const totalBranchW = branches.length * SUB_W + (branches.length - 1) * H_GAP
      const branchStartX = cx - totalBranchW / 2

      // 菱形 → 各分支
      const diamondCy = diamondNode.y + DIAMOND_H / 2
      const branchEndYs = []

      branches.forEach((branch, bi) => {
        const bx  = branchStartX + bi * (SUB_W + H_GAP)
        const bcx = bx + SUB_W / 2
        const labelNode = findNode(`bl_${idx}_${bi}`)
        const branchColors = ['#0d9488', '#ef4444', '#6b7280']
        const color = branchColors[bi] || branchColors[2]
        const marker = bi === 0 ? 'url(#arrowhead-branch-0)' : bi === 1 ? 'url(#arrowhead-branch-1)' : 'url(#arrowhead)'

        if (branches.length === 2) {
          // 左/右展開
          if (bi === 0) {
            edges.push({
              d: `M ${cx - DIAMOND_W / 2} ${diamondCy} L ${bcx} ${diamondCy} L ${bcx} ${labelNode ? labelNode.y : diamondCy + 30}`,
              color, marker,
            })
          } else {
            edges.push({
              d: `M ${cx + DIAMOND_W / 2} ${diamondCy} L ${bcx} ${diamondCy} L ${bcx} ${labelNode ? labelNode.y : diamondCy + 30}`,
              color, marker,
            })
          }
        } else {
          // 多分支從底部散出
          const dBottom = diamondNode.y + DIAMOND_H
          edges.push({
            d: `M ${cx} ${dBottom} L ${cx} ${dBottom + 12} L ${bcx} ${dBottom + 12} L ${bcx} ${labelNode ? labelNode.y : dBottom + 30}`,
            color, marker,
          })
        }

        // 各子步驟連線
        const subSteps = branch.steps || []
        let prevBottom = labelNode ? labelNode.y + labelNode.h + 8 : 0
        subSteps.forEach((sub, si) => {
          const subNode = findNode(`sub_${idx}_${bi}_${si}`)
          if (subNode) {
            edges.push({
              d: `M ${bcx} ${prevBottom} L ${bcx} ${subNode.y}`,
              color: bi === 0 ? '#0d9488' : bi === 1 ? '#ef4444' : '#6b7280',
            })
            prevBottom = subNode.y + subNode.h + 6
          }
        })

        // sub → add-sub
        const addSubNode = findNode(`addsub_${idx}_${bi}`)
        if (addSubNode) {
          branchEndYs.push(addSubNode.y + addSubNode.h)
        }
      })

      // 各分支匯合 → 下一個 add-step
      const nextAdd = findNode(`add_${idx + 1}`)
      if (nextAdd && branchEndYs.length > 0) {
        branchEndYs.forEach((ey, bi) => {
          const bx  = branchStartX + bi * (SUB_W + H_GAP)
          const bcx = bx + SUB_W / 2
          edges.push({
            d: `M ${bcx} ${ey} L ${bcx} ${nextAdd.y - 4} L ${cx} ${nextAdd.y - 4} L ${cx} ${nextAdd.y}`,
            dashed: true,
          })
        })
      }
    }
  })

  // 最後一個 add → end
  const lastAdd = findNode(`add_${steps.length}`)
  const endNode = findNode('end')
  if (lastAdd && endNode) {
    edges.push({ d: `M ${cx} ${bottom(lastAdd) + 8} L ${cx} ${endNode.y}` })
  }

  return edges
})

// ── 畫布尺寸 ─────────────────────────────────────────────────────
const canvasWidth = computed(() => {
  if (!layoutNodes.value.length) return 600
  const maxRight = Math.max(...layoutNodes.value.map(n => n.x + (n.w || 100)))
  return Math.max(maxRight + 60, 520)
})

const canvasHeight = computed(() => {
  if (!layoutNodes.value.length) return 400
  const maxBottom = Math.max(...layoutNodes.value.map(n => n.y + (n.h || 30)))
  return maxBottom + 40
})

// ── 節點樣式 ─────────────────────────────────────────────────────
function nodeStyle(node) {
  return {
    left: node.x + 'px',
    top:  node.y + 'px',
    width: (node.w || 'auto') + (typeof node.w === 'number' ? 'px' : ''),
  }
}

// ── 步驟操作（直接 mutate props.steps） ──────────────────────────
const moveStep = (idx, dir) => {
  const arr = props.steps
  const target = idx + dir
  if (target < 0 || target >= arr.length) return
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
}

const removeStep = (idx) => props.steps.splice(idx, 1)

const insertStep = (afterIdx, type) => {
  const newStep = type === 'branch'
    ? { text: '', condition: '請填寫判斷條件', branches: [{ label: '是', steps: [] }, { label: '否', steps: [] }] }
    : { text: '', condition: '', branches: [] }
  props.steps.splice(afterIdx, 0, newStep)
}

const convertToBranch = (idx) => {
  const s = props.steps[idx]
  s.condition = s.text || '請填寫判斷條件'
  s.text = ''
  s.branches = [{ label: '是', steps: [] }, { label: '否', steps: [] }]
}

const addBranch = (stepIdx) => {
  props.steps[stepIdx].branches.push({ label: '', steps: [] })
}

const removeBranch = (stepIdx, bi) => {
  props.steps[stepIdx].branches.splice(bi, 1)
}

const addSubStep = (stepIdx, bi) => {
  props.steps[stepIdx].branches[bi].steps.push({ text: '' })
}

const removeSubStep = (stepIdx, bi, si) => {
  props.steps[stepIdx].branches[bi].steps.splice(si, 1)
}
</script>

<style scoped>
.sop-flow-editor {
  -webkit-overflow-scrolling: touch;
}
textarea {
  field-sizing: content;
  min-height: 2.5rem;
}
</style>