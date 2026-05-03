// public/share-card.js
// 結果頁產生 1200×630 OG 分享卡（純 SVG → 下載 PNG）
// 入口：window.generateShareCard()
(function () {
    'use strict';

    const W = 1200, H = 630;

    function escapeXml(s) {
        return String(s).replace(/[<>&"']/g, ch => (
            { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]
        ));
    }

    function buildBeebeMini(primary, normalized, x0, y0) {
        if (typeof ENGINE === 'undefined' || !ENGINE.stacks || !ENGINE.antagonist) return '';
        const stack = ENGINE.stacks[primary];
        if (!stack) return '';
        const ant = ENGINE.antagonist;
        const order = [stack[0], stack[1], stack[2], stack[3], ant[stack[0]], ant[stack[1]], ant[stack[2]], ant[stack[3]]];
        const ROW_H = 26, GAP = 6, BAR_W = 320;
        return order.map((fn, i) => {
            const v = Math.max(0, Math.min(100, Math.round(normalized[fn] || 0)));
            const y = y0 + i * (ROW_H + GAP);
            const isShadow = i >= 4;
            const fill = isShadow ? '#ef4444' : '#38bdf8';
            const opacity = isShadow ? 0.65 : 0.85;
            const labelFill = isShadow ? '#fca5a5' : '#bae6fd';
            return `<rect x="${x0 + 36}" y="${y}" width="${BAR_W}" height="${ROW_H}" rx="4" fill="#1e293b"/>
                <rect x="${x0 + 36}" y="${y}" width="${(BAR_W * v) / 100}" height="${ROW_H}" rx="4" fill="${fill}" opacity="${opacity}"/>
                <text x="${x0 + 28}" y="${y + ROW_H / 2 + 5}" text-anchor="end" font-size="14" font-weight="700" fill="${labelFill}">${escapeXml(fn)}</text>
                <text x="${x0 + 36 + BAR_W + 8}" y="${y + ROW_H / 2 + 5}" font-size="13" font-weight="600" fill="#94a3b8">${v}%</text>`;
        }).join('');
    }

    function buildSvg(primary, normalized, prob, taglines) {
        const beebe = buildBeebeMini(primary, normalized, 60, 200);
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#0b1120"/>
                    <stop offset="100%" stop-color="#162032"/>
                </linearGradient>
                <radialGradient id="glow" cx="80%" cy="30%" r="55%">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <rect width="${W}" height="${H}" fill="url(#bg)"/>
            <rect width="${W}" height="${H}" fill="url(#glow)"/>
            <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="20" ry="20" fill="none" stroke="#1e293b" stroke-width="1"/>

            <text x="60" y="80" font-size="22" font-weight="800" fill="#38bdf8" letter-spacing="4">COGNITIVE GEOMETRY · V1</text>
            <text x="60" y="120" font-size="16" fill="#94a3b8">mbti.chiyigo.com · 認知幾何模型</text>

            <text x="60" y="200" font-size="22" fill="#94a3b8" letter-spacing="3">YOUR TYPE</text>
            <text x="60" y="290" font-size="120" font-weight="900" fill="#38bdf8" letter-spacing="6">${escapeXml(primary)}</text>
            ${prob ? `<text x="60" y="335" font-size="20" fill="#bae6fd">雲端判定機率：${prob}%</text>` : ''}

            <g transform="translate(640, 140)">
                <text x="0" y="0" font-size="18" fill="#bae6fd" letter-spacing="3" font-weight="800">🧱 BEEBE 八功能堆疊</text>
                ${buildBeebeMini(primary, normalized, 0, 30)}
            </g>

            ${(taglines || []).slice(0, 3).map((t, i) =>
                `<text x="60" y="${430 + i * 40}" font-size="22" fill="#cbd5e1">▸ ${escapeXml(t)}</text>`
            ).join('')}

            <text x="${W - 60}" y="${H - 40}" text-anchor="end" font-size="14" fill="#475569">© chiyigo · ${new Date().getFullYear()}</text>
        </svg>`;
    }

    function svgToPngBlob(svgString) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = W; canvas.height = H;
                canvas.getContext('2d').drawImage(img, 0, 0, W, H);
                URL.revokeObjectURL(url);
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('svg img load failed')); };
            img.src = url;
        });
    }

    const _T = (k, vars, fb) => (typeof window.t === 'function' ? window.t(k, vars, fb) : fb);
    window.generateShareCard = async function () {
        try {
            const typeEl = document.getElementById('mbti-type');
            const primary = typeEl ? typeEl.innerText.trim() : '';
            if (!primary || primary === '--' || typeof ENGINE === 'undefined') {
                (window.toast || alert)(_T('result.msg.notReady', null, '結果尚未準備好，無法產生分享卡。'), { type: 'warn' });
                return;
            }

            // 八維百分比：優先讀 window.appScores（script.js 改 var 後可見），
            // fallback 抓結果頁分數表格的 td
            const norm = {};
            const dimKeys = ENGINE.dimKeys;
            if (typeof window.appScores === 'object' && window.appScores) {
                dimKeys.forEach(k => {
                    const v = window.appScores[k];
                    norm[k] = Math.max(0, Math.min(100, Math.round(((v + 15) / 45) * 100)));
                });
            } else {
                const tdEls = document.querySelectorAll('#score-table-container td');
                if (tdEls.length === dimKeys.length) {
                    tdEls.forEach((td, i) => { norm[dimKeys[i]] = parseInt(td.innerText, 10) || 0; });
                } else {
                    (window.toast || alert)(_T('result.msg.notRendered', null, '結果尚未渲染完成，請稍候再試。'), { type: 'warn' });
                    return;
                }
            }

            const probMatch = (document.getElementById('spectrum-subtitle')?.innerText || '').match(/(\d+)%/);
            const prob = probMatch ? probMatch[1] : '';

            const reports = window.ENGloc ? window.ENGloc('reports') : (ENGINE.reports || {});
            const tag = reports[primary] || null;
            const taglines = tag ? [
                tag.b ? tag.b.split('。')[0] + '。' : '',
                tag.e ? tag.e.split('。')[0] + '。' : '',
                tag.g ? tag.g.split('。')[0] + '。' : ''
            ].filter(Boolean) : [];

            const svg = buildSvg(primary, norm, prob, taglines);

            if (window.track) window.track('share_card_generate', { type: primary, prob: prob || '' });
            (window.toast || alert)(_T('result.msg.generating', null, '正在產生分享卡…'), { type: 'info', duration: 1200 });
            const pngBlob = await svgToPngBlob(svg);
            const url = URL.createObjectURL(pngBlob);

            // 嘗試 Web Share API（手機）
            const file = new File([pngBlob], `mbti-${primary}-share.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: `我的認知幾何結果：${primary}`, text: '來自 mbti.chiyigo.com' });
                    URL.revokeObjectURL(url);
                    return;
                } catch (_) { /* 使用者取消就退回下載 */ }
            }

            // 桌機 / 不支援 Web Share：直接下載
            const a = document.createElement('a');
            a.href = url;
            a.download = `mbti-${primary}-share.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            (window.toast || alert)(_T('result.msg.shareDownloaded', null, '分享卡已下載 ✓'), { type: 'success' });
        } catch (e) {
            console.error(e);
            (window.toast || alert)(_T('result.msg.shareFailed', { msg: e.message || String(e) }, '產生分享卡失敗：' + (e.message || e)), { type: 'error' });
        }
    };
})();
