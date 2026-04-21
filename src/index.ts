import { processAssessmentResult } from "./modules/assessment";

export interface Env {
  ENGINE_VERSION: string;
  HMAC_SECRET: string;
  API_PROBE_KEY: string;
  RESEND_API_KEY: string;
  SOFTMAX_TAU: string;
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-HMAC-Signature, Authorization",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    
    // --- 路由分發器 ---
    if (request.method === "POST") {
      if (url.pathname.endsWith("/auth/send-verification")) return await handleSendVerification(request, env);
      if (url.pathname.endsWith("/auth/forgot-password")) return await handleForgotPassword(request, env);
      if (url.pathname.endsWith("/auth/reset-password")) return await handleResetPassword(request, env);
      if (url.pathname.endsWith("/auth/register")) return await handleRegister(request, env);
      if (url.pathname.endsWith("/auth/login")) return await handleLogin(request, env);
      if (url.pathname.match(/\/assess\/version-[a-f]$/i)) return await handleAssessmentSubmit(request, env, ctx);
    }
    
    if (request.method === "GET" && url.pathname.endsWith("/user/history")) return await handleGetHistory(request, env);
    if (request.method === "DELETE" && url.pathname.endsWith("/user/account")) return await handleDeleteAccount(request, env);
    
    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
  },

  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      console.log("Processed event:", message.body.id);
    }
  }
};

// ==========================================
// [模組 0] 郵件發送服務 (Resend)
// ==========================================
async function sendEmail(to: string, subject: string, htmlContent: string, apiKey: string) {
    if (!apiKey) throw new Error("伺服器未設定 RESEND_API_KEY");

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: '認知幾何系統 <onboarding@chiyigo.com>', 
            to: [to],
            subject: subject,
            html: htmlContent
        })
    });
    
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`郵件發送失敗: ${errorText}`);
    }
}

// ==========================================
// [模組 1] 會員認證與加密引擎 (PBKDF2 & JWT)
// ==========================================
async function hashPassword(password: string, saltString?: string) {
  const enc = new TextEncoder();
  const salt = saltString ? Uint8Array.from(atob(saltString), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const hashBuffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  return { hash: btoa(String.fromCharCode(...new Uint8Array(hashBuffer))), salt: btoa(String.fromCharCode(...salt)) };
}

async function generateJWT(userId: string, secret: string) {
  const enc = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
  const payload = btoa(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + (86400 * 7) })).replace(/=/g, ""); 
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${payload}`));
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${payload}.${signature}`;
}

