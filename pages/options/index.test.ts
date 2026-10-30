import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const html = readFileSync(
	fileURLToPath(new URL("./index.html", import.meta.url)),
	"utf-8",
);

describe("options/index.html", () => {
	it("브라우저 자동 번역이 React가 관리하는 DOM을 건드리지 못하게 막는다", () => {
		expect(html).toMatch(/<html[^>]*\btranslate="no"/);
		expect(html).toMatch(
			/<meta\s+name="google"\s+content="notranslate"\s*\/?>/,
		);
	});
});
