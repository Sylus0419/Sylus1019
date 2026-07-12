// notification-enhance.js - 稳定版，支持 Service Worker 推送（灵动岛）
(function() {
    if (!('Notification' in window)) return;

    let lastNotifiedMsgId = null;
    const container = document.getElementById('chat-container');
    if (!container) {
        console.warn('[notif] 未找到 chat-container');
        return;
    }

    if (Notification.permission === 'default') Notification.requestPermission();

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
                    if (node.classList.contains('sent')) return;

                    const isVideoCall = /视频|通话|邀请|来电|call/i.test(text);
                    const notifEnabled = localStorage.getItem('notifEnabled') === '1';
                    if (!notifEnabled) return;

                    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';

                    if (isVideoCall) {
                        console.log('[notif] 检测到视频通话邀请，弹出全屏来电');

                        // 1. 弹出全屏来电界面
                        if (window.callFeature && typeof window.callFeature.showIncomingCall === 'function') {
                            window.callFeature.showIncomingCall();
                        } else {
                            setTimeout(function() {
                                if (window.callFeature && typeof window.callFeature.showIncomingCall === 'function') {
                                    window.callFeature.showIncomingCall();
                                }
                            }, 1000);
                        }

                        // 2. 通过 Service Worker 发送推送通知（灵动岛）
                        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                            navigator.serviceWorker.controller.postMessage({
                                type: 'push',
                                title: `📹 ${partnerName} 邀请你视频通话`,
                                body: '点击接听',
                                icon: document.querySelector('#partner-avatar img')?.src || ''
                            });
                        }

                        // 3. 系统通知（辅助）
                        try {
                            const notif = new Notification(`📹 ${partnerName} 邀请你视频通话`, {
                                body: '点击接听',
                                icon: document.querySelector('#partner-avatar img')?.src || '',
                                tag: 'call-invite',
                                renotify: true,
                                requireInteraction: true
                            });
                            notif.onclick = function() {
                                notif.close();
                                if (window.callFeature && typeof window.callFeature.showIncomingCall === 'function') {
                                    window.callFeature.showIncomingCall();
                                }
                            };
                            setTimeout(() => notif.close(), 10000);
                        } catch(e) {}
                    } else {
                        // 普通消息通知
                        try {
                            const notif = new Notification('💬 新消息', {
                                body: text || '收到一条新消息',
                                icon: document.querySelector('#partner-avatar img')?.src || '',
                                tag: 'milk-chat-msg',
                                renotify: true,
                            });
                            setTimeout(() => notif.close(), 5000);
                        } catch(e) {}
                    }
                }
            });
        });
    });

    observer.observe(container, { childList: true, subtree: true });
    console.log('[notif] 通知增强已启动（含 Service Worker 推送）');
})();