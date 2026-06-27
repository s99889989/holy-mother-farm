<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- ══ 選單頁 ══ -->
    <div v-if="page === 'select'" class="layout no-print">

      <!-- ── 左側 Sidebar ── -->
      <aside class="sidebar bg-surface border-r border-light-c">
        <div class="sidebar-header border-b border-light-c px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center text-white flex-shrink-0" style="font-size:14px">🏷️</div>
            <div>
              <div class="font-bold text-base-c leading-none" style="font-size:15px">餐廳標籤桌牌</div>
              <div class="text-hint-c mt-0.5" style="font-size:11px">勾選後列印，每頁 9 張 A4 橫向</div>
            </div>
          </div>
        </div>

        <!-- Tab 切換 -->
        <div class="tab-bar border-b border-light-c">
          <button :class="['tab-btn', sideTab==='use' ? 'active bg-surface border-b-2 border-slate-500 text-base-c' : 'text-muted-c hover:bg-surface2']" @click="sideTab='use'">☰ 選項目</button>
          <button :class="['tab-btn', sideTab==='config' ? 'active bg-surface border-b-2 border-slate-500 text-base-c' : 'text-muted-c hover:bg-surface2']" @click="sideTab='config'">⚙ 設定</button>
        </div>

        <!-- ── 設定 tab ── -->
        <template v-if="sideTab==='config'">
          <div class="config-scroll">

            <!-- 區塊一：文字大小規則（含中英文，統一收縮） -->
            <div class="config-section-title collapsible-section" @click="open.size = !open.size">
              文字大小規則 <span class="caret">{{ open.size ? '▲' : '▼' }}</span>
            </div>
            <template v-if="open.size">
              <div class="size-panel">
                <div class="panel-label">中文字數對應大小</div>
                <div v-for="(rule, i) in zhRules" :key="'zh'+i" class="rule-row text-base-c">
                  <span class="rule-prefix">≤</span>
                  <input type="number" v-model.number="rule.maxLen" min="1" max="50" class="rule-input border-light-c bg-surface text-base-c" />
                  <span class="rule-unit">字</span>
                  <input type="number" v-model.number="rule.sizePt" min="6" max="72" class="rule-input border-light-c bg-surface text-base-c" />
                  <span class="rule-unit">pt</span>
                  <button class="rule-del" @click="zhRules.splice(i,1)" v-if="zhRules.length>1">✕</button>
                </div>
                <div class="rule-row text-base-c">
                  <span class="rule-prefix">其餘</span>
                  <input type="number" v-model.number="zhFallbackPt" min="6" max="72" class="rule-input border-light-c bg-surface text-base-c" style="margin-left:4px"/>
                  <span class="rule-unit">pt</span>
                </div>
                <button class="rule-add" @click="zhRules.push({maxLen:10,sizePt:20})">＋ 新增規則</button>
              </div>
              <div class="size-panel">
                <div class="panel-label">英文字數對應大小</div>
                <div v-for="(rule, i) in enRules" :key="'en'+i" class="rule-row text-base-c">
                  <span class="rule-prefix">≤</span>
                  <input type="number" v-model.number="rule.maxLen" min="1" max="100" class="rule-input border-light-c bg-surface text-base-c" />
                  <span class="rule-unit">字</span>
                  <input type="number" v-model.number="rule.sizePt" min="6" max="72" class="rule-input border-light-c bg-surface text-base-c" />
                  <span class="rule-unit">pt</span>
                  <button class="rule-del" @click="enRules.splice(i,1)" v-if="enRules.length>1">✕</button>
                </div>
                <div class="rule-row text-base-c">
                  <span class="rule-prefix">其餘</span>
                  <input type="number" v-model.number="enFallbackPt" min="6" max="72" class="rule-input border-light-c bg-surface text-base-c" style="margin-left:4px"/>
                  <span class="rule-unit">pt</span>
                </div>
                <button class="rule-add" @click="enRules.push({maxLen:20,sizePt:12})">＋ 新增規則</button>
              </div>
            </template>

            <!-- 區塊二：文字位置微調 -->
            <div class="config-section-title collapsible-section" @click="open.tune = !open.tune">
              文字位置微調 <span class="caret">{{ open.tune ? '▲' : '▼' }}</span>
            </div>
            <template v-if="open.tune">
              <div class="size-panel">
                <div class="tune-row text-base-c">
                  <span>文字區高度</span>
                  <input type="range" v-model.number="textAreaH" min="55" max="90" step="1"/>
                  <span class="tune-val text-hint-c">{{ textAreaH }}%</span>
                </div>
                <div class="tune-row text-base-c">
                  <span>中文上下</span>
                  <input type="range" v-model.number="zhOffsetTop" min="-20" max="20" step="0.5"/>
                  <span class="tune-val text-hint-c">{{ zhOffsetTop>0?'+':'' }}{{ zhOffsetTop }}mm</span>
                </div>
                <div class="tune-row text-base-c">
                  <span>英文上下</span>
                  <input type="range" v-model.number="enOffsetTop" min="-20" max="20" step="0.5"/>
                  <span class="tune-val text-hint-c">{{ enOffsetTop>0?'+':'' }}{{ enOffsetTop }}mm</span>
                </div>
                <div class="tune-row text-base-c">
                  <span>左右位置</span>
                  <input type="range" v-model.number="offsetLeft" min="-20" max="20" step="1"/>
                  <span class="tune-val text-hint-c">{{ offsetLeft>0?'+':'' }}{{ offsetLeft }}mm</span>
                </div>
                <div class="tune-row text-base-c">
                  <span>中文字距</span>
                  <input type="range" v-model.number="zhSpacing" min="-3" max="5" step="0.5"/>
                  <span class="tune-val text-hint-c">{{ zhSpacing }}mm</span>
                </div>
                <div class="tune-row text-base-c">
                  <span>英文字距</span>
                  <input type="range" v-model.number="enSpacing" min="-2" max="3" step="0.5"/>
                  <span class="tune-val text-hint-c">{{ enSpacing }}mm</span>
                </div>
              </div>
            </template>

            <!-- 區塊三：項目管理 -->
            <div class="config-section-title collapsible-section" @click="open.items = !open.items">
              項目管理 <span class="caret">{{ open.items ? '▲' : '▼' }}</span>
            </div>
            <template v-if="open.items">
              <!-- 項目管理（可捲動） -->
              <div class="list-scroll">
                <div class="add-group-row">
                  <template v-if="addingGroup">
                    <input v-model="newGroupName" placeholder="類別名稱" class="edit-inp border-light-c bg-surface text-base-c" @keyup.enter="confirmAddGroup" @keyup.escape="addingGroup=false" />
                    <button class="edit-ok" @click="confirmAddGroup">✓</button>
                    <button class="edit-cancel border-light-c text-base-c" @click="addingGroup=false">✕</button>
                  </template>
                  <button v-else class="add-group-btn" @click="addingGroup=true;newGroupName=''">＋ 新增類別</button>
                </div>

                <div v-for="(group, gi) in presets" :key="gi" class="group">
                  <div class="group-header bg-surface">
                    <span class="group-toggle" @click="toggleGroupOpen(gi)">{{ groupOpen[gi]===false ? '▶' : '▼' }}</span>
                    <template v-if="editingGroupIdx === gi">
                      <input v-model="editGroupName" class="edit-inp group-name-inp" @keyup.enter="confirmEditGroup(gi)" @keyup.escape="editingGroupIdx=-1"/>
                      <button class="edit-ok sm" @click="confirmEditGroup(gi)">✓</button>
                      <button class="edit-cancel sm border-light-c text-base-c" @click="editingGroupIdx=-1">✕</button>
                    </template>
                    <template v-else>
                      <span class="group-name-label text-base-c">{{ group.group }}</span>
                      <span class="group-actions">
                  <button class="act-btn" @click="startEditGroup(gi)" title="改名">✎</button>
                  <template v-if="confirmDeleteGroupIdx === gi">
                    <span class="del-confirm-label">確定？</span>
                    <button class="del-yes" @click="confirmDeleteGroup(gi)">是</button>
                    <button class="del-no border-light-c text-base-c"  @click="confirmDeleteGroupIdx=-1">否</button>
                  </template>
                  <button v-else class="act-btn del" @click="confirmDeleteGroupIdx=gi" title="刪除類別">✕</button>
                  <button class="group-add-btn" @click="startAddItem(gi)" title="新增項目">＋</button>
                </span>
                    </template>
                  </div>

                  <template v-if="groupOpen[gi] !== false">
                    <div v-if="addingIn === gi" class="edit-row bg-surface border-b border-light-c">
                      <div class="edit-field-row">
                        <span class="edit-field-label">中文</span>
                        <input v-model="editForm.zh" placeholder="中文名稱" class="edit-inp border-light-c bg-surface text-base-c" @keyup.escape="addingIn=-1"/>
                      </div>
                      <div class="edit-field-row">
                        <span class="edit-field-label">英文</span>
                        <input v-model="editForm.en" placeholder="English name" class="edit-inp border-light-c bg-surface text-base-c" @keyup.escape="addingIn=-1"/>
                      </div>
                      <div class="edit-action-row">
                        <button class="edit-ok" @click="confirmAdd(gi)">✓ 確認</button>
                        <button class="edit-cancel border-light-c text-base-c" @click="addingIn=-1">✕ 取消</button>
                      </div>
                    </div>

                    <div v-for="(p, pi) in group.items" :key="pi">
                      <div v-if="editingKey === gi+'-'+pi" class="edit-row edit-item-row bg-surface border-b border-light-c">
                        <div class="edit-field-row">
                          <span class="edit-field-label">中文</span>
                          <input v-model="editForm.zh" placeholder="中文名稱" class="edit-inp border-light-c bg-surface text-base-c"/>
                        </div>
                        <div class="edit-field-row">
                          <span class="edit-field-label">英文</span>
                          <input v-model="editForm.en" placeholder="English name" class="edit-inp border-light-c bg-surface text-base-c"/>
                        </div>
                        <div class="edit-field-row">
                          <span class="edit-field-label">類別</span>
                          <select v-model="editForm.toGroup" class="edit-group-sel border-light-c bg-surface text-base-c" style="flex:1">
                            <option v-for="(g,gj) in presets" :key="gj" :value="gj">{{ g.group }}</option>
                          </select>
                        </div>
                        <div class="edit-field-row">
                          <span class="edit-field-label">中文上下</span>
                          <input type="range" v-model.number="editForm.zhTop"
                                 @input="presets[gi].items[pi].zhTop=editForm.zhTop"
                                 min="-20" max="20" step="0.5" class="edit-slider"/>
                          <span class="offset-val text-muted-c">{{ editForm.zhTop>0?'+':'' }}{{ editForm.zhTop }}mm</span>
                          <button class="offset-reset" @click="editForm.zhTop=0;presets[gi].items[pi].zhTop=0" v-if="editForm.zhTop!==0">↺</button>
                        </div>
                        <div class="edit-field-row">
                          <span class="edit-field-label">英文上下</span>
                          <input type="range" v-model.number="editForm.enTop"
                                 @input="presets[gi].items[pi].enTop=editForm.enTop"
                                 min="-20" max="20" step="0.5" class="edit-slider"/>
                          <span class="offset-val text-muted-c">{{ editForm.enTop>0?'+':'' }}{{ editForm.enTop }}mm</span>
                          <button class="offset-reset" @click="editForm.enTop=0;presets[gi].items[pi].enTop=0" v-if="editForm.enTop!==0">↺</button>
                        </div>
                        <div class="edit-field-row">
                          <span class="edit-field-label">中文左右</span>
                          <input type="range" v-model.number="editForm.zhOffset"
                                 @input="presets[gi].items[pi].zhOffset=editForm.zhOffset"
                                 min="-20" max="20" step="0.5" class="edit-slider"/>
                          <span class="offset-val text-muted-c">{{ editForm.zhOffset>0?'+':'' }}{{ editForm.zhOffset }}mm</span>
                          <button class="offset-reset" @click="editForm.zhOffset=0;presets[gi].items[pi].zhOffset=0" v-if="editForm.zhOffset!==0">↺</button>
                        </div>
                        <div class="edit-field-row">
                          <span class="edit-field-label">英文左右</span>
                          <input type="range" v-model.number="editForm.enOffset"
                                 @input="presets[gi].items[pi].enOffset=editForm.enOffset"
                                 min="-20" max="20" step="0.5" class="edit-slider"/>
                          <span class="offset-val text-muted-c">{{ editForm.enOffset>0?'+':'' }}{{ editForm.enOffset }}mm</span>
                          <button class="offset-reset" @click="editForm.enOffset=0;presets[gi].items[pi].enOffset=0" v-if="editForm.enOffset!==0">↺</button>
                        </div>
                        <div class="edit-action-row">
                          <button class="edit-ok" @click="confirmEdit(gi,pi)">✓ 確認</button>
                          <button class="edit-cancel border-light-c text-base-c" @click="cancelEdit()">✕ 取消</button>
                        </div>
                      </div>
                      <div v-else class="item-row config-item-row">
                        <div class="config-item-content">
                          <span class="zh-main">{{ p.zh }}</span>
                          <span class="item-actions" style="opacity:1">
                      <button class="act-btn" @click="startEditItem(gi,pi,p)" title="編輯">✎</button>
                      <template v-if="confirmDeleteKey === gi+'-'+pi">
                        <span class="del-confirm-label">確定刪除？</span>
                        <button class="del-yes" @click="confirmDeleteItem(gi,pi,p)">是</button>
                        <button class="del-no border-light-c text-base-c"  @click="confirmDeleteKey=''">否</button>
                      </template>
                      <button v-else class="act-btn del" @click="confirmDeleteKey=gi+'-'+pi" title="刪除">✕</button>
                    </span>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </template><!-- end items -->

          </div><!-- end config-scroll -->

        </template><!-- end config tab -->

        <!-- ── 選項目 tab ── -->
        <template v-if="sideTab==='use'">
          <div class="list-scroll">
            <div v-for="(group, gi) in presets" :key="gi" class="group">
              <div class="group-header bg-surface">
                <span class="group-toggle" @click="toggleGroupOpen(gi)">{{ groupOpen[gi]===false ? '▶' : '▼' }}</span>
                <label class="group-check">
                  <input type="checkbox"
                         :checked="isGroupAllSelected(group)"
                         :indeterminate.prop="isGroupPartial(group)"
                         @change="toggleGroup(group, $event.target.checked)" />
                  {{ group.group }}
                </label>
              </div>
              <template v-if="groupOpen[gi] !== false">
                <div v-for="(p, pi) in group.items" :key="pi"
                     class="item-row text-base-c" :class="{'checked bg-slate-100 dark:bg-slate-700/30': isSelected(p)}">
                  <label class="item-label-inner">
                    <input type="checkbox" :checked="isSelected(p)" @change="toggleItem(p,$event.target.checked)"/>
                    <span class="zh-main">{{ mainZh(p.zh) }}</span>
                    <span v-if="dietTag(p.zh)" class="diet" :class="dietClass(p.zh)">{{ dietTag(p.zh) }}</span>
                  </label>
                  <span v-if="isSelected(p)" class="qty-wrap">
                  <button class="qty-btn border-light-c text-base-c" @click="changeQty(p,-1)">−</button>
                  <span class="qty-num text-base-c">{{ getQty(p) }}</span>
                  <button class="qty-btn border-light-c text-base-c" @click="changeQty(p,+1)">＋</button>
                </span>
                </div>
              </template>
            </div>
          </div>

          <div class="sidebar-footer border-t border-light-c">
            <div class="count-badge text-muted-c">已選 {{ totalCount }} 張</div>
            <button class="print-nav-btn" :disabled="selected.length===0" @click="doPrint">🖨️ 列印</button>
          </div>

        </template><!-- end use tab -->
      </aside>

      <!-- ── 右側預覽 ── -->
      <main class="preview-area" ref="previewAreaRef">
        <!-- 顯示比例控制 -->
        <div class="preview-toolbar bg-surface border-b border-light-c">
          <span class="preview-toolbar-label text-muted-c">預覽縮放</span>
          <input type="range" v-model.number="manualScale" min="20" max="100" step="5" class="scale-slider"/>
          <span class="preview-toolbar-val text-base-c">{{ manualScale }}%</span>
          <button class="auto-scale-btn border-light-c text-base-c" @click="manualScale=0" :class="{active: manualScale===0}">自動</button>
          <span class="preview-toolbar-label text-muted-c" style="margin-left:12px">自動排列 {{ previewCols }} 欄</span>
        </div>

        <div v-if="sideTab==='use' && selected.length===0" class="empty-hint text-hint-c">← 從左側勾選項目</div>

        <!-- 多欄排列 -->
        <div class="preview-pages-wrap" :style="{ '--cols': previewCols }">
          <div v-for="(pageCards, pi) in (sideTab==='config' ? configPreviewPages : previewPages)" :key="pi" class="a4-preview-wrap">
            <div class="page-num-label text-hint-c">第 {{ pi+1 }} 頁</div>
            <div class="a4-preview" :style="a4Style">
              <div class="cut-area">
                <div class="grid">
                  <div v-for="(card,ci) in pageCards" :key="ci" class="card-wrapper">
                    <div class="card-text-area" :style="textAreaStyle">
                      <p class="card-line1" :style="[{fontSize: calcZhSize(card.zh), position:'relative', left:(card.zhOffset??0)+'mm', top:((card.zhTop??0)+zhOffsetTop)+'mm'}, zhLineStyle]">{{ card.zh }}</p>
                      <p class="card-line2" :style="[{fontSize: calcEnSize(card.en), position:'relative', left:(card.enOffset??0)+'mm', top:((card.enTop??0)+enOffsetTop)+'mm'}, enLineStyle]">{{ card.en }}</p>
                    </div>
                    <img src="/images/桌牌.png" alt="桌牌" class="card-img"/>
                  </div>
                  <div v-for="k in (9-pageCards.length)" :key="'e'+k" class="card-wrapper">
                    <img src="/images/桌牌.png" alt="" class="card-img"/>
                  </div>
                </div>
                <div class="cut-line cut-v" style="left:89mm"></div>
                <div class="cut-line cut-v" style="left:178mm"></div>
                <div class="cut-line cut-h" style="top:59mm"></div>
                <div class="cut-line cut-h" style="top:118mm"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- ══ 列印頁 ══ -->
    <div v-if="page==='print'">
      <div class="print-toolbar no-print bg-surface border-b border-light-c">
        <button class="back-btn border-light-c text-base-c" @click="page='select'">← 返回選單</button>
        <span class="toolbar-info text-muted-c">共 {{ printPages.length }} 頁</span>
        <button class="do-print-btn" @click="doPrint">🖨️ 列印</button>
      </div>
      <div v-for="(pageCards,pi) in printPages" :key="pi" class="a4-page">
        <div class="cut-area">
          <div class="grid">
            <div v-for="(card,ci) in pageCards" :key="ci" class="card-wrapper">
              <div class="card-text-area" :style="textAreaStyle">
                <p class="card-line1" :style="[{fontSize: calcZhSize(card.zh), position:'relative', left:(card.zhOffset??0)+'mm', top:((card.zhTop??0)+zhOffsetTop)+'mm'}, zhLineStyle]">{{ card.zh }}</p>
                <p class="card-line2" :style="[{fontSize: calcEnSize(card.en), position:'relative', left:(card.enOffset??0)+'mm', top:((card.enTop??0)+enOffsetTop)+'mm'}, enLineStyle]">{{ card.en }}</p>
              </div>
              <img src="/images/桌牌.png" alt="桌牌" class="card-img"/>
            </div>
            <div v-for="k in (9-pageCards.length)" :key="'e'+k" class="card-wrapper">
              <img src="/images/桌牌.png" alt="" class="card-img"/>
            </div>
          </div>
          <div class="cut-line cut-v" style="left:89mm"></div>
          <div class="cut-line cut-v" style="left:178mm"></div>
          <div class="cut-line cut-h" style="top:59mm"></div>
          <div class="cut-line cut-h" style="top:118mm"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'staff', requiredPermission: 'staff.quick-links' })

