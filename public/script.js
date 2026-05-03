// public/script.js
// ==========================================
// [模組 3] 畫面渲染與全域狀態控制器 (支援雙軌狀態機)
// ==========================================

Chart.register(ChartDataLabels);

// 全域狀態變數
const urlParams = new URLSearchParams(window.location.search);
// [雙軌制] 允許 D, E, F 卷進入全新狀態機
let currentVersion = (urlParams.get('v') || 'B').toUpperCase();
if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(currentVersion)) {
    currentVersion = 'B'; // 防呆預設
}

// 靜態題庫載入 (A, B, C)
const m1Data = (currentVersion === 'A' && typeof m1Data_A !== 'undefined') ? m1Data_A : ((currentVersion === 'C' && typeof m1Data_C !== 'undefined') ? m1Data_C : (typeof m1Data_B !== 'undefined' ? m1Data_B : []));
const m2Data = (currentVersion === 'A' && typeof m2Data_A !== 'undefined') ? m2Data_A : ((currentVersion === 'C' && typeof m2Data_C !== 'undefined') ? m2Data_C : (typeof m2Data_B !== 'undefined' ? m2Data_B : []));
const m3Data = (currentVersion === 'A' && typeof m3Data_A !== 'undefined') ? m3Data_A : ((currentVersion === 'C' && typeof m3Data_C !== 'undefined') ? m3Data_C : (typeof m3Data_B !== 'undefined' ? m3Data_B : []));
const m4Data = (currentVersion === 'A' && typeof m4Data_A !== 'undefined') ? m4Data_A : ((currentVersion === 'C' && typeof m4Data_C !== 'undefined') ? m4Data_C : (typeof m4Data_B !== 'undefined' ? m4Data_B : []));

// 動態題庫指標 (D, E, F)
let activeLikert = [];
let activeForced = [];
let activeSJT = [];
let activeRanking = [];

if (currentVersion === 'D') {
    activeLikert = typeof mData_Likert_D !== 'undefined' ? mData_Likert_D : [];
    activeForced = typeof mData_Forced_D !== 'undefined' ? mData_Forced_D : [];
    activeSJT = typeof mData_SJT_D !== 'undefined' ? mData_SJT_D : [];
    activeRanking = typeof mData_Ranking_D !== 'undefined' ? mData_Ranking_D : [];
} else if (currentVersion === 'E') {
    activeLikert = typeof mData_Likert_E !== 'undefined' ? mData_Likert_E : [];
    activeForced = typeof mData_Forced_E !== 'undefined' ? mData_Forced_E : [];
    activeSJT = typeof mData_SJT_E !== 'undefined' ? mData_SJT_E : [];
    activeRanking = typeof mData_Ranking_E !== 'undefined' ? mData_Ranking_E : [];
} else if (currentVersion === 'F') {
    activeLikert = typeof mData_Likert_F !== 'undefined' ? mData_Likert_F : [];
    activeForced = typeof mData_Forced_F !== 'undefined' ? mData_Forced_F : [];
    activeSJT = typeof mData_SJT_F !== 'undefined' ? mData_SJT_F : [];
    activeRanking = typeof mData_Ranking_F !== 'undefined' ? mData_Ranking_F : [];
}

// 改 var 讓 window.appScores / window.appState / window.quizStartTime 可被 IIFE 模組
// （quiz-ux.js / share-card.js / landing-progress.js）直接讀，不必繞道 localStorage / DOM。
// api.js 仍直接賦值（共享 global scope），不需修改。
var appScores = { Ti:0, Te:0, Fi:0, Fe:0, Ni:0, Ne:0, Si:0, Se:0 };
var appState = { phase: 1, answers: {}, dynamicRoute: null };
var isSharedView = false;
var quizStartTime = Date.now();
window.radarChartObj = null;
window.pieChartObj = null;
var backendProbs = {};
var backendSorted = [];

window.isGodMode = false;
window.backendPrimaryType = null; 

function updateProgress(p, max = 5) {
    document.getElementById('progress-fill').style.width = `${(p/max)*100}%`;
    const txt = (typeof window.t === 'function')
        ? window.t('quiz.progressOf', { p: p, max: max })
        : `當前進度: 模組 ${p} / ${max}`;
    document.getElementById('progress-text').innerText = txt;
}

