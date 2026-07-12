// notification-enhance.js - 实现锁屏横幅 + 灵动岛图标
(function() {
    if (!('Notification' in window)) {
        console.warn('[notif] 浏览器不支持通知');
        return;
    }

    // 图标链接（用于灵动岛和横幅）
    const ICON_URL = 'https://file.youtochat.com/images/20260216/1771224856844_qdqqd.jpeg';
    let lastNotifiedMsgId = null;

    const container = document.getElementById('chat-container');
    if (!container) {
        console.warn('[notif] 未找到 chat-container');
        return;
    }

    // 如果尚未授权，点击页面任意位置请求权限（引导用户）
    function requestPermissionIfNeeded() {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(function(perm) {
                if (perm === 'granted') {
                    console.log('[notif] 通知权限已授予 ✅');
                    // 发一条测试通知
                    try {
                        new Notification('✅ 通知已开启', {
                            body: '梦角的消息将在这里显示',
                            icon: ICON_URL
                        });
                    } catch(e) {}
                }
            });
        }
    }

    // 在页面加载后执行
    document.addEventListener('click', function() {
        requestPermissionIfNeeded();
    }, { once: true });

    // 核心：发送通知（给 Service Worker 和 系统）
    function sendNotification(title, body, isVideoCall) {
        // 1. 先检查权限
        if (Notification.permission !== 'granted') {
            requestPermissionIfNeeded();
            return;
        }

        // 2. 通过 Service Worker 发送（这是实现锁屏/后台通知的关键）
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(function(registration) {
                registration.showNotification(title, {
                    body: body,
                    icon: ICON_URL,
                    badge: ICON_URL,  // 灵动岛图标
                    vibrate: [200, 100, 200],
                    requireInteraction: isVideoCall || false,
                    data: { url: window.location.href }
                });
            }).catch(function(err) {
                console.warn('[notif] Service Worker 未就绪，使用普通通知', err);
                // 回退方案：直接弹出普通通知
                try {
                    new Notification(title, { body: body, icon: ICON_URL });
                } catch(e) {}
            });
        } else {
            // 不支持 Service Worker 的浏览器，直接弹出
            try {
                new Notification(title, { body: body, icon: ICON_URL });
            } catch(e) {}
        }

        // 3. （可选）如果页面在前台，也显示一个内部提醒，但通知已经由上面发出来了
    }

    // ---- 监听新消息 ----
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList && node.classList.contains('message-wrapper')) {
                    const msgId = node.dataset.id || node.dataset.msgId;
                    if (!msgId || msgId === lastNotifiedMsgId) return;
                    lastNotifiedMsgId = msgId;

                    const textElem = node.querySelector('.message');
                    if (!textElem) return;
                    const text = textElem.textContent.trim();
                    if (node.classList.contains('sent')) return; // 自己发的不管

                    const isVideoCall = /视频|通话|邀请|来电|call/i.test(text);
                    const notifEnabled = localStorage.getItem('notifEnabled') === '1';
                    if (!notifEnabled) return;

                    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';

                    // --- 如果是视频通话邀请 ---
                    if (isVideoCall) {
                        // 1. 全屏来电界面（视觉特效）
                        if (window.callFeature && typeof window.callFeature.showIncomingCall === 'function') {
                            window.callFeature.showIncomingCall();
                        }

                        // 2. 系统通知 + 灵动岛
                        sendNotification(
                            `📹 ${partnerName} 邀请你视频通话`,
                            '点击接听',
                            true // 需要交互
                        );
                    } else {
                        // --- 普通消息通知 ---
                        sendNotification(
                            `💬 ${partnerName}`,
                            text.length > 30 ? text.slice(0, 30) + '...' : text,
                            false
                        );
                    }
                }
            });
        });
    });

    observer.observe(container, { childList: true, subtree: true });

    // 页面加载完成时，如果权限未定，预请求权限
    setTimeout(function() {
        if (Notification.permission === 'default') {
            // 静默请求，不会弹窗打扰
        }
    }, 2000);

    console.log('[notif] 通知增强已启动（支持锁屏横幅 + 灵动岛）');
})();