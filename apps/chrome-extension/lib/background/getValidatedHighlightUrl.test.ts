import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getValidatedHighlightUrl } from "./getValidatedHighlightUrl";

vi.mock("@web-memo/shared/utils", async () => {
	const { getPageKey, normalizeUrl } = await import(
		"../../../../packages/shared/src/utils/Url"
	);

	return { getPageKey, normalizeUrl };
});

const PAGE_URL = "https://example.com/article";
const SENDER: chrome.runtime.MessageSender = {
	id: "extension-id",
	frameId: 0,
	url: PAGE_URL,
	tab: { id: 1, url: PAGE_URL } as chrome.tabs.Tab,
};

beforeEach(() => {
	vi.stubGlobal("chrome", { runtime: { id: "extension-id" } });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("하이라이트 발신자와 URL 검증", () => {
	it("현재 탭 URL을 정규화해서 반환한다", () => {
		expect(getValidatedHighlightUrl(SENDER, `${PAGE_URL}#selection`)).toBe(
			PAGE_URL,
		);
	});

	it("pushState 이후 최초 문서와 같은 출처의 현재 탭 URL을 허용한다", () => {
		const sender = { ...SENDER, url: "https://example.com/previous" };

		expect(getValidatedHighlightUrl(sender, PAGE_URL)).toBe(PAGE_URL);
	});

	it("추적 파라미터만 다른 요청 URL을 같은 페이지로 검증한다", () => {
		const sender = {
			...SENDER,
			tab: {
				...SENDER.tab,
				url: `${PAGE_URL}?utm_source=newsletter`,
			},
		} as chrome.runtime.MessageSender;

		expect(getValidatedHighlightUrl(sender, PAGE_URL)).toBe(
			`${PAGE_URL}?utm_source=newsletter`,
		);
	});

	it.each([
		{ ...SENDER, id: "other-extension" },
		{ ...SENDER, frameId: 1 },
		{ ...SENDER, frameId: undefined },
		{ ...SENDER, tab: undefined },
		{ ...SENDER, tab: { ...SENDER.tab, id: undefined } },
		{ ...SENDER, tab: { ...SENDER.tab, url: undefined } },
		{ ...SENDER, url: undefined },
		{ ...SENDER, url: "https://other.example/article" },
		{ ...SENDER, url: "invalid-url" },
		{ ...SENDER, tab: { ...SENDER.tab, url: "invalid-url" } },
		{
			...SENDER,
			url: "file:///article",
			tab: { ...SENDER.tab, url: "file:///article" },
		},
	])("신뢰할 수 없는 발신 문서는 거부한다: %j", (sender) => {
		expect(
			getValidatedHighlightUrl(
				sender as chrome.runtime.MessageSender,
				PAGE_URL,
			),
		).toBeNull();
	});

	it.each([
		"invalid-url",
		"https://example.com/other",
		"https://other.example/article",
	])("현재 페이지와 다른 요청 URL을 거부한다: %s", (payloadUrl) => {
		expect(getValidatedHighlightUrl(SENDER, payloadUrl)).toBeNull();
	});
});
