// public/beebe-model.js — beebe-model.html 頁面 explorer 互動邏輯
// 從原 inline <script>（CSP unsafe-inline 移除工程 Batch 1）抽出，邏輯未變動。
;(function () {
    'use strict';

    // 內嵌 Beebe 8 功能堆疊資料（不依賴 engine.js，避免 404 / SW cache 衝突）
    const BEEBE_STACKS = {
        INTJ: ["Ni","Te","Fi","Se"], ENTJ: ["Te","Ni","Se","Fi"], INTP: ["Ti","Ne","Si","Fe"], ENTP: ["Ne","Ti","Fe","Si"],
        INFJ: ["Ni","Fe","Ti","Se"], ENFJ: ["Fe","Ni","Se","Ti"], INFP: ["Fi","Ne","Si","Te"], ENFP: ["Ne","Fi","Te","Si"],
        ISTJ: ["Si","Te","Fi","Ne"], ESTJ: ["Te","Si","Ne","Fi"], ISFJ: ["Si","Fe","Ti","Ne"], ESFJ: ["Fe","Si","Ne","Ti"],
        ISTP: ["Ti","Se","Ni","Fe"], ESTP: ["Se","Ti","Fe","Ni"], ISFP: ["Fi","Se","Ni","Te"], ESFP: ["Se","Fi","Te","Ni"]
    };
    const ANTAGONIST = { Ti:"Fe", Fe:"Ti", Te:"Fi", Fi:"Te", Ni:"Se", Se:"Ni", Ne:"Si", Si:"Ne" };
    const FN_TIPS = {
        Ti: "底層邏輯 — 尋求完美自洽的內部模型",
        Te: "客觀秩序 — 強硬的行政推進與資源調度",
        Fi: "內在信仰 — 絕不妥協的個人價值",
        Fe: "群體共振 — 掌控環境情緒與人際網絡",
        Ni: "終局收斂 — 戰略推演與長遠趨勢預判",
        Ne: "發散擴張 — 跨界連結與顛覆既有概念",
        Si: "經驗守護 — 死守歷史參數與防禦機制",
        Se: "物理動態 — 即時適應並掌控物理環境"
    };
    const POSITIONS = [
        { idx: 1, key: "hero",      zh: "英雄 (Hero)",          side: "conscious", phrase: "「我最自然、最自信的能力。」", emoji: "🦸" },
        { idx: 2, key: "parent",    zh: "父母 (Parent)",        side: "conscious", phrase: "「我用這個工具照顧、教育別人。」", emoji: "🧑‍🍼" },
        { idx: 3, key: "child",     zh: "永恆兒童 (Child)",     side: "conscious", phrase: "「放鬆時我會用這個玩，但被批評會委屈。」", emoji: "🧒" },
        { idx: 4, key: "inferior",  zh: "劣勢 (Inferior)",      side: "conscious", phrase: "「我恐懼的、卻又渴望擁抱的特質。」", emoji: "🧚" },
        { idx: 5, key: "opposing",  zh: "對立 (Opposing)",      side: "shadow",    phrase: "「主導被擋住時，我會被動攻擊、固執反抗。」", emoji: "🛡️" },
        { idx: 6, key: "senex",     zh: "嚴厲老人 (Senex)",     side: "shadow",    phrase: "「壓力下，我變成尖酸的審判官。」", emoji: "🧙" },
        { idx: 7, key: "trickster", zh: "欺詐者 (Trickster)",   side: "shadow",    phrase: "「我的盲點、雙重標準、惡搞混亂。」", emoji: "🃏" },
        { idx: 8, key: "demon",     zh: "惡魔 (Demon)",         side: "shadow",    phrase: "「全面崩潰時，玉石俱焚的毀滅力。」", emoji: "👹" }
    ];

    function renderExplorer(type) {
        const stack = BEEBE_STACKS[type];
        if (!stack) return;
        const order = [
            stack[0], stack[1], stack[2], stack[3],
            ANTAGONIST[stack[0]], ANTAGONIST[stack[1]], ANTAGONIST[stack[2]], ANTAGONIST[stack[3]]
        ];
        const grid = document.getElementById("explorer-grid");
        grid.innerHTML = POSITIONS.map((pos, i) => {
            const fn = order[i];
            const pairIdx = i < 4 ? i + 4 : i - 4;
            return `
                <div class="exp-card exp-card--${pos.side}" data-idx="${i}" data-pair="${pairIdx}" tabindex="0" role="button" aria-label="${pos.zh} ${fn}">
                    <div class="exp-num">${pos.idx}</div>
                    <div class="exp-side-tag">${pos.side === 'conscious' ? '☀️ 意識' : '🌑 陰影'}</div>
                    <div class="exp-pos">${pos.emoji} ${pos.zh}</div>
                    <div class="exp-fn">${fn}</div>
                    <div class="exp-tip">${FN_TIPS[fn] || ''}</div>
                    <div class="exp-phrase">${pos.phrase}</div>
                </div>
            `;
        }).join("");

        // 點擊 / hover：highlight 軸線伴侶
        grid.querySelectorAll(".exp-card").forEach(card => {
            const activate = () => {
                grid.querySelectorAll(".exp-card").forEach(c => c.classList.remove("is-pair", "is-self"));
                card.classList.add("is-self");
                const pairIdx = card.dataset.pair;
                const pair = grid.querySelector(`.exp-card[data-idx="${pairIdx}"]`);
                if (pair) pair.classList.add("is-pair");
                const a = card.querySelector(".exp-fn").textContent;
                const b = pair ? pair.querySelector(".exp-fn").textContent : "";
                document.getElementById("explorer-axis-hint").textContent = `軸線：${a} ↔ ${b}（同一條神經迴路的正反面）`;
            };
            card.addEventListener("click", activate);
            card.addEventListener("mouseenter", activate);
            card.addEventListener("focus", activate);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const sel = document.getElementById("explorer-type");
        if (sel) {
            sel.addEventListener("change", (e) => {
                renderExplorer(e.target.value);
                if (window.track) window.track('beebe_explorer_select', { type: e.target.value });
            });
            renderExplorer(sel.value);
        }
    });
})();
