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

beforeAll(() => {
  // engine.js 只用到 window.* 暴露 + typeof 守衛全域題庫；node 端沒這些都 OK
  const win: any = {};
  // 用 Function 沙盒執行；engine.js 本身 const ENGINE = {...} 會在這個 scope 內定義
  // typeof 對未宣告變數不會炸（如 mData_Likert_D），所以可直接 run
  const fn = new Function("window", engineSrc);
  fn(win);
  evaluateConfidence = win.evaluateConfidence;
  canStopEarly = win.canStopEarly;
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
