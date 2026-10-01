<template>
  <div class="min-h-full bg-surface2 transition-colors">
    <LineAiHeader @change="loadAccountData" />

    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4">
      <div class="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="pill-btn"
          :class="tab === t.key ? 'pill-active' : ''"
          :style="tab === t.key ? pillActiveStyle : ''"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <div
        v-if="flash"
        class="flash mb-4"
        :class="flash.ok ? 'flash-ok' : 'flash-err'"
      >
        {{ flash.text }}
      </div>

      <!-- ===================== 帳號與連線 ===================== -->
      <div
        v-if="tab === 'account'"
        class="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0"
      >
        <div class="space-y-4">
          <div
            v-if="current && accForm"
            class="panel"
          >
            <div class="flex items-center gap-2 mb-3">
              <h3
                class="font-bold text-base-c"
                style="font-size:15px"
              >
                {{ current.name }}
              </h3>
              <span
                v-if="current.botName"
                class="status-badge bg-emerald-100 text-emerald-700"
              >LINE：{{ current.botName }}</span>
              <div class="ml-auto flex items-center gap-2">
                <span
                  class="text-hint-c"
                  style="font-size:13px"
                >啟用</span>
                <button
                  class="toggle"
                  :class="accForm.enabled ? 'toggle-on' : ''"
                  @click="accForm.enabled = !accForm.enabled"
                />
              </div>
            </div>

            <label class="field-label">帳號名稱（自己看的）</label>
            <input
              v-model="accForm.name"
              type="text"
              class="field-input"
            >
            <label class="field-label">Channel secret（Basic settings 分頁）</label>
            <input
              v-model="accForm.channelSecret"
              type="text"
              autocomplete="off"
              class="field-input"
            >
            <label class="field-label">Channel access token（Messaging API 分頁最下方 Issue）</label>
            <input
              v-model="accForm.accessToken"
              type="text"
              autocomplete="off"
              class="field-input"
            >
            <label class="field-label">轉人工通知對象 userId（一行一個；對官方帳號傳「我的ID」取得）</label>
            <textarea
              v-model="accForm.notifyText"
              rows="3"
              class="field-input"
              style="margin-bottom:4px"
            />
            <p
              class="text-hint-c mb-3"
              style="font-size:12px"
            >
              通知用 Push 傳送，每位每則計入每月額度。
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                class="btn-primary"
                @click="saveAccount"
              >
                儲存
              </button>
              <button
                class="btn-plain"
                @click="verify"
              >
                驗證憑證
              </button>
              <button
                class="btn-plain"
                @click="testNotify"
              >
                傳送測試通知
              </button>
              <button
                class="mini-btn mini-danger ml-auto"
                style="padding:7px 14px"
                @click="pendingDelete = current"
              >
                刪除帳號
              </button>
            </div>
          </div>

          <div
            v-if="current"
            class="panel"
          >
            <h3
              class="font-bold text-base-c mb-2"
              style="font-size:15px"
            >
              Webhook
            </h3>
            <div
              class="text-hint-c mb-1"
              style="font-size:13px"
            >
              這個帳號的 Webhook 網址
            </div>
            <div class="code-box mb-3">
              {{ current.webhookUrl || '（請先在 application.properties 設定 lineai.public-base-url）' }}
            </div>
            <div
              v-if="verifyInfo"
              class="mb-3 space-y-1.5"
              style="font-size:13px"
            >
              <div class="text-hint-c">
                LINE 上目前的網址：
              </div>
              <div class="code-box">
                {{ verifyInfo.webhookEndpoint || '（空）' }}
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <span
                  class="status-badge"
                  :class="verifyInfo.webhookEndpoint === verifyInfo.expectedWebhook ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                >
                  {{ verifyInfo.webhookEndpoint === verifyInfo.expectedWebhook ? '✔ 已指向這台後端' : '✖ 還沒指向這台後端' }}
                </span>
                <span
                  class="status-badge"
                  :class="verifyInfo.webhookActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                >
                  {{ verifyInfo.webhookActive ? '✔ Use webhook 已開啟' : '✖ Use webhook 還沒開' }}
                </span>
              </div>
            </div>
            <button
              class="btn-primary"
              @click="syncWebhook"
            >
              把 LINE 的 Webhook 設成這台後端
            </button>
            <p
              class="text-hint-c mt-2"
              style="font-size:12px"
            >
              原本填的其他服務網址會先記下來，可以到「Webhook 轉發」一鍵加回去。
            </p>

            <div class="notice mt-4">
              <div class="font-bold mb-1">
                這兩個開關 LINE 沒有 API，要自己到後台點：
              </div>
              <div>① LINE Developers Console → Messaging API → Webhook settings：打開「Use webhook」，「Webhook redelivery」建議關閉</div>
              <div>② LINE Official Account Manager → 設定 → 回應設定：Webhook 開、回應方式選「手動聊天」、關閉「自動回應訊息」</div>
              <div class="mt-1 opacity-80">
                做完用手機傳一句話給官方帳號，只收到一則回覆就代表全對；收到兩則代表自動回應訊息沒關。
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div
            v-if="current"
            class="panel"
          >
            <div class="flex items-center mb-3">
              <h3
                class="font-bold text-base-c"
                style="font-size:15px"
              >
                今日數字
              </h3>
              <button
                class="mini-btn ml-auto"
                @click="loadStats"
              >
                ↻ 重新整理
              </button>
            </div>
            <div
              v-if="stats"
              class="stat-grid"
            >
              <div class="stat-card">
                <div class="stat-label">
                  收到
                </div>
                <div class="stat-value">
                  {{ stats.received }}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">
                  已回覆
                </div>
                <div class="stat-value">
                  {{ stats.replied }}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">
                  平均回應
                </div>
                <div class="stat-value">
                  {{ (stats.avgLatencyMs / 1000).toFixed(1) }}s
                </div>
              </div>
              <div
                class="stat-card"
                style="border-left-color:#ea580c"
              >
                <div class="stat-label">
                  等待回覆
                </div>
                <div class="stat-value">
                  {{ stats.waiting }}
                </div>
              </div>
              <div
                class="stat-card"
                style="border-left-color:#d97706"
              >
                <div class="stat-label">
                  待處理轉人工
                </div>
                <div class="stat-value">
                  {{ stats.handoffOpen }}
                </div>
              </div>
              <div
                class="stat-card"
                style="border-left-color:#7c3aed"
              >
                <div class="stat-label">
                  待補問題
                </div>
                <div class="stat-value">
                  {{ stats.unanswered }}
                </div>
              </div>
            </div>
            <div
              v-if="stats && Object.keys(stats.bySource).length"
              class="flex flex-wrap gap-1.5 mt-3"
            >
              <span
                v-for="(n, k) in stats.bySource"
                :key="k"
                class="status-badge bg-stone-100 text-stone-600"
              >{{ SOURCE_LABEL[k] || k }} {{ n }}</span>
            </div>
            <div
              v-if="quota"
              class="mt-3 text-base-c"
              style="font-size:13.5px"
            >
              本月 Push 額度：
              <b v-if="quota.ok">{{ quota.used }} / {{ quota.type === 'none' ? '無上限' : quota.limit }}</b>
              <span
                v-else
                class="text-hint-c"
              >讀不到</span>
              <div
                class="text-hint-c"
                style="font-size:12px"
              >
                AI 自動回覆走 Reply，不計額度
              </div>
            </div>
          </div>

          <div class="panel">
            <h3
              class="font-bold text-base-c mb-3"
              style="font-size:15px"
            >
              ＋ 新增官方帳號
            </h3>
            <label class="field-label">名稱</label>
            <input
              v-model="newAcc.name"
              type="text"
              class="field-input"
              placeholder="例如：聖母健康農莊"
            >
            <label class="field-label">Channel secret</label>
            <input
              v-model="newAcc.channelSecret"
              type="text"
              autocomplete="off"
              class="field-input"
            >
            <label class="field-label">Channel access token</label>
            <input
              v-model="newAcc.accessToken"
              type="text"
              autocomplete="off"
              class="field-input"
            >
            <template v-if="accounts.length">
              <label class="field-label">複製設定與知識庫自</label>
              <select
                v-model="newAcc.copyFrom"
                class="field-input"
              >
                <option value="">
                  （不複製，從空白開始）
                </option>
                <option
                  v-for="a in accounts"
                  :key="a.id"
                  :value="a.id"
                >
                  {{ a.name }}
                </option>
              </select>
            </template>
            <button
              class="btn-primary"
              @click="createAccount"
            >
              新增
            </button>
          </div>
        </div>
      </div>

      <!-- ===================== 店家資訊 ===================== -->
      <div
        v-if="tab === 'shop' && shop"
        class="panel"
      >
        <p
          class="text-hint-c mb-4"
          style="font-size:13px"
        >
          AI 每次回覆都看得到這些固定資訊。菜單、價目表這類很長或常變的內容請放知識庫。
        </p>
        <div class="grid sm:grid-cols-2 gap-x-4">
          <div>
            <label class="field-label">店名</label>
            <input
              v-model="shop.name"
              type="text"
              class="field-input"
            >
          </div>
          <div>
            <label class="field-label">電話</label>
            <input
              v-model="shop.phone"
              type="text"
              class="field-input"
            >
          </div>
        </div>
        <label class="field-label">營業時間</label>
        <textarea
          v-model="shop.hours"
          rows="2"
          class="field-input"
          placeholder="週二至週日 9:00–17:00，週一公休"
        />
        <label class="field-label">地址</label>
        <input
          v-model="shop.address"
          type="text"
          class="field-input"
        >
        <label class="field-label">簡介</label>
        <textarea
          v-model="shop.intro"
          rows="4"
          class="field-input"
        />
        <div class="flex justify-end">
          <button
            class="btn-primary"
            @click="saveShop"
          >
            儲存
          </button>
        </div>
      </div>

      <!-- ===================== 回覆規則 ===================== -->
      <div
        v-if="tab === 'rules' && rules"
        class="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0"
      >
        <div class="space-y-4">
          <div class="panel">
            <div class="flex items-center mb-2">
              <h3
                class="font-bold text-base-c"
                style="font-size:15px"
              >
                系統指令
              </h3>
              <div class="ml-auto flex items-center gap-2">
                <span
                  class="text-hint-c"
                  style="font-size:13px"
                >AI 自動回覆</span>
                <button
                  class="toggle"
                  :class="rules.aiEnabled ? 'toggle-on' : ''"
                  @click="rules.aiEnabled = !rules.aiEnabled"
                />
              </div>
            </div>
            <p
              class="text-hint-c mb-2"
              style="font-size:12px"
            >
              口吻、排版、打招呼怎麼回。事實資料不要寫在這裡，AI 不會把它當知識來源。
            </p>
            <textarea
              v-model="rules.systemPrompt"
              rows="16"
              class="field-input font-mono"
              style="font-size:12.5px;margin-bottom:6px"
            />
            <button
              class="mini-btn"
              @click="restorePrompt"
            >
              還原預設
            </button>
          </div>

          <div class="panel">
            <h3
              class="font-bold text-base-c mb-3"
              style="font-size:15px"
            >
              快速回覆按鈕
            </h3>
            <label class="field-label">按鈕文字（一行一個，最多 13 個）</label>
            <textarea
              v-model="ruleText.quickReplies"
              rows="4"
              class="field-input"
              placeholder="營業時間&#10;怎麼去"
            />
            <label class="field-label">什麼時候附上</label>
            <select
              v-model="rules.quickReplyMode"
              class="field-input"
              style="margin-bottom:0"
            >
              <option value="some">
                只在問候、查無資料、歡迎訊息
              </option>
              <option value="all">
                每則回覆都附
              </option>
              <option value="off">
                不附
              </option>
            </select>
          </div>
        </div>

        <div class="space-y-4">
          <div class="panel">
            <h3
              class="font-bold text-base-c mb-3"
              style="font-size:15px"
            >
              轉接專人
            </h3>
            <label class="field-label">轉人工關鍵字（一行一個；第一個會代入訊息裡的 {關鍵字}）</label>
            <textarea
              v-model="ruleText.handoffKeywords"
              rows="3"
              class="field-input"
            />
            <label class="field-label">禁止回答的主題（一行一個，命中時改問要不要轉接）</label>
            <textarea
              v-model="ruleText.forbiddenTopics"
              rows="3"
              class="field-input"
              placeholder="退款&#10;醫療建議"
            />
            <div class="grid grid-cols-2 gap-x-3">
              <div>
                <label class="field-label">人工模式分鐘數</label>
                <input
                  v-model.number="rules.humanModeMinutes"
                  type="number"
                  min="1"
                  class="field-input"
                >
              </div>
              <div>
                <label class="field-label">回覆長度上限（字）</label>
                <input
                  v-model.number="rules.maxReplyChars"
                  type="number"
                  min="30"
                  class="field-input"
                >
              </div>
              <div>
                <label class="field-label">離峰開始</label>
                <input
                  v-model="rules.offHoursStart"
                  type="time"
                  class="field-input"
                  style="margin-bottom:0"
                >
              </div>
              <div>
                <label class="field-label">離峰結束</label>
                <input
                  v-model="rules.offHoursEnd"
                  type="time"
                  class="field-input"
                  style="margin-bottom:0"
                >
              </div>
            </div>
          </div>

          <div class="panel">
            <h3
              class="font-bold text-base-c mb-3"
              style="font-size:15px"
            >
              固定訊息
            </h3>
            <template
              v-for="m in msgFields"
              :key="m.key"
            >
              <label class="field-label">{{ m.label }}</label>
              <textarea
                v-model="rules[m.key]"
                rows="2"
                class="field-input"
              />
            </template>
          </div>

          <div class="panel">
            <h3
              class="font-bold text-base-c mb-3"
              style="font-size:15px"
            >
              進階
            </h3>
            <div class="grid grid-cols-3 gap-x-3">
              <div>
                <label class="field-label">FAQ 門檻</label>
                <input
                  v-model.number="rules.faqThreshold"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  class="field-input"
                >
              </div>
              <div>
                <label class="field-label">文件門檻</label>
                <input
                  v-model.number="rules.docThreshold"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  class="field-input"
                >
              </div>
              <div>
                <label class="field-label">對話保留天數</label>
                <input
                  v-model.number="rules.retentionDays"
                  type="number"
                  min="1"
                  class="field-input"
                >
              </div>
            </div>
            <p
              class="text-hint-c"
              style="font-size:12px"
            >
              FAQ 門檻太低會答非所問，太高會一直落到 AI 生成。先用「知識庫 › 測試問答」看「最接近的 FAQ」分數再調。
            </p>
          </div>

          <button
            class="btn-primary w-full"
            style="padding:10px 14px"
            @click="saveRules"
          >
            儲存回覆規則
          </button>
        </div>
      </div>

      <!-- ===================== Webhook 轉發 ===================== -->
      <div
        v-if="tab === 'forward' && accForm"
        class="panel"
      >
        <p
          class="text-hint-c mb-3"
          style="font-size:13px"
        >
          官方帳號原本就接了其他服務（會員集點、CRM、LINE 轉 Discord 等）時，把原本的 Webhook 網址填在這裡，
          LINE 送來的每一則事件都會原封不動轉過去（內容與簽章不改），兩邊都收得到。
        </p>
        <div
          v-if="current?.previousWebhook && !accForm.forwardText.includes(current.previousWebhook)"
          class="notice notice-blue mb-3 flex items-center gap-2 flex-wrap"
        >
          <span>接手前的網址：</span>
          <span class="code-box flex-1">{{ current.previousWebhook }}</span>
          <button
            class="mini-btn mini-primary"
            @click="addPrevious"
          >
            加入轉發
          </button>
        </div>
        <label class="field-label">轉發網址（一行一個，必須 https）</label>
        <textarea
          v-model="accForm.forwardText"
          rows="3"
          class="field-input"
        />
        <div
          v-if="forwardStats && Object.keys(forwardStats).length"
          class="mb-3 space-y-1.5"
        >
          <div
            v-for="(s, url) in forwardStats"
            :key="url"
            class="forward-stat"
          >
            <div
              class="text-base-c break-all"
              style="font-size:12.5px;font-weight:600"
            >
              {{ url }}
            </div>
            <div class="flex flex-wrap gap-1.5 mt-1">
              <span class="status-badge bg-emerald-100 text-emerald-700">今天成功 {{ s.ok }}</span>
              <span
                class="status-badge"
                :class="s.failed ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-600'"
              >失敗 {{ s.failed }}</span>
              <span
                v-if="s.lastLatencyMs"
                class="status-badge bg-stone-100 text-stone-600"
              >{{ s.lastLatencyMs }}ms</span>
              <span
                v-if="s.consecutiveFailed"
                class="status-badge bg-rose-100 text-rose-700"
              >連續失敗 {{ s.consecutiveFailed }}：{{ s.lastError }}</span>
            </div>
          </div>
        </div>
        <label class="field-label">AI 不回應的關鍵字（一行一個；例如圖文選單送出的「會員集點」）</label>
        <textarea
          v-model="accForm.ignoreText"
          rows="3"
          class="field-input"
        />
        <label class="field-label">比對方式</label>
        <select
          v-model="accForm.ignoreMatchMode"
          class="field-input"
        >
          <option value="exact">
            整則訊息完全相同才不回（建議）
          </option>
          <option value="contains">
            訊息包含關鍵字就不回
          </option>
        </select>
        <div class="flex items-center gap-2 mb-4">
          <button
            class="toggle"
            :class="accForm.welcomeWhenForwarding ? 'toggle-on' : ''"
            @click="accForm.welcomeWhenForwarding = !accForm.welcomeWhenForwarding"
          />
          <span
            class="text-base-c"
            style="font-size:13.5px"
          >有轉發時，加好友歡迎訊息也由這邊送</span>
        </div>
        <div class="flex justify-end">
          <button
            class="btn-primary"
            @click="saveAccount"
          >
            儲存
          </button>
        </div>
      </div>

      <!-- ===================== 系統狀態 ===================== -->
      <div
        v-if="tab === 'system'"
        class="panel"
      >
        <div class="flex items-center mb-3">
          <h3
            class="font-bold text-base-c"
            style="font-size:15px"
          >
            AI 模型
          </h3>
          <button
            class="mini-btn ml-auto"
            @click="loadStatus"
          >
            ↻ 重新檢查
          </button>
        </div>
        <div
          v-if="!status"
          class="text-center py-6 text-hint-c"
          style="font-size:14px"
        >
          檢查中...
        </div>
        <template v-else>
          <div class="stat-grid mb-4">
            <div class="stat-card">
              <div class="stat-label">
                來源
              </div>
              <div
                class="stat-value"
                style="font-size:17px"
              >
                {{ status.model.provider === 'gemini' ? 'Google Gemini' : status.model.provider === 'ollama' ? '本機 Ollama' : '—' }}
              </div>
            </div>
            <div
              class="stat-card"
              :style="{ borderLeftColor: status.model.ok ? '#15803d' : '#e11d48' }"
            >
              <div class="stat-label">
                狀態
              </div>
              <div
                class="stat-value"
                style="font-size:17px"
              >
                {{ status.model.ok ? '可以使用' : '無法使用' }}
              </div>
            </div>
          </div>

          <table class="w-full">
            <tbody>
            <tr
              class="border-t border-light-c"
              style="font-size:13.5px"
            >
              <td class="py-2 text-hint-c w-28">
                對話模型
              </td>
              <td class="py-2 text-base-c">
                <code>{{ status.model.chatModel }}</code>
              </td>
              <td class="py-2 text-right">
                  <span
                    class="status-badge"
                    :class="status.model.chatModelReady ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                  >
                    {{ status.model.chatModelReady ? '可用' : (status.model.provider === 'ollama' ? `未下載` : '無法使用') }}
                  </span>
              </td>
            </tr>
            <tr
              class="border-t border-light-c"
              style="font-size:13.5px"
            >
              <td class="py-2 text-hint-c">
                向量模型
              </td>
              <td class="py-2 text-base-c">
                <code>{{ status.model.embedModel }}</code>
              </td>
              <td class="py-2 text-right">
                  <span
                    class="status-badge"
                    :class="status.model.embedModelReady ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                  >
                    {{ status.model.embedModelReady ? '可用' : (status.model.provider === 'ollama' ? `未下載` : '無法使用') }}
                  </span>
              </td>
            </tr>
            <tr
              class="border-t border-light-c"
              style="font-size:13.5px"
            >
              <td class="py-2 text-hint-c">
                模型位置
              </td>
              <td
                class="py-2 text-base-c"
                colspan="2"
              >
                {{ status.model.baseUrl }}
              </td>
            </tr>
            <tr
              class="border-t border-light-c"
              style="font-size:13.5px"
            >
              <td class="py-2 text-hint-c">
                對外網址
              </td>
              <td
                class="py-2 text-base-c break-all"
                colspan="2"
              >
                {{ status.publicBaseUrl || '未設定' }}
              </td>
            </tr>
            </tbody>
          </table>

          <div
            v-if="status.model.provider === 'gemini' && status.model.apiKeySet === false"
            class="notice notice-red mt-3"
          >
            還沒設定 API Key：在 application.properties 填 <code>lineai.gemini.api-key</code>（或設定環境變數 GEMINI_API_KEY），重啟後端。
          </div>
          <div
            v-else-if="status.model.provider === 'ollama' && (!status.model.chatModelReady || !status.model.embedModelReady)"
            class="notice mt-3"
          >
            在主機執行：
            <code v-if="!status.model.chatModelReady">ollama pull {{ status.model.chatModel }}</code>
            <code v-if="!status.model.embedModelReady">ollama pull {{ status.model.embedModel }}</code>
          </div>
          <div
            v-if="status.model.error"
            class="notice notice-red mt-3 break-all"
          >
            {{ status.model.error }}
          </div>
          <div
            v-if="status.model.models?.length"
            class="text-hint-c mt-3"
            style="font-size:12.5px"
          >
            已安裝：{{ status.model.models.join('、') }}
          </div>
          <p
            class="text-hint-c mt-3"
            style="font-size:12px"
          >
            換模型來源改 application.properties 的 <code>lineai.provider</code>（gemini / ollama）。換了之後知識庫向量會自動重建，
            FAQ／文件門檻建議再用「測試問答」看分數調一次。
          </p>
        </template>
      </div>
    </div>

    <!-- ===== 刪除帳號 Modal ===== -->
    <div
      v-if="pendingDelete"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 px-4"
      @mousedown="onBackdropMousedown"
      @click="onBackdropClick($event, () => pendingDelete = null)"
    >
      <div class="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-5">
        <h2
          class="font-bold text-base-c mb-2"
          style="font-size:16px"
        >
          刪除「{{ pendingDelete.name }}」？
        </h2>
        <p
          class="text-hint-c"
          style="font-size:13.5px"
        >
          會停止這個帳號的自動回覆，資料移到 line-ai/_trash 資料夾。LINE 後台的 Webhook 設定不會自動清除。
        </p>
        <div class="flex justify-end gap-2 mt-4">
          <button
            class="btn-plain"
            @click="pendingDelete = null"
          >
            取消
          </button>
          <button
            class="btn-danger"
            @click="deleteAccount"
          >
            刪除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', requiredPermission: 'content.line-ai' })
