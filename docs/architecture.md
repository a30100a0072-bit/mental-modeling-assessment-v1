# 認知幾何 V1 — 架構文件

> 取代舊的「全局上下文交接文檔」。SSO 遷移後架構大改，舊文檔多處已失準。
> 本文件以 master 分支實際程式碼為準，最後校正：2026-04-30。

## 1. 技術棧與部署形態

- **前端**：Cloudflare Pages，`public/` 目錄下原生 HTML/CSS/JS（無建置步驟）。
- **後端**：Cloudflare Worker (`src/index.ts`)，路由 `mbti.chiyigo.com/api/*` 由 Worker 接管。
- **資料庫**：D1 (`mm_assessment_db`)，binding `MM_DB_D1`。
- **快取**：KV (`MM_CACHE_KV`)，主要快取 SSO token introspection 結果（TTL 60s）。
- **訊息佇列**：Queue (`MM_EVENT_QUEUE`)，目前只有空骨架。

## 2. 認證模型 — chiyigo.com SSO（OAuth 2.0 PKCE）

**Worker 不簽 JWT、不存密碼、不寄信。** 所有身分判定全部委託給 `chiyigo.com` IAM。

### 2.1 登入流程（`public/auth.js`）
1. `login.html` → `startLogin()` 產 PKCE verifier/challenge/state，導向 `https://chiyigo.com/api/auth/oauth/authorize`。
2. chiyigo.com 完成登入後 redirect 回 `https://mbti.chiyigo.com/login.html?code=...&state=...`。
3. 前端用 verifier + code 換 token (`POST https://chiyigo.com/api/auth/oauth/token`)。
4. `access_token` 存 `sessionStorage.chiyigo_access_token`，`refresh_token` 存 `localStorage`。
5. 換到 token 後立刻呼叫 `/api/v1/user/claim-guest-results` 把訪客留下的紀錄綁回 SSO sub（best-effort）。

### 2.2 Worker 端 token 驗證（`src/index.ts` 中的 `verifyChiyigoJWT`）
- 命名是 JWT 但實際是 **token introspection**：對 `https://chiyigo.com/api/auth/me` 帶 Bearer token 反查身分。
- 結果以 SHA-256(token) 為 key 快取在 KV，TTL 60 秒。**注意：token 在 chiyigo 端被撤銷後最多 60 秒才會被本 Worker 拒絕**。
- 回傳 `{ sub, email, role }`，下游所有路由用 `sub` 當 user_id。

### 2.3 跨站 SSO snippet
- chiyigo.com 首頁可透過 URL fragment / query 帶 `mbti_token` 進來，在 mbti.chiyigo.com 自動寫入 sessionStorage（commits `0f991d2`、`69c51d1`）。
- CORS 白名單：`STATIC_ALLOWED_ORIGINS` + `env.SSO_ALLOWED_ORIGINS`（後者逗號分隔，免改程式即可加合作站）。

## 3. API 路由總覽（Worker `src/index.ts`）

所有路由都在 `mbti.chiyigo.com/api/*` 底下。

| Method | Path                              | 認證    | 說明 |
|--------|-----------------------------------|---------|------|
| POST   | `/api/v1/assess/version-[a-f]`    | 可選¹   | 提交測驗、跑 8 維演算法、寫入 `assessments` |
| POST   | `/api/v1/user/claim-guest-results`| 必須    | 把訪客 `guest_id` 列綁回 SSO `sub` |
| GET    | `/api/v1/user/history`            | 必須    | 取目前使用者的歷史測驗 |
| DELETE | `/api/v1/user/account`            | 必須    | 刪除目前使用者所有 `assessments` |
| GET    | `/api/v1/auth/allowed-redirects`  | 無      | 回傳 `SSO_ALLOWED_ORIGINS` 給前端做白名單檢查 |

¹ A、B 訪客可作答；C/D/E/F 無 token 一律 401（硬牆，commit `ec54785`）。

## 4. 前端模組（`public/`）

| 檔案 | 職責 |
|------|------|
| `assessment.html` + `script.js` + `engine.js` | 測驗主流程；本地端 8 維算分（Z-score → cosine → softmax τ=0.3） |
| `api.js` | `proceedToResultAPI` 把 8 維分數送後端 |
| `questions.js` | 模組 A–F 題庫與動態 probe |
| `login.html` + `auth.js` | PKCE OAuth 流程 + guest merge 觸發 |
| `dashboard.html` + `dashboard.js` | 歷史紀錄 + 綜合圖表，依賴 `/user/history` |
| `index.html` + `landing.css` | 著陸頁與導覽 |
| `type-detail.html` / `jung-theory.html` / `mbti-stats.html` / `mbti-types.html` / `beebe-model.html` | 結果詳情與科普頁 |

**雙端演算法強對齊**：`engine.js` 與 `src/modules/assessment.ts` 邏輯必須 1:1 一致。前端最終渲染強制依賴 `window.backendPrimaryType`（後端權威），前端只負責畫面。

## 5. 商業權限管控（Login-wall）

| 模組 | 需登入？ | 觸發 |
|------|---------|------|
| Phase A（日常舒適圈）| ❌ | 訪客可玩 |
| Phase B（高壓防禦）  | ❌ | 訪客可玩 |
| Phase C–F            | ✅ | 進頁就擋（`script.js:initApp` 跳 modal）+ 後端 401 硬牆 |

