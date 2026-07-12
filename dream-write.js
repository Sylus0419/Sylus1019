// dream-write.js - 梦角写信（通过信封投递发送，不在聊天界面直接显示信件内容）
(function() {
    // 轮询间隔：每30分钟检查一次
    const CHECK_INTERVAL = 30 * 60 * 1000;
    // 最短间隔（6小时）
    const MIN_INTERVAL = 6 * 60 * 60 * 1000;
    // 最长间隔（12小时）
    const MAX_INTERVAL = 12 * 60 * 60 * 1000;

    let lastSendTime = 0;
    let timerId = null;

    // 检查是否可发信
    function shouldSend() {
        const now = Date.now();
        const elapsed = now - lastSendTime;
        if (lastSendTime === 0 || elapsed >= MIN_INTERVAL) {
            const factor = Math.min(1, elapsed / MAX_INTERVAL);
            const chance = 0.1 + factor * 0.5; // 10%~60%
            if (Math.random() < chance) return true;
        }
        return false;
    }

    // 从字卡库组合信件内容（不使用AI）
    function composeLetter() {
        let pool = [];
        if (typeof customReplies !== 'undefined' && Array.isArray(customReplies)) {
            let disabled = new Set();
            try {
                const raw = localStorage.getItem('disabledReplyItems');
                if (raw) disabled = new Set(JSON.parse(raw));
            } catch(e) {}
            pool = customReplies.filter(item => !disabled.has(item));
        }
        if (pool.length < 3) {
            return '今天过得怎么样？我一直在想你。✨';
        }
        const count = Math.min(pool.length, 4 + Math.floor(Math.random() * 3));
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);
        const punctuation = ['。', '！', '…', '~'];
        let letter = selected.map((s, i) => {
            let p = punctuation[Math.floor(Math.random() * punctuation.length)];
            if (i === selected.length - 1) p = ' ✨';
            return s + p;
        }).join(' ');
        return letter;
    }

    // 发送信封通知（聊天界面显示提示，点击跳转信封投递）
    async function sendDreamLetter() {
        // 确保信封数据已加载（如果原代码有 loadEnvelopeData，调用它）
        if (typeof loadEnvelopeData === 'function') {
            await loadEnvelopeData();
        }
        // 确保 envelopeData 存在
        if (typeof envelopeData === 'undefined') {
            console.warn('[dream-write] envelopeData 未定义，跳过');
            return;
        }

        const letterContent = composeLetter();
        if (!letterContent) return;

        // 生成新信件 ID
        const letterId = 'dream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        // 获取梦角备注名
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';

        // 存入收件箱（inbox）
        envelopeData.inbox.push({
            id: letterId,
            refId: null,
            originalContent: null,
            content: letterContent,
            receivedTime: Date.now(),
            isNew: true,
            from: partnerName
        });
        // 保存
        if (typeof saveEnvelopeData === 'function') {
            saveEnvelopeData();
        } else {
            try {
                await localforage.setItem(getStorageKey('envelopeData'), envelopeData);
            } catch(e) {}
        }

        // 在聊天界面发送一条“通知”消息（点击可跳转）
        const noticeText = `💌 ${partnerName} 给你写了一封信，快去看看吧。`;
        if (typeof addMessage === 'function') {
            const msgId = Date.now() + Math.random() * 1000;
            const msg = {
                id: msgId,
                sender: partnerName, // 显示为对方消息
                text: noticeText,
                timestamp: new Date(),
                status: 'received',
                favorited: false,
                note: null,
                replyTo: null,
                type: 'normal',
                _envelopeId: letterId
            };
            addMessage(msg);

            // 等待渲染完成后，给该消息添加点击事件
            setTimeout(() => {
                const container = document.getElementById('chat-container');
                if (!container) return;
                const wrapper = container.querySelector(`[data-id="${msgId}"]`);
                if (wrapper) {
                    wrapper.style.cursor = 'pointer';
                    wrapper.addEventListener('click', function(e) {
                        if (e.target.closest('.message-meta-actions')) return;
                        if (typeof window.openEnvelopeAndViewReply === 'function') {
                            window.openEnvelopeAndViewReply(letterId);
                        } else {
                            alert('信封功能未加载，请稍后重试');
                        }
                    });
                    // 加视觉提示
                    const msgDiv = wrapper.querySelector('.message');
                    if (msgDiv) {
                        msgDiv.style.border = '1.5px solid var(--accent-color)';
                        msgDiv.style.borderRadius = '12px';
                        msgDiv.style.padding = '8px 12px';
                        msgDiv.style.backgroundColor = 'rgba(var(--accent-color-rgb), 0.06)';
                        msgDiv.style.cursor = 'pointer';
                    }
                }
            }, 300);
        }

        lastSendTime = Date.now();
        console.log('[dream-write] 梦角已写信（存入信封投递）');
    }

    // 定时检查
    function checkAndSend() {
        if (shouldSend()) {
            sendDreamLetter();
        }
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(checkAndSend, CHECK_INTERVAL);
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(checkAndSend, 3000);
            });
        } else {
            setTimeout(checkAndSend, 3000);
        }
    }

    // 暴露手动触发（调试用）
    window._forceDreamWrite = function() {
        sendDreamLetter();
    };

    init();
})();