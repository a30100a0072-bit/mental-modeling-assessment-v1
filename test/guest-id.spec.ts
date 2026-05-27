import { describe, it, expect } from "vitest";
// @ts-expect-error - vite raw import 沒有對應的 TS 宣告
import apiSrc from "../public/api.js?raw";

// guestId 必須走 CSPRNG。Math.random() 只有 ~46 bits 且非 cryptographic，
// 真實衝突風險（生日攻擊 ~2^23 樣本 ≈ 8M）。crypto.randomUUID() 122 bits + UUID v4 標準格式。
describe("public/api.js guestId 產生器", () => {
  it("mbti_guest_id 必須走 crypto.randomUUID()", () => {
    const setItem = /localStorage\.setItem\(\s*['"]mbti_guest_id['"]/;
    expect(apiSrc).toMatch(setItem);
    expect(apiSrc).toMatch(/crypto\.randomUUID\(\)/);
  });

  it("禁止用 Math.random 產 guestId（防迴歸）", () => {
    // 在 mbti_guest_id 賦值的上下文（前後 200 字元視窗）內不可出現 Math.random
    const idx = apiSrc.indexOf("mbti_guest_id");
    expect(idx).toBeGreaterThan(-1);
    const start = Math.max(0, idx - 200);
    const end = Math.min(apiSrc.length, idx + 200);
    const ctx = apiSrc.slice(start, end);
    expect(ctx).not.toMatch(/Math\.random/);
  });
});