useHead({ title: 'LINE AI 客服 · 設定' })

const { api, accounts, accountId, current, loadAccounts, selectAccount, errMsg, SOURCE_LABEL } = useLineAi()

// Modal 背景點擊關閉：mousedown 跟 click 都落在背景本身才關
const backdropMouseDownOnSelf = ref(false)
function onBackdropMousedown(e: MouseEvent) {
  backdropMouseDownOnSelf.value = e.target === e.currentTarget
}
function onBackdropClick(e: MouseEvent, close: () => void) {
  if (backdropMouseDownOnSelf.value && e.target === e.currentTarget) close()
  backdropMouseDownOnSelf.value = false
}

const pillActiveStyle = { background: '#15803d', borderColor: '#15803d', color: '#fff' }

const tabs = [
  { key: 'account', label: '帳號與連線' },
  { key: 'shop', label: '店家資訊' },
  { key: 'rules', label: '回覆規則' },
  { key: 'forward', label: 'Webhook 轉發' },
  { key: 'system', label: '系統狀態' },
] as const
const tab = ref<(typeof tabs)[number]['key']>('account')

const flash = ref<{ ok: boolean; text: string } | null>(null)
const accForm = ref<any>(null)
const newAcc = ref({ name: '', channelSecret: '', accessToken: '', copyFrom: '' })
const verifyInfo = ref<any>(null)
const stats = ref<any>(null)
const quota = ref<any>(null)
const shop = ref<any>(null)
const rules = ref<any>(null)
const ruleText = ref({ handoffKeywords: '', forbiddenTopics: '', quickReplies: '' })
const forwardStats = ref<any>(null)
const status = ref<any>(null)
const pendingDelete = ref<any>(null)

