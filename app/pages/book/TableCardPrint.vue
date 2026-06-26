<template>
  <div>
    <!-- 控制列（列印時隱藏） -->
    <div class="controls no-print">
      <h2>桌牌列印設定</h2>

      <!-- 預設文字大小 -->
      <div class="section-title">預設文字大小</div>
      <div class="form-row">
        <label>第一行預設大小：</label>
        <select v-model="defaultSize1">
          <option v-for="s in fontSizes" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <label style="margin-left:20px">第二行預設大小：</label>
        <select v-model="defaultSize2">
          <option v-for="s in fontSizes" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>

      <!-- 批次套用 -->
      <div class="section-title" style="margin-top:14px">批次套用</div>
      <div class="form-row">
        <label>第一行文字：</label>
        <select v-model="batchLine1" class="select-wide">
          <option value="">（自訂輸入）</option>
          <optgroup v-for="group in presets" :key="group.group" :label="group.group">
            <option v-for="p in group.items" :key="p.zh" :value="p.zh">{{ p.zh }}</option>
          </optgroup>
        </select>
        <input v-if="batchLine1 === ''" v-model="batchLine1Custom" placeholder="自訂第一行" style="width:160px" />
      </div>
      <div class="form-row">
        <label>第二行文字：</label>
        <select v-model="batchLine2" class="select-wide">
          <option value="">（自訂輸入）</option>
          <optgroup v-for="group in presets" :key="group.group" :label="group.group">
            <option v-for="p in group.items" :key="p.en" :value="p.en">{{ p.en }}</option>
          </optgroup>
        </select>
        <input v-if="batchLine2 === ''" v-model="batchLine2Custom" placeholder="自訂第二行" style="width:160px" />
      </div>
      <!-- 同步選項：選了中文自動帶英文 -->
      <div class="form-row">
        <label></label>
        <button @click="syncEnFromZh">從中文自動帶入英文</button>
        <button @click="applyToAll" style="margin-left:8px">套用到全部 9 張</button>
      </div>

      <hr />

      <!-- 個別設定 -->
      <div class="section-title">個別設定（每張卡片）</div>
      <div class="individual-settings">
        <div v-for="(card, i) in cards" :key="i" class="card-setting">
          <span class="card-label">{{ i + 1 }}</span>
          <div class="card-inputs">
            <div class="input-row">
              <select v-model="card.line1" class="sel-preset">
                <option value="">自訂</option>
                <optgroup v-for="group in presets" :key="group.group" :label="group.group">
                  <option v-for="p in group.items" :key="p.zh" :value="p.zh">{{ p.zh }}</option>
                </optgroup>
              </select>
              <input v-if="card.line1 === ''" v-model="card.line1Custom" placeholder="第一行" class="inp-custom" />
              <select v-model="card.size1" class="sel-size">
                <option value="">預設</option>
                <option v-for="s in fontSizes" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div class="input-row">
              <select v-model="card.line2" class="sel-preset">
                <option value="">自訂</option>
                <optgroup v-for="group in presets" :key="group.group" :label="group.group">
                  <option v-for="p in group.items" :key="p.en" :value="p.en">{{ p.en }}</option>
                </optgroup>
              </select>
              <input v-if="card.line2 === ''" v-model="card.line2Custom" placeholder="第二行" class="inp-custom" />
              <select v-model="card.size2" class="sel-size">
                <option value="">預設</option>
                <option v-for="s in fontSizes" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <button class="print-btn" @click="printPage">🖨️ 列印</button>
    </div>

    <!-- 橫向 A4 列印區域 -->
    <div class="a4-page print-area">
      <div class="grid">
        <div v-for="(card, i) in cards" :key="i" class="card-wrapper">
          <div class="card-text-area">
            <p class="card-line1" :style="{ fontSize: card.size1 || defaultSize1 }">
              {{ card.line1 !== '' ? card.line1 : card.line1Custom }}
            </p>
            <p class="card-line2" :style="{ fontSize: card.size2 || defaultSize2 }">
              {{ card.line2 !== '' ? card.line2 : card.line2Custom }}
            </p>
          </div>
          <img src="/桌牌.png" alt="桌牌" class="card-img" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

/* ── 預設大小 ── */
const fontSizes = [
  { label: '特大 (36pt)', value: '36pt' },
  { label: '大 (28pt)',   value: '28pt' },
  { label: '中 (20pt)',   value: '20pt' },
  { label: '小 (14pt)',   value: '14pt' },
  { label: '微 (10pt)',   value: '10pt' },
]
const defaultSize1 = ref('28pt')
const defaultSize2 = ref('14pt')

