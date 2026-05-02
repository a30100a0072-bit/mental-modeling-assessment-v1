// public/theme-toggle.js
// Light / Dark mode 切換。優先序：
//   1. localStorage["mbti_theme"]（使用者明確選擇）
//   2. prefers-color-scheme 系統設定
//   3. 預設 dark
// 在 <body> render 前最早注入屬性以避免閃白。
(function () {
    'use strict';
    const KEY = 'mbti_theme';

    function readPreferred() {
        try {
            const saved = localStorage.getItem(KEY);
            if (saved === 'light' || saved === 'dark') return saved;
        } catch (_) {}
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }

    function apply(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        // 更新 meta theme-color
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'light' ? '#f1f5f9' : '#0b1120');
        // 更新 toggle 按鈕的 icon / aria
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.textContent = theme === 'light' ? '🌙' : '☀️';
            btn.setAttribute('aria-label', theme === 'light' ? '切換到深色模式' : '切換到淺色模式');
            btn.setAttribute('title', theme === 'light' ? '切換到深色模式' : '切換到淺色模式');
        });
    }

    // ASAP：避免 FOUC 閃白
    apply(readPreferred());

    function toggle() {
        const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        try { localStorage.setItem(KEY, next); } catch (_) {}
        apply(next);
    }

    // 跟隨系統設定變化（除非使用者已手動指定）
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', (e) => {
            try { if (localStorage.getItem(KEY)) return; } catch (_) {}
            apply(e.matches ? 'light' : 'dark');
        });
    }

    function injectToggle() {
        const headerActions = document.querySelector('.landing-header .header-actions');
        if (!headerActions) return;
        if (headerActions.querySelector('.theme-toggle')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-toggle';
        btn.onclick = toggle;
        // 插在 hamburger 前
        const hamburger = headerActions.querySelector('.hamburger');
        if (hamburger) headerActions.insertBefore(btn, hamburger);
        else headerActions.appendChild(btn);
        apply(readPreferred()); // 套用 icon / aria
    }

    // 暴露給其他 script 用
    window.toggleTheme = toggle;
    window.applyTheme = apply;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectToggle);
    } else {
        injectToggle();
    }
})();
