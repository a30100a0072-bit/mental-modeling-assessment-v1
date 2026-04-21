# Bug 修復計畫

> 建立於 2026-04-21｜每完成一步更新狀態

---

## 修復順序

```
Bug 1 → Bug 2 → Bug 3 → Bug 4 → Bug 5 → Bug 6
```

---

## ✅ Bug 1 — schema.sql 缺少 users 表

**檔案**: `schema.sql`

**修復內容**: 在 schema.sql 中新增 `users` 表定義，包含：
- `id` TEXT PRIMARY KEY
- `email` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL
- `salt` TEXT NOT NULL
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

同時在 `migrations/` 下補上對應的 migration 檔案。

---

## ✅ Bug 2 — schema.sql 缺少 assessment_version 欄位

**檔案**: `schema.sql`、`migrations/`

**修復內容**: 在 `assessments` 表中加入：
- `assessment_version TEXT DEFAULT 'B'`

同時補上對應 migration ALTER TABLE 語句。

---

## ✅ Bug 3 — 後端路由正規式擋掉 D/E/F 模組

**檔案**: `src/index.ts` 第 40 行

**修復內容**: 將正規式從 `/version-[abc]/` 改為 `/version-[a-f]/`：

```typescript
// 修復前
if (url.pathname.match(/\/assess\/version-[abc]$/i))

// 修復後
if (url.pathname.match(/\/assess\/version-[a-f]$/i))
```

---

## ✅ Bug 4 — resetRanking 按鈕後 UI 不更新

**檔案**: `public/script.js` 第 373–376 行

**修復內容**: 重寫 `resetRanking`，重設後直接重新渲染選項 DOM，不依賴 `handleRankingClick` 的副作用：

```javascript
window.resetRanking = function(qK) {
    window.rankingStates[qK] = [];
    const qIdx = parseInt(qK.split('_')[3]);
    const itemData = activeRanking[qIdx];
    const container = document.getElementById(`opts_${qK}`);
    if (!container) return;
    container.innerHTML = itemData.items.map((opt, i) => {
        return `<div class="ranking-item" onclick="handleRankingClick('${qK}', ${i}, ${itemData.items.length})" style="padding:15px; border:1px solid #1e293b; border-radius:10px; background:#162032; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; transition:0.2s;">
            <span style="line-height:1.4;">${opt.text}</span>
        </div>`;
    }).join('');
};
```

---

## ✅ Bug 5 — Phase 5 探針題題號全部寫死為 "65"

**檔案**: `public/script.js` 第 199 行

**修復內容**: 將題號改為動態計算（總題數 64 題後的序號）：

```javascript
// 修復前
qArea.innerHTML = probe.map((it, i) => `<div class="question"><p><strong>65. ${it.q}</strong>...

