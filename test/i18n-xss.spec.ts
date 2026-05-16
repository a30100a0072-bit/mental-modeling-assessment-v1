import { describe, it, expect } from "vitest";
// @ts-expect-error - vite raw import 沒有對應的 TS 宣告
import i18nSrc from "../public/i18n.js?raw";

// XSS 防禦深度錨點：i18n.js applyDom 預設 textContent，只有 key 結尾為 `Html`
// 才會走 innerHTML。因此 LOCALES 內任何含 `<` 的字串值，其 key 都必須以 `Html` 結尾。
// 防止後續新增 HTML 字串時忘記加後綴，悄悄走回 innerHTML 路徑。
describe("i18n LOCALES — *Html opt-in convention", () => {
  it("任何含 `<` 的 string value 必須對應 *Html 結尾的 key", () => {
    const lines = i18nSrc.split(/\r?\n/);
    // 比對形如  `keyName: '....<....'`  或  `keyName: "...<..."` 的 entry。
    // group 1: key, group 2: value（取對應的引號內容）
    const single = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*'((?:\\.|[^'\\])*)'/;
    const double = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*"((?:\\.|[^"\\])*)"/;
    const offenders: string[] = [];
    for (const line of lines) {
      const m = single.exec(line) || double.exec(line);
      if (!m) continue;
      const key = m[1];
      const value = m[2];
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