const msgFields = [
  { key: 'msgNoData', label: '查無資料' },
  { key: 'msgHandoff', label: '轉人工' },
  { key: 'msgOffHours', label: '離峰時段轉人工（留空就用上面那則）' },
  { key: 'msgForbidden', label: '禁止主題（會附「要，轉接專人」「不用了」按鈕）' },
  { key: 'msgDecline', label: '顧客說不用轉接' },
  { key: 'msgGreeting', label: '問候（模型不可用時的備用）' },
  { key: 'msgWelcome', label: '加好友歡迎訊息（留空不送）' },
]

const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)

function showFlash(ok: boolean, text: string) {
  flash.value = { ok, text }
  setTimeout(() => { if (flash.value?.text === text) flash.value = null }, 5000)
}

function fillAccForm() {
  const a = current.value
  if (!a) { accForm.value = null; return }
  accForm.value = {
    name: a.name,
    enabled: a.enabled,
    channelSecret: a.channelSecret,
    accessToken: a.accessToken,
    notifyText: (a.notifyUserIds || []).join('\n'),
    forwardText: (a.forwardUrls || []).join('\n'),
    ignoreText: (a.ignoreKeywords || []).join('\n'),
    ignoreMatchMode: a.ignoreMatchMode || 'exact',
    welcomeWhenForwarding: !!a.welcomeWhenForwarding,
  }
}

