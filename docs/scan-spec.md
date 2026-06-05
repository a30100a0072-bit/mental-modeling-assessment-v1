# scan-spec.md — Workflow 全系統掃描判準輸入模板

> 用途：`/effort ultracode`（或手動 `Workflow`）做「全系統 bug / 錯誤 / 死碼 / 安全 / 正確性」掃描時的**判準輸入**。
> 三大區塊：**① 漏洞類別（taxonomy）｜② entry points（掃描起點）｜③ 排除規則（false-positive 過濾 + 已知取捨）**。
> 嚴重度對齊 `CLAUDE.md` 的 Tier 0–3。掃描 agent 必須把每個 finding 標 `tier` + 附 `file:line` + 可觸發路徑，否則丟棄。
>
> **本檔是 spec，不是報告。** 餵給 Workflow 當 `args`（下方有可直接貼的 JSON 區塊），或人讀著手動跑。

---

## 0. 掃描全域規則（所有 agent 共用）

- **證據門檻**：每個 finding 必附 `file:line` + 具體觸發條件 / repro。只有「理論上可能」而無觸發路徑的 → 丟棄或降級到 `note`。
- **嚴重度 = Tier**：對齊 `CLAUDE.md` 核心優先級。`tier0` finding **一律回報**（即使低信心，conjunctive blocker 不容漏）；`tier2/tier3` finding **要高信心**才回報，避免噪音。
- **此 repo 是 resource server**：不持有任何會員資料。凡是「token / OIDC / refresh / SSO / 跨子網域 cookie」的「修法」一律 **flag-only，禁自動改**，附註「需先中文問使用者 + 可能要動 chiyigo.com」。見 §3 IAM 排除。
- **客戶端是 global-script 架構，不是 ES module**：`public/*.js` 多數掛 `window.*` 全域、由 HTML `<script src>` 載入。**判死碼前必須查 HTML `<script>` 標籤 + `window.X` 全域引用**，「沒有 import」≠ 死碼（見 §3 死碼判準）。
- **$0 成本是硬約束**：任何「要付費才能修」的建議 → 不自動採用，走 `CLAUDE.md` PAID FEATURE 告警格式 flag 出來等使用者評估。
- **去重**：同一根因在多檔出現只報一次（root cause），列出所有 call site。

---

## ① 漏洞類別 taxonomy（掃描 agent 各認領一類）

每類含：`id`｜對應 Tier｜重點掃什麼｜訊號 / pattern｜信心門檻。

### A. 安全 — 認證 / 授權（Tier 0）
- 掃：所有 `handle*` 是否在動 D1 / 回資料前都過 `verifyChiyigoToken`；`Authorization: Bearer` 解析是否有 `!authHeader.startsWith("Bearer ")` 守門；C/D/E/F 版本「必須登入」硬牆（`index.ts` `GUEST_ONLY_VERSIONS`）有沒有漏；帶 token 驗不過時是否**拒絕而非靜默降級為訪客**（`handleAssessmentSubmit` 已有此防護，檢查其他 handler）。
- 訊號：新增 endpoint 沒套 token 驗證；token 驗證後沒檢查 `identity` null；route 直接 query D1 沒經身分。
- 信心門檻：低（Tier 0 一律報）。

### B. 安全 — 身分 / 資料隔離（Tier 0）
- 本站無 multi-tenant，但有**使用者資料隔離**：所有 D1 讀寫是否都帶 `WHERE user_id = ?`（`SELECT_HISTORY_BY_USER`、`DELETE ... WHERE user_id`、claim 的 `WHERE user_id IS NULL`）。
- 掃：guest → user 認領 (`handleClaimGuestResults`) 會不會誤領他人訪客紀錄（目前 `WHERE user_id IS NULL AND guest_id IN (...)`，檢查邏輯）；有沒有任何裸 query 漏掉 user scope。
- 信心門檻：低（Tier 0）。

### C. 安全 — 輸入驗證 / 注入 / 反序列化（Tier 0）
- 掃：所有外部 JSON（`request.json()`）、token payload（`JSON.parse(b64url)`）、URL fragment/query 是否邊界驗證後才進邏輯。
- 重點：`rawScores` 長度/有限數/範圍、`version` 白名單 + route 一致、`guestId` 長度上限、`questionsAnswered` 範圍、`guestIds` 陣列 slice 上限 — 是否有遺漏欄位或可繞過。
- SQL：placeholder 是否全用 `?` bind（`claim` 動態 `placeholders` 要確認只是 `?,?` 不拼字串值）。**禁字串拼接 SQL**。
- 信心門檻：低（Tier 0）。

