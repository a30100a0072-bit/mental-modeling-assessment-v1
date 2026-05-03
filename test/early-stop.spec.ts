// test/early-stop.spec.ts
// ============================================================
// Route A: Early-Stopping helpers — evaluateConfidence / canStopEarly
// 行為錨點：閾值放寬時這組 test 會立刻擋下，避免「使用者答 16 題就被判型」。
// ============================================================
import { describe, it, expect, beforeAll } from "vitest";
// vite ?raw — 把 engine.js 內容當字串讀，eval 在沙盒裡跑，不需要 jsdom
// @ts-expect-error - vite raw import 沒有對應的 TS 宣告
import engineSrc from "../public/engine.js?raw";

let evaluateConfidence: (probs: Record<string, number>) => any;
let canStopEarly: (conf: any, phasesAnswered: number) => boolean;
let calculateAxisProbabilities: (probs: Record<string, number>) => any;
let findMostAmbiguousAxis: (axisProbs: any, threshold?: number) => any;

beforeAll(() => {
  // engine.js 只用到 window.* 暴露 + typeof 守衛全域題庫；node 端沒這些都 OK
  const win: any = {};
  // 用 Function 沙盒執行；engine.js 本身 const ENGINE = {...} 會在這個 scope 內定義
  // typeof 對未宣告變數不會炸（如 mData_Likert_D），所以可直接 run
  const fn = new Function("window", engineSrc);
  fn(win);
  evaluateConfidence = win.evaluateConfidence;
  canStopEarly = win.canStopEarly;
  calculateAxisProbabilities = win.calculateAxisProbabilities;
  findMostAmbiguousAxis = win.findMostAmbiguousAxis;
});

describe("evaluateConfidence — top/second/lead 抽取", () => {
  it("正常 16 型分佈：取最高 + 次高 + lead", () => {
    const probs = { INTJ: 67, ENTJ: 12, INTP: 8, INFJ: 5, ENFP: 3, ESFP: 1, ISFJ: 1, ISTJ: 1, ESTJ: 1, ENTP: 0.5, INFP: 0.3, ENFJ: 0.2, ISTP: 0, ESTP: 0, ISFP: 0, ESFP_dup: 0 };
    const c = evaluateConfidence(probs);
    expect(c.topType).toBe("INTJ");
    expect(c.topProb).toBe(67);
    expect(c.secondType).toBe("ENTJ");
    expect(c.secondProb).toBe(12);
    expect(c.lead).toBe(55);
  });

  it("平手時取字母序最小（與後端 sort 一致，避免前後端跳型）", () => {
    const c = evaluateConfidence({ ENTJ: 50, INTJ: 50, INTP: 0 });
    expect(c.topType).toBe("ENTJ");
    expect(c.secondType).toBe("INTJ");
    expect(c.lead).toBe(0);
  });

  it("空輸入 / null 不炸", () => {
    const c1 = evaluateConfidence(null as any);
    expect(c1.topProb).toBe(0);
    expect(c1.lead).toBe(0);
    const c2 = evaluateConfidence({});
    expect(c2.topProb).toBe(0);
  });
});

describe("canStopEarly — 提早結束的閾值守門", () => {
  it("phase 1 永遠不 offer（資料太薄）", () => {
    expect(canStopEarly({ topProb: 90, lead: 80 } as any, 1)).toBe(false);
  });

  it("phase 4 永遠不 offer（已沒幾題能省）", () => {
    expect(canStopEarly({ topProb: 90, lead: 80 } as any, 4)).toBe(false);
  });

  it("phase 2: top ≥65 且 lead ≥30 才能 stop", () => {
    expect(canStopEarly({ topProb: 65, lead: 30 } as any, 2)).toBe(true);
    expect(canStopEarly({ topProb: 64.9, lead: 30 } as any, 2)).toBe(false); // top 不足
    expect(canStopEarly({ topProb: 70, lead: 29 } as any, 2)).toBe(false);   // lead 不足
  });

  it("phase 3: 閾值放寬到 top ≥55 且 lead ≥25", () => {
    expect(canStopEarly({ topProb: 55, lead: 25 } as any, 3)).toBe(true);
    expect(canStopEarly({ topProb: 60, lead: 24 } as any, 3)).toBe(false);
    expect(canStopEarly({ topProb: 54, lead: 30 } as any, 3)).toBe(false);
  });

  it("conf 是 null / 缺欄位 → 一律 false（防資料髒導致誤觸發）", () => {
    expect(canStopEarly(null, 2)).toBe(false);
    expect(canStopEarly({} as any, 2)).toBe(false);
    expect(canStopEarly({ topProb: "70" } as any, 2)).toBe(false);
  });
});

// ============================================================
// Route B: calculateAxisProbabilities + findMostAmbiguousAxis
// ============================================================
describe("calculateAxisProbabilities — 16 型 collapse 成 4 軸", () => {
  it("純 INTJ 100% → E=0, N=100, T=100, J=100", () => {
    const ax = calculateAxisProbabilities({ INTJ: 100 });
    expect(ax.E).toBe(0);
    expect(ax.N).toBe(100);
    expect(ax.T).toBe(100);
    expect(ax.J).toBe(100);
  });

  it("INTJ/ENFP 50/50 → E=50, N=100, T=50, J=50", () => {
    const ax = calculateAxisProbabilities({ INTJ: 50, ENFP: 50 });
    expect(ax.E).toBe(50);
    expect(ax.N).toBe(100);
    expect(ax.T).toBe(50);
    expect(ax.J).toBe(50);
  });

  it("空 / null → 回 null（不炸）", () => {
    expect(calculateAxisProbabilities(null as any)).toBe(null);
    expect(calculateAxisProbabilities({})).toBe(null);
  });

  it("非 4 字元 key 被忽略", () => {
    const ax = calculateAxisProbabilities({ INTJ: 60, BAD: 999, "": 1 } as any);
    expect(ax.N).toBe(100);
    expect(ax.J).toBe(100);
  });
});

describe("findMostAmbiguousAxis — 4 軸中找最接近 50/50 那條", () => {
  it("EI=51, NS=80, TF=70, JP=90 → 最模糊是 EI", () => {
    const r = findMostAmbiguousAxis({ E: 51, N: 80, T: 70, J: 90 });
    expect(r.axis).toBe("EI");
    expect(r.distance).toBeCloseTo(1, 5);
    expect(r.value).toBe(51);
  });

  it("4 軸都很篤定 (>58) → 回 null（不需要決勝題）", () => {
    expect(findMostAmbiguousAxis({ E: 80, N: 75, T: 90, J: 60 }, 8)).toBe(null);
  });

  it("threshold 自訂：threshold=2 時 51/49 算模糊但 53/47 不算", () => {
    expect(findMostAmbiguousAxis({ E: 51, N: 80, T: 70, J: 90 }, 2)?.axis).toBe("EI");
    expect(findMostAmbiguousAxis({ E: 53, N: 80, T: 70, J: 90 }, 2)).toBe(null);
  });

  it("null 輸入不炸", () => {
    expect(findMostAmbiguousAxis(null)).toBe(null);
  });
});
