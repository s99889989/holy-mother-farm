<template>
  <div class="calendar-page">

    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h2 class="cal-title mb-0">2026年{{ currentMonth }}月</h2>
      <div class="btn-group">
        <button
          v-for="m in [4, 5]"
          :key="m"
          class="btn btn-sm"
          :class="currentMonth === m ? 'btn-dark' : 'btn-outline-secondary'"
          @click="currentMonth = m"
        >{{ m }}月</button>
      </div>
    </div>

    <!-- Legend -->
    <div class="d-flex flex-wrap mb-3" style="gap:12px">
      <div v-for="item in legend" :key="item.c" class="d-flex align-items-center" style="gap:5px;font-size:12px;color:#666">
        <span class="legend-dot" :style="{background: item.color}"></span>
        {{ item.label }}
      </div>
    </div>

    <!-- Weekday headers -->
    <div class="cal-weekdays">
      <div v-for="d in weekdays" :key="d.label" class="weekday-cell" :class="d.cls">{{ d.label }}</div>
    </div>

    <!-- Calendar grid -->
    <div class="cal-grid">
      <div v-for="(cell, i) in calCells" :key="i"
        class="cal-cell"
        :class="{
          'cal-cell--empty': !cell.day,
          'cal-cell--sun': cell.isSun,
          'cal-cell--sat': cell.isSat,
          'cal-cell--today': cell.isToday,
          'cal-cell--has-events': cell.events && cell.events.length > 0
        }"
        @click="cell.events && cell.events.length > 0 && openModal(cell)"
      >
        <template v-if="cell.day">
          <div class="cell-date">{{ cell.day }}</div>
          <div
            v-for="(ev, ei) in cell.events.slice(0, MAX_SHOW)"
            :key="ei"
            class="ev-chip"
            :class="'ev-' + ev.c"
            :title="ev.t + ' ' + ev.n + ' ' + ev.p"
          >{{ ev.n }}</div>
          <div v-if="cell.events.length > MAX_SHOW" class="ev-more" @click.stop="openModal(cell)">
            +{{ cell.events.length - MAX_SHOW }} 更多
          </div>
        </template>
      </div>
    </div>

    <!-- Notes -->
    <div class="note-bar mt-3">
      <div class="note-label">備註</div>
      <p v-for="(n, i) in monthData.notes" :key="i">{{ n }}</p>
    </div>

    <!-- Modal -->
    <div v-if="modalCell" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header-row">
          <div class="modal-date">2026年{{ currentMonth }}月{{ modalCell.day }}日</div>
          <button class="modal-close-btn" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body-scroll">
          <div v-for="(ev, i) in modalCell.events" :key="i" class="modal-ev-row">
            <div class="modal-ev-time">{{ ev.t }}</div>
            <div class="modal-ev-name">{{ ev.n }}</div>
            <div class="modal-ev-meta">{{ ev.p }}<span v-if="ev.loc"> ・ {{ ev.loc }}</span></div>
            <span class="modal-ev-tag" :class="'ev-' + ev.c">{{ labels[ev.c] }}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-outline-secondary w-100 mt-3" @click="closeModal">關閉</button>
      </div>
    </div>

  </div>
</template>

