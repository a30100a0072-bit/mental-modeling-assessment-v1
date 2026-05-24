import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("worker smoke", () => {
	it("OPTIONS preflight returns CORS headers", async () => {
		const res = await SELF.fetch("https://mbti.chiyigo.com/api/anything", {
			method: "OPTIONS",
			headers: { Origin: "https://mbti.chiyigo.com" },
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://mbti.chiyigo.com");
		expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
	});

	it("unknown route returns 404 JSON with full error envelope", async () => {
		// 2026-05-24 envelope 升級：{error:{code,message,traceId}}
		// traceId 必須與 X-Trace-Id header 一致（同 request lifecycle 同源）
		const res = await SELF.fetch("https://mbti.chiyigo.com/api/does-not-exist");
		expect(res.status).toBe(404);
		const traceHeader = res.headers.get("X-Trace-Id");
		expect(traceHeader, "X-Trace-Id header missing").toBeTruthy();
		const body = await res.json() as { error: { code: string; message: string; traceId: string } };
		expect(body.error).toBeTypeOf("object");
		expect(body.error.code).toBe("ERR_NOT_FOUND");
		expect(body.error.message).toBe("Not Found");
		expect(body.error.traceId).toBe(traceHeader);
	});

	it("missing Authorization returns 401 envelope with ERR_UNAUTHORIZED", async () => {
		// /user/history 必驗 Bearer token，缺則 401。驗 envelope code + traceId 一致。
		const res = await SELF.fetch("https://mbti.chiyigo.com/api/v1/user/history");
		expect(res.status).toBe(401);
		const body = await res.json() as { error: { code: string; message: string; traceId: string } };
		expect(body.error.code).toBe("ERR_UNAUTHORIZED");
		expect(body.error.traceId).toBe(res.headers.get("X-Trace-Id"));
	});

	it("GET /auth/allowed-redirects returns origins from env", async () => {
		const res = await SELF.fetch("https://mbti.chiyigo.com/api/auth/allowed-redirects");
		expect(res.status).toBe(200);
		const body = await res.json() as { origins: string[] };
		expect(Array.isArray(body.origins)).toBe(true);
		expect(body.origins).toContain("https://talo.chiyigo.com");
	});

	it("CORS rejects unknown origin by falling back to canonical", async () => {
		const res = await SELF.fetch("https://mbti.chiyigo.com/api/anything", {
			method: "OPTIONS",
			headers: { Origin: "https://evil.example.com" },
		});
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://mbti.chiyigo.com");
	});
});