const sideTab = ref('use')   // 'use' | 'config'
const page = ref('select')

/* ── 字數規則 ── */
const zhRules = reactive([
  {maxLen:3,  sizePt:36},
  {maxLen:6,  sizePt:28},
  {maxLen:8,  sizePt:20},
  {maxLen:12, sizePt:14},
])
const zhFallbackPt = ref(10)
const enRules = reactive([
  {maxLen:10, sizePt:14},
  {maxLen:20, sizePt:12},
  {maxLen:30, sizePt:10},
])
const enFallbackPt = ref(8)

function calcZhSize(text) {
  // 全形括號視覺上比漢字窄，算 0.6 個字寬
  const len = (text||'').split('').reduce((acc, ch) => {
    if (/[（）]/.test(ch)) return acc + 0.6
    return acc + 1
  }, 0)
  const sorted = [...zhRules].sort((a,b)=>a.maxLen-b.maxLen)
  for (const r of sorted) if (len<=r.maxLen) return r.sizePt+'pt'
  return zhFallbackPt.value+'pt'
}
function calcEnSize(text) {
  const len = (text||'').length
  const sorted = [...enRules].sort((a,b)=>a.maxLen-b.maxLen)
  for (const r of sorted) if (len<=r.maxLen) return r.sizePt+'pt'
  return enFallbackPt.value+'pt'
}

