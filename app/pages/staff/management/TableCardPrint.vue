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

            <!-- 儲存設定按鈕 -->
            <div class="save-config-row">
              <button class="save-config-btn" :disabled="savingConfig" @click="saveConfig">
                {{ savingConfig ? '儲存中...' : '💾 儲存設定' }}
              </button>
            </div>

            <!-- 區塊一：文字大小規則 -->
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
              <div class="list-scroll items-list-scroll">
                <div class="search-row border-b border-light-c">
                  <input v-model="configSearchQuery" placeholder="搜尋項目..." class="search-inp text-base-c bg-surface" />
                  <button v-if="configSearchQuery" class="search-clear text-muted-c" @click="configSearchQuery=''">✕</button>
                </div>
                <template v-if="configSearchQuery.trim()">
                  <div v-for="p in configSearchResults" :key="p.id" class="item-row config-item-row">
                    <div class="config-item-content">
                      <span class="zh-main">{{ p.zh }}</span>
                      <span class="item-actions" style="opacity:1">
                        <button class="act-btn" @click="startEditItem(p._gi, p._pi, p)" title="編輯">✎</button>
                        <template v-if="confirmDeleteKey === p._gi+'-'+p._pi">
                          <span class="del-confirm-label">確定刪除？</span>
                          <button class="del-yes" @click="confirmDeleteItem(p._gi, p._pi, p)">是</button>
                          <button class="del-no border-light-c text-base-c" @click="confirmDeleteKey=''">否</button>
                        </template>
                        <button v-else class="act-btn del" @click="confirmDeleteKey=p._gi+'-'+p._pi" title="刪除">✕</button>
                      </span>
                    </div>
                  </div>
                  <div v-if="configSearchResults.length===0" class="empty-search text-hint-c">找不到「{{ configSearchQuery }}」</div>
                </template>
                <div class="add-group-row" v-show="!configSearchQuery.trim()">
                  <template v-if="addingGroup">
                    <input v-model="newGroupName" placeholder="類別名稱" class="edit-inp border-light-c bg-surface text-base-c" @keyup.enter="confirmAddGroup" @keyup.escape="addingGroup=false" />
                    <button class="edit-ok" @click="confirmAddGroup">✓</button>
                    <button class="edit-cancel border-light-c text-base-c" @click="addingGroup=false">✕</button>
                  </template>
                  <button v-else class="add-group-btn" @click="addingGroup=true;newGroupName=''">＋ 新增類別</button>
                </div>

                <div v-for="(group, gi) in presets" v-show="!configSearchQuery.trim()" :key="group.id" class="group">
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
                          <button class="del-no border-light-c text-base-c" @click="confirmDeleteGroupIdx=-1">否</button>
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

                    <div v-for="(p, pi) in group.items" :key="p.id">
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
                                 @input="Object.assign(presets[gi].items[pi], {zhTop: editForm.zhTop})"
                                 min="-20" max="20" step="0.5" class="edit-slider"/>
                          <span class="offset-val text-muted-c">{{ editForm.zhTop>0?'+':'' }}{{ editForm.zhTop }}mm</span>
                          <button class="offset-reset" @click="editForm.zhTop=0;Object.assign(presets[gi].items[pi], {zhTop:0})" v-if="editForm.zhTop!==0">↺</button>
                        </div>
                        <div class="edit-field-row">
                          <span class="edit-field-label">英文上下</span>
                          <input type="range" v-model.number="editForm.enTop"
                                 @input="Object.assign(presets[gi].items[pi], {enTop: editForm.enTop})"
                                 min="-20" max="20" step="0.5" class="edit-slider"/>
                          <span class="offset-val text-muted-c">{{ editForm.enTop>0?'+':'' }}{{ editForm.enTop }}mm</span>
                          <button class="offset-reset" @click="editForm.enTop=0;Object.assign(presets[gi].items[pi], {enTop:0})" v-if="editForm.enTop!==0">↺</button>
                        </div>
                        <div class="edit-field-row">
                          <span class="edit-field-label">中文左右</span>
                          <input type="range" v-model.number="editForm.zhOffset"
                                 @input="Object.assign(presets[gi].items[pi], {zhOffset: editForm.zhOffset})"
                                 min="-20" max="20" step="0.5" class="edit-slider"/>
                          <span class="offset-val text-muted-c">{{ editForm.zhOffset>0?'+':'' }}{{ editForm.zhOffset }}mm</span>
                          <button class="offset-reset" @click="editForm.zhOffset=0;Object.assign(presets[gi].items[pi], {zhOffset:0})" v-if="editForm.zhOffset!==0">↺</button>
                        </div>
                        <div class="edit-field-row">
                          <span class="edit-field-label">英文左右</span>
                          <input type="range" v-model.number="editForm.enOffset"
                                 @input="Object.assign(presets[gi].items[pi], {enOffset: editForm.enOffset})"
                                 min="-20" max="20" step="0.5" class="edit-slider"/>
                          <span class="offset-val text-muted-c">{{ editForm.enOffset>0?'+':'' }}{{ editForm.enOffset }}mm</span>
                          <button class="offset-reset" @click="editForm.enOffset=0;Object.assign(presets[gi].items[pi], {enOffset:0})" v-if="editForm.enOffset!==0">↺</button>
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
                              <button class="del-no border-light-c text-base-c" @click="confirmDeleteKey=''">否</button>
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
          <div class="search-row border-b border-light-c">
            <input v-model="searchQuery" placeholder="搜尋項目..." class="search-inp text-base-c bg-surface" />
            <button v-if="searchQuery" class="search-clear text-muted-c" @click="searchQuery=''">✕</button>
          </div>
          <div class="list-scroll">
            <template v-if="searchQuery.trim()">
              <div v-for="p in searchResults" :key="p.id"
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
              <div v-if="searchResults.length===0" class="empty-search text-hint-c">找不到「{{ searchQuery }}」</div>
            </template>
            <div v-for="(group, gi) in presets" v-show="!searchQuery.trim()" :key="group.id" class="group">
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
                <div v-for="(p, pi) in group.items" :key="p.id"
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
          </div><!-- end list-scroll -->

          <div class="sidebar-footer border-t border-light-c">
            <div class="count-badge text-muted-c">已選 {{ totalCount }} 張</div>
            <button class="print-nav-btn" :disabled="selected.length===0" @click="doPrint">🖨️ 列印</button>
          </div>

        </template><!-- end use tab -->
      </aside>

      <!-- ── 右側預覽 ── -->
      <main class="preview-area" ref="previewAreaRef">
        <div class="preview-toolbar bg-surface border-b border-light-c">
          <span class="preview-toolbar-label text-muted-c">預覽縮放</span>
          <input type="range" v-model.number="manualScale" min="20" max="100" step="5" class="scale-slider"/>
          <span class="preview-toolbar-val text-base-c">{{ manualScale }}%</span>
          <button class="auto-scale-btn border-light-c text-base-c" @click="manualScale=0" :class="{active: manualScale===0}">自動</button>
          <span class="preview-toolbar-label text-muted-c" style="margin-left:12px">自動排列 {{ previewCols }} 欄</span>
        </div>

        <div v-if="loading" class="empty-hint text-hint-c">載入中...</div>
        <div v-else-if="sideTab==='use' && selected.length===0" class="empty-hint text-hint-c">← 從左側勾選項目</div>

        <!-- config tab：按分類顯示 -->
        <template v-if="sideTab==='config'">
          <div class="config-preview-wrap">
            <div v-for="group in presets" :key="group.id" class="config-preview-group">
              <div class="config-preview-group-label text-muted-c">{{ group.group }}</div>
              <div class="config-preview-grid">
                <div v-for="card in group.items" :key="card.id" class="card-wrapper">
                  <div class="card-text-area" :style="textAreaStyle">
                    <p class="card-line1" :style="[{fontSize: calcZhSize(card.zh), position:'relative', left:(card.zhOffset??0)+'mm', top:((card.zhTop??0)+zhOffsetTop)+'mm'}, zhLineStyle]">{{ card.zh }}</p>
                    <p class="card-line2" :style="[{fontSize: calcEnSize(card.en), position:'relative', left:(card.enOffset??0)+'mm', top:((card.enTop??0)+enOffsetTop)+'mm'}, enLineStyle]">{{ card.en }}</p>
                  </div>
                  <img src="/images/桌牌.png" alt="桌牌" class="card-img"/>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- use tab：A4 頁面格式 -->
        <template v-else>
          <div class="preview-pages-wrap" :style="{ '--cols': previewCols }">
            <div v-for="(pageCards, pi) in previewPages" :key="pi" class="a4-preview-wrap">
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
        </template>
      </main>
    </div>

    <!-- ══ 列印頁 ══ -->
    <div v-if="page==='print'" style="overflow-x:hidden">
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
import { ref, reactive, computed, onMounted, onUnmounted }from 'vue'
definePageMeta({ layout: 'staff', requiredPermission: 'staff.quick-links' })
const sideTab = ref('use')
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
const zhLineStyle = computed(()=>({ letterSpacing: zhSpacing.value+'mm' }))
const enLineStyle = computed(()=>({ letterSpacing: enSpacing.value+'mm' }))

