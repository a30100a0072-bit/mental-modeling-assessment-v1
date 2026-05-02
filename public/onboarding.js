// public/onboarding.js
// 首次到訪 3 步驟說明（dismiss 後寫 localStorage 不再出現）
// 觸發：landing-body 上有 #hero-section 時 / 沒有 mbti_onboarded_v1 旗標
(function () {
    'use strict';

    const FLAG_KEY = 'mbti_onboarded_v1';

    const STEPS = [
        {
            icon: '🧠',
            title: '測什麼？',
            body: '不是只測 MBTI 4 字母，而是測你的<b>認知幾何</b>：日常舒適圈、高壓防禦、覺醒願景三種狀態下的八維能量分布。'
        },
        {
            icon: '⚡',
            title: '怎麼測？',
            body: '選一個模組（每組約 8–12 分鐘）。題目用<b>李克特量表 / 迫選 / 情境判斷 / 排序</b>四種混合，避免你只挑「想被看見的版本」。'
        },
        {
            icon: '🧬',
            title: '結果長什麼樣？',
            body: '雷達 + Beebe 八功能堆疊 + 16 人格機率分布。登入後會把你每次測的結果記錄成<b>心智演化軌跡</b>。'
        }
    ];

    function dismiss(panel) {
        panel.classList.add('is-out');
        setTimeout(() => panel.remove(), 300);
        try { localStorage.setItem(FLAG_KEY, String(Date.now())); } catch (_) {}
    }

    function render(initialIdx) {
        const panel = document.createElement('div');
        panel.className = 'onb-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'onb-title');

        let idx = initialIdx || 0;

        function paint() {
            const s = STEPS[idx];
            const isLast = idx === STEPS.length - 1;
            panel.innerHTML =
                `<div class="onb-card">
                    <button class="onb-skip" type="button" aria-label="略過介紹">略過</button>
                    <div class="onb-icon" aria-hidden="true">${s.icon}</div>
                    <h2 id="onb-title" class="onb-title">${s.title}</h2>
                    <p class="onb-body">${s.body}</p>
                    <div class="onb-dots" role="tablist">
                        ${STEPS.map((_, i) =>
                            `<span class="onb-dot${i === idx ? ' is-active' : ''}" data-i="${i}" role="tab" aria-selected="${i === idx}"></span>`
                        ).join('')}
                    </div>
                    <div class="onb-actions">
                        ${idx > 0 ? '<button class="btn-outline onb-back" type="button">上一步</button>' : '<span></span>'}
                        <button class="btn-primary onb-next" type="button">${isLast ? '開始測驗 ▶' : '下一步'}</button>
                    </div>
                </div>`;

            panel.querySelector('.onb-skip').onclick = () => dismiss(panel);
            const back = panel.querySelector('.onb-back');
            if (back) back.onclick = () => { idx--; paint(); };
            panel.querySelector('.onb-next').onclick = () => {
                if (isLast) {
                    dismiss(panel);
                    // 首測直接帶到 Phase B（hero 主 CTA）
                    setTimeout(() => { window.location.href = 'assessment.html?v=B&new=1'; }, 200);
                } else {
                    idx++; paint();
                }
            };
            panel.querySelectorAll('.onb-dot').forEach(d => {
                d.onclick = () => { idx = parseInt(d.dataset.i, 10); paint(); };
            });
        }

        paint();
        document.body.appendChild(panel);
        requestAnimationFrame(() => panel.classList.add('is-in'));

        // ESC 關閉
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape' && document.body.contains(panel)) {
                document.removeEventListener('keydown', esc);
                dismiss(panel);
            }
        });
    }

    function maybeShow() {
        // 只在 landing 頁觸發
        if (!document.querySelector('.hero-section')) return;
        try { if (localStorage.getItem(FLAG_KEY)) return; } catch (_) {}
        render(0);
    }

    // 暴露給設定頁 / debug 用
    window.openOnboarding = function () { render(0); };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(maybeShow, 600));
    } else {
        setTimeout(maybeShow, 600);
    }
})();