window.injectGodMode = function(mode) {
    window.isGodMode = true; 
    if (mode === 'INTJ') appScores = { Ti: 15, Te: 35, Fi: 20, Fe: -10, Ni: 45, Ne: 10, Si: -15, Se: -25 };
    else if (mode === 'ESFP') appScores = { Ti: -15, Te: 10, Fi: 35, Fe: 20, Ni: -25, Ne: -10, Si: 15, Se: 45 };
    else if (mode === 'ZERO') appScores = { Ti: 0, Te: 0, Fi: 0, Fe: 0, Ni: 0, Ne: 0, Si: 0, Se: 0 };
    else if (mode === 'RANDOM') ENGINE.dimKeys.forEach(k => appScores[k] = Math.floor(Math.random() * 61) - 30); 
    proceedToResultAPI(); 
};

function initApp() {
    const token = sessionStorage.getItem('chiyigo_access_token');

    // 權限管控 (Login-wall) - A、B 開放訪客；C、D、E、F 為進階模組需登入
    if (!token && ['C', 'D', 'E', 'F'].includes(currentVersion)) {
        const wallModal = document.getElementById('login-wall-modal');
        if (wallModal) {
            wallModal.classList.remove('hidden');
            return; 
        }
    }

    if (urlParams.get('dev') === 'god') {
        const devConsole = document.getElementById('dev-console');
        if (devConsole) { devConsole.classList.remove('hidden'); devConsole.removeAttribute('hidden'); }
    }

    if (urlParams.get('new') === '1') {
        localStorage.removeItem('mbti_v1_final');
        localStorage.removeItem('mbti_guest_report_id');
        window.history.replaceState({}, document.title, window.location.pathname + "?v=" + currentVersion + (urlParams.get('dev') ? '&dev=god' : ''));
        quizStartTime = Date.now();
    }

    initStorage(); 
    const urlS = urlParams.get('s');
    
    if (urlS) {
        isSharedView = true; 
        const decoded = decodeScores(urlS); 
        if(Object.keys(decoded).length === 8) {
            ENGINE.dimKeys.forEach(k => appScores[k] = decoded[k]);
            document.getElementById('quiz-flow').classList.add('hidden'); 
            document.getElementById('result-area').classList.remove('hidden');
            
            const sortedF = [...ENGINE.dimKeys].sort((a,b) => appScores[b] - appScores[a]);
            window.TrifurcationWarning = (appScores[sortedF[0]] - appScores[sortedF[2]] < 5);
            
            const localResult = calculateLocalProbabilities(appScores); 
            backendProbs = localResult.probs;
            backendSorted = localResult.sorted;

            renderResult(true); 
            return;
        }
    }
    
    let p = appState.phase || 1; 
    
    // 狀態機分流
    if (['D', 'E', 'F'].includes(currentVersion)) {
        // D, E, F 卷只有 3 個視覺 Phase
        if(p > 3) p = 3;
        updateProgress(p, 3);
        
        if (activeLikert.length === 0) {
            (window.toast || alert)((window.t ? window.t('error.cacheCorrupt') : "偵測到手機瀏覽器快取異常，請清除快取重新載入。"), { type: 'warn', duration: 5000 });
            return;
        }
        renderPhaseDEF(p);
    } else {
        // A, B, C 卷舊軌道
        if(p > 5) p = 5; 
        updateProgress(p, 5);
        if (m1Data.length === 0) {
            (window.toast || alert)((window.t ? window.t('error.cacheCorrupt') : "偵測到手機瀏覽器快取異常，請清除快取重新載入。"), { type: 'warn', duration: 5000 });
            return;
        }
        renderPhase(p);
    }
    
    // [埋碼] 測驗開始
    if (typeof gtag !== 'undefined' && !urlS && p === 1) {
        gtag('event', 'quiz_start', { 'version': currentVersion });
        if(typeof fbq !== 'undefined') fbq('trackCustom', 'QuizStart', { version: currentVersion });
    }
}