/* ── 收縮狀態 ── */
const open = reactive({size:true, tune:false, items:true})
const groupOpen = reactive({})
function toggleGroupOpen(gi) {
  groupOpen[gi] = groupOpen[gi]===false ? true : false
}

/* ── presets（含 id） ── */
const presets = reactive([])

const commonStore = useCommonStore()
const BASE = () => commonStore.data.main_url + '/holy/table-card'

const loading = ref(false)

/* ══════════════════════════════════
   API 呼叫
══════════════════════════════════ */

async function loadConfig() {
  try {
    const res = await fetch(`${BASE()}/config`)
    const data = await res.json()
    // 字數規則
    if (data.zhRules?.length) { zhRules.splice(0); data.zhRules.forEach(r => zhRules.push(r)) }
    if (data.zhFallbackPt != null) zhFallbackPt.value = data.zhFallbackPt
    if (data.enRules?.length) { enRules.splice(0); data.enRules.forEach(r => enRules.push(r)) }
    if (data.enFallbackPt != null) enFallbackPt.value = data.enFallbackPt
    // 位置微調
    if (data.textAreaH   != null) textAreaH.value   = data.textAreaH
    if (data.zhOffsetTop != null) zhOffsetTop.value = data.zhOffsetTop
    if (data.enOffsetTop != null) enOffsetTop.value = data.enOffsetTop
    if (data.offsetLeft  != null) offsetLeft.value  = data.offsetLeft
    if (data.zhSpacing   != null) zhSpacing.value   = data.zhSpacing
    if (data.enSpacing   != null) enSpacing.value   = data.enSpacing
  } catch (e) { console.error('載入設定失敗', e) }
}

