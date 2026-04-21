-- [認知幾何 V1 - 帳號與安全系統]

-- 建立使用者核心表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立 IP 註冊限制表 (防惡意註冊)
CREATE TABLE IF NOT EXISTS security_logs (
    ip_address TEXT,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 為了加速登入查詢建立索引
CREATE INDEX idx_users_email ON users(email);