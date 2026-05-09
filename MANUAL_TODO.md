# MANUAL_TODO

只能由人在外部系統（Cloudflare Dashboard、瀏覽器、行銷工具）執行的事項。
程式碼層面的待辦寫在 `docs/architecture.md` §9。

> 部署刻意保持手動 `npx wrangler pages deploy`，不接 GitHub auto-deploy。

---

## 1. 端到端瀏覽器手測

驗 `/user/claim-guest-results` merge 端到端正確：

1. 開無痕視窗（清空 sessionStorage / localStorage）
2. 進 `mbti.chiyigo.com/assessment.html?v=A&new=1`，作答完成 → 結果頁應正常顯示
3. 點「進入會員儀表板」→ 跳到 chiyigo.com 登入頁
4. 完成 SSO 註冊新帳號 → 跳回 dashboard
5. **驗證**：dashboard 應看到剛才訪客身分的那一筆測驗紀錄（已被 claim 合併到新帳號）
6. 開 DevTools → Network → 找 `/user/claim-guest-results` 回應應為 200，body 含 `merged_count >= 1`

**邊界檢查**：
- 訪客做完 A、B 兩卷再註冊：兩筆都應 merge 過來
- 已登入後再做訪客身分的卷：理論上不會發生（前端應走會員路徑），若發生 claim 端點仍要冪等

---

## 2. 行銷埋碼決策（暫置中）

需要先決定：
- 用 GA4、Meta Pixel、還是兩者都要？
- 同意 cookie banner 是否要做（GDPR / CCPA 不在當前合規範圍，但仍建議）？
- 事件追蹤粒度：只追 pageview，還是 assessment-start / assessment-complete / signup 也要？

決策後再實作。建議放在 `public/` 下共用 partial 或所有 HTML 共用 `<script>` 區塊。

---

## 3. UX 大改部署後驗收（2026-05-02 部署批，commits 3ea89be → b35f691）

本次改動包含 design tokens / 測驗鍵盤操作 / Beebe 堆疊 / Onboarding / 模組差異對比 / 分享卡 /
Light mode / PWA service worker / 自訂 404 / i18n 基礎建設 / IAM bridge 同步。

> 開 `https://mbti.chiyigo.com`，依序跑下列 6 個 block。任一格沒過就回報。

### 3.1 首次造訪 onboarding（priority 高）
1. 開無痕視窗 → 進 `mbti.chiyigo.com/`
2. 600ms 後應彈出三步驟介紹（測什麼 / 怎麼測 / 結果長什麼樣）
3. 圓點切換、上一步、ESC、略過、最後一步「開始測驗」按鈕都要能動
4. dismiss 後關掉重開無痕，**不應再彈**（localStorage `mbti_onboarded_v1` 已寫入）
5. **回歸**：DevTools Console 跑 `localStorage.removeItem('mbti_onboarded_v1'); location.reload()` 應再次顯示

### 3.2 測驗流程 UX
1. 進 `assessment.html?v=A&new=1`
2. 螢幕應有：題級子進度條 + ETA、第一題自動有左側 cyan 光帶（鍵盤焦點）
3. 鍵盤：按 `1` / `2` 應勾選對應選項並自動跳到下一題；按 `↓` 切下一題
4. 每答一題右下角閃「✓ 已自動儲存」
5. **離開警告**：作答到第 5 題時按 F5，應跳「測驗尚未提交…」確認框
6. 完成第 11 題時，第 11 題上方應有「☕ 已完成 10 題…」的休息提示行
7. **D/E/F 卷的 Likert（1-5）**：手機實機按按鈕，觸控目標應 ≥ 44px、不會誤按隔壁
8. **Phase 切換**：點下一步時 questions-area 應有 fade-in-up 過場（不是瞬切）

### 3.3 結果頁
1. 跑完一卷到結果頁
2. 「Beebe 八功能堆疊」section 應渲染完成（cyan 條 4 條 + red 條 4 條，hover 有 tooltip）
3. 點「🃏 產生社群分享卡」：
   - 桌機應下載 1200×630 PNG；用圖片瀏覽器打開應看到 type 大字 + Beebe 縮圖 + 三句 tagline
   - 手機應跳系統分享 sheet（IG / Threads / LINE）— 確認 file 真的能傳給其他 app
4. **列印測試**：Ctrl+P 預覽
   - Beebe 堆疊不會被頁面切到（一段在第 1 頁、剩下在第 2 頁是錯的）
   - 意識/陰影條變深藍/深紅實色（省墨可辨識）
   - autosave-indicator / progress-sub / rest-hint / onboarding 都隱藏

### 3.4 Dashboard
1. 登入後進 `dashboard.html`
2. **必須**有至少 **2 個不同 version** 的測驗紀錄才能看到「🆚 模組差異對比」section
3. 雷達應同時疊圖 N 條（每 version 一色），legend 顯示「日常 (A) · INTJ」這類
4. 空狀態（剛註冊還沒測過）應看到自繪神經拓撲 SVG（不是 🧬 emoji）

