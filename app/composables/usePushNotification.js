// composables/usePushNotification.js
// 封裝瀏覽器推播訂閱流程：註冊 Service Worker → 要求通知權限 → 訂閱 Push → 存到後端
export function usePushNotification() {
  // TODO：換成後端產生的 VAPID public key（見 README 產生方式）
  const VAPID_PUBLIC_KEY = 'PASTE_YOUR_VAPID_PUBLIC_KEY_HERE'

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  function isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  function getPermissionState() {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission // 'default' | 'granted' | 'denied'
  }

  // 訂閱推播，staffName 選填（純粹方便在後台辨識是哪個員工/裝置）
  async function subscribe(staffName = '') {
    if (!isSupported()) throw new Error('此瀏覽器不支援推播通知')

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('使用者未允許通知權限')

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const json = subscription.toJSON()
    await $fetch('/holy/push/subscription/save', {
      method: 'POST',
      body: {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        staffName,
      },
    })

    return subscription
  }

  async function unsubscribe() {
    if (!('serviceWorker' in navigator)) return
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await $fetch('/holy/push/subscription/remove', { method: 'DELETE', body: endpoint })
  }

  // 目前這台裝置是否已經訂閱（用來初始化設定頁的開關狀態）
  async function isSubscribed() {
    if (!isSupported()) return false
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  }

  return { isSupported, getPermissionState, subscribe, unsubscribe, isSubscribed }
}
