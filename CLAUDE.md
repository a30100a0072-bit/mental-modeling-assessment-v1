# CLAUDE.md — mental-modeling-assessment-v1（mbti.chiyigo.com）

> **此檔每次在本目錄開 session 都會被自動讀取，AI 必須遵守以下規則。**

---

## 🚨 最高原則：會員功能由 chiyigo.com 統一管轄

本專案是 **resource server**，**不持有任何會員資料**。所有與「身分認證 / 會員 / 帳號 / OAuth / OIDC / refresh token / access token / cookie / 跨子網域 SSO / 登出 / 帳號封禁 / token 撤銷 / 密碼重設 / 2FA」相關的邏輯，**一律歸 chiyigo.com（`C:\Users\User\Desktop\chiyigo.com`）的 IAM 統一管轄**。

### 動手前先中文詢問使用者

只要任務牽涉以下任一範圍，**動手寫 code 之前必須先用中文向使用者詢問確認**，不得擅自修改：

- `public/auth.js` — PKCE / OIDC client 邏輯（scope、nonce、id_token、redirect_uri）
- `public/chiyigo-auth.js` — 共用 IAM 認證工具（chiyigoFetch / chiyigoRefresh / chiyigoLogout）
- `src/index.ts` 中的 `verifyChiyigoToken` / JWKS 驗證 / `EXPECTED_ISS` / `EXPECTED_AUD` 段
- 任何 `Authorization: Bearer` 處理邏輯
- `chiyigo_access_token` / `chiyigo_id_token` sessionStorage 操作
- 跟 `chiyigo.com/api/auth/*` 互動的 fetch 呼叫
- CORS 白名單 / `SSO_ALLOWED_ORIGINS`

詢問範例（中文）：
> 「這個改動會動到 IAM 邊界（chiyigo 統一管轄的會員功能）。具體要改 X、原因 Y、影響面 Z。chiyigo 端是否需要對應改動？要繼續嗎？」

理由：mbti 與 chiyigo 是**強耦合的雙 repo 系統**，單邊改動會破壞 SSO、token 驗證、跨子網域 cookie。歷史上已多次因為單邊改動造成上線壞站。

---

## 架構邊界

```
chiyigo.com（IAM / authority）          mbti.chiyigo.com（resource server，本 repo）
─────────────────────────────           ──────────────────────────────────────
✅ 會員 DB（users / refresh_tokens）     ❌ 不存任何 user 資料
✅ 簽 access_token (ES256)              ✅ 用 JWKS 本地驗 access_token
✅ 簽 id_token                          ✅ 驗 id_token nonce（client side）
✅ 種 refresh cookie (.chiyigo.com)     ❌ 不持有 refresh token（cookie 是 chiyigo 種的）
✅ /.well-known/openid-configuration    ✅ 從 /.well-known/jwks.json 取公鑰
✅ /api/auth/oauth/authorize|token      ✅ 走 OIDC PKCE flow 拿 token
✅ /api/auth/refresh|logout             ✅ silent refresh / logout 都跨域呼叫 chiyigo
```

### token 規格（不可擅改）

- **access_token**：ES256，aud=`mbti`，iss=`https://chiyigo.com`，TTL 15min
  - claims: `sub, email, email_verified, role, status, ver, iss, aud, exp, iat`
  - 本 worker 用 JWKS 本地驗，不再呼叫 chiyigo `/api/auth/me` introspection
- **id_token**：ES256，aud=`mbti`，scope=`openid email` 才會拿到
  - claims 含 `nonce`（client 必須驗 nonce 防 replay）
- **refresh token**：HttpOnly cookie，`Domain=.chiyigo.com`，`Path=/api/auth`
  - mbti 不會也不該讀寫此 cookie；只透過 `credentials:'include'` 讓瀏覽器自動帶上

### CORS / cookie 規則

- 跟 chiyigo IAM 的 fetch 都必須 `credentials: 'include'`（`chiyigo-auth.js` 已固定）
- chiyigo 端 CORS 白名單已含 `https://mbti.chiyigo.com`
- **不可** 把 access_token 寫進 localStorage（XSS 風險），只能 sessionStorage
- **不可** 在 mbti 端持有 refresh_token（無論 storage / cookie）

---

## 部署慣例

