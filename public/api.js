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
        const token = localStorage.getItem('mbti_jwt_token');
        
        let guestId = localStorage.getItem('mbti_guest_id');
        if (!guestId) {
            guestId = "guest_" + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('mbti_guest_id', guestId);
        }

        const headers = { 
            "Content-Type": "application/json", 
            "X-HMAC-Signature": "Chiyigo_V1_8f9a2c3b4e5d6f7a8b9c0d1e2f" 
        };
        
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const apiUrl = `/api/v1/assess/version-${currentVersion.toLowerCase()}`;

        const orderedScores = [
            appScores.Ni, appScores.Ne, appScores.Si, appScores.Se,
            appScores.Ti, appScores.Te, appScores.Fi, appScores.Fe
        ];

        const timeSpentMs = Date.now() - quizStartTime;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ 
                version: currentVersion,
                rawScores: orderedScores, 
                timeSpentMs: timeSpentMs, 
                guestId: guestId 
            })
        });

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
        alert("演算法引擎連接失敗。請確認 Cloudflare Worker 已發布最新代碼。");
        document.getElementById('loading-screen').classList.add('hidden'); 
        document.getElementById('quiz-flow').classList.remove('hidden');
    }
}