// ==========================================
// [舊軌道] A/B/C 卷靜態渲染邏輯
// ==========================================
function renderPhase(p) {
    const header = document.getElementById('phase-header');
    const desc = document.getElementById('phase-desc');
    const qArea = document.getElementById('questions-area');
    const btn = document.getElementById('next-btn');

    if (p <= 4) {
        const verKey = (currentVersion === 'A' || currentVersion === 'C') ? currentVersion : 'B';
        const _hk = (i) => window.t ? window.t('quiz.phaseHeaders.' + verKey + '.' + i) : '';
        const _dk = (i) => window.t ? window.t('quiz.phaseDescs.' + verKey + '.' + i) : '';
        const headers = [_hk(0), _hk(1), _hk(2), _hk(3)];
        const descs = [_dk(0), _dk(1), _dk(2), _dk(3)];

        const lists = [m1Data, m2Data, m3Data, m4Data]; 
        const starts = [1, 17, 33, 49];

        header.innerText = headers[p-1]; desc.innerText = descs[p-1];
        qArea.innerHTML = lists[p-1].map((item, i) => {
            const qK = `q_${p}_${i}`; const s = appState.answers[qK];
            return `<div class="question"><p><strong>${starts[p-1]+i}. ${item.q}</strong></p><div class="options"><label><input type="radio" name="${qK}" value="a" ${s==='a'?'checked':''}> ${item.a}</label><label><input type="radio" name="${qK}" value="b" ${s==='b'?'checked':''}> ${item.b}</label></div></div>`;
        }).join('');
        
        btn.innerText = p < 4
            ? (window.t ? window.t('quiz.btnConfirmStep', { p: p }) : `確認選項 (${p}/5)`)
            : (window.t ? window.t('quiz.btnScanCore') : "掃描核心維度 (4/5)");

        // 進入 phase 2/3/4 時注入「進度已存檔」提示，給使用者放心離開的安全感。
        // 不主動偷看結論（feedback_assessment_integrity）。
        if (p >= 2 && p <= 4) {
            try { maybeShowResumeBanner(p); } catch (_) { /* banner 失敗不擋主流程 */ }
        }

        btn.onclick = () => {
            const qs = qArea.querySelectorAll('.question');
            for (let q of qs) { if(!q.querySelector('input:checked')) { (window.toast || alert)((window.t ? window.t('quiz.pleaseFinish') : "請完成所有題目以利精準建模。"), { type: 'warn' }); q.scrollIntoView({ behavior:'smooth', block:'center' }); return; } }
            for(let i=0; i<lists[p-1].length; i++) { 
                const sel = document.querySelector(`input[name="q_${p}_${i}"]:checked`);
                if(sel) appState.answers[`q_${p}_${i}`] = sel.value; 
            }
            appState.phase = p+1; saveState(); updateProgress(p+1, 5); window.scrollTo(0,0); renderPhase(p+1);
        };
    } else {
        preCalculatePhase1To4();
        const sortedF = [...ENGINE.dimKeys].sort((a,b) => appScores[b] - appScores[a]);
        window.TrifurcationWarning = (appScores[sortedF[0]] - appScores[sortedF[2]] < 5);

        // 後端動態挑題：4 軸最模糊 → 抽 3 題決勝題；都篤定 → 1 題 fallback。
        // 對使用者完全透明 — 不揭露「我們偵測到你 T/F 軸接近 50/50」這類分析資訊
        // (feedback_assessment_integrity)，UI 統一顯示「最終校準」中性框架。
        let probe = null;
        let axisMode = null;
        try {
            const localProbs = calculateLocalProbabilities(appScores).probs;
            const axisProbs = window.calculateAxisProbabilities(localProbs);
            const ambig = window.findMostAmbiguousAxis(axisProbs, 8);
            if (ambig && typeof getAxisDeciders === 'function') {
                probe = getAxisDeciders(ambig.axis, 3);
                axisMode = ambig.axis;
                // 後台 GA 仍紀錄（純 telemetry，使用者看不到）
                if (window.track) {
                    window.track('axis_decider_offered', {
                        version: currentVersion,
                        axis: ambig.axis,
                        ambiguity_distance: Math.round(ambig.distance * 10) / 10,
                        n_questions: probe ? probe.length : 0
                    });
                }
            }
        } catch (_) { /* fallback 走舊路徑 */ }
        if (!probe || probe.length === 0) {
            probe = getDynamicProbe(sortedF[0], sortedF[1]);
            axisMode = null;
        }

        // 統一中性文案 — 不分軸線 / 不揭露分析；只告訴使用者「還剩 N 題、性質是校準」
        header.innerText = window.t ? window.t('quiz.finalCalibrationHeader') : "PHASE 05: 最終校準";
        const restCount = probe.length;
        if (restCount > 1) {
            desc.innerText = window.t ? window.t('quiz.finalCalibrationDescMulti', { n: restCount }) : `最後 ${restCount} 題，請憑直覺作答以完成測驗。`;
        } else {
            desc.innerText = window.t ? window.t('quiz.finalCalibrationDescOne') : "最後 1 題，請憑直覺作答以完成測驗。";
        }
        qArea.innerHTML = probe.map((it, i) => `<div class="question"><p><strong>${65 + i}. ${it.q}</strong></p><div class="options"><label><input type="radio" name="q5_${i}" value="a"> ${it.a}</label><label><input type="radio" name="q5_${i}" value="b"> ${it.b}</label></div></div>`).join('');
        window.mbtiActiveProbe = probe;
        btn.innerText = window.t ? window.t('quiz.btnSubmitFinal') : "提交並連接 Cloudflare V1 引擎";
        btn.onclick = () => {
            // 多題模式：每題都要選；單題模式：只 q5_0
            const answers = [];
            for (let i = 0; i < probe.length; i++) {
                const sel = document.querySelector('input[name="q5_' + i + '"]:checked');
                if (!sel) return (window.toast || alert)((window.t ? window.t('quiz.pleaseFinishCalibration') : "請完成所有最後的校準題目。"), { type: 'warn' });
                answers.push({ val: sel.value, dA: probe[i].dA, dB: probe[i].dB, w: probe[i].w || 3 });
            }
            // 多題：array；單題：保留舊格式（向下相容）
            appState.answers.phase5 = (probe.length > 1) ? answers : { val: answers[0].val, dA: answers[0].dA, dB: answers[0].dB };
            saveState(); proceedToResultAPI();
        };
    }
}