async function loadStats() {
  if (!accountId.value) return
  const id = accountId.value
  stats.value = await api(`/accounts/${id}/stats`).catch(() => null)
  quota.value = await api(`/accounts/${id}/quota`).catch(() => null)
}

async function loadAccountData() {
  verifyInfo.value = null
  fillAccForm()
  if (!accountId.value) return
  const id = accountId.value
  const [s, r, f] = await Promise.all([
    api(`/${id}/shop`).catch(() => null),
    api(`/${id}/rules`).catch(() => null),
    api(`/accounts/${id}/forward-stats`).catch(() => null),
  ])
  shop.value = s
  rules.value = r
  forwardStats.value = f
  if (r) {
    ruleText.value = {
      handoffKeywords: (r as any).handoffKeywords.join('\n'),
      forbiddenTopics: (r as any).forbiddenTopics.join('\n'),
      quickReplies: (r as any).quickReplies.join('\n'),
    }
  }
  loadStats()
}

async function loadStatus() {
  status.value = await api('/status').catch(e => ({ model: { ok: false, error: errMsg(e) } }))
}

// ───── 帳號 ─────
async function saveAccount() {
  const f = accForm.value
  try {
    await api(`/accounts/${accountId.value}`, {
      method: 'PUT',
      body: {
        name: f.name,
        enabled: f.enabled,
        channelSecret: f.channelSecret,
        accessToken: f.accessToken,
        notifyUserIds: lines(f.notifyText),
        forwardUrls: lines(f.forwardText),
        ignoreKeywords: lines(f.ignoreText),
        ignoreMatchMode: f.ignoreMatchMode,
        welcomeWhenForwarding: f.welcomeWhenForwarding,
      },
    })
    await loadAccounts()
    fillAccForm()
    showFlash(true, '已儲存')
  } catch (e) {
    showFlash(false, errMsg(e))
  }
}

