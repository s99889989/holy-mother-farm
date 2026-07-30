/**
 * 平面圖矩形／線條座標（快樂運動館 / 合力居 / 愛加倍），改成存在後端資料庫，
 * 不再是寫死在前端檔案裡。RoomFloorplan.vue（顯示用）跟房間管理的「矩形對應」頁面
 * （指定房間對應的矩形、拖拽調整位置）共用同一份透過這個 composable 抓下來的資料，
 * 改一次、所有用到 <RoomFloorplan> 的頁面都會同步更新。
 *
 * 用 Nuxt 的 useState 存共用狀態（而不是 module 最外層的 reactive），
 * 這樣 SSR 情境下每個請求會拿到自己獨立的一份，不會跨使用者共用到同一個全域物件。
 *
 * 用法：
 *   const { shapesOf, canvasOf, shapeRectFor, saveShape, deleteShape } = useFloorplanShapes()
 *   shapesOf(buildingId)              -- 該棟別目前的矩形/線條陣列（reactive，拖拽時會即時反映）
 *   shapeRectFor(buildingId, shapeId) -- 依 shapeId 找矩形座標，找不到回傳 null
 *   saveShape(buildingId, shape)      -- 新增（shape 沒有 id）或更新（shape 有 id）一個矩形/線條
 *   deleteShape(buildingId, shapeId)  -- 刪除
 *
 * A、B、C 三個棟別 id 只對應到兩組資料：A 用 'A'，B / C 共用 'BC'（兩棟畫在同一張底圖上）。
 */

// 手繪牆面畫布尺寸（像素）。跟矩形/線條不同，這組尺寸目前不開放後台調整，維持固定常數。
export const REAL_CANVAS = {
  A: { w: 1360, h: 780 },
  B: { w: 1195, h: 896 },
  C: { w: 1195, h: 896 }
}

export function wallShapeKey(buildingId) {
  return buildingId === 'A' ? 'A' : 'BC'
}

export function useFloorplanShapes() {
  const commonStore = useCommonStore()
  const BASE = () => commonStore.data.main_url + '/holy/rooms/settings'

  const shapesByGroup = useState('floorplan-shapes-by-group', () => ({ A: [], BC: [] }))
  const loaded = useState('floorplan-shapes-loaded', () => false)
  const loading = useState('floorplan-shapes-loading', () => false)

  async function load(force) {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const data = await (await fetch(`${BASE()}/shapes`)).json()
      shapesByGroup.value.A = data.A || []
      shapesByGroup.value.BC = data.BC || []
      loaded.value = true
    } catch (e) {
      console.error('讀取平面圖矩形資料失敗', e)
    } finally {
      loading.value = false
    }
  }
  // 只在瀏覽器端掛載後才 fetch：SSR 階段 fetch 需要絕對網址，main_url 常常是像 /api 這種
  // 相對路徑，直接在 setup() 裡同步呼叫會在伺服器端噴 "Failed to parse URL" 的錯誤。
  // onMounted 只會在 client 端執行，等頁面真的在瀏覽器跑起來才發這個請求就沒問題。
  onMounted(() => {
    if (!loaded.value && !loading.value) load()
  })

  function shapesOf(buildingId) {
    return shapesByGroup.value[wallShapeKey(buildingId)] || []
  }
  function canvasOf(buildingId) {
    return REAL_CANVAS[buildingId] || { w: 0, h: 0 }
  }
  function shapeRectFor(buildingId, shapeId) {
    if (!shapeId) return null
    return shapesOf(buildingId).find(s => s.id === shapeId && s.type === 'rect') || null
  }

  // shape 沒帶 id 就是新增，帶 id 就是更新既有矩形/線條的座標。
  // 存檔成功後直接把最新內容整批 reload，確保跟資料庫同步（例如新增後拿到真正的 id）。
  async function saveShape(buildingId, shape) {
    const group = wallShapeKey(buildingId)
    const res = await fetch(`${BASE()}/shapes/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group, shape })
    })
    const saved = await res.json()
    await load(true)
    return saved
  }

  async function deleteShape(buildingId, shapeId) {
    const group = wallShapeKey(buildingId)
    await fetch(`${BASE()}/shapes/${group}/${shapeId}`, { method: 'DELETE' })
    await load(true)
  }

  return { shapesByGroup, loaded, loading, load, shapesOf, canvasOf, shapeRectFor, saveShape, deleteShape }
}
