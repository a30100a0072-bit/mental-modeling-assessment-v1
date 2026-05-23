import { describe, it, expect } from "vitest";
// @ts-expect-error - vite raw import 沒有對應的 TS 宣告
import engineSrc from "../public/engine.js?raw";
// @ts-expect-error - vite raw import 沒有對應的 TS 宣告
import engineEnSrc from "../public/engine-i18n-en.js?raw";
// @ts-expect-error - vite raw import 沒有對應的 TS 宣告
import resultRenderSrc from "../public/result-render.js?raw";

// ENGINE 4 個內容字典（tips / gripExit / blindspots / reports）會透過 result-render.js
// 的 innerHTML 注入結果頁。雖然內容由作者控制，仍守 i18n.js *Html opt-in 同樣的紀律：
// 純文字字典禁含 `<`，要走 HTML 必須顯式 opt-in（目前無此需求）。
// 違反即被視為 XSS 載體入口。
describe("ENGINE content dicts — no raw HTML", () => {
    it("engine.js / engine-i18n-en.js 內容字串值禁含 `<`", () => {
        const pair = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")/g;
        const offenders: string[] = [];
        const scan = (src: string, label: string) => {
            let m: RegExpExecArray | null;
            pair.lastIndex = 0;
            while ((m = pair.exec(src)) !== null) {
                const key = m[1];
                const value = m[2] !== undefined ? m[2] : m[3];
                if (value.includes("<")) offenders.push(`${label} ${key}: ${value.slice(0, 80)}`);
            }
        };
        scan(engineSrc, "engine.js");
        scan(engineEnSrc, "engine-i18n-en.js");
        expect(offenders).toEqual([]);
    });

    it("result-render.js 必須保留 escapeHtml helper（defense-in-depth 守住 ENGINE → innerHTML 路徑）", () => {
        expect(resultRenderSrc).toMatch(/function\s+escapeHtml\s*\(/);
        // 主要 sink 必須包 escapeHtml：tipsLoc / gripExit / r.b/r.c/r.g/r.p / blind
        expect(resultRenderSrc).toMatch(/escapeHtml\(tipsLoc\[/);
        expect(resultRenderSrc).toMatch(/escapeHtml\(gripExit\[/);
        expect(resultRenderSrc).toMatch(/escapeHtml\(blind\)/);
        expect(resultRenderSrc).toMatch(/escapeHtml\(r\.b\)/);
        expect(resultRenderSrc).toMatch(/escapeHtml\(r\.p\)/);
    });
});