/* ── 位置微調 ── */
const zhOffsetTop = ref(0)
const enOffsetTop = ref(0)
const offsetLeft  = ref(0)
const textAreaH   = ref(76)
const zhSpacing   = ref(0)
const enSpacing   = ref(0)

const textAreaStyle = computed(()=>({
  left:   offsetLeft.value+'mm',
  right:  (-offsetLeft.value)+'mm',
  height: textAreaH.value+'%',
}))

const zhLineStyle = computed(()=>({ letterSpacing: zhSpacing.value+'mm', position:'relative', top: zhOffsetTop.value+'mm' }))
const enLineStyle = computed(()=>({ letterSpacing: enSpacing.value+'mm', position:'relative', top: enOffsetTop.value+'mm' }))

/* ── 收縮狀態 ── */
const open = reactive({size:true, tune:false, items:true})
const groupOpen = reactive({})   // gi -> bool，undefined = 展開
function toggleGroupOpen(gi) {
  groupOpen[gi] = groupOpen[gi]===false ? true : false
}

/* ── 預設資料 ── */
const presets = reactive([
  { group:'醬料', items:[
      {zh:'胡麻醬（葷）',  en:'Sesame Dressing (Non-Veg)'},
      {zh:'油醋醬（素）',  en:'Vinaigrette (Vegan)'},
      {zh:'洋蔥鮪魚（葷）',en:'Tuna with Onions (Non-Veg)'},
      {zh:'黑芝麻醬（素）',en:'Black Sesame Paste (Vegan)'},
      {zh:'醬油膏',        en:'Thick Soy Sauce'},
      {zh:'辣椒醬油（非常辣）',en:'Chili Soy Sauce (Spicy)'},
      {zh:'自製沾醬（葷）',en:'House-made Dipping Sauce (Non-Veg)'},
      {zh:'自製沾醬（素）',en:'House-made Dipping Sauce (Vegan)'},
      {zh:'和風柚子（素）',en:'Japanese Yuzu Dressing (Vegan)'},
      {zh:'蜂蜜',          en:'Honey'},
      {zh:'和風芝麻（素）',en:'Japanese Sesame Dressing (Vegan)'},
      {zh:'火龍果醬（素）',en:'Dragon Fruit Jam (Vegan)'},
      {zh:'蔓越莓腰果（素）',en:'Cranberry Cashews (Vegan)'},
      {zh:'鳳梨腰果（素）',en:'Pineapple Cashews (Vegan)'},
      {zh:'腰果醬（素）',  en:'Cashew Paste (Vegan)'},
      {zh:'洛神腰果（素）',en:'Roselle Cashews (Vegan)'},
    ]},
  { group:'飲品', items:[
      {zh:'紅烏龍茶',      en:'Red Oolong Tea'},
      {zh:'青茶',          en:'Light Oolong Tea'},
      {zh:'白鶴靈芝',      en:'White Crane Lingzhi Tea'},
      {zh:'芳香萬壽菊',    en:'Lemon Marigold Tea'},
      {zh:'七葉蘭',        en:'Pandan Leaf Tea'},
      {zh:'檸檬香茅',      en:'Lemongrass Tea'},
      {zh:'鳳梨鼠尾草',    en:'Pineapple Sage Tea'},
      {zh:'魚腥草',        en:'Houttuynia Tea'},
      {zh:'三葉五加',      en:'Three-leaf Eleuthero'},
      {zh:'扁桃斑鳩菊',    en:'African Bitter Leaf Tea'},
      {zh:'紫蘇',          en:'Perilla'},
      {zh:'現磨濃豆漿',    en:'Freshly Ground Rich Soy Milk'},
      {zh:'黑糖薑茶',      en:'Brown Sugar Ginger Tea'},
      {zh:'黑糖南薑茶',    en:'Brown Sugar Galangal Tea'},
      {zh:'好體力茶',      en:'Energy Boost Tea'},
      {zh:'好輕鬆茶',      en:'Relax & Unwind Tea'},
      {zh:'好睡茶',        en:'Sleepy Time Tea'},
      {zh:'幸福茶',        en:'Happiness Blend Tea'},
      {zh:'舒康茶',        en:'Wellness & Comfort Tea'},
      {zh:'添加甜菊（天然微甜）',en:'Stevia Added (Naturally Sweetened)'},
      {zh:'冬瓜糖水',      en:'Winter Melon Sugar Syrup'},
    ]},
  { group:'食品標示', items:[
      {zh:'手工餅乾',      en:'Handmade Cookies'},
      {zh:'手工麵包',      en:'House-baked Bread'},
      {zh:'素肉燥',        en:'Vegetarian Meat Sauce'},
      {zh:'自製芝麻湯圓',  en:'House-made Sesame Tangyuan'},
      {zh:'田間自產',      en:'Farm-to-Table Fresh'},
      {zh:'含有堅果類',    en:'Contains Nuts'},
      {zh:'冷飲',          en:'Chilled'},
      {zh:'溫飲',          en:'Warm'},
      {zh:'辣',            en:'Spicy'},
      {zh:'不辣',          en:'Not Spicy'},
      {zh:'樂智長輩栽種',  en:'Lovingly Grown by Our Eldercare Seniors'},
    ]},
  { group:'飲食類型', items:[
      {zh:'葷食',          en:'Non-Veg'},
      {zh:'素食',          en:'Vegan'},
      {zh:'五辛素',        en:'Vegetarian (contains Allium)'},
      {zh:'蛋奶素',        en:'Ovo-Lacto Vegetarian'},
      {zh:'五辛蛋奶素',    en:'Ovo-Lacto Vegetarian (contains Allium)'},
    ]},
])

