Chart.register(ChartDataLabels);

const API_BASE = "/api/v1";

window.onload = () => {
    const token = localStorage.getItem('mbti_jwt_token');
    if (!token) {
        alert("未偵測到神經連結授權，請重新登入。");
        window.location.href = 'login.html';
        return;
    }
    fetchHistory(token);
};

async function fetchHistory(token) {
    try {
        const response = await fetch(`${API_BASE}/user/history`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) throw new Error("授權過期，請重新登入");
        if (!response.ok) throw new Error("無法連接歷史資料庫");

        const result = await response.json();
        renderDashboard(result.data);
    } catch (error) {
        alert(error.message);
        handleLogout();
    }
}

function renderDashboard(records) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');

    if (!records || records.length === 0) {
        document.getElementById('history-container').innerHTML = '<p style="text-align:center; color:#64748b;">尚未存有任何建模紀錄。</p>';
        return;
    }

    const total = records.length;
    
    let latestType = "ISFJ"; 
    try {
        latestType = records[0].primary_type || "ISFJ";
    } catch (e) { console.warn("Parse error on latest record."); }
    
    let identicalCount = 0;
    records.forEach(r => {
        if (r.primary_type === latestType) identicalCount++;
    });
    const stability = total > 0 ? Math.round((identicalCount / total) * 100) : 0;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-latest').innerText = latestType;
    document.getElementById('stat-stability').innerText = `${stability}%`;
    document.getElementById('stat-stability').style.color = stability < 50 ? '#fca5a5' : '#6ee7b7';

    renderAggregatedCharts(records, total);

    const versionMap = {
        'A': '日常舒適圈 (Phase A)',
        'B': '高壓防禦 (Phase B)',
        'C': '覺醒願景 (Phase C)',
        'D': '日常行為量表 (Phase D)',
        'E': '決策情境量表 (Phase E)',
        'F': '認知偏好量表 (Phase F)'
    };

    const container = document.getElementById('history-container');
    container.innerHTML = records.map(r => {
        const dateStr = new Date(r.timestamp).toLocaleString('zh-TW', { hour12: false });
        
        let pType = r.primary_type || "ISFJ", pProb = 0;
        try {
            const probs = JSON.parse(r.result_distribution);
            pProb = Math.round((probs[pType] || 0));
        } catch (e) {}
        
        let encodeScoresStr = "";
        try {
            const dbArr = JSON.parse(r.raw_scores);
            const scoreObj = { Ni: dbArr[0], Ne: dbArr[1], Si: dbArr[2], Se: dbArr[3], Ti: dbArr[4], Te: dbArr[5], Fi: dbArr[6], Fe: dbArr[7] };
            const dimKeys = ['Ti', 'Te', 'Fi', 'Fe', 'Ni', 'Ne', 'Si', 'Se'];
            encodeScoresStr = dimKeys.map(k => Math.max(0, Math.round((scoreObj[k]||0) + 100)).toString(36)).join('-');
        } catch (e) {}

        // [修復]: 處理資料庫缺失 version 的防呆，預設給予 B
        const version = r.assessment_version || r.version || 'B';
        const versionName = versionMap[version] || `高壓防禦 (Phase B)`;

        return `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-date">${dateStr} | 引擎模組: ${versionName}</div>
                    <div class="history-type">${pType} <span style="font-size:0.8rem; color:#94a3b8; font-weight:normal;">(置信度: ${pProb}%)</span></div>
                </div>
                <div class="history-action">
                    <button class="btn-primary" onclick="window.location.href='assessment.html?v=${version}&s=${encodeScoresStr}'">檢視拓撲圖</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderAggregatedCharts(records, total) {
    document.getElementById('aggregated-charts-section').classList.remove('hidden');

    let sumScores = [0, 0, 0, 0, 0, 0, 0, 0]; 
    let sumProbs = {};

    records.forEach(r => {
        try {
            const dbArr = JSON.parse(r.raw_scores);
            for(let i=0; i<8; i++) sumScores[i] += dbArr[i];
            
            const probs = JSON.parse(r.result_distribution);
            for(let type in probs) {
                sumProbs[type] = (sumProbs[type] || 0) + probs[type];
            }
        } catch(e) {}
    });

    const avgScores = sumScores.map(v => v / total);
    const avgStandard = [avgScores[4], avgScores[5], avgScores[6], avgScores[7], avgScores[0], avgScores[1], avgScores[2], avgScores[3]];
    const avgNorm = avgStandard.map(s => Math.max(0, Math.min(100, Math.round(((s+15)/45)*100))));

    let avgProbs = {};
    for(let type in sumProbs) {
        avgProbs[type] = sumProbs[type] / total;
    }
    const sortedAvgProbs = Object.keys(avgProbs).sort((a,b) => avgProbs[b] - avgProbs[a]);
    const top5 = sortedAvgProbs.slice(0, 5);
    const otherP = sortedAvgProbs.slice(5).reduce((sum, key) => sum + avgProbs[key], 0);

    const dimKeys = ['Ti', 'Te', 'Fi', 'Fe', 'Ni', 'Ne', 'Si', 'Se'];
    const popNorm = [48, 52, 50, 58, 38, 52, 62, 55];
    const ctxRadar = document.getElementById('avgRadarChart').getContext('2d');
    new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: dimKeys,
            datasets: [
                {label: '綜合平均能量', data: avgNorm, backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: '#38bdf8', borderWidth: 2, pointRadius: 4},
                {label: '全球常模', data: popNorm, borderColor: 'rgba(250, 204, 21, 0.3)', borderWidth: 1, borderDash: [2, 2], pointRadius: 0}
            ]
        },
        options: { scales: { r: { suggestedMin: 0, suggestedMax: 100, grid: { color: '#1e293b' }, angleLines: { color: '#1e293b' }, ticks: { display: false }, pointLabels: { color: '#cbd5e1', font: { weight: 'bold' } } } }, plugins: { legend: { display: false }, datalabels: { display: false } }, maintainAspectRatio: false }
    });

    const ctxPie = document.getElementById('avgPieChart').getContext('2d');
    new Chart(ctxPie, {
        type: 'pie',
        data: {
            labels: [...top5, '其他'],
            datasets: [{ data: [...top5.map(k => avgProbs[k]), otherP], backgroundColor: ['#38bdf8', '#0284c7', '#2563eb', '#1e40af', '#1e3a8a', '#162032'], borderColor: '#111827', borderWidth: 2 }]
        },
        options: { maintainAspectRatio: false, layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } }, plugins: { legend: { display: false }, datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 11 }, align: 'end', anchor: 'end', formatter: (v, ctx) => Math.round(v) > 2 ? `${ctx.chart.data.labels[ctx.dataIndex]}\n${Math.round(v)}%` : null, textAlign: 'center' } } }
    });
}

function handleLogout() {
    localStorage.removeItem('mbti_jwt_token');
    localStorage.removeItem('mbti_user_id');
    localStorage.removeItem('mbti_v1_final');
    localStorage.removeItem('mbti_guest_id'); 
    window.location.href = 'index.html';
}

async function handleDeleteAccount() {
    const confirmDelete = confirm("⚠️ 警告：這將永久刪除您的帳號與所有測驗歷史。此操作不可逆。確定執行嗎？");
    if (!confirmDelete) return;

    const token = localStorage.getItem('mbti_jwt_token');
    try {
        const response = await fetch(`${API_BASE}/user/account`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert("✅ 您的神經連結檔案已從系統中永久銷毀。");
            handleLogout();
        } else {
            throw new Error("銷毀失敗，請稍後再試。");
        }
    } catch (error) {
        alert(error.message);
    }
}