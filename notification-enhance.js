// notification-enhance.js - 新消息弹窗（含视频通话邀请，带动态昵称）
(function() {
    if (!('Notification' in window)) {
        console.warn('[notif] 浏览器不支持通知，忽略');
        return;
    }

    let lastNotifiedMsgId = null;

    const container = document.getElementById('chat-container');
    if (!container) {
        console.warn('[notif] 未找到 chat-container，稍后重试');
        setTimeout(arguments.callee, 1000);
        return;
    }

    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList && node.classList.contains('message-wrapper')) {
                    const msgId = node.dataset.id || node.dataset.msgId;
                    if (!msgId) return;
                    if (msgId === lastNotifiedMsgId) return;
                    lastNotifiedMsgId = msgId;

                    const textElem = node.querySelector('.message');
                    if (!textElem) return;
                    const text = textElem.textContent.trim();
                    const isSent = node.classList.contains('sent');
                    if (isSent) return;

                    const isVideoCall = /视频|通话|邀请|来电|call/i.test(text);

                    const notifEnabled = localStorage.getItem('notifEnabled') === '1';
                    if (!notifEnabled) return;

                    // 获取梦角备注名
                    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';

                    // 构造通知
                    const title = isVideoCall ? `📹 ${partnerName} 邀请你视频通话` : '💬 新消息';
                    const body = isVideoCall ? '点击接听' : (text || '收到一条新消息');
                    const icon = document.querySelector('#partner-avatar img')?.src || '';

                    try {
                        const notif = new Notification(title, {
                            body: body,
                            icon: icon,
                            tag: 'milk-chat-msg',
                            renotify: true,
                            requireInteraction: isVideoCall
                        });

                        if (isVideoCall) {
                            notif.onclick = function() {
                                notif.close();
                                if (window.callFeature && typeof window.callFeature.startCall === 'function') {
                                    window.callFeature.startCall(true);
                                } else {
                                    alert('视频通话功能尚未加载，请稍后重试');
                                }
                            };
                        } else {
                            setTimeout(() => notif.close(), 5000);
                        }
                    } catch(e) {
                        console.warn('[notif] 通知创建失败', e);
                    }
                }
            });
        });
    });

    observer.observe(container, {
        childList: true,
        subtree: true
    });

    console.log('[notif] 通知增强已启动（动态昵称）');
})();