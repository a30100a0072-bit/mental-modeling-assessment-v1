-- [認知幾何 V1 - 補齊 assessment_version 欄位]
-- 針對已部署的資料庫，補上 assessment_version 欄位
ALTER TABLE assessments ADD COLUMN assessment_version TEXT DEFAULT 'B';
