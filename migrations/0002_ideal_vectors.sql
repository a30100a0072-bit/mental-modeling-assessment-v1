-- [認知幾何 V1 - 16 型理想向量矩陣]

CREATE TABLE IF NOT EXISTS personality_profiles (
    type_name TEXT PRIMARY KEY,
    v_ni REAL,
    v_ne REAL,
    v_si REAL,
    v_se REAL,
    v_ti REAL,
    v_te REAL,
    v_fi REAL,
    v_fe REAL
);

-- 清空以防重複寫入 (Idempotent 策略)
DELETE FROM personality_profiles;

-- 插入 16 型理想向量矩陣 (榮格八維權重版)
INSERT INTO personality_profiles (type_name, v_ni, v_ne, v_si, v_se, v_ti, v_te, v_fi, v_fe) VALUES
-- NT 型 (理性者)
('INTJ', 100, 0, 0, 40, 0, 80, 60, 0),   
('ENTJ', 80, 0, 0, 60, 0, 100, 40, 0),   
('INTP', 0, 80, 40, 0, 100, 0, 0, 60),   
('ENTP', 0, 100, 60, 0, 80, 0, 0, 40),   

-- NF 型 (理想主義者)
('INFJ', 100, 0, 0, 40, 60, 0, 0, 80),   
('ENFJ', 80, 0, 0, 60, 40, 0, 0, 100),   
('INFP', 0, 80, 40, 0, 0, 60, 100, 0),   
('ENFP', 0, 100, 60, 0, 0, 40, 80, 0),   

-- SP 型 (藝術家)
('ISTP', 0, 0, 0, 80, 100, 0, 0, 40),    
('ESTP', 0, 0, 0, 100, 80, 0, 0, 60),    
('ISFP', 0, 0, 0, 80, 0, 0, 100, 40),    
('ESFP', 0, 0, 0, 100, 0, 0, 80, 60),    

-- SJ 型 (護衛者)
('ISTJ', 0, 0, 100, 40, 0, 80, 60, 0),   
('ESTJ', 0, 0, 80, 60, 0, 100, 40, 0),   
('ISFJ', 0, 0, 100, 40, 60, 0, 0, 80),   
('ESFJ', 0, 0, 80, 60, 40, 0, 0, 100);