<template>
  <div class="min-h-full bg-surface2 transition-colors">

    <!-- Header -->
    <header class="bg-surface border-b border-light-c px-4 py-3 sticky top-0 z-20">
      <div class="max-w-6xl mx-auto flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white flex-shrink-0" style="font-size:15px">📞</div>
        <h1 class="font-bold text-base-c leading-none" style="font-size:16px">聖母分機查詢</h1>

        <!-- 機構 Tab（桌機版整合進 header 列） -->
        <div class="hidden lg:flex items-center gap-1 ml-2">
          <button
            v-for="org in orgs" :key="org.id"
            class="tab-btn flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            :class="activeOrg === org.id
 ? 'bg-blue-700 text-white font-semibold'
 : 'bg-surface2 text-muted-c hover-surface2'"
            style="font-size:14px"
            @click="activeOrg = org.id; activeDept = null; searchQuery = ''"
          >{{ org.name }}</button>
        </div>

        <!-- 搜尋列（桌機版整合進 header） -->
        <div class="hidden lg:block flex-1 max-w-xs ml-auto">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input
              v-model="searchQuery"
              placeholder="搜尋姓名或分機..."
              class="w-full pl-9 pr-8 py-1.5 text-sm rounded-xl border border-light-c bg-surface2 text-base-c outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-hint-c hover:text-muted-c">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 機構 Tab（手機版，獨立列） -->
    <div class="lg:hidden bg-surface border-b border-light-c sticky top-[calc(3.5rem+49px)] z-10">
      <div class="tab-scroll flex gap-1 px-3 py-2 overflow-x-auto">
        <button
          v-for="org in orgs" :key="org.id"
          class="tab-btn flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          :class="activeOrg === org.id
 ? 'bg-blue-700 text-white font-semibold'
 : 'bg-surface2 text-muted-c hover-surface2'"
          style="font-size:14px"
          @click="activeOrg = org.id; activeDept = null; searchQuery = ''"
        >{{ org.name }}</button>
      </div>
    </div>

    <!-- 搜尋列（手機版） -->
    <div class="lg:hidden max-w-2xl mx-auto px-3 sm:px-4 pt-3">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hint-c" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
        </svg>
        <input
          v-model="searchQuery"
          placeholder="搜尋姓名或分機號碼..."
          class="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-hint-c hover:text-muted-c">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- ── 搜尋結果模式 ── -->
    <template v-if="searchQuery.trim()">
      <div class="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-3">
        <p class="text-hint-c mb-2" style="font-size:13px">找到 {{ searchResults.length }} 筆結果</p>
        <div v-if="searchResults.length === 0" class="bg-surface rounded-2xl border border-light-c px-4 py-10 text-center text-hint-c shadow-sm" style="font-size:14px">
          找不到符合的分機
        </div>
        <!-- 搜尋結果：桌機多欄 grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          <div v-for="item in searchResults" :key="item._key"
               class="bg-surface rounded-xl border border-light-c px-4 py-3 flex items-center justify-between shadow-sm">
            <div>
              <p class="font-semibold text-base-c" style="font-size:14px">{{ item.name || '—' }}</p>
              <p class="text-hint-c" style="font-size:12px">{{ item._dept }} · {{ item._org }}</p>
            </div>
            <a :href="`tel:${item.ext}`" class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors flex-shrink-0 ml-2" style="font-size:14px">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>
              {{ item.ext }}
            </a>
          </div>
        </div>
      </div>
    </template>

    <!-- ── 正常瀏覽模式 ── -->
    <template v-else>
      <!-- 手機版：直向單欄 -->
      <div class="lg:hidden max-w-2xl mx-auto px-3 sm:px-4 py-3">
        <!-- 部門 Tab 列 -->
        <div class="tab-scroll flex flex-wrap gap-1.5 mb-3">
          <button
            class="flex-shrink-0 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
            :class="activeDept === null
 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
 : 'bg-surface2 text-muted-c hover:bg-surface2'"
            style="font-size:13px"
            @click="activeDept = null"
          >全部</button>
          <button
            v-for="dept in currentDepts" :key="dept.name"
            class="flex-shrink-0 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
            :class="activeDept === dept.name
 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
 : 'bg-surface2 text-muted-c hover:bg-surface2'"
            style="font-size:13px"
            @click="activeDept = dept.name"
          >{{ dept.name }}</button>
        </div>
        <template v-if="activeDept === null && currentOrgData?.mainLines?.length">
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 px-4 py-3 mb-3 shadow-sm">
            <p class="font-semibold text-blue-800 dark:text-blue-300 mb-2" style="font-size:13px">外線代表號</p>
            <div class="flex flex-wrap gap-2">
              <a v-for="line in currentOrgData.mainLines" :key="line.label" :href="`tel:${line.number}`"
                 class="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-blue-200 dark:border-blue-700 rounded-xl hover:bg-blue-50 transition-colors">
                <span class="text-hint-c" style="font-size:12px">{{ line.label }}</span>
                <span class="font-bold text-blue-700 dark:text-blue-300" style="font-size:14px">{{ line.number }}</span>
              </a>
            </div>
          </div>
        </template>
        <div class="space-y-3">
          <div v-for="dept in filteredDepts" :key="dept.name"
               class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden">
            <div class="flex items-center gap-2 px-4 py-2.5 bg-surface2 border-b border-light-c">
              <span class="font-semibold text-base-c" style="font-size:14px">{{ dept.name }}</span>
            </div>
            <div class="divide-y divide-base">
              <div v-for="(entry, idx) in dept.entries" :key="idx"
                   class="flex items-center justify-between px-4 py-2.5 hover:bg-surface2 transition-colors">
                <span class="text-muted-c" style="font-size:14px">{{ entry.name || '—' }}</span>
                <a :href="`tel:${entry.ext}`" class="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-mono font-semibold hover:text-blue-900 transition-colors" style="font-size:14px">
                  <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>
                  {{ entry.ext }}
                </a>
              </div>
            </div>
          </div>
        </div>
        <template v-if="currentOrgData?.broadcast?.length">
          <div class="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 px-4 py-3 mt-3 shadow-sm">
            <p class="font-semibold text-amber-800 dark:text-amber-300 mb-2" style="font-size:13px">快速撥號</p>
            <div class="flex flex-wrap gap-2">
              <a v-for="b in currentOrgData.broadcast" :key="b.label" :href="`tel:${b.number}`"
                 class="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-amber-200 dark:border-amber-700 rounded-xl hover:bg-amber-50 transition-colors">
                <span class="text-hint-c" style="font-size:12px">{{ b.label }}</span>
                <span class="font-bold text-amber-700 dark:text-amber-300" style="font-size:14px">{{ b.number }}</span>
              </a>
            </div>
          </div>
        </template>
      </div>

      <!-- 桌機版：左右雙欄佈局（各自獨立捲動） -->
      <div class="hidden lg:flex max-w-6xl mx-auto px-6 gap-5 desktop-panel">

        <!-- 左欄：可捲動篩選面板 -->
        <aside class="w-56 xl:w-64 flex-shrink-0 overflow-y-auto sidebar-scroll flex flex-col gap-3 py-4">

          <!-- 外線代表號 -->
          <template v-if="currentOrgData?.mainLines?.length">
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 px-3 py-3 shadow-sm flex-shrink-0">
              <p class="font-semibold text-blue-800 dark:text-blue-300 mb-2" style="font-size:12px">外線代表號</p>
              <div class="flex flex-col gap-1.5">
                <a v-for="line in currentOrgData.mainLines" :key="line.label" :href="`tel:${line.number}`"
                   class="flex items-center justify-between px-2.5 py-1.5 bg-surface border border-blue-200 dark:border-blue-700 rounded-xl hover:bg-blue-50 transition-colors">
                  <span class="text-hint-c" style="font-size:12px">{{ line.label }}</span>
                  <span class="font-bold text-blue-700 dark:text-blue-300" style="font-size:13px">{{ line.number }}</span>
                </a>
              </div>
            </div>
          </template>

          <!-- 快速撥號 -->
          <template v-if="currentOrgData?.broadcast?.length">
            <div class="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 px-3 py-3 shadow-sm flex-shrink-0">
              <p class="font-semibold text-amber-800 dark:text-amber-300 mb-2" style="font-size:12px">快速撥號</p>
              <div class="flex flex-col gap-1.5">
                <a v-for="b in currentOrgData.broadcast" :key="b.label" :href="`tel:${b.number}`"
                   class="flex items-center justify-between px-2.5 py-1.5 bg-surface border border-amber-200 dark:border-amber-700 rounded-xl hover:bg-amber-50 transition-colors">
                  <span class="text-hint-c" style="font-size:12px">{{ b.label }}</span>
                  <span class="font-bold text-amber-700 dark:text-amber-300" style="font-size:13px">{{ b.number }}</span>
                </a>
              </div>
            </div>
          </template>

          <!-- 部門篩選 -->
          <div class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden flex-shrink-0">
            <div class="px-3 py-2 border-b border-light-c">
              <p class="font-semibold text-hint-c" style="font-size:12px">部門篩選</p>
            </div>
            <div class="py-1">
              <button
                class="w-full text-left px-3 py-1.5 transition-colors"
                :class="activeDept === null
 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
 : 'text-muted-c hover:bg-surface2'"
                style="font-size:13px"
                @click="activeDept = null"
              >全部部門</button>
              <button
                v-for="dept in currentDepts" :key="dept.name"
                class="w-full text-left px-3 py-1.5 transition-colors truncate"
                :class="activeDept === dept.name
 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
 : 'text-muted-c hover:bg-surface2'"
                style="font-size:13px"
                @click="activeDept = dept.name"
              >{{ dept.name }}</button>
            </div>
          </div>
        </aside>

        <!-- 右欄：分機卡片（可捲動，兩欄 grid） -->
        <main class="flex-1 min-w-0 overflow-y-auto sidebar-scroll py-4">
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div
              v-for="dept in filteredDepts" :key="dept.name"
              class="bg-surface rounded-2xl border border-light-c shadow-sm overflow-hidden"
            >
              <div class="flex items-center gap-2 px-4 py-2.5 bg-surface2 border-b border-light-c">
                <span class="font-semibold text-base-c" style="font-size:14px">{{ dept.name }}</span>
                <span class="ml-auto text-hint-c dark:text-hint-c" style="font-size:12px">{{ dept.entries.length }} 支</span>
              </div>
              <div class="divide-y divide-base">
                <div v-for="(entry, idx) in dept.entries" :key="idx"
                     class="flex items-center justify-between px-4 py-2 hover:bg-surface2 transition-colors">
                  <span class="text-muted-c" style="font-size:14px">{{ entry.name || '—' }}</span>
                  <a :href="`tel:${entry.ext}`" class="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-mono font-semibold hover:text-blue-900 transition-colors" style="font-size:14px">
                    <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>
                    {{ entry.ext }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>

      </div>
    </template>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'staff', requiredPermission: 'staff.phone-directory' })

