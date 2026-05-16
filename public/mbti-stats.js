// public/mbti-stats.js — mbti-stats.html 頁面動畫
// 從原 inline <script> 抽出。auth 部分由 page-init-common.js 統一處理。
;(function () {
    'use strict';
    function animateBars() {
        document.querySelectorAll('.bar-fill').forEach(function (bar) {
            bar.style.transform = 'scaleX(1)';
        });
    }
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(animateBars, 100);
    });
})();
