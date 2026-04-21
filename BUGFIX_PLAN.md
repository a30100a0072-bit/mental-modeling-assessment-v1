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

## 完成後動作

1. 所有 Bug 修完後執行 `git commit`
2. 更新 `memory/project_bugs.md` 中每個 Bug 的狀態為 ✅
