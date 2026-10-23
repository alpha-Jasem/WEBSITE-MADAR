// Madar Outreach service worker: push notifications only (no caching, so app updates are never stale).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = { body: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(data.title || 'مدار', {
    body: data.body || '',
    icon: '/admin-icon-192.png',
    badge: '/admin-badge-96.png',
    tag: data.tag || 'outreach',
    dir: 'rtl',
    lang: 'ar',
    data: { url: data.url || '/admin/outreach' },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/admin/outreach'
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus() } }
    return self.clients.openWindow(url)
  }))
})
