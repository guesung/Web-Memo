import { describe, expect, it, vi } from "vitest";
import { addDismissedUrl, hasSavedPageMemo } from "./usePastMemoMatch";

vi.mock("@web-memo/env", () => ({ CONFIG: {} }));
vi.mock("@web-memo/shared/hooks", () => ({}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({ bridge: {} }));

describe("addDismissedUrl", () => {
	it("새 URL을 맨 앞에 넣는다", () => {
		expect(addDismissedUrl(["https://a.com/"], "https://b.com/")).toEqual([
			"https://b.com/",
			"https://a.com/",
		]);
	});

	it("이미 있던 URL은 중복 없이 맨 앞으로 옮긴다", () => {
		expect(
			addDismissedUrl(
				["https://a.com/", "https://b.com/", "https://c.com/"],
				"https://b.com/",
			),
		).toEqual(["https://b.com/", "https://a.com/", "https://c.com/"]);
	});

	it("최근 500개만 남기고 가장 오래된 URL부터 버린다", () => {
		const dismissedUrls = Array.from(
			{ length: 500 },
			(_, index) => `https://example.com/${index}`,
		);

		const nextUrls = addDismissedUrl(dismissedUrls, "https://new.com/");

		expect(nextUrls).toHaveLength(500);
		expect(nextUrls[0]).toBe("https://new.com/");
		expect(nextUrls).not.toContain("https://example.com/499");
	});

	it("원본 배열을 바꾸지 않는다", () => {
		const dismissedUrls = ["https://a.com/"];

		addDismissedUrl(dismissedUrls, "https://b.com/");

		expect(dismissedUrls).toEqual(["https://a.com/"]);
	});
});

describe("hasSavedPageMemo", () => {
	it("편집 메모도 페이지 메모도 없으면 false", () => {
		expect(hasSavedPageMemo({ hasMemoData: false, pageMemoCount: 0 })).toBe(
			false,
		);
	});

	it("편집 중인 메모가 저장돼 있으면 true", () => {
		expect(hasSavedPageMemo({ hasMemoData: true, pageMemoCount: 0 })).toBe(
			true,
		);
	});

	it("새 메모를 쓰는 중이어도 페이지 메모가 1개 이상이면 true", () => {
		expect(hasSavedPageMemo({ hasMemoData: false, pageMemoCount: 1 })).toBe(
			true,
		);
	});
});
