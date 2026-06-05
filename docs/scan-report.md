# 全系統掃描報告 — mental-modeling-assessment-v1

本次掃描共確認 **24** 項 finding：依 CLAUDE.md tier 分布為 **Tier 0 = 6**、**Tier 1 = 15**、**Tier 2 = 2**、**Tier 3 = 1**，其中 **4 項屬 IAM 邊界 flag-only**（禁自動修，須先中文詢問使用者、可能要動 chiyigo.com）。最高優先風險集中在兩條 root cause：(a) 外部呼叫無 timeout/AbortSignal（JWKS、error webhook、client IAM fetch — 違反 §程式碼要求「禁無限等」，Tier 0 穩定性），(b) FE/BE softmax 排序基準漂移破壞 §G「1:1 sync」correctness 契約且 parity test 有覆蓋洞。其餘為 guest-claim 隔離防禦縱深、型別/lint 強制缺失、i18n 覆蓋缺口、PII log redaction 與一批 dead code / orphan data。無跨租戶外洩、無 hardcode secret、無繞過驗證類嚴重違規。

---

## Tier 0 — 不可妥協

### [high] §G parity test 覆蓋洞：無 rounding-tie 邊界輸入，FE/BE 排序漂移靜默通過
- **檔案**：`test/algorithm.spec.ts:145-150, 158-173`（root cause）；對拍對象 `src/modules/assessment.ts:84,115-118` + `public/engine.js:130-134`
- **為何重要**：parity suite 宣稱強制 engine.js 與 assessment.ts「1:1 一致」，但唯一的 `client.sorted[0] === server.primaryType` 斷言只餵三類非邊界輸入（16 ideal vectors / 全相同 `[5,5,5,5,5,5,5,5]` / 固定 `[3,1,4,1,5,9,2,6]`），全部不踩 2-decimal tie 邊界。Tier 0 #3 Correctness + §G 明列「rounding consistency FE/BE」「tie-break stable」為 parity 必查項；缺此覆蓋 = correctness 契約無證據。
- **觸發**：`npx vitest run test/algorithm.spec.ts` → 32 passed，但程式碼實際有 FE/BE 漂移（見下條）；新增一筆 `[3,-2,-4,3,3,3,4,-4]` 的 FE `sorted[0]` vs BE `primaryType` 斷言今天就會 fail。
- **修復**：在對拍 describe 區塊加一筆已知 rounding-tie 輸入（`[3,-2,-4,3,3,3,4,-4]`）斷言 `calcLocal(...).sorted[0] === processAssessmentResult(...).primaryType`；再補一個 N 筆 small-integer 隨機 fuzz loop 鎖死未來 tie-break/rounding drift。

### [low] §G FE/BE softmax 排序基準分歧：BE 排已 round 值、FE 排未 round 值，tie 輸入 primaryType 可不同
- **檔案**：`src/modules/assessment.ts:84,115-118`（BE：先 `.toFixed(2)` 再排）+ `public/engine.js:122-134`（FE：排未 round 的 exp、排完才 round）
- **為何重要**：同一 softmax+tie-break 步驟兩端 order-of-operations 不一致，破壞 §3.9 / 註解區塊（assessment.ts:4-5、engine.js:86-88）明訂的「1:1 sync」契約，屬 Tier 0 #3 Correctness。
- **觸發**：開 `?s=` 分享連結，解碼分數落在 top-2 type 的同一 0.01% bucket（realistic 整數區間實測約 0.16%）→ 分享頁 headline 型（FE `sorted[0]`，script.js:155→result-render.js:45 fallback `MM.backend.sorted[0]`）可與原作答者 BE `primaryType` 不同。實測 `[3,-2,-4,3,3,3,4,-4]` → BE=ENTJ、FE=INTJ。
- **修復**：兩端統一排序基準。最簡：engine.js `calculateLocalProbabilities` 改成**先 round 再排**（`Number(((ev/expSum)*100).toFixed(2))` 後排序），對齊 assessment.ts。
- **註**：正常線上提交路徑不受影響（result-render.js:45 用權威 `MM.backend.primaryType`、api.js 對 BE 已 round 值重排）；mid-quiz routing probe **不受影響**（consume 機率值非 `.sorted`）。user-visible 影響近零，故 confidence low。

