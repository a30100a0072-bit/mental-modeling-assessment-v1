// public/login-init.js — login.html 頁面 init
// 取代原 inline <script> 的 toggleSidebar（已由 ui-handlers.js 用 data-action 處理）
// 並把原本 #login-btn 的 inline onclick="startLogin()" 改為 addEventListener。
// startLogin 由 auth.js 提供（IAM 邊界，不動其本體）。
;(function () {
    'use strict';
    async function init() {
        var loginBtn = document.getElementById('login-btn');
        if (loginBtn && typeof window.startLogin === 'function') {
            loginBtn.addEventListener('click', window.startLogin);
        }
        // login.html 沒載 chiyigo-auth.js（不需 silent login）；setupHeaderAuthNav 在無 chiyigoReady
        // 時會直接綁 auth-nav-btn → login.html（等價於原本 inline onclick 的 reload 行為）。
        if (typeof window.setupHeaderAuthNav === 'function') {
            try { await window.setupHeaderAuthNav('auth-nav-btn', 'dash-nav-btn'); } catch (_) {}
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
