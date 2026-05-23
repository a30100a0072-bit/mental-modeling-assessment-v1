// public/type-detail.js — type-detail.html 頁面渲染邏輯
// 從原 inline <script> 抽出（CSP 拔 unsafe-inline Batch 1）。邏輯未變動。
;(function () {
    'use strict';

    // 認知底層註解字典 — 中文 fallback；英文交給 ENGINE_I18N_EN.tips
    const functionTipsZh = {
        Ti: "底層邏輯：尋求完美自洽的模型",
        Te: "客觀秩序：推動高壓行政與資源調配",
        Fi: "內在信仰：絕對不妥協的個人價值",
        Fe: "群體共振：掌控環境情緒與人際網絡",
        Ni: "終局收斂：戰略推演與長遠趨勢預判",
        Ne: "發散擴張：跨界連結與顛覆既有概念",
        Si: "經驗守護：死守歷史參數與防禦機制",
        Se: "物理動態：即時適應並掌控物理環境"
    };

    function getTipDict() {
        const isEn = (typeof window.getLocale === 'function' && window.getLocale() === 'en');
        if (isEn && window.ENGINE_I18N_EN && window.ENGINE_I18N_EN.tips) return window.ENGINE_I18N_EN.tips;
        return functionTipsZh;
    }
    // 提取縮寫代碼的輔助函數
    const getTip = (fullStr) => {
        const dict = getTipDict();
        return dict[fullStr.split(' ')[0]] || '';
    };

    let currentTargetType = 'INTJ';

    function getPersonalityData(type) {
        const isEn = (typeof window.getLocale === 'function' && window.getLocale() === 'en');
        const enDb = window.PERSONALITY_DATABASE_EN || {};
        const zhDb = window.PERSONALITY_DATABASE || {};
        if (isEn && enDb[type]) return enDb[type];
        return zhDb[type];
    }

    function _T(k, fb) {
        return (typeof window.t === 'function') ? window.t(k, null, fb) : fb;
    }

    function renderTypeDetail() {
        const data = getPersonalityData(currentTargetType);
        const renderArea = document.getElementById('render-area');
        if (!data) {
            renderArea.innerHTML = `<h2 class="detail-not-found">${_T('typeDetail.notFound', '找不到該人格型態的資料，請返回上一頁。')}</h2>`;
            return;
        }
        const traitsHtml = data.traits.map(t => `<div class="trait-tag">◈ ${t}</div>`).join('');
        renderArea.innerHTML = `
            <div class="detail-hero">
                <div class="type-badge">${currentTargetType}</div>
                <div class="type-name-hero">${data.name}</div>
                <div class="type-tagline">"${data.tagline}"</div>

                <div class="stack-container">
                    <div class="stack-box"><div class="stack-role">${_T('typeDetail.stackEgo', '主導 (Ego)')}</div><div class="stack-func" data-tip="${getTip(data.stack.dom)}">${data.stack.dom}</div></div>
                    <div class="stack-box"><div class="stack-role">${_T('typeDetail.stackParent', '輔助 (Parent)')}</div><div class="stack-func" data-tip="${getTip(data.stack.aux)}">${data.stack.aux}</div></div>
                    <div class="stack-box"><div class="stack-role">${_T('typeDetail.stackChild', '第三 (Child)')}</div><div class="stack-func" data-tip="${getTip(data.stack.tert)}">${data.stack.tert}</div></div>
                    <div class="stack-box stack-box--inferior"><div class="stack-role stack-role--inferior">${_T('typeDetail.stackInferior', '劣勢 (Inferior)')}</div><div class="stack-func stack-func--inferior" data-tip="${getTip(data.stack.inf)}">${data.stack.inf}</div></div>
                </div>
            </div>

            <nav class="td-tabs" id="td-tabs" role="tablist" aria-label="Type deep classification">
                <button class="td-tab is-active" data-target="td-pane-core" role="tab" aria-selected="true">${_T('typeDetail.tabCore', '◈ 核心特質')}</button>
                <button class="td-tab" data-target="td-pane-career" role="tab" aria-selected="false">${_T('typeDetail.tabCareer', '💼 職涯')}</button>
                <button class="td-tab" data-target="td-pane-rel" role="tab" aria-selected="false">${_T('typeDetail.tabRelationship', '❤️ 感情')}</button>
                <button class="td-tab" data-target="td-pane-shadow" role="tab" aria-selected="false">${_T('typeDetail.tabShadow', '🌑 陰影')}</button>
                <button class="td-tab" data-target="td-pane-evo" role="tab" aria-selected="false">${_T('typeDetail.tabEvolution', '🌱 進化')}</button>
            </nav>

            <div class="td-panes">
                <section class="td-pane is-active" id="td-pane-core" role="tabpanel">
                    <div class="content-section">
                        <h3>${_T('typeDetail.coreHeader', '◈ 核心特質速覽')}</h3>
                        <div class="traits-list">${traitsHtml}</div>
                    </div>
                </section>
                <section class="td-pane" id="td-pane-career" role="tabpanel" hidden>
                    <div class="content-section">${data.career}</div>
                </section>
                <section class="td-pane" id="td-pane-rel" role="tabpanel" hidden>
                    <div class="content-section">${data.relationship}</div>
                </section>
                <section class="td-pane" id="td-pane-shadow" role="tabpanel" hidden>
                    <div class="content-section danger">${data.shadow}</div>
                </section>
                <section class="td-pane" id="td-pane-evo" role="tabpanel" hidden>
                    <div class="content-section evolution">${data.evolution}</div>
                </section>
            </div>
        `;

        // tab 切換 (renderArea 重新渲染後 listener 也要重綁)
        const tabs = document.querySelectorAll('.td-tab');
        const panes = document.querySelectorAll('.td-pane');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.target;
                tabs.forEach(t => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-selected', t === tab); });
                panes.forEach(p => {
                    const on = p.id === target;
                    p.classList.toggle('is-active', on);
                    p.hidden = !on;
                });
                if (window.track) window.track('type_detail_tab_switch', { type: currentTargetType, tab: target.replace('td-pane-', '') });
                document.getElementById('td-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    async function init() {
        if (typeof window.chiyigoSetupAuthUI === 'function') {
            try { await window.chiyigoSetupAuthUI('auth-nav-btn', 'dash-nav-btn'); } catch (_) {}
        }
        if (typeof window.setupHeaderAuthNav === 'function') {
            try { await window.setupHeaderAuthNav('auth-nav-btn', 'dash-nav-btn'); } catch (_) {}
        }
        const urlParams = new URLSearchParams(window.location.search);
        currentTargetType = (urlParams.get('type') || 'INTJ').toUpperCase();
        renderTypeDetail();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 切語言時重新渲染（資料源切到 EN/ZH + tab/role 文案重新跑 i18n）
    document.addEventListener('localechange', () => {
        try { renderTypeDetail(); } catch (_) {}
    });
})();
