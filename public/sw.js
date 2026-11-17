// CekNilai Service Worker - Web Push Notification & PWA Offline Support
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener untuk pesan Push dari server
self.addEventListener('push', (event) => {
  let payload = {
    title: '📊 Notifikasi Nilai Baru - CekNilai',
    body: 'Ada pembaruan nilai terbaru di akun Anda.',
    url: '/',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || '/'
    },
    actions: [
      { action: 'open', title: 'Lihat Nilai' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Listener saat notifikasi diklik di HP
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Jika tab/app CekNilai sudah terbuka, fokuskan
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika belum terbuka, buka tab / window baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
