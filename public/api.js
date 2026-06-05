// ==========================================
// [模組 2] API 通訊與本地端狀態管理
// 跨檔 state 統一走 window.MM（見 state.js）；本檔對 MM.state.answers / MM.scores / MM.version
// 等的存取都假設 state.js 在更早載入。
// ==========================================

function initStorage() {
    try {
        const s = localStorage.getItem('mbti_v1_final');
        if(s) {
            const p = JSON.parse(s);
            // mutate 而非 reassign：保留 window.MM.state 的 reference 讓其他檔同步看到
            if(p && p.answers) {
                Object.keys(window.MM.state).forEach(k => { delete window.MM.state[k]; });
                Object.assign(window.MM.state, p);
            }
        }
    } catch(e) {}
}

function saveState() {
    try {
        localStorage.setItem('mbti_v1_final', JSON.stringify(window.MM.state));
    } catch(e) {}
}

async function proceedToResultAPI() {
    document.getElementById('quiz-flow').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');
    window.scrollTo(0,0);

    try {
        // calculateFinalRawScores 放進 try：它可能 throw（restored localStorage 越界索引等），
        // 必須被下方 catch 接住復原 UI，否則 loading 畫面永久卡死。
        if (!window.MM.flags.godMode) {
            calculateFinalRawScores();
        }

        const token = sessionStorage.getItem('chiyigo_access_token');

        let guestId = localStorage.getItem('mbti_guest_id');
        if (!guestId) {
            // CSPRNG 122 bits entropy + UUID v4 標準格式。
            // 既有 localStorage 'guest_xxx' 值繼續沿用（worker 端 length<=64 兩種格式都通過）。
            guestId = crypto.randomUUID();
            localStorage.setItem('mbti_guest_id', guestId);
        }

        const apiUrl = `/api/v1/assess/version-${window.MM.version.toLowerCase()}`;

        const orderedScores = [
            window.MM.scores.Ni, window.MM.scores.Ne, window.MM.scores.Si, window.MM.scores.Se,
            window.MM.scores.Ti, window.MM.scores.Te, window.MM.scores.Fi, window.MM.scores.Fe
        ];

        // clamp 到 worker 接受範圍 [1, 24h]：tab 開超過 24h 才提交，未 clamp 會被 worker 400 拒、
        // api.js 視為硬失敗顯示 engineFail。timeSpentMs server 端 received-but-unused，clamp 無副作用。
        const timeSpentMs = Math.min(Math.max(Date.now() - window.MM.startTime, 1), 24 * 60 * 60 * 1000);

        // Route A: 計算實際答了多少題（MM.state.answers 內 q_*_* 開頭的 key 數，
        // 排除 phase5 ranking 等非題型 key），讓 worker 寫 D1 時能存進 questions_answered 欄位。
        // 訪客 / Route A 提早結束 / Route A 走完都用同個算法，後端純被動接收。
        const questionsAnswered = (function () {
            try {
                const ans = (window.MM.state && window.MM.state.answers) ? window.MM.state.answers : {};
                let n = 0;
                for (const k in ans) {
                    if (!Object.prototype.hasOwnProperty.call(ans, k)) continue;
                    if (ans[k] === null || ans[k] === undefined || ans[k] === '') continue;
                    if (k === 'phase5') { n += 1; continue; } // 第 5 phase 探針題（A/B/C 卷）算 1 題
                    if (/^q_/.test(k)) n += 1;
                }
                return n;
            } catch (_) { return null; }
        })();

        // 登入用戶走 chiyigoFetch（自動 Bearer + 401 refresh）；訪客走純 fetch（不帶 token）
        const init = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                version: window.MM.version,
                rawScores: orderedScores,
                timeSpentMs: timeSpentMs,
                guestId: guestId,
                questionsAnswered: questionsAnswered
            })
        };
        // [埋碼] quiz_complete payload 帶 questions_answered 進 GA，讓「提早 vs 完整」可分群
        window.MM.lastQuestionsAnswered = questionsAnswered;
        const response = token
            ? await chiyigoFetch(apiUrl, init)
            : await fetch(apiUrl, init);

        if (!response.ok) throw new Error("HTTP Status: " + response.status);

        const result = await response.json();

        if (result.status === "Calculated" && result.data && result.data.probabilities) {
            // [修復核心 1]：紀錄後端強制傳來的最終判斷，不再給前端猜測空間
            window.MM.backend.primaryType = result.data.primaryType;

            // mutate 既有物件保留 reference：reassign 會切斷其他檔 (result-render) 拿到的舊指標
            Object.keys(window.MM.backend.probs).forEach(k => { delete window.MM.backend.probs[k]; });
            Object.assign(window.MM.backend.probs, result.data.probabilities);

            // [修復核心 2]：後端陣列本地重排時，補上平手防呆排序 (localeCompare)
            window.MM.backend.sorted.length = 0;
            Object.keys(window.MM.backend.probs).sort((a, b) => {
                if (window.MM.backend.probs[b] !== window.MM.backend.probs[a]) return window.MM.backend.probs[b] - window.MM.backend.probs[a];
                return a.localeCompare(b);
            }).forEach(t => window.MM.backend.sorted.push(t));

            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('result-area').classList.remove('hidden');
            renderResult(false);

            localStorage.removeItem('mbti_v1_final');
            window.history.replaceState(null, "", window.location.pathname + "?v=" + window.MM.version);

        } else {
            throw new Error("API 回傳結構異常");
        }
    } catch (error) {
        console.error(error);
        (window.toast || alert)((typeof window.t === 'function' ? window.t('error.engineFail') : "演算法引擎連接失敗。請確認 Cloudflare Worker 已發布最新代碼。"), { type: 'error', duration: 5000 });
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('quiz-flow').classList.remove('hidden');
    }
}