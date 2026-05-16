// public/dashboard-init.js — dashboard.html 頁面 init
// 取代原 inline <script>：toggleSidebar 已交給 ui-handlers.js (data-action)，
// 這裡負責 chiyigoSetupAuthUI('auth-nav-btn', null) 與「永久銷毀檔案」按鈕綁定。
// handleDeleteAccount 由 dashboard.js 提供。
;(function () {
    'use strict';
    async function init() {
        if (typeof window.chiyigoSetupAuthUI === 'function') {
            try { await window.chiyigoSetupAuthUI('auth-nav-btn', null); } catch (_) {}
        }
        // dashboard 本身就是 dashboard，不需要登入跳轉預設（auth-nav-btn 未登入時不會顯示在這頁的真實 flow）
        if (typeof window.setupHeaderAuthNav === 'function') {
            try { await window.setupHeaderAuthNav('auth-nav-btn', null); } catch (_) {}
        }
        var btn = document.querySelector('.btn-danger[data-action="delete-account"]');
        if (btn && typeof window.handleDeleteAccount === 'function') {
            btn.addEventListener('click', window.handleDeleteAccount);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
