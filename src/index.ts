import { processAssessmentResult } from "./modules/assessment";
import { logError } from "./modules/log";

// 認證走 chiyigo.com OIDC（PKCE + ES256 access_token + JWKS 本地驗）
// 本 Worker 只負責：測驗提交、歷史查詢、帳號刪除（皆透過 chiyigo token 驗身分）
export interface Env {
  ENGINE_VERSION: string;
  SOFTMAX_TAU: string;
  SSO_ALLOWED_ORIGINS: string;
  // 觀測 sink（選填，設了就把 error 推 webhook；空值只走 console / Logpush）
  ERROR_WEBHOOK_URL?: string;
  MM_CACHE_KV: KVNamespace;
  MM_DB_D1: D1Database;
  MM_EVENT_QUEUE: Queue;
}

// CORS 白名單：本站 + SSO 跨站合作站。SSO_ALLOWED_ORIGINS 由 wrangler.toml 提供，
// 確保新增合作站只需改 env，不需改程式碼。
const STATIC_ALLOWED_ORIGINS = new Set<string>([
  "https://mbti.chiyigo.com",
  "https://chiyigo.com",
]);

function buildCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const dynamicAllowed = (env.SSO_ALLOWED_ORIGINS || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  const isAllowed = STATIC_ALLOWED_ORIGINS.has(origin) || dynamicAllowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://mbti.chiyigo.com",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Expose-Headers": "X-Token-Refresh",
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = buildCorsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    // 頂層 try/catch 是最後一道網：任何路由 handler 漏接的例外都會被擋下並上報，
    // 確保使用者拿到 5xx JSON 而不是 Workers 預設的 1101，且錯誤一定有紀錄。
    try {
      // --- 路由分發器 ---
      if (request.method === "POST") {
        if (url.pathname.match(/\/assess\/version-[a-f]$/i)) return await handleAssessmentSubmit(request, env, ctx, corsHeaders);
        if (url.pathname.endsWith("/user/claim-guest-results")) return await handleClaimGuestResults(request, env, ctx, corsHeaders);
      }

      if (request.method === "GET" && url.pathname.endsWith("/auth/allowed-redirects")) {
        const origins = (env.SSO_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
        return new Response(JSON.stringify({ origins }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (request.method === "GET" && url.pathname.endsWith("/user/history")) return await handleGetHistory(request, env, ctx, corsHeaders);
      if (request.method === "DELETE" && url.pathname.endsWith("/user/account")) return await handleDeleteAccount(request, env, ctx, corsHeaders);

      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
    } catch (err) {
      logError(env, "fetch:uncaught", err, { method: request.method, path: url.pathname }, ctx);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: corsHeaders });
    }
  },

  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      console.log("Processed event:", message.body.id);
    }
  }
};

// ==========================================
// [模組 1] chiyigo.com SSO token 驗證（OIDC：ES256 + JWKS 本地驗）
// ==========================================
// 從 chiyigo /.well-known/jwks.json 抓公鑰本地驗證 access_token，不再 server-to-server
// 呼叫 introspection。少一次外部 fetch，代價是 token 撤銷不會即時生效（15min access TTL
// 視窗內舊 token 仍可用），這是 OIDC 標準權衡，可接受。
const JWKS_URL = 'https://chiyigo.com/.well-known/jwks.json';
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 小時，避免密鑰輪換後永久信任舊鑰
const EXPECTED_ISS = 'https://chiyigo.com';
const EXPECTED_AUD = 'mbti';
const _keyCache = new Map<string, { key: CryptoKey; expiresAt: number }>();

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Uint8Array.from(
    atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad),
    c => c.charCodeAt(0)
  );
}

async function getPublicKey(kid: string | undefined): Promise<CryptoKey | null> {
  const cacheKey = kid ?? '__default__';
  const cached = _keyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.key;

  const res = await fetch(JWKS_URL, { cf: { cacheTtl: 300, cacheEverything: true } } as RequestInit);
  if (!res.ok) return null;
  const { keys } = await res.json() as { keys: (JsonWebKey & { kid?: string })[] };
  if (!Array.isArray(keys) || keys.length === 0) return null;

  const jwk = kid ? keys.find(k => k.kid === kid) : keys[0];
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['verify']
  );
  _keyCache.set(cacheKey, { key, expiresAt: Date.now() + JWKS_TTL_MS });
  return key;
}

