// ==========================================
// [模組 2] API 通訊與本地端狀態管理
// ==========================================

function initStorage() { 
    try { 
        const s = localStorage.getItem('mbti_v1_final'); 
        if(s) { 
            const p = JSON.parse(s); 
            if(p && p.answers) appState = p; 
        } 
    } catch(e) {} 
}

function saveState() { 
    try { 
        localStorage.setItem('mbti_v1_final', JSON.stringify(appState)); 
    } catch(e) {} 
}

async function proceedToResultAPI() {
    document.getElementById('quiz-flow').classList.add('hidden'); 
    document.getElementById('loading-screen').classList.remove('hidden');
    window.scrollTo(0,0);

    // 如果不是 God Mode，執行正常的算分邏輯 (在 script.js 中)
    if (!window.isGodMode) {
        calculateFinalRawScores();
    }

    try {
        const token = sessionStorage.getItem('chiyigo_access_token');

        let guestId = localStorage.getItem('mbti_guest_id');
        if (!guestId) {
            guestId = "guest_" + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('mbti_guest_id', guestId);
        }

        const apiUrl = `/api/v1/assess/version-${currentVersion.toLowerCase()}`;

        const orderedScores = [
            appScores.Ni, appScores.Ne, appScores.Si, appScores.Se,
            appScores.Ti, appScores.Te, appScores.Fi, appScores.Fe
        ];

        const timeSpentMs = Date.now() - quizStartTime;

        // Route A: 計算實際答了多少題（appState.answers 內 q_*_* 開頭的 key 數，
        // 排除 phase5 ranking 等非題型 key），讓 worker 寫 D1 時能存進 questions_answered 欄位。
        // 訪客 / Route A 提早結束 / Route A 走完都用同個算法，後端純被動接收。
        const questionsAnswered = (function () {
            try {
                const ans = (typeof appState === 'object' && appState && appState.answers) ? appState.answers : {};
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
                version: currentVersion,
                rawScores: orderedScores,
                timeSpentMs: timeSpentMs,
                guestId: guestId,
                questionsAnswered: questionsAnswered
            })
        };
        // [埋碼] quiz_complete payload 帶 questions_answered 進 GA，讓「提早 vs 完整」可分群
        window.__lastQuestionsAnswered = questionsAnswered;
        const response = token
            ? await chiyigoFetch(apiUrl, init)
            : await fetch(apiUrl, init);

        if (!response.ok) throw new Error("HTTP Status: " + response.status);

        const result = await response.json();
        
        if (result.status === "Calculated" && result.data && result.data.probabilities) {
            if (!token && result.reportId) {
                localStorage.setItem('mbti_guest_report_id', result.reportId);
            }

            // [修復核心 1]：紀錄後端強制傳來的最終判斷，不再給前端猜測空間
            window.backendPrimaryType = result.data.primaryType;

            backendProbs = result.data.probabilities;
            
            // [修復核心 2]：後端陣列本地重排時，補上平手防呆排序 (localeCompare)
            backendSorted = Object.keys(backendProbs).sort((a, b) => {
                if (backendProbs[b] !== backendProbs[a]) return backendProbs[b] - backendProbs[a];
                return a.localeCompare(b);
            });

            document.getElementById('loading-screen').classList.add('hidden'); 
            document.getElementById('result-area').classList.remove('hidden'); 
            renderResult(false);

            localStorage.removeItem('mbti_v1_final');
            window.history.replaceState(null, "", window.location.pathname + "?v=" + currentVersion);

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