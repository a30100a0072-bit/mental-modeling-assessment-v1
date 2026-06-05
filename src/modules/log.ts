import { INSERT_AUDIT_LOG } from "../sql/queries";

// 結構化錯誤觀測：本身極簡，依賴外部 sink 做長期保存。
//
// 訊號流向：
//   1) console.error 寫 JSON line → Workers 內建 logs（wrangler tail / Logpush 接走）
//   2) 若 env.ERROR_WEBHOOK_URL 有設，fire-and-forget POST 一份去外部 sink（Discord/Slack/自家收集器）
//
// 要把 errors 推到外部 sink：
//   wrangler secret put ERROR_WEBHOOK_URL
//   值是任何接受 JSON POST 的 endpoint（Discord webhook、Slack incoming webhook、自家 collector）

export interface LogContext {
  [key: string]: unknown;
}

interface LogEnv {
  ERROR_WEBHOOK_URL?: string;
}

// PII redaction：logError 的 context 可能帶 client IP / account sub（rate-limit subject、
// handler 帶入的 identity.sub），這些會同時進 Workers Logs 與外部 webhook。
// CLAUDE.md「Log 禁洩漏敏感（PII 必 redact）」→ 對 sensitive key 一律遮蔽；traceId 仍保留
// 供關聯 request log。注意：recordAudit 把 actor_sub 落 D1 是另一條 sanctioned forensic channel。
const SENSITIVE_LOG_KEYS = new Set(["subject", "sub", "ip", "clientIp", "email", "guestId"]);
function redactContext(context: LogContext): LogContext {
  const out: LogContext = {};
  for (const k of Object.keys(context)) {
    out[k] = SENSITIVE_LOG_KEYS.has(k) ? "[redacted]" : context[k];
  }
  return out;
}

export function logError(
  env: LogEnv,
  label: string,
  err: unknown,
  context: LogContext = {},
  ctx?: { waitUntil(p: Promise<unknown>): void }
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  const payload = {
    level: "error",
    ts: new Date().toISOString(),
    label,
    message,
    stack,
    ...redactContext(context),
  };

  // 一律寫 console（Workers logs / wrangler tail / Logpush 都吃）
  // 用 JSON line 格式讓下游可以 jq/SQL 直接 query
  console.error(JSON.stringify(payload));

  // 有設 webhook 才額外送出；fire-and-forget，不阻塞回應
  if (env.ERROR_WEBHOOK_URL) {
    const send = fetch(env.ERROR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // 外部 sink 黑洞時不能無界 pending：waitUntil 會拖到 Workers wall-clock ceiling，
      // 每條錯誤路徑都被拉長。5s timeout 後 abort，既有 .catch 吞 AbortError。
      signal: AbortSignal.timeout(5000),
    }).catch(() => { /* webhook 失敗 / timeout abort 不能再回頭 log，會無限遞迴 */ });
    // 確保 worker 不會在 webhook 飛在路上時就被 GC（CF 會 abort pending fetch）
    if (ctx) ctx.waitUntil(send);
  }
}

// 結構化 info / warn 事件，預設用於 request lifecycle 紀錄（一行一 request）。
// 與 logError 區別：本函式不會推 webhook，避免正常流量打爆外部 sink。
// 下游靠 wrangler tail / Logpush 拉走，level 欄位用於過濾 error vs request log。
export function logEvent(
  event: string,
  context: LogContext = {},
  level: "info" | "warn" = "info"
): void {
  const payload = {
    level,
    ts: new Date().toISOString(),
    event,
    ...context,
  };
  console.log(JSON.stringify(payload));
}

// 敏感操作 audit log — 持久化到 D1 audit_log 表。
//
// 與 logEvent 的差別：
//   - logEvent：所有 request 一行一筆，走 console.log → Workers Logs (3 天 retention)
//   - recordAudit：只敏感操作（delete / claim 等），落 D1 永久保留供事後 forensic
//
// 設計取捨：
//   - fire-and-forget via ctx.waitUntil：主回應不被 D1 寫入阻塞（D1 延遲約 10-50ms）
//   - try/catch 容錯：audit 失敗（表不存在 / D1 抖動）只 console.error，不阻斷主流程
//     —— 寧可丟失一筆 audit 也不能因 audit 寫入失敗讓 delete_account / claim 整個 fail
//   - actor_sub 可 null：未來若有訪客敏感操作（目前無）保留欄位空間
//   - metadata 只塞 non-PII 計數類資料（deletedCount / claimed），CLAUDE.md「log 禁洩漏敏感」
interface AuditEnv {
  MM_DB_D1: D1Database;
}

export function recordAudit(
  env: AuditEnv,
  traceId: string,
  event: string,
  actorSub: string | null,
  metadata: Record<string, unknown> = {},
  ctx?: { waitUntil(p: Promise<unknown>): void }
): void {
  const ts = Date.now();
  const metaStr = JSON.stringify(metadata);
  const write = env.MM_DB_D1
    .prepare(INSERT_AUDIT_LOG)
    .bind(ts, event, actorSub, traceId, metaStr)
    .run()
    .catch((err: unknown) => {
      // audit 失敗不能阻斷主流程，但要 console.error 落 Workers Logs
      const message = err instanceof Error ? err.message : String(err);
      console.error(JSON.stringify({
        level: "error",
        ts: new Date().toISOString(),
        label: "recordAudit:fail",
        message,
        traceId,
        event,
        actorSub,
      }));
    });
  if (ctx) ctx.waitUntil(write);
}
