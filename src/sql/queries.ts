// src/sql/queries.ts
// ─────────────────────────────────────────────────────────────────
// 跨檔 SQL 常數 — worker (src/index.ts) 與 migration smoke test
// (test/migrations.spec.ts) 共用同一份字串，避免「worker 改了欄位、test
// 沒同步改」的 silent drift 風險。
//
// 抽出原則：只抽「migration spec 真實對拍 worker 行為」的 SQL（health
// audit 列為 drift 高風險的 SELECT history + INSERT assessment）。其他
// statement（DELETE / UPDATE）spec 沒對拍，不抽以免過度抽象。
//
// 改動規則：
//   - 加新欄位 → 同步改本檔 SQL + spec 預期欄位列表 + worker bind 順序
//   - migration 改 schema → spec smoke test 會跑這裡的 SQL 對 D1，schema
//     mismatch 立刻 fail，無法上線
// ─────────────────────────────────────────────────────────────────

export const SELECT_HISTORY_BY_USER =
    "SELECT id, assessment_version, raw_scores, z_scores, result_distribution, primary_type, questions_answered, created_at as timestamp FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 200";

export const INSERT_ASSESSMENT =
    "INSERT INTO assessments (id, user_id, guest_id, assessment_version, raw_scores, z_scores, result_distribution, primary_type, time_spent_ms, questions_answered) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

// audit_log INSERT — 寫入點：recordAudit (src/modules/log.ts) + migrations.spec.ts smoke。
// bind 順序：ts, event, actor_sub, trace_id, metadata
export const INSERT_AUDIT_LOG =
    "INSERT INTO audit_log (ts, event, actor_sub, trace_id, metadata) VALUES (?, ?, ?, ?, ?)";
