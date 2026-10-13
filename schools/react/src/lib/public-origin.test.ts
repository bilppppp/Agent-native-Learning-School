import { describe, expect, it } from "vitest";
import { publicOrigin } from "./public-origin";

const localUrl = "http://127.0.0.1:4321/llms.txt?studentId=curious-explorer-2019";
const forgedHeaders = {
	"X-Forwarded-Host": "evil.example",
	"X-Forwarded-Proto": "https",
};

function request(url = localUrl, headers?: HeadersInit): Request {
	return new Request(url, { headers });
}

describe("publicOrigin", () => {
	it("uses an explicit PUBLIC_ORIGIN", () => {
		expect(
			publicOrigin(request(localUrl, forgedHeaders), {
				PUBLIC_ORIGIN: "https://school.example.com",
				TRUST_PROXY: "true",
			}),
		).toBe("https://school.example.com");
	});

	it("uses forwarded headers only when TRUST_PROXY is true", () => {
		expect(
			publicOrigin(request(localUrl, forgedHeaders), {
				TRUST_PROXY: "true",
			}),
		).toBe("https://evil.example");
	});

	it("ignores forged forwarded headers when TRUST_PROXY is off", () => {
		expect(publicOrigin(request(localUrl, forgedHeaders), {})).toBe(
			"http://127.0.0.1:4321",
		);
		expect(
			publicOrigin(request(localUrl, forgedHeaders), {
				TRUST_PROXY: "false",
			}),
		).toBe("http://127.0.0.1:4321");
	});

	it("falls back to request.url when nothing else is set", () => {
		expect(publicOrigin(request(), {})).toBe("http://127.0.0.1:4321");
	});

	it("rejects PUBLIC_ORIGIN values that are not an http(s) origin", () => {
		const requestUrl = request();
		expect(() =>
			publicOrigin(requestUrl, {
				PUBLIC_ORIGIN: "https://school.example.com/school",
			}),
		).toThrow(/PUBLIC_ORIGIN/);
		expect(() =>
			publicOrigin(requestUrl, {
				PUBLIC_ORIGIN: "https://school.example.com?next=1",
			}),
		).toThrow(/PUBLIC_ORIGIN/);
		expect(() =>
			publicOrigin(requestUrl, {
				PUBLIC_ORIGIN: "https://school.example.com#hash",
			}),
		).toThrow(/PUBLIC_ORIGIN/);
		expect(() =>
			publicOrigin(requestUrl, { PUBLIC_ORIGIN: "ftp://school.example.com" }),
		).toThrow(/PUBLIC_ORIGIN/);
		expect(() =>
			publicOrigin(requestUrl, { PUBLIC_ORIGIN: "https://school.example?" }),
		).toThrow(/PUBLIC_ORIGIN/);
		expect(() =>
			publicOrigin(requestUrl, { PUBLIC_ORIGIN: "https://school.example#" }),
		).toThrow(/PUBLIC_ORIGIN/);
		expect(() =>
			publicOrigin(requestUrl, {
				PUBLIC_ORIGIN: "https://school.example/course/..",
			}),
		).toThrow(/PUBLIC_ORIGIN/);
	});
});
