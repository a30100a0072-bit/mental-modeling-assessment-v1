// public/i18n.js
// 極簡 i18n 基礎建設。預設語言 zh-Hant；要新增 en 時：
//   1. 在 LOCALES 加 'en' 字典
//   2. 將要翻譯的文字標 data-i18n="key.path"
//   3. 呼叫 window.setLocale('en')，會自動 walk 整頁套用
//
// 用法：
//   <h1 data-i18n="hero.title">發現你的深層心智模型</h1>
//   <button data-i18n="action.startQuiz" data-i18n-attr="aria-label">…</button>
//   const s = window.t('result.label.cognitiveType');
(function () {
    'use strict';
    const KEY = 'mbti_locale';

    const LOCALES = {
        'zh-Hant': {
            hero: {
                title: '發現你的<span class="highlight">深層心智</span>模型',
                subtitle: '基於榮格八維與畢比模型 (John Beebe) 構建的專業測評工具。',
                ctaPrimary: '開始測驗 (高壓解析模組)'
            },
            nav: {
                home: '首頁',
                login: '登入 / 註冊',
                dashboard: '進入儀表板',
                openMenu: '開啟導覽選單',
                closeMenu: '關閉導覽選單'
            },
            phase: { A: '日常版', B: '高壓版', C: '願景版', D: '日常行為量表', E: '決策情境量表', F: '認知偏好量表' },
            action: {
                startQuiz: '開始測驗',
                next: '下一步',
                back: '上一步',
                skip: '略過',
                submit: '提交',
                save: '儲存',
                share: '分享',
                copy: '複製',
                download: '下載',
                logout: '登出'
            },
            result: {
                label: {
                    cognitiveType: 'YOUR COGNITIVE TYPE',
                    visualAnalysis: '視覺分析',
                    functionScores: '八維度分數',
                    deepAnalysis: '深度解析'
                },
                msg: {
                    cloudProb: '雲端判定機率',
                    localProb: '本地解碼機率'
                }
            },
            quiz: {
                progressOf: '當前進度: 模組 {p} / {max}',
                pleaseFinish: '請完成所有題目以利精準建模。',
                autosaved: '已自動儲存',
                leavingWarn: '測驗尚未提交，離開將會中斷進度，確定要離開嗎？'
            },
            theme: { toLight: '切換到淺色模式', toDark: '切換到深色模式' },
            error: { notFound: '神經連結中斷', unauthorized: '授權過期，請重新登入' }
        }
        // 'en': { ... 之後再補 }
    };

    let current = (function () {
        try {
            const saved = localStorage.getItem(KEY);
            if (saved && LOCALES[saved]) return saved;
        } catch (_) {}
        const nav = (navigator.language || 'zh-Hant').toLowerCase();
        if (nav.startsWith('zh')) return 'zh-Hant';
        return LOCALES[nav] ? nav : 'zh-Hant';
    })();

    function deepGet(obj, path) {
        return path.split('.').reduce((acc, k) => (acc && k in acc) ? acc[k] : undefined, obj);
    }

    function format(str, vars) {
        if (!vars) return str;
        return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : '{' + k + '}'));
    }

    window.t = function (key, vars, fallback) {
        const dict = LOCALES[current] || LOCALES['zh-Hant'];
        const v = deepGet(dict, key);
        if (typeof v === 'string') return format(v, vars);
        return fallback != null ? fallback : key;
    };

    function applyDom(root) {
        (root || document).querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            const attr = el.getAttribute('data-i18n-attr');
            const txt = window.t(key, null, el.textContent);
            if (attr) el.setAttribute(attr, txt);
            else el.innerHTML = txt;
        });
    }

    window.setLocale = function (loc) {
        if (!LOCALES[loc]) return false;
        current = loc;
        try { localStorage.setItem(KEY, loc); } catch (_) {}
        document.documentElement.setAttribute('lang', loc);
        applyDom();
        return true;
    };
    window.getLocale = function () { return current; };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyDom());
    } else {
        applyDom();
    }
})();
