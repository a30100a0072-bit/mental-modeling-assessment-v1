-- [認知幾何 V1 - history 查詢 composite index]
--
-- 背景：handleGetHistory 的 query 是
--   SELECT ... FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 200
-- 既有的 idx_assessments_user_id 只能加速 WHERE filter，ORDER BY 仍需在 row 上做 sort，
-- 重度使用者（>500 筆）會掃完所有列再排序再截斷。
--
-- 加 composite (user_id, created_at DESC) 之後 D1 可直接走 index range scan +
-- 反向讀取，掃描成本 → O(LIMIT) 而不是 O(該 user 全部列數)。
--
-- 設計：保留舊 single-column idx 不刪（其他 query 若只 filter user_id 仍走得到，
-- 但目前 worker 沒有這種 query，未來可清掉以節省寫入成本）。SQLite 對 ORDER BY DESC
-- 走 composite index 需要 index 也宣告 DESC 才能避免 reverse scan；故顯式寫 DESC。
--
-- 套用：
--   npx wrangler d1 migrations apply mm_assessment_db --remote
-- 對 production：純加 index、無 schema 變更、無資料風險。

CREATE INDEX IF NOT EXISTS idx_assessments_user_created
    ON assessments(user_id, created_at DESC);
