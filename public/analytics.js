// public/analytics.js
// 統一 GA / FB Pixel 事件入口。所有功能埋碼只呼叫 window.track('event_name', { ... })，
// 不直接散佈 typeof gtag !== 'undefined' 的 pattern。
//
// 設計原則：
//   - 永不拋例外（埋碼壞了不能影響主功能）
//   - gtag / fbq 沒載入時 silent no-op（local dev、被 adblock 擋掉、SSO 子站等情境）
//   - 不在這裡注入 gtag.js（GA 已由 HTML head 注入；本檔只做 wrapper）
(function () {
    'use strict';
    function track(event, params) {
        try {
            if (typeof gtag !== 'undefined') {
                gtag('event', event, params || {});
            }
            if (typeof fbq !== 'undefined') {
                fbq('trackCustom', event, params || {});
            }
        } catch (_) { /* analytics 不能影響功能 */ }
    }
    window.track = track;
})();
