import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { SELECT_HISTORY_BY_USER, INSERT_ASSESSMENT, INSERT_AUDIT_LOG } from "../src/sql/queries";

// Migration smoke test：保證 migrations/ 全套跑完後，D1 schema 與 worker
// 實際 query 的欄位、index 完全對齊。
//
// 為什麼要在 beforeAll 自己跑而不是靠 miniflare 自動套：vitest-pool-workers 不會
// 套用 wrangler.toml `migrations_dir`（這欄位只給 `wrangler d1 migrations apply` 用），
// 所以 test pool 起來時 D1 是空的。本 spec 用 vite `?raw` 把所有 .sql 拉成字串、
// 按檔名排序逐檔 exec，重現 production migrate flow。
//
// 守備範圍：
//   1) 任一 migration body 語法錯 / 順序衝突 → exec throw → 整檔 fail
//   2) critical table 存在 / 廢棄 table 已 drop
//   3) assessments 欄位齊全（worker SELECT/INSERT 用得到的全列出）
//   4) critical index 存在 / dead index 已 drop
//   5) worker 真實 SELECT / INSERT 語句不 throw
//
// 不守備：migration body 的 SQL 語意正確（例如 backfill 是否漏列），由 PR
// review + 手動 staging apply 把關。

const MM_DB_D1 = env.MM_DB_D1 as D1Database;

// 用 import.meta.glob + ?raw 在 vite build 階段把 SQL 內嵌成字串，
// 避開 workerd runtime 沒 node:fs 的限制。
const sqlModules = import.meta.glob("../migrations/*.sql", {
    eager: true,
    query: "?raw",
    import: "default",
}) as Record<string, string>;

async function tableNames(): Promise<Set<string>> {
    const r = await MM_DB_D1.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'"
    ).all<{ name: string }>();
    return new Set((r.results ?? []).map(row => row.name));
}

async function indexNames(): Promise<Set<string>> {
    const r = await MM_DB_D1.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    ).all<{ name: string }>();
    return new Set((r.results ?? []).map(row => row.name));
}

async function columnNames(table: string): Promise<Set<string>> {
    const r = await MM_DB_D1.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    return new Set((r.results ?? []).map(row => row.name));
}

// D1 `.exec()` 要求每 statement 自己一行、不接受純註解行，所以本地測試前要先
// 把 SQL 預處理成：移除 `--` 行註解、依 `;` 拆 statement、逐筆 prepare().run()。
// production migrate 走 wrangler `d1 migrations apply` 是另一條 path，這裡只是
// 在 vitest 內模擬出夠接近的 schema 推進效果。
//
// Stateful parser（取代舊版 naive split）：追蹤 single-quote / double-quote 內，
// 也追蹤 `--` line-comment 是否處於字串字面值之外。
// 守住的場景：
//   - `'foo;bar'`、`'a -- b'`、`"col;name"` 內含 `;` 或 `--` 不會被誤切
//   - SQLite 字串字面值跳脫是 doubled quote (`'it''s'`)，本 parser 在
//     quote 內遇到下一個同類 quote 即視為結束（next char 若仍是同 quote，
//     parser 把它當「再進入新 quote」處理 — 行為等價）
//   - 區塊註解 `/* ... */` 目前 migrations 無使用，本 parser 不處理（fail
//     mode 是該 statement 包含註解字串送 prepare()，SQLite 會接受）
function splitStatements(sql: string): string[] {
    const src = sql.replace(/\r\n/g, "\n");
    const stmts: string[] = [];
    let cur = "";
    let inSingle = false;
    let inDouble = false;
    let inLineComment = false;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (inLineComment) {
            if (ch === "\n") inLineComment = false;
            // 不累加到 cur — 註解整段丟掉
            continue;
        }
        if (inSingle) {
            cur += ch;
            if (ch === "'") inSingle = false;
            continue;
        }
        if (inDouble) {
            cur += ch;
            if (ch === '"') inDouble = false;
            continue;
        }
        // 非 quote 非註解 — 開始判斷分隔符與註解起點
        if (ch === "-" && src[i + 1] === "-") {
            inLineComment = true;
            i++; // 跳過第二個 `-`
            continue;
        }
        if (ch === "'") { inSingle = true; cur += ch; continue; }
        if (ch === '"') { inDouble = true; cur += ch; continue; }
        if (ch === ";") {
            const trimmed = cur.trim();
            if (trimmed.length > 0) stmts.push(trimmed);
            cur = "";
            continue;
        }
        cur += ch;
    }
    const tail = cur.trim();
    if (tail.length > 0) stmts.push(tail);
    return stmts;
}

