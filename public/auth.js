let currentMode = 'login';
const API_BASE = "/api/v1";

let turnstileToken = '';
function onTurnstileSuccess(token) { turnstileToken = token; }
function onTurnstileExpired() { turnstileToken = ''; }
function onTurnstileError() { turnstileToken = ''; }
function resetTurnstile() {
    turnstileToken = '';
    if (window.turnstile) turnstile.reset();
}

// 檢查是否已經登入，若已登入則直接跳轉儀表板
window.onload = () => {
    if (localStorage.getItem('mbti_jwt_token')) {
        window.location.href = 'dashboard.html';
    }
    // 初始化 UI 狀態
    switchTab('login');
};

function switchTab(mode) {
    currentMode = mode;
    const msgBox = document.getElementById('auth-msg');
    msgBox.innerText = '';

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabsContainer = document.getElementById('auth-tabs-container');
    const btnSendCode = document.getElementById('send-code-btn');
    const grpVerify = document.getElementById('verify-group');
    const grpPassword = document.getElementById('password-group');
    const linkForgot = document.getElementById('forgot-link');
    const btnSubmit = document.getElementById('submit-btn');
    const backToLogin = document.getElementById('back-to-login');

    // 重置全部 UI
    tabLogin.classList.remove('active');
    tabRegister.classList.remove('active');
    tabsContainer.style.display = 'flex';
    btnSendCode.style.display = 'none';
    grpVerify.style.display = 'none';
    grpPassword.style.display = 'block';
    linkForgot.style.display = 'none';
    backToLogin.style.display = 'none';

    if (mode === 'login') {
        tabLogin.classList.add('active');
        linkForgot.style.display = 'inline-block';
        btnSubmit.innerText = '啟動神經連結 (登入)';
    } else if (mode === 'register') {
        tabRegister.classList.add('active');
        btnSendCode.style.display = 'block';
        grpVerify.style.display = 'block'; // 顯示驗證碼輸入框
        btnSubmit.innerText = '註冊並建立檔案';
    } else if (mode === 'forgot') {
        tabsContainer.style.display = 'none'; // 隱藏頁籤
        grpPassword.style.display = 'none'; // 隱藏密碼框
        btnSubmit.innerText = '發送重設密碼連結';
        backToLogin.style.display = 'block';
    }
}

// 發送註冊驗證碼邏輯
async function sendVerificationCode() {
    const email = document.getElementById('email').value;
    const msgBox = document.getElementById('auth-msg');
    const btnSendCode = document.getElementById('send-code-btn');

    if (!email || !email.includes('@')) {
        msgBox.style.color = "#ef4444";
        msgBox.innerText = "⚠️ 請先輸入有效的 Email 才能寄送驗證碼。";
        return;
    }
    if (!turnstileToken) {
        msgBox.style.color = "#ef4444";
        msgBox.innerText = "⚠️ 請等待人機驗證完成後再試。";
        return;
    }

    btnSendCode.disabled = true;
    btnSendCode.innerText = "發送中...";
    msgBox.innerText = "";

    const tsToken = turnstileToken;
    resetTurnstile();

    try {
        const response = await fetch(`${API_BASE}/auth/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, turnstileToken: tsToken })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "發送失敗");

        msgBox.style.color = "#10b981";
        msgBox.innerText = "✅ 驗證碼已發送至信箱，15分鐘內有效。";
        
        // 按鈕倒數冷卻
        let countdown = 60;
        const timer = setInterval(() => {
            countdown--;
            btnSendCode.innerText = `${countdown}s 後重試`;
            if (countdown <= 0) {
                clearInterval(timer);
                btnSendCode.disabled = false;
                btnSendCode.innerText = "取得驗證碼";
            }
        }, 1000);

    } catch (error) {
        btnSendCode.disabled = false;
        btnSendCode.innerText = "取得驗證碼";
        msgBox.style.color = "#ef4444";
        msgBox.innerText = `❌ ${error.message}`;
    }
}

// 統整登入、註冊、忘記密碼的三合一邏輯
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password') ? document.getElementById('password').value : '';
    const verificationCode = document.getElementById('verificationCode') ? document.getElementById('verificationCode').value : '';
    const msgBox = document.getElementById('auth-msg');
    const btn = document.getElementById('submit-btn');

    // 基礎防呆
    if (!email) {
        msgBox.style.color = "#ef4444";
        msgBox.innerText = "⚠️ 格式錯誤：Email 為必填。";
        return;
    }
    if (currentMode !== 'forgot' && password.length < 8) {
        msgBox.style.color = "#ef4444";
        msgBox.innerText = "⚠️ 格式錯誤：密碼至少 8 碼。";
        return;
    }
    if (currentMode === 'register' && !verificationCode) {
        msgBox.style.color = "#ef4444";
        msgBox.innerText = "⚠️ 請輸入信箱收到的 6 位數驗證碼。";
        return;
    }
    if (!turnstileToken) {
        msgBox.style.color = "#ef4444";
        msgBox.innerText = "⚠️ 請等待人機驗證完成後再試。";
        return;
    }

    let guestReportId = null;
    if (currentMode === 'register') {
        guestReportId = localStorage.getItem('mbti_guest_report_id') || null;
    }

    btn.disabled = true;
    btn.innerText = "處理中...";
    msgBox.innerText = "";

    const tsToken = turnstileToken;
    resetTurnstile();

    try {
        let endpoint = '';
        let payload = { email, turnstileToken: tsToken };

        // 依照不同模式決定打哪支 API 與帶什麼資料
        if (currentMode === 'login') {
            endpoint = '/auth/login';
            payload.password = password;
        } else if (currentMode === 'register') {
            endpoint = '/auth/register';
            payload.password = password;
            payload.verificationCode = verificationCode;
            payload.guestReportId = guestReportId;
        } else if (currentMode === 'forgot') {
            endpoint = '/auth/forgot-password';
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "連線異常");
        }

        // 忘記密碼特別處理 (不跳轉，只顯示成功)
        if (currentMode === 'forgot') {
            msgBox.style.color = "#10b981";
            msgBox.innerText = "✅ 若信箱存在，密碼重設連結已發送。";
            btn.disabled = false;
            btn.innerText = "發送重設密碼連結";
            return;
        }

        // 登入/註冊成功，儲存 JWT Token
        localStorage.setItem('mbti_jwt_token', data.token);
        localStorage.setItem('mbti_user_id', data.userId);
        
        // [修正] 清除遊客所有快取，防止狀態殘留與污染
        localStorage.removeItem('mbti_guest_report_id');
        localStorage.removeItem('mbti_guest_id');
        
        msgBox.style.color = "#6ee7b7";
        msgBox.innerText = "✅ 驗證成功，正在載入核心模組...";
        
        // 成功後帶往儀表板
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        msgBox.style.color = "#ef4444";
        msgBox.innerText = `❌ ${error.message}`;
        btn.disabled = false;
        resetTurnstile();

        if (currentMode === 'login') btn.innerText = '啟動神經連結 (登入)';
        else if (currentMode === 'register') btn.innerText = '註冊並建立檔案';
        else btn.innerText = '發送重設密碼連結';
    }
}