// ==========================================
// [新軌道] D, E, F 卷動態自適應渲染邏輯
// ==========================================
function renderPhaseDEF(p) {
    const header = document.getElementById('phase-header');
    const desc = document.getElementById('phase-desc');
    const qArea = document.getElementById('questions-area');
    const btn = document.getElementById('next-btn');
    
    // 動態標題前綴
    const _moduleFb = currentVersion === 'D' ? "日常行為" : (currentVersion === 'E' ? "決策情境" : "認知偏好");
    const moduleTitle = window.t ? window.t('quizDef.module.' + currentVersion, null, _moduleFb) : _moduleFb;

    if (p === 1) {
        header.innerText = window.t ? window.t('quizDef.step1Header', { module: moduleTitle }) : `Step 1：${moduleTitle}量表 (Likert)`;
        desc.innerText = window.t ? window.t('quizDef.step1Desc') : "請根據直覺，評估以下描述與你真實狀態的相符程度。(1: 極度不符 ~ 5: 極度符合)";
        
        qArea.innerHTML = activeLikert.map((item, i) => {
            const qK = `q_1_likert_${i}`; const s = appState.answers[qK];
            let optionsHtml = '';
            for(let v=1; v<=5; v++){
                optionsHtml += `<label class="likert-opt">
                    <input type="radio" name="${qK}" value="${v}" ${s==String(v)?'checked':''}>
                    <span class="likert-num">${v}</span>
                </label>`;
            }
            return `<div class="question"><p><strong>${i+1}. ${item.q}</strong></p><div class="options likert-row">${optionsHtml}</div></div>`;
        }).join('');
        
        btn.innerText = window.t ? window.t('quizDef.btnStep1') : "進入下一步 (1/3)";
        btn.onclick = () => {
            if(!validateAndSaveDEF('1_likert', activeLikert.length)) return;
            appState.phase = 2; saveState(); updateProgress(2, 3); window.scrollTo(0,0); renderPhaseDEF(2);
        };
    }
    else if (p === 2) {
        header.innerText = window.t ? window.t('quizDef.step2Header') : "Step 2：功能迫選 (Forced Choice)";
        desc.innerText = window.t ? window.t('quizDef.step2Desc') : "請在兩個互斥的極端情境中，選擇你大腦最本能的防禦或偏好傾向。";
        
        qArea.innerHTML = activeForced.map((item, i) => {
            const qK = `q_2_forced_${i}`; const s = appState.answers[qK];
            return `<div class="question"><p><strong>${i+1}. ${item.q}</strong></p><div class="options"><label><input type="radio" name="${qK}" value="a" ${s==='a'?'checked':''}> ${item.a}</label><label><input type="radio" name="${qK}" value="b" ${s==='b'?'checked':''}> ${item.b}</label></div></div>`;
        }).join('');
        
        btn.innerText = window.t ? window.t('quizDef.btnStep2') : "進行邊界解析 (2/3)";
        btn.onclick = () => {
            if(!validateAndSaveDEF('2_forced', activeForced.length)) return;
            
            // [動態分流] 呼叫 engine.js 判定下一步
            if (typeof window.determineDynamicRoute === 'function') {
                // engine.js 也要知道現在是 D, E, 或 F，透過 appState 傳遞版本
                appState.dynamicRoute = window.determineDynamicRoute(appState.answers, currentVersion);
            } else {
                appState.dynamicRoute = 'SJT'; // 預設降級
            }
            
            appState.phase = 3; saveState(); updateProgress(3, 3); window.scrollTo(0,0); renderPhaseDEF(3);
        };
    } 
    else if (p === 3) {
        // 若差距極大，提早收斂結束
        if (appState.dynamicRoute === 'FINISH') {
            proceedToResultAPI();
            return;
        }
        
        if (appState.dynamicRoute === 'SJT') {
            header.innerText = window.t ? window.t('quizDef.step3SjtHeader') : "Step 3：情境行為驗證 (SJT)";
            desc.innerText = window.t ? window.t('quizDef.step3SjtDesc') : "面對以下複雜情境，請選擇你最可能採取的行動。";
            qArea.innerHTML = activeSJT.map((item, i) => {
                const qK = `q_3_sjt_${i}`; const s = appState.answers[qK];
                let opts = item.options.map((opt, optIdx) => {
                    return `<label><input type="radio" name="${qK}" value="${optIdx}" ${s==String(optIdx)?'checked':''}> ${opt.text}</label>`;
                }).join('');
                return `<div class="question"><p><strong>${i+1}. ${item.q}</strong></p><div class="options">${opts}</div></div>`;
            }).join('');
            
            btn.innerText = window.t ? window.t('quizDef.btnStep3') : "提交並計算最終拓撲 (3/3)";
            btn.onclick = () => {
                if(!validateAndSaveDEF('3_sjt', activeSJT.length)) return;
                proceedToResultAPI();
            };
        }
        else if (appState.dynamicRoute === 'RANKING') {
            header.innerText = window.t ? window.t('quizDef.step3RankHeader') : "Step 3：認知結構排序";
            desc.innerText = window.t ? window.t('quizDef.step3RankDesc') : "請依序點擊選項賦予名次 (點擊順序即為 1, 2, 3, 4)。點錯可點擊右側「重設」按鈕。";
            
            window.rankingStates = window.rankingStates || {};
            
            qArea.innerHTML = activeRanking.map((item, i) => {
                const qK = `q_3_rank_${i}`;
                window.rankingStates[qK] = window.rankingStates[qK] || [];
                
                let itemsHtml = item.items.map((opt, optIdx) => {
                    let rankIdx = window.rankingStates[qK].indexOf(optIdx);
                    const isActive = rankIdx > -1;
                    const rankStr = isActive ? `<span class="rank-badge">[ ${rankIdx+1} ]</span>` : '';
                    const cls = `ranking-item${isActive ? ' is-ranked' : ''}`;
                    const dataRanked = isActive ? ' data-ranked="1"' : '';
                    return `<div class="${cls}"${dataRanked} onclick="handleRankingClick('${qK}', ${optIdx}, ${item.items.length})">
                        ${rankStr}<span class="rank-text">${opt.text}</span>
                    </div>`;
                }).join('');

                const _resetLabel = window.t ? window.t('quizDef.rankResetBtn') : '🔄 重設';
                return `<div class="question" id="container_${qK}"><div class="rank-q-head"><strong>${i+1}. ${item.q}</strong> <button class="btn-outline rank-reset-btn" type="button" onclick="resetRanking('${qK}')">${_resetLabel}</button></div><div class="options" id="opts_${qK}">${itemsHtml}</div></div>`;
            }).join('');

            btn.innerText = window.t ? window.t('quizDef.btnStep3') : "提交並計算最終拓撲 (3/3)";
            btn.onclick = () => {
                for(let i=0; i < activeRanking.length; i++){
                    let qK = `q_3_rank_${i}`;
                    if(window.rankingStates[qK].length !== activeRanking[i].items.length){
                        (window.toast || alert)((window.t ? window.t('quizDef.rankPleaseFinish', { n: i+1 }) : `請完成第 ${i+1} 題的所有選項排序。`), { type: 'warn' });
                        document.getElementById(`container_${qK}`).scrollIntoView({ behavior:'smooth', block:'center' });
                        return;
                    }
                    appState.answers[qK] = window.rankingStates[qK].join(','); 
                }
                proceedToResultAPI();
            }
        }
    }
}