async function loadItems() {
  try {
    const res = await fetch(`${BASE()}/items/list`)
    const data = await res.json()
    presets.splice(0)
    data.forEach(cat => presets.push({
      id:    cat.id,
      group: cat.group,
      items: (cat.items || []).map(it => ({
        id:       it.id,
        zh:       it.zh,
        en:       it.en,
        zhOffset: it.zhOffset ?? 0,
        enOffset: it.enOffset ?? 0,
        zhTop:    it.zhTop    ?? 0,
        enTop:    it.enTop    ?? 0,
      }))
    }))
  } catch (e) { console.error('載入項目失敗', e) }
}

const savingConfig = ref(false)
async function saveConfig() {
  savingConfig.value = true
  try {
    await fetch(`${BASE()}/config/save`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        zhRules: zhRules.map(r=>({maxLen:r.maxLen, sizePt:r.sizePt})),
        zhFallbackPt: zhFallbackPt.value,
        enRules: enRules.map(r=>({maxLen:r.maxLen, sizePt:r.sizePt})),
        enFallbackPt: enFallbackPt.value,
        textAreaH:   textAreaH.value,
        zhOffsetTop: zhOffsetTop.value,
        enOffsetTop: enOffsetTop.value,
        offsetLeft:  offsetLeft.value,
        zhSpacing:   zhSpacing.value,
        enSpacing:   enSpacing.value,
      })
    })
  } catch (e) { console.error('儲存設定失敗', e) }
  finally { savingConfig.value = false }
}

/* ── 類別 CRUD ── */
const addingGroup     = ref(false)
const newGroupName    = ref('')
const editingGroupIdx = ref(-1)
const editGroupName   = ref('')