async function verifyJWT(token: string, secret: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const enc = new TextEncoder();
    
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expectedSigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${payload}`));
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedSigBuf))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    if (signature !== expectedSig) return null;
    
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4; if(pad) base64 += '='.repeat(4 - pad);
    const payloadObj = JSON.parse(atob(base64));
    if (payloadObj.exp && Math.floor(Date.now() / 1000) > payloadObj.exp) return null;
    
    return payloadObj.sub;
  } catch (e) { return null; }
}

async function handleSendVerification(request: Request, env: Env) {
    try {
        const { email } = await request.json<{email: string}>();
        if (!email || !email.includes('@')) throw new Error("無效的 Email 格式");

        const existing = await env.MM_DB_D1.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
        if (existing) return new Response(JSON.stringify({ error: "此信箱已經註冊過了" }), { status: 409, headers: corsHeaders });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        await env.MM_CACHE_KV.put(`verify:${email}`, code, { expirationTtl: 900 });

        const html = `<div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
            <h2 style="color: #38bdf8;">認知幾何 V1 - 神經連結認證</h2>
            <p>您的專屬註冊驗證碼為：</p>
            <h1 style="color: #6ee7b7; letter-spacing: 5px;">${code}</h1>
            <p style="color: #94a3b8; font-size: 12px;">此驗證碼將於 15 分鐘後失效，請勿外洩。</p>
        </div>`;

        await sendEmail(email, "【認知幾何】帳號註冊驗證碼", html, env.RESEND_API_KEY);

        return new Response(JSON.stringify({ status: "Verification code sent" }), { headers: corsHeaders });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

async function handleRegister(request: Request, env: Env) {
  try {
    const { email, password, verificationCode, guestReportId } = await request.json<{email: string, password: string, verificationCode: string, guestReportId?: string}>();
    if (!email || !password || password.length < 8 || !verificationCode) throw new Error("無效的輸入資料");

    // 提前檢查 HMAC_SECRET，避免 DB 寫入後才崩潰導致驗證碼被消耗
    if (!env.HMAC_SECRET) return new Response(JSON.stringify({ error: "伺服器設定錯誤，請聯繫管理員" }), { status: 500, headers: corsHeaders });

    const savedCode = await env.MM_CACHE_KV.get(`verify:${email}`);
    if (!savedCode || savedCode !== verificationCode) {
        return new Response(JSON.stringify({ error: "驗證碼錯誤或已過期" }), { status: 400, headers: corsHeaders });
    }

    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const recentRegs = await env.MM_DB_D1.prepare("SELECT COUNT(*) as count FROM security_logs WHERE ip_address = ? AND action = 'register' AND timestamp > datetime('now', '-1 hour')").bind(clientIp).first("count") as number;
    if (recentRegs >= 3) return new Response(JSON.stringify({ error: "此 IP 註冊過於頻繁" }), { status: 429, headers: corsHeaders });

    const userId = crypto.randomUUID();
    const { hash, salt } = await hashPassword(password);

    // 先生成 JWT，確保 HMAC_SECRET 可用才執行 DB 寫入
    const token = await generateJWT(userId, env.HMAC_SECRET);

    const batchStmts = [
      env.MM_DB_D1.prepare("INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)").bind(userId, email, hash, salt),
      env.MM_DB_D1.prepare("INSERT INTO security_logs (ip_address, action) VALUES (?, 'register')").bind(clientIp)
    ];

    if (guestReportId) {
        batchStmts.push(env.MM_DB_D1.prepare("UPDATE assessments SET user_id = ? WHERE id = ?").bind(userId, guestReportId));
    }

    await env.MM_DB_D1.batch(batchStmts);
    await env.MM_CACHE_KV.delete(`verify:${email}`);

    return new Response(JSON.stringify({ status: "Registered", token, userId }), { headers: corsHeaders });
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) return new Response(JSON.stringify({ error: "信箱已被註冊" }), { status: 409, headers: corsHeaders });
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
  }
}

async function handleLogin(request: Request, env: Env) {
  try {
    const { email, password } = await request.json<{email: string, password: string}>();
    if (!email || !password) return new Response(JSON.stringify({ error: "帳號或密碼錯誤" }), { status: 401, headers: corsHeaders });
    if (!env.HMAC_SECRET) return new Response(JSON.stringify({ error: "伺服器設定錯誤，請聯繫管理員" }), { status: 500, headers: corsHeaders });

    let user: Record<string, unknown> | null;
    try {
      user = await env.MM_DB_D1.prepare("SELECT id, password_hash, salt FROM users WHERE email = ?").bind(email).first();
    } catch (dbErr: any) {
      console.error("[handleLogin] DB error:", dbErr.message);
      return new Response(JSON.stringify({ error: "伺服器內部錯誤，請稍後再試" }), { status: 500, headers: corsHeaders });
    }

    if (!user) return new Response(JSON.stringify({ error: "帳號或密碼錯誤" }), { status: 401, headers: corsHeaders });

    const { hash } = await hashPassword(password, user.salt as string);
    if (hash !== user.password_hash) return new Response(JSON.stringify({ error: "帳號或密碼錯誤" }), { status: 401, headers: corsHeaders });

    const token = await generateJWT(user.id as string, env.HMAC_SECRET);
    return new Response(JSON.stringify({ status: "Logged In", token, userId: user.id }), { headers: corsHeaders });
  } catch (err: any) {
    console.error("[handleLogin] Unexpected error:", err.message);
    return new Response(JSON.stringify({ error: "伺服器內部錯誤，請稍後再試" }), { status: 500, headers: corsHeaders });
  }
}

async function handleForgotPassword(request: Request, env: Env) {
    try {
        const { email } = await request.json<{email: string}>();
        if (!email) throw new Error("請輸入有效的 Email");

        const existing = await env.MM_DB_D1.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
        
        if (!existing) return new Response(JSON.stringify({ status: "If email exists, reset link was sent" }), { headers: corsHeaders });

        const resetToken = crypto.randomUUID();
        await env.MM_CACHE_KV.put(`reset:${resetToken}`, email, { expirationTtl: 900 });

        const resetUrl = `https://mbti.chiyigo.com/reset-password.html?token=${resetToken}`;

        const html = `<div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
            <h2 style="color: #38bdf8;">認知幾何 V1 - 密碼重設申請</h2>
            <p>系統收到您的密碼重設請求。請點擊下方連結進行重設：</p>
            <br>
            <a href="${resetUrl}" style="background: #38bdf8; color: #0f172a; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 5px;">重新設定密碼</a>
            <br><br>
            <p style="color: #94a3b8; font-size: 12px;">此連結將於 15 分鐘後失效。若非本人操作，請忽略此信件。</p>
        </div>`;

        await sendEmail(email, "【認知幾何】帳號密碼重設", html, env.RESEND_API_KEY);

        return new Response(JSON.stringify({ status: "If email exists, reset link was sent" }), { headers: corsHeaders });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

async function handleResetPassword(request: Request, env: Env) {
    try {
        const { token, newPassword } = await request.json<{token: string, newPassword: string}>();
        if (!token || !newPassword || newPassword.length < 8) throw new Error("無效的輸入資料");

        const email = await env.MM_CACHE_KV.get(`reset:${token}`);
        if (!email) return new Response(JSON.stringify({ error: "重設連結無效或已過期" }), { status: 400, headers: corsHeaders });

        const { hash, salt } = await hashPassword(newPassword);
        
        const result = await env.MM_DB_D1.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE email = ?").bind(hash, salt, email).run();
        if (!result.meta || result.meta.changes === 0) {
            console.error("[handleResetPassword] UPDATE matched 0 rows for email:", email);
            return new Response(JSON.stringify({ error: "找不到對應帳號，密碼更新失敗" }), { status: 400, headers: corsHeaders });
        }
        await env.MM_CACHE_KV.delete(`reset:${token}`);

        return new Response(JSON.stringify({ status: "Password successfully updated" }), { headers: corsHeaders });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

// ==========================================
// [模組 2] 演算法大腦核心引擎與歷史資料
// ==========================================
async function handleGetHistory(request: Request, env: Env) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
        
        const token = authHeader.split(" ")[1];
        const userId = await verifyJWT(token, env.HMAC_SECRET);
        if (!userId) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

        // [修復]: 精準撈出 assessment_version，不再為 undefined
        const historyReq = await env.MM_DB_D1.prepare(
            "SELECT id, assessment_version, raw_scores, z_scores, result_distribution, primary_type, created_at as timestamp FROM assessments WHERE user_id = ? ORDER BY created_at DESC"
        ).bind(userId).all();

        return new Response(JSON.stringify({ status: "Success", data: historyReq.results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: "DB Error: " + error.message }), { status: 500, headers: corsHeaders });
    }
}

async function handleDeleteAccount(request: Request, env: Env) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    
    const token = authHeader.split(" ")[1];
    const userId = await verifyJWT(token, env.HMAC_SECRET);
    if (!userId) return new Response(JSON.stringify({ error: "Invalid or Expired Token" }), { status: 401, headers: corsHeaders });

    const batchStmts = [
        env.MM_DB_D1.prepare("DELETE FROM users WHERE id = ?").bind(userId),
        env.MM_DB_D1.prepare("DELETE FROM assessments WHERE user_id = ?").bind(userId)
    ];

    try {
        await env.MM_DB_D1.batch(batchStmts);
        return new Response(JSON.stringify({ status: "Deleted" }), { headers: corsHeaders });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

async function handleAssessmentSubmit(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const clientHmac = request.headers.get("X-HMAC-Signature");
  if (!clientHmac || clientHmac !== env.API_PROBE_KEY) return new Response(JSON.stringify({ error: "Unauthorized Probe" }), { status: 401, headers: corsHeaders });

  try {
    // [修復]: payload 新增 version 參數接收
    const payload = await request.json<{ version?: string; rawScores: number[]; timeSpentMs: number; guestId?: string }>();
    if (!payload.rawScores || payload.rawScores.length !== 8) throw new Error("無效的 Payload: 必須提供八維分數陣列");

    let finalUserId: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const verifiedId = await verifyJWT(authHeader.split(" ")[1], env.HMAC_SECRET);
        if (verifiedId) finalUserId = verifiedId;
    }

    const result = processAssessmentResult(payload.rawScores, payload.timeSpentMs || 1000);
    const reportId = crypto.randomUUID();
    
    // 防呆：前端沒傳的話預設為 B
    const submitVersion = payload.version || "B";

    // [修復]: INSERT 指令加入 assessment_version
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