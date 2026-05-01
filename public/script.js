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

let appScores = { Ti:0, Te:0, Fi:0, Fe:0, Ni:0, Ne:0, Si:0, Se:0 };
let appState = { phase: 1, answers: {}, dynamicRoute: null };
let isSharedView = false;
let quizStartTime = Date.now(); 
window.radarChartObj = null;
window.pieChartObj = null;
let backendProbs = {};
let backendSorted = [];

window.isGodMode = false;
window.backendPrimaryType = null; 

function updateProgress(p, max = 5) { 
    document.getElementById('progress-fill').style.width = `${(p/max)*100}%`; 
    document.getElementById('progress-text').innerText = `當前進度: 模組 ${p} / ${max}`; 
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
        if (devConsole) devConsole.style.display = 'block';
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
            alert("⚠️ 偵測到手機瀏覽器快取異常，請清除快取重新載入。");
            return;
        }
        renderPhaseDEF(p);
    } else {
        // A, B, C 卷舊軌道
        if(p > 5) p = 5; 
        updateProgress(p, 5);
        if (m1Data.length === 0) {
            alert("⚠️ 偵測到手機瀏覽器快取異常，請清除快取重新載入。");
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
        let headers, descs;
        if (currentVersion === 'A') {
            headers = ["PHASE 01: 日常資訊濾鏡", "PHASE 02: 舒適圈價值偏好", "PHASE 03: 慣性任務處理", "PHASE 04: 心流與自我驗證"];
            descs = ["在毫無壓力的狀態下，大腦最自然攝取資訊的方式。", "資源充足時，您日常決策的優先考量基準。", "面對一般任務與人際，您最習慣的應對模式。", "當您感到極度自信與滿足時，所展現出的顛峰狀態。"];
        } else if (currentVersion === 'C') {
            headers = ["PHASE 01: 終極信仰覺醒", "PHASE 02: 潛意識渴望投射", "PHASE 03: 劣勢功能整合", "PHASE 04: 靈魂歸屬與願景"];
            descs = ["跳脫當下現實，您內心深處最由衷敬佩的特質。", "放下防備時，您對自我蛻變的最深層渴望。", "若能克服性格的致命弱點，您希望能達到的境界。", "測量您的 Anima (潛意識)，尋找人生旅程的最終意義。"];
        } else {
            headers = ["PHASE 01: 內外傾代價純化", "PHASE 02: 同域感知判斷交火", "PHASE 03: 榮格軸向拮抗檢驗", "PHASE 04: 系統崩潰極端防禦"];
            descs = ["情境皆伴隨極端代價。請在痛苦中選擇大腦最底層的本能防禦。", "資源極度稀缺時，您的決策優先權將徹底暴露。", "強迫測試大腦功能連動。您必須做出殘酷取捨。", "逆向測量潛意識物理防禦。請誠實回憶谷底時的失控狀態。"];
        }

        const lists = [m1Data, m2Data, m3Data, m4Data]; 
        const starts = [1, 17, 33, 49];

        header.innerText = headers[p-1]; desc.innerText = descs[p-1];
        qArea.innerHTML = lists[p-1].map((item, i) => {
            const qK = `q_${p}_${i}`; const s = appState.answers[qK];
            return `<div class="question"><p><strong>${starts[p-1]+i}. ${item.q}</strong></p><div class="options"><label><input type="radio" name="${qK}" value="a" ${s==='a'?'checked':''}> ${item.a}</label><label><input type="radio" name="${qK}" value="b" ${s==='b'?'checked':''}> ${item.b}</label></div></div>`;
        }).join('');
        
        btn.innerText = p < 4 ? `確認選項 (${p}/5)` : "掃描核心維度 (4/5)";
        btn.onclick = () => {
            const qs = qArea.querySelectorAll('.question');
            for (let q of qs) { if(!q.querySelector('input:checked')) { alert("請完成所有題目以利精準建模。"); q.scrollIntoView({ behavior:'smooth', block:'center' }); return; } }
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
        
        const probe = getDynamicProbe(sortedF[0], sortedF[1]); 
        
        header.innerText = "PHASE 05: 階層解耦探針 (高增益)";
        desc.innerText = window.TrifurcationWarning ? "系統偵測到三向分岔糾纏現象，啟動邊界剝離。" : `偵測到核心向量 [${sortedF[0]}/${sortedF[1]}] 高度重合，啟動最終判定。`;
        qArea.innerHTML = probe.map((it, i) => `<div class="question"><p><strong>${65 + i}. ${it.q}</strong></p><div class="options"><label><input type="radio" name="q5" value="a"> ${it.a}</label><label><input type="radio" name="q5" value="b"> ${it.b}</label></div></div>`).join('');
        window.mbtiActiveProbe = probe;
        btn.innerText = "提交並連接 Cloudflare V1 引擎";
        btn.onclick = () => {
            const sel = document.querySelector('input[name="q5"]:checked');
            if(!sel) return alert("請完成最後的校準題目。");
            appState.answers.phase5 = { val: sel.value, dA: window.mbtiActiveProbe[0].dA, dB: window.mbtiActiveProbe[0].dB };
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
    let moduleTitle = currentVersion === 'D' ? "日常行為" : (currentVersion === 'E' ? "決策情境" : "認知偏好");

    if (p === 1) {
        header.innerText = `Step 1：${moduleTitle}量表 (Likert)`;
        desc.innerText = "請根據直覺，評估以下描述與你真實狀態的相符程度。(1: 極度不符 ~ 5: 極度符合)";
        
        qArea.innerHTML = activeLikert.map((item, i) => {
            const qK = `q_1_likert_${i}`; const s = appState.answers[qK];
            let optionsHtml = '';
            for(let v=1; v<=5; v++){
                optionsHtml += `<label style="flex:1; text-align:center; padding:12px 0; margin:0; border: 1px solid #1e293b; border-radius:8px; cursor:pointer;">
                    <input type="radio" name="${qK}" value="${v}" ${s==String(v)?'checked':''} style="margin:0 0 5px 0;"> <br><span style="font-size:1.1rem; font-weight:bold;">${v}</span>
                </label>`;
            }
            return `<div class="question"><p><strong>${i+1}. ${item.q}</strong></p><div class="options" style="flex-direction:row; justify-content:space-between; gap:8px;">${optionsHtml}</div></div>`;
        }).join('');
        
        btn.innerText = "進入下一步 (1/3)";
        btn.onclick = () => {
            if(!validateAndSaveDEF('1_likert', activeLikert.length)) return;
            appState.phase = 2; saveState(); updateProgress(2, 3); window.scrollTo(0,0); renderPhaseDEF(2);
        };
    } 
    else if (p === 2) {
        header.innerText = "Step 2：功能迫選 (Forced Choice)";
        desc.innerText = "請在兩個互斥的極端情境中，選擇你大腦最本能的防禦或偏好傾向。";
        
        qArea.innerHTML = activeForced.map((item, i) => {
            const qK = `q_2_forced_${i}`; const s = appState.answers[qK];
            return `<div class="question"><p><strong>${i+1}. ${item.q}</strong></p><div class="options"><label><input type="radio" name="${qK}" value="a" ${s==='a'?'checked':''}> ${item.a}</label><label><input type="radio" name="${qK}" value="b" ${s==='b'?'checked':''}> ${item.b}</label></div></div>`;
        }).join('');
        
        btn.innerText = "進行邊界解析 (2/3)";
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
            header.innerText = "Step 3：情境行為驗證 (SJT)";
            desc.innerText = "面對以下複雜情境，請選擇你最可能採取的行動。";
            qArea.innerHTML = activeSJT.map((item, i) => {
                const qK = `q_3_sjt_${i}`; const s = appState.answers[qK];
                let opts = item.options.map((opt, optIdx) => {
                    return `<label><input type="radio" name="${qK}" value="${optIdx}" ${s==String(optIdx)?'checked':''}> ${opt.text}</label>`;
                }).join('');
                return `<div class="question"><p><strong>${i+1}. ${item.q}</strong></p><div class="options">${opts}</div></div>`;
            }).join('');
            
            btn.innerText = "提交並計算最終拓撲 (3/3)";
            btn.onclick = () => {
                if(!validateAndSaveDEF('3_sjt', activeSJT.length)) return;
                proceedToResultAPI();
            };
        } 
        else if (appState.dynamicRoute === 'RANKING') {
            header.innerText = "Step 3：認知結構排序";
            desc.innerText = "請依序點擊選項賦予名次 (點擊順序即為 1, 2, 3, 4)。點錯可點擊右側「重設」按鈕。";
            
            window.rankingStates = window.rankingStates || {};
            
            qArea.innerHTML = activeRanking.map((item, i) => {
                const qK = `q_3_rank_${i}`;
                window.rankingStates[qK] = window.rankingStates[qK] || [];
                
                let itemsHtml = item.items.map((opt, optIdx) => {
                    let rankStr = ''; let activeStyle = '';
                    let rankIdx = window.rankingStates[qK].indexOf(optIdx);
                    if(rankIdx > -1) {
                        rankStr = `<span style="background:#38bdf8; color:#0f172a; padding:2px 8px; border-radius:4px; font-weight:bold; margin-right:8px;">[ ${rankIdx+1} ]</span>`;
                        activeStyle = 'border-color:#38bdf8; background:#1e293b;';
                    }
                    return `<div class="ranking-item" onclick="handleRankingClick('${qK}', ${optIdx}, ${item.items.length})" style="padding:15px; border:1px solid #1e293b; border-radius:10px; background:#162032; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; transition:0.2s; ${activeStyle}">
                        ${rankStr} <span style="line-height:1.4;">${opt.text}</span>
                    </div>`;
                }).join('');
                
                return `<div class="question" id="container_${qK}"><div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;"><strong>${i+1}. ${item.q}</strong> <button class="btn-outline" style="width:auto; padding:5px 10px; font-size:0.8rem; flex-shrink:0;" onclick="resetRanking('${qK}')">🔄 重設</button></div><div class="options" id="opts_${qK}">${itemsHtml}</div></div>`;
            }).join('');
            
            btn.innerText = "提交並計算最終拓撲 (3/3)";
            btn.onclick = () => {
                for(let i=0; i < activeRanking.length; i++){
                    let qK = `q_3_rank_${i}`;
                    if(window.rankingStates[qK].length !== activeRanking[i].items.length){
                        alert(`請完成第 ${i+1} 題的所有選項排序。`);
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
            alert("請完成所有題目以利精準建模。");
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
        let rankStr = ''; let activeStyle = '';
        let rankIdx = window.rankingStates[qK].indexOf(i);
        if(rankIdx > -1) {
            rankStr = `<span style="background:#38bdf8; color:#0f172a; padding:2px 8px; border-radius:4px; font-weight:bold; margin-right:8px;">[ ${rankIdx+1} ]</span>`;
            activeStyle = 'border-color:#38bdf8; background:#1e293b;';
        }
        return `<div class="ranking-item" onclick="handleRankingClick('${qK}', ${i}, ${itemData.items.length})" style="padding:15px; border:1px solid #1e293b; border-radius:10px; background:#162032; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; transition:0.2s; ${activeStyle}">
            ${rankStr} <span style="line-height:1.4;">${opt.text}</span>
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
        return `<div class="ranking-item" onclick="handleRankingClick('${qK}', ${i}, ${itemData.items.length})" style="padding:15px; border:1px solid #1e293b; border-radius:10px; background:#162032; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; transition:0.2s;">
            <span style="line-height:1.4;">${opt.text}</span>
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
        const ans = appState.answers.phase5;
        if(ans.val === 'a') ans.dA.forEach(d => { appScores[d]+=3; appScores[ENGINE.antagonist[d]]-=1.5; }); 
        else ans.dB.forEach(d => { appScores[d]+=3; appScores[ENGINE.antagonist[d]]-=1.5; }); 
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

// ==========================================
// [共用] 結果渲染與圖表
// ==========================================
function renderResult(isShared) {
    let gripHTML = "";
    if(!isShared && !isSharedView && !['D','E','F'].includes(currentVersion)) {
        const p1S = getPhaseScores(0); const p4S = getPhaseScores(3);
        const p1Top = Object.keys(p1S).reduce((a,b)=>p1S[a]>p1S[b]?a:b); const p4Top = Object.keys(p4S).reduce((a,b)=>p4S[a]>p4S[b]?a:b);
        if (ENGINE.antagonist[p1Top] === p4Top) { 
            gripHTML = `<div class="diag-grip"><b>⚠️ 深層 Grip 狀態警告</b><br>核心(${p1Top})在高壓完全翻轉為對立面(${p4Top})。<div class="grip-exit"><b>💡 退出戰略：</b><br>${ENGINE.gripExit[p1Top]||'請減少極端消耗。'}</div></div>`;
        }
    }
    document.getElementById('grip-warning').innerHTML = gripHTML;

    const primary = (!isShared && !isSharedView && window.backendPrimaryType) ? window.backendPrimaryType : (backendSorted[0] || "ISFJ");
    document.getElementById('mbti-type').innerText = primary;
    
    const topProb = backendProbs[primary] || 0.0;
    const probLabel = isSharedView ? "本地解碼概率" : "雲端判定概率";
    document.getElementById('spectrum-subtitle').innerHTML = `<span style="color:#e0f2fe">${probLabel}: ${Math.round(topProb)}%</span>`;
    
    const mag = Math.sqrt(ENGINE.dimKeys.reduce((s,k)=>s+appScores[k]**2, 0))||1; 
    document.getElementById('topology-diagnosis').innerHTML = (mag < 10) ? `<div class="diag-danger">🔴 系統塌陷警告：能量互相抵銷，效度偏移。</div>` : (window.TrifurcationWarning ? `<div class="diag-warning">🟡 三向分岔畸變：前三維度糾纏過渡期。</div>` : `<div class="diag-safe">🟢 動態平衡拓撲 (Dynamic Symmetry)：健康非對稱幾何張力。</div>`);

    const norm = {}; ENGINE.dimKeys.forEach(k => norm[k] = Math.max(0, Math.min(100, Math.round(((appScores[k]+15)/45)*100))));
    
    updateCharts(primary, norm, backendProbs, backendSorted);
    document.getElementById('score-table-container').innerHTML = `<table><tr>${ENGINE.dimKeys.map(k=>`<th data-tip="${ENGINE.tips[k]}" title="${ENGINE.tips[k]}">${k}</th>`).join('')}</tr><tr>${ENGINE.dimKeys.map(k=>`<td>${norm[k]}%</td>`).join('')}</tr></table>`;
    
    const sMap = ENGINE.sides[primary] || ENGINE.sides["ISFJ"];
    const listHtml = backendSorted.map(t => { 
        let tag = (t===sMap[0]) ? `<span class="tag-ego">EGO</span>` : (t===sMap[1] ? `<span class="tag-sub">潛意識</span>` : (t===sMap[2] ? `<span class="tag-unc">陰影</span>` : "")); 
        const p = Math.round(backendProbs[t]||0); 
        return `<div class="match-item" id="btn-${t}" onclick="updateDetail('${t}')"><div class="match-info"><b>${t}</b>${tag}<div class="match-bar-bg"><div class="match-bar-fill" style="width:${p}%"></div></div></div><span class="match-pct">${p<1?"<1":p}%</span></div>`; 
    }).join('');
    
    const matrixLabel = isSharedView ? "16人格判定概率矩陣 (本地還原)" : "16人格判定概率矩陣 (雲端運算)";
    document.getElementById('analysis-text').innerHTML = `<div class="report-section" style="padding-bottom:10px;"><h3>◈ ${matrixLabel}</h3><div class="match-list">${listHtml}</div></div><div id="detail-box"></div>`;
    
    updateDetail(primary);

    // [埋碼] 測驗完成
    if (!isShared && !isSharedView && typeof gtag !== 'undefined') {
        gtag('event', 'quiz_complete', { 'version': currentVersion, 'primary_type': primary });
        if(typeof fbq !== 'undefined') fbq('trackCustom', 'QuizComplete', { version: currentVersion, primary_type: primary });
    }
}

function updateCharts(p, norm, probs, sorted) {
    const stack = ENGINE.stacks[p] || ENGINE.stacks["ISFJ"], ideal = { [stack[0]]:95, [stack[1]]:75, [stack[2]]:55, [stack[3]]:35 };
    if(window.radarChartObj) window.radarChartObj.destroy();
    window.radarChartObj = new Chart(document.getElementById('functionChart'), { 
        type:'radar', 
        data:{ 
            labels:ENGINE.dimKeys, 
            datasets:[
                {label:'絕對能量', data:ENGINE.dimKeys.map(k=>norm[k]), backgroundColor:'rgba(56, 189, 248, 0.2)', borderColor:'#38bdf8', borderWidth:2, pointRadius:4, order:1},
                {label:'理論形狀', data:ENGINE.dimKeys.map(k=>ideal[k]||15), borderColor:'#64748b', borderWidth:1.5, borderDash:[5,5], pointRadius:0, order:2},
                {label:'全球常模', data:ENGINE.dimKeys.map(k=>ENGINE.popNorm[k]), borderColor:'rgba(250, 204, 21, 0.3)', borderWidth:1, borderDash:[2,2], pointRadius:0, order:3}
            ] 
        }, 
        options:{ scales:{r:{suggestedMin:0, suggestedMax:100, grid:{color:'#1e293b'}, angleLines:{color:'#1e293b'}, ticks:{display:false}, pointLabels:{color:'#cbd5e1', font:{weight:'bold'}}}}, plugins:{legend:{display:false}, datalabels:{display:false}}, maintainAspectRatio:false, animation:{duration:1400, easing:'easeOutQuart'}, animations:{numbers:{from:0, duration:1400, easing:'easeOutQuart'}} }
    });

    const top5 = sorted.slice(0,5); const otherP = sorted.slice(5).reduce((s,k)=>s+(probs[k]||0),0);
    if(window.pieChartObj) window.pieChartObj.destroy();
    window.pieChartObj = new Chart(document.getElementById('probabilityChart'), { 
        type:'pie', 
        data:{ labels:[...top5, '其他'], datasets:[{ data:[...top5.map(k=>probs[k]||0), otherP], backgroundColor:['#38bdf8','#0284c7','#2563eb','#1e40af','#1e3a8a','#162032'], borderColor:'#111827', borderWidth:2 }] }, 
        options:{ maintainAspectRatio:false, layout:{padding:{top:20, bottom:45, left:20, right:20}}, plugins:{ legend:{display:false}, datalabels:{ display:true, color:'#fff', font:{weight:'bold', size:11}, align:'end', anchor:'end', offset:10, formatter:(v,ctx)=> Math.round(v)>2 ? `${ctx.chart.data.labels[ctx.dataIndex]}\n${Math.round(v)}%` : null, textAlign:'center' } } } 
    });
}

function updateDetail(type) {
    document.querySelectorAll('.match-item').forEach(el => el.classList.remove('active')); 
    document.getElementById('btn-'+type)?.classList.add('active');
    
    const r = ENGINE.reports[type] || ENGINE.reports["ISFJ"]; 
    const s = ENGINE.sides[type] || ENGINE.sides["ISFJ"]; 
    const stack = ENGINE.stacks[type] || ENGINE.stacks["ISFJ"];
    const blind = ENGINE.blindspots[ENGINE.antagonist[stack[2]]];
    
    if(window.radarChartObj) {
        const ideal = { [stack[0]]:95, [stack[1]]:75, [stack[2]]:55, [stack[3]]:35 };
        window.radarChartObj.data.datasets[1].data = ENGINE.dimKeys.map(k => ideal[k] || 15);
        window.radarChartObj.update();
    }

    document.getElementById('detail-box').innerHTML = `
        <div class="report-section">
            <h3>◈ 心智四面體解構 (4 Sides of the Mind)</h3>
            <p><b>1. Ego (自我) - ${s[0]} :</b><br>您的日常操作系統與意識主體，負責應對大部分的常規現實。</p>
            <p><b>2. Subconscious (潛意識/阿尼瑪) - ${s[1]} :</b><br>您的隱藏渴望。在極度放鬆、充滿安全感或渴望被愛時，您會卸下 ${type} 的冰冷武裝，展現出 ${s[1]} 的隨性與熱情特質。</p>
            <p><b>3. Unconscious (無意識陰影) - ${s[2]} :</b><br>您的防禦反撲。當遭遇重大挫折、背叛或中年危機時，大腦會切換至 ${s[2]}，以憤世嫉俗或破壞性的方式冷酷地反擊外界。</p>
            <p><b>4. Superego (超我寄生體) - ${s[3]} :</b><br>您的終極毀滅模式。在面臨生死存亡或被逼入絕對絕境時，盲點功能全面接管，展現出 ${s[3]} 最具破壞性與惡意的極端防禦型態，玉石俱焚。</p>
        </div>
        <div class="report-section">
            <h3>◈ 實測塌陷盲區 (The Real Trickster)</h3>
            <p style="color:#fca5a5;"><b>${ENGINE.antagonist[stack[2]]} (${ENGINE.tips[ENGINE.antagonist[stack[2]]].split('：')[0]})</b><br>${blind}</p>
        </div>
        <div class="report-section" style="border-bottom:none;margin-bottom:0;">
            <h3>◈ 結構化解析</h3><p><b>■ 日常運作:</b><br>${r.b}</p><p><b>■ 極端衝突:</b><br>${r.c}</p><p><b>■ 覺醒進化:</b><br>${r.g}</p>
            <h4 style="margin-top: 20px;">◈ 動態處方籤</h4><p style="color:#6ee7b7; font-weight: bold;">${r.p}</p>
        </div>`;
}

function closeImageModal() { document.getElementById('image-modal').classList.add('hidden'); }

function restartQuiz() { 
    localStorage.removeItem('mbti_v1_final'); 
    localStorage.removeItem('mbti_guest_report_id');
    window.location.reload(); 
}

function copyShareLink() { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?s=${encodeScores(appScores)}`).then(()=>alert("防篡改連結已複製")); }

function goToTalo() {
    const TALO_URL = 'https://talo-web.pages.dev';
    const token = sessionStorage.getItem('chiyigo_access_token');
    if (token) {
        window.open(`${TALO_URL}?chiyigo_token=${encodeURIComponent(token)}`, '_blank');
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
            alert('圖片生成失敗，請稍後重試。');
        });
    }, 600);
}

async function nativeShareImage() { 
    try { 
        const r = await fetch(document.getElementById('image-preview').src); 
        const b = await r.blob(); 
        if(navigator.share) await navigator.share({files:[new File([b], 'MBTI_V1.jpg', {type:'image/jpeg'})], title:'我的認知光譜'}); 
        else alert('請長按圖片儲存。'); 
    } catch(e) {} 
}

document.addEventListener('DOMContentLoaded', initApp);