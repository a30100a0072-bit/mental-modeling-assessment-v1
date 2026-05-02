// public/pwa-register.js
// 註冊 service worker。離線殼 + 版本更新提示。
(function () {
    if (!('serviceWorker' in navigator)) return;
    // 開發環境（localhost / 127.0.0.1）也允許註冊，方便測試
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(reg => {
                // 偵測新版可用
                reg.addEventListener('updatefound', () => {
                    const nw = reg.installing;
                    if (!nw) return;
                    nw.addEventListener('statechange', () => {
                        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                            // 已有舊版在跑、新版裝好等待 → 提示更新
                            if (window.toast) {
                                window.toast('🔄 新版已下載，重新整理立即套用。', { type: 'info', duration: 6000 });
                            }
                            // 若想強制立即套用，可呼叫 reg.waiting.postMessage({type:'SKIP_WAITING'})
                            // 這裡保守做法：等使用者下次重整自然套用，避免打斷正在作答
                        }
                    });
                });
            })
            .catch(() => { /* 註冊失敗就算了，不影響正常網站使用 */ });
    });
})();
