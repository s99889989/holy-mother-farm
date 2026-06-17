<template>
  <div class="sop-flowchart overflow-x-auto" ref="containerRef">
    <svg
      :width="svgWidth"
      :height="svgHeight"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      xmlns="http://www.w3.org/2000/svg"
      class="block mx-auto"
      style="font-family: inherit;"
    >
      <!-- 連線 -->
      <g>
        <path
          v-for="(edge, i) in edges"
          :key="'e' + i"
          :d="edge.d"
          :stroke="edge.dashed ? (dark ? '#6b7280' : '#d1d5db') : (dark ? '#57534e' : '#d6d3d1')"
          :stroke-dasharray="edge.dashed ? '5 4' : 'none'"
          stroke-width="1.5"
          fill="none"
          stroke-linecap="round"
        />
      </g>
      <!-- 箭頭標籤 -->
      <g>
        <template v-for="(edge, i) in edges" :key="'el' + i">
          <template v-if="edge.label">
            <rect
              :x="edge.labelX - edge.label.length * 3.6 - 6"
              :y="edge.labelY - 9"
              :width="edge.label.length * 7.2 + 12"
              height="18"
              :rx="9"
              :fill="edge.labelColor || (dark ? '#292524' : '#fff')"
              :stroke="edge.labelBorder || (dark ? '#57534e' : '#e7e5e4')"
              stroke-width="1"
            />
            <text
              :x="edge.labelX"
              :y="edge.labelY + 4"
              text-anchor="middle"
              :fill="edge.labelTextColor || (dark ? '#d6d3d1' : '#78716c')"
              font-size="11"
              font-weight="500"
            >{{ edge.label }}</text>
          </template>
        </template>
      </g>
      <!-- 節點 -->
      <g>
        <g v-for="node in nodes" :key="node.id"
           :transform="`translate(${node.x}, ${node.y})`">

          <!-- 開始/結束橢圓 -->
          <template v-if="node.type === 'start' || node.type === 'end'">
            <rect :width="node.w" :height="node.h"
                  :rx="node.h / 2"
                  :fill="dark ? '#292524' : '#fef3c7'"
                  :stroke="dark ? '#d97706' : '#f59e0b'"
                  stroke-width="1.5" />
            <text :x="node.w / 2" :y="node.h / 2 + 4"
                  text-anchor="middle"
                  :fill="dark ? '#fcd34d' : '#92400e'"
                  font-size="12" font-weight="600">
              {{ node.label }}
            </text>
          </template>

          <!-- 普通步驟矩形 -->
          <template v-else-if="node.type === 'step'">
            <rect :width="node.w" :height="node.h"
                  rx="8"
                  :fill="dark ? '#27272a' : '#fff'"
                  :stroke="dark ? '#3f3f46' : '#e7e5e4'"
                  stroke-width="1.5" />
            <!-- 左側色條 -->
            <rect x="0" y="0" width="4" :height="node.h"
                  rx="2"
                  :fill="dark ? '#d97706' : '#f59e0b'" />
            <!-- 序號圓 -->
            <circle cx="22" :cy="node.h / 2" r="10"
                    :fill="dark ? '#451a03' : '#fef3c7'"
                    :stroke="dark ? '#d97706' : '#f59e0b'"
                    stroke-width="1.5" />
            <text x="22" :y="node.h / 2 + 4"
                  text-anchor="middle"
                  :fill="dark ? '#fcd34d' : '#92400e'"
                  font-size="10" font-weight="700">
              {{ node.stepNum }}
            </text>
            <!-- 文字（多行） -->
            <text :x="42" :y="0" :fill="dark ? '#e7e5e4' : '#292524'" font-size="12">
              <tspan
                v-for="(line, li) in node.lines"
                :key="li"
                x="42"
                :dy="li === 0 ? node.h / 2 - (node.lines.length - 1) * 8 : 16"
              >{{ line }}</tspan>
            </text>
          </template>

          <!-- 判斷菱形 -->
          <template v-else-if="node.type === 'diamond'">
            <polygon
              :points="`${node.w/2},0 ${node.w},${node.h/2} ${node.w/2},${node.h} 0,${node.h/2}`"
              :fill="dark ? '#1c1917' : '#fffbeb'"
              :stroke="dark ? '#d97706' : '#f59e0b'"
              stroke-width="1.5"
            />
            <!-- 判斷文字（多行） -->
            <text text-anchor="middle" :fill="dark ? '#fde68a' : '#78350f'" font-size="11" font-weight="600">
              <tspan
                v-for="(line, li) in node.lines"
                :key="li"
                :x="node.w / 2"
                :dy="li === 0 ? node.h / 2 - (node.lines.length - 1) * 7 + 4 : 14"
              >{{ line }}</tspan>
            </text>
          </template>

          <!-- 分支子步驟矩形（淡色） -->
          <template v-else-if="node.type === 'sub'">
            <rect :width="node.w" :height="node.h"
                  rx="6"
                  :fill="node.branchIdx === 0
                    ? (dark ? '#0d1f1c' : '#f0fdfb')
                    : node.branchIdx === 1
                      ? (dark ? '#1f0d0d' : '#fff5f5')
                      : (dark ? '#1c1917' : '#fafafa')"
                  :stroke="node.branchIdx === 0
                    ? (dark ? '#134e4a' : '#99f6e4')
                    : node.branchIdx === 1
                      ? (dark ? '#7f1d1d' : '#fca5a5')
                      : (dark ? '#3f3f46' : '#e5e7eb')"
                  stroke-width="1" />
            <!-- 序號 -->
            <circle cx="14" :cy="node.h / 2" r="7"
                    :fill="node.branchIdx === 0
                      ? (dark ? '#0f766e' : '#2dd4bf')
                      : node.branchIdx === 1
                        ? (dark ? '#b91c1c' : '#f87171')
                        : (dark ? '#52525b' : '#a1a1aa')" />
            <text x="14" :y="node.h / 2 + 4"
                  text-anchor="middle"
                  fill="white" font-size="9" font-weight="700">
              {{ node.subNum }}
            </text>
            <text :x="28" :y="0" :fill="dark ? '#d4d4d8' : '#3f3f46'" font-size="11">
              <tspan
                v-for="(line, li) in node.lines"
                :key="li"
                x="28"
                :dy="li === 0 ? node.h / 2 - (node.lines.length - 1) * 7 + 4 : 14"
              >{{ line }}</tspan>
            </text>
          </template>

        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  steps: { type: Array, default: () => [] },
  dark:  { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

// ── 佈局常數 ────────────────────────────────────────────────────
const NODE_W        = computed(() => props.compact ? 220 : 280)
const STEP_H        = 44
const DIAMOND_W     = computed(() => props.compact ? 160 : 200)
const DIAMOND_H     = 56
const SUB_W         = computed(() => props.compact ? 180 : 220)
const SUB_H         = 36
const V_GAP         = 20   // 節點垂直間距
const BRANCH_GAP    = computed(() => props.compact ? 18 : 24) // 分支橫向間距
const CHAR_W        = 11   // 估算字元寬度（px）
const MAX_CHARS     = computed(() => props.compact ? 14 : 18)  // 每行最多字元

// ── 文字換行 ─────────────────────────────────────────────────────
function wrapText(text, maxChars) {
  if (!text) return ['']
  const lines = []
  let start = 0
  while (start < text.length) {
    lines.push(text.slice(start, start + maxChars))
    start += maxChars
  }
  return lines
}

function stepHeight(lines) {
  return Math.max(STEP_H, 24 + (lines.length - 1) * 16)
}

function subHeight(lines) {
  return Math.max(SUB_H, 20 + (lines.length - 1) * 14)
}

// ── 佈局計算 ─────────────────────────────────────────────────────
const layout = computed(() => {
  const nodes = []
  const edges = []

  const cw = NODE_W.value
  const dw = DIAMOND_W.value
  const sw = SUB_W.value
  const bGap = BRANCH_GAP.value
  const mc = MAX_CHARS.value

  let stepNum = 0  // 普通步驟序號

  // 計算分支群的總寬度
  function branchGroupWidth(step) {
    if (!step.branches || step.branches.length === 0) return sw
    return step.branches.reduce((sum, b) => sum + sw + bGap, -bGap)
  }

  // 計算每個頂層 step 的寬度佔用
  function stepTotalWidth(step) {
    if (step.condition) return Math.max(dw, branchGroupWidth(step)) + 40
    return cw + 40
  }

  const totalWidth = Math.max(...props.steps.map(stepTotalWidth), cw + 40) + 80
  const centerX = totalWidth / 2

  let y = 16

  // ── 開始節點 ──────────────────────────────────────────────────
  const startW = 80, startH = 28
  nodes.push({
    id: 'start', type: 'start',
    x: centerX - startW / 2, y,
    w: startW, h: startH, label: '開始',
  })
  y += startH + V_GAP

  let prevId = 'start'
  const prevBottom = (id) => nodes.find(n => n.id === id)

  props.steps.forEach((step, idx) => {
    const pNode = prevBottom(prevId)

    if (!step.condition) {
      // ── 普通步驟 ──────────────────────────────────────────────
      stepNum++
      const lines = wrapText(step.text, mc)
      const h = stepHeight(lines)
      const nodeId = `step_${idx}`
      nodes.push({
        id: nodeId, type: 'step',
        x: centerX - cw / 2, y,
        w: cw, h, lines, stepNum,
      })
      // 連線
      edges.push({
        d: `M ${centerX} ${pNode.y + pNode.h} L ${centerX} ${y}`,
      })
      prevId = nodeId
      y += h + V_GAP

    } else {
      // ── 判斷分支 ──────────────────────────────────────────────
      const dLines = wrapText(step.condition, mc - 2)
      const dh = Math.max(DIAMOND_H, 20 + dLines.length * 14)
      const dId = `diamond_${idx}`
      nodes.push({
        id: dId, type: 'diamond',
        x: centerX - dw / 2, y,
        w: dw, h: dh, lines: dLines,
      })
      // 從上一節點到菱形
      edges.push({
        d: `M ${centerX} ${pNode.y + pNode.h} L ${centerX} ${y}`,
      })
      y += dh + V_GAP

      // 分支群
      const branches = step.branches || []
      const totalBranchW = branches.reduce((s) => s + sw + bGap, -bGap)
      const branchStartX = centerX - totalBranchW / 2

      // 菱形底部 → 各分支標籤與子步驟
      const branchEndYs = []
      const branchCenterXs = []

      branches.forEach((branch, bi) => {
        const bx = branchStartX + bi * (sw + bGap)
        const bcx = bx + sw / 2

        branchCenterXs.push(bcx)

        const diamondBottom = nodes.find(n => n.id === dId)

        // 從菱形到各分支（水平擴散線）
        const dBottomY = diamondBottom.y + diamondBottom.h / 2
        const dCenterX = centerX

        // 分支色
        const labelColors = [
          { bg: props.dark ? '#0d2a27' : '#f0fdfb', border: props.dark ? '#134e4a' : '#2dd4bf', text: props.dark ? '#5eead4' : '#0f766e' },
          { bg: props.dark ? '#2d1010' : '#fff5f5', border: props.dark ? '#7f1d1d' : '#fca5a5', text: props.dark ? '#fca5a5' : '#b91c1c' },
          { bg: props.dark ? '#1c1917' : '#f9fafb', border: props.dark ? '#44403c' : '#d1d5db', text: props.dark ? '#a8a29e' : '#6b7280' },
        ]
        const lc = labelColors[bi] || labelColors[2]

        // 菱形左/右/下分支
        let edgePath, labelX, labelY
        const dNode = diamondBottom
        if (branches.length === 2) {
          if (bi === 0) {
            // 左分支
            edgePath = `M ${dCenterX - dw / 2} ${dNode.y + dh / 2} L ${bcx} ${dNode.y + dh / 2} L ${bcx} ${y}`
            labelX = (dCenterX - dw / 2 + bcx) / 2
            labelY = dNode.y + dh / 2
          } else {
            // 右分支
            edgePath = `M ${dCenterX + dw / 2} ${dNode.y + dh / 2} L ${bcx} ${dNode.y + dh / 2} L ${bcx} ${y}`
            labelX = (dCenterX + dw / 2 + bcx) / 2
            labelY = dNode.y + dh / 2
          }
        } else {
          // 多分支從底部散出
          edgePath = `M ${dCenterX} ${dNode.y + dh} L ${dCenterX} ${dNode.y + dh + 12} L ${bcx} ${dNode.y + dh + 12} L ${bcx} ${y}`
          labelX = bcx
          labelY = dNode.y + dh + 12
        }

        edges.push({
          d: edgePath,
          label: branch.label,
          labelX, labelY,
          labelColor: lc.bg,
          labelBorder: lc.border,
          labelTextColor: lc.text,
          dashed: false,
        })

        let subY = y
        const subSteps = branch.steps || []

        if (subSteps.length === 0) {
          // 空分支：只留空間
          branchEndYs.push(subY)
        } else {
          subSteps.forEach((sub, si) => {
            const sLines = wrapText(sub.text, Math.floor(mc * 0.85))
            const sh = subHeight(sLines)
            const sId = `sub_${idx}_${bi}_${si}`
            nodes.push({
              id: sId, type: 'sub',
              x: bx, y: subY,
              w: sw, h: sh,
              lines: sLines, subNum: si + 1,
              branchIdx: bi,
            })
            if (si > 0) {
              edges.push({
                d: `M ${bcx} ${subY - V_GAP + 4} L ${bcx} ${subY}`,
                dashed: false,
              })
            }
            subY += sh + V_GAP - 4
          })
          branchEndYs.push(subY - V_GAP + 4)
        }
      })

      // 更新 y 為所有分支中最低點
      const maxBranchY = Math.max(...branchEndYs)
      y = maxBranchY + V_GAP

      // 各分支匯合線 → 下方
      if (branches.length > 0) {
        branchCenterXs.forEach((bcx, bi) => {
          const fromY = branchEndYs[bi]
          if (fromY < y) {
            edges.push({
              d: `M ${bcx} ${fromY} L ${bcx} ${y - V_GAP / 2} L ${centerX} ${y - V_GAP / 2} L ${centerX} ${y}`,
              dashed: true,
            })
          }
        })
      }

      prevId = dId  // 下一個節點從「匯合點」繼續
    }
  })

  // ── 結束節點 ──────────────────────────────────────────────────
  const endW = 80, endH = 28
  const lastNode = prevBottom(prevId)
  edges.push({
    d: `M ${centerX} ${lastNode.y + lastNode.h} L ${centerX} ${y}`,
  })
  nodes.push({
    id: 'end', type: 'end',
    x: centerX - endW / 2, y,
    w: endW, h: endH, label: '結束',
  })

  const svgH = y + endH + 24

  return { nodes, edges, svgW: totalWidth, svgH }
})

const nodes    = computed(() => layout.value.nodes)
const edges    = computed(() => layout.value.edges)
const svgWidth = computed(() => layout.value.svgW)
const svgHeight = computed(() => layout.value.svgH)
</script>

<style scoped>
.sop-flowchart {
  -webkit-overflow-scrolling: touch;
}
</style>