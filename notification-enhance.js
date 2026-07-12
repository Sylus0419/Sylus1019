// notification-enhance.js - 新消息弹窗 + 视频通话邀请（完整版）
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

    // 请求通知权限
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // 监听新消息
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
                    if (isSent) return; // 自己发的消息不通知

                    // 检查是否为视频通话邀请（关键词匹配）
                    const isVideoCall = /视频|通话|邀请|来电|call/i.test(text);

                    const notifEnabled = localStorage.getItem('notifEnabled') === '1';
                    if (!notifEnabled) return;

                    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';

                    if (isVideoCall) {
                        // ----- 视频通话邀请：弹出全屏来电界面 -----
                        console.log('[notif] 检测到视频通话邀请，弹出全屏来电');
                        // 如果页面在后台，先尝试拉取到前台（在手机上可能无法完全唤醒）
                        if (window.focus) { window.focus(); }

                        // 立即弹出全屏来电
                        if (window.callFeature && typeof window.callFeature.showIncomingCall === 'function') {
                            window.callFeature.showIncomingCall();
                        } else {
                            // 如果 callFeature 还没加载，用 URL 参数重新加载页面触发
                            const currentUrl = window.location.href.split('?')[0];
                            window.location.href = currentUrl + '?action=call&t=' + Date.now();
                        }

                        // 同时弹出系统通知（作为辅助）
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
                        // ----- 普通消息：弹出系统通知 -----
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

    observer.observe(container, {
        childList: true,
        subtree: true
    });

    // 处理 URL 参数触发（如果页面因 ?action=call 被重新加载）
    (function() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'call') {
            // 清除 URL 参数，防止刷新再次触发
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            // 延迟一下等待页面加载
            setTimeout(function() {
                if (window.callFeature && typeof window.callFeature.showIncomingCall === 'function') {
                    window.callFeature.showIncomingCall();
                } else {
                    // 如果还没加载，再等一次
                    setTimeout(function() {
                        if (window.callFeature && typeof window.callFeature.showIncomingCall === 'function') {
                            window.callFeature.showIncomingCall();
                        }
                    }, 1000);
                }
            }, 500);
        }
    })();

    console.log('[notif] 通知增强已启动（含视频通话全屏弹窗）');
})();