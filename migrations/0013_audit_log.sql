-- [認知幾何 V1 - 加 audit_log 持久化敏感操作軌跡]
--
-- 背景：CLAUDE.md §可觀測性要求「所有敏感操作（auth / payment / 權限變更 /
-- 資料刪除）必入 Audit Log」。mbti 業務上敏感操作是：
--   1) delete_account — 用戶撤銷自己 assessment（資料刪除）
--   2) claim_guest    — 訪客結果合併到帳號（user_id 賦值，等價權限變更）
-- assessment submit 是用戶主動建立資料，不在「敏感操作」strict list，不入。
--
-- 為什麼 D1 不靠 console.log：Workers Logs free tier retention 3 天，敏感操作
-- 事後 forensic（用戶客訴「我沒刪」/ 駭客刪資料）需要更長期 trail。D1 寫量
-- 預估每天 <10 次（rate limit 已擋暴衝），免費額度綽綽有餘。
--
-- 部署順序（zero-downtime 新表 expand，遵守 CLAUDE.md §資料庫要求）：
--   1) 先 apply 本 migration（建表，舊 worker 不寫表 → no-op 安全）
--   2) 再 deploy worker（recordAudit 開始寫表）
--   反序套用：worker 先 deploy 會在表不存在時 INSERT throw，但 recordAudit
--   有 try/catch 容錯只 console.error 不阻斷主流程，最壞情況是 audit 暫時遺失。

CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,         -- Date.now() epoch ms (worker 帶；非 D1 CURRENT_TIMESTAMP)
    event TEXT NOT NULL,         -- 'delete_account' | 'claim_guest'
    actor_sub TEXT,              -- chiyigo IAM sub (UUID)；guest 操作可 NULL
    trace_id TEXT NOT NULL,      -- 對齊 X-Trace-Id header，cross-reference Workers Logs
    metadata TEXT                -- JSON：non-PII 計數類 context (deletedCount / claimed 等)
);

-- 查單一用戶歷史操作（客訴 forensic）
CREATE INDEX idx_audit_log_actor_ts ON audit_log(actor_sub, ts DESC);

-- 查單一事件類型分佈（觀察刪帳號高峰、claim 模式）
CREATE INDEX idx_audit_log_event_ts ON audit_log(event, ts DESC);
