// Alyame Attendance — Service Worker (push only, NO caching)
// Caching removed — was causing stale-page issues for some users.

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Clean up ALL old caches from previous SW versions
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// NO fetch handler — let the browser handle everything natively.
// This avoids any stale/broken cached responses.

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'notify') {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title, {
      body, icon: 'assets/logo.png', badge: 'assets/logo.png',
      tag: tag || 'alyame', vibrate: [400,200,400,200,400], requireInteraction: false
    });
  }
});

self.addEventListener('push', e => {
  let data = { title:'حضور اليامي', body:'لديك تنبيه جديد' };
  try {
    if (e.data) {
      try { data = e.data.json(); }
      catch(_) { data = { title:'حضور اليامي', body: e.data.text() || 'لديك تنبيه جديد' }; }
    }
  } catch(_){}
  // Always show a notification (iOS/Android require userVisibleOnly — must display something)
  e.waitUntil(
    self.registration.showNotification(data.title || 'حضور اليامي', {
      body: data.body || '',
      icon: 'assets/logo.png',
      badge: 'assets/logo.png',
      vibrate: [400,200,400,200,400],
      tag: data.tag || ('alyame-' + Date.now()),
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || './dashboard.html' }
    }).catch(() => self.registration.showNotification('حضور اليامي', { body:'لديك تنبيه جديد', icon:'assets/logo.png' }))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './dashboard.html';
  e.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});

// Auto re-subscribe when the push subscription expires/rotates.
// The browser fires this when an endpoint dies — we silently create a new one.
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    try {
      const oldSub = e.oldSubscription || (await self.registration.pushManager.getSubscription());
      const appServerKey = oldSub && oldSub.options ? oldSub.options.applicationServerKey : null;
      if (!appServerKey) return;
      const newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey
      });
      // Notify any open client to persist the new subscription
      const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
      for (const c of clientsList) {
        c.postMessage({ type: 'resubscribe', subscription: newSub.toJSON() });
      }
    } catch (_) {}
  })());
});