### D. 安全 — XSS / 輸出編碼（Tier 0）
- 掃：`public/result-render.js`、`i18n.js`、任何 `innerHTML` / `insertAdjacentHTML` / `outerHTML` sink；i18n 的 `*Html` 後綴 opt-in 慣例有沒有被違反（非 `*Html` key 卻走 innerHTML）。
- 已有守門 test：`test/engine-xss.spec.ts`、`test/i18n-xss.spec.ts`。檢查新增 render path 有沒有繞過。
- 信心門檻：低（Tier 0）。

### E. 安全 — CORS / CSP / headers / secrets（Tier 0）
- 掃：`buildCorsHeaders` 白名單邏輯（`STATIC_ALLOWED_ORIGINS` + `SSO_ALLOWED_ORIGINS`）是否會反射任意 Origin；`public/_headers` 的 CSP 有無 `unsafe-inline`（已拔除，檢查回退）/ nonce 缺失 / `script-src` 過寬；hardcode secret（含測試）；access_token 是否誤寫 `localStorage`（只能 `sessionStorage`）。
- 信心門檻：低（Tier 0）。

### F. 安全 — rate limit / replay / 冪等（Tier 0）
- 掃：敏感操作（delete / claim / assess / history）是否都有 `checkRateLimit`；額度/窗口是否合理；冪等性（重複 submit 是否產生重複/矛盾結果）。
- 注意 §3 已知取捨：KV fail-open、read-then-write race、guestId 可偽造 — **這些是刻意取捨，別當新 bug 報**。只報「該有 rate limit 卻沒有」或「額度明顯錯」。
- 信心門檻：中。

### G. 正確性 — 演算法 / 前後端對拍（Tier 0）
- 掃：`assessment.ts` 的 `IDEAL_PROFILES` / z-score / cosine / softmax 與 `public/engine.js` `calculateLocalProbabilities` 是否 1:1 同步（有 `test/algorithm.spec.ts` parity 守門 — 檢查 test 是否真覆蓋、有沒有 drift）；排序 tie-break（`localeCompare`）是否穩定；除以 0 / `NaN` / `Infinity` 邊界（`stdDev===0`、`normA===0`、softmax `maxScore`）。
- 訊號：常數改一邊沒改另一邊；浮點捨入不一致；維度順序（Ni,Ne,Si,Se,Ti,Te,Fi,Fe）錯位。
- 信心門檻：低（Tier 0）。

### H. 正確性 — 狀態 / 資料完整性 / race（Tier 0）
- 掃：`assessments` 寫入 bind 順序與 `INSERT_ASSESSMENT` 欄位順序對齊（10 欄）；`audit_log` bind 順序（5 欄）；guest claim 的 `user_id`/`guest_id` 狀態轉換；KV `report:` TTL 與 D1 持久化的一致性；soft-delete / unique constraint 假設。
- 信心門檻：低（Tier 0）。

### I. 穩定性 — 錯誤處理 / timeout / 資源 / fallback（Tier 0）
- 掃：每個 async 邊界 / 外部呼叫（`fetch(JWKS_URL)`、D1、KV、webhook）有無 try/catch；**外部 fetch 有無 timeout / AbortSignal**（目前 JWKS fetch、webhook 看似無顯式 timeout → 候選 finding）；`ctx.waitUntil` 是否漏接 fire-and-forget（webhook、audit）；頂層 try/catch 是否真的兜底；floating promise（未 await 又沒 `.catch`）。
- 信心門檻：中（缺 timeout / floating promise 是真 finding）。

### J. Bug — 邏輯 / 邊界 / async（Tier 0–1）
- 掃：off-by-one、null/undefined deref、`==` vs `===` 型別強制、`Array` 解構越界（`parts[1]`）、樂觀假設（`?.meta?.changes ?? 0` 之外還有沒有沒兜底的）、Promise 未處理 rejection、early-return 漏 path。
- 訊號：`noUncheckedIndexedAccess` 開著但仍有未檢查索引；`as any` / `as unknown as` 掩蓋型別洞。
- 信心門檻：中。

