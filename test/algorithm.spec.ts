import { describe, it, expect } from "vitest";
import { processAssessmentResult, IDEAL_PROFILES, SOFTMAX_TAU } from "../src/modules/assessment";
// vite 原生支援 ?raw — 把 engine.js 內容當字串讀進來做漂移檢查
// @ts-expect-error - vite raw import 沒有對應的 TS 宣告
import engineSrc from "../public/engine.js?raw";

// ============================================================
// [模組 1] TS 端 processAssessmentResult 行為錨點
// ============================================================
// 這組 test 是後端權威算法的回歸基線：任何「分數 → primaryType」對映變了，
// 都要被擋下來重新審視。架構文件 §4 明文「前端最終渲染強制依賴 backendPrimaryType」，
// 所以這支演算法漂移會直接污染所有使用者的結果。

describe("algorithm: processAssessmentResult — 16 型理想向量自分類", () => {
  // 每個型號餵自己的理想向量，必須回傳自己。如果有，代表 cosine + softmax + 排序鏈路完整。
  for (const [type, vec] of Object.entries(IDEAL_PROFILES)) {
    it(`${type} 理想向量 → primaryType = ${type}`, () => {
      const r = processAssessmentResult(vec, 1000);
      expect(r.primaryType).toBe(type);
    });
  }
});

describe("algorithm: processAssessmentResult — 邊界與不變量", () => {
  it("零變異輸入：zScores 全 0，psychicEnergyIndex = 0，primaryType 仍為合法 16 型", () => {
    const r = processAssessmentResult([5, 5, 5, 5, 5, 5, 5, 5], 1000);
    expect(r.zScores).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(r.psychicEnergyIndex).toBe(0);
    expect(Object.keys(IDEAL_PROFILES)).toContain(r.primaryType);
  });

  it("完全平手：primaryType 取字母序最小（防止前後端各自挑不同代表）", () => {
    // 所有 zScores 為 0 → 所有 cosineSimilarity 為 0 → 所有 softmax 機率相等 → 字母序回傳 ENFJ
    const r = processAssessmentResult([0, 0, 0, 0, 0, 0, 0, 0], 1000);
    const sorted = Object.keys(IDEAL_PROFILES).sort();
    expect(r.primaryType).toBe(sorted[0]);
  });

  it("機率分佈總和約等於 100（rounding 誤差容忍 ±1）", () => {
    const r = processAssessmentResult([3, 1, 4, 1, 5, 9, 2, 6], 1234);
    const sum = Object.values(r.probabilities).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
  });

  it("輸入長度錯誤 → 拋例外（防止靜默存壞資料）", () => {
    expect(() => processAssessmentResult([1, 2, 3], 1000)).toThrow();
    expect(() => processAssessmentResult([1, 2, 3, 4, 5, 6, 7, 8, 9], 1000)).toThrow();
  });

  it("timeSpentMs = 0 不會除以 0", () => {
    const r = processAssessmentResult([1, 2, 3, 4, 5, 6, 7, 8], 0);
    expect(Number.isFinite(r.psychicEnergyIndex)).toBe(true);
  });
});

// ============================================================
// [模組 2] engine.js（前端動態算分）漂移防護
// ============================================================
// 架構文件 §4：「engine.js 與 src/modules/assessment.ts 邏輯必須 1:1 一致」。
// 前端動態題卷（D/E/F）會在中途用 engine.js 自己算 partialScore 走分流邏輯，
// 如果 IDEAL_PROFILES / TAU 跟後端不同步，使用者中途會被導去錯誤分支。
// 本檢查用 regex 比對 engine.js 原始碼裡的常數，發現漂移馬上炸 test。

describe("algorithm: engine.js 與 TS 端常數漂移檢查", () => {
  it("engine.js 內嵌的 SOFTMAX_TAU 與 TS 端一致", () => {
    // engine.js 寫法：const TAU = 0.3;
    const m = (engineSrc as string).match(/const\s+TAU\s*=\s*([\d.]+)\s*;/);
    expect(m, "engine.js 找不到 TAU 常數宣告").toBeTruthy();
    expect(parseFloat(m![1])).toBe(SOFTMAX_TAU);
  });

  it("engine.js 內嵌的 IDEAL_PROFILES 全部 16 型與 TS 端逐位元相等", () => {
    // 從 engine.js 抓 calculateLocalProbabilities 內的 IDEAL_PROFILES literal
    // 注意 engine.js 用單行格式（"INTJ": [...], "ENTJ": [...]）所以一行一型
    for (const [type, expected] of Object.entries(IDEAL_PROFILES)) {
      // 只 match 純數字陣列（限定內容為數字/逗號/空白/小數點/負號），
      // 避免抓到同檔內 `sides` 字典那種 `"INTJ": ["INTJ","ESFP",...]` 字串陣列
      const re = new RegExp(`"${type}"\\s*:\\s*\\[([\\d.\\-,\\s]+?)\\]`);
      const m = (engineSrc as string).match(re);
      expect(m, `engine.js 找不到 ${type} 的數值理想向量`).toBeTruthy();
      const got = m![1].split(",").map((s) => parseFloat(s.trim()));
      expect(got, `${type} 向量值漂移：engine.js=${got} vs assessment.ts=${expected}`).toEqual(expected);
    }
  });
});
