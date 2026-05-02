// public/beebe-stack.js
// =====================================================
// 結果頁 Beebe 八功能堆疊 SVG（無依賴）。
// 使用方式：renderBeebeStack(primary, normalized)
//   primary    : 'INTJ' 等 4 字元 type
//   normalized : { Ti: 0..100, Te:..., ... } 八維百分比
// 會渲染至 #beebe-stack-container。
// =====================================================
(function () {
    'use strict';

    const POSITIONS = [
        { key: 'hero',      zh: '英雄 (Hero)',          en: 'Dominant',     side: 'conscious' },
        { key: 'parent',    zh: '父母 (Parent)',        en: 'Auxiliary',    side: 'conscious' },
        { key: 'child',     zh: '永恆少年 (Child)',     en: 'Tertiary',     side: 'conscious' },
        { key: 'inferior',  zh: '劣勢 (Inferior/Anima)', en: 'Inferior',    side: 'conscious' },
        { key: 'opposing',  zh: '對立 (Opposing)',      en: 'Opposing',     side: 'shadow' },
        { key: 'critical',  zh: '老人 (Senex/Critical)', en: 'Critical',    side: 'shadow' },
        { key: 'trickster', zh: '欺詐 (Trickster)',     en: 'Trickster',    side: 'shadow' },
        { key: 'demon',     zh: '惡魔 (Demon)',         en: 'Demonic',      side: 'shadow' }
    ];

    function buildOrder(primary) {
        if (typeof ENGINE === 'undefined' || !ENGINE.stacks || !ENGINE.antagonist) return null;
        const stack = ENGINE.stacks[primary];
        if (!stack) return null;
        const ant = ENGINE.antagonist;
        return [
            stack[0], stack[1], stack[2], stack[3],
            ant[stack[0]], ant[stack[1]], ant[stack[2]], ant[stack[3]]
        ];
    }

    window.renderBeebeStack = function (primary, normalized) {
        const host = document.getElementById('beebe-stack-container');
        if (!host) return;
        const order = buildOrder(primary);
        if (!order) { host.innerHTML = '<p class="beebe-fallback">無法解析認知堆疊。</p>'; return; }

        const W = 560, ROW_H = 38, GAP = 8, PAD_L = 132, PAD_R = 56, BAR_MAX = W - PAD_L - PAD_R;
        const H = POSITIONS.length * (ROW_H + GAP) + 12;

        const rows = POSITIONS.map((pos, i) => {
            const fn = order[i];
            const v = Math.max(0, Math.min(100, Math.round(normalized[fn] || 0)));
            const y = 6 + i * (ROW_H + GAP);
            const barW = (BAR_MAX * v) / 100;
            const isShadow = pos.side === 'shadow';
            const barClass = isShadow ? 'beebe-bar-shadow' : 'beebe-bar-conscious';
            const fnClass = isShadow ? 'beebe-fn-shadow' : 'beebe-fn-conscious';
            return `
                <g class="beebe-row" data-pos="${pos.key}">
                    <text x="${PAD_L - 12}" y="${y + ROW_H / 2 + 4}" class="beebe-pos-label" text-anchor="end">${pos.zh}</text>
                    <rect x="${PAD_L}" y="${y}" width="${BAR_MAX}" height="${ROW_H}" rx="6" class="beebe-track"/>
                    <rect x="${PAD_L}" y="${y}" width="${barW}" height="${ROW_H}" rx="6" class="${barClass}">
                        <title>${pos.zh} · ${fn} · ${v}%</title>
                    </rect>
                    <text x="${PAD_L + 10}" y="${y + ROW_H / 2 + 5}" class="${fnClass}">${fn}</text>
                    <text x="${W - PAD_R + 8}" y="${y + ROW_H / 2 + 5}" class="beebe-val">${v}%</text>
                </g>`;
        }).join('');

        host.innerHTML =
            `<svg viewBox="0 0 ${W} ${H}" class="beebe-stack-svg" role="img" aria-label="Beebe 八功能堆疊圖">${rows}</svg>`;
    };
})();
