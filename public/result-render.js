// public/result-render.js
// ==========================================
// [模組] 結果頁渲染：人格主表 / radar+pie / Beebe / 互補配對 / 詳細解析
//
// 從 script.js 抽出來（原 432-578 行）以降低 script.js 體積並讓結果頁渲染獨立可審。
// 載入順序：必須在 state.js / script.js 之後（依賴 ENGINE / window.MM.scores / .state /
//   .backend.probs / .backend.sorted / .backend.primaryType / .flags.sharedView / .version /
//   .flags.trifurcationWarning / .charts）。
// 暴露的 global function（被 script.js / inline onclick 呼叫）：
//   - renderResult(isShared)
//   - updateCharts(p, norm, probs, sorted)
//   - updateDetail(type)
//   - buildCompatSection(primary)
// ==========================================
const MM = window.MM;

// 對齊 i18n.js *Html 後綴 opt-in 約定（見 CLAUDE.md / feedback_i18n_html_suffix）：
// ENGINE.tips / .gripExit / .blindspots / .reports 透過 innerHTML 注入結果頁，
// 雖然內容由 engine.js + engine-i18n-en.js 作者控制，仍走 escapeHtml 防 defense-in-depth
// 漏洞（未來翻譯者塞 `<` 會破渲染 / 開 XSS 載體）。
// 反迴歸由 test/engine-xss.spec.ts 守住。
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// i18n helper：有 window.t 走當前語系翻譯（en 缺 key 會自動 fallback 回中文），否則回 fallback。
// 刻意維持「各 function 內 local 宣告」而非頂層 const — result-render.js 與 script.js 同為
// classic script 共用 global lexical scope，頂層重複 const 名稱會 SyntaxError 整檔失效。
function renderResult(isShared) {
    const _T = (k, vars, fb) => (typeof window.t === 'function' ? window.t(k, vars, fb) : fb);
    let gripHTML = "";
    if(!isShared && !MM.flags.sharedView && !['D','E','F'].includes(MM.version)) {
        const p1S = getPhaseScores(0); const p4S = getPhaseScores(3);
        const p1Top = Object.keys(p1S).reduce((a,b)=>p1S[a]>p1S[b]?a:b); const p4Top = Object.keys(p4S).reduce((a,b)=>p4S[a]>p4S[b]?a:b);
        if (ENGINE.antagonist[p1Top] === p4Top) {
            const gripExit = window.ENGloc ? window.ENGloc('gripExit') : ENGINE.gripExit;
            const gripExitTxt = escapeHtml(gripExit[p1Top] || _T('result.diag.gripExitFallback', null, '請減少極端消耗。'));
            gripHTML = `<div class="diag-grip"><b>${_T('result.diag.gripTitle', null, '⚠️ 深層 Grip 狀態警告')}</b><br>${_T('result.diag.gripFlip', { core: p1Top, opp: p4Top }, `核心(${p1Top})在高壓完全翻轉為對立面(${p4Top})。`)}<div class="grip-exit"><b>${_T('result.diag.gripExitLabel', null, '💡 退出戰略：')}</b><br>${gripExitTxt}</div></div>`;
        }
    }
    document.getElementById('grip-warning').innerHTML = gripHTML;

    const primary = (!isShared && !MM.flags.sharedView && MM.backend.primaryType) ? MM.backend.primaryType : (MM.backend.sorted[0] || "ISFJ");
    document.getElementById('mbti-type').innerText = primary;

    const topProb = MM.backend.probs[primary] || 0.0;
    const probLabel = MM.flags.sharedView
        ? _T('result.msg.localProb', null, '本地解碼機率')
        : _T('result.msg.cloudProb', null, '雲端判定機率');
    document.getElementById('spectrum-subtitle').innerHTML = `<span class="tx-soft-cyan">${probLabel}: ${Math.round(topProb)}%</span>`;

    const mag = Math.sqrt(ENGINE.dimKeys.reduce((s,k)=>s+MM.scores[k]**2, 0))||1;
    document.getElementById('topology-diagnosis').innerHTML = (mag < 10)
        ? `<div class="diag-danger">${_T('result.diag.topoCollapse', null, '🔴 系統塌陷警告：能量互相抵銷，效度偏移。')}</div>`
        : (MM.flags.trifurcationWarning
            ? `<div class="diag-warning">${_T('result.diag.topoTrifurcation', null, '🟡 三向分岔畸變：前三維度糾纏過渡期。')}</div>`
            : `<div class="diag-safe">${_T('result.diag.topoBalance', null, '🟢 動態平衡拓撲 (Dynamic Symmetry)：健康非對稱幾何張力。')}</div>`);

    const norm = {}; ENGINE.dimKeys.forEach(k => norm[k] = Math.max(0, Math.min(100, Math.round(((MM.scores[k]+15)/45)*100))));

    updateCharts(primary, norm, MM.backend.probs, MM.backend.sorted);
    if (typeof window.renderBeebeStack === 'function') window.renderBeebeStack(primary, norm);
    const tipsLoc = window.ENGloc ? window.ENGloc('tips') : ENGINE.tips;
    document.getElementById('score-table-container').innerHTML = `<table><tr>${ENGINE.dimKeys.map(k=>{const tip = escapeHtml(tipsLoc[k]); return `<th data-tip="${tip}" title="${tip}">${k}</th>`;}).join('')}</tr><tr>${ENGINE.dimKeys.map(k=>`<td>${norm[k]}%</td>`).join('')}</tr></table>`;

    const tagEgo = _T('result.tag.ego', null, 'EGO');
    const tagSub = _T('result.tag.subconscious', null, '潛意識');
    const tagShadow = _T('result.tag.shadow', null, '陰影');
    const sMap = ENGINE.sides[primary] || ENGINE.sides["ISFJ"];
    const listHtml = MM.backend.sorted.map(t => {
        let tag = (t===sMap[0]) ? `<span class="tag-ego">${tagEgo}</span>` : (t===sMap[1] ? `<span class="tag-sub">${tagSub}</span>` : (t===sMap[2] ? `<span class="tag-unc">${tagShadow}</span>` : ""));
        const p = Math.round(MM.backend.probs[t]||0);
        // dynamic width 走 data-w → 後續 CSSOM 設寬，不在 innerHTML 內塞 style=""
        return `<div class="match-item" id="btn-${t}" data-update-detail="${t}"><div class="match-info"><b>${t}</b>${tag}<div class="match-bar-bg"><div class="match-bar-fill" data-w="${p}"></div></div></div><span class="match-pct">${p<1?"<1":p}%</span></div>`;
    }).join('');

    const matrixLabel = MM.flags.sharedView
        ? _T('result.label.matrixLocal', null, "16人格判定概率矩陣 (本地還原)")
        : _T('result.label.matrixCloud', null, "16人格判定概率矩陣 (雲端運算)");
    const compatHtml = buildCompatSection(primary);
    const analysisEl = document.getElementById('analysis-text');
    analysisEl.innerHTML = `<div class="report-section report-section--tight"><h3>◈ ${matrixLabel}</h3><div class="match-list">${listHtml}</div></div>${compatHtml}<div id="detail-box"></div>`;
    analysisEl.querySelectorAll('.match-bar-fill[data-w]').forEach(el => {
        el.style.width = el.getAttribute('data-w') + '%';
    });

    // CSP-friendly：原 inline onclick="updateDetail()" / onclick="window.track()" 都改用 delegation
    // analysis-text 容器後續 updateDetail 也會 innerHTML，但 detail-box 才是被覆寫的內層，
    // .match-item 在外層 .match-list 內，這層在 buildCompatSection 之外，不會被 updateDetail 覆寫。
    if (!analysisEl.dataset.delegated) {
        analysisEl.dataset.delegated = '1';
        analysisEl.addEventListener('click', (e) => {
            const matchEl = e.target.closest('[data-update-detail]');
            if (matchEl) { updateDetail(matchEl.getAttribute('data-update-detail')); return; }
            const compatEl = e.target.closest('[data-compat-track]');
            if (compatEl && window.track) {
                try {
                    const payload = JSON.parse(compatEl.getAttribute('data-compat-track'));
                    window.track('compat_card_click', payload);
                } catch (_) {}
            }
        });
    }

    updateDetail(primary);

    // [埋碼] 測驗完成 — 帶 questions_answered 讓 GA 能分群「提早結束 vs 完整答」
    if (!isShared && !MM.flags.sharedView) {
        if (window.track) window.track('quiz_complete', {
            version: MM.version,
            primary_type: primary,
            questions_answered: MM.lastQuestionsAnswered || null
        });
    }
}