/* ── 類別 CRUD ── */
const addingGroup  = ref(false)
const newGroupName = ref('')
const editingGroupIdx = ref(-1)
const editGroupName   = ref('')

function confirmAddGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  presets.push({group: name, items:[]})
  addingGroup.value = false
}
function startEditGroup(gi) {
  editingGroupIdx.value = gi
  editGroupName.value = presets[gi].group
}
function confirmEditGroup(gi) {
  const name = editGroupName.value.trim()
  if (name) presets[gi].group = name
  editingGroupIdx.value = -1
}
function deleteGroup(gi) {
  const zhs = new Set(presets[gi].items.map(p=>p.zh))
  presets.splice(gi,1)
  selected.value = selected.value.filter(s=>!zhs.has(s.zh))
}

/* ── 項目 CRUD ── */
const addingIn   = ref(-1)
const editingKey = ref('')
const editForm   = reactive({zh:'', en:'', toGroup:0, zhOffset:0, enOffset:0, zhTop:0, enTop:0})

function startAddItem(gi) {
  addingIn.value = gi; editingKey.value = ''
  editForm.zh=''; editForm.en=''
}
function confirmAdd(gi) {
  const zh = editForm.zh.trim(); const en = editForm.en.trim()
  if (!zh) return
  presets[gi].items.push({zh, en: en||zh})
  addingIn.value = -1
}
const editOrigOffset = reactive({zhOffset:0, enOffset:0, gi:-1, pi:-1})

