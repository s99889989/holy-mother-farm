<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

// 這頁是公開頁(掃碼不用登入),所以不用 staff layout
definePageMeta({ layout: false })

// ⚠️ 假設跟後台共用同一個 API 網域。如果 QR Code 實際指向的是另一個
// 獨立部署的專案(例如 holyfarm.netlify.app 是另一個 repo),
// 這裡的 API_BASE 要改成寫死的正式站網址，不能依賴 useCommonStore。
const commonStore = useCommonStore?.()
const API_BASE = computed(() =>
  (commonStore?.data?.main_url || 'https://your-api-domain.com') + '/holy/fire-extinguisher'
)

const route = useRoute()
const code = route.params.code

const items = ["外觀(無銹蝕變形)", "壓力表(指針在綠區)", "安全插銷/鉛封", "軟管/噴嘴", "標示牌與效期", "放置狀態正常"]
const state = reactive({})
const notes = reactive({})
items.forEach(i => { state[i] = null; notes[i] = '' })

const extinguisher = ref(null)
const loading = ref(true)
const loadError = ref('')

async function loadExtinguisher() {
  loading.value = true
  try {
    const data = await $fetch(`${API_BASE.value}/get/${encodeURIComponent(code)}`)
    if (data?.error) { loadError.value = data.error } else { extinguisher.value = data }
  } catch (e) {
    console.error(e)
    loadError.value = '無法載入滅火器資料'
  } finally {
    loading.value = false
  }
}
onMounted(loadExtinguisher)

const doneCount = computed(() => items.filter(i => state[i] !== null).length)
const hasFail = computed(() => items.some(i => state[i] === 'fail'))
const gaugeOffset = computed(() => 157 - (157 * doneCount.value / items.length))
const gaugeColor = computed(() =>
  doneCount.value === items.length ? '#2F7D5C' : (hasFail.value ? '#B4740E' : '#C1272D')
)

const photoFile = ref(null)
const photoPreview = ref('')
function onPhotoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  photoFile.value = file
  photoPreview.value = URL.createObjectURL(file)
}

const failWithoutNote = computed(() =>
  items.some(i => state[i] === 'fail' && !notes[i].trim())
)
const canSubmit = computed(() =>
  doneCount.value === items.length && photoFile.value && !failWithoutNote.value
)

