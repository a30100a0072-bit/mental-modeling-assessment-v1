// public/mbti-types.js — mbti-types.html 氣質區段 sticky nav 高亮
// 從原 inline <script> 抽出。auth 部分由 page-init-common.js 統一處理。
;(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', function () {
        const items = document.querySelectorAll('.tj-item');
        if (!items.length) return;
        const map = {};
        items.forEach(it => map[it.dataset.target] = it);
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting && map[e.target.id]) {
                    items.forEach(i => i.classList.remove('active'));
                    map[e.target.id].classList.add('active');
                }
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        ['sec-nt', 'sec-nf', 'sec-sj', 'sec-sp'].forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });
    });
})();