async function createAccount() {
  if (!newAcc.value.name.trim()) return showFlash(false, '請填名稱')
  try {
    const a: any = await api('/accounts', { method: 'POST', body: newAcc.value })
    newAcc.value = { name: '', channelSecret: '', accessToken: '', copyFrom: '' }
    await loadAccounts()
    selectAccount(a.id)
    await loadAccountData()
    showFlash(true, a.botName ? `已新增，LINE 帳號：${a.botName}` : '已新增（憑證還沒驗證成功）')
  } catch (e) {
    showFlash(false, errMsg(e))
  }
}

async function deleteAccount() {
  const id = pendingDelete.value.id
  pendingDelete.value = null
  try {
    await api(`/accounts/${id}`, { method: 'DELETE' })
    await loadAccounts()
    await loadAccountData()
    showFlash(true, '已刪除')
  } catch (e) {
    showFlash(false, errMsg(e))
  }
}

async function verify() {
  try {
    const r: any = await api(`/accounts/${accountId.value}/verify`, { method: 'POST' })
    if (!r.ok) return showFlash(false, r.message)
    verifyInfo.value = r
    await loadAccounts()
    showFlash(true, `驗證成功：${r.botName}（${r.basicId}）`)
  } catch (e) {
    showFlash(false, errMsg(e))
  }
}

