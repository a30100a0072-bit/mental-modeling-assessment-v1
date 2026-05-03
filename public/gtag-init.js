// public/gtag-init.js
// GA4 初始化 (Measurement ID: G-WZV7TBV6G2)
// 載入 gtag.js + 設定 + 派發初始 page_view。
// 此檔在所有 HTML <head> 中載入；analytics.js 的 window.track() 會接到 gtag。
//
// 隱私 / 同意：當前不做 cookie consent banner（站點不對歐盟 / 加州主動投放廣告）。
// 若日後要做 GDPR/CCPA，需在此加 consent mode v2 default 與 update。
(function () {
    'use strict';
    var GA_ID = 'G-WZV7TBV6G2';

    // 載 gtag.js（async，不擋首屏）
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, {
        // 跨子網域 session 串接：跟 chiyigo / talo 同一資源時（之後在 GA console 加 linker domains）
        // 若未在 GA 後台設網域，這個 config 不影響功能，只是不串接
        send_page_view: true,
        // 性能：不要在每次 history.pushState 也送 — 讓我們手動 track 路由變化（目前是 MPA，不需要）
    });
})();