// [輔助] D,E,F 卷單頁驗證
function validateAndSaveDEF(prefix, max) {
    for(let i=0; i<max; i++){
        let qK = `q_${prefix}_${i}`;
        let sel = document.querySelector(`input[name="${qK}"]:checked`);
        if(!sel){
            (window.toast || alert)((window.t ? window.t('quiz.pleaseFinish') : "請完成所有題目以利精準建模。"), { type: 'warn' });
            document.querySelector(`input[name="${qK}"]`).closest('.question').scrollIntoView({ behavior:'smooth', block:'center' });
            return false;
        }
        appState.answers[qK] = sel.value;
    }
    return true;
}

// [輔助] Ranking 點擊邏輯
window.handleRankingClick = function(qK, optIdx, maxLen) {
    if(window.rankingStates[qK].includes(optIdx)) return; 
    if(window.rankingStates[qK].length >= maxLen) return; 
    window.rankingStates[qK].push(optIdx);
    
    // 局部重繪該題選項
    const qIdx = parseInt(qK.split('_')[3]);
    const itemData = activeRanking[qIdx];
    const container = document.getElementById(`opts_${qK}`);
    if(!container) return;
    
    container.innerHTML = itemData.items.map((opt, i) => {
        let rankIdx = window.rankingStates[qK].indexOf(i);
        const isActive = rankIdx > -1;
        const rankStr = isActive ? `<span class="rank-badge">[ ${rankIdx+1} ]</span>` : '';
        const cls = `ranking-item${isActive ? ' is-ranked' : ''}`;
        const dataRanked = isActive ? ' data-ranked="1"' : '';
        return `<div class="${cls}"${dataRanked} onclick="handleRankingClick('${qK}', ${i}, ${itemData.items.length})">
            ${rankStr}<span class="rank-text">${opt.text}</span>
        </div>`;
    }).join('');
};
window.resetRanking = function(qK) {
    window.rankingStates[qK] = [];
    const qIdx = parseInt(qK.split('_')[3]);
    const itemData = activeRanking[qIdx];
    const container = document.getElementById(`opts_${qK}`);
    if (!container) return;
    container.innerHTML = itemData.items.map((opt, i) => {
        return `<div class="ranking-item" onclick="handleRankingClick('${qK}', ${i}, ${itemData.items.length})">
            <span class="rank-text">${opt.text}</span>
        </div>`;
    }).join('');
};

