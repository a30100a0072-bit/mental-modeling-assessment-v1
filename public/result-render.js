// public/result-render.js
// ==========================================
// [模組] 結果頁渲染：人格主表 / radar+pie / Beebe / 互補配對 / 詳細解析
//
// 從 script.js 抽出來（原 432-578 行）以降低 script.js 體積並讓結果頁渲染獨立可審。
// 載入順序：必須在 script.js 之後（依賴 ENGINE / appScores / appState / backendProbs /
//   backendSorted / backendPrimaryType / isSharedView / currentVersion / TrifurcationWarning）。
// 暴露的 global function（被 script.js / inline onclick 呼叫）：
//   - renderResult(isShared)
//   - updateCharts(p, norm, probs, sorted)
//   - updateDetail(type)
//   - buildCompatSection(primary)
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
    if (typeof window.renderBeebeStack === 'function') window.renderBeebeStack(primary, norm);
    document.getElementById('score-table-container').innerHTML = `<table><tr>${ENGINE.dimKeys.map(k=>`<th data-tip="${ENGINE.tips[k]}" title="${ENGINE.tips[k]}">${k}</th>`).join('')}</tr><tr>${ENGINE.dimKeys.map(k=>`<td>${norm[k]}%</td>`).join('')}</tr></table>`;

    const sMap = ENGINE.sides[primary] || ENGINE.sides["ISFJ"];
    const listHtml = backendSorted.map(t => {
        let tag = (t===sMap[0]) ? `<span class="tag-ego">EGO</span>` : (t===sMap[1] ? `<span class="tag-sub">潛意識</span>` : (t===sMap[2] ? `<span class="tag-unc">陰影</span>` : ""));
        const p = Math.round(backendProbs[t]||0);
        return `<div class="match-item" id="btn-${t}" onclick="updateDetail('${t}')"><div class="match-info"><b>${t}</b>${tag}<div class="match-bar-bg"><div class="match-bar-fill" style="width:${p}%"></div></div></div><span class="match-pct">${p<1?"<1":p}%</span></div>`;
    }).join('');

    const matrixLabel = isSharedView ? "16人格判定概率矩陣 (本地還原)" : "16人格判定概率矩陣 (雲端運算)";
    const compatHtml = buildCompatSection(primary);
    document.getElementById('analysis-text').innerHTML = `<div class="report-section" style="padding-bottom:10px;"><h3>◈ ${matrixLabel}</h3><div class="match-list">${listHtml}</div></div>${compatHtml}<div id="detail-box"></div>`;

    updateDetail(primary);

    // [埋碼] 測驗完成
    if (!isShared && !isSharedView) {
        if (window.track) window.track('quiz_complete', { version: currentVersion, primary_type: primary });
    }
}

// 結果頁互補配對卡：
//   - Duality：你的劣勢是 TA 的英雄。Socionics 中最舒服的關係，安全感來源。
//     直接用 ENGINE.sides[primary][1]（已經是 dual / subconscious）。
//   - Mirror：相同核心價值，但 J/P 偏好相反。互相照鏡子，磨合中成長。
//   - Activator：相同氣質但 I/E 相反，能量極性互推進，破解卡關。
function buildCompatSection(primary) {
    if (!primary || primary.length !== 4) return '';
    const sides = (typeof ENGINE !== 'undefined' && ENGINE.sides[primary]) || [];
    const dual = sides[1];
    const mirror = primary.slice(0, 3) + (primary[3] === 'J' ? 'P' : 'J');
    const activator = (primary[0] === 'I' ? 'E' : 'I') + primary.slice(1);

    const cards = [
        { type: dual,      label: '🔮 互補伴侶',  sub: 'Duality',     desc: '你的劣勢，是 TA 的英雄。最深的安全感與互補。' },
        { type: mirror,    label: '🪞 鏡像成長',  sub: 'Mirror',      desc: '相同核心價值，但執行風格相反。互相照鏡子。' },
        { type: activator, label: '⚡ 啟動夥伴',  sub: 'Activator',   desc: '相同氣質，能量極性相反，互相推進不卡關。' }
    ].filter(c => c.type && /^[A-Z]{4}$/.test(c.type));

    if (!cards.length) return '';

    const cardsHtml = cards.map(c =>
        `<a class="compat-card" href="type-detail.html?type=${c.type}" target="_blank" rel="noopener"
            onclick="window.track && window.track('compat_card_click', { from_type: '${primary}', to_type: '${c.type}', relation: '${c.sub}' })">
            <div class="compat-row">
                <span class="compat-label">${c.label}</span>
                <span class="compat-sub">${c.sub}</span>
            </div>
            <div class="compat-type">${c.type}</div>
            <div class="compat-desc">${c.desc}</div>
            <div class="compat-cta">查看 ${c.type} 全解析 →</div>
        </a>`
    ).join('');

    return `
        <div class="report-section compat-section">
            <h3>◈ 與你最互補的人格 (Compatibility)</h3>
            <p style="color:#94a3b8; font-size:0.92rem; margin-bottom:14px;">不是「誰跟誰絕配」這種星座式廢話，而是榮格 / Socionics 的軸線互補：你的盲點是 TA 的本能。</p>
            <div class="compat-grid">${cardsHtml}</div>
        </div>`;
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