async function syncWebhook() {
  try {
    const r: any = await api(`/accounts/${accountId.value}/sync-webhook`, { method: 'POST' })
    if (!r.ok) return showFlash(false, r.message)
    await loadAccounts()
    await verify()
    showFlash(r.testSuccess, r.testSuccess
      ? '已寫入 LINE，連線測試成功'
      : `已寫入 LINE，但連線測試失敗：${r.testDetail}（確認後端對外 https 憑證有效、防火牆有開）`)
  } catch (e) {
    showFlash(false, errMsg(e))
  }
}

async function testNotify() {
  try {
    const r: any = await api(`/accounts/${accountId.value}/test-notify`, { method: 'POST' })
    showFlash(r.ok, r.ok ? '已送出測試通知，請看手機' : (r.message || '送出失敗'))
  } catch (e) {
    showFlash(false, errMsg(e))
  }
}

function addPrevious() {
  const prev = current.value?.previousWebhook
  if (!prev) return
  accForm.value.forwardText = [...lines(accForm.value.forwardText), prev].join('\n')
}

// ───── 店家資訊 / 規則 ─────
async function saveShop() {
  try {
    shop.value = await api(`/${accountId.value}/shop`, { method: 'PUT', body: shop.value })
    showFlash(true, '店家資訊已儲存')
  } catch (e) {
    showFlash(false, errMsg(e))
  }
}

