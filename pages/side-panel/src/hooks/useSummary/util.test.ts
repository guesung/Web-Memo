import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROMPTS } from "./prompt";
import { formatSummaryText, getSummaryPrompt } from "./util";

const { getStoredLanguage } = vi.hoisted(() => ({
	getStoredLanguage: vi.fn(),
}));

vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: { get: getStoredLanguage },
	STORAGE_KEYS: { language: "language" },
}));

describe("getSummaryPrompt", () => {
	beforeEach(() => {
		getStoredLanguage.mockReset();
	});

	it.each(["ko", "en"] as const)(
		"%s 언어의 유튜브 프롬프트를 사용하고 원문을 별도 메시지로 전달한다",
		async (language) => {
			getStoredLanguage.mockResolvedValue(language);

			const messages = await getSummaryPrompt("원문 그대로", "youtube");

			expect(messages[0].content).toContain(DEFAULT_PROMPTS.youtube[language]);
			expect(messages[0].content).toContain("Do not use Markdown");
			expect(messages[0].content).toContain("•");
			expect(messages[0].content).not.toMatch(/^#{1,6} /m);
			expect(
				messages[0].content.match(/Language: Respond entirely in/g),
			).toHaveLength(1);
			expect(messages[1]).toEqual({ role: "user", content: "원문 그대로" });
		},
	);

	it.each(["ko", "en"] as const)(
		"%s 언어의 웹 프롬프트를 선택한다",
		async (language) => {
			getStoredLanguage.mockResolvedValue(language);

			const messages = await getSummaryPrompt("본문", "others");

			expect(messages[0].content).toContain(DEFAULT_PROMPTS.web[language]);
			expect(messages[0].content).toContain("Do not use Markdown");
			expect(messages[0].content).toContain("•");
			expect(messages[0].content).not.toMatch(/^#{1,6} /m);
		},
	);

	it("지원하지 않는 저장 언어는 기본 언어로 대체한다", async () => {
		getStoredLanguage.mockResolvedValue("fr");

		const messages = await getSummaryPrompt("본문", "others");

		expect(messages[0].content).toContain(DEFAULT_PROMPTS.web.ko);
	});
});

describe("formatSummaryText", () => {
	it.each([
		["", ""],
		[
			"## 제목\n\n- **중요**\n1. _설명_\n> 인용\n---",
			"제목\n\n• 중요\n• 설명\n인용",
		],
		["제목\n===\n\n- [x] 완료\n- [ ] 대기", "제목\n\n• 완료\n• 대기"],
		[
			"| 이름 | 값 |\n| :--- | ---: |\n| 항목 | **10** |",
			"이름 · 값\n\n항목 · 10",
		],
		["**굵게** *기울임* __강조__ ~~취소~~", "굵게 기울임 강조 취소"],
		[
			"[문서](https://example.com/a_(b)) 및 [다음](https://example.com?q=a_b)",
			"문서 (https://example.com/a_(b)) 및 다음 (https://example.com?q=a_b)",
		],
		[
			"![설명](https://example.com/image.png) <https://example.com>",
			"설명 (https://example.com/image.png) https://example.com",
		],
		[
			"`a_b * 2`\n```ts\nconst a_b = 2 * 3;\n```",
			"a_b * 2\n\nconst a_b = 2 * 3;",
		],
		[
			"C# a_b snake_case_name https://example.com/a_b#part 2 * 3",
			"C# a_b snake_case_name https://example.com/a_b#part 2 * 3",
		],
		[
			"일반 제목\n\n• 첫 항목\n• 둘째 항목",
			"일반 제목\n\n• 첫 항목\n• 둘째 항목",
		],
		["이름 | 값\n--- | ---\n항목 | 10", "이름 · 값\n\n항목 · 10"],
		["본문 #", "본문 #"],
		["__첫째\n둘째__ 입니다", "첫째\n둘째 입니다"],
		["**앞\n뒤** 내용", "앞\n뒤 내용"],
		[
			"__첫째\n둘째__ 입니다\n\n**앞\n뒤** 내용",
			"첫째\n둘째 입니다\n\n앞\n뒤 내용",
		],
		[
			"```txt\n**코드\n코드**\n```\n**앞\n뒤** 내용",
			"**코드\n코드**\n\n앞\n뒤 내용",
		],
		[
			"**참고 *세부* https://example.com/a_b**\n*참고 https://example.com/a_b*\n__참고 https://example.com/a_b__\n~~참고 https://example.com/a_b~~",
			"참고 세부 https://example.com/a_b\n참고 https://example.com/a_b\n참고 https://example.com/a_b\n참고 https://example.com/a_b",
		],
		["**참고\nhttps://example.com/a_b**", "참고\nhttps://example.com/a_b"],
		["**완료**\nhttps://example.com/a_b**", "완료\nhttps://example.com/a_b**"],
		["a_b https://example.com/a_", "a_b https://example.com/a_"],
		["**https://example.com/a_b**", "https://example.com/a_b"],
		["**중요 *세부* 내용**", "중요 세부 내용"],
		["**참고 https://example.com/a_b**", "참고 https://example.com/a_b"],
		["*참고 https://example.com/a_b*", "참고 https://example.com/a_b"],
		["__참고 https://example.com/a_b__", "참고 https://example.com/a_b"],
		["~~참고 https://example.com/a_b~~", "참고 https://example.com/a_b"],
		[
			"**참고 *세부* https://example.com/a_b**",
			"참고 세부 https://example.com/a_b",
		],
		["**첫째** https://example.com/a_b**", "첫째 https://example.com/a_b**"],
		["[문서](https://example.com/a_(b", "문서 (https://example.com/a_(b)"],
		["| 코드 | 값 |\n| --- | --- |\n| a\\|b | 10 |", "코드 · 값\n\na|b · 10"],
		["**중요", "중요"],
		["[문구](https://exa", "문구 (https://exa)"],
		["[문구]", "문구"],
		["`코드", "코드"],
		["```const a_b = 1```", "const a_b = 1"],
		["```ts\nconst a_b = 1", "const a_b = 1"],
		["#", ""],
		["**", ""],
	])("%j를 일반 텍스트로 표시한다", (summary, expected) => {
		expect(formatSummaryText(summary)).toBe(expected);
	});

	it("누적 스트림마다 다시 변환하여 조각 사이에서 나뉜 표식을 처리한다", () => {
		let summary = "";
		const chunks = ["**중", "요**\n[문", "구](https://exa", "mple.com)"];
		const expected = [
			"중",
			"중요\n문",
			"중요\n문구 (https://exa)",
			"중요\n문구 (https://example.com)",
		];

		chunks.forEach((chunk, index) => {
			summary += chunk;
			expect(formatSummaryText(summary)).toBe(expected[index]);
		});
	});
});
