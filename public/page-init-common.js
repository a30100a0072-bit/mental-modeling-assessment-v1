// public/page-init-common.js — 共用內容頁初始化（含 header auth 與 sidebar 行為的 landing-style 頁）
//
// 取代各 HTML 尾端 inline <script> 內的 `function toggleSidebar()` + `chiyigoSetupAuthUI(...)` 兩段
// 樣板程式碼。sidebar 行為已由 ui-handlers.js auto-bind data-action="toggle-sidebar" 處理；
// 此檔只負責呼叫 IAM helper 與註冊 header 的登入/儀表板按鈕。
//
// 用於：jung-theory.html, beebe-model.html (尾段), mbti-types.html, mbti-stats.html
// 不用於：index.html / login.html / dashboard.html / assessment.html（IAM inline 邏輯特別）
//        type-detail.html（自有 page init 處理 URL 參數渲染）
;(function () {
    'use strict';
    async function init() {
        if (typeof window.chiyigoSetupAuthUI === 'function') {
            try { await window.chiyigoSetupAuthUI('auth-nav-btn', 'dash-nav-btn'); } catch (_) {}
        }
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
