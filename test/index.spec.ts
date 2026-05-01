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

	it("unknown route returns 404 JSON", async () => {
		const res = await SELF.fetch("https://mbti.chiyigo.com/api/does-not-exist");
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error");
	});

	it("GET /auth/allowed-redirects returns origins from env", async () => {
		const res = await SELF.fetch("https://mbti.chiyigo.com/api/auth/allowed-redirects");
		expect(res.status).toBe(200);
		const body = await res.json() as { origins: string[] };
		expect(Array.isArray(body.origins)).toBe(true);
		expect(body.origins).toContain("https://talo-web.pages.dev");
	});

	it("CORS rejects unknown origin by falling back to canonical", async () => {
		const res = await SELF.fetch("https://mbti.chiyigo.com/api/anything", {
			method: "OPTIONS",
			headers: { Origin: "https://evil.example.com" },
		});
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://mbti.chiyigo.com");
	});
});
