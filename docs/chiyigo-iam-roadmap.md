# chiyigo.com IAM 改動評估報告

> 來源：2026-05-09 codex 安全審查報告 + Phase 0 mbti repo 實況勘查
> 用途：給使用者評估「chiyigo 端是否要動工」的決策依據
> 範圍：只列**需要 chiyigo 配合**的項目；mbti 單邊可解的不在此檔（走 mbti Phase 1-3）

---

## TL;DR

- codex 報告 8 項風險，**7 項 mbti 單邊可解**（含 #1 的短期止血方案 A）
- 只有 **2 項真的需要 chiyigo 動工**：
  - **#1 根治版（transfer code）**：架構升級，工程量中
  - **#8 delete account step-up**：架構升級，工程量大
- **建議**：本次 mbti session 跑完短期止血就好；chiyigo 端的兩項排進獨立 roadmap，不急著動

---

## 背景：為什麼會有這份檔

mbti 是 chiyigo IAM 的 resource server，依 `CLAUDE.md` 規定，凡牽涉 IAM 邊界（OAuth / OIDC / refresh / access token / cookie / 跨子網域 SSO / 登出 / 帳號封禁 / token 撤銷 / 密碼重設 / 2FA），動工前必須中文確認。

codex 報告中與 IAM 邊界**強耦合**的項目，需評估：

1. 是否單邊修就能止血？
2. 根治需要 chiyigo 端做什麼？
3. 工程量、回歸風險、優先序？

---

## 項目 1：跨站 token via URL（codex #1）

### 現況（雙邊都有問題）

```
chiyigo 已登入使用者點「去 mbti」
  ↓
[chiyigo 端]：把 sessionStorage 的 access_token 拼進 URL fragment
  https://mbti.chiyigo.com/#chiyigo_token=<JWT>
  ↓
[mbti 接收]：index.html / login.html / dashboard.html
  讀 fragment / query → 直接寫 sessionStorage
  零驗簽、零 nonce、零 state、跳過 PKCE
```

### 風險分析

| 風險 | 嚴重度 | 說明 |
|---|---|---|
| 攻擊者塞假 token | 🔴 高 | 接收端不驗簽 → 任何 JWT 都被當合法 token 寫進 sessionStorage |
| query path 洩 referer/log | 🟡 中 | `index.html:12` 同時接 query；query 會進 server log、Referer header |
| fragment 殘留 browser history | 🟢 低 | fragment 不送 server，但 browser history、擴充套件可讀 |
| token 進 sessionStorage 後 XSS 風險 | 🟡 中 | mbti 多處 `innerHTML`（12 個檔），一旦 XSS → token 外洩 |

### 兩種修法

#### 方案 A：短期止血（mbti 單邊修，chiyigo 不用動）

**chiyigo 端：零改動**

mbti 接收端 (`index.html` / `login.html` / `dashboard.html`) 改：
- 砍掉 query 路徑、只接 fragment
- 接收後**用 mbti 既有 JWKS 驗簽 + 驗 iss + aud + exp** 才寫 sessionStorage
- 驗不過直接清 fragment、跳 PKCE 重登

**擋下的風險**：✅ 攻擊者塞假 token、✅ query referer 洩
**沒擋下**：fragment 殘留 history（仍有殘餘風險，但非 critical）

**工程量**：mbti 1-2 小時改完。**建議本次就做**。

#### 方案 B：根治（transfer code，chiyigo 大改）

**chiyigo 端要做**：

1. **新 endpoint** `POST /api/auth/oauth/transfer-code`
   - 認證：要求現有 chiyigo session（refresh cookie via `credentials: 'include'`）
   - body: `{ target_aud: "mbti" | "talo" }`
   - 邏輯：
     - 驗 refresh cookie 對應的 user
     - 驗 target_aud 在白名單
     - 產一次性 code（高熵 random，例 32 bytes b64url）
     - 存 KV `transfer_code:<code>` → `{ sub, target_aud, exp }`，TTL 60 秒
     - 回 `{ transfer_code, expires_in: 60 }`