### [medium] error-webhook fetch 無 timeout / AbortSignal（ctx.waitUntil 內無界外部 POST）
- **檔案**：`src/modules/log.ts:45`
- **為何重要**：`logError()` fire-and-forget POST 到 operator 配置的外部 sink（Discord/Slack/collector），無 `signal`。雖有 `.catch()`（:49）+ `ctx.waitUntil`（:51）不會 crash response，但 sink 黑洞時 waitUntil promise 掛到 Workers wall-clock ceiling，每條錯誤路徑（index.ts:80/199/227/250/297/434）都拉長 invocation。直接違反 §程式碼要求「所有外部呼叫必設 timeout（明確 ms，禁無限等）」，Tier 0 #4 Stability。
- **觸發**：`ERROR_WEBHOOK_URL` 設成接受 TCP 但不回應的 sink + 任一錯誤路徑（如 D1/KV 失敗觸發 logError）→ log.ts:45 POST 在 waitUntil 內無界 pending。
- **修復**：`fetch(env.ERROR_WEBHOOK_URL, { ..., signal: AbortSignal.timeout(5000) })`；既有 `.catch()` 已吞 AbortError，abort 即釋放 waitUntil promise，無需其他改動。

---

## Tier 1 — 長期健康

### [high] tsconfig 缺 noUncheckedIndexedAccess + exactOptionalPropertyTypes（CLAUDE.md 強制）；~18 處 unchecked 存取被遮蔽
- **檔案**：`tsconfig.json:34-35`
- **為何重要**：`strict:true` 已開，但兩個 CLAUDE.md §程式碼要求明列的 flag 未開。實測開啟後 `npx tsc --noEmit` 噴 **18 個真實 error**（index.ts:146,154,159,184,209,274,323,389；assessment.ts:58,59,60,84,116），編譯器目前沒在證明這些 invariant。另：repo **完全無 ESLint 設定**（無 .eslintrc*/eslint.config.*/package.json eslint dep），§強制執行 要求的 `no-explicit-any`/`no-floating-promises` 全無自動守門。違反 Tier 1 #5/#8 + §強制執行。
- **觸發**：複製 tsconfig 開兩 flag → `npx tsc --noEmit -p <copy>` → 18 errors；現網 exit 0 只因 flag 關閉。
- **修復**：開兩 flag，逐點修：index.ts:323 守 regex group；`authHeader.split(" ")[1]` 加 undefined 守衛或抽 helper；assessment.ts 陣列存取加 bounds narrowing。新增 `eslint.config` 設 `no-explicit-any`/`no-floating-promises` 為 error。**註**：index.ts:144-159 在 verifyChiyigoToken 內屬 IAM 邊界 → 該段修復走 flag-only（見下節）；root-cause（開 flag）與非 IAM 站點可直接動。

### [high] handleClaimGuestResults `(res as any)` 多餘 cast 遮蔽已正確型別的 D1Result.meta.changes（無 // SAFETY:）
- **檔案**：`src/index.ts:293`
- **為何重要**：`(res as any)?.meta?.changes` 中 `res` 是 `D1Result`，`D1Meta.changes` 已是 `number`；70 行上的 index.ts:223 同樣存取無 cast 且型別過。`as any` 把整個 `res` 表達式型別安全剝掉：D1 API shape 漂移時 :223 會 compile error 擋下、:293 會靜默 `?? 0` 少報 claimed 進 audit log。違反 §程式碼要求「禁 any 偷懶、必附 // SAFETY:」。
- **觸發**：對照 :293 與 :223；移除 `as any` 後 `npx tsc --noEmit` 仍 exit 0。
- **修復**：`const claimed = res?.meta?.changes ?? 0;`（對齊 :223）。