### K. 死碼 / 未使用 / orphan（Tier 1）
- 掃：未引用的 export / function / const / 變數；unreachable branch；孤兒檔（沒被任何 HTML `<script>` 或 `import` 載入）；註解掉的程式區塊；未使用 i18n key；已移除 feature 的殘留（Queue / Durable Object 設定殘骸 — 但 §3 列的「已知刻意保留」不算）；dead CSS class；dead migration 假設。
- **死碼判準（防誤報，見 §0）**：client 端要查 `public/*.html` 的 `<script src>` + `window.X` 全域引用；server 端查 `import` + 動態字串。兩處都零引用才算死碼。
- 信心門檻：高（死碼誤報成本高，要 grep 全證據）。

### L. 型別 / TS 健康（Tier 1）
- 掃：`any` 偷懶（無 `// SAFETY:` 註解的）、`as unknown as`、`@ts-ignore`、`exactOptionalPropertyTypes` / `noUncheckedIndexedAccess` 違反、`worker-configuration.d.ts` 以外的型別洞。`npx tsc --noEmit` 必須乾淨 → 任何 error 都是 finding。
- 信心門檻：高（編譯器可證）。

### M. 觀測性（Tier 1，支撐 Tier 0 的部分升 Tier 0）
- 掃：每個 request 是否帶 `traceId`（已在 fetch 入口注入，檢查向下傳遞）；錯誤是否帶 traceId；敏感操作是否入 `audit_log`（delete / claim 已有，檢查新敏感操作）；**log 是否洩漏敏感**（password / token / PII / 分數本體 / 帳號 id — `CLAUDE.md` 禁；目前 anomaly log 只記 flag 不記分數，檢查其他 log 點）。
- 信心門檻：中。

### N. 架構一致性 / 可維護（Tier 1）
- 掃：error envelope 是否全走 `errorResponse`（`{error:{code,message,traceId}}`）無自創格式；命名同概念同字串（無 alias）；magic number/string 是否抽 const（`RAW_SCORE_MAX` 等已抽，檢查殘留）；domain（`assessment.ts` 純函式）有無 import infra；巨型 function（>300 行 service / >200 行 component）。
- 信心門檻：高。

### O. DB / migration（Tier 0 正確性 + Tier 1）
- 掃：每個 migration 有無 rollback（up/down）；destructive（DROP TABLE/COLUMN）是否走兩階段（SQLite 不支援 DROP COLUMN → rebuild table，要先停寫再 migrate）；index 規劃（高流量 `SELECT_HISTORY_BY_USER` 有 composite index `0010`）；N+1；pagination（history 已 `LIMIT 200`）；schema drift（`migrations.spec.ts` 對拍 `queries.ts` SQL — 檢查覆蓋）。
- 信心門檻：中。

### P. 前端 UX 紀律 / i18n / PWA（Tier 1–3）
- 掃：**測驗中途揭露分析**（型 / 信心 / 軸線 / 認知功能 / shortcut 結論）— `CLAUDE.md` 鐵則，任何在 result-area 顯示前暴露偵測過程的 = finding（但反向：提議「加預測捷徑」是 **false positive**，見 §3）；i18n 覆蓋缺口（漏標 key、硬編中文）；`sw.js` 的 `CACHE_VERSION` 是否隨 `public/` 改動 bump；accessibility / SEO / manifest 一致。
- 信心門檻：中。

---

## ② entry points（掃描起點，依信任邊界 / 風險分層）

### 🔴 Tier 0 熱區（後端 Worker — 最高優先，每行都看）
- `src/index.ts` — router、`buildCorsHeaders`、`verifyChiyigoToken`+JWKS、`handleGetHistory`、`handleDeleteAccount`、`handleClaimGuestResults`、`handleAssessmentSubmit`、`checkRateLimit`、`getClientIp`
- `src/modules/assessment.ts` — 純計分（`IDEAL_PROFILES`、zscore、cosine、softmax、`processAssessmentResult`、`detectScoreAnomalies`）
- `src/modules/log.ts` — `logError` / `logEvent` / `recordAudit`
- `src/modules/errors.ts` — `ERR_CODE` / `errorResponse`
- `src/sql/queries.ts` — 跨檔 SQL 常數

