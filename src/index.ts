import { processAssessmentResult } from "./modules/assessment";

// 認證走 chiyigo.com SSO（OAuth 2.0 PKCE + token introspection）
// 本 Worker 只負責：測驗提交、歷史查詢、帳號刪除（皆透過 chiyigo token 驗身分）
export interface Env {
  ENGINE_VERSION: string;
  SOFTMAX_TAU: string;
  SSO_ALLOWED_ORIGINS: string;
  MM_CACHE_KV: KVNamespace;
  MM_DB_D1: D1Database;
  MM_EVENT_QUEUE: Queue;
  MM_SESSION_DO: DurableObjectNamespace;
}

export class AssessmentSession {
  state: DurableObjectState;
  env: Env;
  constructor(state: DurableObjectState, env: Env) { this.state = state; this.env = env; }
  async fetch(request: Request) { return new Response("Session Active"); }
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

    // --- 路由分發器 ---
    if (request.method === "POST") {
      if (url.pathname.match(/\/assess\/version-[a-f]$/i)) return await handleAssessmentSubmit(request, env, ctx, corsHeaders);
      if (url.pathname.endsWith("/user/claim-guest-results")) return await handleClaimGuestResults(request, env, corsHeaders);
    }

    if (request.method === "GET" && url.pathname.endsWith("/auth/allowed-redirects")) {
      const origins = (env.SSO_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
      return new Response(JSON.stringify({ origins }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (request.method === "GET" && url.pathname.endsWith("/user/history")) return await handleGetHistory(request, env, corsHeaders);
    if (request.method === "DELETE" && url.pathname.endsWith("/user/account")) return await handleDeleteAccount(request, env, corsHeaders);

    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
  },

  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      console.log("Processed event:", message.body.id);
    }
  }
};

// ==========================================
// [模組 1] chiyigo.com SSO token 驗證
// ==========================================
// 透過 server-to-server 呼叫 chiyigo.com /api/auth/me 做 token introspection。
// 加上 KV 快取（60 秒）以降低 chiyigo.com 流量、提速、避免外部依賴抖動把本 API 拖垮。
// 注意：快取 TTL 必須遠小於 token 有效期；若 token 在 chiyigo 端被撤銷，最多有 60s 的延遲視窗。
const TOKEN_CACHE_TTL = 60;

async function tokenCacheKey(token: string): Promise<string> {
  // SHA-256 後 base64url 截短，避免把原始 token 當 KV key 留存
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `tok:${b64.slice(0, 32)}`;
}

type ChiyigoIdentity = { sub: string; email: string; role: string };

async function verifyChiyigoJWT(token: string, env: Env): Promise<ChiyigoIdentity | null> {
  const cacheKey = await tokenCacheKey(token);
  try {
    const cached = await env.MM_CACHE_KV.get(cacheKey);
    if (cached) return JSON.parse(cached) as ChiyigoIdentity;
  } catch { /* 快取讀取失敗則 fallback 到實時查詢，不致命 */ }

  try {
    const res = await fetch('https://chiyigo.com/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json<{ user_id: number; email: string; role: string; status: string }>();
    if (!data.user_id) return null;
    const identity: ChiyigoIdentity = { sub: String(data.user_id), email: data.email || '', role: data.role || 'player' };

    try { await env.MM_CACHE_KV.put(cacheKey, JSON.stringify(identity), { expirationTtl: TOKEN_CACHE_TTL }); } catch { /* 寫入失敗不影響本次回傳 */ }
    return identity;
  } catch { return null; }
}

// ==========================================
// [模組 2] 歷史紀錄查詢
// ==========================================
async function handleGetHistory(request: Request, env: Env, corsHeaders: Record<string, string>) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

        const token = authHeader.split(" ")[1];
        const jwtResult = await verifyChiyigoJWT(token, env);
        if (!jwtResult) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

        const historyReq = await env.MM_DB_D1.prepare(
            "SELECT id, assessment_version, raw_scores, z_scores, result_distribution, primary_type, created_at as timestamp FROM assessments WHERE user_id = ? ORDER BY created_at DESC"
        ).bind(jwtResult.sub).all();

        return new Response(JSON.stringify({ status: "Success", data: historyReq.results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: "DB Error: " + error.message }), { status: 500, headers: corsHeaders });
    }
}

