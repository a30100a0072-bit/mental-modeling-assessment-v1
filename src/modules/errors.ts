// src/modules/errors.ts
// ─────────────────────────────────────────────────────────────────
// 統一 error envelope：所有 4xx / 5xx response body 走
//   { error: { code: "ERR_XXX", message: "...", traceId: "..." } }
//
// 為什麼這個 shape：
//   - code 是穩定的程式辨識符（i18n / client switch / 監控分類），不變動
//   - message 是給人看的描述，可自由改文案不影響 client 邏輯
//   - traceId 與同 request 的 X-Trace-Id header 對齊，使用者回報 bug
//     直接給 traceId 即可關聯到 worker log（CLAUDE.md §觀測性要求）
//
// CLAUDE.md §安全要求：「錯誤不洩漏 internal detail（對外只給 error code
// + traceId）」。本 helper 強制 caller 提供 traceId，message 對外限制在
// 預先定義的人類可讀描述（不要塞 SQL / stack trace / DB 欄位等內部資訊）。
// ─────────────────────────────────────────────────────────────────

export const ERR_CODE = {
    VALIDATION: "ERR_VALIDATION",       // 400 — schema fail / 邊界 input 不合
    UNAUTHORIZED: "ERR_UNAUTHORIZED",   // 401 — 缺 token / 過期 / 簽章不符
    FORBIDDEN: "ERR_FORBIDDEN",         // 403 — 認證 OK 但無權限（目前未用）
    NOT_FOUND: "ERR_NOT_FOUND",         // 404 — 路由不存在
    RATE_LIMITED: "ERR_RATE_LIMITED",   // 429
    INTERNAL: "ERR_INTERNAL",           // 500 — uncaught / DB error
} as const;

export type ErrCode = typeof ERR_CODE[keyof typeof ERR_CODE];

export function errorResponse(
    code: ErrCode,
    message: string,
    status: number,
    traceId: string,
    corsHeaders: Record<string, string>
): Response {
    return new Response(
        JSON.stringify({ error: { code, message, traceId } }),
        { status, headers: corsHeaders }
    );
}