function startEditItem(gi, pi, p) {
  editingKey.value = gi+'-'+pi; addingIn.value=-1
  editForm.zh = p.zh; editForm.en = p.en; editForm.toGroup = gi
  editForm.zhOffset = p.zhOffset ?? 0; editForm.enOffset = p.enOffset ?? 0
  editForm.zhTop = p.zhTop ?? 0; editForm.enTop = p.enTop ?? 0
  editOrigOffset.zhOffset = p.zhOffset ?? 0; editOrigOffset.enOffset = p.enOffset ?? 0
  editOrigOffset.gi = gi; editOrigOffset.pi = pi
}

function cancelEdit() {
  // 還原 preset 的 offset
  if (editOrigOffset.gi >= 0 && editOrigOffset.pi >= 0) {
    const item = presets[editOrigOffset.gi]?.items[editOrigOffset.pi]
    if (item) { item.zhOffset = editOrigOffset.zhOffset; item.enOffset = editOrigOffset.enOffset }
  }
  editingKey.value = ''
}
function confirmEdit(gi, pi) {
  const zh = editForm.zh.trim(); const en = editForm.en.trim()
  if (!zh) return
  const oldZh = presets[gi].items[pi].zh
  const newItem = {zh, en: en||zh, zhOffset: editForm.zhOffset, enOffset: editForm.enOffset, zhTop: editForm.zhTop, enTop: editForm.enTop}
  const tg = editForm.toGroup
  if (tg !== gi) {
    presets[gi].items.splice(pi,1)
    presets[tg].items.push(newItem)
  } else {
    presets[gi].items[pi] = newItem
  }
  const sel = selected.value.find(s=>s.zh===oldZh)
  if (sel) { sel.zh=zh; sel.en=en||zh; sel.zhOffset=editForm.zhOffset; sel.enOffset=editForm.enOffset }
  editingKey.value=''
}
const confirmDeleteKey      = ref('')   // 'gi-pi'
const confirmDeleteGroupIdx = ref(-1)