// ==========================================
// [結算樞紐] 新舊算分引擎轉接
// ==========================================
function calculateFinalRawScores() {
    // 若為 D, E, F 卷，呼叫 engine.js 內的動態算分函數，直接覆蓋 appScores
    if (['D', 'E', 'F'].includes(currentVersion)) {
        if (typeof window.calculateDynamicScores === 'function') {
            const finalScores = window.calculateDynamicScores(appState.answers, currentVersion);
            ENGINE.dimKeys.forEach(k => appScores[k] = finalScores[k] || 0);
        }
        return;
    }
    
    // 若為 A/B/C 卷，走舊版算分
    preCalculatePhase1To4();
    if (appState.answers.phase5) {
        const ph5 = appState.answers.phase5;
        // Route B: phase5 變成 array (多題決勝)；舊單題格式 {val, dA, dB} 仍向下相容
        if (Array.isArray(ph5)) {
            ph5.forEach(item => {
                if (!item || !item.val) return;
                const w = (typeof item.w === 'number') ? item.w : 1.5;
                if (item.val === 'a') item.dA.forEach(d => { appScores[d] += w; appScores[ENGINE.antagonist[d]] -= w * 0.5; });
                else if (item.val === 'b') item.dB.forEach(d => { appScores[d] += w; appScores[ENGINE.antagonist[d]] -= w * 0.5; });
            });
        } else if (ph5.val) {
            if (ph5.val === 'a') ph5.dA.forEach(d => { appScores[d] += 3; appScores[ENGINE.antagonist[d]] -= 1.5; });
            else ph5.dB.forEach(d => { appScores[d] += 3; appScores[ENGINE.antagonist[d]] -= 1.5; });
        }
    }
}

