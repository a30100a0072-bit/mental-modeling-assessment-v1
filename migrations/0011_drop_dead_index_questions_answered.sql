-- [認知幾何 V1 - 移除 questions_answered 的 dead index]
--
-- 背景：0009 加 questions_answered 欄位時順手加了 idx_assessments_questions_answered，
-- 預想用於「按題數區間 group by」的分析查詢。實際 worker 從未對此欄位做 WHERE / ORDER BY，
-- dashboard / GA pipeline 也沒用到，index 純粹消耗 D1 寫入成本與儲存空間。
--
-- 2026-05-16 health audit 標記為 dead index；今日清除。
-- 未來若真要做題數分析查詢，重建 index 是純加操作零風險。
--
-- 對 production：純 DROP INDEX、無 schema / 資料變更、無風險。

DROP INDEX IF EXISTS idx_assessments_questions_answered;