async function confirmAddGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  try {
    const res = await fetch(`${BASE()}/category/save`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name })
    })
    const data = await res.json()
    presets.push({ id: data.id, group: name, items: [] })
  } catch (e) { console.error('新增類別失敗', e) }
  addingGroup.value = false
}

function startEditGroup(gi) {
  editingGroupIdx.value = gi
  editGroupName.value = presets[gi].group
}

async function confirmEditGroup(gi) {
  const name = editGroupName.value.trim()
  if (!name) return
  try {
    await fetch(`${BASE()}/category/save`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id: presets[gi].id, name })
    })
    presets[gi].group = name
  } catch (e) { console.error('改名失敗', e) }
  editingGroupIdx.value = -1
}

async function confirmDeleteGroup(gi) {
  try {
    await fetch(`${BASE()}/category/${presets[gi].id}`, { method: 'DELETE' })
    const zhs = new Set(presets[gi].items.map(p=>p.zh))
    presets.splice(gi, 1)
    selected.value = selected.value.filter(s => !zhs.has(s.zh))
  } catch (e) { console.error('刪除類別失敗', e) }
  confirmDeleteGroupIdx.value = -1
}

/* ── 項目 CRUD ── */
const addingIn   = ref(-1)
const editingKey = ref('')
const editForm   = reactive({zh:'', en:'', toGroup:0, zhOffset:0, enOffset:0, zhTop:0, enTop:0})
const editOrigOffset = reactive({zhOffset:0, enOffset:0, gi:-1, pi:-1})

function startAddItem(gi) {
  addingIn.value = gi; editingKey.value = ''
  editForm.zh=''; editForm.en=''
}

async function confirmAdd(gi) {
  const zh = editForm.zh.trim(); const en = editForm.en.trim()
  if (!zh) return
  try {
    const res = await fetch(`${BASE()}/item/save`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ catId: presets[gi].id, zh, en: en||zh })
    })
    const data = await res.json()
    presets[gi].items.push({ id: data.id, zh, en: en||zh, zhOffset:0, enOffset:0, zhTop:0, enTop:0 })
  } catch (e) { console.error('新增項目失敗', e) }
  addingIn.value = -1
}

function startEditItem(gi, pi, p) {
  editingKey.value = gi+'-'+pi; addingIn.value=-1
  editForm.zh = p.zh; editForm.en = p.en; editForm.toGroup = gi
  editForm.zhOffset = p.zhOffset ?? 0; editForm.enOffset = p.enOffset ?? 0
  editForm.zhTop = p.zhTop ?? 0; editForm.enTop = p.enTop ?? 0
  editOrigOffset.zhOffset = p.zhOffset ?? 0; editOrigOffset.enOffset = p.enOffset ?? 0
  editOrigOffset.gi = gi; editOrigOffset.pi = pi
}

function cancelEdit() {
  if (editOrigOffset.gi >= 0 && editOrigOffset.pi >= 0) {
    const item = presets[editOrigOffset.gi]?.items[editOrigOffset.pi]
    if (item) { item.zhOffset = editOrigOffset.zhOffset; item.enOffset = editOrigOffset.enOffset }
  }
  editingKey.value = ''
}

async function confirmEdit(gi, pi) {
  const zh = editForm.zh.trim(); const en = editForm.en.trim()
  if (!zh) return
  const oldZh = presets[gi].items[pi].zh
  const tg = editForm.toGroup
  const item = presets[gi].items[pi]
  const newItem = { id: item.id, zh, en: en||zh, zhOffset: editForm.zhOffset, enOffset: editForm.enOffset, zhTop: editForm.zhTop, enTop: editForm.enTop }

  try {
    if (tg !== gi) {
      // 跨類別移動：先 move 再 save 更新內容
      await fetch(`${BASE()}/item/move`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fromCatId: presets[gi].id, toCatId: presets[tg].id, id: item.id })
      })
      await fetch(`${BASE()}/item/save`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ catId: presets[tg].id, id: item.id, zh, en: en||zh,
          zhOffset: editForm.zhOffset, enOffset: editForm.enOffset,
          zhTop: editForm.zhTop, enTop: editForm.enTop })
      })
      presets[gi].items.splice(pi, 1)
      presets[tg].items.push(newItem)
    } else {
      await fetch(`${BASE()}/item/save`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ catId: presets[gi].id, id: item.id, zh, en: en||zh,
          zhOffset: editForm.zhOffset, enOffset: editForm.enOffset,
          zhTop: editForm.zhTop, enTop: editForm.enTop })
      })
      presets[gi].items[pi] = newItem
    }
    const sel = selected.value.find(s=>s.zh===oldZh)
    if (sel) { sel.zh=zh; sel.en=en||zh; sel.zhOffset=editForm.zhOffset; sel.enOffset=editForm.enOffset; sel.zhTop=editForm.zhTop; sel.enTop=editForm.enTop }
  } catch (e) { console.error('儲存項目失敗', e) }
  editingKey.value = ''
}

