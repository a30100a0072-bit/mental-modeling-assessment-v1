-- [認知幾何 V1 - 補齊 assessments 表 schema drift]
--
-- 背景：production D1 已被手動 ALTER 加入下列欄位，但這些變更
-- 沒有對應的 migration 檔，造成 repo schema 與 production 不一致。
-- 本檔把這個漂移正式記錄下來，讓「新建環境照 migration 跑一遍」也能拿到一致結構。
--
-- ⚠️ 對既有 production 套用：**不要執行**（欄位已存在會 ALTER 失敗）。
--    請改用 `wrangler d1 migrations apply --skip` 之類手段直接把這個檔案
--    標記為已套用即可（或在 d1_migrations 表插一筆紀錄）。
-- ✅ 對全新 dev / staging DB：照常套用，會把欄位補齊。
--
-- SQLite ALTER TABLE 不支援 IF NOT EXISTS / ADD COLUMN，所以
-- 套到已有欄位的 DB 一定會失敗 — 這是刻意的，避免靜默掩蓋差異。

-- 訪客識別（A/B 訪客作答時 user_id 為 NULL，靠 guest_id 區分；
-- 登入後由 /user/claim-guest-results 把這些列綁回 SSO sub）
ALTER TABLE assessments ADD COLUMN guest_id TEXT;

-- 演算法輸出三欄（原 0001 的 raw_responses / calculated_scores / mbti_result
-- 在程式碼演進中被改名為以下三欄；舊欄位若仍存在於 DB，可手動 DROP 收尾）
ALTER TABLE assessments ADD COLUMN raw_scores TEXT;
ALTER TABLE assessments ADD COLUMN z_scores TEXT;
ALTER TABLE assessments ADD COLUMN result_distribution TEXT;
ALTER TABLE assessments ADD COLUMN primary_type TEXT;

-- 行為訊號（用於後續分析、未來儀表板可視化）
ALTER TABLE assessments ADD COLUMN psychic_energy_index REAL;
ALTER TABLE assessments ADD COLUMN time_spent_ms INTEGER;

-- 加速 guest 認領查詢（merge endpoint 用 guest_id IN (...) 過濾）
CREATE INDEX IF NOT EXISTS idx_assessments_guest_id ON assessments(guest_id);
-- 加速使用者歷史查詢（user/history 用 user_id ORDER BY created_at）
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);

-- ──────────────────────────────────────────────────────────
-- 已知遺留差異，但本檔不處理（SQLite 限制需 rebuild table 才能改）：
--   - 0001 的 `user_id TEXT NOT NULL` 在 production 已被改為允許 NULL
--     （訪客作答時必須能寫 NULL）。要對齊需 CREATE TABLE assessments_new
--     + INSERT SELECT + DROP + RENAME，風險較高，故留待之後專案重整再處理。
-- ──────────────────────────────────────────────────────────