### [high] 四個 `catch (error: any)` 無 // SAFETY:（把 unknown 重新放寬成 any）
- **檔案**：`src/index.ts:198, 226, 296, 433`
- **為何重要**：`strict` 下 catch 變數已是 `unknown`（useUnknownInCatchVariables），顯式 `: any` 重新放寬。error 只傳給 `logError(err: unknown)` 內部已 narrow，`any` 零收益、拆掉型別牆。違反 §程式碼要求。
- **觸發**：四行 `catch (error: any)` / `catch (err: any)`；移除 `: any` 後仍 compile clean（logError param 為 unknown）。
- **修復**：四處改 `catch (error)`（預設 unknown），無其他改動。也讓你能安全啟用 `no-explicit-any:error`。

### [high] zh PERSONALITY_DATABASE orphan：top-level `const` 使 `window.PERSONALITY_DATABASE` 永遠 undefined，整個 zh 型態頁壞掉
- **檔案**：`public/personality-data.js:4`（宣告）；消費於 `public/type-detail.js:34`
- **為何重要**：classic `<script>`（type-detail.html:85，非 module）中 top-level `const` 不會掛到 `window`。唯一消費端 `window.PERSONALITY_DATABASE || {}` → `{}` → getPersonalityData 回 undefined → renderTypeDetail 走 not-found 分支顯示「找不到該人格型態的資料」。EN sibling personality-data-en.js:10 正確用 `window.PERSONALITY_DATABASE_EN`，故僅 EN path 有效；**預設 zh-Hant locale 全 16 型 type-detail 頁皆壞**。Tier 1 #5 內容頁正確性。
- **觸發**：zh-Hant 開 `type-detail.html?type=INTJ` → 顯示 not-found。
- **修復**：`public/personality-data.js` 改 `window.PERSONALITY_DATABASE = {...}`（或檔尾 append `window.PERSONALITY_DATABASE = PERSONALITY_DATABASE;`），對齊 EN sibling 慣例。

### [high] dead function `calculatePartialPhaseScores`（script.js，零 call site）
- **檔案**：`public/script.js:530`（函式 527-540）
- **為何重要**：全 repo grep 僅自身宣告一處命中，無任何 caller/window.* 參考。其註解指向 2026-05-03 已移除的 Route A early-stop banner UI。與 §3.12 刻意保留的後台純函式（皆在 engine.js）無關，亦無 test 覆蓋。Tier 1 #9 Low Tech Debt。
- **觸發**：`grep calculatePartialPhaseScores` 全 repo 僅 1 hit。
- **修復**：刪除 script.js:527-540（含過時註解）。

### [high] dead 變數 `deltas`（dashboard.js renderDichotomyTrend）
- **檔案**：`public/dashboard.js:394`
- **為何重要**：`const deltas = ['E','N','T','F','J','P'].slice();` 宣告後從不讀取（render loop 跑的是另一個 `axes` 陣列；:401 的 `trend-deltas` 是 DOM id 非此 binding）。block-scoped local，無 global-script caveat。Tier 1 #9。
- **觸發**：每次 renderDichotomyTrend（≥2 records）配置後不讀；grep 證實零 read。
- **修復**：刪 dashboard.js:394。

### [medium] checkRateLimit isolation 路徑零 negative-test 覆蓋（user-data 隔離邊界）
- **檔案**：`src/index.ts:289-291`
- **為何重要**：`UPDATE ... WHERE user_id IS NULL AND guest_id IN (...)` 是 row user_id ownership 唯一轉移點，目前邏輯**正確**，但 CLAUDE.md 測試策略要求每個 security/isolation 邊界 ≥1 negative test，現有 test 全無覆蓋。未來 refactor 拿掉 `user_id IS NULL` 或改 bind 順序會綠燈過 CI 出 cross-user 隔離回歸。Tier 1 #8 Testability。
- **觸發**：refactor handleClaimGuestResults（掉守衛/換 bind 順序）綠燈出貨，因無 test 驗 invariant。
- **修復**：加 integration test（local D1）：seed 一筆 orphan(G1)、一筆已屬 user X、一筆 orphan(G2)，以 user Y claim `{guestIds:[G1, X's guest_id]}` 斷言只有 G1 翻給 Y、X row 不動、claimed==1。