// 結果頁互補配對卡：
//   - Duality：你的劣勢是 TA 的英雄。Socionics 中最舒服的關係，安全感來源。
//     直接用 ENGINE.sides[primary][1]（已經是 dual / subconscious）。
//   - Mirror：相同核心價值，但 J/P 偏好相反。互相照鏡子，磨合中成長。
//   - Activator：相同氣質但 I/E 相反，能量極性互推進，破解卡關。
function buildCompatSection(primary) {
    const _T = (k, vars, fb) => (typeof window.t === 'function' ? window.t(k, vars, fb) : fb);
    if (!primary || primary.length !== 4) return '';
    const sides = (typeof ENGINE !== 'undefined' && ENGINE.sides[primary]) || [];
    const dual = sides[1];
    const mirror = primary.slice(0, 3) + (primary[3] === 'J' ? 'P' : 'J');
    const activator = (primary[0] === 'I' ? 'E' : 'I') + primary.slice(1);

    const cards = [
        { type: dual,      label: _T('result.label.compatDuality',   null, '🔮 互補伴侶'), sub: 'Duality',   desc: _T('result.label.compatDualityDesc',   null, '你的劣勢，是 TA 的英雄。最深的安全感與互補。') },
        { type: mirror,    label: _T('result.label.compatMirror',    null, '🪞 鏡像成長'), sub: 'Mirror',    desc: _T('result.label.compatMirrorDesc',    null, '相同核心價值，但執行風格相反。互相照鏡子。') },
        { type: activator, label: _T('result.label.compatActivator', null, '⚡ 啟動夥伴'), sub: 'Activator', desc: _T('result.label.compatActivatorDesc', null, '相同氣質，能量極性相反，互相推進不卡關。') }
    ].filter(c => c.type && /^[A-Z]{4}$/.test(c.type));

    if (!cards.length) return '';

    const cardsHtml = cards.map(c => {
        const trackPayload = JSON.stringify({ from_type: primary, to_type: c.type, relation: c.sub })
            .replace(/"/g, '&quot;');
        return `<a class="compat-card" href="type-detail.html?type=${c.type}" target="_blank" rel="noopener" data-compat-track="${trackPayload}">
            <div class="compat-row">
                <span class="compat-label">${c.label}</span>
                <span class="compat-sub">${c.sub}</span>
            </div>
            <div class="compat-type">${c.type}</div>
            <div class="compat-desc">${c.desc}</div>
            <div class="compat-cta">${_T('result.label.compatCta', { type: c.type }, '查看 ' + c.type + ' 全解析 →')}</div>
        </a>`;
    }).join('');

    const compatTitle = _T('result.label.compatTitle', null, '◈ 與你最互補的人格 (Compatibility)');
    const compatHint = _T('result.label.compatHint', null, '不是「誰跟誰絕配」這種星座式廢話，而是榮格 / Socionics 的軸線互補：你的盲點是 TA 的本能。');
    return `
        <div class="report-section compat-section">
            <h3>${compatTitle}</h3>
            <p class="compat-hint">${compatHint}</p>
            <div class="compat-grid">${cardsHtml}</div>
        </div>`;
}

function updateCharts(p, norm, probs, sorted) {
    const stack = ENGINE.stacks[p] || ENGINE.stacks["ISFJ"], ideal = { [stack[0]]:95, [stack[1]]:75, [stack[2]]:55, [stack[3]]:35 };
    if(MM.charts.radar) MM.charts.radar.destroy();
    MM.charts.radar = new Chart(document.getElementById('functionChart'), {
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
    if(MM.charts.pie) MM.charts.pie.destroy();
    MM.charts.pie = new Chart(document.getElementById('probabilityChart'), {
        type:'pie',
        data:{ labels:[...top5, '其他'], datasets:[{ data:[...top5.map(k=>probs[k]||0), otherP], backgroundColor:['#38bdf8','#0284c7','#2563eb','#1e40af','#1e3a8a','#162032'], borderColor:'#111827', borderWidth:2 }] },
        options:{ maintainAspectRatio:false, layout:{padding:{top:20, bottom:45, left:20, right:20}}, plugins:{ legend:{display:false}, datalabels:{ display:true, color:'#fff', font:{weight:'bold', size:11}, align:'end', anchor:'end', offset:10, formatter:(v,ctx)=> Math.round(v)>2 ? `${ctx.chart.data.labels[ctx.dataIndex]}\n${Math.round(v)}%` : null, textAlign:'center' } } }
    });
}

function updateDetail(type) {
    const _T = (k, vars, fb) => (typeof window.t === 'function' ? window.t(k, vars, fb) : fb);
    document.querySelectorAll('.match-item').forEach(el => el.classList.remove('active'));
    document.getElementById('btn-'+type)?.classList.add('active');

    const reports = window.ENGloc ? window.ENGloc('reports') : ENGINE.reports;
    const blindspots = window.ENGloc ? window.ENGloc('blindspots') : ENGINE.blindspots;
    const tipsLoc = window.ENGloc ? window.ENGloc('tips') : ENGINE.tips;
    const r = reports[type] || reports["ISFJ"];
    const s = ENGINE.sides[type] || ENGINE.sides["ISFJ"];
    const stack = ENGINE.stacks[type] || ENGINE.stacks["ISFJ"];
    const blind = blindspots[ENGINE.antagonist[stack[2]]];

    if(MM.charts.radar) {
        const ideal = { [stack[0]]:95, [stack[1]]:75, [stack[2]]:55, [stack[3]]:35 };
        MM.charts.radar.data.datasets[1].data = ENGINE.dimKeys.map(k => ideal[k] || 15);
        MM.charts.radar.update();
    }

    document.getElementById('detail-box').innerHTML = `
        <div class="report-section">
            <h3>${_T('result.detail.tetraTitle', null, '◈ 心智四面體解構 (4 Sides of the Mind)')}</h3>
            <p><b>${_T('result.detail.egoLabel', { fn: s[0] }, `1. Ego (自我) - ${s[0]} :`)}</b><br>${_T('result.detail.egoBody', null, '您的日常操作系統與意識主體，負責應對大部分的常規現實。')}</p>
            <p><b>${_T('result.detail.subLabel', { fn: s[1] }, `2. Subconscious (潛意識/阿尼瑪) - ${s[1]} :`)}</b><br>${_T('result.detail.subBody', { type: type, fn: s[1] }, `您的隱藏渴望。在極度放鬆、充滿安全感或渴望被愛時，您會卸下 ${type} 的冰冷武裝，展現出 ${s[1]} 的隨性與熱情特質。`)}</p>
            <p><b>${_T('result.detail.uncLabel', { fn: s[2] }, `3. Unconscious (無意識陰影) - ${s[2]} :`)}</b><br>${_T('result.detail.uncBody', { fn: s[2] }, `您的防禦反撲。當遭遇重大挫折、背叛或中年危機時，大腦會切換至 ${s[2]}，以憤世嫉俗或破壞性的方式冷酷地反擊外界。`)}</p>
            <p><b>${_T('result.detail.superLabel', { fn: s[3] }, `4. Superego (超我寄生體) - ${s[3]} :`)}</b><br>${_T('result.detail.superBody', { fn: s[3] }, `您的終極毀滅模式。在面臨生死存亡或被逼入絕對絕境時，盲點功能全面接管，展現出 ${s[3]} 最具破壞性與惡意的極端防禦型態，玉石俱焚。`)}</p>
        </div>
        <div class="report-section">
            <h3>${_T('result.detail.tricksterTitle', null, '◈ 實測塌陷盲區 (The Real Trickster)')}</h3>
            <p class="tx-rose"><b>${ENGINE.antagonist[stack[2]]} (${escapeHtml((tipsLoc[ENGINE.antagonist[stack[2]]] || '').split(/[：:]/)[0])})</b><br>${escapeHtml(blind)}</p>
        </div>
        <div class="report-section report-section--no-border">
            <h3>${_T('result.detail.structTitle', null, '◈ 結構化解析')}</h3><p><b>${_T('result.detail.daily', null, '■ 日常運作:')}</b><br>${escapeHtml(r.b)}</p><p><b>${_T('result.detail.conflict', null, '■ 極端衝突:')}</b><br>${escapeHtml(r.c)}</p><p><b>${_T('result.detail.awaken', null, '■ 覺醒進化:')}</b><br>${escapeHtml(r.g)}</p>
            <h4 class="u-mt-20">${_T('result.detail.prescription', null, '◈ 動態處方籤')}</h4><p class="tx-emerald-bold">${escapeHtml(r.p)}</p>
        </div>`;
}

// 切語言時重新渲染結果頁（result-area 顯示中才執行；否則使用者尚未完成測驗）
document.addEventListener('localechange', () => {
    const resultArea = document.getElementById('result-area');
    if (!resultArea || resultArea.classList.contains('hidden')) return;
    try {
        // renderResult 重新渲染整頁；isShared 視 MM.flags.sharedView 而定
        renderResult(typeof MM.flags.sharedView !== 'undefined' && MM.flags.sharedView);
    } catch (_) { /* 失敗就保留原內容；下次 setLocale 再試 */ }
});
