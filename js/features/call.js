// 完整的模拟通话功能
(function () {
    'use strict';

    // ---------- 配置 ----------
    const KEY_ENABLED  = 'callFeatureEnabled';
    const BG_LF_KEY    = 'callBgImageData';

    const S = {
        enabled: localStorage.getItem(KEY_ENABLED) !== 'false',
        active: false,
        startTime: null,
        elapsed: 0,
        timerRAF: null,
        minimized: false,
        immersive: false,
        bgImage: null,
        incomingTimer: null,
        connectingTimer: null,
        isPartnerCall: false,
    };

    // ---------- 工具函数 ----------
    function fmt(ms) {
        const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
        return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    }

    function getPartnerName() {
        return (window.settings && settings.partnerName) || '梦角';
    }
    function getPartnerAvatar() {
        const img = document.querySelector('#partner-avatar img');
        return img ? img.src : null;
    }

    // ---------- 注入 UI（如果不存在） ----------
    function injectCallUI() {
        if (document.getElementById('call-feature-root')) return;

        const root = document.createElement('div');
        root.id = 'call-feature-root';
        root.innerHTML = `
        <!-- 全屏来电弹窗 -->
        <div id="call-incoming-overlay" style="display:none;position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,0.7);backdrop-filter:blur(20px);align-items:center;justify-content:center;">
            <div style="background:linear-gradient(160deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.15);border-radius:36px;padding:40px 30px 30px;width:280px;text-align:center;color:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.6);">
                <div style="position:relative;width:90px;height:90px;margin:0 auto 16px;">
                    <div style="position:absolute;inset:-10px;border-radius:50%;border:2px solid rgba(255,255,255,0.15);animation:callPulse 2s ease-in-out infinite;"></div>
                    <div style="position:absolute;inset:-20px;border-radius:50%;border:2px solid rgba(255,255,255,0.08);animation:callPulse 2s ease-in-out infinite 0.6s;"></div>
                    <div id="call-inc-avatar" style="width:100%;height:100%;border-radius:50%;background:var(--accent-color,#e0698a);display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid rgba(255,255,255,0.3);">
                        <i class="fas fa-user" style="font-size:36px;color:#fff;"></i>
                    </div>
                </div>
                <div id="call-inc-name" style="font-size:22px;font-weight:700;margin-bottom:4px;">${getPartnerName()}</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.6);">邀请你视频通话</div>
                <div style="display:flex;gap:50px;justify-content:center;margin-top:30px;">
                    <button id="call-inc-reject" style="display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#fff;">
                        <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#ff5252,#c62828);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(255,82,82,0.4);">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.5 6.5l2.2-2.2c.28-.27.68-.36 1.03-.24 1.1.37 2.3.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.56 21 3 13.44 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.28.2 2.5.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z" fill="white"/></svg>
                        </div>
                        <span style="font-size:12px;color:rgba(255,255,255,0.5);">拒绝</span>
                    </button>
                    <button id="call-inc-accept" style="display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#fff;">
                        <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#4caf50,#2e7d32);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(76,175,80,0.4);">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.5 6.5l2.2-2.2c.28-.27.68-.36 1.03-.24 1.1.37 2.3.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.56 21 3 13.44 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.28.2 2.5.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z" fill="white"/></svg>
                        </div>
                        <span style="font-size:12px;color:rgba(255,255,255,0.5);">接听</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 通话窗口（接听后显示） -->
        <div id="call-window" style="display:none;position:fixed;z-index:99900;border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);width:280px;height:440px;bottom:80px;right:20px;background:linear-gradient(160deg,#0d1b2a,#1b263b);color:#fff;flex-direction:column;">
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;gap:12px;position:relative;">
                <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06) 0%, transparent 60%);pointer-events:none;"></div>
                <div style="width:70px;height:70px;border-radius:50%;background:var(--accent-color,#e0698a);display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid rgba(255,255,255,0.2);">
                    <div id="call-win-avatar"><i class="fas fa-user" style="font-size:28px;color:#fff;"></i></div>
                </div>
                <div id="call-win-name" style="font-size:18px;font-weight:700;">${getPartnerName()}</div>
                <div style="display:flex;gap:4px;align-items:center;height:24px;">
                    <span style="width:4px;height:4px;border-radius:50%;background:#4caf50;animation:callDot 1.2s ease-in-out infinite;"></span>
                    <span style="width:4px;height:4px;border-radius:50%;background:#4caf50;animation:callDot 1.2s ease-in-out infinite 0.2s;"></span>
                    <span style="width:4px;height:4px;border-radius:50%;background:#4caf50;animation:callDot 1.2s ease-in-out infinite 0.4s;"></span>
                    <span id="call-timer" style="font-size:14px;font-weight:300;margin-left:6px;color:rgba(255,255,255,0.7);">00:00</span>
                </div>
                <button id="call-hangup" style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#ff5252,#c62828);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(255,82,82,0.5);">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.5 6.5l2.2-2.2c.28-.27.68-.36 1.03-.24 1.1.37 2.3.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.56 21 3 13.44 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.28.2 2.5.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z" fill="white"/></svg>
                </button>
            </div>
            <div style="height:6px;background:linear-gradient(90deg,var(--accent-color),rgba(var(--accent-color-rgb),0.3));"></div>
        </div>

        <style>
        @keyframes callPulse {
            0%{transform:scale(1);opacity:0.6}
            50%{transform:scale(1.12);opacity:0.15}
            100%{transform:scale(1);opacity:0.6}
        }
        @keyframes callDot {
            0%,100%{transform:scale(0.6);opacity:0.3}
            50%{transform:scale(1.2);opacity:1}
        }
        #call-incoming-overlay{display:none;}
        #call-incoming-overlay.active{display:flex;animation:fadeIn 0.3s ease;}
        #call-window.active{display:flex;animation:slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.92)}to{opacity:1;transform:translateY(0) scale(1)}}
        </style>
        `;
        document.body.appendChild(root);

        // 绑定事件
        document.getElementById('call-inc-reject').addEventListener('click', function() {
            hideIncomingCall();
            const name = getPartnerName();
            addCallEvent('fa-phone-slash', name + ' 拒绝了通话', null);
        });
        document.getElementById('call-inc-accept').addEventListener('click', function() {
            hideIncomingCall();
            startCall(true);
        });
        document.getElementById('call-hangup').addEventListener('click', function() {
            endCall();
        });
    }

    // ---------- 显示/隐藏来电弹窗 ----------
    function showIncomingCall() {
        injectCallUI();
        const overlay = document.getElementById('call-incoming-overlay');
        if (!overlay) return;
        // 更新头像和名字
        const av = document.getElementById('call-inc-avatar');
        const src = getPartnerAvatar();
        if (av) {
            if (src) av.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;">`;
            else av.innerHTML = '<i class="fas fa-user" style="font-size:36px;color:#fff;"></i>';
        }
        const nameEl = document.getElementById('call-inc-name');
        if (nameEl) nameEl.textContent = getPartnerName();
        overlay.classList.add('active');
        overlay.style.display = 'flex';
        // 自动拒接（如果30秒无操作）
        if (S.incomingTimer) clearTimeout(S.incomingTimer);
        S.incomingTimer = setTimeout(function() {
            if (overlay.classList.contains('active')) {
                hideIncomingCall();
                const name = getPartnerName();
                addCallEvent('fa-phone-slash', name + ' 的来电已超时', null);
            }
        }, 30000);
    }

    function hideIncomingCall() {
        const overlay = document.getElementById('call-incoming-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        }
        if (S.incomingTimer) {
            clearTimeout(S.incomingTimer);
            S.incomingTimer = null;
        }
    }

    // ---------- 开始通话（接听后） ----------
    function startCall(isPartner) {
        S.active = true;
        S.startTime = Date.now();
        S.elapsed = 0;
        S.isPartnerCall = !!isPartner;
        const win = document.getElementById('call-window');
        if (!win) return;
        // 更新头像和名字
        const av = document.getElementById('call-win-avatar');
        const src = getPartnerAvatar();
        if (av) {
            if (src) av.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;">`;
            else av.innerHTML = '<i class="fas fa-user" style="font-size:28px;color:#fff;"></i>';
        }
        const nameEl = document.getElementById('call-win-name');
        if (nameEl) nameEl.textContent = getPartnerName();
        win.classList.add('active');
        win.style.display = 'flex';
        // 开始计时
        if (S.timerRAF) cancelAnimationFrame(S.timerRAF);
        function tick() {
            if (!S.active) return;
            S.elapsed = Date.now() - S.startTime;
            const t = fmt(S.elapsed);
            const timerEl = document.getElementById('call-timer');
            if (timerEl) timerEl.textContent = t;
            S.timerRAF = requestAnimationFrame(tick);
        }
        tick();
        // 添加通话开始事件（仅当是对方来电）
        if (isPartner) {
            addCallEvent('fa-video', getPartnerName() + ' 已接听', '通话中');
        }
    }

    function endCall() {
        S.active = false;
        if (S.timerRAF) cancelAnimationFrame(S.timerRAF);
        const win = document.getElementById('call-window');
        if (win) {
            win.classList.remove('active');
            win.style.display = 'none';
        }
        // 记录结束事件
        if (S.startTime) {
            const dur = Date.now() - S.startTime;
            if (dur > 2000) {
                addCallEvent('fa-phone-slash', '通话已结束', fmt(dur));
            }
            S.startTime = null;
        }
        hideIncomingCall();
    }

    // ---------- 添加通话事件到聊天 ----------
    function addCallEvent(icon, label, detail) {
        if (typeof window._addCallEvent === 'function') {
            window._addCallEvent(icon, label, detail);
        } else {
            // 兜底：直接在聊天里加一条系统消息
            if (typeof addMessage === 'function') {
                addMessage({
                    id: Date.now() + Math.random(),
                    sender: 'system',
                    text: label + (detail ? ' · ' + detail : ''),
                    timestamp: new Date(),
                    type: 'call-event',
                    callIcon: icon,
                    callDetail: detail,
                });
            }
        }
    }

    // ---------- 暴露全局接口 ----------
    window.callFeature = {
        showIncomingCall: showIncomingCall,
        startCall: startCall,
        endCall: endCall,
        hideIncomingCall: hideIncomingCall,
    };

    // ---------- 检查消息中的关键词并触发 ----------
    // 在原代码的基础上，我们会在 notification-enhance.js 中调用 showIncomingCall，
    // 但这里也保留一个监听方式（以防万一）
    // 不重复监听，由 notification 统一触发。

    console.log('[call] 模拟通话功能已加载');
})();