### [medium] checkRateLimit 錯誤 log 漏 traceId — 斷掉 request↔error 關聯
- **檔案**：`src/index.ts:242, 250`
- **為何重要**：`checkRateLimit` 簽名無 traceId，:250 的 `logError('checkRateLimit:kv', err, { name, subject }, ctx)` 是 worker 中唯一 context 無 traceId 的 logError（其他 5 處皆有）。違反 §可觀測性「所有 request 必有 traceId…錯誤必帶 traceId」，且違反 code 自身 :44-47 註解宣稱的 invariant。Tier 1 #7。
- **觸發**：任一 rate-limited endpoint（history/delete/claim/assess）遇 KV outage 噴無 traceId 的 `checkRateLimit:kv` 行，operator 無法關聯 request log / X-Trace-Id。
- **修復**：`checkRateLimit` 加 `traceId: string` 參數，四個 call site（:188/213/277/335）穿入，:250 context 補 traceId。

### [medium] logError 轉發未 redact 的 client IP（PII）+ account-id 到 console + 外部 webhook（無 allowlist）
- **檔案**：`src/modules/log.ts:30-52`（root cause）；觸發於 `src/index.ts:250, 227, 297`
- **為何重要**：logError 對 `{...context}` 零 redaction、無 allowlist，同 payload 同時 console.error 進 Workers Logs 並（若設 `ERROR_WEBHOOK_URL`）POST 到外部第三方 sink。最尖銳洩漏是 raw client IP（GDPR PII）。違反 §可觀測性「Log 禁洩漏敏感（PII 必 redact；建 allowlist）」，觸及 Tier 0 secure-by-default 但定性為 Tier 1 觀測性 hygiene。（recordAudit 存 actor_sub 是已接受決策，out of scope。）
- **觸發**：guest version-A/B assess 提交時 KV throw → index.ts:335 `checkRateLimit('assess', '<client-IP>:<guestId>', ...)` → catch :250 logError 把 raw IP 寫進 Workers Logs + webhook。同 root cause 在 :227/:297 洩 identity.sub。
- **修復**：在 logError 加 field allowlist/redactor，console.error 與 webhook POST 前皆套用（drop/hash raw IP）；call-site 最小修：rate-limit subject 不塞 raw IP，改 log `name` + hashed/truncated subject + traceId。保留 §3.3 KV fail-open 與 IP-as-RL-subject 取捨。

### [low] guest-claim 信任 client 傳入 guestIds 無 ownership 證明；legacy 低熵 guest_id 可橫向劫持 orphan row
- **檔案**：`src/index.ts:284-291`
- **為何重要**：`UPDATE assessments SET user_id=?, guest_id=NULL WHERE user_id IS NULL AND guest_id IN (...)`，guestIds 全來自 request body，僅驗 type+length(1-63)+slice(0,20)，無證明 caller(sub) 真擁有那些 guest_id。唯一防線是 guest_id 為 122-bit randomUUID，但 handler 仍接受 legacy `guest_xxx`（pre-2026-05-27 用 Math.random ~46-bit）。屬 Tier 0 user-data isolation 路徑的 deny-by-default 防禦縱深缺口。
- **觸發**：持有效 token 的攻擊者 POST `{guestIds:[<猜測 legacy guest_xxx>]}` 到 `/api/v1/user/claim-guest-results`；若該 guessable guest_id 的 orphan row（user_id IS NULL）仍存在，永久綁到 attacker.sub 並出現在其 history。
- **修復**：claim path 拒絕非 canonical UUID v4 格式（`/^[0-9a-f]{8}-...-4...$/i`）使 legacy `guest_xxx` 無法再被 enumerate/claim；保留既有參數化 binding；選擇性 purge 殘留 legacy-format orphan row。**非 IAM 邊界**（純 server-side input validation），可直接在本 repo 實作。
- **註**：實際曝險近零（migration 0008 載明上線前表為空 + 既有 rate limit 下 2^46 keyspace 枚舉不可行），故 low confidence。`WHERE user_id IS NULL` 已正確擋住偷別人已認領的 row。

