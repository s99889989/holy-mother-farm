<template>
  <div class="push-settings">
    <div class="push-settings__row">
      <div class="push-settings__label">
        <span class="push-settings__title">手機／電腦推播通知</span>
        <span class="push-settings__desc">{{ statusText }}</span>
      </div>
      <button
        class="push-settings__btn"
        :class="{ 'push-settings__btn--on': subscribed }"
        :disabled="loading || !supported"
        @click="toggleSubscribe"
      >
        {{ subscribed ? '已開啟' : '開啟通知' }}
      </button>
    </div>

    <p v-if="!supported" class="push-settings__warn">
      這個瀏覽器不支援推播通知。iPhone 請先「加入主畫面」變成 App 後，用主畫面上的圖示打開才能收到通知。
    </p>
    <p v-if="errorMsg" class="push-settings__warn">{{ errorMsg }}</p>

    <div class="push-settings__divider"></div>

    <div class="push-settings__row">
      <div class="push-settings__label">
        <span class="push-settings__title">新訂單即時通知</span>
        <span class="push-settings__desc">有新的訂位或便當訂單時立即推播</span>
      </div>
      <label class="push-settings__switch">
        <input type="checkbox" v-model="newOrderPushEnabled" @change="saveSetting" />
        <span class="push-settings__slider"></span>
      </label>
    </div>

    <div class="push-settings__row">
      <div class="push-settings__label">
        <span class="push-settings__title">每日提醒時間</span>
        <span class="push-settings__desc">每天固定時間推播「今日訂位/便當共 X 筆」，留空代表關閉</span>
      </div>
      <input
        type="time"
        class="push-settings__time"
        v-model="reminderTime"
        @change="saveSetting"
      />
    </div>

    <p v-if="saveMsg" class="push-settings__save-msg">{{ saveMsg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { usePushNotification } from '~/composables/usePushNotification'

const { isSupported, getPermissionState, subscribe, unsubscribe, isSubscribed } = usePushNotification()

const supported = ref(true)
const subscribed = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const saveMsg = ref('')

const newOrderPushEnabled = ref(true)
const reminderTime = ref('') // HH:mm，空字串代表關閉每日提醒

const statusText = computed(() => {
  if (!supported.value) return '此裝置不支援'
  return subscribed.value ? '這台裝置會收到通知' : '尚未開啟，點右邊按鈕開啟'
})

onMounted(async () => {
  supported.value = isSupported()
  if (supported.value) {
    subscribed.value = await isSubscribed()
  }
  await loadSetting()
})

async function toggleSubscribe() {
  errorMsg.value = ''
  loading.value = true
  try {
    if (subscribed.value) {
      await unsubscribe()
      subscribed.value = false
    } else {
      // staffName 可換成登入者姓名（若系統有登入資訊可帶入，方便後台知道是誰的裝置）
      await subscribe('')
      subscribed.value = true
    }
  } catch (e) {
    errorMsg.value = e?.message || '設定失敗，請重試'
  } finally {
    loading.value = false
  }
}

async function loadSetting() {
  try {
    const data = await $fetch('/holy/push/setting/get')
    newOrderPushEnabled.value = data.newOrderPushEnabled
    reminderTime.value = data.reminderTime || ''
  } catch (e) {
    // 讀取設定失敗不影響訂閱功能本身，靜默略過即可
  }
}

async function saveSetting() {
  saveMsg.value = ''
  try {
    await $fetch('/holy/push/setting/save', {
      method: 'PUT',
      body: {
        newOrderPushEnabled: newOrderPushEnabled.value,
        reminderTime: reminderTime.value,
      },
    })
    saveMsg.value = '已儲存'
    setTimeout(() => (saveMsg.value = ''), 2000)
  } catch (e) {
    saveMsg.value = '儲存失敗'
  }
}
</script>

<style scoped>
.push-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #fafafa;
  border: 1px solid #eee;
}

.push-settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.push-settings__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.push-settings__title {
  font-weight: 600;
  font-size: 14px;
}

.push-settings__desc {
  font-size: 12px;
  color: #888;
}

.push-settings__btn {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #ccc;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}

.push-settings__btn--on {
  background: #6a4fc7;
  border-color: #6a4fc7;
  color: #fff;
}

.push-settings__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.push-settings__divider {
  height: 1px;
  background: #e5e5e5;
}

.push-settings__warn {
  font-size: 12px;
  color: #c0392b;
  margin: 0;
}

.push-settings__save-msg {
  font-size: 12px;
  color: #2e7d32;
  margin: 0;
}

.push-settings__time {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 14px;
}

.push-settings__switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
}

.push-settings__switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.push-settings__slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #ccc;
  transition: 0.2s;
  border-radius: 24px;
}

.push-settings__slider::before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

.push-settings__switch input:checked + .push-settings__slider {
  background-color: #6a4fc7;
}

.push-settings__switch input:checked + .push-settings__slider::before {
  transform: translateX(18px);
}
</style>