<script>
const CALENDAR_DATA = {
  4: {
    notes: [
      '(2026-04-03 14:00)　請配合消毒公告須知事項。',
      '(2026-04-18 08:00)　於小舖平台用午餐，請備廚餘桶，感謝！'
    ],
    days: {
      1: [
        { t: '08:00-10:00', n: '新進人員報到', p: '高儀玟', loc: 'H0A10404 四樓會議室', c: 'hospital' },
        { t: '10:00-17:00', n: '慈濟大學參訪', p: '賈德蘭', loc: 'P0A30102 簡報室', c: 'park' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      2: [{ t: '07:00-07:00', n: '原訂醫院4月2日早上..', p: '侯寶捷', loc: '', c: 'hospital' }],
      3: [{ t: '14:00-16:30', n: '園區第一季環境消毒除..', p: '蕭詩涵', loc: '', c: 'park' }],
      5: [{ t: '08:30-16:30', n: '室配丙級檢定收費課程..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }],
      6: [{ t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }],
      8: [
        { t: '08:00-18:00', n: '會計師年度審查', p: '高儀玟', loc: 'H0A10404 四樓會議室', c: 'meeting' },
        { t: '09:00-12:00', n: '居督會議', p: '蕭燕菁', loc: 'H0A10301 三樓大禮堂', c: 'meeting' },
        { t: '12:30-13:30', n: '抗生素相關課程', p: '陳竹君', loc: 'H0A10404 四樓會議室', c: 'hospital' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      9: [
        { t: '08:00-18:00', n: '會計師年度審查', p: '高儀玟', loc: 'H0A10404 四樓會議室', c: 'meeting' },
        { t: '08:30-17:00', n: '丙級自來水配管課程..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }
      ],
      10: [{ t: '08:00-18:00', n: '會計師年度審查', p: '高儀玟', loc: 'H0A10404 四樓會議室', c: 'meeting' }],
      11: [
        { t: '08:30-16:30', n: '丙級室內配線課程..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '08:30-16:30', n: '烘焙丙級證照班收費課..', p: '王榮貴', loc: 'P0G20201 雨田大樓二樓烘培教室', c: 'training' }
      ],
      12: [{ t: '08:30-16:30', n: '室配丙級檢定收費課程..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }],
      13: [
        { t: '08:00-12:00', n: '監理站簽約', p: '賈德蘭', loc: 'P0A30102 簡報室', c: 'park' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      14: [
        { t: '08:00-12:00', n: '東職', p: '賈德蘭', loc: 'P0A30102 簡報室', c: 'park' },
        { t: '14:00-15:00', n: '115年緊急災害應變..', p: '勒卡爾.夷丈.撒里朋岸', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      15: [{ t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }],
      16: [{ t: '12:30-13:30', n: '門診會議', p: '林怡節', loc: 'H0A10404 四樓會議室', c: 'meeting' }],
      17: [
        { t: '08:00-12:00', n: '居家護理所團督', p: '林茜莉', loc: 'P0A30104 接待室', c: 'park' },
        { t: '09:00-17:00', n: '地板滾球訓練社團..', p: '鄭如君', loc: 'P0J10101 快樂競技館', c: 'park' },
        { t: '14:00-15:00', n: '115年緊急災害應變..', p: '勒卡爾.夷丈.撒里朋岸', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      18: [
        { t: '08:00-17:00', n: '樂齡地板滾球運動指導..', p: '鄭如君', loc: 'P0E1B101 B1大禮堂', c: 'park' },
        { t: '08:30-16:30', n: '愛的陪伴-安寧照護工..', p: '陳妙玲', loc: 'F0A20101 陽光教室', c: 'other' },
        { t: '08:30-16:30', n: '烘焙丙級證照班收費課..', p: '王榮貴', loc: 'P0G20201 雨田大樓二樓烘培教室', c: 'training' },
        { t: '08:30-17:00', n: '簡易家庭水電收費課程..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }
      ],
      19: [
        { t: '08:00-17:00', n: '樂齡地板滾球運動指導..', p: '鄭如君', loc: 'P0E1B101 B1大禮堂', c: 'park' },
        { t: '08:30-16:30', n: '丙級室內配線收費課程..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }
      ],
      20: [
        { t: '08:00-17:30', n: '即測即評考試報名..', p: '蔣鍾悅湄', loc: 'P0D20201 多功能大教室', c: 'park' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      21: [
        { t: '08:00-17:00', n: '長照會議', p: '蕭燕菁', loc: 'H0A10301 三樓大禮堂', c: 'meeting' },
        { t: '08:00-17:30', n: '即測即評考試報名..', p: '蔣鍾悅湄', loc: 'P0D20201 多功能大教室', c: 'park' },
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '08:00-12:00', n: '東職', p: '賈德蘭', loc: 'P0A30102 簡報室', c: 'park' },
        { t: '12:00-14:00', n: '醫事行政室會議', p: '曾淑玲', loc: 'H0A10404 四樓會議室', c: 'meeting' },
        { t: '13:30-17:30', n: '提供參與香草園協作坊..', p: '胡劉錦美', loc: 'P0A30102 簡報室', c: 'park' }
      ],
      22: [
        { t: '08:00-12:00', n: '即測即評考試報名..', p: '蔣鍾悅湄', loc: 'P0D20201 多功能大教室', c: 'park' },
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '13:30-17:30', n: '115年上半年度D區..', p: '王云', loc: 'P0D20201 多功能大教室', c: 'park' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      23: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '13:30-17:30', n: '115年上半年度自衛..', p: '王云', loc: 'P0D20201 多功能大教室', c: 'park' }
      ],
      24: [{ t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }],
      25: [
        { t: '08:00-17:00', n: '居服員課程+會議', p: '李依璇', loc: 'P0E1B101 B1大禮堂', c: 'park' },
        { t: '08:30-16:30', n: '烘焙丙級證照班收費課..', p: '王榮貴', loc: 'P0G20201 雨田大樓二樓烘培教室', c: 'training' },
        { t: '08:30-17:00', n: '簡易家庭水電收費課程..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }
      ],
      27: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      28: [
        { t: '08:00-12:00', n: '勞資會議', p: '蔡明玲', loc: 'H0A10404 四樓會議室', c: 'meeting' },
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '13:00-13:30', n: '召開115年第一次轉..', p: '廖惠如', loc: 'H0A10404 四樓會議室', c: 'hospital' }
      ],
      29: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '15:00-17:30', n: '健保局CCM計畫輔導..', p: '游毓平', loc: 'H0A10404 四樓會議室', c: 'hospital' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ]
    },
    startDay: 3, totalDays: 30, today: 18
  },
  5: {
    notes: [
      '(2026-05-16 08:00)　考官休息室、監一到監七教室 請備垃圾桶及廚餘桶',
      '(2026-05-29 09:00)　人數300，中午於活動中心用餐(便當)需於周邊準備廚餘回收區域；需於前一天貼製場地，要麻煩05/27協助清洗球場'
    ],
    days: {
      1: [{ t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }],
      2: [{ t: '08:30-16:30', n: '烘焙丙級證照班收費課..', p: '王榮貴', loc: 'P0G20201 雨田大樓二樓烘培教室', c: 'training' }],
      4: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      5: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '12:30-14:00', n: '5月員工大會暨三合一..', p: '彭衍翰', loc: 'H0A10301 三樓大禮堂', c: 'meeting' },
        { t: '12:30-13:00', n: '英飛特PACS操作使..', p: '王金龍', loc: 'H0A10404 四樓會議室', c: 'hospital' }
      ],
      6: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      7: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '12:30-13:30', n: '員工英文進修課', p: '彭衍翰', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      8: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '16:30-17:00', n: '英飛特PACS操作使..', p: '王金龍', loc: '', c: 'hospital' }
      ],
      9: [{ t: '08:30-16:30', n: '烘焙丙級證照班收費課..', p: '王榮貴', loc: 'P0G20201 雨田大樓二樓烘培教室', c: 'training' }],
      11: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      12: [{ t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }],
      13: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      14: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '08:00-17:30', n: '失智症20小時課程..', p: '黃碧珍', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      15: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '08:00-17:30', n: '失智症20小時課程..', p: '黃碧珍', loc: 'H0A10301 三樓大禮堂', c: 'hospital' },
        { t: '09:00-17:00', n: '地板滾球訓練社團..', p: '鄭如君', loc: 'P0J10101 快樂競技館', c: 'park' },
        { t: '12:30-13:30', n: '門診月會議', p: '高榮蓁', loc: 'H0A10404 四樓會議室', c: 'meeting' }
      ],
      16: [
        { t: '08:00-18:00', n: '115年照顧服務員術..', p: '蔣鍾悅湄', loc: 'P0D30201 照服員考場監一', c: 'training' },
        { t: '08:00-17:30', n: '失智症20小時課程..', p: '黃碧珍', loc: 'H0A10301 三樓大禮堂', c: 'hospital' },
        { t: '08:30-16:30', n: '烘焙丙級證照班收費課..', p: '王榮貴', loc: 'P0G20201 雨田大樓二樓烘培教室', c: 'training' }
      ],
      17: [
        { t: '08:00-12:00', n: '醫院115年上半年度..', p: '侯寶捷', loc: '', c: 'hospital' },
        { t: '08:00-18:00', n: '115年照顧服務員術..', p: '蔣鍾悅湄', loc: 'P0D30201 照服員考場監一', c: 'training' }
      ],
      18: [
        { t: '08:00-17:00', n: '個資暨資安檢查周..', p: '陳奕誠', loc: 'H0A10301 三樓大禮堂', c: 'hospital' },
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: '', c: 'hospital' }
      ],
      19: [
        { t: '08:00-17:00', n: '個資暨資安檢查周..', p: '陳奕誠', loc: 'H0A10301 三樓大禮堂', c: 'hospital' },
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '12:00-14:00', n: '醫事行政室會議', p: '曾淑玲', loc: 'H0A10404 四樓會議室', c: 'meeting' }
      ],
      20: [
        { t: '08:00-17:00', n: '個資暨資安檢查周..', p: '陳奕誠', loc: 'H0A10301 三樓大禮堂', c: 'hospital' },
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      21: [
        { t: '08:00-17:00', n: '個資暨資安檢查周..', p: '陳奕誠', loc: 'H0A10301 三樓大禮堂', c: 'hospital' },
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }
      ],
      22: [
        { t: '08:00-17:00', n: '個資暨資安檢查周..', p: '陳奕誠', loc: 'H0A10301 三樓大禮堂', c: 'hospital' },
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }
      ],
      23: [{ t: '08:00-17:00', n: '居服員課程+會議', p: '林茜莉', loc: 'P0E1B101 B1大禮堂', c: 'park' }],
      24: [{ t: '08:00-12:00', n: '園區115年上半年度..', p: '侯寶捷', loc: '', c: 'park' }],
      25: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      26: [{ t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }],
      27: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '17:30-19:00', n: '燃脂增肌班', p: '藍世昌', loc: 'H0A10301 三樓大禮堂', c: 'hospital' }
      ],
      28: [
        { t: '08:00-17:30', n: '衛生局長照科場地租借..', p: '楊國忠', loc: 'H0A10301 三樓大禮堂', c: 'hospital' },
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' }
      ],
      29: [
        { t: '08:00-17:00', n: '室內電路配線技術檢定..', p: '王榮貴', loc: 'P0I10201 水電實習廠', c: 'training' },
        { t: '09:00-15:00', n: '卑南鄉文健站樂齡地板..', p: '鄭如君', loc: 'P0C20102 活動中心', c: 'park' }
      ],
      30: [{ t: '08:30-16:30', n: '烘焙丙級證照班收費課..', p: '王榮貴', loc: 'P0G20201 雨田大樓二樓烘培教室', c: 'training' }]
    },
    startDay: 5, totalDays: 31, today: null
  }
}

export default {
  name: 'CalendarPage',
  data() {
    return {
      currentMonth: 4,
      modalCell: null,
      MAX_SHOW: 3,
      weekdays: [
        { label: '日', cls: 'text-danger' },
        { label: '一', cls: '' },
        { label: '二', cls: '' },
        { label: '三', cls: '' },
        { label: '四', cls: '' },
        { label: '五', cls: '' },
        { label: '六', cls: 'text-primary' }
      ],
      legend: [
        { c: 'hospital', label: '醫院', color: '#a05555' },
        { c: 'park',     label: '園區', color: '#527d60' },
        { c: 'training', label: '培訓課程', color: '#9e7238' },
        { c: 'meeting',  label: '會議', color: '#4d6fa0' },
        { c: 'other',    label: '其他', color: '#909090' }
      ],
      labels: {
        hospital: '醫院',
        park: '園區',
        training: '培訓課程',
        meeting: '會議',
        other: '其他'
      }
    }
  },
  computed: {
    monthData() {
      return CALENDAR_DATA[this.currentMonth]
    },
    calCells() {
      const { startDay, totalDays, today, days } = this.monthData
      const cells = []
      for (let i = 0; i < startDay; i++) {
        cells.push({ day: null, events: [] })
      }
      for (let d = 1; d <= totalDays; d++) {
        const dow = (startDay + d - 1) % 7
        cells.push({
          day: d,
          events: days[d] || [],
          isSun: dow === 0,
          isSat: dow === 6,
          isToday: today === d
        })
      }
      return cells
    }
  },
  methods: {
    openModal(cell) {
      this.modalCell = cell
    },
    closeModal() {
      this.modalCell = null
    }
  },
  mounted() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal()
    })
  }
}
</script>

<style scoped>
.calendar-page {
  padding: 1.5rem;
}
.cal-title {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.legend-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* Weekday row */
.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  margin-bottom: 4px;
}
.weekday-cell {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #aaa;
  padding: 5px 0;
  letter-spacing: 0.04em;
}

/* Calendar grid */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.cal-cell {
  min-height: 110px;
  background: #fff;
  border: 1px solid #ebebeb;
  border-radius: 8px;
  padding: 7px;
  overflow: hidden;
  transition: box-shadow 0.15s;
}
.cal-cell--has-events {
  cursor: pointer;
}
.cal-cell--has-events:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.cal-cell--empty {
  background: #f9f8f5;
  border-color: transparent;
}
.cal-cell--today {
  border: 1.5px solid #1a1a1a;
}
.cell-date {
  display: inline-block;
  font-size: 14px;
  font-weight: 600;
  color: #aaa;
  margin-bottom: 5px;
}
.cal-cell--today .cell-date {
  background: #1a1a1a;
  color: #fff !important;
  border-radius: 12px;
  padding: 0 6px;
}
.cal-cell--sun .cell-date { color: #d9534f; }
.cal-cell--sat .cell-date { color: #4a90d9; }

/* Event chips */
.ev-chip {
  font-size: 13px;
  line-height: 1.45;
  padding: 3px 7px;
  border-radius: 4px;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}
.ev-more {
  font-size: 12px;
  color: #888;
  padding: 1px 6px;
  cursor: pointer;
  font-weight: 500;
}
.ev-more:hover { color: #4d6fa0; }

.ev-hospital { background: #eedcdc; color: #5e1f1f; border-left: 2px solid #a05555; }
.ev-park     { background: #dceee2; color: #1d4429; border-left: 2px solid #527d60; }
.ev-training { background: #ede6d6; color: #533610; border-left: 2px solid #9e7238; }
.ev-meeting  { background: #d8e4f2; color: #1a3055; border-left: 2px solid #4d6fa0; }
.ev-other    { background: #e6e6e6; color: #404040; border-left: 2px solid #909090; }

/* Note bar */
.note-bar {
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  border-left: 3px solid #e6a817;
}
.note-label {
  font-size: 12px;
  font-weight: 600;
  color: #e6a817;
  margin-bottom: 6px;
  letter-spacing: 0.04em;
}
.note-bar p {
  font-size: 13px;
  color: #555;
  line-height: 1.7;
  margin: 0;
}

/* Modal overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-box {
  background: #fff;
  border-radius: 14px;
  padding: 2rem;
  max-width: 560px;
  width: 92%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}
.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}
.modal-date {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}
.modal-close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #aaa;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}
.modal-close-btn:hover { color: #333; }
.modal-body-scroll { overflow-y: auto; }
.modal-ev-row {
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}
.modal-ev-row:last-child { border-bottom: none; }
.modal-ev-time {
  font-size: 14px;
  color: #888;
  font-weight: 500;
  margin-bottom: 4px;
}
.modal-ev-name {
  font-size: 16px;
  color: #1a1a1a;
  line-height: 1.6;
}
.modal-ev-meta {
  font-size: 12px;
  color: #999;
  margin-top: 3px;
}
.modal-ev-tag {
  display: inline-block;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
  margin-top: 6px;
  font-weight: 500;
}
</style>