### [low] guestId 長度邊界 assess(<=64) vs claim(<64) 不一致 — 64 字元 guest 結果永遠無法認領
- **檔案**：`src/index.ts:284`
- **為何重要**：同一 guestId 驗證域 off-by-one：assess 接受 `length <= 64`（:370），claim filter 是 `s.length < 64`（:284，最大 63）。恰 64 字元的 guestId 可存檔卻永遠認領不回（資料孤兒）。Tier 1 #6 一致性。
- **觸發**：偽造 64 char guestId POST `/assess` 寫入 → 帶 token claim 同字串被 `s.length < 64` 濾掉，claimed=0。
- **修復**：:284 改 `s.length <= 64`，或兩處共用 `const GUEST_ID_MAX_LEN = 64` 一致用 `<=`。
- **註**：現網 guestId 為 randomUUID(36) 或更短 legacy，不會觸發，故 low；只孤兒化偽造者自己的紀錄，無隔離/安全影響。

### [medium] calculateFinalRawScores() 在 proceedToResultAPI 的 try/catch 外 — 任何 throw 永久卡 loading 畫面
- **檔案**：`public/api.js:33-35`
- **為何重要**：proceedToResultAPI 先隱藏 #quiz-flow / 顯示 #loading-screen（:28-29），再於 :34 呼叫 calculateFinalRawScores()，**在 :37 try 區塊外**；唯一 UI 復原（:128-129）在該 try 的 catch 內。throw（calculateDynamicScores 無守衛陣列索引、或 legacy phase5 缺 dA/dB）會 uncaught，loading 永不消失。Tier 1 #4/#5 robustness。
- **觸發**：`localStorage.mbti_v1_final = {phase:3,answers:{q_3_sjt_0:'99'},dynamicRoute:'SJT'}` → 開 `assessment.html?v=D` 提交 → calculateDynamicScores 在 `options[99].dims` throw → loading 卡死無復原。
- **修復**：把 :33-35 移進 :37 `try {` 之後，讓既有 catch 處理並 toast error.engineFail。

### [medium] engine.js partial-score SJT/Ranking 索引無 bounds/NaN 守衛 — 越界 index 拋 TypeError
- **檔案**：`public/engine.js:221, 235`
- **為何重要**：`activeSJT[i].options[optIdx].dims`（:221）/ `activeRanking[i].items[optIdx].dim`（:235），optIdx 直接由 localStorage 還原的 answers parse，無 finite-integer-in-range 檢查。NaN 或越界使 `options[optIdx]` undefined，`.dims`/`.dim` 拋 TypeError；因 caller 在 try/catch 外（上條）→ 卡 loading。違反「validate restored/external input」，Tier 1 防禦硬化。
- **觸發**：resume 的 D/E/F localStorage answers 含 `q_3_sjt_0 >= options.length` 或非數字 → calculateDynamicScores 在 :221 於任何 network call 前 throw。
- **修復**：`const opt = activeSJT[i].options[optIdx]; if (!opt) continue;`（ranking 同理 `if (!it) return;`），存取前驗 optIdx 為 range 內 finite integer。
- **註**：誠實 UI 不可能產生越界 index（radio value 必 0..N-1，phase3 re-render 會 scrub），唯一觸發為使用者自改 localStorage，單 session 自損、可清 localStorage 復原，故 medium。

### [medium] timeSpentMs client 端無上限，tab 開 >24h 被 worker 靜默 400 拒
- **檔案**：`public/api.js:55`
- **為何重要**：client 算 `timeSpentMs = Date.now() - MM.startTime` 無 clamp；worker 驗 `> TIME_SPENT_MS_MAX(24h)` 即回 400「Invalid timeSpentMs」（不 clamp），api.js 視非 ok 為硬失敗（:92 throw）→ 使用者見 engineFail。兩端政策不一致（client 送 raw、server 硬拒）。Tier 1 robustness。
- **觸發**：開 assessment.html，同一 live session 閒置 >24h 後作答提交 → timeSpentMs > 86400000 → worker 400 → api.js throw 顯示 error.engineFail。
- **修復**：client 送出前 clamp `Math.min(Math.max(elapsed,1), 24*60*60*1000)`（timeSpentMs server 端 received-but-unused，clamp 無害）；**勿放寬 server bound**。
- **註**：mbti_v1_final 僅成功時清除，失敗後 reload（重跑 state.js IIFE 取新 startTime）即可恢復，非永久資料遺失，故 medium。

