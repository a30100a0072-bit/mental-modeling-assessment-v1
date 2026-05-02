// chiyigo-auth.js — 共用 chiyigo IAM 認證工具（OIDC + cookie 模式）
//
// 提供：
//   - chiyigoRefresh()       帶 chiyigo cookie（Domain=.chiyigo.com）跟 chiyigo 換新 access_token
//                            成功 → 寫回 sessionStorage 並回傳新 token；失敗 → 回傳 null
//   - chiyigoFetch(url, opts)
//                            自動帶 Authorization: Bearer；401 時自動 refresh + retry 一次
//   - chiyigoLogout()        撤 IAM session（best-effort）+ 清本地 + reload
//   - chiyigoSetupAuthUI(authBtnId, dashBtnId)
//                            收斂登入/登出按鈕的共用 UI 邏輯，等 silent login 完成後再渲染
//   - window.chiyigoReady    Promise，silent login 嘗試完成後 resolve（無論成敗）
//
// 使用：在 HTML 用 <script src="chiyigo-auth.js"></script> 比業務 JS 早載入。
// 設計約定：refresh_token 走 chiyigo Domain=.chiyigo.com HttpOnly cookie，跨子網域共享；
// 本檔不再讀寫 localStorage 中的 refresh_token，所有 chiyigo fetch 都帶 credentials:'include'。
;(function () {
    'use strict';

    var CHIYIGO_REFRESH = 'https://chiyigo.com/api/auth/refresh';
    var CHIYIGO_LOGOUT  = 'https://chiyigo.com/api/auth/logout';
    var TOKEN_KEY       = 'chiyigo_access_token';
    var ID_TOKEN_KEY    = 'chiyigo_id_token';
    var AUD             = 'mbti';

    async function chiyigoRefresh() {
        try {
            var r = await fetch(CHIYIGO_REFRESH, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ aud: AUD }),
            });
            if (!r.ok) return null;
            var data = await r.json();
            if (data.access_token) sessionStorage.setItem(TOKEN_KEY, data.access_token);
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

        var newToken = await chiyigoRefresh();
        if (!newToken) return r;

        var retryHeaders = new Headers(init.headers);
        retryHeaders.set('Authorization', 'Bearer ' + newToken);
        return fetch(url, Object.assign({}, init, { headers: retryHeaders }));
    }

    // OIDC RP-Initiated Logout：跳 chiyigo end_session_endpoint
    // chiyigo 會撤所有 refresh + 嵌 iframe 同步登出 chiyigo / talo（front-channel logout）
    // 本端 storage 立刻清，使用者體感「即時登出」；end_session 跑完再 redirect 回來
    // redirectUrl 參數保留向後相容但忽略 — post_logout_redirect_uri 必在 chiyigo 白名單，
    // 統一回 mbti home（'/' = 'https://mbti.chiyigo.com/'）。
    function chiyigoLogout(_redirectUrl) {
        var idHint = sessionStorage.getItem(ID_TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(ID_TOKEN_KEY);
        sessionStorage.removeItem('chiyigo_email');
        localStorage.removeItem('mbti_v1_final');
        localStorage.removeItem('mbti_guest_id');
        var url = 'https://chiyigo.com/api/auth/oauth/end-session?post_logout_redirect_uri=' +
                  encodeURIComponent('https://mbti.chiyigo.com/');
        if (idHint) url += '&id_token_hint=' + encodeURIComponent(idHint);
        window.location.href = url;
    }

    // OIDC Front-Channel Logout 訊號：其他子站登出 → 同源主頁分頁立刻清 access_token + reload UI
    window.addEventListener('storage', function (e) {
        if (e.key !== 'oidc_logout_at') return;
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(ID_TOKEN_KEY);
        sessionStorage.removeItem('chiyigo_email');
        // dashboard / 私密頁跳 index；home 也要 reload 才能讓登入按鈕從「進入儀表板/登出」
        // 重新 render 成「登入/註冊」（chiyigoSetupAuthUI 只在 DOMContentLoaded 跑一次，不能反向 reset）
        if (location.pathname !== '/' && location.pathname !== '/index.html') {
            location.href = '/index.html';
        } else {
            location.reload();
        }
    });

    // 啟動時 silent login：若無 access_token，嘗試靠 chiyigo cookie 換一個。
    // cookie 跨子網域共享後，使用者只要在 chiyigo.com 登入過，這裡就會自動補 token。
    var chiyigoReady = (async function () {
        if (sessionStorage.getItem(TOKEN_KEY)) return true;
        await chiyigoRefresh();
        return !!sessionStorage.getItem(TOKEN_KEY);
    })();

    // 共用 auth UI：等 silent login 完成後決定按鈕該顯示登入或登出。
    async function chiyigoSetupAuthUI(authBtnId, dashBtnId, redirectUrl) {
        await chiyigoReady;
        var authBtn = authBtnId ? document.getElementById(authBtnId) : null;
        var dashBtn = dashBtnId ? document.getElementById(dashBtnId) : null;
        if (!sessionStorage.getItem(TOKEN_KEY)) return;
        if (dashBtn) dashBtn.style.display = 'inline-block';
        if (!authBtn) return;
        authBtn.innerText = '登出系統';
        authBtn.style.color = '#ef4444';
        authBtn.style.borderColor = '#ef4444';
        authBtn.classList.add('logout-mode');
        authBtn.onclick = function () { chiyigoLogout(redirectUrl || 'index.html'); };
    }

    window.chiyigoRefresh     = chiyigoRefresh;
    window.chiyigoFetch       = chiyigoFetch;
    window.chiyigoLogout      = chiyigoLogout;
    window.chiyigoSetupAuthUI = chiyigoSetupAuthUI;
    window.chiyigoReady       = chiyigoReady;
})();
