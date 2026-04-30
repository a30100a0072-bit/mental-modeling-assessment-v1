-- [認知幾何 V1 - 把 assessments 表重建成 canonical schema]
--
-- 背景：production 經過多次手動 ALTER 後 schema 已乾淨（user_id 允許 NULL、
-- 舊欄位 raw_responses/calculated_scores/mbti_result/enneagram_result 已被清掉）。
-- 但 repo 的 0001 + 0007 跑出來的結構與 prod 仍有差異：
--   - 0001 的 user_id NOT NULL 約束 SQLite 無法 ALTER
--   - 0001 的 raw_responses / calculated_scores / mbti_result / enneagram_result
--     在 0007 後仍會殘留
-- 本檔用 SQLite 標準「CREATE NEW + INSERT SELECT + DROP + RENAME」流程把表
-- 重建成與 prod 一致的權威版，讓新環境跑完所有 migration 後 schema 100% 對齊。
--
-- 對 production 套用：表是空的（pre-launch），重建零資料風險。
-- 對新環境套用：0001 建的舊表也是空的，重建一樣安全。

-- 1. 用 canonical schema 建新表
CREATE TABLE assessments_new (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    guest_id TEXT,
    assessment_version TEXT DEFAULT 'B',
    raw_scores TEXT NOT NULL,
    z_scores TEXT NOT NULL,
    result_distribution TEXT NOT NULL,
    primary_type TEXT NOT NULL,
    psychic_energy_index REAL DEFAULT 0.0,
    time_spent_ms INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 把舊表能搬的欄位搬過來（用 COALESCE 處理新舊欄位命名差異）
INSERT INTO assessments_new (
    id, user_id, guest_id, assessment_version,
    raw_scores, z_scores, result_distribution, primary_type,
    psychic_energy_index, time_spent_ms, created_at
)
SELECT
    id,
    user_id,
    guest_id,
    COALESCE(assessment_version, 'B'),
    COALESCE(raw_scores, '[]'),
    COALESCE(z_scores, '[]'),
    COALESCE(result_distribution, '{}'),
    COALESCE(primary_type, 'XXXX'),
    COALESCE(psychic_energy_index, 0.0),
    COALESCE(time_spent_ms, 0),
    created_at
FROM assessments;

-- 3. 丟掉舊表（連同 0001 留下的 raw_responses / calculated_scores 等死欄位）
DROP TABLE assessments;

-- 4. 改名上線
ALTER TABLE assessments_new RENAME TO assessments;

-- 5. 重建索引（DROP TABLE 連索引一起刪掉了）
CREATE INDEX IF NOT EXISTS idx_assessments_guest_id ON assessments(guest_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