const confirmDeleteKey      = ref('')
const confirmDeleteGroupIdx = ref(-1)

async function confirmDeleteItem(gi, pi, p) {
  try {
    await fetch(`${BASE()}/item/${presets[gi].id}/${p.id}`, { method: 'DELETE' })
    presets[gi].items.splice(pi, 1)
    selected.value = selected.value.filter(s => s.zh !== p.zh)
  } catch (e) { console.error('刪除項目失敗', e) }
  confirmDeleteKey.value = ''
}

/* ── 搜尋 ── */
const searchQuery = ref('')
const configSearchQuery = ref('')
const configSearchResults = computed(() => {
  const q = configSearchQuery.value.trim().toLowerCase()
  if (!q) return []
  const r = []
  for (let gi = 0; gi < presets.length; gi++)
    for (let pi = 0; pi < presets[gi].items.length; pi++) {
      const p = presets[gi].items[pi]
      if (p.zh.toLowerCase().includes(q) || p.en.toLowerCase().includes(q))
        r.push({ ...p, _gi: gi, _pi: pi })
    }
  return r
})
const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const r = []
  for (const g of presets)
    for (const p of g.items)
      if (p.zh.toLowerCase().includes(q) || p.en.toLowerCase().includes(q))
        r.push(p)
  return r
})

/* ── 選取 ── */
const selected = ref([])
function isSelected(p)  { return selected.value.some(s=>s.zh===p.zh) }
function getQty(p)      { return selected.value.find(s=>s.zh===p.zh)?.qty??1 }
function changeQty(p,d) { const i=selected.value.find(s=>s.zh===p.zh); if(i) i.qty=Math.max(1,i.qty+d) }
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

