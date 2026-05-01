# MANUAL_TODO

只能由人在外部系統（Cloudflare Dashboard、瀏覽器、行銷工具）執行的事項。
程式碼層面的待辦寫在 `docs/architecture.md` §9。

---

## 1. 接 Cloudflare Pages 自動部署

**現況**：`master` push 不會自動更新 production，需手動 `npx wrangler pages deploy public`。

**步驟**：
1. 登入 Cloudflare Dashboard → Workers & Pages → Pages
2. 找到對應 production custom domain（`mbti.chiyigo.com`）所掛的 project
   - ⚠️ 注意：production domain 可能掛在 alias project 上，與本地 deploy 的 project 名稱不一定相同。先在 Dashboard 確認 domain 對應的是哪個 project
3. 進入該 project → Settings → Builds & deployments → Configure source
4. Connect to Git → 選 GitHub → 授權 → 選本 repo
5. 設定：
   - Production branch: `master`
   - Build command: 留空（純靜態，無 build step）
   - Build output directory: `public`
   - Root directory: 留空（repo 根目錄）
6. Save → 之後 push 到 master 會自動觸發 production 部署

**驗證**：
- 推一個 trivial commit 到 master，看 Pages 是否自動 build
- 部署成功後，Settings 看到「Production branch: master」與最新 commit hash

**完成後**：架構文件 §9 #1 與 #3 可以一併刪掉（自動部署接好後，舊 `public/` 死檔會在下一次部署時自然消失）。

---

## 2. 端到端瀏覽器手測

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

## 3. 行銷埋碼決策（暫置中）

需要先決定：
- 用 GA4、Meta Pixel、還是兩者都要？
- 同意 cookie banner 是否要做（GDPR / CCPA 不在當前合規範圍，但仍建議）？
- 事件追蹤粒度：只追 pageview，還是 assessment-start / assessment-complete / signup 也要？

決策後再實作。建議放在 `public/` 下共用 partial 或所有 HTML 共用 `<script>` 區塊。
