// 輕量級 toast 通知，取代 native alert()
// 用法: window.toast('訊息') / window.toast('錯誤', { type: 'error' })
//      type: 'info' | 'success' | 'error' | 'warn'，預設 'info'
//      duration: 預設 3500ms，0 = 不自動關閉
(function () {
    let stack;
    function ensureStack() {
        if (stack) return stack;
        stack = document.createElement('div');
        stack.className = 'toast-stack';
        stack.setAttribute('role', 'status');
        stack.setAttribute('aria-live', 'polite');
        document.body.appendChild(stack);
        return stack;
    }

    window.toast = function (message, opts = {}) {
        const type = opts.type || 'info';
        const duration = opts.duration === undefined ? 3500 : opts.duration;
        const s = ensureStack();
        const el = document.createElement('div');
        el.className = `toast toast--${type}`;
        const icon = { info: 'ℹ️', success: '✅', error: '⚠️', warn: '⚡' }[type] || 'ℹ️';
        el.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg"></span>`;
        el.querySelector('.toast-msg').textContent = message;
        s.appendChild(el);
        // trigger entry animation
        requestAnimationFrame(() => el.classList.add('toast-in'));

        function dismiss() {
            el.classList.remove('toast-in');
            el.classList.add('toast-out');
            el.addEventListener('transitionend', () => el.remove(), { once: true });
        }
        el.addEventListener('click', dismiss);
        if (duration > 0) setTimeout(dismiss, duration);
        return dismiss;
    };
})();
