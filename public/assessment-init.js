// public/assessment-init.js — assessment.html 頁面 init
// 取代原 inline <script>（toggleSidebar 已由 ui-handlers.js 處理）+ 把所有 inline
// onclick="someFn()" 改成 addEventListener 綁定 data-handler 屬性。
// 所有被綁定的函式（injectGodMode / copyShareLink / generateShareCard / generateImageForMobile
// / goToTalo / restartQuiz / closeImageModal / nativeShareImage / handleDeleteAccount）
// 都掛在 window 上，由 script.js / share-card.js / result-render.js 提供。
;(function () {
    'use strict';

    // [data-handler="fnName"] 自動綁 click → window[fnName]()
    function bindHandlers(root) {
        var els = (root || document).querySelectorAll('[data-handler]');
        for (var i = 0; i < els.length; i++) {
            (function (el) {
                var name = el.getAttribute('data-handler');
                var arg = el.getAttribute('data-handler-arg'); // 可選單一字串參數
                el.addEventListener('click', function () {
                    var fn = window[name];
                    if (typeof fn === 'function') {
                        if (arg !== null) fn(arg); else fn();
                    }
                });
            })(els[i]);
        }
    }

    // 模態框背景點擊關閉
    function bindModalBackdropClose() {
        var modal = document.getElementById('image-modal');
        if (!modal) return;
        modal.addEventListener('click', function (e) {
            if (e.target === modal && typeof window.closeImageModal === 'function') {
                window.closeImageModal();
            }
        });
    }

    async function init() {
        if (typeof window.chiyigoSetupAuthUI === 'function') {
            try { await window.chiyigoSetupAuthUI('auth-nav-btn', 'dash-nav-btn'); } catch (_) {}
        }
        if (typeof window.setupHeaderAuthNav === 'function') {
            try { await window.setupHeaderAuthNav('auth-nav-btn', 'dash-nav-btn'); } catch (_) {}
        }
        bindHandlers(document);
        bindModalBackdropClose();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