const allPresetCards = computed(()=>{
  const r=[]
  for (const g of presets) for (const p of g.items) r.push({zh:p.zh, en:p.en, zhOffset:p.zhOffset??0, enOffset:p.enOffset??0, zhTop:p.zhTop??0, enTop:p.enTop??0})
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
const previewPages = computed(()=>chunk(expandedCards.value,9))
const printPages   = computed(()=>chunk(expandedCards.value,9))

/* ── 預覽縮放 ── */
const previewAreaRef = ref(null)
const previewWidth   = ref(800)
const manualScale    = ref(50)
const previewCols    = ref(1)

onMounted(async ()=>{
  // 動態取得 staff-nav 高度，讓 layout fixed 定位正確
  const nav = document.querySelector('.staff-nav')
  if (nav) {
    document.documentElement.style.setProperty('--nav-height', nav.offsetHeight + 'px')
  }
  loading.value = true
  await Promise.all([loadConfig(), loadItems()])
  loading.value = false
  if (!previewAreaRef.value) return
  const ro = new ResizeObserver(e=>{ previewWidth.value=e[0]?.contentRect.width??800 })
  ro.observe(previewAreaRef.value)
  onUnmounted(()=>ro.disconnect())
})

const a4Style = computed(()=>{
  const a4W = 297*3.7795
  const a4H = 210*3.7795
  const scale = manualScale.value > 0 ? manualScale.value/100 : Math.min(0.95, (previewWidth.value - 48) / a4W)
  const scaledW = a4W * scale + 16
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
  globalThis.window?.print()
}
</script>

<style scoped>
*,*::before,*::after { box-sizing:border-box; }

/* ══ Layout ══ */
.layout { display:flex; height:calc(100vh - var(--nav-height,44px)); overflow:hidden; }

/* Sidebar */
.sidebar { width:260px; min-width:260px; display:flex; flex-direction:column; height:100%; overflow:hidden; }
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
.config-scroll { flex:1; overflow-y:auto; overflow-x:hidden; }
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
.panel-label { font-size:11px; font-weight:bold; opacity:.6; margin-bottom:5px; }
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

/* 儲存設定按鈕 */
.save-config-row { padding:8px 12px; flex-shrink:0; }
.save-config-btn {
  width:100%; padding:6px 0; font-size:12px; font-weight:bold; cursor:pointer;
  border-radius:6px; border:none; background:#475569; color:white; transition:background .15s;
}
.save-config-btn:hover:not(:disabled) { background:#334155; }
.save-config-btn:disabled { opacity:.5; cursor:default; }

/* List */
.list-scroll { flex:1; overflow-y:auto; overflow-x:hidden; padding:4px 0; }
.items-list-scroll { padding-top:0; }
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
.config-item-row { padding-left:0; }
.config-item-row .item-actions { opacity:1; }
.config-item-content { display:flex; align-items:center; padding:4px 8px 4px 16px; }
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

/* 搜尋 */
.search-row { display:flex; align-items:center; padding:6px 10px; gap:4px; flex-shrink:0; }
.search-inp { flex:1; background:transparent; border:none; outline:none; font-size:12px; padding:2px 4px; }
.search-clear { background:none; border:none; cursor:pointer; font-size:11px; opacity:.5; padding:2px 4px; flex-shrink:0; }
.search-clear:hover { opacity:1; }
.empty-search { padding:20px 16px; font-size:12px; opacity:.5; text-align:center; }

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

/* ══ Config 預覽分類 ══ */
.config-preview-wrap { padding:16px; display:flex; flex-direction:column; gap:20px; }
.config-preview-group-label { font-size:11px; font-weight:bold; opacity:.5; margin-bottom:6px; padding-left:2px; }
.config-preview-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, 89mm);
  gap:0;
}

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

  /* 隱藏所有非列印元素 */
  .no-print,
  .sidebar,
  .preview-toolbar,
  .page-num-label,
  .empty-hint,
  .search-row,
  .print-toolbar,
  .config-preview-wrap { display:none !important; }

  /* layout 展開 */
  .layout { display:block !important; height:auto !important; overflow:visible !important; }

  /* preview-area 全寬展開 */
  .preview-area {
    display:block !important;
    overflow:visible !important;
    padding:0 !important;
    width:100% !important;
    height:auto !important;
  }

  /* 頁面包裝逐一換頁 */
  .preview-pages-wrap { display:block !important; padding:0 !important; gap:0 !important; }
  .a4-preview-wrap { display:block !important; page-break-after:always; break-after:page; }
  .a4-preview-wrap:last-child { page-break-after:avoid; break-after:avoid; }

  /* A4 本體：移除縮放，還原實際尺寸（預覽頁） */
  .a4-preview {
    width:297mm !important;
    height:210mm !important;
    transform:none !important;
    margin:0 !important;
    box-shadow:none !important;
    display:flex !important;
    align-items:flex-start !important;
    justify-content:flex-start !important;
    overflow:hidden !important;
  }

  /* 列印頁（page==='print'）的 A4 */
  .a4-page {
    width:297mm !important;
    height:210mm !important;
    margin:0 !important;
    box-shadow:none !important;
    display:flex !important;
    align-items:flex-start !important;
    justify-content:flex-start !important;
    overflow:hidden !important;
    page-break-after:always !important;
    break-after:page !important;
  }
  .a4-page:last-child {
    page-break-after:avoid !important;
    break-after:avoid !important;
  }
}
</style>

<!-- 全域列印覆蓋：解除 staff layout 的高度/overflow 限制 -->
<style>
@media print {
  .h-screen { height:auto !important; overflow:visible !important; display:block !important; }
  .flex-1 { flex:none !important; height:auto !important; overflow:visible !important; }
  .overflow-y-auto { overflow:visible !important; height:auto !important; }
}
</style>