### 🟠 信任邊界（untrusted input 入口 — 配合 §C/§D 重點掃）
- HTTP 入口：`src/index.ts` `fetch()` + 路由 dispatcher
- Body parse：`request.json()`（`handleAssessmentSubmit`、`handleClaimGuestResults`）
- Token parse：`Authorization` header → `verifyChiyigoToken` → `JSON.parse(b64urlToBytes(...))`（untrusted JWT）
- Client 端 token 接收：URL **fragment + query 雙讀**（`auth.js` / SSO，見 §3 dual-read 取捨）
- 跨頁訊號：`frontchannel-logout.html` → `localStorage('oidc_logout_at')` → `chiyigo-auth.js` storage listener
- 儲存讀寫：KV（`rl:`、`report:`）、D1（assessments、audit_log）、`sessionStorage`（access/id token）
- HTML sink：`result-render.js` / `i18n.js` 的 `innerHTML`（XSS 邊界）

### 🟡 客戶端應用邏輯（global-script，掃 bug / 死碼 / XSS / UX 紀律）
- 核心流程：`engine.js`（與 `assessment.ts` 對拍）、`questions.js` / `questions-en.js`、`quiz-ux.js`、`assessment-init.js`、`state.js`（`window.MM` 跨檔 state，mutate-not-reassign）、`script.js`
- 結果 / 呈現：`result-render.js`、`api.js`（fetch worker）、`dashboard.js` / `dashboard-init.js`、`share-card.js`、`type-detail.js`、`mbti-types.js`、`mbti-stats.js`、`beebe-model.js` / `beebe-stack.js`
- 周邊：`onboarding.js`、`landing-progress.js`、`theme-toggle.js`、`toast.js`、`pwa-register.js`、`page-init-common.js`、`ui-handlers.js`、`analytics.js`、`gtag-init.js`、`login-init.js`
- i18n：`i18n.js`、`engine-i18n-en.js`、`personality-data.js` / `personality-data-en.js`
- HTML（dead-script / CSP / SEO / a11y）：`index.html`、`assessment.html`、`dashboard.html`、`login.html`、`mbti-types.html`、`mbti-stats.html`、`type-detail.html`、`jung-theory.html`、`beebe-model.html`、`404.html`、`frontchannel-logout.html`

### 🟢 基礎設施 / 設定（掃設定漂移、死設定、安全 header）
- `wrangler.toml` — bindings / routes / vars / DO migrations / observability
- `migrations/0001…0013_*.sql` + `schema.sql` — rollback / 兩階段 / index / drift
- `public/_headers` — CSP / 安全 header
- `public/sw.js` — `CACHE_VERSION` 紀律
- `public/manifest.webmanifest`、`tsconfig.json`、`vitest.config.mts`、`.prettierrc`、`.editorconfig`

### ⚪ 測試 / 腳本（掃覆蓋缺口、測試品質）
- `test/*.spec.ts`：`algorithm`（parity）、`early-stop`、`engine-xss`、`i18n-xss`、`guest-id`、`index`、`migrations`（schema drift smoke）— 檢查 critical path / security boundary 是否都有 negative test
- `scripts/*.js`：`add-feature-css`、`bump-cache`、`generate-icons`、`i18n-tag`（build-time，低風險，掃明顯 bug 即可）

---

## ③ 排除規則（false-positive 過濾 + 已知刻意取捨 — 報這些 = 噪音）

### 3.1 不掃（generated / vendored / binary）
- `worker-configuration.d.ts`（508KB，`wrangler types` 生成）
- `node_modules/`、`package-lock.json`、`.wrangler/`、`dist/`、`.git/`
- 圖檔 / 二進位：`*.png`、`*.jpg`、`og-image.jpg`、`*.webmanifest`（manifest 內容可掃，但非 code）

