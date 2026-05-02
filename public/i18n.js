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
            error: { notFound: '神經連結中斷', unauthorized: '授權過期，請重新登入' },
            ui: {
                langToggle: '切換語言',
                tagline404: '這條認知通路不在我們的拓撲圖上。可能是連結已過期、頁面已遷移，或拼錯網址。',
                btnBackHome: '回到首頁',
                btnDashboard: '進入儀表板',
                contactReport: '如果你是從外部連結點過來且確定路徑正確，請寄信回報。'
            }
        },
        'en': {
            hero: {
                title: 'Discover Your <span class="highlight">Deep Mind</span> Model',
                subtitle: 'A professional assessment built on Jung\'s 8 functions and the Beebe model.',
                ctaPrimary: 'Start Assessment (Stress Module)'
            },
            nav: {
                home: 'Home',
                login: 'Sign In / Sign Up',
                dashboard: 'Dashboard',
                openMenu: 'Open navigation menu',
                closeMenu: 'Close navigation menu'
            },
            phase: { A: 'Daily', B: 'Stress', C: 'Vision', D: 'Behavior', E: 'Decision', F: 'Cognition' },
            action: {
                startQuiz: 'Start',
                next: 'Next',
                back: 'Back',
                skip: 'Skip',
                submit: 'Submit',
                save: 'Save',
                share: 'Share',
                copy: 'Copy',
                download: 'Download',
                logout: 'Sign out'
            },
            result: {
                label: {
                    cognitiveType: 'YOUR COGNITIVE TYPE',
                    visualAnalysis: 'Visual Analysis',
                    functionScores: '8-Function Scores',
                    deepAnalysis: 'Deep Analysis'
                },
                msg: {
                    cloudProb: 'Cloud-judged probability',
                    localProb: 'Locally decoded probability'
                }
            },
            quiz: {
                progressOf: 'Progress: {p} / {max}',
                pleaseFinish: 'Please answer every question for accurate modeling.',
                autosaved: 'Auto-saved',
                leavingWarn: 'Your assessment is unsaved. Leaving will lose progress. Continue?'
            },
            theme: { toLight: 'Switch to light mode', toDark: 'Switch to dark mode' },
            error: { notFound: 'Connection lost', unauthorized: 'Session expired, please sign in again' },
            ui: {
                langToggle: 'Toggle language',
                tagline404: 'This cognitive path is not on our topology map. The link may be expired, the page moved, or the URL mistyped.',
                btnBackHome: 'Back to home',
                btnDashboard: 'Dashboard',
                contactReport: 'If you reached here from an external link with a correct path, please report by email.'
            }
        }
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

    function injectLangToggle() {
        const headerActions = document.querySelector('.landing-header .header-actions');
        if (!headerActions) return;
        if (headerActions.querySelector('.lang-toggle')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lang-toggle';
        btn.setAttribute('aria-label', window.t('ui.langToggle', null, '切換語言'));
        btn.title = window.t('ui.langToggle', null, '切換語言');
        btn.textContent = current === 'en' ? 'EN' : '中';
        btn.onclick = () => {
            const next = current === 'en' ? 'zh-Hant' : 'en';
            window.setLocale(next);
            btn.textContent = next === 'en' ? 'EN' : '中';
        };
        // 插在 theme-toggle 前，沒有的話放最前
        const themeBtn = headerActions.querySelector('.theme-toggle');
        if (themeBtn) headerActions.insertBefore(btn, themeBtn);
        else {
            const hamburger = headerActions.querySelector('.hamburger');
            if (hamburger) headerActions.insertBefore(btn, hamburger);
            else headerActions.appendChild(btn);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { applyDom(); injectLangToggle(); });
    } else {
        applyDom();
        injectLangToggle();
    }
})();