function getPhaseScores(phaseIdx) {
    const pScores = { Ti:0, Te:0, Fi:0, Fe:0, Ni:0, Ne:0, Si:0, Se:0 };
    const lists = [m1Data, m2Data, m3Data, m4Data];
    lists[phaseIdx].forEach((item, i) => { 
        const ans = appState.answers[`q_${phaseIdx+1}_${i}`]; 
        if(ans === 'a') item.dA.forEach(d => pScores[d]+=item.w); 
        else if(ans === 'b') item.dB.forEach(d => pScores[d]+=item.w); 
    });
    return pScores;
}

function preCalculatePhase1To4() {
    ENGINE.dimKeys.forEach(k => appScores[k] = 0);
    [m1Data, m2Data, m3Data, m4Data].forEach((list, pIdx) => {
        list.forEach((item, i) => {
            const ans = appState.answers[`q_${pIdx+1}_${i}`];
            if(ans === 'a') { item.dA.forEach(d => { appScores[d]+=item.w; appScores[ENGINE.antagonist[d]]-=item.w*0.5; }); }
            else if(ans === 'b') { item.dB.forEach(d => { appScores[d]+=item.w; appScores[ENGINE.antagonist[d]]-=item.w*0.5; }); }
        });
    });
}

// Route A: 算「只到第 uptoPhase phase」的 partial scores（不 mutate appScores），
// 用來餵 calculateLocalProbabilities → evaluateConfidence。
// 與 preCalculatePhase1To4 邏輯對稱（同樣 +w / -w*0.5 antagonist 扣分）但 scope 縮短。
function calculatePartialPhaseScores(uptoPhase) {
    const partial = { Ti:0, Te:0, Fi:0, Fe:0, Ni:0, Ne:0, Si:0, Se:0 };
    [m1Data, m2Data, m3Data, m4Data].slice(0, uptoPhase).forEach((list, pIdx) => {
        list.forEach((item, i) => {
            const ans = appState.answers[`q_${pIdx+1}_${i}`];
            if (ans === 'a') item.dA.forEach(d => { partial[d] += item.w; partial[ENGINE.antagonist[d]] -= item.w * 0.5; });
            else if (ans === 'b') item.dB.forEach(d => { partial[d] += item.w; partial[ENGINE.antagonist[d]] -= item.w * 0.5; });
        });
    });
    return partial;
}

// 進入 phase 2/3/4 開頭注入「進度已存檔」存檔提示。
// 設計原則 (feedback_assessment_integrity)：
//   - 不顯示已預測的型 / 信心（中途給結論=失專業）
//   - 文案聚焦「存檔成功 → 下次回來會從這題接續」
//   - 「暫停測驗」按鈕：toast 確認 + 回首頁；下次造訪 initStorage() 會接續
//   - 不提供任何 shortcut 結論按鈕
function maybeShowResumeBanner(currentPhase) {
    if (!['A', 'B', 'C'].includes(currentVersion)) return false;
    if (currentPhase < 2 || currentPhase > 4) return false; // 第 1 phase 還沒有東西可存
    const phasesAnswered = currentPhase - 1;
    const qArea = document.getElementById('questions-area');
    if (!qArea) return false;

    const _t = (k, vars, fb) => (window.t ? window.t(k, vars, fb) : fb);
    const bannerHtml = `
        <div class="resume-banner" role="status" aria-label="進度已存檔">
            <div class="rsb-icon">💾</div>
            <div class="rsb-body">
                <div class="rsb-headline">${_t('quiz.resumeHeadline', { n: phasesAnswered }, `進度已自動存檔（已完成 ${phasesAnswered} / 4 階段）`)}</div>
                <div class="rsb-sub">${_t('quiz.resumeSub', null, '隨時可以關閉視窗，下次造訪會從這題自動接續。')}</div>
            </div>
            <button type="button" class="btn-secondary rsb-btn-pause" onclick="handlePauseAndExit(${phasesAnswered})">${_t('action.pauseQuiz', null, '暫停測驗')}</button>
        </div>
    `;
    qArea.insertAdjacentHTML('afterbegin', bannerHtml);
    if (window.track) {
        window.track('quiz_resume_banner_shown', { version: currentVersion, phases_answered: phasesAnswered });
    }
    return true;
}

