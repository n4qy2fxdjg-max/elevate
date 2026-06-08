// Imported by the generated Workbox service worker (see vite.config.ts).
// Handles backgrounded push reminders. The push is bodyless; we fetch the text
// to show from the server so rest-end vs. set-reminder display correctly.

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'Elevate'
    let body = 'Back to your workout'
    try {
      const sub = await self.registration.pushManager.getSubscription()
      if (sub) {
        const res = await fetch('/api/push/pending?endpoint=' + encodeURIComponent(sub.endpoint))
        if (res.ok) {
          const j = await res.json()
          if (j && j.title) title = j.title
          if (j && j.body) body = j.body
        }
      }
    } catch (e) { /* fall back to generic text */ }

    await self.registration.showNotification(title, {
      body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: 'elevate-reminder',
      renotify: true,
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of clientsArr) {
      if ('focus' in c) { c.focus(); return }
    }
    if (self.clients.openWindow) await self.clients.openWindow('/active')
  })())
})