import { ref, computed } from 'vue'

// ── 機構清單 ──────────────────────────────────────────────────────
const orgs = [
  { id: 'farm', name: '健康農莊' },
  { id: 'hospital', name: '聖母醫院' },
  { id: 'external', name: '外部廠商' },
]

const activeOrg = ref('farm')
const activeDept = ref(null)
const searchQuery = ref('')

// ── 農莊資料 ──────────────────────────────────────────────────────
const farmData = {
  mainLines: [
    { label: '農莊代表號', number: '381382' },
    { label: '農莊傳真', number: '381303' },
    { label: '綜長代表號', number: '219022' },
    { label: '綜長/居護傳真', number: '381505' },
    { label: '樂智代表號', number: '219021' },
    { label: '樂智傳真', number: '381033' },
    { label: '消防專線', number: '380017' },
    { label: '高齡代表號', number: '381581' },
    { label: '高齡傳真', number: '381081' },
    { label: '東職代表號', number: '380232' },
    { label: '東職傳真', number: '380065' },
    { label: '法人代表號', number: '381038' },
    { label: '人事財務室傳真', number: '349908' },
    { label: '物流傳真', number: '381321' },
    { label: '管理室傳真', number: '380932' },
  ],
  broadcast: [
    { label: '話機廣播', number: '999' },
  ],
  depts: [
    {
      name: '綜長/居護辦公室',
      entries: [
        { name: '', ext: '601' },
        { name: '', ext: '610' },
        { name: '', ext: '611' },
        { name: '古麗梅', ext: '612' },
        { name: '', ext: '613' },
        { name: '', ext: '614' },
        { name: '吳秋美', ext: '616' },
        { name: '謝亞妘', ext: '617' },
        { name: '羅洺裕', ext: '618' },
        { name: '', ext: '619' },
        { name: '梁玄諺', ext: '620' },
        { name: '楊玉如', ext: '621' },
        { name: '蔣鐘悅湄', ext: '622' },
        { name: '王美蓮', ext: '623' },
        { name: '伍澤慎剛', ext: '624' },
        { name: '', ext: '625' },
        { name: '', ext: '626' },
        { name: '', ext: '627' },
        { name: '', ext: '628' },
        { name: '', ext: '631' },
        { name: '', ext: '632' },
        { name: '', ext: '633' },
        { name: '陳琬絹', ext: '634' },
      ]
    },
    {
      name: '高齡服務培訓中心',
      entries: [
        { name: '胡劉錦美', ext: '101' },
        { name: '葉佳萍', ext: '102' },
        { name: '吳安琪', ext: '103' },
        { name: '盧靜惠', ext: '105' },
        { name: '林茜莉', ext: '106' },
        { name: '蔣恩惠', ext: '107' },
        { name: '休息室', ext: '130' },
        { name: '配膳室', ext: '131' },
      ]
    },
    {
      name: '執行長辦公室',
      entries: [
        { name: '陳良媛', ext: '666' },
      ]
    },
    {
      name: '公關室',
      entries: [
        { name: '藍世昌', ext: '303' },
      ]
    },
    {
      name: '人事財務室',
      entries: [
        { name: '胡敏麗', ext: '124' },
        { name: '許純菁', ext: '125' },
        { name: '蔡明玲', ext: '126' },
        { name: '高儀玫', ext: '127' },
        { name: '黃展翼', ext: '128' },
      ]
    },
    {
      name: '園區管理中心',
      entries: [
        { name: '戴盈慈', ext: '701' },
        { name: '蕭詩涵', ext: '702' },
        { name: '祝世全', ext: '703' },
        { name: '王志弘', ext: '867' },
        { name: '', ext: '868' },
        { name: '', ext: '869' },
        { name: '賈德蘭', ext: '888' },
      ]
    },
    {
      name: '大門警衛室',
      entries: [
        { name: '守衛室', ext: '700' },
      ]
    },
    {
      name: '園區工務組',
      entries: [
        { name: '侯寶捷', ext: '704' },
      ]
    },
    {
      name: '輔具中心',
      entries: [
        { name: '溫仁志', ext: '160' },
      ]
    },
    {
      name: '健康餐飲組',
      entries: [
        { name: '田園餐廳櫃台', ext: '889' },
        { name: '廚房配膳區', ext: '830' },
        { name: '廚房備菜區', ext: '831' },
        { name: '烘焙教學區', ext: '840' },
        { name: '烘焙生產區', ext: '841' },
      ]
    },
    {
      name: '健康廚房',
      entries: [
        { name: '休息室', ext: '130' },
        { name: '配膳室', ext: '131' },
      ]
    },
    {
      name: '休憩小舖',
      entries: [
        { name: '休憩小舖', ext: '850' },
      ]
    },
    {
      name: '應用發展組',
      entries: [
        { name: '曾憲民', ext: '191' },
        { name: '廖峰熙', ext: '192' },
        { name: '陳建宏', ext: '193' },
        { name: '花無缺', ext: '194' },
        { name: '楊宗豪', ext: '195' },
        { name: '會議室', ext: '197' },
        { name: '會談室', ext: '198' },
        { name: '資訊機房', ext: '190' },
        { name: '備援機房', ext: '199' },
      ]
    },
    {
      name: '資訊綜合組',
      entries: [
        { name: '', ext: '167' },
        { name: '', ext: '168' },
        { name: '', ext: '169' },
      ]
    },
    {
      name: '樂智家園',
      entries: [
        { name: '古芳玄', ext: '200' },
        { name: '陳麗婷', ext: '201' },
        { name: '', ext: '202' },
        { name: '', ext: '203' },
        { name: '', ext: '204' },
        { name: '劉旭傑', ext: '205' },
      ]
    },
    {
      name: '小規模多機能',
      entries: [
        { name: '樂智代表號', ext: '219021' },
      ]
    },
    {
      name: '香藥草教育組',
      entries: [
        { name: '教材室', ext: '856' },
        { name: '王云', ext: '856' },
      ]
    },
    {
      name: '使命發展組',
      entries: [
        { name: '阮修女', ext: '304' },
        { name: '鄭惠金', ext: '305' },
      ]
    },
    {
      name: '企劃發展室（快樂運動館）',
      entries: [
        { name: '王志弘主任', ext: '170' },
        { name: '前台', ext: '171' },
        { name: '黃秋珍', ext: '172' },
        { name: '鄭如君', ext: '173' },
        { name: '評估室', ext: '174' },
        { name: '', ext: '175' },
        { name: '樂舒能教室', ext: '176' },
      ]
    },
    {
      name: '團體家屋',
      entries: [
        { name: '團屋辦公室', ext: '206' },
        { name: '', ext: '207' },
        { name: '智在住宿區', ext: '208' },
        { name: '樂活住宿區', ext: '209' },
      ]
    },
    {
      name: '樂智健康活力站',
      entries: [
        { name: '胡冠儀', ext: '210' },
        { name: '陳詩涵', ext: '211' },
        { name: '簡志龍', ext: '212' },
        { name: '張佳寧', ext: '213' },
        { name: '周詩韻', ext: '214' },
      ]
    },
    {
      name: '東區職業訓練中心',
      entries: [
        { name: '王榮貴', ext: '902' },
        { name: '林偉良', ext: '903' },
        { name: '葉惠美', ext: '904' },
        { name: '溫鳳美', ext: '905' },
        { name: '汪采霖', ext: '906' },
        { name: '', ext: '901' },
      ]
    },
    {
      name: '服務中心',
      entries: [
        { name: '吳宣澔', ext: '866' },
        { name: '賈德蘭', ext: '867' },
        { name: '王頌恩', ext: '868' },
        { name: '羅晚惠', ext: '869' },
      ]
    },
    {
      name: '物流中心',
      entries: [
        { name: '吳秋月', ext: '180' },
        { name: '林龍宥華', ext: '181' },
      ]
    },
  ]
}