2. **既有 token endpoint** `/api/auth/oauth/token` 加新 `grant_type: transfer_code`
   - body: `{ grant_type: "transfer_code", code, target_aud }`
   - 邏輯：
     - 從 KV 取 code → 驗 target_aud 一致 → 立刻刪除 KV（一次性）
     - 視同已驗身分，種 refresh cookie + 簽 access_token + id_token（aud=target_aud）回給子站
   - 回 `{ access_token, id_token, expires_in }`

3. **既有「跳到子站」UI 邏輯**（chiyigo dashboard / app switcher）：
   - 不再拼 token，改：先打 `/api/auth/oauth/transfer-code` 拿 code
   - 跳轉 `https://mbti.chiyigo.com/login.html#transfer_code=<code>`

**mbti 端對應改**：
- `login.html` / `index.html` / `dashboard.html` 接收端讀 `transfer_code`
- 打 `chiyigo /api/auth/oauth/token`（grant_type=transfer_code）換 access_token + id_token
- 完全 OIDC 標準流程，沒有「直接寫 sessionStorage」這條路徑

**工程量評估**：
- chiyigo 端：新 endpoint + token endpoint 加 grant_type + UI 跳轉邏輯改 + 測試（約 1-2 天）
- 整合測試（149 個）需確認沒破現有 PKCE flow
- mbti 端：3 個接收頁改 + 跨站跳轉發送端改（chiyigo-app-switcher.js, script.js:579）
- talo 端如果也用同套，要同步改

**擋下的風險**：✅ 全部
**回歸風險**：🟡 中（動 OAuth/OIDC endpoint、影響三站 SSO）

### 建議

- **本次 mbti session**：做方案 A 短期止血
- **chiyigo roadmap**：方案 B 排獨立 sprint，不急

---

## 項目 2：delete account step-up（codex #8）

### 現況

```
mbti DELETE /user/account
  ↓
只驗 bearer token（access_token 15min TTL，可能是幾分鐘前的舊登入）
  ↓
DELETE FROM assessments WHERE user_id = ?
```

### 風險

token 一旦被 XSS 或惡意擴充套件偷走，攻擊者能在 15min 內**清空使用者全部測驗紀錄**（破壞性高、不可逆，目前沒有 soft delete / 還原機制）。

### 修法（一定要 chiyigo 配合）

**chiyigo 端要做**：

1. **新 endpoint** `POST /api/auth/step-up`
   - 要求使用者重新輸密碼 / 2FA
   - 通過後簽短 TTL（例 5min）的「step-up token」
   - 或在現有 token claim 加 `acr: "urn:chiyigo:step-up"`

2. **既有 access_token 加 `auth_time` claim**（OIDC 標準 claim）
   - 讓 resource server 可判斷「這個 token 是不是剛驗過身分」
   - chiyigo 端改 token 簽發邏輯

3. **既有 PKCE / refresh flow** 不能因此破掉
   - 一般 access_token：`auth_time` = 最後一次密碼登入時間
   - step-up token：`auth_time` ≈ 當下、含 `acr` claim

**mbti 端對應改**：
- `handleDeleteAccount` 多檢查 `payload.auth_time`：
  - 若距今 > 5min → 回 `{ error: "step_up_required" }`
- 前端收到 → 跳 chiyigo step-up flow → 拿新 token 重打 DELETE

### 工程量評估

- chiyigo 端：新 step-up endpoint + 改 token claim + UI（密碼/2FA 重驗頁）+ 測試（約 2-3 天）
- 整合測試 149 個全要重跑
- 影響範圍：**所有破壞性操作**（不只 delete account，未來 unlink OAuth、改 email 等都會用到 step-up）

### 替代方案（不動 chiyigo）

**如果不想動 chiyigo**，mbti 可以做的弱化版：

1. **soft delete + 7 天還原期**：
   - 改 `DELETE FROM assessments` 為 `UPDATE SET deleted_at = NOW()`
   - 加排程 7 天後 hard delete
   - 使用者可透過 chiyigo 的「帳號還原」流程救回（chiyigo 要不要支援是另一個 roadmap）