### [low] orphan D1 table personality_profiles — seed 16 ideal vectors 從不被 worker 查詢
- **檔案**：`migrations/0002_ideal_vectors.sql:3 (CREATE) / :19 (seed)`；亦 `schema.sql:33`
- **為何重要**：worker 完全從 in-code `IDEAL_PROFILES`（assessment.ts:6）計分，`grep personality_profiles` 在 src/ 零命中。此表是與 §3.9 刻意 FE/BE pair 分離的**第三份未讀 copy**；每次 D1 deploy seed 16 row 無人讀。Tier 1 #9。
- **觸發**：worker request flow 讀 const 從不 SELECT 此表；每次 fresh D1 init 建+seed 無 reader。
- **修復**：決定意圖 — 無未來 query 則兩階段 migration 退役（停 seed → DROP TABLE + 對應 down，更新 schema.sql + migrations.spec.ts）；或加註解說明為何 seed 但不讀。**屬 DB 變更，flag-only 交使用者決策，勿自動 DROP**，遵守兩階段 SQLite teardown 紀律。

---

## Tier 2 — 工程權衡

### [high] login-wall-modal 整段硬編中文，無 data-i18n，EN locale 看到中文
- **檔案**：`public/assessment.html:120-133`
- **為何重要**：wall-title/wall-text/3 顆按鈕皆無 data-i18n，i18n.js applyDom 只翻有 data-i18n 的元素，無 JS 替換此牆 → EN 使用者全程見繁中。對照同檔 nav/sidebar 23+ 處皆有 data-i18n，屬 chrome 層 i18n 覆蓋漏洞（非已知 zh-only content 取捨）。Tier 3 #13 但定性 Tier 2 i18n 覆蓋。
- **觸發**：EN 未登入開 `assessment.html?v=C`（或 D/E/F）→ script.js:122 移 hidden 顯示權限牆 → 牆內全繁中。
- **修復**：補 data-i18n key（wall.title/wall.desc/wall.cta.*），i18n.js zh-Hant+en 字典補譯；牆內無 HTML 結構走預設 textContent，不需 *Html 後綴。

### [high] quiz-ux.js REST_TIPS 休息提示硬編中文，未走 _T() i18n helper
- **檔案**：`public/quiz-ux.js:203-217`
- **為何重要**：REST_TIPS 4 則 + fallback「已完成 ${i} 題…」直接 hardcode，與同檔其他字串（:44/76/89/302）走 _T() 的慣例不符，i18n.js 無對應 key。EN 使用者在 D/E/F 長量表（24 題 Likert）每 10 題見繁中提示，且與 i18n.js applyContentNotice 承諾的「UI in English」矛盾。Tier 2 i18n 覆蓋。
- **觸發**：EN locale 作答 >10 題量表 → injectRestHints（:209）每 10 題從 REST_TIPS 取硬編中文插入 .rest-hint。
- **修復**：REST_TIPS 改 i18n key 陣列（quiz.restTip1..4 + quiz.restTipGeneric），用 `_T(...)` 取值，zh/en 各補 5 條；注意 :220 `msg.slice(0,2)` 切 emoji 前綴，i18n 後須確認 en 前綴仍 2-char emoji，或改 `{icon,text}` 結構化物件避免 slice 假設破裂。

---

## Tier 3 — 表面層

