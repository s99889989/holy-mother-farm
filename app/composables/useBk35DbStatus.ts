// 共用的 BK35 / BKSQL 資料庫連線狀態
// 用 module-level 的 ref，讓所有頁面共用同一份狀態跟快取，
// 避免每個頁面各自打一次 /status，也避免使用者在資料庫關閉時
// 每次查詢都要等 TCP/TLS 逾時（約 10 秒）才知道失敗。

const bk35menuAttached = ref<boolean | null>(null) // null = 尚未檢查過
const bksqlAttached = ref<boolean | null>(null)
const checking = ref(false)
let checkedAt = 0
const CACHE_MS = 15000 // 15 秒內重複呼叫直接吃快取

export function useBk35DbStatus() {
  const commonStore = useCommonStore()
  const apiBase = computed(() => commonStore.data.main_url)

  async function checkStatus(force = false) {
    if (!force && checkedAt > 0 && Date.now() - checkedAt < CACHE_MS) return
    checking.value = true
    try {
      const res = await $fetch<{ bk35menuAttached: boolean; bksqlAttached: boolean }>(
        `${apiBase.value}/holy/bk35sql/admin/status`,
        { credentials: 'include', query: force ? { force: true } : {} }
      )
      if (res) {
        bk35menuAttached.value = res.bk35menuAttached
        bksqlAttached.value = res.bksqlAttached
        checkedAt = Date.now()
      }
    } catch {
      // 狀態查詢本身失敗（例如服務還沒起來），視為「不確定」，
      // 不強制擋住畫面，讓使用者照舊嘗試查詢並看到實際錯誤訊息
    } finally {
      checking.value = false
    }
  }

  return { bk35menuAttached, bksqlAttached, checking, checkStatus }
}