2. **二次確認 + 30 秒延遲**：
   - 前端要求輸入「DELETE MY DATA」字串確認
   - 提交後 worker 用 KV 排隊 30 秒，期間使用者可取消

→ 這兩個都是降低風險，不是根治。**建議仍排 chiyigo step-up roadmap**，但本次不做。

### 建議

- **本次**：跳過，不動
- **chiyigo roadmap**：step-up 是長期戰略項目（未來 unlink OAuth、改 email、刪帳號都會用到），值得排
- **過渡期**：若擔心，先在 mbti 加 soft delete

---

## 整體 roadmap 建議

| 項目 | 本次做 | chiyigo roadmap | 優先序 |
|---|---|---|---|
| #1A token 接收端驗簽 | ✅ mbti Phase 1 | - | P0 |
| #1B transfer code 根治 | ❌ | ✅ | P2（半年內） |
| #8 step-up | ❌ | ✅ | P3（一年內） |
| #2-#7 其他 | ✅ mbti Phase 1-3 | - | P0-P1 |

### 為什麼建議 chiyigo 兩項都不急

1. **方案 A 已擋住核心攻擊面**（codex 點的「攻擊者塞假 token」風險）
2. **chiyigo 是 IAM authority**，改 OAuth endpoint 是高風險動作（149 整合測試 + 三站 SSO 整合）
3. **transfer code 和 step-up 是架構升級**，不是漏洞修補；應該獨立排期、獨立規劃，不混在 mbti 安全審查裡做
4. **沒有時間壓力**：目前沒有已知 exploit、沒有 PII 外洩事件

### 什麼時候應該動 chiyigo？

觸發條件（任一即啟動 chiyigo roadmap）：
- mbti / talo / chiyigo 任一站發生 XSS 事件 → step-up 立刻 P0
- 新增第 4 個子站（cross-domain SSO 複雜度上升）→ transfer code 變 P1
- 法規要求（GDPR / 個資法刪除權）需要強身分驗證 → step-up 變 P1
- 使用者回報「帳號被異常刪資料」→ step-up 立刻 P0

---

## 附錄：mbti 單邊可解的清單（不需 chiyigo 動工）

完整列出，讓你確認 chiyigo 端真的不用碰：

| codex # | 問題 | mbti 修法 | 動的檔 |
|---|---|---|---|
| #1A | URL token 接收端驗簽 | 接收後跑 JWKS 驗簽 | `index.html`, `login.html`, `dashboard.html` |
| #2 | submit 端點無 rate limit | KV / Turnstile | `src/index.ts` handleAssessmentSubmit |
| #3 | 輸入驗證鬆 | schema 加 finite/range/version 白名單 | `src/index.ts`, `src/modules/assessment.ts` |
| #4 | JWT exp optional | 改強制必填 | `src/index.ts:142` |
| #5 | guestId 弱隨機 | `crypto.randomUUID()` | `public/api.js:36` |
| #6 | 無 CSP / headers / SRI | 新增 `_headers` + SRI | `public/_headers`（新檔）+ `assessment.html` |
| #7 | 錯誤訊息回吐 internal | catch 改回泛用碼 | `src/index.ts` 三處 |

→ 共 7 項，全部 mbti repo 內可改完，不需開 chiyigo session。

---

## 給使用者的決策題

請評估下列題目，決定 chiyigo roadmap 走向：

1. **是否同意 chiyigo 端兩項都先不動？**（推薦：是）
2. **如果要排 chiyigo roadmap，哪項優先？**（推薦：transfer code 先於 step-up，因為前者擋的是已知攻擊面）
3. **要不要先在 mbti 加 soft delete 作為過渡？**（推薦：是，工程量小）
4. **是否要在 chiyigo 那邊也跑一次 codex 審查？**（推薦：是；chiyigo 是 IAM authority，安全等級應更高）

確認後可以開 chiyigo session 寫對應的 issue / 設計稿。