// ── 醫院資料 ──────────────────────────────────────────────────────
const hospitalData = {
  mainLines: [],
  broadcast: [
    { label: '語音留言', number: '555' },
    { label: '全院廣播', number: '777' },
    { label: '話機廣播', number: '999' },
  ],
  depts: [
    {
      name: '院長室',
      entries: [
        { name: '羅彥宇院長', ext: '007' },
        { name: '彭衍翰專員', ext: '274' },
      ]
    },
    {
      name: '人事財務室',
      entries: [
        { name: '蔡明玲主任', ext: '126' },
        { name: '高儀玫', ext: '127' },
        { name: '黃展翼', ext: '128' },
        { name: '許純菁', ext: '133' },
        { name: '李幸娟', ext: '129' },
        { name: '胡敏麗', ext: '302' },
      ]
    },
    {
      name: '公關室',
      entries: [
        { name: '藍世昌主任', ext: '318' },
        { name: '蕭雯玲', ext: '168' },
      ]
    },
    {
      name: '總務室',
      entries: [
        { name: '勒卡爾‧夷丈‧撒里朋主任', ext: '214' },
      ]
    },
    {
      name: '庶務組',
      entries: [
        { name: '楊國忠', ext: '159' },
        { name: '服務台', ext: '152,156' },
        { name: '環衛組', ext: '162' },
      ]
    },
    {
      name: '工務組',
      entries: [
        { name: '工務室', ext: '135' },
        { name: '高壓氧氣瓶室', ext: '163' },
      ]
    },
    {
      name: '研發組',
      entries: [
        { name: '林大仁', ext: '145' },
      ]
    },
    {
      name: '醫管室',
      entries: [
        { name: '高振勝主任', ext: '201' },
        { name: '游毓平', ext: '147' },
      ]
    },
    {
      name: '醫事組',
      entries: [
        { name: '陳葦芸', ext: '298' },
        { name: '廖惠如', ext: '120' },
        { name: '批價處', ext: '100' },
        { name: '掛號櫃台', ext: '101,108' },
        { name: '病歷室', ext: '121' },
        { name: '病歷室（地下室）', ext: '283' },
      ]
    },
    {
      name: '護理室',
      entries: [
        { name: '蕭燕菁主任', ext: '112' },
        { name: '鍾悅湄', ext: '329' },
        { name: '林婉萍', ext: '311' },
        { name: '陳琬琪', ext: '629' },
        { name: '蘇詩涵', ext: '220' },
        { name: '志工室', ext: '149' },
      ]
    },
    {
      name: '居護辦公室',
      entries: [
        { name: '馬秀金', ext: '150' },
        { name: '蔡佳恩', ext: '630' },
        { name: '陳墨如', ext: '125' },
        { name: '王秀英', ext: '615' },
        { name: '王紫萱', ext: '136' },
        { name: '陳惠雯', ext: '635' },
        { name: '王怡雲', ext: '363' },
        { name: '古小燕', ext: '366' },
        { name: '林鳳婷', ext: '369' },
      ]
    },
    {
      name: '門診組',
      entries: [
        { name: '營養衛教室', ext: '109' },
        { name: '糖尿衛教中心', ext: '157,158' },
        { name: '診療室', ext: '169' },
      ]
    },
    {
      name: '住院組',
      entries: [
        { name: '護理站', ext: '300' },
        { name: '供應室', ext: '217' },
        { name: '感控室', ext: '222' },
      ]
    },
    {
      name: '醫技組',
      entries: [
        { name: '檢驗科', ext: '115' },
        { name: '放射科', ext: '114,116' },
        { name: '中醫調劑室', ext: '386' },
        { name: '藥庫', ext: '113' },
        { name: '藥局', ext: '102' },
        { name: 'BMRI車', ext: '350' },
        { name: '復健中心', ext: '122,148' },
      ]
    },
    {
      name: '二樓-醫師辦公室',
      entries: [
        { name: '蔡恩霖', ext: '224' },
      ]
    },
    {
      name: '二樓-感控室',
      entries: [
        { name: '邱武秋香', ext: '222' },
      ]
    },
    {
      name: '二樓-督導辦公室',
      entries: [
        { name: '陳墨如', ext: '125' },
        { name: '王紫萱', ext: '136' },
        { name: '馬秀金', ext: '150' },
        { name: '王怡雲', ext: '363' },
        { name: '古小燕', ext: '366' },
        { name: '林鳳婷', ext: '369' },
        { name: '門診辦公室', ext: '273' },
        { name: '門診辦公室', ext: '275' },
        { name: '門診辦公室', ext: '276' },
        { name: '周懿徽', ext: '278' },
      ]
    },
    {
      name: '二樓-資訊室',
      entries: [
        { name: '陳奕誠', ext: '202' },
        { name: '陳達霖', ext: '203' },
        { name: '張祐銘', ext: '204' },
        { name: '曾憲民', ext: '205' },
        { name: '維修台', ext: '206' },
        { name: '資訊機房', ext: '210' },
      ]
    },
    {
      name: '二樓-醫事行政室',
      entries: [
        { name: '彭衍翰', ext: '274' },
        { name: '游毓平', ext: '279' },
        { name: '林佩君', ext: '280' },
        { name: '柯德雄', ext: '277' },
      ]
    },
    {
      name: '二樓-院史館',
      entries: [
        { name: '黃碧珍', ext: '123' },
        { name: '門診辦公室', ext: '165' },
        { name: '門診辦公室', ext: '167' },
        { name: '楊柔恩', ext: '270' },
        { name: '陳柔安', ext: '271' },
        { name: '', ext: '272' },
      ]
    },
    {
      name: '二樓-供應室',
      entries: [
        { name: '', ext: '217' },
      ]
    },
    {
      name: '二樓-護理辦公室',
      entries: [
        { name: '蕭燕菁', ext: '112' },
        { name: '蘇詩涵', ext: '220' },
        { name: '林婉萍', ext: '311' },
        { name: '蔣鐘悅湄', ext: '329' },
        { name: '陳琬琪', ext: '629' },
      ]
    },
    {
      name: '三樓-病房',
      entries: [
        { name: '護理站', ext: '300' },
        { name: '三樓大禮堂', ext: '317' },
        { name: '三樓多功能教室', ext: '325' },
        { name: '三樓無線子母機', ext: '326' },
        { name: '三樓病房討論室', ext: '328' },
      ]
    },
    {
      name: '四樓-辦公室',
      entries: [
        { name: '蔡明玲', ext: '126' },
        { name: '高儀玫', ext: '127' },
        { name: '黃展翼', ext: '128' },
        { name: '許純菁', ext: '133' },
        { name: '胡敏麗', ext: '302' },
      ]
    },
    {
      name: '四樓-辦公區',
      entries: [
        { name: '陳昭雯', ext: '134' },
        { name: '楊國忠', ext: '159' },
        { name: '護理室', ext: '177' },
        { name: '蔡佳珊', ext: '185' },
        { name: '使命發展', ext: '241' },
        { name: '藍世昌', ext: '318' },
      ]
    },
    {
      name: '四樓-會議室',
      entries: [
        { name: '四樓會議室', ext: '321' },
      ]
    },
    {
      name: '一樓-病歷室',
      entries: [
        { name: '病歷室', ext: '121' },
      ]
    },
    {
      name: '一樓-檢驗科',
      entries: [
        { name: '張敏鈺', ext: '115' },
      ]
    },
    {
      name: '一樓-放射科',
      entries: [
        { name: '吳修賢', ext: '114' },
        { name: '王金龍', ext: '116' },
      ]
    },
    {
      name: '一樓-中醫調劑室',
      entries: [
        { name: '中醫調劑室', ext: '386' },
      ]
    },
    {
      name: '一樓-認知功能檢查室',
      entries: [
        { name: '李育琰', ext: '104' },
      ]
    },
    {
      name: '一樓-營養組',
      entries: [
        { name: '營養衛教室', ext: '109' },
      ]
    },
    {
      name: '一樓-糖尿衛教',
      entries: [
        { name: '蘇麗芳', ext: '157' },
        { name: '顏慧儀', ext: '158' },
      ]
    },
    {
      name: '一樓-醫事組',
      entries: [
        { name: '批價處', ext: '100' },
        { name: '曾淑玲', ext: '106' },
        { name: '廖惠如', ext: '120' },
        { name: '劉書念', ext: '298' },
        { name: '掛號櫃台', ext: '101,108' },
        { name: '服務台', ext: '152,156' },
      ]
    },
    {
      name: '一樓-公開處',
      entries: [
        { name: '蕭雯玲', ext: '168' },
      ]
    },
    {
      name: '一樓-藥局',
      entries: [
        { name: '余惠玲', ext: '102' },
      ]
    },
    {
      name: '一樓-藥庫',
      entries: [
        { name: '陳竹君', ext: '113' },
      ]
    },
    {
      name: '一樓-超音波室',
      entries: [
        { name: '', ext: '131' },
        { name: '林怡節', ext: '146' },
      ]
    },
    {
      name: '一樓-招待室',
      entries: [
        { name: '鐘光美', ext: '132' },
      ]
    },
    {
      name: '一樓-神經生理檢查室',
      entries: [
        { name: '謝方婷', ext: '118' },
      ]
    },
    {
      name: '一樓-門診組',
      entries: [
        { name: '復健科', ext: '103' },
        { name: '腸胃科', ext: '107' },
        { name: '家醫科', ext: '117' },
        { name: '疼痛科', ext: '166' },
        { name: '診療室', ext: '169' },
        { name: '乳症科', ext: '130155' },
        { name: '神經內科', ext: '151,153' },
      ]
    },
    {
      name: '醫療診間',
      entries: [
        { name: '腸胃科', ext: '107' },
        { name: '復健科', ext: '103' },
        { name: '家醫科', ext: '117' },
        { name: '乳症科', ext: '130,155' },
        { name: '神經內科', ext: '166' },
        { name: '中醫科', ext: '151,153' },
        { name: '柯醫師辦公室', ext: '224' },
        { name: '視訊診療室', ext: '277' },
        { name: '家醫科(疼痛門診)', ext: '166' },
      ]
    },
    {
      name: '會議/教室',
      entries: [
        { name: '三樓大禮堂', ext: '317' },
        { name: '三樓多功能教室', ext: '325' },
        { name: '三樓病房討論室', ext: '328' },
        { name: '三樓無線子母機', ext: '326' },
        { name: '四樓會議室', ext: '321' },
      ]
    },
    {
      name: '健康會館',
      entries: [
        { name: '櫃台', ext: '360' },
        { name: '廚房', ext: '361' },
        { name: '店長', ext: '362' },
        { name: '備援機房', ext: '380' },
        { name: '2F會議室', ext: '381' },
      ]
    },
    {
      name: '招待所',
      entries: [
        { name: '招待所客廳', ext: '139' },
        { name: '招待所二樓', ext: '142' },
        { name: '吳秀珍', ext: '239' },
      ]
    },
    {
      name: '廚房',
      entries: [
        { name: '廚房倉庫', ext: '137' },
        { name: '員工餐廳', ext: '138' },
        { name: '配膳區', ext: '143' },
        { name: '處理區', ext: '144' },
      ]
    },
    {
      name: '地下室-復健中心',
      entries: [
        { name: '邱瓊慧', ext: '122' },
        { name: '陳靜宜', ext: '148' },
      ]
    },
    {
      name: '地下室-資材',
      entries: [
        { name: '李幸娟', ext: '129' },
      ]
    },
    {
      name: '地下室-病歷室',
      entries: [
        { name: '病歷室', ext: '283' },
      ]
    },
    {
      name: '共享中心-資訊室',
      entries: [
        { name: '曾憲民主任', ext: '205' },
        { name: '陳奕誠', ext: '202' },
        { name: '王文明', ext: '203' },
        { name: '陳建宏', ext: '204' },
        { name: '資訊機房', ext: '210' },
        { name: '維修台', ext: '206' },
      ]
    },
    {
      name: '院史館',
      entries: [
        { name: '乳腺辦公室', ext: '165' },
        { name: '乳腺辦公室', ext: '167' },
        { name: '體檢專線', ext: '123' },
        { name: '', ext: '272' },
        { name: '黃燿民', ext: '273' },
        { name: '', ext: '275' },
        { name: '謝方婷', ext: '276' },
      ]
    },
    {
      name: '營養師',
      entries: [
        { name: '陳柔安', ext: '271' },
        { name: '陳麗如', ext: '270' },
        { name: '楊柔恩', ext: '270' },
      ]
    },
    {
      name: '日照中心',
      entries: [
        { name: '邱李珈昕', ext: '200' },
        { name: '李嵗綸', ext: '207' },
      ]
    },
    {
      name: '失智照護中心',
      entries: [
        { name: '羅醫師', ext: '166' },
        { name: '李育琰', ext: '104' },
        { name: '認知功能檢查室', ext: '104' },
      ]
    },
    {
      name: '乳腺中心',
      entries: [
        { name: '乳腺接待室', ext: '132' },
        { name: '超音波室', ext: '131' },
        { name: '超音波室', ext: '146' },
      ]
    },
    {
      name: '使命發展組',
      entries: [
        { name: '謝修女', ext: '241' },
      ]
    },
    {
      name: '二樓-日照中心',
      entries: [
        { name: '邱李珈昕', ext: '200' },
        { name: '李嵗綸', ext: '207' },
      ]
    },
  ]
}