### 3.2 IAM 邊界 — flag-only，禁自動改（`CLAUDE.md` 專案最高原則）
以下檔的「修法」**只准 flag + 附『需先中文問使用者、可能要動 chiyigo.com』**，禁直接出 patch；提議「回退到舊行為」一律當 **false positive**：
- `public/auth.js`（PKCE / OIDC client：scope / nonce / id_token / redirect_uri）
- `public/chiyigo-auth.js`（`chiyigoFetch` / `chiyigoRefresh` / `chiyigoLogout`）
- `public/chiyigo-token-verify.js`、`public/chiyigo-app-switcher.js`、`public/frontchannel-logout.html`、`public/login.html` / `login-init.js`
- `src/index.ts` 的 `verifyChiyigoToken` / JWKS / `EXPECTED_ISS` / `EXPECTED_AUD` / `buildCorsHeaders` 白名單段
- 任何 `Authorization: Bearer` 處理、`chiyigo_access_token` / `chiyigo_id_token` sessionStorage、`chiyigo.com/api/auth/*` fetch、`SSO_ALLOWED_ORIGINS`

### 3.3 已知刻意取捨 — 別當新 bug 報（附 code 出處）
1. `checkRateLimit` read-then-write **race window** → `index.ts` 註解「降噪非加密保護，可接受」。
2. KV 異常 **fail-open** → `index.ts` checkRateLimit catch return true（刻意，避免依賴抖動擋正常流程，但有 log）。
3. **JWKS 1h 快取 → token 撤銷不即時**（15min access TTL 視窗內舊 token 仍可用）→ OIDC 標準取捨，刻意。
4. **guestId 可偽造**做 rate-limit 主體 → `index.ts`「反 spam 不是反濫用」，刻意。
5. **JWKS 本地驗取代 introspection** → 2026-05-01 OIDC Phase 2 已完成遷移，**禁提議改回 server-to-server `/api/auth/me`**。
6. `detectScoreAnomalies` **只回報不拒絕** → `assessment.ts` 刻意保留前端「系統塌陷」UX，禁提議後端硬擋。
7. `timeSpentMs` **接收但不參與計算** → `assessment.ts` 保留 signature，刻意（非 dead param bug）。
8. `psychic_energy_index` **已兩階段移除**（migration 0012）→ 禁提議加回。
9. `IDEAL_PROFILES` **前後端各一份** → 刻意（前端動態算分），`algorithm.spec.ts` parity 守門。只報「parity test 缺失 / 真的 drift」，不報「重複定義」。
10. `MM_EVENT_QUEUE`（Queue）+ `AssessmentSession`（Durable Object）**設定殘留** → `wrangler.toml` 註解說明已砍 / DO migration tag 為歷史紀錄，**禁報「缺 consumer / 未使用 binding」**。
11. `wrangler.toml` **不設 `pages_build_output_dir`** → wrangler 4.94 混合架構限制，刻意留空靠 CLI args 部署。
12. **測驗中途不揭露分析** 是鐵則 → 提議「加預測捷徑 / 顯示信心 / 軸線分析按鈕」一律 **false positive**（違反 `CLAUDE.md` UX 紀律）。`engine.js` 的 `evaluateConfidence` / `canStopEarly` / `calculateAxisProbabilities` / `findMostAmbiguousAxis` 是**後台純函式**，「沒在 UI 呼叫」是刻意，不算死碼。
13. **i18n 翻譯品質待 native review** → 翻譯生硬 / 用詞不道地 **不算 bug**（已知狀態，`reference_i18n_status`）。
14. `window.MM` **mutate（`Object.assign`）而非 reassign** → 刻意（reassign 會切斷跨檔 reference），禁提議改成 reassign。
15. **SSO token fragment + query 雙讀** → 刻意（chiyigo 三條現役 SSO path 仍依賴 query），禁提議只留 fragment。
16. Worker 對外中文錯誤訊息（如「授權已失效，請重新登入」）→ 是設計過的 UX 文案，**非 internal detail 洩漏**。

### 3.4 範圍守則（不提這類「修法」）
- **付費才能修** → 不自動採用，走 PAID FEATURE 告警 flag 等使用者評估（$0 硬約束）。
- **提前微服務化 / 過度抽象**（<3 處重複、只服務單一 caller、抽完更難讀）→ 不提議。
- **回退已完成遷移**（OIDC Phase 2–4、localStorage refresh token、introspection、logout 改 fetch）→ 一律拒絕，當 false positive。
- 純樣式 / 主觀美感偏好（Tier 3）→ 除非破壞 Tier 0–2，否則不報。