// 使用者按「暫停測驗」：state 已自動存在 localStorage（quiz-ux.js 旁路存檔），
// 我們只需 toast 確認 + 帶回首頁。下次造訪 assessment.html?v=X initStorage() 讀回 phase + answers，從原斷點繼續。
function handlePauseAndExit(phasesAnswered) {
    if (window.track) {
        window.track('quiz_pause_taken', { version: currentVersion, phases_answered: phasesAnswered });
    }
    saveState();
    if (typeof window.toast === 'function') {
        const msg = window.t ? window.t('quiz.pauseToast') : '進度已存檔，下次造訪會從這題接續 ✓';
        window.toast(msg, { type: 'success', duration: 2400 });
    }
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
}


// ==========================================
// [共用] 結果渲染與圖表 — 已抽出至 result-render.js（renderResult / updateCharts /
// updateDetail / buildCompatSection），HTML 載入順序保證 result-render.js 在 script.js 之後。
// ==========================================

function closeImageModal() { document.getElementById('image-modal').classList.add('hidden'); }

function restartQuiz() { 
    localStorage.removeItem('mbti_v1_final'); 
    localStorage.removeItem('mbti_guest_report_id');
    window.location.reload(); 
}

function copyShareLink() { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?s=${encodeScores(appScores)}`).then(()=>(window.toast || alert)((window.t ? window.t('result.msg.copySuccess') : "防篡改連結已複製"), { type: 'success' })); }

function goToTalo() {
    const TALO_URL = 'https://talo.chiyigo.com';
    const token = sessionStorage.getItem('chiyigo_access_token');
    if (token) {
        window.open(`${TALO_URL}#chiyigo_token=${encodeURIComponent(token)}`, '_blank');
    } else {
        window.open(TALO_URL, '_blank');
    }
}

function generateImageForMobile() {
    window.scrollTo(0,0);
    const target = document.getElementById('capture-area'); 
    document.getElementById('action-btns').style.display='none'; 
    document.getElementById('restart-btn').style.display='none'; 
    document.getElementById('watermark').classList.remove('hidden');
    
    // [防呆] 拉長截圖渲染時間與強制 CORS
    setTimeout(() => {
        html2canvas(target, { backgroundColor:'#0b1120', scale: 2, useCORS:true, allowTaint:false, y:0, scrollY:0 }).then(c => { 
            document.getElementById('action-btns').style.display='flex'; 
            document.getElementById('restart-btn').style.display='block'; 
            document.getElementById('watermark').classList.add('hidden'); 
            document.getElementById('image-preview').src = c.toDataURL('image/jpeg', 0.9); 
            document.getElementById('image-modal').classList.remove('hidden'); 
        }).catch(err => {
            document.getElementById('action-btns').style.display='flex'; 
            document.getElementById('restart-btn').style.display='block'; 
            document.getElementById('watermark').classList.add('hidden'); 
            (window.toast || alert)('圖片生成失敗，請稍後重試。', { type: 'error' });
        });
    }, 600);
}

async function nativeShareImage() { 
    try { 
        const r = await fetch(document.getElementById('image-preview').src); 
        const b = await r.blob(); 
        if(navigator.share) await navigator.share({files:[new File([b], 'MBTI_V1.jpg', {type:'image/jpeg'})], title:'我的認知光譜'}); 
        else (window.toast || alert)('請長按圖片儲存。', { type: 'info' }); 
    } catch(e) {} 
}

document.addEventListener('DOMContentLoaded', initApp);
