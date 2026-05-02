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
    ...context,
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
    }).catch(() => { /* webhook 失敗不能再回頭 log，會無限遞迴 */ });
    // 確保 worker 不會在 webhook 飛在路上時就被 GC（CF 會 abort pending fetch）
    if (ctx) ctx.waitUntil(send);
  }
}