---

## ④ 餵給 Workflow 的 `args`（可直接複製）

> 把下列 JSON 當 `Workflow` 的 `args`。建議 phase 結構：**Recon（盤點 entry points）→ 各 category 並行 find（A–P 一類一 agent）→ adversarial verify（每 finding 找人反駁，套 §3 排除規則過濾）→ dedup + 依 Tier 排序 synthesize**。

```json
{
  "scanTarget": "mental-modeling-assessment-v1 (mbti.chiyigo.com resource server)",
  "globalRules": {
    "evidenceRequired": "file:line + concrete trigger/repro, else drop",
    "severity": "map to CLAUDE.md Tier 0-3; tier0 always report even low-confidence; tier2/3 require high confidence",
    "clientArch": "global <script> includes + window.* globals, NOT ES modules — verify HTML <script> tags & window refs before declaring dead code",
    "iamBoundary": "flag-only, never auto-patch auth/OIDC/SSO/token files; reverting completed migrations is a false positive",
    "costConstraint": "$0 only; paid fixes => PAID FEATURE alert, do not auto-apply",
    "dedup": "report root cause once, list all call sites"
  },
  "categories": [
    {"id": "A", "name": "authN/authZ", "tier": 0, "confidenceBar": "low"},
    {"id": "B", "name": "user-data isolation", "tier": 0, "confidenceBar": "low"},
    {"id": "C", "name": "input validation / injection", "tier": 0, "confidenceBar": "low"},
    {"id": "D", "name": "XSS / output encoding", "tier": 0, "confidenceBar": "low"},
    {"id": "E", "name": "CORS/CSP/headers/secrets", "tier": 0, "confidenceBar": "low"},
    {"id": "F", "name": "rate-limit/replay/idempotency", "tier": 0, "confidenceBar": "medium"},
    {"id": "G", "name": "algorithm correctness / FE-BE parity", "tier": 0, "confidenceBar": "low"},
    {"id": "H", "name": "state / data integrity / race", "tier": 0, "confidenceBar": "low"},
    {"id": "I", "name": "stability: error handling/timeout/resource", "tier": 0, "confidenceBar": "medium"},
    {"id": "J", "name": "logic/boundary/async bugs", "tier": 1, "confidenceBar": "medium"},
    {"id": "K", "name": "dead code / orphan / unused", "tier": 1, "confidenceBar": "high"},
    {"id": "L", "name": "TS type holes", "tier": 1, "confidenceBar": "high"},
    {"id": "M", "name": "observability / log leak", "tier": 1, "confidenceBar": "medium"},
    {"id": "N", "name": "architecture consistency / maintainability", "tier": 1, "confidenceBar": "high"},
    {"id": "O", "name": "DB / migration / index / drift", "tier": 0, "confidenceBar": "medium"},
    {"id": "P", "name": "UX discipline / i18n / PWA", "tier": 2, "confidenceBar": "medium"}
  ],
  "entryPoints": {
    "tier0_backend": ["src/index.ts", "src/modules/assessment.ts", "src/modules/log.ts", "src/modules/errors.ts", "src/sql/queries.ts"],
    "trustBoundaries": ["src/index.ts:fetch+router", "request.json()", "verifyChiyigoToken/JWT parse", "URL fragment+query token read", "frontchannel-logout->storage listener", "KV/D1 reads", "sessionStorage tokens", "result-render.js/i18n.js innerHTML"],
    "client": ["public/engine.js", "public/questions.js", "public/questions-en.js", "public/quiz-ux.js", "public/state.js", "public/script.js", "public/result-render.js", "public/api.js", "public/dashboard.js", "public/share-card.js", "public/type-detail.js", "public/mbti-types.js", "public/mbti-stats.js", "public/beebe-model.js", "public/beebe-stack.js", "public/onboarding.js", "public/landing-progress.js", "public/theme-toggle.js", "public/toast.js", "public/pwa-register.js", "public/page-init-common.js", "public/ui-handlers.js", "public/analytics.js", "public/i18n.js", "public/engine-i18n-en.js", "public/personality-data.js", "public/personality-data-en.js"],
    "html": ["public/index.html", "public/assessment.html", "public/dashboard.html", "public/login.html", "public/mbti-types.html", "public/mbti-stats.html", "public/type-detail.html", "public/jung-theory.html", "public/beebe-model.html", "public/404.html", "public/frontchannel-logout.html"],
    "infra": ["wrangler.toml", "migrations/*.sql", "schema.sql", "public/_headers", "public/sw.js", "public/manifest.webmanifest", "tsconfig.json", "vitest.config.mts"],
    "tests": ["test/algorithm.spec.ts", "test/early-stop.spec.ts", "test/engine-xss.spec.ts", "test/i18n-xss.spec.ts", "test/guest-id.spec.ts", "test/index.spec.ts", "test/migrations.spec.ts"],
    "scripts": ["scripts/add-feature-css.js", "scripts/bump-cache.js", "scripts/generate-icons.js", "scripts/i18n-tag.js"]
  },
  "exclude": {
    "files": ["worker-configuration.d.ts", "node_modules/**", "package-lock.json", ".wrangler/**", ".git/**", "*.png", "*.jpg"],
    "iamFlagOnly": ["public/auth.js", "public/chiyigo-auth.js", "public/chiyigo-token-verify.js", "public/chiyigo-app-switcher.js", "public/frontchannel-logout.html", "public/login.html", "public/login-init.js", "src/index.ts:verifyChiyigoToken", "src/index.ts:buildCorsHeaders", "EXPECTED_ISS/EXPECTED_AUD", "SSO_ALLOWED_ORIGINS"],
    "knownTradeoffs": [
      "checkRateLimit read-then-write race (intentional, noise-reduction not crypto)",
      "KV fail-open (intentional)",
      "JWKS 1h cache => token revocation not instant within 15min (OIDC standard)",
      "guestId spoofable as rate-limit subject (anti-spam not anti-abuse)",
      "JWKS local verify replaces introspection (DON'T revert)",
      "detectScoreAnomalies report-only not reject (intentional UX)",
      "timeSpentMs received but unused (signature kept)",
      "psychic_energy_index removed via migration 0012 (DON'T re-add)",
      "IDEAL_PROFILES duplicated FE/BE, parity test guards (only report missing parity or real drift)",
      "MM_EVENT_QUEUE + AssessmentSession DO removed, config remnants intentional",
      "wrangler.toml no pages_build_output_dir (intentional, wrangler 4.94 mixed-arch)",
      "no mid-quiz analysis reveal (proposing prediction shortcut = false positive)",
      "engine.js confidence/early-stop/axis fns are backstage pure fns, not dead code",
      "i18n translation quality pending native review (not a bug)",
      "window.MM mutate-not-reassign (DON'T propose reassign)",
      "SSO token fragment+query dual-read (DON'T propose fragment-only)",
      "Chinese user-facing error messages are designed UX, not internal-detail leak"
    ],
    "outOfScope": ["paid-only fixes", "premature microservices/over-abstraction", "reverting OIDC Phase 2-4 migrations", "Tier-3 pure-aesthetic prefs that don't break Tier 0-2"]
  }
}
```

---

## ⑤ 候選 finding 提示（先驗，掃描 agent 可優先驗證 / 排除）

掃描前我順手挑出的「可能真、可能已被取捨」清單，agent 應逐一驗證或套 §3 排除：

- **JWKS `fetch(JWKS_URL)` 與 error webhook `fetch` 無顯式 `AbortSignal`/timeout** → 對照 `CLAUDE.md`「所有外部呼叫必設 timeout」。**疑似真 finding（Tier 0 穩定性）**，非 §3 已列取捨。建議驗證並評估加 `AbortSignal.timeout(ms)`。
- `recordAudit` / webhook 為 fire-and-forget — 確認都有 `ctx.waitUntil` 包住（log.ts 看似有），漏的才報。
- `verifyChiyigoToken` 解構 `const [headerB64, payloadB64, sigB64] = parts` 在 `parts.length !== 3` 早退後安全 — 確認無其他越界解構。
- 死碼掃描務必對 HTML `<script>` 清單交叉比對（global-script 架構），尤其 `analytics.js` / `gtag-init.js` / 各 feature 頁 js 是否真被某 HTML 載入。

> 註：⑤ 是輔助提示不是結論；最終以 Workflow 跑完 + adversarial verify 為準。
