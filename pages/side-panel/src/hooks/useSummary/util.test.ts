import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROMPTS } from "./prompt";
import { getSummaryPrompt } from "./util";

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
		},
	);

	it("지원하지 않는 저장 언어는 기본 언어로 대체한다", async () => {
		getStoredLanguage.mockResolvedValue("fr");

		const messages = await getSummaryPrompt("본문", "others");

		expect(messages[0].content).toContain(DEFAULT_PROMPTS.web.ko);
	});
});