async function restorePrompt() {
  const r: any = await api('/default-system-prompt').catch(() => null)
  if (r) rules.value.systemPrompt = r.prompt
}

async function saveRules() {
  try {
    rules.value = await api(`/${accountId.value}/rules`, {
      method: 'PUT',
      body: {
        ...rules.value,
        handoffKeywords: lines(ruleText.value.handoffKeywords),
        forbiddenTopics: lines(ruleText.value.forbiddenTopics),
        quickReplies: lines(ruleText.value.quickReplies),
      },
    })
    showFlash(true, '回覆規則已儲存')
  } catch (e) {
    showFlash(false, errMsg(e))
  }
}

watch(tab, (t) => {
  if (t === 'system' && !status.value) loadStatus()
})

onMounted(async () => {
  try {
    await loadAccounts()
  } catch (e) {
    showFlash(false, errMsg(e))
  }
  await loadAccountData()
})
</script>

<style scoped>
.panel {
  background: var(--surface);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
  overflow-x: auto;
}

.pill-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
}

.pill-btn:hover {
  border-color: var(--accent);
  color: var(--text);
}

.pill-active, .pill-active:hover {
  background: #15803d;
  border-color: #15803d;
  color: #fff;
}

.field-label {
  display: block;
  color: var(--text-hint);
  font-size: 13px;
  margin-bottom: 4px;
}