beforeAll(async () => {
    const ordered = Object.keys(sqlModules).sort();
    expect(ordered.length, "no migrations were bundled by import.meta.glob").toBeGreaterThan(0);
    for (const path of ordered) {
        const statements = splitStatements(sqlModules[path]);
        for (const stmt of statements) {
            try {
                await MM_DB_D1.prepare(stmt).run();
            } catch (err) {
                throw new Error(`migration failed at ${path}: ${(err as Error).message}\nstatement: ${stmt.slice(0, 200)}`);
            }
        }
    }
});

describe("splitStatements parser — 邊界場景防迴歸", () => {
    it("基本：依 ; 拆 statement、trim 空白、丟空 statement", () => {
        const r = splitStatements("SELECT 1; SELECT 2;\n  SELECT 3");
        expect(r).toEqual(["SELECT 1", "SELECT 2", "SELECT 3"]);
    });

    it("single-quote 字串內含 `;` 不會被誤切", () => {
        const r = splitStatements("INSERT INTO t VALUES ('foo;bar'); SELECT 1;");
        expect(r).toEqual(["INSERT INTO t VALUES ('foo;bar')", "SELECT 1"]);
    });

    it("double-quote 字串內含 `;` 不會被誤切", () => {
        const r = splitStatements('SELECT "a;b" FROM t; SELECT 2;');
        expect(r).toEqual(['SELECT "a;b" FROM t', "SELECT 2"]);
    });

    it("`--` 行註解到行尾為止，不影響後續 statement", () => {
        const r = splitStatements("SELECT 1; -- comment ; with semicolon\nSELECT 2;");
        expect(r).toEqual(["SELECT 1", "SELECT 2"]);
    });

    it("字串字面值內的 `--` 不視為註解（不會吃掉後續內容）", () => {
        const r = splitStatements("INSERT INTO t VALUES ('a -- b'); SELECT 1;");
        expect(r).toEqual(["INSERT INTO t VALUES ('a -- b')", "SELECT 1"]);
    });

    it("混合：字串內 `;`、`--` 行註解內 `;`、正常 statement 拆分", () => {
        const sql = `
            -- header comment with ; semicolon
            CREATE TABLE x (id TEXT DEFAULT 'a;b;c');
            INSERT INTO x VALUES ('-- not comment');
            -- trailing comment
            SELECT * FROM x;
        `;
        const r = splitStatements(sql);
        expect(r).toEqual([
            "CREATE TABLE x (id TEXT DEFAULT 'a;b;c')",
            "INSERT INTO x VALUES ('-- not comment')",
            "SELECT * FROM x",
        ]);
    });

    it("末尾無 `;` 也要保留最後一筆 statement", () => {
        const r = splitStatements("SELECT 1; SELECT 2");
        expect(r).toEqual(["SELECT 1", "SELECT 2"]);
    });
});