### 3.5 PWA / Service Worker（**最高風險**）
1. DevTools → Application → Service Workers，應看到 `/sw.js` 已 activated、scope `/`
2. **登入後**進 dashboard：DevTools → Network，dashboard.html 那筆 Size 欄不應是 `(ServiceWorker)`，
   應是真的 byte 數（NO_CACHE_PATHS 生效）
3. **登出後**：清除 chiyigo cookie，重整首頁，**不應**因為 SW cache 看到舊的「進入儀表板」按鈕仍亮
4. **silent refresh 跨子網域**：從 `chiyigo.com` 點 app-switcher 過來，
   1.5 秒內 v-card 應自動回填「上次結果 · INTJ · 2 天前」狀態
5. **離線測試**：DevTools 切 Offline → 進首頁應仍能看到（network-first 失敗 fallback 到 cache）
6. **加到主畫面**（Android Chrome）：應出現 install banner，icon 看得到（雖然目前用 og-image.jpg 會被裁）
7. **更新流程**：deploy 新版後重新進站，舊 tab 應在 `updatefound` 時 toast 提示「🔄 新版已下載」

### 3.6 Light mode + 自訂 404
1. 點右上 ☀️ 切到 light mode → 整站背景應變白、文字深色、theme-color meta 改 `#f1f5f9`
2. 重整 → 應記住 light（localStorage `mbti_theme=light`）
3. 切回 dark，把 localStorage 清掉、系統改 prefer-light → 應自動跟隨
4. **科普頁巡檢**：jung-theory / beebe-model / mbti-stats / mbti-types / type-detail
   - **預期會出問題**：這幾頁有大量內嵌 `<style>` 用 hardcoded 深色 rgba，light mode 下對比度會跑掉
   - 至少要能讀，但視覺會醜。記下哪幾頁特別糟，之後 CSP 收緊那波一起重構
5. 訪問 `https://mbti.chiyigo.com/nonexistent` → 看到自訂 404（紅色神經拓撲 + 三顆 CTA），
   不是 Cloudflare Pages 預設藍底頁

### 3.7 IAM 邊界回歸
1. **Talo 跨站**：進 `talo.chiyigo.com` → 應接受 `chiyigo_token` fragment 進來
   （SSO_ALLOWED_ORIGINS 已從 `talo-web.pages.dev` 收回 `talo.chiyigo.com`）
2. **CORS**：Worker 收到 `Origin: talo-web.pages.dev`（舊 preview）的請求應**回退到 canonical**
   而非接受。可用 curl 測：
   ```
   curl -i -X OPTIONS https://mbti.chiyigo.com/api/v1/user/history \
     -H "Origin: https://talo-web.pages.dev" \
     -H "Access-Control-Request-Method: GET"
   ```
   `Access-Control-Allow-Origin` 不應 echo 回 `talo-web.pages.dev`
3. **單站登出 single sign-out**：在 mbti 點登出 → chiyigo / talo 開著的分頁應在 1 秒內也清 token
   （storage event `oidc_logout_at` 觸發）

---

## 4. 待辦：UX 大改後續（非緊急）

### 4.1 i18n native review — ☐ 未做
- ~880 字串為 LLM 一次性產出（Phase 1-2e, 2026-05-03 完工，commit `c3446c1` 收尾）
- 個別措辭需 native review；MBTI 認知功能術語要對齊：
  - Te=execution/efficiency, Ti=underlying logic, Fe=group resonance, Fi=inner conviction
  - Ni=convergent endgame, Ne=divergent possibilities, Si=stored experience/SOP, Se=physical present
- 待實機驗收：點右上 EN → assessment.html?v=A&new=1 → 應全英文（含題目）；走完一輪結果頁也應全英文

### 4.2 Cloudflare Pages debug 三大坑（紀律，不是 todo）
- HEAD method 假陽性 404 → 用 GET 驗
- wrangler 從 cwd 找 functions/，不是 deploy dir
- dashboard rollback 會把 production 釘死，要再 rollback 一次才會跟最新 push
- 詳見 CLAUDE.md 末段

---

## 5. Lighthouse 基線（建議在第一次驗收同時跑）

開 Chrome DevTools → Lighthouse，跑下列 4 個 mode 各一次，把分數截圖貼回這裡：

| 頁面 | Performance | Accessibility | Best Practices | SEO | PWA |
|---|---|---|---|---|---|
| `/` (首頁) | ___ | ___ | ___ | ___ | ___ |
| `/assessment.html?v=B&new=1` | ___ | ___ | ___ | ___ | ___ |
| `/dashboard.html`（登入後）| ___ | ___ | ___ | ___ | ___ |

**目標**：a11y ≥ 90、PWA 通過 installable 檢查、Performance ≥ 75（行動版）。
記下基線後，下次 UX 改動才知道有沒有退步。