function confirmDeleteItem(gi, pi, p) {
  presets[gi].items.splice(pi, 1)
  selected.value = selected.value.filter(s => s.zh !== p.zh)
  confirmDeleteKey.value = ''
}
function confirmDeleteGroup(gi) {
  const zhs = new Set(presets[gi].items.map(p => p.zh))
  presets.splice(gi, 1)
  selected.value = selected.value.filter(s => !zhs.has(s.zh))
  confirmDeleteGroupIdx.value = -1
}



/* ── 選取 ── */
const selected = ref([])
function isSelected(p) { return selected.value.some(s=>s.zh===p.zh) }
function getQty(p)     { return selected.value.find(s=>s.zh===p.zh)?.qty??1 }
function changeQty(p,d){ const i=selected.value.find(s=>s.zh===p.zh); if(i) i.qty=Math.max(1,i.qty+d) }
function toggleItem(p,checked) {
  if (checked) { if(!isSelected(p)) selected.value.push({...p,qty:1}) }
  else          { selected.value=selected.value.filter(s=>s.zh!==p.zh) }
}
function isGroupAllSelected(g) { return g.items.every(p=>isSelected(p)) }
function isGroupPartial(g) {
  const c=g.items.filter(p=>isSelected(p)).length; return c>0&&c<g.items.length
}
function toggleGroup(g,checked) {
  if (checked) { g.items.forEach(p=>{ if(!isSelected(p)) selected.value.push({...p,qty:1}) }) }
  else {
    const zhs=new Set(g.items.map(p=>p.zh))
    selected.value=selected.value.filter(s=>!zhs.has(s.zh))
  }
}

function chunk(arr,n){ const r=[]; for(let i=0;i<arr.length;i+=n) r.push(arr.slice(i,i+n)); return r }
// 設定tab預覽：顯示所有 preset 項目（不受 selected 影響，即時反映 offset）
const allPresetCards = computed(()=>{
  const r=[]
  for (const g of presets) for (const p of g.items) r.push({zh:p.zh, en:p.en, zhOffset:p.zhOffset??0, enOffset:p.enOffset??0})
  return r
})
const configPreviewPages = computed(()=>allPresetCards.value.length ? chunk(allPresetCards.value,9) : [[]])
function findPresetItem(zh) {
  for (const g of presets) {
    const found = g.items.find(p => p.zh === zh)
    if (found) return found
  }
  return null
}

const expandedCards = computed(()=>{
  const r=[]
  for (const item of selected.value) {
    const preset = findPresetItem(item.zh)
    const zhOffset = preset?.zhOffset ?? item.zhOffset ?? 0
    const enOffset = preset?.enOffset ?? item.enOffset ?? 0
    const zhTop    = preset?.zhTop    ?? item.zhTop    ?? 0
    const enTop    = preset?.enTop    ?? item.enTop    ?? 0
    for(let i=0;i<item.qty;i++) r.push({zh:item.zh, en:item.en, zhOffset, enOffset, zhTop, enTop})
  }
  return r
})
const totalCount   = computed(()=>selected.value.reduce((s,i)=>s+i.qty,0))
const previewPages = computed(()=>expandedCards.value.length?chunk(expandedCards.value,9):[[]])
const printPages   = computed(()=>chunk(expandedCards.value,9))

/* ── 預覽縮放 ── */
const previewAreaRef = ref(null)
const previewWidth   = ref(800)
const manualScale    = ref(50)    // 預設 50%
const previewCols    = ref(1)

onMounted(()=>{
  if (!previewAreaRef.value) return
  const ro = new ResizeObserver(e=>{ previewWidth.value=e[0]?.contentRect.width??800 })
  ro.observe(previewAreaRef.value)
  onUnmounted(()=>ro.disconnect())
})

const a4Style = computed(()=>{
  const a4W = 297*3.7795
  const a4H = 210*3.7795
  const scale = manualScale.value > 0 ? manualScale.value/100 : Math.min(0.95, (previewWidth.value - 48) / a4W)
  // 自動算能放幾欄
  const scaledW = a4W * scale + 16   // 16px gap
  const autoCols = Math.max(1, Math.floor((previewWidth.value - 32) / scaledW))
  previewCols.value = autoCols
  return {
    transform: `scale(${scale})`,
    marginBottom: `${a4H*scale - a4H}px`,
    marginRight:  `${a4W*scale - a4W}px`,
  }
})

/* ── 輔助 ── */
function mainZh(zh) { return zh.replace(/（[^）]*）/g,'').trim() }
function dietTag(zh) { const m=zh.match(/（([^）]*)）/); return m?`（${m[1]}）`:'' }
function dietClass(zh) {
  if (/葷/.test(zh)) return 'tag-meat'
  if (/素/.test(zh)) return 'tag-veg'
  if (/辣/.test(zh)) return 'tag-spicy'
  return ''
}
function doPrint() {
  // 列印前暫時移除 a4-preview 的 transform，印完後還原
  const els = document.querySelectorAll('.a4-preview')
  const saved = []
  els.forEach(el => {
    saved.push(el.style.cssText)
    el.style.transform = 'none'
    el.style.marginBottom = '0'
    el.style.marginRight = '0'
  })
  globalThis.window?.print()
  // 還原（setTimeout 確保在列印對話框關閉後執行）
  setTimeout(() => {
    els.forEach((el, i) => { el.style.cssText = saved[i] })
  }, 500)
}
</script>