describe("migration smoke", () => {
    it("filenames follow NNNN_<slug>.sql with no number gaps", () => {
        const nums = Object.keys(sqlModules)
            .map(p => p.split("/").pop()!)
            .map(name => {
                const m = name.match(/^(\d{4})_[a-z0-9_]+\.sql$/);
                expect(m, `bad migration filename: ${name}`).not.toBeNull();
                return parseInt(m![1], 10);
            })
            .sort((a, b) => a - b);
        for (let i = 0; i < nums.length; i++) {
            expect(nums[i], `migration number gap at index ${i}`).toBe(i + 1);
        }
    });

    it("critical tables exist and dropped tables are gone", async () => {
        const names = await tableNames();
        expect(names.has("assessments")).toBe(true);
        expect(names.has("personality_profiles")).toBe(true);
        expect(names.has("question_matrix")).toBe(true);
        expect(names.has("system_config")).toBe(true);
        // 0013 加入：敏感操作 audit log
        expect(names.has("audit_log")).toBe(true);
        // 0006 把 SSO 化前自家會員系統殘骸 drop 掉，這些 table 不應再出現
        expect(names.has("users")).toBe(false);
        expect(names.has("security_logs")).toBe(false);
    });

    it("assessments has all columns the worker references", async () => {
        // src/index.ts SELECT 與 INSERT 用到的欄位全列；少一個都會讓 worker runtime 炸
        const cols = await columnNames("assessments");
        const required = [
            "id", "user_id", "guest_id", "assessment_version",
            "raw_scores", "z_scores", "result_distribution",
            "primary_type", "time_spent_ms",
            "questions_answered", "created_at",
        ];
        for (const c of required) {
            expect(cols.has(c), `assessments missing column: ${c}`).toBe(true);
        }
        // 0012 drop：psychic_energy_index 從未上 UI，2026-05-23 全砍
        expect(cols.has("psychic_energy_index")).toBe(false);
    });

    it("performance-critical indices exist; dead indices are dropped", async () => {
        const idx = await indexNames();
        // history query 走 composite，guest claim 走 guest_id，舊 user_id idx 暫保留（0010 註解說明）
        expect(idx.has("idx_assessments_user_created")).toBe(true);
        expect(idx.has("idx_assessments_guest_id")).toBe(true);
        expect(idx.has("idx_assessments_user_id")).toBe(true);
        // 0013 audit_log indices：forensic query (actor) + event 分佈
        expect(idx.has("idx_audit_log_actor_ts")).toBe(true);
        expect(idx.has("idx_audit_log_event_ts")).toBe(true);
        // 0011 drop：questions_answered 從未被 WHERE/ORDER BY 用到
        expect(idx.has("idx_assessments_questions_answered")).toBe(false);
    });

    it("audit_log has all columns the worker references", async () => {
        const cols = await columnNames("audit_log");
        const required = ["id", "ts", "event", "actor_sub", "trace_id", "metadata"];
        for (const c of required) {
            expect(cols.has(c), `audit_log missing column: ${c}`).toBe(true);
        }
    });

    it("worker's history SELECT runs against migrated schema", async () => {
        // 用 src/sql/queries.ts 共用常數；worker 與本 spec 都從同一處 import，
        // 任何 schema 改動（欄位增刪 / 別名 / LIMIT 變動）兩端必同步，無法 drift。
        const r = await MM_DB_D1.prepare(SELECT_HISTORY_BY_USER).bind("nobody").all();
        expect(r.success).toBe(true);
        expect(Array.isArray(r.results)).toBe(true);
    });

    it("worker's assessment INSERT runs against migrated schema", async () => {
        const id = `smoke-${crypto.randomUUID()}`;
        const r = await MM_DB_D1.prepare(INSERT_ASSESSMENT).bind(
            id,
            null,
            "smoke-guest",
            "B",
            JSON.stringify([0, 0, 0, 0, 0, 0, 0, 0]),
            JSON.stringify([0, 0, 0, 0, 0, 0, 0, 0]),
            JSON.stringify({}),
            "XXXX",
            1000,
            65,
        ).run();
        expect(r.success).toBe(true);
        expect(r.meta.changes).toBe(1);
    });

    it("worker's audit_log INSERT runs against migrated schema", async () => {
        const r = await MM_DB_D1.prepare(INSERT_AUDIT_LOG).bind(
            Date.now(),
            "delete_account",
            "smoke-sub",
            "smoke-trace",
            JSON.stringify({ deletedCount: 0 }),
        ).run();
        expect(r.success).toBe(true);
        expect(r.meta.changes).toBe(1);
    });
});
