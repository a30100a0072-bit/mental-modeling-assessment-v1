// public/quiz-ux.js
// =====================================================
// 測驗流程 UX 強化：題級進度 / 鍵盤操作 / 自動存檔指示 / 過場動畫
// 不動主流程：透過事件代理 + 公開全域狀態旁路注入。
// 載入順序：必須在 script.js 之後 (依賴 appState / saveState / currentVersion)。
// =====================================================
(function () {
    'use strict';

    const QUIZ_FLOW = 'quiz-flow';
    const QUIZ_CONTAINER = 'quiz-container';
    const QUESTIONS_AREA = 'questions-area';
    const NEXT_BTN = 'next-btn';

    let focusedQuestion = null;
    let lastAnsweredAt = 0;
    const uxStartTime = Date.now();

    // -------- 題級進度條（掛在 progress-text 後面） --------
    function ensureSubProgress() {
        let el = document.getElementById('progress-sub');
        if (el) return el;
        const txt = document.getElementById('progress-text');
        if (!txt) return null;
        el = document.createElement('div');
        el.id = 'progress-sub';
        el.className = 'progress-sub';
        el.innerHTML = '<span class="progress-sub-text"></span><span class="progress-sub-eta"></span>';
        txt.insertAdjacentElement('afterend', el);
        return el;
    }

    function refreshSubProgress() {
        const sub = ensureSubProgress();
        if (!sub) return;
        const qs = document.querySelectorAll(`#${QUESTIONS_AREA} .question`);
        const total = qs.length;
        if (total === 0) { sub.style.display = 'none'; return; }
        sub.style.display = '';

        let answered = 0;
        qs.forEach(q => { if (q.querySelector('input:checked') || q.querySelector('.ranking-item[data-ranked="1"]')) answered++; });

        const pct = total ? Math.round((answered / total) * 100) : 0;
        sub.querySelector('.progress-sub-text').textContent =
            `本段已完成 ${answered} / ${total}（${pct}%）`;

        // ETA: 用已花時間外推（每題 ~ elapsed/answered 秒）
        const eta = sub.querySelector('.progress-sub-eta');
        if (answered >= 2 && answered < total) {
            const elapsed = (Date.now() - uxStartTime) / 1000;
            const perQ = elapsed / answered;
            const remain = Math.round(perQ * (total - answered));
            eta.textContent = remain > 60
                ? `· 預估還需 ${Math.round(remain / 60)} 分鐘`
                : `· 預估還需 ${remain} 秒`;
        } else {
            eta.textContent = '';
        }
    }

    // -------- 自動存檔指示 --------
    function ensureSaveIndicator() {
        let el = document.getElementById('autosave-indicator');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'autosave-indicator';
        el.className = 'autosave-indicator';
        el.setAttribute('aria-live', 'polite');
        el.innerHTML = '<span class="autosave-dot"></span><span class="autosave-text">已自動儲存</span>';
        document.body.appendChild(el);
        return el;
    }
    function flashSaveIndicator() {
        const el = ensureSaveIndicator();
        el.classList.remove('is-show');
        // restart animation
        // eslint-disable-next-line no-unused-expressions
        el.offsetWidth;
        el.classList.add('is-show');
    }

    // -------- 旁路存檔：每答一題直接 patch localStorage（appState 是 let，無法從 window 抓）--------
    const STATE_KEY = 'mbti_v1_final';
    function persistAnswerFromInput(input) {
        if (!input || !input.name) return;
        try {
            const raw = localStorage.getItem(STATE_KEY);
            const obj = raw ? JSON.parse(raw) : { phase: 1, answers: {}, dynamicRoute: null };
            if (!obj.answers) obj.answers = {};
            obj.answers[input.name] = input.value;
            localStorage.setItem(STATE_KEY, JSON.stringify(obj));
        } catch (_) { /* quota / parse 失敗就跳過，下一輪 next-btn 仍會存 */ }
        lastAnsweredAt = Date.now();
        flashSaveIndicator();
        refreshSubProgress();
    }

    // -------- 鍵盤操作 --------
    function setFocusedQuestion(q) {
        if (!q) return;
        document.querySelectorAll('.question.is-kbd-focus').forEach(n => n.classList.remove('is-kbd-focus'));
        q.classList.add('is-kbd-focus');
        focusedQuestion = q;
    }
    function getQuestions() {
        return Array.from(document.querySelectorAll(`#${QUESTIONS_AREA} .question`));
    }
    function firstUnanswered() {
        return getQuestions().find(q => !q.querySelector('input:checked')) || getQuestions()[0] || null;
    }
    function moveFocus(delta) {
        const all = getQuestions();
        if (!all.length) return;
        const idx = focusedQuestion ? all.indexOf(focusedQuestion) : -1;
        const next = all[Math.min(all.length - 1, Math.max(0, idx + delta))] || all[0];
        setFocusedQuestion(next);
        next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function pickOption(n) {
        const q = focusedQuestion || firstUnanswered();
        if (!q) return;
        const inputs = q.querySelectorAll('input[type="radio"]');
        if (!inputs.length) return; // ranking 不走此路徑
        if (n < 1 || n > inputs.length) return;
        const target = inputs[n - 1];
        if (!target) return;
        target.checked = true;
        target.dispatchEvent(new Event('change', { bubbles: true }));
        // 自動跳到下一題
        const next = getQuestions().find(x => x !== q && !x.querySelector('input:checked'));
        if (next) {
            setFocusedQuestion(next);
            next.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    function onKeyDown(e) {
        // 排除輸入框 / textarea / 組合鍵
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' && e.target.type !== 'radio') return;
        if (tag === 'TEXTAREA') return;
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        // 結果頁 / loading 不啟用
        if (document.getElementById('result-area') && !document.getElementById('result-area').classList.contains('hidden')) return;
        if (!document.getElementById(QUIZ_CONTAINER) || document.getElementById(QUIZ_FLOW).classList.contains('hidden')) return;

        if (e.key === 'Enter') {
            const btn = document.getElementById(NEXT_BTN);
            if (btn) { e.preventDefault(); btn.click(); }
            return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); moveFocus(+1); return; }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')   { e.preventDefault(); moveFocus(-1); return; }
        if (/^[1-9]$/.test(e.key)) { e.preventDefault(); pickOption(parseInt(e.key, 10)); }
    }

    // -------- 長量表休息點：每 10 題插入軟提示，幫使用者眼睛喘氣 --------
    const REST_TIPS = [
        '☕ 已完成 10 題，深呼吸 3 秒再繼續。憑直覺答最準。',
        '🧘 已完成 20 題，提醒自己：沒有對錯，只有最像你的選項。',
        '🌿 已完成 30 題，剩下不多了，繼續保持節奏。',
        '🎯 已完成 40 題，一鼓作氣到底。'
    ];
    function injectRestHints() {
        const qs = getQuestions();
        if (qs.length < 11) return; // 少於 11 題就不需要
        // 先清掉舊的 hint（換 phase 時會重渲染）
        document.querySelectorAll('.rest-hint').forEach(n => n.remove());
        for (let i = 10; i < qs.length; i += 10) {
            const tipIdx = (i / 10) - 1;
            const msg = REST_TIPS[tipIdx] || `已完成 ${i} 題，繼續加油 ✨`;
            const hint = document.createElement('div');
            hint.className = 'rest-hint';
            hint.setAttribute('aria-hidden', 'true');
            hint.innerHTML = `<span class="rest-hint-icon">${msg.slice(0, 2)}</span><span class="rest-hint-text">${msg.slice(2).trim()}</span>`;
            qs[i].parentNode.insertBefore(hint, qs[i]);
        }
    }

    // -------- 過場淡入：phase 切換時短暫 fade --------
    function watchPhaseTransition() {
        const c = document.getElementById(QUIZ_CONTAINER);
        if (!c) return;
        const obs = new MutationObserver((muts) => {
            for (const m of muts) {
                if (m.target && (m.target.id === QUESTIONS_AREA || m.target.parentElement?.id === QUESTIONS_AREA)) {
                    c.classList.remove('phase-fade-in');
                    // eslint-disable-next-line no-unused-expressions
                    c.offsetWidth;
                    c.classList.add('phase-fade-in');
                    // 重置鍵盤焦點與題級進度，並插入休息提示
                    focusedQuestion = null;
                    setTimeout(() => {
                        injectRestHints();
                        const fu = firstUnanswered();
                        if (fu) setFocusedQuestion(fu);
                        refreshSubProgress();
                    }, 0);
                    return;
                }
            }
        });
        obs.observe(c, { childList: true, subtree: true });
    }

    // -------- 綁事件 --------
    function init() {
        const flow = document.getElementById(QUIZ_FLOW);
        if (!flow) return;

        // 點到題目就設成焦點（提供視覺回饋）
        flow.addEventListener('click', (e) => {
            const q = e.target.closest('.question');
            if (q) setFocusedQuestion(q);
        });

        // 答題時：旁路存檔 + 更新題級進度
        flow.addEventListener('change', (e) => {
            const t = e.target;
            if (t && t.tagName === 'INPUT' && t.type === 'radio') persistAnswerFromInput(t);
        });

        document.addEventListener('keydown', onKeyDown);
        watchPhaseTransition();

        // 首次進場：建子進度條 + 找第一題未答 + 插入休息提示
        ensureSubProgress();
        ensureSaveIndicator();
        setTimeout(() => {
            injectRestHints();
            refreshSubProgress();
            const fu = firstUnanswered();
            if (fu) setFocusedQuestion(fu);
        }, 50);
    }

    // -------- 離開警告：已答題但還沒看到結果頁時，重整 / 關分頁前確認 --------
    function hasUnsubmittedAnswers() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (!raw) return false;
            const obj = JSON.parse(raw);
            const cnt = obj && obj.answers ? Object.keys(obj.answers).length : 0;
            if (cnt === 0) return false;
            const resultArea = document.getElementById('result-area');
            // 結果頁顯示中（已提交完成）就不再警告
            if (resultArea && !resultArea.classList.contains('hidden')) return false;
            const flow = document.getElementById(QUIZ_FLOW);
            if (!flow || flow.classList.contains('hidden')) return false;
            return true;
        } catch (_) { return false; }
    }
    function onBeforeUnload(e) {
        if (!hasUnsubmittedAnswers()) return;
        // 現代瀏覽器忽略自訂訊息，但 returnValue 設值才會觸發確認對話框
        e.preventDefault();
        e.returnValue = '測驗尚未提交，離開將會中斷進度，確定要離開嗎？';
        return e.returnValue;
    }
    window.addEventListener('beforeunload', onBeforeUnload);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
