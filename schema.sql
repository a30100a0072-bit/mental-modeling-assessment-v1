-- 1. 先摧毀舊有結構 (確保 V1 環境純淨，無舊欄位干擾)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS personality_profiles;
DROP TABLE IF EXISTS security_logs;

-- 2. 建立 V1 全新表格
-- 表格：使用者帳號
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 表格：測驗紀錄 (儲存原始分數、演算法結果、精神能量與時間變數)
CREATE TABLE assessments (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- 登入者 ID。若為 NULL 則是訪客
    guest_id TEXT, -- 訪客追蹤碼 (LocalStorage 暫存綁定用)
    assessment_version TEXT DEFAULT 'B', -- 測驗版本 (A/B/C/D/E/F)
    raw_scores TEXT NOT NULL, -- JSON 陣列: [Ni, Ne, Si, Se, Ti, Te, Fi, Fe]
    z_scores TEXT NOT NULL, -- JSON 陣列: 標準化分數
    result_distribution TEXT NOT NULL, -- JSON 物件: 16型 Softmax 機率分佈
    primary_type TEXT NOT NULL, -- 最高機率人格 (ex: INTJ)
    psychic_energy_index REAL DEFAULT 0.0, -- 精神能量指標
    time_spent_ms INTEGER NOT NULL, -- 總答題時間變數 (毫秒)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 表格：16 型理想人格向量特徵檔
CREATE TABLE personality_profiles (
    mbti_type TEXT PRIMARY KEY,
    ideal_vector TEXT NOT NULL -- JSON 陣列: 基準八維權重
);

-- 表格：安全防護日誌
CREATE TABLE security_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 建立索引加速高頻查詢
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_guest_id ON assessments(guest_id);
CREATE INDEX idx_security_logs_ip ON security_logs(ip_address);