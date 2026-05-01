(function () {
    const APPS = [
        { id: 'chiyigo', name: 'Chiyigo',         desc: '主站 / 帳號中心', url: 'https://chiyigo.com',         icon: '🅒', host: 'chiyigo.com' },
        { id: 'mbti',    name: 'MBTI 靈魂測試',  desc: '人格類型分析',    url: 'https://mbti.chiyigo.com',    icon: '🧠', host: 'mbti.chiyigo.com' },
        { id: 'talo',    name: '奧秘塔羅 Talo',  desc: '神秘學占卜',      url: 'https://talo-web.pages.dev',  icon: '🔮', host: 'talo-web.pages.dev' },
    ];

    function currentAppId() {
        const h = location.hostname;
        const a = APPS.find(x => h === x.host || h.endsWith('.' + x.host));
        return a ? a.id : null;
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
                const attr = cur ? '' : ' href="' + a.url + '" rel="noopener"';
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
