(function () {
    // ⚠️ APPS 內容下方走 innerHTML 拼接（panel.innerHTML = ...）；目前是 hardcoded array 所以 XSS 安全。
    //    **若未來改成從 API / 動態來源讀，必須改用 textContent / DOM API 否則會 XSS。**
    const APPS = [
        // 全部走 hash：fragment 不會進 server log / Referer / browser history search
        // 統一用 chiyigo_token：兩 app 是 chiyigo IAM 底下平行子應用，token 都來自同一個發行方
        { id: 'chiyigo', name: 'Chiyigo',         desc: '主站 / 帳號中心', url: 'https://chiyigo.com',         icon: '🅒', host: 'chiyigo.com',         tokenParam: null },
        { id: 'mbti',    name: 'MBTI 靈魂測試',  desc: '人格類型分析',    url: 'https://mbti.chiyigo.com',    icon: '🧠', host: 'mbti.chiyigo.com',    tokenParam: 'chiyigo_token',   tokenMode: 'hash' },
        { id: 'talo',    name: '奧秘塔羅 Talo',  desc: '神秘學占卜',      url: 'https://talo.chiyigo.com',    icon: '🔮', host: 'talo.chiyigo.com',    tokenParam: 'chiyigo_token',   tokenMode: 'hash' },
    ];

    function currentAppId() {
        const h = location.hostname;
        const a = APPS.find(x => h === x.host);
        return a ? a.id : null;
    }

    // 若 sessionStorage 有 token，附在目標 URL 上以跨 origin 傳遞登入狀態
    function buildDestUrl(app) {
        if (!app.tokenParam) return app.url;
        const token = sessionStorage.getItem('chiyigo_access_token');
        if (!token) return app.url;
        const sep = app.tokenMode === 'hash' ? '#' : '?';
        return app.url + sep + app.tokenParam + '=' + encodeURIComponent(token);
    }

    function init() {
        const headerActions = document.querySelector('.landing-header .header-actions');
        if (!headerActions) return;

        const trigger = document.createElement('button');
        trigger.className = 'app-switcher-trigger';
        trigger.type = 'button';
        trigger.setAttribute('aria-label', 'Chiyigo 應用切換');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">' +
            '<circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/><circle cx="15" cy="3" r="1.6"/>' +
            '<circle cx="3" cy="9" r="1.6"/><circle cx="9" cy="9" r="1.6"/><circle cx="15" cy="9" r="1.6"/>' +
            '<circle cx="3" cy="15" r="1.6"/><circle cx="9" cy="15" r="1.6"/><circle cx="15" cy="15" r="1.6"/></svg>';

        const hamburger = headerActions.querySelector('.hamburger');
        if (hamburger) headerActions.insertBefore(trigger, hamburger);
        else headerActions.appendChild(trigger);

        const panel = document.createElement('div');
        panel.className = 'app-switcher-panel hidden';
        panel.setAttribute('role', 'menu');
        const curId = currentAppId();
        panel.innerHTML =
            '<div class="app-switcher-title">CHIYIGO 應用</div>' +
            APPS.map(a => {
                const cur = a.id === curId;
                const tag = cur ? 'div' : 'a';
                // href 先填靜態 URL；有 token 的情況由 click handler 動態覆蓋
                const attr = cur ? '' : ' href="' + a.url + '" data-app-id="' + a.id + '" rel="noopener"';
                const iconHtml = cur ? '<span class="app-current-star">★</span>' : a.icon;
                const descText = cur ? '當前應用' : a.desc;
                return '<' + tag + ' class="app-card' + (cur ? ' current' : '') + '"' + attr + '>' +
                    '<div class="app-icon">' + iconHtml + '</div>' +
                    '<div class="app-meta">' +
                        '<div class="app-name">' + a.name + '</div>' +
                        '<div class="app-desc">' + descText + '</div>' +
                    '</div>' +
                '</' + tag + '>';
            }).join('');
        document.body.appendChild(panel);

        // 攔截 app-card 點擊，在導航前把 token 附到 URL
        panel.addEventListener('click', (e) => {
            const card = e.target.closest('a.app-card[data-app-id]');
            if (!card) return;
            const app = APPS.find(a => a.id === card.dataset.appId);
            if (!app) return;
            const dest = buildDestUrl(app);
            if (dest !== app.url) {
                e.preventDefault();
                window.location.href = dest;
            }
            // 若無 token，讓預設 href 行為處理
        });

        function position() {
            const r = trigger.getBoundingClientRect();
            panel.style.top = (r.bottom + 8) + 'px';
            panel.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
        }
        function open() {
            panel.classList.remove('hidden');
            position();
            trigger.setAttribute('aria-expanded', 'true');
        }
        function close() {
            panel.classList.add('hidden');
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.contains('hidden') ? open() : close();
        });
        document.addEventListener('click', (e) => {
            if (!panel.classList.contains('hidden') && !panel.contains(e.target) && !trigger.contains(e.target)) close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });
        window.addEventListener('resize', () => {
            if (!panel.classList.contains('hidden')) position();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