/* ── 預設選項 ── */
const presets = [
  {
    group: '醬料',
    items: [
      { zh: '胡麻醬(葷)',      en: 'Sesame Dressing (Non-Veg)' },
      { zh: '油醋醬(素)',      en: 'Vinaigrette (Vegan)' },
      { zh: '洋蔥鮪魚(葷)',    en: 'Tuna with Onions (Non-Veg)' },
      { zh: '黑芝麻醬(素)',    en: 'Black Sesame Paste (Vegan)' },
      { zh: '醬油膏',          en: 'Thick Soy Sauce' },
      { zh: '辣椒醬油(非常辣)',en: 'Chili Soy Sauce (Spicy)' },
      { zh: '自製沾醬(葷)',    en: 'House-made Dipping Sauce (Non-Veg)' },
      { zh: '自製沾醬(素)',    en: 'House-made Dipping Sauce (Vegan)' },
      { zh: '和風柚子(素)',    en: 'Japanese Yuzu Dressing (Vegan)' },
      { zh: '蜂蜜',            en: 'Honey' },
      { zh: '和風芝麻(素)',    en: 'Japanese Sesame Dressing (Vegan)' },
      { zh: '火龍果醬(素)',    en: 'Dragon Fruit Jam (Vegan)' },
      { zh: '蔓越莓腰果(素)', en: 'Cranberry Cashews (Vegan)' },
      { zh: '鳳梨腰果(素)',   en: 'Pineapple Cashews (Vegan)' },
      { zh: '腰果醬(素)',     en: 'Cashew Paste (Vegan)' },
      { zh: '洛神腰果(素)',   en: 'Roselle Cashews (Vegan)' },
    ]
  },
  {
    group: '飲品',
    items: [
      { zh: '紅烏龍茶',   en: 'Red Oolong Tea' },
      { zh: '青茶',       en: 'Light Oolong Tea' },
      { zh: '白鶴靈芝',   en: 'White Crane Lingzhi Tea' },
      { zh: '芳香萬壽菊', en: 'Lemon Marigold Tea' },
      { zh: '七葉蘭',     en: 'Pandan Leaf Tea' },
      { zh: '檸檬香茅',   en: 'Lemongrass Tea' },
      { zh: '鳳梨鼠尾草', en: 'Pineapple Sage Tea' },
      { zh: '魚腥草',     en: 'Houttuynia Tea' },
      { zh: '三葉五加',   en: 'Three-leaf Eleuthero' },
      { zh: '扁桃斑鳩菊', en: 'African Bitter Leaf Tea' },
      { zh: '紫蘇',       en: 'Perilla' },
      { zh: '現磨濃豆漿', en: 'Freshly Ground Rich Soy Milk' },
      { zh: '黑糖薑茶',   en: 'Brown Sugar Ginger Tea' },
      { zh: '黑糖南薑茶', en: 'Brown Sugar Galangal Tea' },
      { zh: '好體力茶',   en: 'Energy Boost Tea' },
      { zh: '好輕鬆茶',   en: 'Relax & Unwind Tea' },
      { zh: '好睡茶',     en: 'Sleepy Time Tea' },
      { zh: '幸福茶',     en: 'Happiness Blend Tea' },
      { zh: '舒康茶',     en: 'Wellness & Comfort Tea' },
      { zh: '添加甜菊(天然微甜)', en: 'Stevia Added (Naturally Sweetened)' },
      { zh: '冬瓜糖水',   en: 'Winter Melon Sugar Syrup' },
    ]
  },
  {
    group: '食品標示',
    items: [
      { zh: '手工餅乾',       en: 'Handmade Cookies' },
      { zh: '手工麵包',       en: 'House-baked Bread' },
      { zh: '素肉燥',         en: 'Vegetarian Meat Sauce' },
      { zh: '自製芝麻湯圓',   en: 'House-made Sesame Tangyuan' },
      { zh: '田間自產',       en: 'Farm-to-Table Fresh' },
      { zh: '(含有堅果類)',   en: '(Contains Nuts)' },
      { zh: '冷飲',           en: 'Chilled' },
      { zh: '溫飲',           en: 'Warm' },
      { zh: '辣',             en: 'Spicy' },
      { zh: '不辣',           en: 'Not Spicy' },
      { zh: '樂智長輩栽種',   en: 'Lovingly Grown by Our Eldercare Seniors' },
    ]
  },
  {
    group: '飲食類型',
    items: [
      { zh: '葷食',       en: 'Non-Veg' },
      { zh: '素食',       en: 'Vegan' },
      { zh: '五辛素',     en: 'Vegetarian (contains Allium)' },
      { zh: '蛋奶素',     en: 'Ovo-Lacto Vegetarian' },
      { zh: '五辛蛋奶素', en: 'Ovo-Lacto Vegetarian (contains Allium)' },
    ]
  },
]

