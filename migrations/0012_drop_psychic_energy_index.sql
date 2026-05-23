-- [認知幾何 V1 - 移除 psychic_energy_index 死欄位]
--
-- 背景：psychic_energy_index = scoreVariance × 100000 / timeSpentMs 是當初設計
-- 的「精神能量」噱頭指標，從未在任何前端 UI 暴露（grep public/ 0 處讀取）。
-- 2026-05-23 backlog 確認可全砍：assessment.ts 不再算、src/index.ts INSERT 不再寫，
-- 本 migration 把 column 從 D1 schema 拿掉。
--
-- 部署順序（zero-downtime 兩階段，遵守 CLAUDE.md §資料庫要求）：
--   1) 先 deploy worker (commit 內含 src/index.ts INSERT 拿掉欄位)
--      → prod INSERT 走 column DEFAULT 0.0、舊行不動
--   2) 確認 prod 一段時間無 5xx 後，再 apply 本 migration：
--      npx wrangler d1 migrations apply mm_assessment_db --remote
--   反序套用會讓 worker INSERT 用到不存在的欄位 → 50x。
--
-- SQLite ALTER TABLE 不支援 DROP COLUMN，沿用 0008 的 rebuild pattern：
--   CREATE NEW (不含 psychic_energy_index) → INSERT SELECT → DROP OLD → RENAME →
--   重建 indices（rebuild 會讓 0008/0010 建的 index 全部消失，必須補回）。

-- 1. 用 canonical schema (不含 psychic_energy_index) 建新表
CREATE TABLE assessments_new (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    guest_id TEXT,
    assessment_version TEXT DEFAULT 'B',
    raw_scores TEXT NOT NULL,
    z_scores TEXT NOT NULL,
    result_distribution TEXT NOT NULL,
    primary_type TEXT NOT NULL,
    time_spent_ms INTEGER NOT NULL,
    questions_answered INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 搬資料（明列欄位避免 SELECT * 把 psychic_energy_index 帶過來）
INSERT INTO assessments_new (
    id, user_id, guest_id, assessment_version,
    raw_scores, z_scores, result_distribution, primary_type,
    time_spent_ms, questions_answered, created_at
)
SELECT
    id, user_id, guest_id, assessment_version,
    raw_scores, z_scores, result_distribution, primary_type,
    time_spent_ms, questions_answered, created_at
FROM assessments;

-- 3. 丟舊表
DROP TABLE assessments;

-- 4. 改名上線
ALTER TABLE assessments_new RENAME TO assessments;

-- 5. 重建 indices（DROP TABLE 連 index 一起刪掉）
--    對齊 0008（guest_id / user_id）+ 0010（user_id, created_at DESC composite）
CREATE INDEX IF NOT EXISTS idx_assessments_guest_id ON assessments(guest_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_created
    ON assessments(user_id, created_at DESC);
