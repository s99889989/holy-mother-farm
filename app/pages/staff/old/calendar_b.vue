<script setup>
definePageMeta({ layout: 'staff' })

// ── 靜態資料（可替換為 API） ──────────────────────────────────────
const rawEvents = {
  '2026-04': [
    { date: '2026-04-01', time: '08:00-10:00', title: '新進人員報到', owner: '高儀玟', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-01', time: '10:00-17:00', title: '慈濟大學參訪', owner: '賈德蘭', room: 'P0A30102 簡報室', type: '園區' },
    { date: '2026-04-01', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-02', time: '07:00-07:00', title: '原訂醫院4月2日早上活動', owner: '侯寶捷', room: '', type: '醫院' },
    { date: '2026-04-03', time: '14:00-16:30', title: '園區第一季環境消毒除蟲', owner: '蕭詩涵', room: '', type: '園區' },
    { date: '2026-04-05', time: '08:30-16:30', title: '室配丙級檢定收費課程', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-06', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-08', time: '08:00-18:00', title: '會計師年度審查', owner: '高儀玟', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-08', time: '09:00-12:00', title: '居督會議', owner: '蕭燕菁', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-08', time: '12:30-13:30', title: '抗生素相關課程', owner: '陳竹君', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-08', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-09', time: '08:00-18:00', title: '會計師年度審查', owner: '高儀玟', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-09', time: '08:30-17:00', title: '丙級自來水配管課程', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-10', time: '08:00-18:00', title: '會計師年度審查', owner: '高儀玟', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-11', time: '08:30-16:30', title: '丙級室內配線課程', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-11', time: '08:30-16:30', title: '烘焙丙級證照班收費課程', owner: '王榮貴', room: 'P0G20201 雨田大樓二樓烘培教室', type: '園區' },
    { date: '2026-04-12', time: '08:30-16:30', title: '室配丙級檢定收費課程', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-13', time: '08:00-12:00', title: '監理站簽約', owner: '賈德蘭', room: 'P0A30102 簡報室', type: '園區' },
    { date: '2026-04-13', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-14', time: '08:00-12:00', title: '東職參訪', owner: '賈德蘭', room: 'P0A30102 簡報室', type: '園區' },
    { date: '2026-04-14', time: '14:00-15:00', title: '115年緊急災害應變訓練', owner: '勒卡爾.夷丈.撒里朋岸', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-15', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-16', time: '12:30-13:30', title: '門診會議', owner: '林怡節', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-17', time: '08:00-12:00', title: '居家護理所團督', owner: '林茜莉', room: 'P0A30104 接待室', type: '園區' },
    { date: '2026-04-17', time: '09:00-17:00', title: '地板滾球訓練社團', owner: '鄭如君', room: 'P0J10101 快樂競技館', type: '園區' },
    { date: '2026-04-17', time: '14:00-15:00', title: '115年緊急災害應變訓練', owner: '勒卡爾.夷丈.撒里朋岸', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-18', time: '08:00-17:00', title: '樂齡地板滾球運動指導', owner: '鄭如君', room: 'P0E1B101 B1大禮堂', type: '園區' },
    { date: '2026-04-18', time: '08:30-16:30', title: '愛的陪伴-安寧照護工作坊', owner: '陳妙玲', room: 'F0A20101 陽光教室', type: '芳心' },
    { date: '2026-04-18', time: '08:30-16:30', title: '烘焙丙級證照班收費課程', owner: '王榮貴', room: 'P0G20201 雨田大樓二樓烘培教室', type: '園區' },
    { date: '2026-04-18', time: '08:30-17:00', title: '簡易家庭水電收費課程', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-19', time: '08:00-17:00', title: '樂齡地板滾球運動指導', owner: '鄭如君', room: 'P0E1B101 B1大禮堂', type: '園區' },
    { date: '2026-04-19', time: '08:30-16:30', title: '丙級室內配線收費課程', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-20', time: '08:00-17:30', title: '即測即評考試報名', owner: '蔣鍾悅湄', room: 'P0D20201 多功能大教室', type: '園區' },
    { date: '2026-04-20', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-21', time: '08:00-17:00', title: '長照會議', owner: '蕭燕菁', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-21', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-21', time: '08:00-12:00', title: '東職參訪', owner: '賈德蘭', room: 'P0A30102 簡報室', type: '園區' },
    { date: '2026-04-21', time: '12:00-14:00', title: '醫事行政室會議', owner: '曾淑玲', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-21', time: '13:30-17:30', title: '提供參與香草園協作坊', owner: '胡劉錦美', room: 'P0A30102 簡報室', type: '園區' },
    { date: '2026-04-22', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-22', time: '13:30-17:30', title: '115年上半年度D區訓練', owner: '王云', room: 'P0D20201 多功能大教室', type: '園區' },
    { date: '2026-04-22', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-23', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-23', time: '13:30-17:30', title: '115年上半年度自衛消防', owner: '王云', room: 'P0D20201 多功能大教室', type: '園區' },
    { date: '2026-04-24', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-25', time: '08:00-17:00', title: '居服員課程+會議', owner: '李依璇', room: 'P0E1B101 B1大禮堂', type: '園區' },
    { date: '2026-04-25', time: '08:30-16:30', title: '烘焙丙級證照班收費課程', owner: '王榮貴', room: 'P0G20201 雨田大樓二樓烘培教室', type: '園區' },
    { date: '2026-04-25', time: '08:30-17:00', title: '簡易家庭水電收費課程', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-27', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-27', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-28', time: '08:00-12:00', title: '勞資會議', owner: '蔡明玲', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-28', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-28', time: '13:00-13:30', title: '召開115年第一次轉介會議', owner: '廖惠如', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-29', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-29', time: '13:00-15:00', title: '風險款-社會處方分工', owner: '游毓平', room: '', type: '醫院' },
    { date: '2026-04-29', time: '15:00-17:30', title: '健保局CCM計畫輔導', owner: '游毓平', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-04-29', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-04-30', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-04-30', time: '11:00-14:00', title: '新竹華德福在樂活午餐', owner: '吳宣澔', room: 'P0B10201 樂活教室', type: '園區' },
    { date: '2026-04-30', time: '13:00-13:30', title: '馬偕胡小姐團體用餐', owner: '吳宣澔', room: 'P0D30102 休憩小舖/照顧者咖啡屋', type: '園區' },
  ],
  '2026-05': [
    { date: '2026-05-02', time: '09:00-13:30', title: '臺東縣手工藝發展協會活動', owner: '吳宣澔', room: 'P0B10201 樂活教室', type: '園區' },
    { date: '2026-05-04', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-04', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-05', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-05', time: '12:30-14:00', title: '5月員工大會暨三合一活動', owner: '彭衍翰', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-05', time: '13:30-17:30', title: '提供參與香草園協作坊', owner: '吳宣澔', room: 'P0A30102 簡報室', type: '園區' },
    { date: '2026-05-06', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-06', time: '12:00-12:30', title: '糖尿病在職教育', owner: '蘇麗芳', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-05-06', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-07', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-07', time: '12:30-13:30', title: '員工英文進修課', owner: '彭衍翰', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-08', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-08', time: '16:30-17:00', title: '英飛特PACS操作使用說明', owner: '王金龍', room: '', type: '醫院' },
    { date: '2026-05-09', time: '08:30-16:30', title: '烘焙丙級證照班收費課程', owner: '王榮貴', room: 'P0G20201 雨田大樓二樓烘培教室', type: '園區' },
    { date: '2026-05-11', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-11', time: '10:00-15:30', title: '董事會', owner: '吳宣澔', room: 'P0B10201 樂活教室', type: '園區' },
    { date: '2026-05-11', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-12', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-12', time: '12:00-14:00', title: '醫事行政室會議', owner: '曾淑玲', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-05-12', time: '13:30-17:30', title: '提供參與香草園協作坊', owner: '吳宣澔', room: 'P0A30102 簡報室', type: '園區' },
    { date: '2026-05-13', time: '08:00-08:00', title: '英飛特影像傳輸儲存系統說明', owner: '王金龍', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-05-13', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-13', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-14', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-14', time: '08:00-17:30', title: '失智症20小時課程', owner: '黃碧珍', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-15', time: '08:00-17:00', title: '長照會議', owner: '林茜莉', room: 'P0D20201 多功能大教室', type: '園區' },
    { date: '2026-05-15', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-15', time: '08:00-17:30', title: '失智症20小時課程', owner: '黃碧珍', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-15', time: '09:00-17:00', title: '地板滾球訓練社團', owner: '鄭如君', room: 'P0J10101 快樂競技館', type: '園區' },
    { date: '2026-05-15', time: '12:30-13:30', title: '門診月會議', owner: '高榮蓁', room: 'H0A10404 四樓會議室', type: '醫院' },
    { date: '2026-05-16', time: '08:00-18:00', title: '115年照顧服務員術科測試', owner: '蔣鍾悅湄', room: 'P0D30201 照服員考場監一', type: '園區' },
    { date: '2026-05-16', time: '08:00-17:30', title: '失智症20小時課程', owner: '黃碧珍', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-16', time: '08:30-16:30', title: '烘焙丙級證照班收費課程', owner: '王榮貴', room: 'P0G20201 雨田大樓二樓烘培教室', type: '園區' },
    { date: '2026-05-17', time: '08:00-12:00', title: '醫院115年上半年度消防演練', owner: '侯寶捷', room: '', type: '醫院' },
    { date: '2026-05-18', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-18', time: '11:30-12:30', title: '聖經協會-早餐午餐彌撒', owner: '吳宣澔', room: 'P0A20101 聖堂', type: '園區' },
    { date: '2026-05-18', time: '13:30-16:00', title: '東區醫療網失智課程', owner: '游毓平', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-18', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: '', type: '醫院' },
    { date: '2026-05-19', time: '08:00-17:00', title: '個資暨資安檢查周', owner: '陳奕誠', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-19', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-19', time: '13:30-15:30', title: '提供參與香草園協作坊', owner: '吳宣澔', room: 'P0A30102 簡報室', type: '園區' },
    { date: '2026-05-20', time: '08:00-17:00', title: '個資暨資安檢查周', owner: '陳奕誠', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-20', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-20', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-21', time: '08:00-17:00', title: '個資暨資安檢查周', owner: '陳奕誠', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-21', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-22', time: '08:00-17:00', title: '個資暨資安檢查周', owner: '陳奕誠', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-22', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-22', time: '08:00-17:30', title: '衛生局保健科增能舒壓課程', owner: '吳宣澔', room: 'P0B10201 樂活教室', type: '園區' },
    { date: '2026-05-23', time: '08:00-17:00', title: '居服員課程+會議', owner: '林茜莉', room: 'P0E1B101 B1大禮堂', type: '園區' },
    { date: '2026-05-24', time: '08:00-12:00', title: '園區115年上半年度消防演練', owner: '侯寶捷', room: '', type: '園區' },
    { date: '2026-05-25', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-25', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-26', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-27', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-27', time: '17:30-19:00', title: '燃脂增肌班', owner: '藍世昌', room: 'H0A10301 三樓大禮堂', type: '醫院' },
    { date: '2026-05-28', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-29', time: '08:00-17:00', title: '室內電路配線技術檢定', owner: '王榮貴', room: 'P0I10201 水電實習廠', type: '園區' },
    { date: '2026-05-29', time: '09:00-15:00', title: '卑南鄉文健站樂齡地板滾球', owner: '鄭如君', room: 'P0C20102 活動中心', type: '園區' },
    { date: '2026-05-30', time: '08:30-16:30', title: '烘焙丙級證照班收費課程', owner: '王榮貴', room: 'P0G20201 雨田大樓二樓烘培教室', type: '園區' },
  ]
}

const notes = {
  '2026-04': [
    '(04/03) 請配合消毒公告須知事項。',
    '(04/18) 於小舖平台用午餐，請備廚餘桶，感謝！'
  ],
  '2026-05': [
    '(05/15) 請備－廚餘桶+回收桶+垃圾桶',
    '(05/16) 多功能大教室、監一到監七教室 請備垃圾桶及廚餘桶',
    '(05/18) 7:00早餐（餐廳） 8:00走讀（德蘭） 9:30會議（202、203） 11:30彌撒（聖堂） 12:30午餐（餐廳） 1:30離園',
    '(05/22) 增能舒壓課程 樂活教室54人自助式（2圓桌包廂）+外面',
    '(05/29) 人數300，中午於活動中心用餐(便當)，需於周邊準備廚餘回收區域，需於前一天貼製場地，要麻煩05/27協助清洗球場'
  ]
}

// ── 狀態 ───────────────────────────────────────────────────────────
const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1) // 1-based，預設今天；如果是4月顯示4月
// 預設顯示4月（資料月份）
if (currentMonth.value < 4) { currentMonth.value = 4 }

const filterType = ref('全部') // 全部 / 醫院 / 園區 / 芳心
const selectedEvent = ref(null)
const showNotes = ref(false)
const listView = ref(false)

// ── 計算 ───────────────────────────────────────────────────────────
const monthKey = computed(() => `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`)
const monthLabel = computed(() => `${currentYear.value} 年 ${currentMonth.value} 月`)

const monthEvents = computed(() => rawEvents[monthKey.value] || [])
const currentNotes = computed(() => notes[monthKey.value] || [])

const filteredEvents = computed(() =>
  filterType.value === '全部'
    ? monthEvents.value
    : monthEvents.value.filter(e => e.type === filterType.value)
)

const typeCount = computed(() => {
  const counts = { 醫院: 0, 園區: 0, 芳心: 0 }
  monthEvents.value.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++ })
  return counts
})

// 月曆格子
const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
})

function eventsOnDay(day) {
  if (!day) return []
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return filteredEvents.value.filter(e => e.date === dateStr)
}

function isToday(day) {
  return day === today.getDate() && currentMonth.value === today.getMonth() + 1 && currentYear.value === today.getFullYear()
}

// 月份切換
function prevMonth() {
  if (currentMonth.value === 1) { currentMonth.value = 12; currentYear.value-- }
  else currentMonth.value--
}
function nextMonth() {
  if (currentMonth.value === 12) { currentMonth.value = 1; currentYear.value++ }
  else currentMonth.value++
}

const hasData = computed(() => !!rawEvents[monthKey.value])

// 顏色
const typeColor = { 醫院: 'hospital', 園區: 'park', 芳心: 'fragrant' }
function chipClass(type) {
  return typeColor[type] || 'park'
}

// 排序後清單視圖
const sortedEvents = computed(() =>
  [...filteredEvents.value].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
)
</script>

<template>
  <div class="cal-wrap">
    <!-- ── Header ── -->
    <header class="cal-header">
      <div class="cal-header-inner">
        <div class="cal-brand">
          <span class="cal-brand-icon">📅</span>
          <div>
            <h1 class="cal-title">行事曆</h1>
            <p class="cal-subtitle">聖母健康農莊 · 員工專區</p>
          </div>
        </div>
        <div class="cal-header-actions">
          <button @click="listView = !listView" class="view-toggle" :class="{ active: listView }">
            <span v-if="listView">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </span>
            <span v-else>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </span>
          </button>
        </div>
      </div>
    </header>

    <div class="cal-body">
      <!-- ── 月份控制 ── -->
      <div class="month-nav">
        <button @click="prevMonth" class="nav-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="month-label">
          <span class="month-text">{{ monthLabel }}</span>
          <span v-if="!hasData" class="no-data-badge">無資料</span>
        </div>
        <button @click="nextMonth" class="nav-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <!-- ── 篩選 + 統計 ── -->
      <div class="filter-bar">
        <button
          v-for="t in ['全部', '醫院', '園區', '芳心']"
          :key="t"
          @click="filterType = t"
          :class="['filter-btn', `filter-${t === '全部' ? 'all' : typeColor[t]}`, filterType === t ? 'active' : '']"
        >
          {{ t }}
          <span class="filter-count">
            {{ t === '全部' ? monthEvents.length : (typeCount[t] || 0) }}
          </span>
        </button>
      </div>

      <!-- ── 月曆視圖 ── -->
      <template v-if="!listView">
        <!-- 星期標頭 -->
        <div class="weekday-header">
          <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="weekday-cell" :class="d === '日' ? 'sun' : d === '六' ? 'sat' : ''">
            {{ d }}
          </div>
        </div>

        <!-- 日曆格 -->
        <div class="calendar-grid">
          <div
            v-for="(day, idx) in calendarDays"
            :key="idx"
            class="day-cell"
            :class="{
              empty: !day,
              today: isToday(day),
              weekend: day && (idx % 7 === 0 || idx % 7 === 6),
              'has-events': day && eventsOnDay(day).length > 0
            }"
          >
            <template v-if="day">
              <span class="day-num">{{ day }}</span>
              <div class="event-chips">
                <div
                  v-for="(ev, ei) in eventsOnDay(day).slice(0, 3)"
                  :key="ei"
                  :class="['event-chip', chipClass(ev.type)]"
                  @click="selectedEvent = ev"
                >
                  <span class="chip-time">{{ ev.time.split('-')[0] }}</span>
                  <span class="chip-title">{{ ev.title }}</span>
                </div>
                <div
                  v-if="eventsOnDay(day).length > 3"
                  class="event-more"
                  @click="selectedEvent = eventsOnDay(day)[3]"
                >
                  +{{ eventsOnDay(day).length - 3 }} 更多
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- ── 清單視圖 ── -->
      <template v-else>
        <div class="list-view">
          <div v-if="sortedEvents.length === 0" class="list-empty">本月無活動</div>
          <template v-else>
            <div
              v-for="(ev, i) in sortedEvents"
              :key="i"
              class="list-item"
              @click="selectedEvent = ev"
            >
              <div :class="['list-type-bar', chipClass(ev.type)]"></div>
              <div class="list-date-col">
                <span class="list-day">{{ parseInt(ev.date.split('-')[2]) }}</span>
                <span class="list-month">{{ parseInt(ev.date.split('-')[1]) }}月</span>
              </div>
              <div class="list-info">
                <p class="list-item-title">{{ ev.title }}</p>
                <p class="list-item-meta">{{ ev.time }} · {{ ev.owner }}</p>
                <p v-if="ev.room" class="list-item-room">{{ ev.room }}</p>
              </div>
              <span :class="['list-badge', chipClass(ev.type)]">{{ ev.type }}</span>
            </div>
          </template>
        </div>
      </template>

      <!-- ── 備注 ── -->
      <div v-if="currentNotes.length" class="notes-section">
        <button class="notes-toggle" @click="showNotes = !showNotes">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          備注事項 ({{ currentNotes.length }})
          <svg :style="{ transform: showNotes ? 'rotate(180deg)' : 'rotate(0deg)', transition: '.2s' }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div v-if="showNotes" class="notes-list">
          <div v-for="(n, i) in currentNotes" :key="i" class="note-item">
            <span class="note-dot">▪</span>
            {{ n }}
          </div>
        </div>
      </div>
    </div>

    <!-- ── 活動詳情 Drawer ── -->
    <Transition name="slide">
      <div v-if="selectedEvent" class="event-overlay" @click.self="selectedEvent = null">
        <div class="event-drawer">
          <div class="drawer-handle"></div>
          <div :class="['drawer-type-strip', chipClass(selectedEvent.type)]"></div>
          <div class="drawer-content">
            <div class="drawer-header">
              <span :class="['drawer-badge', chipClass(selectedEvent.type)]">{{ selectedEvent.type }}</span>
              <button class="drawer-close" @click="selectedEvent = null">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <h2 class="drawer-title">{{ selectedEvent.title }}</h2>
            <div class="drawer-meta-list">
              <div class="drawer-meta-row">
                <span class="meta-icon">📅</span>
                <span>{{ selectedEvent.date }}</span>
              </div>
              <div class="drawer-meta-row">
                <span class="meta-icon">🕐</span>
                <span>{{ selectedEvent.time }}</span>
              </div>
              <div class="drawer-meta-row">
                <span class="meta-icon">👤</span>
                <span>{{ selectedEvent.owner }}</span>
              </div>
              <div v-if="selectedEvent.room" class="drawer-meta-row">
                <span class="meta-icon">📍</span>
                <span>{{ selectedEvent.room }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── 基底 ── */
.cal-wrap {
  min-height: 100vh;
  background: #f5f3ef;
  font-family: 'Noto Sans TC', 'PingFang TC', sans-serif;
}
:root.dark .cal-wrap { background: #18181b; }

/* ── Header ── */
.cal-header {
  background: #fff;
  border-bottom: 1px solid #e8e3dc;
  position: sticky;
  top: 0;
  z-index: 20;
}
:root.dark .cal-header { background: #27272a; border-color: #3f3f46; }
.cal-header-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cal-brand { display: flex; align-items: center; gap: 10px; }
.cal-brand-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #3d6b52, #2a4f3a);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.cal-title {
  font-size: 15px; font-weight: 700;
  color: #1c1917;
  line-height: 1;
}
:root.dark .cal-title { color: #f5f5f4; }
.cal-subtitle {
  font-size: 11px; color: #a8a29e; margin-top: 2px;
}

.view-toggle {
  width: 34px; height: 34px;
  border: 1px solid #e2ddd8;
  border-radius: 8px;
  background: #faf9f7;
  color: #78716c;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all .15s;
}
.view-toggle:hover, .view-toggle.active {
  background: #3d6b52; color: #fff; border-color: #3d6b52;
}
:root.dark .view-toggle { background: #3f3f46; border-color: #52525b; color: #a1a1aa; }

/* ── Body ── */
.cal-body {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px 12px 40px;
}

/* ── Month Nav ── */
.month-nav {
  display: flex; align-items: center; gap: 12px;
  justify-content: center;
  margin-bottom: 14px;
}
.nav-btn {
  width: 36px; height: 36px;
  border: 1px solid #e2ddd8;
  border-radius: 50%;
  background: #fff;
  color: #57534e;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all .15s;
}
.nav-btn:hover { background: #3d6b52; color: #fff; border-color: #3d6b52; }
:root.dark .nav-btn { background: #3f3f46; border-color: #52525b; color: #d4d4d8; }
.month-label { display: flex; align-items: center; gap: 8px; min-width: 140px; justify-content: center; }
.month-text { font-size: 18px; font-weight: 700; color: #1c1917; letter-spacing: .5px; }
:root.dark .month-text { color: #f5f5f4; }
.no-data-badge {
  font-size: 11px; background: #fef3c7; color: #92400e;
  border-radius: 6px; padding: 2px 7px; font-weight: 600;
}

/* ── Filter ── */
.filter-bar {
  display: flex; gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.filter-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 13px;
  border-radius: 20px;
  font-size: 13px; font-weight: 500;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all .15s;
  background: #fff;
  color: #57534e;
  border-color: #e2ddd8;
}
:root.dark .filter-btn { background: #27272a; color: #a1a1aa; border-color: #3f3f46; }
.filter-count {
  font-size: 11px; opacity: .65;
  background: rgba(0,0,0,.06);
  border-radius: 10px;
  padding: 0 5px;
  min-width: 18px; text-align: center;
}
.filter-btn.active.filter-all { background: #1c1917; color: #fff; border-color: #1c1917; }
.filter-btn.active.filter-hospital { background: #e0534a; color: #fff; border-color: #e0534a; }
.filter-btn.active.filter-park { background: #3d6b52; color: #fff; border-color: #3d6b52; }
.filter-btn.active.filter-fragrant { background: #a06080; color: #fff; border-color: #a06080; }

/* ── Weekday header ── */
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}
.weekday-cell {
  text-align: center;
  font-size: 11px; font-weight: 600;
  color: #a8a29e;
  padding: 4px 0;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.weekday-cell.sun { color: #e0534a; }
.weekday-cell.sat { color: #5b7fc4; }

/* ── Calendar Grid ── */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.day-cell {
  min-height: 90px;
  background: #fff;
  border-radius: 8px;
  padding: 6px 5px 5px;
  position: relative;
  transition: box-shadow .15s;
}
:root.dark .day-cell { background: #27272a; }
.day-cell.empty { background: transparent; min-height: 0; }
.day-cell.weekend { background: #faf6f2; }
:root.dark .day-cell.weekend { background: #232325; }
.day-cell.has-events { box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.day-cell.today .day-num {
  background: #3d6b52;
  color: #fff;
  border-radius: 50%;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700;
}
.day-num {
  font-size: 12px; font-weight: 600;
  color: #57534e;
  line-height: 1;
  display: inline-block;
  margin-bottom: 4px;
}
:root.dark .day-num { color: #d4d4d8; }
.weekend .day-num { color: #e0534a; }
:root.dark .weekend .day-num { color: #f87171; }

/* Event chips */
.event-chips { display: flex; flex-direction: column; gap: 2px; }
.event-chip {
  display: flex; gap: 3px; align-items: baseline;
  border-radius: 4px;
  padding: 2px 4px;
  cursor: pointer;
  transition: opacity .1s;
  overflow: hidden;
}
.event-chip:hover { opacity: .8; }
.event-chip.hospital { background: #fee2e2; }
.event-chip.park { background: #dcfce7; }
.event-chip.fragrant { background: #fce7f3; }
:root.dark .event-chip.hospital { background: #4d2323; }
:root.dark .event-chip.park { background: #1a3a26; }
:root.dark .event-chip.fragrant { background: #3b1a2e; }
.chip-time {
  font-size: 9px; font-weight: 700; flex-shrink: 0;
  color: #78716c;
  font-variant-numeric: tabular-nums;
}
.event-chip.hospital .chip-time { color: #c0392b; }
.event-chip.park .chip-time { color: #2d6a46; }
.event-chip.fragrant .chip-time { color: #9d4f78; }
.chip-title {
  font-size: 10px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: #44403c;
  flex: 1;
  min-width: 0;
}
:root.dark .chip-title { color: #d4d4d8; }
.event-more {
  font-size: 10px; color: #a8a29e;
  padding: 1px 4px; cursor: pointer;
}

/* ── List View ── */
.list-view { display: flex; flex-direction: column; gap: 6px; }
.list-empty { text-align: center; color: #a8a29e; padding: 40px 0; font-size: 14px; }
.list-item {
  background: #fff;
  border-radius: 10px;
  display: flex; align-items: stretch;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  transition: transform .12s, box-shadow .12s;
}
:root.dark .list-item { background: #27272a; }
.list-item:hover { transform: translateX(2px); box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.list-type-bar { width: 4px; flex-shrink: 0; }
.list-type-bar.hospital { background: #e0534a; }
.list-type-bar.park { background: #3d6b52; }
.list-type-bar.fragrant { background: #a06080; }
.list-date-col {
  width: 48px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #faf9f7; padding: 10px 6px;
  border-right: 1px solid #f0ece6;
}
:root.dark .list-date-col { background: #1f1f22; border-color: #3f3f46; }
.list-day { font-size: 20px; font-weight: 800; color: #1c1917; line-height: 1; }
:root.dark .list-day { color: #f5f5f4; }
.list-month { font-size: 10px; color: #a8a29e; margin-top: 2px; }
.list-info { flex: 1; padding: 10px 10px 10px 12px; min-width: 0; }
.list-item-title { font-size: 13px; font-weight: 600; color: #1c1917; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:root.dark .list-item-title { color: #f5f5f4; }
.list-item-meta { font-size: 11px; color: #a8a29e; margin-top: 2px; }
.list-item-room { font-size: 10px; color: #c4bdb5; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list-badge {
  flex-shrink: 0; align-self: center;
  font-size: 10px; font-weight: 600;
  padding: 2px 7px; border-radius: 10px; margin-right: 10px;
}
.list-badge.hospital { background: #fee2e2; color: #c0392b; }
.list-badge.park { background: #dcfce7; color: #2d6a46; }
.list-badge.fragrant { background: #fce7f3; color: #9d4f78; }

/* ── Notes ── */
.notes-section { margin-top: 20px; }
.notes-toggle {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600;
  color: #78716c; background: none; border: none; cursor: pointer;
  padding: 6px 0;
}
:root.dark .notes-toggle { color: #a1a1aa; }
.notes-list {
  background: #fff8e8;
  border: 1px solid #f0e4ba;
  border-radius: 10px;
  padding: 10px 14px;
  margin-top: 6px;
}
:root.dark .notes-list { background: #2a2516; border-color: #4a3e20; }
.note-item {
  font-size: 12px; color: #78716c; line-height: 1.7;
  display: flex; gap: 6px;
}
:root.dark .note-item { color: #d4c98a; }
.note-dot { flex-shrink: 0; color: #c8a84b; }

/* ── Event Overlay & Drawer ── */
.event-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 50;
  display: flex; align-items: flex-end;
}
.event-drawer {
  width: 100%;
  background: #fff;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  max-height: 80vh;
}
:root.dark .event-drawer { background: #27272a; }
.drawer-handle {
  width: 36px; height: 4px;
  background: #e2ddd8; border-radius: 2px;
  margin: 12px auto 0;
}
:root.dark .drawer-handle { background: #3f3f46; }
.drawer-type-strip { height: 3px; }
.drawer-type-strip.hospital { background: #e0534a; }
.drawer-type-strip.park { background: #3d6b52; }
.drawer-type-strip.fragrant { background: #a06080; }
.drawer-content { padding: 16px 20px 32px; }
.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.drawer-badge {
  font-size: 12px; font-weight: 600;
  padding: 3px 10px; border-radius: 12px;
}
.drawer-badge.hospital { background: #fee2e2; color: #c0392b; }
.drawer-badge.park { background: #dcfce7; color: #2d6a46; }
.drawer-badge.fragrant { background: #fce7f3; color: #9d4f78; }
.drawer-close {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid #e2ddd8; background: #faf9f7;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #78716c;
  transition: all .15s;
}
:root.dark .drawer-close { background: #3f3f46; border-color: #52525b; color: #a1a1aa; }
.drawer-close:hover { background: #f87171; color: #fff; border-color: #f87171; }
.drawer-title {
  font-size: 20px; font-weight: 700;
  color: #1c1917; line-height: 1.3;
  margin-bottom: 16px;
}
:root.dark .drawer-title { color: #f5f5f4; }
.drawer-meta-list { display: flex; flex-direction: column; gap: 10px; }
.drawer-meta-row {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 14px; color: #44403c;
}
:root.dark .drawer-meta-row { color: #d4d4d8; }
.meta-icon { font-size: 16px; flex-shrink: 0; margin-top: -1px; }

/* ── Transition ── */
.slide-enter-active, .slide-leave-active { transition: opacity .2s; }
.slide-enter-active .event-drawer, .slide-leave-active .event-drawer { transition: transform .25s cubic-bezier(.32,.72,0,1); }
.slide-enter-from { opacity: 0; }
.slide-enter-from .event-drawer { transform: translateY(100%); }
.slide-leave-to { opacity: 0; }
.slide-leave-to .event-drawer { transform: translateY(100%); }

/* ── RWD ── */
@media (max-width: 640px) {
  .day-cell { min-height: 70px; padding: 4px 3px 3px; }
  .chip-time { display: none; }
  .chip-title { font-size: 9px; }
  .drawer-title { font-size: 17px; }
}
@media (min-width: 641px) {
  .event-overlay { align-items: center; justify-content: center; }
  .event-drawer {
    max-width: 480px; border-radius: 20px;
    max-height: 70vh;
  }
}
</style>