### [high] KV `report:<uuid>` write 無 reader — orphaned side-effect / dead KV write
- **檔案**：`src/index.ts:430`
- **為何重要**：每次成功 `POST /api/v1/assess/version-*` 寫 `report:<uuid>`（24h TTL），但全 repo 無人讀（唯一 MM_CACHE_KV.get 在 :245 讀 `rl:*`）。結果已 inline 回傳並永久存 D1，client `mbti_guest_report_id` 也只 set 從不 getItem。無資料毀損/洩漏/無界成長 —— 純 write-only 浪費 + doc drift（docs/architecture.md:11 仍記為 cache）。定性 Tier 3 tidy-up。
- **觸發**：提交任一測驗 → :430 put `report:<uuid>` 進 KV；grep 證實無 code path get `report:` key，24h 後過期未用。
- **修復**：(a) 移除 :430 orphaned write（及 api.js:98 vestigial localStorage set），更新 docs/architecture.md:11；或 (b) 若計畫 shareable-report-by-id，補消費端 GET route（`GET /api/v1/report/:id` 讀 KV + D1 fallback）。無 consumer 前優先 (a)。

---

## ⚠️ IAM 邊界（flag-only，需先中文問使用者）

> 以下 4 項觸及 chiyigo.com 統一管轄的 IAM 邊界（verifyChiyigoToken / JWKS / chiyigo-auth.js），**禁自動修**。動手前須先用中文向使用者說明改動、原因、影響面，並確認 chiyigo 端是否需對應改動。

### [medium · Tier 0] JWKS fetch 無 timeout / AbortSignal — chiyigo origin 慢/掛會 block 每個 authenticated request
- **檔案**：`src/index.ts:121`
- **為何重要**：`getPublicKey()` 的 `fetch(JWKS_URL, { cf:{cacheTtl:300,cacheEverything:true} })` 無 signal。cache miss（1h TTL / cold isolate / key rotation flush）時是真 subrequest 到 chiyigo origin，若 origin 延遲尖峰會 block verifyChiyigoToken — 它在全 4 個 authenticated handler（:184/:209/:274/:389）critical path 上。違反 §程式碼要求「禁無限等」，Tier 0 #4 Stability（throw 被 catch，非 crash，是 availability/latency-amplification）。
- **觸發**：JWKS cache miss 碰上 chiyigo origin latency → :121 fetch 無界阻塞，直到 Cloudflare implicit subrequest ceiling。
- **建議（待確認）**：`fetch(JWKS_URL, { signal: AbortSignal.timeout(3000), cf:{...} })`，timeout/abort 同 `!res.ok` 處理（回 null → 401）使 JWKS outage 降級成乾淨重登。詢問重點：可接受的 ms budget（改變 chiyigo downtime 下的 auth 行為）。

### [low · Tier 0] verifyChiyigoToken 不檢查 status claim — 封禁/停用帳號在 15min access TTL 視窗內仍可操作
- **檔案**：`src/index.ts:159-169`
- **為何重要**：解出 payload 後只驗 sub/exp/iss/aud，完全不讀 `status`，但專案 CLAUDE.md token 規格明列 access_token 含 `status` claim。被封帳號（status=banned）手上未過期 access_token 在 15min 內仍可打 history/claim/delete/assess。屬比 refresh 撤銷更新鮮的封禁訊號被無條件忽略的 deny-by-default 缺口（影響受限：僅能操作自己資料、本 repo 不持有會員資料，故 low）。與 §3.3 #3 JWKS 快取延遲是不同機制。
- **觸發**：chiyigo 封禁 user → 該 user 用 <15min 未過期 access_token 打 `GET /api/v1/user/history` → verifyChiyigoToken 不讀 status → 回有效 identity → 操作成功。
- **詢問重點**：(1) chiyigo access_token 是否確實簽 status、合法值有哪些（active/banned/suspended/pending）；(2) 是否預期 resource server 在 15min 視窗內硬擋封禁帳號，或接受「撤 refresh + 等 TTL 過期」；(3) 若擋，payload 解析後加 `if (payload.status && payload.status !== 'active') return null;` + 補 negative test。

