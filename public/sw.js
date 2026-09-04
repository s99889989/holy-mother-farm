// 放在 Nuxt 3 的 public/sw.js（build 後會直接部署在網站根目錄 /sw.js，
// 這點很重要：Service Worker 的作用範圍是它自己所在的路徑，放在根目錄才能管到整個網站）

self.addEventListener('push', function (event) {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: '聖母健康農莊', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || '聖母健康農莊'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',   // 換成實際存在的 icon 路徑，沒有的話瀏覽器會顯示預設圖示
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: 'holymotherfarm-push', // 同一個 tag 的新通知會直接取代舊的，不會在通知中心堆一堆舊訊息
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