// 修復後
qArea.innerHTML = probe.map((it, i) => `<div class="question"><p><strong>${65 + i}. ${it.q}</strong>...
```

---

## ✅ Bug 6 — HMAC_SECRET 兼用 JWT + API Key，前端硬編碼

**檔案**: `src/index.ts`、`public/api.js`、`wrangler.toml`

**修復內容**:
1. 在 `wrangler.toml` 新增獨立的 `API_PROBE_KEY` 環境變數（secret）
2. 在 `Env` interface 加入 `API_PROBE_KEY: string`
3. `handleAssessmentSubmit` 改為比對 `env.API_PROBE_KEY` 而非 `env.HMAC_SECRET`
4. `public/api.js` 中的 `X-HMAC-Signature` 值改為實際部署時的 `API_PROBE_KEY` 值（不使用 HMAC_SECRET）

---

---

## ✅ Bug 7 — handleRegister 未驗證 password 是否存在即呼叫 .length

**嚴重程度**: 🔴 嚴重

**檔案**: `src/index.ts` 第 154 行

**問題**: 若 request body 沒有 password 欄位，`password` 為 `undefined`，`password.length < 8` 直接拋出 TypeError 導致崩潰。

**修復內容**:
```typescript
// 修復前
if (!email || password.length < 8 || !verificationCode)

// 修復後
if (!email || !password || password.length < 8 || !verificationCode)
```

---

## ✅ Bug 8 — dashboard 版本名稱對映缺 D/E/F

**嚴重程度**: 🟡 中等

**檔案**: `public/dashboard.js` 第 62–66、88 行

**問題**: `versionMap` 只有 A/B/C，D/E/F 測驗紀錄的版本名稱全部顯示為「高壓防禦 (Phase B)」。

**修復內容**: 在 `versionMap` 補上 D/E/F：
```javascript
const versionMap = {
    'A': '日常舒適圈 (Phase A)',
    'B': '高壓防禦 (Phase B)',
    'C': '覺醒願景 (Phase C)',
    'D': '日常行為量表 (Phase D)',
    'E': '決策情境量表 (Phase E)',
    'F': '認知偏好量表 (Phase F)'
};
```

---

## ✅ Bug 9 — D/E/F 卷重啟後 dynamicRoute 狀態遺失

**嚴重程度**: 🟡 中等

**檔案**: `public/script.js` 第 46 行

**問題**: `appState` 初始值沒有 `dynamicRoute`，若使用者在 Phase 2 結束後瀏覽器崩潰再回來，Phase 3 因 `dynamicRoute` 為 `undefined` 而直接進入 `FINISH` 分支送出，跳過第三階段題目。

**修復內容**:
```javascript
// 修復前
let appState = { phase: 1, answers: {} };

// 修復後
let appState = { phase: 1, answers: {}, dynamicRoute: null };
```

---

---

## ✅ Bug 10 — quick-nav-bar 左右邊界按鈕被截斷

**嚴重程度**: 🟡 中等（UI 顯示異常）

**檔案**: 全部 10 個 HTML 檔案

**問題**: WebKit/Chrome 已知行為：`overflow-x: auto` 的 flex 容器在內容溢出時，`padding-left/right` 不參與捲動空間計算，導致最左側按鈕緊貼螢幕邊緣被截斷（左 border 消失）。

**修復內容**: 移除容器左右 padding，改用首尾 `<span>` 佔位元素確保捲動空間：

```html
<!-- 修復前 -->
<div style="...padding: 10px 15px...">
    <a>模組 A</a> ... <a>模組 F</a>
</div>

<!-- 修復後 -->
<div style="...padding: 10px 0...">
    <span style="flex-shrink:0; min-width:15px;"></span>
    <a>模組 A</a> ... <a>模組 F</a>
    <span style="flex-shrink:0; min-width:15px;"></span>
</div>
```

---

---

## ✅ Bug 11 — handleResetPassword 不驗證 UPDATE 是否真正更新資料，靜默回傳成功

**嚴重程度**: 🔴 嚴重（直接導致重設密碼後仍無法登入）

**檔案**: `src/index.ts` handleResetPassword、handleLogin

**問題**:
1. D1 的 `.run()` 在 `WHERE` 不匹配任何資料列時不拋出錯誤，`meta.changes === 0` 但仍回傳 success，前端顯示「密碼已成功更新」，實際上資料庫沒有任何異動。
2. `handleLogin` 的 catch 把所有例外（包含 DB 連線錯誤、missing table）都包成「帳號或密碼錯誤」，真正原因無從得知。

**修復內容**:
- `handleResetPassword`: 改用 `.run()` 回傳值檢查 `meta.changes`，若為 0 則回傳明確錯誤
- `handleLogin`: 分開處理「找不到使用者」vs「密碼錯誤」vs「DB 錯誤」，記錄 console.error

---

---

## ✅ Bug 12 — HMAC_SECRET 未設定導致註冊/登入崩潰，且驗證碼被靜默消耗

**嚴重程度**: 🔴 嚴重（所有認證功能完全無法使用）

**檔案**: `src/index.ts` handleRegister、handleLogin

**問題**:
1. `HMAC_SECRET` 在 Cloudflare 線上環境未設定（空字串），`generateJWT` 呼叫 WebCrypto `importKey` 時拋出：`Imported HMAC key length (0) must be a non-zero value...`
2. `handleRegister` 的執行順序錯誤：DB INSERT 成功 → 驗證碼從 KV 刪除 → 才呼叫 `generateJWT` 崩潰。導致使用者看到錯誤後重試，驗證碼已被消耗，出現「驗證碼錯誤或已過期」。

**修復內容**:
- `handleRegister` / `handleLogin`：加入 `!env.HMAC_SECRET` 前置檢查，提前回傳明確的 500 錯誤
- `handleRegister`：將 `generateJWT` 移至 DB batch 寫入之前，確保 JWT 生成失敗時驗證碼不被消耗、使用者可重試

**部署端動作（需手動執行）**:
```bash
wrangler secret put HMAC_SECRET   # 輸入 32 字元以上隨機字串
wrangler deploy
```

---

## 完成後動作

1. 所有 Bug 修完後執行 `git commit` ✅
2. 更新 `memory/project_bugs.md` 中每個 Bug 的狀態為 ✅