### [high · Tier 1] tsconfig flag 修復觸及 verifyChiyigoToken 內 token 解析行（IAM 段）
- **檔案**：`src/index.ts:144-159`（屬上方 tsconfig finding 的 IAM 子集）
- **為何重要**：開 noUncheckedIndexedAccess 後，verifyChiyigoToken 內 `[headerB64,payloadB64,sigB64] = parts`（受 `parts.length !== 3` 守衛，runtime-safe）會被 flag。此段在 §3.2 verifyChiyigoToken 邊界內，**修法 flag-only**。root-cause（開 flag）與非 IAM 站點（assessment.ts、index.ts:323）可直接動，僅 :144-159 須先問。
- **詢問重點**：是否在這幾行加 narrowing（如 `if (!headerB64 || !payloadB64 || !sigB64) return null;`），是否需 chiyigo 端對應感知。

### [low · Tier 1] client-side chiyigo IAM fetch（refresh/fetch）無 timeout
- **檔案**：`public/chiyigo-auth.js:33`（亦 :57, :65）
- **為何重要**：chiyigoRefresh() / chiyigoFetch() 對 chiyigo IAM `fetch` 帶 `credentials:'include'` 無 AbortSignal。皆 try/catch 包覆（degrade 成 stuck spinner 非 crash，browser/OS 有 network-level timeout，影響 per-user 可導航離開），故 Tier 1 client robustness polish。屬 §3.2 IAM-boundary 檔，flag-only。
- **觸發**：chiyigo `/api/auth/refresh` 慢/不回應於 silent login 或 401 retry → :33 fetch 卡住 awaiting UI flow（chiyigoReady / dashboard load）。
- **建議（待確認，可能無需 chiyigo 改動）**：以 `AbortSignal.timeout(ms)` 包覆使 silent-login/refresh fail-fast 到既有 null-handling path。詢問重點：可接受 timeout（影響 SSO refresh UX）。

---

## 建議修復順序

1. **[Tier 0 high]** algorithm.spec.ts 補 rounding-tie parity 測試（`test/algorithm.spec.ts`）— 先讓對拍真能抓到 drift。
2. **[Tier 0 low]** 統一 FE/BE softmax 排序基準（`engine.js:122-134` 改先 round 再排），讓步驟 1 的測試轉綠並鎖死契約。
3. **[Tier 0 medium]** error-webhook fetch 加 `AbortSignal.timeout(5000)`（`log.ts:45`）。
4. **[IAM flag-only · Tier 0]** JWKS fetch timeout（`index.ts:121`）— **先中文問使用者**；與 #3 同 root cause，但須跨 IAM 邊界確認。
5. **[IAM flag-only · Tier 0]** verifyChiyigoToken status claim 缺檢（`index.ts:159-169`）— **先中文問使用者** + 可能動 chiyigo。
6. **[Tier 1 high]** 型別/lint 強制：開兩 tsconfig flag + 新增 eslint.config（IAM 段 :144-159 走 flag-only 子流程）；連帶修 `(res as any)`（:293）與四個 `catch (error: any)`。
7. **[Tier 1 high]** zh PERSONALITY_DATABASE 掛 window（`personality-data.js:4`）— 修復預設 locale 全壞的型態頁。
8. **[Tier 1 medium]** PII redaction allowlist + checkRateLimit traceId 穿透（`log.ts` + `index.ts:242/250`，同一 logError 路徑一併處理）。
9. **[Tier 1 medium]** proceedToResultAPI try/catch 範圍修正（`api.js:33-35`）+ engine.js 索引守衛（`:221/:235`）+ timeSpentMs client clamp（`api.js:55`）。
10. **[Tier 1 medium]** claim isolation negative-test（`index.ts:289-291`）。
11. **[Tier 1 low]** guest-claim UUID 格式守衛（`index.ts:284-291`）+ guestId 長度邊界對齊（`:284`）。
12. **[Tier 2]** login-wall-modal 與 quiz-ux REST_TIPS i18n 補 key。
13. **[Tier 1 low / Tier 3 / IAM flag-only low]** dead code 清理（`script.js:530`、`dashboard.js:394`）、KV orphan write（`index.ts:430`）、orphan D1 table（flag-only 交使用者決策）、client IAM fetch timeout（flag-only）。