- 本 repo **不接 GitHub auto-deploy**，部署刻意保持手動：
  - worker：`npx wrangler deploy`
  - pages：`npx wrangler pages deploy public/ --project-name=mental-modeling-assessment-v1 --branch=main --commit-message="..."`（commit message 必須是 ASCII，不能含 emoji / em-dash，否則 Cloudflare API 會 8000111 拒絕）
- 若改動牽涉 chiyigo IAM，部署順序**永遠**：
  1. chiyigo.com 先（`git push` 觸發 Pages auto-deploy）
  2. mbti worker
  3. mbti pages

順序錯會導致使用者全部踢出（cookie 無法跨域）。

### Service Worker 版號紀律

每次 `public/` 的 css / js / html 改動上線前，必須 bump `public/sw.js` 頂部的 `CACHE_VERSION`（格式 `mbti-v1-YYYY-MM-DD-NN`）。

不 bump 的話 cache-first 的舊使用者下次造訪不會拿到新版（除非檔名變動或手動清快取）。

---

## 測試底線

任何 PR 之前必須跑：
- `npm test -- --run`（vitest，27 tests 起跳）
- `npx tsc --noEmit`（型別檢查）

worker 邏輯改動還要在 chiyigo 端跑 `npm run test:int`（149 個整合測試）確認沒破 IAM 契約。

---

## 已完成的關鍵遷移（不要回退）

- ✅ **2026-05-01 OIDC Phase 2**：mbti 全 OIDC 化
  - 砍 localStorage refresh_token
  - PKCE 帶 `scope=openid email` + `nonce`
  - worker 從 introspection (`/api/auth/me`) 換成 JWKS 本地驗
  - 跨子網域共享 `Domain=.chiyigo.com` cookie
  - 生產驗證通過：silent refresh 從另一子網域帶 cookie 自動成功，不再走 PKCE 重登

- ✅ **2026-05-02 OIDC Phase 3**：id_token 完整驗證
  - 加 Discovery（不再 hardcode endpoint URL，動態 fetch `/.well-known/openid-configuration`）
  - id_token 驗證從「只驗 nonce」升到「ES256 簽章 + iss + aud + exp + nonce」5 件套
  - 採 `crypto.subtle.importKey('jwk', ...)` + `crypto.subtle.verify(ECDSA SHA-256)`，JWKS 1 小時 module-level 快取

- ✅ **2026-05-02 OIDC Phase 4**：RP-Initiated Logout + Front-Channel Logout
  - `chiyigoLogout` 跳 `chiyigo /api/auth/oauth/end-session?id_token_hint=...&post_logout_redirect_uri=https://mbti.chiyigo.com/`
  - chiyigo end_session 撤該 user 所有 refresh + 嵌 3 站 frontchannel iframe + clear cookie
  - 新檔 `public/frontchannel-logout.html`：被 chiyigo iframe 嵌入時清 sessionStorage + `localStorage.setItem('oidc_logout_at', ts)` 觸發 storage event
  - `chiyigo-auth.js` 加 storage listener：監 `oidc_logout_at` → 立刻清 token + 跳 index.html（即時 single sign-out）
  - `chiyigoLogout(redirectUrl)` 的 `redirectUrl` 參數雖保留但**已忽略**（白名單嚴格，統一回 `https://mbti.chiyigo.com/`）

任何「回到舊行為」的提議（例如把 refresh token 寫回 localStorage、把驗證改回 server-to-server introspection、把 logout 改回 fetch `/api/auth/logout`、降級 id_token 驗證強度）都必須**先中文詢問使用者並說明理由**，原則上拒絕回退。

## OIDC Single Sign-Out 邏輯邊界

**任何子站登出**（chiyigo / mbti / talo）都會：
1. 跳 chiyigo `end_session_endpoint`
2. chiyigo 撤該 user 所有 refresh tokens
3. chiyigo 回 HTML 嵌 3 站 `frontchannel-logout.html` iframe
4. iframe 清自己 sessionStorage + 寫 `oidc_logout_at` 到 localStorage
5. 三站開著的主頁分頁 storage listener 偵測 `oidc_logout_at` → 立刻清 access_token + 重 render UI
6. chiyigo 用 meta refresh 跳 post_logout_redirect_uri

**不要在 mbti 端自寫 logout 邏輯**（例如直接 fetch chiyigo logout endpoint），會繞過 single sign-out 機制讓 talo / chiyigo 主頁感知不到登出。