// ── 外部廠商資料 ──────────────────────────────────────────────────
const externalData = {
  mainLines: [],
  broadcast: [],
  depts: [
    {
      name: '物流廠商',
      entries: [
        { name: '黑貓宅配司機', ext: '0975-610822' },
        { name: '黑貓宅配營業所', ext: '089-352622' },
        { name: '新竹物流司機', ext: '0975-183267' },
      ]
    },
    {
      name: '合作廠商',
      entries: [
        { name: '鯨躍科技 何小姐', ext: '02-28928168#206' },
        { name: '會館店長', ext: '089-345719' },
        { name: '芳心 莉媛', ext: '089-330958' },
        { name: '衣東洗衣店 張小姐', ext: '0979-176666' },
        { name: '聖心 胡小姐', ext: '853161' },
        { name: '聖心 胡小姐(行動)', ext: '0922-256627' },
      ]
    },
  ]
}

const dataMap = {
  farm: farmData,
  hospital: hospitalData,
  external: externalData,
}

// ── 計算屬性 ──────────────────────────────────────────────────────
const currentOrgData = computed(() => dataMap[activeOrg.value])
const currentDepts = computed(() => currentOrgData.value?.depts || [])

const filteredDepts = computed(() => {
  if (!activeDept.value) return currentDepts.value
  return currentDepts.value.filter(d => d.name === activeDept.value)
})

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const results = []
  for (const [orgId, orgData] of Object.entries(dataMap)) {
    const orgName = orgs.find(o => o.id === orgId)?.name || orgId
    for (const dept of orgData.depts) {
      for (const entry of dept.entries) {
        if (
          entry.name?.toLowerCase().includes(q) ||
          entry.ext?.toString().includes(q)
        ) {
          results.push({ ...entry, _dept: dept.name, _org: orgName, _key: `${orgId}-${dept.name}-${entry.ext}` })
        }
      }
    }
    // 也搜外線
    for (const line of orgData.mainLines || []) {
      if (line.label?.toLowerCase().includes(q) || line.number?.includes(q)) {
        results.push({ name: line.label, ext: line.number, _dept: '外線代表號', _org: orgName, _key: `${orgId}-main-${line.number}` })
      }
    }
  }
  return results
})
</script>

<style scoped>
.tab-scroll {
  scrollbar-width: none;
}
.tab-scroll::-webkit-scrollbar {
  display: none;
}
.tab-btn {
  -webkit-tap-highlight-color: transparent;
}
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: #d6d3d1 transparent;
}
.dark .sidebar-scroll {
  scrollbar-color: #52525b transparent;
}
.sidebar-scroll::-webkit-scrollbar {
  width: 4px;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background-color: #d6d3d1;
  border-radius: 9999px;
}
.dark .sidebar-scroll::-webkit-scrollbar-thumb {
  background-color: #52525b;
}
/* 桌機版雙欄容器：撐滿視窗扣掉上方兩個 sticky bar（AdminNavbar 56px + 頁面 Header 49px） */
.desktop-panel {
  height: calc(100vh - 56px - 49px);
}
</style>