<style scoped>
*,*::before,*::after { box-sizing:border-box; }

/* ══ Layout ══ */
.layout { display:flex; height:100vh; overflow:hidden; }

/* Sidebar */
.sidebar { width:260px; min-width:260px; display:flex; flex-direction:column; height:100vh; overflow:hidden; }
.sidebar-header { flex-shrink:0; }

/* Tabs */
.tab-bar { display:flex; flex-shrink:0; }
.tab-btn {
  flex:1; padding:8px 0; font-size:12px; font-weight:bold;
  border:none; background:transparent; cursor:pointer;
  border-bottom:2px solid transparent; margin-bottom:-1px;
  transition:all .15s; -webkit-tap-highlight-color:transparent;
}

/* Config */
.config-scroll { flex:1; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column; }
.config-section-title {
  padding:6px 12px; font-size:12px; font-weight:bold;
  background:rgba(128,128,128,.1); border-top:1px solid rgba(128,128,128,.18); border-bottom:1px solid rgba(128,128,128,.18);
  display:flex; align-items:center; justify-content:space-between;
  user-select:none; flex-shrink:0;
}
.collapsible-section { cursor:pointer; }
.collapsible-section:hover { background:rgba(128,128,128,.17); }
.caret { font-size:10px; opacity:.6; }
.size-panel { padding:8px 12px; flex-shrink:0; }
.rule-row { display:flex; align-items:center; gap:3px; margin-bottom:3px; font-size:11px; }
.rule-prefix { min-width:18px; text-align:right; }
.rule-unit { font-size:11px; }
.rule-input {
  width:38px; text-align:center; font-size:11px;
  border-radius:4px; padding:2px 4px;
  border:1px solid;
  background:transparent;
}
.rule-del { background:none; border:none; cursor:pointer; font-size:11px; padding:0 2px; opacity:.5; }
.rule-del:hover { opacity:1; color:#ef4444; }
.rule-add {
  font-size:11px; background:none; border-radius:4px;
  padding:3px 8px; cursor:pointer; width:100%; margin-top:4px;
  border:1px dashed #64748b; color:#64748b;
}
.rule-add:hover { background:rgba(100,116,139,.08); }
.tune-row { display:flex; align-items:center; gap:6px; font-size:11px; margin-bottom:5px; }
.tune-row span:first-child { min-width:56px; }
.tune-row input[type=range] { flex:1; accent-color:#64748b; }
.tune-val { min-width:38px; text-align:right; font-size:11px; }

/* List */
.list-scroll { flex:1; overflow-y:auto; overflow-x:hidden; padding:4px 0; }
.add-group-row { padding:6px 12px; display:flex; gap:4px; align-items:center; }
.add-group-btn {
  font-size:11px; background:none; border-radius:4px;
  padding:3px 10px; cursor:pointer; width:100%;
  border:1px dashed #64748b; color:#64748b;
}
.add-group-btn:hover { background:rgba(100,116,139,.08); }

/* Groups */
.group { margin-bottom:2px; }
.group-header { padding:5px 8px 3px; position:sticky; top:0; z-index:1; display:flex; align-items:center; gap:4px; }
.group-toggle { cursor:pointer; font-size:10px; width:12px; flex-shrink:0; opacity:.5; }
.group-check { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:bold; cursor:pointer; flex:1; }
.group-check input { accent-color:#64748b; width:13px; height:13px; }
.group-name-label { flex:1; font-size:12px; font-weight:bold; }
.group-actions { display:flex; align-items:center; gap:2px; flex-shrink:0; }
.group-add-btn { background:none; border:none; color:#64748b; font-size:13px; cursor:pointer; padding:0 3px; line-height:1; }
.group-add-btn:hover { color:#475569; }
.group-name-inp {
  flex:1; font-size:12px; border-radius:3px;
  padding:2px 6px; background:transparent; border:1px solid;
}

/* Edit row */
.edit-row { display:flex; flex-direction:column; gap:6px; padding:8px 10px; border-left:3px solid #64748b; }
.edit-field-row { display:flex; align-items:center; gap:6px; }
.edit-field-label { font-size:11px; min-width:42px; flex-shrink:0; opacity:.7; }
.edit-action-row { display:flex; gap:6px; justify-content:flex-end; margin-top:2px; }
.edit-inp {
  flex:1; border-radius:4px; padding:4px 8px;
  font-size:11px; min-width:60px; background:transparent; border:1px solid;
}
.edit-group-sel {
  font-size:11px; border-radius:4px; padding:3px 6px;
  flex:1; background:transparent; border:1px solid;
}
.edit-ok { background:#64748b; color:white; border:none; border-radius:4px; padding:4px 10px; cursor:pointer; font-size:12px; font-weight:bold; }
.edit-ok:hover { background:#475569; }
.edit-ok.sm { padding:2px 7px; font-size:11px; }
.edit-cancel { background:transparent; border-radius:4px; padding:4px 10px; cursor:pointer; font-size:12px; border:1px solid; }
.edit-cancel.sm { padding:2px 7px; font-size:11px; }
.edit-slider { flex:1; accent-color:#64748b; }
.offset-val { font-size:10px; min-width:40px; text-align:right; white-space:nowrap; opacity:.7; }
.offset-reset { background:none; border:none; cursor:pointer; font-size:12px; padding:0 2px; opacity:.4; }
.offset-reset:hover { opacity:1; color:#64748b; }

/* Item rows */
.item-row { display:flex; align-items:center; padding:4px 8px 4px 34px; font-size:12px; transition:background .1s; }
.item-row:hover .item-actions { opacity:1; }
.item-label-inner { display:flex; align-items:center; gap:4px; flex:1; cursor:pointer; min-width:0; }
.item-label-inner input { accent-color:#64748b; width:12px; height:12px; flex-shrink:0; }
.zh-main { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.diet { font-size:10px; font-weight:bold; flex-shrink:0; }
.tag-meat  { color:#ef4444; }
.tag-veg   { color:#22c55e; }
.tag-spicy { color:#f97316; }
.qty-wrap { display:flex; align-items:center; gap:2px; margin-left:auto; flex-shrink:0; }
.qty-btn {
  background:transparent; border-radius:3px; width:18px; height:18px; font-size:13px;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  padding:0; line-height:1; border:1px solid;
}
.qty-btn:hover { background:#64748b; color:white; border-color:#64748b; }
.qty-num { font-size:11px; font-weight:bold; min-width:18px; text-align:center; }
.item-actions { display:flex; gap:2px; opacity:0; transition:opacity .15s; flex-shrink:0; margin-left:2px; }
.act-btn { background:none; border:none; cursor:pointer; font-size:11px; opacity:.4; padding:2px 4px; border-radius:3px; }
.act-btn:hover { opacity:1; background:rgba(128,128,128,.15); }
.act-btn.del:hover { background:rgba(239,68,68,.15); color:#ef4444; }
.config-item-row .item-actions { opacity:1; }
.config-item-content { display:flex; align-items:center; padding:4px 8px 4px 34px; }
.config-item-content .zh-main { flex:1; }
.config-item-content .item-actions { opacity:1; }

/* Delete confirm */
.del-confirm-label { font-size:10px; color:#ef4444; white-space:nowrap; }
.del-yes { background:#ef4444; color:white; border:none; border-radius:3px; padding:2px 8px; font-size:11px; cursor:pointer; }
.del-yes:hover { background:#dc2626; }
.del-no  { background:transparent; border-radius:3px; padding:2px 8px; font-size:11px; cursor:pointer; border:1px solid; opacity:.6; }

/* Footer */
.sidebar-footer { padding:10px 12px; display:flex; align-items:center; gap:8px; flex-shrink:0; }
.count-badge { flex:1; font-size:13px; }
.print-nav-btn { background:#dc2626; color:white; border:none; border-radius:8px; padding:8px 14px; font-size:12px; cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:4px; }
.print-nav-btn:disabled { opacity:.4; cursor:default; }
.print-nav-btn:not(:disabled):hover { background:#b91c1c; }

/* ══ 預覽區 ══ */
.preview-area { flex:1; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column; min-width:0; }
.preview-toolbar { display:flex; align-items:center; gap:6px; padding:8px 16px; flex-shrink:0; flex-wrap:wrap; }
.preview-toolbar-label { font-size:11px; white-space:nowrap; opacity:.7; }
.preview-toolbar-val   { font-size:11px; min-width:28px; }
.scale-slider { width:80px; accent-color:#64748b; }
.auto-scale-btn { font-size:11px; padding:3px 10px; border-radius:6px; cursor:pointer; border:1px solid; background:transparent; }
.auto-scale-btn.active { background:#64748b; color:white; border-color:#64748b; }
.preview-pages-wrap { display:grid; grid-template-columns:repeat(var(--cols,1),1fr); gap:20px; padding:16px; align-items:start; }
.a4-preview-wrap { min-width:0; }
.page-num-label { font-size:11px; margin-bottom:4px; opacity:.6; }
.a4-preview {
  width:297mm; height:210mm;
  background:white; box-shadow:0 4px 24px rgba(0,0,0,.25);
  display:flex; align-items:flex-start; justify-content:flex-start;
  transform-origin:top left;
}
.empty-hint { font-size:16px; padding:60px 20px; opacity:.4; }

/* ══ 裁切區 ══ */
.cut-area { position:relative; width:267mm; height:177mm; }
.grid { display:grid; grid-template-columns:repeat(3,89mm); grid-template-rows:repeat(3,59mm); gap:0; }
.card-wrapper { width:89mm; height:59mm; position:relative; overflow:hidden; }
.card-text-area { position:absolute; left:0; right:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding:2mm 3mm 3mm; z-index:1; overflow:hidden; }
.card-line1 { margin:0; font-family:'標楷體','DFKai-SB',serif; font-weight:bold; color:#1a1a1a; text-align:center; line-height:1.15; white-space:nowrap; }
.card-line2 { margin:0; font-family:'Georgia',serif; font-weight:bold; color:#1a1a1a; text-align:center; line-height:1.2; white-space:nowrap; }
.card-img { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:fill; z-index:0; }
.cut-line { position:absolute; background:repeating-linear-gradient(transparent,transparent 2.5mm,#999 2.5mm,#999 5mm); z-index:20; pointer-events:none; }
.cut-v { top:-4mm; width:0.3mm; height:calc(100% + 8mm); }
.cut-h { left:-4mm; height:0.3mm; width:calc(100% + 8mm); }

/* ══ 列印工具列 ══ */
.print-toolbar { display:flex; align-items:center; gap:12px; padding:10px 20px; }
.back-btn { background:transparent; border-radius:6px; padding:7px 16px; font-size:13px; cursor:pointer; border:1px solid; }
.do-print-btn { background:#dc2626; color:white; border:none; border-radius:6px; padding:7px 16px; font-size:13px; cursor:pointer; }
.toolbar-info { flex:1; font-size:13px; opacity:.7; }
.a4-page { width:297mm; height:210mm; margin:20px auto; background:white; box-shadow:0 2px 12px rgba(0,0,0,.12); display:flex; align-items:flex-start; justify-content:flex-start; }

@media print {
  @page { size:A4 landscape; margin:0; }
  .sidebar,.preview-toolbar,.page-num-label,.empty-hint,.a4-page { display:none !important; }
  .layout { display:block; height:auto; overflow:visible; }
  .preview-area { display:block !important; overflow:visible !important; padding:0 !important; width:100% !important; }
  .preview-pages-wrap { display:block !important; padding:0 !important; gap:0 !important; }
  .a4-preview-wrap { display:block !important; }
  .a4-preview-wrap:not(:last-child) { page-break-after:always; break-after:page; }
  .a4-preview { width:297mm !important; height:210mm !important; transform:none !important; margin:0 !important; box-shadow:none !important; display:flex !important; align-items:flex-start !important; justify-content:flex-start !important; }
}
</style>