**雙層防禦**：前端 modal 是 UX，後端 `handleAssessmentSubmit` 對 C/D/E/F 強制檢查 token，防止繞過 modal 直接打 API。

**Guest 合併**：訪客作答時 `assessments` 的 `user_id=NULL`、`guest_id=瀏覽器隨機字串`（存 `localStorage.mbti_guest_id`）。註冊/登入完成後 `auth.js` 呼叫 `/user/claim-guest-results`，後端 `UPDATE assessments SET user_id=?, guest_id=NULL WHERE user_id IS NULL AND guest_id IN (...)`，best-effort，失敗不擋登入流程。

**目前不分層**：登入即解鎖 C–F 全部，沒有付費 entitlement claim。若要做付費分層，需要 chiyigo.com IAM 在 token 帶 claim、本 Worker 多一層判斷。

## 6. 演算法（核心）

8 個維度（Ni, Ne, Si, Se, Ti, Te, Fi, Fe），16 型理想向量存於 `personality_profiles` 表（migration `0002`）。

```
原始分數 → Z-score 標準化 → 與 16 型理想向量算 cosine similarity → softmax(τ=0.3) → 機率分佈
                                                                              ↓
                                                                        primary_type
```

**平手防呆**：當多個型號機率相等時，前後端皆強制 `localeCompare` 字母序排序（避免亂數場景下前後端各自挑不同代表）。

**God Mode（測試）**：URL 帶 `?dev=god` 喚出測試面板，可一鍵注入 INTJ / ESFP / ZERO / RANDOM 極端分數，繞過正常算分直接打 API。

## 7. 資料庫 Schema（D1 `mm_assessment_db`）

> Migration 0001 建立的 `assessments` 表經多次手動 ALTER 後 production schema 已乾淨；
> `0007` 把漂移正式記錄、`0008` 用 CREATE NEW + INSERT SELECT + DROP + RENAME 重建為 canonical 版本，
> 讓任何環境跑完所有 migration 後 schema 100% 一致。

### `assessments`（核心紀錄表）

| 欄位 | 類型 | 備註 |
|------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT | NULL 為訪客 |
| guest_id | TEXT | 訪客識別，登入後 merge 時清成 NULL |
| assessment_version | TEXT | 'A'–'F' |
| raw_scores | TEXT (JSON) | 8 維原始分數陣列 |
| z_scores | TEXT (JSON) | Z-score 標準化結果 |
| result_distribution | TEXT (JSON) | 16 型機率 |
| primary_type | TEXT | 後端權威判定 |
| psychic_energy_index | REAL | 行為訊號 |
| time_spent_ms | INTEGER | 答題耗時 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**索引**：`idx_assessments_guest_id`、`idx_assessments_user_id`（migration `0007` 建立）。

### 其他表

- `personality_profiles`：16 型 8 維理想向量（migration `0002`）。
- `question_matrix` / `system_config`：題庫與全域配置（migration `0001`，目前未廣用）。
- `users` / `security_logs`：**已 DROP**（migration `0006`，SSO 化後自家會員系統殘骸）。

## 8. 環境變數（`wrangler.toml` + secrets）

`wrangler.toml [vars]`：
- `ENGINE_VERSION = "V1"`
- `SOFTMAX_TAU = "0.3"`
- `SSO_ALLOWED_ORIGINS`：跨站合作白名單（逗號分隔）

**Secrets（不在 repo）**：目前 Worker 已不需要 secret — 認證委託 chiyigo.com、無自家 JWT 簽名、無 Resend、無 Turnstile。

## 9. 已知技術債 / 待辦

`/user/claim-guest-results` 已加 KV-based rate limit：每 SSO sub 60 秒上限 5 次呼叫，
KV 異常時 fail-open（避免外部依賴抖動把登入流程擋掉）。

### 待辦

1. **Pages 部署管道未自動化**：master push 不會自動更新 production，目前需手動
   `npx wrangler pages deploy public`。需到 Cloudflare Dashboard → Pages →
   Settings → Builds & deployments 接 GitHub 自動部署。⚠️ 注意：production custom
   domain 可能掛在不同 project alias 上，要確認對應的 project 名稱。
2. ~~沒有真實的測試~~：已補 `test/index.spec.ts` smoke suite
   （CORS preflight、404、`/auth/allowed-redirects`、CORS fallback）。
   `vitest.config.mts` 直接把 `configPath` 指向 `wrangler.toml` 即可，
   .jsonc shim 不需要。
3. **`public/` 死檔掃描**：master 已刪但 production Pages 可能還掛著的舊檔
   未做完整盤點。下次自動化部署接好後就會自然消失，不急。
4. **端到端瀏覽器手測**（從上一輪留下）：訪客 A → 註冊 → dashboard 看到那筆，
   驗 `/user/claim-guest-results` merge 端到端正確。
5. **行銷埋碼（GA4 / Meta Pixel）**：暫置中，待行銷需求明確再接。

## 10. 部署

```bash
npx wrangler deploy                                           # Worker
npx wrangler d1 migrations apply mm_assessment_db --remote    # D1 migration
npx wrangler pages deploy public                              # Pages（目前手動）
```