.field-input {
  display: block;
  width: 100%;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: var(--surface2);
  color: var(--text);
  font-size: 14px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.stat-card {
  background: var(--surface);
  border-radius: 12px;
  padding: 12px 14px;
  border-left: 4px solid #15803d;
  box-shadow: var(--shadow);
}

.stat-label {
  font-size: 12.5px;
  color: var(--text-hint);
  font-weight: 600;
}

.stat-value {
  font-size: 23px;
  font-weight: 700;
  color: var(--text);
  margin-top: 2px;
}

.status-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.flash {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
}

.flash-ok {
  background: rgba(21, 128, 61, .12);
  color: #15803d;
}

.flash-err {
  background: rgba(225, 29, 72, .1);
  color: #e11d48;
}

.notice {
  background: rgba(217, 119, 6, .1);
  color: #b45309;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
}

.notice-blue {
  background: rgba(37, 99, 235, .08);
  color: #1d4ed8;
}

.notice-red {
  background: rgba(225, 29, 72, .08);
  color: #be123c;
}

.code-box {
  background: var(--surface2);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 6px 10px;
  font-family: ui-monospace, monospace;
  font-size: 12.5px;
  color: var(--text);
  word-break: break-all;
}

.forward-stat {
  background: var(--surface2);
  border-radius: 8px;
  padding: 8px 10px;
}

.mini-btn {
  padding: 5px 10px;
  border-radius: 6px;
  background: var(--surface2);
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
}

.mini-btn:hover {
  background: var(--bg);
}

.mini-primary {
  background: #15803d;
  color: #fff;
}

.mini-primary:hover {
  background: #15803d;
  filter: brightness(1.08);
}

.mini-danger {
  background: transparent;
  border: 1px solid #e11d48;
  color: #e11d48;
}

.btn-plain {
  padding: 7px 14px;
  border-radius: 8px;
  background: var(--surface2);
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
}

.btn-plain:hover {
  background: var(--bg);
}

.btn-primary {
  padding: 7px 14px;
  border-radius: 8px;
  background: #15803d;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.btn-primary:disabled {
  opacity: .5;
}

.btn-danger {
  padding: 7px 14px;
  border-radius: 8px;
  background: #e11d48;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.toggle {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: var(--border);
  border: none;
  flex-shrink: 0;
}

.toggle-on {
  background: #22c55e;
}

.toggle::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: left .15s;
}

.toggle-on::after {
  left: 18px;
}

code {
  background: var(--surface2);
  padding: 0 4px;
  border-radius: 4px;
  font-size: 12.5px;
}
</style>
