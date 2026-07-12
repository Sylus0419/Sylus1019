// sw.js - Service Worker（支持推送通知）
const CACHE_NAME = 'milk-chat-v1';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(['/', '/index.html', '/manifest.json']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim());
});

// 监听推送消息（来自 notification-enhance.js 的触发）
self.addEventListener('push', function(e) {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'Milk传讯';
  const options = {
    body: data.body || '你有新消息',
    icon: data.icon || 'https://file.youtochat.com/images/20260216/1771224856844_qdqqd.jpeg',
    badge: 'https://file.youtochat.com/images/20260216/1771224856844_qdqqd.jpeg',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    requireInteraction: true
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// 用户点击通知时，打开网页
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.openWindow(e.notification.data || '/')
  );
});