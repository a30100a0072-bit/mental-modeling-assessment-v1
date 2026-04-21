-- [認知幾何 V1 - D1 Schema 初始化]

-- 1. 評測報告主表 (支援 A/B/C 三版本獨立評測)
CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    assessment_version TEXT NOT NULL, -- 'A'-日常, 'B'-壓力, 'C'-成長
    raw_responses TEXT NOT NULL,      -- JSON 格式：存儲用戶原始選項
    calculated_scores TEXT NOT NULL,  -- JSON 格式：存儲演算法運算後的各維度 Z-score
    mbti_result TEXT,                 -- 最終判定的 MBTI 類型 (可選)
    enneagram_result TEXT,            -- 最終判定的九型人格 (可選)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 題目權重與矩陣表 (對接 Algorithm Step 1: 目標維度加分，對立維度扣分)
CREATE TABLE IF NOT EXISTS question_matrix (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_version TEXT NOT NULL,
    question_text TEXT NOT NULL,
    dimension TEXT NOT NULL,          -- 目標維度，例如 'E', 'I', 'S', 'N' 等
    weight REAL DEFAULT 1.0,          -- 基礎權重
    is_reverse_scoring INTEGER DEFAULT 0 -- 1 表示觸發榮格對立維度扣一半分邏輯
);

-- 3. 系統全局配置與冷啟動參數 (對接 Algorithm Step 5: Softmax 固定 tau)
CREATE TABLE IF NOT EXISTS system_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- [修正] 預設插入藍圖參數：對齊後端演算法的 0.3
INSERT OR IGNORE INTO system_config (config_key, config_value) VALUES ('SOFTMAX_TAU', '0.3');