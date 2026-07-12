// sw.js - Service Worker（完美支持横幅通知 + 灵动岛图标）
const CACHE_NAME = 'milk-chat-v1';
const ICON_URL = 'https://file.youtochat.com/images/20260216/1771224856844_qdqqd.jpeg';

self.addEventListener('install', function(e) {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

// 接收来自主页面 (notification-enhance.js) 的消息，弹出系统通知
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'push') {
    const data = event.data;
    self.registration.showNotification(data.title || 'Milk传讯', {
      body: data.body || '你有新消息',
      icon: ICON_URL,
      badge: ICON_URL,  // 这个就是灵动岛显示的图标
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
      data: { url: data.url || '/' }
    });
  }
});

// 用户点击通知时，打开网页
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.openWindow(e.notification.data.url || '/')
  );
});