-- [認知幾何 V1 - 版本 B (高壓崩潰核心) 完整題庫矩陣]

-- 1. 清空舊數據，確保冪等性 (Idempotency)
DELETE FROM question_matrix WHERE assessment_version = 'B';

-- ---------------------------------------------------------
-- [M1] 內外傾代價純化 (單維度極端) | Base Weight: 1.0
-- ---------------------------------------------------------
-- Q1: 思考維度 (Te vs Ti)
INSERT INTO question_matrix (assessment_version, question_text, dimension, weight, is_reverse_scoring) VALUES
('B', '專案即將上線卻遭遇毀滅性Bug，在資源極度受限的當下，大腦立刻切換至：A.調度現有資源降級運作止血 / B.獨自潛入底層找出引發Bug的根本邏輯', 'Te', 1.0, 0),
('B', '專案即將上線卻遭遇毀滅性Bug，在資源極度受限的當下，大腦立刻切換至：A.調度現有資源降級運作止血 / B.獨自潛入底層找出引發Bug的根本邏輯', 'Ti', 1.0, 0);

-- Q2: 情感維度 (Fe vs Fi)
INSERT INTO question_matrix (assessment_version, question_text, dimension, weight, is_reverse_scoring) VALUES
('B', '面對團隊中爆發的嚴重道德爭議：A.優先安撫群體情緒以維持組織運作 / B.堅守個人內在價值觀，即便被群體排斥', 'Fe', 1.0, 0),
('B', '面對團隊中爆發的嚴重道德爭議：A.優先安撫群體情緒以維持組織運作 / B.堅守個人內在價值觀，即便被群體排斥', 'Fi', 1.0, 0);

-- ---------------------------------------------------------
-- [M2] 同域感知判斷交火 (資源極度稀缺) | Base Weight: 1.0
-- ---------------------------------------------------------
-- Q3: 判斷(Te) vs 感知(Ne) (原 J vs P，映射至具體功能)
INSERT INTO question_matrix (assessment_version, question_text, dimension, weight, is_reverse_scoring) VALUES
('B', '面對足以改變職涯但資訊極度匱乏的抉擇：A.強制收斂現有碎裂資訊，立刻拍板定案 / B.扣住底牌直到最後一秒，瘋狂搜索隱藏變數', 'Te', 1.0, 0),
('B', '面對足以改變職涯但資訊極度匱乏的抉擇：A.強制收斂現有碎裂資訊，立刻拍板定案 / B.扣住底牌直到最後一秒，瘋狂搜索隱藏變數', 'Ne', 1.0, 0);

-- ---------------------------------------------------------
-- [M3] 榮格軸向拮抗檢驗 (完整軸向對撞) | Base Weight: 1.5
-- ---------------------------------------------------------
-- Q4: Te-Fi 軸 vs Ti-Fe 軸
INSERT INTO question_matrix (assessment_version, question_text, dimension, weight, is_reverse_scoring) VALUES
('B', '親手開除嚴重拖後腿的摯友，最痛苦的內耗點是：A.冷酷切割後在私人空間的深深內疚 / B.當下難以面對破壞群體和諧與對方的情緒反彈', 'Te', 1.5, 0),
('B', '親手開除嚴重拖後腿的摯友，最痛苦的內耗點是：A.冷酷切割後在私人空間的深深內疚 / B.當下難以面對破壞群體和諧與對方的情緒反彈', 'Ti', 1.5, 0);

-- Q5: Ni-Se 軸 vs Ne-Si 軸
INSERT INTO question_matrix (assessment_version, question_text, dimension, weight, is_reverse_scoring) VALUES
('B', '在陌生環境徹底迷路且無外援時：A.直覺鎖定一個方向，並觀察物理地標硬闖 / B.腦中閃過各種迷路可能導致的災難，試圖回憶曾經看過的地圖碎片', 'Ni', 1.5, 0),
('B', '在陌生環境徹底迷路且無外援時：A.直覺鎖定一個方向，並觀察物理地標硬闖 / B.腦中閃過各種迷路可能導致的災難，試圖回憶曾經看過的地圖碎片', 'Ne', 1.5, 0);

-- ---------------------------------------------------------
-- [M4] 系統崩潰極端防禦 (劣勢暴走/逆向測量) | Base Weight: 2.0 (Reverse Scoring = 1)
-- ---------------------------------------------------------
-- Q6: 防禦 Ni 崩潰 (Se 暴走) vs 防禦 Fi 崩潰 (Te 暴走)
INSERT INTO question_matrix (assessment_version, question_text, dimension, weight, is_reverse_scoring) VALUES
('B', '極限壓力且無人協助時，親近的人會發現你變得：A.瘋狂沉溺感官刺激(暴飲暴食/購物) / B.極度專橫強迫周圍人立刻執行指令', 'Ni', 2.0, 1),
('B', '極限壓力且無人協助時，親近的人會發現你變得：A.瘋狂沉溺感官刺激(暴飲暴食/購物) / B.極度專橫強迫周圍人立刻執行指令', 'Fi', 2.0, 1);

-- Q7: 防禦 Si 崩潰 (Ne 暴走) vs 防禦 Ti 崩潰 (Fe 暴走)
INSERT INTO question_matrix (assessment_version, question_text, dimension, weight, is_reverse_scoring) VALUES
('B', '深陷長期高壓絕境時：A.大腦不受控地幻想各種最糟結果與陰謀論 / B.放棄邏輯，病態地渴求他人的認同與情緒安撫', 'Si', 2.0, 1),
('B', '深陷長期高壓絕境時：A.大腦不受控地幻想各種最糟結果與陰謀論 / B.放棄邏輯，病態地渴求他人的認同與情緒安撫', 'Ti', 2.0, 1);

-- ---------------------------------------------------------
-- [M5] 階層解耦探針 (最高分糾纏探針) | Base Weight: 3.0
-- ---------------------------------------------------------
-- Q8: Ni 主導 vs Te 主導 (剝離 INTJ / ENTJ)
INSERT INTO question_matrix (assessment_version, question_text, dimension, weight, is_reverse_scoring) VALUES
('B', '如果只能二選一，寧願接受哪種失敗：A.犧牲現實名利成果，也要保全心中完美無瑕的理論藍圖 / B.放棄宏偉藍圖，妥協於平庸現實，只要能產出具備實用價值的成果', 'Ni', 3.0, 0),
('B', '如果只能二選一，寧願接受哪種失敗：A.犧牲現實名利成果，也要保全心中完美無瑕的理論藍圖 / B.放棄宏偉藍圖，妥協於平庸現實，只要能產出具備實用價值的成果', 'Te', 3.0, 0);