type ChiyigoIdentity = { sub: string; email: string; role: string };

async function verifyChiyigoToken(token: string, _env: Env): Promise<ChiyigoIdentity | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(headerB64))) as { alg?: string; kid?: string };
    if (header.alg !== 'ES256') return null;

    const key = await getPublicKey(header.kid);
    if (!key) return null;

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key, b64urlToBytes(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64))) as {
      sub?: string; exp?: number; iss?: string; aud?: string | string[]; email?: string; role?: string;
    };
    if (!payload.sub) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (payload.iss !== EXPECTED_ISS) return null;
    const audOk = Array.isArray(payload.aud) ? payload.aud.includes(EXPECTED_AUD) : payload.aud === EXPECTED_AUD;
    if (!audOk) return null;

    return { sub: String(payload.sub), email: payload.email || '', role: payload.role || 'player' };
  } catch {
    return null;
  }
}

// ==========================================
// [模組 2] 歷史紀錄查詢
// ==========================================
async function handleGetHistory(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

        const token = authHeader.split(" ")[1];
        const identity = await verifyChiyigoToken(token, env);
        if (!identity) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

        const historyReq = await env.MM_DB_D1.prepare(
            "SELECT id, assessment_version, raw_scores, z_scores, result_distribution, primary_type, questions_answered, created_at as timestamp FROM assessments WHERE user_id = ? ORDER BY created_at DESC"
        ).bind(identity.sub).all();

        return new Response(JSON.stringify({ status: "Success", data: historyReq.results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (error: any) {
        logError(env, "handleGetHistory", error, {}, ctx);
        return new Response(JSON.stringify({ error: "DB Error: " + error.message }), { status: 500, headers: corsHeaders });
    }
}

async function handleDeleteAccount(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const token = authHeader.split(" ")[1];
    const identity = await verifyChiyigoToken(token, env);
    if (!identity) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

    const batchStmts = [
        env.MM_DB_D1.prepare("DELETE FROM assessments WHERE user_id = ?").bind(identity.sub)
    ];

    try {
        await env.MM_DB_D1.batch(batchStmts);
        return new Response(JSON.stringify({ status: "Deleted" }), { headers: corsHeaders });
    } catch (err: any) {
        logError(env, "handleDeleteAccount", err, { sub: identity.sub }, ctx);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

// ==========================================
// [模組 2.5] Guest 結果合併
// ==========================================
// 訪客作答時 assessments.user_id 為 NULL、guest_id 為瀏覽器產生的隨機字串。
// 註冊/登入完成後呼叫此 endpoint，把同一瀏覽器留下的訪客紀錄綁回 SSO sub。
// 只更新 user_id IS NULL 的列，避免別的使用者誤領；guest_id 清空避免重複認領。
// Rate limit：每個 SSO sub 每 60 秒最多 5 次合併呼叫。
// 並非加密保護，只是降低惡意 / bug 的反覆認領噪音；KV 計數有竸爭視窗但此端點低頻寫入可接受。
async function checkClaimRateLimit(sub: string, env: Env, ctx: ExecutionContext): Promise<boolean> {
    const key = `rl:claim:${sub}`;
    try {
        const cur = parseInt((await env.MM_CACHE_KV.get(key)) || "0", 10);
        if (cur >= 5) return false;
        await env.MM_CACHE_KV.put(key, String(cur + 1), { expirationTtl: 60 });
        return true;
    } catch (err) {
        // KV 異常時放行，避免外部依賴抖動把正常登入流程擋掉；但要上報以便發現 KV 健康狀況
        logError(env, "checkClaimRateLimit:kv", err, { sub }, ctx);
        return true;
    }
}

async function handleClaimGuestResults(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const token = authHeader.split(" ")[1];
    const identity = await verifyChiyigoToken(token, env);
    if (!identity) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

    if (!(await checkClaimRateLimit(identity.sub, env, ctx))) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: corsHeaders });
    }

    let body: { guestIds?: string[] };
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

    const guestIds = (body.guestIds || []).filter(s => typeof s === "string" && s.length > 0 && s.length < 64).slice(0, 20);
    if (guestIds.length === 0) return new Response(JSON.stringify({ status: "Noop", claimed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    try {
        const placeholders = guestIds.map(() => "?").join(",");
        const stmt = env.MM_DB_D1.prepare(
            `UPDATE assessments SET user_id = ?, guest_id = NULL WHERE user_id IS NULL AND guest_id IN (${placeholders})`
        ).bind(identity.sub, ...guestIds);
        const res = await stmt.run();
        const claimed = (res as any)?.meta?.changes ?? 0;
        return new Response(JSON.stringify({ status: "Claimed", claimed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err: any) {
        logError(env, "handleClaimGuestResults:db", err, { sub: identity.sub, guestIdCount: guestIds.length }, ctx);
        return new Response(JSON.stringify({ error: "DB Error: " + err.message }), { status: 500, headers: corsHeaders });
    }
}

// ==========================================
// [模組 3] 測驗結果提交
// ==========================================
async function handleAssessmentSubmit(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const payload = await request.json<{ version?: string; rawScores: number[]; timeSpentMs: number; guestId?: string; questionsAnswered?: number }>();
    if (!payload.rawScores || payload.rawScores.length !== 8) throw new Error("無效的 Payload: 必須提供八維分數陣列");

    // Route A 之後，前端會傳 questionsAnswered（提早結束 = 較少題；走完 = 全題）。
    // 舊版 client 不傳 → 寫 NULL（資料分析時視為「不知道」）。
    // 防呆：負數 / 不合理大值都丟棄，避免髒資料污染 dashboard 統計。
    const questionsAnswered = (typeof payload.questionsAnswered === "number"
        && payload.questionsAnswered >= 0
        && payload.questionsAnswered <= 200)
        ? Math.round(payload.questionsAnswered)
        : null;

    let finalUserId: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const identity = await verifyChiyigoToken(authHeader.split(" ")[1], env);
        if (!identity) {
            // 帶了 token 卻驗不過：必須拒絕，否則資料會被靜默存成訪客 → 使用者看不到歷史
            return new Response(JSON.stringify({ error: "授權已失效，請重新登入後再提交" }), { status: 401, headers: corsHeaders });
        }
        finalUserId = identity.sub;
    }

    const result = processAssessmentResult(payload.rawScores, payload.timeSpentMs || 1000);
    const reportId = crypto.randomUUID();

    // 防呆：前端沒傳的話預設為 B
    const submitVersion = (payload.version || "B").toUpperCase();

    // 商業權限管控：A/B 開放訪客作答；C/D/E/F 必須登入
    // 前端 modal 是 UX 防護，這裡是硬牆，防止繞過 modal 直接打 API
    if (!finalUserId && ["C", "D", "E", "F"].includes(submitVersion)) {
        return new Response(JSON.stringify({ error: "此模組需登入後方可作答" }), { status: 401, headers: corsHeaders });
    }

    await env.MM_DB_D1.prepare(
        `INSERT INTO assessments (id, user_id, guest_id, assessment_version, raw_scores, z_scores, result_distribution, primary_type, psychic_energy_index, time_spent_ms, questions_answered) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        reportId,
        finalUserId,
        payload.guestId || null,
        submitVersion,
        JSON.stringify(payload.rawScores),
        JSON.stringify(result.zScores),
        JSON.stringify(result.probabilities),
        result.primaryType,
        result.psychicEnergyIndex,
        payload.timeSpentMs || 1000,
        questionsAnswered
    ).run();

    const resultData = { id: reportId, ...result, timestamp: new Date().toISOString() };
    await env.MM_CACHE_KV.put(`report:${reportId}`, JSON.stringify(resultData), { expirationTtl: 86400 });

    return new Response(JSON.stringify({ status: "Calculated", reportId: reportId, data: resultData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    logError(env, "handleAssessmentSubmit", error, {}, ctx);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
