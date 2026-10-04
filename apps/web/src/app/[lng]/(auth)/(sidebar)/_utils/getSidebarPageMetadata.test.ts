import { describe, expect, it, vi } from "vitest";
import {
	createSidebarPageMetadata,
	getSidebarPageMetadata,
} from "./getSidebarPageMetadata";

vi.mock("@web-memo/env", () => ({
	CONFIG: { webDisplayHost: "webmemo.xyz" },
}));

describe("sidebar page metadata", () => {
	it("브랜드와 라벨을 결합하는 순수 함수를 사용한다", () => {
		expect(
			createSidebarPageMetadata({ brand: "웹 메모", label: "내 메모" }),
		).toEqual({
			title: "웹 메모 | 내 메모",
		});
	});

	it.each([
		["sideBar.memo", "웹 메모 | 내 메모", "Web Memo | My memos"],
		["sideBar.wishList", "웹 메모 | 위시리스트", "Web Memo | Wishlist"],
		["sideBar.importantMemo", "웹 메모 | 중요 메모", "Web Memo | Important"],
		["sideBar.readingMemo", "웹 메모 | 읽는 중", "Web Memo | Reading"],
		["sideBar.highlight", "웹 메모 | 하이라이트", "Web Memo | Highlights"],
	] as const)(
		"%s 번역 제목을 만든다",
		async (labelKey, koreanTitle, englishTitle) => {
			expect(
				await getSidebarPageMetadata({
					params: Promise.resolve({ lng: "ko" }),
					labelKey,
				}),
			).toEqual({ title: koreanTitle });
			expect(
				await getSidebarPageMetadata({
					params: Promise.resolve({ lng: "en" }),
					labelKey,
				}),
			).toEqual({ title: englishTitle });
		},
	);
});
