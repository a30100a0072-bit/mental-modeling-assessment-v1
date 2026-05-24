import { processAssessmentResult } from "./modules/assessment";
import { logError, logEvent } from "./modules/log";
import { SELECT_HISTORY_BY_USER, INSERT_ASSESSMENT } from "./sql/queries";

// 認證走 chiyigo.com OIDC（PKCE + ES256 access_token + JWKS 本地驗）
// 本 Worker 只負責：測驗提交、歷史查詢、帳號刪除（皆透過 chiyigo token 驗身分）
export interface Env {
  ENGINE_VERSION: string;
  SSO_ALLOWED_ORIGINS: string;
  // 觀測 sink（選填，設了就把 error 推 webhook；空值只走 console / Logpush）
  ERROR_WEBHOOK_URL?: string;
  MM_CACHE_KV: KVNamespace;
  MM_DB_D1: D1Database;
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
    "Access-Control-Expose-Headers": "X-Token-Refresh, X-Trace-Id",
    // 本 worker 所有 response body 都是 JSON（成功 / 錯誤都是），
    // Content-Type 統一在 CORS header bundle 內帶，避免 ~25 個 new Response 站點各自重複設定。
    // OPTIONS preflight 因為沒 body，瀏覽器會忽略此欄位，無副作用。
    "Content-Type": "application/json",
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // traceId 在 fetch 入口生成一次，貫穿整個 request lifecycle：
    // 1) 注入 X-Trace-Id response header（已加入 Expose-Headers，前端 JS 可讀並回報）
    // 2) 傳給每個 handler，所有 logError context 都帶上
    // 3) request 結束時統一寫一行 structured log（success + error 都走同一條）
    const traceId = crypto.randomUUID();
    const startedAt = Date.now();
    const baseCors = buildCorsHeaders(request, env);
    const corsHeaders = { ...baseCors, "X-Trace-Id": traceId };
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    let response: Response;

    // 頂層 try/catch 是最後一道網：任何路由 handler 漏接的例外都會被擋下並上報，
    // 確保使用者拿到 5xx JSON 而不是 Workers 預設的 1101，且錯誤一定有紀錄。
    try {
      // --- 路由分發器 ---
      if (request.method === "POST") {
        if (url.pathname.match(/\/assess\/version-[a-f]$/i)) {
          response = await handleAssessmentSubmit(request, env, ctx, corsHeaders, traceId);
        } else if (url.pathname.endsWith("/user/claim-guest-results")) {
          response = await handleClaimGuestResults(request, env, ctx, corsHeaders, traceId);
        } else {
          response = new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
        }
      } else if (request.method === "GET" && url.pathname.endsWith("/auth/allowed-redirects")) {
        const origins = (env.SSO_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
        response = new Response(JSON.stringify({ origins }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else if (request.method === "GET" && url.pathname.endsWith("/user/history")) {
        response = await handleGetHistory(request, env, ctx, corsHeaders, traceId);
      } else if (request.method === "DELETE" && url.pathname.endsWith("/user/account")) {
        response = await handleDeleteAccount(request, env, ctx, corsHeaders, traceId);
      } else {
        response = new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
      }
    } catch (err) {
      logError(env, "fetch:uncaught", err, { traceId, method: request.method, path: url.pathname }, ctx);
      response = new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: corsHeaders });
    }

    logEvent("request", {
      traceId,
      method: request.method,
      path: url.pathname,
      status: response.status,
      durMs: Date.now() - startedAt,
    });

    return response;
  },
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
    // chiyigo 端確認 100% 簽 exp（functions/utils/jwt.js:127），缺 exp 視為偽造
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
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
async function handleGetHistory(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>, traceId: string) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

        const token = authHeader.split(" ")[1];
        const identity = await verifyChiyigoToken(token, env);
        if (!identity) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

        // dashboard 正常使用每分鐘最多會打幾次 history（多次切 tab / 強制重整）：30 次寬鬆夠用。
        if (!(await checkRateLimit("history", identity.sub, 30, 60, env, ctx))) {
            return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: corsHeaders });
        }

        // 加 LIMIT 200：dashboard 雷達/趨勢圖實際只用最近 N 筆，無上限會讓重度使用者 / 攻擊者讓 D1 慢查詢。
        // 200 估算：一年每天測 1 卷仍綽綽有餘；真要更多再走 cursor pagination。
        // SQL 走 src/sql/queries.ts 常數讓 migration smoke test 對拍同一份字串，防止 schema drift。
        const historyReq = await env.MM_DB_D1.prepare(SELECT_HISTORY_BY_USER).bind(identity.sub).all();

        return new Response(JSON.stringify({ status: "Success", data: historyReq.results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (error: any) {
        logError(env, "handleGetHistory", error, { traceId }, ctx);
        return new Response(JSON.stringify({ error: "Internal Error" }), { status: 500, headers: corsHeaders });
    }
}

async function handleDeleteAccount(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>, traceId: string) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const token = authHeader.split(" ")[1];
    const identity = await verifyChiyigoToken(token, env);
    if (!identity) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

    // 帳號刪除是高破壞性操作，每小時最多 3 次足夠正常使用 + 防 spam 觸發大量 DELETE。
    if (!(await checkRateLimit("delete", identity.sub, 3, 3600, env, ctx))) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: corsHeaders });
    }

    const batchStmts = [
        env.MM_DB_D1.prepare("DELETE FROM assessments WHERE user_id = ?").bind(identity.sub)
    ];

    try {
        await env.MM_DB_D1.batch(batchStmts);
        return new Response(JSON.stringify({ status: "Deleted" }), { headers: corsHeaders });
    } catch (err: any) {
        logError(env, "handleDeleteAccount", err, { traceId, sub: identity.sub }, ctx);
        return new Response(JSON.stringify({ error: "Internal Error" }), { status: 500, headers: corsHeaders });
    }
}

