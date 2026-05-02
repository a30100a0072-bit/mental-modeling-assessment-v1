// public/landing-progress.js
// =====================================================
// 首頁卡片進度回填：登入者拉 /api/v1/user/history，
// 標記每個 Phase 的最近一次結果（type + 時間），未登入則隱藏狀態列。
// 不持有任何會員資料；單純讀取使用者自己的歷史。
// =====================================================
(function () {
    'use strict';

    const VERSIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

    function fmtDate(ts) {
        try {
            const d = new Date(ts);
            const now = Date.now();
            const diff = (now - d.getTime()) / 1000;
            if (diff < 60) return '剛剛';
            if (diff < 3600) return `${Math.round(diff / 60)} 分鐘前`;
            if (diff < 86400) return `${Math.round(diff / 3600)} 小時前`;
            if (diff < 86400 * 30) return `${Math.round(diff / 86400)} 天前`;
            return d.toLocaleDateString('zh-TW');
        } catch (_) { return ''; }
    }

    function applyStatus(version, latest) {
        const card = document.querySelector(`.v-card[data-version="${version}"]`);
        const slot = document.querySelector(`[data-version-status="${version}"]`);
        if (!card || !slot) return;
        if (!latest) { slot.innerHTML = ''; slot.classList.remove('is-done'); return; }
        const t = latest.primary_type || '?';
        const when = fmtDate(latest.timestamp);
        slot.dataset.filled = '1';
        slot.classList.add('is-done');
        slot.innerHTML =
            `<div class="v-status-row">
                <span class="v-status-label">上次結果 · ${when}</span>
                <span class="v-status-type">${t}</span>
            </div>`;
        card.classList.add('is-completed');
    }

    function showSkeleton() {
        VERSIONS.forEach(v => {
            const slot = document.querySelector(`[data-version-status="${v}"]`);
            if (slot && !slot.dataset.filled) {
                slot.innerHTML =
                    `<div class="v-status-row">
                        <span class="skeleton skel-line skel-line--sm" style="width:55%; height:10px;"></span>
                        <span class="skeleton skel-line skel-line--sm" style="width:25%; height:10px;"></span>
                    </div>`;
            }
        });
    }
    function clearSkeleton() {
        VERSIONS.forEach(v => {
            const slot = document.querySelector(`[data-version-status="${v}"]`);
            if (slot && !slot.dataset.filled) slot.innerHTML = '';
        });
    }

    async function backfill() {
        const token = sessionStorage.getItem('chiyigo_access_token');
        if (!token || typeof chiyigoFetch !== 'function') return;
        showSkeleton();
        try {
            const r = await chiyigoFetch('/api/v1/user/history', { method: 'GET' });
            if (!r.ok) return;
            const j = await r.json();
            const records = (j && j.data) || [];
            const latestByVer = {};
            records.forEach(rec => {
                const v = (rec.assessment_version || rec.version || '').toUpperCase();
                if (!VERSIONS.includes(v)) return;
                const cur = latestByVer[v];
                if (!cur || new Date(rec.timestamp) > new Date(cur.timestamp)) latestByVer[v] = rec;
            });
            VERSIONS.forEach(v => applyStatus(v, latestByVer[v] || null));
            clearSkeleton();
        } catch (_) { clearSkeleton(); /* silent — 回填失敗不影響首頁可用性 */ }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', backfill);
    } else {
        backfill();
    }
    // 跨子網域 silent login 完成時，chiyigo-auth.js 可能晚於 DOMContentLoaded 才寫入 token，再嘗試一次
    setTimeout(backfill, 1500);
})();
