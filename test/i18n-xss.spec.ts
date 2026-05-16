import { describe, it, expect } from "vitest";
// @ts-expect-error - vite raw import 沒有對應的 TS 宣告
import i18nSrc from "../public/i18n.js?raw";

// XSS 防禦深度錨點：i18n.js applyDom 預設 textContent，只有 key 結尾為 `Html`
// 才會走 innerHTML。因此 LOCALES 內任何含 `<` 的字串值，其 key 都必須以 `Html` 結尾。
// 防止後續新增 HTML 字串時忘記加後綴，悄悄走回 innerHTML 路徑。
describe("i18n LOCALES — *Html opt-in convention", () => {
  it("任何含 `<` 的 string value 必須對應 *Html 結尾的 key", () => {
    // 行內全掃：LOCALES 大量 inline object（`cardA: { badge: '...', title: '...', ... }`），
    // 必須掃出該行所有 `key: 'value'` / `key: "value"` pair，不能只比對行首第一個。
    const pair = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")/g;
    const offenders: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = pair.exec(i18nSrc)) !== null) {
      const key = m[1];
      const value = m[2] !== undefined ? m[2] : m[3];
      if (!value.includes("<")) continue;
      if (!/Html$/.test(key)) offenders.push(`${key}: ${value}`);
    }
    expect(offenders).toEqual([]);
  });

  it("applyDom 預設 textContent，僅 *Html key 走 innerHTML", () => {
    // 確保 applyDom 的 invariant 沒被誤改回 unconditional innerHTML
    expect(i18nSrc).toMatch(/\/Html\$\/\.test\(key\)/);
    expect(i18nSrc).toMatch(/el\.textContent\s*=\s*txt/);
  });
});
