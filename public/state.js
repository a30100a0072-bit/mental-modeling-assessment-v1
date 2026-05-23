// public/state.js
// =====================================================
// 測驗流程跨檔共用 state 的單一 source of truth。
// 載入順序：必須在 api.js / script.js / quiz-ux.js / share-card.js / result-render.js 之前。
// 任何「跨檔讀寫的測驗 state」都集中在 window.MM；只暴露給 onclick / inline 的函式
// (handleRankingClick / resetRanking / injectGodMode) 仍掛 window 不放進 MM。
//
// 為何 mutate 而非 reassign：scores / state / backend 等物件被多檔以 reference 共享，
// 直接 `MM.scores = {...}` 會切斷 reference 讓其他檔讀到舊物件，必須 `Object.assign(MM.scores, ...)`。
// =====================================================
;(function () {
    'use strict';

    if (window.MM) return; // 避免重複載入時覆蓋進行中的 state

    window.MM = {
        // 測驗答題進度與答案；script.js initStorage 從 localStorage 還原會 mutate 進來
        state: { phase: 1, answers: {}, dynamicRoute: null },

        // 八維累積分數；preCalculatePhase1To4 / injectGodMode 會 mutate
        scores: { Ti: 0, Te: 0, Fi: 0, Fe: 0, Ni: 0, Ne: 0, Si: 0, Se: 0 },

        // 測驗版本（'A'..'F'），由 script.js 從 URL ?v= 解析後寫入
        version: null,

        // 測驗開始時間（ms timestamp），用於計算 timeSpentMs 與 quiz-ux 預估 ETA
        startTime: Date.now(),

        // worker 回傳的最終結果
        backend: { probs: {}, sorted: [], primaryType: null },

        // 流程旗標
        flags: { sharedView: false, godMode: false, trifurcationWarning: false },

        // Chart.js instance refs（destroy 前要拿來 .destroy()）
        charts: { radar: null, pie: null },

        // D/E/F 卷 ranking 題暫存（key = q_3_rank_N, value = [optIdx]）
        rankingStates: {},

        // A/B/C 卷 phase 5 探針題列表
        activeProbe: null,

        // 最近一次提交時答了幾題（GA payload 用）
        lastQuestionsAnswered: null
    };
})();
