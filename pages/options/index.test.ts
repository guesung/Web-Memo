import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * 브라우저 번역 기능이 옵션 페이지 DOM을 React 모르게 바꾸면 commit 단계의
 * removeChild가 실제 노드를 찾지 못해 NotFoundError가 난다. `translate="no"`가
 * 지워지면 같은 오류가 재발하므로 속성 존재를 테스트로 고정한다.
 */
describe("options index.html", () => {
	it("문서 번역을 막아 removeChild NotFoundError 재발을 막는다", () => {
		const htmlPath = fileURLToPath(new URL("./index.html", import.meta.url));
		const html = readFileSync(htmlPath, "utf-8");

		expect(html).toMatch(/<html[^>]*\btranslate="no"/);
		expect(html).toMatch(/<html[^>]*\bclass="notranslate"/);
	});
});