// ==========================================
// [模組 0] 共用工具
// ==========================================
// KV-based rate limit。
// 設計：read-then-write 有 race window，但用於降噪非加密保護，可接受。
// KV 異常時 fail-open，避免外部依賴抖動把正常使用流程擋掉，但要上報。
//   name:    label，會編進 key 並用於 log（不同 endpoint 不互相消耗額度）
//   subject: 計數主體（登入 sub / guestId / IP），同一 subject 共用計數
//   max:     窗口內最多 N 次
//   ttlSec:  窗口長度
async function checkRateLimit(name: string, subject: string, max: number, ttlSec: number, env: Env, ctx: ExecutionContext): Promise<boolean> {
    const key = `rl:${name}:${subject}`;
    try {
        const cur = parseInt((await env.MM_CACHE_KV.get(key)) || "0", 10);
        if (cur >= max) return false;
        await env.MM_CACHE_KV.put(key, String(cur + 1), { expirationTtl: ttlSec });
        return true;
    } catch (err) {
        logError(env, "checkRateLimit:kv", err, { name, subject }, ctx);
        return true;
    }
}

// 從 request 取 IP（cf-connecting-ip 是 Cloudflare 注入的真實 client IP，production 一定有）。
// 用於訪客 endpoint（沒 sub 可用）的 rate limit 主體；本地測試 / 缺 header 時回 'unknown' 兜底。
// 不再 fallback 到 x-forwarded-for：該 header 是 client 可偽造的，做 rate limit 主體會被輕易繞過。
function getClientIp(request: Request): string {
    return request.headers.get("cf-connecting-ip") || "unknown";
}

// ==========================================
// [模組 2.5] Guest 結果合併
// ==========================================
// 訪客作答時 assessments.user_id 為 NULL、guest_id 為瀏覽器產生的隨機字串。
// 註冊/登入完成後呼叫此 endpoint，把同一瀏覽器留下的訪客紀錄綁回 SSO sub。
// 只更新 user_id IS NULL 的列，避免別的使用者誤領；guest_id 清空避免重複認領。
// Rate limit：每個 SSO sub 每 60 秒最多 5 次合併呼叫，降低惡意 / bug 的反覆認領噪音。
async function handleClaimGuestResults(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>, traceId: string) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const token = authHeader.split(" ")[1];
    const identity = await verifyChiyigoToken(token, env);
    if (!identity) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

    if (!(await checkRateLimit("claim", identity.sub, 5, 60, env, ctx))) {
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
        logError(env, "handleClaimGuestResults:db", err, { traceId, sub: identity.sub, guestIdCount: guestIds.length }, ctx);
        return new Response(JSON.stringify({ error: "Internal Error" }), { status: 500, headers: corsHeaders });
    }
}

// ==========================================
// [模組 3] 測驗結果提交
// ==========================================
// 驗證上限：rawScores 來自 8 個面向的累加，個別維度題目權重總和遠小於 1000，
// 取 ±1000 既擋下 NaN/Infinity/極端髒資料，又不會誤殺合理範圍。
const RAW_SCORE_MIN = -1000;
const RAW_SCORE_MAX = 1000;
const TIME_SPENT_MS_MIN = 1;
const TIME_SPENT_MS_MAX = 24 * 60 * 60 * 1000; // 24 小時
const ALLOWED_VERSIONS = new Set(["A", "B", "C", "D", "E", "F"]);
const GUEST_ONLY_VERSIONS = new Set(["A", "B"]);

function badRequest(msg: string, corsHeaders: Record<string, string>): Response {
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: corsHeaders });
}

