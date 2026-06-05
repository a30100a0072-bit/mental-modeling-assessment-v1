import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { buildClaimGuestResultsSql } from "../src/sql/queries";

// Guest-claim 隔離不變量 negative test。
// CLAUDE.md 測試策略：「每個 security/isolation 邊界 ≥1 negative test」。
// 守的是 handleClaimGuestResults 的 `WHERE user_id IS NULL AND guest_id IN (...)` 守衛——
// 未來若 refactor 拿掉 user_id IS NULL 守衛、或改 bind 順序，會讓某 user 認領他人已歸屬的 row
// （horizontal privilege escalation）。用與 worker 同源的 buildClaimGuestResultsSql，確保測的是
// production 真實 SQL，而非測試自己 copy 一份（copy 會跟著漂移，失去防護意義）。
const MM_DB_D1 = env.MM_DB_D1 as D1Database;

beforeAll(async () => {
  // 最小 schema：只建 claim 觸及的欄位（完整 assessments schema drift 由 migrations.spec.ts 守）。
  // vitest-pool-workers 預設 isolatedStorage，本檔 D1 與其他 spec 互不干擾、起始為空。
  await MM_DB_D1
    .prepare("CREATE TABLE IF NOT EXISTS assessments (id TEXT PRIMARY KEY, user_id TEXT, guest_id TEXT)")
    .run();
});

describe("guest-claim isolation invariant", () => {
  it("只認領 user_id IS NULL 的 orphan，且只動自己傳入的 guest_id，不碰他人已歸屬 row", async () => {
    const USER_X = "user-x-sub";
    const USER_Y = "user-y-sub";
    const G1 = "guest-orphan-1"; // orphan → Y 應能認領
    const G2 = "guest-orphan-2"; // orphan，但 Y 沒傳入 → 不應被動
    const GX = "guest-belongs-to-x"; // 已屬 X → Y 即使傳入也不得搶走

    await MM_DB_D1.batch([
      MM_DB_D1.prepare("INSERT INTO assessments (id, user_id, guest_id) VALUES (?, NULL, ?)").bind("row-g1", G1),
      MM_DB_D1.prepare("INSERT INTO assessments (id, user_id, guest_id) VALUES (?, NULL, ?)").bind("row-g2", G2),
      MM_DB_D1.prepare("INSERT INTO assessments (id, user_id, guest_id) VALUES (?, ?, ?)").bind("row-gx", USER_X, GX),
    ]);

    // Y 嘗試認領 G1（合法 orphan）+ GX（X 已擁有，攻擊向量）
    const guestIds = [G1, GX];
    const res = await MM_DB_D1
      .prepare(buildClaimGuestResultsSql(guestIds.length))
      .bind(USER_Y, ...guestIds)
      .run();

    // 只有 G1 翻給 Y，GX 被 `user_id IS NULL` 守衛擋下
    expect(res.meta.changes).toBe(1);

    const g1Row = await MM_DB_D1
      .prepare("SELECT user_id, guest_id FROM assessments WHERE id = 'row-g1'")
      .first<{ user_id: string | null; guest_id: string | null }>();
    expect(g1Row?.user_id).toBe(USER_Y);
    expect(g1Row?.guest_id).toBeNull(); // claim 後清空，避免重複認領

    const gxRow = await MM_DB_D1
      .prepare("SELECT user_id, guest_id FROM assessments WHERE id = 'row-gx'")
      .first<{ user_id: string | null; guest_id: string | null }>();
    expect(gxRow?.user_id).toBe(USER_X); // X 的 row 完全不被動
    expect(gxRow?.guest_id).toBe(GX);

    const g2Row = await MM_DB_D1
      .prepare("SELECT user_id FROM assessments WHERE id = 'row-g2'")
      .first<{ user_id: string | null }>();
    expect(g2Row?.user_id).toBeNull(); // Y 沒傳 G2 → 不動
  });
});
