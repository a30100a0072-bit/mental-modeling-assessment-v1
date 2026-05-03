// public/i18n.js
// 極簡 i18n 基礎建設。預設語言依瀏覽器；目前支援 zh-Hant / en。
//
// 用法：
//   <h1 data-i18n="hero.title">發現你的深層心智模型</h1>
//   <button data-i18n="action.startQuiz" data-i18n-attr="aria-label">…</button>
//   const s = window.t('result.label.cognitiveType');
//
// 切換語言：window.setLocale('en')；自動 walk 整頁套用 + 持久化到 localStorage。
// lang-toggle 按鈕自動注入 .landing-header .header-actions。
//
// **重要紀律**：question / report 內容（questions.js / engine.js reports / personality-data.js）
// 目前只有 zh-Hant；切到 en 時這些 fallback 中文，並由 i18n.contentNotice 顯示橫幅提醒。
// 翻內容是 Phase 2 的事，CLAUDE.md 跟 memory reference_i18n_status 有紀錄。
(function () {
    'use strict';
    const KEY = 'mbti_locale';

    const LOCALES = {
        'zh-Hant': {
            hero: {
                title: '發現你的<span class="highlight">深層心智</span>模型',
                subtitle: '基於榮格八維與畢比模型 (John Beebe) 構建的專業測評工具。<br>不只測量你的表層人格，更深究你在高壓、崩潰與成長時的動態轉換軌跡，為您提供專屬的心智拓撲圖。',
                ctaPrimary: '開始測驗 (高壓解析模組)'
            },
            nav: {
                home: '首頁',
                login: '登入 / 註冊',
                dashboard: '進入儀表板',
                openMenu: '開啟導覽選單',
                closeMenu: '關閉導覽選單'
            },
            sidebar: {
                title: '導覽選單',
                home: '首頁 (Home)',
                moduleA: '模組 A：日常舒適圈 (已開放)',
                moduleB: '模組 B：高壓防禦 (已開放)',
                moduleC: '模組 C：覺醒願景 (已開放)',
                moduleD: '模組 D：日常行為量表 (全新開放)',
                moduleE: '模組 E：決策情境量表 (全新開放)',
                moduleF: '模組 F：認知偏好量表 (全新開放)',
                jung: '📖 榮格八維科普 (Jungian Theory)',
                beebe: '📖 畢比模型科普 (Beebe Model)',
                types: '👥 MBTI 16人格特質',
                stats: '📊 MBTI 有趣數據',
                dashboard: '會員儀表板 (Dashboard)'
            },
            quickNav: {
                A: '▶ 模組 A (日常舒適圈)',
                B: '▶ 模組 B (高壓防禦)',
                C: '▶ 模組 C (覺醒願景)',
                D: '▶ 模組 D (日常行為)',
                E: '▶ 模組 E (決策情境)',
                F: '▶ 模組 F (認知偏好)'
            },
            home: {
                cardA: { badge: '已上線', title: 'Phase A (日常版)', desc: '低壓舒適圈決策。測量 Ego (自我) 與輔助功能的自然展現順位。', time: '⏱ 約 8 分鐘' },
                cardB: { badge: '已上線', title: 'Phase B (高壓版)', desc: '極端環境防禦。精準測量 Shadow (陰影) 盲區與系統崩潰軌跡。', time: '⏱ 約 8 分鐘' },
                cardC: { badge: '已上線', title: 'Phase C (願景版)', desc: '劣勢功能覺醒。測量 Anima (潛意識) 整合度與未來成長潛力。', time: '⏱ 約 10 分鐘', lock: '🔒 需登入' },
                cardD: { badge: '全新動態架構', title: 'Phase D (日常行為量表)', desc: '專注於習慣、空間互動與無意識行為。包含李克特量表與自適應補題機制。', time: '⏱ 約 12 分鐘', lock: '🔒 需登入' },
                cardE: { badge: '全新動態架構', title: 'Phase E (決策情境量表)', desc: '專注於投資、職場高壓選擇與利益權衡。結合 SJT 情境驗證，徹底消除偽裝。', time: '⏱ 約 12 分鐘', lock: '🔒 需登入' },
                cardF: { badge: '全新動態架構', title: 'Phase F (認知偏好量表)', desc: '探索最底層的世界觀、學習模式與價值排序。強制解構心智模型。', time: '⏱ 約 12 分鐘', lock: '🔒 需登入' }
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
                logout: '登出',
                pauseQuiz: '暫停測驗',
                generateShare: '產生分享卡',
                copyShareLink: '複製分享連結',
                viewDashboard: '進入儀表板',
                restartQuiz: '重新測驗'
            },
            quiz: {
                progressOf: '當前進度: 模組 {p} / {max}',
                pleaseFinish: '請完成所有題目以利精準建模。',
                pleaseFinishCalibration: '請完成所有最後的校準題目。',
                autosaved: '已自動儲存',
                leavingWarn: '測驗尚未提交，離開將會中斷進度，確定要離開嗎？',
                resumeHeadline: '進度已自動存檔（已完成 {n} / 4 階段）',
                resumeSub: '隨時可以關閉視窗，下次造訪會從這題自動接續。',
                pauseToast: '進度已存檔，下次造訪會從這題接續 ✓',
                halfwayToast: '🎯 過半啦！再撐一下就拿到結果。',
                finalCalibrationHeader: 'PHASE 05: 最終校準',
                finalCalibrationDescMulti: '最後 {n} 題，請憑直覺作答以完成測驗。',
                finalCalibrationDescOne: '最後 1 題，請憑直覺作答以完成測驗。',
                btnConfirmStep: '確認選項 ({p}/5)',
                btnScanCore: '掃描核心維度 (4/5)',
                btnSubmitFinal: '提交並連接 Cloudflare V1 引擎',
                subProgressRemain: '剩 {remain} 題 · 已完成 {done}/{total}（{pct}%）',
                subProgressLast: '🔥 剩最後 {remain} 題！（已完成 {done}/{total}）',
                subProgressDone: '✅ 本段全數完成（{total} 題）',
                etaMinutes: '· 預估還需 {n} 分鐘',
                etaSeconds: '· 預估還需 {n} 秒'
            },
            result: {
                label: {
                    cognitiveType: 'YOUR COGNITIVE TYPE',
                    visualAnalysis: '視覺分析',
                    functionScores: '八維度分數',
                    deepAnalysis: '深度解析',
                    matrix: '16人格判定概率矩陣',
                    matrixCloud: '16人格判定概率矩陣 (雲端運算)',
                    matrixLocal: '16人格判定概率矩陣 (本地還原)',
                    compatTitle: '◈ 與你最互補的人格 (Compatibility)',
                    compatHint: '不是「誰跟誰絕配」這種星座式廢話，而是榮格 / Socionics 的軸線互補：你的盲點是 TA 的本能。',
                    compatDuality: '🔮 互補伴侶',
                    compatMirror: '🪞 鏡像成長',
                    compatActivator: '⚡ 啟動夥伴',
                    compatDualityDesc: '你的劣勢，是 TA 的英雄。最深的安全感與互補。',
                    compatMirrorDesc: '相同核心價值，但執行風格相反。互相照鏡子。',
                    compatActivatorDesc: '相同氣質，能量極性相反，互相推進不卡關。',
                    compatCta: '查看 {type} 全解析 →'
                },
                msg: {
                    cloudProb: '雲端判定機率',
                    localProb: '本地解碼機率',
                    notReady: '結果尚未準備好，無法產生分享卡。',
                    notRendered: '結果尚未渲染完成，請稍候再試。',
                    generating: '正在產生分享卡…',
                    shareDownloaded: '分享卡已下載 ✓',
                    shareFailed: '產生分享卡失敗：{msg}',
                    copySuccess: '防篡改連結已複製'
                },
                tag: { ego: 'EGO', subconscious: '潛意識', shadow: '陰影' }
            },
            dashboard: {
                title: '心智歷史儀表板',
                stabilityHeader: '◈ 核心拓撲指標 (Stability Metrics)',
                statTotal: '測驗總數',
                statLatest: '當前主導人格',
                statStability: '心智穩定度',
                statAvgQ: '平均答題數',
                aggregatedHeader: '🧠 綜合心智拓撲分析 (Aggregated Overview)',
                trendHeader: '📉 四軸傾向時間序列 (Dichotomy Trend)',
                trendHint: '每次測驗的 E / N / T / J 機率（基於 16 型的後驗分佈），看出你大腦的偏好如何隨時間漂移。',
                compareHeader: '🆚 模組差異對比 (Version Compare)',
                compareHint: '每個模組最新一次的能量分布疊圖。日常 (A) vs 高壓 (B) vs 願景 (C) 的落差，就是你大腦在不同情境下的真實切換軌跡。',
                timelineHeader: '📈 心智演化軌跡 (Type Evolution)',
                historyHeader: '◈ 歷史軌跡 (History & Versions)',
                btnNewQuiz: '➕ 啟動新測驗',
                emptyTitle: '尚未建立任何神經模型',
                emptyDesc: '從下方任一模組開始你的第一次自我建模，結果會被記錄在這裡。',
                dangerHeader: '⚠️ GDPR 遺忘權限 (Data Deletion)',
                dangerDesc: '執行此操作將觸發硬刪除 (Hard Delete)，永久清除您的帳號、密碼雜湊與所有大腦建模紀錄，無法復原。',
                btnDelete: '永久銷毀檔案',
                deleteConfirm: '⚠️ 警告：這將永久刪除您的帳號與所有測驗歷史。此操作不可逆。確定執行嗎？',
                deleteSuccess: '您的神經連結檔案已從系統中永久銷毀。',
                deleteAuthExpired: '授權過期，請重新登入。',
                deleteFailed: '銷毀失敗，請稍後再試。',
                fetchFailed: '無法連接歷史資料庫',
                noAuth: '未偵測到神經連結授權，請重新登入。'
            },
            theme: { toLight: '切換到淺色模式', toDark: '切換到深色模式' },
            error: {
                notFound: '神經連結中斷',
                unauthorized: '授權過期，請重新登入',
                pageNotFoundTitle: '404 — 找不到這條神經通路',
                engineFail: '演算法引擎連接失敗。請確認 Cloudflare Worker 已發布最新代碼。',
                cacheCorrupt: '偵測到手機瀏覽器快取異常，請清除快取重新載入。'
            },
            ui: {
                langToggle: '切換語言',
                tagline404: '這條認知通路不在我們的拓撲圖上。可能是連結已過期、頁面已遷移，或拼錯網址。',
                btnBackHome: '回到首頁',
                btnDashboard: '進入儀表板',
                contactReport: '如果你是從外部連結點過來且確定路徑正確，請寄信回報。',
                contentZhOnly: '⚠️ 題目與人格報告目前僅提供繁體中文；介面已切換為英文。'
            },
            typeDetail: {
                stackEgo: '主導 (Ego)',
                stackParent: '輔助 (Parent)',
                stackChild: '第三 (Child)',
                stackInferior: '劣勢 (Inferior)',
                tabCore: '◈ 核心特質',
                tabCareer: '💼 職涯',
                tabRelationship: '❤️ 感情',
                tabShadow: '🌑 陰影',
                tabEvolution: '🌱 進化',
                coreHeader: '◈ 核心特質速覽',
                btnBack: '🔙 返回 16 人格圖鑑',
                notFound: '找不到該人格型態的資料，請返回上一頁。'
            }
        },
        'en': {
            hero: {
                title: 'Discover Your <span class="highlight">Deep Mind</span> Model',
                subtitle: 'A professional assessment built on Jung\'s 8 cognitive functions and the Beebe model.<br>Beyond surface personality — we map how your mind shifts under stress, collapse, and growth.',
                ctaPrimary: 'Start Assessment (Stress Module)'
            },
            nav: {
                home: 'Home',
                login: 'Sign In / Sign Up',
                dashboard: 'Dashboard',
                openMenu: 'Open navigation menu',
                closeMenu: 'Close navigation menu'
            },
            sidebar: {
                title: 'Navigation',
                home: 'Home',
                moduleA: 'Module A: Daily Comfort (Live)',
                moduleB: 'Module B: Stress Defense (Live)',
                moduleC: 'Module C: Awakening Vision (Live)',
                moduleD: 'Module D: Daily Behavior (New)',
                moduleE: 'Module E: Decision Scenarios (New)',
                moduleF: 'Module F: Cognitive Preference (New)',
                jung: '📖 Jungian 8-Function Primer',
                beebe: '📖 Beebe Model Primer',
                types: '👥 MBTI 16 Types',
                stats: '📊 MBTI Stats & Trivia',
                dashboard: 'Member Dashboard'
            },
            quickNav: {
                A: '▶ Module A (Daily)',
                B: '▶ Module B (Stress)',
                C: '▶ Module C (Vision)',
                D: '▶ Module D (Behavior)',
                E: '▶ Module E (Decisions)',
                F: '▶ Module F (Cognition)'
            },
            home: {
                cardA: { badge: 'Live', title: 'Phase A (Daily)', desc: 'Low-pressure decisions. Measures the natural order of your Ego and auxiliary functions.', time: '⏱ ~8 min' },
                cardB: { badge: 'Live', title: 'Phase B (Stress)', desc: 'Extreme defense scenarios. Pinpoints your Shadow blind spots and collapse trajectory.', time: '⏱ ~8 min' },
                cardC: { badge: 'Live', title: 'Phase C (Vision)', desc: 'Inferior-function awakening. Measures Anima integration and growth potential.', time: '⏱ ~10 min', lock: '🔒 Login required' },
                cardD: { badge: 'New Adaptive', title: 'Phase D (Daily Behavior)', desc: 'Habits, spatial interaction, and unconscious behaviors. Includes Likert + adaptive follow-ups.', time: '⏱ ~12 min', lock: '🔒 Login required' },
                cardE: { badge: 'New Adaptive', title: 'Phase E (Decision Scenarios)', desc: 'Investing, high-pressure career choices, trade-offs. SJT-validated to remove faking.', time: '⏱ ~12 min', lock: '🔒 Login required' },
                cardF: { badge: 'New Adaptive', title: 'Phase F (Cognitive Preference)', desc: 'Worldview, learning style, and value rank. Forced deconstruction of mental models.', time: '⏱ ~12 min', lock: '🔒 Login required' }
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
                logout: 'Sign out',
                pauseQuiz: 'Pause assessment',
                generateShare: 'Generate share card',
                copyShareLink: 'Copy share link',
                viewDashboard: 'Dashboard',
                restartQuiz: 'Retake'
            },
            quiz: {
                progressOf: 'Progress: Phase {p} / {max}',
                pleaseFinish: 'Please answer every question for accurate modeling.',
                pleaseFinishCalibration: 'Please complete the final calibration questions.',
                autosaved: 'Auto-saved',
                leavingWarn: 'Your assessment is unsaved. Leaving will lose progress. Continue?',
                resumeHeadline: 'Progress saved ({n} / 4 phases complete)',
                resumeSub: 'You can close this window any time — your next visit will resume from here.',
                pauseToast: 'Progress saved — your next visit will resume from here ✓',
                halfwayToast: '🎯 Halfway there! Hang on, your result is close.',
                finalCalibrationHeader: 'PHASE 05: Final Calibration',
                finalCalibrationDescMulti: '{n} more questions. Trust your gut and finish strong.',
                finalCalibrationDescOne: '1 last question. Trust your gut and finish.',
                btnConfirmStep: 'Confirm selection ({p}/5)',
                btnScanCore: 'Scan core dimensions (4/5)',
                btnSubmitFinal: 'Submit & connect to Cloudflare V1 engine',
                subProgressRemain: '{remain} left · {done}/{total} done ({pct}%)',
                subProgressLast: '🔥 Just {remain} left! ({done}/{total} done)',
                subProgressDone: '✅ Section complete ({total} questions)',
                etaMinutes: '· ~{n} min remaining',
                etaSeconds: '· ~{n} sec remaining'
            },
            result: {
                label: {
                    cognitiveType: 'YOUR COGNITIVE TYPE',
                    visualAnalysis: 'Visual Analysis',
                    functionScores: '8-Function Scores',
                    deepAnalysis: 'Deep Analysis',
                    matrix: 'Probability Matrix (16 Types)',
                    matrixCloud: 'Probability Matrix (Cloud-computed)',
                    matrixLocal: 'Probability Matrix (Locally restored)',
                    compatTitle: '◈ Most Compatible Types',
                    compatHint: 'Not horoscope-style "perfect match" nonsense — Jung / Socionics axis complementarity: your blind spot is their instinct.',
                    compatDuality: '🔮 Duality',
                    compatMirror: '🪞 Mirror',
                    compatActivator: '⚡ Activator',
                    compatDualityDesc: 'Your inferior is their hero. Deepest security and complement.',
                    compatMirrorDesc: 'Same core values, opposite execution style. Mutual reflection.',
                    compatActivatorDesc: 'Same temperament, opposite energy polarity. Push each other forward.',
                    compatCta: 'View full {type} analysis →'
                },
                msg: {
                    cloudProb: 'Cloud-judged probability',
                    localProb: 'Locally decoded probability',
                    notReady: 'Result is not ready yet — share card cannot be generated.',
                    notRendered: 'Result is still rendering — please wait a moment.',
                    generating: 'Generating share card…',
                    shareDownloaded: 'Share card downloaded ✓',
                    shareFailed: 'Failed to generate share card: {msg}',
                    copySuccess: 'Tamper-proof link copied'
                },
                tag: { ego: 'EGO', subconscious: 'Subconscious', shadow: 'Shadow' }
            },
            dashboard: {
                title: 'Mind History Dashboard',
                stabilityHeader: '◈ Core Topology Metrics (Stability)',
                statTotal: 'Total assessments',
                statLatest: 'Current dominant type',
                statStability: 'Mind stability',
                statAvgQ: 'Avg. questions answered',
                aggregatedHeader: '🧠 Aggregated Overview',
                trendHeader: '📉 Dichotomy Trend (Time Series)',
                trendHint: 'E / N / T / J probabilities across each assessment (16-type posterior), showing how your preference drifts over time.',
                compareHeader: '🆚 Module Compare',
                compareHint: 'Latest energy distribution per module, overlaid. Daily (A) vs Stress (B) vs Vision (C) gap shows your real switch trajectory.',
                timelineHeader: '📈 Type Evolution',
                historyHeader: '◈ History & Versions',
                btnNewQuiz: '➕ Start a new assessment',
                emptyTitle: 'No mind model built yet',
                emptyDesc: 'Pick any module below for your first self-modeling. Your results will be recorded here.',
                dangerHeader: '⚠️ GDPR Right to Erasure',
                dangerDesc: 'This triggers a hard delete — permanently erasing your account, password hash, and all mind-modeling history. Not recoverable.',
                btnDelete: 'Permanently destroy file',
                deleteConfirm: '⚠️ Warning: this permanently deletes your account and all assessment history. This is irreversible. Proceed?',
                deleteSuccess: 'Your neural-link file has been permanently destroyed from the system.',
                deleteAuthExpired: 'Session expired, please sign in again.',
                deleteFailed: 'Destruction failed, please try again later.',
                fetchFailed: 'Could not connect to history database',
                noAuth: 'No neural-link authorization detected, please sign in again.'
            },
            theme: { toLight: 'Switch to light mode', toDark: 'Switch to dark mode' },
            error: {
                notFound: 'Connection lost',
                unauthorized: 'Session expired, please sign in again',
                pageNotFoundTitle: '404 — Cognitive path not found',
                engineFail: 'Algorithm engine connection failed. Please confirm the Cloudflare Worker is on the latest deploy.',
                cacheCorrupt: 'Detected mobile browser cache corruption — please clear cache and reload.'
            },
            ui: {
                langToggle: 'Toggle language',
                tagline404: 'This cognitive path is not on our topology map. The link may be expired, the page moved, or the URL mistyped.',
                btnBackHome: 'Back to home',
                btnDashboard: 'Dashboard',
                contactReport: 'If you reached here from an external link with a correct path, please report by email.',
                contentZhOnly: '⚠️ Assessment questions are currently in Traditional Chinese only — UI and personality reports are in English.'
            },
            typeDetail: {
                stackEgo: 'Dominant (Ego)',
                stackParent: 'Auxiliary (Parent)',
                stackChild: 'Tertiary (Child)',
                stackInferior: 'Inferior',
                tabCore: '◈ Core Traits',
                tabCareer: '💼 Career',
                tabRelationship: '❤️ Relationships',
                tabShadow: '🌑 Shadow',
                tabEvolution: '🌱 Evolution',
                coreHeader: '◈ Core Traits Overview',
                btnBack: '🔙 Back to 16 Types',
                notFound: 'Could not find data for this type. Please go back.'
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
        if (nav.startsWith('en')) return 'en';
        return 'zh-Hant';
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
        // 回退：英文 dict 缺 key 時試中文 dict（內容層尚未翻 = 用中文）
        if (current !== 'zh-Hant') {
            const zh = deepGet(LOCALES['zh-Hant'], key);
            if (typeof zh === 'string') return format(zh, vars);
        }
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

    // 內容層尚未翻時，切到 en 顯示「題目與報告暫只支援繁中」橫幅
    function applyContentNotice() {
        const NOTICE_ID = 'i18n-content-notice';
        const existing = document.getElementById(NOTICE_ID);
        if (current === 'en') {
            if (existing) return;
            const isAssessmentOrResult = !!document.getElementById('quiz-flow') || !!document.getElementById('result-area');
            if (!isAssessmentOrResult) return; // 只在牽涉題目 / 報告的頁面提示
            const bar = document.createElement('div');
            bar.id = NOTICE_ID;
            bar.className = 'i18n-content-notice';
            bar.setAttribute('role', 'status');
            bar.textContent = window.t('ui.contentZhOnly');
            document.body.insertBefore(bar, document.body.firstChild);
        } else if (existing) {
            existing.remove();
        }
    }

    window.setLocale = function (loc) {
        if (!LOCALES[loc]) return false;
        current = loc;
        try { localStorage.setItem(KEY, loc); } catch (_) {}
        document.documentElement.setAttribute('lang', loc);
        applyDom();
        applyContentNotice();
        // 廣播 localechange 給需要 re-render 內容層 (engine reports / personality data) 的頁面
        try { document.dispatchEvent(new CustomEvent('localechange', { detail: { locale: loc } })); } catch (_) {}
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

    function init() {
        document.documentElement.setAttribute('lang', current);
        applyDom();
        injectLangToggle();
        applyContentNotice();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
