// Alyame Attendance — Service Worker
const CACHE = 'alyame-v1';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './history.html',
  './admin.html',
  './assets/logo.png',
  './assets/hero.jpg',
  './assets/tailwind-config.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>null)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Network-first for HTML/JS so updates roll out fast; cache fallback offline
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Don't cache Supabase/API or external CDNs
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>null);
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

// Receive messages from page to show notifications
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'notify') {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title, {
      body,
      icon: 'assets/logo.png',
      badge: 'assets/logo.png',
      tag: tag || 'alyame',
      vibrate: [300,150,300,150,300],
      requireInteraction: false
    });
  }
});

// Web Push (works only if a backend pushes — registered for future)
self.addEventListener('push', e => {
  let data = { title:'حضور اليامي', body:'لديك تنبيه جديد' };
  try { if (e.data) data = e.data.json(); } catch(_){}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body || '', icon:'assets/logo.png', badge:'assets/logo.png',
    vibrate:[300,150,300], tag: data.tag||'alyame'
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type:'window' }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow('./dashboard.html');
  }));
});