/* ── 批次輸入 ── */
const batchLine1 = ref('')
const batchLine1Custom = ref('')
const batchLine2 = ref('')
const batchLine2Custom = ref('')

function syncEnFromZh() {
  const zh = batchLine1.value || batchLine1Custom.value
  for (const group of presets) {
    const found = group.items.find(p => p.zh === zh)
    if (found) { batchLine2.value = found.en; return }
  }
}

function applyToAll() {
  const l1 = batchLine1.value !== '' ? batchLine1.value : batchLine1Custom.value
  const l2 = batchLine2.value !== '' ? batchLine2.value : batchLine2Custom.value
  cards.forEach(card => {
    if (batchLine1.value !== '') { card.line1 = batchLine1.value; card.line1Custom = '' }
    else { card.line1 = ''; card.line1Custom = l1 }
    if (batchLine2.value !== '') { card.line2 = batchLine2.value; card.line2Custom = '' }
    else { card.line2 = ''; card.line2Custom = l2 }
  })
}

/* ── 9 張卡片 ── */
const cards = reactive(
  Array.from({ length: 9 }, () => ({
    line1: '', line1Custom: '',
    line2: '', line2Custom: '',
    size1: '',  // 空 = 用預設
    size2: '',
  }))
)

function printPage() { window.print() }
</script>

<style scoped>
/* ── 控制面板 ── */
.controls {
  padding: 18px 28px;
  background: #f5f5f5;
  border-bottom: 2px solid #ddd;
  font-family: '微軟正黑體', 'Microsoft JhengHei', sans-serif;
  font-size: 13px;
}
.controls h2 { margin: 0 0 12px; font-size: 17px; color: #333; }
.section-title {
  font-weight: bold; color: #444; font-size: 13px;
  margin: 8px 0 6px; border-left: 3px solid #6a9e3f; padding-left: 6px;
}
.form-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 7px; flex-wrap: wrap;
}
.form-row label { min-width: 100px; color: #555; }
select, input[type=text], input:not([type]) {
  border: 1px solid #ccc; border-radius: 4px;
  padding: 4px 8px; font-size: 13px;
  font-family: '微軟正黑體', 'Microsoft JhengHei', sans-serif;
}
.select-wide { width: 220px; }
.form-row button {
  background: #6a9e3f; color: white; border: none;
  border-radius: 4px; padding: 5px 14px; cursor: pointer; font-size: 12px;
}
hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }

/* 個別設定 */
.individual-settings {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 6px 0;
}
.card-setting {
  display: flex; align-items: flex-start; gap: 6px;
  background: white; border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px;
}
.card-label {
  font-size: 12px; color: #888; min-width: 18px;
  font-weight: bold; padding-top: 4px;
}
.card-inputs { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.input-row { display: flex; gap: 4px; align-items: center; }
.sel-preset { width: 110px; font-size: 11px; }
.inp-custom { width: 80px; font-size: 11px; }
.sel-size   { width: 72px; font-size: 11px; }

.print-btn {
  margin-top: 10px; background: #c0392b; color: white;
  border: none; border-radius: 6px; padding: 9px 26px;
  font-size: 14px; cursor: pointer; display: block;
}
.print-btn:hover { background: #a93226; }

/* ── A4 橫向 297mm × 210mm ── */
.a4-page {
  width: 297mm; height: 210mm;
  margin: 24px auto;
  background: white;
  box-sizing: border-box;
  padding: 8mm;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  display: flex; align-items: center; justify-content: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 89mm);
  grid-template-rows: repeat(3, 59mm);
  column-gap: 7mm;
  row-gap: 8.5mm;
}

.card-wrapper {
  width: 89mm; height: 59mm;
  position: relative; overflow: hidden;
}

/* 文字區：佔上方 ~76%（紅色條約 24%） */
.card-text-area {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 76%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 2mm 3mm 1mm;
  z-index: 1; gap: 1.5mm;
  box-sizing: border-box;
}

.card-line1 {
  margin: 0;
  font-family: '標楷體', 'DFKai-SB', 'BiauKai', serif;
  font-weight: bold;
  color: #1a1a1a;
  text-align: center;
  line-height: 1.15;
  word-break: break-all;
}

.card-line2 {
  margin: 0;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-weight: bold;
  color: #1a1a1a;
  text-align: center;
  line-height: 1.2;
  word-break: break-all;
}

.card-img {
  width: 100%; height: 100%;
  object-fit: fill; display: block;
}

/* ── 列印 ── */
@media print {
  @page { size: A4 landscape; margin: 0; }
  .no-print { display: none !important; }
  .a4-page {
    width: 297mm; height: 210mm;
    margin: 0; padding: 8mm; box-shadow: none;
  }
}
</style>