async function handleDeleteAccount(request: Request, env: Env, corsHeaders: Record<string, string>) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const token = authHeader.split(" ")[1];
    const jwtResult = await verifyChiyigoJWT(token, env);
    if (!jwtResult) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

    const batchStmts = [
        env.MM_DB_D1.prepare("DELETE FROM assessments WHERE user_id = ?").bind(jwtResult.sub)
    ];

    try {
        await env.MM_DB_D1.batch(batchStmts);
        return new Response(JSON.stringify({ status: "Deleted" }), { headers: corsHeaders });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

// ==========================================
// [模組 2.5] Guest 結果合併
// ==========================================
// 訪客作答時 assessments.user_id 為 NULL、guest_id 為瀏覽器產生的隨機字串。
// 註冊/登入完成後呼叫此 endpoint，把同一瀏覽器留下的訪客紀錄綁回 SSO sub。
// 只更新 user_id IS NULL 的列，避免別的使用者誤領；guest_id 清空避免重複認領。
async function handleClaimGuestResults(request: Request, env: Env, corsHeaders: Record<string, string>) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const token = authHeader.split(" ")[1];
    const jwtResult = await verifyChiyigoJWT(token, env);
    if (!jwtResult) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

    let body: { guestIds?: string[] };
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

    const guestIds = (body.guestIds || []).filter(s => typeof s === "string" && s.length > 0 && s.length < 64).slice(0, 20);
    if (guestIds.length === 0) return new Response(JSON.stringify({ status: "Noop", claimed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    try {
        const placeholders = guestIds.map(() => "?").join(",");
        const stmt = env.MM_DB_D1.prepare(
            `UPDATE assessments SET user_id = ?, guest_id = NULL WHERE user_id IS NULL AND guest_id IN (${placeholders})`
        ).bind(jwtResult.sub, ...guestIds);
        const res = await stmt.run();
        const claimed = (res as any)?.meta?.changes ?? 0;
        return new Response(JSON.stringify({ status: "Claimed", claimed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: "DB Error: " + err.message }), { status: 500, headers: corsHeaders });
    }
}

// ==========================================
// [模組 3] 測驗結果提交
// ==========================================
async function handleAssessmentSubmit(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const payload = await request.json<{ version?: string; rawScores: number[]; timeSpentMs: number; guestId?: string }>();
    if (!payload.rawScores || payload.rawScores.length !== 8) throw new Error("無效的 Payload: 必須提供八維分數陣列");

    let finalUserId: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const jwtResult = await verifyChiyigoJWT(authHeader.split(" ")[1], env);
        if (!jwtResult) {
            // 帶了 token 卻驗不過：必須拒絕，否則資料會被靜默存成訪客 → 使用者看不到歷史
            return new Response(JSON.stringify({ error: "授權已失效，請重新登入後再提交" }), { status: 401, headers: corsHeaders });
        }
        finalUserId = jwtResult.sub;
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
        `INSERT INTO assessments (id, user_id, guest_id, assessment_version, raw_scores, z_scores, result_distribution, primary_type, psychic_energy_index, time_spent_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        payload.timeSpentMs || 1000
    ).run();

    const resultData = { id: reportId, ...result, timestamp: new Date().toISOString() };
    await env.MM_CACHE_KV.put(`report:${reportId}`, JSON.stringify(resultData), { expirationTtl: 86400 });

    return new Response(JSON.stringify({ status: "Calculated", reportId: reportId, data: resultData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