async function handleAssessmentSubmit(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>, traceId: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const routeMatch = url.pathname.match(/\/assess\/version-([a-f])$/i);
    if (!routeMatch) return badRequest("Invalid route", corsHeaders);
    const routeVersion = routeMatch[1].toUpperCase();

    let payload: { version?: string; rawScores?: unknown; timeSpentMs?: unknown; guestId?: unknown; questionsAnswered?: unknown };
    try { payload = await request.json(); } catch { return badRequest("Invalid JSON", corsHeaders); }

    // assess rate limit：subject 用 IP+guestId 複合 key，對 NAT 大戶（學校 / 公司網路）友善 ——
    // 同 IP 不同瀏覽器各自記額度。guestId 可偽造但本 endpoint 是反 spam 不是反濫用，trade-off 可接受。
    // 沒帶 guestId 的請求（極少數舊 client）退化成純 IP 計數，行為跟原本一致。
    // 正常使用者一卷 5–15 分鐘，一分鐘 10 次已經是異常 spam；6 卷 ×2 重試也只 12。
    const rlGuestKey = (typeof payload.guestId === "string" && payload.guestId.length > 0 && payload.guestId.length <= 64)
        ? payload.guestId : "noguest";
    const rlSubject = `${getClientIp(request)}:${rlGuestKey}`;
    if (!(await checkRateLimit("assess", rlSubject, 10, 60, env, ctx))) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: corsHeaders });
    }

    // rawScores: 必須是長度 8 的有限數字陣列、且每項落在合理範圍
    if (!Array.isArray(payload.rawScores) || payload.rawScores.length !== 8) {
        return badRequest("Invalid rawScores", corsHeaders);
    }
    const rawScores: number[] = [];
    for (const s of payload.rawScores) {
        if (typeof s !== "number" || !Number.isFinite(s) || s < RAW_SCORE_MIN || s > RAW_SCORE_MAX) {
            return badRequest("Invalid rawScores value", corsHeaders);
        }
        rawScores.push(s);
    }

    // timeSpentMs：負數 / NaN / 24h 以上都拒；舊 client 不傳則用 1000 fallback
    let timeSpentMs = 1000;
    if (payload.timeSpentMs !== undefined) {
        if (typeof payload.timeSpentMs !== "number" || !Number.isFinite(payload.timeSpentMs)
            || payload.timeSpentMs < TIME_SPENT_MS_MIN || payload.timeSpentMs > TIME_SPENT_MS_MAX) {
            return badRequest("Invalid timeSpentMs", corsHeaders);
        }
        timeSpentMs = payload.timeSpentMs;
    }

    // version：白名單 + 必須與 route 一致（防止打 /version-a 但 body 寫 D 偽造模組來源）
    const bodyVersion = typeof payload.version === "string" ? payload.version.toUpperCase() : routeVersion;
    if (!ALLOWED_VERSIONS.has(bodyVersion) || bodyVersion !== routeVersion) {
        return badRequest("Version mismatch", corsHeaders);
    }

    // guestId：選填，但若有要是合理字串
    let guestId: string | null = null;
    if (payload.guestId !== undefined && payload.guestId !== null) {
        if (typeof payload.guestId !== "string" || payload.guestId.length === 0 || payload.guestId.length > 64) {
            return badRequest("Invalid guestId", corsHeaders);
        }
        guestId = payload.guestId;
    }

    // questionsAnswered：選填，0-200 整數
    let questionsAnswered: number | null = null;
    if (payload.questionsAnswered !== undefined && payload.questionsAnswered !== null) {
        if (typeof payload.questionsAnswered !== "number" || !Number.isFinite(payload.questionsAnswered)
            || payload.questionsAnswered < 0 || payload.questionsAnswered > 200) {
            return badRequest("Invalid questionsAnswered", corsHeaders);
        }
        questionsAnswered = Math.round(payload.questionsAnswered);
    }

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

    // 商業權限管控：A/B 開放訪客作答；C/D/E/F 必須登入
    // 前端 modal 是 UX 防護，這裡是硬牆，防止繞過 modal 直接打 API
    if (!finalUserId && !GUEST_ONLY_VERSIONS.has(routeVersion)) {
        return new Response(JSON.stringify({ error: "此模組需登入後方可作答" }), { status: 401, headers: corsHeaders });
    }

    const result = processAssessmentResult(rawScores, timeSpentMs);
    const reportId = crypto.randomUUID();

    // INSERT SQL 走 src/sql/queries.ts 常數讓 migration smoke test 對拍同一份字串，
    // 任何欄位增刪兩端立刻 schema mismatch fail，防 silent drift（health audit 黃燈收尾）。
    await env.MM_DB_D1.prepare(INSERT_ASSESSMENT).bind(
        reportId,
        finalUserId,
        guestId,
        routeVersion,
        JSON.stringify(rawScores),
        JSON.stringify(result.zScores),
        JSON.stringify(result.probabilities),
        result.primaryType,
        timeSpentMs,
        questionsAnswered
    ).run();

    const resultData = { id: reportId, ...result, timestamp: new Date().toISOString() };
    await env.MM_CACHE_KV.put(`report:${reportId}`, JSON.stringify(resultData), { expirationTtl: 86400 });

    return new Response(JSON.stringify({ status: "Calculated", reportId: reportId, data: resultData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    logError(env, "handleAssessmentSubmit", error, { traceId }, ctx);
    return new Response(JSON.stringify({ error: "Internal Error" }), { status: 500, headers: corsHeaders });
  }
}
