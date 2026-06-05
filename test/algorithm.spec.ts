import { describe, it, expect } from "vitest";
import { processAssessmentResult, calculateZScores, IDEAL_PROFILES, SOFTMAX_TAU, detectScoreAnomalies } from "../src/modules/assessment";
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
  it("零變異輸入：zScores 全 0，primaryType 仍為合法 16 型", () => {
    const r = processAssessmentResult([5, 5, 5, 5, 5, 5, 5, 5], 1000);
    expect(r.zScores).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
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

  it("timeSpentMs 不再參與計算：傳 0 仍回傳合法結果", () => {
    const r = processAssessmentResult([1, 2, 3, 4, 5, 6, 7, 8], 0);
    expect(Object.keys(IDEAL_PROFILES)).toContain(r.primaryType);
    expect(r.zScores).toHaveLength(8);
  });
});

describe("algorithm: detectScoreAnomalies — 無鑑別力提交偵測（observability）", () => {
  it("八維全 0（沒作答 / God-Mode ZERO）→ all_zero", () => {
    expect(detectScoreAnomalies([0, 0, 0, 0, 0, 0, 0, 0])).toEqual(["all_zero"]);
  });

  it("八維非零但完全相同（每題選同格）→ zero_variance", () => {
    expect(detectScoreAnomalies([5, 5, 5, 5, 5, 5, 5, 5])).toEqual(["zero_variance"]);
    expect(detectScoreAnomalies([-3, -3, -3, -3, -3, -3, -3, -3])).toEqual(["zero_variance"]);
  });

  it("正常有變異的輸入 → 無 flag", () => {
    expect(detectScoreAnomalies([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([]);
    // 與 IDEAL_PROFILES 任一型對拍：合法作答不得誤報
    expect(detectScoreAnomalies(IDEAL_PROFILES["INTJ"])).toEqual([]);
  });

  it("all_zero 與 zero_variance 互斥（全零只回 all_zero，不重複標記）", () => {
    expect(detectScoreAnomalies([0, 0, 0, 0, 0, 0, 0, 0])).not.toContain("zero_variance");
  });

  it("空陣列 → 無 flag（防呆，實際 route 已擋長度）", () => {
    expect(detectScoreAnomalies([])).toEqual([]);
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

// ============================================================
// [模組 3] engine.js z-score 公式漂移檢查
// ============================================================
// 2026-05-16 health audit 發現：client 用 `|| 1` fallback 而 server 用全 0 fallback，
// degenerate input (全選同分) 下兩端 zScores 不同。本 suite 把 engine.js 的
// calculateLocalProbabilities 抽進沙箱跑，與 server `calculateZScores` 對拍。

function loadEngineCalculateLocalProbabilities(): (s: Record<string, number>) => { probs: Record<string, number>; sorted: string[] } {
  // 抽 module-level IDEAL_PROFILES const + calculateLocalProbabilities 函式：
  // engine.js 排版讓 top-level 收尾 `};` / `}` 永遠在 column 0、內部都有縮排，
  // 「換行 + 行首 }」可唯一鎖到 top-level；CRLF / LF 都吃。
  const normalized = (engineSrc as string).replace(/\r\n/g, "\n");
  const ideal = normalized.match(/const\s+IDEAL_PROFILES\s*=\s*\{[\s\S]*?\n\};/);
  if (!ideal) throw new Error("engine.js: 找不到 module-level IDEAL_PROFILES const 宣告");
  const fn = normalized.match(/function calculateLocalProbabilities\(scores\)\s*\{[\s\S]*?\n\}\n/);
  if (!fn) throw new Error("engine.js: 找不到 calculateLocalProbabilities 函式宣告");
  // new Function 在沙箱跑：函式只用 Math / Object，不依賴瀏覽器 globals。
  // eslint-disable-next-line no-new-func
  return new Function(`${ideal[0]}; ${fn[0]}; return calculateLocalProbabilities;`)() as any;
}

describe("algorithm: engine.js z-score 公式與 TS 端對拍", () => {
  const calcLocal = loadEngineCalculateLocalProbabilities();

  // 把 8 維 raw → server 用 (engine.js orderedScores 順序：Ni,Ne,Si,Se,Ti,Te,Fi,Fe)
  const toScoresObj = (arr: number[]): Record<string, number> => ({
    Ni: arr[0], Ne: arr[1], Si: arr[2], Se: arr[3], Ti: arr[4], Te: arr[5], Fi: arr[6], Fe: arr[7],
  });

  it("std === 0（全部選同分）：client/server 都該回 16 型均分，primaryType 走字母序", () => {
    // 此 case 是 health audit 紅燈起點：舊 client 用 `|| 1` 會讓 zScores = raw - mean（非 0），
    // 相似度與 server 全 0 走 cosineSim=0 不同；任何「回退到 `|| 1`」的 PR 應被此 test 擋下。
    const server = processAssessmentResult([5, 5, 5, 5, 5, 5, 5, 5], 1000);
    const client = calcLocal(toScoresObj([5, 5, 5, 5, 5, 5, 5, 5]));

    expect(server.zScores).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    // client 應走「所有 cosineSim=0 → softmax 機率全相等」分支，sorted[0] = 字母序最小 = ENFJ
    expect(client.sorted[0]).toBe(server.primaryType);
    // softmax 機率全部接近 100/16 ≈ 6.25
    for (const v of Object.values(client.probs)) {
      expect(v).toBeGreaterThan(6.2);
      expect(v).toBeLessThan(6.3);
    }
  });

  it("非平凡輸入：engine.js zScores 與 server calculateZScores 在 client orderedScores 順序上相等", () => {
    // 取一組「mean!=0、std!=0」的代表性 input，逐位元比對 zScores
    const raw = [3, 1, 4, 1, 5, 9, 2, 6];
    const serverZ = calculateZScores(raw);
    const client = calcLocal(toScoresObj(raw));

    // 用 client.probs 反推 zScores 不容易，這裡改成「server 算法用 engine.js 抽出來的函式跑一次」
    // 由 client.sorted[0] 必為 server.primaryType 來間接證明 zScores 一致 → softmax 一致 → 排序一致
    const server = processAssessmentResult(raw, 1234);
    expect(client.sorted[0]).toBe(server.primaryType);
    // top-3 排序也必須一致（更強的證據，能擋住「std fallback 用 std===0 但浮點下緣略偏」這類 bug）
    expect(client.sorted.slice(0, 3)).toEqual(
      Object.keys(server.probabilities)
        .sort((a, b) => server.probabilities[b] - server.probabilities[a] || a.localeCompare(b))
        .slice(0, 3),
    );
    // serverZ 不漂移（鎖 z-score 公式本身）
    const mean = raw.reduce((a, b) => a + b, 0) / 8;
    const expectedStd = Math.sqrt(raw.reduce((a, b) => a + (b - mean) ** 2, 0) / 8);
    expect(serverZ[0]).toBeCloseTo((raw[0] - mean) / expectedStd, 10);
  });

  it("engine.js calculateLocalProbabilities 內不得含 `|| 1` std fallback（2026-05-16 health audit 紅燈防迴歸）", () => {
    // 純語法把關：限定在 calculateLocalProbabilities 函式範圍內 grep。
    const normalized = (engineSrc as string).replace(/\r\n/g, "\n");
    const m = normalized.match(/function calculateLocalProbabilities\(scores\)\s*\{[\s\S]*?\n\}\n/);
    expect(m, "找不到 calculateLocalProbabilities 函式範圍").toBeTruthy();
    expect(m![0], "calculateLocalProbabilities 內不該再出現 `|| 1` std fallback").not.toMatch(/\/\s*8\s*\)\s*\|\|\s*1\s*;/);
  });

  it("engine.js calculatePartialScores 內不得含 `|| 1` std fallback（2026-05-17 對稱補完）", () => {
    // calculatePartialScores 是 D/E/F 卷中途路由分流用，與 calculateLocalProbabilities 不同函式。
    // 此處 std===0 時 numerator 同步為 0 不會造成數值漂移，但 `|| 1` 範式會誤導未來修改者，
    // 統一改成 `lStd === 0 ? 0 : ...` 顯式分支，並用此 test 防迴歸。
    const normalized = (engineSrc as string).replace(/\r\n/g, "\n");
    const m = normalized.match(/function calculatePartialScores\([^)]*\)\s*\{[\s\S]*?\n\}\n/);
    expect(m, "找不到 calculatePartialScores 函式範圍").toBeTruthy();
    expect(m![0], "calculatePartialScores 內不該再出現 `|| 1` std fallback").not.toMatch(/\/\s*8\s*\)\s*\|\|\s*1\s*;/);
  });

  it("rounding-tie 邊界：FE/BE primaryType 一致（2026-06-05 scan 修正排序基準漂移）", () => {
    // 修正前 engine.js 排「未 round 的 raw exp」、assessment.ts 排「已 round 值」，
    // raw 不同但 round 後相同的 tie 輸入會選出不同 primaryType。此 input 即實測一例。
    const tie = [3, -2, -4, 3, 3, 3, 4, -4];
    expect(calcLocal(toScoresObj(tie)).sorted[0]).toBe(processAssessmentResult(tie, 1000).primaryType);
  });

  it("fuzz：小整數輸入空間 FE.sorted[0] 恆等於 BE.primaryType（鎖死 rounding/tie-break 漂移）", () => {
    // 確定性 LCG（不用 Math.random，CI 可重現）掃 400 組 -5..5 的 8 維輸入，
    // 逐組斷言前端 calculateLocalProbabilities 冠軍型 === 後端 processAssessmentResult。
    let seed = 1234567;
    const nextInt = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
    for (let n = 0; n < 400; n++) {
      const arr = Array.from({ length: 8 }, () => (nextInt() % 11) - 5);
      const fe = calcLocal(toScoresObj(arr)).sorted[0];
      const be = processAssessmentResult(arr, 1000).primaryType;
      expect(fe, `FE/BE primaryType 漂移 @ input ${JSON.stringify(arr)}`).toBe(be);
    }
  });
});
