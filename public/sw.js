/* 크로닛 서비스워커 — 웹푸시 수신 + PWA 설치 요건 충족 */

self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })

// 일부러 캐시하지 않는다.
// 앱 배포는 해시 파일명 + must-revalidate 로 최신본을 보장하는데, 여기서 캐싱하면
// 옛 번들이 남아 배포가 반영되지 않는다. (설치 요건상 fetch 핸들러는 있어야 해서 통과만 시킨다)
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch {
    try { d = { body: event.data.text() } } catch { d = {} }
  }
  const title = d.title || '크로닛'
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: '/favicon-192.png',
    badge: '/favicon-192.png',
    tag: d.tag || 'chronit',
    data: { url: d.url || '/trend' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = (event.notification.data && event.notification.data.url) || '/trend'
  event.waitUntil((async () => {
    const target = new URL(raw, self.location.origin)
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // 이미 열려 있는 크로닛 탭이 있으면 그 탭을 쓰고, 없을 때만 새로 연다
    for (const c of wins) {
      try {
        if (new URL(c.url).origin !== target.origin) continue
        await c.focus()
        if ('navigate' in c) await c.navigate(target.href)
        return
      } catch { /* 다음 탭 */ }
    }
    await self.clients.openWindow(target.href)
  })())
})
