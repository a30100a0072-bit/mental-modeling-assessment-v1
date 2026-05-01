// chiyigo-auth.js — 共用 chiyigo IAM 認證工具
//
// 提供：
//   - chiyigoRefresh()    用 localStorage.chiyigo_refresh_token 跟 chiyigo 換新 access_token
//                         成功 → 寫回 sessionStorage 並回傳新 token；失敗 → 回傳 null
//   - chiyigoFetch(url, opts)
//                         自動帶 Authorization: Bearer；401 時自動嘗試 refresh 並重試一次；
//                         refresh 失敗才往外拋（caller 自行決定 logout 或顯示錯誤）
//
// 使用：在 HTML 用 <script src="chiyigo-auth.js"></script> 比業務 JS 早載入。
// 設計約定：chiyigo IAM 是跨 origin（chiyigo.com），refresh 走 body 模式不靠 cookie。
;(function () {
    'use strict';

    var CHIYIGO_REFRESH = 'https://chiyigo.com/api/auth/refresh';
    var TOKEN_KEY       = 'chiyigo_access_token';
    var REFRESH_KEY     = 'chiyigo_refresh_token';
    var AUD             = 'mbti';

    async function chiyigoRefresh() {
        var rt = localStorage.getItem(REFRESH_KEY);
        if (!rt) return null;
        try {
            var r = await fetch(CHIYIGO_REFRESH, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: rt, aud: AUD }),
            });
            if (!r.ok) return null;
            var data = await r.json();
            if (data.access_token)  sessionStorage.setItem(TOKEN_KEY, data.access_token);
            if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
            return data.access_token || null;
        } catch (e) { return null; }
    }

    // 自動帶 token + 401 retry。Auth-optional caller（訪客也能用的 endpoint）
    // 應該自己處理 token，不要走這個 helper。
    async function chiyigoFetch(url, opts) {
        opts = opts || {};
        var headers = new Headers(opts.headers || {});
        var token = sessionStorage.getItem(TOKEN_KEY);
        if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
        var init = Object.assign({}, opts, { headers: headers });

        var r = await fetch(url, init);
        if (r.status !== 401) return r;

        // 401 → 嘗試 refresh 一次
        var newToken = await chiyigoRefresh();
        if (!newToken) return r; // refresh 失敗，把原 401 回給 caller

        var retryHeaders = new Headers(init.headers);
        retryHeaders.set('Authorization', 'Bearer ' + newToken);
        return fetch(url, Object.assign({}, init, { headers: retryHeaders }));
    }

    window.chiyigoRefresh = chiyigoRefresh;
    window.chiyigoFetch   = chiyigoFetch;
})();
