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