const submitting = ref(false)
const submitted = ref(false)
const submitError = ref('')
const submitStamp = ref('')

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  submitError.value = ''
  try {
    const checklist = {}
    let combinedNote = ''
    items.forEach(i => {
      checklist[i] = state[i]
      if (state[i] === 'fail' && notes[i]) combinedNote += `【${i}】${notes[i]}\n`
    })

    const formData = new FormData()
    formData.append('code', code)
    formData.append('checklist', JSON.stringify(checklist))
    formData.append('note', combinedNote)
    formData.append('photo', photoFile.value)

    const res = await fetch(`${API_BASE.value}/inspection/save`, { method: 'POST', body: formData })
    const result = await res.json()
    if (result?.error) { submitError.value = result.error; return }

    submitted.value = true
    submitStamp.value = result.inspectedAt || new Date().toLocaleString('zh-TW')
  } catch (e) {
    console.error(e)
    submitError.value = '送出失敗，請檢查網路後再試一次'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div style="min-height:100vh;background:#F5F6F4;font-family:'Noto Sans TC','PingFang TC',sans-serif;">
    <div style="height:6px;width:100%;background:repeating-linear-gradient(135deg,#1C2321 0 10px,#B4740E 10px 20px);"></div>

    <div style="max-width:420px;margin:0 auto;padding:16px 18px 40px;">

      <div style="display:flex;align-items:center;gap:8px;margin:14px 0 18px;">
        <div style="width:28px;height:28px;border-radius:8px;background:#C1272D;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;">🧯</div>
        <span style="font-weight:700;color:#1C2321;">滅火器巡檢</span>
      </div>

      <p v-if="loading" style="text-align:center;color:#5B615D;padding:40px 0;">載入中...</p>

      <p v-else-if="loadError" style="text-align:center;color:#C1272D;padding:40px 0;">{{ loadError }}</p>

      <template v-else-if="!submitted">
        <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#2F7D5C;font-weight:500;margin-bottom:16px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#2F7D5C;"></span>
          已掃描,連結至該滅火器
        </div>

        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:20px;">
          <svg width="120" height="70" viewBox="0 0 120 70">
            <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke="#DADDD6" stroke-width="10" stroke-linecap="round"/>
            <path d="M10 65 A50 50 0 0 1 110 65" fill="none" :stroke="gaugeColor" stroke-width="10" stroke-linecap="round"
                  stroke-dasharray="157" :stroke-dashoffset="gaugeOffset" style="transition:stroke-dashoffset .3s,stroke .3s"/>
          </svg>
          <div style="font-family:'Oswald',sans-serif;font-size:26px;font-weight:600;margin-top:-8px;color:#1C2321;">{{ doneCount }}/{{ items.length }}</div>
          <div style="font-size:12px;color:#5B615D;">已完成檢查項目</div>
        </div>

        <div style="background:#fff;border:1px dashed #DADDD6;border-radius:12px;padding:14px 16px;margin-bottom:20px;font-family:'IBM Plex Mono',monospace;font-size:13px;">
          <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#5B615D;">編號</span><span>{{ extinguisher.code }}</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#5B615D;">位置</span><span>{{ extinguisher.location }}</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#5B615D;">批號</span><span>{{ extinguisher.batchNo }}</span></div>
        </div>

        <div style="font-size:13px;color:#5B615D;margin:0 0 8px;font-weight:500;">檢查項目</div>
        <div v-for="i in items" :key="i" style="background:#fff;border:1px solid #DADDD6;border-radius:12px;padding:12px 14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span style="font-size:14px;">{{ i }}</span>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button
                @click="state[i] = 'pass'"
                :style="{padding:'6px 12px',fontSize:'12px',borderRadius:'8px',border:'1px solid ' + (state[i]==='pass' ? '#9FCBB4' : '#DADDD6'),background: state[i]==='pass' ? '#E4F1EA' : '#fff',color: state[i]==='pass' ? '#2F7D5C' : '#5B615D'}"
              >正常</button>
              <button
                @click="state[i] = 'fail'"
                :style="{padding:'6px 12px',fontSize:'12px',borderRadius:'8px',border:'1px solid ' + (state[i]==='fail' ? '#E7A6A2' : '#DADDD6'),background: state[i]==='fail' ? '#FBE8E7' : '#fff',color: state[i]==='fail' ? '#C1272D' : '#5B615D'}"
              >異常</button>
            </div>
          </div>
          <textarea
            v-if="state[i] === 'fail'"
            v-model="notes[i]"
            placeholder="請描述異常狀況(必填)"
            style="width:100%;margin-top:10px;border:1px solid #E7A6A2;border-radius:8px;padding:8px 10px;font-size:13px;resize:vertical;min-height:52px;background:#FBE8E7;font-family:inherit;"
          ></textarea>
        </div>

        <div style="font-size:13px;color:#5B615D;margin:14px 0 8px;font-weight:500;">拍照佐證</div>
        <label style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px dashed #DADDD6;border-radius:12px;padding:26px;cursor:pointer;background:#fff;margin-bottom:22px;">
          <template v-if="photoPreview">
            <img :src="photoPreview" style="width:100%;max-height:160px;object-fit:cover;border-radius:8px;">
          </template>
          <template v-else>
            <span style="font-size:22px;">📷</span>
            <span style="font-size:13px;color:#5B615D;">點擊拍攝壓力表與外觀</span>
          </template>
          <input type="file" accept="image/*" capture="environment" style="display:none" @change="onPhotoChange">
        </label>

        <p v-if="submitError" style="color:#C1272D;font-size:13px;text-align:center;margin-bottom:10px;">{{ submitError }}</p>

        <button
          :disabled="!canSubmit || submitting"
          @click="submit"
          :style="{width:'100%',padding:'14px',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:600,
                   background: (!canSubmit || submitting) ? '#C9CCC6' : '#1C2321',
                   color: (!canSubmit || submitting) ? '#8B8E88' : '#fff',
                   cursor: (!canSubmit || submitting) ? 'not-allowed' : 'pointer'}"
        >
          {{ submitting ? '送出中...' : (canSubmit ? '送出檢查紀錄' : `送出檢查紀錄(${doneCount}/${items.length}${photoFile ? '' : ',尚未拍照'}${failWithoutNote ? ',請填寫異常說明' : ''})`) }}
        </button>
      </template>

      <div v-else style="text-align:center;padding:36px 10px;">
        <div style="width:56px;height:56px;border-radius:50%;background:#E4F1EA;border:1px solid #9FCBB4;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:26px;color:#2F7D5C;">✓</div>
        <h3 style="font-family:'Oswald',sans-serif;font-size:18px;margin:0 0 6px;color:#1C2321;">檢查紀錄已送出</h3>
        <p style="font-size:13px;color:#5B615D;font-family:'IBM Plex Mono',monospace;margin:0;">{{ submitStamp }}</p>
      </div>

    </div>
  </div>
</template>
