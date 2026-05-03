-- [認知幾何 V1 - 加入 questions_answered 欄位]
--
-- 背景：Route A (Early Stopping) 上線後，部分使用者會在 phase 3 / 4 提早結束測驗。
-- 為了能在 dashboard 顯示「平均題數」、在 GA / BI 上做「提早 vs 完整」分群分析，
-- 我們需要記錄每筆 assessment 實際答了多少題。
--
-- 設計：欄位 NULLABLE，舊資料 NULL 視為「不知道」（這些是 Route A 上線前的紀錄），
-- 新資料一律由 worker 從前端 payload 收 questionsAnswered 寫入。
-- 加 INDEX 以利「按題數區間 group by」的分析查詢；資料量小可省略，但寫起來只是一行。
--
-- 套用：
--   npx wrangler d1 migrations apply mm_assessment_db --remote
-- 對 production：純加欄位、無 DROP / RENAME，零資料風險。

ALTER TABLE assessments ADD COLUMN questions_answered INTEGER;

CREATE INDEX IF NOT EXISTS idx_assessments_questions_answered ON assessments(questions_answered);
