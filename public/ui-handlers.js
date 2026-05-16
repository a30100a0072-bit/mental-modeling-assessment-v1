// public/ui-handlers.js — CSP-friendly 共用 UI 行為（取代 inline onclick / onkeydown）
//
// 提供：
//   - window.toggleSidebar()                           sidebar 開關（向後相容）
//   - [data-action="toggle-sidebar"]                   auto-bind click + keydown(Enter/Space)
//   - [data-action="navigate"][data-href="..."]        auto-bind click → location.href
//   - window.setupHeaderAuthNav(authBtnId, dashBtnId, loginUrl)
//                                                     在 chiyigoSetupAuthUI 完成後呼叫，
//                                                     未登入時綁登入跳轉、已登入時 dash 按鈕綁儀表板跳轉
//
// 設計考量：
//   - chiyigo-auth.js 的 chiyigoSetupAuthUI 已登入時會 `.onclick = chiyigoLogout`。
//     若同時 addEventListener 登入跳轉會兩個 handler 都觸發，所以 setupHeaderAuthNav
//     只在 `.logout-mode` 不存在時才綁登入跳轉。
//   - 此檔不依賴 chiyigo-auth.js，但 setupHeaderAuthNav 預設等 window.chiyigoReady（若存在）
//     以確保按鈕狀態定型後再判斷。
(function () {
    'use strict';

    function toggleSidebar() {
        var sb = document.getElementById('sidebar');
        var ov = document.getElementById('sidebar-overlay');
        if (sb) sb.classList.toggle('open');
        if (ov) ov.classList.toggle('open');
    }
    window.toggleSidebar = toggleSidebar;

    function bindSidebarToggleAll() {
        var els = document.querySelectorAll('[data-action="toggle-sidebar"]');
        for (var i = 0; i < els.length; i++) {
            (function (el) {
                el.addEventListener('click', toggleSidebar);
                el.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSidebar();
                    }
                });
            })(els[i]);
        }
    }

    function bindNavigateAll() {
        var els = document.querySelectorAll('[data-action="navigate"][data-href]');
        for (var i = 0; i < els.length; i++) {
            (function (el) {
                var href = el.getAttribute('data-href');
                el.addEventListener('click', function () { window.location.href = href; });
                // 可聚焦元素（role=button 或 tabindex）支援鍵盤
                if (el.tagName !== 'A' && el.tagName !== 'BUTTON') {
                    el.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            window.location.href = href;
                        }
                    });
                }
            })(els[i]);
        }
    }

    // chiyigoSetupAuthUI 跑完後呼叫此函式：
    //   - 未登入：auth-nav-btn 綁 click → loginUrl
    //   - 已登入：chiyigo-auth.js 已 set .onclick = logout，不重複綁；dash-nav-btn 綁 → dashboard.html
    async function setupHeaderAuthNav(authBtnId, dashBtnId, loginUrl) {
        loginUrl = loginUrl || 'login.html';
        if (window.chiyigoReady) {
            try { await window.chiyigoReady; } catch (_) {}
        }
        if (authBtnId) {
            var authBtn = document.getElementById(authBtnId);
            if (authBtn && !authBtn.classList.contains('logout-mode')) {
                authBtn.addEventListener('click', function () { window.location.href = loginUrl; });
            }
        }
        if (dashBtnId) {
            var dashBtn = document.getElementById(dashBtnId);
            if (dashBtn) {
                dashBtn.addEventListener('click', function () { window.location.href = 'dashboard.html'; });
            }
        }
    }
    window.setupHeaderAuthNav = setupHeaderAuthNav;

    function init() {
        bindSidebarToggleAll();
        bindNavigateAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
