// ============================================================
// 高仿 iOS / 安卓 系统来电界面（仅供视觉效果）
// ============================================================
(function() {
    'use strict';

    // ----- 工具 -----
    function getPartnerName() {
        return (window.settings && settings.partnerName) || '梦角';
    }
    function getPartnerAvatar() {
        const img = document.querySelector('#partner-avatar img');
        return img ? img.src : null;
    }

    let incomingTimer = null;
    let callTimer = null;
    let callStartTime = null;
    let callActive = false;

    // ----- 注入高仿来电 UI -----
    function injectCallUI() {
        if (document.getElementById('call-feature-root')) return;

        const root = document.createElement('div');
        root.id = 'call-feature-root';
        root.innerHTML = `
        <!-- ===== 全屏来电界面（仿系统电话） ===== -->
        <div id="call-incoming-overlay" style="display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);align-items:center;justify-content:center;flex-direction:column;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <!-- 顶部：来电者信息 -->
            <div style="position:absolute;top:60px;width:100%;text-align:center;">
                <div style="font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:1px;margin-bottom:8px;">📞 视频通话</div>
                <div id="call-inc-name" style="font-size:34px;font-weight:700;letter-spacing:0.5px;">${getPartnerName()}</div>
                <div style="font-size:14px;color:rgba(255,255,255,0.4);margin-top:6px;">邀请你视频通话</div>
            </div>

            <!-- 中间：头像（带呼吸动画） -->
            <div style="position:relative;width:140px;height:140px;margin-top:40px;">
                <div style="position:absolute;inset:-14px;border-radius:50%;border:2px solid rgba(255,255,255,0.12);animation:callRipple 2.4s ease-in-out infinite;"></div>
                <div style="position:absolute;inset:-30px;border-radius:50%;border:2px solid rgba(255,255,255,0.06);animation:callRipple 2.4s ease-in-out infinite 0.8s;"></div>
                <div id="call-inc-avatar" style="width:100%;height:100%;border-radius:50%;background:var(--accent-color,#5c7cfa);display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid rgba(255,255,255,0.15);box-shadow:0 8px 40px rgba(0,0,0,0.5);">
                    <i class="fas fa-user" style="font-size:52px;color:#fff;opacity:0.9;"></i>
                </div>
            </div>

            <!-- 底部：接听 / 拒绝 按钮 -->
            <div style="position:absolute;bottom:60px;width:100%;display:flex;justify-content:space-around;padding:0 40px;box-sizing:border-box;">
                <button id="call-inc-reject" style="display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#fff;">
                    <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#ff3b30,#c62828);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(255,59,48,0.5);">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.5 6.5l2.2-2.2c.28-.27.68-.36 1.03-.24 1.1.37 2.3.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.56 21 3 13.44 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.28.2 2.5.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z" fill="white"/></svg>
                    </div>
                    <span style="font-size:12px;color:rgba(255,255,255,0.5);">拒绝</span>
                </button>
                <button id="call-inc-accept" style="display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#fff;">
                    <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#34c759,#1e7b32);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(52,199,89,0.5);">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.5 6.5l2.2-2.2c.28-.27.68-.36 1.03-.24 1.1.37 2.3.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.56 21 3 13.44 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.28.2 2.5.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z" fill="white"/></svg>
                    </div>
                    <span style="font-size:12px;color:rgba(255,255,255,0.5);">接听</span>
                </button>
            </div>
        </div>

        <!-- ===== 通话中界面（接听后的样子） ===== -->
        <div id="call-window" style="display:none;position:fixed;inset:0;z-index:99998;background:linear-gradient(160deg,#0d1b2a,#1b263b);align-items:center;justify-content:center;flex-direction:column;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 20%, rgba(255,255,255,0.05) 0%, transparent 60%);pointer-events:none;"></div>
            <div style="position:absolute;top:50px;font-size:13px;color:rgba(255,255,255,0.3);letter-spacing:2px;">📞 通话中</div>
            <div style="width:120px;height:120px;border-radius:50%;background:var(--accent-color,#5c7cfa);display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid rgba(255,255,255,0.1);box-shadow:0 8px 40px rgba(0,0,0,0.5);margin-top:20px;">
                <div id="call-win-avatar"><i class="fas fa-user" style="font-size:44px;color:#fff;opacity:0.9;"></i></div>
            </div>
            <div id="call-win-name" style="font-size:28px;font-weight:600;margin-top:16px;">${getPartnerName()}</div>
            <div id="call-timer" style="font-size:20px;font-weight:300;color:rgba(255,255,255,0.5);margin-top:6px;font-variant-numeric:tabular-nums;">00:00</div>
            <div style="position:absolute;bottom:60px;width:100%;display:flex;justify-content:center;">
                <button id="call-hangup" style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#ff3b30,#c62828);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(255,59,48,0.5);">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.5 6.5l2.2-2.2c.28-.27.68-.36 1.03-.24 1.1.37 2.3.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.56 21 3 13.44 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.28.2 2.5.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z" fill="white"/></svg>
                </button>
            </div>
        </div>

        <style>
        @keyframes callRipple {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.18); opacity: 0.1; }
            100% { transform: scale(1); opacity: 0.6; }
        }
        #call-incoming-overlay.active { display:flex !important; animation: callFadeIn 0.4s ease; }
        #call-window.active { display:flex !important; animation: callSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes callFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes callSlideUp { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        </style>
        `;
        document.body.appendChild(root);

        // ----- 绑定按钮事件 -----
        document.getElementById('call-inc-reject').addEventListener('click', function() {
            hideIncomingCall();
            addCallEvent('fa-phone-slash', getPartnerName() + ' 拒绝了通话', null);
        });
        document.getElementById('call-inc-accept').addEventListener('click', function() {
            hideIncomingCall();
            startCallUI();
        });
        document.getElementById('call-hangup').addEventListener('click', function() {
            endCallUI();
        });
    }

    // ----- 显示来电 -----
    function showIncomingCall() {
        injectCallUI();
        const overlay = document.getElementById('call-incoming-overlay');
        if (!overlay) return;
        // 刷新头像和名字
        const av = document.getElementById('call-inc-avatar');
        const src = getPartnerAvatar();
        if (av) {
            if (src) av.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;">`;
            else av.innerHTML = '<i class="fas fa-user" style="font-size:52px;color:#fff;opacity:0.9;"></i>';
        }
        const nameEl = document.getElementById('call-inc-name');
        if (nameEl) nameEl.textContent = getPartnerName();
        overlay.classList.add('active');

        // 30 秒自动挂断
        if (incomingTimer) clearTimeout(incomingTimer);
        incomingTimer = setTimeout(function() {
            if (overlay.classList.contains('active')) {
                hideIncomingCall();
                addCallEvent('fa-phone-slash', getPartnerName() + ' 的来电已超时', null);
            }
        }, 30000);
    }

    function hideIncomingCall() {
        const overlay = document.getElementById('call-incoming-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        }
        if (incomingTimer) {
            clearTimeout(incomingTimer);
            incomingTimer = null;
        }
    }

    // ----- 开始通话 -----
    function startCallUI() {
        const win = document.getElementById('call-window');
        if (!win) return;
        const av = document.getElementById('call-win-avatar');
        const src = getPartnerAvatar();
        if (av) {
            if (src) av.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;">`;
            else av.innerHTML = '<i class="fas fa-user" style="font-size:44px;color:#fff;opacity:0.9;"></i>';
        }
        const nameEl = document.getElementById('call-win-name');
        if (nameEl) nameEl.textContent = getPartnerName();
        win.classList.add('active');
        callActive = true;
        callStartTime = Date.now();
        if (callTimer) cancelAnimationFrame(callTimer);
        updateTimer();
        addCallEvent('fa-video', getPartnerName() + ' 已接听', '通话中');
    }

    function updateTimer() {
        if (!callActive) return;
        const elapsed = Date.now() - callStartTime;
        const s = Math.floor(elapsed / 1000);
        const m = Math.floor(s / 60);
        const timerEl = document.getElementById('call-timer');
        if (timerEl) timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
        callTimer = requestAnimationFrame(updateTimer);
    }

    function endCallUI() {
        callActive = false;
        if (callTimer) cancelAnimationFrame(callTimer);
        const win = document.getElementById('call-window');
        if (win) {
            win.classList.remove('active');
            win.style.display = 'none';
        }
        if (callStartTime) {
            const dur = Date.now() - callStartTime;
            if (dur > 2000) {
                const s = Math.floor(dur / 1000);
                const m = Math.floor(s / 60);
                const label = `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
                addCallEvent('fa-phone-slash', '通话已结束', label);
            }
            callStartTime = null;
        }
        hideIncomingCall();
    }

    // ----- 添加通话事件到聊天 -----
    function addCallEvent(icon, label, detail) {
        if (typeof window._addCallEvent === 'function') {
            window._addCallEvent(icon, label, detail);
        } else if (typeof addMessage === 'function') {
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

    // ----- 暴露全局接口 -----
    window.callFeature = {
        showIncomingCall: showIncomingCall,
        startCall: startCallUI,
        endCall: endCallUI,
        hideIncomingCall: hideIncomingCall,
    };

    console.log('[call] 高仿系统来电界面已加载');
})();